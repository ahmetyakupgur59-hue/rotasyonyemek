import React from 'react';
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Navbar />
      
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '40px 20px',
        marginTop: '50px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '30px'
        }}>
          <div>
            <h3 style={{ marginBottom: '15px' }}>🍕 RotasyonYemek</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              En sevdiğiniz restoranlardan kapınıza teslimat.
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '15px' }}>Hızlı Linkler</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Ana Sayfa</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="/siparislerim" style={{ color: '#94a3b8', textDecoration: 'none' }}>Siparişlerim</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="/profil" style={{ color: '#94a3b8', textDecoration: 'none' }}>Profilim</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '15px' }}>İletişim</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              📧 destek@rotasyonyemek.com
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              📞 0850 XXX XX XX
            </p>
          </div>
        </div>

        <div style={{
          maxWidth: '1200px',
          margin: '30px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid #334155',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '14px'
        }}>
          © 2024 RotasyonYemek. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;