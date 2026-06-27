/* =====================================================================
   CityTimeHub — qibla.js
   Computes the Qibla bearing + distance from the visitor's GPS location
   to the Kaaba, and drives a live compass using device orientation.
   100% client-side. No network, no server.
   ===================================================================== */
(function () {
  "use strict";
  var btn = document.getElementById("qbBtn");
  if (!btn) return;

  var LANG = (document.documentElement.lang || "en").indexOf("ar") === 0 ? "ar" : "en";
  var T = LANG === "ar"
    ? { locating: "جارٍ تحديد موقعك…", denied: "تعذّر الوصول للموقع. فعّل إذن الموقع وحاول مجدداً.",
        unsupported: "جهازك لا يدعم تحديد الموقع.", ok: "وجّه الجهاز حتى يشير السهم لأعلى نحو 🕋.",
        km: "كم", calib: "حرّك جهازك في شكل ٨ لمعايرة البوصلة. أمسك الجهاز مسطّحاً.",
        noCompass: "لا توجد بوصلة في هذا الجهاز — استخدم زاوية القبلة بالأعلى مع بوصلة عادية.",
        allowCompass: "فعّل البوصلة" }
    : { locating: "Locating you…", denied: "Couldn't access location. Enable the location permission and try again.",
        unsupported: "Your device doesn't support geolocation.", ok: "Turn until the arrow points up toward 🕋.",
        km: "km", calib: "Move your phone in a figure-8 to calibrate. Hold the device flat.",
        noCompass: "No compass on this device — use the bearing above with a regular compass.",
        allowCompass: "Enable compass" };

  // Kaaba coordinates
  var KAABA_LAT = 21.4225, KAABA_LNG = 39.8262, R = 6371; // km
  var toRad = function (d) { return d * Math.PI / 180; };
  var toDeg = function (r) { return r * 180 / Math.PI; };

  var hintEl = document.getElementById("qbHint");
  var bearingEl = document.getElementById("qbBearing");
  var distEl = document.getElementById("qbDistance");
  var dialEl = document.getElementById("qbDial");
  var needleEl = document.getElementById("qbNeedle");
  var compassHint = document.getElementById("qbCompassHint");

  var qiblaBearing = null;     // bearing from north to Qibla (deg, 0..360)
  var heading = 0;             // current device heading (deg)

  function bearingTo(lat, lng) {
    var p1 = toRad(lat), p2 = toRad(KAABA_LAT);
    var dl = toRad(KAABA_LNG - lng);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    var b = toDeg(Math.atan2(y, x));
    return (b + 360) % 360;
  }
  function distanceTo(lat, lng) {
    var p1 = toRad(lat), p2 = toRad(KAABA_LAT);
    var dp = toRad(KAABA_LAT - lat), dl = toRad(KAABA_LNG - lng);
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function render() {
    // Needle should point to (qiblaBearing - heading) relative to the screen's up.
    if (qiblaBearing == null) return;
    var rel = (qiblaBearing - heading + 360) % 360;
    if (needleEl) needleEl.style.transform = "rotate(" + rel.toFixed(1) + "deg)";
    // Rotate the cardinal ring opposite to heading so N points to real north.
    if (dialEl) dialEl.style.setProperty("--heading", (-heading).toFixed(1) + "deg");
  }

  function fmtDist(km) {
    if (km >= 1000) return (Math.round(km)).toLocaleString(LANG === "ar" ? "ar-EG-u-nu-latn" : "en") + " " + T.km;
    return km.toFixed(0) + " " + T.km;
  }

  function startCompass() {
    function onOrient(e) {
      var h = null;
      if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading; // iOS: already vs north
      else if (e.absolute && typeof e.alpha === "number") h = 360 - e.alpha;       // Android absolute
      else if (typeof e.alpha === "number") h = 360 - e.alpha;
      if (h != null && !isNaN(h)) { heading = (h + 360) % 360; render(); }
    }
    // iOS 13+ needs permission
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (st) {
        if (st === "granted") {
          window.addEventListener("deviceorientation", onOrient, true);
          if (compassHint) { compassHint.hidden = false; compassHint.textContent = T.calib; }
        } else if (compassHint) { compassHint.hidden = false; compassHint.textContent = T.noCompass; }
      }).catch(function () {
        if (compassHint) { compassHint.hidden = false; compassHint.textContent = T.noCompass; }
      });
    } else if ("ondeviceorientationabsolute" in window) {
      window.addEventListener("deviceorientationabsolute", onOrient, true);
      if (compassHint) { compassHint.hidden = false; compassHint.textContent = T.calib; }
    } else if ("ondeviceorientation" in window) {
      window.addEventListener("deviceorientation", onOrient, true);
      if (compassHint) { compassHint.hidden = false; compassHint.textContent = T.calib; }
    } else if (compassHint) {
      compassHint.hidden = false; compassHint.textContent = T.noCompass;
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) { hintEl.textContent = T.unsupported; return; }
    hintEl.textContent = T.locating;
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.disabled = false;
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      qiblaBearing = bearingTo(lat, lng);
      var dist = distanceTo(lat, lng);
      bearingEl.textContent = qiblaBearing.toFixed(0) + "°";
      distEl.textContent = fmtDist(dist);
      hintEl.textContent = T.ok;
      render();
      startCompass();
    }, function () {
      btn.disabled = false;
      hintEl.textContent = T.denied;
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  }

  btn.addEventListener("click", locate);
})();
