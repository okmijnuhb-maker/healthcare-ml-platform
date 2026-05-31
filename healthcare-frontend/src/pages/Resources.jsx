// Resources.jsx - Hospital Resource Optimization Dashboard
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Users, DollarSign, Bed,
  TrendingUp, TrendingDown, Minus,
  ChevronRight, RotateCcw, Clock,
  Copy, Printer, Download, BookOpen,
  RefreshCw, AlertCircle, CheckCircle,
  Activity, Zap, Calendar, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
  Legend
} from 'recharts';
import {
  forecastBeds,
  getResourcesOverview,
  getStaffing
} from '../api';
import AlertBadge from '../components/AlertBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const DEPARTMENTS = ['ER', 'ICU', 'General Ward'];

const DEPT_CONFIG = {
  'ER':           { color: '#ef4444', icon: '🚨', label: 'Emergency Room',       beds: 50  },
  'ICU':          { color: '#8b5cf6', icon: '💊', label: 'Intensive Care Unit',   beds: 30  },
  'General Ward': { color: '#3b82f6', icon: '🏥', label: 'General Ward',          beds: 100 },
};

const OCCUPANCY_COLORS = {
  LOW:      '#10b981',
  MODERATE: '#3b82f6',
  HIGH:     '#f59e0b',
  CRITICAL: '#ef4444',
};

const SHIFT_CONFIG = [
  { key: 'morning',   label: 'Morning',   time: '6am – 2pm',  color: '#f59e0b' },
  { key: 'afternoon', label: 'Afternoon', time: '2pm – 10pm', color: '#3b82f6' },
  { key: 'night',     label: 'Night',     time: '10pm – 6am', color: '#8b5cf6' },
];

const STAFF_RATIOS = {
  'ER':           { nurses: 3, doctors: 5, support: 8 },
  'ICU':          { nurses: 2, doctors: 3, support: 6 },
  'General Ward': { nurses: 6, doctors: 10, support: 12 },
};

