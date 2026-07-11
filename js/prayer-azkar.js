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
        fTime: "يبدأ وقتها:", fFard: "فرضها:", fSunnah: "السنة الراتبة:", sec: "الأذكار المأثورة" }
    : { title: "Post-Prayer Adhkar", aria: "Open post-prayer adhkar and prayer info", close: "Close",
        fTime: "Its time:", fFard: "Obligatory:", fSunnah: "Regular sunnah:", sec: "The adhkar" };

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
    const close = () => { sheet.hidden = true; document.documentElement.style.overflow = ""; };
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".az-sheet-close").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
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
      <span class="pa-sec-label">${T.sec}</span>`;
  }

  function openSheet(prayerName) {
    if (!sheet) buildSheet();
    const info = INFO[prayerName];
    if (sheetTitle) sheetTitle.textContent = info ? (info[lang] || info.en).emoji + " " + (info[lang] || info.en).name : T.title;
    sheetBody.innerHTML = heroInfoHtml(prayerName) + '<div class="pa-reader">' + SKELETON + "</div>";
    const storeKey = `cth-azkar:prayer:${prayerName || "x"}`;
    window.CTHAzkar.mount(sheetBody.querySelector(".pa-reader"), items, { lang, storeKey, daily: true });
    if (prayerName) { markRead(prayerName); decorate(); }
    sheet.hidden = false;
    document.documentElement.style.overflow = "hidden";
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
      if (card.dataset.paWired) return;
      card.dataset.paWired = "1";
      card.classList.add("is-tappable");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", T.aria);
      const hint = document.createElement("span");
      hint.className = "prayer-azkar-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="1.35"/><circle cx="17.5" cy="6.5" r="1.35"/><circle cx="19.8" cy="12" r="1.35"/><circle cx="17.5" cy="17.5" r="1.35"/><circle cx="12" cy="19.8" r="1.35"/><circle cx="6.5" cy="17.5" r="1.35"/><circle cx="4.2" cy="12" r="1.35"/><circle cx="6.5" cy="6.5" r="1.35"/></svg>';
      card.appendChild(hint);
      const open = () => openSheet(name);
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  const grid = document.getElementById("prayerGrid");
  if (grid) {
    decorate();
    new MutationObserver(() => decorate()).observe(grid, { childList: true });
    setInterval(decorate, 60000);
  }
})();
