export const estimateFare = (distanceKm: number, durationMin: number, vehicle: 'sedan'|'suv'|'van'|'luxury') => {
  const base = { sedan: 0.8, suv: 1.0, van: 1.1, luxury: 1.5 }[vehicle]
  const perKm = 1.2 * base
  const perMin = 0.2 * base
  const total = perKm * distanceKm + perMin * durationMin + 3 * base
  return Math.max(5, Math.round(total * 100) / 100)
}
