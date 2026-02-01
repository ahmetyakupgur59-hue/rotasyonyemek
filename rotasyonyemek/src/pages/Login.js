import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AppContext } from '../App';

function Login() {
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    ad: '',
    telefon: ''
  });

  // Zaten giriş yaptıysa ana sayfaya yönlendir
  if (user) {
    navigate('/');
    return null;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Giriş Yap
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      });

      if (error) throw error;

      navigate('/');
    } catch (error) {
      setError(error.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Kayıt Ol
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Auth'a kayıt
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

      if (error) throw error;

      // 2. Kullanıcı tablosuna ekle
      if (data.user) {
        const { error: dbError } = await supabase
          .from('kullanicilar')
          .insert([{
            id: data.user.id,
            email: form.email,
            ad: form.ad,
            telefon: form.telefon,
            rol: 'musteri'
          }]);

        if (dbError) {
          console.error('Kullanıcı kayıt hatası:', dbError);
        }
      }

      setSuccess('Kayıt başarılı! Giriş yapabilirsiniz.');
      setIsLogin(true);
      setForm({ ...form, password: '' });

    } catch (error) {
      setError(error.message || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: '#333'
        }}>
          {isLogin ? '🔐 Giriş Yap' : '📝 Kayıt Ol'}
        </h1>

        {/* Hata Mesajı */}
        {error && (
          <div style={{
            backgroundColor: '#ffe6e6',
            color: '#cc0000',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Başarı Mesajı */}
        {success && (
          <div style={{
            backgroundColor: '#e6ffe6',
            color: '#008000',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {/* Kayıt formunda ek alanlar */}
          {!isLogin && (
            <>
              <input
                type="text"
                name="ad"
                placeholder="Adınız Soyadınız"
                value={form.ad}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  marginBottom: '15px',
                  borderRadius: '10px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="tel"
                name="telefon"
                placeholder="Telefon (5XX XXX XX XX)"
                value={form.telefon}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginBottom: '15px',
                  borderRadius: '10px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
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
            style={{
              width: '100%',
              padding: '14px',
              marginBottom: '15px',
              borderRadius: '10px',
              border: '1px solid #ddd',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />

          <input
            type="password"
            name="password"
            placeholder="Şifre (min 6 karakter)"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '14px',
              marginBottom: '20px',
              borderRadius: '10px',
              border: '1px solid #ddd',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Bekleyin...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        {/* Geçiş Linki */}
        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#666'
        }}>
          {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
          <span
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            style={{
              color: '#ff6b35',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;