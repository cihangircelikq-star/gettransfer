/**
 * Muhasebe Kayıtları Servisi
 * Ödemelerin muhasebe sistemine kaydedilmesi ve raporlanması
 */

import { createClient } from '@supabase/supabase-js'

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const SUPABASE_URL = getEnv('SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null

// In-memory fallback
const memoryPayments: Map<string, PaymentRecord> = new Map()
const memoryAccounting: Map<string, AccountingRecord> = new Map()

export type PaymentRecord = {
  id: string
  bookingId: string
  amount: number
  currency: string
  method: 'cash' | 'qr_turinvoice' | 'card'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  driverId: string
  driverReceivedAt?: string
  customerId?: string
  guestName?: string
  guestPhone?: string
  qrCodeId?: string
  qrCodeUrl?: string
  qrExpiresAt?: string
  turinvoicePaymentId?: string
  turinvoiceResponse?: any
  platformFee: number
  driverEarning: number
  recordedInAccounting: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export type AccountingRecord = {
  id: string
  paymentId?: string
  bookingId?: string
  type: 'income' | 'expense' | 'refund' | 'commission'
  grossAmount: number
  platformFee: number
  netAmount: number
  currency: string
  driverId?: string
  customerId?: string
  description?: string
  metadata?: any
  transactionDate: string
  createdAt: string
}

export type DriverEarnings = {
  daily: number
  weekly: number
  monthly: number
  totalRides: number
  cashEarnings: number
  qrEarnings: number
}

// Ödeme kaydı oluştur
export async function createPaymentRecord(payment: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  const id = payment.id || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const record: PaymentRecord = {
    id,
    bookingId: payment.bookingId || '',
    amount: payment.amount || 0,
    currency: payment.currency || 'TRY',
    method: payment.method || 'cash',
    status: payment.status || 'pending',
    driverId: payment.driverId || '',
    driverReceivedAt: payment.driverReceivedAt,
    customerId: payment.customerId,
    guestName: payment.guestName,
    guestPhone: payment.guestPhone,
    qrCodeId: payment.qrCodeId,
    qrCodeUrl: payment.qrCodeUrl,
    qrExpiresAt: payment.qrExpiresAt,
    turinvoicePaymentId: payment.turinvoicePaymentId,
    turinvoiceResponse: payment.turinvoiceResponse,
    platformFee: payment.platformFee || 0,
    driverEarning: payment.driverEarning || (payment.amount || 0) - (payment.platformFee || 0),
    recordedInAccounting: false,
    createdAt: now,
    updatedAt: now,
    completedAt: payment.completedAt,
  }
  
  if (supabase) {
    const { error } = await supabase.from('payments').insert({
      id: record.id,
      booking_id: record.bookingId,
      amount: record.amount,
      currency: record.currency,
      method: record.method,
      status: record.status,
      driver_id: record.driverId,
      driver_received_at: record.driverReceivedAt,
      customer_id: record.customerId,
      guest_name: record.guestName,
      guest_phone: record.guestPhone,
      qr_code_id: record.qrCodeId,
      qr_code_url: record.qrCodeUrl,
      qr_expires_at: record.qrExpiresAt,
      turinvoice_payment_id: record.turinvoicePaymentId,
      turinvoice_response: record.turinvoiceResponse,
      platform_fee: record.platformFee,
      driver_earning: record.driverEarning,
      recorded_in_accounting: record.recordedInAccounting,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      completed_at: record.completedAt,
    })
    if (error) {
      console.error('createPaymentRecord error:', error)
      return null
    }
  } else {
    memoryPayments.set(id, record)
  }
  
  return record
}

// Ödeme kaydını güncelle
export async function updatePaymentRecord(id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  const now = new Date().toISOString()
  
  if (supabase) {
    const updateData: any = { updated_at: now }
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.driverReceivedAt !== undefined) updateData.driver_received_at = updates.driverReceivedAt
    if (updates.qrCodeId !== undefined) updateData.qr_code_id = updates.qrCodeId
    if (updates.qrCodeUrl !== undefined) updateData.qr_code_url = updates.qrCodeUrl
    if (updates.qrExpiresAt !== undefined) updateData.qr_expires_at = updates.qrExpiresAt
    if (updates.turinvoicePaymentId !== undefined) updateData.turinvoice_payment_id = updates.turinvoicePaymentId
    if (updates.turinvoiceResponse !== undefined) updateData.turinvoice_response = updates.turinvoiceResponse
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt
    if (updates.recordedInAccounting !== undefined) updateData.recorded_in_accounting = updates.recordedInAccounting
    
    const { error } = await supabase.from('payments').update(updateData).eq('id', id)
    if (error) {
      console.error('updatePaymentRecord error:', error)
      return null
    }
    
    const { data } = await supabase.from('payments').select('*').eq('id', id).single()
    return data ? mapDbToPayment(data) : null
  } else {
    const existing = memoryPayments.get(id)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: now }
    memoryPayments.set(id, updated)
    return updated
  }
}

