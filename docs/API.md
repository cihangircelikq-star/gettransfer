# GetTransfer API Dokümantasyonu

Bu doküman, GetTransfer uygulamasının REST API endpoint'lerini detaylı olarak açıklar.

## 📑 İçindekiler

- [Genel Bilgiler](#genel-bilgiler)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Sürücüler](#sürücüler)
- [Rezervasyonlar](#rezervasyonlar)
- [Ödemeler](#ödemeler)
- [Harita ve Yerler](#harita-ve-yerler)
- [Fiyatlandırma](#fiyatlandırma)
- [Admin](#admin)
- [Hata Kodları](#hata-kodları)

---

## Genel Bilgiler

### Base URL

| Ortam | URL |
|-------|-----|
| Development | `http://localhost:3005/api` |
| Production | `https://gettransfer.vercel.app/api` |

### Request Formatı

```http
Content-Type: application/json
```

### Response Formatı

Tüm yanıtlar JSON formatındadır:

```json
{
  "success": true,
  "data": { ... }
}
```

Hata durumunda:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Hata açıklaması"
}
```

### Kimlik Doğrulama

Çoğu endpoint, `Authorization` header'ında Bearer token gerektirir:

```http
Authorization: Bearer <token>
```

---

## Kimlik Doğrulama

### POST /auth/login

Kullanıcı girişi yapar.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "userType": "customer"
}
```

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| email | string | ✅ | E-posta adresi |
| password | string | ✅ | Şifre |
| userType | string | ❌ | Kullanıcı tipi: `customer`, `driver`, `admin` |

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cust_123",
      "email": "user@example.com",
      "name": "Kullanıcı Adı",
      "role": "customer"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

---

### POST /auth/register/customer

Yeni müşteri kaydı oluşturur.

**Request Body:**

```json
{
  "email": "new@example.com",
  "name": "Yeni Kullanıcı",
  "password": "password123",
  "phone": "+905551234567"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cust_456",
      "email": "new@example.com",
      "name": "Yeni Kullanıcı",
      "role": "customer"
    },
    "token": "jwt_token_here"
  }
}
```

---

### GET /auth/google

Google OAuth giriş başlatır. Kullanıcıyı Google giriş sayfasına yönlendirir.

**Response:** Google OAuth sayfasına redirect

---

### POST /auth/google

Google One Tap / Sign In With Google ile giriş yapar.

**Request Body:**

```json
{
  "credential": "google_id_token_here"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "google_123",
      "email": "user@gmail.com",
      "name": "Google User",
      "picture": "https://...",
      "role": "customer"
    },
    "token": "jwt_token_here"
  }
}
```

---

### POST /auth/logout

Kullanıcı çıkışı yapar.

**Response:**

```json
{
  "success": true
}
```

---

## Sürücüler

### POST /drivers/apply

Sürücü başvurusu oluşturur.

**Request Body:**

```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "password123",
  "phone": "+905551234567",
  "address": "İstanbul, Türkiye",
  "vehicleType": "sedan",
  "vehicleModel": "Toyota Corolla",
  "licensePlate": "34 ABC 123",
  "location": {
    "lat": 41.0082,
    "lng": 28.9784
  },
  "docs": [
    { "name": "license", "url": "https://..." },
    { "name": "vehicle_registration", "url": "https://..." },
    { "name": "insurance", "url": "https://..." },
    { "name": "profile_photo", "url": "https://..." }
  ]
}
```

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| name | string | ✅ | Sürücü adı |
| email | string | ✅ | E-posta (benzersiz) |
| password | string | ✅ | Şifre (min 6 karakter) |
| phone | string | ✅ | Telefon numarası |
| address | string | ✅ | Adres |
| vehicleType | string | ✅ | Araç tipi: `sedan`, `suv`, `van`, `luxury` |
| vehicleModel | string | ❌ | Araç modeli |
| licensePlate | string | ❌ | Plaka |
| location | object | ✅ | Konum `{lat, lng}` |
| docs | array | ✅ | Belgeler (4 zorunlu belge) |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "drv_123",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "approved": false
  }
}
```

---

### POST /drivers/auth

Sürücü girişi yapar.

**Request Body:**

```json
{
  "email": "ahmet@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "drv_123",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567",
    "role": "driver",
    "approved": true,
    "vehicleType": "sedan",
    "vehicleModel": "Toyota Corolla",
    "licensePlate": "34 ABC 123",
    "location": { "lat": 41.0082, "lng": 28.9784 },
    "available": false
  }
}
```

---

### GET /drivers/:id

Sürücü detaylarını getirir.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "drv_123",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567",
    "vehicleType": "sedan",
    "vehicleModel": "Toyota Corolla",
    "licensePlate": "34 ABC 123",
    "location": { "lat": 41.0082, "lng": 28.9784 },
    "available": true,
    "approved": true,
    "docs": [...]
  }
}
```

---

### POST /drivers/location

Sürücü konumunu günceller.

**Request Body:**

```json
{
  "id": "drv_123",
  "location": {
    "lat": 41.0082,
    "lng": 28.9784
  },
  "available": true
}
```

**Response:**

```json
{
  "success": true,
  "location": { "lat": 41.0082, "lng": 28.9784 },
  "available": true,
  "driverId": "drv_123"
}
```

---

### POST /drivers/status

Sürücü müsaitlik durumunu günceller.

**Request Body:**

```json
{
  "id": "drv_123",
  "available": true
}
```

---

### GET /drivers/pending

Onay bekleyen sürücüleri listeler (Admin).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "drv_123",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "approved": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### POST /drivers/approve

Sürücü başvurusunu onaylar (Admin).

**Request Body:**

```json
{
  "id": "drv_123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "drv_123",
    "approved": true
  }
}
```

---

### POST /drivers/reject

Sürücü başvurusunu reddeder (Admin).

**Request Body:**

```json
{
  "id": "drv_123",
  "reason": "Belgeler eksik"
}
```

---

### GET /drivers/system-status

Sistem durumu ve debug bilgilerini getirir.

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "environment": {
      "SUPABASE_URL": "✅ Set",
      "SUPABASE_SERVICE_ROLE_KEY": "✅ Set"
    },
    "lists": {
      "pending": [...],
      "approved": [...],
      "rejected": [...]
    },
    "summary": {
      "pendingCount": 2,
      "approvedCount": 5,
      "rejectedCount": 1
    }
  }
}
```

---

## Rezervasyonlar

### POST /bookings/create

Yeni rezervasyon oluşturur.

**Request Body:**

```json
{
  "customerId": "cust_123",
  "guestName": "Misafir Adı",
  "guestPhone": "+905551234567",
  "pickupLocation": {
    "lat": 41.0082,
    "lng": 28.9784,
    "address": "İstanbul Havalimanı"
  },
  "dropoffLocation": {
    "lat": 41.0055,
    "lng": 28.9784,
    "address": "Taksim Meydanı"
  },
  "pickupTime": "2024-01-15T14:00:00Z",
  "passengerCount": 2,
  "vehicleType": "sedan",
  "isImmediate": false,
  "flightNumber": "TK1234",
  "nameBoard": "John Doe",
  "extras": {
    "childSeat": true,
    "extraLuggage": false
  }
}
```

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| customerId | string | ❌ | Müşteri ID (üye ise) |
| guestName | string | ❌ | Misafir adı |
| guestPhone | string | ❌ | Misafir telefon |
| pickupLocation | object | ✅ | Alış noktası |
| dropoffLocation | object | ✅ | Varış noktası |
| pickupTime | string | ✅ | Alış zamanı (ISO 8601) |
| passengerCount | number | ✅ | Yolcu sayısı |
| vehicleType | string | ✅ | Araç tipi |
| isImmediate | boolean | ❌ | Anlık transfer mi? |
| flightNumber | string | ❌ | Uçuş numarası |
| nameBoard | string | ❌ | tabeladaki isim |
| extras | object | ❌ | Ekstra seçenekler |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "book_123",
    "reservationCode": "GT-ABC123",
    "status": "pending",
    "basePrice": 150.00,
    "finalPrice": 175.00,
    "paymentStatus": "unpaid"
  }
}
```

---

### GET /bookings/:id

Rezervasyon detaylarını getirir.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "book_123",
    "reservationCode": "GT-ABC123",
    "customerId": "cust_123",
    "driverId": "drv_456",
    "pickupLocation": { ... },
    "dropoffLocation": { ... },
    "pickupTime": "2024-01-15T14:00:00Z",
    "passengerCount": 2,
    "vehicleType": "sedan",
    "status": "accepted",
    "basePrice": 150.00,
    "finalPrice": 175.00,
    "paymentStatus": "paid",
    "driverName": "Ahmet Yılmaz",
    "driverPhone": "+905551234567"
  }
}
```

---

### GET /bookings/code/:code

Rezervasyon kodu ile rezervasyon detaylarını getirir.

**Response:** `GET /bookings/:id` ile aynı

---

### PUT /bookings/:id/status

Rezervasyon durumunu günceller.

**Request Body:**

```json
{
  "status": "completed"
}
```

| Status | Açıklama |
|--------|----------|
| pending | Bekliyor |
| accepted | Kabul edildi |
| in_progress | Yolculuk başladı |
| completed | Tamamlandı |
| cancelled | İptal edildi |

---

### GET /bookings/customer/:id

Müşterinin tüm rezervasyonlarını listeler.

---

### GET /bookings/driver/:id

Sürücünün tüm rezervasyonlarını listeler.

---

## Ödemeler

### POST /payments/create-intent

Stripe ödeme niyeti oluşturur.

**Request Body:**

```json
{
  "bookingId": "book_123",
  "amount": 17500,
  "currency": "try"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
}
```

---

### POST /payments/confirm

Ödemeyi onaylar.

**Request Body:**

```json
{
  "paymentIntentId": "pi_xxx",
  "bookingId": "book_123"
}
```

---

## Harita ve Yerler

### GET /places/search

Yer araması yapar.

**Query Parameters:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| q | string | ✅ | Arama sorgusu |
| lat | number | ❌ | Merkez enlem |
| lng | number | ❌ | Merkez boylam |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "placeId": "xxx",
      "name": "İstanbul Havalimanı",
      "address": "Terkosköy, İstanbul",
      "location": { "lat": 41.2603, "lng": 28.7279 }
    }
  ]
}
```

