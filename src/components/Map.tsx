import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Driver } from '@/types';
import { toast } from 'sonner';
import { FallbackMap } from './FallbackMap';
import OpenStreetMap from './OpenStreetMap';

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  drivers?: Driver[];
  customerLocation?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  onDriverClick?: (driver: Driver) => void;
  showRoute?: boolean;
  path?: Array<{ lat: number; lng: number }>;
}

export const Map: React.FC<MapProps> = ({
  center,
  zoom = 13,
  drivers = [],
  customerLocation,
  destination,
  onDriverClick,
  showRoute = false,
  path,
}) => {
  console.log('📍 Map component render ediliyor, props:', { center, zoom, hasCustomerLocation: !!customerLocation });
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [customerMarker, setCustomerMarker] = useState<any>(null);
  const [driverMarkers, setDriverMarkers] = useState<any[]>([]);
  const [routePolyline, setRoutePolyline] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);

  useEffect(() => {
    const initMap = async () => {
      console.log('📍 Map.initMap() başlatılıyor...');
      
      // DOM elementinin hazır olmasını bekle
      const checkAndInitMap = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          if (mapRef.current) {
            console.log('📍 Harita containerı bulundu (attempt:', attempts + 1, ')');
            break;
          }
          
          console.log('📍 Harita containerı henüz hazır değil, bekleniyor...');
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        if (!mapRef.current) {
          console.error('📍 mapRef.current bulunamadı!');
          setMapError(true);
          setMapLoading(false);
          return;
        }
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        if (!apiKey) {
          console.error('📍 Google Maps API anahtarı eksik. OSM fallback kullanılacak.');
          setUseOsmFallback(true);
          setMapLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        try {
          console.log('📍 Google Maps yükleniyor...');
          await loader.load();
          console.log('📍 Google Maps yüklendi');
          
          console.log('📍 Harita oluşturuluyor...');
          
          const googleMap = new window.google.maps.Map(mapRef.current, {
            center,
            zoom,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          console.log('📍 Google Maps nesnesi oluşturuldu');
          setMap(googleMap);
          
          // Initialize directions renderer for real routes
          const renderer = new window.google.maps.DirectionsRenderer({
            map: googleMap,
            suppressMarkers: true, // We use custom markers
            polylineOptions: {
              strokeColor: '#2563eb',
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          });
          setDirectionsRenderer(renderer);
          
          setMapLoading(false);
          console.log('📍 Harita state güncellendi, merkez:', center);
        } catch (error) {
          console.error('📍 Google Maps yükleme hatası:', error);
          console.log('📍 Google Maps başarısız, OSM fallback gösteriliyor');
          setUseOsmFallback(true);
          setMapError(true);
          setMapLoading(false);
          toast.error('Google Maps yüklenemedi. OpenStreetMap kullanılıyor.');
        }
      };

      await checkAndInitMap();
    };

    initMap();
  }, []);

  useEffect(() => {
    if (map && center) {
      try {
        map.setCenter(center);
        map.setZoom(zoom);
      } catch {}
    }
  }, [map, center, zoom]);

  // Update customer location marker
  useEffect(() => {
    if (map && customerLocation) {
      console.log('📍 Müşteri konumu işaretleniyor:', customerLocation);
      if (customerMarker) {
        try { customerMarker.setMap(null); } catch {}
      }
      const marker = new window.google.maps.Marker({
        position: customerLocation,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Sizin Konumunuz',
        animation: window.google.maps.Animation.DROP,
      });
      setCustomerMarker(marker);
      map.setCenter(customerLocation);
      console.log('📍 Harita merkezi müşteri konumuna ayarlandı');
    }
  }, [map, customerLocation]);

  // Update driver markers
  useEffect(() => {
    if (map) {
      driverMarkers.forEach(m => { try { m.setMap(null); } catch {} });
      const newMarkers = drivers.map(driver => {
        if (driver.currentLocation) {
          const marker = new window.google.maps.Marker({
            position: driver.currentLocation,
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: `${driver.name} - ${driver.vehicleModel}`,
          });
          if (onDriverClick) {
            marker.addListener('click', () => {
              onDriverClick(driver);
            });
          }
          return marker;
        }
        return null;
      }).filter(Boolean) as any[];
      setDriverMarkers(newMarkers);
    }
  }, [map, drivers, onDriverClick]);

  // Draw route with real directions
  useEffect(() => {
    if (map && customerLocation && destination && showRoute && directionsRenderer) {
      // Use Directions Service for real road route
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: customerLocation,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Fit bounds to show entire route
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].bounds.extend(bounds.getNorthEast());
            result.routes[0].bounds.extend(bounds.getSouthWest());
            map.fitBounds(result.routes[0].bounds, 50);
          } else {
            console.error('Directions request failed:', status);
            // Fallback to straight line
            const route = new window.google.maps.Polyline({
              path: [customerLocation, destination],
              geodesic: true,
              strokeColor: '#2563eb',
              strokeOpacity: 0.8,
              strokeWeight: 4,
            });
            route.setMap(map);
            setRoutePolyline(route);
            
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(customerLocation);
            bounds.extend(destination);
            map.fitBounds(bounds);
          }
        }
      );
    }
  }, [map, customerLocation, destination, showRoute, directionsRenderer]);

  // Draw driver path
  useEffect(() => {
    if (map && Array.isArray(path) && path.length > 1) {
      const poly = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0ea5e9',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      poly.setMap(map);
    }
  }, [map, path]);

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan': return '🚗';
      case 'suv': return '🚙';
      case 'van': return '🚐';
      case 'luxury': return '🏎️';
      default: return '🚗';
    }
  };

  if (mapLoading) {
    console.log('📍 Map.render(): Harita yükleniyor durumu gösteriliyor');
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Harita yükleniyor...</p>
        </div>
      </div>
    );
  }

  console.log('📍 Map.render(): Harita yüklendi, harita gösteriliyor');

  if (mapError || useOsmFallback) {
    const osmDrivers = drivers.map(d => ({
      id: d.id,
      name: d.name,
      location: d.currentLocation || center,
      rating: d.rating || 0,
      available: d.isAvailable ?? true,
    }));
    return (
      <div className="relative w-full h-full map-container">
        <OpenStreetMap
          center={customerLocation || center}
          customerLocation={customerLocation || center}
          destination={destination}
          drivers={osmDrivers}
          path={path}
          onDriverClick={(driver) => {
            const found = drivers.find(d => d.id === driver.id);
            if (found && onDriverClick) onDriverClick(found);
          }}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full map-container">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => {
            if (map && customerLocation) {
              map.setCenter(customerLocation);
              map.setZoom(15);
            }
          }}
          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          📍 Konumuma Git
        </button>
        <button
          onClick={() => {
            if (map && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                map.setCenter(pos);
                map.setZoom(15);
              });
            }
          }}
          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          🎯 Mevcut Konumum
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Araç Türleri</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <span className="mr-2">🚗</span>
            <span>Sedan</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">🚙</span>
            <span>SUV</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">🚐</span>
            <span>Van</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">🏎️</span>
            <span>Lüks</span>
          </div>
        </div>
      </div>
    </div>
  );
};
