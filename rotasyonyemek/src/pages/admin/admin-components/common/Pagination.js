// src/pages/admin/admin-components/common/Pagination.js
import React from 'react';

function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage,
  showInfo = true 
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);
    
    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }
    
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div style={styles.container}>
      {showInfo && (
        <div style={styles.info}>
          Toplam <strong>{totalItems}</strong> kayıttan{' '}
          <strong>{startItem}-{endItem}</strong> arası gösteriliyor
        </div>
      )}
      
      <div style={styles.pagination}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            ...styles.pageButton,
            ...(currentPage === 1 ? styles.disabled : {})
          }}
        >
          ‹ Önceki
        </button>
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`dots-${index}`} style={styles.dots}>...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                ...styles.pageButton,
                ...(currentPage === page ? styles.active : {})
              }}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            ...styles.pageButton,
            ...(currentPage === totalPages ? styles.disabled : {})
          }}
        >
          Sonraki ›
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '20px',
    padding: '16px 0',
  },
  info: {
    fontSize: '13px',
    color: '#64748b',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageButton: {
    padding: '8px 14px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '38px',
    textAlign: 'center',
  },
  active: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: 'white',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  dots: {
    padding: '8px 4px',
    color: '#94a3b8',
  }
};

export default Pagination;