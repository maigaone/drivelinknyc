
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('drivelink-cache-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico',
        '/logo-new.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
