/* Cities board — live comparison of up to 4 cities (separate from home city). */
(function () {
  "use strict";

  const LANG = (document.documentElement.getAttribute("lang") || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const MAX = 4;
  const STORE = "cth-cities-board";
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const T = LANG === "ar"
    ? {
        add: "أضف مدينة",
        edit: "تعديل",
        done: "تم",
        empty: "أضف حتى 4 مدن لمتابعة الوقت والصلاة القادمة.",
        noteHome: "مدينتك",
        noteHint: "تظهر في الرئيسية والصلاة كما هي — هذه اللوحة للمقارنة فقط.",
        remove: "إزالة",
        full: "يمكنك إضافة حتى 4 مدن.",
        search: "ابحث عن مدينة…",
        nextSoon: (n, t) => n + " · " + t,
        leftHM: (h, m) => (h ? "بعد " + h + " س " + m + " د" : "بعد " + m + " د"),
        leftTomorrow: (h, m) => "غدًا · " + (h ? "بعد " + h + " س " + m + " د" : "بعد " + m + " د"),
        prayer: { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" },
        loading: "…"
      }
    : {
        add: "Add city",
        edit: "Edit",
        done: "Done",
        empty: "Add up to 4 cities to follow live time and the next prayer.",
        noteHome: "Your city",
        noteHint: "stays on Home & Prayer as usual — this board is comparison only.",
        remove: "Remove",
        full: "You can add up to 4 cities.",
        search: "Search for a city…",
        nextSoon: (n, t) => n + " · " + t,
        leftHM: (h, m) => (h ? "in " + h + "h " + m + "m" : "in " + m + "m"),
        leftTomorrow: (h, m) => "tomorrow · " + (h ? "in " + h + "h " + m + "m" : "in " + m + "m"),
        prayer: { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" },
        loading: "…"
      };

  const cN = c => (LANG === "ar" && c.name_ar) ? c.name_ar : c.name;
  const cC = c => (LANG === "ar" && c.country_ar) ? c.country_ar : (c.country || "");

  let CITIES = [];
  let board = [];
  /** @type {Record<string, {tz:string|null, timings:Object|null}>} */
  let live = Object.create(null);
  let editing = false;
  let tickTimer = 0;

  function loadBoard() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(raw) ? raw.filter(e => e && e.slug).slice(0, MAX) : [];
    } catch (e) { return []; }
  }

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify(board.map(stripRuntime)));
    } catch (e) {}
  }

  function stripRuntime(e) {
    const o = {
      slug: e.slug
    };
    if (e.world) {
      o.name = e.name;
      o.country = e.country;
      o.lat = e.lat;
      o.lng = e.lng;
      o.method = e.method || 3;
      o.school = e.school || 0;
      o.tz = e.tz || null;
      o.world = true;
    }
    return o;
  }

  function favEntries() {
    try {
      const raw = JSON.parse(localStorage.getItem("cth-fav-cities") || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map(e => (typeof e === "string" ? { slug: e } : e)).filter(e => e && e.slug);
    } catch (e) { return []; }
  }

  function homeSlug() {
    try { return localStorage.getItem("cth-home-city") || ""; } catch (e) { return ""; }
  }

  function resolveEntry(entry) {
    if (!entry) return null;
    if (entry.world && entry.lat != null) {
      return {
        slug: entry.slug,
        name: entry.name,
        country: entry.country || "",
        lat: entry.lat,
        lng: entry.lng,
        method: entry.method || 3,
        school: entry.school || 0,
        tz: entry.tz || null,
        world: true
      };
    }
    const c = CITIES.find(x => x.slug === entry.slug);
    if (c) return c;
    // World cities saved in favorites carry lat/lng — recover those for board rows.
    const fav = favEntries().find(e => e.slug === entry.slug && e.world && e.lat != null);
    if (fav) {
      return {
        slug: fav.slug,
        name: fav.name,
        country: fav.country || "",
        lat: fav.lat,
        lng: fav.lng,
        method: fav.method || 3,
        school: fav.school || 0,
        tz: fav.tz || null,
        world: true
      };
    }
    return null;
  }

  /** Drop slots that cannot be shown (e.g. home seeded as a bare world slug). */
  function pruneBoard() {
    const next = [];
    board.forEach(e => {
      if (!e || !e.slug) return;
      if (next.some(x => x.slug === e.slug)) return;
      const city = resolveEntry(e);
      if (!city) return;
      if (city.world) {
        next.push({
          slug: city.slug, name: city.name, country: city.country,
          lat: city.lat, lng: city.lng, method: city.method,
          school: city.school || 0, tz: city.tz || null, world: true
        });
      } else {
        next.push({ slug: city.slug });
      }
    });
    if (next.length !== board.length) {
      board = next;
      persist();
    } else {
      board = next;
    }
  }

  function seedIfEmpty() {
    if (board.length) return;
    const out = [];
    const home = homeSlug();
    // Home city stays on Home & Prayer only — never consumes a board slot.
    try {
      favEntries().forEach(e => {
        const slug = e.slug;
        if (!slug || slug === home || out.some(x => x.slug === slug)) return;
        if (e.world && e.lat != null) out.push(e);
        else if (CITIES.some(c => c.slug === slug)) out.push({ slug: slug });
      });
    } catch (e) {}
    if (!out.length && CITIES.length) {
      ["london", "dubai", "kuala-lumpur", "new-york"].forEach(s => {
        if (s === home) return;
        if (CITIES.some(c => c.slug === s)) out.push({ slug: s });
      });
    }
    board = out.slice(0, MAX);
    persist();
  }

  function todayStr() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  function cacheKey(city) {
    return "cth-prayer:" + (city.slug || (city.lat + "," + city.lng));
  }

  function readCache(city) {
    try {
      const o = JSON.parse(localStorage.getItem(cacheKey(city)) || "null");
      if (!o || !o.timings || o.ds !== todayStr()) return null;
      return o;
    } catch (e) { return null; }
  }

  function writeCache(city, timings, tz) {
    try {
      localStorage.setItem(cacheKey(city), JSON.stringify({
        ds: todayStr(),
        timings: timings,
        tz: tz || city.tz || null
      }));
    } catch (e) {}
  }

  async function fetchTimings(city) {
    const cached = readCache(city);
    if (cached) {
      live[city.slug] = {
        tz: cached.tz || city.tz || null,
        timings: cached.timings
      };
      return;
    }
    if (city.lat == null || city.lng == null) return;
    const method = city.method != null ? city.method : 3;
    const school = city.school != null ? city.school : 0;
    const url = "https://api.aladhan.com/v1/timings/" + todayStr() +
      "?latitude=" + city.lat + "&longitude=" + city.lng +
      "&method=" + method + "&school=" + school;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const t = (data && data.data && data.data.timings) || {};
      const timings = {};
      PRAYERS.forEach(p => {
        const v = String(t[p] || "").trim().split(" ")[0];
        if (v) timings[p] = v;
      });
      const tz = (data.data.meta && data.data.meta.timezone) || city.tz || null;
      live[city.slug] = { tz: tz, timings: timings };
      writeCache(city, timings, tz);
    } catch (e) {}
  }

  function partsInTz(tz) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || undefined,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false
    });
    const map = {};
    for (const p of fmt.formatToParts(new Date())) if (p.type !== "literal") map[p.type] = p.value;
    return map;
  }

  function clockStr(tz) {
    const p = partsInTz(tz);
    const pad = n => String(+n).padStart(2, "0");
    return pad(p.hour) + ":" + pad(p.minute) + ":" + pad(p.second);
  }

  function nextPrayer(tz, timings) {
    if (!timings || !tz) return null;
    const p = partsInTz(tz);
    const now = (+p.hour) * 60 + (+p.minute);
    for (let i = 0; i < PRAYERS.length; i++) {
      const key = PRAYERS[i];
      const hm = timings[key];
      if (!hm) continue;
      const a = hm.split(":");
      const t = (+a[0]) * 60 + (+a[1]);
      if (t > now) {
        const left = t - now;
        const h = Math.floor(left / 60), m = left % 60;
        return { name: T.prayer[key], time: hm, left: T.leftHM(h, m) };
      }
    }
    const hm = timings.Fajr;
    if (!hm) return null;
    const a = hm.split(":");
    const t = (+a[0]) * 60 + (+a[1]) + 24 * 60;
    const left = t - now;
    const h = Math.floor(left / 60), m = left % 60;
    return { name: T.prayer.Fajr, time: hm, left: T.leftTomorrow(h, m) };
  }

  function homeLabel() {
    const slug = homeSlug();
    if (!slug) return "";
    const c = CITIES.find(x => x.slug === slug) || resolveEntry({ slug: slug });
    return c ? cN(c) : "";
  }

  function boardCount() {
    return board.filter(e => resolveEntry(e)).length;
  }

  function render() {
    const list = document.getElementById("cbList");
    const note = document.getElementById("cbHomeNote");
    const addWrap = document.getElementById("cbAddWrap");
    const editBtn = document.getElementById("cbEdit");
    if (!list) return;

    if (note) {
      const hl = homeLabel();
      note.innerHTML = hl
        ? "<strong>" + T.noteHome + ":</strong> " + hl + " — " + T.noteHint
        : T.noteHint;
    }
    if (editBtn) editBtn.textContent = editing ? T.done : T.edit;

    const resolved = board.map(resolveEntry).filter(Boolean);
    if (!resolved.length) {
      list.innerHTML = '<p class="cb-empty">' + T.empty + "</p>";
    } else {
      list.innerHTML = resolved.map(city => {
        const st = live[city.slug] || {};
        const tz = st.tz || city.tz || "";
        const n = nextPrayer(tz, st.timings);
        return (
          '<article class="cb-row" data-slug="' + city.slug + '">' +
            '<div class="cb-top">' +
              "<div>" +
                '<div class="cb-name">' + cN(city) + "</div>" +
                '<div class="cb-country">' + cC(city) + "</div>" +
              "</div>" +
              '<div class="cb-clock" dir="ltr">' +
                (tz ? clockStr(tz) : T.loading) +
              "</div>" +
            "</div>" +
            '<div class="cb-next">' +
              (n
                ? "<span>" + T.nextSoon(n.name, n.time) + "</span><em>" + n.left + "</em>"
                : "<span>" + T.loading + "</span>") +
            "</div>" +
            (editing
              ? '<button type="button" class="cb-remove" data-remove="' + city.slug + '" aria-label="' + T.remove + '">✕</button>'
              : "") +
          "</article>"
        );
      }).join("");
    }

    if (addWrap) {
      const n = boardCount();
      const show = editing || n < MAX;
      addWrap.hidden = !show;
      addWrap.classList.toggle("is-full", n >= MAX);
      const inp = document.getElementById("cbSearch");
      if (inp) inp.placeholder = T.search;
    }
  }

  function tick() {
    document.querySelectorAll(".cb-row[data-slug]").forEach(row => {
      const slug = row.getAttribute("data-slug");
      const city = resolveEntry(board.find(e => e.slug === slug));
      if (!city) return;
      const st = live[slug] || {};
      const tz = st.tz || city.tz || "";
      const clock = row.querySelector(".cb-clock");
      if (clock && tz) clock.textContent = clockStr(tz);
      const n = nextPrayer(tz, st.timings);
      const next = row.querySelector(".cb-next");
      if (next && n) {
        next.innerHTML = "<span>" + T.nextSoon(n.name, n.time) + "</span><em>" + n.left + "</em>";
      }
    });
  }

  async function refreshAllTimings() {
    for (let i = 0; i < board.length; i++) {
      const city = resolveEntry(board[i]);
      if (!city) continue;
      await fetchTimings(city);
    }
    render();
    tick();
  }

  function addCity(city) {
    if (!city || !city.slug) return;
    pruneBoard();
    if (board.some(e => e.slug === city.slug)) return;
    if (boardCount() >= MAX) {
      toast(T.full);
      return;
    }
    const entry = city.world
      ? {
          slug: city.slug,
          name: city.name,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
          method: city.method || 3,
          school: city.school || 0,
          tz: city.tz || null,
          world: true
        }
      : { slug: city.slug };
    board.push(entry);
    persist();
    editing = true;
    refreshAllTimings();
    const inp = document.getElementById("cbSearch");
    if (inp && window.CTH_CITY_INP) window.CTH_CITY_INP.reset(inp);
    else if (inp) inp.value = "";
  }

  function removeCity(slug) {
    board = board.filter(e => e.slug !== slug);
    delete live[slug];
    persist();
    render();
  }

  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "cthToast";
      t.className = "cth-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("is-shown");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("is-shown"), 2200);
  }

  function wireUi() {
    const editBtn = document.getElementById("cbEdit");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        editing = !editing;
        render();
      });
    }
    const list = document.getElementById("cbList");
    if (list) {
      list.addEventListener("click", e => {
        const btn = e.target.closest("[data-remove]");
        if (!btn) return;
        removeCity(btn.getAttribute("data-remove"));
      });
    }
    const inp = document.getElementById("cbSearch");
    const ac = document.getElementById("cbSearchAc");
    if (inp && ac) wireSearch(inp, ac);
  }

  function wireSearch(inp, list) {
    let items = [];
    let active = -1;
    const close = () => {
      list.hidden = true;
      list.innerHTML = "";
      active = -1;
      inp.setAttribute("aria-expanded", "false");
    };
    function paint() {
      const q = inp.value.trim().toLowerCase();
      if (!q) { close(); return; }
      items = CITIES.filter(c => {
        const blob = (c.name + " " + (c.name_ar || "") + " " + (c.country || "") + " " + (c.country_ar || "")).toLowerCase();
        return blob.indexOf(q) >= 0;
      }).slice(0, 8);
      if (!items.length) {
        list.innerHTML = window.CTH_CITY_INP
          ? CTH_CITY_INP.emptyHtml()
          : '<li class="ac-empty">' + (LANG === "ar" ? "لا توجد مدينة بهذا الاسم" : "No city found") + "</li>";
        list.hidden = false;
        inp.setAttribute("aria-expanded", "true");
        return;
      }
      list.innerHTML = items.map((c, i) =>
        window.CTH_CITY_INP
          ? CTH_CITY_INP.optionHtml(cN(c), cC(c), i, active, inp.value)
          : '<li class="ac-item" data-i="' + i + '"><span>' + cN(c) + '</span><span class="ac-country">' + cC(c) + "</span></li>"
      ).join("");
      list.hidden = false;
      inp.setAttribute("aria-expanded", "true");
    }
    function pick(i) {
      const c = items[i];
      if (!c) return;
      addCity(c);
      close();
    }
    inp.addEventListener("input", paint);
    inp.addEventListener("focus", () => { if (inp.value.trim()) paint(); });
    inp.addEventListener("keydown", e => {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    list.addEventListener("mousedown", e => {
      const li = e.target.closest("[data-i]");
      if (!li) return;
      e.preventDefault();
      pick(+li.dataset.i);
    });
    document.addEventListener("click", e => {
      if (e.target !== inp && !list.contains(e.target) && !e.target.closest(".cb-add")) close();
    });
  }

  async function init() {
    board = loadBoard();
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      const data = await res.json();
      CITIES = (data && data.cities) || [];
    } catch (e) { CITIES = []; }
    // Drop ghost slots (unresolvable / old home seed) before seeding or counting.
    pruneBoard();
    seedIfEmpty();
    pruneBoard();
    wireUi();
    await refreshAllTimings();
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
