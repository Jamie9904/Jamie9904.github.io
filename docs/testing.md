# Testing

## Run the checks

```bash
npm install
npx playwright install chromium   # once
npm test
```

`npm install` fetches Playwright and the four export libraries the checks use: `exceljs` 4.4.0, `jspdf` 2.5.1, `jspdf-autotable` 3.8.2 and `pdfjs-dist` 3.11.174 (exact versions in `package.json` `devDependencies`). The app itself never loads them from `node_modules`; they are only there so the checks can use the real libraries (see [Real export libraries](#real-export-libraries) below).

`npm test` runs `node tests/run.js`. It starts its own static server on a random local port, so nothing else needs to be running. Output is one line per check and a final `N passed, N failed`; the exit code is non-zero on any failure.

On GitHub, `.github/workflows/test.yml` (workflow name **Checks**) runs the same command on every push and pull request (Node 22, Chromium), with `npm install --ignore-scripts` so no package install scripts run, read-only repository access (`permissions: contents: read`) and a 10-minute limit (`timeout-minutes: 10`). Results appear in the **Actions** tab, and failed checks are shown as annotations on the run.

### Real export libraries

When all five library files are in `node_modules` (`exceljs.min.js`, `jspdf.umd.min.js`, `jspdf.plugin.autotable.min.js`, `pdf.min.js` and `pdf.worker.min.js`), the "Real export libraries" group runs. Otherwise it prints "skipped here" and carries on; this happens where npm cannot download packages, such as the Claude cloud sandbox. Locally without the libraries the run has 79 checks; with them (always the case on GitHub) it has 97.

On GitHub (`GITHUB_ACTIONS` set) two extra lines are printed at the end:

- if the libraries are missing, an `::error` annotation "Real export libraries missing" is added and the run counts as failed, so the real checks can't be skipped there unnoticed;
- always, a `::notice` annotation titled **Checks** with the totals, for example "97 passed, 0 failed, including the real export library checks" (or "real export library checks skipped").

Because run logs can't be downloaded from a Claude cloud session, the notice is the way to read the result there: find the job id of the run, then

```bash
gh api repos/Jamie9904/Jamie9904.github.io/check-runs/<job id>/annotations
```

### Before a push (Claude Code hook)

When Claude Code runs a real `git push` (not, for example, `git stash push`) from this repository, the `PreToolUse` hook `.claude/hooks/lpn_git_guard.py` runs `node tests/run.js` first (with `NODE_PATH` pointed at the global npm modules) and stops the push if any check fails, showing the failing lines. A push of only the `docs` branch skips the checks, because it does not change the site. If the checks take longer than 280 seconds, the push is stopped too. This only applies to pushes made through Claude Code; a plain `git push` from a terminal is not checked locally, but `test.yml` still runs on GitHub.

## Weekly health check

`.github/workflows/health.yml` runs every Monday at 07:36 UTC (`cron: "36 7 * * 1"`) and can be started by hand from **Actions → Weekly health check → Run workflow**. It checks out `main` and runs three steps:

1. **Live site is up and on the latest version.** Fetches `https://jamie9904.github.io/` (with a cache-busting `?health=` query), checks the page title is `LPN Pallet Log`, then fetches the live `sw.js` and compares its `lpn-log-vN` cache name with the one in `sw.js` on `main`. A mismatch means the last update has not been published.
2. **CDN libraries still download.** Collects every `cdnjs.cloudflare.com` and `cdn.jsdelivr.net` URL written in the root `*.js` files and downloads each one. URLs ending in `/` (the pdf.js base paths) are checked as `…/pdf.worker.min.js`. Any failed download is reported as an error annotation naming the URL.
3. **Automatic checks.** `npm install --ignore-scripts`, Playwright Chromium, then `npm test`, the same as `test.yml` (so the real export library checks run here too).

Like `test.yml`, it has read-only repository access and a 10-minute limit.

If any step fails, GitHub sends its standard failed-workflow email (for scheduled runs, to the account that last changed the schedule in the workflow file); a passing run sends nothing. The workflow does not fix anything itself.

## What is covered

End-to-end checks in headless Chromium against the real page (79 checks at the time of writing, 97 with the real export libraries):

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
| Library versions (runs everywhere) | The versions in `package.json` for `exceljs`, `jspdf`, `jspdf-autotable` and `pdfjs-dist` each match the one version written in the CDN URLs in `export.js` and `compare.js` (cdnjs and jsDelivr); a mismatch, or two different versions of one library in the app, fails |
| Real export libraries (18 checks, needs `node_modules`) | A log of three pallets (12- and 13-character LPNs, one FSDU) with full delivery details and a 103-character note. **Excel log** (from **Export → Download (Excel)**, `#dl`, with `saveOnly` captured): the `.xlsx` is made; `parseExported()` gives back the same pallets and the same date, receiver, expected count, trailer, seals and notes; `readLog()` (Manifest check) reads the same LPNs; LPN column width at least 27; the "Made with LPN Pallet Log vX.Y (build N) on …" line is in one cell; the page footer has the version and `Page &P of &N`; the Notes row is at least 100pt tall. **Log PDF** (`buildLogPdf()`): the PDF is made; `parseExported()` gives back the pallets, notes and seal out; `readLogPdf()` reads the same LPNs; pdf.js finds `RUN0001830763` as one piece of text (not split over two lines); the footer starts "LPN Pallet Log vX.Y (build N)". **Manifest check sheet** (the Manifest check's **Download (Excel)**, `#cmpGo`, with `sendFile` captured): the `.xlsx` is made; `lpnsFromGrid()` finds all three LPNs and not the version line; LPN column at least 27; one-cell version line. Then no script errors |
| Offline | Service worker caches the app; reload works offline |

## Strategy

- **External requests are blocked.** Every request not to the local server is aborted, so runs are offline and repeatable.
- **Real libraries are served in place of the CDN.** A page opened with `page(browser, width, { real: true })` gets a router on the whole browser context: a request to any other host whose file name is one of the five library files is answered from `node_modules` (whichever CDN, cdnjs or jsDelivr, the app asks first), and everything else is still aborted. The route is set on the context, and service workers are blocked for that context, so the pdf.js worker and any request the service worker would have made also reach the router.
- **Versions are tied to the app.** The library-version check reads the CDN URLs from `export.js` and `compare.js`, so updating a library in the app without updating `package.json` (or the other way round) fails the checks.
- **ExcelJS is replaced by a recording stand-in** that keeps every cell value, font, border, merge, image and print setting, so the sheet layout can be asserted without the real library.
- **jsPDF is replaced for one check** (the "Export version note" group) by a stand-in that accepts any call and records the footer text and the PDF keywords, so `buildLogPdf()` can be checked for the version note.
- **A worksheet is faked for the spreadsheet import checks.** A small stand-in sheet behaves like ExcelJS for merged cells: every cell in a merged block reports the block's text, and only the top-left cell is its own `master`. `window.ExcelJS` and `window.loadExcel` are swapped for stand-ins that hand back this sheet, then put back afterwards.
- **A slow network is simulated** by wrapping `fetch` before the page loads so every request for `sw.js` waits 15 seconds; this checks that exports don't wait for the build number.
- Tests drive the app through its own globals (`newDelivery()`, `openHelp()`, `parseExported()`…) where clicking would only add flakiness, and through real typing and clicks for the add flow.

## Not covered

- The real libraries where npm can't fetch them (the checks are skipped there; push a branch and read the **Checks** notice from GitHub instead).
- pdf-lib (merging PDFs) and how the real files look: the real-library checks read the files back, they don't look at fonts, colours or page breaks. Spot-check by exporting from the live site; files can be rendered with LibreOffice to inspect layout.
- The manifest PDF (`buildCmpPdf()`) and the print view with the real libraries.
- Camera scanning, ZXing/BarcodeDetector and Tesseract OCR.
- How phone apps open the files, the share sheet and printing.
- Files that libraries fetch for themselves at run time (for example Tesseract's worker and language data) are not in the health check's CDN list, because only URLs written in the scripts are checked.

There is no coverage tooling configured.
