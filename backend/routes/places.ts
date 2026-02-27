import { Router, type Request, type Response } from 'express'

const router = Router()

type Suggestion = {
  label: string
  lat: number
  lng: number
  category: 'airport' | 'address'
  score: number
}

const lru: Map<string, { ts: number, data: Suggestion[] }> = new Map()
const MAX_CACHE = 200
const TTL_MS = 10 * 60 * 1000
const popular: Map<string, number> = new Map()
let lastExternalTs = 0

const norm = (s: string) => s.toLowerCase().replace(/ı/g, 'i').replace(/\s+/g, ' ').trim()
const isAirport = (cls: string, type: string, name: string) => {
  const c = cls.toLowerCase(), t = type.toLowerCase(), n = norm(name)
  return c === 'aeroway' || t === 'aerodrome' || t === 'terminal' || /hava ?alan|airport/.test(n)
}

const haversine = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

router.get('/search', async (req: Request, res: Response) => {
  try {
    const qRaw = (req.query.q as string || '').trim()
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const limit = Math.min(20, Math.max(5, parseInt(req.query.limit as string || '10')))
    if (!qRaw) { res.json({ success: true, data: [] }); return }
    const q = qRaw
    const key = `${q}|${isNaN(lat)?'':lat}|${isNaN(lng)?'':lng}|${limit}`
    const now = Date.now()
    const hit = lru.get(key)
    if (hit && now - hit.ts < TTL_MS) { res.json({ success: true, data: hit.data }); return }

    let bbox = ''
    if (!isNaN(lat) && !isNaN(lng)) {
      const dLat = 0.35, dLng = 0.35
      const left = (lng - dLng).toFixed(6)
      const right = (lng + dLng).toFixed(6)
      const top = (lat + dLat).toFixed(6)
      const bottom = (lat - dLat).toFixed(6)
      bbox = `&viewbox=${left},${top},${right},${bottom}&bounded=1`
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&extratags=1&limit=${limit}${bbox}&q=${encodeURIComponent(q)}`
    const now2 = Date.now()
    if (now2 - lastExternalTs < 1000) { res.status(429).json({ success: false, error: 'rate_limited' }); return }
    const acceptLang = (req.headers['accept-language'] as string) || 'tr,en;q=0.8'
    const r = await fetch(url, { headers: { 'User-Agent': 'gettransfer-app/1.0', 'Accept-Language': acceptLang } as any })
    if (!r.ok) { res.status(502).json({ success: false, error: 'geocoding_failed' }); return }
    const arr: any[] = await r.json()
    lastExternalTs = Date.now()
    const suggestions: Suggestion[] = arr.map((it: any) => {
      const label: string = it.display_name
      const latN = parseFloat(it.lat), lngN = parseFloat(it.lon)
      const category: 'airport' | 'address' = isAirport(it.class || '', it.type || '', label) ? 'airport' : 'address'
      let score = 0
      const nq = norm(q), nl = norm(label)
      if (nl === nq) score += 5
      if (nl.startsWith(nq)) score += 3
      if (nl.includes(nq)) score += 1
      const freq = popular.get(label) || 0
      score += Math.min(3, freq)
      if (!isNaN(lat) && !isNaN(lng)) {
        const dist = haversine({ lat, lng }, { lat: latN, lng: lngN })
        const proximity = Math.max(0, 1 - Math.min(dist, 50000) / 50000)
        score += proximity * 3
      }
      return { label, lat: latN, lng: lngN, category, score }
    }).sort((a: Suggestion, b: Suggestion) => b.score - a.score)

    lru.set(key, { ts: now, data: suggestions })
    if (lru.size > MAX_CACHE) { const firstKey = lru.keys().next().value; lru.delete(firstKey) }
    res.json({ success: true, data: suggestions })
  } catch (e) {
    res.status(500).json({ success: false, error: 'server_error' })
  }
})

router.post('/record', (req: Request, res: Response) => {
  try {
    const { label } = req.body || {}
    if (!label) { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
    popular.set(label, (popular.get(label) || 0) + 1)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ success: false, error: 'server_error' }) }
})

export default router
