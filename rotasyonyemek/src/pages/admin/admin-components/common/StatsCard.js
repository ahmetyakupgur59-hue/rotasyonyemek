// src/pages/admin/admin-components/common/StatsCard.js
import React from 'react';

function StatsCard({ 
  icon, 
  title, 
  value, 
  subtitle,
  trend,
  trendValue,
  color = 'blue',
  onClick 
}) {
  const colors = {
    blue: { bg: '#eff6ff', icon: '#3b82f6', trend: '#3b82f6' },
    green: { bg: '#f0fdf4', icon: '#22c55e', trend: '#22c55e' },
    orange: { bg: '#fff7ed', icon: '#f97316', trend: '#f97316' },
    red: { bg: '#fef2f2', icon: '#ef4444', trend: '#ef4444' },
    purple: { bg: '#faf5ff', icon: '#a855f7', trend: '#a855f7' },
    cyan: { bg: '#ecfeff', icon: '#06b6d4', trend: '#06b6d4' },
  };

  const currentColor = colors[color];

  return (
    <div 
      style={{
        ...styles.card,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div style={{ ...styles.iconWrapper, backgroundColor: currentColor.bg }}>
        <span style={{ ...styles.icon, color: currentColor.icon }}>{icon}</span>
      </div>
      
      <div style={styles.content}>
        <p style={styles.title}>{title}</p>
        <h3 style={styles.value}>{value}</h3>
        
        {(subtitle || trend) && (
          <div style={styles.footer}>
            {trend && (
              <span style={{
                ...styles.trend,
                color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b'
              }}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </span>
            )}
            {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #f1f5f9',
  },
  iconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: '24px',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    margin: '0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 1.2,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  trend: {
    fontSize: '13px',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: '12px',
    color: '#94a3b8',
  }
};

export default StatsCard;