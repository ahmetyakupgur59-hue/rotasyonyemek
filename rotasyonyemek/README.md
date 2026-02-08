# 🍽️ RotasyonYemek Frontend - React Uygulaması

**Ana Proje Belgesine Dönüş**: Lütfen kök dizindeki [../README.md](../README.md) dosyasını teknoloji yığını, kurulum, API şeması ve detaylı komponentler için kontrol edin.

---

## 📘 Hızlı Başlangıç

### Komutlar
```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat (http://localhost:3000)
npm start

# Testleri çalıştır
npm test

# Üretim derlemesi oluştur
npm run build
```

---

## 📁 Klasör Yapısı

```
src/
├── components/          # Tekrar kullabilir React bileşenleri
├── contexts/           # State yönetimi (Auth, Cart, App)
├── layouts/            # Sayfa şablonları (Main, Admin, Restaurant)
├── pages/              # Tam sayfalar
│   ├── auth/          # Kimlik doğrulama sayfaları
│   ├── customer/      # Müşteri portalı sayfaları
│   ├── admin/         # Admin paneli
│   └── restaurant-panel/ # Restoran sahiplerine yönelik paneli
├── services/           # API ve dış servisler (Supabase, EmailJS)
├── styles/             # CSS dosyaları
├── assets/             # Resimler ve statik dosyalar
├── App.js              # Ana uygulama bileşeni
└── index.js            # React entry point
```

---

## 🔑 Önemli Dosyalar ve Bileşenler

| Dosya | Açıklama |
|-------|----------|
| `src/App.js` | Rotaları ve layout'ları tanımla |
| `src/contexts/AuthContext.js` | Kimlik doğrulama ve rol yönetimi |
| `src/contexts/CartContext.js` | Alışveriş sepeti yönetimi |
| `src/contexts/AppContext.js` | Global uygulama state'i |
| `src/services/supabase.js` | Supabase client setup |
| `src/services/emailService.js` | EmailJS entegrasyonu |
| `src/pages/admin/Admin.js` | Admin paneli ana sayfası |

---

## 🧩 Context Hooks Kullanımı

### AuthContext
```javascript
import { useAuth } from './contexts/AuthContext'

const { user, userRole, loading, isAdmin, isRestoran } = useAuth()
```

### CartContext
```javascript
import { useCart } from './contexts/CartContext'

const { cart, addToCart, removeFromCart, clearCart } = useCart()
```

### AppContext
```javascript
import { useApp } from './contexts/AppContext'

const { user, userRole, isAdmin } = useApp()
```

---

## 📄 Sayfa Detayları

Ana dokümantasyonda aşağıdaki sayfaların detaylı açıklamaları vardır:

### Müşteri Portalı
- **Home.js** - Restoran listesi ve filtreleme
- **RestoranDetay.js** - Restoran bilgisi ve menü
- **Sepet.js** - Alışveriş sepeti ve siparış
- **Siparislerim.js** - Siparış takibi
- **Profil.js** - Kişisel bilgiler ve adres yönetimi

### Admin Paneli
- **Admin.js** - Genel yönetim (Dashboard, Restoranlar, Kullanıcılar vb.)

### Common Bileşenler
- **LoadingSpinner** - Yükleme göstergesi
- **EmptyState** - Boş durumu gösterme
- **StatusBadge** - Durum etiketleri
- **Modal** - İletişim kutuları
- **Pagination** - Sayfalandırma
- **Toast** - Bildirim mesajları

---

## 🚀 Daha Fazla Bilgi

Detaylı dokümantasyon için ana README.md'ye bakın:
- ✅ Tam teknoloji yığını
- ✅ Supabase veritabanı şeması (11+ tablo)
- ✅ Her sayfa için state yapısı ve context kullanımı
- ✅ Supabase sorgusu örnekleri
- ✅ Bileşen hiyerarşileri
- ✅ Common UI bileşenleri detayları
- ✅ Kurulum adım adım
- ✅ API endpoint örnekleri
- ✅ Rol tabanlı erişim kontrolü
- ✅ Geliştirme notları ve sorun çözümü

**Versiyon**: 3.0
**Son Güncelleme**: Şubat 2026

