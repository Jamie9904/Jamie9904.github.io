# Testing

## Run the checks

```bash
npm install
npx playwright install chromium   # once
npm test
```

`npm test` runs `node tests/run.js`. It starts its own static server on a random local port, so nothing else needs to be running. Output is one line per check and a final `N passed, N failed`; the exit code is non-zero on any failure.

On GitHub, `.github/workflows/test.yml` runs the same command on every push and pull request (Node 22, Chromium). Results appear in the **Actions** tab, and failed checks are shown as annotations on the run.

### Before a push (Claude Code hook)

When Claude Code pushes from this repository, the `PreToolUse` hook `.claude/hooks/lpn_git_guard.py` runs `node tests/run.js` first (with `NODE_PATH` pointed at the global npm modules) and stops the push if any check fails, showing the failing lines. A push of only the `docs` branch skips the checks, because it does not change the site. If the checks take longer than 280 seconds, the push is stopped too. This only applies to pushes made through Claude Code; a plain `git push` from a terminal is not checked locally, but `test.yml` still runs on GitHub.

## Weekly health check

`.github/workflows/health.yml` runs every Monday at 07:36 UTC (`cron: "36 7 * * 1"`) and can be started by hand from **Actions → Weekly health check → Run workflow**. It checks out `main` and runs three steps:

1. **Live site is up and on the latest version.** Fetches `https://jamie9904.github.io/` (with a cache-busting `?health=` query), checks the page title is `LPN Pallet Log`, then fetches the live `sw.js` and compares its `lpn-log-vN` cache name with the one in `sw.js` on `main`. A mismatch means the last update has not been published.
2. **CDN libraries still download.** Collects every `cdnjs.cloudflare.com` and `cdn.jsdelivr.net` URL written in the root `*.js` files and downloads each one. URLs ending in `/` (the pdf.js base paths) are checked as `…/pdf.worker.min.js`. Any failed download is reported as an error annotation naming the URL.
3. **Automatic checks.** `npm install`, Playwright Chromium, then `npm test`, the same as `test.yml`.

If any step fails, GitHub sends its standard failed-workflow email (for scheduled runs, to the account that last changed the schedule in the workflow file); a passing run sends nothing. The workflow does not fix anything itself.

## What is covered

End-to-end checks in headless Chromium against the real page (63 checks at the time of writing):

| Group | Checks |
|---|---|
| Layout (375, 768, 1300px) | No sideways scrolling, Date and Received by aligned, usable field widths, no script errors |
| Logging on a phone | Add flow, confirmation toast, entry-bar counter, Delivery folding, trailer/seal persistence, duplicate warning and Skip |
| Live manifest tracking | Progress text, "not on manifest" warning |
| Phone usability | Pallet table scrolls with the page (`.wrap` overflow is `visible`); logo controls hidden in Delivery; Manifest check has no "still being tested" warning and Prefix presets starts closed; expected-count line is `prog` when under, `bad` when over and hidden when Expected pallets equals the manifest count; entry bar gets `cmpfocus` and moves below the screen when the Manifest check is scrolled to the top, comes back at the top of the page, and stays while `#lpn` has focus; an 18-character LPN causes no sideways scrolling at 360px; `#setLogo` is in Settings; `#cmpToggle` and `#manShow` are at least 44px tall |
| Quick actions | Undo-last button and its Undo, "Use n as expected", entry bar fits at 375px and at 360px with a long counter |
| Saved deliveries | Start new delivery warns when not exported, then saves and clears (including manifest), Undo restores, backup note |
| Settings and dates | Date format setting, importing an exported CSV (date, trailer, seals, FSDU), Guide contents bar |
| Excel export | Expected-count check blocks the first try; "Exported at" note and new-delivery prompt; title band and logo placement; header, row borders, Courier New LPNs, footer, fit-to-width and repeated header; trailer in Delivery Details |
| Offline | Service worker caches the app; reload works offline |

## Strategy

- **External requests are blocked.** Every request not to the local server is aborted, so runs are offline and repeatable.
- **ExcelJS is replaced by a recording stand-in** that keeps every cell value, font, border, merge, image and print setting, so the sheet layout can be asserted without the real library.
- Tests drive the app through its own globals (`newDelivery()`, `openHelp()`, `parseExported()`…) where clicking would only add flakiness, and through real typing and clicks for the add flow.

## Not covered

- Real ExcelJS, jsPDF, pdf-lib and pdf.js output. Spot-check by exporting from the live site; files can be rendered with LibreOffice to inspect layout.
- Camera scanning, ZXing/BarcodeDetector and Tesseract OCR.
- How phone apps open the files, the share sheet and printing.
- Files that libraries fetch for themselves at run time (for example Tesseract's worker and language data) are not in the health check's CDN list, because only URLs written in the scripts are checked.

There is no coverage tooling configured.
