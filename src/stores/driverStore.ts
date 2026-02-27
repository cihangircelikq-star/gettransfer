import { create } from 'zustand'
import { API } from '@/utils/api'
import { io as ioClient, Socket } from 'socket.io-client'

const haversineMeters = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

let lastLocationSentAt = 0
let lastLocationSent: { lat: number, lng: number } | null = null
const MIN_LOCATION_SEND_INTERVAL_MS = 1000
const MIN_LOCATION_SEND_DISTANCE_M = 10

type DriverSession = {
  id: string
  name: string
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury'
  location: { lat: number, lng: number }
  available: boolean
  vehicleModel?: string
  licensePlate?: string
}

type DriverState = {
  me: DriverSession | null
  approved?: boolean
  rejectedReason?: string
  earnings?: { currency: string, daily: number, weekly: number, monthly: number, generatedAt: string } | null
  requests: Array<{
    id: string
    customerId: string
    pickup: { lat: number, lng: number, address: string }
    dropoff: { lat: number, lng: number, address: string }
    vehicleType: 'sedan' | 'suv' | 'van' | 'luxury'
  }>
  register: (session: DriverSession) => Promise<void>
  refreshRequests: () => Promise<void>
  updateLocation: (loc: { lat: number, lng: number }) => Promise<void>
  accept: (requestId: string) => Promise<void>
  setAvailable: (available: boolean) => Promise<void>
  refreshApproval: () => Promise<void>
  fetchEarnings: () => Promise<void>
  submitComplaint: (text: string) => Promise<void>
  updateProfile: (patch: Partial<{ name: string, vehicleModel: string, licensePlate: string }>) => Promise<void>
  startRealtime: () => void
  socket?: Socket | null
  isConnected?: boolean
}

