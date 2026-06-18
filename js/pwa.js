/* =====================================================================
   CityTimeHub — js/pwa.js
   Registers the service worker and shows a non-intrusive, dismissible
   "Install app" button when the browser reports the app is installable.
   Pure vanilla, no dependencies. Never covers page content.
   ===================================================================== */
(() => {
  "use strict";

  // 1) Register the service worker (progressive enhancement).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }

  // 2) Custom install prompt.
  const DISMISS_KEY = "cth-install-dismissed";
  let deferred = null;

  function dismissedRecently() {
    try {
      const t = +localStorage.getItem(DISMISS_KEY) || 0;
      return Date.now() - t < 14 * 24 * 60 * 60 * 1000; // 14 days
    } catch (e) { return false; }
  }

  function build() {
    if (document.getElementById("cthInstall")) return document.getElementById("cthInstall");
    const bar = document.createElement("div");
    bar.id = "cthInstall";
    bar.className = "pwa-install";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Install CityTimeHub");
    bar.innerHTML = `
      <span class="pwa-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </span>
      <span class="pwa-text">Install CityTimeHub for one-tap access</span>
      <button type="button" class="pwa-go">Install</button>
      <button type="button" class="pwa-x" aria-label="Dismiss">&times;</button>`;
    document.body.appendChild(bar);

    bar.querySelector(".pwa-go").addEventListener("click", async () => {
      if (!deferred) return;
      bar.classList.remove("is-shown");
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) {}
      deferred = null;
    });
    bar.querySelector(".pwa-x").addEventListener("click", () => {
      bar.classList.remove("is-shown");
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
    });
    return bar;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (dismissedRecently()) return;
    const bar = build();
    requestAnimationFrame(() => bar.classList.add("is-shown"));
  });

  window.addEventListener("appinstalled", () => {
    const bar = document.getElementById("cthInstall");
    if (bar) bar.classList.remove("is-shown");
    deferred = null;
  });
})();
