// AlertBadge.jsx - Colored alert badges
import React from 'react';
import { ALERT_COLORS, RISK_COLORS, OCCUPANCY_COLORS } from '../constants';

function AlertBadge({ type, value, pulse = false, size = 'md' }) {
  const sizeConfig = {
    sm: { padding: '3px 8px',  fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '11px' },
    lg: { padding: '6px 14px', fontSize: '13px' },
  }[size] || { padding: '4px 10px', fontSize: '11px' };

  let color = '#6b7280';
  let bg    = 'rgba(107,114,128,0.15)';
  let border= 'rgba(107,114,128,0.3)';

  if (type === 'alert') {
    const c = ALERT_COLORS[value] || ALERT_COLORS.Unknown;
    color = c.color; bg = `${c.bg}`; border = c.border;
  } else if (type === 'risk') {
    const c = RISK_COLORS[value];
    if (c) { color = c.bg; bg = `${c.bg}22`; border = `${c.bg}55`; }
  } else if (type === 'occupancy') {
    const c = OCCUPANCY_COLORS[value];
    if (c) { color = c.bg; bg = `${c.bg}22`; border = `${c.bg}55`; }
  }

  const shouldPulse = pulse && (value === 'Outbreak' || value === 'CRITICAL' || value === 'High');

  return (
    <>
      {shouldPulse && (
        <style>{`
          @keyframes badgePulse {
            0%, 100% { box-shadow: 0 0 0 0 ${color}44; }
            50%       { box-shadow: 0 0 0 6px ${color}00; }
          }
        `}</style>
      )}
      <span style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          '5px',
        padding:      sizeConfig.padding,
        borderRadius: '20px',
        fontSize:     sizeConfig.fontSize,
        fontWeight:   700,
        textTransform:'uppercase',
        letterSpacing:'0.6px',
        color:        color,
        background:   bg,
        border:       `1px solid ${border}`,
        animation:    shouldPulse ? 'badgePulse 2s ease-in-out infinite' : 'none',
      }}>
        {shouldPulse && (
          <span style={{
            width:        '6px',
            height:       '6px',
            borderRadius: '50%',
            background:   color,
            flexShrink:   0,
          }} />
        )}
        {value}
      </span>
    </>
  );
}

export default AlertBadge;