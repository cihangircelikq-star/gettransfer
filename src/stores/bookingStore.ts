import { create } from 'zustand';
import { API } from '@/utils/api'
import { io as ioClient, Socket } from 'socket.io-client'
import { Booking, Driver, SearchFilters } from '@/types';
import { useAuthStore } from '@/stores/authStore'

interface BookingState {
  currentBooking: Booking | null;
  availableDrivers: Driver[];
  searchFilters: SearchFilters;
  isLoading: boolean;
  error: string | null;
  updateInterval: NodeJS.Timeout | null;
  socket: Socket | null;
  trackingLocation: { lat: number, lng: number } | null;
  routeRecording: boolean;
  routePoints: Array<{ lat: number, lng: number }>;
  lastRequestId: string | null;
  
  // Actions
  searchDrivers: (pickup: any, dropoff: any, filters: SearchFilters) => Promise<void>;
  cancelLastRequest: (customerId?: string) => Promise<void>;
  createBooking: (bookingData: any) => Promise<Booking>;
  updateBookingStatus: (bookingId: string, status: Booking['status']) => Promise<void>;
  setCurrentBooking: (booking: Booking | null) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  clearError: () => void;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  refreshApprovedDriversNear: (location: { lat: number, lng: number }) => Promise<void>;
  confirmPickup: (bookingId: string) => Promise<void>;
  startRouteRecording: () => void;
  appendRoutePoint: (pt: { lat: number, lng: number }) => void;
  stopRouteRecordingAndSave: (bookingId: string, customerPath?: Array<{ lat: number, lng: number }>) => Promise<void>;
  refreshBookingById: (bookingId: string) => Promise<void>;
  saveRouteProgress: (bookingId?: string) => Promise<void>;
}

