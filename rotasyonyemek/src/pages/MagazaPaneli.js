import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AppContext } from '../App';

function MagazaPaneli() {
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [restoran, setRestoran] = useState(null);
  const [siparisler, setSiparisler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aktifTab, setAktifTab] = useState('siparisler');

  useEffect(() => {
    if (user) {
      fetchRestoran();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRestoran = async () => {
    try {
      // Kullanıcının restoranını bul
      const { data, error } = await supabase
        .from('restoranlar')
        .select('*')
        .eq('sahip_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setRestoran(data);
        fetchSiparisler(data.id);
        fetchUrunler(data.id);
      }
    } catch (error) {
      console.error('Restoran hatası:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiparisler = async (restoranId) => {
    const { data } = await supabase
      .from('siparisler')
      .select('*')
      .eq('restoran_id', restoranId)
      .order('created_at', { ascending: false });
    
    setSiparisler(data || []);
  };

  const fetchUrunler = async (restoranId) => {
    const { data } = await supabase
      .from('urunler')
      .select('*')
      .eq('restoran_id', restoranId);
    
    setUrunler(data || []);
  };

  const durumGuncelle = async (siparisId, yeniDurum) => {
    try {
      await supabase
        .from('siparisler')
        .update({ durum: yeniDurum })
        .eq('id', siparisId);
      
      fetchSiparisler(restoran.id);
    } catch (error) {
      alert('Hata: ' + error.message);
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
        textAlign: 'center',
        padding: '20px'
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

  // Restoranı yok
  if (!restoran) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏪</div>
        <h2>Restoranınız Bulunmuyor</h2>
        <p style={{ color: '#666' }}>
          Mağaza paneline erişmek için bir restorana sahip olmalısınız.
        </p>
      </div>
    );
  }

  const durumRenk = (durum) => {
    switch (durum) {
      case 'beklemede': return '#f59e0b';
      case 'hazirlaniyor': return '#3b82f6';
      case 'yolda': return '#8b5cf6';
      case 'tamamlandi': return '#22c55e';
      case 'iptal': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>🏪 {restoran.ad}</h1>
        <p style={{ color: '#666', margin: '5px 0 0' }}>Mağaza Yönetim Paneli</p>
      </div>

      {/* Tab Menüsü */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {['siparisler', 'urunler'].map(tab => (
          <button
            key={tab}
            onClick={() => setAktifTab(tab)}
            style={{
              padding: '12px 24px',
              backgroundColor: aktifTab === tab ? '#ff6b35' : 'white',
              color: aktifTab === tab ? 'white' : '#333',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            {tab === 'siparisler' ? '📦 Siparişler' : '🍽️ Ürünler'}
          </button>
        ))}
      </div>

      {/* Siparişler */}
      {aktifTab === 'siparisler' && (
        <div>
          <h2>📦 Aktif Siparişler</h2>
          
          {siparisler.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#666'
            }}>
              Henüz sipariş yok
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {siparisler.map(siparis => (
                <div
                  key={siparis.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderLeft: `4px solid ${durumRenk(siparis.durum)}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px' }}>
                        Sipariş #{siparis.id.slice(-6).toUpperCase()}
                      </h3>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                        {new Date(siparis.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#ff6b35',
                      fontSize: '20px'
                    }}>
                      {siparis.toplam_tutar}₺
                    </span>
                  </div>

                  {/* Ürünler */}
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    fontSize: '14px'
                  }}>
                    {siparis.urunler?.map((u, i) => (
                      <div key={i}>{u.adet}x {u.ad}</div>
                    ))}
                  </div>

                  {/* Adres */}
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                    📍 {siparis.adres}
                  </p>

                  {/* Durum Butonları */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['beklemede', 'hazirlaniyor', 'yolda', 'tamamlandi', 'iptal'].map(durum => (
                      <button
                        key={durum}
                        onClick={() => durumGuncelle(siparis.id, durum)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: siparis.durum === durum ? durumRenk(durum) : '#f3f4f6',
                          color: siparis.durum === durum ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {durum === 'beklemede' && '⏳ Beklemede'}
                        {durum === 'hazirlaniyor' && '👨‍🍳 Hazırlanıyor'}
                        {durum === 'yolda' && '🛵 Yolda'}
                        {durum === 'tamamlandi' && '✅ Tamamlandı'}
                        {durum === 'iptal' && '❌ İptal'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ürünler */}
      {aktifTab === 'urunler' && (
        <div>
          <h2>🍽️ Ürünlerim ({urunler.length})</h2>
          
          {urunler.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#666'
            }}>
              Henüz ürün eklenmemiş
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '15px'
            }}>
              {urunler.map(urun => (
                <div
                  key={urun.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  <h3 style={{ margin: '0 0 10px' }}>{urun.ad}</h3>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px' }}>
                    {urun.aciklama || 'Açıklama yok'}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#ff6b35',
                      fontSize: '18px'
                    }}>
                      {urun.fiyat}₺
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      backgroundColor: urun.aktif ? '#dcfce7' : '#fee2e2',
                      color: urun.aktif ? '#16a34a' : '#dc2626',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {urun.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MagazaPaneli;