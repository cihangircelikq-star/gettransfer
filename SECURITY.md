# Security Policy

## 🔒 Güvenlik Politikası

GetTransfer proposunun güvenliği bizim için önemlidir. Bu doküman, güvenlik açıklarını nasıl bildireceğinizi ve güvenlik en iyi uygulamalarını açıklar.

---

## 📋 İçindekiler

- [Desteklenen Sürümler](#desteklenen-sürümler)
- [Güvenlik Açığı Bildirme](#güvenlik-açığı-bildirme)
- [Güvenlik Önlemleri](#güvenlik-önlemleri)
- [Bilinen Güvenlik Sorunları](#bilinen-güvenlik-sorunları)

---

## 🛡️ Desteklenen Sürümler

| Sürüm | Destekleniyor | Güvenlik Güncellemeleri |
| ------- | ---------------- | ----------------------- |
| 1.0.x   | ✅ Evet | Aktif |
| < 1.0   | ❌ Hayır | Durduruldu |

---

## 🚨 Güvenlik Açığı Bildirme

### Bildirim Süreci

Eğer güvenlik açığı bulursanız, lütfen **public issue açmayın**. Bunun yerine:

1. **E-posta gönderin**: security@gettransfer.com (örnek)
2. **GitHub Security Advisory** kullanın:
   - Repo sayfasında "Security" sekmesine gidin
   - "Report a vulnerability" butonuna tıklayın

### Bildiriminizde Bulunması Gerekenler

- Açığın detaylı açıklaması
- Etkilenen sürümler
- Reprodüksiyon adımları
- Olası etkiler
- Önerilen çözüm (varsa)

### Yanıt Süresi

| Aşama | Süre |
|-------|------|
| İlk yanıt | 48 saat içinde |
| Değerlendirme | 7 gün içinde |
| Düzeltme planı | 14 gün içinde |
| Yayın | Kritikliğe bağlı |

### Ödül Programı

Şu anda bir bug bounty programımız bulunmamaktadır, ancak güvenlik araştırmacılarını teşekkürlerle ödüllendiriyoruz.

---

## 🔐 Güvenlik Önlemleri

### Veri Güvenliği

| Önlem | Açıklama |
|-------|----------|
| **Şifreleme** | Tüm şifreler `scrypt` ile hash'lenir |
| **HTTPS** | Tüm iletişim TLS ile şifrelenir |
| **Token** | JWT tabanlı kimlik doğrulama |
| **Ortam Değişkenleri** | Hassas bilgiler environment variable olarak saklanır |

### API Güvenliği

```javascript
// Rate Limiting
// Production'da rate limiting aktif
// Auth: 10 req/dk
// API: 100 req/dk
```

### Kimlik Doğrulama

- ✅ Bcrypt/Scrypt şifre hash'leme
- ✅ JWT token tabanlı kimlik doğrulama
- ✅ Google OAuth entegrasyonu
- ✅ SMS doğrulama (Alibaba Cloud SMS)

### Veritabanı Güvenliği

- ✅ Supabase RLS (Row Level Security)
- ✅ Service Role Key koruması
- ✅ SQL injection koruması (parameterized queries)

---

## ⚠️ Bilinen Güvenlik Sorunları

### Çözülen Sorunlar

| Tarih | Sorun | CVE | Durum |
|-------|-------|-----|-------|
| - | Henüz güvenlik açığı bildirimi alınmadı | - | - |

### Bilinen Sınırlamalar

| Alan | Sınırlama | Plan |
|------|-----------|------|
| Rate Limiting | Serverless'ta tam aktif değil | Next fix |
| CSRF | CSRF token henüz uygulanmadı | Planlanıyor |
| Input Validation | Bazı endpoint'lerde yetersiz | İyileştiriliyor |

---

## 🚫 Güvenlik İpuçları

### Geliştiriciler İçin

```bash
# 1. .env dosyasını ASLA commit etmeyin
echo ".env" >> .gitignore

# 2. Bağımlılıkları güncel tutun
npm audit
npm audit fix

# 3. Secret'ları Vercel'de saklayın
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Kullanıcılar İçin

- Şifrenizi kimseyle paylaşmayın
- Şüpheli e-postalara tıklamayın
- Hesabınızda şüpheli aktivite görürseniz bildirin

---

## 📞 İletişim

| Konu | İletişim |
|------|----------|
| Güvenlik Açığı | GitHub Security Advisory |
| Genel Sorular | GitHub Issues |
| Acil Durum | E-posta |

---

## 📜 Kapsam Dışı

Aşağıdaki durumlar güvenlik açığı olarak kabul edilmez:

- Rate limiting olmaması (DDoS)
- Public bilgilerin ifşası
- Sosyal mühendislik saldırıları
- Kendi hesabınızla ilgili sorunlar
- 3. taraf servislerin güvenlik sorunları

---

## 🔄 Güncellemeler

Bu güvenlik politikası düzenli olarak güncellenir. Son güncelleme: **Ocak 2024**

---

<p align="center">
  <a href="README.md">← Ana Sayfaya Dön</a>
</p>
