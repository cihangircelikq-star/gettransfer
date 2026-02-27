import { Router, type Request, type Response } from 'express'
import { createBooking, getBookingById, listPendingBookings, updateBooking, generateReservationCode, listBookingsByDriver } from '../services/bookingsStorage.js'
import { getDriver, saveDriver } from '../services/storage.js'

const router = Router()

// ============================================
// RIDE LIFECYCLE - Yandex Go tarzı
// ============================================

// 1. Müşteri yeni yolculuk talebi oluştur
router.post('/request', async (req: Request, res: Response) => {
  const { customerId, pickup, dropoff, vehicleType, passengerCount, price, guestName, guestPhone } = req.body || {}
  
  if (!pickup || !dropoff || !pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
    res.status(400).json({ success: false, error: 'Pickup ve dropoff konumları gerekli' })
    return
  }

  const reservationCode = await generateReservationCode()
  const now = new Date().toISOString()
  const rideId = 'ride_' + Date.now()
  
  const ride = await createBooking({
    id: rideId,
    reservationCode,
    customerId: customerId || undefined,
    guestName: guestName || undefined,
    guestPhone: guestPhone || undefined,
    pickupLocation: {
      lat: pickup.lat,
      lng: pickup.lng,
      address: pickup.address || 'Alış Noktası'
    },
    dropoffLocation: {
      lat: dropoff.lat,
      lng: dropoff.lng,
      address: dropoff.address || 'Varış Noktası'
    },
    pickupTime: now,
    passengerCount: passengerCount || 1,
    vehicleType: vehicleType || 'sedan',
    status: 'pending',
    basePrice: price || 0,
    finalPrice: price || 0,
    isImmediate: true,
  })

  console.log('✅ Yeni yolculuk talebi:', rideId, 'Kod:', reservationCode)
  res.json({ success: true, data: ride })
})

// 2. Sürücü: Bekleyen talepleri listele (sadece son 10 dakika)
router.get('/pending', async (req: Request, res: Response) => {
  const { vehicleType } = req.query
  
  const rides = await listPendingBookings(vehicleType as string || undefined)
  
  // Sadece son 10 dakikadakileri göster
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  const recentRides = rides.filter((r: any) => {
    const createdAt = new Date(r.createdAt || r.pickupTime).getTime()
    return createdAt > tenMinutesAgo
  })

  console.log(`📋 Pending rides: ${recentRides.length} adet`)
  res.json({ success: true, data: recentRides })
})

// 3. Sürücü: Talebi kabul et
router.post('/accept', async (req: Request, res: Response) => {
  const { rideId, driverId } = req.body || {}
  
  if (!rideId || !driverId) {
    res.status(400).json({ success: false, error: 'rideId ve driverId gerekli' })
    return
  }

  // Önce mevcut durumu kontrol et
  const existingRide = await getBookingById(rideId)
  if (!existingRide) {
    res.status(404).json({ success: false, error: 'Talep bulunamadı' })
    return
  }
  
  if (existingRide.status !== 'pending') {
    res.status(409).json({ success: false, error: 'Bu talep zaten alınmış veya iptal edilmiş' })
    return
  }

  // Sürücü bilgilerini al
  const driver = await getDriver(driverId)

  // Talebi güncelle
  const updated = await updateBooking(rideId, {
    status: 'accepted',
    driverId: driverId,
  })

  if (!updated) {
    res.status(500).json({ success: false, error: 'Güncelleme başarısız' })
    return
  }

  // Sürücüyü meşgul yap
  if (driver) {
    driver.available = false
    await saveDriver(driver).catch(() => {})
  }

  console.log('✅ Yolculuk kabul edildi:', rideId, 'by', driverId)
  res.json({ 
    success: true, 
    data: {
      ...updated,
      driverName: driver?.name || 'Şoför',
      driverPhone: driver?.phone || '',
      driverVehicle: driver?.vehicleModel || '',
      driverPlate: driver?.licensePlate || ''
    }
  })
})

// 4. Sürücü: Müşteriye doğru yola çık
router.post('/en-route', async (req: Request, res: Response) => {
  const { rideId } = req.body || {}
  
  const updated = await updateBooking(rideId, { status: 'driver_en_route' })
  if (!updated) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  console.log('🚗 Şoför yola çıktı:', rideId)
  res.json({ success: true, data: updated })
})

// 5. Sürücü: Müşterinin yanına vardı
router.post('/arrived', async (req: Request, res: Response) => {
  const { rideId } = req.body || {}
  
  const updated = await updateBooking(rideId, { status: 'driver_arrived' })
  if (!updated) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  console.log('📍 Şoför müşterinin yanında:', rideId)
  res.json({ success: true, data: updated })
})

// 6. Sürücü: Yolculuğu başlat (müşteri araçta)
router.post('/start', async (req: Request, res: Response) => {
  const { rideId } = req.body || {}
  
  const updated = await updateBooking(rideId, { 
    status: 'in_progress',
    pickedUpAt: new Date().toISOString()
  })
  
  if (!updated) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  console.log('🚗 Yolculuk başladı:', rideId)
  res.json({ success: true, data: updated })
})

