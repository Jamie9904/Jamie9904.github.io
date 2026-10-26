# Structure

```
.
├── index.html               page markup: header, Delivery, Add a pallet, Pallet log, Manifest check, panels, banners
├── styles.css               all CSS: theme tokens, components, phone/tablet/desktop layouts, print rules
├── core.js                  state, persistence, table, validation, add flow, undo, helpers
├── scan.js                  live and photo barcode scanning, wake lock, input wiring
├── export.js                Excel/PDF builders, print, delivery (download/share/mailto), logo
├── compare.js               manifest check, file readers, OCR, presets, live tracking
├── panels.js                guide, changelog, settings, saved deliveries, backups, install, update banner
├── sw.js                    service worker (offline shell + library cache)
├── manifest.webmanifest     install metadata (name, colours, icons)
├── icon-192.png, icon-512.png, apple-touch-icon.png
├── logo.png                 default logo for the header and exports (optional)
├── presets.json             shared LPN prefix presets (optional)
├── fonts/
│   ├── AtkinsonHyperlegible-{Regular,Bold}.woff2
│   ├── IBMPlexMono-{Regular,Medium,SemiBold}.woff2
│   └── OFL-*.txt            font licences
├── docs/                    this documentation
├── DESIGN.md                colours, type, spacing, components, export look
├── README.md
├── _config.yml              GitHub Pages (Jekyll) site settings
├── package.json             test dependency (Playwright) and `npm test`
├── tests/
│   └── run.js               automatic checks
└── .github/workflows/
    └── test.yml             runs the checks on every push
```

## What goes where

| Area | Put here | Keep out |
|---|---|---|
| `index.html` | Static markup and element ids | Inline logic (all behaviour is in the scripts) |
| `styles.css` | All styling; colours via the CSS variables set by `applyTheme()` | Hard-coded colours for themed surfaces |
| `core.js` | Anything other scripts need at load time: state, `save`/`render`, helpers | Library loading for exports or OCR |
| `scan.js` | Camera and barcode code | Log or export logic beyond calling `tryAdd()` |
| `export.js` | File generation and delivery | Reading files back (that is `compare.js` / `panels.js`) |
| `compare.js` | Everything manifest-related, file readers, OCR | Saved-delivery storage |
| `panels.js` | Side-panel content (Guide, Changelog, Settings, Saved deliveries) and app-wide extras that run last | Code other scripts depend on during their own load |
| `sw.js` | Caching only | App logic |

## Load order and dependencies

`index.html` loads `core.js → scan.js → export.js → compare.js → panels.js` as classic scripts. They share one global scope, so:

- top-level `const`/`let` names must be unique across files;
- a file may call functions from earlier files at load time, and from any file inside event handlers;
- `panels.js` runs last, so it is where startup steps that need everything (initial `updateDel()`, `checkDate()`, service worker registration) live.

## Files the app does not use

`tests/`, `package.json`, `.github/`, `docs/`, `DESIGN.md` and `README.md` are for development only. They are published by GitHub Pages but never loaded by the app or cached by `sw.js`.
