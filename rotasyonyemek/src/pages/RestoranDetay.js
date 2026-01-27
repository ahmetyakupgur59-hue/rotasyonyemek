

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, addDoc, serverTimestamp, query, where, doc,
  onSnapshot, orderBy, updateDoc, arrayUnion, arrayRemove, getDoc,
  increment, getDocs // 🆕 EKLENDİ
} from 'firebase/firestore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeContext } from '../App';
import '../styles/restoran.css';
// 📧 EMAIL SERVİSİ
import { siparisOnayEmaili } from '../services/emailService';


// ==================== HELPER ====================
const generateId = () => Math.random().toString(36).substr(2, 9);
const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// ✅ YENİ: ALLERJEN LİSTESİ
const ALLERJENLER = [
  { id: 'gluten', ad: 'Gluten', icon: '🌾' },
  { id: 'sut', ad: 'Süt/Laktoz', icon: '🥛' },
  { id: 'yumurta', ad: 'Yumurta', icon: '🥚' },
  { id: 'fistik', ad: 'Fıstık', icon: '🥜' },
  { id: 'kabuklu', ad: 'Kabuklu Yemişler', icon: '🌰' },
  { id: 'balik', ad: 'Balık', icon: '🐟' },
  { id: 'deniz', ad: 'Deniz Ürünleri', icon: '🦐' },
  { id: 'soya', ad: 'Soya', icon: '🫘' },
  { id: 'kereviz', ad: 'Kereviz', icon: '🥬' },
  { id: 'hardal', ad: 'Hardal', icon: '🟡' },
  { id: 'susam', ad: 'Susam', icon: '⚪' },
  { id: 'sulfur', ad: 'Sülfür Dioksit', icon: '🍷' }
];

// Custom Hook for Mobile Detection
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsMobile(window.innerWidth < breakpoint), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timeoutId); };
  }, [breakpoint]);
  return isMobile;
}

