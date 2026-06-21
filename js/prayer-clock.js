/* =====================================================================
   CityTimeHub — js/prayer-clock.js
   "Prayer Clock" — two live analog clocks side by side (you + family),
   each marked with the five daily prayers on its rim and the NEXT prayer
   highlighted, with a live countdown. Prayer times come from the AlAdhan
   API (same source already used across the site). Pure vanilla JS.
   Reads <html lang> for i18n.
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

  const PKEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const PNAME = LANG === "ar"
    ? { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" }
    : { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" };

  const T = LANG === "ar" ? {
    you: "مدينتك", family: "مدينة أهلك", youPh: "مثال: تورنتو", familyPh: "مثال: القاهرة",
    next: "الصلاة القادمة", inT: "بعد", err: "تعذّر تحميل مواقيت الصلاة. تحقّق من اتصالك.",
    share: "انسخ رابط المشاركة", linkCopied: "تم نسخ الرابط — يفتح بنفس الإعداد لأي شخص.", copyThis: "انسخ هذا الرابط:",
    loading: "جارٍ تحميل المواقيت…", pickBoth: "اختر مدينتك ومدينة أهلك لتبدأ.",
    aheadOf: (a, n) => `${a} تسبق ${n} بـ`, behindOf: (a, n) => `${a} تتأخّر عن ${n} بـ`, sameTz: "المدينتان في نفس التوقيت.",
    nowPraying: (city, p) => `🕌 الآن وقت ${p} عند ${city}.`, hour: "ساعة", min: "دقيقة", hr: "س", mn: "د",
  } : {
    you: "Your city", family: "Family's city", youPh: "e.g. Toronto", familyPh: "e.g. Cairo",
    next: "Next prayer", inT: "in", err: "Couldn't load prayer times. Check your connection.",
    share: "Copy share link", linkCopied: "Link copied — opens with the same setup for anyone.", copyThis: "Copy this link:",
    loading: "Loading prayer times…", pickBoth: "Pick your city and your family's city to begin.",
    aheadOf: (a, n) => `${a} is ahead of ${n} by`, behindOf: (a, n) => `${a} is behind ${n} by`, sameTz: "Both cities share the same time.",
    nowPraying: (city, p) => `🕌 It's ${p} time now in ${city}.`, hour: "hour", min: "min", hr: "h", mn: "m",
  };

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtHM = (h, m) => hourFmt.format(new Date(2020, 0, 1, ((h % 24) + 24) % 24, m));

  let CITIES = [];
  const bySlug = new Map();
  const state = { you: "", family: "" };
  const slots = {};            // role -> { city, prayers, offMs, els, raf }
  const RING_R = 88, R_MARK = 70;

  function tzOffsetHours(tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date()).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    } catch (e) { return 0; }
  }
  function nowMinInTz(offMs) {
    const d = new Date(Date.now() + offMs);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  function findCity(q) {
    if (!q) return null;
    const s = norm(q);
    return bySlug.get(s) || CITIES.find(c => norm(c.name) === s) || CITIES.find(c => c._s && c._s.startsWith(s)) || null;
  }
  function guessHome() {
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; const h = CITIES.find(c => c.tz === tz); if (h) return h.slug; } catch (e) {}
    return (CITIES.find(c => c.slug === "cairo") || CITIES[0] || {}).slug;
  }

  async function fetchPrayers(city) {
    const d = new Date();
    const ds = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${ds}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) throw new Error("timings " + res.status);
    const { data } = await res.json();
    const t = data.timings;
    return PKEYS.map(k => {
      const [h, m] = (t[k] || "0:0").split(" ")[0].split(":").map(Number);
      return { key: k, name: PNAME[k], h, m, min: h * 60 + m, angle: ((h % 12) + m / 60) * 30 };
    });
  }

  function nextIdx(prayers, nowMin) {
    for (let i = 0; i < prayers.length; i++) if (prayers[i].min > nowMin) return i;
    return 0; // after Isha → tomorrow's Fajr
  }

  function buildClockSvg(id, prayers, nIdx) {
    let ticks = "";
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180, r1 = 80, r2 = 87;
      ticks += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + r2 * Math.sin(a)).toFixed(1)}" y2="${(100 - r2 * Math.cos(a)).toFixed(1)}" stroke="var(--border-2)" stroke-width="${i % 3 === 0 ? 2.2 : 1}" stroke-linecap="round" opacity="${i % 3 === 0 ? .85 : .4}"/>`;
    }
    const dots = prayers.map((p, i) => {
      const a = p.angle * Math.PI / 180;
      const x = (100 + R_MARK * Math.sin(a)).toFixed(1), y = (100 - R_MARK * Math.cos(a)).toFixed(1);
      const isN = i === nIdx;
      return `<g><title>${esc(p.name)} · ${esc(fmtHM(p.h, p.m))}</title>` +
        (isN ? `<circle cx="${x}" cy="${y}" r="7.5" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".5"/><circle cx="${x}" cy="${y}" r="4.4" fill="var(--accent)"/>`
             : `<circle cx="${x}" cy="${y}" r="2.7" fill="var(--muted)"/>`) + `</g>`;
    }).join("");
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="pc-svg" aria-hidden="true">
      <circle cx="100" cy="100" r="95" fill="var(--bg-soft)" stroke="var(--border)" stroke-width="1"/>
      ${ticks}${dots}
      <line id="${id}-h" x1="100" y1="111" x2="100" y2="60" stroke="var(--text)" stroke-width="6" stroke-linecap="round"/>
      <line id="${id}-m" x1="100" y1="114" x2="100" y2="40" stroke="var(--text)" stroke-width="4" stroke-linecap="round"/>
      <line id="${id}-s" x1="100" y1="118" x2="100" y2="34" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="5" fill="var(--text)"/><circle cx="100" cy="100" r="2.1" fill="var(--accent)"/>
    </svg>`;
  }

  function dur(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return `${h}${T.hr} ${m}${T.mn}`;
    if (h) return `${h}${T.hr}`;
    return `${m}${T.mn}`;
  }

  function renderSlot(role, city, prayers) {
    const offMs = tzOffsetHours(city.tz) * 3600000;
    const nowMin = nowMinInTz(offMs);
    const ni = nextIdx(prayers, nowMin);
    const id = "pc-" + role;
    const html = `
      <div class="pc-clock">${buildClockSvg(id, prayers, ni)}</div>
      <div class="pc-info">
        <h3 class="pc-city">${esc(cN(city))}</h3>
        <p class="pc-now"><span class="pc-time" id="${id}-now" dir="ltr">--:--</span> <span class="pc-cc">${esc(cC(city))}</span></p>
        <p class="pc-next"><span class="pc-next-k">${esc(T.next)}</span> <strong id="${id}-np"></strong></p>
      </div>`;
    const host = $("#pcSlot-" + role);
    host.innerHTML = html;
    slots[role] = {
      city, prayers, offMs, ni,
      els: {
        h: $("#" + id + "-h"), m: $("#" + id + "-m"), s: $("#" + id + "-s"),
        now: $("#" + id + "-now"), np: $("#" + id + "-np"),
      },
    };
    updateSlotText(role);
  }

  function updateSlotText(role) {
    const sl = slots[role]; if (!sl) return;
    const nowMin = nowMinInTz(sl.offMs);
    const d = new Date(Date.now() + sl.offMs);
    sl.els.now.textContent = fmtHM(d.getUTCHours(), d.getUTCMinutes());
    const ni = nextIdx(sl.prayers, nowMin);
    if (ni !== sl.ni) { sl.ni = ni; refreshDots(role); }
    const p = sl.prayers[ni];
    let delta = p.min - nowMin; if (delta <= 0) delta += 1440;
    sl.els.np.innerHTML = `${esc(p.name)} · <span dir="ltr">${esc(fmtHM(p.h, p.m))}</span> · <span class="pc-count">${esc(T.inT)} ${esc(dur(delta))}</span>`;
  }

  function refreshDots(role) {
    const sl = slots[role]; if (!sl) return;
    const host = $("#pcSlot-" + role + " .pc-clock");
    if (host) host.innerHTML = buildClockSvg("pc-" + role, sl.prayers, sl.ni);
    const id = "pc-" + role;
    sl.els.h = $("#" + id + "-h"); sl.els.m = $("#" + id + "-m"); sl.els.s = $("#" + id + "-s");
  }

  function frame() {
    for (const role of Object.keys(slots)) {
      const sl = slots[role]; if (!sl || !sl.els.h) continue;
      const d = new Date(Date.now() + sl.offMs);
      const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds(), ms = d.getUTCMilliseconds();
      const secF = s + ms / 1000, minF = m + secF / 60, hF = (h % 12) + minF / 60;
      sl.els.h.setAttribute("transform", `rotate(${(hF * 30).toFixed(2)} 100 100)`);
      sl.els.m.setAttribute("transform", `rotate(${(minF * 6).toFixed(2)} 100 100)`);
      sl.els.s.setAttribute("transform", `rotate(${(secF * 6).toFixed(2)} 100 100)`);
    }
    requestAnimationFrame(frame);
  }

  function renderSync() {
    const el = $("#pcSync"); if (!el) return;
    const a = slots.you, b = slots.family;
    if (!a || !b) { el.textContent = ""; return; }
    const diff = Math.round((a.offMs - b.offMs) / 3600000 * 10) / 10;
    let line;
    if (diff === 0) line = T.sameTz;
    else if (diff > 0) line = `${T.aheadOf(cN(a.city), cN(b.city))} ${dur(Math.abs(diff) * 60)}.`;
    else line = `${T.behindOf(cN(a.city), cN(b.city))} ${dur(Math.abs(diff) * 60)}.`;
    // "now praying" note for family (within 12 min after a prayer start)
    const nowMin = nowMinInTz(b.offMs);
    let note = "";
    for (const p of b.prayers) { if (nowMin >= p.min && nowMin - p.min <= 12) { note = " " + T.nowPraying(cN(b.city), p.name); break; } }
    el.textContent = line + note;
  }

  /* ---------- flow ---------- */
  async function loadAndRender() {
    const you = bySlug.get(state.you), fam = bySlug.get(state.family);
    const wrap = $("#pcClocks");
    if (!you || !fam) { if (wrap) wrap.hidden = true; const a = $("#pcActions"); if (a) a.hidden = true; const sy = $("#pcSync"); if (sy) sy.textContent = T.pickBoth; return; }
    wrap.hidden = false;
    $("#pcSync").textContent = T.loading;
    try {
      const [py, pf] = await Promise.all([fetchPrayers(you), fetchPrayers(fam)]);
      renderSlot("you", you, py);
      renderSlot("family", fam, pf);
      renderSync();
      const a = $("#pcActions"); if (a) a.hidden = false;
      updateUrl();
    } catch (e) {
      $("#pcSync").textContent = T.err;
    }
  }

  /* ---------- autocomplete ---------- */
  function autocomplete(input, listEl, onChoose) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = q ? `<li class="ac-empty">—</li>` : ""; listEl.hidden = !q; return; }
      listEl.innerHTML = items.map((c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
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

  /* ---------- share ---------- */
  function updateUrl() {
    const p = new URLSearchParams();
    if (state.you) p.set("you", state.you);
    if (state.family) p.set("family", state.family);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p.toString() : ""));
  }
  function copyShare() {
    const url = location.href, done = () => toast(T.linkCopied);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(() => prompt(T.copyThis, url));
    else prompt(T.copyThis, url);
  }
  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) { t = document.createElement("div"); t.id = "cthToast"; t.className = "cth-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("is-shown"), 2400);
  }

  function setCity(role, c) {
    state[role] = c.slug;
    const inp = $(role === "you" ? "#pcYou" : "#pcFamily");
    if (inp) inp.value = cN(c) + ", " + cC(c);
    loadAndRender();
  }
  function applyParams() {
    const p = new URLSearchParams(location.search);
    const y = findCity(p.get("you")), f = findCity(p.get("family"));
    if (y) { state.you = y.slug; const i = $("#pcYou"); if (i) i.value = cN(y) + ", " + cC(y); }
    if (f) { state.family = f.slug; const i = $("#pcFamily"); if (i) i.value = cN(f) + ", " + cC(f); }
  }

  async function init() {
    const form = $("#pcForm"); if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { $("#pcSync").textContent = T.err; return; }

    autocomplete($("#pcYou"), $("#pcYouAc"), c => setCity("you", c));
    autocomplete($("#pcFamily"), $("#pcFamilyAc"), c => setCity("family", c));
    const sh = $("#pcShare"); if (sh) sh.addEventListener("click", copyShare);

    applyParams();
    if (!state.you) { const c = bySlug.get(guessHome()); if (c) { state.you = c.slug; $("#pcYou").value = cN(c) + ", " + cC(c); } }

    requestAnimationFrame(frame);
    setInterval(() => { for (const r of Object.keys(slots)) updateSlotText(r); renderSync(); }, 1000);
    loadAndRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
