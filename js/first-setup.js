/* First-open setup — city, adhan, home-screen widget.
   Short onboarding for the Android app / app-mode. Does not replace CthTour.
   Public: window.CTH_FirstSetup { holdTour, done, markDone } */
(() => {
  "use strict";

  const KEY = "cth-setup-done";
  const METHOD = { eg: 5, sa: 4, ae: 8, kw: 9, qa: 10, bh: 4, om: 8, jo: 3, ly: 5, sd: 5, pk: 1, in: 1, bd: 1, us: 2, ca: 2, tr: 13, id: 20, my: 3, sg: 3, gb: 3, fr: 12 };
  const SCHOOL = { pk: 1, in: 1, bd: 1, af: 1, tr: 1, kz: 1, uz: 1, kg: 1, tj: 1, tm: 1 };

  const ar = (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar";
  const T = ar
    ? {
        title: "جاهز في ثلاث خطوات",
        sub: "عشان المواقيت والأذان يشتغلوا صح من أول يوم",
        skip: "تخطي",
        next: "التالي",
        done: "ابدأ",
        back: "رجوع",
        s1t: "مدينتك",
        s1b: "حدد موقعك عشان مواقيت الصلاة تكون لمدينتك، مش لمدينة تانية.",
        locate: "استخدم موقعي",
        locating: "جاري تحديد الموقع…",
        searchPh: "أو ابحث باسم المدينة",
        cityOk: "تم اختيار",
        s2t: "الأذان",
        s2b: "فعّل تنبيه الصلاة — يوصل حتى لو قفلت التطبيق.",
        adhanBtn: "فتح إعدادات الأذان",
        adhanHint: "اختَر الصلوات اللي عايز أذانها، واسمح بالإشعارات لو الجهاز سألك.",
        s3t: "ويدجت الشاشة الرئيسية",
        s3b: "مواقيت اليوم على شاشتك — من غير ما تفتح التطبيق.",
        pinBtn: "إضافة الويدجت",
        w1: "اضغط مطولًا على مساحة فاضية في الشاشة الرئيسية",
        w2: "اختر «ويدجت» أو Widgets",
        w3: "ابحث عن «مواقيت الصلاة» وأضفها",
        langAria: "تبديل اللغة · English",
      }
    : {
        title: "Ready in three steps",
        sub: "So prayer times and the adhan work for you from day one",
        skip: "Skip",
        next: "Next",
        done: "Start",
        back: "Back",
        s1t: "Your city",
        s1b: "Set your location so prayer times are for your city, not someone else’s.",
        locate: "Use my location",
        locating: "Finding your location…",
        searchPh: "Or search by city name",
        cityOk: "Selected",
        s2t: "Adhan",
        s2b: "Turn on prayer alerts — they arrive even when the app is closed.",
        adhanBtn: "Open adhan settings",
        adhanHint: "Pick the prayers you want called, and allow notifications if your phone asks.",
        s3t: "Home screen widget",
        s3b: "Today’s prayer times on your home screen — without opening the app.",
        pinBtn: "Add widget",
        w1: "Long-press an empty spot on your home screen",
        w2: "Tap Widgets",
        w3: "Find “Prayer times” and add it",
        langAria: "Switch language · العربية",
      };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function inApp() {
    return document.documentElement.classList.contains("app-mode")
      || /CityTimeHubApp/i.test(navigator.userAgent || "")
      || !!(window.AndroidApp)
      || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || navigator.standalone === true
      || new URLSearchParams(location.search).get("app") === "1";
  }
  function isHome() {
    const p = location.pathname.replace(/\/+$/, "") || "/";
    return p === "" || p === "/" || p === "/ar";
  }
  function forcePreview() {
    try { return new URLSearchParams(location.search).get("setup") === "1"; } catch (e) { return false; }
  }
  function isDone() { return lsGet(KEY) === "1"; }
  function markDone() { lsSet(KEY, "1"); }
  function isReturning() {
    if (lsGet("cth-tour-seen") === "1") return true;
    const visits = parseInt(lsGet("cth-app-visits") || "0", 10);
    return visits >= 2;
  }
  function shouldShow() {
    if (forcePreview()) return true;
    return inApp() && isHome() && !isDone() && !isReturning();
  }
  function holdTour() { return shouldShow(); }

  function langHref() {
    const qs = new URLSearchParams(location.search);
    if (inApp() || qs.get("app") === "1") qs.set("app", "1");
    if (forcePreview()) qs.set("setup", "1");
    const q = qs.toString();
    const hash = location.hash || "";
    return (ar ? "/?" : "/ar/?") + q + hash;
  }

  window.CTH_FirstSetup = { holdTour, done: isDone, markDone, forcePreview };

  if (isReturning() && !isDone() && !forcePreview()) markDone();

  let root, step = 1, pushed = false, cityLabel = "";

  function setPull(on) {
    try { if (window.AndroidApp && AndroidApp.setPullToRefresh) AndroidApp.setPullToRefresh(on); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function pickCity(x) {
    const a = x.address || {};
    const name = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || String(x.display_name || "").split(",")[0].trim();
    const country = [a.state, a.country].filter(Boolean).join(ar ? "، " : ", ")
      || String(x.display_name || "").split(",").slice(-1)[0].trim();
    const cc = String(a.country_code || "").toLowerCase();
    return { name, country, lat: parseFloat(x.lat), lng: parseFloat(x.lon), method: METHOD[cc] || 3, school: SCHOOL[cc] || 0 };
  }
  function applyCity(c) {
    if (!c) return false;
    let ok = false;
    try { if (window.cthSetPrayerCity) ok = !!window.cthSetPrayerCity(c); } catch (e) {}
    try { if (window.AndroidApp && AndroidApp.onCityPicked) AndroidApp.onCityPicked(JSON.stringify(c)); } catch (e) {}
    cityLabel = [c.name, c.country].filter(Boolean).join(ar ? "، " : ", ");
    paintCity();
    return ok;
  }
  function currentCityLabel() {
    try {
      const raw = window.cthGetPrayerCity && window.cthGetPrayerCity();
      if (!raw) return "";
      const c = typeof raw === "string" ? JSON.parse(raw) : raw;
      return [c.name_ar && ar ? c.name_ar : c.name, c.country_ar && ar ? c.country_ar : c.country].filter(Boolean).join(ar ? "، " : ", ");
    } catch (e) { return ""; }
  }

  function dots() {
    return [1, 2, 3].map(n => `<i class="fs-dot${n === step ? " is-on" : ""}${n < step ? " is-done" : ""}"></i>`).join("");
  }
  function stepHtml() {
    if (step === 1) {
      return `
        <div class="fs-icon" aria-hidden="true">📍</div>
        <h2 class="fs-h">${T.s1t}</h2>
        <p class="fs-p">${T.s1b}</p>
        <button type="button" class="btn-primary fs-btn" id="fsLocate">${T.locate}</button>
        <p class="fs-city" id="fsCity" hidden></p>
        <input id="fsSearch" class="ac-input" type="text" autocomplete="off" placeholder="${T.searchPh}">
        <ul class="fs-list" id="fsList" hidden></ul>`;
    }
    if (step === 2) {
      const has = !!(window.AndroidApp && AndroidApp.openPrayerReminders);
      return `
        <div class="fs-icon" aria-hidden="true">🔔</div>
        <h2 class="fs-h">${T.s2t}</h2>
        <p class="fs-p">${T.s2b}</p>
        ${has ? `<button type="button" class="btn-primary fs-btn" id="fsAdhan">${T.adhanBtn}</button>` : ""}
        <p class="fs-hint">${T.adhanHint}</p>`;
    }
    const canPin = !!(window.AndroidApp && AndroidApp.pinPrayerWidget);
    return `
      <div class="fs-icon" aria-hidden="true">📲</div>
      <h2 class="fs-h">${T.s3t}</h2>
      <p class="fs-p">${T.s3b}</p>
      ${canPin ? `<button type="button" class="btn-primary fs-btn" id="fsPin">${T.pinBtn}</button>` : ""}
      <ol class="fs-steps">
        <li>${T.w1}</li>
        <li>${T.w2}</li>
        <li>${T.w3}</li>
      </ol>`;
  }
  function paintCity() {
    const el = root && root.querySelector("#fsCity");
    if (!el) return;
    const label = cityLabel || currentCityLabel();
    if (!label) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = T.cityOk + (ar ? " " : ": ") + label;
  }
  function render() {
    if (!root) return;
    root.querySelector("#fsDots").innerHTML = dots();
    root.querySelector("#fsBody").innerHTML = stepHtml();
    root.querySelector("#fsNext").textContent = step === 3 ? T.done : T.next;
    const back = root.querySelector("#fsBack");
    back.hidden = step === 1;
    paintCity();
    wireStep();
  }
  function wireStep() {
    const loc = root.querySelector("#fsLocate");
    if (loc) {
      loc.addEventListener("click", () => {
        loc.disabled = true;
        loc.textContent = T.locating;
        const home = document.getElementById("cpLocate");
        if (home) home.click();
        else loc.disabled = false;
        setTimeout(() => { loc.disabled = false; loc.textContent = T.locate; paintCity(); }, 8000);
      });
    }
    const search = root.querySelector("#fsSearch");
    const list = root.querySelector("#fsList");
    if (search && list) wireSearch(search, list);
    const adhan = root.querySelector("#fsAdhan");
    if (adhan) adhan.addEventListener("click", () => {
      try { window.AndroidApp.openPrayerReminders(); } catch (e) {}
    });
    const pin = root.querySelector("#fsPin");
    if (pin) pin.addEventListener("click", () => {
      try { window.AndroidApp.pinPrayerWidget(); } catch (e) {}
    });
  }
  function wireSearch(input, list) {
    let timer = null, seq = 0, items = [];
    const HL = (window.CTH_CITY_INP && window.CTH_CITY_INP.highlight)
      ? window.CTH_CITY_INP.highlight
      : (t) => esc(t);
    function show(rows) {
      items = rows;
      if (!rows.length) {
        list.innerHTML = `<li class="ac-empty">${ar ? "لا توجد مدينة بهذا الاسم" : "No city found"}</li>`;
        list.hidden = false;
        return;
      }
      const q = input.value;
      list.innerHTML = rows.map((c, i) =>
        `<li class="ac-item" data-i="${i}"><span>${HL(c.name, q)}</span><span class="ac-country">${esc(c.country)}</span></li>`
      ).join("");
      list.hidden = false;
    }
    input.addEventListener("input", () => {
      const q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 3) { list.hidden = true; list.innerHTML = ""; return; }
      timer = setTimeout(() => {
        const my = ++seq;
        const lang = ar ? "ar" : "en";
        fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=" + lang + "&q=" + encodeURIComponent(q))
          .then(r => r.json())
          .then(d => {
            if (my !== seq) return;
            const seen = {}, rows = [];
            (d || []).forEach(x => {
              const c = pickCity(x);
              if (!c.name || isNaN(c.lat)) return;
              const k = c.name + "|" + c.country;
              if (seen[k]) return;
              seen[k] = 1;
              rows.push(c);
            });
            show(rows);
          })
          .catch(() => {});
      }, 450);
    });
    list.addEventListener("mousedown", e => {
      const li = e.target.closest(".ac-item");
      if (!li || li.dataset.i == null) return;
      e.preventDefault();
      const c = items[+li.dataset.i];
      if (!c) return;
      applyCity(c);
      input.value = "";
      list.hidden = true;
    });
  }

  function close(finish) {
    if (finish && !forcePreview()) markDone();
    try { sessionStorage.removeItem("cth-setup-step"); } catch (e) {}
    if (root) root.hidden = true;
    document.documentElement.style.overflow = "";
    setPull(true);
    if (pushed) {
      pushed = false;
      try { history.back(); } catch (e) {}
    }
  }
  function open() {
    if (!root) return;
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    setPull(false);
    if (!pushed) {
      try { history.pushState({ cth: "first-setup" }, ""); pushed = true; } catch (e) {}
    }
    cityLabel = currentCityLabel();
    try {
      const saved = parseInt(sessionStorage.getItem("cth-setup-step") || "", 10);
      if (saved >= 1 && saved <= 3) step = saved;
    } catch (e) {}
    render();
  }

  function build() {
    root = document.createElement("div");
    root.id = "cthFirstSetup";
    root.className = "fs-overlay";
    root.hidden = true;
    root.setAttribute("dir", ar ? "rtl" : "ltr");
    root.innerHTML = `
      <div class="fs-page" role="dialog" aria-modal="true" aria-labelledby="fsTitle">
        <div class="fs-head">
          <button type="button" class="az-sheet-back" id="fsBack" hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
            <span>${T.back}</span>
          </button>
          <div class="fs-head-copy">
            <strong id="fsTitle">${T.title}</strong>
            <span class="fs-sub">${T.sub}</span>
          </div>
          <div class="fs-head-actions">
            <a class="lang-switch fs-lang" id="fsLang" href="${esc(langHref())}" lang="${ar ? "en" : "ar"}" hreflang="${ar ? "en" : "ar"}" aria-label="${T.langAria}">EN · العربية</a>
            <button type="button" class="fs-skip" id="fsSkip">${T.skip}</button>
          </div>
        </div>
        <div class="fs-dots" id="fsDots" aria-hidden="true"></div>
        <div class="fs-body" id="fsBody"></div>
        <div class="fs-foot">
          <button type="button" class="btn-primary fs-btn" id="fsNext">${T.next}</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector("#fsSkip").addEventListener("click", () => close(true));
    const langBtn = root.querySelector("#fsLang");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        try { sessionStorage.setItem("cth-setup-step", String(step)); } catch (e) {}
      });
    }
    root.querySelector("#fsBack").addEventListener("click", () => {
      if (step > 1) { step -= 1; render(); }
    });
    root.querySelector("#fsNext").addEventListener("click", () => {
      if (step < 3) { step += 1; render(); }
      else close(true);
    });
    window.addEventListener("popstate", () => {
      const st = history.state;
      if (st && st.cth === "first-setup") return;
      if (!root || root.hidden) return;
      pushed = false;
      close(true);
    });
    window.addEventListener("cth-city", () => {
      cityLabel = currentCityLabel();
      const loc = root && root.querySelector("#fsLocate");
      if (loc) { loc.disabled = false; loc.textContent = T.locate; }
      paintCity();
    });
  }

  function boot() {
    if (!shouldShow()) return;
    build();
    const start = () => open();
    if (document.getElementById("prayerGrid")) setTimeout(start, 280);
    else setTimeout(start, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
