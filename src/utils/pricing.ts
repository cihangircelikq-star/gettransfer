export type PricingConfig = {
  driverPerKm: number
  platformFeePercent: number
  currency: 'EUR' | 'TRY'
}

export type TripPricing = {
  distanceKm: number
  driverFare: number
  platformFee: number
  total: number
  currency: PricingConfig['currency']
  customerPerKm: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const computeTripPricing = (distanceKm: number, cfg: PricingConfig): TripPricing => {
  const dist = round2(Math.max(0, distanceKm))
  const driverPerKm = Math.max(0, Number(cfg.driverPerKm || 0))
  const feePct = Math.max(0, Number(cfg.platformFeePercent || 0))
  const driverFare = round2(dist * driverPerKm)
  const total = round2(driverFare * (1 + feePct / 100))
  const platformFee = round2(total - driverFare)
  const customerPerKm = round2(driverPerKm * (1 + feePct / 100))
  return { distanceKm: dist, driverFare, platformFee, total, currency: cfg.currency, customerPerKm }
}

export const currencySymbol = (c: string) => (String(c).toUpperCase() === 'TRY' ? '₺' : '€')

