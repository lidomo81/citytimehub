/* =====================================================================
   CityTimeHub — js/prayer-insights.js
   "Prayer insights" card. Fully client-side, computed from today's
   prayer timings (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) — no API.
   Shows: when the last third of the night begins, and whether it is currently
   a disliked (karahah) time. The countdown to the next prayer belongs to the
   prayer card, not here; whether it is day or night the reader can see; and
   night length was only a step toward the last third, so it is not shown.
   Times are approximate and shown for guidance; the note points detailed
   rulings back to scholars.
   Matches the city-pulse / occasions card styling.
   ===================================================================== */
(() => {
  "use strict";

  const I = {
    en: {
      kicker: "Prayer insights",
      lastThirdTitle: "Last third",
      lastThirdFrom: t => t,
      karahahTitle: "Disliked time",
      karahahNow: "Now",
      karahahClear: "Outside disliked times",
      note: "Times are approximate, for guidance. Detailed rulings on the disliked times are best confirmed with people of knowledge.",
    },
    ar: {
      kicker: "إضاءات الصلاة",
      lastThirdTitle: "الثلث الأخير",
      lastThirdFrom: t => t,
      karahahTitle: "وقت الكراهة",
      karahahNow: "الآن",
      karahahClear: "خارج أوقات النهي",
      note: "الأوقات تقديرية للاسترشاد، وتفاصيل أوقات الكراهة تُراجع من أهل العلم.",
    },
  };

  const lang = () => ((document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en");
  const pad = n => String(n).padStart(2, "0");
  const toMin = s => { const a = (s || "").split(":"); return (+a[0]) * 60 + (+a[1]); };
  const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
  function offsetHours(tz, when = new Date()) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
      .formatToParts(when).find(x => x.type === "timeZoneName");
    if (!p) return 0;
    const m = p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
  }
  function nowLocal(tz) {
    const d = new Date(Date.now() + offsetHours(tz) * 3600000);
    return { min: d.getUTCHours() * 60 + d.getUTCMinutes(), sec: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() };
  }

  function isKarahah(t, tz) {
    const { min } = nowLocal(tz);
    const sr = toMin(t.Sunrise), dh = toMin(t.Dhuhr), mg = toMin(t.Maghrib);
    if (t.Sunrise && min >= sr && min < sr + 15) return true;
    if (t.Dhuhr && min >= dh - 10 && min < dh) return true;
    if (t.Maghrib && min >= mg - 15 && min < mg) return true;
    return false;
  }

  let ctx = null, timer = null;

  function render() {
    if (!ctx) return;
    const T = I[lang()], t = ctx.timings, tz = ctx.tz;
    const chipsEl = document.getElementById("piChips");
    if (!chipsEl) return;

    const mg = toMin(t.Maghrib);
    let lastThirdLabel = "—";
    if (t.Maghrib && t.Fajr) {
      const nightMin = (toMin(t.Fajr) + 1440) - mg;
      const lastThird = mg + Math.round(nightMin * 2 / 3);
      lastThirdLabel = T.lastThirdFrom(hhmm(lastThird));
    }
    const warn = isKarahah(t, tz);
    chipsEl.innerHTML =
      '<div class="pi-card">'
      + '<span class="pi-card-ico" aria-hidden="true">☽</span>'
      + '<span class="pi-card-label">' + T.lastThirdTitle + "</span>"
      + '<strong class="pi-card-val mono">' + lastThirdLabel + "</strong>"
      + "</div>"
      + '<div class="pi-card' + (warn ? " is-warn" : "") + '">'
      + '<span class="pi-card-ico" aria-hidden="true">⊘</span>'
      + '<span class="pi-card-label">' + T.karahahTitle + "</span>"
      + '<strong class="pi-card-val">' + (warn ? T.karahahNow : T.karahahClear) + "</strong>"
      + "</div>";
  }

  function anchor() {
    return document.getElementById("cityPulse")
      || document.getElementById("cityPulseSection")
      || document.getElementById("prayerGrid");
  }

  function mount() {
    if (document.getElementById("prayerInsights")) return true;
    const host = anchor();
    if (!host) return false;
    const T = I[lang()];
    const html = '<div id="prayerInsights" class="prayer-insights" aria-live="polite">'
      + '<span class="pi-kicker">' + T.kicker + "</span>"
      + '<div class="pi-chips" id="piChips"></div>'
      + '<p class="pi-note">' + T.note + "</p>"
      + "</div>";
    host.insertAdjacentHTML("afterend", html);
    return true;
  }

  function refresh(city, timings) {
    if (!city || !timings || !timings.Fajr) return;
    ctx = { timings, tz: city.tz };
    let tries = 0;
    (function tick() {
      if (mount()) { render(); return; }
      if (tries++ < 25) setTimeout(tick, 300);
    })();
    if (timer) clearInterval(timer);
    timer = setInterval(render, 20000);
  }

  window.CthPrayerInsights = { refresh };
})();
