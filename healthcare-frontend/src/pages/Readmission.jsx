// Readmission.jsx - Patient Readmission Dashboard
import React, { useState, useEffect } from 'react';
import {
  Heart, User, Activity, AlertCircle,
  CheckCircle, ChevronRight, RotateCcw,
  Users, Upload, TrendingUp, Info,
  Printer, Copy, Clock, ChevronDown,
  Zap, BookOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { predictReadmission, predictReadmissionBatch } from '../api';
import AlertBadge from '../components/AlertBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import {
  PATIENT_FIELDS, DISCHARGE_TYPES,
  DEFAULT_PATIENT_FORM, RISK_COLORS,
  POPULATION_AVG_READMISSION
} from '../constants';

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const GENDERS = ['Male', 'Female', 'Other'];
const ADMISSION_TYPES = ['Emergency', 'Planned', 'Transfer', 'Day Case'];
const WARDS = ['ER', 'ICU', 'General Ward', 'Surgical Ward', 'Cardiac Ward'];
const SMOKING_STATUS = ['Never Smoked', 'Former Smoker', 'Current Smoker'];
const INSURANCE_TYPES = ['Private Insurance', 'Government', 'Uninsured', 'Other'];

const PRIMARY_DIAGNOSES = [
  'Diabetes Mellitus', 'Heart Failure', 'COPD', 'Pneumonia',
  'Sepsis', 'Acute MI', 'Stroke', 'Renal Failure',
  'Hypertension', 'Liver Disease', 'Cancer', 'Hip Fracture',
  'Asthma', 'Atrial Fibrillation', 'Deep Vein Thrombosis',
  'Pulmonary Embolism', 'Gastrointestinal Bleed', 'Cellulitis',
  'Urinary Tract Infection', 'Dementia', 'Malnutrition',
  'Alcohol Related', 'Depression', 'Anxiety', 'Other',
];

const PRESETS = [
  {
    label: 'Healthy Young',
    color: '#10b981',
    icon:  '💚',
    desc:  'Young patient, short stay, no comorbidities',
    values: {
      age: 28, length_of_stay_days: 2, num_diagnoses: 1,
      num_medications: 2, prev_admissions: 0,
      glucose_level: 95, bmi: 23, has_diabetes: '0', discharge_type: '0',
    },
  },
  {
    label: 'Diabetic Elderly',
    color: '#f59e0b',
    icon:  '🟡',
    desc:  'Elderly diabetic with multiple conditions',
    values: {
      age: 72, length_of_stay_days: 12, num_diagnoses: 7,
      num_medications: 12, prev_admissions: 4,
      glucose_level: 280, bmi: 31, has_diabetes: '1', discharge_type: '0',
    },
  },
  {
    label: 'Heart Failure',
    color: '#ef4444',
    icon:  '❤️',
    desc:  'Cardiac patient with high readmission risk',
    values: {
      age: 68, length_of_stay_days: 18, num_diagnoses: 9,
      num_medications: 14, prev_admissions: 6,
      glucose_level: 145, bmi: 28, has_diabetes: '1', discharge_type: '1',
    },
  },
  {
    label: 'Post Surgery',
    color: '#3b82f6',
    icon:  '🔵',
    desc:  'Elective surgery with planned discharge',
    values: {
      age: 45, length_of_stay_days: 5, num_diagnoses: 3,
      num_medications: 6, prev_admissions: 1,
      glucose_level: 110, bmi: 26, has_diabetes: '0', discharge_type: '0',
    },
  },
  {
    label: 'Chronic Illness',
    color: '#8b5cf6',
    icon:  '🟣',
    desc:  'Complex chronic conditions, frequent admitter',
    values: {
      age: 61, length_of_stay_days: 22, num_diagnoses: 12,
      num_medications: 18, prev_admissions: 9,
      glucose_level: 190, bmi: 34, has_diabetes: '1', discharge_type: '2',
    },
  },
  {
    label: 'Sepsis Patient',
    color: '#dc2626',
    icon:  '🔴',
    desc:  'Critical sepsis with ICU stay',
    values: {
      age: 55, length_of_stay_days: 30, num_diagnoses: 8,
      num_medications: 16, prev_admissions: 3,
      glucose_level: 220, bmi: 24, has_diabetes: '0', discharge_type: '1',
    },
  },
];

