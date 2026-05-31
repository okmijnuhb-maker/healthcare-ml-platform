// App.jsx - Main Application with Router and Layout
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { checkHealth } from './api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Readmission from './pages/Readmission';
import Outbreak from './pages/Outbreak';
import Resources from './pages/Resources';
import './index.css';

// ─────────────────────────────────────────
// PAGE TITLES
// ─────────────────────────────────────────

const PAGE_TITLES = {
  '/':            { title: 'Home',                  subtitle: 'Platform Overview'            },
  '/readmission': { title: 'Patient Readmission',   subtitle: 'Risk Prediction & Analysis'   },
  '/outbreak':    { title: 'Disease Outbreak',      subtitle: 'Detection & Forecasting'      },
  '/resources':   { title: 'Hospital Resources',    subtitle: 'Optimization & Staffing'      },
};

// ─────────────────────────────────────────
// LAYOUT WRAPPER
// ─────────────────────────────────────────

function Layout({ serverStatus, modelsLoaded, responseTime }) {
  const location = useLocation();
  const pageInfo = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>

      {/* Top Navbar */}
      <Navbar
        pageTitle={pageInfo.title}
        pageSubtitle={pageInfo.subtitle}
        serverStatus={serverStatus}
        modelsLoaded={modelsLoaded}
        responseTime={responseTime}
      />

      {/* Sidebar */}
      <Sidebar currentPath={location.pathname} />

      {/* Main Content */}
      <main
        style={{
          marginLeft:  '240px',
          marginTop:   '60px',
          minHeight:   'calc(100vh - 60px)',
          background:  '#0a0f1e',
          overflowX:   'hidden',
        }}
      >
        <Routes>
          <Route path="/"            element={<Home serverStatus={serverStatus} modelsLoaded={modelsLoaded} />} />
          <Route path="/readmission" element={<Readmission />} />
          <Route path="/outbreak"    element={<Outbreak />} />
          <Route path="/resources"   element={<Resources />} />
          <Route path="*"            element={<Home serverStatus={serverStatus} modelsLoaded={modelsLoaded} />} />
        </Routes>
      </main>

    </div>
  );
}

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────

function App() {
  const [serverStatus,  setServerStatus]  = useState('checking');
  const [modelsLoaded,  setModelsLoaded]  = useState(0);
  const [responseTime,  setResponseTime]  = useState(0);

  const fetchHealth = async () => {
    try {
      const start = Date.now();
      const data  = await checkHealth();
      const rt    = Date.now() - start;
      setServerStatus(data.data?.status === 'running' ? 'online' : 'degraded');
      setModelsLoaded(data.data?.models?.total_loaded || 0);
      setResponseTime(rt);
    } catch {
      setServerStatus('offline');
      setModelsLoaded(0);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Layout
        serverStatus={serverStatus}
        modelsLoaded={modelsLoaded}
        responseTime={responseTime}
      />
    </Router>
  );
}

export default App;