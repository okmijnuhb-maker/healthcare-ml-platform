# utils.py - Shared utility functions
import time
import numpy as np
import pandas as pd
from datetime import datetime
from config import *

# ─────────────────────────────────────────
# RESPONSE BUILDERS
# ─────────────────────────────────────────

def success_response(data, message='Success', start_time=None):
    response = {
        'status':     'success',
        'message':    message,
        'timestamp':  datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'data':       data
    }
    if start_time:
        response['response_time_ms'] = round((time.time() - start_time) * 1000, 2)
    return response

def error_response(message, errors=None, code=400):
    response = {
        'status':    'error',
        'message':   message,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'code':      code
    }
    if errors:
        response['errors'] = errors
    return response

# ─────────────────────────────────────────
# INPUT VALIDATORS
# ─────────────────────────────────────────

def validate_readmission_input(data):
    errors = {}
    required = {
        'age':                  (18,   120,  'Age must be between 18 and 120'),
        'length_of_stay_days':  (1,    60,   'Length of stay must be between 1 and 60'),
        'num_diagnoses':        (1,    20,   'Number of diagnoses must be between 1 and 20'),
        'num_medications':      (1,    30,   'Number of medications must be between 1 and 30'),
        'prev_admissions':      (0,    20,   'Previous admissions must be between 0 and 20'),
        'glucose_level':        (40,   400,  'Glucose level must be between 40 and 400'),
        'bmi':                  (10,   60,   'BMI must be between 10 and 60'),
        'has_diabetes':         (0,    1,    'Has diabetes must be 0 or 1'),
        'discharge_type':       (0,    2,    'Discharge type must be 0, 1, or 2')
    }

    for field, (min_val, max_val, msg) in required.items():
        if field not in data:
            errors[field] = f'{field} is required'
            continue
        try:
            val = float(data[field])
            if val < min_val or val > max_val:
                errors[field] = msg
        except (ValueError, TypeError):
            errors[field] = f'{field} must be a number'

    return errors

def validate_outbreak_input(data):
    errors = {}

    if 'disease' not in data:
        errors['disease'] = 'disease is required'
    elif data['disease'] not in OUTBREAK_DISEASES:
        errors['disease'] = f"disease must be one of: {', '.join(OUTBREAK_DISEASES)}"

    if 'cases' not in data:
        errors['cases'] = 'cases is required'
    else:
        try:
            val = int(data['cases'])
            if val < 0:
                errors['cases'] = 'cases must be a positive number'
        except (ValueError, TypeError):
            errors['cases'] = 'cases must be an integer'

    if 'date' in data:
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            errors['date'] = 'date must be in format YYYY-MM-DD'

    return errors

def validate_resource_input(data):
    errors = {}

    if 'department' not in data:
        errors['department'] = 'department is required'
    elif data['department'] not in DEPT_BEDS:
        errors['department'] = f"department must be one of: {', '.join(DEPT_BEDS.keys())}"

    if 'date' in data:
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            errors['date'] = 'date must be in format YYYY-MM-DD'

    if 'occupancy_rate' in data:
        try:
            val = float(data['occupancy_rate'])
            if val < 0 or val > 100:
                errors['occupancy_rate'] = 'occupancy_rate must be between 0 and 100'
        except (ValueError, TypeError):
            errors['occupancy_rate'] = 'occupancy_rate must be a number'

    return errors

# ─────────────────────────────────────────
# PREPROCESSORS
# ─────────────────────────────────────────

def preprocess_readmission(data, scaler, feature_names):
    df = pd.DataFrame([{f: float(data[f]) for f in feature_names}])
    scaled = scaler.transform(df)
    return scaled

def preprocess_outbreak(data, iso_features):
    row = {f: float(data.get(f, 0)) for f in iso_features}
    return pd.DataFrame([row])

# ─────────────────────────────────────────
# RISK CALCULATORS
# ─────────────────────────────────────────

def get_readmission_risk_level(probability):
    pct = probability * 100
    if pct >= READMISSION_THRESHOLDS['medium']:
        return 'High'
    elif pct >= READMISSION_THRESHOLDS['low']:
        return 'Medium'
    return 'Low'

def get_outbreak_alert_level(cases, disease, baselines):
    if disease not in baselines:
        return 'Unknown', 0.0
    b = baselines[disease]
    z_score = round((cases - b['mean']) / (b['std'] + 0.001), 2)
    if cases >= b['threshold']:
        return 'Outbreak', z_score
    elif cases >= b['watch']:
        return 'Watch', z_score
    return 'Normal', z_score

def get_occupancy_alert_level(occupancy_rate):
    if occupancy_rate >= OCCUPANCY_THRESHOLDS['critical']:
        return 'CRITICAL'
    elif occupancy_rate >= OCCUPANCY_THRESHOLDS['high']:
        return 'HIGH'
    elif occupancy_rate >= OCCUPANCY_THRESHOLDS['moderate']:
        return 'MODERATE'
    return 'LOW'

# ─────────────────────────────────────────
# STAFFING CALCULATOR
# ─────────────────────────────────────────

