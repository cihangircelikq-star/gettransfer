import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import OpenStreetMap from '@/components/OpenStreetMap'
import { useBookingStore } from '@/stores/bookingStore'
import { useAuthStore } from '@/stores/authStore'
import { CustomerLayout } from '@/components/CustomerLayout'
import { MapPin, Car, Clock, Navigation, Plus, X, Loader2, Phone, MessageCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { API } from '@/utils/api'
import { io as ioClient, type Socket } from 'socket.io-client'

interface Booking {
  id: string
  pickupLocation: { address: string; lat: number; lng: number }
  dropoffLocation: { address: string; lat: number; lng: number }
  status: string
  finalPrice?: number
  basePrice?: number
  createdAt: string
  driverId?: string
  driverName?: string
  driverPhone?: string
}

export const CustomerDashboard = () => {
  const navigate = useNavigate()
  const { 
    availableDrivers, 
    refreshApprovedDriversNear, 
    startRealTimeUpdates, 
    stopRealTimeUpdates,
    currentBooking,
    setCurrentBooking 
  } = useBookingStore()
  const { user } = useAuthStore()
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentAddress, setCurrentAddress] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  
  // Yeni transfer formu
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [pickup, setPickup] = useState('')
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoff, setDropoff] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dropoffRef = useRef<HTMLDivElement>(null)

  // Şoför canlı konumu
  const [driverLiveLocation, setDriverLiveLocation] = useState<{ lat: number; lng: number } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Aktif booking - önce global state'ten, yoksa API'den
  const activeBooking = currentBooking && ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(currentBooking.status) 
    ? currentBooking 
    : null

  // Socket.io ile şoför konumunu dinle
  useEffect(() => {
    if (!activeBooking?.id) {
      setDriverLiveLocation(null)
      if (socketRef.current) {
        try { socketRef.current.disconnect() } catch { /* ignore */ }
        socketRef.current = null
      }
      return
    }

    const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`
    const s = ioClient(origin, { transports: ['websocket'], reconnection: true })
    socketRef.current = s

    s.on('connect', () => {
      s.emit('booking:join', { bookingId: activeBooking.id })
    })

    // Şoför konum güncellemesi
    s.on('driver:location', (data: { bookingId: string; location: { lat: number; lng: number } }) => {
      if (data.bookingId === activeBooking.id && data.location) {
        setDriverLiveLocation(data.location)
      }
    })

    // Booking durumu güncellemesi
    s.on('booking:update', (updatedBooking: any) => {
      if (updatedBooking?.id === activeBooking.id) {
        setCurrentBooking(updatedBooking)
      }
    })

    return () => {
      try { s.emit('booking:leave', { bookingId: activeBooking.id }) } catch { /* ignore */ }
      s.disconnect()
      socketRef.current = null
    }
  }, [activeBooking?.id, setCurrentBooking])

  // POLLING - Booking durumunu düzenli kontrol et (Socket.io çalışmayabilir)
  useEffect(() => {
    if (!currentBooking?.id) return
    
    const pollBooking = async () => {
      try {
        const res = await fetch(`${API}/bookings/${currentBooking.id}`)
        const j = await res.json()
        if (j?.success && j?.data) {
          // Durum değişti mi kontrol et
          if (j.data.status !== currentBooking.status) {
            console.log('📊 Booking durumu güncellendi:', currentBooking.status, '→', j.data.status)
            setCurrentBooking(j.data)
            
            // Bildirim göster
            if (j.data.status === 'accepted' || j.data.status === 'driver_en_route') {
              toast.success('🚗 Şoför yola çıktı!')
            } else if (j.data.status === 'driver_arrived') {
              toast.success('✅ Şoför geldi!')
            } else if (j.data.status === 'in_progress') {
              toast.success('🛣️ Yolculuk başladı!')
            } else if (j.data.status === 'completed') {
              toast.success('🎉 Yolculuk tamamlandı!')
            }
          }
        }
      } catch { /* ignore */ }
    }
    
    // Her 2 saniyede bir kontrol et
    const interval = setInterval(pollBooking, 2000)
    
    // İlk başta hemen kontrol et
    pollBooking()
    
    return () => clearInterval(interval)
  }, [currentBooking?.id, currentBooking?.status, setCurrentBooking])

  // Otomatik konum al - GPS + Fallback
  useEffect(() => {
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

    const getAndSetAddress = async (loc: { lat: number; lng: number }) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&accept-language=tr`,
          { headers: { 'User-Agent': 'GetTransfer/1.0' } }
        )
        const data = await res.json()
        if (data.display_name && mounted) {
          setCurrentAddress(data.display_name)
          if (!pickup) {
            setPickup(data.display_name)
            setPickupLocation(loc)
          }
        }
      } catch { /* ignore */ }
    }

    const initLocation = async () => {
      // Önce GPS dene
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (!mounted) return
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            console.log('✅ GPS konumu alındı:', loc)
            setCurrentLocation(loc)
            refreshApprovedDriversNear(loc)
            startRealTimeUpdates()
            getAndSetAddress(loc)
          },
          async (err) => {
            console.warn('GPS hatası, IP konumu deneniyor:', err.message)
            if (!mounted) return
            
            // GPS başarısız - IP bazlı konum dene
            const ipLoc = await fetchIpLocation()
            if (ipLoc && mounted) {
              console.log('✅ IP konumu alındı:', ipLoc)
              setCurrentLocation(ipLoc)
              refreshApprovedDriversNear(ipLoc)
              startRealTimeUpdates()
              getAndSetAddress(ipLoc)
              toast.info('Yaklaşık konumunuz kullanılıyor')
            } else if (mounted) {
              // Hiçbir şekilde konum alınamadı - varsayılan (Antalya merkez)
              const defaultLoc = { lat: 36.88, lng: 30.7 }
              console.log('⚠️ Varsayılan konum kullanılıyor')
              setCurrentLocation(defaultLoc)
              refreshApprovedDriversNear(defaultLoc)
              startRealTimeUpdates()
              toast.warning('Konum alınamadı, haritadan seçim yapabilirsiniz')
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        )
      } else {
        // GPS yok - IP bazlı konum
        const ipLoc = await fetchIpLocation()
        if (ipLoc && mounted) {
          setCurrentLocation(ipLoc)
          refreshApprovedDriversNear(ipLoc)
          startRealTimeUpdates()
          getAndSetAddress(ipLoc)
        } else if (mounted) {
          const defaultLoc = { lat: 36.88, lng: 30.7 }
          setCurrentLocation(defaultLoc)
          refreshApprovedDriversNear(defaultLoc)
          startRealTimeUpdates()
        }
      }
    }

    initLocation()
    
    return () => { 
      mounted = false
      stopRealTimeUpdates() 
    }
  }, [])

  // Aktif booking'i backend'den de kontrol et
  useEffect(() => {
    const checkActiveBooking = async () => {
      if (user?.id) {
        try {
          const res = await fetch(`${API}/bookings/by-customer/${user.id}`)
          if (res.ok) {
            const j = await res.json()
            if (j.success && Array.isArray(j.data)) {
              setBookings(j.data)
              
              // Aktif booking var mı?
              const active = j.data.find((b: Booking) => 
                ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
              )
              
              if (active && !currentBooking) {
                setCurrentBooking(active)
              }
            }
          }
        } catch { /* ignore */ }
        finally { setIsLoadingBookings(false) }
      }
    }
    
    checkActiveBooking()
    
    // Aktif booking varsa 3 saniyede bir güncelle
    const interval = setInterval(checkActiveBooking, activeBooking ? 3000 : 15000)
    return () => clearInterval(interval)
  }, [user, activeBooking, currentBooking, setCurrentBooking])

  // Adres önerileri
  useEffect(() => {
    if (dropoff.length < 2) {
      setDropoffSuggestions([])
      return
    }
    
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(dropoff)}&accept-language=tr`,
          { headers: { 'User-Agent': 'GetTransfer/1.0' } }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          setDropoffSuggestions(data.map((item: { display_name: string; lat: string; lon: string }) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          })))
        }
      } catch { /* ignore */ }
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [dropoff])

  // Pickup önerileri
  useEffect(() => {
    if (pickup.length < 2 || pickup === currentAddress) {
      setPickupSuggestions([])
      return
    }
    
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(pickup)}&accept-language=tr`,
          { headers: { 'User-Agent': 'GetTransfer/1.0' } }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          setPickupSuggestions(data.map((item: { display_name: string; lat: string; lon: string }) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          })))
        }
      } catch { /* ignore */ }
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [pickup, currentAddress])

  // Dışarı tıklandığında
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropoffRef.current && !dropoffRef.current.contains(e.target as Node)) {
        setShowDropoffSuggestions(false)
        setShowPickupSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Yeni transfer oluştur
  const handleNewTrip = async () => {
    if (!pickupLocation) {
      toast.error('Alış noktası seçin')
      return
    }
    
    if (!dropoffLocation) {
      toast.error('Varış noktası seçin')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API}/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.id,
          pickupLocation: { address: pickup, lat: pickupLocation.lat, lng: pickupLocation.lng },
          dropoffLocation: { address: dropoff, lat: dropoffLocation.lat, lng: dropoffLocation.lng },
          vehicleType: 'sedan',
          passengerCount: 1,
          pickupTime: new Date().toISOString()
        })
      })
      
      const j = await res.json()
      if (j.success) {
        setCurrentBooking(j.data)
        toast.success('Transfer talebiniz oluşturuldu! Şoför bekleniyor...')
        setShowNewTrip(false)
        setDropoff('')
        setDropoffLocation(null)
      } else {
        toast.error(j.error || 'Talep oluşturulamadı')
      }
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Talebi iptal et
  const handleCancelBooking = async () => {
    if (!activeBooking) return
    
    try {
      const res = await fetch(`${API}/bookings/${activeBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.ok) {
        setCurrentBooking(null)
        setDriverLiveLocation(null)
        toast.success('Talep iptal edildi')
      }
    } catch {
      toast.error('İptal edilemedi')
    }
  }

  // Durum çevirisi
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Şoför aranıyor...'
      case 'accepted': return 'Şoför atandı'
      case 'driver_en_route': return 'Şoför yola çıktı!'
      case 'driver_arrived': return 'Şoför geldi!'
      case 'in_progress': return 'Yolculuk devam ediyor'
      case 'completed': return 'Tamamlandı'
      case 'cancelled': return 'İptal'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      case 'in_progress': return 'text-purple-400 bg-purple-500/20'
      case 'driver_en_route': return 'text-blue-400 bg-blue-500/20'
      case 'driver_arrived': return 'text-green-400 bg-green-500/20'
      case 'accepted': return 'text-blue-400 bg-blue-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  // Yakın sürücüler sayısı
  const nearbyDriversCount = availableDrivers.filter(d => d.isAvailable && d.currentLocation).length

  // Harita için rota modu belirleme
  const getRouteMode = (): 'to_pickup' | 'to_dropoff' | undefined => {
    if (!activeBooking) return undefined
    if (['driver_en_route', 'accepted'].includes(activeBooking.status)) return 'to_pickup'
    if (['in_progress'].includes(activeBooking.status)) return 'to_dropoff'
    return undefined
  }

  return (
    <CustomerLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row">
        {/* Sol Panel */}
        <div className="w-full lg:w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
          
          {/* AKTİF YOLCULUK - EN ÜSTTE VE BELİRGİN */}
          {activeBooking && (
            <div className={`p-4 border-b ${
              activeBooking.status === 'pending' ? 'bg-yellow-900/50 border-yellow-600' :
              activeBooking.status === 'driver_arrived' ? 'bg-green-900/50 border-green-500 animate-pulse' :
              'bg-blue-900/50 border-blue-600'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  {activeBooking.status === 'pending' ? 'Şoför Bekleniyor' : 
                   activeBooking.status === 'in_progress' ? 'Yolculukta' : 'Aktif Yolculuk'}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(activeBooking.status)}`}>
                  {getStatusText(activeBooking.status)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1 animate-pulse"></div>
                  <p className="text-white">{activeBooking.pickupLocation?.address || 'Alış noktası'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                  <p className="text-gray-300">{activeBooking.dropoffLocation?.address || 'Varış noktası'}</p>
                </div>
              </div>

              {/* Fiyat */}
              {activeBooking.finalPrice && (
                <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400 text-xs">Tahmini Ücret:</span>
                  <span className="text-white font-bold text-lg ml-2">₺{activeBooking.finalPrice.toFixed(0)}</span>
                </div>
              )}

              {/* Pending durumunda iptal butonu */}
              {activeBooking.status === 'pending' && (
                <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 text-xs mb-2">
                    ⏳ Şoför aranıyor... Bekleyin veya iptal edin.
                  </p>
                  <Button
                    onClick={handleCancelBooking}
                    variant="outline"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
                  >
                    Talebi İptal Et
                  </Button>
                </div>
              )}

              {/* Şoför bilgileri */}
              {activeBooking.driverName && activeBooking.status !== 'pending' && (
                <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activeBooking.driverName}</p>
                      {activeBooking.driverPhone && (
                        <a href={`tel:${activeBooking.driverPhone}`} className="text-blue-400 text-sm flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {activeBooking.driverPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Şoför yola çıktı */}
              {activeBooking.status === 'driver_en_route' && (
                <div className="mt-3 p-3 bg-blue-500/20 rounded-lg">
                  <p className="text-blue-300 text-sm font-medium">
                    🚗 Şoför size doğru geliyor!
                  </p>
                  {driverLiveLocation && (
                    <p className="text-blue-200 text-xs mt-1">
                      Konumu haritada görüyorsunuz
                    </p>
                  )}
                </div>
              )}
              
              {/* Şoför geldi */}
              {activeBooking.status === 'driver_arrived' && (
                <div className="mt-3 p-3 bg-green-500/30 rounded-lg">
                  <p className="text-green-300 text-sm font-bold">
                    ✅ Şoför sizi bekliyor! Araçta yeriniz hazır.
                  </p>
                </div>
              )}

              {/* Yolculuk devam ediyor */}
              {activeBooking.status === 'in_progress' && (
                <div className="mt-3 p-3 bg-purple-500/20 rounded-lg">
                  <p className="text-purple-300 text-sm">
                    🛣️ Yolculuk devam ediyor... Güvenli yolculuklar!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Yeni Transfer Butonu - Aktif talep yoksa göster */}
          {!activeBooking && (
            <div className="p-4 border-b border-gray-700">
              <Button
                onClick={() => setShowNewTrip(!showNewTrip)}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 text-lg font-bold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Transfer Talebi
              </Button>
            </div>
          )}

          {/* Yeni Transfer Formu */}
          {showNewTrip && !activeBooking && (
            <div className="p-4 bg-gray-700/50 border-b border-gray-600" ref={dropoffRef}>
              <h3 className="text-white font-semibold mb-3">Nereye gitmek istiyorsunuz?</h3>
              
              <div className="space-y-3">
                {/* Alış Noktası */}
                <div className="relative">
                  <label className="text-xs text-gray-400 mb-1 block">Alış Noktası</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400" />
                    <input
                      type="text"
                      value={pickup}
                      onChange={e => { setPickup(e.target.value); setShowPickupSuggestions(true) }}
                      onFocus={() => setShowPickupSuggestions(true)}
                      placeholder="Nereden alınacaksınız?"
                      className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {pickupSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-blue-600 truncate"
                          onClick={() => {
                            setPickup(s.label)
                            setPickupLocation({ lat: s.lat, lng: s.lng })
                            setShowPickupSuggestions(false)
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Varış Noktası */}
                <div className="relative">
                  <label className="text-xs text-gray-400 mb-1 block">Varış Noktası</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                    <input
                      type="text"
                      value={dropoff}
                      onChange={e => { setDropoff(e.target.value); setShowDropoffSuggestions(true) }}
                      onFocus={() => setShowDropoffSuggestions(true)}
                      placeholder="Nereye gitmek istiyorsunuz?"
                      className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {dropoffSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-blue-600 truncate"
                          onClick={() => {
                            setDropoff(s.label)
                            setDropoffLocation({ lat: s.lat, lng: s.lng })
                            setShowDropoffSuggestions(false)
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Seçili varış */}
                  {dropoffLocation && !showDropoffSuggestions && (
                    <div className="mt-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                      <Navigation className="h-3 w-3" />
                      <span className="truncate flex-1">{dropoff}</span>
                      <button onClick={() => { setDropoff(''); setDropoffLocation(null) }}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleNewTrip}
                    disabled={!pickupLocation || !dropoffLocation || isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Oluşturuluyor...</>
                    ) : (
                      'Şoför Bul'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewTrip(false)}
                    className="text-white border-gray-600"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Son Yolculuklar - Aktif talep yoksa */}
          {!activeBooking && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Son Yolculuklar
                </h3>
              </div>

              {isLoadingBookings ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Yükleniyor...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {bookings.filter(b => !['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)).slice(0, 10).map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{booking.pickupLocation?.address}</p>
                          <p className="text-gray-400 text-xs truncate">→ {booking.dropoffLocation?.address}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(booking.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </div>
                          <p className="text-white font-bold text-sm mt-1">
                            ₺{(booking.finalPrice || booking.basePrice || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Henüz yolculuk yok</p>
                      <p className="text-sm mt-1">Yeni transfer talebi oluşturun</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Yakın Sürücüler */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Yakındaki Sürücüler:</span>
              <span className="text-2xl font-bold text-green-400">{nearbyDriversCount}</span>
            </div>
          </div>
        </div>

        {/* Sağ Panel - Harita */}
        <div className="flex-1 relative min-h-[300px] lg:min-h-0">
          {currentLocation ? (
            <OpenStreetMap
              center={activeBooking?.pickupLocation || currentLocation}
              customerLocation={currentLocation}
              driverLocation={driverLiveLocation}
              drivers={availableDrivers
                .filter(d => d.isAvailable && d.currentLocation)
                .map(d => ({
                  id: d.id,
                  name: d.name,
                  location: d.currentLocation!,
                  rating: d.rating,
                  available: d.isAvailable
                }))}
              destination={activeBooking?.dropoffLocation}
              pickupLocation={activeBooking?.pickupLocation}
              dropoffLocation={activeBooking?.dropoffLocation}
              showRoute={getRouteMode()}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Konumunuz alınıyor...</p>
              </div>
            </div>
          )}

          {/* Harita Bilgisi */}
          <div className="absolute bottom-4 left-4 right-4 lg:left-4 lg:right-auto lg:w-80 bg-gray-900/90 text-white text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span>
              {activeBooking?.status === 'driver_en_route' && 'Şoförünüzün konumu haritada görünüyor'}
              {activeBooking?.status === 'in_progress' && 'Hedefe rota haritada görünüyor'}
              {activeBooking?.status === 'driver_arrived' && 'Şoför sizi bekliyor!'}
              {activeBooking?.status === 'pending' && 'Yakın şoförlere talep gönderildi'}
              {!activeBooking && 'Konumunuz ve yakın sürücüler haritada görünür'}
            </span>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}

export default CustomerDashboard
