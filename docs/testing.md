# Testing

## Run the checks

```bash
npm install
npx playwright install chromium   # once
npm test
```

`npm test` runs `node tests/run.js`. It starts its own static server on a random local port, so nothing else needs to be running. Output is one line per check and a final `N passed, N failed`; the exit code is non-zero on any failure.

On GitHub, `.github/workflows/test.yml` runs the same command on every push and pull request (Node 22, Chromium). Results appear in the **Actions** tab, and failed checks are shown as annotations on the run.

## What is covered

End-to-end checks in headless Chromium against the real page:

| Group | Checks |
|---|---|
| Layout (375, 768, 1300px) | No sideways scrolling, Date and Received by aligned, usable field widths, no script errors |
| Logging on a phone | Add flow, confirmation toast, entry-bar counter, Delivery folding, trailer/seal persistence, duplicate warning and Skip |
| Live manifest tracking | Progress text, "not on manifest" warning |
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

There is no coverage tooling configured.