const QUICK_DATES = [
  { label: 'Today',      days: 0  },
  { label: 'Tomorrow',   days: 1  },
  { label: 'Next Week',  days: 7  },
  { label: 'Next Month', days: 30 },
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const getOccupancyLevel = (rate) => {
  if (rate >= 90) return 'CRITICAL';
  if (rate >= 75) return 'HIGH';
  if (rate >= 50) return 'MODERATE';
  return 'LOW';
};

const formatCurrency = (val) =>
  val ? `$${Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$0';

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ─────────────────────────────────────────
// SECTION 2 — OCCUPANCY GAUGE (SVG circular)
// ─────────────────────────────────────────

function OccupancyGauge({ rate, department, totalBeds, occupiedBeds, availableBeds, alertLevel }) {
  const cfg   = DEPT_CONFIG[department] || {};
  const color = OCCUPANCY_COLORS[alertLevel] || '#6b7280';
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (Math.min(rate, 100) / 100) * circumference * 0.75;
  const offset = circumference * 0.125;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="160" height="120" viewBox="0 0 160 120">
        <circle cx="80" cy="100" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="10"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round" />
        <circle cx="80" cy="100" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeDashoffset={-offset} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x="80" y="90" textAnchor="middle"
          fill="#f9fafb" fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif">
          {Math.round(rate)}%
        </text>
        <text x="80" y="108" textAnchor="middle"
          fill="#6b7280" fontSize="10" fontFamily="Inter, sans-serif">
          Occupancy
        </text>
      </svg>
      {/* Beds row */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: color }}>{occupiedBeds}</div>
          <div style={{ fontSize: '9px', color: '#4b5563' }}>Occupied</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{availableBeds}</div>
          <div style={{ fontSize: '9px', color: '#4b5563' }}>Available</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#9ca3af' }}>{totalBeds}</div>
          <div style={{ fontSize: '9px', color: '#4b5563' }}>Total</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 1 — HOSPITAL OVERVIEW CARD (per dept)
// ─────────────────────────────────────────

function DeptOverviewCard({ department, data, onClick, isSelected }) {
  const cfg   = DEPT_CONFIG[department] || {};
  const color = cfg.color || '#6b7280';
  const level = data?.alert_level || 'LOW';
  const occ   = data?.occupancy_rate || 0;
  const occColor = OCCUPANCY_COLORS[level] || color;

  return (
    <div onClick={onClick}
      style={{
        background:   'rgba(17,24,39,0.8)',
        border:       `1px solid ${isSelected ? color + '55' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px', padding: '20px', cursor: 'pointer',
        transition:   'all 0.3s ease',
        boxShadow:    isSelected ? `0 0 20px ${color}22` : 'none',
      }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: `${color}22`, border: `1px solid ${color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{department}</div>
            <div style={{ fontSize: '10px', color: '#4b5563' }}>{cfg.label}</div>
          </div>
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: occColor,
          background: `${occColor}15`, padding: '3px 8px',
          borderRadius: '10px', border: `1px solid ${occColor}30`,
          animation: level === 'CRITICAL' ? 'pulse 2s infinite' : 'none',
        }}>
          {level}
        </div>
      </div>

      {/* Occupancy bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Occupancy</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: occColor }}>{Math.round(occ)}%</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
          <div style={{
            width: `${Math.min(occ, 100)}%`, height: '100%',
            background: occColor, borderRadius: '3px', transition: 'width 1s ease',
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '10px' }}>
        {[
          { label: 'Beds',      value: data?.total_beds || cfg.beds },
          { label: 'Occupied',  value: data?.occupied_beds || '-' },
          { label: 'Available', value: data?.available_beds || '-' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '6px', background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</div>
            <div style={{ fontSize: '9px', color: '#4b5563' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cost + Staffing */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>Daily Cost</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(data?.daily_cost)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>Staff</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>
            {data?.staffing
              ? (data.staffing.nurses || 0) + (data.staffing.doctors || 0) + (data.staffing.support_staff || 0)
              : '-'}
          </div>
        </div>
      </div>

      {/* Comparison */}
      {data?.comparison && (
        <div style={{
          marginTop: '10px', padding: '6px 10px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.02)', fontSize: '10px', color: '#6b7280',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {data.comparison.direction === 'above'
            ? <TrendingUp size={10} color="#ef4444" />
            : data.comparison.direction === 'below'
            ? <TrendingDown size={10} color="#10b981" />
            : <Minus size={10} color="#9ca3af" />}
          {data.comparison.label || 'At average'}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 6 — COST ANALYSIS CARDS
// ─────────────────────────────────────────

function CostCards({ costs, department }) {
  if (!costs) return null;
  const items = [
    { label: 'Daily Cost',          value: formatCurrency(costs.daily_cost),         color: '#3b82f6', icon: DollarSign },
    { label: 'Monthly Projection',  value: formatCurrency(costs.monthly_cost),        color: '#8b5cf6', icon: TrendingUp },
    { label: 'Cost Per Bed',        value: formatCurrency(costs.cost_per_bed),        color: '#f59e0b', icon: Bed       },
    { label: 'Saving vs Max',       value: formatCurrency(costs.cost_saving_vs_max),  color: '#10b981', icon: CheckCircle },
  ];

  const vsBenchmark = costs.vs_benchmark || 0;
  const benchmarkColor = vsBenchmark > 0 ? '#ef4444' : '#10b981';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '12px' }}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} style={{
              padding: '14px', borderRadius: '10px',
              background: `${item.color}11`, border: `1px solid ${item.color}22`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icon size={13} color={item.color} />
                <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: item.color }}>{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* Benchmark comparison */}
      <div style={{
        padding: '12px', borderRadius: '10px',
        background: `${benchmarkColor}11`, border: `1px solid ${benchmarkColor}22`,
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>vs Benchmark (Industry Avg)</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: benchmarkColor }}>
            {vsBenchmark > 0 ? '+' : ''}{formatCurrency(vsBenchmark)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
          Benchmark: {formatCurrency(costs.benchmark_daily)}
        </div>
      </div>

      {/* Cost recommendation */}
      {costs.cost_recommendation && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          fontSize: '12px', color: '#9ca3af', lineHeight: 1.5,
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <Info size={13} color="#3b82f6" style={{ flexShrink: 0, marginTop: '1px' }} />
          {costs.cost_recommendation}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 5 — STAFFING TABLE
// ─────────────────────────────────────────

function StaffingTable({ staffing, shifts, department, occupancyRate }) {
  if (!staffing || !shifts) return null;

  const cfg = DEPT_CONFIG[department] || {};
  const ratios = STAFF_RATIOS[department] || {};
  const occupied = Math.round((cfg.beds || 50) * (occupancyRate || 50) / 100);

  const isUnderstaffed = (count, ratio) => ratio && occupied > 0 && count < Math.ceil(occupied / ratio);

  const rows = [
    {
      role:    'Nurses',
      icon:    '👩‍⚕️',
      total:   staffing.nurses || 0,
      morning: shifts.morning?.nurses || 0,
      afternoon: shifts.afternoon?.nurses || 0,
      night:   shifts.night?.nurses || 0,
      ratio:   ratios.nurses,
    },
    {
      role:    'Doctors',
      icon:    '👨‍⚕️',
      total:   staffing.doctors || 0,
      morning: shifts.morning?.doctors || 0,
      afternoon: shifts.afternoon?.doctors || 0,
      night:   shifts.night?.doctors || 0,
      ratio:   ratios.doctors,
    },
    {
      role:    'Support',
      icon:    '🧹',
      total:   staffing.support_staff || 0,
      morning: shifts.morning?.support || 0,
      afternoon: shifts.afternoon?.support || 0,
      night:   shifts.night?.support || 0,
      ratio:   ratios.support,
    },
  ];

  const totalStaff = rows.reduce((a, r) => a + r.total, 0);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            {['Role', 'Morning\n6am–2pm', 'Afternoon\n2pm–10pm', 'Night\n10pm–6am', 'Total'].map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 ? 'left' : 'center',
                padding: '10px 12px',
                fontSize: '10px', color: '#4b5563',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                background: 'rgba(255,255,255,0.02)',
                whiteSpace: 'pre-line', lineHeight: 1.3,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const under = isUnderstaffed(row.total, row.ratio);
            return (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{row.icon}</span>
                    <span style={{ fontWeight: 600, color: '#9ca3af' }}>{row.role}</span>
                    {under && (
                      <span style={{
                        fontSize: '9px', color: '#ef4444',
                        background: 'rgba(239,68,68,0.1)', padding: '1px 5px',
                        borderRadius: '4px', fontWeight: 700,
                      }}>
                        LOW
                      </span>
                    )}
                  </div>
                </td>
                {[row.morning, row.afternoon, row.night].map((val, j) => (
                  <td key={j} style={{
                    padding: '10px 12px', textAlign: 'center',
                    fontWeight: 700,
                    color: SHIFT_CONFIG[j].color,
                  }}>
                    {val}
                  </td>
                ))}
                <td style={{
                  padding: '10px 12px', textAlign: 'center',
                  fontWeight: 800, color: under ? '#ef4444' : '#f9fafb',
                  fontSize: '14px',
                }}>
                  {row.total}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#f9fafb', fontSize: '12px' }}>
              👥 Total Staff
            </td>
            {['morning','afternoon','night'].map((shift, j) => (
              <td key={j} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#f9fafb' }}>
                {rows.reduce((a, r) => a + (r[shift] || 0), 0)}
              </td>
            ))}
            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#3b82f6', fontSize: '15px' }}>
              {totalStaff}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Staffing ratio info */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '10px', color: '#4b5563' }}>Patient ratios:</div>
        {Object.entries(ratios).map(([role, ratio]) => (
          <span key={role} style={{
            fontSize: '10px', color: '#6b7280',
            background: 'rgba(255,255,255,0.03)',
            padding: '2px 8px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            1 {role.replace('_',' ')} : {ratio} pts
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 8 — SHIFT PLANNING TIMELINE
// ─────────────────────────────────────────

function ShiftTimeline({ shifts, department }) {
  if (!shifts) return null;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
        {SHIFT_CONFIG.map((shift, i) => {
          const data = shifts[shift.key] || {};
          const total = (data.nurses || 0) + (data.doctors || 0) + (data.support || 0);
          const cost  = data.cost || 0;

          return (
            <div key={i} style={{
              padding: '14px', borderRadius: '10px',
              background: `${shift.color}11`, border: `1px solid ${shift.color}22`,
            }}>
              {/* Shift header */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: shift.color }}>{shift.label}</div>
                <div style={{ fontSize: '10px', color: '#4b5563' }}>{shift.time}</div>
              </div>

              {/* Staff counts */}
              {[
                { label: 'Nurses',  value: data.nurses  || 0, icon: '👩‍⚕️' },
                { label: 'Doctors', value: data.doctors || 0, icon: '👨‍⚕️' },
                { label: 'Support', value: data.support || 0, icon: '🧹'   },
              ].map((s, j) => (
                <div key={j} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '4px 0',
                  borderBottom: j < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{s.icon} {s.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</span>
                </div>
              ))}

              {/* Total + Cost */}
              <div style={{
                marginTop: '10px', paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#4b5563' }}>Total Staff</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: shift.color }}>{total}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#4b5563' }}>Shift Cost</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(cost)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 9 — WHAT-IF SCENARIO SLIDER
// ─────────────────────────────────────────

function WhatIfSlider({ department, forecastResult }) {
  const [occ, setOcc] = useState(
    Math.round(forecastResult?.occupancy?.predicted_rate || 70)
  );

  const cfg    = DEPT_CONFIG[department] || {};
  const beds   = cfg.beds || 50;
  const occupied = Math.round(beds * occ / 100);
  const available = beds - occupied;
  const level  = getOccupancyLevel(occ);
  const color  = OCCUPANCY_COLORS[level] || '#6b7280';

  // Estimate staffing from ratios
  const ratios = STAFF_RATIOS[department] || {};
  const nurses  = Math.ceil(occupied / (ratios.nurses  || 4));
  const doctors = Math.ceil(occupied / (ratios.doctors || 7));
  const support = Math.ceil(occupied / (ratios.support || 10));
  const totalStaff = nurses + doctors + support;
  const estCost = totalStaff * 350;

  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
        <Zap size={11} style={{ display: 'inline', marginRight: '4px' }} />
        What-If Occupancy Scenario
      </div>

      {/* Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>Occupancy:</span>
        <input type="range" min="10" max="100" value={occ}
          onChange={e => setOcc(Number(e.target.value))}
          style={{ flex: 1, accentColor: color }} />
        <span style={{
          fontSize: '16px', fontWeight: 800, color,
          minWidth: '48px', textAlign: 'right',
        }}>{occ}%</span>
      </div>

      {/* Results grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Occupied Beds',  value: occupied,   color: color     },
          { label: 'Available Beds', value: available,  color: '#10b981' },
          { label: 'Est. Staff',     value: totalStaff, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '10px', borderRadius: '8px', textAlign: 'center',
            background: `${s.color}11`, border: `1px solid ${s.color}22`,
          }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert + Cost */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{
          flex: 1, padding: '8px 12px', borderRadius: '8px',
          background: `${color}15`, border: `1px solid ${color}30`,
          fontSize: '12px', fontWeight: 700, color, textAlign: 'center',
        }}>
          {level} Alert
        </div>
        <div style={{
          flex: 1, padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          fontSize: '12px', fontWeight: 700, color: '#10b981', textAlign: 'center',
        }}>
          ~{formatCurrency(estCost)}/day
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 7 — DEPARTMENT COMPARISON CHARTS
// ─────────────────────────────────────────

function DepartmentComparison({ overview }) {
  if (!overview) return null;

  const occupancyData = DEPARTMENTS.map(dept => ({
    dept: dept === 'General Ward' ? 'Gen. Ward' : dept,
    rate: Math.round(overview[dept]?.occupancy_rate || 0),
    color: DEPT_CONFIG[dept]?.color || '#6b7280',
  }));

  const costData = DEPARTMENTS.map(dept => ({
    dept: dept === 'General Ward' ? 'Gen. Ward' : dept,
    cost: Math.round((overview[dept]?.daily_cost || 0) / 1000),
    color: DEPT_CONFIG[dept]?.color || '#6b7280',
  }));

  const staffData = DEPARTMENTS.map(dept => {
    const s = overview[dept]?.staffing || {};
    return {
      dept: dept === 'General Ward' ? 'Gen. Ward' : dept,
      nurses:  s.nurses  || 0,
      doctors: s.doctors || 0,
      support: s.support_staff || 0,
    };
  });

  const CustomBar = ({ x, y, width, height, color }) => (
    <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* Occupancy chart */}
      <div>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
          Occupancy Rate (%)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={occupancyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="dept" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
              formatter={v => [`${v}%`, 'Occupancy']} />
            <Bar dataKey="rate" radius={[4,4,0,0]}>
              {occupancyData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily cost chart */}
      <div>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
          Daily Cost ($K)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={costData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="dept" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
              formatter={v => [`$${v}K`, 'Daily Cost']} />
            <Bar dataKey="cost" radius={[4,4,0,0]}>
              {costData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Staffing chart */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
          Staffing Breakdown by Department
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={staffData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="dept" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
            <Bar dataKey="nurses"  name="Nurses"  fill="#ef4444" radius={[2,2,0,0]} />
            <Bar dataKey="doctors" name="Doctors" fill="#3b82f6" radius={[2,2,0,0]} />
            <Bar dataKey="support" name="Support" fill="#8b5cf6" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 10 — HOSPITAL STAFFING TOTALS
// ─────────────────────────────────────────

function HospitalTotals({ staffingData }) {
  if (!staffingData?.hospital_totals) return null;
  const t = staffingData.hospital_totals;

  const breakdown = [
    { label: 'Nurses',       value: t.total_nurses,  color: '#ef4444', pct: t.total_nurses  / t.total_staff * 100 },
    { label: 'Doctors',      value: t.total_doctors, color: '#3b82f6', pct: t.total_doctors / t.total_staff * 100 },
    { label: 'Support',      value: t.total_support, color: '#8b5cf6', pct: t.total_support / t.total_staff * 100 },
  ];

  return (
    <div>
      {/* Total stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Staff',    value: t.total_staff,          color: '#f9fafb' },
          { label: 'Total Nurses',   value: t.total_nurses,         color: '#ef4444' },
          { label: 'Total Doctors',  value: t.total_doctors,        color: '#3b82f6' },
          { label: 'Total Support',  value: t.total_support,        color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '12px', borderRadius: '10px', textAlign: 'center',
            background: `${s.color}11`, border: `1px solid ${s.color}22`,
          }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stacked breakdown bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Staff Composition</div>
        <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
          {breakdown.map((b, i) => (
            <div key={i} style={{
              width: `${b.pct}%`, background: b.color,
              transition: 'width 1s ease',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          {breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: b.color }} />
              <span style={{ fontSize: '10px', color: '#6b7280' }}>{b.label} ({Math.round(b.pct)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: '10px', color: '#4b5563', marginBottom: '4px' }}>Hospital Daily Cost</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{formatCurrency(t.total_daily_cost)}</div>
        </div>
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: '10px', color: '#4b5563', marginBottom: '4px' }}>Monthly Projection</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(t.total_monthly_cost)}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION 11 — SESSION HISTORY
// ─────────────────────────────────────────

function SessionHistory({ history, onRestore, onClear }) {
  if (history.length === 0) return null;
  return (
    <div className="glass-card-static" style={{ padding: '14px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
          Recent Forecasts ({history.length})
        </div>
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: '11px' }}>
          Clear
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {history.map((h, i) => {
          const cfg = DEPT_CONFIG[h.department] || {};
          const color = cfg.color || '#6b7280';
          const occLevel = getOccupancyLevel(h.occupancy);
          const occColor = OCCUPANCY_COLORS[occLevel] || '#6b7280';
          return (
            <button key={i} onClick={() => onRestore(h)}
              style={{
                padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                background: `${color}12`, border: `1px solid ${color}30`,
                color, fontSize: '11px', fontWeight: 600,
              }}>
              {cfg.icon} {h.department} • {Math.round(h.occupancy)}% • {h.date} • {h.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN RESOURCES PAGE
// ─────────────────────────────────────────

function Resources() {
  const [activeTab,       setActiveTab]       = useState('overview');
  const [selectedDept,    setSelectedDept]    = useState('ICU');
  const [forecastDate,    setForecastDate]    = useState(addDays(0));
  const [occOverride,     setOccOverride]     = useState('');
  const [forecastResult,  setForecastResult]  = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError,   setForecastError]   = useState(null);
  const [overview,        setOverview]        = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError,   setOverviewError]   = useState(null);
  const [staffingData,    setStaffingData]    = useState(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [countdown,       setCountdown]       = useState(60);
  const [lastUpdated,     setLastUpdated]     = useState(null);
  const [history,         setHistory]         = useState([]);
  const countdownRef = useRef(null);

  // ── LOAD OVERVIEW ──
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getResourcesOverview();
      setOverview(data.data?.departments || null);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCountdown(60);
    } catch (err) {
      setOverviewError(err.message || 'Overview failed');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // ── LOAD STAFFING TOTALS ──
  const loadStaffing = useCallback(async () => {
    setStaffingLoading(true);
    try {
      const data = await getStaffing();
      setStaffingData(data.data);
    } catch {} finally {
      setStaffingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadStaffing();
    // Auto-refresh countdown
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { loadOverview(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [loadOverview, loadStaffing]);

  // ── FORECAST ──
  const handleForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    setForecastResult(null);
    try {
      const data = await forecastBeds(
        selectedDept, forecastDate,
        occOverride ? parseFloat(occOverride) : null
      );
      setForecastResult(data.data);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        department: selectedDept,
        occupancy: data.data?.occupancy?.predicted_rate || 0,
        date: forecastDate, time: timeStr,
        result: data.data,
      }, ...prev].slice(0, 5));
    } catch (err) {
      setForecastError(err.message || 'Forecast failed');
    } finally {
      setForecastLoading(false);
    }
  };

  const handleReset = () => {
    setForecastResult(null);
    setForecastError(null);
    setOccOverride('');
    setForecastDate(addDays(0));
  };

  const handleRestore = (h) => {
    setSelectedDept(h.department);
    setForecastDate(h.date);
    setForecastResult(h.result);
    setActiveTab('forecast');
  };

  const handleCopyStaffing = () => {
    if (!forecastResult) return;
    const { staffing, shifts, costs } = forecastResult;
    const text = `
Healthcare ML Platform - Staffing Report
=========================================
Department:    ${selectedDept}
Date:          ${forecastDate}
Occupancy:     ${forecastResult.occupancy?.predicted_rate}%
Alert Level:   ${forecastResult.occupancy?.alert_level}

STAFFING:
Nurses:        ${staffing?.nurses}
Doctors:       ${staffing?.doctors}
Support:       ${staffing?.support_staff}

SHIFTS:
Morning:       ${shifts?.morning?.nurses + shifts?.morning?.doctors + shifts?.morning?.support} staff
Afternoon:     ${shifts?.afternoon?.nurses + shifts?.afternoon?.doctors + shifts?.afternoon?.support} staff
Night:         ${shifts?.night?.nurses + shifts?.night?.doctors + shifts?.night?.support} staff

COSTS:
Daily Cost:    ${formatCurrency(costs?.daily_cost)}
Monthly:       ${formatCurrency(costs?.monthly_cost)}
Cost/Bed:      ${formatCurrency(costs?.cost_per_bed)}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  const handleDownloadStaffingCSV = () => {
    if (!forecastResult?.shifts) return;
    const rows = [
      ['Role', 'Morning', 'Afternoon', 'Night', 'Total'],
      ['Nurses',  forecastResult.shifts.morning?.nurses,  forecastResult.shifts.afternoon?.nurses,  forecastResult.shifts.night?.nurses,  forecastResult.staffing?.nurses ],
      ['Doctors', forecastResult.shifts.morning?.doctors, forecastResult.shifts.afternoon?.doctors, forecastResult.shifts.night?.doctors, forecastResult.staffing?.doctors],
      ['Support', forecastResult.shifts.morning?.support, forecastResult.shifts.afternoon?.support, forecastResult.shifts.night?.support, forecastResult.staffing?.support_staff],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${selectedDept}_staffing_${forecastDate}.csv`; a.click();
  };

  // ── TAB BUTTON ──
  const TabBtn = ({ tabKey, label, icon: Icon, accentColor }) => {
    const active = activeTab === tabKey;
    return (
      <button onClick={() => setActiveTab(tabKey)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          background: active ? `rgba(${accentColor},0.2)` : 'transparent',
          color: active ? `rgb(${accentColor})` : '#6b7280',
          fontSize: '13px', fontWeight: active ? 700 : 500,
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}>
        <Icon size={14} />
        {label}
      </button>
    );
  };

  return (
    <div className="page-container">
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes spin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={18} color="#8b5cf6" />
          </div>
          <h1 className="page-title">Hospital Resource Optimization</h1>
        </div>
        <p className="page-subtitle">
          Forecast bed occupancy, optimize staffing, and analyze costs for all departments
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
        <TabBtn tabKey="overview"  label="Hospital Overview"  icon={Activity}   accentColor="139,92,246" />
        <TabBtn tabKey="forecast"  label="Bed Forecast"       icon={TrendingUp} accentColor="59,130,246" />
        <TabBtn tabKey="info"      label="Model Info"         icon={BookOpen}   accentColor="16,185,129" />
      </div>

      {/* ══════════════════════════════════════════
          TAB 1 — HOSPITAL OVERVIEW
      ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>

          {/* SECTION 1 — Refresh bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading...'}
              {' '}<span style={{ color: '#374151' }}>· Auto-refresh in {countdown}s</span>
            </div>
            <button onClick={loadOverview} disabled={overviewLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#6b7280', fontSize: '12px',
              }}>
              <RefreshCw size={12} style={{ animation: overviewLoading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {overviewLoading && !overview && <LoadingSpinner message="Loading hospital overview..." />}
          {overviewError   && <ErrorMessage message={overviewError} onRetry={loadOverview} />}

          {/* SECTION 1 — Hospital status banner */}
          {overview && (() => {
            const criticalDepts = DEPARTMENTS.filter(d => {
              const level = overview[d]?.alert_level;
              return level === 'CRITICAL' || level === 'HIGH';
            });
            const isCritical = criticalDepts.length > 0;
            const bannerColor = isCritical ? '#ef4444' : '#10b981';
            return (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                background: `${bannerColor}12`, border: `1px solid ${bannerColor}30`,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                {isCritical
                  ? <AlertCircle size={16} color="#ef4444" />
                  : <CheckCircle size={16} color="#10b981" />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: bannerColor }}>
                  {isCritical
                    ? `Hospital Status: CRITICAL — ${criticalDepts.join(', ')} require attention`
                    : 'Hospital Status: NORMAL — All departments within acceptable range'}
                </span>
              </div>
            );
          })()}

          {/* SECTION 2 — 3 Department gauge cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
            {DEPARTMENTS.map(dept => (
              <div key={dept} className="glass-card-static" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{DEPT_CONFIG[dept].icon}</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb', marginTop: '4px' }}>{dept}</div>
                </div>
                <OccupancyGauge
                  rate={overview?.[dept]?.occupancy_rate || 0}
                  department={dept}
                  totalBeds={overview?.[dept]?.total_beds || DEPT_CONFIG[dept].beds}
                  occupiedBeds={overview?.[dept]?.occupied_beds || 0}
                  availableBeds={overview?.[dept]?.available_beds || 0}
                  alertLevel={overview?.[dept]?.alert_level || 'LOW'}
                />
                <div style={{ marginTop: '10px' }}>
                  <div style={{
                    display: 'inline-block', fontSize: '10px', fontWeight: 700,
                    color: OCCUPANCY_COLORS[overview?.[dept]?.alert_level || 'LOW'],
                    background: `${OCCUPANCY_COLORS[overview?.[dept]?.alert_level || 'LOW']}15`,
                    padding: '3px 10px', borderRadius: '10px',
                    border: `1px solid ${OCCUPANCY_COLORS[overview?.[dept]?.alert_level || 'LOW']}30`,
                  }}>
                    {overview?.[dept]?.alert_level || 'LOW'}
                  </div>
                </div>
                {overview?.[dept]?.comparison && (
                  <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    {overview[dept].comparison.direction === 'above' ? <TrendingUp size={10} color="#ef4444" /> : <TrendingDown size={10} color="#10b981" />}
                    {overview[dept].comparison.label}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* SECTION 1 — Dept overview cards (clickable, navigate to forecast) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
            {DEPARTMENTS.map(dept => (
              <DeptOverviewCard
                key={dept}
                department={dept}
                data={overview?.[dept]}
                isSelected={selectedDept === dept}
                onClick={() => { setSelectedDept(dept); setActiveTab('forecast'); }}
              />
            ))}
          </div>

          {/* SECTION 7 — Department Comparison Charts */}
          <div className="glass-card-static" style={{ padding: '20px', marginBottom: '20px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              Department Comparison
            </div>
            {overview
              ? <DepartmentComparison overview={overview} />
              : <div style={{ color: '#4b5563', fontSize: '13px' }}>Loading comparison data...</div>}
          </div>

          {/* SECTION 10 — Hospital Staffing Totals */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <Users size={13} style={{ display: 'inline', marginRight: '6px' }} />
              Hospital-Wide Staffing Totals
            </div>
            {staffingLoading && <LoadingSpinner size="sm" message="Loading staffing..." />}
            {!staffingLoading && staffingData && <HospitalTotals staffingData={staffingData} />}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 2 — BED FORECAST (deep dive)
      ══════════════════════════════════════════ */}
      {activeTab === 'forecast' && (
        <div>

          {/* SECTION 3 — Department tabs + form */}
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>

            {/* LEFT — Form */}
            <div>

              {/* Department selector */}
              <div className="glass-card-static" style={{ padding: '20px', marginBottom: '14px' }}>
                <div className="section-header" style={{ marginBottom: '12px' }}>Select Department</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DEPARTMENTS.map(dept => {
                    const cfg = DEPT_CONFIG[dept];
                    const isActive = selectedDept === dept;
                    return (
                      <button key={dept} onClick={() => { setSelectedDept(dept); setForecastResult(null); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: isActive ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                          borderLeft: `3px solid ${isActive ? cfg.color : 'transparent'}`,
                          transition: 'all 0.2s ease',
                        }}>
                        <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? cfg.color : '#9ca3af' }}>
                            {dept}
                          </div>
                          <div style={{ fontSize: '10px', color: '#4b5563' }}>
                            {cfg.label} · {cfg.beds} beds
                          </div>
                        </div>
                        {overview?.[dept] && (
                          <div style={{
                            marginLeft: 'auto', fontSize: '12px', fontWeight: 700,
                            color: OCCUPANCY_COLORS[overview[dept].alert_level || 'LOW'],
                          }}>
                            {Math.round(overview[dept].occupancy_rate || 0)}%
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3 — Date picker + quick dates */}
              <div className="glass-card-static" style={{ padding: '20px', marginBottom: '14px' }}>
                <div className="section-header" style={{ marginBottom: '12px' }}>Forecast Date</div>

                <input type="date" className="input-dark"
                  value={forecastDate}
                  onChange={e => setForecastDate(e.target.value)}
                  style={{ marginBottom: '10px' }} />

                {/* Quick date presets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {QUICK_DATES.map((qd, i) => (
                    <button key={i} onClick={() => setForecastDate(addDays(qd.days))}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: forecastDate === addDays(qd.days)
                          ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                        color: forecastDate === addDays(qd.days) ? '#3b82f6' : '#6b7280',
                        fontSize: '11px', fontWeight: 600,
                      }}>
                      {qd.label}
                    </button>
                  ))}
                </div>

                {/* Optional occupancy override */}
                <div style={{ marginTop: '14px' }}>
                  <label className="input-label">Occupancy Override (Optional)</label>
                  <input type="number" className="input-dark"
                    placeholder="Leave blank for model prediction"
                    value={occOverride}
                    onChange={e => setOccOverride(e.target.value)}
                    min="0" max="100" />
                  <div style={{ fontSize: '10px', color: '#374151', marginTop: '4px' }}>
                    Enter 0–100 to override the model's predicted occupancy rate
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button className="btn-primary" onClick={handleForecast}
                  disabled={forecastLoading}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
                  {forecastLoading ? 'Forecasting...' : 'Forecast Beds'}
                  {!forecastLoading && <ChevronRight size={15} />}
                </button>
                <button className="btn-secondary" onClick={handleReset}>
                  <RotateCcw size={14} />
                </button>
              </div>

              {forecastError && <div style={{ marginBottom: '14px' }}><ErrorMessage message={forecastError} onRetry={handleForecast} /></div>}

              {/* SECTION 9 — What-If Slider (always shown) */}
              <WhatIfSlider department={selectedDept} forecastResult={forecastResult} />

            </div>

            {/* RIGHT — Results */}
            <div>
              {forecastLoading && <LoadingSpinner message="Forecasting bed occupancy..." />}

              {!forecastLoading && !forecastResult && (
                <div className="glass-card-static" style={{
                  padding: '40px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', minHeight: '300px',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                  }}>
                    <Bed size={24} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
                    No Forecast Yet
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563' }}>
                    Select a department, pick a date, and click Forecast Beds
                  </div>
                </div>
              )}

              {!forecastLoading && forecastResult && (() => {
                const occ   = forecastResult.occupancy || {};
                const cfg   = DEPT_CONFIG[selectedDept] || {};
                const color = cfg.color || '#8b5cf6';
                const occColor = OCCUPANCY_COLORS[occ.alert_level] || color;

                return (
                  <div className="animate-fade-in-up">

                    {/* SECTION 4 — Forecast result + gauge */}
                    <div className="glass-card-static" style={{ padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
                      <div style={{ marginBottom: '10px', fontSize: '13px', color: '#6b7280' }}>
                        {selectedDept} · {forecastDate}
                      </div>
                      <OccupancyGauge
                        rate={occ.predicted_rate || 0}
                        department={selectedDept}
                        totalBeds={occ.total_beds || cfg.beds}
                        occupiedBeds={occ.occupied_beds || 0}
                        availableBeds={occ.available_beds || 0}
                        alertLevel={occ.alert_level || 'LOW'}
                      />
                      <div style={{ marginTop: '10px' }}>
                        <div style={{
                          display: 'inline-block', fontSize: '11px', fontWeight: 700,
                          color: occColor, background: `${occColor}15`,
                          padding: '4px 12px', borderRadius: '12px', border: `1px solid ${occColor}30`,
                        }}>
                          {occ.alert_level || 'LOW'} OCCUPANCY
                        </div>
                      </div>

                      {/* Comparison to average */}
                      {forecastResult.comparison && (
                        <div style={{
                          margin: '10px auto 0', maxWidth: '280px',
                          padding: '8px 12px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          fontSize: '11px', color: '#9ca3af',
                          display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                        }}>
                          {forecastResult.comparison.direction === 'above'
                            ? <TrendingUp size={12} color="#ef4444" />
                            : <TrendingDown size={12} color="#10b981" />}
                          {forecastResult.comparison.label}
                        </div>
                      )}

                      {/* Export buttons */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
                        <button onClick={handleCopyStaffing} className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Copy size={11} /> Copy Plan
                        </button>
                        <button onClick={handleDownloadStaffingCSV} className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Download size={11} /> CSV
                        </button>
                        <button onClick={() => window.print()} className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Printer size={11} /> Print
                        </button>
                      </div>
                    </div>

                    {/* SECTION 6 — Cost Analysis */}
                    <div className="glass-card-static" style={{ padding: '20px', marginBottom: '14px' }}>
                      <div className="section-header" style={{ marginBottom: '14px' }}>
                        <DollarSign size={13} style={{ display: 'inline', marginRight: '6px' }} />
                        Cost Analysis
                      </div>
                      <CostCards costs={forecastResult.costs} department={selectedDept} />
                    </div>

                    {/* SECTION 5 — Staffing Table */}
                    <div className="glass-card-static" style={{ padding: '20px', marginBottom: '14px' }}>
                      <div className="section-header" style={{ marginBottom: '14px' }}>
                        <Users size={13} style={{ display: 'inline', marginRight: '6px' }} />
                        Staffing Breakdown
                      </div>
                      <StaffingTable
                        staffing={forecastResult.staffing}
                        shifts={forecastResult.shifts}
                        department={selectedDept}
                        occupancyRate={occ.predicted_rate}
                      />
                    </div>

                    {/* SECTION 8 — Shift Planning Timeline */}
                    <div className="glass-card-static" style={{ padding: '20px' }}>
                      <div className="section-header" style={{ marginBottom: '14px' }}>
                        <Clock size={13} style={{ display: 'inline', marginRight: '6px' }} />
                        Shift Planning
                      </div>
                      <ShiftTimeline
                        shifts={forecastResult.shifts}
                        department={selectedDept}
                      />
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 3 — MODEL INFO
      ══════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* SECTION 12 — Model performance */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>Model Performance</div>
            {[
              { label: 'Algorithm',         value: 'Random Forest'   },
              { label: 'R² Score',          value: '0.9993'          },
              { label: 'MAE',               value: '0.17'            },
              { label: 'RMSE',              value: '0.21'            },
              { label: 'Training Records',  value: '~180,000'        },
              { label: 'Departments',       value: '3 (ER, ICU, GW)' },
              { label: 'Forecast Horizon',  value: 'Any future date' },
              { label: 'Features Used',     value: '12 features'     },
              { label: 'Models Trained',    value: '4 (3 dept + 1 global)' },
            ].map((s, i) => (
              <div key={i} className="stat-row">
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div>
            {/* Staffing ratios */}
            <div className="glass-card-static" style={{ padding: '24px', marginBottom: '14px' }}>
              <div className="section-header" style={{ marginBottom: '14px' }}>Staffing Ratio Rules</div>
              {DEPARTMENTS.map((dept, i) => {
                const cfg = DEPT_CONFIG[dept];
                const ratios = STAFF_RATIOS[dept];
                return (
                  <div key={i} style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '8px',
                    background: `${cfg.color}11`, border: `1px solid ${cfg.color}22`,
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, marginBottom: '6px' }}>
                      {cfg.icon} {dept}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#6b7280' }}>
                      <span>1 nurse : {ratios.nurses} pts</span>
                      <span>·</span>
                      <span>1 doctor : {ratios.doctors} pts</span>
                      <span>·</span>
                      <span>1 support : {ratios.support} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features + How it works */}
            <div className="glass-card-static" style={{ padding: '24px' }}>
              <div className="section-header" style={{ marginBottom: '12px' }}>How It Works</div>
              {[
                { title: 'Occupancy Prediction', desc: 'Random Forest models trained separately for ER, ICU, and General Ward. Uses date features, department stats, and lag patterns to predict occupancy rate.' },
                { title: 'Staffing Calculation', desc: 'Based on predicted occupancy × total beds = occupied beds. Then applies department-specific nurse/doctor/support ratios and distributes across 3 shifts.' },
                { title: 'Cost Calculation',     desc: 'Staff count × average salary rates. Compared against industry benchmark daily costs. Savings calculated vs 100% max occupancy scenario.' },
                { title: 'Alert Levels',         desc: 'LOW below 50% · MODERATE 50–75% · HIGH 75–90% · CRITICAL above 90%.' },
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

export default Resources;
