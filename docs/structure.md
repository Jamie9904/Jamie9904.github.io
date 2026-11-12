# Structure

```
.
├── config.js                site settings (build 53): `window.LPN_CONFIG` with `features` (switch a feature off for everyone) and `testing` (add an "in testing" note); loaded before core.js, in the offline shell
├── index.html               page markup: header, Delivery, Add a pallet, Pallet log, Manifest check, panels, report box, install box, banners
├── styles.css               all CSS: theme tokens, components, phone/tablet/desktop layouts, print rules
├── core.js                  site settings (`FEATURES`, `SITE`, `feat()`, `testNote()`, `siteHtml()`), state, persistence, tidying of saved data, table, validation, add flow, undo (the last 10 changes since build 62), received-pallet counts (`typeCounts()`, leaving out refused pallets; the type and FSDU totals are filter buttons since build 66), `mergePallets()` (adds pallets from another phone, build 66), library loader and fingerprints (SRI), helpers
├── qr.js                    QR code maker for Share log (build 66): `QR.encode(text)` and `QR.svg(text)`, byte mode, error correction level M, versions 1 to 20, no outside library; in the offline shell
├── scan.js                  live and photo barcode scanning (Scan by photo and, since build 64, Upload photo, which also reads the printed LPN when a photo has no readable barcode), camera request (resolution, focus), Torch and Zoom buttons, wake lock (Live scan, and Keep the screen on since build 62), reading another phone's Share log codes (`qrPart()`, build 66), input wiring
├── export.js                Excel/PDF builders (titles with the site name since build 62), the blank tally sheet (`buildTallyPdf()`, build 66), print, delivery (download/share/mailto), logo
├── compare.js               manifest check, file readers, OCR, presets, live tracking
├── panels.js                guide, changelog, settings, `applySite()` (hides switched-off features), report a problem or idea (with its offline queue), saved deliveries, backups, install, update banner, reminder about a delivery not exported (`unexpCheck()`, build 62), Share log panel and its QR codes (`qrCodesFor()`, `initPhones()`, build 66), the phone's Back button closing dialogs (`backOpen()`/`backClose()`, build 66) and the ↓ Latest button (build 66)
├── sw.js                    service worker (offline shell + library cache)
├── manifest.webmanifest     install metadata (name, colours, icons)
├── icon-192.png, icon-512.png, apple-touch-icon.png
├── logo.png                 default logo for the header and exports (optional)
├── presets.json             shared LPN prefix presets (optional)
├── media/
│   ├── demo.mp4             narrated demo video for the Guide (720×1280, about 47 seconds, about 1.7 MB; re-recorded for v4.0 in build 52, again in build 59 to show the Report a problem button, in build 65 to show the four-button scan row, and in build 66 to show Share log, the four-item Export menu, the totals and ↓ Latest; loaded only when tapped, not cached)
│   ├── demo-poster.jpg      still picture shown before the video plays
│   ├── history.mp4          narrated build history video for the top of the Changelog (build 65; 1280×720, about 66 seconds, about 2.8 MB; loaded only when tapped, not cached)
│   ├── history-poster.jpg   still picture shown before it plays (the last frame)
│   └── share-qr.svg         QR code for Settings → Share this app (opens https://jamie9904.github.io/; in the offline shell, build 50)
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
│   ├── run.js               the runner for the automatic checks (`npm test`): starts the server and browser, runs every file in groups/ in name order, prints the totals
│   ├── lib.js               shared helpers for the checks: serve(), check(), page(), EXCEL_STUB, LIBS / libFile() / REAL_LIBS, file types (TYPES), counts()
│   ├── groups/              the checks, one self-contained file per area (since build 52)
│   │   ├── 01-layout.js … 06-real-export.js     layout; phone flows and Settings; Excel export; version note, PDF safety and spreadsheet import; saved data from outside and fingerprints; real export libraries and library versions
│   │   ├── 07-security-policy.js … 12-report.js security policy; demo video and the Changelog's build history video (build 65); manifest photos and problem report; accessibility; feedback Worker; Report a problem or idea
│   │   └── 13-photo-notes.js … 23-offline.js    photo notes; Find an LPN and turned photos; damaged pallets and Share this app; welcome card; offline store; real photo reading (GitHub only); site settings (config.js, build 53); pallets with no LPN and FPP descriptions (20-no-lpn.js, builds 55 and 56); data saved by older builds (21-old-data.js, after build 55); refused pallets, the reminder about a delivery not exported and the site name on exports (22-refused-reminder-site.js, build 62; Scan by photo reading the printed LPN added in build 63, moved to Upload photo in build 64; Read the printed LPN and several photos in build 65); Share log and the blank tally sheet (225-two-phones-tally.js, build 66); Back button, no pull-to-refresh, totals as filters and ↓ Latest (226-small-touches.js, build 66); offline (23-offline.js since build 62). The runner sorts names as text, so 225- and 226- run after 22- and before 23-offline.js
│   ├── fixtures/old/build-N/  files saved by builds 19, 30, 46, 49, 54 and 64 (build 64 since build 65) with their own code: storage.json, backup.json, cells.json, keywords.txt, log.xlsx, log.pdf, expect.json (read by groups/21-old-data.js)
│   ├── advisories.js        asks osv.dev about security advisories for the pinned libraries
│   ├── advisories-accepted.json  advisories checked and found not to affect the app, with reasons
│   └── sri.js               checks the library fingerprints in core.js against the CDNs
├── tools/demo-video/        recorder for the Guide demo video (development only, see below)
│   ├── make.sh              one command: voice, recording, render, web copy, poster, screen fingerprint and check frames
│   ├── lines.json           the spoken line for each scene
│   ├── voice.py             speaks the lines offline; since build 65 it takes a folder (python3 voice.py <folder>) and reads that folder's lines.json and writes its out/, which tools/history-video uses (Kokoro "Heart" voice through sherpa-onnx, downloaded once into ~/.cache/lpn-voice)
│   ├── stage.html           the 1080×1920 stage: headline, phone frame with the live app, subtitles, cards
│   ├── record.mjs           serves the repository locally, drives the app scene by scene (SCENES) with Playwright and records frames (en-GB locale and browser language; a drawn barcode label stands in for the Live scan camera)
│   ├── render.py            joins the frames with the narration; adds music and sound effects only when SFX_DIR is set
│   ├── screens.js           fingerprint of the key screens the video shows (npm test compares; --write saves it)
│   ├── screens.json         the saved fingerprint, rewritten by make.sh after each recording
│   ├── README.md            how to re-record
│   └── .gitignore           keeps the working folder out/ out of git
├── tools/history-video/     recorder for the Changelog's build history video (development only, build 65)
│   ├── make.sh              one command: voice (../demo-video/voice.py on this folder), capture, render, then the web copy media/history.mp4 (1280×720) and its poster
│   ├── lines.json           the spoken line for each scene (an intro and one per milestone build)
│   ├── capture.js           takes each milestone build (13, 19, 23, 34, 44, 49, 52, 56, 62, 65) from git history (git archive), runs it with the same sample delivery and screenshots it with the part to outline (out/shots/)
│   ├── render.js            draws every frame on stage.html at 1920×1080, 25 frames a second, then mixes the voice with music and a sound on each change
│   ├── stage.html           the stage: screenshot, build number, date, caption and the row of builds
│   └── .gitignore           keeps the working folder out/ out of git
├── tools/ocr-check/         photo reading check on real manifest photos (development only)
│   ├── check.js             runs the app's photo code on the photos and scores the LPNs (also used by tests/groups/18-real-photo.js on GitHub)
│   ├── expected.json        the LPNs printed on each photo (23)
│   └── photos/              the user's four manifest photos, address boxes cut off (qub, rby, run, vlt .jpg), run-sideways.jpg (run.jpg turned, build 46) and rby-upside-down.jpg (rby.jpg turned 180°, build 47)
├── tools/old-data/          makes tests/fixtures/old from older builds (development only, after build 55)
│   ├── make.js              runs each build in ALL_BUILDS (19, 30, 46, 49, 54, 64), or only the ones named (node tools/old-data/make.js 64), from git history with stand-in ExcelJS and jsPDF and records its storage, backup, Excel cells and PDF hidden data
│   └── files.py             turns the recorded cells and hidden data into log.xlsx (openpyxl) and log.pdf (reportlab)
├── tools/feedback-worker/   Cloudflare Worker that turns Report a problem or idea into issues in a private repo (not part of the site)
│   ├── worker.mjs           POST /report: checks, limits (Limits Durable Object), GitHub issue and photo
│   ├── wrangler.toml        Worker name, repo, allowed origin, Durable Object binding
│   └── README.md            one-time set-up steps
├── tools/release/
│   ├── ship.sh              puts updates live and checks it: Checks, Pages, health check, download copy (development only)
│   ├── bump.sh              raises CACHE in sw.js to the live number plus one, only if it isn't already higher (development only)
│   └── photo-ok.sh          confirms manifest photos in tools/ocr-check/photos/ were checked for addresses, names and phone numbers, so the git guard lets them be committed (records their git hash in .git/lpn-photos-ok)
├── .github/workflows/
│   ├── test.yml             runs the checks on every push and pull request (advisories and fingerprints without blocking)
│   ├── feedback-worker.yml  deploys tools/feedback-worker to Cloudflare (by hand, or when it changes on main; skips until its secrets exist)
│   └── health.yml           weekly health check of the live site, the live demo video, the report system, CDN libraries, advisories, fingerprints, checks and the live site's photo reading
└── .claude/                 Claude Code automations (development only)
    ├── CLAUDE.md            working notes: branches, release steps, site settings (how to give a new feature a switch), user decisions
    ├── settings.json        registers the hooks below
    ├── hooks/
    │   ├── session_start.py fetches every branch, sets the upstream and NODE_PATH, prints a status line (including the updates branch and page or style changes since the demo video); the docs lag counts main commits that touch the app files, `config.js`, `tests/run.js`, `tests/lib.js` or `tests/groups/`
    │   ├── syntax-check.sh  `node --check` after a `.js` file is edited
    │   ├── config_check.js  checks config.js right after it is edited, with the same rules as tests/groups/19-site-config.js
    │   ├── lpn_git_guard.py commit and push guard (cache bump, also accepted when the same command runs bump.sh first; docs on main, no commits on main or new branches, unconfirmed manifest photos, no push with uncommitted or new untracked app or check files, tests before push)
    │   ├── uk_spelling.js   flags US spellings in text people see after index.html or an app script is edited (`--all` checks every app file)
    │   ├── docs_reminder.py reminds when the docs branch is behind main (counting main commits that touch the app files, `config.js`, `tests/run.js`, `tests/lib.js` or `tests/groups/`)
    │   └── outputs_reminder.py reminds when the download copy (outputs folder, and the zip compared by content; pictures, video and SVGs only need to be in the zip) doesn't match main
    └── agents/              export-reviewer, phone-layout-checker, docs-updater (one at a time, lock file /home/claude/lpn-docs-wt.lock), release-reviewer (with a never-build list), old-data-checker, guide-checker, security-reviewer, ocr-reviewer, a11y-reviewer
```