export const useDriverStore = create<DriverState>()((set, get) => ({
  me: null,
  approved: undefined,
  rejectedReason: undefined,
  earnings: null,
  requests: [],
  socket: null,
  isConnected: false,
  register: async (session) => {
    const res = await fetch(`${API}/drivers/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session)
    })
    if (!res.ok) throw new Error('register_failed')
    set({ me: session })
    get().startRealtime()
  },
  refreshRequests: async () => {
    const { me } = get()
    const url = me?.vehicleType ? `${API}/drivers/requests?vehicleType=${me.vehicleType}` : `${API}/drivers/requests`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error('requests_failed')
    const arr = Array.isArray(data.data) ? data.data : []
    const dedup = Array.from(new Map<string, any>(arr.map((x:any)=>[x.id,x])).values())
    set({ requests: dedup as any })
  },
  updateLocation: async (loc) => {
    const { me } = get()
    if (!me) return
    // Optimistic update
    set({ me: { ...me, location: loc } })
    try {
      const now = Date.now()
      if (lastLocationSent && now - lastLocationSentAt < MIN_LOCATION_SEND_INTERVAL_MS) {
        const dist = haversineMeters(lastLocationSent, loc)
        if (dist < MIN_LOCATION_SEND_DISTANCE_M) return
      }
      lastLocationSentAt = now
      lastLocationSent = loc
      await fetch(`${API}/drivers/location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: me.id, location: loc })
      })
    } catch {}
  },
  accept: async (requestId) => {
    const { me } = get()
    if (!me) throw new Error('not_registered')
    const res = await fetch(`${API}/drivers/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverId: me.id, requestId })
    })
    if (!res.ok) throw new Error('accept_failed')
    set({ me: { ...me, available: false } })
  },
  setAvailable: async (available) => {
    const { me } = get()
    if (!me) return
    const res = await fetch(`${API}/drivers/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: me.id, available })
    })
    if (!res.ok) throw new Error('status_failed')
    set({ me: { ...me, available } })
  },
  refreshApproval: async () => {
    const { me } = get()
    console.log('🔵 [REFRESH APPROVAL] Starting...')
    console.log('🔵 [REFRESH APPROVAL] me:', me ? { id: me.id, name: me.name } : 'NO ME')
    
    if (!me) {
      console.log('⚠️ [REFRESH APPROVAL] No me, returning')
      return
    }
    
    try {
        // ÖNCE direkt olarak driver'ı çek
        console.log('🔵 [REFRESH APPROVAL] Fetching driver directly...')
        const driverRes = await fetch(`${API}/drivers/${me.id}`)
        const driverData = await driverRes.json()
        
        if (driverRes.ok && driverData.success && driverData.data) {
          const directApproved = driverData.data.approved === true
          console.log('🔵 [REFRESH APPROVAL] Direct check - approved:', directApproved)
          
          // Direkt sonucu kullan
          set({ 
            approved: directApproved,
            rejectedReason: driverData.data.rejectedReason || undefined
          })
          console.log('✅ [REFRESH APPROVAL] Set approved to:', directApproved)
          return
        }
        
        // Fallback: List kontrolü
        console.log('🔵 [REFRESH APPROVAL] Fallback: Fetching approved list...')
        const resApproved = await fetch(`${API}/drivers/list?status=approved`)
        const a = await resApproved.json()
        console.log('🔵 [REFRESH APPROVAL] Approved list response:', { 
          success: a?.success, 
          count: a?.data?.length,
          ids: a?.data?.map((d: any) => d.id)
        })
        
        const isApproved = Array.isArray(a.data) && !!a.data.find((d: any) => d.id === me.id)
        console.log('🔵 [REFRESH APPROVAL] Is driver in approved list?', isApproved, 'driverId:', me.id)
        
        // If not approved, check if pending
        let isPending = false
        if (!isApproved) {
            console.log('🔵 [REFRESH APPROVAL] Not approved, checking pending list...')
            const resPending = await fetch(`${API}/drivers/list?status=pending`)
            const p = await resPending.json()
            console.log('🔵 [REFRESH APPROVAL] Pending list response:', { 
              success: p?.success, 
              count: p?.data?.length,
              ids: p?.data?.map((d: any) => d.id)
            })
            isPending = Array.isArray(p.data) && !!p.data.find((d: any) => d.id === me.id)
            console.log('🔵 [REFRESH APPROVAL] Is driver in pending list?', isPending, 'driverId:', me.id)
        }
        
        console.log('✅ [REFRESH APPROVAL] Final state:', { approved: isApproved, isPending })
        set({ approved: isApproved, rejectedReason: isApproved ? undefined : (isPending ? undefined : 'unspecified') })
    } catch (e) {
      console.error('❌ [REFRESH APPROVAL] Error:', e)
    }
  },
  fetchEarnings: async () => {
    const { me } = get()
    if (!me) return
    const res = await fetch(`${API}/drivers/earnings/${me.id}`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error('earnings_failed')
    set({ earnings: data.data })
  },
  submitComplaint: async (text) => {
    const { me } = get()
    if (!me) throw new Error('not_registered')
    const res = await fetch(`${API}/drivers/complaints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverId: me.id, text })
    })
    if (!res.ok) throw new Error('complaint_failed')
  },
  updateProfile: async (patch) => {
    const { me } = get()
    if (!me) throw new Error('not_registered')
    const res = await fetch(`${API}/drivers/profile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: me.id, ...patch })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error('profile_update_failed')
    set({ me: { ...me, ...patch } as any })
  },
  startRealtime: () => {
    const { socket, me } = get()
    if (socket) {
        // Ensure we don't attach listeners multiple times if socket exists but re-connecting logic runs
        socket.off('ride:request')
        socket.off('ride:taken')
        socket.off('ride:accepted')
        socket.off('ride:cancelled')
        // Re-attach fresh listeners below
    }
    
    const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`
    const s = socket || ioClient(origin, { transports: ['websocket'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 })
    
    if (!socket) {
        s.on('connect', () => {
          set({ isConnected: true })
          get().refreshRequests()
        })
        s.on('disconnect', () => {
          set({ isConnected: false })
        })
    }

    s.on('ride:request', (r: any) => {
      const { me } = get()
      if (me && r?.vehicleType === me?.vehicleType) {
        if (r?.targetDriverId && String(r.targetDriverId) !== me.id) return
        const { requests } = get()
        
        // Check if we already have this request ID
        const exists = requests.some((x) => x.id === r.id)
        if (exists) return

        const next = [...requests, { id: r.id, customerId: r.customerId, pickup: r.pickup, dropoff: r.dropoff, vehicleType: r.vehicleType }]
        const dedup = Array.from(new Map<string, any>(next.map((x:any)=>[x.id,x])).values())
        set({ requests: dedup as any })
      }
    })
    
    // Driver-specific request event
    s.on(`driver:${me?.id}:request`, (r: any) => {
      if (!r) return
      const { requests } = get()
      const exists = requests.some((x) => x.id === r.id)
      if (exists) return
      set({ requests: [...requests, { id: r.id, customerId: r.customerId, pickup: r.pickup, dropoff: r.dropoff, vehicleType: r.vehicleType }] })
    })
    
    // Driver assigned event
    s.on(`driver:${me?.id}:assigned`, (booking: any) => {
      if (!booking) return
      // Remove from pending requests
      const { requests } = get()
      set({ requests: requests.filter((x) => x.id !== booking.id) })
    })
    
    s.on('ride:taken', (payload: any) => {
      const { requests } = get()
      // If someone else took the ride, remove it from my list immediately
      set({ requests: requests.filter((x)=>x.id !== payload.requestId) })
    })
    s.on('ride:cancelled', (r: any) => {
      const { requests } = get()
      set({ requests: requests.filter((x)=>x.id!==r.id) })
    })
    set({ socket: s })
  }
}))
