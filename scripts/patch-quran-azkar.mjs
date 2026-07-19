#!/usr/bin/env node
/** Patch Quranic adhkar text to quran.com Uthmani + ayah markers. */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const NUMS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function ayahNum(n) {
  return String(n)
    .split("")
    .map((d) => NUMS[+d])
    .join("");
}

async function fetchVerse(key) {
  const r = await fetch(
    `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${key}`
  );
  const j = await r.json();
  return j.verses[0].text_uthmani.trim();
}

async function fetchSurah(surah, end) {
  const parts = [];
  for (let i = 1; i <= end; i++) {
    const t = await fetchVerse(`${surah}:${i}`);
    parts.push(`${t} ${ayahNum(i)}`);
  }
  return parts.join(" ");
}

async function buildTexts() {
  const kursi = await fetchVerse("2:255");
  const baq285 = await fetchVerse("2:285");
  const baq286 = await fetchVerse("2:286");
  const baqLastTwo = `${baq285} ${baq286}`;
  const ikhlas = await fetchSurah(112, 4);
  const falaq = await fetchSurah(113, 5);
  const nas = await fetchSurah(114, 6);
  const kursiWithIstiadh = `أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَانِ ٱلرَّجِيمِ ${kursi} ${ayahNum(255)}`;
  return { kursi, kursiWithIstiadh, baqLastTwo, ikhlas, falaq, nas };
}

function loadAzkar(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const m = html.match(/id="azkarData">(\[[\s\S]*?\])<\/script>/);
  if (!m) throw new Error(`No azkarData in ${htmlPath}`);
  return { html, data: JSON.parse(m[1]), re: m };
}

function saveAzkar(htmlPath, html, data) {
  const json = JSON.stringify(data);
  const out = html.replace(
    /id="azkarData">\[[\s\S]*?\]<\/script>/,
    `id="azkarData">${json}</script>`
  );
  fs.writeFileSync(htmlPath, out, "utf8");
}

function patchMorningEvening(data, texts) {
  const quranIdx = {
    1: texts.kursiWithIstiadh,
    2: texts.ikhlas,
    3: texts.falaq,
    4: texts.nas,
  };
  for (const [idx, text] of Object.entries(quranIdx)) {
    const i = +idx;
    if (data[i]) {
      data[i].text = text;
      data[i].quran = true;
    }
  }
}

function patchSleep(data, texts) {
  const map = [
    [0, texts.kursi],
    [1, texts.baqLastTwo],
    [2, texts.ikhlas],
    [3, texts.falaq],
    [4, texts.nas],
  ];
  for (const [idx, text] of map) {
    if (data[idx]) {
      data[idx].text = text;
      data[idx].quran = true;
    }
  }
}

const files = [
  ["morning", patchMorningEvening],
  ["evening", patchMorningEvening],
  ["sleep", patchSleep],
];

const texts = await buildTexts();
console.log("Built Quranic texts from quran.com API");

for (const [kind, patcher] of files) {
  for (const sub of ["", "ar/"]) {
    const p = path.join(ROOT, sub ? `ar/azkar/${kind}` : `azkar/${kind}`, "index.html");
    const { html, data } = loadAzkar(p);
    patcher(data, texts);
    saveAzkar(p, html, data);
    console.log("Patched", p);
  }
}

console.log("Done.");
