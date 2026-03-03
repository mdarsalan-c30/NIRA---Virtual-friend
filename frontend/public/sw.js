const CACHE_NAME = 'nyra-cache-v1.3.5';
const urlsToCache = [
    '/',
    '/index.html',
    '/favicon.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🧹 Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip caching for non-GET requests or external APIs if needed
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        // Don't cache everything, just main assets if they are from our origin
                        if (event.request.url.startsWith(self.location.origin)) {
                            // cache.put(event.request, fetchRes.clone());
                        }
                        return fetchRes;
                    });
                });
            }).catch(() => {
                // Offline fallback could go here
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});
