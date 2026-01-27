import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, facebookProvider } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signInWithPopup,
    sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, increment, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// reCAPTCHA Site Key (Test key - production'da değiştirin)
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

// Güvenlik Sabitleri
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 dakika (ms)

function Login() {
    const navigate = useNavigate();

    // === ANA STATE'LER ===
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [telefon, setTelefon] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // === BAKIM MODU STATE === (Kaldırıldı - artık rol bazlı kontrol yapılıyor)

    // === 2FA STATE'LER ===
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [pending2FAUser, setPending2FAUser] = useState(null);

    // === GÜVENLİK STATE'LER ===
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // 🆕 REFERANS STATE
    const [referansKodu, setReferansKodu] = useState('');
    const [referansGecerli, setReferansGecerli] = useState(null); // null, true, false
    const [legalApproved, setLegalApproved] = useState(false); // 🆕 Legal Onay State

    // === EFFECTS ===

    // Mount animasyonu
    useEffect(() => {
        setMounted(true);
        loadSecurityState();
    }, []);

    // 🆕 URL'den referans kodu al
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            setReferansKodu(ref.toUpperCase());
            setIsRegister(true); // Kayıt formuna geç
        }
    }, []);

    // Lockout kontrolü
    useEffect(() => {
        if (lockoutUntil) {
            const now = Date.now();
            if (now < lockoutUntil) {
                setIsLocked(true);
                const timer = setTimeout(() => {
                    setIsLocked(false);
                    setLockoutUntil(null);
                    setLoginAttempts(0);
                    localStorage.removeItem('loginLockout');
                    localStorage.removeItem('loginAttempts');
                }, lockoutUntil - now);
                return () => clearTimeout(timer);
            } else {
                setIsLocked(false);
                setLockoutUntil(null);
                setLoginAttempts(0);
                localStorage.removeItem('loginLockout');
                localStorage.removeItem('loginAttempts');
            }
        }
    }, [lockoutUntil]);

    // === BAKIM MODU KONTROLÜ === (Kaldırıldı - artık giriş sırasında rol bazlı kontrol yapılıyor)

    // === GÜVENLİK FONKSİYONLARI ===

    // LocalStorage'dan güvenlik durumunu yükle
    const loadSecurityState = () => {
        const savedAttempts = localStorage.getItem('loginAttempts');
        const savedLockout = localStorage.getItem('loginLockout');

        if (savedAttempts) {
            setLoginAttempts(parseInt(savedAttempts));
        }
        if (savedLockout) {
            const lockoutTime = parseInt(savedLockout);
            if (Date.now() < lockoutTime) {
                setLockoutUntil(lockoutTime);
                setIsLocked(true);
            } else {
                localStorage.removeItem('loginLockout');
                localStorage.removeItem('loginAttempts');
            }
        }
    };

    // Başarısız giriş denemesini kaydet
    const recordFailedAttempt = async (emailUsed) => {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());

        // Firestore'a da kaydet (şüpheli aktivite takibi için)
        try {
            const securityRef = doc(db, "guvenlik_loglari", emailUsed.replace(/[.@]/g, '_'));
            await setDoc(securityRef, {
                email: emailUsed,
                sonDeneme: serverTimestamp(),
                basarisizDeneme: increment(1),
                ipAdresi: "client-side", // Server-side'da alınabilir
                tarayici: navigator.userAgent
            }, { merge: true });
        } catch (e) {
            // Güvenlik logu yazılamadı (sessiz hata)
        }

        // Limit aşıldıysa kilitle
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockTime = Date.now() + LOCKOUT_DURATION;
            setLockoutUntil(lockTime);
            setIsLocked(true);
            localStorage.setItem('loginLockout', lockTime.toString());
            setError(`🔒 Çok fazla başarısız deneme! ${Math.ceil(LOCKOUT_DURATION / 60000)} dakika bekleyin.`);
        }
    };

    // Başarılı girişte sayacı sıfırla
    const resetAttempts = () => {
        setLoginAttempts(0);
        setIsLocked(false);
        setLockoutUntil(null);
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginLockout');
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

    // 🆕 REFERANS KODU DOĞRULA
    const referansDogrula = async (kod) => {
        if (!kod || kod.length < 6) {
            setReferansGecerli(null);
            return null;
        }

        try {
            const usersQuery = query(
                collection(db, "kullanicilar"),
                where("referansKodu", "==", kod.toUpperCase())
            );
            const snap = await getDocs(usersQuery);

            if (!snap.empty) {
                setReferansGecerli(true);
                return snap.docs[0].id; // Referans veren kullanıcının ID'si
            } else {
                setReferansGecerli(false);
                return null;
            }
        } catch (err) {
            console.error("Referans doğrulama hatası:", err);
            setReferansGecerli(false);
            return null;
        }
    };

    // reCAPTCHA doğrulama
    const executeRecaptcha = async (action) => {
        return new Promise((resolve) => {
            if (window.grecaptcha) {
                window.grecaptcha.ready(async () => {
                    try {
                        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
                        resolve(token);
                    } catch (err) {
                        console.error("reCAPTCHA hatası:", err);
                        resolve(null); // Hata olsa bile devam et (kullanıcı deneyimi için)
                    }
                });
            } else {
                resolve(null);
            }
        });
    };

    // === YARDIMCI FONKSİYONLAR ===

    const normalizeEmail = (email) => {
        return email
            .toLowerCase()
            .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/İ/g, 'i').replace(/Ğ/g, 'g').replace(/Ü/g, 'u')
            .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
            .trim();
    };

    const formatTelefon = (value) => {
        const numbers = value.replace(/\D/g, '');
        const limited = numbers.slice(0, 11);
        if (limited.length <= 4) return limited;
        if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
        if (limited.length <= 9) return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
        return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7, 9)} ${limited.slice(9)}`;
    };

    const validateTelefon = (tel) => {
        const temiz = tel.replace(/\D/g, '');
        return temiz.length === 10 || temiz.length === 11;
    };

    const validateForm = () => {
        const normalizedEmail = normalizeEmail(email);

        if (isRegister && name.trim().length < 2) {
            setError("Ad Soyad en az 2 karakter olmalıdır.");
            return false;
        }
        if (isRegister && !validateTelefon(telefon)) {
            setError("Geçerli bir telefon numarası giriniz.");
            return false;
        }
        if (isRegister && !legalApproved) {
            setError("Lütfen KVKK, Gizlilik Politikası ve Kullanım Şartlarını onaylayınız.");
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
            setError("Geçerli bir email adresi giriniz.");
            return false;
        }
        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return false;
        }
        return true;
    };

    // Kalan bekleme süresini formatla
    const formatRemainingTime = () => {
        if (!lockoutUntil) return "";
        const remaining = Math.max(0, lockoutUntil - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // === KULLANICI KAYIT/KONTROL ===

    const createOrUpdateUser = async (user, additionalData = {}) => {
        const userRef = doc(db, "kullanicilar", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Yeni kullanıcı oluştur
            await setDoc(userRef, {
                uid: user.uid,
                adSoyad: user.displayName || additionalData.name || "",
                email: user.email,
                telefon: additionalData.telefon || "",
                rol: "musteri",
                adresler: [],
                favoriler: [],
                favoriRestoranlar: [],
                olusturulmaTarihi: serverTimestamp(),
                sonGiris: serverTimestamp(),
                banliMi: false,
                profilResmi: user.photoURL || null,
                girisYontemi: additionalData.provider || "email",
                ikiFactorAktif: false
            });
            return { isNew: true, userData: null };
        } else {
            // Mevcut kullanıcıyı güncelle
            await updateDoc(userRef, {
                sonGiris: serverTimestamp()
            });
            return { isNew: false, userData: userSnap.data() };
        }
    };

    // === GOOGLE İLE GİRİŞ ===
    const handleGoogleLogin = async () => {
        if (isLocked) {
            setError(`🔒 Hesabınız geçici olarak kilitlendi. Kalan süre: ${formatRemainingTime()}`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            // reCAPTCHA kontrolü
            await executeRecaptcha('google_login');

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Kullanıcıyı kontrol et/oluştur
            const { userData } = await createOrUpdateUser(user, { provider: 'google' });

            // Ban kontrolü
            if (userData?.banliMi) {
                setError("⛔ Hesabınız erişime engellenmiştir.");
                await auth.signOut();
                setLoading(false);
                return;
            }

            // 🆕 BAKIM MODU KONTROLÜ (Rol Bazlı) - Google
            try {
                const settingsDoc = await getDoc(doc(db, "sistem", "ayarlar"));
                if (settingsDoc.exists()) {
                    const settings = settingsDoc.data();
                    if (settings.bakimModu && userData?.rol === "musteri") {
                        setError("⚠️ " + (settings.bakimMesaji || "Sistem şu anda bakımda. Lütfen daha sonra tekrar deneyin."));
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                // Bakım modu hatası yutuldu
            }

            resetAttempts();
            setSuccess("🚀 Google ile giriş başarılı!");

            // Yönlendirme
            setTimeout(() => {
                if (userData?.rol === "superadmin") navigate("/admin");
                else if (userData?.rol === "restoran") navigate("/magaza-paneli");
                else navigate("/");
            }, 1500);

        } catch (err) {
            console.error("Google giriş hatası:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError("Giriş iptal edildi.");
            } else if (err.code === 'auth/account-exists-with-different-credential') {
                setError("Bu email başka bir yöntemle kayıtlı. Lütfen o yöntemi kullanın.");
            } else {
                setError("Google ile giriş başarısız: " + err.message);
                await recordFailedAttempt(email || "google-attempt");
            }
        } finally {
            setLoading(false);
        }
    };

    // === FACEBOOK İLE GİRİŞ ===
    const handleFacebookLogin = async () => {
        if (isLocked) {
            setError(`🔒 Hesabınız geçici olarak kilitlendi. Kalan süre: ${formatRemainingTime()}`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            await executeRecaptcha('facebook_login');

            const result = await signInWithPopup(auth, facebookProvider);
            const user = result.user;

            const { userData } = await createOrUpdateUser(user, { provider: 'facebook' });

            if (userData?.banliMi) {
                setError("⛔ Hesabınız erişime engellenmiştir.");
                await auth.signOut();
                setLoading(false);
                return;
            }

            // 🆕 BAKIM MODU KONTROLÜ (Rol Bazlı) - Facebook
            try {
                const settingsDoc = await getDoc(doc(db, "sistem", "ayarlar"));
                if (settingsDoc.exists()) {
                    const settings = settingsDoc.data();
                    if (settings.bakimModu && userData?.rol === "musteri") {
                        setError("⚠️ " + (settings.bakimMesaji || "Sistem şu anda bakımda. Lütfen daha sonra tekrar deneyin."));
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                // Bakım modu hatası yutuldu
            }

            resetAttempts();
            setSuccess("🚀 Facebook ile giriş başarılı!");

            setTimeout(() => {
                if (userData?.rol === "superadmin") navigate("/admin");
                else if (userData?.rol === "restoran") navigate("/magaza-paneli");
                else navigate("/");
            }, 1500);

        } catch (err) {
            console.error("Facebook giriş hatası:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError("Giriş iptal edildi.");
            } else if (err.code === 'auth/account-exists-with-different-credential') {
                setError("Bu email başka bir yöntemle kayıtlı.");
            } else {
                setError("Facebook ile giriş başarısız: " + err.message);
                await recordFailedAttempt(email || "facebook-attempt");
            }
        } finally {
            setLoading(false);
        }
    };

    // === ŞİFRE SIFIRLAMA ===
    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            setError("Lütfen email adresinizi girin.");
            return;
        }

        const normalizedEmail = normalizeEmail(email);

        if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
            setError("Geçerli bir email adresi giriniz.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await executeRecaptcha('forgot_password');
            await sendPasswordResetEmail(auth, normalizedEmail);
            setSuccess("📧 Şifre sıfırlama bağlantısı email adresinize gönderildi!");
            setShowForgotPassword(false);
            setTimeout(() => setSuccess(""), 5000);
        } catch (err) {
            console.error("Şifre sıfırlama hatası:", err);
            let mesaj = "Şifre sıfırlama bağlantısı gönderilemedi.";
            if (err.code === "auth/user-not-found") mesaj = "Bu email ile kayıtlı kullanıcı bulunamadı.";
            else if (err.code === "auth/invalid-email") mesaj = "Geçersiz email formatı.";
            else if (err.code === "auth/too-many-requests") mesaj = "Çok fazla deneme. Lütfen bekleyin.";
            setError(mesaj);
        } finally {
            setLoading(false);
        }
    };

    // === ANA GİRİŞ/KAYIT FONKSİYONU ===
    const handleAuth = async (e) => {
        e.preventDefault();

        // Kilit kontrolü
        if (isLocked) {
            setError(`🔒 Hesabınız geçici olarak kilitlendi. Kalan süre: ${formatRemainingTime()}`);
            return;
        }

        setError("");
        setSuccess("");

        if (!validateForm()) return;

        setLoading(true);
        const normalizedEmail = normalizeEmail(email);

        try {
            // reCAPTCHA kontrolü
            const recaptchaToken = await executeRecaptcha(isRegister ? 'register' : 'login');

            if (!recaptchaToken && process.env.NODE_ENV === 'production') {
                setError("Güvenlik doğrulaması başarısız. Sayfayı yenileyin.");
                setLoading(false);
                return;
            }

            if (isRegister) {
                // === KAYIT ===

                // 🆕 BAKIM MODU KONTROLÜ - Kayıt için
                // Bakım modundayken yeni müşteri kaydı engellenir
                try {
                    const settingsDoc = await getDoc(doc(db, "sistem", "ayarlar"));
                    if (settingsDoc.exists()) {
                        const settings = settingsDoc.data();
                        if (settings.bakimModu) {
                            setError("⚠️ " + (settings.bakimMesaji || "Sistem şu anda bakımda. Lütfen daha sonra tekrar deneyin."));
                            setLoading(false);
                            return;
                        }
                    }
                } catch (err) {
                    // Bakım modu hatası yutuldu
                }

                const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

                await updateProfile(res.user, { displayName: name });

                // 🆕 Referans kodunu doğrula ve davet edeni bul
                let davetEdenId = null;
                if (referansKodu) {
                    davetEdenId = await referansDogrula(referansKodu);
                }

                // 🆕 Yeni referans kodu oluştur
                const yeniReferansKodu = generateReferansKodu(res.user.uid);

                // Platform ayarlarını çek (bonus puanlar için)
                let bonusPuan = 50; // varsayılan
                let yeniUyeKuponuKod = null;
                try {
                    const ayarlarSnap = await getDoc(doc(db, "sistem", "ayarlar"));
                    if (ayarlarSnap.exists()) {
                        const ayarlar = ayarlarSnap.data();
                        bonusPuan = ayarlar.yeniUyeBonusu || 50;
                        yeniUyeKuponuKod = ayarlar.yeniUyeKuponu;
                    }
                } catch (e) { }

                // 🆕 Yeni Üye Kuponunu Hazırla
                let baslangicKuponlari = [];
                if (yeniUyeKuponuKod) {
                    try {
                        const kQuery = query(collection(db, "kuponlar"), where("kod", "==", yeniUyeKuponuKod));
                        const kSnap = await getDocs(kQuery);
                        if (!kSnap.empty) {
                            const kData = kSnap.docs[0].data();
                            baslangicKuponlari.push({
                                kod: kData.kod,
                                baslik: "Hoşgeldin Hediyesi 🎁",
                                deger: kData.deger,
                                tip: kData.tip,
                                minSepet: kData.minSepet || 0,
                                eklenmeTarihi: new Date().toISOString()
                            });
                        }
                    } catch (e) { console.error("Kupon ekleme hatası:", e); }
                }

                await setDoc(doc(db, "kullanicilar", res.user.uid), {
                    uid: res.user.uid,
                    adSoyad: name.trim(),
                    email: normalizedEmail,
                    telefon: telefon.replace(/\D/g, ''),
                    telefonFormatli: telefon,
                    rol: "musteri",
                    adresler: [],
                    favoriler: [],
                    favoriRestoranlar: [],
                    olusturulmaTarihi: serverTimestamp(),
                    sonGiris: serverTimestamp(),
                    banliMi: false,
                    girisYontemi: "email",
                    ikiFactorAktif: false,
                    // 🆕 Puan & Referans
                    puanBakiye: bonusPuan,
                    toplamKazanilanPuan: bonusPuan,
                    referansKodu: yeniReferansKodu,
                    davetEden: davetEdenId,
                    streakSayisi: 0,
                    kuponlarim: baslangicKuponlari // 🆕 Kupon eklendi
                });

                // 🆕 Hoşgeldin puanı geçmişe ekle
                await addDoc(collection(db, "puan_gecmisi"), {
                    kullaniciId: res.user.uid,
                    tip: 'kazanim',
                    miktar: bonusPuan,
                    aciklama: 'Hoşgeldin Bonusu 🎉',
                    tarih: serverTimestamp()
                });

                // 🆕 Davet edene de bonus ver
                if (davetEdenId) {
                    try {
                        let referansBonusu = 100;
                        const ayarlarSnap = await getDoc(doc(db, "sistem", "ayarlar"));
                        if (ayarlarSnap.exists()) {
                            referansBonusu = ayarlarSnap.data().referansBonusu || 100;
                        }

                        await updateDoc(doc(db, "kullanicilar", davetEdenId), {
                            puanBakiye: increment(referansBonusu),
                            toplamKazanilanPuan: increment(referansBonusu)
                        });

                        await addDoc(collection(db, "puan_gecmisi"), {
                            kullaniciId: davetEdenId,
                            tip: 'kazanim',
                            miktar: referansBonusu,
                            aciklama: `Referans Bonusu (${name.trim()})`,
                            tarih: serverTimestamp()
                        });
                    } catch (e) {
                        console.error("Referans bonusu verilemedi:", e);
                    }
                }

                // 🆕 Email doğrulama gönder
                await sendEmailVerification(res.user);
                await auth.signOut(); // Doğrulama yapılana kadar girişi engelle

                resetAttempts();
                setSuccess(`🎉 Hesabınız oluşturuldu! Lütfen ${normalizedEmail} adresine gönderilen doğrulama linkini onaylayın.`);
                setIsRegister(false);

            } else {
                // === GİRİŞ ===
                const res = await signInWithEmailAndPassword(auth, normalizedEmail, password);

                // Email Doğrulama: Kullanıcı deneyimi için devre dışı bırakıldı
                // if (!res.user.emailVerified) { ... }

                const userDoc = await getDoc(doc(db, "kullanicilar", res.user.uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    // Ban kontrolü
                    if (userData.banliMi) {
                        setError("⛔ Hesabınız erişime engellenmiştir.");
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }

                    // 🆕 BAKIM MODU KONTROLÜ (Rol Bazlı)
                    // Admin ve restoran sahipleri bakım modunda da giriş yapabilir
                    // Sadece müşteriler engellenir
                    try {
                        const settingsDoc = await getDoc(doc(db, "sistem", "ayarlar"));
                        if (settingsDoc.exists()) {
                            const settings = settingsDoc.data();
                            if (settings.bakimModu && userData.rol === "musteri") {
                                setError("⚠️ " + (settings.bakimMesaji || "Sistem şu anda bakımda. Lütfen daha sonra tekrar deneyin."));
                                await auth.signOut();
                                setLoading(false);
                                return;
                            }
                        }
                    } catch (err) {
                        // Bakım modu hatası yutuldu
                    }

                    // 2FA kontrolü
                    if (userData.ikiFactorAktif) {
                        setPending2FAUser({ user: res.user, userData });
                        setShow2FAModal(true);
                        // TODO: Email ile kod gönder
                        setLoading(false);
                        return;
                    }

                    // Son giriş güncelle
                    await updateDoc(doc(db, "kullanicilar", res.user.uid), {
                        sonGiris: serverTimestamp()
                    });

                    resetAttempts();
                    setSuccess("🚀 Giriş başarılı!");

                    setTimeout(() => {
                        if (userData.rol === "superadmin") navigate("/admin");
                        else if (userData.rol === "restoran") navigate("/magaza-paneli");
                        else navigate("/");
                    }, 1500);
                } else {
                    resetAttempts();
                    setSuccess("🚀 Giriş başarılı!");
                    setTimeout(() => navigate("/"), 1500);
                }
            }
        } catch (err) {
            console.error(err);
            let mesaj = "Bir hata oluştu.";

            if (err.code === "auth/user-not-found") {
                mesaj = "Bu email ile kayıtlı kullanıcı bulunamadı.";
                await recordFailedAttempt(normalizedEmail);
            } else if (err.code === "auth/wrong-password") {
                mesaj = "Hatalı şifre girdiniz.";
                await recordFailedAttempt(normalizedEmail);
            } else if (err.code === "auth/email-already-in-use") {
                mesaj = "Bu email zaten kullanımda.";
            } else if (err.code === "auth/weak-password") {
                mesaj = "Şifre en az 6 karakter olmalı.";
            } else if (err.code === "auth/too-many-requests") {
                mesaj = "Çok fazla deneme. Firebase tarafından engellendi.";
                setIsLocked(true);
            } else if (err.code === "auth/invalid-email") {
                mesaj = "Geçersiz email formatı.";
            }

            setError(mesaj);
        } finally {
            setLoading(false);
        }
    };

    // === 2FA DOĞRULAMA (Basit Email Kodu) ===
    const handle2FAVerify = async () => {
        // TODO: Gerçek 2FA implementasyonu
        // Şimdilik placeholder
        if (verificationCode === "123456") { // Test kodu
            if (pending2FAUser) {
                resetAttempts();
                setSuccess("🚀 Giriş başarılı!");
                setShow2FAModal(false);

                const { userData } = pending2FAUser;
                setTimeout(() => {
                    if (userData?.rol === "superadmin") navigate("/admin");
                    else if (userData?.rol === "restoran") navigate("/magaza-paneli");
                    else navigate("/");
                }, 1500);
            }
        } else {
            setError("Geçersiz doğrulama kodu!");
        }
    };

    // === RENDER ===

    return (
        <div style={styles.container}>
            {/* Arka Plan Animasyonları */}
            <div style={styles.backgroundAnimation}>
                <div style={styles.floatingShape1}></div>
                <div style={styles.floatingShape2}></div>
                <div style={styles.floatingShape3}></div>
            </div>

            {/* Ana Sayfa Butonu */}
            <button
                onClick={() => navigate('/')}
                style={styles.homeButton}
                className="home-btn"
            >
                <span style={styles.homeIcon}>←</span>
                Ana Sayfa
            </button>

            {/* Sol Panel - Marka Alanı */}
            <div style={{
                ...styles.brandPanel,
                transform: mounted ? 'translateX(0)' : 'translateX(-100%)'
            }} className="brand-panel">
                <div style={styles.brandContent}>
                    <div style={styles.logoContainer}>
                        <div style={styles.logo}>
                            <span style={styles.logoIcon}>⚡</span>
                        </div>
                        <h1 style={styles.brandName}>RotasyonYemek</h1>
                        <div style={styles.brandLine}></div>
                    </div>

                    <div style={styles.sloganContainer}>
                        <h2 style={styles.slogan}>
                            Lezzet kapına<br />
                            <span style={styles.sloganHighlight}>gelsin.</span>
                        </h2>
                        <p style={styles.sloganDesc}>
                            Binlerce restoran, milyonlarca lezzet.<br />
                            Sıcak, hızlı ve güvenilir teslimat.
                        </p>
                    </div>

                    <div style={styles.features}>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>🚀</span>
                            <span>Hızlı Teslimat</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>🔒</span>
                            <span>Güvenli Ödeme</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>⭐</span>
                            <span>Kaliteli Hizmet</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sağ Panel - Form Alanı */}
            <div style={{
                ...styles.formPanel,
                transform: mounted ? 'translateX(0)' : 'translateX(100%)'
            }} className="form-panel">
                <div style={styles.formContainer}>
                    {/* Form Header */}
                    <div style={styles.formHeader}>
                        <h2 style={styles.formTitle}>
                            {showForgotPassword ? "Şifre Sıfırla" : (isRegister ? "Aramıza Katıl" : "Tekrar Hoşgeldin")}
                        </h2>
                        <p style={styles.formSubtitle}>
                            {showForgotPassword
                                ? "Email adresinizi girin, şifre sıfırlama bağlantısı gönderelim."
                                : (isRegister
                                    ? "Hemen üye ol, özel fırsatları kaçırma!"
                                    : "Hesabına giriş yap, siparişine devam et.")}
                        </p>
                    </div>

                    {/* Kilit Uyarısı */}
                    {isLocked && (
                        <div style={styles.lockWarning}>
                            <span style={styles.lockIcon}>🔒</span>
                            <div>
                                <strong>Hesap Geçici Olarak Kilitlendi</strong>
                                <p>Çok fazla başarısız deneme. Kalan süre: <strong>{formatRemainingTime()}</strong></p>
                            </div>
                        </div>
                    )}

                    {/* Deneme Sayacı */}
                    {loginAttempts > 0 && !isLocked && !isRegister && (
                        <div style={styles.attemptWarning}>
                            ⚠️ {MAX_LOGIN_ATTEMPTS - loginAttempts} deneme hakkınız kaldı
                        </div>
                    )}

                    {/* Hata/Başarı Mesajları */}
                    {error && (
                        <div style={styles.errorContainer}>
                            <span style={styles.errorIcon}>⚠️</span>
                            <span style={styles.errorText}>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div style={styles.successContainer}>
                            <span style={styles.successIcon}>✅</span>
                            <span style={styles.successText}>{success}</span>
                        </div>
                    )}

                    {/* Sosyal Giriş Butonları */}
                    {!showForgotPassword && !isRegister && (
                        <div style={styles.socialLogin}>
                            <button
                                onClick={handleGoogleLogin}
                                style={styles.googleButton}
                                disabled={loading || isLocked}
                                className="social-btn"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Google ile Giriş</span>
                            </button>

                            <button
                                onClick={handleFacebookLogin}
                                style={styles.facebookButton}
                                disabled={loading || isLocked}
                                className="social-btn"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                <span>Facebook ile Giriş</span>
                            </button>

                            <div style={styles.divider}>
                                <span style={styles.dividerLine}></span>
                                <span style={styles.dividerText}>veya</span>
                                <span style={styles.dividerLine}></span>
                            </div>
                        </div>
                    )}

                    {/* Şifremi Unuttum Formu */}
                    {showForgotPassword ? (
                        <form onSubmit={handleForgotPassword} style={styles.form}>
                            <div style={styles.inputContainer}>
                                <label style={styles.inputLabel}>E-posta Adresi</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}>📧</span>
                                    <input
                                        type="email"
                                        placeholder="ornek@email.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        style={styles.input}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    ...styles.submitButton,
                                    ...(loading ? styles.submitButtonLoading : {})
                                }}
                                disabled={loading}
                                className="submit-btn"
                            >
                                {loading ? (
                                    <div style={styles.loadingContainer}>
                                        <div style={styles.spinner}></div>
                                        <span>Gönderiliyor...</span>
                                    </div>
                                ) : (
                                    <div style={styles.buttonContent}>
                                        <span>📧</span>
                                        <span>Sıfırlama Bağlantısı Gönder</span>
                                    </div>
                                )}
                            </button>

                            <div style={styles.formFooter}>
                                <button
                                    type="button"
                                    onClick={() => { setShowForgotPassword(false); setError(""); setSuccess(""); }}
                                    style={styles.switchButton}
                                >
                                    ← Giriş ekranına dön
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Normal Form */
                        <form onSubmit={handleAuth} style={styles.form}>
                            {isRegister && (
                                <>
                                    <div style={styles.inputContainer}>
                                        <label style={styles.inputLabel}>Ad Soyad</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}>👤</span>
                                            <input
                                                type="text"
                                                placeholder="Adınız Soyadınız"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                style={styles.input}
                                                className="form-input"
                                                required={isRegister}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.inputContainer}>
                                        <label style={styles.inputLabel}>Telefon Numarası</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}>📱</span>
                                            <input
                                                type="tel"
                                                placeholder="0532 123 45 67"
                                                value={telefon}
                                                onChange={(e) => setTelefon(formatTelefon(e.target.value))}
                                                style={styles.input}
                                                className="form-input"
                                                required={isRegister}
                                                maxLength={15}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>

                                    {/* 🆕 Referans Kodu (Kayıt için) */}
                                    <div style={styles.inputContainer}>
                                        <label style={styles.inputLabel}>Referans Kodu (Opsiyonel)</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}>🎁</span>
                                            <input
                                                type="text"
                                                placeholder="ABCD12"
                                                value={referansKodu}
                                                onChange={(e) => {
                                                    const kod = e.target.value.toUpperCase().slice(0, 8);
                                                    setReferansKodu(kod);
                                                    if (kod.length >= 6) {
                                                        referansDogrula(kod);
                                                    } else {
                                                        setReferansGecerli(null);
                                                    }
                                                }}
                                                style={{
                                                    ...styles.input,
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '2px',
                                                    textTransform: 'uppercase',
                                                    borderColor: referansGecerli === true ? '#22c55e' :
                                                        referansGecerli === false ? '#ef4444' : undefined
                                                }}
                                                maxLength={8}
                                                disabled={isLocked}
                                            />
                                            {referansGecerli !== null && (
                                                <span style={{
                                                    position: 'absolute',
                                                    right: '16px',
                                                    fontSize: '18px'
                                                }}>
                                                    {referansGecerli ? '✅' : '❌'}
                                                </span>
                                            )}
                                        </div>
                                        {referansGecerli === true && (
                                            <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '5px' }}>
                                                ✅ Geçerli referans kodu! Bonus puan kazanacaksınız.
                                            </div>
                                        )}
                                        {referansGecerli === false && (
                                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>
                                                ❌ Geçersiz referans kodu
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div style={styles.inputContainer}>
                                <label style={styles.inputLabel}>E-posta Adresi</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}>📧</span>
                                    <input
                                        type="email"
                                        placeholder="ornek@email.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        style={styles.input}
                                        className="form-input"
                                        required
                                        disabled={isLocked}
                                    />
                                </div>
                                {email && email !== normalizeEmail(email) && (
                                    <div style={styles.emailHint}>
                                        💡 "{normalizeEmail(email)}" olarak düzeltilecek
                                    </div>
                                )}
                            </div>

                            <div style={styles.inputContainer}>
                                <label style={styles.inputLabel}>Şifre</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}>🔐</span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={styles.input}
                                        className="form-input"
                                        required
                                        disabled={isLocked}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={styles.passwordToggle}
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                                {!isRegister && (
                                    <div
                                        style={styles.forgotPassword}
                                        onClick={() => { setShowForgotPassword(true); setError(""); setSuccess(""); }}
                                    >
                                        Şifremi Unuttum?
                                    </div>
                                )}
                            </div>

                            {/* 🆕 Legal Onay Checkbox (Sadece Kayıt Olurken) */}
                            {isRegister && (
                                <div style={{ marginTop: '10px', marginBottom: '5px' }}>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                                        <input
                                            type="checkbox"
                                            checked={legalApproved}
                                            onChange={(e) => setLegalApproved(e.target.checked)}
                                            style={{ minWidth: '16px', height: '16px', marginTop: '2px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                            disabled={isLocked}
                                        />
                                        <span>
                                            <span style={{ color: '#3b82f6', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); alert('KVKK Aydınlatma Metni içeriği burada yer alacak...'); }}>KVKK</span>,
                                            <span style={{ color: '#3b82f6', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); alert('Gizlilik Politikası içeriği burada yer alacak...'); }}> Gizlilik Politikası</span> ve
                                            <span style={{ color: '#3b82f6', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); alert('Kullanım Şartları içeriği burada yer alacak...'); }}> Kullanım Şartları</span>'nı okudum ve kabul ediyorum.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <button
                                type="submit"
                                style={{
                                    ...styles.submitButton,
                                    ...(loading || isLocked ? styles.submitButtonLoading : {})
                                }}
                                disabled={loading || isLocked}
                                className="submit-btn"
                            >
                                {loading ? (
                                    <div style={styles.loadingContainer}>
                                        <div style={styles.spinner}></div>
                                        <span>İşlem yapılıyor...</span>
                                    </div>
                                ) : (
                                    <div style={styles.buttonContent}>
                                        <span>{isRegister ? "✨" : "🚀"}</span>
                                        <span>{isRegister ? "Kayıt Ol" : "Giriş Yap"}</span>
                                    </div>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Form Footer */}
                    {!showForgotPassword && (
                        <div style={styles.formFooter}>
                            <span style={styles.footerText}>
                                {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}
                            </span>
                            <button
                                onClick={() => {
                                    setIsRegister(!isRegister);
                                    setError("");
                                    setSuccess("");
                                    setEmail("");
                                    setPassword("");
                                    setName("");
                                    setTelefon("");
                                    setLegalApproved(false);
                                }}
                                style={styles.switchButton}
                            >
                                {isRegister ? "Giriş Yap" : "Hemen Kayıt Ol"}
                            </button>
                        </div>
                    )}

                    {/* reCAPTCHA Bilgisi */}
                    <div style={styles.recaptchaNotice}>
                        🛡️ Bu site reCAPTCHA ile korunmaktadır
                    </div>
                </div>
            </div>

            {/* 2FA Modal */}
            {show2FAModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal2FA}>
                        <h3 style={styles.modal2FATitle}>🔐 İki Faktörlü Doğrulama</h3>
                        <p style={styles.modal2FAText}>
                            Email adresinize gönderilen 6 haneli kodu girin.
                        </p>
                        <input
                            type="text"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            style={styles.codeInput}
                        />
                        <div style={styles.modal2FAButtons}>
                            <button
                                onClick={() => { setShow2FAModal(false); auth.signOut(); }}
                                style={styles.cancelButton}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handle2FAVerify}
                                style={styles.verifyButton}
                            >
                                Doğrula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .form-input:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px rgba(59, 130, 246, 0.4);
                }
                .social-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                }
                .home-btn:hover {
                    transform: translateY(-2px);
                }
                @media (max-width: 1024px) {
                    .brand-panel { display: none !important; }
                    .form-panel { flex: 1 !important; }
                }
            `}</style>
        </div>
    );
}

