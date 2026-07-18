/* =====================================================================
   CityTimeHub — js/prayer-widget-builder.js
   "Get the code" page for the embeddable prayer widget. Pick a city,
   language and theme; see a live <iframe> preview; copy ready-to-paste
   embed code. Vanilla JS. Reads <html lang> for i18n.
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[\u0623\u0625\u0622\u0627]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647")
    .replace(/[\u064b-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => (s || "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ar" ? "ar" : "en";
  const cN = c => (LANG === "ar" && c && c.name_ar) ? c.name_ar : (c ? c.name : "");
  const cC = c => (LANG === "ar" && c && c.country_ar) ? c.country_ar : (c ? c.country : "");
  const ORIGIN = (location.origin && location.origin.startsWith("http")) ? location.origin : "https://www.citytimehub.com";

  let CITIES = [];
  const bySlug = new Map();
  const state = { city: "cairo", lang: LANG, theme: "auto" };

  let previewHeight = 430;
  const srcUrl = () => `${ORIGIN}/embed/prayer-clock?city=${encodeURIComponent(state.city)}&lang=${state.lang}&theme=${state.theme}`;
  function embedCode() {
    const c = bySlug.get(state.city);
    const title = (state.lang === "ar" ? "مواقيت الصلاة — " : "Prayer times — ") + (c ? (state.lang === "ar" && c.name_ar ? c.name_ar : c.name) : state.city);
    return `<iframe src="${srcUrl()}" width="340" height="${previewHeight}" style="border:0;border-radius:16px;max-width:100%" title="${esc(title)}" loading="lazy"></iframe>`;
  }
  // The embedded widget reports its real content height → fit the preview snugly
  // and bake the exact height into the copy-paste embed code (no empty space).
  window.addEventListener("message", (e) => {
    if (e.origin !== ORIGIN && e.origin !== location.origin) return;
    const d = e.data;
    if (d && d.cthWidget === "height" && d.height > 120 && d.height < 1400) {
      previewHeight = Math.round(d.height);
      const fr = $("#wbFrame"); if (fr) fr.style.height = previewHeight + "px";
      const box = $("#wbCode"); if (box) box.value = embedCode();
    }
  });
  function update() {
    const fr = $("#wbFrame"); if (fr && fr.src !== srcUrl()) fr.src = srcUrl();
    const box = $("#wbCode"); if (box) box.value = embedCode();
  }

  function setCity(c) {
    state.city = c.slug;
    const i = $("#wbCity");
    if (i && window.CTH_CITY_INP) window.CTH_CITY_INP.show(i, cN(c) + ", " + cC(c));
    else if (i) i.value = cN(c) + ", " + cC(c);
    update();
  }

  function autocomplete(input, listEl, onChoose) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value);
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = q ? CTH_CITY_INP.emptyHtml() : ""; listEl.hidden = !q; return; }
      listEl.innerHTML = items.map((c, i) => CTH_CITY_INP.optionHtml(cN(c), cC(c), i, active, input.value)).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) { const c = items[i]; if (!c) return; onChoose(c); close(); }
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value) paint(); });
    input.addEventListener("keydown", e => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(active < 0 ? 0 : active); }
      else if (e.key === "Escape") close();
    });
    listEl.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    document.addEventListener("click", e => { if (e.target !== input && !listEl.contains(e.target)) close(); });
  }

  function copyCode() {
    const btn = $("#wbCopy"), box = $("#wbCode"); if (!box) return;
    const done = () => { if (!btn) return; const o = btn.dataset.copy; btn.textContent = btn.dataset.copied; setTimeout(() => { btn.textContent = o; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value).then(done).catch(() => { box.select(); document.execCommand("copy"); done(); });
    else { box.select(); document.execCommand("copy"); done(); }
  }

  async function init() {
    const form = $("#wbForm"); if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { return; }

    autocomplete($("#wbCity"), $("#wbCityAc"), setCity);
    const langSel = $("#wbLang"), themeSel = $("#wbTheme");
    if (langSel) { langSel.value = state.lang; langSel.addEventListener("change", () => { state.lang = langSel.value === "ar" ? "ar" : "en"; update(); }); }
    if (themeSel) { themeSel.value = state.theme; themeSel.addEventListener("change", () => { state.theme = themeSel.value; update(); }); }
    const copyBtn = $("#wbCopy"); if (copyBtn) copyBtn.addEventListener("click", copyCode);

    const home = bySlug.get("cairo") || CITIES[0];
    if (home) setCity(home);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
