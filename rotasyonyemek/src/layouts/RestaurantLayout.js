import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function RestaurantLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isRestoran, isAdmin } = useAuth();

  // Restoran sahibi veya admin değilse yönlendir
  if (!isRestoran && !isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '60px' }}>🏪</div>
        <h2>Restoran Paneli</h2>
        <p style={{ color: '#666' }}>Bu sayfaya erişmek için restoran sahibi olmalısınız.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 30px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const menuItems = [
    { path: '/restaurant', icon: '📊', label: 'Dashboard' },
    { path: '/restaurant/orders', icon: '📦', label: 'Siparişler' },
    { path: '/restaurant/menu', icon: '🍽️', label: 'Menü Yönetimi' },
    { path: '/restaurant/settings', icon: '⚙️', label: 'Ayarlar' },
  ];

  const isActive = (path) => {
    if (path === '/restaurant') {
      return location.pathname === '/restaurant';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sol Sidebar */}
      <aside style={{
        width: '240px',
        backgroundColor: '#ff6b35',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h1 style={{ margin: 0, fontSize: '18px' }}>🏪 Restoran Paneli</h1>
        </div>

        {/* Menü */}
        <nav style={{ flex: 1, padding: '15px 0' }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                color: 'white',
                textDecoration: 'none',
                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.2)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Çıkış */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Ana İçerik */}
      <main style={{
        flex: 1,
        marginLeft: '240px',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        padding: '30px'
      }}>
        {children}
      </main>
    </div>
  );
}

export default RestaurantLayout;