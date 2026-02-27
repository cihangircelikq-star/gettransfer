import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'

export type BookingExtras = {
  notes?: string
  tags?: string[]
  promoCode?: string
  termsAccepted?: boolean
  pricing?: {
    driverPerKm: number
    platformFeePercent: number
    distanceKm: number
    driverFare: number
    platformFee: number
    total: number
    currency: string
  }
}

export type BookingRecord = {
  id: string
  reservationCode: string
  customerId?: string
  guestName?: string
  guestPhone?: string
  driverId?: string
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
  extras?: BookingExtras
  status: 'pending'|'accepted'|'driver_en_route'|'driver_arrived'|'in_progress'|'completed'|'cancelled'
  basePrice: number
  finalPrice?: number
  paymentStatus?: 'unpaid'|'paid'
  paymentMethod?: 'card'|'cash'|'qr_turinvoice'
  paidAt?: string
  route?: { driverPath: Array<{ lat: number, lng: number }>, customerPath?: Array<{ lat: number, lng: number }> }
  pickedUpAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

const memory: Map<string, BookingRecord> = new Map()

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const supabaseUrl = getEnv('SUPABASE_URL')
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomCode = (len: number) => {
  const bytes = crypto.randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

async function isReservationCodeTaken(code: string) {
  if (!supabase) {
    return Array.from(memory.values()).some(b => b.reservationCode === code)
  }
  try {
    const { data, error } = await supabase.from('bookings').select('reservation_code').eq('reservation_code', code).limit(1)
    if (error) return true
    return Array.isArray(data) && data.length > 0
  } catch {
    return true
  }
}

export async function generateReservationCode() {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(8)
    const taken = await isReservationCodeTaken(code)
    if (!taken) return code
  }
  return randomCode(10)
}

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

export function storageMode() {
  return supabase ? 'supabase' : 'memory'
}

export async function createBooking(b: Omit<BookingRecord, 'createdAt'|'updatedAt'>) {
  const now = new Date().toISOString()
  const next: BookingRecord = { ...b, createdAt: now, updatedAt: now }
  memory.set(next.id, next)
  if (!supabase) return next
  try {
    const { data, error } = await supabase.from('bookings').insert({
      id: next.id,
      reservation_code: next.reservationCode,
      customer_id: next.customerId || null,
      guest_name: next.guestName || null,
      guest_phone: next.guestPhone || null,
      driver_id: next.driverId || null,
      pickup_location: next.pickupLocation,
      dropoff_location: next.dropoffLocation,
      pickup_time: next.pickupTime,
      passenger_count: next.passengerCount,
      adults: next.adults ?? null,
      children: next.children ?? null,
      vehicle_type: next.vehicleType,
      is_immediate: !!next.isImmediate,
      flight_number: next.flightNumber || null,
      name_board: next.nameBoard || null,
      return_trip: next.returnTrip || null,
      extras: next.extras || null,
      status: next.status,
      base_price: next.basePrice,
      final_price: next.finalPrice ?? null,
      payment_status: next.paymentStatus || null,
      payment_method: next.paymentMethod || null,
      paid_at: next.paidAt || null,
      route: next.route || null,
      picked_up_at: next.pickedUpAt || null,
      completed_at: next.completedAt || null,
      created_at: now,
      updated_at: now,
    }).select('*').limit(1)
    if (error) throw error
    const row = Array.isArray(data) && data[0]
    if (row) {
      const mapped = mapRowToBooking(row)
      memory.set(mapped.id, mapped)
      return mapped
    }
  } catch (e: any) {
    logger.warn('bookings_supabase_insert_failed', { reason: String(e?.message || e || 'unknown') })
  }
  return next
}

export async function getBookingById(id: string) {
  if (memory.has(id)) return memory.get(id) || null
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).limit(1)
    if (error) throw error
    const row = Array.isArray(data) && data[0]
    if (!row) return null
    const mapped = mapRowToBooking(row)
    memory.set(id, mapped)
    return mapped
  } catch (e: any) {
    logger.warn('bookings_supabase_get_failed', { id, reason: String(e?.message || e || 'unknown') })
    return null
  }
}

export async function listBookingsByCustomer(customerId: string) {
  if (!supabase) {
    return Array.from(memory.values()).filter(b => b.customerId === customerId)
  }
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
    if (error) throw error
    const arr = Array.isArray(data) ? data : []
    const mapped = arr.map(mapRowToBooking)
    mapped.forEach(b => memory.set(b.id, b))
    return mapped
  } catch (e: any) {
    logger.warn('bookings_supabase_list_failed', { customerId, reason: String(e?.message || e || 'unknown') })
    return []
  }
}

