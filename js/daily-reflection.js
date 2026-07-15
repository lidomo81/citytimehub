/* =====================================================================
   CityTimeHub — js/daily-reflection.js
   "Reflection of the day" card shown above the app tools grid (app mode).
   A short, authentic hadith (Bukhari / Muslim) or a Quran verse that
   rotates once per day. Fully client-side, no API, works offline.
   Every hadith here is from Sahih al-Bukhari and/or Sahih Muslim.
   ===================================================================== */
(() => {
  "use strict";

  // ar / en text, with source. All hadith are Bukhari/Muslim only.
  const ITEMS = [
    { ar: "إنَّما الأعمالُ بالنِّيّاتِ، وإنَّما لكلِّ امرئٍ ما نوى.", en: "Actions are but by intentions, and every person will have only what they intended.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن كان يؤمنُ باللهِ واليومِ الآخرِ فَلْيَقُلْ خيرًا أو لِيَصْمُتْ.", en: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "المسلمُ مَن سَلِمَ المسلمونَ مِن لسانِه ويدِه.", en: "The Muslim is the one from whose tongue and hand the Muslims are safe.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "لا يؤمنُ أحدُكم حتى يُحِبَّ لأخيه ما يُحِبُّ لنفسِه.", en: "None of you truly believes until he loves for his brother what he loves for himself.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "أحبُّ الأعمالِ إلى اللهِ أدْوَمُها وإنْ قَلَّ.", en: "The most beloved deeds to Allah are the most constant, even if they are few.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن غَدا إلى المسجدِ أو راح، أعَدَّ اللهُ له نُزُلَه من الجنّةِ كلَّما غَدا أو راح.", en: "Whoever goes to the mosque morning or evening, Allah prepares for him a place in Paradise each time.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "كلمتانِ خفيفتانِ على اللسانِ، ثقيلتانِ في الميزانِ، حبيبتانِ إلى الرحمنِ: سبحانَ اللهِ وبحمدِه، سبحانَ اللهِ العظيمِ.", en: "Two words light on the tongue, heavy on the Scale, beloved to the Most Merciful: Subhan Allah wa bi-hamdih, Subhan Allah al-'Azim.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن قال: سبحانَ اللهِ وبحمدِه، في يومٍ مئةَ مرّةٍ، حُطَّتْ خطاياه وإنْ كانت مثلَ زَبَدِ البحرِ.", en: "Whoever says 'Subhan Allah wa bi-hamdih' a hundred times a day, his sins are wiped away even if like the foam of the sea.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "إنَّ اللهَ رفيقٌ يُحِبُّ الرِّفقَ في الأمرِ كلِّه.", en: "Allah is Gentle and loves gentleness in all matters.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "يَسِّروا ولا تُعَسِّروا، وبَشِّروا ولا تُنَفِّروا.", en: "Make things easy and do not make them hard; give glad tidings and do not repel.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "لا يَرحمُ اللهُ مَن لا يَرحمُ الناسَ.", en: "Allah does not show mercy to the one who does not show mercy to people.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "الطُّهورُ شَطْرُ الإيمانِ.", en: "Purity is half of faith.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "الدِّينُ النصيحةُ.", en: "Religion is sincerity (naseehah).", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن صلّى الصبحَ فهو في ذِمّةِ اللهِ.", en: "Whoever prays the dawn prayer is under the protection of Allah.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن نفّسَ عن مؤمنٍ كُربةً من كُرَبِ الدنيا، نفّسَ اللهُ عنه كُربةً من كُرَبِ يومِ القيامةِ.", en: "Whoever relieves a believer of a hardship of this world, Allah will relieve him of a hardship on the Day of Resurrection.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن صلّى عليَّ صلاةً، صلّى اللهُ عليه بها عشرًا.", en: "Whoever sends one blessing upon me, Allah sends ten blessings upon him.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", en: "Verily, in the remembrance of Allah do hearts find rest.", sa: "القرآن — الرعد ٢٨", se: "Quran — Ar-Ra'd 28", verse: true },
    { ar: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", en: "Whoever fears Allah, He will make for him a way out.", sa: "القرآن — الطلاق ٢", se: "Quran — At-Talaq 2", verse: true },
    { ar: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", en: "For indeed, with hardship comes ease.", sa: "القرآن — الشرح ٥", se: "Quran — Ash-Sharh 5", verse: true },
    { ar: "فَاذْكُرُونِي أَذْكُرْكُمْ", en: "So remember Me; I will remember you.", sa: "القرآن — البقرة ١٥٢", se: "Quran — Al-Baqarah 152", verse: true },
  ];

  const lang = () => ((document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en");
  const kicker = () => (lang() === "ar" ? "💡 خاطرة اليوم" : "💡 Reflection of the day");

  // Same item for everyone on a given day; advances once per day.
  function pick() {
    const day = Math.floor(Date.now() / 86400000);
    return ITEMS[((day % ITEMS.length) + ITEMS.length) % ITEMS.length];
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  const isApp = () => document.documentElement.classList.contains("app-mode");

  function mount() {
    if (!isApp()) return true;
    if (document.getElementById("dailyReflection")) return true;
    const host = document.querySelector(".app-tools");
    if (!host) return false;
    const ar = lang() === "ar";
    const it = pick();
    const text = ar ? it.ar : it.en;
    const src = ar ? it.sa : it.se;
    const body = it.verse ? ("﴿" + esc(text) + "﴾") : ("«" + esc(text) + "»");
    const html = '<div id="dailyReflection" class="daily-reflection" aria-live="polite">'
      + '<span class="dr-kicker">' + kicker() + "</span>"
      + '<p class="dr-text">' + body + "</p>"
      + '<p class="dr-src">' + esc(src) + "</p>"
      + "</div>";
    host.insertAdjacentHTML("afterbegin", html);
    return true;
  }

  function init() {
    if (!isApp()) return;
    let tries = 0;
    (function tick() {
      if (mount()) return;
      if (tries++ < 25) setTimeout(tick, 300);
    })();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
