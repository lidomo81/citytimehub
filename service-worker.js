/* =====================================================================
   CityTimeHub — service-worker.js
   Real offline support:
   - Precache the full app shell (both homepages, CSS, all JS, data, icons)
     so the app opens fully styled with data even with no network.
   - Same-origin assets → stale-while-revalidate.
   - Prayer-times / sunrise-sunset APIs → network-first, fall back to the
     last cached response so today's times still show offline.
   - HTML navigations → network-first, fall back to the cached homepage
     (language-aware), so installed city apps open offline.
   Bump CACHE_VERSION to invalidate old caches on the next visit.
   ===================================================================== */
const CACHE_VERSION = "cth-v80";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

const SHELL = [
  "/", "/ar/",
  "/css/style.css",
  "/js/app.js", "/js/city.js", "/js/city-pulse.js", "/js/occasions.js", "/js/prayer-insights.js", "/js/daily-reflection.js", "/js/tour.js", "/js/compare-tool.js", "/js/meeting-planner.js",
  "/js/best-time-to-call.js", "/js/prayer-clock.js", "/js/close-ones.js", "/js/prayer-widget.js",
  "/js/prayer-widget-builder.js", "/js/branches-builder.js", "/js/branches-widget.js",
  "/js/hero-globe.js", "/js/pwa.js", "/js/qibla.js", "/js/monthly.js", "/js/azkar.js", "/js/prayer-azkar.js",
  "/data/cities.json", "/data/compare-hubs.json", "/data/globe-frames.json",
  "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png", "/icons/favicon-64.png", "/icons/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(req) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
}

// APIs (prayer times, sunrise/sunset): try network, cache good responses,
// fall back to the last cached response when offline.
function apiNetworkFirst(req) {
  return caches.open(API_CACHE).then((cache) =>
    fetch(req)
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req))
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Prayer-times / sun APIs (cross-origin) → network-first with cache fallback
  if (url.hostname.includes("aladhan.com") || url.hostname.includes("sunrise-sunset.org")) {
    event.respondWith(apiNetworkFirst(req));
    return;
  }

  // HTML navigations → network-first, offline fall back to cached homepage (by language)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && sameOrigin) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) =>
            c || caches.match(url.pathname.startsWith("/ar") ? "/ar/" : "/")
          )
        )
    );
    return;
  }

  // Same-origin static assets + data → stale-while-revalidate
  const isAsset = /\.(css|js|json|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
  if ((sameOrigin && isAsset) || url.hostname.includes("fonts.g")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
