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
- With Expected pallets set, the line under the totals reads "n of x expected" with "(n to go)" in the normal text colour while counting, turns green with "✓ all accounted for" when the count matches, and turns red with "(n more than expected)" only when there are more pallets than expected. When a manifest is loaded and Expected pallets equals the manifest count, this line is hidden, because the manifest progress line already shows the same count.
- On phones (under 760px wide) the pallet table has no scroll box of its own: it scrolls with the page, and the column headings stay pinned at the top of the screen while you scroll through it. Long LPNs wrap onto a second line instead of pushing the page sideways. On wider screens the table keeps its own scroll area (up to 60% of the screen height).
- The FSDU tick box in the entry bar and the FSDU tick boxes in the table are 32px; the Guide, Changelog and Settings buttons in the header are at least 44px tall on phones.

## Scanning

| Method | When to use |
|---|---|
| Live scan | Camera continuously adds each barcode it sees; the screen stays awake while it runs |
| Scan by photo | Fallback when live scanning is unreliable |
| Hardware scanner | Focus the LPN box; the scanner types and presses Enter (untested) |

"Ask me to confirm each scanned barcode" in Settings shows each scan for approval first.

## Manifest check

The section opens (tap **Manifest check**) on **Manifest date**, then the two steps side by side: **1. LPN log** and **2. Manifest photos or PDFs**. Below them is the closed **Prefix presets** section; its heading shows the current choice in brackets, for example "(all prefixes)", the preset name, or the typed prefix list. The **Manifest check** heading button and **Show missing** are at least 44px tall.

On phones, while the Manifest check is open and its top is in the upper part of the screen (above 45% of the screen height), the pallet entry bar slides down out of view so it does not cover the section. It slides back when you scroll up towards the log, and it never slides away while you are typing or scanning into it.

- **Manifest sources:** photos (OCR), PDFs (text read exactly, scanned pages by OCR, several at once), or typed/pasted numbers.
- **Log sources:** Use current log, a saved delivery, an exported `.xlsx`/`.csv`/`.xls`, an app-made PDF (read exactly), another PDF, or a photo of a printed log.
- **Use n as expected:** while a manifest is loaded and Expected pallets is empty, the progress line offers to copy the manifest count into Expected pallets.
- **Prefix presets** (tap the heading to open) limit which numbers OCR picks up. Leave the list empty for any 1–3 letter prefix. Presets come from `presets.json` and from presets saved on the device.
- A note under the manifest numbers box reminds you that numbers read from photos can be misread, so check them first. (This replaced the earlier "still being tested" warning at the top of the section.)
- **Check results** lists Missing (on the manifest, not logged: report), Log only (logged, not on the manifest: book in) and Matched. **Fix** corrects a misread number, ✕ removes it.
- **Export** gives the comparison as Excel (`Manifest-check-<date>.xlsx`), Email PDF or Print. With "Include a copy of the log" on, an uploaded `.xlsx` log gets the comparison as a new tab, and PDFs get the log appended.

## Exports

| Output | File | Notes |
|---|---|---|
| Download (Excel) | `LPN-log-<yyyy-mm-dd>.xlsx` | Title band, numbered list, totals by type, Delivery Details, version line; A4 portrait, page numbers |
| Email PDF | `LPN-log-<yyyy-mm-dd>.pdf` | Opens the share sheet; if blocked, saves the file and opens a new email |
| Print | PDF in the print dialog | Saves the PDF if printing isn't available |

If an expected count is set and differs from the total, the first export attempt shows a reminder instead; choosing it again proceeds.

**Long LPNs and notes in the spreadsheets.** On the pallet log and the manifest check sheet, the LPN column widens to fit the longest LPN in the file (it never gets narrower than the usual width, and stops at 40 characters wide). A value too long even for that, such as a web address scanned by mistake, wraps onto a taller row instead of stretching the column. Rows in the Delivery Details table grow tall enough to show long notes in full. The logo above the table is sized to the width of the table.

**Which version made the file.** Every export says which version of the app made it, for example "LPN Pallet Log v3.30 (build 26)". The version is the newest entry in the Changelog; the build is the cache number in `sw.js` (`lpn-log-v26` is build 26).

