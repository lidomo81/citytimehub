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

  /* ---------- Search normalize (Arabic + English friendly) ---------- */
  // lowercases, unifies common Arabic letter variants and strips diacritics,
  // so "القاهرة" / "القاهره" / "قاهرة" all match the same way.
  function norm(s) {
    return (s ?? "").toString().toLowerCase()
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

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
  /* ---------- Favorite cities ("My Cities", localStorage) ---------- */
  const FAV_KEY = "cth-fav-cities";
  const MAX_FAV = 8;
  function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; } }
  function setFavs(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a.slice(0, MAX_FAV))); } catch (e) {} }
  function isFav(slug) { return getFavs().includes(slug); }
  function toggleFav(slug) {
    let f = getFavs();
    if (f.includes(slug)) { setFavs(f.filter(s => s !== slug)); return { ok: true }; }
    if (f.length >= MAX_FAV) return { full: true };
    f.push(slug); setFavs(f); return { ok: true };
  }
  function starBtn(slug) {
    const on = isFav(slug);
    return `<span class="fav-star${on ? " is-fav" : ""}" role="button" tabindex="0" data-fav="${slug}" aria-pressed="${on}" aria-label="${on ? "Remove from My Cities" : "Add to My Cities"}" title="${on ? "Remove from My Cities" : "Add to My Cities"}"><svg viewBox="0 0 24 24" width="18" height="18" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.73.99-5.8-4.21-4.1 5.82-.85z"/></svg></span>`;
  }
  function cardHtml(c) {
    const off = offsetHours(c.tz);
    const lat = `${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? "N" : "S"}`;
    const lng = `${Math.abs(c.lng).toFixed(2)}°${c.lng >= 0 ? "E" : "W"}`;
    const tag  = c.page ? "a" : "div";
    const href = c.page ? ` href="cities/${c.slug}.html"` : "";
    const cls  = c.page ? "city-card" : "city-card city-card--static";
    return `
      <${tag} class="${cls}"${href} data-tz="${c.tz}" data-slug="${c.slug}"
         data-search="${norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`)}">
        ${starBtn(c.slug)}
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
  }
  function renderCities(list = CITIES) {
    $("#cityGrid").innerHTML = list.map(cardHtml).join("");
    $("#cityCount").textContent = CITIES.length;
  }
  function renderMyCities() {
    const sec = $("#myCities"), grid = $("#myCitiesGrid");
    if (!sec || !grid) return;
    const list = getFavs().map(s => CITIES.find(c => c.slug === s)).filter(Boolean);
    if (!list.length) { sec.hidden = true; grid.innerHTML = ""; return; }
    sec.hidden = false;
    grid.innerHTML = list.map(cardHtml).join("");
  }
  function refreshStars() {
    const favs = getFavs();
    $$(".fav-star").forEach(s => {
      const on = favs.includes(s.dataset.fav);
      s.classList.toggle("is-fav", on);
      s.setAttribute("aria-pressed", on);
      s.setAttribute("aria-label", on ? "Remove from My Cities" : "Add to My Cities");
      s.setAttribute("title", on ? "Remove from My Cities" : "Add to My Cities");
      const svg = s.querySelector("svg"); if (svg) svg.setAttribute("fill", on ? "currentColor" : "none");
    });
  }
  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) { t = document.createElement("div"); t.id = "cthToast"; t.className = "cth-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("is-shown"), 2200);
  }
  function initFavorites() {
    document.addEventListener("click", e => {
      const star = e.target.closest && e.target.closest(".fav-star");
      if (!star) return;
      e.preventDefault(); e.stopPropagation();
      const r = toggleFav(star.dataset.fav);
      if (r.full) { toast(`You can pin up to ${MAX_FAV} cities.`); return; }
      refreshStars(); renderMyCities();
    });
    document.addEventListener("keydown", e => {
      const star = e.target.closest && e.target.closest(".fav-star");
      if (star && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); star.click(); }
    });
  }

  function injectSearchStyles() {
    if ($("#cth-search-style")) return;
    const css = `
      .search-wrap { position: relative; }
      .search-suggest {
        position: absolute; left: 0; right: 0; top: calc(100% + 8px);
        margin: 0; padding: 6px; list-style: none; z-index: 50;
        background: #0e1530; border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px; box-shadow: 0 18px 44px rgba(0,0,0,.5);
        max-height: 340px; overflow-y: auto; text-align: left;
      }
      .search-suggest[hidden] { display: none; }
      .suggest-item {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 10px 12px; border-radius: 10px; cursor: pointer; color: #fff;
      }
      .suggest-item:hover, .suggest-item.is-active { background: rgba(255,255,255,.10); }
      .suggest-name { font-weight: 700; }
      .suggest-meta { display: flex; align-items: center; gap: 4px; }
      .suggest-country { opacity: .6; font-size: .85em; white-space: nowrap; }
      .suggest-item .fav-star { position: static; width: 30px; height: 30px; color: rgba(255,255,255,.5); flex: none; }
      .suggest-item .fav-star.is-fav { color: #f5a623; }
      .suggest-item .fav-star:hover { background: rgba(255,255,255,.12); color: #f5a623; }
      .city-card.is-flash { outline: 2px solid #38bdf8; outline-offset: 3px; }
    `;
    const tag = document.createElement("style");
    tag.id = "cth-search-style";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function initSearch() {
    injectSearchStyles();
    const input = $("#citySearch");
    const noResults = $("#noResults");
    if (!input) return;
    const wrap = input.closest(".search-wrap") || input.parentElement;

    const panel = document.createElement("ul");
    panel.className = "search-suggest";
    panel.hidden = true;
    wrap.appendChild(panel);

    // hide/show the grid cards below to match the query
    function filterGrid(q) {
      const list = q
        ? CITIES.filter(c => norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`).includes(q))
        : CITIES.filter(c => c.featured);
      renderCities(list);
      refreshStars();
      if (noResults) noResults.hidden = !q || list.length !== 0;
    }

    // live suggestions right under the input
    function buildSuggest(q) {
      if (!q) { panel.hidden = true; panel.innerHTML = ""; return; }
      const matches = CITIES
        .filter(c => norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`).includes(q))
        .slice(0, 8);
      if (!matches.length) { panel.hidden = true; panel.innerHTML = ""; return; }
      panel.innerHTML = matches.map(c => `
        <li class="suggest-item" data-slug="${c.slug}" data-page="${c.page ? 1 : 0}">
          <span class="suggest-name">${c.name}</span>
          <span class="suggest-meta">
            <span class="suggest-country">${c.country}</span>
            ${starBtn(c.slug)}
          </span>
        </li>`).join("");
      panel.hidden = false;
    }

    function go(slug) {
      const c = CITIES.find(x => x.slug === slug);
      if (!c) return;
      if (c.page) { location.href = `cities/${c.slug}.html`; return; }
      panel.hidden = true;
      input.value = c.name;
      filterGrid(norm(c.name));
      const grid = document.getElementById("cities");
      if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
      const card = $(`#cityGrid .city-card[data-slug="${slug}"]`);
      if (card) {
        card.classList.add("is-flash");
        setTimeout(() => card.classList.remove("is-flash"), 1600);
      }
    }

    input.addEventListener("input", () => {
      const q = norm(input.value);
      filterGrid(q);
      buildSuggest(q);
    });

    // mouse pick
    panel.addEventListener("mousedown", e => {
      if (e.target.closest(".fav-star")) { e.preventDefault(); return; } // star toggles via click; keep input focus
      const li = e.target.closest(".suggest-item");
      if (li) { e.preventDefault(); go(li.dataset.slug); }
    });

    // keyboard nav (↑ ↓ Enter Esc)
    input.addEventListener("keydown", e => {
      const items = $$(".suggest-item", panel);
      if (e.key === "Escape") { panel.hidden = true; return; }
      if (!items.length) return;
      let idx = items.findIndex(el => el.classList.contains("is-active"));
      if (e.key === "ArrowDown") { e.preventDefault(); idx = (idx + 1) % items.length; }
      else if (e.key === "ArrowUp") { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; }
      else if (e.key === "Enter") { e.preventDefault(); go((items[idx] || items[0]).dataset.slug); return; }
      else return;
      items.forEach(el => el.classList.remove("is-active"));
      if (items[idx]) { items[idx].classList.add("is-active"); items[idx].scrollIntoView({ block: "nearest" }); }
    });

    // close on outside click
    document.addEventListener("click", e => { if (!wrap.contains(e.target)) panel.hidden = true; });
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
    renderCities(CITIES.filter(c => c.featured));
    renderMyCities();
    initFavorites();
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
