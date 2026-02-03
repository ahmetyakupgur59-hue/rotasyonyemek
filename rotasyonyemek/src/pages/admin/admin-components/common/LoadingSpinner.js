// src/pages/admin/admin-components/common/LoadingSpinner.js
import React from 'react';

function LoadingSpinner({ size = 'medium', text = 'Yükleniyor...' }) {
  const sizes = {
    small: { spinner: 24, fontSize: 12 },
    medium: { spinner: 40, fontSize: 14 },
    large: { spinner: 60, fontSize: 16 }
  };

  const currentSize = sizes[size];

  return (
    <div style={styles.container}>
      <div 
        style={{
          ...styles.spinner,
          width: currentSize.spinner,
          height: currentSize.spinner,
        }} 
      />
      {text && <p style={{ ...styles.text, fontSize: currentSize.fontSize }}>{text}</p>}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '15px',
  },
  spinner: {
    border: '4px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: '#64748b',
    margin: 0,
  }
};

// CSS animasyonu için global style ekle
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#spinner-animation')) {
  styleSheet.id = 'spinner-animation';
  document.head.appendChild(styleSheet);
}

export default LoadingSpinner;