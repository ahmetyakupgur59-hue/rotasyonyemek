// src/pages/admin/admin-components/common/SearchFilter.js
import React from 'react';

function SearchFilter({ 
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Ara...',
  filters = [],
  onFilterChange,
  filterValues = {},
  onReset,
  actionButton
}) {
  return (
    <div style={styles.container}>
      {/* Arama */}
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={styles.searchInput}
        />
        {searchValue && (
          <button 
            onClick={() => onSearchChange('')}
            style={styles.clearButton}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtreler */}
      <div style={styles.filters}>
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filterValues[filter.key] || ''}
            onChange={(e) => onFilterChange(filter.key, e.target.value)}
            style={styles.select}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Reset Butonu */}
        {onReset && (Object.values(filterValues).some(v => v) || searchValue) && (
          <button onClick={onReset} style={styles.resetButton}>
            ↺ Sıfırla
          </button>
        )}
      </div>

      {/* Aksiyon Butonu */}
      {actionButton && (
        <button onClick={actionButton.onClick} style={styles.actionButton}>
          {actionButton.icon} {actionButton.label}
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1',
    minWidth: '250px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 42px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#e2e8f0',
    border: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 32px 10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 8L2 4h8z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
  resetButton: {
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  actionButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    transition: 'background-color 0.2s',
  }
};

export default SearchFilter;