# Architecture

## Overview

A client-only progressive web app. There is no backend: the browser renders the page, holds the state, builds the export files and stores everything in `localStorage`. GitHub Pages only serves static files.

```
┌──────────────── index.html ────────────────┐
│ core.js → scan.js → export.js → compare.js → panels.js │   (classic scripts, shared globals)
└──────────────────────┬─────────────────────┘
          localStorage (lpn*)     sw.js (cache)
                       │                │
              CDN libraries loaded on demand (ExcelJS, jsPDF, pdf-lib, pdf.js, ZXing, Tesseract)
```

## Components

| File | Responsibility | Key functions |
|---|---|---|
| `core.js` | Global state (`rows`, `cfg`), delivery fields, persistence, table rendering, LPN validation, add flow, undo, sound/vibration, date helpers, script loader | `load`, `save`, `render`, `summary`, `lpnIssues`, `tryAdd`, `addValue`, `getDel`/`setDel`, `ukDate`/`isoDate`, `loadScript` |
| `scan.js` | Live camera scanning and photo decoding; screen wake lock while scanning; input event wiring | `startScan`, `stopScan`, `decodePhoto`, `onCode` |
| `export.js` | Spreadsheet styling helpers, Excel log, PDF log and manifest PDF, print, file delivery (download / share sheet / mailto fallback), logo handling, expected-count check | `xlBox`, `xlTitle`, `xlLines`, `xlLpnWidth`, `xlLpnLines`, `xlMadeWith`, `xlPrint`, `appVersion`, `buildLogPdf`, `buildCmpPdf`, `deliver`, `emailVia`, `expectCheck`, `exportLogo` |
| `compare.js` | Manifest check: reading logs and manifests (xlsx, csv, PDF, photos), OCR, prefix presets, comparison, results panel, manifest Excel, live tracking in the log | `readLog`, `sheetGrid`, `PDFJS_SRC`, `PDF_LOAD_MSG`, `loadPdfJs`, `openPdf`, `readPdf`, `readLogPdf`, `ocrLpns`, `extractLpns`, `cmpData`, `renderCmp`, `manState`, `manLive` |
| `panels.js` | Guide/changelog content, side panel, theming, Settings (including the Logo buttons), saved deliveries (history), import of exported logs, backups, install pop-up, date reminder, remembered names, offline notice, service worker registration, prefix preset summary, entry bar stepping aside on phones | `applyTheme`, `initSettings`, `newDelivery`, `openHist`, `parseExported`, `backupNow`, `checkDate`, `pfxSummary` |
| `sw.js` | Offline shell and library cache | install / activate / fetch handlers |

Scripts are loaded in that order at the end of `index.html`. Later files call functions from earlier ones directly; where an earlier file needs something defined later (for example `summary()` in `core.js` calling `manLive()` from `compare.js`), it checks `typeof fn === "function"` first.

## Data model

- **Current log** (`lpnlog`): `{rows:[{lpn,type,fsdu}], date, recv, notes, expect, trailer, sealIn, sealOut, exp}`. Written by `save()` after every change. `exp` is `{at, sig}`: when the log was last exported and a hash of its rows (`logSig()`) at that moment, so a later change can be detected.
- **App-made PDFs** carry `LPNLOG2:` + URL-encoded JSON in the keywords: `{app, d, r, n, e, t, si, so, rows:[[lpn, type, fsdu 1/0]]}`. `app` is the version text from `appVersion()`; importing ignores it.
- **Saved deliveries** (`lpnhist`): array of the same shape plus `id` and `saved` timestamp. `pruneHist()` keeps only entries dated from the start of last week (weeks start on Sunday); `pushHist()` also caps the list at 50.
- **Manifest numbers** (`lpncmpman`): the raw text of the manifest box, so live tracking survives a reload.
- **Settings and preferences**: `lpncfg`, `lpntheme`, `lpnlogo`, `lpnnames`, `lpnpresets`, `lpncmppfx`, `lpncmpdate`, `lpnmergelog`, `lpnbackup`, `lpninstallshown`.

Dates are stored as ISO `yyyy-mm-dd` and only formatted for display (`ukDate()` follows the Date format setting).

## Main flows

