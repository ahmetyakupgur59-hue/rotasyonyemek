import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AppContext } from '../App';

function Sepet() {
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [sepetData, setSepetData] = useState(null);
  const [adres, setAdres] = useState('');
  const [not, setNot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // LocalStorage'dan sepeti yükle
    const kayitli = localStorage.getItem('aktifSepet');
    if (kayitli) {
      try {
        setSepetData(JSON.parse(kayitli));
      } catch (e) {
        console.error('Sepet parse hatası');
      }
    }
  }, []);

  const siparisVer = async () => {
    if (!user) {
      alert('Giriş yapmalısınız!');
      navigate('/login');
      return;
    }

    if (!adres.trim()) {
      alert('Lütfen adres girin!');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('siparisler')
        .insert([{
          kullanici_id: user.id,
          restoran_id: sepetData.restoranId,
          urunler: sepetData.urunler,
          toplam_tutar: sepetData.toplam,
          adres: adres,
          not: not,
          durum: 'beklemede'
        }]);

      if (error) throw error;

      // Sepeti temizle
      localStorage.removeItem('aktifSepet');
      localStorage.removeItem('sepet_' + sepetData.restoranId);

      setSuccess(true);

    } catch (error) {
      alert('Sipariş hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sipariş başarılı
  if (success) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ color: '#22c55e', marginBottom: '10px' }}>
          Siparişiniz Alındı!
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Siparişiniz hazırlanıyor. Afiyet olsun!
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '14px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  // Sepet boş
  if (!sepetData || sepetData.urunler.length === 0) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🛒</div>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>
          Sepetiniz Boş
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Lezzetli yemekler sizi bekliyor!
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '14px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Restoranlara Göz At
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '20px' }}>🛒 Sipariş Onayı</h1>

      {/* Restoran Bilgisi */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>
          🍽️ {sepetData.restoranAd}
        </h3>
      </div>

      {/* Ürünler */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📦 Ürünler</h3>
        
        {sepetData.urunler.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: index < sepetData.urunler.length - 1 ? '1px solid #eee' : 'none'
            }}
          >
            <span>{item.adet}x {item.ad}</span>
            <span style={{ fontWeight: 'bold' }}>{item.fiyat * item.adet}₺</span>
          </div>
        ))}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '15px',
          marginTop: '15px',
          borderTop: '2px solid #eee',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          <span>Toplam</span>
          <span style={{ color: '#ff6b35' }}>{sepetData.toplam}₺</span>
        </div>
      </div>

      {/* Teslimat Bilgileri */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📍 Teslimat Bilgileri</h3>

        <textarea
          placeholder="Adresinizi girin..."
          value={adres}
          onChange={(e) => setAdres(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #ddd',
            fontSize: '16px',
            minHeight: '80px',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '15px'
          }}
        />

        <textarea
          placeholder="Sipariş notu (opsiyonel)"
          value={not}
          onChange={(e) => setNot(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #ddd',
            fontSize: '16px',
            minHeight: '60px',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Giriş Uyarısı */}
      {!user && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ⚠️ Sipariş vermek için <strong onClick={() => navigate('/login')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>giriş yapmalısınız</strong>
        </div>
      )}

      {/* Sipariş Butonu */}
      <button
        onClick={siparisVer}
        disabled={loading || !user}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: loading || !user ? '#ccc' : '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: loading || !user ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ Sipariş Gönderiliyor...' : '✅ Siparişi Onayla'}
      </button>
    </div>
  );
}

export default Sepet;