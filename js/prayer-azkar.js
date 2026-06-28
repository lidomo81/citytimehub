/* Post-prayer adhkar (أذكار بعد الصلاة).
   Adds a 📿 affordance to every prayer tile and a glowing indicator on the
   current prayer that stays until the adhkar are read or the next prayer
   arrives. Opens a sheet that reuses the CTHAzkar card engine. */
(function () {
  "use strict";
  const dataEl = document.getElementById("prayerAzkarData");
  if (!dataEl || !window.CTHAzkar) return;
  let items = [];
  try { items = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!items.length) return;

  const lang = document.documentElement.lang === "ar" ? "ar" : "en";
  const T = lang === "ar"
    ? { title: "أذكار بعد الصلاة", open: "أذكار الصلاة", aria: "افتح أذكار بعد الصلاة", close: "إغلاق", due: "اقرأ أذكارها" }
    : { title: "Post-Prayer Adhkar", open: "Adhkar", aria: "Open post-prayer adhkar", close: "Close", due: "Read its adhkar" };

  // order of tiles rendered by the panel
  const ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  // next tile index -> current obligatory prayer index
  const CURRENT_FOR_NEXT = { 0: 5, 1: 0, 2: 0, 3: 2, 4: 3, 5: 4 };

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const readKey = name => `cth-prayer-azkar-read:${todayStr()}:${name}`;
  const isRead = name => { try { return localStorage.getItem(readKey(name)) === "1"; } catch (e) { return false; } };
  const markRead = name => { try { localStorage.setItem(readKey(name), "1"); } catch (e) {} };

  // ---- sheet (built once) ----
  let sheet, sheetBody;
  const SKELETON = `
    <div class="az-topbar">
      <span class="az-progress" aria-live="polite"></span>
      <button class="az-reset" type="button">${lang === "ar" ? "إعادة من البداية" : "Start over"}</button>
    </div>
    <div class="az-bar"><i></i></div>
    <article class="az-card" aria-live="polite"></article>
    <div class="az-nav">
      <button class="az-prev" type="button">${lang === "ar" ? "السابق" : "Previous"}</button>
      <button class="az-next" type="button">${lang === "ar" ? "التالي" : "Next"}</button>
    </div>`;
  function buildSheet() {
    sheet = document.createElement("div");
    sheet.className = "az-sheet-overlay";
    sheet.hidden = true;
    sheet.innerHTML = `
      <div class="az-sheet" role="dialog" aria-modal="true" aria-label="${T.title}">
        <div class="az-sheet-head">
          <strong>${T.title}</strong>
          <button class="az-sheet-close" type="button" aria-label="${T.close}">✕</button>
        </div>
        <div class="az-sheet-body" id="prayerAzkarTool"></div>
      </div>`;
    document.body.appendChild(sheet);
    sheetBody = sheet.querySelector("#prayerAzkarTool");
    const close = () => { sheet.hidden = true; document.documentElement.style.overflow = ""; };
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    sheet.querySelector(".az-sheet-close").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
  }
  function openSheet(prayerName) {
    if (!sheet) buildSheet();
    // fresh skeleton each open → no stacked listeners; each prayer keeps its own
    // progress for the day under its own key (a separate act of worship).
    sheetBody.innerHTML = SKELETON;
    const storeKey = `cth-azkar:prayer:${prayerName || "x"}`;
    window.CTHAzkar.mount(sheetBody, items, { lang, storeKey, daily: true });
    if (prayerName) { markRead(prayerName); decorate(); }
    sheet.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  // ---- decorate the prayer tiles ----
  function decorate() {
    const grid = document.getElementById("prayerGrid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".prayer-card"));
    if (!cards.length) return;
    let nextIdx = cards.findIndex(c => c.classList.contains("is-next"));
    if (nextIdx < 0) nextIdx = 1;
    const currentIdx = CURRENT_FOR_NEXT[nextIdx];

    cards.forEach((card, i) => {
      const name = ORDER[i];
      const due = i === currentIdx && !isRead(name);
      card.classList.toggle("has-azkar-due", due);
      let btn = card.querySelector(".prayer-azkar");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "prayer-azkar";
        btn.setAttribute("aria-label", T.aria);
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h12"/></svg><span class="prayer-azkar-tx"></span>`;
        btn.addEventListener("click", e => { e.stopPropagation(); openSheet(ORDER[Array.from(grid.querySelectorAll(".prayer-card")).indexOf(card)]); });
        card.appendChild(btn);
      }
      // Sunrise is not an obligatory prayer → no post-prayer adhkar affordance
      btn.style.display = name === "Sunrise" ? "none" : "";
      btn.querySelector(".prayer-azkar-tx").textContent = due ? T.due : T.open;
      btn.classList.toggle("is-due", due);
    });
  }

  // observe the grid: it re-renders on city change / prayer reload
  const grid = document.getElementById("prayerGrid");
  if (grid) {
    decorate();
    new MutationObserver(() => decorate()).observe(grid, { childList: true });
    // re-evaluate "current prayer" periodically (next prayer may arrive)
    setInterval(decorate, 60000);
  }
})();