| Export | Where the version appears |
|---|---|
| Excel log and manifest check sheet | A small grey line under the tables: "Made with LPN Pallet Log v3.30 (build 26) on dd/mm/yyyy at hh:mm." (the date follows the Date format setting), and the left side of the printed page footer |
| PDF (Email PDF, Print, saved deliveries) | The left side of the page footer |
| Basic `.xls` (when the spreadsheet builder can't load) | A "Made with … on … at hh:mm." line under the table |

If the build number can't be found within 1.5 seconds (for example on a very weak signal), the export goes ahead without it and shows only "LPN Pallet Log v3.30".

Importing an exported log (Saved deliveries or the Manifest check) stops reading LPNs at the "Made with" line, so it is never taken for a pallet, even if someone has deleted the blank row above it. Both read spreadsheets the same way, so a log gives the same pallets in either place.

After a log export (Excel, Email PDF or Print) the log shows "Exported at hh:mm". If pallets are changed afterwards it reads "Changed since it was exported at hh:mm" in amber, and Start new delivery will ask for a fresh export first. Exports made from Saved deliveries don't change this note.

## Saved deliveries

- Holds this week and last week (weeks start on Sunday); older entries are removed automatically.
- Each entry can be opened (the current log is saved first), exported to Excel, emailed as PDF, or deleted (with Undo).
- **Import an exported log** rebuilds a delivery from an exported spreadsheet or app-made PDF. If it is older than last week, it is offered for loading straight into the log instead.
- The panel shows when this device was last backed up, with **Back up now**.

## Settings

Colours (two colours drive the whole theme, with a contrast warning), quick themes, logo, default pallet type, keep last type, warnings, sound, vibration, confirm scans, text size, date format (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd), include log copy in comparisons, forget remembered names, backup and restore, install pop-up.

**Logo** (under the colours): **Add logo** / **Change logo** picks an image that is kept on this device and used in the header and on exports. `logo.png` next to the app is the default; when a custom logo is set, **Reset to default logo** (or **Remove logo** if there is no default) appears. The logo controls are no longer in the Delivery card.

## Common problems

| Problem | Fix |
|---|---|
| Live scan doesn't start | The site must be on HTTPS and camera permission allowed. Use Scan by photo instead. |
| Export says the builder couldn't load | The device is offline and the library hasn't been cached yet. A basic `.xls` is saved; export once while online to cache it. |
| Email PDF saved a file instead of sharing | The browser refused the share. Attach the saved file to the email that opens. |
| Changes don't appear after an update | Tap **Refresh** on the update banner, or close and reopen the app. |
| Spreadsheet looks cut off on a phone | Mobile viewers open sheets zoomed in; pinch out. Desktop and print are unaffected. |
| Notes or LPNs cut off in an older export | Files made before v3.30 build 26 used fixed row heights and column widths. If the delivery is still in Saved deliveries, export it again. |
| Export shows no build number | The app couldn't read `sw.js` in time (weak signal and nothing cached yet). The file is fine; the version line just shows "LPN Pallet Log v3.30" without "(build n)". |
| Which version made this file? | Look at the "Made with …" line under the table or the left side of the page footer. |
| Import says "That file has no sheets." | The spreadsheet is empty or damaged. Import the PDF of the same delivery (made with Email PDF) instead, or export the delivery again if it is still in Saved deliveries. |
| Import says "Couldn't find an LPN column in that file." | The file has no cell that just says `LPN`. Only logs exported from this app (or files with an `LPN` heading) can be imported. |
| Data missing on another phone | Data is per device. Use Back up now, then Restore backup on the other device. |
| Can't find the logo button | It is in **Settings → Logo**, not in Delivery. |
| Entry bar disappeared on a phone | The Manifest check is open and scrolled into view. Scroll up towards the log and the bar comes back. |
| Prefix preset list not visible | It is in the closed **Prefix presets** section below the two steps; tap its heading. |
| Numbers from photos are wrong | OCR can misread letters. Check and Fix them before comparing; set a prefix preset to reduce noise. |
