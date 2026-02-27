import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import OpenStreetMap from '@/components/OpenStreetMap';
import { useI18n } from '@/i18n';

interface LocationDetectorProps {
  onLocationDetected: (location: { lat: number; lng: number }) => void;
  onLocationError: (error: string) => void;
}

export const LocationDetector: React.FC<LocationDetectorProps> = ({
  onLocationDetected,
  onLocationError,
}) => {
  const { t } = useI18n();
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasAttemptedLocation, setHasAttemptedLocation] = useState(false);
  const watchIdRef = React.useRef<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastFixTime, setLastFixTime] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<'geolocation' | 'ip' | 'manual' | null>(null);
  const locatingRef = React.useRef(false);
  const ANTALYA_CENTER = { lat: 36.8969, lng: 30.7133 };
  const [currentLoc, setCurrentLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [history, setHistory] = useState<Array<{ lat: number; lng: number; acc: number | null; src: string; t: number }>>([]);
  const lastPropagateRef = React.useRef<number>(0);
  const lastLocRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const haversine = (a: {lat:number;lng:number}, b: {lat:number;lng:number}) => {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180;
    const la2 = b.lat * Math.PI / 180;
    const sinDLat = Math.sin(dLat/2);
    const sinDLng = Math.sin(dLng/2);
    const h = sinDLat*sinDLat + Math.cos(la1)*Math.cos(la2)*sinDLng*sinDLng;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const propagate = (loc: {lat:number;lng:number}, acc: number | null, src: 'geolocation' | 'ip' | 'manual') => {
    const now = Date.now();
    const prev = lastLocRef.current;
    let allow = true;
    if (acc !== null) {
      if (src === 'geolocation' && acc > 200) allow = false;
    }
    if (src === 'ip' && (acc === null || acc >= 500)) allow = false;
    if (prev) {
      const dt = Math.max(1, (now - lastPropagateRef.current) / 1000);
      const dist = haversine(prev, loc);
      const speed = dist / dt;
      if (speed > 50) allow = false;
      if (dist > 200 && (acc ?? 9999) > 300) allow = false;
      if (acc !== null && acc > 1000 && dt < 5) allow = false;
    }
    // global kullanım için ülke sınırı kısıtı kaldırıldı
    setHistory(h => [{ lat: loc.lat, lng: loc.lng, acc, src, t: now }, ...h].slice(0, 10));
    if (!allow) {
      try { console.info('location_event', { src, acc, allow: false, secureContext: window.isSecureContext }) } catch {}
      setCurrentLoc(loc);
      setLocationSource(src);
      setShowCalibration(true);
      toast.warning('Konum doğruluğu düşük, kalibrasyon önerildi');
      return;
    }
    let emitLoc = loc;
    if (prev) {
      const alpha = acc !== null
        ? (acc < 50 ? 0.8 : acc < 150 ? 0.6 : 0.4)
        : 0.5;
      emitLoc = {
        lat: prev.lat + alpha * (loc.lat - prev.lat),
        lng: prev.lng + alpha * (loc.lng - prev.lng),
      };
    }
    onLocationDetected(emitLoc);
    setCurrentLoc(emitLoc);
    setLocationSource(src);
    lastPropagateRef.current = now;
    lastLocRef.current = emitLoc;
    try { console.info('location_event', { src, acc, allow: true, secureContext: window.isSecureContext }) } catch {}
    try {
      localStorage.setItem('lastKnownLocation', JSON.stringify({ lat: emitLoc.lat, lng: emitLoc.lng, ts: now }))
    } catch {}
  };
  

  const queryPermission = async () => {
    try {
      // @ts-ignore
      const status = await navigator.permissions?.query?.({ name: 'geolocation' as PermissionName });
      return status?.state as ('granted' | 'prompt' | 'denied' | undefined);
    } catch {
      return undefined;
    }
  };

  

  // Wi‑Fi MLS kaldırıldı; yalnızca tarayıcı Geolocation ve manuel kalibrasyon kullanılır

  const getCurrentLocation = async () => {
    setIsLocating(true);
    locatingRef.current = true;
    setLocationError(null);
    setHasAttemptedLocation(true);

    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isSecure = window.isSecureContext || isLocalhost;

    // Güvensiz bağlamlarda da geolocation'u dene; bir çok tarayıcı localhost harici IP'de reddedebilir
    // Bu nedenle hata akışında manuel haritaya yönlendiriyoruz

    const ipFallback = async () => {
      try {
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) throw new Error('ip_fallback_failed');
        const j = await r.json();
        if (typeof j.latitude === 'number' && typeof j.longitude === 'number') {
          const loc = { lat: j.latitude, lng: j.longitude };
          setIsLocating(false);
          locatingRef.current = false;
          setAccuracy(1000);
          setLastFixTime(Date.now());
          propagate(loc, 1000, 'ip');
          setShowCalibration(true);
          toast.info('IP tabanlı yaklaşık konum kullanıldı');
          return true;
        }
      } catch {}
      return false;
    };

    if (!navigator.geolocation) {
      const used = await ipFallback();
      if (!used) {
        const error = 'Tarayıcınız konum özelliğini desteklemiyor.';
        setLocationError(error);
        onLocationError(error);
        setIsLocating(false);
        setShowCalibration(true);
      }
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    };

    const perm = await queryPermission();
    if (perm === 'denied') {
      toast.error('Konum izni reddedildi. Tarayıcı ayarlarından konum iznini açın.');
    }

    if (!isSecure) {
      const used = await ipFallback();
      if (used) return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        console.log('📍 Konum başarıyla alındı:', location);
        console.log('📍 Konum doğruluğu:', position.coords.accuracy, 'metre');
        
        const acc = position.coords.accuracy ?? null;
        setAccuracy(acc);
        setLastFixTime(Date.now());
        if (acc !== null && acc > 150) {
          toast.info('Konum doğruluğu düşük, kalibrasyon bekleniyor');
          setCurrentLoc(location);
          setShowCalibration(true);
          // Yalnızca manuel kalibrasyona yönlendir
        } else {
          setIsLocating(false);
          locatingRef.current = false;
          propagate(location, acc, 'geolocation');
          toast.success('Konumunuz alındı');
        }
        try {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              const acc = pos.coords.accuracy ?? null;
              const improved = acc !== null && (accuracy === null || acc < accuracy);
              if (improved) {
                setAccuracy(acc);
                setLastFixTime(Date.now());
                if (acc <= 200) {
                  propagate(loc, acc, 'geolocation');
                  try {
                    if (watchIdRef.current !== null) {
                      navigator.geolocation.clearWatch(watchIdRef.current);
                      watchIdRef.current = null;
                    }
                  } catch {}
                }
              }
            },
            () => {},
            options
          ) as unknown as number;
        } catch {}
      },
      (error) => {
        setIsLocating(false);
        locatingRef.current = false;
        let errorMessage = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini verin.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi alınamadı. Lütfen internet bağlantınızı kontrol edin.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Konum alma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.';
            break;
          default:
            errorMessage = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
            break;
        }
        
        console.error('📍 Konum alma hatası:', error);
        (async () => {
          const used = await ipFallback();
          if (!used) {
            setLocationError(errorMessage);
            onLocationError(errorMessage);
            setShowCalibration(true);
          }
        })();
      },
      options
    );

    // Ek MLS/IP denemeleri kaldırıldı
  };

  // Sayfa yüklendiğinde doğrudan geolocation dene
  useEffect(() => {
    if (!hasAttemptedLocation) {
      const timer = setTimeout(() => {
        console.log('📍 Otomatik geolocation başlatılıyor...');
        getCurrentLocation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasAttemptedLocation]);

  const handleManualLocation = () => {
    let defaultLocation = currentLoc || lastLocRef.current || ANTALYA_CENTER;
    try {
      const raw = localStorage.getItem('lastKnownLocation')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
          defaultLocation = { lat: parsed.lat, lng: parsed.lng }
        }
      }
    } catch {}
    console.log('📍 Kalibrasyon için harita açılıyor:', defaultLocation);
    setIsLocating(false);
    setLocationError(null);
    setCurrentLoc(defaultLocation);
    setShowCalibration(true);
  };

  const analyzeLocationHistory = () => {
    if (history.length < 3) return null as any;
    const recent = history.slice(0, 3);
    if (recent.every(r => r.src === recent[0].src)) {
      if (recent[0].acc !== null && recent[0].acc < 100) {
        return { lat: recent[0].lat, lng: recent[0].lng, accuracy: recent[0].acc };
      }
    }
    const best = recent.reduce((best: any, cur) => {
      if (!best) return cur;
      if (cur.acc !== null && best.acc !== null && cur.acc < best.acc) return cur;
      return best;
    }, null as any);
    if (best && best.acc !== null && best.acc < 200) {
      return { lat: best.lat, lng: best.lng, accuracy: best.acc };
    }
    return null as any;
  };

  useEffect(() => {
    const id = setInterval(() => {
      const analyzed = analyzeLocationHistory();
      if (analyzed && currentLoc) {
        const dist = haversine(currentLoc, { lat: analyzed.lat, lng: analyzed.lng });
        if (dist > 50) {
          propagate({ lat: analyzed.lat, lng: analyzed.lng }, analyzed.accuracy ?? null, 'geolocation');
        }
      }
    }, 10000);
    return () => clearInterval(id);
  }, [history, currentLoc]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-600" />
          {t('detector.title')}
        </h3>
        {isLocating && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Konum aranıyor...
          </div>
        )}
      </div>

      {!hasAttemptedLocation && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-sm text-yellow-800">{t('detector.autoFetching')}</span>
          </div>
        </div>
      )}

      {locationError ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800 font-medium">{t('detector.error.title')}</span>
          </div>
          <p className="text-red-700 text-sm mb-3">{locationError}</p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLocating}
            >
              <Navigation className="h-4 w-4 mr-1" />
              {t('detector.retry')}
            </Button>
            <Button
              size="sm"
              onClick={handleManualLocation}
              disabled={isLocating}
            >
              <MapPin className="h-4 w-4 mr-1" />
              {t('detector.manual')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">
            {t('detector.tip')}
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={getCurrentLocation}
              disabled={isLocating}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {isLocating ? t('detector.autoFetching') : t('detector.manual')}
            </Button>
            <Button
              variant="outline"
              onClick={handleManualLocation}
              disabled={isLocating}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('detector.manual')}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-xs text-blue-700">
          <p>
            💡 İpucu: Daha hassas sonuç için konum izni verin.
          </p>
          {accuracy !== null && (
            <p className="mt-1">Doğruluk: ±{Math.round(accuracy)} m {lastFixTime ? `• ${new Date(lastFixTime).toLocaleTimeString()}` : ''}</p>
          )}
          {locationSource && (
            <p className="mt-1">
              Kaynak:{' '}
              {locationSource === 'geolocation'
                ? 'Tarayıcı Geolocation'
                : locationSource === 'ip'
                  ? 'IP yaklaşık konum'
                  : 'Manuel seçim'}
            </p>
          )}
          {history.length > 0 && (
            <div className="mt-2">
              {history.slice(0,3).map((h, i) => (
                <p key={i} className="text-[11px] text-blue-700">
                  {new Date(h.t).toLocaleTimeString()} • {h.src} • ±{h.acc ? Math.round(h.acc) : '?'}m
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
  {showCalibration && currentLoc && (
    <div className="mt-4">
      <OpenStreetMap
        center={currentLoc}
        customerLocation={currentLoc}
        drivers={[]}
        draggableCustomer
        onCustomerDragEnd={(loc) => {
          setShowCalibration(false);
          setIsLocating(false);
          locatingRef.current = false;
          propagate(loc, 50, 'manual');
          toast.success('Konum el ile güncellendi');
        }}
        onMapClick={(loc) => {
          setShowCalibration(false);
          setIsLocating(false);
          locatingRef.current = false;
          propagate(loc, 50, 'manual');
          toast.success('Konum el ile güncellendi');
        }}
        accuracy={accuracy}
        className="h-64 w-full"
      />
    </div>
  )}

      
    </div>
  );
};
