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
    // Standard install: uses THIS page's own <link rel="manifest"> (each tool /
    // bridge page ships its own manifest with the right name + start_url).
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

  /* ----- Site nav: one compact menu on the website; the app hides .site-header entirely. ----- */
  function upgradeSiteNav() {
    var inApp = document.documentElement.classList.contains("app-mode")
      || /CityTimeHubApp/i.test(navigator.userAgent || "")
      || inStandalone
      || new URLSearchParams(location.search).get("app") === "1";
    if (inApp) return;
    var nav = document.querySelector(".main-nav");
    if (!nav || nav.dataset.cthNav === "v2") return;
    var ar = (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar"
      || location.pathname.indexOf("/ar/") === 0
      || location.pathname === "/ar";
    var p = ar ? "/ar" : "";
    var items = ar ? [
      { href: p + "/#cityPanel", label: "مواقيت الصلاة", top: true },
      { href: p + "/close-ones/", label: "أحبابك", top: true },
      { summary: "الأدوات", links: [
        ["time-difference/", "قارن المدن"],
        ["best-time-to-call/", "أفضل وقت للاتصال"],
        ["meeting-planner/", "مخطّط الأحداث"],
        ["prayer-clock/", "ساعة الصلاة"],
        ["qibla/", "القبلة"],
        ["monthly/", "مواقيت الشهر"],
        ["azkar/morning/", "أذكار الصباح"],
        ["azkar/evening/", "أذكار المساء"]
      ]},
      { href: p + "/cities/", label: "المدن", top: true },
      { href: p + "/guides/", label: "خواطر", top: true }
    ] : [
      { href: "/#cityPanel", label: "Prayer Times", top: true },
      { href: "/close-ones/", label: "Close Ones", top: true },
      { summary: "Tools", links: [
        ["time-difference/", "Compare Cities"],
        ["best-time-to-call/", "Best Time to Call"],
        ["meeting-planner/", "Event Planner"],
        ["prayer-clock/", "Prayer Clock"],
        ["qibla/", "Qibla"],
        ["monthly/", "Monthly Times"],
        ["azkar/morning/", "Morning Adhkar"],
        ["azkar/evening/", "Evening Adhkar"]
      ]},
      { href: "/cities/", label: "Cities", top: true },
      { href: "/guides/", label: "Reflections", top: true }
    ];
    nav.innerHTML = "";
    items.forEach(function (it) {
      if (it.summary) {
        var det = document.createElement("details");
        det.className = "nav-drop";
        var sum = document.createElement("summary");
        sum.textContent = it.summary;
        var menu = document.createElement("div");
        menu.className = "nav-drop-menu";
        it.links.forEach(function (pair) {
          var a = document.createElement("a");
          a.href = p + "/" + pair[0];
          a.textContent = pair[1];
          menu.appendChild(a);
        });
        det.appendChild(sum);
        det.appendChild(menu);
        nav.appendChild(det);
      } else {
        var link = document.createElement("a");
        link.href = it.href;
        link.textContent = it.label;
        nav.appendChild(link);
      }
    });
    nav.dataset.cthNav = "v2";
    wireNavDrops(nav);
  }

  function wireNavDrops(nav) {
    if (!nav) nav = document.querySelector(".main-nav");
    if (!nav || nav.dataset.cthDropWire === "1") return;
    var drops = nav.querySelectorAll(".nav-drop");
    if (!drops.length) return;
    drops.forEach(function (det) {
      det.addEventListener("toggle", function () {
        if (!det.open) return;
        drops.forEach(function (other) {
          if (other !== det) other.open = false;
        });
      });
      det.querySelectorAll(".nav-drop-menu a").forEach(function (a) {
        a.addEventListener("click", function () { det.open = false; });
      });
    });
    document.addEventListener("click", function (e) {
      drops.forEach(function (det) {
        if (det.open && !det.contains(e.target)) det.open = false;
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      drops.forEach(function (det) { det.open = false; });
    });
    nav.dataset.cthDropWire = "1";
  }

  /* ----- In-app mode: the tools grid is the primary launcher, so the header
     menu (☰) is repurposed to hold only the secondary/legal links.
     Links are cloned from the footer so they match the page language. ----- */
  function withAppParam(href) {
    try {
      var u = new URL(href, location.origin);
      u.searchParams.set("app", "1");
      return u.pathname + u.search + u.hash;
    } catch (e) { return href; }
  }
  function inAppMode() {
    return document.documentElement.classList.contains("app-mode")
      || /CityTimeHubApp/i.test(navigator.userAgent || "")
      || inStandalone
      || new URLSearchParams(location.search).get("app") === "1";
  }
  function isAppHome() {
    var p = location.pathname.replace(/\/+$/, "") || "/";
    return p === "" || p === "/" || p === "/ar";
  }
  function toolBarTitle() {
    var h1 = document.querySelector("main h1, .hero-title, h1");
    if (h1 && h1.textContent) return h1.textContent.trim();
    return (document.title || "CityTimeHub").replace(/\s*[|—-]\s*CityTimeHub.*$/i, "").trim();
  }
  function installToolAppBar() {
    if (!inAppMode()) return;
    document.documentElement.classList.add("app-mode");
    if (isAppHome() || document.querySelector(".app-bar--tool")) return;
    var ar = (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar"
      || location.pathname.indexOf("/ar/") === 0
      || location.pathname === "/ar";
    var home = ar ? "/ar/?app=1" : "/?app=1";
    var bar = document.createElement("div");
    bar.className = "app-bar app-bar--tool";
    bar.setAttribute("role", "banner");
    bar.innerHTML =
      '<a class="app-bar-back" href="' + home + '" aria-label="' + (ar ? "الرئيسية" : "Home") + '">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>' +
      '<span class="app-bar-title">' + cthEsc(toolBarTitle()) + '</span>' +
      '<span class="app-bar-spacer" aria-hidden="true"></span>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  function ensureAppTabs() {
    if (!inAppMode()) return;
    if (window.CTH_AppTabs || document.querySelector("script[src*='app-tabs.js']")) return;
    var s = document.createElement("script");
    s.src = "/js/app-tabs.js";
    s.defer = true;
    document.head.appendChild(s);
  }
  function applyAppNav() {
    var inApp = inAppMode();
    if (!inApp) return;
    document.documentElement.classList.add("app-mode");
    document.querySelectorAll("a.lang-switch, nav.app-legal a, .app-tools a.app-tool, #coHomeStrip").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      a.setAttribute("href", withAppParam(href));
    });
    var nav = document.querySelector(".main-nav");
    if (!nav) return;
    var wanted = ["about", "privacy", "contact", "terms"];
    var links = [];
    wanted.forEach(function (w) {
      var a = document.querySelector('.site-footer a[href*="/' + w + '"]');
      if (a) links.push(a.cloneNode(true));
    });
    if (links.length) {
      nav.innerHTML = "";
      links.forEach(function (l) {
        l.setAttribute("href", withAppParam(l.getAttribute("href")));
        nav.appendChild(l);
      });
    }
  }
  if (document.readyState !== "loading") { upgradeSiteNav(); wireNavDrops(); applyAppNav(); installToolAppBar(); ensureAppTabs(); }
  else document.addEventListener("DOMContentLoaded", function () { upgradeSiteNav(); wireNavDrops(); applyAppNav(); installToolAppBar(); ensureAppTabs(); });

  /* ----- Universal Share button in the header. Uses the native share sheet
     (WhatsApp / Telegram / etc.) so a visitor can pass the page to family and
     friends in one tap — free word-of-mouth growth, in the site and the app. ----- */
  function siteShareCopy(text) {
    try { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e) {}
  }
  function siteShareToast(msg) {
    var t = document.getElementById("cthShareToast");
    if (!t) { t = document.createElement("div"); t.id = "cthShareToast"; t.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#111a30;color:#eaf1ff;border:1px solid #1e2a44;padding:10px 16px;border-radius:12px;font-size:14px;z-index:9999;opacity:0;transition:opacity .2s;box-shadow:0 12px 34px -12px rgba(0,0,0,.6)"; document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = "1"; clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = "0"; }, 1800);
  }
  function insertShareButton() {
    var host = document.querySelector(".header-right");
    if (!host || document.getElementById("siteShareBtn")) return;
    var ar = (document.documentElement.getAttribute("lang") || "").indexOf("ar") === 0;
    var btn = document.createElement("button");
    btn.id = "siteShareBtn";
    btn.type = "button";
    btn.className = "icon-btn site-share-btn";
    btn.setAttribute("aria-label", ar ? "مشاركة" : "Share");
    btn.title = ar ? "مشاركة الصفحة" : "Share this page";
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
    btn.addEventListener("click", function () {
      var canon = document.querySelector('link[rel="canonical"]');
      var url = (canon && canon.href) || location.href;
      var title = (document.title || "CityTimeHub").replace(/\s*[|—-]\s*CityTimeHub.*$/i, "").trim() || "CityTimeHub";
      try {
        if (window.AndroidApp && typeof AndroidApp.shareText === "function") {
          AndroidApp.shareText(title + "\n" + url);
          return;
        }
      } catch (e) {}
      if (navigator.share) {
        navigator.share({ title: title, text: title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { siteShareToast(ar ? "تم نسخ الرابط ✓" : "Link copied ✓"); }, function () { siteShareCopy(url); siteShareToast(ar ? "تم نسخ الرابط ✓" : "Link copied ✓"); });
      } else { siteShareCopy(url); siteShareToast(ar ? "تم نسخ الرابط ✓" : "Link copied ✓"); }
    });
    var theme = host.querySelector("#themeToggle");
    if (theme) host.insertBefore(btn, theme); else host.appendChild(btn);
  }
  if (document.readyState !== "loading") insertShareButton();
  else document.addEventListener("DOMContentLoaded", insertShareButton);

  /* ----- Prayer-city picker: a worldwide, site-styled city search opened by
     the Android app via window.cthPrayerPicker(). The chosen city is handed
     back through the AndroidApp.onCityPicked bridge. Data: OpenStreetMap
     (Nominatim) so every city on earth is searchable, in Arabic or English. ----- */
  var CTH_METHOD = { eg: 5, sa: 4, ae: 8, kw: 9, qa: 10, bh: 4, om: 8, jo: 3, ly: 5, sd: 5, pk: 1, in: 1, bd: 1, us: 2, ca: 2, tr: 13, id: 20, my: 3, sg: 3, gb: 3, fr: 12 };
  function cthEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cthPickCity(x) {
    var a = x.address || {};
    var name = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || String(x.display_name || "").split(",")[0].trim();
    var country = [a.state, a.country].filter(Boolean).join("، ".length ? ", " : ", ");
    if (!country) country = String(x.display_name || "").split(",").slice(-1)[0].trim();
    var cc = String(a.country_code || "").toLowerCase();
    return { name: name, country: country, lat: parseFloat(x.lat), lng: parseFloat(x.lon), method: CTH_METHOD[cc] || 3 };
  }
  function openPrayerPicker() {
    if (document.getElementById("cthPick")) return;
    var ar = (document.documentElement.getAttribute("lang") || "en").slice(0, 2) === "ar";
    var wrap = document.createElement("div");
    wrap.id = "cthPick";
    wrap.className = "help-overlay";
    wrap.setAttribute("dir", ar ? "rtl" : "ltr");
    wrap.innerHTML =
      '<div class="help-backdrop"></div>' +
      '<div class="help-sheet" style="max-width:min(460px,100%)">' +
        '<button type="button" class="help-x" aria-label="' + (ar ? "إغلاق" : "Close") + '">&times;</button>' +
        '<h3 class="help-title">' + (ar ? "اختر مدينتك" : "Choose your city") + "</h3>" +
        '<p class="help-sub">' + (ar ? "للتذكير بمواقيت الصلاة" : "For prayer-time reminders") + "</p>" +
        '<input id="cthPickInput" class="ac-input" type="text" autocomplete="off" placeholder="' + (ar ? "ابحث باسم المدينة" : "Search by city name") + '" style="width:100%">' +
        '<ul class="search-suggest" id="cthPickList" style="position:static;margin-top:10px;max-height:44vh;overflow:auto;box-shadow:none"></ul>' +
        '<p style="margin:10px 2px 0;font-size:.72rem;opacity:.55">' + (ar ? "نتائج البحث من OpenStreetMap" : "Search by OpenStreetMap") + "</p>" +
      "</div>";
    document.body.appendChild(wrap);
    try { if (window.AndroidApp && AndroidApp.setPullToRefresh) AndroidApp.setPullToRefresh(false); } catch (e) {}
    var input = wrap.querySelector("#cthPickInput");
    var list = wrap.querySelector("#cthPickList");
    function close() { try { if (window.AndroidApp && AndroidApp.setPullToRefresh) AndroidApp.setPullToRefresh(true); } catch (e) {} wrap.remove(); }
    wrap.querySelector(".help-x").addEventListener("click", close);
    wrap.querySelector(".help-backdrop").addEventListener("click", close);
    var timer = null, seq = 0;
    // Highlight the matched run the same way the site's inline searches do, so the
    // app picker feels like one family with them. Falls back to plain escaped text.
    var HL = (window.CTH_CITY_INP && window.CTH_CITY_INP.highlight)
      ? window.CTH_CITY_INP.highlight : function (t) { return cthEsc(t); };
    function render(items) {
      if (!items.length) { list.innerHTML = '<li class="suggest-item" style="cursor:default;opacity:.6">' + (ar ? "لا توجد مدينة بهذا الاسم" : "No city found") + "</li>"; list._items = []; return; }
      var q = input.value;
      list.innerHTML = items.map(function (c, i) {
        return '<li class="suggest-item" data-i="' + i + '"><span class="suggest-name">' + HL(c.name, q) + '</span><span class="suggest-meta"><span class="suggest-country">' + cthEsc(c.country) + "</span></span></li>";
      }).join("");
      list._items = items;
    }
    function doSearch(q) {
      var my = ++seq;
      var lang = ar ? "ar" : "en";
      fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=" + lang + "&q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (my !== seq) return;
          var seen = {}, items = [];
          (d || []).forEach(function (x) {
            var c = cthPickCity(x);
            if (!c.name || isNaN(c.lat)) return;
            var k = c.name + "|" + c.country;
            if (seen[k]) return; seen[k] = 1; items.push(c);
          });
          render(items);
        })
        .catch(function () {});
    }
    input.addEventListener("input", function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 3) { list.innerHTML = ""; return; }
      timer = setTimeout(function () { doSearch(q); }, 450);
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".suggest-item");
      if (!li || li.dataset.i == null) return;
      var c = (list._items || [])[+li.dataset.i];
      if (!c) return;
      try { if (window.AndroidApp && AndroidApp.onCityPicked) AndroidApp.onCityPicked(JSON.stringify(c)); } catch (e) {}
      close();
    });
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
  }
  window.cthPrayerPicker = openPrayerPicker;

  document.dispatchEvent(new CustomEvent("cth-pwa-ready"));
})();
