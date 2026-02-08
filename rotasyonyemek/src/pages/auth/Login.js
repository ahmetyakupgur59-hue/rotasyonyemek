import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { user, userRole, loading, login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    ad: '',
    telefon: ''
  });

  // Kullanıcı giriş yaptıysa yönlendir
  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'restoran') {
        navigate('/restoran-panel');
      } else {
        navigate('/');
      }
    }
  }, [user, userRole, loading, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Giriş Yap
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (submitting) return;
    
    setSubmitting(true);
    setError('');

    try {
      await login(form.email, form.password);
    } catch (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı');
      } else if (error.message.includes('Email not confirmed')) {
        setError('E-posta adresiniz doğrulanmamış');
      } else {
        setError(error.message || 'Giriş başarısız');
      }
      setSubmitting(false);
    }
  };

  // Kayıt Ol
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (submitting) return;
    
    setSubmitting(true);
    setError('');

    try {
      await register(form.email, form.password, {
        ad: form.ad,
        telefon: form.telefon
      });

      setSuccess('Kayıt başarılı! Giriş yapabilirsiniz.');
      setIsLogin(true);
      setForm({ ...form, password: '' });
      setSubmitting(false);

    } catch (error) {
      if (error.message.includes('already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı');
      } else {
        setError(error.message || 'Kayıt başarısız');
      }
      setSubmitting(false);
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '15px',
    boxSizing: 'border-box',
    marginBottom: '16px'
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '48px' }}>🍽️</span>
          <h2 style={{ margin: '8px 0 0', color: '#d32f2f', fontWeight: 'bold' }}>
            RotasyonYemek
          </h2>
        </div>

        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: '#333',
          fontSize: '24px'
        }}>
          {isLogin ? '🔐 Giriş Yap' : '📝 Kayıt Ol'}
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <>
              <input
                type="text"
                name="ad"
                placeholder="Adınız Soyadınız"
                value={form.ad}
                onChange={handleChange}
                required
                style={inputStyle}
              />
              <input
                type="tel"
                name="telefon"
                placeholder="Telefon (5XX XXX XX XX)"
                value={form.telefon}
                onChange={handleChange}
                style={inputStyle}
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="E-posta"
            value={form.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          <input
            type="password"
            name="password"
            placeholder="Şifre (min 6 karakter)"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: submitting ? '#bdbdbd' : '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? '⏳ Bekleyin...' : (isLogin ? '🔐 Giriş Yap' : '📝 Kayıt Ol')}
          </button>
        </form>

        {isLogin && (
          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/sifremi-unuttum" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>
              🔑 Şifremi Unuttum
            </Link>
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          {isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
          <span
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            style={{ color: '#d32f2f', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;