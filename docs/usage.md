# Usage

The in-app **Guide** covers the same ground for staff. This page is the reference version.

## Main flow

1. **Delivery:** set the date and who received it. Optional: expected pallets, trailer number, seal in, seal out (the three boxes sit side by side only when the Delivery card is at least 520px wide, enough for an 11-character seal number in each; otherwise the trailer box is full width with the two seal boxes under it, since build 45), notes (up to 2000 characters). Previously used names appear as one-tap buttons.
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
  - the wrong number of digits: 9 or 10 for most LPNs (usually 3 letters), but 10 or 11 for `IM` numbers (full pallet picks, 2 letters). The warning says, for example, "has 12 digits (usually 9 or 10)" or, for `IM`, "has 9 digits (IM numbers have 10 or 11)". Since build 39 an 11-digit `IM` number is not warned about.
- While a warning is waiting for an answer, another LPN typed or scanned into the box (a hardware scanner presses Enter on its own) is not lost and not added: it stays in the box, selected, with the message "Answer the check first (Skip or Add anyway), then add <LPN>." and the warning sound. After Skip or Add anyway, press Enter (or Add) to add it; the next scan replaces it, because it is selected. Since build 41.
- **Escape** skips a waiting warning, the same as **Skip**. It does nothing while the Guide, Changelog, Settings or Saved deliveries panel or the install box is open, or while another box (for example an LPN being edited in the table) has the keyboard; it does work in the LPN box.
- Each add shows "Added #n: LPN · type", plus "✓ on manifest" or "⚠ NOT on manifest" while a manifest is loaded.
- On phones the entry bar shows `n logged`, `n of expected logged`, or `n of total on manifest` (shortened to `n/total` on screens under 400px), and the Delivery card folds into one line once logging starts.
- The ↶ button next to the entry-bar counter (phones only) removes the most recent pallet, with Undo.
- Tap an LPN to edit it (each LPN is a button, so it can also be reached with Tab and opened with Enter or Space); Enter saves, Escape cancels, and since build 42 both put the keyboard back on that LPN. Change type or FSDU in the table; ✕ removes it. Undo appears after removing, editing or Clear all.
- **Undo bar:** stays 20 seconds (9 before build 42), and doesn't go away while it has the keyboard focus. On phones (under 760px) it floats just above the entry bar, so it can be seen while logging; with the Manifest check open (the entry bar stepped aside) it shows at the top of the screen instead (since build 45; before, it sat near the bottom and could cover a results row), so it never sits over the results being worked on. While the Undo bar shows, the "Added" note appears above it instead of underneath; a new Undo bar hides any "Added" note that is showing.
- Search and the type and FSDU filters only change what is shown; totals always cover the whole log. FSDUs are counted separately and are not part of the total.
- With Expected pallets set, the line under the totals reads "n of x expected" with "(n to go)" in the normal text colour while counting, turns green with "✓ all accounted for" when the count matches, and turns red with "(n more than expected)" only when there are more pallets than expected. When a manifest is loaded and Expected pallets equals the manifest count, this line is hidden, because the manifest progress line already shows the same count.
- On phones (under 760px wide) the pallet table has no scroll box of its own: it scrolls with the page, and the column headings stay pinned at the top of the screen while you scroll through it. Long LPNs wrap onto a second line instead of pushing the page sideways. On wider screens the table keeps its own scroll area (up to 60% of the screen height).
- The FSDU tick boxes in the table are 32px. On phones the FSDU tick box in the entry bar is 40px and the scan option buttons (Live scan, Scan by photo) are at least 48px tall, for gloves (build 41; before, 32px and 42px). The Guide, Changelog and Settings buttons in the header are at least 44px tall on phones.
- On screens up to 620px wide the header buttons wrap onto a second line and share the row (each sized to its text) instead of pushing the page sideways, for example with Extra large text.
- On phones, a box or button that gets keyboard focus scrolls clear of the fixed entry bar instead of ending up behind it.

## Scanning

