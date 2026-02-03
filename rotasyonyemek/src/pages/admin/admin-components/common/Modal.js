// src/pages/admin/admin-components/common/Modal.js
import React, { useEffect } from 'react';

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  showClose = true,
  footer 
}) {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    small: '400px',
    medium: '560px',
    large: '720px',
    xlarge: '900px',
    full: '95%',
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{ ...styles.modal, maxWidth: sizes[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {showClose && (
            <button onClick={onClose} style={styles.closeButton}>
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 9999,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: '0 0 16px 16px',
  }
};

// Animasyonlar için global style
const modalStyles = document.createElement('style');
modalStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
if (!document.querySelector('#modal-animations')) {
  modalStyles.id = 'modal-animations';
  document.head.appendChild(modalStyles);
}

export default Modal;