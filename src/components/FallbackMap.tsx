import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface FallbackMapProps {
  center: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  drivers?: Array<{
    id: string;
    name: string;
    currentLocation: { lat: number; lng: number };
    vehicleType: string;
  }>;
  onDriverClick?: (driver: any) => void;
}

export const FallbackMap: React.FC<FallbackMapProps> = ({
  center,
  customerLocation,
  destination,
  drivers = [],
  onDriverClick,
}) => {
  return (
    <div className="w-full h-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-4">
        <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Harita Yüklenemedi</h3>
        <p className="text-sm text-gray-600 mb-4">
          Google Maps API anahtarı geçersiz veya eksik. Konum bilgileri aşağıda gösteriliyor.
        </p>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 w-full max-w-sm">
        <div className="space-y-3">
          {customerLocation && (
            <div className="flex items-center space-x-3">
              <Navigation className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Sizin Konumunuz</p>
                <p className="text-xs text-gray-500">
                  Enlem: {customerLocation.lat.toFixed(6)}, Boylam: {customerLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {destination && (
            <div className="flex items-center space-x-3">
              <MapPin className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Varış Noktası</p>
                <p className="text-xs text-gray-500">
                  Enlem: {destination.lat.toFixed(6)}, Boylam: {destination.lng.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {drivers.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-900 mb-2">Yakındaki Sürücüler</p>
              <div className="space-y-2">
                {drivers.slice(0, 3).map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => onDriverClick?.(driver)}
                  >
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                      <p className="text-xs text-gray-500">
                        {driver.vehicleType} - {driver.currentLocation.lat.toFixed(4)}, {driver.currentLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          💡 Gerçek bir deneyim için geçerli bir Google Maps API anahtarı ekleyin.
        </p>
      </div>
    </div>
  );
};