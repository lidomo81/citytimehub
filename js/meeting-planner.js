/* =====================================================================
   CityTimeHub — js/meeting-planner.js
   Plan a meeting/event at a specific date & time in one city and see it
   converted to every other city, with Google Calendar + .ics export and
   a shareable link. Pure vanilla JS, no dependencies. DST-aware.
   ===================================================================== */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[\u0623\u0625\u0622\u0627]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647")
    .replace(/[\u064b-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const pad = n => String(n).padStart(2, "0");

  let CITIES = [];
  const bySlug = new Map();

  /* ---------- Timezone math (wall-clock in a tz → exact UTC instant) ---------- */
  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cC = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");
  const T = LANG === "ar" ? {
    defaultTitle: "حدث",
    maxCities: "تقدر تضيف حتى 6 مدن.",
    linkCopied: "تم نسخ الرابط — يفتح عند هذه اللحظة بالضبط لأي شخص.",
    copyThis: "انسخ هذا الرابط:",
    loadErr: "تعذّر تحميل قائمة المدن. حدّث الصفحة من فضلك.",
    thCity: "المدينة", thLocal: "التاريخ والوقت المحلي", base: "الأساس",
    work: "ضمن ساعات العمل", early: "مبكّر/متأخّر", night: "ليل",
    day: n => n > 1 ? "أيام" : "يوم",
    details: names => `خُطّط عبر CityTimeHub. المدن: ${names}.`,
    remove: n => `إزالة ${n}`,
  } : {
    defaultTitle: "Event",
    maxCities: "You can add up to 6 cities.",
    linkCopied: "Link copied — it opens at this exact moment for everyone.",
    copyThis: "Copy this link:",
    loadErr: "Couldn't load the city list. Please refresh the page.",
    thCity: "City", thLocal: "Local date & time", base: "base",
    work: "Working hours", early: "Early/late", night: "Night",
    day: n => n > 1 ? "days" : "day",
    details: names => `Planned with CityTimeHub. Cities: ${names}.`,
    remove: n => `Remove ${n}`,
  };

  function tzOffsetMin(tz, date) {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = {}; dtf.formatToParts(date).forEach(x => { p[x.type] = x.value; });
    let h = +p.hour; if (h === 24) h = 0;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  }
  function wallToUTC(y, mo, d, h, mi, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    let off = tzOffsetMin(tz, new Date(guess));
    let utc = guess - off * 60000;
    off = tzOffsetMin(tz, new Date(utc)); // refine across DST edges
    utc = guess - off * 60000;
    return utc;
  }
  function ymdInTz(ms, tz) {
    const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
  }
  function dayDelta(ms, tz, baseYmd) {
    const a = new Date(ymdInTz(ms, tz) + "T00:00:00Z").getTime();
    const b = new Date(baseYmd + "T00:00:00Z").getTime();
    return Math.round((a - b) / 86400000);
  }
  const fmtLocal = tz => new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: tz, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  function utcStamp(ms) {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }

  /* ---------- State ---------- */
  const state = { title: "", date: "", time: "", from: "", dur: 60, cities: [] };

  function findCity(q) {
    if (!q) return null;
    const s = norm(q);
    return bySlug.get(s) || CITIES.find(c => norm(c.name) === s) || CITIES.find(c => norm(c.name).startsWith(s)) || null;
  }
  function guessHomeSlug() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const hit = CITIES.find(c => c.tz === tz);
      if (hit) return hit.slug;
    } catch (e) {}
    return (CITIES.find(c => c.slug === "cairo") || CITIES[0] || {}).slug;
  }

  /* ---------- Autocomplete (generic) ---------- */
  function autocomplete(input, listEl, onChoose) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = ""; close(); return; }
      listEl.innerHTML = items.map((c, i) =>
        `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) {
      const c = items[i]; if (!c) return;
      onChoose(c); input.value = ""; close(); input.focus();
    }
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value) paint(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest(".ac-item"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    input.addEventListener("blur", () => setTimeout(close, 150));
  }

  /* ---------- Chips (added cities) ---------- */
  function renderChips() {
    const wrap = $("#plChips"); if (!wrap) return;
    wrap.innerHTML = state.cities.map(slug => {
      const c = bySlug.get(slug); if (!c) return "";
      return `<li class="pl-chip"><span>${esc(cN(c))}</span><button type="button" class="pl-chip-x" data-rm="${esc(slug)}" aria-label="${esc(T.remove(cN(c)))}">&times;</button></li>`;
    }).join("");
  }
  function addCity(slug) {
    if (!slug || slug === state.from) return;
    if (state.cities.includes(slug)) return;
    if (state.cities.length >= 6) { showError(T.maxCities); return; }
    clearError(); state.cities.push(slug); renderChips(); compute();
  }
  function removeCity(slug) { state.cities = state.cities.filter(s => s !== slug); renderChips(); compute(); }

  function showError(m) { const e = $("#plError"); if (e) { e.textContent = m; e.hidden = false; } }
  function clearError() { const e = $("#plError"); if (e) e.hidden = true; }

  /* ---------- Compute & render ---------- */
  let lastUtc = null;
  function compute() {
    const result = $("#plResult"), actions = $("#plActions");
    const from = bySlug.get(state.from);
    if (!from || !state.date || !state.time) { if (result) result.hidden = true; if (actions) actions.hidden = true; return; }
    const [y, mo, d] = state.date.split("-").map(Number);
    const [h, mi] = state.time.split(":").map(Number);
    if (!y || !mo || !d || isNaN(h) || isNaN(mi)) return;

    const utc = wallToUTC(y, mo, d, h, mi, from.tz);
    lastUtc = utc;
    const baseYmd = ymdInTz(utc, from.tz);

    const rows = [from.slug, ...state.cities].map((slug, idx) => {
      const c = bySlug.get(slug); if (!c) return "";
      const delta = dayDelta(utc, c.tz, baseYmd);
      const when = fmtLocal(c.tz).format(new Date(utc));
      const hour = +new Intl.DateTimeFormat("en-GB", { timeZone: c.tz, hour: "2-digit", hour12: false }).format(new Date(utc));
      const work = hour >= 9 && hour < 17 ? "ok" : (hour >= 7 && hour < 22 ? "warn" : "bad");
      const badge = delta === 0 ? "" : `<span class="pl-day ${delta > 0 ? "next" : "prev"}">${delta > 0 ? "+" : ""}${delta} ${T.day(Math.abs(delta))}</span>`;
      const dot = `<span class="pl-dot pl-${work}" title="${work === "ok" ? T.work : work === "warn" ? T.early : T.night}"></span>`;
      return `<tr${idx === 0 ? ' class="pl-home"' : ""}>
        <td class="pl-c">${dot}${esc(cN(c))}<span class="pl-cc">${esc(cC(c))}</span></td>
        <td class="pl-t">${esc(when)} ${badge}${idx === 0 ? '<span class="pl-base">${T.base}</span>' : ""}</td></tr>`;
    }).join("");

    if (result) {
      result.innerHTML = `<table class="pl-table"><thead><tr><th>${T.thCity}</th><th>${T.thLocal}</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="pl-legend"><span class="pl-dot pl-ok"></span> ${T.work} &nbsp; <span class="pl-dot pl-warn"></span> ${T.early} &nbsp; <span class="pl-dot pl-bad"></span> ${T.night}</p>`;
      result.hidden = false;
    }
    if (actions) actions.hidden = false;
    updateGcal(utc); updateUrl();
  }

  /* ---------- Calendar export ---------- */
  function eventTitle() { return state.title || T.defaultTitle; }
  function eventDetails() {
    const from = bySlug.get(state.from);
    const names = [from, ...state.cities.map(s => bySlug.get(s))].filter(Boolean).map(c => cN(c)).join("، ");
    return T.details(names);
  }
  function updateGcal(utc) {
    const a = $("#plGcal"); if (!a) return;
    const end = utc + state.dur * 60000;
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", eventTitle());
    u.searchParams.set("dates", `${utcStamp(utc)}/${utcStamp(end)}`);
    u.searchParams.set("details", eventDetails());
    a.href = u.toString();
  }
  function downloadIcs() {
    if (lastUtc == null) return;
    const end = lastUtc + state.dur * 60000;
    const uid = "cth-" + Date.now() + "@citytimehub.com";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CityTimeHub//Event Planner//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${utcStamp(Date.now())}`,
      `DTSTART:${utcStamp(lastUtc)}`, `DTEND:${utcStamp(end)}`,
      `SUMMARY:${eventTitle().replace(/[,;\\]/g, m => "\\" + m)}`,
      `DESCRIPTION:${eventDetails().replace(/[,;\\]/g, m => "\\" + m)}`,
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (eventTitle().replace(/[^\w-]+/g, "-") || "event") + ".ics";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- Shareable URL ---------- */
  function updateUrl() {
    if (lastUtc == null) return;
    const p = new URLSearchParams();
    p.set("t", new Date(lastUtc).toISOString());
    if (state.title && state.title !== T.defaultTitle) p.set("title", state.title);
    p.set("from", state.from);
    if (state.cities.length) p.set("cities", state.cities.join(","));
    history.replaceState(null, "", location.pathname + "?" + p.toString());
  }
  function copyShare() {
    const url = location.href;
    const done = () => toast(T.linkCopied);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(() => prompt(T.copyThis, url));
    else prompt(T.copyThis, url);
  }
  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) { t = document.createElement("div"); t.id = "cthToast"; t.className = "cth-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("is-shown"), 2400);
  }

  /* ---------- Defaults & deep-link ---------- */
  function setHome(c) {
    state.from = c.slug;
    const inp = $("#plFrom"); if (inp) { inp.value = c.name + ", " + c.country; inp.dataset.slug = c.slug; }
  }
  function applyParams() {
    const p = new URLSearchParams(location.search);
    const t = p.get("t"), fromC = findCity(p.get("from"));
    if (p.get("title")) { state.title = p.get("title"); const ti = $("#plTitle"); if (ti) ti.value = state.title; }
    if (fromC) setHome(fromC);
    if (t) {
      const ms = Date.parse(t);
      if (!isNaN(ms) && fromC) {
        // show the shared instant as wall time in the 'from' city
        const p2 = {}; new Intl.DateTimeFormat("en-GB", { timeZone: fromC.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
          .formatToParts(new Date(ms)).forEach(x => { p2[x.type] = x.value; });
        state.date = `${p2.year}-${p2.month}-${p2.day}`;
        state.time = `${p2.hour === "24" ? "00" : p2.hour}:${p2.minute}`;
        const di = $("#plDate"), tmi = $("#plTime");
        if (di) di.value = state.date; if (tmi) tmi.value = state.time;
      }
    }
    const cs = (p.get("cities") || "").split(",").map(s => s.trim()).filter(Boolean);
    cs.forEach(slug => { const c = bySlug.get(slug); if (c && c.slug !== state.from && !state.cities.includes(c.slug)) state.cities.push(c.slug); });
    return !!t;
  }

  async function init() {
    const form = $("#plannerForm"); if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      const data = await res.json();
      CITIES = (data.cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "") + " " + (c.country_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { showError(T.loadErr); return; }

    const titleI = $("#plTitle"), dateI = $("#plDate"), timeI = $("#plTime"), durI = $("#plDur");

    // defaults
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60000);
    state.date = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
    state.time = `${pad(next.getHours())}:00`;
    if (dateI) dateI.value = state.date;
    if (timeI) timeI.value = state.time;
    if (titleI) titleI.value = state.title;

    const home = bySlug.get(guessHomeSlug()); if (home) setHome(home);

    const hadDeepLink = applyParams();
    renderChips();

    autocomplete($("#plFrom"), $("#acFrom"), c => { setHome(c); state.cities = state.cities.filter(s => s !== c.slug); renderChips(); compute(); });
    autocomplete($("#plAdd"), $("#acAdd"), c => addCity(c.slug));

    if (titleI) titleI.addEventListener("input", () => { state.title = titleI.value.trim() || T.defaultTitle; if (lastUtc != null) { updateGcal(lastUtc); updateUrl(); } });
    if (dateI) dateI.addEventListener("change", () => { state.date = dateI.value; compute(); });
    if (timeI) timeI.addEventListener("change", () => { state.time = timeI.value; compute(); });
    if (durI) durI.addEventListener("change", () => { state.dur = +durI.value || 60; if (lastUtc != null) { updateGcal(lastUtc); } });

    $("#plChips").addEventListener("click", e => { const b = e.target.closest(".pl-chip-x"); if (b) removeCity(b.dataset.rm); });
    const ics = $("#plIcs"); if (ics) ics.addEventListener("click", downloadIcs);
    const sh = $("#plShare"); if (sh) sh.addEventListener("click", copyShare);

    compute();
    if (hadDeepLink) { const r = $("#plResult"); if (r) r.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
