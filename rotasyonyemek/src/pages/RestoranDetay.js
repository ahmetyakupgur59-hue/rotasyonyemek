import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AppContext } from '../App';

function RestoranDetay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [restoran, setRestoran] = useState(null);
  const [urunler, setUrunler] = useState([]);
  const [sepet, setSepet] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde
  useEffect(() => {
    fetchRestoran();
    fetchUrunler();
    
    // LocalStorage'dan sepeti yükle
    const kayitliSepet = localStorage.getItem('sepet_' + id);
    if (kayitliSepet) {
      try {
        setSepet(JSON.parse(kayitliSepet));
      } catch (e) {
        console.error('Sepet parse hatası');
      }
    }
  }, [id]);

  // Sepet değiştiğinde kaydet
  useEffect(() => {
    if (sepet.length > 0) {
      localStorage.setItem('sepet_' + id, JSON.stringify(sepet));
    }
  }, [sepet, id]);

  const fetchRestoran = async () => {
    try {
      const { data, error } = await supabase
        .from('restoranlar')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRestoran(data);
    } catch (error) {
      console.error('Restoran hatası:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUrunler = async () => {
    try {
      const { data, error } = await supabase
        .from('urunler')
        .select('*')
        .eq('restoran_id', id)
        .eq('aktif', true);

      if (error) throw error;
      setUrunler(data || []);
    } catch (error) {
      console.error('Ürünler hatası:', error.message);
    }
  };

  const sepeteEkle = (urun) => {
    setSepet(prev => {
      const mevcut = prev.find(item => item.id === urun.id);
      if (mevcut) {
        return prev.map(item =>
          item.id === urun.id
            ? { ...item, adet: item.adet + 1 }
            : item
        );
      } else {
        return [...prev, { ...urun, adet: 1 }];
      }
    });
  };

  const sepettenCikar = (urunId) => {
    setSepet(prev => {
      const mevcut = prev.find(item => item.id === urunId);
      if (mevcut && mevcut.adet > 1) {
        return prev.map(item =>
          item.id === urunId
            ? { ...item, adet: item.adet - 1 }
            : item
        );
      } else {
        return prev.filter(item => item.id !== urunId);
      }
    });
  };

  const sepetToplam = sepet.reduce((acc, item) => acc + (item.fiyat * item.adet), 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        ⏳ Yükleniyor...
      </div>
    );
  }

  if (!restoran) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>😔 Restoran bulunamadı</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Geri Butonu */}
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          backgroundColor: '#eee',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        ← Geri
      </button>

      {/* Restoran Başlığı */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>{restoran.ad}</h1>
        <p style={{ color: '#666', margin: '0 0 10px 0' }}>
          {restoran.aciklama || 'Lezzetli yemekler'}
        </p>
        <div style={{ display: 'flex', gap: '20px', color: '#888' }}>
          <span>⭐ {restoran.puan || '0.0'}</span>
          <span>🕐 {restoran.teslimat_suresi || '30-40 dk'}</span>
          <span>💵 Min: {restoran.min_siparis || 0}₺</span>
        </div>
      </div>

      {/* İçerik: Menü + Sepet */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '20px'
      }}>
        {/* Menü */}
        <div>
          <h2>📋 Menü</h2>
          
          {urunler.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#666'
            }}>
              Henüz ürün eklenmemiş
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {urunler.map(urun => (
                <div
                  key={urun.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                      {urun.ad}
                    </h3>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {urun.aciklama || ''}
                    </p>
                    <span style={{
                      color: '#ff6b35',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {urun.fiyat}₺
                    </span>
                  </div>

                  <button
                    onClick={() => sepeteEkle(urun)}
                    style={{
                      backgroundColor: '#ff6b35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sepet */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          height: 'fit-content',
          position: 'sticky',
          top: '80px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0' }}>🛒 Sepetim</h2>

          {sepet.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '30px 0' }}>
              <p style={{ fontSize: '40px', margin: '0' }}>🛒</p>
              <p>Sepetiniz boş</p>
            </div>
          ) : (
            <>
              {/* Sepet Ürünleri */}
              <div style={{ marginBottom: '20px' }}>
                {sepet.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <div>
                      <p style={{ margin: '0', fontWeight: 'bold' }}>{item.ad}</p>
                      <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
                        {item.fiyat}₺ x {item.adet}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => sepettenCikar(item.id)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          border: '1px solid #ddd',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold' }}>{item.adet}</span>
                      <button
                        onClick={() => sepeteEkle(item)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toplam */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 0',
                borderTop: '2px solid #eee',
                marginBottom: '15px'
              }}>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Toplam</span>
                <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#ff6b35' }}>
                  {sepetToplam}₺
                </span>
              </div>

              {/* Sipariş Butonu */}
              <button
                onClick={() => {
                  if (!user) {
                    alert('Sipariş vermek için giriş yapmalısınız!');
                    navigate('/login');
                    return;
                  }
                  // Sepeti global storage'a kaydet ve Sepet sayfasına git
                  localStorage.setItem('aktifSepet', JSON.stringify({
                    restoranId: id,
                    restoranAd: restoran.ad,
                    urunler: sepet,
                    toplam: sepetToplam
                  }));
                  navigate('/sepet');
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Siparişi Tamamla
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RestoranDetay;