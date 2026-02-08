// src/pages/admin/admin-components/common/LoadingSpinner.js

import React from 'react';

function LoadingSpinner({ 
  size = 'medium', 
  text = 'Yükleniyor...', 
  fullScreen = false,
  variant = 'spinner' // 'spinner' | 'dots' | 'pulse' | 'skeleton'
}) {
  const sizes = {
    small: { spinner: 24, fontSize: 12, padding: 20 },
    medium: { spinner: 40, fontSize: 14, padding: 40 },
    large: { spinner: 60, fontSize: 16, padding: 60 }
  };

  const currentSize = sizes[size];

  // Skeleton Variant
  if (variant === 'skeleton') {
    return (
      <div style={styles.skeletonContainer}>
        <div style={styles.skeletonHeader}>
          <div style={{ ...styles.skeleton, width: '200px', height: '32px' }}></div>
          <div style={{ ...styles.skeleton, width: '120px', height: '40px', borderRadius: '8px' }}></div>
        </div>
        <div style={styles.skeletonGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={{ ...styles.skeleton, width: '48px', height: '48px', borderRadius: '12px' }}></div>
              <div style={styles.skeletonCardContent}>
                <div style={{ ...styles.skeleton, width: '60%', height: '14px' }}></div>
                <div style={{ ...styles.skeleton, width: '40%', height: '24px', marginTop: '8px' }}></div>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.skeletonTable}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={styles.skeletonRow}>
              <div style={{ ...styles.skeleton, width: '40px', height: '40px', borderRadius: '8px' }}></div>
              <div style={{ ...styles.skeleton, width: '25%', height: '14px' }}></div>
              <div style={{ ...styles.skeleton, width: '20%', height: '14px' }}></div>
              <div style={{ ...styles.skeleton, width: '15%', height: '14px' }}></div>
              <div style={{ ...styles.skeleton, width: '80px', height: '28px', borderRadius: '6px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dots Variant
  if (variant === 'dots') {
    return (
      <div style={{
        ...styles.container,
        padding: currentSize.padding,
        ...(fullScreen && styles.fullScreen)
      }}>
        <div style={styles.dotsContainer}>
          <div style={{ ...styles.dot, animationDelay: '0ms' }}></div>
          <div style={{ ...styles.dot, animationDelay: '150ms' }}></div>
          <div style={{ ...styles.dot, animationDelay: '300ms' }}></div>
        </div>
        {text && <p style={{ ...styles.text, fontSize: currentSize.fontSize }}>{text}</p>}
      </div>
    );
  }

  // Pulse Variant
  if (variant === 'pulse') {
    return (
      <div style={{
        ...styles.container,
        padding: currentSize.padding,
        ...(fullScreen && styles.fullScreen)
      }}>
        <div style={{
          ...styles.pulseOuter,
          width: currentSize.spinner + 20,
          height: currentSize.spinner + 20,
        }}>
          <div style={{
            ...styles.pulseInner,
            width: currentSize.spinner,
            height: currentSize.spinner,
          }}>
            <span style={{ fontSize: currentSize.spinner * 0.5 }}>🍽️</span>
          </div>
        </div>
        {text && <p style={{ ...styles.text, fontSize: currentSize.fontSize }}>{text}</p>}
      </div>
    );
  }

  // Default Spinner Variant
  return (
    <div style={{
      ...styles.container,
      padding: currentSize.padding,
      ...(fullScreen && styles.fullScreen)
    }}>
      <div style={styles.spinnerWrapper}>
        <div 
          style={{
            ...styles.spinner,
            width: currentSize.spinner,
            height: currentSize.spinner,
          }} 
        />
        <div 
          style={{
            ...styles.spinnerInner,
            width: currentSize.spinner - 8,
            height: currentSize.spinner - 8,
          }} 
        />
      </div>
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
    gap: '16px',
  },
  fullScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
  },
  spinnerWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRightColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
  },
  spinnerInner: {
    position: 'absolute',
    border: '3px solid transparent',
    borderBottomColor: '#93c5fd',
    borderRadius: '50%',
    animation: 'spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse',
  },
  text: {
    color: '#64748b',
    margin: 0,
    fontWeight: '500',
  },

  // Dots
  dotsContainer: {
    display: 'flex',
    gap: '8px',
  },
  dot: {
    width: '12px',
    height: '12px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'bounce 1s infinite',
  },

  // Pulse
  pulseOuter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    animation: 'pulse 2s infinite',
  },
  pulseInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: 'white',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },

  // Skeleton
  skeletonContainer: {
    padding: '24px',
  },
  skeletonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  skeletonCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  skeletonCardContent: {
    flex: 1,
  },
  skeletonTable: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  skeletonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  skeleton: {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px',
  },
};

export default LoadingSpinner;
