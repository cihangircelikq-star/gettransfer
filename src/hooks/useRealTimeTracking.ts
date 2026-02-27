import { useEffect, useRef } from 'react';
import { useBookingStore } from '@/stores/bookingStore';

export const useRealTimeTracking = () => {
  const { startRealTimeUpdates, stopRealTimeUpdates } = useBookingStore();
  const isActive = useRef(false);

  useEffect(() => {
    if (!isActive.current) {
      startRealTimeUpdates();
      isActive.current = true;
    }

    return () => {
      if (isActive.current) {
        stopRealTimeUpdates();
        isActive.current = false;
      }
    };
  }, [startRealTimeUpdates, stopRealTimeUpdates]);

  return { isTracking: isActive.current };
};