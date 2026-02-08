// src/pages/auth/ResetPassword.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Sayfa yüklendiğinde session kontrolü
    const checkSession = async () => {
      try {
        // URL hash parametrelerini al
        const hashParams = window.location.hash.substring(1);
        const params = new URLSearchParams(hashParams);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        console.log('🔍 Hash params:', { accessToken: !!accessToken, type });

        if (type === 'recovery' && accessToken) {
          // Session'ı manuel olarak ayarla
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('❌ Session error:', error);
            setError('Link geçersiz veya süresi dolmuş. Lütfen yeni link isteyin.');
          } else if (data.session) {
            console.log('✅ Session başarılı');
            setIsReady(true);
          }
        } else {
          // Normal session kontrolü
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Get session error:', error);
            setError('Oturum kontrolü başarısız');
          } else if (session) {
            console.log('✅ Mevcut session bulundu');
            setIsReady(true);
          } else {
            setError('Geçersiz link. Lütfen şifre sıfırlama işlemini tekrar başlatın.');
          }
        }
      } catch (err) {
        console.error('❌ Catch error:', err);
        setError('Bir hata oluştu. Lütfen sayfayı yenileyin.');
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }

      console.log('✅ Şifre güncellendi:', data);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('❌ Catch error:', err);
      setError(err.message || 'Şifre güncellenirken bir hata oluştu');
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
            <span style={styles.icon}>{success ? '✅' : '🔒'}</span>
          </div>
          <h1 style={styles.title}>
            {success ? 'Şifre Güncellendi!' : 'Yeni Şifre Belirle'}
          </h1>
          <p style={styles.subtitle}>
            {success
              ? 'Şifreniz başarıyla güncellendi.'
              : 'Hesabınız için yeni bir şifre oluşturun.'}
          </p>
        </div>

        {/* Error State */}
        {error && !success && (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <div>
              <strong>{error}</strong>
              <p style={styles.errorHint}>
                <a href="/sifremi-unuttum" style={styles.errorLink}>
                  Yeni şifre sıfırlama linki iste →
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div style={styles.successBox}>
            <div style={styles.checkmark}>✓</div>
            <p style={styles.successText}>
              Artık yeni şifrenizle giriş yapabilirsiniz!
            </p>
            <button
              onClick={() => navigate('/login')}
              style={styles.loginButton}
            >
              Giriş Sayfasına Git →
            </button>
          </div>
        ) : isReady ? (
          /* Form */
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Yeni Şifre</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                  style={styles.input}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Şifre Tekrar</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifrenizi tekrar girin"
                  required
                  style={{
                    ...styles.input,
                    borderColor: confirmPassword && password !== confirmPassword ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {confirmPassword && (
                  <span style={{
                    ...styles.matchIcon,
                    color: password === confirmPassword ? '#22c55e' : '#ef4444',
                  }}>
                    {password === confirmPassword ? '✓' : '✗'}
                  </span>
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span style={styles.errorHint}>Şifreler eşleşmiyor</span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              style={{
                ...styles.submitButton,
                opacity: loading || password.length < 6 || password !== confirmPassword ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Güncelleniyor...' : '🔐 Şifremi Güncelle'}
            </button>
          </form>
        ) : (
          /* Loading */
          <div style={styles.loadingBox}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Doğrulanıyor...</p>
          </div>
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
  },
  errorBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #fecaca',
  },
  errorHint: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  },
  errorLink: {
    color: '#3b82f6',
    textDecoration: 'underline',
    fontSize: '13px',
  },
  successBox: {
    textAlign: 'center',
    padding: '20px 0',
  },
  checkmark: {
    width: '60px',
    height: '60px',
    backgroundColor: '#22c55e',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    fontWeight: 'bold',
    margin: '0 auto 20px',
  },
  successText: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '24px',
  },
  loginButton: {
    padding: '14px 28px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '40px 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
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
  },
  input: {
    width: '100%',
    padding: '16px',
    paddingRight: '48px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  eyeButton: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
  },
  matchIcon: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
};

// CSS Animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#reset-password-spin')) {
  styleSheet.id = 'reset-password-spin';
  document.head.appendChild(styleSheet);
}

export default ResetPassword;