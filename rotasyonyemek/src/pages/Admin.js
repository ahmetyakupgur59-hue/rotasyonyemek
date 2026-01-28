import React, { useState, useEffect, useMemo } from 'react';
import {
    onSnapshot,
    onDocSnapshot,
    getDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    setDoc,
    serverTimestamp,
    arrayUnion,
    queryCollection,
    onAuthStateChanged,
    signOut,
    supabase,
    getDocs,
    batchOperations // YENİ: Batch işlemleri için
} from '../supabaseHelpers';
import { useNavigate } from 'react-router-dom';

// --- YARDIMCI FONKSİYONLAR ---
const trKarakterCevir = (metin) => {
    return metin
        .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
        .replace(/I/g, 'i').replace(/İ/g, 'i').replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o')
        .replace(/ç/g, 'c').replace(/\s+/g, '').toLowerCase();
};

// --- SABİTLER ---
const TABS = [
    { id: 'dashboard', icon: '📊', label: 'Genel Bakış' },
    { id: 'siparisler', icon: '📦', label: 'Siparişler' },
    { id: 'restoranlar', icon: '🏢', label: 'Restoranlar' },
    { id: 'kullanicilar', icon: '👥', label: 'Kullanıcılar' },
    { id: 'kampanyalar', icon: '🔥', label: 'Kampanyalar' },
    { id: 'kuponlar', icon: '🎫', label: 'Kuponlar' },        // 🆕
    { id: 'puanlar', icon: '🎯', label: 'Puan Sistemi' },     // 🆕
    { id: 'bolgeler', icon: '🗺️', label: 'Bölge Yönetimi' },
    { id: 'finans', icon: '💰', label: 'Finans' },
    { id: 'destek', icon: '🛟', label: 'Destek' },
    { id: 'ayarlar', icon: '⚙️', label: 'Ayarlar' },
];

const SIPARIS_DURUMLARI = ['Tümü', 'Onay Bekliyor', 'Hazırlanıyor', 'Yolda', 'Teslim Edildi', 'İptal Edildi', 'İade Edildi'];

