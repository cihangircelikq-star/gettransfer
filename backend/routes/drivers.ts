import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { saveDriver, getDriver, getDriverByEmail, listDriversByStatus, approveDriver, rejectDriver, updateDriverPartial, deleteDriver } from '../services/storage.js'
import { diagnoseSupabase } from '../services/storage.js'
import { createBooking, generateReservationCode, getBookingById, updateBooking, listPendingBookings } from '../services/bookingsStorage.js'
import { getPricingConfig } from '../services/pricingStorage.js'

const router = Router()

type DriverDoc = {
  name: string
  url?: string
  uploadedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
}

type DriverSession = {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  password?: string
  passwordHash?: string
  passwordSalt?: string
  tcid?: string
  licenseNumber?: string
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury'
  vehicleModel?: string
  licensePlate?: string
  docs?: DriverDoc[]
  location: { lat: number, lng: number }
  available: boolean
  approved: boolean
  rejectedReason?: string
}

type RideRequest = {
  id: string
  customerId: string
  passengerCount?: number
  basePrice?: number
  pickup: { lat: number, lng: number, address: string }
  dropoff: { lat: number, lng: number, address: string }
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury'
  status: 'pending' | 'accepted' | 'cancelled'
  targetDriverId?: string
  driverId?: string
}

const drivers: Map<string, DriverSession> = new Map()
const requests: Map<string, RideRequest> = new Map()
const complaints: Array<{ id: string, driverId: string, text: string, createdAt: string }> = []
// Konum doğrulama - (0,0) geçersiz sayılır (Afrika açıkları)
const isValidLatLng = (p: any) => {
  if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') return false
  if (!isFinite(p.lat) || !isFinite(p.lng)) return false
  if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) return false
  // (0, 0) koordinatları geçersiz - hiçbir sürücü Afrika açıklarında olamaz
  if (p.lat === 0 && p.lng === 0) return false
  // Türkiye sınırları içinde mi kontrol et (opsiyonel - yorum satırı)
  // if (p.lat < 35.5 || p.lat > 42.5 || p.lng < 25.5 || p.lng > 44.5) return false
  return true
}

// Konum geçerli mi kontrol et - NULL veya (0,0) için false döner
const hasValidLocation = (p: any): boolean => {
  if (!p) return false
  return isValidLatLng(p)
}
const liveLocationTs: Map<string, number> = new Map()
const lastPersisted: Map<string, { ts: number, loc: { lat: number, lng: number } }> = new Map()
const LOCATION_PERSIST_MIN_INTERVAL_MS = 30_000
const LOCATION_PERSIST_MIN_DISTANCE_M = 100

const haversine = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const round2 = (n: number) => Math.round(n * 100) / 100

const bboxFilter = (center: { lat: number, lng: number }, radiusMeters: number) => {
  const dLat = (radiusMeters / 111320)
  const dLng = (radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180)))
  const minLat = center.lat - dLat
  const maxLat = center.lat + dLat
  const minLng = center.lng - dLng
  const maxLng = center.lng + dLng
  return (p: { lat: number, lng: number }) => p.lat >= minLat && p.lat <= maxLat && p.lng >= minLng && p.lng <= maxLng
}

router.post('/register', (req: Request, res: Response) => {
  const { id, name, email, tcid, licenseNumber, vehicleType, vehicleModel, licensePlate, docs, location } = req.body || {}
  if (!id || !name || !email || !vehicleType || !location || !isValidLatLng(location)) {
    res.status(400).json({ success: false, error: 'invalid_payload' })
    return
  }
  const emailNorm = String(email).trim().toLowerCase()
  const d: DriverSession = {
    id,
    name,
    email: emailNorm,
    tcid: tcid || 'NA',
    licenseNumber: licenseNumber || 'NA',
    vehicleType,
    vehicleModel: vehicleModel || 'Araç',
    licensePlate: licensePlate || '',
    docs: Array.isArray(docs) ? docs : [],
    location,
    available: true,
    approved: false, // Yeni kayıtlar onay bekliyor
  }
  drivers.set(id, d)
  saveDriver(d).catch(()=>{})
  res.json({ success: true, data: d })
})

router.post('/clean-stale-requests', (_req: Request, res: Response) => {
    requests.clear()
    res.json({ success: true, message: 'All stale requests cleared' })
})

router.post('/apply', async (req: Request, res: Response) => {
  const { name, email, password, phone, address, vehicleType, vehicleModel, licensePlate, docs, location } = req.body || {}
  // Konum ZORUNLU - gerçek konum olmadan kayıt yapılamaz
  if (!name || !email || typeof password !== 'string' || password.length < 6 || !phone || !address || !vehicleType || !location || !isValidLatLng(location)) {
    res.status(400).json({ success: false, error: 'invalid_payload_location_required' })
    return
  }
  const emailNorm = String(email).trim().toLowerCase()
  const reqDocs = ['license','vehicle_registration','insurance','profile_photo']
  const docsArr = Array.isArray(docs) ? docs : []
  const okDocs = reqDocs.every(n => docsArr.some((d:any)=>d?.name===n && typeof d?.url==='string' && d.url.length>10))
  if (!okDocs) { res.status(400).json({ success: false, error: 'docs_required' }); return }
  
  // E-posta ile kayıtlı sürücü var mı kontrol et
  const existingDriver = await getDriverByEmail(emailNorm)
  if (existingDriver) {
    res.status(400).json({ success: false, error: 'email_already_exists' })
    return
  }
  
  const id = 'drv_' + Date.now()
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  const d: DriverSession = {
    id,
    name,
    email: emailNorm,
    phone: String(phone).trim(),
    address: String(address).trim(),
    passwordHash: hash,
    passwordSalt: salt,
    tcid: 'NA',
    licenseNumber: 'NA',
    vehicleType,
    vehicleModel: vehicleModel || 'Araç',
    licensePlate: licensePlate || '',
    docs: docsArr.map((x:any)=>({ name: x?.name, url: x?.url })),
    location: location, // Sürücünün gerçek konumu
    available: false,
    approved: false,
  }
  
  // SADECE saveDriver çağır - o içinde memory.set yapıyor
  try {
    await saveDriver(d)
    console.log('✅ Driver saved to database:', id)
  } catch (e) {
    console.error('❌ Failed to save driver:', id, e)
    res.status(500).json({ success: false, error: 'save_failed' })
    return
  }
  
  // Admin'e bildir
  try { (req.app.get('io') as any)?.emit('driver:applied', d) } catch {}
  
  res.json({ success: true, data: d })
})

