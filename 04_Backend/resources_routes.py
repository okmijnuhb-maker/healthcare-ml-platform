# resources_routes.py - Hospital Resource Optimization Routes
import time
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Blueprint, request, jsonify
from model_loader import get_model
from utils import (
    success_response, error_response,
    validate_resource_input, calculate_staffing,
    get_occupancy_alert_level, compare_dept_to_average
)
from config import *

resources_bp = Blueprint('resources', __name__)

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def _prepare_features(department, date_str, occupancy_rate):
    feature_cols = get_model('resource_features')
    dt = datetime.strptime(date_str, '%Y-%m-%d')

    dept_map = {'ER': 0, 'ICU': 1, 'General Ward': 2}
    row = {col: 0.0 for col in feature_cols}

    # Date features
    if 'day_of_week'   in row: row['day_of_week']   = dt.weekday()
    if 'month'         in row: row['month']          = dt.month
    if 'day_of_month'  in row: row['day_of_month']   = dt.day
    if 'is_weekend'    in row: row['is_weekend']      = 1 if dt.weekday() >= 5 else 0
    if 'quarter'       in row: row['quarter']         = (dt.month - 1) // 3 + 1
    if 'week_of_year'  in row: row['week_of_year']    = dt.isocalendar()[1]

    # Department features
    if 'department_encoded' in row:
        row['department_encoded'] = dept_map.get(department, 0)

    dept_key = department.lower().replace(' ', '_')
    for col in feature_cols:
        if dept_key in col.lower():
            row[col] = 1.0

    # Occupancy and stats
    avg = DEPT_AVG_STATS.get(department, {})
    if 'occupancy_rate'    in row: row['occupancy_rate']    = occupancy_rate
    if 'avg_los'           in row: row['avg_los']           = avg.get('avg_los', 3.5)
    if 'daily_admissions'  in row: row['daily_admissions']  = avg.get('avg_admissions', 10)

    return pd.DataFrame([row])[feature_cols]

def _predict_occupancy(department, date_str, occupancy_rate=None):
    model_map = {
        'ER':           get_model('resource_er_model'),
        'ICU':          get_model('resource_icu_model'),
        'General Ward': get_model('resource_gw_model')
    }
    model    = model_map.get(department, get_model('resource_model'))
    scaler   = get_model('resource_scaler')

    avg_occ  = DEPT_AVG_STATS[department]['avg_occupancy']
    occ      = occupancy_rate if occupancy_rate is not None else avg_occ

    features = _prepare_features(department, date_str, occ)
    scaled   = scaler.transform(features)
    pred     = float(model.predict(scaled)[0])
    pred     = max(0.0, min(100.0, pred))
    return round(pred, 2)

def _get_cost_saving_recommendation(department, occupancy_rate):
    optimal  = COST_BENCHMARKS[department]['optimal_occupancy']
    diff     = occupancy_rate - optimal
    if diff > 15:
        return f"Occupancy is {round(diff,1)}% above optimal. Consider redirecting non-critical patients to reduce costs."
    elif diff > 0:
        return f"Occupancy is slightly above optimal. Monitor closely."
    elif diff < -15:
        return f"Occupancy is {round(abs(diff),1)}% below optimal. Consider consolidating resources."
    return "Occupancy is near optimal level."

# ─────────────────────────────────────────
# POST /api/resources/forecast-beds
# ─────────────────────────────────────────

