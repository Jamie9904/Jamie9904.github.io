# Testing

## Run the checks

```bash
npm install
npx playwright install chromium   # once
npm test
```

`npm install` fetches Playwright and the seven libraries the app loads from CDNs, at the same exact versions (`package.json` `devDependencies`): `exceljs` 4.4.0, `jspdf` 2.5.1, `jspdf-autotable` 3.8.2, `pdfjs-dist` 6.4.299 and `pdf-lib` 1.17.1, which the checks use for real (see [Real export libraries](#real-export-libraries) below), plus `tesseract.js` 5.1.1 and `@zxing/library` 0.21.3, which are only there so the version check and the advisory check cover them. The app itself never loads anything from `node_modules`.

`npm test` runs `node tests/run.js`. It starts its own static server on a random local port, so nothing else needs to be running. Output is one line per check and a final `N passed, N failed`; the exit code is non-zero on any failure.

On GitHub, `.github/workflows/test.yml` (workflow name **Checks**) runs the same command on every push and pull request (Node 22, Chromium), with `npm install --ignore-scripts` so no package install scripts run, read-only repository access (`permissions: contents: read`) and a 10-minute limit (`timeout-minutes: 10`). Results appear in the **Actions** tab, and failed checks are shown as annotations on the run.

### Real export libraries

When all six library files are in `node_modules` (`exceljs.min.js`, `jspdf.umd.min.js`, `jspdf.plugin.autotable.min.js`, `pdf-lib.min.js`, and pdf.js's `pdf.min.mjs` and `pdf.worker.min.mjs`, taken from `pdfjs-dist/legacy/build/`), the "Real export libraries" group runs. Otherwise it prints "skipped here" and carries on; this happens where npm cannot download packages, such as the Claude cloud sandbox. Locally without the libraries the run has 96 checks; with them (always the case on GitHub) it has 117.

On GitHub (`GITHUB_ACTIONS` set) two extra lines are printed at the end:

- if the libraries are missing, an `::error` annotation "Real export libraries missing" is added and the run counts as failed, so the real checks can't be skipped there unnoticed;
- always, a `::notice` annotation titled **Checks** with the totals, for example "117 passed, 0 failed, including the real export library checks" (or "real export library checks skipped").

Because run logs can't be downloaded from a Claude cloud session, the notice is the way to read the result there: find the job id of the run, then

```bash
gh api repos/Jamie9904/Jamie9904.github.io/check-runs/<job id>/annotations
```

### Before a push (Claude Code hook)

When Claude Code runs a real `git push` (not, for example, `git stash push`) from this repository, the `PreToolUse` hook `.claude/hooks/lpn_git_guard.py` runs `node tests/run.js` first (with `NODE_PATH` pointed at the global npm modules) and stops the push if any check fails, showing the failing lines. A push of only the `docs` branch skips the checks, because it does not change the site. If the checks take longer than 280 seconds, the push is stopped too. This only applies to pushes made through Claude Code; a plain `git push` from a terminal is not checked locally, but `test.yml` still runs on GitHub.

## Security advisories and library fingerprints

Two more scripts need internet, so they are not part of `npm test`:

```bash
node tests/advisories.js     # security advisories for the seven pinned libraries
node tests/sri.js            # library files still match their fingerprints
```

**`tests/advisories.js`** reads the seven versions from `package.json` and asks the OSV database (`https://api.osv.dev/v1/query`, npm ecosystem) about each one. For every advisory found:

- listed in `tests/advisories-accepted.json` (by its id or any alias): printed as a `note` with the written reason;
- otherwise HIGH or CRITICAL: an error ("New security advisory");
- otherwise: a warning.

It also adds a notice when an accepted entry is no longer reported for that version ("can be removed from tests/advisories-accepted.json"). It ends with a summary such as "0 new serious, 0 new other, 12 accepted", and exits with 1 if there is a new serious advisory, a library is missing from `package.json`, or a lookup failed. On GitHub the lines are annotations (`::error`, `::warning`, `::notice`). Without internet it can be tried against saved answers: `node tests/advisories.js --from saved-osv-answers.json`, where the file maps `name@version` to OSV's list of advisories.

`tests/advisories-accepted.json` currently lists 12 jsPDF 2.5.1 advisories, each with the reason it doesn't affect the app (for example "addJS: the app doesn't use addJS."). Its `_about` note lists what the app does use jsPDF for. Keep the reasons true when the export code changes, and remove entries once a library is upgraded past them.

**`tests/sri.js`** reads every address and `sha384` hash from the `SRI` map in `core.js`, downloads each file, and compares the hash. It prints `ok` or `FAIL` per file and "n of n library files match", and exits with 1 if any file has changed, failed to download, or no hashes were found.

Both run in `health.yml` (a failure fails the weekly run) and in `test.yml` with `continue-on-error: true` (shown on the run but never blocking a push).

## Weekly health check

`.github/workflows/health.yml` runs every Monday at 07:36 UTC (`cron: "36 7 * * 1"`) and can be started by hand from **Actions → Weekly health check → Run workflow**. It checks out `main` and runs these steps:

1. **Live site is up and on the latest version.** Fetches `https://jamie9904.github.io/` (with a cache-busting `?health=` query), checks the page title is `LPN Pallet Log`, then fetches the live `sw.js` and compares its `lpn-log-vN` cache name with the one in `sw.js` on `main`. A mismatch means the last update has not been published.
2. **CDN libraries still download.** Collects every `cdnjs.cloudflare.com`, `cdn.jsdelivr.net` and `unpkg.com` URL written in the root `*.js` files and downloads each one. The pdf.js worker addresses are written out in full in `PDFJS_SRC`, so they are checked like any other URL. Any failed download is reported as an error annotation naming the URL.
3. **Security advisories for the app's libraries.** `node tests/advisories.js` (see above).
4. **Library files still match their fingerprints.** `node tests/sri.js` (see above).
5. **Automatic checks.** `npm install --ignore-scripts`, Playwright Chromium, then `npm test`, the same as `test.yml` (so the real export library checks run here too).

Like `test.yml`, it has read-only repository access and a 10-minute limit.

If any step fails, GitHub sends its standard failed-workflow email (for scheduled runs, to the account that last changed the schedule in the workflow file); a passing run sends nothing. The workflow does not fix anything itself.

## What is covered

End-to-end checks in headless Chromium against the real page (107 checks at the time of writing, 131 with the real libraries on GitHub):

| Group | Checks |
|---|---|
| Layout (375, 768, 1300px) | No sideways scrolling, Date and Received by aligned, usable field widths, no script errors |
| Logging on a phone | Add flow, confirmation toast, entry-bar counter, Delivery folding, trailer/seal persistence, duplicate warning and Skip |
| Live manifest tracking | Progress text, "not on manifest" warning |
| Phone usability | Pallet table scrolls with the page (`.wrap` overflow is `visible`); logo controls hidden in Delivery; Manifest check has no "still being tested" warning and Prefix presets starts closed; expected-count line is `prog` when under, `bad` when over and hidden when Expected pallets equals the manifest count; entry bar gets `cmpfocus` and moves below the screen when the Manifest check is scrolled to the top, comes back at the top of the page, and stays while `#lpn` has focus; an 18-character LPN causes no sideways scrolling at 360px; `#setLogo` is in Settings; `#cmpToggle` and `#manShow` are at least 44px tall |
| Quick actions | Undo-last button and its Undo, "Use n as expected", entry bar fits at 375px and at 360px with a long counter |
| Saved deliveries | Start new delivery warns when not exported, then saves and clears (including manifest), Undo restores, backup note |
| Settings and dates | Date format setting, importing an exported CSV (date, trailer, seals, FSDU), Guide contents bar |
| Excel export | Expected-count check blocks the first try; "Exported at" note and new-delivery prompt; title band and logo placement; header, row borders, Courier New LPNs, footer, fit-to-width and repeated header; trailer in Delivery Details; footer names the version and build; "Made with LPN Pallet Log vX.Y (build N) on dd/mm/yyyy at hh:mm." line under the tables; LPN column at least 27 wide for a 13-character LPN; a long Notes value gets a row tall enough for its wrapped lines (about 13 characters a line, 17pt a line). Manifest check sheet: LPN column fits a 13-character LPN, has the version line, and a 73-character junk scan keeps the column at 40 or less and gets a row taller than 24 |
| Export version note | With every request for `sw.js` held for 15 seconds, an Excel export still finishes in under 3 seconds; the basic `.xls` fallback has the "Made with … at hh:mm." line; the log PDF (with a stand-in jsPDF) has the version in its `LPNLOG2:` data (`app`) and its footer, with the rows intact; importing a CSV stops at the version line; no script errors |
| Spreadsheet import | With a stand-in worksheet whose version line sits straight under the pallets (no blank row above it): `sheetGrid()` reads a merged line once, not in every column; importing an exported log (`parseExported()`) stops at the version line and still reads Notes and Received by; the Manifest check (`readLog()`) reads the same pallets from that file |
| PDF safety (runs everywhere) | A scan of `compare.js` finds exactly one pdf.js version in its `pdfjs-dist@x.y.z/` URLs, and that version is outside the known ranges where a crafted PDF could run code (before 4.2.67, and 5.6.83 up to 6.2.108); with every outside request blocked and the service worker off (`page(…, { noSW: true })`), importing a PDF with `parseExported()` fails with the plain message starting "The PDF reader couldn’t load. Check you’re online"; a scan of `core.js`, `scan.js`, `export.js`, `compare.js` and `panels.js` finds `getDocument(` exactly once, in `compare.js` as `getDocument({data:bytes})`, so every PDF goes through `openPdf()` |
| Saved data and backups from outside | **Damaged data in storage:** with `lpnhist` `[null]`, `lpnlog` holding `"rows":"x"` and a `{"formula":…}` object as Received by, `lpnnames` `[5,{}]`, `lpncfg` `"x"`, `lpnpresets` `[1]` and `lpnlogo` set to a web address, the app starts with no script errors, Settings opens, the log is empty, Received by is empty (an object is never shown as a value), and no request is made to the logo's address. **Restore:** choosing a backup shows "log of 1 pallet and 1 saved delivery" and the Replace/Cancel row while the current log is unchanged; after **Replace** the Reload button and "Make sure the copy…" message show; a restore stops with "wasn’t replaced" and leaves the log as it was when the safety copy can't be saved; exactly one safety copy is downloaded; the restored data is tidied (an object in Received by becomes empty, an unknown pallet type becomes `Mixed`, `fsdu:1` becomes `true`, the outside logo is dropped, a number in the names list is dropped); a backup with unreadable JSON in `lpnhist` is refused with "damaged, so nothing was changed" and no Replace button. **Outside files:** `LPNLOG2:` data with objects for the date, receiver and pallet type, and a row whose LPN is an object, gives plain values from `parseExported()` (empty date, receiver and notes, one row) and `readLogPdf()` (`RUN000000001` only), and no object in the log copy grid; the basic `.xls` (`fallbackXls()`) has the `td.t` text format, writes a notes value starting `=HYPERLINK` in a `class="t"` cell and keeps the counts as plain numbers. Then no script errors |
| Library fingerprints (runs everywhere) | Every address passed to `loadScript("…")` in `core.js`, `export.js`, `compare.js` and `scan.js`, plus the ZXing address in `scan.js`, has an entry in the `SRI` map, every `SRI` entry is used, and there are at least 10 |
| Library versions (runs everywhere) | The versions in `package.json` for `exceljs`, `jspdf`, `jspdf-autotable`, `pdfjs-dist`, `pdf-lib`, `tesseract.js` and `@zxing/library` each match the one version written in the CDN URLs in `export.js`, `compare.js` and `scan.js` (cdnjs, jsDelivr and unpkg); a mismatch, or two different versions of one library in the app, fails |
| Real export libraries (21 checks, needs `node_modules`) | A log of three pallets (12- and 13-character LPNs, one FSDU) with full delivery details and a 103-character note. **Excel log** (from **Export → Download (Excel)**, `#dl`, with `saveOnly` captured): the `.xlsx` is made; `parseExported()` gives back the same pallets and the same date, receiver, expected count, trailer, seals and notes; `readLog()` (Manifest check) reads the same LPNs; LPN column width at least 27; the "Made with LPN Pallet Log vX.Y (build N) on …" line is in one cell; the page footer has the version and `Page &P of &N`; the Notes row is at least 100pt tall. **Log PDF** (`buildLogPdf()`): the PDF is made; `parseExported()` gives back the pallets, notes and seal out; `readLogPdf()` reads the same LPNs; pdf.js (opened through `openPdf()`) finds `RUN0001830763` as one piece of text (not split over two lines); `pdfjsLib.version` equals the `pdfjs-dist` version in `package.json`; page 1 can be drawn to a canvas with more than 500 dark pixels (the drawing step the OCR fallback uses for scanned PDFs); the footer starts "LPN Pallet Log vX.Y (build N)". **Manifest check sheet** (the Manifest check's **Download (Excel)**, `#cmpGo`, with `sendFile` captured): the `.xlsx` is made; `lpnsFromGrid()` finds all three LPNs and not the version line; LPN column at least 27; one-cell version line. **Merged log PDF** (real pdf-lib): a log PDF made with pdf-lib whose page has a JavaScript page-open action (`/AA`) and a link annotation (`/Annots`) is read with `readLogPdf()` and merged by `buildCmpPdf()`; the result has at least two pages and no page with `/AA` or `/Annots`. Then no script errors |
| Security policy (runs everywhere) | `index.html` has a `Content-Security-Policy` meta tag before the first `<script>`; its `script-src` is exactly the site, cdnjs, jsDelivr, unpkg and `'wasm-unsafe-eval'`; there is no `'unsafe-eval'`; it has `child-src 'self' blob:`, `object-src blob:` and `base-uri 'none'`. Opening Settings and the Guide and showing a log row (with stand-in libraries) triggers no `securitypolicyviolation` event and no script errors |
| Offline store and failure paths | **Service worker on** (`page(…, { sw: true })`, router on the whole context so the service worker's own requests are caught too): the page is controlled by its service worker; a library download answered with 503 is not kept in `lpn-libs-v2`; an unchecked (`no-cors`) copy of an ordinary library is not kept, but one of a photo-reader file (`tesseract` in the address) is; a checked (`cors`) request for that file gets a fresh `cors` answer, not the saved unchecked copy. With the real libraries: after one Excel export and loading jsPDF and pdf.js online, the page reloaded offline still exports Excel, and a log PDF made by `buildLogPdf()` is read back by `parseExported()` with its pallet. **Restore rollback:** a restore where saving `lpnhist` throws `QuotaExceededError` leaves `lpnlog` exactly as before and shows "…ran out of storage space, so nothing was changed". **Photo reader failures** (stand-in `Tesseract`, Playwright's fake clock): a worker that fails to start gives the "photo reader couldn’t load" message, its saved `tesseract` files are deleted and other saved libraries (jsPDF) are kept; a worker that never starts is still waiting after 60 seconds and gives the same message and clean-up by 91 seconds. No script errors |
| Real photo reading and the security policy (GitHub only, needs `node_modules` and internet) | `ocrLpns()` with the real Tesseract (its worker, engine and English language data from the real internet, `{ net: true }`) finds `VLT003977037` in a drawn picture, with one retry for a network blip. Then, under the app's policy, Excel export, PDF export (`buildLogPdf()`), PDF reading (`parseExported()`), pdf-lib (`loadPdfLib()`), photo reading, printing (`printBuf()`) and the ZXing barcode library (`loadZX()` and `new ZXing.BrowserMultiFormatReader()`) all succeed, with no `securitypolicyviolation` event in the page and no Content-Security-Policy message in the console of the page or its workers |
| Offline | Service worker caches the app; reload works offline |

## Strategy

- **External requests are blocked.** Every request not to the local server is aborted, so runs are offline and repeatable.
- **Real libraries are served in place of the CDN.** A page opened with `page(browser, width, { real: true })` gets a router on the whole browser context: a request to any other host whose file name is one of the library files in the `LIBS` map (ExcelJS, jsPDF, jspdf-autotable, pdf.js and its worker, pdf-lib, Tesseract.js and ZXing) is answered from `node_modules` (whichever CDN, cdnjs, jsDelivr or unpkg, the app asks first; all are served as `text/javascript` with `Access-Control-Allow-Origin: *`, as the real CDNs send, because the app loads libraries with `crossorigin` and an integrity hash), and everything else is still aborted. The route is set on the context, and service workers are blocked for that context, so the pdf.js worker and any request the service worker would have made also reach the router.
- **Service worker on, when needed.** `{ sw: true }` keeps the service worker running and still routes at the context level, so the worker's own library requests can be answered by the test. `{ handle }` lets a check answer chosen addresses itself (for example a 503, or a fake library). `{ net: true }` lets the photo reader's own files (`tesseract` or `tessdata` in the address) through to the real internet; it is only used in the GitHub-only group.
- **Blocks by the security policy are listened for** in two places: a `securitypolicyviolation` listener added before the page loads, and the console of the page and of every worker (blocks inside workers don't reach the page's event).
- **Time is faked for the photo reader's 90-second limit** with Playwright's clock (`p.clock.install()` and `runFor()`), and `window.Tesseract` is replaced by a stand-in whose worker fails or never starts.
- **Versions are tied to the app.** The library-version check reads the CDN URLs from `export.js`, `compare.js` and `scan.js`, so updating a library in the app without updating `package.json` (or the other way round) fails the checks.
- **ExcelJS is replaced by a recording stand-in** that keeps every cell value, font, border, merge, image and print setting, so the sheet layout can be asserted without the real library.
- **jsPDF is replaced for one check** (the "Export version note" group) by a stand-in that accepts any call and records the footer text and the PDF keywords, so `buildLogPdf()` can be checked for the version note.
- **A PDF reader that can't load is simulated** by opening a page with `{ noSW: true }`: outside requests are aborted as usual, and the service worker is blocked too, because otherwise it would fetch pdf.js itself where there is internet and the check would pass or fail depending on the network.
- **A worksheet is faked for the spreadsheet import checks.** A small stand-in sheet behaves like ExcelJS for merged cells: every cell in a merged block reports the block's text, and only the top-left cell is its own `master`. `window.ExcelJS` and `window.loadExcel` are swapped for stand-ins that hand back this sheet, then put back afterwards.
- **Damaged saved data is planted before the page loads** with an `init` script that writes the `lpn*` keys, and backup files are given to `#bkFile` with `setInputFiles` or a `DataTransfer`. `saveOnly` is replaced so the safety copy is counted (or made to fail) instead of downloaded.
- **A crafted log PDF is faked** by swapping `window.pdfjsLib` and `window.loadPdfJs` for stand-ins that return a document whose keywords hold the `LPNLOG2:` data, then putting them back.
- **A slow network is simulated** by wrapping `fetch` before the page loads so every request for `sw.js` waits 15 seconds; this checks that exports don't wait for the build number.
- Tests drive the app through its own globals (`newDelivery()`, `openHelp()`, `parseExported()`…) where clicking would only add flakiness, and through real typing and clicks for the add flow.

## Not covered

- The real libraries where npm can't fetch them (the checks are skipped there; push a branch and read the **Checks** notice from GitHub instead).
- pdf-lib beyond the merge check, and how the real files look: the real-library checks read the files back, they don't look at fonts, colours or page breaks. Spot-check by exporting from the live site; files can be rendered with LibreOffice to inspect layout.
- The manifest PDF (`buildCmpPdf()`) with the real libraries, and what the print view looks like (the policy check only shows `printBuf()` runs with nothing blocked).
- Camera scanning and BarcodeDetector, and ZXing reading a real barcode: the checks only load ZXing and create its reader under the policy. How well the photo reader reads real photos beyond one clear drawn LPN.
- The security policy on browsers other than Chromium, including older Safari (where reading photos needs iOS 16+).
- That `lpn-libs-v1` is deleted when the new service worker activates (the offline store checks only look at what `lpn-libs-v2` keeps).
- That the browser really refuses a file with a wrong fingerprint: the checks only show every address has a hash, and `tests/sri.js` that the hashes match the CDNs.
- A real harmful PDF: the PDF safety checks only show that the pinned pdf.js version is outside the known bad ranges, not how pdf.js behaves with a crafted file.
- pdf.js on older phones: the checks use Chromium only, so the browser versions the legacy build needs (roughly iOS/Safari 16.4+, Chrome 94+, Firefox 93+) are not tested.
- How phone apps open the files, the share sheet and printing.
- Files that libraries fetch for themselves at run time (for example Tesseract's worker and language data) are not in the health check's CDN list, because only URLs written in the scripts are checked.

There is no coverage tooling configured.