## What goes where

| Area | Put here | Keep out |
|---|---|---|
| `config.js` | Only `window.LPN_CONFIG = { features: {…}, testing: {…} }` with the names in `FEATURES` (core.js) and `true`/`false` values; edited by the site owner (see [installation](installation.md#site-settings-configjs)) | Any code or other settings (the check in `tests/groups/19-site-config.js` fails on unknown names, non-boolean values or `__proto__`/`constructor`/`prototype`) |
| `index.html` | Static markup and element ids | Inline logic (all behaviour is in the scripts) |
| `styles.css` | All styling; colours via the CSS variables set by `applyTheme()` | Hard-coded colours for themed surfaces |
| `core.js` | Anything other scripts need at load time: state, `save`/`render`, the `clean*` helpers for saved data, the `SRI` map, helpers | Library loading for exports or OCR |
| `qr.js` | Turning text into a QR code (`QR.encode`, `QR.svg`) | Anything about pallets or the log (that is `qrCodesFor()` in `panels.js`) |
| `scan.js` | Camera and barcode code | Log or export logic beyond calling `tryAdd()` |
| `export.js` | File generation and delivery | Reading files back (that is `compare.js` / `panels.js`) |
| `compare.js` | Everything manifest-related, file readers, OCR | Saved-delivery storage |
| `panels.js` | Side-panel content (Guide, Changelog, Settings, Saved deliveries, Share log) and app-wide extras that run last | Code other scripts depend on during their own load |
| `sw.js` | Caching only | App logic |
| `media/` | The Guide's demo video and its poster, kept under 3 MB (a check fails above that), the Changelog's build history video and its poster (build 65, kept under 4 MB), and the Settings QR code `share-qr.svg` (build 50, cached for offline use in `SHELL`) | Anything else the app needs to work offline (the video is never cached) |

## Load order and dependencies

`index.html` loads `config.js → core.js → qr.js → scan.js → export.js → compare.js → panels.js` as classic scripts. They share one global scope, so:

- top-level `const`/`let` names must be unique across files;
- `config.js` only sets `window.LPN_CONFIG`; `core.js` reads it once into `SITE` when it loads, so every later file can call `feat()` and `testNote()`;
- a file may call functions from earlier files at load time, and from any file inside event handlers;
- `panels.js` runs last, so it is where startup steps that need everything (initial `updateDel()`, `checkDate()`, service worker registration) live.

## Files the app does not use

`tests/`, `tools/`, `package.json`, `.gitignore`, `.github/`, `.claude/`, `.mcp.json`, `docs/`, `DESIGN.md` and `README.md` are for development only. None of them is loaded by the app or cached by `sw.js`.

- `tests/`, `tools/`, `package.json`, `DESIGN.md` and `README.md` are on `main`, so GitHub Pages publishes them alongside the app. `tools/` is kept out of the site zip and the download copy (`outputs_reminder.py` doesn't count it as a site file).
- `tools/demo-video/` only reads the app files; its output goes to `media/demo.mp4` and `media/demo-poster.jpg`, which the app does use, and to `tools/demo-video/screens.json`, which only `tests/groups/08-demo-video.js` reads.
- `tools/history-video/` reads the app's older builds from git history (and, through `../demo-video/voice.py`, the offline voice); its output goes to `media/history.mp4` and `media/history-poster.jpg`, which the app uses in the Changelog.
- `tools/ocr-check/` only reads the app files and its own photos; `tests/groups/18-real-photo.js` loads `check.js` to read the photos on GitHub, and `health.yml` runs it with `--url=` against the live site.
- `tools/old-data/` reads older builds from git history and writes only into `tests/fixtures/old/`, which only `tests/groups/21-old-data.js` reads.
- `tools/feedback-worker/` runs on Cloudflare, not on GitHub Pages; the app only talks to it through `FEEDBACK_URL` in `panels.js` (`https://lpn-feedback.jamie9904.workers.dev/report` since build 43). `tests/groups/11-feedback-worker.js` imports `worker.mjs` to check it.
- `tools/release/ship.sh` only runs git and `gh` commands and copies files to the download folder; `tools/release/bump.sh` only changes the `CACHE` line in `sw.js`; `tools/release/photo-ok.sh` only adds lines to `.git/lpn-photos-ok`. Nothing in the app or the checks uses them.
- `.github/`, `.claude/` and `.mcp.json` are on `main` but not published: Jekyll, which GitHub Pages uses to build the site, leaves out files and folders whose names start with a dot.
- `docs/`, and the version of `README.md` that goes with it, live only on the `docs` branch (`main` has its own `README.md`). Pages publishes from `main`, so they are not on the site. The git guard in `.claude/hooks/lpn_git_guard.py` blocks committing `docs/` files on `main` and merging or pushing `docs` into `main`.
