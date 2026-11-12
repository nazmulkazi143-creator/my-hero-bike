/* My Bike Tracker service worker: precaches the app shell so it works fully offline. */
const VERSION = '__VERSION__'
const CACHE = 'my-bike-tracker-' + VERSION
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('my-bike-tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  // Page loads: always serve the cached app shell (works offline), refresh in background.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put('./index.html', res.clone()))
            return res
          })
          .catch(() => cached)
        return cached || net
      }),
    )
    return
  }

  // Everything else: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
          return res
        }),
    ),
  )
})
