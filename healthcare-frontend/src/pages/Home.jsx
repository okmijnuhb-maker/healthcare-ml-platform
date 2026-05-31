// Home.jsx - Platform Overview Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, AlertTriangle, Building2,
  Activity, Cpu, Zap, Database,
  ArrowRight, CheckCircle, Server,
  GitBranch, BarChart2
} from 'lucide-react';
import { checkHealth } from '../api';
import StatCard from '../components/StatCard';
import AlertBadge from '../components/AlertBadge';

// ─────────────────────────────────────────
// PROJECT CARD
// ─────────────────────────────────────────

function ProjectCard({ icon: Icon, color, title, description, metrics, model, onClick }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    'rgba(17,24,39,0.8)',
        border:        `1px solid ${hovered ? color + '44' : 'rgba(255,255,255,0.06)'}`,
        borderRadius:  '16px',
        padding:       '24px',
        cursor:        'pointer',
        transition:    'all 0.3s ease',
        transform:     hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow:     hovered ? `0 12px 40px ${color}22` : 'none',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position:     'absolute',
        top:          '-40px',
        right:        '-40px',
        width:        '120px',
        height:       '120px',
        borderRadius: '50%',
        background:   `${color}11`,
        filter:       'blur(30px)',
        transition:   'all 0.3s ease',
        opacity:      hovered ? 1 : 0.5,
      }} />

      {/* Icon */}
      <div style={{
        width:          '48px',
        height:         '48px',
        borderRadius:   '12px',
        background:     `${color}22`,
        border:         `1px solid ${color}33`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        marginBottom:   '16px',
        boxShadow:      hovered ? `0 0 20px ${color}44` : 'none',
        transition:     'all 0.3s ease',
      }}>
        <Icon size={22} color={color} />
      </div>

      {/* Title */}
      <div style={{
        fontSize:     '17px',
        fontWeight:   700,
        color:        '#f9fafb',
        marginBottom: '8px',
        letterSpacing:'-0.3px',
      }}>
        {title}
      </div>

      {/* Description */}
      <div style={{
        fontSize:     '13px',
        color:        '#6b7280',
        lineHeight:   1.6,
        marginBottom: '20px',
      }}>
        {description}
      </div>

      {/* Metrics */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                 '8px',
        marginBottom:        '20px',
      }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            background:   'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding:      '10px',
          }}>
            <div style={{
              fontSize:   '16px',
              fontWeight: 800,
              color:      color,
              lineHeight: 1,
            }}>
              {m.value}
            </div>
            <div style={{
              fontSize:  '10px',
              color:     '#6b7280',
              marginTop: '3px',
            }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Model badge */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize:     '11px',
          color:        '#4b5563',
          background:   'rgba(255,255,255,0.03)',
          padding:      '4px 10px',
          borderRadius: '20px',
          border:       '1px solid rgba(255,255,255,0.06)',
        }}>
          {model}
        </div>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '4px',
          color:      color,
          fontSize:   '12px',
          fontWeight: 600,
          opacity:    hovered ? 1 : 0.6,
          transition: 'all 0.3s ease',
        }}>
          Open Dashboard
          <ArrowRight size={13} />
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────
// ENDPOINT ROW
// ─────────────────────────────────────────

function EndpointRow({ method, path, description }) {
  const methodColor = method === 'GET' ? '#10b981' : '#3b82f6';
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           '12px',
      padding:       '10px 0',
      borderBottom:  '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{
        fontSize:     '10px',
        fontWeight:   700,
        color:        methodColor,
        background:   `${methodColor}18`,
        border:       `1px solid ${methodColor}33`,
        padding:      '3px 8px',
        borderRadius: '6px',
        minWidth:     '42px',
        textAlign:    'center',
        flexShrink:   0,
      }}>
        {method}
      </span>
      <span style={{
        fontSize:   '12px',
        color:      '#9ca3af',
        fontFamily: 'monospace',
        flex:       1,
      }}>
        {path}
      </span>
      <span style={{
        fontSize: '11px',
        color:    '#4b5563',
      }}>
        {description}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────

