import React, { useState, useEffect } from 'react';
import {
  onSnapshot,
  updateDoc,
  onAuthStateChanged,
  getCurrentUser
} from '../supabaseHelpers';

function MagazaPaneli() {
  const [restoran, setRestoran] = useState(null);
  const [siparisler, setSiparisler] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) return;

      // Sadece bu sahibe ait restoranı getir
      const unsubRes = onSnapshot("restoranlar", (snap) => {
        const mevcutRestoran = snap.docs.find(d =>
          d.data().sahipEmail === currentUser.email.toLowerCase()
        );

        if (mevcutRestoran) {
          const resData = { id: mevcutRestoran.id, ...mevcutRestoran.data() };
          setRestoran(resData);

          // Bu restoranın siparişlerini getir
          const unsubSip = onSnapshot("siparisler", (sipSnap) => {
            const filtrelenmis = sipSnap.docs
              .filter(d => d.data().restoranId === resData.id)
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0));
            setSiparisler(filtrelenmis);
          });
          return () => unsubSip();
        }
      });
      return () => unsubRes();
    });
    return () => unsubAuth();
  }, []);

  const durumGuncelle = async (id, yeni) => {
    await updateDoc("siparisler", id, { durum: yeni });
  };

  if (!restoran) return <div style={{ color: 'white', padding: '50px' }}>Mağazanız yükleniyor veya yetkiniz yok...</div>;

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', color: 'white', padding: '30px' }}>
      <h2>🏪 {restoran.isim} Yönetim Paneli</h2>
      <p style={{ color: '#8b949e' }}>Hoş geldiniz, mağazanız şu an <strong>{restoran.durum ? "Açık" : "Kapalı"}</strong></p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        {/* BEKLEYEN SİPARİŞLER */}
        <div style={{ background: '#161b22', padding: '20px', borderRadius: '15px', border: '1px solid #30363d' }}>
          <h3>🔥 Hazırlanan Siparişler</h3>
          {siparisler.filter(s => s.durum === "Hazırlanıyor").map(s => (
            <div key={s.id} style={{ borderBottom: '1px solid #30363d', padding: '15px 0' }}>
              <p><strong>Müşteri:</strong> {s.musteriEmail}</p>
              <p><strong>Ürünler:</strong> {s.yemekler.map(y => `${y.adet}x ${y.ad}`).join(", ")}</p>
              <p>📍 {s.adres}</p>
              <button onClick={() => durumGuncelle(s.id, "Yolda")} style={{ background: '#1f6feb', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>🛵 Yola Çıkar</button>
            </div>
          ))}
        </div>

        {/* YOLDAKİ SİPARİŞLER */}
        <div style={{ background: '#161b22', padding: '20px', borderRadius: '15px', border: '1px solid #30363d' }}>
          <h3>🚚 Yoldaki Siparişler</h3>
          {siparisler.filter(s => s.durum === "Yolda").map(s => (
            <div key={s.id} style={{ borderBottom: '1px solid #30363d', padding: '15px 0' }}>
              <p><strong>Müşteri:</strong> {s.musteriEmail}</p>
              <button onClick={() => durumGuncelle(s.id, "Teslim Edildi")} style={{ background: '#238636', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>✅ Teslim Edildi</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MagazaPaneli;