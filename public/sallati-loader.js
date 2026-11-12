// Sallati storefront loader. Paste this as inline JS in the Salla app snippet
// editor (no HTML, no <script> tags). It loads every storefront module, so new
// modules added later keep working without re-pasting.
(function () {
  "use strict";

  var APP_ORIGIN = "https://sallati-delta.vercel.app";
  var base = APP_ORIGIN.replace(/\/+$/, "");

  var modules = [
    { id: "sallati-offers-bar-script", file: "storefront-offers-bar.js", global: "SallatiOffersBar" },
    { id: "sallati-luck-wheel-script", file: "storefront-luck-wheel.js", global: "SallatiLuckWheel" }
  ];

  function load(item) {
    if (window[item.global]) return;
    if (document.getElementById(item.id)) return;

    var src = base + "/" + item.file + "?v=" + Date.now();

    var script = document.createElement("script");
    script.id = item.id;
    script.src = src;
    script.async = true;
    // No eval() fallback: Salla's snippet guidelines forbid dynamic code
    // execution. A failed load is retried by the next page view instead.
    script.onerror = function () {};
    (document.head || document.documentElement).appendChild(script);
  }

  function start() {
    modules.forEach(load);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
