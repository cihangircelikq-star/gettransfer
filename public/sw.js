const STATIC_CACHE = 'gt-static-v1'
const RUNTIME_CACHE = 'gt-runtime-v1'

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (![STATIC_CACHE, RUNTIME_CACHE].includes(k)) return caches.delete(k)
    })))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return

  // Navigation requests: network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res)=>{
        const copy = res.clone()
        caches.open(RUNTIME_CACHE).then((c)=>c.put(req, copy)).catch(()=>{})
        return res
      }).catch(()=>caches.match(req).then((m)=>m || caches.match('/index.html')))
    )
    return
  }

  // API and external routing: network-first with fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('router.project-osrm.org') || url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(
      fetch(req).then((res)=>{
        const copy = res.clone()
        caches.open(RUNTIME_CACHE).then((c)=>c.put(req, copy)).catch(()=>{})
        return res
      }).catch(()=>caches.match(req))
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((m)=> m || fetch(req).then((res)=>{
      const copy = res.clone()
      caches.open(STATIC_CACHE).then((c)=>c.put(req, copy)).catch(()=>{})
      return res
    }))
  )
})

