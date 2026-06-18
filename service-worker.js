/* =====================================================================
   CityTimeHub — service-worker.js
   Lightweight, safe caching for fast repeat visits and basic offline.
   - App shell (CSS/JS/icons/fonts) → stale-while-revalidate
   - HTML navigations → network-first, fall back to cache, then to "/"
   Bump CACHE_VERSION to invalidate old caches on the next visit.
   ===================================================================== */
const CACHE_VERSION = "cth-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL = [
  "/",
  "/css/style.css",
  "/js/app.js",
  "/js/city.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
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

function networkFirst(req) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    fetch(req)
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req).then((c) => c || caches.match("/")))
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations → network-first (always try fresh, fall back offline)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets (same-origin css/js/img + Google fonts) → stale-while-revalidate
  const isAsset = /\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
  if (isAsset || url.hostname.includes("fonts.g")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
