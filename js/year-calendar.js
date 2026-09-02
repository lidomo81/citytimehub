/* =====================================================================
   CityTimeHub — js/year-calendar.js
   Date boxes open a month calendar (Gregorian / Hijri), Samsung-style:
   one month, adjacent days faded, arrows + month/year pickers.
   Hijri months use the same Umm al-Qura calendar as occasions.
   Does not change prayer times, date text, or other tabs.
   ===================================================================== */
(() => {
  "use strict";

  var KIND_GREG = "greg";
  var KIND_HIJRI = "hijri";
  var overlay = null;
  var state = { kind: KIND_GREG, year: 0, month: 1, view: "days" };
  var touch = { x: 0, y: 0 };

  function isAr() {
    return (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar"
      || location.pathname.indexOf("/ar/") === 0;
  }

  function isAppHome() {
    var root = document.documentElement;
    if (!root.classList.contains("app-mode")) return false;
    return (root.getAttribute("data-app-tab") || "home") === "home";
  }

  function hijriParts(date) {
    if (window.CTH_HijriOccasions && window.CTH_HijriOccasions.hijriParts) {
      return window.CTH_HijriOccasions.hijriParts(date);
    }
    var p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric"
    }).formatToParts(date);
    return {
      y: +p.find(function (x) { return x.type === "year"; }).value,
      m: +p.find(function (x) { return x.type === "month"; }).value,
      d: +p.find(function (x) { return x.type === "day"; }).value
    };
  }

  function hijriIndex(p) {
    return p.y * 12 + p.m;
  }

  function noon(ms) {
    var d = new Date(ms);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  function approxGregYear(hy) {
    return Math.round(hy * 0.970224 + 621.577);
  }

  function startOfHijriMonth(hy, hm) {
    if (hy < 1 || hm < 1 || hm > 12) return null;
    var target = hy * 12 + hm;
    var g = approxGregYear(hy);
    var lo = Date.UTC(g - 3, 0, 1);
    var hi = Date.UTC(g + 3, 11, 31);
    var guard = 0;
    while (hijriIndex(hijriParts(new Date(lo))) > target && guard++ < 20) {
      lo -= 400 * 86400000;
    }
    guard = 0;
    while (hijriIndex(hijriParts(new Date(hi))) < target && guard++ < 20) {
      hi += 400 * 86400000;
    }
    while (hi - lo > 86400000) {
      var mid = lo + Math.floor((hi - lo) / 2);
      if (hijriIndex(hijriParts(new Date(mid))) < target) lo = mid;
      else hi = mid;
    }
    var d = noon(hi);
    var i;
    for (i = 0; i < 45; i++) {
      var p = hijriParts(d);
      if (p.y === hy && p.m === hm && p.d === 1) return d;
      d = noon(d.getTime() - 86400000);
    }
    d = noon(hi);
    for (i = 0; i < 45; i++) {
      p = hijriParts(d);
      if (p.y === hy && p.m === hm && p.d === 1) return d;
      d = noon(d.getTime() + 86400000);
    }
    return null;
  }

  function hijriMonthLength(hy, hm) {
    var a = startOfHijriMonth(hy, hm);
    var b = hm === 12 ? startOfHijriMonth(hy + 1, 1) : startOfHijriMonth(hy, hm + 1);
    if (!a || !b) return 30;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function gregMonthLength(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function weekStart() {
    return isAr() ? 6 : 0;
  }

  function weekdayLabels() {
    return isAr()
      ? ["س", "ح", "ن", "ث", "ر", "خ", "ج"]
      : ["S", "M", "T", "W", "T", "F", "S"];
  }

  function monthNameGreg(y, m) {
    return new Intl.DateTimeFormat(isAr() ? "ar" : "en", { month: "long" }).format(new Date(y, m - 1, 1));
  }

  var HIJRI_AR = [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  var HIJRI_EN = [
    "Muharram", "Safar", "Rabi-ul-Awwal", "Rabi-ul-Akhir",
    "Jumada-ul-Awwal", "Jumada-ul-Akhir", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhul-Qa'dah", "Dhul-Hijjah"
  ];

  function monthNameHijri(hy, hm) {
    var names = isAr() ? HIJRI_AR : HIJRI_EN;
    return names[hm - 1] || names[0];
  }

  function monthName(y, m) {
    return state.kind === KIND_HIJRI ? monthNameHijri(y, m) : monthNameGreg(y, m);
  }

  function num(n) {
    return new Intl.NumberFormat(isAr() ? "ar-EG-u-nu-latn" : "en", { useGrouping: false }).format(n);
  }

  function firstWeekdayOffset(jsWeekday, start) {
    return (jsWeekday - start + 7) % 7;
  }

  function shiftMonth(delta) {
    var m = state.month + delta;
    var y = state.year;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    state.month = m;
    state.year = y;
  }

  function todayParts() {
    if (state.kind === KIND_HIJRI) return hijriParts(new Date());
    var n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
  }

  function monthMeta(y, m) {
    if (state.kind === KIND_HIJRI) {
      var start = startOfHijriMonth(y, m);
      return {
        len: hijriMonthLength(y, m),
        first: start ? start.getDay() : 0
      };
    }
    return {
      len: gregMonthLength(y, m),
      first: new Date(y, m - 1, 1).getDay()
    };
  }

  function neighbor(y, m, delta) {
    var nm = m + delta;
    var ny = y;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (nm > 12) { nm = 1; ny += 1; }
    return { y: ny, m: nm, len: monthMeta(ny, nm).len };
  }

  function renderDays() {
    var y = state.year;
    var m = state.month;
    var meta = monthMeta(y, m);
    var start = weekStart();
    var pad = firstWeekdayOffset(meta.first, start);
    var today = todayParts();
    var prev = neighbor(y, m, -1);
    var next = neighbor(y, m, 1);
    var html = '<div class="yc-dows" aria-hidden="true">';
    weekdayLabels().forEach(function (w) {
      html += "<span>" + w + "</span>";
    });
    html += '</div><div class="yc-days">';
    var i;
    for (i = 0; i < pad; i++) {
      var pd = prev.len - pad + 1 + i;
      html += '<button type="button" class="yc-day is-out" data-yc-jump="-1" data-day="' + pd + '">' + num(pd) + "</button>";
    }
    for (i = 1; i <= meta.len; i++) {
      var on = today.y === y && today.m === m && today.d === i;
      html += '<button type="button" class="yc-day' + (on ? " is-today" : "") + '">' + num(i) + "</button>";
    }
    var used = pad + meta.len;
    var fill = used <= 35 ? 35 - used : 42 - used;
    for (i = 1; i <= fill; i++) {
      html += '<button type="button" class="yc-day is-out" data-yc-jump="1" data-day="' + i + '">' + num(i) + "</button>";
    }
    html += "</div>";
    return html;
  }

  function renderMonths() {
    var today = todayParts();
    var html = '<div class="yc-months">';
    var m;
    for (m = 1; m <= 12; m++) {
      var cur = state.month === m;
      var now = today.y === state.year && today.m === m;
      html += '<button type="button" class="yc-pick-m' + (cur ? " is-cur" : "") + (now ? " is-now" : "") + '" data-yc-month="' + m + '">' +
        monthName(state.year, m) + "</button>";
    }
    html += "</div>";
    return html;
  }

  function strings() {
    var ar = isAr();
    return {
      close: ar ? "إغلاق" : "Close",
      prev: ar ? "السابق" : "Previous",
      next: ar ? "التالي" : "Next",
      pick: ar ? "اختيار الشهر والسنة" : "Choose month and year",
      gregTitle: ar ? "التقويم الميلادي" : "Gregorian calendar",
      hijriTitle: ar ? "التقويم الهجري" : "Hijri calendar",
      hijriNote: ar
        ? "التواريخ وفق التقويم المدني (أم القرى)، وقد تختلف عن الرؤية الرسمية للهلال."
        : "Civil Umm al-Qura dates. Official moon-sighting may differ by a day."
    };
  }

  function paint() {
    if (!overlay) return;
    var S = strings();
    var title = overlay.querySelector(".yc-title");
    var grid = overlay.querySelector(".yc-body");
    var note = overlay.querySelector(".yc-note");
    var stamp = overlay.querySelector(".yc-stamp");
    var pick = overlay.querySelector(".yc-stamp-btn");
    title.textContent = state.kind === KIND_HIJRI ? S.hijriTitle : S.gregTitle;
    if (state.view === "months") {
      stamp.textContent = num(state.year) + (state.kind === KIND_HIJRI ? (isAr() ? " هـ" : " AH") : "");
      grid.innerHTML = renderMonths();
    } else {
      stamp.textContent = monthName(state.year, state.month) + "  " + num(state.year) +
        (state.kind === KIND_HIJRI ? (isAr() ? " هـ" : " AH") : "");
      grid.innerHTML = renderDays();
    }
    if (pick) pick.setAttribute("aria-label", S.pick);
    if (state.kind === KIND_HIJRI) {
      note.hidden = false;
      note.textContent = S.hijriNote;
    } else {
      note.hidden = true;
      note.textContent = "";
    }
    overlay.dataset.view = state.view;
  }

  function setPull(on) {
    try {
      if (window.AndroidApp && AndroidApp.setPullToRefresh) AndroidApp.setPullToRefresh(on);
    } catch (e) {}
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    state.view = "days";
    setPull(true);
  }

  function open(kind) {
    if (!isAppHome()) return;
    ensureOverlay();
    var now = todayPartsFor(kind);
    state.kind = kind;
    state.year = now.y;
    state.month = now.m;
    state.view = "days";
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    overlay.dataset.kind = kind;
    paint();
    setPull(false);
    var x = overlay.querySelector(".yc-x");
    if (x) x.focus();
  }

  function todayPartsFor(kind) {
    if (kind === KIND_HIJRI) return hijriParts(new Date());
    var n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    var S = strings();
    overlay = document.createElement("div");
    overlay.id = "yearCalOverlay";
    overlay.className = "yc-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ycTitle");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="yc-backdrop" data-yc-close></div>' +
      '<div class="yc-sheet">' +
        '<button type="button" class="yc-x" data-yc-close aria-label="' + S.close + '">×</button>' +
        '<header class="yc-head">' +
          '<h2 id="ycTitle" class="yc-title"></h2>' +
          '<div class="yc-nav">' +
            '<button type="button" class="yc-shift" data-yc-shift="-1" aria-label="' + S.prev + '">‹</button>' +
            '<button type="button" class="yc-stamp-btn" data-yc-pick>' +
              '<span class="yc-stamp"></span>' +
              '<span class="yc-caret" aria-hidden="true">▾</span>' +
            "</button>" +
            '<button type="button" class="yc-shift" data-yc-shift="1" aria-label="' + S.next + '">›</button>' +
          "</div>" +
        "</header>" +
        '<div class="yc-body"></div>' +
        '<p class="yc-note" hidden></p>' +
      "</div>";
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-yc-close]")) {
        e.preventDefault();
        close();
        return;
      }
      var shift = e.target.closest("[data-yc-shift]");
      if (shift) {
        e.preventDefault();
        if (state.view === "months") state.year += +shift.getAttribute("data-yc-shift");
        else shiftMonth(+shift.getAttribute("data-yc-shift"));
        paint();
        return;
      }
      if (e.target.closest("[data-yc-pick]")) {
        e.preventDefault();
        state.view = state.view === "months" ? "days" : "months";
        paint();
        return;
      }
      var monthBtn = e.target.closest("[data-yc-month]");
      if (monthBtn) {
        e.preventDefault();
        state.month = +monthBtn.getAttribute("data-yc-month");
        state.view = "days";
        paint();
        return;
      }
      var jump = e.target.closest("[data-yc-jump]");
      if (jump) {
        e.preventDefault();
        shiftMonth(+jump.getAttribute("data-yc-jump"));
        paint();
      }
    });
    var bodySwipe = overlay.querySelector(".yc-body");
    bodySwipe.addEventListener("touchstart", function (e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      touch.x = e.changedTouches[0].clientX;
      touch.y = e.changedTouches[0].clientY;
    }, { passive: true });
    bodySwipe.addEventListener("touchend", function (e) {
      if (state.view !== "days" || !e.changedTouches || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - touch.x;
      var dy = e.changedTouches[0].clientY - touch.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      var rtl = isAr();
      shiftMonth((dx < 0) === rtl ? -1 : 1);
      paint();
    }, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); shiftMonth(isAr() ? 1 : -1); paint(); }
      if (e.key === "ArrowRight") { e.preventDefault(); shiftMonth(isAr() ? -1 : 1); paint(); }
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function bindBox(el, kind) {
    if (!el || el.dataset.ycBound) return;
    el.dataset.ycBound = "1";
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.setAttribute("aria-haspopup", "dialog");
    el.addEventListener("click", function (e) {
      if (!isAppHome()) return;
      e.preventDefault();
      e.stopPropagation();
      open(kind);
    });
    el.addEventListener("keydown", function (e) {
      if (!isAppHome()) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(kind);
      }
    });
  }

  function bind() {
    var bar = document.querySelector(".cp-devotion .datebar");
    if (!bar) return false;
    bindBox(bar.querySelector(".datebar-item--greg"), KIND_GREG);
    bindBox(bar.querySelector(".datebar-item--hijri"), KIND_HIJRI);
    ensureOverlay();
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (!bind()) {
        var n = 0, t = setInterval(function () {
          if (bind() || ++n > 20) clearInterval(t);
        }, 200);
      }
    });
  } else if (!bind()) {
    var n = 0, t = setInterval(function () {
      if (bind() || ++n > 20) clearInterval(t);
    }, 200);
  }
})();