function Home({ serverStatus, modelsLoaded }) {
  const navigate  = useNavigate();
  const [health,  setHealth]  = useState(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(() => {});
  }, []);

  const server = health?.data;

  return (
    <div className="page-container">

      {/* ── HERO SECTION ── */}
      <div style={{
        position:     'relative',
        background:   'rgba(17,24,39,0.6)',
        border:       '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding:      '48px 40px',
        marginBottom: '24px',
        overflow:     'hidden',
      }}>
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(59,130,246,0.06)', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(139,92,246,0.06)', filter: 'blur(60px)',
        }} />

        {/* Status badge */}
        <div style={{ marginBottom: '20px' }}>
          <AlertBadge
            type="alert"
            value={serverStatus === 'online' ? 'Normal' : 'Unknown'}
            pulse={false}
            size="sm"
          />
          <span style={{
            fontSize:  '12px',
            color:     '#4b5563',
            marginLeft:'10px',
          }}>
            {serverStatus === 'online'
              ? `All ${modelsLoaded} models loaded and ready`
              : 'Connecting to backend...'}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize:     '42px',
          fontWeight:   800,
          lineHeight:   1.15,
          letterSpacing:'-1px',
          marginBottom: '16px',
        }}>
          <span style={{ color: '#f9fafb' }}>Healthcare</span>{' '}
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            backgroundClip:       'text',
          }}>
            ML Platform
          </span>
        </h1>

        <p style={{
          fontSize:     '16px',
          color:        '#6b7280',
          lineHeight:   1.7,
          maxWidth:     '600px',
          marginBottom: '28px',
        }}>
          AI powered platform for Patient Readmission Prediction,
          Disease Outbreak Detection, and Hospital Resource Optimization.
          Built with Python, Flask, and React.
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/readmission')}
          >
            Get Started
            <ArrowRight size={15} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate('/resources')}
          >
            View Dashboards
          </button>
        </div>

      </div>

      {/* ── SERVER STATS ROW ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap:                 '12px',
        marginBottom:        '24px',
      }}>
        <StatCard
          icon={Server}
          label="Server Status"
          value={serverStatus === 'online' ? 'Online' : 'Offline'}
          color={serverStatus === 'online' ? '#10b981' : '#ef4444'}
          subtitle="Flask Backend"
        />
        <StatCard
          icon={Cpu}
          label="Models Loaded"
          value={modelsLoaded || 0}
          color="#3b82f6"
          subtitle="ML Models Ready"
        />
        <StatCard
          icon={Activity}
          label="API Endpoints"
          value="10"
          color="#8b5cf6"
          subtitle="All Active"
        />
        <StatCard
          icon={Database}
          label="Training Records"
          value="95K+"
          color="#f59e0b"
          subtitle="Across 3 Projects"
        />
        <StatCard
          icon={GitBranch}
          label="Python Version"
          value={server?.server?.python_version || '3.13'}
          color="#06b6d4"
          subtitle="Anaconda Environment"
        />
        <StatCard
          icon={Zap}
          label="Flask Version"
          value={server?.server?.flask_version || '3.1'}
          color="#10b981"
          subtitle="REST API"
        />
      </div>

      {/* ── 3 PROJECT CARDS ── */}
      <div style={{ marginBottom: '12px' }}>
        <div className="section-header">ML Projects</div>
      </div>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap:                 '16px',
        marginBottom:        '24px',
      }}>

        {/* Readmission */}
        <ProjectCard
          icon={Heart}
          color="#ef4444"
          title="Patient Readmission"
          description="Predict 30-day hospital readmission risk using patient vitals, diagnosis history, and discharge information."
          metrics={[
            { value: '87.77%', label: 'AUC-ROC Score' },
            { value: '79.07%', label: 'Accuracy' },
            { value: '9',      label: 'Input Features' },
            { value: '26.8K',  label: 'Training Records' },
          ]}
          model="Logistic Regression"
          onClick={() => navigate('/readmission')}
        />

        {/* Outbreak */}
        <ProjectCard
          icon={AlertTriangle}
          color="#f59e0b"
          title="Disease Outbreak Detection"
          description="Detect and forecast disease outbreaks across 10 diseases using Prophet time series and Isolation Forest anomaly detection."
          metrics={[
            { value: '2.20',  label: 'Prophet MAE' },
            { value: '100%',  label: 'Detection Rate' },
            { value: '10',    label: 'Diseases' },
            { value: '36.5K', label: 'Records' },
          ]}
          model="Prophet + Isolation Forest"
          onClick={() => navigate('/outbreak')}
        />

        {/* Resources */}
        <ProjectCard
          icon={Building2}
          color="#8b5cf6"
          title="Hospital Resource Optimization"
          description="Forecast bed occupancy, optimize staffing levels, and calculate costs for ER, ICU, and General Ward departments."
          metrics={[
            { value: '99.93%', label: 'R² Score' },
            { value: '0.17',   label: 'MAE' },
            { value: '3',      label: 'Departments' },
            { value: '180K',   label: 'Training Records' },
          ]}
          model="Random Forest"
          onClick={() => navigate('/resources')}
        />

      </div>

      {/* ── API ENDPOINTS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px',
      }}>

        {/* Endpoints list */}
        <div className="glass-card-static" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <BarChart2 size={13} style={{ display: 'inline', marginRight: '6px' }} />
            API Endpoints
          </div>
          <EndpointRow method="GET"  path="/api/health"                      description="Server health" />
          <EndpointRow method="POST" path="/api/readmission/predict"          description="Single prediction" />
          <EndpointRow method="GET"  path="/api/readmission/info"             description="Model info" />
          <EndpointRow method="POST" path="/api/readmission/predict-batch"    description="Batch prediction" />
          <EndpointRow method="POST" path="/api/outbreak/detect"              description="Detect outbreak" />
          <EndpointRow method="GET"  path="/api/outbreak/forecast"            description="14-day forecast" />
          <EndpointRow method="GET"  path="/api/outbreak/history"             description="Historical data" />
          <EndpointRow method="POST" path="/api/resources/forecast-beds"      description="Bed forecast" />
          <EndpointRow method="GET"  path="/api/resources/overview"           description="All departments" />
          <EndpointRow method="GET"  path="/api/resources/staffing"           description="Staffing plan" />
        </div>

        {/* Model performance */}
        <div className="glass-card-static" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <CheckCircle size={13} style={{ display: 'inline', marginRight: '6px' }} />
            Model Performance
          </div>

          {/* Readmission */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>Patient Readmission</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>AUC 0.8777</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
              <div style={{ width: '87.77%', height: '100%', background: 'linear-gradient(90deg, #dc2626, #ef4444)', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Outbreak */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>Disease Outbreak</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>MAE 2.20</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
              <div style={{ width: '91%', height: '100%', background: 'linear-gradient(90deg, #d97706, #f59e0b)', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Resources */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600 }}>Resource Optimization</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>R² 0.9993</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
              <div style={{ width: '99.93%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Tech stack */}
          <div className="section-header" style={{ marginBottom: '10px' }}>Tech Stack</div>
          {[
            { label: 'Backend',  value: 'Python Flask',              color: '#3b82f6' },
            { label: 'ML',       value: 'Scikit-learn, Prophet, TF', color: '#10b981' },
            { label: 'Frontend', value: 'React + Tailwind CSS',      color: '#8b5cf6' },
            { label: 'Charts',   value: 'Recharts',                  color: '#f59e0b' },
          ].map((t, i) => (
            <div key={i} className="stat-row">
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{t.label}</span>
              <span style={{ fontSize: '12px', color: t.color, fontWeight: 600 }}>{t.value}</span>
            </div>
          ))}

        </div>
      </div>

    </div>
  );
}

export default Home;