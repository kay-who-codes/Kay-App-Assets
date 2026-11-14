/*!
 * room-seeder.js
 * Dependency-free "room code" toolkit for any app where several devices must agree on the
 * same random-looking content without a server: the same room code gives the same results everywhere.
 *
 * Works as a plain <script> (global RoomSeeder), CommonJS (require) or via a bundler.
 *
 * WHAT IT GIVES YOU
 *   1. Room codes ........ randomCode, cleanCode, isValidCode, normalize
 *   2. Seeded randomness . rng, int, pick, shuffle, deck, sample
 *   3. Check codes ....... fingerprint (compare out loud), checksum (typo detection)
 *   4. Shareable results . sign, verify, slug
 *   5. Room links ........ hashBuild, hashParse, shareBase, watchHash
 *   6. QR codes .......... renderQr (uses a qrcode.js you already load; this file does not include one)
 *   7. Helpers ........... room (bundle of the above for one code), copyText
 *
 * QUICK START
 *   const code = RoomSeeder.randomCode();                       // "K7M2QP"
 *   const order = RoomSeeder.deck(["a","b","c","d"], code, "round1");   // same order on every device
 *   const check = RoomSeeder.fingerprint(order);                // "4F9A", players compare this
 *
 *   // Several independent streams from one code:
 *   const r = RoomSeeder.room(code, "myapp");
 *   r.int("dice", 1, 6);  r.pick("colour", ["red","blue"]);  r.deck(items, "level2");
 *
 *   // Shareable link and QR (the link survives in a #hash made of letters, digits and hyphens):
 *   const url = RoomSeeder.shareBase() + "#" + RoomSeeder.hashBuild("room", code, ["hard"]);  // ...#room-K7M2QP-hard
 *   RoomSeeder.renderQr(document.getElementById("qr"), url);
 *   const w = RoomSeeder.watchHash("room", ({ code, values }) => joinRoom(code, values[0]));
 *   w.set(code, ["hard"]);
 *
 *   // Compare scores between devices without a server:
 *   const result = RoomSeeder.sign(["MYAPP", code, "Sam", 420]);   // "MYAPP.K7M2QP.Sam.420.3KQ1"
 *   RoomSeeder.verify(result);                                      // ["MYAPP","K7M2QP","Sam","420"] or null
 *
 * RULES FOR IDENTICAL RESULTS ON EVERY DEVICE
 *   - Everything that feeds a seed (code, salt, item list) must be identical. deck() sorts and de-duplicates
 *     the list first, so the order you wrote it in never matters. Items should be strings or numbers.
 *   - Do not use Math.random() for anything that must match. Use rng() and friends.
 *   - Check codes and signed results are for typo detection and honest play only. They are not secure.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoomSeeder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- hashing and PRNG ---------- */

  // string -> 32-bit hash generator
  function xmur3(s) {
    var h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  // seeded PRNG, returns floats in [0, 1)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- room codes ---------- */

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, easy to read aloud

  // codes are case/space-insensitive
  function normalize(c) {
    return String(c || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  // New random code. Uses Math.random on purpose: the code is the seed, it is not derived from one.
  function randomCode(length, alphabet) {
    var n = length || 6, a = alphabet || CODE_ALPHABET, s = '';
    for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  // Strip anything that cannot live in a link, upper-case it, cap the length. Handy for input fields.
  function cleanCode(input, maxLength) {
    return String(input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLength || 12);
  }

  function isValidCode(input, minLength, maxLength) {
    var c = String(input || '');
    return /^[A-Za-z0-9]+$/.test(c) && c.length >= (minLength || 4) && c.length <= (maxLength || 12);
  }

  /* ---------- seeded randomness ---------- */

  // Seeded random stream for one purpose inside a room (code + tag => same stream everywhere).
  function rng(code, tag) {
    return mulberry32(xmur3(normalize(code) + '|' + tag)());
  }

  // Whole number between min and max (inclusive) from a stream.
  function int(rnd, min, max) {
    return min + Math.floor(rnd() * (max - min + 1));
  }

  // One item of a list from a stream.
  function pick(rnd, list) {
    return list[Math.floor(rnd() * list.length)];
  }

  // Fisher-Yates shuffle driven by a stream. Returns a new array.
  function shuffle(list, rnd) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Deterministic shuffled deck for a given code + salt. The list is de-duplicated and sorted first,
  // so the order of the source list can never cause a mismatch. (The salt is often a round or level name.)
  function deck(items, code, salt) {
    var a = Array.from(new Set(items)).sort();
    var rnd = mulberry32(xmur3(normalize(code) + '|round' + salt)());
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // First `count` items of the deck.
  function sample(items, count, code, salt) {
    return deck(items, code, salt).slice(0, count);
  }

  /* ---------- check codes ---------- */

  // Short check-code all players can compare out loud. Pass the list everyone should share.
  function fingerprint(list) {
    return xmur3(list.slice(0, 8).join(','))().toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  }

  // Short checksum used to catch typos in shared text.
  function checksum(text) {
    return fingerprint([String(text)]);
  }

  /* ---------- shareable results ---------- */

  // Make a value safe to use as one part of a signed code (letters, digits and underscores only).
  function slug(value, maxLength) {
    return String(value == null ? '' : value).replace(/[^A-Za-z0-9_]/g, '').slice(0, maxLength || 16);
  }

  // parts -> "a.b.c.CHK". Parts must not contain the separator (use slug() on free text).
  function sign(parts, sep) {
    var s = sep || '.';
    var body = parts.map(String).join(s);
    return body + s + checksum(body);
  }

  // "a.b.c.CHK" -> ["a","b","c"] when the checksum matches, otherwise null.
  function verify(text, sep) {
    var s = sep || '.';
    var all = String(text || '').trim().split(s);
    if (all.length < 2) return null;
    var chk = all.pop();
    return checksum(all.join(s)) === chk ? all : null;
  }

  /* ---------- room links (hash based) ---------- */
  // Format:  #prefix-CODE-value1-value2   Only letters, digits and hyphens are used, so it
  // survives places that only pass a plain #name through (embedded pages, share links, QR codes).

  var TOKEN = /^[A-Za-z0-9]+$/;

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function hashBuild(prefix, code, values) {
    var parts = [String(code).toUpperCase()].concat((values || []).map(String));
    parts.forEach(function (p) {
      if (!TOKEN.test(p)) throw new Error('room-seeder: "' + p + '" can only contain letters and digits');
    });
    return prefix + '-' + parts.join('-');
  }

  // "#sync-K7M2QP-hard" -> { code: "K7M2QP", values: ["hard"] } or null
  function hashParse(hash, prefix) {
    var re = new RegExp('^#?' + escapeRe(prefix) + '-([A-Za-z0-9]{3,16})((?:-[A-Za-z0-9]+)*)$');
    var m = re.exec(String(hash || ''));
    if (!m) return null;
    return { code: m[1].toUpperCase(), values: m[2] ? m[2].slice(1).split('-') : [] };
  }

  // Address to put in front of the #hash. On your own site that is this page. Inside a host you
  // cannot share directly (set avoidHosts), the fallback address is used instead.
  function shareBase(options) {
    var o = options || {};
    var loc = typeof window !== 'undefined' ? window.location : null;
    if (!loc) return o.fallback || '';
    var web = loc.protocol === 'http:' || loc.protocol === 'https:';
    var avoid = o.avoidHosts || /(^|\.)claude(usercontent)?\.(ai|com)$/i;
    if (web && !avoid.test(loc.hostname)) return loc.origin + loc.pathname;
    return o.fallback || (web ? loc.origin + loc.pathname : '');
  }

  // Keep the page address and an app's room in step, in both directions.
  //   onRoom({ code, values }) runs for the current hash right away (call .apply()) and whenever
  //   someone opens or pastes a different room link. Changes made by .set() do not call it.
  function watchHash(prefix, onRoom, win) {
    win = win || (typeof window !== 'undefined' ? window : null);
    if (!win) return null;
    var self = false;
    function apply() {
      var r = hashParse(win.location.hash, prefix);
      if (r) onRoom(r);
    }
    function onChange() {
      if (self) { self = false; return; }
      apply();
    }
    win.addEventListener('hashchange', onChange);
    return {
      apply: apply,
      set: function (code, values) {
        try {
          var h = hashBuild(prefix, code, values);
          if (win.location.hash !== '#' + h) { self = true; win.location.hash = h; }
          return true;
        } catch (e) { self = false; return false; }
      },
      clear: function () {
        try {
          if (win.location.hash) win.history.replaceState(null, '', win.location.pathname + win.location.search);
        } catch (e) {
          try { win.location.hash = ''; } catch (e2) {}
        }
      },
      stop: function () { win.removeEventListener('hashchange', onChange); }
    };
  }

  /* ---------- QR codes ---------- */

  // Draws a QR code for `text` inside `el` using whichever QR library the page has loaded:
  //   - qrcode.js (new QRCode(el, {...}))   - qrcode-generator (qrcode(0, "M"))   - npm "qrcode" (QRCode.toCanvas)
  // Returns true when something was drawn. Dark-on-white is forced so it scans in dark themes.
  function renderQr(el, text, options) {
    var o = options || {}, size = o.size || 200, dark = o.dark || '#000000', light = o.light || '#ffffff';
    el.textContent = '';
    try {
      if (typeof QRCode === 'function') {
        new QRCode(el, {
          text: text, width: size, height: size, colorDark: dark, colorLight: light,
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel[o.level || 'M'] : undefined
        });
        return true;
      }
      if (typeof qrcode === 'function') {
        var qr = qrcode(0, o.level || 'M');
        qr.addData(text);
        qr.make();
        var img = document.createElement('img');
        img.src = qr.createDataURL(6, 0);
        img.width = size; img.height = size; img.alt = '';
        img.style.imageRendering = 'pixelated';
        el.appendChild(img);
        return true;
      }
      if (typeof QRCode === 'object' && QRCode && QRCode.toCanvas) {
        var canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, text, { width: size, margin: 0, color: { dark: dark, light: light } });
        el.appendChild(canvas);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------- helpers ---------- */

  // Copy text to the clipboard. Resolves true on success. If it fails and `fallbackInput` is given,
  // that input is focused and selected so the person can press copy themselves.
  function copyText(text, fallbackInput) {
    var done = function () { return true; };
    var fail = function () {
      if (fallbackInput) { fallbackInput.focus(); fallbackInput.select(); }
      return false;
    };
    try {
      return navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      return Promise.resolve(fail());
    }
  }

  // Everything above, bound to one room code. `namespace` keeps different apps (or features) from
  // accidentally producing the same stream for the same code.
  function room(code, namespace) {
    var c = normalize(code);
    var ns = namespace ? namespace + '|' : '';
    return {
      code: c,
      display: c.toUpperCase(),
      rng: function (tag) { return rng(c, ns + tag); },
      int: function (tag, min, max) { return int(rng(c, ns + tag), min, max); },
      pick: function (tag, list) { return pick(rng(c, ns + tag), list); },
      shuffle: function (list, tag) { return shuffle(list, rng(c, ns + tag)); },
      deck: function (items, tag) { return deck(items, c, ns + tag); },
      sample: function (items, count, tag) { return sample(items, count, c, ns + tag); },
      fingerprint: fingerprint
    };
  }

  return {
    // codes
    randomCode: randomCode, cleanCode: cleanCode, isValidCode: isValidCode, normalize: normalize,
    // seeded randomness
    xmur3: xmur3, mulberry32: mulberry32, rng: rng, int: int, pick: pick, shuffle: shuffle,
    deck: deck, sample: sample,
    // check codes
    fingerprint: fingerprint, checksum: checksum,
    // shareable results
    slug: slug, sign: sign, verify: verify,
    // links and QR
    hashBuild: hashBuild, hashParse: hashParse, shareBase: shareBase, watchHash: watchHash, renderQr: renderQr,
    // helpers
    copyText: copyText, room: room
  };
});
