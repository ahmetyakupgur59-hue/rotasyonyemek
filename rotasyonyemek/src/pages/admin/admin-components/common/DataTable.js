// src/pages/admin/admin-components/common/DataTable.js
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

function DataTable({ 
  columns,
  data,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  actions,
  emptyIcon = '📭',
  emptyTitle = 'Veri Bulunamadı',
  emptyDescription = 'Henüz kayıt bulunmamaktadır.',
  rowKey = 'id'
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sıralama
  const handleSort = (key) => {
    if (!columns.find(c => c.key === key)?.sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Tümünü seç/kaldır
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(row => row[rowKey]));
    }
  };

  // Tek satır seç
  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      onSelectionChange?.(selectedRows.filter(rowId => rowId !== id));
    } else {
      onSelectionChange?.([...selectedRows, id]);
    }
  };

  // Sıralanmış veri
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr');
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortConfig]);

  if (loading) {
    return <LoadingSpinner text="Veriler yükleniyor..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ ...styles.th, width: '50px' }}>
                <input
                  type="checkbox"
                  checked={selectedRows.length === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  style={styles.checkbox}
                />
              </th>
            )}
            {columns.map((column) => (
              <th 
                key={column.key}
                style={{ 
                  ...styles.th,
                  width: column.width,
                  cursor: column.sortable ? 'pointer' : 'default',
                }}
                onClick={() => handleSort(column.key)}
              >
                <div style={styles.thContent}>
                  {column.label}
                  {column.sortable && (
                    <span style={styles.sortIcon}>
                      {sortConfig.key === column.key 
                        ? (sortConfig.direction === 'asc' ? '↑' : '↓')
                        : '↕'
                      }
                    </span>
                  )}
                </div>
              </th>
            ))}
            {actions && <th style={{ ...styles.th, width: '120px' }}>İşlemler</th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr 
              key={row[rowKey] || rowIndex}
              style={{
                ...styles.tr,
                backgroundColor: selectedRows.includes(row[rowKey]) ? '#eff6ff' : 'transparent',
              }}
              onClick={() => onRowClick?.(row)}
            >
              {selectable && (
                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row[rowKey])}
                    onChange={() => handleSelectRow(row[rowKey])}
                    style={styles.checkbox}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key} style={styles.td}>
                  {column.render 
                    ? column.render(row[column.key], row)
                    : row[column.key] ?? '-'
                  }
                </td>
              ))}
              {actions && (
                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.actions}>
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrapper: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    userSelect: 'none',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sortIcon: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  tr: {
    transition: 'background-color 0.15s',
    cursor: 'pointer',
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    color: '#334155',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }
};

export default DataTable;