import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/Button';
import { Star, MapPin, Clock, Users, Car, Phone } from 'lucide-react';
import { Driver } from '@/types';

export const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { availableDrivers, searchDrivers, isLoading } = useBookingStore();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const pickup = searchParams.get('pickup');
  const dropoff = searchParams.get('dropoff');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const passengers = searchParams.get('passengers');
  const vehicle = searchParams.get('vehicle');

  useEffect(() => {
    if (pickup && dropoff) {
      // Mock search - in real app, this would call the API
      const mockDrivers: Driver[] = [
        {
          id: '1',
          name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          phone: '+90 555 123 4567',
          role: 'driver',
          isVerified: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          licenseNumber: '123456',
          vehicleType: 'sedan',
          vehicleModel: 'Toyota Camry 2020',
          licensePlate: '34 ABC 123',
          rating: 4.8,
          totalRides: 125,
          isAvailable: true,
          currentLocation: { lat: 41.0082, lng: 28.9784 },
          lastLocationUpdate: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Mehmet Demir',
          email: 'mehmet@example.com',
          phone: '+90 555 987 6543',
          role: 'driver',
          isVerified: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          licenseNumber: '789012',
          vehicleType: 'suv',
          vehicleModel: 'BMW X5 2021',
          licensePlate: '34 XYZ 789',
          rating: 4.9,
          totalRides: 89,
          isAvailable: true,
          currentLocation: { lat: 41.0082, lng: 28.9784 },
          lastLocationUpdate: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Ali Kaya',
          email: 'ali@example.com',
          phone: '+90 555 456 7890',
          role: 'driver',
          isVerified: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          licenseNumber: '345678',
          vehicleType: 'van',
          vehicleModel: 'Mercedes Vito 2019',
          licensePlate: '34 DEF 456',
          rating: 4.7,
          totalRides: 203,
          isAvailable: true,
          currentLocation: { lat: 41.0082, lng: 28.9784 },
          lastLocationUpdate: new Date().toISOString(),
        },
      ];
      
      // In a real app, you would call: searchDrivers(pickupLocation, dropoffLocation, filters);
      useBookingStore.setState({ availableDrivers: mockDrivers });
    }
  }, [pickup, dropoff]);

  const handleBookDriver = (driverId: string) => {
    setSelectedDriver(driverId);
    // Navigate to booking page with driver and trip details
    const bookingData = {
      driverId,
      pickup,
      dropoff,
      date,
      time,
      passengers,
      vehicle,
    };
    navigate('/booking/new', { state: bookingData });
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan': return '🚗';
      case 'suv': return '🚙';
      case 'van': return '🚐';
      case 'luxury': return '🏎️';
      default: return '🚗';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mevcut Sürücüler</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-gray-500 mr-2" />
              <span><strong>Alış:</strong> {pickup}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-gray-500 mr-2" />
              <span><strong>Varış:</strong> {dropoff}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-500 mr-2" />
              <span><strong>Tarih:</strong> {date} {time}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-500 mr-2" />
              <span><strong>Yolcu:</strong> {passengers}</span>
            </div>
          </div>
        </div>

        {/* Driver Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Sürücüler aranıyor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableDrivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-gray-200 rounded-full p-3 mr-4">
                      <Car className="h-8 w-8 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                      <p className="text-sm text-gray-600">{driver.vehicleModel}</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{driver.rating} ({driver.totalRides} yolculuk)</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">₺{Math.floor(Math.random() * 200) + 300}</div>
                    <p className="text-sm text-gray-500">Tahmini ücret</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Araç Türü</p>
                    <p className="font-medium flex items-center">
                      <span className="mr-1">{getVehicleIcon(driver.vehicleType)}</span>
                      {driver.vehicleType.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Plaka</p>
                    <p className="font-medium">{driver.licensePlate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Telefon</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {driver.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Durum</p>
                    <p className="font-medium text-green-600">Müsait</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {/* Show driver details */}}
                  >
                    Detaylar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleBookDriver(driver.id)}
                    disabled={selectedDriver === driver.id}
                  >
                    {selectedDriver === driver.id ? 'Seçildi' : 'Rezervasyon Yap'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableDrivers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sürücü bulunamadı</h3>
            <p className="text-gray-600 mb-4">Seçtiğiniz kriterlere uygun sürücü bulunamadı.</p>
            <Button onClick={() => navigate('/')}>
              Yeni Arama Yap
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};