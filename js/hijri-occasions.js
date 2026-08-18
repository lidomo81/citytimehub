/* =====================================================================
   CityTimeHub — js/hijri-occasions.js
   Shared Hijri occasion dates via the browser Umm al-Qura calendar (Intl).
   Gregorian dates come from day-by-day conversion, not fixed month lengths.
   ===================================================================== */
(() => {
  "use strict";

  const OCC = [
    { m: 1,  d: 1,  em: "🌙", en: "Islamic New Year", ar: "بداية السنة الهجرية" },
    { m: 1,  d: 10, em: "🤲", en: "Ashura", ar: "عاشوراء" },
    { m: 3,  d: 12, em: "🌟", en: "Mawlid an-Nabi", ar: "المولد النبوي" },
    { m: 7,  d: 27, em: "✨", en: "Isra and Mi'raj", ar: "الإسراء والمعراج", observed: true },
    { m: 9,  d: 1,  em: "🌙", en: "Start of Ramadan", ar: "بداية رمضان" },
    { m: 9,  d: 21, em: "🌙", en: "Last ten days of Ramadan", ar: "بداية العشر الأواخر من رمضان" },
    { m: 10, d: 1,  em: "🕌", en: "Eid al-Fitr", ar: "عيد الفطر" },
    { m: 12, d: 9,  em: "🕋", en: "Day of Arafah", ar: "يوم عرفة" },
    { m: 12, d: 10, em: "🐑", en: "Eid al-Adha", ar: "عيد الأضحى" }
  ];

  function langFromDoc() {
    return ((document.documentElement.getAttribute("lang") || "en").slice(0, 2) === "ar") ? "ar" : "en";
  }

  function hijriParts(date) {
    const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric"
    }).formatToParts(date);
    return {
      y: +p.find(x => x.type === "year").value,
      m: +p.find(x => x.type === "month").value,
      d: +p.find(x => x.type === "day").value
    };
  }

  function hijriMonthIndex(h) { return h.y * 12 + h.m; }

  function todayStart() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function nextOf(m, d, fromDate) {
    const today = fromDate || todayStart();
    for (let i = 0; i < 420; i++) {
      const dt = new Date(today.getTime() + i * 86400000);
      const h = hijriParts(dt);
      if (h.m === m && h.d === d) return { date: dt, days: i, hijri: h };
    }
    return null;
  }

  function within12HijriMonths(occH, todayH) {
    const start = hijriMonthIndex(todayH);
    const end = start + 12;
    const idx = hijriMonthIndex(occH);
    return idx >= start && idx <= end;
  }

  function upcomingWithin12Months() {
    const today = todayStart();
    const todayH = hijriParts(today);
    return OCC.map(o => {
      const n = nextOf(o.m, o.d, today);
      if (!n) return null;
      if (!within12HijriMonths(n.hijri, todayH)) return null;
      return { o, date: n.date, days: n.days, hijri: n.hijri };
    }).filter(Boolean).sort((a, b) => a.days - b.days);
  }

  function upcoming(limit) {
    const all = upcomingWithin12Months();
    return limit ? all.slice(0, limit) : all;
  }

  function arDayPhrase(days, nfmt) {
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومين";
    const n = nfmt.format(days);
    const mod100 = days % 100;
    if (mod100 >= 3 && mod100 <= 10) return n + " أيام";
    if (mod100 >= 11 && mod100 <= 99) return n + " يومًا";
    return n + " يوم";
  }

  function whenLabel(days, ar, nfmt) {
    if (days === 0) return ar ? "اليوم" : "today";
    if (!ar) {
      if (days === 1) return "tomorrow";
      return "in ~" + nfmt.format(days) + " days";
    }
    return "بعد نحو " + arDayPhrase(days, nfmt);
  }

  function formatGregorian(date, ar, withTag) {
    const loc = ar ? "ar" : "en";
    const dfmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" });
    const base = dfmt.format(date);
    if (withTag === false) return base;
    return base + (ar ? " · تقريبي" : " · approx.");
  }

  function formatHijri(date, ar) {
    const cal = ar ? "ar-u-ca-islamic-umalqura" : "en-u-ca-islamic-umalqura";
    return new Intl.DateTimeFormat(cal, { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function observedNote(ar) {
    return ar ? "يُحيى في بلدان كثيرة" : "commonly observed";
  }

  function occasionsPath(ar) {
    return ar ? "/ar/occasions/" : "/occasions/";
  }

  window.CTH_HijriOccasions = {
    OCC,
    upcoming,
    upcomingWithin12Months,
    whenLabel,
    formatGregorian,
    formatHijri,
    observedNote,
    occasionsPath,
    langFromDoc,
    hijriParts
  };
})();
