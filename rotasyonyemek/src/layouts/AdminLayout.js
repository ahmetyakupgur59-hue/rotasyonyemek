// src/layouts/AdminLayout.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Yükleniyor durumu
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Giriş yapılmamış
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin değil
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={styles.container}>
      {children}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '15px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default AdminLayout;