const FIELD_TOOLTIPS = {
  age:                 'Patient age in years. Older patients have higher readmission risk.',
  length_of_stay_days: 'Number of days admitted. Longer stays indicate more severe illness.',
  num_diagnoses:       'Total number of diagnoses. More diagnoses indicate complexity.',
  num_medications:     'Number of medications prescribed. High count indicates complexity.',
  prev_admissions:     'Number of previous hospital admissions. Strongest predictor of readmission.',
  glucose_level:       'Blood glucose in mg/dL. High levels indicate poor diabetic control.',
  bmi:                 'Body mass index. Obesity increases readmission risk.',
  has_diabetes:        'Whether patient has diabetes diagnosis.',
  discharge_type:      'How patient was discharged. AMA increases readmission risk.',
};

const FIELD_RANGES = {
  age:                 { min: 18,  max: 120, normal: [18, 65],  unit: 'years' },
  length_of_stay_days: { min: 1,   max: 60,  normal: [1, 7],    unit: 'days'  },
  num_diagnoses:       { min: 1,   max: 20,  normal: [1, 5],    unit: ''      },
  num_medications:     { min: 1,   max: 30,  normal: [1, 8],    unit: ''      },
  prev_admissions:     { min: 0,   max: 20,  normal: [0, 2],    unit: ''      },
  glucose_level:       { min: 40,  max: 400, normal: [70, 140], unit: 'mg/dL' },
  bmi:                 { min: 10,  max: 60,  normal: [18, 25],  unit: ''      },
};

// ─────────────────────────────────────────
// RISK METER
// ─────────────────────────────────────────

