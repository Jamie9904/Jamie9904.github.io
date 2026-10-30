# Technical decisions

## No backend; data on the device

Everything runs in the browser and is stored in `localStorage`.

- **Why:** the app needs to be free to host (GitHub Pages), work with no signal on a loading bay, and need no accounts or IT involvement.
- **Trade-off:** data is per device and per browser. There is no sharing between devices and clearing site data loses it. This is mitigated by backup/restore (all `lpn*` keys to a JSON file), a "last backed up" note in Saved deliveries, and by exports being the real record.
- **Trade-off:** history is deliberately short (this week and last week, max 50 entries) to stay well inside `localStorage` limits.

## Plain scripts, no framework or build step

Five classic scripts share globals instead of modules or a bundler.

- **Why:** files can be edited and uploaded straight to GitHub without tooling, and each file has one job, so an update usually touches one or two files.
- **Trade-off:** load order matters and names can collide. Cross-file calls that run before the later file loads are guarded with `typeof fn === "function"`.

## Heavy libraries from CDNs, loaded on demand

ExcelJS, jsPDF, pdf-lib, pdf.js, ZXing and Tesseract are loaded by `loadScript()` only when a feature first needs them, from cdnjs with jsDelivr as fallback, with pinned versions.

- **Why:** first load stays small and fast on a phone; pinned versioned URLs never change, so the service worker can cache them forever (cache-first in `lpn-libs-v1`).
- **Trade-off:** each feature needs one online use before it works offline. If the Excel library cannot load at all, `fallbackXls()` saves a basic HTML-based `.xls` instead of failing.

## Network-first service worker

App files are fetched network-first with `cache:"no-cache"`, and the install step pre-caches with `cache:"reload"`.

- **Why:** an earlier cache-friendly setup let GitHub Pages' 10-minute HTTP cache serve stale files after an update. Revalidating every request makes updates appear immediately when online while still falling back to the cache offline.
- **Discarded:** cache-first for app files (fast, but updates lag until the cache is bumped and the user reloads twice).

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
- **Trade-off:** the real Excel/PDF libraries, the camera and phone file viewers are not covered; those are checked manually.

## Claude automations kept in the repository

The hooks, agents and working notes for Claude Code are committed in `.claude/` on `main` rather than kept in one person's local settings.

- **Why:** the rules they enforce belong to the project, not to a machine: bump `CACHE` in `sw.js` with every app change, keep `docs/` off `main`, and only push when the checks pass. Kept in the repository, they apply in every fresh checkout and cloud session, change through normal commits, and can be read by anyone.
- **Cost:** none for the site. Jekyll leaves dot-folders out of the published site, so `.claude/` is not served and is not in the service worker cache.
- **Limit:** they only run inside Claude Code. Manual commits and edits on the GitHub website are still covered only by the `test.yml` checks after the push.
- **Only real git commands:** the git guard matches `git` (optionally with `-C <path>`) followed directly by `commit`, `push` or `merge … docs`. Earlier it matched any command containing "git" and "commit" or "push", so `git stash push`, an `echo`, or a script that only mentioned those words set off the checks.
- **Cache bump compared with the live site:** the commit check accepts a `CACHE` number higher than the one in `origin/main:sw.js`, as well as a `CACHE` line changed in the commit itself. A branch that has already bumped the cache once therefore doesn't need a new bump for each later commit before it is published.

## Weekly health check as a GitHub workflow

The weekly check of the live site, the CDN libraries and the tests is `.github/workflows/health.yml`, not a Claude scheduled task.

- **Why:** GitHub's runners can reach the live site and cdnjs and jsDelivr, which the Claude cloud sandbox cannot, so only a runner can actually test that the libraries still download and that the live site serves the current `sw.js`. GitHub also emails on a failed run without any extra setup, and a passing run stays quiet.
- **Trade-off:** it only reports. A broken CDN URL or an unpublished update still needs someone to act on the email.
