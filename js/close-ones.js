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
  const DASH_HORIZON_DAYS = 1;
  const EXPORT_HORIZON_DAYS = 6;
  const CO_PAGE = LANG === "ar" ? "/ar/close-ones/" : "/close-ones/";
  const DEFAULT_OFFSET_AFTER = 30;
  const DEFAULT_OFFSET_BEFORE = 15;
  const DEFAULT_REMIND_BEFORE = 30;
  const PRAYER_OFFSET_MIN = 5;
  const PRAYER_OFFSET_MAX = 120;
  const REMIND_MIN = 0;
  const REMIND_MAX = 180;
  const STORAGE_KEY = "cth-close-ones";
  const DISMISS_KEY = "cth-co-dismissed";
  const MAX_PEOPLE = 6;
  function detectAppMode() {
    if (/CityTimeHubApp/i.test(navigator.userAgent || "")) return true;
    if (/\bapp=1\b/.test(location.search)) return true;
    if (document.documentElement.classList.contains("app-mode")) return true;
    if (window.AndroidApp) return true;
    try { return sessionStorage.getItem("cth-app") === "1"; } catch (e) { return false; }
  }
  const IS_APP = (() => {
    const v = detectAppMode();
    if (v) { try { sessionStorage.setItem("cth-app", "1"); } catch (e) {} }
    return v;
  })();
  // Android WebView cannot safely navigate to tel:/wa.me/intent — use buttons + sheet only.
  const SAFE_CONTACT = IS_APP || /Android/i.test(navigator.userAgent || "");

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
    remindHint: "٠ = عند الموعد",
    actionCall: "اتصال", actionNudge: "تنبيه",
    waMsg: "رسالة واتساب (اختياري)", waMsgPh: "مثال: صلّي الفجر يا أمي 🤍",
    activeNow: "النافذة الآن", upcoming: "القادم", emptySetup: "أضف شخصًا واختر قالبًا أو قاعدة.",
    inMin: n => `خلال ${n} د`, now: "الآن", open: "نافذة مفتوحة",
    endsIn: n => `تنتهي خلال ${n} د`,
    theirTime: "توقيته", yourTime: "توقيتك",
    call: "اتصال", whatsapp: "واتساب", done: "تمّ ✓",
    doneAck: "تمّ — ننتقل للنافذة التالية",
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
    callOpen: "فتح الهاتف",
    callCopiedReady: "تم نسخ الرقم — افتح تطبيق الهاتف والصقه للاتصال",
    callSheetHint: "١) افتح تطبيق الهاتف  ٢) الصق الرقم  ٣) اضغط اتصال",
    notifyTitle: "تذكيرات أحبابك",
    notifySub: "نبّهني قبل كل نافذة اتصال",
    notifySoon: "قريبًا",
    notifySoonToast: "التذكيرات ستُفعّل مع تحديث التطبيق — ترقّب الإصدار القادم.",
    notifyEnabled: "تم تفعيل تذكيرات أحبابك.",
    notifyDisabled: "تم إيقاف تذكيرات أحبابك.",
    webHint: "خطّط هنا على الموقع — جدول اليوم وتصدير التقويم. التذكير التلقائي في تطبيق CityTimeHub.",
    notifySubWeb: "جدول اليوم والتقويم هنا — التذكير التلقائي في التطبيق",
    todayTitle: "جدول اليوم",
    tomorrowTitle: "غدًا",
    emptyToday: "لا نوافذ اليوم — راجع القادم أدناه",
    exportCal: "أضف للتقويم",
    exportCalHint: "تنزيل ملف .ics لـ Google Calendar أو Apple Calendar",
    icsDone: "تم تنزيل ملف التقويم",
    homeNext: (when, label) => `القادم ${when} — ${label}`,
    homeOpen: "أحبابك",
    homeSetupNext: "اضبط مواعيد التواصل مع من تحبّ",
    tabToday: "اليوم",
    tabPeople: "أحبابي",
    leadToday: "متى تتصل أو تنبّه — من القواعد التي حفظتها لكل شخص.",
    leadPeople: "من تحبّهم وقواعد التواصل — اضغط الاسم لتعديل القواعد.",
    youHint: "أوقات تبويب «اليوم» تُعرض بتوقيتك أنت",
    heroOpen: "مفتوحة الآن — حان وقت التحرّك",
    heroNext: "أقرب نافذة قادمة",
    heroEmpty: "لا نافذة الآن",
    heroEmptySub: "أضف شخصًا وقاعدة، أو راجع الجدول إن وُجد.",
    heroFromRules: "من قواعد",
    scheduleLead: "باقي اليوم وغدًا — محسوب من قواعد كل شخص",
    scheduleEmpty: "لا مواعيد اليوم أو غدًا — القواعد تحدّد النوافذ تلقائيًا.",
    laterTitle: "لاحقًا هذا الأسبوع",
    rulesCount: n => `${n} قاعدة`,
    rulesCountMany: n => `${n} قواعد`,
    expandRules: "عرض القواعد",
    collapseRules: "إخفاء القواعد",
    addSheetTitle: "أضف شخصًا",
    addSheetLead: "الاسم ومدينته ورقم اختياري — ثم اختر القواعد من تبويب أحبابي.",
    emptyTodayCta: "ابدأ من زر + لإضافة أول شخص",
    whenQuestion: "متى تبدأ الاتصال؟",
    youClock: "توقيتك",
    themClock: "توقيتها",
    youStartHint: "الساعة التي تتحرّك فيها أنت للاتصال أو التنبيه",
    themWindowRange: (a, b) => `من ${a} إلى ${b}`,
    themWindowHint: min => `نافذة ${min} دقيقة على ساعتها في مدينتها`,
    yourCityChip: city => `مدينتك: ${city}`,
    pickYourCity: "حدّد مدينتك في تبويب «أحبابي»",
    heroOnDay: d => `الموعد: ${d}`,
    agendaYouAt: (youAt, themCity) => `عندك ${youAt} · عندها ${themCity}`,
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
    remindHint: "0 = at appointment time",
    actionCall: "Call", actionNudge: "Nudge",
    waMsg: "WhatsApp message (optional)", waMsgPh: "e.g. Fajr time — love you 🤍",
    activeNow: "Window now", upcoming: "Coming up", emptySetup: "Add someone and pick a template or rule.",
    inMin: n => `in ${n} min`, now: "Now", open: "Window open",
    endsIn: n => `ends in ${n} min`,
    theirTime: "Their time", yourTime: "Your time",
    call: "Call", whatsapp: "WhatsApp", done: "Done ✓",
    doneAck: "Done — showing the next window",
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
    callOpen: "Open phone",
    callCopiedReady: "Number copied — open your phone app and paste it to call",
    callSheetHint: "1) Open the phone app  2) Paste the number  3) Tap call",
    notifyTitle: "Close Ones reminders",
    notifySub: "Notify me before each connection window",
    notifySoon: "Soon",
    notifySoonToast: "Reminders will arrive with the next app update — stay tuned.",
    notifyEnabled: "Close Ones reminders are on.",
    notifyDisabled: "Close Ones reminders are off.",
    webHint: "Plan here on the web — today's schedule and calendar export. Automatic reminders in the CityTimeHub app.",
    notifySubWeb: "Today's schedule and calendar here — automatic reminders in the app",
    todayTitle: "Today's schedule",
    tomorrowTitle: "Tomorrow",
    emptyToday: "No windows today — see upcoming below",
    exportCal: "Add to calendar",
    exportCalHint: "Download a .ics file for Google Calendar or Apple Calendar",
    icsDone: "Calendar file downloaded",
    homeNext: (when, label) => `Next ${when} — ${label}`,
    homeOpen: "Close Ones",
    homeSetupNext: "Plan when to reach loved ones abroad",
    tabToday: "Today",
    tabPeople: "People",
    leadToday: "When to call or nudge — from the rules you saved for each person.",
    leadPeople: "People you care about and their connection rules — tap a name to edit.",
    youHint: "Times on Today are shown in your clock",
    heroOpen: "Open now — time to reach out",
    heroNext: "Next connection window",
    heroEmpty: "No window right now",
    heroEmptySub: "Add someone and a rule, or check the schedule below.",
    heroFromRules: "From rules for",
    scheduleLead: "Rest of today and tomorrow — calculated from each person\u2019s rules",
    scheduleEmpty: "Nothing today or tomorrow — your rules create windows automatically.",
    laterTitle: "Later this week",
    rulesCount: n => n === 1 ? "1 rule" : `${n} rules`,
    rulesCountMany: n => `${n} rules`,
    expandRules: "Show rules",
    collapseRules: "Hide rules",
    addSheetTitle: "Add someone",
    addSheetLead: "Name, their city, and optional phone — then pick rules on the People tab.",
    emptyTodayCta: "Start with + to add your first person",
    whenQuestion: "When do you reach out?",
    youClock: "Your clock",
    themClock: "Their clock",
    youStartHint: "When you should call or send a nudge",
    themWindowRange: (a, b) => `${a} – ${b}`,
    themWindowHint: min => `${min}-minute window on their local clock`,
    yourCityChip: city => `Your city: ${city}`,
    pickYourCity: "Set your city on the People tab",
    heroOnDay: d => `Scheduled: ${d}`,
    agendaYouAt: (youAt, themCity) => `You: ${youAt} · Them: ${themCity}`,
    close: "Close",
  };

  const hourFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, weekday: "short", month: "short", day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const fmtTzCache = new Map();

  function fmtForTz(tz, withDate) {
    const key = `${tz || "local"}:${withDate ? "d" : "t"}`;
    if (fmtTzCache.has(key)) return fmtTzCache.get(key);
    const opts = { hour: "numeric", minute: "2-digit", hour12: true };
    if (tz) opts.timeZone = tz;
    if (withDate) { opts.weekday = "short"; opts.month = "short"; opts.day = "numeric"; }
    const fmt = new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", opts);
    fmtTzCache.set(key, fmt);
    return fmt;
  }

  function fmtInTz(ms, tz, withDate) {
    try { return fmtForTz(tz, withDate).format(new Date(ms)); }
    catch (e) { return withDate ? hourFmt.format(new Date(ms)) : timeFmt.format(new Date(ms)); }
  }

  function fmtAt(ms, tz) {
    return fmtInTz(ms, tz, false);
  }

  function fmtFull(ms, tz) {
    return fmtInTz(ms, tz, true);
  }

  function windowDurationMin(w) {
    return Math.max(1, Math.round((w.end - w.start) / 60000));
  }

  let CITIES = [];
  const bySlug = new Map();
  const state = { you: "", people: [] };
  let prayerCache = new Map();
  let tzCache = new Map();
  let tickTimer = null;
  let dashGen = 0;
  let dashTimer = null;
  const expandedPeople = new Set();
  let activeTab = "today";

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

  function defaultOffsetForType(type) {
    return type === "before" ? DEFAULT_OFFSET_BEFORE : DEFAULT_OFFSET_AFTER;
  }

  function effectiveOffsetMin(rule) {
    if (rule.type !== "after" && rule.type !== "before") return DEFAULT_OFFSET_AFTER;
    const v = rule.offsetMin;
    if (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0) {
      return defaultOffsetForType(rule.type);
    }
    return Math.min(PRAYER_OFFSET_MAX, Math.max(PRAYER_OFFSET_MIN, Math.round(Number(v))));
  }

  function effectiveRemindBeforeMin(rule) {
    if (rule.type !== "fixed") return DEFAULT_REMIND_BEFORE;
    const v = rule.remindBeforeMin;
    if (v == null || v === "" || !Number.isFinite(Number(v))) return DEFAULT_REMIND_BEFORE;
    return Math.min(REMIND_MAX, Math.max(REMIND_MIN, Math.round(Number(v))));
  }

  function normalizeRule(rule) {
    if (!rule || typeof rule !== "object") return;
    if (rule.type === "after" || rule.type === "before") {
      rule.offsetMin = effectiveOffsetMin(rule);
    } else if (rule.type === "fixed") {
      rule.remindBeforeMin = effectiveRemindBeforeMin(rule);
    }
  }

  function normalizeAllRules() {
    for (const p of state.people) {
      if (!Array.isArray(p.rules)) { p.rules = []; continue; }
      for (const r of p.rules) normalizeRule(r);
    }
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") {
        state.you = raw.you || "";
        state.people = Array.isArray(raw.people) ? raw.people.slice(0, MAX_PEOPLE) : [];
        normalizeAllRules();
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
    if (rule.type === "after") return T.afterLine(n, rule.prayer, effectiveOffsetMin(rule));
    if (rule.type === "before") return T.beforeLine(n, rule.prayer, effectiveOffsetMin(rule));
    return T.fixedLine(n, rule.label || "");
  }

  function computeRuleWindows(person, city, prayers, rule, horizonDays = DASH_HORIZON_DAYS) {
    const out = [];
    const add = (start, end, kind) => {
      if (end <= start) return;
      out.push({ start, end, kind, rule, person, city, label: ruleLabel(person, rule) });
    };

    if (rule.type === "after" || rule.type === "before") {
      const pr = prayers.find(p => p.key === rule.prayer);
      if (!pr) return out;
      const off = effectiveOffsetMin(rule) * 60000;
      for (let dayOff = 0; dayOff <= horizonDays; dayOff++) {
        const pMs = localToUtcMs(city, pr.h, pr.m, dayOff);
        if (rule.type === "after") add(pMs + off, pMs + off + AFTER_WINDOW_MIN * 60000, "after");
        else add(pMs - off, pMs, "before");
      }
    } else if (rule.type === "fixed") {
      const rbMin = effectiveRemindBeforeMin(rule);
      const rb = rbMin * 60000;
      for (let d = 0; d <= horizonDays; d++) {
        const y = cityYmd(city, d);
        if (y.dow !== (rule.dow ?? 0)) continue;
        const [hh, mm] = (rule.time || "10:00").split(":").map(Number);
        const apt = localToUtcMs(city, hh, mm, d);
        const start = apt - rb;
        const end = rbMin === 0 ? apt + AFTER_WINDOW_MIN * 60000 : apt;
        add(start, end, "fixed");
      }
    }
    return out;
  }

  function hasSetup() {
    return state.people.some(p => p.rules && p.rules.length);
  }

  function viewerCity() {
    if (state.you && bySlug.get(state.you)) return bySlug.get(state.you);
    return bySlug.get(guessHome()) || null;
  }

  function dayKeyForCity(ms, city) {
    if (!city) return new Date(ms).toISOString().slice(0, 10);
    const offH = tzOffsetHours(city.tz);
    const d = new Date(ms + offH * 3600000);
    const p = n => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  }

  function agendaBuckets(windows) {
    const city = viewerCity();
    const now = Date.now();
    const todayKey = dayKeyForCity(now, city);
    const tomorrowMs = now + 86400000;
    const tomorrowKey = dayKeyForCity(tomorrowMs, city);
    const today = [];
    const tomorrow = [];
    for (const w of windows) {
      if (w.end < now) continue;
      const k = dayKeyForCity(w.start, city);
      if (k === todayKey) today.push(w);
      else if (k === tomorrowKey) tomorrow.push(w);
    }
    return { today, tomorrow };
  }

  function icsEscape(s) {
    return (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function icsUtc(ms) {
    const d = new Date(ms);
    const p = n => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  }

  function buildIcs(windows) {
    const now = Date.now();
    const stamp = icsUtc(now);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CityTimeHub//Close Ones//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    const seen = new Set();
    for (const w of windows) {
      if (w.end <= now) continue;
      const uid = `co-${w.rule.id || "x"}-${w.start}@citytimehub.com`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const desc = w.rule.waMsg ? `DESCRIPTION:${icsEscape(w.rule.waMsg)}` : null;
      lines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${icsUtc(w.start)}`, `DTEND:${icsUtc(w.end)}`,
        `SUMMARY:${icsEscape(w.label)}`, desc, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.filter(Boolean).join("\r\n");
  }

  async function downloadCalendar() {
    if (!hasSetup()) return;
    let windows;
    try { windows = await allWindows(EXPORT_HORIZON_DAYS); }
    catch (e) { toast(T.errPrayer); return; }
    const body = buildIcs(windows);
    if (!body.includes("BEGIN:VEVENT")) { toast(T.noRules); return; }
    const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = LANG === "ar" ? "ahbabek-citytimehub.ics" : "close-ones-citytimehub.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(T.icsDone);
  }

  async function allWindows(horizonDays = DASH_HORIZON_DAYS) {
    const now = Date.now();
    const windows = [];
    for (const person of state.people) {
      const city = bySlug.get(person.city);
      if (!city || !person.rules || !person.rules.length) continue;
      let prayers;
      try { prayers = await fetchPrayers(city); }
      catch (e) { continue; }
      for (const rule of person.rules) {
        windows.push(...computeRuleWindows(person, city, prayers, rule, horizonDays));
      }
    }
    return windows.filter(w => w.end > now - 60000).sort((a, b) => a.start - b.start);
  }

  function dismissedKeys() {
    try {
      const now = Date.now();
      const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
      const kept = (Array.isArray(raw) ? raw : []).filter(x => x && x.until > now);
      if (kept.length !== (raw || []).length) {
        try { localStorage.setItem(DISMISS_KEY, JSON.stringify(kept)); } catch (e) {}
      }
      return new Set(kept.map(x => x.key));
    } catch (e) { return new Set(); }
  }

  function isDismissed(w) {
    return dismissedKeys().has(windowKey(w));
  }

  function markWindowDone(key, until) {
    if (!key || !until) return;
    try {
      const now = Date.now();
      const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
      const kept = (Array.isArray(raw) ? raw : []).filter(x => x && x.until > now && x.key !== key);
      kept.push({ key, until });
      localStorage.setItem(DISMISS_KEY, JSON.stringify(kept));
    } catch (e) {}
  }

  function visibleWindows(windows) {
    return windows.filter(w => !isDismissed(w));
  }

  function activeWindow(windows) {
    const now = Date.now();
    return visibleWindows(windows).find(w => w.start <= now && w.end > now) || null;
  }

  function upcomingWindows(windows, limit = 8) {
    const now = Date.now();
    return visibleWindows(windows).filter(w => w.start > now).slice(0, limit);
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

  function tryBridgeWhatsApp(phone, msg) {
    try {
      if (window.AndroidApp && typeof AndroidApp.openWhatsApp === "function") {
        AndroidApp.openWhatsApp(phoneDigits(phone), msg || "");
        return true;
      }
    } catch (e) {}
    return false;
  }

  function tryBridgePhone(phone) {
    try {
      if (window.AndroidApp && typeof AndroidApp.openPhone === "function") {
        AndroidApp.openPhone(phoneDigits(phone));
        return true;
      }
    } catch (e) {}
    return false;
  }

  function copyPhone(phone, toastMsg) {
    const p = "+" + phoneDigits(phone);
    const done = () => { if (toastMsg !== false) toast(toastMsg || T.waCopied); };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = p;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { window.prompt(T.waCopy, p); done(); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(p).then(done).catch(fallback);
    } else fallback();
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
    const close = () => { sheet.hidden = true; sheet.style.display = "none"; };
    sheet.querySelector(".co-wa-sheet-close").addEventListener("click", close);
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".co-wa-sheet-open").addEventListener("click", () => {
      const p = sheet.dataset.phone || "";
      const m = sheet.dataset.msg || "";
      if (!p) return;
      if (!tryBridgeWhatsApp(p, m)) copyPhone(p);
    });
    sheet.querySelector(".co-wa-sheet-copy").addEventListener("click", () => copyPhone(sheet.dataset.phone || ""));
    return sheet;
  }

  function showSheet(sheet) {
    sheet.hidden = false;
    sheet.style.display = "flex";
  }

  function updateSheetBridgeButtons() {
    const bridgedWa = !!(window.AndroidApp && AndroidApp.openWhatsApp);
    const bridgedCall = !!(window.AndroidApp && AndroidApp.openPhone);
    const waOpen = document.querySelector(".co-wa-sheet-open");
    const callOpen = document.querySelector(".co-call-sheet-open");
    if (waOpen) waOpen.hidden = !bridgedWa;
    if (callOpen) callOpen.hidden = !bridgedCall;
  }

  function showWaSheet(phone, msg) {
    const sheet = ensureWaSheet();
    sheet.dataset.phone = phoneDigits(phone);
    sheet.dataset.msg = msg || "";
    sheet.querySelector(".co-wa-sheet-num").textContent = "+" + sheet.dataset.phone;
    updateSheetBridgeButtons();
    showSheet(sheet);
  }

  function openWhatsApp(phone, msg) {
    const p = phoneDigits(phone);
    if (!p) return;
    if (tryBridgeWhatsApp(p, msg)) return;
    copyPhone(p, false);
    toast(T.waCopiedReady);
    showWaSheet(p, msg);
  }

  function ensureCallSheet() {
    let sheet = $("#coCallSheet");
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.id = "coCallSheet";
    sheet.className = "co-wa-sheet co-call-sheet";
    sheet.hidden = true;
    sheet.innerHTML = `<div class="co-wa-sheet-card" role="dialog" aria-modal="true" aria-labelledby="coCallSheetTitle">
      <button type="button" class="co-wa-sheet-close" aria-label="${esc(T.close)}">×</button>
      <h3 id="coCallSheetTitle">${esc(T.call)}</h3>
      <p class="co-wa-sheet-num" dir="ltr"></p>
      <p class="co-wa-sheet-hint muted">${esc(T.callSheetHint)}</p>
      <div class="co-wa-sheet-actions">
        <button type="button" class="btn co-call-sheet-open">${esc(T.callOpen)}</button>
        <button type="button" class="btn-ghost co-call-sheet-copy">${esc(T.waCopy)}</button>
      </div>
    </div>`;
    document.body.appendChild(sheet);
    const close = () => { sheet.hidden = true; sheet.style.display = "none"; };
    sheet.querySelector(".co-wa-sheet-close").addEventListener("click", close);
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".co-call-sheet-open").addEventListener("click", () => {
      const p = sheet.dataset.phone || "";
      if (!p) return;
      if (!tryBridgePhone(p)) copyPhone(p);
    });
    sheet.querySelector(".co-call-sheet-copy").addEventListener("click", () => copyPhone(sheet.dataset.phone || ""));
    return sheet;
  }

  function showCallSheet(phone) {
    const sheet = ensureCallSheet();
    sheet.dataset.phone = phoneDigits(phone);
    sheet.querySelector(".co-wa-sheet-num").textContent = "+" + sheet.dataset.phone;
    updateSheetBridgeButtons();
    showSheet(sheet);
  }

  function openPhoneCall(phone) {
    const p = phoneDigits(phone);
    if (!p) return;
    if (tryBridgePhone(p)) return;
    copyPhone(p, false);
    toast(T.callCopiedReady);
    showCallSheet(p);
  }

  function onContactTap(kind, el) {
    if (!el || !el.dataset.phone) return;
    if (kind === "wa") openWhatsApp(el.dataset.phone, el.dataset.waMsg || "");
    else openPhoneCall(el.dataset.phone);
  }

  function initNotifyBar() {
    const bar = $("#coNotifyBar");
    const btn = $("#coNotifyToggle");
    const badge = $("#coNotifyBadge");
    if (!bar || !btn) return;

    const hasBridge = !!(window.AndroidApp && typeof AndroidApp.enableCloseOnesReminders === "function");
    const title = $("#coNotifyTitle");
    const sub = $("#coNotifySub");
    if (title) title.textContent = T.notifyTitle;
    if (sub) sub.textContent = hasBridge ? T.notifySub : T.notifySubWeb;
    if (badge) badge.textContent = T.notifySoon;

    if (hasBridge) {
      bar.classList.add("is-ready");
      btn.disabled = false;
      btn.removeAttribute("aria-disabled");
      const on = localStorage.getItem("cth-co-notify") === "1";
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.addEventListener("click", () => {
        const next = !btn.classList.contains("is-on");
        try {
          if (next) AndroidApp.enableCloseOnesReminders();
          else if (typeof AndroidApp.disableCloseOnesReminders === "function") AndroidApp.disableCloseOnesReminders();
        } catch (e) { return; }
        btn.classList.toggle("is-on", next);
        btn.setAttribute("aria-checked", next ? "true" : "false");
        try { localStorage.setItem("cth-co-notify", next ? "1" : "0"); } catch (e) {}
        toast(next ? T.notifyEnabled : T.notifyDisabled);
      });
      return;
    }

    const showSoon = () => toast(T.notifySoonToast);
    btn.addEventListener("click", showSoon);
    bar.addEventListener("click", e => {
      if (e.target === btn || btn.contains(e.target)) return;
      showSoon();
    });
  }

  function bindAppContactClicks() {
    if (!SAFE_CONTACT) return;
    document.addEventListener("click", e => {
      const bad = e.target.closest("a.co-wa, a.co-call");
      if (bad) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    }, true);
    if (!document.documentElement.dataset.coAppBound) {
      document.documentElement.dataset.coAppBound = "1";
      const handler = e => {
        const wa = e.target.closest(".co-wa");
        if (wa && wa.dataset.phone) {
          e.preventDefault();
          e.stopPropagation();
          onContactTap("wa", wa);
          return;
        }
        const call = e.target.closest(".co-call");
        if (call && call.dataset.phone) {
          e.preventDefault();
          e.stopPropagation();
          onContactTap("call", call);
        }
      };
      document.addEventListener("click", handler, true);
    }
    window.cthCo = {
      wa(phone, msg) { openWhatsApp(phone, msg || ""); },
      call(phone) { openPhoneCall(phone); },
    };
  }

  function renderContactActions(person, rule, extraClass) {
    const r = rule || { waMsg: "" };
    const d = phoneDigits(person.phone);
    if (!d) return "";
    const msg = r.waMsg || "";
    const cls = extraClass ? `co-actions ${extraClass}` : "co-actions";
    let html = `<div class="${cls}">`;
    if (SAFE_CONTACT) {
      html += `<button type="button" class="btn-ghost co-wa" data-phone="${esc(d)}" data-wa-msg="${esc(msg)}" onclick="window.cthCo&&window.cthCo.wa(this.dataset.phone,this.dataset.waMsg)">${esc(T.whatsapp)}</button>`;
      html += `<button type="button" class="btn-ghost co-call" data-phone="${esc(d)}" onclick="window.cthCo&&window.cthCo.call(this.dataset.phone)">${esc(T.call)}</button>`;
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

  function renderActions(person, rule, win) {
    const contact = renderContactActions(person, rule);
    const wAttr = win ? ` data-co-win="${esc(windowKey(win))}" data-co-until="${win.end}"` : "";
    const done = `<button type="button" class="btn-ghost co-done"${wAttr}>${esc(T.done)}</button>`;
    if (!contact) return `<div class="co-actions">${done}</div>`;
    return contact.replace("</div>", done + "</div>");
  }

  function scheduleDashboard() {
    clearTimeout(dashTimer);
    dashTimer = setTimeout(() => renderDashboard(), 120);
  }

  function windowKey(w) {
    return w ? `${w.start}:${w.person.id}:${w.rule.id || ""}` : "";
  }

  function rulesCountLabel(n) {
    if (LANG === "ar") return n === 1 ? T.rulesCount(1) : T.rulesCountMany(n);
    return T.rulesCount(n);
  }

  function laterWindows(windows, today, tomorrow, skipKey) {
    const now = Date.now();
    const skip = new Set([skipKey].filter(Boolean));
    today.forEach(w => skip.add(windowKey(w)));
    tomorrow.forEach(w => skip.add(windowKey(w)));
    return windows.filter(w => w.end > now && !skip.has(windowKey(w))).slice(0, 6);
  }

  function heroCountdown(w, isOpen, left) {
    if (isOpen) return `${T.open} · ${T.endsIn(left)}`;
    if (left <= 1) return T.now;
    if (left < 180) return T.inMin(left);
    const you = viewerCity();
    return T.heroOnDay(fmtFull(w.start, you?.tz));
  }

  function renderWhenCard(w) {
    const you = viewerCity();
    const youTz = you?.tz;
    const theirTz = w.city.tz;
    const dur = windowDurationMin(w);
    const youCityName = you ? cN(you) : (LANG === "ar" ? "مدينتك" : "Your city");
    const themCityName = cN(w.city);
    return `<div class="co-when-card">
      <p class="co-when-q">${esc(T.whenQuestion)}</p>
      <div class="co-when-row co-when-row--you">
        <div class="co-when-head">
          <span class="co-when-tag">${esc(T.youClock)}</span>
          <span class="co-when-city">${esc(youCityName)}</span>
        </div>
        <p class="co-when-val">${esc(fmtFull(w.start, youTz))}</p>
        <p class="co-when-hint muted">${esc(T.youStartHint)}</p>
      </div>
      <div class="co-when-row co-when-row--them">
        <div class="co-when-head">
          <span class="co-when-tag">${esc(T.themClock)}</span>
          <span class="co-when-city">${esc(themCityName)}</span>
        </div>
        <p class="co-when-val">${esc(T.themWindowRange(fmtAt(w.start, theirTz), fmtAt(w.end, theirTz)))}</p>
        <p class="co-when-hint muted">${esc(T.themWindowHint(dur))}</p>
      </div>
    </div>`;
  }

  function renderYouChip() {
    const chip = $("#coYouChip");
    if (!chip) return;
    const you = viewerCity();
    if (you && state.you) {
      chip.hidden = false;
      chip.classList.remove("is-missing");
      chip.innerHTML = `<span class="co-you-chip-ico" aria-hidden="true">📍</span>
        <span class="co-you-chip-txt"><strong>${esc(T.yourCityChip(cN(you)))}</strong></span>
        <button type="button" class="co-you-chip-edit">${esc(LANG === "ar" ? "تغيير" : "Change")}</button>`;
      chip.querySelector(".co-you-chip-edit")?.addEventListener("click", () => setTab("people"));
    } else {
      chip.hidden = false;
      chip.classList.add("is-missing");
      chip.innerHTML = `<span class="co-you-chip-ico" aria-hidden="true">⚠️</span>
        <span class="co-you-chip-txt muted">${esc(T.pickYourCity)}</span>
        <button type="button" class="co-you-chip-edit">${esc(LANG === "ar" ? "حدّد" : "Set")}</button>`;
      chip.querySelector(".co-you-chip-edit")?.addEventListener("click", () => setTab("people"));
    }
  }

  function renderHeroHtml(active, next) {
    const w = active || next;
    if (!w) {
      return `<section class="co-hero co-hero--empty" aria-label="${esc(T.heroEmpty)}">
        <p class="co-hero-k">${esc(T.heroEmpty)}</p>
        <p class="co-hero-sub muted">${esc(T.heroEmptySub)}</p>
        ${!hasSetup() ? `<button type="button" class="btn-ghost co-hero-cta" data-co-open-add>${esc(T.emptyTodayCta)}</button>` : ""}
      </section>`;
    }
    const isOpen = !!active;
    const left = isOpen ? minsUntil(w.end) : minsUntil(w.start);
    const when = heroCountdown(w, isOpen, left);
    const personName = w.person.name || "";
    return `<section class="co-hero${isOpen ? " co-hero--open" : ""}" aria-label="${esc(isOpen ? T.heroOpen : T.heroNext)}">
      <p class="co-hero-k">${esc(isOpen ? T.heroOpen : T.heroNext)}</p>
      <h3 class="co-hero-title">${esc(w.label)}</h3>
      <p class="co-hero-when">${esc(when)}</p>
      <p class="co-hero-from muted">${esc(T.heroFromRules)} <strong>${esc(personName)}</strong></p>
      ${renderWhenCard(w)}
      ${renderActions(w.person, w.rule, w)}
    </section>`;
  }

  function renderAgendaItem(w) {
    const inM = minsUntil(w.start);
    const when = inM <= 1 ? T.now : (inM < 180 ? T.inMin(inM) : fmtFull(w.start, viewerCity()?.tz));
    const you = viewerCity();
    const youAt = fmtAt(w.start, you?.tz);
    const themAt = fmtAt(w.start, w.city.tz);
    return `<li class="co-agenda-item">
      <span class="co-agenda-when">${esc(when)}</span>
      <span class="co-agenda-label">${esc(w.label)}</span>
      <span class="co-agenda-at muted">${esc(T.agendaYouAt(youAt, `${themAt} · ${cN(w.city)}`))}</span>
    </li>`;
  }

  function renderDayAgendaHtml(windows, skipKey) {
    const { today, tomorrow } = agendaBuckets(windows);
    const filt = list => list.filter(w => windowKey(w) !== skipKey);
    const todayF = filt(today);
    const tomorrowF = filt(tomorrow);
    const later = laterWindows(windows, today, tomorrow, skipKey);
    if (!todayF.length && !tomorrowF.length && !later.length) {
      return `<section class="co-day-agenda co-day-agenda--empty">
        <h3 class="co-agenda-title">${esc(T.todayTitle)}</h3>
        <p class="co-agenda-lead muted">${esc(T.scheduleEmpty)}</p>
      </section>`;
    }
    let html = `<section class="co-day-agenda" aria-labelledby="coScheduleTitle">
      <div class="co-agenda-head">
        <div>
          <h3 class="co-agenda-title" id="coScheduleTitle">${esc(T.todayTitle)}</h3>
          <p class="co-agenda-lead muted">${esc(T.scheduleLead)}</p>
        </div>
        <button type="button" class="btn-ghost co-export-cal" title="${esc(T.exportCalHint)}">${esc(T.exportCal)}</button>
      </div>`;
    if (todayF.length) {
      html += `<ul class="co-agenda-list">${todayF.map(w => renderAgendaItem(w)).join("")}</ul>`;
    }
    if (tomorrowF.length) {
      html += `<h4 class="co-agenda-sub">${esc(T.tomorrowTitle)}</h4>`;
      html += `<ul class="co-agenda-list">${tomorrowF.map(w => renderAgendaItem(w)).join("")}</ul>`;
    }
    if (later.length) {
      html += `<details class="co-later"><summary>${esc(T.laterTitle)}</summary>`;
      html += `<ul class="co-agenda-list">${later.map(w => renderAgendaItem(w)).join("")}</ul></details>`;
    }
    html += `</section>`;
    return html;
  }

  function renderWebHintHtml() {
    if (IS_APP) return "";
    const hasBridge = !!(window.AndroidApp && typeof AndroidApp.enableCloseOnesReminders === "function");
    if (hasBridge) return "";
    return `<p class="co-web-hint muted">${esc(T.webHint)}</p>`;
  }

  function bindDashActions(root) {
    if (!root) return;
    root.querySelectorAll(".co-done").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.coWin;
        const until = +btn.dataset.coUntil;
        if (key && until) {
          markWindowDone(key, until);
          toast(T.doneAck);
        }
        scheduleDashboard();
        scheduleHomeStrip();
      });
    });
    const exp = root.querySelector(".co-export-cal");
    if (exp) exp.addEventListener("click", () => downloadCalendar());
    root.querySelectorAll("[data-co-open-add]").forEach(btn => {
      btn.addEventListener("click", () => openAddSheet());
    });
  }

  async function renderDashboard() {
    const dash = $("#coDash");
    if (!dash) return;
    renderYouChip();
    const gen = ++dashGen;
    if (!state.people.length) {
      dash.innerHTML = renderWebHintHtml() + renderHeroHtml(null, null);
      bindDashActions(dash);
      return;
    }
    let windows;
    try { windows = await allWindows(); }
    catch (e) { if (gen === dashGen) dash.innerHTML = `<p class="co-empty">${esc(T.errPrayer)}</p>`; return; }
    if (gen !== dashGen) return;

    const active = activeWindow(windows);
    const next = !active ? upcomingWindows(windows, 1)[0] : null;
    const heroKey = windowKey(active || next);
    const agendaWindows = visibleWindows(windows);
    let html = renderWebHintHtml();
    html += renderHeroHtml(active, next);
    if (hasSetup()) html += renderDayAgendaHtml(agendaWindows, heroKey);

    dash.innerHTML = html;
    bindDashActions(dash);
  }

  let homeTimer = null;
  async function renderHomeStrip() {
    const strip = $("#coHomeStrip");
    if (!strip) return;
    strip.href = CO_PAGE;
    if (!hasSetup()) {
      strip.hidden = false;
      strip.innerHTML = `<span class="co-home-ico" aria-hidden="true">🤍</span>
        <span class="co-home-copy">
          <strong class="co-home-k">${esc(T.homeOpen)}</strong>
          <span class="co-home-next">${esc(T.homeSetupNext)}</span>
        </span>
        <span class="co-home-arrow" aria-hidden="true">→</span>`;
      return;
    }
    let windows;
    try { windows = await allWindows(DASH_HORIZON_DAYS); }
    catch (e) {
      strip.hidden = false;
      strip.innerHTML = `<span class="co-home-ico" aria-hidden="true">🤍</span>
        <span class="co-home-copy">
          <strong class="co-home-k">${esc(T.homeOpen)}</strong>
          <span class="co-home-next">${esc(T.homeSetupNext)}</span>
        </span>
        <span class="co-home-arrow" aria-hidden="true">→</span>`;
      return;
    }
    const active = activeWindow(windows);
    const next = active || upcomingWindows(windows, 1)[0];
    if (!next) {
      strip.hidden = false;
      strip.innerHTML = `<span class="co-home-ico" aria-hidden="true">🤍</span>
        <span class="co-home-copy">
          <strong class="co-home-k">${esc(T.homeOpen)}</strong>
          <span class="co-home-next">${esc(T.heroEmptySub)}</span>
        </span>
        <span class="co-home-arrow" aria-hidden="true">→</span>`;
      return;
    }
    const inM = active ? 0 : minsUntil(next.start);
    const when = active ? T.now : (inM <= 1 ? T.now : T.inMin(inM));
    strip.hidden = false;
    strip.innerHTML = `<span class="co-home-ico" aria-hidden="true">🤍</span>
      <span class="co-home-copy">
        <strong class="co-home-k">${esc(T.homeOpen)}</strong>
        <span class="co-home-next">${esc(T.homeNext(when, next.label))}</span>
      </span>
      <span class="co-home-arrow" aria-hidden="true">→</span>`;
  }

  function scheduleHomeStrip() {
    clearTimeout(homeTimer);
    homeTimer = setTimeout(() => renderHomeStrip(), 120);
  }

  let homeStripIv = null;

  async function initHomeStrip() {
    await renderHomeStrip();
    if (homeStripIv) clearInterval(homeStripIv);
    homeStripIv = setInterval(() => scheduleHomeStrip(), 60000);
  }

  async function loadCities() {
    const res = await fetch("/data/cities.json", { cache: "force-cache" });
    CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
    CITIES.forEach(c => bySlug.set(c.slug, c));
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
      const offVal = effectiveOffsetMin(r);
      const offset = `<input type="number" class="co-rule-offset" min="${PRAYER_OFFSET_MIN}" max="${PRAYER_OFFSET_MAX}" step="5" value="${offVal}" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.offsetMin)}" />`;
      const dowSel = `<select class="co-rule-dow" data-p="${idx}" data-r="${ri}">
        ${DOW.map((d, i) => `<option value="${i}"${(r.dow ?? 0) === i ? " selected" : ""}>${esc(d)}</option>`).join("")}
      </select>`;
      const timeIn = `<input type="time" class="co-rule-time" value="${esc(r.time || "10:00")}" data-p="${idx}" data-r="${ri}" />`;
      const labelIn = `<input type="text" class="co-rule-label" value="${esc(r.label || "")}" placeholder="${esc(T.fixedLabelPh)}" data-p="${idx}" data-r="${ri}" />`;
      const rbVal = effectiveRemindBeforeMin(r);
      const remind = `<input type="number" class="co-rule-remind" min="${REMIND_MIN}" max="${REMIND_MAX}" step="5" value="${rbVal}" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.remindBefore)}" />`;
      const wa = `<input type="text" class="co-rule-wa" value="${esc(r.waMsg || "")}" placeholder="${esc(T.waMsgPh)}" data-p="${idx}" data-r="${ri}" />`;
      const detail = r.type === "fixed"
        ? `<div class="co-rule-detail">${labelIn} ${dowSel} ${timeIn} <label class="co-mini">${esc(T.remindBefore)}</label> ${remind} <span class="co-mini co-rule-hint">${esc(T.remindHint)}</span> ${wa}</div>`
        : `<div class="co-rule-detail">${prayerSel} <label class="co-mini">${esc(T.offsetMin)}</label> ${offset} ${wa}</div>`;
      return `<div class="co-rule" data-p="${idx}" data-r="${ri}">
        ${typeSel} ${detail}
        <button type="button" class="co-rule-del" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.remove)}">×</button>
      </div>`;
    }).join("");

    return `<article class="co-person${expandedPeople.has(idx) ? " is-open" : ""}" data-idx="${idx}">
      <button type="button" class="co-person-toggle" data-idx="${idx}" aria-expanded="${expandedPeople.has(idx) ? "true" : "false"}">
        <span class="co-person-toggle-main">
          <strong class="co-person-name">${esc(person.name)}</strong>
          <span class="co-person-meta muted">${esc(cityLabel)} · ${esc(rulesCountLabel((person.rules || []).length))}</span>
        </span>
        <span class="co-person-chevron" aria-hidden="true"></span>
      </button>
      <div class="co-person-body"${expandedPeople.has(idx) ? "" : " hidden"}>
        <div class="co-person-body-inner">
          ${person.phone ? `<p class="co-phone muted" dir="ltr">${esc(displayPhone(person, city))}</p>` : ""}
          ${renderContactActions(person, defaultRule(person), "co-person-actions")}
          <p class="co-rules-k muted">${esc(T.rules)}</p>
          <div class="co-templates">
            <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="afterFajr30">${esc(T.tplAfterFajr)}</button>
            <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="beforeFajr15">${esc(T.tplBeforeFajr)}</button>
            <button type="button" class="co-tpl" data-idx="${idx}" data-tpl="afterMaghrib20">${esc(T.tplAfterMaghrib)}</button>
          </div>
          <div class="co-rules">${rulesHtml}</div>
          <button type="button" class="btn-ghost co-add-rule" data-idx="${idx}">+ ${esc(T.addRule)}</button>
          <button type="button" class="co-person-del co-person-del-inline" data-idx="${idx}">${esc(T.remove)}</button>
        </div>
      </div>
    </article>`;
  }

  function renderPeople() {
    const box = $("#coPeople");
    if (!box) return;
    if (!state.people.length) {
      box.innerHTML = `<div class="co-people-empty">
        <p class="muted">${esc(LANG === "ar" ? "لم تُضف أحدًا بعد." : "No one added yet.")}</p>
        <button type="button" class="btn co-people-empty-btn" data-co-open-add>+ ${esc(T.addPerson)}</button>
      </div>`;
      box.querySelector("[data-co-open-add]")?.addEventListener("click", () => openAddSheet());
      return;
    }
    box.innerHTML = state.people.map((p, i) => personCardHtml(p, i)).join("");
  }

  function setTab(tab) {
    activeTab = tab;
    const today = $("#coTabToday");
    const people = $("#coTabPeople");
    const panelToday = $("#coPanelToday");
    const panelPeople = $("#coPanelPeople");
    const onToday = tab === "today";
    if (today) { today.classList.toggle("is-active", onToday); today.setAttribute("aria-selected", onToday ? "true" : "false"); }
    if (people) { people.classList.toggle("is-active", !onToday); people.setAttribute("aria-selected", onToday ? "false" : "true"); }
    if (panelToday) panelToday.hidden = !onToday;
    if (panelPeople) panelPeople.hidden = onToday;
  }

  function openAddSheet() {
    const sheet = $("#coAddSheet");
    if (!sheet) return;
    sheet.hidden = false;
    sheet.style.display = "flex";
    const name = $("#coPersonName");
    if (name) name.focus();
  }

  function closeAddSheet() {
    const sheet = $("#coAddSheet");
    if (!sheet) return;
    sheet.hidden = true;
    sheet.style.display = "none";
  }

  function initTabs() {
    const tabToday = $("#coTabToday");
    const tabPeople = $("#coTabPeople");
    const tabAdd = $("#coTabAdd");
    const leadToday = $("#coLeadToday");
    const leadPeople = $("#coLeadPeople");
    const sheetTitle = $("#coAddSheetTitle");
    const sheetLead = document.querySelector(".co-add-sheet-lead");
    if (tabToday) tabToday.textContent = T.tabToday;
    if (tabPeople) tabPeople.textContent = T.tabPeople;
    if (leadToday) leadToday.textContent = T.leadToday;
    if (leadPeople) leadPeople.textContent = T.leadPeople;
    if (sheetTitle) sheetTitle.textContent = T.addSheetTitle;
    if (sheetLead) sheetLead.textContent = T.addSheetLead;
    const youHint = document.querySelector(".co-field-hint");
    if (youHint) youHint.textContent = T.youHint;
    tabToday && tabToday.addEventListener("click", () => setTab("today"));
    tabPeople && tabPeople.addEventListener("click", () => setTab("people"));
    tabAdd && tabAdd.addEventListener("click", () => openAddSheet());
    setTab(activeTab);
  }

  function initAddSheet() {
    const sheet = $("#coAddSheet");
    if (!sheet) return;
    sheet.querySelector(".co-add-sheet-close")?.addEventListener("click", closeAddSheet);
    sheet.addEventListener("click", e => { if (e.target === sheet) closeAddSheet(); });
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
    const newIdx = state.people.length - 1;
    expandedPeople.clear();
    expandedPeople.add(newIdx);
    saveState();
    renderPeople();
    scheduleDashboard();
    closeAddSheet();
    setTab("people");
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
    if (el.classList.contains("co-rule-type")) { r.type = el.value; normalizeRule(r); fullRerender = true; }
    else if (el.classList.contains("co-rule-prayer")) r.prayer = el.value;
    else if (el.classList.contains("co-rule-offset")) {
      const raw = el.value.trim();
      if (!raw) r.offsetMin = defaultOffsetForType(r.type);
      else {
        const n = +raw;
        r.offsetMin = !Number.isFinite(n) || n <= 0 ? defaultOffsetForType(r.type)
          : Math.min(PRAYER_OFFSET_MAX, Math.max(PRAYER_OFFSET_MIN, Math.round(n)));
      }
      if (String(r.offsetMin) !== el.value) el.value = r.offsetMin;
    }
    else if (el.classList.contains("co-rule-dow")) r.dow = +el.value;
    else if (el.classList.contains("co-rule-time")) r.time = el.value;
    else if (el.classList.contains("co-rule-label")) r.label = el.value;
    else if (el.classList.contains("co-rule-remind")) {
      const raw = el.value.trim();
      if (!raw) r.remindBeforeMin = DEFAULT_REMIND_BEFORE;
      else {
        const n = +raw;
        r.remindBeforeMin = !Number.isFinite(n) || n < 0 ? DEFAULT_REMIND_BEFORE
          : Math.min(REMIND_MAX, Math.max(REMIND_MIN, Math.round(n)));
      }
      if (String(r.remindBeforeMin) !== el.value) el.value = r.remindBeforeMin;
    }
    else return;
    saveState();
    if (fullRerender) renderPeople();
    scheduleDashboard();
  }

  function bindPeopleEvents() {
    const box = $("#coPeople");
    if (!box) return;
    box.addEventListener("click", e => {
      const toggle = e.target.closest(".co-person-toggle");
      if (toggle) {
        const idx = +toggle.dataset.idx;
        if (expandedPeople.has(idx)) expandedPeople.delete(idx);
        else { expandedPeople.clear(); expandedPeople.add(idx); }
        renderPeople();
        return;
      }
      const delP = e.target.closest(".co-person-del");
      if (delP) {
        state.people.splice(+delP.dataset.idx, 1);
        expandedPeople.clear();
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
    box.addEventListener("blur", e => {
      const el = e.target;
      if (!el.classList.contains("co-rule-offset") && !el.classList.contains("co-rule-remind")) return;
      onRuleChange(el, false);
    }, true);
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
      if (window.CTH_CITY_INP) window.CTH_CITY_INP.show(input, cityLabel(c));
      else input.value = cityLabel(c);
      input.dataset.coCity = c.slug;
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
      const i = $("#coYou");
      if (i && window.CTH_CITY_INP) window.CTH_CITY_INP.show(i, cN(y) + ", " + cC(y));
      else if (i) i.value = cN(y) + ", " + cC(y);
    }
  }

  async function initPage() {
    if (!$("#coDash")) return;
    applyParams();
    if (!state.you) {
      const c = bySlug.get(guessHome());
      if (c) {
        state.you = c.slug;
        const i = $("#coYou");
        if (i && window.CTH_CITY_INP) window.CTH_CITY_INP.show(i, cN(c) + ", " + cC(c));
        else if (i) i.value = cN(c) + ", " + cC(c);
      }
    }

    autocomplete($("#coYou"), $("#coYouAc"), c => {
      state.you = c.slug;
      saveState();
      renderYouChip();
      scheduleDashboard();
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
        if (!v) {
          if (cityInp.dataset.coCity) {
            const picked = bySlug.get(cityInp.dataset.coCity);
            if (picked) {
              pendingPersonCity = picked.slug;
              if (window.CTH_CITY_INP) window.CTH_CITY_INP.show(cityInp, cityLabel(picked));
              updateDialUI(picked);
              return;
            }
          }
          pendingPersonCity = "";
          delete cityInp.dataset.coCity;
          updateDialUI(null);
          return;
        }
        delete cityInp.dataset.coCity;
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
    const form = $("#coForm");
    initTabs();
    initAddSheet();
    renderYouChip();
    updateDialUI(null);

    if (form) form.addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#coPersonName").value;
      const phone = $("#coPersonPhone").value;
      const city = bySlug.get(pendingPersonCity) || findCity($("#coPersonCity").value);
      const cityIn = city ? cityLabel(city) : $("#coPersonCity").value;
      addPerson({ name, phone, citySlug: city ? city.slug : "", cityInput: cityIn });
      $("#coPersonName").value = "";
      $("#coPersonPhone").value = "";
      pendingPersonCity = "";
      const cityField = $("#coPersonCity");
      if (cityField) {
        delete cityField.dataset.coCity;
        if (window.CTH_CITY_INP) window.CTH_CITY_INP.reset(cityField);
        else cityField.value = "";
      }
      updateDialUI(null);
    });

    bindPeopleEvents();
    bindAppContactClicks();
    initNotifyBar();
    renderPeople();
    await renderDashboard();

    clearInterval(tickTimer);
    tickTimer = setInterval(() => scheduleDashboard(), 30000);
  }

  async function init() {
    let citiesOk = true;
    try { await loadCities(); } catch (e) { citiesOk = false; }
    loadState();
    if ($("#coDash") && citiesOk) await initPage();
    if ($("#coHomeStrip")) await initHomeStrip();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
