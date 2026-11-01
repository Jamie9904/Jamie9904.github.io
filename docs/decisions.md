# Technical decisions

## No backend; data on the device

Everything runs in the browser and is stored in `localStorage`.

- **Why:** the app needs to be free to host (GitHub Pages), work with no signal on a loading bay, and need no accounts or IT involvement.
- **Trade-off:** data is per device and per browser. There is no sharing between devices and clearing site data loses it. This is mitigated by backup/restore (all `lpn*` keys to a JSON file), a "last backed up" note in Saved deliveries, and by exports being the real record.
- **Consequence:** because a backup file can be edited or damaged before it is restored, saved data can't be trusted just because the app wrote it (see [Saved data is tidied when read](#saved-data-is-tidied-when-read)).
- **Trade-off:** history is deliberately short (this week and last week, max 50 entries) to stay well inside `localStorage` limits.

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
- **No options needed:** pdf.js 6 no longer has `isEvalSupported` or `enableScripting`. It no longer compiles anything from a file, and a PDF's own scripts only run in the pdf.js viewer, which the app doesn't use. So the protection is the version, and a check in `tests/run.js` reads the pdf.js version from the URLs in `compare.js` and fails if it is in either known bad range.
- **Legacy build:** it is made for older browsers and phones. Even so it needs roughly iOS/Safari 16.4+, Chrome 94+ or Firefox 93+. On older phones PDF reading fails with a plain message (`PDF_LOAD_MSG`) that says to type the numbers in the box instead; the rest of the app is unaffected.
- **Loaded with `import()`:** pdf.js 4 and later are published only as ES modules, so `loadScript()` (a script tag) can't load them. `loadPdfJs()` uses a dynamic `import()` with a 15-second limit per host and sets `window.pdfjsLib` itself, so the rest of the code is unchanged.
- **jsDelivr then unpkg:** cdnjs only hosts the modern build, so the hosts differ from the other libraries. The worker (`pdf.worker.min.mjs`) comes from the same host as the library; pdf.js wraps a worker from another site itself, so no copy on the app's own site is needed. `unpkg.com` was already in the service worker's `CDN` list, so both files are cached in the library store (now `lpn-libs-v2`) on first use.
- **One function for every reader:** `readPdf()`, `readLogPdf()` and `parseExported()` all call `openPdf()`, and a scan in `tests/run.js` fails if `getDocument(` appears anywhere else, so a new PDF reader can't bypass it.
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
- **Checked both ways:** a check in `tests/run.js` fails if a library address in the code has no hash or a hash has no address, and `tests/sri.js` downloads every file and compares the hash each week, so a CDN change shows up as an email before users notice a feature failing.
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
- **How it is kept working:** `tests/run.js` checks the policy is in place before any script with no general eval, that everyday screens run with nothing blocked, and (on GitHub, with the real libraries and the real photo reader) that Excel, PDF export, PDF reading, pdf-lib, photo reading, printing and ZXing all work with nothing blocked in the page or its workers. This automated coverage of photo reading was what held the policy back before.

## Exports designed to be read back

The Excel log keeps an `LPN` header cell and labelled delivery cells (Date, Received by, Trailer number…), and PDFs carry the whole log as JSON in the PDF keywords (`LPNLOG2:`).

- **Why:** exported files are the long-term record. Saved deliveries can be rebuilt by importing them, and the manifest check can use them as the log, without OCR errors.
- **Constraint:** layout changes must keep those labels and that keyword format. `tests/run.js` checks the import path.

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

`tools/ocr-check/check.js` runs the app's own photo code on the user's four manifest photos (`photos/`, sent on 31 Oct 2026, address boxes cut off) and scores the result against `expected.json` (18 LPNs). `tests/run.js` uses it on GitHub with the real tesseract.js and fails on any missing or extra LPN.

- **Why real photos:** the drawn test pictures are clean; the problems users meet (shade, grain, specks, ruled lines, O read for 0) only show on real photos. The repair rules are tuned on these photos, so every change is scored against them.
- **Why two engines:** where the Claude cloud sandbox can't download tesseract.js, the `cli` engine uses the Tesseract 5 command for the reading and the app's code (`prep`, `cropScaled`, `extractLpns`, `photoLpns`) for everything else, offline. It doesn't read exactly like tesseract.js (build 37's two fixes only showed on GitHub), so GitHub reads the photos with the `js` engine, the app's real `ocrLpns()`, as on a phone.
- **Why the address boxes were cut off:** the repository is public.
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

