/* Push the 4-city board snapshot to the Android widget. No UI; no-op on the website. */
(() => {
  "use strict";
  const STORE = "cth-cities-board";
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const NAMES = {
    Fajr: { ar: "الفجر", en: "Fajr" },
    Dhuhr: { ar: "الظهر", en: "Dhuhr" },
    Asr: { ar: "العصر", en: "Asr" },
    Maghrib: { ar: "المغرب", en: "Maghrib" },
    Isha: { ar: "العشاء", en: "Isha" }
  };

  let catalog = null;
  let catalogWait = null;

  function todayStr() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  function readCache(slug, lat, lng) {
    try {
      const key = "cth-prayer:" + (slug || (lat + "," + lng));
      const o = JSON.parse(localStorage.getItem(key) || "null");
      if (!o || !o.timings || o.ds !== todayStr()) return null;
      return o;
    } catch (e) { return null; }
  }

  function partsInTz(tz) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || undefined,
      hour: "2-digit", minute: "2-digit",
      hour12: false
    });
    const map = {};
    for (const p of fmt.formatToParts(new Date())) if (p.type !== "literal") map[p.type] = p.value;
    return map;
  }

  function nextPrayer(tz, timings) {
    if (!timings || !tz) return null;
    const p = partsInTz(tz);
    const now = (+p.hour) * 60 + (+p.minute);
    for (let i = 0; i < PRAYERS.length; i++) {
      const key = PRAYERS[i];
      const hm = timings[key];
      if (!hm) continue;
      const a = String(hm).split(":");
      const t = (+a[0]) * 60 + (+a[1]);
      if (t > now) return { key, hm };
    }
    const fajr = timings.Fajr;
    return fajr ? { key: "Fajr", hm: fajr } : null;
  }

  function loadBoard() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(raw) ? raw.filter(e => e && e.slug).slice(0, 4) : [];
    } catch (e) { return []; }
  }

  function loadCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (catalogWait) return catalogWait;
    catalogWait = fetch("/data/cities.json", { cache: "force-cache" })
      .then(r => r.json())
      .then(data => {
        catalog = Object.create(null);
        (data.cities || []).forEach(c => { if (c && c.slug) catalog[c.slug] = c; });
        return catalog;
      })
      .catch(() => {
        catalog = Object.create(null);
        return catalog;
      });
    return catalogWait;
  }

  function canSync() {
    try { return !!(window.AndroidApp && AndroidApp.syncCitiesBoard); } catch (e) { return false; }
  }

  async function sync() {
    if (!canSync()) return;
    const map = await loadCatalog();
    const rows = loadBoard().map(e => {
      const city = map[e.slug] || {};
      const cache = readCache(e.slug, e.lat, e.lng) || {};
      const tz = cache.tz || e.tz || city.tz || "";
      const next = nextPrayer(tz, cache.timings);
      return {
        slug: e.slug,
        name: e.name || city.name || e.slug,
        name_ar: e.name_ar || city.name_ar || e.name || city.name || e.slug,
        tz: tz,
        nextName: next ? NAMES[next.key].en : "",
        nextNameAr: next ? NAMES[next.key].ar : "",
        nextHm: next ? String(next.hm).split(" ")[0] : ""
      };
    });
    try { AndroidApp.syncCitiesBoard(JSON.stringify(rows)); } catch (err) {}
  }

  window.cthSyncCitiesBoard = sync;
  function kick() {
    sync();
    if (!canSync()) {
      var n = 0;
      var t = setInterval(function () {
        n += 1;
        if (canSync() || n > 8) { clearInterval(t); if (canSync()) sync(); }
      }, 400);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", kick);
  else kick();
})();
