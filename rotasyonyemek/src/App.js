import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabase';

// Sayfalar
import AnaSayfa from './pages/AnaSayfa';
import Login from './pages/Login';
import RestoranDetay from './pages/RestoranDetay';
import Sepet from './pages/Sepet';

// Context
export const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '24px'
      }}>
        ⏳ Yükleniyor...
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <Router>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          fontFamily: 'Arial, sans-serif'
        }}>
          {/* Üst Menü */}
          <nav style={{
            backgroundColor: '#ff6b35',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <a href="/" style={{ 
              color: 'white', 
              textDecoration: 'none', 
              fontSize: '24px', 
              fontWeight: 'bold' 
            }}>
              🍕 RotasyonYemek
            </a>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <a href="/sepet" style={{ 
                color: 'white', 
                textDecoration: 'none',
                fontSize: '20px'
              }}>
                🛒 Sepet
              </a>
              
              {user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                  }}
                  style={{
                    backgroundColor: 'white',
                    color: '#ff6b35',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Çıkış Yap
                </button>
              ) : (
                <a href="/login" style={{
                  backgroundColor: 'white',
                  color: '#ff6b35',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold'
                }}>
                  Giriş Yap
                </a>
              )}
            </div>
          </nav>

          {/* Sayfalar */}
          <Routes>
            <Route path="/" element={<AnaSayfa />} />
            <Route path="/login" element={<Login />} />
            <Route path="/restoran/:id" element={<RestoranDetay />} />
            <Route path="/sepet" element={<Sepet />} />
          </Routes>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;