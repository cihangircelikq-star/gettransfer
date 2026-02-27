import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import OpenStreetMap from '@/components/OpenStreetMap'
import { LocationDetector } from '@/components/LocationDetector'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MapPin, Plane, Users, CalendarClock, Tag, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { API } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/i18n'
import { computeTripPricing, currencySymbol, type PricingConfig } from '@/utils/pricing'

type VehicleType = 'sedan' | 'suv' | 'van' | 'luxury'

type ReservationForm = {
  fullName: string
  phone: string
  pickupAddress: string
  destinationAddress: string
  vehicleType: VehicleType
  adults: number
  children: number
  pickupDateTimeLocal: string
  returnEnabled: boolean
  returnDateTimeLocal?: string
  flightNumber?: string
  nameBoard?: string
  promoCode?: string
  notes?: string
  termsAccepted: boolean
  tag_wifi: boolean
  tag_tr_driver: boolean
}

const toIsoFromLocal = (local: string) => {
  const d = new Date(local)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const defaultLocalDateTime = () => {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const ReservationNew = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { lang } = useI18n()

  const [pickupLoc, setPickupLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [dropLoc, setDropLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [pricing, setPricing] = useState<PricingConfig>({ driverPerKm: 1, platformFeePercent: 3, currency: 'EUR' })
  const [pricingPreview, setPricingPreview] = useState<{ distanceKm: number, driverFare: number, platformFee: number, total: number, customerPerKm: number } | null>(null)
  const [suggestions, setSuggestions] = useState<Array<{ label: string; lat: number; lng: number; category: 'airport' | 'address' }>>([])
  const [showSug, setShowSug] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReservationForm>({
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
      vehicleType: 'sedan',
      adults: 2,
      children: 0,
      pickupDateTimeLocal: defaultLocalDateTime(),
      returnEnabled: false,
      termsAccepted: false,
      tag_wifi: false,
      tag_tr_driver: false,
    }
  })

  const destinationAddress = watch('destinationAddress')
  const returnEnabled = watch('returnEnabled')
  const adults = watch('adults')
  const children = watch('children')

  const passengerCount = useMemo(() => {
    const a = Math.max(1, Number.isFinite(adults) ? adults : 1)
    const c = Math.max(0, Number.isFinite(children) ? children : 0)
    return a + c
  }, [adults, children])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/pricing')
        const j = await res.json()
        if (res.ok && j.success && j.data && alive) setPricing(j.data as PricingConfig)
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!pickupLoc || !dropLoc) { setPricingPreview(null); return }
    const calc = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
      const R = 6371
      const dLat = (b.lat - a.lat) * Math.PI / 180
      const dLng = (b.lng - a.lng) * Math.PI / 180
      const la1 = a.lat * Math.PI / 180
      const la2 = b.lat * Math.PI / 180
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.asin(Math.sqrt(h))
    }
    const distKm = calc(pickupLoc, dropLoc)
    const breakdown = computeTripPricing(distKm, pricing)
    setPricingPreview({ distanceKm: breakdown.distanceKm, driverFare: breakdown.driverFare, platformFee: breakdown.platformFee, total: breakdown.total, customerPerKm: breakdown.customerPerKm })
  }, [pickupLoc?.lat, pickupLoc?.lng, dropLoc?.lat, dropLoc?.lng, pricing.driverPerKm, pricing.platformFeePercent, pricing.currency])

  const getAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      const res = await fetch(url, { headers: { 'User-Agent': 'gettransfer-app/1.0', 'Accept-Language': lang } })
      if (!res.ok) throw new Error('reverse_failed')
      const data = await res.json()
      const addr = data?.display_name || 'Mevcut Konum'
      setValue('pickupAddress', addr)
    } catch {
      setValue('pickupAddress', 'Mevcut Konum')
    }
  }

  const getCoordsFromAddress = async (address: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&extratags=1&limit=10&q=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'gettransfer-app/1.0', 'Accept-Language': lang } })
    if (!res.ok) throw new Error('geocoding_failed')
    const items = await res.json()
    if (Array.isArray(items) && items.length > 0) {
      return { lat: parseFloat(items[0].lat), lng: parseFloat(items[0].lon) }
    }
    return null
  }

  useEffect(() => {
    const run = async () => {
      if (!destinationAddress || destinationAddress.trim().length < 2) { setSuggestions([]); setShowSug(false); return }
      const q = destinationAddress.trim()
      const params = new URLSearchParams({ q })
      if (pickupLoc) { params.set('lat', String(pickupLoc.lat)); params.set('lng', String(pickupLoc.lng)) }
      try {
        const res = await fetch(`${API}/places/search?${params.toString()}`, { headers: { 'Accept-Language': lang } })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data?.data) ? data.data as Array<{ label: string; lat: number; lng: number; category: 'airport' | 'address' }> : []
          if (list.length > 0) {
            setSuggestions(list)
            setShowSug(true)
            return
          }
        }
      } catch {}
      try {
        let bbox = ''
        if (pickupLoc) {
          const dLat = 0.35, dLng = 0.35
          const left = (pickupLoc.lng - dLng).toFixed(6)
          const right = (pickupLoc.lng + dLng).toFixed(6)
          const top = (pickupLoc.lat + dLat).toFixed(6)
          const bottom = (pickupLoc.lat - dLat).toFixed(6)
          bbox = `&viewbox=${left},${top},${right},${bottom}&bounded=1`
        }
        const base = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&extratags=1&limit=10${bbox}&q=${encodeURIComponent(q)}`
        const direct = await fetch(base, { headers: { 'User-Agent': 'gettransfer-app/1.0', 'Accept-Language': lang } })
        if (direct.ok) {
          const arr = await direct.json()
          const mapped = (Array.isArray(arr) ? arr : []).map((it: any) => {
            const label = String(it.display_name)
            const cls = String(it.class || '').toLowerCase()
            const type = String(it.type || '').toLowerCase()
            const cat = (cls === 'aeroway' || type === 'aerodrome' || type === 'terminal') ? 'airport' : 'address'
            return { label, lat: parseFloat(it.lat), lng: parseFloat(it.lon), category: cat as 'airport' | 'address' }
          })
          setSuggestions(mapped)
          setShowSug(true)
          return
        }
      } catch {}
      setSuggestions([])
      setShowSug(false)
    }
    const t = setTimeout(run, 250)
    return () => clearTimeout(t)
  }, [destinationAddress, pickupLoc, lang])

  const onSubmit = async (data: ReservationForm) => {
    const fullName = (data.fullName || '').trim()
    const phone = (data.phone || '').trim()
    if (fullName.length < 2) { toast.error('Ad Soyad zorunlu'); return }
    if (phone.length < 7) { toast.error('Telefon zorunlu'); return }
    if (!pickupLoc) { toast.error('Lütfen alış konumunu belirleyin'); return }
    if (!dropLoc) {
      const coords = await getCoordsFromAddress(data.destinationAddress).catch(() => null)
      if (!coords) { toast.error('Varış adresi bulunamadı'); return }
      setDropLoc(coords)
    }
    const pickupIso = toIsoFromLocal(data.pickupDateTimeLocal)
    if (!pickupIso) { toast.error('Yolculuk tarihi geçersiz'); return }
    let returnIso: string | null = null
    if (data.returnEnabled) {
      returnIso = toIsoFromLocal(data.returnDateTimeLocal || '')
      if (!returnIso) { toast.error('Dönüş tarihi geçersiz'); return }
    }
    if (!data.termsAccepted) { toast.error('Devam etmek için koşulları kabul edin'); return }

    const tags: string[] = []
    if (data.tag_wifi) tags.push('wifi')
    if (data.tag_tr_driver) tags.push('tr_driver')

    const bookingData = {
      guestName: fullName,
      guestPhone: phone,
      pickupLocation: { lat: pickupLoc.lat, lng: pickupLoc.lng, address: data.pickupAddress || 'Alış Noktası' },
      dropoffLocation: { lat: (dropLoc || pickupLoc).lat, lng: (dropLoc || pickupLoc).lng, address: data.destinationAddress },
      pickupTime: pickupIso,
      passengerCount,
      adults: Math.max(1, Math.floor(Number(data.adults || 1))),
      children: Math.max(0, Math.floor(Number(data.children || 0))),
      vehicleType: data.vehicleType,
      isImmediate: false,
      estimatedDistance: pricingPreview?.distanceKm,
      estimatedPrice: pricingPreview?.total,
      basePrice: pricingPreview?.driverFare,
      finalPrice: pricingPreview?.total,
      flightNumber: (data.flightNumber || '').trim() || undefined,
      nameBoard: (data.nameBoard || '').trim() || undefined,
      returnTrip: data.returnEnabled ? { enabled: true, pickupTime: returnIso || undefined } : { enabled: false },
      extras: {
        notes: (data.notes || '').trim() || undefined,
        promoCode: (data.promoCode || '').trim() || undefined,
        termsAccepted: true,
        tags: tags.length ? tags : undefined,
        pricing: pricingPreview ? { driverPerKm: pricing.driverPerKm, platformFeePercent: pricing.platformFeePercent, distanceKm: pricingPreview.distanceKm, driverFare: pricingPreview.driverFare, platformFee: pricingPreview.platformFee, total: pricingPreview.total, currency: pricing.currency } : undefined,
      }
    }

    navigate('/select-driver', { state: bookingData })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>Geri</Button>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyon</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Alış Konumu
            </h2>
            <div className="mt-3">
              <LocationDetector
                onLocationDetected={(loc) => {
                  setPickupLoc(loc)
                  getAddressFromCoords(loc.lat, loc.lng).catch(() => {})
                }}
                onLocationError={() => {}}
              />
            </div>
            {pickupLoc && (
              <div className="mt-4 h-64 rounded border overflow-hidden">
                <OpenStreetMap center={pickupLoc} customerLocation={pickupLoc} drivers={[]} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {pricingPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-blue-900">Tahmini Ücret</div>
                  <div className="mt-1 text-blue-800">
                    Toplam: <span className="font-semibold">{currencySymbol(pricing.currency)}{pricingPreview.total.toFixed(2)}</span> • Mesafe: {pricingPreview.distanceKm.toFixed(1)} km
                  </div>
                  <div className="mt-1 text-xs text-blue-700">
                    Şoför: {currencySymbol(pricing.currency)}{pricingPreview.driverFare.toFixed(2)} • Bizim pay (%{Number(pricing.platformFeePercent || 0).toFixed(2)}): {currencySymbol(pricing.currency)}{pricingPreview.platformFee.toFixed(2)} • Km: {currencySymbol(pricing.currency)}{pricingPreview.customerPerKm.toFixed(2)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                  <Input {...register('fullName', { required: 'Ad Soyad zorunlu' })} placeholder="Ad Soyad" />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <Input {...register('phone', { required: 'Telefon zorunlu' })} placeholder="+90 5xx xxx xx xx" />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alış adresi</label>
                <Input {...register('pickupAddress')} placeholder="Alış adresi" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Varış adresi</label>
                <Input
                  {...register('destinationAddress', { required: 'Varış adresi gerekli' })}
                  placeholder="Havalimanı, otel, adres..."
                  onBlur={async () => {
                    const addr = watch('destinationAddress')?.trim()
                    if (!addr) return
                    const coords = await getCoordsFromAddress(addr).catch(() => null)
                    if (coords) setDropLoc(coords)
                  }}
                />
                {errors.destinationAddress && <p className="text-xs text-red-600 mt-1">{errors.destinationAddress.message}</p>}
                {showSug && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                    {suggestions.slice(0, 8).map((s, idx) => (
                      <button
                        type="button"
                        key={`${s.lat}-${s.lng}-${idx}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => {
                          setValue('destinationAddress', s.label)
                          setDropLoc({ lat: s.lat, lng: s.lng })
                          setShowSug(false)
                        }}
                      >
                        <span className="truncate">{s.label}</span>
                        <span className="ml-3 text-xs text-gray-400">{s.category === 'airport' ? 'Havalimanı' : 'Adres'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-gray-600" />
                    Yolculuk tarihi
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    {...register('pickupDateTimeLocal', { required: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Araç türü</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" {...register('vehicleType')}>
                    <option value="sedan">Ekonomi</option>
                    <option value="suv">Konfor</option>
                    <option value="luxury">Business</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    Yetişkin
                  </label>
                  <input type="number" min={1} max={8} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" {...register('adults', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çocuk</label>
                  <input type="number" min={0} max={8} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" {...register('children', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                  Dönüş yolu ekle
                </div>
                <input type="checkbox" {...register('returnEnabled')} />
              </div>

              {returnEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dönüş tarihi</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    {...register('returnDateTimeLocal', { required: true })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Plane className="h-4 w-4 text-gray-600" />
                    Varış uçuş no
                  </label>
                  <Input {...register('flightNumber')} placeholder="Örn: TK2410" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tabeladaki isim</label>
                  <Input {...register('nameBoard')} placeholder="Örn: AHMET YILMAZ" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yorum / İstekler</label>
                <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-24" {...register('notes')} placeholder="Bagaj, özel ihtiyaçlar, görevler..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-600" />
                    Promosyon kodu
                  </label>
                  <Input {...register('promoCode')} placeholder="Kod varsa" />
                </div>
                <div className="space-y-2 pt-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" {...register('tag_wifi')} />
                    Wi‑Fi ihtiyacım var
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" {...register('tag_tr_driver')} />
                    Türkçe konuşan sürücü
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-1" {...register('termsAccepted')} />
                <span>Hizmet Sözleşmesi koşullarını kabul ediyorum</span>
              </label>

              <Button type="submit" className="w-full">Teklifleri Al</Button>
              <p className="text-xs text-gray-500">Not: Masaüstünde konum doğruluğu düşükse haritadan düzeltin.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

