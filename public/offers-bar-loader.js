// Salla snippet for the top offers bar (paste as inline JS, no HTML/script tags).
//
// Deploy the app to a permanent host (e.g. Vercel) and this URL never changes:
// the snippet is pasted once. All bar code lives in /storefront-offers-bar.js,
// so there is a single implementation shared with the dashboard preview.
(function () {
  "use strict";

  var APP_ORIGIN = "https://layers-breed-unit-sudden.trycloudflare.com";

  if (window.SallatiOffersBar) return;

  var src = APP_ORIGIN.replace(/\/+$/, "") + "/storefront-offers-bar.js?v=" + Date.now();

  function run(code) {
    try {
      // Indirect eval keeps the snippet's global scope.
      (0, eval)(code);
    } catch (e) {}
  }

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
})();
