import emailjs from '@emailjs/browser';

// ==========================================
// EmailJS Konfigürasyonu - RotasyonYemek
// ==========================================
const EMAILJS_CONFIG = {
    serviceId: 'service_tl62ibl',
    publicKey: 'mcb6ZCQ066DPPFh82',
    templates: {
        siparisOnay: 'template_vo8erqs',      // Sipariş onay emaili
        siparisDurum: 'template_88gkjfb',     // Durum değişikliği emaili
    }
};

// EmailJS'i başlat
emailjs.init(EMAILJS_CONFIG.publicKey);

// ==========================================
// Sipariş Onay Emaili
// ==========================================
export const siparisOnayEmaili = async (siparisData) => {
    try {
        const templateParams = {
            to_email: siparisData.musteriEmail,
            musteri_ad: siparisData.musteriAd?.split('@')[0] || 'Değerli Müşterimiz',
            siparis_no: siparisData.siparisId?.slice(-6).toUpperCase(),
            restoran_ad: siparisData.restoranAd,
            toplam_tutar: siparisData.toplamTutar,
            adres: siparisData.adres,
            yemekler: siparisData.yemekler?.map(y => `${y.adet}x ${y.ad}`).join(', ')
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.siparisOnay,
            templateParams
        );


        return { success: true, response };
    } catch (error) {
        console.error('❌ Email gönderme hatası:', error);
        return { success: false, error };
    }
};

// ==========================================
// Sipariş Durum Değişikliği Emaili
// ==========================================
export const siparisDurumEmaili = async (siparisData, yeniDurum) => {
    try {
        const durumMesajlari = {
            'Hazırlanıyor': '👨‍🍳 Siparişiniz şu an mutfakta hazırlanıyor!',
            'Yolda': '🛵 Siparişiniz yola çıktı! Birazdan kapınızda.',
            'Teslim Edildi': '✅ Siparişiniz teslim edildi. Afiyet olsun!',
            'İptal Edildi': '❌ Siparişiniz iptal edildi.'
        };

        const templateParams = {
            to_email: siparisData.musteriEmail || siparisData.musteriAd,
            musteri_ad: siparisData.musteriAd?.split('@')[0] || 'Değerli Müşterimiz',
            siparis_no: siparisData.id?.slice(-6).toUpperCase(),
            restoran_ad: siparisData.restoranAd,
            yeni_durum: yeniDurum,
            durum_mesaji: durumMesajlari[yeniDurum] || ''
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.siparisDurum,
            templateParams
        );


        return { success: true, response };
    } catch (error) {
        console.error('❌ Email gönderme hatası:', error);
        return { success: false, error };
    }
};