/*!
 * theme-selector.js
 * A dependency-free, drop-in theme selector.
 *
 * USAGE
 * -----
 *   <link rel="stylesheet" href="theme-selector.css">
 *   <script src="theme-selector.js"></script>
 *
 * Auto-initializes on DOMContentLoaded and injects a cog button (top
 * right) that opens a theme panel. Styles everything via CSS custom
 * properties on :root (--ts-bg, --ts-text, --ts-primary, ...).
 *
 * AUTOMATIC ELEMENT DETECTION (no markup required)
 * --------------------------------------------------
 * On init (and every time the panel opens), the module scans the live
 * DOM for common UI conventions and tags whatever it finds with an
 * internal marker class, which an injected stylesheet then wires to
 * the matching --ts-* variables. No changes to your app's HTML or CSS
 * are required for this to work. Detected per target type:
 *
 *   card    - .card/.Card, .MuiCard-root, .MuiPaper-root, .ant-card,
 *             .chakra-card, [class*="card"], or (as a fallback, only
 *             if nothing else matched) any element whose computed
 *             style looks card-like: rounded corners or a shadow,
 *             real padding, and reasonable size.
 *   button  - <button>, [role="button"], .btn/.button, Bootstrap/MUI/
 *             Ant/Chakra button classes.
 *   nav     - <nav>, [role="navigation"], .navbar/.nav/.sidebar, MUI
 *             AppBar, Ant Menu.
 *   input   - <input>/<select>/<textarea>, [contenteditable="true"],
 *             .form-control, MUI/Ant/Chakra input classes.
 *   link    - <a href="...">.
 *   badge   - .badge/.chip/.tag, MUI Chip, Ant Tag, Chakra badge.
 *   modal   - [role="dialog"], <dialog>, .modal/.dialog, MUI Dialog,
 *             Ant Modal.
 *
 * The matching customization group in the "Custom" theme ONLY appears
 * if at least one such element was actually found. No cards on the
 * page → no "Cards" section.
 *
 * MANUAL OVERRIDE / OPT-OUT (optional)
 * --------------------------------------
 * Heuristics can be wrong on unconventional markup. You can override
 * them per element:
 *
 *   <div data-theme-target="card">...</div>   force-include as a card
 *   <div data-theme-target="none">...</div>   exclude from all heuristics
 *   <div data-theme-ignore>...</div>          same as above, alt syntax
 *
 * To disable auto-init (e.g. to control timing yourself), add
 * `data-theme-selector="manual"` to the <script> tag or to <body>,
 * then call `window.ThemeSelector.init()` yourself.
 *
 * Also usable as a CommonJS module: `require('theme-selector')`.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "ts-theme-state";

  /* ------------------------------------------------------------------ */
  /* Token model                                                         */
  /* ------------------------------------------------------------------ */

  // Base tokens every theme sets. These map 1:1 to CSS vars on :root.
  var BASE_TOKEN_ORDER = [
    "bg", "surface", "text", "textMuted", "primary", "primaryContrast", "accent", "border"
  ];
  var BASE_CSS_VAR = {
    bg: "--ts-bg",
    surface: "--ts-surface",
    text: "--ts-text",
    textMuted: "--ts-text-muted",
    primary: "--ts-primary",
    primaryContrast: "--ts-primary-contrast",
    accent: "--ts-accent",
    border: "--ts-border"
  };
  var BASE_LABEL = {
    bg: "Background",
    surface: "Surface",
    text: "Text",
    textMuted: "Muted text",
    primary: "Primary",
    primaryContrast: "Primary contrast",
    accent: "Accent",
    border: "Border"
  };

  // Targets that are auto-detected via common markup conventions
  // (see `signatures`) as well as an explicit data-theme-target
  // override. Each token derives a sensible default from the base
  // palette, feeds a real CSS property (`prop`) on the matched
  // elements via an injected stylesheet, and gets an optional
  // custom-color override.
  var TARGET_DEFS = {
    card: {
      label: "Cards",
      signatures: [
        ".card", ".Card", ".MuiCard-root", ".MuiPaper-root", ".ant-card",
        ".chakra-card", "[class*=\"card\"]"
      ],
      tokens: {
        "card-bg": { label: "Card background", from: "surface", prop: "background-color" },
        "card-border": { label: "Card border", from: "border", prop: "border-color" }
      }
    },
    button: {
      label: "Buttons",
      signatures: [
        "button", "[role=\"button\"]", ".btn", ".button", ".MuiButton-root",
        ".ant-btn", ".chakra-button", "[class*=\"btn-\"]"
      ],
      tokens: {
        "button-bg": { label: "Button background", from: "primary", prop: "background-color" },
        "button-text": { label: "Button text", from: "primaryContrast", prop: "color" }
      }
    },
    nav: {
      label: "Navigation",
      signatures: [
        "nav", "[role=\"navigation\"]", ".navbar", ".nav", ".sidebar",
        ".MuiAppBar-root", ".ant-menu", "[class*=\"navbar\"]"
      ],
      tokens: {
        "nav-bg": { label: "Nav background", from: "surface", prop: "background-color" },
        "nav-text": { label: "Nav text", from: "text", prop: "color" }
      }
    },
    input: {
      label: "Inputs",
      signatures: [
        "input:not([type=\"hidden\"]):not([type=\"checkbox\"]):not([type=\"radio\"])",
        "select", "textarea", "[contenteditable=\"true\"]", ".form-control",
        ".MuiInputBase-root", ".ant-input", ".chakra-input"
      ],
      tokens: {
        "input-bg": { label: "Input background", from: "bg", prop: "background-color" },
        "input-border": { label: "Input border", from: "border", prop: "border-color" }
      }
    },
    link: {
      label: "Links",
      signatures: ["a[href]"],
      tokens: {
        "link": { label: "Link color", from: "primary", prop: "color" }
      }
    },
    badge: {
      label: "Badges",
      signatures: [
        ".badge", ".chip", ".tag", ".MuiChip-root", ".ant-tag",
        ".chakra-badge", "[class*=\"badge\"]"
      ],
      tokens: {
        "badge-bg": { label: "Badge background", from: "accent", prop: "background-color" },
        "badge-text": { label: "Badge text", from: "primaryContrast", prop: "color" }
      }
    },
    modal: {
      label: "Modals",
      signatures: [
        "[role=\"dialog\"]", "dialog", ".modal", ".dialog",
        ".MuiDialog-root", ".ant-modal"
      ],
      tokens: {
        "modal-bg": { label: "Modal background", from: "bg", prop: "background-color" }
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Color helpers                                                       */
  /* ------------------------------------------------------------------ */

  function hsl(h, s, l) {
    return "hsl(" + Math.round(h) + ", " + s + "%, " + l + "%)";
  }

  // Builds a full base-token set from a hue (0-360) or null for monochrome.
  function paletteFromHue(hue) {
    if (hue === null) {
      return {
        bg: "#ffffff",
        surface: "#f4f4f5",
        text: "#18181b",
        textMuted: "#71717a",
        primary: "#3f3f46",
        primaryContrast: "#ffffff",
        accent: "#71717a",
        border: "#e4e4e7"
      };
    }
    return {
      bg: hsl(hue, 40, 98),
      surface: hsl(hue, 45, 94),
      text: hsl(hue, 30, 14),
      textMuted: hsl(hue, 15, 42),
      primary: hsl(hue, 70, 46),
      primaryContrast: "#ffffff",
      accent: hsl((hue + 30) % 360, 70, 60),
      border: hsl(hue, 30, 86)
    };
  }

  var PRESETS = [
    { id: "monochrome", label: "Monochrome", hue: null },
    { id: "red", label: "Red", hue: 0 },
    { id: "orange", label: "Orange", hue: 28 },
    { id: "yellow", label: "Yellow", hue: 48 },
    { id: "green", label: "Green", hue: 142 },
    { id: "cyan", label: "Cyan", hue: 189 },
    { id: "blue", label: "Blue", hue: 221 },
    { id: "purple", label: "Purple", hue: 268 },
    { id: "pink", label: "Pink", hue: 330 }
  ];

  /* ------------------------------------------------------------------ */
  /* Small DOM helpers                                                   */
  /* ------------------------------------------------------------------ */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var COG_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 ' +
    '0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 ' +
    '0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 ' +
    '2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 ' +
    '1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 ' +
    '0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 ' +
    '2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  /* ------------------------------------------------------------------ */
  /* ThemeSelector                                                       */
  /* ------------------------------------------------------------------ */

  function ThemeSelector(options) {
    this.options = options || {};
    this.root = document.documentElement;
    this.state = { theme: "blue", custom: {} };
    this.rafId = null;
    this.rainbowHue = 0;
    this.detectedTargets = [];
    this._built = false;
  }

  ThemeSelector.prototype.init = function () {
    if (this._built) return this;
    this._built = true;
    this._loadState();
    this._buildUI();
    this._injectTargetStylesheet();
    this._detectTargets();
    this._renderSwatches();
    this._applyState(false);
    return this;
  };

  ThemeSelector.prototype._loadState = function () {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.theme) this.state = parsed;
      }
    } catch (e) { /* storage unavailable — fall back to default */ }
  };

  ThemeSelector.prototype._saveState = function () {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) { /* ignore quota / privacy-mode errors */ }
  };

  // Rebuilds --ts-target-* marker classes on the live DOM. Safe to call
  // repeatedly (e.g. every time the panel opens) since it clears its
  // own previous markers first.
  ThemeSelector.prototype._detectTargets = function () {
    var self = this;

    Object.keys(TARGET_DEFS).forEach(function (key) {
      var prevMarked = document.querySelectorAll(".ts-target-" + key);
      for (var i = 0; i < prevMarked.length; i++) {
        prevMarked[i].classList.remove("ts-target-" + key);
      }
    });

    var found = [];
    Object.keys(TARGET_DEFS).forEach(function (key) {
      var matched = self._matchTargetElements(key);
      if (matched.length) {
        matched.forEach(function (elm) { elm.classList.add("ts-target-" + key); });
        found.push(key);
      }
    });
    this.detectedTargets = found;
  };

  // Union of: elements matching this target's known markup
  // conventions, elements explicitly opted in via
  // data-theme-target="key", minus anything explicitly opted out via
  // data-theme-target="none" or data-theme-ignore. Falls back to a
  // computed-style heuristic for "card" only, and only when nothing
  // else matched, since cards have no single reliable tag/role.
  ThemeSelector.prototype._matchTargetElements = function (key) {
    var def = TARGET_DEFS[key];
    var set = [];

    function add(elm) {
      if (set.indexOf(elm) !== -1) return;
      set.push(elm);
    }

    try {
      var bySignature = document.querySelectorAll(def.signatures.join(","));
      for (var i = 0; i < bySignature.length; i++) add(bySignature[i]);
    } catch (e) { /* one selector unsupported in this browser — skip gracefully */ }

    var byAttr = document.querySelectorAll('[data-theme-target="' + key + '"]');
    for (var j = 0; j < byAttr.length; j++) add(byAttr[j]);

    if (key === "card" && set.length === 0) {
      this._cardStyleHeuristic().forEach(add);
    }

    return set.filter(function (elm) {
      var opted = elm.getAttribute("data-theme-target") === "none";
      var ignored = elm.hasAttribute("data-theme-ignore");
      return !opted && !ignored;
    });
  };

  // Last-resort visual heuristic for "card-like" containers when no
  // known class/framework convention matched anything on the page:
  // rounded corners or a shadow, real padding, a reasonable footprint,
  // and at least one child. Bounded so it stays cheap on large pages.
  ThemeSelector.prototype._cardStyleHeuristic = function () {
    var candidates = document.querySelectorAll("div, li, article, section");
    var scanLimit = Math.min(candidates.length, 1200);
    var matches = [];

    for (var i = 0; i < scanLimit && matches.length < 200; i++) {
      var elm = candidates[i];
      var style = getComputedStyle(elm);
      var radius = parseFloat(style.borderRadius) || 0;
      var hasShadow = !!style.boxShadow && style.boxShadow !== "none";
      var padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingLeft) || 0);
      var w = elm.offsetWidth;
      var h = elm.offsetHeight;

      if (
        (hasShadow || radius > 4) &&
        padding > 4 &&
        elm.childElementCount > 0 &&
        w > 80 && w < 1200 &&
        h > 40 && h < 1000
      ) {
        matches.push(elm);
      }
    }
    return matches;
  };

  // Builds (once) the stylesheet that actually applies --ts-* target
  // tokens to whatever got tagged with a .ts-target-* marker class —
  // this is what makes detection visually effective with zero CSS
  // changes required from the host app.
  ThemeSelector.prototype._injectTargetStylesheet = function () {
    if (document.getElementById("ts-target-rules")) return;
    var lines = [];
    Object.keys(TARGET_DEFS).forEach(function (key) {
      var def = TARGET_DEFS[key];
      var decls = Object.keys(def.tokens).map(function (tokenKey) {
        var t = def.tokens[tokenKey];
        return t.prop + ": var(--ts-" + tokenKey + ") !important;";
      }).join(" ");
      lines.push(
        "." + "ts-target-" + key + " { " + decls +
        " transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease; }"
      );
    });
    var style = el("style", { id: "ts-target-rules", text: lines.join("\n") });
    document.head.appendChild(style);
  };

  /* ---- UI construction ---- */

  ThemeSelector.prototype._buildUI = function () {
    var self = this;

    this.toggleBtn = el("button", {
      class: "ts-toggle",
      type: "button",
      "aria-label": "Open theme settings",
      "aria-expanded": "false",
      html: COG_SVG
    });

    this.panel = el("div", { class: "ts-panel", role: "dialog", "aria-label": "Theme settings" });

    this.toggleBtn.addEventListener("click", function () { self._togglePanel(); });

    document.addEventListener("click", function (evt) {
      if (!self.panel || self.panel.getAttribute("data-open") !== "true") return;
      if (self.panel.contains(evt.target) || self.toggleBtn.contains(evt.target)) return;
      self._closePanel();
    });
    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") self._closePanel();
    });

    document.body.appendChild(this.toggleBtn);
    document.body.appendChild(this.panel);
  };

  ThemeSelector.prototype._togglePanel = function () {
    var open = this.panel.getAttribute("data-open") === "true";
    if (open) this._closePanel(); else this._openPanel();
  };

  ThemeSelector.prototype._openPanel = function () {
    // Re-scan in case the host app rendered new elements (e.g. cards
    // loaded async) since last open.
    this._detectTargets();
    this._renderSwatches();
    this.panel.setAttribute("data-open", "true");
    this.toggleBtn.setAttribute("aria-expanded", "true");
  };

  ThemeSelector.prototype._closePanel = function () {
    this.panel.setAttribute("data-open", "false");
    this.toggleBtn.setAttribute("aria-expanded", "false");
  };

  ThemeSelector.prototype._renderSwatches = function () {
    var self = this;
    this.panel.innerHTML = "";
    this.panel.appendChild(el("h3", { text: "Theme" }));

    var grid = el("div", { class: "ts-swatch-grid" });

    PRESETS.forEach(function (preset) {
      grid.appendChild(self._buildSwatchCell(preset.id, preset.label, function (btn) {
        var pal = paletteFromHue(preset.hue);
        btn.style.background = pal.primary;
      }));
    });

    grid.appendChild(this._buildSwatchCell("rainbow", "Rainbow", function (btn) {
      btn.classList.add("ts-rainbow-swatch");
    }));

    grid.appendChild(this._buildSwatchCell("custom", "Custom", function (btn) {
      btn.classList.add("ts-custom-swatch");
      btn.textContent = "🎨";
    }));

    this.panel.appendChild(grid);

    if (this.state.theme === "custom") {
      this.panel.appendChild(el("hr", { class: "ts-divider" }));
      this._renderCustomFields();
    }
  };

  ThemeSelector.prototype._buildSwatchCell = function (id, label, decorate) {
    var self = this;
    var cell = el("div", { class: "ts-swatch-cell" });
    var btn = el("button", {
      class: "ts-swatch",
      type: "button",
      "aria-pressed": String(this.state.theme === id),
      "aria-label": label,
      title: label
    });
    decorate(btn);
    btn.addEventListener("click", function () {
      self.setTheme(id);
    });
    cell.appendChild(btn);
    cell.appendChild(el("span", { class: "ts-swatch-label", text: label }));
    return cell;
  };

  ThemeSelector.prototype._renderCustomFields = function () {
    var self = this;

    this.panel.appendChild(this._buildFieldset("Base", BASE_TOKEN_ORDER.map(function (key) {
      return { varName: BASE_CSS_VAR[key].replace("--ts-", ""), cssVar: BASE_CSS_VAR[key], label: BASE_LABEL[key] };
    })));

    this.detectedTargets.forEach(function (targetKey) {
      var def = TARGET_DEFS[targetKey];
      var fields = Object.keys(def.tokens).map(function (tokenKey) {
        return { varName: tokenKey, cssVar: "--ts-" + tokenKey, label: def.tokens[tokenKey].label };
      });
      self.panel.appendChild(self._buildFieldset(def.label, fields));
    });

    var resetBtn = el("button", { class: "ts-reset-btn", type: "button", text: "Reset custom colors" });
    resetBtn.addEventListener("click", function () {
      self.state.custom = {};
      self._saveState();
      self._applyState(false);
      self._renderSwatches();
    });
    this.panel.appendChild(resetBtn);
  };

  ThemeSelector.prototype._buildFieldset = function (legendText, fields) {
    var self = this;
    var fieldset = el("fieldset", { class: "ts-field-group" });
    fieldset.appendChild(el("legend", { text: legendText }));

    fields.forEach(function (f) {
      var row = el("div", { class: "ts-field" });
      var id = "ts-field-" + f.varName;
      var current = self._currentVarValue(f.cssVar);
      var input = el("input", { type: "color", id: id, value: toHexColor(current) });
      input.addEventListener("input", function (evt) {
        self.state.theme = "custom";
        self.state.custom[f.varName] = evt.target.value;
        self._saveState();
        self._setVar(f.cssVar, evt.target.value);
      });
      row.appendChild(el("label", { for: id, text: f.label }));
      row.appendChild(input);
      fieldset.appendChild(row);
    });

    return fieldset;
  };

  ThemeSelector.prototype._currentVarValue = function (cssVar) {
    var v = getComputedStyle(this.root).getPropertyValue(cssVar);
    return (v || "").trim() || "#000000";
  };

  ThemeSelector.prototype._setVar = function (cssVar, value) {
    this.root.style.setProperty(cssVar, value);
  };

  /* ---- Applying themes ---- */

  ThemeSelector.prototype.setTheme = function (id) {
    this.state.theme = id;
    this._saveState();
    this._applyState(true);
    this._renderSwatches();
  };

  ThemeSelector.prototype._applyState = function (rebuildFields) {
    this._stopRainbow();

    if (this.state.theme === "rainbow") {
      this._startRainbow();
      return;
    }

    if (this.state.theme === "custom") {
      // Start from the last preset's derived look (blue as sane fallback),
      // then layer any explicit custom overrides on top.
      this._applyPalette(paletteFromHue(221));
      var self = this;
      Object.keys(this.state.custom).forEach(function (varName) {
        self._setVar("--ts-" + varName, self.state.custom[varName]);
      });
      if (rebuildFields) this._renderSwatches();
      return;
    }

    var preset = PRESETS.filter(function (p) { return p.id === this.state.theme; }, this)[0];
    if (!preset) preset = PRESETS[5]; // blue fallback
    this._applyPalette(paletteFromHue(preset.hue));
  };

  // Sets base tokens, then derives every detected target token from
  // them (e.g. --ts-card-bg <- surface) unless a custom override exists.
  ThemeSelector.prototype._applyPalette = function (pal) {
    var self = this;
    BASE_TOKEN_ORDER.forEach(function (key) {
      self._setVar(BASE_CSS_VAR[key], pal[key]);
    });
    Object.keys(TARGET_DEFS).forEach(function (targetKey) {
      var def = TARGET_DEFS[targetKey];
      Object.keys(def.tokens).forEach(function (tokenKey) {
        var override = self.state.theme === "custom" ? self.state.custom[tokenKey] : null;
        var value = override || pal[def.tokens[tokenKey].from];
        self._setVar("--ts-" + tokenKey, value);
      });
    });
  };

  ThemeSelector.prototype._startRainbow = function () {
    var self = this;
    var lastTime = null;
    var degreesPerSecond = 24;

    function frame(time) {
      if (lastTime === null) lastTime = time;
      var dt = (time - lastTime) / 1000;
      lastTime = time;
      self.rainbowHue = (self.rainbowHue + degreesPerSecond * dt) % 360;
      self._applyPalette(paletteFromHue(self.rainbowHue));
      self.rafId = global.requestAnimationFrame(frame);
    }
    this.rafId = global.requestAnimationFrame(frame);
  };

  ThemeSelector.prototype._stopRainbow = function () {
    if (this.rafId !== null) {
      global.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  function toHexColor(cssColor) {
    // <input type=color> requires #rrggbb. If we're handed an hsl()/name,
    // resolve it via a throwaway element's computed style.
    if (/^#[0-9a-fA-F]{6}$/.test(cssColor)) return cssColor;
    var probe = document.createElement("div");
    probe.style.color = cssColor;
    document.body.appendChild(probe);
    var rgb = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    var m = rgb.match(/\d+/g);
    if (!m) return "#000000";
    return "#" + m.slice(0, 3).map(function (n) {
      var h = parseInt(n, 10).toString(16);
      return h.length === 1 ? "0" + h : h;
    }).join("");
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                            */
  /* ------------------------------------------------------------------ */

  var instance = new ThemeSelector();
  global.ThemeSelector = instance;

  function isManual() {
    var scriptTag = document.currentScript;
    return (
      (scriptTag && scriptTag.getAttribute("data-theme-selector") === "manual") ||
      (document.body && document.body.getAttribute("data-theme-selector") === "manual")
    );
  }

  function autoInit() {
    if (isManual()) return;
    instance.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = instance;
  }
})(typeof window !== "undefined" ? window : this);
