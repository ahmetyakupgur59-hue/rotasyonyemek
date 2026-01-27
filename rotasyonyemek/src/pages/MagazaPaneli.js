import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
    collection, query, where, onSnapshot, doc, updateDoc, addDoc,
    deleteDoc, arrayUnion, arrayRemove, orderBy, serverTimestamp,
    getDoc // ✅ YENİ EKLEME
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// 📧 EMAIL SERVİSİ
import { siparisDurumEmaili } from '../services/emailService';


// --- SABİTLER ---
const GUNLER = ["Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi", "Pazar"];

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

const KAMPANYA_TIPLERI = [
    { label: "Sepette % İndirim", value: "yuzde" },
    { label: "Sepette Tutar İndirimi (TL)", value: "tutar" },
    { label: "X Al Y Öde", value: "x_al_y_ode" },
    { label: "Ürün Bazlı İndirim", value: "urun_bazli" },
    { label: "İlk Sipariş İndirimi", value: "ilk_siparis" }
];

// YENİ: Yoğunluk seçenekleri ve açıklamaları
const YOGUNLUK_SECENEKLERI = [
    { value: "Normal", label: "Normal", icon: "🟢", aciklama: "Siparişler normal şekilde alınıyor" },
    { value: "Yoğun", label: "Çok Yoğun", icon: "🟠", aciklama: "Sipariş alımı geçici olarak durduruldu" },
    { value: "Kötü Hava", label: "Kötü Hava", icon: "🌧️", aciklama: "Siparişler gecikebilir uyarısı gösterilir" },
    { value: "Servis Dışı", label: "Servis Dışı", icon: "🔴", aciklama: "Restoran tamamen kapalı" }
];

