/**
 * Bu script test sürücülerinin verilerini Supabase'de günceller.
 * Çalıştırmak için: node backend/scripts/seed-test-drivers.js
 * 
 * Önce Supabase'de drivers tablosunda phone ve address sütunlarının olduğundan emin olun:
 * - Eğer yoksa, supabase/add_driver_columns.sql dosyasını Supabase SQL Editor'de çalıştırın
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('HATA: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli!')
  process.exit(1)
}

const TEST_DRIVERS = [
  {
    id: 'drv_fatih',
    name: 'Fatih Yılmaz',
    email: 'fatih@test.com',
    phone: '0532 555 12 34',
    address: 'Kadıköy Mahallesi, Bağdat Caddesi No: 45, Kadıköy/İstanbul',
    vehicle_type: 'sedan',
    vehicle_model: 'Toyota Corolla 2022',
    license_plate: '34 ABC 123',
    docs: [
      { name: 'license', url: 'https://placehold.co/400x300/1e40af/white?text=Suru+cu+Belgesi', uploadedAt: '2024-01-15T10:00:00Z', status: 'approved' },
      { name: 'vehicle_registration', url: 'https://placehold.co/400x300/166534/white?text=Ruhsat', uploadedAt: '2024-01-15T10:05:00Z', status: 'approved' },
      { name: 'insurance', url: 'https://placehold.co/400x300/7c3aed/white?text=Sigorta', uploadedAt: '2024-01-15T10:10:00Z', status: 'approved' },
      { name: 'profile_photo', url: 'https://placehold.co/400x400/374151/white?text=Fatih', uploadedAt: '2024-01-15T10:15:00Z', status: 'approved' },
    ],
    location_lat: 40.9819,
    location_lng: 29.0267,
    available: false,
    approved: true,
  },
  {
    id: 'drv_vedat',
    name: 'Vedat Demir',
    email: 'vedat@test.com',
    phone: '0533 666 78 90',
    address: 'Beşiktaş Mahallesi, Barbaros Bulvarı No: 78, Beşiktaş/İstanbul',
    vehicle_type: 'luxury',
    vehicle_model: 'Mercedes E-Class 2023',
    license_plate: '34 XYZ 456',
    docs: [
      { name: 'license', url: 'https://placehold.co/400x300/1e40af/white?text=Suru+cu+Belgesi', uploadedAt: '2024-02-01T09:00:00Z', status: 'approved' },
      { name: 'vehicle_registration', url: 'https://placehold.co/400x300/166534/white?text=Ruhsat', uploadedAt: '2024-02-01T09:05:00Z', status: 'approved' },
      { name: 'insurance', url: 'https://placehold.co/400x300/7c3aed/white?text=Sigorta', uploadedAt: '2024-02-01T09:10:00Z', status: 'approved' },
      { name: 'profile_photo', url: 'https://placehold.co/400x400/374151/white?text=Vedat', uploadedAt: '2024-02-01T09:15:00Z', status: 'approved' },
    ],
    location_lat: 41.0421,
    location_lng: 29.0093,
    available: false,
    approved: true,
  }
]

async function seedDrivers() {
  console.log('Test sürücüleri güncelleniyor...')
  
  for (const driver of TEST_DRIVERS) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/drivers?id=eq.${driver.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(driver)
      })
      
      if (!response.ok) {
        const text = await response.text()
        console.error(`HATA: ${driver.name} güncellenemedi:`, response.status, text)
        continue
      }
      
      const result = await response.json()
      if (Array.isArray(result) && result.length > 0) {
        console.log(`✓ ${driver.name} güncellendi`)
      } else {
        // Sürücü yoksa, yeni kayıt oluştur
        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/drivers`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(driver)
        })
        
        if (insertResponse.ok) {
          console.log(`✓ ${driver.name} yeni kayıt olarak eklendi`)
        } else {
          console.error(`HATA: ${driver.name} eklenemedi`)
        }
      }
    } catch (err) {
      console.error(`HATA: ${driver.name} işlenirken hata:`, err.message)
    }
  }
  
  console.log('\nTamamlandı!')
}

seedDrivers()
