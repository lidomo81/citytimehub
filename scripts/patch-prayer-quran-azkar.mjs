#!/usr/bin/env node
/**
 * Sync post-prayer Quranic adhkar (Ayatul Kursi + Mu'awwidhat) with
 * morning Uthmani texts from azkar/morning/index.html #azkarData.
 * Re-runnable. Does not touch morning/evening/sleep pages.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MORNING = path.join(ROOT, "azkar", "morning", "index.html");

const COUNT_AR_MUAVWIDHAT = "مرة واحدة، وثلاثًا بعد الفجر والمغرب";

const VIRTUE = {
  kursi:
    "[سورة البقرة، الآية: 255] من قرأ آية الكرسي دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت.",
  ikhlas: "[سورة الإخلاص] المعوّذات؛ تُقرأ دبر كل صلاة.",
  falaq: "[سورة الفلق] من المعوّذات؛ تُقرأ دبر كل صلاة.",
  nas: "[سورة الناس] من المعوّذات؛ تُقرأ دبر كل صلاة.",
};

function loadMorningCanon() {
  const html = fs.readFileSync(MORNING, "utf8");
  const m = html.match(/id="azkarData"[^>]*>(\[[\s\S]*?\])<\/script>/);
  if (!m) throw new Error(`No azkarData in ${MORNING}`);
  const data = JSON.parse(m[1]);
  const kursi = data[1];
  const ikhlas = data[2];
  const falaq = data[3];
  const nas = data[4];
  if (!kursi?.text || !ikhlas?.text || !falaq?.text || !nas?.text) {
    throw new Error("Morning azkar missing Quran indices 1–4");
  }
  return { kursi, ikhlas, falaq, nas };
}

function classify(item) {
  const t = item?.text || "";
  const isFalaqOrNas =
    t.includes("ٱلْفَلَق") ||
    t.includes("الْفَلَق") ||
    t.includes("الفلق") ||
    t.includes("ٱلنَّاس") ||
    t.includes("النَّاس") ||
    t.includes("النَّاس") ||
    t.includes("الْخَنَّاس") ||
    t.includes("الْخَنَّاس");
  if (
    !isFalaqOrNas &&
    (t.includes("كُرْسِي") ||
      t.includes("كرسي") ||
      t.includes("آية الكرسي") ||
      t.includes("ٱلْحَىُّ") ||
      t.includes("الْقَيُّوم") ||
      t.includes("الْقَيُّوم") ||
      t.includes("القيوم") ||
      (t.includes("أَعُوذُ") && (t.includes("الْحَي") || t.includes("ٱلْحَى"))))
  ) {
    return "kursi";
  }
  if (
    t.includes("قُلْ هُوَ ٱللّ") ||
    t.includes("قُلْ هُوَ اللَّه") ||
    t.includes("قُلْ هُوَ اللَّه") ||
    t.includes("هُوَ ٱللَّهُ أَحَد") ||
    t.includes("هو الله أحد")
  ) {
    return "ikhlas";
  }
  if (
    t.includes("قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَق") ||
    t.includes("قُلْ أَعُوذُ بِرَبِّ الْفَلَق") ||
    t.includes("ٱلْفَلَق") ||
    (t.includes("الفلق") && t.includes("قُلْ"))
  ) {
    return "falaq";
  }
  if (
    t.includes("قُلْ أَعُوذُ بِرَبِّ ٱلنَّاس") ||
    t.includes("قُلْ أَعُوذُ بِرَبِّ النَّاس") ||
    t.includes("قُلْ أَعُوذُ بِرَبِّ النَّاس") ||
    (t.includes("ٱلنَّاس") && t.includes("الْخَنَّاس")) ||
    (t.includes("النَّاس") && t.includes("الْخَنَّاس")) ||
    (t.includes("النَّاس") && t.includes("الْخَنَّاس"))
  ) {
    return "nas";
  }
  return null;
}

function applyCanon(item, kind, canon) {
  const src =
    kind === "kursi"
      ? canon.kursi
      : kind === "ikhlas"
        ? canon.ikhlas
        : kind === "falaq"
          ? canon.falaq
          : canon.nas;

  item.text = src.text;
  if (src.translation != null) item.translation = src.translation;
  if (src.translit != null) item.translit = src.translit;
  item.quran = true;
  item.count = 1;
  item.virtue = VIRTUE[kind];

  if (kind === "kursi") {
    item.countAr = src.countAr || "مرة واحدة";
  } else {
    item.countAr = COUNT_AR_MUAVWIDHAT;
  }
}

function patchPrayerData(data, canon) {
  const found = { kursi: 0, ikhlas: 0, falaq: 0, nas: 0 };
  for (const item of data) {
    const kind = classify(item);
    if (!kind) continue;
    applyCanon(item, kind, canon);
    found[kind]++;
  }
  return found;
}

function walkHtmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkHtmlFiles(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function extractPrayer(html) {
  const m = html.match(/id="prayerAzkarData"[^>]*>(\[[\s\S]*?\])<\/script>/);
  if (!m) return null;
  return { data: JSON.parse(m[1]) };
}

function main() {
  const canon = loadMorningCanon();
  const candidates = [
    path.join(ROOT, "index.html"),
    path.join(ROOT, "ar", "index.html"),
    ...walkHtmlFiles(path.join(ROOT, "cities")),
    ...walkHtmlFiles(path.join(ROOT, "ar", "cities")),
  ];

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const bad = [];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes('id="prayerAzkarData"')) {
      skipped++;
      continue;
    }
    let extracted;
    try {
      extracted = extractPrayer(html);
    } catch (e) {
      bad.push([file, String(e)]);
      continue;
    }
    if (!extracted) {
      missing++;
      continue;
    }
    const found = patchPrayerData(extracted.data, canon);
    const total = found.kursi + found.ikhlas + found.falaq + found.nas;
    if (total < 4) {
      bad.push([file, `matched only ${JSON.stringify(found)}`]);
    }
    const newJson = JSON.stringify(extracted.data);
    const out = html.replace(
      /id="prayerAzkarData"[^>]*>\[[\s\S]*?\]<\/script>/,
      `id="prayerAzkarData">${newJson}</script>`
    );
    if (out !== html) {
      fs.writeFileSync(file, out, "utf8");
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Updated ${updated} files`);
  console.log(`Unchanged/skipped ${skipped}`);
  if (missing) console.log(`Parse miss ${missing}`);
  if (bad.length) {
    console.log(`Warnings (${bad.length}):`);
    for (const [f, msg] of bad.slice(0, 20)) {
      console.log(" -", path.relative(ROOT, f), msg);
    }
  }
}

main();