**Adding a pallet**
`Enter`/Add → `tryAdd()` runs `lpnIssues()` (duplicate, format, prefix list, digit count) → either the warning bar (Skip / Add anyway) or `addValue()` → `rows.push()` → `save()` → `render()` → `summary()` (totals, expected count, live manifest progress, entry-bar counter) → confirmation toast.

**Expected-count line**
`summary()` fills `#expInfo` from Expected pallets (`#expect`). If a manifest is loaded and `manState().total` equals the expected number, the line is hidden (the manifest progress line already says the same). Otherwise its class is `expinfo prog` while under the expected count (normal text colour, "(n to go)"), `expinfo ok` when equal (green, "✓ all accounted for") and `expinfo bad` when over (red, "(n more than expected)").

**Undo last pallet**
`#undoLast` pops the newest row and offers Undo through `showUndo()`. Its visibility is set in `summary()`; CSS shows it on phones only.

**Excel export**
`$("dl").onclick` → `expectCheck()` (first attempt blocked if the expected count differs) → `loadScript()` ExcelJS → `appVersion()` → build sheet: logo rows, `xlTitle()` band, numbered table and side tables with `xlBox()` borders → `xlMadeWith()` version line → `xlPrint()` (A4, fit to width, repeated header row, footer) → `deliver()` → `markExported()` (skipped when exporting a saved delivery). `deliver()` returns `false` when the user cancels the share sheet, so a cancelled email is not counted as an export. If ExcelJS cannot load, `fallbackXls()` writes an HTML-based `.xls`.

**Email PDF**
`emailVia()` sets email mode and runs the Excel handler; `deliver()` swaps the spreadsheet for the PDF built by `pdfJob` and calls `navigator.share({files})`. If sharing is refused because the user gesture expired, a "Tap to share" button is offered; otherwise the file is saved and a `mailto:` opened.

**Column widths and row heights in spreadsheets**
Excel and Google Sheets don't grow a row whose height has been set, so `export.js` works out the sizes itself:

- `xlLpnWidth(list, base)` sets the LPN column to the longest LPN × 1.65 + 5 units (14pt Courier New), never below `base` (26 on the log, 21 on the manifest check sheet) and never above 40.
- `xlLines(text, width, perUnit)` estimates how many lines wrapped text needs: it wraps on spaces at about 0.72 characters per column unit (14pt Arial, after padding), splits words that are longer than a line, and counts line breaks in the text.
- `xlLpnLines(value, width)` does the same for an LPN at 0.6 characters per unit, with spaces removed.
- On the log, each table row is `max(24, Delivery Details value lines in the 20-wide column × 18 + 6, LPN lines × 18 + 6)` points; heading rows stay at 32. Every Delivery Details row is sized this way, not only Notes. On the manifest check sheet, each row is `max(24, LPN lines × 18 + 6)`.
- The logo width passed to `xlLogo()` follows the table: `(7 + LPN width + 22 + 12) × 7.3` pixels on the log and `(7 + LPN width + 18 + 12 + 19) × 7.1` on the manifest check sheet.

**App version on exports**
`appBuildP` runs once when `export.js` loads. It fetches `sw.js` (`cache:"no-cache"`, through the service worker like the other app files, given up after 4 seconds) and takes the number from `lpn-log-vN`. If that fails it uses the lowest `lpn-log-vN` cache name in Cache Storage, otherwise an empty string. Reading it at page load means the build matches the code the page is running, even if an update arrives later.

`appVersion()` takes the version from the first `<h3>vX.Y` in `HELP.log` and waits at most 1.5 seconds for `appBuildP`, then returns for example "LPN Pallet Log v3.30 (build 26)", or "LPN Pallet Log v3.30" with no build. The result is kept in `appVer` only once a build is known; `appVerTry` holds the latest attempt. The Excel log, the manifest check sheet, `fallbackXls()`, `buildLogPdf()` and `buildCmpPdf()` all call it before building. The text is then used by:

- `xlMadeWith(ws, row, lastCol)`: row `H + n + 2` (one empty row below the tables), merged across all columns, Arial 10pt italic grey (`FF595959`), height 18, "Made with … on <date> at hh:mm.";
- `xlPrint()`: the left part of the page footer, with `&` written as `&&` so Excel doesn't treat it as a code;
- `pdfFooter()`: the left part of every PDF page footer;
- `buildLogPdf()`: an `app` field in the `LPNLOG2:` JSON in the PDF keywords;
- `fallbackXls()`: a "Made with … at hh:mm." paragraph under the table.

