/* =====================================================================
   CityTimeHub — js/compare-tool.js
   Interactive city-comparison tool for the /time-difference/ page.
   Two autocomplete inputs → instant inline comparison (computed locally
   with Intl, no API). Shareable URLs (?city1=&city2=), keyboard nav,
   same-city guard, validation, live clocks, and a Recent Comparisons
   list backed by localStorage. Pure vanilla, no dependencies.
   The pre-generated /time-difference/<pair> pages are untouched.
   ===================================================================== */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  let CITIES = [];
  const bySlug = new Map();
  let sel1 = null, sel2 = null;
  let tickTimer = null;

  /* ---------- normalization (Arabic-aware, matches the rest of the site) ---------- */
  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[\u0623\u0625\u0622\u0627]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647")
    .replace(/[\u064B-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();

  /* ---------- time helpers (mirror the static compare page) ---------- */
  function offsetHours(tz, when = new Date()) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(when).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    } catch (e) { return 0; }
  }
  const offsetLabel = off => {
    const s = off < 0 ? "\u2212" : "+", a = Math.abs(off), h = Math.floor(a), mm = Math.round((a - h) * 60);
    return "UTC" + s + h + (mm ? ":" + String(mm).padStart(2, "0") : "");
  };
  function dstInfo(tz) {
    const y = new Date().getUTCFullYear();
    const jan = offsetHours(tz, new Date(Date.UTC(y, 0, 15)));
    const jul = offsetHours(tz, new Date(Date.UTC(y, 6, 15)));
    return { observes: jan !== jul, jan, jul };
  }
  const hhmm = h => { let hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); };
  function hoursPhrase(x) {
    x = Math.abs(x); let h = Math.floor(x), m = Math.round((x - h) * 60); if (m === 60) { h++; m = 0; }
    if (h && m) return h + " hour" + (h > 1 ? "s" : "") + " " + m + " min";
    if (h) return h + " hour" + (h > 1 ? "s" : "");
    return m + " minutes";
  }
  const fmtTime = tz => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  function overlap(diff) {
    const s = Math.max(9, 9 + diff), e = Math.min(17, 17 + diff);
    if (e <= s) return { ok: false };
    return { ok: true, dur: e - s, startB: s, endB: e, startA: s - diff, endA: e - diff };
  }
  const esc = s => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const slugPair = (a, b) => [a.slug, b.slug].sort().join("-");

  /* ---------- recent comparisons (localStorage, last 5) ---------- */
  const LS = "cth-recent-compares";
  const getRecent = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { return []; } };
  function pushRecent(a, b) {
    const key = slugPair(a, b);
    let r = getRecent().filter(x => x.p !== key);
    r.unshift({ p: key, a: a.slug, b: b.slug, la: a.name, lb: b.name });
    r = r.slice(0, 5);
    try { localStorage.setItem(LS, JSON.stringify(r)); } catch (e) {}
    renderRecent();
  }
  function renderRecent() {
    const wrap = $("#recentWrap"), list = $("#recentList");
    if (!wrap || !list) return;
    const r = getRecent();
    if (!r.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    list.innerHTML = r.map(x =>
      `<li><button type="button" class="recent-chip" data-a="${esc(x.a)}" data-b="${esc(x.b)}">${esc(x.la)} \u2194 ${esc(x.lb)}</button></li>`).join("");
  }

  /* ---------- validation message ---------- */
  function showError(msg) { const el = $("#cmpError"); if (!el) return; el.textContent = msg; el.hidden = false; }
  function clearError() { const el = $("#cmpError"); if (el) el.hidden = true; }

  /* ---------- autocomplete ---------- */
  function setupAutocomplete(input, listEl, which) {
    let active = -1, matches = [];
    const setSel = c => { if (which === 1) sel1 = c; else sel2 = c; };
    const getOther = () => (which === 1 ? sel2 : sel1);
    function close() { listEl.hidden = true; active = -1; }
    function paint() {
      const q = norm(input.value);
      if (!q) { matches = []; close(); return; }
      const other = getOther();
      matches = CITIES.filter(c => (!other || c.slug !== other.slug) && c._s.indexOf(q) > -1).slice(0, 8);
      if (!matches.length) {
        listEl.innerHTML = `<li class="ac-empty">No city found</li>`;
        listEl.hidden = false; active = -1; return;
      }
      listEl.innerHTML = matches.map((c, i) =>
        `<li role="option" class="ac-item${i === active ? " is-active" : ""}" data-i="${i}"><span class="ac-name">${esc(c.name)}</span><span class="ac-country">${esc(c.country)}</span></li>`).join("");
      listEl.hidden = false;
    }
    function highlight(i) {
      const els = $$(".ac-item", listEl);
      els.forEach((el, idx) => el.classList.toggle("is-active", idx === i));
      if (els[i]) els[i].scrollIntoView({ block: "nearest" });
    }
    function choose(i) {
      const c = matches[i]; if (!c) return;
      setSel(c); input.value = c.name + ", " + c.country; input.dataset.slug = c.slug;
      close(); clearError(); maybeAutoCompare(which);
    }
    input.addEventListener("input", () => { input.dataset.slug = ""; setSel(null); active = -1; paint(); });
    input.addEventListener("focus", () => { if (input.value && !input.dataset.slug) paint(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (listEl.hidden) { paint(); return; } active = Math.min(active + 1, matches.length - 1); highlight(active); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); highlight(active); }
      else if (e.key === "Enter") { e.preventDefault(); if (!listEl.hidden && active > -1 && matches[active]) choose(active); else doCompare(); }
      else if (e.key === "Escape") { close(); }
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest(".ac-item"); if (li) choose(+li.dataset.i); });
    input.addEventListener("blur", () => setTimeout(close, 150));
  }

  /* ---------- comparison ---------- */
  function maybeAutoCompare(justChanged) {
    // When the second box gets a selection and the first is already set, compare immediately.
    if (sel1 && sel2 && sel1.slug !== sel2.slug) doCompare();
  }
  function doCompare() {
    if (!sel1 && !sel2) return showError("Please choose two cities to compare.");
    if (!sel1) return showError("Please choose a first city.");
    if (!sel2) return showError("Please choose a second city.");
    if (sel1.slug === sel2.slug) return showError("Please choose two different cities.");
    clearError();
    renderResult(sel1, sel2);
    pushRecent(sel1, sel2);
    updateUrl(sel1, sel2);
  }

  function renderResult(a, b) {
    const offA = offsetHours(a.tz), offB = offsetHours(b.tz), diff = Math.round((offB - offA) * 10) / 10;
    const dstA = dstInfo(a.tz), dstB = dstInfo(b.tz), ov = overlap(diff);
    const ahead = diff === 0
      ? `${esc(a.name)} and ${esc(b.name)} are in the same time zone`
      : (diff > 0 ? `${esc(b.name)} is ${hoursPhrase(diff)} ahead of ${esc(a.name)}`
                  : `${esc(a.name)} is ${hoursPhrase(diff)} ahead of ${esc(b.name)}`);
    const dstSentence = (!dstA.observes && !dstB.observes)
      ? `Neither city observes daylight saving time, so the difference stays the same all year.`
      : (dstA.observes && dstB.observes)
        ? ((dstB.jan - dstA.jan) !== (dstB.jul - dstA.jul)
            ? `Both cities observe daylight saving time on different schedules, so the difference changes at certain times of the year.`
            : `Both cities observe daylight saving time, so the current difference is usually maintained year-round.`)
        : `${esc(dstA.observes ? a.name : b.name)} observes daylight saving time while ${esc(dstA.observes ? b.name : a.name)} does not, so the difference shifts during part of the year.`;
    const overlapHtml = ov.ok
      ? `The best overlap for 09:00–17:00 working hours is <strong>${hhmm(ov.startB)}–${hhmm(ov.endB)} in ${esc(b.name)}</strong> (${hhmm(ov.startA)}–${hhmm(ov.endA)} in ${esc(a.name)}) — about ${hoursPhrase(ov.dur)} of shared time.`
      : `Standard 09:00–17:00 working hours do not overlap; one side would need an early or late meeting.`;
    const staticPair = slugPair(a, b);

    const el = $("#cmpResult");
    el.innerHTML = `
      <div class="cmp-head"><h2>${cap(ahead)}</h2><p class="muted">Live local times and working-hours overlap.</p></div>
      <div class="cmp-cards">
        <article class="cmp-card"><span class="cmp-city">${esc(a.name)}</span><span class="muted small">${esc(a.country)}</span><strong class="cmp-clock" id="ctA" dir="ltr">${fmtTime(a.tz)}</strong><span class="cmp-zone mono">${esc(a.tz)} · ${offsetLabel(offA)}</span></article>
        <div class="cmp-diff"><span class="cmp-diff-val">${diff === 0 ? "0h" : (diff > 0 ? "+" : "\u2212") + hoursPhrase(diff).replace(/ hours?/, "h").replace(/ min/, "m")}</span><span class="muted small">difference</span></div>
        <article class="cmp-card"><span class="cmp-city">${esc(b.name)}</span><span class="muted small">${esc(b.country)}</span><strong class="cmp-clock" id="ctB" dir="ltr">${fmtTime(b.tz)}</strong><span class="cmp-zone mono">${esc(b.tz)} · ${offsetLabel(offB)}</span></article>
      </div>
      <div class="cmp-facts">
        <p><strong>Working hours overlap.</strong> ${overlapHtml}</p>
        <p><strong>Daylight saving.</strong> ${dstSentence}</p>
      </div>
      <p class="cmp-permalink"><a href="/time-difference/${esc(staticPair)}">Open the full ${esc(a.name)} ↔ ${esc(b.name)} page →</a></p>`;
    el.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const ca = $("#ctA"), cb = $("#ctB");
      if (!ca || !cb) { clearInterval(tickTimer); return; }
      ca.textContent = fmtTime(a.tz); cb.textContent = fmtTime(b.tz);
    }, 1000);
  }

  /* ---------- URL (shareable + deep link) ---------- */
  function updateUrl(a, b) {
    const u = new URL(location.href);
    u.searchParams.set("city1", a.slug); u.searchParams.set("city2", b.slug);
    history.replaceState(null, "", u);
  }
  const findCity = key => {
    if (!key) return null;
    const k = key.toString();
    return bySlug.get(k) || bySlug.get(norm(k).replace(/ /g, "-")) ||
      CITIES.find(c => norm(c.name) === norm(k)) || null;
  };
  function applyCity(input, which, c) {
    if (!c) return;
    if (which === 1) sel1 = c; else sel2 = c;
    input.value = c.name + ", " + c.country; input.dataset.slug = c.slug;
  }

  /* ---------- boot ---------- */
  async function init() {
    const form = $("#compareForm"); if (!form) return;
    const in1 = $("#city1"), in2 = $("#city2"), btn = $("#compareBtn");
    btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Loading…";

    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      const data = await res.json();
      CITIES = (data.cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) {
      showError("Could not load the city list. Please refresh and try again.");
      btn.textContent = btn.dataset.label; return;
    }
    btn.disabled = false; btn.textContent = btn.dataset.label;

    setupAutocomplete(in1, $("#ac1"), 1);
    setupAutocomplete(in2, $("#ac2"), 2);
    btn.addEventListener("click", doCompare);

    const swap = $("#swapBtn");
    if (swap) swap.addEventListener("click", () => {
      const t = sel1; sel1 = sel2; sel2 = t;
      const v1 = in1.value, s1 = in1.dataset.slug;
      in1.value = in2.value; in1.dataset.slug = in2.dataset.slug;
      in2.value = v1; in2.dataset.slug = s1;
      if (sel1 && sel2) doCompare();
    });

    const list = $("#recentList");
    if (list) list.addEventListener("click", e => {
      const chip = e.target.closest(".recent-chip"); if (!chip) return;
      const a = bySlug.get(chip.dataset.a), b = bySlug.get(chip.dataset.b);
      if (a && b) { applyCity(in1, 1, a); applyCity(in2, 2, b); doCompare(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
    renderRecent();

    // deep link: /time-difference/?city1=cairo&city2=london
    const params = new URLSearchParams(location.search);
    const c1 = findCity(params.get("city1")), c2 = findCity(params.get("city2"));
    if (c1) applyCity(in1, 1, c1);
    if (c2) applyCity(in2, 2, c2);
    if (c1 && c2 && c1.slug !== c2.slug) doCompare();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
