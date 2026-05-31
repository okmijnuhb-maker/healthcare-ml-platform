# outbreak_routes.py - Disease Outbreak Detection Routes
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from model_loader import get_model
from utils import (
    success_response, error_response,
    validate_outbreak_input, get_outbreak_alert_level
)
from config import *

outbreak_bp = Blueprint('outbreak', __name__)

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def _get_recommended_actions(alert_level):
    actions = {
        'Outbreak': [
            'Activate emergency response protocol immediately',
            'Alert public health authorities within 24 hours',
            'Implement isolation and containment measures',
            'Increase diagnostic testing capacity',
            'Deploy additional medical personnel',
            'Issue public health advisory',
            'Begin contact tracing immediately'
        ],
        'Watch': [
            'Increase disease surveillance frequency',
            'Alert hospital administrators and staff',
            'Prepare emergency response resources',
            'Monitor high risk areas closely',
            'Review and update containment plans',
            'Notify regional health department'
        ],
        'Normal': [
            'Continue routine surveillance',
            'Maintain standard monitoring protocols',
            'No immediate action required'
        ]
    }
    return actions.get(alert_level, actions['Normal'])

def _get_trend_direction(recent_cases):
    if len(recent_cases) < 3:
        return 'insufficient data'
    avg_first  = np.mean(recent_cases[:3])
    avg_last   = np.mean(recent_cases[-3:])
    pct_change = round((avg_last - avg_first) / (avg_first + 0.001) * 100, 2)
    if pct_change > 10:
        return 'increasing'
    elif pct_change < -10:
        return 'decreasing'
    return 'stable'

def _days_since_last_outbreak(df, disease):
    try:
        df['report_date'] = pd.to_datetime(df['report_date'])
        disease_df  = df[df['disease'] == disease].copy()
        outbreaks   = disease_df[disease_df['is_outbreak'] == 1]
        if outbreaks.empty:
            return None
        last_date   = outbreaks['report_date'].max()
        days        = (pd.Timestamp.now() - last_date).days
        return int(days)
    except Exception:
        return None

def _get_growth_rate(df, disease, current_cases):
    try:
        df['report_date'] = pd.to_datetime(df['report_date'])
        disease_df  = df[df['disease'] == disease].sort_values('report_date')
        last_7_days = disease_df.tail(7)['cases'].values
        if len(last_7_days) == 0:
            return 0.0
        avg_7d      = float(np.mean(last_7_days))
        growth      = round((current_cases - avg_7d) / (avg_7d + 0.001) * 100, 2)
        return growth
    except Exception:
        return 0.0

def _get_spike_ratio(df, disease, current_cases):
    try:
        disease_df   = df[df['disease'] == disease]
        last_30_days = disease_df.tail(30)['cases'].values
        avg_30d      = float(np.mean(last_30_days)) if len(last_30_days) > 0 else 1.0
        return round(current_cases / (avg_30d + 0.001), 2)
    except Exception:
        return 1.0

# ─────────────────────────────────────────
# POST /api/outbreak/detect
# ─────────────────────────────────────────

