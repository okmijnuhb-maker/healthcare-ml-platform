# readmission_routes.py - Patient Readmission Prediction Routes
import time
import numpy as np
from flask import Blueprint, request, jsonify
from model_loader import get_model
from utils import (
    success_response, error_response,
    validate_readmission_input, preprocess_readmission,
    get_readmission_risk_level, get_top_risk_factors,
    compare_to_population
)
from config import *

readmission_bp = Blueprint('readmission', __name__)

# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def _predict_single(patient_data):
    model        = get_model('readmission_model')
    scaler       = get_model('readmission_scaler')
    feature_names= get_model('readmission_features')

    scaled       = preprocess_readmission(patient_data, scaler, feature_names)
    proba        = model.predict_proba(scaled)[0]
    risk_proba   = float(proba[1])
    confidence   = float(max(proba))
    risk_pct     = round(risk_proba * 100, 2)
    risk_level   = get_readmission_risk_level(risk_proba)
    top_factors  = get_top_risk_factors(patient_data, feature_names, n=3)
    comparison   = compare_to_population(risk_pct)
    recs         = READMISSION_RECOMMENDATIONS[risk_level]

    # Special flags
    flags = []
    if float(patient_data.get('age', 0)) >= 65:
        flags.append('Elderly patient - higher risk category')
    if float(patient_data.get('has_diabetes', 0)) == 1:
        flags.append('Diabetic patient - monitor glucose levels')
    if float(patient_data.get('prev_admissions', 0)) >= 5:
        flags.append('Frequent admitter - care coordinator recommended')
    if float(patient_data.get('num_medications', 0)) >= 10:
        flags.append('High medication count - pharmacist review recommended')
    if float(patient_data.get('length_of_stay_days', 0)) >= 14:
        flags.append('Long stay patient - discharge planning needed')

    return {
        'risk_percentage':   risk_pct,
        'risk_level':        risk_level,
        'confidence':        round(confidence * 100, 2),
        'top_risk_factors':  top_factors,
        'population_comparison': comparison,
        'recommendations':   recs,
        'special_flags':     flags,
        'model_info': {
            'model':    MODEL_VERSIONS['readmission']['model'],
            'version':  MODEL_VERSIONS['readmission']['version'],
            'accuracy': MODEL_VERSIONS['readmission']['accuracy'],
            'auc':      MODEL_VERSIONS['readmission']['auc']
        }
    }

# ─────────────────────────────────────────
# POST /api/readmission/predict
# ─────────────────────────────────────────

@readmission_bp.route('/predict', methods=['POST'])
def predict():
    start = time.time()
    data  = request.get_json()

    if not data:
        return jsonify(error_response('No input data provided')), 400

    errors = validate_readmission_input(data)
    if errors:
        return jsonify(error_response('Validation failed', errors=errors)), 400

    try:
        result = _predict_single(data)
        return jsonify(success_response(result,
            message=f"Readmission risk predicted: {result['risk_level']}",
            start_time=start)), 200
    except Exception as e:
        return jsonify(error_response(f'Prediction failed: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# GET /api/readmission/info
# ─────────────────────────────────────────

@readmission_bp.route('/info', methods=['GET'])
def info():
    start    = time.time()
    metadata = get_model('readmission_metadata')

    data = {
        'model_performance': {
            'accuracy':  metadata.get('performance', {}).get('accuracy',  0.7907),
            'precision': metadata.get('performance', {}).get('precision', 0.7874),
            'recall':    metadata.get('performance', {}).get('recall',    0.7962),
            'f1_score':  metadata.get('performance', {}).get('f1_score',  0.7918),
            'auc_roc':   metadata.get('performance', {}).get('auc_roc',   0.8777),
            'pr_auc':    metadata.get('performance', {}).get('pr_auc',    0.8794),
            'cv_mean':   metadata.get('performance', {}).get('cv_mean',   0.7926),
            'cv_std':    metadata.get('performance', {}).get('cv_std',    0.0020)
        },
        'feature_importance': sorted(
            [{'feature': k, 'importance': v}
             for k, v in READMISSION_FEATURE_IMPORTANCE.items()],
            key=lambda x: x['importance'], reverse=True
        ),
        'risk_thresholds': {
            'Low':    'below 30%',
            'Medium': '30% to 60%',
            'High':   'above 60%'
        },
        'population_avg_readmission': POPULATION_AVG_READMISSION,
        'model_version': MODEL_VERSIONS['readmission'],
        'dataset_info': {
            'source':         metadata.get('dataset', {}).get('source', 'Kaggle'),
            'original_rows':  metadata.get('dataset', {}).get('original_rows', 32300),
            'cleaned_rows':   metadata.get('dataset', {}).get('cleaned_rows',  26851),
            'features':       metadata.get('dataset', {}).get('features', 9)
        },
        'top_features': metadata.get('top_features', []),
        'input_fields': {
            'age':                 'Patient age (18-120)',
            'length_of_stay_days': 'Hospital stay duration in days (1-60)',
            'num_diagnoses':       'Number of diagnoses (1-20)',
            'num_medications':     'Number of medications (1-30)',
            'prev_admissions':     'Previous hospital admissions (0-20)',
            'glucose_level':       'Blood glucose level mg/dL (40-400)',
            'bmi':                 'Body mass index (10-60)',
            'has_diabetes':        'Diabetes diagnosis 0 or 1',
            'discharge_type':      'Discharge type 0=home 1=transfer 2=AMA'
        }
    }

    return jsonify(success_response(data,
        message='Readmission model information',
        start_time=start)), 200

# ─────────────────────────────────────────
# POST /api/readmission/predict-batch
# ─────────────────────────────────────────

@readmission_bp.route('/predict-batch', methods=['POST'])
def predict_batch():
    start = time.time()
    data  = request.get_json()

    if not data or 'patients' not in data:
        return jsonify(error_response(
            'Request must contain patients list')), 400

    patients = data['patients']
    if not isinstance(patients, list) or len(patients) == 0:
        return jsonify(error_response('patients must be a non-empty list')), 400

    if len(patients) > 100:
        return jsonify(error_response('Maximum 100 patients per batch')), 400

    results      = []
    failed       = []
    risk_counts  = {'High': 0, 'Medium': 0, 'Low': 0}
    total_risk   = 0

    for i, patient in enumerate(patients):
        errors = validate_readmission_input(patient)
        if errors:
            failed.append({'index': i, 'errors': errors})
            continue
        try:
            result = _predict_single(patient)
            result['patient_index'] = i
            results.append(result)
            risk_counts[result['risk_level']] += 1
            total_risk += result['risk_percentage']
        except Exception as e:
            failed.append({'index': i, 'error': str(e)})

    summary = {
        'total_patients':    len(patients),
        'successful':        len(results),
        'failed':            len(failed),
        'risk_distribution': risk_counts,
        'average_risk':      round(total_risk / max(len(results), 1), 2),
        'high_risk_count':   risk_counts['High'],
        'requires_attention':risk_counts['High'] + risk_counts['Medium']
    }

    return jsonify(success_response(
        {'predictions': results, 'failed': failed, 'summary': summary},
        message=f"Batch prediction complete: {len(results)} successful",
        start_time=start)), 200