/* Reusable adhkar engine — paginated cards, tap counter, saved progress.
   Exposes window.CTHAzkar.mount(root, items, opts) and auto-inits the
   standalone Morning/Evening pages (#azkarTool). Pure vanilla, offline-ready. */
(function () {
  "use strict";

  function strings(lang) {
    return lang === "ar" ? {
      of: "من", times: n => n === 1 ? "مرة واحدة" : `${n} مرات`, virtue: "الفضل",
      done: "تمّ ✓", next: "التالي", prev: "السابق", reset: "إعادة من البداية",
      tap: "اضغط للعدّ", restart: "ابدأ من جديد",
    } : {
      of: "of", times: n => n === 1 ? "once" : `${n} times`, virtue: "Virtue",
      done: "Done ✓", next: "Next", prev: "Previous", reset: "Start over",
      tap: "Tap to count", restart: "Start again",
    };
  }

  // Mount an adhkar card UI inside `root` (which must contain the standard
  // .az-card / .az-nav / .az-progress / .az-bar / .az-reset skeleton).
  function mount(root, items, opts) {
    opts = opts || {};
    const lang = opts.lang || (document.documentElement.lang === "ar" ? "ar" : "en");
    const T = strings(lang);
    if (!items || !items.length) return null;

    const storeKey = opts.storeKey || null; // null = no persistence
    const daily = opts.daily !== false;     // persistence resets each day by default
    const key = () => {
      if (!storeKey) return null;
      if (!daily) return storeKey;
      const d = new Date();
      return `${storeKey}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    let state = { idx: 0, rem: items.map(x => x.count || 1) };
    if (storeKey) try {
      const s = JSON.parse(localStorage.getItem(key()) || "null");
      if (s && Array.isArray(s.rem) && s.rem.length === items.length) state = s;
    } catch (e) {}
    const save = () => { if (storeKey) try { localStorage.setItem(key(), JSON.stringify(state)); } catch (e) {} };

    const $ = s => root.querySelector(s);
    const card = $(".az-card"), prevB = $(".az-prev"), nextB = $(".az-next"),
          prog = $(".az-progress"), bar = $(".az-bar > i"), resetB = $(".az-reset");

    function render() {
      const i = state.idx, it = items[i], rem = state.rem[i], count = it.count || 1, done = rem <= 0;
      const sub = lang === "ar"
        ? (it.virtue ? `<p class="az-virtue"><strong>${T.virtue}:</strong> ${it.virtue}</p>` : "")
        : `${it.translit ? `<p class="az-translit">${it.translit}</p>` : ""}${it.translation ? `<p class="az-translation">${it.translation}</p>` : ""}`;
      card.innerHTML = `
        <p class="az-arabic" dir="rtl" lang="ar">${it.text}</p>
        ${sub}
        <button class="az-counter${done ? " is-done" : ""}" type="button" aria-label="${T.tap}">
          <span class="az-counter-num">${done ? "✓" : rem}</span>
          <span class="az-counter-cap">${done ? T.done : T.tap}</span>
        </button>
        <p class="az-times">${lang === "ar" ? (it.countAr || T.times(count)) : T.times(count)}</p>`;
      if (prog) prog.textContent = `${i + 1} ${T.of} ${items.length}`;
      if (bar) bar.style.inlineSize = `${Math.round(((i + (done ? 1 : 0)) / items.length) * 100)}%`;
      if (prevB) prevB.disabled = i === 0;
      if (nextB) nextB.textContent = i === items.length - 1 ? T.restart : T.next;
      card.querySelector(".az-counter").addEventListener("click", tap);
      if (state.idx === items.length - 1 && done && typeof opts.onComplete === "function") opts.onComplete();
    }
    function tap() {
      const i = state.idx;
      if (state.rem[i] > 0) {
        state.rem[i]--; save();
        if (state.rem[i] === 0) {
          if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
          setTimeout(() => { if (state.idx < items.length - 1) { state.idx++; save(); } render(); }, 520);
        }
        render();
      }
    }
    function go(d) {
      if (d > 0 && state.idx === items.length - 1) { state.idx = 0; render(); return; }
      const n = state.idx + d; if (n < 0 || n >= items.length) return;
      state.idx = n; save(); render();
    }
    if (prevB) prevB.addEventListener("click", () => go(-1));
    if (nextB) nextB.addEventListener("click", () => go(1));
    if (resetB) resetB.addEventListener("click", () => { state = { idx: 0, rem: items.map(x => x.count || 1) }; save(); render(); });
    render();
    return { render, reset: () => { state = { idx: 0, rem: items.map(x => x.count || 1) }; save(); render(); } };
  }

  window.CTHAzkar = { mount };

  // Auto-init standalone Morning/Evening pages.
  const pageRoot = document.getElementById("azkarTool");
  if (pageRoot) {
    let items = [];
    try { items = JSON.parse(document.getElementById("azkarData").textContent); } catch (e) {}
    const type = pageRoot.dataset.azkarType || "morning";
    mount(pageRoot, items, { storeKey: `cth-azkar:${type}`, daily: true });
    document.addEventListener("keydown", e => {
      const ar = document.documentElement.lang === "ar";
      if (e.key === "ArrowRight") pageRoot.querySelector(ar ? ".az-prev" : ".az-next")?.click();
      else if (e.key === "ArrowLeft") pageRoot.querySelector(ar ? ".az-next" : ".az-prev")?.click();
    });
  }
})();
