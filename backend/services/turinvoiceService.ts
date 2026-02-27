/**
 * Turinvoice QR Kod Ödeme Servisi
 * 
 * API Dokümantasyonu: OPEN-API TURINVOICE
 * Entegrasyon: API üzerinden sipariş oluşturma ve ödeme takibi
 */

// ═══════════════════════════════════════════════════════════════════════════
// KONFİGÜRASYON
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Test Ortamı
  test: {
    host: 'https://hesap.dev.turinvoice.com',
    login: '+908457123032',
    password: 'Qwerty56',
    idTSP: 248,
    secretKey: '23961e91-573c-48e1-b317-02b433dc37ec',
  },
  
  // Prodüksiyon (sonra doldurulacak)
  prod: {
    host: process.env.TURINVOICE_HOST || 'https://hesap.turinvoice.com',
    login: process.env.TURINVOICE_LOGIN || '',
    password: process.env.TURINVOICE_PASSWORD || '',
    idTSP: Number(process.env.TURINVOICE_ID_TSP) || 0,
    secretKey: process.env.TURINVOICE_SECRET_KEY || '',
  },
  
  // Mod seçimi
  isTestMode: process.env.TURINVOICE_TEST_MODE !== 'false', // Default: test mode
}

// Aktif config
const getActiveConfig = () => CONFIG.isTestMode ? CONFIG.test : CONFIG.prod

// ═══════════════════════════════════════════════════════════════════════════
// TİPLER
// ═══════════════════════════════════════════════════════════════════════════

export type TurinvoiceAuthResponse = {
  code: string
  message?: string
}

export type TurinvoiceOrder = {
  id: number
  amount: number
  currency: string
  number: number
  name: string
  quantity: number
  state: 'new' | 'paying' | 'paid' | 'cancelled' | 'refunded'
  dateCreate: string
  datePay: string | null
  paymentUrl: string
  linkReceipt: string | null
  callbackUrl?: string
  redirectUrl?: string
  payment?: any
  calculationState?: any
  futurePayout: boolean
  datePayout: string | null
  refund: any[]
}

export type TurinvoiceCreateOrderResponse = {
  idOrder: number
}

export type TurinvoiceRefundResponse = {
  idRefund?: number
  code: string
  message?: {
    RU: string
    TR: string
  }
}

export type TurinvoiceCallbackNotification = TurinvoiceOrder & {
  secret_key: string
}

export type QRPaymentResult = {
  success: boolean
  orderId?: number
  paymentUrl?: string
  qrCodeUrl?: string
  amount?: number
  currency?: string
  error?: string
}