router.post('/auth', async (req: Request, res: Response) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
  let found = Array.from(drivers.values()).find(d => d.email === email)
  if (!found) {
    try { found = await (await import('../services/storage.js')).getDriverByEmail(email) || undefined as any } catch {}
  }
  if (!found) {
    res.status(401).json({ success: false, error: 'invalid_credentials' }); return
  }
  let ok = false
  if (found.passwordHash && found.passwordSalt) {
    try {
      const calc = crypto.scryptSync(password, found.passwordSalt, 64).toString('hex')
      ok = crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(found.passwordHash, 'hex'))
    } catch {}
  } else if (found.password) {
    ok = found.password === password
  }
  if (!ok) { res.status(401).json({ success: false, error: 'invalid_credentials' }); return }
  res.json({
    success: true,
    data: {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
      address: found.address,
      role: 'driver',
      approved: found.approved,
      vehicleType: found.vehicleType,
      vehicleModel: found.vehicleModel,
      licensePlate: found.licensePlate,
      location: found.location,
      available: found.available ?? false
    }
  })
})

router.post('/location', async (req: Request, res: Response) => {
  const { id, location, available } = req.body || {}
  
  if (!id) {
    res.status(400).json({ success: false, error: 'driver_id_required' })
    return
  }
  
  let d = drivers.get(id)
  
  // Sürücü bellekte yoksa veritabanından yükle
  if (!d) {
    try {
      d = await getDriver(id) as DriverSession | undefined
      if (d) drivers.set(id, d)
    } catch (e) {
      console.error('Driver load error:', e)
    }
  }
  
  if (!d) {
    // Sürücü yoksa yeni oluştur (fallback)
    if (location && isValidLatLng(location)) {
      d = {
        id,
        name: 'Sürücü',
        location,
        available: typeof available === 'boolean' ? available : false,
        vehicleType: 'sedan',
        approved: true,
      }
      drivers.set(id, d)
    } else {
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return
    }
  }
  
  const now = Date.now()
  const hasLoc = location && isValidLatLng(location)
  
  // GERÇEK GPS konumunu kaydet
  if (hasLoc) {
    d.location = location
    liveLocationTs.set(id, now)
    console.log('📍 Sürücü konumu güncellendi:', id, location)
  }
  
  if (typeof available === 'boolean') d.available = available
  drivers.set(id, d)
  
  // SERVERLESS: Socket.io çalışmayabilir, ama yine de dene
  try { (req.app.get('io') as any)?.emit('driver:update', d) } catch {}
  
  // SERVERLESS: Her konum güncellemesini ANINDA veritabanına yaz
  if (hasLoc || typeof available === 'boolean') {
    try {
      await saveDriver(d)
      console.log('✅ Sürücü veritabanına kaydedildi:', id, 'konum:', d.location)
    } catch (e) {
      console.error('❌ Sürücü kaydetme hatası:', e)
    }
  }
  
  res.json({ success: true, location: d.location, available: d.available, driverId: id })
})

router.post('/status', async (req: Request, res: Response) => {
  const { id, available } = req.body || {}
  let d = drivers.get(id)
  
  // Sürücü bellekte yoksa veritabanından yükle
  if (!d) {
    try {
      d = await getDriver(id) as DriverSession | undefined
      if (d) drivers.set(id, d)
    } catch {}
  }
  
  if (!d) { res.status(404).json({ success: false, error: 'driver_not_found' }); return }
  if (!!available && (!d.location || (d.location.lat === 0 && d.location.lng === 0))) {
    res.status(400).json({ success: false, error: 'location_required' })
    return
  }
  d.available = !!available
  drivers.set(id, d)
  
  // SERVERLESS: Her durum değişikliğini ANINDA veritabanına yaz
  try { await saveDriver(d) } catch {}
  
  res.json({ success: true, data: d })
})

router.post('/profile', (req: Request, res: Response) => {
  const { id, name, vehicleModel, licensePlate } = req.body || {}
  const d = drivers.get(id)
  if (!d) { res.status(404).json({ success: false, error: 'driver_not_found' }); return }
  if (typeof name === 'string' && name.trim()) d.name = name.trim()
  if (typeof vehicleModel === 'string' && vehicleModel.trim()) d.vehicleModel = vehicleModel.trim()
  if (typeof licensePlate === 'string') d.licensePlate = licensePlate.trim()
  drivers.set(id, d)
  updateDriverPartial(id, d).catch(()=>{})
  res.json({ success: true, data: d })
})

