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
- **Trade-off:** letters in the prefix are not repaired, so users are always asked to check the numbers before comparing.

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
- **Security reviewer agent:** a read-only `security-reviewer` agent with a checklist for files and text from outside and for the libraries, used when import code, library loading, `package.json` versions or `index.html` change.
- **Cache bump compared with the live site:** the commit check accepts a `CACHE` number higher than the one in `origin/main:sw.js`, as well as a `CACHE` line changed in the commit itself. A branch that has already bumped the cache once therefore doesn't need a new bump for each later commit before it is published.

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
