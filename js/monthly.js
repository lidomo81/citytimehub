/* =====================================================================
   CityTimeHub — monthly.js
   Full-month prayer timetable (AlAdhan calendar endpoint) for a chosen
   city, with the Hijri date per day. Offline-cached. Printable.
   ===================================================================== */
(function () {
  "use strict";
  var wrap = document.getElementById("moTableWrap");
  if (!wrap) return;

  var LANG = (document.documentElement.lang || "en").indexOf("ar") === 0 ? "ar" : "en";
  var T = LANG === "ar"
    ? { day: "اليوم", hijri: "هجري", fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر",
        asr: "العصر", maghrib: "المغرب", isha: "العشاء",
        loading: "جارٍ التحميل…", err: "تعذّر تحميل المواقيت. تحقّق من الاتصال وحاول مجدداً.",
        cap: function (c, m) { return "مواقيت الصلاة في " + c + " — " + m; },
        months: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
        hmonths: ["مُحرّم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"] }
    : { day: "Day", hijri: "Hijri", fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr",
        asr: "Asr", maghrib: "Maghrib", isha: "Isha",
        loading: "Loading…", err: "Couldn't load the timetable. Check your connection and try again.",
        cap: function (c, m) { return "Prayer times in " + c + " — " + m; },
        months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
        hmonths: null };

  var elCity = document.getElementById("moCity");
  var elAc = document.getElementById("moCityAc");
  var elPrev = document.getElementById("moPrev");
  var elNext = document.getElementById("moNext");
  var elLabel = document.getElementById("moMonthLabel");
  var elCaption = document.getElementById("moCaption");
  var elPrint = document.getElementById("moPrint");

  var CITIES = [];
  var city = null;
  var now = new Date();
  var year = now.getFullYear(), month = now.getMonth() + 1; // 1..12

  function cName(c) { return LANG === "ar" ? (c.name_ar || c.name) : c.name; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function clean(s) { return (s || "").split(" ")[0]; }

  function resolveDefaultCity() {
    var saved = null;
    try { saved = localStorage.getItem("cth-home-city"); } catch (e) {}
    if (saved) { var f = CITIES.find(function (c) { return c.slug === saved; }); if (f) return f; }
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var m = CITIES.filter(function (c) { return c.tz === tz; });
      if (m.length) return m.find(function (c) { return c.featured; }) || m[0];
    } catch (e) {}
    return CITIES.find(function (c) { return c.slug === "cairo"; }) || CITIES[0];
  }

  function monthLabel() {
    return T.months[month - 1] + " " + year;
  }

  function render(days) {
    var rows = days.map(function (d) {
      var t = d.timings, g = d.date.gregorian, h = d.date.hijri;
      var hij = h ? (h.day + " " + (LANG === "ar" && T.hmonths ? T.hmonths[(h.month && h.month.number ? h.month.number : 1) - 1] : (h.month ? h.month.en : "")) ) : "";
      var todayCls = (+g.day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()) ? " mo-today" : "";
      return "<tr class=\"mo-row" + todayCls + "\">" +
        "<td class=\"mo-d\">" + g.day + "</td>" +
        "<td class=\"mo-h\">" + hij + "</td>" +
        "<td>" + clean(t.Fajr) + "</td>" +
        "<td>" + clean(t.Sunrise) + "</td>" +
        "<td>" + clean(t.Dhuhr) + "</td>" +
        "<td>" + clean(t.Asr) + "</td>" +
        "<td>" + clean(t.Maghrib) + "</td>" +
        "<td>" + clean(t.Isha) + "</td>" +
      "</tr>";
    }).join("");
    wrap.innerHTML =
      "<table class=\"mo-table\"><thead><tr>" +
      "<th>" + T.day + "</th><th>" + T.hijri + "</th><th>" + T.fajr + "</th><th>" + T.sunrise + "</th>" +
      "<th>" + T.dhuhr + "</th><th>" + T.asr + "</th><th>" + T.maghrib + "</th><th>" + T.isha + "</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function load() {
    if (!city) return;
    elLabel.textContent = monthLabel();
    elCaption.textContent = T.cap(cName(city) + "، " + (LANG === "ar" ? (city.country_ar || city.country) : city.country), monthLabel());
    wrap.innerHTML = "<p class=\"muted\" style=\"text-align:center;padding:24px\">" + T.loading + "</p>";
    var key = "cth-month:" + city.slug + ":" + year + "-" + pad(month);
    var url = "https://api.aladhan.com/v1/calendar/" + year + "/" + month +
      "?latitude=" + city.lat + "&longitude=" + city.lng + "&method=" + (city.method != null ? city.method : 3);
    fetch(url).then(function (r) { if (!r.ok) throw new Error("cal " + r.status); return r.json(); })
      .then(function (j) {
        var days = j.data;
        render(days);
        try { localStorage.setItem(key, JSON.stringify(days)); } catch (e) {}
      })
      .catch(function () {
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
        if (cached) { render(cached); }
        else { wrap.innerHTML = "<p class=\"no-results\" style=\"text-align:center;padding:24px\">" + T.err + "</p>"; }
      });
  }

  function step(delta) {
    month += delta;
    if (month < 1) { month = 12; year--; }
    else if (month > 12) { month = 1; year++; }
    load();
  }

  // ---- City autocomplete ----
  function norm(s) { return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u064b-\u0652]/g, ""); }
  function closeAc() { elAc.hidden = true; elAc.innerHTML = ""; elCity.setAttribute("aria-expanded", "false"); }
  function pickCity(c) { city = c; elCity.value = cName(c); closeAc(); load(); }
  function search(q) {
    q = norm(q); if (!q) { closeAc(); return; }
    var res = CITIES.filter(function (c) {
      return norm(c.name).indexOf(q) >= 0 || norm(c.name_ar).indexOf(q) >= 0 || norm(c.country).indexOf(q) >= 0;
    }).slice(0, 8);
    if (!res.length) { closeAc(); return; }
    elAc.innerHTML = res.map(function (c, i) {
      return "<li role=\"option\" data-slug=\"" + c.slug + "\" class=\"ac-item\">" +
        "<span>" + cName(c) + "</span><span class=\"ac-country\">" + (LANG === "ar" ? (c.country_ar || c.country) : c.country) + "</span></li>";
    }).join("");
    elAc.hidden = false; elCity.setAttribute("aria-expanded", "true");
    Array.prototype.forEach.call(elAc.querySelectorAll(".ac-item"), function (li) {
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        var c = CITIES.find(function (x) { return x.slug === li.getAttribute("data-slug"); });
        if (c) pickCity(c);
      });
    });
  }

  elCity.addEventListener("input", function () { search(elCity.value); });
  elCity.addEventListener("blur", function () { setTimeout(closeAc, 150); });
  elPrev.addEventListener("click", function () { step(-1); });
  elNext.addEventListener("click", function () { step(1); });
  elPrint.addEventListener("click", function () { window.print(); });

  fetch("/data/cities.json").then(function (r) { return r.json(); }).then(function (j) {
    CITIES = j.cities || [];
    city = resolveDefaultCity();
    if (city) elCity.value = cName(city);
    load();
  }).catch(function () {
    wrap.innerHTML = "<p class=\"no-results\" style=\"text-align:center;padding:24px\">" + T.err + "</p>";
  });
})();
