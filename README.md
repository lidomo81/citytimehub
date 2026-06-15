# CityTimeHub

**Current Time Around The World** — a fast, framework-free world-time portal.
Live local clocks for cities worldwide, time zones and UTC offsets, Gregorian + Hijri
dates, prayer times, and sunrise & sunset. Built with plain HTML, CSS and vanilla
JavaScript — no React, no build step, no backend.

The homepage signature is **The Meridian**: a live day/night band spanning UTC−12 to
UTC+14, coloured by the current local time at every offset, with a solar-noon marker
that drifts west as the day turns.

---

## Features

- **Local clocks, zero clock API** — all times computed in the browser with
  `Intl.DateTimeFormat` and IANA time zones, updating every second.
- **The Meridian** — live world day/night visualisation with city pins.
- **City pages** — SEO-optimised pages with live clock, dates, prayer times,
  sunrise/sunset, coordinates and related cities.
- **Prayer times + Hijri date** via the [AlAdhan API](https://aladhan.com).
- **Sunrise / sunset** via [sunrise-sunset.org](https://sunrise-sunset.org).
- **Instant search** (English + Arabic city names).
- **Light / dark mode** with saved preference.
- **Responsive**, keyboard-accessible, reduced-motion friendly.
- **SEO**: meta + Open Graph + Twitter cards + JSON-LD (Organization, WebSite,
  City, BreadcrumbList), sitemap and robots.

---

## Project structure

```
citytimehub/
├── index.html              # Homepage (The Meridian + city grid + clocks + prayer + sun)
├── 404.html                # Custom not-found page
├── robots.txt
├── sitemap.xml
├── css/
│   └── style.css           # All styles (shared by every page)
├── js/
│   ├── app.js              # Homepage engine
│   └── city.js             # Shared engine for every city page
├── data/
│   └── cities.json         # Single source of truth for all cities
└── cities/
    ├── cairo.html
    ├── riyadh.html
    ├── dubai.html
    ├── london.html
    ├── paris.html
    ├── new-york.html
    └── tokyo.html
```

Every city page shares `css/style.css`, `js/city.js` and `data/cities.json`.
A page differs from another only in its `<head>` SEO tags, its static text, and one
line: `window.CITY_SLUG = "cairo";`.

---

## Run locally

The pages load `data/cities.json` with `fetch()`, so opening the files directly with
`file://` will be blocked by the browser. Serve the folder over HTTP instead:

```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

```bash
# or Node
npx serve .
```

---

## Deploy

### GitHub Pages
1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. Pick the `main` branch and `/ (root)` folder, then **Save**.
4. Your site goes live at `https://<user>.github.io/<repo>/`.

### Cloudflare Pages
1. **Create a project → Connect to Git**, choose the repo.
2. Framework preset: **None**. Build command: *(empty)*. Build output directory: `/`.
3. **Save and Deploy.**

---

## Customise

- **Your domain:** the canonical/OG URLs and `sitemap.xml` use
  `https://citytimehub.pages.dev`. Find-and-replace that with your real domain across
  the project before publishing.
- **Add a city to the grid:** add an entry to `data/cities.json`
  (`slug, name, name_ar, country, country_ar, tz, lat, lng, method`). It appears on the
  homepage automatically.
- **Give a city its own page:** add `"page": true` to its entry in `cities.json`, copy
  any file in `cities/` to `cities/<slug>.html`, update the `<head>` tags and set
  `window.CITY_SLUG = "<slug>"`. Cities with `page: true` become clickable on the
  homepage and eligible as “related cities”. Don't forget to add the URL to
  `sitemap.xml`.
- **Prayer calculation method:** the `method` field per city maps to AlAdhan's method
  IDs (e.g. 5 = Egyptian authority, 4 = Umm al-Qura, 2 = ISNA, 3 = Muslim World League).

---

## Credits

- Prayer times & Hijri dates — **AlAdhan API**
- Sunrise & sunset — **sunrise-sunset.org**
- Font — **Inter** (Google Fonts)

Clocks themselves use no external service — they are generated locally in the browser.

## License

MIT — do as you like; attribution appreciated.
