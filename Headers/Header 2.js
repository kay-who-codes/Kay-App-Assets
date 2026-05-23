<!-- ═ SCRIPT ═ -->
<script>
(function () {
  'use strict';

  /* ── Language colour map (subset) ────────────────────── */
  const LANG_COLORS = {
    JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5',
    HTML:'#e34c26', CSS:'#563d7c', SCSS:'#c6538c', Rust:'#dea584',
    Go:'#00ADD8', Java:'#b07219', 'C#':'#178600', C:'#555555',
    'C++':'#f34b7d', PHP:'#4F5D95', Ruby:'#701516', Swift:'#F05138',
    Kotlin:'#A97BFF', Dart:'#00B4AB', Shell:'#89e051', Vue:'#41b883',
    Svelte:'#ff3e00', Nix:'#7e7eff', Haskell:'#5e5086',
  };

  /* ── State ────────────────────────────────────────────── */
  let allRepos = [];
  let activeIndex = -1;
  let fetchTimer = null;

  /* ── DOM refs ─────────────────────────────────────────── */
  const input      = document.getElementById('gh-search-input');
  const dropdown   = document.getElementById('gh-search-dropdown');
  const loader     = document.getElementById('gh-search-loader');
  const usernameLabel = document.getElementById('gh-username-label');
  const avatarImg  = document.getElementById('gh-avatar-img');
  const avatarInitials = document.getElementById('gh-avatar-initials');

  /* ── Public API ───────────────────────────────────────── */
  window.GHSearchHeader = {
    /**
     * Initialise the header.
     * @param {Object} opts
     * @param {string} opts.username   - GitHub username (required)
     * @param {string} [opts.token]    - Personal access token (recommended to avoid rate limits)
     * @param {number} [opts.maxRepos] - Maximum repos to fetch (default 200)
     */
    init(opts = {}) {
      if (!opts.username) { console.warn('[GHSearchHeader] No username provided.'); return; }
      this.kay-who-codes = opts.username;
      this._token    = opts.token || null;
      this._maxRepos = opts.maxRepos || 20;

      usernameLabel.textContent = opts.username;

      /* Load avatar */
      const avatarSrc = `https://avatars.githubusercontent.com/${encodeURIComponent(opts.username)}`;
      avatarImg.onload = () => {
        avatarImg.classList.add('loaded');
        avatarInitials.style.display = 'none';
      };
      avatarImg.onerror = () => { avatarInitials.textContent = opts.username.slice(0,2).toUpperCase(); };
      avatarImg.src = avatarSrc;
      avatarInitials.textContent = opts.username.slice(0,2).toUpperCase();

      _fetchRepos(opts.username, this._token, this._maxRepos);
    }
  };

  /* ── Fetch all repos ──────────────────────────────────── */
  async function _fetchRepos(username, token, maxRepos) {
    loader.classList.add('active');

    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let page = 1;
    const perPage = 100;
    allRepos = [];

    try {
      while (allRepos.length < maxRepos) {
        const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&sort=updated`;
        const res = await fetch(url, { headers });
        if (!res.ok) { console.error('[GHSearchHeader] GitHub API error:', res.status); break; }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allRepos = allRepos.concat(data);
        if (data.length < perPage) break;
        page++;
      }
      allRepos = allRepos.slice(0, maxRepos);
    } catch (e) {
      console.error('[GHSearchHeader] Fetch failed:', e);
    }

    loader.classList.remove('active');
  }

  /* ── Search / filter ──────────────────────────────────── */
  function _search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allRepos.filter(repo => {
      const name   = (repo.name || '').toLowerCase();
      const desc   = (repo.description || '').toLowerCase();
      const topics = (repo.topics || []).map(t => t.toLowerCase());

      /* Invisible tag field — repos can carry custom tags via their "topics" array
         on GitHub. Any topic that starts with "tag:" is treated as a hidden alias.
         Example: a repo with topic "tag:dashboard" will surface on "dashboard" search
         even if the repo is not named that. */
      const hiddenTags = topics
        .filter(t => t.startsWith('tag:'))
        .map(t => t.slice(4));

      return (
        name.includes(q) ||
        desc.includes(q) ||
        topics.some(t => t.includes(q)) ||
        hiddenTags.some(t => t.includes(q))
      );
    });
  }

  /* ── Highlight matched text ───────────────────────────── */
  function _highlight(text, query) {
    if (!query) return _esc(text);
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return _esc(text).replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
  }

  /* ── Escape HTML ──────────────────────────────────────── */
  function _esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Render dropdown ──────────────────────────────────── */
  function _render(results, query) {
    dropdown.innerHTML = '';
    activeIndex = -1;

    if (!query.trim()) { dropdown.classList.remove('open'); input.setAttribute('aria-expanded','false'); return; }

    if (results.length === 0) {
      dropdown.innerHTML = `<p class="dropdown-status">No repositories match "<strong>${_esc(query)}</strong>"</p>`;
      dropdown.classList.add('open');
      input.setAttribute('aria-expanded','true');
      return;
    }

    const label = document.createElement('p');
    label.className = 'dropdown-section-label';
    label.textContent = `${results.length} repositor${results.length === 1 ? 'y' : 'ies'}`;
    dropdown.appendChild(label);

    results.forEach((repo, i) => {
      const langColor = LANG_COLORS[repo.language] || '#8b949e';
      const isPrivate = repo.private;

      const item = document.createElement('a');
      item.className = 'repo-item';
      item.setAttribute('role','option');
      item.setAttribute('aria-selected','false');
      item.href = repo.html_url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      item.dataset.index = i;

      item.innerHTML = `
        <svg class="repo-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
        </svg>
        <div class="repo-item-body">
          <div class="repo-item-name">${_highlight(repo.full_name, query)}</div>
          ${repo.description ? `<div class="repo-item-desc">${_esc(repo.description)}</div>` : ''}
          <!-- invisible tags stored in topics — never displayed to user -->
          <span class="repo-tags" aria-hidden="true">${_esc((repo.topics||[]).join(' '))}</span>
        </div>
        <div class="repo-item-meta">
          ${isPrivate ? `<span class="repo-private-badge">Private</span>` : ''}
          ${repo.language ? `
            <span class="repo-lang-dot" style="background:${langColor}" aria-hidden="true"></span>
            <span class="repo-lang-label">${_esc(repo.language)}</span>
          ` : ''}
        </div>
      `;

      item.addEventListener('mouseenter', () => { _setActive(i); });
      dropdown.appendChild(item);
    });

    dropdown.classList.add('open');
    input.setAttribute('aria-expanded','true');
  }

  /* ── Keyboard navigation ──────────────────────────────── */
  function _setActive(idx) {
    const items = dropdown.querySelectorAll('.repo-item');
    items.forEach((el, i) => {
      el.classList.toggle('active', i === idx);
      el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
    activeIndex = idx;
  }

  /* ── Close dropdown ───────────────────────────────────── */
  function _close() {
    dropdown.classList.remove('open');
    input.setAttribute('aria-expanded','false');
    activeIndex = -1;
  }

  /* ── Input handler ────────────────────────────────────── */
  input.addEventListener('input', () => {
    clearTimeout(fetchTimer);
    const q = input.value;
    if (!q.trim()) { _close(); return; }

    /* Debounce render slightly for typing feel */
    fetchTimer = setTimeout(() => {
      const results = _search(q);
      _render(results, q);
    }, 60);
  });

  /* ── Keyboard nav ─────────────────────────────────────── */
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.repo-item');
    const count = items.length;
    if (!dropdown.classList.contains('open') || count === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _setActive(Math.min(activeIndex + 1, count - 1));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _setActive(Math.max(activeIndex - 1, 0));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      _close();
      input.blur();
    }
  });

  /* ── Click outside closes dropdown ───────────────────── */
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) _close();
  });

  /* ── Auto-init if data-username is on script tag ─────── */
  document.querySelectorAll('script[data-gh-username]').forEach(s => {
    const username = s.getAttribute('data-gh-username');
    const token    = s.getAttribute('data-gh-token') || null;
    if (username) GHSearchHeader.init({ username, token });
  });

})();
</script>
