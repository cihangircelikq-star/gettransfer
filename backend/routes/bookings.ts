import { Router, type Request, type Response } from 'express'
import { createBooking, findBookingByPhoneAndCode, generateReservationCode, getBookingById, listBookingsByCustomer, listBookingsByDriver, storageMode, updateBooking, BookingRecord } from '../services/bookingsStorage.js'
import { getDriver } from '../services/storage.js'
import { verifyGuestToken } from '../services/guestToken.js'
import { getPricingConfig } from '../services/pricingStorage.js'
import { createClient } from '@supabase/supabase-js'

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const SUPABASE_URL = getEnv('SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null

// In-memory storage for fallback
const memory: Map<string, BookingRecord> = new Map()

// Helper to map database row to booking record
const mapRowToBooking = (row: any): BookingRecord => ({
  id: String(row.id),
  reservationCode: String(row.reservation_code),
  customerId: row.customer_id || undefined,
  guestName: row.guest_name || undefined,
  guestPhone: row.guest_phone || undefined,
  driverId: row.driver_id || undefined,
  pickupLocation: row.pickup_location,
  dropoffLocation: row.dropoff_location,
  pickupTime: row.pickup_time,
  passengerCount: row.passenger_count,
  adults: typeof row.adults === 'number' ? row.adults : undefined,
  children: typeof row.children === 'number' ? row.children : undefined,
  vehicleType: row.vehicle_type,
  isImmediate: !!row.is_immediate,
  flightNumber: row.flight_number || undefined,
  nameBoard: row.name_board || undefined,
  returnTrip: row.return_trip || undefined,
  extras: row.extras || undefined,
  status: row.status,
  basePrice: Number(row.base_price || 0),
  finalPrice: row.final_price !== null && row.final_price !== undefined ? Number(row.final_price) : undefined,
  paymentStatus: row.payment_status || undefined,
  paymentMethod: row.payment_method || undefined,
  paidAt: row.paid_at || undefined,
  route: row.route || undefined,
  pickedUpAt: row.picked_up_at || undefined,
  completedAt: row.completed_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const router = Router()

type Booking = {
  id: string
  reservationCode?: string
  customerId?: string
  guestName?: string
  guestPhone?: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  pickupLocation: { lat: number, lng: number, address: string }
  dropoffLocation: { lat: number, lng: number, address: string }
  pickupTime: string
  passengerCount: number
  adults?: number
  children?: number
  vehicleType: 'sedan'|'suv'|'van'|'luxury'
  isImmediate?: boolean
  flightNumber?: string
  nameBoard?: string
  returnTrip?: { enabled: boolean, pickupTime?: string }
  extras?: { notes?: string; tags?: string[]; promoCode?: string; termsAccepted?: boolean; pricing?: any }
  status: 'pending'|'accepted'|'driver_en_route'|'driver_arrived'|'in_progress'|'completed'|'cancelled'
  basePrice: number
  finalPrice?: number
  paymentStatus?: 'unpaid'|'paid'
  paymentMethod?: 'card'|'cash'
  paidAt?: string
  route?: { driverPath: Array<{ lat: number, lng: number }>, customerPath?: Array<{ lat: number, lng: number }> }
  pickedUpAt?: string
  completedAt?: string
  createdAt?: string
  updatedAt?: string
}

const isValidLatLng = (p: any) => typeof p?.lat === 'number' && typeof p?.lng === 'number' && isFinite(p.lat) && isFinite(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180
const ALL_STATUSES: Array<Booking['status']> = ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress', 'completed', 'cancelled']
const isStatus = (v: any): v is Booking['status'] => typeof v === 'string' && (ALL_STATUSES as string[]).includes(v)
const allowedNext: Record<Booking['status'], Array<Booking['status']>> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['driver_en_route', 'cancelled'],
  driver_en_route: ['driver_arrived', 'cancelled'],
  driver_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
const canTransition = (from: Booking['status'], to: Booking['status']) => from === to || allowedNext[from].includes(to)

const liveCustomerLocation: Map<string, { location: { lat: number, lng: number }, ts: number }> = new Map()
const liveDriverLocation: Map<string, { location: { lat: number, lng: number }, ts: number }> = new Map()

const round2 = (n: number) => Math.round(n * 100) / 100
const haversineMeters = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Helper: Booking'e driver bilgilerini ekle
async function enrichBookingWithDriverInfo(booking: any): Promise<Booking> {
  if (booking.driverId) {
    try {
      const driver = await getDriver(booking.driverId)
      if (driver) {
        return {
          ...booking,
          driverName: driver.name,
          driverPhone: driver.phone || ''
        }
      }
    } catch { /* ignore */ }
  }
  return booking
}

router.post('/create', (req: Request, res: Response) => {
  const b = req.body as Partial<Booking>
  if (!b.pickupLocation || !b.dropoffLocation || !b.passengerCount || !b.vehicleType || !isValidLatLng(b.pickupLocation) || !isValidLatLng(b.dropoffLocation)) {
    res.status(400).json({ success: false, error: 'invalid_payload' })
    return
  }
  if (b.extras?.termsAccepted === false) {
    res.status(400).json({ success: false, error: 'terms_required' })
    return
  }
  const id = 'bk_' + Date.now()
  ;(async () => {
    const now = new Date().toISOString()
    const pricing = await getPricingConfig().catch(() => null)
    const distKm = round2(haversineMeters(b.pickupLocation as any, b.dropoffLocation as any) / 1000)
    const driverPerKm = pricing?.driverPerKm ?? 1
    const feePct = pricing?.platformFeePercent ?? 3
    const driverFare = round2(distKm * driverPerKm)
    const total = round2(driverFare * (1 + feePct / 100))
    const reservationCode = typeof b.reservationCode === 'string' && b.reservationCode.trim() ? b.reservationCode.trim().toUpperCase() : await generateReservationCode()
    const customerId = typeof b.customerId === 'string' && b.customerId.trim() ? b.customerId.trim() : undefined
    const guestName = typeof b.guestName === 'string' ? b.guestName.trim() : undefined
    const guestPhone = typeof b.guestPhone === 'string' ? b.guestPhone.trim() : undefined
    if (!customerId) {
      if (!guestName || guestName.length < 2) { res.status(400).json({ success: false, error: 'guest_name_required' }); return }
      if (!guestPhone || guestPhone.length < 7) { res.status(400).json({ success: false, error: 'guest_phone_required' }); return }
    }
    const created = await createBooking({
      id,
      reservationCode,
      customerId,
      guestName,
      guestPhone,
      driverId: b.driverId,
      pickupLocation: b.pickupLocation as any,
      dropoffLocation: b.dropoffLocation as any,
      pickupTime: b.pickupTime || now,
      passengerCount: b.passengerCount as number,
      adults: typeof b.adults === 'number' ? b.adults : undefined,
      children: typeof b.children === 'number' ? b.children : undefined,
      vehicleType: b.vehicleType as any,
      isImmediate: !!b.isImmediate,
      flightNumber: typeof b.flightNumber === 'string' ? b.flightNumber : undefined,
      nameBoard: typeof b.nameBoard === 'string' ? b.nameBoard : undefined,
      returnTrip: b.returnTrip && typeof (b.returnTrip as any).enabled === 'boolean' ? (b.returnTrip as any) : undefined,
      extras: b.extras ? {
        notes: typeof b.extras.notes === 'string' ? b.extras.notes : undefined,
        promoCode: typeof b.extras.promoCode === 'string' ? b.extras.promoCode : undefined,
        termsAccepted: !!b.extras.termsAccepted,
        tags: Array.isArray(b.extras.tags) ? b.extras.tags.filter((x: any) => typeof x === 'string').slice(0, 20) : undefined,
        pricing: { driverPerKm, platformFeePercent: feePct, distanceKm: distKm, driverFare, platformFee: round2(total - driverFare), total, currency: pricing?.currency || 'EUR' },
      } : undefined,
      status: (b.status as any) || 'pending',
      basePrice: driverFare,
      finalPrice: total,
      paymentStatus: 'unpaid',
      paymentMethod: b.paymentMethod,
      createdAt: now,
      updatedAt: now,
    } as any)

    // Driver bilgilerini ekle
    const enriched = await enrichBookingWithDriverInfo(created)

    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:create', enriched)
      io?.to?.(`booking:${created.id}`)?.emit?.('booking:create', enriched)
    } catch {}
    res.json({ success: true, data: { ...enriched, storage: storageMode() } })
  })().catch(() => res.status(500).json({ success: false, error: 'create_failed' }))
})

// List all bookings (admin endpoint) - supports both /all and /list
router.get(['/all', '/list'], async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      // Return from memory if no supabase
      const allBookings = Array.from(memory.values())
      const enriched = await Promise.all(allBookings.map(b => enrichBookingWithDriverInfo(b)))
      res.json({ success: true, data: enriched.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')) })
      return
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const bookings = (data || []).map(mapRowToBooking)
    const enriched = await Promise.all(bookings.map(b => enrichBookingWithDriverInfo(b)))
    res.json({ success: true, data: enriched })
  } catch (err) {
    console.error('List all bookings error:', err)
    res.status(500).json({ success: false, error: 'list_failed' })
  }
})

router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params
  updateBooking(id, { status: 'cancelled' } as any).then(async b => {
    if (!b) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const enriched = await enrichBookingWithDriverInfo(b)
    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:update', enriched)
      io?.to?.(`booking:${b.id}`)?.emit?.('booking:update', enriched)
    } catch {}
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'cancel_failed' }))
})

