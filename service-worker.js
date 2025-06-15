// Service Worker Version
const CACHE_VERSION = 'v2';
const CACHE_NAME = `drivelink-cache-${CACHE_VERSION}`;

// Core Assets for Offline Functionality
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/drivers.html',
  '/dealerships.html',
  '/garages.html',
  '/view-listings.html',
  '/assets/css/styles.css',
  '/assets/images/logo-new.png',
  '/assets/images/favicon.png',
  '/manifest.json'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch Event - Network Falling Back to Cache
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (request.url.includes('/storage/') || request.url.includes('/rest/')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Cache API responses for later use
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request);
        })
    );
  } else {
    // For all other requests, try cache first
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          return cachedResponse || fetch(request)
            .then(networkResponse => {
              // Cache new pages as they're visited
              if (request.url.startsWith('http') && networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback for HTML pages
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('/offline.html');
              }
            });
        })
    );
  }
});

// Background Sync (for failed form submissions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-form') {
    console.log('Background sync for failed form submissions');
    // You would implement your form submission retry logic here
  }
});

// Push Notification Event
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/images/logo-new.png',
    badge: '/assets/images/favicon.png',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});