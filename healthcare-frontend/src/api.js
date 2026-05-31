// api.js - All API calls to Flask backend
import axios from 'axios';

// ─────────────────────────────────────────
// AXIOS INSTANCE SETUP
// ─────────────────────────────────────────

const BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track last response time
let lastResponseTime = 0;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };
    console.log(`API REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    lastResponseTime = duration;
    console.log(`API RESPONSE: ${response.status} (${duration}ms)`);
    return response;
  },
  (error) => {
    const duration = error.config?.metadata
      ? Date.now() - error.config.metadata.startTime
      : 0;
    console.error(`API ERROR: ${error.message} (${duration}ms)`);
    return Promise.reject(handleApiError(error));
  }
);

// ─────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────

const handleApiError = (error) => {
  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      type: 'timeout',
      errors: null,
    };
  }

  if (!error.response) {
    return {
      message: 'Cannot connect to server. Make sure Flask backend is running on port 5000.',
      type: 'network',
      errors: null,
    };
  }

  const { status, data } = error.response;

  if (status === 400) {
    return {
      message: data?.message || 'Invalid input data.',
      type: 'validation',
      errors: data?.errors || null,
    };
  }

  if (status === 404) {
    return {
      message: 'Endpoint not found.',
      type: 'not_found',
      errors: null,
    };
  }

  if (status === 500) {
    return {
      message: data?.message || 'Server error. Please try again.',
      type: 'server',
      errors: null,
    };
  }

  return {
    message: data?.message || 'Something went wrong.',
    type: 'unknown',
    errors: null,
  };
};

// ─────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────

export const checkHealth = async () => {
  const res = await api.get('/api/health');
  return res.data;
};

export const isServerOnline = async () => {
  try {
    await api.get('/api/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

export const getResponseTime = () => lastResponseTime;

// ─────────────────────────────────────────
// READMISSION
// ─────────────────────────────────────────

export const predictReadmission = async (patientData) => {
  const res = await api.post('/api/readmission/predict', patientData);
  return res.data;
};

export const getReadmissionInfo = async () => {
  const res = await api.get('/api/readmission/info');
  return res.data;
};

export const predictReadmissionBatch = async (patients) => {
  const res = await api.post('/api/readmission/predict-batch', { patients });
  return res.data;
};

// ─────────────────────────────────────────
// OUTBREAK
// ─────────────────────────────────────────

export const detectOutbreak = async (disease, cases, date = null) => {
  const payload = { disease, cases: parseInt(cases) };
  if (date) payload.date = date;
  const res = await api.post('/api/outbreak/detect', payload);
  return res.data;
};

export const getForecast = async (disease, days = 14) => {
  const res = await api.get('/api/outbreak/forecast', {
    params: { disease, days },
  });
  return res.data;
};

export const getOutbreakHistory = async (
  disease,
  startDate = '2009-01-01',
  endDate = '2018-12-31'
) => {
  const res = await api.get('/api/outbreak/history', {
    params: { disease, start_date: startDate, end_date: endDate },
  });
  return res.data;
};

// ─────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────

export const forecastBeds = async (department, date, occupancyRate = null) => {
  const payload = { department, date };
  if (occupancyRate !== null) payload.occupancy_rate = occupancyRate;
  const res = await api.post('/api/resources/forecast-beds', payload);
  return res.data;
};

export const getResourcesOverview = async (date = null) => {
  const params = date ? { date } : {};
  const res = await api.get('/api/resources/overview', { params });
  return res.data;
};

export const getStaffing = async (department = null, date = null) => {
  const params = {};
  if (department) params.department = department;
  if (date) params.date = date;
  const res = await api.get('/api/resources/staffing', { params });
  return res.data;
};

// ─────────────────────────────────────────
// DEFAULT EXPORT
// ─────────────────────────────────────────

export default api;