// Sürücüye özel fiyatlandırma
router.post('/pricing', async (req: Request, res: Response) => {
  const { id, driverPerKm, platformFeePercent, customPricing } = req.body || {}
  
  let d = drivers.get(id)
  if (!d) {
    try {
      d = await getDriver(id) as DriverSession | undefined
      if (d) drivers.set(id, d)
    } catch {}
  }
  
  if (!d) { res.status(404).json({ success: false, error: 'driver_not_found' }); return }
  
  // Store pricing info in driver object
  const updatedDriver = {
    ...d,
    driverPerKm: typeof driverPerKm === 'number' ? driverPerKm : undefined,
    platformFeePercent: typeof platformFeePercent === 'number' ? platformFeePercent : undefined,
    customPricing: !!customPricing
  } as any
  
  drivers.set(id, updatedDriver)
  
  // Also save to database with pricing fields
  try {
    const updateData: any = {}
    if (typeof driverPerKm === 'number') updateData.driver_per_km = driverPerKm
    if (typeof platformFeePercent === 'number') updateData.platform_fee_percent = platformFeePercent
    updateData.custom_pricing = !!customPricing
    
    // Update in Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/drivers?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      })
    }
  } catch {}
  
  res.json({ success: true, data: updatedDriver })
})

router.post('/request', async (req: Request, res: Response) => {
  const { id, customerId, passengerCount, basePrice, pickup, dropoff, vehicleType, targetDriverId } = req.body || {}
  if (!id || !customerId || !pickup || !dropoff || !vehicleType || !isValidLatLng(pickup) || !isValidLatLng(dropoff)) {
    res.status(400).json({ success: false, error: 'invalid_payload' })
    return
  }
  
  // Talebi doğrudan bookings tablosuna kaydet (kalıcı depolama)
  const now = new Date().toISOString()
  const pricing = await getPricingConfig().catch(() => null)
  const distKm = round2(haversine(pickup, dropoff) / 1000)
  const driverPerKm = pricing?.driverPerKm ?? 1
  const feePct = pricing?.platformFeePercent ?? 3
  const driverFare = round2(distKm * driverPerKm)
  const total = round2(driverFare * (1 + feePct / 100))
  const reservationCode = await generateReservationCode()
  
  const bookingData = {
    id,
    reservationCode,
    customerId,
    driverId: targetDriverId || undefined,
    pickupLocation: { lat: pickup.lat, lng: pickup.lng, address: pickup.address || 'Alış Noktası' },
    dropoffLocation: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address || 'Varış Noktası' },
    pickupTime: now,
    passengerCount: passengerCount || 1,
    vehicleType,
    status: 'pending' as const,
    basePrice: driverFare,
    finalPrice: total,
    paymentStatus: 'unpaid' as const,
    extras: { pricing: { driverPerKm, platformFeePercent: feePct, distanceKm: distKm, driverFare, platformFee: round2(total - driverFare), total, currency: pricing?.currency || 'EUR' } },
  }
  
  try {
    await createBooking(bookingData)
    console.log('Ride request saved to bookings:', id)
  } catch (e) {
    console.error('Failed to save ride request:', e)
  }
  
  // Ayrıca bellekte de tut (geriye dönük uyumluluk için)
  const r: RideRequest = {
    id,
    customerId,
    passengerCount: typeof passengerCount === 'number' && isFinite(passengerCount) ? Math.max(1, Math.floor(passengerCount)) : undefined,
    basePrice: typeof basePrice === 'number' && isFinite(basePrice) ? basePrice : undefined,
    pickup,
    dropoff,
    vehicleType,
    status: 'pending',
    targetDriverId: typeof targetDriverId === 'string' && targetDriverId.trim() ? targetDriverId.trim() : undefined,
  }
  requests.set(id, r)
  
  const preFilter = bboxFilter(pickup, 3000)
  let pool: DriverSession[] = []
  try { pool = await listDriversByStatus('approved') } catch { pool = Array.from(drivers.values()).filter(d=>d.approved) }
  const candidates = pool.filter(d => d.available && d.vehicleType === vehicleType && preFilter(d.location))
  const targeted = r.targetDriverId ? candidates.filter(d => d.id === r.targetDriverId) : candidates
  const sorted = targeted.sort((a, b) => haversine(pickup, a.location) - haversine(pickup, b.location))
  
  // Socket ile sürücülere bildir
  try { 
      const io = req.app.get('io') as any
      // Broadcast to ALL drivers initially, client side filters if it is relevant
      io?.emit('ride:request', r) 
      
      // Also send specifically to target driver if exists
      if (r.targetDriverId) {
         io?.emit(`driver:${r.targetDriverId}:request`, r)
      }
  } catch {}
  
  res.json({ success: true, data: { request: r, candidates: sorted.slice(0, 10) } })
})

router.get('/requests', async (req: Request, res: Response) => {
  const vt = req.query.vehicleType as string
  
  try {
    // Supabase'ten pending bookingleri çek (artık calisiyor)
    const pendingBookings = await listPendingBookings(vt || undefined)
    
    const dbList: RideRequest[] = pendingBookings.map((b: any) => ({
      id: b.id,
      customerId: b.customerId || '',
      passengerCount: b.passengerCount,
      basePrice: b.basePrice,
      pickup: b.pickupLocation,
      dropoff: b.dropoffLocation,
      vehicleType: b.vehicleType,
      status: 'pending' as const,
      targetDriverId: b.driverId || undefined,
    }))
    
    // Bellekteki talepleri de ekle (duplicate kontrolü ile)
    const memoryList = Array.from(requests.values()).filter(r => r.status === 'pending' && (!vt || r.vehicleType === vt))
    const allRequests = [...dbList]
    for (const r of memoryList) {
      if (!allRequests.some(x => x.id === r.id)) {
        allRequests.push(r)
      }
    }
    
    res.json({ success: true, data: allRequests })
  } catch (e) {
    console.error('Failed to fetch pending bookings:', e)
    // Fallback to memory
    const memoryList = Array.from(requests.values()).filter(r => r.status === 'pending' && (!vt || r.vehicleType === vt))
    res.json({ success: true, data: memoryList })
  }
})

