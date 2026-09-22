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
  modals) — **detected automatically**, with no markup changes required.

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

### Automatically detected target elements

No markup changes are required. On load — and again every time the panel
opens, so async-rendered content is picked up too — the library scans the
DOM for common conventions and tags whatever it finds, wiring each match to
the matching `--ts-*` variables via an injected stylesheet:

| Target | Detected via | CSS vars applied |
|---|---|---|
| **Cards** | `.card`, `.Card`, `.MuiCard-root`, `.MuiPaper-root`, `.ant-card`, `.chakra-card`, `[class*="card"]`, or — only if nothing else matched — any element that *looks* card-like (rounded corners or a shadow, real padding, reasonable size) | `--ts-card-bg`, `--ts-card-border` |
| **Buttons** | `<button>`, `[role="button"]`, `.btn`, `.button`, Bootstrap/MUI/Ant/Chakra button classes | `--ts-button-bg`, `--ts-button-text` |
| **Navigation** | `<nav>`, `[role="navigation"]`, `.navbar`, `.nav`, `.sidebar`, MUI AppBar, Ant Menu | `--ts-nav-bg`, `--ts-nav-text` |
| **Inputs** | `<input>`, `<select>`, `<textarea>`, `[contenteditable="true"]`, `.form-control`, MUI/Ant/Chakra input classes | `--ts-input-bg`, `--ts-input-border` |
| **Links** | `<a href="...">` | `--ts-link` |
| **Badges** | `.badge`, `.chip`, `.tag`, MUI Chip, Ant Tag, Chakra badge | `--ts-badge-bg`, `--ts-badge-text` |
| **Modals** | `[role="dialog"]`, `<dialog>`, `.modal`, `.dialog`, MUI Dialog, Ant Modal | `--ts-modal-bg` |

If your app has no cards, the "Cards" group simply won't appear under the
Custom theme.

**Manual override / opt-out**, for the rare case the heuristics guess wrong:

```html
<div data-theme-target="card">...</div>   <!-- force-include as a card -->
<div data-theme-target="none">...</div>   <!-- exclude from all heuristics -->
<div data-theme-ignore>...</div>          <!-- same, alternate syntax -->
```

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

## License

MIT
