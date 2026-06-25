/* =====================================================================
   CityTimeHub — js/pwa.js
   Service-worker registration + a small install API that lets any view
   be installed under its own name (e.g. "Cairo prayer times"), via a
   dynamically-built web app manifest. iOS gets an "Add to Home Screen"
   hint sheet. Pure vanilla, no dependencies.

   Public API (window.CTH_PWA):
     .canInstall()            -> boolean (false when already installed)
     .isIOS, .inStandalone    -> booleans
     .install({ name, shortName, startUrl, lang, dir }) -> Promise<string>
   ===================================================================== */
(() => {
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }

  let deferred = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const inStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    document.dispatchEvent(new CustomEvent("cth-installable"));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    document.dispatchEvent(new CustomEvent("cth-installed"));
  });

  /* ----- dynamic manifest (so each view installs under its own name) ----- */
  let blobUrl = null;
  function buildManifest(opts) {
    const o = location.origin;
    return {
      name: opts.name,
      short_name: (opts.shortName || opts.name || "CityTimeHub").slice(0, 12),
      description: opts.name,
      start_url: opts.startUrl || "/",
      scope: "/",
      id: opts.startUrl || "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#0B1120",
      theme_color: "#0B1120",
      lang: opts.lang || "en",
      dir: opts.dir || "ltr",
      icons: [
        { src: o + "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: o + "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: o + "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };
  }
  function swapManifest(opts) {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return false;
    if (!link.dataset.orig) link.dataset.orig = link.getAttribute("href");
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(
      new Blob([JSON.stringify(buildManifest(opts))], { type: "application/manifest+json" })
    );
    link.setAttribute("href", blobUrl);
    return true;
  }
  // After the browser re-reads a changed manifest it re-fires beforeinstallprompt.
  function waitForPrompt(ms) {
    return new Promise((resolve) => {
      let done = false;
      const h = (e) => { e.preventDefault(); if (done) return; done = true; cleanup(); resolve(e); };
      const cleanup = () => window.removeEventListener("beforeinstallprompt", h);
      window.addEventListener("beforeinstallprompt", h);
      setTimeout(() => { if (done) return; done = true; cleanup(); resolve(null); }, ms);
    });
  }

  async function install(opts) {
    opts = opts || {};
    if (inStandalone) return "installed";
    if (isIOS) { showIosSheet(opts); return "ios"; }

    if (opts.name && opts.startUrl && swapManifest(opts)) {
      const fresh = await waitForPrompt(1600);
      const p = fresh || deferred;
      if (!p) return "unavailable";
      p.prompt();
      try { await p.userChoice; } catch (e) {}
      deferred = null;
      return "prompted";
    }
    if (!deferred) return "unavailable";
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    deferred = null;
    return "prompted";
  }

  /* ----- iOS "Add to Home Screen" hint ----- */
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function showIosSheet(opts) {
    if (document.getElementById("cthIos")) return;
    const ar = (document.documentElement.getAttribute("lang") || "en").slice(0, 2) === "ar";
    const title = opts.name || (ar ? "تثبيت التطبيق" : "Install app");
    const steps = ar
      ? `لتثبيت <strong>${esc(title)}</strong> على الآيفون: اضغط زر المشاركة في Safari، ثم اختر <strong>«أضِف إلى الشاشة الرئيسية»</strong>.`
      : `To install <strong>${esc(title)}</strong> on iPhone: tap the Share button in Safari, then choose <strong>"Add to Home Screen"</strong>.`;
    const wrap = document.createElement("div");
    wrap.id = "cthIos";
    wrap.className = "cth-ios";
    wrap.innerHTML =
      `<div class="cth-ios-card" role="dialog" aria-label="${ar ? "تعليمات التثبيت" : "Install instructions"}">
        <button type="button" class="cth-ios-x" aria-label="${ar ? "إغلاق" : "Close"}">&times;</button>
        <p class="cth-ios-t">${steps}</p>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    wrap.querySelector(".cth-ios-x").addEventListener("click", close);
  }

  window.CTH_PWA = {
    isIOS,
    inStandalone,
    canInstall() { return inStandalone ? false : (isIOS || !!deferred); },
    install
  };

  /* Auto-wire any [data-pwa-install] button (tools etc.) */
  function wireButtons() {
    document.querySelectorAll("[data-pwa-install]").forEach((btn) => {
      if (btn.dataset.pwaWired) return;
      btn.dataset.pwaWired = "1";
      const sync = () => { btn.hidden = !window.CTH_PWA.canInstall(); };
      document.addEventListener("cth-installable", sync);
      document.addEventListener("cth-installed", () => { btn.hidden = true; });
      sync();
      btn.addEventListener("click", () => {
        const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2);
        install({
          name: btn.dataset.pwaName,
          shortName: btn.dataset.pwaShort || btn.dataset.pwaName,
          startUrl: btn.dataset.pwaUrl,
          lang,
          dir: document.documentElement.getAttribute("dir") || "ltr"
        });
      });
    });
  }
  if (document.readyState !== "loading") wireButtons();
  else document.addEventListener("DOMContentLoaded", wireButtons);

  document.dispatchEvent(new CustomEvent("cth-pwa-ready"));
})();