function RiskMeter({ percentage, level }) {
  const color = RISK_COLORS[level]?.bg || '#6b7280';
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference * 0.75;
  const offset = circumference * 0.125;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="160" viewBox="0 0 200 160">
        <circle cx="100" cy="120" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round" />
        <circle cx="100" cy="120" r={radius} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 1s ease' }} />
        <text x="100" y="108" textAnchor="middle"
          fill="#f9fafb" fontSize="32" fontWeight="800" fontFamily="Inter, sans-serif">
          {percentage}%
        </text>
        <text x="100" y="130" textAnchor="middle"
          fill="#6b7280" fontSize="12" fontFamily="Inter, sans-serif">
          Readmission Risk
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────
// INPUT FIELD WITH TOOLTIP AND COLOR
// ─────────────────────────────────────────

function InputField({ field, value, onChange, error }) {
  const [showTip, setShowTip] = useState(false);
  const range = FIELD_RANGES[field.key];
  const numVal = parseFloat(value);
  const isAboveNormal = range && !isNaN(numVal) && numVal > range.normal[1];
  const isBelowNormal = range && !isNaN(numVal) && numVal < range.normal[0];
  const isAbnormal = isAboveNormal || isBelowNormal;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <label className="input-label" style={{ margin: 0 }}>
          {field.label}
          {field.unit && (
            <span style={{ color: '#4b5563', fontWeight: 400, marginLeft: '4px' }}>
              ({field.unit})
            </span>
          )}
        </label>
        {/* Tooltip icon */}
        <div style={{ position: 'relative', cursor: 'pointer' }}
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}>
          <Info size={12} color="#4b5563" />
          {showTip && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '0',
              background: '#1f2937', border: '1px solid #374151',
              borderRadius: '8px', padding: '8px 12px',
              fontSize: '11px', color: '#9ca3af', width: '180px',
              zIndex: 100, lineHeight: 1.5,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              {FIELD_TOOLTIPS[field.key]}
            </div>
          )}
        </div>
        {/* Abnormal indicator */}
        {value && isAbnormal && (
          <span style={{
            fontSize: '9px', fontWeight: 700,
            color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
            padding: '1px 6px', borderRadius: '10px',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            {isAboveNormal ? '↑ HIGH' : '↓ LOW'}
          </span>
        )}
        {value && !isAbnormal && range && (
          <span style={{
            fontSize: '9px', fontWeight: 700,
            color: '#10b981', background: 'rgba(16,185,129,0.1)',
            padding: '1px 6px', borderRadius: '10px',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            ✓ NORMAL
          </span>
        )}
      </div>
      <input
        type="number"
        className={`input-dark ${error ? 'input-error' : ''}`}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        min={field.min} max={field.max}
        style={{
          borderColor: error ? '#ef4444'
            : value && isAbnormal ? 'rgba(245,158,11,0.4)'
            : value && !isAbnormal && range ? 'rgba(16,185,129,0.3)'
            : undefined,
        }}
      />
      {error && (
        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
          {error}
        </div>
      )}
      {/* Normal range hint */}
      {range && (
        <div style={{ fontSize: '10px', color: '#374151', marginTop: '3px' }}>
          Normal: {range.normal[0]} – {range.normal[1]} {range.unit}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// PRESET SELECTOR
// ─────────────────────────────────────────

function PresetSelector({ onSelect }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-header" style={{ marginBottom: '10px' }}>
        <Zap size={12} style={{ display: 'inline', marginRight: '5px' }} />
        Quick Presets
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px',
      }}>
        {PRESETS.map((preset, i) => (
          <button key={i} onClick={() => onSelect(preset.values)}
            title={preset.desc}
            style={{
              padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
              background: `${preset.color}11`,
              border: `1px solid ${preset.color}33`,
              color: preset.color, fontSize: '11px', fontWeight: 600,
              transition: 'all 0.2s ease', textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${preset.color}22`;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${preset.color}11`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>{preset.icon} {preset.label}</div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', fontWeight: 400 }}>
              {preset.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────

function ResultCard({ result, context }) {
  const level = result.risk_level;
  const color = RISK_COLORS[level]?.bg || '#6b7280';

  const factorData = result.top_risk_factors?.map(f => ({
    name:  f.feature.replace(/_/g, ' '),
    value: Math.abs(f.importance),
  })) || [];

  const handleCopy = () => {
    const text = `
Healthcare ML Platform - Readmission Risk Report
=================================================
Risk Level:     ${result.risk_level}
Risk %:         ${result.risk_percentage}%
Confidence:     ${result.confidence}%
Population Avg: ${POPULATION_AVG_READMISSION}%
Comparison:     ${result.population_comparison?.comparison_label}

${context.diagnosis ? `Primary Diagnosis: ${context.diagnosis}` : ''}
${context.admissionType ? `Admission Type: ${context.admissionType}` : ''}
${context.ward ? `Ward: ${context.ward}` : ''}

Recommendations:
${result.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="animate-fade-in-up">

      {/* Risk Meter */}
      <div className="glass-card-static" style={{
        padding: '24px', marginBottom: '16px', textAlign: 'center'
      }}>
        {/* Context info */}
        {(context.diagnosis || context.admissionType) && (
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap',
            justifyContent: 'center', marginBottom: '16px',
          }}>
            {context.diagnosis && (
              <span style={{
                fontSize: '11px', color: '#9ca3af',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px 10px', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                📋 {context.diagnosis}
              </span>
            )}
            {context.admissionType && (
              <span style={{
                fontSize: '11px', color: '#9ca3af',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px 10px', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                🏥 {context.admissionType}
              </span>
            )}
            {context.ward && (
              <span style={{
                fontSize: '11px', color: '#9ca3af',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px 10px', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                🛏️ {context.ward}
              </span>
            )}
          </div>
        )}

        <RiskMeter percentage={result.risk_percentage} level={level} />
        <div style={{ marginTop: '8px' }}>
          <AlertBadge type="risk" value={level} pulse={level === 'High'} size="lg" />
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
          Confidence: <span style={{ color: '#f9fafb', fontWeight: 600 }}>
            {result.confidence}%
          </span>
        </div>

        {/* Export buttons */}
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px'
        }}>
          <button onClick={handleCopy} className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}>
            <Copy size={12} /> Copy Report
          </button>
          <button onClick={() => window.print()} className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}>
            <Printer size={12} /> Print
          </button>
        </div>
      </div>

      {/* Population Comparison */}
      <div className="glass-card-static" style={{
        padding: '16px', marginBottom: '16px'
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Population Comparison
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>This Patient</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color }}>{result.risk_percentage}%</span>
        </div>
        {/* Progress bar - patient */}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '10px' }}>
          <div style={{ width: `${result.risk_percentage}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Population Average</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af' }}>{POPULATION_AVG_READMISSION}%</span>
        </div>
        {/* Progress bar - population */}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '10px' }}>
          <div style={{ width: `${POPULATION_AVG_READMISSION}%`, height: '100%', background: '#6b7280', borderRadius: '3px' }} />
        </div>
        <div style={{
          padding: '8px 12px', borderRadius: '8px',
          background: `${color}18`, border: `1px solid ${color}33`,
          fontSize: '12px', color, fontWeight: 600,
        }}>
          {result.population_comparison?.comparison_label}
          {' '}({result.population_comparison?.difference > 0 ? '+' : ''}
          {result.population_comparison?.difference}%)
        </div>
      </div>

      {/* Top Risk Factors */}
      {factorData.length > 0 && (
        <div className="glass-card-static" style={{
          padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Top Risk Factors
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={factorData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={130}
                tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{
                background: '#111827', border: '1px solid #1f2937',
                borderRadius: '8px', fontSize: '12px'
              }} />
              <Bar dataKey="value" radius={4}>
                {factorData.map((_, i) => (
                  <Cell key={i} fill={color} fillOpacity={1 - i * 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Special Flags */}
      {result.special_flags?.length > 0 && (
        <div className="glass-card-static" style={{
          padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            ⚠️ Clinical Flags
          </div>
          {result.special_flags.map((flag, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '6px 0',
              borderBottom: i < result.special_flags.length - 1
                ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <AlertCircle size={13} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div className="glass-card-static" style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Clinical Recommendations
        </div>
        {result.recommendations?.map((rec, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            padding: '8px 0',
            borderBottom: i < result.recommendations.length - 1
              ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckCircle size={12} color="#10b981" />
            </div>
            <span style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>{rec}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────
// SESSION HISTORY
// ─────────────────────────────────────────

function SessionHistory({ history, onRestore }) {
  if (history.length === 0) return null;
  return (
    <div className="glass-card-static" style={{ padding: '16px', marginBottom: '20px' }}>
      <div className="section-header" style={{ marginBottom: '10px' }}>
        <Clock size={12} style={{ display: 'inline', marginRight: '5px' }} />
        Recent Predictions ({history.length})
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {history.map((h, i) => {
          const color = RISK_COLORS[h.level]?.bg || '#6b7280';
          return (
            <button key={i} onClick={() => onRestore(h)}
              style={{
                padding: '6px 12px', borderRadius: '8px',
                background: `${color}15`, border: `1px solid ${color}33`,
                color, fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {h.level} • {h.risk}% • {h.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BATCH RESULTS
// ─────────────────────────────────────────

function BatchResults({ result }) {
  const summary = result.summary;
  return (
    <div className="animate-fade-in-up">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: '12px', marginBottom: '16px',
      }}>
        {[
          { label: 'High Risk',   value: summary.risk_distribution?.High   || 0, color: '#ef4444' },
          { label: 'Medium Risk', value: summary.risk_distribution?.Medium || 0, color: '#f59e0b' },
          { label: 'Low Risk',    value: summary.risk_distribution?.Low    || 0, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="glass-card-static" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="glass-card-static" style={{ padding: '16px', marginBottom: '16px' }}>
        {[
          { label: 'Total Patients',        value: summary.total_patients },
          { label: 'Successfully Processed',value: summary.successful },
          { label: 'Average Risk',          value: `${summary.average_risk}%` },
          { label: 'Requires Attention',    value: summary.requires_attention },
          { label: 'Failed',                value: summary.failed },
        ].map((s, i) => (
          <div key={i} className="stat-row">
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>{s.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div className="glass-card-static" style={{ padding: '16px', overflowX: 'auto' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Individual Results
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Risk %', 'Level', 'Confidence', 'Flags'].map((h, i) => (
                <th key={i} style={{
                  textAlign: 'left', padding: '8px',
                  fontSize: '11px', color: '#4b5563',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.predictions?.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {p.patient_index + 1}
                </td>
                <td style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: RISK_COLORS[p.risk_level]?.bg }}>
                  {p.risk_percentage}%
                </td>
                <td style={{ padding: '8px' }}>
                  <AlertBadge type="risk" value={p.risk_level} size="sm" />
                </td>
                <td style={{ padding: '8px', fontSize: '12px', color: '#9ca3af' }}>
                  {p.confidence}%
                </td>
                <td style={{ padding: '8px', fontSize: '11px', color: '#6b7280' }}>
                  {p.special_flags?.length || 0} flags
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN READMISSION PAGE
// ─────────────────────────────────────────

function Readmission() {
  const [activeTab,    setActiveTab]    = useState('single');
  const [form,         setForm]         = useState(DEFAULT_PATIENT_FORM);
  const [context,      setContext]      = useState({
    gender: 'Male', admissionType: 'Emergency',
    diagnosis: '', ward: '', smoking: 'Never Smoked', insurance: 'Private Insurance',
  });
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null);
  const [history,      setHistory]      = useState([]);
  const [batchInput,   setBatchInput]   = useState('');
  const [batchResult,  setBatchResult]  = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError,   setBatchError]   = useState(null);
  const [showContext,  setShowContext]   = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handlePreset = (values) => {
    setForm(prev => ({ ...prev, ...values }));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictReadmission(form);
      setResult(data.data);
      // Add to session history
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        level: data.data.risk_level,
        risk:  data.data.risk_percentage,
        time:  timeStr,
        form:  { ...form },
        result: data.data,
      }, ...prev].slice(0, 5));
    } catch (err) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_PATIENT_FORM);
    setErrors({});
    setResult(null);
    setError(null);
  };

  const handleRestore = (h) => {
    setForm(h.form);
    setResult(h.result);
  };

  const handleBatchSubmit = async () => {
    setBatchLoading(true);
    setBatchError(null);
    setBatchResult(null);
    try {
      let patients;
      try {
        patients = JSON.parse(batchInput);
        if (!Array.isArray(patients)) patients = [patients];
      } catch {
        setBatchError('Invalid JSON format. Please enter a valid JSON array.');
        setBatchLoading(false);
        return;
      }
      const data = await predictReadmissionBatch(patients);
      setBatchResult(data.data);
    } catch (err) {
      setBatchError(err.message || 'Batch prediction failed');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={18} color="#ef4444" />
          </div>
          <h1 className="page-title">Patient Readmission</h1>
        </div>
        <p className="page-subtitle">
          Predict 30-day hospital readmission risk using patient vitals and history
        </p>
      </div>

      {/* Session History */}
      <SessionHistory history={history} onRestore={handleRestore} />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        background: 'rgba(17,24,39,0.8)', padding: '4px',
        borderRadius: '12px', width: 'fit-content',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { key: 'single', label: 'Single Patient', icon: User },
          { key: 'batch',  label: 'Batch Predict',  icon: Users },
          { key: 'info',   label: 'Model Info',     icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: active ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: active ? '#3b82f6' : '#6b7280',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SINGLE PATIENT TAB */}
      {activeTab === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Left - Form */}
          <div>
            {/* Presets */}
            <PresetSelector onSelect={handlePreset} />

            <div className="glass-card-static" style={{ padding: '24px' }}>

              {/* Clinical Context Toggle */}
              <button
                onClick={() => setShowContext(!showContext)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                  padding: '10px 14px', cursor: 'pointer', marginBottom: '16px',
                  color: '#9ca3af', fontSize: '12px', fontWeight: 600,
                }}
              >
                <span>📋 Clinical Context (Optional)</span>
                <ChevronDown size={14}
                  style={{ transform: showContext ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
              </button>

              {/* Context Fields */}
              {showContext && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '12px', marginBottom: '20px',
                  padding: '16px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {[
                    { key: 'gender',        label: 'Gender',         options: GENDERS },
                    { key: 'admissionType', label: 'Admission Type', options: ADMISSION_TYPES },
                    { key: 'ward',          label: 'Ward',           options: WARDS },
                    { key: 'smoking',       label: 'Smoking Status', options: SMOKING_STATUS },
                    { key: 'insurance',     label: 'Insurance',      options: INSURANCE_TYPES },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="input-label">{f.label}</label>
                      <select className="input-dark"
                        value={context[f.key]}
                        onChange={e => setContext(prev => ({ ...prev, [f.key]: e.target.value }))}
                      >
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="input-label">Primary Diagnosis</label>
                    <select className="input-dark"
                      value={context.diagnosis}
                      onChange={e => setContext(prev => ({ ...prev, diagnosis: e.target.value }))}
                    >
                      <option value="">Select Diagnosis</option>
                      {PRIMARY_DIAGNOSES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="section-header" style={{ marginBottom: '16px' }}>
                Prediction Fields
              </div>

              {/* Numeric fields */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '16px', marginBottom: '16px',
              }}>
                {PATIENT_FIELDS.map(field => (
                  <InputField
                    key={field.key}
                    field={field}
                    value={form[field.key]}
                    onChange={handleChange}
                    error={errors[field.key]}
                  />
                ))}
              </div>

              {/* Diabetes */}
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">Has Diabetes</label>
                <select className="input-dark" value={form.has_diabetes}
                  onChange={e => handleChange('has_diabetes', e.target.value)}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>

              {/* Discharge Type */}
              <div style={{ marginBottom: '24px' }}>
                <label className="input-label">Discharge Type</label>
                <select className="input-dark" value={form.discharge_type}
                  onChange={e => handleChange('discharge_type', e.target.value)}>
                  {DISCHARGE_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={handleSubmit}
                  disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Predicting...' : 'Predict Risk'}
                  {!loading && <ChevronRight size={15} />}
                </button>
                <button className="btn-secondary" onClick={handleReset}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>

              {error && (
                <div style={{ marginTop: '12px' }}>
                  <ErrorMessage message={error} onRetry={handleSubmit} />
                </div>
              )}
            </div>
          </div>

          {/* Right - Result */}
          <div>
            {loading && <LoadingSpinner message="Analyzing patient data..." />}
            {!loading && !result && (
              <div className="glass-card-static" style={{
                padding: '40px', textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '300px',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Activity size={24} color="#ef4444" />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
                  No Prediction Yet
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  Fill in patient details and click Predict Risk
                </div>
              </div>
            )}
            {!loading && result && <ResultCard result={result} context={context} />}
          </div>
        </div>
      )}

      {/* BATCH TAB */}
      {activeTab === 'batch' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: '8px' }}>
              Batch Input (JSON Array)
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '16px' }}>
              Paste a JSON array of patients. Each needs all 9 fields. Max 100 patients.
            </div>
            <textarea
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              placeholder={`[\n  {\n    "age": 75,\n    "length_of_stay_days": 20,\n    "num_diagnoses": 10,\n    "num_medications": 15,\n    "prev_admissions": 5,\n    "glucose_level": 250,\n    "bmi": 30,\n    "has_diabetes": 1,\n    "discharge_type": 2\n  }\n]`}
              style={{
                width: '100%', minHeight: '320px',
                background: 'rgba(10,15,30,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: '#f9fafb',
                padding: '14px', fontSize: '12px',
                fontFamily: 'monospace', resize: 'vertical',
                outline: 'none', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleBatchSubmit}
                disabled={batchLoading || !batchInput.trim()} style={{ flex: 1 }}>
                <Upload size={14} />
                {batchLoading ? 'Processing...' : 'Run Batch Prediction'}
              </button>
              <button className="btn-secondary"
                onClick={() => { setBatchInput(''); setBatchResult(null); }}>
                <RotateCcw size={14} />
              </button>
            </div>
            {batchError && (
              <div style={{ marginTop: '12px' }}>
                <ErrorMessage message={batchError} />
              </div>
            )}
          </div>
          <div>
            {batchLoading && <LoadingSpinner message="Processing patients..." />}
            {!batchLoading && !batchResult && (
              <div className="glass-card-static" style={{
                padding: '40px', textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', minHeight: '300px',
              }}>
                <TrendingUp size={24} color="#3b82f6" style={{ marginBottom: '16px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#9ca3af' }}>
                  No Batch Results Yet
                </div>
              </div>
            )}
            {!batchLoading && batchResult && <BatchResults result={batchResult} />}
          </div>
        </div>
      )}

      {/* MODEL INFO TAB */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>Model Performance</div>
            {[
              { label: 'Algorithm',  value: 'Logistic Regression' },
              { label: 'Accuracy',   value: '79.07%' },
              { label: 'AUC-ROC',    value: '0.8777' },
              { label: 'Precision',  value: '78.74%' },
              { label: 'Recall',     value: '79.62%' },
              { label: 'F1 Score',   value: '79.18%' },
              { label: 'PR AUC',     value: '0.8794' },
              { label: 'CV Mean',    value: '79.26%' },
              { label: 'CV Std',     value: '0.20%' },
              { label: 'Training',   value: '26,851 records' },
              { label: 'Features',   value: '9 features' },
              { label: 'Data Source',value: 'Kaggle' },
            ].map((s, i) => (
              <div key={i} className="stat-row">
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>Feature Importance</div>
            {[
              { feature: 'Previous Admissions', importance: 1.317, color: '#ef4444' },
              { feature: 'Length of Stay',      importance: 0.652, color: '#f59e0b' },
              { feature: 'Age',                 importance: 0.635, color: '#f59e0b' },
              { feature: 'Num Diagnoses',        importance: 0.510, color: '#3b82f6' },
              { feature: 'Discharge Type',       importance: 0.492, color: '#3b82f6' },
              { feature: 'Num Medications',      importance: 0.489, color: '#3b82f6' },
              { feature: 'Has Diabetes',         importance: 0.366, color: '#8b5cf6' },
              { feature: 'Glucose Level',        importance: 0.313, color: '#8b5cf6' },
              { feature: 'BMI',                  importance: 0.289, color: '#8b5cf6' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{f.feature}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: f.color }}>{f.importance}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                  <div style={{
                    width: `${(f.importance / 1.317) * 100}%`,
                    height: '100%', background: f.color, borderRadius: '2px',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default Readmission;