import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

function Navbar() {
  const location = useLocation();
  const { user, logout, isAdmin, isRestoran } = useAuth();
  const { cartCount } = useCart();

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      backgroundColor: '#ff6b35',
      padding: '15px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* Logo */}
      <Link 
        to="/" 
        style={{ 
          color: 'white', 
          textDecoration: 'none', 
          fontSize: '24px', 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        🍕 RotasyonYemek
      </Link>

      {/* Menü Linkleri */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link 
          to="/" 
          style={{ 
            color: isActive('/') ? '#fff' : 'rgba(255,255,255,0.8)', 
            textDecoration: 'none',
            fontWeight: isActive('/') ? 'bold' : 'normal'
          }}
        >
          🏠 Ana Sayfa
        </Link>

        {user && (
          <>
            <Link 
              to="/siparislerim" 
              style={{ 
                color: isActive('/siparislerim') ? '#fff' : 'rgba(255,255,255,0.8)', 
                textDecoration: 'none'
              }}
            >
              📦 Siparişlerim
            </Link>

            <Link 
              to="/sepet" 
              style={{ 
                color: isActive('/sepet') ? '#fff' : 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                position: 'relative'
              }}
            >
              🛒 Sepet
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-12px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Admin/Restoran Panel Linki */}
            {isAdmin && (
              <Link 
                to="/admin" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none'
                }}
              >
                🛡️ Admin
              </Link>
            )}

            {isRestoran && (
              <Link 
                to="/restaurant" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none'
                }}
              >
                🏪 Panelim
              </Link>
            )}
          </>
        )}

        {user ? (
          <button
            onClick={logout}
            style={{
              backgroundColor: 'white',
              color: '#ff6b35',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            🚪 Çıkış
          </button>
        ) : (
          <Link 
            to="/login" 
            style={{
              backgroundColor: 'white',
              color: '#ff6b35',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            🔐 Giriş Yap
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;