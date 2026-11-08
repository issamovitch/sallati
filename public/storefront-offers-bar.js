(function () {
  "use strict";

  // Derive the app origin from this script's own URL so it works on any host.
  var script = document.currentScript;
  var appOrigin = "";
  try {
    appOrigin = new URL(script && script.src ? script.src : window.location.href).origin;
  } catch (e) {
    appOrigin = window.location.origin;
  }

  function getMerchantId() {
    try {
      if (window.Salla && typeof window.Salla.config === "function") {
        var c = window.Salla.config("store");
        if (c && c.id) return c.id;
      }
    } catch (e) {}
    try {
      if (window.Salla && window.Salla.store && window.Salla.store.id) return window.Salla.store.id;
    } catch (e) {}
    try {
      if (window.store && window.store.id) return window.store.id;
    } catch (e) {}
    var meta = document.querySelector('meta[name="salla-store-id"]');
    if (meta) return meta.getAttribute("content");
    return null;
  }

  function renderBar(cfg) {
    if (!cfg || cfg.enabled !== true) return;
    var bar = document.createElement("div");
    bar.id = "sallati-offers-bar";
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:9999;" +
      "padding:8px 16px;text-align:center;font-size:13px;font-weight:600;" +
      "color:#fff;background:" + (cfg.color || "#1781ae") + ";" +
      "box-shadow:0 2px 8px rgba(0,0,0,.15);";
    bar.textContent = cfg.message || "";
    document.body.insertBefore(bar, document.body.firstChild);
    // push page content down so the bar doesn't overlap
    document.documentElement.style.paddingTop = (bar.offsetHeight || 36) + "px";
  }

  function init() {
    var merchantId = getMerchantId();
    if (!merchantId) return;
    var url = appOrigin + "/api/offers-bar?merchant_id=" + encodeURIComponent(merchantId);
    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(renderBar)
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();