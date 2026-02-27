export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address?: string;  // Adres bilgisi
  role: 'customer' | 'driver' | 'admin';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver extends User {
  licenseNumber: string;
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury';
  vehicleModel: string;
  vehicleYear?: number;
  licensePlate: string;
  rating: number;
  totalRides: number;
  isAvailable: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  } | null;
  lastLocationUpdate?: string | null;
  documents?: DriverDocument[];
}

export interface Booking {
  id: string;
  reservationCode?: string;
  customerId: string;
  guestName?: string;
  guestPhone?: string;
  driverId?: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  pickupTime: string;
  passengerCount: number;
  adults?: number;
  children?: number;
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury';
  isImmediate?: boolean;
  flightNumber?: string;
  nameBoard?: string;
  returnTrip?: { enabled: boolean; pickupTime?: string };
  extras?: {
    notes?: string;
    tags?: string[];
    promoCode?: string;
    termsAccepted?: boolean;
  };
  status: 'pending' | 'accepted' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
  basePrice: number;
  finalPrice?: number;
  specialRequests?: string;
  paymentMethod?: 'card' | 'cash';
  route?: {
    driverPath: Array<{ lat: number; lng: number }>;
    customerPath?: Array<{ lat: number; lng: number }>;
  };
  pickedUpAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: 'license' | 'vehicle_registration' | 'insurance' | 'profile_photo';
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface TrackingUpdate {
  id: string;
  bookingId: string;
  driverId: string;
  location: {
    lat: number;
    lng: number;
  };
  status: string;
  timestamp: string;
}

export interface SearchFilters {
  vehicleType?: 'sedan' | 'suv' | 'van' | 'luxury';
  maxPrice?: number;
  minRating?: number;
  passengerCount?: number;
  targetDriverId?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
  };
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