function MagazaPaneli() {
    // --- 1. STATE YÖNETİMİ ---
    const [restoran, setRestoran] = useState(null);
    const [siparisler, setSiparisler] = useState([]);
    const [yemekler, setYemekler] = useState([]);
    const [loading, setLoading] = useState(true);

    // Navigasyon
    const [acikMenu, setAcikMenu] = useState("Siparisler");
    const [aktifSayfa, setAktifSayfa] = useState("mutfak");

    // İstatistik & Finans
    const [finansOzet, setFinansOzet] = useState({ gunlukCiro: 0, aylikCiro: 0, toplamSiparis: 0, iptalOrani: 0 });
    const [gunlukCiro, setGunlukCiro] = useState(0);
    const [bekleyenSayisi, setBekleyenSayisi] = useState(0);

    // --- FORMLAR ---
    const [duzenlemeModu, setDuzenlemeModu] = useState(null);
    const [sikayetMetni, setSikayetMetni] = useState("");

    // Ürün Yönetimi
    const [urunForm, setUrunForm] = useState({
        ad: "", fiyat: "", aciklama: "", kategori: "Genel", resim: "", secenekler: [], allerjenler: []
    });
    const [yeniSecenek, setYeniSecenek] = useState({ ad: "", fiyat: 0 });

    // Profil Yönetimi
    const [profilForm, setProfilForm] = useState({
        isim: "", telefon: "", adres: "", aciklama: "", logo: "", kapakResmi: ""
    });

    // Ayarlar & Otomasyon
    const [calismaSaatleri, setCalismaSaatleri] = useState({});
    const [otomatikMod, setOtomatikMod] = useState(false);
    const [sesAyarlari, setSesAyarlari] = useState({ zil: true, alarm: true, mesaj: true });

    // === BÖLGE YÖNETİMİ === ✅ YENİ EKLEME
    const [adminBolgeler, setAdminBolgeler] = useState({});
    const [seciliSehir, setSeciliSehir] = useState("");
    const [seciliIlce, setSeciliIlce] = useState("");
    const [seciliMahalle, setSeciliMahalle] = useState("");
    const [minSepetTutari, setMinSepetTutari] = useState("");

    // Kampanya
    const [yeniKampanya, setYeniKampanya] = useState({
        baslik: "", tip: "yuzde", deger: 0, minSepet: 0, hedefUrunler: [], eskiFiyat: 0, aktif: true
    });
    const [kampanyalar, setKampanyalar] = useState([]);

    // YENİ: Önerilen Ürünler (Upsell) için state
    const [onerilenUrunler, setOnerilenUrunler] = useState([]);

    // --- SİSTEM DEĞİŞKENLERİ ---
    const [chatModalAcik, setChatModalAcik] = useState(false);
    const [aktifChatSiparis, setAktifChatSiparis] = useState(null);
    const [chatMesajlari, setChatMesajlari] = useState([]);
    const [yeniMesaj, setYeniMesaj] = useState("");

    // Kapanış Sayacı
    const [kapanisUyarisiAktif, setKapanisUyarisiAktif] = useState(false);
    const [kapanisSayac, setKapanisSayac] = useState(30);

    // Durumlar
    const [yogunluk, setYogunluk] = useState("Normal");
    const [kotuHava, setKotuHava] = useState(false);

    // --- FAZ 3: YENİ STATE'LER ---
    // Tahmini Teslimat Süresi
    const [etaAyarlari, setEtaAyarlari] = useState({
        minSure: 25,
        maxSure: 40,
        yogunlukEtkisi: true  // Yoğunlukta otomatik süre artışı
    });

    // Toplu Fiyat Güncelleme
    const [topluGuncellemeModal, setTopluGuncellemeModal] = useState(false);
    const [topluGuncellemeOran, setTopluGuncellemeOran] = useState(10);
    const [topluGuncellemeTip, setTopluGuncellemeTip] = useState('zam'); // 'zam' veya 'indirim'
    const [seciliKategori, setSeciliKategori] = useState('Tümü');

    // Otomatik Kategorizasyon
    const KATEGORI_ANAHTAR_KELIMELER = {
        'Burger': ['burger', 'hamburger', 'cheeseburger', 'whopper', 'big mac', 'köfte burger'],
        'Pizza': ['pizza', 'margherita', 'pepperoni', 'sucuklu', 'karışık pizza'],
        'Döner': ['döner', 'dürüm', 'iskender', 'porsiyon döner', 'tavuk döner', 'et döner'],
        'Tavuk': ['tavuk', 'chicken', 'kanat', 'but', 'nugget', 'strips', 'çıtır tavuk', 'wings'],
        'Makarna': ['makarna', 'spagetti', 'penne', 'fettuccine', 'lazanya', 'pasta'],
        'Salata': ['salata', 'meze', 'cacık', 'haydari', 'söğüş', 'çoban', 'akdeniz'],
        'Tatlı': ['tatlı', 'baklava', 'künefe', 'kadayıf', 'sütlaç', 'puding', 'cheesecake', 'brownie', 'tiramisu', 'dondurma'],
        'İçecek': ['kola', 'cola', 'fanta', 'sprite', 'ayran', 'şalgam', 'limonata', 'ice tea', 'su', 'soda', 'meyve suyu', 'kahve', 'çay'],
        'Ara Sıcak': ['patates', 'soğan halkası', 'mozzarella', 'çıtır', 'kızartma', 'börek', 'sigara böreği', 'pide']
    };

    // Refs
    const audioRef = useRef({});
    const navigate = useNavigate();
    // --- 2. BAŞLANGIÇ VE VERİ DİNLEME ---
    useEffect(() => {
        audioRef.current = {
            zil: new Audio('/zil.mp3'),
            alarm: new Audio('/alarm.mp3'),
            mesaj: new Audio('/message.mp3')
        };

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const qRes = query(collection(db, "restoranlar"), where("sahipEmail", "==", user.email));

                const unsubRestoran = onSnapshot(qRes, (snap) => {
                    if (!snap.empty) {
                        const resData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                        setRestoran(resData);

                        // State Doldurma
                        setProfilForm({
                            isim: resData.isim || "",
                            telefon: resData.telefon || "",
                            adres: resData.adres || "",
                            aciklama: resData.aciklama || "",
                            logo: resData.resim || "",
                            kapakResmi: resData.kapakResmi || ""
                        });

                        setCalismaSaatleri(resData.calismaSaatleri || initializeHours());
                        if (resData.otomatikMod !== undefined) setOtomatikMod(resData.otomatikMod);
                        if (resData.sesAyarlari) setSesAyarlari(resData.sesAyarlari);
                        if (resData.yogunluk) setYogunluk(resData.yogunluk);
                        if (resData.kotuHava) setKotuHava(resData.kotuHava);
                        if (resData.kampanyalar) setKampanyalar(resData.kampanyalar);

                        // YENİ: Önerilen ürünleri yükle
                        if (resData.onerilenUrunler) setOnerilenUrunler(resData.onerilenUrunler);

                        setLoading(false);

                        // ✅ YENİ: Admin bölgelerini dinle
                        const unsubBolgeler = onSnapshot(doc(db, "bolgeler", "turkiye"), (snapshot) => {
                            if (snapshot.exists()) {
                                setAdminBolgeler(snapshot.data());
                            } else {
                                setAdminBolgeler({});
                            }
                        }, (error) => {
                            console.error("Bölgeler yüklenemedi:", error);
                            setAdminBolgeler({});
                        });

                        // Sipariş Dinleme
                        const qSip = query(collection(db, "siparisler"), where("restoranId", "==", resData.id));
                        const unsubSiparis = onSnapshot(qSip, (s) => {
                            const gelen = s.docs.map(d => ({ id: d.id, ...d.data() }));
                            gelen.sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0));
                            setSiparisler(gelen);
                            hesaplaFinans(gelen);
                        });

                        // Yemek Dinleme
                        const qMenu = query(collection(db, "yemekler"), where("restoranId", "==", resData.id));
                        const unsubMenu = onSnapshot(qMenu, (s) => setYemekler(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                        return () => {
                            unsubBolgeler(); // ✅ Bölge listener'ını temizle
                            unsubSiparis();
                            unsubMenu();
                        };

                    } else {
                        alert("Restoran kaydı bulunamadı! Lütfen yönetici ile iletişime geçin.");
                        navigate("/login");
                    }
                });
                return () => unsubRestoran();
            } else {
                navigate("/login");
            }
        });
        return () => unsubAuth();
    }, [navigate]);

    const initializeHours = () => {
        const sablon = {};
        GUNLER.forEach(gun => { sablon[gun] = { acilis: "09:00", kapanis: "22:00", kapali: false }; });
        return sablon;
    };

    const hesaplaFinans = (veriler) => {
        const bugun = new Date();
        const teslimEdilenler = veriler.filter(x => x.durum === "Teslim Edildi");

        const gunluk = teslimEdilenler
            .filter(x => new Date(x.tarih?.seconds * 1000).getDate() === bugun.getDate())
            .reduce((t, i) => t + (Number(i.toplamTutar) || 0), 0);

        const toplam = teslimEdilenler.reduce((t, i) => t + (Number(i.toplamTutar) || 0), 0);

        const iptaller = veriler.filter(x => ["İptal Edildi", "İade Edildi"].includes(x.durum)).length;
        const oran = veriler.length > 0 ? ((iptaller / veriler.length) * 100).toFixed(1) : 0;

        setFinansOzet({ gunlukCiro: gunluk, aylikCiro: toplam, toplamSiparis: veriler.length, iptalOrani: oran });
        setGunlukCiro(gunluk);
        setBekleyenSayisi(veriler.filter(x => x.durum === "Onay Bekliyor").length);
    };

    // --- 3. OTOMASYON MOTORU ---
    useEffect(() => {
        if (!restoran || !otomatikMod) return;

        const interval = setInterval(() => {
            const simdi = new Date();
            const gunIndex = (simdi.getDay() + 6) % 7;
            const bugunIsim = GUNLER[gunIndex];
            const ayar = calismaSaatleri[bugunIsim];

            // ✅ GÜVENLİK KONTROLÜ: Ayar var mı, kapalı değil mi, ve saat bilgileri tanımlı mı?
            if (!ayar || ayar.kapali || !ayar.acilis || !ayar.kapanis) return;

            // ✅ Güvenli split işlemi
            const [kapanisSaat, kapanisDakika] = ayar.kapanis.split(':').map(Number);
            const suankiDakika = simdi.getHours() * 60 + simdi.getMinutes();
            const kapanisTopDakika = kapanisSaat * 60 + kapanisDakika;

            const [acilisSaat, acilisDakika] = ayar.acilis.split(':').map(Number);
            const acilisTopDakika = acilisSaat * 60 + acilisDakika;

            // Açılış saati kontrolü
            if (suankiDakika >= acilisTopDakika && suankiDakika < kapanisTopDakika && !restoran.acikMi) {
                dukkanDurumGuncelle("acikMi", true);
                if (sesAyarlari.alarm) {
                    audioRef.current.alarm.play().catch(() => { });
                    setTimeout(() => audioRef.current.alarm.pause(), 3000);
                }
            }

            // Kapanış uyarısı
            if (suankiDakika === kapanisTopDakika && restoran.acikMi && !kapanisUyarisiAktif) {
                setKapanisUyarisiAktif(true);
                setKapanisSayac(30);
                if (sesAyarlari.alarm) audioRef.current.alarm.play().catch(() => { });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [restoran, calismaSaatleri, otomatikMod, kapanisUyarisiAktif, sesAyarlari]);

    useEffect(() => {
        let timer;
        if (kapanisUyarisiAktif && kapanisSayac > 0) {
            timer = setInterval(() => setKapanisSayac(prev => prev - 1), 1000);
        } else if (kapanisUyarisiAktif && kapanisSayac === 0) {
            dukkanKapatOtomatik();
        }
        return () => clearInterval(timer);
    }, [kapanisUyarisiAktif, kapanisSayac]);

    const dukkanKapatOtomatik = async () => {
        setKapanisUyarisiAktif(false);
        if (audioRef.current.alarm) audioRef.current.alarm.pause();

        const yolda = siparisler.filter(s => ["Hazırlanıyor", "Yolda"].includes(s.durum));
        if (yolda.length > 0) alert(`⚠️ Dükkan kapandı ancak ${yolda.length} aktif sipariş var!`);

        await updateDoc(doc(db, "restoranlar", restoran.id), { acikMi: false });
    };

    const mesaiUzat = async () => {
        setKapanisUyarisiAktif(false);
        if (audioRef.current.alarm) audioRef.current.alarm.pause();

        const simdi = new Date();
        const gunIndex = (simdi.getDay() + 6) % 7;
        const bugunIsim = GUNLER[gunIndex];
        const mevcutAyar = calismaSaatleri[bugunIsim];

        // ✅ GÜVENLİK KONTROLÜ
        if (!mevcutAyar || !mevcutAyar.kapanis) {
            alert("❌ Çalışma saati bilgisi eksik!");
            return;
        }

        const mevcutKapanis = mevcutAyar.kapanis;

        let [saat, dakika] = mevcutKapanis.split(':').map(Number);
        let toplamDakika = saat * 60 + dakika + 30;
        let yeniSaat = Math.floor(toplamDakika / 60) % 24;
        let yeniDakika = toplamDakika % 60;

        const yeniSaatStr = `${yeniSaat.toString().padStart(2, '0')}:${yeniDakika.toString().padStart(2, '0')}`;
        const yeniProgram = {
            ...calismaSaatleri,
            [bugunIsim]: {
                ...calismaSaatleri[bugunIsim],
                kapanis: yeniSaatStr
            }
        };

        setCalismaSaatleri(yeniProgram);
        await updateDoc(doc(db, "restoranlar", restoran.id), { calismaSaatleri: yeniProgram });
        alert(`✅ Mesai 30 dakika uzatıldı. Yeni kapanış: ${yeniSaatStr}`);
    };

    // --- 4. SES TETİKLEYİCİSİ (DÜZELTİLMİŞ) ---
    const oncekiBekleyenRef = useRef(new Set());

    useEffect(() => {
        const bekleyenler = siparisler.filter(s => s.durum === "Onay Bekliyor");
        const bekleyenIdler = new Set(bekleyenler.map(s => s.id));

        // Yeni gelen siparişleri tespit et (önceki listede olmayan)
        const yeniSiparisVar = bekleyenler.some(s => !oncekiBekleyenRef.current.has(s.id));

        if (bekleyenler.length > 0 && sesAyarlari.zil) {
            // Sadece YENİ sipariş geldiyse ses çal
            if (yeniSiparisVar) {
                audioRef.current.zil.loop = true; // Sürekli çalsın
                audioRef.current.zil.play().catch(() => { });
            }
        } else {
            // Bekleyen sipariş kalmadıysa sesi DURDUR
            if (audioRef.current.zil) {
                audioRef.current.zil.pause();
                audioRef.current.zil.currentTime = 0;
                audioRef.current.zil.loop = false;
            }
        }

        // Mevcut bekleyenleri kaydet (bir sonraki karşılaştırma için)
        oncekiBekleyenRef.current = bekleyenIdler;

    }, [siparisler, sesAyarlari.zil]);

    // --- CHAT DİNLEME ---
    useEffect(() => {
        if (!aktifChatSiparis) return;
        const unsubMsg = onSnapshot(
            query(collection(db, "siparisler", aktifChatSiparis.id, "mesajlar"), orderBy("tarih", "asc")),
            (s) => setChatMesajlari(s.docs.map(d => d.data()))
        );
        return () => unsubMsg();
    }, [aktifChatSiparis]);
    // --- HANDLERLAR ---

    const profilKaydet = async () => {
        if (!profilForm.telefon) return alert("❌ Telefon numarası zorunludur!");
        await updateDoc(doc(db, "restoranlar", restoran.id), profilForm);
        alert("✅ Profil başarıyla güncellendi.");
    };

    const urunKaydet = async (e) => {
        e.preventDefault();
        const veri = {
            restoranId: restoran.id,
            ad: urunForm.ad,
            fiyat: Number(urunForm.fiyat),
            aciklama: urunForm.aciklama,
            kategori: urunForm.kategori,
            resim: urunForm.resim,
            secenekler: urunForm.secenekler,
            allerjenler: urunForm.allerjenler,  // ✅ YENİ
            stokta: true,  // ✅ YENİ - Varsayılan olarak stokta
            aktif: true
        };

        if (duzenlemeModu) {
            await updateDoc(doc(db, "yemekler", duzenlemeModu), veri);
            alert("Ürün güncellendi.");
            setDuzenlemeModu(null);
        } else {
            await addDoc(collection(db, "yemekler"), veri);
            alert("Ürün eklendi.");
        }
        setUrunForm({ ad: "", fiyat: "", aciklama: "", kategori: "Genel", resim: "", secenekler: [], allerjenler: [] });
    };

    const urunDuzenle = (urun) => {
        setDuzenlemeModu(urun.id);
        setUrunForm({
            ad: urun.ad, fiyat: urun.fiyat, aciklama: urun.aciklama || "",
            kategori: urun.kategori || "Genel", resim: urun.resim || "",
            secenekler: urun.secenekler || [],
            allerjenler: urun.allerjenler || []  // ✅ YENİ
        });
        setAktifSayfa("yemek-ekle");
    };

    // ✅ YENİ: Stok durumu değiştirme
    const stokDurumuDegistir = async (urunId, mevcutDurum) => {
        try {
            await updateDoc(doc(db, "yemekler", urunId), {
                stokta: !mevcutDurum
            });
        } catch (error) {
            console.error("Stok durumu güncellenemedi:", error);
            alert("Hata: " + error.message);
        }
    };

    const secenekEkle = () => {
        if (!yeniSecenek.ad) return;
        setUrunForm(prev => ({ ...prev, secenekler: [...prev.secenekler, { ...yeniSecenek, fiyat: Number(yeniSecenek.fiyat) }] }));
        setYeniSecenek({ ad: "", fiyat: 0 });
    };

    // 🏷️ OTOMATİK KATEGORİ TESPİTİ
    const otomatikKategoriTespit = (urunAdi) => {
        if (!urunAdi) return null;

        const kucukAd = urunAdi.toLowerCase().trim();

        for (const [kategori, anahtarlar] of Object.entries(KATEGORI_ANAHTAR_KELIMELER)) {
            for (const anahtar of anahtarlar) {
                if (kucukAd.includes(anahtar.toLowerCase())) {
                    return kategori;
                }
            }
        }

        return null;
    };

    // 📦 TOPLU FİYAT GÜNCELLEME
    const topluFiyatGuncelle = async () => {
        const hedefUrunler = seciliKategori === 'Tümü'
            ? yemekler
            : yemekler.filter(y => y.kategori === seciliKategori);

        if (hedefUrunler.length === 0) {
            return alert("Güncellenecek ürün bulunamadı!");
        }

        const onay = window.confirm(
            `${hedefUrunler.length} ürüne %${topluGuncellemeOran} ${topluGuncellemeTip === 'zam' ? 'ZAM' : 'İNDİRİM'} uygulanacak.\n\nDevam edilsin mi?`
        );

        if (!onay) return;

        try {
            const carpan = topluGuncellemeTip === 'zam'
                ? (1 + topluGuncellemeOran / 100)
                : (1 - topluGuncellemeOran / 100);

            for (const urun of hedefUrunler) {
                const yeniFiyat = Math.round(urun.fiyat * carpan * 100) / 100;
                await updateDoc(doc(db, "yemekler", urun.id), {
                    fiyat: yeniFiyat,
                    sonFiyatGuncelleme: serverTimestamp(),
                    eskiFiyat: urun.fiyat
                });
            }

            alert(`✅ ${hedefUrunler.length} ürün başarıyla güncellendi!`);
            setTopluGuncellemeModal(false);
        } catch (error) {
            console.error("Toplu güncelleme hatası:", error);
            alert("❌ Hata: " + error.message);
        }
    };

    // ⏱️ TAHMİNİ TESLİMAT SÜRESİ HESAPLAMA
    const getETA = () => {
        let { minSure, maxSure } = etaAyarlari;

        if (etaAyarlari.yogunlukEtkisi) {
            if (yogunluk === 'Yoğun') {
                minSure += 15;
                maxSure += 20;
            } else if (yogunluk === 'Kötü Hava') {
                minSure += 10;
                maxSure += 15;
            }
        }

        const bekleyenEtkisi = Math.floor(bekleyenSayisi / 3) * 5;
        minSure += bekleyenEtkisi;
        maxSure += bekleyenEtkisi;

        return { min: minSure, max: maxSure };
    };

    // 📝 ETA'YI SİPARİŞE KAYDET
    const siparisOnayla = async (siparisId) => {
        const eta = getETA();
        const tahminiTeslim = new Date();
        tahminiTeslim.setMinutes(tahminiTeslim.getMinutes() + eta.max);

        await updateDoc(doc(db, "siparisler", siparisId), {
            durum: "Hazırlanıyor",
            sonGuncelleme: serverTimestamp(),
            tahminiTeslim: tahminiTeslim,
            etaMin: eta.min,
            etaMax: eta.max
        });

        const siparis = siparisler.find(s => s.id === siparisId);
        if (siparis) {
            try {
                await siparisDurumEmaili(siparis, "Hazırlanıyor");
            } catch (e) {
                console.error("Email hatası:", e);
            }
        }
    };

    const durumGuncelle = async (id, yeniDurum) => {
        const siparis = siparisler.find(s => s.id === id);

        // 🆕 Eğer "Hazırlanıyor" durumuna geçiliyorsa ETA ekle
        if (yeniDurum === "Hazırlanıyor" && siparis?.durum === "Onay Bekliyor") {
            await siparisOnayla(id);
            return;
        }

        // Durumu güncelle
        await updateDoc(doc(db, "siparisler", id), {
            durum: yeniDurum,
            sonGuncelleme: serverTimestamp()
        });

        // 📧 DURUM DEĞİŞİKLİĞİ EMAİLİ GÖNDER
        if (siparis && ['Hazırlanıyor', 'Yolda', 'Teslim Edildi', 'İptal Edildi'].includes(yeniDurum)) {
            try {
                await siparisDurumEmaili(siparis, yeniDurum);

            } catch (emailError) {
                console.error('Email gönderilemedi:', emailError);
            }
        }

        // ⭐ TESLİM EDİLDİĞİNDE PUAN KAZANDIRMA
        if (yeniDurum === "Teslim Edildi" && siparis?.musteriId) {
            try {
                await puanKazandir(siparis);

            } catch (puanError) {
                console.error('Puan kazandırılamadı:', puanError);
            }
        }
    };

    // ⭐ PUAN KAZANDIRMA FONKSİYONU
    const puanKazandir = async (siparis) => {
        const { musteriId, toplamTutar } = siparis;

        if (!musteriId) {
            console.warn("Müşteri ID bulunamadı, puan kazandırılamadı");
            return;
        }

        // Müşteri bilgilerini al
        const musteriRef = doc(db, "kullanicilar", musteriId);
        const musteriDoc = await getDoc(musteriRef);

        if (!musteriDoc.exists()) {
            console.warn("Müşteri dökümanı bulunamadı");
            return;
        }

        const musteriData = musteriDoc.data();

        // ✅ TUTARLI ALAN ADLARI - Profil.js ile aynı
        const mevcutPuan = musteriData.puanBakiye || musteriData.puanlar || 0;
        const mevcutToplamKazanilan = musteriData.toplamKazanilanPuan || 0;
        const mevcutStreak = musteriData.streakSayisi || musteriData.streak || 0;

        // 💰 PUAN HESAPLAMA: Her 1₺ = 1 puan
        let kazanilanPuan = Math.floor(Number(toplamTutar) || 0);

        // 🔥 STREAK HESAPLAMA
        const bugun = new Date();
        const sonSiparisTarihi = musteriData.sonSiparisTarihi?.toDate?.() || null;

        let yeniStreak = 1;

        if (sonSiparisTarihi) {
            const gunFarki = Math.floor((bugun - sonSiparisTarihi) / (1000 * 60 * 60 * 24));

            if (gunFarki <= 7) {
                // Son 7 gün içinde sipariş verdiyse streak devam
                yeniStreak = mevcutStreak + 1;
            } else {
                // 7 günden fazla ara verdiyse streak sıfırlanır
                yeniStreak = 1;
            }
        }

        // 🎁 STREAK BONUSU: Her 5 siparişte %50 bonus puan
        let bonusPuan = 0;

        if (yeniStreak % 5 === 0) {
            bonusPuan = Math.floor(kazanilanPuan * 0.5); // %50 bonus

        }

        // Toplam kazanılan puan
        const toplamKazanilan = kazanilanPuan + bonusPuan;

        // ✅ TUTARLI ALAN ADLARI İLE KAYDET
        await updateDoc(musteriRef, {
            puanBakiye: mevcutPuan + toplamKazanilan,           // ✅ Profil.js ile aynı
            toplamKazanilanPuan: mevcutToplamKazanilan + toplamKazanilan, // ✅
            streakSayisi: yeniStreak,                           // ✅
            sonSiparisTarihi: serverTimestamp()
        });

        // 📊 Siparişe de puan bilgisini ekle (geçmişte görünsün)
        await updateDoc(doc(db, "siparisler", siparis.id), {
            kazanilanPuan: toplamKazanilan,
            bonusPuan: bonusPuan
        });


    };

    const siparisIptalEt = async (id) => {
        const sebep = window.prompt("İptal Sebebi (Zorunlu):");
        if (!sebep) return alert("Sebep girmeden iptal edemezsiniz.");
        await updateDoc(doc(db, "siparisler", id), { durum: "İptal Edildi", iptalSebebi: sebep, sonGuncelleme: serverTimestamp() });
    };

    const kampanyaKaydet = async () => {
        if (!yeniKampanya.baslik) return alert("Başlık giriniz.");
        const kampanyaObj = {
            ...yeniKampanya,
            deger: Number(yeniKampanya.deger),
            minSepet: Number(yeniKampanya.minSepet),
            eskiFiyat: Number(yeniKampanya.eskiFiyat || 0)
        };
        const guncel = [...(restoran.kampanyalar || []), kampanyaObj];
        await updateDoc(doc(db, "restoranlar", restoran.id), { kampanyalar: guncel });
        setKampanyalar(guncel);
        setYeniKampanya({ baslik: "", tip: "yuzde", deger: 0, minSepet: 0, hedefUrunler: [], eskiFiyat: 0, aktif: true });
        alert("Kampanya oluşturuldu.");
    };

    // ✅ YENİ: Bölge Ekleme Fonksiyonu (Admin bölgelerinden seçim)
    const bolgeEkle = async () => {
        if (!seciliSehir || !seciliIlce || !seciliMahalle) {
            return alert("❌ Lütfen şehir, ilçe ve mahalle seçin!");
        }
        if (!minSepetTutari || Number(minSepetTutari) <= 0) {
            return alert("❌ Minimum sepet tutarı 0'dan büyük olmalıdır!");
        }

        // Seçili bölgenin gerçek adlarını bul
        const sehirAd = adminBolgeler[seciliSehir]?.ad;
        const ilceAd = adminBolgeler[seciliSehir]?.ilceler?.[seciliIlce]?.ad;
        const mahalleAd = seciliMahalle; // Mahalle zaten string olarak geliyor

        const yeniBolge = {
            sehir: sehirAd,
            ilce: ilceAd,
            mahalle: mahalleAd,
            minSepet: Number(minSepetTutari)
        };

        // Aynı mahalle daha önce eklendi mi kontrol et
        const mevcutBolgeler = restoran.bolgeler || [];
        const kontrolVar = mevcutBolgeler.some(
            b => b.sehir === sehirAd && b.ilce === ilceAd && b.mahalle === mahalleAd
        );

        if (kontrolVar) {
            return alert("⚠️ Bu mahalle zaten eklenmiş!");
        }

        try {
            await updateDoc(doc(db, "restoranlar", restoran.id), {
                bolgeler: arrayUnion(yeniBolge)
            });

            // Form'u temizle
            setSeciliSehir("");
            setSeciliIlce("");
            setSeciliMahalle("");
            setMinSepetTutari("");

            alert("✅ Bölge başarıyla eklendi!");
        } catch (error) {
            console.error("Bölge eklenemedi:", error);
            alert("❌ Bir hata oluştu!");
        }
    };

    const ayarlariKaydet = async () => {
        await updateDoc(doc(db, "restoranlar", restoran.id), {
            calismaSaatleri: calismaSaatleri,
            otomatikMod: otomatikMod,
            sesAyarlari: sesAyarlari
        });
        alert("✅ Ayarlar kaydedildi.");
    };

    const dukkanDurumGuncelle = async (alan, deger) => {
        await updateDoc(doc(db, "restoranlar", restoran.id), { [alan]: deger });
        if (alan === 'kotuHava') setKotuHava(deger);
        if (alan === 'yogunluk') setYogunluk(deger);
        if (alan === 'otomatikMod') setOtomatikMod(deger);
    };

    // YENİ: Yoğunluk durumu güncelleme (geliştirilmiş)
    const yogunlukGuncelle = async (yeniDurum) => {
        setYogunluk(yeniDurum);

        // Kötü Hava durumu da buna bağlı
        const kotuHavaDurum = yeniDurum === "Kötü Hava";
        setKotuHava(kotuHavaDurum);

        await updateDoc(doc(db, "restoranlar", restoran.id), {
            yogunluk: yeniDurum,
            kotuHava: kotuHavaDurum
        });
    };

    // YENİ: Önerilen ürün toggle
    const onerilenUrunToggle = async (urunId) => {
        let yeniListe;
        if (onerilenUrunler.includes(urunId)) {
            yeniListe = onerilenUrunler.filter(id => id !== urunId);
        } else {
            if (onerilenUrunler.length >= 6) {
                return alert("En fazla 6 ürün seçebilirsiniz!");
            }
            yeniListe = [...onerilenUrunler, urunId];
        }
        setOnerilenUrunler(yeniListe);
        await updateDoc(doc(db, "restoranlar", restoran.id), { onerilenUrunler: yeniListe });
    };

    // Chat
    const chatAc = (s) => { setAktifChatSiparis(s); setChatModalAcik(true); };
    const mesajGonder = async (e) => {
        e.preventDefault();
        if (!yeniMesaj.trim()) return;
        await addDoc(collection(db, "siparisler", aktifChatSiparis.id, "mesajlar"), { gonderen: "Restoran", mesaj: yeniMesaj, tarih: serverTimestamp() });
        setYeniMesaj("");
    };

    // Destek
    const sikayetGonder = async () => {
        if (!sikayetMetni.trim()) return alert("Mesaj yazın.");
        await addDoc(collection(db, "destek_talepleri"), { restoranId: restoran.id, kimden: restoran.isim, telefon: restoran.telefon || "Yok", konu: sikayetMetni, durum: "Bekliyor", tarih: new Date(), tur: "restoran" });
        alert("İletildi."); setSikayetMetni("");
    };

    // ===== GELİŞTİRİLMİŞ FİŞ YAZDIRMA =====
    const fisYazdir = (s) => {
        // Fiş HTML içeriği
        const fisHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Sipariş Fişi - #${s.id.slice(-5).toUpperCase()}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace; 
          padding: 20px; 
          max-width: 300px; 
          margin: 0 auto;
          font-size: 12px;
          line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
        .header h1 { font-size: 18px; margin-bottom: 5px; }
        .header p { font-size: 11px; color: #666; }
        .info { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .info-label { font-weight: bold; }
        .items { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
        .item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dotted #ccc; }
        .item:last-child { border-bottom: none; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; }
        .item-extras { font-size: 10px; color: #666; margin-top: 2px; padding-left: 15px; }
        .totals { margin-bottom: 15px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .total-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
        .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; }
        .note { background: #f5f5f5; padding: 8px; margin: 10px 0; border-radius: 4px; font-size: 11px; }
        .note-title { font-weight: bold; margin-bottom: 4px; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🍽️ ${restoran.isim}</h1>
        <p>${restoran.telefon || ''}</p>
        <p>${restoran.adres || ''}</p>
      </div>

      <div class="info">
        <div class="info-row">
          <span class="info-label">Sipariş No:</span>
          <span>#${s.id.slice(-5).toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarih:</span>
          <span>${s.tarih?.seconds ? new Date(s.tarih.seconds * 1000).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR')}</span>
        </div>
      <div class="info">
        <div class="info-row">
          <span class="info-label">Müşteri:</span>
          <span>${s.musteriAd || 'Misafir'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ödeme:</span>
          <span>${s.odemeYontemi || 'Nakit'}</span>
        </div>
      </div>

      <!-- ✅ YENİ: Telefon Bilgileri Bölümü -->
      <div class="info">
        <div class="info-label" style="margin-bottom: 5px;">📞 İLETİŞİM BİLGİLERİ</div>
        ${s.musteriTelefon ? `
          <div class="info-row">
            <span>Müşteri Telefonu:</span>
            <span>${s.musteriTelefon.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4').slice(0, 12)}</span>
          </div>
        ` : ''}
        ${s.teslimatTelefon ? `
          <div class="info-row">
            <span>Teslimat Telefonu:</span>
            <span>${s.teslimatTelefon.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4').slice(0, 12)}</span>
          </div>
        ` : ''}
        ${s.teslimatKisi ? `
          <div class="info-row">
            <span>Teslim Alacak:</span>
            <span>${s.teslimatKisi}</span>
          </div>
        ` : ''}
        ${!s.musteriTelefon && !s.teslimatTelefon ? `
          <div style="color: #999; font-size: 11px;">Telefon bilgisi kayıtlı değil</div>
        ` : ''}
      </div>

      <div class="info">
        <div class="info-label" style="margin-bottom: 5px;">📍 Teslimat Adresi:</div>
        <div>${s.adres || 'Adres belirtilmemiş'}</div>
      </div>

      ${s.not ? `
        <div class="note">
          <div class="note-title">📝 Müşteri Notu:</div>
          <div>${s.not}</div>
        </div>
      ` : ''}

      <div class="items">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">📦 Sipariş Detayı</div>
        ${s.yemekler?.map(y => `
          <div class="item">
            <div class="item-header">
              <span>${y.adet}x ${y.ad}</span>
              <span>${(y.fiyat * y.adet).toFixed(2)} ₺</span>
            </div>
            ${y.secilenOpsiyonlar && y.secilenOpsiyonlar.length > 0 ? `
              <div class="item-extras">+ ${y.secilenOpsiyonlar.join(', ')}</div>
            ` : ''}
          </div>
        `).join('') || '<div>Ürün bilgisi yok</div>'}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Ara Toplam:</span>
          <span>${s.araToplam || s.toplamTutar} ₺</span>
        </div>
        ${s.teslimatUcreti > 0 ? `
          <div class="total-row">
            <span>Teslimat:</span>
            <span>+${s.teslimatUcreti} ₺</span>
          </div>
        ` : ''}
        ${s.indirim > 0 ? `
          <div class="total-row" style="color: green;">
            <span>İndirim${s.kampanya ? ` (${s.kampanya})` : ''}:</span>
            <span>-${s.indirim} ₺</span>
          </div>
        ` : ''}
        <div class="total-row grand">
          <span>TOPLAM:</span>
          <span>${s.toplamTutar} ₺</span>
        </div>
      </div>

      <div class="footer">
        <p>Afiyet olsun! 🍴</p>
        <p style="margin-top: 5px;">Bizi tercih ettiğiniz için teşekkürler</p>
      </div>

      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 30px; font-size: 16px; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 8px; margin-right: 10px;">
          🖨️ Yazdır
        </button>
        <button onclick="window.close()" style="padding: 12px 30px; font-size: 16px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 8px;">
          ✕ Kapat
        </button>
      </div>
    </body>
    </html>
  `;

        // Yeni pencere aç
        const printWindow = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');

        // Popup engellenmiş mi kontrol et
        if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
            // Popup engellendiyse alternatif: yeni sekmede aç
            const blob = new Blob([fisHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Kısa bir süre sonra URL'i temizle
            setTimeout(() => URL.revokeObjectURL(url), 10000);

            alert('💡 Popup engellenmiş olabilir. Yeni sekmeyi kontrol edin veya popup engelleyiciyi devre dışı bırakın.');
            return;
        }

        // İçeriği yaz
        printWindow.document.open();
        printWindow.document.write(fisHTML);
        printWindow.document.close();

        // Sayfa yüklendikten sonra odaklan
        printWindow.onload = function () {
            printWindow.focus();
        };
    };

    const getAktifSiparisler = () => {
        const simdi = new Date().getTime();
        return siparisler.filter(s => {
            if (s.durum !== "Teslim Edildi" && s.durum !== "İade Edildi" && s.durum !== "İptal Edildi") return true;
            const timeDiff = s.sonGuncelleme?.toMillis ? (simdi - s.sonGuncelleme.toMillis()) : 99999;
            return timeDiff < 30000;
        });
    };

    // Render
    if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>Yükleniyor...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: 'white', fontFamily: "'Segoe UI', sans-serif" }}>

            {/* ALARM POPUP */}
            {kapanisUyarisiAktif && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(220,38,38,0.98)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h1 style={{ fontSize: '60px' }}>⚠️ DÜKKAN KAPANIYOR!</h1>
                    <div style={{ fontSize: '120px', fontWeight: 'bold' }}>{kapanisSayac}</div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={dukkanKapatOtomatik} style={bigButtonStyle}>ŞİMDİ KAPAT</button>
                        <button onClick={mesaiUzat} style={{ ...bigButtonStyle, background: '#1e293b', color: 'white' }}>MESAİYE KAL (+30 Dk)</button>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <div style={{ width: '260px', background: '#111827', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #1f2937' }}>
                    <img src={profilForm.logo || "https://via.placeholder.com/80"} style={{ width: '80px', height: '80px', borderRadius: '15px', objectFit: 'cover', border: '2px solid #3b82f6' }} alt="Logo" />
                    <h3 style={{ margin: '10px 0', fontSize: '16px' }}>{restoran.isim}</h3>
                    <button
                        onClick={() => dukkanDurumGuncelle("acikMi", !restoran.acikMi)}
                        style={{
                            background: restoran.acikMi ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                            color: restoran.acikMi ? '#4ade80' : '#ef4444',
                            border: '1px solid currentColor',
                            padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                        {restoran.acikMi ? "● AÇIK" : "○ KAPALI"}
                    </button>
                </div>

                <div style={{ flex: 1, padding: '10px' }}>
                    <MenuItem title="Siparişler" active={acikMenu === 'Siparisler'} onClick={() => setAcikMenu('Siparisler')} badge={bekleyenSayisi} />
                    {acikMenu === 'Siparisler' && (
                        <div style={{ marginLeft: '15px', borderLeft: '2px solid #374151', paddingLeft: '10px', marginBottom: '10px' }}>
                            <SubMenuItem title="Mutfak (Aktif)" onClick={() => setAktifSayfa('mutfak')} active={aktifSayfa === 'mutfak'} />
                            <SubMenuItem title="Geçmiş & İade" onClick={() => setAktifSayfa('gecmis')} active={aktifSayfa === 'gecmis'} />
                        </div>
                    )}

                    <MenuItem title="Menü Yönetimi" active={acikMenu === 'Menu'} onClick={() => setAcikMenu('Menu')} />
                    {acikMenu === 'Menu' && (
                        <div style={{ marginLeft: '15px', borderLeft: '2px solid #374151', paddingLeft: '10px', marginBottom: '10px' }}>
                            <SubMenuItem title="Ürün Listesi" onClick={() => setAktifSayfa('yemek-liste')} active={aktifSayfa === 'yemek-liste'} />
                            <SubMenuItem title="Yeni Ürün Ekle" onClick={() => { setAktifSayfa('yemek-ekle'); setDuzenlemeModu(null); }} active={aktifSayfa === 'yemek-ekle'} />
                            <SubMenuItem title="Önerilen Ürünler" onClick={() => setAktifSayfa('onerilen-urunler')} active={aktifSayfa === 'onerilen-urunler'} />
                            <SubMenuItem title="Kampanyalar" onClick={() => setAktifSayfa('kampanyalar')} active={aktifSayfa === 'kampanyalar'} />
                        </div>
                    )}

                    <MenuItem title="Ayarlar & Profil" active={acikMenu === 'Ayarlar'} onClick={() => setAcikMenu('Ayarlar')} />
                    {acikMenu === 'Ayarlar' && (
                        <div style={{ marginLeft: '15px', borderLeft: '2px solid #374151', paddingLeft: '10px', marginBottom: '10px' }}>
                            <SubMenuItem title="Genel Ayarlar" onClick={() => setAktifSayfa('genel-ayarlar')} active={aktifSayfa === 'genel-ayarlar'} />
                            <SubMenuItem title="Mağaza Profili" onClick={() => setAktifSayfa('profil')} active={aktifSayfa === 'profil'} />
                            <SubMenuItem title="Finans" onClick={() => setAktifSayfa('finans')} active={aktifSayfa === 'finans'} />
                            <SubMenuItem title="Destek" onClick={() => setAktifSayfa('sikayet')} active={aktifSayfa === 'sikayet'} />
                        </div>
                    )}
                </div>

                <button onClick={() => signOut(auth).then(() => navigate('/login'))} style={{ margin: '20px', padding: '12px', background: '#374151', border: 'none', color: '#9ca3af', borderRadius: '8px', cursor: 'pointer' }}>Çıkış Yap</button>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>

                {/* KPI HEADER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                    <KpiCard title="Günlük Ciro" value={`${gunlukCiro} ₺`} color="#10b981" />
                    <KpiCard title="Bekleyen" value={bekleyenSayisi} color="#ef4444" />
                    <KpiCard title="Ürünler" value={yemekler.length} color="#3b82f6" />

                    {/* YENİ: Geliştirilmiş Yoğunluk Kartı */}
                    <div style={{ background: '#1f2937', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Restoran Durumu</div>
                        <select
                            value={yogunluk}
                            onChange={(e) => yogunlukGuncelle(e.target.value)}
                            style={{
                                width: '100%',
                                background: yogunluk === 'Normal' ? '#22c55e' :
                                    yogunluk === 'Yoğun' ? '#f97316' :
                                        yogunluk === 'Kötü Hava' ? '#3b82f6' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '10px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {YOGUNLUK_SECENEKLERI.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* YENİ: Yoğunluk Durumu Bilgi Kartı */}
                {yogunluk !== 'Normal' && (
                    <div style={{
                        background: yogunluk === 'Yoğun' ? 'rgba(249, 115, 22, 0.2)' :
                            yogunluk === 'Kötü Hava' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${yogunluk === 'Yoğun' ? '#f97316' : yogunluk === 'Kötü Hava' ? '#3b82f6' : '#ef4444'}`,
                        padding: '15px 20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <span style={{ fontSize: '32px' }}>
                            {yogunluk === 'Yoğun' ? '🚫' : yogunluk === 'Kötü Hava' ? '🌧️' : '⛔'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                {yogunluk === 'Yoğun' && 'Sipariş Alımı Durduruldu'}
                                {yogunluk === 'Kötü Hava' && 'Kötü Hava Modu Aktif'}
                                {yogunluk === 'Servis Dışı' && 'Restoran Servis Dışı'}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                {YOGUNLUK_SECENEKLERI.find(o => o.value === yogunluk)?.aciklama}
                            </div>
                        </div>
                        <button
                            onClick={() => yogunlukGuncelle('Normal')}
                            style={{
                                marginLeft: 'auto',
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Normal'e Dön
                        </button>
                    </div>
                )}
                {/* --- SAYFALAR --- */}

                {/* 1. MUTFAK */}
                {aktifSayfa === 'mutfak' && (
                    <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
                        {["Onay Bekliyor", "Hazırlanıyor", "Yolda"].map(durum => (
                            <div key={durum} style={{ minWidth: '320px', flex: 1, background: '#1f2937', borderRadius: '16px', padding: '15px', borderTop: `4px solid ${durum === 'Onay Bekliyor' ? '#ef4444' : '#3b82f6'}` }}>
                                <h3 style={{ textAlign: 'center', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>{durum}</h3>
                                {getAktifSiparisler().filter(s => s.durum === durum).map(s => (
                                    <SiparisKarti
                                        key={s.id}
                                        siparis={s}
                                        onUpdate={durumGuncelle}
                                        onCancel={siparisIptalEt}
                                        onChat={chatAc}
                                        onPrint={fisYazdir}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. GEÇMİŞ SİPARİŞLER */}
                {aktifSayfa === 'gecmis' && (
                    <div style={cardStyle}>
                        <h2>Geçmiş Siparişler</h2>
                        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                            <button style={{ ...btnSmall, background: '#3b82f6' }}>Son 24 Saat</button>
                            <button style={btnSmall}>Bu Hafta</button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#d1d5db' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                                    <th style={{ padding: '10px' }}>Tarih</th><th style={{ padding: '10px' }}>Müşteri</th><th style={{ padding: '10px' }}>Puan</th><th style={{ padding: '10px' }}>Tutar</th><th style={{ padding: '10px' }}>Durum</th><th style={{ padding: '10px' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {siparisler.filter(s => ['Teslim Edildi', 'İptal Edildi', 'İade Edildi'].includes(s.durum)).map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #374151' }}>
                                        <td style={{ padding: '10px' }}>{new Date(s.tarih?.seconds * 1000).toLocaleTimeString()}</td>
                                        <td style={{ padding: '10px' }}>{s.musteriAd}</td>
                                        <td style={{ padding: '10px' }}>{s.puan ? `⭐ ${s.puan}` : '-'}</td>
                                        <td style={{ padding: '10px' }}>{s.toplamTutar}₺</td>
                                        <td style={{ padding: '10px' }}><span style={{ color: s.durum === 'Teslim Edildi' ? '#4ade80' : '#ef4444' }}>{s.durum}</span></td>
                                        <td style={{ padding: '10px' }}>
                                            {s.durum === 'Teslim Edildi' && (
                                                <button onClick={() => durumGuncelle(s.id, "İade Edildi")} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>İade Al</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 3. FİNANS */}
                {aktifSayfa === 'finans' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={cardStyle}>
                            <h3>📈 Finansal Özet</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                                <div style={{ background: '#374151', padding: '15px', borderRadius: '10px' }}>
                                    <span style={{ color: '#9ca3af' }}>Aylık Toplam Ciro</span>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{finansOzet.aylikCiro} ₺</div>
                                </div>
                                <div style={{ background: '#374151', padding: '15px', borderRadius: '10px' }}>
                                    <span style={{ color: '#9ca3af' }}>İptal Oranı</span>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>%{finansOzet.iptalOrani}</div>
                                </div>
                                <div style={{ background: '#374151', padding: '15px', borderRadius: '10px' }}>
                                    <span style={{ color: '#9ca3af' }}>Toplam Sipariş</span>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{finansOzet.toplamSiparis}</div>
                                </div>
                                <div style={{ background: '#374151', padding: '15px', borderRadius: '10px' }}>
                                    <span style={{ color: '#9ca3af' }}>Hakediş (Tahmini)</span>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#facc15' }}>{(finansOzet.aylikCiro * 0.9).toFixed(2)} ₺</div>
                                </div>
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <h3>🧾 Son Gelir Hareketleri</h3>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
                                {siparisler.filter(s => s.durum === 'Teslim Edildi').slice(0, 5).map(s => (
                                    <li key={s.id} style={{ padding: '10px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Sipariş #{s.id.slice(0, 5)}</span>
                                        <span style={{ color: '#10b981' }}>+{s.toplamTutar} ₺</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* 4. PROFİL */}
                {aktifSayfa === 'profil' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto', ...cardStyle }}>
                        <h2>🏪 Mağaza Profili</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Restoran Adı</label>
                                <input value={profilForm.isim} onChange={e => setProfilForm({ ...profilForm, isim: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Telefon Numarası (Zorunlu)</label>
                                <input value={profilForm.telefon} onChange={e => setProfilForm({ ...profilForm, telefon: e.target.value })} style={inputStyle} required />
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <label style={labelStyle}>Adres</label>
                            <textarea value={profilForm.adres} onChange={e => setProfilForm({ ...profilForm, adres: e.target.value })} style={{ ...inputStyle, height: '80px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                            <div>
                                <label style={labelStyle}>Logo URL</label>
                                <input value={profilForm.logo} onChange={e => setProfilForm({ ...profilForm, logo: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Kapak Resmi URL</label>
                                <input value={profilForm.kapakResmi} onChange={e => setProfilForm({ ...profilForm, kapakResmi: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <button onClick={profilKaydet} style={btnPrimary}>BİLGİLERİ GÜNCELLE</button>
                    </div>
                )}

                {/* 5. ÜRÜN LİSTESİ */}
                {aktifSayfa === 'yemek-liste' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <h2>Ürün Listesi ({yemekler.length} ürün)</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* 💰 TOPLU FİYAT GÜNCELLEME BUTONU */}
                                <button
                                    onClick={() => setTopluGuncellemeModal(true)}
                                    style={{ ...btnSmall, background: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    💰 Toplu Fiyat
                                </button>
                                <button onClick={() => { setAktifSayfa('yemek-ekle'); setDuzenlemeModu(null); setUrunForm({ ad: "", fiyat: "", aciklama: "", kategori: "Genel", resim: "", secenekler: [], allerjenler: [] }); }} style={{ ...btnSmall, background: '#22c55e' }}>+ Yeni Ekle</button>
                            </div>
                        </div>

                        {/* Stok Durumu Özeti */}
                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            marginBottom: '20px',
                            padding: '15px',
                            background: '#374151',
                            borderRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#22c55e', fontSize: '20px' }}>●</span>
                                <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                                    Stokta: <strong style={{ color: 'white' }}>{yemekler.filter(y => y.stokta !== false).length}</strong>
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#ef4444', fontSize: '20px' }}>●</span>
                                <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                                    Tükendi: <strong style={{ color: 'white' }}>{yemekler.filter(y => y.stokta === false).length}</strong>
                                </span>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                                    <th style={{ padding: '10px' }}>Görsel</th>
                                    <th style={{ padding: '10px' }}>İsim</th>
                                    <th style={{ padding: '10px' }}>Kategori</th>
                                    <th style={{ padding: '10px' }}>Fiyat</th>
                                    <th style={{ padding: '10px' }}>Allerjenler</th>
                                    <th style={{ padding: '10px' }}>Stok</th>
                                    <th style={{ padding: '10px' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {yemekler.map(y => (
                                    <tr key={y.id} style={{
                                        borderBottom: '1px solid #374151',
                                        opacity: y.stokta === false ? 0.5 : 1,
                                        background: y.stokta === false ? 'rgba(239,68,68,0.1)' : 'transparent'
                                    }}>
                                        <td style={{ padding: '10px' }}>
                                            <img src={y.resim || "https://via.placeholder.com/40"} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="Yemek" />
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                            {y.ad}
                                            {y.stokta === false && (
                                                <span style={{
                                                    marginLeft: '8px',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    fontSize: '10px'
                                                }}>
                                                    TÜKENDİ
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{ background: '#374151', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{y.kategori}</span>
                                        </td>
                                        <td style={{ padding: '10px' }}>{y.fiyat} ₺</td>

                                        {/* Allerjenler */}
                                        <td style={{ padding: '10px' }}>
                                            {y.allerjenler?.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {y.allerjenler.slice(0, 3).map(alId => {
                                                        const allerjen = ALLERJENLER.find(a => a.id === alId);
                                                        return allerjen ? (
                                                            <span key={alId} title={allerjen.ad} style={{ fontSize: '16px' }}>
                                                                {allerjen.icon}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {y.allerjenler.length > 3 && (
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                            +{y.allerjenler.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>
                                            )}
                                        </td>

                                        {/* Stok Toggle */}
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => stokDurumuDegistir(y.id, y.stokta !== false)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '11px',
                                                    background: y.stokta !== false ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                                    color: y.stokta !== false ? '#22c55e' : '#ef4444',
                                                    transition: '0.2s'
                                                }}
                                            >
                                                {y.stokta !== false ? '✓ Stokta' : '✗ Tükendi'}
                                            </button>
                                        </td>

                                        <td style={{ padding: '10px' }}>
                                            <button onClick={() => urunDuzenle(y)} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}>Düzenle</button>
                                            <button onClick={async () => { if (window.confirm('Sil?')) await deleteDoc(doc(db, "yemekler", y.id)) }} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Sil</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* 6. GENEL AYARLAR */}
                {aktifSayfa === 'genel-ayarlar' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                        {/* Sol: Çalışma Saatleri */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3>🕒 Çalışma Saatleri</h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={otomatikMod} onChange={e => setOtomatikMod(e.target.checked)} />
                                    Otomatik Mod
                                </label>
                            </div>
                            {GUNLER.map(gun => {
                                const v = calismaSaatleri[gun] || { acilis: "09:00", kapanis: "22:00", kapali: false };
                                return (
                                    <div key={gun} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 80px', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold' }}>{gun}</span>
                                        <input type="time" value={v.acilis} onChange={e => setCalismaSaatleri(p => ({ ...p, [gun]: { ...p[gun], acilis: e.target.value } }))} style={inputStyle} disabled={!otomatikMod} />
                                        <input type="time" value={v.kapanis} onChange={e => setCalismaSaatleri(p => ({ ...p, [gun]: { ...p[gun], kapanis: e.target.value } }))} style={inputStyle} disabled={!otomatikMod} />
                                        <label style={{ fontSize: '12px' }}><input type="checkbox" checked={v.kapali} onChange={e => setCalismaSaatleri(p => ({ ...p, [gun]: { ...p[gun], kapali: e.target.checked } }))} disabled={!otomatikMod} /> Kapalı</label>
                                    </div>
                                )
                            })}
                            <button onClick={ayarlariKaydet} style={btnPrimary}>AYARLARI KAYDET</button>
                        </div>

                        {/* Sağ: Diğer Ayarlar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Ses & Bildirim */}
                            <div style={cardStyle}>
                                <h3>🔔 Ses Ayarları</h3>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={toggleLabel}><input type="checkbox" checked={sesAyarlari.zil} onChange={e => setSesAyarlari({ ...sesAyarlari, zil: e.target.checked })} /> 🎵 Sipariş Zili</label>
                                    <label style={toggleLabel}><input type="checkbox" checked={sesAyarlari.alarm} onChange={e => setSesAyarlari({ ...sesAyarlari, alarm: e.target.checked })} /> ⏰ Mesai Alarmı</label>
                                </div>
                            </div>

                            {/* ⏱️ TAHMİNİ TESLİMAT SÜRESİ AYARLARI */}
                            <div style={cardStyle}>
                                <h3>⏱️ Tahmini Teslimat Süresi (ETA)</h3>
                                <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '15px' }}>
                                    Müşterilere gösterilen tahmini teslimat süresi
                                </p>

                                {/* Mevcut ETA Gösterimi */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    textAlign: 'center',
                                    marginBottom: '20px',
                                    color: 'white'
                                }}>
                                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>
                                        Şu anki tahmini süre
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                        {getETA().min} - {getETA().max} dk
                                    </div>
                                    {yogunluk !== 'Normal' && (
                                        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                                            ⚠️ {yogunluk} durumu nedeniyle süre artırıldı
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af' }}>
                                            Minimum Süre (dk)
                                        </label>
                                        <input
                                            type="number"
                                            value={etaAyarlari.minSure}
                                            onChange={e => setEtaAyarlari({ ...etaAyarlari, minSure: Number(e.target.value) })}
                                            style={inputStyle}
                                            min="5"
                                            max="120"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af' }}>
                                            Maksimum Süre (dk)
                                        </label>
                                        <input
                                            type="number"
                                            value={etaAyarlari.maxSure}
                                            onChange={e => setEtaAyarlari({ ...etaAyarlari, maxSure: Number(e.target.value) })}
                                            style={inputStyle}
                                            min="10"
                                            max="180"
                                        />
                                    </div>
                                </div>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    padding: '12px',
                                    background: '#374151',
                                    borderRadius: '8px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={etaAyarlari.yogunlukEtkisi}
                                        onChange={e => setEtaAyarlari({ ...etaAyarlari, yogunlukEtkisi: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>Otomatik Yoğunluk Etkisi</div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            Yoğun zamanlarda süre otomatik artırılsın
                                        </div>
                                    </div>
                                </label>

                                <button
                                    onClick={async () => {
                                        await updateDoc(doc(db, "restoranlar", restoran.id), { etaAyarlari });
                                        alert("✅ ETA ayarları kaydedildi!");
                                    }}
                                    style={{ ...btnPrimary, marginTop: '15px' }}
                                >
                                    AYARLARI KAYDET
                                </button>
                            </div>

                            {/* ✅ YENİ: Geliştirilmiş Bölge Yönetimi */}
                            <div style={cardStyle}>
                                <h3>🌍 Teslimat Bölgeleri & Minimum Sepet</h3>
                                <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '15px' }}>
                                    Admin panelinden tanımlanan bölgeleri seçin ve minimum sepet tutarı belirleyin.
                                </p>

                                {/* Bölge Seçimi */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    {/* Şehir Dropdown */}
                                    <select
                                        value={seciliSehir}
                                        onChange={(e) => {
                                            setSeciliSehir(e.target.value);
                                            setSeciliIlce("");
                                            setSeciliMahalle("");
                                        }}
                                        style={inputStyle}
                                    >
                                        <option value="">Şehir Seçin</option>
                                        {Object.entries(adminBolgeler).map(([key, sehir]) => (
                                            <option key={key} value={key}>{sehir.ad}</option>
                                        ))}
                                    </select>

                                    {/* İlçe Dropdown */}
                                    <select
                                        value={seciliIlce}
                                        onChange={(e) => {
                                            setSeciliIlce(e.target.value);
                                            setSeciliMahalle("");
                                        }}
                                        style={inputStyle}
                                        disabled={!seciliSehir}
                                    >
                                        <option value="">İlçe Seçin</option>
                                        {seciliSehir && Object.entries(adminBolgeler[seciliSehir]?.ilceler || {}).map(([key, ilce]) => (
                                            <option key={key} value={key}>{ilce.ad}</option>
                                        ))}
                                    </select>

                                    {/* Mahalle Dropdown */}
                                    <select
                                        value={seciliMahalle}
                                        onChange={(e) => setSeciliMahalle(e.target.value)}
                                        style={inputStyle}
                                        disabled={!seciliIlce}
                                    >
                                        <option value="">Mahalle Seçin</option>
                                        {seciliIlce && (adminBolgeler[seciliSehir]?.ilceler?.[seciliIlce]?.mahalleler || []).map((mahalle, index) => (
                                            <option key={index} value={mahalle}>{mahalle}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Minimum Sepet Tutarı */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '10px', marginBottom: '15px' }}>
                                    <input
                                        type="number"
                                        placeholder="Minimum Sepet Tutarı (₺)"
                                        value={minSepetTutari}
                                        onChange={e => setMinSepetTutari(e.target.value)}
                                        style={inputStyle}
                                        disabled={!seciliMahalle}
                                    />
                                    <button
                                        onClick={bolgeEkle}
                                        style={{
                                            background: seciliMahalle && minSepetTutari ? '#22c55e' : '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0 20px',
                                            cursor: seciliMahalle && minSepetTutari ? 'pointer' : 'not-allowed',
                                            fontWeight: 'bold'
                                        }}
                                        disabled={!seciliMahalle || !minSepetTutari}
                                    >
                                        + Ekle
                                    </button>
                                </div>

                                {/* Bilgi Notu */}
                                {Object.keys(adminBolgeler).length === 0 && (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#fca5a5',
                                        marginBottom: '15px'
                                    }}>
                                        ⚠️ Admin henüz hiç bölge tanımlamamış. Lütfen yönetici ile iletişime geçin.
                                    </div>
                                )}

                                {/* Eklenen Bölgeler Listesi */}
                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    {(!restoran.bolgeler || restoran.bolgeler.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                            Henüz bölge eklenmemiş
                                        </div>
                                    ) : (
                                        restoran.bolgeler.map((b, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    background: '#374151',
                                                    padding: '12px 15px',
                                                    marginBottom: '8px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                                        📍 {b.mahalle}, {b.ilce}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                        {b.sehir} • Min. Sepet: <strong style={{ color: '#22c55e' }}>{b.minSepet}₺</strong>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`"${b.mahalle}" mahallesini kaldırmak istediğinize emin misiniz?`)) {
                                                            await updateDoc(doc(db, "restoranlar", restoran.id), {
                                                                bolgeler: arrayRemove(b)
                                                            });
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontSize: '20px',
                                                        cursor: 'pointer',
                                                        padding: '5px'
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* YENİ: Yoğunluk/Durum Kartı */}
                            <div style={cardStyle}>
                                <h3>📊 Restoran Durumu</h3>
                                <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
                                    {YOGUNLUK_SECENEKLERI.map(opt => (
                                        <div
                                            key={opt.value}
                                            onClick={() => yogunlukGuncelle(opt.value)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 15px',
                                                background: yogunluk === opt.value ?
                                                    (opt.value === 'Normal' ? 'rgba(34,197,94,0.2)' :
                                                        opt.value === 'Yoğun' ? 'rgba(249,115,22,0.2)' :
                                                            opt.value === 'Kötü Hava' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)')
                                                    : '#374151',
                                                border: yogunluk === opt.value ?
                                                    `2px solid ${opt.value === 'Normal' ? '#22c55e' :
                                                        opt.value === 'Yoğun' ? '#f97316' :
                                                            opt.value === 'Kötü Hava' ? '#3b82f6' : '#ef4444'}`
                                                    : '2px solid transparent',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{opt.aciklama}</div>
                                            </div>
                                            {yogunluk === opt.value && (
                                                <span style={{ color: '#22c55e', fontSize: '20px' }}>✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. MENÜ YÖNETİMİ - ÜRÜN EKLE/DÜZENLE */}
                {aktifSayfa === 'yemek-ekle' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto', ...cardStyle }}>
                        <h2>{duzenlemeModu ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
                        <form onSubmit={urunKaydet}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                {/* ÜRÜN ADI - OTOMATİK KATEGORİ ÖNERİSİ İLE */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        placeholder="Ürün Adı"
                                        value={urunForm.ad}
                                        onChange={e => {
                                            const yeniAd = e.target.value;
                                            setUrunForm({ ...urunForm, ad: yeniAd });
                                            const onerilenKategori = otomatikKategoriTespit(yeniAd);
                                            if (onerilenKategori && onerilenKategori !== urunForm.kategori) {

                                            }
                                        }}
                                        style={inputStyle}
                                        required
                                    />

                                    {/* Kategori Önerisi Baloncuğu */}
                                    {urunForm.ad && otomatikKategoriTespit(urunForm.ad) &&
                                        otomatikKategoriTespit(urunForm.ad) !== urunForm.kategori && (
                                            <div
                                                onClick={() => setUrunForm({ ...urunForm, kategori: otomatikKategoriTespit(urunForm.ad) })}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'rgba(34, 197, 94, 0.15)',
                                                    border: '1px solid #22c55e',
                                                    color: '#22c55e',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                💡 {otomatikKategoriTespit(urunForm.ad)}?
                                            </div>
                                        )}
                                </div>
                                <input type="number" placeholder="Fiyat (TL)" value={urunForm.fiyat} onChange={e => setUrunForm({ ...urunForm, fiyat: e.target.value })} style={inputStyle} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <select value={urunForm.kategori} onChange={e => setUrunForm({ ...urunForm, kategori: e.target.value })} style={inputStyle}>
                                    <option>Genel</option><option>Burger</option><option>Pizza</option><option>Döner</option><option>Tavuk</option><option>Makarna</option><option>Salata</option><option>İçecek</option><option>Tatlı</option><option>Ara Sıcak</option>
                                </select>
                                <input placeholder="Görsel URL" value={urunForm.resim} onChange={e => setUrunForm({ ...urunForm, resim: e.target.value })} style={inputStyle} />
                            </div>
                            <textarea placeholder="Açıklama" value={urunForm.aciklama} onChange={e => setUrunForm({ ...urunForm, aciklama: e.target.value })} style={{ ...inputStyle, marginBottom: '15px', height: '80px' }}></textarea>

                            {/* ✅ YENİ: ALLERJEN SEÇİMİ */}
                            <div style={{ background: '#374151', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    ⚠️ Allerjen Bilgileri
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#9ca3af' }}>
                                        İçerdiği alerjenleri işaretleyin
                                    </span>
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                                    {ALLERJENLER.map(allerjen => {
                                        const secili = urunForm.allerjenler?.includes(allerjen.id);
                                        return (
                                            <label
                                                key={allerjen.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    background: secili ? 'rgba(239,68,68,0.2)' : '#1f2937',
                                                    border: `2px solid ${secili ? '#ef4444' : 'transparent'}`,
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    transition: '0.2s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={secili}
                                                    onChange={() => {
                                                        if (secili) {
                                                            setUrunForm({
                                                                ...urunForm,
                                                                allerjenler: urunForm.allerjenler.filter(a => a !== allerjen.id)
                                                            });
                                                        } else {
                                                            setUrunForm({
                                                                ...urunForm,
                                                                allerjenler: [...(urunForm.allerjenler || []), allerjen.id]
                                                            });
                                                        }
                                                    }}
                                                    style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                                                />
                                                <span style={{ fontSize: '18px' }}>{allerjen.icon}</span>
                                                <span style={{ fontSize: '13px', color: secili ? '#fca5a5' : '#d1d5db' }}>
                                                    {allerjen.ad}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>

                                {urunForm.allerjenler?.length > 0 && (
                                    <div style={{
                                        marginTop: '15px',
                                        padding: '10px',
                                        background: 'rgba(239,68,68,0.1)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#fca5a5'
                                    }}>
                                        ⚠️ Bu üründe <strong>{urunForm.allerjenler.length}</strong> allerjen bulunuyor
                                    </div>
                                )}
                            </div>

                            {/* Add-on Bölümü */}
                            <div style={{ background: '#374151', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🧀 Ekstra Seçenekler (Add-ons)
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#9ca3af' }}>
                                        Müşteri ürüne ekleyebileceği opsiyonlar
                                    </span>
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', marginBottom: '15px' }}>
                                    <input
                                        placeholder="Seçenek Adı (Örn: Ekstra Peynir)"
                                        value={yeniSecenek.ad}
                                        onChange={e => setYeniSecenek({ ...yeniSecenek, ad: e.target.value })}
                                        style={inputStyle}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Ek Ücret (₺)"
                                        value={yeniSecenek.fiyat}
                                        onChange={e => setYeniSecenek({ ...yeniSecenek, fiyat: e.target.value })}
                                        style={inputStyle}
                                    />
                                    <button type="button" onClick={secenekEkle} style={{ background: '#22c55e', border: 'none', color: 'white', borderRadius: '8px', width: '50px', fontSize: '20px', cursor: 'pointer' }}>+</button>
                                </div>

                                {urunForm.secenekler.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                                        Henüz seçenek eklenmedi
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {urunForm.secenekler.map((s, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: '#1f2937',
                                                padding: '12px 15px',
                                                borderRadius: '8px'
                                            }}>
                                                <span>{s.ad}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>+{s.fiyat}₺</span>
                                                    <span
                                                        onClick={() => { const n = [...urunForm.secenekler]; n.splice(i, 1); setUrunForm({ ...urunForm, secenekler: n }) }}
                                                        style={{ color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                                                    >×</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {duzenlemeModu && (
                                    <button
                                        type="button"
                                        onClick={() => { setDuzenlemeModu(null); setUrunForm({ ad: "", fiyat: "", aciklama: "", kategori: "Genel", resim: "", secenekler: [] }); }}
                                        style={{ ...btnPrimary, background: '#374151', flex: 1 }}
                                    >
                                        İPTAL
                                    </button>
                                )}
                                <button type="submit" style={{ ...btnPrimary, flex: 2 }}>
                                    {duzenlemeModu ? 'GÜNCELLE' : 'ÜRÜN EKLE'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {/* YENİ: 8. ÖNERİLEN ÜRÜNLER (UPSELL) */}
                {aktifSayfa === 'onerilen-urunler' && (
                    <div style={cardStyle}>
                        <div style={{ marginBottom: '25px' }}>
                            <h2 style={{ marginBottom: '10px' }}>✨ Önerilen Ürünler (Upsell)</h2>
                            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                                Müşteri sipariş tamamlamadan önce gösterilecek ürünleri seçin.
                                Bu ürünler "Bunları da eklemek ister misiniz?" popup'ında görünecek.
                            </p>
                        </div>

                        {/* Bilgi Kartı */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(147,51,234,0.2))',
                            border: '1px solid rgba(59,130,246,0.3)',
                            padding: '15px 20px',
                            borderRadius: '12px',
                            marginBottom: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px'
                        }}>
                            <span style={{ fontSize: '28px' }}>💡</span>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>İpucu</div>
                                <div style={{ fontSize: '13px', color: '#d1d5db' }}>
                                    En çok satılan içecek ve tatlıları seçmeniz satışları artırabilir.
                                    En fazla <strong>6 ürün</strong> seçebilirsiniz.
                                </div>
                            </div>
                        </div>

                        {/* Seçim Sayacı */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            padding: '10px 15px',
                            background: '#374151',
                            borderRadius: '10px'
                        }}>
                            <span>Seçili Ürün Sayısı</span>
                            <span style={{
                                background: onerilenUrunler.length >= 6 ? '#ef4444' : '#22c55e',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontWeight: 'bold'
                            }}>
                                {onerilenUrunler.length} / 6
                            </span>
                        </div>

                        {/* Ürün Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {yemekler.map(urun => {
                                const secili = onerilenUrunler.includes(urun.id);
                                return (
                                    <div
                                        key={urun.id}
                                        onClick={() => onerilenUrunToggle(urun.id)}
                                        style={{
                                            background: secili ? 'rgba(34,197,94,0.15)' : '#374151',
                                            border: `2px solid ${secili ? '#22c55e' : 'transparent'}`,
                                            borderRadius: '12px',
                                            padding: '15px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        {secili && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                background: '#22c55e',
                                                color: 'white',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px'
                                            }}>✓</div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img
                                                src={urun.resim || "https://via.placeholder.com/50"}
                                                alt={urun.ad}
                                                style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{urun.ad}</div>
                                                <div style={{ fontSize: '13px', color: '#9ca3af' }}>{urun.kategori}</div>
                                                <div style={{ color: '#22c55e', fontWeight: 'bold', marginTop: '4px' }}>{urun.fiyat} ₺</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {yemekler.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
                                <p>Henüz ürün eklenmemiş. Önce menüye ürün ekleyin.</p>
                                <button
                                    onClick={() => setAktifSayfa('yemek-ekle')}
                                    style={{ ...btnSmall, background: '#3b82f6', marginTop: '10px' }}
                                >
                                    + Ürün Ekle
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 9. KAMPANYALAR */}
                {aktifSayfa === 'kampanyalar' && (
                    <div style={cardStyle}>
                        <h2>🏷️ Kampanya Yönetimi</h2>
                        <div style={{ background: '#374151', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <input placeholder="Kampanya Başlığı (Örn: Efsane Cuma)" value={yeniKampanya.baslik} onChange={e => setYeniKampanya({ ...yeniKampanya, baslik: e.target.value })} style={inputStyle} />
                                <select value={yeniKampanya.tip} onChange={e => setYeniKampanya({ ...yeniKampanya, tip: e.target.value })} style={inputStyle}>
                                    {KAMPANYA_TIPLERI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <input type="number" placeholder={yeniKampanya.tip === 'yuzde' ? 'Yüzde (%)' : 'Tutar (TL)'} value={yeniKampanya.deger} onChange={e => setYeniKampanya({ ...yeniKampanya, deger: e.target.value })} style={inputStyle} />
                                <input type="number" placeholder="Min. Sepet Tutarı" value={yeniKampanya.minSepet} onChange={e => setYeniKampanya({ ...yeniKampanya, minSepet: e.target.value })} style={inputStyle} />
                            </div>

                            {yeniKampanya.tip === 'urun_bazli' && (
                                <div style={{ marginBottom: '15px', padding: '10px', background: '#1f2937', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>Hangi ürünlerde geçerli?</p>
                                    <select onChange={e => {
                                        if (!e.target.value) return;
                                        setYeniKampanya(p => ({ ...p, hedefUrunler: [...p.hedefUrunler, e.target.value] }))
                                    }} style={inputStyle}>
                                        <option value="">Ürün Seçiniz...</option>
                                        {yemekler.map(y => <option key={y.id} value={y.ad}>{y.ad}</option>)}
                                    </select>
                                    <div style={{ marginTop: '5px' }}>
                                        {yeniKampanya.hedefUrunler?.map((u, i) => <span key={i} style={{ background: '#3b82f6', fontSize: '12px', padding: '2px 8px', borderRadius: '10px', marginRight: '5px' }}>{u}</span>)}
                                    </div>
                                    <input type="number" placeholder="Eski Fiyat (Üstü Çizilecek)" value={yeniKampanya.eskiFiyat} onChange={e => setYeniKampanya({ ...yeniKampanya, eskiFiyat: e.target.value })} style={{ ...inputStyle, marginTop: '10px' }} />
                                </div>
                            )}

                            <button onClick={kampanyaKaydet} style={btnPrimary}>KAMPANYA OLUŞTUR</button>
                        </div>

                        <h3>Aktif Kampanyalar</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                            {kampanyalar?.map((k, i) => (
                                <div key={i} style={{ background: '#374151', padding: '15px', borderRadius: '10px', position: 'relative' }}>
                                    <div style={{ fontWeight: 'bold' }}>{k.baslik}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                                        Tip: {k.tip} • Değer: {k.deger}
                                        {k.minSepet > 0 && ` • Min: ${k.minSepet}₺`}
                                    </div>
                                    <button onClick={async () => {
                                        const yeni = [...kampanyalar]; yeni.splice(i, 1);
                                        await updateDoc(doc(db, "restoranlar", restoran.id), { kampanyalar: yeni });
                                        setKampanyalar(yeni);
                                    }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                </div>
                            ))}
                            {(!kampanyalar || kampanyalar.length === 0) && (
                                <div style={{ color: '#6b7280', padding: '20px', textAlign: 'center' }}>
                                    Henüz kampanya oluşturulmadı.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 10. DESTEK */}
                {aktifSayfa === 'sikayet' && (
                    <div style={cardStyle}>
                        <h2>💬 Destek & Yardım</h2>
                        <div style={{ background: '#374151', padding: '20px', borderRadius: '12px' }}>
                            <p style={{ color: '#9ca3af', marginBottom: '15px' }}>Yönetim ekibine bir sorun bildirin veya öneride bulunun.</p>
                            <textarea
                                rows="5"
                                placeholder="Mesajınız..."
                                value={sikayetMetni}
                                onChange={e => setSikayetMetni(e.target.value)}
                                style={{ ...inputStyle, marginTop: '10px', fontSize: '16px' }}
                            ></textarea>
                            <button onClick={sikayetGonder} style={btnPrimary}>GÖNDER</button>
                        </div>
                    </div>
                )}

            </div>

            {/* 💰 TOPLU FİYAT GÜNCELLEME MODALI */}
            {topluGuncellemeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1f2937',
                        borderRadius: '20px',
                        padding: '30px',
                        width: '100%',
                        maxWidth: '450px',
                        border: '1px solid #374151'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0 }}>💰 Toplu Fiyat Güncelleme</h2>
                            <button
                                onClick={() => setTopluGuncellemeModal(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}
                            >×</button>
                        </div>

                        {/* Kategori Seçimi */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '13px' }}>
                                Hangi Ürünler?
                            </label>
                            <select
                                value={seciliKategori}
                                onChange={e => setSeciliKategori(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="Tümü">Tüm Ürünler ({yemekler.length})</option>
                                {[...new Set(yemekler.map(y => y.kategori))].map(kat => (
                                    <option key={kat} value={kat}>
                                        {kat} ({yemekler.filter(y => y.kategori === kat).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* İşlem Tipi */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '13px' }}>
                                İşlem Tipi
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setTopluGuncellemeTip('zam')}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: topluGuncellemeTip === 'zam' ? '2px solid #ef4444' : '2px solid #374151',
                                        background: topluGuncellemeTip === 'zam' ? 'rgba(239,68,68,0.2)' : '#374151',
                                        color: topluGuncellemeTip === 'zam' ? '#ef4444' : '#9ca3af',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    📈 ZAM
                                </button>
                                <button
                                    onClick={() => setTopluGuncellemeTip('indirim')}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: topluGuncellemeTip === 'indirim' ? '2px solid #22c55e' : '2px solid #374151',
                                        background: topluGuncellemeTip === 'indirim' ? 'rgba(34,197,94,0.2)' : '#374151',
                                        color: topluGuncellemeTip === 'indirim' ? '#22c55e' : '#9ca3af',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    📉 İNDİRİM
                                </button>
                            </div>
                        </div>

                        {/* Oran */}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '13px' }}>
                                Oran (%)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={topluGuncellemeOran}
                                    onChange={e => setTopluGuncellemeOran(Number(e.target.value))}
                                    style={{ flex: 1, accentColor: topluGuncellemeTip === 'zam' ? '#ef4444' : '#22c55e' }}
                                />
                                <div style={{
                                    background: topluGuncellemeTip === 'zam' ? '#ef4444' : '#22c55e',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    minWidth: '80px',
                                    textAlign: 'center'
                                }}>
                                    %{topluGuncellemeOran}
                                </div>
                            </div>
                        </div>

                        {/* Önizleme */}
                        <div style={{
                            background: '#374151',
                            borderRadius: '12px',
                            padding: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px' }}>📊 Önizleme</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                                <div>
                                    <span style={{ color: '#9ca3af' }}>Örnek: 100₺ → </span>
                                    <span style={{ color: topluGuncellemeTip === 'zam' ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                                        {topluGuncellemeTip === 'zam'
                                            ? (100 * (1 + topluGuncellemeOran / 100)).toFixed(0)
                                            : (100 * (1 - topluGuncellemeOran / 100)).toFixed(0)
                                        }₺
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#9ca3af' }}>Etkilenen: </span>
                                    <span style={{ color: 'white', fontWeight: 'bold' }}>
                                        {seciliKategori === 'Tümü'
                                            ? yemekler.length
                                            : yemekler.filter(y => y.kategori === seciliKategori).length
                                        } ürün
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Butonlar */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setTopluGuncellemeModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '15px',
                                    background: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={topluFiyatGuncelle}
                                style={{
                                    flex: 2,
                                    padding: '15px',
                                    background: topluGuncellemeTip === 'zam' ? '#ef4444' : '#22c55e',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                ✅ UYGULA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT MODALI */}
            {chatModalAcik && aktifChatSiparis && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', height: '550px', borderRadius: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ background: '#3b82f6', padding: '15px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <b>{aktifChatSiparis.musteriAd}</b>
                            <button onClick={() => setChatModalAcik(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#f3f4f6' }}>
                            {chatMesajlari.map((msg, i) => (
                                <div key={i} style={{ textAlign: msg.gonderen === "Restoran" ? 'right' : 'left', marginBottom: '10px' }}>
                                    <div style={{ display: 'inline-block', padding: '10px', borderRadius: '10px', maxWidth: '80%', background: msg.gonderen === "Restoran" ? '#3b82f6' : 'white', color: msg.gonderen === "Restoran" ? 'white' : '#374151' }}>
                                        {msg.mesaj}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={mesajGonder} style={{ padding: '15px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
                            <input value={yeniMesaj} onChange={e => setYeniMesaj(e.target.value)} placeholder="Mesaj..." style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                            <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Gönder</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ALT BİLEŞENLER VE STYLES ---

const SiparisKarti = ({ siparis, onUpdate, onCancel, onChat, onPrint }) => (
    <div style={{ background: '#374151', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '10px' }}>
            <span>{siparis.musteriAd}</span>
            <span style={{ color: '#facc15' }}>{siparis.toplamTutar}₺</span>
        </div>

        {/* 🆕 ETA Gösterimi */}
        {siparis.etaMin && siparis.etaMax && (
            <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px'
            }}>
                <span style={{ color: '#60a5fa' }}>
                    ⏱️ Tahmini: {siparis.etaMin}-{siparis.etaMax} dk
                </span>
                {siparis.tahminiTeslim && (
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                        ~{new Date(siparis.tahminiTeslim.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        )}

        <div style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '10px' }}>
            {siparis.mahalle} • {siparis.adres}
        </div>

        {/* ✅ YENİ: Telefon Bilgileri */}
        <div style={{ background: '#1f2937', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
            {siparis.musteriTelefon && (
                <div style={{ marginBottom: siparis.teslimatTelefon ? '6px' : 0 }}>
                    <a href={`tel:${siparis.musteriTelefon.replace(/\D/g, '')}`} style={{ color: '#60a5fa', textDecoration: 'none', cursor: 'pointer' }}>
                        📱 {siparis.musteriTelefon}
                    </a>
                </div>
            )}
            {siparis.teslimatTelefon && (
                <div>
                    <a href={`tel:${siparis.teslimatTelefon.replace(/\D/g, '')}`} style={{ color: '#4ade80', textDecoration: 'none', cursor: 'pointer' }}>
                        📞 {siparis.teslimatTelefon}
                    </a>
                    {siparis.teslimatKisi && <span style={{ color: '#9ca3af', fontSize: '11px' }}> ({siparis.teslimatKisi})</span>}
                </div>
            )}
            {!siparis.musteriTelefon && !siparis.teslimatTelefon && (
                <span style={{ color: '#9ca3af' }}>📱 Telefon bilgisi yok</span>
            )}
        </div>

        {/* Müşteri Notu */}
        {siparis.not && (
            <div style={{ background: '#f59e0b20', color: '#f59e0b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px', fontStyle: 'italic' }}>
                📝 Not: {siparis.not}
            </div>
        )}

        {/* Teslimat Ücreti Bilgisi */}
        {siparis.teslimatUcreti > 0 && (
            <div style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '5px 8px', borderRadius: '5px', fontSize: '11px', marginBottom: '10px' }}>
                🚚 Teslimat Ücreti: +{siparis.teslimatUcreti}₺
            </div>
        )}

        <div style={{ background: '#1f2937', padding: '10px', borderRadius: '8px', marginBottom: '10px', fontSize: '13px' }}>
            {siparis.yemekler.map((y, i) => (
                <div key={i} style={{ marginBottom: i < siparis.yemekler.length - 1 ? '6px' : 0 }}>
                    <span style={{ fontWeight: 'bold' }}>{y.adet}x</span> {y.ad}
                    {y.secilenOpsiyonlar && y.secilenOpsiyonlar.length > 0 && (
                        <div style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '20px', marginTop: '2px' }}>
                            + {y.secilenOpsiyonlar.join(', ')}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Kampanya Bilgisi */}
        {siparis.kampanya && (
            <div style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '5px 8px', borderRadius: '5px', fontSize: '11px', marginBottom: '10px' }}>
                🎉 {siparis.kampanya} {siparis.indirim > 0 && `(-${siparis.indirim}₺)`}
            </div>
        )}

        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <button onClick={() => onChat(siparis)} style={{ ...btnSmall, background: '#6366f1' }}>💬</button>
            <button onClick={() => onPrint(siparis)} style={btnSmall}>🖨️</button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
            {siparis.durum !== 'Teslim Edildi' && (
                <button
                    onClick={() => onUpdate(siparis.id, siparis.durum === 'Onay Bekliyor' ? 'Hazırlanıyor' : siparis.durum === 'Hazırlanıyor' ? 'Yolda' : 'Teslim Edildi')}
                    style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {siparis.durum === 'Onay Bekliyor' ? 'ONAYLA' : siparis.durum === 'Hazırlanıyor' ? 'YOLA ÇIKAR' : 'TESLİM ET'}
                </button>
            )}
            <button onClick={() => onCancel(siparis.id)} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
    </div>
);

const MenuItem = ({ title, active, onClick, badge }) => (
    <div onClick={onClick} style={{
        padding: '12px', margin: '5px 0', borderRadius: '8px', cursor: 'pointer',
        background: active ? '#374151' : 'transparent',
        color: active ? 'white' : '#9ca3af',
        fontWeight: active ? 'bold' : 'normal',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
        {title}
        {badge > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{badge}</span>}
    </div>
);

const SubMenuItem = ({ title, active, onClick }) => (
    <div onClick={onClick} style={{
        padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
        color: active ? '#60a5fa' : '#9ca3af',
        borderLeft: active ? '2px solid #60a5fa' : '2px solid transparent'
    }}>
        {title}
    </div>
);

const KpiCard = ({ title, value, color }) => (
    <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${color}` }}>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
    </div>
);

// --- CSS STYLES ---
const cardStyle = { background: '#1f2937', padding: '25px', borderRadius: '15px', color: 'white' };
const inputStyle = { background: '#374151', border: '1px solid #4b5563', padding: '10px', borderRadius: '8px', color: 'white', width: '100%', boxSizing: 'border-box', outline: 'none' };
const btnPrimary = { background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', width: '100%', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' };
const btnSmall = { padding: '5px 10px', border: 'none', borderRadius: '5px', color: 'white', background: '#374151', cursor: 'pointer' };
const bigButtonStyle = { padding: '20px 40px', fontSize: '20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', background: 'white', color: '#1f2937' };
const toggleLabel = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: '#374151', borderRadius: '8px', flex: 1 };
const labelStyle = { display: 'block', marginBottom: '5px', color: '#9ca3af', fontSize: '13px' };

export default MagazaPaneli;