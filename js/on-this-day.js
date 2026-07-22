/* =====================================================================
   CityTimeHub — js/on-this-day.js
   "On this day" card (حدث في مثل هذا اليوم), shown right under the
   Reflection of the day on Home — website + app.

   Two kinds of entry live in /data/on-this-day.json:
     cal: "g" → a Gregorian date, matched against today's month/day.
     cal: "h" → a Hijri date, matched against today's Hijri month/day
                using the browser's Umm al-Qura calendar (Intl), so a
                Prophetic-era event lands on its real Hijri day instead
                of drifting through the Gregorian year.

   Days with no entry show no card at all — better a quiet day than a
   weak fact. When a day carries more than one, the entries rotate by
   year so the card still changes.
   ===================================================================== */
(() => {
  "use strict";

  const SRC = "/data/on-this-day.json";

  const lang = () => ((document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en");
  const kicker = () => (lang() === "ar" ? "في مثل هذا اليوم" : "On this day");

  function hijriToday(date) {
    try {
      const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric" })
        .formatToParts(date);
      return {
        m: +p.find((x) => x.type === "month").value,
        d: +p.find((x) => x.type === "day").value,
      };
    } catch (e) {
      return null; // no Umm al-Qura support → Gregorian entries still work
    }
  }

  // Local preview only: ?otd=M-D pins the card to another day so the copy can
  // be checked without waiting for the date to come round.
  function previewDate() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
    const m = (new URLSearchParams(location.search).get("otd") || "").match(/^(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    const d = new Date();
    d.setMonth(+m[1] - 1, +m[2]);
    return d;
  }

  // A Hijri month is 29 or 30 days depending on the year, so an entry dated the
  // 30th would silently vanish in every year its month runs short. Treat the
  // 30th as "the last day of the month" and let it fall on the 29th instead.
  function matchesHijri(it, h, tomorrow) {
    if (!h || it.m !== h.m) return false;
    if (it.d === h.d) return true;
    if (it.d !== 30 || h.d !== 29) return false;
    return !!tomorrow && tomorrow.d === 1; // today is the month's last day
  }

  function todaysItems(items) {
    const now = previewDate() || new Date();
    const g = { m: now.getMonth() + 1, d: now.getDate() };
    const h = hijriToday(now);
    const tomorrow = hijriToday(new Date(now.getTime() + 86400000));
    return items.filter((it) =>
      it.cal === "h" ? matchesHijri(it, h, tomorrow) : (it.m === g.m && it.d === g.d)
    );
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render(items) {
    if (document.getElementById("onThisDay")) return true;
    const today = todaysItems(items);
    if (!today.length) return true; // nothing for today — stay quiet
    // Lives inside the reflection card, so a day without an entry simply shows
    // the reflection alone rather than leaving a gap where a card used to be.
    const card = document.getElementById("dailyReflection");
    if (!card) return false;

    const ar = lang() === "ar";
    const it = today[new Date().getFullYear() % today.length];
    const text = ar ? it.ar : it.en;
    const year = ar ? it.ya : it.ye;
    const label = kicker() + (year ? " · " + year : "");

    const html = '<p id="onThisDay" class="dr-otd">'
      + '<span class="dr-otd-label">' + esc(label) + "</span>"
      + (it.em ? '<span class="dr-otd-em" aria-hidden="true">' + esc(it.em) + "</span>" : "")
      + esc(text) + "</p>";
    card.insertAdjacentHTML("beforeend", html);
    return true;
  }

  function init() {
    fetch(SRC, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data && Array.isArray(data.items) ? data.items : null;
        if (!items) return;
        let tries = 0;
        (function tick() {
          if (render(items)) return;
          if (tries++ < 25) setTimeout(tick, 300);
        })();
      })
      .catch(() => {});
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
