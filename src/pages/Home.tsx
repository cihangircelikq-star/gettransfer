import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import OpenStreetMap from '@/components/OpenStreetMap';
import { LocationDetector } from '@/components/LocationDetector';
import { MapPin, Navigation, Car, User, LogOut, LogIn, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/utils/api';

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
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser, setTokens, logout } = useAuthStore();
  const { 
    availableDrivers, 
    refreshApprovedDriversNear, 
    startRealTimeUpdates, 
    stopRealTimeUpdates,
    currentBooking,
    setCurrentBooking
  } = useBookingStore();
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Aktif booking kontrol - hem store hem API'den
  const activeBooking = currentBooking && ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(currentBooking.status) 
    ? currentBooking 
    : null

  // Google OAuth callback
  useEffect(() => {
    const authSuccess = searchParams.get('auth_success');
    const authError = searchParams.get('auth_error');
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (authError) {
      toast.error('Google giriş hatası');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (authSuccess === 'true' && token && userJson) {
      try {
        const u = JSON.parse(decodeURIComponent(userJson));
        setUser(u);
        setTokens(token, 'refresh_token');
        toast.success('Giriş başarılı!');
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        toast.error('Giriş hatası');
      }
    }
  }, [searchParams, setUser, setTokens]);

  // Aktif booking varsa customer dashboard'a yönlendir
  useEffect(() => {
    if (activeBooking && user && user.role === 'customer') {
      // Kısa bir gecikme ile yönlendir, kullanıcı durumu görsün
      const timeout = setTimeout(() => {
        navigate('/customer/dashboard');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [activeBooking, user, navigate]);

  // Backend'den aktif booking kontrolü
  useEffect(() => {
    const checkActiveBooking = async () => {
      if (user?.id && user.role === 'customer' && !currentBooking) {
        try {
          const res = await fetch(`${API}/bookings/by-customer/${user.id}`)
          if (res.ok) {
            const j = await res.json()
            if (j.success && Array.isArray(j.data)) {
              const active = j.data.find((b: Booking) => 
                ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(b.status)
              )
              if (active) {
                setCurrentBooking(active)
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
    checkActiveBooking()
  }, [user, currentBooking, setCurrentBooking])

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

    const initLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mounted) return
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            console.log('✅ GPS konumu alındı:', loc)
            setCurrentLocation(loc)
            refreshApprovedDriversNear(loc)
            startRealTimeUpdates()
          },
          async (err) => {
            console.warn('GPS hatası, IP konumu deneniyor:', err.message)
            if (!mounted) return
            
            // IP bazlı konum dene
            const ipLoc = await fetchIpLocation()
            if (ipLoc && mounted) {
              console.log('✅ IP konumu alındı:', ipLoc)
              setCurrentLocation(ipLoc)
              refreshApprovedDriversNear(ipLoc)
              startRealTimeUpdates()
              toast.info('Yaklaşık konumunuz kullanılıyor')
            } else if (mounted) {
              // Varsayılan (Antalya merkez)
              const defaultLoc = { lat: 36.88, lng: 30.7 }
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

  // Konum algılandığında
  const handleLocationDetected = (location: { lat: number; lng: number }) => {
    setCurrentLocation(location);
    refreshApprovedDriversNear(location);
    startRealTimeUpdates();
  };

  // Adres önerileri
  useEffect(() => {
    if (destination.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setShowSuggestions(true);
    
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&q=${encodeURIComponent(destination)}`,
          { headers: { 'User-Agent': 'GetTransfer/1.0', 'Accept-Language': 'tr' } }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.map((item: { display_name: string; lat: string; lon: string }) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          })));
        }
      } catch {
        /* ignore */
      }
    }, 400);
    
    return () => clearTimeout(timeout);
  }, [destination]);

  // Dışarı tıklandığında
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Çıkış yap
  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    toast.success('Çıkış yapıldı');
  };

  // Araç çağır
  const handleRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!currentLocation) {
      toast.error('Konumunuzu belirleyin');
      return;
    }
    
    if (!destinationLocation) {
      toast.error('Varış adresi seçin');
      return;
    }

    navigate('/select-driver', {
      state: {
        pickupLocation: { lat: currentLocation.lat, lng: currentLocation.lng, address: 'Mevcut Konum' },
        dropoffLocation: { lat: destinationLocation.lat, lng: destinationLocation.lng, address: destination },
        pickupTime: new Date().toISOString(),
        passengerCount: 1,
        vehicleType: 'sedan'
      }
    });
  };

  // Adres seç
  const selectAddress = (s: { label: string; lat: number; lng: number }) => {
    setDestination(s.label);
    setDestinationLocation({ lat: s.lat, lng: s.lng });
    setShowSuggestions(false);
  };

  // Durum çevirisi
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Sürücü aranıyor...'
      case 'accepted': return 'Sürücü atandı'
      case 'driver_en_route': return 'Sürücü yolda'
      case 'driver_arrived': return 'Sürücü geldi!'
      case 'in_progress': return 'Yolculukta'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      case 'driver_arrived': return 'text-green-400 bg-green-500/20'
      case 'in_progress': return 'text-purple-400 bg-purple-500/20'
      case 'driver_en_route': return 'text-blue-400 bg-blue-500/20'
      default: return 'text-blue-400 bg-blue-500/20'
    }
  }

  const nearbyDrivers = availableDrivers.filter(d => d.isAvailable && d.currentLocation);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Car className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-white">GetTransfer</span>
          </div>
          
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="text-sm">{user.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (user.role === 'driver') navigate('/driver/dashboard');
                      else navigate('/customer/dashboard');
                    }}
                    className="w-full text-left px-4 py-3 text-gray-200 hover:bg-gray-600 flex items-center gap-2 rounded-t-lg"
                  >
                    <Car className="h-4 w-4" />
                    Panelim
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-600 flex items-center gap-2 rounded-b-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <LogIn className="h-4 w-4" />
              Giriş Yap
            </button>
          )}
        </div>
      </header>

      {/* Aktif Talep Uyarısı */}
      {activeBooking && (
        <div className={`mx-4 mt-4 p-4 rounded-lg ${
          activeBooking.status === 'pending' ? 'bg-yellow-900/50 border border-yellow-600' :
          activeBooking.status === 'driver_arrived' ? 'bg-green-900/50 border border-green-500' :
          'bg-blue-900/50 border border-blue-600'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-bold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Aktif Talebiniz Var!
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(activeBooking.status)}`}>
              {getStatusText(activeBooking.status)}
            </span>
          </div>
          
          <div className="text-sm text-gray-300 mb-3">
            <p className="truncate">{activeBooking.pickupLocation?.address}</p>
            <p className="truncate">→ {activeBooking.dropoffLocation?.address}</p>
          </div>

          <button
            onClick={() => navigate('/customer/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
          >
            Takip Et →
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sol Panel */}
        <div className="w-full lg:w-96 bg-gray-800 border-r border-gray-700 p-4 flex flex-col gap-4">
          
          {/* Aktif talep yoksa formu göster */}
          {!activeBooking && (
            <>
              {/* Konum Durumu */}
              {currentLocation ? (
                <div className="bg-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Konumunuz belirlendi</p>
                    <p className="text-xs text-green-300">Sizi buradan alacağız</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300 mb-2">Konum belirleniyor...</p>
                  <LocationDetector
                    onLocationDetected={handleLocationDetected}
                    onLocationError={() => toast.error('Konum alınamadı')}
                  />
                </div>
              )}

              {/* Varış Adresi */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm text-gray-400 mb-2">Varış Adresi</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onFocus={() => destination.length >= 2 && setShowSuggestions(true)}
                    placeholder="Nereye gitmek istiyorsunuz?"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {showSuggestions && (
                  <div className="absolute z-30 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-blue-600 hover:text-white border-b border-gray-600 last:border-0 transition-colors"
                          onClick={() => selectAddress(s)}
                        >
                          <MapPin className="h-4 w-4 inline mr-2 text-gray-400" />
                          {s.label}
                        </button>
                      ))
                    ) : destination.length >= 2 ? (
                      <div className="px-4 py-3 text-gray-400 text-sm">Adres aranıyor...</div>
                    ) : null}
                  </div>
                )}
                
                {destinationLocation && !showSuggestions && (
                  <div className="mt-2 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{destination}</span>
                    <button onClick={() => { setDestination(''); setDestinationLocation(null); }} className="ml-auto text-blue-400 hover:text-white">✕</button>
                  </div>
                )}
              </div>

              {/* Yakın Sürücüler */}
              {nearbyDrivers.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Yakın Sürücüler</span>
                    <span className="text-2xl font-bold text-green-400">{nearbyDrivers.length}</span>
                  </div>
                  <p className="text-gray-500 text-xs">Sürücüler haritada görünüyor</p>
                </div>
              )}

              {/* Araç Çağır Butonu */}
              <button
                onClick={handleRequest}
                disabled={!currentLocation || !destinationLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg transition-colors mt-auto"
              >
                <Car className="h-5 w-5 inline mr-2" />
                Araç Çağır
              </button>

              {/* Kayıt Ol Linki */}
              {!user && (
                <p className="text-center text-gray-400 text-sm">
                  Hesabınız yok mu?{' '}
                  <button onClick={() => navigate('/register')} className="text-blue-400 hover:underline">Kayıt olun</button>
                </p>
              )}

              {/* Sürücü Girişi */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => navigate('/driver/login')}
                  className="w-full text-center text-gray-400 hover:text-white py-2 text-sm"
                >
                  Sürücü misiniz? Giriş yapın
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sağ Panel - Harita */}
        <div className="flex-1 relative min-h-[300px] lg:min-h-0">
          {currentLocation ? (
            <OpenStreetMap
              center={activeBooking?.pickupLocation || currentLocation}
              customerLocation={currentLocation}
              destination={activeBooking?.dropoffLocation || destinationLocation || undefined}
              drivers={nearbyDrivers.map(d => ({
                id: d.id,
                name: d.name,
                location: d.currentLocation!,
                rating: d.rating,
                available: d.isAvailable
              }))}
              showRoute={!!activeBooking || !!destinationLocation}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-850">
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Konumunuz bekleniyor...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}