| Method | When to use |
|---|---|
| Live scan | Camera continuously adds each barcode it sees; the screen stays awake while it runs |
| Scan by photo | Fallback when live scanning is unreliable |
| Hardware scanner | Focus the LPN box; the scanner types and presses Enter (untested) |

"Ask me to confirm each scanned barcode" in Settings shows each scan for approval first.

**Live scan on phones (build 41).** The camera view is at most `clamp(110px, 24vh, 200px)` tall, so on short phones the "Added: LPN (type)" line and **Stop scanning** stay on screen while scanning (checked at 360×640, 375×667 and 390×844). A warning about a scanned LPN (Skip / Add anyway) appears above the camera view, and the line under the camera says "Check the warning above." (it said "Check the message below." before build 41). Live scan messages are announced by screen readers. The "Added" confirmation note at the bottom of the screen can't block taps on the buttons under it.

## Manifest check

The section opens (tap **Manifest check**) on **Manifest date**, then the two steps side by side: **1. LPN log** and **2. Manifest photos or PDFs**. Below them is the closed **Prefix presets** section; its heading shows the current choice in brackets, for example "(all prefixes)", the preset name, or the typed prefix list. The **Manifest check** heading button and **Show missing** are at least 44px tall.

On phones, while the Manifest check is open and its top is in the upper part of the screen (above 45% of the screen height), the pallet entry bar slides down out of view so it does not cover the section. It slides back when you scroll up towards the log, and it never slides away while you are typing or scanning into it.

