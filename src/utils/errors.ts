// Turkish error messages for the application
// Maps API error codes to user-friendly Turkish messages

export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'unauthorized': 'Bu işlem için giriş yapmanız gerekiyor.',
  'invalid_credentials': 'E-posta veya şifre hatalı.',
  'token_expired': 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  'session_invalid': 'Geçersiz oturum. Lütfen tekrar giriş yapın.',
  'email_already_exists': 'Bu e-posta adresi zaten kullanılıyor.',
  'phone_already_exists': 'Bu telefon numarası zaten kayıtlı.',

  // Booking errors
  'booking_not_found': 'Rezervasyon bulunamadı.',
  'booking_cancelled': 'Bu rezervasyon iptal edilmiş.',
  'booking_completed': 'Bu rezervasyon zaten tamamlanmış.',
  'booking_expired': 'Bu rezervasyonun süresi dolmuş.',
  'driver_not_available': 'Sürücü şu anda müsait değil.',
  'no_drivers_available': 'Bu bölgede müsait sürücü bulunamadı.',
  'ride_in_progress': 'Halihazırda devam eden bir yolculuğunuz var.',

  // Driver errors
  'driver_not_found': 'Sürücü bulunamadı.',
  'driver_not_approved': 'Sürücü henüz onaylanmamış.',
  'driver_suspended': 'Sürücü hesabı askıya alınmış.',
  'vehicle_not_found': 'Araç bilgisi bulunamadı.',
  'documents_pending': 'Belgeleriniz onay bekliyor.',
  'documents_rejected': 'Belgeleriniz reddedildi. Lütfen güncelleyin.',

  // Location errors
  'location_not_found': 'Konum bulunamadı.',
  'location_permission_denied': 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.',
  'location_unavailable': 'Konum bilgisi alınamadı. GPS kapalı olabilir.',
  'location_timeout': 'Konum alınamadı. Lütfen tekrar deneyin.',
  'address_not_found': 'Adres bulunamadı. Lütfen farklı bir adres deneyin.',
  'route_not_found': 'Rota hesaplanamadı. Lütfen başlangıç ve varış noktalarını kontrol edin.',

  // Payment errors
  'payment_failed': 'Ödeme başarısız. Lütfen kart bilgilerinizi kontrol edin.',
  'payment_method_invalid': 'Geçersiz ödeme yöntemi.',
  'insufficient_balance': 'Yetersiz bakiye.',
  'refund_failed': 'İade işlemi başarısız oldu.',

  // Validation errors
  'invalid_phone': 'Geçersiz telefon numarası. Lütfen 10 haneli numara girin.',
  'invalid_email': 'Geçersiz e-posta adresi.',
  'invalid_password': 'Şifre en az 6 karakter olmalıdır.',
  'required_field': 'Bu alan zorunludur.',
  'invalid_date': 'Geçersiz tarih.',
  'invalid_time': 'Geçersiz saat.',

  // Rate limiting
  'rate_limited': 'Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.',
  'too_many_requests': 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',

  // Server errors
  'internal_error': 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  'service_unavailable': 'Hizmet geçici olarak kullanılamıyor.',
  'network_error': 'İnternet bağlantınızı kontrol edin.',
  'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',

  // OTP errors
  'otp_invalid': 'Doğrulama kodu hatalı.',
  'otp_expired': 'Doğrulama kodunun süresi dolmuş. Yeni kod isteyin.',
  'otp_already_verified': 'Bu numara zaten doğrulanmış.',

  // General errors
  'unknown_error': 'Bilinmeyen bir hata oluştu.',
  'not_found': 'İstenen kaynak bulunamadı.',
  'forbidden': 'Bu işlem için yetkiniz yok.',
  'bad_request': 'Geçersiz istek. Lütfen bilgileri kontrol edin.',
}

// Get Turkish error message from error code
export function getErrorMessage(code: string | undefined, fallback?: string): string {
  if (!code) return fallback || ERROR_MESSAGES.unknown_error
  return ERROR_MESSAGES[code] || fallback || ERROR_MESSAGES.unknown_error
}

// Parse API error response and return Turkish message
export function parseApiError(error: unknown): string {
  // Check if error has a response with error code
  if (error && typeof error === 'object') {
    const err = error as any
    
    // API error format: { success: false, error: 'code' }
    if (err.detail?.error) {
      return getErrorMessage(err.detail.error)
    }
    
    // Direct error code
    if (err.error) {
      return getErrorMessage(err.error)
    }
    
    // Network error
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      return ERROR_MESSAGES.timeout
    }
    
    if (err.message?.includes('fetch') || err.message?.includes('network')) {
      return ERROR_MESSAGES.network_error
    }
  }
  
  return ERROR_MESSAGES.unknown_error
}
