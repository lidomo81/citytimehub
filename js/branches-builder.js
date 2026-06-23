/* =====================================================================
   CityTimeHub — js/branches-builder.js
   "Our Branches" builder. Add your company's branches (name + city +
   opening hours + working days); see a live preview; copy ready-to-paste
   embed code. Data is encoded entirely in the URL (zero storage).
   Vanilla JS. Reads <html lang> for i18n.
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
  const DAY = LANG === "ar" ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const T = LANG === "ar" ? { remove: "حذف", empty: "لسه مضفتش فروع — ضيف فرعك الأول.", max: "الحد الأقصى 12 فرع.", to: "→", savedLabel: "محفوظاتك", savedRemove: "إزالة", savedToast: "تم الحفظ في محفوظاتك.", savedAlready: "محفوظ بالفعل.", savedMax: n => `الحد الأقصى ${n} محفوظات.`, branchesN: n => `${n} فروع` }
                          : { remove: "Remove", empty: "No branches yet — add your first one.", max: "Up to 12 branches.", to: "→", savedLabel: "Your saved", savedRemove: "Remove", savedToast: "Saved to your list.", savedAlready: "Already saved.", savedMax: n => `Up to ${n} saved.`, branchesN: n => `${n} branches` };

  let CITIES = [], pendingCity = null;
  const bySlug = new Map();
  const state = { branches: [], lang: LANG, theme: "auto", company: "" };

  const tm = v => { const [h, m] = (v || "0:0").split(":").map(Number); return (h | 0) * 60 + (m | 0); };
  const fmt = mins => { const h = Math.floor(mins / 60), m = mins % 60; const am = h < 12; let hh = h % 12; if (hh === 0) hh = 12; const mm = String(m).padStart(2, "0"); return LANG === "ar" ? `${hh}:${mm} ${am ? "ص" : "م"}` : `${hh}:${mm} ${am ? "AM" : "PM"}`; };
  const daysTxt = d => { if (d.length === 7) return LANG === "ar" ? "كل الأيام" : "Every day"; return d.slice().sort((a, b) => a - b).map(i => DAY[i]).join("، "); };

  function buildUrl() {
    const payload = state.branches.map(b => ({ n: b.n, c: b.c, o: b.o, cl: b.cl, d: b.d, ...(b.t ? { t: b.t } : {}) }));
    let u = `${ORIGIN}/embed/branches?data=${encodeURIComponent(JSON.stringify(payload))}&lang=${state.lang}&theme=${state.theme}`;
    if (state.company) u += `&company=${encodeURIComponent(state.company)}`;
    return u;
  }
  function embedHeight() { return 120 + state.branches.reduce((h, b) => h + (b.t ? 66 : 48), 0); }
  function embedCode() {
    const title = state.company || (state.lang === "ar" ? "فروعنا" : "Our branches");
    return `<iframe src="${buildUrl()}" width="440" height="${embedHeight()}" style="border:0;border-radius:16px;max-width:100%" title="${esc(title)}" loading="lazy"></iframe>`;
  }
  function update() {
    const fr = $("#bbFrame"); if (fr) { const u = buildUrl(); if (fr.src !== u) fr.src = u; fr.style.height = embedHeight() + "px"; }
    const box = $("#bbCode"); if (box) box.value = state.branches.length ? embedCode() : "";
  }

  function renderList() {
    const ul = $("#bbList"); if (!ul) return;
    if (!state.branches.length) { ul.innerHTML = `<li class="bb-empty">${esc(T.empty)}</li>`; return; }
    ul.innerHTML = state.branches.map((b, i) => {
      const city = bySlug.get(b.c);
      return `<li class="bb-item"><div class="bb-item-main"><span class="bb-item-name">${esc(b.n)}</span><span class="bb-item-sub">${esc(cN(city))} · ${esc(fmt(b.o))} ${T.to} ${esc(fmt(b.cl))} · ${esc(daysTxt(b.d))}${b.t ? ` · <span dir="ltr">${esc(b.t)}</span>` : ""}</span></div><button type="button" class="bb-del" data-i="${i}" aria-label="${esc(T.remove)}"><span aria-hidden="true">×</span></button></li>`;
    }).join("");
  }

  function addBranch() {
    if (state.branches.length >= 12) { alert(T.max); return; }
    if (!pendingCity) { $("#bbCity").focus(); return; }
    const days = [...document.querySelectorAll("#bbDays .bb-day.is-on")].map(b => +b.dataset.day);
    if (!days.length) return;
    const name = ($("#bbName").value || "").trim() || cN(pendingCity);
    const dial = ($("#bbDial").value || "").trim(), num = ($("#bbPhone").value || "").trim();
    const tel = num ? (dial ? dial + " " + num : num) : "";
    state.branches.push({ n: name, c: pendingCity.slug, o: tm($("#bbOpen").value), cl: tm($("#bbClose").value), d: days, t: tel });
    pendingCity = null; $("#bbName").value = ""; $("#bbCity").value = ""; $("#bbPhone").value = ""; $("#bbDial").value = "";
    renderList(); update();
  }

  function autocomplete(input, listEl) {
    let items = [], active = -1;
    const close = () => { listEl.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
    function paint() {
      const q = norm(input.value); pendingCity = null;
      items = q ? CITIES.filter(c => c._s.includes(q)).slice(0, 8) : [];
      if (!items.length) { listEl.innerHTML = ""; listEl.hidden = true; return; }
      listEl.innerHTML = items.map((c, i) => `<li class="ac-item${i === active ? " is-active" : ""}" role="option" data-i="${i}"><span>${esc(cN(c))}</span><span class="ac-country">${esc(cC(c))}</span></li>`).join("");
      listEl.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function pick(i) { const c = items[i]; if (!c) return; pendingCity = c; input.value = cN(c) + ", " + cC(c); const dial = $("#bbDial"); if (dial) dial.value = c.dial || ""; close(); $("#bbPhone").focus(); }
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value && !pendingCity) paint(); });
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

  function toast(msg) {
    let t = document.getElementById("cthToast");
    if (!t) { t = document.createElement("div"); t.id = "cthToast"; t.className = "cth-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("is-shown"), 2200);
  }

  /* ---------- Saved setups ("Your saved", localStorage) ---------- */
  const SAVED_KEY = "cth-bb-saved";
  const MAX_SAVED = 8;
  function getSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch (e) { return []; } }
  function setSaved(a) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(a.slice(0, MAX_SAVED))); } catch (e) {} }
  function cfgKey(c) { return (c.company || "") + "|" + c.lang + "|" + c.theme + "|" + JSON.stringify(c.branches); }
  function saveConfig() {
    if (!state.branches.length) return;
    const cfg = { company: state.company, lang: state.lang, theme: state.theme, branches: state.branches.map(b => ({ ...b, d: (b.d || []).slice() })) };
    const list = getSaved();
    if (list.some(p => cfgKey(p) === cfgKey(cfg))) { toast(T.savedAlready); return; }
    if (list.length >= MAX_SAVED) { toast(T.savedMax(MAX_SAVED)); return; }
    list.push(cfg); setSaved(list); renderSaved(); toast(T.savedToast);
  }
  function removeConfig(idx) { const list = getSaved(); list.splice(idx, 1); setSaved(list); renderSaved(); }
  function loadConfig(idx) {
    const cfg = getSaved()[idx]; if (!cfg) return;
    state.branches = (cfg.branches || []).filter(b => bySlug.get(b.c)).map(b => ({ ...b, d: Array.isArray(b.d) ? b.d.slice() : [1, 2, 3, 4, 5] }));
    state.company = cfg.company || "";
    state.lang = cfg.lang === "ar" ? "ar" : "en";
    state.theme = ["light", "dark", "auto"].includes(cfg.theme) ? cfg.theme : "auto";
    const comp = $("#bbCompany"); if (comp) comp.value = state.company;
    const ls = $("#bbLang"); if (ls) ls.value = state.lang;
    const ts = $("#bbTheme"); if (ts) ts.value = state.theme;
    renderList(); update(); renderSaved();
  }
  function renderSaved() {
    const box = $("#bbSaved"); if (!box) return;
    const list = getSaved();
    if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = `<span class="saved-label">${esc(T.savedLabel)}</span><div class="saved-chips">` + list.map((c, i) => {
      const n = (c.branches || []).length;
      const label = (c.company && c.company.trim()) ? `${c.company} · ${n}` : T.branchesN(n);
      return `<span class="saved-chip"><button type="button" class="saved-go" data-idx="${i}" title="${esc(label)}">${esc(label)}</button><button type="button" class="saved-x" data-idx="${i}" aria-label="${esc(T.savedRemove)}" title="${esc(T.savedRemove)}">×</button></span>`;
    }).join("") + `</div>`;
  }

  function copyCode() {
    const btn = $("#bbCopy"), box = $("#bbCode"); if (!box || !box.value) return;
    const done = () => { if (!btn) return; const o = btn.dataset.copy; btn.textContent = btn.dataset.copied; setTimeout(() => { btn.textContent = o; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value).then(done).catch(() => { box.select(); document.execCommand("copy"); done(); });
    else { box.select(); document.execCommand("copy"); done(); }
  }

  async function init() {
    const form = $("#bbForm"); if (!form) return;
    try {
      const res = await fetch("/data/cities.json", { cache: "force-cache" });
      CITIES = ((await res.json()).cities || []).map(c => ({ ...c, _s: norm(c.name + " " + c.country + " " + (c.name_ar || "")) }));
      CITIES.forEach(c => bySlug.set(c.slug, c));
    } catch (e) { return; }

    autocomplete($("#bbCity"), $("#bbCityAc"));
    $("#bbAdd").addEventListener("click", addBranch);
    $("#bbDays").addEventListener("click", e => { const b = e.target.closest(".bb-day"); if (!b) return; const on = b.classList.toggle("is-on"); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $("#bbList").addEventListener("click", e => { const d = e.target.closest(".bb-del"); if (d) { state.branches.splice(+d.dataset.i, 1); renderList(); update(); } });
    const comp = $("#bbCompany"); if (comp) comp.addEventListener("input", () => { state.company = comp.value.trim(); update(); });
    const ls = $("#bbLang"); if (ls) { ls.value = state.lang; ls.addEventListener("change", () => { state.lang = ls.value === "ar" ? "ar" : "en"; update(); }); }
    const ts = $("#bbTheme"); if (ts) { ts.value = state.theme; ts.addEventListener("change", () => { state.theme = ts.value; update(); }); }
    const cp = $("#bbCopy"); if (cp) cp.addEventListener("click", copyCode);
    const sv = $("#bbSave"); if (sv) sv.addEventListener("click", saveConfig);
    const sb = $("#bbSaved");
    if (sb) sb.addEventListener("click", e => {
      const go = e.target.closest(".saved-go"); if (go) { loadConfig(+go.dataset.idx); return; }
      const x = e.target.closest(".saved-x"); if (x) { e.stopPropagation(); removeConfig(+x.dataset.idx); }
    });

    renderSaved();
    renderList(); update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
