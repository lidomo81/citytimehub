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

  /* small analog clock for one branch (relative 0..0, caller translates) */
  function miniClock(p, open) {
    const R = 30, col = open ? "var(--bw-open)" : "var(--bw-muted)";
    let ticks = "";
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180, r1 = i % 3 === 0 ? 22 : 25, r2 = 28;
      ticks += `<line x1="${(r1 * Math.sin(a)).toFixed(1)}" y1="${(-r1 * Math.cos(a)).toFixed(1)}" x2="${(r2 * Math.sin(a)).toFixed(1)}" y2="${(-r2 * Math.cos(a)).toFixed(1)}" stroke="var(--bw-border2)" stroke-width="${i % 3 === 0 ? 1.6 : 0.8}"/>`;
    }
    const hF = (p.h % 12) + p.m / 60, mF = p.m;
    const hx = 14 * Math.sin(hF * 30 * Math.PI / 180), hy = -14 * Math.cos(hF * 30 * Math.PI / 180);
    const mx = 21 * Math.sin(mF * 6 * Math.PI / 180), my = -21 * Math.cos(mF * 6 * Math.PI / 180);
    return `<circle r="${R}" fill="var(--bw-face)" stroke="${col}" stroke-width="2.4"/>${ticks}` +
      `<line class="bw-hh" x1="0" y1="0" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="var(--bw-text)" stroke-width="3" stroke-linecap="round"/>` +
      `<line class="bw-mh" x1="0" y1="0" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="var(--bw-text)" stroke-width="2" stroke-linecap="round"/>` +
      `<circle r="2.2" fill="${col}"/>`;
  }

  function durTxt(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    if (LANG === "ar") return (h ? `${h} س ` : "") + (m ? `${m} د` : (h ? "" : "0 د"));
    return (h ? `${h}h ` : "") + (m ? `${m}m` : (h ? "" : "0m"));
  }

  function render() {
    const host = $("#bw"); if (!host) return;
    if (!BR.length) { host.innerHTML = `<div class="bw-card bw-empty">${esc(T.none)}</div>`; return; }

    const N = BR.length, cx = 340, cy = 215, R = N <= 1 ? 0 : Math.min(150, 70 + N * 9);
    let nodes = "", openCount = 0;
    BR.forEach((b, i) => {
      const p = localParts(b.offMs), st = status(b, p);
      if (st.open) openCount++;
      const ang = (i / N) * 2 * Math.PI;
      const x = cx + R * Math.sin(ang), y = cy - R * Math.cos(ang);
      nodes += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" data-i="${i}">${miniClock(p, st.open)}` +
        `<text x="0" y="46" text-anchor="middle" class="bw-t" font-size="12" font-weight="500">${esc(cN(b.city) || b.name)}</text>` +
        `<text x="0" y="60" text-anchor="middle" class="bw-ts" font-size="11">${esc(fmtMin(p.min))}</text></g>`;
    });
    const center = `<g transform="translate(${cx} ${cy})"><circle r="52" fill="var(--bw-face)" stroke="var(--bw-border)" stroke-width="1"/>` +
      `<text x="0" y="-4" text-anchor="middle" class="bw-th" font-size="22" font-weight="500">${openCount}</text>` +
      `<text x="0" y="16" text-anchor="middle" class="bw-ts" font-size="11">${esc(LANG === "ar" ? "مفتوح الآن" : "open now")}</text></g>`;

    const cards = BR.map((b, i) => {
      const p = localParts(b.offMs), st = status(b, p);
      return { b, p, st };
    }).sort((a, x) => (x.st.open ? 1 : 0) - (a.st.open ? 1 : 0)).map(({ b, p, st }) => {
      const sub = st.open
        ? `${T.open} · ${T.closesAt} ${fmtMin(st.closeMin)}`
        : st.never ? T.closed : `${T.closed} · ${T.opensAt} ${st.when} ${fmtMin(st.openMin)}`;
      const cls = st.open ? "is-open" : "is-closed";
      return `<div class="bw-row ${cls}"><span class="bw-dot"></span><div class="bw-info"><span class="bw-name">${esc(b.name)}</span><span class="bw-city">${esc(cN(b.city))}</span></div><div class="bw-right"><span class="bw-time">${esc(fmtMin(p.min))}</span><span class="bw-status">${esc(sub)}</span></div></div>`;
    }).join("");

    host.innerHTML = `<div class="bw-card">
      ${COMPANY ? `<div class="bw-head">${esc(COMPANY)}</div>` : ""}
      <svg viewBox="0 0 680 470" class="bw-svg" aria-hidden="true">${center}${nodes}</svg>
      <div class="bw-list">${cards}</div>
      <a class="bw-by" href="https://www.citytimehub.com/our-branches/?utm_source=widget" target="_blank" rel="noopener">${esc(T.by)} <strong>CityTimeHub</strong></a>
    </div>`;
    animate();
  }

  function animate() {
    const tick = () => {
      $("#bw") && document.querySelectorAll("#bw svg g[data-i]").forEach(g => {
        const b = BR[+g.dataset.i]; if (!b) return;
        const p = localParts(b.offMs);
        const hF = (p.h % 12) + p.m / 60;
        const hh = g.querySelector(".bw-hh"), mh = g.querySelector(".bw-mh");
        if (hh) { const x = 14 * Math.sin(hF * 30 * Math.PI / 180), y = -14 * Math.cos(hF * 30 * Math.PI / 180); hh.setAttribute("x2", x.toFixed(1)); hh.setAttribute("y2", y.toFixed(1)); }
        if (mh) { const x = 21 * Math.sin(p.m * 6 * Math.PI / 180), y = -21 * Math.cos(p.m * 6 * Math.PI / 180); mh.setAttribute("x2", x.toFixed(1)); mh.setAttribute("y2", y.toFixed(1)); }
      });
    };
    clearInterval(window.__bwT); window.__bwT = setInterval(tick, 30000);
  }

  function parseData(cities) {
    const bySlug = new Map(cities.map(c => [c.slug, c]));
    let raw = [];
    try { raw = JSON.parse(qs.get("data") || "[]"); } catch (e) { raw = []; }
    BR = raw.slice(0, 12).map(r => {
      const city = bySlug.get(r.c);
      if (!city) return null;
      return { name: r.n || cN(city), city, tz: city.tz, offMs: tzOffsetHours(city.tz) * 3600000, o: r.o | 0, cl: r.cl | 0, d: Array.isArray(r.d) ? r.d : [0, 1, 2, 3, 4] };
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
