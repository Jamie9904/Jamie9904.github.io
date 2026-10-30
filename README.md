# LPN Pallet Log

## 📚 Documentation
| | |
|---|---|
| [⚙️ Architecture](docs/architecture.md) | System design, components and flow |
| [📁 Structure](docs/structure.md) | Project organization and responsibilities |
| [🚀 Installation](docs/installation.md) | Requirements, publishing and updating |
| [🧠 Technical decisions](docs/decisions.md) | Trade-offs and design justifications |
| [📖 Usage guide](docs/usage.md) | Day-to-day flows, settings and troubleshooting |
| [🧪 Testing](docs/testing.md) | How to run the automatic checks and what they cover |

---

## Description

A goods-in web app for documenting pallet deliveries. Staff scan or type each pallet's LPN (licence plate number), tag its type (Brown Box, FMCG, FPP, Mixed) and whether it carries an FSDU, then export a print-ready Excel or PDF log. Every export notes which app version and build made it.

It also checks a delivery against the supplier's manifest. Manifest numbers can come from photos (OCR), PDFs or typing, and while they are loaded the log counts them off live as pallets are scanned.

- Runs entirely in the browser: no server, no accounts. Data stays on the device.
- Installable on Android and iPhone as a home-screen app, and works offline after the first visit.
- Built for a phone in one hand on a loading bay: big touch targets, a pallet table that scrolls with the page, a docked entry bar with a counter and undo-last button (it slides aside while the Manifest check is in use), sound and vibration feedback.
- Guards against common slips: duplicate and malformed LPN warnings, an expected-count check, and a reminder before starting a new delivery that hasn't been exported.
- Careful with files from outside: backups are checked and shown before restoring (with a copy of the current data downloaded first), saved data is tidied when read, files loaded back in only give plain text to exports, every library file loaded by a script tag is checked against its fingerprint, and a security policy in the page only lets it run code from its own site and the three library CDNs.

## Quick start

Serve the folder with any static web server and open it:

```bash
git clone https://github.com/Jamie9904/Jamie9904.github.io.git
cd Jamie9904.github.io
python3 -m http.server 8000
# open http://localhost:8000/
```

Then: fill in the delivery details → type `RUN000000001` into the LPN box → **Add** → **Export → Download (Excel)**.

## Technologies used

| Area | Technology |
|---|---|
| App | Plain HTML, CSS and JavaScript (no framework, no build step) |
| Offline / install | Service worker (`sw.js`), Web App Manifest |
| Spreadsheets | ExcelJS 4.4.0 |
| PDFs | jsPDF 2.5.1 + jspdf-autotable 3.8.2, pdf-lib 1.17.1 (merging), pdf.js 6.4.299, legacy build (reading) |
| Barcodes | Native `BarcodeDetector`, falling back to ZXing 0.21.3 |
| OCR | Tesseract.js 5.1.1 |
| Storage | `localStorage` (keys prefixed `lpn`) |
| Fonts | Atkinson Hyperlegible, IBM Plex Mono (self-hosted, SIL OFL) |
| Hosting | GitHub Pages |
| Checks | Node.js + Playwright, with the real ExcelJS, jsPDF, pdf.js, pdf-lib, Tesseract.js and ZXing at the app's versions (every flow also checked under the security policy); run by GitHub Actions on every push and in a weekly health check, which also checks the libraries for security advisories (osv.dev) and their fingerprints |

Libraries load only when a feature first needs them: from cdnjs with jsDelivr as fallback, except pdf.js, which loads as a module from jsDelivr with unpkg as fallback. Script-tag libraries carry an integrity hash (`SRI` in `core.js`), so the browser refuses a changed file. A Content Security Policy in `index.html` limits scripts to the site, cdnjs, jsDelivr and unpkg (reading photos needs iOS 16+ on an iPhone because of it).

## Quick installation

1. Put the files at the root of a GitHub Pages repository (or any HTTPS static host).
2. Enable Pages on the `main` branch, root folder.
3. Open the site on a phone and install it from the browser menu.

Details, including how to publish updates: [docs/installation.md](docs/installation.md).

## Architecture (summary)

A single page (`index.html`) loads five classic scripts in a fixed order that share globals: `core.js` (state, log, rendering), `scan.js` (barcodes), `export.js` (Excel/PDF/print), `compare.js` (manifest check, OCR, live tracking) and `panels.js` (guide with a demo video, settings, saved deliveries, install, update banner). State lives in memory and is mirrored to `localStorage` on every change. A network-first service worker keeps the app usable offline and caches CDN libraries on first use (only complete downloads, in `lpn-libs-v2`); the Guide's demo video is left to the browser and needs internet. See [docs/architecture.md](docs/architecture.md).

## Project structure

```
.
├── index.html          page layout
├── styles.css          all styling and theme tokens
├── core.js             state, logging, table, warnings, undo
├── scan.js             live and photo barcode scanning
├── export.js           Excel, PDF, print, email sharing, logo
├── compare.js          manifest check, OCR, presets, live tracking
├── panels.js           guide, changelog, settings, saved deliveries
├── sw.js               service worker
├── manifest.webmanifest, icon-*.png, apple-touch-icon.png
├── fonts/              self-hosted fonts + licences
├── media/              demo video for the Guide (demo.mp4) and its poster
├── logo.png            default logo (optional)
├── presets.json        shared LPN prefix presets (optional)
├── DESIGN.md           design system notes
├── tests/              run.js (automatic checks), advisories.js + advisories-accepted.json (security advisories), sri.js (library fingerprints)
├── tools/demo-video/   recorder that re-makes the Guide demo video from the current app (sh tools/demo-video/make.sh)
├── package.json        test dependencies only (Playwright and the export libraries)
├── .github/workflows/  test.yml (checks on every push), health.yml (weekly health check)
├── .mcp.json           Context7 library documentation for Claude Code
└── .claude/            Claude Code hooks, agents and working notes
```

See [docs/structure.md](docs/structure.md).
