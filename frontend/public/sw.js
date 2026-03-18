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
    if (event.request.method !== 'GET') return;

    // NETWORK FIRST for navigation requests (index.html) to prevent being stuck on a stale shell
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                
                return fetch(event.request).then(fetchRes => {
                    // Only cache assets from our own origin
                    if (event.request.url.startsWith(self.location.origin) && fetchRes.status === 200) {
                        const resClone = fetchRes.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            // Optionally cache other assets here if desired
                            // cache.put(event.request, resClone);
                        });
                    }
                    return fetchRes;
                });
            })
    );
});