// Ödeme kaydını getir
export async function getPaymentRecord(id: string): Promise<PaymentRecord | null> {
  if (supabase) {
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).single()
    if (error || !data) return null
    return mapDbToPayment(data)
  } else {
    return memoryPayments.get(id) || null
  }
}

// Booking ID ile ödeme kaydını getir
export async function getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null> {
  if (supabase) {
    const { data, error } = await supabase.from('payments').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).single()
    if (error || !data) return null
    return mapDbToPayment(data)
  } else {
    for (const payment of memoryPayments.values()) {
      if (payment.bookingId === bookingId) return payment
    }
    return null
  }
}

// Şoför ödemelerini listele
export async function listPaymentsByDriver(driverId: string, limit: number = 50): Promise<PaymentRecord[]> {
  if (supabase) {
    const { data, error } = await supabase.from('payments').select('*').eq('driver_id', driverId).order('created_at', { ascending: false }).limit(limit)
    if (error || !data) return []
    return data.map(mapDbToPayment)
  } else {
    return Array.from(memoryPayments.values()).filter(p => p.driverId === driverId)
  }
}

// Şoför kazançlarını getir
export async function getDriverEarnings(driverId: string): Promise<DriverEarnings> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  if (supabase) {
    const { data, error } = await supabase.from('payments').select('*').eq('driver_id', driverId).eq('status', 'completed')
    if (error || !data) {
      return { daily: 0, weekly: 0, monthly: 0, totalRides: 0, cashEarnings: 0, qrEarnings: 0 }
    }
    
    const payments = data.map(mapDbToPayment)
    
    return {
      daily: payments.filter(p => p.completedAt && p.completedAt >= todayStart).reduce((sum, p) => sum + p.driverEarning, 0),
      weekly: payments.filter(p => p.completedAt && p.completedAt >= weekStart).reduce((sum, p) => sum + p.driverEarning, 0),
      monthly: payments.filter(p => p.completedAt && p.completedAt >= monthStart).reduce((sum, p) => sum + p.driverEarning, 0),
      totalRides: payments.length,
      cashEarnings: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      qrEarnings: payments.filter(p => p.method === 'qr_turinvoice').reduce((sum, p) => sum + p.amount, 0),
    }
  } else {
    const payments = Array.from(memoryPayments.values()).filter(p => p.driverId === driverId && p.status === 'completed')
    return {
      daily: payments.filter(p => p.completedAt && p.completedAt >= todayStart).reduce((sum, p) => sum + p.driverEarning, 0),
      weekly: payments.filter(p => p.completedAt && p.completedAt >= weekStart).reduce((sum, p) => sum + p.driverEarning, 0),
      monthly: payments.filter(p => p.completedAt && p.completedAt >= monthStart).reduce((sum, p) => sum + p.driverEarning, 0),
      totalRides: payments.length,
      cashEarnings: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      qrEarnings: payments.filter(p => p.method === 'qr_turinvoice').reduce((sum, p) => sum + p.amount, 0),
    }
  }
}

// Muhasebe kaydı oluştur
export async function createAccountingRecord(record: Partial<AccountingRecord>): Promise<AccountingRecord | null> {
  const id = record.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const accRecord: AccountingRecord = {
    id,
    paymentId: record.paymentId,
    bookingId: record.bookingId,
    type: record.type || 'income',
    grossAmount: record.grossAmount || 0,
    platformFee: record.platformFee || 0,
    netAmount: record.netAmount || 0,
    currency: record.currency || 'TRY',
    driverId: record.driverId,
    customerId: record.customerId,
    description: record.description,
    metadata: record.metadata,
    transactionDate: record.transactionDate || now,
    createdAt: now,
  }
  
  if (supabase) {
    const { error } = await supabase.from('accounting').insert({
      id: accRecord.id,
      payment_id: accRecord.paymentId,
      booking_id: accRecord.bookingId,
      type: accRecord.type,
      gross_amount: accRecord.grossAmount,
      platform_fee: accRecord.platformFee,
      net_amount: accRecord.netAmount,
      currency: accRecord.currency,
      driver_id: accRecord.driverId,
      customer_id: accRecord.customerId,
      description: accRecord.description,
      metadata: accRecord.metadata,
      transaction_date: accRecord.transactionDate,
      created_at: accRecord.createdAt,
    })
    if (error) {
      console.error('createAccountingRecord error:', error)
      return null
    }
  } else {
    memoryAccounting.set(id, accRecord)
  }
  
  return accRecord
}

// Ödemeyi muhasebeye kaydet
export async function recordPaymentInAccounting(paymentId: string): Promise<boolean> {
  const payment = await getPaymentRecord(paymentId)
  if (!payment || payment.status !== 'completed' || payment.recordedInAccounting) {
    return false
  }
  
  // Muhasebe kaydı oluştur
  await createAccountingRecord({
    paymentId: payment.id,
    bookingId: payment.bookingId,
    type: 'income',
    grossAmount: payment.amount,
    platformFee: payment.platformFee,
    netAmount: payment.driverEarning,
    currency: payment.currency,
    driverId: payment.driverId,
    customerId: payment.customerId,
    description: `Transfer ödemesi - ${payment.method === 'cash' ? 'Nakit' : payment.method === 'qr_turinvoice' ? 'QR Kod (Turinvoice)' : 'Kart'}`,
    metadata: {
      method: payment.method,
      guestName: payment.guestName,
      guestPhone: payment.guestPhone,
    },
    transactionDate: payment.completedAt || payment.createdAt,
  })
  
  // Platform komisyonu kaydı
  if (payment.platformFee > 0) {
    await createAccountingRecord({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      type: 'commission',
      grossAmount: payment.platformFee,
      platformFee: 0,
      netAmount: payment.platformFee,
      currency: payment.currency,
      driverId: payment.driverId,
      description: `Platform komisyonu - %${((payment.platformFee / payment.amount) * 100).toFixed(1)}`,
      transactionDate: payment.completedAt || payment.createdAt,
    })
  }
  
  // Ödeme kaydını güncelle
  await updatePaymentRecord(paymentId, { recordedInAccounting: true })
  
  return true
}

// Ödeme logu oluştur
export async function createPaymentLog(paymentId: string, action: string, details?: any): Promise<void> {
  if (supabase) {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await supabase.from('payment_logs').insert({
      id,
      payment_id: paymentId,
      action,
      details,
      created_at: new Date().toISOString(),
    })
  }
}

// Yardımcı fonksiyon: DB'den PaymentRecord'a dönüştür
function mapDbToPayment(row: any): PaymentRecord {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    amount: Number(row.amount),
    currency: row.currency || 'TRY',
    method: row.method,
    status: row.status,
    driverId: String(row.driver_id),
    driverReceivedAt: row.driver_received_at || undefined,
    customerId: row.customer_id || undefined,
    guestName: row.guest_name || undefined,
    guestPhone: row.guest_phone || undefined,
    qrCodeId: row.qr_code_id || undefined,
    qrCodeUrl: row.qr_code_url || undefined,
    qrExpiresAt: row.qr_expires_at || undefined,
    turinvoicePaymentId: row.turinvoice_payment_id || undefined,
    turinvoiceResponse: row.turinvoice_response || undefined,
    platformFee: Number(row.platform_fee || 0),
    driverEarning: Number(row.driver_earning || 0),
    recordedInAccounting: !!row.recorded_in_accounting,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
  }
}

export function storageMode(): 'supabase' | 'memory' {
  return supabase ? 'supabase' : 'memory'
}