// === YARDIMCI STYLE FONKSİYONLARI ===
const getDurumStyle = (durum) => {
    const styles = {
        'Onay Bekliyor': { background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'Hazırlanıyor': { background: '#3b82f620', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'Yolda': { background: '#8b5cf620', color: '#8b5cf6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'Teslim Edildi': { background: '#10b98120', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'İptal Edildi': { background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'İade Edildi': { background: '#e1151520', color: '#e11515', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }
    };
    return styles[durum] || {};
};

const getRolStyle = (rol) => {
    const styles = {
        'musteri': { background: '#3b82f620', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'restoran': { background: '#8b5cf620', color: '#8b5cf6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
        'superadmin': { background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }
    };
    return styles[rol] || styles['musteri'];
};

// === KPI CARD COMPONENT ===
const KPICard = ({ title, value, icon, color, subtitle, negative }) => (
    <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${color}30`,
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            fontSize: '80px',
            opacity: 0.1,
            color: color
        }}>{icon}</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{title}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: negative ? '#ef4444' : color }}>{value}</div>
            {subtitle && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{subtitle}</div>}
        </div>
    </div>
);

function Admin() {
    const navigate = useNavigate();

    // === ANA STATE'LER ===
    const [activeTab, setActiveTab] = useState("dashboard");
    const [yukleniyor, setYukleniyor] = useState(true);
    const [adminBilgi, setAdminBilgi] = useState(null);

    // === VERİ STATE'LERİ ===
    const [restoranlar, setRestoranlar] = useState([]);
    const [kullanicilar, setKullanicilar] = useState([]);
    const [tumSiparisler, setTumSiparisler] = useState([]);
    const [destekTalepleri, setDestekTalepleri] = useState([]);
    const [platformAyarlari, setPlatformAyarlari] = useState({
        varsayilanKomisyon: 10,
        minSiparisTutari: 50,
        platformAdi: 'RotasyonYemek',
        destekTelefon: '0850 XXX XX XX',
        destekEmail: 'destek@rotasyonyemek.com',
        bakimModu: false,        // ✅ YENİ
        bakimMesaji: '',          // ✅ YENİ
        // 🆕 PUAN SİSTEMİ AYARLARI
        puanKazanimOrani: 1,        // Her 1₺ = 1 puan
        puanHarcamaOrani: 100,      // 100 puan = 1₺ indirim
        minPuanKullanim: 500,       // Min 500 puan kullanılabilir
        streakHedef: 5,             // 5 sipariş = bonus
        streakBonusPuan: 50,        // Streak bonusu
        referansBonusu: 100,        // Davet eden/edilen bonus
        yeniUyeBonusu: 50,          // İlk kayıtta verilen puan
        yeniUyeKuponu: ''           // 🆕 Yeni üyelere verilecek kupon kodu
    });

    // === FİLTRE STATE'LERİ ===
    const [zamanFiltresi, setZamanFiltresi] = useState("bugun");
    const [siparisFiltresi, setSiparisFiltresi] = useState({ durum: 'Tümü', restoran: '', arama: '' });
    const [kullaniciFiltresi, setKullaniciFiltresi] = useState({ rol: 'Tümü', arama: '' });

    // === SEÇİM STATE'LERİ ===
    const [seciliRestoran, setSeciliRestoran] = useState(null);
    const [seciliKullanici, setSeciliKullanici] = useState(null);
    const [seciliSiparis, setSeciliSiparis] = useState(null);
    const [seciliTalep, setSeciliTalep] = useState(null);

    // === FORM STATE'LERİ ===
    const [yeniKomisyon, setYeniKomisyon] = useState("");
    const [yeniRes, setYeniRes] = useState({
        isim: "", kategori: "Burger", resim: "", kapakResmi: "",
        email: "", sifre: "", telefon: "", adres: ""
    });
    const [yeniKampanya, setYeniKampanya] = useState({
        baslik: "", tip: "yuzde", deger: 10, minSepet: 0,
        restoranId: "", global: false, aktif: true
    });
    const [duyuruMetni, setDuyuruMetni] = useState("");
    const [talepCevap, setTalepCevap] = useState("");

    // === PUAN & KUPON STATE'LERİ ===
    const [kuponlar, setKuponlar] = useState([]);
    const [yeniKupon, setYeniKupon] = useState({
        kod: '',
        tip: 'yuzde',
        deger: 10,
        minSepet: 0,
        maxKullanim: 100,
        baslangic: '',
        bitis: '',
        aktif: true
    });
    const [kuponModalAcik, setKuponModalAcik] = useState(false);

    // === MODAL STATE'LERİ ===
    const [modalAcik, setModalAcik] = useState(false);
    const [kampanyaModalAcik, setKampanyaModalAcik] = useState(false);
    const [siparisDetayModal, setSiparisDetayModal] = useState(false);
    const [kullaniciDetayModal, setKullaniciDetayModal] = useState(false);
    const [restoranDetayModal, setRestoranDetayModal] = useState(false);
    const [talepDetayModal, setTalepDetayModal] = useState(false);

    // === ÖDEME GEÇMİŞİ ===
    const [odemeGecmisi, setOdemeGecmisi] = useState([]);

    // === BÖLGE YÖNETİMİ STATE'LERİ ===
    const [bolgeler, setBolgeler] = useState({});
    const [seciliSehir, setSeciliSehir] = useState("");
    const [seciliIlce, setSeciliIlce] = useState("");
    const [yeniSehir, setYeniSehir] = useState("");
    const [yeniIlce, setYeniIlce] = useState("");
    const [yeniMahalle, setYeniMahalle] = useState("");

    // ============================================================
    // 1. VERİ ÇEKME VE YETKİ KONTROLÜ
    // ============================================================
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                setYukleniyor(false);
                navigate("/login");
                return;
            }

            try {
                // Yetki kontrolü
                const userSnap = await getDoc("kullanicilar", currentUser.id);

                if (!userSnap.exists() || userSnap.data().rol !== "superadmin") {
                    alert("⛔ Bu alana sadece Yöneticiler girebilir!");
                    navigate("/");
                    return;
                }

                setAdminBilgi({ uid: currentUser.id, email: currentUser.email, ...userSnap.data() });

                // a) Restoranları dinle
                const unsubRes = onSnapshot("restoranlar", (snapshot) => {
                    setRestoranlar(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                });

                // b) Kullanıcıları dinle
                const unsubUser = onSnapshot("kullanicilar", (snapshot) => {
                    setKullanicilar(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                });

                // c) Siparişleri dinle
                const unsubOrder = onSnapshot("siparisler", (snapshot) => {
                    const sorted = snapshot.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0));
                    setTumSiparisler(sorted);
                    setYukleniyor(false);
                });

                // d) Destek taleplerini dinle
                const unsubDestek = onSnapshot("destek_talepleri", (snapshot) => {
                    const sorted = snapshot.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0));
                    setDestekTalepleri(sorted);
                });

                // e) Platform ayarlarını çek
                const ayarlarSnap = await getDoc("sistem", "ayarlar");
                if (ayarlarSnap.exists()) {
                    setPlatformAyarlari(prev => ({ ...prev, ...ayarlarSnap.data() }));
                }

                // f) Ödeme geçmişini dinle
                const unsubOdeme = onSnapshot("odemeler", (snapshot) => {
                    const sorted = snapshot.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0));
                    setOdemeGecmisi(sorted);
                });

                // g) Bölgeleri dinle
                const unsubBolgeler = onDocSnapshot("bolgeler", "turkiye", (snapshot) => {
                    if (snapshot.exists()) {
                        setBolgeler(snapshot.data());
                    } else {
                        setBolgeler({});
                    }
                });

                // h) Kuponları dinle
                const unsubKuponlar = onSnapshot("kuponlar", (snapshot) => {
                    const sorted = snapshot.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => (b.olusturulmaTarihi?.seconds || 0) - (a.olusturulmaTarihi?.seconds || 0));
                    setKuponlar(sorted);
                });

                return () => {

                    unsubRes();
                    unsubUser();
                    unsubOrder();
                    unsubDestek();
                    unsubOdeme();
                    unsubBolgeler();
                    unsubKuponlar();
                };

            } catch (error) {
                console.error("Admin Panel Hatası:", error);
                setYukleniyor(false);
            }
        });

        return () => unsubAuth();
    }, [navigate]);

    // ============================================================
    // 2. HESAPLAMALAR (useMemo ile optimize)
    // ============================================================

    // Kampanyaları restoranlardan derle
    const kampanyalar = useMemo(() => {
        let tumKampanyalar = [];
        restoranlar.forEach(res => {
            if (res.kampanyalar && Array.isArray(res.kampanyalar)) {
                res.kampanyalar.forEach(k => {
                    tumKampanyalar.push({
                        ...k,
                        restoranId: res.id,
                        restoranAd: res.isim,
                        restoranLogo: res.resim
                    });
                });
            }
        });
        return tumKampanyalar;
    }, [restoranlar]);

    // Zaman filtresine göre siparişler
    const filtrelenmisZamanSiparisler = useMemo(() => {
        const simdi = new Date();

        if (zamanFiltresi === "bugun") {
            return tumSiparisler.filter(s => {
                const tarih = s.tarih?.seconds ? new Date(s.tarih.seconds * 1000) : new Date();
                return tarih.getDate() === simdi.getDate() &&
                    tarih.getMonth() === simdi.getMonth() &&
                    tarih.getFullYear() === simdi.getFullYear();
            });
        } else if (zamanFiltresi === "hafta") {
            const haftaOnce = new Date();
            haftaOnce.setDate(simdi.getDate() - 7);
            return tumSiparisler.filter(s => {
                const tarih = s.tarih?.seconds ? new Date(s.tarih.seconds * 1000) : new Date();
                return tarih >= haftaOnce;
            });
        } else if (zamanFiltresi === "ay") {
            const ayOnce = new Date();
            ayOnce.setMonth(simdi.getMonth() - 1);
            return tumSiparisler.filter(s => {
                const tarih = s.tarih?.seconds ? new Date(s.tarih.seconds * 1000) : new Date();
                return tarih >= ayOnce;
            });
        }
        return tumSiparisler;
    }, [zamanFiltresi, tumSiparisler]);

    // Siparişler sayfası için filtreleme
    const filtrelenmisSiparisler = useMemo(() => {
        let sonuc = tumSiparisler;

        if (siparisFiltresi.durum !== 'Tümü') {
            sonuc = sonuc.filter(s => s.durum === siparisFiltresi.durum);
        }
        if (siparisFiltresi.restoran) {
            sonuc = sonuc.filter(s => s.restoranId === siparisFiltresi.restoran);
        }
        if (siparisFiltresi.arama) {
            const aranan = siparisFiltresi.arama.toLowerCase();
            sonuc = sonuc.filter(s =>
                s.musteriAd?.toLowerCase().includes(aranan) ||
                s.id.toLowerCase().includes(aranan) ||
                s.adres?.toLowerCase().includes(aranan)
            );
        }
        return sonuc;
    }, [tumSiparisler, siparisFiltresi]);

    // Kullanıcılar için filtreleme
    const filtrelenmisKullanicilar = useMemo(() => {
        let sonuc = kullanicilar;

        if (kullaniciFiltresi.rol !== 'Tümü') {
            sonuc = sonuc.filter(k => k.rol === kullaniciFiltresi.rol);
        }
        if (kullaniciFiltresi.arama) {
            const aranan = kullaniciFiltresi.arama.toLowerCase();
            sonuc = sonuc.filter(k =>
                k.email?.toLowerCase().includes(aranan) ||
                k.ad?.toLowerCase().includes(aranan) ||
                k.telefon?.includes(aranan)
            );
        }
        return sonuc;
    }, [kullanicilar, kullaniciFiltresi]);

    // Dashboard KPI Hesaplamaları
    const dashboardStats = useMemo(() => {
        const teslimEdilenler = filtrelenmisZamanSiparisler.filter(s => s.durum === "Teslim Edildi");
        const iptalEdilenler = filtrelenmisZamanSiparisler.filter(s => s.durum === "İptal Edildi" || s.durum === "İade Edildi");
        const bekleyenler = tumSiparisler.filter(s => s.durum === "Onay Bekliyor");
        const hazirlananlar = tumSiparisler.filter(s => s.durum === "Hazırlanıyor" || s.durum === "Yolda");

        const gercekCiro = teslimEdilenler.reduce((acc, s) => acc + (Number(s.toplamTutar) || 0), 0);
        const iptalTutar = iptalEdilenler.reduce((acc, s) => acc + (Number(s.toplamTutar) || 0), 0);
        const platformGeliri = gercekCiro * (platformAyarlari.varsayilanKomisyon / 100);

        const bugunkuYeniKullanici = kullanicilar.filter(k => {
            if (!k.olusturulmaTarihi) return false;
            const tarih = k.olusturulmaTarihi.seconds ? new Date(k.olusturulmaTarihi.seconds * 1000) : new Date(k.olusturulmaTarihi);
            const bugun = new Date();
            return tarih.getDate() === bugun.getDate() && tarih.getMonth() === bugun.getMonth();
        }).length;

        const aktifRestoranlar = restoranlar.filter(r => r.acikMi === true).length;
        const bekleyenDestekler = destekTalepleri.filter(t => t.durum === 'Bekliyor').length;

        const ortalamaSiparis = teslimEdilenler.length > 0 ? gercekCiro / teslimEdilenler.length : 0;

        return {
            gercekCiro,
            iptalTutar,
            platformGeliri,
            toplamSiparis: filtrelenmisZamanSiparisler.length,
            teslimEdilen: teslimEdilenler.length,
            iptalEdilen: iptalEdilenler.length,
            bekleyenSiparis: bekleyenler.length,
            aktifSiparis: hazirlananlar.length,
            bugunkuYeniKullanici,
            aktifRestoranlar,
            toplamRestoran: restoranlar.length,
            toplamKullanici: kullanicilar.length,
            bekleyenDestekler,
            ortalamaSiparis: ortalamaSiparis.toFixed(2),
            iptalOrani: filtrelenmisZamanSiparisler.length > 0
                ? ((iptalEdilenler.length / filtrelenmisZamanSiparisler.length) * 100).toFixed(1)
                : 0
        };
    }, [filtrelenmisZamanSiparisler, tumSiparisler, kullanicilar, restoranlar, destekTalepleri, platformAyarlari]);

    // Restoran bazlı finans hesaplamaları
    const restoranFinanslari = useMemo(() => {
        return restoranlar.map(res => {
            const resSiparisleri = tumSiparisler.filter(s => s.restoranId === res.id && s.durum === "Teslim Edildi");
            const resCiro = resSiparisleri.reduce((t, s) => t + (Number(s.toplamTutar) || 0), 0);
            const komisyonOrani = res.komisyon || platformAyarlari.varsayilanKomisyon;
            const kesinti = resCiro * (komisyonOrani / 100);
            const odenecek = resCiro - kesinti;
            const odemeler = odemeGecmisi.filter(o => o.restoranId === res.id);
            const odenenToplam = odemeler.reduce((t, o) => t + (Number(o.tutar) || 0), 0);
            const kalanBakiye = odenecek - odenenToplam;

            return {
                ...res,
                siparisAdedi: resSiparisleri.length,
                toplamCiro: resCiro,
                komisyonOrani,
                kesinti,
                odenecek,
                odenenToplam,
                kalanBakiye
            };
        });
    }, [restoranlar, tumSiparisler, odemeGecmisi, platformAyarlari]);

    // ============================================================
    // 3. İŞLEM FONKSİYONLARI
    // ============================================================

    // --- RESTORAN İŞLEMLERİ ---
    // --- RESTORAN İŞLEMLERİ ---
    const restoranEkle = async (e) => {
        e.preventDefault();

        try {
            // ÖNEMLİ: Supabase'de client-side olarak başka bir kullanıcı oluşturmak 
            // mevcut oturumu kapatır. Bu yüzden burada sadece restoran kaydı oluşturuyoruz.
            // Restoran sahibi bu email ile giriş yaptığında/kaydolduğunda eşleşme sağlanacaktır.

            // Restoran dökümanı oluştur
            await addDoc("restoranlar", {
                isim: yeniRes.isim,
                kategori: yeniRes.kategori,
                resim: yeniRes.resim || "https://via.placeholder.com/100",
                kapakResmi: yeniRes.kapakResmi || "https://via.placeholder.com/400x150",
                telefon: yeniRes.telefon,
                adres: yeniRes.adres,
                puan: 0,
                sahipEmail: yeniRes.email.toLowerCase().trim(),
                sahipUid: null, // Kullanıcı daha sonra giriş yapınca güncellenebilir veya email yeterli
                durum: true,
                acikMi: true,
                yogunluk: "Normal",
                komisyon: platformAyarlari.varsayilanKomisyon,
                bakiye: 0,
                olusturulmaTarihi: serverTimestamp(),
                kampanyalar: [],
                bolgeler: [],
                calismaSaatleri: {},
                onay: false
            });

            alert("✅ Restoran başarıyla eklendi! (Kullanıcı kaydı oluşturulmadı, restoran sahibi bu email ile kendisi kaydolmalı)");
            setModalAcik(false);
            setYeniRes({
                isim: "",
                kategori: "Burger",
                resim: "",
                kapakResmi: "",
                email: "",
                sifre: "",
                telefon: "",
                adres: ""
            });

        } catch (err) {
            console.error("Restoran ekleme hatası:", err);
            alert("❌ Bir hata oluştu: " + err.message);
        }
    };

    const restoranGuncelle = async (restoranId, guncellemeler) => {
        try {
            await updateDoc("restoranlar", restoranId, guncellemeler);
            alert("✅ Güncellendi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const restoranSil = async (restoranId) => {
        if (!window.confirm("Emin misin abi? Bu restoran tamamen silinecek!")) return;

        try {
            // İlgili yemekleri sil
            const yemeklerSnap = await getDocs(
                queryCollection("yemekler", [{ field: "restoranId", operator: "==", value: restoranId }])
            );

            const operations = yemeklerSnap.docs.map(doc => ({
                type: 'delete',
                collection: 'yemekler',
                id: doc.id
            }));

            // Restoranı da silme listesine ekle
            operations.push({
                type: 'delete',
                collection: 'restoranlar',
                id: restoranId
            });

            await batchOperations(operations);

            setSeciliRestoran(null);
            alert("🗑️ Restoran silindi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- SİPARİŞ İŞLEMLERİ ---
    const siparisDurumGuncelle = async (siparisId, yeniDurum) => {
        try {
            await updateDoc("siparisler", siparisId, {
                durum: yeniDurum,
                sonGuncelleme: serverTimestamp()
            });
            alert(`✅ Sipariş durumu "${yeniDurum}" olarak güncellendi!`);
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const siparisIptalEt = async (siparisId) => {
        const sebep = window.prompt("İptal sebebini yazın:");
        if (!sebep) return;

        try {
            await updateDoc("siparisler", siparisId, {
                durum: "İptal Edildi",
                iptalSebebi: sebep,
                iptalEden: "admin",
                sonGuncelleme: serverTimestamp()
            });
            alert("✅ Sipariş iptal edildi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- KULLANICI İŞLEMLERİ ---
    const kullaniciRolDegistir = async (kullaniciId, yeniRol) => {
        if (!window.confirm(`Kullanıcı rolü "${yeniRol}" olarak değiştirilecek. Emin misiniz?`)) return;

        try {
            await updateDoc("kullanicilar", kullaniciId, { rol: yeniRol });
            alert("✅ Rol güncellendi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const kullaniciBanla = async (kullaniciId, banliMi) => {
        const islem = banliMi ? "yasaklayacaksınız" : "yasağı kaldıracaksınız";
        if (!window.confirm(`Bu kullanıcıyı ${islem}. Emin misiniz?`)) return;

        try {
            await updateDoc("kullanicilar", kullaniciId, {
                banliMi: banliMi,
                banTarihi: banliMi ? serverTimestamp() : null
            });
            alert(banliMi ? "🚫 Kullanıcı yasaklandı!" : "✅ Yasak kaldırıldı!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const kullaniciSil = async (kullaniciId) => {
        if (!window.confirm("⚠️ Bu kullanıcı kalıcı olarak silinecek. Emin misiniz?")) return;

        try {
            await deleteDoc("kullanicilar", kullaniciId);
            setSeciliKullanici(null);
            alert("🗑️ Kullanıcı silindi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- KAMPANYA İŞLEMLERİ ---
    const kampanyaEkle = async (e) => {
        e.preventDefault();

        try {
            if (yeniKampanya.global) {
                // Global kampanya - tüm restoranlara ekle (BATCH KULLANIMI)
                const updates = restoranlar.map(res => {
                    const yeniKampanyaObj = {
                        baslik: yeniKampanya.baslik,
                        tip: yeniKampanya.tip,
                        deger: Number(yeniKampanya.deger),
                        minSepet: Number(yeniKampanya.minSepet),
                        aktif: true,
                        global: true,
                        olusturulmaTarihi: new Date()
                    };
                    const mevcutKampanyalar = res.kampanyalar || [];
                    return {
                        id: res.id,
                        data: { kampanyalar: [...mevcutKampanyalar, yeniKampanyaObj] }
                    };
                });

                // Batch helper kullanımı (veya döngü ile updateDoc)
                for (const update of updates) {
                    await updateDoc("restoranlar", update.id, update.data);
                }

                alert("✅ Global kampanya tüm restoranlara eklendi!");
            } else {
                // Tek restoran kampanyası
                if (!yeniKampanya.restoranId) return alert("Lütfen restoran seçin!");

                const mevcutRes = restoranlar.find(r => r.id === yeniKampanya.restoranId);
                const yeniKampanyaObj = {
                    baslik: yeniKampanya.baslik,
                    tip: yeniKampanya.tip,
                    deger: Number(yeniKampanya.deger),
                    minSepet: Number(yeniKampanya.minSepet),
                    aktif: true,
                    olusturulmaTarihi: new Date()
                };
                const mevcutKampanyalar = mevcutRes.kampanyalar || [];
                await updateDoc("restoranlar", yeniKampanya.restoranId, { kampanyalar: [...mevcutKampanyalar, yeniKampanyaObj] });
                alert("✅ Kampanya eklendi!");
            }

            setKampanyaModalAcik(false);
            setYeniKampanya({ baslik: "", tip: "yuzde", deger: 10, minSepet: 0, restoranId: "", global: false, aktif: true });
        } catch (err) {
            console.error(err);
            alert("Hata: " + err.message);
        }
    };

    const kampanyaSil = async (restoranId, kampanyaIndex) => {
        if (!window.confirm("Bu kampanya silinecek. Emin misiniz?")) return;

        try {
            const res = restoranlar.find(r => r.id === restoranId);
            const yeniKampanyalar = [...(res.kampanyalar || [])];
            yeniKampanyalar.splice(kampanyaIndex, 1);
            await updateDoc("restoranlar", restoranId, { kampanyalar: yeniKampanyalar });
            alert("🗑️ Kampanya silindi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const kampanyaDurumDegistir = async (restoranId, kampanyaIndex) => {
        try {
            const res = restoranlar.find(r => r.id === restoranId);
            const yeniKampanyalar = [...(res.kampanyalar || [])];
            yeniKampanyalar[kampanyaIndex].aktif = !yeniKampanyalar[kampanyaIndex].aktif;
            await updateDoc("restoranlar", restoranId, { kampanyalar: yeniKampanyalar });
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- BÖLGE İŞLEMLERİ ---
    const sehirEkle = async () => {
        if (!yeniSehir.trim()) return alert("Şehir adı girin!");

        const sehirKey = trKarakterCevir(yeniSehir);

        try {
            const bolgeSnap = await getDoc("bolgeler", "turkiye");

            let mevcutBolgeler = {};
            if (bolgeSnap.exists()) {
                mevcutBolgeler = bolgeSnap.data();
            }

            if (mevcutBolgeler[sehirKey]) {
                return alert("Bu şehir zaten mevcut!");
            }

            mevcutBolgeler[sehirKey] = {
                ad: yeniSehir.trim(),
                ilceler: {}
            };

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert(`✅ ${yeniSehir} eklendi!`);
            setYeniSehir("");
        } catch (err) {
            console.error("Şehir ekleme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    const ilceEkle = async () => {
        if (!seciliSehir || !yeniIlce.trim()) return alert("Şehir seçin ve ilçe adı girin!");

        const ilceKey = trKarakterCevir(yeniIlce);

        try {
            const { data: bolgeData, error: bolgeError } = await supabase
                .from("bolgeler")
                .select("data")
                .eq("id", "turkiye")
                .single();

            if (bolgeError && bolgeError.code !== 'PGRST116') {
                throw bolgeError;
            }

            if (!bolgeData || !bolgeData.data) return alert("Bölge verisi bulunamadı!");

            const mevcutBolgeler = bolgeData.data;

            if (!mevcutBolgeler[seciliSehir]) {
                return alert("Seçili şehir bulunamadı!");
            }

            if (mevcutBolgeler[seciliSehir]?.ilceler[ilceKey]) {
                return alert("Bu ilçe zaten mevcut!");
            }

            mevcutBolgeler[seciliSehir].ilceler[ilceKey] = {
                ad: yeniIlce.trim(),
                mahalleler: []
            };

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert(`✅ ${yeniIlce} ilçesi eklendi!`);
            setYeniIlce("");
        } catch (err) {
            console.error("İlçe ekleme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    const mahalleEkle = async () => {
        if (!seciliSehir || !seciliIlce || !yeniMahalle.trim())
            return alert("Lütfen tüm seçimleri yapın!");

        try {
            const bolgeSnap = await getDoc("bolgeler", "turkiye");

            if (!bolgeSnap.exists()) return alert("Bölge verisi bulunamadı!");

            const mevcutBolgeler = bolgeSnap.data();

            if (mevcutBolgeler[seciliSehir]?.ilceler[seciliIlce]?.mahalleler.includes(yeniMahalle.trim())) {
                return alert("Bu mahalle zaten mevcut!");
            }

            mevcutBolgeler[seciliSehir].ilceler[seciliIlce].mahalleler.push(yeniMahalle.trim());

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert(`✅ ${yeniMahalle} eklendi!`);
            setYeniMahalle("");
        } catch (err) {
            console.error("Mahalle ekleme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    const sehirSil = async (sehirKey) => {
        if (!window.confirm(`"${bolgeler[sehirKey]?.ad}" şehri ve tüm alt bölgeleri silinecek. Emin misiniz?`)) return;

        try {
            const bolgeSnap = await getDoc("bolgeler", "turkiye");

            if (!bolgeSnap.exists()) return alert("Bölge verisi bulunamadı!");

            const mevcutBolgeler = bolgeSnap.data();
            delete mevcutBolgeler[sehirKey];

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert("🗑️ Şehir silindi!");

            if (seciliSehir === sehirKey) {
                setSeciliSehir("");
                setSeciliIlce("");
            }
        } catch (err) {
            console.error("Şehir silme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    const ilceSil = async (sehirKey, ilceKey) => {
        if (!window.confirm(`"${bolgeler[sehirKey]?.ilceler[ilceKey]?.ad}" ilçesi ve tüm mahalleleri silinecek. Emin misiniz?`)) return;

        try {
            const bolgeSnap = await getDoc("bolgeler", "turkiye");

            if (!bolgeSnap.exists()) return alert("Bölge verisi bulunamadı!");

            const mevcutBolgeler = bolgeSnap.data();
            delete mevcutBolgeler[sehirKey].ilceler[ilceKey];

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert("🗑️ İlçe silindi!");

            if (seciliIlce === ilceKey) {
                setSeciliIlce("");
            }
        } catch (err) {
            console.error("İlçe silme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    const mahalleSil = async (sehirKey, ilceKey, mahalleAd) => {
        if (!window.confirm(`"${mahalleAd}" mahallesini silmek istediğinize emin misiniz?`)) return;

        try {
            const bolgeSnap = await getDoc("bolgeler", "turkiye");

            if (!bolgeSnap.exists()) return alert("Bölge verisi bulunamadı!");

            const mevcutBolgeler = bolgeSnap.data();
            mevcutBolgeler[sehirKey].ilceler[ilceKey].mahalleler =
                mevcutBolgeler[sehirKey].ilceler[ilceKey].mahalleler.filter(m => m !== mahalleAd);

            await setDoc("bolgeler", "turkiye", mevcutBolgeler);
            alert("🗑️ Mahalle silindi!");
        } catch (err) {
            console.error("Mahalle silme hatası:", err);
            alert("Hata: " + err.message);
        }
    };

    // --- DESTEK İŞLEMLERİ ---
    const talepCevapla = async (talepId) => {
        if (!talepCevap.trim()) return alert("Lütfen cevap yazın!");

        try {
            await updateDoc("destek_talepleri", talepId, {
                durum: "Cevaplandı",
                cevap: talepCevap,
                cevapTarihi: serverTimestamp(),
                cevaplayan: adminBilgi.email
            });
            setTalepCevap("");
            setTalepDetayModal(false);
            alert("✅ Cevap gönderildi!");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const talepDurumGuncelle = async (talepId, yeniDurum) => {
        try {
            await updateDoc("destek_talepleri", talepId, {
                durum: yeniDurum,
                sonGuncelleme: serverTimestamp()
            });
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const talepSil = async (talepId) => {
        if (!window.confirm("Bu talep silinecek. Emin misiniz?")) return;
        try {
            await deleteDoc("destek_talepleri", talepId);
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- FİNANS İŞLEMLERİ ---
    const odemeYap = async (restoran) => {
        const tutar = window.prompt(`${restoran.isim} için ödenecek tutar:`, restoran.kalanBakiye.toFixed(2));
        if (!tutar || isNaN(Number(tutar))) return;

        try {
            await addDoc("odemeler", {
                restoranId: restoran.id,
                restoranAd: restoran.isim,
                tutar: Number(tutar),
                tarih: serverTimestamp(),
                odemeTipi: "Banka Transferi",
                islemYapan: adminBilgi?.email,
                durum: "Tamamlandı"
            });
            alert(`✅ ${restoran.isim} için ${tutar} ₺ ödeme kaydedildi!`);
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const topluOdeme = async () => {
        const secililer = restoranFinanslari.filter(r => r.kalanBakiye > 0);
        if (secililer.length === 0) return alert("Ödenecek bakiye bulunamadı!");

        if (!window.confirm(`${secililer.length} restorana toplam ödeme yapılacak. Devam?`)) return;

        try {
            const operations = secililer.map(r => ({
                type: 'add',
                collection: 'odemeler',
                data: {
                    restoranId: r.id,
                    restoranAd: r.isim,
                    tutar: r.kalanBakiye,
                    tarih: serverTimestamp(),
                    odemeTipi: "Toplu Ödeme",
                    islemYapan: adminBilgi?.email,
                    durum: "Tamamlandı"
                }
            }));
            await batchOperations(operations);
            alert(`✅ ${secililer.length} restorana ödeme yapıldı!`);
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    // --- AYARLAR İŞLEMLERİ ---
    const ayarlariKaydet = async () => {
        try {
            await updateDoc("sistem", "ayarlar", platformAyarlari);
            alert("✅ Ayarlar kaydedildi!");
        } catch (err) {
            // Döküman yoksa oluştur
            try {
                await setDoc("sistem", "ayarlar", platformAyarlari);
                alert("✅ Ayarlar kaydedildi!");
            } catch (e) {
                alert("Hata: " + e.message);
            }
        }
    };

    const duyuruGonder = async () => {
        if (!duyuruMetni.trim()) return alert("Lütfen duyuru metni yazın!");

        try {
            await addDoc("duyurular", {
                mesaj: duyuruMetni,
                tarih: serverTimestamp(),
                gonderen: adminBilgi?.email,
                aktif: true
            });
            alert("📢 Duyuru yayınlandı!");
            setDuyuruMetni("");
        } catch (err) {
            alert("Hata: " + err.message);
        }
    };

    const copleriTemizle = async () => {
        if (!window.confirm("30 günden eski İPTAL edilmiş siparişler silinecek. Devam?")) return;

        const eskiTarih = new Date();
        eskiTarih.setDate(eskiTarih.getDate() - 30);

        const silinecekler = tumSiparisler.filter(s =>
            (s.durum === "İptal Edildi") &&
            (s.tarih?.seconds && new Date(s.tarih.seconds * 1000) < eskiTarih)
        );

        if (silinecekler.length === 0) return alert("Silinecek eski veri bulunamadı.");

        const operations = silinecekler.map(s => ({
            type: 'delete',
            collection: 'siparisler',
            id: s.id
        }));

        await batchOperations(operations);
        alert(`🧹 ${silinecekler.length} kayıt temizlendi!`);
    };

    // 🆕 KUPON DAĞITMA FONKSİYONU
    const kuponuDagit = async (kupon) => {
        if (!window.confirm(`"${kupon.kod}" kodlu kuponu TÜM KULLANICILARA (${kullanicilar.length} kişi) göndermek istediğinize emin misiniz?`)) return;

        setYukleniyor(true);
        try {
            // Kupon dağıtma işlemini tek tek yapalım (arrayUnion nedeniyle)
            const kuponObj = {
                kod: kupon.kod,
                baslik: kupon.kod + " Fırsatı",
                deger: kupon.deger,
                tip: kupon.tip,
                minSepet: kupon.minSepet || 0,
                eklenmeTarihi: new Date().toISOString()
            };

            for (const user of kullanicilar) {
                await arrayUnion("kullanicilar", user.id, "kuponlarim", kuponObj);
            }

            alert(`✅ Kupon ${kullanicilar.length} kullanıcıya başarıyla dağıtıldı!`);
        } catch (err) {
            console.error("Kupon dağıtma hatası:", err);
            alert("Hata: " + err.message);
        } finally {
            setYukleniyor(false);
        }
    };

    // --- YARDIMCI FONKSİYONLAR ---
    const formatTarih = (timestamp) => {
        if (!timestamp) return "-";
        const tarih = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return tarih.toLocaleDateString('tr-TR') + ' ' + tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatPara = (tutar) => {
        return Number(tutar || 0).toLocaleString('tr-TR') + ' ₺';
    };

    // Kullanıcının sipariş geçmişini getir
    const kullaniciSiparisleri = useMemo(() => {
        if (!seciliKullanici) return [];
        return tumSiparisler.filter(s => s.musteriId === seciliKullanici.id);
    }, [seciliKullanici, tumSiparisler]);

    // Restoran sipariş geçmişini getir  
    const restoranSiparisleri = useMemo(() => {
        if (!seciliRestoran) return [];
        return tumSiparisler.filter(s => s.restoranId === seciliRestoran.id);
    }, [seciliRestoran, tumSiparisler]);

    // ============================================================
    // 4. LOADING EKRANI
    // ============================================================
    if (yukleniyor) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingContent}>
                    <div style={styles.loadingIcon}>⚡</div>
                    <div style={styles.loadingText}>Sistem Kontrol Ediliyor...</div>
                    <div style={styles.loadingSubtext}>Güvenli Bağlantı</div>
                </div>
            </div>
        );
    }

    // ============================================================
    // 5. ANA RENDER
    // ============================================================
    return (
        <div style={styles.container}>
            {/* ========== SIDEBAR ========== */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <div style={styles.logoBadge}>⚡</div>
                    <h2 style={styles.logoText}>RotasyonYemek</h2>
                    <span style={styles.roleBadge}>SÜPER ADMİN</span>
                </div>

                <nav style={styles.nav}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.navButton,
                                ...(activeTab === tab.id ? styles.navButtonActive : {})
                            }}
                        >
                            <span>{tab.icon} {tab.label}</span>
                            {tab.id === 'destek' && dashboardStats.bekleyenDestekler > 0 && (
                                <span style={styles.navBadge}>{dashboardStats.bekleyenDestekler}</span>
                            )}
                            {tab.id === 'siparisler' && dashboardStats.bekleyenSiparis > 0 && (
                                <span style={styles.navBadgeWarning}>{dashboardStats.bekleyenSiparis}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div style={styles.sidebarFooter}>
                    <div style={styles.adminInfo}>
                        <div style={styles.adminAvatar}>👤</div>
                        <div>
                            <div style={styles.adminEmail}>{adminBilgi?.email}</div>
                            <div style={styles.adminRole}>Yönetici</div>
                        </div>
                    </div>
                    <button
                        onClick={() => { setYukleniyor(true); signOut(); }}
                        style={styles.logoutButton}
                    >
                        🚪 Çıkış Yap
                    </button>
                </div>
            </div>

            {/* ========== CONTENT ========== */}
            <div style={styles.content}>

                {/* ===== DASHBOARD ===== */}
                {activeTab === "dashboard" && (
                    <div className="fade-in">
                        {/* Header */}
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>Yönetim Paneli</h1>
                                <p style={styles.pageSubtitle}>Sistemin genel durumu ve istatistikler</p>
                            </div>
                            <div style={styles.filterGroup}>
                                {['bugun', 'hafta', 'ay', 'tumu'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setZamanFiltresi(f)}
                                        style={{
                                            ...styles.filterButton,
                                            ...(zamanFiltresi === f ? styles.filterButtonActive : {})
                                        }}
                                    >
                                        {f === 'bugun' ? 'Bugün' : f === 'hafta' ? 'Hafta' : f === 'ay' ? 'Ay' : 'Tümü'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ana KPI'lar */}
                        <div style={styles.kpiGrid}>
                            <KPICard
                                title="Net Ciro"
                                value={formatPara(dashboardStats.gercekCiro)}
                                icon="💵"
                                color="#10b981"
                                subtitle={`${dashboardStats.teslimEdilen} teslim`}
                            />
                            <KPICard
                                title="Platform Geliri"
                                value={formatPara(dashboardStats.platformGeliri)}
                                icon="🏦"
                                color="#8b5cf6"
                                subtitle={`%${platformAyarlari.varsayilanKomisyon} komisyon`}
                            />
                            <KPICard
                                title="İptal/İade"
                                value={formatPara(dashboardStats.iptalTutar)}
                                icon="📉"
                                color="#ef4444"
                                subtitle={`%${dashboardStats.iptalOrani} oran`}
                                negative
                            />
                            <KPICard
                                title="Toplam Sipariş"
                                value={dashboardStats.toplamSiparis}
                                icon="📦"
                                color="#3b82f6"
                                subtitle={`Ort. ${formatPara(dashboardStats.ortalamaSiparis)}`}
                            />
                        </div>

                        {/* İkincil KPI'lar */}
                        <div style={styles.secondaryKpiGrid}>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>⏳</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.bekleyenSiparis}</div>
                                    <div style={styles.miniKpiLabel}>Onay Bekliyor</div>
                                </div>
                            </div>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>🔥</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.aktifSiparis}</div>
                                    <div style={styles.miniKpiLabel}>Aktif Sipariş</div>
                                </div>
                            </div>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>🏢</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.aktifRestoranlar}/{dashboardStats.toplamRestoran}</div>
                                    <div style={styles.miniKpiLabel}>Açık Restoran</div>
                                </div>
                            </div>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>👥</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.toplamKullanici}</div>
                                    <div style={styles.miniKpiLabel}>Toplam Kullanıcı</div>
                                </div>
                            </div>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>🆕</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.bugunkuYeniKullanici}</div>
                                    <div style={styles.miniKpiLabel}>Bugün Kayıt</div>
                                </div>
                            </div>
                            <div style={styles.miniKpi}>
                                <span style={styles.miniKpiIcon}>🎫</span>
                                <div>
                                    <div style={styles.miniKpiValue}>{dashboardStats.bekleyenDestekler}</div>
                                    <div style={styles.miniKpiLabel}>Destek Talebi</div>
                                </div>
                            </div>
                        </div>

                        {/* Alt Kısım: Son Siparişler + Hızlı Erişim */}
                        <div style={styles.dashboardBottom}>
                            {/* Son Siparişler */}
                            <div style={{ ...styles.card, flex: 2 }}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>📦 Son Siparişler</h3>
                                    <button
                                        onClick={() => setActiveTab('siparisler')}
                                        style={styles.linkButton}
                                    >
                                        Tümünü Gör →
                                    </button>
                                </div>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Zaman</th>
                                            <th style={styles.th}>Restoran</th>
                                            <th style={styles.th}>Müşteri</th>
                                            <th style={styles.th}>Tutar</th>
                                            <th style={styles.th}>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtrelenmisZamanSiparisler.slice(0, 8).map(s => (
                                            <tr key={s.id} style={styles.tr}>
                                                <td style={styles.td}>{formatTarih(s.tarih)}</td>
                                                <td style={styles.td}>{s.restoranAd || "-"}</td>
                                                <td style={styles.td}>{s.musteriAd?.split('@')[0] || "-"}</td>
                                                <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>
                                                    {formatPara(s.toplamTutar)}
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={getDurumStyle(s.durum)}>{s.durum}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Hızlı Erişim */}
                            <div style={{ ...styles.card, flex: 1 }}>
                                <h3 style={styles.cardTitle}>⚡ Hızlı Erişim</h3>
                                <div style={styles.quickActions}>
                                    <button onClick={() => setModalAcik(true)} style={styles.quickButton}>
                                        🏢 Yeni Restoran
                                    </button>
                                    <button onClick={() => setKampanyaModalAcik(true)} style={styles.quickButton}>
                                        🔥 Yeni Kampanya
                                    </button>
                                    <button onClick={() => setActiveTab('destek')} style={styles.quickButton}>
                                        🛟 Destek ({dashboardStats.bekleyenDestekler})
                                    </button>
                                    <button onClick={() => setActiveTab('finans')} style={styles.quickButton}>
                                        💰 Hakediş
                                    </button>
                                </div>

                                {/* En Çok Sipariş Alan */}
                                <h4 style={{ ...styles.cardTitle, marginTop: '20px', fontSize: '14px' }}>🏆 En Çok Sipariş</h4>
                                <div style={styles.topList}>
                                    {restoranFinanslari
                                        .sort((a, b) => b.siparisAdedi - a.siparisAdedi)
                                        .slice(0, 5)
                                        .map((r, i) => (
                                            <div key={r.id} style={styles.topListItem}>
                                                <span style={styles.topListRank}>{i + 1}</span>
                                                <span style={styles.topListName}>{r.isim}</span>
                                                <span style={styles.topListValue}>{r.siparisAdedi} sipariş</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== SİPARİŞLER ===== */}
                {activeTab === "siparisler" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>Sipariş Yönetimi</h1>
                                <p style={styles.pageSubtitle}>Tüm siparişleri görüntüle ve yönet</p>
                            </div>
                        </div>

                        {/* Filtreler */}
                        <div style={styles.filterBar}>
                            <input
                                type="text"
                                placeholder="🔍 Sipariş ara (ID, müşteri, adres)..."
                                value={siparisFiltresi.arama}
                                onChange={e => setSiparisFiltresi({ ...siparisFiltresi, arama: e.target.value })}
                                style={styles.searchInput}
                            />
                            <select
                                value={siparisFiltresi.durum}
                                onChange={e => setSiparisFiltresi({ ...siparisFiltresi, durum: e.target.value })}
                                style={styles.selectInput}
                            >
                                {SIPARIS_DURUMLARI.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <select
                                value={siparisFiltresi.restoran}
                                onChange={e => setSiparisFiltresi({ ...siparisFiltresi, restoran: e.target.value })}
                                style={styles.selectInput}
                            >
                                <option value="">Tüm Restoranlar</option>
                                {restoranlar.map(r => (
                                    <option key={r.id} value={r.id}>{r.isim}</option>
                                ))}
                            </select>
                            <div style={styles.filterInfo}>
                                {filtrelenmisSiparisler.length} sipariş bulundu
                            </div>
                        </div>

                        {/* Sipariş Tablosu */}
                        <div style={styles.card}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Sipariş No</th>
                                        <th style={styles.th}>Tarih</th>
                                        <th style={styles.th}>Restoran</th>
                                        <th style={styles.th}>Müşteri</th>
                                        <th style={styles.th}>Adres</th>
                                        <th style={styles.th}>Tutar</th>
                                        <th style={styles.th}>Durum</th>
                                        <th style={styles.th}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrelenmisSiparisler.slice(0, 50).map(s => (
                                        <tr key={s.id} style={styles.tr}>
                                            <td style={styles.td}>
                                                <span style={styles.orderId}>#{s.id.slice(-6).toUpperCase()}</span>
                                            </td>
                                            <td style={styles.td}>{formatTarih(s.tarih)}</td>
                                            <td style={styles.td}>{s.restoranAd || "-"}</td>
                                            <td style={styles.td}>{s.musteriAd?.split('@')[0] || "-"}</td>
                                            <td style={{ ...styles.td, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {s.mahalle || s.adres?.slice(0, 30) || "-"}
                                            </td>
                                            <td style={{ ...styles.td, fontWeight: 'bold', color: '#10b981' }}>
                                                {formatPara(s.toplamTutar)}
                                            </td>
                                            <td style={styles.td}>
                                                <span style={getDurumStyle(s.durum)}>{s.durum}</span>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons}>
                                                    <button
                                                        onClick={() => { setSeciliSiparis(s); setSiparisDetayModal(true); }}
                                                        style={styles.actionBtn}
                                                        title="Detay"
                                                    >
                                                        👁️
                                                    </button>
                                                    {s.durum !== 'Teslim Edildi' && s.durum !== 'İptal Edildi' && (
                                                        <button
                                                            onClick={() => siparisIptalEt(s.id)}
                                                            style={{ ...styles.actionBtn, color: '#ef4444' }}
                                                            title="İptal Et"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtrelenmisSiparisler.length === 0 && (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '48px' }}>📦</span>
                                    <p>Sipariş bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== RESTORANLAR ===== */}
                {activeTab === "restoranlar" && (
                    <div className="fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 60px)' }}>
                        {/* Sol: Liste */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={styles.pageHeader}>
                                <div>
                                    <h1 style={styles.pageTitle}>Restoranlar ({restoranlar.length})</h1>
                                </div>
                                <button onClick={() => setModalAcik(true)} style={styles.primaryButton}>
                                    + Yeni Restoran
                                </button>
                            </div>

                            <div style={styles.listContainer}>
                                {restoranlar.map(res => (
                                    <div
                                        key={res.id}
                                        onClick={() => { setSeciliRestoran(res); setYeniKomisyon(res.komisyon || 10); }}
                                        style={{
                                            ...styles.listItem,
                                            borderLeft: seciliRestoran?.id === res.id ? '4px solid #3b82f6' : '4px solid transparent',
                                            background: seciliRestoran?.id === res.id ? 'rgba(59,130,246,0.1)' : '#1e293b'
                                        }}
                                    >
                                        <img
                                            src={res.resim || "https://via.placeholder.com/50"}
                                            alt=""
                                            style={styles.listItemImage}
                                        />
                                        <div style={styles.listItemInfo}>
                                            <div style={styles.listItemTitle}>
                                                {res.isim}
                                                {res.onay && <span style={styles.verifiedBadge}>✓</span>}
                                            </div>
                                            <div style={styles.listItemSubtitle}>
                                                {res.kategori} • {res.sahipEmail}
                                            </div>
                                            <div style={styles.listItemMeta}>
                                                <span style={{
                                                    ...styles.statusDot,
                                                    background: res.acikMi ? '#10b981' : '#ef4444'
                                                }}></span>
                                                {res.acikMi ? 'Açık' : 'Kapalı'}
                                                {res.yogunluk && res.yogunluk !== 'Normal' && (
                                                    <span style={styles.yogunlukBadge}>{res.yogunluk}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span style={styles.listItemArrow}>→</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sağ: Detay */}
                        <div style={styles.detailPanel}>
                            {seciliRestoran ? (
                                <>
                                    {/* Kapak & Logo */}
                                    <div style={styles.detailHeader}>
                                        <div style={styles.detailCover}>
                                            <img
                                                src={seciliRestoran.kapakResmi || "https://via.placeholder.com/400x120"}
                                                alt=""
                                                style={styles.detailCoverImg}
                                            />
                                        </div>
                                        <img
                                            src={seciliRestoran.resim || "https://via.placeholder.com/80"}
                                            alt=""
                                            style={styles.detailLogo}
                                        />
                                        <h2 style={styles.detailTitle}>{seciliRestoran.isim}</h2>
                                        <div style={styles.detailBadges}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                background: seciliRestoran.acikMi ? '#10b98120' : '#ef444420',
                                                color: seciliRestoran.acikMi ? '#10b981' : '#ef4444'
                                            }}>
                                                {seciliRestoran.acikMi ? '● AÇIK' : '○ KAPALI'}
                                            </span>
                                            {seciliRestoran.onay && (
                                                <span style={styles.onayBadge}>✓ Onaylı</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bilgiler */}
                                    <div style={styles.detailInfo}>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>📧 Email:</span>
                                            <span>{seciliRestoran.sahipEmail}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>📞 Telefon:</span>
                                            <span>{seciliRestoran.telefon || "-"}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>📍 Adres:</span>
                                            <span>{seciliRestoran.adres || "-"}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>⭐ Puan:</span>
                                            <span>{seciliRestoran.puan || 0}</span>
                                        </div>
                                    </div>

                                    {/* İstatistikler */}
                                    <div style={styles.statsGrid}>
                                        <div style={styles.statCard}>
                                            <div style={styles.statValue}>
                                                {restoranSiparisleri.filter(s => s.durum === 'Teslim Edildi').length}
                                            </div>
                                            <div style={styles.statLabel}>Toplam Sipariş</div>
                                        </div>
                                        <div style={styles.statCard}>
                                            <div style={styles.statValue}>
                                                {formatPara(restoranFinanslari.find(r => r.id === seciliRestoran.id)?.toplamCiro || 0)}
                                            </div>
                                            <div style={styles.statLabel}>Toplam Ciro</div>
                                        </div>
                                    </div>

                                    {/* Komisyon */}
                                    <div style={styles.controlGroup}>
                                        <label style={styles.controlLabel}>Komisyon Oranı (%)</label>
                                        <div style={styles.controlRow}>
                                            <input
                                                type="number"
                                                value={yeniKomisyon}
                                                onChange={e => setYeniKomisyon(e.target.value)}
                                                style={styles.input}
                                            />
                                            <button
                                                onClick={() => restoranGuncelle(seciliRestoran.id, { komisyon: Number(yeniKomisyon) })}
                                                style={styles.smallButton}
                                            >
                                                Kaydet
                                            </button>
                                        </div>
                                    </div>

                                    {/* Aksiyonlar */}
                                    <div style={styles.actionGroup}>
                                        <button
                                            onClick={() => restoranGuncelle(seciliRestoran.id, { acikMi: !seciliRestoran.acikMi })}
                                            style={styles.secondaryButton}
                                        >
                                            {seciliRestoran.acikMi ? '🔴 Kapat' : '🟢 Aç'}
                                        </button>
                                        <button
                                            onClick={() => restoranGuncelle(seciliRestoran.id, { onay: !seciliRestoran.onay })}
                                            style={styles.secondaryButton}
                                        >
                                            {seciliRestoran.onay ? '❌ Onay Kaldır' : '✅ Onayla'}
                                        </button>
                                        <button
                                            onClick={() => restoranSil(seciliRestoran.id)}
                                            style={styles.dangerButton}
                                        >
                                            🗑️ Sil
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={styles.emptyPanel}>
                                    <span style={{ fontSize: '48px' }}>👈</span>
                                    <p>Düzenlemek için bir restoran seçin</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== KULLANICILAR ===== */}
                {activeTab === "kullanicilar" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>Kullanıcılar ({kullanicilar.length})</h1>
                                <p style={styles.pageSubtitle}>Tüm kullanıcıları görüntüle ve yönet</p>
                            </div>
                        </div>

                        {/* Filtreler */}
                        <div style={styles.filterBar}>
                            <input
                                type="text"
                                placeholder="🔍 Kullanıcı ara (email, ad, telefon)..."
                                value={kullaniciFiltresi.arama}
                                onChange={e => setKullaniciFiltresi({ ...kullaniciFiltresi, arama: e.target.value })}
                                style={styles.searchInput}
                            />
                            <select
                                value={kullaniciFiltresi.rol}
                                onChange={e => setKullaniciFiltresi({ ...kullaniciFiltresi, rol: e.target.value })}
                                style={styles.selectInput}
                            >
                                <option value="Tümü">Tüm Roller</option>
                                <option value="musteri">Müşteri</option>
                                <option value="restoran">Restoran</option>
                                <option value="superadmin">Admin</option>
                            </select>
                            <div style={styles.filterInfo}>
                                {filtrelenmisKullanicilar.length} kullanıcı bulundu
                            </div>
                        </div>

                        {/* Kullanıcı Tablosu */}
                        <div style={styles.card}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Kullanıcı</th>
                                        <th style={styles.th}>Rol</th>
                                        <th style={styles.th}>Kayıt Tarihi</th>
                                        <th style={styles.th}>Sipariş Sayısı</th>
                                        <th style={styles.th}>Durum</th>
                                        <th style={styles.th}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrelenmisKullanicilar.map(k => {
                                        const siparisAdedi = tumSiparisler.filter(s => s.musteriId === k.id).length;
                                        return (
                                            <tr key={k.id} style={styles.tr}>
                                                <td style={styles.td}>
                                                    <div style={styles.userCell}>
                                                        <div style={styles.userAvatar}>
                                                            {(k.ad || k.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={styles.userName}>{k.ad || k.email?.split('@')[0]}</div>
                                                            <div style={styles.userEmail}>{k.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={getRolStyle(k.rol)}>{k.rol || 'musteri'}</span>
                                                </td>
                                                <td style={styles.td}>{formatTarih(k.olusturulmaTarihi)}</td>
                                                <td style={styles.td}>{siparisAdedi}</td>
                                                <td style={styles.td}>
                                                    {k.banliMi ? (
                                                        <span style={styles.bannedBadge}>🚫 Yasaklı</span>
                                                    ) : (
                                                        <span style={styles.activeBadge}>✓ Aktif</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionButtons}>
                                                        <button
                                                            onClick={() => { setSeciliKullanici(k); setKullaniciDetayModal(true); }}
                                                            style={styles.actionBtn}
                                                            title="Detay"
                                                        >
                                                            👁️
                                                        </button>
                                                        <button
                                                            onClick={() => kullaniciBanla(k.id, !k.banliMi)}
                                                            style={{ ...styles.actionBtn, color: k.banliMi ? '#10b981' : '#f59e0b' }}
                                                            title={k.banliMi ? 'Yasağı Kaldır' : 'Yasakla'}
                                                        >
                                                            {k.banliMi ? '✓' : '🚫'}
                                                        </button>
                                                        <button
                                                            onClick={() => kullaniciSil(k.id)}
                                                            style={{ ...styles.actionBtn, color: '#ef4444' }}
                                                            title="Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filtrelenmisKullanicilar.length === 0 && (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '48px' }}>👥</span>
                                    <p>Kullanıcı bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== KAMPANYALAR ===== */}
                {activeTab === "kampanyalar" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>Kampanya Yönetimi</h1>
                                <p style={styles.pageSubtitle}>Restoran kampanyalarını yönetin</p>
                            </div>
                            <button onClick={() => setKampanyaModalAcik(true)} style={styles.primaryButton}>
                                + Yeni Kampanya
                            </button>
                        </div>

                        {/* Kampanya İstatistikleri */}
                        <div style={styles.campaignStats}>
                            <div style={styles.campaignStatCard}>
                                <span style={styles.campaignStatIcon}>🔥</span>
                                <div style={styles.campaignStatValue}>{kampanyalar.length}</div>
                                <div style={styles.campaignStatLabel}>Toplam Kampanya</div>
                            </div>
                            <div style={styles.campaignStatCard}>
                                <span style={styles.campaignStatIcon}>✅</span>
                                <div style={styles.campaignStatValue}>{kampanyalar.filter(k => k.aktif).length}</div>
                                <div style={styles.campaignStatLabel}>Aktif Kampanya</div>
                            </div>
                            <div style={styles.campaignStatCard}>
                                <span style={styles.campaignStatIcon}>🏢</span>
                                <div style={styles.campaignStatValue}>
                                    {new Set(kampanyalar.map(k => k.restoranId)).size}
                                </div>
                                <div style={styles.campaignStatLabel}>Kampanyalı Restoran</div>
                            </div>
                        </div>

                        {/* Kampanya Grid */}
                        <div style={styles.campaignGrid}>
                            {kampanyalar.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '64px' }}>🎉</span>
                                    <p>Henüz kampanya oluşturulmamış</p>
                                    <button onClick={() => setKampanyaModalAcik(true)} style={styles.primaryButton}>
                                        İlk Kampanyayı Oluştur
                                    </button>
                                </div>
                            ) : (
                                kampanyalar.map((kamp, index) => {
                                    const restoran = restoranlar.find(r => r.id === kamp.restoranId);
                                    const kampanyaIndex = restoran?.kampanyalar?.findIndex(
                                        k => k.baslik === kamp.baslik && k.deger === kamp.deger
                                    );

                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                ...styles.campaignCard,
                                                opacity: kamp.aktif ? 1 : 0.6,
                                                background: kamp.global
                                                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                            }}
                                        >
                                            {/* Restoran Bilgisi */}
                                            <div style={styles.campaignRestoran}>
                                                <img
                                                    src={kamp.restoranLogo || "https://via.placeholder.com/30"}
                                                    alt=""
                                                    style={styles.campaignRestoranLogo}
                                                />
                                                <span>{kamp.restoranAd}</span>
                                                {kamp.global && <span style={styles.globalBadge}>🌍 Global</span>}
                                            </div>

                                            {/* Kampanya Detayları */}
                                            <div style={styles.campaignValue}>
                                                {kamp.tip === 'yuzde' ? `%${kamp.deger}` : `${kamp.deger}₺`}
                                            </div>
                                            <div style={styles.campaignTitle}>{kamp.baslik}</div>
                                            {kamp.minSepet > 0 && (
                                                <div style={styles.campaignMin}>Min. {kamp.minSepet}₺ sepet</div>
                                            )}

                                            {/* Durum Badge */}
                                            <div style={styles.campaignStatus}>
                                                {kamp.aktif ? '✅ Aktif' : '⏸️ Pasif'}
                                            </div>

                                            {/* Aksiyonlar */}
                                            <div style={styles.campaignActions}>
                                                <button
                                                    onClick={() => kampanyaDurumDegistir(kamp.restoranId, kampanyaIndex)}
                                                    style={styles.campaignActionBtn}
                                                    title={kamp.aktif ? 'Duraklat' : 'Aktifleştir'}
                                                >
                                                    {kamp.aktif ? '⏸️' : '▶️'}
                                                </button>
                                                <button
                                                    onClick={() => kampanyaSil(kamp.restoranId, kampanyaIndex)}
                                                    style={{ ...styles.campaignActionBtn, color: '#ef4444' }}
                                                    title="Sil"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ===== BÖLGE YÖNETİMİ ===== */}
                {activeTab === "bolgeler" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>🗺️ Bölge Yönetimi</h1>
                                <p style={styles.pageSubtitle}>Şehir, İlçe ve Mahalle tanımlayın</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                            {/* ========== ŞEHİRLER ========== */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🏙️ Şehirler</h3>

                                {/* Yeni Şehir Ekle */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                    <input
                                        type="text"
                                        placeholder="Yeni şehir..."
                                        value={yeniSehir}
                                        onChange={e => setYeniSehir(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && sehirEkle()}
                                        style={styles.input}
                                    />
                                    <button onClick={sehirEkle} style={styles.smallButton}>+</button>
                                </div>

                                {/* Şehir Listesi */}
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {Object.keys(bolgeler).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                            Henüz şehir eklenmemiş
                                        </div>
                                    ) : (
                                        Object.entries(bolgeler).map(([key, sehir]) => (
                                            <div
                                                key={key}
                                                onClick={() => { setSeciliSehir(key); setSeciliIlce(""); }}
                                                style={{
                                                    ...styles.listItem,
                                                    borderLeft: seciliSehir === key ? '3px solid #3b82f6' : '3px solid transparent',
                                                    background: seciliSehir === key ? 'rgba(59,130,246,0.1)' : 'transparent',
                                                    marginBottom: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={styles.listItemTitle}>{sehir.ad}</div>
                                                    <div style={styles.listItemSubtitle}>
                                                        {Object.keys(sehir.ilceler || {}).length} ilçe
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); sehirSil(key); }}
                                                    style={{ ...styles.iconButton, color: '#ef4444' }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ========== İLÇELER ========== */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>
                                    🏘️ İlçeler
                                    {seciliSehir && ` - ${bolgeler[seciliSehir]?.ad}`}
                                </h3>

                                {!seciliSehir ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        👈 Önce şehir seçin
                                    </div>
                                ) : (
                                    <>
                                        {/* Yeni İlçe Ekle */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                            <input
                                                type="text"
                                                placeholder="Yeni ilçe..."
                                                value={yeniIlce}
                                                onChange={e => setYeniIlce(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && ilceEkle()}
                                                style={styles.input}
                                            />
                                            <button onClick={ilceEkle} style={styles.smallButton}>+</button>
                                        </div>

                                        {/* İlçe Listesi */}
                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {Object.keys(bolgeler[seciliSehir]?.ilceler || {}).length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                    Henüz ilçe eklenmemiş
                                                </div>
                                            ) : (
                                                Object.entries(bolgeler[seciliSehir]?.ilceler || {}).map(([key, ilce]) => (
                                                    <div
                                                        key={key}
                                                        onClick={() => setSeciliIlce(key)}
                                                        style={{
                                                            ...styles.listItem,
                                                            borderLeft: seciliIlce === key ? '3px solid #3b82f6' : '3px solid transparent',
                                                            background: seciliIlce === key ? 'rgba(59,130,246,0.1)' : 'transparent',
                                                            marginBottom: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <div style={{ flex: 1 }}>
                                                            <div style={styles.listItemTitle}>{ilce.ad}</div>
                                                            <div style={styles.listItemSubtitle}>
                                                                {(ilce.mahalleler || []).length} mahalle
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); ilceSil(seciliSehir, key); }}
                                                            style={{ ...styles.iconButton, color: '#ef4444' }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ========== MAHALLELER ========== */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>
                                    🏡 Mahalleler
                                    {seciliIlce && ` - ${bolgeler[seciliSehir]?.ilceler?.[seciliIlce]?.ad}`}
                                </h3>

                                {!seciliIlce ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        👈 Önce ilçe seçin
                                    </div>
                                ) : (
                                    <>
                                        {/* Yeni Mahalle Ekle */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                            <input
                                                type="text"
                                                placeholder="Yeni mahalle..."
                                                value={yeniMahalle}
                                                onChange={e => setYeniMahalle(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && mahalleEkle()}
                                                style={styles.input}
                                            />
                                            <button onClick={mahalleEkle} style={styles.smallButton}>+</button>
                                        </div>

                                        {/* Mahalle Listesi */}
                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {(bolgeler[seciliSehir]?.ilceler?.[seciliIlce]?.mahalleler || []).length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                    Henüz mahalle eklenmemiş
                                                </div>
                                            ) : (
                                                (bolgeler[seciliSehir]?.ilceler?.[seciliIlce]?.mahalleler || []).map((mahalle, index) => (
                                                    <div key={index} style={styles.listItem}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={styles.listItemTitle}>{mahalle}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => mahalleSil(seciliSehir, seciliIlce, mahalle)}
                                                            style={{ ...styles.iconButton, color: '#ef4444' }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== FİNANS ===== */}
                {activeTab === "finans" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>💰 Finans Yönetimi</h1>
                                <p style={styles.pageSubtitle}>Restoran hakedişleri ve ödemeler</p>
                            </div>
                            <button onClick={topluOdeme} style={styles.primaryButton}>
                                💳 Toplu Ödeme Yap
                            </button>
                        </div>

                        {/* Finans KPI'ları */}
                        <div style={styles.financeKpiGrid}>
                            <div style={styles.financeKpiCard}>
                                <div style={styles.financeKpiIcon}>💵</div>
                                <div>
                                    <div style={styles.financeKpiValue}>
                                        {formatPara(restoranFinanslari.reduce((t, r) => t + r.toplamCiro, 0))}
                                    </div>
                                    <div style={styles.financeKpiLabel}>Toplam Ciro</div>
                                </div>
                            </div>
                            <div style={styles.financeKpiCard}>
                                <div style={styles.financeKpiIcon}>🏦</div>
                                <div>
                                    <div style={styles.financeKpiValue}>
                                        {formatPara(restoranFinanslari.reduce((t, r) => t + r.kesinti, 0))}
                                    </div>
                                    <div style={styles.financeKpiLabel}>Platform Geliri</div>
                                </div>
                            </div>
                            <div style={styles.financeKpiCard}>
                                <div style={styles.financeKpiIcon}>💸</div>
                                <div>
                                    <div style={styles.financeKpiValue}>
                                        {formatPara(restoranFinanslari.reduce((t, r) => t + r.kalanBakiye, 0))}
                                    </div>
                                    <div style={styles.financeKpiLabel}>Ödenecek Bakiye</div>
                                </div>
                            </div>
                            <div style={styles.financeKpiCard}>
                                <div style={styles.financeKpiIcon}>✅</div>
                                <div>
                                    <div style={styles.financeKpiValue}>
                                        {formatPara(restoranFinanslari.reduce((t, r) => t + r.odenenToplam, 0))}
                                    </div>
                                    <div style={styles.financeKpiLabel}>Ödenen Toplam</div>
                                </div>
                            </div>
                        </div>

                        {/* Restoran Hakedişleri Tablosu */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📊 Restoran Hakedişleri</h3>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Restoran</th>
                                        <th style={styles.th}>Sipariş</th>
                                        <th style={styles.th}>Ciro</th>
                                        <th style={styles.th}>Komisyon</th>
                                        <th style={styles.th}>Kesinti</th>
                                        <th style={styles.th}>Net</th>
                                        <th style={styles.th}>Ödenen</th>
                                        <th style={styles.th}>Kalan</th>
                                        <th style={styles.th}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {restoranFinanslari.map(r => (
                                        <tr key={r.id} style={styles.tr}>
                                            <td style={styles.td}>
                                                <div style={styles.restoranCell}>
                                                    <img src={r.resim || "https://via.placeholder.com/30"} alt="" style={styles.miniLogo} />
                                                    <span>{r.isim}</span>
                                                </div>
                                            </td>
                                            <td style={styles.td}>{r.siparisAdedi}</td>
                                            <td style={{ ...styles.td, color: '#10b981' }}>{formatPara(r.toplamCiro)}</td>
                                            <td style={styles.td}>%{r.komisyonOrani}</td>
                                            <td style={{ ...styles.td, color: '#ef4444' }}>{formatPara(r.kesinti)}</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{formatPara(r.odenecek)}</td>
                                            <td style={{ ...styles.td, color: '#3b82f6' }}>{formatPara(r.odenenToplam)}</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold', color: '#f59e0b' }}>
                                                {formatPara(r.kalanBakiye)}
                                            </td>
                                            <td style={styles.td}>
                                                {r.kalanBakiye > 0 && (
                                                    <button
                                                        onClick={() => odemeYap(r)}
                                                        style={styles.smallButton}
                                                    >
                                                        💳 Öde
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== DESTEK ===== */}
                {activeTab === "destek" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>🛟 Destek Talepleri</h1>
                                <p style={styles.pageSubtitle}>Müşteri ve restoran destek talepleri</p>
                            </div>
                        </div>

                        {/* Destek İstatistikleri */}
                        <div style={styles.supportStats}>
                            <div style={{ ...styles.supportStatCard, borderColor: '#f59e0b' }}>
                                <div style={styles.supportStatValue}>
                                    {destekTalepleri.filter(t => t.durum === 'Bekliyor').length}
                                </div>
                                <div style={styles.supportStatLabel}>Bekleyen</div>
                            </div>
                            <div style={{ ...styles.supportStatCard, borderColor: '#3b82f6' }}>
                                <div style={styles.supportStatValue}>
                                    {destekTalepleri.filter(t => t.durum === 'İşlemde').length}
                                </div>
                                <div style={styles.supportStatLabel}>İşlemde</div>
                            </div>
                            <div style={{ ...styles.supportStatCard, borderColor: '#10b981' }}>
                                <div style={styles.supportStatValue}>
                                    {destekTalepleri.filter(t => t.durum === 'Cevaplandı').length}
                                </div>
                                <div style={styles.supportStatLabel}>Cevaplandı</div>
                            </div>
                        </div>

                        {/* Talepler Listesi */}
                        <div style={styles.card}>
                            {destekTalepleri.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '48px' }}>🎫</span>
                                    <p>Henüz destek talebi yok</p>
                                </div>
                            ) : (
                                destekTalepleri.map(talep => (
                                    <div key={talep.id} style={styles.supportItem}>
                                        <div style={styles.supportItemMain}>
                                            <div style={styles.supportItemHeader}>
                                                <span style={styles.supportItemType}>
                                                    {talep.tur === 'restoran' ? '🏢' : '👤'}
                                                </span>
                                                <span style={styles.supportItemFrom}>{talep.kimden}</span>
                                                <span style={styles.supportItemDate}>{formatTarih(talep.tarih)}</span>
                                            </div>
                                            <div style={styles.supportItemSubject}>{talep.konu}</div>
                                            {talep.telefon && (
                                                <div style={styles.supportItemPhone}>📞 {talep.telefon}</div>
                                            )}
                                        </div>
                                        <div style={styles.supportItemActions}>
                                            <span style={getDurumStyle(talep.durum)}>{talep.durum}</span>
                                            <button
                                                onClick={() => { setSeciliTalep(talep); setTalepDetayModal(true); }}
                                                style={styles.actionBtn}
                                            >
                                                👁️
                                            </button>
                                            {talep.durum !== 'Cevaplandı' && (
                                                <button
                                                    onClick={() => talepDurumGuncelle(talep.id, 'İşlemde')}
                                                    style={{ ...styles.actionBtn, color: '#3b82f6' }}
                                                >
                                                    ⚡
                                                </button>
                                            )}
                                            <button
                                                onClick={() => talepSil(talep.id)}
                                                style={{ ...styles.actionBtn, color: '#ef4444' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ===== KUPON YÖNETİMİ ===== */}
                {activeTab === "kuponlar" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>🎫 Kupon Yönetimi</h1>
                                <p style={styles.pageSubtitle}>İndirim kuponlarını oluşturun ve yönetin</p>
                            </div>
                            <button onClick={() => setKuponModalAcik(true)} style={styles.primaryButton}>
                                + Yeni Kupon Oluştur
                            </button>
                        </div>

                        {/* Kupon İstatistikleri */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
                            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{kuponlar.length}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Toplam Kupon</div>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{kuponlar.filter(k => k.aktif).length}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Aktif Kupon</div>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                                    {kuponlar.reduce((t, k) => t + (k.kullanilanAdet || 0), 0)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Kullanım</div>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                    {kuponlar.filter(k => {
                                        if (!k.bitis) return k.aktif;
                                        return k.aktif && new Date(k.bitis) > new Date();
                                    }).length}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Geçerli</div>
                            </div>
                        </div>

                        {/* Kupon Listesi */}
                        <div style={styles.card}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Kod</th>
                                        <th style={styles.th}>Tip</th>
                                        <th style={styles.th}>Değer</th>
                                        <th style={styles.th}>Min. Sepet</th>
                                        <th style={styles.th}>Kullanım</th>
                                        <th style={styles.th}>Geçerlilik</th>
                                        <th style={styles.th}>Durum</th>
                                        <th style={styles.th}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kuponlar.map(kupon => {
                                        const sureliBittiMi = kupon.bitis && new Date(kupon.bitis) < new Date();
                                        const limitDolduMu = kupon.maxKullanim && (kupon.kullanilanAdet || 0) >= kupon.maxKullanim;

                                        return (
                                            <tr key={kupon.id} style={styles.tr}>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        background: '#3b82f620',
                                                        color: '#3b82f6',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        fontFamily: 'monospace',
                                                        fontSize: '14px'
                                                    }}>
                                                        {kupon.kod}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {kupon.tip === 'yuzde' ? '📊 Yüzde' : kupon.tip === 'tutar' ? '💵 Tutar' : '🎯 Puan'}
                                                </td>
                                                <td style={{ ...styles.td, fontWeight: 'bold', color: '#10b981' }}>
                                                    {kupon.tip === 'yuzde' ? `%${kupon.deger}` : `${kupon.deger} ${kupon.tip === 'puan' ? 'Puan' : '₺'}`}
                                                </td>
                                                <td style={styles.td}>{kupon.minSepet || 0} ₺</td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        color: limitDolduMu ? '#ef4444' : '#10b981'
                                                    }}>
                                                        {kupon.kullanilanAdet || 0} / {kupon.maxKullanim || '∞'}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {kupon.bitis ? (
                                                        <span style={{ color: sureliBittiMi ? '#ef4444' : '#64748b', fontSize: '12px' }}>
                                                            {new Date(kupon.bitis).toLocaleDateString('tr-TR')}
                                                            {sureliBittiMi && ' (Süresi doldu)'}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#10b981', fontSize: '12px' }}>Süresiz</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        background: kupon.aktif && !sureliBittiMi && !limitDolduMu ? '#10b98120' : '#ef444420',
                                                        color: kupon.aktif && !sureliBittiMi && !limitDolduMu ? '#10b981' : '#ef4444',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {kupon.aktif && !sureliBittiMi && !limitDolduMu ? '✅ Aktif' : '❌ Pasif'}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={async () => {
                                                                await updateDoc("kuponlar", kupon.id, { aktif: !kupon.aktif });
                                                            }}
                                                            style={{ ...styles.actionBtn, color: kupon.aktif ? '#f59e0b' : '#10b981' }}
                                                            title={kupon.aktif ? 'Pasife Al' : 'Aktifleştir'}
                                                        >
                                                            {kupon.aktif ? '⏸️' : '▶️'}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('Bu kupon silinecek. Emin misiniz?')) {
                                                                    await deleteDoc("kuponlar", kupon.id);
                                                                }
                                                            }}
                                                            style={{ ...styles.actionBtn, color: '#ef4444' }}
                                                            title="Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                        <button
                                                            onClick={() => kuponuDagit(kupon)}
                                                            style={{ ...styles.actionBtn, color: '#8b5cf6' }}
                                                            title="Tüm Kullanıcılara Gönder"
                                                        >
                                                            🎁 Dağıt
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {kuponlar.length === 0 && (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '48px' }}>🎫</span>
                                    <p>Henüz kupon oluşturulmamış</p>
                                    <button onClick={() => setKuponModalAcik(true)} style={styles.primaryButton}>
                                        İlk Kuponu Oluştur
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== PUAN SİSTEMİ ===== */}
                {activeTab === "puanlar" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>🎯 Puan Sistemi</h1>
                                <p style={styles.pageSubtitle}>Sadakat programı ayarları ve istatistikler</p>
                            </div>
                        </div>

                        {/* Puan İstatistikleri */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '16px', padding: '25px', color: 'white' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {kullanicilar.reduce((t, k) => t + (k.toplamKazanilanPuan || 0), 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>Toplam Dağıtılan Puan</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', padding: '25px', color: 'white' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {kullanicilar.reduce((t, k) => t + (k.puanBakiye || 0), 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>Aktif Puan Bakiyesi</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '16px', padding: '25px', color: 'white' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {kullanicilar.filter(k => (k.puanBakiye || 0) > 0).length}
                                </div>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>Puanlı Kullanıcı</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '16px', padding: '25px', color: 'white' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {kullanicilar.filter(k => (k.streakSayisi || 0) >= platformAyarlari.streakHedef).length}
                                </div>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>Streak Başarısı</div>
                            </div>
                        </div>

                        {/* Puan Ayarları Kartları */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                            {/* Puan Kazanım Ayarları */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🎁 Puan Kazanım Ayarları</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Her 1₺ Siparişe Kaç Puan?
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="number"
                                                value={platformAyarlari.puanKazanimOrani}
                                                onChange={e => setPlatformAyarlari({ ...platformAyarlari, puanKazanimOrani: Number(e.target.value) })}
                                                style={{ ...styles.input, width: '100px' }}
                                                min="0"
                                            />
                                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                                                Örn: 100₺ sipariş = {100 * platformAyarlari.puanKazanimOrani} puan
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Streak Hedefi (Ardışık Sipariş)
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="number"
                                                value={platformAyarlari.streakHedef}
                                                onChange={e => setPlatformAyarlari({ ...platformAyarlari, streakHedef: Number(e.target.value) })}
                                                style={{ ...styles.input, width: '100px' }}
                                                min="2"
                                            />
                                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                                                sipariş = {platformAyarlari.streakBonusPuan} bonus puan
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Streak Bonus Puanı
                                        </label>
                                        <input
                                            type="number"
                                            value={platformAyarlari.streakBonusPuan}
                                            onChange={e => setPlatformAyarlari({ ...platformAyarlari, streakBonusPuan: Number(e.target.value) })}
                                            style={{ ...styles.input, width: '150px' }}
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Yeni Üye Hoşgeldin Puanı
                                        </label>
                                        <input
                                            type="number"
                                            value={platformAyarlari.yeniUyeBonusu}
                                            onChange={e => setPlatformAyarlari({ ...platformAyarlari, yeniUyeBonusu: Number(e.target.value) })}
                                            style={{ ...styles.input, width: '150px' }}
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* 🆕 Yeni Üye Kupon Ayarı */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                        Yeni Üye Kupon Kodu (Otomatik Tanımlanır)
                                    </label>
                                    <input
                                        type="text"
                                        value={platformAyarlari.yeniUyeKuponu || ''}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, yeniUyeKuponu: e.target.value.toUpperCase() })}
                                        style={{ ...styles.input, width: '200px', fontFamily: 'monospace' }}
                                        placeholder="KOD GİRİNİZ"
                                    />
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                        * Yeni kayıt olan kullanıcılara bu kupon otomatik olarak verilir.
                                    </div>
                                </div>
                            </div>

                            {/* Puan Harcama Ayarları */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>💳 Puan Harcama & Referans</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Kaç Puan = 1₺ İndirim?
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="number"
                                                value={platformAyarlari.puanHarcamaOrani}
                                                onChange={e => setPlatformAyarlari({ ...platformAyarlari, puanHarcamaOrani: Number(e.target.value) })}
                                                style={{ ...styles.input, width: '100px' }}
                                                min="1"
                                            />
                                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                                                puan = 1₺ (500 puan = {Math.floor(500 / platformAyarlari.puanHarcamaOrani)}₺)
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Minimum Puan Kullanım Limiti
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="number"
                                                value={platformAyarlari.minPuanKullanim}
                                                onChange={e => setPlatformAyarlari({ ...platformAyarlari, minPuanKullanim: Number(e.target.value) })}
                                                style={{ ...styles.input, width: '100px' }}
                                                min="0"
                                                step="100"
                                            />
                                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                                                puan (= {Math.floor(platformAyarlari.minPuanKullanim / platformAyarlari.puanHarcamaOrani)}₺ indirim)
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                            Referans Bonusu (Davet eden + Edilen)
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="number"
                                                value={platformAyarlari.referansBonusu}
                                                onChange={e => setPlatformAyarlari({ ...platformAyarlari, referansBonusu: Number(e.target.value) })}
                                                style={{ ...styles.input, width: '100px' }}
                                                min="0"
                                            />
                                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                                                puan (her iki tarafa da)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={ayarlariKaydet}
                                    style={{ ...styles.primaryButton, marginTop: '25px', width: '100%' }}
                                >
                                    💾 Puan Ayarlarını Kaydet
                                </button>
                            </div>
                        </div>

                        {/* En Çok Puanlı Kullanıcılar */}
                        <div style={{ ...styles.card, marginTop: '20px' }}>
                            <h3 style={styles.cardTitle}>🏆 En Çok Puanlı Kullanıcılar</h3>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>#</th>
                                        <th style={styles.th}>Kullanıcı</th>
                                        <th style={styles.th}>Puan Bakiyesi</th>
                                        <th style={styles.th}>Toplam Kazanılan</th>
                                        <th style={styles.th}>Streak</th>
                                        <th style={styles.th}>Referans Kodu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kullanicilar
                                        .filter(k => k.rol === 'musteri')
                                        .sort((a, b) => (b.puanBakiye || 0) - (a.puanBakiye || 0))
                                        .slice(0, 10)
                                        .map((k, i) => (
                                            <tr key={k.id} style={styles.tr}>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        background: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#334155',
                                                        color: i < 3 ? '#000' : '#fff',
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        fontSize: '12px'
                                                    }}>
                                                        {i + 1}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div>{k.adSoyad || k.email?.split('@')[0]}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{k.email}</div>
                                                </td>
                                                <td style={{ ...styles.td, fontWeight: 'bold', color: '#3b82f6' }}>
                                                    {(k.puanBakiye || 0).toLocaleString()} 🎯
                                                </td>
                                                <td style={{ ...styles.td, color: '#10b981' }}>
                                                    {(k.toplamKazanilanPuan || 0).toLocaleString()}
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        background: (k.streakSayisi || 0) >= platformAyarlari.streakHedef ? '#10b98120' : '#f59e0b20',
                                                        color: (k.streakSayisi || 0) >= platformAyarlari.streakHedef ? '#10b981' : '#f59e0b',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        🔥 {k.streakSayisi || 0}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {k.referansKodu ? (
                                                        <code style={{
                                                            background: '#0f172a',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            color: '#8b5cf6'
                                                        }}>
                                                            {k.referansKodu}
                                                        </code>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== AYARLAR ===== (Önceki kodda var, tekrar ekliyorum) */}
                {activeTab === "ayarlar" && (
                    <div className="fade-in">
                        <div style={styles.pageHeader}>
                            <div>
                                <h1 style={styles.pageTitle}>Sistem Ayarları</h1>
                                <p style={styles.pageSubtitle}>Platform konfigürasyonu ve bakım</p>
                            </div>
                        </div>

                        <div style={styles.settingsGrid}>
                            {/* Platform Ayarları */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>⚙️ Platform Ayarları</h3>

                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>Platform Adı</label>
                                    <input
                                        type="text"
                                        value={platformAyarlari.platformAdi}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, platformAdi: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>Varsayılan Komisyon Oranı (%)</label>
                                    <input
                                        type="number"
                                        value={platformAyarlari.varsayilanKomisyon}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, varsayilanKomisyon: Number(e.target.value) })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>Minimum Sipariş Tutarı (₺)</label>
                                    <input
                                        type="number"
                                        value={platformAyarlari.minSiparisTutari}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, minSiparisTutari: Number(e.target.value) })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>Destek Telefonu</label>
                                    <input
                                        type="text"
                                        value={platformAyarlari.destekTelefon}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, destekTelefon: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>Destek Email</label>
                                    <input
                                        type="email"
                                        value={platformAyarlari.destekEmail}
                                        onChange={e => setPlatformAyarlari({ ...platformAyarlari, destekEmail: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                {/* ✅ YENİ: Bakım Modu */}
                                <div style={styles.settingRow}>
                                    <label style={styles.settingLabel}>
                                        <input
                                            type="checkbox"
                                            checked={platformAyarlari.bakimModu}
                                            onChange={e => setPlatformAyarlari({
                                                ...platformAyarlari,
                                                bakimModu: e.target.checked
                                            })}
                                            style={{ marginRight: '10px' }}
                                        />
                                        🔧 Bakım Modu {platformAyarlari.bakimModu && <span style={{ color: '#ef4444' }}>(AKTİF)</span>}
                                    </label>
                                </div>

                                {platformAyarlari.bakimModu && (
                                    <div style={styles.settingRow}>
                                        <label style={styles.settingLabel}>Bakım Mesajı</label>
                                        <textarea
                                            rows="2"
                                            value={platformAyarlari.bakimMesaji}
                                            onChange={e => setPlatformAyarlari({
                                                ...platformAyarlari,
                                                bakimMesaji: e.target.value
                                            })}
                                            placeholder="Sistem bakımda, lütfen daha sonra tekrar deneyin..."
                                            style={styles.textarea}
                                        />
                                    </div>
                                )}

                                <button onClick={ayarlariKaydet} style={{ ...styles.primaryButton, marginTop: '20px' }}>
                                    💾 Ayarları Kaydet
                                </button>
                            </div>

                            {/* Duyuru */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>📢 Global Duyuru</h3>
                                <p style={styles.settingDesc}>Tüm kullanıcılara duyuru gönderin</p>
                                <textarea
                                    rows="4"
                                    placeholder="Duyuru metni..."
                                    value={duyuruMetni}
                                    onChange={e => setDuyuruMetni(e.target.value)}
                                    style={styles.textarea}
                                />
                                <button onClick={duyuruGonder} style={{ ...styles.primaryButton, marginTop: '10px' }}>
                                    📣 Yayınla
                                </button>
                            </div>

                            {/* Bakım */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🧹 Veritabanı Bakımı</h3>
                                <p style={styles.settingDesc}>
                                    30 günden eski iptal edilmiş siparişleri temizleyerek veritabanını optimize edin.
                                </p>
                                <div style={styles.maintenanceInfo}>
                                    <div>
                                        <strong>Toplam Sipariş:</strong> {tumSiparisler.length}
                                    </div>
                                    <div>
                                        <strong>İptal Edilmiş:</strong> {tumSiparisler.filter(s => s.durum === 'İptal Edildi').length}
                                    </div>
                                </div>
                                <button onClick={copleriTemizle} style={{ ...styles.secondaryButton, marginTop: '15px' }}>
                                    🗑️ Eski Verileri Temizle
                                </button>
                            </div>

                            {/* Sistem Bilgisi */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>📊 Sistem Bilgisi</h3>
                                <div style={styles.systemInfo}>
                                    <div style={styles.systemInfoRow}>
                                        <span>Versiyon:</span>
                                        <span>1.0.0</span>
                                    </div>
                                    <div style={styles.systemInfoRow}>
                                        <span>Toplam Restoran:</span>
                                        <span>{restoranlar.length}</span>
                                    </div>
                                    <div style={styles.systemInfoRow}>
                                        <span>Toplam Kullanıcı:</span>
                                        <span>{kullanicilar.length}</span>
                                    </div>
                                    <div style={styles.systemInfoRow}>
                                        <span>Toplam Sipariş:</span>
                                        <span>{tumSiparisler.length}</span>
                                    </div>
                                    <div style={styles.systemInfoRow}>
                                        <span>Tanımlı Şehir:</span>
                                        <span>{Object.keys(bolgeler).length}</span>
                                    </div>
                                    <div style={styles.systemInfoRow}>
                                        <span>Admin:</span>
                                        <span>{adminBilgi?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* ========== MODALLER (Önceki kodda var, aynen koyuyorum) ========== */}

            {/* Yeni Restoran Modalı */}
            {modalAcik && (
                <div style={styles.modalOverlay} onClick={() => setModalAcik(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🏢 Yeni Restoran Ekle</h3>
                            <button onClick={() => setModalAcik(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <form onSubmit={restoranEkle} style={styles.modalBody}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Restoran Adı *</label>
                                    <input
                                        type="text"
                                        value={yeniRes.isim}
                                        onChange={e => setYeniRes({ ...yeniRes, isim: e.target.value })}
                                        style={styles.input}
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Kategori</label>
                                    <select
                                        value={yeniRes.kategori}
                                        onChange={e => setYeniRes({ ...yeniRes, kategori: e.target.value })}
                                        style={styles.input}
                                    >
                                        <option>Burger</option>
                                        <option>Pizza</option>
                                        <option>Kebap</option>
                                        <option>Döner</option>
                                        <option>Tavuk</option>
                                        <option>Tatlı</option>
                                        <option>Kahvaltı</option>
                                        <option>Ev Yemekleri</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Telefon</label>
                                    <input
                                        type="tel"
                                        value={yeniRes.telefon}
                                        onChange={e => setYeniRes({ ...yeniRes, telefon: e.target.value })}
                                        style={styles.input}
                                        placeholder="05XX XXX XX XX"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Adres</label>
                                    <input
                                        type="text"
                                        value={yeniRes.adres}
                                        onChange={e => setYeniRes({ ...yeniRes, adres: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Logo URL</label>
                                <input
                                    type="url"
                                    value={yeniRes.resim}
                                    onChange={e => setYeniRes({ ...yeniRes, resim: e.target.value })}
                                    style={styles.input}
                                    placeholder="https://..."
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Kapak Resmi URL</label>
                                <input
                                    type="url"
                                    value={yeniRes.kapakResmi}
                                    onChange={e => setYeniRes({ ...yeniRes, kapakResmi: e.target.value })}
                                    style={styles.input}
                                    placeholder="https://..."
                                />
                            </div>

                            <div style={styles.formDivider}></div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Sahip Email *</label>
                                    <input
                                        type="email"
                                        value={yeniRes.email}
                                        onChange={e => setYeniRes({ ...yeniRes, email: e.target.value })}
                                        style={styles.input}
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Şifre *</label>
                                    <input
                                        type="password"
                                        value={yeniRes.sifre}
                                        onChange={e => setYeniRes({ ...yeniRes, sifre: e.target.value })}
                                        style={styles.input}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setModalAcik(false)} style={styles.secondaryButton}>
                                    İptal
                                </button>
                                <button type="submit" style={styles.primaryButton}>
                                    ✅ Restoran Ekle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Kampanya Modalı */}
            {kampanyaModalAcik && (
                <div style={styles.modalOverlay} onClick={() => setKampanyaModalAcik(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🔥 Yeni Kampanya</h3>
                            <button onClick={() => setKampanyaModalAcik(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <form onSubmit={kampanyaEkle} style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>
                                    <input
                                        type="checkbox"
                                        checked={yeniKampanya.global}
                                        onChange={e => setYeniKampanya({ ...yeniKampanya, global: e.target.checked })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    🌍 Tüm Restoranlara Uygula (Global)
                                </label>
                            </div>

                            {!yeniKampanya.global && (
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Restoran Seçin *</label>
                                    <select
                                        value={yeniKampanya.restoranId}
                                        onChange={e => setYeniKampanya({ ...yeniKampanya, restoranId: e.target.value })}
                                        style={styles.input}
                                        required={!yeniKampanya.global}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {restoranlar.map(r => (
                                            <option key={r.id} value={r.id}>{r.isim}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Kampanya Başlığı *</label>
                                <input
                                    type="text"
                                    value={yeniKampanya.baslik}
                                    onChange={e => setYeniKampanya({ ...yeniKampanya, baslik: e.target.value })}
                                    style={styles.input}
                                    placeholder="Örn: Hafta Sonu Fırsatı"
                                    required
                                />
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>İndirim Tipi</label>
                                    <select
                                        value={yeniKampanya.tip}
                                        onChange={e => setYeniKampanya({ ...yeniKampanya, tip: e.target.value })}
                                        style={styles.input}
                                    >
                                        <option value="yuzde">Yüzde (%)</option>
                                        <option value="tutar">Sabit Tutar (₺)</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>
                                        İndirim {yeniKampanya.tip === 'yuzde' ? '(%)' : '(₺)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={yeniKampanya.deger}
                                        onChange={e => setYeniKampanya({ ...yeniKampanya, deger: e.target.value })}
                                        style={styles.input}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Minimum Sepet Tutarı (₺)</label>
                                <input
                                    type="number"
                                    value={yeniKampanya.minSepet}
                                    onChange={e => setYeniKampanya({ ...yeniKampanya, minSepet: e.target.value })}
                                    style={styles.input}
                                    min="0"
                                    placeholder="0 = Limit yok"
                                />
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setKampanyaModalAcik(false)} style={styles.secondaryButton}>
                                    İptal
                                </button>
                                <button type="submit" style={styles.primaryButton}>
                                    🔥 Kampanya Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sipariş Detay Modalı (önceki koddan) */}
            {siparisDetayModal && seciliSiparis && (
                <div style={styles.modalOverlay} onClick={() => setSiparisDetayModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                📦 Sipariş #{seciliSiparis.id.slice(-6).toUpperCase()}
                            </h3>
                            <button onClick={() => setSiparisDetayModal(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <div style={styles.modalBody}>
                            {/* Durum */}
                            <div style={styles.orderStatusSection}>
                                <span style={{ ...getDurumStyle(seciliSiparis.durum), fontSize: '16px', padding: '8px 16px' }}>
                                    {seciliSiparis.durum}
                                </span>
                                <span style={styles.orderDate}>{formatTarih(seciliSiparis.tarih)}</span>
                            </div>

                            {/* Bilgiler */}
                            <div style={styles.orderInfoGrid}>
                                <div style={styles.orderInfoCard}>
                                    <div style={styles.orderInfoLabel}>🏢 Restoran</div>
                                    <div style={styles.orderInfoValue}>{seciliSiparis.restoranAd}</div>
                                </div>
                                <div style={styles.orderInfoCard}>
                                    <div style={styles.orderInfoLabel}>👤 Müşteri</div>
                                    <div style={styles.orderInfoValue}>{seciliSiparis.musteriAd}</div>
                                </div>
                            </div>

                            <div style={styles.orderInfoCard}>
                                <div style={styles.orderInfoLabel}>📍 Adres</div>
                                <div style={styles.orderInfoValue}>{seciliSiparis.adres}</div>
                            </div>

                            {/* Ürünler */}
                            <div style={styles.orderProducts}>
                                <div style={styles.orderProductsTitle}>🍔 Sipariş İçeriği</div>
                                {seciliSiparis.yemekler?.map((y, i) => (
                                    <div key={i} style={styles.orderProductRow}>
                                        <span>{y.adet}x {y.ad}</span>
                                        <span>{formatPara(y.fiyat * y.adet)}</span>
                                    </div>
                                ))}
                                <div style={styles.orderTotalRow}>
                                    <span>Toplam</span>
                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                        {formatPara(seciliSiparis.toplamTutar)}
                                    </span>
                                </div>
                            </div>

                            {/* Notlar */}
                            {seciliSiparis.not && (
                                <div style={styles.orderNote}>
                                    <strong>📝 Müşteri Notu:</strong> {seciliSiparis.not}
                                </div>
                            )}

                            {seciliSiparis.iptalSebebi && (
                                <div style={{ ...styles.orderNote, background: '#ef444420', borderColor: '#ef4444' }}>
                                    <strong>❌ İptal Sebebi:</strong> {seciliSiparis.iptalSebebi}
                                </div>
                            )}

                            {/* Durum Değiştir */}
                            {seciliSiparis.durum !== 'Teslim Edildi' && seciliSiparis.durum !== 'İptal Edildi' && (
                                <div style={styles.orderActions}>
                                    <select
                                        defaultValue={seciliSiparis.durum}
                                        onChange={e => siparisDurumGuncelle(seciliSiparis.id, e.target.value)}
                                        style={styles.input}
                                    >
                                        {SIPARIS_DURUMLARI.filter(d => d !== 'Tümü').map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Kullanıcı Detay Modalı (önceki koddan) */}
            {kullaniciDetayModal && seciliKullanici && (
                <div style={styles.modalOverlay} onClick={() => setKullaniciDetayModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>👤 Kullanıcı Detayı</h3>
                            <button onClick={() => setKullaniciDetayModal(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <div style={styles.modalBody}>
                            {/* Kullanıcı Bilgileri */}
                            <div style={styles.userDetailHeader}>
                                <div style={styles.userDetailAvatar}>
                                    {(seciliKullanici.ad || seciliKullanici.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={styles.userDetailName}>
                                        {seciliKullanici.ad || seciliKullanici.email?.split('@')[0]}
                                    </div>
                                    <div style={styles.userDetailEmail}>{seciliKullanici.email}</div>
                                    <span style={getRolStyle(seciliKullanici.rol)}>{seciliKullanici.rol || 'musteri'}</span>
                                </div>
                            </div>

                            <div style={styles.userDetailInfo}>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>📞 Telefon:</span>
                                    <span>{seciliKullanici.telefon || "-"}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>📅 Kayıt:</span>
                                    <span>{formatTarih(seciliKullanici.olusturulmaTarihi)}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>📦 Sipariş:</span>
                                    <span>{kullaniciSiparisleri.length} adet</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>💰 Harcama:</span>
                                    <span>
                                        {formatPara(kullaniciSiparisleri
                                            .filter(s => s.durum === 'Teslim Edildi')
                                            .reduce((t, s) => t + (s.toplamTutar || 0), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Son Siparişler */}
                            <div style={styles.userOrdersSection}>
                                <h4>Son Siparişler</h4>
                                {kullaniciSiparisleri.slice(0, 5).map(s => (
                                    <div key={s.id} style={styles.miniOrderCard}>
                                        <span>{formatTarih(s.tarih)}</span>
                                        <span>{s.restoranAd}</span>
                                        <span style={{ fontWeight: 'bold' }}>{formatPara(s.toplamTutar)}</span>
                                        <span style={getDurumStyle(s.durum)}>{s.durum}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Aksiyonlar */}
                            <div style={styles.modalFooter}>
                                <select
                                    defaultValue={seciliKullanici.rol || 'musteri'}
                                    onChange={e => kullaniciRolDegistir(seciliKullanici.id, e.target.value)}
                                    style={styles.input}
                                >
                                    <option value="musteri">Müşteri</option>
                                    <option value="restoran">Restoran</option>
                                    <option value="superadmin">Admin</option>
                                </select>
                                <button
                                    onClick={() => kullaniciBanla(seciliKullanici.id, !seciliKullanici.banliMi)}
                                    style={seciliKullanici.banliMi ? styles.primaryButton : styles.dangerButton}
                                >
                                    {seciliKullanici.banliMi ? '✅ Yasağı Kaldır' : '🚫 Yasakla'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Destek Talep Detay Modalı (önceki koddan) */}
            {talepDetayModal && seciliTalep && (
                <div style={styles.modalOverlay} onClick={() => setTalepDetayModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🛟 Destek Talebi</h3>
                            <button onClick={() => setTalepDetayModal(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.ticketInfo}>
                                <div style={styles.ticketFrom}>
                                    <span>{seciliTalep.tur === 'restoran' ? '🏢' : '👤'}</span>
                                    <strong>{seciliTalep.kimden}</strong>
                                </div>
                                {seciliTalep.email && (
                                    <div style={styles.ticketPhone}>📧 {seciliTalep.email}</div>
                                )}
                                {seciliTalep.telefon && (
                                    <div style={styles.ticketPhone}>📞 {seciliTalep.telefon}</div>
                                )}
                                <div style={styles.ticketDate}>{formatTarih(seciliTalep.tarih)}</div>
                            </div>

                            <div style={styles.ticketSubject}>
                                <strong>Konu:</strong>
                                <p>{seciliTalep.konu}</p>
                            </div>

                            {seciliTalep.cevap && (
                                <div style={styles.ticketReply}>
                                    <strong>✅ Cevap:</strong>
                                    <p>{seciliTalep.cevap}</p>
                                    <small>Cevaplayan: {seciliTalep.cevaplayan}</small>
                                </div>
                            )}

                            {seciliTalep.durum === 'Bekliyor' && (
                                <>
                                    <textarea
                                        rows="4"
                                        placeholder="Cevabınızı yazın..."
                                        value={talepCevap}
                                        onChange={e => setTalepCevap(e.target.value)}
                                        style={styles.textarea}
                                    />
                                    <div style={styles.modalFooter}>
                                        <button
                                            onClick={() => talepDurumGuncelle(seciliTalep.id, 'İşlemde')}
                                            style={styles.secondaryButton}
                                        >
                                            ⏳ İşleme Al
                                        </button>
                                        <button
                                            onClick={() => talepCevapla(seciliTalep.id)}
                                            style={styles.primaryButton}
                                        >
                                            ✉️ Cevap Gönder
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Kupon Oluştur Modalı */}
            {kuponModalAcik && (
                <div style={styles.modalOverlay} onClick={() => setKuponModalAcik(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🎫 Yeni Kupon Oluştur</h3>
                            <button onClick={() => setKuponModalAcik(false)} style={styles.modalClose}>✕</button>
                        </div>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!yeniKupon.kod || !yeniKupon.deger) {
                                    alert('Kupon kodu ve değeri zorunludur');
                                    return;
                                }
                                try {
                                    await addDoc('kuponlar', {
                                        kod: yeniKupon.kod.toUpperCase(),
                                        tip: yeniKupon.tip,
                                        deger: Number(yeniKupon.deger),
                                        minSepet: Number(yeniKupon.minSepet) || 0,
                                        maxKullanim: Number(yeniKupon.maxKullanim) || 0,
                                        baslangic: yeniKupon.baslangic || null,
                                        bitis: yeniKupon.bitis || null,
                                        aktif: yeniKupon.aktif,
                                        kullanilanAdet: 0,
                                        olusturulmaTarihi: serverTimestamp(),
                                        olusturan: adminBilgi?.email || 'Sistem'
                                    });
                                    setYeniKupon({
                                        kod: '',
                                        tip: 'yuzde',
                                        deger: 10,
                                        minSepet: 0,
                                        maxKullanim: 100,
                                        baslangic: '',
                                        bitis: '',
                                        aktif: true
                                    });
                                    setKuponModalAcik(false);
                                    alert('✅ Kupon başarıyla oluşturuldu!');
                                } catch (error) {
                                    console.error('Kupon oluşturma hatası:', error);
                                    alert('Kupon oluşturulurken hata oluştu');
                                    alert('Kupon oluşturulurken hata oluştu: ' + error.message);
                                }
                            }}
                            style={styles.modalBody}
                        >
                            <div style={styles.formGrid}>
                                <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                                    <label style={styles.formLabel}>Kupon Kodu *</label>
                                    <input
                                        type="text"
                                        value={yeniKupon.kod}
                                        onChange={e => setYeniKupon({ ...yeniKupon, kod: e.target.value.toUpperCase() })}
                                        style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '2px' }}
                                        placeholder="INDIRIM2024"
                                        maxLength="20"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>İndirim Tipi *</label>
                                    <select
                                        value={yeniKupon.tip}
                                        onChange={e => setYeniKupon({ ...yeniKupon, tip: e.target.value })}
                                        style={styles.input}
                                        required
                                    >
                                        <option value="yuzde">📊 Yüzde (%)</option>
                                        <option value="tutar">💵 Tutar (₺)</option>
                                        <option value="puan">🎯 Puan</option>
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>
                                        Değer {yeniKupon.tip === 'yuzde' && '(%)'}
                                        {yeniKupon.tip === 'tutar' && '(₺)'}
                                        {yeniKupon.tip === 'puan' && '(Puan)'}
                                        *
                                    </label>
                                    <input
                                        type="number"
                                        value={yeniKupon.deger}
                                        onChange={e => setYeniKupon({ ...yeniKupon, deger: Number(e.target.value) })}
                                        style={styles.input}
                                        min="0"
                                        max={yeniKupon.tip === 'yuzde' ? '100' : '10000'}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Min. Sepet Tutarı (₺)</label>
                                    <input
                                        type="number"
                                        value={yeniKupon.minSepet}
                                        onChange={e => setYeniKupon({ ...yeniKupon, minSepet: Number(e.target.value) })}
                                        style={styles.input}
                                        min="0"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Max. Kullanım</label>
                                    <input
                                        type="number"
                                        value={yeniKupon.maxKullanim}
                                        onChange={e => setYeniKupon({ ...yeniKupon, maxKullanim: Number(e.target.value) })}
                                        style={styles.input}
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        value={yeniKupon.baslangic}
                                        onChange={e => setYeniKupon({ ...yeniKupon, baslangic: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        value={yeniKupon.bitis}
                                        onChange={e => setYeniKupon({ ...yeniKupon, bitis: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={{ ...styles.formGroup, marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}>
                                    <input
                                        type="checkbox"
                                        checked={yeniKupon.aktif}
                                        onChange={e => setYeniKupon({ ...yeniKupon, aktif: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    ✅ Aktif Kupon olarak başlat
                                </label>
                            </div>

                            <div style={styles.modalFooter}>
                                <button
                                    type="button"
                                    onClick={() => setKuponModalAcik(false)}
                                    style={styles.secondaryButton}
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    style={styles.primaryButton}
                                >
                                    🎫 Kupon Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #0f172a; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
    // Container
    container: { display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },

    // Sidebar
    sidebar: { width: '260px', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155' },
    sidebarHeader: { padding: '25px 20px', textAlign: 'center', borderBottom: '1px solid #334155' },
    logoBadge: { fontSize: '36px', marginBottom: '10px' },
    logoText: { fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-1px', margin: '0' },
    roleBadge: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', fontSize: '10px', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', letterSpacing: '1px', display: 'inline-block', marginTop: '10px' },
    nav: { flex: 1, padding: '15px', overflowY: 'auto' },
    navButton: { width: '100%', background: 'transparent', border: 'none', color: '#94a3b8', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' },
    navButtonActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' },
    navBadge: { background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' },
    navBadgeWarning: { background: '#f59e0b', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' },
    sidebarFooter: { padding: '15px', borderTop: '1px solid #334155' },
    adminInfo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
    adminAvatar: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
    adminEmail: { fontSize: '12px', color: '#e2e8f0', fontWeight: '500' },
    adminRole: { fontSize: '10px', color: '#64748b' },
    logoutButton: { width: '100%', background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' },

    // Content
    content: { flex: 1, overflow: 'auto', padding: '25px' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
    pageTitle: { fontSize: '28px', fontWeight: '700', margin: '0', color: '#fff' },
    pageSubtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },

    // KPI Grid
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' },
    secondaryKpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' },
    miniKpi: { background: '#1e293b', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #334155' },
    miniKpiIcon: { fontSize: '28px' },
    miniKpiValue: { fontSize: '20px', fontWeight: 'bold', color: '#fff' },
    miniKpiLabel: { fontSize: '11px', color: '#64748b' },

    // Dashboard Bottom
    dashboardBottom: { display: 'flex', gap: '20px' },

    // Cards
    card: { background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px', marginBottom: '20px' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    cardTitle: { fontSize: '16px', fontWeight: '700', margin: '0', color: '#fff' },

    // Tables
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '1px solid #334155', fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #33415530' },
    td: { padding: '14px 12px', fontSize: '13px', color: '#e2e8f0' },

    // Buttons
    primaryButton: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' },
    secondaryButton: { background: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    dangerButton: { background: '#ef444450', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    smallButton: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    linkButton: { background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', padding: '0' },
    quickButton: { background: '#334155', border: '1px solid #475569', color: '#e2e8f0', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', width: '100%', marginBottom: '10px', textAlign: 'left', transition: 'all 0.2s' },
    actionBtn: { background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '16px', padding: '4px' },
    iconButton: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' },
    actionButtons: { display: 'flex', gap: '8px' },

    // Filters
    filterBar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' },
    filterGroup: { display: 'flex', gap: '8px' },
    filterButton: { background: '#334155', border: 'none', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
    filterButtonActive: { background: '#3b82f6', color: 'white' },
    filterInfo: { marginLeft: 'auto', fontSize: '13px', color: '#64748b' },

    // Inputs
    input: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%' },
    searchInput: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', flex: '1', maxWidth: '300px' },
    selectInput: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
    textarea: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', width: '100%', resize: 'vertical' },

    // Top List
    topList: { marginTop: '15px' },
    topListItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: '#0f172a', borderRadius: '8px', marginBottom: '6px' },
    topListRank: { background: '#3b82f6', color: 'white', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' },
    topListName: { flex: 1, fontSize: '13px', color: '#e2e8f0', fontWeight: '500' },
    topListValue: { fontSize: '12px', color: '#64748b' },

    // List Styles
    listContainer: { paddingRight: '10px' },
    listItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', marginBottom: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', background: '#1e293b', border: '1px solid #334155' },
    listItemImage: { width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' },
    listItemInfo: { flex: 1 },
    listItemTitle: { fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' },
    listItemSubtitle: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
    listItemMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' },
    listItemArrow: { color: '#64748b', fontSize: '18px' },
    statusDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
    verifiedBadge: { background: '#10b98120', color: '#10b981', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' },
    yogunlukBadge: { background: '#f59e0b20', color: '#f59e0b', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' },

    // Detail Panel
    detailPanel: { flex: '0 0 360px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    detailHeader: { textAlign: 'center', paddingBottom: '20px' },
    detailCover: { height: '100px', background: '#334155', marginBottom: '-40px' },
    detailCoverImg: { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 },
    detailLogo: { width: '80px', height: '80px', borderRadius: '16px', border: '4px solid #1e293b', position: 'relative', zIndex: 1, background: '#fff', objectFit: 'cover' },
    detailTitle: { fontSize: '18px', fontWeight: '700', margin: '12px 0 8px' },
    detailBadges: { display: 'flex', justifyContent: 'center', gap: '8px' },
    statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    onayBadge: { background: '#10b98120', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    detailInfo: { padding: '0 20px', marginBottom: '15px' },
    infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #33415530', fontSize: '13px' },
    infoLabel: { color: '#64748b' },
    statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 20px', marginBottom: '15px' },
    statCard: { background: '#0f172a', padding: '15px', borderRadius: '10px', textAlign: 'center' },
    statValue: { fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' },
    statLabel: { fontSize: '11px', color: '#64748b', marginTop: '4px' },
    controlGroup: { padding: '0 20px', marginBottom: '15px' },
    controlLabel: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' },
    controlRow: { display: 'flex', gap: '10px' },
    actionGroup: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' },
    emptyPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' },

    // User Styles
    userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
    userAvatar: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white' },
    userName: { fontWeight: '600', color: '#fff' },
    userEmail: { fontSize: '11px', color: '#64748b' },
    bannedBadge: { background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
    activeBadge: { background: '#10b98120', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },

    // Campaign Styles
    campaignStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' },
    campaignStatCard: { background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #334155' },
    campaignStatIcon: { fontSize: '32px', display: 'block', marginBottom: '8px' },
    campaignStatValue: { fontSize: '28px', fontWeight: 'bold', color: '#fff' },
    campaignStatLabel: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
    campaignGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    campaignCard: { borderRadius: '16px', padding: '20px', color: 'white', position: 'relative', overflow: 'hidden', minHeight: '160px' },
    campaignRestoran: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', opacity: 0.9 },
    campaignRestoranLogo: { width: '24px', height: '24px', borderRadius: '6px', background: 'white' },
    campaignValue: { fontSize: '32px', fontWeight: '800', marginBottom: '4px' },
    campaignTitle: { fontSize: '15px', fontWeight: '600' },
    campaignMin: { fontSize: '12px', opacity: 0.8, marginTop: '4px' },
    campaignStatus: { position: 'absolute', top: '15px', right: '15px', fontSize: '11px' },
    campaignActions: { position: 'absolute', bottom: '15px', right: '15px', display: 'flex', gap: '8px' },
    campaignActionBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
    globalBadge: { background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '8px' },

    // Finance Styles
    financeKpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' },
    financeKpiCard: { background: '#1e293b', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #334155' },
    financeKpiIcon: { fontSize: '32px' },
    financeKpiValue: { fontSize: '24px', fontWeight: 'bold', color: '#fff' },
    financeKpiLabel: { fontSize: '12px', color: '#64748b' },
    restoranCell: { display: 'flex', alignItems: 'center', gap: '10px' },
    miniLogo: { width: '30px', height: '30px', borderRadius: '6px', objectFit: 'cover' },

    // Support Styles
    supportStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' },
    supportStatCard: { background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center', borderLeft: '4px solid' },
    supportStatValue: { fontSize: '32px', fontWeight: 'bold', color: '#fff' },
    supportStatLabel: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
    supportItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #334155' },
    supportItemMain: { flex: 1 },
    supportItemHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
    supportItemType: { fontSize: '16px' },
    supportItemFrom: { fontWeight: '600', color: '#fff' },
    supportItemDate: { fontSize: '11px', color: '#64748b' },
    supportItemSubject: { fontSize: '14px', color: '#e2e8f0' },
    supportItemPhone: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
    supportItemActions: { display: 'flex', alignItems: 'center', gap: '12px' },

    // Settings Styles
    settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
    settingRow: { marginBottom: '15px' },
    settingLabel: { display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' },
    settingDesc: { fontSize: '13px', color: '#64748b', marginBottom: '15px' },
    maintenanceInfo: { display: 'flex', gap: '20px', background: '#0f172a', padding: '15px', borderRadius: '10px', fontSize: '13px', color: '#94a3b8' },
    systemInfo: { marginTop: '15px' },
    systemInfoRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #33415530', fontSize: '13px' },

    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modal: { background: '#1e293b', borderRadius: '20px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflow: 'auto', border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #334155' },
    modalTitle: { fontSize: '18px', fontWeight: '700', margin: 0, color: '#fff' },
    modalClose: { background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer', padding: '0', lineHeight: 1 },
    modalBody: { padding: '20px' },
    modalFooter: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    formGroup: { marginBottom: '15px' },
    formLabel: { display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' },
    formDivider: { height: '1px', background: '#334155', margin: '20px 0' },

    // Order Detail Modal
    orderStatusSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    orderDate: { fontSize: '13px', color: '#64748b' },
    orderInfoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' },
    orderInfoCard: { background: '#0f172a', padding: '12px', borderRadius: '10px', marginBottom: '10px' },
    orderInfoLabel: { fontSize: '11px', color: '#64748b', marginBottom: '4px' },
    orderInfoValue: { fontSize: '14px', color: '#fff', fontWeight: '500' },
    orderProducts: { background: '#0f172a', borderRadius: '10px', padding: '15px', marginTop: '15px' },
    orderProductsTitle: { fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px' },
    orderProductRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #33415530', fontSize: '13px', color: '#e2e8f0' },
    orderTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: '8px', borderTop: '1px solid #334155', fontSize: '15px' },
    orderNote: { background: '#f59e0b15', border: '1px solid #f59e0b30', padding: '12px', borderRadius: '10px', marginTop: '15px', fontSize: '13px', color: '#fbbf24' },
    orderActions: { marginTop: '20px' },
    orderId: { background: '#3b82f620', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },

    // User Detail Modal
    userDetailHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #334155' },
    userDetailAvatar: { width: '60px', height: '60px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' },
    userDetailName: { fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
    userDetailEmail: { fontSize: '13px', color: '#64748b', marginBottom: '8px' },
    userDetailInfo: { marginBottom: '20px' },
    userOrdersSection: { background: '#0f172a', borderRadius: '10px', padding: '15px', marginTop: '15px' },
    miniOrderCard: { display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: '10px', padding: '10px 0', borderBottom: '1px solid #33415530', fontSize: '12px', alignItems: 'center' },

    // Ticket/Support Detail
    ticketInfo: { background: '#0f172a', padding: '15px', borderRadius: '10px', marginBottom: '15px' },
    ticketFrom: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', marginBottom: '8px' },
    ticketPhone: { fontSize: '13px', color: '#64748b', marginBottom: '4px' },
    ticketDate: { fontSize: '12px', color: '#64748b' },
    ticketSubject: { background: '#0f172a', padding: '15px', borderRadius: '10px', marginBottom: '15px' },
    ticketReply: { background: '#10b98115', border: '1px solid #10b98130', padding: '15px', borderRadius: '10px', marginBottom: '15px', color: '#4ade80' },

    // Empty States
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },

    // Loading
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' },
    loadingContent: { textAlign: 'center' },
    loadingIcon: { fontSize: '48px', marginBottom: '20px', animation: 'pulse 1.5s infinite' },
    loadingText: { color: '#3b82f6', fontSize: '16px', fontWeight: '600', letterSpacing: '1px' },
    loadingSubtext: { color: '#64748b', fontSize: '12px', marginTop: '8px' },
};

export default Admin;