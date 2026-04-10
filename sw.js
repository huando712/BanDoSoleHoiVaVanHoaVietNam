/* =========================================================
   Service Worker — Bản đồ Lễ hội & Văn hóa Việt Nam
   Chiến lược: Cache-first cho local, Network-first cho external
   ========================================================= */

const CACHE_VERSION = 'lehoi-vn-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './sos.html',
  './detail.html',
  './profile.html',
  './partnership.html',
  './script.js',
  './lunar.js',
  './chatbot-data.js',
  './manifest.json',
  './icon.svg',
  './festival-locations.csv'
];

/* ---------- INSTALL: pre-cache tất cả file chính ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE: xoá cache cũ ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- MESSAGE: cho phép kích hoạt SW mới ngay ---------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ---------- FETCH: phục vụ từ cache hoặc mạng ---------- */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chỉ xử lý GET requests
  if (event.request.method !== 'GET') return;

  // Các API (chatbot server) luôn dùng network
  if (url.pathname.startsWith('/api/') || url.port === '3000') return;

  // Với điều hướng HTML: Network-first để tránh giữ bản cũ sau deploy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Tài nguyên local (same origin hoặc file local): Cache-first
  if (url.origin === self.location.origin || url.protocol === 'file:') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline fallback cho HTML pages
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
    return;
  }

  // Tài nguyên bên ngoài (Leaflet tiles, Google Fonts, v.v.): Network-first với cache backup
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
