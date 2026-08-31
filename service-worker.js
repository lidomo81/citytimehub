/* =====================================================================
   CityTimeHub — service-worker.js
   Real offline support:
   - Precache a small home shell so the app opens quickly.
   - Same-origin assets → stale-while-revalidate (search every cache).
   - Prayer-times / sunrise-sunset APIs → network-first, fall back to cache.
   - Website HTML → network-first.
   - App WebView (?app=1) → cache-first so the installed app opens immediately.
   Bump CACHE_VERSION only when the shell list itself must be replaced.
   Never wipe runtime/API caches on activate — that made the app feel slow
   after a site deploy.
   ===================================================================== */
const CACHE_VERSION = "cth-v294";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

const CRITICAL = [
  "/", "/ar", "/ar/",
  "/css/style.css",
  "/js/app.js", "/js/city.js", "/js/city-input.js", "/js/pwa.js", "/js/app-tabs.js",
  "/icons/favicon-64.png", "/icons/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => Promise.allSettled(CRITICAL.map((u) => c.add(u))))
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
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

function matchAny(req) {
  return caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true }));
}

function matchHome(url) {
  const p = url.pathname;
  const alts =
    p === "/" || p === "/index.html" ? ["/", "/index.html"] :
    p === "/ar" || p === "/ar/" || p === "/ar/index.html" ? ["/ar", "/ar/", "/ar/index.html"] :
    [];
  return alts.reduce(
    (prev, u) => prev.then((hit) => hit || caches.match(u)),
    Promise.resolve(null)
  );
}

function staleWhileRevalidate(req) {
  return matchAny(req).then((cached) => {
    const network = fetch(req)
      .then((res) => putRuntime(req, res))
      .catch(() => cached);
    return cached || network;
  });
}

function apiNetworkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(API_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() => matchAny(req));
}

function navigateApp(req, url) {
  return matchAny(req).then((hit) => hit || matchHome(url)).then((cached) => {
    const network = fetch(req)
      .then((res) => putRuntime(req, res))
      .catch(() => cached || caches.match("/ar").then((a) => a || caches.match("/")));
    return cached || network;
  });
}

function navigateSite(req, url) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok && url.origin === self.location.origin) putRuntime(req, res);
      return res;
    })
    .catch(() =>
      matchAny(req).then((c) =>
        c || caches.match(url.pathname.startsWith("/ar") ? "/ar" : "/")
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
    const isApp = url.searchParams.get("app") === "1";
    event.respondWith(isApp ? navigateApp(req, url) : navigateSite(req, url));
    return;
  }

  const isAsset = /\.(css|js|json|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
  if ((sameOrigin && isAsset) || url.hostname.includes("fonts.g")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