router.post('/accept', (req: Request, res: Response) => {
  const { driverId, requestId } = req.body || {}
  
  ;(async () => {
    // Önce bellekte ara, yoksa veritabanından çek
    let r = requests.get(requestId)
    
    if (!r) {
      // Veritabanından pending booking'i ara
      const booking = await getBookingById(requestId)
      if (booking && booking.status === 'pending') {
        r = {
          id: booking.id,
          customerId: booking.customerId || '',
          passengerCount: booking.passengerCount,
          basePrice: booking.basePrice,
          pickup: booking.pickupLocation,
          dropoff: booking.dropoffLocation,
          vehicleType: booking.vehicleType as any,
          status: 'pending',
          targetDriverId: booking.driverId,
        }
      }
    }
    
    if (!r) {
      res.status(404).json({ success: false, error: 'request_not_found' })
      return
    }
    
    if (r.targetDriverId && r.targetDriverId !== driverId) {
      res.status(409).json({ success: false, error: 'not_target_driver' })
      return
    }
    
    r.status = 'accepted'
    r.driverId = driverId
    requests.set(requestId, r)

    // Sürücü bilgilerini al
    const driver = await getDriver(driverId)

    const d = drivers.get(driverId)
    if (d) {
      d.available = false
      drivers.set(driverId, d)
      saveDriver(d).catch(() => {})
      try { (req.app.get('io') as any)?.emit('driver:update', d) } catch {}
    }

    let booking = await getBookingById(r.id)
    if (!booking) {
      const now = new Date().toISOString()
      const pricing = await getPricingConfig().catch(() => null)
      const distKm = round2(haversine(r.pickup, r.dropoff) / 1000)
      const driverPerKm = pricing?.driverPerKm ?? 1
      const feePct = pricing?.platformFeePercent ?? 3
      const driverFare = round2(distKm * driverPerKm)
      const total = round2(driverFare * (1 + feePct / 100))
      const reservationCode = await generateReservationCode()
      booking = await createBooking({
        id: r.id,
        reservationCode,
        customerId: r.customerId,
        driverId,
        pickupLocation: { lat: r.pickup.lat, lng: r.pickup.lng, address: r.pickup.address || 'Alış Noktası' },
        dropoffLocation: { lat: r.dropoff.lat, lng: r.dropoff.lng, address: r.dropoff.address || 'Varış Noktası' },
        pickupTime: now,
        passengerCount: r.passengerCount || 1,
        vehicleType: r.vehicleType,
        status: 'accepted',
        basePrice: driverFare,
        finalPrice: total,
        paymentStatus: 'unpaid',
        paymentMethod: undefined,
        paidAt: undefined,
        route: undefined,
        pickedUpAt: undefined,
        completedAt: undefined,
        extras: { pricing: { driverPerKm, platformFeePercent: feePct, distanceKm: distKm, driverFare, platformFee: round2(total - driverFare), total, currency: pricing?.currency || 'EUR' } },
      } as any)
    } else {
      booking = await updateBooking(r.id, { status: 'accepted', driverId } as any)
    }

    // Driver bilgilerini booking'e ekle
    const enrichedBooking = {
      ...booking,
      driverName: driver?.name || 'Şoför',
      driverPhone: driver?.phone || ''
    }

    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:update', enrichedBooking)
      io?.to?.(`booking:${booking.id}`)?.emit?.('booking:update', enrichedBooking)
      
      // Notify everyone that this request is TAKEN so they can remove it from list
      io?.emit('ride:taken', { requestId: r.id, driverId })
      
      // Also explicitly tell the driver who took it
      io?.emit(`driver:${driverId}:assigned`, enrichedBooking)
    } catch {}
    res.json({ success: true, data: enrichedBooking })
  })().catch(() => res.status(500).json({ success: false, error: 'accept_failed' }))
})

router.post('/cancel', (req: Request, res: Response) => {
  const { requestId, customerId } = req.body || {}
  const r = requests.get(requestId)
  if (!r || (customerId && r.customerId !== customerId)) {
    res.status(404).json({ success: false, error: 'request_not_found' })
    return
  }
  if (r.status === 'pending') {
    r.status = 'cancelled'
    requests.set(requestId, r)
    try { (req.app.get('io') as any)?.emit('ride:cancelled', { id: r.id, customerId: r.customerId }) } catch {}
  }
  res.json({ success: true, data: r })
})

router.get('/pending', async (_req: Request, res: Response) => {
  try {
    console.log('📋 Fetching pending drivers...')
    const list = await listDriversByStatus('pending')
    console.log(`✅ Found ${list.length} pending drivers`)
    res.json({ success: true, data: list })
  } catch (e) {
    console.error('❌ Pending drivers fetch error:', e)
    res.status(500).json({ success: false, error: 'fetch_failed', details: String(e) })
  }
})

