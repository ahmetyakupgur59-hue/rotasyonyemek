import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Navbar = () => {
  const { user, userRole, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isAdmin = userRole === 'admin';
  const isRestoran = userRole === 'restoran';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Admin veya Restoran panelinde navbar'ı gösterme
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/restoran-panel')) {
    return null;
  }

  const styles = {
    navbar: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      height: '70px'
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    logo: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#d32f2f',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    nav: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    navLink: {
      color: '#333',
      textDecoration: 'none',
      fontSize: '15px',
      fontWeight: '500',
      padding: '8px 12px',
      borderRadius: '6px'
    },
    cartButton: {
      position: 'relative',
      padding: '8px 16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      textDecoration: 'none',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px'
    },
    cartBadge: {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      backgroundColor: '#d32f2f',
      color: 'white',
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '2px 6px',
      borderRadius: '10px',
      minWidth: '18px',
      textAlign: 'center'
    },
    adminButton: {
      padding: '10px 20px',
      backgroundColor: '#673ab7',
      color: 'white',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none'
    },
    restaurantButton: {
      padding: '10px 20px',
      backgroundColor: '#ff6b35',
      color: 'white',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none'
    },
    userMenu: {
      position: 'relative'
    },
    userButton: {
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    userAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#d32f2f',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '8px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      minWidth: '200px',
      padding: '8px',
      zIndex: 1001
    },
    dropdownItem: {
      padding: '10px 12px',
      color: '#333',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      width: '100%',
      textAlign: 'left'
    },
    dropdownDivider: {
      height: '1px',
      backgroundColor: '#eee',
      margin: '8px 0'
    },
    roleTag: {
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '4px',
      fontWeight: '600',
      backgroundColor: isAdmin ? '#ede7f6' : '#fff3e0',
      color: isAdmin ? '#673ab7' : '#ff6b35'
    },
    loginButton: {
      padding: '10px 24px',
      backgroundColor: '#d32f2f',
      color: 'white',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      textDecoration: 'none'
    }
  };

  return (
    <>
      <nav style={styles.navbar}>
        <div style={styles.container}>
          <Link to="/" style={styles.logo}>
            <span>🍽️</span>
            <span>RotasyonYemek</span>
          </Link>

          <div style={styles.nav}>
            <Link to="/" style={styles.navLink}>Restoranlar</Link>

            {user && (
              <Link to="/siparislerim" style={styles.navLink}>Siparişlerim</Link>
            )}

            {user && !isAdmin && !isRestoran && (
              <Link to="/sepet" style={styles.cartButton}>
                <span>🛒</span>
                <span>Sepet</span>
                {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin" style={styles.adminButton}>
                <span>🛡️</span>
                <span>Admin Paneli</span>
              </Link>
            )}

            {isRestoran && (
              <Link to="/restoran-panel" style={styles.restaurantButton}>
                <span>🏪</span>
                <span>Restoran Panelim</span>
              </Link>
            )}

            {user ? (
              <div style={styles.userMenu} ref={userMenuRef}>
                <button style={styles.userButton} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <div style={styles.userAvatar}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.email?.split('@')[0]}</span>
                  {(isAdmin || isRestoran) && <span style={styles.roleTag}>{isAdmin ? 'Admin' : 'Restoran'}</span>}
                  <span style={{ fontSize: '10px' }}>▼</span>
                </button>

                {userMenuOpen && (
                  <div style={styles.dropdown}>
                    <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: '600' }}>{user.email?.split('@')[0]}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                    </div>

                    {!isAdmin && !isRestoran && (
                      <Link to="/profil" style={styles.dropdownItem}>
                        <span>👤</span>
                        <span>Profilim</span>
                      </Link>
                    )}

                    <div style={styles.dropdownDivider} />

                    <button onClick={handleLogout} style={{...styles.dropdownItem, color: '#d32f2f'}}>
                      <span>🚪</span>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" style={styles.loginButton}>Giriş Yap</Link>
            )}
          </div>
        </div>
      </nav>
      <div style={{ height: '70px' }} />
    </>
  );
};

export default Navbar;