import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot, deleteDoc, addDoc, collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateEmail, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../App';

function Profil() {
    const [user, setUser] = useState(null);
    const [adresler, setAdresler] = useState([]);
    const [aktifSekme, setAktifSekme] = useState('profil');
    const navigate = useNavigate();
    const { toggleTheme, darkMode } = useContext(ThemeContext);

    // Form State'leri
    const [adSoyad, setAdSoyad] = useState("");
    const [telefon, setTelefon] = useState("");
    const [dogumTarihi, setDogumTarihi] = useState("");

    // Güvenlik State'leri
    const [mevcutSifre, setMevcutSifre] = useState("");
    const [yeniSifre, setYeniSifre] = useState("");
    const [yeniEmail, setYeniEmail] = useState("");

    // 🆕 PUAN & SADAKAT STATE'LERİ
    const [puanBilgileri, setPuanBilgileri] = useState({
        puanBakiye: 0,
        toplamKazanilanPuan: 0,
        referansKodu: '',
        streakSayisi: 0,
        kuponlarim: []
    });
    const [platformAyarlari, setPlatformAyarlari] = useState({
        puanHarcamaOrani: 100,
        minPuanKullanim: 500,
        streakHedef: 5,
        referansBonusu: 100
    });
    const [kuponlar, setKuponlar] = useState([]);
    const [referansKopyalandi, setReferansKopyalandi] = useState(false);

    // 🆕 DESTEK STATE'LERİ
    const [destekMesaj, setDestekMesaj] = useState("");
    const [destekTalepleri, setDestekTalepleri] = useState([]);

    // Merkezi Bölge Yönetimi State'leri
    const [merkeziBolgeler, setMerkeziBolgeler] = useState({});
    const [adresModalAcik, setAdresModalAcik] = useState(false);
    const [adresForm, setAdresForm] = useState({
        baslik: '', adSoyad: '', iletisimNo: '', sehir: '', sehirKey: '',
        ilce: '', ilceKey: '', mahalle: '', sokak: '', binaNo: '', daireNo: '', kat: '', tarif: ''
    });
    const [adresDuzenleModu, setAdresDuzenleModu] = useState(null);

    const isimDuzelt = (isim) => {
        if (!isim) return "";
        return isim.charAt(0).toUpperCase() + isim.slice(1);
    };

    // 🆕 Referans Kodu Oluşturma
    const generateReferansKodu = (uid) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code + uid.slice(-2).toUpperCase();
    };

    // 1. useEffect: Kullanıcı Oturumunu Dinle
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                setYeniEmail(u.email);

                try {
                    const ref = doc(db, "kullanicilar", u.uid);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const d = snap.data();
                        setAdSoyad(d.adSoyad || "");
                        setTelefon(d.telefon || "");
                        setDogumTarihi(d.dogumTarihi || "");
                        setAdresler(d.adresler || []);

                        // 🆕 Puan bilgilerini set et - ALAN ADLARI DÜZELTİLDİ
                        let referansKodu = d.referansKodu;

                        // Referans kodu yoksa oluştur
                        if (!referansKodu) {
                            referansKodu = generateReferansKodu(u.uid);
                            await updateDoc(ref, { referansKodu });
                        }

                        // ✅ DÜZELTİLMİŞ: MagazaPaneli ile aynı alan adları
                        setPuanBilgileri({
                            puanBakiye: d.puanBakiye || d.puanlar || 0,  // ✅ Her iki alanı da kontrol et
                            toplamKazanilanPuan: d.toplamKazanilanPuan || d.toplamSiparis || 0, // ✅
                            referansKodu: referansKodu,
                            streakSayisi: d.streakSayisi || d.streak || 0, // ✅
                            kuponlarim: d.kuponlarim || []
                        });
                    }
                } catch (error) {
                    console.error("Kullanıcı verisi çekilemedi:", error);
                }
            } else {
                navigate('/login');
            }
        });

        return () => unsubAuth();
    }, [navigate]);

    // 🆕 2. useEffect: Platform Ayarlarını ve Kuponları Dinle
    useEffect(() => {
        // Platform ayarları
        const unsubAyarlar = onSnapshot(doc(db, "sistem", "ayarlar"), (snap) => {
            if (snap.exists()) {
                setPlatformAyarlari(prev => ({ ...prev, ...snap.data() }));
            }
        });

        // Aktif kuponları dinle
        const unsubKuponlar = onSnapshot(
            doc(db, "sistem", "aktif_kuponlar"),
            (snap) => {
                // Bu collection yoksa hata vermemesi için
            },
            () => { }
        );

        return () => { unsubAyarlar(); };
    }, []);

    // 3. useEffect: Merkezi Bölgeleri Dinle
    useEffect(() => {
        const docRef = doc(db, "bolgeler", "turkiye");
        const unsubBolgeler = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setMerkeziBolgeler(docSnap.data());
            } else {
                setMerkeziBolgeler({});
            }
        });
        return () => unsubBolgeler();
    }, []);

    // 🆕 4. useEffect: Destek Taleplerini Dinle
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "destek_talepleri"), where("kullaniciId", "==", user.uid), orderBy("tarih", "desc"));
        const unsubDestek = onSnapshot(q, (snap) => {
            setDestekTalepleri(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubDestek();
    }, [user]);

    // 🆕 Referans Kodunu Kopyala
    const referansKopyala = () => {
        const shareText = `RotasyonYemek'e katıl, ${platformAyarlari.referansBonusu} puan kazan! 🎁\n\nReferans kodum: ${puanBilgileri.referansKodu}\n\nHemen indir: rotasyonyemek.com`;
        navigator.clipboard.writeText(shareText);
        setReferansKopyalandi(true);
        setTimeout(() => setReferansKopyalandi(false), 2000);
    };

    // 🆕 Puan değerini TL'ye çevir
    const puanToTL = (puan) => {
        return Math.floor(puan / platformAyarlari.puanHarcamaOrani);
    };

    // Profil Güncelleme
    const kaydet = async () => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "kullanicilar", user.uid), { adSoyad, telefon, dogumTarihi });
            alert("✅ Bilgiler başarıyla güncellendi.");
        } catch (error) {
            alert("Hata: " + error.message);
        }
    };

    // 🆕 Destek Talebi Gönder
    const destekGonder = async () => {
        if (!destekMesaj.trim()) return alert("Lütfen mesajınızı yazın.");
        try {
            await addDoc(collection(db, "destek_talepleri"), {
                kullaniciId: user.uid,
                kimden: adSoyad || user.email,
                email: user.email,
                telefon: telefon,
                konu: destekMesaj,
                durum: "Bekliyor",
                tarih: serverTimestamp(),
                tur: "musteri"
            });
            setDestekMesaj("");
            alert("✅ Destek talebiniz alındı. En kısa sürede dönüş yapacağız.");
        } catch (error) {
            alert("Hata: " + error.message);
        }
    };

    // === ADRES İŞLEMLERİ (Mevcut kodlar aynen kalıyor) ===
    const adresKaydet = async () => {
        if (!adresForm.baslik.trim()) return alert("Adres başlığı giriniz!");
        if (!adresForm.adSoyad.trim()) return alert("Ad Soyad giriniz!");
        if (!adresForm.iletisimNo.trim()) return alert("Telefon numarası giriniz!");
        if (!adresForm.sehir) return alert("Şehir seçiniz!");
        if (!adresForm.ilce) return alert("İlçe seçiniz!");
        if (!adresForm.mahalle) return alert("Mahalle seçiniz!");
        if (!adresForm.sokak.trim()) return alert("Sokak/Cadde giriniz!");
        if (!adresForm.binaNo.trim()) return alert("Bina numarası giriniz!");

        const temizTelefon = adresForm.iletisimNo.replace(/\D/g, '');
        if (temizTelefon.length < 10 || temizTelefon.length > 11) {
            return alert("Geçerli bir telefon numarası giriniz!");
        }

        if (!adresDuzenleModu && adresler.length >= 5) {
            return alert("En fazla 5 adres ekleyebilirsiniz!");
        }

        const yeniAdres = {
            id: adresDuzenleModu || Date.now().toString(),
            baslik: adresForm.baslik.trim(),
            adSoyad: adresForm.adSoyad.trim(),
            iletisimNo: temizTelefon,
            sehir: adresForm.sehir,
            sehirKey: adresForm.sehirKey,
            ilce: adresForm.ilce,
            ilceKey: adresForm.ilceKey,
            mahalle: adresForm.mahalle,
            sokak: adresForm.sokak.trim(),
            binaNo: adresForm.binaNo.trim(),
            daireNo: adresForm.daireNo.trim(),
            kat: adresForm.kat.trim(),
            tarif: adresForm.tarif.trim(),
            olusturulmaTarihi: adresDuzenleModu ? undefined : new Date().toISOString()
        };

        let yeniAdresler = adresDuzenleModu
            ? adresler.map(a => a.id === adresDuzenleModu ? { ...a, ...yeniAdres } : a)
            : [...adresler, yeniAdres];

        try {
            setAdresler(yeniAdresler);
            await updateDoc(doc(db, "kullanicilar", user.uid), { adresler: yeniAdresler });
            adresFormTemizle();
            setAdresModalAcik(false);
            alert(adresDuzenleModu ? "✅ Adres güncellendi!" : "✅ Adres eklendi!");
        } catch (error) {
            alert("Hata: " + error.message);
        }
    };

    const adresSil = async (adres) => {
        if (!window.confirm("Bu adresi silmek istediğinize emin misiniz?")) return;
        const yeniAdresler = adresler.filter(a => a.id !== adres.id);
        try {
            setAdresler(yeniAdresler);
            await updateDoc(doc(db, "kullanicilar", user.uid), { adresler: yeniAdresler });
            alert("🗑️ Adres silindi!");
        } catch (error) {
            alert("Hata: " + error.message);
        }
    };

    const adresDuzenle = (adres) => {
        setAdresDuzenleModu(adres.id);
        setAdresForm({
            baslik: adres.baslik || '', adSoyad: adres.adSoyad || '', iletisimNo: adres.iletisimNo || '',
            sehir: adres.sehir || '', sehirKey: adres.sehirKey || '', ilce: adres.ilce || '',
            ilceKey: adres.ilceKey || '', mahalle: adres.mahalle || '', sokak: adres.sokak || '',
            binaNo: adres.binaNo || '', daireNo: adres.daireNo || '', kat: adres.kat || '', tarif: adres.tarif || ''
        });
        setAdresModalAcik(true);
    };

    const adresFormTemizle = () => {
        setAdresForm({
            baslik: '', adSoyad: '', iletisimNo: '', sehir: '', sehirKey: '',
            ilce: '', ilceKey: '', mahalle: '', sokak: '', binaNo: '', daireNo: '', kat: '', tarif: ''
        });
        setAdresDuzenleModu(null);
    };

    const sehirDegistir = (sehirKey) => {
        const sehirData = merkeziBolgeler[sehirKey];
        const sehirAdi = sehirData?.ad || isimDuzelt(sehirKey);
        setAdresForm(prev => ({ ...prev, sehir: sehirAdi, sehirKey, ilce: '', ilceKey: '', mahalle: '' }));
    };

    const ilceDegistir = (ilceKey) => {
        const mevcutIlceler = getMevcutIlcelerDizi();
        const secilenIlceData = mevcutIlceler.find(([key]) => key === ilceKey);
        if (secilenIlceData) {
            const [key, data] = secilenIlceData;
            setAdresForm(prev => ({ ...prev, ilce: data.ad || key, ilceKey, mahalle: '' }));
        }
    };

    const getMevcutIlcelerDizi = () => {
        if (!adresForm.sehirKey) return [];
        const sehirData = merkeziBolgeler[adresForm.sehirKey];
        if (!sehirData) return [];
        const hedefVeri = sehirData.ilceler ? sehirData.ilceler : sehirData;
        return Object.entries(hedefVeri).filter(([key, value]) => typeof value === 'object' && value !== null);
    };

    const getMevcutMahalleler = () => {
        if (!adresForm.sehirKey || !adresForm.ilceKey) return [];
        const sehirData = merkeziBolgeler[adresForm.sehirKey];
        const hedefVeri = sehirData.ilceler ? sehirData.ilceler : sehirData;
        const ilceData = hedefVeri[adresForm.ilceKey];
        return ilceData?.mahalleler || [];
    };

    const sifreDegistir = async () => {
        if (!mevcutSifre || !yeniSifre) return alert("Lütfen alanları doldurun.");
        try {
            const cred = EmailAuthProvider.credential(user.email, mevcutSifre);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, yeniSifre);
            alert("✅ Şifreniz başarıyla değiştirildi!");
            setMevcutSifre("");
            setYeniSifre("");
        } catch (error) {
            alert("❌ Hata: Mevcut şifreniz yanlış olabilir.");
        }
    };

    const emailDegistir = async () => {
        if (yeniEmail === user.email) return alert("Yeni e-posta adresi eskisiyle aynı.");
        const sifre = window.prompt("Güvenlik için lütfen mevcut şifrenizi giriniz:");
        if (!sifre) return;
        try {
            const cred = EmailAuthProvider.credential(user.email, sifre);
            await reauthenticateWithCredential(user, cred);
            await updateEmail(user, yeniEmail);
            await updateDoc(doc(db, "kullanicilar", user.uid), { email: yeniEmail });
            alert("✅ E-posta adresiniz güncellendi!");
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            alert("❌ İşlem Başarısız: " + error.message);
        }
    };

    // 🆕 HESAP SİLME FONKSİYONU
    const hesapSil = async () => {
        if (!window.confirm("⚠️ Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz (puanlar, sipariş geçmişi vb.) silinecektir!")) return;

        const sifre = window.prompt("Güvenlik için lütfen şifrenizi giriniz:");
        if (!sifre) return;

        try {
            // 1. Yeniden kimlik doğrulama (Re-auth)
            const cred = EmailAuthProvider.credential(user.email, sifre);
            await reauthenticateWithCredential(user, cred);

            // 2. Firestore verisini sil
            await deleteDoc(doc(db, "kullanicilar", user.uid));

            // 3. Auth kullanıcısını sil
            await deleteUser(user);

            alert("Hesabınız başarıyla silindi. Hoşçakalın! 👋");
            navigate('/login');
        } catch (error) {
            console.error("Hesap silme hatası:", error);
            if (error.code === 'auth/wrong-password') {
                alert("❌ Hatalı şifre girdiniz.");
            } else {
                alert("❌ İşlem başarısız: " + error.message);
            }
        }
    };

    // Stiller
    const inputStyle = {
        padding: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)',
        color: 'var(--text-main)', borderRadius: '10px', width: '100%', outline: 'none',
        fontSize: '14px', boxSizing: 'border-box'
    };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };
    const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-sub)', fontWeight: 'bold' };

    if (!user) {
        return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>📱 Giriş yapılıyor...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '10px 15px', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ← Anasayfa
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', padding: '8px 15px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{darkMode ? 'Karanlık' : 'Aydınlık'}</span>
                    <div onClick={toggleTheme} style={{ cursor: 'pointer', fontSize: '18px' }}>{darkMode ? '🌙' : '☀️'}</div>
                </div>
            </div>

            {/* 🆕 PROFİL KARTI - PUAN EKLENMİŞ */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '30px',
                alignItems: 'center',
                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                padding: '25px',
                borderRadius: '20px',
                color: 'white',
                boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
                flexWrap: 'wrap'
            }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.5)' }}>
                    {adSoyad.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>{adSoyad || "Değerli Müşterimiz"}</h2>
                    <div style={{ opacity: 0.8, fontSize: '14px' }}>{user?.email}</div>

                    {/* 🆕 Streak Göstergesi */}
                    {puanBilgileri.streakSayisi > 0 && (
                        <div style={{
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '16px' }}>🔥</span>
                            <span style={{ fontSize: '13px', opacity: 0.9 }}>
                                {puanBilgileri.streakSayisi} sipariş serisi
                                {puanBilgileri.streakSayisi >= platformAyarlari.streakHedef && ' (Bonus kazandın!)'}
                            </span>
                        </div>
                    )}
                </div>

                {/* 🆕 PUAN KUTUSU */}
                <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '15px 25px',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                    minWidth: '150px'
                }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                        🎯 {puanBilgileri.puanBakiye.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                        Puan ({puanToTL(puanBilgileri.puanBakiye)} ₺ değerinde)
                    </div>
                </div>
            </div>

            {/* 🆕 SEKMELER - PUANLAR EKLENDİ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                {['profil', 'puanlar', 'adresler', 'destek', 'guvenlik'].map(s => (
                    <button key={s} onClick={() => setAktifSekme(s)} style={{
                        padding: '12px 20px', borderRadius: '12px', border: 'none',
                        background: aktifSekme === s ? 'var(--primary)' : 'var(--card-bg)',
                        color: aktifSekme === s ? 'white' : 'var(--text-sub)',
                        cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize',
                        boxShadow: aktifSekme === s ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none',
                        transition: '0.3s', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        {s === 'guvenlik' ? '🔒 Güvenlik' :
                            s === 'adresler' ? '📍 Adresler' :
                                s === 'destek' ? '🛟 Destek' :
                                    s === 'puanlar' ? '🎯 Puanlar' : '👤 Bilgiler'}
                        {s === 'puanlar' && puanBilgileri.puanBakiye > 0 && (
                            <span style={{
                                background: 'rgba(255,255,255,0.3)',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px'
                            }}>
                                {puanBilgileri.puanBakiye}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>

                {/* 🆕 PUANLAR SEKMESİ */}
                {aktifSekme === 'puanlar' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                        {/* Puan Özeti */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '15px'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                borderRadius: '16px',
                                padding: '20px',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {puanBilgileri.puanBakiye.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>
                                    Kullanılabilir Puan
                                </div>
                            </div>

                            <div style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderRadius: '16px',
                                padding: '20px',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    {puanBilgileri.toplamKazanilanPuan.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>
                                    Toplam Kazanılan
                                </div>
                            </div>

                            <div style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                borderRadius: '16px',
                                padding: '20px',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                    🔥 {puanBilgileri.streakSayisi}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>
                                    Sipariş Serisi
                                </div>
                            </div>
                        </div>

                        {/* Puan Kullanım Bilgisi */}
                        <div style={{
                            background: 'var(--bg-body)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>💡 Puan Nasıl Kullanılır?</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-sub)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>🛒</span>
                                    <span>Sipariş verirken sepet ekranında puanlarınızı kullanabilirsiniz</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>💵</span>
                                    <span><strong>{platformAyarlari.puanHarcamaOrani} puan = 1₺</strong> indirim</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>⚠️</span>
                                    <span>Minimum <strong>{platformAyarlari.minPuanKullanim} puan</strong> kullanabilirsiniz</span>
                                </div>
                                {puanBilgileri.puanBakiye >= platformAyarlari.minPuanKullanim && (
                                    <div style={{
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        color: '#22c55e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>✅</span>
                                        <span>Şu an <strong>{puanToTL(puanBilgileri.puanBakiye)} ₺</strong> indirim kullanabilirsiniz!</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Streak Bilgisi */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.1))',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🔥 Sipariş Serisi (Streak)
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                {[...Array(platformAyarlari.streakHedef)].map((_, i) => (
                                    <div key={i} style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: i < puanBilgileri.streakSayisi ? '#f59e0b' : 'var(--bg-body)',
                                        border: i < puanBilgileri.streakSayisi ? 'none' : '2px dashed var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        color: i < puanBilgileri.streakSayisi ? 'white' : 'var(--text-sub)'
                                    }}>
                                        {i < puanBilgileri.streakSayisi ? '🔥' : (i + 1)}
                                    </div>
                                ))}
                                <span style={{ marginLeft: '10px', fontSize: '24px' }}>🎁</span>
                            </div>

                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sub)' }}>
                                {platformAyarlari.streakHedef - puanBilgileri.streakSayisi > 0
                                    ? `${platformAyarlari.streakHedef - puanBilgileri.streakSayisi} sipariş daha ver, ${platformAyarlari.streakBonusPuan} bonus puan kazan!`
                                    : `🎉 Tebrikler! ${platformAyarlari.streakBonusPuan} bonus puan kazandın!`
                                }
                            </p>
                        </div>

                        {/* Referans Kodu */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                            borderRadius: '16px',
                            padding: '25px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            textAlign: 'center'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>
                                🎁 Arkadaşını Davet Et, {platformAyarlari.referansBonusu} Puan Kazan!
                            </h4>
                            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-sub)' }}>
                                Referans kodunla kayıt olan arkadaşların ilk siparişinden sonra ikiniz de puan kazanırsınız!
                            </p>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '15px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{
                                    background: 'var(--card-bg)',
                                    padding: '15px 30px',
                                    borderRadius: '12px',
                                    border: '2px dashed #8b5cf6',
                                    fontFamily: 'monospace',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#8b5cf6',
                                    letterSpacing: '3px'
                                }}>
                                    {puanBilgileri.referansKodu}
                                </div>

                                <button
                                    onClick={referansKopyala}
                                    style={{
                                        padding: '15px 25px',
                                        background: referansKopyalandi ? '#22c55e' : '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {referansKopyalandi ? '✅ Kopyalandı!' : '📋 Paylaş'}
                                </button>
                            </div>
                        </div>

                        {/* Kuponlarım */}
                        <div>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🎫 Kuponlarım
                            </h4>

                            {puanBilgileri.kuponlarim?.length > 0 ? (
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {puanBilgileri.kuponlarim.map((kupon, i) => (
                                        <div key={i} style={{
                                            background: 'var(--bg-body)',
                                            borderRadius: '12px',
                                            padding: '15px',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{kupon.baslik}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
                                                    Kod: <code style={{ background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px' }}>{kupon.kod}</code>
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'var(--primary)',
                                                color: 'white',
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                fontWeight: 'bold'
                                            }}>
                                                {kupon.tip === 'yuzde' ? `%${kupon.deger}` : `${kupon.deger} ₺`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '30px',
                                    background: 'var(--bg-body)',
                                    borderRadius: '12px',
                                    color: 'var(--text-sub)'
                                }}>
                                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🎫</span>
                                    <p style={{ margin: 0 }}>Henüz kuponunuz yok</p>
                                    <small>Sipariş vererek kupon kazanabilirsiniz!</small>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 1. PROFİL BİLGİLERİ - Mevcut kod aynen kalıyor */}
                {aktifSekme === 'profil' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div style={{ background: 'var(--bg-body)', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📧 Kayıtlı E-posta</div>
                            <div style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: '500' }}>{user?.email}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '5px' }}>E-posta değiştirmek için Güvenlik sekmesini kullanın</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>👤 Ad Soyad</label>
                                <input value={adSoyad} onChange={e => setAdSoyad(e.target.value)} placeholder="Adınız Soyadınız" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>📱 Telefon Numarası</label>
                                <input value={telefon} onChange={e => setTelefon(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="0532 123 45 67" style={inputStyle} maxLength={15} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>🎂 Doğum Tarihi (Opsiyonel)</label>
                            <input type="date" value={dogumTarihi} onChange={e => setDogumTarihi(e.target.value)} style={inputStyle} />
                        </div>
                        <button onClick={kaydet} style={{ padding: '16px', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                            ✅ DEĞİŞİKLİKLERİ KAYDET
                        </button>
                    </div>
                )}

                {/* 2. ADRES YÖNETİMİ - Mevcut kod aynen kalıyor */}
                {aktifSekme === 'adresler' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Kayıtlı Adreslerim ({adresler.length}/5)</h3>
                            {adresler.length < 5 && (
                                <button onClick={() => { adresFormTemizle(); setAdresModalAcik(true); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    + Yeni Adres Ekle
                                </button>
                            )}
                        </div>
                        {adresler.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '40px', border: '2px dashed var(--border-color)', borderRadius: '15px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏠</div>
                                <p>Henüz kayıtlı adresiniz yok.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {adresler.map(a => (
                                    <div key={a.id} style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '15px', background: 'var(--bg-body)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                                                    <span style={{ fontSize: '20px' }}>🏠</span> {a.baslik}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                    {a.sehir && <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{a.sehir}</span>}
                                                    {a.ilce && <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{a.ilce}</span>}
                                                    {a.mahalle && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{a.mahalle}</span>}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '10px' }}>
                                                    {a.sokak} No:{a.binaNo} {a.kat && `Kat:${a.kat}`} {a.daireNo && `D:${a.daireNo}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => adresDuzenle(a)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✏️</button>
                                                <button onClick={() => adresSil(a)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 🆕 4. DESTEK SEKMESİ */}
                {aktifSekme === 'destek' && (
                    <div>
                        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>🛟 Destek & Yardım</h3>

                        {/* Talep Formu */}
                        <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Yeni Talep Oluştur</h4>
                            <textarea
                                value={destekMesaj}
                                onChange={(e) => setDestekMesaj(e.target.value)}
                                placeholder="Sorununuzu veya önerinizi buraya yazın..."
                                style={{ ...inputStyle, height: '100px', resize: 'vertical', marginBottom: '15px' }}
                            />
                            <button onClick={destekGonder} style={{ padding: '12px 25px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                                GÖNDER
                            </button>
                        </div>

                        {/* Geçmiş Talepler */}
                        <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Geçmiş Taleplerim</h4>
                        {destekTalepleri.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '30px', border: '2px dashed var(--border-color)', borderRadius: '15px' }}>
                                <p>Henüz destek talebiniz bulunmuyor.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {destekTalepleri.map(talep => (
                                    <div key={talep.id} style={{ padding: '20px', background: 'var(--bg-body)', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                                                background: talep.durum === 'Cevaplandı' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: talep.durum === 'Cevaplandı' ? '#10b981' : '#f59e0b'
                                            }}>
                                                {talep.durum}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                                                {talep.tarih?.seconds ? new Date(talep.tarih.seconds * 1000).toLocaleDateString('tr-TR') : ''}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: '500', color: 'var(--text-main)', marginBottom: '10px' }}>{talep.konu}</div>
                                        {talep.cevap && (
                                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '10px', borderLeft: '3px solid var(--primary)' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>Destek Ekibi:</div>
                                                <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{talep.cevap}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. GÜVENLİK - Mevcut kod aynen kalıyor */}
                {aktifSekme === 'guvenlik' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>E-posta Güncelleme</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input value={yeniEmail} onChange={e => setYeniEmail(e.target.value)} style={inputStyle} />
                                <button onClick={emailDegistir} style={{ background: 'var(--text-main)', color: 'var(--bg-body)', border: 'none', padding: '0 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>GÜNCELLE</button>
                            </div>
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Şifre Değiştirme</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input type="password" placeholder="Mevcut Şifre" value={mevcutSifre} onChange={e => setMevcutSifre(e.target.value)} style={inputStyle} />
                                <input type="password" placeholder="Yeni Şifre" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} style={inputStyle} />
                                <button onClick={sifreDegistir} style={{ padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>ŞİFREYİ YENİLE</button>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                            <button onClick={() => signOut(auth)} style={{ width: '100%', padding: '15px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                                🚪 GÜVENLİ ÇIKIŞ YAP
                            </button>
                            <button onClick={hesapSil} style={{ width: '100%', padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '15px' }}>
                                ⚠️ HESABI KALICI OLARAK SİL
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ADRES MODALI - Mevcut kod aynen kalıyor (uzun olduğu için kısalttım) */}
            {adresModalAcik && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{adresDuzenleModu ? '✏️ Adres Düzenle' : '📍 Yeni Adres Ekle'}</h3>
                            <button onClick={() => { setAdresModalAcik(false); adresFormTemizle(); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-sub)' }}>×</button>
                        </div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div><label style={labelStyle}>Adres Başlığı *</label><input value={adresForm.baslik} onChange={e => setAdresForm({ ...adresForm, baslik: e.target.value })} placeholder="Örn: Ev, İş" style={inputStyle} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div><label style={labelStyle}>Teslim Alacak Kişi *</label><input value={adresForm.adSoyad} onChange={e => setAdresForm({ ...adresForm, adSoyad: e.target.value })} placeholder="Ad Soyad" style={inputStyle} /></div>
                                <div><label style={labelStyle}>İletişim Telefonu *</label><input value={adresForm.iletisimNo} onChange={e => setAdresForm({ ...adresForm, iletisimNo: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="05XX XXX XX XX" style={inputStyle} /></div>
                            </div>
                            <div><label style={labelStyle}>Şehir *</label><select value={adresForm.sehirKey} onChange={e => sehirDegistir(e.target.value)} style={selectStyle}><option value="">-- Şehir Seçin --</option>{Object.entries(merkeziBolgeler).map(([key, sehir]) => (<option key={key} value={key}>{sehir.ad || isimDuzelt(key)}</option>))}</select></div>
                            <div><label style={labelStyle}>İlçe *</label><select value={adresForm.ilceKey} onChange={e => ilceDegistir(e.target.value)} style={selectStyle} disabled={!adresForm.sehirKey}><option value="">-- İlçe Seçin --</option>{getMevcutIlcelerDizi().map(([key, data]) => (<option key={key} value={key}>{data.ad || isimDuzelt(key)}</option>))}</select></div>
                            <div><label style={labelStyle}>Mahalle *</label><select value={adresForm.mahalle} onChange={e => setAdresForm({ ...adresForm, mahalle: e.target.value })} style={selectStyle} disabled={!adresForm.ilceKey}><option value="">-- Mahalle Seçin --</option>{getMevcutMahalleler().map((m, i) => (<option key={i} value={m}>{m}</option>))}</select></div>
                            <div><label style={labelStyle}>Sokak / Cadde *</label><input value={adresForm.sokak} onChange={e => setAdresForm({ ...adresForm, sokak: e.target.value })} style={inputStyle} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div><label style={labelStyle}>Bina No *</label><input value={adresForm.binaNo} onChange={e => setAdresForm({ ...adresForm, binaNo: e.target.value })} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Kat</label><input value={adresForm.kat} onChange={e => setAdresForm({ ...adresForm, kat: e.target.value })} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Daire</label><input value={adresForm.daireNo} onChange={e => setAdresForm({ ...adresForm, daireNo: e.target.value })} style={inputStyle} /></div>
                            </div>
                            <div><label style={labelStyle}>Adres Tarifi</label><textarea value={adresForm.tarif} onChange={e => setAdresForm({ ...adresForm, tarif: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'none' }} /></div>
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setAdresModalAcik(false); adresFormTemizle(); }} style={{ flex: 1, padding: '15px', background: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>İptal</button>
                            <button onClick={adresKaydet} style={{ flex: 2, padding: '15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>{adresDuzenleModu ? '✅ Güncelle' : '✅ Kaydet'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profil;