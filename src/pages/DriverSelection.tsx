import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Star, MapPin, Car, Clock, MessageCircle, Check, X } from 'lucide-react';
import { useBookingStore } from '@/stores/bookingStore';
import { API } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface DriverOffer {
  id: string;
  driverId: string;
  driverName: string;
  vehicleModel: string;
  vehicleType: string;
  rating: number;
  totalRides: number;
  estimatedArrival: number;
  originalPrice: number;
  offeredPrice: number;
  distance: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export const DriverSelection: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createBooking, /* use real nearby drivers */ availableDrivers, searchDrivers, refreshApprovedDriversNear, startRealTimeUpdates, cancelLastRequest, currentBooking } = useBookingStore();
  
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [negotiationOffer, setNegotiationOffer] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const bookingData = location.state;

  useEffect(() => {
    startRealTimeUpdates();
    if (!bookingData) {
      navigate('/');
      return;
    }

    // Seed cihan near pickup and fetch real nearby drivers
    (async () => {
      try {
        const pick = bookingData.pickupLocation || { lat: bookingData.pickupLat, lng: bookingData.pickupLng, address: bookingData.pickupAddress || 'Mevcut Konum' }
        const drop = bookingData.dropoffLocation || { lat: bookingData.dropoffLat, lng: bookingData.dropoffLng, address: bookingData.destinationAddress || '' }
        // Server tarafında Cihan yoksa her zaman seed et (localStorage bayrağına güvenme)
        // Demo seed kaldırıldı
        await searchDrivers(pick, drop, { vehicleType: bookingData.vehicleType || 'sedan', passengerCount: bookingData.passengerCount || 1 })
        await refreshApprovedDriversNear({ lat: pick.lat, lng: pick.lng })
      } catch {}
      generateDriverOffers();
    })();

    return () => {}
  }, [bookingData, navigate]);

  useEffect(() => {
    if (currentBooking && currentBooking.status === 'accepted') {
      navigate(`/tracking/${currentBooking.id}`);
    }
  }, [currentBooking])

  useEffect(() => {
    // Regenerate offers whenever nearby drivers list changes
    // Check if we have drivers but no offers yet, OR if drivers count changed
    if (availableDrivers.length > 0) {
        generateDriverOffers();
    } else {
        // If list becomes empty (e.g. driver went offline), clear offers
        // BUT don't clear if we have an accepted offer pending redirect
        setOffers(prev => prev.some(o => o.status === 'accepted') ? prev : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDrivers]) // Removed .length to trigger on any change

  const generateDriverOffers = () => {
    if (!bookingData) return
    
    // Don't regenerate if we have an accepted offer waiting
    if (offers.some(o => o.status === 'accepted')) return;

    const origin = bookingData.pickupLocation || { lat: bookingData.pickupLat, lng: bookingData.pickupLng }
    const calc = (a:{lat:number,lng:number}, b:{lat:number,lng:number}) => {
      const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180; const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))
    }
    
    // Create offers only from AVAILABLE drivers
    const realOffers: DriverOffer[] = availableDrivers
      .filter(d => d.isAvailable) 
      .slice(0,10)
      .map(d => {
      const dist = d.currentLocation ? calc(origin, d.currentLocation) : 3
      const eta = Math.max(3, Math.round(dist*3))
      return {
        id: d.id,
        driverId: d.id,
        driverName: d.name,
        vehicleModel: d.vehicleModel || 'Araç',
        vehicleType: d.vehicleType,
        rating: d.rating || 4.7,
        totalRides: d.totalRides || 0,
        estimatedArrival: eta,
        originalPrice: bookingData.estimatedPrice,
        offeredPrice: Math.round((bookingData.estimatedPrice || 10) * (1 + (Math.random()*0.2 - 0.1)) * 100)/100,
        distance: Math.round(dist*10)/10,
        message: 'Hızlı ve güvenli hizmet',
        status: 'pending',
      }
    })
    
    setOffers(realOffers)
  };

  const handleAcceptOffer = async (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    setIsLoading(true);
    
    try {
      setOffers(prev => prev.map(o => 
        o.id === offerId ? { ...o, status: 'accepted' } : { ...o, status: 'rejected' }
      ));
      
      // Force selected offer to stay visible even if driver disappears from 'availableDrivers' list
      setSelectedOffer(offerId);

      const pick = bookingData.pickupLocation || { lat: bookingData.pickupLat, lng: bookingData.pickupLng, address: bookingData.pickupAddress || 'Alış Noktası' }
      const drop = bookingData.dropoffLocation || { lat: bookingData.dropoffLat, lng: bookingData.dropoffLng, address: bookingData.destinationAddress || 'Varış Noktası' }
      
      // We are just SENDING the request here, not creating a booking yet.
      // The booking is created on server when driver accepts.
      // But we need to listen for 'booking:update' via socket to know when it is accepted.
      
      await searchDrivers(pick, drop, { vehicleType: bookingData.vehicleType || 'sedan', passengerCount: bookingData.passengerCount || 1, targetDriverId: offer.driverId })
      
      toast.success(`Çağrı gönderildi. ${offer.driverName} kabul edince takip başlayacak.`)
    } catch (error) {
      // Revert UI if API fails
      setOffers(prev => prev.map(o => 
        o.id === offerId ? { ...o, status: 'pending' } : o
      ));
      setSelectedOffer(null);
      toast.error('Çağrı gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNegotiate = (offerId: string) => {
    setNegotiationOffer(offerId);
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      setCounterPrice(Math.round(offer.offeredPrice * 0.9)); // Suggest 10% less
    }
  };

  const submitCounterOffer = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    // Simulate negotiation
    const negotiationSuccess = Math.random() > 0.5; // 50% chance
    
    if (negotiationSuccess) {
      setOffers(prev => prev.map(o => 
        o.id === offerId ? { ...o, offeredPrice: counterPrice, message: 'Teklif kabul edildi!' } : o
      ));
      toast.success('Pazarlık başarılı! Yeni fiyat kabul edildi.');
    } else {
      toast.info('Sürücü yeni teklifi kabul etmedi. Orijinal fiyat geçerli.');
    }
    
    setNegotiationOffer(null);
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

  if (!bookingData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Yakındaki Sürücüler
          </h1>
          <p className="text-gray-600">
            Size en yakın sürücülerden gelen teklifleri değerlendirin
          </p>
           <div className="mt-4 bg-blue-50 rounded-lg p-4">
             <div className="flex items-center justify-between text-sm">
               <span><strong>Rota:</strong> {bookingData.pickupAddress} → {bookingData.destinationAddress}</span>
               <span className="text-blue-600 font-medium">Esnek çağrı yönetimi aktif</span>
             </div>
             <div className="mt-3 text-right">
               <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={async()=>{ try { await cancelLastRequest(user?.id) } catch {}; navigate('/') }}>
                 İptal Et
               </Button>
             </div>
           </div>
        </div>

        <div className="space-y-4">
          {offers.length === 0 && (
            <div className="bg-white rounded-lg shadow_md p-6 text-center text-sm text-gray-600">
              Sürücüler getiriliyor...
            </div>
          )}
          {offers.map((offer) => {
            // If we have a selected accepted offer, hide all others
            if (selectedOffer && offer.id !== selectedOffer) return null;
            
            return (
            <div
              key={offer.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                offer.status === 'accepted'
                  ? 'border-green-500 bg-green-50'
                  : offer.status === 'rejected'
                  ? 'border-red-500 bg-red-50 opacity-75'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">{getVehicleIcon(offer.vehicleType)}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{offer.driverName}</h3>
                    <p className="text-sm text-gray-600">{offer.vehicleModel}</p>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">
                        {offer.rating} ({offer.totalRides} yolculuk)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    €{offer.offeredPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {offer.distance.toFixed(1)} km uzaklıkta
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    🚗 {offer.estimatedArrival} dk varış
                  </div>
                </div>
              </div>

              {offer.message && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <MessageCircle className="h-4 w-4 inline mr-1" />
                    {offer.message}
                  </p>
                </div>
              )}

              {negotiationOffer === offer.id ? (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Teklif Ver</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(Number(e.target.value))}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      step="0.01"
                      min="0"
                    />
                    <Button
                      size="sm"
                      onClick={() => submitCounterOffer(offer.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNegotiationOffer(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {offer.status === 'pending' && (
                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleAcceptOffer(offer.id)}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Kabul Et
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleNegotiate(offer.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Pazarlık Yap
                  </Button>
                </div>
              )}

              {offer.status === 'accepted' && (
                <div className="flex flex-col items-center justify-center text-green-600 font-medium py-4">
                  <div className="flex items-center mb-2">
                    <Check className="h-6 w-6 mr-2" />
                    <span className="text-lg">Talep Gönderildi</span>
                  </div>
                  <p className="text-sm text-gray-600 animate-pulse">Sürücünün onayı bekleniyor...</p>
                </div>
              )}

              
            </div>
          )})}
        </div>
        
      </div>
    </div>
  );
};
