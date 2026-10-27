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

## Self-hosted fonts

Atkinson Hyperlegible (chosen for legibility) and IBM Plex Mono (LPNs and numbers) are served from `fonts/`.

- **Why:** consistent look offline and no third-party requests.

## Automatic checks with stand-ins

`tests/run.js` blocks all external requests and replaces ExcelJS with a recording stand-in.

- **Why:** runs offline, quickly and deterministically in CI, and can assert on cell values, borders and print settings.
- **Trade-off:** the real Excel/PDF libraries, the camera and phone file viewers are not covered; those are checked manually.
