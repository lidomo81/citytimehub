/* Lightweight guided tour for the homepage.
   Spotlights the real elements and explains the key + newly-added features.
   It points and explains — it never clicks or changes anything on your behalf.
   Bilingual (ar/en), RTL-aware, no external libraries. Exposes window.CthTour. */
(function () {
  "use strict";
  const lang = document.documentElement.lang === "ar" ? "ar" : "en";
  const reduce = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  const UI = lang === "ar"
    ? { next: "التالي", prev: "السابق", skip: "تخطّي", done: "تمّ", of: "من", all: "كل المميزات", kicker: "جولة تفاعلية" }
    : { next: "Next", prev: "Back", skip: "Skip", done: "Done", of: "of", all: "All features", kicker: "Interactive tour" };

  // The exact same pin icon used to mark the default city on a "My cities" chip,
  // so the tour and the chip show one consistent marker (not a mismatched emoji).
  const PIN_SVG = '<span class="cth-tour-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg></span>';

  // Individual steps. sel = null → a centered card (no spotlight). Targets are
  // resolved at show-time, and any step whose element is missing is skipped.
  const S = {
    welcome: { sel: null,
      ar: { t: "أهلًا بك في CityTimeHub 🌙", b: "جولة سريعة تعرّفك بأهم المميزات في أقل من دقيقة. تقدر تتخطاها في أي وقت." },
      en: { t: "Welcome to CityTimeHub 🌙", b: "A quick tour of the main features in under a minute. You can skip anytime." } },
    welcomeApp: { sel: null,
      ar: { t: "أهلًا بك في تطبيق CityTimeHub 🌙", b: "جولة سريعة على التبويبات الأربعة: الرئيسية، الصلاة، الأذكار، والأدوات — في أقل من دقيقة." },
      en: { t: "Welcome to the CityTimeHub app 🌙", b: "A quick tour of the four tabs — Home, Prayer, Adhkar, and Tools — in under a minute." } },
    appNav: { sel: ".app-bottom-nav", tab: "home", prefer: "above",
      ar: { t: "التبويبات السفلية 📱", b: "الرئيسية: وقتك ومدينتك. الصلاة: المواقيت والتذكير. الأذكار: استيقاظ وصباح ومساء ونوم ورقية. الأدوات: باقي الميزات." },
      en: { t: "Bottom tabs 📱", b: "Home: your time and city. Prayer: times and reminders. Adhkar: waking, morning, evening, bedtime and ruqyah. Tools: everything else." } },
    search: { sel: "#cpSearch", tab: "home",
      ar: { t: "ابحث عن مدينتك 🔍", b: "في تبويب الرئيسية — اكتب اسم أي مدينة وشاهد وقتها ومواقيت صلاتها فورًا." },
      en: { t: "Search your city 🔍", b: "On the Home tab — type any city to see its time and prayer times instantly." } },
    favorite: { sel: "#cpSave", tab: "home",
      ar: { t: "مدينتي المفضّلة ⭐", b: "اضغط النجمة لتحفظ المدينة في قسم «مدني» — تبقى محفوظة كل مرة تفتح التطبيق." },
      en: { t: "My favorite city ⭐", b: "Tap the star to save the city in “My cities” — kept every time you open the app." } },
    myCities: { sel: "#myCities", tab: "home", icon: PIN_SVG,
      ar: { t: "قسم «مدني»", b: "مدنك المحفوظة تظهر هنا في الرئيسية. اضغط اسم أي مدينة لفتحها — والمعلَّمة بهذا الدبوس هي الافتراضية." },
      en: { t: "Your “My cities” section", b: "Your saved cities appear here on Home. Tap a name to open it — the one with this pin is your default." } },
    homeClock: { sel: ".cp-clock", tab: "home",
      ar: { t: "وقت مدينتك 🕐", b: "الساعة الحية لمدينتك المختارة — في تبويب الرئيسية." },
      en: { t: "Your city time 🕐", b: "The live clock for your chosen city — on the Home tab." } },
    cityPulse: { sel: "#cityPulse", tab: "home", prefer: "below",
      ar: { t: "نبض المدينة 🌤️", b: "لمحة عن الطقس والجو في مدينتك — تظهر تلقائيًا في الرئيسية." },
      en: { t: "City pulse 🌤️", b: "A quick weather snapshot for your city — shown automatically on Home." } },
    prayerTimes: { sel: "#prayerGrid", tab: "prayer",
      ar: { t: "مواقيت الصلاة 🕌", b: "في تبويب الصلاة — صلوات اليوم الخمسة مع الشروق. الصلاة الحالية تتحدّد بلمسة ضوئية." },
      en: { t: "Prayer times 🕌", b: "On the Prayer tab — today's five prayers plus sunrise. The current prayer is gently highlighted." } },
    tapCard: { sel: "#prayerGrid", tab: "prayer",
      ar: { t: "اضغط أي بطاقة صلاة 📿", b: "كل بطاقة قابلة للضغط: تفتح أذكار ما بعد الصلاة وفضلها، وتسجّل الفرض والسنة والأذكار — والختم على البطاقة يمتلئ مع التزامك." },
      en: { t: "Tap any prayer card 📿", b: "Every card is tappable: it opens post-prayer adhkar and the prayer’s virtue, and lets you log fard, sunnah and adhkar — the seal on the card fills as you keep up." } },
    adherence: { sel: "#cpNext", tab: "prayer",
      ar: { t: "التزامك اليومي 🌙", b: "عندما تسجّل صلواتك تظهر هنا كلمة تشجيع وسلسلة أيامك — بياناتك على جهازك وحده." },
      en: { t: "Your daily adherence 🌙", b: "As you log prayers, a gentle word and your streak appear here — saved on your device only." } },
    week: { sel: "#cpWeek", tab: "prayer",
      ar: { t: "آخر ٧ أيام 📊", b: "اضغط هذا الشريط لترى إحصائيات التزامك: سلسلتك الحالية، وأطول سلسلة، وآخر ١٤ يومًا." },
      en: { t: "Last 7 days 📊", b: "Tap this strip for your stats: current streak, best streak, and the last 14 days." } },
    insights: { sel: ".prayer-insights", tab: "prayer",
      ar: { t: "لمحات الصلاة ✨", b: "عدّ تنازلي للصلاة القادمة، والثلث الأخير من الليل، وأوقات الكراهة — محسوبة لمدينتك." },
      en: { t: "Prayer insights ✨", b: "Countdown to the next prayer, the last third of the night, and disliked times — for your city." } },
    prayerRemind: { sel: "#cthPrayerRemindSlot", tab: "prayer", prefer: "below",
      ar: { t: "تذكير الأذان 🔔", b: "في تبويب الصلاة — اضغط لاختيار نغمة الإشعار وتفعيل تنبيه كل صلاة." },
      en: { t: "Adhan reminder 🔔", b: "On the Prayer tab — tap to pick a notification sound and get alerted at each prayer." } },
    azkarHub: { sel: ".app-azkar-grid", tab: "azkar", prefer: "below",
      ar: { t: "تبويب الأذكار 📿", b: "هنا أذكار الاستيقاظ والصباح والمساء وقبل النوم والرقية الشرعية — كل مجموعة بعدّاد تكرار وحفظ تلقائي على جهازك." },
      en: { t: "Adhkar tab 📿", b: "Waking, morning, evening, bedtime and ruqyah — each set has a tap counter and auto-save on your device." } },
    azkarRemind: { sel: "#cthAzkarRemindSlot", tab: "azkar", prefer: "below",
      ar: { t: "تذكير الأذكار 🌙", b: "في تبويب الأذكار — فعّل تنبيه أذكار الصباح والمساء وجمعة الذكر." },
      en: { t: "Adhkar reminders 🌙", b: "On the Adhkar tab — enable alerts for morning, evening and Friday adhkar." } },
    widgetsApp: { sel: null,
      ar: { t: "ويدجت الشاشة الرئيسية 📲", b: "من قائمة ويدجتات الموبايل أضف «مواقيت الصلاة» أو «الأذكار» — مواقيت اليوم وأذكار الوقت المناسب بدون ما تفتح التطبيق." },
      en: { t: "Home screen widgets 📲", b: "From your phone’s widget picker, add Prayer times or Adhkar — today’s times and the right adhkar for now, without opening the app." } },
    appTools: { sel: "nav.app-tools", tab: "tools", prefer: "above",
      ar: { t: "الأدوات 🧭", b: "في تبويب الأدوات — ساعة الصلاة، القبلة، فرق التوقيت، مخطّط الأحداث، وأكثر." },
      en: { t: "Tools 🧭", b: "On the Tools tab — prayer clock, Qibla, time difference, meeting planner, and more." } },
    closeOnesTool: { sel: 'nav.app-tools a[href*="close-ones"]', tab: "tools",
      ar: { t: "أحبابك 🤍", b: "من تبويب الأدوات — اضبط مواعيد التواصل مع من تحب حسب توقيتهم." },
      en: { t: "Close Ones 🤍", b: "From the Tools tab — set when to reach loved ones in their local time." } },
    spotlightSite: { sel: "#coHomeStrip", prefer: "below",
      ar: { t: "أحبابك 🤍", b: "اضغط هذا الشريط لضبط مواعيد التواصل مع من تحب — بعد الفجر، قبل الصلاة، أو موعد ثابت — حسب توقيتهم مهما بعدت المسافة." },
      en: { t: "Close Ones 🤍", b: "Tap this strip to set when to reach the people you love — after Fajr, before prayer, or a fixed appointment — in their local time, near or far." } },
    closeOnesHome: { sel: "#coHomeStrip", tab: "home", prefer: "below",
      ar: { t: "أحبابك 🤍", b: "في الرئيسية — اضبط مواعيد التواصل مع من تحب حسب توقيتهم، مهما بعدت المسافة." },
      en: { t: "Close Ones 🤍", b: "On Home — set when to reach loved ones in their local time, near or far." } },
    homeNext: { sel: "#cpNext", tab: "home", prefer: "below",
      ar: { t: "الصلاة القادمة 🕌", b: "لمحة سريعة عن الصلاة التالية — اضغطها للانتقال إلى تبويب الصلاة والمواقيت الكاملة." },
      en: { t: "Next prayer 🕌", b: "A quick peek at the upcoming prayer — tap to open the Prayer tab with full times." } },
    toolsSite: { sel: "#tools",
      ar: { t: "الأدوات 🧭", b: "أذكار الصباح والمساء، فرق التوقيت، مخطّط الأحداث، أفضل وقت للاتصال، القبلة والمزيد — كلها على محرّك وقت حيّ واحد." },
      en: { t: "Tools 🧭", b: "Morning & evening adhkar, time difference, meeting planner, best time to call, Qibla and more — all on one live-time engine." } },
    spotlightApp: { sel: "#homeSpotlight", prefer: "below",
      ar: { t: "أولوياتك اليومية 🤍", b: "أحبابك وتذكير الأذان في المقدمة — ما تحتاجه كل يوم بضغطة واحدة." },
      en: { t: "Your daily priorities 🤍", b: "Close Ones and prayer reminders up front — what you need every day, one tap away." } },
    dailyReflection: { sel: "#dailyReflection", tab: "home", prefer: "above",
      ar: { t: "خاطرة اليوم 🤍", b: "في الرئيسية — حديث صحيح أو آية تتجدّد كل يوم، لتبدأ يومك بلمسة إيمانية هادئة." },
      en: { t: "Daily reflection 🤍", b: "On Home — an authentic hadith or verse that changes each day, for a calm spiritual start." } },
    quickToolsApp: { sel: ".app-tools > .app-tools-group", prefer: "above",
      ar: { t: "باقي الأدوات 🧭", b: "مرتّبة مثل الموقع: الصلاة، الأذكار، الوقت، التخطيط، وخواطر — كل شيء في مكانه." },
      en: { t: "More tools 🧭", b: "Organized like the website: Prayer, Adhkar, Time, Planning and Reflections — everything in its place." } },
    help: { sel: "#helpBtn", prefer: "above",
      ar: { t: "المساعد وإعادة الجولة ❓", b: "زر «؟» هو مساعدك الدائم: اضغطه في أي وقت لإعادة هذه الجولة، أو لعرض قائمة بكل المميزات." },
      en: { t: "Help & replay ❓", b: "The “?” button is your always-there guide: tap it anytime to replay this tour or open the full list of features." } },
    ready: { sel: null, last: true,
      ar: { t: "جاهز! 🎉", b: "يمكنك إعادة هذه الجولة في أي وقت من زر «؟». وفّقك الله وبارك في وقتك." },
      en: { t: "You're all set! 🎉", b: "Replay this tour anytime from the “?” button. May Allah bless your time." } },
  };

  // Site vs app: the app uses bottom tabs — each step can declare `tab` and the
  // tour switches tabs before spotlighting the target.
  function buildSteps() {
    const app = document.documentElement.classList.contains("app-mode");
    if (!app) {
      const list = [S.welcome, S.search, S.favorite, S.myCities, S.prayerTimes, S.tapCard, S.adherence, S.week, S.insights];
      list.push(S.spotlightSite, S.toolsSite);
      list.push(S.help, S.ready);
      return list;
    }
    return [
      S.welcomeApp, S.appNav,
      S.search, S.favorite, S.myCities, S.homeClock, S.cityPulse, S.homeNext, S.dailyReflection, S.closeOnesHome,
      S.prayerTimes, S.tapCard, S.adherence, S.week, S.insights, S.prayerRemind,
      S.azkarHub, S.azkarRemind, S.widgetsApp,
      S.appTools,
      S.help, S.ready,
    ];
  }

  let STEPS = [];
  let root, mask, spot, pop, popTitle, popBody, popCount, popProg, btnPrev, btnNext, btnSkip, btnAll;
  let idx = 0, active = false, dir = 1, rafId = 0, scrollTimer = 0, stepLock = false;
  let lastPop = { x: null, y: null };
  const placementMemory = {}; // sel → side; keeps popup anchored when several steps share one target
  const fadeMs = () => reduce() ? 0 : 200;
  const scrollMs = () => reduce() ? 40 : 460;
  const isApp = () => document.documentElement.classList.contains("app-mode");

  function ensureTab(tab) {
    if (!isApp() || !tab) return Promise.resolve();
    const cur = document.documentElement.getAttribute("data-app-tab") || "home";
    if (cur === tab) return Promise.resolve();
    if (window.CTH_AppTabs && typeof window.CTH_AppTabs.setActiveTab === "function") {
      window.CTH_AppTabs.setActiveTab(tab, { pushHash: false, smooth: false });
    }
    return new Promise(r => setTimeout(r, reduce() ? 60 : 320));
  }

  function build() {
    root = document.createElement("div");
    root.className = "cth-tour";
    if (document.documentElement.classList.contains("app-mode")) root.classList.add("is-app");
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    root.innerHTML =
      '<div class="cth-tour-mask"></div>' +
      '<div class="cth-tour-spot" aria-hidden="true"><span class="cth-tour-ring" aria-hidden="true"></span></div>' +
      '<div class="cth-tour-pop" role="dialog" aria-modal="true" aria-live="polite">' +
        '<div class="cth-tour-progress" aria-hidden="true"><i class="cth-tour-progress-fill"></i></div>' +
        '<button type="button" class="cth-tour-close" aria-label="' + UI.skip + '">✕</button>' +
        '<span class="cth-tour-kicker">' + UI.kicker + '</span>' +
        '<div class="cth-tour-copy">' +
          '<h3 class="cth-tour-title"></h3>' +
          '<p class="cth-tour-body"></p>' +
        '</div>' +
        '<div class="cth-tour-foot">' +
          '<span class="cth-tour-count"></span>' +
          '<div class="cth-tour-btns">' +
            '<button type="button" class="cth-tour-b cth-tour-all"></button>' +
            '<button type="button" class="cth-tour-b cth-tour-prev"></button>' +
            '<button type="button" class="cth-tour-b cth-tour-next cth-tour-primary"></button>' +
          '</div>' +
        '</div>' +
        '<span class="cth-tour-arrow" aria-hidden="true"></span>' +
      '</div>';
    document.body.appendChild(root);
    mask = root.querySelector(".cth-tour-mask");
    spot = root.querySelector(".cth-tour-spot");
    pop = root.querySelector(".cth-tour-pop");
    popTitle = root.querySelector(".cth-tour-title");
    popBody = root.querySelector(".cth-tour-body");
    popCount = root.querySelector(".cth-tour-count");
    popProg = root.querySelector(".cth-tour-progress-fill");
    btnPrev = root.querySelector(".cth-tour-prev");
    btnNext = root.querySelector(".cth-tour-next");
    btnSkip = root.querySelector(".cth-tour-close");
    btnAll = root.querySelector(".cth-tour-all");
    btnPrev.textContent = UI.prev;
    btnAll.textContent = UI.all;
    btnPrev.addEventListener("click", () => go(-1));
    btnNext.addEventListener("click", () => go(1));
    btnSkip.addEventListener("click", stop);
    mask.addEventListener("click", stop);
    btnAll.addEventListener("click", () => { stop(); if (typeof window.__cthOpenHelpSheet === "function") window.__cthOpenHelpSheet(); });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    if (!active || stepLock) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(position, 120);
  }

  function onKey(e) {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); stop(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(lang === "ar" ? -1 : 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(lang === "ar" ? 1 : -1); }
  }

  const resolve = i => { const s = STEPS[i]; return s && s.sel ? document.querySelector(s.sel) : null; };
  // A target counts only if it is actually laid out (not display:none / hidden / empty).
  const shown = el => !!(el && el.getClientRects().length);

  // App tabs hide off-tab targets with CSS. A step that declares `tab` is still
  // reachable — render() will switch tabs before spotlighting. Only skip when
  // the element is missing, or it's on the *current* tab but not laid out
  // (e.g. empty "My cities").
  function stepReachable(i) {
    const s = STEPS[i];
    if (!s) return false;
    if (!s.sel) return true;
    const el = resolve(i);
    if (!el) return false;
    if (isApp() && s.tab) {
      const cur = document.documentElement.getAttribute("data-app-tab") || "home";
      if (s.tab !== cur) return true;
    }
    return shown(el);
  }

  function go(step) {
    dir = step >= 0 ? 1 : -1;
    let i = idx + step;
    while (i >= 0 && i < STEPS.length) { if (stepReachable(i)) break; i += dir; }
    if (i < 0) return;
    if (i >= STEPS.length) { stop(); return; }
    idx = i; render();
  }

  function hidePop(cb) {
    clearTimeout(pop._fadeT);
    if (!pop.classList.contains("is-visible")) { if (cb) cb(); return; }
    pop.classList.remove("is-visible");
    spot.classList.remove("is-visible");
    pop._fadeT = setTimeout(cb || (() => {}), fadeMs());
  }
  function revealPop() {
    requestAnimationFrame(() => {
      pop.classList.add("is-visible");
      if (!spot.hidden) spot.classList.add("is-visible");
    });
  }

  function render() {
    clearTimeout(scrollTimer);
    hidePop(() => {
      const s = STEPS[idx], x = s[lang] || s.en;
      popTitle.textContent = x.t;
      if (s.icon) popTitle.insertAdjacentHTML("beforeend", s.icon);
      popBody.textContent = x.b;
      popCount.textContent = (idx + 1) + " " + UI.of + " " + STEPS.length;
      if (popProg) popProg.style.width = ((idx + 1) / STEPS.length * 100).toFixed(1) + "%";
      btnPrev.hidden = idx === 0;
      btnNext.textContent = s.last ? UI.done : UI.next;
      btnAll.hidden = !s.last;
      stepLock = true;
      ensureTab(s.tab || (isApp() ? "home" : null)).then(() => {
        const runStep = (attempt) => {
          const target = resolve(idx);
          if (s.sel === "#dailyReflection" && !shown(target) && attempt < 24) {
            scrollTimer = setTimeout(() => runStep(attempt + 1), 200);
            return;
          }
          const finish = () => {
            stepLock = false;
            position();
            revealPop();
          };
          if (shown(target) && s.sel) {
            root.classList.remove("is-center");
            spot.hidden = false;
            const rect = target.getBoundingClientRect();
            const tall = rect.height > window.innerHeight * 0.66;
            const block = tall ? "start" : "center";
            try { target.scrollIntoView({ block, inline: "nearest", behavior: reduce() ? "auto" : "smooth" }); } catch (e) { target.scrollIntoView(); }
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(finish, scrollMs());
          } else {
            root.classList.add("is-center");
            spot.hidden = true;
            finish();
          }
        };
        runStep(0);
      });
    });
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(n, hi)); }
  function popRectAt(left, top, w, h) {
    return { left, top, right: left + w, bottom: top + h, width: w, height: h };
  }
  function overlapArea(a, b) {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  }
  function avoidZones(skipSel) {
    const zones = [];
    const insideTools = skipSel && (skipSel.includes("app-tools") || skipSel === "#dailyReflection");
    const list = ["#prayerGrid", "#cpNext", "#cpWeek", ".prayer-insights", "#ltAnalog", "#dailyReflection"];
    if (isApp() && !insideTools) list.push(".app-bottom-nav");
    if (isApp() && skipSel !== ".app-bottom-nav" && !insideTools) list.push("nav.app-tools");
    if (isApp() && skipSel !== "#helpBtn") list.push("#helpBtn");
    list.forEach(sel => {
      if (sel === skipSel) return;
      const el = document.querySelector(sel);
      if (shown(el)) zones.push(el.getBoundingClientRect());
    });
    return zones;
  }
  function bottomInset() {
    let base = isApp() ? 72 : 14;
    if (isApp()) {
      const nav = document.querySelector(".app-bottom-nav");
      if (nav && shown(nav)) {
        const nr = nav.getBoundingClientRect();
        base = Math.max(base, window.innerHeight - nr.top + 12);
      }
      const fab = document.getElementById("helpBtn");
      if (fab && shown(fab)) {
        const fr = fab.getBoundingClientRect();
        base = Math.max(base, window.innerHeight - fr.top + 18);
      }
    }
    return base;
  }
  function hitsTarget(popR, targetR, pad) {
    const p = pad || 8;
    const t = popRectAt(targetR.left - p, targetR.top - p, targetR.width + p * 2, targetR.height + p * 2);
    return overlapArea(popR, t) > 0;
  }
  function sideOptions(r, vw, vh, step) {
    const cx = r.left + r.width / 2;
    const low = r.top > vh * 0.4;
    const high = r.bottom < vh * 0.36;
    const opts = [];
    const add = (side, pri) => opts.push({ side, pri });
    if (step.prefer) add(step.prefer, 14);
    if (step.sel === ".app-bottom-nav") add("above", 22);
    if (step.sel === "#helpBtn") add(cx > vw * 0.5 ? "left" : "right", 15);
    if (high || !low) { add("below", 9); add("right", 6); add("left", 6); }
    if (low || !high) { add("above", 10); add("right", 7); add("left", 7); }
    if (isApp() && step.sel && (step.sel.includes("app-tools") || step.sel === "#dailyReflection")) add("above", 12);
    if (!isApp()) add("dock", 2);
    const best = {};
    opts.forEach(o => { if (!best[o.side] || best[o.side] < o.pri) best[o.side] = o.pri; });
    return Object.keys(best).map(side => ({ side, pri: best[side] }));
  }
  function placementForSide(r, popW, popH, vw, vh, m, gap, bottomM, side) {
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let left, top;
    switch (side) {
      case "below": top = r.bottom + gap; left = cx - popW / 2; break;
      case "above": top = r.top - gap - popH; left = cx - popW / 2; break;
      case "right": top = cy - popH / 2; left = r.right + gap; break;
      case "left": top = cy - popH / 2; left = r.left - gap - popW; break;
      case "dock": top = vh - popH - bottomM; left = (vw - popW) / 2; break;
      default: top = vh - popH - bottomM; left = (vw - popW) / 2; side = "dock";
    }
    return {
      left: clamp(left, m, vw - popW - m),
      top: clamp(top, m, vh - popH - bottomM),
      side,
    };
  }
  function resolvePlacement(step, r, popW, popH, vw, vh) {
    const m = 14;
    const gap = isApp() ? 16 : 20;
    const bottomM = bottomInset();
    const zones = avoidZones(step.sel);
    const tr = popRectAt(r.left, r.top, r.width, r.height);
    const trySides = [];
    const remembered = step.sel ? placementMemory[step.sel] : null;
    if (remembered) trySides.push({ side: remembered, pri: 18 });
    sideOptions(r, vw, vh, step).forEach(o => trySides.push(o));
    const seen = new Set();
    const ordered = trySides.sort((a, b) => b.pri - a.pri).filter(o => {
      if (seen.has(o.side)) return false;
      seen.add(o.side);
      return true;
    });
    let best = null, bestScore = -Infinity;
    ordered.forEach(({ side, pri }) => {
      const place = placementForSide(r, popW, popH, vw, vh, m, gap, bottomM, side);
      const pr = popRectAt(place.left, place.top, popW, popH);
      if (hitsTarget(pr, tr)) return;
      let score = pri * 50;
      zones.forEach(z => { score -= overlapArea(pr, popRectAt(z.left, z.top, z.width, z.height)) * 2.2; });
      score -= Math.abs(place.top + popH / 2 - (tr.top + tr.height / 2)) * 0.06;
      if (score > bestScore) { bestScore = score; best = place; }
    });
    if (!best) {
      best = {
        left: clamp((vw - popW) / 2, m, vw - popW - m),
        top: isApp() ? m : clamp(vh - popH - bottomM, m, vh - popH - bottomM),
        side: isApp() ? "above" : "dock",
      };
    }
    return best;
  }
  function placePop(x, y) {
    pop.style.setProperty("--tx", x + "px");
    pop.style.setProperty("--ty", y + "px");
    lastPop.x = x; lastPop.y = y;
  }
  function setArrow(targetRect) {
    const sides = ["arr-top", "arr-bottom", "arr-left", "arr-right", "arr-none"];
    pop.classList.remove(...sides);
    if (!targetRect) { pop.classList.add("arr-none"); return; }
    const p = pop.getBoundingClientRect();
    const tCx = targetRect.left + targetRect.width / 2;
    const tCy = targetRect.top + targetRect.height / 2;
    const opts = [
      { cls: "arr-bottom", gap: tCy - p.bottom, ok: tCy > p.bottom + 4 },
      { cls: "arr-top", gap: p.top - tCy, ok: tCy < p.top - 4 },
      { cls: "arr-right", gap: tCx - p.right, ok: tCx > p.right + 4 },
      { cls: "arr-left", gap: p.left - tCx, ok: tCx < p.left - 4 },
    ].filter(o => o.ok).sort((a, b) => a.gap - b.gap);
    pop.classList.add(opts[0] ? opts[0].cls : "arr-none");
  }

  function position() {
    if (!active) return;
    const s = STEPS[idx], el = resolve(idx);
    const vw = window.innerWidth, vh = window.innerHeight;
    const app = isApp();
    if (!el || !s.sel) {
      placePop(Math.max(14, (vw - pop.offsetWidth) / 2), Math.max(14, vh - pop.offsetHeight - (app ? 32 : 28)));
      setArrow(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    let rad = 14;
    try { rad = parseFloat(getComputedStyle(el).borderRadius) || 14; } catch (e) {}
    spot.style.top = (r.top - pad) + "px";
    spot.style.left = (r.left - pad) + "px";
    spot.style.width = (r.width + pad * 2) + "px";
    spot.style.height = (r.height + pad * 2) + "px";
    spot.style.borderRadius = (rad + pad) + "px";
    const popH = pop.offsetHeight, popW = pop.offsetWidth;
    const place = resolvePlacement(s, r, popW, popH, vw, vh);
    if (s.sel) placementMemory[s.sel] = place.side;
    placePop(place.left, place.top);
    setArrow(el && s.sel ? r : null);
  }

  function schedule() { if (!active || stepLock) return; cancelAnimationFrame(rafId); rafId = requestAnimationFrame(position); }

  function start() {
    if (active) return;
    if (!root) build();
    STEPS = buildSteps();
    active = true; idx = 0; dir = 1;
    lastPop = { x: null, y: null };
    Object.keys(placementMemory).forEach(k => delete placementMemory[k]);
    if (isApp() && window.CTH_AppTabs && typeof window.CTH_AppTabs.setActiveTab === "function") {
      window.CTH_AppTabs.setActiveTab("home", { pushHash: false, smooth: false });
    }
    document.documentElement.classList.add("cth-tour-on");
    root.classList.add("is-active");
    render();
  }

  function stop() {
    if (!active) return;
    active = false;
    clearTimeout(scrollTimer);
    clearTimeout(pop._fadeT);
    pop.classList.remove("is-visible");
    spot.classList.remove("is-visible");
    root.classList.remove("is-active");
    document.documentElement.classList.remove("cth-tour-on");
    try { localStorage.setItem("cth-tour-seen", "1"); } catch (e) {}
  }

  const seen = () => { try { return localStorage.getItem("cth-tour-seen") === "1"; } catch (e) { return false; } };

  window.CthTour = { start, stop, seen };
})();
