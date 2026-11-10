# Technical decisions

## No backend; data on the device

Everything runs in the browser and is stored in `localStorage`.

- **Why:** the app needs to be free to host (GitHub Pages), work with no signal on a loading bay, and need no accounts or IT involvement.
- **Trade-off:** data is per device and per browser. There is no sharing between devices and clearing site data loses it. This is mitigated by backup/restore (all `lpn*` keys to a JSON file), a "last backed up" note in Saved deliveries, and by exports being the real record.
- **Consequence:** because a backup file can be edited or damaged before it is restored, saved data can't be trusted just because the app wrote it (see [Saved data is tidied when read](#saved-data-is-tidied-when-read)).
- **Trade-off:** history is deliberately short (this week and last week, max 50 entries) to stay well inside `localStorage` limits. Since build 60 "this week and last week" is judged by the later of the delivery date and the day it was saved (see [Saved deliveries kept by the later of date and save day](#saved-deliveries-kept-by-the-later-of-date-and-save-day-build-60)).

## Plain scripts, no framework or build step

Five classic scripts share globals instead of modules or a bundler.

- **Why:** files can be edited and uploaded straight to GitHub without tooling, and each file has one job, so an update usually touches one or two files.
- **Trade-off:** load order matters and names can collide. Cross-file calls that run before the later file loads are guarded with `typeof fn === "function"`.

## Heavy libraries from CDNs, loaded on demand

ExcelJS, jsPDF, pdf-lib, ZXing and Tesseract are loaded by `loadScript()` only when a feature first needs them, from cdnjs with jsDelivr as fallback, with pinned versions. pdf.js is also loaded only when first needed, with a pinned version, but by `import()` from jsDelivr with unpkg as fallback (see [pdf.js 6](#pdfjs-6-the-legacy-build-loaded-as-a-module)).

- **Why:** first load stays small and fast on a phone; pinned versioned URLs never change, so the service worker can cache them forever (cache-first in `lpn-libs-v2`).
- **Trade-off:** each feature needs one online use before it works offline. If the Excel library cannot load at all, `fallbackXls()` saves a basic HTML-based `.xls` instead of failing.
- **Trade-off:** the app depends on the CDNs serving the same file. The fingerprints below make sure a changed file is refused rather than run.

## Network-first service worker

App files are fetched network-first with `cache:"no-cache"`, and the install step pre-caches with `cache:"reload"`.

- **Why:** an earlier cache-friendly setup let GitHub Pages' 10-minute HTTP cache serve stale files after an update. Revalidating every request makes updates appear immediately when online while still falling back to the cache offline.
- **Discarded:** cache-first for app files (fast, but updates lag until the cache is bumped and the user reloads twice).

## pdf.js 6, the legacy build, loaded as a module

The app reads PDFs with pdf.js 6.4.299, the "legacy" build. Every PDF is opened through one function, `openPdf()` in `compare.js`, which is plain `getDocument({data:bytes})`.

- **Why upgrade:** the app opens PDFs it did not make: supplier manifests in the Manifest check, and exported logs that may have been passed around before being loaded back. The previous version, 3.11.174, had a flaw (CVE-2024-4367, advisory GHSA-wgrm-67xf-hhpq) where a specially made font in a PDF could make pdf.js run code in the page. Build 28 worked round it with `isEvalSupported:false`; build 29 replaces that with the real fix by moving to a version past the known flaws: CVE-2024-4367 (fixed in 4.2.67) and CVE-2026-16633 / GHSA-hq66-cqwq-w95j (affected 5.6.83 up to 6.2.108).
- **No options needed:** pdf.js 6 no longer has `isEvalSupported` or `enableScripting`. It no longer compiles anything from a file, and a PDF's own scripts only run in the pdf.js viewer, which the app doesn't use. So the protection is the version, and a check in `tests/groups/04-version-note.js` reads the pdf.js version from the URLs in `compare.js` and fails if it is in either known bad range.
- **Legacy build:** it is made for older browsers and phones. Even so it needs roughly iOS/Safari 16.4+, Chrome 94+ or Firefox 93+. On older phones PDF reading fails with a plain message (`PDF_LOAD_MSG`) that says to type the numbers in the box instead; the rest of the app is unaffected.
- **Loaded with `import()`:** pdf.js 4 and later are published only as ES modules, so `loadScript()` (a script tag) can't load them. `loadPdfJs()` uses a dynamic `import()` with a 15-second limit per host and sets `window.pdfjsLib` itself, so the rest of the code is unchanged.
- **jsDelivr then unpkg:** cdnjs only hosts the modern build, so the hosts differ from the other libraries. The worker (`pdf.worker.min.mjs`) comes from the same host as the library; pdf.js wraps a worker from another site itself, so no copy on the app's own site is needed. `unpkg.com` was already in the service worker's `CDN` list, so both files are cached in the library store (now `lpn-libs-v2`) on first use.
- **One function for every reader:** `readPdf()`, `readLogPdf()` and `parseExported()` all call `openPdf()`, and a scan in `tests/groups/04-version-note.js` fails if `getDocument(` appears anywhere else, so a new PDF reader can't bypass it.
- **pdf-lib not affected:** pdf-lib (merging the uploaded log PDF into the manifest check PDF) only copies objects from one PDF into another and never runs anything from the file.
- **Trade-off:** the version check only knows the bad ranges written into it. A new pdf.js advisory means adding its range to the check and, if the pinned version is affected, moving it (in `compare.js` and `package.json` together).

## Saved data is tidied when read

Everything read from `localStorage` goes through `cleanRows()`, `cleanDel()`, `cleanHist()`, `cleanNames()`, `cleanCfg()` and `okLogo()` in `core.js` (and `normList()` for presets), at start-up and when a backup is checked.

- **Why:** saved data can come back from a backup file that someone has edited or that got damaged. Before, a `null` in the saved deliveries or an object where text was expected could stop the app opening, and an object in a delivery field could reach ExcelJS, which writes `{formula}` or `{hyperlink}` objects as formulas and links.
- **Tidy, don't refuse:** at start-up a value that doesn't fit is dropped or replaced with a safe default (an unknown pallet type becomes `Mixed`, a bad date becomes empty), so the app always opens with whatever can be used. Only the restore step refuses a file outright, and only when part of it isn't readable JSON.
- **Settings only from known values:** `cleanCfg()` keeps only keys the app has, with the right type, and the text size, date format and default type only from their allowed lists, so a backup can't set something the Settings panel couldn't.
- **Limits:** text fields 2000 characters (the notes box has the same `maxlength`), LPNs 100, names 60 and at most 6. These are far above normal use and stop a crafted file filling storage or an export.
- **Logo only as an image in the file:** `okLogo()` accepts only a PNG or JPEG data URL. Otherwise a saved logo could be a web address, and showing it would contact another site every time the app opened.

## Restore asks first, keeps a copy and never reloads by itself

Restoring a backup checks the whole file, says what it holds, and only changes anything after **Replace my data with this backup**. It downloads a backup of the current data first, rolls back if writing fails, and then shows a **Reload the app** button.

- **Why ask first:** restore replaces everything in the browser. Before, choosing the wrong file wiped the current log and saved deliveries straight away with no way back.
- **Why a copy first, and stop if it fails:** the copy is the only way back from a wrong restore, so if `backupNow()` can't save it, nothing is replaced.
- **Why roll back:** `localStorage` can run out of space part-way through writing. The old values are kept in memory and put back, so the browser never ends up with half of each.
- **Why no automatic reload:** on phones the download of the copy may still be waiting (iPhone asks before saving a file). Reloading straight away, as the app used to after 0.7 seconds, could lose that copy. The user reloads once it has saved.
- **Trade-off:** one more tap, and the restored data isn't visible until the reload.

## Files from outside only give plain text

The `LPNLOG2:` data in a log PDF is read as plain values only (`isTxt()`), the Manifest check log copy tab writes each cell as a number or a string, and the basic `.xls` marks typed text cells as text (`mso-number-format:"\@"`).

- **Why:** a PDF's keywords or a spreadsheet can be edited by anyone before it is loaded back. ExcelJS turns an object value into a formula or link, and Excel treats a text cell starting with `=` as a formula in an HTML-based `.xls`. Exports are printed and emailed on, so they must only carry what was typed or scanned.
- **Counts stay numbers:** in the `.xls`, only the typed values are marked as text; the side-table counts are left as numbers so they still add up in Excel.

## Merged log PDFs lose links and page-open actions

When the Manifest check adds an uploaded log PDF to its own PDF, `buildCmpPdf()` deletes `/AA` and `/Annots` from each copied page.

- **Why:** a log PDF from outside could carry a page-open action (which can be a script) or a link, and the merged file is the one that gets emailed and printed. Only what is printed on the page is needed.
- **Trade-off:** any genuine links or comments in the uploaded PDF are lost in the merged copy.

## Library fingerprints (SRI)

Every library loaded by a script tag has a `sha384` integrity hash in the `SRI` map in `core.js`, and is loaded with `crossorigin="anonymous"`.

- **Why:** the app runs code from cdnjs and jsDelivr. If a file there were changed or tampered with, the browser now refuses it instead of running it with access to the user's data.
- **Checked both ways:** a check in `tests/groups/05-outside-data.js` fails if a library address in the code has no hash or a hash has no address, and `tests/sri.js` downloads every file and compares the hash each week, so a CDN change shows up as an email before users notice a feature failing.
- **Not covered:** pdf.js is loaded with `import()`, which has no integrity option in this code, and Tesseract fetches its worker, engine and language data itself. Those files are not fingerprinted.
- **Trade-off:** upgrading a library now also means updating its hashes in `SRI` (both CDN addresses), or the browser will refuse the new file. The `lpn-library-upgrade` skill is the procedure for upgrades.

## Offline library store keeps only complete downloads (`lpn-libs-v2`)

The service worker saves a library only if the download succeeded (`res.ok`), never answers a checked request with an unchecked (opaque) copy, and the store was renamed from `lpn-libs-v1` to `lpn-libs-v2`.

- **Why:** a failed or unchecked download kept in the old store would have been served for ever, since library addresses never change. An opaque copy also can't satisfy an integrity check, so it would make the library fail to load even when online.
- **Exception for the photo reader:** Tesseract's own files can only be fetched unchecked, so those opaque copies are still saved. If the reader fails to start (including a 90-second limit on starting), `dropOcrCache()` deletes them so the next try downloads them again.
- **Why rename:** the `activate` step deletes any cache that isn't `CACHE` or `LIBS`, so the new name clears the old store once without extra code.
- **Trade-off:** after this update every feature needs internet once more to download its library again.
- **Old font hosts removed:** `fonts.googleapis.com` and `fonts.gstatic.com` were dropped from the `CDN` list, as the fonts are part of the app.

## Content Security Policy in the page (build 31)

`index.html` has a Content Security Policy (a rule list saying where the page may load scripts and other files from, and which sites it may talk to) as a `<meta http-equiv="Content-Security-Policy">` tag, placed before any script. GitHub Pages can't send custom headers, so a meta tag is the only way to set one.

- **Why:** a second line of defence. If a file from outside or a changed library tried to load a script from another site, send data somewhere else or run text as code, the browser blocks it. Fingerprints (SRI) only cover the libraries loaded by a script tag; the policy also limits what pdf.js and the photo reader (which aren't fingerprinted) can load and contact.
- **What it allows, and why:**
  - `script-src 'self'` plus `https://cdnjs.cloudflare.com`, `https://cdn.jsdelivr.net`, `https://unpkg.com`: the app's own files and the three library CDNs. No `'unsafe-eval'` and no `'unsafe-inline'` for scripts, so text can't be run as code and the page has no inline scripts.
  - `'wasm-unsafe-eval'`: lets the photo reader (Tesseract) start its WebAssembly engine. It allows WebAssembly only, not general eval.
  - `worker-src 'self' blob:` and `child-src 'self' blob:`: the background workers of pdf.js and the photo reader, which can be started from `blob:` addresses. `child-src` is there as the fallback older Safari uses for workers.
  - `connect-src 'self'`, jsDelivr, unpkg and `https://tessdata.projectnaptha.com`: the hosts the app and its libraries fetch from (including the photo reader's language data).
  - `img-src 'self' data: blob:` and `font-src 'self' data:`: the logo and pictures made in the app; the fonts are self-hosted.
  - `style-src 'self' 'unsafe-inline'`: the app sets `style` attributes and `style.cssText` from code (for example the hidden print frame in `printBuf()`).
  - `frame-src blob:` and `object-src blob:`: printing loads the PDF into a hidden `<iframe>` from a `blob:` address.
  - `base-uri 'none'` and `form-action 'none'`: nothing can change where relative addresses point or send a form anywhere.
- **Trade-off:** reading photos now needs iOS 16 or newer on an iPhone, because older Safari doesn't understand `'wasm-unsafe-eval'` and blocks the photo reader's engine. The app's message and the Guide say so. Barcode scanning, typing numbers and reading PDFs (iOS 16.4+ since build 29) are unaffected.
- **Other trade-offs:** adding a new library host, or a library that fetches from a new place, means updating the policy too, or the feature fails as if the library couldn't load. `'unsafe-inline'` for styles stays, because the app relies on inline style attributes.
- **How it is kept working:** The checks (`tests/groups/07-security-policy.js`, and on GitHub `18-real-photo.js`) check the policy is in place before any script with no general eval, that everyday screens run with nothing blocked, and (on GitHub, with the real libraries and the real photo reader) that Excel, PDF export, PDF reading, pdf-lib, photo reading, printing and ZXing all work with nothing blocked in the page or its workers. This automated coverage of photo reading was what held the policy back before.

## Exports designed to be read back

The Excel log keeps an `LPN` header cell and labelled delivery cells (Date, Received by, Trailer number…), and PDFs carry the whole log as JSON in the PDF keywords (`LPNLOG2:`).

- **Why:** exported files are the long-term record. Saved deliveries can be rebuilt by importing them, and the manifest check can use them as the log, without OCR errors.
- **Constraint:** layout changes must keep those labels and that keyword format. The checks (`tests/groups/06-real-export.js`) check the import path.

## Print-first spreadsheet styling

A4 portrait, fit to one page wide, repeated header row, page-number footer, medium inner borders with a thick outline, grey zebra rows, gridlines hidden on screen.

- **Why:** the sheets are mainly printed and viewed on desktop. Thin borders disappeared in Excel's scaled print preview, so heavier lines were chosen deliberately.
- **Trade-off:** on phones the sheet opens zoomed in. A saved zoom level was rejected because it would also shrink the desktop view.

## Spreadsheet sizes worked out in the app

The LPN column width and every table row height in the spreadsheets are calculated in `export.js` (`xlLpnWidth()`, `xlLines()`, `xlLpnLines()`) from the text they hold.

- **Why:** the rows need a set height for the print layout, and Excel and Google Sheets don't grow a row whose height is set, so long notes and longer LPNs were cut off. Only the Notes row used to get a rough height (characters ÷ 16); now every Delivery Details row and every LPN row is sized by estimating word wrap.
- **Cap on the LPN column (40 units):** a bad scan, such as a web address read from a QR code, could otherwise make the column so wide that the sheet shrinks to an unreadable size when it is fitted to one A4 page wide. Over-long values wrap onto a taller row instead.
- **Trade-off:** the line counts are estimates based on average character widths (about 0.72 characters per unit for 14pt Arial and 0.6 for Courier New), not measured text, so a row can come out slightly taller than needed.

## Exports say which version made them

Every export carries "LPN Pallet Log vX.Y (build N)": a line under the tables, the spreadsheet and PDF page footers, the `.xls` fallback and the PDF keyword data.

- **Why:** exports are the long-term record and get passed around, so when a file looks wrong it helps to know which code made it. The changelog version alone doesn't change with each release, so the build number (the `CACHE` number in `sw.js`, which goes up with every app change) is added.
- **Build read once at page load:** reading `sw.js` when the page loads, rather than at export time, means the number matches the code actually running, even if a newer version has been published since. `sw.js` is cached by the service worker so this also works offline, and the cache names are a second fallback.
- **Never holds up an export:** exports wait at most 1.5 seconds for the build number; without it the file just says "LPN Pallet Log vX.Y".
- **Constraint:** the line under the tables starts with "Made with ", and the import code stops at a cell starting with that, so the wording must keep that start.

## One spreadsheet reader for both importers

Importing an exported log (Saved deliveries) and loading a log in the Manifest check both turn an `.xlsx` sheet into a grid with the same `sheetGrid()` in `compare.js`.

- **Why:** before, the Manifest check blanked the repeated cells of merged blocks but the import did not, so the two could read the same file differently. With one reader, a fix to how sheets are read applies to both.
- **Merged blocks read once:** ExcelJS gives every cell of a merged block the block's value. `sheetGrid()` keeps it only in the top-left cell, so a line that spans the table (the "Made with …" line, the title band) appears once rather than in every column.
- **Trade-off:** `sheetGrid()` lives in `compare.js` but `panels.js` uses it too, so `compare.js` must load before an import runs (both are loaded by `index.html` at start-up).

## Logo converted for exports

The logo is redrawn on a white canvas as a JPEG (max 600px) and fitted inside the space without stretching (`exportLogo()`, `fitLogo()`).

- **Why:** embedding the original PNG made each PDF about 1.5 MB, and the old code stretched non-wide logos. The JPEG version is about 100 KB with no visible difference in print.

## OCR with LPN-specific repair

Tesseract reads photos, then `extractLpns()` only accepts `prefix + 8–12 characters` with at least six digits, repairs look-alike characters in the number part and re-reads each match from a cropped, enlarged region.

- **Why:** manifests and printed logs are photographed in poor light; generic OCR output is too noisy. Restricting to known prefixes (presets) further cuts false matches.
- **Trade-off:** OCR can still misread, so users are always asked to check the numbers before comparing. Since build 35 a prefix letter read as a look-alike digit is mended only when other numbers on the same photo show the pattern (see below).

## Photo clean-up against the local paper, sparse text mode and a per-page tidy-up (build 35)

`prep()` compares each pixel with the paper around it instead of stretching the contrast of the whole page; Tesseract's main pass uses page segmentation mode 11 (sparse text); readings are taken with any prefix, tidied per photo by `tidyReads()`, and only then filtered by the prefix list in `photoLpns()`.

- **Cause (from a user problem report):** the old `prep()` stretched contrast using the whole page's 1% and 99% grey levels. On pale, shaded manifest photos with no dark edge in shot, that stretch turned shade and paper grain into black specks: 3 of the user's 4 photos came out as junk (about 250 junk words).
- **Why local background:** shade across a sheet changes the paper's grey from one side to the other, so one threshold for the whole page can't work. Comparing each pixel with the average of its area (cells about 1/20 of the page, blended between cell centres) and calling it ink below 0.85 × that keeps the text black and the paper white.
- **Why worked out in JS:** shrinking and re-enlarging a canvas would get the blur from the browser, which scales differently in each browser and needs a second full-size image (memory on phones). The cell averages are computed directly, so the result is the same everywhere.
- **Why mode 11:** the default page layout mode skipped whole parts of a manifest page broken up by ruled lines; sparse text finds every number. The close-up re-read of each word still uses mode 7 (single line).
- **Why read with any prefix, then tidy, then filter:** a reading with a look-alike prefix (`VL1…`) would be thrown out by a prefix list of `VLT` before it could be mended. Tidying first means it is mended and kept, and only real other prefixes are reported as left out.
- **Why vote per page:** numbers on one manifest page share a prefix and digit count. The most common shape per prefix (seen at least twice) is the evidence for mending a reading that doesn't fit. A number with nothing to compare against is kept as read.
- **Why the first read is kept when both fit:** the close-up is cut from the black-and-white image, so it is not a better source when the first reading already fits.
- **Why the extra-0 rule is narrow:** a real LPN can have a 0 after its prefix (`RUN0001830763`) and a prefix can contain an O (`LOT`). So a 0 is dropped only when the raw text had O, D or Q straight after the prefix, and never when the result would equal another number read on the same page.
- **Checked:** offline, the app's `prep()` on the user's four photos with Tesseract 5 gave all 18 LPNs right (7 before), also with the photos at full camera size. The automatic checks use readings taken from those photos.
- **Trade-off / not checked:** not tested on a real iPhone. Mending relies on at least two numbers of the same shape on a photo; a photo with one LPN, or a page mixing digit counts under one prefix, gets less help. Users still need to check the numbers.

## Leaving out made-up codes from paper specks (build 36)

When a photo has a clear page pattern, `tidyReads()` leaves out a reading whose prefix matches no pattern on the page and whose digit count isn't an LPN's (9 or 10; since build 39, 10 or 11 for `IM`, see `lpnDigitsOk()` below), and `photoLpns()` notes it in the problem log ("Ignored as not looking like this page's LPNs").

- **Cause (from a second user problem report):** on the phone, photo reading found all 18 real LPNs but also a made-up `DFA51400180`, read from specks on the paper.
- **Why these two conditions together:** a code with a prefix seen nowhere else on the page and a length no LPN has is very unlikely to be real. A lone other prefix with 9 or 10 digits could be a real LPN, so it is kept (and named by the prefix list note if its prefix isn't listed). A short reading of a page prefix (`QUB00189918`) is kept, because it is probably a real number misread and the user should see it to fix it.
- **Why only with a pattern:** with nothing on the page to compare against, the app can't tell what the page's LPNs look like, so nothing is left out.
- **Why logged:** the left-out readings are not added to the numbers box; the problem log keeps a record in case a real number is ever left out. Since build 37, left-out readings with 9 or 10 digits are also named in the per-photo note (see below).
- **Trade-off:** a real LPN with an unusual prefix and a length other than 9 or 10 digits, alone on a page of other numbers, is left out with only the problem log showing it. Users still need to check the numbers against the paper.

## Weighted page votes, prefix length and IM numbers (build 37)

`tidyReads()` weights a clean first reading double when voting for the page's pattern, needs a shape to appear in at least two numbers, also leaves out readings whose prefix length differs from every prefix on the page, and always keeps `IM` numbers (`KNOWN_PFX`). `photoLpns()` returns left-out readings with 9 or 10 digits as `.odd` and `readNote()` names them.

- **Cause:** the GitHub check that reads the user's four photos with the real tesseract.js (see below) found two problems the offline Tesseract command didn't show: on `run.jpg` two of three numbers read with an O between `RUN` and the 0s, so 9 and 10 digits tied and the wrong shape could win; on `vlt.jpg` specks gave `CO1080002090`, `RR1004040021` and `L1121100001`, which have 9 or 10 digits and so passed the build 36 rule.
- **Why a clean first read counts double:** a first reading that is exactly the raw text had no look-alike letters turned into digits, so it is the best evidence of what was printed. A tie between shapes goes to it. Whole-page text readings (`whole: true`) only count once, because the same number can also come from a word, and counting it twice would let it outvote the others.
- **Why a shape must appear in two numbers:** with weights, one clean reading alone would reach a weight of 2; counting numbers instead keeps the build 35 rule that a pattern needs at least two numbers behind it.
- **Why prefix length:** on a page of 3-letter prefixes, a 1- or 2-letter "prefix" is far more likely a speck or a fragment of the text before it than a real LPN.
- **Why `IM` is always kept:** `IM` is a real two-letter prefix used for full pallet picks and can turn up on a page of 3-letter numbers. `KNOWN_PFX` lists prefixes that are real even though they differ from the rest of the page.
- **Why name the 9–10 digit ones in the note:** a reviewer pointed out that a real 2-letter LPN (for example `JD1234567890`) among 3-letter ones would otherwise be dropped silently. It is still not added, because specks often give 9–10 digit junk, but the note names it and says to type it in if it is real.
- **Trade-off:** a real LPN with a prefix length unlike the rest of the page has to be typed in by hand; only `IM` is known. Other real prefixes like that would need adding to `KNOWN_PFX`.

## A photo reading check on the user's real photos (`tools/ocr-check`)

`tools/ocr-check/check.js` runs the app's own photo code on the user's four manifest photos (`photos/`, sent on 31 Oct 2026, address boxes cut off) and scores the result against `expected.json` (18 LPNs at first; since build 57, nine photos plus two turned copies with 54 LPNs). `tests/groups/18-real-photo.js` uses it on GitHub with the real tesseract.js and fails on any missing or extra LPN.

- **Why real photos:** the drawn test pictures are clean; the problems users meet (shade, grain, specks, ruled lines, O read for 0) only show on real photos. The repair rules are tuned on these photos, so every change is scored against them.
- **Why two engines:** where the Claude cloud sandbox can't download tesseract.js, the `cli` engine uses the Tesseract 5 command for the reading and the app's code (`prep`, `cropScaled`, `extractLpns`, `photoLpns`) for everything else, offline. It doesn't read exactly like tesseract.js (build 37's two fixes only showed on GitHub), so GitHub reads the photos with the `js` engine, the app's real `ocrLpns()`, as on a phone.
- **Why the address boxes were cut off:** the repository is public. Since commit `f510058` (after build 55) the git guard also refuses to commit a new or changed photo there until it has been looked at and confirmed with `tools/release/photo-ok.sh` (see "Claude automations kept in the repository").
- **Why it prints what the reader saw on failure:** run logs can't be read from a Claude cloud session, so a "Photo reading detail" notice gives each reading (raw text, first read, close-up) for working out a fix.
- **Trade-off:** four photos from one site; other suppliers' layouts are not covered until their photos are added. The photos make the repository bigger (about 1.3 MB) and, like the rest of `tools/`, are published by GitHub Pages but kept out of the site zip.

## One digit-count rule, with IM numbers at 10 or 11 digits (build 39)

`lpnDigitsOk(x)` in `core.js` is the only place that says how many digits an LPN has: 10 or 11 after `IM`, 9 or 10 after any other prefix. The log warning (`lpnIssues()`), the manifest's unusual-digits note (`oddNote()`, for lines that are letters followed by digits; see build 40 below), `photoLpns()` (`.odd`) and the left-out rule in `tidyReads()` use it directly; the "left out" scans of PDF and photo text (`extractLpns()`, `lpnsFromText()`) and `photoLpns()`'s `.skipped` use it through `maybeLpn()` since build 40.

- **Cause:** the user confirmed that `IM` numbers (full pallet picks) have 2 letters and 10 or 11 digits, while other LPNs usually have 3 letters and 9 or 10 digits. Every place had its own "9 or 10" check, so a real 11-digit `IM` number was warned about when logged and called unusual on the manifest, and a 9-digit `IM` reading was not.
- **Why one function:** the rule was copied into five places in two files. One function keeps the log, the manifest note and photo reading in agreement, and a new prefix with a different length needs one change.
- **Why the warning names the IM rule:** "has 9 digits (IM numbers have 10 or 11)" tells the user which rule the number broke; other prefixes keep "(usually 9 or 10)", because the user said "usually".
- **Trade-off:** only `IM` has its own length. A different prefix with its own length would be warned about until it is added to `lpnDigitsOk()`. The scans still only take 1–3 letters followed by 9 to 11 digits, so a 12-digit number is never named as left out.

## Two side effects of build 39 put back (build 40)

Build 39 made every digit check go through `lpnDigitsOk()`. That had two side effects, which build 40 undoes:

1. **9-digit `IM` readings were no longer named as left out.** The left-out scans (`extractLpns()`, `lpnsFromText()`) and `photoLpns()`'s `.skipped` list filtered by `lpnDigitsOk()`, which rejects `IM` with 9 digits. Before build 39 such a number (9 digits, inside the old 9-or-10 rule) was named. Build 40 filters them with `maybeLpn(x)` in `compare.js`: `lpnDigitsOk(x)`, or `IM` followed by exactly 9 digits. A 9-digit `IM` number is one digit short, probably a misread, so the user is told about it instead of it vanishing.
2. **Typed manifest lines with a dash or no letters were called unusual.** `lpnDigitsOk()` returns `false` for anything that isn't letters followed by digits, so `oddNote()` listed lines such as `VLT-004040265` or `004040265`. Build 40 uses `lpnDigitsOk()` only for lines that are letters followed by digits (spaces removed); any other line is judged by the old rule: the digits at the end of the line must number 9 or 10.

- **Why not loosen `lpnDigitsOk()`:** the log warning (`lpnIssues()`) should still call a 9-digit `IM` number unusual; only the left-out list needs to be wider, so the extra case lives in `maybeLpn()`.
- **Trade-off:** phone numbers stay out: the scans need 1–3 letters straight before (or one space or tab before) 9 to 11 digits, and `TEL 01234567890` or `MOB 07123456789` (11 digits after non-`IM` letters) fail `maybeLpn()`. A line like `IM-123456789` in the typed box is judged by its trailing 9 digits under the old rule, so it is not listed as unusual even though an `IM` number needs 10 or 11.

## Per-file notes and naming numbers the prefix list left out

Each manifest photo, manifest PDF and log photo gets its own note (found, new, already listed), and numbers that look like LPNs but have a prefix outside the list are named, with the fix.

- **Why:** a user reported that manifest photos "stopped adding LPNs" with no hint why. The causes look the same from outside: the numbers were already in the box, the prefix list filtered them out, or the photo couldn't be read. One line per file tells them apart.
- **Why only real 9–10 digit numbers:** naming every letters-and-digits match flagged PO numbers, phone numbers and references. LPNs have 9 or 10 digits (10 or 11 for `IM` since build 39), so the "left out" scan only takes real digits of those counts (no look-alike repair; `lpnDigitsOk()`, or an `IM` number one digit short since build 40, `maybeLpn()`), and the wording says "if they are LPNs" because the app can't be sure.
- **Why not add them anyway:** the prefix list is there to cut noise; the user decides whether to add the prefix or clear the list.
- **One bad photo doesn't stop the rest:** before, the first failure ended the batch and lost the notes for the photos after it. Now each failure is a note and reading carries on, as it already did for PDFs (except when the PDF reader itself can't load, where every later file would fail the same way).
- **Trade-off:** with many files the message gets long; `.msg` wraps long words so it never widens the page.

## Problem log kept on the device, sent by hand

The app keeps its last 300 notable events in `lpndiag` and offers them as a downloadable text file, rather than sending error reports anywhere.

- **Why:** problems are reported after the fact from phones on the loading bay, where nobody can open developer tools. A report with the version, device, current Manifest check state and recent reads and errors shows what happened without asking staff to describe it in detail.
- **Why not automatic reporting:** the app has no backend. Sending data out would need a service and would send LPNs and text from supplier documents off the device without the user choosing to.
- **Why capped:** 300 entries of at most 300 characters keeps it small in `localStorage` (the check keeps it under 120,000 characters) so it can't crowd out the log and saved deliveries.
- **Why not in backups:** the log describes this device. Restoring another device's log would mix up two devices' events, so backups leave it out, ignore it when restoring, and a restore keeps the current one.
- **Trade-off:** the report contains LPNs, file names and the start of text read from photos. It is only made when the user taps the button, and **Clear** empties it. Since build 42 it can also be attached to a report sent from **Report a problem or idea** (see below); it is still never sent by itself.

## Email via the share sheet, PDF only

"Email PDF" shares a PDF through `navigator.share`, not the Excel file.

- **Why:** mobile browsers only allow some file types to be shared from a web page, and `.xlsx` is often refused. When sharing fails the file is saved and a `mailto:` opened so the user can attach it.

## Soft reminders instead of blocking dialogs

The expected-count check and the "not exported yet" check on Start new delivery show a message and let a second press go ahead, rather than using `confirm()` or disabling the button.

- **Why:** a native dialog can use up the tap that the share sheet needs (Email PDF), and on the loading bay there are legitimate reasons to continue (a short delivery, a log sent another way). Remembering the acknowledgement per log state (`expAck`, `newAck`) means a changed log asks again.

## Live manifest tracking from the same data

Live tracking reads the manifest box in the Manifest check section rather than a separate list.

- **Why:** one place to load the manifest (photo, PDF or typing) serves both the live count and the full comparison, and the text is persisted so it survives reloads. Start new delivery clears it.

## Phone pallet table scrolls with the page

On phones the pallet table has no inner scroll box (`.wrap` is `overflow:visible`, no max height); the sticky column headings pin to the top of the screen instead.

- **Why:** a 60vh scroll box inside a scrolling page means two scroll areas on a small screen, and which one moves depends on where the swipe starts. With one page scroll the whole log is reachable with normal swipes, and the pinned headings keep the columns readable.
- **Trade-off:** a long log makes the page long, so the Manifest check and later cards are further down. Wider screens keep the inner scroll box, where there is room for both.
- **Related:** LPN cells wrap (`word-break:break-all`) on phones, because without the scroll box a long LPN would otherwise widen the whole page.

## Entry bar steps aside, but never while in use

On phones the fixed entry bar slides off screen (`body.cmpfocus`) while the open Manifest check is in the upper part of the screen, and is made `inert` while hidden.

- **Why:** the bar covers the bottom of the screen, which hid the Manifest check's buttons and text boxes. Hiding it only when the Manifest check is open and scrolled up means it is out of the way exactly when that section is being used, and it returns as soon as you scroll back up to the log.
- **Never while focus is inside the bar:** if someone is typing or a hardware scanner is typing into the LPN box, hiding the bar would move or block the field mid-entry and could lose a scan. So `upd()` checks `entry.contains(document.activeElement)` and keeps the bar while it has focus.
- **Why `inert`:** a bar moved off screen with `transform` is still in the page and can still take focus; `inert` stops Tab, a screen reader or a scanner's typing from landing in a field nobody can see.
- **Trade-off:** while the bar is hidden, adding a pallet needs a scroll up first.

## Expected-count line only red when over

The expected-count line is neutral while counting, green when it matches and red only when there are more pallets than expected. It is hidden when Expected pallets equals the manifest count.

- **Why:** being under the expected count is the normal state during a delivery, so showing it in red from the first pallet read as an error. Over the count is the case that needs action. When the manifest sets the expected number, the manifest progress line already shows the same count, so a second line was just repetition.

## Logo in Settings, old controls kept hidden

The logo buttons moved from the Delivery card to Settings. The original `#logoBtn`, `#logoRm` and `#logoFile` stay in `index.html` (hidden), and the Settings buttons click them.

- **Why:** the logo is set once per device, not per delivery, so it was clutter in the card used for every delivery. Keeping the original elements means `export.js` (`showLogo()`, the file input handler) did not need to change apart from mirroring labels onto the Settings buttons.
- **Trade-off:** two sets of ids for one feature; the hidden ones must not be removed while `export.js` still uses them.

## Self-hosted fonts

Atkinson Hyperlegible (chosen for legibility) and IBM Plex Mono (LPNs and numbers) are served from `fonts/`.

- **Why:** consistent look offline and no third-party requests.

## Automatic checks with stand-ins

The checks (`page()` in `tests/lib.js`) block all external requests and replaces ExcelJS with a recording stand-in.

- **Why:** runs offline, quickly and deterministically in CI, and can assert on cell values, borders and print settings.
- **Trade-off:** a stand-in only shows what the app asked for, not what the real library makes of it. The real ExcelJS, jsPDF, pdf.js and pdf-lib are now also checked (next section); the camera, the photo reader and phone file viewers are still checked manually.

## Real export libraries in the checks, run on GitHub

`tests/groups/06-real-export.js` also makes a real log `.xlsx`, log PDF and manifest check `.xlsx` with the real ExcelJS, jsPDF, jspdf-autotable and pdf.js, and reads each back through the app's own readers (`parseExported()`, `readLog()`, `readLogPdf()`). The libraries come from `node_modules` and are served in place of the CDN URLs; all other outside requests stay blocked.

- **Why:** the stand-ins can't catch problems that only show with the real library, such as a merged cell read in every column, a long LPN wrapped onto two lines in the PDF, or a file that the app writes but can't import again. Reading the files back with the same functions users rely on checks the whole round trip.
- **Why only where npm works:** the Claude cloud sandbox can't download npm packages or reach the CDNs, so there the group is skipped with a note and the rest of the checks still run. GitHub's runners can always install them, so on GitHub a missing library is an error rather than a skip, and the run ends with a **Checks** notice saying whether the real checks were included. To get the real result from a cloud session, push the branch (branch pushes are fine) and read that notice through the GitHub annotations API.
- **Trade-off:** the checks read the files back; they don't judge how a printed page looks.

## Library versions pinned to the CDN copies

`package.json` lists `exceljs` 4.4.0, `jspdf` 2.5.1, `jspdf-autotable` 3.8.2, `pdfjs-dist` 6.4.299, `pdf-lib` 1.17.1, `tesseract.js` 5.1.1 and `@zxing/library` 0.21.3 as exact versions (no `^`), the same versions the app loads from cdnjs, jsDelivr and unpkg in `export.js`, `compare.js` and `scan.js`.

- **Why:** a check against a different version than users get proves nothing about the live app. A check that runs everywhere compares the two and fails if they differ, so the CDN URLs and `package.json` have to be changed together.
- **Why tesseract.js and ZXing too:** the checks don't run them, but they read outside files (photos and barcodes), so they are pinned for the version check and the security advisory check.
- **Workflows install with `--ignore-scripts`:** the packages are only files the checks serve to the browser, so none of their install scripts needs to run. The workflows also get read-only repository access and a 10-minute limit, as they only need to read the code and should not run on if something hangs.

## Claude automations kept in the repository

The hooks, agents and working notes for Claude Code are committed in `.claude/` on `main` rather than kept in one person's local settings.

- **Why:** the rules they enforce belong to the project, not to a machine: bump `CACHE` in `sw.js` with every app change, keep `docs/` off `main`, and only push when the checks pass. Kept in the repository, they apply in every fresh checkout and cloud session, change through normal commits, and can be read by anyone.
- **Cost:** none for the site. Jekyll leaves dot-folders out of the published site, so `.claude/` is not served and is not in the service worker cache.
- **Limit:** they only run inside Claude Code. Manual commits and edits on the GitHub website are still covered only by the `test.yml` checks after the push.
- **Only real git commands:** the git guard matches `git` followed by `commit`, `push` or `merge … docs`, with only git's own options allowed in between: `-C <dir>`, `-c <key=value>`, `--git-dir`, `--work-tree` or `--namespace` (with `=` or a space before the value), and other `--options` such as `--no-pager`. Earlier it matched any command containing "git" and "commit" or "push", so `git stash push`, an `echo`, or a script that only mentioned those words set off the checks.
- **Other ways of writing git are caught too:** `git` counts at the start of the command, after `;`, `&`, `|`, `(`, a backtick or a space, after a `/` (so `/usr/bin/git push` counts), and after `-c` followed by a quote (so `sh -c "git push"` and `bash -c 'git commit …'` count). A quote counts only straight after `-c`, so searching for the text, as in `grep "git push" .`, does not set off the checks.
- **Session-start status line:** `session_start.py` tracks every GitHub branch and fetches at the start of each session, because the git guard compares `CACHE` with `origin/main` and a clone that only tracks some branches reports branches already on GitHub as "unpushed". It never asks for a password and never blocks the session, since it has no terminal and a session that can't start is worse than a stale status line.
- **Download copy reminder:** `outputs_reminder.py` reminds once per `main` commit when the user's download copy (`/mnt/user-data/outputs/lpn-site` and `lpn-site.zip`) no longer matches `main`, because that copy is what gets uploaded by hand and it was easy to forget after a release.
- **Accessibility reviewer agent:** a read-only `a11y-reviewer` agent, used after UI changes, measures accessibility in a real browser (Playwright at 360, 390 and 1300 px wide, light and dark) instead of reading the code alone, because contrast with a user-picked theme colour, tap target sizes, focus hidden under the fixed entry bar and overlaps at 200% zoom or Extra large text only show on the rendered page. Its 44 px tap target rule is for the controls used while scanning, since the app is used on phones with gloves and in poor light.
- **Security reviewer agent:** a read-only `security-reviewer` agent with a checklist for files and text from outside and for the libraries, used when import code, library loading, `package.json` versions or `index.html` change.
- **Cache bump compared with the live site:** the commit check accepts a `CACHE` number higher than the one in `origin/main:sw.js`, as well as a `CACHE` line changed in the commit itself. A branch that has already bumped the cache once therefore doesn't need a new bump for each later commit before it is published.
- **Media compared by what it shows:** the outputs storage rewrites the metadata of pictures and video after they are saved, so comparing raw bytes reported the download copy as out of date every time. `outputs_reminder.py` compares their decoded frames with `ffmpeg` instead. It decodes main's own copy from git rather than the file in the working tree: after a new video is recorded on `updates`, the working tree holds a file that isn't live yet, and comparing that would hide that the download copy still matches (or doesn't match) what is published. If `ffmpeg` is missing or fails, the file counts as different, so the reminder errs towards syncing.
- **Download zip compared by content (after build 53):** `outputs_reminder.py` used to call `lpn-site.zip` out of date when it was older than the newest file in the download folder. Because the outputs storage rewrites pictures' and video's metadata (and so their dates) after they are saved, a good zip looked older. It now opens the zip and compares each site file's bytes with the folder's copy (`lpn-site/<file>`), naming up to five that differ or are missing; a missing zip is reported as missing. Docs, `.claude/` or `.mcp.json` in the zip are still reported first.
- **Pictures, video and SVGs only need to be in the zip (after build 54, commit `481425b`):** the storage adds metadata to those files after saving too, so their bytes in the zip could differ from the folder's copy while showing the same thing, and the zip was reported as out of date. A `.mp4`, `.webm`, `.jpg`, `.jpeg`, `.png` or `.svg` now only has to be present in the zip; the folder copies are still compared with `main` by what they show (above). Every other file is still compared byte for byte.
- **A cache bump in the same command counts (after build 53):** the guard runs before the command, so `sh tools/release/bump.sh && git commit …` (or a `sed` on `sw.js`'s `lpn-log-vN` placed before `git commit`) used to be blocked because `sw.js` hadn't changed yet. The guard now accepts the commit when the text before `git commit` runs `tools/release/bump.sh` or such a `sed`, and its message names `bump.sh`. `.claude/CLAUDE.md` still says to run `bump.sh` on its own before the commit.
- **`tools/release/bump.sh` for the cache bump:** it reads `lpn-log-vN` from `sw.js` and from `origin/main:sw.js` and only bumps (to the live number plus one) when the working copy isn't already higher, so running it twice before a release is harmless and never skips a number. It changes only the `CACHE` line.
- **`config.js` checked as soon as it is edited (`config_check.js`):** a `PostToolUse` hook (30-second limit, registered next to the syntax check) runs the same rules as `tests/groups/19-site-config.js` the moment Claude edits or writes a file named `config.js` beside a `core.js`, so a mistake shows straight away instead of only on GitHub, where a broken file would already have reached phones with every feature on.
- **`config.js` counts for the docs lag:** `docs_reminder.py` and `session_start.py` now include `config.js` in the app files they count, so a settings change (which the docs describe in installation.md) also reminds to update the docs.
- **`guide-checker` agent:** a read-only agent that checks the Guide, Settings, Saved deliveries help, the privacy section, the newest changelog lines and on-screen messages against the code, including how `data-f`/`data-nf` lines read with a feature on and off. `release-reviewer` looks at the diff; this one reads the whole text, because a wrong sentence can sit in a part of the Guide the diff didn't touch. A mismatch in the privacy section is treated as a blocker.
- **One `docs-updater` at a time:** two docs updates running together would share one worktree (`/home/claude/lpn-docs-wt`) and could overwrite each other's commits. The agent writes the time to `/home/claude/lpn-docs-wt.lock` at the start and removes it at the end; a lock under 30 minutes old stops a second run, and an older one is taken to be left over from a run that stopped.
- **Photo privacy guard (after build 55, commit `f510058`):** manifest photos carry delivery addresses, names and phone numbers, and the repository is public, so cutting the address box off is not left to memory. The guard blocks a commit with a new or changed photo in `tools/ocr-check/photos/` until `photo-ok.sh` has recorded that photo's exact git hash, after someone (or Claude, with the Read tool) has opened it and checked it. Using the hash means a photo edited after it was confirmed has to be checked again. The list lives in `.git/lpn-photos-ok`, so it is per clone: a fresh checkout has to confirm photos again before committing them, which errs towards checking. Commits made outside Claude Code are not guarded.
- **UK spelling hook (after build 55, commit `f510058`):** the app's wording is UK English, and US spellings (color, center, canceled…) are easy to slip into new messages. `uk_spelling.js` runs after each edit of `index.html` or an app script and only looks at text people see, skipping code names, CSS and comments, so a CSS `color` or a `theme-color` name isn't flagged. **Trade-off:** it works on a word list, so a US spelling that isn't listed is missed, and a code name written with spaces inside a string would be flagged (the message says to give it no spaces).
- **`old-data-checker` agent (after build 55, commit `f510058`):** a read-only reviewer for changes to how saved data, backups and exports are read or written, because a stricter check or a renamed key can quietly refuse data phones already hold or logs printed weeks ago. It runs `21-old-data.js` and treats anything that would lose, change or refuse older data as a blocker.
- **Never-build list in `release-reviewer` (after build 55, commit `f510058`):** the user has decided against some features for good: timing deliveries (it would be used to rush people and get them in trouble; see "No delivery start and finish times (build 49)"), damage reasons for short pallets (shortages can't be known without a full breakdown from the DC) or torn wrap, anything for shared work phones (the company doesn't use them), the compact Delivery/Manifest layout (reverted), a saved zoom level or phone-first exports (exports are mainly printed on desktop), and asking people to type or paste tokens (they only go into GitHub secrets). Writing them into the reviewer's checklist as blockers means they are caught even when they come back partly or under another name.
- **Push blocked while app or check files are uncommitted (after build 58, on `updates`):** the pre-push checks run `node tests/run.js` on the working tree, so they test whatever is on disk, not what the push sends. Build 58's `core.js` change was left out of its commit: the checks passed here and only GitHub caught it. The guard now refuses the push while an app file, `config.js`, `sw.js` or a file under `tests/` is changed but not committed. **Trade-off:** it can't tell a deliberate local experiment from a forgotten file, so either has to be committed or put back before pushing. At first new files git didn't track yet weren't counted, so a brand-new file that was never added still got through; since build 59 the guard reads `git status --porcelain --untracked-files=all` and also counts new files, and any `.js` file at the top of the repository (not only the listed app files), so a new app script or a new check under `tests/` left out of the commit stops the push too. The message says to commit them, or put changed ones back and delete new ones that aren't wanted. **Trade-off:** a scratch `.js` file or test output left at the top level or under `tests/` now blocks a push until it is deleted or committed. Docs-branch pushes skip it, as they don't run the checks either.
- **Commenting on and closing reports without a prompt (after build 58):** `.claude/settings.json` allows `gh api -X POST` and `-X PATCH` on `repos/Jamie9904/lpn-feedback/issues/*`, so Claude can reply to and close Report a problem issues. The permission only covers that private repository's issues, and `.claude/CLAUDE.md` and the `lpn-feedback-triage` skill keep the decision with the user: Claude asks first, and gives the issue link instead when closing is refused.
- **SVGs compared without their metadata (build 51):** the outputs storage also adds a `<metadata>` block (content credentials, with an `xmlns:c2pa` attribute) to SVGs such as `media/share-qr.svg`, so they are compared as text with that block and attribute removed. SVG is text, so no decoding is needed; anything else that differs, or a read failure, still counts as different.

## One working branch, updates

Every change is committed and pushed on one branch, `updates`, and `main` only moves by fast-forwarding to `updates` when the user says to publish. The git guard blocks commits on `main` and creating new branches whenever `origin/updates` exists.

- **Why:** one branch per change left a trail of merged branches that this session can't delete on GitHub, and they had to be listed for the user to remove by hand. With one branch there is nothing to clean up, and pushing `updates` still runs every check on GitHub without touching the live site.
- **Why fast-forward only:** `git merge --ff-only` keeps `main` exactly equal to what was checked on `updates`, with no merge commits, and fails loudly if the two have diverged.
- **Why only when `origin/updates` exists:** in a clone or fork without that branch the guard behaves as before, so it doesn't block normal work there.
- **Trade-off:** changes can't be kept apart on separate branches; unfinished work on `updates` has to be finished or reverted before the next release. The session-start line says when `updates` is behind `main`, for example after a fix made on GitHub.

## No branch protection on `main`

`main` has no GitHub branch protection rule. This is deliberate: releases push to `main` directly (`tools/release/ship.sh` fast-forwards and pushes it), and the same safeguards are already in place without one: the git guard blocks commits on `main` in Claude Code, `ship.sh` only moves `main` to a commit whose **Checks** run on `updates` has passed, and `test.yml` runs again on `main`.

- **Why not a rule requiring pull requests or passing checks:** releases are fast-forward pushes, not pull requests, and a rule would block them or need exceptions.
- **Site settings:** the user's decision is that changes to `config.js` are made by asking Claude (who uses the `lpn-site-settings` skill, saved to the user's account, and whose edit is checked at once by `config_check.js`) rather than by editing the file on GitHub. Editing on GitHub still works (see [installation](installation.md#site-settings-configjs)); it is just not the preferred way.
- **Trade-off:** an edit made on the GitHub website, or a push from a terminal, reaches `main` unchecked until `test.yml` reports on it.

## Release script instead of release steps typed each time

Publishing is `sh tools/release/ship.sh`, not a list of git commands followed by checking things by hand. The `release-lpn` skill and `.claude/CLAUDE.md` point to it.

- **Why:** the steps after the push (wait for Checks and Pages, check the live site, update the download copy and zip) were easy to skip or do in a different order. The script does them the same way every time and stops at the first problem, so a release is only reported as done when the live site has been checked.
- **Why it waits for Checks on `updates` first:** `main` is only fast-forwarded to a commit that has already passed every check on GitHub, including the real-library and photo reading checks that are skipped locally.
- **Why it starts the health check:** the weekly `health.yml` already checks the live build number, the CDN libraries, the live demo video and the live photo reading, so running it straight after a release checks the published site rather than the repository, without a second set of checks to keep up to date.
- **Limits:** it needs `gh` signed in and network access to GitHub; it never touches the `docs` branch. In the download folder it overwrites the site files and removes any file that is no longer one, so a file deleted from the app doesn't linger in `lpn-site` or the zip. The built-in browser check of the live site is still done separately when the browser is connected.

## Live photo reading in the weekly health check

`health.yml` reads the user's four manifest photos with the live site (`tools/ocr-check/check.js --url=https://jamie9904.github.io/`), not only with the files on `main`.

- **Why:** the checks on a push read the photos with the repository's code. Reading them with the published site also catches a site that serves something different from `main`, such as an old copy, and runs every week even when nothing is pushed.
- **Cost:** the extra reading of four photos with tesseract.js made the run longer, so the health check's limit went from 10 to 15 minutes.

## Demo video recorder kept in the repository

The tool that makes `media/demo.mp4` lives in `tools/demo-video/` on `main`, and records the real app from the repository rather than a separate mock-up.

- **Why in the repository:** the video has to be remade whenever the screens it shows change. With the recorder next to the app, one command (`sh tools/demo-video/make.sh`) re-records it from the current files and saves a fingerprint of the key screens (`screens.json`) that `npm test` compares the app with.
- **Why an offline voice:** the Kokoro "Heart" voice (Apache 2.0) runs locally through sherpa-onnx, so re-recording needs no account or paid speech service and gives the same voice every time. The engine and model (about 350 MB) are downloaded from GitHub once into `~/.cache/lpn-voice` rather than committed.
- **Why music is optional:** the music and sound effects are not in the repository. `render.py` adds them only when `SFX_DIR` points at them, and otherwise renders the voice only.
- **Why a stand-in camera for Live scan:** the recording has no camera, but the scanning scene should show the real Live scan screen. `record.mjs` gives the page a drawn barcode label as its camera stream and a stand-in `BarcodeDetector` that reports the code shown on it, so only the camera and the reading are faked; adding the pallet with the selected type and the "Added" message come from the app's own `onCode`.
- **Why UK locale:** the recording context is set to `en-GB` and `Europe/London`, so dates on screen show UK style, as warehouse users see them.
- **Trade-off:** `tools/` is on `main`, so GitHub Pages publishes it, though the app never loads it. It is kept out of the site zip and the download copy.

## Demo video staleness: screen fingerprint that warns, not fails

Whether the demo video is out of date is judged by comparing the app's key screens with `tools/demo-video/screens.json`, not by counting commits. The session-start line only counts commits to `index.html` and `styles.css`.

- **Why a fingerprint:** counting every change to the page, styles and five scripts flagged the video after changes that don't show on screen. Comparing position, size, text and colours of the parts the video shows points at real visible changes, with a 6px tolerance for small shifts.
- **Why only a warning:** re-recording needs the voice engine, `ffmpeg` and a person to look at the result, and a visible change may be in a part the video doesn't dwell on. A failing check would block unrelated releases; a "Demo video may be out of date" annotation leaves the decision to re-record to a person.
- **Why the session start keeps a hint:** it costs nothing and needs no browser, so it only counts page and style commits and points at `npm test` for the real answer.
- **Weekly playback check:** `health.yml` downloads the live `demo.mp4` and poster and decodes the video with `ffmpeg`, because `npm test` only checks the player and file size, not that the published file plays.
- **Fixed date:** the made-up delivery is dated 30 October 2026, so `fingerprint()` sets the page clock to that day (`page.clock.setFixedTime`). Without it the "log is dated before today" reminder appears on any later day, moves everything below it and gives false "may be out of date" warnings.
- **Trade-off:** only nine parts at one phone width are compared, so changes in other screens or in the scenes the recorder plays are not caught. `screens.json` has to be committed with each new video.

## Weekly health check as a GitHub workflow

The weekly check of the live site, the CDN libraries and the tests is `.github/workflows/health.yml`, not a Claude scheduled task.

- **Why:** GitHub's runners can reach the live site and cdnjs, jsDelivr and unpkg, which the Claude cloud sandbox cannot, so only a runner can actually test that the libraries still download and that the live site serves the current `sw.js`. GitHub also emails on a failed run without any extra setup, and a passing run stays quiet.
- **Trade-off:** it only reports. A broken CDN URL or an unpublished update still needs someone to act on the email.

## Security advisories checked automatically, with written exceptions

`tests/advisories.js` asks osv.dev (which includes GitHub's advisories) about the seven pinned library versions. A new high or critical advisory fails the weekly health check; others are warnings. Advisories that were looked at and don't affect the app are listed in `tests/advisories-accepted.json`, each with the reason.

- **Why:** the app runs these libraries on files from outside (manifests, log PDFs, spreadsheets, photos, barcodes), and versions are pinned, so a new advisory for a pinned version would otherwise only be found by someone looking.
- **Why written exceptions:** jsPDF 2.5.1 has 12 known advisories, all in features the app doesn't use (GIF and BMP images, annotations, form fields, `addJS`, XMP metadata, the Node.js build, `html()`, opening output in a new window). Writing down why each one doesn't apply means the check can stay strict for anything new, and the reasons can be rechecked when the code changes. The check also says when an accepted entry is no longer reported, so the list doesn't go stale after an upgrade.
- **Blocking weekly, not on every push:** `advisories.js` and `sri.js` need osv.dev and the CDNs. In `test.yml` they run with `continue-on-error`, so a new advisory or a network problem doesn't stop an unrelated fix from being checked; in `health.yml` they fail the run and send the email.
- **Trade-off:** if an accepted advisory's reason stops being true (for example the app starts using `addJS`), the check won't notice; the `security-reviewer` agent and the note at the top of the file are the reminder.

## Demo video in the Guide, loaded on demand and not cached

The Guide starts with a button that shows a narrated demo video of about 47 seconds (`media/demo.mp4`, about 1.8 MB, with subtitles; 39.7 seconds from build 39, when the button changed from 38 to 40 seconds, and 46.6 seconds since build 49, when it was re-recorded with the damage scene and the button says 47 seconds) instead of loading the player straight away. The service worker leaves `.mp4` and `.webm` requests to the browser.

- **Why a button and `preload="none"`:** most opens of the Guide are to look something up, often on mobile data. Nothing is downloaded until someone asks for the video, so opening the Guide costs nothing extra.
- **Why it isn't cached:** browsers fetch video with range requests, and the partial (`206`) responses can't be stored with the Cache API. Saving the whole file for offline use would need extra service worker code, and would add 1.5 MB to every install for something most people watch once.
- **Why a file on the site:** it comes from the app's own address, so the security policy (`default-src 'self'`) needs no change and no outside video host is involved.
- **Trade-off:** the video needs a signal every time. Offline it shows a plain "couldn’t play" message; the written Guide below it still works offline. A check keeps the file under 3 MB.

## One photo reader per batch, with reads taking turns (build 41)

`ocrLpns()` keeps one tesseract.js reader for a batch of photos or scanned PDF pages (`ocrWorker()`), closes it 15 seconds after the last photo (`ocrDone()`), and queues reads on `ocrQ` so only one runs at a time. Each `recognize()` has a 120-second limit (`ocrRead()`).

- **Why reuse:** starting a reader takes a second or more per photo on a phone; a batch of manifest photos paid that for every photo.
- **Why close after 15 seconds:** the reader holds the engine and language data in memory. Build 41's first version (`1bbbce7`) waited 45 seconds; the review fixes in `bd24f4f` shortened it to 15 seconds, enough to cover the gap between photos in one batch.
- **Why close at once on failure:** a reader that threw or hung may be broken, so the next photo starts a fresh one rather than reusing it.
- **Why a queue:** manifest photos and a log photo can be read at the same moment. They would share one reader, and `setParameters()` (mode 11 for the page, mode 7 for close-ups) from one read would change the mode of the other in the middle of its read.
- **Why a time limit on each read:** a phone can stop the reader while the app is in the background, and `recognize()` then never finishes, which would also block every read queued behind it. After 120 seconds the photo fails with "The photo reader stopped. Try the photo again." A failed close-up re-read is normally ignored, but a stuck one is passed up (`e.stuck`), so a hung reader doesn't cost 2 minutes per close-up.
- **Why close a reader that starts late:** the 90-second start limit only stops waiting; without the extra `terminate()` a reader that finished starting afterwards would stay running unused.
- **Trade-off:** a second batch waits for the first to finish, and the reader's memory stays in use for 15 seconds after the last photo.

## A scan made while a warning waits is kept, not added (build 41)

When the Skip / Add anyway warning is showing, `add()` leaves the new LPN in the box, selected, with "Answer the check first (Skip or Add anyway), then add <LPN>." Escape skips the warning.

- **Why:** an accessibility review found that a hardware scanner types and presses Enter without anyone looking at the screen; before, the second LPN was cleared from the box and lost.
- **Why not add it anyway:** the warning is about the previous pallet and needs an answer first; adding the next one would leave the warning open under a different pallet.
- **Why selected:** if the person scans again instead, the new scan replaces the kept one instead of being appended to it.
- **Why Escape is limited:** it doesn't act while a panel or the install box is open (Escape closes those), while the warning is hidden, or while another box, such as an LPN being edited in the table, has the keyboard (Escape cancels that edit).

## Contrast tokens worked out from the theme (build 41)

`applyTheme()` sets `--bd` (borders of boxes and buttons, at least 3:1) and `--act` (accent used as text and focus outline, at least 4.5:1, mixed towards the text colour until it is). `--line` and `--ac` are unchanged.

- **Why worked out, not fixed:** the theme comes from any two colours the user picks, so a fixed value can't be right for all of them. The checks try the quick themes and pale, dark and orange accents.
- **Why keep `--ac` and `--line`:** filled buttons, the LPN box border and pallet colours keep the exact chosen accent, and dividers stay light; only edges and accent text that need to be read change.
- **Trade-off:** with a pale accent, headings and links are shown darker than the chosen colour.

## Panels and the install box as modal dialogs (build 41)

Opening the side panel or the install box moves focus in, makes `main` and the header `inert`, and gives focus back to the opener on close (`dlgOpen()`, `dlgClose()`).

- **Why `inert`:** without it, Tab and screen readers could reach the page hidden under the shade. `aria-modal="true"` tells screen readers the same.
- **Why un-inert only when neither is open:** both dialogs use the same `inert` switch, so closing one must not make the page reachable while the other is still open. (The Settings link to the install box closes the panel first, then opens the box, which inerts the page again and remembers the focused element at that moment as the one to return to.)

## Accessibility review items not done yet (build 41)

The audit by the `a11y-reviewer` agent that led to build 41 also suggested changes that were not made in build 41: showing the Undo bar in the phone entry bar, LPN cells that can be edited from the keyboard, Escape closing the export menus, and smaller labelling points. Build 42 made them (see below).

## Rest of the accessibility audit (build 42)

- **LPN cells are buttons (`button.lpnedit`), styled as text:** a plain `td` with a click handler couldn't be reached with Tab or announced as something to press. Focus goes back to the edited LPN after Enter or Escape, found by its row index (`data-i`), not its text, because the text may just have changed. Ending an edit by tapping elsewhere doesn't move focus.
- **Undo bar fixed just above the entry bar on phones, 20 seconds, kept while focused:** before, it showed in the page itself, which on a phone could be off screen while scanning, and it went after 9 seconds. It uses `--dockh` (the entry bar's measured height), so it follows the bar's real size. The "Added" note moves above it rather than being hidden behind it.
- **Trade-off (known minor issue):** with the Manifest check open the entry bar steps aside and the Undo bar drops to the bottom of the screen, where it can cover one results row for up to 20 seconds. This was accepted rather than adding more placement rules.
- **Entry-bar counter not announced:** `#dockCnt` changed on every add and was read out on top of the "Added" note, so screen reader users heard the count twice.
- **Smaller points:** a hidden "Remove" heading for the ✕ column, date-specific names for Saved deliveries buttons (several "Open" buttons were indistinguishable), results headings as `h3` so the heading levels don't skip, `--ink` text in `#cmpSum` for contrast, a 44px Matched summary, Escape for the Export menus, and no smooth scrolling for Guide links with reduced motion.

## Report a problem or idea through a Worker into a private repo (build 42)

Staff can send a problem or idea from the **Report a problem** button (labelled **Report** from build 44 to 57) at the top of the page (since build 44), Settings or the Guide; a Cloudflare Worker (`tools/feedback-worker`) turns it into an issue in the private repo `Jamie9904/lpn-feedback`.

- **Why a Worker:** the site is public, so it can't hold a GitHub key. The Worker holds a fine-grained token for that one repo only (Issues and Contents), stored as a Worker secret, and checks every report before using it.
- **Why a private repo:** reports can include LPNs, manifest numbers and text read from supplier documents. Attaching the problem report can be unticked. (Until build 44 the form also said where reports go and what the problem report contains; see below.) This changes the earlier stance in "Problem log kept on the device, sent by hand": the log still never leaves the device by itself, only when attached to a report the user sends.
- **Why limits in a Durable Object:** the Origin check only stops other websites, not scripts calling the Worker directly. One Durable Object keeps the counts for all of Cloudflare's servers (10 an hour per address, 50 reports and 20 photos a day), which is what actually limits spam.
- **Why text in `~~~~` blocks and only the version line as `app`:** anything typed or read from a photo could otherwise add links, `@` mentions or formatting to the issue.
- **Why JPEG only, shrunk in the app:** a 1600px JPEG is small enough to send on a weak signal and to store; checking the data starts like a JPEG stops other files being saved in the repo.
- **Why the issue first, then the photo:** a failed issue never leaves a stray photo in the repo; a failed photo only adds a note.
- **Why some GitHub errors are retried and others not:** 401, 403, 429 and 5xx mean an expired or changed token or GitHub busy, which can work later, so the Worker answers 503 and the app keeps the report. Any other refusal (422) would fail every time, so the app drops it instead of retrying for ever.
- **Why a small offline queue without photos:** `localStorage` is shared with the log and saved deliveries; capping `lpnfeedq` at 5 reports and 300 KB (report cut to 60,000 characters, no photos) means it can't crowd them out. The list is read again before each change, so a report saved while others are being sent isn't lost.
- **Why not in backups:** like the problem log, unsent reports belong to the phone they were written on.
- **Why the deploy skips before set-up:** pushes to `main` that touch the Worker would otherwise fail until the user has created the Cloudflare account and secrets. Running it by hand still fails and names the missing secrets. The GitHub token is only given to the one step that stores it, on stdin, so it can't appear in other steps or the command line.
- **Live in build 43:** `FEEDBACK_URL` is `https://lpn-feedback.jamie9904.workers.dev/report`. Until then it was empty and the form said "Reporting isn’t set up yet" (pointing to Download problem report); that path is still there and still checked.
- **Why the exact origin in `connect-src`, not `*.workers.dev`:** a wildcard would let the page send data to any Cloudflare Worker, including someone else's. Naming one origin keeps the policy as tight as before; the cost is that a new Worker address needs the policy changed too, and a check in `tests/groups/12-report.js` fails if `FEEDBACK_URL`'s origin is missing from it.
- **Why the deploy waits and the test report is optional:** a new workers.dev address can take a few minutes to answer, so the check retries for about 2 minutes instead of failing after 5 seconds. A failed deploy shows Cloudflare's own reason in the notice so it can be fixed without reading the log. The test report makes a real issue, so it only runs when ticked by hand, never on a push.

## Demo video not re-recorded for build 41

Build 41's header buttons size to their text, so the demo fingerprint check (see "Demo video staleness" above) now warns that `#btnGuide` moved and changed size slightly. The change is small and the video still shows the same flow, so it was not re-recorded; the warning stays until the next recording updates `tools/demo-video/screens.json`.

## Report button and report box (build 44)

The report form moved out of Settings into a box in the middle of the screen, opened by a **Report** button at the top of the page, by **Settings → Report a problem or idea**, or by the Guide's link.

- **Why a button at the top:** inside Settings the form was several taps away and easy to miss. A labelled button (icon and the word "Report" until build 58, now "Report a problem"; at least 44px) in the header is always one tap away, on phones at the right of the title row and on desktop before **Guide**.
- **Why a box over the panel, not a jump to Settings:** opened from the Guide or Settings, the box sits on top and the panel stays where it was. The panel is made `inert` while the box is open, and Escape is caught first so it closes only the box; focus goes back to the button that opened it.
- **Why it closes by itself:** after "Sent. Thank you!" there is nothing more to do, so the box closes 1.5 seconds later (only if that message is still showing).
- **Wording (the user's decision):** the note about where reports go was removed from the box, and the tick box says just "Attach the problem report", without the explanation in brackets. The docs still describe what the problem report contains.
- **Trade-off:** the box no longer tells staff before sending that the problem report includes LPNs, manifest numbers and text read from photos, or that it goes to a private GitHub repository through Cloudflare. The tick box can still be unticked.

## Report system in the weekly health check, and reruns of cancelled runs

Tooling only, no app change; on `main` since build 45's release.

- **Why check the report system every week:** the Worker and its GitHub token fail silently: when the token stops working, the Worker answers 503 and phones keep the reports in their queue, so nobody sees an error. `health.yml` now tests the Worker answers, that `FEEDBACK_GITHUB_TOKEN` can read `lpn-feedback`, and that it doesn't run out within 30 days, so the failure email arrives before reports start waiting.
- **Why the token is checked from GitHub, not through the Worker:** the Worker's own copy of the token can't be read back. The health check uses the repository secret the deploy job copies to the Worker, so it only proves the Worker's token works if the last deploy succeeded; sending a real test report would prove it but makes an issue every week, which is why that stays a tick box on the deploy workflow.
- **Why 30 days:** fine-grained tokens usually expire, and GitHub sends the expiry date with every answer (`github-authentication-token-expiration`). An error 30 days ahead gives four weekly emails to replace it. The current token sends no expiry date, so the check only confirms it works.
- **Why a warning, not a failure, for changed Worker code:** a push to `main` that touches `tools/feedback-worker` already redeploys it; the warning only catches a deploy that was skipped or failed. It needs the full history (`fetch-depth: 0`) to compare with the deployed commit.
- **Why Checks has 20 minutes:** a slow Playwright browser install on GitHub made build 44's Checks run hit the 10-minute limit and be cancelled, though no check had failed.
- **Why `ship.sh` reruns a cancelled run once:** a run GitHub cancelled (for example at the time limit) isn't a failed check, so stopping the release for it would be wrong; rerunning more than once could hide a run that always runs too long, so a second cancel stops the release.
- **Feedback triage:** reading the reports is a Claude Code skill (`lpn-feedback-triage`, saved to the user's account), not a workflow. Claude now has read access to `lpn-feedback`, and a weekly Claude scheduled task summarises new reports (Mondays at 10:13 UK time, with a push notification). The task lives in the user's Claude account, not in the repository.

## Corrected numbers named in the photo note (build 45)

When `tidyReads()` changes a reading to match the rest of the page, the photo's note names it and asks for it to be checked against the paper, and the problem log records it.

- **Why:** the tidy-up is a guess from the other numbers on the page. It is usually right, but a wrong guess gives a real-looking LPN that would quietly match or miss the manifest. Naming it costs one sentence and points the check at the numbers most likely to be wrong.
- **Why only those still on the list:** a mended number the prefix list then drops isn't added, so asking to check it would be noise. A number read twice is named once.

## Report a problem with these photos (build 45)

After a batch of manifest photos, a link opens the report box with the worst photo already attached.

- **Why the worst photo, not all:** the report box takes one photo, and each is shrunk and sent in the report body. The one that couldn't be read, or found fewest numbers, or had most skipped, left-out or corrected numbers, is the one most likely to show the problem.
- **Why kept in memory only:** manifest photos can show addresses and other delivery details. Holding the `File` objects in a variable until **Clear**, a PDF read or the next batch means nothing new is stored on the phone, and nothing is sent unless the person sends the report. The trade-off is that the link is gone after a reload.
- **Why a hint, not text:** a ready-made question in the box would let a report be sent with no description at all. As a placeholder it suggests what to say but the box stays empty until the person types.
- **Why Send waits:** sending before the photo is shrunk would send the report without it. A box closed meanwhile drops the photo, so it doesn't turn up in an unrelated later report.

## Seal boxes three across only when the card is wide enough (build 45)

The trailer and seal boxes use a container query on `.dc-trl` (three across at 520px of card width) instead of a 560px screen-width media query. On desktop the Delivery card is a column of a wider layout, so a screen-width rule put three boxes side by side in a card too narrow for an 11-character seal number. The trade-off is that on some wider screens the seals now sit two across under a full-width trailer box.

## Undo at the top with the Manifest check open on phones (build 45)

On phones with the Manifest check open, the Undo bar shows at the top of the screen (below the safe area) instead of near the bottom, where it could cover a results row for up to 20 seconds while **Fix** or ✕ was being used. This replaces the known issue listed in usage.md before build 45.

## Demo video recorded with a UK browser language (build 45)

The demo video was re-recorded to show the **Report** button (as it was labelled then; **Report a problem** since build 58). It was re-recorded again for build 59 (46.6 seconds, about 1.7 MB), so it shows the **Report a problem** button; the screen fingerprint (`tools/demo-video/screens.json`) was updated with it. The context's `en-GB` locale wasn't enough for the date box, which follows the browser's own language, so `record.mjs` now also starts Chromium with `--lang=en-GB` and `LANG=en_GB.UTF-8`, `LANGUAGE=en_GB`, and date boxes show day/month/year.

## Find an LPN in Saved deliveries (build 46)

A search box in Saved deliveries hides the deliveries that don't hold the LPN typed, rather than listing matching pallets separately.

- **Why any part, normalised:** staff often have only part of a label, or type it with spaces. The search uses the same `norm()` as the Manifest check (upper case, letters and digits only), so `4040 265` finds `VLT004040265`.
- **Why 3 characters:** one or two characters match almost every delivery, so below 3 the list is left as it is and the message asks for more.
- **Why the current log is mentioned:** the current log isn't in Saved deliveries until a new delivery is started, so without that sentence a pallet logged today would look missing.
- **Limit:** only what Saved deliveries holds (this week and last week) can be found; the "Not in any saved delivery from the last two weeks." wording says so.

## Sideways and upside-down manifest photos are turned and read again (builds 46 and 47)

A photo is turned only when the first reading finds nothing that looks like an LPN (no LPNs, nothing left out for the prefix, no odd readings), 90° first, then 270°, then (since build 47) 180°.

- **Why only then:** an upright photo costs nothing extra. A photo whose numbers were only left out by the prefix list has been read correctly, so it isn't turned.
- **Why sideways before upside down:** phones are more often held sideways than upside down, so the two sideways turns are tried first and an upright-but-sideways photo is found sooner.
- **Trade-off:** a photo with nothing readable (blank or blurry) now takes four page reads before it reports "No LPNs could be read" (three in build 46), so the message says "turning the photo to try again" meanwhile.
- **Why canvases are emptied straight away:** each full-size canvas and turned copy is set to 0×0 when it is replaced and when the read ends, because phones (Safari above all) give canvas memory back late, and a turned copy doubles the memory held.
- **Checked on real photos:** `run-sideways.jpg` in `tools/ocr-check` is `run.jpg` turned on its side and `rby-upside-down.jpg` (build 47) is `rby.jpg` turned 180°; the `cli` engine follows the same turn loop (90°, 270°, 180°), so the photo check covers both.

## Trailer number in export file names (build 46)

File names are `LPN-log-<date>-<trailer>` and `Manifest-check-<date>-<trailer>`, so several deliveries on one day get different names.

- **Why sanitised:** a trailer number is typed freely; anything but letters, numbers and dashes becomes a dash and it is cut to 20 characters, so the name works on every phone and computer.
- **Why the Manifest check uses the checked delivery's trailer:** the check may be of a saved delivery while another delivery is in the trailer box. `cmpTrailer` comes from **Use current log** or the saved delivery chosen; an uploaded log or a log photo has no trailer the app can trust, so its file has none.

## Follow phone colours (build 46)

**Follow phone** switches between two fixed themes, navy and orange in dark mode and light and blue in light mode, not between colours the user picked.

- **Why fixed themes:** both are existing quick themes that pass the contrast checks, and one setting needs no second set of colour boxes.
- **Why choosing colours turns it off:** the colour boxes show the colours in use; changing one means the person wants their own colours. The colours showing are kept, so the screen doesn't jump.
- **Saved with the colours:** `follow: true` is stored in `lpntheme` and kept by backups, so a restored phone follows the mode too.

## One-tap prefix add (build 46)

When photos or PDFs give numbers with a prefix that isn't in the prefix list, **Add <prefix> to the prefix list** adds the prefix and the numbers already read.

- **Why not read again:** reading photos takes time on a phone, and the numbers were already read and only left out by the list. They are added from what was kept in memory (`cmpSkipped`), with the usual "Check them against the paper copy".
- **Why the earlier notes are kept:** the other per-photo notes (found, new, corrected) still matter after the tap, so only the "tap Add" sentence is taken out.
- **Why focus moves to the manifest box:** the button pressed disappears, so keyboard and screen reader users would otherwise lose their place.
- **Not for log photos:** the button only adds to the manifest list.

## Torch button only where the camera offers it (build 48)

The **Torch** button is shown only when the running camera track reports `torch` in `getCapabilities()`, and is switched with `applyConstraints({advanced:[{torch}]})`.

- **Why not always shown:** a button that does nothing on most iPhones would look broken in a dark trailer. Hiding it there leaves **Scan by photo** (with the camera app's own flash) as the way round it.
- **Why checked after the camera starts:** the capability belongs to the track, so it can only be read once the camera is running; the button appears a moment after Live scan opens.
- **Why off on every stop:** `stopScan()` stops the camera tracks, which turns the light off, so the button state is reset to match instead of remembering the last choice. A torch left on drains the battery.
- **Trade-off: shorter camera view.** On phones the view drops to `clamp(84px,17vh,200px)` only while the button shows, so the "Added" line and both buttons fit on 360×640 and 375×667 screens with Extra large text. Phones without a torch keep the build 41 height.
- **Not checked on a real phone by the automatic checks:** they use a stand-in camera track that reports a torch and records the calls.

## Seal check is a note, not a block (build 48)

Seal in and seal out that are the same number, or of different lengths, get a note under the boxes rather than a warning that has to be answered.

- **Why these two rules:** the seal put on should be a new one, so the same number in both boxes is usually a copy or typing slip; seals on one trailer are normally the same kind, so different lengths suggest a missing or extra character. Neither is certain, so nothing is blocked and the exports are unchanged.
- **Why spaces and case are ignored:** seal numbers are typed freely, and `sl 123456` is the same seal as `SL123456`.
- **Why a new note waits until you leave the box:** while a number is being typed it is almost always "a different length" from the other one, so showing that on each key would be noise. Typing only clears a note that no longer fits, and an unchanged note isn't rewritten, so a screen reader doesn't repeat it on every key.

## Damage notes on pallets (build 49)

A damaged pallet gets one short note (`r.dmg`): **Crushed**, **Wet**, or up to 60 characters of the person's own words through **Other…**.

- **Why only Crushed and Wet as buttons:** **Short** and **Wrap torn** were also choices while the feature was being made, and were removed at the user's request. Whether a pallet is short can't be known at the dock without the DC breakdown, so a "Short" button would invite guesses. Anything else goes in **Other…**.
- **Why from tapping the LPN:** tapping the LPN already opens that pallet for changes, so no new control is added to every row. The choices are only on the page while the pallet is open, in a row under it.
- **Why the buttons don't take focus on tap:** they cancel `pointerdown`/`mousedown`. Otherwise the LPN box loses focus first, the edit finishes on blur and the row is removed before the tap lands.
- **Why one note per pallet, as plain text up to 60 characters:** it is a short label for the printed log, not a report. Plain text keeps it safe in backups and imports (`cleanRows()` drops anything that isn't text) and keeps the Delivery Details rows short.
- **Why in Delivery Details, not a new column:** the exports are mainly printed on A4 and read on desktop; a column for the few damaged pallets would narrow the LPN column on every page. A "Damaged pallet | LPN: reason" row per pallet keeps the table as it was and is read back by `parseExported()`. App-made PDFs also carry the note as a fourth item in each `LPNLOG2:` row, so they import exactly.
- **Why it counts towards "changed since exported":** `logSig()` includes the note, so a pallet marked damaged after the export doesn't go unrecorded on the paper copy.
- **Not done:** the log copy in a Manifest check export (`logGridFrom()`) has no damage notes, and the Manifest check doesn't use them.

## Share missing list as text (build 49)

**Share missing list** in the Manifest check results sends the missing and log-only LPNs as plain text through `navigator.share()`.

- **Why text, not a file:** a short message can be read straight away in WhatsApp, Teams, email or a text, and needs no attachment; the Excel and PDF exports are still there for a record.
- **Why it copies when there is no share menu:** most desktop browsers have no `navigator.share()`, so the text is copied and the message says so. Closing the share menu (`AbortError`) is taken as the person's choice, so nothing is copied then; any other share error falls back to copying.

## No delivery start and finish times (build 49)

Recording when unloading started and finished was considered and deliberately not added. The user decided against it because the times could be used to time staff and put pressure on them. Nothing new is stored: the log still has only the delivery date, the time of the last export ("Exported at hh:mm", `exp.at`) and, for saved deliveries, when they were saved.


## Share this app with a fixed QR code file (build 50)

**Settings → Share this app** shows `media/share-qr.svg`, a QR code made once outside the app (reportlab's QR encoder, version 3, error correction M), rather than one drawn by the app.

- **Why a static file:** making a QR code in the page would need a new library from a CDN (another fingerprint, another host for the security policy) or a QR encoder written into the app. The address doesn't change, so a 180px SVG that is in the offline shell does the job with no new code to load.
- **The address is written in the app:** `shareApp()`, `#shareUrl` and the QR code all use `https://jamie9904.github.io/` rather than `location`, so a copy opened from `localhost` or a test server still shares the live site. The cost is that a move to another address means regenerating the QR code (and decode-checking it) and changing the text in `panels.js`.
- **Why share, then copy, then show:** the same fallbacks as **Share missing list**: the share menu on phones, a copied link on computers, and the address on screen when neither is allowed. Closing the share menu is the person's choice, so nothing else happens.

## Privacy section in the Guide (build 50)

The Guide's section 10 says what stays on the phone and what a report sends, in plain words, instead of a separate privacy page.

- **Why in the Guide:** staff already open it, it works offline, and the Settings report section points to it. The report box itself still doesn't say where reports go (the user's choice in build 44).
- **Why it lists the problem report's contents:** a report can hold LPNs, file names and text read from photos, so people should know before ticking **Attach the problem report**. The list was checked against `reportText()`; a change to either needs the other changed too.
- **The Cloudflare address:** the Worker's `Limits` storage keeps `ip:<address>` until its daily alarm clears it, so an address can stay stored for up to about a day (see [architecture](architecture.md#feedback-worker-toolsfeedback-worker)). Build 50's Guide said "kept for an hour", the window it counts towards the hourly limit; since build 51 it says "kept for up to a day", so the Guide matches how long it is actually stored rather than how long it counts.

## Optional name on reports (build 50)

The report box has **Your name (optional)** so Jamie knows who to ask about a report.

- **Why optional and remembered:** filling it in again from `lpnfbname` saves typing it for every report, and leaving it empty (which also forgets it) keeps reports without a name possible.
- **Why its own plain-text block in the issue:** the name is typed freely, so the Worker puts it under "From:" in a `~~~~text` block like the message, tidied and cut to 60 characters, so it can't add mentions, links or formatting to the issue. With no name there is no "From:" line.

## Report box buttons pinned to the bottom (build 50)

**Send**, **Close** and the status line are in a sticky footer (`.fbfoot`) at the bottom of the report box.

- **Why:** the box scrolls when it is taller than the screen, and big text, the new name box, a short phone or the open keyboard can make it so; **Send** and the "Sent" or "saved on this phone" message would then need scrolling inside the box to see. The footer keeps them on screen while the form above scrolls. The check at 360×640 with Extra large text guards it.

## Welcome and what's new card (build 50)

A card at the top of the page offers the demo video on the first visit, and shows the newest Changelog line after an update.

- **Why a card, not a pop-up:** it doesn't block logging, it can be ignored, and on the first visit the install pop-up is already a dialog. It is set `inert` while a dialog is open, like the page.
- **Why "first visit" means no `lpn*` keys at all, checked first thing in `core.js`:** any earlier use of the app leaves a key, and the check has to run before the app saves anything on that load. Build 50 offered it on that one load only, so a reload counted as "not now". Since build 51 that first load marks `lpnwelcome` as `"ask"` and the card stays until it is answered: a first load is often interrupted (the install pop-up opens over it, or the page is reloaded), and the card shouldn't be lost then. It is still never shown to anyone who used the app before the first visit was marked, because `FIRST_OPEN` is false for them.
- **Why one Changelog line, cut to 170 characters:** the card should fit a phone screen; **See what’s new** opens the full Changelog.
- **Why the build is stored on every load:** so the card shows once per update and never on a fresh install. Phones that update from build 49 had no stored build, so they see no card for build 50; the first what's-new card comes with the next update.
- **Why focus goes to the Guide button:** the card's buttons disappear when pressed; moving focus first to a button that stays in the header means keyboard and screen reader users aren't left on nothing.

## Version 4.0 with a short summary first (build 52)

The Changelog's newest heading became **v4.0** with six bullets that sum up the recent work, instead of adding more bullets to the long v3.30 list. The four newest v3.30 bullets moved into it; the rest of v3.30 stayed as it was.

- **Why:** the app is now shared with colleagues (Share this app, the welcome card), and a newcomer opening the Changelog should see what the app does now in a few lines, not 20 bullets of fixes.
- **Why no code change for the number:** `appVersion()` and the footer already read the version from the first `<h3>vX.Y` in `HELP.log`, so exports, reports, the problem report and the footer show v4.0 from that one edit. The build number in `sw.js` is still what tells two releases apart.
- **Trade-off:** the what's-new card shows the first bullet, which is now a summary ("Version 4.0, ready to share with colleagues: …") rather than the latest change; later releases add their bullet first again.

## Shorter, plainer Guide (build 52)

The Guide was cut from about 1,630 to about 1,180 words and then edited into plain language: short whole sentences, clear references ("Tap it" only after naming the thing) and instructions in the active voice. The ten sections and their titles stayed.

- **Why:** staff read it on a phone on the loading bay; the user asks for UK English and plain wording in the app.
- **Why keep the titles:** `guideToc()` builds the contents bar from them and its `short()` map is keyed by title, so changing a title would lose its short name.
- **What was put back after the first cut:** Undo, working offline, **Tap to share**, the handheld scanner note and clearing the manifest numbers on Start new delivery (`2710acf`), because these answer common questions.
- **Trade-off:** less detail in the app; the full reference is these docs, which are not on the site.

## Checks split into one file per area (build 52)

`tests/run.js` was one file of about 1,400 lines. It is now a short runner; shared helpers are in `tests/lib.js` and the checks in `tests/groups/01-layout.js` … `19-offline.js` (now `22-offline.js`: build 53 added `19-site-config.js`, build 55 `20-no-lpn.js` and commit `f510058` `21-old-data.js`), run in name order (see [testing](testing.md#how-the-checks-are-laid-out)).

- **Why:** a change to one area means reading and editing one file of 13 to 190 lines instead of finding the right place in a long one, and reviewers and the `lpn-write-check` skill can point at a single file.
- **Why each file self-contained:** a group takes only what it needs from `../lib` and keeps its own variables, so a group can be moved, renumbered or run on its own without breaking another.
- **Why numbered names and no list of groups:** the runner picks up every `NN-name.js` file, so adding a group can't be forgotten in a second place, and the number keeps the old order (the offline check still runs last).
- **Kept the same:** every check, its name and the output, so the counts (248 locally, 273 on GitHub) and the GitHub "Checks" notice are unchanged; `npm test` and the git guard still run `node tests/run.js`.

## Clear trailer, seals and notes keeps the rest (build 53)

A button under Delivery notes empties the trailer number, both seals and the notes, and nothing else.

- **Why these four:** they belong to one trailer, while the date, who received it and the expected pallets can stay the same for the next trailer on the same day (the code comment: "for the next trailer on the same day, keeping the date, name and expected count").
- **Why separate from Start new delivery:** that saves the delivery and clears the pallets; this button touches neither the pallets nor Saved deliveries.
- **Why Undo instead of a question:** like removing a pallet or Clear all, it acts straight away and offers **Undo** (20 seconds), so a slip costs one tap and the common case costs none.
- **Why greyed out when empty:** pressing it would do nothing, and a disabled button says so. `syncClear()` also runs from `setDel()`, so the state is right after loading a saved delivery or undoing a new delivery.
- **Why focus goes to the trailer box:** the next thing to do is type the new trailer number.

## Site settings in a script file, `config.js` (build 53)

Features can be switched off for everyone, or marked as in testing, by editing `config.js` in the repository.

- **Why a script that sets `window.LPN_CONFIG`, loaded before `core.js`:** the settings are there before any other script runs, with no extra request to wait for, so `feat()` gives the same answer everywhere from the first line. The file is in `SHELL`, so it works offline like the rest of the app.
- **Why no cache bump:** app files are fetched network-first, so the next online load gets the new file. The site owner can change a switch on GitHub without touching `sw.js`; a phone that is offline keeps the last copy until it is next online.
- **Why a mistake leaves everything on (fails open):** a broken settings file should never take features away from staff mid-shift. Only a value of exactly `false` hides a feature, and only exactly `true` adds a testing note. The check in `tests/groups/19-site-config.js` makes a mistake visible on GitHub instead (unknown names, values that aren't `true` or `false`, missing names, anything that isn't a plain `{ … }` list).
- **Why only the file's own keys are read, and `__proto__`, `constructor` and `prototype` are refused by the check:** names inherited from `Object.prototype` must not count as settings, so a file can't switch anything through them.
- **Why switching off hides rather than deletes:** data already on phones is kept. Damage notes stay on pallets and on exports; manifest numbers stay in `lpncmpman` but `manState()` ignores them, so nobody gets warnings from a hidden section; queued reports stay in `lpnfeedq` but aren't sent. Switching the feature back on brings them back.
- **Why photos off also ignores the prefix list:** the prefix presets are hidden with the photo buttons, so a list saved earlier would otherwise leave out PDF numbers with no visible reason. `getPfx()` returns an empty list instead.
- **Why the Guide and Settings text is filtered, and the Guide renumbered:** staff shouldn't read about a button they can't find. `data-f`/`data-nf` marks the lines in the help HTML, `siteHtml()` removes them before the panel is shown, and the numbers are redone so the contents bar has no gaps. `data-nf` gives a different sentence where a plain removal would read wrong (the privacy line with no Report button).
- **Why the testing note mentions Report a problem, except for reporting itself:** the point of marking a feature as in testing is to hear when it goes wrong. When reporting is the feature being tested, the note points to **Download problem report**, which doesn't depend on it; when reporting is switched off, the other notes don't mention it.
- **Why the scan and torch notes wait in the camera box:** the camera box is shared by Live scan and Scan by photo, so `scanNote()` shows only the note for the one in use, and the torch note only shows with the Torch button (which many iPhones never show).
- **Trade-off:** the settings apply to everyone using this copy of the site; there is no per-phone switch. Adding a new switch means touching `FEATURES`, `config.js`, the code that shows the feature, its help lines and `testNote()` (the steps are in `.claude/CLAUDE.md`).
- **Why the offline checks were renumbered:** `19-site-config.js` took number 19 and `19-offline.js` became `20-offline.js`, because the offline group takes the page offline and must stay last.

## Live scan from further away: sharper picture, continuous focus and zoom buttons (build 54)

Live scan asks the camera for up to 1920×1080 with continuous focus, and offers − and + zoom buttons on phones whose camera allows zoom.

- **Why a sharper picture:** before build 54 the request gave only `facingMode`, so the browser chose the size. A sharper picture gives a small or distant barcode more pixels, "so small barcodes can be read from further away" (the code comment). Everything is asked for as `ideal`, so a camera that can't give it still starts, with the nearest it has.
- **Why 1280×720 for ZXing:** the fallback reader on iPhones and Firefox decodes every pixel itself in JavaScript (the code comment calls it slower), so it asks for less: every extra pixel is work for it on each read.
- **Why one read at a time:** `detect()` on a larger picture can take longer than the 250 ms tick on a slow phone (the code comment). Skipping a tick while a read is running stops reads piling up and the phone falling further behind.
- **Why buttons, not a slider:** the first version (commit `71b49bf`) had a Zoom slider; the release changed it to big **−**/**+** buttons in the picture's corner, each at least 44×44px like the other controls used while scanning. Placed over the picture, they "add no height and cover only a corner" (the CSS comment), which matters because the camera box already has to fit the "Added" line, Torch and Stop scanning on short phones. The steps (1×, 1.5×, 2×, 3×, 4×, 5×) give a few fixed jumps per tap.
- **Why zoom rather than walking closer:** zoom uses the camera's own zoom, so the picture stays sharp and in focus (the code comment: "for reading barcodes from further away without losing focus").
- **Capped at 5×:** `zoomMax` is the smaller of the camera's maximum and 5, matching the last step; the code gives no further reason.
- **Why remembered on the phone:** someone who scans from the same distance every time shouldn't have to zoom again each time. The saved value (`lpnzoom`) is only used when it lies within the camera's range, so a different phone or camera doesn't get an impossible zoom. This is a camera setting, not a saved zoom for exports, which the user decided against.
- **Why each setting is sent again on every change (`camApply()`):** the torch and zoom are changed with `applyConstraints()`. The resolution, focus and the other setting (torch or zoom) are sent with each change, each in its own `advanced` set, so changing one doesn't drop the others and a camera that refuses one still takes the rest. The setting being changed goes first.
- **Why only where the camera offers it:** as with the Torch, a zoom button that does nothing would look broken. The buttons appear once the camera's `getCapabilities()` shows a zoom range; most iPhones don't, so they see nothing new.
- **No site switch:** zoom is part of Live scan, so switching off `liveScan` removes it; it has no `FEATURES` key of its own.
- **Not checked on a real phone by the automatic checks:** they use a stand-in camera track that reports a zoom range of 1 to 5 and records the calls. How far away a real phone can now read was not measured in the code or checks.

## Pallets with no LPN as numbered rows (build 55)

A pallet that arrives without an LPN is logged with the **No LPN** button as an ordinary row named "No LPN 1", "No LPN 2" and so on, with an optional description.

- **Why a numbered name, not an empty LPN or a flag:** every part of the app (the table, saved deliveries, backups, every export and both importers) already carries `lpn` as text. A name like "No LPN 2" goes through all of them unchanged and reads plainly on a printed sheet, and `isNoLpn()` (`/^No LPN \d+$/i`) is enough to recognise one anywhere, including in a log read back from an export. The cost is that a text matching that pattern always counts as a pallet with no LPN.
- **Why highest + 1, and renumbering on save:** numbering from the highest in the log means a removed pallet's number isn't handed to the next one while higher ones exist. Undo or an import can still bring back a number that has been used again since (the code comment on `fixNoLpn()`), so `save()` gives any repeat the next free number. The first holder keeps its number, so the earlier pallet's name doesn't change under the person.
- **Why no checks when adding:** the duplicate, format and prefix warnings are for scanned or typed LPNs; the name is made by the app and always unique, so `addNoLpn()` calls `addValue()` directly. It still refuses while a warning is waiting, as typing does.
- **Why the description opens by itself, and the scanner rule:** the person usually wants to note what identifies the pallet straight away, so the editor opens with the cursor in the Description box. Because that box takes the keyboard, a handheld scanner's next scan would land in it ("the box opens by itself after No LPN", the code comment); so when a pallet with no description gets a single LPN-shaped value there, it is logged as the next pallet instead. A description with other words, or a pallet that already had one, is left alone. (Build 56 replaced the LPN-shape test with a typing-speed test; see [Descriptions for FPP pallets](#descriptions-for-fpp-pallets-build-56).)
- **Why the LPN box is empty with "LPN if found":** typing over "No LPN 1" would mean deleting it first; an empty box with a hint invites the real LPN and leaving it empty changes nothing. The description is kept when the real LPN is entered, so the note made on the bay isn't lost.
- **Why one Undo per edit:** an edit can now change the description, the damage and the LPN at once. Before, each change saved and showed its own Undo bar, so the last bar replaced the others and only one change could be undone. "Everything changed in this edit goes back with one Undo" (the code comment).
- **Why counted on their own in the Manifest check:** a pallet with no LPN can't be matched to a manifest number (the code comment in `cmpData()`), and calling it "on the log only, to book in" would be wrong. So it is left out of the matching and counted as "No LPN (check by hand)" in the summary, the exports and the shared list, only when there are any. Live tracking and the "Added" note don't call it "NOT on manifest" for the same reason.
- **Descriptions in Delivery Details:** they follow the damage notes' pattern, "Pallet description | <LPN>: <text>" rows after the "Damaged pallet" rows, so the pallet list itself is unchanged and the importers put them back by LPN the same way. (The code gives no further reason for this layout.) App-made PDFs carry them as a fifth item in the `LPNLOG2` row.
- **Why a site switch (`noLpn`):** it is a new way of logging that a site may not want yet, so it can be switched off or marked as in testing like the other features. Switching it off only hides the button and its Guide and changelog lines; pallets already logged that way stay.
- **Why the what's-new card now goes through `siteHtml()`:** the new changelog bullet is marked `data-f="noLpn"`, and the card read the raw changelog, so with the feature off it would have announced a button nobody can see.
- **Why the scan buttons wrap at 300px:** with a third button in the row, the row ran off very narrow screens (about 200% browser zoom on a phone), so under 300px it wraps.

## Old-build data files made by the old builds' own code (after build 55, commit `f510058`)

`tests/groups/21-old-data.js` checks the current app against data saved by builds 19, 30, 46, 49 and 54: browser storage, a backup file, an Excel export and the Email PDF's hidden data, kept in `tests/fixtures/old/build-N`. `tools/old-data/make.js` makes them by running each old build, taken from git history, and letting its own code save, export and back up the same delivery.

- **Why:** phones keep whatever the build they had saved, and printed or emailed logs are imported again weeks later. Writing the old formats by hand in a check would only test what the check's author remembers about them; the old build's own code gives exactly what it really wrote.
- **Why these builds:** each is where saved data or exports changed shape (trailer and seals, the storage and backup tidy-up, the last build before damage notes, damage notes added, the last build before No LPN pallets).
- **Why the `.xlsx` and `.pdf` are rebuilt with Python:** ExcelJS and jsPDF can't be installed everywhere the files are made (for example the Claude cloud sandbox), so `make.js` records what the old build passed to stand-ins (the cells and merged cells, and the PDF keywords), and `files.py` writes real files from that with openpyxl and reportlab, with fixed dates so a rebuild gives the same bytes. The recorded content is checked everywhere; the real files are opened with the real ExcelJS and pdf.js only on GitHub.
- **Why a fixed clock:** saved deliveries older than last week are removed, so both the old builds and the check run with the clock at 2 March 2026, the day the files were made.
- **Trade-off:** the rebuilt files don't have the old build's styling or real jsPDF layout, only its content. A new folder has to be added by hand (`BUILDS` in `make.js`) when the data shape changes; build 55's No LPN pallets and descriptions don't have one yet.

## Descriptions for FPP pallets (build 56)

When an FPP pallet is logged, its Description box opens by itself ("What’s on it, e.g. kitchen roll"), using the same box as No LPN pallets.

- **Why FPP:** an FPP pallet is usually a full pallet of one product, so saying what is on it (the code comment: "a full pallet of kitchen roll") is useful on the sheet. The other types don't open it; any pallet that already has a description still shows the box when tapped.
- **Why not during Live scan:** "the phone's keyboard would cover the camera" (the code comment), so those pallets are tapped afterwards.
- **Why back to the LPN box after Enter or Escape:** the box opened by itself in the middle of logging, so the next action is almost always the next pallet. Leaving the box by tapping elsewhere doesn't move the cursor, as before.
- **Why the scanner rule now goes by speed:** the box opening after every FPP pallet makes it much more likely that a description is typed in it, and a PO number such as `PO12345678` has the same shape as an LPN, so the old shape rule would have logged it as a pallet. A handheld scanner types each character in well under 35 ms ("people take 100 ms or more", the code comment), so text that arrives that fast, as one word with 4 digits in a row and at least 6 characters, is treated as a scan and goes to the LPN box, where the usual checks and warnings apply. The shape test was dropped, so a scanned code that isn't LPN-shaped also goes there and gets a warning instead of being saved as the description. Text pasted into an empty box doesn't count, because the timer only starts when the box holds one character. Trade-off: a scanner that types slower than that would have its scan kept as a description (the "Description saved" Undo bar shows when that happens).
- **Why a hidden hint for screen readers:** moving the focus into the box can cut off the "Added" message, so the box describes itself with that message and how to skip ("press Enter to skip and scan the next one"). A box the person opened by tapping doesn't need it.
- **Why "Description not saved for …" on Escape:** Escape drops typed text, and with the box opening by itself people may not realise they were in it, so the message says so rather than losing it silently.
- **Why the "Added" note is moved out of the way:** on short screens (200% zoom, Extra large text) or a long log on a desktop, the newly opened row could sit under the note. The page scrolls the row clear, and only if it can't is the note hidden early; a warning note is never hidden.
- **Why a site switch (`fppDesc`):** like `noLpn`, it changes how logging feels, so a site can switch it off or mark it as in testing. Switched off, an FPP pallet only shows the box if it already has a description.

## Readable text on mid-grey backgrounds, and a count that fits (build 56)

- **Light or dark by contrast, not a fixed luminance cut-off:** `applyTheme()` used to call a background dark below luminance 0.3, which gave light text on mid greys such as `#8c8c8c`, where it is hard to read. It now picks whichever of white or black text has more contrast. On a mid-tone background neither text nor grey text may be readable at the usual mix, so `--ink` and `--mu` are moved towards black or white until they reach 7:1 and 4.5:1 against both the background and the boxes, and the boxes are first moved away from the text colour if even pure black or white text wouldn't reach 4.6:1. The quick themes already passed, so they don't change (a check holds navy and orange at their old values).
- **Entry-bar count:** fixed shortening below 400px still cut the count off with Extra large text or manifest numbers, and shortened it on phones that had room. `fitDock()` tries the wordings longest first and keeps the first one that fits, so the bar never shows a cut-off count; the full wording stays in the label for screen readers.
- **Smaller fixes:** the LPN edit box is 44px tall to match the other tap targets; long descriptions are kept to two lines under 360px so one pallet doesn't take up the screen (all of it shows when tapped and on the exports); at 320px the edit box and entry bar can shrink so the page doesn't slide sideways, and testing notes in the editor row wrap.

## Manifest photo fixes from problem report #2 (build 57)

The user's photos of 6 Nov 2026 showed three problems on GitHub's real reader: `V0013323651` among `VLT` numbers was left out, `QUB001911625` was read with a gap (`QUB00191 1625`) and lost, and `RUN001840861`, alone on its page, came out as `RUN0001840861` with print showing through from the back of the page read as `FI8111010009`.

- **Why `V`, `R` and `Q` need a label as well as the digit count:** the build 37 rule leaves out a prefix of a different length from the rest of the page, which is right for specks but dropped a real `V` number. A first try kept any number printed after an "LPN" label whatever its prefix, but that let specks through on `vlt.jpg`. `KNOWN_ONE` lists only the single letters real LPNs use (the app's first prefix list had them), and on a page with a pattern they also need an LPN's digit count and the label, so a speck read as `R014908200` without a label is still left out.
- **Why a gap is joined only straight after a label, on the same line and close together:** GitHub's reader joined specks on `vlt.jpg` into `L0441010054` when any two words could be joined. Requiring the label, a vertical overlap of most of the word height and a gap under one word height means a short code in the next column or on the next line is never joined on.
- **Why "LPN" is never a prefix:** it is the label printed before each number, so `LPN 0013323651` (the `V` not read) would otherwise become a made-up LPN.
- **Why a number read without its letters is named, not added or guessed:** the app can't know which letters were lost. Naming the digits and saying to type the LPN with its letters means it isn't lost silently.
- **Why the plain reading beats a close-up that only adds a 0 on a page with no pattern:** with nothing to compare, the close-up normally wins, but here it added a 0 to a number read cleanly from the raw text. Because a real LPN can have that 0 (`RUN0001830763`), the kept reading is named as corrected so it gets checked against the paper. A real 10-digit number read the same both times, and a close-up that differs in other ways, still follow the old rule.
- **Why show-through is judged by the label:** print from the back of the page has no "LPN:" label in front, so on a one-LPN page an unlabelled reading with a different prefix from the labelled ones is left out (and named if it has an LPN's digit count). A `V`, `R` or `Q` number with an LPN's digit count is never treated as show-through, in case its label wasn't read.
- **Tried and removed: correcting a reading across photos.** The first build-57 change mended a reading with an extra 0 by comparing it with the other photos in the batch. It was taken out because it could change a real 10-digit number when other photos happen to have 9-digit ones; the tidy-up stays per photo.
- **Why the word handling is shared (`ocrWordCands()`):** `tools/ocr-check` had its own copy of the word loop, so a fix in the app wasn't tested by the check. One function keeps them the same.
- **Why the photo check counts "named without its letters" as not a failure:** the local `cli` engine misses the `V` on `vlt-2.jpg`; the app names it in the note, so the tool reports "named in the note without its letters" instead of a missing LPN. GitHub's real reader, which decides, still has to read it in full (54 of 54).
- **Trade-off:** a real LPN with a one-letter prefix other than `V`, `R` or `Q`, or one whose label wasn't read, among longer prefixes is still left out (named if it has an LPN's digit count). A number split by a gap is only found when it is printed after an "LPN:" label.

## Top button says "Report a problem" (build 58)

The button at the top of the page said just **Report** from build 44. It now says **Report a problem**, and the Guide, Settings, privacy text and the "In testing" notes use the same words.

- **Why the longer label:** "Report" on its own didn't say what is being reported. The changelog line puts it as "so it’s clear it’s for problems with the app or ideas for it". The `aria-label` stays "Report a problem or idea", which starts with the visible words; `12-report.js` checks that it does.
- **Why two lines and no icon on small phones:** the longer label sits next to the "LPN Pallet Log" name in the title row. Under 480px the label wraps to two lines (`max-width: 5.6em`), and under 360px the icon is hidden as well, so the app name keeps its room (the CSS comment: "so the app name keeps its room"). The button stays at least 44×44px.
- **Why the switched-off privacy line changed:** with reporting off it said "There’s no Report button", naming a button by its old label. It now says "There’s no button for sending reports in this copy of the app", which doesn't depend on the label.
- **Trade-off:** on phones under 480px the button is two lines tall and takes more of the title row; under 360px it is text only. The demo video still shows the old **Report** label, because it wasn't re-recorded for this build.

## Test a handheld scanner in Settings (build 59)

The Guide used to say the handheld or Bluetooth scanner "hasn’t been tested yet, so it may not work". Build 59 adds a way for each person to test their own scanner: **Settings → Test a handheld scanner** (`scanTestSetup()` in `panels.js`), and the Guide line now points to it.

- **Why a separate box, not the LPN box:** a test scan into the LPN box would log a pallet (or open a warning) that then has to be removed. The test box is never connected to `add()` or `rows`, so "Nothing is added to the log" is true by construction, and it can be used mid-delivery.
- **What it reports, and why those things:** the three things that decide whether a scanner works with the app. Whether it sends **Enter** (the LPN box logs on Enter; many scanners send Tab or nothing out of the box, and the fix is the scanner's own setup barcodes, so the message says where to look: "often called a suffix or CR … in its manual"); whether it **arrives at scanner speed** (the Description box only treats text as a scan when it comes in under 35 ms per character plus 100 ms, so the test uses the same sum); and whether the code **looks like an LPN** (using the log's own `lpnIssues()`, so the test and the real log can't disagree).
- **Tab is caught in the box:** with text in the box, Tab is stopped from moving focus, so the result is shown and the next test scan lands in the same box.
- **1.5 seconds before judging a scan with nothing after it:** a scanner that sends no suffix gives no signal that it has finished, so the test waits for a pause. The timer restarts on every character, and 1.5 seconds after the last one is long enough that slow typing (trying the test by hand) isn't judged part-way through (as the comment on `scanTestSetup()` says); this was set in the review fixes (`f7dcdb6`).
- **Typing-speed note only for 6 or more characters:** the Description box's scanner rule only counts text of 6 or more characters as a scan, so the speed only matters for codes that long; a short code scanned at once is no longer called typing speed (`f7dcdb6`).
- **"Already logged" is left out,** because testing with an LPN label from today's delivery is the natural thing to do, and that is not a scanner problem.
- **A prefix not in the list is still called an LPN:** the prefix list (**Prefix presets**) is a Manifest check setting, and a code that only fails on its prefix has an LPN's shape and digit count. So the message says it looks like an LPN and where to add the prefix, rather than "try an LPN label", which would have suggested the scanner misread it. Other problems (digit count, shape) still say "try an LPN label to check", since the barcode was probably something else (a product barcode, for example).
- **No site switch:** it changes nothing and sends nothing, so there is nothing a site would need to switch off.
- **Not covered:** a real scanner. The checks use Playwright's typing (at once, and with 150 ms between keys); a Bluetooth scanner's keyboard behaviour on a real phone (for example the on-screen keyboard hiding) is not tested.

## Corrected-number photo note wording (build 59)

The photo note for a number the tidy-up changed said "corrected to match the others on the page". Since build 57 the same list (`.mended`) also holds the plain reading kept on a page with one LPN, where the close-up added an extra 0; there is nothing else on that page to match. The sentence now says "1 number looked misread, so it was corrected (…): check it against the paper.", which is true for both cases and still asks for the paper check. The problem log line ("corrected to match the page") was not changed.

## Saved deliveries kept by the later of date and save day (build 60)

`pruneHist()` used to keep a saved delivery only by its delivery date. **Start new delivery** on a log dated before last week saved it, `pushHist()` pruned it in the same call, and `newDelivery()` then stopped with "Cannot read properties of undefined (reading 'id')" reading `hist[0].id`: the delivery was neither in Saved deliveries nor started afresh. It was found when GitHub's checks ran on Sunday 8 November 2026, the start of a new week, when a check's delivery dated 26 October fell out of the window.

- **Fix:** an entry is kept by the later of its delivery date and the day it was saved, and `newDelivery()` uses the id `pushHist()` returns instead of `hist[0]`.
- **Why the later of the two, not the save day alone:** a delivery saved before last week but dated within it (dated ahead) still counts by its date, as before; and every delivery that was kept before is still kept, so nothing already saved disappears with the update.
- **Same for imports:** an imported old log is saved with today's save time, so it is now kept in Saved deliveries instead of being removed at once and offered for loading into the log. Build 60 left the "older than last week, so it can’t be kept" branch in the import code; build 61 removed it (see below).
- **Trade-off:** a log left open for weeks and then saved stays in Saved deliveries until the end of the following week, so Saved deliveries can hold deliveries dated well before last week. For those, **Find an LPN**'s "Not in any saved delivery from the last two weeks." means saved in the last two weeks, not dated in them. In build 60 the Guide still said Saved deliveries "keeps this week and last week"; build 61 changed it to "keeps what you saved this week and last week".
- **Check with a fixed clock:** the new check in `02-phone.js` fixes the clock to Sunday 8 November 2026, so it no longer depends on which day the checks run.

## Imports always kept; unreachable message removed (build 61)

After build 60 an imported log is saved with today's `saved` time, so `pruneHist()` never removes it straight away, and the import code's "…but that is older than last week, so it can’t be kept in Saved deliveries." message with its **Load it into the log** button could not be reached.

- **Removed rather than kept:** the import handler in `initHistory()` no longer checks whether the new entry survived `pushHist()`; it always says "Imported n pallet(s). Tap Open to use it.", with "pallet" for one. Code that can no longer run was taken out rather than left unchecked.
- **Wording follows the rule:** the Guide (section 7) and the Saved deliveries help now say deliveries are kept by when they were saved or imported (the code still uses the later of that day and the delivery date), so a delivery dated weeks ago showing in the list is expected.
- **Trade-off:** an imported delivery from long ago now uses one of the 50 places in Saved deliveries until the end of next week.