- **Manifest sources:** photos (OCR), PDFs (text read exactly, scanned pages by OCR, several at once), or typed/pasted numbers. The PDF reader is downloaded the first time a PDF is read, so that needs internet once; after that PDFs can be read offline.
- **Log sources:** Use current log, a saved delivery, an exported `.xlsx`/`.csv`/`.xls`, an app-made PDF (read exactly), another PDF, or a photo of a printed log.
- **Use n as expected:** while a manifest is loaded and Expected pallets is empty, the progress line offers to copy the manifest count into Expected pallets.
- **How photos are read (build 35):** each photo is made black and white by comparing every point with the paper around it, so shade across the page and paper grain don't turn into junk, and pages with ruled lines are read in full. The numbers on one photo are then matched to each other: when most of a page's numbers are, say, `VLT` + 9 digits, a reading such as `VL1004040355` is put back to `VLT004040355`, and an O read as an extra 0 after the prefix (`RUN0001832816` where the others are `RUN001832…`) is dropped. A number with nothing to compare against is kept as read. Since build 36, specks on the paper that read as a code are left out: when a photo's numbers show a clear pattern, a reading with a prefix seen nowhere else on that photo and without an LPN's digit count (9 or 10, or 10 or 11 for `IM`; for example `DFA51400180` on a page of `VLT` numbers) is not added, and the problem log notes it as "Ignored as not looking like this page's LPNs". A short reading of a prefix the page uses is still added so you can check it. Since build 37, a reading whose prefix has a different number of letters from every prefix on the photo (for example `CO1080002090` or `L1121100001` among `VLT` numbers) is left out too. A number with another prefix of the same length and 9 or 10 digits is still added. `IM` numbers (full pallet picks, two letters) are always kept, whatever the other numbers look like. When the most common number shape on a photo is a tie (for example 9 and 10 digits), the plainly printed readings decide it.
- **Prefix presets** (tap the heading to open) limit which numbers OCR picks up. The list is applied after the tidy-up above, so a mended number with a listed prefix is kept. Leave the list empty for any 1–3 letter prefix. Presets come from `presets.json` and from presets saved on the device.
- **What each file added:** after reading manifest photos, manifest PDFs or log photos, the message has one note per file, for example "Photo 1: found 2 LPNs, 1 new, 1 already in the list." (PDFs are named by their file name, log photos as "Log photo n"). A file where nothing was found says "No LPNs could be read: try a closer, sharper photo in good light." or, for a PDF, "No LPNs could be read from this PDF."
- **Numbers left out by the prefix list:** when a prefix list is set, numbers of 1–3 letters followed by an LPN's digit count (exactly 9 or 10 real digits, or 10 or 11 after `IM`; since build 40 also an `IM` number with 9 digits, one short and probably a misread) whose letters aren't in the list are not added, but the note names them (up to four, then "…"), for example "2 other numbers (QUB001899186, QUB001899210) start with QUB, which isn’t in the prefix list. If they are LPNs, add QUB under Prefix presets (or clear the prefixes) and read the photo again." For PDFs it says "read the PDF again". Numbers of other lengths (PO, phone or reference numbers, such as `TEL 01234567890`) are never named. With an empty prefix list nothing is left out.
- **Readings that didn't look like the page (build 37):** readings left out by the tidy-up that have an LPN's digit count (9 or 10, or 10 or 11 for `IM`) are named in the photo's note, for example "3 other readings (CO1080002090, RR1004040021, L1121100001) didn’t look like the other LPNs on this page, so they were left out. If one is a real LPN, type it in the box." They are not added; type in any that are real.
- **Numbers corrected to match the page (build 45):** when the tidy-up changes a reading to match the other numbers on the photo (for example `VL1004040355` to `VLT004040355`, or an extra 0 dropped), and the corrected number is added, the photo's note names it so it can be checked: "1 number was corrected to match the others on the page (VLT004040355): check it against the paper." (or "n numbers were corrected … check them against the paper.", up to four named, then "…"). A number read twice and corrected is named once. The problem log adds "corrected to match the page" with the numbers.
- **Report a problem with these photos (build 45):** after a batch of manifest photos is read, a **Report a problem with these photos** link appears under the message. It opens the report box (see [Report a problem or idea](#report-a-problem-or-idea)) set to **Problem**, with the photo that read worst already attached (made smaller as usual): a photo that couldn't be read first, then the one with the fewest LPNs found, then the one with the most numbers skipped by the prefix list, left out or corrected. The text box stays empty; its hint asks "What went wrong with photo n? For example, which numbers were missing or wrong.", so the report always has your own words. While the photo is being added the note says "Adding photo n…" and **Send** is greyed out; then it says "Photo n attached (n KB)". If the photo can't be added, the box says so and the report can still be sent. The photos are only held in memory for this, never saved; **Clear** and reading manifest PDFs remove the link and forget them, and so does choosing a new batch.
- **One bad file doesn't stop the rest:** if a manifest photo or log photo can't be read, its note says "Photo n: couldn’t be read (reason)." and the next photos are still read. Manifest PDFs already worked this way; a PDF that fails is listed under "Couldn’t read:". The exception is the PDF reader failing to load, which stops at that file with the "PDF reader couldn’t load" message.
- **Unusual digit counts:** after reading or typing manifest or log numbers, the message ends with "These have an unusual number of digits, so check them against the paper copy: …" (up to eight, then "and n more") for lines that are letters followed by digits but not 9 or 10 digits (10 or 11 for `IM`). Since build 39 `IM` numbers with 10 or 11 digits are not listed there; a 9-digit `IM` number is. Lines in another form, such as `VLT-004040265` or `004040265`, are judged only by the digits at the end (9 or 10 is fine), as before build 39; build 39 had listed them all, and build 40 put this back.
- A note under the manifest numbers box reminds you that numbers read from photos can be misread, so check them first. (This replaced the earlier "still being tested" warning at the top of the section.)
- **Check results** lists Missing (on the manifest, not logged: report), Log only (logged, not on the manifest: book in) and Matched. **Fix** corrects a misread number, ✕ removes it.
- **Export** gives the comparison as Excel (`Manifest-check-<date>.xlsx`), Email PDF or Print. With "Include a copy of the log" on, an uploaded `.xlsx` log gets the comparison as a new tab, and PDFs get the log appended. When a log PDF is appended, any links and page-open actions in it are removed; the printed pages are unchanged. Values from an uploaded log are only ever written as plain text or numbers, so a file from outside can't add formulas or links to the export.
- **Photo reader:** reading photos downloads the photo reader and its language data the first time, which can take a while on a weak signal. If it hasn't started after 90 seconds, or can't be downloaded, it stops with "The photo reader couldn’t load…" and the next try downloads it again. Since build 41 one reader is started for a batch of photos (or scanned PDF pages) and reused, so the second and later photos start faster; it is closed 15 seconds after the last photo to free memory. If one photo takes longer than 2 minutes to read (for example the phone stopped the reader while the app was in the background), that photo fails with "The photo reader stopped. Try the photo again." and the next photo gets a fresh reader. Reading manifest photos and a log photo at the same time is fine: they take turns. Reading photos needs iOS 16 or newer on an iPhone; older phones can still scan barcodes, read PDFs (iOS 16.4+) and type numbers.

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

## Backup and restore

Everything (the current log, saved deliveries, names, presets, logo and settings) is stored in this browser only.

**Back up:** **Settings → Backup → Download backup**, or **Back up now** in Saved deliveries. This saves `lpn-backup-<yyyy-mm-dd>.json`.

**Restore** (for example on a new phone):

1. **Settings → Backup → Restore backup**, then choose the `.json` file.
2. The app checks the file and says what it holds, for example "This backup has a log of 12 pallets and 4 saved deliveries." Nothing has changed yet. A file that isn't a backup from this app, or is damaged, is refused here.
3. Tap **Replace my data with this backup**, or **Cancel** to leave everything as it is.
4. A copy of your current data downloads first (`lpn-backup-<date>.json`). On iPhone, confirm the download if asked. If the copy can't be saved, the restore stops and nothing is replaced.
5. The message says "Backup restored. Make sure the copy of your previous data has saved, then reload the app…". Check the copy has saved, then tap **Reload the app**. The app doesn't reload by itself.

While checking, the app tidies the backup: anything it doesn't recognise is left out (for example an unknown pallet type becomes Mixed, and a logo that isn't a PNG or JPEG image is dropped). The same tidying happens every time the app starts, so damaged saved data can't stop it opening.

The problem log (see [Problem report](#problem-report)) is never put in a backup, is ignored if a backup file contains one, and is left as it was when a backup is restored.

## Report a problem or idea

Since build 44 the form is a box in the middle of the screen. Open it with the **Report** button (speech-bubble icon) at the top of the page: at the right of the title row on phones, just before **Guide** on desktop. **Settings → Report a problem or idea** and the Guide's **Report a problem or idea** link in section 9 open the same box on top of the panel, which stays open behind it. The cursor goes into the text box. **Close**, **Escape** or tapping outside the box closes it and puts you back where you were (in the Guide or Settings if you came from there).

1. Choose **Problem** or **Idea**.
2. Type what happened or what would help (up to 4000 characters).
3. Optional: **Add a photo**. It is made smaller before sending (at most 1600px along the long side, as a JPEG) and the note shows its size, for example "Photo added (240 KB)". **Change photo** and **Remove photo** appear once one is added.
4. **Attach the problem report** is ticked by default; untick it to send only the text and photo. The problem report holds the recent actions on this phone, with the LPNs involved (see [Problem report](#problem-report)).
5. Tap **Send**. "Sent. Thank you!" means it has arrived; the box closes by itself 1.5 seconds later.

Reports go to Jamie's private GitHub repository through a Cloudflare server. The problem report includes the LPNs and manifest numbers on the phone, file names, the start of text read from photos, and the browser and screen size. Since build 44 the box itself no longer says where reports go (the user's choice); it starts with "Tell Jamie what went wrong or what would help. With no signal, it’s kept on this phone and sent when you’re back online."

**Not set up yet.** The reporting server is online (since build 43). If the app's reporting address is ever empty, **Send** says "Reporting isn’t set up yet. Use Download problem report below and send the file to Jamie instead." (see [installation](installation.md#feedback-worker-report-a-problem-or-idea)).

**No signal.** If the phone is offline, or the server is busy, the report is kept on the phone and sent when it is back online (when the browser reports it is online, and 4 seconds after the app opens). The message says "No signal or the server is busy: saved on this phone, and it will be sent when you’re back online." Photos are not kept: the message then adds that the photo should be sent again when there is signal. At most 5 reports (about 300 KB in all) can wait; past that it says there's no room and suggests trying again with signal or using Download problem report. When the box opens with reports waiting, it says how many ("2 reports are waiting to be sent when you’re back online."). A report the server refuses (for example too long) shows the server's reason and is not kept. Waiting reports belong to the phone: they are never put in a backup or taken from one.

## Problem report

**Settings → Problem report** has **Download problem report** and **Clear**.

The app keeps a short log of what it has done on this device: the last 300 events, each cut to 300 characters. It records manifest photo, manifest PDF and log photo reads (file type and size, how many LPNs were found, added and already listed, numbers left out by the prefix list, readings left out as not looking like the page's LPNs, failures), what the photo reader and PDF reader got from each file (word or page count, LPNs found and the first 150 characters of the text read from a photo), backup restores, and script errors (including failed promises). It is only sent if you attach it to a report from **Report a problem or idea**; nothing is sent by itself.

**Download problem report** saves a plain text file, `lpn-problem-report-<yyyy-mm-dd>.txt`, with:

- when it was made, the app version and build, the browser (user agent), screen and window size and pixel ratio, whether it runs as an installed app, whether it is online and whether the service worker is active;
- the current state: pallets in the log, delivery date, expected pallets, the Manifest check prefixes, the manifest numbers and log numbers in the Manifest check boxes, and the Manifest check message;
- the recent events, oldest first, each with its time and kind (`manifest`, `pdf`, `ocr`, `backup`, `error`).

The message then says "Problem report downloaded. Send it along with what happened." **Clear** empties the problem log ("Problem log cleared.").

Section 9 of the Guide says: "Something not working, or an idea?" with a **Report a problem or idea** link (since build 42; before, it told staff to download the problem report and send it). The report contains LPNs, file names and text read from photos, so treat it like a delivery record.

## Guide and demo video

The **Guide** button in the header opens the Guide in the side panel. It starts with a **▶ Watch the demo video (40 seconds)** button, above the contents bar and the guide sections. (The button said 38 seconds before build 39; the video is 39.7 seconds.) Section 9 also says what LPNs look like: a letter prefix followed by digits, usually 3 letters and 9 or 10 digits, while `IM` numbers (full pallet picks) have 2 letters and 10 or 11 digits; the v3.30 changelog notes that `IM` numbers are always kept and not called unusual.

- Nothing is downloaded until the button is tapped (the video is set to `preload="none"`).
- Tapping it hides the button and shows a video player in its place, which starts playing. The video is portrait (720×1280, about 40 seconds, about 1.5 MB), has narration and subtitles, and shows a still picture (`media/demo-poster.jpg`) before it plays. The player has the usual controls (play, pause, full screen) and plays inside the page on iPhones rather than jumping to full screen.
- The video starts at half volume, so it isn't too loud; the player's volume control can turn it up. iPhone Safari ignores volume set by a page, so there the phone's own volume buttons set the level.
- The scanning part shows picking the pallet type before scanning: FMCG is tapped, then **Scan** and **Live scan**; the first barcode is added as FMCG ("Added #9 … FMCG"), then BB is tapped and the next barcode is added as BB. The narration says: "Pick the pallet type first, then scan. Each pallet is logged with that type, so change it before the next one."
- The video was re-recorded for build 45, so it shows the **Report** button in the header, and the date box shows day/month/year as on a UK phone.
- Closing the Guide pauses the video. Opening the Guide again shows the button again.
- When the video starts, keyboard focus moves to the player, so its controls can be used straight away.
- The video needs internet: it is not saved for offline use. If it can't play, the Guide shows "The video couldn’t play. Check you’re online, then try again."

## Keyboard and screen readers

- The Guide, Changelog, Settings and Saved deliveries panel and the install box act as dialogs (build 41): when one opens, focus moves into it (to **✕ Close** in the panel, to the first visible button in the install box), the page behind can't be reached with Tab or a screen reader, and when it closes focus goes back to the button that opened it. Escape closes them.
- The page language is British English (`lang="en-GB"`), so screen readers use a UK voice.
- Since build 42:
  - each LPN in the log is a button named "Edit LPN <number>" (see [Logging behaviour](#logging-behaviour));
  - Escape closes an open Export menu (the log's or the Manifest check's) and puts focus back on its **Export** button;
  - the remove (✕) column in the pallet table has the heading "Remove" for screen readers (not shown on screen);
  - the buttons in Saved deliveries say which delivery they act on, for example "Open the delivery of <date>", "Email PDF of <date>" and "Delete the delivery of <date>" (Excel already did);
  - the Missing, Log only and Matched headings in the Manifest check results are level-3 headings (were level 4), and the counts above them (`On manifest`, `Matched`…) use the normal text colour for contrast;
  - the Matched summary that opens the matched list is at least 44px tall, with its arrow;
  - the entry-bar counter is no longer read out each time it changes (the "Added" note already says it);
  - links inside the Guide jump straight to their section, without scrolling smoothly, when the phone or computer is set to reduce motion.

## Settings

Colours (two colours drive the whole theme, with a contrast warning; since build 41 the edges of boxes and buttons and any accent-coloured text, such as panel headings and links, are adjusted automatically so they stay readable with any chosen colours), quick themes, logo, default pallet type, keep last type, warnings, sound, vibration, confirm scans, text size, date format (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd), include log copy in comparisons, forget remembered names, backup and restore, report a problem or idea, problem report, install pop-up.

**Logo** (under the colours): **Add logo** / **Change logo** picks an image that is kept on this device and used in the header and on exports. A saved logo is only used if it is a PNG or JPEG image stored in the app. `logo.png` next to the app is the default; when a custom logo is set, **Reset to default logo** (or **Remove logo** if there is no default) appears. The logo controls are no longer in the Delivery card.

## Common problems

| Problem | Fix |
|---|---|
| Live scan doesn't start | The site must be on HTTPS and camera permission allowed. Use Scan by photo instead. |
| Export says the builder couldn't load | The device is offline and the library hasn't been cached yet. A basic `.xls` is saved; export once while online to cache it. |
| A feature that worked offline needs internet after an update | The update to build 30 clears the old library store (`lpn-libs-v1`) once, so Excel, PDF, the Manifest check readers, the photo reader and the barcode fallback each need one online use again before they work offline. |
| "The photo reader couldn’t load. Check you’re online and try again, or type the numbers in the box instead. (Reading photos needs iOS 16 or newer on an iPhone.)" | The photo reader is downloaded the first time it is used and has 90 seconds to start. Go online (a stronger signal helps) and try again; the app clears any half-downloaded copy so the next try starts fresh. Or type or paste the numbers in the box. |
| Photo reading never works on an older iPhone | Since build 31 the app's security policy only lets the photo reader's engine run on iOS 16 or newer, so on older iPhones it always stops with "The photo reader couldn’t load…". Update iOS if the phone allows it, or type or paste the numbers, scan the barcodes, or use a PDF of the manifest (PDFs need iOS 16.4+). |
| "That backup file is damaged, so nothing was changed." | Part of the backup can't be read, so the restore was refused before anything changed. Try another backup (the app saves one each time you back up or restore), or download a new backup from the device the data is on. |
| "That isn’t a backup from this app." | The file chosen isn't an LPN Pallet Log backup (`lpn-backup-<date>.json`). |
| "Your data wasn’t replaced, because the copy of it couldn’t be saved first." | The safety copy of your current data couldn't be downloaded. Allow downloads (on iPhone, confirm the download) and try the restore again. |
| "Couldn’t restore that backup because this browser ran out of storage space, so nothing was changed." | The backup is too big for the space this browser allows. Free some space (for example delete old saved deliveries) or restore on another browser. |
| Restored data not showing | Tap **Reload the app** under the restore message, once the copy of your previous data has saved. |
| "The PDF reader couldn’t load. Check you’re online, then reload the page and try again…" | The PDF reader is downloaded the first time a PDF is read, then kept for offline use. Go online, reload and try again. Very old phones (roughly older than iOS 16.4, Chrome 94 or Firefox 93) can’t read PDFs at all: type or paste the numbers in the box instead, or use a photo. When several manifest PDFs are chosen, reading stops at the first one with this message. |
| Email PDF saved a file instead of sharing | The browser refused the share. Attach the saved file to the email that opens. |
| "The video couldn’t play. Check you’re online, then try again." | The demo video in the Guide is never saved for offline use, so it needs a signal every time. Go online, close and reopen the Guide, and tap the button again. Everything else in the Guide works offline. |
| "The photo reader stopped. Try the photo again." (in a photo's note) | Reading that photo took longer than 2 minutes, usually because the phone paused the reader while the app was in the background. Keep the app on screen and read the photo again; the next photo gets a fresh reader. |
| "Answer the check first (Skip or Add anyway), then add …" | A warning about the previous LPN is still waiting. Tap **Skip** or **Add anyway** (or press Escape to skip), then press Enter: the LPN in the box is added. |
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
| Numbers from photos are wrong | OCR can misread letters. Check and Fix them before comparing; set a prefix preset to reduce noise. Since build 35, readings are matched to the other numbers on the same photo, so a photo with only one LPN gets no tidy-up; photograph a few lines at once if one number keeps coming out wrong. |
| A photo of a pale or shaded page gives lots of junk or misses lines | Fixed in build 35 (the old clean-up stretched the whole page's contrast, which turned shade into specks, and ruled lines hid parts of the page). Check you are on build 35 or later (it is in the problem report and at the bottom of every export); if not, reload to update. |
| A made-up number from a photo (letters and digits that aren't on the paper) | Since build 36 a reading with a prefix not used by the other numbers on the photo and without an LPN's digit count is left out, and since build 37 so is one whose prefix has a different number of letters from the others (the note names those with an LPN's digit count). Remove any other made-up number from the box before comparing. If a real number seems to be missing, the problem report lists anything "Ignored as not looking like this page's LPNs"; type it in. |
| An `IM` number gets "has n digits" or is listed as an unusual number of digits | `IM` numbers (full pallet picks) have 10 or 11 digits. Since build 39 those are accepted; one with 9 or 12 digits is still warned about, so check it against the paper. |
| A real LPN named as "didn’t look like the other LPNs on this page" | Its prefix has a different number of letters from the rest of the photo (for example two letters among `VLT` numbers). Type it in the box. `IM` numbers are always kept. |
| Manifest photos stop adding LPNs | Read the note for each photo. "1 new, 3 already in the list" means the numbers were already there. "…start with QUB, which isn’t in the prefix list" means the prefix list left them out: add that prefix under **Prefix presets** (or clear the prefixes) and read the photo again. "No LPNs could be read" means try a closer, sharper photo in good light. |
| "Reporting isn’t set up yet…" | The reporting server isn't online yet. Use **Download problem report** and send the file to Jamie with a description. |
| "No signal, and there’s no room to keep more reports on this phone…" | Five reports (or about 300 KB) are already waiting to be sent. Try again with signal, or use **Download problem report**. |
| The photo was not in a report sent later | Photos aren't kept while a report waits for signal. Send the photo again in a new report once online. |
| "That photo couldn’t be read." | The browser couldn't open the image to make it smaller. Try another photo or a screenshot. |
| A number in the box differs slightly from what the photo's note first suggested | The note says it was "corrected to match the others on the page". Check that number against the paper and Fix it if it is wrong. |
| The Report link with the photos has gone | It goes after **Clear** or reading manifest PDFs, and the photos are never saved. Read the photos again, or use the **Report** button and **Add a photo**. |
| Anything else that goes wrong | Use the **Report** button at the top of the page (or **Settings → Report a problem or idea**) (with the problem report attached), or download the problem report straight away (**Settings → Problem report → Download problem report**) and send it with a description of what happened. |
