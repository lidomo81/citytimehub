/* Winter-time welcome. Inline-loaded from the page so a cached app.js
   cannot hide it. Home and Prayer only, Egypt, 30 Oct 2026, closable once. */
(function () {
  var DAY = "2026-10-30";
  function cairoDay() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date());
      var g = function (t) {
        var p = parts.find(function (x) { return x.type === t; });
        return p ? p.value : "";
      };
      return g("year") + "-" + g("month") + "-" + g("day");
    } catch (e) { return ""; }
  }
  function dismissed() {
    try { return localStorage.getItem("cth-winter-note") === DAY; } catch (e) { return false; }
  }
  function tabOk() {
    var t = document.documentElement.getAttribute("data-app-tab") || "home";
    return t === "home" || t === "prayer";
  }
  function egypt() {
    var panel = document.getElementById("cityPanel");
    if (panel && panel.dataset.tz === "Africa/Cairo") return true;
    var zone = document.getElementById("ltZone");
    if (zone && /Africa\/Cairo/.test(zone.textContent || "")) return true;
    var eye = document.getElementById("cpEyebrow");
    if (eye && /مصر|Egypt/i.test(eye.textContent || "")) return true;
    return false;
  }
  function shut(pop) {
    pop.hidden = true;
    try { localStorage.setItem("cth-winter-note", DAY); } catch (e) {}
  }
  function ensure() {
    var pop = document.getElementById("cthWinterPop");
    if (pop) return pop;
    if (!document.getElementById("cthWinterPopCss")) {
      var st = document.createElement("style");
      st.id = "cthWinterPopCss";
      st.textContent =
        "#cthWinterPop{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:24px;" +
        "background:rgba(15,23,42,.45)}" +
        "#cthWinterPop[hidden]{display:none!important}" +
        "#cthWinterPop .cth-winter-card{width:min(100%,320px);margin:0;padding:22px 18px 16px;border-radius:18px;" +
        "background:var(--surface,#fff);color:var(--text,#1c2433);text-align:center;" +
        "box-shadow:0 18px 40px rgba(15,23,42,.28)}" +
        "#cthWinterPop .cth-winter-card p{margin:0 0 16px;font-size:1.05rem;font-weight:800;line-height:1.5}" +
        "#cthWinterPop .cth-winter-x{border:0;border-radius:999px;padding:8px 22px;font:inherit;font-weight:800;" +
        "background:#C9A36A;color:#2a1c0c;cursor:pointer}";
      document.head.appendChild(st);
    }
    var ar = (document.documentElement.lang || "").slice(0, 2) === "ar";
    pop = document.createElement("div");
    pop.id = "cthWinterPop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    pop.innerHTML =
      '<div class="cth-winter-card"><p>' +
      (ar ? "أهلاً بكم في التوقيت الشتوي" : "Welcome to winter time.") +
      '</p><button type="button" class="cth-winter-x">' +
      (ar ? "إغلاق" : "Close") + "</button></div>";
    pop.querySelector("button").addEventListener("click", function () { shut(pop); });
    pop.addEventListener("click", function (e) { if (e.target === pop) shut(pop); });
    document.body.appendChild(pop);
    return pop;
  }
  function sync() {
    try {
      var pop = document.getElementById("cthWinterPop");
      var show = document.documentElement.classList.contains("app-mode")
        && cairoDay() === DAY && !dismissed() && tabOk() && egypt();
      if (!show) {
        if (pop) pop.hidden = true;
        return;
      }
      ensure().hidden = false;
    } catch (e) {}
  }
  function arm() {
    sync();
    document.addEventListener("cth-app-tab", sync);
    var rootObs = new MutationObserver(sync);
    rootObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-app-tab", "class"] });
    var panel = document.getElementById("cityPanel");
    if (panel) rootObs.observe(panel, { attributes: true, attributeFilter: ["data-tz"] });
    var n = 0;
    var iv = setInterval(function () {
      sync();
      if (++n >= 20) clearInterval(iv);
    }, 500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
})();
