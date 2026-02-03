// src/pages/admin/admin-components/common/ConfirmDialog.js
import React from 'react';
import Modal from './Modal';

function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = 'Emin misiniz?',
  message = 'Bu işlem geri alınamaz.',
  confirmText = 'Onayla',
  cancelText = 'İptal',
  type = 'danger', // danger, warning, info
  loading = false
}) {
  const colors = {
    danger: { button: '#ef4444', icon: '⚠️' },
    warning: { button: '#f59e0b', icon: '⚡' },
    info: { button: '#3b82f6', icon: 'ℹ️' },
  };

  const currentColor = colors[type];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      size="small"
      footer={
        <>
          <button 
            onClick={onClose} 
            style={styles.cancelButton}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{ ...styles.confirmButton, backgroundColor: currentColor.button }}
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : confirmText}
          </button>
        </>
      }
    >
      <div style={styles.content}>
        <div style={styles.icon}>{currentColor.icon}</div>
        <p style={styles.message}>{message}</p>
      </div>
    </Modal>
  );
}

const styles = {
  content: {
    textAlign: 'center',
    padding: '20px 0',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  message: {
    margin: 0,
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.6,
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  confirmButton: {
    padding: '10px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  }
};

export default ConfirmDialog;