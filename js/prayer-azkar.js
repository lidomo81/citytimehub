/* Post-prayer adhkar (أذكار بعد الصلاة).
   The whole prayer tile is tappable: it opens a sheet with a misbaha (📿)
   header titled "Post-Prayer Adhkar", a short piece about that prayer
   (its meaning, time, obligatory and regular sunnah rak'ahs), and the
   adhkar reader (CTHAzkar engine). Sunrise is not a prayer, so it is not
   tappable. Fully client-side; nothing here touches the native app. */
(function () {
  "use strict";
  const dataEl = document.getElementById("prayerAzkarData");
  if (!dataEl || !window.CTHAzkar) return;
  let items = [];
  try { items = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!items.length) return;

  const lang = document.documentElement.lang === "ar" ? "ar" : "en";
  const T = lang === "ar"
    ? { title: "أذكار ما بعد الصلاة", aria: "افتح أذكار ما بعد الصلاة ومعلومات الصلاة", close: "إغلاق",
        fTime: "يبدأ وقتها:", fFard: "فرضها:", fSunnah: "السنة الراتبة:", sec: "الأذكار المأثورة",
        trackTitle: "سجِّل التزامك", trackHint: "لمدينتك — يظهر إنجازك على البطاقة",
        tFard: "صلّيت الفرض", tSunnah: "صلّيت السنة", tAzkar: "قلت الأذكار",
        celebrate: ["تقبّل الله 🤍", "أحسنتَ 🌙", "نورٌ على نور ✨", "بُوركتَ ❤️"] }
    : { title: "Post-Prayer Adhkar", aria: "Open post-prayer adhkar and prayer info", close: "Close",
        fTime: "Its time:", fFard: "Obligatory:", fSunnah: "Regular sunnah:", sec: "The adhkar",
        trackTitle: "Log your adherence", trackHint: "For your city — shown on the card",
        tFard: "Prayed the fard", tSunnah: "Prayed the sunnah", tAzkar: "Said the adhkar",
        celebrate: ["Accepted 🤍", "Well done 🌙", "Light upon light ✨", "Blessed ❤️"] };

  // Asr has no confirmed regular sunnah → no sunnah tracker for it.
  const HAS_SUNNAH = { Fajr: true, Dhuhr: true, Asr: false, Maghrib: true, Isha: true };

  // A short, human piece about each obligatory prayer (Sunrise excluded).
  const INFO = {
    Fajr: {
      ar: { emoji: "🌅", name: "صلاة الفجر", desc: "يبدأ اليوم بلحظة هادئة لا يشبهها شيء. في وقت الفجر يستيقظ الكون ببطء، وتبدأ أول محطة في يوم المسلم. إنها صلاة تمنح القلب سكينة قبل أن تمتلئ الحياة بضجيجها، ولذلك كانت سنة الفجر من أحب النوافل إلى النبي ﷺ.", time: "من الفجر الصادق حتى شروق الشمس.", fard: "ركعتان.", sunnah: "ركعتان قبل الفرض." },
      en: { emoji: "🌅", name: "Fajr Prayer", desc: "The day begins with a quiet moment like no other. At Fajr the world wakes slowly, and the first station of the Muslim's day begins. It is a prayer that gives the heart calm before life fills with its noise — which is why the sunnah of Fajr was among the most beloved voluntary prayers to the Prophet ﷺ.", time: "From true dawn until sunrise.", fard: "Two rak'ahs.", sunnah: "Two rak'ahs before the obligatory." },
    },
    Dhuhr: {
      ar: { emoji: "☀️", name: "صلاة الظهر", desc: "في منتصف النهار، وبين العمل والانشغال، تأتي الظهر لتمنحك استراحةً مختلفة. دقائق قليلة تعيد ترتيب القلب قبل أن تواصل بقية يومك، وكأنها تذكير بأن النجاح الحقيقي يبدأ بالقرب من الله.", time: "بعد زوال الشمس حتى دخول وقت العصر.", fard: "أربع ركعات.", sunnah: "أربع ركعات قبل الفرض وركعتان بعده." },
      en: { emoji: "☀️", name: "Dhuhr Prayer", desc: "In the middle of the day, between work and busyness, Dhuhr comes to give you a different kind of rest. A few minutes that reorder the heart before you carry on with the rest of your day — a reminder that real success begins with nearness to Allah.", time: "After the sun's decline until the time of Asr.", fard: "Four rak'ahs.", sunnah: "Four rak'ahs before the obligatory and two after it." },
    },
    Asr: {
      ar: { emoji: "🌤️", name: "صلاة العصر", desc: "حين يقترب النهار من نهايته، تدعوك صلاة العصر إلى ألا يمر يومك دون أن تختمه بطاعة. وقد جاء التأكيد على المحافظة عليها في القرآن والسنة، لما لها من مكانة عظيمة.", time: "من دخول وقت العصر حتى غروب الشمس.", fard: "أربع ركعات.", sunnah: "لا توجد سنة راتبة مؤكدة، ويُستحب لمن شاء أن يصلي أربع ركعات قبل العصر." },
      en: { emoji: "🌤️", name: "Asr Prayer", desc: "As the day nears its end, Asr calls you not to let your day pass without sealing it with an act of obedience. The Qur'an and the Sunnah both stressed guarding it, for its great standing.", time: "From the start of Asr until sunset.", fard: "Four rak'ahs.", sunnah: "No confirmed regular sunnah; it is recommended, for whoever wishes, to pray four rak'ahs before Asr." },
    },
    Maghrib: {
      ar: { emoji: "🌇", name: "صلاة المغرب", desc: "ما إن تغيب الشمس حتى يبدأ فصل جديد من اليوم. يحمل أذان المغرب معه شعورًا بالطمأنينة، ويذكّرنا بأن لكل نهاية بداية أخرى، وأن الليل يبدأ بذكر الله.", time: "من غروب الشمس حتى دخول وقت العشاء.", fard: "ثلاث ركعات.", sunnah: "ركعتان بعد الفرض." },
      en: { emoji: "🌇", name: "Maghrib Prayer", desc: "The moment the sun sets, a new chapter of the day begins. The call of Maghrib carries a feeling of calm, reminding us that every ending is another beginning, and that the night starts with the remembrance of Allah.", time: "From sunset until the time of Isha.", fard: "Three rak'ahs.", sunnah: "Two rak'ahs after the obligatory." },
    },
    Isha: {
      ar: { emoji: "🌙", name: "صلاة العشاء", desc: "عندما يهدأ كل شيء، تأتي العشاء لتكون آخر لقاء مع الله في يومك. وبعدها يبدأ وقت الوتر وقيام الليل، لتبقى أبواب الخير مفتوحة لمن أراد أن يختم يومه بالقرب من ربه.", time: "من غياب الشفق الأحمر حتى طلوع الفجر، والأفضل أداؤها قبل منتصف الليل لمن تيسّر له.", fard: "أربع ركعات.", sunnah: "ركعتان بعد الفرض." },
      en: { emoji: "🌙", name: "Isha Prayer", desc: "When everything grows still, Isha comes as the last meeting with Allah in your day. After it begins the time of Witr and the night prayer, so the doors of good stay open for whoever wishes to seal his day close to his Lord.", time: "From the disappearance of the red twilight until dawn; it is better to pray it before midnight for whoever is able.", fard: "Four rak'ahs.", sunnah: "Two rak'ahs after the obligatory." },
    },
  };

  // Authentic virtue (fadl) of each prayer — Sahihayn only. Fajr, Asr and Isha have
  // a prayer-specific hadith; Dhuhr and Maghrib have none in al-Bukhari/Muslim, so the
  // label is honest that it is the virtue of the five daily prayers, not that one alone.
  const FADL = {
    Fajr: {
      ar: { label: "فضل صلاة الفجر", text: "رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا", src: "رواه مسلم" },
      en: { label: "The virtue of Fajr", text: "The two rak'ahs of Fajr are better than the world and all that is in it.", src: "Muslim" },
    },
    Dhuhr: {
      ar: { label: "فضل المحافظة على الصلاة", text: "مَثَلُ الصَّلَوَاتِ الْخَمْسِ كَمَثَلِ نَهَرٍ جَارٍ غَمْرٍ عَلَى بَابِ أَحَدِكُمْ، يَغْتَسِلُ مِنْهُ كُلَّ يَوْمٍ خَمْسًا", src: "رواه مسلم" },
      en: { label: "The virtue of guarding the prayers", text: "The five daily prayers are like a flowing river at the door of one of you, in which he bathes five times a day.", src: "Muslim" },
    },
    Asr: {
      ar: { label: "فضل صلاة العصر", text: "مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ", src: "متفق عليه" },
      en: { label: "The virtue of Asr", text: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.", src: "Agreed upon" },
    },
    Maghrib: {
      ar: { label: "فضل الصلوات الخمس", text: "الصَّلَوَاتُ الْخَمْسُ… كَفَّارَةٌ لِمَا بَيْنَهُنَّ مَا اجْتُنِبَتِ الْكَبَائِرُ", src: "رواه مسلم" },
      en: { label: "The virtue of the five prayers", text: "The five daily prayers are an expiation for what is between them, so long as major sins are avoided.", src: "Muslim" },
    },
    Isha: {
      ar: { label: "فضل صلاة العشاء", text: "مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ", src: "رواه مسلم" },
      en: { label: "The virtue of Isha", text: "Whoever prays Isha in congregation, it is as though he prayed half the night.", src: "Muslim" },
    },
  };

  // order of tiles rendered by the panel
  const ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  // next tile index -> current obligatory prayer index (for the "due" glow)
  const CURRENT_FOR_NEXT = { 0: 5, 1: 0, 2: 0, 3: 2, 4: 3, 5: 4 };

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const readKey = name => `cth-prayer-azkar-read:${todayStr()}:${name}`;
  const isRead = name => { try { return localStorage.getItem(readKey(name)) === "1"; } catch (e) { return false; } };
  const markRead = name => { try { localStorage.setItem(readKey(name), "1"); } catch (e) {} };

  /* ---- worship tracking (fard / sunnah / azkar), one record per day ----
     State is global per day (you pray once a day), but the trackers and the
     card badges only show for the user's own city (local/saved). */
  const worshipKey = () => `cth-worship:${todayStr()}`;
  function getWorship() { try { return JSON.parse(localStorage.getItem(worshipKey()) || "{}") || {}; } catch (e) { return {}; } }
  function setWorship(o) { try { localStorage.setItem(worshipKey(), JSON.stringify(o)); } catch (e) {} }
  function wState(name) { const w = getWorship()[name] || {}; return { fard: !!w.f, sunnah: !!w.s, azkar: !!w.a }; }
  const KIND_KEY = { fard: "f", sunnah: "s", azkar: "a" };
  function wToggle(name, kind) {
    const w = getWorship(), cur = w[name] || {}, k = KIND_KEY[kind];
    if (!k) return;
    cur[k] = !cur[k]; w[name] = cur; setWorship(w);
    try { window.dispatchEvent(new CustomEvent("cth-worship")); } catch (e) {}
  }

  // Is the shown city the user's own city (saved favorite / home / detected local)?
  function favSlugs() { try { return (JSON.parse(localStorage.getItem("cth-fav-cities") || "[]") || []).map(e => e && e.slug).filter(Boolean); } catch (e) { return []; } }
  function homeSlug() { try { return localStorage.getItem("cth-home-city"); } catch (e) { return null; } }
  function computeMine(slug) { if (!slug) return false; return favSlugs().indexOf(slug) > -1 || homeSlug() === slug; }
  // On city pages we know the slug up front; the homepage tells us via an event.
  let ctxMine = computeMine(window.CITY_SLUG || null);

  // ---- sheet (built once) ----
  let sheet, sheetBody, sheetTitle;
  const SKELETON = `
    <div class="az-topbar">
      <span class="az-progress" aria-live="polite"></span>
      <button class="az-reset" type="button">${lang === "ar" ? "إعادة من البداية" : "Start over"}</button>
    </div>
    <div class="az-bar"><i></i></div>
    <article class="az-card" aria-live="polite"></article>
    <div class="az-nav">
      <button class="az-prev" type="button">${lang === "ar" ? "السابق" : "Previous"}</button>
      <button class="az-next" type="button">${lang === "ar" ? "التالي" : "Next"}</button>
    </div>`;

  function buildSheet() {
    sheet = document.createElement("div");
    sheet.className = "az-sheet-overlay";
    sheet.hidden = true;
    sheet.innerHTML = `
      <div class="az-sheet" role="dialog" aria-modal="true" aria-label="${T.title}">
        <div class="az-sheet-head">
          <strong class="pa-head-title">${T.title}</strong>
          <button class="az-sheet-close" type="button" aria-label="${T.close}">✕</button>
        </div>
        <div class="az-sheet-body" id="prayerAzkarTool"></div>
      </div>`;
    document.body.appendChild(sheet);
    sheetBody = sheet.querySelector("#prayerAzkarTool");
    sheetTitle = sheet.querySelector(".pa-head-title");
    const close = () => { sheet.hidden = true; document.documentElement.style.overflow = ""; decorate(); };
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".az-sheet-close").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
  }

  function trackBtn(name, kind) {
    const done = wState(name)[kind];
    const label = kind === "fard" ? T.tFard : kind === "sunnah" ? T.tSunnah : T.tAzkar;
    return `<button type="button" class="pw-toggle pw-${kind}${done ? " is-done" : ""}" data-pw="${kind}" data-p="${name}" aria-pressed="${done ? "true" : "false"}"><span class="pw-check" aria-hidden="true">✓</span><span class="pw-tx">${label}</span></button>`;
  }

  function trackerHtml(prayerName) {
    if (!ctxMine || !INFO[prayerName]) return "";
    const hasS = HAS_SUNNAH[prayerName];
    return `
      <div class="pw-tracker">
        <div class="pw-tracker-head"><span class="pw-tracker-title">${T.trackTitle}</span><span class="pw-tracker-hint">${T.trackHint}</span></div>
        <div class="pw-tracker-btns">
          ${trackBtn(prayerName, "fard")}
          ${hasS ? trackBtn(prayerName, "sunnah") : ""}
          ${trackBtn(prayerName, "azkar")}
        </div>
      </div>`;
  }

  function heroInfoHtml(prayerName) {
    const info = INFO[prayerName];
    if (!info) return "";
    const x = info[lang] || info.en;
    return `
      <div class="pa-hero">
        <div class="pa-hero-icon" aria-hidden="true">📿</div>
        <div class="pa-hero-title">${T.title}</div>
        <div class="pa-hero-sub">${x.emoji} ${x.name}</div>
      </div>
      <div class="pa-info">
        <p class="pa-desc">${x.desc}</p>
        <ul class="pa-facts">
          <li>🕒 <span class="pa-fk">${T.fTime}</span> ${x.time}</li>
          <li>🕌 <span class="pa-fk">${T.fFard}</span> ${x.fard}</li>
          <li>🌿 <span class="pa-fk">${T.fSunnah}</span> ${x.sunnah}</li>
        </ul>
      </div>
      ${fadlHtml(prayerName)}
      ${trackerHtml(prayerName)}
      <span class="pa-sec-label">${T.sec}</span>`;
  }

  // A gentle, authentic "virtue of this prayer" note (shown for every city).
  function fadlHtml(prayerName) {
    const f = FADL[prayerName];
    if (!f) return "";
    const x = f[lang] || f.en;
    const q = lang === "ar" ? ["«", "»"] : ["“", "”"];
    return `
      <div class="pa-fadl">
        <span class="pa-fadl-label">${x.label}</span>
        <p class="pa-fadl-text">${q[0]}${x.text}${q[1]}</p>
        <span class="pa-fadl-src">${x.src}</span>
      </div>`;
  }

  function openSheet(prayerName) {
    if (!sheet) buildSheet();
    const info = INFO[prayerName];
    if (sheetTitle) sheetTitle.textContent = info ? (info[lang] || info.en).emoji + " " + (info[lang] || info.en).name : T.title;
    sheetBody.innerHTML = heroInfoHtml(prayerName) + '<div class="pa-reader">' + SKELETON + "</div>";
    const storeKey = `cth-azkar:prayer:${prayerName || "x"}`;
    window.CTHAzkar.mount(sheetBody.querySelector(".pa-reader"), items, { lang, storeKey, daily: true });
    if (prayerName) {
      sheetBody.querySelectorAll(".pw-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const kind = btn.dataset.pw;
          wToggle(prayerName, kind);
          const done = wState(prayerName)[kind];
          btn.classList.toggle("is-done", done);
          btn.setAttribute("aria-pressed", done ? "true" : "false");
          if (done) { btn.classList.remove("pw-bump"); void btn.offsetWidth; btn.classList.add("pw-bump"); }
        });
      });
    }
    if (prayerName) { markRead(prayerName); decorate(); }
    sheet.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  const reduceMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  // A gentle one-shot celebration when a prayer is fully completed.
  function celebrate(card) {
    if (reduceMotion()) return;
    card.classList.remove("pw-shine"); void card.offsetWidth; card.classList.add("pw-shine");
    setTimeout(() => card.classList.remove("pw-shine"), 1200);
    const w = document.createElement("span");
    const lines = Array.isArray(T.celebrate) ? T.celebrate : [T.celebrate];
    w.className = "pw-word"; w.textContent = lines[Math.floor(Math.random() * lines.length)]; w.setAttribute("aria-hidden", "true");
    card.appendChild(w);
    setTimeout(() => w.remove(), 2300);
  }

  // ---- make the prayer tiles tappable + show the "due" glow ----
  function decorate() {
    const grid = document.getElementById("prayerGrid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".prayer-card"));
    if (!cards.length) return;
    let nextIdx = cards.findIndex(c => c.classList.contains("is-next"));
    if (nextIdx < 0) nextIdx = 1;
    const currentIdx = CURRENT_FOR_NEXT[nextIdx];

    cards.forEach((card, i) => {
      const name = ORDER[i];
      if (name === "Sunrise" || !INFO[name]) { card.classList.remove("has-azkar-due"); return; }
      card.classList.toggle("has-azkar-due", i === currentIdx && !isRead(name));
      // Achievement seal (my-city only): a tri-colour ring that fills as you complete
      // fard / sunnah / azkar, crowned with a check — and a star + celebration once full.
      let seal = card.querySelector(".pw-seal");
      const sheetOpen = !!(sheet && !sheet.hidden);
      if (ctxMine) {
        const st = wState(name), hasS = HAS_SUNNAH[name];
        const total = hasS ? 3 : 2;
        const doneCount = (st.fard ? 1 : 0) + (hasS && st.sunnah ? 1 : 0) + (st.azkar ? 1 : 0);
        const full = doneCount === total && st.fard;
        if (doneCount > 0) {
          if (!seal) { seal = document.createElement("span"); seal.className = "pw-seal"; seal.setAttribute("aria-hidden", "true"); seal.innerHTML = '<span class="pw-seal-core"></span>'; card.appendChild(seal); }
          const segs = [st.fard ? "var(--pw-fard)" : "var(--pw-faint)"];
          if (hasS) segs.push(st.sunnah ? "var(--pw-sunnah)" : "var(--pw-faint)");
          segs.push(st.azkar ? "var(--pw-azkar)" : "var(--pw-faint)");
          const step = 100 / segs.length;
          const stops = segs.map((c, k) => `${c} ${(k * step).toFixed(2)}% ${((k + 1) * step).toFixed(2)}%`).join(",");
          seal.style.setProperty("--pw-ring", `conic-gradient(${stops})`);
          seal.classList.toggle("is-full", full);
          seal.querySelector(".pw-seal-core").textContent = full ? "★" : "✓";
          card.classList.add("pw-done");
          card.classList.toggle("pw-full", full);
        } else {
          if (seal) { seal.remove(); seal = null; }
          card.classList.remove("pw-done", "pw-full");
        }
        // Celebrate a newly reached achievement — but only while the sheet is closed,
        // so the pop/shine is actually seen on the card (not hidden behind the sheet).
        if (!sheetOpen) {
          // On first sight of a card (page load / grid rebuild) just record a baseline,
          // so saved progress is shown calmly without replaying the celebration.
          const seen = card.dataset.pwCount !== undefined;
          const prev = seen ? +card.dataset.pwCount : doneCount;
          if (seen && seal && doneCount > prev && !reduceMotion()) {
            seal.classList.remove("pw-pop"); void seal.offsetWidth; seal.classList.add("pw-pop");
            if (full) celebrate(card);
          }
          card.dataset.pwCount = String(doneCount);
        }
      } else if (seal) {
        seal.remove();
        card.classList.remove("pw-done", "pw-full");
        delete card.dataset.pwCount;
      }
      if (card.dataset.paWired) return;
      card.dataset.paWired = "1";
      card.classList.add("is-tappable");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", T.aria);
      const hint = document.createElement("span");
      hint.className = "prayer-azkar-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.title = T.title; // whisper the misbaha's meaning on hover: "أذكار ما بعد الصلاة"
      hint.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="1.35"/><circle cx="17.5" cy="6.5" r="1.35"/><circle cx="19.8" cy="12" r="1.35"/><circle cx="17.5" cy="17.5" r="1.35"/><circle cx="12" cy="19.8" r="1.35"/><circle cx="6.5" cy="17.5" r="1.35"/><circle cx="4.2" cy="12" r="1.35"/><circle cx="6.5" cy="6.5" r="1.35"/></svg>';
      card.appendChild(hint);
      const open = () => openSheet(name);
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  // The homepage panel switches cities → it tells us the slug + whether it's ours.
  window.addEventListener("cth-city", e => {
    ctxMine = !!(e.detail && e.detail.mine);
    decorate();
  });
  // A tracker toggled anywhere → refresh the card badges.
  window.addEventListener("cth-worship", () => decorate());

  const grid = document.getElementById("prayerGrid");
  if (grid) {
    decorate();
    new MutationObserver(() => decorate()).observe(grid, { childList: true });
    setInterval(decorate, 60000);
  }
})();
