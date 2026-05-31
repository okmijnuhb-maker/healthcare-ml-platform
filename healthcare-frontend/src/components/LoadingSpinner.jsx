// LoadingSpinner.jsx - Loading states
import React from 'react';

function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeConfig = {
    sm: { spinner: '20px', border: '2px', fontSize: '12px' },
    md: { spinner: '36px', border: '3px', fontSize: '13px' },
    lg: { spinner: '52px', border: '4px', fontSize: '14px' },
  }[size] || { spinner: '36px', border: '3px', fontSize: '13px' };

  return (
    <>
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinnerFade {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>

      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 20px',
        gap:            '16px',
      }}>

        {/* Spinner */}
        <div style={{ position: 'relative' }}>
          {/* Outer ring */}
          <div style={{
            width:        sizeConfig.spinner,
            height:       sizeConfig.spinner,
            borderRadius: '50%',
            border:       `${sizeConfig.border} solid rgba(59,130,246,0.1)`,
          }} />
          {/* Spinning arc */}
          <div style={{
            position:     'absolute',
            top:          0,
            left:         0,
            width:        sizeConfig.spinner,
            height:       sizeConfig.spinner,
            borderRadius: '50%',
            border:       `${sizeConfig.border} solid transparent`,
            borderTop:    `${sizeConfig.border} solid #3b82f6`,
            borderRight:  `${sizeConfig.border} solid #3b82f680`,
            animation:    'spin 0.8s linear infinite',
          }} />
        </div>

        {/* Message */}
        <div style={{
          fontSize:   sizeConfig.fontSize,
          color:      '#6b7280',
          fontWeight: 500,
          animation:  'spinnerFade 1.5s ease-in-out infinite',
        }}>
          {message}
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width:        '6px',
              height:       '6px',
              borderRadius: '50%',
              background:   '#3b82f6',
              animation:    `spinnerFade 1.4s ease-in-out ${i * 0.16}s infinite`,
            }} />
          ))}
        </div>

      </div>
    </>
  );
}

export default LoadingSpinner;