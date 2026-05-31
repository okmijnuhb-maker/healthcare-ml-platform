# model_loader.py - Load all models at startup
import joblib
import json
import time
import os
import pandas as pd
import numpy as np
from config import *

# Global model store
models = {}
loading_status = {}
loading_times = {}
file_sizes = {}

def _load_single(key, path):
    try:
        start = time.time()
        models[key] = joblib.load(path)
        loading_times[key] = round(time.time() - start, 3)
        file_sizes[key] = round(os.path.getsize(path) / 1024, 1)
        loading_status[key] = 'success'
        print(f"  OK  {key:40s} {file_sizes[key]:8.1f} KB  {loading_times[key]}s")
    except Exception as e:
        loading_status[key] = f'failed: {str(e)}'
        models[key] = None
        print(f"  FAIL {key:40s} {str(e)}")

def _load_json(key, path):
    try:
        with open(path, 'r') as f:
            models[key] = json.load(f)
        loading_status[key] = 'success'
        print(f"  OK  {key:40s} JSON loaded")
    except Exception as e:
        loading_status[key] = f'failed: {str(e)}'
        models[key] = None
        print(f"  FAIL {key:40s} {str(e)}")

def _load_dataframe(key, path):
    try:
        start = time.time()
        models[key] = pd.read_csv(path)
        loading_times[key] = round(time.time() - start, 3)
        file_sizes[key] = round(os.path.getsize(path) / 1024, 1)
        loading_status[key] = 'success'
        print(f"  OK  {key:40s} {len(models[key])} rows  {loading_times[key]}s")
    except Exception as e:
        loading_status[key] = f'failed: {str(e)}'
        models[key] = None
        print(f"  FAIL {key:40s} {str(e)}")

def load_all_models():
    print("\n" + "="*65)
    print("  LOADING ALL MODELS")
    print("="*65)

    # Readmission models
    print("\n  READMISSION MODELS:")
    _load_single('readmission_model',   READMISSION_MODEL)
    _load_single('readmission_backup',  READMISSION_BACKUP_MODEL)
    _load_single('readmission_scaler',  READMISSION_SCALER)
    _load_single('readmission_features',READMISSION_FEATURES)
    _load_json('readmission_metadata',  READMISSION_METADATA)

    # Outbreak models
    print("\n  OUTBREAK MODELS:")
    _load_single('isolation_forest',        ISOLATION_FOREST)
    _load_single('outbreak_iso_scaler',     OUTBREAK_ISO_SCALER)
    _load_single('outbreak_iso_features',   OUTBREAK_ISO_FEATURES)
    _load_single('prophet_models',          PROPHET_MODELS)
    _load_dataframe('outbreak_data',        OUTBREAK_DATA)
    _load_dataframe('outbreak_daily_data',  OUTBREAK_DAILY_DATA)
    _load_json('outbreak_metadata',         OUTBREAK_METADATA)

    # Resource models
    print("\n  RESOURCE MODELS:")
    _load_single('resource_model',      RESOURCE_MODEL)
    _load_single('resource_er_model',   RESOURCE_ER_MODEL)
    _load_single('resource_icu_model',  RESOURCE_ICU_MODEL)
    _load_single('resource_gw_model',   RESOURCE_GW_MODEL)
    _load_single('resource_scaler',     RESOURCE_SCALER)
    _load_single('resource_features',   RESOURCE_FEATURES)
    _load_json('resource_metadata',     RESOURCE_METADATA)

    # Compute outbreak baselines
    print("\n  COMPUTING OUTBREAK BASELINES:")
    _compute_outbreak_baselines()

    # Print summary
    _print_summary()

def _compute_outbreak_baselines():
    try:
        df = models.get('outbreak_daily_data')
        if df is not None:
            df['report_date'] = pd.to_datetime(df['report_date'])
            baselines = {}
            for disease in df['disease'].unique():
                data = df[df['disease'] == disease]['cases']
                baselines[disease] = {
                    'mean':      round(float(data.mean()), 4),
                    'std':       round(float(data.std()), 4),
                    'threshold': round(float(data.mean() + 2 * data.std()), 4),
                    'watch':     round(float(data.mean() + data.std()), 4),
                    'min':       int(data.min()),
                    'max':       int(data.max())
                }
            models['outbreak_baselines'] = baselines
            loading_status['outbreak_baselines'] = 'success'
            print(f"  OK  outbreak_baselines computed for {len(baselines)} diseases")
        else:
            loading_status['outbreak_baselines'] = 'failed: no data'
            print("  FAIL outbreak_baselines - no data available")
    except Exception as e:
        loading_status['outbreak_baselines'] = f'failed: {str(e)}'
        print(f"  FAIL outbreak_baselines - {str(e)}")

def _print_summary():
    success = sum(1 for v in loading_status.values() if v == 'success')
    failed  = sum(1 for v in loading_status.values() if v != 'success')
    print("\n" + "="*65)
    print(f"  LOADING COMPLETE: {success} success | {failed} failed")
    if failed > 0:
        print("\n  FAILED MODELS:")
        for k, v in loading_status.items():
            if v != 'success':
                print(f"    {k}: {v}")
    print("="*65 + "\n")

def get_model(name):
    return models.get(name)

def is_ready():
    critical = [
        'readmission_model',
        'readmission_scaler',
        'readmission_features',
        'isolation_forest',
        'prophet_models',
        'resource_model',
        'resource_features'
    ]
    return all(models.get(k) is not None for k in critical)

def get_health_status():
    return {
        'ready':          is_ready(),
        'total_loaded':   sum(1 for v in loading_status.values() if v == 'success'),
        'total_failed':   sum(1 for v in loading_status.values() if v != 'success'),
        'model_status':   loading_status,
        'loading_times':  loading_times,
        'file_sizes_kb':  file_sizes
    }

def get_model_info():
    return {
        'readmission': {
            **MODEL_VERSIONS['readmission'],
            'features':      models.get('readmission_features', []),
            'feature_importance': READMISSION_FEATURE_IMPORTANCE,
            'population_avg_readmission': POPULATION_AVG_READMISSION
        },
        'outbreak': {
            **MODEL_VERSIONS['outbreak'],
            'diseases':   OUTBREAK_DISEASES,
            'baselines':  models.get('outbreak_baselines', {})
        },
        'resources': {
            **MODEL_VERSIONS['resources'],
            'departments':     list(DEPT_BEDS.keys()),
            'dept_avg_stats':  DEPT_AVG_STATS,
            'cost_benchmarks': COST_BENCHMARKS
        }
    }

if __name__ == '__main__':
    load_all_models()
    print("Health Status:")
    status = get_health_status()
    print(f"  Ready: {status['ready']}")
    print(f"  Loaded: {status['total_loaded']}")
    print(f"  Failed: {status['total_failed']}")