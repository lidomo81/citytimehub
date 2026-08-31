/* Tasbeeh / misbaha — authentic phrases, Sunnah targets, custom count.
   Separate from js/azkar.js so morning/evening lists are untouched. */
(function () {
  "use strict";

  var root = document.getElementById("tasbeehTool");
  if (!root) return;

  var STORE = "cth-tasbeeh:v1";
  var PHRASES = [
    {
      id: "subhan",
      text: "سُبْحَانَ اللَّهِ",
      chipAr: "سُبْحَانَ اللَّهِ",
      chipEn: "Subḥān Allāh",
      translit: "Subḥān Allāh",
      translation: "Glory be to Allah.",
      def: 33,
      virtueAr: "بعد الصلاة ثلاثًا وثلاثين — متفق عليه",
      virtueEn: "33 times after the prayer — agreed upon (Bukhari & Muslim)"
    },
    {
      id: "hamd",
      text: "الْحَمْدُ لِلَّهِ",
      chipAr: "الْحَمْدُ لِلَّهِ",
      chipEn: "Al-ḥamdu lillāh",
      translit: "Al-ḥamdu lillāh",
      translation: "All praise is due to Allah.",
      def: 33,
      virtueAr: "بعد الصلاة ثلاثًا وثلاثين — متفق عليه",
      virtueEn: "33 times after the prayer — agreed upon (Bukhari & Muslim)"
    },
    {
      id: "akbar",
      text: "اللَّهُ أَكْبَرُ",
      chipAr: "اللَّهُ أَكْبَرُ",
      chipEn: "Allāhu akbar",
      translit: "Allāhu akbar",
      translation: "Allah is the Greatest.",
      def: 33,
      virtueAr: "بعد الصلاة، وتمام المئة بالتكبير — متفق عليه",
      virtueEn: "After the prayer; the hundred is completed with takbīr — agreed upon"
    },
    {
      id: "tahlil",
      text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      chipAr: "لَا إِلَهَ إِلَّا اللَّهُ",
      chipEn: "Tahlīl",
      translit: "Lā ilāha illā Allāh, waḥdahu lā sharīka lah, lahu al-mulku wa lahu al-ḥamd, wa huwa ʿalā kulli shayʾin qadīr",
      translation: "None has the right to be worshipped except Allah, alone, without partner. To Him belongs sovereignty and praise, and He is over all things omnipotent.",
      def: 100,
      virtueAr: "مئة مرة في اليوم — متفق عليه",
      virtueEn: "100 times in a day — agreed upon (Bukhari & Muslim)"
    },
    {
      id: "bihhamd",
      text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      chipAr: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      chipEn: "Subḥān Allāhi wa biḥamdih",
      translit: "Subḥān Allāhi wa biḥamdih",
      translation: "Glory be to Allah, and praise is His.",
      def: 100,
      virtueAr: "مئة مرة — متفق عليه",
      virtueEn: "100 times — agreed upon (Bukhari & Muslim)"
    },
    {
      id: "azim",
      text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
      chipAr: "سُبْحَانَ اللَّهِ الْعَظِيمِ",
      chipEn: "Subḥān Allāhil-ʿaẓīm",
      translit: "Subḥān Allāhi wa biḥamdih, subḥān Allāhil-ʿaẓīm",
      translation: "Glory be to Allah, and praise is His. Glory be to Allah, the Magnificent.",
      def: 100,
      virtueAr: "كلمتان خفيفتان على اللسان، حبيبتان إلى الرحمن — متفق عليه",
      virtueEn: "Two words light on the tongue, beloved to the Most Merciful — agreed upon (Bukhari & Muslim)"
    }
  ];
  var SEQ = [
    { id: "subhan", n: 33 },
    { id: "hamd", n: 33 },
    { id: "akbar", n: 34 }
  ];

  var ar = (document.documentElement.lang || "").slice(0, 2) === "ar";
  var T = ar
    ? {
        tap: "اضغط للعدّ",
        done: "تمّ ✓",
        reset: "إعادة",
        of: "من",
        target: "الهدف",
        virtue: "المصدر",
        seq: "تسابيح بعد الصلاة",
        seqHint: "٣٣ / ٣٣ / ٣٤",
        g33: "٣٣",
        g100: "١٠٠",
        custom: "عدد مخصص",
        share: "شارك هذا الذِّكر",
        copied: "تم نسخ الذِّكر ✓",
        step: function (i) { return "الذكر " + i + " من 3"; }
      }
    : {
        tap: "Tap to count",
        done: "Done ✓",
        reset: "Start over",
        of: "of",
        target: "target",
        virtue: "Source",
        seq: "After-prayer tasbeeh",
        seqHint: "33 / 33 / 34",
        g33: "33",
        g100: "100",
        custom: "Custom count",
        share: "Share this dhikr",
        copied: "Dhikr copied ✓",
        step: function (i) { return "Phrase " + i + " of 3"; }
      };

  function copyFallback(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }
  function azToast(msg) {
    var t = document.getElementById("azShareToast");
    if (!t) {
      t = document.createElement("div"); t.id = "azShareToast"; t.className = "az-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("is-shown"); }, 1800);
  }
  function shareDhikr(item) {
    if (!item) return;
    var canon = document.querySelector('link[rel="canonical"]');
    var url = (canon && canon.href) || location.href;
    var title = (document.title || "CityTimeHub").split(/\s*[|—]\s*/)[0].trim() || "CityTimeHub";
    var text = "«" + item.text + "»\n— " + title + " · CityTimeHub";
    var full = text + "\n" + url;
    try {
      if (window.AndroidApp && typeof AndroidApp.shareText === "function") {
        AndroidApp.shareText(full);
        return;
      }
    } catch (e) {}
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
    } else {
      var done = function () { azToast(T.copied); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(done, function () { copyFallback(full); done(); });
      } else { copyFallback(full); done(); }
    }
  }

  var SHARE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  function phraseById(id) {
    for (var i = 0; i < PHRASES.length; i++) if (PHRASES[i].id === id) return PHRASES[i];
    return PHRASES[0];
  }

  var state = { mode: "single", phraseId: "subhan", goal: 33, rem: 33, seqI: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && (saved.mode === "single" || saved.mode === "seq")) {
      if (phraseById(saved.phraseId)) state.phraseId = saved.phraseId;
      var g = parseInt(saved.goal, 10);
      if (g >= 1 && g <= 999) state.goal = g;
      var r = parseInt(saved.rem, 10);
      if (r >= 0 && r <= 999) state.rem = r;
      state.mode = saved.mode;
      var si = parseInt(saved.seqI, 10);
      if (si >= 0 && si < SEQ.length) state.seqI = si;
      if (state.mode === "seq") {
        state.goal = SEQ[state.seqI].n;
        if (state.rem > state.goal) state.rem = state.goal;
      }
    }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  function currentPhrase() {
    if (state.mode === "seq") return phraseById(SEQ[state.seqI].id);
    return phraseById(state.phraseId);
  }

  function clampGoal(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) n = 33;
    if (n > 999) n = 999;
    return n;
  }

  function setSingle(phraseId, goal) {
    state.mode = "single";
    state.phraseId = phraseId || state.phraseId;
    state.goal = clampGoal(goal != null ? goal : phraseById(state.phraseId).def);
    state.rem = state.goal;
    state.seqI = 0;
    save();
    render();
  }

  function setSeq() {
    state.mode = "seq";
    state.seqI = 0;
    state.phraseId = SEQ[0].id;
    state.goal = SEQ[0].n;
    state.rem = SEQ[0].n;
    save();
    render();
  }

  function render() {
    var p = currentPhrase();
    var done = state.rem <= 0;
    var chips = PHRASES.map(function (x) {
      var on = state.mode === "single" && x.id === state.phraseId ? " is-on" : "";
      if (state.mode === "seq" && x.id === p.id) on = " is-on";
      return '<button type="button" class="tb-chip' + on + '" data-id="' + x.id + '">' +
        (ar ? x.chipAr : x.chipEn) + "</button>";
    }).join("");

    var g33on = state.mode === "single" && state.goal === 33 ? " is-on" : "";
    var g100on = state.mode === "single" && state.goal === 100 ? " is-on" : "";
    var seqOn = state.mode === "seq" ? " is-on" : "";
    var sub = ar ? "" : (p.translit ? '<p class="az-translit">' + p.translit + "</p>" : "") +
      (p.translation ? '<p class="az-translation">' + p.translation + "</p>" : "");
    var seqLine = state.mode === "seq"
      ? '<p class="tb-seq">' + T.seq + '</p><p class="tb-seq-n" dir="ltr">' + T.seqHint + " — " + T.step(state.seqI + 1) + "</p>"
      : "";
    var customVal = state.mode === "single" ? state.goal : "";

    root.innerHTML =
      '<div class="tb-chips" role="list">' + chips + "</div>" +
      '<div class="az-topbar">' +
        '<span class="az-progress" aria-live="polite">' +
          (done ? T.done : state.rem + " " + T.of + " " + state.goal) +
        "</span>" +
        '<button class="az-share" type="button" aria-label="' + T.share + '" title="' + T.share + '">' + SHARE_SVG + "</button>" +
        '<button class="az-reset" type="button">' + T.reset + "</button>" +
      "</div>" +
      '<article class="az-card" aria-live="polite">' +
        seqLine +
        '<p class="az-arabic" dir="rtl" lang="ar">' + p.text + "</p>" +
        sub +
        '<p class="az-virtue"><strong>' + T.virtue + ":</strong> " + (ar ? p.virtueAr : p.virtueEn) + "</p>" +
        '<button class="az-counter' + (done ? " is-done" : "") + '" type="button" aria-label="' + T.tap + '">' +
          '<span class="az-counter-num">' + (done ? "✓" : state.rem) + "</span>" +
          '<span class="az-counter-cap">' + (done ? T.done : T.tap) + "</span>" +
        "</button>" +
        '<p class="az-times">' + T.target + ": " + state.goal + "</p>" +
      "</article>" +
      '<div class="tb-goals">' +
        '<button type="button" class="tb-goal' + g33on + '" data-g="33">' + T.g33 + "</button>" +
        '<button type="button" class="tb-goal' + g100on + '" data-g="100">' + T.g100 + "</button>" +
        '<button type="button" class="tb-goal tb-goal--seq' + seqOn + '" data-g="seq">' + T.seq + "</button>" +
      "</div>" +
      '<label class="tb-custom">' + T.custom +
        ' <input class="tb-custom-n" type="number" min="1" max="999" inputmode="numeric" value="' + customVal + '">' +
      "</label>";

    root.querySelectorAll(".tb-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        setSingle(b.getAttribute("data-id"), phraseById(b.getAttribute("data-id")).def);
      });
    });
    root.querySelectorAll(".tb-goal").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.getAttribute("data-g");
        if (g === "seq") setSeq();
        else setSingle(state.phraseId, g);
      });
    });
    var inp = root.querySelector(".tb-custom-n");
    inp.addEventListener("change", function () {
      setSingle(state.phraseId, inp.value);
    });
    root.querySelector(".az-counter").addEventListener("click", tap);
    root.querySelector(".az-share").addEventListener("click", function () {
      shareDhikr(currentPhrase());
    });
    root.querySelector(".az-reset").addEventListener("click", function () {
      if (state.mode === "seq") setSeq();
      else setSingle(state.phraseId, state.goal);
    });
  }

  function tap() {
    if (state.rem <= 0) return;
    state.rem--;
    save();
    if (state.rem === 0) {
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
      if (state.mode === "seq" && state.seqI < SEQ.length - 1) {
        setTimeout(function () {
          state.seqI++;
          state.phraseId = SEQ[state.seqI].id;
          state.goal = SEQ[state.seqI].n;
          state.rem = SEQ[state.seqI].n;
          save();
          render();
        }, 480);
      }
    }
    render();
  }

  render();
})();
