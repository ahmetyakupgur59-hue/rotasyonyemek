import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Sayfalar
import MagazaPaneli from './pages/MagazaPaneli';
import RestoranDetay from './pages/RestoranDetay';
import Login from './pages/Login';
import AnaSayfa from './pages/AnaSayfa';
import Profil from './pages/Profil';
import Siparislerim from './pages/Siparislerim';
import Sepet from './pages/Sepet';
import Admin from './pages/Admin';

export const ThemeContext = createContext();

const GlobalStyles = () => {
  const { darkMode } = useContext(ThemeContext);
  return (
    <style>{`
      :root {
        --bg-body: ${darkMode ? '#0f172a' : '#f8fafc'};
        --text-main: ${darkMode ? '#f1f5f9' : '#1e293b'};
        --text-sub: ${darkMode ? '#94a3b8' : '#64748b'};
        --card-bg: ${darkMode ? '#1e293b' : '#ffffff'};
        --border-color: ${darkMode ? '#334155' : '#e2e8f0'};
        --primary: ${darkMode ? '#60a5fa' : '#3b82f6'};
      }
      body { background-color: var(--bg-body); color: var(--text-main); transition: 0.3s; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; padding-bottom: 70px; }
      * { box-sizing: border-box; }
      
      .maintenance-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background-color: var(--bg-body);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 99999; text-align: center; padding: 20px;
      }
    `}</style>
  );
};

const BottomNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const [sepetAdet, setSepetAdet] = useState(0);

  useEffect(() => {
    const updateSepet = () => {
      let toplam = 0;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sepet_')) {
          try {
            const s = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(s)) toplam += s.reduce((a, b) => a + b.adet, 0);
          } catch (e) { }
        }
      });
      setSepetAdet(toplam);
    };

    updateSepet();
    window.addEventListener('storage', updateSepet);
    window.addEventListener('sepetGuncellendi', updateSepet);
    return () => {
      window.removeEventListener('storage', updateSepet);
      window.removeEventListener('sepetGuncellendi', updateSepet);
    };
  }, []);

  if (['/admin', '/login', '/magaza-paneli'].includes(location.pathname)) return null;

  const navItems = [
    { path: '/', icon: '🏠', label: 'Anasayfa' },
    { path: '/kesfet', icon: '🔥', label: 'Fırsatlar' }, // Kampanyalar -> Fırsatlar (Daha kısa)
    { path: '/siparislerim', icon: '📦', label: 'Siparişler' },
    { path: '/sepet', icon: '🛍️', label: 'Sepetim', isCart: true },
    { path: '/profil', icon: '👤', label: 'Profil' }
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: darkMode ? '#1e293b' : 'white', borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 9998, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', paddingBottom: '5px' }}>
      {navItems.map((item) => {
        // Sepet için özel tıklama (Siparişlerim sayfasına yönlendiriyor şimdilik, sepet sayfası ayrı ise oraya yönlendirilmeli. Kullanıcı sepet istediği için /siparislerim mantıklı olabilir veya yeni route)
        // NOT: Kullanıcı "Sepet" istedi. Mevcut sistemde /siparislerim sepet görevi görüyor mu?
        // EĞER /siparislerim SADECE GEÇMİŞ SİPARİŞLERSE, SEPET İÇİN AYRI BİR İŞLEV GEREKEBİLİR.
        // FAKAT MEVCUT KODDA /siparislerim SEPET OLARAK KULLANILIYORDU.
        // KULLANICI "Siparişlerim" VE "Sepet" AYRI İSTEDİĞİNE GÖRE:
        // Siparişlerim -> Geçmiş Siparişler (/siparislerim route'u aslında bu işi yapıyor mu kontrol etmeliyim ama şimdilik path'i ayırıyorum)
        // Sepet -> /sepet (Eğer sayfası yoksa /siparislerim'e gidecek ama etiket farklı)

        // Düzeltme: Mevcut route yapısında /siparislerim hem sepet hem sipariş geçmişi olabilir.
        // Ancak karışıklığı önlemek için: 
        // Siparişlerim butonu -> /siparislerim (Sipariş Geçmişi ve Aktif Siparişler)
        // Sepet butonu -> /siparislerim (Sepet görünümü - varsayılan)

        // Kullanıcı isteğine sadık kalmak için ikisini de ekliyorum.

        const isActive = location.pathname === item.path;

        return (
          <div key={item.path} onClick={() => navigate(item.path)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: isActive ? 'var(--primary)' : 'var(--text-sub)', minWidth: '50px' }}>
            {item.isCart && sepetAdet > 0 && (
              <div style={{ position: 'absolute', top: '-5px', right: '5px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', border: `2px solid ${darkMode ? '#1e293b' : 'white'}` }}>
                {sepetAdet}
              </div>
            )}
            <span style={{ fontSize: '22px', marginBottom: '2px', transition: '0.2s', transform: isActive ? 'translateY(-2px)' : 'none' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// 🔥 BAKIM EKRANI
const BakimEkrani = () => (
  <div className="maintenance-overlay">
    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛠️</div>
    <h1 style={{ marginBottom: '10px' }}>Sistem Bakımda</h1>
    <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '30px' }}>Kısa bir bakım çalışması yapıyoruz.</p>
    <a href="/login" style={{ padding: '10px 20px', border: '1px solid #94a3b8', color: '#94a3b8', borderRadius: '8px', textDecoration: 'none', fontSize: '12px' }}>Giriş Yap</a>
  </div>
);

// 🔥 KONTROL BİLEŞENİ
const MainLayout = ({ children, sistemAyarlari }) => {
  const location = useLocation();

  // Bakım modu açıksa VE şu anki sayfa login veya admin değilse
  // Yani: Login ve Admin sayfalarına her zaman erişim var!
  if (sistemAyarlari?.bakimModu && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/admin')) {
    return <BakimEkrani />;
  }

  return (
    <>
      {children}
      {!sistemAyarlari?.bakimModu && <BottomNavbar />}
    </>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [sistemAyarlari, setSistemAyarlari] = useState(null);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sistem", "ayarlar"), (doc) => {
      if (doc.exists()) setSistemAyarlari(doc.data());
    });
    return () => unsub();
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <GlobalStyles />
      <Router>
        <MainLayout sistemAyarlari={sistemAyarlari}>
          <Routes>
            <Route path="/" element={<AnaSayfa />} />
            <Route path="/kesfet" element={<AnaSayfa />} />
            <Route path="/restoran/:id" element={<RestoranDetay />} />
            <Route path="/magaza-paneli" element={<MagazaPaneli />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/siparislerim" element={<Siparislerim />} />
            <Route path="/sepet" element={<Sepet />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;