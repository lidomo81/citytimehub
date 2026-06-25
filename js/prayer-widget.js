/* =====================================================================
   CityTimeHub — js/prayer-widget.js
   Embeddable prayer-times widget (one city). Designed to run inside an
   <iframe> on any site. Reads ?city=&lang=&theme= from the URL, shows a
   compact analog clock with the five prayers marked, today's prayer
   schedule with the next prayer highlighted + a live countdown, and a
   "Powered by CityTimeHub" backlink. Prayer times via AlAdhan. Vanilla JS.
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const qs = new URLSearchParams(location.search);
  const CITY = (qs.get("city") || "cairo").toLowerCase();
  const LANG = (qs.get("lang") || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const THEME = ["light", "dark", "auto"].includes(qs.get("theme")) ? qs.get("theme") : "auto";

  // apply lang + theme to the document
  const root = document.documentElement;
  root.lang = LANG; root.dir = LANG === "ar" ? "rtl" : "ltr"; root.dataset.theme = THEME;

  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cC = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");

  const PKEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const PNAME = LANG === "ar"
    ? { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" }
    : { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" };
  const T = LANG === "ar"
    ? { next: "القادمة", inT: "بعد", err: "تعذّر تحميل المواقيت", by: "بواسطة", hr: "س", mn: "د", now: "الآن" }
    : { next: "Next", inT: "in", err: "Couldn't load prayer times", by: "Powered by", hr: "h", mn: "m", now: "now" };
  const SUN = LANG === "ar" ? "الشروق" : "Sunrise";

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtHM = (h, m) => hourFmt.format(new Date(2020, 0, 1, ((h % 24) + 24) % 24, m));

  let prayers = [], sunrise = null, offMs = 0, ni = 0, els = {};
  const R_MARK = 70;

  function tzOffsetHours(tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date()).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      return m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0)) : 0;
    } catch (e) { return 0; }
  }
  const nowMin = () => { const d = new Date(Date.now() + offMs); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  function nextIdx(min) { for (let i = 0; i < prayers.length; i++) if (prayers[i].min > min) return i; return 0; }
  function dur(mins) { const h = Math.floor(mins / 60), m = mins % 60; return (h ? h + T.hr + " " : "") + m + T.mn; }

  async function fetchPrayers(city) {
    const d = new Date();
    const ds = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${ds}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) throw new Error("timings");
    const { data } = await res.json();
    const t = data.timings;
    const mk = (k, name) => { const [h, m] = (t[k] || "0:0").split(" ")[0].split(":").map(Number); return { key: k, name, h, m, min: h * 60 + m, angle: ((h % 12) + m / 60) * 30 }; };
    return { list: PKEYS.map(k => mk(k, PNAME[k])), sun: mk("Sunrise", SUN) };
  }

  function clockSvg() {
    let ticks = "";
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180, r1 = 80, r2 = 88;
      ticks += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + r2 * Math.sin(a)).toFixed(1)}" y2="${(100 - r2 * Math.cos(a)).toFixed(1)}" stroke="var(--pw-border2)" stroke-width="${i % 3 === 0 ? 2.2 : 1}" stroke-linecap="round" opacity="${i % 3 === 0 ? .9 : .45}"/>`;
    }
    const dots = prayers.map((p, i) => {
      const a = p.angle * Math.PI / 180, x = (100 + R_MARK * Math.sin(a)).toFixed(1), y = (100 - R_MARK * Math.cos(a)).toFixed(1);
      return i === ni
        ? `<circle cx="${x}" cy="${y}" r="7.5" fill="none" stroke="var(--pw-accent2)" stroke-width="2" opacity=".5"/><circle cx="${x}" cy="${y}" r="4.4" fill="var(--pw-accent2)"/>`
        : `<circle cx="${x}" cy="${y}" r="2.6" fill="var(--pw-muted)"/>`;
    }).join("");
    let sunDot = "";
    if (sunrise) {
      const a = sunrise.angle * Math.PI / 180, x = (100 + R_MARK * Math.sin(a)).toFixed(1), y = (100 - R_MARK * Math.cos(a)).toFixed(1);
      sunDot = `<circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="var(--pw-sun)" stroke-width="1.8"/>`;
    }
    return `<svg viewBox="0 0 200 200" class="pw-svg" aria-hidden="true">
      <rect x="7" y="7" width="186" height="186" rx="30" fill="var(--pw-card)" stroke="var(--pw-border)" stroke-width="1.5"/>
      <rect x="15" y="15" width="170" height="170" rx="24" fill="var(--pw-card2, var(--pw-card))" stroke="var(--pw-border2)" stroke-width="1" opacity=".55"/>
      ${ticks}${dots}${sunDot}
      <polygon id="pw-h" points="100,45 104.5,99 100,114 95.5,99" fill="var(--pw-text)"/>
      <polygon id="pw-m" points="100,29 104,98 100,117 96,98" fill="var(--pw-text)"/>
      <line id="pw-s" x1="100" y1="116" x2="100" y2="27" stroke="var(--pw-accent2)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="5" fill="var(--pw-text)"/><circle cx="100" cy="100" r="2.1" fill="var(--pw-accent2)"/>
    </svg>`;
  }

  function render(city) {
    offMs = tzOffsetHours(city.tz) * 3600000;
    ni = nextIdx(nowMin());
    const rows = [];
    prayers.forEach((p, i) => {
      rows.push(`<li class="pw-row${i === ni ? " is-next" : ""}" data-pi="${i}"><span class="pw-pname">${esc(p.name)}</span><span class="pw-ptime" dir="ltr">${esc(fmtHM(p.h, p.m))}</span></li>`);
      if (i === 0 && sunrise) rows.push(`<li class="pw-row pw-row--sun"><span class="pw-pname"><span class="pw-sun-ico" aria-hidden="true">☀</span> ${esc(sunrise.name)}</span><span class="pw-ptime" dir="ltr">${esc(fmtHM(sunrise.h, sunrise.m))}</span></li>`);
    });
    $("#pw").innerHTML = `
      <div class="pw-card">
        <div class="pw-top">
          <div class="pw-place"><span class="pw-city">${esc(cN(city))}</span><span class="pw-country">${esc(cC(city))}</span></div>
          <span class="pw-clock" id="pw-now" dir="ltr">--:--</span>
        </div>
        <div class="pw-mid">
          <div class="pw-clockwrap">${clockSvg()}</div>
          <div class="pw-next">
            <span class="pw-next-k">${esc(T.next)}</span>
            <strong class="pw-next-name" id="pw-npn"></strong>
            <span class="pw-next-time" id="pw-npt" dir="ltr"></span>
            <span class="pw-count" id="pw-cnt"></span>
          </div>
        </div>
        <ul class="pw-list">${rows.join("")}</ul>
        <a class="pw-by" href="https://www.citytimehub.com/prayer-clock/?utm_source=widget" target="_blank" rel="noopener">${esc(T.by)} <strong>CityTimeHub</strong></a>
      </div>`;
    els = { h: $("#pw-h"), m: $("#pw-m"), s: $("#pw-s"), now: $("#pw-now"), npn: $("#pw-npn"), npt: $("#pw-npt"), cnt: $("#pw-cnt") };
    tickText();
    requestAnimationFrame(frame);
    setInterval(tickText, 1000);
  }

  function tickText() {
    if (!els.now) return;
    const d = new Date(Date.now() + offMs);
    els.now.textContent = fmtHM(d.getUTCHours(), d.getUTCMinutes());
    const min = nowMin(), idx = nextIdx(min);
    if (idx !== ni) { ni = idx; refreshDots(); rehighlightList(); }
    const p = prayers[ni];
    let delta = p.min - min; if (delta <= 0) delta += 1440;
    els.npn.textContent = p.name;
    els.npt.textContent = fmtHM(p.h, p.m);
    els.cnt.textContent = `· ${T.inT} ${dur(delta)}`;
  }
  function refreshDots() {
    const w = $("#pw .pw-clockwrap"); if (w) w.innerHTML = clockSvg();
    els.h = $("#pw-h"); els.m = $("#pw-m"); els.s = $("#pw-s");
  }
  function rehighlightList() {
    document.querySelectorAll("#pw .pw-row[data-pi]").forEach(li => li.classList.toggle("is-next", +li.dataset.pi === ni));
  }
  function frame() {
    if (!els.h) return;
    const d = new Date(Date.now() + offMs);
    const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds(), ms = d.getUTCMilliseconds();
    const secF = s + ms / 1000, minF = m + secF / 60, hF = (h % 12) + minF / 60;
    els.h.setAttribute("transform", `rotate(${(hF * 30).toFixed(2)} 100 100)`);
    els.m.setAttribute("transform", `rotate(${(minF * 6).toFixed(2)} 100 100)`);
    els.s.setAttribute("transform", `rotate(${(secF * 6).toFixed(2)} 100 100)`);
    requestAnimationFrame(frame);
  }

  async function init() {
    const host = $("#pw"); if (!host) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      const cities = (await res.json()).cities || [];
      const city = cities.find(c => c.slug === CITY) || cities.find(c => c.slug === "cairo") || cities[0];
      if (!city) throw new Error("no city");
      prayers = await fetchPrayers(city).then(r => { sunrise = r.sun; return r.list; });
      render(city);
    } catch (e) {
      host.innerHTML = `<div class="pw-card pw-err">${esc(T.err)} · <a href="https://www.citytimehub.com/prayer-clock/" target="_blank" rel="noopener">CityTimeHub</a></div>`;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