// ==================== MAIN COMPONENT ====================
function RestoranDetay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useContext(ThemeContext);
  const isMobile = useIsMobile();
  const msgRef = useRef(null);

  // ===== STATE =====
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [restoranBilgi, setRestoranBilgi] = useState(null);
  const [menuler, setMenuler] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [sepet, setSepet] = useState([]);

  const [aktifKampanyalar, setAktifKampanyalar] = useState([]);
  const [seciliKampanyaIndex, setSeciliKampanyaIndex] = useState(null);
  const [kayitliAdresler, setKayitliAdresler] = useState([]);
  const [siparisNotu, setSiparisNotu] = useState('');
  const [seciliAdres, setSeciliAdres] = useState(null);
  const [odemeYontemi, setOdemeYontemi] = useState('Nakit');
  const [isFavorite, setIsFavorite] = useState(false);

  // YORUM STATE'LERİ - Sadece listeleme için (form kaldırıldı)
  const [yorumlar, setYorumlar] = useState([]);

  const [secilenYemek, setSecilenYemek] = useState(null);
  const [secenekModalAcik, setSecenekModalAcik] = useState(false);
  const [secimler, setSecimler] = useState([]);

  // YENİ: Upsell ve Sipariş Modalları
  const [upsellModalAcik, setUpsellModalAcik] = useState(false);
  const [siparisModalAcik, setSiparisModalAcik] = useState(false);

  const [saatlerModalAcik, setSaatlerModalAcik] = useState(false);
  const [galeriModalAcik, setGaleriModalAcik] = useState(false);
  const [galeriIndex, setGaleriIndex] = useState(0);

  const [aktifSiparisId, setAktifSiparisId] = useState(null);
  const [aktifSiparisDurum, setAktifSiparisDurum] = useState("");
  const [chatMesajlari, setChatMesajlari] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState("");

  // 🆕 PUAN & KUPON STATE'LERİ
  const [puanKullan, setPuanKullan] = useState(false);
  const [kullanilacakPuan, setKullanilacakPuan] = useState(0);
  const [kullaniciBilgileri, setKullaniciBilgileri] = useState({
    puanBakiye: 0,
    streakSayisi: 0
  });
  const [platformAyarlari, setPlatformAyarlari] = useState({
    puanKazanimOrani: 1,
    puanHarcamaOrani: 100,
    minPuanKullanim: 500,
    streakHedef: 5,
    streakBonusPuan: 50
  });
  const [kuponKodu, setKuponKodu] = useState('');
  const [uygulananKupon, setUygulananKupon] = useState(null);
  const [kuponHatasi, setKuponHatasi] = useState('');
  const [kuponYukleniyor, setKuponYukleniyor] = useState(false);


  // ✅ YENİ: Premium Bildirim State'i
  const [bildirim, setBildirim] = useState(null);

  // ===== DATA FETCHING =====
  useEffect(() => {
    msgRef.current = new Audio('/message.mp3');

    // ANİMASYON STİLİNİ EKLE
    const styleId = 'cart-animation-style';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement("style");
      styleSheet.id = styleId;
      styleSheet.innerText = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          20% { opacity: 1; transform: translate(-50%, 0); }
          80% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }`;
      document.head.appendChild(styleSheet);
    }

    const kayitliSepet = localStorage.getItem('sepet_' + id);
    if (kayitliSepet) {
      try { setSepet(JSON.parse(kayitliSepet)); } catch (e) { }
    }

    // URL parametresine göre sepeti otomatik aç
    // Sepet.js'den gelen yönlendirme için
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('sepetAc') === 'true') {
      setTimeout(() => setSiparisModalAcik(true), 500); // Veri yüklenene kadar az bekle
    }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // ✅ Kullanıcı verilerini tek seferde çek
        const userDoc = await getDoc(doc(db, "kullanicilar", u.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Adresleri al
          const adresList = userData.adresler || [];
          setKayitliAdresler(adresList);

          // 🔥 Önce localStorage kontrol et
          const kayitliAdresId = localStorage.getItem('seciliAdresId');
          const bulunan = adresList.find(a => a.id === kayitliAdresId);

          if (bulunan) {
            setSeciliAdres(bulunan);
          } else if (adresList.length > 0) {
            // 🔥 Bulunamazsa ilk adresi seç ve localStorage'a kaydet
            setSeciliAdres(adresList[0]);
            localStorage.setItem('seciliAdresId', adresList[0].id);
          }

          // Favori kontrolü
          const favoriler = userData.favoriRestoranlar || userData.favoriler || [];
          setIsFavorite(favoriler.includes(id));
        }
      }
    });

    if (!id) { setError("Restoran ID bulunamadı"); setLoading(false); return; }

    const unsubRestoran = onSnapshot(doc(db, "restoranlar", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRestoranBilgi(data);
        setAktifKampanyalar((data.kampanyalar || []).filter(k => k.aktif !== false));

        const qMenu = query(collection(db, "yemekler"), where("restoranId", "==", id));
        onSnapshot(qMenu, (snap) => {
          setMenuler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
      } else { setError("Restoran bulunamadı"); setLoading(false); }
    }, (err) => { setError("Hata: " + err.message); setLoading(false); });

    const unsubYorumlar = onSnapshot(
      query(collection(db, "restoranlar", id, "yorumlar"), orderBy("tarih", "desc")),
      (snap) => setYorumlar(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubAuth(); unsubRestoran(); unsubYorumlar(); };
  }, [id]);

  useEffect(() => {
    if (id) localStorage.setItem('sepet_' + id, JSON.stringify(sepet));
  }, [sepet, id]);

  // 🆕 Platform ayarlarını ve kullanıcı puan bilgilerini çek
  useEffect(() => {
    // Platform ayarları
    const unsubAyarlar = onSnapshot(doc(db, "sistem", "ayarlar"), (snap) => {
      if (snap.exists()) {
        setPlatformAyarlari(prev => ({ ...prev, ...snap.data() }));
      }
    });

    return () => unsubAyarlar();
  }, []);

  // 🆕 Kullanıcı puan bilgilerini dinle
  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "kullanicilar", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setKullaniciBilgileri({
          puanBakiye: data.puanBakiye || 0,
          streakSayisi: data.streakSayisi || 0
        });
      }
    });

    return () => unsubUser();
  }, [user]);

  useEffect(() => {
    if (!aktifSiparisId) return;
    const unsubSiparis = onSnapshot(doc(db, "siparisler", aktifSiparisId), (s) => {
      if (s.exists()) setAktifSiparisDurum(s.data().durum);
    });
    const unsubMsg = onSnapshot(
      query(collection(db, "siparisler", aktifSiparisId, "mesajlar"), orderBy("tarih", "asc")),
      (s) => {
        const msgs = s.docs.map(d => d.data());
        setChatMesajlari(msgs);
        if (msgs.length > 0 && msgs[msgs.length - 1].gonderen === "Restoran") {
          msgRef.current?.play().catch(() => { });
        }
      }
    );
    return () => { unsubSiparis(); unsubMsg(); };
  }, [aktifSiparisId]);

  // ===== 🔥 MERKEZİ BÖLGE SİSTEMİ İLE EŞLEŞTIRME =====
  const bolgeBilgisi = useMemo(() => {
    // Varsayılan değerler
    const varsayilan = {
      bulundu: true,
      limit: restoranBilgi?.minSepet || 0,
      teslimatUcreti: restoranBilgi?.teslimatUcreti || 0,
      bolgeAdi: null
    };

    // Restoran veya adres yoksa varsayılanı döndür
    if (!restoranBilgi || !seciliAdres) {
      return varsayilan;
    }

    // Restoran bölge tanımlamadıysa, genel değerleri kullan
    if (!restoranBilgi.bolgeler || restoranBilgi.bolgeler.length === 0) {
      return varsayilan;
    }

    // 🎯 YENİ FORMAT: Şehir + İlçe + Mahalle ile eşleştirme
    const eslesen = restoranBilgi.bolgeler.find(bolge => {
      // Yeni format kontrolü (şehir, ilçe, mahalle alanları var mı?)
      if (bolge.sehir && bolge.ilce && bolge.mahalle) {
        return (
          bolge.sehir.toLowerCase().trim() === (seciliAdres.sehir || '').toLowerCase().trim() &&
          bolge.ilce.toLowerCase().trim() === (seciliAdres.ilce || '').toLowerCase().trim() &&
          bolge.mahalle.toLowerCase().trim() === (seciliAdres.mahalle || '').toLowerCase().trim()
        );
      }

      // 📌 ESKİ FORMAT UYUMLULUĞU: Sadece mahalle adı ile eşleştirme
      if (bolge.ad) {
        return bolge.ad.toLowerCase().trim() === (seciliAdres.mahalle || '').toLowerCase().trim();
      }

      return false;
    });

    if (eslesen) {
      return {
        bulundu: true,
        limit: eslesen.minSepet || eslesen.limit || restoranBilgi.minSepet || 0,
        teslimatUcreti: eslesen.teslimatUcreti ?? restoranBilgi.teslimatUcreti ?? 0,
        bolgeAdi: eslesen.mahalle || eslesen.ad || 'Tanımsız',
        // Ek bilgiler
        sehir: eslesen.sehir,
        ilce: eslesen.ilce,
        mahalle: eslesen.mahalle || eslesen.ad
      };
    } else {
      // Bölge bulunamadı - hizmet verilmiyor
      return {
        bulundu: false,
        limit: 0,
        teslimatUcreti: 0,
        bolgeAdi: null
      };
    }
  }, [restoranBilgi, seciliAdres]);

  // ===== ADRES BÖLGE KONTROLÜ (Sipariş Modalı İçin) =====
  const adresBolgeKontrolu = useCallback((adres) => {
    if (!restoranBilgi?.bolgeler || restoranBilgi.bolgeler.length === 0) {
      return { hizmetVar: true, bolge: null };
    }

    const eslesen = restoranBilgi.bolgeler.find(bolge => {
      // Yeni format
      if (bolge.sehir && bolge.ilce && bolge.mahalle) {
        return (
          bolge.sehir.toLowerCase().trim() === (adres.sehir || '').toLowerCase().trim() &&
          bolge.ilce.toLowerCase().trim() === (adres.ilce || '').toLowerCase().trim() &&
          bolge.mahalle.toLowerCase().trim() === (adres.mahalle || '').toLowerCase().trim()
        );
      }
      // Eski format
      if (bolge.ad) {
        return bolge.ad.toLowerCase().trim() === (adres.mahalle || '').toLowerCase().trim();
      }
      return false;
    });

    return {
      hizmetVar: !!eslesen,
      bolge: eslesen || null
    };
  }, [restoranBilgi]);

  // ===== ÖNERİLEN ÜRÜNLER - UPSELL (MADDE 4) =====
  const onerilenUrunler = useMemo(() => {
    // Önce restoranın belirlediği önerilen ürünlere bak
    if (restoranBilgi?.onerilenUrunler && restoranBilgi.onerilenUrunler.length > 0) {
      const onerilen = menuler.filter(m => restoranBilgi.onerilenUrunler.includes(m.id));
      if (onerilen.length > 0) return onerilen.slice(0, 4);
    }

    // Yoksa otomatik: İçecek ve Tatlı kategorisinden
    const icecekler = menuler.filter(m =>
      m.kategori?.toLowerCase().includes('içecek') ||
      m.kategori?.toLowerCase().includes('icecek') ||
      m.kategori?.toLowerCase().includes('drink')
    );

    const tatlilar = menuler.filter(m =>
      m.kategori?.toLowerCase().includes('tatlı') ||
      m.kategori?.toLowerCase().includes('tatli') ||
      m.kategori?.toLowerCase().includes('dessert')
    );

    // Sepetteki ürünleri hariç tut
    const sepettekiIdler = sepet.map(s => s.id);
    const filtrelenmis = [...icecekler, ...tatlilar].filter(m => !sepettekiIdler.includes(m.id));

    // Rastgele 4 tane seç
    const karisik = filtrelenmis.sort(() => Math.random() - 0.5);
    return karisik.slice(0, 4);
  }, [menuler, restoranBilgi, sepet]);

  // ===== CALCULATIONS =====
  const filtrelenmisMenuler = useMemo(() => {
    if (!aramaMetni.trim()) return menuler;
    const aranan = aramaMetni.toLowerCase();
    return menuler.filter(y =>
      y.ad.toLowerCase().includes(aranan) ||
      y.aciklama?.toLowerCase().includes(aranan) ||
      y.kategori?.toLowerCase().includes(aranan)
    );
  }, [menuler, aramaMetni]);

  const kategoriler = useMemo(() => {
    const grouped = {};
    filtrelenmisMenuler.forEach(yemek => {
      const kat = yemek.kategori || 'Genel';
      if (!grouped[kat]) grouped[kat] = [];
      grouped[kat].push(yemek);
    });
    return grouped;
  }, [filtrelenmisMenuler]);

  const araToplam = useMemo(() => {
    return sepet.reduce((acc, item) => {
      const ekstra = item.ekstralar?.reduce((t, e) => t + (Number(e.fiyat) || 0), 0) || 0;
      return acc + (item.fiyat + ekstra) * item.adet;
    }, 0);
  }, [sepet]);

  const uygunKampanyalar = useMemo(() => {
    return aktifKampanyalar.filter(k => araToplam >= (k.minSepet || 0));
  }, [aktifKampanyalar, araToplam]);

  const seciliKampanya = useMemo(() => {
    if (seciliKampanyaIndex === null) return null;
    return uygunKampanyalar[seciliKampanyaIndex] || null;
  }, [seciliKampanyaIndex, uygunKampanyalar]);

  const indirimTutari = useMemo(() => {
    if (!seciliKampanya || araToplam < (seciliKampanya.minSepet || 0)) return 0;

    switch (seciliKampanya.tip) {
      case 'yuzde':
        return Math.round((araToplam * seciliKampanya.deger) / 100);
      case 'tutar':
        return Math.min(seciliKampanya.deger, araToplam);
      case 'ilk_siparis':
        return Math.round((araToplam * seciliKampanya.deger) / 100);
      default:
        return seciliKampanya.deger || 0;
    }
  }, [seciliKampanya, araToplam]);

  // 🆕 PUAN İNDİRİMİ HESAPLA
  const puanIndirimi = useMemo(() => {
    if (!puanKullan || kullanilacakPuan <= 0) return 0;
    return Math.floor(kullanilacakPuan / platformAyarlari.puanHarcamaOrani);
  }, [puanKullan, kullanilacakPuan, platformAyarlari.puanHarcamaOrani]);

  // 🆕 KUPON İNDİRİMİ HESAPLA
  const kuponIndirimi = useMemo(() => {
    if (!uygulananKupon) return 0;
    if (araToplam < (uygulananKupon.minSepet || 0)) return 0;

    switch (uygulananKupon.tip) {
      case 'yuzde':
        return Math.round((araToplam * uygulananKupon.deger) / 100);
      case 'tutar':
        return Math.min(uygulananKupon.deger, araToplam);
      default:
        return 0;
    }
  }, [uygulananKupon, araToplam]);

  // 🆕 KAZANILACAK PUAN
  const kazanilacakPuan = useMemo(() => {
    const netTutar = araToplam - indirimTutari - kuponIndirimi - puanIndirimi;
    return Math.floor(Math.max(0, netTutar) * platformAyarlari.puanKazanimOrani);
  }, [araToplam, indirimTutari, kuponIndirimi, puanIndirimi, platformAyarlari.puanKazanimOrani]);

  // 🆕 YENİ: Puan ve kupon indirimlerini dahil et
  const genelToplam = Math.max(0,
    araToplam
    - indirimTutari
    - kuponIndirimi
    - puanIndirimi
    + (bolgeBilgisi.teslimatUcreti || 0)
  );

  const ortalamaPuan = useMemo(() => {
    if (yorumlar.length === 0) return '0.0';
    return (yorumlar.reduce((acc, y) => acc + y.puan, 0) / yorumlar.length).toFixed(1);
  }, [yorumlar]);

  const galeriResimleri = useMemo(() => {
    if (!restoranBilgi) return [];
    return [restoranBilgi.kapakResmi, restoranBilgi.logo, ...(restoranBilgi.galeri || [])].filter(Boolean);
  }, [restoranBilgi]);

  const sepetDisabled = !restoranBilgi?.acikMi ||
    restoranBilgi?.yogunluk === "Servis Dışı" ||
    restoranBilgi?.yogunluk === "Yoğun";

  // ===== 🔥 MİNİMUM SEPET DURUMU =====
  const minSepetDurumu = useMemo(() => {
    if (!bolgeBilgisi.bulundu) {
      return { yeterli: false, mesaj: 'Bu bölgeye teslimat yapılmıyor', fark: 0 };
    }

    const limit = bolgeBilgisi.limit || 0;
    if (araToplam >= limit) {
      return { yeterli: true, mesaj: null, fark: 0 };
    }

    const fark = limit - araToplam;
    return {
      yeterli: false,
      mesaj: `Minimum sepet tutarına ${fark} ₺ kaldı`,
      fark
    };
  }, [bolgeBilgisi, araToplam]);

  // ===== ACTIONS =====
  const sepeteEkle = useCallback((yemek, ekstralar = []) => {
    if (sepetDisabled) return;
    setSepet(prev => {
      const yeniSepet = [...prev, { ...yemek, sepetId: generateId(), ekstralar, adet: 1 }];
      return yeniSepet;
    });

    // Alt Menüdeki Rozeti Güncelle
    setTimeout(() => window.dispatchEvent(new Event("sepetGuncellendi")), 100);

    // ✅ YENİ: Premium Geri Bildirim
    setBildirim({
      mesaj: 'Sepete Eklendi',
      urun: yemek.isim,
      tutar: yemek.fiyat
    });

    // 2.5 saniye sonra kaldır
    setTimeout(() => setBildirim(null), 2500);

  }, [sepetDisabled]);

  const sepeteEkleTiklandi = (yemek) => {
    if (sepetDisabled) return;
    if (!yemek.secenekler?.length) { sepeteEkle(yemek); }
    else { setSecilenYemek(yemek); setSecimler([]); setSecenekModalAcik(true); }
  };

  // Upsell'den hızlı ekleme (adet artırma destekli)
  const upsellEkle = (yemek) => {
    setSepet(prev => {
      const mevcutIndex = prev.findIndex(item =>
        item.id === yemek.id && (!item.ekstralar || item.ekstralar.length === 0)
      );

      if (mevcutIndex !== -1) {
        const yeniSepet = [...prev];
        yeniSepet[mevcutIndex] = {
          ...yeniSepet[mevcutIndex],
          adet: yeniSepet[mevcutIndex].adet + 1
        };
        return yeniSepet;
      } else {
        return [...prev, { ...yemek, sepetId: generateId(), ekstralar: [], adet: 1 }];
      }
    });
  };

  // Upsell'den ürün çıkarma
  const upsellCikar = (yemekId) => {
    setSepet(prev => {
      const mevcutIndex = prev.findIndex(item =>
        item.id === yemekId && (!item.ekstralar || item.ekstralar.length === 0)
      );

      if (mevcutIndex !== -1) {
        const yeniSepet = [...prev];
        if (yeniSepet[mevcutIndex].adet > 1) {
          yeniSepet[mevcutIndex] = {
            ...yeniSepet[mevcutIndex],
            adet: yeniSepet[mevcutIndex].adet - 1
          };
        } else {
          yeniSepet.splice(mevcutIndex, 1);
        }
        return yeniSepet;
      }
      return prev;
    });
  };

  // Upsell ürün adedini al
  const upsellAdet = (yemekId) => {
    const item = sepet.find(s => s.id === yemekId && (!s.ekstralar || s.ekstralar.length === 0));
    return item?.adet || 0;
  };

  const secenekOnayla = () => {
    sepeteEkle(secilenYemek, secimler);
    setSecenekModalAcik(false);
    setSecilenYemek(null);
    setSecimler([]);
  };

  const adetDegistir = (sepetId, yeniAdet) => {
    if (yeniAdet < 1) setSepet(prev => prev.filter(item => item.sepetId !== sepetId));
    else setSepet(prev => prev.map(item => item.sepetId === sepetId ? { ...item, adet: yeniAdet } : item));
  };

  const sepettenSil = (sepetId) => setSepet(prev => prev.filter(item => item.sepetId !== sepetId));

  const toggleFavorite = async () => {
    if (!user) return navigate('/login');
    try {
      const userRef = doc(db, "kullanicilar", user.uid);
      if (isFavorite) await updateDoc(userRef, { favoriler: arrayRemove(id) });
      else await updateDoc(userRef, { favoriler: arrayUnion(id) });
      setIsFavorite(!isFavorite);
    } catch (err) { console.error('Favori hatası:', err); }
  };

  // 🆕 KUPON DOĞRULA
  const kuponDogrula = async () => {
    if (!kuponKodu.trim()) return;

    setKuponYukleniyor(true);
    setKuponHatasi('');

    try {
      const kuponQuery = query(
        collection(db, "kuponlar"),
        where("kod", "==", kuponKodu.toUpperCase().trim())
      );

      const kuponSnap = await getDocs(kuponQuery);

      if (kuponSnap.empty) {
        setKuponHatasi('Geçersiz kupon kodu');
        setUygulananKupon(null);
        return;
      }

      const kuponDoc = kuponSnap.docs[0];
      const kupon = { id: kuponDoc.id, ...kuponDoc.data() };

      // Kontroller
      if (!kupon.aktif) {
        setKuponHatasi('Bu kupon aktif değil');
        return;
      }

      if (kupon.bitis && new Date(kupon.bitis) < new Date()) {
        setKuponHatasi('Bu kuponun süresi dolmuş');
        return;
      }

      if (kupon.maxKullanim && (kupon.kullanilanAdet || 0) >= kupon.maxKullanim) {
        setKuponHatasi('Bu kupon kullanım limitine ulaşmış');
        return;
      }

      if (kupon.minSepet && araToplam < kupon.minSepet) {
        setKuponHatasi(`Minimum sepet tutarı: ${kupon.minSepet} ₺`);
        return;
      }

      // Kupon geçerli!
      setUygulananKupon(kupon);
      setKuponHatasi('');

      // Kampanya seçimini kaldır (kupon ile kampanya birlikte kullanılamaz)
      setSeciliKampanyaIndex(null);

    } catch (error) {
      console.error('Kupon doğrulama hatası:', error);
      setKuponHatasi('Bir hata oluştu');
    } finally {
      setKuponYukleniyor(false);
    }
  };

  // 🆕 KUPONU KALDIR
  const kuponuKaldir = () => {
    setUygulananKupon(null);
    setKuponKodu('');
    setKuponHatasi('');
  };

  // 🆕 PUAN KULLANIMI TOGGLE
  const puanKullanimToggle = () => {
    if (puanKullan) {
      setPuanKullan(false);
      setKullanilacakPuan(0);
    } else {
      if (kullaniciBilgileri.puanBakiye < platformAyarlari.minPuanKullanim) {
        alert(`Minimum ${platformAyarlari.minPuanKullanim} puan gerekli. Mevcut: ${kullaniciBilgileri.puanBakiye}`);
        return;
      }
      setPuanKullan(true);
      // Maksimum kullanılabilir puan (sepet tutarını geçemez)
      const maxPuanKullanim = Math.min(
        kullaniciBilgileri.puanBakiye,
        (araToplam - indirimTutari - kuponIndirimi) * platformAyarlari.puanHarcamaOrani
      );
      setKullanilacakPuan(Math.max(0, maxPuanKullanim));
    }
  };

  const siparisiGonder = async () => {
    if (!seciliAdres) return alert("Adres seçin!");

    // 🔥 Bölge kontrolü
    if (!bolgeBilgisi.bulundu) {
      const bolgeMetni = seciliAdres.ilce
        ? `${seciliAdres.ilce} - ${seciliAdres.mahalle}`
        : seciliAdres.mahalle;
      return alert(`Üzgünüz, "${bolgeMetni}" bölgesine teslimat yapılmamaktadır.`);
    }

    // 🔥 Minimum tutar kontrolü
    if (araToplam < bolgeBilgisi.limit) {
      const bolgeMetni = seciliAdres.mahalle || bolgeBilgisi.bolgeAdi;
      return alert(`${bolgeMetni} için minimum sipariş tutarı ${bolgeBilgisi.limit} ₺ olmalıdır.\n\nSepetiniz: ${araToplam} ₺\nEksik: ${bolgeBilgisi.limit - araToplam} ₺`);
    }

    const tamAdres = [
      seciliAdres.sehir,
      seciliAdres.ilce,
      seciliAdres.mahalle + ' Mah.',
      seciliAdres.sokak + ' Sok.',
      'No:' + seciliAdres.binaNo,
      seciliAdres.daire ? 'D:' + seciliAdres.daire : ''
    ].filter(Boolean).join(' ');

    // ✅ YENİ: Kullanıcı bilgilerini Firestore'dan çek
    let kullaniciBilgileri = { telefon: '', adSoyad: '' };
    try {
      const userDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        kullaniciBilgileri = {
          telefon: userData.telefon || '',
          adSoyad: userData.adSoyad || user.email?.split('@')[0] || ''
        };
      }
    } catch (err) {
      console.error("Kullanıcı bilgisi çekilemedi:", err);
    }

    try {
      const docRef = await addDoc(collection(db, "siparisler"), {
        restoranId: id,
        restoranAd: restoranBilgi.isim,
        musteriId: user.uid,
        musteriAd: kullaniciBilgileri.adSoyad || user.email,
        musteriEmail: user.email,

        // ✅ YENİ: Telefon Bilgileri
        musteriTelefon: kullaniciBilgileri.telefon || '',
        teslimatTelefon: seciliAdres.iletisimNo || '',
        teslimatKisi: seciliAdres.adSoyad || '',

        adres: tamAdres,
        adresDetay: {
          ...seciliAdres,
          sehir: seciliAdres.sehir || '',
          ilce: seciliAdres.ilce || '',
          mahalle: seciliAdres.mahalle || ''
        },
        // 🔥 Bölge bilgileri
        sehir: seciliAdres.sehir || '',
        ilce: seciliAdres.ilce || '',
        mahalle: seciliAdres.mahalle || '',
        durum: "Onay Bekliyor",
        araToplam,
        indirim: indirimTutari,
        teslimatUcreti: bolgeBilgisi.teslimatUcreti,
        minSepetLimit: bolgeBilgisi.limit,
        toplamTutar: genelToplam,
        odemeYontemi,
        not: siparisNotu.trim() || null,
        kampanya: seciliKampanya?.baslik || null,
        tarih: serverTimestamp(),
        yemekler: sepet.map(item => ({
          ad: item.ad,
          fiyat: item.fiyat,
          adet: item.adet,
          secilenOpsiyonlar: item.ekstralar?.map(e => e.ad) || []
        })),
        // 🆕 Puan & Kupon Bilgileri
        kullanilanPuan: puanKullan ? kullanilacakPuan : 0,
        puanIndirimi: puanIndirimi,
        kuponKodu: uygulananKupon?.kod || null,
        kuponIndirimi: kuponIndirimi,
        kazanilacakPuan: kazanilacakPuan
      });

      // 🆕 PUAN KULLANILDIYSA DÜŞÜR
      if (puanKullan && kullanilacakPuan > 0) {
        await updateDoc(doc(db, "kullanicilar", user.uid), {
          puanBakiye: increment(-kullanilacakPuan)
        });

        // Puan harcama geçmişi
        await addDoc(collection(db, "puan_gecmisi"), {
          kullaniciId: user.uid,
          tip: 'harcama',
          miktar: kullanilacakPuan,
          aciklama: `Sipariş #${docRef.id.slice(-6).toUpperCase()}`,
          siparisId: docRef.id,
          tarih: serverTimestamp()
        });
      }

      // 🆕 KUPON KULLANILDIYSA SAYACI ARTIR
      if (uygulananKupon) {
        await updateDoc(doc(db, "kuponlar", uygulananKupon.id), {
          kullanilanAdet: increment(1)
        });
      }

      // 🆕 KULLANILAN KUPONU KULLANICIDAN SİL (Tek kullanımlık olması için)
      if (uygulananKupon) {
        try {
          const userRef = doc(db, "kullanicilar", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const mevcutKuponlar = userData.kuponlarim || [];
            // Kodu eşleşen kuponu listeden çıkar
            const yeniKuponlar = mevcutKuponlar.filter(k => k.kod !== uygulananKupon.kod);

            if (mevcutKuponlar.length !== yeniKuponlar.length) {
              await updateDoc(userRef, { kuponlarim: yeniKuponlar });
            }
          }
        } catch (e) { console.error("Kupon silme hatası:", e); }
      }

      // 📧 SİPARİŞ ONAY EMAİLİ GÖNDER
      try {
        await siparisOnayEmaili({
          musteriEmail: user.email,
          musteriAd: kullaniciBilgileri.adSoyad || user.email,
          siparisId: docRef.id,
          restoranAd: restoranBilgi.isim,
          toplamTutar: genelToplam,
          adres: tamAdres,
          yemekler: sepet.map(item => ({ ad: item.ad, adet: item.adet }))
        });

      } catch (emailError) {
        console.error('Email gönderilemedi:', emailError);
      }

      setSepet([]);
      localStorage.removeItem('sepet_' + id);
      setSiparisModalAcik(false);
      setUpsellModalAcik(false);
      setPuanKullan(false);
      setKullanilacakPuan(0);
      setUygulananKupon(null);
      setKuponKodu('');
      setAktifSiparisId(docRef.id);

      alert(`Sipariş Alındı! 🚀\n\n${kazanilacakPuan > 0 ? `+${kazanilacakPuan} puan kazanacaksınız!` : ''}`);
    } catch (e) {
      alert("Hata: " + e.message);
    }
  };

  // YENİ: Sipariş butonu önce Upsell modalını açar
  const siparisButonunaBasildi = () => {
    if (!user) return navigate("/login");
    if (sepet.length === 0) return alert("Sepet boş!");
    if (!restoranBilgi.acikMi) return alert("Restoran kapalı.");
    if (restoranBilgi.yogunluk === "Servis Dışı") return alert("Servis dışı.");
    setUpsellModalAcik(true); // Önce upsell modalı aç
  };

  // Upsell'den ödemeye geç
  const odemeGec = () => {
    setUpsellModalAcik(false);
    setSiparisModalAcik(true);
  };

  const mesajGonder = async (e) => {
    e.preventDefault();
    if (!yeniMesaj.trim()) return;

    await addDoc(collection(db, "siparisler", aktifSiparisId, "mesajlar"), {
      gonderen: "Müşteri",
      gonderenUid: user.uid,
      gonderenEmail: user.email,
      mesaj: yeniMesaj.trim(),
      tarih: serverTimestamp(), // ✅ Date() yerine serverTimestamp()
      okundu: false
    });

    setYeniMesaj("");
  };

  // ===== HELPERS =====
  const renderStars = (sayi) => (
    [...Array(5)].map((_, i) => (
      <span key={i} className={`rd-yorum-form__star ${i < sayi ? 'active' : ''}`}>⭐</span>
    ))
  );

  const formatTarih = (timestamp) => {
    if (!timestamp) return '';
    const tarih = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="rd-loading">
        <div className="rd-loading__spinner"></div>
        <p className="rd-loading__text">Restoran yükleniyor...</p>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>😔</div>
        <h2 style={{ color: 'var(--text-main)' }}>Bir Hata Oluştu</h2>
        <p style={{ color: 'var(--text-sub)', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate('/')} style={{ padding: '12px 30px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  // ===== SİPARİŞ TAKİP EKRANI =====
  if (aktifSiparisId) {
    return (
      <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'var(--text-main)' }}>Sipariş Takibi 🛵</h1>
          <div style={{
            padding: '25px', borderRadius: '15px', display: 'inline-block', minWidth: '300px',
            background: aktifSiparisDurum === "Onay Bekliyor" ? '#fef3c7' : aktifSiparisDurum === "Hazırlanıyor" ? '#dbeafe' : '#dcfce7'
          }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>{aktifSiparisDurum}</h2>
            <p style={{ margin: '5px 0 0', color: '#6b7280' }}>Sipariş No: #{aktifSiparisId.slice(-5).toUpperCase()}</p>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: '15px', overflow: 'hidden', background: 'var(--card-bg)' }}>
          <div style={{ background: 'var(--bg-body)', padding: '15px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--text-main)' }}>
            💬 Restoranla Sohbet
          </div>
          <div style={{ height: '300px', overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatMesajlari.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.gonderen === "Müşteri" ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: msg.gonderen === "Müşteri" ? 'var(--primary)' : 'var(--bg-body)',
                  color: msg.gonderen === "Müşteri" ? 'white' : 'var(--text-main)'
                }}>{msg.mesaj}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '3px', textAlign: msg.gonderen === "Müşteri" ? 'right' : 'left' }}>
                  {msg.tarih?.seconds ? new Date(msg.tarih.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={mesajGonder} style={{ display: 'flex', gap: '10px', padding: '12px', borderTop: '1px solid var(--border-color)' }}>
            <input value={yeniMesaj} onChange={e => setYeniMesaj(e.target.value)} placeholder="Mesaj yaz..."
              style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-body)', color: 'var(--text-main)', outline: 'none' }} />
            <button type="submit" style={{ padding: '0 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Gönder</button>
          </form>
        </div>

        <button onClick={() => { setAktifSiparisId(null); navigate('/siparislerim'); }}
          style={{ marginTop: '20px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-sub)', borderRadius: '10px', cursor: 'pointer' }}>
          ✕ Kapat
        </button>
      </div>
    );
  }

  // ===== ANA EKRAN =====
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', paddingBottom: isMobile && sepet.length > 0 ? '100px' : '40px' }}>

      {/* Geri Butonu */}
      <button onClick={() => navigate('/')} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', marginBottom: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← Geri Dön
      </button>

      {/* ===== DURUM BANNERLARI ===== */}
      {/* Servis Dışı */}
      {restoranBilgi?.yogunluk === "Servis Dışı" && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
        }}>
          <span style={{ fontSize: '28px' }}>⛔</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Bu Restoran Şu An Servis Dışıdır</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Lütfen daha sonra tekrar deneyiniz.</div>
          </div>
        </div>
      )}

      {/* Çok Yoğun - Sipariş Kapalı */}
      {restoranBilgi?.yogunluk === "Yoğun" && (
        <div style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(249,115,22,0.3)'
        }}>
          <span style={{ fontSize: '28px' }}>🚫</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Şu An Çok Yoğunuz!</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Sipariş alımı geçici olarak durduruldu. Kısa süre içinde tekrar açılacaktır.</div>
          </div>
        </div>
      )}

      {/* Kötü Hava - Gecikme Uyarısı */}
      {restoranBilgi?.yogunluk === "Kötü Hava" && (
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(59,130,246,0.3)'
        }}>
          <span style={{ fontSize: '28px' }}>🌧️</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Olumsuz Hava Koşulları</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Hava koşulları nedeniyle siparişlerde gecikme yaşanabilir. Anlayışınız için teşekkürler.</div>
          </div>
        </div>
      )}

      {/* 🔥 Bölge Dışı Uyarısı - GELİŞTİRİLMİŞ */}
      {seciliAdres && !bolgeBilgisi.bulundu && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          padding: '18px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          boxShadow: '0 4px 15px rgba(239,68,68,0.3)'
        }}>
          <span style={{ fontSize: '32px' }}>🚫</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
              Bu Bölgeye Teslimat Yapılmıyor
            </div>
            <div style={{ fontSize: '13px', opacity: 0.95 }}>
              <strong>{seciliAdres.ilce && `${seciliAdres.ilce} / `}{seciliAdres.mahalle}</strong> bölgesine henüz hizmet verilmemektedir.
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              Farklı bir adres seçebilir veya başka restoranları deneyebilirsiniz.
            </div>
          </div>
          <button
            onClick={() => navigate('/profil')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            Adres Değiştir
          </button>
        </div>
      )}

      {/* 🔥 Minimum Sepet Uyarısı */}
      {seciliAdres && bolgeBilgisi.bulundu && !minSepetDurumu.yeterli && sepet.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>💰</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {minSepetDurumu.mesaj}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {seciliAdres.mahalle} için minimum: {bolgeBilgisi.limit} ₺ | Sepetiniz: {araToplam} ₺
            </div>
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="rd-header">
        <div className="rd-header__cover" onClick={() => galeriResimleri.length > 0 && setGaleriModalAcik(true)}>
          {restoranBilgi?.kapakResmi && <img src={restoranBilgi.kapakResmi} alt={restoranBilgi.isim} />}
          <div className="rd-header__actions">
            <button className={`rd-action-btn rd-action-btn--fav ${isFavorite ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}>
              {isFavorite ? '❤️' : '🤍'}
            </button>
            <button className="rd-action-btn" onClick={(e) => { e.stopPropagation(); setSaatlerModalAcik(true); }} title="Çalışma Saatleri">🕒</button>
            {galeriResimleri.length > 1 && (
              <button className="rd-action-btn" onClick={(e) => { e.stopPropagation(); setGaleriModalAcik(true); }} title="Fotoğraflar">📷</button>
            )}
          </div>
        </div>
        <div className="rd-header__info">
          <img src={restoranBilgi?.logo || "https://via.placeholder.com/90?text=🍽️"} alt={restoranBilgi?.isim} className="rd-header__logo" />
          <div className="rd-header__details">
            <h1 className="rd-header__title">{restoranBilgi?.isim} {restoranBilgi?.onay && <span title="Onaylı">✅</span>}</h1>
            <div className="rd-header__badges">
              <span className="rd-badge">⭐ {ortalamaPuan} ({yorumlar.length})</span>
              <span className="rd-badge">🕒 {restoranBilgi?.teslimatSure || '30-40 dk'}</span>

              {/* 🔥 DİNAMİK MİN. SEPET BADGE - GELİŞTİRİLMİŞ */}
              <span className="rd-badge" style={{
                background: !bolgeBilgisi.bulundu
                  ? 'rgba(239,68,68,0.15)'
                  : bolgeBilgisi.limit > 0
                    ? 'rgba(59,130,246,0.1)'
                    : undefined,
                color: !bolgeBilgisi.bulundu
                  ? '#ef4444'
                  : bolgeBilgisi.limit > 0
                    ? 'var(--primary)'
                    : undefined,
                fontWeight: !bolgeBilgisi.bulundu ? 'bold' : undefined
              }}>
                {!bolgeBilgisi.bulundu
                  ? '🚫 Bölge Dışı'
                  : bolgeBilgisi.limit > 0
                    ? `💵 Min. ${bolgeBilgisi.limit} ₺`
                    : '💵 Min. Limit Yok'}
              </span>

              {/* 🔥 TESLİMAT ÜCRETİ BADGE */}
              {bolgeBilgisi.bulundu && (
                <span className="rd-badge" style={{
                  background: bolgeBilgisi.teslimatUcreti === 0
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(249,115,22,0.1)',
                  color: bolgeBilgisi.teslimatUcreti === 0
                    ? '#22c55e'
                    : '#f97316'
                }}>
                  {bolgeBilgisi.teslimatUcreti === 0
                    ? '🚚 Ücretsiz Teslimat'
                    : `🚚 +${bolgeBilgisi.teslimatUcreti} ₺`}
                </span>
              )}

              <span className={`rd-badge ${restoranBilgi?.acikMi ? 'rd-badge--open' : 'rd-badge--closed'}`}>
                {restoranBilgi?.acikMi ? '🟢 AÇIK' : '🔴 KAPALI'}
              </span>
            </div>

            {/* 🔥 SEÇİLİ ADRES GÖSTERİMİ */}
            {seciliAdres && (
              <div style={{
                marginTop: '10px',
                fontSize: '13px',
                color: 'var(--text-sub)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span>📍 Teslimat:</span>
                <span style={{
                  background: bolgeBilgisi.bulundu ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: bolgeBilgisi.bulundu ? '#22c55e' : '#ef4444',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  {seciliAdres.ilce && `${seciliAdres.ilce} / `}{seciliAdres.mahalle}
                </span>
                {kayitliAdresler.length > 1 && (
                  <button
                    onClick={() => setSiparisModalAcik(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textDecoration: 'underline'
                    }}
                  >
                    Değiştir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== İÇERİK ===== */}
      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* MENÜ */}
        <div style={{ flex: 2, width: '100%' }}>
          {/* Arama */}
          <div className="rd-search">
            <span className="rd-search__icon">🔍</span>
            <input type="text" className="rd-search__input" placeholder="Menüde ara..." value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>

          {/* Sonuç Yok */}
          {filtrelenmisMenuler.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
              <p>"{aramaMetni}" için sonuç bulunamadı</p>
              <button onClick={() => setAramaMetni('')} style={{ marginTop: '10px', padding: '8px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Aramayı Temizle
              </button>
            </div>
          )}

          {/* Kategoriler */}
          {Object.keys(kategoriler).map(kategori => (
            <div key={kategori} className="rd-menu-category">
              <h3 className="rd-menu-category__title">{kategori}</h3>
              <div className="rd-menu-grid">
                {kategoriler[kategori].map(yemek => {
                  const stokYok = yemek.stokta === false;

                  return (
                    <div
                      key={yemek.id}
                      className="rd-menu-item"
                      style={{
                        opacity: stokYok ? 0.5 : 1,
                        position: 'relative'
                      }}
                    >
                      {/* Stok Yok Etiketi */}
                      {stokYok && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#ef4444',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          zIndex: 5
                        }}>
                          TÜKENDİ
                        </div>
                      )}

                      {yemek.resim && <img src={yemek.resim} alt={yemek.ad} className="rd-menu-item__img" style={{ filter: stokYok ? 'grayscale(100%)' : 'none' }} />}
                      <div className="rd-menu-item__info">
                        <div className="rd-menu-item__name">{yemek.ad}</div>
                        {yemek.aciklama && <div className="rd-menu-item__desc">{yemek.aciklama}</div>}

                        {/* ✅ YENİ: Allerjen İkonları */}
                        {yemek.allerjenler?.length > 0 && (
                          <div style={{
                            display: 'flex',
                            gap: '4px',
                            marginTop: '6px',
                            flexWrap: 'wrap'
                          }}>
                            {yemek.allerjenler.map(alId => {
                              const allerjen = ALLERJENLER.find(a => a.id === alId);
                              return allerjen ? (
                                <span
                                  key={alId}
                                  title={allerjen.ad}
                                  style={{
                                    background: 'rgba(239,68,68,0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'help'
                                  }}
                                >
                                  {allerjen.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        <div className="rd-menu-item__price">{yemek.fiyat} ₺</div>
                      </div>

                      <button
                        className="rd-menu-item__add"
                        onClick={() => sepeteEkleTiklandi(yemek)}
                        disabled={sepetDisabled || !bolgeBilgisi.bulundu || stokYok}
                        title={
                          stokYok ? "Bu ürün şu an stokta yok" :
                            !bolgeBilgisi.bulundu ? "Bu bölgeye teslimat yok" :
                              sepetDisabled ? "Sipariş alınmıyor" : "Sepete Ekle"
                        }
                        style={{
                          opacity: (!bolgeBilgisi.bulundu || sepetDisabled || stokYok) ? 0.5 : 1,
                          cursor: (!bolgeBilgisi.bulundu || sepetDisabled || stokYok) ? 'not-allowed' : 'pointer',
                          background: stokYok ? '#6b7280' : undefined
                        }}
                      >
                        {stokYok ? '✗' : '+'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ===== YORUMLAR ===== */}
          <div className="rd-yorumlar">
            <div className="rd-yorumlar__header">
              <h3 className="rd-yorumlar__title">💬 Değerlendirmeler</h3>
              <div className="rd-yorumlar__avg">
                <span className="rd-yorumlar__score">{ortalamaPuan}</span>
                <span>⭐</span>
                <span style={{ color: 'var(--text-sub)', fontSize: '13px' }}>({yorumlar.length} yorum)</span>
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'var(--bg-body)',
              borderRadius: '12px',
              marginBottom: '20px',
              color: 'var(--text-sub)',
              border: '1px dashed var(--border-color)'
            }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📝</span>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Yorum yapabilmek için sipariş vermiş olmanız gerekmektedir.
                <br />
                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                  Siparişiniz teslim edildikten sonra "Siparişlerim" sayfasından değerlendirme yapabilirsiniz.
                </span>
              </p>
            </div>

            <div className="rd-yorumlar__list">
              {yorumlar.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-sub)' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🌟</span>
                  Henüz değerlendirme yok.
                </div>
              ) : (
                yorumlar.slice(0, 5).map(yorum => (
                  <div key={yorum.id} className="rd-yorum-card">
                    <div className="rd-yorum-card__header">
                      <div className="rd-yorum-card__user">
                        <div className="rd-yorum-card__avatar">{(yorum.kullaniciAd || 'A')[0].toUpperCase()}</div>
                        <div>
                          <div className="rd-yorum-card__name">{yorum.kullaniciAd || 'Anonim'}</div>
                          <div className="rd-yorum-card__date">{formatTarih(yorum.tarih)}</div>
                        </div>
                      </div>
                      <div className="rd-yorum-card__stars">{renderStars(yorum.puan)}</div>
                    </div>
                    <p className="rd-yorum-card__text">{yorum.yorum}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===== SEPET (Desktop) ===== */}
        {!isMobile && (
          <div style={{ flex: 1, position: 'sticky', top: '100px', width: '100%' }}>
            <div className="rd-sepet">
              <h3 className="rd-sepet__title">🛒 Sepetim {sepet.length > 0 && `(${sepet.length})`}</h3>

              {sepet.length === 0 ? (
                <div className="rd-sepet__empty">
                  <div className="rd-sepet__empty-icon">🛒</div>
                  <p>Sepetiniz boş</p>
                  <small>Lezzetli yemekler ekleyin!</small>
                </div>
              ) : (
                <>
                  <div className="rd-sepet__items">
                    {sepet.map(item => (
                      <div key={item.sepetId} className="rd-sepet-item">
                        <div className="rd-sepet-item__row1">
                          <div>
                            <div className="rd-sepet-item__name">{item.ad}</div>
                            {item.ekstralar?.length > 0 && <div className="rd-sepet-item__extras">+ {item.ekstralar.map(e => e.ad).join(', ')}</div>}
                          </div>
                          <button className="rd-sepet-item__remove" onClick={() => sepettenSil(item.sepetId)}>🗑️</button>
                        </div>
                        <div className="rd-sepet-item__row2">
                          <div className="rd-sepet-item__qty">
                            <button className="rd-sepet-item__qty-btn" onClick={() => adetDegistir(item.sepetId, item.adet - 1)}>−</button>
                            <span className="rd-sepet-item__qty-num">{item.adet}</span>
                            <button className="rd-sepet-item__qty-btn" onClick={() => adetDegistir(item.sepetId, item.adet + 1)}>+</button>
                          </div>
                          <span className="rd-sepet-item__price">{((item.fiyat + (item.ekstralar?.reduce((t, e) => t + (Number(e.fiyat) || 0), 0) || 0)) * item.adet)} ₺</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 🔥 MİNİMUM SEPET PROGRESS BAR */}
                  {bolgeBilgisi.bulundu && bolgeBilgisi.limit > 0 && (
                    <div style={{ padding: '12px 15px', background: 'var(--bg-body)', borderRadius: '10px', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-sub)' }}>Minimum Sepet</span>
                        <span style={{
                          color: minSepetDurumu.yeterli ? '#22c55e' : '#f59e0b',
                          fontWeight: 'bold'
                        }}>
                          {araToplam} / {bolgeBilgisi.limit} ₺
                        </span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'var(--border-color)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (araToplam / bolgeBilgisi.limit) * 100)}%`,
                          background: minSepetDurumu.yeterli
                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                            : 'linear-gradient(90deg, #f59e0b, #d97706)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      {!minSepetDurumu.yeterli && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', textAlign: 'center' }}>
                          {minSepetDurumu.fark} ₺ daha ekleyin
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rd-sepet__summary">
                    <div className="rd-sepet__row"><span>Ara Toplam</span><span>{araToplam} ₺</span></div>
                    {bolgeBilgisi.teslimatUcreti > 0 && (
                      <div className="rd-sepet__row"><span>🚚 Teslimat</span><span>+{bolgeBilgisi.teslimatUcreti} ₺</span></div>
                    )}
                    {bolgeBilgisi.teslimatUcreti === 0 && bolgeBilgisi.bulundu && (
                      <div className="rd-sepet__row" style={{ color: '#22c55e' }}>
                        <span>🚚 Teslimat</span><span>Ücretsiz!</span>
                      </div>
                    )}
                    {seciliKampanya && <div className="rd-sepet__row rd-sepet__row--discount"><span>🎉 {seciliKampanya.baslik}</span><span>-{indirimTutari} ₺</span></div>}
                    <div className="rd-sepet__row rd-sepet__row--total"><span>Toplam</span><span>{genelToplam} ₺</span></div>
                  </div>

                  <button
                    className="rd-sepet__btn"
                    onClick={siparisButonunaBasildi}
                    disabled={sepetDisabled || !bolgeBilgisi.bulundu || !minSepetDurumu.yeterli}
                    style={{
                      opacity: (sepetDisabled || !bolgeBilgisi.bulundu || !minSepetDurumu.yeterli) ? 0.6 : 1
                    }}
                  >
                    {!bolgeBilgisi.bulundu
                      ? '🚫 Bölge Dışı'
                      : !minSepetDurumu.yeterli
                        ? `Min. ${bolgeBilgisi.limit} ₺ gerekli`
                        : sepetDisabled
                          ? 'Restoran Kapalı'
                          : 'SİPARİŞİ TAMAMLA'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== MOBİL SEPET BAR ===== */}
      {isMobile && sepet.length > 0 && (
        <div className="rd-mobile-bar">
          <div className="rd-mobile-bar__info">
            <span className="rd-mobile-bar__count">{sepet.reduce((t, i) => t + i.adet, 0)}</span>
            <div>
              <span className="rd-mobile-bar__total">{genelToplam} ₺</span>
              {!minSepetDurumu.yeterli && bolgeBilgisi.bulundu && (
                <div style={{ fontSize: '10px', color: '#fbbf24' }}>
                  Min. {bolgeBilgisi.limit} ₺
                </div>
              )}
            </div>
          </div>
          <button
            className="rd-mobile-bar__btn"
            onClick={siparisButonunaBasildi}
            disabled={sepetDisabled || !bolgeBilgisi.bulundu || !minSepetDurumu.yeterli}
          >
            {!bolgeBilgisi.bulundu
              ? 'Bölge Dışı'
              : !minSepetDurumu.yeterli
                ? `+${minSepetDurumu.fark} ₺ ekle`
                : 'Sepeti Gör'}
          </button>
        </div>
      )}

      {/* ===== SEÇENEK MODAL ===== */}
      {secenekModalAcik && secilenYemek && (
        <div className="rd-modal-overlay" onClick={() => setSecenekModalAcik(false)}>
          <div className="rd-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal__header">
              <h3 className="rd-modal__title">{secilenYemek.ad}</h3>
              <button className="rd-modal__close" onClick={() => setSecenekModalAcik(false)}>✕</button>
            </div>
            <div className="rd-modal__body">
              {secilenYemek.resim && <img src={secilenYemek.resim} alt={secilenYemek.ad} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px', marginBottom: '15px' }} />}

              {/* ✅ YENİ: Allerjen Uyarısı */}
              {secilenYemek.allerjenler?.length > 0 && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#ef4444',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ⚠️ Allerjen İçerir
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {secilenYemek.allerjenler.map(alId => {
                      const allerjen = ALLERJENLER.find(a => a.id === alId);
                      return allerjen ? (
                        <span
                          key={alId}
                          style={{
                            background: 'white',
                            padding: '4px 10px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#1f2937'
                          }}
                        >
                          {allerjen.icon} {allerjen.ad}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>Ekstra Seçenekler</h4>
              {secilenYemek.secenekler?.map((secenek, i) => {
                const secili = secimler.find(s => s.ad === secenek.ad);
                return (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: `2px solid ${secili ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', background: secili ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" checked={!!secili} onChange={() => {
                        if (secili) setSecimler(secimler.filter(s => s.ad !== secenek.ad));
                        else setSecimler([...secimler, secenek]);
                      }} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-main)' }}>{secenek.ad}</span>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+{secenek.fiyat} ₺</span>
                  </label>
                );
              })}
            </div>
            <div className="rd-modal__footer">
              <button className="rd-modal__btn rd-modal__btn--cancel" onClick={() => setSecenekModalAcik(false)}>İptal</button>
              <button className="rd-modal__btn rd-modal__btn--confirm" onClick={secenekOnayla} style={{ flex: 2 }}>Sepete Ekle 🛒</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== UPSELL MODAL ===== */}
      {upsellModalAcik && (
        <div className="rd-modal-overlay">
          <div className="rd-modal rd-modal--large" onClick={e => e.stopPropagation()}>
            <div className="rd-modal__header">
              <h2 className="rd-modal__title">🛒 Sepet Özeti</h2>
              <button className="rd-modal__close" onClick={() => setUpsellModalAcik(false)}>✕</button>
            </div>
            <div className="rd-modal__body" style={{ paddingBottom: '0' }}>

              {/* Sepet Listesi */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px', color: 'var(--text-main)', fontSize: '15px' }}>📦 Siparişiniz</h4>
                <div style={{ background: 'var(--bg-body)', borderRadius: '12px', padding: '12px' }}>
                  {sepet.map(item => (
                    <div key={item.sepetId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          {item.adet}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: 'var(--text-main)', fontSize: '14px' }}>{item.ad}</div>
                          {item.ekstralar?.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>+{item.ekstralar.map(e => e.ad).join(', ')}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {((item.fiyat + (item.ekstralar?.reduce((t, e) => t + (Number(e.fiyat) || 0), 0) || 0)) * item.adet)} ₺
                        </span>
                        <button onClick={() => sepettenSil(item.sepetId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Önerilen Ürünler - GÜNCELLENMİŞ */}
              {onerilenUrunler.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✨ Bunları da eklemek ister misiniz?
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {onerilenUrunler.map(urun => {
                      const adet = upsellAdet(urun.id);
                      return (
                        <div
                          key={urun.id}
                          style={{
                            background: adet > 0 ? 'rgba(34,197,94,0.1)' : 'var(--bg-body)',
                            border: `2px solid ${adet > 0 ? '#22c55e' : 'var(--border-color)'}`,
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {urun.resim && (
                            <img src={urun.resim} alt={urun.ad} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                          )}
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{urun.ad}</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)' }}>{urun.fiyat} ₺</div>

                          {/* ADET KONTROLÜ */}
                          {adet > 0 ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              background: 'var(--card-bg)',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: '1px solid var(--border-color)'
                            }}>
                              <button
                                onClick={() => upsellCikar(urun.id)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: '#ef4444',
                                  color: 'white',
                                  fontSize: '16px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold'
                                }}
                              >
                                −
                              </button>
                              <span style={{
                                fontWeight: 'bold',
                                fontSize: '16px',
                                color: 'var(--text-main)',
                                minWidth: '20px',
                                textAlign: 'center'
                              }}>
                                {adet}
                              </span>
                              <button
                                onClick={() => upsellEkle(urun)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: '#22c55e',
                                  color: 'white',
                                  fontSize: '16px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold'
                                }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => upsellEkle(urun)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              + Ekle
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-sub)', fontSize: '14px' }}>
                  <span>Ara Toplam ({sepet.reduce((t, i) => t + i.adet, 0)} ürün)</span>
                  <span>{araToplam} ₺</span>
                </div>
                {bolgeBilgisi.teslimatUcreti > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-sub)', fontSize: '14px' }}>
                    <span>🚚 Teslimat Ücreti</span>
                    <span>+{bolgeBilgisi.teslimatUcreti} ₺</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', paddingTop: '10px', borderTop: '2px solid var(--border-color)' }}>
                  <span>Toplam</span>
                  <span>{genelToplam} ₺</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setUpsellModalAcik(false)} style={{ flex: 1, padding: '15px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-sub)', fontWeight: 'bold' }}>
                  ← Menüye Dön
                </button>
                <button
                  onClick={odemeGec}
                  disabled={!minSepetDurumu.yeterli}
                  style={{
                    flex: 2,
                    padding: '15px',
                    background: minSepetDurumu.yeterli ? 'var(--primary)' : 'var(--border-color)',
                    color: minSepetDurumu.yeterli ? 'white' : 'var(--text-sub)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: minSepetDurumu.yeterli ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                  {minSepetDurumu.yeterli ? 'Ödemeye Geç →' : `Min. ${bolgeBilgisi.limit} ₺ gerekli`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SİPARİŞ MODAL ===== */}
      {siparisModalAcik && (
        <div className="rd-modal-overlay">
          <div className="rd-modal rd-modal--large" onClick={e => e.stopPropagation()}>
            <div className="rd-modal__header">
              <h2 className="rd-modal__title">💳 Ödeme Bilgileri</h2>
              <button className="rd-modal__close" onClick={() => setSiparisModalAcik(false)}>✕</button>
            </div>
            <div className="rd-modal__body">
              {/* Adres */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>📍 Teslimat Adresi</h4>
                {kayitliAdresler.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                    <p style={{ color: 'var(--text-sub)', marginBottom: '15px' }}>Kayıtlı adresiniz yok</p>
                    <button onClick={() => navigate('/profil')} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Yeni Adres Ekle</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}> {/* Buradaki stil tanımı düzeltildi */}
                    {kayitliAdresler.map(adres => {
                      // 🔥 Her adres için bölge kontrolü yap
                      const { hizmetVar, bolge } = adresBolgeKontrolu(adres);
                      const secilenMi = seciliAdres?.id === adres.id;

                      return (
                        <div
                          key={adres.id}
                          onClick={() => {
                            if (hizmetVar) {
                              setSeciliAdres(adres);
                              localStorage.setItem('seciliAdresId', adres.id);
                            }
                          }}
                          style={{
                            border: `2px solid ${secilenMi ? 'var(--primary)' : !hizmetVar ? '#ef4444' : 'var(--border-color)'}`,
                            padding: '15px',
                            borderRadius: '12px',
                            cursor: hizmetVar ? 'pointer' : 'not-allowed',
                            background: secilenMi
                              ? 'rgba(59,130,246,0.08)'
                              : !hizmetVar
                                ? 'rgba(239,68,68,0.05)'
                                : 'transparent',
                            opacity: hizmetVar ? 1 : 0.7,
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            fontWeight: 'bold',
                            color: secilenMi ? 'var(--primary)' : !hizmetVar ? '#ef4444' : 'var(--text-main)',
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🏠 {adres.baslik}
                              {secilenMi && <span style={{ fontSize: '14px' }}>✓</span>}
                            </span>
                            {!hizmetVar && (
                              <span style={{
                                fontSize: '11px',
                                background: '#ef4444',
                                color: 'white',
                                padding: '3px 10px',
                                borderRadius: '10px'
                              }}>
                                Bölge Dışı
                              </span>
                            )}
                          </div>

                          {/* Adres Detayları */}
                          <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px' }}>
                            {adres.mahalle} Mah. {adres.sokak} Sok. No:{adres.binaNo}
                            {adres.daire && ` D:${adres.daire}`}
                          </div>

                          {/* 🔥 Bölge Etiketleri */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {adres.sehir && (
                              <span style={{
                                fontSize: '11px',
                                background: 'rgba(59,130,246,0.1)',
                                color: 'var(--primary)',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {adres.sehir}
                              </span>
                            )}
                            {adres.ilce && (
                              <span style={{
                                fontSize: '11px',
                                background: 'rgba(139,92,246,0.1)',
                                color: '#8b5cf6',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {adres.ilce}
                              </span>
                            )}
                            <span style={{
                              fontSize: '11px',
                              background: hizmetVar ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                              color: hizmetVar ? '#22c55e' : '#ef4444',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              {adres.mahalle}
                            </span>
                          </div>

                          {/* 🔥 Seçili adres için min sepet ve teslimat bilgisi */}
                          {secilenMi && hizmetVar && bolge && (
                            <div style={{
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px dashed var(--border-color)',
                              display: 'flex',
                              gap: '15px',
                              fontSize: '12px'
                            }}>
                              <span style={{ color: 'var(--text-sub)' }}>
                                💵 Min: <strong style={{ color: 'var(--text-main)' }}>{bolge.minSepet || bolge.limit || 0} ₺</strong>
                              </span>
                              <span style={{ color: 'var(--text-sub)' }}>
                                🚚 Teslimat: <strong style={{ color: bolge.teslimatUcreti === 0 ? '#22c55e' : 'var(--text-main)' }}>
                                  {bolge.teslimatUcreti === 0 ? 'Ücretsiz' : `${bolge.teslimatUcreti} ₺`}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Yeni Adres Ekle Butonu */}
                    <button
                      onClick={() => navigate('/profil')}
                      style={{
                        padding: '15px',
                        border: '2px dashed var(--border-color)',
                        background: 'transparent',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: 'var(--primary)',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      ➕ Yeni Adres Ekle
                    </button>
                  </div>
                )}
              </div>

              {/* Kampanya - GÜNCELLENMİŞ */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>🔥 Fırsatlar</h4>
                {uygunKampanyalar.length > 0 ? (
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                    {uygunKampanyalar.map((k, i) => {
                      const seciliMi = seciliKampanyaIndex === i;
                      return (
                        <div
                          key={i}
                          onClick={() => setSeciliKampanyaIndex(seciliMi ? null : i)}
                          style={{
                            minWidth: '140px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: `2px solid ${seciliMi ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: seciliMi ? 'var(--primary)' : 'var(--bg-body)',
                            color: seciliMi ? 'white' : 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                        >
                          {seciliMi && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: '#22c55e',
                              color: 'white',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              ✓
                            </div>
                          )}
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{k.baslik}</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>
                            {k.tip === 'yuzde' ? `%${k.deger}` : `${k.deger} ₺`}
                          </div>
                          {k.minSepet > 0 && (
                            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '3px' }}>
                              Min. {k.minSepet} ₺
                            </div>
                          )}
                          {seciliMi && (
                            <div style={{
                              fontSize: '11px',
                              marginTop: '8px',
                              padding: '4px 8px',
                              background: 'rgba(255,255,255,0.2)',
                              borderRadius: '6px'
                            }}>
                              -{indirimTutari} ₺ indirim
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : aktifKampanyalar.length > 0 ? (
                  <div style={{
                    padding: '15px',
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,88,12,0.1))',
                    borderRadius: '10px',
                    color: '#f97316',
                    fontSize: '14px',
                    textAlign: 'center',
                    border: '1px dashed #f97316'
                  }}>
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>🎯</span>
                    <strong>{aktifKampanyalar[0].minSepet} ₺</strong> üzeri siparişlerde
                    <strong> %{aktifKampanyalar[0].deger}</strong> indirim!
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                      {aktifKampanyalar[0].minSepet - araToplam} ₺ daha ekleyin
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '15px',
                    background: 'var(--bg-body)',
                    borderRadius: '10px',
                    color: 'var(--text-sub)',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>
                    Şu an aktif kampanya yok.
                  </div>
                )}
              </div>

              {/* 🆕 KUPON KODU */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>🎫 Kupon Kodu</h4>

                {uygulananKupon ? (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✅ {uygulananKupon.kod}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '4px' }}>
                        {uygulananKupon.tip === 'yuzde' ? `%${uygulananKupon.deger} indirim` : `${uygulananKupon.deger} ₺ indirim`}
                        {' = '}<strong style={{ color: '#22c55e' }}>-{kuponIndirimi} ₺</strong>
                      </div>
                    </div>
                    <button
                      onClick={kuponuKaldir}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      ✕ Kaldır
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={kuponKodu}
                      onChange={e => {
                        setKuponKodu(e.target.value.toUpperCase());
                        setKuponHatasi('');
                      }}
                      placeholder="KUPON KODU"
                      style={{
                        flex: 1,
                        padding: '14px',
                        border: `2px solid ${kuponHatasi ? '#ef4444' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        background: 'var(--bg-body)',
                        color: 'var(--text-main)',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    />
                    <button
                      onClick={kuponDogrula}
                      disabled={!kuponKodu.trim() || kuponYukleniyor}
                      style={{
                        padding: '14px 24px',
                        background: kuponKodu.trim() ? 'var(--primary)' : 'var(--border-color)',
                        color: kuponKodu.trim() ? 'white' : 'var(--text-sub)',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: kuponKodu.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold'
                      }}
                    >
                      {kuponYukleniyor ? '...' : 'Uygula'}
                    </button>
                  </div>
                )}

                {kuponHatasi && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ {kuponHatasi}
                  </div>
                )}

                {uygulananKupon && seciliKampanya && (
                  <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '8px' }}>
                    ℹ️ Kupon uygulandı, kampanya seçimi kaldırıldı.
                  </div>
                )}
              </div>

              {/* 🆕 PUAN KULLANIMI */}
              {user && kullaniciBilgileri.puanBakiye > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>🎯 Puan Kullan</span>
                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--primary)' }}>
                      {kullaniciBilgileri.puanBakiye.toLocaleString()} puan
                    </span>
                  </h4>

                  {kullaniciBilgileri.puanBakiye < platformAyarlari.minPuanKullanim ? (
                    <div style={{
                      background: 'var(--bg-body)',
                      borderRadius: '12px',
                      padding: '15px',
                      color: 'var(--text-sub)',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}>
                      Minimum {platformAyarlari.minPuanKullanim} puan gerekli
                    </div>
                  ) : (
                    <div
                      onClick={puanKullanimToggle}
                      style={{
                        background: puanKullan ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-body)',
                        border: `2px solid ${puanKullan ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        padding: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: puanKullan ? 'var(--primary)' : 'var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px'
                          }}>
                            {puanKullan ? '✓' : ''}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                              {kullanilacakPuan.toLocaleString()} puan kullan
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                              {platformAyarlari.puanHarcamaOrani} puan = 1₺
                            </div>
                          </div>
                        </div>

                        {puanKullan && (
                          <div style={{
                            background: '#22c55e',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            -{puanIndirimi} ₺
                          </div>
                        )}
                      </div>

                      {puanKullan && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                          <input
                            type="range"
                            min={platformAyarlari.minPuanKullanim}
                            max={Math.min(
                              kullaniciBilgileri.puanBakiye,
                              (araToplam - indirimTutari - kuponIndirimi) * platformAyarlari.puanHarcamaOrani
                            )}
                            step={100}
                            value={kullanilacakPuan}
                            onChange={(e) => setKullanilacakPuan(Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', accentColor: 'var(--primary)' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-sub)', marginTop: '5px' }}>
                            <span>{platformAyarlari.minPuanKullanim}</span>
                            <span>{kullaniciBilgileri.puanBakiye}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 🆕 KAZANILACAK PUAN BİLGİSİ */}
              {kazanilacakPuan > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>🎁</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#8b5cf6' }}>
                      +{kazanilacakPuan} puan kazanacaksınız!
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      Her 1₺ = {platformAyarlari.puanKazanimOrani} puan
                    </div>
                  </div>
                </div>
              )}

              {/* Ödeme Yöntemi */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>💳 Ödeme Yöntemi</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['Nakit', 'Kredi Kartı'].map(yontem => (
                    <button
                      key={yontem}
                      onClick={() => setOdemeYontemi(yontem)}
                      style={{
                        padding: '14px',
                        border: `2px solid ${odemeYontemi === yontem ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: odemeYontemi === yontem ? 'var(--primary)' : 'transparent',
                        color: odemeYontemi === yontem ? 'white' : 'var(--text-main)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}>
                      {yontem === 'Nakit' ? '💵' : '💳'} {yontem}
                    </button>
                  ))}
                </div>
                {odemeYontemi === 'Kredi Kartı' && (
                  <div style={{
                    marginTop: '10px',
                    padding: '12px',
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--primary)'
                  }}>
                    💡 Kapıda kredi kartı ile ödeme yapabilirsiniz.
                  </div>
                )}
              </div>

              {/* Sipariş Notu */}
              <div>
                <h4 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>📝 Sipariş Notu (Opsiyonel)</h4>
                <textarea
                  value={siparisNotu}
                  onChange={(e) => setSiparisNotu(e.target.value)}
                  placeholder="Örn: Kapı zilini çalmayın, kapıda bekleyeceğim..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    background: 'var(--bg-body)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    minHeight: '60px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              {/* Özet */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-sub)' }}>
                  <span>Ara Toplam</span>
                  <span>{araToplam} ₺</span>
                </div>

                {bolgeBilgisi.teslimatUcreti > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-sub)' }}>
                    <span>🚚 Teslimat ({seciliAdres?.mahalle})</span>
                    <span>+{bolgeBilgisi.teslimatUcreti} ₺</span>
                  </div>
                )}

                {bolgeBilgisi.teslimatUcreti === 0 && bolgeBilgisi.bulundu && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#22c55e' }}>
                    <span>🚚 Teslimat</span>
                    <span>Ücretsiz!</span>
                  </div>
                )}

                {seciliKampanya && !uygulananKupon && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#22c55e' }}>
                    <span>🎉 {seciliKampanya.baslik}</span>
                    <span>-{indirimTutari} ₺</span>
                  </div>
                )}

                {/* 🆕 Kupon indirimi */}
                {kuponIndirimi > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#22c55e' }}>
                    <span>🎫 Kupon ({uygulananKupon?.kod})</span>
                    <span>-{kuponIndirimi} ₺</span>
                  </div>
                )}

                {/* 🆕 Puan indirimi */}
                {puanIndirimi > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#3b82f6' }}>
                    <span>🎯 Puan Kullanımı ({kullanilacakPuan})</span>
                    <span>-{puanIndirimi} ₺</span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: 'var(--primary)',
                  paddingTop: '12px',
                  borderTop: '2px solid var(--border-color)'
                }}>
                  <span>Toplam</span>
                  <span>{genelToplam} ₺</span>
                </div>

                {/* 🆕 Kazanılacak puan */}
                {kazanilacakPuan > 0 && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color: '#8b5cf6',
                    marginTop: '5px'
                  }}>
                    🎁 +{kazanilacakPuan} puan kazanacaksınız
                  </div>
                )}
              </div>

              {/* Butonlar */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setSiparisModalAcik(false); setUpsellModalAcik(true); }}
                  style={{
                    flex: 1,
                    padding: '15px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color: 'var(--text-sub)',
                    fontWeight: 'bold'
                  }}
                >
                  ← Geri
                </button>
                <button
                  onClick={siparisiGonder}
                  disabled={!seciliAdres || !bolgeBilgisi.bulundu || !minSepetDurumu.yeterli}
                  style={{
                    flex: 2,
                    padding: '15px',
                    background: (seciliAdres && bolgeBilgisi.bulundu && minSepetDurumu.yeterli)
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'var(--border-color)',
                    color: (seciliAdres && bolgeBilgisi.bulundu && minSepetDurumu.yeterli)
                      ? 'white'
                      : 'var(--text-sub)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (seciliAdres && bolgeBilgisi.bulundu && minSepetDurumu.yeterli)
                      ? 'pointer'
                      : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    boxShadow: (seciliAdres && bolgeBilgisi.bulundu && minSepetDurumu.yeterli)
                      ? '0 4px 15px rgba(34,197,94,0.3)'
                      : 'none'
                  }}
                >
                  {!seciliAdres
                    ? 'Adres Seçin'
                    : !bolgeBilgisi.bulundu
                      ? '🚫 Bölge Dışı'
                      : !minSepetDurumu.yeterli
                        ? `Min. ${bolgeBilgisi.limit} ₺ gerekli`
                        : 'SİPARİŞİ ONAYLA ✅'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ÇALIŞMA SAATLERİ MODAL ===== */}
      {saatlerModalAcik && (
        <div className="rd-modal-overlay" onClick={() => setSaatlerModalAcik(false)}>
          <div className="rd-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal__header">
              <h3 className="rd-modal__title">🕒 Çalışma Saatleri</h3>
              <button className="rd-modal__close" onClick={() => setSaatlerModalAcik(false)}>✕</button>
            </div>
            <div className="rd-modal__body">
              <ul className="rd-saatler__list">
                {GUNLER.map((gun, index) => {
                  const bugun = new Date().getDay();
                  const bugunIndex = bugun === 0 ? 6 : bugun - 1;
                  const saat = restoranBilgi?.calismaSaatleri?.[index] || { acilis: '10:00', kapanis: '22:00', kapali: false };
                  return (
                    <li key={gun} className={`rd-saatler__item ${index === bugunIndex ? 'rd-saatler__item--today' : ''}`}>
                      <span className="rd-saatler__day">{index === bugunIndex && '👉 '}{gun}</span>
                      <span>{saat.kapali ? 'Kapalı' : `${saat.acilis} - ${saat.kapanis}`}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rd-modal__footer">
              <button className="rd-modal__btn rd-modal__btn--cancel" onClick={() => setSaatlerModalAcik(false)} style={{ flex: 1 }}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== GALERİ MODAL ===== */}
      {galeriModalAcik && galeriResimleri.length > 0 && (
        <div className="rd-galeri" onClick={() => setGaleriModalAcik(false)}>
          <div className="rd-galeri__content" onClick={e => e.stopPropagation()}>
            <button className="rd-galeri__close" onClick={() => setGaleriModalAcik(false)}>✕</button>
            <img src={galeriResimleri[galeriIndex]} alt={`Fotoğraf ${galeriIndex + 1}`} className="rd-galeri__main" />
            {galeriResimleri.length > 1 && (
              <>
                <button className="rd-galeri__nav rd-galeri__nav--prev" onClick={() => setGaleriIndex(i => i === 0 ? galeriResimleri.length - 1 : i - 1)}>←</button>
                <button className="rd-galeri__nav rd-galeri__nav--next" onClick={() => setGaleriIndex(i => i === galeriResimleri.length - 1 ? 0 : i + 1)}>→</button>
                <div className="rd-galeri__thumbs">
                  {galeriResimleri.map((resim, i) => (
                    <img key={i} src={resim} alt={`Küçük ${i + 1}`} className={`rd-galeri__thumb ${i === galeriIndex ? 'active' : ''}`} onClick={() => setGaleriIndex(i)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ PREMIUM BİLDİRİM (TOAST) */}
      {bildirim && (
        <div style={{
          position: 'fixed',
          bottom: '90px', // BottomNav'ın hemen üstü
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30, 41, 59, 0.95)', // Koyu, modern arka plan
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '90%',
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            background: '#22c55e',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{bildirim.mesaj}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
              {bildirim.urun} • {bildirim.tutar} ₺
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#22c55e',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            Eklendi
          </div>
          <style>{`
            @keyframes slideUpFade {
              0% { transform: translate(-50%, 20px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default RestoranDetay;