router.put('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body || {}
  if (!isStatus(status)) { res.status(400).json({ success: false, error: 'invalid_status' }); return }
  ;(async () => {
    const cur = await getBookingById(id)
    if (!cur) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    if (!canTransition(cur.status as any, status)) { res.status(409).json({ success: false, error: 'invalid_transition', data: { from: cur.status, to: status } }); return }
    const patch: any = { status }
    if (status === 'in_progress' && !cur.pickedUpAt) patch.pickedUpAt = new Date().toISOString()
    if (status === 'completed' && !cur.completedAt) patch.completedAt = new Date().toISOString()
    const updated = await updateBooking(id, patch)
    if (!updated) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    
    const enriched = await enrichBookingWithDriverInfo(updated)
    
    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:update', enriched)
      io?.to?.(`booking:${updated.id}`)?.emit?.('booking:update', enriched)
    } catch {}
    res.json({ success: true, data: enriched })
  })().catch(() => res.status(500).json({ success: false, error: 'update_failed' }))
})

router.get('/:id', (req: Request, res: Response) => {
  getBookingById(req.params.id).then(async b => {
    if (!b) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const enriched = await enrichBookingWithDriverInfo(b)
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'get_failed' }))
})

router.put('/:id/route', (req: Request, res: Response) => {
  const { id } = req.params
  const { driverPath, customerPath } = req.body || {}
  if (!Array.isArray(driverPath) || driverPath.length === 0) { res.status(400).json({ success: false, error: 'invalid_route' }); return }
  updateBooking(id, { route: { driverPath, customerPath: Array.isArray(customerPath) ? customerPath : undefined } } as any).then(async b => {
    if (!b) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const enriched = await enrichBookingWithDriverInfo(b)
    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:route', { id: b.id, driverPath: driverPath })
      io?.to?.(`booking:${b.id}`)?.emit?.('booking:route', { id: b.id, driverPath: driverPath })
    } catch {}
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'route_failed' }))
})

