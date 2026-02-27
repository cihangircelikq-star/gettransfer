import React, { useEffect, useState, useRef } from 'react'
import { useDriverStore } from '@/stores/driverStore'
import { useAuthStore } from '@/stores/authStore'
import { useBookingStore } from '@/stores/bookingStore'
import OpenStreetMap from '@/components/OpenStreetMap'
import { Button } from '@/components/ui/Button'
import { DriverLayout } from '@/components/DriverLayout'
import { PaymentModal } from '@/components/PaymentModal'
import { io as ioClient, type Socket } from 'socket.io-client'
import { Phone, Navigation, CheckCircle, XCircle, Clock, Coffee, Settings, FileText, User, ChevronRight, Users, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { API } from '@/utils/api'

// Booking tipi
interface BookingData {
  id: string
  customerId?: string
  driverId?: string
  pickupLocation: { lat: number; lng: number; address: string }
  dropoffLocation: { lat: number; lng: number; address: string }
  status: 'pending' | 'accepted' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled'
  finalPrice?: number
  basePrice?: number
  customerName?: string
  customerPhone?: string
  paymentStatus?: 'unpaid' | 'paid'
  paymentMethod?: 'cash' | 'qr_turinvoice' | 'card'
}

export const DriverDashboard = () => {
  const { me, requests, register, refreshRequests, accept, updateLocation, setAvailable, refreshApproval, earnings, fetchEarnings, approved } = useDriverStore()
  const { user } = useAuthStore()
  const { confirmPickup, appendRoutePoint, stopRouteRecordingAndSave, updateBookingStatus, saveRouteProgress } = useBookingStore()
  const navigate = useNavigate()
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Ödeme Modal State'leri
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentBooking, setPaymentBooking] = useState<BookingData | null>(null)
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null) // Yeni tamamlanan booking

  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'manual' | 'none'>('none')

  type RideRequest = { id: string; pickup: { lat:number, lng:number, address:string }; dropoff: { lat:number, lng:number, address:string }; vehicleType: 'sedan'|'suv'|'van'|'luxury'; basePrice?: number }
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null)
  const [activeBooking, setActiveBooking] = useState<BookingData | null>(null)
  const [customerLiveLocation, setCustomerLiveLocation] = useState<{ lat: number, lng: number } | null>(null)
  const bookingSocketRef = useRef<Socket | null>(null)

  const calcMeters = (a?: { lat: number, lng: number } | null, b?: { lat: number, lng: number } | null) => {
    if (!a || !b) return null
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const la1 = a.lat * Math.PI / 180
    const la2 = b.lat * Math.PI / 180
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }
  const metersToPickup = activeBooking ? calcMeters(me?.location, activeBooking.pickupLocation) : null
  const metersToDropoff = activeBooking ? calcMeters(me?.location, activeBooking.dropoffLocation) : null

  useEffect(() => { if (me) refreshRequests() }, [me, refreshRequests])

  // Sync driver data - Giriş yaptığında otomatik ONLINE yap
  useEffect(() => {
    const sync = async () => {
      console.log('🔵 [DASHBOARD SYNC] Starting sync...')
      console.log('🔵 [DASHBOARD SYNC] user:', user ? { id: user.id, name: user.name, role: user.role } : 'NO USER')
      console.log('🔵 [DASHBOARD SYNC] me:', me ? { id: me.id, name: me.name } : 'NO ME')
      
      if (user && user.role === 'driver' && (!me || me.id !== user.id)) {
        console.log('🔵 [DASHBOARD SYNC] Fetching driver data for user.id:', user.id)
        try {
          const res = await fetch(`${API}/drivers/${user.id}`)
          const j = await res.json()
          console.log('🔵 [DASHBOARD SYNC] API response:', { 
            ok: res.ok, 
            success: j?.success, 
            data: j?.data ? {
              id: j.data.id,
              name: j.data.name,
              email: j.data.email,
              approved: j.data.approved,
              available: j.data.available
            } : 'NO DATA'
          })
          
          if (res.ok && j.success && j.data) {
            // Sürücü varsa, otomatik online yap
            const serverLoc = j.data.location
            const currentLoc = useDriverStore.getState().me?.location
            const finalLoc = (currentLoc && (currentLoc.lat !== 0 || currentLoc.lng !== 0)) ? currentLoc : serverLoc

            console.log('🔵 [DASHBOARD SYNC] Setting driver state:', {
              id: j.data.id,
              name: j.data.name || 'Sürücü',
              approved: j.data.approved,
              location: finalLoc
            })

            useDriverStore.setState({
              me: {
                id: j.data.id,
                name: j.data.name || 'Sürücü',
                vehicleType: j.data.vehicleType || 'sedan',
                location: finalLoc,
                available: true // Otomatik ONLINE
              },
              approved: j.data.approved // ÖNEMLİ: approved durumunu da set et!
            })

            // Sunucuda da online yap
            try {
              await fetch(`${API}/drivers/${j.data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available: true })
              })
            } catch { /* ignore */ }

            try { useDriverStore.getState().startRealtime() } catch { /* ignore */ }
          } else {
            console.log('🔵 [DASHBOARD SYNC] Driver not found, registering new...')
            await register({ id: user.id, name: user.name || 'Sürücü', vehicleType: 'sedan', location: { lat: 0, lng: 0 }, available: true })
          }
        } catch (e) {
          console.error('❌ [DASHBOARD SYNC] Error:', e)
          try { await register({ id: user.id, name: user.name || 'Sürücü', vehicleType: 'sedan', location: { lat: 0, lng: 0 }, available: true }) } catch { /* ignore */ }
        }
      }
    }
    sync()
  }, [me, user, register])

  useEffect(() => {
    const interval = setInterval(() => { if (me) refreshRequests() }, 3000) // 3 saniyede bir kontrol
    return () => clearInterval(interval)
  }, [me, refreshRequests])

  // Location tracking - GERÇEK GPS KONUMU + FALLBACK
  const lastLocRef = useRef<{lat:number, lng:number, time:number}|null>(null)

  useEffect(() => {
    if (!me?.id) return

    let watchIdLocal: number | null = null
    let mounted = true

    const fetchIpLocation = async (): Promise<{ lat: number; lng: number } | null> => {
      try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const data = await res.json()
          if (data.latitude && data.longitude) return { lat: data.latitude, lng: data.longitude }
        }
      } catch { /* ignore */ }
      try {
        const res = await fetch('https://ip-api.com/json/', { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const data = await res.json()
          if (data.lat && data.lon) return { lat: data.lat, lng: data.lon }
        }
      } catch { /* ignore */ }
      return null
    }

    const initLocation = async () => {
      // Önce veritabanındaki kayıtlı konumu kontrol et
      const savedLocation = me?.location
      if (savedLocation && savedLocation.lat !== 0 && savedLocation.lng !== 0) {
        console.log('📍 Kayıtlı konum kullanılıyor:', savedLocation)
        setLocationSource('manual')
        updateLocation(savedLocation)
      }

      // GPS dene
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => {
            if (!mounted) return
            console.log('✅ GPS konumu alındı:', p.coords.latitude, p.coords.longitude)
            setLocationSource('gps')
            const loc = { lat: p.coords.latitude, lng: p.coords.longitude }
            updateLocation(loc)
          },
          async (err) => {
            console.warn('GPS hatası:', err.message)
            if (!mounted) return

            // Kayıtlı konum var mı kontrol et
            if (savedLocation && savedLocation.lat !== 0 && savedLocation.lng !== 0) {
              setLocationSource('manual')
              toast.info('Kayıtlı konumunuz kullanılıyor')
              return
            }

            // IP bazlı konum dene
            const ipLoc = await fetchIpLocation()
            if (ipLoc && mounted) {
              setLocationSource('ip')
              updateLocation(ipLoc)
              toast.info('Yaklaşık konumunuz kullanılıyor')
            } else if (mounted) {
              setLocationSource('none')
              toast.error('Konum alınamadı! Tarayıcınıza konum izni verin.')
            }
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
        )

        // Sürekli konum takibi
        watchIdLocal = navigator.geolocation.watchPosition(
          (p) => {
            if (!mounted) return
            setLocationSource('gps')

            const newLat = p.coords.latitude
            const newLng = p.coords.longitude
            const now = Date.now()

            let shouldUpdate = false

            if (!lastLocRef.current) {
              shouldUpdate = true
            } else {
              const { lat: oldLat, lng: oldLng, time: oldTime } = lastLocRef.current
              const timeDiff = now - oldTime

              const R = 6371e3
              const φ1 = oldLat * Math.PI/180
              const φ2 = newLat * Math.PI/180
              const Δφ = (newLat-oldLat) * Math.PI/180
              const Δλ = (newLng-oldLng) * Math.PI/180
              const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const dist = R * c

              if (dist > 10 || timeDiff > 10000) {
                shouldUpdate = true
              }
            }

            if (shouldUpdate) {
              lastLocRef.current = { lat: newLat, lng: newLng, time: now }
              updateLocation({ lat: newLat, lng: newLng })
              appendRoutePoint({ lat: newLat, lng: newLng })

              if (activeBooking?.id) {
                sendDriverLocationToBooking(activeBooking.id, { lat: newLat, lng: newLng })
              }
            }
          },
          (err) => {
            console.warn('GPS watch hatası:', err.message)
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        ) as unknown as number
      } else {
        // GPS yok
        if (savedLocation && savedLocation.lat !== 0 && savedLocation.lng !== 0) {
          setLocationSource('manual')
        } else {
          const ipLoc = await fetchIpLocation()
          if (ipLoc && mounted) {
            setLocationSource('ip')
            updateLocation(ipLoc)
          } else if (mounted) {
            setLocationSource('none')
            toast.error('Konum alınamadı!')
          }
        }
      }
    }

    initLocation()

    return () => {
      mounted = false
      try {
        if (watchIdLocal) navigator.geolocation.clearWatch(watchIdLocal)
      } catch { /* ignore */ }
    }
  }, [me?.id, updateLocation, appendRoutePoint, activeBooking?.id])

  useEffect(() => { if (me) { refreshApproval(); fetchEarnings() } }, [me, refreshApproval, fetchEarnings])

  useEffect(() => {
    if (!activeBooking) return
    const iv = setInterval(() => {
      saveRouteProgress(activeBooking.id)
    }, 5000)
    return () => clearInterval(iv)
  }, [activeBooking, saveRouteProgress])

  // Şoför konumunu müşteriye gönder
  const sendDriverLocationToBooking = async (bookingId: string, location: { lat: number; lng: number }) => {
    try {
      const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`
      const socket = ioClient(origin, { transports: ['websocket'] })
      socket.emit('booking:join', { bookingId, role: 'driver' })
      socket.emit('driver:location', { bookingId, location })
      // Hemen disconnect etme, bir sonraki update'te tekrar kullanılacak
    } catch { /* ignore */ }
  }

  // Socket for customer location
  useEffect(() => {
    const b = activeBooking
    if (!b?.id) {
      setCustomerLiveLocation(null)
      if (bookingSocketRef.current) {
        try { bookingSocketRef.current.disconnect() } catch { /* ignore */ }
        bookingSocketRef.current = null
      }
      return
    }
    const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`
    const s = ioClient(origin, { transports: ['websocket'], reconnection: true })
    bookingSocketRef.current = s
    s.on('connect', () => {
      s.emit('booking:join', { bookingId: b.id, role: 'driver' })
    })
    s.on('customer:update', (ev: { bookingId?: string; location?: { lat: number; lng: number } }) => {
      if (ev?.bookingId !== b.id) return
      if (ev?.location && typeof ev.location.lat === 'number' && typeof ev.location.lng === 'number') {
        setCustomerLiveLocation(ev.location)
      }
    })
    s.on('booking:update', (next: { id?: string; status?: string }) => {
      if (next?.id !== b.id) return
      setActiveBooking(prev => prev ? { ...prev, ...next } as BookingData : null)
    })
    fetch(`${API}/bookings/${b.id}/customer-location`).then(r => r.json()).then(j => {
      if (j?.success && j?.data && typeof j.data.lat === 'number' && typeof j.data.lng === 'number') setCustomerLiveLocation(j.data)
    }).catch(() => { /* ignore */ })
    return () => {
      try { s.emit('booking:leave', { bookingId: b.id }) } catch { /* ignore */ }
      s.disconnect()
      bookingSocketRef.current = null
    }
  }, [activeBooking?.id])

  // Poll active booking
  useEffect(() => {
    if (!me) return
    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`${API}/bookings/by-driver/${me.id}`)
        const j = await res.json()
        if (res.ok && j.success && Array.isArray(j.data)) {
          const active = (j.data as BookingData[]).find(b =>
            ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
          ) || null

          if (active?.id !== activeBooking?.id || active?.status !== activeBooking?.status) {
             setActiveBooking(active || null)
          }
        }
      } catch { /* ignore */ }
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => clearInterval(iv)
  }, [me?.id, activeBooking?.id, activeBooking?.status])

  // Audio notifications
  const notificationAudio = useRef<HTMLAudioElement | null>(null)
  const prevRequestsLength = useRef(0)

  useEffect(() => {
    notificationAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
  }, [])

  useEffect(() => {
    if (requests.length > prevRequestsLength.current) {
      toast.success('🔔 Yeni yolculuk isteği!', { duration: 10000 })
      try {
        notificationAudio.current?.play().catch(() => { /* ignore */ })
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      } catch { /* ignore */ }
    }
    prevRequestsLength.current = requests.length

    if (!selectedRequest && requests.length > 0) {
      setSelectedRequest(requests[0])
    }
  }, [requests, selectedRequest])

  const hasValidLocation = me?.location && (me.location.lat !== 0 || me.location.lng !== 0)

  // Mola/Online toggle
  const toggleAvailability = async () => {
    if (!hasValidLocation) {
      toast.error('Konumunuz yüklenmeden müsait olamazsınız')
      return
    }
    const newStatus = !me?.available
    await setAvailable(newStatus)
    toast.success(newStatus ? 'Online oldunuz!' : 'Molaya geçtiniz')
  }

  // İstek kabul et - OTOMATİK yola çıktı yap
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await accept(requestId)
      toast.success('İstek kabul edildi! Müşteriye yönelin.')
      
      // Booking'i hemen çek ve durumu güncelle
      setTimeout(async () => {
        if (me) {
          const res = await fetch(`${API}/bookings/by-driver/${me.id}`)
          const j = await res.json()
          if (res.ok && j.success && Array.isArray(j.data)) {
            const active = j.data.find((b: BookingData) =>
              ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
            )
            if (active) {
              // Otomatik "yola çıktı" yap
              if (active.status === 'accepted') {
                await updateBookingStatus(active.id, 'driver_en_route')
                setActiveBooking({ ...active, status: 'driver_en_route' })
                toast.info('🚗 Yola çıktınız! Müşteriye gidin.')
              } else {
                setActiveBooking(active)
              }
            }
          }
        }
      }, 500)
    } catch {
      toast.error('İstek kabul edilemedi. Başka bir sürücü aldı olabilir.')
    }
  }

  // Müşteriyi aldım - Yolculuk başladı
  const handlePickup = async () => {
    if (!activeBooking) return
    await confirmPickup(activeBooking.id)
    setActiveBooking({ ...activeBooking, status: 'in_progress' })
    toast.success('🚕 Yolculuk başladı! Rotayı takip edin.')
  }

  // Yolculuk tamamlandı - Ödeme modalını aç
  const handleComplete = async () => {
    if (!activeBooking) return
    
    // Rotayı kaydet ve durumu güncelle
    try { await stopRouteRecordingAndSave(activeBooking.id) } catch { /* ignore */ }
    await updateBookingStatus(activeBooking.id, 'completed')
    
    // Ödeme modalını aç
    setPaymentBooking(activeBooking)
    setShowPaymentModal(true)
  }

  // Ödeme tamamlandıktan sonra
  const handlePaymentComplete = () => {
    setShowPaymentModal(false)
    setPaymentBooking(null)
    setActiveBooking(null)
    setAvailable(true)
    toast.success('✅ Yolculuk tamamlandı! 🎉')
    
    // Kazançları güncelle
    if (me) {
      fetchEarnings()
    }
  }

  // Rota modu belirleme
  const getRouteMode = (): 'to_pickup' | 'to_dropoff' | undefined => {
    if (!activeBooking) return undefined
    if (['accepted', 'driver_en_route'].includes(activeBooking.status)) return 'to_pickup'
    if (activeBooking.status === 'in_progress') return 'to_dropoff'
    return undefined
  }

  return (
    <DriverLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row">
        {/* Sol Panel - Sürücü Kontrolleri */}
        <div className="w-full lg:w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          
          {/* Online/Mola Toggle */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={toggleAvailability}
              disabled={!hasValidLocation}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                me?.available
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              } ${!hasValidLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {me?.available ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  ONLINE - Çağrı Alıyor
                </>
              ) : (
                <>
                  <Coffee className="h-5 w-5" />
                  MOLADA
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {locationSource === 'gps' && '📍 GPS konum aktif'}
              {locationSource === 'ip' && '🌐 IP bazlı konum'}
              {locationSource === 'manual' && '👆 Manuel konum'}
              {locationSource === 'none' && '⏳ Konum bekleniyor...'}
            </p>
          </div>

          {/* Aktif Yolculuk */}
          {activeBooking && (
            <div className="p-4 bg-blue-900/50 border-b border-blue-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-400" />
                Aktif Yolculuk
              </h3>
              
              {/* Durum göstergesi - BASİTLEŞTİRİLMİŞ */}
              <div className={`mb-3 p-3 rounded-lg text-center font-medium ${
                activeBooking.status === 'driver_en_route' ? 'bg-yellow-500/30 text-yellow-300' :
                activeBooking.status === 'driver_arrived' ? 'bg-green-500/30 text-green-300 animate-pulse' :
                activeBooking.status === 'in_progress' ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-500/30 text-gray-300'
              }`}>
                {activeBooking.status === 'driver_en_route' && (
                  <div>
                    <span className="text-2xl">🚗</span>
                    <p className="mt-1">Müşteriye Gidiliyor</p>
                    <p className="text-xs mt-1 opacity-75">Müşteriyi alınca butona basın</p>
                  </div>
                )}
                {activeBooking.status === 'driver_arrived' && (
                  <div>
                    <span className="text-2xl">📍</span>
                    <p className="mt-1">Müşteri Bekleniyor</p>
                    <p className="text-xs mt-1 opacity-75">Müşteriyi alınca butona basın</p>
                  </div>
                )}
                {activeBooking.status === 'in_progress' && (
                  <div>
                    <span className="text-2xl">🛣️</span>
                    <p className="mt-1">Yolculuk Devam Ediyor</p>
                    <p className="text-xs mt-1 opacity-75">Hedefe ulaşınca butona basın</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-gray-400 text-xs">Alış</p>
                    <p className="text-white font-medium">{activeBooking.pickupLocation?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-gray-400 text-xs">Varış</p>
                    <p className="text-white font-medium">{activeBooking.dropoffLocation?.address}</p>
                  </div>
                </div>

                {/* Mesafe Bilgisi */}
                <div className="text-xs text-gray-400 mt-2 flex gap-2">
                  {typeof metersToPickup === 'number' && !['in_progress', 'completed'].includes(activeBooking.status) && (
                    <span className="bg-gray-800 px-2 py-1 rounded">📍 Alış: {Math.round(metersToPickup)} m</span>
                  )}
                  {typeof metersToDropoff === 'number' && activeBooking.status === 'in_progress' && (
                    <span className="bg-gray-800 px-2 py-1 rounded">🎯 Varış: {Math.round(metersToDropoff)} m</span>
                  )}
                </div>

                {/* Fiyat */}
                {activeBooking.finalPrice && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Tahmini Kazanç:</span>
                    <span className="text-green-400 font-bold">₺{activeBooking.finalPrice.toFixed(0)}</span>
                  </div>
                )}

                {/* BASİTLEŞTİRİLMİŞ Durum Butonları - SADECE 2 BUTON */}
                <div className="mt-3 space-y-2">
                  {/* Müşteriye giderken veya müşteri geldiğinde - TEK BUTON */}
                  {['driver_en_route', 'driver_arrived'].includes(activeBooking.status) && (
                    <Button
                      size="lg"
                      onClick={handlePickup}
                      className="w-full bg-purple-600 hover:bg-purple-700 py-4 text-lg"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Müşteriyi Aldım
                    </Button>
                  )}
                  
                  {activeBooking.status === 'in_progress' && (
                    <Button
                      size="lg"
                      onClick={handleComplete}
                      className="w-full bg-green-600 hover:bg-green-700 py-4 text-lg"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Yolculuk Tamamlandı
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gelen İstekler - Aktif yolculuk yoksa göster */}
          {!activeBooking && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Gelen İstekler
                  {requests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                      {requests.length}
                    </span>
                  )}
                </h3>
              </div>

              <div className="divide-y divide-gray-700">
                {approved === true && requests.map(r => (
                  <div
                    key={r.id}
                    className={`p-4 cursor-pointer transition-all ${selectedRequest?.id === r.id ? 'bg-blue-900/50 border-l-4 border-blue-500' : 'hover:bg-gray-700/50'}`}
                    onClick={() => setSelectedRequest(r)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{r.pickup.address}</p>
                        <p className="text-gray-400 text-sm truncate">→ {r.dropoff.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-500 text-xs">🚗 {r.vehicleType}</span>
                          {r.basePrice && (
                            <span className="text-green-400 text-xs font-medium">₺{r.basePrice.toFixed(0)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hızlı Kabul Butonları */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleAcceptRequest(r.id) }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Kabul Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(null) }}
                        className="text-white border-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {approved === true && requests.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Bekleyen istek yok</p>
                    <p className="text-sm mt-1">Online olduğunuzda istekler burada görünecek</p>
                  </div>
                )}

                {approved === false && (
                  <div className="p-8 text-center text-yellow-500">
                    <Clock className="h-12 w-12 mx-auto mb-3" />
                    <p>Başvurunuz onay bekliyor</p>
                    <p className="text-sm mt-1 text-gray-400">Yönetici onay verdikten sonra çağrı alabilirsiniz</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Günlük Kazanç */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Bugün:</span>
              <span className="text-2xl font-bold text-green-400">₺{earnings?.daily || 0}</span>
            </div>
            
            {/* Ayarlar Menüsü */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Ayarlar</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${showSettingsMenu ? 'rotate-90' : ''}`} />
              </button>
              
              {showSettingsMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 rounded-lg border border-gray-600 shadow-xl overflow-hidden z-10">
                  <button
                    onClick={() => { navigate('/driver/documents'); setShowSettingsMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span>Belgelerim</span>
                  </button>
                  <button
                    onClick={() => { navigate('/driver/profile'); setShowSettingsMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    <User className="h-4 w-4 text-green-400" />
                    <span>Profilim</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Panel - Harita */}
        <div className="flex-1 relative">
          <OpenStreetMap
            center={me?.location || { lat: 36.88, lng: 30.7 }}
            driverLocation={me?.location}
            pickupLocation={activeBooking?.pickupLocation}
            dropoffLocation={activeBooking?.dropoffLocation}
            showRoute={activeBooking ? (activeBooking.status === 'in_progress' ? 'to_dropoff' : 'to_pickup') : false}
            className="h-full w-full"
          />
          
          {/* Konum bilgisi */}
          {me?.location && (
            <div className="absolute bottom-4 left-4 bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm z-10">
              📍 {me.location.lat.toFixed(4)}, {me.location.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Ödeme Modalı */}
      {showPaymentModal && paymentBooking && me && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setPaymentBooking(null)
            setActiveBooking(null)
            setAvailable(true)
          }}
          bookingId={paymentBooking.id}
          driverId={me.id}
          amount={paymentBooking.finalPrice || paymentBooking.basePrice || 0}
          customerName={paymentBooking.customerName}
          customerPhone={paymentBooking.customerPhone}
          onComplete={handlePaymentComplete}
        />
      )}
    </DriverLayout>
  )
}

export default DriverDashboard
