/* =====================================================================
   CityTimeHub — js/year-calendar.js
   Home-tab date boxes open a year calendar (Gregorian / Hijri).
   Hijri months use the same Umm al-Qura calendar as occasions.
   Does not change prayer times, date text, or other tabs.
   ===================================================================== */
(() => {
  "use strict";

  var KIND_GREG = "greg";
  var KIND_HIJRI = "hijri";
  var overlay = null;
  var state = { kind: KIND_GREG, year: 0 };

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

  function startOfHijriMonth(hy, hm) {
    var target = hy * 12 + hm;
    var lo = Date.UTC(hy - 590, 0, 1);
    var hi = Date.UTC(hy - 568, 11, 31);
    var guard = 0;
    while (hijriIndex(hijriParts(new Date(lo))) > target && guard++ < 10) {
      lo -= 400 * 86400000;
    }
    guard = 0;
    while (hijriIndex(hijriParts(new Date(hi))) < target && guard++ < 10) {
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

  function monthNameHijri(hy, hm) {
    var start = startOfHijriMonth(hy, hm) || new Date();
    return new Intl.DateTimeFormat(
      isAr() ? "ar-u-ca-islamic-umalqura" : "en-u-ca-islamic-umalqura",
      { month: "long" }
    ).format(start);
  }

  function num(n) {
    return new Intl.NumberFormat(isAr() ? "ar-EG-u-nu-latn" : "en", { useGrouping: false }).format(n);
  }

  function firstWeekdayOffset(jsWeekday, start) {
    return (jsWeekday - start + 7) % 7;
  }

  function monthGrid(daysInMonth, firstJsWeekday, todayDay, isCurrentMonth) {
    var start = weekStart();
    var pad = firstWeekdayOffset(firstJsWeekday, start);
    var html = '<div class="yc-dows" aria-hidden="true">';
    weekdayLabels().forEach(function (w) {
      html += "<span>" + w + "</span>";
    });
    html += '</div><div class="yc-days">';
    var i;
    for (i = 0; i < pad; i++) html += "<span></span>";
    for (i = 1; i <= daysInMonth; i++) {
      var on = isCurrentMonth && i === todayDay;
      html += '<span class="yc-day' + (on ? " is-today" : "") + '">' + num(i) + "</span>";
    }
    html += "</div>";
    return html;
  }

  function renderGregYear(year) {
    var now = new Date();
    var ty = now.getFullYear();
    var tm = now.getMonth() + 1;
    var td = now.getDate();
    var html = "";
    var m;
    for (m = 1; m <= 12; m++) {
      var first = new Date(year, m - 1, 1).getDay();
      var len = gregMonthLength(year, m);
      html += '<section class="yc-month" data-month="' + m + '">';
      html += "<h3>" + monthNameGreg(year, m) + "</h3>";
      html += monthGrid(len, first, td, year === ty && m === tm);
      html += "</section>";
    }
    return html;
  }

  function renderHijriYear(year) {
    var today = hijriParts(new Date());
    var html = "";
    var m;
    for (m = 1; m <= 12; m++) {
      var start = startOfHijriMonth(year, m);
      var len = hijriMonthLength(year, m);
      var first = start ? start.getDay() : 0;
      html += '<section class="yc-month" data-month="' + m + '">';
      html += "<h3>" + monthNameHijri(year, m) + "</h3>";
      html += monthGrid(len, first, today.d, year === today.y && m === today.m);
      html += "</section>";
    }
    return html;
  }

  function strings() {
    var ar = isAr();
    return {
      close: ar ? "إغلاق" : "Close",
      prev: ar ? "السنة السابقة" : "Previous year",
      next: ar ? "السنة التالية" : "Next year",
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
    var grid = overlay.querySelector(".yc-year");
    var note = overlay.querySelector(".yc-note");
    var yearLabel = overlay.querySelector(".yc-year-num");
    if (state.kind === KIND_HIJRI) {
      title.textContent = S.hijriTitle;
      yearLabel.textContent = num(state.year) + (isAr() ? " هـ" : " AH");
      grid.innerHTML = renderHijriYear(state.year);
      note.hidden = false;
      note.textContent = S.hijriNote;
    } else {
      title.textContent = S.gregTitle;
      yearLabel.textContent = num(state.year);
      grid.innerHTML = renderGregYear(state.year);
      note.hidden = true;
      note.textContent = "";
    }
    var todayMonth = grid.querySelector(".yc-day.is-today");
    if (todayMonth) {
      var sec = todayMonth.closest(".yc-month");
      if (sec) sec.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
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
    setPull(true);
  }

  function open(kind) {
    if (!isAppHome()) return;
    ensureOverlay();
    var now = new Date();
    state.kind = kind;
    state.year = kind === KIND_HIJRI ? hijriParts(now).y : now.getFullYear();
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    overlay.dataset.kind = kind;
    paint();
    setPull(false);
    var x = overlay.querySelector(".yc-x");
    if (x) x.focus();
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
            '<span class="yc-year-num"></span>' +
            '<button type="button" class="yc-shift" data-yc-shift="1" aria-label="' + S.next + '">›</button>' +
          '</div>' +
        '</header>' +
        '<div class="yc-year"></div>' +
        '<p class="yc-note" hidden></p>' +
      "</div>";
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-yc-close]")) {
        e.preventDefault();
        close();
      }
    });
    overlay.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-yc-shift]");
      if (!btn) return;
      e.preventDefault();
      state.year += +btn.getAttribute("data-yc-shift");
      paint();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.hidden) close();
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
