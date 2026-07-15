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
  window.CTH_CITY_INP = { show, reset, ensurePh };
})();
