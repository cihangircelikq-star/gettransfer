import React, { useEffect, useMemo, useRef, useState } from 'react'
import OpenStreetMap from '@/components/OpenStreetMap'
import { io as ioClient, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/AdminLayout'
import { 
  MapPin, Car, Phone, Mail, 
  FileText, Clock, DollarSign, CheckCircle, XCircle, 
  RefreshCw, Trash2, ChevronRight, ChevronLeft, Loader2, Wifi,
  WifiOff, Navigation, AlertTriangle, X,
  Target, Route, Lock
} from 'lucide-react'

const currencySymbol = (c: string) => (String(c).toUpperCase() === 'TRY' ? '₺' : '€')

type DriverStatus = 'approved' | 'pending' | 'rejected'

interface DriverDoc {
  name: string
  url?: string
  uploadedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
}

interface ActiveBooking {
  id: string
  status: string
  pickupLocation?: { address: string; lat: number; lng: number }
  dropoffLocation?: { address: string; lat: number; lng: number }
  pickupTime?: string
  finalPrice?: number
  basePrice?: number
  reservationCode?: string
  customerName?: string
  customerPhone?: string
  vehicleType?: string
  passengerCount?: number
}

interface Driver {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  vehicleType: string
  vehicleModel?: string
  licensePlate?: string
  location?: { lat: number; lng: number }
  available?: boolean
  rating?: number
  docs?: DriverDoc[]
  rejectReason?: string
  createdAt?: string
  approved?: boolean
  activeBooking?: ActiveBooking
  hasActiveJob?: boolean
  hasValidLocation?: boolean
  // Şifre bilgileri (Admin için)
  passwordHash?: string
  passwordSalt?: string
  password?: string
  // Ekstra bilgiler
  updatedAt?: string
}

interface RecentBooking {
  id: string
  status: string
  pickupLocation?: { address: string; lat: number; lng: number }
  dropoffLocation?: { address: string; lat: number; lng: number }
  pickupTime?: string
  completedAt?: string
  finalPrice?: number
  reservationCode?: string
}

export const AdminDrivers: React.FC = () => {
  const [approved, setApproved] = useState<Driver[]>([])
  const [pending, setPending] = useState<Driver[]>([])
  const [rejected, setRejected] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<DriverStatus>('approved')
  
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [driverDetail, setDriverDetail] = useState<{
    driver: Driver
    activeBooking: ActiveBooking | null
    recentBookings: RecentBooking[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [rejectReason] = useState('Eksik belge')
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  const onlineCount = useMemo(() => approved.filter(d => d.available).length, [approved])
  const driversWithLocation = useMemo(() => approved.filter(d => d.location && d.location.lat !== 0 && d.location.lng !== 0), [approved])
  const driversWithActiveJob = useMemo(() => approved.filter(d => d.hasActiveJob), [approved])

  // Sürücü listesini yenile
  const refresh = async () => {
    setIsLoading(true)
    console.log('🔄 Refreshing driver lists...')
    
    try {
      // Pending sürücüler
      const pendingRes = await fetch('/api/drivers/pending')
      const pendingData = await pendingRes.json()
      if (!pendingRes.ok || !pendingData?.success) {
        console.error('Pending fetch error:', pendingData)
      }
      setPending(pendingData?.data || [])
      console.log('✅ Pending drivers:', pendingData?.data?.length || 0)
      
      // Onaylı sürücüler (aktif booking'ler ile)
      const approvedRes = await fetch('/api/drivers/with-active-bookings')
      const approvedData = await approvedRes.json()
      if (!approvedRes.ok || !approvedData?.success) {
        console.error('Approved fetch error:', approvedData)
      }
      setApproved(approvedData?.data || [])
      console.log('✅ Approved drivers:', approvedData?.data?.length || 0)
      
      // Reddedilen sürücüler
      const rejectedRes = await fetch('/api/drivers/list?status=rejected')
      const rejectedData = await rejectedRes.json()
      if (!rejectedRes.ok || !rejectedData?.success) {
        console.error('Rejected fetch error:', rejectedData)
      }
      setRejected(rejectedData?.data || [])
      console.log('✅ Rejected drivers:', rejectedData?.data?.length || 0)
      
    } catch (e) {
      console.error('❌ Refresh error:', e)
      toast.error('Veri yüklenemedi - sayfayı yenileyin')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // Sürücü detayını getir
  const fetchDriverDetail = async (driverId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/drivers/detail/${driverId}`)
      const data = await res.json()
      if (data?.success) {
        setDriverDetail(data.data)
      }
    } catch (e) {
      console.error('Driver detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  // Sürücü seçildiğinde
  useEffect(() => {
    if (selectedDriver) {
      setDetailPanelOpen(true)
      fetchDriverDetail(selectedDriver.id)
    } else {
      setDriverDetail(null)
      setDetailPanelOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriver?.id])

  // Socket.IO bağlantısı - SADECE BİR KEZ başlatılmalı
  const socketRef = useRef<Socket | null>(null)
  const socketInitialized = useRef(false)
  const approvingRef = useRef<string | null>(null) // Hangi driver onaylanıyor

  useEffect(() => {
    // Strict Mode'da çift çalışmayı önle
    if (socketInitialized.current) return
    socketInitialized.current = true
    
    const isDev = import.meta.env.DEV
    const origin = isDev 
      ? `http://${window.location.hostname}:3005`
      : window.location.origin
    
    console.log('🔌 Socket connecting to:', origin)
    
    const s = ioClient(origin, { 
      transports: ['websocket', 'polling'], 
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000
    })
    socketRef.current = s
    
    s.on('connect', () => console.log('✅ Socket connected'))
    s.on('disconnect', () => console.log('⚠️ Socket disconnected'))
    s.on('connect_error', (e) => console.log('❌ Socket error:', e.message))
    
    // Yeni sürücü başvurusu - TEK SEFER eklenmeli
    s.on('driver:applied', (d: Driver) => {
      if (d && d.id) {
        console.log('📢 New driver application:', d.name)
        setPending(prev => {
          // Zaten varsa ekleme
          if (prev.some(p => p.id === d.id)) return prev
          return [d, ...prev]
        })
        toast.info(`Yeni sürücü başvurusu: ${d.name}`)
      }
    })
    
    // Sürücü güncelleme
    s.on('driver:update', (d: never) => {
      if (!d || typeof d !== 'object' || !('id' in d)) return
      const driverData = d as Driver
      setApproved(prev => prev.map(x => x.id === driverData.id ? { ...x, ...driverData } : x))
    })
    
    // Booking güncelleme
    s.on('booking:update', (b: never) => {
      if (!b || typeof b !== 'object') return
      const bookingData = b as ActiveBooking & { driverId?: string }
      if (bookingData.driverId) {
        setApproved(prev => prev.map(d => 
          d.id === bookingData.driverId 
            ? { ...d, activeBooking: bookingData, hasActiveJob: true }
            : d
        ))
      }
    })
    
    return () => {
      console.log('🔌 Socket disconnecting')
      s.disconnect()
      socketRef.current = null
      socketInitialized.current = false
    }
  }, []) // BOŞ dependency array - sadece bir kez çalışmalı

  const handleApprove = async (driverId: string) => {
    // Çift tıklama koruması
    if (approvingRef.current === driverId) {
      console.log('⚠️ Already approving this driver:', driverId)
      return
    }
    approvingRef.current = driverId
    
    console.log('🔵 [APPROVE] Starting approval for:', driverId)
    
    try {
      const res = await fetch('/api/drivers/approve', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: driverId }) 
      })
      const j = await res.json().catch(() => null)
      
      console.log('🔵 [APPROVE] Response:', { ok: res.ok, success: j?.success, data: j?.data })
      
      if (!res.ok || !j?.success) {
        const errorMsg = j?.error || j?.details || 'approve_failed'
        console.error('❌ [APPROVE] Failed:', errorMsg)
        throw new Error(errorMsg)
      }
      
      toast.success('Sürücü onaylandı!')
      setSelectedDriver(null)
      
      // Pending'den kaldır
      setPending(prev => prev.filter(d => d.id !== driverId))
      
      // Approved'a ekle (eğer backend'den driver data geldiyse)
      if (j?.data) {
        setApproved(prev => {
          const exists = prev.some(d => d.id === driverId)
          if (exists) return prev
          return [j.data, ...prev]
        })
      }
      
      setView('approved')
      console.log('✅ [APPROVE] Success:', driverId)
      
    } catch (e: any) {
      console.error('❌ [APPROVE] Error:', e)
      toast.error(`Onaylama başarısız: ${e?.message || 'Bilinmeyen hata'}`)
    } finally {
      approvingRef.current = null
    }
  }

  const handleReject = async (driverId: string, reason: string) => {
    try {
      const res = await fetch('/api/drivers/reject', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: driverId, reason }) 
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.error || 'reject_failed')
      toast.success('Sürücü reddedildi')
      setSelectedDriver(null)
      
      // Pending'den kaldır
      setPending(prev => prev.filter(d => d.id !== driverId))
      
      // Rejected'a ekle
      if (j?.data) {
        setRejected(prev => {
          const exists = prev.some(d => d.id === driverId)
          if (exists) return prev
          return [j.data, ...prev]
        })
      }
      
      setView('rejected')
    } catch {
      toast.error('Reddetme başarısız')
    }
  }

  const handleDelete = async (driverId: string) => {
    if (!confirm('Bu sürücüyü silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch('/api/drivers/delete', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: driverId }) 
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) throw new Error(j?.error || 'delete_failed')
      toast.success('Sürücü silindi')
      setSelectedDriver(null)
      refresh()
    } catch {
      toast.error('Silme başarısız')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Onaylı</span>
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Bekliyor</span>
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Reddedildi</span>
      default:
        return null
    }
  }

  const getDocLabel = (name: string) => {
    const labels: Record<string, string> = {
      'license': 'Sürücü Belgesi',
      'vehicle_registration': 'Araç Ruhsatı',
      'insurance': 'Sigorta Belgesi',
      'profile_photo': 'Profil Fotoğrafı'
    }
    return labels[name] || name
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Yolda'
      case 'driver_en_route': return 'Yola Çıktı'
      case 'driver_arrived': return 'Geldi'
      case 'accepted': return 'Kabul Edildi'
      case 'pending': return 'Bekliyor'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-purple-400 bg-purple-500/20'
      case 'driver_en_route': return 'text-blue-400 bg-blue-500/20'
      case 'driver_arrived': return 'text-cyan-400 bg-cyan-500/20'
      case 'accepted': return 'text-green-400 bg-green-500/20'
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  // Harita için driver listesi
  const mapDrivers = useMemo(() => {
    return approved
      .filter(d => d.location && d.location.lat !== 0 && d.location.lng !== 0)
      .map(d => ({
        id: d.id,
        name: d.name,
        location: d.location!,
        rating: d.rating || 0,
        available: !!d.available,
        hasActiveJob: d.hasActiveJob
      }))
  }, [approved])

  // Harita merkezi
  const mapCenter = useMemo(() => {
    if (selectedDriver?.location && selectedDriver.location.lat !== 0 && selectedDriver.location.lng !== 0) {
      return selectedDriver.location
    }
    if (driversWithLocation.length > 0) {
      return driversWithLocation[0].location!
    }
    return { lat: 41.0082, lng: 28.9784 } // İstanbul
  }, [selectedDriver, driversWithLocation])

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Sol Sidebar - Sürücü Listesi */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-gray-900 border-r border-gray-700 flex flex-col transition-all duration-300 relative z-20`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-lg font-bold text-white">Sürücüler</h2>
                  <p className="text-xs text-gray-400">{approved.length} toplam, {onlineCount} online</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronLeft className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* İstatistikler */}
              <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                  <p className="text-xl font-bold text-emerald-400">{onlineCount}</p>
                  <p className="text-xs text-gray-400">Online</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                  <p className="text-xl font-bold text-blue-400">{driversWithLocation.length}</p>
                  <p className="text-xs text-gray-400">Konumlu</p>
                </div>
              </div>

              {/* Tab Butonları */}
              <div className="flex gap-1 p-2 border-b border-gray-700">
                <button
                  onClick={() => { setView('approved'); setSelectedDriver(null) }}
                  className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                    view === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Aktif ({approved.length})
                </button>
                <button
                  onClick={() => { setView('pending'); setSelectedDriver(null) }}
                  className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                    view === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Bekleyen ({pending.length})
                </button>
                <button
                  onClick={() => { setView('rejected'); setSelectedDriver(null) }}
                  className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                    view === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Red ({rejected.length})
                </button>
              </div>

              {/* Sürücü Listesi */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                  </div>
                ) : view === 'approved' ? (
                  approved.map(d => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDriver(d)}
                      className={`p-3 border-b border-gray-800 cursor-pointer transition-colors ${
                        selectedDriver?.id === d.id ? 'bg-blue-500/20 border-l-4 border-l-blue-500' : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          d.available ? 'bg-emerald-500/20' : 'bg-gray-700'
                        }`}>
                          {d.available ? (
                            <Wifi className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white truncate text-sm">{d.name}</p>
                            {d.hasActiveJob && (
                              <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">İŞ</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Car className="h-3 w-3" />
                            <span>{d.vehicleType}</span>
                            {d.licensePlate && <span className="text-gray-500">• {d.licensePlate}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {d.location && d.location.lat !== 0 && d.location.lng !== 0 ? (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Konum aktif
                              </span>
                            ) : (
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Konum yok
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : view === 'pending' ? (
                  pending.map(d => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDriver(d)}
                      className={`p-3 border-b border-gray-800 cursor-pointer transition-colors ${
                        selectedDriver?.id === d.id ? 'bg-yellow-500/20 border-l-4 border-l-yellow-500' : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.email}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(d.id) }}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReject(d.id, rejectReason) }}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  rejected.map(d => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDriver(d)}
                      className={`p-3 border-b border-gray-800 cursor-pointer transition-colors ${
                        selectedDriver?.id === d.id ? 'bg-red-500/20 border-l-4 border-l-red-500' : 'hover:bg-gray-800'
                      }`}
                    >
                      <p className="font-medium text-white text-sm">{d.name}</p>
                      <p className="text-xs text-red-400">{d.rejectReason || 'Reddedildi'}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Yenile Butonu */}
              <div className="p-3 border-t border-gray-700">
                <button
                  onClick={refresh}
                  disabled={isLoading}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>
            </>
          )}
        </div>

        {/* Harita Alanı */}
        <div className="flex-1 relative">
          <OpenStreetMap
            center={mapCenter}
            drivers={mapDrivers}
            onDriverClick={(d) => {
              const driver = approved.find(x => x.id === d.id)
              if (driver) setSelectedDriver(driver)
            }}
            highlightDriverId={selectedDriver?.id}
            className="h-full w-full"
          />

          {/* Harita Üst Bilgi */}
          <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 z-10">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-300">Online ({onlineCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-300">Meşgul ({driversWithActiveJob.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-300">Offline ({approved.length - onlineCount})</span>
              </div>
            </div>
          </div>

          {/* Konum Olmayan Sürücüler Uyarısı */}
          {approved.length > 0 && driversWithLocation.length === 0 && (
            <div className="absolute top-4 right-4 bg-yellow-900/90 backdrop-blur rounded-lg p-4 z-10 max-w-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-yellow-300 font-medium text-sm">Konum Verisi Yok</p>
                  <p className="text-yellow-200 text-xs mt-1">
                    Hiçbir sürücünün konumu mevcut değil. Sürücülerin uygulamadan konum izni verip GPS göndermesi gerekiyor.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Detay Paneli */}
        {detailPanelOpen && selectedDriver && (
          <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col absolute right-0 top-0 bottom-0 z-20 animate-slide-in">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Sürücü Detayı</h3>
                <button
                  onClick={() => { setSelectedDriver(null); setDetailPanelOpen(false) }}
                  className="p-2 hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : driverDetail ? (
              <div className="flex-1 overflow-y-auto">
                {/* Sürücü Bilgileri */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      driverDetail.driver.available ? 'bg-emerald-500/20' : 'bg-gray-700'
                    }`}>
                      {driverDetail.driver.available ? (
                        <Wifi className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <WifiOff className="h-7 w-7 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{driverDetail.driver.name}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(view)}
                        {driverDetail.driver.available && (
                          <span className="text-xs text-emerald-400">Online</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {driverDetail.driver.email && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span>{driverDetail.driver.email}</span>
                      </div>
                    )}
                    {driverDetail.driver.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="h-4 w-4" />
                        <span>{driverDetail.driver.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <Car className="h-4 w-4" />
                      <span>{driverDetail.driver.vehicleType} {driverDetail.driver.vehicleModel && `- ${driverDetail.driver.vehicleModel}`}</span>
                    </div>
                    {driverDetail.driver.licensePlate && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <FileText className="h-4 w-4" />
                        <span className="text-white font-medium">{driverDetail.driver.licensePlate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Şifre ve Güvenlik Bilgileri */}
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                  <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-400" />
                    Şifre & Güvenlik
                  </h5>
                  
                  <div className="space-y-3">
                    {/* Şifre */}
                    {driverDetail.driver.password && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Şifre (Düz Metin)</p>
                        <p className="text-sm text-white font-mono break-all">{driverDetail.driver.password}</p>
                      </div>
                    )}
                    
                    {/* Password Hash */}
                    {driverDetail.driver.passwordHash && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Password Hash</p>
                        <p className="text-xs text-green-400 font-mono break-all" style={{ wordBreak: 'break-all' }}>
                          {driverDetail.driver.passwordHash}
                        </p>
                      </div>
                    )}
                    
                    {/* Password Salt */}
                    {driverDetail.driver.passwordSalt && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Password Salt</p>
                        <p className="text-xs text-blue-400 font-mono break-all" style={{ wordBreak: 'break-all' }}>
                          {driverDetail.driver.passwordSalt}
                        </p>
                      </div>
                    )}
                    
                    {/* Şifre bilgisi yoksa */}
                    {!driverDetail.driver.password && !driverDetail.driver.passwordHash && (
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                        <p className="text-xs text-yellow-300">
                          Şifre bilgisi mevcut değil (eski kayıt veya sosyal giriş)
                        </p>
                      </div>
                    )}
                    
                    {/* Kayıt Tarihi */}
                    {driverDetail.driver.createdAt && (
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="font-medium">Kayıt Tarihi:</span>{' '}
                        {new Date(driverDetail.driver.createdAt).toLocaleString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Konum Bilgisi */}
                <div className="p-4 border-b border-gray-700">
                  <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Konum Bilgisi
                  </h5>
                  
                  {driverDetail.driver.hasValidLocation ? (
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">Konum Aktif</span>
                      </div>
                      <p className="text-xs text-green-300">
                        📍 {driverDetail.driver.location?.lat.toFixed(6)}, {driverDetail.driver.location?.lng.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Son güncelleme: {driverDetail.driver.location ? 'Veritabanında kayıtlı' : 'Bilinmiyor'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Konum Mevcut Değil</span>
                      </div>
                      <p className="text-xs text-red-300">
                        Sürücü henüz GPS konumu göndermemiş.
                      </p>
                    </div>
                  )}
                </div>

                {/* Aktif İş */}
                {driverDetail.activeBooking && (
                  <div className="p-4 border-b border-gray-700">
                    <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Aktif Yolculuk
                    </h5>
                    
                    <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400">#{driverDetail.activeBooking.reservationCode}</span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(driverDetail.activeBooking.status)}`}>
                          {getStatusText(driverDetail.activeBooking.status)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-gray-300 text-xs">{driverDetail.activeBooking.pickupLocation?.address || 'Alış Noktası'}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-gray-300 text-xs">{driverDetail.activeBooking.dropoffLocation?.address || 'Varış Noktası'}</p>
                        </div>
                      </div>

                      {driverDetail.activeBooking.finalPrice && (
                        <div className="pt-2 border-t border-gray-600 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-white">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <span className="font-bold">
                              {currencySymbol('EUR')}{driverDetail.activeBooking.finalPrice.toFixed(0)}
                            </span>
                          </div>
                          {driverDetail.activeBooking.customerPhone && (
                            <a href={`tel:${driverDetail.activeBooking.customerPhone}`} className="text-xs text-blue-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Müşteri
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Son Yolculuklar */}
                {driverDetail.recentBookings && driverDetail.recentBookings.length > 0 && (
                  <div className="p-4">
                    <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Son Yolculuklar ({driverDetail.recentBookings.length})
                    </h5>
                    
                    <div className="space-y-2">
                      {driverDetail.recentBookings.slice(0, 5).map(b => (
                        <div key={b.id} className="bg-gray-800 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">#{b.reservationCode}</span>
                            <span className="text-xs text-green-400">
                              {currencySymbol('EUR')}{(b.finalPrice || 0).toFixed(0)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{b.pickupLocation?.address}</p>
                          <p className="text-xs text-gray-500 truncate">→ {b.dropoffLocation?.address}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* İşlemler */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(selectedDriver.id)}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="h-4 w-4 inline mr-2" />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Belge Önizleme Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-gray-800 rounded-xl max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h4 className="text-white font-medium">{getDocLabel(preview.name)}</h4>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              {preview.url.startsWith('data:') ? (
                <img src={preview.url} alt={preview.name} className="max-w-full rounded-lg" />
              ) : (
                <img src={preview.url} alt={preview.name} className="max-w-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminDrivers
