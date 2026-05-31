// constants.js - All colors, labels, thresholds, and config

// ─────────────────────────────────────────
// RISK LEVEL COLORS AND LABELS
// ─────────────────────────────────────────

export const RISK_COLORS = {
  Low:    { bg: '#10b981', text: '#ffffff', light: '#d1fae5', dark: '#065f46' },
  Medium: { bg: '#f59e0b', text: '#ffffff', light: '#fef3c7', dark: '#92400e' },
  High:   { bg: '#ef4444', text: '#ffffff', light: '#fee2e2', dark: '#991b1b' },
};

export const RISK_LABELS = {
  Low:    { label: 'Low Risk',    description: 'Patient has low readmission risk. Standard discharge protocols apply.' },
  Medium: { label: 'Medium Risk', description: 'Patient has moderate readmission risk. Follow-up care recommended.' },
  High:   { label: 'High Risk',   description: 'Patient has high readmission risk. Intensive monitoring required.' },
};

export const RISK_THRESHOLDS = {
  low:    30,
  medium: 60,
  high:   100,
};

// ─────────────────────────────────────────
// ALERT LEVEL COLORS AND LABELS
// ─────────────────────────────────────────

export const ALERT_COLORS = {
  Normal:   { bg: '#10b981', text: '#ffffff', light: '#d1fae5', border: '#059669' },
  Watch:    { bg: '#f59e0b', text: '#ffffff', light: '#fef3c7', border: '#d97706' },
  Outbreak: { bg: '#ef4444', text: '#ffffff', light: '#fee2e2', border: '#dc2626' },
  Unknown:  { bg: '#6b7280', text: '#ffffff', light: '#f3f4f6', border: '#4b5563' },
};

export const ALERT_LABELS = {
  Normal:   { label: 'Normal',   description: 'Disease levels within expected range. Continue routine surveillance.' },
  Watch:    { label: 'Watch',    description: 'Elevated disease levels detected. Increase monitoring frequency.' },
  Outbreak: { label: 'Outbreak', description: 'Outbreak threshold exceeded. Activate emergency response protocol.' },
};

// ─────────────────────────────────────────
// OCCUPANCY ALERT COLORS AND LABELS
// ─────────────────────────────────────────

export const OCCUPANCY_COLORS = {
  LOW:      { bg: '#10b981', text: '#ffffff', light: '#d1fae5', border: '#059669' },
  MODERATE: { bg: '#3b82f6', text: '#ffffff', light: '#dbeafe', border: '#2563eb' },
  HIGH:     { bg: '#f59e0b', text: '#ffffff', light: '#fef3c7', border: '#d97706' },
  CRITICAL: { bg: '#ef4444', text: '#ffffff', light: '#fee2e2', border: '#dc2626' },
};

export const OCCUPANCY_LABELS = {
  LOW:      { label: 'Low',      description: 'Occupancy below 50%. Resources available.' },
  MODERATE: { label: 'Moderate', description: 'Occupancy between 50-75%. Normal operations.' },
  HIGH:     { label: 'High',     description: 'Occupancy between 75-90%. Monitor closely.' },
  CRITICAL: { label: 'Critical', description: 'Occupancy above 90%. Immediate action required.' },
};

export const OCCUPANCY_THRESHOLDS = {
  critical: 90,
  high:     75,
  moderate: 50,
  low:      0,
};

// ─────────────────────────────────────────
// DEPARTMENT CONFIG
// ─────────────────────────────────────────

export const DEPARTMENTS = ['ER', 'ICU', 'General Ward'];

export const DEPARTMENT_COLORS = {
  'ER':           { primary: '#ef4444', light: '#fee2e2', icon: '🚨' },
  'ICU':          { primary: '#8b5cf6', light: '#ede9fe', icon: '💊' },
  'General Ward': { primary: '#3b82f6', light: '#dbeafe', icon: '🏥' },
};

export const DEPARTMENT_BEDS = {
  'ER':           50,
  'ICU':          30,
  'General Ward': 100,
};

export const DEPARTMENT_DESCRIPTIONS = {
  'ER':           'Emergency Room - Critical and urgent care',
  'ICU':          'Intensive Care Unit - Critical patient monitoring',
  'General Ward': 'General Ward - Standard inpatient care',
};

// ─────────────────────────────────────────
// DISEASES LIST
// ─────────────────────────────────────────

