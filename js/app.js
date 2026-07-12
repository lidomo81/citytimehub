/* =====================================================================
   CityTimeHub — app.js  (Globe edition)
   Live clocks via Intl.DateTimeFormat (no clock API), the live day/night
   globe in the hero, city grid + search, reference clocks,
   prayer times, Hijri date and sunrise/sunset (AlAdhan).
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
      localEyebrow: "Your local time", homeEyebrow: "Your city", save: "My favorite city", saved: "Favorite ✓",
      inHM: (h, m) => h ? `in ${h}h ${m}m` : `in ${m}m`, tomorrow: "tomorrow",
      savedToast: "Saved to My Cities.", removedToast: "Removed from My Cities.", favFull: n => `You can save up to ${n} cities.`,
      myFav: "My favorite cities",
      streakDays: n => `You kept your prayers: ${n} day${n === 1 ? "" : "s"}`, streakStart: "Begin your journey today 🌱",
      todayWord: "Today", dayDone: "Today complete ✓", streakNew: "🌙 You completed today's prayers — may they be accepted!",
      dua: "اللَّهُمَّ أَعِنَّا عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
      duaTr: "O Allah, help us to remember You, thank You, and worship You well.",
      recover: name => `You missed ${name} — pray it now and complete your day 🤍`,
      recoverMany: "Some prayers passed — make them up to complete your day 🤍",
      weekTitle: "Last 7 days", statsTitle: "Your adherence", currentStreak: "Current streak", bestStreak: "Best streak",
      legendFull: "Complete", legendPart: "Partial", legendNone: "Missed", statsClose: "Close", statsHint: "Tap for details",
      streakNote: "This counter is only to encourage you to keep your prayers — not to collect any data. Everything stays on your device. Be honest with Allah and with yourself 🤍",
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
      localEyebrow: "وقتك المحلي", homeEyebrow: "مدينتك", save: "مدينتي المفضلة", saved: "مفضلة ✓",
      inHM: (h, m) => h ? `بعد ${h} س ${m} د` : `بعد ${m} د`, tomorrow: "غدًا",
      savedToast: "تم الحفظ في مدني.", removedToast: "تمت الإزالة من مدني.", favFull: n => `تقدر تحفظ حتى ${n} مدن.`,
      myFav: "مدني المفضلة",
      streakDays: n => `حافظتَ على صلاتك: ${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : (n >= 3 && n <= 10) ? "أيام" : "يومًا"}`,
      streakStart: "ابدأ رحلتك اليوم 🌱",
      todayWord: "اليوم", dayDone: "اكتمل اليوم ✓", streakNew: "🌙 أتممتَ صلوات يومك — تقبّل الله!",
      dua: "اللَّهُمَّ أَعِنَّا عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
      duaTr: "",
      recover: name => `صلاة ${name} فاتت وقتها.. تداركها الآن وأكمل يومك 🤍`,
      recoverMany: "صلوات فاتت أوقاتها.. تداركها لتُكمل يومك 🤍",
      weekTitle: "آخر ٧ أيام", statsTitle: "التزامك", currentStreak: "سلسلتك الحالية", bestStreak: "أطول سلسلة",
      legendFull: "مكتمل", legendPart: "جزئي", legendNone: "فائت", statsClose: "إغلاق", statsHint: "اضغط للتفاصيل",
      streakNote: "هذا العدّاد وسيلة لتحفيزك على المحافظة على صلاتك، وليس لجمع أي معلومات — بياناتك محفوظة على جهازك وحده. فاجعلها صدقًا مع الله ومع نفسك 🤍",
    },
  };
  const T = I18N[LANG];
  const cName = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cCountry = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");
  const CITY_BASE = LANG === "ar" ? "/ar/cities/" : "/cities/";

  /* ---------- State ---------- */
  let CITIES = [];
  const fmtCache = new Map();
  let currentCity = null, homeCity = null, detectedHome = null, prayerState = null;
  let currentMine = false;


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

  /* ---------- Worldwide city search (OpenStreetMap / Nominatim) ----------
     Used as a fallback in the homepage search so cities outside the curated
     500 still get a live clock + prayer times. The timezone is not returned
     here; it is resolved later from the AlAdhan response (data.meta.timezone).
     A per-country default calculation method mirrors the app's picker. */
  const WORLD_METHOD = { eg: 5, sa: 4, ae: 8, kw: 9, qa: 10, bh: 4, om: 8, jo: 3, ly: 5, sd: 5, pk: 1, in: 1, bd: 1, us: 2, ca: 2, tr: 13, id: 20, my: 3, sg: 3, gb: 3, fr: 12 };
  function worldCityFrom(x) {
    const a = x.address || {};
    const name = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || String(x.display_name || "").split(",")[0].trim();
    let country = [a.state, a.country].filter(Boolean).join(", ");
    if (!country) country = String(x.display_name || "").split(",").slice(-1)[0].trim();
    const cc = String(a.country_code || "").toLowerCase();
    const lat = parseFloat(x.lat), lng = parseFloat(x.lon);
    return { name, country, lat, lng, method: WORLD_METHOD[cc] || 3, world: true, slug: "w:" + lat.toFixed(4) + "," + lng.toFixed(4) };
  }
  function worldSearch(q) {
    const lang = LANG === "ar" ? "ar" : "en";
    return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=" + lang + "&q=" + encodeURIComponent(q))
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const seen = {}, out = [];
        (d || []).forEach(x => {
          const c = worldCityFrom(x);
          if (!c.name || isNaN(c.lat) || isNaN(c.lng)) return;
          const k = norm(c.name + "|" + c.country);
          if (seen[k]) return; seen[k] = 1; out.push(c);
        });
        return out;
      });
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
  const HOME_KEY = "cth-home-city";
  const MAX_FAV = 8;
  function getHomeSlug() { try { return localStorage.getItem(HOME_KEY) || null; } catch (e) { return null; } }
  function setHomeSlug(slug) { try { localStorage.setItem(HOME_KEY, slug); } catch (e) {} }
  function clearHomeSlug() { try { localStorage.removeItem(HOME_KEY); } catch (e) {} }
  // Favorites are stored as entries: curated cities as { slug } (kept fresh from
  // cities.json), worldwide cities as a full object so they survive reloads.
  // Legacy data (a plain array of slug strings) is migrated transparently on read.
  function getFavEntries() {
    let raw = [];
    try { raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) return [];
    return raw.map(e => (typeof e === "string" ? { slug: e } : e)).filter(e => e && e.slug);
  }
  function getFavSlugs() { return getFavEntries().map(e => e.slug); }
  function setFavEntries(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a.slice(0, MAX_FAV))); } catch (e) {} }
  function isFav(slug) { return getFavSlugs().includes(slug); }
  function favEntryFor(cityOrSlug) {
    if (typeof cityOrSlug === "string") return { slug: cityOrSlug };
    const c = cityOrSlug || {};
    if (c.world) return { slug: c.slug, name: c.name, country: c.country, lat: c.lat, lng: c.lng, method: c.method, tz: c.tz || null, world: true };
    return { slug: c.slug };
  }
  function toggleFav(cityOrSlug) {
    const slug = typeof cityOrSlug === "string" ? cityOrSlug : (cityOrSlug && cityOrSlug.slug);
    if (!slug) return { full: false };
    const entries = getFavEntries();
    const i = entries.findIndex(e => e.slug === slug);
    if (i >= 0) { entries.splice(i, 1); setFavEntries(entries); return { ok: true }; }
    if (entries.length >= MAX_FAV) return { full: true };
    entries.push(favEntryFor(cityOrSlug)); setFavEntries(entries); return { ok: true };
  }
  // Resolve a stored favorite entry to a usable city object.
  function favToCity(entry) {
    if (!entry) return null;
    if (entry.world) return { slug: entry.slug, name: entry.name, country: entry.country, lat: entry.lat, lng: entry.lng, method: entry.method, tz: entry.tz || null, world: true };
    return CITIES.find(c => c.slug === entry.slug) || null;
  }
  function favCities() { return getFavEntries().map(favToCity).filter(Boolean); }
  function favCityBySlug(slug) {
    const e = getFavEntries().find(x => x.slug === slug);
    return e ? favToCity(e) : (CITIES.find(c => c.slug === slug) || null);
  }
  // Resolve the pinned home city (curated via cities.json, or a saved world city).
  function getHomeCity() {
    const slug = getHomeSlug();
    if (!slug) return null;
    return CITIES.find(c => c.slug === slug) || favCityBySlug(slug);
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
    const grid = $("#cityGrid"); if (!grid) return;
    grid.innerHTML = list.map(cardHtml).join("");
    const cc = $("#cityCount"); if (cc) cc.textContent = CITIES.length;
  }
  function favChipHtml(c) {
    const nm = cName(c), co = cCountry(c);
    const dnAttr = c.tz ? ` data-tz="${c.tz}"` : "";
    return `<span class="fav-chip" role="button" tabindex="0" data-slug="${c.slug}"${dnAttr} aria-label="${nm}${co ? ", " + co : ""}">`
      + `<span class="fav-chip-dn" data-daynight aria-hidden="true">·</span>`
      + `<span class="fav-chip-name">${nm}</span>`
      + `<span class="fav-chip-x" role="button" tabindex="0" data-favx="${c.slug}" aria-label="${T.remFav}" title="${T.remFav}">×</span>`
      + `</span>`;
  }
  function renderMyCities() {
    const sec = $("#myCities"), grid = $("#myCitiesGrid");
    if (!sec || !grid) return;
    const list = favCities();
    if (!list.length) { sec.hidden = true; grid.innerHTML = ""; return; }
    sec.hidden = false;
    grid.innerHTML = `<div class="fav-app-label">${T.myFav}</div>`
      + `<div class="fav-chips">${list.map(favChipHtml).join("")}</div>`;
  }
  function refreshStars() {
    const favs = getFavSlugs();
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

    // "My favorite cities" chips: tap the name → open it in the panel above and
    // scroll to it; tap the × → remove it from favorites.
    const grid = $("#myCitiesGrid");
    if (grid) {
      const openChip = chip => {
        const c = favCityBySlug(chip.dataset.slug);
        if (!c) return;
        setCity(c);
        const panel = $("#cityPanel");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      grid.addEventListener("click", e => {
        const x = e.target.closest(".fav-chip-x");
        if (x) {
          e.preventDefault(); e.stopPropagation();
          toggleFav(x.dataset.favx);
          refreshStars(); renderMyCities(); updateSaveStar();
          toast(T.removedToast);
          return;
        }
        const chip = e.target.closest(".fav-chip");
        if (chip) { e.preventDefault(); openChip(chip); }
      });
      grid.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const x = e.target.closest(".fav-chip-x");
        if (x) { e.preventDefault(); toggleFav(x.dataset.favx); refreshStars(); renderMyCities(); updateSaveStar(); toast(T.removedToast); return; }
        const chip = e.target.closest(".fav-chip");
        if (chip) { e.preventDefault(); openChip(chip); }
      });
    }
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
      if (currentCity && currentCity.world && !currentCity.tz) {
        // Worldwide city: still resolving its timezone — show a placeholder
        // rather than the wrong (browser) time for a split second.
        ltT.textContent = "—:—:—";
        const ltD = $("#ltDate"); if (ltD) ltD.textContent = "…";
        const ltZ = $("#ltZone"); if (ltZ) ltZ.textContent = "…";
      } else {
        const ctz = (currentCity && currentCity.tz) || tz;
        const cloc = formatters(ctz);
        ltT.textContent = cloc.time.format(now);
        const ltD = $("#ltDate"); if (ltD) ltD.textContent = cloc.date.format(now);
        const ltZ = $("#ltZone"); if (ltZ) ltZ.textContent = `${ctz.replace(/_/g," ")} · ${offsetLabel(offsetHours(ctz, now))}`;
        ltOffsetMs = offsetHours(ctz, now) * 3600000;
      }
    }
  }

  function startClock() {
    tick();
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(() => { tick(); setInterval(tick, 1000); }, delay);
    setInterval(updateStatusBox, 30000);
    window.addEventListener("cth-worship", updateStatusBox);
  }

  /* ---------- Prayer times + Hijri (AlAdhan) ---------- */
  const PRAYERS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

  function attachAutocomplete(input, listEl, onChoose, opts) {
    opts = opts || {};
    let localItems = [], worldItems = [], items = [], active = -1;
    let wseq = 0, wtimer = null;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    const liHtml = (c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${cName(c)}</span><span class="ac-country">${cCountry(c)}</span></li>`;
    function paint() {
      items = localItems.concat(worldItems);
      if (!items.length) { listEl.innerHTML = ""; close(); return; }
      let html = localItems.map((c, i) => liHtml(c, i)).join("");
      if (worldItems.length) {
        html += `<li class="ac-sep" aria-hidden="true">${LANG === "ar" ? "بقية مدن العالم" : "Worldwide"}</li>`;
        html += worldItems.map((c, k) => liHtml(c, localItems.length + k)).join("");
      }
      listEl.innerHTML = html;
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function render() {
      const q = norm(input.value);
      localItems = q ? CITIES.filter(c => norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`).includes(q)).slice(0, 8) : [];
      worldItems = [];
      active = -1;
      paint();
      if (opts.worldwide) scheduleWorld(input.value.trim(), q);
    }
    function scheduleWorld(raw, qnorm) {
      clearTimeout(wtimer);
      // Only reach out to the network when the curated list is thin — keeps the
      // OpenStreetMap load low and the common case instant/offline.
      if (raw.length < 3 || localItems.length >= 6) return;
      wtimer = setTimeout(() => {
        const my = ++wseq;
        worldSearch(raw).then(list => {
          if (my !== wseq || norm(input.value) !== qnorm) return; // stale response
          const localKeys = new Set(localItems.map(c => norm(cName(c) + "|" + cCountry(c))));
          worldItems = list.filter(c => !localKeys.has(norm(c.name + "|" + c.country))).slice(0, 6);
          paint();
        }).catch(() => {});
      }, 450);
    }
    function pick(i) { const c = items[i]; if (!c) return; input.blur(); onChoose(c); close(); }
    input.addEventListener("input", render);
    input.addEventListener("focus", () => { if (input.value) render(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest(".ac-item"); if (li && li.dataset.i != null) { e.preventDefault(); pick(+li.dataset.i); } });
    input.addEventListener("blur", () => setTimeout(close, 150));
  }

  /* ---------- Unified city panel (time + prayer + sun, searchable) ---------- */
  function setCity(city) {
    if (!city) return;
    currentCity = city;
    // Curated cities carry their own tz; a worldwide city has none yet — its tz
    // is resolved from the AlAdhan response inside loadPrayer, then the clock
    // refreshes. Until then we leave the previous offset untouched.
    if (city.tz) { ltTz = city.tz; ltOffsetMs = offsetHours(city.tz) * 3600000; }
    const nm = cName(city);
    const cEl = $("#lt-h"); if (cEl) cEl.textContent = nm;
    const onLocal = !!(detectedHome && city.slug === detectedHome.slug);
    const homeSlug = getHomeSlug();
    const onDefault = !!(homeSlug && city.slug === homeSlug);
    const eb = $("#cpEyebrow"); if (eb) eb.textContent = onLocal ? T.localEyebrow : (onDefault ? T.homeEyebrow : `${nm}، ${cCountry(city)}`);
    // "My city" returns to the detected local city — show it whenever we're NOT already on local
    const hb = $("#cpHome"); if (hb) hb.hidden = onLocal;
    const inp = $("#cpSearch"); if (inp && document.activeElement !== inp) inp.value = (onLocal || onDefault) ? "" : `${nm}, ${cCountry(city)}`;
    updateSaveStar();
    // Tell the worship tracker whether this is the user's own city (local/saved).
    currentMine = onLocal || onDefault || isFav(city.slug);
    try {
      window.dispatchEvent(new CustomEvent("cth-city", { detail: { slug: city.slug, mine: currentMine } }));
    } catch (e) {}
    updateStatusBox();
    tick();
    loadPrayer(city); loadSun(city);
  }
  function updateSaveStar() {
    const b = $("#cpSave"); if (!b || !currentCity) return;
    const on = isFav(currentCity.slug);
    b.classList.toggle("is-fav", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("title", on ? T.remFav : T.addFav);
    const t = b.querySelector(".cp-save-txt"); if (t) t.textContent = on ? T.saved : T.save;
  }
  function initCityPanel() {
    const host = $("#ltAnalog");
    if (host) {
      host.innerHTML = buildAnalogSvg();
      ltEls = { hour: host.querySelector("#ltHour"), min: host.querySelector("#ltMin"), sec: host.querySelector("#ltSec") };
      cancelAnimationFrame(ltRAF); ltFrame();
    }
    // Preferred default city (saved via "Save") wins; else detect from time zone (fallback Cairo)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const matches = CITIES.filter(c => c.tz === tz);
    const detected = matches.find(c => c.featured) || matches[0] || CITIES.find(c => c.slug === "cairo") || CITIES[0];
    const saved = getHomeCity();   // curated slug or a saved worldwide city
    detectedHome = detected;
    const home = saved || detected;
    setCity(home);

    const inp = $("#cpSearch"), list = $("#cpAcList");
    if (inp && list) attachAutocomplete(inp, list, c => setCity(c), { worldwide: true });

    const sv = $("#cpSave");
    if (sv) sv.addEventListener("click", () => {
      if (!currentCity) return;
      const slug = currentCity.slug;
      // Pass the whole city so a worldwide city is stored with its coordinates.
      const r = toggleFav(currentCity);
      if (r.full) { toast(T.favFull(MAX_FAV)); return; }
      const nowFav = isFav(slug);
      // Save = favorite + pin this city as the panel's default (stays until changed).
      // Unsaving the current default reverts the default to the detected local city.
      if (nowFav) setHomeSlug(slug);
      else if (getHomeSlug() === slug) clearHomeSlug();
      setCity(currentCity); // re-render: keeps showing this city; "My city" stays available
      renderMyCities(); refreshStars();
      toast(nowFav ? T.savedToast : T.removedToast);
    });
    const hm = $("#cpHome");
    if (hm) hm.addEventListener("click", () => { if (detectedHome) setCity(detectedHome); });

    const inst = $("#cpInstall");
    if (inst) {
      const syncInstall = () => {
        // In an installed app already → no need to show install
        inst.hidden = !!(window.CTH_PWA && window.CTH_PWA.inStandalone);
      };
      document.addEventListener("cth-pwa-ready", syncInstall);
      syncInstall();
      inst.addEventListener("click", () => {
        if (!currentCity || currentCity.world) return;
        location.href = (LANG === "ar" ? "/ar" : "") + "/app/" + currentCity.slug + "/";
      });
    }
  }

  async function loadPrayer(city) {
    if (!city) return;
    const grid = $("#prayerGrid"), today = new Date();
    const ds = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${ds}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    const PKEY = "cth-prayer:" + city.slug;
    const render = (data, stale) => {
      // Worldwide cities arrive without a timezone; AlAdhan returns it in meta.
      // Resolve it before anything that needs it (next-prayer, the live clock).
      if (!city.tz && data.meta && data.meta.timezone) {
        city.tz = data.meta.timezone;
        if (currentCity === city) {
          ltTz = city.tz;
          ltOffsetMs = offsetHours(city.tz) * 3600000;
          tick();
        }
      }
      const t = data.timings, g = data.date.gregorian, h = data.date.hijri;
      const g_d = new Date(Date.UTC(+g.year, (+(g.month && g.month.number) || 1) - 1, +g.day));
      $("#gregDate").textContent  = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(g_d);
      $("#hijriDate").textContent = `${h.day} ${LANG === "ar" ? h.month.ar : h.month.en} ${h.year} ${T.ah}`;
      const clean = s => (s || "").split(" ")[0];
      const next = nextPrayer(t, city);
      prayerState = { city, timings: {} };
      PRAYERS.forEach(p => prayerState.timings[p] = clean(t[p]));
      grid.innerHTML = PRAYERS.map((p, i) => `
        <article class="prayer-card${p === next ? " is-next" : ""}" data-p="${p}">
          <div class="prayer-name">${T.prayers[i]}</div>
          <div class="prayer-time">${clean(t[p])}</div>
          <span class="prayer-tag">${p === next ? T.next : ""}</span>
        </article>`).join("");
      updateStatusBox();
      if (t.Sunrise && t.Sunset) fillSun(clean(t.Sunrise), clean(t.Sunset));
      refreshCityPulse(city, prayerState.timings);
    };
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("timings " + res.status);
      const { data } = await res.json();
      render(data, false);
      try { localStorage.setItem(PKEY, JSON.stringify({ ds, data })); } catch (e) {}
    } catch {
      // Offline / failed → show the last saved times for this city if we have them
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(PKEY) || "null"); } catch (e) {}
      if (cached && cached.data) { render(cached.data, true); }
      else { grid.innerHTML = `<p class="no-results" style="grid-column:1/-1">${T.prayerErr}</p>`; }
    }
  }
  function updateNextLine() {
    const el = $("#cpNext"); if (!el) return;
    if (!prayerState || !prayerState.city) { el.hidden = true; return; }
    const off = offsetHours(prayerState.city.tz) * 3600000;
    const d = new Date(Date.now() + off);
    const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    let idx = -1, nextMin = 0;
    for (let i = 0; i < PRAYERS.length; i++) {
      const [hh, mm] = (prayerState.timings[PRAYERS[i]] || "0:0").split(":");
      const pm = (+hh) * 60 + (+mm);
      if (pm > nowMin) { idx = i; nextMin = pm; break; }
    }
    let tomorrow = false;
    if (idx < 0) { idx = 0; const [hh, mm] = (prayerState.timings.Fajr || "0:0").split(":"); nextMin = (+hh) * 60 + (+mm) + 1440; tomorrow = true; }
    const diff = nextMin - nowMin, dh = Math.floor(diff / 60), dm = diff % 60;
    el.hidden = false;
    el.innerHTML = `<span class="cp-next-dot" aria-hidden="true"></span>${T.next}: <strong>${T.prayers[idx]}${tomorrow ? " " + T.tomorrow : ""}</strong> · <span class="mono">${prayerState.timings[PRAYERS[idx]]}</span> <span class="cp-next-in">${T.inHM(dh, dm)}</span>`;
  }

  /* ---------- Prayer streak (reads the same worship record the sheet writes) ---------- */
  const OBLIG = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const wDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function wGetDay(ds) { try { return JSON.parse(localStorage.getItem("cth-worship:" + ds) || "{}") || {}; } catch (e) { return {}; } }
  function wFardCount(ds) { const w = wGetDay(ds); return OBLIG.reduce((n, p) => n + (w[p] && w[p].f ? 1 : 0), 0); }
  const wDayComplete = ds => wFardCount(ds) === 5;
  function wStreak() {
    let n = 0, d = new Date();
    if (!wDayComplete(wDateStr(d))) d.setDate(d.getDate() - 1); // today still in progress → count up to yesterday
    while (wDayComplete(wDateStr(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  const prayerLabel = p => T.prayers[PRAYERS.indexOf(p)] || p;
  // Obligatory prayers whose time window has passed today without being marked done.
  // Windows end at: Fajr→Sunrise, Dhuhr→Asr, Asr→Maghrib, Maghrib→Isha (Isha runs till dawn).
  function missedFard() {
    if (!prayerState || !prayerState.city || !prayerState.timings) return [];
    const tz = prayerState.city.tz; if (!tz) return [];
    const t = prayerState.timings;
    const toMin = s => { const a = (s || "").split(":"); return (+a[0]) * 60 + (+a[1]); };
    const d = new Date(Date.now() + offsetHours(tz) * 3600000);
    const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    const w = wGetDay(wDateStr(new Date()));
    const ends = { Fajr: t.Sunrise, Dhuhr: t.Asr, Asr: t.Maghrib, Maghrib: t.Isha };
    const missed = [];
    ["Fajr", "Dhuhr", "Asr", "Maghrib"].forEach(p => {
      const end = ends[p];
      if (end && nowMin >= toMin(end) && !(w[p] && w[p].f)) missed.push(p);
    });
    return missed;
  }

  let streakFirstRender = true, streakCelebrateT = 0, completeCelebratedFor = null;
  function renderStreak(el) {
    const today = wDateStr(new Date());
    const prog = wFardCount(today);
    const complete = prog === 5;
    const justCompleted = complete && !streakFirstRender && completeCelebratedFor !== today;
    if (complete) completeCelebratedFor = today;
    el.hidden = false;

    if (justCompleted) {
      el.classList.remove("cp-recover");
      el.innerHTML = `<span class="cp-streak-main cp-streak-new">${T.streakNew}</span>`;
      el.classList.add("cp-celebrate");
      clearTimeout(streakCelebrateT);
      streakCelebrateT = setTimeout(() => { el.classList.remove("cp-celebrate"); updateStatusBox(); }, 2600);
      streakFirstRender = false;
      return;
    }

    let pips = "";
    for (let k = 0; k < 5; k++) pips += `<i class="cp-pip${k < prog ? " on" : ""}"></i>`;
    const sub = complete ? T.dayDone : `${T.todayWord} ${prog}/5`;
    const subHtml = `<span class="cp-streak-sub">${sub}<span class="cp-pips" aria-hidden="true">${pips}</span></span>`;

    // Recovery: a gentle, blame-free nudge to make up a prayer whose window passed.
    const missed = missedFard();
    if (missed.length) {
      const msg = missed.length === 1 ? T.recover(prayerLabel(missed[0])) : T.recoverMany;
      el.classList.add("cp-recover");
      el.innerHTML = `<span class="cp-streak-main cp-recover-main">${msg}</span>${subHtml}`;
      streakFirstRender = false;
      return;
    }
    el.classList.remove("cp-recover");

    const streak = wStreak();
    const main = streak > 0 ? `<span class="cp-flame" aria-hidden="true">🌙</span>${T.streakDays(streak)}` : T.streakStart;
    el.innerHTML = `<span class="cp-streak-main">${main}</span>${subHtml}`;
    streakFirstRender = false;
  }

  // A gentle supplication that crowns the streak box (shown for your own city).
  function ensureDuaEl() {
    let d = $("#cpDua"); if (d) return d;
    const box = $("#cpNext"); if (!box || !box.parentNode) return null;
    d = document.createElement("p");
    d.id = "cpDua"; d.className = "cp-dua"; d.hidden = true; d.setAttribute("dir", "rtl");
    d.innerHTML = `<span class="cp-dua-ar">${T.dua}</span>` + (LANG === "ar" || !T.duaTr ? "" : `<span class="cp-dua-tr" dir="ltr">${T.duaTr}</span>`);
    box.parentNode.insertBefore(d, box);
    return d;
  }

  /* ---------- 7-day strip + details panel ---------- */
  const dayStatus = ds => { const c = wFardCount(ds); return c === 5 ? "full" : c > 0 ? "part" : "none"; };
  const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

  function ensureWeekEl() {
    let wk = $("#cpWeek"); if (wk) return wk;
    const box = $("#cpNext"); if (!box || !box.parentNode) return null;
    wk = document.createElement("button");
    wk.id = "cpWeek"; wk.type = "button"; wk.className = "cp-week"; wk.hidden = true;
    wk.setAttribute("aria-label", T.statsTitle + " — " + T.statsHint);
    box.parentNode.insertBefore(wk, box.nextSibling);
    wk.addEventListener("click", openStatsPanel);
    return wk;
  }
  function renderWeek() {
    const wk = ensureWeekEl(); if (!wk) return;
    const now = new Date();
    let cells = "";
    for (let i = 6; i >= 0; i--) {
      const st = dayStatus(wDateStr(addDays(now, -i)));
      cells += `<i class="cp-wk-pip cp-wk-${st}${i === 0 ? " is-today" : ""}"></i>`;
    }
    wk.innerHTML = `<span class="cp-wk-label">${T.weekTitle}</span><span class="cp-wk-row">${cells}</span>`;
    wk.hidden = false;
  }
  function hideWeek() { const wk = $("#cpWeek"); if (wk) wk.hidden = true; }

  function bestStreak(daysBack = 120) {
    let best = 0, run = 0;
    const now = new Date();
    for (let i = daysBack; i >= 0; i--) {
      if (wDayComplete(wDateStr(addDays(now, -i)))) { run++; if (run > best) best = run; }
      else run = 0;
    }
    return best;
  }

  let statsOverlay = null;
  function openStatsPanel() {
    if (!statsOverlay) {
      statsOverlay = document.createElement("div");
      statsOverlay.className = "cp-stats-overlay"; statsOverlay.hidden = true;
      statsOverlay.innerHTML = `<div class="cp-stats" role="dialog" aria-modal="true" aria-label="${T.statsTitle}">
        <div class="cp-stats-head"><strong>${T.statsTitle}</strong><button class="cp-stats-close" type="button" aria-label="${T.statsClose}">✕</button></div>
        <div class="cp-stats-nums"></div>
        <div class="cp-stats-grid"></div>
        <div class="cp-stats-legend">
          <span><i class="cp-wk-pip cp-wk-full"></i>${T.legendFull}</span>
          <span><i class="cp-wk-pip cp-wk-part"></i>${T.legendPart}</span>
          <span><i class="cp-wk-pip cp-wk-none"></i>${T.legendNone}</span>
        </div>
        <p class="cp-stats-note">${T.streakNote}</p></div>`;
      document.body.appendChild(statsOverlay);
      const close = () => { statsOverlay.hidden = true; document.body.style.overflow = ""; };
      statsOverlay.addEventListener("click", e => { if (e.target === statsOverlay) close(); });
      statsOverlay.querySelector(".cp-stats-close").addEventListener("click", close);
      document.addEventListener("keydown", e => { if (e.key === "Escape" && !statsOverlay.hidden) close(); });
    }
    // numbers
    statsOverlay.querySelector(".cp-stats-nums").innerHTML =
      `<div class="cp-stat"><b>${wStreak()}</b><span>${T.currentStreak}</span></div>` +
      `<div class="cp-stat"><b>${bestStreak()}</b><span>${T.bestStreak}</span></div>`;
    // last 14 days grid (oldest → today)
    const now = new Date();
    const wdFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { weekday: "short" });
    let grid = "";
    for (let i = 13; i >= 0; i--) {
      const d = addDays(now, -i), ds = wDateStr(d), c = wFardCount(ds), st = dayStatus(ds);
      grid += `<div class="cp-stats-day${i === 0 ? " is-today" : ""}"><span class="cp-sd-wd">${wdFmt.format(d)}</span><i class="cp-wk-pip cp-wk-${st}"></i><span class="cp-sd-n">${c}/5</span></div>`;
    }
    statsOverlay.querySelector(".cp-stats-grid").innerHTML = grid;
    statsOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  // The box under the clock: your city → streak; another city → next-prayer line.
  function updateStatusBox() {
    const el = $("#cpNext"); if (!el) return;
    const dua = ensureDuaEl();
    if (currentMine) { if (dua) dua.hidden = false; el.classList.add("cp-streak"); renderStreak(el); renderWeek(); }
    else { if (dua) dua.hidden = true; el.classList.remove("cp-streak", "cp-celebrate", "cp-recover"); hideWeek(); updateNextLine(); }
  }

  function nextPrayer(t, city) {
    const off = city ? offsetHours(city.tz) * 3600000 : 0;
    const d = new Date(Date.now() + off);
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    for (const p of PRAYERS) {
      const [hh, mm] = (t[p] || "").split(" ")[0].split(":");
      if ((+hh) * 60 + (+mm) > mins) return p;
    }
    return "Fajr";
  }

  /* ---------- Day length + city pulse (sunrise/sunset live in prayer grid) ---------- */
  function dayLengthFromSun(sunrise, sunset) {
    const toMin = s => { const a = (s || "").split(":"); return (+a[0]) * 60 + (+a[1]); };
    let diff = toMin(sunset) - toMin(sunrise);
    if (diff < 0) diff += 1440;
    return T.dayLen(Math.floor(diff / 60), String(diff % 60).padStart(2, "0"));
  }
  function fillSun(sunrise, sunset) {
    return dayLengthFromSun(sunrise, sunset);
  }
  function refreshCityPulse(city, timings) {
    if (!city || !window.CthCityPulse) return;
    const sunrise = timings && timings.Sunrise;
    const sunset = timings && (timings.Sunset || timings.Maghrib);
    window.CthCityPulse.refresh(city, {
      mode: "home",
      timings: timings || {},
      sunrise,
      sunset,
      dayLen: sunrise && sunset ? dayLengthFromSun(sunrise, sunset) : null,
    });
    if (window.CthPrayerInsights) window.CthPrayerInsights.refresh(city, timings || {});
  }
  async function loadSun(city) {
    if (!city) return;
    /* day length + pulse are filled from prayer data in loadPrayer */
  }

  /* ---------- Boot ---------- */
  /* ---------- Your-local-time panel + analog clock ---------- */
  let ltTz = "UTC", ltOffsetMs = 0, ltEls = {}, ltRAF = 0;

  function buildAnalogSvg() {
    let ticks = "", nums = "";
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = i * 6 * Math.PI / 180;
      const r1 = major ? 76 : 81, r2 = major ? 86 : 84;
      ticks += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + r2 * Math.sin(a)).toFixed(1)}" y2="${(100 - r2 * Math.cos(a)).toFixed(1)}" stroke="var(--border-2)" stroke-width="${major ? 1.8 : 0.85}" stroke-linecap="round" opacity="${major ? .9 : .35}"/>`;
    }
    for (let n = 1; n <= 12; n++) {
      const a = n * 30 * Math.PI / 180, R = 65;
      nums += `<text x="${(100 + R * Math.sin(a)).toFixed(1)}" y="${(100 - R * Math.cos(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" class="lt-num">${n}</text>`;
    }
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="lt-svg" aria-hidden="true">
      <rect x="7" y="7" width="186" height="186" rx="30" fill="var(--bg-soft)" stroke="var(--border)" stroke-width="1.5"/>
      <rect x="15" y="15" width="170" height="170" rx="24" fill="var(--surface)" stroke="var(--border-2)" stroke-width="1" opacity=".55"/>
      ${ticks}
      <g class="lt-nums">${nums}</g>
      <g id="ltHour" class="lt-hand-hour">
        <rect x="96" y="52" width="8" height="58" rx="4" fill="#c6a24b" stroke="#9c7c2e" stroke-width=".5"/>
        <rect x="98.2" y="56" width="3.6" height="42" rx="1.8" fill="#f3ecda"/>
      </g>
      <g id="ltMin" class="lt-hand-min">
        <rect x="97" y="32" width="6" height="80" rx="3" fill="#c6a24b" stroke="#9c7c2e" stroke-width=".5"/>
        <rect x="98.6" y="36" width="2.8" height="60" rx="1.4" fill="#f3ecda"/>
      </g>
      <g id="ltSec" class="lt-hand-sec">
        <line x1="100" y1="116" x2="100" y2="26" stroke="#c6a24b" stroke-width="1.1" stroke-linecap="round"/>
        <circle cx="100" cy="113" r="3" fill="none" stroke="#c6a24b" stroke-width="1.1"/>
      </g>
      <circle cx="100" cy="100" r="4.3" fill="#c6a24b" stroke="#9c7c2e" stroke-width=".5"/>
      <circle cx="100" cy="100" r="1.6" fill="#6f571b"/>
    </svg>`;
  }

  function ltFrame() {
    if (!ltEls.hour) return;
    const d = new Date(Date.now() + ltOffsetMs);
    const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds(), ms = d.getUTCMilliseconds();
    const secF = s + ms / 1000, minF = m + secF / 60, hF = (h % 12) + minF / 60;
    ltEls.hour.setAttribute("transform", `rotate(${(hF * 30).toFixed(2)} 100 100)`);
    ltEls.min.setAttribute("transform", `rotate(${(minF * 6).toFixed(2)} 100 100)`);
    ltEls.sec.setAttribute("transform", `rotate(${(secF * 6).toFixed(2)} 100 100)`);
    ltRAF = requestAnimationFrame(ltFrame);
  }

  async function init() {
    $("#year").textContent = new Date().getFullYear();
    initTheme();
    try { await loadCities(); }
    catch { const g = $("#cityGrid"); if (g) g.innerHTML = `<p class="no-results">${T.cityErr}</p>`; return; }

    const bc = $("#browseCount"); if (bc) bc.textContent = CITIES.length;
    renderCities(CITIES.filter(c => c.featured));   // no-op when there is no #cityGrid (homepage)
    renderMyCities();
    initFavorites();
    initSearch();                                   // no-op when there is no #citySearch (homepage)
    initCityPanel();
    initHelp();
    startClock();

    const params = new URLSearchParams(location.search);
    const cityParam = params.get("city");
    // Only honor the URL's city when the user hasn't pinned their own default,
    // so an installed app's start_url (/?city=…) never overrides a saved choice.
    if (cityParam && !getHomeSlug()) {
      const c = CITIES.find(x => x.slug === cityParam);
      if (c) setCity(c);
    }
    const q = params.get("q");
    if (q) {
      const inp = $("#citySearch");
      if (inp) { inp.value = q; inp.dispatchEvent(new Event("input")); }
      else {
        const nq = norm(q);
        const hit = CITIES.find(c => norm(`${c.name} ${c.name_ar || ""} ${c.country} ${c.country_ar || ""}`).includes(nq));
        if (hit) setCity(hit);
      }
    }
  }

  // ---- Help / welcome guide (first-run + reopen via "?") ----
  function initHelp() {
    const overlay = document.getElementById("helpOverlay");
    const btn = document.getElementById("helpBtn");
    if (!overlay || !btn) return;
    const HELP_KEY = "cth-help-seen";
    const open = () => { overlay.hidden = false; document.body.style.overflow = "hidden"; };
    const close = () => { overlay.hidden = true; document.body.style.overflow = ""; try { localStorage.setItem(HELP_KEY, "1"); } catch (e) {} };
    btn.addEventListener("click", open);
    overlay.querySelectorAll("[data-help-close]").forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !overlay.hidden) close(); });
    let seen = false;
    try { seen = localStorage.getItem(HELP_KEY) === "1"; } catch (e) {}
    if (!seen) setTimeout(open, 600); // show once on first visit
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
