// Outbreak.jsx - Disease Outbreak Detection Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Activity, TrendingUp, TrendingDown,
  Minus, ChevronRight, RotateCcw, Clock, Copy,
  Printer, Download, BookOpen, Info, Zap,
  Shield, Calendar, BarChart2, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, BarChart, Bar, Cell,
  CartesianGrid
} from 'recharts';
import { detectOutbreak, getForecast, getOutbreakHistory } from '../api';
import AlertBadge from '../components/AlertBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { ALERT_COLORS } from '../constants';

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const DISEASES = [
  { name: 'Cholera',                    icon: '💧', risk: 'high'   },
  { name: 'Diarrhoea',                  icon: '🦠', risk: 'medium' },
  { name: 'Ebola',                      icon: '⚠️', risk: 'high'   },
  { name: 'Malaria',                    icon: '🦟', risk: 'high'   },
  { name: 'Marburg Virus',              icon: '⚠️', risk: 'high'   },
  { name: 'Measles',                    icon: '🔴', risk: 'medium' },
  { name: 'Meningitis',                 icon: '🧠', risk: 'high'   },
  { name: 'Rubella Mars',               icon: '🔴', risk: 'low'    },
  { name: 'Viral Haemmorrhaphic Fever', icon: '⚠️', risk: 'high'   },
  { name: 'Yellow Fever',               icon: '🟡', risk: 'medium' },
];

const SEASONAL_RISK = {
  'Meningitis':  { high: [11,0,1,2], medium: [3,10], pattern: 'Peaks in dry season (Nov–Mar)' },
  'Malaria':     { high: [4,5,6,7,8], medium: [3,9], pattern: 'Peaks in rainy season (May–Sep)' },
  'Cholera':     { high: [5,6,7,8], medium: [4,9], pattern: 'Peaks in summer months' },
  'Measles':     { high: [0,1,2,3], medium: [10,11], pattern: 'Peaks in early year (Jan–Apr)' },
  'Yellow Fever':{ high: [6,7,8], medium: [5,9], pattern: 'Peaks in mid-year' },
};

const CASE_PRESETS = [3, 7, 10, 15, 20, 30, 50];

const ALERT_LEVEL_COLORS = {
  Normal:   '#10b981',
  Watch:    '#f59e0b',
  Outbreak: '#ef4444',
};

// ─────────────────────────────────────────
// SEVERITY METER (like readmission risk meter)
// ─────────────────────────────────────────