@resources_bp.route('/forecast-beds', methods=['POST'])
def forecast_beds():
    start = time.time()
    data  = request.get_json()

    if not data:
        return jsonify(error_response('No input data provided')), 400

    errors = validate_resource_input(data)
    if errors:
        return jsonify(error_response('Validation failed', errors=errors)), 400

    try:
        department    = data['department']
        date_str      = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        occupancy_in  = data.get('occupancy_rate', None)

        predicted_occ = _predict_occupancy(department, date_str, occupancy_in)
        total_beds    = DEPT_BEDS[department]
        occupied_beds = int(total_beds * predicted_occ / 100)
        available     = total_beds - occupied_beds
        alert_level   = get_occupancy_alert_level(predicted_occ)
        staffing      = calculate_staffing(department, predicted_occ)
        comparison    = compare_dept_to_average(department, predicted_occ)
        cost_rec      = _get_cost_saving_recommendation(department, predicted_occ)
        benchmark     = COST_BENCHMARKS[department]

        result = {
            'department':       department,
            'forecast_date':    date_str,
            'occupancy': {
                'predicted_rate':  predicted_occ,
                'total_beds':      total_beds,
                'occupied_beds':   occupied_beds,
                'available_beds':  available,
                'alert_level':     alert_level
            },
            'staffing':          staffing['staffing'],
            'shifts':            staffing['shifts'],
            'costs': {
                'daily_cost':         staffing['costs']['daily_cost'],
                'monthly_cost':       staffing['costs']['monthly_cost'],
                'cost_per_bed':       staffing['costs']['cost_per_bed'],
                'cost_saving_vs_max': staffing['costs']['cost_saving_vs_max'],
                'benchmark_daily':    benchmark['avg_daily_cost'],
                'vs_benchmark':       staffing['costs']['daily_cost'] - benchmark['avg_daily_cost']
            },
            'comparison':        comparison,
            'cost_recommendation': cost_rec,
            'model_info': {
                'model':   MODEL_VERSIONS['resources']['model'],
                'version': MODEL_VERSIONS['resources']['version'],
                'r2':      MODEL_VERSIONS['resources']['r2'],
                'mae':     MODEL_VERSIONS['resources']['mae']
            }
        }

        return jsonify(success_response(result,
            message=f"Bed forecast for {department} on {date_str}",
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'Forecast failed: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# GET /api/resources/overview
# ─────────────────────────────────────────

@resources_bp.route('/overview', methods=['GET'])
def overview():
    start    = time.time()
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))

    try:
        departments  = {}
        total_beds   = 0
        total_occ    = 0
        total_cost   = 0
        critical_depts = []

        for dept in DEPT_BEDS.keys():
            predicted_occ = _predict_occupancy(dept, date_str)
            beds          = DEPT_BEDS[dept]
            occupied      = int(beds * predicted_occ / 100)
            available     = beds - occupied
            alert         = get_occupancy_alert_level(predicted_occ)
            staffing      = calculate_staffing(dept, predicted_occ)
            comparison    = compare_dept_to_average(dept, predicted_occ)

            total_beds += beds
            total_occ  += occupied
            total_cost += staffing['costs']['daily_cost']

            if alert in ['CRITICAL', 'HIGH']:
                critical_depts.append(dept)

            departments[dept] = {
                'occupancy_rate':  predicted_occ,
                'total_beds':      beds,
                'occupied_beds':   occupied,
                'available_beds':  available,
                'alert_level':     alert,
                'staffing':        staffing['staffing'],
                'daily_cost':      staffing['costs']['daily_cost'],
                'comparison':      comparison
            }

        total_available  = total_beds - total_occ
        overall_occ_rate = round(total_occ / total_beds * 100, 2)
        overall_alert    = get_occupancy_alert_level(overall_occ_rate)

        result = {
            'date':        date_str,
            'departments': departments,
            'hospital_summary': {
                'total_beds':          total_beds,
                'total_occupied':      total_occ,
                'total_available':     total_available,
                'overall_occupancy':   overall_occ_rate,
                'overall_alert':       overall_alert,
                'total_daily_cost':    total_cost,
                'total_monthly_cost':  total_cost * 30,
                'critical_departments':critical_depts,
                'hospital_status':     'CRITICAL' if critical_depts else 'NORMAL'
            }
        }

        return jsonify(success_response(result,
            message='Hospital resource overview',
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'Overview failed: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# GET /api/resources/staffing
# ─────────────────────────────────────────

@resources_bp.route('/staffing', methods=['GET'])
def staffing():
    start      = time.time()
    department = request.args.get('department', None)
    date_str   = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))

    try:
        depts_to_process = [department] if department else list(DEPT_BEDS.keys())

        if department and department not in DEPT_BEDS:
            return jsonify(error_response(
                f"department must be one of: {', '.join(DEPT_BEDS.keys())}")), 400

        all_staffing     = {}
        total_nurses     = 0
        total_doctors    = 0
        total_support    = 0
        total_cost       = 0

        for dept in depts_to_process:
            predicted_occ = _predict_occupancy(dept, date_str)
            staffing_data = calculate_staffing(dept, predicted_occ)
            cost_rec      = _get_cost_saving_recommendation(dept, predicted_occ)

            total_nurses  += staffing_data['staffing']['nurses']
            total_doctors += staffing_data['staffing']['doctors']
            total_support += staffing_data['staffing']['support_staff']
            total_cost    += staffing_data['costs']['daily_cost']

            all_staffing[dept] = {
                'occupancy_rate':        predicted_occ,
                'alert_level':           get_occupancy_alert_level(predicted_occ),
                'staffing':              staffing_data['staffing'],
                'shifts':                staffing_data['shifts'],
                'costs':                 staffing_data['costs'],
                'cost_recommendation':   cost_rec,
                'optimal_occupancy':     COST_BENCHMARKS[dept]['optimal_occupancy']
            }

        result = {
            'date':        date_str,
            'departments': all_staffing,
            'hospital_totals': {
                'total_nurses':       total_nurses,
                'total_doctors':      total_doctors,
                'total_support':      total_support,
                'total_staff':        total_nurses + total_doctors + total_support,
                'total_daily_cost':   total_cost,
                'total_monthly_cost': total_cost * 30
            }
        }

        return jsonify(success_response(result,
            message='Staffing plan generated',
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'Staffing failed: {str(e)}', code=500)), 500