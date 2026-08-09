#!/usr/bin/env node
/**
 * Build CityTimeHub guide articles from data/articles.json + optional body HTML.
 * Updates guide listings, homepage latest-two, sitemap guide URLs, and generates
 * article pages when data/articles/{slug}.{en|ar}.html exists.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = "https://citytimehub.com";
const ARTICLES_PATH = path.join(ROOT, "data", "articles.json");

const GLOBE_SVG =
  '<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M84 30a30 30 0 1 0 0 56 24 24 0 0 1 0-56z" fill="#f3c979"/><path d="M18 96Q40 84 44 66T74 44" stroke="#f3c979" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9" opacity=".85"/><circle cx="18" cy="96" r="3.2" fill="#f3c979"/></svg>';

const SCHEDULE_SVG =
  '<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="22" width="70" height="76" rx="12" stroke="#f3c979" stroke-width="4"/><path d="M25 47h70M44 22v14M76 22v14" stroke="#f3c979" stroke-width="4" stroke-linecap="round"/><path d="M43 65h13M43 79h30" stroke="#f3c979" stroke-width="4" stroke-linecap="round"/><circle cx="78" cy="68" r="9" fill="#f3c979" opacity=".9"/></svg>';

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    if (a.datePublished !== b.datePublished) {
      return b.datePublished.localeCompare(a.datePublished);
    }
    return a.slug.localeCompare(b.slug);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEnDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}

function formatArDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${AR_MONTHS[m - 1]} ${y}`;
}

function articleUrl(slug, lang) {
  return lang === "ar" ? `${SITE}/ar/guides/${slug}` : `${SITE}/guides/${slug}`;
}

function articlePath(slug, lang) {
  return lang === "ar" ? `/ar/guides/${slug}/` : `/guides/${slug}/`;
}

function replaceBetweenMarkers(filePath, startMarker, endMarker, replacement) {
  const content = fs.readFileSync(filePath, "utf8");
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found in ${filePath}`);
  }
  const updated =
    content.slice(0, start + startMarker.length) +
    "\n" +
    replacement +
    "\n" +
    content.slice(end);
  fs.writeFileSync(filePath, updated);
}

function renderGuideListItem(article, lang) {
  const href = articlePath(article.slug, lang);
  const title = article.title[lang];
  const desc = article.cardDescription[lang];
  const readLabel =
    lang === "ar"
      ? `${article.readMinutes} دقائق قراءة`
      : `${article.readMinutes} min read`;
  const arrow = lang === "ar" ? "←" : "→";

  return `          <li class="guide-card">
            <a href="${href}">
              <span class="gc-cov" aria-hidden="true"></span>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(desc)}</p>
              <span class="guide-card-meta">${readLabel} <span aria-hidden="true">${arrow}</span></span>
            </a>
          </li>`;
}

function renderGuideList(articles, lang) {
  return articles.map((a) => renderGuideListItem(a, lang)).join("\n");
}

function renderFeaturedCard(article, lang) {
  const href = articlePath(article.slug, lang);
  const visualClass =
    article.homeVisual === "schedule" ? "gc-visual gc-visual--schedule" : "gc-visual";
  const svg = article.homeVisual === "schedule" ? SCHEDULE_SVG : GLOBE_SVG;
  const kicker = article.homeKicker[lang];
  const title = article.title[lang];
  const desc = article.cardDescription[lang];
  const readLabel =
    lang === "ar"
      ? `${article.readMinutes} دقائق قراءة`
      : `${article.readMinutes} min read`;
  const arrow = "→";

  return `          <li class="guide-card guide-card--featured">
            <a href="${href}">
              <span class="${visualClass}" aria-hidden="true">
                ${svg}
              </span>
              <span class="gc-body">
                <span class="gc-kicker">${escapeHtml(kicker)}</span>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(desc)}</p>
                <span class="guide-card-meta">${readLabel} <span aria-hidden="true">${arrow}</span></span>
              </span>
            </a>
          </li>`;
}

function renderLatestArticles(articles, lang) {
  return articles.slice(0, 2).map((a) => renderFeaturedCard(a, lang)).join("\n");
}

function renderSitemapEntries(articles) {
  const lines = [];
  for (const article of articles) {
    lines.push(`  <url>
    <loc>${SITE}/guides/${article.slug}</loc>
    <lastmod>${article.dateModified}</lastmod>
  </url>`);
    lines.push(`  <url>
    <loc>${SITE}/ar/guides/${article.slug}</loc>
    <lastmod>${article.dateModified}</lastmod>
  </url>`);
  }
  return lines.join("\n");
}

function buildGuideMeta(article, lang) {
  const published = formatEnDate(article.datePublished);
  const modified = formatEnDate(article.dateModified);
  const read = `${article.readMinutes} min read`;

  if (lang === "ar") {
    const pub = formatArDate(article.datePublished);
    const mod = formatArDate(article.dateModified);
    const readAr = `${article.readMinutes} دقائق قراءة`;
    if (article.datePublished === article.dateModified) {
      return `نُشر في ${pub} · ${readAr}`;
    }
    return `نُشر ${pub} · حُدّث ${mod} · ${readAr}`;
  }

  if (article.datePublished === article.dateModified) {
    return `Published ${published} · ${read}`;
  }
  return `Published ${published} · Updated ${modified} · ${read}`;
}

function buildJsonLd(article, lang) {
  const url = articleUrl(article.slug, lang);
  const guidesLabel = lang === "ar" ? "خواطر" : "Reflections";
  const homeLabel = lang === "ar" ? "الرئيسية" : "Home";
  const homeUrl = lang === "ar" ? `${SITE}/ar` : `${SITE}/`;
  const guidesUrl = lang === "ar" ? `${SITE}/ar/guides` : `${SITE}/guides`;
  const breadcrumbName = article.breadcrumbShort[lang];

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: article.title[lang],
        description: article.metaDescription[lang],
        inLanguage: lang,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        image: `${SITE}/og-cover.png`,
        author: {
          "@type": "Organization",
          name: "CityTimeHub",
          url: `${SITE}/`,
        },
        publisher: {
          "@type": "Organization",
          name: "CityTimeHub",
          logo: {
            "@type": "ImageObject",
            url: `${SITE}/icons/icon-512.png`,
          },
        },
        isPartOf: { "@id": `${SITE}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: homeLabel, item: homeUrl },
          { "@type": "ListItem", position: 2, name: guidesLabel, item: guidesUrl },
          {
            "@type": "ListItem",
            position: 3,
            name: breadcrumbName,
            item: url,
          },
        ],
      },
    ],
  });
}

function renderArticlePage(article, lang, bodyHtml) {
  const url = articleUrl(article.slug, lang);
  const altUrl = articleUrl(article.slug, lang === "ar" ? "en" : "ar");
  const xDefault = articleUrl(article.slug, "en");
  const metaTitle = article.metaTitle[lang];
  const metaDescription = article.metaDescription[lang];
  const keywords = article.keywords[lang];
  const title = article.title[lang];
  const breadcrumbShort = article.breadcrumbShort[lang];
  const guideMeta = buildGuideMeta(article, lang);
  const jsonLd = buildJsonLd(article, lang);
  const ogLocale = lang === "ar" ? "ar_EG" : "en_US";
  const manifest = lang === "ar" ? "/manifest.ar.webmanifest" : "/manifest.webmanifest";
  const htmlLang = lang === "ar" ? 'lang="ar" dir="rtl"' : 'lang="en" dir="ltr"';
  const homeHref = lang === "ar" ? "/ar/" : "/";
  const guidesHref = lang === "ar" ? "/ar/guides/" : "/guides/";
  const langSwitch =
    lang === "ar"
      ? `<a class="lang-switch" href="/guides/${article.slug}/" lang="en" hreflang="en" aria-label="تبديل اللغة · English">EN · العربية</a>`
      : `<a class="lang-switch" href="/ar/guides/${article.slug}/" lang="ar" hreflang="ar" aria-label="Switch language · العربية">EN · العربية</a>`;
  const homeLabel = lang === "ar" ? "الرئيسية" : "Home";
  const guidesLabel = lang === "ar" ? "خواطر" : "Reflections";
  const homeCanonical = lang === "ar" ? `${SITE}/ar` : `${SITE}/`;
  const guidesCanonical = lang === "ar" ? `${SITE}/ar/guides` : `${SITE}/guides`;
  const brandAria = lang === "ar" ? "الصفحة الرئيسية لـ CityTimeHub" : "CityTimeHub home";
  const navToggleAria = lang === "ar" ? "فتح/إغلاق قائمة التنقّل" : "Toggle navigation menu";
  const navAria = lang === "ar" ? "التنقّل الرئيسي" : "Primary";
  const themeAria = lang === "ar" ? "تبديل الوضع الداكن" : "Toggle dark mode";
  const utcAria = lang === "ar" ? "التوقيت العالمي المنسّق" : "Coordinated Universal Time";

  const nav =
    lang === "ar"
      ? `<a href="/ar/cities/">المدن</a><a href="/ar/#reference">الساعة العالمية</a><a href="/ar/time-difference/">قارن المدن</a><a href="/ar/meeting-planner/">مخطّط الأحداث</a><a href="/ar/best-time-to-call/">أفضل وقت للاتصال</a><a href="/ar/prayer-clock/">ساعة الصلاة</a><a href="/ar/guides/">خواطر</a><a href="/ar/#cityPanel">مواقيت الصلاة</a>`
      : `<a href="/cities/">Cities</a><a href="/#reference">World Clock</a><a href="/time-difference/">Compare Cities</a><a href="/meeting-planner/">Event Planner</a><a href="/best-time-to-call/">Best Time to Call</a><a href="/prayer-clock/">Prayer Clock</a><a href="/guides/">Reflections</a><a href="/#cityPanel">Prayer Times</a>`;

  const footer =
    lang === "ar"
      ? `<a href="/ar/time-difference/">فرق التوقيت</a><a href="/ar/prayer-clock/">ساعة الصلاة</a><a href="/ar/qibla/">القبلة</a><a href="/ar/monthly/">المواقيت الشهرية</a><a href="/ar/meeting-planner/">مخطّط الأحداث</a><a href="/ar/guides/">خواطر</a><a href="/ar/about/">من نحن</a><a href="/ar/privacy/">سياسة الخصوصية</a><a href="/ar/contact/">اتصل بنا</a><a href="/ar/terms/">الشروط</a>`
      : `<a href="/time-difference/">Time Difference</a><a href="/prayer-clock/">Prayer Clock</a><a href="/qibla/">Qibla</a><a href="/monthly/">Monthly times</a><a href="/meeting-planner/">Event Planner</a><a href="/guides/">Reflections</a><a href="/about/">About</a><a href="/privacy/">Privacy Policy</a><a href="/contact/">Contact</a><a href="/terms/">Terms</a>`;

  const footerTagline =
    lang === "ar" ? "الوقت الآن، حول العالم." : "Current Time Around The World.";
  const footerCopy =
    lang === "ar"
      ? "© <span id=\"year\">2026</span> CityTimeHub · الحسابات تتم محليًا على جهازك"
      : "© <span id=\"year\">2026</span> CityTimeHub · clocks computed locally";

  return `<!DOCTYPE html>
<html ${htmlLang} data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0B1120" />
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="en" href="${articleUrl(article.slug, "en")}" />
  <link rel="alternate" hreflang="ar" href="${articleUrl(article.slug, "ar")}" />
  <link rel="alternate" hreflang="x-default" href="${xDefault}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(metaTitle)}" />
  <meta property="og:description" content="${escapeHtml(metaDescription)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/og-cover.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(metaTitle)}" />
  <meta property="og:locale" content="${ogLocale}" />
  <meta property="og:site_name" content="CityTimeHub" />
  <meta property="article:published_time" content="${article.datePublished}" />
  <meta property="article:modified_time" content="${article.dateModified}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
  <meta name="twitter:image" content="${SITE}/og-cover.png" />
  <meta name="twitter:image:alt" content="${escapeHtml(metaTitle)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="manifest" href="${manifest}" />
  <link rel="icon" href="/icons/favicon-64.png" sizes="64x64" type="image/png" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="CityTimeHub" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container header-inner">
      <a class="brand" href="${homeHref}" aria-label="${brandAria}">
        <span class="brand-mark" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" width="26" height="26" loading="eager" decoding="async" />
        </span>
        <span class="brand-text">CityTime<span>Hub</span></span>
      </a>
      <input type="checkbox" id="navToggle" class="nav-toggle" aria-label="${navToggleAria}" />
      <label for="navToggle" class="nav-burger" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </label>
      <nav class="main-nav" aria-label="${navAria}">${nav}</nav>
      <div class="header-right">
        ${langSwitch}
        <span class="header-utc" aria-label="${utcAria}">
          <span class="hu-label">UTC</span><span id="headerUtc" class="hu-time" dir="ltr">--:--:--</span>
        </span>
        <button id="themeToggle" class="icon-btn" type="button" aria-label="${themeAria}" aria-pressed="false">
          <svg class="ico-moon" viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
          <svg class="ico-sun" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
      </div>
    </div>
  </header>
  <main id="main">
    <article class="section guide-page">
      <div class="container container-narrow">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="${homeCanonical}">${homeLabel}</a></li>
            <li class="sep" aria-hidden="true">/</li>
            <li><a href="${guidesCanonical}">${guidesLabel}</a></li>
            <li class="sep" aria-hidden="true">/</li>
            <li aria-current="page">${escapeHtml(breadcrumbShort)}</li>
          </ol>
        </nav>
        <header class="guide-head">
          <h1 class="guide-title">${escapeHtml(title)}</h1>
          <p class="guide-meta">${guideMeta}</p>
        </header>
        <div class="prose guide-body">
${bodyHtml}
        </div>
      </div>
    </article>
  </main>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <span class="brand-text">CityTime<span>Hub</span></span>
        <p class="muted small">${footerTagline}</p>
      </div>
      <nav class="footer-nav" aria-label="Footer">${footer}</nav>
      <p class="muted small copyright">${footerCopy}</p>
    </div>
  </footer>
  <script>
  (function(){
    var doc=document.documentElement;
    var stored=localStorage.getItem("cth-theme");
    var theme=stored||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
    doc.setAttribute("data-theme",theme);
    document.addEventListener("DOMContentLoaded",function(){
      var btn=document.getElementById("themeToggle");
      if(btn){btn.setAttribute("aria-pressed",theme==="dark");
        btn.addEventListener("click",function(){
          theme=doc.getAttribute("data-theme")==="dark"?"light":"dark";
          doc.setAttribute("data-theme",theme);localStorage.setItem("cth-theme",theme);
          btn.setAttribute("aria-pressed",theme==="dark");});}
      var y=document.getElementById("year");if(y)y.textContent=new Date().getFullYear();
      function t(){var h=document.getElementById("headerUtc");if(h)h.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date());}
      t();setInterval(t,1000);
    });
  })();
  </script>
  <script src="/js/pwa.js" defer></script>
</body>
</html>
`;
}

function main() {
  const articles = readJson(ARTICLES_PATH);
  const sorted = sortArticles(articles);

  replaceBetweenMarkers(
    path.join(ROOT, "guides", "index.html"),
    "<!-- cth:guide-list:start -->",
    "<!-- cth:guide-list:end -->",
    renderGuideList(sorted, "en")
  );
  replaceBetweenMarkers(
    path.join(ROOT, "ar", "guides", "index.html"),
    "<!-- cth:guide-list:start -->",
    "<!-- cth:guide-list:end -->",
    renderGuideList(sorted, "ar")
  );

  replaceBetweenMarkers(
    path.join(ROOT, "index.html"),
    "<!-- cth:latest-articles:start -->",
    "<!-- cth:latest-articles:end -->",
    renderLatestArticles(sorted, "en")
  );
  replaceBetweenMarkers(
    path.join(ROOT, "ar", "index.html"),
    "<!-- cth:latest-articles:start -->",
    "<!-- cth:latest-articles:end -->",
    renderLatestArticles(sorted, "ar")
  );

  replaceBetweenMarkers(
    path.join(ROOT, "sitemap-static.xml"),
    "<!-- cth:guide-sitemap:start -->",
    "<!-- cth:guide-sitemap:end -->",
    renderSitemapEntries(sorted)
  );

  let generated = 0;
  for (const article of articles) {
    for (const lang of ["en", "ar"]) {
      const bodyPath = path.join(ROOT, "data", "articles", `${article.slug}.${lang}.html`);
      if (!fs.existsSync(bodyPath)) continue;
      const bodyHtml = fs.readFileSync(bodyPath, "utf8").trim();
      const outDir =
        lang === "ar"
          ? path.join(ROOT, "ar", "guides", article.slug)
          : path.join(ROOT, "guides", article.slug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, "index.html"),
        renderArticlePage(article, lang, bodyHtml)
      );
      generated += 1;
    }
  }

  console.log(`build-articles: ${sorted.length} articles indexed`);
  console.log(`build-articles: homepage latest 2 → ${sorted[0].slug}, ${sorted[1].slug}`);
  console.log(`build-articles: generated ${generated} article page(s)`);
}

main();
