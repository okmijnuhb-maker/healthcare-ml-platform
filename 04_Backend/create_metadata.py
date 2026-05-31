# create_metadata.py
import json

metadata = {
    'notebook': 'Notebook 2 - Disease Outbreak Detection',
    'diseases': ['Cholera','Diarrhoea','Ebola','Malaria','Marburg Virus',
                 'Measles','Meningitis','Rubella Mars',
                 'Viral Haemmorrhaphic Fever','Yellow Fever'],
    'prophet_avg_mae': 2.20,
    'prophet_avg_rmse': 2.76,
    'lstm_avg_mae': 2.21,
    'lstm_avg_rmse': 2.77,
    'iso_outbreaks_detected': 949,
    'total_records': 36500,
    'best_model': 'Prophet',
    'detection_rate': 100.0,
    'isolation_forest_f1': 0.39
}

path = r'C:\HealthcareML_Platform\03_Models\trained_models\outbreak_model_metadata.json'
with open(path, 'w') as f:
    json.dump(metadata, f, indent=4)

print("Metadata created successfully")