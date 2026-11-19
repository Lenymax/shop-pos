const CACHE_NAME = "dukapulse-pwa-v5";
const STATIC_ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle same-origin GETs (never touch Apps Script API / other origins)
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: network-first with 4s timeout -> fast fallback to cache on weak/slow 3G/4G
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch(req, { signal: ctl.signal });
        clearTimeout(t);
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put("./index.html", copy)); }
        return res;
      } catch (_) {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate (instant load, refreshes in background)
  event.respondWith(
    caches.match(req).then(cached => {
      const fetching = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});
