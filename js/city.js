/* =====================================================================
   CityTimeHub — js/city.js   (shared engine for every /cities/*.html)
   Each city page sets  window.CITY_SLUG = "cairo"  before this loads.
   Live local clock (Intl, no API), day/night hero tint, Gregorian + Hijri
   date and prayer times (AlAdhan), sunrise/sunset (sunrise-sunset.org),
   and related-city links — all driven from data/cities.json.
   ===================================================================== */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  let CITY = null, CITIES = [];

  /* ---------- Language (reads <html lang>) ---------- */
  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const I18N = {
    en: {
      next: "Next",
      prayerErr: "Couldn't load prayer times. Check your connection and try again.",
      prayers: ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"],
      ah: "AH", na: "n/a",
      dayLen: (h, m) => `${h}h ${m}m`,
      dayIn: n => `Daytime in ${n}`, nightIn: n => `Night in ${n}`,
    },
    ar: {
      next: "التالية",
      prayerErr: "تعذّر تحميل مواقيت الصلاة. تحقّق من اتصالك وحاول مرة أخرى.",
      prayers: ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"],
      ah: "هـ", na: "غير متاح",
      dayLen: (h, m) => `${h}h ${m}m`,
      dayIn: n => `نهارٌ في ${n}`, nightIn: n => `ليلٌ في ${n}`,
      gregMonths: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    },
  };
  const T = I18N[LANG];
  const cName = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cCountry = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");

  /* ---------- day/night colour ramp (matches the homepage meridian) ---------- */
  const RAMP = [
    "#0a0f24","#0a0f24","#0c1230","#101a3e","#1c2a5a","#46376f","#8a4f7a","#cf6b43",
    "#e69152","#6fa8d6","#4f9fe0","#3f9bf0","#38bdf8","#3f9bf0","#4f9fe0","#6fa8d6",
    "#b89a78","#e0a35a","#e0824a","#b85a5e","#5e3f74","#23204a","#121634","#0c1130"
  ];
  const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  function rampColor(hour) {
    const h = ((hour % 24) + 24) % 24, i = Math.floor(h), f = h - i;
    const a = hex2rgb(RAMP[i]), b = hex2rgb(RAMP[(i + 1) % 24]);
    const m = a.map((v, k) => Math.round(v + (b[k] - v) * f));
    return `rgb(${m[0]},${m[1]},${m[2]})`;
  }

  /* ---------- time helpers ---------- */
  const fmtCache = new Map();
  function formatters(tz) {
    if (fmtCache.has(tz)) return fmtCache.get(tz);
    const pair = {
      time: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      date: new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })
    };
    fmtCache.set(tz, pair); return pair;
  }
  function offsetHours(tz, when = new Date()) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
      .formatToParts(when).find(x => x.type === "timeZoneName");
    if (!p) return 0;
    const m = p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
  }
  function offsetLabel(off) {
    const sign = off < 0 ? "−" : "+", a = Math.abs(off), h = Math.floor(a), mm = Math.round((a - h) * 60);
    return `UTC${sign}${h}${mm ? ":" + String(mm).padStart(2, "0") : ""}`;
  }
  function localHourAt(off, now) {
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    return ((utcH + off) % 24 + 24) % 24;
  }
  const isDay = h => h >= 6 && h < 18;

  /* ---------- theme toggle (shared with homepage via same storage key) ---------- */
  function initTheme() {
    const stored = localStorage.getItem("cth-theme");
    const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    const btn = $("#themeToggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(theme === "dark"));
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("cth-theme", next);
      btn.setAttribute("aria-pressed", String(next === "dark"));
    });
  }

  /* ---------- data ---------- */
  async function loadCities() {
    if (window.__CITIES__) { CITIES = window.__CITIES__.cities || []; return; }
    const res = await fetch("/data/cities.json");
    if (!res.ok) throw new Error("cities.json " + res.status);
    CITIES = (await res.json()).cities || [];
  }

  /* ---------- per-second tick: city clock, header UTC, day/night ---------- */
  function tick() {
    const now = new Date();
    const f = formatters(CITY.tz);

    const clock = $("#cityClock");
    if (clock) clock.textContent = f.time.format(now);

    const off = offsetHours(CITY.tz, now);
    const offEl = $("#factOffset"); if (offEl) offEl.textContent = offsetLabel(off);
    const fullDate = $("#cityFullDate"); if (fullDate) fullDate.textContent = f.date.format(now);

    // day/night hero tint + label
    const lh = localHourAt(off, now), day = isDay(lh);
    const hero = $("#cityHero");
    if (hero) {
      const c1 = rampColor(lh), c2 = rampColor(lh + 2.5);
      hero.style.background = `radial-gradient(120% 150% at 50% -20%, ${c2} 0%, ${c1} 60%, #0a0f24 100%)`;
    }
    const dnl = $("#dayNightLabel");
    if (dnl) dnl.textContent = day ? T.dayIn(cName(CITY)) : T.nightIn(cName(CITY));
    const dni = $("#dayNightIcon"); if (dni) dni.textContent = day ? "☀" : "☾";

    // header UTC readout
    const hu = $("#headerUtc");
    if (hu) hu.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  }
  function startClock() {
    tick();
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(() => { tick(); setInterval(tick, 1000); }, delay);
  }

  /* ---------- prayer + Hijri / Gregorian (AlAdhan) ---------- */
  const PRAYERS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
  async function loadPrayer() {
    const grid = $("#prayerGrid"); if (!grid) return;
    const today = new Date();
    const ds = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timings/${ds}?latitude=${CITY.lat}&longitude=${CITY.lng}&method=${CITY.method ?? 3}`);
      if (!res.ok) throw new Error("timings " + res.status);
      const { data } = await res.json();
      const t = data.timings, g = data.date.gregorian, h = data.date.hijri;
      const gd = $("#gregDate");
      if (gd) {
        const gdate = new Date(Date.UTC(+g.year, (+(g.month && g.month.number) || 1) - 1, +g.day));
        gd.textContent = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(gdate);
      }
      const hd = $("#hijriDate"); if (hd) hd.textContent = `${h.day} ${LANG === "ar" ? h.month.ar : h.month.en} ${h.year} ${T.ah}`;
      const clean = s => (s || "").split(" ")[0];
      const next = nextPrayer(t);
      grid.innerHTML = PRAYERS.map((p, i) => `
        <article class="prayer-card${p === next ? " is-next" : ""}">
          <div class="prayer-name">${T.prayers[i]}</div>
          <div class="prayer-time">${clean(t[p])}</div>
          <span class="prayer-tag">${p === next ? T.next : ""}</span>
        </article>`).join("");
    } catch {
      grid.innerHTML = `<p class="no-results" style="grid-column:1/-1">${T.prayerErr}</p>`;
    }
  }
  function nextPrayer(t) {
    const now = new Date(), mins = now.getHours()*60 + now.getMinutes();
    for (const p of PRAYERS) {
      const [hh, mm] = (t[p] || "").split(" ")[0].split(":");
      if ((+hh)*60 + (+mm) > mins) return p;
    }
    return "Fajr";
  }

  /* ---------- sunrise / sunset ---------- */
  async function loadSun() {
    const rise = $("#sunriseVal"); if (!rise) return;
    try {
      const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${CITY.lat}&lng=${CITY.lng}&formatted=0`);
      if (!res.ok) throw new Error("sun " + res.status);
      const { results, status } = await res.json();
      if (status !== "OK") throw new Error(status);
      const tf = new Intl.DateTimeFormat("en-GB", { timeZone: CITY.tz, hour: "2-digit", minute: "2-digit", hour12: false });
      $("#sunriseVal").textContent = tf.format(new Date(results.sunrise));
      $("#sunsetVal").textContent  = tf.format(new Date(results.sunset));
      const s = results.day_length, hh = Math.floor(s/3600), mm = Math.floor((s%3600)/60);
      $("#dayLength").textContent = T.dayLen(hh, String(mm).padStart(2,"0"));
    } catch {
      $("#sunriseVal").textContent = "—"; $("#sunsetVal").textContent = "—"; $("#dayLength").textContent = T.na;
    }
  }

  /* ---------- related cities ---------- */
  function renderRelated() {
    const grid = $("#relatedGrid"); if (!grid) return;
    const pages = CITIES.filter(c => c.page && c.slug !== CITY.slug);
    const sameCountry = pages.filter(c => c.country === CITY.country);
    const others = pages.filter(c => c.country !== CITY.country);
    const seen = new Set([CITY.slug]);
    const related = [...sameCountry, ...others].filter(c => !seen.has(c.slug) && seen.add(c.slug)).slice(0, 6);
    grid.innerHTML = related.map(c => `
      <a class="city-card" href="${c.slug}.html" data-tz="${c.tz}">
        <div class="city-top">
          <span><span class="city-name">${cName(c)}</span><br><span class="city-country">${cCountry(c)}</span></span>
          <span class="city-daynight" data-daynight>·</span>
        </div>
        <div class="city-time" data-time>--:--:--</div>
        <div class="city-foot">
          <span class="city-coords">${offsetLabel(offsetHours(c.tz))}</span>
          <span class="city-offset">View →</span>
        </div>
      </a>`).join("");
    // animate related clocks too
    setInterval(() => {
      const now = new Date();
      $$("#relatedGrid [data-tz]").forEach(el => {
        const t = el.querySelector("[data-time]");
        const dn = el.querySelector("[data-daynight]");
        if (t) t.textContent = formatters(el.dataset.tz).time.format(now);
        if (dn) { const lh = localHourAt(offsetHours(el.dataset.tz, now), now); dn.textContent = isDay(lh) ? "☀" : "☾"; el.style.setProperty("--tint", isDay(lh) ? "#f59e0b" : "#6366f1"); }
      });
    }, 1000);
  }

  /* ---------- boot ---------- */
  async function init() {
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    initTheme();
    try { await loadCities(); } catch { return; }
    CITY = CITIES.find(c => c.slug === window.CITY_SLUG);
    if (!CITY) { console.warn("Unknown city slug:", window.CITY_SLUG); return; }

    // fill any data-bound static spots (kept minimal; SEO text stays in HTML)
    $$("[data-city-name]").forEach(el => el.textContent = CITY.name);

    startClock();
    loadPrayer();
    loadSun();
    renderRelated();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
