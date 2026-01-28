import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  onSnapshot,
  onDocSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  queryCollection,
  onAuthStateChanged
} from '../supabaseHelpers';
import { ThemeContext } from '../App';
import { useNavigate } from 'react-router-dom';

// ✅ YENİ: İptal Sebepleri
const IPTAL_SEBEPLERI = [
  { id: 'yanlis_urun', label: 'Yanlış ürün seçtim' },
  { id: 'yanlis_adres', label: 'Yanlış adres girdim' },
  { id: 'vazgectim', label: 'Vazgeçtim' },
  { id: 'baska_restoran', label: 'Başka restoran tercih edeceğim' },
  { id: 'diger', label: 'Diğer' }
];

function Siparislerim() {
  // Ana State'ler
  const [siparisler, setSiparisler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  const [kullanici, setKullanici] = useState(null);

  // Tab Sistemi: "aktif" | "gecmis" | "tumu"
  const [aktifTab, setAktifTab] = useState("tumu");

  // Yorum Modal
  const [yorumModal, setYorumModal] = useState(null);
  const [puan, setPuan] = useState(5);
  const [yorum, setYorum] = useState("");
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);

  // Sohbet Modal
  const [sohbetModal, setSohbetModal] = useState(null);
  const [chatMesajlari, setChatMesajlari] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [mesajGonderiliyor, setMesajGonderiliyor] = useState(false);

  // ✅ YENİ: İptal Modal States
  const [iptalModal, setIptalModal] = useState(null);
  const [iptalSebebi, setIptalSebebi] = useState('');
  const [iptalYukleniyor, setIptalYukleniyor] = useState(false);

  // 🆕 PUAN & STREAK İLERİ KODU
  const [kullaniciBilgileri, setKullaniciBilgileri] = useState({
    puanBakiye: 0,
    toplamKazanilanPuan: 0,
    streakSayisi: 0
  });

  // Detay Modal (Yeni Özellik)
  const [detayModal, setDetayModal] = useState(null);

  // İstatistikler
  const [istatistikler, setIstatistikler] = useState({
    toplamSiparis: 0,
    toplamHarcama: 0,
    ortalamaFiyat: 0,
    enCokSiparis: null
  });

  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const msgRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Durum Sabitleri
  const AKTIF_DURUMLAR = ['Onay Bekliyor', 'Onaylandı', 'Hazırlanıyor', 'Yolda'];
  const TAMAMLANAN_DURUMLAR = ['Teslim Edildi', 'İptal Edildi'];
  // ===== SİPARİŞLERİ GETİR =====
  useEffect(() => {
    msgRef.current = new Audio('/message.mp3');
    let unsubSiparisler = null;

    const unsubAuth = onAuthStateChanged(async (user) => {
      if (user) {
        setKullanici(user);
        setHata(null);

        try {
          // Supabase ile sipariş dinleme
          unsubSiparisler = onSnapshot("siparisler", (snapshot) => {
            const data = snapshot.docs
              .filter(d => d.data().musteriId === user.id)
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => {
                const tarihA = a.tarih?.seconds || 0;
                const tarihB = b.tarih?.seconds || 0;
                return tarihB - tarihA;
              })
              .slice(0, 50); // Performans için limit
            setSiparisler(data);
            hesaplaIstatistikler(data);
            setYukleniyor(false);
            setHata(null);
          });
        } catch (err) {
          console.error("Query oluşturma hatası:", err);
          setHata({
            tip: 'genel',
            mesaj: 'Bağlantı hatası oluştu.',
            detay: err.message
          });
          setYukleniyor(false);
        }
      } else {
        setKullanici(null);
        setSiparisler([]);
        setYukleniyor(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSiparisler) unsubSiparisler();
    };
  }, []);

  // 🆕 Kullanıcı puan bilgilerini dinle
  useEffect(() => {
    if (!kullanici) return;

    const unsubUser = onDocSnapshot("kullanicilar", kullanici.id, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setKullaniciBilgileri({
          puanBakiye: data.puanBakiye || 0,
          toplamKazanilanPuan: data.toplamKazanilanPuan || 0,
          streakSayisi: data.streakSayisi || 0
        });
      }
    });

    return () => unsubUser();
  }, [kullanici]);

  // ===== İSTATİSTİKLERİ HESAPLA =====
  const hesaplaIstatistikler = useCallback((data) => {
    if (!data || data.length === 0) {
      setIstatistikler({
        toplamSiparis: 0,
        toplamHarcama: 0,
        ortalamaFiyat: 0,
        enCokSiparis: null
      });
      return;
    }

    const teslimEdilen = data.filter(s => s.durum === 'Teslim Edildi');
    const toplamHarcama = teslimEdilen.reduce((acc, s) => acc + (s.toplamTutar || 0), 0);

    // En çok sipariş verilen restoran
    const restoranSayilari = {};
    teslimEdilen.forEach(s => {
      if (s.restoranAd) {
        restoranSayilari[s.restoranAd] = (restoranSayilari[s.restoranAd] || 0) + 1;
      }
    });

    let enCok = null;
    let maxSayi = 0;
    Object.entries(restoranSayilari).forEach(([ad, sayi]) => {
      if (sayi > maxSayi) {
        maxSayi = sayi;
        enCok = { ad, sayi };
      }
    });

    setIstatistikler({
      toplamSiparis: data.length,
      toplamHarcama: toplamHarcama,
      ortalamaFiyat: teslimEdilen.length > 0 ? Math.round(toplamHarcama / teslimEdilen.length) : 0,
      enCokSiparis: enCok
    });
  }, []);

  // ===== SOHBET MESAJLARINI DİNLE =====
  useEffect(() => {
    if (!sohbetModal) {
      setChatMesajlari([]);
      return;
    }

    // Supabase ile mesajları dinle - subcollection yerine ana tablo kullanılıyor
    const unsubMsg = onSnapshot("siparis_mesajlari", (snap) => {
      const msgs = snap.docs
        .filter(d => d.data().siparisId === sohbetModal.id)
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.tarih?.seconds || 0) - (b.tarih?.seconds || 0));
      setChatMesajlari(msgs);

      // Yeni mesaj geldiğinde ses çal ve scroll yap
      if (msgs.length > 0 && msgs[msgs.length - 1].gonderen === "Restoran") {
        msgRef.current?.play().catch(() => { });
      }

      // Chat'i en alta scroll et
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubMsg();
  }, [sohbetModal]);

  // ===== FİLTRELENMİŞ SİPARİŞLER =====
  const filtrelenmis = siparisler.filter(s => {
    if (aktifTab === "aktif") return AKTIF_DURUMLAR.includes(s.durum);
    if (aktifTab === "gecmis") return TAMAMLANAN_DURUMLAR.includes(s.durum);
    return true; // "tumu"
  });

  // Aktif sipariş sayısı (badge için)
  const aktifSiparisSayisi = siparisler.filter(s => AKTIF_DURUMLAR.includes(s.durum)).length;

  // ===== YORUM GÖNDER =====
  const yorumGonder = async () => {
    if (!yorumModal || yorumGonderiliyor) return;
    setYorumGonderiliyor(true);

    try {
      await updateDoc("siparisler", yorumModal.id, {
        puan: puan,
        yorum: yorum,
        yorumYapildi: true,
        yorumTarihi: serverTimestamp()
      });

      await addDoc("restoran_yorumlari", {
        restoranId: yorumModal.restoranId,
        kullaniciId: kullanici.id,
        kullaniciAd: kullanici.user_metadata?.name || kullanici.email?.split('@')[0] || 'Müşteri',
        puan: puan,
        yorum: yorum,
        siparisId: yorumModal.id,
        tarih: serverTimestamp()
      });

      setYorumModal(null);
      setPuan(5);
      setYorum("");
    } catch (err) {
      console.error("Yorum gönderme hatası:", err);
      alert("Hata: " + err.message);
    } finally {
      setYorumGonderiliyor(false);
    }
  };

  // ===== MESAJ GÖNDER =====
  const mesajGonder = async (e) => {
    e.preventDefault();
    if (!yeniMesaj.trim() || !sohbetModal || mesajGonderiliyor) return;

    setMesajGonderiliyor(true);
    const mesajMetni = yeniMesaj.trim();
    setYeniMesaj(""); // Hemen temizle (UX için)

    try {
      await addDoc("siparis_mesajlari", {
        siparisId: sohbetModal.id,
        gonderen: "Müşteri",
        gonderenUid: kullanici?.id,
        gonderenEmail: kullanici?.email,
        mesaj: mesajMetni,
        tarih: serverTimestamp(),
        okundu: false
      });
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
      setYeniMesaj(mesajMetni); // Hata olursa geri koy
      alert("Mesaj gönderilemedi: " + error.message);
    } finally {
      setMesajGonderiliyor(false);
    }
  };

  // ===== SİPARİŞİ TEKRARLA =====
  const siparisiTekrarla = async (siparis) => {
    try {
      const restoranSnap = await getDoc("restoranlar", siparis.restoranId);

      if (!restoranSnap.exists()) {
        alert("Bu restoran artık mevcut değil!");
        return;
      }

      const restoranData = restoranSnap.data();
      if (!restoranData.acikMi) {
        alert("Restoran şu an kapalı! Açılınca tekrar deneyebilirsiniz.");
        return;
      }

      const sepetKey = `sepet_${siparis.restoranId}`;
      const yeniSepet = siparis.yemekler.map(yemek => ({
        id: yemek.id || Math.random().toString(36).substr(2, 9),
        ad: yemek.ad,
        fiyat: yemek.fiyat,
        adet: yemek.adet,
        sepetId: Math.random().toString(36).substr(2, 9),
        ekstralar: yemek.ekstralar || []
      }));

      localStorage.setItem(sepetKey, JSON.stringify(yeniSepet));
      navigate(`/restoran/${siparis.restoranId}`);

    } catch (error) {
      console.error("Sipariş tekrarlama hatası:", error);
      alert("Bir hata oluştu: " + error.message);
    }
  };

  // ===== HELPER FONKSİYONLAR =====
  const sohbetAktifMi = (durum) => !TAMAMLANAN_DURUMLAR.includes(durum);
  const yorumYapilabilirMi = (siparis) => siparis.durum === "Teslim Edildi" && !siparis.yorumYapildi && !siparis.puan;

  // ✅ YENİ: İptal kontrol fonksiyonları
  const iptalEdilabilirMi = (siparis) => {
    // Sadece "Onay Bekliyor" durumunda iptal edilebilir
    if (siparis.durum !== "Onay Bekliyor") return false;

    // Sipariş verildikten sonra 5 dakika içinde
    if (!siparis.tarih?.seconds) return true; // Tarih yoksa izin ver

    const siparisZamani = siparis.tarih.seconds * 1000;
    const simdi = Date.now();
    const farkDakika = (simdi - siparisZamani) / (1000 * 60);

    return farkDakika <= 5; // 5 dakika içindeyse true
  };

  const kalanIptalSuresi = (siparis) => {
    if (!siparis.tarih?.seconds) return null;

    const siparisZamani = siparis.tarih.seconds * 1000;
    const simdi = Date.now();
    const farkSaniye = Math.floor((simdi - siparisZamani) / 1000);
    const kalanSaniye = 300 - farkSaniye; // 5 dakika = 300 saniye

    if (kalanSaniye <= 0) return null;

    const dakika = Math.floor(kalanSaniye / 60);
    const saniye = kalanSaniye % 60;
    return `${dakika}:${saniye.toString().padStart(2, '0')}`;
  };

  // ✅ YENİ: Sipariş iptal fonksiyonu
  const siparisiIptalEt = async () => {
    if (!iptalModal || !iptalSebebi || iptalYukleniyor) return;

    setIptalYukleniyor(true);

    try {
      await updateDoc("siparisler", iptalModal.id, {
        durum: "İptal Edildi",
        iptalSebebi: IPTAL_SEBEPLERI.find(s => s.id === iptalSebebi)?.label || iptalSebebi,
        iptalEden: "Müşteri",
        iptalTarihi: serverTimestamp()
      });

      setIptalModal(null);
      setIptalSebebi('');
    } catch (error) {
      console.error("İptal hatası:", error);
      alert("Sipariş iptal edilemedi: " + error.message);
    } finally {
      setIptalYukleniyor(false);
    }
  };

  const getDurumRengi = (durum) => {
    const renkler = {
      'Onay Bekliyor': '#f59e0b',
      'Onaylandı': '#3b82f6',
      'Hazırlanıyor': '#8b5cf6',
      'Yolda': '#06b6d4',
      'Teslim Edildi': '#22c55e',
      'İptal Edildi': '#ef4444'
    };
    return renkler[durum] || '#6b7280';
  };

  const getDurumIcon = (durum) => {
    const iconlar = {
      'Onay Bekliyor': '⏳',
      'Onaylandı': '✅',
      'Hazırlanıyor': '👨‍🍳',
      'Yolda': '🛵',
      'Teslim Edildi': '🎉',
      'İptal Edildi': '❌'
    };
    return iconlar[durum] || '📦';
  };

  const formatTarih = (tarih) => {
    if (!tarih) return '';
    const date = tarih.seconds ? new Date(tarih.seconds * 1000) : new Date(tarih);
    const simdi = new Date();
    const fark = simdi - date;
    const birGun = 24 * 60 * 60 * 1000;

    if (fark < birGun && date.getDate() === simdi.getDate()) {
      return `Bugün ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (fark < 2 * birGun) {
      return `Dün ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // ===== GİRİŞ YAPILMAMIŞ =====
  if (!yukleniyor && !kullanici) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔐</div>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>
          Giriş Yapmalısınız
        </h2>
        <p style={{ color: 'var(--text-sub)', marginBottom: '25px' }}>
          Siparişlerinizi görmek için lütfen giriş yapın
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '14px 32px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  // ===== YÜKLENİYOR =====
  if (yukleniyor) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-sub)' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Siparişleriniz yükleniyor...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ===== HATA DURUMU =====
  if (hata && siparisler.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>{hata.mesaj}</h3>
        <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '20px' }}>
          {hata.tip === 'index' && 'Firebase Console\'dan gerekli index oluşturulmalı.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // ===== ANA SAYFA =====
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: 'var(--text-main)', margin: '0 0 5px 0', fontSize: '24px' }}>
          📦 Siparişlerim
        </h2>
        <p style={{ color: 'var(--text-sub)', margin: 0, fontSize: '14px' }}>
          Tüm sipariş geçmişinizi buradan takip edebilirsiniz
        </p>
      </div>

      {/* ===== İSTATİSTİK KARTLARI ===== */}
      {siparisler.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '25px'
        }}>
          {/* 🆕 Puan Kartı */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              🎯 {kullaniciBilgileri.puanBakiye.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              Puan Bakiyesi
            </div>
          </div>

          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {istatistikler.toplamSiparis}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
              Toplam Sipariş
            </div>
          </div>

          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
              {istatistikler.toplamHarcama} ₺
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
              Toplam Harcama
            </div>
          </div>

          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {istatistikler.ortalamaFiyat} ₺
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
              Ortalama Sipariş
            </div>
          </div>

          {istatistikler.enCokSiparis && (
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                ❤️ {istatistikler.enCokSiparis.ad.length > 12
                  ? istatistikler.enCokSiparis.ad.slice(0, 12) + '...'
                  : istatistikler.enCokSiparis.ad}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
                {istatistikler.enCokSiparis.sayi} kez sipariş
              </div>
            </div>
          )}

          {/* 🆕 Streak Kartı */}
          {kullaniciBilgileri.streakSayisi > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                🔥 {kullaniciBilgileri.streakSayisi}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                Sipariş Serisi
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB MENÜ ===== */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        background: 'var(--bg-body)',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        {[
          { key: 'tumu', label: 'Tümü', count: siparisler.length },
          { key: 'aktif', label: 'Aktif', count: aktifSiparisSayisi },
          { key: 'gecmis', label: 'Geçmiş', count: siparisler.length - aktifSiparisSayisi }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: aktifTab === tab.key ? 'var(--primary)' : 'transparent',
              color: aktifTab === tab.key ? 'white' : 'var(--text-sub)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: aktifTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--border-color)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== BOŞ DURUM ===== */}
      {filtrelenmis.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-sub)',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {aktifTab === 'aktif' ? '🚀' : aktifTab === 'gecmis' ? '📋' : '📦'}
          </div>
          <p style={{ fontSize: '16px', margin: '0 0 8px 0', color: 'var(--text-main)' }}>
            {aktifTab === 'aktif'
              ? 'Aktif siparişiniz yok'
              : aktifTab === 'gecmis'
                ? 'Henüz tamamlanmış sipariş yok'
                : 'Henüz siparişiniz bulunmuyor'}
          </p>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {aktifTab === 'tumu' && 'Hadi lezzetli bir şeyler sipariş edelim!'}
          </p>
          {aktifTab === 'tumu' && (
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              🍽️ Restoranları Keşfet
            </button>
          )}
        </div>
      )}

      {/* ===== SİPARİŞ LİSTESİ ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filtrelenmis.map(s => (
          <div
            key={s.id}
            style={{
              background: 'var(--card-bg)',
              border: AKTIF_DURUMLAR.includes(s.durum)
                ? `2px solid ${getDurumRengi(s.durum)}`
                : '1px solid var(--border-color)',
              padding: '20px',
              borderRadius: '16px',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Aktif Sipariş Göstergesi */}
            {AKTIF_DURUMLAR.includes(s.durum) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, ${getDurumRengi(s.durum)}, transparent)`,
                animation: 'shimmer 2s infinite'
              }} />
            )}
            <style>{`
              @keyframes shimmer {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '15px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3
                  style={{
                    margin: 0,
                    color: 'var(--text-main)',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/restoran/${s.restoranId}`)}
                >
                  🍽️ {s.restoranAd}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '6px' }}>
                  📅 {formatTarih(s.tarih)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                  🔖 #{s.id.slice(-6).toUpperCase()}
                </div>
              </div>

              <div style={{
                background: getDurumRengi(s.durum),
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                {getDurumIcon(s.durum)} {s.durum}
              </div>
            </div>

            {/* Ürünler */}
            <div style={{
              padding: '14px',
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: '12px',
              marginBottom: '15px'
            }}>
              {s.yemekler?.slice(0, 3).map((y, i) => (
                <div key={i} style={{
                  fontSize: '14px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--text-main)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {y.adet}x
                    </span>
                    {y.ad}
                    {y.secilenOpsiyonlar?.length > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                        (+{y.secilenOpsiyonlar.length} ekstra)
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{(y.fiyat * y.adet)} ₺</span>
                </div>
              ))}

              {s.yemekler?.length > 3 && (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--border-color)'
                  }}
                  onClick={() => setDetayModal(s)}
                >
                  +{s.yemekler.length - 3} ürün daha • Tümünü gör
                </div>
              )}

              {/* Kampanya */}
              {s.indirim > 0 && (
                <div style={{
                  fontSize: '13px',
                  color: '#22c55e',
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--border-color)'
                }}>
                  <span>🎉 {s.kampanya || 'İndirim'}</span>
                  <span>-{s.indirim} ₺</span>
                </div>
              )}

              {/* Toplam */}
              <div style={{
                borderTop: '2px solid var(--border-color)',
                marginTop: '10px',
                paddingTop: '10px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '17px',
                color: 'var(--primary)'
              }}>
                <span>Toplam</span>
                <span>{s.toplamTutar} ₺</span>
              </div>

              {/* 🆕 Kazanılan Puan */}
              {s.durum === 'Teslim Edildi' && s.kazanilacakPuan > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px dashed var(--border-color)',
                  color: '#8b5cf6',
                  fontSize: '13px'
                }}>
                  <span>🎁 Kazanılan Puan</span>
                  <span style={{ fontWeight: 'bold' }}>+{s.kazanilacakPuan}</span>
                </div>
              )}

              {/* 🆕 Kullanılan Puan/Kupon */}
              {(s.kullanilanPuan > 0 || s.kuponKodu) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-sub)' }}>
                  {s.kullanilanPuan > 0 && (
                    <span style={{ marginRight: '15px' }}>🎯 -{s.puanIndirimi}₺ (puan)</span>
                  )}
                  {s.kuponKodu && (
                    <span>🎫 {s.kuponKodu}</span>
                  )}
                </div>
              )}
            </div>

            {/* Adres & Ödeme */}
            <div style={{
              fontSize: '13px',
              color: 'var(--text-sub)',
              marginBottom: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {s.adres && <div>📍 {s.adres}</div>}
              {s.odemeYontemi && <div>💳 {s.odemeYontemi}</div>}
              {s.not && <div>📝 Not: {s.not}</div>}
            </div>

            {/* Butonlar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSohbetModal(s)}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '12px 15px',
                  background: sohbetAktifMi(s.durum) ? 'var(--primary)' : 'var(--bg-body)',
                  color: sohbetAktifMi(s.durum) ? 'white' : 'var(--text-sub)',
                  border: sohbetAktifMi(s.durum) ? 'none' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                💬 {sohbetAktifMi(s.durum) ? 'Mesaj Gönder' : 'Mesajlar'}
              </button>

              {/* ✅ YENİ: İptal / İletişim Butonu */}
              {AKTIF_DURUMLAR.includes(s.durum) && (
                <>
                  {iptalEdilabilirMi(s) ? (
                    <button
                      onClick={() => setIptalModal(s)}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        padding: '12px 15px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      ❌ İptal Et
                      {kalanIptalSuresi(s) && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}>
                          {kalanIptalSuresi(s)}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSohbetModal(s)}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        padding: '12px 15px',
                        background: 'rgba(249, 115, 22, 0.1)',
                        color: '#f97316',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      📞 İptal için İletişim
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => siparisiTekrarla(s)}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '12px 15px',
                  background: 'var(--bg-body)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🔄 Tekrarla
              </button>

              {yorumYapilabilirMi(s) && (
                <button
                  onClick={() => setYorumModal(s)}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '12px 15px',
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  ⭐ Değerlendir
                </button>
              )}

              {s.puan && (
                <div style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '12px 15px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  {'⭐'.repeat(s.puan)}
                  <span style={{ color: '#22c55e', fontWeight: '500' }}>Değerlendirildi</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===== DETAY MODALI ===== */}
      {detayModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}
          onClick={() => setDetayModal(null)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '450px',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '25px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>📋 Sipariş Detayı</h3>
              <button
                onClick={() => setDetayModal(null)}
                style={{
                  background: 'var(--bg-body)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>

            {detayModal.yemekler?.map((y, i) => (
              <div key={i} style={{
                padding: '12px',
                background: 'var(--bg-body)',
                borderRadius: '10px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {y.adet}x {y.ad}
                  </div>
                  {y.secilenOpsiyonlar?.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
                      + {y.secilenOpsiyonlar.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                  {y.fiyat * y.adet} ₺
                </div>
              </div>
            ))}

            <div style={{
              borderTop: '2px solid var(--border-color)',
              marginTop: '15px',
              paddingTop: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'var(--primary)'
            }}>
              <span>Toplam</span>
              <span>{detayModal.toplamTutar} ₺</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== SOHBET MODALI (Mevcut kodun aynısı) ===== */}
      {sohbetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '17px' }}>
                  💬 {sohbetModal.restoranAd}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '3px' }}>
                  Sipariş #{sohbetModal.id.slice(-6).toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setSohbetModal(null)}
                style={{
                  background: 'var(--bg-body)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-sub)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Durum */}
            <div style={{
              padding: '12px 20px',
              background: sohbetAktifMi(sohbetModal.durum) ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500',
              color: sohbetAktifMi(sohbetModal.durum) ? 'var(--primary)' : '#ef4444'
            }}>
              {sohbetAktifMi(sohbetModal.durum)
                ? `${getDurumIcon(sohbetModal.durum)} Sipariş: ${sohbetModal.durum}`
                : `🔒 Sohbet kapalı (${sohbetModal.durum})`}
            </div>

            {/* Mesajlar */}
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '280px',
                background: 'var(--bg-body)'
              }}
            >
              {chatMesajlari.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '50px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💬</div>
                  <p style={{ margin: '0 0 5px 0' }}>Henüz mesaj yok</p>
                  {sohbetAktifMi(sohbetModal.durum) && (
                    <small>Restorana soru sormak için mesaj yazabilirsiniz</small>
                  )}
                </div>
              ) : (
                chatMesajlari.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    style={{
                      alignSelf: msg.gonderen === "Müşteri" ? 'flex-end' : 'flex-start',
                      maxWidth: '80%'
                    }}
                  >
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.gonderen === "Müşteri" ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.gonderen === "Müşteri" ? 'var(--primary)' : 'var(--card-bg)',
                      color: msg.gonderen === "Müşteri" ? 'white' : 'var(--text-main)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      {msg.mesaj}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-sub)',
                      marginTop: '4px',
                      textAlign: msg.gonderen === "Müşteri" ? 'right' : 'left'
                    }}>
                      {msg.gonderen === "Restoran" && "🍽️ "}
                      {msg.tarih?.seconds
                        ? new Date(msg.tarih.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mesaj Input */}
            <form onSubmit={mesajGonder} style={{
              padding: '15px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '10px',
              background: 'var(--card-bg)'
            }}>
              <input
                value={yeniMesaj}
                onChange={e => setYeniMesaj(e.target.value)}
                placeholder={sohbetAktifMi(sohbetModal.durum) ? "Mesajınızı yazın..." : "Sohbet kapalı"}
                disabled={!sohbetAktifMi(sohbetModal.durum) || mesajGonderiliyor}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  background: 'var(--bg-body)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={!sohbetAktifMi(sohbetModal.durum) || !yeniMesaj.trim() || mesajGonderiliyor}
                style={{
                  padding: '14px 24px',
                  background: (sohbetAktifMi(sohbetModal.durum) && yeniMesaj.trim()) ? 'var(--primary)' : 'var(--border-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {mesajGonderiliyor ? '...' : 'Gönder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== YORUM MODALI (Mevcut kodun aynısı) ===== */}
      {yorumModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '30px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>⭐</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>Siparişi Değerlendir</h3>
              <p style={{ color: 'var(--text-sub)', margin: 0, fontSize: '14px' }}>{yorumModal.restoranAd}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
              {[1, 2, 3, 4, 5].map(p => (
                <span
                  key={p}
                  onClick={() => setPuan(p)}
                  style={{
                    fontSize: '40px',
                    cursor: 'pointer',
                    filter: p <= puan ? 'none' : 'grayscale(100%)',
                    opacity: p <= puan ? 1 : 0.3,
                    transition: 'all 0.2s',
                    transform: p <= puan ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-main)', fontSize: '14px' }}>
              {['', '😞 Çok Kötü', '😕 Kötü', '😐 Orta', '😊 İyi', '🤩 Mükemmel!'][puan]}
            </div>

            <textarea
              placeholder="Deneyiminizi paylaşın... (opsiyonel)"
              value={yorum}
              onChange={e => setYorum(e.target.value)}
              style={{
                width: '100%',
                padding: '15px',
                background: 'var(--bg-body)',
                color: 'var(--text-main)',
                border: '2px solid var(--border-color)',
                borderRadius: '14px',
                height: '100px',
                resize: 'none',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />

            <button
              onClick={yorumGonder}
              disabled={yorumGonderiliyor}
              style={{
                width: '100%',
                padding: '16px',
                marginTop: '20px',
                background: yorumGonderiliyor ? 'var(--border-color)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: yorumGonderiliyor ? 'not-allowed' : 'pointer'
              }}
            >
              {yorumGonderiliyor ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
            </button>

            <button
              onClick={() => { setYorumModal(null); setPuan(5); setYorum(""); }}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '10px',
                background: 'transparent',
                color: 'var(--text-sub)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ===== İPTAL MODALI ===== */}
      {iptalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '420px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              padding: '25px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>❌</div>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Siparişi İptal Et</h3>
              <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
                {iptalModal.restoranAd}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '25px' }}>
              {/* Uyarı */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  <strong>Dikkat:</strong> İptal işlemi geri alınamaz.
                  İptal sonrası aynı siparişi tekrar verebilirsiniz.
                </div>
              </div>

              {/* Sipariş Özeti */}
              <div style={{
                background: 'var(--bg-body)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  Sipariş No: #{iptalModal.id.slice(-6).toUpperCase()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                    {iptalModal.yemekler?.length || 0} ürün
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '18px' }}>
                    {iptalModal.toplamTutar} ₺
                  </span>
                </div>
              </div>

              {/* İptal Sebebi */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-main)'
                }}>
                  İptal Sebebi Seçin *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {IPTAL_SEBEPLERI.map(sebep => (
                    <label
                      key={sebep.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 15px',
                        background: iptalSebebi === sebep.id ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-body)',
                        border: `2px solid ${iptalSebebi === sebep.id ? '#ef4444' : 'transparent'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="iptal_sebebi"
                        value={sebep.id}
                        checked={iptalSebebi === sebep.id}
                        onChange={() => setIptalSebebi(sebep.id)}
                        style={{ accentColor: '#ef4444' }}
                      />
                      <span style={{
                        color: iptalSebebi === sebep.id ? '#ef4444' : 'var(--text-main)',
                        fontSize: '14px'
                      }}>
                        {sebep.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px 25px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={() => { setIptalModal(null); setIptalSebebi(''); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--bg-body)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={siparisiIptalEt}
                disabled={!iptalSebebi || iptalYukleniyor}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: iptalSebebi && !iptalYukleniyor ? '#ef4444' : 'var(--border-color)',
                  color: iptalSebebi && !iptalYukleniyor ? 'white' : 'var(--text-sub)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: iptalSebebi && !iptalYukleniyor ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                {iptalYukleniyor ? '⏳ İptal Ediliyor...' : '❌ Siparişi İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Siparislerim;