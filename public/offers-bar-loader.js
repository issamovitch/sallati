// Salla snippet for the top offers bar (paste as inline JS, no HTML/script tags).
//
// The app origin is NOT hardcoded here: it is read from a stable pointer file
// (this repo). When the app URL changes, edit public/app-origin.json and push:
// no need to touch the Salla portal again.
//
// All bar code lives in /storefront-offers-bar.js, so there is a single
// implementation shared with the dashboard preview.
(function () {
  "use strict";

  var ORIGIN_URL =
    "https://raw.githubusercontent.com/issamovitch/sallati/main/public/app-origin.json";
  var FALLBACK_ORIGIN = "https://layers-breed-unit-sudden.trycloudflare.com";

  if (window.SallatiOffersBar) return;

  function run(code) {
    try {
      // Indirect eval keeps the snippet's global scope.
      (0, eval)(code);
    } catch (e) {}
  }

  function boot(origin) {
    var base = String(origin || "").replace(/\/+$/, "") || FALLBACK_ORIGIN;
    var src = base + "/storefront-offers-bar.js?v=" + Date.now();

    function fallback() {
      fetch(src, { cache: "no-store" })
        .then(function (response) {
          return response.ok ? response.text() : "";
        })
        .then(function (code) {
          if (code) run(code);
        })
        .catch(function () {});
    }

    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onerror = fallback;
    (document.head || document.documentElement).appendChild(script);
  }

  fetch(ORIGIN_URL + "?v=" + Date.now(), { cache: "no-store" })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      boot(data && data.origin);
    })
    .catch(function () {
      boot(FALLBACK_ORIGIN);
    });
})();