export const useBookingStore = create<BookingState>()((set, get) => ({
  currentBooking: null,
  availableDrivers: [],
  searchFilters: {},
  isLoading: false,
  error: null,
  updateInterval: null as NodeJS.Timeout | null,
  socket: null,
  trackingLocation: null,
  routeRecording: false,
  routePoints: [],
  lastRequestId: null,

  searchDrivers: async (pickup: any, dropoff: any, filters: SearchFilters) => {
    set({ isLoading: true, error: null });
    
    try {
      const authUserId = useAuthStore.getState().user?.id
      const reqBody = {
        id: 'req_' + Date.now(),
        customerId: authUserId || ('cust_' + Date.now()),
        passengerCount: filters.passengerCount,
        targetDriverId: filters.targetDriverId,
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address || 'Alış Noktası' },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address || 'Varış Noktası' },
        vehicleType: filters.vehicleType || 'sedan'
      };
      const res = await fetch(`${API}/drivers/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Driver search failed');
      const candidates = (data.data?.candidates || []) as Array<any>;
      const mapped: Driver[] = candidates.map((c: any) => ({
        id: c.id,
        email: `${c.id}@drivers.local`,
        name: c.name,
        phone: '',
        role: 'driver',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        licenseNumber: '',
        vehicleType: c.vehicleType,
        vehicleModel: 'Araç',
        licensePlate: '',
        rating: 4.7,
        totalRides: 0,
        isAvailable: c.available,
        currentLocation: c.location,
        lastLocationUpdate: new Date().toISOString(),
      }));
      set({ availableDrivers: mapped, searchFilters: filters, isLoading: false, error: null, trackingLocation: { lat: pickup.lat, lng: pickup.lng }, lastRequestId: reqBody.id });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  },

  createBooking: async (bookingData: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API}/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      set({
        currentBooking: data.data,
        isLoading: false,
        error: null,
      });
      
      return data.data;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Booking creation failed',
      });
      throw error;
    }
  },

  updateBookingStatus: async (bookingId: string, status: Booking['status']) => {
    try {
      const response = await fetch(`${API}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking status');
      }

      const { currentBooking } = get();
      if (currentBooking && currentBooking.id === bookingId) {
        set({
          currentBooking: {
            ...currentBooking,
            status,
            pickedUpAt: status === 'in_progress' ? new Date().toISOString() : currentBooking.pickedUpAt,
            completedAt: status === 'completed' ? new Date().toISOString() : currentBooking.completedAt,
          },
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Status update failed',
      });
    }
  },

  setCurrentBooking: (booking: Booking | null) => {
    set({ currentBooking: booking });
  },

  setSearchFilters: (filters: SearchFilters) => {
    set({ searchFilters: filters });
  },

  clearError: () => {
    set({ error: null });
  },

  startRealTimeUpdates: () => {
    const { socket, trackingLocation } = get();
    if (socket) return;
    const origin = (import.meta.env.VITE_API_ORIGIN as string) || `http://${window.location.hostname}:3005`;
    const s = ioClient(origin, { transports: ['websocket'] });
    const calc = (a: {lat:number,lng:number}, b: {lat:number,lng:number}) => {
      const R = 6371; const dLat = (b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
      const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
      return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
    }
    s.on('driver:update', (d: any) => {
      const { availableDrivers } = get();
      const exists = availableDrivers.find((x)=>x.id===d.id);
      const updated = exists
        ? availableDrivers.map((x)=> x.id===d.id ? { ...x, isAvailable: !!d.available, currentLocation: d.location, lastLocationUpdate: new Date().toISOString() } : x)
        : [...availableDrivers, {
            id: d.id,
            email: d.email || `${d.id}@drivers.local`, name: d.name, phone: '', role: 'driver', isVerified: true,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), licenseNumber: d.licenseNumber || '',
            vehicleType: d.vehicleType, vehicleModel: d.vehicleModel || 'Araç', licensePlate: d.licensePlate || '', rating: 4.7, totalRides: 0,
            isAvailable: !!d.available, currentLocation: d.location, lastLocationUpdate: new Date().toISOString()
          }]
      const loc = get().trackingLocation;
      const sorted = loc ? updated.filter(u=>u.currentLocation && u.isAvailable).sort((a,b)=>calc(loc,a.currentLocation!)-calc(loc,b.currentLocation!)) : updated;
      set({ availableDrivers: sorted as any });
    });
    s.on('booking:update', async (r: any) => {
      const { currentBooking } = get();
      
      // If we receive a full booking object with status 'accepted' (or later), update state
      // This is crucial for redirecting the customer from DriverSelection page
      if (r && r.status && ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(r.status)) {
         set({ currentBooking: r as any });
         return;
      }

      if (r && r.pickupLocation && r.dropoffLocation) {
        set({ currentBooking: r as any })
        return
      }
      if (currentBooking && currentBooking.id === r.id) {
        set({ currentBooking: { ...currentBooking, status: r.status, driverId: r.driverId } as any });
      }
    });
    s.on('ride:cancelled', (_ev: any) => {
      set({ error: 'Talep iptal edildi', availableDrivers: [] })
    })
    s.on('booking:create', (b: any) => {
      set({ currentBooking: b })
    })
    set({ socket: s });
    if (trackingLocation) {
      get().refreshApprovedDriversNear(trackingLocation);
      const iv = setInterval(() => {
        const loc = get().trackingLocation;
        if (loc) get().refreshApprovedDriversNear(loc);
      }, 5000);
      set({ updateInterval: iv as unknown as NodeJS.Timeout });
    }
  },
  cancelLastRequest: async (customerId?: string) => {
    const { lastRequestId } = get();
    if (!lastRequestId) return;
    try {
      await fetch(`${API}/drivers/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: lastRequestId, customerId })
      });
      set({ availableDrivers: [], lastRequestId: null });
    } catch {}
  },

  stopRealTimeUpdates: () => {
    const { socket, updateInterval } = get();
    if (socket) { socket.disconnect(); set({ socket: null }); }
    if (updateInterval) { clearInterval(updateInterval); set({ updateInterval: null }); }
  },
  refreshApprovedDriversNear: async (location: { lat: number, lng: number }) => {
    try {
      const res = await fetch(`${API}/drivers/list?status=approved`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'drivers_list_failed')
      const list = Array.isArray(data.data) ? data.data : []
      const mapped: Driver[] = list.map((c: any) => ({
        id: c.id,
        email: c.email || `${c.id}@drivers.local`,
        name: c.name,
        phone: c.phone || '',
        role: 'driver',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        licenseNumber: c.licenseNumber || '',
        vehicleType: c.vehicleType,
        vehicleModel: c.vehicleModel || 'Araç',
        licensePlate: c.licensePlate || '',
        rating: 4.7,
        totalRides: 0,
        isAvailable: !!c.available,
        currentLocation: c.location,
        lastLocationUpdate: new Date().toISOString(),
      }))
      const calc = (a: {lat:number,lng:number}, b: {lat:number,lng:number}) => {
        const R = 6371; const dLat = (b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
        const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
        return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
      }
      const sorted = mapped
        .filter(d => !!d.currentLocation && d.isAvailable)
        .sort((a,b)=>calc(location,a.currentLocation!)-calc(location,b.currentLocation!))
      set({ availableDrivers: sorted, trackingLocation: location })
      const { socket, updateInterval } = get()
      if (socket && !updateInterval) {
        const iv = setInterval(() => {
          const loc = get().trackingLocation
          if (loc) get().refreshApprovedDriversNear(loc)
        }, 5000)
        set({ updateInterval: iv as unknown as NodeJS.Timeout })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'drivers_refresh_failed' })
    }
  },
  confirmPickup: async (bookingId: string) => {
    await get().updateBookingStatus(bookingId, 'in_progress');
    get().startRouteRecording();
  },
  startRouteRecording: () => {
    set({ routeRecording: true, routePoints: [] });
  },
  appendRoutePoint: (pt: { lat: number, lng: number }) => {
    const { routeRecording, routePoints } = get();
    if (!routeRecording) return;
    const last = routePoints[routePoints.length - 1];
    if (!last || Math.hypot(pt.lat - last.lat, pt.lng - last.lng) > 0.00005) {
      set({ routePoints: [...routePoints, pt] });
    }
  },
  stopRouteRecordingAndSave: async (bookingId: string, customerPath?: Array<{ lat: number, lng: number }>) => {
    const { routePoints } = get();
    try {
      const response = await fetch(`${API}/bookings/${bookingId}/route`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ driverPath: routePoints, customerPath })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'route_save_failed');
      set({ currentBooking: data.data, routeRecording: false, routePoints: [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'route_save_failed' });
    }
  },
  refreshBookingById: async (bookingId: string) => {
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'booking_fetch_failed');
      set({ currentBooking: data.data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'booking_fetch_failed' });
    }
  },
  saveRouteProgress: async (bookingId?: string) => {
    const { routePoints, currentBooking } = get();
    const id = bookingId || currentBooking?.id;
    if (!id) return;
    try {
      const response = await fetch(`${API}/bookings/${id}/route`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ driverPath: routePoints })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'route_save_failed');
      set({ currentBooking: data.data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'route_save_failed' });
    }
  },
}));
