import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { toast } from 'sonner'
import {
  FileText, Car, MapPin, DollarSign, Clock, User,
  CheckCircle, XCircle, Filter, Search, RefreshCw,
  ChevronRight, Loader2, Eye, Calendar, Phone, Mail
} from 'lucide-react'

interface Booking {
  id: string
  reservationCode: string
  status: 'pending' | 'accepted' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled'
  customerId?: string
  guestName?: string
  guestPhone?: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  pickupLocation: { lat: number; lng: number; address: string }
  dropoffLocation: { lat: number; lng: number; address: string }
  pickupTime: string
  passengerCount: number
  vehicleType: string
  basePrice: number
  finalPrice?: number
  paymentStatus?: 'unpaid' | 'paid'
  paymentMethod?: 'card' | 'cash'
  createdAt: string
  completedAt?: string
  cancelledAt?: string
  extras?: any
}

type FilterStatus = 'all' | 'active' | 'completed' | 'cancelled'

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterAndSearch()
  }, [bookings, filter, searchQuery])

  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/bookings/list')
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) {
        setBookings(data.data)
      }
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi')
    }
    setIsLoading(false)
  }

  const filterAndSearch = () => {
    let result = [...bookings]

    // Filter by status
    if (filter === 'active') {
      result = result.filter(b => 
        ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
      )
    } else if (filter === 'completed') {
      result = result.filter(b => b.status === 'completed')
    } else if (filter === 'cancelled') {
      result = result.filter(b => b.status === 'cancelled')
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.reservationCode?.toLowerCase().includes(q) ||
        b.guestName?.toLowerCase().includes(q) ||
        b.guestPhone?.includes(q) ||
        b.driverName?.toLowerCase().includes(q) ||
        b.pickupLocation?.address?.toLowerCase().includes(q) ||
        b.dropoffLocation?.address?.toLowerCase().includes(q)
      )
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setFilteredBookings(result)
  }

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return
    
    try {
      const res = await fetch('/api/rides/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: bookingId, reason: 'Admin iptali' })
      })
      const data = await res.json()
      if (data?.success) {
        toast.success('Rezervasyon iptal edildi')
        fetchBookings()
        setSelectedBooking(null)
      } else {
        throw new Error(data?.error)
      }
    } catch {
      toast.error('İptal başarısız')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      accepted: 'bg-blue-500/20 text-blue-400',
      driver_en_route: 'bg-cyan-500/20 text-cyan-400',
      driver_arrived: 'bg-indigo-500/20 text-indigo-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400'
    }
    const labels: Record<string, string> = {
      pending: 'Bekliyor',
      accepted: 'Kabul',
      driver_en_route: 'Yola Çıktı',
      driver_arrived: 'Geldi',
      in_progress: 'Yolda',
      completed: 'Tamamlandı',
      cancelled: 'İptal'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Stats
  const stats = {
    total: bookings.length,
    active: bookings.filter(b => ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.finalPrice || 0), 0)
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Rezervasyon Yönetimi</h1>
          <p className="text-gray-400 text-sm">Tüm rezervasyonları görüntüleyin, yönetin ve filtreleyin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Toplam</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            <p className="text-sm text-gray-400">Aktif</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-sm text-gray-400">Tamamlanan</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
            <p className="text-sm text-gray-400">İptal</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.revenue)}</p>
            <p className="text-sm text-gray-400">Toplam Gelir</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Kod, isim, telefon veya adres ile ara..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'completed', 'cancelled'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : f === 'completed' ? 'Tamamlanan' : 'İptal'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchBookings}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bookings List */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-400">Yükleniyor...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Rezervasyon bulunamadı</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedBooking?.id === booking.id
                        ? 'bg-blue-500/10 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-700/50'
                    }`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-300">#{booking.reservationCode}</span>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="h-3 w-3 text-green-400" />
                            <span className="truncate">{booking.pickupLocation?.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="h-3 w-3 text-red-400" />
                            <span className="truncate">{booking.dropoffLocation?.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {booking.guestName || 'Misafir'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {booking.vehicleType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(booking.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(booking.finalPrice || booking.basePrice)}
                        </p>
                        <ChevronRight className="h-5 w-5 text-gray-500 ml-auto mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {!selectedBooking ? (
              <div className="p-8 text-center">
                <Eye className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Detay görmek için rezervasyon seçin</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-lg text-white">#{selectedBooking.reservationCode}</span>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  <p className="text-sm text-gray-400">{formatDate(selectedBooking.createdAt)}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                  {/* Customer Info */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Müşteri Bilgileri</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-300">
                        <User className="h-4 w-4" />
                        <span>{selectedBooking.guestName || 'Misafir'}</span>
                      </div>
                      {selectedBooking.guestPhone && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-4 w-4" />
                          <span>{selectedBooking.guestPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Driver Info */}
                  {selectedBooking.driverName && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Sürücü Bilgileri</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="h-4 w-4" />
                          <span>{selectedBooking.driverName}</span>
                        </div>
                        {selectedBooking.driverPhone && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-4 w-4" />
                            <span>{selectedBooking.driverPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Route */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Rota</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                        <div>
                          <p className="text-xs text-gray-500">Alış Noktası</p>
                          <p className="text-sm text-white">{selectedBooking.pickupLocation?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                        <div>
                          <p className="text-xs text-gray-500">Varış Noktası</p>
                          <p className="text-sm text-white">{selectedBooking.dropoffLocation?.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Fiyat</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Toplam</span>
                      <span className="text-xl font-bold text-green-400">
                        {formatCurrency(selectedBooking.finalPrice || selectedBooking.basePrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">Ödeme Durumu</span>
                      <span className={selectedBooking.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedBooking.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {['pending', 'accepted', 'driver_en_route', 'driver_arrived'].includes(selectedBooking.status) && (
                    <button
                      onClick={() => handleCancel(selectedBooking.id)}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="h-4 w-4 inline mr-2" />
                      Rezervasyonu İptal Et
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminBookings
