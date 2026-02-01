import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AppContext } from '../App';

function Admin() {
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aktifTab, setAktifTab] = useState('restoranlar');

  const [restoranlar, setRestoranlar] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [siparisler, setSiparisler] = useState([]);

  useEffect(() => {
    if (user) {
      checkAdmin();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdmin = async () => {
    try {
      const { data } = await supabase
        .from('kullanicilar')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (data?.rol === 'admin') {
        setIsAdmin(true);
        fetchData();
      }
    } catch (error) {
      console.error('Admin kontrol hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    // Restoranlar
    const { data: r } = await supabase.from('restoranlar').select('*');
    setRestoranlar(r || []);

    // Kullanıcılar
    const { data: k } = await supabase.from('kullanicilar').select('*');
    setKullanicilar(k || []);

    // Siparişler
    const { data: s } = await supabase
      .from('siparisler')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setSiparisler(s || []);
  };

  // Giriş yapmamış
  if (!user) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔐</div>
        <h2>Giriş Yapmalısınız</h2>
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        ⏳ Yükleniyor...
      </div>
    );
  }

  // Admin değil
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⛔</div>
        <h2>Erişim Reddedildi</h2>
        <p style={{ color: '#666' }}>Bu sayfaya erişim yetkiniz yok.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0 }}>🛡️ Admin Paneli</h1>
        <p style={{ margin: '5px 0 0', opacity: 0.8 }}>Sistem yönetimi</p>
      </div>

      {/* İstatistikler */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>
            {restoranlar.length}
          </div>
          <div style={{ color: '#666' }}>Restoran</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
            {kullanicilar.length}
          </div>
          <div style={{ color: '#666' }}>Kullanıcı</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
            {siparisler.length}
          </div>
          <div style={{ color: '#666' }}>Sipariş</div>
        </div>
      </div>

      {/* Tab Menüsü */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {['restoranlar', 'kullanicilar', 'siparisler'].map(tab => (
          <button
            key={tab}
            onClick={() => setAktifTab(tab)}
            style={{
              padding: '12px 24px',
              backgroundColor: aktifTab === tab ? '#1e293b' : 'white',
              color: aktifTab === tab ? 'white' : '#333',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'restoranlar' && '🏪 Restoranlar'}
            {tab === 'kullanicilar' && '👥 Kullanıcılar'}
            {tab === 'siparisler' && '📦 Siparişler'}
          </button>
        ))}
      </div>

      {/* Restoranlar */}
      {aktifTab === 'restoranlar' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Restoran</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Kategori</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Puan</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {restoranlar.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{r.ad}</td>
                  <td style={{ padding: '15px', color: '#666' }}>{r.kategori || '-'}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>⭐ {r.puan || '0'}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: r.aktif ? '#dcfce7' : '#fee2e2',
                      color: r.aktif ? '#16a34a' : '#dc2626'
                    }}>
                      {r.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kullanıcılar */}
      {aktifTab === 'kullanicilar' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Ad</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Rol</th>
              </tr>
            </thead>
            <tbody>
              {kullanicilar.map(k => (
                <tr key={k.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{k.ad || '-'}</td>
                  <td style={{ padding: '15px', color: '#666' }}>{k.email}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: k.rol === 'admin' ? '#dbeafe' : '#f3f4f6',
                      color: k.rol === 'admin' ? '#2563eb' : '#666'
                    }}>
                      {k.rol || 'musteri'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Siparişler */}
      {aktifTab === 'siparisler' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Sipariş No</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Tarih</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Tutar</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {siparisler.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>
                    #{s.id.slice(-6).toUpperCase()}
                  </td>
                  <td style={{ padding: '15px', color: '#666' }}>
                    {new Date(s.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#ff6b35' }}>
                    {s.toplam_tutar}₺
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: s.durum === 'tamamlandi' ? '#dcfce7' : '#fef3c7',
                      color: s.durum === 'tamamlandi' ? '#16a34a' : '#d97706'
                    }}>
                      {s.durum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Admin;