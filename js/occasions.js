/* =====================================================================
   CityTimeHub — js/occasions.js
   A small "upcoming Islamic occasions" card. Fully client-side: the
   Hijri→Gregorian conversion uses the browser's built-in Umm al-Qura
   calendar (Intl), so it needs no API and works offline. Dates are
   shown as approximate because they depend on the moon sighting.
   Mounts right under the City pulse card, matching its styling.
   In app-mode: full card on Prayer tab; a one-line teaser on Home.
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

  function upcoming(limit) {
    return OCC.map(o => { const n = nextOf(o.m, o.d); return n ? { o, date: n.date, days: n.days } : null; })
      .filter(Boolean).sort((a, b) => a.days - b.days).slice(0, limit || 2);
  }

  function whenLabel(days, ar, nfmt) {
    if (days === 0) return ar ? "اليوم" : "today";
    if (days === 1) return ar ? "غدًا" : "tomorrow";
    return ar ? ("بعد " + nfmt.format(days) + " يومًا تقريبًا") : ("in ~" + nfmt.format(days) + " days");
  }

  function build() {
    const ar = lang() === "ar";
    const loc = ar ? "ar" : "en";
    const list = upcoming(2);
    if (!list.length) return "";

    const dfmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" });
    const nfmt = new Intl.NumberFormat(loc);

    const rows = list.map(x => {
      const name = ar ? x.o.ar : x.o.en;
      const when = whenLabel(x.days, ar, nfmt);
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

  function openPrayerOccasions() {
    if (window.CTH_AppTabs && typeof CTH_AppTabs.setActiveTab === "function") {
      CTH_AppTabs.setActiveTab("prayer", { smooth: true });
    } else {
      location.hash = "prayer";
    }
    setTimeout(() => {
      const el = document.getElementById("occasions");
      if (el) try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    }, 360);
  }

  function mountTeaser() {
    if (!document.documentElement.classList.contains("app-mode")) return;
    if (document.getElementById("occHomeTeaser")) return;
    const list = upcoming(1);
    if (!list.length) return;
    const ar = lang() === "ar";
    const nfmt = new Intl.NumberFormat(ar ? "ar" : "en");
    const x = list[0];
    const name = ar ? x.o.ar : x.o.en;
    const when = whenLabel(x.days, ar, nfmt);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "occHomeTeaser";
    btn.className = "occ-home-teaser";
    btn.setAttribute("aria-label", ar ? "المناسبات القادمة" : "Upcoming occasions");
    btn.innerHTML =
      '<span class="occ-home-em" aria-hidden="true">' + x.o.em + "</span>" +
      '<span class="occ-home-copy"><strong>' + name + "</strong><span>" + when + "</span></span>" +
      '<span class="occ-home-go" aria-hidden="true">→</span>';
    btn.addEventListener("click", openPrayerOccasions);

    const datebar = document.querySelector(".cp-devotion .datebar");
    if (datebar && datebar.parentNode) {
      datebar.insertAdjacentElement("afterend", btn);
      return;
    }
    const mid = document.querySelector(".cp-clock-mid");
    if (mid) mid.appendChild(btn);
  }

  function mount() {
    if (!document.getElementById("occasions")) {
      const host = document.getElementById("cityPulse") || document.getElementById("prayerGrid");
      if (!host) return false;
      const html = build();
      if (html) host.insertAdjacentHTML("afterend", html);
    }
    mountTeaser();
    return true;
  }

  function init() {
    let tries = 0;
    (function tick() {
      if (mount()) return;
      if (tries++ < 25) setTimeout(tick, 300);
    })();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