// === STİLLER ===
const styles = {
    // Container
    container: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: 'hidden',
        position: 'relative'
    },

    // Background
    backgroundAnimation: {
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        overflow: 'hidden',
        zIndex: 0
    },
    floatingShape1: {
        position: 'absolute',
        top: '10%', left: '5%',
        width: '100px', height: '100px',
        background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
    },
    floatingShape2: {
        position: 'absolute',
        top: '60%', right: '10%',
        width: '150px', height: '150px',
        background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
        borderRadius: '30%',
        animation: 'float 8s ease-in-out infinite reverse'
    },
    floatingShape3: {
        position: 'absolute',
        bottom: '20%', left: '20%',
        width: '80px', height: '80px',
        background: 'linear-gradient(45deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))',
        borderRadius: '20%',
        animation: 'float 10s ease-in-out infinite'
    },

    // Home Button
    homeButton: {
        position: 'absolute',
        top: '30px', left: '30px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        background: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        color: '#e2e8f0',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    homeIcon: { fontSize: '16px' },

    // Brand Panel
    brandPanel: {
        flex: '1.2',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1
    },
    brandContent: {
        textAlign: 'center',
        padding: '60px',
        maxWidth: '500px'
    },
    logoContainer: { marginBottom: '50px' },
    logo: {
        width: '120px', height: '120px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 25px',
        boxShadow: '0 25px 50px rgba(59, 130, 246, 0.3)'
    },
    logoIcon: { fontSize: '48px' },
    brandName: {
        fontSize: '42px',
        fontWeight: '900',
        color: '#ffffff',
        margin: '0 0 15px 0',
        letterSpacing: '-2px'
    },
    brandLine: {
        width: '80px', height: '4px',
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        margin: '0 auto',
        borderRadius: '2px'
    },
    sloganContainer: { marginBottom: '40px' },
    slogan: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#f1f5f9',
        lineHeight: '1.2',
        margin: '0 0 20px 0'
    },
    sloganHighlight: {
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    sloganDesc: {
        fontSize: '18px',
        color: '#94a3b8',
        lineHeight: '1.6',
        margin: 0
    },
    features: {
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        flexWrap: 'wrap'
    },
    feature: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        color: '#cbd5e1',
        fontSize: '14px'
    },
    featureIcon: { fontSize: '24px' },

    // Form Panel
    formPanel: {
        flex: '1',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1
    },
    formContainer: {
        width: '100%',
        maxWidth: '450px',
        padding: '40px'
    },
    formHeader: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    formTitle: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#ffffff',
        margin: '0 0 12px 0'
    },
    formSubtitle: {
        fontSize: '16px',
        color: '#94a3b8',
        margin: 0
    },

    // Lock Warning
    lockWarning: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        animation: 'slideIn 0.3s ease-out'
    },
    lockIcon: { fontSize: '32px' },

    attemptWarning: {
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '8px',
        padding: '10px 15px',
        marginBottom: '15px',
        fontSize: '13px',
        color: '#f59e0b',
        textAlign: 'center'
    },

    // Error & Success
    errorContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '20px',
        animation: 'slideIn 0.3s ease-out'
    },
    errorIcon: { fontSize: '18px' },
    errorText: { color: '#ef4444', fontSize: '14px', fontWeight: '500' },

    successContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '20px',
        animation: 'slideIn 0.3s ease-out'
    },
    successIcon: { fontSize: '18px' },
    successText: { color: '#10b981', fontSize: '14px', fontWeight: '500' },

    // Social Login
    socialLogin: {
        marginBottom: '25px'
    },
    googleButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '14px',
        background: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        color: '#1f2937',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        marginBottom: '12px',
        transition: 'all 0.3s ease'
    },
    facebookButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '14px',
        background: '#1877F2',
        border: 'none',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        marginBottom: '20px',
        transition: 'all 0.3s ease'
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        margin: '10px 0'
    },
    dividerLine: {
        flex: 1,
        height: '1px',
        background: '#334155'
    },
    dividerText: {
        color: '#64748b',
        fontSize: '13px'
    },

    // Form
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    inputContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    inputLabel: {
        color: '#e2e8f0',
        fontSize: '14px',
        fontWeight: '600',
        marginLeft: '4px'
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        fontSize: '16px',
        zIndex: 1
    },
    input: {
        width: '100%',
        padding: '16px 16px 16px 50px',
        background: '#1e293b',
        border: '2px solid #334155',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '16px',
        outline: 'none',
        transition: 'all 0.3s ease',
        boxSizing: 'border-box'
    },
    passwordToggle: {
        position: 'absolute',
        right: '16px',
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px'
    },
    emailHint: {
        fontSize: '12px',
        color: '#3b82f6',
        marginTop: '5px',
        marginLeft: '4px'
    },
    forgotPassword: {
        textAlign: 'right',
        color: '#3b82f6',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        marginTop: '5px'
    },

    // Submit Button
    submitButton: {
        width: '100%',
        padding: '18px',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        border: 'none',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginTop: '10px'
    },
    submitButtonLoading: {
        background: '#374151',
        cursor: 'not-allowed'
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
    },
    spinner: {
        width: '20px', height: '20px',
        border: '2px solid transparent',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    buttonContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
    },

    // Form Footer
    formFooter: {
        textAlign: 'center',
        marginTop: '25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    },
    footerText: {
        color: '#94a3b8',
        fontSize: '15px'
    },
    switchButton: {
        background: 'none',
        border: 'none',
        color: '#3b82f6',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '4px 8px'
    },

    // reCAPTCHA Notice
    recaptchaNotice: {
        textAlign: 'center',
        marginTop: '25px',
        fontSize: '11px',
        color: '#64748b'
    },

    // Maintenance Mode
    maintenanceContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#fff'
    },
    maintenanceContent: {
        textAlign: 'center',
        padding: '40px'
    },
    maintenanceIcon: {
        fontSize: '80px',
        marginBottom: '30px'
    },
    maintenanceTitle: {
        fontSize: '36px',
        fontWeight: '800',
        marginBottom: '15px'
    },
    maintenanceMessage: {
        fontSize: '18px',
        color: '#94a3b8',
        marginBottom: '30px'
    },
    maintenanceButton: {
        padding: '15px 30px',
        background: '#3b82f6',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer'
    },

    // 2FA Modal
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
    },
    modal2FA: {
        background: '#1e293b',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
    },
    modal2FATitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '15px'
    },
    modal2FAText: {
        fontSize: '14px',
        color: '#94a3b8',
        marginBottom: '25px'
    },
    codeInput: {
        width: '100%',
        padding: '20px',
        background: '#0f172a',
        border: '2px solid #334155',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '24px',
        textAlign: 'center',
        letterSpacing: '10px',
        marginBottom: '25px'
    },
    modal2FAButtons: {
        display: 'flex',
        gap: '15px'
    },
    cancelButton: {
        flex: 1,
        padding: '15px',
        background: '#334155',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    verifyButton: {
        flex: 1,
        padding: '15px',
        background: '#3b82f6',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

export default Login;