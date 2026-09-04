/* =====================================================================
   CityTimeHub — service-worker.js
   Real offline support:
   - Precache a small home shell so the app opens quickly.
   - Same-origin assets → stale-while-revalidate (search every cache).
   - Prayer-times / sunrise-sunset APIs → network-first, fall back to cache.
   - HTML (site + app) → network-first. Never serve a redirected cached
     document — WebView treats that as "page unavailable".
   Bump CACHE_VERSION only when the shell list itself must be replaced.
   Never wipe runtime/API caches on activate.
   ===================================================================== */
const CACHE_VERSION = "cth-v297";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

const CRITICAL = [
  "/", "/ar",
  "/css/style.css",
  "/js/app.js", "/js/city.js", "/js/city-input.js", "/js/pwa.js", "/js/app-tabs.js",
  "/icons/favicon-64.png", "/icons/logo.svg",
];

function usable(res) {
  return !!(res && res.ok && !res.redirected && (res.type === "basic" || res.type === "cors"));
}

function addShell(cache, path) {
  return fetch(path, { redirect: "follow" }).then((res) => {
    if (!usable(res)) return;
    return cache.put(path, res);
  }).catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => Promise.allSettled(CRITICAL.map((u) => addShell(c, u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.endsWith("-shell") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function putRuntime(req, res) {
  if (usable(res)) {
    const copy = res.clone();
    caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

function matchUsable(req) {
  return caches.match(req).then((hit) => {
    if (usable(hit)) return hit;
    return caches.match(req, { ignoreSearch: true }).then((alt) => (usable(alt) ? alt : null));
  });
}

function matchHome(url) {
  const p = url.pathname;
  const alts =
    p === "/" || p === "/index.html" ? ["/", "/index.html"] :
    p === "/ar" || p === "/ar/" || p === "/ar/index.html" ? ["/ar", "/ar/index.html"] :
    [];
  return alts.reduce(
    (prev, u) => prev.then((hit) => {
      if (usable(hit)) return hit;
      return caches.match(u).then((r) => (usable(r) ? r : null));
    }),
    Promise.resolve(null)
  );
}

function staleWhileRevalidate(req) {
  return matchUsable(req).then((cached) => {
    const network = fetch(req)
      .then((res) => putRuntime(req, res))
      .catch(() => cached);
    return cached || network;
  });
}

function apiNetworkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (usable(res)) {
        const copy = res.clone();
        caches.open(API_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() => matchUsable(req));
}

function navigateNetworkFirst(req, url) {
  return fetch(req)
    .then((res) => {
      if (usable(res) && url.origin === self.location.origin) putRuntime(req, res);
      return res;
    })
    .catch(() =>
      matchUsable(req).then((c) =>
        c || matchHome(url).then((h) =>
          h || caches.match(url.pathname.startsWith("/ar") ? "/ar" : "/").then((f) =>
            usable(f) ? f : undefined
          )
        )
      )
    );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (url.hostname.includes("aladhan.com") || url.hostname.includes("sunrise-sunset.org")) {
    event.respondWith(apiNetworkFirst(req));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(navigateNetworkFirst(req, url));
    return;
  }

  const isAsset = /\.(css|js|json|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
  if ((sameOrigin && isAsset) || url.hostname.includes("fonts.g")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
