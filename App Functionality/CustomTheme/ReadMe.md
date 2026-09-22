# theme-selector

A dependency-free, drop-in theme picker for any web app. Adds a cog button
(top right) that opens a panel with theme swatches — **Monochrome, Red,
Orange, Yellow, Green, Cyan, Blue, Purple, Pink, Rainbow (animated),** and
**Custom**.

- Zero dependencies, plain JS + CSS custom properties.
- Works with any framework (or none) since it just sets `:root` CSS variables.
- Persists the chosen theme in `localStorage`.
- The **Custom** theme only shows customization controls for UI regions that
  actually exist in the page (cards, buttons, nav, inputs, links, badges,
  modals) — detected automatically via `data-theme-target` attributes.

## Install

**Via CDN / GitHub raw / jsDelivr**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOUR_ORG/theme-selector@latest/theme-selector.css">
<script src="https://cdn.jsdelivr.net/gh/YOUR_ORG/theme-selector@latest/theme-selector.js"></script>
```

**Or copy the files** (`theme-selector.js`, `theme-selector.css`) into your project and reference them locally.

That's it — the cog button appears automatically on page load.

## Making your app themeable

Reference the CSS variables anywhere in your own stylesheet:

```css
body { background: var(--ts-bg); color: var(--ts-text); }
.card { background: var(--ts-card-bg); border: 1px solid var(--ts-card-border); }
.btn-primary { background: var(--ts-button-bg); color: var(--ts-button-text); }
```

Or use the small set of bundled utility classes: `.ts-themed-bg`,
`.ts-themed-surface`, `.ts-themed-text`, `.ts-themed-muted`,
`.ts-themed-primary`, `.ts-themed-border`.

### Base tokens (always available)

| Variable | Purpose |
|---|---|
| `--ts-bg` | Page background |
| `--ts-surface` | Panels / secondary surfaces |
| `--ts-text` | Primary text |
| `--ts-text-muted` | Secondary text |
| `--ts-primary` | Brand / primary action color |
| `--ts-primary-contrast` | Text color on top of `--ts-primary` |
| `--ts-accent` | Accent color |
| `--ts-border` | Borders / dividers |

### Opt-in target tokens

Tag elements so the library knows they exist, and it will both auto-theme
them relative to the base palette **and** expose a matching group of pickers
under the Custom theme — only if at least one matching element is found on
the page.

```html
<div data-theme-target="card">...</div>        <!-- --ts-card-bg, --ts-card-border -->
<button data-theme-target="button">...</button> <!-- --ts-button-bg, --ts-button-text -->
<nav data-theme-target="nav">...</nav>          <!-- --ts-nav-bg, --ts-nav-text -->
<input data-theme-target="input">               <!-- --ts-input-bg, --ts-input-border -->
<a data-theme-target="link">...</a>             <!-- --ts-link -->
<span data-theme-target="badge">...</span>      <!-- --ts-badge-bg, --ts-badge-text -->
<div data-theme-target="modal">...</div>        <!-- --ts-modal-bg -->
```

No `data-theme-target="card"` anywhere on the page? The "Cards" section
simply won't appear in the Custom panel. The library re-scans the DOM every
time the panel is opened, so elements added dynamically (e.g. cards loaded
after a fetch) are picked up on the next open.

## Manual init

By default the module auto-initializes on `DOMContentLoaded`. To control
timing yourself (e.g. wait until your app's shell has rendered):

```html
<script src="theme-selector.js" data-theme-selector="manual"></script>
<script>
  // whenever you're ready:
  window.ThemeSelector.init();
</script>
```

## API

`window.ThemeSelector` (also the CommonJS export) exposes:

- `.init()` — builds the UI and applies the persisted/default theme. Safe to call once; subsequent calls are no-ops.
- `.setTheme(id)` — programmatically switch theme. `id` is one of: `monochrome`, `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`, `rainbow`, `custom`.

## Persistence

The selected theme (and any custom color overrides) is saved to
`localStorage` under the key `ts-theme-state` and restored on the next
page load. If `localStorage` is unavailable (e.g. private browsing with
storage blocked), the library degrades gracefully to session-only state.

## Browser support

Uses CSS custom properties, `requestAnimationFrame`, and `<input type="color">` —
supported in all modern evergreen browsers.

