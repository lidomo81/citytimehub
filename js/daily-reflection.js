/* =====================================================================
   CityTimeHub — js/daily-reflection.js
   "Reflection of the day" card (خاطرة اليوم) on Home — website + app.
   A short, authentic hadith (Bukhari / Muslim) or a Quran verse that
   rotates once per day. Fully client-side, no API, works offline.
   ===================================================================== */
(() => {
  "use strict";

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
    { ar: "الكلمةُ الطيّبةُ صدقةٌ.", en: "A good word is charity.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "خيرُكم مَن تعلَّمَ القرآنَ وعلَّمَه.", en: "The best of you are those who learn the Quran and teach it.", sa: "رواه البخاري", se: "Bukhari" },
    { ar: "مَن سلكَ طريقًا يلتمسُ فيه عِلمًا، سهَّلَ اللهُ له به طريقًا إلى الجنّةِ.", en: "Whoever treads a path seeking knowledge, Allah makes easy for him a path to Paradise.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "الساعي على الأرملةِ والمسكينِ كالمجاهدِ في سبيلِ اللهِ.", en: "The one who cares for a widow and the needy is like a warrior in the cause of Allah.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "أنا وكافلُ اليتيمِ في الجنّةِ هكذا.", en: "I and the one who cares for an orphan will be like this in Paradise.", sa: "رواه البخاري", se: "Bukhari" },
    { ar: "الصلاةُ على وقتِها أحبُّ الأعمالِ إلى اللهِ.", en: "Prayer at its proper time is the deed most beloved to Allah.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن صامَ رمضانَ إيمانًا واحتسابًا، غُفِرَ له ما تقدَّمَ من ذنبِه.", en: "Whoever fasts Ramadan out of faith and seeking reward, his past sins are forgiven.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن قامَ ليلةَ القدرِ إيمانًا واحتسابًا، غُفِرَ له ما تقدَّمَ من ذنبِه.", en: "Whoever stands in prayer on the Night of Decree out of faith and seeking reward, his past sins are forgiven.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "الصيامُ جُنّةٌ.", en: "Fasting is a shield.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "ما نقصتْ صدقةٌ من مالٍ.", en: "Charity does not decrease wealth.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "اتَّقوا النارَ ولو بشِقِّ تمرةٍ.", en: "Shield yourselves from the Fire, even with half a date.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "اليدُ العُليا خيرٌ من اليدِ السُّفلى.", en: "The upper hand (that gives) is better than the lower hand (that receives).", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن كان في حاجةِ أخيه كان اللهُ في حاجتِه.", en: "Whoever meets the need of his brother, Allah will meet his need.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "المؤمنُ للمؤمنِ كالبُنيانِ يشدُّ بعضُه بعضًا.", en: "A believer to another believer is like a building whose parts support one another.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَثَلُ المؤمنينَ في توادِّهم وتراحمِهم كمَثَلِ الجسدِ الواحدِ.", en: "The believers, in their mutual love and mercy, are like one body.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "لا تحاسدوا، ولا تباغضوا، ولا تدابروا، وكونوا عبادَ اللهِ إخوانًا.", en: "Do not envy one another, nor hate one another, nor turn away from one another; be servants of Allah as brothers.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "إيّاكم والظنَّ، فإنَّ الظنَّ أكذبُ الحديثِ.", en: "Beware of suspicion, for suspicion is the falsest of speech.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "ليس الشديدُ بالصُّرَعةِ، إنّما الشديدُ الذي يملكُ نفسَه عند الغضبِ.", en: "The strong one is not the good wrestler; the strong one is he who controls himself when angry.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "لا تغضبْ.", en: "Do not become angry.", sa: "رواه البخاري", se: "Bukhari" },
    { ar: "الحياءُ شُعبةٌ من الإيمانِ.", en: "Modesty is a branch of faith.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "الإيمانُ بِضعٌ وسبعونَ شُعبةً، أفضلُها قولُ لا إلهَ إلا اللهُ، وأدناها إماطةُ الأذى عن الطريقِ.", en: "Faith has over seventy branches: the highest is saying 'There is no god but Allah', and the least is removing harm from the road.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن دلَّ على خيرٍ فله مثلُ أجرِ فاعلِه.", en: "Whoever guides someone to good will have a reward like the one who does it.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "إذا ماتَ ابنُ آدمَ انقطعَ عملُه إلا من ثلاثٍ: صدقةٍ جاريةٍ، أو عِلمٍ يُنتفَعُ به، أو ولدٍ صالحٍ يدعو له.", en: "When a person dies, his deeds end except for three: ongoing charity, knowledge that benefits, or a righteous child who prays for him.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "أقربُ ما يكونُ العبدُ من ربِّه وهو ساجدٌ.", en: "The closest a servant is to his Lord is while in prostration.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "أفضلُ الصلاةِ بعد الفريضةِ صلاةُ الليلِ.", en: "The best prayer after the obligatory ones is the night prayer.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن بنى للهِ مسجدًا، بنى اللهُ له بيتًا في الجنّةِ.", en: "Whoever builds a mosque for Allah, Allah will build for him a house in Paradise.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "صلاةُ الجماعةِ تفضُلُ صلاةَ الفَذِّ بسبعٍ وعشرينَ درجةً.", en: "Prayer in congregation is twenty-seven degrees better than praying alone.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "البِرُّ حُسنُ الخُلُقِ.", en: "Righteousness is good character.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "إنَّ اللهَ كتبَ الإحسانَ على كلِّ شيءٍ.", en: "Allah has prescribed excellence in all things.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن توضّأَ فأحسنَ الوضوءَ، خرجتْ خطاياه من جسدِه.", en: "Whoever performs ablution well, his sins leave his body.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "الصلواتُ الخمسُ، والجمعةُ إلى الجمعةِ، كفّاراتٌ لما بينهنَّ ما اجتُنِبَتِ الكبائرُ.", en: "The five prayers, and Friday to Friday, expiate what is between them so long as major sins are avoided.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن صلّى البَرْدَينِ دخلَ الجنّةَ.", en: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "ركعتا الفجرِ خيرٌ من الدنيا وما فيها.", en: "The two units before Fajr are better than the world and all it contains.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "إنَّ اللهَ لا ينظرُ إلى صُوَرِكم وأموالِكم، ولكن ينظرُ إلى قلوبِكم وأعمالِكم.", en: "Allah does not look at your appearance or your wealth, but He looks at your hearts and your deeds.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن عادَ مريضًا لم يزلْ في خُرفةِ الجنّةِ حتى يرجعَ.", en: "Whoever visits a sick person remains amid the harvest of Paradise until he returns.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "دعوةُ المرءِ المسلمِ لأخيه بظهرِ الغيبِ مستجابةٌ.", en: "The supplication of a Muslim for his brother in his absence is answered.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن غشَّ فليس منّي.", en: "Whoever cheats is not one of us.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "إنَّ الصدقَ يهدي إلى البِرِّ، وإنَّ البِرَّ يهدي إلى الجنّةِ.", en: "Truthfulness leads to righteousness, and righteousness leads to Paradise.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "الماهرُ بالقرآنِ مع السَّفَرةِ الكرامِ البَرَرةِ.", en: "The one proficient in the Quran is with the noble, obedient scribes (the angels).", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "اقرؤوا القرآنَ، فإنّه يأتي يومَ القيامةِ شفيعًا لأصحابِه.", en: "Recite the Quran, for it will come on the Day of Resurrection interceding for its companions.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "للصائمِ فرحتانِ: فرحةٌ عند فِطرِه، وفرحةٌ عند لقاءِ ربِّه.", en: "The fasting person has two joys: one when he breaks his fast, and one when he meets his Lord.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "العمرةُ إلى العمرةِ كفّارةٌ لما بينهما، والحجُّ المبرورُ ليس له جزاءٌ إلا الجنّةُ.", en: "One Umrah to the next expiates what is between them, and an accepted Hajj has no reward but Paradise.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن سرَّه أن يُبسَطَ له في رزقِه ويُنسَأَ له في أثرِه، فليصلْ رحمَه.", en: "Whoever wishes for his provision to be expanded and his life to be prolonged, let him keep the ties of kinship.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "مَن كان يؤمنُ باللهِ واليومِ الآخرِ فَلْيُكرِمْ جارَه.", en: "Whoever believes in Allah and the Last Day, let him be generous to his neighbour.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "كلُّ سُلامى من الناسِ عليه صدقةٌ كلَّ يومٍ تطلعُ فيه الشمسُ: تَعْدِلُ بين اثنينِ صدقةٌ.", en: "Every joint of a person owes charity each day the sun rises: to bring justice between two people is charity.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "سبعةٌ يُظِلُّهم اللهُ في ظلِّه يومَ لا ظلَّ إلا ظلُّه.", en: "Seven will be shaded by Allah on the Day when there is no shade but His.", sa: "متفق عليه", se: "Bukhari & Muslim" },
    { ar: "خيرُ يومٍ طلعتْ عليه الشمسُ يومُ الجمعةِ.", en: "The best day on which the sun rises is Friday.", sa: "رواه مسلم", se: "Muslim" },
    { ar: "مَن قال: لا إلهَ إلا اللهُ وحدَه لا شريكَ له، له المُلكُ وله الحمدُ، وهو على كلِّ شيءٍ قديرٌ، في يومٍ مئةَ مرّةٍ، كانت له عَدْلَ عشرِ رقابٍ.", en: "Whoever says 'There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He is over all things capable' a hundred times a day, it equals freeing ten slaves.", sa: "متفق عليه", se: "Bukhari & Muslim" },
  ];

  const lang = () => ((document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en");
  const kicker = () => (lang() === "ar" ? "خاطرة اليوم" : "Reflection of the day");

  // Count days from the reader's own calendar date, not from UTC. The
  // "on this day" line below the reflection matches the local date, so a UTC
  // day number would let the two lines sit a day apart for hours — a reader in
  // Cairo would see the reflection change at 9pm and the history line at
  // midnight. Both now turn over together at local midnight.
  function pick() {
    const now = new Date();
    const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return ITEMS[((day % ITEMS.length) + ITEMS.length) % ITEMS.length];
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function hostEl() {
    return document.getElementById("dailyReflectionSlot")
      || document.querySelector(".app-tools");
  }

  function mount() {
    if (document.getElementById("dailyReflection")) return true;
    const host = hostEl();
    if (!host) return false;
    const ar = lang() === "ar";
    const it = pick();
    const text = ar ? it.ar : it.en;
    const src = ar ? it.sa : it.se;
    // The ornate Quran brackets are mirroring characters — inside an LTR
    // paragraph the browser flips them, so only Arabic gets them.
    const body = ar
      ? (it.verse ? "﴿" + esc(text) + "﴾" : "«" + esc(text) + "»")
      : "“" + esc(text) + "”";
    const html = '<div id="dailyReflection" class="daily-reflection daily-reflection--home" aria-live="polite">'
      + '<span class="dr-kicker">' + kicker() + "</span>"
      + '<p class="dr-text">' + body + "</p>"
      + '<p class="dr-src">' + esc(src) + "</p>"
      + "</div>";
    host.insertAdjacentHTML(host.id === "dailyReflectionSlot" ? "beforeend" : "afterbegin", html);
    return true;
  }

  function init() {
    let tries = 0;
    (function tick() {
      if (mount()) return;
      if (tries++ < 25) setTimeout(tick, 300);
    })();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
