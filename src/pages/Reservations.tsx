import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { API } from '@/utils/api'
import { Booking } from '@/types'
import { CalendarClock, MapPin, XCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'

export const Reservations = () => {
  const { user } = useAuthStore()
  const [items, setItems] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [reservationCode, setReservationCode] = useState(() => localStorage.getItem('lastReservationCode') || '')
  const [guestBooking, setGuestBooking] = useState<Booking | null>(null)
  const [searching, setSearching] = useState(false)

  const upcoming = useMemo(() => {
    const now = Date.now()
    return items
      .filter(b => !b.isImmediate && new Date(b.pickupTime).getTime() >= now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime())
  }, [items])

  const past = useMemo(() => {
    const now = Date.now()
    return items
      .filter(b => !b.isImmediate && (new Date(b.pickupTime).getTime() < now || b.status === 'cancelled'))
      .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime())
  }, [items])

  const refresh = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/bookings/by-customer/${user.id}`)
      const j = await res.json()
      if (res.ok && j.success && Array.isArray(j.data)) setItems(j.data as Booking[])
      else setItems([])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh().catch(() => {}) }, [user?.id])

  const cancel = async (id: string) => {
    if (!confirm('Rezervasyonu iptal etmek istiyor musunuz?')) return
    try {
      const res = await fetch(`${API}/bookings/${id}/cancel`, { method: 'POST' })
      const j = await res.json()
      if (res.ok && j.success) {
        toast.success('Rezervasyon iptal edildi')
        refresh().catch(() => {})
      } else {
        toast.error('İptal edilemedi')
      }
    } catch {
      toast.error('İptal edilemedi')
    }
  }

  const Card = ({ b, canCancel }: { b: Booking, canCancel: boolean }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{b.pickupLocation.address}</div>
          <div className="text-sm text-gray-600 truncate">→ {b.dropoffLocation.address}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border">
              <CalendarClock className="h-3.5 w-3.5" />
              {new Date(b.pickupTime).toLocaleString('tr-TR')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border">
              <MapPin className="h-3.5 w-3.5" />
              {b.vehicleType} • {b.passengerCount} kişi
            </span>
            {b.flightNumber && <span className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border">Uçuş: {b.flightNumber}</span>}
            {b.returnTrip?.enabled && <span className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border">Dönüş</span>}
          </div>
          <div className="mt-2 text-xs text-gray-500">Durum: {b.status}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canCancel && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => cancel(b.id)}>
              <XCircle className="h-4 w-4 mr-1" />
              İptal
            </Button>
          )}
          <Link to={`/booking/${b.id}`}>
            <Button size="sm" variant="outline">Detay</Button>
          </Link>
        </div>
      </div>
    </div>
  )

  const searchByCode = async () => {
    if (!reservationCode.trim()) {
      toast.error('Rezervasyon kodu girin')
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`${API}/bookings/code/${reservationCode.trim().toUpperCase()}`)
      const j = await res.json()
      if (res.ok && j.success && j.data) {
        setGuestBooking(j.data as Booking)
        toast.success('Rezervasyon bulundu')
      } else {
        toast.error('Rezervasyon bulunamadı')
      }
    } catch {
      toast.error('Arama başarısız')
    } finally {
      setSearching(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rezervasyonlar</h1>
            <p className="text-gray-600">Rezervasyon kodunuzla rezervasyonunuzu görüntüleyebilirsiniz.</p>

            <div className="mt-6 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rezervasyon Kodu</label>
              <div className="flex gap-2">
                <Input 
                  value={reservationCode} 
                  onChange={(e) => setReservationCode(e.target.value.toUpperCase())} 
                  placeholder="Örn: GT-ABC123" 
                />
                <Button onClick={searchByCode} disabled={searching || !reservationCode.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  {searching ? 'Aranıyor...' : 'Ara'}
                </Button>
              </div>
            </div>

            {guestBooking && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900">Rezervasyon Bulundu</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{guestBooking.status}</span>
                </div>
                <div className="text-sm text-gray-700">{guestBooking.pickupLocation.address}</div>
                <div className="text-sm text-gray-600">→ {guestBooking.dropoffLocation.address}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(guestBooking.pickupTime).toLocaleString('tr-TR')} • {guestBooking.vehicleType} • {guestBooking.passengerCount} kişi
                </div>
                <div className="text-xs text-gray-500 mt-1">Kod: {guestBooking.reservationCode || '-'}</div>
                <Link to={`/booking/${guestBooking.id}`} className="mt-3 inline-block">
                  <Button size="sm">Detayları Gör</Button>
                </Link>
              </div>
            )}

            <div className="mt-6 border-t pt-4">
              <p className="text-sm text-gray-600">Tüm rezervasyonlarınızı görmek için giriş yapın.</p>
              <div className="mt-3 flex gap-2">
                <Link to="/login"><Button variant="outline">Giriş Yap</Button></Link>
                <Link to="/reserve"><Button>Yeni Rezervasyon</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rezervasyonlar</h1>
            <p className="text-gray-600">Planlı yolculuklarınızı buradan yönetebilirsiniz.</p>
          </div>
          <Link to="/reserve">
            <Button>Yeni Rezervasyon</Button>
          </Link>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Yaklaşan</h2>
            {loading && <div className="text-sm text-gray-500">Yükleniyor...</div>}
            {!loading && upcoming.length === 0 && <div className="text-sm text-gray-500">Yaklaşan rezervasyon yok.</div>}
            <div className="space-y-3">
              {upcoming.map(b => <Card key={b.id} b={b} canCancel={b.status === 'pending' || b.status === 'accepted'} />)}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Geçmiş</h2>
            {!loading && past.length === 0 && <div className="text-sm text-gray-500">Geçmiş rezervasyon yok.</div>}
            <div className="space-y-3">
              {past.map(b => <Card key={b.id} b={b} canCancel={false} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
