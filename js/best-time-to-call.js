/* =====================================================================
   CityTimeHub — js/best-time-to-call.js
   "Best Time to Call" — pick your city + the cities you want to reach,
   choose a context (family / work), and the tool scans all 24 of your
   local hours, classifies each as ideal / borderline / asleep for every
   other city, and surfaces the single best overlapping hour ("golden
   time"), with a colour-coded 24-hour band per city and a share link.
   Pure vanilla JS, no dependencies. Reads <html lang> for i18n.
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[\u0623\u0625\u0622\u0627]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647")
    .replace(/[\u064b-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cC = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");

  const CONTEXTS = { family: { start: 8, end: 23 }, work: { start: 9, end: 17 } };
  const SLEEP_START = 23, SLEEP_END = 7;
  const MAX_CITIES = 6;

  const T = LANG === "ar" ? {
    you: "أنت", noCity: "لا توجد مدينة", maxCities: "تقدر تضيف حتى 6 مدن.",
    pickFirst: "اختر مدينتك والمدن اللي عايز تكلّمها.",
    goldenLabel: "أفضل وقت للاتصال",
    everyone: "الكل متاح", most: "أنسب وقت متاح", asleepAll: "كل الأوقات فيها حد نائم — دي الأقل سوءًا",
    yourTime: "بتوقيتك", at: "عند",
    legendGood: "وقت مثالي", legendOk: "مقبول", legendBad: "وقت نوم",
    ctxFamily: "مكالمة عائلية", ctxWork: "اجتماع شغل",
    remove: n => `إزالة ${n}`, linkCopied: "تم نسخ الرابط — يفتح بنفس الإعداد لأي شخص.",
    copyThis: "انسخ هذا الرابط:",
  } : {
    you: "You", noCity: "No city found", maxCities: "You can add up to 6 cities.",
    pickFirst: "Pick your city and the cities you want to reach.",
    goldenLabel: "Best time to call",
    everyone: "everyone's available", most: "best available overlap", asleepAll: "someone's asleep at every hour — this is the least bad",
    yourTime: "your time", at: "at",
    legendGood: "Ideal", legendOk: "Borderline", legendBad: "Asleep",
    ctxFamily: "Family call", ctxWork: "Work meeting",
    remove: n => `Remove ${n}`, linkCopied: "Link copied — opens with the same setup for anyone.",
    copyThis: "Copy this link:",
  };

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtMin = min => { min = (((Math.round(min) % 1440) + 1440) % 1440); return hourFmt.format(new Date(2020, 0, 1, Math.floor(min / 60), min % 60)); };

  let CITIES = [];
  const bySlug = new Map();
  const state = { from: "", cities: [], context: "family" };
  let lastData = null, pinnedCol = null;

  function tzOffsetHours(tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date()).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    } catch (e) { return 0; }
  }
  function classify(hour, ctx) {
    const { start, end } = CONTEXTS[ctx];
    if (hour >= start && hour < end) return "good";
    if (hour >= SLEEP_START || hour < SLEEP_END) return "bad";
    return "ok";
  }
  function findCity(q) {
    if (!q) return null;
    const s = norm(q);
    return bySlug.get(s) || CITIES.find(c => norm(c.name) === s) || CITIES.find(c => c._s && c._s.startsWith(s)) || null;
  }
  function guessHomeSlug() {
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; const hit = CITIES.find(c => c.tz === tz); if (hit) return hit.slug; } catch (e) {}
    return (CITIES.find(c => c.slug === "cairo") || CITIES[0] || {}).slug;
  }

  /* ---------- Core compute ---------- */
  function compute() {
    const from = bySlug.get(state.from);
    const targets = state.cities.map(s => bySlug.get(s)).filter(Boolean);
    if (!from || !targets.length) return null;
    const fromOff = tzOffsetHours(from.tz);
    const offs = targets.map(t => tzOffsetHours(t.tz));
    const hours = [];
    for (let H = 0; H < 24; H++) {
      const cells = targets.map((t, i) => {
        const min = ((Math.round((H - fromOff + offs[i]) * 60) % 1440) + 1440) % 1440;
        const hour = Math.floor(min / 60);
        return { city: t, min, hour, cls: classify(hour, state.context) };
      });
      const youCls = classify(H, state.context);
      const green = cells.filter(c => c.cls === "good").length + (youCls === "good" ? 1 : 0);
      const red = cells.filter(c => c.cls === "bad").length + (youCls === "bad" ? 1 : 0);
      hours.push({ H, youCls, cells, green, red });
    }
    let golden = null;
    for (const h of hours) {
      if (h.youCls === "bad") continue;
      if (!golden || h.green > golden.green || (h.green === golden.green && h.red < golden.red)) golden = h;
    }
    if (!golden) golden = hours.reduce((a, b) => (b.green > a.green || (b.green === a.green && b.red < a.red)) ? b : a, hours[0]);
    return { from, targets, hours, golden };
  }

  /* ---------- Render ---------- */
  function barRow(label, sub, cells, goldenH) {
    const html = cells.map((c, h) =>
      `<span class="btc-cell btc-${c.cls}${h === goldenH ? " is-golden" : ""}" data-col="${h}" title="${esc(label)} · ${esc(fmtMin(c.min))}"></span>`).join("");
    return `<div class="btc-row">
        <div class="btc-rowlabel"><span class="btc-rowcity">${esc(label)}</span>${sub ? `<span class="btc-rowsub">${esc(sub)}</span>` : ""}</div>
        <div class="btc-band" dir="ltr">${html}</div>
      </div>`;
  }

  function showColumn(col) {
    if (!lastData || col == null || isNaN(col)) return;
    document.querySelectorAll(".btc-cell.is-hovercol").forEach(c => c.classList.remove("is-hovercol"));
    document.querySelectorAll('.btc-cell[data-col="' + col + '"]').forEach(c => c.classList.add("is-hovercol"));
    const ro = document.getElementById("btcReadout"); if (!ro) return;
    const h = lastData.hours[col]; if (!h) return;
    const cities = h.cells.map(c => `<span class="btc-ro-item">${esc(cN(c.city))} <b class="btc-${c.cls}" dir="ltr">${esc(fmtMin(c.min))}</b></span>`).join('<span class="btc-ro-sep">·</span>');
    ro.innerHTML = `<span class="btc-ro-from">${esc(cN(lastData.from))} <b dir="ltr">${esc(fmtMin(h.H * 60))}</b></span><span class="btc-ro-eq">=</span>${cities}`;
  }

  function render() {
    const result = $("#btcResult"), actions = $("#btcActions");
    const data = compute();
    if (!data) { if (result) { result.hidden = false; result.innerHTML = `<p class="btc-empty muted">${esc(T.pickFirst)}</p>`; } if (actions) actions.hidden = true; return; }
    const { from, targets, hours, golden } = data;

    // Golden summary
    const allGood = golden.cells.every(c => c.cls === "good") && golden.youCls === "good";
    const anyBad = golden.cells.some(c => c.cls === "bad") || golden.youCls === "bad";
    const verdict = allGood ? T.everyone : (anyBad ? T.asleepAll : T.most);
    const cityTimes = golden.cells.map(c =>
      `<span class="btc-gt"><span class="btc-gt-city">${esc(cN(c.city))}</span><span class="btc-gt-time btc-${c.cls}" dir="ltr">${esc(fmtMin(c.min))}</span></span>`).join("");

    const goldenHtml = `<div class="btc-golden">
        <span class="btc-golden-eyebrow">${esc(T.goldenLabel)}</span>
        <div class="btc-golden-main"><strong class="btc-golden-time" dir="ltr">${esc(fmtMin(golden.H * 60))}</strong><span class="btc-golden-sub">${esc(T.yourTime)} · ${esc(verdict)}</span></div>
        <div class="btc-golden-cities">${cityTimes}</div>
      </div>`;

    // Bands: you + each target
    const youBand = barRow(`${cN(from)} · ${T.you}`, cC(from), hours.map(h => ({ cls: h.youCls, hour: h.H, min: h.H * 60 })), golden.H);
    const cityBands = targets.map((t, i) =>
      barRow(cN(t), cC(t), hours.map(h => ({ cls: h.cells[i].cls, hour: h.cells[i].hour, min: h.cells[i].min })), golden.H)).join("");

    // Hour ticks (your time) — positioned at the centre of each column
    const ticks = [0, 6, 12, 18].map(h => `<span class="btc-tick" style="inset-inline-start:${(((h + 0.5) / 24) * 100).toFixed(2)}%">${esc(fmtMin(h * 60))}</span>`).join("");
    const ticksRow = `<div class="btc-row btc-ticksrow"><span class="btc-rowlabel"></span><span class="btc-ticks" dir="ltr">${ticks}</span></div>`;

    const legend = `<div class="btc-legend">
        <span><i class="btc-dot btc-good"></i> ${esc(T.legendGood)}</span>
        <span><i class="btc-dot btc-ok"></i> ${esc(T.legendOk)}</span>
        <span><i class="btc-dot btc-bad"></i> ${esc(T.legendBad)}</span>
      </div>`;

    lastData = data; pinnedCol = null;
    result.hidden = false;
    result.innerHTML = goldenHtml + `<div id="btcReadout" class="btc-readout"></div><div class="btc-grid">${youBand}${cityBands}${ticksRow}</div>` + legend;
    showColumn(golden.H);
    if (actions) actions.hidden = false;
    updateUrl();
  }

  /* ---------- Chips ---------- */
  function renderChips() {
    const wrap = $("#btcChips"); if (!wrap) return;
    wrap.innerHTML = state.cities.map(slug => {
      const c = bySlug.get(slug); if (!c) return "";
      return `<li class="pl-chip"><span>${esc(cN(c))}</span><button type="button" class="pl-chip-x" data-rm="${esc(slug)}" aria-label="${esc(T.remove(cN(c)))}">&times;</button></li>`;
    }).join("");
  }
  function addCity(slug) {
    if (!slug || slug === state.from) return;
    if (state.cities.includes(slug)) return;
    if (state.cities.length >= MAX_CITIES) { toast(T.maxCities); return; }
    state.cities.push(slug); renderChips(); render();
  }
  function removeCity(slug) { state.cities = state.cities.filter(s => s !== slug); renderChips(); render(); }

  /* ---------- Autocomplete ---------- */
  function autocomplete(input, listEl, onChoose) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = q ? `<li class="ac-empty">${esc(T.noCity)}</li>` : ""; listEl.hidden = !q; return; }
      listEl.innerHTML = items.map((c, i) =>
        `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) { const c = items[i]; if (!c) return; onChoose(c); close(); }
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value) paint(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    document.addEventListener("click", e => { if (e.target !== input && !listEl.contains(e.target)) close(); });
  }

  /* ---------- Share ---------- */
  function updateUrl() {
    const p = new URLSearchParams();
    if (state.from) p.set("from", state.from);
    if (state.cities.length) p.set("cities", state.cities.join(","));
    p.set("context", state.context);
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

  function setFrom(c) {
    state.from = c.slug;
    const inp = $("#btcFrom"); if (inp) inp.value = cN(c) + ", " + cC(c);
    state.cities = state.cities.filter(s => s !== c.slug);
    renderChips();
  }
  function setContext(ctx) {
    if (!CONTEXTS[ctx]) return;
    state.context = ctx;
    document.querySelectorAll("[data-ctx]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ctx === ctx)));
    render();
  }

  function applyParams() {
    const p = new URLSearchParams(location.search);
    const fromC = findCity(p.get("from"));
    if (fromC) setFrom(fromC);
    const ctx = p.get("context"); if (ctx && CONTEXTS[ctx]) state.context = ctx;
    const cities = (p.get("cities") || "").split(",").map(s => s.trim()).filter(Boolean);
    cities.forEach(slug => { const c = bySlug.get(slug); if (c && c.slug !== state.from && !state.cities.includes(slug) && state.cities.length < MAX_CITIES) state.cities.push(slug); });
  }

  /* ---------- Boot ---------- */
  async function init() {
    const form = $("#btcForm"); if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { return; }

    autocomplete($("#btcFrom"), $("#btcFromAc"), c => setFrom(c));
    autocomplete($("#btcAdd"), $("#btcAddAc"), c => { addCity(c.slug); const a = $("#btcAdd"); if (a) a.value = ""; });

    $("#btcChips").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) removeCity(b.dataset.rm); });
    const res = $("#btcResult");
    if (res) {
      res.addEventListener("pointermove", e => { if (e.pointerType && e.pointerType !== "mouse") return; const cell = e.target.closest(".btc-cell[data-col]"); if (cell) { pinnedCol = null; showColumn(+cell.dataset.col); } });
      res.addEventListener("click", e => { const cell = e.target.closest(".btc-cell[data-col]"); if (cell) { pinnedCol = +cell.dataset.col; showColumn(pinnedCol); } });
      res.addEventListener("pointerleave", e => { if (e.pointerType && e.pointerType !== "mouse") return; if (pinnedCol == null && lastData && lastData.golden) showColumn(lastData.golden.H); });
    }
    document.querySelectorAll("[data-ctx]").forEach(b => b.addEventListener("click", () => setContext(b.dataset.ctx)));
    const sh = $("#btcShare"); if (sh) sh.addEventListener("click", copyShare);

    applyParams();
    if (!state.from) { const hs = guessHomeSlug(); const c = bySlug.get(hs); if (c) setFrom(c); }
    setContext(state.context);
    renderChips();
    render();
    if (location.search) { const r = $("#btcResult"); if (r) r.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
