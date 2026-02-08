# 🍽️ RotasyonYemek - Restoran Yönetim ve Sipariş Platformu

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![Node](https://img.shields.io/badge/Node-Latest-339933?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 📋 İçindekiler
1. [Proje Tanımı](#proje-tanımı)
2. [Teknoloji Yığını](#teknoloji-yığını-tech-stack)
3. [Proje Yapısı](#proje-yapısı)
4. [Kurulum](#kurulum)
5. [Kullanım](#kullanım)
6. [API / Veritabanı Tabloları](#api--veritabanı-tabloları)
7. [Önemli Bileşenler](#önemli-bileşenler)
8. [Kullanıcı Rolleri ve Yetkilendirme](#kullanıcı-rolleri-ve-yetkilendirme)
9. [Geliştirme Notları](#geliştirme-notları)

---

## 🎯 Proje Tanımı

**RotasyonYemek**, modern web teknolojileri kullanılarak geliştirilen, tam işlevli bir **online yemek sipariş ve restoran yönetim platformu**dır.

### Ana Özellikler:
- **Müşteri Portalı**: Restoranları keşfetme, menü görüntüleme, yemek sipariş etme
- **Sepet Yönetimi**: Alışveriş sepeti ve siparişlerim takibi
- **Admin Paneli**: Sistem yönetimi, raporlar, finansal takip
- **Restoran Paneli**: Restoran sahipleri kendi işlemlerini yönetebilir
- **Kimlik Doğrulama**: Güvenli Supabase tabanlı auth sistemi
- **Email Bildirimleri**: Sipariş onayı ve durum güncellemeleri
- **Harita Entegrasyonu**: Restoran konumlarını görüntüleme
- **Finans Yönetimi**: Gelir takibi, komisyon hesaplama

---

## 🛠️ Teknoloji Yığını (Tech Stack)

### Frontend
| Teknoloji | Versiyon | Açıklama |
|-----------|---------|----------|
| **React** | 19.2.3 | UI bileşenleri ve state yönetimi |
| **React Router DOM** | 7.11.0 | Sayfa navigasyonu ve yönlendirmesi |
| **React Scripts** | 5.0.1 | Create React App yapı araçları |

### Veritabanı & Backend
| Teknoloji | Versiyon | Açıklama |
|-----------|---------|----------|
| **Supabase** | 2.93.3 | PostgreSQL, Authentication, Realtime |

### Harita & Görselleştirme
| Teknoloji | Versiyon | Açıklama |
|-----------|---------|----------|
| **Leaflet** | 1.9.4 | Harita kütüphanesi |
| **React Leaflet** | 5.0.0 | React bileşeni olarak Leaflet |
| **Recharts** | 3.6.0 | Grafikler ve veri görselleştirmesi |

### Utilities & Services
| Teknoloji | Versiyon | Açıklama |
|-----------|---------|----------|
| **EmailJS** | 4.4.1 | E-posta gönderimi servisi |
| **Lucide React** | 0.562.0 | İkonlar kütüphanesi |

### Testing & QA
| Teknoloji | Versiyon | Açıklama |
|-----------|---------|----------|
| **React Testing Library** | 16.3.1 | Bileşen testleri |
| **Testing Library DOM** | 10.4.1 | DOM test yardımcıları |
| **Jest DOM** | 6.9.1 | Jest matchers |

---

## 📂 Proje Yapısı

```
RotasyonYemek/
├── lib/
│   └── supabase.js                 # Supabase client yapılandırması
│
├── rotasyonyemek/                  # Ana React uygulaması
│   ├── public/
│   │   ├── index.html             # HTML ana şablonu
│   │   ├── manifest.json          # PWA manifest
│   │   └── robots.txt             # SEO yapılandırması
│   │
│   ├── src/
│   │   ├── App.js                 # Ana uygulama bileşeni ve rotalar
│   │   ├── index.js               # React DOM işleme noktası
│   │   ├── index.css              # Global stiller
│   │   │
│   │   ├── contexts/              # Durum yönetimi (State Management)
│   │   │   ├── AuthContext.js     # Kimlik doğrulama ve yetkilendirme
│   │   │   ├── AppContext.js      # Global uygulama durumu
│   │   │   └── CartContext.js     # Alışveriş sepeti yönetimi
│   │   │
│   │   ├── layouts/               # Sayfa düzenleri
│   │   │   ├── MainLayout.js      # Müşteri portalı düzeni
│   │   │   ├── AdminLayout.js     # Admin paneli düzeni
│   │   │   └── RestaurantLayout.js# Restoran paneli düzeni
│   │   │
│   │   ├── pages/                 # Sayfa bileşenleri
│   │   │   ├── auth/              # Kimlik doğrulama sayfaları
│   │   │   │   ├── Login.js
│   │   │   │   ├── ForgotPassword.js
│   │   │   │   └── ResetPassword.js
│   │   │   │
│   │   │   ├── customer/          # Müşteri portali sayfaları
│   │   │   │   ├── Home.js        # Ana sayfa / Restoran listesi
│   │   │   │   ├── RestoranDetay.js # Restoran detay sayfası
│   │   │   │   ├── Sepet.js       # Alışveriş sepeti
│   │   │   │   ├── Siparislerim.js# Siparış takibi
│   │   │   │   └── Profil.js      # Müşteri profili
│   │   │   │
│   │   │   ├── admin/             # Admin paneli
│   │   │   │   ├── Admin.js       # Ana admin sayfası
│   │   │   │   └── admin-components/
│   │   │   │       ├── Dashboard.js
│   │   │   │       ├── RestoranYonetimi.js
│   │   │   │       ├── KullaniciYonetimi.js
│   │   │   │       ├── SiparisYonetimi.js
│   │   │   │       ├── KategoriYonetimi.js
│   │   │   │       ├── BolgeYonetimi.js
│   │   │   │       ├── KomisyonYonetimi.js
│   │   │   │       ├── KuponYonetimi.js
│   │   │   │       ├── KampanyaYonetimi.js
│   │   │   │       ├── BannerYonetimi.js
│   │   │   │       ├── FinansYonetimi.js
│   │   │   │       ├── BildirimYonetimi.js
│   │   │   │       └── common/    # Ortak bileşenler
│   │   │   │
│   │   │   └── restaurant-panel/  # Restoran paneli
│   │   │       ├── RestoranPanel.js
│   │   │       └── MagazaPaneli.js
│   │   │
│   │   ├── components/            # Tekrar kullabilir bileşenler
│   │   │   ├── Navbar.js
│   │   │   ├── ChangePassword.js
│   │   │   └── common/
│   │   │
│   │   ├── services/              # İş mantığı ve API servisleri
│   │   │   ├── supabase.js        # Supabase ayarları
│   │   │   └── emailService.js    # EmailJS entegrasyonu
│   │   │
│   │   ├── styles/                # Global ve sayfa stili
│   │   │   ├── restoran.css
│   │   │   └── App.css
│   │   │
│   │   ├── assets/                # Statik dosyalar
│   │   │   └── images/
│   │   │
│   │   ├── setupTests.js          # Test konfigürasyonu
│   │   ├── reportWebVitals.js     # Performance ölçümleri
│   │   └── serviceWorkerRegistration.js # PWA servisi
│   │
│   ├── build/                     # Üretim derlemesi (npm run build)
│   ├── package.json               # Bağımlılıklar ve betikler
│   └── README.md                  # Proje belgesi
│
└── package.json                   # Ana paket yapılandırması
```

### Önemli Klasörlerin Açıklaması

| Klasör | Açıklama |
|--------|----------|
| **contexts/** | React Context API kullanarak global state yönetimi |
| **layouts/** | Sayfa şablonları ve yapıları |
| **pages/** | Tam sayfalar (components'ın aksine) |
| **admin-components/** | Admin paneli alt bileşenleri |
| **services/** | Supabase, EmailJS gibi harici servislerle iletişim |
| **assets/** | Resimler ve statik dosyalar |

---

## 💾 Kurulum

### Ön Koşullar
- **Node.js** 16.x veya üstü
- **npm** 8.x veya üstü
- **Git** (klonlama için)
- **Supabase Hesabı** (https://supabase.com)

### Adım 1: Projeyi Klonla
```bash
git clone https://github.com/yourusername/RotasyonYemek.git
cd RotasyonYemek
```

### Adım 2: Bağımlılıkları Kur
```bash
cd rotasyonyemek
npm install
```

### Adım 3: Ortam Değişkenlerini Yapılandır

`rotasyonyemek/src/services/supabase.js` dosyasını düzenle:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

Supabase ayarlarını almak için:
1. Supabase dashboard'a git
2. **Project Settings** → **API** bölümüne git
3. **Project URL** ve **anon/public key** kopyala

### Adım 4: EmailJS Yapılandırması

`rotasyonyemek/src/services/emailService.js` dosyasını aç ve EmailJS değerlerini güncelle:
```javascript
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',
    publicKey: 'YOUR_PUBLIC_KEY',
    templates: {
        siparisOnay: 'YOUR_TEMPLATE_ID',
        siparisDurum: 'YOUR_TEMPLATE_ID',
    }
};
```

EmailJS ayarlarını almak için:
1. https://www.emailjs.com/ git
2. Yeni Service ve Templates oluştur
3. **Dashboard** → **API** kısımda anahtarları bul

### Adım 5: Geliştirme Sunucusunu Başlat
```bash
npm start
```

Tarayıcı otomatik olarak `http://localhost:3000` adresinde açılacaktır.

### Adım 6: Üretim için Derleme
```bash
npm run build
```

Derlenmiş dosyalar `build/` klasörüne kaydedilecektir ve dağıtıma hazır olacaktır.

---

## 🚀 Kullanım

### Müşteri Portalı

#### 1. Kayıt & Giriş
```javascript
// src/pages/auth/Login.js
// Email/şifre ile kaydolma veya var olan hesapla giriş
```
- **Giriş URL**: `/login`
- **Şifremi Unuttum**: `/sifremi-unuttum`

#### 2. Restoran Keşfi
```javascript
// src/pages/customer/Home.js
// Tüm restoranları listele, kategori ve bölgeye göre filtrele
```

#### 3. Restoran Detayı & Menu
```javascript
// src/pages/customer/RestoranDetay.js
// Restoran bilgisi, harita konumu, menü kategorileri
```

#### 4. Sepete Ürün Ekleme
```javascript
// src/contexts/CartContext.js - addToCart fonksiyonu
const { addToCart } = useCart();
addToCart(yemekObjesi, restoranObjesi);
```

#### 5. Sipariş Oluşturma
```javascript
// src/pages/customer/Sepet.js
// Sepeti kontrol et, adres ve ödeme bilgisi gir, siparişi tamamla
```

#### 6. Siparış Takibi
```javascript
// src/pages/customer/Siparislerim.js
// Tüm siparişleri görüntüle, durumlarını takip et
```

### Admin Paneli

#### Erişim
- **Panele Giriş**: Sistem yöneticisi rolü gerekli
- **URL**: `/admin`

#### Admin Özellikleri

| Özellik | Açıklama | Components |
|---------|----------|------------|
| **Dashboard** | İstatistikler, graflar, özet bilgiler | `Dashboard.js` |
| **Restoran Yönetimi** | Restoran ekle/düzenle/sil | `RestoranYonetimi.js` |
| **Kullanıcı Yönetimi** | Rollerini yönet, hesapları sil | `KullaniciYonetimi.js` |
| **Sipariş Yönetimi** | Siparişleri görüntüle, durumlarını güncelle | `SiparisYonetimi.js` |
| **Kategori Yönetimi** | Yemek kategorileri ekle/düzenle | `KategoriYonetimi.js` |
| **Bölge Yönetimi** | Teslimat bölgeleri | `BolgeYonetimi.js` |
| **Komisyon Yönetimi** | Restoran komisyon oranları | `KomisyonYonetimi.js` |
| **Kupon Yönetimi** | İndirim kuponları | `KuponYonetimi.js` |
| **Kampanya Yönetimi** | Promosyon kampanyaları | `KampanyaYonetimi.js` |
| **Banner Yönetimi** | Ana sayfa bannerları | `BannerYonetimi.js` |
| **Finans & Hakediş** | Gelir, gider, hakediş takibi | `FinansYonetimi.js` |

### Restoran Paneli

```javascript
// src/pages/restaurant-panel/RestoranPanel.js
// Kendi restoranın yönet, ürün ekle, siparışları gör
```

---

## 📡 API / Veritabanı Tabloları

### Supabase Veritabanı Şeması

Sistem aşağıdaki tablo yapısını kullanmaktadır:

#### **kullanicilar** (Users)
```sql
- id (UUID, Primary Key)
- email (String, Unique)
- sifre_hash (String)
- rol (String) → 'musteri' | 'restoran' | 'admin'
- ad_soyad (String)
- telefon (String)
- olusturma_tarihi (Timestamp)
- guncellenme_tarihi (Timestamp)
```

#### **restoranlar** (Restaurants)
```sql
- id (UUID, Primary Key)
- ad (String)
- aciklama (Text)
- kategori (String)
- bölge_id (UUID) → Foreign Key
- sahibi_id (UUID) → Foreign Key (kullanicilar)
- enlem (Float)
- boylam (Float)
- acilis_saati (Time)
- kapanis_saati (Time)
- aktif (Boolean)
- logo_url (String)
- banner_url (String)
- olusturma_tarihi (Timestamp)
```

#### **urunler** (Products)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- ad (String)
- aciklama (Text)
- kategori_id (UUID) → Foreign Key
- fiyat (Decimal)
- durumu (String) → 'aktif' | 'pasif'
- resim_url (String)
- olusturma_tarihi (Timestamp)
```

#### **siparisler** (Orders)
```sql
- id (UUID, Primary Key)
- musteri_id (UUID) → Foreign Key
- restoran_id (UUID) → Foreign Key
- durum (String) → 'beklemede' | 'onaylandi' | 'hazirlaniyor' | 'yolda' | 'teslim_edildi' | 'iptal'
- toplam_tutar (Decimal)
- teslimat_adresi (Text)
- teslimat_tarihi (Timestamp)
- notlar (Text)
- olusturma_tarihi (Timestamp)
```

#### **siparis_detaylari** (Order Items)
```sql
- id (UUID, Primary Key)
- siparis_id (UUID) → Foreign Key
- urun_id (UUID) → Foreign Key
- adet (Integer)
- birim_fiyat (Decimal)
```

#### **kategoriler** (Categories)
```sql
- id (UUID, Primary Key)
- ad (String)
- aciklama (String)
- icon_url (String)
```

#### **bolgeler** (Regions)
```sql
- id (UUID, Primary Key)
- ad (String)
- aciklama (String)
```

#### **komisyonlar** (Commissions)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- oran (Decimal) → Örn: 15 (15%)
- minDurum (String) → minimum sipariş durumu gereksinimi
```

#### **kuponlar** (Coupons)
```sql
- id (UUID, Primary Key)
- kod (String, Unique)
- indirim_orani (Decimal)
- indirim_tutari (Decimal)
- max_kullanim (Integer)
- kullanim_sayisi (Integer, default: 0)
- gecerlilik_tarihi (Date)
- aktif (Boolean)
```

#### **sehirler** (Cities)
```sql
- id (UUID, Primary Key)
- ad (String, Unique)
- plaka (Integer)
```

#### **ilceler** (Districts)
```sql
- id (UUID, Primary Key)
- sehir_id (UUID) → Foreign Key
- ad (String)
```

#### **mahalleler** (Neighborhoods)
```sql
- id (UUID, Primary Key)
- ilce_id (UUID) → Foreign Key
- ad (String)
```

#### **restoran_bolgeleri** (Restaurant Zones)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- mahalle_id (UUID) → Foreign Key
- teslimat_ucreti (Decimal)
```

#### **bannerlar** (Banners)
```sql
- id (UUID, Primary Key)
- baslik (String)
- aciklama (Text)
- resim_url (String)
- url (String) → Tıklanınca nereye gidecek
- sira (Integer) → Görüntüleme sırası
- baslamaPeriodu (Timestamp)
- bitisPeriodu (Timestamp)
- aktif (Boolean)
```

#### **bildirimler** (Notifications)
```sql
- id (UUID, Primary Key)
- musteri_id (UUID) → Foreign Key
- baslik (String)
- mesaj (Text)
- tip (String) → 'siparis' | 'promosyon' | 'sistem'
- okundu (Boolean)
- olusturma_tarihi (Timestamp)
```

#### **yorumlar** (Reviews)
```sql
- id (UUID, Primary Key)
- musteri_id (UUID) → Foreign Key
- restoran_id (UUID) → Foreign Key
- siparis_id (UUID) → Foreign Key
- puan (Integer) → 1-5
- yorum (Text)
- olusturma_tarihi (Timestamp)
```

#### **hakedisler** (Earnings)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- ay (Integer)
- yil (Integer)
- toplam_siparis (Decimal)
- komisyon_tutari (Decimal)
- odenen_tutar (Decimal)
- kalan_tutar (Decimal)
- durum (String) → 'bekleniyor' | 'odenmek_uzere' | 'odendi'
```

#### **restoran_evraklari** (Restaurant Documents)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- ad (String) → Belge adı
- evrak_tipi (String) → 'vergi_belgesi' | 'kimlik' | 'sehircilik_ruhsati'
- dosya_url (String)
- onayli (Boolean)
- olusturma_tarihi (Timestamp)
```

#### **kampanyalar** (Campaigns)
```sql
- id (UUID, Primary Key)
- ad (String)
- aciklama (Text)
- tip (String) → 'indirim' | 'bedava_kargo' | 'hediye'
- deger (Decimal)
- baslamaPeriodu (Timestamp)
- bitisPeriodu (Timestamp)
- aktif (Boolean)
```

#### **puan_gecmisi** (Rating History)
```sql
- id (UUID, Primary Key)
- restoran_id (UUID) → Foreign Key
- ay (Integer)
- yil (Integer)
- ortalama_puan (Decimal) → 0-5
- yorum_sayisi (Integer)
```

#### **guvenlik_loglari** (Security Logs)
```sql
- id (UUID, Primary Key)
- kullanici_id (UUID) → Foreign Key
- eylem (String) → 'login' | 'logout' | 'file_upload' | 'admin_giris'
- detay (Text)
- ip_adresi (String)
- olusturma_tarihi (Timestamp)
```

#### **sistem** (System Settings)
```sql
- id (UUID, Primary Key)
- anahtar (String, Unique)
- deger (Text)
- aciklama (String)
- guncellenme_tarihi (Timestamp)
```

### API İstemci Kodu Örnekleri

#### Supabase Sorgular
```javascript
// src/services/supabase.js
import { supabase } from './supabase.js'

// Örnek: Restoranları getir
const fetchRestoranlar = async () => {
  const { data, error } = await supabase
    .from('restoranlar')
    .select('*')
    .eq('aktif', true)
  
  return { data, error }
}

// Örnek: Sipariş oluştur
const createSiparis = async (musteriId, restoranId, siparisBilgisi) => {
  const { data, error } = await supabase
    .from('siparisler')
    .insert([
      {
        musteri_id: musteriId,
        restoran_id: restoranId,
        durum: 'beklemede',
        toplam_tutar: siparisBilgisi.toplam,
        teslimat_adresi: siparisBilgisi.adres,
        notlar: siparisBilgisi.notlar
      }
    ])
  
  return { data, error }
}
```

#### Email Gönderimi
```javascript
// src/services/emailService.js
import { siparisOnayEmaili } from './emailService.js'

const siparisData = {
  musteriEmail: 'musteri@example.com',
  musteriAd: 'Ahmet',
  siparisId: 'siparis-123',
  restoranAd: 'Pizza Palace',
  toplamTutar: 45.99,
  adres: 'Istiklal Cad. No:45',
  yemekler: [
    { ad: 'Margherita Pizza', adet: 1 },
    { ad: 'Cola', adet: 2 }
  ]
}

await siparisOnayEmaili(siparisData)
```

### Common UI Bileşenleri

#### **LoadingSpinner.js**
Veri yükleme sırasında gösterilen animasyonlu spinner
```javascript
<LoadingSpinner message="Yükleniyor..." />
```
- Props: `message` (string), `size` (small/medium/large)

#### **EmptyState.js**
Veri olmadığında gösterilen boş durum bileşeni
```javascript
<EmptyState 
  icon="📭"
  title="Veri Bulunamadı"
  message="Henüz siparış vermedin"
  actionLabel="Restoran Keşfet"
  onAction={() => navigate('/')}
/>
```
- Props: `icon`, `title`, `message`, `actionLabel`, `onAction`

#### **StatusBadge.js**
Durumları renkli etiket olarak göstermek için

Desteklenen durumlar:
```javascript
// Sipariş durumları
'beklemede' → Sarı
'onaylandi' → Mavi
'hazirlaniyor' → Turuncu
'yolda' → Mor
'teslim_edildi' → Yeşil
'iptal' → Kırmızı

// Restoran durumları
'aktif' → Yeşil
'pasif' → Gri
'kapalı' → Koyu kırmızı

// Hakedişler
'bekleniyor' → Sarı
'odenmek_uzere' → Mavi
'odendi' → Yeşil
```

#### **StatsCard.js**
Dashboard'da istatistik gösterimi
```javascript
<StatsCard
  title="Toplam Siparişler"
  value={1250}
  icon="📦"
  trend={+12}
  color="blue"
/>
```
- Props: `title`, `value`, `icon`, `trend`, `color`

#### **Modal.js**
İletişim kutuları ve popup'lar
```javascript
<Modal 
  isOpen={isOpen}
  title="Onay"
  onClose={handleClose}
>
  İşlemi tamamlamak istiyor musun?
  <button onClick={handleConfirm}>Evet</button>
</Modal>
```

#### **Pagination.js**
Sayfalandırma kontrolü
```javascript
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```
- Props: `currentPage`, `totalPages`, `onPageChange`

#### **ExportButton.js**
Veriyi CSV/Excel formatında dışa aktarma
```javascript
<ExportButton 
  data={tableData}
  filename="raporlar"
  format="csv"
/>
```
- Desteklenen formatlar: `csv`, `excel`, `pdf`

#### **Toast.js**
Bildirim mesajları (başarı, hata, uyarı)
```javascript
// Kullanım (AuthContext veya herhangi bir yerde)
const { showToast } = useToast();

showToast('Başarılı!', 'success');
showToast('Hata oluştu!', 'error');
showToast('Dikkat!', 'warning');
showToast('Bilgi', 'info');
```

---

## 🧩 Önemli Bileşenler

### 1. **AuthContext** - Kimlik Doğrulama ve Rol Yönetimi
**Dosya**: `src/contexts/AuthContext.js`

**Görev**: Kullanıcı kimlik doğrulaması, oturum yönetimi ve rol kontrolü

**Sağlanan Hooks**:
```javascript
const { 
  user,              // Oturum açan kullanıcı objesi
  userRole,          // Kullanıcı rolü ('musteri', 'restoran', 'admin')
  loading,           // Yükleme durumu
  isAdmin,           // Admin mi?
  isRestoran,        // Restoran sahibi mi?
  login,             // Giriş fonksiyonu
  logout,            // Çıkış fonksiyonu
  signup,            // Kayıt fonksiyonu
} = useAuth()
```

**Önemli Özellikler**:
- Supabase Auth ile entegrasyon
- Rol tabanlı erişim kontrolü (RBAC)
- Session yönetimi
- State listener'lar

### 2. **CartContext** - Alışveriş Sepeti
**Dosya**: `src/contexts/CartContext.js`

**Görev**: Sepete ürün ekleme, çıkarma, toplam hesaplama

**Sağlanan Hooks**:
```javascript
const {
  cart,              // Sepet ürünleri array
  restoranId,        // Seçili restoran ID'si
  restoranAd,        // Seçili restoran adı
  addToCart,         // Ürün ekle
  removeFromCart,    // Ürün sayısını azalt
  deleteFromCart,    // Ürünü tamamen kaldır
  clearCart,         // Sepeti temizle
  getToplam,         // Toplam tutarı hesapla
} = useCart()
```

**Önemli Özellikler**:
- LocalStorage'da otomatik kaydetme
- Farklı restoran ürünleri için karşılaştırma
- Miktar ve fiyat hesaplamaları

### 3. **AppContext** - Global Uygulama Durumu
**Dosya**: `src/contexts/AppContext.js`

**Görev**: AuthContext'i wrapper olarak kullanır ve global durumu sağlar

```javascript
const {
  user,              // Mevcut kullanıcı
  userRole,          // Kullanıcı rolü
  loading,           // Global yükleme durumu
  isAdmin,           // Admin kontrolü
  isRestoran,        // Restoran sahibi kontrolü
} = useApp()
```

### 4. **Admin Dashboard & Components**
**Dosya**: `src/pages/admin/Admin.js` ve alt bileşenleri

**Görev**: Tam sistem yönetimi

Sağlanan sekmeler:
- 📊 Dashboard - İstatistikler
- 🏪 Restoranlar - Listeleme, ekleme, düzenleme
- 👥 Kullanıcılar - Yönetim
- 📦 Siparişler - Takip ve durumlandırma
- 🏷️ Kategoriler - Ürün kategorileri
- 📍 Bölgeler - Teslimat bölgeleri
- 💰 Komisyonlar - Ücret yönetimi
- 🎟️ Kuponlar - İndirim kodları
- 🎯 Kampanyalar - Promosyonlar
- 🖼️ Bannerlar - Web sayfası görselleri
- 🏦 Finans - Gelir/gider takibi

### 5. **EmailService** - Email Bildirimleri
**Dosya**: `src/services/emailService.js`

**Görev**: EmailJS üzerinden otomatik email gönderimi

**Fonksiyonlar**:
```javascript
// Sipariş onay emaili
siparisOnayEmaili(siparisData)

// Sipariş durumu değişim emaili
siparisDurumEmaili(siparisData, yeniDurum)

// Şifre sıfırlama emaili
sifreGuncellemeEmaili(email)
```

### 6. **Layouts** - Sayfa Şablonları

#### MainLayout
- Müşteri portalı için temel düzen
- Navbar, footer, sidebar içerir
- Customer pages'de kullanılır

#### AdminLayout
- Admin paneli için paralı tasarım
- Sidebar menü, başlık ve içerik alanı
- Admin ürünleriyle birlikte çalışır

#### RestaurantLayout
- Restoran sahibi paneli için tasarım
- Restoran spesifik özellikler

---

## 🔐 Şifre Yönetimi Akışı

RotasyonYemek sisteminde şifre yönetimi güvenli bir şekilde yapılmaktadır:

### Şifre Sıfırlama Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Login Sayfası                            │
│              (/login Route)                                  │
│                                                              │
│  Email: [____________]                                       │
│  Şifre: [____________]                                       │
│                                                              │
│  [Giriş Yap]  [Şifremi Unuttum]                            │
└──────┬───────────────────┬──────────────────────────────────┘
       │                   │
       │ (Başarılı)        │ (Tıklandı)
       │                   │
       ▼                   ▼
┌────────────────┐  ┌──────────────────────────────────────┐
│ Ana Sayfa      │  │ Şifremi Unuttum Sayfası              │
│ (/home)        │  │ (/sifremi-unuttum)                   │
│                │  │                                       │
│ Kullanıcı      │  │ Email: [_________________]           │
│ Girişi         │  │                                       │
│ Başarılı ✓     │  │ [Reset Maili Gönder]                │
│                │  │                                       │
└────────────────┘  │ Supabase: confirmPassword() çağrılır │
                    └──────────────┬───────────────────────┘
                                   │
                                   │ Email gönderilir
                                   ▼
                    ┌───────────────────────────────────────┐
                    │ Kullanıcı Mailini Kontrol Eder        │
                    │                                        │
                    │ "Şifrenizi Sıfırlamak İçin Tıklayın" │
                    │ https://app.com/sifre-sifirla         │
                    │    #access_token=...&token_hash=...   │
                    │                                        │
                    │ [Şifremi Sıfırla]                    │
                    └──────────────┬───────────────────────┘
                                   │
                                   │ Link tıklandı
                                   ▼
            ┌──────────────────────────────────────────┐
            │ Şifre Sıfırlama Sayfası                  │
            │ (/sifre-sifirla)                         │
            │                                           │
            │ ResetPassword.js                          │
            │                                           │
            │ Yeni Şifre: [__________________]         │
            │ Şifre Onayla: [__________________]       │
            │                                           │
            │ Access Token URL'den parse edilir        │
            │ Supabase: updateUser() çağrılır         │
            │                                           │
            │ [Şifremi Güncelle]                      │
            └──────────────┬───────────────────────────┘
                           │
                           │ Başarı
                           ▼
            ┌──────────────────────────────────────────┐
            │ Giriş Sayfasına Yönlendir                │
            │ (/login)                                  │
            │                                           │
            │ Başarılı Mesajı: "Şifre güncellenmiştir" │
            │                                           │
            │ Yeni şifre ile giriş yapabilirsiniz      │
            └──────────────────────────────────────────┘
```

### İlgili Dosyalar

| Dosya | Görev |
|-------|-------|
| `src/pages/auth/Login.js` | Giriş ve "Şifremi Unuttum" linki |
| `src/pages/auth/ForgotPassword.js` | Email giriş ve reset maili gönderme |
| `src/pages/auth/ResetPassword.js` | Yeni şifre belirleme |
| `src/services/emailService.js` | Reset mail şablonu |
| `src/contexts/AuthContext.js` | Supabase auth işlemleri |

### Kod Örneği

```javascript
// ForgotPassword.js
const handleResetRequest = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/sifre-sifirla`
  })
  
  if (!error) {
    showToast('Reset maili gönderildi', 'success')
  }
}

// ResetPassword.js
const handlePasswordReset = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (!error) {
    navigate('/login')
    showToast('Şifre başarıyla güncellenmiştir', 'success')
  }
}
```

### Güvenlik Notları

✅ **Yapılmış Güvenlikler:**
- Access token URL'den alınır (email link'inden)
- Token doğrulama Supabase tarafından yapılır
- Yeni şifre güvenli bağlantı üzerinden gönderilir
- Mail token'ları zamana sınırlıdır
- Başarısız deneme sonrası rate limiting uygulanır

---

## 🖥️ Frontend Sayfaları Detaylı Açıklama

### **Müşteri Portalı (Customer Pages)**

#### 1. **Home.js** - Ana Sayfa / Restoran Listesi
**Dosya**: `src/pages/customer/Home.js`

**Amaç**: Tüm restoranları listelemek, filtreleme ve arama yapmak

**State Yapısı**:
```javascript
const [restoranlar, setRestoranlar] = useState([]);       // Tüm restoranlar
const [filtreliRestoranlar, setFiltreliRestoranlar] = useState([]);
const [kategoriler, setKategoriler] = useState([]);       // Kategori listesi
const [secilenKategori, setSecilenKategori] = useState(null);
const [aramaMetni, setAramaMetni] = useState('');         // Arama input'u
const [loading, setLoading] = useState(true);
const [sehir, setSehir] = useState('Istanbul');           // Konum seçimi
```

**Context Kullanımı**:
```javascript
const { user } = useAuth();                               // Giriş yapan kullanıcı
```

**Supabase Sorguları**:
```javascript
// Tüm restoranları getir
const { data: restoranlar } = await supabase
  .from('restoranlar')
  .select(`*, kategoriler(ad)`)
  .eq('aktif', true)
  .eq('sehir', sehir)

// Kategorileri getir
const { data: kategoriler } = await supabase
  .from('kategoriler')
  .select('*')
```

**Bileşen Hiyerarşisi**:
```
Home
├── SearchFilter (Arama)
├── CategoryList (Kategori seçimi)
├── HeadlineCarousel (Bannerlar)
├── RestaurantCard (Tekrarlanan)
│   ├── RestaurantImage
│   ├── RestaurantInfo
│   └── RatingComponent
└── LoadingSpinner (Yükleme durumunda)
```

---

#### 2. **RestoranDetay.js** - Restoran Detayları
**Dosya**: `src/pages/customer/RestoranDetay.js`

**Amaç**: Restoran hakkında bilgi, menü ve ürün listesi göstermek

**State Yapısı**:
```javascript
const [restoran, setRestoran] = useState(null);           // Restoran bilgisi
const [urunler, setUrunler] = useState([]);               // Menü ürünleri
const [secilenKategori, setSecilenKategori] = useState(null);
const [urunDetay, setUrunDetay] = useState(null);         // Ürün detayları modal
const [yorumlar, setYorumlar] = useState([]);             // Müşteri yorumları
const [loading, setLoading] = useState(true);
const [harita, setHarita] = useState(null);               // Leaflet map ref
```

**Context Kullanımı**:
```javascript
const { addToCart } = useCart();                          // Sepete ekleme
const { user } = useAuth();
```

**Supabase Sorguları**:
```javascript
// Restoran detaylarını getir
const { data: restoran } = await supabase
  .from('restoranlar')
  .select('*')
  .eq('id', restoranId)
  .single()

// Ürünleri kategori ile getir
const { data: urunler } = await supabase
  .from('urunler')
  .select('*, kategoriler(ad)')
  .eq('restoran_id', restoranId)
  .eq('durumu', 'aktif')

// Yorumları getir
const { data: yorumlar } = await supabase
  .from('yorumlar')
  .select('*, kullanicilar(ad_soyad)')
  .eq('restoran_id', restoranId)
  .order('olusturma_tarihi', { ascending: false })
```

**Bileşen Hiyerarşisi**:
```
RestoranDetay
├── RestaurantHeader
│   ├── RestaurantBanner
│   ├── RestaurantInfo
│   ├── RatingAndReview
│   └── DeliveryInfo
├── TabNavigation
│   ├── MenuTab
│   │   ├── CategoryFilter
│   │   └── UrunCard[] (Tekrar)
│   ├── ReviewsTab
│   │   └── ReviewItem[]
│   └── LocationTab
│       └── LeafletMap
└── ProductDetailModal
    ├── ProductImage
    ├── ProductInfo
    ├── QuantitySelector
    └── AddToCartButton
```

---

#### 3. **Sepet.js** - Alışveriş Sepeti
**Dosya**: `src/pages/customer/Sepet.js`

**Amaç**: Seçili ürünleri göstermek, sonlandır düzenlemeler yapmak, siparış tamamlamak

**State Yapısı**:
```javascript
const [adres, setAdres] = useState('');                   // Teslimat adresi
const [adresler, setAdresler] = useState([]);             // Kayıtlı adresler
const [odemeTipi, setOdemeTipi] = useState('kredi_karti'); // Ödeme yöntemi
const [notlar, setNotlar] = useState('');                 // Restoran notu
const [kupon, setKupon] = useState('');                   // Kupon kodu
const [kuponDiscount, setKuponDiscount] = useState(0);
const [loading, setLoading] = useState(false);            // İşlem yükleme
const [siparisId, setSiparisId] = useState(null);         // Oluşturulan sipariş
```

**Context Kullanımı**:
```javascript
const { cart, restoranId, restoranAd, clearCart, getToplam } = useCart();
const { user } = useAuth();
```

**Supabase Sorguları**:
```javascript
// Kupon doğrulama
const { data: kupon } = await supabase
  .from('kuponlar')
  .select('*')
  .eq('kod', kuponCode)
  .eq('aktif', true)
  .single()

// Sipariş oluştur
const { data: siparis } = await supabase
  .from('siparisler')
  .insert([
    {
      musteri_id: user.id,
      restoran_id: restoranId,
      durum: 'beklemede',
      toplam_tutar: toplamTutar,
      teslimat_adresi: adres,
      notlar: notlar
    }
  ])

// Sipariş detaylarını ekle
await supabase
  .from('siparis_detaylari')
  .insert(cart.map(item => ({
    siparis_id: siparis.id,
    urun_id: item.id,
    adet: item.adet,
    birim_fiyat: item.fiyat
  })))
```

**Bileşen Hiyerarşisi**:
```
Sepet
├── CartSummary
│   ├── CartHeader
│   └── CartItems[]
│       ├── ItemImage
│       ├── ItemInfo
│       ├── QuantityControl
│       └── RemoveButton
├── CouponSection
│   ├── CouponInput
│   └── ApplyCoupon
├── OrderForm
│   ├── AddressSelect
│   ├── PaymentMethod
│   ├── SpecialNotes
│   └── OrderSummary
└── CheckoutButton
```

---

#### 4. **Siparislerim.js** - Siparış Takibi
**Dosya**: `src/pages/customer/Siparislerim.js`

**Amaç**: Kullanıcının geçmiş ve aktif siparişlerini göstermek, durumlarını takip etmek

**State Yapısı**:
```javascript
const [siparisler, setSiparisler] = useState([]);         // Tüm siparişler
const [secilenSiparis, setSecilenSiparis] = useState(null); // Detay modal
const [durum, setDurum] = useState('tum');                // Filtre: tum|aktif|tamamlandi
const [loading, setLoading] = useState(true);
const [siparisDetay, setSiparisDetay] = useState(null);   // Dönem detayları
```

**Context Kullanımı**:
```javascript
const { user } = useAuth();
```

**Supabase Sorguları**:
```javascript
// Siparişleri getir
const query = supabase
  .from('siparisler')
  .select(`
    *,
    restoranlar(ad, logo_url),
    siparis_detaylari(
      *,
      urunler(ad, resim_url, fiyat)
    )
  `)
  .eq('musteri_id', user.id)

// Filtreler
if (durum === 'aktif') {
  query = query.in('durum', ['beklemede', 'onaylandi', 'hazirlaniyor', 'yolda'])
} else if (durum === 'tamamlandi') {
  query = query.in('durum', ['teslim_edildi', 'iptal'])
}

const { data: siparisler } = await query
  .order('olusturma_tarihi', { ascending: false })
```

**Bileşen Hiyerarşisi**:
```
Siparislerim
├── FilterTabs (Tum, Aktif, Tamamlandi)
├── OrdersList
│   └── OrderCard[] (Tekrar)
│       ├── RestaurantHeader
│       ├── OrderItems
│       ├── OrderStatus
│       │   └── StatusTimeline
│       ├── OrderTotal
│       └── ActionButtons (Takip, Yenile sipariş)
└── OrderDetailModal
    ├── OrderHeader
    ├── OrderTimeline
    ├── OrderItems
    └── ContactRestaurant
```

---

#### 5. **Profil.js** - Müşteri Profili
**Dosya**: `src/pages/customer/Profil.js`

**Amaç**: Kişisel bilgileri düzenlemek, adres yönetimi, şifre değiştirme

**State Yapısı**:
```javascript
const [profil, setProfil] = useState(null);               // Kullanıcı profili
const [adresler, setAdresler] = useState([]);             // Kayıtlı adresler
const [yeniAdres, setYeniAdres] = useState('');           // Yeni adres inputu
const [loading, setLoading] = useState(true);
const [isiSonDegisiklik, setGenelBilgiTabActive] = useState(true);
const [adresTabActive, setAdresTabActive] = useState(false);
```

**Context Kullanımı**:
```javascript
const { user } = useAuth();
```

**Supabase Sorguları**:
```javascript
// Profil bilgilerini getir
const { data: profil } = await supabase
  .from('kullanicilar')
  .select('*')
  .eq('id', user.id)
  .single()

// Adresleri getir
const { data: adresler } = await supabase
  .from('adresler')
  .select('*')
  .eq('musteri_id', user.id)
  .order('varsayilan', { ascending: false })

// Profil güncelle
await supabase
  .from('kullanicilar')
  .update({
    ad_soyad: yeniAd,
    telefon: yeniTelefon
  })
  .eq('id', user.id)
```

**Bileşen Hiyerarşisi**:
```
Profil
├── ProfileHeader (Avatar, Ad, Email)
├── TabNavigation
│   ├── GeneralInfoTab
│   │   ├── NameInput
│   │   ├── PhoneInput
│   │   └── SaveButton
│   ├── AddressesTab
│   │   ├── AddressList
│   │   │   └── AddressCard[]
│   │   └── AddNewAddress
│   └── SecurityTab
│       ├── ChangePasswordForm
│       │   ├── OldPasswordInput
│       │   ├── NewPasswordInput
│       │   └── ConfirmButton
│       └── LoginHistory
```

---

### **Admin Paneli Sayfaları**

Admin paneli tüm özellikleri `src/pages/admin/Admin.js` içinde tab sistemiyle yönetmektedir.

**State Yapısı**:
```javascript
const [activeTab, setActiveTab] = useState('dashboard');  // Aktif sekme
const [loading, setLoading] = useState(true);
const [refreshTrigger, setRefreshTrigger] = useState(0);  // Force refresh
```

**İçerilen Modüller**:
- Dashboard.js - Genel istatistikler
- RestoranYonetimi.js - Restoran CRUD
- KullaniciYonetimi.js - Kullanıcı yönetimi
- SiparisYonetimi.js - Sipariş takibi
- KategoriYonetimi.js - Kategori yönetimi
- BolgeYonetimi.js - Bölge yönetimi
- KomisyonYonetimi.js - Komisyon oranları
- KuponYonetimi.js - Kupon yönetimi
- KampanyaYonetimi.js - Kampanya yönetimi
- BannerYonetimi.js - Banner editörü
- FinansYonetimi.js - Gelir ve gider takibi

---

### **Restoran Paneli**

Restoran sahipleri kendi restoranlarını yönetmek için MagazaPaneli.js bileşenini kullanır.

**Özellikler**:
- Ürün ekleme/düzenleme
- Siparış takibi
- Restoranı açık/kapalı yapma
- Puan ve yorumları görüntüleme
- Teslimat bölgelerini yönetme

---

## 👥 Kullanıcı Rolleri ve Yetkilendirme

### Rol Tanımları

| Rol | Açıklama | Yetkiler |
|-----|----------|----------|
| **musteri** | Sıradan müşteri | Restoran gözle, sipariş et, profilini düzenle |
| **restoran** | Restoran sahibi | Kendi restoranını yönet, ürünleri düzenle, siparışları gör |
| **admin** | Sistem yöneticisi | Tüm sistemi tam kontrol et, raporlar |

### Rol Kontrolü Kodu

```javascript
// AuthContext.js içinde
const isAdmin = userRole === 'admin'
const isRestoran = userRole === 'restoran'
const isMusteri = userRole === 'musteri'
```

### Korunan Rotalar (Protected Routes)

```javascript
// Örnek: Admin rotası
<Route 
  path="/admin" 
  element={
    isAdmin ? (
      <AdminLayout>
        <Admin />
      </AdminLayout>
    ) : (
      <Navigate to="/login" />
    )
  }
/>
```

---

## 📊 Veri Akışı (Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
│                    (React Frontend)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                ┌──────▼────────┐
                │    AuthContext │ ◄─── Supabase Auth
                │   AppContext   │
                │   CartContext  │
                └──────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼──┐      ┌───▼────┐    ┌──▼─────┐
   │ Pages │      │Services│    │ Layout │
   │(React)│      │Supabase│    │(React) │
   └─────┬─┘      │EmailJS │    └──┬─────┘
         │        └────────┘       │
         └────────────┬───────────┘
                      │
        ┌─────────────▼──────────────┐
        │    Supabase Backend         │
        │   - PostgreSQL Database     │
        │   - Auth Service            │
        │   - Realtime Updates        │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   External Services         │
        │   - EmailJS (Emails)        │
        └────────────────────────────┘
```

---

## 🔐 Güvenlik Notları

### Hassas Veriler
- **Supabase URL ve Keys**: `.env` dosyasına göm (ör: `Supabase.js`'de zaten tutuluyor)
- **EmailJS Keys**: Sunucu tarafında tu
- **Database**: Supabase Row Level Security (RLS) kullan

### Authentication Flow
1. Kullanıcı login yapır
2. Supabase JWT token verir
3. Token header'da gönderilir
4. Supabase her isteği token'ı doğrular
5. JWT'deki rol bilgisinden yetkiler belirlenir

### Rol Tabanlı Erişim (RBAC)
```javascript
// Örnek: Sadece admin'ler görüşler yapabilir
const handleDelete = async (userId) => {
  if (!isAdmin) {
    toast.error('Yeterli yetkiniz yok!')
    return
  }
  // Delete işlemi...
}
```

---

## 🐛 Geliştirme Notları

### Örnek Kullanıcılar (Development)
```
Admin:
  Email: admin@example.com
  Şifre: admin123

Restoran:
  Email: restoran@example.com
  Şifre: restoran123

Müşteri:
  Email: musteri@example.com
  Şifre: musteri123
```

### Debug İçin Faydalı Tools
- **React DevTools**: Chrome Extension
- **Redux DevTools**: State debugger (Context için uyarlamak gerekli)
- **Supabase Dashboard**: Veritabanı ve logs
- **Browser Console**: JavaScript errors

### Ortak Sorunlar ve Çözümleri

| Sorun | Çözüm |
|-------|--------|
| Session kayboldu | Supabase authentikation kontrol et, cookies aktif mi? |
| Email göndermiyor | EmailJS config'ini kontrol et, template ID'ler doğru mu? |
| Harita görmüyor | Leaflet CSS aktif mi? (`index.css`'de check et) |
| Sepet boş kalıyor | LocalStorage issues - developer tools → Storage kontrol et |

### Optimize İçin İpuçları

1. **Code Splitting**: React.lazy() ile lazy loading
   ```javascript
   const Admin = React.lazy(() => import('./pages/admin/Admin'))
   ```

2. **Memoization**: Gereksiz re-renders'ı önle
   ```javascript
   const MyComponent = React.memo(({ data }) => {...})
   ```

3. **Database Indexing**: Sık sorgulanan alanlara index ekle (Supabase)

4. **Image Optimization**: Resimler optimize et ve CDN kullan

---

## 📚 Kaynaklar ve Linkler

### Resmi Dokümantasyon
- **React Docs**: https://react.dev
- **Supabase Docs**: https://supabase.com/docs
- **React Router**: https://reactrouter.com
- **EmailJS Docs**: https://www.emailjs.com/docs

### Geliştirici Araçları
- **VS Code**: https://code.visualstudio.com
- **Postman**: API testing için
- **Git**: Sürüm kontrolü

---

## 📝 Lisans
MIT License - Kopyala, değiştir, kullan bütün projelerde

---

## 📧 İletişim
Proje hakkında sorularınız için iletişime geçin.

**Yapılış Tarihi**: 2026
**Versiyon**: 3.0 (Production Ready)
**Durum**: Aktif Geliştirme

---

## 🗺️ Roadmap (İleriki Özellikler)
- [ ] Mobil uygulama (React Native)
- [ ] Payment gateway entegrasyonu (Stripe, PayPal)
- [ ] Analytics dashboard
- [ ] SMS notifications
- [ ] Live order tracking
- [ ] AI-based recommendations
- [ ] Loyalty program
- [ ] Multi-language support

---

**Son Güncelleme**: Şubat 2026

🌟 Bu projerden yararlandıysan, please star bizi! ⭐