function SeverityMeter({ score, alertLevel }) {
  const color = ALERT_LEVEL_COLORS[alertLevel] || '#6b7280';
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference * 0.75;
  const offset = circumference * 0.125;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="180" height="140" viewBox="0 0 180 140">
        <circle cx="90" cy="110" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round" />
        <circle cx="90" cy="110" r={radius} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 1s ease' }} />
        <text x="90" y="98" textAnchor="middle"
          fill="#f9fafb" fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">
          {score}%
        </text>
        <text x="90" y="118" textAnchor="middle"
          fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif">
          Outbreak Severity
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────
// STAT PILL
// ─────────────────────────────────────────

function StatPill({ label, value, color = '#9ca3af', icon }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 16px', borderRadius: '12px',
      background: `${color}11`, border: `1px solid ${color}22`,
      minWidth: '90px', flex: 1,
    }}>
      {icon && <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>}
      <div style={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// BASELINE VS CURRENT BAR
// ─────────────────────────────────────────

function BaselineBar({ reported, baseline }) {
  const max = Math.max(reported, baseline.threshold || 20) * 1.2;
  const reportedPct = Math.min((reported / max) * 100, 100);
  const watchPct = Math.min(((baseline.watch || 0) / max) * 100, 100);
  const thresholdPct = Math.min(((baseline.threshold || 0) / max) * 100, 100);
  const meanPct = Math.min(((baseline.mean || 0) / max) * 100, 100);

  const barColor = reported >= (baseline.threshold || 999)
    ? '#ef4444' : reported >= (baseline.watch || 999)
    ? '#f59e0b' : '#10b981';

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
        Cases vs Thresholds
      </div>

      {/* Reported bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Reported Cases</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: barColor }}>{reported}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', position: 'relative' }}>
          <div style={{ width: `${reportedPct}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 1s ease' }} />
          {/* Threshold markers */}
          <div style={{ position: 'absolute', top: '-4px', left: `${watchPct}%`, width: '2px', height: '16px', background: '#f59e0b', borderRadius: '1px' }} />
          <div style={{ position: 'absolute', top: '-4px', left: `${thresholdPct}%`, width: '2px', height: '16px', background: '#ef4444', borderRadius: '1px' }} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { color: '#6b7280', label: `Mean: ${baseline.mean?.toFixed(1) || '-'}` },
          { color: '#f59e0b', label: `Watch: ${baseline.watch?.toFixed(1) || '-'}` },
          { color: '#ef4444', label: `Outbreak: ${baseline.threshold?.toFixed(1) || '-'}` },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
            <span style={{ fontSize: '10px', color: '#6b7280' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// WHAT-IF SLIDER
// ─────────────────────────────────────────

function WhatIfSlider({ baseline }) {
  const [cases, setCases] = useState(Math.round((baseline?.mean || 5) + 2));

  const getLevel = (c) => {
    if (c >= (baseline?.threshold || 15)) return 'Outbreak';
    if (c >= (baseline?.watch || 10)) return 'Watch';
    return 'Normal';
  };

  const level = getLevel(cases);
  const color = ALERT_LEVEL_COLORS[level] || '#10b981';

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
        <Zap size={11} style={{ display: 'inline', marginRight: '4px' }} />
        What-If Scenario
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>Cases:</span>
        <input type="range" min="0" max="50" value={cases}
          onChange={e => setCases(Number(e.target.value))}
          style={{ flex: 1, accentColor: color }} />
        <span style={{ fontSize: '14px', fontWeight: 700, color, minWidth: '24px' }}>{cases}</span>
      </div>
      <div style={{
        padding: '8px 12px', borderRadius: '8px',
        background: `${color}15`, border: `1px solid ${color}30`,
        fontSize: '12px', color, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Alert Level: {level}</span>
        {cases < (baseline?.watch || 10) && (
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
            +{Math.ceil((baseline?.watch || 10) - cases)} to Watch
          </span>
        )}
        {cases >= (baseline?.watch || 10) && cases < (baseline?.threshold || 15) && (
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
            +{Math.ceil((baseline?.threshold || 15) - cases)} to Outbreak
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SEASONAL INDICATOR
// ─────────────────────────────────────────

function SeasonalIndicator({ disease }) {
  const seasonal = SEASONAL_RISK[disease];
  const currentMonth = new Date().getMonth();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (!seasonal) return (
    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#4b5563' }}>No seasonal pattern data for this disease.</div>
    </div>
  );

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
        <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
        Seasonal Risk
      </div>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
        {months.map((m, i) => {
          const isHigh = seasonal.high.includes(i);
          const isMedium = seasonal.medium?.includes(i);
          const isCurrent = i === currentMonth;
          const color = isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981';
          return (
            <div key={i} style={{
              flex: 1, height: '28px', borderRadius: '3px',
              background: `${color}${isCurrent ? 'dd' : '44'}`,
              border: isCurrent ? `2px solid ${color}` : 'none',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: '2px',
            }}>
              {isCurrent && (
                <span style={{ fontSize: '8px', color: '#f9fafb', fontWeight: 700 }}>
                  {m}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{seasonal.pattern}</div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        {[
          { color: '#ef4444', label: 'High risk' },
          { color: '#f59e0b', label: 'Medium risk' },
          { color: '#10b981', label: 'Low risk' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
            <span style={{ fontSize: '10px', color: '#6b7280' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FORECAST RISK CALENDAR
// ─────────────────────────────────────────

function ForecastCalendar({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  const days14 = forecast.slice(0, 14);

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', marginTop: '12px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
        <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
        14-Day Risk Calendar
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days14.map((d, i) => {
          const color = ALERT_LEVEL_COLORS[d.alert_level] || '#10b981';
          const date = new Date(d.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
          const dayNum = date.getDate();
          return (
            <div key={i} title={`${d.date}: ${d.predicted_cases} cases (${d.alert_level})`}
              style={{
                background: `${color}20`, border: `1px solid ${color}44`,
                borderRadius: '6px', padding: '6px 4px', textAlign: 'center',
              }}>
              <div style={{ fontSize: '9px', color: '#4b5563' }}>{dayName}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color }}>{dayNum}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{d.predicted_cases}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {Object.entries(ALERT_LEVEL_COLORS).map(([level, color]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
            <span style={{ fontSize: '10px', color: '#6b7280' }}>{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TREND ANALYSIS (7-day)
// ─────────────────────────────────────────

function TrendAnalysis({ recentDays }) {
  if (!recentDays || recentDays.length < 2) return null;

  const changes = recentDays.slice(1).map((v, i) => v - recentDays[i]);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const isAccelerating = changes[changes.length - 1] > avgChange;
  const tomorrow = Math.max(0, Math.round(recentDays[recentDays.length - 1] + avgChange));

  const trendData = recentDays.map((v, i) => ({
    day: `Day ${i + 1}`,
    cases: v,
    change: i > 0 ? v - recentDays[i - 1] : 0,
  }));

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
        7-Day Trend Analysis
      </div>

      {/* Mini bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '50px', marginBottom: '10px' }}>
        {recentDays.map((v, i) => {
          const max = Math.max(...recentDays);
          const h = max > 0 ? (v / max) * 100 : 0;
          const change = i > 0 ? v - recentDays[i - 1] : 0;
          const color = change > 0 ? '#ef4444' : change < 0 ? '#10b981' : '#9ca3af';
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: change > 0 ? '#ef4444' : '#10b981' }}>
                {i > 0 ? (change > 0 ? `+${change}` : change) : ''}
              </span>
              <div style={{ width: '100%', height: `${Math.max(h, 8)}%`, background: color, borderRadius: '3px 3px 0 0', minHeight: '4px' }} />
              <span style={{ fontSize: '9px', color: '#4b5563' }}>{v}</span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: avgChange > 0 ? '#ef4444' : '#10b981' }}>
            {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>Avg daily change</div>
        </div>
        <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>{tomorrow}</div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>Tomorrow (est.)</div>
        </div>
        <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: isAccelerating ? '#ef4444' : '#10b981' }}>
            {isAccelerating ? '↑' : '↓'}
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>{isAccelerating ? 'Accelerating' : 'Decelerating'}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MULTI-DISEASE ALERT BOARD
// ─────────────────────────────────────────

function DiseaseAlertBoard({ onSelect, selectedDisease }) {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const results = {};
    for (const d of DISEASES) {
      try {
        const avg = { 'Ebola': 3, 'Marburg Virus': 2, 'Cholera': 8, 'Meningitis': 8,
          'Malaria': 12, 'Measles': 6, 'Diarrhoea': 10, 'Yellow Fever': 5,
          'Rubella Mars': 4, 'Viral Haemmorrhaphic Fever': 3 };
        const data = await detectOutbreak(d.name, avg[d.name] || 5);
        results[d.name] = data.data?.alert_level || 'Normal';
      } catch { results[d.name] = 'Unknown'; }
    }
    setStatuses(results);
    setLoading(false);
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  return (
    <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          All Disease Status
        </div>
        <button onClick={refreshAll} disabled={loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px' }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {DISEASES.map((d, i) => {
          const status = statuses[d.name] || '...';
          const color = ALERT_LEVEL_COLORS[status] || '#6b7280';
          const isSelected = d.name === selectedDisease;
          return (
            <div key={i} onClick={() => onSelect(d.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                background: isSelected ? `${color}20` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? color + '44' : 'rgba(255,255,255,0.04)'}`,
                transition: 'all 0.2s ease',
              }}>
              <span style={{ fontSize: '14px' }}>{d.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name}
                </div>
              </div>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0,
                boxShadow: status === 'Outbreak' ? `0 0 6px ${color}` : 'none',
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// RECOMMENDED ACTIONS LIST
// ─────────────────────────────────────────

function ActionsList({ actions }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
        <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
        Recommended Actions
      </div>
      {actions.map((action, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '8px 0',
          borderBottom: i < actions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444' }}>{i + 1}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>{action}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// FORECAST CHART
// ─────────────────────────────────────────

function ForecastChart({ disease, forecastDays }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(forecastDays || 14);

  useEffect(() => {
    if (!disease) return;
    setLoading(true);
    setError(null);
    getForecast(disease, days)
      .then(data => setForecast(data.data))
      .catch(err => setError(err.message || 'Forecast failed'))
      .finally(() => setLoading(false));
  }, [disease, days]);

  const chartData = forecast?.forecast?.map(f => ({
    date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    predicted: f.predicted_cases,
    lower: f.lower_bound,
    upper: f.upper_bound,
    alert: f.alert_level,
  })) || [];

  const handleDownloadCSV = () => {
    if (!forecast?.forecast) return;
    const rows = [['Date', 'Predicted', 'Lower', 'Upper', 'Alert']];
    forecast.forecast.forEach(f => rows.push([f.date, f.predicted_cases, f.lower_bound, f.upper_bound, f.alert_level]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${disease}_forecast.csv`; a.click();
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: days === d ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                color: days === d ? '#3b82f6' : '#6b7280',
                fontSize: '12px', fontWeight: days === d ? 700 : 500,
              }}>
              {d}d
            </button>
          ))}
        </div>
        <button onClick={handleDownloadCSV} disabled={!forecast}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#6b7280', fontSize: '11px', cursor: 'pointer',
          }}>
          <Download size={11} /> CSV
        </button>
      </div>

      {loading && <LoadingSpinner message="Loading forecast..." size="sm" />}
      {error && <ErrorMessage message={error} />}

      {!loading && chartData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="boundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={Math.floor(chartData.length / 5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v, name) => [Math.round(v * 10) / 10, name]} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#boundGrad)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0f1e" />
              <Area type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} fill="url(#forecastGrad)" dot={false} />
              {forecast?.summary?.watch_threshold && (
                <ReferenceLine y={forecast.summary.watch_threshold} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'Watch', fill: '#f59e0b', fontSize: 10 }} />
              )}
              {forecast?.summary?.outbreak_threshold && (
                <ReferenceLine y={forecast.summary.outbreak_threshold} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'Outbreak', fill: '#ef4444', fontSize: 10 }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Calendar view */}
          <ForecastCalendar forecast={forecast?.forecast} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// HISTORY CHART
// ─────────────────────────────────────────

function HistoryChart({ disease }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('1y');

  const DATE_RANGES = {
    '1y': { start: '2018-01-01', end: '2018-12-31', label: '1 Year' },
    '3y': { start: '2016-01-01', end: '2018-12-31', label: '3 Years' },
    'all':{ start: '2009-01-01', end: '2018-12-31', label: 'All Data' },
  };

  useEffect(() => {
    if (!disease) return;
    setLoading(true);
    setError(null);
    const r = DATE_RANGES[range];
    getOutbreakHistory(disease, r.start, r.end)
      .then(data => setHistory(data.data))
      .catch(err => setError(err.message || 'History failed'))
      .finally(() => setLoading(false));
  }, [disease, range]);

  const chartData = history?.history?.slice(0, 365).map(h => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cases: h.cases,
    isOutbreak: h.is_outbreak,
  })) || [];

  const outbreakCount = chartData.filter(d => d.isOutbreak).length;
  const peakCases = chartData.length > 0 ? Math.max(...chartData.map(d => d.cases)) : 0;

  const handleDownloadCSV = () => {
    if (!history?.history) return;
    const rows = [['Date', 'Cases', 'Is Outbreak']];
    history.history.forEach(h => rows.push([h.date, h.cases, h.is_outbreak]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${disease}_history.csv`; a.click();
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(DATE_RANGES).map(([key, val]) => (
            <button key={key} onClick={() => setRange(key)}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: range === key ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                color: range === key ? '#f59e0b' : '#6b7280',
                fontSize: '12px', fontWeight: range === key ? 700 : 500,
              }}>
              {val.label}
            </button>
          ))}
        </div>
        <button onClick={handleDownloadCSV} disabled={!history}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#6b7280', fontSize: '11px', cursor: 'pointer',
          }}>
          <Download size={11} /> CSV
        </button>
      </div>

      {/* Summary stats */}
      {history && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Outbreak Days', value: outbreakCount, color: '#ef4444' },
            { label: 'Peak Cases',    value: peakCases,      color: '#f59e0b' },
            { label: 'Data Points',   value: chartData.length, color: '#3b82f6' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px', borderRadius: '8px', textAlign: 'center',
              background: `${s.color}11`, border: `1px solid ${s.color}22`,
            }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <LoadingSpinner message="Loading history..." size="sm" />}
      {error && <ErrorMessage message={error} />}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="cases" stroke="#f59e0b" strokeWidth={2} fill="url(#histGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SESSION HISTORY
// ─────────────────────────────────────────

function SessionHistory({ history, onRestore, onClear }) {
  if (history.length === 0) return null;
  return (
    <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
          Recent Detections ({history.length})
        </div>
        <button onClick={onClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: '11px' }}>
          Clear
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {history.map((h, i) => {
          const color = ALERT_LEVEL_COLORS[h.alertLevel] || '#6b7280';
          return (
            <button key={i} onClick={() => onRestore(h)}
              style={{
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                background: `${color}15`, border: `1px solid ${color}33`,
                color, fontSize: '11px', fontWeight: 600,
              }}>
              {h.disease} • {h.alertLevel} • {h.cases} cases • {h.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN OUTBREAK PAGE
// ─────────────────────────────────────────

function Outbreak() {
  const [activeTab,    setActiveTab]    = useState('detect');
  const [disease,      setDisease]      = useState('Meningitis');
  const [cases,        setCases]        = useState('');
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null);
  const [history,      setHistory]      = useState([]);

  const diseaseObj = DISEASES.find(d => d.name === disease);

  const handleDetect = async () => {
    if (!cases) { setError('Please enter number of reported cases.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await detectOutbreak(disease, cases, date);
      setResult(data.data);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        disease, alertLevel: data.data.alert_level,
        cases: parseInt(cases), time: timeStr, result: data.data,
      }, ...prev].slice(0, 5));
    } catch (err) {
      setError(err.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (h) => {
    setDisease(h.disease);
    setCases(String(h.cases));
    setResult(h.result);
  };

  // Calculate severity score from result
  const severityScore = result ? Math.min(100, Math.round(
    (result.z_score || 0) * 15 +
    (result.anomaly_score || 0) * 30 +
    (result.spike_ratio || 1) * 10
  )) : 0;

  const handleCopyReport = () => {
    if (!result) return;
    const text = `
Healthcare ML Platform - Outbreak Detection Report
===================================================
Disease:        ${disease}
Cases Reported: ${cases}
Date:           ${date}
Alert Level:    ${result.alert_level}
Is Outbreak:    ${result.is_outbreak ? 'YES' : 'NO'}
Z-Score:        ${result.z_score}
Anomaly Score:  ${result.anomaly_score}
Spike Ratio:    ${result.spike_ratio}x
Growth Rate:    ${result.growth_rate_pct}%
Trend:          ${result.trend_direction}

Recommended Actions:
${result.recommended_actions?.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="page-container">
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <h1 className="page-title">Disease Outbreak Detection</h1>
        </div>
        <p className="page-subtitle">
          Detect and forecast disease outbreaks using Prophet time series and Isolation Forest
        </p>
      </div>

      {/* Session History */}
      <SessionHistory history={history} onRestore={handleRestore} onClear={() => setHistory([])} />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        background: 'rgba(17,24,39,0.8)', padding: '4px',
        borderRadius: '12px', width: 'fit-content',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { key: 'detect',  label: 'Detection',        icon: Activity },
          { key: 'forecast',label: 'Forecast & History',icon: TrendingUp },
          { key: 'info',    label: 'Model Info',        icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: active ? 'rgba(245,158,11,0.2)' : 'transparent',
                color: active ? '#f59e0b' : '#6b7280',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── DETECTION TAB ── */}
      {activeTab === 'detect' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>

          {/* LEFT COLUMN */}
          <div>
            {/* Disease Alert Board */}
            <DiseaseAlertBoard onSelect={d => { setDisease(d); setResult(null); }} selectedDisease={disease} />

            {/* Detection Form */}
            <div className="glass-card-static" style={{ padding: '20px', marginBottom: '16px' }}>
              <div className="section-header" style={{ marginBottom: '16px' }}>Detection Input</div>

              {/* Disease selector */}
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Disease</label>
                <select className="input-dark" value={disease}
                  onChange={e => { setDisease(e.target.value); setResult(null); }}>
                  {DISEASES.map(d => (
                    <option key={d.name} value={d.name}>{d.icon} {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Cases input + presets */}
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Reported Cases</label>
                <input type="number" className="input-dark" placeholder="Enter number of cases"
                  value={cases} onChange={e => setCases(e.target.value)} min="0" max="1000" />
                {/* Quick presets */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {CASE_PRESETS.map(c => (
                    <button key={c} onClick={() => setCases(String(c))}
                      style={{
                        padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: cases == c ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
                        color: cases == c ? '#f59e0b' : '#6b7280',
                        fontSize: '11px', fontWeight: 600,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">Date (Optional)</label>
                <input type="date" className="input-dark" value={date}
                  onChange={e => setDate(e.target.value)} />
              </div>

              {/* Seasonal indicator */}
              <SeasonalIndicator disease={disease} />

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button className="btn-primary" onClick={handleDetect}
                  disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                  {loading ? 'Detecting...' : 'Detect Outbreak'}
                  {!loading && <ChevronRight size={15} />}
                </button>
                <button className="btn-secondary" onClick={() => { setCases(''); setResult(null); setError(null); }}>
                  <RotateCcw size={14} />
                </button>
              </div>

              {error && <div style={{ marginTop: '12px' }}><ErrorMessage message={error} /></div>}
            </div>

            {/* What-If Slider */}
            {result?.baseline && <WhatIfSlider baseline={result.baseline} />}
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {loading && <LoadingSpinner message="Analyzing outbreak data..." />}

            {!loading && !result && (
              <div className="glass-card-static" style={{
                padding: '40px', textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', minHeight: '300px',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                }}>
                  <AlertTriangle size={24} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
                  No Detection Yet
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  Select a disease, enter cases, and click Detect Outbreak
                </div>
              </div>
            )}

            {!loading && result && (
              <div className="animate-fade-in-up">

                {/* Severity Meter + Alert */}
                <div className="glass-card-static" style={{ padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
                  <SeverityMeter score={Math.min(severityScore, 100)} alertLevel={result.alert_level} />
                  <div style={{ marginTop: '8px' }}>
                    <AlertBadge type="alert" value={result.alert_level}
                      pulse={result.alert_level === 'Outbreak'} size="lg" />
                  </div>
                  {result.is_outbreak && (
                    <div style={{
                      marginTop: '10px', padding: '6px 14px', borderRadius: '20px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      fontSize: '12px', color: '#ef4444', fontWeight: 600, display: 'inline-block',
                    }}>
                      🚨 OUTBREAK CONFIRMED
                    </div>
                  )}
                  {/* Export buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
                    <button onClick={handleCopyReport} className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}>
                      <Copy size={12} /> Copy Report
                    </button>
                    <button onClick={() => window.print()} className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}>
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <StatPill label="Z-Score"      value={result.z_score}           color="#ef4444" />
                  <StatPill label="Anomaly"       value={result.anomaly_score}      color="#f59e0b" />
                  <StatPill label="Spike Ratio"   value={`${result.spike_ratio}x`} color="#8b5cf6" />
                  <StatPill label="Growth Rate"   value={`${result.growth_rate_pct}%`} color={result.growth_rate_pct > 0 ? '#ef4444' : '#10b981'} />
                </div>

                {/* Baseline vs Current */}
                {result.baseline && (
                  <div style={{ marginBottom: '16px' }}>
                    <BaselineBar reported={result.reported_cases} baseline={result.baseline} />
                  </div>
                )}

                {/* Trend + Days since */}
                <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Trend Direction</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {result.trend_direction === 'increasing'
                          ? <TrendingUp size={20} color="#ef4444" />
                          : result.trend_direction === 'decreasing'
                          ? <TrendingDown size={20} color="#10b981" />
                          : <Minus size={20} color="#9ca3af" />}
                        <span style={{
                          fontSize: '13px', fontWeight: 700,
                          color: result.trend_direction === 'increasing' ? '#ef4444'
                            : result.trend_direction === 'decreasing' ? '#10b981' : '#9ca3af',
                          textTransform: 'capitalize',
                        }}>
                          {result.trend_direction}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Days Since Last Outbreak</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>
                        {result.days_since_last_outbreak ?? 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7-Day Trend Analysis */}
                {result.recent_7_days && (
                  <div style={{ marginBottom: '16px' }}>
                    <TrendAnalysis recentDays={result.recent_7_days} />
                  </div>
                )}

                {/* Baseline stats */}
                {result.baseline && (
                  <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                      Baseline Statistics
                    </div>
                    {[
                      { label: 'Historical Mean',      value: result.baseline.mean?.toFixed(2) },
                      { label: 'Std Deviation',         value: result.baseline.std?.toFixed(2) },
                      { label: 'Watch Threshold',       value: result.baseline.watch?.toFixed(2),     color: '#f59e0b' },
                      { label: 'Outbreak Threshold',    value: result.baseline.threshold?.toFixed(2), color: '#ef4444' },
                    ].map((s, i) => (
                      <div key={i} className="stat-row">
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{s.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: s.color || '#f9fafb' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Actions */}
                <ActionsList actions={result.recommended_actions} />

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FORECAST & HISTORY TAB ── */}
      {activeTab === 'forecast' && (
        <div>
          {/* Disease selector strip */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {DISEASES.map(d => (
              <button key={d.name} onClick={() => setDisease(d.name)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  background: disease === d.name ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                  color: disease === d.name ? '#f59e0b' : '#6b7280',
                  fontSize: '12px', fontWeight: disease === d.name ? 700 : 500,
                  transition: 'all 0.2s ease',
                }}>
                {d.icon} {d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Forecast */}
            <div className="glass-card-static" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={16} color="#3b82f6" />
                <div className="section-header" style={{ margin: 0 }}>
                  Prophet Forecast — {disease}
                </div>
              </div>
              <ForecastChart disease={disease} />
            </div>

            {/* History */}
            <div className="glass-card-static" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BarChart2 size={16} color="#f59e0b" />
                <div className="section-header" style={{ margin: 0 }}>
                  Historical Cases — {disease}
                </div>
              </div>
              <HistoryChart disease={disease} />
            </div>
          </div>
        </div>
      )}

      {/* ── MODEL INFO TAB ── */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Model metrics */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>Model Performance</div>
            {[
              { label: 'Algorithm',       value: 'Prophet + Isolation Forest' },
              { label: 'Prophet MAE',     value: '2.20'    },
              { label: 'Detection Rate',  value: '100%'    },
              { label: 'Iso Forest F1',   value: '0.39'    },
              { label: 'Training Period', value: '2009–2018' },
              { label: 'Records',         value: '36,500'  },
              { label: 'Diseases',        value: '10'      },
              { label: 'Forecast Horizon',value: 'Up to 30 days' },
            ].map((s, i) => (
              <div key={i} className="stat-row">
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Diseases + How it works */}
          <div>
            <div className="glass-card-static" style={{ padding: '24px', marginBottom: '16px' }}>
              <div className="section-header" style={{ marginBottom: '16px' }}>Diseases Covered</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {DISEASES.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ fontSize: '16px' }}>{d.icon}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card-static" style={{ padding: '24px' }}>
              <div className="section-header" style={{ marginBottom: '12px' }}>How It Works</div>
              {[
                { title: 'Prophet', desc: 'Facebook Prophet forecasts future case counts using historical trends, seasonality, and holidays.' },
                { title: 'Isolation Forest', desc: 'Detects anomalies by isolating observations. Cases far from the cluster are flagged as potential outbreaks.' },
                { title: 'Z-Score', desc: 'Measures how many standard deviations the reported cases are above the historical mean.' },
                { title: 'Alert Levels', desc: 'Normal = within 1.5σ. Watch = 1.5–2.5σ. Outbreak = above 2.5σ.' },
              ].map((h, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f9fafb', marginBottom: '4px' }}>{h.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{h.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Outbreak;
