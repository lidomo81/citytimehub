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
    myCities: { sel: "#myCities",
      ar: { t: "قسم «مدني» 📍", b: "هنا تُجمع مدنك المحفوظة. احفظ مدينة بالنجمة فتظهر هنا كشرائح — اضغط اسم المدينة لفتحها، أو × لإزالتها. حتى لو لم تحفظ بعد، هذا هو مكانها." },
      en: { t: "Your “My cities” section 📍", b: "Your saved cities gather here as chips. Tap a name to open it, or × to remove. Even before you save one, this is where they will appear." } },
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
    dailyReflection: { sel: ".daily-reflection",
      ar: { t: "خاطرة اليوم 🤍", b: "حديث صحيح أو آية تتجدّد كل يوم، لتبدأ يومك بلمسة إيمانية هادئة." },
      en: { t: "Daily reflection 🤍", b: "An authentic hadith or verse that changes each day, to start your day with a calm spiritual touch." } },
    quickToolsApp: { sel: ".app-tools",
      ar: { t: "أدواتك السريعة 🧭", b: "كل الأدوات في متناول يدك، مرتّبة حسب النوع: الصلاة، والوقت، والتاريخ، والمعرفة — وفيها زر «التذكيرات» 🔔 لتنبيهك عند كل صلاة." },
      en: { t: "Quick tools 🧭", b: "All tools at hand, grouped by type: Prayer, Time, Date and Knowledge — including the Reminders 🔔 tile that alerts you at each prayer." } },
    help: { sel: "#helpBtn",
      ar: { t: "المساعد وإعادة الجولة ❓", b: "زر «؟» هو مساعدك الدائم: اضغطه في أي وقت لإعادة هذه الجولة، أو لعرض قائمة بكل المميزات." },
      en: { t: "Help & replay ❓", b: "The “?” button is your always-there guide: tap it anytime to replay this tour or open the full list of features." } },
    ready: { sel: null, last: true,
      ar: { t: "جاهز! 🎉", b: "يمكنك إعادة هذه الجولة في أي وقت من زر «؟». وفّقك الله وبارك في وقتك." },
      en: { t: "You're all set! 🎉", b: "Replay this tour anytime from the “?” button. May Allah bless your time." } },
  };

  // Assemble the steps for the current surface: the app shows the daily reflection
  // and the Quick-tools row (with the injected Reminders tile); the website shows
  // its own Tools section instead. Everything else is shared.
  function buildSteps() {
    const app = document.documentElement.classList.contains("app-mode");
    const list = [S.welcome, S.search, S.favorite, S.myCities, S.prayerTimes, S.tapCard, S.adherence, S.week, S.insights];
    if (app) list.push(S.dailyReflection, S.quickToolsApp);
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
      popBody.textContent = x.b;
      popCount.textContent = (idx + 1) + " " + UI.of + " " + STEPS.length;
      if (popProg) popProg.style.width = ((idx + 1) / STEPS.length * 100).toFixed(1) + "%";
      btnPrev.hidden = idx === 0;
      btnNext.textContent = s.last ? UI.done : UI.next;
      btnAll.hidden = !s.last;
      const el = resolve(idx);
      stepLock = true;
      const finish = () => {
        stepLock = false;
        position();
        revealPop();
      };
      if (shown(el) && s.sel) {
        root.classList.remove("is-center");
        spot.hidden = false;
        try { el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce() ? "auto" : "smooth" }); } catch (e) { el.scrollIntoView(); }
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(finish, scrollMs());
      } else {
        root.classList.add("is-center");
        spot.hidden = true;
        finish();
      }
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
    ["#prayerGrid", "#cpNext", "#cpWeek", ".prayer-insights", "#ltAnalog", ".daily-reflection"].forEach(sel => {
      if (sel === skipSel) return;
      const el = document.querySelector(sel);
      if (shown(el)) zones.push(el.getBoundingClientRect());
    });
    return zones;
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
  // Pick a spot that stays on-screen, avoids the highlight, and steers clear of other UI text.
  function bestPlacement(target, popW, popH, vw, vh, m, gap, bottomM, zones, prev) {
    const r = target;
    const cx = r.left + r.width / 2;
    const raw = [
      { top: r.bottom + gap, left: cx - popW / 2, pri: 3, side: "below" },
      { top: r.top - gap - popH, left: cx - popW / 2, pri: 2, side: "above" },
      { top: r.top + r.height / 2 - popH / 2, left: r.right + gap, pri: cx < vw * 0.5 ? 5 : 4, side: "right" },
      { top: r.top + r.height / 2 - popH / 2, left: r.left - gap - popW, pri: cx > vw * 0.55 ? 5 : 4, side: "left" },
      { top: vh - popH - bottomM, left: (vw - popW) / 2, pri: 2, side: "dock" },
    ];
    let best = null, bestScore = -Infinity;
    raw.forEach(c => {
      const left = clamp(c.left, m, vw - popW - m);
      const top = clamp(c.top, m, vh - popH - bottomM);
      const pr = popRectAt(left, top, popW, popH);
      const tr = popRectAt(r.left, r.top, r.width, r.height);
      let score = c.pri * 40 - overlapArea(pr, tr) * 5;
      zones.forEach(z => { score -= overlapArea(pr, popRectAt(z.left, z.top, z.width, z.height)) * 1.8; });
      if (score > bestScore) { bestScore = score; best = { left, top, side: c.side }; }
    });
    return best || { left: m, top: m, side: "dock" };
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
    const vw = window.innerWidth, vh = window.innerHeight, m = 14;
    const app = document.documentElement.classList.contains("app-mode");
    const bottomM = app ? 108 : m;
    const gap = 20;
    if (!el || !s.sel) {
      placePop(Math.max(m, (vw - pop.offsetWidth) / 2), Math.max(m, vh - pop.offsetHeight - (app ? 32 : 28)));
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
    const remembered = s.sel ? placementMemory[s.sel] : null;
    const place = remembered
      ? placementForSide(r, popW, popH, vw, vh, m, gap, bottomM, remembered)
      : bestPlacement(r, popW, popH, vw, vh, m, gap, bottomM, avoidZones(s.sel), lastPop);
    if (s.sel && !remembered) placementMemory[s.sel] = place.side;
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
