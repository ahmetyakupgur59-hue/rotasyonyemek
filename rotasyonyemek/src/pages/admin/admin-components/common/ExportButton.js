// src/pages/admin/admin-components/common/ExportButton.js
import React, { useState } from 'react';

function ExportButton({ data, filename = 'export', columns }) {
  const [isOpen, setIsOpen] = useState(false);

  const exportCSV = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key] ?? '';
        // Virgül veya tırnak içeren değerleri düzgün handle et
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const exportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const printTable = () => {
    const printWindow = window.open('', '_blank');
    const tableHTML = `
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            h1 { font-size: 18px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${filename} - ${new Date().toLocaleDateString('tr-TR')}</h1>
          <table>
            <thead>
              <tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${columns.map(col => `<td>${row[col.key] ?? '-'}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
    setIsOpen(false);
  };

  return (
    <div style={styles.container}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.button}
      >
        📥 Dışa Aktar
      </button>
      
      {isOpen && (
        <div style={styles.dropdown}>
          <button onClick={exportCSV} style={styles.dropdownItem}>
            📊 CSV olarak indir
          </button>
          <button onClick={exportJSON} style={styles.dropdownItem}>
            📋 JSON olarak indir
          </button>
          <button onClick={printTable} style={styles.dropdownItem}>
            🖨️ Yazdır
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    minWidth: '180px',
    zIndex: 100,
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: '14px',
    color: '#334155',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background-color 0.15s',
  }
};

export default ExportButton;