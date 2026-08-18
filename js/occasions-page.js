/* =====================================================================
   CityTimeHub — js/occasions-page.js
   Renders /occasions/ and /ar/occasions/ from CTH_HijriOccasions.
   ===================================================================== */
(() => {
  "use strict";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderEntry(x, ar, nfmt, H, compact) {
    const name = ar ? x.o.ar : x.o.en;
    const when = H.whenLabel(x.days, ar, nfmt);
    const hijri = H.formatHijri(x.date, ar);
    const greg = H.formatGregorian(x.date, ar);
    const obs = x.o.observed
      ? '<p class="occ-entry-obs">' + esc(H.observedNote(ar)) + "</p>"
      : "";

    if (compact) {
      return '<li class="occ-timeline-item">'
        + '<span class="occ-tl-em" aria-hidden="true">' + x.o.em + "</span>"
        + '<div class="occ-tl-body">'
        + '<h3 class="occ-tl-name">' + esc(name) + "</h3>"
        + obs
        + '<dl class="occ-tl-dates">'
        + '<div><dt>' + (ar ? "هجري" : "Hijri") + "</dt><dd>" + esc(hijri) + "</dd></div>"
        + '<div><dt>' + (ar ? "ميلادي (تقريبي)" : "Gregorian (approx.)") + "</dt><dd>" + esc(greg) + "</dd></div>"
        + '<div><dt>' + (ar ? "متبقٍ" : "Countdown") + "</dt><dd>" + esc(when) + "</dd></div>"
        + "</dl></div></li>";
    }

    return '<article class="occ-hero-card">'
      + '<span class="occ-hero-em" aria-hidden="true">' + x.o.em + "</span>"
      + '<p class="occ-hero-kicker">' + (ar ? "أقرب مناسبة" : "Next up") + "</p>"
      + '<h2 class="occ-hero-name">' + esc(name) + "</h2>"
      + obs.replace("occ-entry-obs", "occ-hero-obs")
      + '<dl class="occ-hero-dates">'
      + '<div><dt>' + (ar ? "التاريخ الهجري" : "Hijri date") + "</dt><dd>" + esc(hijri) + "</dd></div>"
      + '<div><dt>' + (ar ? "التاريخ الميلادي التقريبي" : "Approx. Gregorian date") + "</dt><dd>" + esc(greg) + "</dd></div>"
      + '<div><dt>' + (ar ? "العد التنازلي التقريبي" : "Approx. countdown") + "</dt><dd>" + esc(when) + "</dd></div>"
      + "</dl></article>";
  }

  function render() {
    const H = window.CTH_HijriOccasions;
    if (!H) return;

    const ar = H.langFromDoc() === "ar";
    const nfmt = new Intl.NumberFormat(ar ? "ar" : "en");
    const list = H.upcomingWithin12Months();

    const heroEl = document.getElementById("occHero");
    const listEl = document.getElementById("occList");
    if (!heroEl || !listEl) return;

    if (!list.length) {
      heroEl.innerHTML = '<p class="muted">' + (ar ? "لا توجد مناسبات قادمة في النطاق الحالي." : "No upcoming occasions in the current range.") + "</p>";
      listEl.innerHTML = "";
      return;
    }

    heroEl.innerHTML = renderEntry(list[0], ar, nfmt, H, false);

    const rest = list.slice(1);
    if (!rest.length) {
      listEl.innerHTML = "";
      listEl.hidden = true;
      const head = document.getElementById("occListHead");
      if (head) head.hidden = true;
      return;
    }

    listEl.innerHTML = rest.map(x => renderEntry(x, ar, nfmt, H, true)).join("");
  }

  if (document.readyState !== "loading") render();
  else document.addEventListener("DOMContentLoaded", render);
})();
