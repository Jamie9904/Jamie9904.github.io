# Architecture

## Overview

A client-only progressive web app. There is no backend for the app itself: the browser renders the page, holds the state, builds the export files and stores everything in `localStorage`. GitHub Pages only serves static files. The one exception is **Report a problem or idea**, which posts to a small Cloudflare Worker (`tools/feedback-worker`, see [Feedback Worker](#feedback-worker-toolsfeedback-worker)); it is online at `https://lpn-feedback.jamie9904.workers.dev` since build 43; it is the only server the app sends data to.

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
| `core.js` | Global state (`rows`, `cfg`), delivery fields, persistence, table rendering, LPN validation, add flow, undo, sound/vibration, date helpers, script loader | `diag`, `load`, `save`, `render`, `summary`, `lpnDigitsOk`, `lpnIssues`, `tryAdd`, `add`, `hideCheck`, `addValue`, `getDel`/`setDel`, `ukDate`/`isoDate`, `loadScript`, `SRI`, `isTxt`, `cleanCfg`, `cleanRows`, `cleanDel`, `cleanHist`, `cleanNames`, `okLogo` |
| `scan.js` | Live camera scanning and photo decoding; screen wake lock while scanning; input event wiring | `startScan`, `stopScan`, `decodePhoto`, `onCode` |
| `export.js` | Spreadsheet styling helpers, Excel log, PDF log and manifest PDF, print, file delivery (download / share sheet / mailto fallback), logo handling, expected-count check | `xlBox`, `xlTitle`, `xlLines`, `xlLpnWidth`, `xlLpnLines`, `xlMadeWith`, `xlPrint`, `appVersion`, `buildLogPdf`, `buildCmpPdf`, `deliver`, `emailVia`, `expectCheck`, `exportLogo` |
| `compare.js` | Manifest check: reading logs and manifests (xlsx, csv, PDF, photos), OCR, prefix presets, comparison, results panel, manifest Excel, live tracking in the log | `readLog`, `sheetGrid`, `PDFJS_SRC`, `PDF_LOAD_MSG`, `loadPdfJs`, `openPdf`, `readPdf`, `readLogPdf`, `ocrLpns`, `ocrLpnsNow`, `ocrWorker`, `ocrDone`, `ocrRead`, `OCR_READ_MS`, `OCR_MSG`, `dropOcrCache`, `extractLpns`, `lpnsFromText`, `maybeLpn`, `skippedOf`, `oddNote`, `addNums`, `readNote`, `cmpData`, `renderCmp`, `manState`, `manLive` |
| `panels.js` | Guide/changelog content, side panel, theming, Settings (including the Logo buttons), saved deliveries (history), import of exported logs, backups, install pop-up, date reminder, remembered names, offline notice, service worker registration, prefix preset summary, entry bar stepping aside on phones | `applyTheme`, `initSettings`, `newDelivery`, `openHist`, `parseExported`, `backupNow`, `checkBackup`, `reportText`, `downloadReport`, `initFeedback`, `fbQueue`, `fbSave`, `fbPost`, `fbFlush`, `fbShrink`, `checkDate`, `pfxSummary`, `openHelp`, `closeHelp`, `dlgOpen`, `dlgClose`, `pageInert`, `openInstall`, `closeInstall`, `initDemo` |
| `sw.js` | Offline shell and library cache | install / activate / fetch handlers |

Scripts are loaded in that order at the end of `index.html`. Later files call functions from earlier ones directly; where an earlier file needs something defined later (for example `summary()` in `core.js` calling `manLive()` from `compare.js`), it checks `typeof fn === "function"` first.

## Data model

- **Current log** (`lpnlog`): `{rows:[{lpn,type,fsdu}], date, recv, notes, expect, trailer, sealIn, sealOut, exp}`. Written by `save()` after every change. `exp` is `{at, sig}`: when the log was last exported and a hash of its rows (`logSig()`) at that moment, so a later change can be detected.
- **App-made PDFs** carry `LPNLOG2:` + URL-encoded JSON in the keywords: `{app, d, r, n, e, t, si, so, rows:[[lpn, type, fsdu 1/0]]}`. `app` is the version text from `appVersion()`; importing ignores it.
- **Saved deliveries** (`lpnhist`): array of the same shape plus `id` and `saved` timestamp. `pruneHist()` keeps only entries dated from the start of last week (weeks start on Sunday); `pushHist()` also caps the list at 50.
- **Manifest numbers** (`lpncmpman`): the raw text of the manifest box, so live tracking survives a reload.
- **Settings and preferences**: `lpncfg`, `lpntheme`, `lpnlogo`, `lpnnames`, `lpnpresets`, `lpncmppfx`, `lpncmpdate`, `lpnmergelog`, `lpnbackup`, `lpninstallshown`.
- **Unsent reports** (`lpnfeedq`): an array of report objects `{kind, text, app, report, id}` waiting to be sent by **Report a problem or idea** (no photos). `fbSave()` refuses to write a list of more than 5 items or more than 300,000 characters of JSON, and removes the key when the list is empty. Like `lpndiag` it belongs to the device: `backupNow()` and the restore's copy of current values leave it out, and `checkBackup()` ignores it.
- **Problem log** (`lpndiag`): an array of `{t, k, m}` (ISO time, kind cut to 20 characters, message cut to 300 characters), at most 300 entries, oldest dropped first. Written only by `diag()`. It belongs to the device: `backupNow()` leaves it out, `checkBackup()` ignores it, and a restore neither removes nor replaces it.

Dates are stored as ISO `yyyy-mm-dd` and only formatted for display (`ukDate()` follows the Date format setting).

### Saved data is tidied when it is read

Anything in `localStorage` may have come from a restored backup file, so it is checked before use by helpers in `core.js` (and one in `compare.js`). Anything that doesn't fit is dropped or replaced, rather than stopping the app.

| Helper | Used for | What it keeps |
|---|---|---|
| `isTxt(v)` | everywhere below | true only for a string or a number |
| `cleanRows(a)` | `rows` in `lpnlog` and in each saved delivery | entries that are objects with a text `lpn` that isn't blank; `lpn` trimmed and cut to 100 characters; `type` one of `TYPES`, otherwise `"Mixed"`; `fsdu` turned into true/false |
| `cleanDel(o)` | the delivery fields (`DEL_F`) of `lpnlog` and each saved delivery | each field as text cut to 2000 characters (anything else becomes `""`); `date` only if it is `yyyy-mm-dd`; `exp` only if `at` is an ISO time (`isoTime()`) and `sig` is a string, otherwise `null` |
| `cleanHist(a)` | `lpnhist` | each object entry through `cleanDel()` plus `id` (made up as `r<time><n>` if missing), `saved` (an ISO time or `""`) and `rows` through `cleanRows()` |
| `cleanNames(a)` | `lpnnames` | non-blank strings, trimmed, cut to 60 characters, at most 6 |
| `cleanCfg(c)` | `lpncfg` | only keys the default `cfg` has, with the same type; `size` must be `1`, `1.12` or `1.25`, `dateFmt` `uk`, `us` or `iso`, `defType` one of `TYPES` |
| `okLogo(v)` | `lpnlogo` (in `loadLogo()` and restore) | only a `data:image/png` or `data:image/jpeg` base64 data URL, so a saved logo can't point at another website |
| `normList()` (in `compare.js`) | `lpnpresets` | presets whose list is still a usable prefix list after normalising |

`load()`, the `hist` and `names` set-up in `panels.js`, the `cfg` set-up in `core.js`, `loadLogo()` and the `lpnpresets` set-up in `compare.js` all go through these. The delivery notes box also has `maxlength="2000"` in `index.html`, matching the limit in `cleanDel()`.

## Main flows

**Adding a pallet**
`Enter`/Add → `tryAdd()` runs `lpnIssues()` (duplicate, format, prefix list, digit count via `lpnDigitsOk()`) → either the warning bar (Skip / Add anyway) or `addValue()` → `rows.push()` → `save()` → `render()` → `summary()` (totals, expected count, live manifest progress, entry-bar counter) → confirmation toast.

While a warning waits, `pendingAdd` holds the LPN and `tryAdd()` returns `false` straight away. `add()` (Enter or Add) checks `pendingAdd` first: if set, it leaves the typed LPN in `#lpn`, selects it, shows "Answer the check first (Skip or Add anyway), then add <LPN>." in `#msg` and plays `sfx("warn")`, without calling `tryAdd()` (build 41; before, the box was cleared and the LPN lost). Live scan's `onCode()` ignores codes while `pendingAdd` is set. A `keydown` listener in `core.js` clicks `#chkSkip` on Escape when `#chkBar` is showing, unless `#panel` or `#instBox` is open or the key came from an `INPUT`, `SELECT` or `TEXTAREA` other than `#lpn`. It is registered before the Escape listeners in `panels.js` that close the panel and install box. `hideCheck()` clears `pendingAdd` and hides the bar.

**LPN digit counts (`lpnDigitsOk(x)`, `core.js`, build 39).** The one digit-count rule. It upper-cases `x`, removes spaces and needs letters followed by digits (anything else returns `false`). Prefix `IM` (full pallet picks, 2 letters) passes with 10 or 11 digits; any other prefix with 9 or 10. It is used by `lpnIssues()` (warning "has N digits (IM numbers have 10 or 11)" for `IM`, otherwise "has N digits (usually 9 or 10)"), `oddNote(id)`, `photoLpns()` (`.odd`) and the left-out rule in `tidyReads()`. Before build 39 each place had its own 9-or-10 rule, so an 11-digit `IM` number was warned about and a 9-digit one was not.

**`maybeLpn(x)` (`compare.js`, build 40).** `lpnDigitsOk(x)`, or `IM` followed by exactly 9 digits (one digit short, probably a misread). It filters the left-out scans in `extractLpns()` and `lpnsFromText()` (1–3 letters + 9 to 11 digits) and the readings `photoLpns()` puts in `.skipped`, so a 9-digit `IM` number outside the prefix list is still named as left out (build 39 had dropped it).

**`oddNote(id)` (`compare.js`).** The "unusual number of digits" note after manifest or log numbers are read or typed. It splits the box `id` into trimmed, non-empty lines. A line that is letters followed by digits (spaces removed) is listed if it fails `lpnDigitsOk()`; any other line (for example `VLT-004040265` or `004040265`) is listed unless the digits at its end number 9 or 10 (the rule from before build 39, put back in build 40). Up to eight are named, then "and n more".

**Expected-count line**
`summary()` fills `#expInfo` from Expected pallets (`#expect`). If a manifest is loaded and `manState().total` equals the expected number, the line is hidden (the manifest progress line already says the same). Otherwise its class is `expinfo prog` while under the expected count (normal text colour, "(n to go)"), `expinfo ok` when equal (green, "✓ all accounted for") and `expinfo bad` when over (red, "(n more than expected)").

**Undo last pallet**
`#undoLast` pops the newest row and offers Undo through `showUndo()`. Its visibility is set in `summary()`; CSS shows it on phones only.

**Undo bar (`showUndo(text, fn)`, build 42)**
Shows `#undoBar` with the text, hides `#flash` (the "Added" note), and sets `#undoBtn` to hide the bar and run `fn`. The bar hides after 20 seconds (9 before build 42); if focus is inside the bar at that moment, it checks again every 3 seconds instead. On phones (`max-width:759px`) CSS makes it `position:fixed`, centred, `bottom: calc(var(--dockh,220px) + 10px)` (just above the entry bar, `z-index:31`, at most 520px wide); with `body.cmpfocus` (entry bar stepped aside) it sits at `bottom:20px`. `flashAdded()` places `#flash` above the entry bar on phones, plus the Undo bar's height and 8px when the Undo bar is showing.

**Editing an LPN in the log (build 42)**
`render()` puts a `button.lpnedit` in each LPN cell (`td.l`), with `aria-label` "Edit LPN <lpn>", `title` "Tap to edit" and `data-i` set to the row index. CSS makes it look like plain text (no background or border, at least 40px tall, full width, wraps). A click on the cell swaps it for an input; `finish(ok, key)` saves (or cancels) and re-renders, and when it was ended by Enter or Escape (`key` true) it focuses `#body .lpnedit[data-i="<i>"]`, found by row index rather than text, so it works after the LPN changes. Ending by blur doesn't move focus.

**Export menus and Escape (build 42)**
A `keydown` listener in `compare.js` closes `#expMenu` and `#cmpExpMenu` on Escape if open, sets `aria-expanded="false"` on `#expBtn` / `#cmpExpBtn` and focuses that button.

**Excel export**
`$("dl").onclick` → `expectCheck()` (first attempt blocked if the expected count differs) → `loadScript()` ExcelJS → `appVersion()` → build sheet: logo rows, `xlTitle()` band, numbered table and side tables with `xlBox()` borders → `xlMadeWith()` version line → `xlPrint()` (A4, fit to width, repeated header row, footer) → `deliver()` → `markExported()` (skipped when exporting a saved delivery). `deliver()` returns `false` when the user cancels the share sheet, so a cancelled email is not counted as an export. If ExcelJS cannot load, `fallbackXls()` writes an HTML-based `.xls`. In that file the LPN cells have `mso-number-format:'\@'`, and the Pallet Type, FSDU and labelled Delivery Details value cells (Date, Received by, notes and other typed fields) have class `t` (`mso-number-format:"\@"`), so Excel keeps them as text and never treats a typed value starting with `=` as a formula. The count cells in the side table stay numbers.

**Email PDF**
`emailVia()` sets email mode and runs the Excel handler; `deliver()` swaps the spreadsheet for the PDF built by `pdfJob` and calls `navigator.share({files})`. If sharing is refused because the user gesture expired, a "Tap to share" button is offered; otherwise the file is saved and a `mailto:` opened.

**Guide and demo video**
`openHelp("guide", title)` fills `#panelBody` with `DEMO_HTML` followed by `guideToc(HELP.guide)` (the contents bar and the guide sections), then calls `initDemo()`. `DEMO_HTML` (in `panels.js`) is a `div.demo` holding:

- `#demoPlay`, a full-width button (at least 52px tall) labelled "▶ Watch the demo video (40 seconds)";
- `#demoVid`, a `<video hidden controls playsinline preload="none" poster="media/demo-poster.jpg">` with one `<source src="media/demo.mp4" type="video/mp4">` and an `aria-label`;
- `#demoNote`, a hidden `role="status"` paragraph: "The video couldn’t play. Check you’re online, then try again."

`initDemo()` sets `#demoVid`'s `volume` to `0.5`, so the video starts at half volume (the player's own control can turn it up; iPhone Safari ignores a volume set by the page and uses the phone's volume). It also listens for `error` on both the `<source>` and the `<video>` and shows `#demoNote` when either fires. Clicking `#demoPlay` hides the note and the button, shows the video and calls `play()` (a refused `play()` promise is ignored; the user can press play on the controls). `closeHelp()` pauses `#demoVid` if it is on the page before hiding the panel. Each `openHelp()` rebuilds the panel contents, so the button comes back the next time the Guide opens. The CSS (`.demo`, `.demobtn`, `.demo video`, `.demonote` in `styles.css`) keeps the player at most 360px wide, centred, with a 9:16 aspect ratio and a black background.

The video is a same-site file, so the existing `default-src 'self'` in the security policy covers it (there is no separate `media-src`).

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

**Backup and restore (Settings → Backup)**
`backupNow(msgId)` writes every `lpn*` key except `lpndiag` and `lpnfeedq` into `lpn-backup-<date>.json` (`{app:"lpn-pallet-log", version:1, saved, data}`) through `saveOnly()` and now returns `true` or `false`, so callers know whether the file was saved.

Restoring is done in steps, and nothing is changed until the last one:

1. **Choose the file** (`#bkUp` → `#bkFile`). If the file isn't JSON, or `app` isn't `"lpn-pallet-log"`, or `data` isn't an object, the message is "That isn’t a backup from this app."
2. **Check it.** `checkBackup(data)` builds a tidied copy and changes nothing. It skips keys that don't match `^lpn[a-z0-9]*$`, values that aren't strings, and `lpndiag` and `lpnfeedq` (the problem log and unsent reports never come from a backup). `lpnlog` goes through `cleanRows()` and `cleanDel()`, `lpnhist` through `cleanHist()`, `lpnnames` through `cleanNames()`, `lpncfg` through `cleanCfg()`, `lpnpresets` through `normList()` (names cut to 60 characters), `lpnlogo` is kept only if `okLogo()` passes, and `lpntheme` only if both colours pass `hexOk()`. Other `lpn*` strings are copied as they are. If `lpnlog` or any of the JSON keys can't be read, it throws "That backup file is damaged, so nothing was changed."
3. **Ask.** `#bkMsg` says what the backup holds ("This backup has a log of n pallets and n saved deliveries…") and the row `#bkAsk` appears with **Replace my data with this backup** (`#bkGo`) and **Cancel** (`#bkNo`, "Nothing was changed.").
4. **Safety copy.** `#bkGo` first calls `backupNow("bkMsg")`. If that returns `false`, it stops and adds "Your data wasn’t replaced, because the copy of it couldn’t be saved first."
5. **Replace.** It logs "Restoring a backup" with `diag("backup", …)`, keeps a copy of every current `lpn*` value except `lpndiag` and `lpnfeedq`, removes them and writes the checked data. If writing fails (for example the browser is out of storage space), it removes what it wrote, puts the old values back and says "Couldn’t restore that backup because this browser ran out of storage space, so nothing was changed."
6. **Reload by hand.** On success it says "Backup restored. Make sure the copy of your previous data has saved, then reload the app to see the restored data." and shows `#bkDone` with **Reload the app** (`#bkReload`, `location.reload()`). There is no automatic reload, because on phones (iPhone asks first) the safety copy may still be waiting to be saved.

**Starting a new delivery**
`newDelivery()` compares `exported.sig` with `logSig()`. If the log was never exported or has changed since, the first call only shows a reminder (remembered in `newAck`); a second call, or starting from the post-export prompt, saves to history, clears the delivery fields and manifest numbers and resets `exported`.

**Opening PDFs**
Every PDF that pdf.js reads is opened by `openPdf(bytes)` in `compare.js`, which is `pdfjsLib.getDocument({data:bytes}).promise`. Its three callers each run `loadPdfJs()` first.

`loadPdfJs()` loads pdf.js 6.4.299, the "legacy" build (made for older browsers and phones). That build is an ES module, so it is loaded with a dynamic `import()` rather than `loadScript()`. The addresses are in `PDFJS_SRC`: jsDelivr first, then unpkg (cdnjs only hosts the modern build), each with a 15-second limit. The first one that loads becomes `window.pdfjsLib`, and `GlobalWorkerOptions.workerSrc` is set to the matching `pdf.worker.min.mjs` on the same host (pdf.js wraps a worker from another site itself). If `window.pdfjsLib` is already there it returns straight away. If both hosts fail it throws `PDF_LOAD_MSG`: "The PDF reader couldn’t load. Check you’re online, then reload the page and try again. Very old phones can’t read PDFs: type the numbers in the box instead." The service worker saves both files in `lpn-libs-v2` the first time they load, so PDFs can be read offline after one online read.

The three callers:

- `readPdf()` (`compare.js`): a manifest PDF in the Manifest check. It reads the text layer, and if no LPNs are found it renders up to 20 pages to a canvas (scale 2) and reads them with OCR. Both steps use the document `openPdf()` returned.
- `readLogPdf()` (`compare.js`): a log PDF in the Manifest check. It tries the `LPNLOG2:` (or older `LPNLOG|`) keywords first, then the column under the `LPN` heading, then falls back to `readPdf()`.
- `parseExported()` (`panels.js`): importing an exported log PDF in Saved deliveries, which only accepts PDFs with `LPNLOG2:` keywords.

The `LPNLOG2:` data could have been edited by someone, so both readers take only plain values from it: a value is used only if it is a string or number (`isTxt()`), cut to 2000 characters, and anything else (for example an object that ExcelJS would write as a formula or link) becomes `""`. `rows` must be an array of arrays whose first item is non-blank text; the LPN is trimmed and cut to 100 characters. `parseExported()` also keeps the date only if it is `yyyy-mm-dd`. In `readLogPdf()` the same applies to the date and receiver that go into the log copy tab (`logGridFrom()`).

Where the message appears: importing in Saved deliveries and loading a log PDF in the Manifest check show the error's own text, so they show `PDF_LOAD_MSG`. The Manifest check's PDF button (`#cmpPdfFile`, several files at once) stops at the first file that fails with `PDF_LOAD_MSG` and shows only that message, instead of listing every file as unreadable.

The protection against harmful PDFs is the pdf.js version: 6.4.299 is past the known flaws where a crafted PDF could run code (CVE-2024-4367, fixed in 4.2.67; CVE-2026-16633 / GHSA-hq66-cqwq-w95j, which affected 5.6.83 up to 6.2.108). pdf.js 6 no longer compiles anything from a file, and a PDF's own scripts only run in the pdf.js viewer, which the app doesn't use. See [decisions](decisions.md#pdfjs-6-the-legacy-build-loaded-as-a-module). pdf-lib (`PDFLib.PDFDocument.load()` in `export.js`, used to add the uploaded log PDF to the manifest check PDF) does not go through `openPdf()`: it only copies the file's objects into the new PDF and does not run anything from it. `buildCmpPdf()` deletes each copied page's `/AA` (page-open actions, which can be scripts) and `/Annots` (links and other annotations) before adding it, so a log PDF from outside can't pass them on in the file that gets emailed and printed.

**Manifest check**
Numbers come from `readPdf()` (text via pdf.js, scanned pages via OCR), `ocrLpns()` (Tesseract with image clean-up and close-up re-reads) or typing. `extractLpns(text, any)` (photo text) matches `prefix + 8–12 characters` with at least six digits, then repairs look-alike characters in the number part (O/D→0, I/L→1, S→5, B→8, Z→2); with `any` true it ignores the prefix list and takes any 1–3 letter prefix. `lpnsFromText()` (PDF text) matches `prefix + 8–12 digits` with no repair. `cmpData()` normalises both lists and classifies each LPN as matched, missing or log only.

**Reading a photo (`ocrLpns()`, builds 35 to 37).** Manifest photos, log photos (`readPhoto()`, `readLogPhoto()`) and scanned PDF pages all go through it:

1. `prep(f)` scales the photo (long side up to 2400px, at most 3×; larger photos down to 3200px), turns it grey (0.299 R + 0.587 G + 0.114 B), then makes it black and white against the local paper background. The page is divided into square cells about 1/20 of the longer side (at least 8px), each cell's average grey is worked out in JS, and the background at each pixel is blended bilinearly between the four nearest cell centres. A pixel darker than 0.85 × its background becomes black, everything else white. No second full-size canvas is made and no browser scaling is used for the background, so every browser gives the same result.
2. The main Tesseract pass uses page segmentation mode 11 (sparse text) with the letters-and-digits whitelist.
3. Each word that gives exactly one match (`extractLpns(word, true)`) is re-read close up (`cropScaled()`, mode 7, single line). Each becomes an item `{raw, first, again}`: the word's raw text, the first reading and the close-up reading (or `null`). Matches in the whole page text that no word gave are added as `{raw: x, first: x, again: null, whole: true}` (build 37: `whole` marks them as whole-page text readings, which don't get the double vote below). After tidying, `ocrLpns()` keeps the item list in `window.__ocrItems` so the photo reading check (`tools/ocr-check`) can show what the reader saw.
4. `photoLpns(items)` runs `tidyReads(items)`, logs any readings it left out (`.ignored`) as an `ocr` problem log entry "Ignored as not looking like this page's LPNs: <readings>", then keeps the readings that pass `okPfx()` (all of them when the prefix list is empty). Readings outside the list that pass `maybeLpn()` (since build 40; `lpnDigitsOk()` in build 39) are returned as `.skipped`. Since build 37, readings `tidyReads()` left out that pass `lpnDigitsOk()` are returned as `.odd`, so the per-photo note can name them.

**One reader per batch (build 41).** `ocrLpns(f)` only queues the work: it chains `ocrLpnsNow(f)` onto the promise `ocrQ` (failures swallowed in the chain), so reads run one at a time even when manifest photos and a log photo are read at once. Without the queue, two reads would share the reader and one batch's `setParameters()` (mode 11 for the page, mode 7 for close-ups) could change the other's in the middle of a read. `ocrLpnsNow()` gets the reader from `ocrWorker()`, which reuses `ocrW` (the promise of a running reader) or starts one with `Tesseract.createWorker("eng")`, raced against a 90-second timer. If the timer wins, the reader that finishes starting later is terminated rather than left running. `ocrWorker()` also cancels the pending idle close. When the read ends, the `finally` block calls `ocrDone(w, ok)`: on success it sets a 15-second timer (`ocrIdle`) that terminates the reader and clears `ocrW`; on any failure it terminates the reader at once, so the next photo starts a fresh one. `ocrW` is only cleared if it still points to the reader being closed. Each `recognize()` (the page pass and each close-up) goes through `ocrRead(w, img)`, which fails after `OCR_READ_MS` (120 seconds) with "The photo reader stopped. Try the photo again." and `stuck: true`. A failed close-up normally just leaves `again` as `null`, but a stuck one is thrown on (`e.stuck`), so a hung reader fails the photo instead of each close-up waiting 2 minutes. Before build 41 each photo started and terminated its own reader.

**`tidyReads(items)`** works on one photo at a time:

- **Page pattern.** Each distinct number votes for each shape (prefix + digit count, e.g. `VLT#9`) of its first and close-up readings. When the raw text had O, D or Q straight after the prefix letters and the reading has at least 10 digits starting with 0, it also votes for the shape with that 0 dropped. Since build 37 a vote is weighted: a first reading that is exactly the raw text (no look-alike letters turned into digits) and not a whole-page text reading (`whole`) counts 2, everything else 1, and one number gives a shape at most its highest weight. A shape counts only if it appears in at least 2 numbers; for each prefix the shape with the highest total weight is that prefix's pattern. The weighting means a tie between, say, 9 and 10 digits goes to what was printed plainly (on GitHub's real reader, two of three `RUN` numbers read with an O between `RUN` and the 0s).
- **Choosing a reading.** With no pattern, the close-up reading is used (or the first if there is none). Otherwise the first reading that fits a pattern is used, checking the first reading before the close-up, because the close-up is of the black-and-white image.
- **Mending.** If neither fits, the close-up then the first reading are tried against each pattern: a reading of the right length whose prefix characters are the pattern's letters or a look-alike digit for them (`LOOK`: 0 for O/D/Q/U, 1 for I/L/T/J, 2 for Z, 5 for S, 6 for G, 8 for B) gets the pattern's prefix (`VL1004040355` → `VLT004040355`); a reading one longer that starts with the prefix and `0` loses that `0`. A mended number that equals another number's first reading on the page is not used. An extra 0 is only dropped when the raw text had O, D or Q straight after the prefix. Anything not mended is kept as read.
- **Leaving out made-up codes (builds 36 and 37).** The result is an array of readings with an `.ignored` array attached. When the page has at least one pattern, a reading whose prefix matches no pattern's prefix goes into `.ignored` instead of the result if it fails `lpnDigitsOk()` (build 39; before, if its digit count was below 9 or above 10) (specks on the paper read as `DFA51400180` on a page of `VLT` numbers), or (build 37) if its prefix length differs from every pattern's prefix length (`CO1080002090`, `RR1004040021` and `L1121100001` among `VLT` numbers, as GitHub's real reader saw `vlt.jpg`). A reading of another prefix of the same length as a page prefix that passes `lpnDigitsOk()` is kept (it may be a real LPN and is reported by the prefix list if it isn't listed), and so is a short or long reading of a page prefix (`QUB00189918` next to `QUB` numbers). Prefixes in `KNOWN_PFX` (`["IM"]`, the two-letter prefix used for full pallet picks) are never left out, whatever the rest of the page looks like. With no pattern (for example a single reading) nothing is left out.

**Numbers left out by the prefix list.** When a prefix list is set, PDF text (`lpnsFromText()`) also scans for any 1–3 letters followed by 9 to 11 real digits, keeps those that pass `maybeLpn()` (build 40: `lpnDigitsOk()` or `IM` + 9 digits; `extractLpns()` does the same for photo text), and attaches the ones not kept to the result as `.skipped`; `skippedOf(all, kept, pf)` removes duplicates, numbers already kept, and numbers that start with a listed prefix followed by a digit. For photos, `photoLpns()` reports tidied readings outside the list that pass `maybeLpn()`, so a look-alike reading that was mended to a listed prefix is kept, not reported. With an empty prefix list `.skipped` is empty. `readPdf()` carries the text layer's `.skipped` and adds those from OCR'd pages.


**Per-file notes.** `addNums(list, id)` now returns `{added, dup}` (new numbers and numbers already in the box). `readNote(tag, list, result, pdf)` turns that into one sentence: "<tag>: found n LPNs, n new, n already in the list."; when nothing was found and nothing skipped, "No LPNs could be read: try a closer, sharper photo in good light." (or "…from this PDF." when `pdf` is true); when numbers were skipped, it names up to four and their prefixes, with "If they are LPNs, add <prefixes> under Prefix presets (or clear the prefixes) and read the photo again" ("PDF" instead of "photo" for PDFs, singular wording for one number). Since build 37, when the list has `.odd` readings it adds "n other readings (<up to four>…) didn’t look like the other LPNs on this page, so they were left out. If one is a real LPN, type it in the box." (singular wording for one). The handlers for `#cmpPhotoFile`, `#cmpPdfFile` and `#cmpLogPhotoFile` read the files one at a time, catch each file's error as its own note ("<tag>: couldn’t be read (reason).") and carry on, then show all the notes in `#cmpMsg` followed by the usual "Check the numbers…" line. `#cmpPdfFile` still stops at the first file that fails with `PDF_LOAD_MSG`.

**Problem log**
`diag(kind, msg)` at the top of `core.js` appends `{t, k, m}` to `lpndiag` in `localStorage`, keeps the last 300, and never throws (a damaged or non-array value starts a new list). `core.js` also adds `window` listeners for `error` (message plus file name and line) and `unhandledrejection` ("Unhandled: " plus the reason's message), both logged as `error`. Other callers:

| Kind | Where | What is logged |
|---|---|---|
| `manifest` | `compare.js` file handlers | the start of a manifest photo batch (prefixes, how many numbers already listed), each photo's type and size, each file's found/added/already listed counts, skipped numbers and (build 37) readings "left out as unlike the page", and each failure with its message |
| `ocr` | `ocrLpns()`, `photoLpns()` | word count, LPNs found, up to 10 skipped numbers and the first 150 characters of the text; readings `tidyReads()` left out ("Ignored as not looking like this page's LPNs: …") |
| `pdf` | `readPdf()` | file name, page count, characters of text, LPNs found and up to 10 skipped numbers |
| `backup` | restore (`#bkGo`) | "Restoring a backup" |

`reportText()` in `panels.js` builds a plain text report (since build 42 shared by **Download problem report** and **Report a problem or idea**): a heading, the time, `appVersion()`, `navigator.userAgent`, screen and window size and pixel ratio, installed (display-mode standalone or `navigator.standalone`), online and service worker state; then pallets in the log, `#date`, `#expect`, the prefixes from `getPfx()`, the numbers in `#cmpNums` and `#cmpLogNums`, and the text of `#cmpMsg`; then every `lpndiag` entry that is an object, as "time  kind  message". Entries that aren't objects are skipped, so a damaged log still gives a report. `downloadReport()` (Settings, `#diagDl`) saves it with `saveOnly()` as `lpn-problem-report-<localToday()>.txt` (`text/plain`) and `#diagMsg` says whether it worked. `#diagClear` removes `lpndiag`. The feedback code also logs `feedback` entries: sent, saved to send later, a saved report refused and removed, and "Sent n saved report(s)".

**Report a problem or idea (`panels.js`, build 42; a box since build 44)**
Since build 44 the form is in `index.html`, not in `HELP.settings`: `#fbShade` (fixed, `z-index: 60`) and `section#fbBox` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="fbTitle"`, fixed and centred with `translate(-50%,-50%)`, `z-index: 61`, above the panels (`#panel` is 40) and the install box (60), `width: min(480px, 100% - 32px)`, scrolls if taller than the screen less 32px). Inside: a short intro, radio buttons `fbKind` (`problem`, checked, or `idea`) in `fieldset.fbkind`, `#fbText` (`maxlength="4000"`), `#fbPhotoBtn` / `#fbPhotoRm` / `#fbPhotoName` with a hidden `#fbPhoto` file input (`accept="image/*"`), `#fbInc` ("Attach the problem report", checked), `#fbSend`, `#fbClose` and `#fbMsg` (`role="status"`, `aria-live="polite"`). Both are hidden when printing, as is the Report button.

The **Report** button `#btnReport` (class `report`, `aria-label="Report a problem or idea"`, speech-bubble icon and "Report") is the last item in the header's brand row; `margin-left: auto` pushes it to the right, and it is at least 44×44px. Settings has `#fbOpenSet` ("Report a problem or idea") under its own heading, and the Guide has `#fbGuide` (a `.linkbtn`); the `#panelBody` click listener calls `openFeedback()` for either and leaves the panel open.

- `openFeedback()`: does nothing if the box is already open. Remembers `document.activeElement` in `fbOpener`, shows the shade and box, calls `pageInert(true)` and sets `inert` on `#panel` and `#instBox`, puts the number of waiting reports (`fbQueue().length`) in `#fbMsg` (or clears it), and focuses `#fbText` on the next tick.
- `closeFeedback()`: does nothing if the box is closed. Hides it, removes `inert` from `#panel` and `#instBox`, calls `pageInert(false)` only when both of those are hidden (so a panel left open keeps the page behind set aside), and focuses `fbOpener` if it is still in the page.
- `initFeedback()` runs once when `panels.js` loads (before build 44 `initSettings()` called it each time Settings opened). It wires `#btnReport`, `#fbClose` and `#fbShade` to open and close, a capturing `keydown` listener that on Escape while the box is open stops the event (so the panel under it stays open) and closes the box, and the photo and Send handlers below.

- `fbShrink(file)`: `createImageBitmap()`, scaled so the long side is at most 1600px, drawn on a canvas, `toDataURL("image/jpeg", .8)`, or `.6` if that is over 1,900,000 characters. The result is kept in `fbPhotoData`.
- **Send:** blank text → "Write what happened first."; `FEEDBACK_URL` empty → "Reporting isn’t set up yet. Use Download problem report below and send the file to Jamie instead." Otherwise it builds `{kind, text, app: appVersion(), report: #fbInc ? reportText() : "", photo}` and calls `fbPost()`. On success the form is cleared and the message is "Sent. Thank you!"; 1.5 seconds later the box closes if that message is still showing.
- `fbPost(item)`: `POST` JSON to `FEEDBACK_URL`. A network failure, or an answer of 5xx or 429, throws with `retry: true`; any other failure throws with the server's `error` text (cut to 300 characters) and `retry: false`.
- **Retry:** the photo is removed (with a note asking to send it again), the report is cut to 60,000 characters, an `id` (time and random letters, base 36) is added, and the item is appended to `fbQueue()` and saved with `fbSave()`. If `fbSave()` refuses (over 5 items or 300,000 characters) the message says there is no room. A refused report (no retry) shows the server's message and isn't kept.
- `fbFlush()`: does nothing if `FEEDBACK_URL` is empty, a flush is already running (`fbBusy`) or the browser is offline. It sends the first queued item (without its `id`), then reads the list again from `localStorage` before removing that `id`, so an item saved by **Send** during the flush isn't lost. It stops at the first retryable failure; a refused item is logged and removed. It runs on the window `online` event and 4 seconds after `panels.js` loads.
- `FEEDBACK_URL` in `panels.js` is `https://lpn-feedback.jamie9904.workers.dev/report` since build 43, when the Worker went online; its origin is allowed in `connect-src` (see Security policy). If it is ever set back to `""`, **Send** shows the "isn’t set up yet" message above and `fbFlush()` does nothing.

The prefix preset controls (`#cmpPreset`, `#cmpPfx`, preset save/delete/download buttons) sit inside a closed `<details id="pfxBox">` below the two steps (`.cmpsteps`). `pfxSummary()` in `panels.js` writes the current choice into `#pfxSum` in the summary line: "(all prefixes)" when the list is empty, the preset name when the list matches a named preset, otherwise the typed list. It runs on `change`/`input` of both fields and from `syncSelect()` in `compare.js` (guarded with `typeof pfxSummary === "function"`, since `panels.js` loads later).

**Logo**
`export.js` owns the logo (`loadLogo()`, `showLogo()`, `lpnlogo` in `localStorage`). The original controls (`#logoBtn`, `#logoRm`, `#logoFile`) are still in `index.html` inside the Delivery card, but in a `div.row.dc-logo` with the `hidden` attribute, so they are never shown. The visible buttons are `#setLogo` and `#setLogoRm` in the Settings panel (`HELP.settings`, Logo section). `initSettings()` forwards their clicks to `#logoBtn` / `#logoRm` and calls `showLogo()`, which copies the label and visibility of the hidden buttons onto the Settings ones whenever they exist.

**Reading back exports**
`parseExported()` (import) and `readLog()` (manifest check) find the cell `LPN` in any sheet and read rows below it, and read labelled cells (Date, Received by, Trailer number…) from the side table. Both stop reading LPNs at the first empty cell or at a cell starting "Made with ", so the version line is never read as a pallet, even when there is no blank row above it. Both read an `.xlsx` through the same `sheetGrid(ws)` in `compare.js`: it turns one ExcelJS sheet into a grid of text (`cellText()` for each value) and blanks every cell of a merged block except its top-left cell (the block's `master`), so a merged value (such as the version line or the "Delivery Details" heading) appears once in the grid instead of in every column it spans. `parseExported()` reads only the first sheet; `readLog()` reads every sheet, takes the LPNs from the first, and its grids are also what goes into the log copy tab. When the Manifest check spreadsheet writes the log copy tab, each cell value is written as a number if it is one and otherwise as a string, so no object from a read file reaches ExcelJS as a formula or link. If the workbook has no sheets, both stop with "That file has no sheets." App-made PDFs embed the whole log as JSON in the PDF keywords (`LPNLOG2:` prefix), so they import exactly without OCR.

## Phone layout notes

The phone breakpoint is `max-width:759px` in `styles.css`.

- **Pallet table:** `.wrap` normally has its own scroll area (`max-height:60vh; overflow-y:auto`). On phones it is set to `max-height:none; overflow:visible`, so the table scrolls with the page. The `th` cells are `position:sticky; top:0`, and with no scrolling ancestor they stick to the top of the viewport. LPN cells (`td.l`) wrap with `overflow-wrap:anywhere; word-break:break-all`, so a long LPN cannot push the page sideways.
- **Messages:** `.msg` (every status line, such as `#cmpMsg`, `#bkMsg` and `#diagMsg`) has `overflow-wrap:anywhere` at every width, so a long word in a message, such as a library address in an error, wraps instead of widening the page.
- **Touch targets:** header buttons (`#side button`) are at least 44px tall on phones; `#cmpToggle`, `#manShow` and the Prefix presets summary are at least 44px at every width; the table's FSDU tick boxes are 32px. On phones the entry bar's `#fsdu` is 40×40px and the scan option buttons (`.entry .btnrow button`) are at least 48px tall (build 41).
- **Header buttons:** at `max-width:620px`, `#side` wraps (`flex-wrap:wrap`) and each button is `flex:1 1 auto`, so they size to their text and wrap instead of widening the page with Extra large text.
- **Live scan camera:** on phones `.entry #video` has `max-height:clamp(110px,24vh,200px)`, so `#smsg` and **Stop scanning** stay on screen. `#chkBar` sits before `#scanbox` in `index.html` (above the camera); `#smsg` is `role="status"` with `aria-live="polite"`.
- **Focus clear of the entry bar:** an IIFE in `panels.js` watches `.entry` with a `ResizeObserver` and writes its height to `--dockh` on `<html>`; on phones `html` has `scroll-padding-bottom: calc(var(--dockh,220px) + 12px)`, so a focused control scrolls above the fixed bar.
- **"Added" note:** `.flash` has `pointer-events:none`, so the confirmation can't take taps meant for the buttons under it. It moves up above the Undo bar while that shows (see Undo bar).
- **Undo bar:** fixed just above the entry bar using `--dockh` (see Undo bar under Main flows). Known minor issue: with the Manifest check open (`body.cmpfocus`) it is at `bottom:20px` and can cover one results row for up to 20 seconds.

## Dialogs and focus

`#panel` (Guide, Changelog, Settings, Saved deliveries) and `#instBox` (install box) have `role="dialog"` and `aria-modal="true"`. `openHelp()` calls `dlgOpen($("panelClose"))` and `openInstall()` calls `dlgOpen()` with the install box's first visible button. The report box `#fbBox` (build 44) has its own opener and close handling, `openFeedback()` / `closeFeedback()`, and can sit on top of either (see Report a problem or idea). `dlgOpen()` remembers `document.activeElement` in `dlgOpener` (only if nothing is remembered yet), makes `main` and `header.top` `inert` (`pageInert(true)`) and focuses the given element on the next tick. `closeHelp()` and `closeInstall()` call `dlgClose()` only if their dialog was open; `dlgClose()` returns early while either dialog is still open, otherwise removes `inert` and focuses the remembered opener if it is still in the page. `initDemo()` focuses the video when **Watch the demo video** is pressed. `index.html` has `lang="en-GB"`.

Other labels and structure (build 42): the last pallet-table heading holds `<span class="sr">Remove</span>` (visually hidden); the Saved deliveries **Open**, **Email PDF** and **Delete** buttons get `aria-label`s with the delivery date from `ukDate()`; `renderCmp()` makes the results headings `h3` (CSS `.cmpres h3`, `.m` and `.b` colours as before); `#cmpSum span` text uses `--ink` instead of `--mu`; `.cmpres summary` is at least 44px tall (`padding:10px 0`); `#dockCnt` has no `aria-live`. Guide links (`a[data-g]`) scroll with `behavior: "auto"` when `prefers-reduced-motion: reduce` matches, otherwise `"smooth"`.

**Entry bar stepping aside (`cmpfocus`)**
An IIFE at the end of `panels.js` runs `upd()` (throttled with a 60ms `setTimeout`, which keeps working when the page is in the background, unlike `requestAnimationFrame`) on window `scroll` and `resize`, on `focusin` inside the entry bar (`.card.entry`), after a click on `#cmpToggle`, and once at load. It hides the bar when all of these are true:

1. the Manifest check body (`#cmpBody`) is open;
2. the top of `#cmpCard` is above 45% of the window height (`innerHeight * 0.45`);
3. the screen matches `(max-width:759px)`;
4. focus is not inside the entry bar.

Hiding toggles `body.cmpfocus`, which slides the bar down with `transform: translateY(105%)` (0.2s transition), and sets `entry.inert`, so its fields and buttons cannot be focused or tapped while off screen. When any condition stops holding, the class and `inert` are removed and the bar slides back.

## Feedback Worker (`tools/feedback-worker`)

A Cloudflare Worker (`worker.mjs`, configured by `wrangler.toml`: name `lpn-feedback`, `REPO = "Jamie9904/lpn-feedback"`, `ALLOWED_ORIGIN = "https://jamie9904.github.io"`, and the GitHub token as the secret `GITHUB_TOKEN`). The site is public and can't hold a GitHub key, so the Worker holds it. It is not part of the site and not in the site zip.

- `OPTIONS` → 204 with CORS headers (`Access-Control-Allow-Origin` is always `ALLOWED_ORIGIN`). Anything but `POST /report` → 404. An `Origin` other than `ALLOWED_ORIGIN` → 403. No token or repo → 503 "Reporting isn't set up yet." A body over 2,400,000 characters → 413.
- `check(o)` validates: `website` must be empty (a field only spam robots fill in); `kind` must be `problem` or `idea`; `text` 1 to 4000 characters after trimming; `report` cut to 60,000; `app` kept only if it matches `^LPN Pallet Log( v[\d.]+)?( \(build \d+\))?$`, so nothing else can reach the issue outside a text block; `photo` only as `data:image/jpeg;base64,…` whose data starts `/9j/` (JPEG bytes FF D8 FF), at most 1,600,000 bytes. Failures → 400 with a plain message.
- **Limits:** one Durable Object (`Limits`, `idFromName("all")`) counts across all of Cloudflare's servers: at most `PER_HOUR` = 10 reports an hour per address (`CF-Connecting-IP`), `DAY_ISSUES` = 50 reports and `DAY_PHOTOS` = 20 photos a day in total (UTC day). Over a report limit → 429; over the photo limit the report is still made without its photo, with a note. An alarm a day after the first count clears all its storage.
- **Issue:** `issueOf()` gives the title "Problem: " or "Idea: " plus the first line (up to 70 characters, "…" if cut), and a body naming the kind and app version, with the text and the problem report (in `<details>`) each in a `~~~~text` block made by `block()` (any run of four or more `~` in the text is changed to `∼`), so they can't add links, mentions or formatting.
- **Order:** the issue is created first (`POST /repos/<REPO>/issues`). Then, if there is a photo, it is saved with `PUT /contents/photos/<yyyy-mm>/issue-<n>-<time>.jpg` and the issue body is updated (`PATCH`) with a link and the image. A failed photo step only adds a note; a failed issue never leaves a stray photo.
- **GitHub failures:** 401, 403, 429, 5xx or no answer → 503 ("It will be tried again", so the app keeps the report); any other status → 422, which the app doesn't retry.
- Answer: `{ok:true, issue, note}` or `{ok:false, error}`.

`.github/workflows/feedback-worker.yml` (**Deploy feedback Worker**) deploys it, by hand (`workflow_dispatch`) or on a push to `main` that changes `tools/feedback-worker/**` or the workflow. Its first step checks for the three repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `FEEDBACK_GITHUB_TOKEN`: on a push with any missing it skips with a notice; run by hand it fails naming the missing ones. Then `npx wrangler@3.114.0 deploy` (the address goes in a notice; if the deploy fails, the lines after `ERROR` in wrangler's output, with colour codes removed and cut to 500 characters, become the error notice "Feedback Worker deploy failed", so Cloudflare's own reason shows without opening the log), a separate step that is the only one given `FEEDBACK_GITHUB_TOKEN` and passes it on stdin to `wrangler secret put GITHUB_TOKEN`, and a check that `OPTIONS <address>/report` with the app's origin answers 204. That check tries up to 24 times, 5 seconds apart (about 2 minutes), because a new workers.dev address can take a while to start answering; it then gives a notice with the `/report` address, or fails with "didn't answer after 2 minutes (HTTP …)" and a hint to run it again in a few minutes.

Run by hand, the workflow has a tick box input `test_report` ("Also send a test report", off by default). When ticked, a last step posts `{kind: "idea", text: "Test report from the deploy check. Safe to close.", app: "LPN Pallet Log"}` to `/report` with the app's origin. A 200 gives a notice that a test issue was made in `lpn-feedback`; any other answer fails with the HTTP code, the Worker's answer and a reminder that the GitHub token needs Issues read and write on `lpn-feedback`.

## Library loading and fingerprints (SRI)

`loadScript(src, test)` in `core.js` adds a `<script>` with `crossOrigin="anonymous"` and, if `src` is in the `SRI` map, `integrity` set to its `sha384-…` hash. The browser then refuses a file that doesn't match, so a changed copy on a CDN can't run in the app; the feature fails as if the library couldn't load. `SRI` lists both addresses (cdnjs and jsDelivr) of ExcelJS 4.4.0, jsPDF 2.5.1, jspdf-autotable 3.8.2 and pdf-lib 1.17.1, plus Tesseract.js 5.1.1 and ZXing 0.21.3 (jsDelivr only). `loadZX()` in `scan.js` builds its own script tag and sets the same two attributes from `SRI` (checking `typeof SRI==="object"` first).

pdf.js has no entry: it is loaded with `import()` (see Opening PDFs), not through a script tag. The files Tesseract fetches for itself (its worker, engine and language data, from jsDelivr and `tessdata.projectnaptha.com`) aren't checked either; the comment in `compare.js` says they load in a way that can't be checked.

**Photo reader failures.** `ocrLpnsNow()` and `ocrWorker()` turn any failure to load Tesseract, or to start its worker within 90 seconds (`Tesseract.createWorker("eng")` raced against a timer; the first use downloads the language data), into `OCR_MSG`: "The photo reader couldn’t load. Check you’re online and try again, or type the numbers in the box instead. (Reading photos needs iOS 16 or newer on an iPhone.)" Before throwing it runs `dropOcrCache()`, which deletes every saved file in the `lpn-libs*` caches whose address contains `tesseract` or `tessdata`, so the next try downloads them again.

## Security policy

`index.html` sets a Content Security Policy with a `<meta http-equiv="Content-Security-Policy">` tag in `<head>`, before the five app scripts. The exact text:

```
default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com 'wasm-unsafe-eval'; worker-src 'self' blob:; child-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://tessdata.projectnaptha.com https://lpn-feedback.jamie9904.workers.dev; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src blob:; object-src blob:; base-uri 'none'; form-action 'none'
```

What each part is for in this app:

| Directive | Used by |
|---|---|
| `script-src` | The app's own scripts; `loadScript()` and `loadZX()` from cdnjs and jsDelivr; pdf.js `import()` from jsDelivr or unpkg; `'wasm-unsafe-eval'` for Tesseract's WebAssembly engine (no general eval) |
| `worker-src`, `child-src` | The pdf.js and Tesseract background workers (`child-src` for older Safari) |
| `connect-src` | `fetch` of app files and `sw.js` (`appBuildP`), library downloads made by the service worker, Tesseract's engine and its language data from `tessdata.projectnaptha.com`; `fbPost()` to the feedback Worker (`https://lpn-feedback.jamie9904.workers.dev`, that exact origin only, since build 43) |
| `img-src` | The logo (stored as a `data:` image), canvases turned into images |
| `font-src` | The self-hosted fonts in `fonts/` |
| `style-src 'unsafe-inline'` | `style` attributes and `style.cssText` set from code |
| `frame-src`, `object-src` | `printBuf()` loads the PDF into a hidden `<iframe>` from a `blob:` address |
| `base-uri`, `form-action` | Set to `'none'`: nothing can change the base address or submit a form |

`connect-src` names the feedback Worker's exact origin rather than all of `*.workers.dev`, so the page can't send data to any other Worker. `tests/run.js` checks that the origin of `FEEDBACK_URL` is in `connect-src` (see testing).

Older Safari doesn't understand `'wasm-unsafe-eval'`, so reading photos needs iOS 16 or newer on an iPhone. A new library host, or a library that fetches from a new place, must be added to the policy, or it is blocked. See [decisions](decisions.md#content-security-policy-in-the-page-build-31).

## Offline and updates

`sw.js` pre-caches the app shell (with `cache:"reload"` to bypass the HTTP cache) and serves app files network-first with `cache:"no-cache"`, so a published change appears on the next load and the cached copy is only used offline. `sw.js` is in its own `SHELL` list, so the page can still read the build number from it when offline. Bumping `CACHE` in `sw.js` installs a new worker; on `activate` it deletes every cache except `CACHE` and `LIBS`. `panels.js` shows the "new version available" banner on `controllerchange`.

Requests whose path ends in `.mp4` or `.webm` are not handled by the service worker at all (the `fetch` handler returns without calling `respondWith`), so the browser loads them itself. Browsers fetch video in pieces (range requests answered with partial `206` responses), and the Cache API can't store those, so the demo video is not in `SHELL` and is never available offline. `media/demo-poster.jpg` is not in `SHELL` either; it goes through the normal network-first handler and is saved once it has loaded.

Libraries from the hosts in the `CDN` list (`cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `unpkg.com` and Tesseract's language data host `tessdata.projectnaptha.com`; the Google Fonts hosts were removed, as the fonts are self-hosted) are cache-first in a separate cache, `LIBS = "lpn-libs-v2"`, because their versioned URLs never change. The rules:

- **What is saved:** only complete downloads (`res.ok`). An opaque (unchecked, `no-cors`) response is saved only for Tesseract's own files (`tesseract` or `tessdata` in the address), as those can only be fetched that way; `dropOcrCache()` clears them if the reader fails.
- **What answers a request:** a saved opaque copy is never used to answer a request that isn't `no-cors` (such as a script loaded with `crossorigin` and an integrity hash); the worker fetches a fresh copy instead.
- **Why v2:** `lpn-libs-v1` could hold a failed or unchecked download. Renaming the cache makes the `activate` step delete v1 once, so every library is downloaded fresh after this update.

## Theming

`applyTheme()` derives every colour token (`--paper`, `--ink`, `--mu`, `--line`, `--sel`, `--onac`…) from two user colours, background and accent, by mixing them with white or black depending on background luminance. Pallet-type colours have separate light and dark values. See `DESIGN.md`.

Since build 41 two tokens are for contrast:

- `--bd`: the border of inputs, selects, buttons and text areas, `--paper` mixed 42% towards white (dark themes) or 48% towards black (light themes), at least 3:1 against the paper. `--line` stays for dividers and table rules.
- `--act`: the accent used as text and outlines (panel headings, the version badge, `.linkbtn`, the focus outline and focused border). It starts as the accent and is mixed towards `--ink` in steps of 10% (up to 10 steps) until its contrast is at least 4.5:1 against both `--paper` and `--bg`. A focused primary button (`button.p`) gets an `--ink` outline instead.

The CSS falls back to `--line` and `--ac` where these aren't set.