`tests/run.js` blocks all external requests and replaces ExcelJS with a recording stand-in.

- **Why:** runs offline, quickly and deterministically in CI, and can assert on cell values, borders and print settings.
- **Trade-off:** a stand-in only shows what the app asked for, not what the real library makes of it. The real ExcelJS, jsPDF, pdf.js and pdf-lib are now also checked (next section); the camera, the photo reader and phone file viewers are still checked manually.

## Real export libraries in the checks, run on GitHub

`tests/run.js` also makes a real log `.xlsx`, log PDF and manifest check `.xlsx` with the real ExcelJS, jsPDF, jspdf-autotable and pdf.js, and reads each back through the app's own readers (`parseExported()`, `readLog()`, `readLogPdf()`). The libraries come from `node_modules` and are served in place of the CDN URLs; all other outside requests stay blocked.

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

## One working branch, updates

Every change is committed and pushed on one branch, `updates`, and `main` only moves by fast-forwarding to `updates` when the user says to publish. The git guard blocks commits on `main` and creating new branches whenever `origin/updates` exists.

- **Why:** one branch per change left a trail of merged branches that this session can't delete on GitHub, and they had to be listed for the user to remove by hand. With one branch there is nothing to clean up, and pushing `updates` still runs every check on GitHub without touching the live site.
- **Why fast-forward only:** `git merge --ff-only` keeps `main` exactly equal to what was checked on `updates`, with no merge commits, and fails loudly if the two have diverged.
- **Why only when `origin/updates` exists:** in a clone or fork without that branch the guard behaves as before, so it doesn't block normal work there.
- **Trade-off:** changes can't be kept apart on separate branches; unfinished work on `updates` has to be finished or reverted before the next release. The session-start line says when `updates` is behind `main`, for example after a fix made on GitHub.

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

The Guide starts with a button that shows a narrated demo video of about 40 seconds (`media/demo.mp4`, about 1.5 MB, with subtitles; 39.7 seconds since build 39, when the button changed from 38 to 40 seconds) instead of loading the player straight away. The service worker leaves `.mp4` and `.webm` requests to the browser.

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

Staff can send a problem or idea from the **Report** button at the top of the page (since build 44), Settings or the Guide; a Cloudflare Worker (`tools/feedback-worker`) turns it into an issue in the private repo `Jamie9904/lpn-feedback`.

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
- **Why the exact origin in `connect-src`, not `*.workers.dev`:** a wildcard would let the page send data to any Cloudflare Worker, including someone else's. Naming one origin keeps the policy as tight as before; the cost is that a new Worker address needs the policy changed too, and a check in `tests/run.js` fails if `FEEDBACK_URL`'s origin is missing from it.
- **Why the deploy waits and the test report is optional:** a new workers.dev address can take a few minutes to answer, so the check retries for about 2 minutes instead of failing after 5 seconds. A failed deploy shows Cloudflare's own reason in the notice so it can be fixed without reading the log. The test report makes a real issue, so it only runs when ticked by hand, never on a push.

## Demo video not re-recorded for build 41

Build 41's header buttons size to their text, so the demo fingerprint check (see "Demo video staleness" above) now warns that `#btnGuide` moved and changed size slightly. The change is small and the video still shows the same flow, so it was not re-recorded; the warning stays until the next recording updates `tools/demo-video/screens.json`.

## Report button and report box (build 44)

The report form moved out of Settings into a box in the middle of the screen, opened by a **Report** button at the top of the page, by **Settings → Report a problem or idea**, or by the Guide's link.

- **Why a button at the top:** inside Settings the form was several taps away and easy to miss. A labelled button (icon and the word "Report", at least 44px) in the header is always one tap away, on phones at the right of the title row and on desktop before **Guide**.
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

The demo video was re-recorded to show the **Report** button. The context's `en-GB` locale wasn't enough for the date box, which follows the browser's own language, so `record.mjs` now also starts Chromium with `--lang=en-GB` and `LANG=en_GB.UTF-8`, `LANGUAGE=en_GB`, and date boxes show day/month/year.

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
