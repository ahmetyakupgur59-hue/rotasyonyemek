// src/components/ChangePassword.js

import React, { useState } from 'react';
import { supabase } from '../services/supabase';

function ChangePassword({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Yeni şifre mevcut şifrenizden farklı olmalıdır');
      return;
    }

    setLoading(true);

    try {
      // Supabase'de şifre güncelleme
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Başarılı callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Şifre güncelleme hatası:', err);
      setError(err.message || 'Şifre güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>🔐</span>
        <h3 style={styles.title}>Şifre Değiştir</h3>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span>❌</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Mevcut Şifre</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Mevcut şifreniz"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Yeni Şifre</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Yeni şifreniz (min 6 karakter)"
            required
            minLength={6}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Yeni Şifre Tekrar</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni şifrenizi tekrar girin"
            required
            style={{
              ...styles.input,
              borderColor: confirmPassword && newPassword !== confirmPassword ? '#ef4444' : '#e2e8f0',
            }}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <span style={styles.errorHint}>Şifreler eşleşmiyor</span>
          )}
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            style={styles.checkbox}
          />
          <span>Şifreleri göster</span>
        </label>

        <div style={styles.buttons}>
          {onClose && (
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              İptal
            </button>
          )}
          <button
            type="submit"
            disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
            style={{
              ...styles.submitButton,
              opacity: loading || newPassword.length < 6 || newPassword !== confirmPassword ? 0.6 : 1,
            }}
          >
            {loading ? 'Güncelleniyor...' : '🔐 Şifreyi Güncelle'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '28px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  errorHint: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 2,
    padding: '14px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default ChangePassword;
