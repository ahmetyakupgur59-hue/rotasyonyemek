import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeContext } from '../App';

// --- CSS STİLLERİ ---
const styles = `
  .restoran-kart { 
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
    cursor: pointer; 
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    border-radius: 16px;
    overflow: hidden;
    position: relative;
  }
  .restoran-kart:hover { 
    transform: translateY(-6px); 
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    border-color: var(--primary);
  }
  
  .kapali-filtre { 
    filter: grayscale(100%); 
    opacity: 0.7; 
  }

  .hizmet-disi {
    opacity: 0.5;
    pointer-events: none;
    filter: grayscale(100%);
  }
  
  .kategori-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 10px 20px 20px 20px;
    scrollbar-width: none; 
  }
  .kategori-scroll::-webkit-scrollbar { display: none; } 

  .kategori-item { 
    min-width: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s; 
  }
  .ikon-kutusu {
    width: 65px;
    height: 65px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: var(--card-bg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: 0.3s;
    border: 1px solid var(--border-color);
  }
  .kategori-item:hover .ikon-kutusu { 
    transform: translateY(-3px);
    border-color: var(--primary);
    background: var(--primary);
    color: white;
  }
  .kategori-aktif .ikon-kutusu {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .hero-banner {
    background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
    color: white;
    border-radius: 24px;
    padding: 30px;
    margin: 20px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
  }
  .hero-pattern {
    position: absolute;
    top: -20px; right: -20px;
    font-size: 140px;
    opacity: 0.1;
    transform: rotate(15deg);
  }

  .header-sticky {
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 1000;
    backdrop-filter: blur(10px);
  }
  
  .dropdown-wrapper { position: relative; height: 100%; display: flex; align-items: center; }
  .dropdown-menu {
    position: absolute; 
    top: 100%; 
    right: 0; 
    background: var(--card-bg); 
    border-radius: 16px; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    width: 280px; 
    padding: 10px; 
    z-index: 999; 
    border: 1px solid var(--border-color);
    opacity: 0; 
    visibility: hidden; 
    transform: translateY(10px); 
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dropdown-wrapper:hover .dropdown-menu { 
    opacity: 1; 
    visibility: visible; 
    transform: translateY(0); 
  }
  .dropdown-item { 
    padding: 12px 16px; 
    display: flex; align-items: center; gap: 12px; 
    color: var(--text-main); font-size: 14px; 
    border-radius: 10px; transition: 0.2s; text-decoration: none; cursor: pointer; 
  }
  .dropdown-item:hover { background: var(--bg-body); color: var(--primary); }

  .sirala-select {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-main);
    font-size: 13px;
    outline: none;
    cursor: pointer;
  }

  .arama-container {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    transition: 0.3s;
  }
  .arama-container:focus-within {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    border-color: var(--primary);
  }
  .arama-input {
    background: transparent;
    color: var(--text-main);
  }

  .fav-btn {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.9);
    border-radius: 50%; width: 35px; height: 35px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 5;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: 0.2s;
  }
  .fav-btn:hover { transform: scale(1.1); }
  .fav-active { color: #ef4444; }
  .fav-inactive { color: #94a3b8; }

  .adres-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .adres-modal {
    background: var(--card-bg);
    padding: 30px;
    border-radius: 24px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    animation: modalSlideIn 0.3s ease;
  }
  @keyframes modalSlideIn {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .adres-input, .adres-select {
    width: 100%;
    padding: 14px 16px;
    background: var(--bg-body);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    border-radius: 12px;
    font-size: 14px;
    transition: 0.2s;
    box-sizing: border-box;
  }
  .adres-input:focus, .adres-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .adres-input::placeholder {
    color: var(--text-sub);
    opacity: 0.7;
  }
  .adres-row {
    display: grid;
    gap: 12px;
    margin-bottom: 12px;
  }
  .adres-row-2 { grid-template-columns: 1fr 1fr; }
  .adres-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  .input-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-sub);
    margin-bottom: 6px;
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .required-star { color: #ef4444; }

  .adres-sil-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: none;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    transition: 0.2s;
  }
  .adres-sil-btn:hover {
    background: #ef4444;
    color: white;
  }

  .adres-limit-badge {
    background: rgba(251, 191, 36, 0.15);
    color: #f59e0b;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .bolge-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .bolge-tag-sehir {
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary);
  }
  .bolge-tag-ilce {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }
  .bolge-tag-mahalle {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  /* AKILLI ARAMA */
  .arama-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    margin-top: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 1000;
    max-height: 400px;
    overflow-y: auto;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .arama-oneri-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: 0.2s;
    border-bottom: 1px solid var(--border-color);
  }
  .arama-oneri-item:last-child { border-bottom: none; }
  .arama-oneri-item:hover {
    background: var(--bg-body);
  }
  .arama-oneri-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--bg-body);
  }
  .arama-oneri-resim {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    object-fit: cover;
  }

  /* SON GÖRÜNTÜLENENLER */
  .son-goruntulenen-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 15px 20px;
    scrollbar-width: none;
  }
  .son-goruntulenen-scroll::-webkit-scrollbar { display: none; }
  .son-goruntulenen-item {
    min-width: 140px;
    background: var(--card-bg);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: 0.3s;
    flex-shrink: 0;
  }
  .son-goruntulenen-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    border-color: var(--primary);
  }

  /* POPÜLER ARAMALAR */
  .populer-arama-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-main);
  }
  .populer-arama-chip:hover {
    transform: scale(1.05);
    border-color: var(--primary);
    color: var(--primary);
  }

  /* --- MOBİL İYİLEŞTİRMELERİ --- */
  

  /* Mobil Ekran Düzenlemeleri */
  @media (max-width: 768px) {
    /* Masaüstü sepet ikonunu gizle */
    .desktop-cart-icon { display: none !important; }

    /* Adres Çubuğu Kompakt */
    .mobile-compact-address {
      max-width: 160px;
    }
    .mobile-hide-text { display: none; }
    
    /* Header İyileştirmesi */
    .header-sticky .icerik-sinirlayici {
      padding: 10px 15px !important;
    }
    
    /* Grid Düzeni Mobilde Tek Kolon */
    .sayfa-container { padding-bottom: 90px; } /* BottomNav için boşluk */
  }
`;