**Starting a new delivery**
`newDelivery()` compares `exported.sig` with `logSig()`. If the log was never exported or has changed since, the first call only shows a reminder (remembered in `newAck`); a second call, or starting from the post-export prompt, saves to history, clears the delivery fields and manifest numbers and resets `exported`.

**Opening PDFs**
Every PDF that pdf.js reads is opened by `openPdf(bytes)` in `compare.js`, which is `pdfjsLib.getDocument({data:bytes}).promise`. Its three callers each run `loadPdfJs()` first.

`loadPdfJs()` loads pdf.js 6.4.299, the "legacy" build (made for older browsers and phones). That build is an ES module, so it is loaded with a dynamic `import()` rather than `loadScript()`. The addresses are in `PDFJS_SRC`: jsDelivr first, then unpkg (cdnjs only hosts the modern build), each with a 15-second limit. The first one that loads becomes `window.pdfjsLib`, and `GlobalWorkerOptions.workerSrc` is set to the matching `pdf.worker.min.mjs` on the same host (pdf.js wraps a worker from another site itself). If `window.pdfjsLib` is already there it returns straight away. If both hosts fail it throws `PDF_LOAD_MSG`: "The PDF reader couldn’t load. Check you’re online, then reload the page and try again. Very old phones can’t read PDFs: type the numbers in the box instead." The service worker saves both files in `lpn-libs-v1` the first time they load, so PDFs can be read offline after one online read.

The three callers:

- `readPdf()` (`compare.js`): a manifest PDF in the Manifest check. It reads the text layer, and if no LPNs are found it renders up to 20 pages to a canvas (scale 2) and reads them with OCR. Both steps use the document `openPdf()` returned.
- `readLogPdf()` (`compare.js`): a log PDF in the Manifest check. It tries the `LPNLOG2:` (or older `LPNLOG|`) keywords first, then the column under the `LPN` heading, then falls back to `readPdf()`.
- `parseExported()` (`panels.js`): importing an exported log PDF in Saved deliveries, which only accepts PDFs with `LPNLOG2:` keywords.

Where the message appears: importing in Saved deliveries and loading a log PDF in the Manifest check show the error's own text, so they show `PDF_LOAD_MSG`. The Manifest check's PDF button (`#cmpPdfFile`, several files at once) stops at the first file that fails with `PDF_LOAD_MSG` and shows only that message, instead of listing every file as unreadable.

