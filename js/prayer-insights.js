/* =====================================================================
   CityTimeHub — js/prayer-insights.js
   "Prayer insights" card. Fully client-side, computed from today's
   prayer timings (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) — no API.
   Shows: daytime/nighttime, night length, the start of the last third of
   the night, and whether it is currently a disliked (karahah) time. The
   countdown to the next prayer belongs to the prayer card, not here.
   Times are approximate and shown for guidance; the note points detailed
   rulings back to scholars.
   Matches the city-pulse / occasions card styling.
   ===================================================================== */
(() => {
  "use strict";

  const I = {
    en: {
      kicker: "Prayer insights",
      day: "☀️ Daytime", night: "🌙 Nighttime",
      nightLen: l => `🌙 Night ${l}`,
      lastThird: t => `🕋 Last third of the night from ${t}`,
      karahah: "⚠️ Disliked time now",
      note: "Times are approximate, for guidance. Detailed rulings on the disliked times are best confirmed with people of knowledge.",
    },
    ar: {
      kicker: "إضاءات الصلاة",
      day: "☀️ نهار", night: "🌙 ليل",
      nightLen: l => `🌙 طول الليل ${l}`,
      lastThird: t => `🕋 الثلث الأخير من الليل يبدأ ${t}`,
      karahah: "⚠️ وقت كراهة الآن",
      note: "الأوقات تقديرية للاسترشاد، وتفاصيل أوقات الكراهة تُراجع من أهل العلم.",
    },
  };

  const lang = () => ((document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en");
  const pad = n => String(n).padStart(2, "0");
  const toMin = s => { const a = (s || "").split(":"); return (+a[0]) * 60 + (+a[1]); };
  const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
  const durHM = m => Math.floor(m / 60) + ":" + pad(m % 60);
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

  // The three well-known times when voluntary prayer is disliked, approximated
  // with short windows around sunrise, the zenith (just before Dhuhr) and sunset.
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

    const { min } = nowLocal(tz);
    const sr = toMin(t.Sunrise), mg = toMin(t.Maghrib);
    const isDay = t.Sunrise && t.Maghrib && min >= sr && min < mg;

    const chips = [];
    if (isKarahah(t, tz)) chips.push(`<span class="pi-chip is-warn">${T.karahah}</span>`);
    chips.push(`<span class="pi-chip">${isDay ? T.day : T.night}</span>`);
    if (t.Maghrib && t.Fajr) {
      const nightMin = (toMin(t.Fajr) + 1440) - mg;         // sunset → next dawn
      const lastThird = mg + Math.round(nightMin * 2 / 3);   // start of last third
      chips.push(`<span class="pi-chip">${T.nightLen(durHM(nightMin))}</span>`);
      chips.push(`<span class="pi-chip">${T.lastThird(hhmm(lastThird))}</span>`);
    }
    chipsEl.innerHTML = chips.join("");
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
    // The chips turn over on the minute, not the second — the per-second tick
    // existed only for the countdown that now lives on the prayer card.
    timer = setInterval(render, 20000);
  }

  window.CthPrayerInsights = { refresh };
})();
