const CACHE_NAME = 'krusty-burger-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/LOGO.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // NAVIGATION FALLBACK para SPA: todas las peticiones de navegacion
    // (ej: /profile, /orders, /admin) deben devolver /index.html
    // porque el routing lo maneja React Router en el cliente.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cached) => {
                    if (cached) return cached;
                    return fetch(request).then((response) => {
                        cache.put(request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    if (request.method === 'GET' && (request.destination === 'style' || request.destination === 'script' || request.destination === 'image')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cached) => {
                    const fetched = fetch(request).then((response) => {
                        cache.put(request, response.clone());
                        return response;
                    }).catch(() => cached);
                    return cached || fetched;
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request);
        })
    );
});
