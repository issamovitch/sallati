(function () {
  "use strict";

  // Public origin of the Sallati app. Only a fallback: when this file is loaded
  // through the loader snippet, document.currentScript.src is the true origin.
  var APP_ORIGIN = "https://sallati-delta.vercel.app";
  var DEFAULT_SLIDE_MS = 500;
  var DEFAULT_DURATION = 5;

  function resolveOrigin() {
    var script = document.currentScript;
    try {
      if (script && script.src) return new URL(script.src).origin;
    } catch (e) {}
    if (APP_ORIGIN) return APP_ORIGIN.replace(/\/+$/, "");
    try {
      return new URL(window.location.href).origin;
    } catch (e) {
      return window.location.origin;
    }
  }

  function getMerchantId() {
    // Cast once: Salla attaches non-standard globals to window.
    var w = /** @type {any} */ (window);

    // Official Salla config API (this is what the storefront exposes).
    try {
      if (w.salla && w.salla.config && typeof w.salla.config.get === "function") {
        var id = w.salla.config.get("store.id", "");
        if (id) return id;
      }
    } catch (e) {}

    // Some versions expose Salla with a capital S.
    try {
      if (w.Salla && w.Salla.config && typeof w.Salla.config.get === "function") {
        var id2 = w.Salla.config.get("store.id", "");
        if (id2) return id2;
      }
    } catch (e) {}

    try {
      if (w.salla && w.salla.store && w.salla.store.id) return w.salla.store.id;
    } catch (e) {}

    try {
      if (w.store && w.store.id) return w.store.id;
    } catch (e) {}

    var meta = document.querySelector('meta[name="salla-store-id"]');
    if (meta) return meta.getAttribute("content");
    return null;
  }

  function ensureStyles() {
    if (document.getElementById("sallati-offers-bar-style")) return;
    var style = document.createElement("style");
    style.id = "sallati-offers-bar-style";
    style.textContent =
      "#sallati-offers-bar,#sallati-offers-bar *{box-sizing:border-box;}" +
      "#sallati-offers-bar a{color:inherit;text-decoration:underline;}" +
      "#sallati-offers-bar svg{display:inline-block;width:1em;height:1em;vertical-align:-0.125em;}" +
      "#sallati-offers-bar b,#sallati-offers-bar strong{font-weight:700;}" +
      "#sallati-offers-bar i,#sallati-offers-bar em{font-style:italic;}";
    document.head.appendChild(style);
  }

  function ensureFont(fontFamily) {
    var id = "sallati-offers-bar-font";
    if (document.getElementById(id)) return;
    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(fontFamily).replace(/%20/g, "+") +
      ":wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }

  function renderBar(cfg) {
    var existing = document.getElementById("sallati-offers-bar");
    if (!cfg || cfg.enabled !== true) {
      if (existing) existing.remove();
      return;
    }

    if (existing) existing.remove();

    var texts = Array.isArray(cfg.texts) && cfg.texts.length
      ? cfg.texts
      : [{ message: cfg.message || "", duration: DEFAULT_DURATION }];

    var count = texts.length;
    var height = Number(cfg.height) > 0 ? Number(cfg.height) : 46;
    var fontSize = Number(cfg.fontSize) > 0 ? Number(cfg.fontSize) : 16;
    var fontFamily = cfg.fontFamily || "Cairo";
    var color = cfg.color || "#000000";

    var slideMs = Number(cfg.animationSpeed);
    if (!(slideMs > 0)) slideMs = DEFAULT_SLIDE_MS;
    slideMs = Math.max(100, Math.min(3000, slideMs));

    ensureStyles();
    ensureFont(fontFamily);

    var bar = document.createElement("div");
    bar.id = "sallati-offers-bar";
    bar.setAttribute("dir", "rtl");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:9999;" +
      "height:" + height + "px;overflow:hidden;" +
      "font-family:'" + fontFamily + "',sans-serif;font-size:" + fontSize + "px;font-weight:600;" +
      "color:#fff;background:" + color + ";" +
      "box-shadow:0 2px 8px rgba(0,0,0,.15);";

    var viewport = document.createElement("div");
    viewport.style.cssText = "height:100%;width:100%;overflow:hidden;direction:ltr;";

    var track = document.createElement("div");
    track.style.cssText =
      "display:flex;height:100%;width:100%;direction:ltr;" +
      "transition:transform " + slideMs + "ms ease;will-change:transform;";

    function makeSlide(html) {
      var slide = document.createElement("div");
      slide.style.cssText =
        "box-sizing:border-box;flex:0 0 100%;width:100%;height:100%;" +
        "display:flex;align-items:center;justify-content:center;" +
        "padding:0 16px;text-align:center;direction:rtl;";
      slide.innerHTML = html || "";
      return slide;
    }

    for (var i = 0; i < count; i += 1) {
      track.appendChild(makeSlide(texts[i].message));
    }

    // Duplicate the first slide so the loop slides forward instead of rewinding.
    if (count > 1) {
      track.appendChild(makeSlide(texts[0].message));
    }

    viewport.appendChild(track);
    bar.appendChild(viewport);
    var parent = document.body || document.documentElement;
    parent.insertBefore(bar, parent.firstChild);

    function syncPageOffset() {
      document.documentElement.style.paddingTop = (bar.offsetHeight || height) + "px";
    }
    syncPageOffset();

    // One text: it is centered by the slide itself, nothing to animate.
    if (count <= 1) return;

    var index = 0;
    var timer = null;
    var resetTimer = null;
    var stopped = false;

    function durationAt(i) {
      var seconds = Number(texts[i % count].duration);
      return (seconds >= 1 ? seconds : DEFAULT_DURATION) * 1000;
    }

    function scheduleNext() {
      if (stopped) return;
      timer = window.setTimeout(function () {
        if (stopped) return;

        index += 1;
        track.style.transition = "transform " + slideMs + "ms ease";
        track.style.transform = "translateX(-" + (index * 100) + "%)";

        if (index >= count) {
          // We are on the duplicate: jump back to the real first slide unseen.
          resetTimer = window.setTimeout(function () {
            if (stopped) return;
            track.style.transition = "none";
            index = 0;
            track.style.transform = "translateX(0)";
            // Force a reflow so the next transition is not batched away.
            void track.offsetWidth;
            scheduleNext();
          }, slideMs + 30);
        } else {
          scheduleNext();
        }
      }, durationAt(index) + slideMs);
    }

    scheduleNext();

    window.addEventListener("pagehide", function () {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      if (resetTimer) window.clearTimeout(resetTimer);
    });
  }

  // Exposed so the dashboard preview can render with this exact code.
  window.SallatiOffersBar = { render: renderBar };

  // Existing installs only paste the offers-bar loader. Pull the other
  // storefront modules in too, so they keep working without a re-paste.
  function loadCompanionModules() {
    if (window.__SALLATI_PREVIEW__) return;
    if (window.SallatiLuckWheel) return;
    if (document.getElementById("sallati-luck-wheel-script")) return;

    var script = document.createElement("script");
    script.id = "sallati-luck-wheel-script";
    script.src = resolveOrigin() + "/storefront-luck-wheel.js?v=" + Date.now();
    script.async = true;
    (document.head || document.documentElement).appendChild(script);
  }

  function init() {
    // The dashboard preview renders with local (unsaved) state instead.
    if (window.__SALLATI_PREVIEW__) return;
    loadCompanionModules();

    var merchantId = getMerchantId();
    if (!merchantId) return;

    var url = resolveOrigin() + "/api/offers-bar?merchant_id=" + encodeURIComponent(merchantId);
    fetch(url, { cache: "no-store" })
      .then(function (response) { return response.json(); })
      .then(renderBar)
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
