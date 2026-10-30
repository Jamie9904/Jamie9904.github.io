# Structure

```
.
├── index.html               page markup: header, Delivery, Add a pallet, Pallet log, Manifest check, panels, banners
├── styles.css               all CSS: theme tokens, components, phone/tablet/desktop layouts, print rules
├── core.js                  state, persistence, tidying of saved data, table, validation, add flow, undo, library loader and fingerprints (SRI), helpers
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
├── docs/                    this documentation (docs branch only, not on main)
├── DESIGN.md                colours, type, spacing, components, export look
├── README.md
├── _config.yml              GitHub Pages (Jekyll) site settings
├── package.json             test dependencies (Playwright; ExcelJS, jsPDF, jspdf-autotable, pdf.js, pdf-lib, Tesseract.js, ZXing at the app's CDN versions) and `npm test`
├── .mcp.json                Context7 documentation server for Claude Code (development only)
├── .gitignore               keeps `__pycache__/`, `*.pyc` and `node_modules/` out of git
├── tests/
│   ├── run.js               automatic checks (`npm test`)
│   ├── advisories.js        asks osv.dev about security advisories for the pinned libraries
│   ├── advisories-accepted.json  advisories checked and found not to affect the app, with reasons
│   └── sri.js               checks the library fingerprints in core.js against the CDNs
├── .github/workflows/
│   ├── test.yml             runs the checks on every push and pull request (advisories and fingerprints without blocking)
│   └── health.yml           weekly health check of the live site, CDN libraries, advisories, fingerprints and checks
└── .claude/                 Claude Code automations (development only)
    ├── CLAUDE.md            working notes: branches, release steps, user decisions
    ├── settings.json        registers the hooks below
    ├── hooks/
    │   ├── session_start.py fetches every branch, sets the upstream and NODE_PATH, prints a status line
    │   ├── syntax-check.sh  `node --check` after a `.js` file is edited
    │   ├── lpn_git_guard.py commit and push guard (cache bump, docs on main, tests before push)
    │   ├── docs_reminder.py reminds when the docs branch is behind main
    │   └── outputs_reminder.py reminds when the download copy (outputs folder and zip) doesn't match main
    └── agents/              export-reviewer, phone-layout-checker, docs-updater, release-reviewer, security-reviewer
```

## What goes where

| Area | Put here | Keep out |
|---|---|---|
| `index.html` | Static markup and element ids | Inline logic (all behaviour is in the scripts) |
| `styles.css` | All styling; colours via the CSS variables set by `applyTheme()` | Hard-coded colours for themed surfaces |
| `core.js` | Anything other scripts need at load time: state, `save`/`render`, the `clean*` helpers for saved data, the `SRI` map, helpers | Library loading for exports or OCR |
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

`tests/`, `package.json`, `.gitignore`, `.github/`, `.claude/`, `.mcp.json`, `docs/`, `DESIGN.md` and `README.md` are for development only. None of them is loaded by the app or cached by `sw.js`.

- `tests/`, `package.json`, `DESIGN.md` and `README.md` are on `main`, so GitHub Pages publishes them alongside the app.
- `.github/`, `.claude/` and `.mcp.json` are on `main` but not published: Jekyll, which GitHub Pages uses to build the site, leaves out files and folders whose names start with a dot.
- `docs/`, and the version of `README.md` that goes with it, live only on the `docs` branch (`main` has its own `README.md`). Pages publishes from `main`, so they are not on the site. The git guard in `.claude/hooks/lpn_git_guard.py` blocks committing `docs/` files on `main` and merging or pushing `docs` into `main`.
