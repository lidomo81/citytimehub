/* =====================================================================
   CityTimeHub — app.js  (The Meridian edition)
   Live clocks via Intl.DateTimeFormat (no clock API), a live day/night
   meridian of world time, city grid + search, reference clocks,
   prayer times + Hijri date (AlAdhan), sunrise/sunset (sunrise-sunset.org).
   ===================================================================== */
(() => {
  "use strict";

  /* ---------- State ---------- */
  let CITIES = [];
  const fmtCache = new Map();
  let selectedPrayerCity = null;
  let meridianCities = [];          // de-duplicated featured cities for pins

  const OFF_MIN = -12, OFF_MAX = 14, OFF_SPAN = OFF_MAX - OFF_MIN;  // band range

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Time-of-day colour ramp (24 anchors, interpolated) ---------- */
  const RAMP = [
    "#0a0f24","#0a0f24","#0c1230","#101a3e","#1c2a5a","#46376f","#8a4f7a","#cf6b43",
    "#e69152","#6fa8d6","#4f9fe0","#3f9bf0","#38bdf8","#3f9bf0","#4f9fe0","#6fa8d6",
    "#b89a78","#e0a35a","#e0824a","#b85a5e","#5e3f74","#23204a","#121634","#0c1130"
  ];
  const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  function rampColor(hour) {                 // hour: float 0..24
    const h = ((hour % 24) + 24) % 24;
    const i = Math.floor(h), f = h - i;
    const a = hex2rgb(RAMP[i]), b = hex2rgb(RAMP[(i + 1) % 24]);
    const m = a.map((v, k) => Math.round(v + (b[k] - v) * f));
    return `rgb(${m[0]},${m[1]},${m[2]})`;
  }

  /* ---------- Formatters (one per timezone, reused) ---------- */
  function formatters(tz) {
    if (fmtCache.has(tz)) return fmtCache.get(tz);
    const pair = {
      time: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      hm:   new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }),
      date: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short" })
    };
    fmtCache.set(tz, pair);
    return pair;
  }

  /* ---------- UTC offset (float hours) + pretty label ---------- */
  function offsetHours(tz, when = new Date()) {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" });
    const p = dtf.formatToParts(when).find(x => x.type === "timeZoneName");
    if (!p) return 0;
    const m = p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;                                  // "GMT" with no number = 0
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
  }
  function offsetLabel(off) {
    const sign = off < 0 ? "−" : "+";
    const a = Math.abs(off), h = Math.floor(a), mm = Math.round((a - h) * 60);
    return `UTC${sign}${h}${mm ? ":" + String(mm).padStart(2, "0") : ""}`;
  }
  const offsetToPct = off => ((off - OFF_MIN) / OFF_SPAN) * 100;
  // local hour (float) at a given offset, right now
  function localHourAt(off, now) {
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    return ((utcH + off) % 24 + 24) % 24;
  }
  const isDay = h => h >= 6 && h < 18;

  /* ---------- Theme ---------- */
  function initTheme() {
    const stored = localStorage.getItem("cth-theme");
    const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    $("#themeToggle").setAttribute("aria-pressed", String(theme === "dark"));
    $("#themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("cth-theme", next);
      $("#themeToggle").setAttribute("aria-pressed", String(next === "dark"));
    });
  }

  /* ---------- Data ---------- */
  async function loadCities() {
    const res = await fetch("data/cities.json");
    if (!res.ok) throw new Error("cities.json " + res.status);
    CITIES = (await res.json()).cities || [];
  }

  /* ---------- The Meridian: pins, axis, band, sun ---------- */
  function buildMeridian() {
    // featured cities de-duplicated by integer offset → clean spread of pins
    const seen = new Set();
    meridianCities = CITIES.filter(c => c.featured)
      .map(c => ({ ...c, off: offsetHours(c.tz) }))
      .sort((a, b) => a.off - b.off)
      .filter(c => { const k = Math.round(c.off); if (seen.has(k)) return false; seen.add(k); return true; });

    $("#meridianPins").innerHTML = meridianCities.map(c => `
      <div class="pin" data-tz="${c.tz}" style="left:${offsetToPct(c.off)}%">
        <div class="pin-stem"></div>
        <div class="pin-card">
          <div class="pin-city">${c.name}</div>
          <div class="pin-time" data-time>--:--</div>
        </div>
      </div>`).join("");

    // axis ticks every 3 hours
    let ticks = "";
    for (let o = -9; o <= 12; o += 3) {
      ticks += `<span class="axis-tick" style="left:${offsetToPct(o)}%">${offsetLabel(o)}</span>`;
    }
    $("#meridianAxis").innerHTML = ticks;
    updateMeridian();
  }

  // Recompute the live band gradient, sun position and daylight count.
  function updateMeridian() {
    const now = new Date();
    const stops = [];
    for (let o = OFF_MIN; o <= OFF_MAX; o++) {
      stops.push(`${rampColor(localHourAt(o, now))} ${offsetToPct(o).toFixed(1)}%`);
    }
    $("#meridianBand").style.background = `linear-gradient(90deg, ${stops.join(", ")})`;

    // solar noon sits where local hour == 12  →  offset = 12 - utcH
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
    let sunOff = 12 - utcH;
    while (sunOff > OFF_MAX) sunOff -= 24;
    while (sunOff < OFF_MIN) sunOff += 24;
    $("#meridianSun").style.left = `${offsetToPct(sunOff)}%`;

    const lit = meridianCities.filter(c => isDay(localHourAt(c.off, now))).length;
    $("#daylightCount").textContent = lit;
  }

  /* ---------- City grid ---------- */
  function renderCities(list = CITIES) {
    $("#cityGrid").innerHTML = list.map(c => {
      const off = offsetHours(c.tz);
      const lat = `${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? "N" : "S"}`;
      const lng = `${Math.abs(c.lng).toFixed(2)}°${c.lng >= 0 ? "E" : "W"}`;
      const tag  = c.page ? "a" : "div";
      const href = c.page ? ` href="cities/${c.slug}.html"` : "";
      const cls  = c.page ? "city-card" : "city-card city-card--static";
      return `
      <${tag} class="${cls}"${href} data-tz="${c.tz}"
         data-search="${(c.name + " " + c.name_ar + " " + c.country + " " + c.country_ar).toLowerCase()}">
        <div class="city-top">
          <span><span class="city-name">${c.name}</span><br><span class="city-country">${c.country}</span></span>
          <span class="city-daynight" data-daynight>·</span>
        </div>
        <div class="city-time" data-time>--:--:--</div>
        <div class="city-date" data-date>—</div>
        <div class="city-foot">
          <span class="city-coords">${lat} ${lng}</span>
          <span class="city-offset">${offsetLabel(off)}</span>
        </div>
      </${tag}>`;
    }).join("");
    $("#cityCount").textContent = CITIES.length;
  }

  function initSearch() {
    const input = $("#citySearch"), noResults = $("#noResults");
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      $$(".city-card").forEach(card => {
        const match = !q || card.dataset.search.includes(q);
        card.style.display = match ? "" : "none";
        if (match) shown++;
      });
      noResults.hidden = shown !== 0;
    });
  }

  /* ---------- Per-second tick ---------- */
  function tick() {
    const now = new Date();
    $$("[data-tz]").forEach(el => {
      const f = formatters(el.dataset.tz);
      const t = el.querySelector("[data-time]");
      const d = el.querySelector("[data-date]");
      const dn = el.querySelector("[data-daynight]");
      if (t) t.textContent = el.classList.contains("pin") ? f.hm.format(now) : f.time.format(now);
      if (d) d.textContent = f.date.format(now);
      if (dn) {
        const lh = localHourAt(offsetHours(el.dataset.tz, now), now);
        dn.textContent = isDay(lh) ? "☀" : "☾";
        el.style.setProperty("--tint", isDay(lh) ? "#f59e0b" : "#6366f1");
      }
    });

    const utc = formatters("UTC");
    $("#utcClock").textContent = utc.time.format(now);
    $("#utcDate").textContent  = utc.date.format(now);
    $("#gmtClock").textContent = utc.time.format(now);
    $("#gmtDate").textContent  = utc.date.format(now);
    $("#headerUtc").textContent = utc.time.format(now);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const loc = formatters(tz);
    $("#localClock").textContent = loc.time.format(now);
    $("#localZone").textContent  = `${tz.replace(/_/g," ")} · ${offsetLabel(offsetHours(tz, now))}`;
  }

  function startClock() {
    tick(); updateMeridian();
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(() => { tick(); setInterval(tick, 1000); }, delay);
    setInterval(updateMeridian, 60000);     // band drifts slowly; refresh each minute
  }

  /* ---------- Prayer times + Hijri (AlAdhan) ---------- */
  const PRAYERS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

  function initPrayerPicker() {
    const sel = $("#prayerCity");
    sel.innerHTML = CITIES.map(c => `<option value="${c.slug}">${c.name}, ${c.country}</option>`).join("");
    sel.value = "cairo";
    sel.addEventListener("change", () => {
      selectedPrayerCity = CITIES.find(c => c.slug === sel.value);
      loadPrayer(selectedPrayerCity); loadSun(selectedPrayerCity);
    });
    selectedPrayerCity = CITIES.find(c => c.slug === "cairo") || CITIES[0];
  }

  async function loadPrayer(city) {
    if (!city) return;
    const grid = $("#prayerGrid"), today = new Date();
    const ds = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${ds}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("timings " + res.status);
      const { data } = await res.json();
      const t = data.timings, g = data.date.gregorian, h = data.date.hijri;
      $("#gregDate").textContent  = `${g.day} ${g.month.en} ${g.year}`;
      $("#hijriDate").textContent = `${h.day} ${h.month.en} ${h.year} AH`;
      const clean = s => (s || "").split(" ")[0];
      const next = nextPrayer(t);
      grid.innerHTML = PRAYERS.map(p => `
        <article class="prayer-card${p === next ? " is-next" : ""}">
          <div class="prayer-name">${p}</div>
          <div class="prayer-time">${clean(t[p])}</div>
          <span class="prayer-tag">${p === next ? "Next" : ""}</span>
        </article>`).join("");
    } catch {
      grid.innerHTML = `<p class="no-results" style="grid-column:1/-1">Couldn't load prayer times. Check your connection and try again.</p>`;
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

  /* ---------- Sunrise / sunset ---------- */
  async function loadSun(city) {
    if (!city) return;
    $("#sunCityName").textContent = `${city.name}, ${city.country}`;
    try {
      const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${city.lat}&lng=${city.lng}&formatted=0`);
      if (!res.ok) throw new Error("sun " + res.status);
      const { results, status } = await res.json();
      if (status !== "OK") throw new Error(status);
      const tf = new Intl.DateTimeFormat("en-GB", { timeZone: city.tz, hour: "2-digit", minute: "2-digit", hour12: false });
      $("#sunriseVal").textContent = tf.format(new Date(results.sunrise));
      $("#sunsetVal").textContent  = tf.format(new Date(results.sunset));
      const s = results.day_length, hh = Math.floor(s/3600), mm = Math.floor((s%3600)/60);
      $("#dayLength").textContent = `${hh}h ${String(mm).padStart(2,"0")}m`;
    } catch {
      $("#sunriseVal").textContent = "—"; $("#sunsetVal").textContent = "—"; $("#dayLength").textContent = "n/a";
    }
  }

  /* ---------- Boot ---------- */
  async function init() {
    $("#year").textContent = new Date().getFullYear();
    initTheme();
    try { await loadCities(); }
    catch { $("#cityGrid").innerHTML = `<p class="no-results">Couldn't load city data.</p>`; return; }

    buildMeridian();
    renderCities();
    initSearch();
    initPrayerPicker();
    startClock();
    loadPrayer(selectedPrayerCity);
    loadSun(selectedPrayerCity);

    const q = new URLSearchParams(location.search).get("q");
    if (q) { const s = $("#citySearch"); s.value = q; s.dispatchEvent(new Event("input")); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
