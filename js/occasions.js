/* =====================================================================
   CityTimeHub — js/occasions.js
   A small "upcoming Islamic occasions" card. Fully client-side: the
   Hijri→Gregorian conversion uses the browser's built-in Umm al-Qura
   calendar (Intl), so it needs no API and works offline. Dates are
   shown as approximate because they depend on the moon sighting.
   Mounts right under the City pulse card, matching its styling.
   ===================================================================== */
(() => {
  "use strict";

  // Curated major occasions only (Hijri month, day). Intentionally excludes
  // minor/among-schools-disputed days to keep it respectful and universal.
  const OCC = [
    { m: 9,  d: 1,  em: "🌙", en: "Ramadan",         ar: "رمضان" },
    { m: 10, d: 1,  em: "🕌", en: "Eid al-Fitr",      ar: "عيد الفطر" },
    { m: 12, d: 9,  em: "🕋", en: "Day of Arafah",    ar: "يوم عرفة" },
    { m: 12, d: 10, em: "🐑", en: "Eid al-Adha",      ar: "عيد الأضحى" },
    { m: 1,  d: 1,  em: "🌙", en: "Islamic New Year", ar: "رأس السنة الهجرية" },
    { m: 1,  d: 10, em: "🤲", en: "Ashura",           ar: "عاشوراء" },
    { m: 3,  d: 12, em: "🌟", en: "Mawlid an-Nabi",   ar: "المولد النبوي" }
  ];

  const lang = () => ((document.documentElement.getAttribute("lang") || "en").slice(0, 2) === "ar" ? "ar" : "en");

  function hijri(date) {
    const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric" }).formatToParts(date);
    return { m: +p.find(x => x.type === "month").value, d: +p.find(x => x.type === "day").value };
  }

  function nextOf(m, d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 420; i++) {
      const dt = new Date(today.getTime() + i * 86400000);
      const h = hijri(dt);
      if (h.m === m && h.d === d) return { date: dt, days: i };
    }
    return null;
  }

  function build() {
    const ar = lang() === "ar";
    const loc = ar ? "ar" : "en";
    const list = OCC.map(o => { const n = nextOf(o.m, o.d); return n ? { o, date: n.date, days: n.days } : null; })
      .filter(Boolean).sort((a, b) => a.days - b.days).slice(0, 2);
    if (!list.length) return "";

    const dfmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" });
    const nfmt = new Intl.NumberFormat(loc);

    const rows = list.map(x => {
      const name = ar ? x.o.ar : x.o.en;
      let when;
      if (x.days === 0) when = ar ? "اليوم" : "today";
      else if (x.days === 1) when = ar ? "غدًا" : "tomorrow";
      else when = ar ? ("بعد " + nfmt.format(x.days) + " يومًا تقريبًا") : ("in ~" + nfmt.format(x.days) + " days");
      return '<li class="occ-item"><span class="occ-em" aria-hidden="true">' + x.o.em + "</span>"
        + '<span class="occ-main"><span class="occ-name">' + name + "</span>"
        + '<span class="occ-when">' + when + " · " + dfmt.format(x.date) + "</span></span></li>";
    }).join("");

    return '<div id="occasions" class="occasions" aria-live="polite">'
      + '<span class="occasions-kicker">' + (ar ? "المناسبات القادمة" : "Upcoming occasions") + "</span>"
      + '<ul class="occasions-list">' + rows + "</ul>"
      + '<p class="occasions-note">' + (ar ? "المواعيد تقريبية وتخضع لرؤية الهلال." : "Dates are approximate, subject to the moon sighting.") + "</p>"
      + "</div>";
  }

  function mount() {
    if (document.getElementById("occasions")) return true;
    const host = document.getElementById("cityPulse") || document.getElementById("prayerGrid");
    if (!host) return false;
    const html = build();
    if (!html) return true;
    host.insertAdjacentHTML("afterend", html);
    return true;
  }

  function init() {
    let tries = 0;
    (function tick() {
      if (mount()) return;              // done (or nothing to mount to yet)
      if (tries++ < 25) setTimeout(tick, 300);
    })();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
