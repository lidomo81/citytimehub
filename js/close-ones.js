/* =====================================================================
   CityTimeHub — js/close-ones.js
   Close Ones / أحبابك — personal connection windows tied to prayer
   times and fixed appointments in each person's city (yours too).
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[\u0623\u0625\u0622\u0627]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647")
    .replace(/[\u064b-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const uid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cC = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");

  const PKEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const PNAME = LANG === "ar"
    ? { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" }
    : { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" };

  const DOW = LANG === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const AFTER_WINDOW_MIN = 45;
  const STORAGE_KEY = "cth-close-ones";
  const MAX_PEOPLE = 6;
  const IS_APP = /CityTimeHubApp/i.test(navigator.userAgent) || /\bapp=1\b/.test(location.search);

  const T = LANG === "ar" ? {
    you: "مدينتك", youPh: "مثال: دبي",
    addPerson: "أضف شخصًا", personName: "الاسم", personNamePh: "مثال: أمي",
    personCity: "مدينته", personCityPh: "مثال: القاهرة",
    phone: "واتساب / هاتف (اختياري)", phonePh: "1012345678",
    phonePickCity: "اختر مدينته أولاً",
    dialHint: (country, dial) => `كود ${country} (${dial}) — اكتب الرقم من غير الصفر الأول`,
    save: "حفظ", remove: "إزالة",
    templates: "قوالب سريعة",
    tplAfterFajr: "بعد الفجر + ٣٠ د — اتصل",
    tplBeforeFajr: "قبل الفجر ١٥ د — نبّه للصلاة",
    tplAfterMaghrib: "بعد المغرب + ٢٠ د — اتصل",
    rules: "قواعد التواصل",
    addRule: "أضف قاعدة",
    ruleAfter: "بعد صلاة", ruleBefore: "قبل صلاة", ruleFixed: "موعد ثابت",
    offsetMin: "دقائق", fixedLabel: "التذكير", fixedLabelPh: "مثال: موعد الدكتور",
    fixedDay: "اليوم", fixedTime: "الوقت (بتوقيته)", remindBefore: "ذكّرني قبل",
    actionCall: "اتصال", actionNudge: "تنبيه",
    waMsg: "رسالة واتساب (اختياري)", waMsgPh: "مثال: صلّي الفجر يا أمي 🤍",
    activeNow: "النافذة الآن", upcoming: "القادم", emptySetup: "أضف شخصًا واختر قالبًا أو قاعدة.",
    inMin: n => `خلال ${n} د`, now: "الآن", open: "نافذة مفتوحة",
    endsIn: n => `تنتهي خلال ${n} د`,
    theirTime: "توقيته", yourTime: "توقيتك",
    call: "اتصال", whatsapp: "واتساب", done: "تمّ ✓",
    afterLine: (name, prayer, off) => `بعد ${PNAME[prayer]} بـ ${off} د — ${name}`,
    beforeLine: (name, prayer, off) => `قبل ${PNAME[prayer]} ${off} د — نبّه ${name}`,
    fixedLine: (name, label) => `${label} — ${name}`,
    errPrayer: "تعذّر تحميل المواقيت.",
    maxPeople: n => `الحد الأقصى ${n} أشخاص.`,
    saved: "تم الحفظ.", pickCity: "اختر المدينة.",
    share: "انسخ الرابط", linkCopied: "تم نسخ الرابط.",
    copyThis: "انسخ هذا الرابط:",
    noRules: "أضف قاعدة واحدة على الأقل.",
    at: "عند",
    waOpen: "فتح واتساب",
    waCopy: "نسخ الرقم",
    waCopied: "تم نسخ الرقم",
    waCopiedReady: "تم نسخ الرقم — افتح واتساب والصقه في محادثة جديدة",
    waSheetHint: "١) افتح واتساب  ٢) محادثة جديدة  ٣) الصق الرقم في البحث",
    close: "إغلاق",
  } : {
    you: "Your city", youPh: "e.g. Dubai",
    addPerson: "Add someone", personName: "Name", personNamePh: "e.g. Mom",
    personCity: "Their city", personCityPh: "e.g. Cairo",
    phone: "WhatsApp / phone (optional)", phonePh: "1012345678",
    phonePickCity: "Pick their city first",
    dialHint: (country, dial) => `${country} (${dial}) — enter the number without a leading 0`,
    save: "Save", remove: "Remove",
    templates: "Quick templates",
    tplAfterFajr: "After Fajr + 30 min — call",
    tplBeforeFajr: "15 min before Fajr — prayer nudge",
    tplAfterMaghrib: "After Maghrib + 20 min — call",
    rules: "Connection rules",
    addRule: "Add rule",
    ruleAfter: "After prayer", ruleBefore: "Before prayer", ruleFixed: "Fixed appointment",
    offsetMin: "minutes", fixedLabel: "Reminder", fixedLabelPh: "e.g. Doctor appointment",
    fixedDay: "Day", fixedTime: "Time (their clock)", remindBefore: "Remind me before",
    actionCall: "Call", actionNudge: "Nudge",
    waMsg: "WhatsApp message (optional)", waMsgPh: "e.g. Fajr time — love you 🤍",
    activeNow: "Window now", upcoming: "Coming up", emptySetup: "Add someone and pick a template or rule.",
    inMin: n => `in ${n} min`, now: "Now", open: "Window open",
    endsIn: n => `ends in ${n} min`,
    theirTime: "Their time", yourTime: "Your time",
    call: "Call", whatsapp: "WhatsApp", done: "Done ✓",
    afterLine: (name, prayer, off) => `${off} min after ${PNAME[prayer]} — ${name}`,
    beforeLine: (name, prayer, off) => `${off} min before ${PNAME[prayer]} — nudge ${name}`,
    fixedLine: (name, label) => `${label} — ${name}`,
    errPrayer: "Couldn't load prayer times.",
    maxPeople: n => `Up to ${n} people.`,
    saved: "Saved.", pickCity: "Pick a city.",
    share: "Copy link", linkCopied: "Link copied.",
    copyThis: "Copy this link:",
    noRules: "Add at least one rule.",
    at: "at",
    waOpen: "Open WhatsApp",
    waCopy: "Copy number",
    waCopied: "Number copied",
    waCopiedReady: "Number copied — open WhatsApp and paste it in a new chat",
    waSheetHint: "1) Open WhatsApp  2) New chat  3) Paste the number in search",
    close: "Close",
  };

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, weekday: "short", month: "short", day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  let CITIES = [];
  const bySlug = new Map();
  const state = { you: "", people: [] };
  let prayerCache = new Map();
  let tzCache = new Map();
  let tickTimer = null;
  let dashGen = 0;
  let dashTimer = null;

  function tzOffsetHours(tz) {
    if (!tz) return 0;
    if (tzCache.has(tz)) return tzCache.get(tz);
    let off = 0;
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date()).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (m) off = (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    } catch (e) {}
    tzCache.set(tz, off);
    return off;
  }

  function cityYmd(city, dayOff = 0) {
    const offH = tzOffsetHours(city.tz);
    const d = new Date(Date.now() + offH * 3600000 + dayOff * 86400000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay() };
  }

  function localToUtcMs(city, h, m, dayOff = 0) {
    const ymd = cityYmd(city, dayOff);
    const offH = tzOffsetHours(city.tz);
    return Date.UTC(ymd.y, ymd.m, ymd.day, h, m, 0) - offH * 3600000;
  }

  function fmtAt(ms, tz) {
    try { return timeFmt.format(new Date(ms)); }
    catch (e) { return timeFmt.format(new Date(ms)); }
  }

  function fmtFull(ms) {
    return hourFmt.format(new Date(ms));
  }

  function findCity(q) {
    if (!q) return null;
    const s = norm(q);
    if (bySlug.has(s)) return bySlug.get(s);
    const hit = CITIES.find(c => norm(c.name) === s || norm(`${c.name} ${c.country}`) === s
      || (LANG === "ar" && norm(`${c.name_ar || ""} ${c.country_ar || ""}`) === s));
    if (hit) return hit;
    const head = s.split(",")[0].trim();
    if (head && head !== s) {
      const h2 = CITIES.find(c => norm(c.name) === head || (c.name_ar && norm(c.name_ar) === head));
      if (h2) return h2;
    }
    return CITIES.find(c => c._s && c._s.startsWith(head || s)) || null;
  }

  function cityLabel(c) {
    return cN(c) + ", " + cC(c);
  }

  function guessHome() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const h = CITIES.find(c => c.tz === tz);
      if (h) return h.slug;
    } catch (e) {}
    return (CITIES.find(c => c.slug === "cairo") || CITIES[0] || {}).slug;
  }

  async function fetchPrayers(city) {
    const ymd = cityYmd(city);
    const key = `${city.slug}:${ymd.y}-${ymd.m + 1}-${ymd.day}`;
    if (prayerCache.has(key)) return prayerCache.get(key);
    const ds = `${String(ymd.day).padStart(2, "0")}-${String(ymd.m + 1).padStart(2, "0")}-${ymd.y}`;
    const url = `https://api.aladhan.com/v1/timings/${ds}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { cache: "default", signal: ctrl.signal });
      if (!res.ok) throw new Error("timings");
      const { data } = await res.json();
      const t = data.timings;
      const prayers = PKEYS.map(k => {
        const [h, m] = (t[k] || "0:0").split(" ")[0].split(":").map(Number);
        return { key: k, h, m };
      });
      prayerCache.set(key, prayers);
      return prayers;
    } finally {
      clearTimeout(timer);
    }
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") {
        state.you = raw.you || "";
        state.people = Array.isArray(raw.people) ? raw.people.slice(0, MAX_PEOPLE) : [];
      }
    } catch (e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    updateUrl();
  }

  function phoneDigits(p) {
    return (p || "").replace(/\D/g, "");
  }

  function dialDigits(city) {
    if (!city || !city.dial) return "";
    return phoneDigits(city.dial);
  }

  function displayPhone(person, city) {
    if (!person.phone) return "";
    const dialStr = person.dial || (city && city.dial) || "";
    const d = phoneDigits(dialStr);
    const full = phoneDigits(person.phone);
    if (d && full.startsWith(d)) return dialStr + " " + full.slice(d.length);
    return person.phone;
  }

  function buildFullPhone(city, raw) {
    const d = phoneDigits(raw);
    if (!d) return "";
    const dial = dialDigits(city);
    if (!dial) return d;
    if (d.startsWith(dial)) return d;
    let local = d;
    if (local.startsWith("0")) local = local.slice(1);
    return dial + local;
  }

  function updateDialUI(city) {
    const prefix = $("#coDialPrefix");
    const hint = $("#coDialHint");
    const phoneIn = $("#coPersonPhone");
    if (!prefix) return;
    if (city && city.dial) {
      prefix.textContent = city.dial;
      prefix.classList.add("has-dial");
      if (phoneIn) {
        phoneIn.placeholder = T.phonePh;
        phoneIn.readOnly = false;
        phoneIn.classList.remove("is-locked");
      }
      if (hint) {
        hint.hidden = false;
        hint.textContent = T.dialHint(cC(city), city.dial);
      }
    } else {
      prefix.textContent = "+—";
      prefix.classList.remove("has-dial");
      if (phoneIn) {
        phoneIn.placeholder = T.phonePickCity;
        phoneIn.readOnly = true;
        phoneIn.classList.add("is-locked");
      }
      if (hint) hint.hidden = true;
    }
  }

  function ruleLabel(person, rule) {
    const n = person.name || "";
    if (rule.type === "after") return T.afterLine(n, rule.prayer, rule.offsetMin);
    if (rule.type === "before") return T.beforeLine(n, rule.prayer, rule.offsetMin);
    return T.fixedLine(n, rule.label || "");
  }

  function computeRuleWindows(person, city, prayers, rule) {
    const out = [];
    const add = (start, end, kind) => {
      if (end <= start) return;
      out.push({ start, end, kind, rule, person, city, label: ruleLabel(person, rule) });
    };

    if (rule.type === "after" || rule.type === "before") {
      const pr = prayers.find(p => p.key === rule.prayer);
      if (!pr) return out;
      const pMs = localToUtcMs(city, pr.h, pr.m, 0);
      const off = (rule.offsetMin || 0) * 60000;
      if (rule.type === "after") {
        add(pMs + off, pMs + off + AFTER_WINDOW_MIN * 60000, "after");
        const pMsTomorrow = localToUtcMs(city, pr.h, pr.m, 1);
        add(pMsTomorrow + off, pMsTomorrow + off + AFTER_WINDOW_MIN * 60000, "after");
      } else {
        add(pMs - off, pMs, "before");
        const pMsTomorrow = localToUtcMs(city, pr.h, pr.m, 1);
        add(pMsTomorrow - off, pMsTomorrow, "before");
      }
    } else if (rule.type === "fixed") {
      const ymd = cityYmd(city);
      const rb = (rule.remindBeforeMin ?? 30) * 60000;
      for (let d = 0; d < 8; d++) {
        const y = cityYmd(city, d);
        if (y.dow !== (rule.dow ?? 0)) continue;
        const [hh, mm] = (rule.time || "10:00").split(":").map(Number);
        const end = localToUtcMs(city, hh, mm, d);
        add(end - rb, end, "fixed");
      }
    }
    return out;
  }

  async function allWindows() {
    const now = Date.now();
    const windows = [];
    for (const person of state.people) {
      const city = bySlug.get(person.city);
      if (!city || !person.rules || !person.rules.length) continue;
      let prayers;
      try { prayers = await fetchPrayers(city); }
      catch (e) { continue; }
      for (const rule of person.rules) {
        windows.push(...computeRuleWindows(person, city, prayers, rule));
      }
    }
    return windows.filter(w => w.end > now - 60000).sort((a, b) => a.start - b.start);
  }

  function activeWindow(windows) {
    const now = Date.now();
    return windows.find(w => w.start <= now && w.end > now) || null;
  }

  function upcomingWindows(windows, limit = 8) {
    const now = Date.now();
    return windows.filter(w => w.start > now).slice(0, limit);
  }

  function minsUntil(ms) {
    return Math.max(0, Math.ceil((ms - Date.now()) / 60000));
  }

  function waLink(person, rule) {
    const d = phoneDigits(person.phone);
    if (!d) return null;
    const msg = rule.waMsg || "";
    return "https://wa.me/" + d + (msg ? "?text=" + encodeURIComponent(msg) : "");
  }

  function telLink(person) {
    const d = phoneDigits(person.phone);
    return d ? "tel:+" + d : null;
  }

  function waMeUrl(phone, msg) {
    const p = phoneDigits(phone);
    return `https://wa.me/${p}` + (msg ? `?text=${encodeURIComponent(msg)}` : "");
  }

  function tryLaunchWhatsAppSchemes(phone, msg) {
    const p = phoneDigits(phone);
    const enc = msg ? encodeURIComponent(msg) : "";
    const https = waMeUrl(p, msg);
    const intent = `intent://send?phone=${p}${msg ? "&text=" + enc : ""}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(https)};end`;
    const a = document.createElement("a");
    a.href = intent;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    tryExternalUrl(`whatsapp://send?phone=${p}${msg ? "&text=" + enc : ""}`);
  }

  async function tryLaunchWhatsApp(phone, msg) {
    const p = phoneDigits(phone);
    if (!p) return false;
    try {
      if (window.AndroidApp && typeof AndroidApp.openWhatsApp === "function") {
        AndroidApp.openWhatsApp(p, msg || "");
        return true;
      }
    } catch (e) {}
    if (navigator.share) {
      try {
        await navigator.share({ title: T.whatsapp, text: msg || undefined, url: waMeUrl(p, msg) });
        return true;
      } catch (e) {
        if (e && e.name === "AbortError") return true;
      }
    }
    tryLaunchWhatsAppSchemes(p, msg);
    return false;
  }

  function tryExternalUrl(url) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "display:none;width:0;height:0;border:0";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 2500);
  }

  function copyPhone(phone, toastMsg) {
    const p = "+" + phoneDigits(phone);
    const done = () => { if (toastMsg !== false) toast(toastMsg || T.waCopied); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(p).then(done).catch(() => {
        window.prompt(T.waCopy, p);
      });
    } else {
      window.prompt(T.waCopy, p);
      done();
    }
  }

  function ensureWaSheet() {
    let sheet = $("#coWaSheet");
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.id = "coWaSheet";
    sheet.className = "co-wa-sheet";
    sheet.hidden = true;
    sheet.innerHTML = `<div class="co-wa-sheet-card" role="dialog" aria-modal="true" aria-labelledby="coWaSheetTitle">
      <button type="button" class="co-wa-sheet-close" aria-label="${esc(T.close)}">×</button>
      <h3 id="coWaSheetTitle">${esc(T.whatsapp)}</h3>
      <p class="co-wa-sheet-num" dir="ltr"></p>
      <p class="co-wa-sheet-hint muted">${esc(T.waSheetHint)}</p>
      <div class="co-wa-sheet-actions">
        <button type="button" class="btn co-wa-sheet-open">${esc(T.waOpen)}</button>
        <button type="button" class="btn-ghost co-wa-sheet-copy">${esc(T.waCopy)}</button>
      </div>
    </div>`;
    document.body.appendChild(sheet);
    const close = () => { sheet.hidden = true; };
    sheet.querySelector(".co-wa-sheet-close").addEventListener("click", close);
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".co-wa-sheet-open").addEventListener("click", () => {
      const p = sheet.dataset.phone || "";
      const m = sheet.dataset.msg || "";
      if (!p) return;
      tryLaunchWhatsApp(p, m);
    });
    sheet.querySelector(".co-wa-sheet-copy").addEventListener("click", () => copyPhone(sheet.dataset.phone || ""));
    return sheet;
  }

  function showWaSheet(phone, msg) {
    const sheet = ensureWaSheet();
    sheet.dataset.phone = phoneDigits(phone);
    sheet.dataset.msg = msg || "";
    sheet.querySelector(".co-wa-sheet-num").textContent = "+" + sheet.dataset.phone;
    sheet.hidden = false;
  }

  async function openWhatsApp(phone, msg) {
    const p = phoneDigits(phone);
    if (!p) return;
    copyPhone(p, false);
    toast(T.waCopiedReady);
    const opened = await tryLaunchWhatsApp(p, msg);
    if (!opened) showWaSheet(p, msg);
  }

  function openPhoneCall(phone) {
    const p = phoneDigits(phone);
    if (!p) return;
    tryExternalUrl(`tel:+${p}`);
  }

  function bindAppContactClicks() {
    if (!IS_APP || document.documentElement.dataset.coAppBound) return;
    document.documentElement.dataset.coAppBound = "1";
    document.addEventListener("click", e => {
      const wa = e.target.closest(".co-wa");
      if (wa && wa.dataset.phone) {
        e.preventDefault();
        e.stopPropagation();
        openWhatsApp(wa.dataset.phone, wa.dataset.waMsg || "");
        return;
      }
      const call = e.target.closest(".co-call");
      if (call && call.dataset.phone) {
        e.preventDefault();
        e.stopPropagation();
        openPhoneCall(call.dataset.phone);
      }
    }, true);
  }

  function renderContactActions(person, rule, extraClass) {
    const r = rule || { waMsg: "" };
    const d = phoneDigits(person.phone);
    if (!d) return "";
    const msg = r.waMsg || "";
    const cls = extraClass ? `co-actions ${extraClass}` : "co-actions";
    let html = `<div class="${cls}">`;
    if (IS_APP) {
      html += `<button type="button" class="btn-ghost co-wa" data-phone="${esc(d)}" data-wa-msg="${esc(msg)}">${esc(T.whatsapp)}</button>`;
      html += `<button type="button" class="btn-ghost co-call" data-phone="${esc(d)}">${esc(T.call)}</button>`;
    } else {
      const wa = waLink(person, r);
      const tel = telLink(person);
      if (wa) html += `<a class="btn-ghost co-wa" href="${esc(wa)}" target="_blank" rel="noopener">${esc(T.whatsapp)}</a>`;
      if (tel) html += `<a class="btn-ghost co-call" href="${esc(tel)}">${esc(T.call)}</a>`;
    }
    html += "</div>";
    return html;
  }

  function defaultRule(person) {
    return (person.rules || []).find(x => x.waMsg) || (person.rules || [])[0] || { waMsg: "" };
  }

  function renderActions(person, rule) {
    const contact = renderContactActions(person, rule);
    const done = `<button type="button" class="btn-ghost co-done">${esc(T.done)}</button>`;
    if (!contact) return `<div class="co-actions">${done}</div>`;
    return contact.replace("</div>", done + "</div>");
  }

  function scheduleDashboard() {
    clearTimeout(dashTimer);
    dashTimer = setTimeout(() => renderDashboard(), 120);
  }

  async function renderDashboard() {
    const dash = $("#coDash");
    if (!dash) return;
    const gen = ++dashGen;
    if (!state.people.length) {
      dash.innerHTML = `<p class="co-empty muted">${esc(T.emptySetup)}</p>`;
      return;
    }
    let windows;
    try { windows = await allWindows(); }
    catch (e) { if (gen === dashGen) dash.innerHTML = `<p class="co-empty">${esc(T.errPrayer)}</p>`; return; }
    if (gen !== dashGen) return;

    const active = activeWindow(windows);
    const upcoming = upcomingWindows(windows);
    let html = "";

    if (active) {
      const left = minsUntil(active.end);
      const theirStart = fmtAt(active.start, active.city.tz);
      const theirEnd = fmtAt(active.end, active.city.tz);
      const yourStart = fmtFull(active.start);
      html += `<div class="co-active">
        <span class="co-active-k">${esc(T.activeNow)}</span>
        <h3 class="co-active-title">${esc(active.label)}</h3>
        <p class="co-active-sub">${esc(T.open)} · ${esc(T.endsIn(left))}</p>
        <div class="co-times">
          <span><b>${esc(T.theirTime)}</b> ${esc(theirStart)} – ${esc(theirEnd)} · ${esc(cN(active.city))}</span>
          <span><b>${esc(T.yourTime)}</b> ${esc(yourStart)}</span>
        </div>
        ${renderActions(active.person, active.rule)}
      </div>`;
    }

    if (upcoming.length) {
      html += `<div class="co-upcoming"><span class="co-up-k">${esc(T.upcoming)}</span><ul class="co-up-list">`;
      for (const w of upcoming) {
        const inM = minsUntil(w.start);
        const when = inM <= 1 ? T.now : T.inMin(inM);
        html += `<li class="co-up-item">
          <span class="co-up-when">${esc(when)}</span>
          <span class="co-up-label">${esc(w.label)}</span>
          <span class="co-up-at muted">${esc(fmtAt(w.start, w.city.tz))} · ${esc(cN(w.city))}</span>
          ${renderContactActions(w.person, w.rule, "co-up-actions")}
        </li>`;
      }
      html += "</ul></div>";
    }

    if (!active && !upcoming.length) {
      html += `<p class="co-empty muted">${esc(T.noRules)}</p>`;
    }

    dash.innerHTML = html;
    dash.querySelectorAll(".co-done").forEach(btn => {
      btn.addEventListener("click", () => scheduleDashboard());
    });
  }

  function personCardHtml(person, idx) {
    const city = bySlug.get(person.city);
    const cityLabel = city ? cN(city) + ", " + cC(city) : person.city;
    const rulesHtml = (person.rules || []).map((r, ri) => {
      const typeSel = `<select class="co-rule-type" data-p="${idx}" data-r="${ri}">
        <option value="after"${r.type === "after" ? " selected" : ""}>${esc(T.ruleAfter)}</option>
        <option value="before"${r.type === "before" ? " selected" : ""}>${esc(T.ruleBefore)}</option>
        <option value="fixed"${r.type === "fixed" ? " selected" : ""}>${esc(T.ruleFixed)}</option>
      </select>`;
      const prayerSel = `<select class="co-rule-prayer" data-p="${idx}" data-r="${ri}">
        ${PKEYS.map(k => `<option value="${k}"${r.prayer === k ? " selected" : ""}>${esc(PNAME[k])}</option>`).join("")}
      </select>`;
      const offset = `<input type="number" class="co-rule-offset" min="5" max="120" step="5" value="${r.offsetMin ?? 30}" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.offsetMin)}" />`;
      const dowSel = `<select class="co-rule-dow" data-p="${idx}" data-r="${ri}">
        ${DOW.map((d, i) => `<option value="${i}"${(r.dow ?? 0) === i ? " selected" : ""}>${esc(d)}</option>`).join("")}
      </select>`;
      const timeIn = `<input type="time" class="co-rule-time" value="${esc(r.time || "10:00")}" data-p="${idx}" data-r="${ri}" />`;
      const labelIn = `<input type="text" class="co-rule-label" value="${esc(r.label || "")}" placeholder="${esc(T.fixedLabelPh)}" data-p="${idx}" data-r="${ri}" />`;
      const remind = `<input type="number" class="co-rule-remind" min="5" max="180" step="5" value="${r.remindBeforeMin ?? 30}" data-p="${idx}" data-r="${ri}" />`;
      const wa = `<input type="text" class="co-rule-wa" value="${esc(r.waMsg || "")}" placeholder="${esc(T.waMsgPh)}" data-p="${idx}" data-r="${ri}" />`;
      const detail = r.type === "fixed"
        ? `<div class="co-rule-detail">${labelIn} ${dowSel} ${timeIn} <label class="co-mini">${esc(T.remindBefore)}</label> ${remind} ${wa}</div>`
        : `<div class="co-rule-detail">${prayerSel} <label class="co-mini">${esc(T.offsetMin)}</label> ${offset} ${wa}</div>`;
      return `<div class="co-rule" data-p="${idx}" data-r="${ri}">
        ${typeSel} ${detail}
        <button type="button" class="co-rule-del" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.remove)}">×</button>
      </div>`;
    }).join("");

    return `<article class="co-person" data-idx="${idx}">
      <header class="co-person-head">
        <strong>${esc(person.name)}</strong>
        <span class="muted">${esc(cityLabel)}</span>
        <button type="button" class="co-person-del" data-idx="${idx}">${esc(T.remove)}</button>
      </header>
      ${person.phone ? `<p class="co-phone muted" dir="ltr">${esc(displayPhone(person, city))}</p>` : ""}
      ${renderContactActions(person, defaultRule(person), "co-person-actions")}
      <div class="co-templates">
        <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="afterFajr30">${esc(T.tplAfterFajr)}</button>
        <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="beforeFajr15">${esc(T.tplBeforeFajr)}</button>
        <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="afterMaghrib20">${esc(T.tplAfterMaghrib)}</button>
      </div>
      <div class="co-rules">${rulesHtml}</div>
      <button type="button" class="btn-ghost co-add-rule" data-idx="${idx}">+ ${esc(T.addRule)}</button>
    </article>`;
  }

  function renderPeople() {
    const box = $("#coPeople");
    if (!box) return;
    box.innerHTML = state.people.map((p, i) => personCardHtml(p, i)).join("");
  }

  function addPerson(data) {
    if (state.people.length >= MAX_PEOPLE) { toast(T.maxPeople(MAX_PEOPLE)); return; }
    const city = (data.citySlug && bySlug.get(data.citySlug)) || findCity(data.cityInput);
    if (!city) { toast(T.pickCity); return; }
    state.people.push({
      id: uid(),
      name: (data.name || "").trim() || (LANG === "ar" ? "أحبّني" : "Loved one"),
      city: city.slug,
      dial: city.dial || "",
      phone: buildFullPhone(city, data.phone || ""),
      rules: [{ id: uid(), type: "after", prayer: "Fajr", offsetMin: 30 }],
    });
    saveState();
    renderPeople();
    scheduleDashboard();
    toast(T.saved);
  }

  function applyTemplate(idx, tpl) {
    const p = state.people[idx];
    if (!p) return;
    const templates = {
      afterFajr30: { type: "after", prayer: "Fajr", offsetMin: 30 },
      beforeFajr15: { type: "before", prayer: "Fajr", offsetMin: 15, waMsg: LANG === "ar" ? "صلّي الفجر يا حبيبتي 🤍" : "Fajr time — love you 🤍" },
      afterMaghrib20: { type: "after", prayer: "Maghrib", offsetMin: 20 },
    };
    const t = templates[tpl];
    if (!t) return;
    if (p.rules.some(r => r.type === t.type && r.prayer === t.prayer && r.offsetMin === t.offsetMin)) return;
    p.rules.push({ id: uid(), ...t });
    saveState();
    renderPeople();
    scheduleDashboard();
  }

  function onRuleChange(el, fullRerender) {
    const p = state.people[+el.dataset.p];
    const r = p && p.rules[+el.dataset.r];
    if (!r) return;
    if (el.classList.contains("co-rule-type")) { r.type = el.value; fullRerender = true; }
    else if (el.classList.contains("co-rule-prayer")) r.prayer = el.value;
    else if (el.classList.contains("co-rule-offset")) r.offsetMin = +el.value;
    else if (el.classList.contains("co-rule-dow")) r.dow = +el.value;
    else if (el.classList.contains("co-rule-time")) r.time = el.value;
    else if (el.classList.contains("co-rule-label")) r.label = el.value;
    else if (el.classList.contains("co-rule-remind")) r.remindBeforeMin = +el.value;
    else return;
    saveState();
    if (fullRerender) renderPeople();
    scheduleDashboard();
  }

  function bindPeopleEvents() {
    const box = $("#coPeople");
    if (!box) return;
    box.addEventListener("click", e => {
      const delP = e.target.closest(".co-person-del");
      if (delP) {
        state.people.splice(+delP.dataset.idx, 1);
        saveState(); renderPeople(); scheduleDashboard(); return;
      }
      const tpl = e.target.closest(".co-tpl");
      if (tpl) { applyTemplate(+tpl.dataset.idx, tpl.dataset.tpl); return; }
      const addR = e.target.closest(".co-add-rule");
      if (addR) {
        const p = state.people[+addR.dataset.idx];
        if (p) { p.rules.push({ id: uid(), type: "after", prayer: "Fajr", offsetMin: 30 }); saveState(); renderPeople(); scheduleDashboard(); }
        return;
      }
      const delR = e.target.closest(".co-rule-del");
      if (delR) {
        const p = state.people[+delR.dataset.p];
        if (p) { p.rules.splice(+delR.dataset.r, 1); saveState(); renderPeople(); scheduleDashboard(); }
      }
    });
    box.addEventListener("change", e => {
      const el = e.target;
      if (!el.dataset.p && el.dataset.p !== "0") return;
      onRuleChange(el, el.classList.contains("co-rule-type"));
    });
    box.addEventListener("input", e => {
      const el = e.target;
      if (!el.classList.contains("co-rule-wa")) return;
      const p = state.people[+el.dataset.p];
      const r = p && p.rules[+el.dataset.r];
      if (r) { r.waMsg = el.value; saveState(); }
    });
  }

  function autocomplete(input, listEl, onChoose) {
    if (!input || !listEl) return;
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = q ? `<li class="ac-empty">—</li>` : ""; listEl.hidden = !q; return; }
      listEl.innerHTML = items.map((c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) {
      const c = items[i];
      if (!c) return;
      input.value = cityLabel(c);
      input.blur();
      onChoose(c);
      close();
    }
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value) paint(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") close();
    });
    listEl.addEventListener("pointerdown", e => {
      const li = e.target.closest(".ac-item[data-i]");
      if (!li) return;
      e.preventDefault();
      pick(+li.dataset.i);
    });
    input.addEventListener("blur", () => setTimeout(close, 160));
  }

  function updateUrl() {
    const p = new URLSearchParams();
    if (state.you) p.set("you", state.you);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p.toString() : ""));
  }

  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) { t = document.createElement("div"); t.id = "cthToast"; t.className = "cth-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("is-shown"), 2400);
  }

  function applyParams() {
    const p = new URLSearchParams(location.search);
    const y = findCity(p.get("you"));
    if (y) {
      state.you = y.slug;
      const i = $("#coYou"); if (i) i.value = cN(y) + ", " + cC(y);
    }
  }

  async function init() {
    const form = $("#coForm");
    if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { return; }

    loadState();
    applyParams();
    if (!state.you) {
      const c = bySlug.get(guessHome());
      if (c) { state.you = c.slug; const i = $("#coYou"); if (i) i.value = cN(c) + ", " + cC(c); }
    }

    autocomplete($("#coYou"), $("#coYouAc"), c => {
      state.you = c.slug;
      saveState();
    });

    let pendingPersonCity = "";
    autocomplete($("#coPersonCity"), $("#coPersonCityAc"), c => {
      pendingPersonCity = c.slug;
      requestAnimationFrame(() => updateDialUI(c));
    });

    const cityInp = $("#coPersonCity");
    if (cityInp) {
      cityInp.addEventListener("input", () => {
        const v = norm(cityInp.value);
        if (!v) { pendingPersonCity = ""; updateDialUI(null); return; }
        const hit = findCity(cityInp.value);
        if (hit && cityLabel(hit) === cityInp.value) {
          pendingPersonCity = hit.slug;
          updateDialUI(hit);
        } else {
          pendingPersonCity = "";
          updateDialUI(null);
        }
      });
    }
    updateDialUI(null);

    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#coPersonName").value;
      const phone = $("#coPersonPhone").value;
      const cityIn = $("#coPersonCity").value;
      const city = bySlug.get(pendingPersonCity) || findCity(cityIn);
      addPerson({ name, phone, citySlug: city ? city.slug : "", cityInput: cityIn });
      $("#coPersonName").value = "";
      $("#coPersonPhone").value = "";
      $("#coPersonCity").value = "";
      pendingPersonCity = "";
      updateDialUI(null);
    });

    bindPeopleEvents();
    bindAppContactClicks();
    renderPeople();
    await renderDashboard();

    clearInterval(tickTimer);
    tickTimer = setInterval(() => scheduleDashboard(), 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
