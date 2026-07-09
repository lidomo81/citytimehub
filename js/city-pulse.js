/* =====================================================================
   CityTimeHub — city-pulse.js
   Live “city pulse” line: Open-Meteo weather + prayer atmosphere templates.
   Cached ~15 minutes per city in localStorage.
   ===================================================================== */
(() => {
  "use strict";

  const CACHE_MS = 15 * 60 * 1000;
  let countdownTimer = null;
  const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const PRAYER_LABEL = {
    en: { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" },
    ar: { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" },
  };

  const I18N = {
    en: {
      kicker: "City pulse",
      title: n => `${n} now`,
      dayLen: "Day length",
      tempLabel: "Temperature",
      nextPrayer: "Next prayer",
      inLabel: "in",
      temp: t => `${Math.round(t)}°C`,
      loading: "Reading the sky…",
      err: "Weather unavailable right now.",
      soon: p => `${p} is approaching.`,
      later: p => `with ${p} later today.`,
      calm: "A calm moment in the day.",
      morning: "A fresh morning atmosphere.",
      afternoon: "Midday light over the city.",
      evening: "Evening light is settling in.",
      night: "A quiet night over the city.",
    },
    ar: {
      kicker: "نبض المدينة",
      title: n => `${n} الآن`,
      dayLen: "طول النهار",
      tempLabel: "درجة الحرارة",
      nextPrayer: "الصلاة القادمة",
      inLabel: "بعد",
      temp: t => `${Math.round(t)}°م`,
      loading: "نجهّز نبض المدينة…",
      err: "تعذّر قراءة الطقس الآن.",
      soon: p => `أجواء ${p} تقترب.`,
      later: p => `${p} لاحقاً اليوم.`,
      calm: "لحظة هادئة في اليوم.",
      morning: "أجواء صباحية منعشة.",
      afternoon: "ضوء الظهيرة فوق المدينة.",
      evening: "أضواء المساء تهدأ.",
      night: "ليل هادئ فوق المدينة.",
    },
  };

  function lang() {
    return (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  }
  function T() { return I18N[lang()]; }
  function cityName(c) {
    return lang() === "ar" && c.name_ar ? c.name_ar : c.name;
  }

  function wxIcon(code, isDay) {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if (code <= 3) return isDay ? "🌤️" : "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 95) return "⛈️";
    return isDay ? "🌤️" : "☁️";
  }

  function wxPhrase(code, isDay, L) {
    const ar = L === "ar";
    if (code === 0) return ar ? (isDay ? "جو صافٍ" : "سماء صافية") : (isDay ? "clear skies" : "clear night");
    if (code <= 3) return ar ? "غيوم خفيفة" : "light clouds";
    if (code === 45 || code === 48) return ar ? "ضباب خفيف" : "misty air";
    if (code >= 51 && code <= 67) return ar ? "مطر" : "rainy";
    if (code >= 71 && code <= 77) return ar ? "ثلج" : "snowy";
    if (code >= 80 && code <= 82) return ar ? "زخات مطر" : "showers";
    if (code >= 95) return ar ? "عواصف رعدية" : "stormy";
    return ar ? "أجواء معتدلة" : "fair weather";
  }

  function tempPhrase(temp, L) {
    const ar = L === "ar";
    if (temp >= 35) return ar ? "حار جداً" : "very hot";
    if (temp >= 28) return ar ? "دافئ" : "warm";
    if (temp >= 18) return ar ? "معتدل" : "mild";
    if (temp >= 8) return ar ? "بارد" : "cool";
    return ar ? "شديد البرودة" : "cold";
  }

  function offsetHours(tz, when = new Date()) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" })
      .formatToParts(when).find(x => x.type === "timeZoneName");
    if (!p) return 0;
    const m = p.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
  }

  function nextPrayerInfo(timings, tz) {
    if (!timings || !tz) return null;
    const off = offsetHours(tz) * 3600000;
    const d = new Date(Date.now() + off);
    const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    for (const p of PRAYER_ORDER) {
      const raw = (timings[p] || "").split(" ")[0];
      const [hh, mm] = raw.split(":");
      const pm = (+hh) * 60 + (+mm);
      if (pm > nowMin) return { prayer: p, minutes: pm - nowMin };
    }
    const [hh, mm] = (timings.Fajr || "0:0").split(":");
    return { prayer: "Fajr", minutes: (+hh) * 60 + (+mm) + 1440 - nowMin };
  }

  function nextPrayerCountdown(timings, tz) {
    if (!timings || !tz) return null;
    const off = offsetHours(tz) * 3600000;
    const d = new Date(Date.now() + off);
    const nowSec = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
    for (const p of PRAYER_ORDER) {
      const raw = (timings[p] || "").split(" ")[0];
      if (!raw) continue;
      const [hh, mm] = raw.split(":");
      if (hh == null || mm == null) continue;
      const ps = (+hh) * 3600 + (+mm) * 60;
      if (ps > nowSec) return { prayer: p, seconds: ps - nowSec };
    }
    const raw = (timings.Fajr || "").split(" ")[0];
    if (!raw) return null;
    const [hh, mm] = raw.split(":");
    if (hh == null || mm == null) return null;
    const ps = (+hh) * 3600 + (+mm) * 60;
    return { prayer: "Fajr", seconds: ps + 86400 - nowSec };
  }

  function fmtCountdown(sec) {
    if (sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = n => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function dayPartPhrase(localHour, L) {
    const t = I18N[L];
    if (localHour >= 5 && localHour < 11) return t.morning;
    if (localHour >= 11 && localHour < 16) return t.afternoon;
    if (localHour >= 16 && localHour < 20) return t.evening;
    return t.night;
  }

  function buildLine(weather, prayerInfo, tz, L) {
    const t = I18N[L];
    const labels = PRAYER_LABEL[L];
    const wx = wxPhrase(weather.code, weather.isDay, L);
    const tp = tempPhrase(weather.temp, L);
    const weatherPart = L === "ar" ? `جو ${tp} و${wx}` : `${tp} and ${wx}`;

    let prayerPart = "";
    if (prayerInfo) {
      const name = labels[prayerInfo.prayer] || prayerInfo.prayer;
      if (prayerInfo.minutes <= 60) prayerPart = t.soon(name);
      else if (prayerInfo.minutes <= 180) prayerPart = t.later(name);
    }
    if (!prayerPart) {
      const lh = ((new Date().getUTCHours() + offsetHours(tz) + 24) % 24);
      prayerPart = dayPartPhrase(lh, L);
    }

    return L === "ar"
      ? `${weatherPart}، ${prayerPart}`
      : `${weatherPart.charAt(0).toUpperCase() + weatherPart.slice(1)}, ${prayerPart}`;
  }

  async function fetchWeather(city) {
    const key = `cth-pulse:${city.slug}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;
    } catch (e) {}

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather " + res.status);
    const json = await res.json();
    const cur = json.current || {};
    const data = {
      temp: cur.temperature_2m ?? null,
      code: cur.weather_code ?? 0,
      isDay: cur.is_day === 1,
    };
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
    return data;
  }

  function pulseHtml(L) {
    const t = I18N[L];
    return `
      <div id="cityPulse" class="city-pulse" hidden aria-live="polite">
        <div class="city-pulse-head">
          <span class="city-pulse-wx" id="cityPulseWx" aria-hidden="true">🌤️</span>
          <div class="city-pulse-body">
            <span class="city-pulse-kicker" id="cityPulseKicker">${t.kicker}</span>
            <p class="city-pulse-title" id="cityPulseTitle"></p>
            <p class="city-pulse-line" id="cityPulseLine">${t.loading}</p>
          </div>
        </div>
        <div class="city-pulse-chips">
          <span class="city-pulse-chip" id="cityPulseTemp" hidden></span>
        </div>
      </div>`;
  }

  function ensureDom(mode) {
    let root = document.getElementById("cityPulse");
    if (root) return root;

    const L = lang();
    const html = pulseHtml(L);

    if (mode === "home") {
      const mount = document.querySelector(".cp-devotion");
      const grid = document.getElementById("prayerGrid");
      if (!mount || !grid) return null;
      grid.insertAdjacentHTML("afterend", html);
      const sun = mount.querySelector(".cp-sun");
      if (sun) sun.remove();
      return document.getElementById("cityPulse");
    }

    const prayerSec = document.getElementById("prayer");
    if (!prayerSec) return null;

    const sec = document.createElement("section");
    sec.id = "cityPulseSection";
    sec.className = "section";
    sec.setAttribute("aria-labelledby", "city-pulse-h");
    sec.innerHTML = `
      <div class="container">
        <header class="section-head">
          <span class="kicker">${L === "ar" ? "٠٢.٥ — نبض" : "02.5 — Pulse"}</span>
          <h2 id="city-pulse-h">${L === "ar" ? "نبض المدينة" : "City pulse"}</h2>
        </header>
        ${html}
      </div>`;
    prayerSec.insertAdjacentElement("afterend", sec);

    const sunSec = document.getElementById("sun");
    if (sunSec) sunSec.hidden = true;

    return document.getElementById("cityPulse");
  }

  function renderPulse(root, city, line, weather, prayerCtx) {
    const L = lang();
    const t = I18N[L];
    const labels = PRAYER_LABEL[L];
    root.hidden = false;
    const wx = document.getElementById("cityPulseWx");
    const title = document.getElementById("cityPulseTitle");
    const lineEl = document.getElementById("cityPulseLine");
    const tempChip = document.getElementById("cityPulseTemp");
    const kicker = document.getElementById("cityPulseKicker");

    if (kicker) kicker.textContent = t.kicker;
    if (wx && weather) wx.textContent = wxIcon(weather.code, weather.isDay);
    if (title) title.textContent = t.title(cityName(city));
    if (lineEl) lineEl.textContent = line;
    if (tempChip && weather && weather.temp != null) {
      tempChip.hidden = false;
      tempChip.textContent = `🌡️ ${t.tempLabel} ${t.temp(weather.temp)}`;
      tempChip.setAttribute("aria-label", `${t.tempLabel}: ${t.temp(weather.temp)}`);
    }
  }

  async function refresh(city, opts = {}) {
    if (!city) return;
    const mode = opts.mode || (document.getElementById("prayerGrid") ? "home" : "city");
    const root = ensureDom(mode);
    if (!root) return;

    const L = lang();
    const t = I18N[L];
    root.hidden = false;
    const lineEl = document.getElementById("cityPulseLine");
    if (lineEl) lineEl.textContent = t.loading;

    const timings = opts.timings || {};
    const prayerInfo = nextPrayerInfo(timings, city.tz);
    const prayerCtx = { timings, tz: city.tz };

    try {
      const weather = await fetchWeather(city);
      const line = buildLine(weather, prayerInfo, city.tz, L);
      renderPulse(root, city, line, weather, prayerCtx);
    } catch (e) {
      const fallback = prayerInfo
        ? (L === "ar"
          ? `${dayPartPhrase(((new Date().getUTCHours() + offsetHours(city.tz)) % 24 + 24) % 24, L)}، ${I18N[L].soon(PRAYER_LABEL[L][prayerInfo.prayer])}`
          : `${dayPartPhrase(((new Date().getUTCHours() + offsetHours(city.tz)) % 24 + 24) % 24, L)}, ${I18N[L].soon(PRAYER_LABEL[L][prayerInfo.prayer])}`)
        : t.err;
      renderPulse(root, city, fallback, { code: 0, isDay: true, temp: null }, prayerCtx);
    }
  }

  window.CthCityPulse = { refresh, ensureDom };
})();
