import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

// Admin Bileşenleri
import Dashboard from './admin-components/Dashboard';
import RestoranYonetimi from './admin-components/RestoranYonetimi';
import KullaniciYonetimi from './admin-components/KullaniciYonetimi';
import SiparisYonetimi from './admin-components/SiparisYonetimi';
import BolgeYonetimi from './admin-components/BolgeYonetimi';
import KategoriYonetimi from './admin-components/KategoriYonetimi';
import KomisyonYonetimi from './admin-components/KomisyonYonetimi';
import KuponYonetimi from './admin-components/KuponYonetimi';
import BannerYonetimi from './admin-components/BannerYonetimi';
import FinansYonetimi from './admin-components/FinansYonetimi';

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aktifSayfa, setAktifSayfa] = useState('dashboard');
  const [sidebarAcik, setSidebarAcik] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'restoranlar', label: 'Restoranlar', icon: '🏪' },
    { id: 'kullanicilar', label: 'Kullanıcılar', icon: '👥' },
    { id: 'siparisler', label: 'Siparişler', icon: '📦' },
    { id: 'bolgeler', label: 'Bölge Yönetimi', icon: '📍' },
    { id: 'kategoriler', label: 'Kategoriler', icon: '🏷️' },
    { id: 'komisyonlar', label: 'Komisyonlar', icon: '💰' },
    { id: 'kuponlar', label: 'Kuponlar', icon: '🎟️' },
    { id: 'bannerlar', label: 'Bannerlar', icon: '🖼️' },
    { id: 'finans', label: 'Finans & Hakediş', icon: '🏦' },
  ];

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Admin kontrolü
        const { data: kullanici, error } = await supabase
          .from('kullanicilar')
          .select('rol')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;

        if (error) {
          console.error('Kullanıcı sorgu hatası:', error);
          setLoading(false);
          return;
        }

        if (kullanici?.rol === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Auth hatası:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          const { data: kullanici } = await supabase
            .from('kullanicilar')
            .select('rol')
            .eq('id', session.user.id)
            .single();
          
          if (isMounted && kullanici?.rol === 'admin') {
            setIsAdmin(true);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const renderContent = () => {
    switch (aktifSayfa) {
      case 'dashboard': return <Dashboard />;
      case 'restoranlar': return <RestoranYonetimi />;
      case 'kullanicilar': return <KullaniciYonetimi />;
      case 'siparisler': return <SiparisYonetimi />;
      case 'bolgeler': return <BolgeYonetimi />;
      case 'kategoriler': return <KategoriYonetimi />;
      case 'komisyonlar': return <KomisyonYonetimi />;
      case 'kuponlar': return <KuponYonetimi />;
      case 'bannerlar': return <BannerYonetimi />;
      case 'finans': return <FinansYonetimi />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>🔐</div>
        <h2>Giriş Yapmalısınız</h2>
        <p style={styles.errorText}>Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p>
        <button onClick={() => navigate('/login')} style={styles.primaryButton}>
          Giriş Yap
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⛔</div>
        <h2>Erişim Reddedildi</h2>
        <p style={styles.errorText}>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
          Giriş yapılan hesap: {user.email}
        </p>
        <button onClick={() => navigate('/')} style={styles.primaryButton}>
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        width: sidebarAcik ? '260px' : '70px',
      }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logo}>{sidebarAcik ? '🛡️ Admin Panel' : '🛡️'}</span>
          <button 
            onClick={() => setSidebarAcik(!sidebarAcik)}
            style={styles.toggleButton}
          >
            {sidebarAcik ? '◀' : '▶'}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setAktifSayfa(item.id)}
              style={{
                ...styles.menuItem,
                backgroundColor: aktifSayfa === item.id ? '#3b82f6' : 'transparent',
                color: aktifSayfa === item.id ? 'white' : '#cbd5e1',
              }}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              {sidebarAcik && <span style={styles.menuLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={() => navigate('/')} style={styles.exitButton}>
            <span>🏠</span>
            {sidebarAcik && <span>Siteye Dön</span>}
          </button>
        </div>
      </aside>

      {/* Ana İçerik */}
      <main style={{
        ...styles.mainContent,
        marginLeft: sidebarAcik ? '260px' : '70px',
      }}>
        <header style={styles.topBar}>
          <h1 style={styles.pageTitle}>
            {menuItems.find(m => m.id === aktifSayfa)?.icon}{' '}
            {menuItems.find(m => m.id === aktifSayfa)?.label}
          </h1>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user.email}</span>
            <span style={styles.adminBadge}>Admin</span>
          </div>
        </header>

        <div style={styles.content}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    backgroundColor: '#1e293b',
    transition: 'width 0.3s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '5px',
  },
  nav: {
    flex: 1,
    padding: '10px',
    overflowY: 'auto',
  },
  menuItem: {
    width: '100%',
    padding: '12px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '5px',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  },
  menuIcon: {
    fontSize: '18px',
    minWidth: '24px',
    textAlign: 'center',
  },
  menuLabel: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  sidebarFooter: {
    padding: '15px',
    borderTop: '1px solid #334155',
  },
  exitButton: {
    width: '100%',
    padding: '12px 15px',
    backgroundColor: '#475569',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
  },
  mainContent: {
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
  },
  topBar: {
    backgroundColor: 'white',
    padding: '15px 30px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  pageTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#1e293b',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userEmail: {
    color: '#64748b',
    fontSize: '14px',
  },
  adminBadge: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  content: {
    padding: '25px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '15px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    textAlign: 'center',
    padding: '20px',
  },
  errorIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  errorText: {
    color: '#64748b',
    marginBottom: '20px',
  },
  primaryButton: {
    padding: '12px 30px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};

export default Admin;