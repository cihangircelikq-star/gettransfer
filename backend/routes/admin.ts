import { Router, type Request, type Response } from 'express'
import { bootstrapSupabaseSchema, checkBookingsTable } from '../services/supabaseBootstrap.js'
import { createClient } from '@supabase/supabase-js'
import { listDriversByStatus } from '../services/storage.js'
import { logger } from '../utils/logger.js'

const router = Router()

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const SUPABASE_URL = getEnv('SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null

const getToken = () => {
  const v = process.env.BOOTSTRAP_TOKEN
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const authorized = (req: Request) => {
  const tok = getToken()
  if (!tok) return false
  const got = String(req.headers['x-bootstrap-token'] || '').trim()
  return got && got === tok
}

// Helper to calculate stats
async function calculateStats() {
  try {
    // Get driver stats
    const approvedDrivers = await listDriversByStatus('approved')
    const pendingDrivers = await listDriversByStatus('pending')
    const onlineDrivers = approvedDrivers.filter((d: any) => d.available).length

    // Get booking stats
    let todayBookings = 0
    let activeBookings = 0
    let todayRevenue = 0
    let weeklyRevenue = 0
    let monthlyRevenue = 0
    let completedToday = 0
    let cancelledToday = 0
    let totalCustomers = 0

    if (supabase) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)

      // Today's bookings
      const { count: todayCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
      todayBookings = todayCount || 0

      // Active bookings
      const { count: activeCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'])
      activeBookings = activeCount || 0

      // Today's completed
      const { data: completedData } = await supabase
        .from('bookings')
        .select('final_price, base_price')
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())
      
      completedToday = completedData?.length || 0
      todayRevenue = completedData?.reduce((sum: number, b: any) => sum + (b.final_price || b.base_price || 0), 0) || 0

      // Today's cancelled
      const { count: cancelledCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', today.toISOString())
      cancelledToday = cancelledCount || 0

      // Weekly revenue
      const { data: weeklyData } = await supabase
        .from('bookings')
        .select('final_price, base_price')
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString())
      weeklyRevenue = weeklyData?.reduce((sum: number, b: any) => sum + (b.final_price || b.base_price || 0), 0) || 0

      // Monthly revenue
      const { data: monthlyData } = await supabase
        .from('bookings')
        .select('final_price, base_price')
        .eq('status', 'completed')
        .gte('completed_at', monthAgo.toISOString())
      monthlyRevenue = monthlyData?.reduce((sum: number, b: any) => sum + (b.final_price || b.base_price || 0), 0) || 0

      // Unique customers
      const { data: customersData } = await supabase
        .from('bookings')
        .select('customer_id, guest_phone')
        .not('customer_id', 'is', null)
      const uniqueCustomers = new Set(customersData?.map((c: any) => c.customer_id).filter(Boolean) || [])
      totalCustomers = uniqueCustomers.size
    }

    return {
      totalDrivers: approvedDrivers.length,
      onlineDrivers,
      pendingDrivers: pendingDrivers.length,
      totalCustomers,
      todayBookings,
      activeBookings,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      completedToday,
      cancelledToday
    }
  } catch (error) {
    logger.error('admin_stats_error', { error })
    // Return default stats on error
    return {
      totalDrivers: 0,
      onlineDrivers: 0,
      pendingDrivers: 0,
      totalCustomers: 0,
      todayBookings: 0,
      activeBookings: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      completedToday: 0,
      cancelledToday: 0
    }
  }
}

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await calculateStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    logger.error('admin_stats_error', { error })
    res.status(500).json({ success: false, error: 'stats_failed' })
  }
})

