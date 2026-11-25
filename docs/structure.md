# Structure

```
.
├── config.js                site settings (build 53; `palletLog` and `palletDesc` added later, live since `main` `38c031c`; `palletLog: false` and `report: false` on the website, live since `main` `23b4714`): `window.LPN_CONFIG` with `features` (switch a feature off for everyone) and `testing` (add an "in testing" note); loaded before core.js, in the offline shell
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
├── logo.png                 default logo for the header and exports (optional; not in the Android app)
├── presets.json             shared LPN prefix presets (optional)
├── media/
│   ├── demo.mp4             narrated demo video for the Guide (720×1280, about 47 seconds, about 1.7 MB; re-recorded for v4.0 in build 52, again in build 59 to show the Report a problem button, in build 65 to show the four-button scan row, and in build 66 to show Share log, the four-item Export menu, the totals and ↓ Latest, then again for the later build 66 additions (the mute button by LPN number, − and + by Expected pallets); loaded only when tapped, not cached)
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
│   ├── lib.js               shared helpers for the checks: serve() (serves `config.js` with `palletLog` forced on), check(), page(), EXCEL_STUB, LIBS / libFile() / REAL_LIBS, file types (TYPES), counts()
│   ├── groups/              the checks, one self-contained file per area (since build 52)
│   │   ├── 01-layout.js … 06-real-export.js     layout; phone flows and Settings; Excel export; version note, PDF safety and spreadsheet import; saved data from outside and fingerprints; real export libraries and library versions
│   │   ├── 07-security-policy.js … 12-report.js security policy; demo video and the Changelog's build history video (build 65); manifest photos and problem report; accessibility; feedback Worker; Report a problem or idea
│   │   └── 13-photo-notes.js … 23-offline.js    photo notes; Find an LPN and turned photos; damaged pallets and Share this app; welcome card; offline store; real photo reading (GitHub only); site settings (config.js, build 53); pallets with no LPN, FPP descriptions and descriptions on any pallet (20-no-lpn.js, builds 55 and 56); data saved by older builds (21-old-data.js, after build 55); refused pallets, the reminder about a delivery not exported and the site name on exports (22-refused-reminder-site.js, build 62; Scan by photo reading the printed LPN added in build 63, moved to Upload photo in build 64; Read the printed LPN and several photos in build 65); Share log and the blank tally sheet (225-two-phones-tally.js, build 66); Back button, no pull-to-refresh, totals as filters and ↓ Latest (226-small-touches.js, build 66); pasting a list, the mute button, clearing the search, copying an LPN and tidied typed LPNs (227-paste-mute-search-copy.js, build 66); − and + by Expected pallets, the type badge in the Added note, keyboard shortcuts, the seal keypad and trailer capitals (228-expected-badge-keys.js, build 66); ? help buttons, Simple view, the empty log, double scans and the delivery fold (229-help-simple-empty-double-fold.js, build 66; also the Manifest date starting as today); the pallet log switch (230-pallet-log-switch.js, still build 66, live since main 38c031c); offline (23-offline.js since build 62). The runner sorts names as text, so 225- to 230- run after 22- and before 23-offline.js
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
├── tools/android/           the offline Android app (APK): checked on every push and built only by hand by .github/workflows/android.yml (on `updates` since 19 Nov 2026 and on `main` since `38c031c`; not part of the site or the site zip)
│   ├── config.js            the Android app's own site settings (same names as config.js; report and shareApp must stay false; every feature in FEATURES needs a line or the build stops)
│   ├── fetch-libs.js        step 1: downloads every CDN library the app names (checked against the SRI fingerprints) and the photo reader's worker, engines and language data into lib/, with lib/tess.json
│   ├── build-www.js         step 2: builds www/ from the site's files with checked edits (local libraries, own-files-only security policy, its own config.js, "LPN Pallet Log (Android APK build n)" in exports from build.json, no service worker, no install section, button or pop-up, the privacy line about tools inside the app, the camera-blocked message, Android printing first; since Android APK build 3 also the Guide's start-menu lines, the phone's text reader hook and the photo reader's language data unzipped; for Android APK build 4 the photo reader's script path for the early start, the Guide's wording for the redesigned screens and redesign.js loaded after the app's scripts) and adds android.js with the What's new list, and copies redesign.js
│   ├── android-shim.js      becomes www/android.js: storage through LpnStore, saving to Documents › LPN Pallet Log with the Saved bar (Open, Share, Save to…), Exported files, sharing, ML Kit behind BarcodeDetector (LPN first), the phone's camera scanner, screen on, Android printing, opened files, shared text and shortcuts (Continue too), predictive Back, Settings › Android app, What's new, volume-down, spoken count, low battery, scanner messages, text size, camera note, Android-style switches and ripples, full-strength buzzes and light taps, the scanner's type/FSDU/Remove last and recent pallets, Carry on scanning, Bigger buttons, bars following the theme, messages above the entry bar, bottom-sheet questions, Continue without the keyboard, the build shown in Settings and the footer; since Android APK build 3 also the start menu with separate Log pallets and Manifest check pages, the ⋮ menu, About with licences, the first-install introduction, Zebra/Honeywell handheld scans, the optional ML Kit text reader, the export folder, photo progress with Cancel and the background notification, the Saved tick, the error sheet, messages shown when out of sight, Next through Delivery, the Manifest date in the app's format, scan sounds and the spoken count following the phone's silent mode, and the on-phone photo test (ocrTest); for Android APK build 4 (on `updates`) also Take manifest photo always shown, Live read manifest and Live read log (the page side: tidy-up, prefix list, Remove last), the photo reader started early, the reader restarted after every four photos, and the live read rule scored in the photo test, the light tap on Live scan and the camera button, and the SHOW intents `export` (the Export sheet) and `delivery` (This delivery)
│   ├── redesign.js          for Android APK build 4 (on `updates`, commit `10a5be6` on): the redesigned screens, loaded after the app's scripts and keeping every id: Home (date, delivery card with the count, type bar and legend, Carry on scanning, Manifest check row, recent deliveries, bottom bar Home/Log/Check/Saved on Home only), the Log pallets bar (Search, Export, lorry button), the This delivery, Export and Add a pallet sheets, the full-screen Delivery details, the big Live scan, Manifest check steps, tiles and big results numbers, grouped Settings and Share log tabs; since `9504a45` also: no app name bar on Log pallets and the Manifest check (⋮ moved into the page bar by `placeMore()`), the logo and See all on Home, the totals as a big number, the log as a list with type pills, Which log as four choices (`#rdSrc`), the Manifest check's Export sheet and fixed bottom buttons, results as cards, the Saved sheet and a bigger Share log code; not in Simple view
│   ├── build.json           the Android app's own build number ("build", started at 1): shown in Settings, the footer, exports, the version name and the APK's file name; add 1 before each approved APK build
│   ├── whats-new.json       the list shown once after each Android update ("items": plain sentences; replace it before each approved build)
│   ├── check-offline.js     step 3: checks www/ in Chromium with the internet blocked and stand-ins for the native parts (110 on `updates` for Android APK build 4 since the redesigned screens, 101 before them; 90 for build 3; 64 up to Android APK build 2)
│   ├── patch-android.js     step 4: permissions (notifications too, since Android APK build 3), ML Kit text recognition, the camera app query (`IMAGE_CAPTURE`), no Google backup, predictive back, version, native code, ML Kit, CameraX, the scanner screen, file types and shared text, shortcuts, icons (themed too) and start-up screen in the Capacitor project; for Android APK build 4 also the Live read screen, ARM-only code in the release build, R8 shrinking with keep rules, and the `qa` build type (shrunk, test key, x86_64) for the virtual phone
│   ├── native/              MainActivity.java (edge to edge, portrait on phones, text zoom 100, volume-down, intents), LpnNativePlugin.java (ML Kit barcodes, printing, screen on, opened files, shared text and shortcuts, Back, Save to…, Open, voice, battery, phone's colours, scanner devices, Continue shortcut, vibrator, bar colours, light tap; since Android APK build 3 Zebra/Honeywell handheld intents, ML Kit text reading, notifications, the export folder and the phone's silent mode (`ringer`)), LpnStore.java (the app's own storage) and ScanActivity.java (the phone's camera scanner: aiming frame with flashes, type buttons in the type colours, FSDU, Remove last, recent pallets, "all in" with a green Done); for Android APK build 4 also TextScanActivity.java (Live read: ML Kit text reading on the live camera picture, numbers after "LPN" or, for a log, LPN-shaped words, sent once read twice within 5 seconds, a wide frame with flashes, Remove last, Torch, Done) and, in LpnNativePlugin.java, `startTextScan` and `textScanStatus`
│   ├── shots.sh             in hand-started runs with "shots" ticked: 18 screenshots on GitHub's Android emulator (normal and small size, each with and without Bigger buttons, the Manifest check page and the start menu; 14 up to Android APK build 2; 22 for Android APK build 4, adding the Export sheet and This delivery) and, first, the photo test on the virtual phone (ocr-phone-reader.txt; the workflow makes no APK unless every LPN is right; for Android APK build 4 it installs the shrunk `qa` build, scores the live read rule too, asks again after 90 s (since commit `2ff87e7` restarting the app first and keeping ocr-stalled.png), and a test that doesn't finish also stops the APK; logs in ocr-log.txt and page-log.txt), kept as the artifact android-screenshots and on the draft release "Android screenshots"
│   ├── qa.sh                in hand-started runs with "shots" and "qa" (Bug hunt) ticked, after shots.sh on the same emulator: 17 steps (first install, Back, the app killed and reopened, low memory, text size, dark, sideways, shared text, opened Excel and PDF logs, shortcuts, camera scanner and Live read opened and closed many times, volume-down, the Export menu, monkey random taps); qa/report.txt with crash, freeze (ANR) and page-error counts and memory, qa/*.png and logs, kept as android-qa.zip on the draft release "Android screenshots"; never fails the run (for Android APK build 4, on `updates`)
│   ├── sign.sh              step 5: signs the APK with the key kept as the draft release "Android signing key" (password: the ANDROID_KEY_PASSWORD secret), making it on the first run
│   ├── capacitor.config.json  app id io.github.jamie9904.lpnlog, name, web folder www, the App plugin's Back handler off
│   ├── package.json         Capacitor 7 packages (android, app, cli, core, filesystem, share)
│   └── .gitignore           keeps www/, lib/, android/, node_modules/, package-lock.json, *.apk and *.p12 out of git
├── tools/release/
│   ├── ship.sh              puts updates live and checks it: Checks, Pages, health check, download copy (development only)
│   ├── bump.sh              raises CACHE in sw.js to the live number plus one, only if it isn't already higher (development only)
│   └── photo-ok.sh          confirms manifest photos in tools/ocr-check/photos/ were checked for addresses, names and phone numbers, so the git guard lets them be committed (records their git hash in .git/lpn-photos-ok)
├── .github/workflows/
│   ├── test.yml             runs the checks on every push and pull request (advisories and fingerprints without blocking)
│   ├── android.yml          checks the offline Android copy on every push to updates and main (not for docs-only changes); builds and signs the APK only when run by hand (Run workflow, or gh workflow run android.yml --ref updates) after the owner approves an Android update, or only checks it compiles with "Make and sign the APK" unticked (-f apk=false); the APK is that run's artifact LPN-Pallet-Log-Android; hand-started runs also take screenshots on a virtual phone unless "shots" is unticked (-f shots=false) (on `updates`, not on `main` yet)
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
    │   ├── docs_reminder.py reminds when the docs branch is behind main (counting main commits that touch the app files including `qr.js`, `config.js`, `tests/run.js`, `tests/lib.js` or `tests/groups/`)
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
- `tools/android/` only reads the site's files; everything it makes (`lib/`, `www/`, the Android project, the APK) stays in ignored folders on GitHub's machine, and the APK is uploaded as a run artifact. The app doesn't use it, and it is not in the site zip. Its `config.js` is separate from the site's: changing it doesn't change the website.
- `tools/release/ship.sh` only runs git and `gh` commands and copies files to the download folder; `tools/release/bump.sh` only changes the `CACHE` line in `sw.js`; `tools/release/photo-ok.sh` only adds lines to `.git/lpn-photos-ok`. Nothing in the app or the checks uses them.
- `.github/`, `.claude/` and `.mcp.json` are on `main` but not published: Jekyll, which GitHub Pages uses to build the site, leaves out files and folders whose names start with a dot.
- `docs/`, and the version of `README.md` that goes with it, live only on the `docs` branch (`main` has its own `README.md`). Pages publishes from `main`, so they are not on the site. The git guard in `.claude/hooks/lpn_git_guard.py` blocks committing `docs/` files on `main` and merging or pushing `docs` into `main`.