// 7. Sürücü: Yolculuğu tamamla
router.post('/complete', async (req: Request, res: Response) => {
  const { rideId } = req.body || {}
  
  const ride = await getBookingById(rideId)
  if (!ride) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  const updated = await updateBooking(rideId, { 
    status: 'completed',
    completedAt: new Date().toISOString()
  })

  // Sürücüyü tekrar müsait yap
  if (ride.driverId) {
    const driver = await getDriver(ride.driverId)
    if (driver) {
      driver.available = true
      await saveDriver(driver).catch(() => {})
    }
  }

  console.log('✅ Yolculuk tamamlandı:', rideId)
  res.json({ success: true, data: updated })
})

// 8. Müşteri: Yolculuk durumunu sorgula
router.get('/status/:rideId', async (req: Request, res: Response) => {
  const { rideId } = req.params
  
  const ride = await getBookingById(rideId)
  if (!ride) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  // Sürücü bilgilerini ekle
  let driverInfo = null
  if (ride.driverId) {
    const driver = await getDriver(ride.driverId)
    if (driver) {
      driverInfo = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicleModel,
        plate: driver.licensePlate,
        vehicleType: driver.vehicleType,
        location: driver.location
      }
    }
  }

  res.json({ 
    success: true, 
    data: {
      id: ride.id,
      status: ride.status,
      reservationCode: ride.reservationCode,
      pickup: ride.pickupLocation,
      dropoff: ride.dropoffLocation,
      vehicleType: ride.vehicleType,
      passengerCount: ride.passengerCount,
      price: ride.finalPrice || ride.basePrice,
      driver: driverInfo,
      createdAt: ride.createdAt,
      pickedUpAt: ride.pickedUpAt,
      completedAt: ride.completedAt
    }
  })
})

// 9. Rezervasyon kodu ile sorgula
router.get('/lookup', async (req: Request, res: Response) => {
  const { phone, code } = req.query
  
  if (!phone || !code) {
    res.status(400).json({ success: false, error: 'Telefon ve kod gerekli' })
    return
  }

  const { findBookingByPhoneAndCode } = await import('../services/bookingsStorage.js')
  const ride = await findBookingByPhoneAndCode(phone as string, code as string)
  
  if (!ride) {
    res.status(404).json({ success: false, error: 'Rezervasyon bulunamadı' })
    return
  }

  res.json({ success: true, data: ride })
})

// 10. İptal et
router.post('/cancel', async (req: Request, res: Response) => {
  const { rideId, reason } = req.body || {}
  
  const ride = await getBookingById(rideId)
  if (!ride) {
    res.status(404).json({ success: false, error: 'Yolculuk bulunamadı' })
    return
  }

  // Sadece pending, accepted, driver_en_route, driver_arrived durumunda iptal edilebilir
  if (!['pending', 'accepted', 'driver_en_route', 'driver_arrived'].includes(ride.status)) {
    res.status(400).json({ success: false, error: 'Bu yolculuk iptal edilemez' })
    return
  }

  const updated = await updateBooking(rideId, { status: 'cancelled' })

  // Sürücüyü tekrar müsait yap
  if (ride.driverId) {
    const driver = await getDriver(ride.driverId)
    if (driver) {
      driver.available = true
      await saveDriver(driver).catch(() => {})
    }
  }

  console.log('❌ Yolculuk iptal edildi:', rideId, reason || '')
  res.json({ success: true, data: updated })
})

// 11. Sürücünün aktif yolculuğu
router.get('/driver/active/:driverId', async (req: Request, res: Response) => {
  const { driverId } = req.params
  
  const rides = await listBookingsByDriver(driverId)
  
  // Aktif yolculuk: accepted, driver_en_route, driver_arrived, in_progress
  const activeRide = rides.find((r: any) => 
    ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(r.status)
  )
  
  if (!activeRide) {
    res.json({ success: true, data: null })
    return
  }

  res.json({ success: true, data: activeRide })
})

// 12. Sürücünün geçmiş yolculukları
router.get('/driver/history/:driverId', async (req: Request, res: Response) => {
  const { driverId } = req.params
  
  const rides = await listBookingsByDriver(driverId)
  
  // Sadece tamamlanan ve iptal edilenler
  const history = rides.filter((r: any) => 
    ['completed', 'cancelled'].includes(r.status)
  )
  
  res.json({ success: true, data: history })
})

// 13. Eski pending talepleri temizle (otomatik expire)
router.post('/cleanup', async (req: Request, res: Response) => {
  const rides = await listPendingBookings()
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  
  let cleaned = 0
  for (const ride of rides) {
    const createdAt = new Date(ride.createdAt || ride.pickupTime).getTime()
    if (createdAt < tenMinutesAgo) {
      await updateBooking(ride.id, { status: 'cancelled' })
      cleaned++
    }
  }

  console.log(`🧹 ${cleaned} eski talep temizlendi`)
  res.json({ success: true, message: `${cleaned} eski talep temizlendi` })
})

export default router