export const DISEASES = [
  'Cholera',
  'Diarrhoea',
  'Ebola',
  'Malaria',
  'Marburg Virus',
  'Measles',
  'Meningitis',
  'Rubella Mars',
  'Viral Haemmorrhaphic Fever',
  'Yellow Fever',
];

export const DISEASE_ICONS = {
  'Cholera':                    '💧',
  'Diarrhoea':                  '🦠',
  'Ebola':                      '⚠️',
  'Malaria':                    '🦟',
  'Marburg Virus':              '⚠️',
  'Measles':                    '🔴',
  'Meningitis':                 '🧠',
  'Rubella Mars':               '🔴',
  'Viral Haemmorrhaphic Fever': '⚠️',
  'Yellow Fever':               '🟡',
};

// ─────────────────────────────────────────
// FORM DEFAULTS
// ─────────────────────────────────────────

export const DEFAULT_PATIENT_FORM = {
  age:                  '',
  length_of_stay_days:  '',
  num_diagnoses:        '',
  num_medications:      '',
  prev_admissions:      '',
  glucose_level:        '',
  bmi:                  '',
  has_diabetes:         '0',
  discharge_type:       '0',
};

export const DEFAULT_OUTBREAK_FORM = {
  disease: 'Meningitis',
  cases:   '',
  date:    new Date().toISOString().split('T')[0],
};

export const DEFAULT_RESOURCE_FORM = {
  department:     'ICU',
  date:           new Date().toISOString().split('T')[0],
  occupancy_rate: '',
};

// ─────────────────────────────────────────
// DISCHARGE TYPE LABELS
// ─────────────────────────────────────────

export const DISCHARGE_TYPES = [
  { value: '0', label: '0 - Discharged Home' },
  { value: '1', label: '1 - Transferred' },
  { value: '2', label: '2 - Against Medical Advice' },
];

// ─────────────────────────────────────────
// CHART CONFIG
// ─────────────────────────────────────────

export const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

export const CHART_GRID_COLOR  = '#1f2937';
export const CHART_TEXT_COLOR  = '#9ca3af';
export const CHART_ANIMATION   = 800;

// ─────────────────────────────────────────
// NAVIGATION ITEMS
// ─────────────────────────────────────────

export const NAV_ITEMS = [
  {
    path:        '/',
    label:       'Home',
    description: 'Platform Overview',
  },
  {
    path:        '/readmission',
    label:       'Readmission',
    description: 'Patient Risk Prediction',
  },
  {
    path:        '/outbreak',
    label:       'Outbreak',
    description: 'Disease Detection',
  },
  {
    path:        '/resources',
    label:       'Resources',
    description: 'Hospital Optimization',
  },
];

// ─────────────────────────────────────────
// PATIENT FORM FIELDS CONFIG
// ─────────────────────────────────────────

export const PATIENT_FIELDS = [
  { key: 'age',                 label: 'Age',                   type: 'number', min: 18,  max: 120, placeholder: '18 - 120',  unit: 'years' },
  { key: 'length_of_stay_days', label: 'Length of Stay',        type: 'number', min: 1,   max: 60,  placeholder: '1 - 60',    unit: 'days'  },
  { key: 'num_diagnoses',       label: 'Number of Diagnoses',   type: 'number', min: 1,   max: 20,  placeholder: '1 - 20',    unit: ''      },
  { key: 'num_medications',     label: 'Number of Medications', type: 'number', min: 1,   max: 30,  placeholder: '1 - 30',    unit: ''      },
  { key: 'prev_admissions',     label: 'Previous Admissions',   type: 'number', min: 0,   max: 20,  placeholder: '0 - 20',    unit: ''      },
  { key: 'glucose_level',       label: 'Glucose Level',         type: 'number', min: 40,  max: 400, placeholder: '40 - 400',  unit: 'mg/dL' },
  { key: 'bmi',                 label: 'BMI',                   type: 'number', min: 10,  max: 60,  placeholder: '10 - 60',   unit: ''      },
];

// ─────────────────────────────────────────
// POPULATION AVERAGE
// ─────────────────────────────────────────

export const POPULATION_AVG_READMISSION = 49.97;

// ─────────────────────────────────────────
// API BASE URL
// ─────────────────────────────────────────

export const API_BASE_URL = 'http://localhost:5000';