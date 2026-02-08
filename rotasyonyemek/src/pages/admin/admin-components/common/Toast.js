// src/pages/admin/admin-components/common/Toast.js
import React, { createContext, useContext, useState, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

// Toast Hook
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        // Context yoksa sessizce çalış (hata verme)
        return {
            showToast: (message, type) => {
                console.log(`Toast (${type}): ${message}`);
            },
            success: (message) => console.log(`Success: ${message}`),
            error: (message) => console.log(`Error: ${message}`),
            warning: (message) => console.log(`Warning: ${message}`),
            info: (message) => console.log(`Info: ${message}`)
        };
    }
    return context;
};

// Toast Provider
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type };
        
        setToasts(prev => [...prev, toast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info') => {
        return addToast(message, type);
    }, [addToast]);

    const value = {
        toasts,
        showToast,
        addToast,
        removeToast,
        success: (message) => addToast(message, 'success'),
        error: (message) => addToast(message, 'error'),
        warning: (message) => addToast(message, 'warning'),
        info: (message) => addToast(message, 'info')
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
    if (toasts.length === 0) return null;

    return (
        <div style={containerStyle}>
            {toasts.map(toast => (
                <ToastItem 
                    key={toast.id} 
                    toast={toast} 
                    onClose={() => removeToast(toast.id)} 
                />
            ))}
        </div>
    );
};

// Single Toast Item
const ToastItem = ({ toast, onClose }) => {
    const { message, type } = toast;

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    icon: '✓',
                    iconBg: 'rgba(255,255,255,0.2)'
                };
            case 'error':
                return {
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    icon: '✕',
                    iconBg: 'rgba(255,255,255,0.2)'
                };
            case 'warning':
                return {
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    icon: '⚠',
                    iconBg: 'rgba(255,255,255,0.2)'
                };
            case 'info':
            default:
                return {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    icon: 'ℹ',
                    iconBg: 'rgba(255,255,255,0.2)'
                };
        }
    };

    const typeStyles = getTypeStyles();

    return (
        <div style={{
            ...toastStyle,
            background: typeStyles.background
        }}>
            <div style={{
                ...iconStyle,
                backgroundColor: typeStyles.iconBg
            }}>
                {typeStyles.icon}
            </div>
            <span style={messageStyle}>{message}</span>
            <button onClick={onClose} style={closeButtonStyle}>
                ✕
            </button>
        </div>
    );
};

// Styles
const containerStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px',
    width: '100%',
    pointerEvents: 'none'
};

const toastStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    color: 'white',
    animation: 'slideIn 0.3s ease',
    pointerEvents: 'auto'
};

const iconStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    flexShrink: 0
};

const messageStyle = {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4'
};

const closeButtonStyle = {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
    transition: 'background 0.2s'
};

// CSS Animation (inject once)
if (typeof document !== 'undefined') {
    const styleId = 'toast-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Default Export
const Toast = ({ message, type, onClose }) => (
    <ToastItem toast={{ message, type }} onClose={onClose} />
);

export default Toast;