@outbreak_bp.route('/detect', methods=['POST'])
def detect():
    start = time.time()
    data  = request.get_json()

    if not data:
        return jsonify(error_response('No input data provided')), 400

    errors = validate_outbreak_input(data)
    if errors:
        return jsonify(error_response('Validation failed', errors=errors)), 400

    try:
        disease      = data['disease']
        cases        = int(data['cases'])
        baselines    = get_model('outbreak_baselines')
        daily_df     = get_model('outbreak_daily_data')
        outbreak_df  = get_model('outbreak_data')
        iso_model    = get_model('isolation_forest')
        iso_scaler   = get_model('outbreak_iso_scaler')
        iso_features = get_model('outbreak_iso_features')

        # Alert level and z-score
        alert_level, z_score = get_outbreak_alert_level(cases, disease, baselines)

        # Growth rate and spike ratio
        growth_rate  = _get_growth_rate(daily_df, disease, cases)
        spike_ratio  = _get_spike_ratio(daily_df, disease, cases)

        # Isolation Forest anomaly score
        iso_input    = pd.DataFrame([{f: 0.0 for f in iso_features}])
        iso_input['cases'] = cases
        iso_input_scaled   = iso_scaler.transform(iso_input)
        anomaly_score      = float(-iso_model.score_samples(iso_input_scaled)[0])
        iso_prediction     = int(iso_model.predict(iso_input_scaled)[0])
        iso_is_anomaly     = iso_prediction == -1

        # Days since last outbreak
        days_since = _days_since_last_outbreak(outbreak_df, disease)

        # Baseline info
        baseline   = baselines.get(disease, {})

        # Recent trend
        disease_data    = daily_df[daily_df['disease'] == disease].sort_values('report_date')
        recent_cases    = disease_data.tail(7)['cases'].tolist()
        trend_direction = _get_trend_direction(recent_cases)

        result = {
            'disease':          disease,
            'reported_cases':   cases,
            'alert_level':      alert_level,
            'is_outbreak':      alert_level == 'Outbreak',
            'z_score':          z_score,
            'anomaly_score':    round(anomaly_score, 4),
            'iso_anomaly':      iso_is_anomaly,
            'growth_rate_pct':  growth_rate,
            'spike_ratio':      spike_ratio,
            'trend_direction':  trend_direction,
            'recent_7_days':    recent_cases,
            'days_since_last_outbreak': days_since,
            'baseline': {
                'mean':      baseline.get('mean', 0),
                'std':       baseline.get('std',  0),
                'threshold': baseline.get('threshold', 0),
                'watch':     baseline.get('watch', 0)
            },
            'recommended_actions': _get_recommended_actions(alert_level),
            'model_info': {
                'model':   MODEL_VERSIONS['outbreak']['model'],
                'version': MODEL_VERSIONS['outbreak']['version'],
                'iso_f1':  0.39,
                'detection_rate': '100%'
            }
        }

        return jsonify(success_response(result,
            message=f"Outbreak detection complete: {alert_level}",
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'Detection failed: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# GET /api/outbreak/forecast
# ─────────────────────────────────────────

@outbreak_bp.route('/forecast', methods=['GET'])
def forecast():
    start   = time.time()
    disease = request.args.get('disease', 'Meningitis')
    days    = int(request.args.get('days', 14))

    if disease not in OUTBREAK_DISEASES:
        return jsonify(error_response(
            f"disease must be one of: {', '.join(OUTBREAK_DISEASES)}")), 400

    if days < 1 or days > 30:
        return jsonify(error_response('days must be between 1 and 30')), 400

    try:
        prophet_models = get_model('prophet_models')
        daily_df       = get_model('outbreak_daily_data')
        baselines      = get_model('outbreak_baselines')

        model          = prophet_models[disease]
        future         = model.make_future_dataframe(periods=days)
        forecast_df    = model.predict(future)

        # Last 30 days historical
        disease_data   = daily_df[daily_df['disease'] == disease].sort_values('report_date')
        last_30        = disease_data.tail(30)
        historical     = [
            {
                'date':  str(row['report_date'])[:10],
                'cases': int(row['cases'])
            }
            for _, row in last_30.iterrows()
        ]

        # Forecast days
        forecast_rows  = forecast_df.tail(days)
        baseline       = baselines.get(disease, {})
        threshold      = baseline.get('threshold', 13.5)
        forecast_list  = []

        for _, row in forecast_rows.iterrows():
            predicted     = max(0, round(float(row['yhat']), 2))
            lower         = max(0, round(float(row['yhat_lower']), 2))
            upper         = max(0, round(float(row['yhat_upper']), 2))
            alert, zscore = get_outbreak_alert_level(predicted, disease, baselines)
            forecast_list.append({
                'date':          str(row['ds'])[:10],
                'predicted':     predicted,
                'lower_bound':   lower,
                'upper_bound':   upper,
                'alert_level':   alert,
                'z_score':       zscore,
                'outbreak_risk': predicted >= threshold
            })

        # Trend analysis
        pred_values     = [f['predicted'] for f in forecast_list]
        trend           = _get_trend_direction(pred_values)
        outbreak_days   = sum(1 for f in forecast_list if f['outbreak_risk'])
        avg_predicted   = round(float(np.mean(pred_values)), 2)
        peak_day        = max(forecast_list, key=lambda x: x['predicted'])

        result = {
            'disease':           disease,
            'forecast_days':     days,
            'historical':        historical,
            'forecast':          forecast_list,
            'summary': {
                'trend_direction':   trend,
                'avg_predicted':     avg_predicted,
                'outbreak_risk_days':outbreak_days,
                'peak_day':          peak_day['date'],
                'peak_cases':        peak_day['predicted'],
                'baseline_threshold':threshold
            },
            'model_info': {
                'model':   'Prophet',
                'version': MODEL_VERSIONS['outbreak']['version'],
                'mae':     MODEL_VERSIONS['outbreak']['mae'],
                'rmse':    MODEL_VERSIONS['outbreak']['rmse']
            }
        }

        return jsonify(success_response(result,
            message=f"{days}-day forecast for {disease}",
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'Forecast failed: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# GET /api/outbreak/history
# ─────────────────────────────────────────

@outbreak_bp.route('/history', methods=['GET'])
def history():
    start      = time.time()
    disease    = request.args.get('disease', 'Meningitis')
    start_date = request.args.get('start_date', '2009-01-01')
    end_date   = request.args.get('end_date',   '2018-12-31')

    if disease not in OUTBREAK_DISEASES:
        return jsonify(error_response(
            f"disease must be one of: {', '.join(OUTBREAK_DISEASES)}")), 400

    try:
        outbreak_df  = get_model('outbreak_data')
        daily_df     = get_model('outbreak_daily_data')

        outbreak_df['report_date'] = pd.to_datetime(outbreak_df['report_date'])
        daily_df['report_date']    = pd.to_datetime(daily_df['report_date'])

        # Filter by disease and date range
        mask       = (
            (outbreak_df['disease'] == disease) &
            (outbreak_df['report_date'] >= start_date) &
            (outbreak_df['report_date'] <= end_date)
        )
        filtered   = outbreak_df[mask].sort_values('report_date')

        # Daily cases
        daily_cases = [
            {
                'date':        str(row['report_date'])[:10],
                'cases':       int(row['cases']),
                'is_outbreak': int(row['is_outbreak']),
                'alert_level': str(row['alert_level'])
            }
            for _, row in filtered.iterrows()
        ]

        # Outbreak dates only
        outbreak_dates = [
            {
                'date':  str(row['report_date'])[:10],
                'cases': int(row['cases'])
            }
            for _, row in filtered[filtered['is_outbreak'] == 1].iterrows()
        ]

        # Monthly aggregation
        filtered['month'] = filtered['report_date'].dt.to_period('M')
        monthly = filtered.groupby('month').agg(
            total_cases=('cases', 'sum'),
            avg_cases=('cases', 'mean'),
            outbreaks=('is_outbreak', 'sum')
        ).reset_index()
        monthly_list = [
            {
                'month':       str(row['month']),
                'total_cases': int(row['total_cases']),
                'avg_cases':   round(float(row['avg_cases']), 2),
                'outbreaks':   int(row['outbreaks'])
            }
            for _, row in monthly.iterrows()
        ]

        # Yearly totals
        filtered['year'] = filtered['report_date'].dt.year
        yearly = filtered.groupby('year').agg(
            total_cases=('cases', 'sum'),
            outbreaks=('is_outbreak', 'sum')
        ).reset_index()
        yearly_list = [
            {
                'year':        int(row['year']),
                'total_cases': int(row['total_cases']),
                'outbreaks':   int(row['outbreaks'])
            }
            for _, row in yearly.iterrows()
        ]

        # Peak stats
        if not filtered.empty:
            peak_row   = filtered.loc[filtered['cases'].idxmax()]
            peak_month = filtered.groupby(
                filtered['report_date'].dt.month)['cases'].mean().idxmax()
            peak_year  = yearly.loc[yearly['total_cases'].idxmax(), 'year']
        else:
            peak_row   = None
            peak_month = None
            peak_year  = None

        result = {
            'disease':         disease,
            'date_range':      {'start': start_date, 'end': end_date},
            'daily_cases':     daily_cases,
            'outbreak_dates':  outbreak_dates,
            'monthly':         monthly_list,
            'yearly':          yearly_list,
            'summary': {
                'total_days':      len(daily_cases),
                'total_outbreaks': len(outbreak_dates),
                'outbreak_rate':   round(len(outbreak_dates) / max(len(daily_cases), 1) * 100, 2),
                'avg_daily_cases': round(filtered['cases'].mean(), 2) if not filtered.empty else 0,
                'max_cases':       int(filtered['cases'].max()) if not filtered.empty else 0,
                'peak_date':       str(peak_row['report_date'])[:10] if peak_row is not None else None,
                'peak_month':      int(peak_month) if peak_month is not None else None,
                'peak_year':       int(peak_year) if peak_year is not None else None
            }
        }

        return jsonify(success_response(result,
            message=f"Historical data for {disease}",
            start_time=start)), 200

    except Exception as e:
        return jsonify(error_response(f'History failed: {str(e)}', code=500)), 500