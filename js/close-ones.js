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
  const FIXED_DATE_MAX_DAYS = 90;
  const FIXED_RULE_HORIZON_DAYS = EXPORT_HORIZON_DAYS;
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
    save: "حفظ", remove: "إزالة", editRule: "تعديل",
    addRuleNew: "أضف قاعدة جديدة",
    templates: "قوالب سريعة",
    tplAfterFajr: "بعد الفجر + ٣٠ د — اتصل",
    tplBeforeFajr: "قبل الفجر ١٥ د — نبّه للصلاة",
    tplAfterMaghrib: "بعد المغرب + ٢٠ د — اتصل",
    rules: "قواعد التواصل",
    addRule: "أضف قاعدة",
    ruleAfter: "بعد صلاة", ruleBefore: "قبل صلاة", ruleFixed: "موعد ثابت",
    offsetMin: "دقائق", fixedLabel: "التذكير", fixedLabelPh: "مثال: موعد الدكتور",
    fixedDay: "اليوم", fixedTime: "الوقت (بتوقيته)", remindBefore: "ذكّرني قبل",
    fixedDate: "التاريخ", fixedDateHint: "بتوقيت مدينة الشخص — اليوم أو يوم قادم",
    fixedWeekly: "كل أسبوع",
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
    fixedLine: (name, label) => `${label || name}`,
    fixedLineOn: (name, label, when) => `${label || name} — ${when}`,
    maxPeople: n => `الحد الأقصى ${n} أشخاص.`,
    saved: "تم الحفظ.", pickCity: "اختر المدينة.",
    msgSaved: "تم حفظ الرسالة.",
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
    webHint: "للتذكير: أضِف المواعيد لتقويمك من الأزرار أدناه — أو فعّل التذكيرات في تطبيق CityTimeHub.",
    todayTitle: "جدول اليوم",
    tomorrowTitle: "غدًا",
    todayTitleOn: d => `جدول اليوم — ${d}`,
    tomorrowTitleOn: d => `غدًا — ${d}`,
    emptyToday: "لا نوافذ اليوم — راجع القادم أدناه",
    exportCal: "كل الأسبوع — ملف .ics",
    exportCalHint: "كل مواعيد الأسبوع في ملف واحد — لـ Apple و Outlook وأي تقويم",
    exportGcal: "أقرب موعد — Google Calendar",
    exportGcalHint: "يضيف الموعد القادم فقط (جوجل تسمح بحدثٍ واحد) — للأسبوع كله استخدم ملف .ics",
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
    scheduleEmptyOther: "لا مواعيد أخرى اليوم أو غدًا — القادم معروضٌ بالأعلى.",
    laterTitle: "لاحقًا هذا الأسبوع",
    rulesCountNone: "بلا تذكير بعد",
    rulesCount: n => `${n} قاعدة`,
    rulesCountMany: n => `${n} قواعد`,
    expandRules: "عرض القواعد",
    collapseRules: "إخفاء القواعد",
    addSheetTitle: "مَن تحبّ أن تبقى قريبًا منه؟",
    addSheetLead: "اسمه ومدينته، واختر متى نُذكّرك به — ويمكنك تغيير ذلك متى شئت.",
    addPresetQ: "متى نُذكّرك به؟",
    // Labels stay free of gendered pronouns: the same card is chosen for a mother
    // and for a brother, and "مغربه" for أمي reads wrong.
    presets: {
      beforeFajr15: { label: "قبل الفجر", hint: "تنبيهٌ للصلاة — قبلها بربع ساعة", when: "قبل الفجر بربع ساعة", rule: { type: "before", prayer: "Fajr", offsetMin: 15, waMsg: "صلّي الفجر يا حبيبتي 🤍" } },
      afterMaghrib20: { label: "بعد المغرب", hint: "اطمئنانٌ في هدوء المساء", when: "بعد المغرب", rule: { type: "after", prayer: "Maghrib", offsetMin: 20 } },
      afterFajr30: { label: "بعد الفجر", hint: "صباحٌ هادئٌ لمكالمة", when: "بعد الفجر", rule: { type: "after", prayer: "Fajr", offsetMin: 30 } },
      later: { label: "أختار لاحقًا", hint: "أضِفه الآن، واختر التذكير وقتما تشاء", when: "", rule: null },
    },
    addSubmit: "حفظ",
    addedToast: name => `أضفنا ${name} 🤍`,
    addedToastRule: (name, when, city) => `أضفنا ${name} 🤍 — سنُذكّرك ${when} بتوقيت ${city}`,
    // Groups: one card for a whole family or circle. The reminder nudges you, and
    // you send to their WhatsApp group.
    addKindPerson: "شخص",
    addKindGroup: "جروب",
    addKindQ: "شخص واحد أم جروب؟",
    groupNamePh: "مثال: العيلة",
    groupLinkLabel: "رابط جروب واتساب (اختياري)",
    groupLinkPh: "الصق رابط الجروب هنا",
    groupLinkHint: "من واتساب: الجروب ← دعوة عبر رابط ← نسخ الرابط",
    groupLinkBad: "الرابط لازم يكون رابط دعوة واتساب (chat.whatsapp.com).",
    groupTag: "جروب",
    openGroup: "افتح الجروب",
    addedGroup: name => `أضفنا جروب ${name} 🤍`,
    addedGroupRule: (name, when, city) => `أضفنا جروب ${name} 🤍 — سنُذكّرك ${when} بتوقيت ${city}`,
    emptyTodayCta: "ابدأ من زر + لإضافة أول شخص",
    whenQuestion: "متى تبدأ الاتصال؟",
    youClock: "توقيتك",
    themClock: "توقيتها",
    youStartHint: "الساعة التي تتحرّك فيها أنت للاتصال أو التنبيه",
    themWindowRange: (a, b) => `من ${a} إلى ${b}`,
    themWindowHint: min => `نافذة ${min} دقيقة على ساعتها في مدينتها`,
    // What you are actually being asked to do — a sentence, not a formula.
    heroCall: name => `اطمئنّ على ${name}`,
    heroNudge: (name, prayer) => `نبّه ${name} لصلاة ${PNAME[prayer]}`,
    heroRemind: (name, label) => label ? `ذكّر ${name} بـ${label}` : `موعدك مع ${name}`,
    heroYouAt: "عندك",
    heroThemAt: city => `في ${city}`,
    heroRuleSub: (formula, min) => `${formula} · نافذة ${min} دقيقة`,
    yourCityChip: city => `مدينتك: ${city}`,
    pickYourCity: "حدّد مدينتك في تبويب «أحبابي»",
    heroOnDay: d => `الموعد: ${d}`,
    agendaYouAt: (youAt, themCity) => `عندك ${youAt} · عندها ${themCity}`,
    close: "إغلاق",
    errPrayer: "تعذّر تحميل مواقيت الصلاة.",
  } : {
    you: "Your city", youPh: "e.g. Dubai",
    addPerson: "Add someone", personName: "Name", personNamePh: "e.g. Mom",
    personCity: "Their city", personCityPh: "e.g. Cairo",
    phone: "WhatsApp / phone (optional)", phonePh: "1012345678",
    phonePickCity: "Pick their city first",
    dialHint: (country, dial) => `${country} (${dial}) — enter the number without a leading 0`,
    save: "Save", remove: "Remove", editRule: "Edit",
    addRuleNew: "Add new rule",
    templates: "Quick templates",
    tplAfterFajr: "After Fajr + 30 min — call",
    tplBeforeFajr: "15 min before Fajr — prayer nudge",
    tplAfterMaghrib: "After Maghrib + 20 min — call",
    rules: "Connection rules",
    addRule: "Add rule",
    ruleAfter: "After prayer", ruleBefore: "Before prayer", ruleFixed: "Fixed appointment",
    offsetMin: "minutes", fixedLabel: "Reminder", fixedLabelPh: "e.g. Doctor appointment",
    fixedDay: "Day", fixedTime: "Time (their clock)", remindBefore: "Remind me before",
    fixedDate: "Date", fixedDateHint: "On their city clock — today or a day ahead",
    fixedWeekly: "Every week",
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
    fixedLine: (name, label) => `${label || name}`,
    fixedLineOn: (name, label, when) => `${label || name} — ${when}`,
    errPrayer: "Couldn't load prayer times.",
    maxPeople: n => `Up to ${n} people.`,
    saved: "Saved.", pickCity: "Pick a city.",
    msgSaved: "Message saved.",
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
    webHint: "For reminders: add windows to your calendar below — or turn on alerts in the CityTimeHub app.",
    todayTitle: "Today's schedule",
    tomorrowTitle: "Tomorrow",
    todayTitleOn: d => `Today — ${d}`,
    tomorrowTitleOn: d => `Tomorrow — ${d}`,
    emptyToday: "No windows today — see upcoming below",
    exportCal: "Whole week — .ics file",
    exportCalHint: "Every reminder this week in one file — for Apple, Outlook and any calendar",
    exportGcal: "Next reminder — Google Calendar",
    exportGcalHint: "Adds the next reminder only (Google allows one event per link) — use the .ics file for the whole week",
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
    scheduleEmptyOther: "Nothing else today or tomorrow — your next reminder is shown above.",
    laterTitle: "Later this week",
    rulesCountNone: "no reminder yet",
    rulesCount: n => n === 1 ? "1 rule" : `${n} rules`,
    rulesCountMany: n => `${n} rules`,
    expandRules: "Show rules",
    collapseRules: "Hide rules",
    addSheetTitle: "Who do you want to stay close to?",
    addSheetLead: "Their name and city, then choose when we remind you — you can change it any time.",
    addPresetQ: "When should we remind you?",
    presets: {
      beforeFajr15: { label: "Before their Fajr", hint: "A nudge to wake them for prayer", when: "15 minutes before their Fajr", rule: { type: "before", prayer: "Fajr", offsetMin: 15, waMsg: "Fajr time — love you 🤍" } },
      afterMaghrib20: { label: "After their Maghrib", hint: "To check in on a quiet evening", when: "after their Maghrib", rule: { type: "after", prayer: "Maghrib", offsetMin: 20 } },
      afterFajr30: { label: "After their Fajr", hint: "A calm morning to call", when: "after their Fajr", rule: { type: "after", prayer: "Fajr", offsetMin: 30 } },
      later: { label: "I'll choose later", hint: "Add them now, pick a reminder whenever", when: "", rule: null },
    },
    addSubmit: "Save",
    addedToast: name => `${name} added 🤍`,
    addedToastRule: (name, when, city) => `${name} added 🤍 — we'll remind you ${when}, ${city} time`,
    addKindPerson: "One person",
    addKindGroup: "A group",
    addKindQ: "One person or a group?",
    groupNamePh: "e.g. The family",
    groupLinkLabel: "WhatsApp group link (optional)",
    groupLinkPh: "Paste the group link here",
    groupLinkHint: "In WhatsApp: the group → Invite via link → Copy link",
    groupLinkBad: "That should be a WhatsApp invite link (chat.whatsapp.com).",
    groupTag: "Group",
    openGroup: "Open group",
    addedGroup: name => `${name} group added 🤍`,
    addedGroupRule: (name, when, city) => `${name} group added 🤍 — we'll remind you ${when}, ${city} time`,
    emptyTodayCta: "Start with + to add your first person",
    whenQuestion: "When do you reach out?",
    youClock: "Your clock",
    themClock: "Their clock",
    youStartHint: "When you should call or send a nudge",
    themWindowRange: (a, b) => `${a} – ${b}`,
    themWindowHint: min => `${min}-minute window on their local clock`,
    heroCall: name => `Check in on ${name}`,
    heroNudge: (name, prayer) => `Nudge ${name} for ${PNAME[prayer]}`,
    heroRemind: (name, label) => label ? `Remind ${name} — ${label}` : `Your plan with ${name}`,
    heroYouAt: "Your time",
    heroThemAt: city => `In ${city}`,
    heroRuleSub: (formula, min) => `${formula} · ${min}-minute window`,
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

  function fmtDateLong(ms, tz) {
    try {
      const opts = { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
      if (tz) opts.timeZone = tz;
      return new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", opts).format(new Date(ms));
    } catch (e) {
      return fmtFull(ms, tz);
    }
  }

  /** Weekday + date, no clock time — for lines that sit next to a clock already. */
  function fmtDayOnly(ms, tz) {
    try {
      const opts = { weekday: "long", month: "short", day: "numeric" };
      if (tz) opts.timeZone = tz;
      return new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", opts).format(new Date(ms));
    } catch (e) {
      return fmtDateLong(ms, tz);
    }
  }

  /** Calendar label for today (0) or tomorrow (1) in the viewer's city clock. */
  function fmtCalendarDay(dayOff = 0) {
    const city = viewerCity();
    if (!city) {
      const d = new Date(Date.now() + dayOff * 86400000);
      return new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
        weekday: "long", month: "short", day: "numeric",
      }).format(d);
    }
    return new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
      weekday: "long", month: "short", day: "numeric", timeZone: city.tz,
    }).format(new Date(localToUtcMs(city, 12, 0, dayOff)));
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
  const ruleEditing = new Set();
  let activeTab = "today";

  // A zone's UTC offset changes with daylight saving, so a window days from now
  // must use the offset on *its own* day — not today's.
  function tzOffsetAt(tz, whenMs = Date.now()) {
    if (!tz) return 0;
    const key = tz + "|" + Math.floor(whenMs / 86400000); // one lookup per zone per day
    if (tzCache.has(key)) return tzCache.get(key);
    let off = 0;
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
        .formatToParts(new Date(whenMs)).find(x => x.type === "timeZoneName");
      const m = p && p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (m) off = (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    } catch (e) {}
    tzCache.set(key, off);
    return off;
  }

  function cityYmd(city, dayOff = 0) {
    const at = Date.now() + dayOff * 86400000;
    const offH = tzOffsetAt(city.tz, at);
    const d = new Date(at + offH * 3600000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay() };
  }

  function localToUtcMs(city, h, m, dayOff = 0) {
    const ymd = cityYmd(city, dayOff);
    const wall = Date.UTC(ymd.y, ymd.m, ymd.day, h, m, 0);
    // Resolve the offset on that day, then refine once in case the first guess
    // landed on the other side of a daylight-saving switch.
    const off1 = tzOffsetAt(city.tz, wall);
    const utc1 = wall - off1 * 3600000;
    const off2 = tzOffsetAt(city.tz, utc1);
    return off2 === off1 ? utc1 : wall - off2 * 3600000;
  }

  function searchCities(q, limit = 8) {
    if (!q) return [];
    const s = norm(q);
    if (!s) return [];
    if (bySlug.has(s)) return [bySlug.get(s)];
    const head = s.split(",")[0].trim() || s;
    const scored = [];
    for (const c of CITIES) {
      const n = norm(c.name);
      const nar = norm(c.name_ar || "");
      const nc = norm(`${c.name} ${c.country}`);
      const ncar = norm(`${c.name_ar || ""} ${c.country_ar || ""}`);
      let score = 0;
      if (n === s || nar === s || nc === s || ncar === s) score = 100;
      else if (n === head || nar === head) score = 95;
      else if (n.startsWith(s) || nar.startsWith(s) || n.startsWith(head) || nar.startsWith(head)) score = 85;
      else if (nc.startsWith(s) || ncar.startsWith(s)) score = 80;
      else if (c._s && c._s.startsWith(s)) score = 75;
      else if (n.includes(s) || nar.includes(s) || n.includes(head) || nar.includes(head)) score = 65;
      else if (c._s && c._s.includes(s)) score = 55;
      if (score) scored.push({ c, score });
    }
    scored.sort((a, b) => b.score - a.score || (a.c.name || "").localeCompare(b.c.name || ""));
    return scored.slice(0, limit).map(x => x.c);
  }

  function findCity(q) {
    return searchCities(q, 1)[0] || null;
  }

  function cityLabel(c) {
    return cN(c) + ", " + cC(c);
  }

  /** Resolve a city from slug or typed value. */
  function resolveCityFromField(cityInp, pendingSlug) {
    const slug = pendingSlug || cityInp?.dataset?.coCity || cityInp?.dataset?.slug;
    if (slug && bySlug.has(slug)) return bySlug.get(slug);
    if (!cityInp) return null;
    return findCity(cityInp.value);
  }

  /** Show chosen city as real text in Close Ones fields (not a faded placeholder). */
  function setCityFieldValue(input, city) {
    if (!input || !city) return;
    input.value = cityLabel(city);
    input.dataset.coCity = city.slug;
    delete input.dataset.slug;
    if (window.CTH_CITY_INP) {
      window.CTH_CITY_INP.ensurePh(input);
      input.placeholder = input.dataset.cthPh;
    }
  }

  function showCityInInput(input, city) {
    if (!input || !city) return;
    setCityFieldValue(input, city);
  }

  function resetCityField(input) {
    if (!input) return;
    input.value = "";
    delete input.dataset.coCity;
    delete input.dataset.slug;
    if (window.CTH_CITY_INP) window.CTH_CITY_INP.reset(input);
  }

  function bindCityFieldInput(input, onCity) {
    if (!input) return;
    input.addEventListener("input", () => {
      const v = norm(input.value);
      if (!v) {
        delete input.dataset.coCity;
        delete input.dataset.slug;
        onCity(null);
        return;
      }
      delete input.dataset.coCity;
      delete input.dataset.slug;
      onCity(findCity(input.value));
    });
  }

  function cityDateStr(city, dayOff = 0) {
    const y = cityYmd(city, dayOff);
    const p = n => String(n).padStart(2, "0");
    return `${y.y}-${p(y.m + 1)}-${p(y.day)}`;
  }

  function dayOffForCityDate(city, dateStr, maxDays = FIXED_DATE_MAX_DAYS) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || "").trim());
    if (!m || !city) return null;
    const target = { y: +m[1], mo: +m[2] - 1, day: +m[3] };
    for (let d = 0; d <= maxDays; d++) {
      const y = cityYmd(city, d);
      if (y.y === target.y && y.m === target.mo && y.day === target.day) return d;
    }
    return null;
  }

  function fixedDateForPerson(person, rule) {
    if (rule?.date && /^\d{4}-\d{2}-\d{2}$/.test(rule.date)) return rule.date;
    const city = bySlug.get(person?.city);
    if (!city) return "";
    if (rule?.dow != null) {
      for (let d = 0; d <= 7; d++) {
        const y = cityYmd(city, d);
        if (y.dow === rule.dow) return cityDateStr(city, d);
      }
    }
    return cityDateStr(city, 0);
  }

  function formatFixedDateLabel(dateStr, city) {
    if (!dateStr || !city) return dateStr || "";
    const off = dayOffForCityDate(city, dateStr);
    if (off == null) return dateStr;
    try {
      return new Intl.DateTimeFormat(LANG === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
        weekday: "long", month: "short", day: "numeric", timeZone: city.tz,
      }).format(new Date(localToUtcMs(city, 12, 0, off)));
    } catch (e) { return dateStr; }
  }

  function migrateFixedRule(person, rule) {
    if (!rule || rule.type !== "fixed") return;
    if (rule.dow != null && rule.repeatWeekly == null) rule.repeatWeekly = true;
    if (rule.date && /^\d{4}-\d{2}-\d{2}$/.test(rule.date)) return;
    rule.date = fixedDateForPerson(person, rule);
  }

  function guessHome() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const h = CITIES.find(c => c.tz === tz);
      if (h) return h.slug;
    } catch (e) {}
    return (CITIES.find(c => c.slug === "cairo") || CITIES[0] || {}).slug;
  }

  // Prayer times shift a few minutes every day, so a reminder for tomorrow (or
  // for the week we export) must use *that day's* times — not today's. AlAdhan's
  // calendar endpoint returns a whole month, so one request covers every day.
  const parseTimings = t => PKEYS.map(k => {
    const [h, m] = (t[k] || "0:0").split(" ")[0].split(":").map(Number);
    return { key: k, h, m };
  });

  function fetchMonth(city, y, mo) {
    const key = `${city.slug}:${y}-${mo}`;
    if (prayerCache.has(key)) return prayerCache.get(key);
    const url = `https://api.aladhan.com/v1/calendar/${y}/${mo}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method ?? 3}`;
    const p = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      try {
        const res = await fetch(url, { cache: "default", signal: ctrl.signal });
        if (!res.ok) throw new Error("calendar");
        const { data } = await res.json();
        const map = new Map();
        (data || []).forEach(d => {
          const g = d && d.date && d.date.gregorian && d.date.gregorian.date; // DD-MM-YYYY
          if (!g || !d.timings) return;
          const [dd, mm, yy] = g.split("-").map(Number);
          map.set(`${yy}-${mm}-${dd}`, parseTimings(d.timings));
        });
        if (!map.size) throw new Error("calendar-empty");
        return map;
      } finally { clearTimeout(timer); }
    })();
    prayerCache.set(key, p);
    p.catch(() => prayerCache.delete(key)); // let a failed month be retried
    return p;
  }

  // The prayers for this city on the day `dayOff` days from today (its own date).
  async function prayersForDay(city, dayOff = 0) {
    const ymd = cityYmd(city, dayOff);
    const map = await fetchMonth(city, ymd.y, ymd.m + 1);
    return map.get(`${ymd.y}-${ymd.m + 1}-${ymd.day}`) || null;
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
      if (!rule.date || !/^\d{4}-\d{2}-\d{2}$/.test(rule.date)) delete rule.date;
    }
  }

  function normalizePersonRules(person) {
    if (!person?.rules) return;
    for (const r of person.rules) {
      normalizeRule(r);
      migrateFixedRule(person, r);
    }
  }

  function normalizeAllRules() {
    for (const p of state.people) {
      if (!Array.isArray(p.rules)) { p.rules = []; continue; }
      normalizePersonRules(p);
    }
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") {
        state.you = raw.you || "";
        state.people = Array.isArray(raw.people) ? raw.people.slice(0, MAX_PEOPLE) : [];
        // A draft that was never saved shouldn't come back to life on reload —
        // editing persists as you type, so drafts can reach storage.
        for (const p of state.people) {
          if (Array.isArray(p.rules)) p.rules = p.rules.filter(r => !r || !r.draft);
        }
        normalizeAllRules();
      }
    } catch (e) {}
  }

  function saveState() {
    normalizeAllRules();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    updateUrl();
    maybeSyncNativeReminders();
  }

  function hasNativeReminderBridge() {
    return !!(window.AndroidApp && typeof AndroidApp.enableCloseOnesReminders === "function");
  }

  function utcStampGcal(ms) {
    const d = new Date(ms);
    const p = n => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  }

  function gcalUrlForWindow(w) {
    if (!w) return "";
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", w.label || w.person?.name || "Close Ones");
    u.searchParams.set("dates", `${utcStampGcal(w.start)}/${utcStampGcal(w.end)}`);
    if (w.rule?.waMsg) u.searchParams.set("details", w.rule.waMsg);
    return u.toString();
  }

  async function buildNativeAlarmPayload(horizonDays = EXPORT_HORIZON_DAYS) {
    if (!hasSetup()) return { lang: LANG, alarms: [] };
    let windows;
    try { windows = await allWindows(horizonDays); }
    catch (e) { return { lang: LANG, alarms: [] }; }
    const now = Date.now();
    const alarms = visibleWindows(windows)
      .filter(w => w.start > now)
      .slice(0, 48)
      .map(w => ({
        id: windowKey(w),
        at: w.start,
        title: w.person.name || (LANG === "ar" ? "أحبّك" : "Loved one"),
        body: w.label || "",
        phone: phoneDigits(w.person.phone) || "",
        waMsg: (w.rule && w.rule.waMsg) ? w.rule.waMsg : "",
      }));
    return { lang: LANG, alarms };
  }

  function maybeSyncNativeReminders() {
    try {
      if (localStorage.getItem("cth-co-notify") !== "1") return;
      if (!window.AndroidApp || typeof AndroidApp.syncCloseOnesReminders !== "function") return;
      buildNativeAlarmPayload(EXPORT_HORIZON_DAYS).then(p => {
        try { AndroidApp.syncCloseOnesReminders(JSON.stringify(p)); } catch (e) {}
      });
    } catch (e) {}
  }

  window.cthCloseOnesRequestSync = function(enableMode) {
    buildNativeAlarmPayload(EXPORT_HORIZON_DAYS).then(p => {
      const json = JSON.stringify(p);
      try {
        if (enableMode && AndroidApp.enableCloseOnesReminders) AndroidApp.enableCloseOnesReminders(json);
        else if (AndroidApp.syncCloseOnesReminders) AndroidApp.syncCloseOnesReminders(json);
      } catch (e) {}
    });
  };

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
    const city = bySlug.get(person.city);
    const when = formatFixedDateLabel(rule.date, city);
    return when ? T.fixedLineOn(n, rule.label || "", when) : T.fixedLine(n, rule.label || "");
  }

  function computeRuleWindows(person, city, prayersByDay, rule, horizonDays = DASH_HORIZON_DAYS) {
    const out = [];
    const add = (start, end, kind) => {
      if (end <= start) return;
      out.push({ start, end, kind, rule, person, city, label: ruleLabel(person, rule) });
    };
    const ruleHorizon = rule.type === "fixed"
      ? Math.max(horizonDays, FIXED_RULE_HORIZON_DAYS)
      : horizonDays;

    if (rule.type === "after" || rule.type === "before") {
      const off = effectiveOffsetMin(rule) * 60000;
      for (let dayOff = 0; dayOff <= ruleHorizon; dayOff++) {
        const dayPrayers = prayersByDay.get(dayOff);
        if (!dayPrayers) continue;
        const pr = dayPrayers.find(p => p.key === rule.prayer);
        if (!pr) continue;
        const pMs = localToUtcMs(city, pr.h, pr.m, dayOff);
        if (rule.type === "after") add(pMs + off, pMs + off + AFTER_WINDOW_MIN * 60000, "after");
        else add(pMs - off, pMs, "before");
      }
    } else if (rule.type === "fixed") {
      const rbMin = effectiveRemindBeforeMin(rule);
      const rb = rbMin * 60000;
      const [hh, mm] = (rule.time || "10:00").split(":").map(Number);
      const dayOffsets = [];
      const anchorDate = (rule.date && /^\d{4}-\d{2}-\d{2}$/.test(rule.date))
        ? rule.date
        : fixedDateForPerson(person, rule);
      if (rule.repeatWeekly && anchorDate) {
        const anchor = dayOffForCityDate(city, anchorDate, ruleHorizon);
        if (anchor != null) {
          for (let d = anchor; d <= ruleHorizon; d += 7) dayOffsets.push(d);
        }
      } else if (anchorDate) {
        const off = dayOffForCityDate(city, anchorDate, ruleHorizon);
        if (off != null && off >= 0 && off <= ruleHorizon) dayOffsets.push(off);
      }
      for (const d of dayOffsets) {
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
    const offH = tzOffsetAt(city.tz, ms);
    const d = new Date(ms + offH * 3600000);
    const p = n => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  }

  function agendaBuckets(windows) {
    const city = viewerCity();
    const now = Date.now();
    const todayKey = dayKeyForCity(now, city);
    const tomorrowKey = city ? cityDateStr(city, 1) : dayKeyForCity(now + 86400000, null);
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
      // Each day gets its own prayer times (they drift a few minutes daily).
      const maxDay = Math.max(horizonDays, FIXED_RULE_HORIZON_DAYS);
      const byDay = new Map();
      try {
        for (let d = 0; d <= maxDay; d++) {
          const pr = await prayersForDay(city, d);
          if (pr) byDay.set(d, pr);
        }
      } catch (e) { continue; }
      if (!byDay.size) continue;
      for (const rule of person.rules) {
        if (rule.draft) continue; // unsaved — it exists only in the editor
        windows.push(...computeRuleWindows(person, city, byDay, rule, horizonDays));
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

  function ruleWaMsg(pIdx, rIdx) {
    const p = state.people[+pIdx];
    const r = p && p.rules && p.rules[+rIdx];
    if (!r) return "";
    const live = document.querySelector(`.co-rule-wa[data-p="${pIdx}"][data-r="${rIdx}"]`);
    if (live && typeof live.value === "string") {
      r.waMsg = live.value;
      saveState();
      return live.value;
    }
    return r.waMsg || "";
  }

  function ruleRef(person, rule) {
    const pIdx = state.people.findIndex(p => p.id === person.id);
    let rIdx = 0;
    if (person.rules && person.rules.length) {
      if (rule && rule.id) rIdx = person.rules.findIndex(r => r.id === rule.id);
      else if (rule) rIdx = person.rules.indexOf(rule);
      if (rIdx < 0) rIdx = 0;
    }
    return { pIdx, rIdx };
  }

  function isGroup(person) {
    return !!person && person.kind === "group";
  }

  // A WhatsApp group is reached only through its invite link — there is no way to
  // prefill a message to a group, so groups carry a link, not a phone/waMsg.
  function normalizeGroupLink(raw) {
    const s = (raw || "").trim();
    if (!s) return "";
    const m = s.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    return m ? "https://chat.whatsapp.com/" + m[1] : "";
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
      <p class="co-wa-sheet-msg muted" hidden></p>
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
    const msgEl = sheet.querySelector(".co-wa-sheet-msg");
    if (msgEl) {
      if (msg && msg.trim()) {
        msgEl.textContent = msg;
        msgEl.hidden = false;
      } else {
        msgEl.textContent = "";
        msgEl.hidden = true;
      }
    }
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
    const msg = (el.dataset.coP != null && el.dataset.coR != null)
      ? ruleWaMsg(el.dataset.coP, el.dataset.coR)
      : (el.dataset.waMsg || "");
    if (kind === "wa") openWhatsApp(el.dataset.phone, msg);
    else openPhoneCall(el.dataset.phone);
  }

  function flashButton(btn) {
    if (!btn) return;
    btn.classList.add("is-pressed");
    setTimeout(() => btn.classList.remove("is-pressed"), 450);
  }

  function ruleKey(pIdx, rIdx) {
    return `${pIdx}-${rIdx}`;
  }

  function isRuleEditing(pIdx, rIdx) {
    return ruleEditing.has(ruleKey(pIdx, rIdx));
  }

  function lockFieldAttrs(locked) {
    return locked ? ' disabled aria-disabled="true"' : "";
  }

  function initReminderUi() {
    const web = $("#coWebReminder");
    const bar = $("#coNotifyBar");
    if (hasNativeReminderBridge()) {
      if (web) web.hidden = true;
      if (bar) {
        bar.hidden = false;
        initNotifyBar();
      }
      return;
    }
    // On the website there is no "notify me" toggle: reminders here are the
    // calendar buttons below (Google Calendar / Outlook .ics). The native push
    // toggle above is app-only. So keep both the hint and the bar hidden.
    if (web) web.hidden = true;
    if (bar) bar.hidden = true;
  }

  function initNotifyBar() {
    const bar = $("#coNotifyBar");
    const btn = $("#coNotifyToggle");
    const badge = $("#coNotifyBadge");
    if (!bar || !btn) return;

    bar.hidden = false;
    const title = $("#coNotifyTitle");
    const sub = $("#coNotifySub");
    if (title) title.textContent = T.notifyTitle;
    if (sub) sub.textContent = T.notifySub;
    if (badge) badge.hidden = true;

    bar.classList.add("is-ready");
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
    const on = localStorage.getItem("cth-co-notify") === "1";
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.addEventListener("click", async () => {
      const next = !btn.classList.contains("is-on");
      if (!next) {
        try {
          if (typeof AndroidApp.disableCloseOnesReminders === "function") AndroidApp.disableCloseOnesReminders();
        } catch (e) { return; }
        btn.classList.toggle("is-on", false);
        btn.setAttribute("aria-checked", "false");
        try { localStorage.setItem("cth-co-notify", "0"); } catch (e) {}
        toast(T.notifyDisabled);
        return;
      }
      let payload;
      try { payload = await buildNativeAlarmPayload(EXPORT_HORIZON_DAYS); }
      catch (e) { toast(T.errPrayer); return; }
      if (!payload.alarms.length) { toast(T.noRules); return; }
      try { AndroidApp.enableCloseOnesReminders(JSON.stringify(payload)); }
      catch (e) { return; }
      btn.classList.toggle("is-on", true);
      btn.setAttribute("aria-checked", "true");
      try { localStorage.setItem("cth-co-notify", "1"); } catch (e) {}
      toast(T.notifyEnabled);
      flashButton(btn);
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
    const cls = extraClass ? `co-actions ${extraClass}` : "co-actions";
    // A group is reached through its invite link — one button, no phone/call.
    if (isGroup(person)) {
      const link = normalizeGroupLink(person.waLink);
      if (!link) return "";
      return `<div class="${cls}">
        <a class="btn-ghost co-open-group" href="${esc(link)}" target="_blank" rel="noopener">${esc(T.openGroup)}</a>
      </div>`;
    }
    const d = phoneDigits(person.phone);
    if (!d) return "";
    const { pIdx, rIdx } = ruleRef(person, r);
    let html = `<div class="${cls}">`;
    if (SAFE_CONTACT) {
      html += `<button type="button" class="btn-ghost co-wa" data-phone="${esc(d)}" data-co-p="${pIdx}" data-co-r="${rIdx}">${esc(T.whatsapp)}</button>`;
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
    if (!n) return T.rulesCountNone;
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

  // The clocks below the hero already say the exact time, so this line carries the
  // countdown and the day — repeating "11:29 م" twice just made it noise.
  function heroCountdown(w, isOpen, left) {
    const tz = viewerCity()?.tz;
    if (isOpen) return `${T.open} · ${T.endsIn(left)}`;
    if (left <= 1) return `${T.now} · ${fmtDayOnly(w.start, tz)}`;
    if (left < 180) return `${T.inMin(left)} · ${fmtDayOnly(w.start, tz)}`;
    return T.heroOnDay(fmtDayOnly(w.start, tz));
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

  // The window label ("20 min after Maghrib — Khaled") answers *what rule fired*.
  // The hero answers *what you should do*, so it needs its own sentence.
  function heroTitle(w) {
    const name = w.person.name || "";
    if (w.rule.type === "before") return T.heroNudge(name, w.rule.prayer);
    if (w.rule.type === "fixed") return T.heroRemind(name, w.rule.label || "");
    return T.heroCall(name);
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
    const you = viewerCity();
    const youCityName = you ? cN(you) : (LANG === "ar" ? "مدينتك" : "Your city");
    const range = T.themWindowRange(fmtAt(w.start, w.city.tz), fmtAt(w.end, w.city.tz));
    // Two clocks only earn their space when they disagree. Family in your own city
    // is the common case — showing the same time twice looks broken.
    const sameZone = !!you && (you.slug === w.city.slug || you.tz === w.city.tz);
    const clocks = sameZone
      ? `<div class="co-clock co-clock--you co-clock--solo">
          <span class="co-clock-tag">${esc(T.heroYouAt)}</span>
          <strong class="co-clock-val">${esc(fmtAt(w.start, you.tz))}</strong>
          <span class="co-clock-city muted">${esc(youCityName)} · ${esc(range)}</span>
        </div>`
      : `<div class="co-clock co-clock--you">
          <span class="co-clock-tag">${esc(T.heroYouAt)}</span>
          <strong class="co-clock-val">${esc(fmtAt(w.start, you?.tz))}</strong>
          <span class="co-clock-city muted">${esc(youCityName)}</span>
        </div>
        <div class="co-clock co-clock--them">
          <span class="co-clock-tag">${esc(T.heroThemAt(cN(w.city)))}</span>
          <strong class="co-clock-val">${esc(fmtAt(w.start, w.city.tz))}</strong>
          <span class="co-clock-city muted">${esc(range)}</span>
        </div>`;
    return `<section class="co-hero${isOpen ? " co-hero--open" : ""}" aria-label="${esc(isOpen ? T.heroOpen : T.heroNext)}">
      <p class="co-hero-k">${esc(isOpen ? T.heroOpen : T.heroNext)}</p>
      <h3 class="co-hero-title">${esc(heroTitle(w))}</h3>
      <p class="co-hero-when">${esc(when)}</p>
      <div class="co-hero-clocks${sameZone ? " co-hero-clocks--solo" : ""}">${clocks}</div>
      <p class="co-hero-rule muted">${esc(T.heroRuleSub(w.label, windowDurationMin(w)))}</p>
      ${renderActions(w.person, w.rule, w)}
    </section>`;
  }

  function renderAgendaItem(w) {
    const inM = minsUntil(w.start);
    const you = viewerCity();
    const youTz = you?.tz;
    const atFull = fmtDateLong(w.start, youTz);
    const rel = inM <= 1 ? T.now : (inM < 180 ? T.inMin(inM) : "");
    const when = rel ? `${rel} · ${atFull}` : atFull;
    const youAt = fmtAt(w.start, youTz);
    const themAt = fmtAt(w.start, w.city.tz);
    return `<li class="co-agenda-item">
      <span class="co-agenda-when">${esc(when)}</span>
      <span class="co-agenda-label">${esc(w.label)}</span>
      <span class="co-agenda-at muted">${esc(T.agendaYouAt(youAt, `${themAt} · ${cN(w.city)}`))}</span>
    </li>`;
  }

  function renderExportActionsHtml(windows) {
    if (!hasSetup()) return "";
    const now = Date.now();
    const nextWin = windows.find(w => w.end > now);
    const gcalHref = nextWin ? gcalUrlForWindow(nextWin) : "";
    return `<div class="pl-actions co-cal-actions">
      ${gcalHref ? `<a class="btn-primary co-export-gcal" href="${esc(gcalHref)}" target="_blank" rel="noopener" title="${esc(T.exportGcalHint)}">${esc(T.exportGcal)}</a>` : ""}
      <button type="button" class="btn-ghost co-export-cal" title="${esc(T.exportCalHint)}">${esc(T.exportCal)}</button>
    </div>`;
  }

  function renderDayAgendaHtml(windows, skipKey) {
    const { today, tomorrow } = agendaBuckets(windows);
    const filt = list => list.filter(w => windowKey(w) !== skipKey);
    const todayF = filt(today);
    const tomorrowF = filt(tomorrow);
    const later = laterWindows(windows, today, tomorrow, skipKey);
    const exportHtml = renderExportActionsHtml(windows);
    if (!todayF.length && !tomorrowF.length && !later.length) {
      // Only truly empty if nothing was filtered out: when the one window we have
      // is the one already shown above, saying "nothing" contradicts the screen.
      const heroShown = !!skipKey && windows.some(w => windowKey(w) === skipKey);
      return `<section class="co-day-agenda co-day-agenda--empty">
        <h3 class="co-agenda-title">${esc(T.todayTitleOn(fmtCalendarDay(0)))}</h3>
        <p class="co-agenda-lead muted">${esc(heroShown ? T.scheduleEmptyOther : T.scheduleEmpty)}</p>
        ${exportHtml}
      </section>`;
    }
    let html = `<section class="co-day-agenda" aria-labelledby="coScheduleTitle">
      <div class="co-agenda-head">
        <div>
          <h3 class="co-agenda-title" id="coScheduleTitle">${esc(T.todayTitleOn(fmtCalendarDay(0)))}</h3>
          <p class="co-agenda-lead muted">${esc(T.scheduleLead)}</p>
        </div>
        ${exportHtml}
      </div>`;
    if (todayF.length) {
      html += `<ul class="co-agenda-list">${todayF.map(w => renderAgendaItem(w)).join("")}</ul>`;
    }
    if (tomorrowF.length) {
      html += `<h4 class="co-agenda-sub">${esc(T.tomorrowTitleOn(fmtCalendarDay(1)))}</h4>`;
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
    return "";
  }

  function bindDashActions(root) {
    if (!root) return;
    root.querySelectorAll(".co-done").forEach(btn => {
      btn.addEventListener("click", () => {
        flashButton(btn);
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
    if (exp) exp.addEventListener("click", () => { flashButton(exp); downloadCalendar(); });
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
      const locked = !isRuleEditing(idx, ri);
      const dis = lockFieldAttrs(locked);
      const typeSel = `<select class="co-rule-type" data-p="${idx}" data-r="${ri}"${dis}>
        <option value="after"${r.type === "after" ? " selected" : ""}>${esc(T.ruleAfter)}</option>
        <option value="before"${r.type === "before" ? " selected" : ""}>${esc(T.ruleBefore)}</option>
        <option value="fixed"${r.type === "fixed" ? " selected" : ""}>${esc(T.ruleFixed)}</option>
      </select>`;
      const prayerSel = `<select class="co-rule-prayer" data-p="${idx}" data-r="${ri}"${dis}>
        ${PKEYS.map(k => `<option value="${k}"${r.prayer === k ? " selected" : ""}>${esc(PNAME[k])}</option>`).join("")}
      </select>`;
      const offVal = effectiveOffsetMin(r);
      const offset = `<input type="number" class="co-rule-offset" min="${PRAYER_OFFSET_MIN}" max="${PRAYER_OFFSET_MAX}" step="5" value="${offVal}" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.offsetMin)}"${dis} />`;
      const cityForRule = bySlug.get(person.city);
      const dateVal = fixedDateForPerson(person, r);
      const maxDate = cityForRule ? cityDateStr(cityForRule, FIXED_DATE_MAX_DAYS) : "";
      const minDate = cityForRule ? cityDateStr(cityForRule, 0) : "";
      const dateIn = `<label class="co-mini co-rule-date-wrap">${esc(T.fixedDate)}
        <input type="date" class="co-rule-date" value="${esc(dateVal)}"${minDate ? ` min="${esc(minDate)}"` : ""}${maxDate ? ` max="${esc(maxDate)}"` : ""} data-p="${idx}" data-r="${ri}" aria-label="${esc(T.fixedDate)}"${dis} />
        <span class="co-mini co-rule-hint">${esc(T.fixedDateHint)}</span>
      </label>`;
      const weekly = `<label class="co-mini co-rule-weekly-wrap"><input type="checkbox" class="co-rule-weekly" data-p="${idx}" data-r="${ri}"${r.repeatWeekly ? " checked" : ""}${dis} /> ${esc(T.fixedWeekly)}</label>`;
      const timeIn = `<input type="time" class="co-rule-time" value="${esc(r.time || "10:00")}" data-p="${idx}" data-r="${ri}"${dis} />`;
      const labelIn = `<input type="text" class="co-rule-label" value="${esc(r.label || "")}" placeholder="${esc(T.fixedLabelPh)}" data-p="${idx}" data-r="${ri}"${dis} />`;
      const rbVal = effectiveRemindBeforeMin(r);
      const remind = `<input type="number" class="co-rule-remind" min="${REMIND_MIN}" max="${REMIND_MAX}" step="5" value="${rbVal}" data-p="${idx}" data-r="${ri}" aria-label="${esc(T.remindBefore)}"${dis} />`;
      const wa = `<div class="co-wa-wrap"><input type="text" class="co-rule-wa" value="${esc(r.waMsg || "")}" placeholder="${esc(T.waMsgPh)}" data-p="${idx}" data-r="${ri}" aria-describedby="coWaSaved-${idx}-${ri}"${dis} /><span id="coWaSaved-${idx}-${ri}" class="co-wa-saved-hint" hidden aria-live="polite"></span></div>`;
      const detail = r.type === "fixed"
        ? `<div class="co-rule-detail">${labelIn} ${dateIn} ${timeIn} ${weekly} <label class="co-mini">${esc(T.remindBefore)}</label> ${remind} <span class="co-mini co-rule-hint">${esc(T.remindHint)}</span> ${wa}</div>`
        : `<div class="co-rule-detail">${prayerSel} <label class="co-mini">${esc(T.offsetMin)}</label> ${offset} ${wa}</div>`;
      const actions = `<div class="co-rule-actions pl-actions">
        <button type="button" class="btn-ghost co-rule-save" data-p="${idx}" data-r="${ri}">${esc(T.save)}</button>
        <button type="button" class="btn-ghost co-rule-edit" data-p="${idx}" data-r="${ri}"${locked ? "" : " hidden"}>${esc(T.editRule)}</button>
        <button type="button" class="btn-ghost co-rule-remove" data-p="${idx}" data-r="${ri}">${esc(T.remove)}</button>
      </div>`;
      return `<div class="co-rule${locked ? " is-locked" : " is-editing"}" data-p="${idx}" data-r="${ri}">
        ${typeSel} ${detail}
        ${actions}
      </div>`;
    }).join("");

    return `<article class="co-person${expandedPeople.has(idx) ? " is-open" : ""}" data-idx="${idx}">
      <button type="button" class="co-person-toggle" data-idx="${idx}" aria-expanded="${expandedPeople.has(idx) ? "true" : "false"}">
        <span class="co-person-toggle-main">
          <strong class="co-person-name">${isGroup(person) ? `<span class="co-group-tag">${esc(T.groupTag)}</span> ` : ""}${esc(person.name)}</strong>
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
          <div class="pl-actions co-person-rule-actions">
            <button type="button" class="btn-ghost co-add-rule" data-idx="${idx}">${esc(T.addRuleNew)}</button>
          </div>
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

  function applyAddKind(kind) {
    const group = kind === "group";
    const phoneField = document.querySelector("#coAddSheet .co-phone-field");
    const groupField = document.querySelector("#coAddSheet .co-group-field");
    const nameInput = $("#coPersonName");
    if (phoneField) phoneField.hidden = group;
    if (groupField) groupField.hidden = !group;
    if (nameInput) nameInput.placeholder = group ? T.groupNamePh : (LANG === "ar" ? "مثال: أمي" : "e.g. Mum");
  }

  function initAddSheet() {
    const sheet = $("#coAddSheet");
    if (!sheet) return;
    sheet.querySelector(".co-add-sheet-close")?.addEventListener("click", closeAddSheet);
    sheet.addEventListener("click", e => { if (e.target === sheet) closeAddSheet(); });
    sheet.querySelectorAll('input[name="coKind"]').forEach(r =>
      r.addEventListener("change", () => applyAddKind(r.value)));
    applyAddKind(sheet.querySelector('input[name="coKind"]:checked')?.value || "person");
  }

  function addPerson(data) {
    if (state.people.length >= MAX_PEOPLE) { toast(T.maxPeople(MAX_PEOPLE)); return; }
    const city = (data.citySlug && bySlug.get(data.citySlug)) || findCity(data.cityInput);
    if (!city) { toast(T.pickCity); return; }
    // The reminder is whatever they picked in the sheet — never one we invent for
    // them: a rule nobody chose is a notification nobody expects.
    const preset = T.presets[data.preset] || T.presets.later;
    const group = data.kind === "group";
    const name = (data.name || "").trim() ||
      (group ? (LANG === "ar" ? "العيلة" : "The group") : (LANG === "ar" ? "أحبّني" : "Loved one"));
    const entry = {
      id: uid(),
      name,
      city: city.slug,
      dial: city.dial || "",
      rules: preset.rule ? [{ id: uid(), ...preset.rule }] : [],
    };
    if (group) { entry.kind = "group"; entry.waLink = normalizeGroupLink(data.waLink); }
    else { entry.phone = buildFullPhone(city, data.phone || ""); }
    state.people.push(entry);
    const newIdx = state.people.length - 1;
    expandedPeople.clear();
    expandedPeople.add(newIdx);
    // Only drop them straight into the editor when there is nothing to edit yet.
    if (!preset.rule) ruleEditing.add(ruleKey(newIdx, 0));
    saveState();
    renderPeople();
    scheduleDashboard();
    closeAddSheet();
    setTab("people");
    const withRule = !!preset.rule;
    toast(group
      ? (withRule ? T.addedGroupRule(name, preset.when, cN(city)) : T.addedGroup(name))
      : (withRule ? T.addedToastRule(name, preset.when, cN(city)) : T.addedToast(name)));
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
    ruleEditing.add(ruleKey(idx, p.rules.length - 1));
    saveState();
    renderPeople();
    scheduleDashboard();
  }

  function syncRuleFromDom(pIdx, rIdx) {
    const card = document.querySelector(`.co-rule[data-p="${pIdx}"][data-r="${rIdx}"]`);
    if (!card) return;
    card.querySelectorAll("[data-p][data-r]").forEach(el => {
      if (+el.dataset.p !== pIdx || +el.dataset.r !== rIdx) return;
      onRuleChange(el, false, { persist: false });
    });
    const wa = card.querySelector(".co-rule-wa");
    if (wa) {
      const p = state.people[pIdx];
      const r = p && p.rules[rIdx];
      if (r) r.waMsg = wa.value;
    }
  }

  function saveRuleCard(pIdx, rIdx, btn) {
    syncRuleFromDom(pIdx, rIdx);
    const r = state.people[pIdx]?.rules[rIdx];
    if (r) delete r.draft; // saving is what turns a draft into a live reminder
    saveState();
    ruleEditing.delete(ruleKey(pIdx, rIdx));
    toast(T.saved);
    flashButton(btn);
    scheduleDashboard();
    renderPeople();
  }

  function editRuleCard(pIdx, rIdx, btn) {
    ruleEditing.add(ruleKey(pIdx, rIdx));
    flashButton(btn);
    renderPeople();
    requestAnimationFrame(() => {
      const card = document.querySelector(`.co-rule[data-p="${pIdx}"][data-r="${rIdx}"]`);
      const first = card && card.querySelector(".co-rule-detail input, .co-rule-detail select, .co-rule-type");
      if (first) first.focus();
    });
  }

  function onRuleChange(el, fullRerender, opts = {}) {
    const p = state.people[+el.dataset.p];
    const r = p && p.rules[+el.dataset.r];
    if (!r) return;
    if (el.classList.contains("co-rule-type")) {
      r.type = el.value;
      if (r.type === "fixed") {
        r.date = fixedDateForPerson(p, r);
        if (r.repeatWeekly == null) r.repeatWeekly = false;
      }
      normalizeRule(r);
      fullRerender = true;
    }
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
    else if (el.classList.contains("co-rule-date")) {
      r.date = el.value;
      if (!r.date) migrateFixedRule(p, r);
    }
    else if (el.classList.contains("co-rule-weekly")) r.repeatWeekly = !!el.checked;
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
    if (opts.persist !== false) {
      saveState();
      if (fullRerender) renderPeople();
      scheduleDashboard();
    }
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
        if (p) {
          // A rule you are still writing is a draft: it must not create windows,
          // reach the dashboard, or schedule a real notification before you save.
          p.rules.push({ id: uid(), type: "after", prayer: "Fajr", offsetMin: 30, draft: true });
          const ri = p.rules.length - 1;
          ruleEditing.add(ruleKey(+addR.dataset.idx, ri));
          flashButton(addR);
          renderPeople();
        }
        return;
      }
      const saveR = e.target.closest(".co-rule-save");
      if (saveR) {
        saveRuleCard(+saveR.dataset.p, +saveR.dataset.r, saveR);
        return;
      }
      const editR = e.target.closest(".co-rule-edit");
      if (editR) {
        editRuleCard(+editR.dataset.p, +editR.dataset.r, editR);
        return;
      }
      const delR = e.target.closest(".co-rule-remove");
      if (delR) {
        flashButton(delR);
        const p = state.people[+delR.dataset.p];
        if (p) {
          p.rules.splice(+delR.dataset.r, 1);
          ruleEditing.clear();
          saveState();
          renderPeople();
          scheduleDashboard();
        }
      }
    });
    box.addEventListener("change", e => {
      const el = e.target;
      if (!el.dataset.p && el.dataset.p !== "0") return;
      if (el.closest(".co-rule.is-locked")) return;
      onRuleChange(el, el.classList.contains("co-rule-type") || el.classList.contains("co-rule-weekly"));
    });
    box.addEventListener("blur", e => {
      const el = e.target;
      if (el.closest(".co-rule.is-locked")) return;
      if (el.classList.contains("co-rule-wa")) {
        saveWaMsg(el, true);
        return;
      }
      if (!el.classList.contains("co-rule-offset") && !el.classList.contains("co-rule-remind")) return;
      onRuleChange(el, false);
    }, true);
    box.addEventListener("input", e => {
      const el = e.target;
      if (el.closest(".co-rule.is-locked")) return;
      if (!el.classList.contains("co-rule-wa")) return;
      saveWaMsg(el, false);
    });
  }

  function saveWaMsg(el, announce) {
    const p = state.people[+el.dataset.p];
    const r = p && p.rules[+el.dataset.r];
    if (!r) return;
    r.waMsg = el.value;
    saveState();
    if (!announce) return;
    toast(T.msgSaved);
    el.classList.add("is-saved");
    setTimeout(() => el.classList.remove("is-saved"), 1800);
    const hint = document.getElementById(el.getAttribute("aria-describedby") || "");
    if (hint) {
      hint.textContent = T.msgSaved;
      hint.hidden = false;
      setTimeout(() => { hint.hidden = true; hint.textContent = ""; }, 2400);
    }
  }

  function autocomplete(input, listEl, onChoose) {
    if (!input || !listEl) return;
    let items = [], active = -1, pickLock = false;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? searchCities(input.value, 8) : [];
      if (!items.length) { listEl.innerHTML = q ? `<li class="ac-empty">—</li>` : ""; listEl.hidden = !q; return; }
      listEl.innerHTML = items.map((c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) {
      const c = items[i];
      if (!c) return;
      pickLock = true;
      showCityInInput(input, c);
      input.blur();
      onChoose(c);
      close();
      setTimeout(() => { pickLock = false; }, 250);
    }
    function maybeAutoPickOnBlur() {
      if (pickLock || input.dataset.coCity) return;
      const q = (input.value || "").trim();
      if (!q) return;
      const hit = findCity(q);
      if (!hit) return;
      showCityInInput(input, hit);
      onChoose(hit);
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
    const onListPick = (e, idx) => {
      e.preventDefault();
      e.stopPropagation();
      pick(idx);
    };
    listEl.addEventListener("mousedown", e => {
      const li = e.target.closest(".ac-item[data-i]");
      if (li) e.preventDefault();
    });
    listEl.addEventListener("click", e => {
      const li = e.target.closest(".ac-item[data-i]");
      if (!li) return;
      onListPick(e, +li.dataset.i);
    });
    listEl.addEventListener("pointerdown", e => {
      const li = e.target.closest(".ac-item[data-i]");
      if (!li) return;
      onListPick(e, +li.dataset.i);
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (!pickLock) maybeAutoPickOnBlur();
        if (!pickLock) close();
      }, 180);
    });
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
    if (y) state.you = y.slug;
  }

  function syncYouField() {
    const youInp = $("#coYou");
    const youCity = state.you && bySlug.get(state.you);
    if (youInp && youCity) setCityFieldValue(youInp, youCity);
  }

  async function initPage() {
    if (!$("#coDash")) return;
    applyParams();
    if (!state.you) {
      const c = bySlug.get(guessHome());
      if (c) state.you = c.slug;
    }
    syncYouField();

    autocomplete($("#coYou"), $("#coYouAc"), c => {
      state.you = c.slug;
      saveState();
      renderYouChip();
      scheduleDashboard();
    });

    bindCityFieldInput($("#coYou"), c => {
      if (c) {
        state.you = c.slug;
        saveState();
        renderYouChip();
        scheduleDashboard();
      } else if (!norm($("#coYou")?.value || "")) {
        state.you = "";
        saveState();
        renderYouChip();
        scheduleDashboard();
      }
    });

    let pendingPersonCity = "";
    autocomplete($("#coPersonCity"), $("#coPersonCityAc"), c => {
      pendingPersonCity = c.slug;
      requestAnimationFrame(() => updateDialUI(c));
    });

    bindCityFieldInput($("#coPersonCity"), c => {
      pendingPersonCity = c ? c.slug : "";
      updateDialUI(c);
    });
    const form = $("#coForm");
    initTabs();
    initAddSheet();
    renderYouChip();
    updateDialUI(null);

    if (form) form.addEventListener("submit", e => {
      e.preventDefault();
      const name = ($("#coPersonName")?.value || "").trim();
      if (!name) { toast(T.personName); $("#coPersonName")?.focus(); return; }
      const kind = form.querySelector('input[name="coKind"]:checked')?.value || "person";
      const phone = $("#coPersonPhone")?.value || "";
      const linkRaw = $("#coGroupLink")?.value || "";
      // A pasted group link that isn't a real invite is a silent dead button later —
      // reject it now rather than store something that won't open.
      if (kind === "group" && linkRaw.trim() && !normalizeGroupLink(linkRaw)) {
        toast(T.groupLinkBad); $("#coGroupLink")?.focus(); return;
      }
      const cityField = $("#coPersonCity");
      let city = resolveCityFromField(cityField, pendingPersonCity);
      if (!city && cityField?.value?.trim()) city = findCity(cityField.value);
      const cityIn = city ? cityLabel(city) : (cityField?.value || cityField?.placeholder || "");
      const preset = form.querySelector('input[name="coPreset"]:checked')?.value || "later";
      addPerson({ name, phone, waLink: linkRaw, kind, preset, citySlug: city ? city.slug : "", cityInput: cityIn });
      $("#coPersonName").value = "";
      $("#coPersonPhone").value = "";
      if ($("#coGroupLink")) $("#coGroupLink").value = "";
      const personKind = form.querySelector('input[name="coKind"][value="person"]');
      if (personKind) personKind.checked = true;
      applyAddKind("person");
      const first = form.querySelector('input[name="coPreset"]');
      if (first) first.checked = true;
      pendingPersonCity = "";
      if (cityField) resetCityField(cityField);
      updateDialUI(null);
    });

    bindPeopleEvents();
    bindAppContactClicks();
    initReminderUi();
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
    maybeSyncNativeReminders();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
