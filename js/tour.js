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
    search: { sel: "#cpSearch",
      ar: { t: "ابحث عن مدينتك 🔍", b: "اكتب اسم أي مدينة وشاهد وقتها ومواقيت صلاتها فورًا — من ٥٠٠ مدينة، أو أي مدينة حول العالم." },
      en: { t: "Search your city 🔍", b: "Type any city to see its time and prayer times instantly — from 500 cities, or anywhere worldwide." } },
    favorite: { sel: "#cpSave",
      ar: { t: "مدينتي المفضّلة ⭐", b: "اضغط النجمة لتحفظ المدينة، فتُجمَع كل مدنك في قسم «مدني»، وتبقى محفوظة كل مرة تفتح — حتى لو كانت مدينة من أي مكان في العالم. وسأريك مكانها الآن 👇" },
      en: { t: "My favorite city ⭐", b: "Tap the star to save a city; all your cities gather in the “My cities” section, kept every time you open — even a worldwide city. Let me show you where 👇" } },
    myCities: { sel: "#myCities", icon: PIN_SVG,
      ar: { t: "قسم «مدني»", b: "هنا تُجمع مدنك المحفوظة. اضغط اسم أي مدينة لفتحها وجعلها المدينة التي تظهر عند كل فتح — والمعلَّمة بهذا الدبوس تمامًا كما تراه على البطاقة. واضغط × لإزالتها." },
      en: { t: "Your “My cities” section", b: "Your saved cities gather here. Tap a name to open it and make it the one shown every time you open — marked with this same pin you see on the chip. Tap × to remove it." } },
    prayerTimes: { sel: "#prayerGrid",
      ar: { t: "مواقيت الصلاة 🕌", b: "صلوات اليوم الخمسة مع الشروق. الصلاة الحالية تتحدّد بلمسة ضوئية لطيفة." },
      en: { t: "Prayer times 🕌", b: "Today's five prayers plus sunrise. The current prayer is gently highlighted." } },
    tapCard: { sel: "#prayerGrid",
      ar: { t: "اضغط أي بطاقة صلاة 📿", b: "تفتح لك أذكار ما بعد الصلاة، وفضلها بحديث صحيح، ويمكنك تسجيل التزامك: صلّيت الفرض، والسنة، وقلت الأذكار." },
      en: { t: "Tap any prayer card 📿", b: "It opens the post-prayer adhkar, its virtue from an authentic hadith, and lets you log your prayer — fard, sunnah and adhkar." } },
    adherence: { sel: "#cpNext",
      ar: { t: "التزامك اليومي 🌙", b: "عندما تسجّل صلواتك تظهر هنا كلمة تشجيع لطيفة وسلسلة أيامك. بياناتك محفوظة على جهازك وحده." },
      en: { t: "Your daily adherence 🌙", b: "As you log prayers, a gentle word and your streak appear here. Your data stays on your device only." } },
    week: { sel: "#cpWeek",
      ar: { t: "آخر ٧ أيام 📊", b: "اضغط هذا الشريط لترى إحصائيات التزامك: سلسلتك الحالية، وأطول سلسلة، وآخر ١٤ يومًا." },
      en: { t: "Last 7 days 📊", b: "Tap this strip to see your adherence stats: current streak, best streak, and the last 14 days." } },
    insights: { sel: ".prayer-insights",
      ar: { t: "لمحات الصلاة ✨", b: "العدّ التنازلي للصلاة القادمة، والثلث الأخير من الليل، وأوقات الكراهة — كلها محسوبة لمدينتك تلقائيًا." },
      en: { t: "Prayer insights ✨", b: "A countdown to the next prayer, the last third of the night, and the disliked times — all computed for your city." } },
    toolsSite: { sel: "#tools",
      ar: { t: "الأدوات 🧭", b: "أذكار الصباح والمساء، فرق التوقيت، مخطط الاجتماعات، أفضل وقت للاتصال، القبلة والمزيد — كلها مبنية على نفس محرّك الوقت الحيّ." },
      en: { t: "Tools 🧭", b: "Morning & evening adhkar, time difference, meeting planner, best time to call, Qibla and more — all built on the same live-time engine." } },
    spotlightApp: { sel: "#appToolsSpotlight", prefer: "below",
      ar: { t: "أولوياتك اليومية 🤍", b: "أحبابك وتذكير الأذان في المقدمة — ما تحتاجه كل يوم بضغطة واحدة." },
      en: { t: "Your daily priorities 🤍", b: "Close Ones and prayer reminders up front — what you need every day, one tap away." } },
    dailyReflection: { sel: "#dailyReflection", prefer: "below",
      ar: { t: "خاطرة اليوم 🤍", b: "حديث صحيح أو آية تتجدّد كل يوم، لتبدأ يومك بلمسة إيمانية هادئة." },
      en: { t: "Daily reflection 🤍", b: "An authentic hadith or verse that changes each day, to start your day with a calm spiritual touch." } },
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

  // Assemble the steps for the current surface: the app shows the spotlight row
  // (Close Ones + injected Reminders card), daily reflection, then tool groups;
  // the website shows its own Tools section instead. Everything else is shared.
  function buildSteps() {
    const app = document.documentElement.classList.contains("app-mode");
    const list = [S.welcome, S.search, S.favorite, S.myCities, S.prayerTimes, S.tapCard, S.adherence, S.week, S.insights];
    if (app) list.push(S.spotlightApp, S.dailyReflection, S.quickToolsApp);
    else list.push(S.toolsSite);
    list.push(S.help, S.ready);
    return list;
  }

  let STEPS = [];
  let root, mask, spot, pop, popTitle, popBody, popCount, popProg, btnPrev, btnNext, btnSkip, btnAll;
  let idx = 0, active = false, dir = 1, rafId = 0, scrollTimer = 0, stepLock = false;
  let lastPop = { x: null, y: null };
  const placementMemory = {}; // sel → side; keeps popup anchored when several steps share one target
  const fadeMs = () => reduce() ? 0 : 200;
  const scrollMs = () => reduce() ? 40 : 460;
  const isApp = () => document.documentElement.classList.contains("app-mode");

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

  function go(step) {
    dir = step >= 0 ? 1 : -1;
    let i = idx + step;
    // skip steps whose target is gone or currently hidden (e.g. the empty "My cities" row)
    while (i >= 0 && i < STEPS.length) { if (!STEPS[i].sel || shown(resolve(i))) break; i += dir; }
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
      if (s.icon) popTitle.insertAdjacentHTML("beforeend", s.icon); // trusted, hardcoded markup
      popBody.textContent = x.b;
      popCount.textContent = (idx + 1) + " " + UI.of + " " + STEPS.length;
      if (popProg) popProg.style.width = ((idx + 1) / STEPS.length * 100).toFixed(1) + "%";
      btnPrev.hidden = idx === 0;
      btnNext.textContent = s.last ? UI.done : UI.next;
      btnAll.hidden = !s.last;
      const el = resolve(idx);
      stepLock = true;
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
          // Small targets (icons, tool tiles, chips) are always centered so they sit
          // clearly in view with room for the bubble — no manual scrolling needed.
          // Only sections taller than most of the screen align to their top instead.
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
    if (isApp() && !insideTools) list.push(".app-tools");
    if (isApp() && skipSel !== "#helpBtn") list.push("#helpBtn");
    list.forEach(sel => {
      if (sel === skipSel) return;
      const el = document.querySelector(sel);
      if (shown(el)) zones.push(el.getBoundingClientRect());
    });
    return zones;
  }
  function bottomInset() {
    let base = isApp() ? 118 : 14;
    if (isApp()) {
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
    STEPS = buildSteps();           // pick site vs app steps at launch time
    active = true; idx = 0; dir = 1;
    lastPop = { x: null, y: null };
    Object.keys(placementMemory).forEach(k => delete placementMemory[k]);
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
