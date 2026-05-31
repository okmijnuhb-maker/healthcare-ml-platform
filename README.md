# Healthcare ML Platform

A full stack machine learning platform with three healthcare projects built with Python Flask backend and React frontend.

## Projects

### 1. Patient Readmission Prediction
Predicts whether a patient will be readmitted to hospital within 30 days after discharge.
- Algorithm: Logistic Regression
- AUC-ROC: 0.8777
- Accuracy: 79.07%
- Training records: 26,851

### 2. Disease Outbreak Detection
Detects whether reported disease cases represent a normal level or an outbreak. Forecasts next 7, 14, or 30 days.
- Algorithm: Prophet + Isolation Forest
- MAE: 2.20
- Detection Rate: 100%
- Diseases covered: 10

### 3. Hospital Resource Optimization
Forecasts bed occupancy, calculates staffing per shift, and analyzes costs for ER, ICU, and General Ward.
- Algorithm: Random Forest
- R2 Score: 0.9993
- MAE: 0.17
- Training records: 180,000

## Tech Stack

- Backend: Python Flask
- Frontend: React 18
- ML Libraries: scikit-learn, Prophet, Isolation Forest
- Charts: Recharts
- Styling: Tailwind CSS
- HTTP: Axios

## Project Structure

```
HealthcareML_Platform/
    01_Notebooks/        Jupyter notebooks where models were trained
    02_Data/             Raw and processed datasets
    03_Models/           Saved trained model files
    04_Backend/          Flask API server
    healthcare-frontend/ React web application
```

## How to Run Locally

### Requirements
- Python 3.10 or above with Anaconda
- Node.js v18 or above
- Git LFS (for large model files)

### Step 1 - Clone the repository
```
git clone https://github.com/okmijnuhb-maker/healthcare-ml-platform.git
cd healthcare-ml-platform
```

### Step 2 - Install Python dependencies
```
cd 04_Backend
pip install -r requirements.txt
```

### Step 3 - Start the Flask backend
```
cd 04_Backend
python app.py
```
Wait until you see: Running on http://127.0.0.1:5000

### Step 4 - Install frontend dependencies (first time only)
Open a second terminal and run:
```
cd healthcare-frontend
npm install
```

### Step 5 - Start the React frontend
```
cd healthcare-frontend
npm start
```
Browser opens automatically at http://localhost:3000

### To stop both servers
Press CTRL+C in both terminals

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Server health check |
| POST | /api/readmission/predict | Single patient prediction |
| GET | /api/readmission/info | Model metrics |
| POST | /api/readmission/predict-batch | Multiple patients |
| POST | /api/outbreak/detect | Detect outbreak |
| GET | /api/outbreak/forecast | Disease forecast |
| GET | /api/outbreak/history | Historical data |
| POST | /api/resources/forecast-beds | Bed forecast |
| GET | /api/resources/overview | All departments |
| GET | /api/resources/staffing | Staffing plan |

## Important Notes

- Flask server must be running before opening the React app
- No API keys required anywhere
- Everything runs locally on your machine
- Models are loaded into memory at startup, first load takes about 5 seconds
