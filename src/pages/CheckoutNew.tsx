import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { API } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { Booking } from '@/types'
import { toast } from 'sonner'
import { CreditCard, Banknote, QrCode, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'

type PaymentMethodOption = {
  id: 'cash' | 'qr_turinvoice' | 'card'
  name: string
  description: string
  icon: React.ReactNode
  active: boolean
  available: boolean
  comingSoon?: boolean
}

export const Checkout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const state: any = location.state

  const [creating, setCreating] = useState(true)
  const [paying, setPaying] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)
  const [reservationCode, setReservationCode] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'qr_turinvoice' | 'card' | null>(null)
  const [qrData, setQrData] = useState<{
    qrCodeId: string
    qrCodeUrl: string
    expiresAt: string
    paymentId: string
  } | null>(null)
  const [qrStatus, setQrStatus] = useState<'pending' | 'paid' | 'expired'>('pending')

  const payload = useMemo(() => {
    if (!state) return null
    const bd = state.bookingData || state
    const offer = state.offer || null
    const finalPrice = typeof offer?.offeredPrice === 'number' ? offer.offeredPrice : (typeof bd?.finalPrice === 'number' ? bd.finalPrice : undefined)
    const basePrice = typeof bd?.estimatedPrice === 'number' ? bd.estimatedPrice : (typeof bd?.basePrice === 'number' ? bd.basePrice : 0)
    
    const guestName = user?.name || bd?.guestName || undefined
    const guestPhone = user?.phone || bd?.guestPhone || undefined
    
    return {
      ...bd,
      customerId: user?.id,
      guestName,
      guestPhone,
      driverId: bd?.driverId || offer?.driverId,
      status: 'accepted',
      basePrice,
      finalPrice: finalPrice ?? basePrice,
      extras: { ...(bd?.extras || {}), termsAccepted: true },
    }
  }, [state, user])

  // Ödeme yöntemlerini yükle
  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  // QR kod durumunu polling ile kontrol et
  useEffect(() => {
    if (!qrData || qrStatus === 'paid') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/payments/${qrData.paymentId}/qr-status`)
        const j = await res.json()
        if (j.success && j.data.status === 'paid') {
          setQrStatus('paid')
          // Ödeme tamamlandı, booking'i güncelle
          await completePayment(qrData.paymentId, 'qr_turinvoice')
        }
      } catch {
        // ignore
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [qrData, qrStatus])

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(`${API}/payments/methods`)
      const j = await res.json()
      if (j.success) {
        setPaymentMethods(j.data.methods.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          icon: 
            m.id === 'cash' ? <Banknote className="h-6 w-6" /> :
            m.id === 'qr_turinvoice' ? <QrCode className="h-6 w-6" /> :
            <CreditCard className="h-6 w-6" />,
          active: m.active,
          available: m.available,
          comingSoon: m.comingSoon,
        })))
      }
    } catch {
      setPaymentMethods([
        { id: 'cash', name: 'Nakit', description: 'Şoföre nakit ödeyin', icon: <Banknote className="h-6 w-6" />, active: true, available: true },
        { id: 'qr_turinvoice', name: 'QR Kod', description: 'Turinvoice ile ödeyin', icon: <QrCode className="h-6 w-6" />, active: true, available: true },
        { id: 'card', name: 'Kredi Kartı', description: 'Yakında', icon: <CreditCard className="h-6 w-6" />, active: false, available: false, comingSoon: true },
      ])
    }
  }

  useEffect(() => {
    if (!payload) { navigate('/'); return }
    let alive = true
    ;(async () => {
      setCreating(true)
      try {
        const res = await fetch(`${API}/bookings/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const j = await res.json()
        if (!res.ok || !j.success) throw new Error(j.error || 'create_failed')
        if (alive) setCreated(j.data as Booking)
      } catch {
        toast.error('Rezervasyon oluşturulamadı')
        navigate('/reserve')
      } finally {
        if (alive) setCreating(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const completePayment = async (paymentId: string, method: 'cash' | 'qr_turinvoice') => {
    if (!created) return
    
    setPaying(true)
    try {
      const res = await fetch(`${API}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'pay_failed')
      const updated = j.data
      setCreated({ ...created, paymentStatus: 'paid' } as Booking)
      setReservationCode(created.reservationCode || null)
      toast.success('Rezervasyon onaylandı')
    } catch {
      toast.error('Ödeme/onay başarısız')
    } finally {
      setPaying(false)
    }
  }

  const handlePayment = async (method: 'cash' | 'qr_turinvoice' | 'card') => {
    if (!created) return
    
    if (method === 'card') {
      toast.info('Kart ile ödeme yakında aktif edilecektir.')
      return
    }
    
    setSelectedMethod(method)
    
    if (method === 'cash') {
      // Nakit ödeme - booking'i direkt güncelle
      await pay(method)
    } else if (method === 'qr_turinvoice') {
      // QR kod oluştur
      await createQRPayment()
    }
  }

  const pay = async (method: 'cash' | 'card') => {
    if (!created) return
    setPaying(true)
    try {
      const res = await fetch(`${API}/bookings/${created.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: created.finalPrice ?? created.basePrice, method }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'pay_failed')
      const updated = j.data as Booking
      setCreated(updated)
      setReservationCode(updated.reservationCode || null)
      toast.success('Rezervasyon onaylandı')
    } catch {
      toast.error('Ödeme/onay başarısız')
    } finally {
      setPaying(false)
    }
  }

  const createQRPayment = async () => {
    if (!created) return
    
    setPaying(true)
    try {
      const res = await fetch(`${API}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: created.id,
          driverId: created.driverId || 'unknown',
          method: 'qr_turinvoice',
          amount: created.finalPrice ?? created.basePrice,
        }),
      })
      const j = await res.json()
      
      if (j.success && j.data.qr) {
        setQrData({
          ...j.data.qr,
          paymentId: j.data.paymentId,
        })
        setQrStatus('pending')
      } else {
        toast.error(j.error || 'QR kod oluşturulamadı')
      }
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setPaying(false)
    }
  }

  const handleTestConfirm = async () => {
    if (!qrData) return
    
    setPaying(true)
    try {
      const res = await fetch(`${API}/payments/${qrData.paymentId}/confirm-test`, {
        method: 'POST',
      })
      const j = await res.json()
      
      if (j.success) {
        setQrStatus('paid')
        setReservationCode(created?.reservationCode || null)
        toast.success('Ödeme tamamlandı!')
      } else {
        toast.error(j.error || 'Onaylanamadı')
      }
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setPaying(false)
    }
  }

  if (!payload) return null

  const formatCurrency = (n: number) => `₺${n.toFixed(2)}`

  // Başarılı ekran
  if (reservationCode) {
    return (
      <div className="min-h-screen bg-gray-900 py-10">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-6">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-6 w-6" />
              <h1 className="text-xl font-bold">Rezervasyonunuz Oluşturuldu</h1>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-400">Rezervasyon Kodu</div>
              <div className="mt-1 text-3xl font-bold tracking-wider text-white">{reservationCode}</div>
              <div className="mt-2 text-sm text-gray-400">
                Rezervasyonlarım ekranında telefon doğrulaması ile bu kodla görüntüleyebilirsiniz.
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => navigate('/reservations')}>Rezervasyonlarım</Button>
              <Button variant="outline" onClick={() => navigate('/reserve')}>Yeni Rezervasyon</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-white">Ödeme</h1>
          <p className="text-gray-400 mt-1">Ödeme yöntemini seçin ve rezervasyonu onaylayın.</p>

          {creating && (
            <div className="mt-6 text-sm text-gray-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Rezervasyon hazırlanıyor...
            </div>
          )}

          {created && (
            <div className="mt-6 space-y-2 text-sm text-gray-300 bg-gray-750 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-500">Rota:</span>
                <span className="text-right flex-1 ml-4">{created.pickupLocation.address} → {created.dropoffLocation.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tarih:</span>
                <span>{new Date(created.pickupTime).toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-600">
                <span className="text-white">Toplam:</span>
                <span className="text-green-400">{formatCurrency(Number(created.finalPrice ?? created.basePrice))}</span>
              </div>
            </div>
          )}

          {/* QR Kod Görünümü */}
          {qrData && selectedMethod === 'qr_turinvoice' && (
            <div className="mt-6 text-center">
              <div className="bg-gray-750 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">QR Kod ile Öde</h3>
                
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrData.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                
                <div className={`mt-4 p-3 rounded-lg flex items-center justify-center gap-2 ${
                  qrStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                  qrStatus === 'paid' ? 'bg-green-500/20 text-green-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {qrStatus === 'pending' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Ödeme bekleniyor...</span>
                    </>
                  )}
                  {qrStatus === 'paid' && (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ödeme alındı!</span>
                    </>
                  )}
                  {qrStatus === 'expired' && (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>QR kod süresi doldu</span>
                    </>
                  )}
                </div>
                
                {/* Test modu butonu */}
                {process.env.VITE_TURINVOICE_TEST_MODE === 'true' && qrStatus === 'pending' && (
                  <button
                    onClick={handleTestConfirm}
                    disabled={paying}
                    className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-6 rounded-lg text-sm font-medium"
                  >
                    🧪 Test: Ödemeyi Onayla
                  </button>
                )}
                
                <button
                  onClick={() => { setQrData(null); setSelectedMethod(null); }}
                  className="mt-4 text-gray-400 hover:text-white text-sm block mx-auto"
                >
                  ← Başka yöntem seç
                </button>
              </div>
            </div>
          )}

          {/* Ödeme Yöntemi Seçimi */}
          {!qrData && created && (
            <div className="mt-8 space-y-3">
              <p className="text-gray-300 text-sm mb-4">Ödeme yöntemini seçin:</p>
              
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => method.available && handlePayment(method.id)}
                  disabled={!created || paying || !method.available}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    method.available
                      ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 cursor-pointer'
                      : 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-50'
                  } ${selectedMethod === method.id ? 'border-blue-500 bg-blue-900/20' : ''}`}
                >
                  <div className={`p-3 rounded-lg ${method.available ? 'bg-gray-700' : 'bg-gray-800'}`}>
                    {method.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${method.available ? 'text-white' : 'text-gray-500'}`}>
                      {method.name}
                    </p>
                    <p className="text-sm text-gray-400">{method.description}</p>
                  </div>
                  {method.comingSoon && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                      Yakında
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            <p>• Nakit ödemeler şoföre doğrudan yapılır</p>
            <p>• QR kod ile ödeme Turinvoice üzerinden gerçekleştirilir</p>
            <p>• Kart ile ödeme yakında aktif edilecektir</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