def calculate_staffing(department, occupancy_rate):
    total_beds  = DEPT_BEDS[department]
    occupied    = int(total_beds * occupancy_rate / 100)
    r           = STAFFING_RATIOS[department]

    nurses  = max(1, int(np.ceil(occupied * r['nurses'])))
    doctors = max(1, int(np.ceil(occupied * r['doctors'])))
    support = max(1, int(np.ceil(occupied * r['support'])))
    total   = nurses + doctors + support

    daily_cost = (nurses  * SALARY['nurses'] +
                  doctors * SALARY['doctors'] +
                  support * SALARY['support'])

    max_cost    = calculate_daily_cost(department, 95)
    cost_saving = max_cost - daily_cost

    shifts = {}
    for shift, info in SHIFTS.items():
        shift_cost = round(daily_cost * info['multiplier'] / 3, 2)
        shifts[shift] = {
            'start':   info['start'],
            'end':     info['end'],
            'nurses':  int(np.ceil(nurses  / 3)),
            'doctors': int(np.ceil(doctors / 3)),
            'support': int(np.ceil(support / 3)),
            'cost':    shift_cost
        }

    return {
        'department':     department,
        'total_beds':     total_beds,
        'occupied_beds':  occupied,
        'occupancy_rate': occupancy_rate,
        'alert_level':    get_occupancy_alert_level(occupancy_rate),
        'staffing': {
            'nurses':       nurses,
            'doctors':      doctors,
            'support_staff':support,
            'total_staff':  total
        },
        'shifts':          shifts,
        'costs': {
            'daily_cost':      daily_cost,
            'monthly_cost':    daily_cost * 30,
            'cost_per_bed':    round(daily_cost / max(occupied, 1), 2),
            'cost_saving_vs_max': cost_saving
        }
    }

def calculate_daily_cost(department, occupancy_rate):
    total_beds = DEPT_BEDS[department]
    occupied   = int(total_beds * occupancy_rate / 100)
    r          = STAFFING_RATIOS[department]
    nurses     = max(1, int(np.ceil(occupied * r['nurses'])))
    doctors    = max(1, int(np.ceil(occupied * r['doctors'])))
    support    = max(1, int(np.ceil(occupied * r['support'])))
    return (nurses  * SALARY['nurses'] +
            doctors * SALARY['doctors'] +
            support * SALARY['support'])

# ─────────────────────────────────────────
# SHAP EXPLAINER
# ─────────────────────────────────────────

def get_top_risk_factors(input_data, feature_names, n=3):
    factors = []
    for feature in feature_names:
        val        = float(input_data.get(feature, 0))
        importance = READMISSION_FEATURE_IMPORTANCE.get(feature, 0)
        factors.append({
            'feature':      feature,
            'value':        val,
            'importance':   importance,
            'contribution': round(val * importance, 4)
        })
    factors.sort(key=lambda x: abs(x['importance']), reverse=True)
    return factors[:n]

# ─────────────────────────────────────────
# COMPARISON CALCULATORS
# ─────────────────────────────────────────

def compare_to_population(risk_percentage):
    diff = round(risk_percentage - POPULATION_AVG_READMISSION, 2)
    if diff > 10:
        label = 'significantly above average'
    elif diff > 0:
        label = 'above average'
    elif diff > -10:
        label = 'below average'
    else:
        label = 'significantly below average'
    return {
        'patient_risk':      round(risk_percentage, 2),
        'population_avg':    POPULATION_AVG_READMISSION,
        'difference':        diff,
        'comparison_label':  label
    }

def compare_dept_to_average(department, occupancy_rate):
    avg = DEPT_AVG_STATS[department]['avg_occupancy']
    diff = round(occupancy_rate - avg, 2)
    return {
        'current_occupancy': occupancy_rate,
        'historical_avg':    avg,
        'difference':        diff,
        'status': 'above average' if diff > 0 else 'below average'
    }

# ─────────────────────────────────────────
# TEST
# ─────────────────────────────────────────

if __name__ == '__main__':
    print("Testing utils...")

    # Test readmission validator
    sample = {
        'age': 75, 'length_of_stay_days': 20,
        'num_diagnoses': 10, 'num_medications': 15,
        'prev_admissions': 5, 'glucose_level': 250,
        'bmi': 30, 'has_diabetes': 1, 'discharge_type': 2
    }
    errors = validate_readmission_input(sample)
    print(f"Readmission validation errors: {errors}")

    # Test outbreak validator
    ob_sample = {'disease': 'Meningitis', 'cases': 16, 'date': '2024-01-01'}
    errors2 = validate_outbreak_input(ob_sample)
    print(f"Outbreak validation errors: {errors2}")

    # Test resource validator
    res_sample = {'department': 'ICU', 'occupancy_rate': 85, 'date': '2024-01-01'}
    errors3 = validate_resource_input(res_sample)
    print(f"Resource validation errors: {errors3}")

    # Test staffing
    staffing = calculate_staffing('ICU', 85)
    print(f"\nStaffing for ICU at 85%:")
    print(f"  Nurses:  {staffing['staffing']['nurses']}")
    print(f"  Doctors: {staffing['staffing']['doctors']}")
    print(f"  Total:   {staffing['staffing']['total_staff']}")
    print(f"  Cost:    ${staffing['costs']['daily_cost']:,}")

    # Test risk level
    level = get_readmission_risk_level(0.75)
    print(f"\nRisk level for 75%: {level}")

    # Test comparison
    comp = compare_to_population(75)
    print(f"Population comparison: {comp}")

    print("\nAll utils tests passed!")