// GET /api/admin/customers - List all customers
router.get('/customers', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.json({ success: true, data: [] })
      return
    }

    // Get unique customers from bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('customer_id, guest_name, guest_phone, guest_email, created_at, status, final_price, base_price')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Aggregate customer data
    const customerMap = new Map<string, any>()
    
    bookings?.forEach((b: any) => {
      const id = b.customer_id || `guest_${b.guest_phone || 'unknown'}`
      
      if (!customerMap.has(id)) {
        customerMap.set(id, {
          id,
          name: b.guest_name || 'Misafir',
          email: b.guest_email || undefined,
          phone: b.guest_phone || undefined,
          createdAt: b.created_at,
          totalBookings: 0,
          completedBookings: 0,
          totalSpent: 0,
          lastBooking: b.created_at
        })
      }

      const customer = customerMap.get(id)!
      customer.totalBookings++
      if (b.status === 'completed') {
        customer.completedBookings++
        customer.totalSpent += b.final_price || b.base_price || 0
      }
    })

    const customers = Array.from(customerMap.values())
    res.json({ success: true, data: customers })
  } catch (error) {
    logger.error('admin_customers_error', { error })
    res.status(500).json({ success: false, error: 'customers_failed' })
  }
})

// GET /api/admin/feedback - List feedback and ratings
router.get('/feedback', async (req: Request, res: Response) => {
  try {
    // For now, return mock data - in production this would come from a feedback table
    const feedbacks = []
    const driverRatings = []

    // If we had a feedback table, we'd query it here
    // For now, return empty arrays
    res.json({ 
      success: true, 
      feedbacks,
      driverRatings
    })
  } catch (error) {
    logger.error('admin_feedback_error', { error })
    res.status(500).json({ success: false, error: 'feedback_failed' })
  }
})

// GET /api/admin/logs - System logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    
    // Return recent system logs - in production this would come from a logging service
    // For now, return some basic logs
    const logs = [
      {
        id: `log_${Date.now()}_1`,
        level: 'info' as const,
        message: 'Sistem başlatıldı',
        timestamp: new Date().toISOString(),
        source: 'system'
      },
      {
        id: `log_${Date.now()}_2`,
        level: 'info' as const,
        message: 'API sunucusu aktif',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        source: 'api'
      }
    ]

    res.json({ success: true, data: logs })
  } catch (error) {
    logger.error('admin_logs_error', { error })
    res.status(500).json({ success: false, error: 'logs_failed' })
  }
})

// GET /api/admin/settings - Get system settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    // Return current settings - in production these would come from a settings table
    const settings = {
      siteSettings: {
        siteName: 'GetTransfer',
        siteDescription: 'Profesyonel transfer hizmetleri',
        contactEmail: 'info@gettransfer.com',
        contactPhone: '+90 212 555 00 00',
        address: 'İstanbul, Türkiye',
        defaultCurrency: 'EUR',
        defaultLanguage: 'tr',
        timezone: 'Europe/Istanbul'
      },
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: false,
        driverApplicationAlerts: true,
        newBookingAlerts: true,
        complaintAlerts: true,
        dailyReports: false,
        weeklyReports: true
      },
      systemInfo: {
        version: '1.0.0',
        lastUpdate: new Date().toISOString(),
        databaseStatus: supabase ? 'connected' : 'disconnected',
        apiStatus: 'online',
        activeConnections: 0,
        totalRequests: 0,
        uptime: process.uptime ? `${Math.floor(process.uptime() / 86400)} gün, ${Math.floor((process.uptime() % 86400) / 3600)} saat` : 'N/A'
      }
    }

    res.json({ success: true, ...settings })
  } catch (error) {
    logger.error('admin_settings_error', { error })
    res.status(500).json({ success: false, error: 'settings_failed' })
  }
})

// PUT /api/admin/settings - Update system settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { siteSettings, notificationSettings } = req.body
    
    // In production, these would be saved to a settings table
    // For now, just return success
    logger.info('admin_settings_updated', { siteSettings, notificationSettings })
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      data: { siteSettings, notificationSettings }
    })
  } catch (error) {
    logger.error('admin_settings_update_error', { error })
    res.status(500).json({ success: false, error: 'settings_update_failed' })
  }
})