---

### GET /places/reverse-geocode

Koordinattan adres bilgisini getirir.

**Query Parameters:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| lat | number | ✅ | Enlem |
| lng | number | ✅ | Boylam |

---

### GET /maps/directions

Rota hesaplar.

**Query Parameters:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| origin | string | ✅ | Başlangıç (lat,lng) |
| destination | string | ✅ | Varış (lat,lng) |

**Response:**

```json
{
  "success": true,
  "data": {
    "distance": 25000,
    "duration": 1800,
    "polyline": "encoded_polyline_here"
  }
}
```

---

## Fiyatlandırma

### GET /pricing

Fiyatlandırma ayarlarını getirir.

**Response:**

```json
{
  "success": true,
  "data": {
    "driverPerKm": 1.5,
    "platformFeePercent": 3,
    "currency": "EUR",
    "vehiclePrices": {
      "sedan": 0,
      "suv": 10,
      "van": 20,
      "luxury": 50
    }
  }
}
```

---

### POST /pricing/calculate

Fiyat hesaplar.

**Request Body:**

```json
{
  "pickup": { "lat": 41.0082, "lng": 28.9784 },
  "dropoff": { "lat": 41.0055, "lng": 28.9784 },
  "vehicleType": "sedan"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "distance": 15.5,
    "driverFare": 23.25,
    "platformFee": 0.70,
    "total": 23.95,
    "currency": "EUR"
  }
}
```

---

### PUT /pricing

Fiyatlandırma ayarlarını günceller (Admin).

**Request Body:**

```json
{
  "driverPerKm": 2.0,
  "platformFeePercent": 5
}
```

---

## Admin

### GET /admin/dashboard

Admin dashboard istatistiklerini getirir.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalBookings": 150,
    "totalRevenue": 15000,
    "totalDrivers": 25,
    "activeDrivers": 10,
    "pendingApprovals": 5,
    "recentBookings": [...]
  }
}
```

---

## Hata Kodları

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `invalid_payload` | 400 | Geçersiz istek verisi |
| `invalid_credentials` | 401 | Yanlış email/şifre |
| `unauthorized` | 401 | Kimlik doğrulama gerekli |
| `forbidden` | 403 | Yetkisiz erişim |
| `not_found` | 404 | Kaynak bulunamadı |
| `driver_not_found` | 404 | Sürücü bulunamadı |
| `request_not_found` | 404 | Talep bulunamadı |
| `email_already_exists` | 400 | Email zaten kayıtlı |
| `docs_required` | 400 | Belgeler eksik |
| `location_required` | 400 | Konum gerekli |
| `approve_failed` | 500 | Onaylama hatası |
| `save_failed` | 500 | Kaydetme hatası |

---

## Rate Limiting

Production ortamında rate limiting uygulanmaktadır:

| Endpoint Tipi | Limit |
|---------------|-------|
| Auth | 10 req/dk |
| API | 100 req/dk |
| Search | 30 req/dk |

---

## WebSocket Events

Gerçek zamanlı iletişim için WebSocket kullanılır:

### Client → Server

| Event | Açıklama |
|-------|----------|
| `driver:location` | Konum güncelleme |
| `booking:subscribe` | Rezervasyon takibi |

### Server → Client

| Event | Açıklama |
|-------|----------|
| `driver:update` | Sürücü güncelleme |
| `ride:request` | Yeni sürüş talebi |
| `ride:taken` | Talep alındı |
| `booking:update` | Rezervasyon güncelleme |
| `driver:approved` | Sürücü onaylandı |

---

## Örnek Kullanım

### JavaScript/TypeScript

```typescript
// API istemcisi
const API = 'https://gettransfer.vercel.app/api'

// Giriş
const login = async (email: string, password: string) => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return res.json()
}

// Rezervasyon oluştur
const createBooking = async (data: BookingData, token: string) => {
  const res = await fetch(`${API}/bookings/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  return res.json()
}
```

### cURL

```bash
# Giriş
curl -X POST https://gettransfer.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# Rezervasyon listesi
curl -X GET https://gettransfer.vercel.app/api/bookings/driver/drv_123 \
  -H "Authorization: Bearer <token>"
```

---

<p align="center">
  <a href="../README.md">← Ana Sayfaya Dön</a>
</p>
