import { Driver } from '@/types';

// Mock driver data for demonstration
export const generateMockDrivers = (centerLat: number, centerLng: number): Driver[] => {
  const drivers: Driver[] = [
    {
      id: 'driver-1',
      name: 'Ahmet Yılmaz',
      email: 'ahmet@example.com',
      phone: '+90 555 123 4567',
      role: 'driver',
      isVerified: true,
      licenseNumber: 'DRV123456',
      vehicleType: 'sedan',
      vehicleModel: 'Toyota Corolla',
      vehicleYear: 2020,
      licensePlate: '34 ABC 123',
      rating: 4.8,
      totalRides: 342,
      isAvailable: true,
      currentLocation: {
        lat: centerLat + 0.005,
        lng: centerLng + 0.003,
      },
      documents: [],
      createdAt: '2023-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'driver-2',
      name: 'Mehmet Demir',
      email: 'mehmet@example.com',
      phone: '+90 555 234 5678',
      role: 'driver',
      isVerified: true,
      licenseNumber: 'DRV234567',
      vehicleType: 'suv',
      vehicleModel: 'BMW X5',
      vehicleYear: 2021,
      licensePlate: '34 DEF 456',
      rating: 4.9,
      totalRides: 567,
      isAvailable: true,
      currentLocation: {
        lat: centerLat - 0.002,
        lng: centerLng + 0.007,
      },
      documents: [],
      createdAt: '2023-02-20T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'driver-3',
      name: 'Ali Kaya',
      email: 'ali@example.com',
      phone: '+90 555 345 6789',
      role: 'driver',
      isVerified: true,
      licenseNumber: 'DRV345678',
      vehicleType: 'van',
      vehicleModel: 'Mercedes Vito',
      vehicleYear: 2019,
      licensePlate: '34 GHI 789',
      rating: 4.7,
      totalRides: 234,
      isAvailable: true,
      currentLocation: {
        lat: centerLat + 0.008,
        lng: centerLng - 0.004,
      },
      documents: [],
      createdAt: '2023-03-10T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'driver-4',
      name: 'Veli Şahin',
      email: 'veli@example.com',
      phone: '+90 555 456 7890',
      role: 'driver',
      isVerified: true,
      licenseNumber: 'DRV456789',
      vehicleType: 'luxury',
      vehicleModel: 'Mercedes S-Class',
      vehicleYear: 2022,
      licensePlate: '34 JKL 012',
      rating: 4.9,
      totalRides: 189,
      isAvailable: true,
      currentLocation: {
        lat: centerLat - 0.006,
        lng: centerLng - 0.008,
      },
      documents: [],
      createdAt: '2023-04-05T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'driver-5',
      name: 'Hüseyin Çelik',
      email: 'huseyin@example.com',
      phone: '+90 555 567 8901',
      role: 'driver',
      isVerified: true,
      licenseNumber: 'DRV567890',
      vehicleType: 'sedan',
      vehicleModel: 'Honda Civic',
      vehicleYear: 2020,
      licensePlate: '34 MNO 345',
      rating: 4.6,
      totalRides: 445,
      isAvailable: false,
      currentLocation: {
        lat: centerLat + 0.012,
        lng: centerLng + 0.009,
      },
      documents: [],
      createdAt: '2023-05-12T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
  ];

  return drivers;
};

// Simulate real-time driver location updates
export const updateDriverLocations = (drivers: Driver[]): Driver[] => {
  return drivers.map(driver => {
    if (driver.isAvailable && Math.random() > 0.7) {
      // Small random movement for available drivers
      const latChange = (Math.random() - 0.5) * 0.0002;
      const lngChange = (Math.random() - 0.5) * 0.0002;
      
      return {
        ...driver,
        currentLocation: {
          lat: driver.currentLocation.lat + latChange,
          lng: driver.currentLocation.lng + lngChange,
        },
      };
    }
    return driver;
  });
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Sort drivers by distance from a location
export const sortDriversByDistance = (
  drivers: Driver[], 
  location: { lat: number; lng: number }
): Driver[] => {
  return [...drivers].sort((a, b) => {
    const distanceA = calculateDistance(
      location.lat, location.lng,
      a.currentLocation.lat, a.currentLocation.lng
    );
    const distanceB = calculateDistance(
      location.lat, location.lng,
      b.currentLocation.lat, b.currentLocation.lng
    );
    return distanceA - distanceB;
  });
};