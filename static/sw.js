const CACHE_NAME = 'lightnovelpub-v28';
const STATIC_ASSETS = [
  '/static/css/style.css?v=28',
  '/static/js/reader.js?v=28',
  '/static/js/upload.js',
  '/static/js/dexie.min.js?v=28',
  '/static/img/logo.png?v=28'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

// Resilient Network-First caching engine: Ensures user always receives latest code with zero stale caching
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip browser extensions, chrome-extension://, non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Never cache API routes
  if (url.pathname.startsWith('/api/')) return;

  // Never cache dynamic HTML page navigations (ensures newly uploaded novels appear immediately)
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.startsWith('/novel/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-First for static assets: always fetch fresh version from server; fallback to cache only when offline
  if (url.pathname.startsWith('/static/') || url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => caches.match(e.request))
    );
  }
});
