/* =====================================================================
   CityTimeHub — js/occasions.js
   Clickable "upcoming occasion" card on Home and Prayer tab.
   Links to /occasions/ (full list). Uses js/hijri-occasions.js.
   ===================================================================== */
(() => {
  "use strict";

  function build() {
    const H = window.CTH_HijriOccasions;
    if (!H) return "";

    const ar = H.langFromDoc() === "ar";
    const list = H.upcoming(1);
    if (!list.length) return "";

    const nfmt = new Intl.NumberFormat(ar ? "ar" : "en");
    const x = list[0];
    const name = ar ? x.o.ar : x.o.en;
    const when = H.whenLabel(x.days, ar, nfmt);
    const greg = H.formatGregorian(x.date, ar, false);
    const path = H.occasionsPath(ar);
    const kicker = ar ? "المناسبات القادمة" : "Upcoming occasions";
    const note = ar
      ? "المواعيد تقريبية وتخضع لرؤية الهلال."
      : "Dates are approximate, subject to the moon sighting.";
    const aria = ar ? "عرض المناسبات الهجرية القادمة" : "View upcoming Islamic dates";

    const row =
      '<li class="occ-item"><span class="occ-em" aria-hidden="true">' + x.o.em + "</span>"
      + '<span class="occ-main"><span class="occ-name">' + name + "</span>"
      + '<span class="occ-when">' + when + " · " + greg + (ar ? " (تقريبي)" : " (approx.)") + "</span></span></li>";

    return '<a id="occasions" href="' + path + '" class="occasions occasions-link"'
      + ' aria-label="' + aria + '">'
      + '<span class="occasions-kicker">' + kicker + "</span>"
      + '<ul class="occasions-list">' + row + "</ul>"
      + '<span class="occasions-go" aria-hidden="true">→</span>'
      + '<p class="occasions-note">' + note + "</p>"
      + "</a>";
  }

  function mountTeaser() {
    if (!document.documentElement.classList.contains("app-mode")) return;
    if (document.getElementById("occHomeTeaser")) return;

    const H = window.CTH_HijriOccasions;
    if (!H) return;

    const list = H.upcoming(1);
    if (!list.length) return;

    const ar = H.langFromDoc() === "ar";
    const nfmt = new Intl.NumberFormat(ar ? "ar" : "en");
    const x = list[0];
    const name = ar ? x.o.ar : x.o.en;
    const when = H.whenLabel(x.days, ar, nfmt);
    const greg = H.formatGregorian(x.date, ar, false);
    const path = H.occasionsPath(ar);

    const link = document.createElement("a");
    link.href = path;
    link.id = "occHomeTeaser";
    link.className = "occ-home-teaser occ-home-link";
    link.setAttribute("aria-label", ar ? "المناسبات القادمة" : "Upcoming occasions");
    link.innerHTML =
      '<span class="occ-home-em" aria-hidden="true">' + x.o.em + "</span>"
      + '<span class="occ-home-copy"><strong>' + name + "</strong>"
      + "<span>" + when + " · " + greg + (ar ? " (تقريبي)" : " (approx.)") + "</span></span>"
      + '<span class="occ-home-go" aria-hidden="true">→</span>';

    const datebar = document.querySelector(".cp-devotion .datebar");
    if (datebar && datebar.parentNode) {
      datebar.insertAdjacentElement("afterend", link);
      return;
    }
    const mid = document.querySelector(".cp-clock-mid");
    if (mid) mid.appendChild(link);
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
      if (window.CTH_HijriOccasions && mount()) return;
      if (tries++ < 25) setTimeout(tick, 300);
    })();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
