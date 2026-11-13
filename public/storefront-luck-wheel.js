// Sallati luck wheel (عجلة الحظ) storefront renderer.
// Exposes window.SallatiLuckWheel.render(config) so the dashboard preview and
// the real storefront run the exact same code.
(function () {
  "use strict";

  // Only a fallback: document.currentScript.src wins when this file is loaded
  // through the storefront loader.
  var APP_ORIGIN = "https://sallati-delta.vercel.app";

  var OVERLAY_ID = "sallati-luck-wheel";
  var BUTTON_ID = "sallati-luck-wheel-fab";
  var STYLE_ID = "sallati-luck-wheel-style";
  var MIN_PRIZES = 2;
  var MAX_PRIZES = 10;
  var MIN_SPIN = 1500;
  var MAX_SPIN = 10000;
  var MIN_DELAY = 1;
  var MAX_DELAY = 120;
  var PALETTE = [
    "#1781ae", "#070d42", "#f59e0b", "#10b981", "#ef4444",
    "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899"
  ];

  var PREVIEW = !!window.__SALLATI_PREVIEW__;
  var currentCleanup = null;

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
    var w = /** @type {any} */ (window);
    try {
      if (w.salla && w.salla.config && typeof w.salla.config.get === "function") {
        var id = w.salla.config.get("store.id", "");
        if (id) return id;
      }
    } catch (e) {}
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
    return meta ? meta.getAttribute("content") : null;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + OVERLAY_ID + "{position:fixed;inset:0;z-index:2147483000;display:flex;" +
      "align-items:center;justify-content:center;padding:16px;overflow:auto;" +
      "background:rgba(7,13,66,.62);direction:rtl;}" +
      "#" + OVERLAY_ID + ",#" + OVERLAY_ID + " *{box-sizing:border-box;}" +
      "#" + OVERLAY_ID + " .slw-card{position:relative;width:min(94vw,400px);max-height:92vh;" +
      "overflow-y:auto;overflow-x:hidden;background:#fff;border-radius:20px;padding:24px 18px 18px;" +
      "box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center;}" +
      "#" + OVERLAY_ID + " .slw-close{position:absolute;top:10px;left:10px;width:32px;" +
      "height:32px;padding:0;border:0;border-radius:50%;background:#f1f5f9;color:#475569;" +
      "font:20px/1 inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;}" +
      "#" + OVERLAY_ID + " .slw-title{margin:0 0 6px;font-size:20px;font-weight:800;" +
      "color:#0f172a;line-height:1.45;}" +
      "#" + OVERLAY_ID + " .slw-desc{margin:0 0 14px;font-size:14px;color:#64748b;line-height:1.7;}" +
      "#" + OVERLAY_ID + " .slw-stage{position:relative;width:min(76vw,290px);max-width:100%;" +
      "aspect-ratio:1/1;margin:0 auto;overflow:hidden;}" +
      "#" + OVERLAY_ID + " .slw-rotor{position:absolute;inset:0;transform-origin:50% 50%;" +
      "will-change:transform;}" +
      "#" + OVERLAY_ID + " .slw-pointer{position:absolute;top:0;left:50%;" +
      "transform:translateX(-50%);z-index:3;width:0;height:0;" +
      "border-left:11px solid transparent;border-right:11px solid transparent;" +
      "border-top:20px solid var(--slw-accent,#1781ae);" +
      "filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));}" +
      "#" + OVERLAY_ID + " .slw-spin{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:31%;height:31%;padding:0 6px;border:4px solid #fff;border-radius:50%;" +
      "background:var(--slw-accent,#1781ae);color:#fff;font-family:inherit;font-size:14px;" +
      "font-weight:800;line-height:1.2;cursor:pointer;z-index:4;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25);}" +
      "#" + OVERLAY_ID + " .slw-spin[disabled]{cursor:default;opacity:.85;}" +
      "#" + OVERLAY_ID + " .slw-email{margin-top:14px;display:flex;flex-direction:column;gap:8px;}" +
      "#" + OVERLAY_ID + " .slw-input{width:100%;height:44px;padding:0 12px;border:1px solid #cbd5e1;" +
      "border-radius:12px;background:#fff;color:#0f172a;font-family:inherit;font-size:14px;" +
      "outline:none;direction:ltr;text-align:left;}" +
      "#" + OVERLAY_ID + " .slw-input:focus{border-color:var(--slw-accent,#1781ae);" +
      "box-shadow:0 0 0 3px rgba(23,129,174,.15);}" +
      "#" + OVERLAY_ID + " .slw-input.is-invalid{border-color:#dc2626;}" +
      "#" + OVERLAY_ID + " .slw-primary{width:100%;height:44px;padding:0 14px;border:0;" +
      "border-radius:12px;background:var(--slw-accent,#1781ae);color:#fff;font-family:inherit;" +
      "font-size:15px;font-weight:700;cursor:pointer;}" +
      "#" + OVERLAY_ID + " .slw-error{margin:0;font-size:12px;color:#dc2626;text-align:right;}" +
      "#" + OVERLAY_ID + " .slw-hint{margin:12px 0 0;font-size:12px;color:#94a3b8;}" +
      "#" + OVERLAY_ID + " .slw-result{display:flex;flex-direction:column;align-items:center;" +
      "gap:6px;padding:6px 0 2px;}" +
      "#" + OVERLAY_ID + " .slw-emoji{font-size:42px;line-height:1;}" +
      "#" + OVERLAY_ID + " .slw-result-title{margin:4px 0 0;font-size:20px;font-weight:800;color:#0f172a;}" +
      "#" + OVERLAY_ID + " .slw-prize{margin:0;font-size:16px;font-weight:700;" +
      "color:var(--slw-accent,#1781ae);}" +
      "#" + OVERLAY_ID + " .slw-coupon{margin-top:10px;display:flex;align-items:center;" +
      "justify-content:center;gap:8px;width:100%;padding:10px 12px;border:2px dashed " +
      "var(--slw-accent,#1781ae);border-radius:12px;background:#f0f9ff;}" +
      "#" + OVERLAY_ID + " .slw-code{font-family:monospace;font-size:20px;font-weight:800;" +
      "color:#070d42;letter-spacing:1px;direction:ltr;}" +
      "#" + OVERLAY_ID + " .slw-copy{padding:6px 10px;border:0;border-radius:8px;" +
      "background:var(--slw-accent,#1781ae);color:#fff;font-family:inherit;font-size:12px;" +
      "font-weight:700;cursor:pointer;}" +
      "#" + OVERLAY_ID + " .slw-note{margin:4px 0 0;font-size:12px;color:#64748b;}" +
      "#" + OVERLAY_ID + " .slw-result .slw-primary{margin-top:14px;}" +
      "#" + BUTTON_ID + "{position:fixed;left:18px;bottom:18px;z-index:2147482998;width:54px;" +
      "height:54px;padding:0;border:0;border-radius:50%;background:var(--slw-accent,#1781ae);" +
      "color:#fff;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;" +
      "justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.28);}";
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureFont(fontFamily) {
    var id = "sallati-luck-wheel-font";
    if (document.getElementById(id)) return;
    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(fontFamily).replace(/%20/g, "+") +
      ":wght@400;700;800&display=swap";
    document.head.appendChild(link);
  }

  function number(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function isHex(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
  }

  function contrast(hex) {
    var value = String(hex || "").replace("#", "");
    if (value.length === 3) value = value.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(value.slice(0, 2), 16);
    var g = parseInt(value.slice(2, 4), 16);
    var b = parseInt(value.slice(4, 6), 16);
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return "#ffffff";
    return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#111827" : "#ffffff";
  }

  function truncate(value, max) {
    var text = String(value || "").trim();
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  function sanitizeConfig(raw) {
    var cfg = raw && typeof raw === "object" ? raw : {};
    var prizes = Array.isArray(cfg.prizes) ? cfg.prizes : [];
    prizes = prizes
      .slice(0, MAX_PRIZES)
      .map(function (prize, index) {
        var p = prize && typeof prize === "object" ? prize : {};
        return {
          id: String(p.id || "prize-" + (index + 1)),
          label: String(p.label || "جائزة " + (index + 1)).slice(0, 40),
          weight: number(p.weight, 1, 100, 10),
          couponCode: typeof p.couponCode === "string" ? p.couponCode.trim().slice(0, 60) : "",
          color: isHex(p.color) ? p.color : PALETTE[index % PALETTE.length]
        };
      });

    return {
      enabled: cfg.enabled === true,
      headline: String(cfg.headline || "جرّب حظك واربح خصمًا!").slice(0, 120),
      description: String(cfg.description || "").slice(0, 240),
      buttonText: String(cfg.buttonText || "أدر العجلة").slice(0, 40),
      successText: String(cfg.successText || "مبروك! هذه جائزتك:").slice(0, 80),
      spinDuration: number(cfg.spinDuration, MIN_SPIN, MAX_SPIN, 4500),
      accentColor: isHex(cfg.accentColor) ? cfg.accentColor : "#1781ae",
      fontFamily: String(cfg.fontFamily || "Cairo").slice(0, 60),
      prizes: prizes.length >= MIN_PRIZES ? prizes : [],
      openOnDelay: cfg.openOnDelay !== false,
      delaySeconds: number(cfg.delaySeconds, MIN_DELAY, MAX_DELAY, 5),
      openOnExit: cfg.openOnExit !== false,
      openOnButton: cfg.openOnButton !== false,
      oncePerVisitor: cfg.oncePerVisitor !== false,
      requireEmail: cfg.requireEmail === true,
      emailPlaceholder: String(cfg.emailPlaceholder || "بريدك الإلكتروني").slice(0, 60)
    };
  }

  function point(deg) {
    var rad = ((deg - 90) * Math.PI) / 180;
    return [100 + 96 * Math.cos(rad), 100 + 96 * Math.sin(rad)];
  }

  function arcPath(start, end) {
    var p0 = point(start);
    var p1 = point(end);
    var large = end - start > 180 ? 1 : 0;
    return (
      "M100,100 L" + p0[0].toFixed(3) + "," + p0[1].toFixed(3) +
      " A96,96 0 " + large + " 1 " + p1[0].toFixed(3) + "," + p1[1].toFixed(3) + " Z"
    );
  }

  function buildWheel(svg, prizes) {
    var NS = "http://www.w3.org/2000/svg";
    var total = 0;
    prizes.forEach(function (prize) { total += prize.weight; });

    var segments = [];
    var angle = 0;
    var labelSize = prizes.length <= 6 ? "10" : prizes.length <= 8 ? "9" : "8";
    var maxChars = prizes.length <= 6 ? 9 : prizes.length <= 8 ? 7 : 6;

    prizes.forEach(function (prize) {
      var size = (prize.weight / total) * 360;
      var start = angle;
      var end = angle + size;
      var mid = start + size / 2;

      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", arcPath(start, end));
      path.setAttribute("fill", prize.color);
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "0.8");
      svg.appendChild(path);

      var text = document.createElementNS(NS, "text");
      text.setAttribute("x", "100");
      text.setAttribute("y", "52");
      text.setAttribute("text-anchor", "start");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", contrast(prize.color));
      text.setAttribute("font-size", labelSize);
      text.setAttribute("font-weight", "700");
      text.setAttribute("font-family", "inherit");
      text.setAttribute("pointer-events", "none");
      // Radial labels: baseline always points outward from the hub.
      text.setAttribute(
        "transform",
        "rotate(" + mid + " 100 100) rotate(-90 100 52)"
      );
      text.textContent = truncate(prize.label, maxChars);
      svg.appendChild(text);

      segments.push({ prize: prize, start: start, end: end, mid: mid, size: size });
      angle = end;
    });

    var ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", "100");
    ring.setAttribute("cy", "100");
    ring.setAttribute("r", "96");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "#ffffff");
    ring.setAttribute("stroke-width", "4");
    svg.appendChild(ring);

    var hub = document.createElementNS(NS, "circle");
    hub.setAttribute("cx", "100");
    hub.setAttribute("cy", "100");
    hub.setAttribute("r", "35");
    hub.setAttribute("fill", "#ffffff");
    svg.appendChild(hub);

    return segments;
  }

  function weightedPick(segments) {
    var total = 0;
    segments.forEach(function (segment) { total += segment.prize.weight; });
    var roll = Math.random() * total;
    var sum = 0;
    for (var i = 0; i < segments.length; i += 1) {
      sum += segments[i].prize.weight;
      if (roll < sum) return segments[i];
    }
    return segments[segments.length - 1];
  }

  function renderWheel(rawConfig) {
    if (currentCleanup) {
      try { currentCleanup(); } catch (e) {}
      currentCleanup = null;
    }

    var cfg = sanitizeConfig(rawConfig);
    if (!cfg.enabled || cfg.prizes.length < MIN_PRIZES) return;

    var merchantId = getMerchantId();
    var origin = resolveOrigin();
    var preview = PREVIEW;
    var resultKey = "sallati:luck-wheel:result:" + (merchantId || "preview");
    var emailKey = "sallati:luck-wheel:email:" + (merchantId || "preview");
    var timers = [];
    var listeners = [];
    var opened = false;
    var autoOpened = false;
    var spinning = false;
    var finished = false;
    var rotation = 0;
    var currentEmail = "";
    var previousOverflow = "";

    ensureStyles();
    ensureFont(cfg.fontFamily);

    if (!preview) {
      try { currentEmail = localStorage.getItem(emailKey) || ""; } catch (e) {}
    }

    function readResult() {
      if (preview) return null;
      try {
        var raw = localStorage.getItem(resultKey);
        if (!raw) return null;
        var value = JSON.parse(raw);
        if (value && typeof value.label === "string") return value;
      } catch (e) {}
      return null;
    }

    function saveResult(prize) {
      if (preview) return;
      try {
        localStorage.setItem(
          resultKey,
          JSON.stringify({
            id: prize.id,
            label: prize.label,
            couponCode: prize.couponCode || "",
            at: Date.now()
          })
        );
      } catch (e) {}
    }

    function saveEmail(email) {
      currentEmail = email;
      if (preview) return;
      try { localStorage.setItem(emailKey, email); } catch (e) {}
    }

    function later(fn, delay) {
      var id = window.setTimeout(fn, delay);
      timers.push(id);
      return id;
    }

    function listen(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push(function () { target.removeEventListener(type, handler); });
    }

    // ---------- DOM ----------

    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("dir", "rtl");
    overlay.style.display = "none";
    overlay.style.setProperty("--slw-accent", cfg.accentColor);
    overlay.style.fontFamily = "'" + cfg.fontFamily + "',sans-serif";

    var card = document.createElement("div");
    card.className = "slw-card";
    overlay.appendChild(card);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "slw-close";
    closeBtn.setAttribute("aria-label", "إغلاق");
    closeBtn.textContent = "×";
    card.appendChild(closeBtn);

    var title = document.createElement("h2");
    title.className = "slw-title";
    title.textContent = cfg.headline;
    card.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "slw-desc";
    desc.textContent = cfg.description;
    if (!cfg.description) desc.style.display = "none";
    card.appendChild(desc);

    var stage = document.createElement("div");
    stage.className = "slw-stage";
    card.appendChild(stage);

    var rotor = document.createElement("div");
    rotor.className = "slw-rotor";
    stage.appendChild(rotor);

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    rotor.appendChild(svg);

    var segments = buildWheel(svg, cfg.prizes);

    var pointer = document.createElement("div");
    pointer.className = "slw-pointer";
    stage.appendChild(pointer);

    var spinBtn = document.createElement("button");
    spinBtn.type = "button";
    spinBtn.className = "slw-spin";
    spinBtn.textContent = cfg.buttonText || "أدر العجلة";
    stage.appendChild(spinBtn);

    var form = document.createElement("form");
    form.className = "slw-email";
    form.noValidate = true;

    var emailInput = document.createElement("input");
    emailInput.className = "slw-input";
    emailInput.type = "email";
    emailInput.dir = "ltr";
    emailInput.autocomplete = "email";
    emailInput.placeholder = cfg.emailPlaceholder;
    emailInput.value = currentEmail;
    form.appendChild(emailInput);

    var emailBtn = document.createElement("button");
    emailBtn.type = "submit";
    emailBtn.className = "slw-primary";
    emailBtn.textContent = "متابعة";
    form.appendChild(emailBtn);

    var errorText = document.createElement("p");
    errorText.className = "slw-error";
    errorText.textContent = "أدخل بريدًا إلكترونيًا صحيحًا.";
    errorText.style.display = "none";
    form.appendChild(errorText);

    card.appendChild(form);

    var hint = document.createElement("p");
    hint.className = "slw-hint";
    hint.textContent = "جوائز العجلة تُمنح مرة واحدة لكل زيارة.";
    card.appendChild(hint);

    var resultBox = document.createElement("div");
    resultBox.className = "slw-result";
    resultBox.style.display = "none";
    card.appendChild(resultBox);

    var emoji = document.createElement("div");
    emoji.className = "slw-emoji";
    resultBox.appendChild(emoji);

    var resultTitle = document.createElement("h3");
    resultTitle.className = "slw-result-title";
    resultBox.appendChild(resultTitle);

    var prizeLabel = document.createElement("p");
    prizeLabel.className = "slw-prize";
    resultBox.appendChild(prizeLabel);

    var couponBox = document.createElement("div");
    couponBox.className = "slw-coupon";
    resultBox.appendChild(couponBox);

    var couponCode = document.createElement("span");
    couponCode.className = "slw-code";
    couponBox.appendChild(couponCode);

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "slw-copy";
    copyBtn.textContent = "نسخ";
    couponBox.appendChild(copyBtn);

    var note = document.createElement("p");
    note.className = "slw-note";
    note.textContent = "احتفظ بالكود واستخدمه عند إتمام الطلب.";
    resultBox.appendChild(note);

    var doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "slw-primary";
    doneBtn.textContent = "إغلاق";
    resultBox.appendChild(doneBtn);

    (document.body || document.documentElement).appendChild(overlay);

    // ---------- behaviour ----------

    function setSpinEnabled(enabled) {
      spinBtn.disabled = !enabled;
      spinBtn.style.opacity = enabled ? "1" : "0.7";
    }

    function updateEmailGate() {
      // The wheel button stays visible and clickable; the email is validated on spin.
      form.style.display = !cfg.requireEmail || currentEmail ? "none" : "flex";
    }

    function openPopup() {
      if (opened) return;
      opened = true;
      overlay.style.display = "flex";
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Already played on this page load: keep the result screen as-is.
      if (finished) return;

      var saved = cfg.oncePerVisitor ? readResult() : null;
      if (saved) {
        showResult(saved);
        return;
      }

      updateEmailGate();
      if (cfg.requireEmail && !currentEmail) {
        later(function () {
          try { emailInput.focus({ preventScroll: true }); } catch (e) {}
        }, 120);
      }
    }

    function closePopup() {
      opened = false;
      overlay.style.display = "none";
      document.body.style.overflow = previousOverflow;
    }

    function autoOpen() {
      if (autoOpened) return;
      if (cfg.oncePerVisitor && readResult()) return;
      autoOpened = true;
      openPopup();
    }

    function showResult(prize) {
      finished = true;
      spinning = false;
      stage.style.display = "none";
      form.style.display = "none";
      desc.style.display = "none";
      hint.style.display = "none";
      resultBox.style.display = "flex";

      var hasCoupon = !!(prize.couponCode && String(prize.couponCode).trim());
      emoji.textContent = hasCoupon ? "🎉" : "🍀";
      resultTitle.textContent = hasCoupon ? cfg.successText : "حظ أوفر!";
      prizeLabel.textContent = prize.label || "";
      couponBox.style.display = hasCoupon ? "flex" : "none";
      note.style.display = hasCoupon ? "block" : "none";
      couponCode.textContent = hasCoupon ? String(prize.couponCode).trim() : "";
    }

    function postLead(prize) {
      if (preview || !currentEmail) return;
      if (!merchantId) return;
      try {
        fetch(origin + "/api/luck-wheel/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            merchantId: merchantId,
            email: currentEmail,
            prizeId: prize.id,
            prizeLabel: prize.label,
            couponCode: prize.couponCode || ""
          })
        }).catch(function () {});
      } catch (e) {}
    }

    function spin() {
      if (spinning || finished) return;
      if (cfg.requireEmail && !currentEmail) {
        try { emailInput.focus(); } catch (e) {}
        return;
      }

      spinning = true;
      setSpinEnabled(false);
      spinBtn.textContent = "…";

      var picked = weightedPick(segments);
      var targetMod = ((-picked.mid % 360) + 360) % 360;
      var currentMod = ((rotation % 360) + 360) % 360;
      var delta = (targetMod - currentMod + 360) % 360;
      var jitterMax = Math.max(0, picked.size / 2 - 6);
      var jitter = (Math.random() * 2 - 1) * jitterMax;

      rotation += 360 * 6 + delta + jitter;
      rotor.style.transition =
        "transform " + cfg.spinDuration + "ms cubic-bezier(0.12,0.72,0.15,1)";
      rotor.style.transform = "rotate(" + rotation + "deg)";

      later(function () {
        saveResult(picked.prize);
        postLead(picked.prize);
        showResult(picked.prize);
      }, cfg.spinDuration + 200);
    }

    function copyCode() {
      var code = couponCode.textContent || "";
      if (!code) return;
      var done = function () {
        copyBtn.textContent = "تم النسخ";
        later(function () { copyBtn.textContent = "نسخ"; }, 1600);
      };
      var fallback = function () {
        try {
          var area = document.createElement("textarea");
          area.value = code;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          document.body.removeChild(area);
          done();
        } catch (e) {}
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, fallback);
      } else {
        fallback();
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = String(emailInput.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.classList.add("is-invalid");
        errorText.style.display = "block";
        return;
      }
      emailInput.classList.remove("is-invalid");
      errorText.style.display = "none";
      saveEmail(email);
      updateEmailGate();
      later(spin, 320);
    });

    emailInput.addEventListener("input", function () {
      emailInput.classList.remove("is-invalid");
      errorText.style.display = "none";
    });

    spinBtn.addEventListener("click", spin);
    copyBtn.addEventListener("click", copyCode);
    closeBtn.addEventListener("click", closePopup);
    doneBtn.addEventListener("click", closePopup);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closePopup();
    });

    listen(document, "keydown", function (event) {
      if (event.key === "Escape" && opened) closePopup();
    });

    // ---------- triggers ----------

    if (preview) {
      later(openPopup, 60);
    } else {
      if (cfg.openOnDelay) later(autoOpen, cfg.delaySeconds * 1000);

      if (cfg.openOnExit) {
        listen(document, "mouseout", function (event) {
          if (event.clientY <= 0 && !event.relatedTarget) autoOpen();
        });
      }

      if (cfg.openOnButton) {
        var fab = document.createElement("button");
        fab.id = BUTTON_ID;
        fab.type = "button";
        fab.setAttribute("aria-label", "عجلة الحظ");
        fab.setAttribute("title", "عجلة الحظ");
        fab.textContent = "🎡";
        fab.style.setProperty("--slw-accent", cfg.accentColor);
        fab.style.fontFamily = "'" + cfg.fontFamily + "',sans-serif";
        fab.addEventListener("click", openPopup);
        (document.body || document.documentElement).appendChild(fab);
      }
    }

    currentCleanup = function () {
      timers.forEach(function (id) { window.clearTimeout(id); });
      listeners.forEach(function (off) { off(); });
      if (opened) document.body.style.overflow = previousOverflow;
      var fabNode = document.getElementById(BUTTON_ID);
      if (fabNode) fabNode.remove();
      if (overlay.parentNode) overlay.remove();
    };
  }

  window.SallatiLuckWheel = { render: renderWheel };

  function init() {
    if (window.__SALLATI_PREVIEW__) return;

    var merchantId = getMerchantId();
    if (!merchantId) return;

    var url =
      resolveOrigin() + "/api/luck-wheel?merchant_id=" + encodeURIComponent(merchantId);
    fetch(url, { cache: "no-store" })
      .then(function (response) { return response.json(); })
      .then(renderWheel)
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
