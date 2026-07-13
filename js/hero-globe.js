/* =====================================================================
   CityTimeHub — hero-globe.js
   A live, slowly-rotating SVG globe for the homepage hero.
   - Continents are pre-projected at build time (data/globe-frames.json),
     one frame per rotation step → no runtime map projection (static, light).
   - Day/night terminator, the 9 world cities and their day/night state,
     and the night-side city lights are computed live from the real clock.
   - Respects prefers-reduced-motion (no rotation, a single nice frame).
   ===================================================================== */
(function () {
  "use strict";
  var host = document.getElementById("heroGlobe");
  if (!host) return;
  try {
    if (document.documentElement.classList.contains("app-mode")
      || new URLSearchParams(location.search).get("app") === "1") return;
  } catch (e) { return; }

  var LANG = (document.documentElement.getAttribute("lang") || "en").slice(0, 2);
  var AR = LANG === "ar";

  // Geometry of the SVG scene
  var CX = 300, CY = 252, RAD = 202;
  var VBW = 600, VBH = 520;

  // The nine fixed world cities (name EN/AR + coordinates)
  var CITIES = [
    { en: "New York", ar: "نيويورك", lon: -74.0, lat: 40.7 },
    { en: "London",   ar: "لندن",    lon: -0.1,  lat: 51.5 },
    { en: "Cairo",    ar: "القاهرة", lon: 31.2,  lat: 30.0 },
    { en: "Mecca",    ar: "مكة",     lon: 39.8,  lat: 21.4 },
    { en: "Dubai",    ar: "دبي",     lon: 55.3,  lat: 25.2 },
    { en: "Moscow",   ar: "موسكو",   lon: 37.6,  lat: 55.7 },
    { en: "Mumbai",   ar: "مومباي",  lon: 72.8,  lat: 19.0 },
    { en: "Tokyo",    ar: "طوكيو",   lon: 139.7, lat: 35.7 },
    { en: "Sydney",   ar: "سيدني",   lon: 151.2, lat: -33.9 }
  ];

  var D2R = Math.PI / 180;
  var LAT0 = 14 * D2R;          // overwritten from data.lat0 on load
  var frames = null, N = 0, idx = 0, rotTimer = null, reduce = false;

  /* ---------- math helpers ---------- */
  function subsolar() {
    var now = new Date();
    var utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    var lon = (12 - utcH) * 15;                      // east-positive
    while (lon > 180) lon -= 360; while (lon < -180) lon += 360;
    var doy = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
              Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
    var dec = 23.44 * Math.sin(2 * Math.PI * (doy - 81) / 365.24);   // solar declination
    return { lon: lon, lat: dec };
  }
  function unit(lonDeg, latDeg) {
    var lo = lonDeg * D2R, la = latDeg * D2R;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  }
  function project(lonDeg, latDeg, l0deg) {
    var lam = lonDeg * D2R, phi = latDeg * D2R, l0 = l0deg * D2R;
    var cosc = Math.sin(LAT0) * Math.sin(phi) + Math.cos(LAT0) * Math.cos(phi) * Math.cos(lam - l0);
    var x = Math.cos(phi) * Math.sin(lam - l0);
    var y = Math.cos(LAT0) * Math.sin(phi) - Math.sin(LAT0) * Math.cos(phi) * Math.cos(lam - l0);
    return { vis: cosc > 0.02, cosc: cosc, x: CX + x * RAD, y: CY - y * RAD };
  }

  /* ---------- terminator + night region (screen space) ---------- */
  function terminator(l0deg, S) {
    // two orthonormal vectors perpendicular to the sun vector S
    var a = [0, 0, 1];
    var u = cross(S, a); u = norm(u);
    var v = cross(S, u); v = norm(v);
    var pts = [];
    for (var i = 0; i <= 360; i += 3) {
      var t = i * D2R;
      var P = [Math.cos(t) * u[0] + Math.sin(t) * v[0],
               Math.cos(t) * u[1] + Math.sin(t) * v[1],
               Math.cos(t) * u[2] + Math.sin(t) * v[2]];
      var lat = Math.asin(Math.max(-1, Math.min(1, P[2]))) / D2R;
      var lon = Math.atan2(P[1], P[0]) / D2R;
      var pr = project(lon, lat, l0deg);
      if (pr.cosc >= -0.01) pts.push([pr.x, pr.y]);
    }
    return pts;
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; }

  function nightPath(pts, antiScreen) {
    if (pts.length < 2) return "";
    var first = pts[0], last = pts[pts.length - 1];
    function arcMidX(sweep) {
      var a0 = Math.atan2(last[1] - CY, last[0] - CX), a1 = Math.atan2(first[1] - CY, first[0] - CX);
      var da = a1 - a0;
      if (sweep === 1 && da < 0) da += 2 * Math.PI;
      if (sweep === 0 && da > 0) da -= 2 * Math.PI;
      var am = a0 + da / 2;
      return [CX + RAD * Math.cos(am), CY + RAD * Math.sin(am)];
    }
    var m1 = arcMidX(1), m0 = arcMidX(0);
    var d1 = Math.hypot(m1[0] - antiScreen[0], m1[1] - antiScreen[1]);
    var d0 = Math.hypot(m0[0] - antiScreen[0], m0[1] - antiScreen[1]);
    var sweep = d1 < d0 ? 1 : 0;
    var d = "M" + first[0].toFixed(1) + " " + first[1].toFixed(1) + " ";
    for (var i = 1; i < pts.length; i++) d += "L" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1) + " ";
    d += "A" + RAD + " " + RAD + " 0 0 " + sweep + " " + first[0].toFixed(1) + " " + first[1].toFixed(1) + " Z";
    return d;
  }

  /* ---------- SVG scaffolding ---------- */
  function buildSVG() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + VBW + " " + VBH);
    svg.setAttribute("class", "hg-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", AR ? "كرة أرضية حيّة تعرض الليل والنهار والمدن" : "Live globe showing day, night and world cities");
    svg.innerHTML =
      '<defs>' +
        '<clipPath id="hgClip"><circle cx="' + CX + '" cy="' + CY + '" r="' + RAD + '"/></clipPath>' +
        '<clipPath id="hgNightClip"><path id="hgNightClipP" d=""/></clipPath>' +
        '<radialGradient id="hgAtmo" cx="50%" cy="50%" r="50%"><stop offset="80%" stop-color="#6FB4FF" stop-opacity="0"/><stop offset="93%" stop-color="#6FB4FF" stop-opacity="0.34"/><stop offset="100%" stop-color="#6FB4FF" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="hgOcean" cx="36%" cy="40%" r="70%"><stop offset="0%" stop-color="#2E6FA8"/><stop offset="55%" stop-color="#1C4F84"/><stop offset="100%" stop-color="#103257"/></radialGradient>' +
        '<radialGradient id="hgShade" cx="34%" cy="34%" r="72%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/><stop offset="42%" stop-color="#ffffff" stop-opacity="0"/><stop offset="82%" stop-color="#02060e" stop-opacity="0.14"/><stop offset="100%" stop-color="#02060e" stop-opacity="0.60"/></radialGradient>' +
        '<radialGradient id="hgSun" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFF3CC" stop-opacity="0.85"/><stop offset="42%" stop-color="#FFD37A" stop-opacity="0.30"/><stop offset="100%" stop-color="#FFD37A" stop-opacity="0"/></radialGradient>' +
        '<filter id="hgSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>' +
        '<filter id="hgAtmoB"><feGaussianBlur stdDeviation="7"/></filter>' +
      '</defs>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + (RAD + 13) + '" fill="url(#hgAtmo)" filter="url(#hgAtmoB)"/>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + RAD + '" fill="url(#hgOcean)"/>' +
      '<g clip-path="url(#hgClip)"><g id="hgGeo" transform="translate(' + CX + ' ' + CY + ') scale(' + RAD + ')">' +
        '<path id="hgLand" d="" fill="#2F7A4E"/>' +
        '<g id="hgBioTropic" fill="#3C8C53"></g>' +
        '<g id="hgBioBoreal" fill="#6E5A33" opacity="0.92"></g>' +
        '<g id="hgBioDesert" fill="#D9B97A" opacity="0.96"></g>' +
        '<g id="hgBioIce" fill="#EEF3F6" opacity="0.95"></g>' +
      '</g></g>' +
      '<circle id="hgSunGlow" cx="-99" cy="-99" r="150" fill="url(#hgSun)" clip-path="url(#hgClip)"/>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + RAD + '" fill="url(#hgShade)" clip-path="url(#hgClip)"/>' +
      '<path id="hgNight" d="" fill="#040a16" fill-opacity="0.70" clip-path="url(#hgClip)"/>' +
      '<g id="hgLights" clip-path="url(#hgNightClip)"></g>' +
      '<path id="hgTermGlow" d="" fill="none" stroke="#FFE3A0" stroke-opacity="0.5" stroke-width="1.4" filter="url(#hgSoft)" clip-path="url(#hgClip)"/>' +
      '<path id="hgTerm" d="" fill="none" stroke="#FFEFC4" stroke-opacity="0.7" stroke-width="0.8" clip-path="url(#hgClip)"/>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + RAD + '" fill="none" stroke="#cfe2fb" stroke-opacity="0.45" stroke-width="1.3"/>' +
      '<g id="hgCities"></g>';
    host.appendChild(svg);
  }

  /* ---------- render a frame (continents + biomes for current idx) ---------- */
  function blobCircles(arr, r) {
    var s = "";
    for (var i = 0; i < arr.length; i++) s += '<circle cx="' + arr[i][0] + '" cy="' + arr[i][1] + '" r="' + r + '"/>';
    return s;
  }
  function renderGeo() {
    var f = frames[idx];
    document.getElementById("hgLand").setAttribute("d", f.land);
    document.getElementById("hgBioTropic").innerHTML = blobCircles(f.bio.tropic, 0.040);
    document.getElementById("hgBioBoreal").innerHTML = blobCircles(f.bio.boreal, 0.038);
    document.getElementById("hgBioDesert").innerHTML = blobCircles(f.bio.desert, 0.038);
    document.getElementById("hgBioIce").innerHTML = blobCircles(f.bio.ice, 0.044);
  }

  /* ---------- render the live layers (terminator, cities, lights) ---------- */
  function renderLive() {
    var l0 = frames[idx].l0;
    var ss = subsolar();
    var S = unit(ss.lon, ss.lat);
    var anti = project(ss.lon + 180, -ss.lat, l0);
    var antiS = [anti.x, anti.y];

    var tp = terminator(l0, S);
    var nd = nightPath(tp, antiS);
    document.getElementById("hgNight").setAttribute("d", nd);
    document.getElementById("hgNightClipP").setAttribute("d", nd || "M0 0");
    var tline = tp.length ? "M" + tp.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L") : "";
    document.getElementById("hgTerm").setAttribute("d", tline);
    document.getElementById("hgTermGlow").setAttribute("d", tline);

    // sun glow
    var sun = project(ss.lon, ss.lat, l0);
    var sg = document.getElementById("hgSunGlow");
    if (sun.vis) { sg.setAttribute("cx", sun.x.toFixed(1)); sg.setAttribute("cy", sun.y.toFixed(1)); sg.setAttribute("opacity", "1"); }
    else sg.setAttribute("opacity", "0");

    // night-side city lights (from baked land vertices on the dark side)
    var lights = "";
    var f = frames[idx];
    var cand = f.lit || [];
    for (var i = 0; i < cand.length; i++) {
      var sx = CX + cand[i][0] * RAD, sy = CY + cand[i][1] * RAD;
      lights += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="1.0" fill="#FFE2A0"/>';
    }
    document.getElementById("hgLights").innerHTML = lights;

    // cities + day/night + count
    var dots = "", lit = 0;
    for (var c = 0; c < CITIES.length; c++) {
      var city = CITIES[c];
      var pr = project(city.lon, city.lat, l0);
      if (!pr.vis) continue;
      var uv = unit(city.lon, city.lat);
      var day = (uv[0] * S[0] + uv[1] * S[1] + uv[2] * S[2]) > 0;
      if (day) lit++;
      var col = day ? "#FFC34A" : "#9CCBFA";
      var name = AR ? city.ar : city.en;
      var right = pr.x <= CX + 70;
      var lx = right ? pr.x + 9 : pr.x - 9;
      var anc = right ? "start" : "end";
      dots += '<circle cx="' + pr.x.toFixed(1) + '" cy="' + pr.y.toFixed(1) + '" r="10" fill="' + col + '" opacity="0.16" filter="url(#hgSoft)"/>';
      dots += '<circle cx="' + pr.x.toFixed(1) + '" cy="' + pr.y.toFixed(1) + '" r="3.4" fill="' + col + '" stroke="#fff" stroke-width="1.1"/>';
      dots += '<text x="' + lx.toFixed(1) + '" y="' + (pr.y + 4).toFixed(1) + '" text-anchor="' + anc + '" class="hg-lbl">' + name + '</text>';
    }
    document.getElementById("hgCities").innerHTML = dots;

    // count ALL nine cities in daylight (not just the visible hemisphere)
    var total = 0;
    for (var k = 0; k < CITIES.length; k++) {
      var u2 = unit(CITIES[k].lon, CITIES[k].lat);
      if ((u2[0] * S[0] + u2[1] * S[1] + u2[2] * S[2]) > 0) total++;
    }
    var dc = document.getElementById("daylightCount");
    if (dc) dc.textContent = total;
  }

  /* ---------- rotation + clock ---------- */
  function advance() { idx = (idx + 1) % N; renderGeo(); renderLive(); }
  function defaultFrame() {           // pick a frame near lon0≈25 (Africa/Mideast) for the static view
    var best = 0, bd = 1e9;
    for (var i = 0; i < N; i++) { var d = Math.abs(((frames[i].l0 - 25 + 540) % 360) - 180); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function start() {
    LAT0 = (frames.length && typeof window.__hgLat0 === "number") ? window.__hgLat0 * D2R : LAT0;
    N = frames.length; idx = defaultFrame();
    buildSVG(); renderGeo(); renderLive();
    setInterval(renderLive, 60000);                 // keep day/night honest each minute
    reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && N > 1) rotTimer = setInterval(advance, 4200);   // ~75s per slow turn
  }

  fetch("/data/globe-frames.json").then(function (r) { return r.json(); }).then(function (data) {
    frames = data.frames || [];
    window.__hgLat0 = data.lat0;
    if (frames.length) start();
  }).catch(function () { /* globe is decorative; ignore load errors */ });
})();
