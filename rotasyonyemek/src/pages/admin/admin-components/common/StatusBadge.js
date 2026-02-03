// src/pages/admin/admin-components/common/StatusBadge.js
import React from 'react';

function StatusBadge({ status, type = 'order' }) {
  const getConfig = () => {
    // Sipariş durumları
    const orderStatuses = {
      'beklemede': { label: 'Beklemede', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
      'onaylandi': { label: 'Onaylandı', color: '#3b82f6', bg: '#dbeafe', icon: '✓' },
      'hazirlaniyor': { label: 'Hazırlanıyor', color: '#8b5cf6', bg: '#ede9fe', icon: '👨‍🍳' },
      'yolda': { label: 'Yolda', color: '#06b6d4', bg: '#cffafe', icon: '🚴' },
      'teslim_edildi': { label: 'Teslim Edildi', color: '#10b981', bg: '#d1fae5', icon: '✅' },
      'iptal': { label: 'İptal', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    };

    // Genel durumlar
    const generalStatuses = {
      'aktif': { label: 'Aktif', color: '#10b981', bg: '#d1fae5', icon: '●' },
      'pasif': { label: 'Pasif', color: '#64748b', bg: '#f1f5f9', icon: '○' },
      'beklemede': { label: 'Onay Bekliyor', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
      'reddedildi': { label: 'Reddedildi', color: '#ef4444', bg: '#fee2e2', icon: '✗' },
      'banned': { label: 'Banlı', color: '#dc2626', bg: '#fee2e2', icon: '🚫' },
    };

    // Kullanıcı rolleri
    const roleStatuses = {
      'admin': { label: 'Admin', color: '#8b5cf6', bg: '#f3e8ff', icon: '👑' },
      'restoran': { label: 'Restoran', color: '#f59e0b', bg: '#fef3c7', icon: '🏪' },
      'musteri': { label: 'Müşteri', color: '#3b82f6', bg: '#dbeafe', icon: '👤' },
      'kurye': { label: 'Kurye', color: '#06b6d4', bg: '#cffafe', icon: '🚴' },
    };

    if (type === 'order') return orderStatuses[status] || orderStatuses['beklemede'];
    if (type === 'role') return roleStatuses[status] || roleStatuses['musteri'];
    return generalStatuses[status] || generalStatuses['pasif'];
  };

  const config = getConfig();

  return (
    <span style={{
      ...styles.badge,
      color: config.color,
      backgroundColor: config.bg,
    }}>
      <span style={styles.icon}>{config.icon}</span>
      {config.label}
    </span>
  );
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  icon: {
    fontSize: '10px',
  }
};

export default StatusBadge;