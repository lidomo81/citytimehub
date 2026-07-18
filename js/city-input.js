/* CityTimeHub — city search inputs: show the chosen city as placeholder, keep the field empty */
(() => {
  "use strict";
  function ensurePh(inp) {
    if (!inp || inp.dataset.cthPh != null) return;
    inp.dataset.cthPh = inp.getAttribute("placeholder") || "";
  }
  function show(inp, label, slug) {
    if (!inp) return;
    ensurePh(inp);
    inp.value = "";
    if (slug) inp.dataset.slug = slug;
    else delete inp.dataset.slug;
    inp.placeholder = label || inp.dataset.cthPh;
  }
  function reset(inp) {
    if (!inp) return;
    ensurePh(inp);
    inp.value = "";
    delete inp.dataset.slug;
    inp.placeholder = inp.dataset.cthPh;
  }

  /* ---- Shared result presentation, so every city search on the site (panel,
     Close Ones, planners, widget builders) renders and highlights the same way. */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function isAr() {
    return (document.documentElement.getAttribute("lang") || "").slice(0, 2) === "ar";
  }
  // Bold the matched run. Slices the ORIGINAL string at a case-insensitive match
  // so bilingual/diacritic names are never corrupted; no match → plain text.
  function highlight(text, q) {
    const t = String(text || ""), query = String(q || "").trim();
    if (!query) return esc(t);
    const i = t.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) +
      '<mark class="ac-hl">' + esc(t.slice(i, i + query.length)) + "</mark>" +
      esc(t.slice(i + query.length));
  }
  // One option row for every city search: name (highlighted) + country.
  function optionHtml(name, country, i, active, q) {
    return '<li class="ac-item' + (i === active ? " is-active" : "") +
      '" role="option" data-i="' + i + '"><span>' + highlight(name, q) +
      '</span><span class="ac-country">' + esc(country) + "</span></li>";
  }
  // One "no results" row, localized from <html lang> so the wording never drifts.
  function emptyHtml(msg) {
    const m = msg != null ? msg : (isAr() ? "لا توجد مدينة بهذا الاسم" : "No city found");
    return '<li class="ac-empty">' + esc(m) + "</li>";
  }

  window.CTH_CITY_INP = { show, reset, ensurePh, optionHtml, emptyHtml, highlight };
})();
