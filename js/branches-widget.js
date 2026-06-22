/* =====================================================================
   CityTimeHub — js/branches-widget.js
   Embeddable "Our Branches" widget. A company lists its offices/branches
   in different cities; visitors see — in one analog-clock circle — which
   branch is OPEN right now and its local time. Reads ?data=&lang=&theme=
   &company= from the URL. Each branch is its own small analog clock.
   Prayer-free, pure time math (no API). Vanilla JS.
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const qs = new URLSearchParams(location.search);
  const LANG = (qs.get("lang") || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const THEME = ["light", "dark", "auto"].includes(qs.get("theme")) ? qs.get("theme") : "auto";
  const COMPANY = qs.get("company") || "";

  const root = document.documentElement;
  root.lang = LANG; root.dir = LANG === "ar" ? "rtl" : "ltr"; root.dataset.theme = THEME;

  const T = LANG === "ar"
    ? { open: "مفتوح", closed: "مقفول", closesAt: "بيقفل", opensAt: "بيفتح", today: "اليوم", tomorrow: "بكرة",
        openNow: n => `${n} مفتوح الآن`, none: "مفيش فروع", by: "بواسطة", err: "تعذّر تحميل الفروع" }
    : { open: "Open", closed: "Closed", closesAt: "closes", opensAt: "opens", today: "today", tomorrow: "tomorrow",
        openNow: n => `${n} open now`, none: "No branches yet", by: "Powered by", err: "Couldn't load branches" };
  const DAYS = LANG === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtMin = m => hourFmt.format(new Date(2020, 0, 1, Math.floor(((m % 1440) + 1440) % 1440 / 60), ((m % 60) + 60) % 60));

  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");

  let BR = [];   // [{name, city, tz, offMs, o, cl, d:[...]}]

  function tzOffsetHours(tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date()).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      return m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0)) : 0;
    } catch (e) { return 0; }
  }
  const localParts = offMs => { const d = new Date(Date.now() + offMs); return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), h: d.getUTCHours(), m: d.getUTCMinutes() }; };

  /* open / closed status in the branch's own local time */
  function status(b, p) {
    const works = d => b.d.includes(d);
    if (works(p.day) && p.min >= b.o && p.min < b.cl) {
      return { open: true, closeMin: b.cl, delta: b.cl - p.min };
    }
    if (works(p.day) && p.min < b.o) return { open: false, openMin: b.o, when: T.today, dayIdx: p.day, delta: b.o - p.min };
    for (let i = 1; i <= 7; i++) {
      const d = (p.day + i) % 7;
      if (works(d)) {
        const when = i === 1 ? T.tomorrow : DAYS[d];
        return { open: false, openMin: b.o, when, dayIdx: d, delta: i * 1440 - p.min + b.o };
      }
    }
    return { open: false, never: true };
  }

  function durTxt(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    if (LANG === "ar") return (h ? `${h} س ` : "") + (m ? `${m} د` : (h ? "" : "0 د"));
    return (h ? `${h}h ` : "") + (m ? `${m}m` : (h ? "" : "0m"));
  }

  const PHONE_SVG = `<svg class="bw-tel-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;

  function render() {
    const host = $("#bw"); if (!host) return;
    if (!BR.length) { host.innerHTML = `<div class="bw-card bw-empty">${esc(T.none)}</div>`; return; }

    const states = BR.map(b => { const p = localParts(b.offMs); return { b, p, st: status(b, p) }; });
    const openCount = states.filter(s => s.st.open).length;

    const cards = states.slice().sort((a, x) => (x.st.open ? 1 : 0) - (a.st.open ? 1 : 0)).map(({ b, p, st }) => {
      const sub = st.open
        ? `${T.open} · ${T.closesAt} ${fmtMin(st.closeMin)}`
        : st.never ? T.closed : `${T.closed} · ${T.opensAt} ${st.when} ${fmtMin(st.openMin)}`;
      const cls = st.open ? "is-open" : "is-closed";
      const tel = b.t ? `<a class="bw-tel" href="tel:${esc(b.t.replace(/[^\d+]/g, ""))}">${PHONE_SVG}<span dir="ltr">${esc(b.t)}</span></a>` : "";
      return `<div class="bw-row ${cls}"><span class="bw-dot"></span><div class="bw-info"><span class="bw-name">${esc(b.name)}</span><span class="bw-city">${esc(cN(b.city))}</span>${tel}</div><div class="bw-right"><span class="bw-time" dir="ltr">${esc(fmtMin(p.min))}</span><span class="bw-status">${esc(sub)}</span></div></div>`;
    }).join("");

    const countTxt = LANG === "ar" ? `${openCount} مفتوح الآن` : `${openCount} open now`;
    host.innerHTML = `<div class="bw-card">
      <div class="bw-top">${COMPANY ? `<span class="bw-company">${esc(COMPANY)}</span>` : `<span></span>`}<span class="bw-count"><span class="bw-count-dot"></span>${esc(countTxt)}</span></div>
      <div class="bw-list">${cards}</div>
      <a class="bw-by" href="https://www.citytimehub.com/our-branches/?utm_source=widget" target="_blank" rel="noopener">${esc(T.by)} <strong>CityTimeHub</strong></a>
    </div>`;
    clearInterval(window.__bwT); window.__bwT = setInterval(render, 30000);
  }

  function parseData(cities) {
    const bySlug = new Map(cities.map(c => [c.slug, c]));
    let raw = [];
    try { raw = JSON.parse(qs.get("data") || "[]"); } catch (e) { raw = []; }
    BR = raw.slice(0, 12).map(r => {
      const city = bySlug.get(r.c);
      if (!city) return null;
      return { name: r.n || cN(city), city, tz: city.tz, offMs: tzOffsetHours(city.tz) * 3600000, o: r.o | 0, cl: r.cl | 0, d: Array.isArray(r.d) ? r.d : [0, 1, 2, 3, 4], t: (r.t || "").toString().slice(0, 28) };
    }).filter(Boolean);
  }

  async function init() {
    const host = $("#bw"); if (!host) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      const cities = (await res.json()).cities || [];
      parseData(cities);
      render();
    } catch (e) { host.innerHTML = `<div class="bw-card bw-empty">${esc(T.err)}</div>`; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.__bwStatus = status;  // exposed for tests
})();
