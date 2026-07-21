/* =====================================================================
   CityTimeHub — js/app-tabs.js
   Bottom tab navigation + per-tab layouts for app-mode (PWA / WebView).
   Tabs: Home · Prayer · Adhkar · Tools
   ===================================================================== */
(() => {
  "use strict";

  var TAB_IDS = ["home", "prayer", "azkar", "tools"];
  var STORAGE_KEY = "cth-app-tab";

  function inAppMode() {
    return document.documentElement.classList.contains("app-mode")
      || /CityTimeHubApp/i.test(navigator.userAgent || "")
      || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || navigator.standalone === true
      || new URLSearchParams(location.search).get("app") === "1";
  }

  function isAr() {
    return (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar"
      || location.pathname.indexOf("/ar/") === 0
      || location.pathname === "/ar";
  }

  function isAppHome() {
    var p = location.pathname.replace(/\/+$/, "") || "/";
    return p === "" || p === "/" || p === "/ar";
  }

  function homeBase() {
    return isAr() ? "/ar/" : "/";
  }

  function withAppParam(href) {
    try {
      var u = new URL(href, location.origin);
      u.searchParams.set("app", "1");
      return u.pathname + u.search + u.hash;
    } catch (e) { return href; }
  }

  function labels() {
    return isAr()
      ? { home: "الرئيسية", prayer: "الصلاة", azkar: "الأذكار", tools: "أدوات",
          brand: "CityTimeHub", azkarHub: "اختر مجموعة الأذكار",
          azMorning: "أذكار الصباح", azEvening: "أذكار المساء", azSleep: "أذكار النوم",
          azMorningSub: "ابدأ يومك بالذكر", azEveningSub: "ختم المساء بالحفظ",
          azSleepSub: "قبل النوم بسكينة" }
      : { home: "Home", prayer: "Prayer", azkar: "Adhkar", tools: "Tools",
          brand: "CityTimeHub", azkarHub: "Choose your adhkar",
          azMorning: "Morning", azEvening: "Evening", azSleep: "Bedtime",
          azMorningSub: "Start the day with dhikr", azEveningSub: "Close the evening in remembrance",
          azSleepSub: "Peace before sleep" };
  }

  function tabFromHash() {
    var h = (location.hash || "").replace(/^#/, "").toLowerCase();
    return TAB_IDS.indexOf(h) >= 0 ? h : "";
  }

  function readTab() {
    return tabFromHash() || localStorage.getItem(STORAGE_KEY) || "home";
  }

  function tabTitle(tab) {
    var L = labels();
    return tab === "home" ? L.brand : L[tab] || L.brand;
  }

  function iconSvg(name) {
    var icons = {
      home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>',
      prayer: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3"/><path d="M8 6a4 4 0 0 0 8 0"/><path d="M6 21h12"/><path d="M9 21v-4a3 3 0 0 1 6 0v4"/></svg>',
      azkar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h6"/></svg>',
      tools: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    };
    return icons[name] || icons.home;
  }

  function setActiveTab(tab, opts) {
    opts = opts || {};
    if (TAB_IDS.indexOf(tab) < 0) tab = "home";
    var prev = document.documentElement.getAttribute("data-app-tab") || "home";
    document.documentElement.setAttribute("data-app-tab", tab);
    try { localStorage.setItem(STORAGE_KEY, tab); } catch (e) {}

    if (prev !== tab) {
      document.documentElement.classList.add("app-tab-switching");
      clearTimeout(setActiveTab._fadeT);
      setActiveTab._fadeT = setTimeout(function () {
        document.documentElement.classList.remove("app-tab-switching");
      }, 240);
    }

    document.querySelectorAll(".app-bottom-nav .app-tab").forEach(function (btn) {
      var on = btn.dataset.tab === tab;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    var barTitle = document.querySelector(".app-bar--home .app-bar-title");
    if (barTitle) barTitle.textContent = tabTitle(tab);

    if (opts.pushHash !== false && isAppHome()) {
      var want = tab === "home" ? "" : "#" + tab;
      if (location.hash !== want) {
        history.replaceState(null, "", location.pathname + location.search + want);
      }
    }

    var panel = document.getElementById("appTabAzkar");
    if (panel) panel.hidden = tab !== "azkar";

    document.dispatchEvent(new CustomEvent("cth-app-tab", { detail: { tab: tab } }));

    window.scrollTo({ top: 0, behavior: opts.smooth ? "smooth" : "auto" });
  }

  function buildAzkarHub() {
    if (document.getElementById("appTabAzkar")) return;
    var main = document.getElementById("top");
    if (!main) return;
    var L = labels();
    var p = isAr() ? "/ar" : "";
    var hub = document.createElement("section");
    hub.id = "appTabAzkar";
    hub.className = "app-tab-azkar section";
    hub.hidden = true;
    hub.setAttribute("aria-label", L.azkar);
    hub.innerHTML =
      '<div class="container app-azkar-hub">' +
        '<p class="app-azkar-lead">' + L.azkarHub + '</p>' +
        '<div class="app-azkar-grid">' +
          '<a class="app-azkar-card app-azkar-card--morning" href="' + withAppParam(p + "/azkar/morning/") + '">' +
            '<span class="app-azkar-glow" aria-hidden="true"></span>' +
            '<span class="app-azkar-ico" aria-hidden="true">🌅</span>' +
            '<span class="app-azkar-body"><strong>' + L.azMorning + '</strong><span>' + L.azMorningSub + '</span></span>' +
            '<span class="app-azkar-arrow" aria-hidden="true">→</span>' +
          '</a>' +
          '<a class="app-azkar-card app-azkar-card--evening" href="' + withAppParam(p + "/azkar/evening/") + '">' +
            '<span class="app-azkar-glow" aria-hidden="true"></span>' +
            '<span class="app-azkar-ico" aria-hidden="true">🌙</span>' +
            '<span class="app-azkar-body"><strong>' + L.azEvening + '</strong><span>' + L.azEveningSub + '</span></span>' +
            '<span class="app-azkar-arrow" aria-hidden="true">→</span>' +
          '</a>' +
          '<a class="app-azkar-card app-azkar-card--sleep" href="' + withAppParam(p + "/azkar/sleep/") + '">' +
            '<span class="app-azkar-glow" aria-hidden="true"></span>' +
            '<span class="app-azkar-ico" aria-hidden="true">🛌</span>' +
            '<span class="app-azkar-body"><strong>' + L.azSleep + '</strong><span>' + L.azSleepSub + '</span></span>' +
            '<span class="app-azkar-arrow" aria-hidden="true">→</span>' +
          '</a>' +
        '</div>' +
        '<div id="cthAzkarRemindSlot" class="app-remind-slot" hidden></div>' +
      '</div>';
    var tools = document.querySelector("nav.app-tools");
    if (tools) main.insertBefore(hub, tools);
    else main.appendChild(hub);
  }

  function markAzkarToolsGroup() {
    document.querySelectorAll(".app-tools-group").forEach(function (g) {
      var cat = g.querySelector(".app-tools-cat");
      if (!cat) return;
      if (/Adhkar|الأذكار|📿/.test(cat.textContent)) g.classList.add("app-tools-group--azkar");
    });
  }

  function installBottomNav(activeTab) {
    if (document.querySelector(".app-bottom-nav")) return;
    var L = labels();
    var base = homeBase();
    var nav = document.createElement("nav");
    nav.className = "app-bottom-nav";
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", isAr() ? "التبويبات الرئيسية" : "Main tabs");

    TAB_IDS.forEach(function (id) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "app-tab" + (id === activeTab ? " is-active" : "");
      btn.dataset.tab = id;
      if (id === activeTab) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
      btn.innerHTML = iconSvg(id) + '<span class="app-tab-label">' + L[id] + '</span>';
      nav.appendChild(btn);
    });

    document.body.appendChild(nav);

    nav.addEventListener("click", function (e) {
      var btn = e.target.closest(".app-tab");
      if (!btn) return;
      var tab = btn.dataset.tab;
      if (!tab) return;
      if (isAppHome()) {
        e.preventDefault();
        setActiveTab(tab, { smooth: true });
        return;
      }
      location.href = withAppParam(base + (tab === "home" ? "" : "#" + tab));
    });
  }

  function detectToolTabActive() {
    var path = location.pathname.replace(/\/+$/, "");
    if (/^(\/ar)?\/azkar\//.test(path)) return "azkar";
    if (/^(\/ar)?\/(prayer-clock|qibla|monthly|time-difference|best-time-to-call|meeting-planner|close-ones|cities|guides)/.test(path)) return "tools";
    return "";
  }

  function initHomeTabs() {
    buildAzkarHub();
    markAzkarToolsGroup();
    var tab = readTab();
    if (TAB_IDS.indexOf(tab) < 0) tab = "home";
    setActiveTab(tab, { pushHash: false });
  }

  function init() {
    if (!inAppMode()) return;
    document.documentElement.classList.add("app-mode");

    var active = isAppHome() ? readTab() : (detectToolTabActive() || "");
    installBottomNav(active || "home");
    if (isAppHome()) initHomeTabs();

    window.addEventListener("hashchange", function () {
      if (!isAppHome()) return;
      var t = tabFromHash();
      if (t) setActiveTab(t, { pushHash: false });
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  window.CTH_AppTabs = { setActiveTab: setActiveTab, inAppMode: inAppMode };
})();
