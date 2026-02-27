import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import NavigationMap from '@/components/NavigationMap'
import { Button } from '@/components/ui/Button'
import { useBookingStore } from '@/stores/bookingStore'
import { Clock, Car, Phone, MapPin, Navigation, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { currencySymbol } from '@/utils/pricing'

const haversineMeters = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const { bookingId } = useParams()
  const { currentBooking, refreshBookingById, setCurrentBooking, updateBookingStatus } = useBookingStore()

  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [customerLocation, setCustomerLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [routePath, setRoutePath] = useState<Array<{ lat: number, lng: number }>>([])
  const [approachPath, setApproachPath] = useState<Array<{ lat: number, lng: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const lastStatusRef = useRef<string | null>(null)
  const nearEachOtherRef = useRef(false)
  const lastCustomerPushRef = useRef(0)

  const booking = useMemo(() => {
    if (!bookingId) return null
    if (!currentBooking) return null
    return currentBooking.id === bookingId ? currentBooking : null
  }, [currentBooking, bookingId])

  useEffect(() => {
    if (!bookingId) return
    refreshBookingById(bookingId).catch(() => {})
  }, [bookingId, refreshBookingById])

  useEffect(() => {
    const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`
    const s = io(origin, { transports: ['websocket'], reconnection: true })
    socketRef.current = s
    s.on('connect', () => {
      if (bookingId) s.emit('booking:join', { bookingId })
    })
    s.on('booking:update', (b: any) => {
      if (bookingId && b?.id === bookingId) setCurrentBooking(b)
    })
    s.on('booking:route', (ev: any) => {
      if (bookingId && ev?.id === bookingId && Array.isArray(ev?.driverPath)) setRoutePath(ev.driverPath)
    })
    s.on('driver:update', (d: any) => {
      if (!booking?.driverId) return
      if (d?.id !== booking.driverId) return
      if (d?.location) setDriverLocation(d.location)
    })
    return () => {
      try { if (bookingId) s.emit('booking:leave', { bookingId }) } catch {}
      s.disconnect()
      socketRef.current = null
    }
  }, [bookingId, booking?.driverId, setCurrentBooking])

  useEffect(() => {
    if (!booking) return
    if (Array.isArray(booking.route?.driverPath) && booking.route!.driverPath.length > 1) {
      setRoutePath(booking.route!.driverPath)
    }
  }, [booking?.route?.driverPath])

  useEffect(() => {
    const b = booking
    if (!b) return
    if (!driverLocation) return
    if (b.status === 'in_progress') return
    if (b.status === 'completed' || b.status === 'cancelled') return
    const target = customerLocation || b.pickupLocation
    const key = `${driverLocation.lat.toFixed(5)},${driverLocation.lng.toFixed(5)}|${target.lat.toFixed(5)},${target.lng.toFixed(5)}`
    let cancelled = false
    const run = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (!res.ok) throw new Error('osrm_failed')
        const rj = await res.json()
        const coords = Array.isArray(rj?.routes) && rj.routes[0]?.geometry?.coordinates ? rj.routes[0].geometry.coordinates : []
        const mapped = coords.map((c: any) => ({ lat: c[1], lng: c[0] }))
        if (cancelled) return
        setApproachPath(mapped.length > 1 ? mapped : [driverLocation, target])
      } catch {
        if (cancelled) return
        setApproachPath([driverLocation, target])
      }
    }
    run()
    return () => { cancelled = true }
  }, [booking?.id, booking?.status, driverLocation?.lat, driverLocation?.lng, customerLocation?.lat, customerLocation?.lng])

  useEffect(() => {
    if (!booking?.driverId) return
    if (driverLocation) return
    fetch(`/api/drivers/${booking.driverId}`).then(r => r.json()).then(j => {
      if (j?.success && j?.data?.location) setDriverLocation(j.data.location)
    }).catch(() => {})
  }, [booking?.driverId, driverLocation])

  useEffect(() => {
    if (!bookingId) return
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(p => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude }
      setCustomerLocation(next)
      const now = Date.now()
      if (now - lastCustomerPushRef.current < 1500) return
      lastCustomerPushRef.current = now
      fetch(`/api/bookings/${bookingId}/customer-location`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: next }) }).catch(() => {})
    }, () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }) as unknown as number
    return () => { try { navigator.geolocation.clearWatch(id) } catch {} }
  }, [bookingId])

  // Durum değişikliklerinde BÜYÜK bildirim göster
  useEffect(() => {
    if (!booking) return
    if (lastStatusRef.current === booking.status) return
    lastStatusRef.current = booking.status
    
    // Büyük bildirimler
    if (booking.status === 'accepted' || booking.status === 'driver_en_route') {
      toast.success('🚗 Sürücü yola çıktı! Size geliyor.', { duration: 5000 })
    }
    if (booking.status === 'driver_arrived') {
      toast.success('📍 Sürücü geldi! Hazır olun.', { duration: 5000 })
    }
    if (booking.status === 'in_progress') {
      toast.success('🚕 Yolculuk başladı! Hedefe doğru ilerleniyor.', { duration: 5000 })
    }
    if (booking.status === 'completed') {
      toast.success('✅ Yolculuk tamamlandı! İyi günler.', { duration: 5000 })
    }
    if (booking.status === 'cancelled') {
      toast.error('❌ Yolculuk iptal edildi.')
    }
  }, [booking?.status])

  useEffect(() => {
    if (!booking) return
    if (!driverLocation || !customerLocation) return
    const d = haversineMeters(driverLocation, customerLocation)
    if (d <= 50) {
      if (!nearEachOtherRef.current) {
        nearEachOtherRef.current = true
        toast.success('📍 Sürücü yanınıza geldi!')
      }
    } else {
      nearEachOtherRef.current = false
    }
  }, [driverLocation, customerLocation, booking?.id])

  // Durum etiketi ve rengi
  const getStatusInfo = (st: string) => {
    switch (st) {
      case 'pending': return { label: 'Sürücü Bekleniyor', color: 'bg-yellow-500', icon: Clock }
      case 'accepted': 
      case 'driver_en_route': return { label: 'Sürücü Yola Çıktı', color: 'bg-blue-500', icon: Car }
      case 'driver_arrived': return { label: 'Sürücü Geldi', color: 'bg-green-500 animate-pulse', icon: MapPin }
      case 'in_progress': return { label: 'Yolculuk Devam Ediyor', color: 'bg-purple-500', icon: Navigation }
      case 'completed': return { label: 'Tamamlandı', color: 'bg-green-600', icon: CheckCircle }
      case 'cancelled': return { label: 'İptal Edildi', color: 'bg-red-500', icon: AlertCircle }
      default: return { label: st, color: 'bg-gray-500', icon: Clock }
    }
  }

  const etaMinutes = useMemo(() => {
    if (!booking) return null
    if (!driverLocation) return null
    const target = booking.status === 'in_progress' ? booking.dropoffLocation : booking.pickupLocation
    const distKm = haversineMeters(driverLocation, target) / 1000
    return Math.max(1, Math.round((distKm / 35) * 60))
  }, [booking?.status, booking?.pickupLocation, booking?.dropoffLocation, driverLocation])

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Geçersiz yolculuk.</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-xl font-semibold">Yolculuk yükleniyor...</div>
          <div className="text-gray-500 text-sm mt-2">Rezervasyon bilgileri alınıyor</div>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(booking.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* ÜST DURUM BARI */}
      <div className={`${statusInfo.color} text-white p-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-8 w-8" />
            <div>
              <div className="text-2xl font-bold">{statusInfo.label}</div>
              {etaMinutes && booking.status !== 'completed' && (
                <div className="text-sm opacity-90">Tahmini: {etaMinutes} dakika</div>
              )}
            </div>
          </div>
          
          {/* Fiyat */}
          <div className="text-right">
            <div className="text-sm opacity-75">Toplam</div>
            <div className="text-2xl font-bold">
              {currencySymbol((booking as any)?.extras?.pricing?.currency || 'EUR')}
              {(booking.finalPrice || booking.basePrice || 0).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* HARİTA */}
      <div className="flex-1 relative">
        <NavigationMap
          mode="customer"
          origin={driverLocation}
          destination={booking.dropoffLocation}
          pickup={booking.pickupLocation}
          status={
            booking.status === 'driver_en_route' || booking.status === 'driver_arrived' ? 'navigating_to_pickup' :
            booking.status === 'in_progress' ? 'navigating_to_dropoff' :
            'waiting'
          }
          onRouteUpdate={(distance, duration) => {
            console.log('Customer route:', distance, 'm', duration, 's')
          }}
          className="h-full w-full"
        />
        
        {/* Konum Bilgisi Overlay */}
        {driverLocation && (
          <div className="absolute bottom-4 left-4 bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm z-10 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Sürücü konumu güncel</span>
          </div>
        )}
      </div>

      {/* ALT BİLGİ PANELİ */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="max-w-7xl mx-auto">
          {/* Rota Bilgisi */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div className="text-white truncate">{booking.pickupLocation?.address}</div>
            </div>
            <div className="text-gray-500">→</div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div className="text-white truncate">{booking.dropoffLocation?.address}</div>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-600 text-white hover:bg-gray-700"
              onClick={() => navigate('/customer/dashboard')}
            >
              Panele Dön
            </Button>
            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <Button
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                disabled={isLoading}
                onClick={async () => {
                  if (!confirm('Yolculuğu iptal etmek istiyor musunuz?')) return
                  setIsLoading(true)
                  try {
                    await updateBookingStatus(booking.id, 'cancelled')
                    navigate('/customer/dashboard')
                  } catch {
                    toast.error('İptal başarısız')
                  } finally {
                    setIsLoading(false)
                  }
                }}
              >
                İptal Et
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

