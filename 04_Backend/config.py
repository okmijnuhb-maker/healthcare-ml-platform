# config.py - All paths, constants, and settings
import os

# Base paths
BASE_DIR = r'C:\HealthcareML_Platform'
MODELS_DIR = os.path.join(BASE_DIR, '03_Models', 'trained_models')
SCALERS_DIR = os.path.join(BASE_DIR, '03_Models', 'scalers')
DATA_DIR = os.path.join(BASE_DIR, '02_Data', 'processed')
LOGS_DIR = os.path.join(BASE_DIR, '06_Results', 'logs')

# Readmission model files
READMISSION_MODEL = os.path.join(MODELS_DIR, 'lr_readmission_model.pkl')
READMISSION_BACKUP_MODEL = os.path.join(MODELS_DIR, 'lgb_readmission_model.pkl')
READMISSION_SCALER = os.path.join(SCALERS_DIR, 'readmission_scaler.pkl')
READMISSION_FEATURES = os.path.join(MODELS_DIR, 'feature_names.pkl')
READMISSION_METADATA = os.path.join(MODELS_DIR, 'model_metadata.json')

# Outbreak model files
ISOLATION_FOREST = os.path.join(MODELS_DIR, 'isolation_forest_outbreak.pkl')
PROPHET_MODELS = os.path.join(MODELS_DIR, 'prophet_outbreak_models.pkl')
OUTBREAK_ISO_SCALER = os.path.join(SCALERS_DIR, 'outbreak_iso_scaler.pkl')
OUTBREAK_ISO_FEATURES = os.path.join(MODELS_DIR, 'iso_feature_names.pkl')
OUTBREAK_DATA = os.path.join(DATA_DIR, 'disease_outbreak_processed.csv')
OUTBREAK_DAILY_DATA = os.path.join(DATA_DIR, 'disease_daily.csv')
OUTBREAK_METADATA = os.path.join(MODELS_DIR, 'outbreak_model_metadata.json')

# Resource model files
RESOURCE_MODEL = os.path.join(MODELS_DIR, 'rf_hospital_occupancy.pkl')
RESOURCE_SCALER = os.path.join(SCALERS_DIR, 'hospital_occupancy_scaler.pkl')
RESOURCE_FEATURES = os.path.join(SCALERS_DIR, 'hospital_feature_columns.pkl')
RESOURCE_METADATA = os.path.join(MODELS_DIR, 'hospital_occupancy_metadata.json')
RESOURCE_ER_MODEL = os.path.join(MODELS_DIR, 'rf_er_occupancy.pkl')
RESOURCE_ICU_MODEL = os.path.join(MODELS_DIR, 'rf_icu_occupancy.pkl')
RESOURCE_GW_MODEL = os.path.join(MODELS_DIR, 'rf_general_ward_occupancy.pkl')

# Flask settings
FLASK_PORT = 5000
FLASK_DEBUG = True
CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

# Risk thresholds - Readmission
READMISSION_THRESHOLDS = {'low': 30, 'medium': 60, 'high': 100}
POPULATION_AVG_READMISSION = 49.97

# Outbreak thresholds
OUTBREAK_THRESHOLDS = {
    'outbreak': 13.5,
    'watch': 11.0,
    'normal': 0
}
OUTBREAK_DISEASES = [
    'Cholera', 'Diarrhoea', 'Ebola', 'Malaria',
    'Marburg Virus', 'Measles', 'Meningitis',
    'Rubella Mars', 'Viral Haemmorrhaphic Fever', 'Yellow Fever'
]

# Occupancy thresholds
OCCUPANCY_THRESHOLDS = {
    'critical': 90,
    'high': 75,
    'moderate': 50,
    'low': 0
}

# Department bed capacity
DEPT_BEDS = {
    'ER': 50,
    'ICU': 30,
    'General Ward': 100
}

# Staffing ratios per occupied bed
STAFFING_RATIOS = {
    'ICU':          {'nurses': 2.0, 'doctors': 0.5, 'support': 1.0},
    'ER':           {'nurses': 1.5, 'doctors': 0.4, 'support': 0.8},
    'General Ward': {'nurses': 0.5, 'doctors': 0.2, 'support': 0.3}
}

# Salary per shift
SALARY = {
    'nurses': 150,
    'doctors': 400,
    'support': 80
}

# Shift timings
SHIFTS = {
    'morning':   {'start': '06:00', 'end': '14:00', 'multiplier': 1.0},
    'afternoon': {'start': '14:00', 'end': '22:00', 'multiplier': 1.0},
    'night':     {'start': '22:00', 'end': '06:00', 'multiplier': 1.2}
}

# Department average stats for comparison
DEPT_AVG_STATS = {
    'ER':           {'avg_occupancy': 72.81, 'avg_los': 2.54, 'avg_admissions': 7.49},
    'ICU':          {'avg_occupancy': 81.01, 'avg_los': 4.50, 'avg_admissions': 4.52},
    'General Ward': {'avg_occupancy': 68.22, 'avg_los': 3.51, 'avg_admissions': 14.95}
}

# Cost optimization benchmarks
COST_BENCHMARKS = {
    'ER':           {'optimal_occupancy': 75, 'cost_per_bed': 452.57, 'avg_daily_cost': 14018},
    'ICU':          {'optimal_occupancy': 80, 'cost_per_bed': 586.17, 'avg_daily_cost': 10830},
    'General Ward': {'optimal_occupancy': 70, 'cost_per_bed': 179.99, 'avg_daily_cost': 11245}
}

# Readmission recommendations by risk level
READMISSION_RECOMMENDATIONS = {
    'High': [
        'Intensive monitoring required before discharge',
        'Schedule follow-up appointment within 3 days',
        'Daily phone check-ins recommended',
        'Consider care coordinator referral',
        'Review all medications before discharge',
        'Ensure patient has transportation and support at home'
    ],
    'Medium': [
        'Standard follow-up care recommended',
        'Schedule follow-up within 7 days',
        'Weekly phone check-ins',
        'Review medication compliance',
        'Provide patient education materials'
    ],
    'Low': [
        'Standard discharge protocols',
        'Routine follow-up in 2-4 weeks',
        'Patient education materials provided',
        'Contact GP within 2 weeks'
    ]
}

# Feature importance from notebook 1
READMISSION_FEATURE_IMPORTANCE = {
    'prev_admissions':       1.317181,
    'length_of_stay_days':   0.652124,
    'age':                   0.635081,
    'num_diagnoses':         0.509837,
    'discharge_type':        0.491583,
    'num_medications':       0.489269,
    'has_diabetes':          0.365539,
    'glucose_level':         0.313174,
    'bmi':                   0.288624
}

# Model versions
MODEL_VERSIONS = {
    'readmission': {
        'model':    'Logistic Regression',
        'version':  '1.0',
        'accuracy': 0.7907,
        'auc':      0.8777,
        'trained':  '2024'
    },
    'outbreak': {
        'model':    'Prophet + Isolation Forest',
        'version':  '1.0',
        'mae':      2.20,
        'rmse':     2.76,
        'trained':  '2024'
    },
    'resources': {
        'model':    'Random Forest',
        'version':  '1.0',
        'r2':       0.9993,
        'mae':      0.17,
        'trained':  '2024'
    }
}

# Logging settings
LOG_FILE = os.path.join(LOGS_DIR, 'api_requests.log')
LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'
LOG_LEVEL = 'INFO'

print("Config loaded successfully")
print(f"Models directory: {MODELS_DIR}")
print(f"Scalers directory: {SCALERS_DIR}")
print(f"Data directory: {DATA_DIR}")