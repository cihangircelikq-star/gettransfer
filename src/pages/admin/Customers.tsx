import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { toast } from 'sonner'
import {
  Users, User, Phone, Mail, Car, Star, Clock,
  Search, RefreshCw, ChevronRight, Loader2, Eye,
  MapPin, DollarSign, Calendar
} from 'lucide-react'

interface Customer {
  id: string
  name?: string
  email?: string
  phone?: string
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  totalSpent: number
  avgRating?: number
  lastBooking?: string
  createdAt?: string
}

interface Booking {
  id: string
  reservationCode: string
  status: string
  finalPrice?: number
  pickupLocation?: { address: string }
  dropoffLocation?: { address: string }
  createdAt: string
  driverName?: string
}

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([])

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      setFilteredCustomers(customers.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      ))
    } else {
      setFilteredCustomers(customers)
    }
  }, [customers, searchQuery])

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      // Fetch all bookings and extract unique customers
      const res = await fetch('/api/bookings/list')
      const data = await res.json()
      
      if (data?.success && Array.isArray(data.data)) {
        const customerMap = new Map<string, Customer>()
        
        data.data.forEach((booking: any) => {
          const customerId = booking.customerId || booking.guestPhone || 'guest'
          const customerName = booking.guestName || 'Misafir'
          const customerPhone = booking.guestPhone || ''
          
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: customerName,
              phone: customerPhone,
              totalBookings: 0,
              completedBookings: 0,
              cancelledBookings: 0,
              totalSpent: 0,
              lastBooking: booking.createdAt
            })
          }
          
          const customer = customerMap.get(customerId)!
          customer.totalBookings++
          if (booking.status === 'completed') {
            customer.completedBookings++
            customer.totalSpent += booking.finalPrice || 0
          }
          if (booking.status === 'cancelled') {
            customer.cancelledBookings++
          }
        })
        
        setCustomers(Array.from(customerMap.values()))
      }
    } catch (error) {
      toast.error('Müşteriler yüklenemedi')
    }
    setIsLoading(false)
  }

  const fetchCustomerBookings = async (customerId: string) => {
    try {
      const res = await fetch(`/api/bookings/list`)
      const data = await res.json()
      
      if (data?.success && Array.isArray(data.data)) {
        const bookings = data.data.filter((b: any) => 
          b.customerId === customerId || b.guestPhone === customerId
        )
        setCustomerBookings(bookings)
      }
    } catch {
      setCustomerBookings([])
    }
  }

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerBookings(selectedCustomer.id)
    } else {
      setCustomerBookings([])
    }
  }, [selectedCustomer])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  // Stats
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.completedBookings > 0).length,
    vip: customers.filter(c => c.totalSpent > 500).length,
    revenue: customers.reduce((sum, c) => sum + c.totalSpent, 0)
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Müşteri Yönetimi</h1>
          <p className="text-gray-400 text-sm">Tüm müşterileri görüntüleyin ve geçmişlerini takip edin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Toplam Müşteri</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-sm text-gray-400">Aktif Müşteri</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-yellow-400">{stats.vip}</p>
            <p className="text-sm text-gray-400">VIP Müşteri</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.revenue)}</p>
            <p className="text-sm text-gray-400">Toplam Harcama</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, e-posta veya telefon ile ara..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={fetchCustomers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customer List */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-400">Yükleniyor...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Müşteri bulunamadı</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-500/10 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-700/50'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{customer.name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-xs text-gray-500">{customer.totalBookings} yolculuk</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="flex items-center gap-1 text-green-400">
                        <Car className="h-3 w-3" />
                        {customer.completedBookings} tamamlandı
                      </span>
                      {customer.cancelledBookings > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          {customer.cancelledBookings} iptal
                        </span>
                      )}
                      {customer.totalSpent > 500 && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                          VIP
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {!selectedCustomer ? (
              <div className="p-8 text-center">
                <Eye className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Detay görmek için müşteri seçin</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedCustomer.name}</h3>
                      {selectedCustomer.phone && (
                        <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-700">
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{selectedCustomer.totalBookings}</p>
                    <p className="text-xs text-gray-400">Toplam</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-400">{selectedCustomer.completedBookings}</p>
                    <p className="text-xs text-gray-400">Tamamlanan</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(selectedCustomer.totalSpent)}</p>
                    <p className="text-xs text-gray-400">Harcama</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-yellow-400">
                      {selectedCustomer.avgRating?.toFixed(1) || '4.5'}
                    </p>
                    <p className="text-xs text-gray-400">Puan</p>
                  </div>
                </div>

                {/* Booking History */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Yolculuk Geçmişi</h3>
                  {customerBookings.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Yolculuk yok</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {customerBookings.slice(0, 10).map((booking) => (
                        <div key={booking.id} className="bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-gray-400">#{booking.reservationCode}</span>
                            <span className={`text-xs ${
                              booking.status === 'completed' ? 'text-green-400' :
                              booking.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {booking.status === 'completed' ? 'Tamamlandı' :
                               booking.status === 'cancelled' ? 'İptal' : booking.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 truncate">{booking.pickupLocation?.address}</p>
                          <p className="text-xs text-gray-500 truncate">→ {booking.dropoffLocation?.address}</p>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>{formatDate(booking.createdAt)}</span>
                            {booking.finalPrice && (
                              <span className="text-green-400">{formatCurrency(booking.finalPrice)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

export default AdminCustomers
