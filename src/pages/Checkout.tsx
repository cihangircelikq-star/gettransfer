import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { API } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { Booking } from '@/types'
import { toast } from 'sonner'
import { CreditCard, Banknote, CheckCircle2 } from 'lucide-react'

export const Checkout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const state: any = location.state

  const [creating, setCreating] = useState(true)
  const [paying, setPaying] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)
  const [reservationCode, setReservationCode] = useState<string | null>(null)

  const payload = useMemo(() => {
    if (!state) return null
    const bd = state.bookingData || state
    const offer = state.offer || null
    const finalPrice = typeof offer?.offeredPrice === 'number' ? offer.offeredPrice : (typeof bd?.finalPrice === 'number' ? bd.finalPrice : undefined)
    const basePrice = typeof bd?.estimatedPrice === 'number' ? bd.estimatedPrice : (typeof bd?.basePrice === 'number' ? bd.basePrice : 0)
    
    // Kullanıcı bilgilerini de ekle - müşteri listesinde "Misafir" görünmemesi için
    const guestName = user?.name || bd?.guestName || undefined
    const guestPhone = user?.phone || bd?.guestPhone || undefined
    
    return {
      ...bd,
      customerId: user?.id,
      guestName,  // Kullanıcı adını da kaydet
      guestPhone, // Kullanıcı telefonunu da kaydet
      driverId: bd?.driverId || offer?.driverId,
      status: 'accepted',
      basePrice,
      finalPrice: finalPrice ?? basePrice,
      extras: { ...(bd?.extras || {}), termsAccepted: true },
    }
  }, [state, user])

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

  const pay = async (method: 'card' | 'cash') => {
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

  if (!payload) return null

  if (reservationCode) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
              <h1 className="text-xl font-bold">Rezervasyonunuz Oluşturuldu</h1>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600">Rezervasyon Kodu</div>
              <div className="mt-1 text-3xl font-bold tracking-wider">{reservationCode}</div>
              <div className="mt-2 text-sm text-gray-600">
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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Ödeme</h1>
          <p className="text-gray-600 mt-1">Ödeme yöntemini seçin ve rezervasyonu onaylayın.</p>

          {creating && <div className="mt-6 text-sm text-gray-500">Rezervasyon hazırlanıyor...</div>}

          {created && (
            <div className="mt-6 space-y-2 text-sm text-gray-700">
              <div><strong>Rota:</strong> {created.pickupLocation.address} → {created.dropoffLocation.address}</div>
              <div><strong>Tarih:</strong> {new Date(created.pickupTime).toLocaleString('tr-TR')}</div>
              <div><strong>Tutar:</strong> ₺{Number(created.finalPrice ?? created.basePrice).toFixed(2)}</div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button disabled={!created || paying} onClick={() => pay('card')} className="w-full">
              <CreditCard className="h-5 w-5 mr-2" />
              Kart ile Öde
            </Button>
            <Button disabled={!created || paying} variant="outline" onClick={() => pay('cash')} className="w-full">
              <Banknote className="h-5 w-5 mr-2" />
              Nakit ile Öde
            </Button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Not: Kart ödemesi şu aşamada demo onaydır; gerçek ödeme sağlayıcısı sonra entegre edilir.
          </div>
        </div>
      </div>
    </div>
  )
}

