# Usage

The in-app **Guide** covers the same ground for staff. This page is the reference version.

## Main flow

1. **Delivery:** set the date and who received it. Optional: expected pallets, trailer number, seal in, seal out, notes. Previously used names appear as one-tap buttons.
2. **Manifest (optional):** open **Manifest check** and add the manifest by photo, PDF or typing, before scanning.
3. **Log pallets:** choose the type (BB, FMCG, FPP, Mixed), tick FSDU if needed, scan or type the LPN, press Add or Enter.
4. **Export:** **Export → Download (Excel)**, **Email PDF** or **Print**. The log then shows "Exported at hh:mm" and offers **Start a new delivery?**
5. **Start new delivery:** saves the delivery to Saved deliveries and clears the page (Undo is offered). If the delivery hasn't been exported since its last change, the first press shows a reminder; pressing again goes ahead.

## Logging behaviour

- The type stays selected after each pallet (unless "Keep the last pallet type" is off); FSDU clears each time.
- Before adding, an LPN is checked. A warning with **Skip / Add anyway** appears when it is:
  - already in the log;
  - not 1–3 letters followed by digits;
  - using a prefix outside the prefix list;
  - not 9 or 10 digits long.
- Each add shows "Added #n: LPN · type", plus "✓ on manifest" or "⚠ NOT on manifest" while a manifest is loaded.
- On phones the entry bar shows `n logged`, `n of expected logged`, or `n of total on manifest` (shortened to `n/total` on screens under 400px), and the Delivery card folds into one line once logging starts.
- The ↶ button next to the entry-bar counter (phones only) removes the most recent pallet, with Undo.
- Tap an LPN to edit it; change type or FSDU in the table; ✕ removes it. Undo appears after removing, editing or Clear all.
- Search and the type and FSDU filters only change what is shown; totals always cover the whole log. FSDUs are counted separately and are not part of the total.

## Scanning

| Method | When to use |
|---|---|
| Live scan | Camera continuously adds each barcode it sees; the screen stays awake while it runs |
| Scan by photo | Fallback when live scanning is unreliable |
| Hardware scanner | Focus the LPN box; the scanner types and presses Enter (untested) |

"Ask me to confirm each scanned barcode" in Settings shows each scan for approval first.

## Manifest check

- **Manifest sources:** photos (OCR), PDFs (text read exactly, scanned pages by OCR, several at once), or typed/pasted numbers.
- **Log sources:** Use current log, a saved delivery, an exported `.xlsx`/`.csv`/`.xls`, an app-made PDF (read exactly), another PDF, or a photo of a printed log.
- **Use n as expected:** while a manifest is loaded and Expected pallets is empty, the progress line offers to copy the manifest count into Expected pallets.
- **Prefix presets** limit which numbers OCR picks up. Leave the list empty for any 1–3 letter prefix. Presets come from `presets.json` and from presets saved on the device.
- **Check results** lists Missing (on the manifest, not logged: report), Log only (logged, not on the manifest: book in) and Matched. **Fix** corrects a misread number, ✕ removes it.
- **Export** gives the comparison as Excel (`Manifest-check-<date>.xlsx`), Email PDF or Print. With "Include a copy of the log" on, an uploaded `.xlsx` log gets the comparison as a new tab, and PDFs get the log appended.

## Exports

| Output | File | Notes |
|---|---|---|
| Download (Excel) | `LPN-log-<yyyy-mm-dd>.xlsx` | Title band, numbered list, totals by type, Delivery Details; A4 portrait, page numbers |
| Email PDF | `LPN-log-<yyyy-mm-dd>.pdf` | Opens the share sheet; if blocked, saves the file and opens a new email |
| Print | PDF in the print dialog | Saves the PDF if printing isn't available |

If an expected count is set and differs from the total, the first export attempt shows a reminder instead; choosing it again proceeds.

After a log export (Excel, Email PDF or Print) the log shows "Exported at hh:mm". If pallets are changed afterwards it reads "Changed since it was exported at hh:mm" in amber, and Start new delivery will ask for a fresh export first. Exports made from Saved deliveries don't change this note.

## Saved deliveries

- Holds this week and last week (weeks start on Sunday); older entries are removed automatically.
- Each entry can be opened (the current log is saved first), exported to Excel, emailed as PDF, or deleted (with Undo).
- **Import an exported log** rebuilds a delivery from an exported spreadsheet or app-made PDF. If it is older than last week, it is offered for loading straight into the log instead.
- The panel shows when this device was last backed up, with **Back up now**.

## Settings

Colours (two colours drive the whole theme, with a contrast warning), quick themes, default pallet type, keep last type, warnings, sound, vibration, confirm scans, text size, date format (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd), include log copy in comparisons, forget remembered names, backup and restore, install pop-up.

## Common problems

| Problem | Fix |
|---|---|
| Live scan doesn't start | The site must be on HTTPS and camera permission allowed. Use Scan by photo instead. |
| Export says the builder couldn't load | The device is offline and the library hasn't been cached yet. A basic `.xls` is saved; export once while online to cache it. |
| Email PDF saved a file instead of sharing | The browser refused the share. Attach the saved file to the email that opens. |
| Changes don't appear after an update | Tap **Refresh** on the update banner, or close and reopen the app. |
| Spreadsheet looks cut off on a phone | Mobile viewers open sheets zoomed in; pinch out. Desktop and print are unaffected. |
| Data missing on another phone | Data is per device. Use Back up now, then Restore backup on the other device. |
| Numbers from photos are wrong | OCR can misread letters. Check and Fix them before comparing; set a prefix preset to reduce noise. |