// Legacy bootstrap endpoints
router.post('/bootstrap', async (req: Request, res: Response) => {
  if (!getToken()) { res.status(404).json({ success: false, error: 'disabled' }); return }
  if (!authorized(req)) { res.status(401).json({ success: false, error: 'unauthorized' }); return }
  const r = await bootstrapSupabaseSchema()
  if (!r.ok) { res.status(500).json({ success: false, error: r.error, reason: (r as any).reason }); return }
  res.json({ success: true, data: r })
})

router.get('/bootstrap/status', async (req: Request, res: Response) => {
  if (!getToken()) { res.status(404).json({ success: false, error: 'disabled' }); return }
  if (!authorized(req)) { res.status(401).json({ success: false, error: 'unauthorized' }); return }
  const r = await checkBookingsTable()
  if (!r.ok) { res.status(500).json({ success: false, error: r.error, reason: (r as any).reason }); return }
  res.json({ success: true, data: r })
})

// DELETE /api/admin/clear-rejected - Reddedilen tüm sürücüleri sil
router.delete('/clear-rejected', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'database_not_connected' })
      return
    }

    // Reddedilen sürücüleri sil (rejected_reason NOT NULL olanlar)
    const { error, count } = await supabase
      .from('drivers')
      .delete({ count: 'exact' })
      .not('rejected_reason', 'is', null)

    if (error) {
      logger.error('clear_rejected_error', { error })
      res.status(500).json({ success: false, error: 'delete_failed' })
      return
    }

    res.json({ 
      success: true, 
      message: `${count || 0} reddedilen sürücü silindi`,
      deletedCount: count 
    })
  } catch (error) {
    logger.error('clear_rejected_error', { error })
    res.status(500).json({ success: false, error: 'clear_failed' })
  }
})

// DELETE /api/admin/clear-all-drivers - Tüm sürücüleri sil (admin hariç)
router.delete('/clear-all-drivers', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'database_not_connected' })
      return
    }

    // Tüm sürücüleri sil
    const { error, count } = await supabase
      .from('drivers')
      .delete({ count: 'exact' })
      .neq('email', 'admin@gettransfer.com') // Admin'i koru (varsa)

    if (error) {
      logger.error('clear_all_drivers_error', { error })
      res.status(500).json({ success: false, error: 'delete_failed' })
      return
    }

    res.json({ 
      success: true, 
      message: `${count || 0} sürücü silindi`,
      deletedCount: count 
    })
  } catch (error) {
    logger.error('clear_all_drivers_error', { error })
    res.status(500).json({ success: false, error: 'clear_failed' })
  }
})

// DELETE /api/admin/clear-all-bookings - Tüm rezervasyonları sil
router.delete('/clear-all-bookings', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'database_not_connected' })
      return
    }

    // Tüm rezervasyonları sil
    const { error, count } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })

    if (error) {
      logger.error('clear_all_bookings_error', { error })
      res.status(500).json({ success: false, error: 'delete_failed' })
      return
    }

    res.json({ 
      success: true, 
      message: `${count || 0} rezervasyon silindi`,
      deletedCount: count 
    })
  } catch (error) {
    logger.error('clear_all_bookings_error', { error })
    res.status(500).json({ success: false, error: 'clear_failed' })
  }
})

// DELETE /api/admin/reset-all - Her şeyi temizle (yeni başlangıç)
router.delete('/reset-all', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'database_not_connected' })
      return
    }

    let deletedDrivers = 0
    let deletedBookings = 0

    // Tüm rezervasyonları sil
    const { error: bookingError, count: bookingCount } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })
    
    if (!bookingError) deletedBookings = bookingCount || 0

    // Tüm sürücüleri sil
    const { error: driverError, count: driverCount } = await supabase
      .from('drivers')
      .delete({ count: 'exact' })
    
    if (!driverError) deletedDrivers = driverCount || 0

    res.json({ 
      success: true, 
      message: `Sistem sıfırlandı: ${deletedDrivers} sürücü, ${deletedBookings} rezervasyon silindi`,
      deletedDrivers,
      deletedBookings
    })
  } catch (error) {
    logger.error('reset_all_error', { error })
    res.status(500).json({ success: false, error: 'reset_failed' })
  }
})

export default router