The protection against harmful PDFs is the pdf.js version: 6.4.299 is past the known flaws where a crafted PDF could run code (CVE-2024-4367, fixed in 4.2.67; CVE-2026-16633 / GHSA-hq66-cqwq-w95j, which affected 5.6.83 up to 6.2.108). pdf.js 6 no longer compiles anything from a file, and a PDF's own scripts only run in the pdf.js viewer, which the app doesn't use. See [decisions](decisions.md#pdfjs-6-the-legacy-build-loaded-as-a-module). pdf-lib (`PDFLib.PDFDocument.load()` in `export.js`, used to add the uploaded log PDF to the manifest check PDF) does not go through `openPdf()`: it only copies the file's objects into the new PDF and does not run anything from it.

**Manifest check**
Numbers come from `readPdf()` (text via pdf.js, scanned pages via OCR), `ocrLpns()` (Tesseract with image clean-up and close-up re-reads) or typing. `extractLpns()` matches `prefix + 8–12 characters`, then repairs look-alike characters in the number part (O/D→0, I/L→1, S→5, B→8, Z→2). `cmpData()` normalises both lists and classifies each LPN as matched, missing or log only.

The prefix preset controls (`#cmpPreset`, `#cmpPfx`, preset save/delete/download buttons) sit inside a closed `<details id="pfxBox">` below the two steps (`.cmpsteps`). `pfxSummary()` in `panels.js` writes the current choice into `#pfxSum` in the summary line: "(all prefixes)" when the list is empty, the preset name when the list matches a named preset, otherwise the typed list. It runs on `change`/`input` of both fields and from `syncSelect()` in `compare.js` (guarded with `typeof pfxSummary === "function"`, since `panels.js` loads later).

**Logo**
`export.js` owns the logo (`loadLogo()`, `showLogo()`, `lpnlogo` in `localStorage`). The original controls (`#logoBtn`, `#logoRm`, `#logoFile`) are still in `index.html` inside the Delivery card, but in a `div.row.dc-logo` with the `hidden` attribute, so they are never shown. The visible buttons are `#setLogo` and `#setLogoRm` in the Settings panel (`HELP.settings`, Logo section). `initSettings()` forwards their clicks to `#logoBtn` / `#logoRm` and calls `showLogo()`, which copies the label and visibility of the hidden buttons onto the Settings ones whenever they exist.

**Reading back exports**
`parseExported()` (import) and `readLog()` (manifest check) find the cell `LPN` in any sheet and read rows below it, and read labelled cells (Date, Received by, Trailer number…) from the side table. Both stop reading LPNs at the first empty cell or at a cell starting "Made with ", so the version line is never read as a pallet, even when there is no blank row above it. Both read an `.xlsx` through the same `sheetGrid(ws)` in `compare.js`: it turns one ExcelJS sheet into a grid of text (`cellText()` for each value) and blanks every cell of a merged block except its top-left cell (the block's `master`), so a merged value (such as the version line or the "Delivery Details" heading) appears once in the grid instead of in every column it spans. `parseExported()` reads only the first sheet; `readLog()` reads every sheet, takes the LPNs from the first, and its grids are also what goes into the log copy tab. If the workbook has no sheets, both stop with "That file has no sheets." App-made PDFs embed the whole log as JSON in the PDF keywords (`LPNLOG2:` prefix), so they import exactly without OCR.

## Phone layout notes

The phone breakpoint is `max-width:759px` in `styles.css`.

- **Pallet table:** `.wrap` normally has its own scroll area (`max-height:60vh; overflow-y:auto`). On phones it is set to `max-height:none; overflow:visible`, so the table scrolls with the page. The `th` cells are `position:sticky; top:0`, and with no scrolling ancestor they stick to the top of the viewport. LPN cells (`td.l`) wrap with `overflow-wrap:anywhere; word-break:break-all`, so a long LPN cannot push the page sideways.
- **Touch targets:** header buttons (`#side button`) are at least 44px tall on phones; `#cmpToggle`, `#manShow` and the Prefix presets summary are at least 44px at every width; the FSDU tick boxes (`#fsdu` and the table's checkboxes) are 32px.

**Entry bar stepping aside (`cmpfocus`)**
An IIFE at the end of `panels.js` runs `upd()` (throttled with a 60ms `setTimeout`, which keeps working when the page is in the background, unlike `requestAnimationFrame`) on window `scroll` and `resize`, on `focusin` inside the entry bar (`.card.entry`), after a click on `#cmpToggle`, and once at load. It hides the bar when all of these are true:

1. the Manifest check body (`#cmpBody`) is open;
2. the top of `#cmpCard` is above 45% of the window height (`innerHeight * 0.45`);
3. the screen matches `(max-width:759px)`;
4. focus is not inside the entry bar.

Hiding toggles `body.cmpfocus`, which slides the bar down with `transform: translateY(105%)` (0.2s transition), and sets `entry.inert`, so its fields and buttons cannot be focused or tapped while off screen. When any condition stops holding, the class and `inert` are removed and the bar slides back.

## Offline and updates

`sw.js` pre-caches the app shell (with `cache:"reload"` to bypass the HTTP cache) and serves app files network-first with `cache:"no-cache"`, so a published change appears on the next load and the cached copy is only used offline. `sw.js` is in its own `SHELL` list, so the page can still read the build number from it when offline. CDN libraries (from cdnjs, jsDelivr and unpkg, plus Google Fonts and Tesseract's language data host, the `CDN` list in `sw.js`) are cache-first in a separate `lpn-libs-v1` cache because their versioned URLs never change. Bumping `CACHE` in `sw.js` installs a new worker; `panels.js` shows the "new version available" banner on `controllerchange`.

## Theming

`applyTheme()` derives every colour token (`--paper`, `--ink`, `--mu`, `--line`, `--sel`, `--onac`…) from two user colours, background and accent, by mixing them with white or black depending on background luminance. Pallet-type colours have separate light and dark values. See `DESIGN.md`.
