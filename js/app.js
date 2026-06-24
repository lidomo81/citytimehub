/* =====================================================================
   CityTimeHub — app.js  (Globe edition)
   Live clocks via Intl.DateTimeFormat (no clock API), the live day/night
   globe in the hero, city grid + search, reference clocks,
   prayer times + Hijri date (AlAdhan), sunrise/sunset (sunrise-sunset.org).
   ===================================================================== */
(() => {
  "use strict";

  /* ---------- Language (reads <html lang>) ---------- */
  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const I18N = {
    en: {
      addFav: "Add to My Cities", remFav: "Remove from My Cities",      next: "Next",
      pinMax: n => `You can pin up to ${n} cities.`,
      prayerErr: "Couldn't load prayer times. Check your connection and try again.",
      cityErr: "Couldn't load city data.",
      prayers: ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"],
      ah: "AH", na: "n/a",
      dayLen: (h, m) => `${h}h ${m}m`,
    },
    ar: {
      addFav: "أضِف إلى مدني", remFav: "أزِل من مدني",
      next: "التالية",
      pinMax: n => `يمكنك تثبيت حتى ${n} مدن.`,
      prayerErr: "تعذّر تحميل مواقيت الصلاة. تحقّق من اتصالك وحاول مرة أخرى.",
      cityErr: "تعذّر تحميل بيانات المدن.",
      prayers: ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"],
      ah: "هـ", na: "غير متاح",
      dayLen: (h, m) => `${h}h ${m}m`,
    },
  };
  const T = I18N[LANG];
  const cName = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cCountry = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");
  const CITY_BASE = LANG === "ar" ? "/ar/cities/" : "/cities/";

  /* ---------- State ---------- */
  let CITIES = [];
  const fmtCache = new Map();
  let selectedPrayerCity = null;


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

  /* ---------- Formatters (one per timezone, reused) ---------- */
  function formatters(tz) {
    if (fmtCache.has(tz)) return fmtCache.get(tz);
    const pair = {
      time: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      hm:   new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }),
      date: new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short" })
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
    const res = await fetch("/data/cities.json");
    if (!res.ok) throw new Error("cities.json " + res.status);
    CITIES = (await res.json()).cities || [];
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
    return `<span class="fav-star${on ? " is-fav" : ""}" role="button" tabindex="0" data-fav="${slug}" aria-pressed="${on}" aria-label="${on ? T.remFav : T.addFav}" title="${on ? T.remFav : T.addFav}"><svg viewBox="0 0 24 24" width="18" height="18" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.73.99-5.8-4.21-4.1 5.82-.85z"/></svg></span>`;
  }
  function cardHtml(c) {
    const off = offsetHours(c.tz);
    const lat = `${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? "N" : "S"}`;
    const lng = `${Math.abs(c.lng).toFixed(2)}°${c.lng >= 0 ? "E" : "W"}`;
    const tag  = "a";
    const href = ` href="${CITY_BASE}${c.slug}.html"`;
    const cls  = "city-card";
    return `
      <${tag} class="${cls}"${href} data-tz="${c.tz}" data-slug="${c.slug}"
         data-search="${norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`)}">
        ${starBtn(c.slug)}
        <div class="city-top">
          <span><span class="city-name">${cName(c)}</span><br><span class="city-country">${cCountry(c)}</span></span>
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
      if (r.full) { toast(T.pinMax(MAX_FAV)); return; }
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
          <span class="suggest-name">${cName(c)}</span>
          <span class="suggest-meta">
            <span class="suggest-country">${cCountry(c)}</span>
            ${starBtn(c.slug)}
          </span>
        </li>`).join("");
      panel.hidden = false;
    }

    function go(slug) {
      const c = CITIES.find(x => x.slug === slug);
      if (!c) return;
      location.href = `${CITY_BASE}${c.slug}.html`;
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
    const ltT = $("#ltTime");
    if (ltT) {
      ltT.textContent = loc.time.format(now);
      const ltD = $("#ltDate"); if (ltD) ltD.textContent = loc.date.format(now);
      const ltZ = $("#ltZone"); if (ltZ) ltZ.textContent = `${tz.replace(/_/g," ")} · ${offsetLabel(offsetHours(tz, now))}`;
      ltOffsetMs = offsetHours(tz, now) * 3600000;
    }
  }

  function startClock() {
    tick();
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(() => { tick(); setInterval(tick, 1000); }, delay);
  }

  /* ---------- Prayer times + Hijri (AlAdhan) ---------- */
  const PRAYERS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

  function attachAutocomplete(input, listEl, onChoose) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function render() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`).includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = ""; close(); return; }
      listEl.innerHTML = items.map((c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${cName(c)}</span><span class="ac-country">${cCountry(c)}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) { const c = items[i]; if (!c) return; onChoose(c); close(); }
    input.addEventListener("input", render);
    input.addEventListener("focus", () => { if (input.value) render(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest(".ac-item"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    input.addEventListener("blur", () => setTimeout(close, 150));
  }

  function initPrayerPicker() {
    const input = $("#prayerCity"), list = $("#prayerAcList");
    selectedPrayerCity = CITIES.find(c => c.slug === "cairo") || CITIES[0];
    if (input && selectedPrayerCity) input.value = `${cName(selectedPrayerCity)}, ${cCountry(selectedPrayerCity)}`;
    if (!input || !list) return;
    attachAutocomplete(input, list, c => {
      selectedPrayerCity = c;
      input.value = `${cName(c)}, ${cCountry(c)}`;
      loadPrayer(c); loadSun(c);
    });
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
      const g_d = new Date(Date.UTC(+g.year, (+(g.month && g.month.number) || 1) - 1, +g.day));
      $("#gregDate").textContent  = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(g_d);
      $("#hijriDate").textContent = `${h.day} ${LANG === "ar" ? h.month.ar : h.month.en} ${h.year} ${T.ah}`;
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

  /* ---------- Sunrise / sunset ---------- */
  async function loadSun(city) {
    if (!city) return;
    $("#sunCityName").textContent = `${cName(city)}, ${cCountry(city)}`;
    try {
      const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${city.lat}&lng=${city.lng}&formatted=0`);
      if (!res.ok) throw new Error("sun " + res.status);
      const { results, status } = await res.json();
      if (status !== "OK") throw new Error(status);
      const tf = new Intl.DateTimeFormat("en-GB", { timeZone: city.tz, hour: "2-digit", minute: "2-digit", hour12: false });
      $("#sunriseVal").textContent = tf.format(new Date(results.sunrise));
      $("#sunsetVal").textContent  = tf.format(new Date(results.sunset));
      const s = results.day_length, hh = Math.floor(s/3600), mm = Math.floor((s%3600)/60);
      $("#dayLength").textContent = T.dayLen(hh, String(mm).padStart(2,"0"));
    } catch {
      $("#sunriseVal").textContent = "—"; $("#sunsetVal").textContent = "—"; $("#dayLength").textContent = T.na;
    }
  }

  /* ---------- Boot ---------- */
  /* ---------- Your-local-time panel + Apple-Watch-style analog clock ---------- */
  let ltTz = "UTC", ltOffsetMs = 0, ltEls = {}, ltRAF = 0;
  const LT_R = 88, LT_C = 2 * Math.PI * LT_R;

  function buildAnalogSvg() {
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = i * 6 * Math.PI / 180;
      const r1 = major ? 77 : 83, r2 = 88;
      const x1 = 100 + r1 * Math.sin(a), y1 = 100 - r1 * Math.cos(a);
      const x2 = 100 + r2 * Math.sin(a), y2 = 100 - r2 * Math.cos(a);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--border-2)" stroke-width="${major ? 2.4 : 1}" stroke-linecap="round" opacity="${major ? .9 : .45}"/>`;
    }
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="lt-svg" aria-hidden="true">
      <defs>
        <linearGradient id="ltGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--brand)"/><stop offset="1" stop-color="var(--accent)"/>
        </linearGradient>
        <filter id="ltGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="95" fill="var(--bg-soft)" stroke="var(--border)" stroke-width="1"/>
      <circle id="ltRing" cx="100" cy="100" r="${LT_R}" fill="none" stroke="url(#ltGrad)" stroke-width="5" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="${LT_C.toFixed(1)}" stroke-dashoffset="${LT_C.toFixed(1)}"/>
      ${ticks}
      <line id="ltHour" x1="100" y1="111" x2="100" y2="57" stroke="var(--text)" stroke-width="6.5" stroke-linecap="round"/>
      <line id="ltMin" x1="100" y1="114" x2="100" y2="35" stroke="var(--text)" stroke-width="4.5" stroke-linecap="round"/>
      <g id="ltSec" filter="url(#ltGlow)">
        <line x1="100" y1="120" x2="100" y2="29" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="100" cy="35" r="3.3" fill="var(--accent)"/>
      </g>
      <circle cx="100" cy="100" r="5.5" fill="var(--text)"/>
      <circle cx="100" cy="100" r="2.3" fill="var(--accent)"/>
    </svg>`;
  }

  function ltFrame() {
    if (!ltEls.ring) return;
    const d = new Date(Date.now() + ltOffsetMs);
    const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds(), ms = d.getUTCMilliseconds();
    const secF = s + ms / 1000, minF = m + secF / 60, hF = (h % 12) + minF / 60;
    ltEls.hour.setAttribute("transform", `rotate(${(hF * 30).toFixed(2)} 100 100)`);
    ltEls.min.setAttribute("transform", `rotate(${(minF * 6).toFixed(2)} 100 100)`);
    ltEls.sec.setAttribute("transform", `rotate(${(secF * 6).toFixed(2)} 100 100)`);
    ltEls.ring.setAttribute("stroke-dashoffset", (LT_C * (1 - secF / 60)).toFixed(1));
    ltRAF = requestAnimationFrame(ltFrame);
  }

  function initLocalPanel() {
    const host = $("#ltAnalog"); if (!host) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    ltTz = tz; ltOffsetMs = offsetHours(tz) * 3600000;
    const matches = CITIES.filter(c => c.tz === tz);
    const city = matches.find(c => c.featured) || matches[0] || null;
    const cityName = city ? (LANG === "ar" && city.name_ar ? city.name_ar : city.name)
                          : tz.split("/").pop().replace(/_/g, " ");
    const cEl = $("#lt-h"); if (cEl) cEl.textContent = cityName;
    host.innerHTML = buildAnalogSvg();
    ltEls = { ring: host.querySelector("#ltRing"), hour: host.querySelector("#ltHour"), min: host.querySelector("#ltMin"), sec: host.querySelector("#ltSec") };
    cancelAnimationFrame(ltRAF); ltFrame();
  }

  async function init() {
    $("#year").textContent = new Date().getFullYear();
    initTheme();
    try { await loadCities(); }
    catch { $("#cityGrid").innerHTML = `<p class="no-results">${T.cityErr}</p>`; return; }

    renderCities(CITIES.filter(c => c.featured));
    renderMyCities();
    initLocalPanel();
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
