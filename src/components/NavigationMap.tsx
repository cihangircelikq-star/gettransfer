import React, { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Location {
  lat: number
  lng: number
  address?: string
}

interface NavigationMapProps {
  mode: 'driver' | 'customer'
  origin?: Location
  destination?: Location
  pickup?: Location
  status?: 'navigating_to_pickup' | 'navigating_to_dropoff' | 'waiting' | 'idle'
  onArrival?: () => void
  onRouteUpdate?: (distance: number, duration: number) => void
  className?: string
}

interface RouteInfo {
  distance: number
  duration: number
  geometry: [number, number][]
  steps: RouteStep[]
}

interface RouteStep {
  instruction: string
  distance: number
  duration: number
  name: string
  location?: [number, number]
}

// OSRM'den dönüş talimatları çeviri
const translateInstruction = (type: string, modifier?: string): string => {
  const translations: Record<string, string> = {
    'turn': 'Dönüş',
    'new name': 'Yola devam',
    'depart': 'Çıkış',
    'arrive': 'Varış',
    'merge': 'Birleşme',
    'on ramp': 'Giriş rampası',
    'off ramp': 'Çıkış rampası',
    'fork': 'Kavşak',
    'roundabout': 'Döner kavşak',
    'exit roundabout': 'Döner kavşaktan çık',
    'continue': 'Devam et',
  }
  
  const modifiers: Record<string, string> = {
    'left': 'sola',
    'right': 'sağa', 
    'straight': 'düz',
    'slight left': 'hafif sola',
    'slight right': 'hafif sağa',
    'sharp left': 'keskin sola',
    'sharp right': 'keskin sağa',
    'uturn': 'U dönüşü',
  }
  
  const t = translations[type] || type
  const m = modifier ? modifiers[modifier] || modifier : ''
  return m ? `${t} ${m}` : t
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  mode,
  origin,
  destination,
  pickup,
  status = 'idle',
  onArrival,
  onRouteUpdate,
  className = 'h-full w-full'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const driverMarker = useRef<maplibregl.Marker | null>(null)
  const destinationMarker = useRef<maplibregl.Marker | null>(null)
  const pickupMarker = useRef<maplibregl.Marker | null>(null)
  
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // Harita başlatma
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Ücretsiz stil
      center: [29.0, 41.0],
      zoom: 12,
      pitch: 45,
      bearing: 0,
    })

    // Navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    
    // Geolocate control
    map.current.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-left')

    // Style yüklendikten sonra
    map.current.on('load', () => {
      console.log('🗺️ Map loaded')
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Rota hesaplama - OSRM
  const calculateRoute = useCallback(async (start: Location, end: Location) => {
    setLoading(true)
    setError(null)

    try {
      // OSRM - Turn-by-turn directions
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=true&annotations=true`

      const response = await fetch(url)
      const data = await response.json()

      if (data.code !== 'Ok' || !data.routes?.length) {
        throw new Error('Rota bulunamadı')
      }

      const route = data.routes[0]
      const coordinates: [number, number][] = route.geometry.coordinates

      // Manevra adımları
      const steps: RouteStep[] = route.legs[0].steps.map((s: any) => ({
        instruction: translateInstruction(s.maneuver?.type, s.maneuver?.modifier),
        distance: s.distance,
        duration: s.duration,
        name: s.name || '',
        location: s.maneuver?.location
      }))

      // Haritaya rota çiz
      if (map.current) {
        // Eski kaynak varsa güncelle, yoksa oluştur
        if (map.current.getSource('route')) {
          (map.current.getSource('route') as maplibregl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates }
          })
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates }
            }
          })

          // Rota çizgisi - Ana
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': mode === 'driver' ? '#3b82f6' : '#22c55e',
              'line-width': 6
            }
          })

          // Rota glow
          map.current.addLayer({
            id: 'route-glow',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': mode === 'driver' ? '#3b82f6' : '#22c55e',
              'line-width': 12,
              'line-opacity': 0.3,
              'line-blur': 5
            }
          }, 'route')
        }

        // Haritayı rotaya sığdır
        const bounds = new maplibregl.LngLatBounds()
        coordinates.forEach(c => bounds.extend(c as [number, number]))
        map.current.fitBounds(bounds, { padding: 80, pitch: 45, duration: 1000 })
      }

      const info: RouteInfo = {
        distance: route.distance,
        duration: route.duration,
        geometry: coordinates,
        steps
      }

      setRouteInfo(info)
      onRouteUpdate?.(route.distance, route.duration)

      return info
    } catch (err: any) {
      console.error('Route error:', err)
      setError(err.message || 'Rota hesaplanamadı')
      return null
    } finally {
      setLoading(false)
    }
  }, [mode, onRouteUpdate])

  // Driver marker - araba ikonu
  const createDriverMarker = () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      ">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
    `
    return el
  }

  // Destination marker - pin ikonu
  const createDestinationMarker = (label: string, color: string) => {
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 44px;
        height: 44px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${label}</span>
      </div>
    `
    return el
  }

  // Marker'ları güncelle
  useEffect(() => {
    if (!map.current) return

    // Driver marker
    if (origin) {
      if (!driverMarker.current) {
        driverMarker.current = new maplibregl.Marker({ 
          element: createDriverMarker(), 
          anchor: 'center' 
        })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map.current)
      } else {
        // Animasyonlu hareket
        driverMarker.current.setLngLat([origin.lng, origin.lat])
      }
      
      // Harita merkezini sürücüye ayarla
      if (status === 'navigating_to_pickup' || status === 'navigating_to_dropoff') {
        map.current.setCenter([origin.lng, origin.lat])
      }
    }

    // Pickup marker
    if (pickup && (status === 'navigating_to_pickup' || status === 'waiting')) {
      if (!pickupMarker.current) {
        pickupMarker.current = new maplibregl.Marker({ 
          element: createDestinationMarker('A', '#22c55e'),
          anchor: 'bottom'
        })
          .setLngLat([pickup.lng, pickup.lat])
          .addTo(map.current)
      }
    }

    // Destination marker
    if (destination) {
      if (!destinationMarker.current) {
        destinationMarker.current = new maplibregl.Marker({ 
          element: createDestinationMarker('B', '#ef4444'),
          anchor: 'bottom'
        })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map.current)
      }
    }
  }, [origin, destination, pickup, status])

  // Rota hesapla
  useEffect(() => {
    if (!origin) return

    if (status === 'navigating_to_pickup' && pickup) {
      calculateRoute(origin, pickup)
    } else if (status === 'navigating_to_dropoff' && destination) {
      calculateRoute(origin, destination)
    }
  }, [origin, destination, pickup, status, calculateRoute])

  // Format helpers
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours} sa ${minutes} dk`
    }
    return `${minutes} dk`
  }

  // Sonraki adımı al
  const nextStep = routeInfo?.steps[currentStep + 1]
  const currentStepInfo = routeInfo?.steps[currentStep]

  return (
    <div className={`relative ${className}`}>
      {/* Harita */}
      <div ref={mapContainer} className="h-full w-full rounded-lg overflow-hidden" />
      
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-6 flex items-center gap-4 shadow-2xl">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div>
              <p className="text-white font-semibold">Rota Hesaplanıyor</p>
              <p className="text-gray-400 text-sm">En hızlı yol bulunuyor...</p>
            </div>
          </div>
        </div>
      )}

      {/* Üst Panel - Navigasyon Bilgisi */}
      {routeInfo && !loading && (
        <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-10">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            {/* Hedef Başlığı */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-medium tracking-wide">HEDEF</p>
                  <p className="text-white font-bold text-lg truncate">
                    {status === 'navigating_to_pickup' ? pickup?.address : destination?.address}
                  </p>
                </div>
              </div>
            </div>

            {/* ETA ve Mesafe */}
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="text-center bg-gray-800 rounded-xl p-3">
                <div className="text-4xl font-bold text-white">
                  {formatDuration(routeInfo.duration)}
                </div>
                <div className="text-gray-400 text-sm mt-1">Tahmini Süre</div>
              </div>
              <div className="text-center bg-gray-800 rounded-xl p-3">
                <div className="text-4xl font-bold text-white">
                  {formatDistance(routeInfo.distance)}
                </div>
                <div className="text-gray-400 text-sm mt-1">Mesafe</div>
              </div>
            </div>

            {/* Sonraki Dönüş */}
            {nextStep && currentStepInfo && (
              <div className="px-5 pb-5">
                <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{nextStep.instruction}</p>
                      <p className="text-gray-400 text-sm">
                        {formatDistance(nextStep.distance)} sonra
                        {nextStep.name && ` • ${nextStep.name}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Durum Badge */}
            <div className="px-5 pb-5">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                status === 'navigating_to_pickup' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                status === 'navigating_to_dropoff' ? 'bg-green-500/20 border border-green-500/30' :
                'bg-gray-700 border border-gray-600'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  status === 'navigating_to_pickup' ? 'bg-yellow-400 animate-pulse' :
                  status === 'navigating_to_dropoff' ? 'bg-green-400 animate-pulse' :
                  'bg-gray-500'
                }`} />
                <span className="text-white font-medium">
                  {status === 'navigating_to_pickup' && '🚗 Müşteriye doğru gidiyorsunuz'}
                  {status === 'navigating_to_dropoff' && '🎯 Hedefe doğru gidiyorsunuz'}
                  {status === 'waiting' && '⏳ Bekleniyor'}
                  {status === 'idle' && '📍 Rota hazır'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alt Bilgi - Mini Stats */}
      {routeInfo && !loading && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-gray-900/90 backdrop-blur rounded-xl px-5 py-4 flex items-center justify-between shadow-xl border border-gray-700">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="text-white font-medium">{formatDistance(routeInfo.distance)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-medium">{formatDuration(routeInfo.duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm font-medium">En Hızlı Rota</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-xl z-10 shadow-xl">
          <p className="font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}

export default NavigationMap
