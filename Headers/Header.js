/*!
 * kay-who-codes repo search — embeddable header widget
 * Source of truth: github.com/kay-who-codes/Kay-App-Assets/blob/main/Headers/Header.js
 *
 * Usage (via jsDelivr CDN mirror — recommended, has proper caching/CORS headers):
 *   <div id="kwc-repo-search"></div>
 *   <script src="https://cdn.jsdelivr.net/gh/kay-who-codes/Kay-App-Assets@main/Headers/Header.js"></script>
 *
 * Usage (direct raw file — works immediately, no CDN propagation delay):
 *   <script src="https://raw.githubusercontent.com/kay-who-codes/Kay-App-Assets/main/Headers/Header.js"></script>
 *
 * Optional config before the script tag:
 *   <script>
 *     window.KWC_REPO_SEARCH = { user: "kay-who-codes", mount: "#kwc-repo-search", theme: "dark" };
 *   </script>
 *
 * No dependencies. No build step. Safe to drop into any app.
 */
(function () {
  "use strict";

  var CONFIG = Object.assign(
    {
      user: "kay-who-codes",
      mount: "#kwc-repo-search",
      placeholder: "",
      cacheMinutes: 15,
      maxResults: 8,
      openInNewTab: true,
    },
    window.KWC_REPO_SEARCH || {}
  );

  var CACHE_KEY = "kwc_repos_cache_" + CONFIG.user;
  var root = document.querySelector(CONFIG.mount);
  if (!root) {
    console.warn("[kwc-repo-search] mount point '" + CONFIG.mount + "' not found");
    return;
  }

  // ---------- styles (scoped, injected once) ----------
  if (!document.getElementById("kwc-repo-search-fonts")) {
    var fontLink = document.createElement("link");
    fontLink.id = "kwc-repo-search-fonts";
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap";
    document.head.appendChild(fontLink);
  }

  if (!document.getElementById("kwc-repo-search-style")) {
    var style = document.createElement("style");
    style.id = "kwc-repo-search-style";
    style.textContent = [
      ".kwc-root{--kwc-bg:#0000002b;--kwc-panel:#161d25;--kwc-border:#28313b75;--kwc-text:#dbe2e8;",
      "--kwc-dim:#7c8894;--kwc-accent:#e6a13d;--kwc-accent-dim:#e6a13d33;--kwc-radius:6px;",
      "font-family:'Inter',system-ui,sans-serif;position:relative;max-width:420px;width:100%;",
      "box-sizing:border-box;}",
      ".kwc-root *{box-sizing:border-box;}",
      ".kwc-bar{display:flex;align-items:center;gap:8px;background:var(--kwc-bg);",
      "border:1px solid var(--kwc-border);border-radius:var(--kwc-radius);padding:8px 10px;",
      "transition:border-color .15s ease,box-shadow .15s ease;}",
      ".kwc-bar:focus-within{border-color:#ffffff25;box-shadow:0 0 0 0px var(--kwc-accent-dim);}",
      ".kwc-icon{flex:0 0 auto;color:var(--kwc-dim);display:flex;}",
      ".kwc-input{flex:1 1 auto;background:transparent;border:0;outline:0;color:var(--kwc-text);",
      "font-family:'JetBrains Mono',monospace;font-size:13px;min-width:0;}",
      ".kwc-input::placeholder{color:var(--kwc-dim);}",
      ".kwc-kbd{flex:0 0 auto;color:var(--kwc-dim);font-family:'JetBrains Mono',monospace;",
      "font-size:11px;border:1px solid var(--kwc-border);border-radius:4px;padding:1px 5px;}",
      ".kwc-panel{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--kwc-panel);",
      "border:1px solid var(--kwc-border);border-radius:var(--kwc-radius);overflow:hidden;",
      "max-height:340px;overflow-y:auto;display:none;z-index:9999;",
      "box-shadow:0 12px 28px rgba(0,0,0,.35);}",
      ".kwc-panel.kwc-open{display:block;}",
      ".kwc-row{display:flex;flex-direction:column;gap:2px;padding:9px 12px;cursor:pointer;",
      "border-bottom:1px solid var(--kwc-border);text-decoration:none;}",
      ".kwc-row:last-child{border-bottom:0;}",
      ".kwc-row:hover,.kwc-row.kwc-active{background:#1c2430;}",
      ".kwc-row-top{display:flex;align-items:center;gap:6px;}",
      ".kwc-row-name{color:var(--kwc-text);font-family:'JetBrains Mono',monospace;",
      "font-size:13px;font-weight:500;}",
      ".kwc-row-name mark{background:transparent;color:var(--kwc-accent);font-weight:600;}",
      ".kwc-row-meta{margin-left:auto;display:flex;align-items:center;gap:10px;",
      "color:var(--kwc-dim);font-size:11px;font-family:'JetBrains Mono',monospace;}",
      ".kwc-dot{width:8px;height:8px;border-radius:50%;background:var(--kwc-dim);flex:0 0 auto;}",
      ".kwc-row-desc{color:var(--kwc-dim);font-size:12px;line-height:1.4;",
      "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".kwc-empty,.kwc-status{padding:14px 12px;color:var(--kwc-dim);font-size:12px;",
      "font-family:'Inter',sans-serif;}",
      ".kwc-footer{padding:7px 12px;color:var(--kwc-dim);font-size:11px;",
      "border-top:1px solid var(--kwc-border);font-family:'Inter',sans-serif;}",
    ].join("");
    document.head.appendChild(style);
  }

  // ---------- markup ----------
  root.classList.add("kwc-root");
  root.innerHTML =
    '<div class="kwc-bar">' +
    '<span class="kwc-icon" aria-hidden="true">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
    "</span>" +
    '<input class="kwc-input" type="text" autocomplete="off" spellcheck="false" placeholder="' +
    CONFIG.placeholder +
    '" aria-label="Search ' +
    CONFIG.user +
    '\'s GitHub repositories" />' +
    '<span class="kwc-kbd">/</span>' +
    "</div>" +
    '<div class="kwc-panel" role="listbox"></div>';

  var input = root.querySelector(".kwc-input");
  var panel = root.querySelector(".kwc-panel");

  // "/" focuses the box, like GitHub's own search, unless already typing somewhere
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        input.focus();
      }
    }
    if (e.key === "Escape" && document.activeElement === input) {
      closePanel();
      input.blur();
    }
  });

  document.addEventListener("click", function (e) {
    if (!root.contains(e.target)) closePanel();
  });

  // ---------- data ----------
  var repos = [];
  var loadState = "idle"; // idle | loading | ready | error

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var age = Date.now() - parsed.ts;
      if (age > CONFIG.cacheMinutes * 60 * 1000) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) {
      /* storage unavailable — ignore */
    }
  }

  function loadRepos() {
    var cached = readCache();
    if (cached) {
      repos = cached;
      loadState = "ready";
      return Promise.resolve(cached);
    }
    loadState = "loading";
    return fetch(
      "https://api.github.com/users/" + encodeURIComponent(CONFIG.user) + "/repos?per_page=100&sort=updated",
      { headers: { Accept: "application/vnd.github+json" } }
    )
      .then(function (res) {
        if (!res.ok) throw new Error("GitHub API error " + res.status);
        return res.json();
      })
      .then(function (data) {
        repos = data.map(function (r) {
          return {
            name: r.name,
            full_name: r.full_name,
            description: r.description || "",
            url: r.html_url,
            language: r.language,
            stars: r.stargazers_count,
            updated: r.updated_at,
            fork: r.fork,
          };
        });
        writeCache(repos);
        loadState = "ready";
        return repos;
      })
      .catch(function (err) {
        loadState = "error";
        console.warn("[kwc-repo-search]", err);
        throw err;
      });
  }

  // ---------- search ----------
  function search(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return repos
      .map(function (r) {
        var name = r.name.toLowerCase();
        var desc = (r.description || "").toLowerCase();
        var score = -1;
        if (name === q) score = 100;
        else if (name.indexOf(q) === 0) score = 80;
        else if (name.indexOf(q) !== -1) score = 60;
        else if (desc.indexOf(q) !== -1) score = 20;
        return { repo: r, score: score };
      })
      .filter(function (x) {
        return x.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, CONFIG.maxResults)
      .map(function (x) {
        return x.repo;
      });
  }

  function highlight(text, query) {
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      "<mark>" +
      escapeHtml(text.slice(idx, idx + query.length)) +
      "</mark>" +
      escapeHtml(text.slice(idx + query.length))
    );
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- rendering ----------
  var activeIndex = -1;
  var currentResults = [];

  function openPanel() {
    panel.classList.add("kwc-open");
  }
  function closePanel() {
    panel.classList.remove("kwc-open");
    activeIndex = -1;
  }

  function renderStatus(msg) {
    panel.innerHTML = '<div class="kwc-status">' + msg + "</div>";
    openPanel();
  }

  function renderResults(query, results) {
    currentResults = results;
    activeIndex = -1;
    if (results.length === 0) {
      panel.innerHTML =
        '<div class="kwc-empty">No repos match “' + escapeHtml(query) + '”.</div>';
      openPanel();
      return;
    }
    var rows = results
      .map(function (r, i) {
        var meta =
          '<span class="kwc-row-meta">' +
          (r.language
            ? '<span style="display:flex;align-items:center;gap:4px;"><span class="kwc-dot"></span>' +
              escapeHtml(r.language) +
              "</span>"
            : "") +
          "<span>★ " +
          (r.stars || 0) +
          "</span>" +
          "</span>";
        return (
          '<a class="kwc-row" data-index="' +
          i +
          '" href="' +
          r.url +
          '" role="option">' +
          '<span class="kwc-row-top"><span class="kwc-row-name">' +
          highlight(r.name, query) +
          "</span>" +
          meta +
          "</span>" +
          (r.description
            ? '<span class="kwc-row-desc">' + escapeHtml(r.description) + "</span>"
            : "") +
          "</a>"
        );
      })
      .join("");
    panel.innerHTML =
      rows +
      '<div class="kwc-footer">' +
      results.length +
      " match" +
      (results.length === 1 ? "" : "es") +
      " · ↑↓ to navigate · ↵ to open</div>";
    openPanel();
  }

  function setActive(i) {
    var rows = panel.querySelectorAll(".kwc-row");
    rows.forEach(function (row) {
      row.classList.remove("kwc-active");
    });
    if (i >= 0 && rows[i]) {
      rows[i].classList.add("kwc-active");
      rows[i].scrollIntoView({ block: "nearest" });
    }
    activeIndex = i;
  }

  function navigateTo(repo) {
    if (CONFIG.openInNewTab) {
      window.open(repo.url, "_blank", "noopener");
    } else {
      window.location.href = repo.url;
    }
  }

  // ---------- events ----------
  input.addEventListener("focus", function () {
    if (loadState === "idle") {
      renderStatus("Loading repos…");
      loadRepos()
        .then(function () {
          if (input.value.trim()) {
            renderResults(input.value, search(input.value));
          } else {
            closePanel();
          }
        })
        .catch(function () {
          renderStatus("Couldn't load repos right now. Try again shortly.");
        });
    }
  });

  input.addEventListener("input", function () {
    var q = input.value;
    if (!q.trim()) {
      closePanel();
      return;
    }
    if (loadState === "ready") {
      renderResults(q, search(q));
    } else if (loadState === "loading") {
      renderStatus("Loading repos…");
    } else if (loadState === "error") {
      renderStatus("Couldn't load repos. Reload the page to retry.");
    }
  });

  input.addEventListener("keydown", function (e) {
    if (!panel.classList.contains("kwc-open") || currentResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, currentResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      var pick = currentResults[activeIndex >= 0 ? activeIndex : 0];
      if (pick) navigateTo(pick);
    }
  });

  panel.addEventListener("click", function (e) {
    var row = e.target.closest(".kwc-row");
    if (!row) return;
    e.preventDefault();
    var repo = currentResults[Number(row.getAttribute("data-index"))];
    if (repo) navigateTo(repo);
  });
})();