// Şoför konumu güncelleme endpoint'i
router.post('/:id/driver-location', (req: Request, res: Response) => {
  const { id } = req.params
  const { location } = req.body || {}
  if (!isValidLatLng(location)) { res.status(400).json({ success: false, error: 'invalid_location' }); return }
  
  liveDriverLocation.set(id, { location, ts: Date.now() })
  
  try {
    const io = (req.app.get('io') as any)
    // Şoför konumunu müşteriye broadcast et
    io?.emit('driver:location', { bookingId: id, location })
    io?.to?.(`booking:${id}`)?.emit?.('driver:location', { bookingId: id, location })
  } catch {}
  
  res.json({ success: true })
})

// Şoför konumu getirme endpoint'i
router.get('/:id/driver-location', (req: Request, res: Response) => {
  const { id } = req.params
  const got = liveDriverLocation.get(id)
  if (!got) { res.json({ success: true, data: null }); return }
  // 5 dakikadan eski konumları sil
  if (Date.now() - got.ts > 5 * 60_000) { 
    liveDriverLocation.delete(id)
    res.json({ success: true, data: null }); 
    return 
  }
  res.json({ success: true, data: got.location })
})

router.post('/:id/customer-location', (req: Request, res: Response) => {
  const { id } = req.params
  const { location } = req.body || {}
  if (!isValidLatLng(location)) { res.status(400).json({ success: false, error: 'invalid_location' }); return }
  liveCustomerLocation.set(id, { location, ts: Date.now() })
  try {
    const io = (req.app.get('io') as any)
    io?.emit('customer:update', { bookingId: id, location })
    io?.to?.(`booking:${id}`)?.emit?.('customer:update', { bookingId: id, location })
  } catch {}
  res.json({ success: true })
})

