// src/pages/auth/ForgotPassword.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/sifre-sifirla`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      console.error('Şifre sıfırlama hatası:', err);
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <span style={styles.icon}>🔑</span>
          </div>
          <h1 style={styles.title}>Şifremi Unuttum</h1>
          <p style={styles.subtitle}>
            E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
          </p>
        </div>

        {/* Success Message */}
        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <h3 style={styles.successTitle}>E-posta Gönderildi!</h3>
            <p style={styles.successText}>
              <strong>{email}</strong> adresine şifre sıfırlama linki gönderdik.
            </p>
            <div style={styles.instructionBox}>
              <p style={styles.instructionTitle}>📧 Yapmanız gerekenler:</p>
              <ol style={styles.instructionList}>
                <li>E-posta kutunuzu kontrol edin</li>
                <li>Spam/Gereksiz klasörünü de kontrol edin</li>
                <li>Gelen maildeki linke tıklayın</li>
                <li>Yeni şifrenizi belirleyin</li>
              </ol>
            </div>
            <Link to="/login" style={styles.backButton}>
              ← Giriş Sayfasına Dön
            </Link>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div style={styles.errorBox}>
                <span>❌</span> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>E-posta Adresi</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    style={styles.input}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  ...styles.submitButton,
                  opacity: loading || !email.trim() ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span>
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    📨 Sıfırlama Linki Gönder
                  </>
                )}
              </button>
            </form>

            {/* Back Link */}
            <div style={styles.footer}>
              <Link to="/login" style={styles.link}>
                ← Giriş sayfasına dön
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#f1f5f9',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    backgroundColor: '#eff6ff',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  icon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  successBox: {
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#16a34a',
    margin: '0 0 8px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  instructionBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'left',
    marginBottom: '24px',
  },
  instructionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#16a34a',
    margin: '0 0 12px 0',
  },
  instructionList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#15803d',
    lineHeight: '1.8',
  },
  backButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '18px',
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 48px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default ForgotPassword;