router.get('/list', async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'all'
  const st = status === 'approved' || status === 'pending' || status === 'rejected' ? status : 'all'
  
  console.log(`📋 Fetching drivers with status: ${st}`)
  
  try {
    const list = await listDriversByStatus(st as any)
    console.log(`✅ Found ${list.length} drivers with status: ${st}`)
    res.json({ success: true, data: list })
  } catch (e) {
    console.error(`❌ Drivers list fetch error (${st}):`, e)
    res.status(500).json({ success: false, error: 'fetch_failed', details: String(e) })
  }
})

router.get('/diag', async (_req: Request, res: Response) => {
  try {
    const status = await diagnoseSupabase()
    
    // Environment variables durumunu da ekle (hassas değerleri gizle)
    const envStatus = {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...status, 
        environment: envStatus,
        timestamp: new Date().toISOString()
      } 
    })
  } catch (e) {
    res.json({ 
      success: false, 
      data: { 
        connected: false, 
        error: String(e),
        environment: {
          SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
        }
      } 
    })
  }
})

router.post('/approve', async (req: Request, res: Response) => {
  const { id } = req.body || {}
  
  console.log('🔵 [APPROVE ROUTE] ========================================')
  console.log('🔵 [APPROVE ROUTE] Request received with id:', id)
  console.log('🔵 [APPROVE ROUTE] Request body:', JSON.stringify(req.body, null, 2))
  
  if (!id) {
    console.error('❌ [APPROVE ROUTE] driver id is required')
    res.status(400).json({ success: false, error: 'driver_id_required' })
    return
  }
  
  try {
    // Önce sürücünün var olduğunu kontrol et
    console.log('🔵 [APPROVE ROUTE] Checking if driver exists:', id)
    const existingDriver = await getDriver(id)
    
    console.log('🔵 [APPROVE ROUTE] Existing driver:', existingDriver ? {
      id: existingDriver.id,
      name: existingDriver.name,
      email: existingDriver.email,
      approved: existingDriver.approved
    } : 'NOT FOUND')
    
    if (!existingDriver) {
      console.error('❌ [APPROVE ROUTE] driver not found:', id)
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return
    }
    
    // Onayla
    console.log('🔵 [APPROVE ROUTE] Calling approveDriver...')
    await approveDriver(id)
    console.log('✅ [APPROVE ROUTE] approveDriver completed successfully')
    
    // Güncel sürücü bilgisini getir
    const d = await getDriver(id)
    console.log('🔵 [APPROVE ROUTE] Driver after approval:', d ? {
      id: d.id,
      name: d.name,
      email: d.email,
      approved: d.approved
    } : 'NOT FOUND')
    
    if (d) {
      drivers.set(id, d)
      console.log('✅ [APPROVE ROUTE] Driver cache updated')
    }
    
    // Socket ile bildir
    try { 
      (req.app.get('io') as any)?.emit('driver:approved', { id, driver: d }) 
      console.log('✅ [APPROVE ROUTE] Socket notification sent')
    } catch (e) {
      console.error('⚠️ [APPROVE ROUTE] Socket notification failed:', e)
    }
    
    console.log('✅ [APPROVE ROUTE] Sending success response')
    console.log('🔵 [APPROVE ROUTE] ========================================')
    res.json({ success: true, data: d })
  } catch (e) {
    console.error('❌ [APPROVE ROUTE] Error:', e)
    res.status(500).json({ success: false, error: 'approve_failed', details: String(e) })
  }
})

router.post('/reject', async (req: Request, res: Response) => {
  const { id, reason } = req.body || {}
  
  if (!id) {
    console.error('Reject error: driver id is required')
    res.status(400).json({ success: false, error: 'driver_id_required' })
    return
  }
  
  try {
    // Önce sürücünün var olduğunu kontrol et
    const existingDriver = await getDriver(id)
    if (!existingDriver) {
      console.error('Reject error: driver not found:', id)
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return
    }
    
    // Reddet
    await rejectDriver(id, reason)
    console.log('✅ Driver rejected in database:', id)
    
    // Güncel sürücü bilgisini getir
    const d = await getDriver(id)
    if (d) {
      drivers.set(id, d)
      console.log('✅ Driver cache updated:', id, 'rejected')
    }
    
    res.json({ success: true, data: d })
  } catch (e) {
    console.error('❌ Reject error:', e)
    res.status(500).json({ success: false, error: 'reject_failed', details: String(e) })
  }
})

router.post('/delete', (req: Request, res: Response) => {
  const { id } = req.body || {}
  deleteDriver(id).then(() => {
    if (drivers.has(id)) drivers.delete(id)
    res.json({ success: true })
  }).catch(()=>res.status(404).json({ success: false, error: 'driver_not_found' }))
})

// DEBUG ENDPOINT - Tüm sistem durumu
router.get('/system-status', async (req: Request, res: Response) => {
  console.log('🔍 [SYSTEM STATUS] Gathering all system info...')
  
  const status: any = {
    timestamp: new Date().toISOString(),
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()) + ' seconds'
    },
    environment: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
    },
    memory: {
      driversCount: drivers.size,
      requestsCount: requests.size,
      driverIds: Array.from(drivers.keys())
    },
    lists: {},
    supabaseDirect: {},
    summary: {}
  }
  
  try {
    // Pending sürücüler
    const pendingList = await listDriversByStatus('pending')
    status.lists.pending = pendingList.map(d => ({
      id: d.id,
      name: d.name,
      email: d.email,
      approved: d.approved,
      createdAt: (d as any).createdAt || 'unknown'
    }))
    
    // Approved sürücüler
    const approvedList = await listDriversByStatus('approved')
    status.lists.approved = approvedList.map(d => ({
      id: d.id,
      name: d.name,
      email: d.email,
      approved: d.approved,
      available: d.available,
      location: d.location
    }))
    
    // Rejected sürücüler
    const rejectedList = await listDriversByStatus('rejected')
    status.lists.rejected = rejectedList.map(d => ({
      id: d.id,
      name: d.name,
      email: d.email,
      rejectedReason: d.rejectedReason
    }))
    
    // Supabase'e doğrudan bağlan ve TÜM sürücüleri çek
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const rawRes = await fetch(`${SUPABASE_URL}/rest/v1/drivers?select=id,name,email,approved,available,rejected_reason,created_at&order=created_at.desc`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        })
        const rawRows = await rawRes.json()
        status.supabaseDirect = {
          connected: true,
          totalDrivers: Array.isArray(rawRows) ? rawRows.length : 0,
          drivers: rawRows
        }
      } catch (e) {
        status.supabaseDirect = { connected: false, error: String(e) }
      }
    }
    
    // Özet
    status.summary = {
      pendingCount: status.lists.pending.length,
      approvedCount: status.lists.approved.length,
      rejectedCount: status.lists.rejected.length,
      totalInDatabase: status.supabaseDirect.totalDrivers || 0,
      potentialIssues: []
    }
    
    // Potansiyel sorunları tespit et
    // 1. Pending'de olup ama approved=true olanlar
    const pendingButApproved = status.lists.pending.filter((d: any) => d.approved === true)
    if (pendingButApproved.length > 0) {
      status.summary.potentialIssues.push({
        type: 'pending_but_approved',
        message: 'Pending listesinde approved=true olan sürücüler var!',
        drivers: pendingButApproved.map((d: any) => d.id)
      })
    }
    
    // 2. Approved listede olup ama approved=false olanlar
    const approvedButNotFlagged = status.lists.approved.filter((d: any) => d.approved !== true)
    if (approvedButNotFlagged.length > 0) {
      status.summary.potentialIssues.push({
        type: 'approved_list_but_not_flagged',
        message: 'Approved listesinde approved=false olan sürücüler var!',
        drivers: approvedButNotFlagged.map((d: any) => d.id)
      })
    }
    
    // 3. Duplicate email kontrolü
    const allEmails = [...status.lists.pending, ...status.lists.approved, ...status.lists.rejected]
      .filter((d: any) => d.email)
      .map((d: any) => d.email.toLowerCase())
    const duplicateEmails = allEmails.filter((email: string, idx: number) => allEmails.indexOf(email) !== idx)
    if (duplicateEmails.length > 0) {
      status.summary.potentialIssues.push({
        type: 'duplicate_emails',
        message: 'Aynı email ile birden fazla kayıt var!',
        emails: [...new Set(duplicateEmails)]
      })
    }
    
    res.json({ success: true, data: status })
    
  } catch (e) {
    status.error = String(e)
    res.status(500).json({ success: false, data: status })
  }
})

// DEBUG ENDPOINT - Sürücü durumunu kontrol et
router.get('/debug/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  
  console.log('🔍 [DEBUG] Checking driver:', id)
  
  const result: any = {
    timestamp: new Date().toISOString(),
    driverId: id,
    steps: []
  }
  
  try {
    // 1. Memory'de var mı kontrol et
    result.steps.push({ step: 'check_memory', status: 'running' })
    const inMemory = drivers.get(id)
    result.memory = inMemory ? {
      id: inMemory.id,
      name: inMemory.name,
      email: inMemory.email,
      approved: inMemory.approved,
      available: inMemory.available,
      location: inMemory.location
    } : null
    result.steps[result.steps.length - 1].status = 'ok'
    
    // 2. Veritabanından direkt çek
    result.steps.push({ step: 'fetch_from_db', status: 'running' })
    const fromDb = await getDriver(id)
    result.database = fromDb ? {
      id: fromDb.id,
      name: fromDb.name,
      email: fromDb.email,
      approved: fromDb.approved,
      available: fromDb.available,
      location: fromDb.location
    } : null
    result.steps[result.steps.length - 1].status = result.database ? 'ok' : 'not_found'
    
    // 3. Approved listesinde mi kontrol et
    result.steps.push({ step: 'check_approved_list', status: 'running' })
    const approvedList = await listDriversByStatus('approved')
    const inApprovedList = approvedList.find(d => d.id === id)
    result.inApprovedList = !!inApprovedList
    result.approvedListCount = approvedList.length
    result.steps[result.steps.length - 1].status = 'ok'
    
    // 4. Pending listesinde mi kontrol et
    result.steps.push({ step: 'check_pending_list', status: 'running' })
    const pendingList = await listDriversByStatus('pending')
    const inPendingList = pendingList.find(d => d.id === id)
    result.inPendingList = !!inPendingList
    result.pendingListCount = pendingList.length
    result.steps[result.steps.length - 1].status = 'ok'
    
    // 5. Supabase'e doğrudan sor - ham veri
    result.steps.push({ step: 'raw_supabase_query', status: 'running' })
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const rawRes = await fetch(`${SUPABASE_URL}/rest/v1/drivers?id=eq.${id}&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        })
        const rawRows = await rawRes.json()
        result.rawSupabase = Array.isArray(rawRows) && rawRows.length > 0 ? rawRows[0] : null
        result.steps[result.steps.length - 1].status = 'ok'
      } catch (e) {
        result.rawSupabase = { error: String(e) }
        result.steps[result.steps.length - 1].status = 'error'
      }
    } else {
      result.rawSupabase = { error: 'Supabase credentials not set' }
      result.steps[result.steps.length - 1].status = 'error'
    }
    
    // Özet
    result.summary = {
      driverExists: !!result.database,
      isApproved: result.database?.approved === true,
      inApprovedList: result.inApprovedList,
      inPendingList: result.inPendingList,
      memoryApproved: inMemory?.approved,
      dbApproved: fromDb?.approved,
      rawDbApproved: result.rawSupabase?.approved
    }
    
    res.json({ success: true, data: result })
    
  } catch (e) {
    result.error = String(e)
    res.status(500).json({ success: false, data: result })
  }
})

// NOT: /:id route'u DOSYANIN SONUNDA tanımlı - tüm özel route'lardan sonra

router.get('/earnings/:id', async (req: Request, res: Response) => {
  const d = await getDriver(req.params.id)
  if (!d) { res.status(404).json({ success: false, error: 'driver_not_found' }); return }
  const now = new Date()
  // Gerçek veri akışı sağlanana kadar başlangıç değerleri 0 olarak ayarlandı
  const daily = 0
  const weekly = 0
  const monthly = 0
  res.json({ success: true, data: { driverId: d.id, currency: 'TRY', daily, weekly, monthly, generatedAt: now.toISOString() } })
})

router.post('/complaints', (req: Request, res: Response) => {
  const { driverId, text } = req.body || {}
  if (!driverId || !text) { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
  const id = 'cmp_' + Date.now()
  complaints.push({ id, driverId, text, createdAt: new Date().toISOString() })
  res.json({ success: true })
})

router.get('/complaints', (_req: Request, res: Response) => {
  res.json({ success: true, data: complaints })
})

// Sürücü belge yükleme/güncelleme
router.post('/upload-docs', async (req: Request, res: Response) => {
  const { driverId, docs } = req.body || {}
  
  if (!driverId || !Array.isArray(docs)) {
    res.status(400).json({ success: false, error: 'invalid_payload' })
    return
  }

  try {
    // Sürücüyü getir
    let d = drivers.get(driverId)
    if (!d) {
      d = await getDriver(driverId) as DriverSession | undefined
      if (d) drivers.set(driverId, d)
    }

    if (!d) {
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return
    }

    // Mevcut belgeleri merge et
    const existingDocs = Array.isArray(d.docs) ? [...d.docs] : []
    
    for (const newDoc of docs) {
      const idx = existingDocs.findIndex(e => e.name === newDoc.name)
      if (idx >= 0) {
        if (newDoc.url && newDoc.url.length > 0) {
          // Güncelle
          existingDocs[idx] = {
            ...existingDocs[idx],
            url: newDoc.url,
            uploadedAt: new Date().toISOString(),
            status: 'pending'
          }
        } else {
          // Sil
          existingDocs.splice(idx, 1)
        }
      } else if (newDoc.url && newDoc.url.length > 0) {
        // Yeni ekle
        existingDocs.push({
          name: newDoc.name,
          url: newDoc.url,
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        })
      }
    }

    d.docs = existingDocs
    drivers.set(driverId, d)
    
    // Veritabanına kaydet
    await saveDriver(d)

    // Socket ile admin'e bildir
    try { 
      (req.app.get('io') as any)?.emit('driver:docs-updated', { driverId, docs: existingDocs }) 
    } catch {}

    res.json({ success: true, data: { docs: existingDocs } })
  } catch (err) {
    console.error('Belge yükleme hatası:', err)
    res.status(500).json({ success: false, error: 'upload_failed' })
  }
})

// Sürücü belge onaylama/reddetme (Admin)
router.post('/docs/approve', async (req: Request, res: Response) => {
  const { driverId, docName, approved, reason } = req.body || {}
  
  if (!driverId || !docName) {
    res.status(400).json({ success: false, error: 'invalid_payload' })
    return
  }

  try {
    let d = drivers.get(driverId)
    if (!d) {
      d = await getDriver(driverId) as DriverSession | undefined
      if (d) drivers.set(driverId, d)
    }

    if (!d || !Array.isArray(d.docs)) {
      res.status(404).json({ success: false, error: 'driver_or_docs_not_found' })
      return
    }

    const docIdx = d.docs.findIndex(doc => doc.name === docName)
    if (docIdx < 0) {
      res.status(404).json({ success: false, error: 'doc_not_found' })
      return
    }

    d.docs[docIdx].status = approved ? 'approved' : 'rejected'
    if (!approved && reason) {
      (d.docs[docIdx] as any).rejectReason = reason
    }

    drivers.set(driverId, d)
    await saveDriver(d)

    // Tüm belgeler onaylı mı kontrol et
    const allApproved = d.docs.every(doc => doc.status === 'approved')
    const requiredDocs = ['license', 'vehicle_registration', 'insurance', 'profile_photo']
    const hasAllRequired = requiredDocs.every(req => d!.docs?.some(doc => doc.name === req && doc.status === 'approved'))

    res.json({ 
      success: true, 
      data: { 
        docs: d.docs, 
        allApproved,
        hasAllRequired
      } 
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'update_failed' })
  }
})

// Admin: Sürücü available durumunu doğrudan veritabanında güncelle
router.post('/admin/set-available', async (req: Request, res: Response) => {
  const { id, available } = req.body || {}
  if (!id) { res.status(400).json({ success: false, error: 'id_required' }); return }
  
  try {
    const d = await getDriver(id)
    if (!d) { res.status(404).json({ success: false, error: 'driver_not_found' }); return }
    
    d.available = !!available
    await saveDriver(d)
    res.json({ success: true, data: d })
  } catch (e) {
    res.status(500).json({ success: false, error: 'update_failed' })
  }
})

// Admin: Sürücüleri aktif işleriyle birlikte getir
router.get('/with-active-bookings', async (req: Request, res: Response) => {
  try {
    // Tüm onaylı sürücüleri getir
    const allDrivers = await listDriversByStatus('approved')
    
    // Aktif bookingleri getir
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    const activeBookingsByDriver: Record<string, any> = {}
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?select=*&status=in.(pending,accepted,driver_en_route,driver_arrived,in_progress)`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        )
        
        if (response.ok) {
          const bookings = await response.json()
          if (Array.isArray(bookings)) {
            for (const b of bookings) {
              if (b.driver_id) {
                activeBookingsByDriver[b.driver_id] = {
                  id: b.id,
                  status: b.status,
                  pickupLocation: b.pickup_location,
                  dropoffLocation: b.dropoff_location,
                  pickupTime: b.pickup_time,
                  finalPrice: b.final_price,
                  reservationCode: b.reservation_code,
                  customerName: b.guest_name,
                  customerPhone: b.guest_phone,
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Active bookings fetch error:', e)
      }
    }
    
    // Sürücüleri aktif işleriyle zenginleştir
    const enrichedDrivers = allDrivers.map((d: any) => ({
      ...d,
      activeBooking: activeBookingsByDriver[d.id] || null,
      hasActiveJob: !!activeBookingsByDriver[d.id],
    }))
    
    res.json({ success: true, data: enrichedDrivers, count: enrichedDrivers.length })
  } catch (e) {
    console.error('Drivers with active bookings error:', e)
    res.status(500).json({ success: false, error: 'fetch_failed' })
  }
})

// Admin: Belirli bir sürücünün detaylı bilgisini getir (konum + aktif iş)
router.get('/detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Sürücüyü getir
    const driver = await getDriver(id)
    if (!driver) {
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return
    }
    
    // Aktif booking'i getir
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    let activeBooking = null
    let recentBookings: any[] = []
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Aktif booking
        const activeResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?select=*&driver_id=eq.${id}&status=in.(pending,accepted,driver_en_route,driver_arrived,in_progress)&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        )
        
        if (activeResponse.ok) {
          const activeData = await activeResponse.json()
          if (Array.isArray(activeData) && activeData.length > 0) {
            const b = activeData[0]
            activeBooking = {
              id: b.id,
              status: b.status,
              pickupLocation: b.pickup_location,
              dropoffLocation: b.dropoff_location,
              pickupTime: b.pickup_time,
              finalPrice: b.final_price,
              basePrice: b.base_price,
              reservationCode: b.reservation_code,
              customerName: b.guest_name,
              customerPhone: b.guest_phone,
              vehicleType: b.vehicle_type,
              passengerCount: b.passenger_count,
            }
          }
        }
        
        // Son 10 tamamlanan booking
        const recentResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?select=*&driver_id=eq.${id}&status=eq.completed&order=completed_at.desc&limit=10`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        )
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          if (Array.isArray(recentData)) {
            recentBookings = recentData.map((b: any) => ({
              id: b.id,
              status: b.status,
              pickupLocation: b.pickup_location,
              dropoffLocation: b.dropoff_location,
              pickupTime: b.pickup_time,
              completedAt: b.completed_at,
              finalPrice: b.final_price,
              reservationCode: b.reservation_code,
            }))
          }
        }
      } catch (e) {
        console.error('Driver bookings fetch error:', e)
      }
    }
    
    res.json({
      success: true,
      data: {
        driver: {
          ...driver,
          hasValidLocation: driver.location && driver.location.lat !== 0 && driver.location.lng !== 0,
          // Admin için şifre bilgilerini de göster (hash ve salt)
          passwordHash: (driver as any).passwordHash || undefined,
          passwordSalt: (driver as any).passwordSalt || undefined,
          password: (driver as any).password || undefined,
          // Ekstra bilgiler
          createdAt: (driver as any).createdAt || (driver as any).created_at || undefined,
          updatedAt: (driver as any).updatedAt || (driver as any).updated_at || undefined,
        },
        activeBooking,
        recentBookings,
      }
    })
  } catch (e) {
    console.error('Driver detail error:', e)
    res.status(500).json({ success: false, error: 'fetch_failed' })
  }
})

// Admin: Tüm sürücüleri offline yap
router.post('/admin/all-offline', async (_req: Request, res: Response) => {
  try {
    const list = await listDriversByStatus('approved')
    for (const d of list) {
      d.available = false
      await saveDriver(d)
    }
    res.json({ success: true, message: `${list.length} sürücü offline yapıldı` })
  } catch (e) {
    res.status(500).json({ success: false, error: 'update_failed' })
  }
})

// ============================================
// GENEL ROUTE'lar - EN SONDA TANIMLANMALI!
// ============================================

// Sürücü getir (ID ile) - BU ROUTE EN SON OLMALI!
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const d = await getDriver(req.params.id)
    if (!d) { 
      res.status(404).json({ success: false, error: 'driver_not_found' })
      return 
    }
    res.json({ success: true, data: d })
  } catch (e) {
    res.status(404).json({ success: false, error: 'driver_not_found' })
  }
})

export default router
