import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

function AnaSayfa() {
  const [restoranlar, setRestoranlar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestoranlar();
  }, []);

  const fetchRestoranlar = async () => {
    try {
      const { data, error } = await supabase
        .from('restoranlar')
        .select('*')
        .eq('aktif', true);

      if (error) throw error;
      setRestoranlar(data || []);
    } catch (error) {
      console.error('Hata:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        ⏳ Restoranlar yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>🍽️ Restoranlar</h1>
      
      {restoranlar.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: 'white',
          borderRadius: '10px'
        }}>
          <p style={{ fontSize: '18px', color: '#666' }}>
            Henüz restoran bulunmuyor.
          </p>
          <p style={{ color: '#999' }}>
            Supabase'de "restoranlar" tablosuna veri ekleyin.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {restoranlar.map((restoran) => (
            <Link
              key={restoran.id}
              to={`/restoran/${restoran.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Kapak Resmi */}
                <div style={{
                  height: '150px',
                  backgroundColor: '#ddd',
                  backgroundImage: restoran.kapak_url ? `url(${restoran.kapak_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  {!restoran.kapak_url && (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '50px'
                    }}>
                      🍽️
                    </div>
                  )}
                </div>

                {/* Bilgiler */}
                <div style={{ padding: '15px' }}>
                  <h3 style={{
                    margin: '0 0 10px 0',
                    color: '#333',
                    fontSize: '18px'
                  }}>
                    {restoran.ad}
                  </h3>
                  
                  <p style={{
                    margin: '0 0 10px 0',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    {restoran.kategori || 'Restoran'}
                  </p>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#888',
                    fontSize: '14px'
                  }}>
                    <span>⭐ {restoran.puan || '0.0'}</span>
                    <span>🕐 {restoran.teslimat_suresi || '30-40 dk'}</span>
                    <span>💵 Min: {restoran.min_siparis || 0}₺</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnaSayfa;