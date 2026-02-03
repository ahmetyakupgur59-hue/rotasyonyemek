// src/pages/admin/admin-components/common/EmptyState.js
import React from 'react';

function EmptyState({ 
  icon = '📭', 
  title = 'Veri Bulunamadı', 
  description = 'Henüz kayıt bulunmamaktadır.',
  actionLabel,
  onAction 
}) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon}</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} style={styles.button}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px dashed #e2e8f0',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#334155',
  },
  description: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#64748b',
    maxWidth: '300px',
  },
  button: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};

export default EmptyState;