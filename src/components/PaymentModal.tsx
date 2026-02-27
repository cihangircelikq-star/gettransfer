import React, { useState, useEffect } from 'react'
import { X, Banknote, QrCode, CreditCard, Check, Loader2, AlertCircle, Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { API } from '@/utils/api'

type PaymentMethod = 'cash' | 'qr_turinvoice' | 'card'

type PaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  driverId: string
  amount: number
  customerName?: string
  customerPhone?: string
  onComplete: () => void
}

type PaymentOption = {
  id: PaymentMethod
  name: string
  description: string
  icon: React.ReactNode
  active: boolean
  available: boolean
  comingSoon?: boolean
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  driverId,
  amount,
  customerName,
  customerPhone,
  onComplete,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [qrData, setQrData] = useState<{
    qrCodeId: string
    qrCodeUrl: string
    expiresAt: string
  } | null>(null)
  const [qrStatus, setQrStatus] = useState<'pending' | 'paid' | 'expired'>('pending')
  const [completed, setCompleted] = useState(false)

  // Ödeme seçeneklerini yükle
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods()
    }
  }, [isOpen])

  // QR kod durumunu polling ile kontrol et
  useEffect(() => {
    if (!qrData || qrStatus === 'paid' || completed) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/payments/${paymentId}/qr-status`)
        const j = await res.json()
        if (j.success && j.data.status === 'paid') {
          setQrStatus('paid')
          setCompleted(true)
          toast.success('Ödeme alındı!')
          setTimeout(() => {
            onComplete()
          }, 1500)
        }
      } catch {
        // ignore
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [qrData, qrStatus, paymentId, completed, onComplete])

  // QR kod süresi doldu mu kontrol et
  useEffect(() => {
    if (!qrData) return

    const checkExpiry = () => {
      const expires = new Date(qrData.expiresAt).getTime()
      if (Date.now() > expires) {
        setQrStatus('expired')
      }
    }

    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [qrData])

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(`${API}/payments/methods`)
      const j = await res.json()
      if (j.success) {
        setPaymentOptions(j.data.methods)
      }
    } catch {
      // Varsayılan seçenekler
      setPaymentOptions([
        { id: 'cash', name: 'Nakit', description: 'Şoföre nakit ödeyin', icon: <Banknote className="h-6 w-6" />, active: true, available: true },
        { id: 'qr_turinvoice', name: 'QR Kod', description: 'Turinvoice ile ödeyin', icon: <QrCode className="h-6 w-6" />, active: true, available: true },
        { id: 'card', name: 'Kredi Kartı', description: 'Yakında', icon: <CreditCard className="h-6 w-6" />, active: false, available: false, comingSoon: true },
      ])
    }
  }

  const handleSelectMethod = async (method: PaymentMethod) => {
    if (method === 'card') {
      toast.info('Kart ile ödeme yakında aktif edilecektir.')
      return
    }

    setSelectedMethod(method)
    setLoading(true)
    setQrData(null)

    try {
      // Ödeme oluştur
      const res = await fetch(`${API}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          driverId,
          method,
          amount,
        }),
      })
      const j = await res.json()

      if (!j.success) {
        toast.error(j.error || 'Ödeme oluşturulamadı')
        setLoading(false)
        return
      }

      setPaymentId(j.data.paymentId)

      // QR kod verisi varsa
      if (j.data.qr) {
        setQrData(j.data.qr)
        setQrStatus('pending')
      }

      setLoading(false)
    } catch {
      toast.error('Bağlantı hatası')
      setLoading(false)
    }
  }

  const handleConfirmCash = async () => {
    if (!paymentId) return

    setLoading(true)
    try {
      const res = await fetch(`${API}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'cash' }),
      })
      const j = await res.json()

      if (j.success) {
        setCompleted(true)
        toast.success('Nakit ödeme kaydedildi!')
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        toast.error(j.error || 'Ödeme kaydedilemedi')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
    setLoading(false)
  }

  const handleConfirmQR = async () => {
    if (!paymentId) return

    setLoading(true)
    try {
      const res = await fetch(`${API}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'qr_turinvoice' }),
      })
      const j = await res.json()

      if (j.success) {
        setCompleted(true)
        toast.success('QR Kod ödemesi kaydedildi!')
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        toast.error(j.error || 'Ödeme kaydedilemedi')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
    setLoading(false)
  }

  const handleTestConfirm = async () => {
    if (!paymentId) return

    setLoading(true)
    try {
      const res = await fetch(`${API}/payments/${paymentId}/confirm-test`, {
        method: 'POST',
      })
      const j = await res.json()

      if (j.success) {
        setQrStatus('paid')
        setCompleted(true)
        toast.success('Test ödemesi onaylandı!')
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        toast.error(j.error || 'Onaylanamadı')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
    setLoading(false)
  }

  const formatCurrency = (n: number) => `₺${n.toFixed(2)}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-700">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Ödeme Al</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-2 text-white/80 text-sm">
            {customerName && <span>{customerName}</span>}
            {customerPhone && <span className="ml-2">• {customerPhone}</span>}
          </div>
        </div>

        {/* Amount */}
        <div className="p-4 bg-gray-750 border-b border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Toplam Tutar</p>
            <p className="text-4xl font-bold text-white mt-1">{formatCurrency(amount)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          
          {/* Completed State */}
          {completed && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mt-4">Ödeme Tamamlandı!</h3>
              <p className="text-gray-400 mt-2">Yolculuk başarıyla sonlandırıldı.</p>
            </div>
          )}

          {/* Method Selection */}
          {!completed && !selectedMethod && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-4">Ödeme yöntemini seçin:</p>
              
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => option.available && handleSelectMethod(option.id)}
                  disabled={!option.available}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    option.available
                      ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 cursor-pointer'
                      : 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    option.available ? 'bg-gray-700' : 'bg-gray-800'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${option.available ? 'text-white' : 'text-gray-500'}`}>
                      {option.name}
                    </p>
                    <p className="text-sm text-gray-400">{option.description}</p>
                  </div>
                  {option.comingSoon && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                      Yakında
                    </span>
                  )}
                  {option.available && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Cash Payment */}
          {!completed && selectedMethod === 'cash' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Banknote className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Nakit Ödeme</h3>
              <p className="text-gray-400 mt-2 text-sm">
                Müşteriden nakit olarak {formatCurrency(amount)} tahsil edin.
              </p>
              
              <button
                onClick={handleConfirmCash}
                disabled={loading}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Nakit Aldım
                  </>
                )}
              </button>
              
              <button
                onClick={() => setSelectedMethod(null)}
                className="mt-3 text-gray-400 hover:text-white text-sm"
              >
                ← Geri dön
              </button>
            </div>
          )}

          {/* QR Code Payment */}
          {!completed && selectedMethod === 'qr_turinvoice' && (
            <div className="text-center py-4">
              {loading && !qrData ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  <p className="text-gray-400 mt-3">QR Kod oluşturuluyor...</p>
                </div>
              ) : qrData ? (
                <>
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                    <QrCode className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mt-4">QR Kod ile Ödeme</h3>
                  
                  {/* QR Code Image */}
                  <div className="mt-4 bg-white p-4 rounded-xl inline-block">
                    <img
                      src={qrData.qrCodeUrl}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  
                  {/* Status */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    qrStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    qrStatus === 'paid' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {qrStatus === 'pending' && (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Ödeme bekleniyor...</span>
                      </div>
                    )}
                    {qrStatus === 'paid' && (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ödeme alındı!</span>
                      </div>
                    )}
                    {qrStatus === 'expired' && (
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>QR kod süresi doldu</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Test Mode Button */}
                  {process.env.VITE_TURINVOICE_TEST_MODE === 'true' && qrStatus === 'pending' && (
                    <button
                      onClick={handleTestConfirm}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm"
                    >
                      🧪 Test: Ödemeyi Onayla
                    </button>
                  )}
                  
                  {/* Manual Confirm Button */}
                  {qrStatus === 'paid' && (
                    <button
                      onClick={handleConfirmQR}
                      disabled={loading}
                      className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          Ödemeyi Tamamla
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Expired - Retry */}
                  {qrStatus === 'expired' && (
                    <button
                      onClick={() => handleSelectMethod('qr_turinvoice')}
                      className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium"
                    >
                      Yeni QR Kod Oluştur
                    </button>
                  )}
                  
                  <button
                    onClick={() => { setSelectedMethod(null); setQrData(null); }}
                    className="mt-3 text-gray-400 hover:text-white text-sm"
                  >
                    ← Geri dön
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                  <p className="text-gray-400 mt-3">QR Kod oluşturulamadı</p>
                  <button
                    onClick={() => setSelectedMethod(null)}
                    className="mt-4 text-blue-400 hover:text-blue-300"
                  >
                    ← Geri dön
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!completed && (
          <div className="p-4 bg-gray-900/50 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              Ödeme yöntemi seçildikten sonra müşteriye bilgi verilecektir.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentModal
