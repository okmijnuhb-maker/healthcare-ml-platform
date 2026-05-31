// Navbar.jsx - Top Navigation Bar
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Clock, Wifi, WifiOff } from 'lucide-react';

// ─────────────────────────────────────────
// SERVER STATUS PILL
// ─────────────────────────────────────────

function ServerStatusPill({ status, modelsLoaded, responseTime }) {
  const config = {
    online:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  label: 'Online',   pulse: true  },
    checking: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  label: 'Checking', pulse: false },
    offline:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',   label: 'Offline',  pulse: true  },
  }[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', label: 'Unknown', pulse: false };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

      {/* Status Pill */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '6px',
        padding:      '5px 12px',
        borderRadius: '20px',
        background:   config.bg,
        border:       `1px solid ${config.border}`,
      }}>
        {/* Pulse dot */}
        <div style={{ position: 'relative', width: '8px', height: '8px' }}>
          <div style={{
            width:        '8px',
            height:       '8px',
            borderRadius: '50%',
            background:   config.color,
          }} />
          {config.pulse && (
            <div style={{
              position:     'absolute',
              top:          0,
              left:         0,
              width:        '8px',
              height:       '8px',
              borderRadius: '50%',
              background:   config.color,
              opacity:      0.4,
              animation:    'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          )}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: config.color }}>
          {config.label}
        </span>
      </div>

      {/* Models Count */}
      {status === 'online' && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '4px',
          padding:      '5px 10px',
          borderRadius: '20px',
          background:   'rgba(59,130,246,0.1)',
          border:       '1px solid rgba(59,130,246,0.2)',
        }}>
          <Cpu size={11} color="#3b82f6" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>
            {modelsLoaded} Models
          </span>
        </div>
      )}

      {/* Response Time */}
      {status === 'online' && responseTime > 0 && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '4px',
          padding:      '5px 10px',
          borderRadius: '20px',
          background:   'rgba(107,114,128,0.1)',
          border:       '1px solid rgba(107,114,128,0.15)',
        }}>
          <Activity size={11} color="#9ca3af" />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {responseTime}ms
          </span>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────

function Navbar({ pageTitle, pageSubtitle, serverStatus, modelsLoaded, responseTime }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });

  return (
    <>
      {/* Ping animation keyframe */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <nav style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        height:         '60px',
        background:     'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        zIndex:         1000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 20px 0 260px',
      }}>

        {/* LEFT - Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{
              fontSize:   '16px',
              fontWeight: 700,
              color:      '#f9fafb',
              lineHeight: 1.2,
            }}>
              {pageTitle}
            </div>
            <div style={{
              fontSize: '11px',
              color:    '#6b7280',
              marginTop:'1px',
            }}>
              {pageSubtitle}
            </div>
          </div>
        </div>

        {/* RIGHT - Status + Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          {/* Server Status */}
          <ServerStatusPill
            status={serverStatus}
            modelsLoaded={modelsLoaded}
            responseTime={responseTime}
          />

          {/* Divider */}
          <div style={{
            width:      '1px',
            height:     '24px',
            background: 'rgba(255,255,255,0.08)',
          }} />

          {/* Clock */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '6px',
          }}>
            <Clock size={13} color="#6b7280" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>
                {timeStr}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                {dateStr}
              </div>
            </div>
          </div>

        </div>
      </nav>
    </>
  );
}

export default Navbar;