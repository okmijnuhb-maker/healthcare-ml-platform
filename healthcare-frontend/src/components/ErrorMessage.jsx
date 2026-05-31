// ErrorMessage.jsx - Error display component
import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

function ErrorMessage({ message, onRetry = null, type = 'error' }) {
  const config = {
    error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: AlertCircle },
    network: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: WifiOff     },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: AlertCircle },
  }[type] || { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: AlertCircle };

  const Icon = config.icon;

  return (
    <div style={{
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '12px',
      padding:      '16px',
      borderRadius: '12px',
      background:   config.bg,
      border:       `1px solid ${config.border}`,
      margin:       '8px 0',
    }}>

      {/* Icon */}
      <div style={{
        width:          '32px',
        height:         '32px',
        borderRadius:   '8px',
        background:     `${config.color}22`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        <Icon size={16} color={config.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize:   '13px',
          fontWeight: 600,
          color:      config.color,
          marginBottom: '4px',
        }}>
          {type === 'network' ? 'Connection Error' : 'Error'}
        </div>
        <div style={{
          fontSize: '13px',
          color:    '#9ca3af',
          lineHeight: 1.5,
        }}>
          {message}
        </div>

        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '6px',
              marginTop:    '10px',
              padding:      '6px 14px',
              borderRadius: '8px',
              background:   `${config.color}22`,
              border:       `1px solid ${config.color}44`,
              color:        config.color,
              fontSize:     '12px',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        )}
      </div>

    </div>
  );
}

export default ErrorMessage;