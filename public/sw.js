const STATIC_CACHE = 'salonflow-static-v1';
const HTML_CACHE = 'salonflow-html-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener('activate', (event) => {
  const allowed = [STATIC_CACHE, HTML_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !allowed.includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache API traffic; always network-first for live data.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML shell: keep fresh but fall back to cache for short outages.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  // Static assets: cache first.
  if (
    ['script', 'style', 'font', 'image'].includes(request.destination) ||
    /\.(?:js|css|woff2?|png|svg|jpg|jpeg|gif|webp)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});
