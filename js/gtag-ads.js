(function () {
  "use strict";

  var ADS_ID = "AW-18237810081";

  if (window.__CTH_GTAG_ADS__) return;
  window.__CTH_GTAG_ADS__ = true;

  try {
    var q = new URLSearchParams(location.search);
    var inApp =
      q.get("app") === "1" ||
      /CityTimeHubApp/i.test(navigator.userAgent || "") ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
    if (inApp) return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ADS_ID;
    document.head.appendChild(s);

    gtag("js", new Date());
    gtag("config", ADS_ID);
  } catch (e) {}
})();