export type PaymentStatusResult = {
  success: boolean
  status: 'new' | 'paying' | 'paid' | 'cancelled' | 'refunded'
  orderId?: number
  amount?: number
  paidAt?: string
  error?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION YÖNETİMİ
// ═══════════════════════════════════════════════════════════════════════════

// Session cache
let sessionCookie: string | null = null
let sessionExpiry: number = 0

/**
 * Turinvoice'a giriş yap ve session cookie al
 */
async function ensureSession(): Promise<boolean> {
  const now = Date.now()
  
  // Session hala geçerli mi? (20 dakika cache)
  if (sessionCookie && now < sessionExpiry) {
    return true
  }
  
  const config = getActiveConfig()
  
  try {
    console.log('🔵 [Turinvoice] Logging in...', { host: config.host, login: config.login })
    
    const response = await fetch(`${config.host}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: config.login,
        password: config.password,
      }),
    })
    
    // Cookie'yi response header'dan al
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      // sessionid cookie'sini extract et
      const match = setCookie.match(/sessionid=([^;]+)/)
      if (match) {
        sessionCookie = `sessionid=${match[1]}`
        sessionExpiry = now + 20 * 60 * 1000 // 20 dakika
        console.log('✅ [Turinvoice] Session obtained')
        return true
      }
    }
    
    // Response body'den kontrol et
    const data = await response.json() as TurinvoiceAuthResponse
    if (data.code === 'OK') {
      console.log('✅ [Turinvoice] Login successful, but no session cookie')
      return true
    }
    
    console.error('❌ [Turinvoice] Login failed:', data)
    return false
  } catch (error: any) {
    console.error('❌ [Turinvoice] Login error:', error.message)
    return false
  }
}

/**
 * Authenticated request yap
 */
async function authenticatedRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<{ ok: boolean; data?: any; status: number }> {
  const config = getActiveConfig()
  
  // Session kontrol et
  const hasSession = await ensureSession()
  if (!hasSession) {
    return { ok: false, status: 401 }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie
  }
  
  const options: RequestInit = {
    method,
    headers,
  }
  
  if (body && (method === 'PUT' || method === 'POST')) {
    options.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(`${config.host}${endpoint}`, options)
    const responseText = await response.text()
    
    let data
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch {
      data = { raw: responseText }
    }
    
    // 401 hatası alırsak session'ı sıfırla
    if (response.status === 401) {
      sessionCookie = null
      console.log('⚠️ [Turinvoice] Session expired, will retry')
    }
    
    return { ok: response.ok, data, status: response.status }
  } catch (error: any) {
    console.error('❌ [Turinvoice] Request error:', error.message)
    return { ok: false, status: 0 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖDEME İŞLEMLERİ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sipariş (Ödeme) Oluştur
 * 
 * @param amount Ödeme tutarı
 * @param currency Para birimi (USD, TRY, EUR vb.)
 * @param orderId Sipariş ID (bizim sistemimizdeki)
 * @param callbackUrl Ödeme bildirimi URL'si
 * @param redirectUrl Ödeme sonrası yönlendirme URL'si
 * @returns Sipariş bilgileri
 */
export async function createQRPayment(params: {
  amount: number
  currency: string
  orderId: string
  description?: string
  callbackUrl?: string
  redirectUrl?: string
}): Promise<QRPaymentResult> {
  const config = getActiveConfig()
  
  console.log('🔵 [Turinvoice] Creating order:', {
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    testMode: CONFIG.isTestMode,
  })
  
  try {
    // 1. Sipariş oluştur
    const response = await authenticatedRequest('PUT', '/api/v1/tsp/order', {
      idTSP: config.idTSP,
      amount: params.amount,
      name: params.description || `Order ${params.orderId}`,
      currency: params.currency,
      quantity: 1,
      callbackUrl: params.callbackUrl,
      redirectUrl: params.redirectUrl,
    })
    
    if (!response.ok || !response.data?.idOrder) {
      console.error('❌ [Turinvoice] Order creation failed:', response.data)
      return {
        success: false,
        error: response.data?.message || 'Sipariş oluşturulamadı',
      }
    }
    
    const idOrder = response.data.idOrder
    console.log('✅ [Turinvoice] Order created:', idOrder)
    
    // 2. Sipariş detaylarını al (paymentUrl için)
    const detailResponse = await authenticatedRequest('GET', `/api/v1/tsp/order?idOrder=${idOrder}`)
    
    if (!detailResponse.ok || !detailResponse.data) {
      return {
        success: true,
        orderId: idOrder,
        error: 'Sipariş oluşturuldu ama detaylar alınamadı',
      }
    }
    
    const order = detailResponse.data as TurinvoiceOrder
    const paymentUrl = order.paymentUrl
    
    // 3. QR kod URL'i oluştur
    const qrCodeUrl = `${config.host}/api/v1/tsp/order/payment/qr?idOrder=${idOrder}`
    
    console.log('✅ [Turinvoice] Payment URL:', paymentUrl)
    
    return {
      success: true,
      orderId: idOrder,
      paymentUrl,
      qrCodeUrl,
      amount: params.amount,
      currency: params.currency,
    }
  } catch (error: any) {
    console.error('❌ [Turinvoice] Create order error:', error.message)
    return {
      success: false,
      error: error.message || 'Bağlantı hatası',
    }
  }
}

/**
 * Sipariş Durumunu Sorgula
 * 
 * @param orderId Turinvoice sipariş ID
 * @returns Sipariş durumu
 */
export async function checkPaymentStatus(orderId: number): Promise<PaymentStatusResult> {
  console.log('🔵 [Turinvoice] Checking status for order:', orderId)
  
  try {
    const response = await authenticatedRequest('GET', `/api/v1/tsp/order?idOrder=${orderId}`)
    
    if (!response.ok || !response.data) {
      return {
        success: false,
        status: 'new',
        error: 'Sipariş bulunamadı',
      }
    }
    
    const order = response.data as TurinvoiceOrder
    
    return {
      success: true,
      status: order.state,
      orderId: order.id,
      amount: order.amount,
      paidAt: order.datePay || undefined,
    }
  } catch (error: any) {
    console.error('❌ [Turinvoice] Check status error:', error.message)
    return {
      success: false,
      status: 'new',
      error: error.message,
    }
  }
}

/**
 * QR Kod Görselini Al (Base64)
 * 
 * @param orderId Turinvoice sipariş ID
 * @returns Base64 encoded QR image
 */
export async function getQRCodeImage(orderId: number): Promise<string | null> {
  const config = getActiveConfig()
  
  try {
    // Session kontrol et
    const hasSession = await ensureSession()
    if (!hasSession) return null
    
    const response = await fetch(
      `${config.host}/api/v1/tsp/order/payment/qr?idOrder=${orderId}`,
      {
        headers: {
          'Cookie': sessionCookie || '',
        },
      }
    )
    
    if (!response.ok) return null
    
    // Response bir image dosyası
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.error('❌ [Turinvoice] Get QR code error:', error)
    return null
  }
}

/**
 * Ödeme İadesi
 * 
 * @param orderId Turinvoice sipariş ID
 * @param amount İade tutarı (opsiyonel, tam iade için boş bırakın)
 * @param description İade açıklaması
 */
export async function refundPayment(
  orderId: number,
  amount?: number,
  description?: string
): Promise<TurinvoiceRefundResponse> {
  console.log('🔵 [Turinvoice] Refunding order:', orderId, amount)
  
  try {
    const response = await authenticatedRequest('PUT', '/api/v1/tsp/refund', {
      idOrder: orderId,
      amount: amount,
      description: description || 'Müşteri talebi',
    })
    
    return response.data as TurinvoiceRefundResponse
  } catch (error: any) {
    return {
      code: 'ERROR',
      message: {
        RU: error.message,
        TR: error.message,
      },
    }
  }
}

/**
 * Webhook/Callback Doğrulama
 * 
 * @param notification Gelen bildirim
 * @returns Doğrulama sonucu
 */
export function verifyCallback(notification: TurinvoiceCallbackNotification): boolean {
  const config = getActiveConfig()
  
  // Secret key kontrolü
  if (notification.secret_key !== config.secretKey) {
    console.error('❌ [Turinvoice] Invalid callback secret key')
    return false
  }
  
  // Ödeme durumu kontrolü
  if (notification.state !== 'paid') {
    console.log('⚠️ [Turinvoice] Callback state is not paid:', notification.state)
    return false
  }
  
  console.log('✅ [Turinvoice] Callback verified for order:', notification.id)
  return true
}

/**
 * Konfigürasyon Durumu
 */
export function checkTurinvoiceConfig(): { configured: boolean; mode: string; missing: string[] } {
  const missing: string[] = []
  const config = getActiveConfig()
  
  if (CONFIG.isTestMode) {
    // Test modunda hazır
    return {
      configured: true,
      mode: 'test',
      missing: [],
    }
  }
  
  // Prodüksiyon kontrolü
  if (!config.login) missing.push('TURINVOICE_LOGIN')
  if (!config.password) missing.push('TURINVOICE_PASSWORD')
  if (!config.idTSP) missing.push('TURINVOICE_ID_TSP')
  if (!config.secretKey) missing.push('TURINVOICE_SECRET_KEY')
  
  return {
    configured: missing.length === 0,
    mode: CONFIG.isTestMode ? 'test' : 'production',
    missing,
  }
}

/**
 * Session'ı Sıfırla (yeni giriş için)
 */
export function resetSession(): void {
  sessionCookie = null
  sessionExpiry = 0
  console.log('🔵 [Turinvoice] Session reset')
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  createQRPayment,
  checkPaymentStatus,
  getQRCodeImage,
  refundPayment,
  verifyCallback,
  checkTurinvoiceConfig,
  resetSession,
}
