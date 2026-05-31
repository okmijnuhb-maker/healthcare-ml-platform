// StatCard.jsx - Reusable metric card
import React from 'react';

function StatCard({ icon: Icon, label, value, subtitle, color = '#3b82f6', trend = null }) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

        {/* Icon */}
        <div style={{
          width:          '42px',
          height:         '42px',
          borderRadius:   '10px',
          background:     `${color}22`,
          border:         `1px solid ${color}33`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          {Icon && <Icon size={20} color={color} />}
        </div>

        {/* Trend */}
        {trend !== null && (
          <span style={{
            fontSize:     '11px',
            fontWeight:   600,
            color:        trend >= 0 ? '#10b981' : '#ef4444',
            background:   trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding:      '3px 8px',
            borderRadius: '20px',
          }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}

      </div>

      {/* Value */}
      <div style={{
        fontSize:   '28px',
        fontWeight: 800,
        color:      '#f9fafb',
        marginTop:  '14px',
        lineHeight: 1,
        letterSpacing: '-0.5px',
      }}>
        {value}
      </div>

      {/* Label */}
      <div style={{
        fontSize:   '13px',
        fontWeight: 600,
        color:      '#9ca3af',
        marginTop:  '6px',
      }}>
        {label}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontSize:  '11px',
          color:     '#4b5563',
          marginTop: '4px',
        }}>
          {subtitle}
        </div>
      )}

    </div>
  );
}

export default StatCard;