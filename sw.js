const CACHE_NAME = "shop-pos-pwa-v3"; // Bumped version to force immediate update on phones
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 1. Install & pre-cache core app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2. Delete old cache versions immediately upon activation
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(oldKey => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

// 3. Network-first for HTML/manifest (so updates load when online), Cache-fallback when offline
self.addEventListener("fetch", event => {
  const req = event.request;

  // Never cache Google Apps Script API requests or POST submissions
  if (req.method !== "GET" || req.url.includes("script.google.com") || req.url.includes("script.googleusercontent.com")) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return networkRes;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match("./index.html")))
  );
});
