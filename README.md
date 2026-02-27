<p align="center">
  <a href="https://gettransfer.vercel.app">
    <img src="https://img.shields.io/badge/GetTransfer-Live%20Demo-brightgreen?style=for-the-badge" alt="Live Demo">
  </a>
</p>

<h1 align="center">🚗 GetTransfer</h1>

<p align="center">
  <strong>Modern Transfer ve Sürücü Yönetim Platformu</strong>
</p>

<p align="center">
  React + Vite + Express + Supabase ile geliştirilmiş, gerçek zamanlı konum takibi özellikli 
  transfer rezervasyon uygulaması.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square" alt="React">
</p>

<p align="center">
  <a href="#-özellikler">Özellikler</a> •
  <a href="#-canlı-demo">Canlı Demo</a> •
  <a href="#%EF%B8%8F-gereksinimler">Gereksinimler</a> •
  <a href="#-kurulum">Kurulum</a> •
  <a href="#-kullanım">Kullanım</a> •
  <a href="#-api-dokümantasyonu">API</a>
</p>

---

## 📑 İçindekiler

- [Özellikler](#-özellikler)
- [Canlı Demo](#-canlı-demo)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Gereksinimler](#%EF%B8%8F-gereksinimler)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Dağıtım](#-dağıtım)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

---

## ✨ Özellikler

### 🎯 Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🚕 **Transfer Rezervasyonu** | Havalimanı, otel ve şehir içi transfer rezervasyonları |
| 📍 **Gerçek Zamanlı Takip** | OpenStreetMap ve Leaflet ile canlı konum takibi |
| 👤 **Çoklu Rol Sistemi** | Müşteri, Sürücü ve Admin panelleri |
| 📱 **Responsive Tasarım** | Mobil, tablet ve masaüstü uyumlu |
| 🌍 **Çoklu Dil Desteği** | Türkçe ve İngilizce dil seçenekleri |

### 👥 Kullanıcı Rolleri

<table>
<tr>
<th width="33%">🧑‍💼 Müşteri</th>
<th width="33%">🚗 Sürücü</th>
<th width="33%">👑 Admin</th>
</tr>
<tr>
<td>
<ul>
<li>Transfer arama ve rezervasyon</li>
<li>Canlı sürücü takibi</li>
<li>Geçmiş rezervasyonlar</li>
<li>Profil yönetimi</li>
<li>Google ile giriş</li>
</ul>
</td>
<td>
<ul>
<li>Başvuru sistemi</li>
<li>Belge yükleme</li>
<li>Rezervasyon yönetimi</li>
<li>Konum güncelleme</li>
<li>Kazanç takibi</li>
</ul>
</td>
<td>
<ul>
<li>Sürücü onay sistemi</li>
<li>Rezervasyon yönetimi</li>
<li>Müşteri listesi</li>
<li>Fiyatlandırma ayarları</li>
<li>Sistem durumu</li>
</ul>
</td>
</tr>
</table>

### 🔧 Teknik Özellikler

- **SMS Doğrulama**: Alibaba Cloud SMS ile global telefon doğrulama (200+ ülke)
- **Ödeme Sistemi**: Stripe ile online ödeme altyapısı
- **Belge Yönetimi**: Sürücü belge yükleme ve admin onay sistemi
- **Misafir Rezervasyon**: Kayıt olmadan rezervasyon yapabilme
- **PWA Desteği**: Progressive Web App olarak mobil deneyim

---

## 🌐 Canlı Demo

**Production URL**: [https://gettransfer.vercel.app](https://gettransfer.vercel.app)

### Sistemi Kullanma

#### Müşteri Olarak
1. Ana sayfadan transfer arayın
2. Araç ve fiyat seçin
3. Rezervasyon oluşturun
4. Rezervasyon kodu ile takip edin

#### Sürücü Olarak
1. **`/driver/apply`** sayfasına gidin
2. Formu doldurun (ad, e-posta, telefon, adres)
3. Araç bilgilerini girin
4. Zorunlu belgeleri yükleyin:
   - Ehliyet
   - Araç ruhsatı
   - Sigorta
   - Profil fotoğrafı
5. Başvuruyu gönderin
6. Admin onayından sonra sürücü paneline erişin

#### Admin Olarak
1. **`/admin`** sayfasına gidin
2. Bekleyen sürücü başvurularını görün
3. Belgeleri inceleyin
4. Onaylayın veya reddedin

---

## 🛠 Teknoloji Yığını

### Frontend

| Teknoloji | Açıklama |
|-----------|----------|
| ![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react) | UI kütüphanesi |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript) | Tip güvenli JavaScript |
| ![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?style=flat-square&logo=vite) | Build tool |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css) | CSS framework |
| ![Zustand](https://img.shields.io/badge/Zustand-5.0-764ABC?style=flat-square) | State management |
| ![React Router](https://img.shields.io/badge/React_Router-7.3-CA4245?style=flat-square&logo=react-router) | Routing |
| ![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square) | Harita kütüphanesi |

### Backend

| Teknoloji | Açıklama |
|-----------|----------|
| ![Express.js](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express) | Web framework |
| ![Supabase](https://img.shields.io/badge/Supabase-2.96-3FCF8E?style=flat-square&logo=supabase) | PostgreSQL & Auth |
| ![Stripe](https://img.shields.io/badge/Stripe-17.4-008CDD?style=flat-square&logo=stripe) | Ödeme altyapısı |
| ![Alibaba Cloud](https://img.shields.io/badge/Alibaba_Cloud-SMS-FF6A00?style=flat-square) | Global SMS doğrulama |

### Deployment

| Platform | Açıklama |
|----------|----------|
| ![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=flat-square&logo=vercel) | Hosting & Serverless Functions |

---

## ⚙️ Gereksinimler

### Zorunlu

- **Node.js** 18.0 veya üzeri
- **npm** 9.0+ veya **bun** 1.0+
- **Supabase hesabı** (ücretsiz tier yeterli)

### Opsiyonel

- **Alibaba Cloud hesabı** - SMS doğrulama için
- **Stripe hesabı** - Online ödeme için
- **Google OAuth** - Google ile giriş için

---

## 🚀 Kurulum

### Hızlı Başlangıç

```bash
# 1. Repoyu klonla
git clone https://github.com/cihangirq-crypto/gettransfer.git
cd gettransfer

# 2. Bağımlılıkları yükle
npm install

# 3. Environment variables ayarla
cp .env.example .env
# .env dosyasını düzenle

# 4. Veritabanı şemasını oluştur
# Supabase SQL Editor'de supabase/schema.sql çalıştır

# 5. Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda aç: **http://localhost:5173**

### Adım Adım Kurulum

#### 1. Supabase Kurulumu

1. [Supabase](https://supabase.com) hesabı oluştur
2. Yeni proje oluştur
3. Project Settings → API'den şu değerleri al:
   - `Project URL`
   - `service_role` key (anon key değil!)
4. SQL Editor'de `supabase/schema.sql` içeriğini çalıştır

#### 2. Environment Variables

`.env` dosyasını proje kök dizininde oluştur:

```env
# ═══════════════════════════════════════════════════════════
# SUPABASE (Zorunlu)
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ═══════════════════════════════════════════════════════════
# ALIBABA CLOUD SMS (Opsiyonel - Global SMS Doğrulama)
# ═══════════════════════════════════════════════════════════
ALIBABA_ACCESS_KEY_ID=your-access-key-id
ALIBABA_ACCESS_KEY_SECRET=your-access-key-secret

# ═══════════════════════════════════════════════════════════
# STRIPE (Opsiyonel - Online Ödeme)
# ═══════════════════════════════════════════════════════════
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# ═══════════════════════════════════════════════════════════
# GOOGLE OAUTH (Opsiyonel - Google ile Giriş)
# ═══════════════════════════════════════════════════════════
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ═══════════════════════════════════════════════════════════
# UYGULAMA AYARLARI
# ═══════════════════════════════════════════════════════════
VITE_API_URL=http://localhost:3005
NODE_ENV=development
```

#### 3. Alibaba Cloud SMS Kurulumu

1. [Alibaba Cloud](https://www.alibabacloud.com) hesabı oluştur
2. Console'da **Short Message Service** ara ve aktifleştir
3. **AccessKey Management**'dan AccessKey oluştur:
   - AccessKey ID
   - AccessKey Secret
4. **International SMS** özelliğini aktifleştir

#### 4. Veritabanı Şeması

Supabase SQL Editor'de sırasıyla çalıştır:

```sql
-- Ana şema
-- supabase/schema.sql içeriğini yapıştır

-- Sürücü kolonları (gerekirse)
-- supabase/drivers_schema.sql içeriğini yapıştır
```

---

## 💻 Kullanım

### Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (frontend + backend) |
| `npm run client:dev` | Sadece frontend geliştirme |
| `npm run server:dev` | Sadece backend geliştirme |
| `npm run build` | Production build |
| `npm run preview` | Build önizleme |
| `npm run lint` | ESLint kod kontrolü |

### Erişim Adresleri

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3005 |
| Admin Panel | http://localhost:5173/admin |
| Sürücü Panel | http://localhost:5173/driver |

### Sürücü Başvuru Süreci

Sürücü olmak için:

1. **Başvuru Sayfasına Git**: `/driver/apply`
2. **Kişisel Bilgiler**: Ad, e-posta, telefon, adres
3. **Araç Bilgileri**: Araç tipi, model, plaka
4. **Belge Yükleme**: 4 zorunlu belge
   - Ehliyet fotoğrafı
   - Araç ruhsatı
   - Sigorta belgesi
   - Profil fotoğrafı
5. **Konum**: Mevcut konumunuz
6. **Gönder**: Admin incelemesi için
7. **Onay**: Admin onayından sonra aktif sürücü olursunuz

---

## 📁 Proje Yapısı

```
gettransfer/
├── 📁 src/                          # Frontend kaynak kodları
│   ├── 📁 components/               # React bileşenleri
│   │   ├── 📁 ui/                   # Temel UI bileşenleri
│   │   ├── AdminLayout.tsx          # Admin layout
│   │   ├── DriverLayout.tsx         # Sürücü layout
│   │   ├── CustomerLayout.tsx       # Müşteri layout
│   │   ├── Map.tsx                  # Harita bileşeni
│   │   └── OpenStreetMap.tsx        # OpenStreetMap
│   │
│   ├── 📁 pages/                    # Sayfa bileşenleri
│   │   ├── 📁 admin/                # Admin paneli
│   │   │   ├── Dashboard.tsx        # Ana dashboard
│   │   │   ├── Drivers.tsx          # Sürücü yönetimi
│   │   │   ├── Bookings.tsx         # Rezervasyonlar
│   │   │   ├── Customers.tsx        # Müşteri listesi
│   │   │   ├── Pricing.tsx          # Fiyatlandırma
│   │   │   ├── Settings.tsx         # Ayarlar
│   │   │   └── Debug.tsx            # Sistem durumu
│   │   │
│   │   ├── 📁 driver/               # Sürücü paneli
│   │   │   ├── Dashboard.tsx        # Sürücü dashboard
│   │   │   ├── Apply.tsx            # Başvuru formu
│   │   │   ├── Documents.tsx        # Belge yükleme
│   │   │   └── Login.tsx            # Sürücü girişi
│   │   │
│   │   ├── 📁 customer/             # Müşteri sayfaları
│   │   ├── 📁 auth/                 # Kimlik doğrulama
│   │   ├── Home.tsx                 # Ana sayfa
│   │   ├── SearchResults.tsx        # Arama sonuçları
│   │   ├── BookingPage.tsx          # Rezervasyon
│   │   ├── Checkout.tsx             # Ödeme
│   │   └── TrackingPage.tsx         # Canlı takip
│   │
│   ├── 📁 stores/                   # Zustand state
│   │   ├── authStore.ts             # Kimlik doğrulama
│   │   ├── bookingStore.ts          # Rezervasyon
│   │   └── driverStore.ts           # Sürücü
│   │
│   ├── 📁 types/                    # TypeScript tipleri
│   ├── 📁 utils/                    # Yardımcı fonksiyonlar
│   ├── 📁 hooks/                    # Custom hooks
│   └── 📁 i18n/                     # Dil dosyaları
│
├── 📁 backend/                      # Backend API
│   ├── 📁 routes/                   # API route'ları
│   │   ├── auth.ts                  # Kimlik doğrulama
│   │   ├── drivers.ts               # Sürücü işlemleri
│   │   ├── bookings.ts              # Rezervasyonlar
│   │   ├── customer.ts              # Müşteri işlemleri
│   │   ├── payments.ts              # Ödemeler
│   │   ├── maps.ts                  # Harita servisleri
│   │   ├── places.ts                # Yer arama
│   │   ├── pricing.ts               # Fiyatlandırma
│   │   └── otp.ts                   # SMS doğrulama
│   │
│   ├── 📁 services/                 # İş mantığı
│   │   ├── storage.ts               # Supabase işlemleri
│   │   ├── bookingsStorage.ts       # Rezervasyon depolama
│   │   ├── pricingStorage.ts        # Fiyatlandırma
│   │   └── alibabaSms.ts            # Alibaba Cloud SMS
│   │
│   └── app.ts                       # Express uygulaması
│
├── 📁 api/                          # Vercel serverless
│   └── index.ts                     # Serverless handler
│
├── 📁 supabase/                     # Veritabanı şemaları
│   ├── schema.sql                   # Ana şema
│   └── drivers_schema.sql           # Sürücü şeması
│
├── 📁 docs/                         # Dokümantasyon
│   └── API.md                       # API dokümantasyonu
│
├── package.json                     # Proje bağımlılıkları
├── vercel.json                      # Vercel yapılandırması
└── README.md                        # Bu dosya
```

---

## 🔌 API Dokümantasyonu

### Base URL

```
Development: http://localhost:3005/api
Production:  https://gettransfer.vercel.app/api
```

### Ana Endpoint'ler

| Kategori | Endpoint | Açıklama |
|----------|----------|----------|
| **Auth** | `POST /auth/login` | Giriş |
| | `POST /auth/google` | Google ile giriş |
| | `POST /auth/logout` | Çıkış |
| **Sürücü** | `POST /drivers/apply` | Başvuru |
| | `POST /drivers/auth` | Sürücü girişi |
| | `POST /drivers/location` | Konum güncelleme |
| | `GET /drivers/pending` | Bekleyenler (Admin) |
| | `POST /drivers/approve` | Onayla (Admin) |
| **Rezervasyon** | `POST /bookings/create` | Oluştur |
| | `GET /bookings/:id` | Detay |
| | `GET /bookings/code/:code` | Kod ile sorgula |
| **Fiyat** | `GET /pricing` | Fiyat listesi |
| | `POST /pricing/calculate` | Hesapla |
| **SMS** | `POST /otp/send` | SMS gönder |
| | `POST /otp/verify` | Kod doğrula |

Detaylı API dokümantasyonu için: [docs/API.md](docs/API.md)

---

## 🚀 Dağıtım

### Vercel'a Deploy

#### CLI ile Deploy

```bash
# Vercel CLI kurulumu
npm i -g vercel

# Production deploy
vercel --prod
```

#### GitHub Entegrasyonu

1. Vercel'de projeyi GitHub'a bağla
2. Her push'ta otomatik deploy

### Vercel Environment Variables

Production'da şu değişkenleri ayarla:

| Değişken | Zorunlu |
|----------|---------|
| `SUPABASE_URL` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `ALIBABA_ACCESS_KEY_ID` | ❌ |
| `ALIBABA_ACCESS_KEY_SECRET` | ❌ |
| `STRIPE_SECRET_KEY` | ❌ |

---

## 🤝 Katkıda Bulunma

Katkıda bulunmak için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını inceleyin.

### Hızlı Katkı

```bash
# Fork'la ve klonla
git clone https://github.com/YOUR_USERNAME/gettransfer.git

# Branch oluştur
git checkout -b feature/yeni-ozellik

# Değişiklikleri yap ve commit'le
git commit -m "feat: Yeni özellik"

# Push'la ve PR aç
git push origin feature/yeni-ozellik
```

---

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## 📞 İletişim

- **GitHub Issues**: [Sorun bildir](https://github.com/cihangirq-crypto/gettransfer/issues)
- **Live Demo**: [gettransfer.vercel.app](https://gettransfer.vercel.app)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/cihangirq-crypto">cihangirq-crypto</a>
</p>