export async function listBookingsByDriver(driverId: string) {
  const id = String(driverId || '').trim()
  if (!id) return []
  if (!supabase) {
    return Array.from(memory.values()).filter(b => b.driverId === id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('driver_id', id).order('created_at', { ascending: false })
    if (error) throw error
    const arr = Array.isArray(data) ? data : []
    const mapped = arr.map(mapRowToBooking)
    mapped.forEach(b => memory.set(b.id, b))
    return mapped
  } catch (e: any) {
    logger.warn('bookings_supabase_list_by_driver_failed', { driverId: id, reason: String(e?.message || e || 'unknown') })
    return []
  }
}

export async function findBookingByPhoneAndCode(guestPhone: string, reservationCode: string) {
  const phoneNorm = String(guestPhone || '').trim()
  const codeNorm = String(reservationCode || '').trim().toUpperCase()
  if (!phoneNorm || !codeNorm) return null
  if (!supabase) {
    return Array.from(memory.values()).find(b => (b.guestPhone || '') === phoneNorm && b.reservationCode === codeNorm) || null
  }
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('guest_phone', phoneNorm).eq('reservation_code', codeNorm).limit(1)
    if (error) throw error
    const row = Array.isArray(data) && data[0]
    if (!row) return null
    const mapped = mapRowToBooking(row)
    memory.set(mapped.id, mapped)
    return mapped
  } catch (e: any) {
    logger.warn('bookings_supabase_lookup_failed', { reason: String(e?.message || e || 'unknown') })
    return null
  }
}

export async function updateBooking(id: string, patch: Partial<BookingRecord>) {
  const cur = (await getBookingById(id)) || null
  if (!cur) return null
  const updated: BookingRecord = { ...cur, ...patch, updatedAt: new Date().toISOString() }
  memory.set(id, updated)
  if (!supabase) return updated
  try {
    const { data, error } = await supabase.from('bookings')
      .update({
        customer_id: updated.customerId || null,
        guest_name: updated.guestName || null,
        guest_phone: updated.guestPhone || null,
        driver_id: updated.driverId || null,
        pickup_location: updated.pickupLocation,
        dropoff_location: updated.dropoffLocation,
        pickup_time: updated.pickupTime,
        passenger_count: updated.passengerCount,
        adults: updated.adults ?? null,
        children: updated.children ?? null,
        vehicle_type: updated.vehicleType,
        is_immediate: !!updated.isImmediate,
        flight_number: updated.flightNumber || null,
        name_board: updated.nameBoard || null,
        return_trip: updated.returnTrip || null,
        extras: updated.extras || null,
        status: updated.status,
        base_price: updated.basePrice,
        final_price: updated.finalPrice ?? null,
        payment_status: updated.paymentStatus || null,
        payment_method: updated.paymentMethod || null,
        paid_at: updated.paidAt || null,
        route: updated.route || null,
        picked_up_at: updated.pickedUpAt || null,
        completed_at: updated.completedAt || null,
        updated_at: updated.updatedAt,
      })
      .eq('id', id)
      .select('*')
      .limit(1)
    if (error) throw error
    const row = Array.isArray(data) && data[0]
    if (row) {
      const mapped = mapRowToBooking(row)
      memory.set(id, mapped)
      return mapped
    }
  } catch (e: any) {
    logger.warn('bookings_supabase_update_failed', { id, reason: String(e?.message || e || 'unknown') })
  }
  return updated
}

// Pending durumundaki bookingleri listele
export async function listPendingBookings(vehicleType?: string): Promise<BookingRecord[]> {
  if (!supabase) {
    let list = Array.from(memory.values()).filter(b => b.status === 'pending')
    if (vehicleType) list = list.filter(b => b.vehicleType === vehicleType)
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }
  try {
    let query = supabase.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (vehicleType) {
      query = query.eq('vehicle_type', vehicleType)
    }
    const { data, error } = await query
    if (error) throw error
    const arr = Array.isArray(data) ? data : []
    const mapped = arr.map(mapRowToBooking)
    mapped.forEach(b => memory.set(b.id, b))
    return mapped
  } catch (e: any) {
    logger.warn('bookings_supabase_list_pending_failed', { reason: String(e?.message || e || 'unknown') })
    return []
  }
}