const MAX_ADRES_SAYISI = 5;

const BOS_ADRES = {
    baslik: "",
    adSoyad: "",
    iletisimNo: "",
    sehir: "",
    sehirKey: "",
    ilce: "",
    ilceKey: "",
    mahalle: "",
    sokak: "",
    binaNo: "",
    kat: "",
    daireNo: "",
    adresTarifi: ""
};

function AnaSayfa() {
    const [restoranlar, setRestoranlar] = useState([]);
    const [kampanyalar, setKampanyalar] = useState([]);

    const [aramaTerimi, setAramaTerimi] = useState("");
    const [seciliKategori, setSeciliKategori] = useState("Tümü");
    const [siralamaSekli, setSiralamaSekli] = useState("varsayilan");

    const { darkMode, toggleTheme } = useContext(ThemeContext);

    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isRestoran, setIsRestoran] = useState(false);
    const [adresler, setAdresler] = useState([]);
    const [seciliAdres, setSeciliAdres] = useState(null);
    const [favoriler, setFavoriler] = useState([]);

    // Sepet Toplamı İçin State (FAB Badge için)
    const [sepetAdet, setSepetAdet] = useState(0);

    // Sepet verisini localStorage'dan çek
    useEffect(() => {
        const checkSepet = () => {
            const sepet = JSON.parse(localStorage.getItem('sepet')) || [];
            const toplamAdet = sepet.reduce((acc, item) => acc + item.adet, 0);
            setSepetAdet(toplamAdet);
        };
        checkSepet();
        window.addEventListener('storage', checkSepet); // Storage değişimini dinle
        // Custom event dinleyicisi (Sepet güncellemeleri için)
        window.addEventListener('sepetGuncellendi', checkSepet);

        return () => {
            window.removeEventListener('storage', checkSepet);
            window.removeEventListener('sepetGuncellendi', checkSepet);
        };
    }, []);

    // === MERKEZİ BÖLGE YÖNETİMİ STATE'LERİ ===
    const [merkeziBolgeler, setMerkeziBolgeler] = useState({});
    const [adresModal, setAdresModal] = useState(false);
    const [yeniAdresData, setYeniAdresData] = useState({ ...BOS_ADRES });
    const [adresKaydediliyor, setAdresKaydediliyor] = useState(false);

    // --- FAZ 4: YENİ STATE'LER ---
    // Son Görüntülenenler
    const [sonGoruntuleneler, setSonGoruntuleneler] = useState([]);

    // Akıllı Arama
    const [aramaOnayDurum, setAramaOnayDurum] = useState(false);
    const [aramaOneriler, setAramaOneriler] = useState([]);

    // Popüler Aramalar (Statik + Dinamik)
    const POPULER_ARAMALAR = [
        { terim: "Burger", icon: "🍔", renk: "#f59e0b" },
        { terim: "Pizza", icon: "🍕", renk: "#ef4444" },
        { terim: "Döner", icon: "🥙", renk: "#22c55e" },
        { terim: "Tatlı", icon: "🍰", renk: "#ec4899" },
        { terim: "Kahvaltı", icon: "🍳", renk: "#8b5cf6" },
        { terim: "Tavuk", icon: "🍗", renk: "#f97316" }
    ];

    const navigate = useNavigate();

    const kategoriler = [
        { ad: "Tümü", icon: "🍽️" }, { ad: "Burger", icon: "🍔" }, { ad: "Pizza", icon: "🍕" },
        { ad: "Kebap", icon: "🌯" }, { ad: "Döner", icon: "🥙" }, { ad: "Tatlı", icon: "🍰" },
        { ad: "İçecek", icon: "🥤" }, { ad: "Çiğ Köfte", icon: "🍋" }, { ad: "Sushi", icon: "🍣" }
    ];

    // Yardımcı Fonksiyon: İsim Düzeltme (tekirdag -> Tekirdağ)
    const isimDuzelt = (isim) => {
        if (!isim) return "";
        return isim.charAt(0).toUpperCase() + isim.slice(1);
    };

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const userSnap = await getDoc(doc(db, "kullanicilar", u.uid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    if (data.rol === 'superadmin') setIsAdmin(true);
                    if (data.rol === 'restoran') setIsRestoran(true);

                    setFavoriler(data.favoriRestoranlar || []);

                    const adresList = data.adresler || [];
                    setAdresler(adresList);

                    const kayitliAdresId = localStorage.getItem('seciliAdresId');
                    const bulunan = adresList.find(a => a.id === kayitliAdresId);

                    if (bulunan) setSeciliAdres(bulunan);
                    else if (adresList.length > 0) setSeciliAdres(adresList[0]);
                }
            }
        });

        // Restoranları dinle
        const unsubRestoran = onSnapshot(collection(db, "restoranlar"), (s) => {
            const liste = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setRestoranlar(liste);

            let tumKampanyalar = [];
            liste.forEach(res => {
                if (res.kampanyalar && res.kampanyalar.length > 0) {
                    res.kampanyalar.forEach(kamp => {
                        if (kamp.aktif !== false) {
                            tumKampanyalar.push({
                                ...kamp,
                                restoranId: res.id,
                                restoranAd: res.isim,
                                // ✅ DÜZELTME: logo veya kapakResmi kullan
                                restoranResim: res.logo || res.kapakResmi || res.resim || null
                            });
                        }
                    });
                }
            });
            setKampanyalar(tumKampanyalar);
        });

        // === MERKEZİ BÖLGELERİ DİNLE (DÜZELTİLDİ: 'turkiye' dosyası) ===
        // collection yerine doc kullandık
        const unsubBolgeler = onSnapshot(doc(db, "bolgeler", "turkiye"), (docSnap) => {
            if (docSnap.exists()) {
                setMerkeziBolgeler(docSnap.data());
            } else {

                setMerkeziBolgeler({});
            }
        });

        return () => {
            unsubAuth();
            unsubRestoran();
            unsubBolgeler();
        };
    }, []);

    // --- SON GÖRÜNTÜLENENLERİ YÜKLE ---
    useEffect(() => {
        const kayitli = localStorage.getItem('sonGoruntuleneler');
        if (kayitli) {
            try {
                const parsed = JSON.parse(kayitli);
                setSonGoruntuleneler(parsed);
            } catch (e) {
                console.error("Son görüntülenenler parse edilemedi");
            }
        }
    }, []);

    // --- AKILLI ARAMA: Önerileri Hesapla ---
    useEffect(() => {
        if (!aramaTerimi || aramaTerimi.length < 2) {
            setAramaOneriler([]);
            setAramaOnayDurum(false);
            return;
        }

        const kucukArama = aramaTerimi.toLowerCase();

        // Restoran önerileri
        const restoranOneriler = restoranlar
            .filter(r =>
                r.isim?.toLowerCase().includes(kucukArama) ||
                r.kategori?.toLowerCase().includes(kucukArama)
            )
            .slice(0, 4)
            .map(r => ({
                tip: 'restoran',
                id: r.id,
                baslik: r.isim,
                altBaslik: r.kategori || 'Restoran',
                icon: '🍽️',
                resim: r.kapakResmi || r.logo,
                acikMi: r.acikMi
            }));

        // Kategori önerileri
        const kategoriOneriler = kategoriler
            .filter(k =>
                k.ad.toLowerCase().includes(kucukArama) &&
                k.ad !== "Tümü"
            )
            .slice(0, 3)
            .map(k => ({
                tip: 'kategori',
                id: k.ad,
                baslik: k.ad,
                altBaslik: 'Kategori',
                icon: k.icon
            }));

        // Popüler arama önerileri
        const populerOneriler = POPULER_ARAMALAR
            .filter(p => p.terim.toLowerCase().includes(kucukArama))
            .slice(0, 2)
            .map(p => ({
                tip: 'populer',
                id: p.terim,
                baslik: p.terim,
                altBaslik: 'Popüler Arama',
                icon: p.icon
            }));

        const tumOneriler = [...restoranOneriler, ...kategoriOneriler, ...populerOneriler];

        setAramaOneriler(tumOneriler);
        setAramaOnayDurum(tumOneriler.length > 0);

    }, [aramaTerimi, restoranlar]);

    // --- ADRES SEÇİM FONKSİYONLARI ---
    const handleAdresSecimi = (adres) => {
        setSeciliAdres(adres);
        localStorage.setItem('seciliAdresId', adres.id);
    };

    const adresModalAc = () => {
        if (adresler.length >= MAX_ADRES_SAYISI) {
            alert(`⚠️ Adres limitine ulaştınız (Maksimum ${MAX_ADRES_SAYISI} adres). Lütfen önce mevcut adreslerden birini silin.`);
            return;
        }
        setYeniAdresData({ ...BOS_ADRES });
        setAdresModal(true);
    };

    // === ŞEHIR DEĞİŞTİĞİNDE ===
    const sehirDegistir = (sehirKey) => {
        const sehirData = merkeziBolgeler[sehirKey];
        const sehirAdi = sehirData?.ad || isimDuzelt(sehirKey);

        setYeniAdresData(prev => ({
            ...prev,
            sehir: sehirAdi,
            sehirKey: sehirKey,
            ilce: '',
            ilceKey: '',
            mahalle: ''
        }));
    };

    // === İLÇE DEĞİŞTİĞİNDE ===
    const ilceDegistir = (ilceKey) => {
        const mevcutIlceler = getMevcutIlcelerDizi();
        const secilenIlceData = mevcutIlceler.find(([key]) => key === ilceKey);

        let ilceAdi = '';
        if (secilenIlceData) {
            const [key, data] = secilenIlceData;
            ilceAdi = data.ad || isimDuzelt(key);
        }

        setYeniAdresData(prev => ({
            ...prev,
            ilce: ilceAdi,
            ilceKey: ilceKey,
            mahalle: ''
        }));
    };

    // === MEVCUT İLÇELERİ GETİR (DİZİ OLARAK) ===
    const getMevcutIlcelerDizi = () => {
        if (!yeniAdresData.sehirKey) return [];
        const sehirData = merkeziBolgeler[yeniAdresData.sehirKey];
        if (!sehirData) return [];

        const hedefVeri = sehirData.ilceler ? sehirData.ilceler : sehirData;

        return Object.entries(hedefVeri).filter(([key, value]) =>
            typeof value === 'object' && value !== null
        );
    };

    // === MEVCUT MAHALLELERİ GETİR ===
    const getMevcutMahalleler = () => {
        if (!yeniAdresData.sehirKey || !yeniAdresData.ilceKey) return [];

        const sehirData = merkeziBolgeler[yeniAdresData.sehirKey];
        // Yapıya göre doğru konuma git
        const hedefVeri = sehirData.ilceler ? sehirData.ilceler : sehirData;
        const ilceData = hedefVeri[yeniAdresData.ilceKey];

        return ilceData?.mahalleler || [];
    };

    // === ADRES EKLEME (MERKEZİ BÖLGE İLE) ===
    const adresEkle = async () => {
        // Validasyon
        if (!yeniAdresData.baslik?.trim()) return alert("Adres başlığı giriniz!");
        if (!yeniAdresData.adSoyad?.trim()) return alert("Ad Soyad giriniz!");
        if (!yeniAdresData.iletisimNo?.trim()) return alert("Telefon numarası giriniz!");
        if (!yeniAdresData.sehir) return alert("Şehir seçiniz!");
        if (!yeniAdresData.ilce) return alert("İlçe seçiniz!");
        if (!yeniAdresData.mahalle) return alert("Mahalle seçiniz!");
        if (!yeniAdresData.sokak?.trim()) return alert("Sokak/Cadde giriniz!");
        if (!yeniAdresData.binaNo?.trim()) return alert("Bina numarası giriniz!");

        // Telefon format kontrolü
        const temizTelefon = yeniAdresData.iletisimNo.replace(/\s/g, '');
        if (!/^[0-9]{10,11}$/.test(temizTelefon)) {
            return alert("⚠️ Geçerli bir telefon numarası giriniz (10-11 haneli).");
        }

        if (!user) {
            navigate('/login');
            return;
        }

        setAdresKaydediliyor(true);

        try {
            const yeniAdres = {
                ...yeniAdresData,
                iletisimNo: temizTelefon,
                id: Date.now().toString(),
                olusturmaTarihi: new Date().toISOString()
            };

            await updateDoc(doc(db, "kullanicilar", user.uid), {
                adresler: arrayUnion(yeniAdres)
            });

            const yeniListe = [...adresler, yeniAdres];
            setAdresler(yeniListe);
            handleAdresSecimi(yeniAdres);

            setAdresModal(false);
            setYeniAdresData({ ...BOS_ADRES });

        } catch (error) {
            console.error("Adres kaydedilemedi:", error);
            alert("Adres kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setAdresKaydediliyor(false);
        }
    };

    // === ADRES SİLME ===
    const adresSil = async (e, adresId) => {
        e.stopPropagation();

        if (!window.confirm("Bu adresi silmek istediğinize emin misiniz?")) return;

        try {
            const silinecek = adresler.find(a => a.id === adresId);

            await updateDoc(doc(db, "kullanicilar", user.uid), {
                adresler: arrayRemove(silinecek)
            });

            const yeniListe = adresler.filter(a => a.id !== adresId);
            setAdresler(yeniListe);

            if (seciliAdres?.id === adresId) {
                if (yeniListe.length > 0) {
                    handleAdresSecimi(yeniListe[0]);
                } else {
                    setSeciliAdres(null);
                    localStorage.removeItem('seciliAdresId');
                }
            }
        } catch (error) {
            console.error("Adres silinemedi:", error);
            alert("Adres silinirken bir hata oluştu.");
        }
    };

    // === FAVORİ İŞLEMLERİ ===
    const toggleFavori = async (e, resId) => {
        e.preventDefault();
        if (!user) return navigate('/login');

        const userRef = doc(db, "kullanicilar", user.uid);
        if (favoriler.includes(resId)) {
            await updateDoc(userRef, { favoriRestoranlar: arrayRemove(resId) });
            setFavoriler(prev => prev.filter(id => id !== resId));
        } else {
            await updateDoc(userRef, { favoriRestoranlar: arrayUnion(resId) });
            setFavoriler(prev => [...prev, resId]);
        }
    };

    // --- ARAMA ÖNERİSİ SEÇİLDİĞİNDE ---
    const aramaOneriSec = (oneri) => {
        if (oneri.tip === 'restoran') {
            // Son görüntülenenlere ekle
            restoranGoruntulendi(oneri.id);
            navigate(`/restoran/${oneri.id}`);
        } else if (oneri.tip === 'kategori') {
            setSeciliKategori(oneri.baslik);
            setAramaTerimi('');
        } else if (oneri.tip === 'populer') {
            setAramaTerimi(oneri.baslik);
        }
        setAramaOnayDurum(false);
    };

    // --- RESTORAN GÖRÜNTÜLENDİ (SON GÖRÜNTÜLENENLER İÇİN) ---
    const restoranGoruntulendi = (restoranId) => {
        const restoran = restoranlar.find(r => r.id === restoranId);
        if (!restoran) return;

        const yeniKayit = {
            id: restoran.id,
            isim: restoran.isim,
            resim: restoran.kapakResmi || restoran.logo,
            kategori: restoran.kategori,
            puan: restoran.puan,
            tarih: Date.now()
        };

        // Mevcut listeyi al, bu restoranı çıkar (varsa), başa ekle
        let guncelListe = sonGoruntuleneler.filter(s => s.id !== restoranId);
        guncelListe = [yeniKayit, ...guncelListe].slice(0, 10); // Max 10 kayıt

        setSonGoruntuleneler(guncelListe);
        localStorage.setItem('sonGoruntuleneler', JSON.stringify(guncelListe));
    };

    // === DİNAMİK MİNİMUM SEPET TUTARI HESAPLAMA (GÜNCELLENMİŞ) ===
    const getMinSepetTutari = (restoran) => {
        if (!seciliAdres) return restoran.minSepet || 0;
        if (!restoran.bolgeler || restoran.bolgeler.length === 0) return restoran.minSepet || 0;

        // Yeni format: sehir, ilce, mahalle alanları ile eşleştir
        const eslesen = restoran.bolgeler.find(b =>
            b.sehir === seciliAdres.sehir &&
            b.ilce === seciliAdres.ilce &&
            b.mahalle === seciliAdres.mahalle
        );

        if (eslesen) return eslesen.minSepet || 0;

        // Eski format için fallback (sadece mahalle adı ile)
        const eskiFormatEslesen = restoran.bolgeler.find(b =>
            b.ad?.toLowerCase().trim() === seciliAdres.mahalle?.toLowerCase().trim()
        );

        return eskiFormatEslesen ? (eskiFormatEslesen.limit || eskiFormatEslesen.minSepet || 0) : (restoran.minSepet || 0);
    };

    // === TESLİMAT ÜCRETİ HESAPLAMA ===
    const getTeslimatUcreti = (restoran) => {
        if (!seciliAdres) return 0;
        if (!restoran.bolgeler || restoran.bolgeler.length === 0) return 0;

        const eslesen = restoran.bolgeler.find(b =>
            b.sehir === seciliAdres.sehir &&
            b.ilce === seciliAdres.ilce &&
            b.mahalle === seciliAdres.mahalle
        );

        return eslesen?.teslimatUcreti || 0;
    };

    // === BÖLGE KONTROLÜ (GÜNCELLENMİŞ) ===
    const isHizmetBolgesi = (restoran) => {
        if (!seciliAdres) return true;
        if (!restoran.bolgeler || restoran.bolgeler.length === 0) return true;

        // Yeni format kontrolü
        const yeniFormatEslesti = restoran.bolgeler.some(b =>
            b.sehir === seciliAdres.sehir &&
            b.ilce === seciliAdres.ilce &&
            b.mahalle === seciliAdres.mahalle
        );

        if (yeniFormatEslesti) return true;

        // Eski format için fallback
        return restoran.bolgeler.some(b =>
            b.ad?.toLowerCase().trim() === seciliAdres.mahalle?.toLowerCase().trim()
        );
    };

    // === FİLTRELEME ===
    const getFiltrelenmisRestoranlar = () => {
        let sonuc = [...restoranlar];

        if (aramaTerimi) {
            sonuc = sonuc.filter(res =>
                (res.isim || "").toLowerCase().includes(aramaTerimi.toLowerCase()) ||
                (res.kategori || "").toLowerCase().includes(aramaTerimi.toLowerCase())
            );
        }

        if (seciliKategori !== "Tümü") {
            sonuc = sonuc.filter(res => {
                const kat = (res.kategori || "").toLowerCase();
                const secilen = seciliKategori.toLowerCase();
                return kat.includes(secilen);
            });
        }

        sonuc.sort((a, b) => {
            if (a.acikMi !== b.acikMi) return a.acikMi ? -1 : 1;

            if (siralamaSekli === "puan") return (b.puan || 0) - (a.puan || 0);
            if (siralamaSekli === "sure") {
                const sureA = parseInt(a.teslimatSure) || 999;
                const sureB = parseInt(b.teslimatSure) || 999;
                return sureA - sureB;
            }
            if (siralamaSekli === "alfabetik") return a.isim.localeCompare(b.isim);
            return 0;
        });

        return sonuc;
    };

    const filtrelenmisListe = getFiltrelenmisRestoranlar();
    // === RENDER ===
    return (
        <div className="sayfa-container">
            <style>{styles}</style>

            {/* 1. HEADER (STICKY) */}
            <div className="header-sticky">
                <div className="icerik-sinirlayici" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* SOL: ADRES (MOBİL UYUMLU) */}
                    <div className="dropdown-wrapper" style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>TESLİMAT ADRESİ</span>
                            <div className="mobile-compact-address" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {seciliAdres ? seciliAdres.baslik : "Adres Seçin"}
                                </span>
                                <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
                            </div>
                            {/* Seçili adres detayı (Mobilde Gizle) */}
                            {seciliAdres && (
                                <div className="mobile-hide-text" style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                                    {seciliAdres.mahalle}, {seciliAdres.ilce}
                                </div>
                            )}
                        </div>

                        <div className="dropdown-menu" style={{ left: 0, right: 'auto', top: '60px', width: '340px' }}>
                            {/* Limit Göstergesi */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingLeft: '8px', paddingRight: '8px' }}>
                                <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: 'bold' }}>KAYITLI ADRESLERİM</span>
                                <span className="adres-limit-badge">{adresler.length}/{MAX_ADRES_SAYISI}</span>
                            </div>

                            {adresler.length > 0 ? adresler.map(adr => (
                                <div key={adr.id} className="dropdown-item" style={{ justifyContent: 'space-between', padding: '14px 16px' }} onClick={() => handleAdresSecimi(adr)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <span style={{ fontSize: '20px' }}>📍</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {adr.baslik}
                                                {seciliAdres?.id === adr.id && <span style={{ fontSize: '12px', color: 'var(--primary)' }}>✓</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '3px' }}>
                                                {adr.mahalle}, {adr.ilce}
                                            </div>
                                            {/* Bölge Etiketleri */}
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                {adr.sehir && <span className="bolge-tag bolge-tag-sehir">{adr.sehir}</span>}
                                                {adr.ilce && <span className="bolge-tag bolge-tag-ilce">{adr.ilce}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="adres-sil-btn" onClick={(e) => adresSil(e, adr.id)}>
                                        Sil
                                    </button>
                                </div>
                            )) : (
                                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏠</div>
                                    Kayıtlı adres yok
                                </div>
                            )}

                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>

                            {/* Yeni Adres Ekle Butonu */}
                            <div
                                onClick={adresModalAc}
                                className="dropdown-item"
                                style={{
                                    color: adresler.length >= MAX_ADRES_SAYISI ? 'var(--text-sub)' : 'var(--primary)',
                                    fontWeight: '600',
                                    opacity: adresler.length >= MAX_ADRES_SAYISI ? 0.5 : 1,
                                    justifyContent: 'center'
                                }}
                            >
                                <span>➕</span>
                                {adresler.length >= MAX_ADRES_SAYISI ? 'Limit Doldu' : 'Yeni Adres Ekle'}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: ACTIONS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                        {/* Dark Mode Toggle */}
                        <div onClick={toggleTheme} style={{ cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%', background: 'var(--bg-body)' }}>
                            {darkMode ? '☀️' : '🌙'}
                        </div>

                        {isAdmin && (
                            <div onClick={() => navigate('/admin')} style={{ background: 'var(--text-main)', color: 'var(--bg-body)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                👑 Panel
                            </div>
                        )}

                        {isRestoran && !isAdmin && (
                            <div
                                onClick={() => navigate('/magaza-paneli')}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                🏪 Restoran Paneli
                            </div>
                        )}

                        <div className="desktop-cart-icon" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/siparislerim')}>
                            <span style={{ fontSize: '22px', color: 'var(--text-main)' }}>🛍️</span>
                        </div>

                        <div className="dropdown-wrapper">
                            <div onClick={() => !user && navigate('/login')} style={{ width: '40px', height: '40px', background: user ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' : 'var(--bg-body)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '18px', color: user ? 'white' : 'var(--text-main)' }}>{user ? user.email.charAt(0).toUpperCase() : "👤"}</span>
                            </div>

                            {user && (
                                <div className="dropdown-menu" style={{ top: '55px' }}>
                                    <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-body)', borderRadius: '16px 16px 0 0' }}>
                                        <div style={{ fontWeight: '700' }}>{user.email.split('@')[0]}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                                            {isAdmin ? '✨ Süper Admin' : 'Standart Üye'}
                                        </div>
                                    </div>
                                    <div onClick={() => navigate('/profil')} className="dropdown-item">👤 Hesabım</div>
                                    <div onClick={() => navigate('/siparislerim')} className="dropdown-item">📦 Siparişlerim</div>
                                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '5px 0' }}></div>
                                    <div onClick={() => auth.signOut()} className="dropdown-item" style={{ color: '#ef4444' }}>🚪 Çıkış Yap</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="icerik-sinirlayici">

                {/* 2. ARAMA - GELİŞTİRİLMİŞ */}
                <div style={{ padding: '20px 20px 0 20px' }}>
                    <div className="arama-container" style={{ position: 'relative', borderRadius: '16px', padding: '5px' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '14px', fontSize: '18px', opacity: 0.5 }}>🔍</span>
                        <input
                            className="arama-input"
                            placeholder="Restoran veya yemek ara..."
                            style={{ width: '100%', padding: '10px 14px 10px 48px', border: 'none', fontSize: '15px', outline: 'none' }}
                            value={aramaTerimi}
                            onChange={e => setAramaTerimi(e.target.value)}
                            onFocus={() => aramaTerimi.length >= 2 && setAramaOnayDurum(true)}
                            onBlur={() => setTimeout(() => setAramaOnayDurum(false), 200)}
                        />

                        {/* Temizle Butonu */}
                        {aramaTerimi && (
                            <button
                                onClick={() => { setAramaTerimi(''); setAramaOnayDurum(false); }}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'var(--bg-body)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    color: 'var(--text-sub)'
                                }}
                            >
                                ✕
                            </button>
                        )}

                        {/* AKILLI ARAMA DROPDOWN */}
                        {aramaOnayDurum && aramaOneriler.length > 0 && (
                            <div className="arama-dropdown">
                                {/* Arama Sonuçları Başlığı */}
                                <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' }}>
                                    🔍 "{aramaTerimi}" için öneriler
                                </div>

                                {aramaOneriler.map((oneri, i) => (
                                    <div
                                        key={`${oneri.tip}-${oneri.id}-${i}`}
                                        className="arama-oneri-item"
                                        onClick={() => aramaOneriSec(oneri)}
                                    >
                                        {oneri.resim ? (
                                            <img src={oneri.resim} alt={oneri.baslik} className="arama-oneri-resim" />
                                        ) : (
                                            <div className="arama-oneri-icon" style={{
                                                background: oneri.tip === 'restoran' ? 'rgba(59,130,246,0.1)' :
                                                    oneri.tip === 'kategori' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'
                                            }}>
                                                {oneri.icon}
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px' }}>
                                                {oneri.baslik}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                                                {oneri.altBaslik}
                                            </div>
                                        </div>
                                        {oneri.tip === 'restoran' && (
                                            <div style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                background: oneri.acikMi ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: oneri.acikMi ? '#22c55e' : '#ef4444'
                                            }}>
                                                {oneri.acikMi ? 'AÇIK' : 'KAPALI'}
                                            </div>
                                        )}
                                        <span style={{ fontSize: '18px', opacity: 0.3 }}>→</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* POPÜLER ARAMALAR (Arama boşken göster) */}
                    {!aramaTerimi && (
                        <div style={{ marginTop: '15px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                🔥 Popüler Aramalar
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {POPULER_ARAMALAR.map((p, i) => (
                                    <div
                                        key={i}
                                        className="populer-arama-chip"
                                        onClick={() => setAramaTerimi(p.terim)}
                                        style={{
                                            '--hover-color': p.renk
                                        }}
                                    >
                                        <span>{p.icon}</span>
                                        <span>{p.terim}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* SON GÖRÜNTÜLENENLER */}
                {sonGoruntuleneler.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🕐 Son Görüntülenenler
                            </h4>
                            <button
                                onClick={() => {
                                    setSonGoruntuleneler([]);
                                    localStorage.removeItem('sonGoruntuleneler');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-sub)',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Temizle
                            </button>
                        </div>
                        <div className="son-goruntulenen-scroll">
                            {sonGoruntuleneler.map((item, i) => {
                                const restoran = restoranlar.find(r => r.id === item.id);
                                const acikMi = restoran?.acikMi ?? true;

                                return (
                                    <Link
                                        to={`/restoran/${item.id}`}
                                        key={i}
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                        onClick={() => restoranGoruntulendi(item.id)}
                                    >
                                        <div className="son-goruntulenen-item" style={{ opacity: acikMi ? 1 : 0.6 }}>
                                            <div style={{ height: '90px', overflow: 'hidden', position: 'relative' }}>
                                                <img
                                                    src={item.resim || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300"}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    alt={item.isim}
                                                />
                                                {/* Durum Etiketi */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '6px',
                                                    left: '6px',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '9px',
                                                    fontWeight: '700',
                                                    background: acikMi ? '#22c55e' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {acikMi ? 'AÇIK' : 'KAPALI'}
                                                </div>
                                            </div>
                                            <div style={{ padding: '10px' }}>
                                                <div style={{
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    color: 'var(--text-main)'
                                                }}>
                                                    {item.isim}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--text-sub)',
                                                    marginTop: '3px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <span>⭐</span> {item.puan || 'Yeni'}
                                                    <span style={{ opacity: 0.3 }}>•</span>
                                                    {item.kategori || 'Restoran'}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. HERO & KAMPANYALAR */}
                {kampanyalar.length > 0 ? (
                    <div style={{ paddingLeft: '20px', marginTop: '25px', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', paddingBottom: '10px' }}>
                        {kampanyalar.map((kamp, i) => (
                            <Link to={`/restoran/${kamp.restoranId}`} key={i} style={{ display: 'inline-block', width: '320px', marginRight: '16px', textDecoration: 'none' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
                                    borderRadius: '20px',
                                    padding: '20px',
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    height: '140px',
                                    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                                }}>
                                    <div style={{ zIndex: 2, position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                            {/* ✅ GELİŞTİRİLMİŞ LOGO GÖSTERİMİ */}
                                            {kamp.restoranResim ? (
                                                <img
                                                    src={kamp.restoranResim}
                                                    alt={kamp.restoranAd}
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        objectFit: 'cover',
                                                        background: 'white',
                                                        padding: '2px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                    }}
                                                    onError={(e) => {
                                                        // Resim yüklenemezse emoji göster
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            {/* Fallback: Emoji Avatar */}
                                            <div
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(255,255,255,0.2)',
                                                    display: kamp.restoranResim ? 'none' : 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '18px'
                                                }}
                                            >
                                                🍽️
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '700' }}>{kamp.restoranAd}</div>
                                                <div style={{ fontSize: '10px', opacity: 0.8 }}>Kampanya</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.1', marginBottom: '4px' }}>
                                            {kamp.tip === 'yuzde' ? `%${kamp.deger}` : `${kamp.deger} TL`} İndirim
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>{kamp.baslik}</div>
                                        {kamp.minSepet > 0 && (
                                            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                                                Min. {kamp.minSepet} TL sipariş
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ position: 'absolute', right: '-15px', bottom: '-25px', fontSize: '120px', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                                        {kamp.tip === 'yuzde' ? '🔥' : '💰'}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    // Hero banner kodu aynı kalacak...
                    <div className="hero-banner">
                        <div className="hero-pattern">🍕</div>
                        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>Acıktın mı, {user ? user.email.split('@')[0] : 'Misafir'}?</h2>
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '16px' }}>Şehrin en iyi lezzetleri kapına gelsin. Hemen keşfet!</p>
                    </div>
                )}

                {/* 4. KATEGORİLER */}
                <div className="kategori-scroll">
                    {kategoriler.map((kat, i) => (
                        <div key={i} onClick={() => setSeciliKategori(kat.ad)} className={`kategori-item ${seciliKategori === kat.ad ? 'kategori-aktif' : ''}`}>
                            <div className="ikon-kutusu">
                                {kat.icon}
                            </div>
                            <div style={{ fontSize: '13px', marginTop: '8px', color: seciliKategori === kat.ad ? 'var(--primary)' : 'var(--text-main)', fontWeight: seciliKategori === kat.ad ? '700' : '500', opacity: seciliKategori === kat.ad ? 1 : 0.7 }}>{kat.ad}</div>
                        </div>
                    ))}
                </div>

                {/* 5. RESTORAN LİSTESİ */}
                <div style={{ padding: '10px 20px 40px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Popüler Restoranlar 🔥
                        </h3>
                        <select className="sirala-select" value={siralamaSekli} onChange={(e) => setSiralamaSekli(e.target.value)}>
                            <option value="varsayilan">Sıralama: Önerilen</option>
                            <option value="puan">Puana Göre (Yüksek)</option>
                            <option value="sure">Teslimat Süresi (Hızlı)</option>
                            <option value="alfabetik">Alfabetik (A-Z)</option>
                        </select>
                    </div>

                    {/* Seçili Adres Bilgisi */}
                    {seciliAdres && (
                        <div style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>📍</span>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                                        {seciliAdres.baslik}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                                        {seciliAdres.mahalle}, {seciliAdres.ilce}, {seciliAdres.sehir}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                                {filtrelenmisListe.filter(r => isHizmetBolgesi(r)).length} restoran hizmet veriyor
                            </div>
                        </div>
                    )}

                    {filtrelenmisListe.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px' }}>😕</div>
                            <h3>Aradığınız kriterlere uygun restoran bulunamadı.</h3>
                            <p>Farklı bir kategori seçmeyi veya arama terimini değiştirmeyi deneyin.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                            {filtrelenmisListe.map(res => {
                                const hizmetVeriyor = isHizmetBolgesi(res);
                                const tiklanabilir = res.acikMi && res.yogunluk !== "Servis Dışı" && hizmetVeriyor;
                                const isFav = favoriler.includes(res.id);

                                // Dinamik değerler
                                const dinamikMinSepet = getMinSepetTutari(res);
                                const teslimatUcreti = getTeslimatUcreti(res);

                                return (
                                    <Link
                                        to={tiklanabilir ? `/restoran/${res.id}` : '#'}
                                        key={res.id}
                                        onClick={() => tiklanabilir && restoranGoruntulendi(res.id)}
                                        style={{ textDecoration: 'none', color: 'inherit', pointerEvents: tiklanabilir ? 'auto' : 'none' }}
                                    >
                                        <div className={`restoran-kart ${!res.acikMi ? 'kapali-filtre' : ''} ${!hizmetVeriyor ? 'hizmet-disi' : ''}`}>

                                            {/* FAVORİ BUTONU */}
                                            <div className={`fav-btn ${isFav ? 'fav-active' : 'fav-inactive'}`} onClick={(e) => toggleFavori(e, res.id)}>
                                                {isFav ? '❤️' : '🤍'}
                                            </div>

                                            {/* ETİKETLER */}
                                            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2 }}>
                                                <div style={{ background: res.acikMi ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.9)', color: res.acikMi ? '#16a34a' : 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                                                    {res.acikMi ? "AÇIK" : "KAPALI"}
                                                </div>

                                                {res.kampanyalar && res.kampanyalar.length > 0 && (
                                                    <div style={{ background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>
                                                        🏷️ FIRSAT
                                                    </div>
                                                )}

                                                {!hizmetVeriyor && (
                                                    <div style={{ background: '#1e293b', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                        🚫 BÖLGE DIŞI
                                                    </div>
                                                )}

                                                {/* Ücretsiz Teslimat Etiketi */}
                                                {hizmetVeriyor && teslimatUcreti === 0 && res.bolgeler?.length > 0 && (
                                                    <div style={{ background: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>
                                                        🚚 ÜCRETSİZ TESLİMAT
                                                    </div>
                                                )}
                                            </div>

                                            {/* GÖRSEL */}
                                            <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                                                <img src={res.kapakResmi || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.5s' }} alt={res.isim} />
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>

                                                <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: 'white', right: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: '500' }}>{res.kategori || "Genel Mutfak"}</div>
                                                        <div style={{ fontSize: '22px', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{res.isim}</div>
                                                    </div>
                                                    <div style={{ background: 'white', color: '#16a34a', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                                        <span>⭐</span> {res.puan || "Yeni"}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* KART DETAY */}
                                            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span>🕒</span> {res.teslimatSure || "30-40 dk"}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span>🛵</span>
                                                        <span style={{ color: dinamikMinSepet > 0 ? 'var(--primary)' : 'inherit', fontWeight: dinamikMinSepet > 0 ? '700' : '500' }}>
                                                            Min. {dinamikMinSepet} TL
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Teslimat Ücreti */}
                                                {hizmetVeriyor && teslimatUcreti > 0 && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                                                        +{teslimatUcreti}₺ teslimat
                                                    </div>
                                                )}
                                            </div>

                                            {/* Kampanya Varsa */}
                                            {res.kampanyalar && res.kampanyalar.length > 0 && (
                                                <div style={{ padding: '0 16px 16px 16px' }}>
                                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>🎉</span> {res.kampanyalar[0].baslik}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ADRES EKLEME MODALI - MERKEZİ BÖLGE İLE */}
            {adresModal && (
                <div className="adres-modal-overlay" onClick={() => setAdresModal(false)}>
                    <div className="adres-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>📍 Yeni Adres Ekle</h3>
                            <button
                                onClick={() => setAdresModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-sub)' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Bölge Seçilmedi Uyarısı */}
                        {Object.keys(merkeziBolgeler).length === 0 && (
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '15px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                color: '#f59e0b',
                                fontSize: '14px',
                                textAlign: 'center'
                            }}>
                                ⚠️ Henüz hizmet bölgesi tanımlanmamış veya yükleniyor...
                            </div>
                        )}

                        {/* Adres Başlığı */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label">Adres Başlığı <span className="required-star">*</span></label>
                            <input
                                className="adres-input"
                                placeholder="Örn: Ev, İş, Annemin Evi"
                                value={yeniAdresData.baslik}
                                onChange={e => setYeniAdresData({ ...yeniAdresData, baslik: e.target.value })}
                            />
                        </div>

                        {/* Kişi Bilgileri */}
                        <div className="adres-row adres-row-2">
                            <div>
                                <label className="input-label">Ad Soyad <span className="required-star">*</span></label>
                                <input
                                    className="adres-input"
                                    placeholder="Teslim alacak kişi"
                                    value={yeniAdresData.adSoyad}
                                    onChange={e => setYeniAdresData({ ...yeniAdresData, adSoyad: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">Telefon No <span className="required-star">*</span></label>
                                <input
                                    className="adres-input"
                                    placeholder="05XX XXX XX XX"
                                    value={yeniAdresData.iletisimNo}
                                    onChange={e => setYeniAdresData({ ...yeniAdresData, iletisimNo: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Şehir Seçimi - DROPDOWN */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label">Şehir <span className="required-star">*</span></label>
                            <select
                                className="adres-select"
                                value={yeniAdresData.sehirKey}
                                onChange={e => sehirDegistir(e.target.value)}
                            >
                                <option value="">-- Şehir Seçin --</option>
                                {Object.entries(merkeziBolgeler).map(([key, sehir]) => (
                                    <option key={key} value={key}>
                                        {/* isimDuzelt kullanarak Tekirdağ, İstanbul gibi düzgün gösterim sağladık */}
                                        {sehir.ad ? sehir.ad : isimDuzelt(key)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* İlçe Seçimi - DROPDOWN */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label">İlçe <span className="required-star">*</span></label>
                            <select
                                className="adres-select"
                                value={yeniAdresData.ilceKey}
                                onChange={e => ilceDegistir(e.target.value)}
                                disabled={!yeniAdresData.sehirKey}
                                style={{ opacity: yeniAdresData.sehirKey ? 1 : 0.5 }}
                            >
                                <option value="">-- İlçe Seçin --</option>
                                {/* getMevcutIlcelerDizi ile mapleyerek doğru veriyi alıyoruz */}
                                {getMevcutIlcelerDizi().map(([key, ilceData]) => (
                                    <option key={key} value={key}>{ilceData.ad || isimDuzelt(key)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mahalle Seçimi - DROPDOWN */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label">Mahalle <span className="required-star">*</span></label>
                            <select
                                className="adres-select"
                                value={yeniAdresData.mahalle}
                                onChange={e => setYeniAdresData({ ...yeniAdresData, mahalle: e.target.value })}
                                disabled={!yeniAdresData.ilceKey}
                                style={{ opacity: yeniAdresData.ilceKey ? 1 : 0.5 }}
                            >
                                <option value="">-- Mahalle Seçin --</option>
                                {getMevcutMahalleler().map((mahalle, i) => (
                                    <option key={i} value={mahalle}>{mahalle}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sokak/Cadde */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label">Sokak / Cadde <span className="required-star">*</span></label>
                            <input
                                className="adres-input"
                                placeholder="Örn: Atatürk Caddesi"
                                value={yeniAdresData.sokak}
                                onChange={e => setYeniAdresData({ ...yeniAdresData, sokak: e.target.value })}
                            />
                        </div>

                        {/* Bina Bilgileri */}
                        <div className="adres-row adres-row-3">
                            <div>
                                <label className="input-label">Bina No <span className="required-star">*</span></label>
                                <input
                                    className="adres-input"
                                    placeholder="12"
                                    value={yeniAdresData.binaNo}
                                    onChange={e => setYeniAdresData({ ...yeniAdresData, binaNo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">Kat</label>
                                <input
                                    className="adres-input"
                                    placeholder="3"
                                    value={yeniAdresData.kat}
                                    onChange={e => setYeniAdresData({ ...yeniAdresData, kat: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">Daire No</label>
                                <input
                                    className="adres-input"
                                    placeholder="5"
                                    value={yeniAdresData.daireNo}
                                    onChange={e => setYeniAdresData({ ...yeniAdresData, daireNo: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Adres Tarifi */}
                        <div style={{ marginBottom: '20px' }}>
                            <label className="input-label">Adres Tarifi (Opsiyonel)</label>
                            <input
                                className="adres-input"
                                placeholder="Örn: Mavi binanın arkası, marketin yanı"
                                value={yeniAdresData.adresTarifi}
                                onChange={e => setYeniAdresData({ ...yeniAdresData, adresTarifi: e.target.value })}
                            />
                        </div>

                        {/* Butonlar */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setAdresModal(false)}
                                style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={adresEkle}
                                disabled={adresKaydediliyor || Object.keys(merkeziBolgeler).length === 0}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    background: Object.keys(merkeziBolgeler).length === 0 ? 'var(--text-sub)' : 'var(--primary)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '12px',
                                    cursor: adresKaydediliyor || Object.keys(merkeziBolgeler).length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    opacity: adresKaydediliyor ? 0.7 : 1
                                }}
                            >
                                {adresKaydediliyor ? '⏳ Kaydediliyor...' : '✓ Adresi Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnaSayfa;