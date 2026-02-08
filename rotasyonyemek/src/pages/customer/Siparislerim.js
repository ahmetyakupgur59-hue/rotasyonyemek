import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

function Siparislerim() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [siparisler, setSiparisler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSiparisler();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSiparisler = async () => {
    try {
      const { data, error } = await supabase
        .from('siparisler')
        .select('*')
        .eq('kullanici_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSiparisler(data || []);
    } catch (error) {
      console.error('Siparişler hatası:', error.message);
    } finally {
      setLoading(false);
    }
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
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔐</div>
        <h2 style={{ marginBottom: '10px' }}>Giriş Yapmalısınız</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Siparişlerinizi görmek için giriş yapın
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        ⏳ Siparişler yükleniyor...
      </div>
    );
  }

  // Durum renkleri
  const durumRenk = (durum) => {
    switch (durum) {
      case 'beklemede': return { bg: '#fef3c7', text: '#d97706' };
      case 'hazirlaniyor': return { bg: '#dbeafe', text: '#2563eb' };
      case 'yolda': return { bg: '#d1fae5', text: '#059669' };
      case 'tamamlandi': return { bg: '#dcfce7', text: '#16a34a' };
      case 'iptal': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  // Durum metni
  const durumMetin = (durum) => {
    switch (durum) {
      case 'beklemede': return '⏳ Onay Bekliyor';
      case 'hazirlaniyor': return '👨‍🍳 Hazırlanıyor';
      case 'yolda': return '🛵 Yolda';
      case 'tamamlandi': return '✅ Teslim Edildi';
      case 'iptal': return '❌ İptal Edildi';
      default: return durum;
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '30px' }}>📦 Siparişlerim</h1>

      {siparisler.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '50px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
          <h2 style={{ marginBottom: '10px', color: '#333' }}>
            Henüz siparişiniz yok
          </h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Lezzetli yemekler sizi bekliyor!
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 30px',
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {siparisler.map((siparis) => {
            const renk = durumRenk(siparis.durum);
            return (
              <div
                key={siparis.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
              >
                {/* Üst Kısım */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>
                      Sipariş #{siparis.id.slice(-6).toUpperCase()}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {new Date(siparis.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Durum Badge */}
                  <span style={{
                    backgroundColor: renk.bg,
                    color: renk.text,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {durumMetin(siparis.durum)}
                  </span>
                </div>

                {/* Ürünler */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '15px'
                }}>
                  {siparis.urunler?.map((urun, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        fontSize: '14px'
                      }}
                    >
                      <span>{urun.adet}x {urun.ad}</span>
                      <span>{urun.fiyat * urun.adet}₺</span>
                    </div>
                  ))}
                </div>

                {/* Alt Kısım */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '10px',
                  borderTop: '1px solid #eee'
                }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>
                    📍 {siparis.adres?.slice(0, 30)}...
                  </span>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: '#ff6b35'
                  }}>
                    {siparis.toplam_tutar}₺
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Siparislerim;