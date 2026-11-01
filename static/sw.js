const CACHE_NAME = 'lightnovelpub-v3';
const STATIC_ASSETS = [
  '/static/css/style.css',
  '/static/js/reader.js',
  '/static/js/upload.js',
  '/static/js/dexie.min.js',
  '/static/img/logo.png'
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

// Cache static assets only; always pass HTML and API requests to network first
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

  // Cache-first / stale-while-revalidate for static assets (CSS, JS, images, fonts)
  if (url.pathname.startsWith('/static/') || url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