router.get('/:id/customer-location', (req: Request, res: Response) => {
  const { id } = req.params
  const got = liveCustomerLocation.get(id)
  if (!got) { res.json({ success: true, data: null }); return }
  if (Date.now() - got.ts > 5 * 60_000) { res.json({ success: true, data: null }); return }
  res.json({ success: true, data: got.location })
})

router.get('/by-driver/:driverId', (req: Request, res: Response) => {
  const driverId = String(req.params.driverId || '').trim()
  listBookingsByDriver(driverId).then(async list => {
    // Her booking'e driver bilgilerini ekle
    const enriched = await Promise.all(list.map(b => enrichBookingWithDriverInfo(b)))
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'list_failed' }))
})

router.post('/:id/pay', (req: Request, res: Response) => {
  const { id } = req.params
  const { amount, method } = req.body || {}
  ;(async () => {
    const cur = await getBookingById(id)
    if (!cur) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const paymentMethod: any = method === 'cash' ? 'cash' : 'card'
    const patch: any = {
      paymentMethod,
      finalPrice: typeof amount === 'number' ? amount : cur.finalPrice,
    }
    if (paymentMethod === 'card') {
      patch.paymentStatus = 'paid'
      patch.paidAt = new Date().toISOString()
    }
    const updated = await updateBooking(id, patch)
    if (!updated) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const enriched = await enrichBookingWithDriverInfo(updated)
    try {
      const io = (req.app.get('io') as any)
      io?.emit('booking:paid', { id: updated.id, amount: updated.finalPrice, method: paymentMethod })
      io?.to?.(`booking:${updated.id}`)?.emit?.('booking:paid', { id: updated.id, amount: updated.finalPrice, method: paymentMethod })
    } catch {}
    res.json({ success: true, data: enriched })
  })().catch(() => res.status(500).json({ success: false, error: 'pay_failed' }))
})

router.get('/by-customer/:customerId', (req: Request, res: Response) => {
  listBookingsByCustomer(req.params.customerId).then(async list => {
    // Her booking'e driver bilgilerini ekle
    const enriched = await Promise.all(list.map(b => enrichBookingWithDriverInfo(b)))
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'list_failed' }))
})

router.post('/lookup', (req: Request, res: Response) => {
  const tokenRaw = String(req.headers['x-guest-token'] || '')
  const tok = verifyGuestToken(tokenRaw)
  if (!tok) { res.status(401).json({ success: false, error: 'guest_token_required' }); return }
  const { phone, reservationCode } = req.body || {}
  const phoneNorm = typeof phone === 'string' ? phone.trim() : ''
  const codeNorm = typeof reservationCode === 'string' ? reservationCode.trim().toUpperCase() : ''
  if (!phoneNorm || !codeNorm) { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
  if (tok.phone !== phoneNorm && tok.phone !== String(phoneNorm).replace(/\s+/g, '')) { res.status(403).json({ success: false, error: 'phone_mismatch' }); return }
  findBookingByPhoneAndCode(phoneNorm, codeNorm).then(async b => {
    if (!b) { res.status(404).json({ success: false, error: 'booking_not_found' }); return }
    const enriched = await enrichBookingWithDriverInfo(b)
    res.json({ success: true, data: enriched })
  }).catch(() => res.status(500).json({ success: false, error: 'lookup_failed' }))
})

export default router
