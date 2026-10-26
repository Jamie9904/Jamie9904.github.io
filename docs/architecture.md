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
| `export.js` | Spreadsheet styling helpers, Excel log, PDF log and manifest PDF, print, file delivery (download / share sheet / mailto fallback), logo handling, expected-count check | `xlBox`, `xlTitle`, `xlPrint`, `buildLogPdf`, `buildCmpPdf`, `deliver`, `emailVia`, `expectCheck`, `exportLogo` |
| `compare.js` | Manifest check: reading logs and manifests (xlsx, csv, PDF, photos), OCR, prefix presets, comparison, results panel, manifest Excel, live tracking in the log | `readLog`, `readPdf`, `ocrLpns`, `extractLpns`, `cmpData`, `renderCmp`, `manState`, `manLive` |
| `panels.js` | Guide/changelog content, side panel, theming, Settings, saved deliveries (history), import of exported logs, backups, install pop-up, date reminder, remembered names, offline notice, service worker registration | `applyTheme`, `initSettings`, `newDelivery`, `openHist`, `parseExported`, `backupNow`, `checkDate` |
| `sw.js` | Offline shell and library cache | install / activate / fetch handlers |

Scripts are loaded in that order at the end of `index.html`. Later files call functions from earlier ones directly; where an earlier file needs something defined later (for example `summary()` in `core.js` calling `manLive()` from `compare.js`), it checks `typeof fn === "function"` first.

## Data model

- **Current log** (`lpnlog`): `{rows:[{lpn,type,fsdu}], date, recv, notes, expect, trailer, sealIn, sealOut}`. Written by `save()` after every change.
- **Saved deliveries** (`lpnhist`): array of the same shape plus `id` and `saved` timestamp. `pruneHist()` keeps only entries dated from the start of last week (weeks start on Sunday); `pushHist()` also caps the list at 50.
- **Manifest numbers** (`lpncmpman`): the raw text of the manifest box, so live tracking survives a reload.
- **Settings and preferences**: `lpncfg`, `lpntheme`, `lpnlogo`, `lpnnames`, `lpnpresets`, `lpncmppfx`, `lpncmpdate`, `lpnmergelog`, `lpnbackup`, `lpninstallshown`.

Dates are stored as ISO `yyyy-mm-dd` and only formatted for display (`ukDate()` follows the Date format setting).

## Main flows

**Adding a pallet**
`Enter`/Add → `tryAdd()` runs `lpnIssues()` (duplicate, format, prefix list, digit count) → either the warning bar (Skip / Add anyway) or `addValue()` → `rows.push()` → `save()` → `render()` → `summary()` (totals, expected count, live manifest progress, entry-bar counter) → confirmation toast.

**Excel export**
`$("dl").onclick` → `expectCheck()` (first attempt blocked if the expected count differs) → `loadScript()` ExcelJS → build sheet: logo rows, `xlTitle()` band, numbered table and side tables with `xlBox()` borders → `xlPrint()` (A4, fit to width, repeated header row, footer) → `deliver()`. If ExcelJS cannot load, `fallbackXls()` writes an HTML-based `.xls`.

**Email PDF**
`emailVia()` sets email mode and runs the Excel handler; `deliver()` swaps the spreadsheet for the PDF built by `pdfJob` and calls `navigator.share({files})`. If sharing is refused because the user gesture expired, a "Tap to share" button is offered; otherwise the file is saved and a `mailto:` opened.

**Manifest check**
Numbers come from `readPdf()` (text via pdf.js, scanned pages via OCR), `ocrLpns()` (Tesseract with image clean-up and close-up re-reads) or typing. `extractLpns()` matches `prefix + 8–12 characters`, then repairs look-alike characters in the number part (O/D→0, I/L→1, S→5, B→8, Z→2). `cmpData()` normalises both lists and classifies each LPN as matched, missing or log only.

**Reading back exports**
`parseExported()` (import) and `readLog()` (manifest check) find the cell `LPN` in any sheet and read rows below it, and read labelled cells (Date, Received by, Trailer number…) from the side table. App-made PDFs embed the whole log as JSON in the PDF keywords (`LPNLOG2:` prefix), so they import exactly without OCR.

## Offline and updates

`sw.js` pre-caches the app shell (with `cache:"reload"` to bypass the HTTP cache) and serves app files network-first with `cache:"no-cache"`, so a published change appears on the next load and the cached copy is only used offline. CDN libraries are cache-first in a separate `lpn-libs-v1` cache because their versioned URLs never change. Bumping `CACHE` in `sw.js` installs a new worker; `panels.js` shows the "new version available" banner on `controllerchange`.

## Theming

`applyTheme()` derives every colour token (`--paper`, `--ink`, `--mu`, `--line`, `--sel`, `--onac`…) from two user colours, background and accent, by mixing them with white or black depending on background luminance. Pallet-type colours have separate light and dark values. See `DESIGN.md`.
