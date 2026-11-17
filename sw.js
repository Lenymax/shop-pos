const CACHE_NAME = "shop-pos-pwa-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install: Cache core app files immediately
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: Clean up outdated caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Serve App Shell from cache first; always send API requests to network
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Never cache Google Apps Script API calls
  if (url.hostname.includes("script.google.com") || url.hostname.includes("script.googleusercontent.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(networkRes => {
        if (event.request.method === "GET" && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkRes;
      });
    }).catch(() => caches.match("./index.html"))
  );
});
