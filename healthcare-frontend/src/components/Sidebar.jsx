// Sidebar.jsx - Left Navigation Sidebar
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Heart, AlertTriangle, Building2,
  Activity, Stethoscope
} from 'lucide-react';

// ─────────────────────────────────────────
// NAV ITEMS CONFIG
// ─────────────────────────────────────────

const NAV_ITEMS = [
  {
    path:        '/',
    label:       'Home',
    description: 'Platform Overview',
    icon:        Home,
    color:       '#3b82f6',
  },
  {
    path:        '/readmission',
    label:       'Readmission',
    description: 'Patient Risk Prediction',
    icon:        Heart,
    color:       '#ef4444',
  },
  {
    path:        '/outbreak',
    label:       'Outbreak',
    description: 'Disease Detection',
    icon:        AlertTriangle,
    color:       '#f59e0b',
  },
  {
    path:        '/resources',
    label:       'Resources',
    description: 'Hospital Optimization',
    icon:        Building2,
    color:       '#8b5cf6',
  },
];

// ─────────────────────────────────────────
// NAV ITEM COMPONENT
// ─────────────────────────────────────────

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '12px',
        padding:      '10px 16px',
        borderRadius: '10px',
        cursor:       'pointer',
        margin:       '2px 8px',
        transition:   'all 0.2s ease',
        background:   isActive
          ? `rgba(59,130,246,0.12)`
          : hovered
          ? 'rgba(255,255,255,0.04)'
          : 'transparent',
        borderLeft:   isActive
          ? `3px solid ${item.color}`
          : '3px solid transparent',
        boxShadow:    isActive
          ? `0 0 20px rgba(59,130,246,0.1)`
          : 'none',
      }}
    >
      {/* Icon */}
      <div style={{
        width:          '34px',
        height:         '34px',
        borderRadius:   '8px',
        background:     isActive
          ? `rgba(${item.color === '#ef4444' ? '239,68,68' :
              item.color === '#f59e0b' ? '245,158,11' :
              item.color === '#8b5cf6' ? '139,92,246' :
              '59,130,246'},0.15)`
          : 'rgba(255,255,255,0.04)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
        transition:     'all 0.2s ease',
      }}>
        <Icon
          size={16}
          color={isActive ? item.color : hovered ? '#9ca3af' : '#6b7280'}
        />
      </div>

      {/* Labels */}
      <div>
        <div style={{
          fontSize:   '13px',
          fontWeight: isActive ? 700 : 500,
          color:      isActive ? '#f9fafb' : hovered ? '#e5e7eb' : '#9ca3af',
          transition: 'all 0.2s ease',
          lineHeight: 1.3,
        }}>
          {item.label}
        </div>
        <div style={{
          fontSize:   '11px',
          color:      isActive ? '#6b7280' : '#4b5563',
          marginTop:  '1px',
          transition: 'all 0.2s ease',
        }}>
          {item.description}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PROJECT BADGE
// ─────────────────────────────────────────

function ProjectBadge({ color, label }) {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        '8px',
      padding:    '6px 0',
    }}>
      <div style={{
        width:        '6px',
        height:       '6px',
        borderRadius: '50%',
        background:   color,
        flexShrink:   0,
      }} />
      <span style={{ fontSize: '11px', color: '#4b5563' }}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────

function Sidebar({ currentPath }) {
  const navigate = useNavigate();

  return (
    <aside style={{
      position:     'fixed',
      top:          0,
      left:         0,
      width:        '240px',
      height:       '100vh',
      background:   'rgba(10,15,30,0.98)',
      borderRight:  '1px solid rgba(255,255,255,0.06)',
      zIndex:       999,
      display:      'flex',
      flexDirection:'column',
      overflowY:    'auto',
    }}>

      {/* LOGO SECTION */}
      <div style={{
        padding:      '20px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '10px',
          marginBottom: '4px',
        }}>
          {/* Icon */}
          <div style={{
            width:          '36px',
            height:         '36px',
            borderRadius:   '10px',
            background:     'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            boxShadow:      '0 0 20px rgba(59,130,246,0.3)',
            flexShrink:     0,
          }}>
            <Stethoscope size={18} color="#ffffff" />
          </div>

          {/* Title */}
          <div>
            <div style={{
              fontSize:     '13px',
              fontWeight:   800,
              color:        '#f9fafb',
              lineHeight:   1.2,
              letterSpacing:'-0.3px',
            }}>
              Healthcare ML
            </div>
            <div style={{
              fontSize:  '10px',
              color:     '#4b5563',
              marginTop: '1px',
            }}>
              AI Powered Analytics
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div style={{ padding: '12px 0', flex: 1 }}>

        {/* Nav label */}
        <div style={{
          fontSize:      '10px',
          fontWeight:    700,
          color:         '#374151',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding:       '0 24px',
          marginBottom:  '8px',
        }}>
          Navigation
        </div>

        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={currentPath === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}

      </div>

      {/* BOTTOM SECTION */}
      <div style={{
        padding:    '12px 16px 20px',
        borderTop:  '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Projects label */}
        <div style={{
          fontSize:      '10px',
          fontWeight:    700,
          color:         '#374151',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom:  '8px',
        }}>
          ML Projects
        </div>

        <ProjectBadge color="#ef4444" label="Patient Readmission" />
        <ProjectBadge color="#f59e0b" label="Disease Outbreak" />
        <ProjectBadge color="#8b5cf6" label="Resource Optimization" />

        {/* Divider */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          margin:    '12px 0',
        }} />

        {/* Version */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={11} color="#374151" />
            <span style={{ fontSize: '11px', color: '#374151' }}>
              Flask API
            </span>
          </div>
          <span style={{
            fontSize:     '10px',
            color:        '#374151',
            background:   'rgba(255,255,255,0.04)',
            padding:      '2px 8px',
            borderRadius: '10px',
          }}>
            v1.0
          </span>
        </div>

      </div>
    </aside>
  );
}

export default Sidebar;