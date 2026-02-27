# Changelog

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/tr-TR/1.0.0/) temel alınarak hazırlanmıştır,
ve bu proje [Semantic Versioning](https://semver.org/lang/tr/) sürümleme prensiplerini takip eder.

## [Unreleased]

### Planlanan Özellikler
- WebSocket ile gerçek zamanlı bildirimler
- Mobil uygulama (React Native)
- Çoklu dil desteği genişletmesi
- Admin paneli geliştirmeleri
- Raporlama ve analitik dashboard

---

## [1.0.0] - 2024-01-15

### Eklendi
- ✨ İlk kararlı sürüm yayınlandı
- 🚕 Transfer rezervasyon sistemi
- 📍 OpenStreetMap ile gerçek zamanlı konum takibi
- 👤 Çoklu rol sistemi (Müşteri, Sürücü, Admin)
- 📱 Responsive tasarım (mobil, tablet, masaüstü)
- 🌍 Türkçe ve İngilizce dil desteği
- 🔐 SMS doğrulama (Alibaba Cloud SMS)
- 💳 Online ödeme (Stripe)
- 📄 Sürücü belge yükleme ve onay sistemi
- 🎫 Misafir rezervasyon (kayıtsız)
- 📊 Admin dashboard ve istatistikler
- 🐛 Debug sayfası (sistem durumu)

### Teknik Detaylar
- React 18.3 + TypeScript 5.8
- Vite 6.3 build sistemi
- Express.js 4.21 backend
- Supabase PostgreSQL veritabanı
- Zustand state yönetimi
- Tailwind CSS styling
- Vercel serverless deployment

---

## [0.9.0] - 2024-01-10

### Eklendi
- 🗺️ OpenStreetMap entegrasyonu
- 📍 Yer arama ve rota hesaplama
- 🚗 Sürücü seçimi ve filtreleme
- 💰 Dinamik fiyatlandırma sistemi
- 📧 E-posta bildirimleri altyapısı

### Düzeltildi
- 🐛 Harita yükleme hataları giderildi
- 🐛 Rezervasyon oluşturma sorunları çözüldü
- 🔧 Performans iyileştirmeleri

---

## [0.8.0] - 2024-01-05

### Eklendi
- 👑 Admin paneli
  - Sürücü onay sistemi
  - Rezervasyon yönetimi
  - Müşteri listesi
  - Fiyatlandırma ayarları
- 🔐 Kimlik doğrulama sistemi
  - E-posta/şifre girişi
  - Google OAuth
  - SMS doğrulama

### Değiştirildi
- 🎨 UI/UX iyileştirmeleri
- 📁 Proje yapısı yeniden düzenlendi

---

## [0.7.0] - 2024-01-01

### Eklendi
- 🚗 Sürücü paneli
  - Başvuru formu
  - Belge yükleme
  - Dashboard
- 📱 PWA desteği
- 🔔 Bildirim sistemi

### Düzeltildi
- 🐛 Çeşitli bug düzeltmeleri
- 🔧 Kod optimizasyonları

---

## [0.6.0] - 2023-12-25

### Eklendi
- 💳 Stripe ödeme entegrasyonu
- 🎫 Rezervasyon kodu sistemi
- 📧 E-posta onayı
- 🌍 i18n altyapısı

### Değiştirildi
- 🎨 Tema sistemi (dark/light mode)
- 📱 Mobil uyumluluk iyileştirmeleri

---

## [0.5.0] - 2023-12-20

### Eklendi
- 📍 Konum tespiti
- 🗺️ Harita entegrasyonu
- 🚗 Araç tipi seçimi
- 👥 Yolcu sayısı belirleme

### Düzeltildi
- 🐛 Form validasyon hataları
- 🔧 API response format standardizasyonu

---

## [0.4.0] - 2023-12-15

### Eklendi
- 🔐 Alibaba Cloud SMS doğrulama
- 📱 Telefon numarası doğrulama
- 👤 Kullanıcı profil sayfası
- 📜 Geçmiş rezervasyonlar

### Değiştirildi
- 🔐 Güvenlik iyileştirmeleri
- 📁 Veritabanı şeması güncellemeleri

---

## [0.3.0] - 2023-12-10

### Eklendi
- 💾 Supabase entegrasyonu
- 📊 Veritabanı şeması
- 🔌 REST API endpoints
- 📝 API dokümantasyonu

### Değiştirildi
- 🏗️ Backend mimari değişiklikleri
- 📁 Klasör yapısı yeniden düzenlendi

---

## [0.2.0] - 2023-12-05

### Eklendi
- ⚛️ React frontend
- 🎨 Tailwind CSS styling
- 🛣️ React Router navigasyon
- 📦 Zustand state management

### Değiştirildi
- 🔧 Build sistemi Vite'e geçirildi
- 📝 TypeScript eklendi

---

## [0.1.0] - 2023-12-01

### Eklendi
- 🎉 İlk proje yapısı oluşturuldu
- 📁 Temel klasör yapısı
- ⚙️ Temel yapılandırma dosyaları
- 📝 README ve CONTRIBUTING dosyaları

---

## Sürüm Notları

### Sürüm Numarası Formatı

- **MAJOR** (X.0.0): Kırıcı değişiklikler
- **MINOR** (0.X.0): Yeni özellikler, geriye uyumlu
- **PATCH** (0.0.X): Bug düzeltmeleri, geriye uyumlu

### Değişiklik Tipleri

- `Eklendi`: Yeni özellikler
- `Değiştirildi`: Mevcut özelliklerde değişiklik
- `Kaldırıldı`: Kaldırılan özellikler
- `Düzeltildi`: Bug düzeltmeleri
- `Güvenlik`: Güvenlik ile ilgili değişiklikler

---

[Unreleased]: https://github.com/cihangirq-crypto/gettransfer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cihangirq-crypto/gettransfer/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cihangirq-crypto/gettransfer/releases/tag/v0.1.0
