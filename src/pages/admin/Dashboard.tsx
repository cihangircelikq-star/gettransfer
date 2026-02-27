import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { 
  Users, UserCheck, Wifi, Car, DollarSign, TrendingUp, 
  Clock, AlertTriangle, CheckCircle, XCircle, Calendar,
  ArrowUp, ArrowDown, Activity, MapPin, FileText, Star
} from 'lucide-react'

interface Stats {
  totalDrivers: number
  onlineDrivers: number
  pendingApprovals: number
  totalBookings: number
  activeBookings: number
  todayBookings: number
  todayRevenue: number
  totalRevenue: number
  totalCustomers: number
  avgRating: number
}

interface RecentActivity {
  id: string
  type: 'booking' | 'driver' | 'customer' | 'payment'
  message: string
  time: string
  status?: string
}

interface Booking {
  id: string
  status: string
  finalPrice?: number
  pickupLocation?: { address: string }
  dropoffLocation?: { address: string }
  createdAt: string
  customerName?: string
  driverName?: string
  vehicleType?: string
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalDrivers: 0,
    onlineDrivers: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    activeBookings: 0,
    todayBookings: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    avgRating: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [activeBookings, setActiveBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch drivers
        const driversRes = await fetch('/api/drivers/list?status=approved')
        const driversData = await driversRes.json()
        const approvedDrivers = driversData?.data || []
        const onlineCount = approvedDrivers.filter((d: any) => d.available).length

        // Fetch pending
        const pendingRes = await fetch('/api/drivers/pending')
        const pendingData = await pendingRes.json()
        const pendingCount = (pendingData?.data || []).length

        // Fetch bookings
        const bookingsRes = await fetch('/api/bookings/list')
        const bookingsData = await bookingsRes.json()
        const allBookings = bookingsData?.data || []
        
        const today = new Date().toDateString()
        const todayBookings = allBookings.filter((b: Booking) => 
          new Date(b.createdAt).toDateString() === today
        )
        const activeBookingsList = allBookings.filter((b: Booking) => 
          ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
        )

        const todayRev = todayBookings.reduce((sum: number, b: Booking) => 
          sum + (b.finalPrice || b.status === 'completed' ? b.finalPrice || 0 : 0), 0
        )
        const totalRev = allBookings
          .filter((b: Booking) => b.status === 'completed')
          .reduce((sum: number, b: Booking) => sum + (b.finalPrice || 0), 0)

        setStats({
          totalDrivers: approvedDrivers.length,
          onlineDrivers: onlineCount,
          pendingApprovals: pendingCount,
          totalBookings: allBookings.length,
          activeBookings: activeBookingsList.length,
          todayBookings: todayBookings.length,
          todayRevenue: todayRev,
          totalRevenue: totalRev,
          totalCustomers: new Set(allBookings.map((b: Booking) => b.customerName).filter(Boolean)).size,
          avgRating: 4.8
        })

        setActiveBookings(activeBookingsList.slice(0, 10))

        // Generate recent activities
        const activities: RecentActivity[] = []
        allBookings.slice(0, 5).forEach((b: Booking) => {
          activities.push({
            id: b.id,
            type: 'booking',
            message: `Yeni rezervasyon: ${b.pickupLocation?.address?.slice(0, 20)}... → ${b.dropoffLocation?.address?.slice(0, 20)}...`,
            time: b.createdAt,
            status: b.status
          })
        })
        setRecentActivities(activities)

      } catch (error) {
        console.error('Dashboard fetch error:', error)
      }
      setIsLoading(false)
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} dk önce`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} saat önce`
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'cancelled': return 'text-red-400'
      case 'in_progress': return 'text-purple-400'
      case 'driver_en_route': return 'text-blue-400'
      case 'pending': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm">Sistem genel durumu ve özet istatistikler</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Online Drivers */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Wifi className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">LIVE</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.onlineDrivers}</p>
            <p className="text-sm text-gray-400">Online Sürücü</p>
          </div>

          {/* Total Drivers */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalDrivers}</p>
            <p className="text-sm text-gray-400">Toplam Sürücü</p>
          </div>

          {/* Pending Approvals */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              {stats.pendingApprovals > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.pendingApprovals}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{stats.pendingApprovals}</p>
            <p className="text-sm text-gray-400">Onay Bekleyen</p>
          </div>

          {/* Today Bookings */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayBookings}</p>
            <p className="text-sm text-gray-400">Bugünkü Yolculuk</p>
          </div>

          {/* Today Revenue */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.todayRevenue)}</p>
            <p className="text-sm text-gray-400">Bugün Gelir</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.activeBookings}</p>
                <p className="text-sm text-blue-300">Aktif Yolculuk</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-green-300">Toplam Gelir</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.totalCustomers}</p>
                <p className="text-sm text-purple-300">Toplam Müşteri</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-yellow-300">Ortalama Puan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Bookings */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-400" />
                Aktif Yolculuklar
              </h2>
              <span className="text-sm text-gray-400">{activeBookings.length} adet</span>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
            ) : activeBookings.length === 0 ? (
              <div className="p-8 text-center">
                <Car className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aktif yolculuk yok</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[400px] overflow-y-auto">
                {activeBookings.map((booking) => (
                  <div key={booking.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        #{booking.id.slice(-8)}
                      </span>
                      <span className={`text-xs ${getStatusColor(booking.status)}`}>
                        {booking.status === 'in_progress' ? 'Yolda' :
                         booking.status === 'driver_en_route' ? 'Yola Çıktı' :
                         booking.status === 'driver_arrived' ? 'Geldi' :
                         booking.status === 'accepted' ? 'Kabul Edildi' :
                         booking.status === 'pending' ? 'Bekliyor' : booking.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="truncate">{booking.pickupLocation?.address || 'Alış'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="truncate">{booking.dropoffLocation?.address || 'Varış'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{booking.customerName || 'Misafir'}</span>
                      <span>{formatTime(booking.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-400" />
                Son Aktiviteler
              </h2>
            </div>
            
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aktivite yok</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[400px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'booking' ? 'bg-blue-500/20' :
                        activity.type === 'driver' ? 'bg-green-500/20' :
                        activity.type === 'payment' ? 'bg-yellow-500/20' : 'bg-gray-500/20'
                      }`}>
                        {activity.type === 'booking' ? <Car className="h-4 w-4 text-blue-400" /> :
                         activity.type === 'driver' ? <Users className="h-4 w-4 text-green-400" /> :
                         activity.type === 'payment' ? <DollarSign className="h-4 w-4 text-yellow-400" /> :
                         <Activity className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.time)}</p>
                      </div>
                      {activity.status && (
                        <span className={`text-xs ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={() => window.location.href = '/admin/drivers'}
              className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Sürücüler</p>
                <p className="text-xs text-gray-400">Yönet</p>
              </div>
            </button>

            <button 
              onClick={() => window.location.href = '/admin/bookings'}
              className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Rezervasyonlar</p>
                <p className="text-xs text-gray-400">Görüntüle</p>
              </div>
            </button>

            <button 
              onClick={() => window.location.href = '/admin/pricing'}
              className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Fiyatlandırma</p>
                <p className="text-xs text-gray-400">Ayarla</p>
              </div>
            </button>

            <button 
              onClick={() => window.location.href = '/admin/settings'}
              className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Ayarlar</p>
                <p className="text-xs text-gray-400">Düzenle</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
