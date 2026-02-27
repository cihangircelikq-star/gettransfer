import { Router, type Request, type Response } from 'express'
import { createPaymentRecord, updatePaymentRecord, getPaymentRecord, getPaymentByBookingId, listPaymentsByDriver, getDriverEarnings, recordPaymentInAccounting, createPaymentLog } from '../services/accountingStorage.js'
import { createQRPayment, checkPaymentStatus, verifyCallback, checkTurinvoiceConfig } from '../services/turinvoiceService.js'
import { getBookingById, updateBooking } from '../services/bookingsStorage.js'
import { getPricingConfig } from '../services/pricingStorage.js'

const router = Router()

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEME YÖNTEMİ TİPLERİ
// ═══════════════════════════════════════════════════════════════════════════

type PaymentMethod = 'cash' | 'qr_turinvoice' | 'card'
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

// ═══════════════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════

function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function calculateFees(amount: number, driverId?: string): Promise<{ platformFee: number; driverEarning: number }> {
  const pricing = await getPricingConfig().catch(() => null)
  const feePercent = pricing?.platformFeePercent ?? 3
  const platformFee = Math.round(amount * feePercent) / 100
  const driverEarning = amount - platformFee
  return { platformFee, driverEarning }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEME SEÇENEKLERİNİ GETİR
// ═══════════════════════════════════════════════════════════════════════════

router.get('/methods', (_req: Request, res: Response) => {
  const turinvoiceConfig = checkTurinvoiceConfig()
  
  res.json({
    success: true,
    data: {
      methods: [
        {
          id: 'cash',
          name: 'Nakit Ödeme',
          description: 'Şoföre nakit olarak ödeyin',
          icon: 'banknote',
          active: true,
          available: true,
        },
        {
          id: 'qr_turinvoice',
          name: 'QR Kod ile Öde',
          description: 'Turinvoice ile QR kod okutarak ödeyin',
          icon: 'qr-code',
          active: true,
          available: turinvoiceConfig.configured,
          testMode: turinvoiceConfig.mode === 'test',
        },
        {
          id: 'card',
          name: 'Kredi/Banka Kartı',
          description: 'Kartınızla güvenli ödeme (Yakında)',
          icon: 'credit-card',
          active: false,
          available: false,
          comingSoon: true,
        },
      ],
      turinvoiceConfigured: turinvoiceConfig.configured,
      turinvoiceMode: turinvoiceConfig.mode,
      turinvoiceMissing: turinvoiceConfig.missing,
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEME OLUŞTUR (ŞOFÖR İÇİN - YOLCULUK SONRASI)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/create', async (req: Request, res: Response) => {
  const { bookingId, method, amount, driverId, callbackUrl } = req.body || {}
  
  if (!bookingId || !method || !driverId) {
    res.status(400).json({ success: false, error: 'missing_parameters' })
    return
  }
  
  if (!['cash', 'qr_turinvoice', 'card'].includes(method)) {
    res.status(400).json({ success: false, error: 'invalid_payment_method' })
    return
  }
  
  // Kart ödemesi henüz aktif değil
  if (method === 'card') {
    res.status(400).json({ 
      success: false, 
      error: 'payment_method_not_available',
      message: 'Kart ile ödeme yakında aktif edilecektir.'
    })
    return
  }
  
  try {
    // Booking'i kontrol et
    const booking = await getBookingById(bookingId)
    if (!booking) {
      res.status(404).json({ success: false, error: 'booking_not_found' })
      return
    }
    
    // Ödeme tutarı
    const paymentAmount = amount || booking.finalPrice || booking.basePrice || 0
    if (paymentAmount <= 0) {
      res.status(400).json({ success: false, error: 'invalid_amount' })
      return
    }
    
    // Ücretleri hesapla
    const { platformFee, driverEarning } = await calculateFees(paymentAmount, driverId)
    
    // Ödeme kaydı oluştur
    const paymentId = generatePaymentId()
    const payment = await createPaymentRecord({
      id: paymentId,
      bookingId,
      amount: paymentAmount,
      currency: 'TRY',
      method,
      status: 'pending',
      driverId,
      customerId: booking.customerId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      platformFee,
      driverEarning,
    })
    
    if (!payment) {
      res.status(500).json({ success: false, error: 'payment_create_failed' })
      return
    }
    
    // Log
    await createPaymentLog(paymentId, 'created', { method, amount: paymentAmount })
    
    // QR Kod ise Turinvoice üzerinden oluştur
    let qrData = null
    if (method === 'qr_turinvoice') {
      // Callback URL - webhook için
      const webhookUrl = callbackUrl || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3005'}/api/payments/webhook/turinvoice`
      
      const qrResponse = await createQRPayment({
        amount: paymentAmount,
        currency: 'TRY',
        orderId: paymentId,
        description: `Transfer - ${booking.pickupLocation?.address?.substring(0, 50)} → ${booking.dropoffLocation?.address?.substring(0, 50)}`,
        callbackUrl: webhookUrl,
      })
      
      if (qrResponse.success && qrResponse.orderId) {
        await updatePaymentRecord(paymentId, {
          qrCodeId: String(qrResponse.orderId), // Turinvoice orderId
          qrCodeUrl: qrResponse.qrCodeUrl,
          turinvoicePaymentId: String(qrResponse.orderId),
        })
        
        qrData = {
          orderId: qrResponse.orderId,
          qrCodeUrl: qrResponse.qrCodeUrl,
          paymentUrl: qrResponse.paymentUrl,
          amount: qrResponse.amount,
          currency: qrResponse.currency,
        }
        
        await createPaymentLog(paymentId, 'qr_generated', qrData)
      } else {
        // QR oluşturulamadı
        console.error('QR creation failed:', qrResponse.error)
        await createPaymentLog(paymentId, 'qr_failed', { error: qrResponse.error })
        
        // Kullanıcıya bilgi ver, nakite çevirme
        res.json({
          success: true,
          data: {
            paymentId,
            amount: paymentAmount,
            method,
            platformFee,
            driverEarning,
            qr: null,
            qrError: qrResponse.error || 'QR kod oluşturulamadı',
          }
        })
        return
      }
    }
    
    res.json({
      success: true,
      data: {
        paymentId,
        amount: paymentAmount,
        method,
        platformFee,
        driverEarning,
        qr: qrData,
      }
    })
  } catch (error: any) {
    console.error('Payment create error:', error)
    res.status(500).json({ success: false, error: 'payment_create_error', message: error.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEMEYİ TAMAMLA (ŞOFÖR İÇİN - NAKİT)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:paymentId/complete', async (req: Request, res: Response) => {
  const { paymentId } = req.params
  const { method } = req.body || {}
  
  try {
    const payment = await getPaymentRecord(paymentId)
    if (!payment) {
      res.status(404).json({ success: false, error: 'payment_not_found' })
      return
    }
    
    if (payment.status === 'completed') {
      res.status(400).json({ success: false, error: 'payment_already_completed' })
      return
    }
    
    const now = new Date().toISOString()
    
    // Ödemeyi güncelle
    const updated = await updatePaymentRecord(paymentId, {
      status: 'completed',
      driverReceivedAt: now,
      completedAt: now,
    })
    
    if (!updated) {
      res.status(500).json({ success: false, error: 'payment_update_failed' })
      return
    }
    
    // Muhasebeye kaydet
    await recordPaymentInAccounting(paymentId)
    
    // Booking'i güncelle
    await updateBooking(payment.bookingId, {
      paymentStatus: 'paid',
      paymentMethod: method || payment.method,
      paidAt: now,
    })
    
    // Log
    await createPaymentLog(paymentId, 'completed', { method: method || payment.method })
    
    res.json({
      success: true,
      data: {
        paymentId,
        status: 'completed',
        amount: payment.amount,
        driverEarning: payment.driverEarning,
        completedAt: now,
      }
    })
  } catch (error: any) {
    console.error('Payment complete error:', error)
    res.status(500).json({ success: false, error: 'payment_complete_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// QR KOD DURUMUNU SORGULA (POLLING)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:paymentId/qr-status', async (req: Request, res: Response) => {
  const { paymentId } = req.params
  
  try {
    const payment = await getPaymentRecord(paymentId)
    if (!payment) {
      res.status(404).json({ success: false, error: 'payment_not_found' })
      return
    }
    
    if (payment.method !== 'qr_turinvoice') {
      res.status(400).json({ success: false, error: 'not_qr_payment' })
      return
    }
    
    if (!payment.qrCodeId) {
      res.status(400).json({ success: false, error: 'qr_code_not_found' })
      return
    }
    
    // Turinvoice'dan durumu sorgula (orderId = qrCodeId)
    const orderId = Number(payment.qrCodeId)
    const statusResponse = await checkPaymentStatus(orderId)
    
    // Eğer ödendiyse kaydı güncelle
    if (statusResponse.status === 'paid' && payment.status !== 'completed') {
      const now = new Date().toISOString()
      await updatePaymentRecord(paymentId, {
        status: 'completed',
        completedAt: now,
        turinvoicePaymentId: String(orderId),
      })
      await recordPaymentInAccounting(paymentId)
      await updateBooking(payment.bookingId, {
        paymentStatus: 'paid',
        paymentMethod: 'qr_turinvoice',
        paidAt: now,
      })
      await createPaymentLog(paymentId, 'qr_paid', { orderId, paidAt: statusResponse.paidAt })
    }
    
    res.json({
      success: true,
      data: {
        paymentId,
        orderId: orderId,
        status: statusResponse.status,
        amount: payment.amount,
        paidAt: statusResponse.paidAt,
      }
    })
  } catch (error: any) {
    console.error('QR status check error:', error)
    res.status(500).json({ success: false, error: 'qr_status_check_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEME DETAYI
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:paymentId', async (req: Request, res: Response) => {
  const { paymentId } = req.params
  
  try {
    const payment = await getPaymentRecord(paymentId)
    if (!payment) {
      res.status(404).json({ success: false, error: 'payment_not_found' })
      return
    }
    
    res.json({ success: true, data: payment })
  } catch (error) {
    res.status(500).json({ success: false, error: 'get_payment_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING ÖDEMESİNİ GETİR
// ═══════════════════════════════════════════════════════════════════════════

router.get('/booking/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params
  
  try {
    const payment = await getPaymentByBookingId(bookingId)
    res.json({ success: true, data: payment })
  } catch (error) {
    res.status(500).json({ success: false, error: 'get_payment_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ŞOFÖR ÖDEMELERİ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/driver/:driverId', async (req: Request, res: Response) => {
  const { driverId } = req.params
  const limit = Number(req.query.limit) || 50
  
  try {
    const payments = await listPaymentsByDriver(driverId, limit)
    res.json({ success: true, data: payments })
  } catch (error) {
    res.status(500).json({ success: false, error: 'list_payments_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ŞOFÖR KAZANÇLARI
// ═══════════════════════════════════════════════════════════════════════════

router.get('/driver/:driverId/earnings', async (req: Request, res: Response) => {
  const { driverId } = req.params
  
  try {
    const earnings = await getDriverEarnings(driverId)
    res.json({ success: true, data: earnings })
  } catch (error) {
    res.status(500).json({ success: false, error: 'get_earnings_error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// TURINVOICE WEBHOOK / CALLBACK
// ═══════════════════════════════════════════════════════════════════════════

router.post('/webhook/turinvoice', async (req: Request, res: Response) => {
  const notification = req.body
  
  console.log('🔵 [Webhook] Turinvoice callback received:', JSON.stringify(notification, null, 2))
  
  try {
    // Bildirimi doğrula
    if (!verifyCallback(notification)) {
      console.error('❌ [Webhook] Invalid callback - verification failed')
      res.status(400).json({ success: false, error: 'invalid_callback' })
      return
    }
    
    const orderId = notification.id // Turinvoice order ID
    
    // Ödeme kaydını bul (qrCodeId = orderId)
    // NOT: qrCodeId string olarak kaydedildi, number'a çevir
    const payments = await listPaymentsByDriver('', 1000) // Tüm ödemeleri al
    const payment = payments.find(p => p.qrCodeId === String(orderId))
    
    if (!payment) {
      console.error('❌ [Webhook] Payment not found for orderId:', orderId)
      res.status(404).json({ success: false, error: 'payment_not_found' })
      return
    }
    
    // Ödeme zaten tamamlanmış mı?
    if (payment.status === 'completed') {
      console.log('⚠️ [Webhook] Payment already completed:', payment.id)
      res.json({ success: true, message: 'already_completed' })
      return
    }
    
    // Ödemeyi güncelle
    const now = new Date().toISOString()
    await updatePaymentRecord(payment.id, {
      status: 'completed',
      completedAt: notification.datePay || now,
      turinvoicePaymentId: String(orderId),
      turinvoiceResponse: notification,
    })
    
    // Muhasebeye kaydet
    await recordPaymentInAccounting(payment.id)
    
    // Booking'i güncelle
    await updateBooking(payment.bookingId, {
      paymentStatus: 'paid',
      paymentMethod: 'qr_turinvoice',
      paidAt: notification.datePay || now,
    })
    
    // Log
    await createPaymentLog(payment.id, 'webhook_received', notification)
    
    console.log('✅ [Webhook] Payment completed via webhook:', payment.id)
    
    res.json({ success: true, message: 'payment_completed' })
  } catch (error: any) {
    console.error('❌ [Webhook] Error:', error)
    res.status(500).json({ success: false, error: 'webhook_error' })
  }
})

export default router
