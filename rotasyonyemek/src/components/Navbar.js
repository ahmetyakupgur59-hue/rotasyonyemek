import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  signOut,
  queryCollection,
  onSnapshot
} from '../supabaseHelpers';

function Navbar() {
  const [user, setUser] = useState(null);
  const [isRestoranSahibi, setIsRestoranSahibi] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const unsubRes = onSnapshot("restoranlar", (snap) => {
          const restoranlar = snap.docs.filter(d =>
            d.data().sahipEmail === currentUser.email.toLowerCase()
          );
          setIsRestoranSahibi(restoranlar.length > 0);
        });
        return () => unsubRes();
      } else {
        setIsRestoranSahibi(false);
      }
    });
    return () => unsub();
  }, []);

  const menuAc = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMenuAcik(true);
  };

  const menuKapat = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuAcik(false);
    }, 300);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav style={navStil}>
      {/* LOGO */}
      <Link to="/" style={logoStil}>
        <span style={logoTekStil}>TEK</span>
        <span style={logoYemekStil}>YEMEK</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {user ? (
          <>
            {isRestoranSahibi && (
              <Link to="/magaza-paneli" style={magazaPanelStil}>
                <span style={{ fontSize: '18px' }}>🏪</span> Mağaza Paneli
              </Link>
            )}

            {user.email === "ahmetyakupgur59@hotmail.com" && (
              <Link to="/admin" style={adminLinkStil}>🛡️ Admin</Link>
            )}

            {/* KULLANICI MENÜSÜ */}
            <div
              style={{ position: 'relative', zIndex: 1001 }}
              onMouseEnter={menuAc}
              onMouseLeave={menuKapat}
            >
              <div style={{
                ...profilTetikleyiciStil,
                backgroundColor: menuAcik ? '#f1f3f5' : '#ffffff',
                borderColor: menuAcik ? '#007bff' : 'transparent'
              }}>
                <div style={avatarStil}>
                  {user.email[0].toUpperCase()}
                  <div style={onlineNoktaStil}></div>
                </div>
                <span style={emailMetinStil}>{user.email.split('@')[0]}</span>
                <span style={{
                  fontSize: '12px',
                  marginLeft: '8px',
                  transform: menuAcik ? 'rotate(180deg)' : 'rotate(0)',
                  transition: '0.3s',
                  color: '#007bff'
                }}>▼</span>
              </div>

              {/* Açılır Sekme */}
              {menuAcik && (
                <div style={dropdownMenuStil}>
                  {/* Görünmez köprü: Mouse'un menüye geçerken kaybolmasını engeller */}
                  <div style={kopruStil}></div>

                  <div style={dropdownHeader}>
                    <p style={headerEmail}>{user.email}</p>
                    <div style={goldUyelikStil}>Standart Üye</div>
                  </div>

                  <Link to="/profil" style={dropdownItemStil}>⚙️ Hesap Ayarlarım</Link>
                  <Link to="/siparislerim" style={dropdownItemStil}>🛍️ Siparişlerim</Link>

                  <div style={divider}></div>
                  <div onClick={handleLogout} style={logoutItemStil}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/login" style={loginButonStil}>Giriş Yap</Link>
        )}
      </div>
    </nav>
  );
}

// --- YENİ MODERN TASARIM STİLLERİ (Mavi/Beyaz Konsept) ---

const navStil = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 10%', // Daha geniş içerik alanı
  height: '80px',
  background: '#ffffff', // Tam beyaz arka plan
  borderBottom: 'none',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.04)' // Çok hafif, modern gölge
};

const logoStil = { textDecoration: 'none', display: 'flex', alignItems: 'center', fontWeight: '900', fontSize: '28px' };
const logoTekStil = { color: '#007bff', letterSpacing: '-1px' }; // Ana Mavi
const logoYemekStil = { color: '#2d3436', letterSpacing: '-1px' }; // Koyu Gri (Siyah yerine)

const profilTetikleyiciStil = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderRadius: '30px', // Tam oval yapı
  cursor: 'pointer',
  background: '#ffffff',
  border: '1px solid transparent', // Hover için hazırlık
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)' // Hafif kabarıklık
};

const avatarStil = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #007bff, #0056b3)', // Mavi Gradient
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: '600',
  marginRight: '12px',
  position: 'relative',
  boxShadow: '0 2px 5px rgba(0, 123, 255, 0.3)'
};

const onlineNoktaStil = {
  width: '10px',
  height: '10px',
  background: '#2ecc71', // Canlı yeşil
  border: '2px solid #ffffff', // Beyaz çerçeve ile ayrım
  borderRadius: '50%',
  position: 'absolute',
  bottom: '0',
  right: '0'
};

const emailMetinStil = { fontSize: '14px', color: '#2d3436', fontWeight: '600' };

const kopruStil = {
  position: 'absolute',
  top: '-20px',
  left: 0,
  right: 0,
  height: '20px',
  background: 'transparent'
};

const dropdownMenuStil = {
  position: 'absolute',
  top: 'calc(100% + 15px)',
  right: 0,
  width: '260px',
  background: '#ffffff',
  border: 'none',
  borderRadius: '15px',
  padding: '15px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.1)', // Derin gölge (floating effect)
  animation: 'fadeIn 0.2s ease-out'
};

const dropdownHeader = {
  padding: '0 10px 15px 10px',
  borderBottom: '1px solid #f1f2f6',
  marginBottom: '10px'
};

const headerEmail = { margin: 0, fontSize: '14px', fontWeight: '600', color: '#2d3436' };
const goldUyelikStil = { fontSize: '11px', color: '#f39c12', marginTop: '4px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' };

const dropdownItemStil = {
  display: 'block',
  padding: '12px 15px',
  color: '#636e72',
  textDecoration: 'none',
  fontSize: '14px',
  borderRadius: '10px',
  transition: '0.2s',
  cursor: 'pointer',
  fontWeight: '500'
};

// Hover efektlerini JS içinde simüle edemediğimiz için bu stiller base halidir.
// CSS dosyasında global a:hover tanımları burayı destekleyecektir.

const logoutItemStil = { ...dropdownItemStil, color: '#ff4757', marginTop: '5px', fontWeight: '600' };
const divider = { height: '1px', background: '#f1f2f6', margin: '8px 0' };

const magazaPanelStil = {
  background: '#e7f1ff', // Çok açık mavi
  color: '#007bff', // Ana mavi yazı
  padding: '10px 20px',
  borderRadius: '12px',
  border: '1px solid transparent',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: '0.3s'
};

const adminLinkStil = { color: '#636e72', textDecoration: 'none', fontSize: '13px', borderBottom: '1px dashed #b2bec3' };

const loginButonStil = {
  background: '#007bff', // Ana Mavi
  color: 'white',
  padding: '12px 30px',
  borderRadius: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)', // Mavi gölge
  transition: '0.3s'
};

export default Navbar;