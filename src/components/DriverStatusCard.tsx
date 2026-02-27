import React from 'react';
import { Driver } from '@/types';
import { calculateDistance } from '@/utils/mockData';
import { MapPin, Clock, Star, Car } from 'lucide-react';

interface DriverStatusCardProps {
  driver: Driver;
  customerLocation: { lat: number; lng: number };
  onSelect?: (driver: Driver) => void;
  isSelected?: boolean;
}

export const DriverStatusCard: React.FC<DriverStatusCardProps> = ({
  driver,
  customerLocation,
  onSelect,
  isSelected = false,
}) => {
  const distance = calculateDistance(
    customerLocation.lat,
    customerLocation.lng,
    driver.currentLocation.lat,
    driver.currentLocation.lng
  );

  const estimatedArrival = Math.round(distance * 3); // 3 minutes per km

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan': return '🚗';
      case 'suv': return '🚙';
      case 'van': return '🚐';
      case 'luxury': return '🏎️';
      default: return '🚗';
    }
  };

  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = (isAvailable: boolean) => {
    return isAvailable ? 'Müsait' : 'Meşgul';
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent'
      }`}
      onClick={() => onSelect?.(driver)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getVehicleIcon(driver.vehicleType)}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{driver.name}</h3>
            <p className="text-sm text-gray-600">{driver.vehicleModel}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(driver.isAvailable)}`}>
          {getStatusText(driver.isAvailable)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center text-yellow-500 mb-1">
            <Star className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{driver.rating}</span>
          </div>
          <p className="text-xs text-gray-500">Puan</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center text-blue-500 mb-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{distance.toFixed(1)} km</span>
          </div>
          <p className="text-xs text-gray-500">Mesafe</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center text-green-500 mb-1">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{estimatedArrival} dk</span>
          </div>
          <p className="text-xs text-gray-500">Tahmini varış</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Plaka: {driver.licensePlate}</span>
        <span>{driver.totalRides} yolculuk</span>
      </div>

      {/* Gallery thumbnails from local storage */}
      {(() => {
        try {
          const key = `driver_profile_${driver.id}`
          const j = JSON.parse(localStorage.getItem(key) || '{}')
          const images = Array.isArray(j.vehicleImages) ? j.vehicleImages : []
          if (images.length === 0) return null
          return (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.slice(0,3).map((v:any,i:number)=>(<img key={i} src={v.thumb||v.full} alt="araç" className="rounded object-cover w-full h-16" />))}
            </div>
          )
        } catch { return null }
      })()}

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm text-center">
            Bu sürücü seçildi
          </div>
        </div>
      )}
    </div>
  );
};
