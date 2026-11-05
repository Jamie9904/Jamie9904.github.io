# Usage

The in-app **Guide** covers the same ground for staff. This page is the reference version.

## Main flow

1. **Delivery:** set the date and who received it. Optional: expected pallets, trailer number, seal in, seal out (the three boxes sit side by side only when the Delivery card is at least 520px wide, enough for an 11-character seal number in each; otherwise the trailer box is full width with the two seal boxes under it, since build 45), notes (up to 2000 characters). Previously used names appear as one-tap buttons. For the next trailer on the same day, **Clear trailer, seals and notes** under the notes box empties those four boxes and keeps the rest (build 53, see [below](#clear-trailer-seals-and-notes-build-53)). Since build 48, if seal in and seal out are the same number, or have different lengths (spaces and upper/lower case are ignored), a note under the seal boxes asks you to check them (see [Seal check](#seal-check-build-48)).
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
- Tap an LPN to edit it (each LPN is a button, so it can also be reached with Tab and opened with Enter or Space); Enter saves, Escape cancels, and since build 42 both put the keyboard back on that LPN. Change type or FSDU in the table; ✕ removes it. Undo appears after removing, editing or Clear all; since build 55 one edit gives one Undo bar for everything changed in it (LPN, description and damage). Tapping an LPN also opens the damage choices under it (see [Damaged pallets](#damaged-pallets-build-49)), and the Description box for a pallet with no LPN or with a description (see [Pallets with no LPN](#pallets-with-no-lpn-build-55)).
- **Undo bar:** stays 20 seconds (9 before build 42), and doesn't go away while it has the keyboard focus. On phones (under 760px) it floats just above the entry bar, so it can be seen while logging; with the Manifest check open (the entry bar stepped aside) it shows at the top of the screen instead (since build 45; before, it sat near the bottom and could cover a results row), so it never sits over the results being worked on. While the Undo bar shows, the "Added" note appears above it instead of underneath; a new Undo bar hides any "Added" note that is showing.
- Search and the type and FSDU filters only change what is shown; totals always cover the whole log. FSDUs are counted separately and are not part of the total.
- With Expected pallets set, the line under the totals reads "n of x expected" with "(n to go)" in the normal text colour while counting, turns green with "✓ all accounted for" when the count matches, and turns red with "(n more than expected)" only when there are more pallets than expected. When a manifest is loaded and Expected pallets equals the manifest count, this line is hidden, because the manifest progress line already shows the same count.
- On phones (under 760px wide) the pallet table has no scroll box of its own: it scrolls with the page, and the column headings stay pinned at the top of the screen while you scroll through it. Long LPNs wrap onto a second line instead of pushing the page sideways. On wider screens the table keeps its own scroll area (up to 60% of the screen height).
- The FSDU tick boxes in the table are 32px. On phones the FSDU tick box in the entry bar is 40px and the scan option buttons (Live scan, Scan by photo) are at least 48px tall, for gloves (build 41; before, 32px and 42px). The Guide, Changelog and Settings buttons in the header are at least 44px tall on phones.
- On screens up to 620px wide the header buttons wrap onto a second line and share the row (each sized to its text) instead of pushing the page sideways, for example with Extra large text.
- On phones, a box or button that gets keyboard focus scrolls clear of the fixed entry bar instead of ending up behind it.

## Damaged pallets (build 49)

Tap an LPN in the log (or Tab to it and press Enter). As well as the LPN box for correcting the number, a row opens under the pallet: **Damage:** **None**, **Crushed**, **Wet**, **Other…**.

- **Crushed** or **Wet** marks the pallet straight away and closes the row.
- **Other…** shows a box ("What’s wrong?", up to 60 characters) with **Save**; Enter in the box saves too. An empty box isn't saved. If the pallet already has a note of its own, **Other…** opens with that text in the box.
- **None** removes the note.
- The current choice is shown pressed (red for a reason, normal for None).
- A change to the LPN typed in the box at the same time is saved together with the damage choice. **Escape** cancels both. Since build 55 both changes (and a description change) are named on one Undo bar and undone together.

A damaged pallet shows "Damaged: <reason>" in red under its LPN, with a red line on the left of the LPN cell; a long note wraps instead of widening the table. The Undo bar says "Marked <LPN> as damaged (<reason>)" or "Damage note removed from <LPN>", and **Undo** puts the old note back. The note is saved with the log, in saved deliveries and in backups. Changing it after an export counts as a change, so the log reads "Changed since it was exported…" and Start new delivery asks for a fresh export.

On exports each damaged pallet gets a row "Damaged pallet | <LPN>: <reason>" at the end of Delivery Details (Excel, the basic `.xls` and the PDF). Importing an exported log (Saved deliveries) puts the notes back on their pallets. The copy of the log in a Manifest check export doesn't include damage notes.

**Keyboard:** with the LPN box open, Tab goes to the damage choices, or to the Description box when there is one (Shift+Tab from **None**, or from the Description box, goes back to the LPN box). Leaving both the box and the choices (for example Tab past **Save**) closes them and keeps any change; when the keyboard was used, or focus would otherwise be lost because the table was redrawn, it goes back to that pallet's LPN. On phones the row scrolls into view above the entry bar, even for the last pallet. The buttons are at least 44px tall.

Short pallets and torn wrap are not choices: the user asked for them to be taken out (see [decisions](decisions.md#damage-notes-on-pallets-build-49)). Use **Other…** for anything else.

## Pallets with no LPN (build 55)

For a pallet that arrives without an LPN label. Pick the type (and tick FSDU if needed) as usual, then tap **No LPN**. It sits with **Live scan** and **Scan by photo** (under **Scan** on a phone), and screen readers hear it as "Add a pallet with no LPN".

- **Numbering:** the pallet is logged as "No LPN 1", then "No LPN 2" and so on: the next number is one more than the highest "No LPN n" in the log, so a removed pallet's number isn't reused while a higher one is there. The "Added" note says, for example, "Added #3: No LPN 1 · FMCG · FSDU". The type and FSDU follow the same rules as any pallet (FSDU clears afterwards; the type stays unless "Keep the last pallet type" is off). No duplicate or LPN-shape warning is shown for it.
- **Numbers stay unique:** whenever the log is saved, a second pallet with the same "No LPN n" (for example one brought back by **Undo** after a new one took its number, or one from an imported log) is renumbered to the next free number. The first one in the log keeps its number.
- **While a warning is waiting** (Skip / Add anyway), **No LPN** doesn't add anything: the message says "Answer the check first (Skip or Add anyway), then add the pallet with no LPN." with the warning sound.
- **Description:** straight after it is logged, the pallet opens for editing with the cursor in a **Description** box (placeholder "Optional: wrap, labels, PO number", up to 60 characters; screen readers hear "Description for No LPN 1"). Type what identifies it and press **Enter** to save, or **Escape** to leave it without a description (the pallet stays logged). Leaving the box also saves it. Spaces are tidied and an emptied box removes the description. The Undo bar says "Description saved for No LPN 1" (or "Description removed from …").
- **A scanner in the description box:** for a pallet that has no saved description yet, if the box holds only one LPN-shaped value when Enter is pressed (1–3 letters followed by 8–12 digits, spaces ignored), for example a handheld scanner reading the next pallet, it isn't kept as a description: the edit closes and the value goes through the normal add, so it is logged as the next pallet (with the usual checks).
- **The LPN turns up later:** tap the pallet. Its LPN box is empty, with the hint "LPN if found" (screen readers: "LPN for No LPN 1, if you find one"). Type the LPN and press Enter: the pallet becomes a normal pallet (counted against a loaded manifest as usual) and keeps its description. Leaving the box empty keeps it as No LPN.
- **One Undo per edit:** everything changed in one edit (description, damage choice, LPN) goes on one Undo bar, for example "Description saved for No LPN 1. Changed No LPN 1 to VLT004040265", and **Undo** puts all of it back.
- **Damage** works the same as on any pallet: with damage on, the damage choices show under the description box. With damage switched off in the site settings, the description box still opens for these pallets.
- **Any pallet with a description** (for example one whose real LPN was typed in later) shows the Description box when it is tapped, so the text can be changed or removed.
- **In the log** "No LPN n" is shown in italic in the normal text font (not the LPN font), and a description shows on its own line under the LPN in bold, in the normal text colour.
- **Saved** with the log, in saved deliveries and in backups. Changing a description after an export counts as a change ("Changed since it was exported…").
- **On exports** each description gets a row "Pallet description | <LPN>: <description>" at the end of Delivery Details, after any "Damaged pallet" rows (Excel, the basic `.xls` and the PDF). The pallet itself is listed as "No LPN n" with its type and FSDU. Importing an exported log (Excel, CSV or an app-made PDF) puts the descriptions back on their pallets.
- **With a manifest loaded** these pallets are not counted as "not on the manifest" and get no "⚠ NOT on manifest" note or warning sound. For the Manifest check results see [Manifest check](#manifest-check).

The button can be switched off for everyone in the site settings (`noLpn`); pallets already logged with no LPN stay in the log. Marked as in testing, the note ("In testing: Logging pallets with no LPN may not always work yet…") shows in the description row of a No LPN pallet. On screens 300px wide or less (for example 200% browser zoom) the scan option buttons wrap onto two lines instead of running off the screen.

## Scanning

| Method | When to use |
|---|---|
| Live scan | Camera continuously adds each barcode it sees; the screen stays awake while it runs |
| Scan by photo | Fallback when live scanning is unreliable |
| Hardware scanner | Focus the LPN box; the scanner types and presses Enter (untested) |

"Ask me to confirm each scanned barcode" in Settings shows each scan for approval first.

**Live scan on phones (build 41).** The camera view is at most `clamp(110px, 24vh, 200px)` tall, so on short phones the "Added: LPN (type)" line and **Stop scanning** stay on screen while scanning (checked at 360×640, 375×667 and 390×844). A warning about a scanned LPN (Skip / Add anyway) appears above the camera view, and the line under the camera says "Check the warning above." (it said "Check the message below." before build 41). Live scan messages are announced by screen readers. The "Added" confirmation note at the bottom of the screen can't block taps on the buttons under it.

**Torch (build 48).** A **Torch** button appears next to **Stop scanning** once the camera has started, but only when the phone lets a web page switch its light on (most Android phones; most iPhones don't, so there is no button there). Tap it to turn the light on, and again to turn it off; while it is on the button is filled in the accent colour and screen readers hear it as pressed. **Stop scanning** turns the light off and hides the button, and the next Live scan starts with it off. If the light can't be switched, the line under the camera says "The torch couldn't be switched on. Try more light, or Scan by photo." (or, when switching off, "The torch couldn't be switched off. Stop scanning to turn it off."), and the problem report gets a `scan` entry. When the button shows, the camera view on phones is a little shorter (at most `clamp(84px, 17vh, 200px)`) so the "Added" line, **Torch** and **Stop scanning** stay on screen, including with Extra large text on 360×640 and 375×667 screens.

**Scanning from further away (build 54).** Live scan asks the camera for a sharper picture than before (up to 1920×1080 where the phone uses its own barcode reader, which is most Android phones; up to 1280×720 on iPhones and Firefox, which use the slower built-in fallback reader) and asks it to keep focusing. A phone that can't give that uses the nearest it has. The Guide says: "To scan from further away, tap **+** in the corner of the camera picture to zoom in (on phones that allow it)."

- **Zoom buttons:** on phones that let a web page zoom the camera (most Android phones; most iPhones don't, so nothing shows there), a dark box with **−**, the current zoom (for example `2×`) and **+** appears in the top-right corner of the camera picture once the camera has started. It covers only that corner and doesn't make the camera box taller. Each button is at least 44×44px.
- **Steps:** **+** goes 1×, 1.5×, 2×, 3×, 4×, 5×, and **−** back down, never past what the camera can do (and never past 5×). **−** is greyed out at the lowest zoom and **+** at the highest. Screen readers hear the buttons as "Zoom out" and "Zoom in" in a group called "Zoom", and the new zoom level is announced.
- **Remembered:** the last zoom used is kept on this phone and used again the next time Live scan starts (if the camera allows it).
- **With the torch:** zooming keeps the torch on, and switching the torch keeps the zoom.
- Zoom has no switch of its own in the site settings: it comes and goes with Live scan (`liveScan`), and switching off `torch` doesn't affect it.

## Seal check (build 48)

When both **Seal in** and **Seal out** have something in them, the app compares them after removing spaces and anything that isn't a letter or digit, ignoring upper/lower case:

- the same number in both: "Seal in and seal out are the same number. Check them: the seal put on should be a new one."
- different lengths: "Seal in has 8 characters and seal out has 9. Check neither is mistyped." (with the real counts)

The note shows under the seal boxes when you leave a seal box (and whenever the delivery fields are filled in by the app: opening the app, loading a saved delivery or an imported log, or **Undo** after **Start new delivery**; starting a new delivery clears it). While you are typing, a note that no longer fits goes away, but a new one waits until you leave the box, so it doesn't flash up half-way through a number. It is only a reminder: it doesn't stop anything, the note itself isn't saved, and it doesn't appear on exports. Screen readers announce it.

## Clear trailer, seals and notes (build 53)

A **Clear trailer, seals and notes** button sits under **Delivery notes**. It is for the next trailer on the same day:

- It empties **Trailer number**, **Seal in**, **Seal out** and **Delivery notes**, and keeps **Date**, **Received**, **Expected pallets** and the pallets in the log.
- The change is saved straight away, any seal note goes, and the Undo bar says "Cleared the trailer, seals and notes"; **Undo** puts all four back (and saves them).
- The cursor moves to the **Trailer number** box, ready for the next one.
- The button is greyed out (and does nothing) while all four boxes are empty or only hold spaces; typing in any of them turns it on. It is at least 44px tall and fits the screen at 360px.

It doesn't start a new delivery: use **Start new delivery** to save the log and clear the pallets.

## Site settings and "In testing" notes (build 53)

The person who runs the site can switch features off for everyone, or mark them as still being tested, in `config.js` (how: [installation](installation.md#site-settings-configjs)). Staff see the result the next time they open the app online:

- **A switched-off feature is simply not there:** its buttons, Settings section and Guide lines are hidden, and the Guide's sections are renumbered. The features that can be switched off are the **Report** button (and every report link), the **Manifest check**, reading manifests and logs from **photos** (PDFs and typing stay; the step is then called "2. Manifest PDFs" and the prefix presets are hidden), **Live scan**, **Scan by photo** (with both off, and **No LPN** off too, there is no **Scan** button), the **Torch**, **damage** choices, the **No LPN** button (build 55), **Share missing list**, **Find an LPN**, **Share this app**, the **welcome** card and the **what's new** card.
- **Data already on the phone is kept.** With damage switched off, damage notes already on pallets still show and still go on the exports. With the Manifest check off, manifest numbers saved earlier stay on the phone but are ignored (no counting off or "NOT on manifest" warnings). With Report off, reports waiting to be sent stay on the phone and are not sent, and the privacy section says "There’s no Report button in this copy of the app, so nothing you enter leaves the phone." **Download problem report** in Settings is always there.
- **A feature marked as in testing** gets a bold note in the warning colour next to it, for example "In testing: Live scan may not always work yet, so check what it gives you, and use Report if something goes wrong." (the Report part is left out when Report is switched off). The note for Report itself, in the report box, says "In testing: reports may not always arrive yet, so for anything urgent also use Download problem report in Settings." Where the notes show: at the top of the Manifest check, under the photo step, in the damage row, in the description row of a No LPN pallet, under **Share missing list**, under the **Find an LPN** box, under **Send the link**, and in the camera box for Live scan or Scan by photo (only the one in use) and the Torch (only while the Torch button shows).

## Manifest check

The section opens (tap **Manifest check**) on **Manifest date**, then the two steps side by side: **1. LPN log** and **2. Manifest photos or PDFs** ("2. Manifest PDFs" when photo reading is switched off in the site settings, build 53). Below them is the closed **Prefix presets** section; its heading shows the current choice in brackets, for example "(all prefixes)", the preset name, or the typed prefix list. The **Manifest check** heading button and **Show missing** are at least 44px tall.

On phones, while the Manifest check is open and its top is in the upper part of the screen (above 45% of the screen height), the pallet entry bar slides down out of view so it does not cover the section. It slides back when you scroll up towards the log, and it never slides away while you are typing or scanning into it.

- **Manifest sources:** photos (OCR), PDFs (text read exactly, scanned pages by OCR, several at once), or typed/pasted numbers. The PDF reader is downloaded the first time a PDF is read, so that needs internet once; after that PDFs can be read offline.
- **Log sources:** Use current log, a saved delivery, an exported `.xlsx`/`.csv`/`.xls`, an app-made PDF (read exactly), another PDF, or a photo of a printed log.
- **Use n as expected:** while a manifest is loaded and Expected pallets is empty, the progress line offers to copy the manifest count into Expected pallets.
- **How photos are read (build 35):** each photo is made black and white by comparing every point with the paper around it, so shade across the page and paper grain don't turn into junk, and pages with ruled lines are read in full. The numbers on one photo are then matched to each other: when most of a page's numbers are, say, `VLT` + 9 digits, a reading such as `VL1004040355` is put back to `VLT004040355`, and an O read as an extra 0 after the prefix (`RUN0001832816` where the others are `RUN001832…`) is dropped. A number with nothing to compare against is kept as read. Since build 36, specks on the paper that read as a code are left out: when a photo's numbers show a clear pattern, a reading with a prefix seen nowhere else on that photo and without an LPN's digit count (9 or 10, or 10 or 11 for `IM`; for example `DFA51400180` on a page of `VLT` numbers) is not added, and the problem log notes it as "Ignored as not looking like this page's LPNs". A short reading of a prefix the page uses is still added so you can check it. Since build 37, a reading whose prefix has a different number of letters from every prefix on the photo (for example `CO1080002090` or `L1121100001` among `VLT` numbers) is left out too. A number with another prefix of the same length and 9 or 10 digits is still added. `IM` numbers (full pallet picks, two letters) are always kept, whatever the other numbers look like. When the most common number shape on a photo is a tie (for example 9 and 10 digits), the plainly printed readings decide it.
- **Prefix presets** (tap the heading to open) limit which numbers OCR picks up. Since build 53, when photo reading is switched off in the site settings, the presets are hidden and any saved prefix list is ignored, so PDFs give every number. The list is applied after the tidy-up above, so a mended number with a listed prefix is kept. Leave the list empty for any 1–3 letter prefix. Presets come from `presets.json` and from presets saved on the device.
- **What each file added:** after reading manifest photos, manifest PDFs or log photos, the message has one note per file, for example "Photo 1: found 2 LPNs, 1 new, 1 already in the list." (PDFs are named by their file name, log photos as "Log photo n"). A file where nothing was found says "No LPNs could be read: try a closer, sharper photo in good light." or, for a PDF, "No LPNs could be read from this PDF."
- **Numbers left out by the prefix list:** when a prefix list is set, numbers of 1–3 letters followed by an LPN's digit count (exactly 9 or 10 real digits, or 10 or 11 after `IM`; since build 40 also an `IM` number with 9 digits, one short and probably a misread) whose letters aren't in the list are not added, but the note names them (up to four, then "…"), for example "2 other numbers (QUB001899186, QUB001899210) start with QUB, which isn’t in the prefix list. If they are LPNs, add QUB under Prefix presets (or clear the prefixes) and read the photo again." For PDFs it says "read the PDF again". Numbers of other lengths (PO, phone or reference numbers, such as `TEL 01234567890`) are never named. With an empty prefix list nothing is left out.
- **Readings that didn't look like the page (build 37):** readings left out by the tidy-up that have an LPN's digit count (9 or 10, or 10 or 11 for `IM`) are named in the photo's note, for example "3 other readings (CO1080002090, RR1004040021, L1121100001) didn’t look like the other LPNs on this page, so they were left out. If one is a real LPN, type it in the box." They are not added; type in any that are real.
- **Numbers corrected to match the page (build 45):** when the tidy-up changes a reading to match the other numbers on the photo (for example `VL1004040355` to `VLT004040355`, or an extra 0 dropped), and the corrected number is added, the photo's note names it so it can be checked: "1 number was corrected to match the others on the page (VLT004040355): check it against the paper." (or "n numbers were corrected … check them against the paper.", up to four named, then "…"). A number read twice and corrected is named once. The problem log adds "corrected to match the page" with the numbers.
- **Report a problem with these photos (build 45):** after a batch of manifest photos is read, a **Report a problem with these photos** link appears under the message. It opens the report box (see [Report a problem or idea](#report-a-problem-or-idea)) set to **Problem**, with the photo that read worst already attached (made smaller as usual): a photo that couldn't be read first, then the one with the fewest LPNs found, then the one with the most numbers skipped by the prefix list, left out or corrected. The text box stays empty; its hint asks "What went wrong with photo n? For example, which numbers were missing or wrong.", so the report always has your own words. While the photo is being added the note says "Adding photo n…" and **Send** is greyed out; then it says "Photo n attached (n KB)". If the photo can't be added, the box says so and the report can still be sent. The photos are only held in memory for this, never saved; **Clear** and reading manifest PDFs remove the link and forget them, and so does choosing a new batch.
- **Sideways and upside-down photos (builds 46 and 47):** when a manifest photo gives nothing that looks like an LPN (no LPNs, nothing left out by the prefix list and no readings that didn't look like the page), it is turned 90° and read again, and if that also finds nothing, turned 270° and read again. Since build 47, if neither sideways turn finds anything, it is turned 180° (upside down) and read once more. While this happens the message shows "Photo n of n: No numbers found, so turning the photo to try again…". When a turned reading finds something, the photo's note ends "The photo was sideways, so it was turned to read it." (90° or 270°) or "The photo was upside down, so it was turned to read it." (180°). If no way up finds anything, the usual "No LPNs could be read…" note shows; a blank or blurry photo is therefore read four times before that note, so it takes longer than an upright one. A photo that only has numbers with an unlisted prefix counts as found, so it is not turned. Log photos and scanned PDF pages go through the same reader and are turned the same way, but only manifest photos show the "turning the photo" message. After each photo the app frees the memory of its full-size copies straight away (phones, Safari above all, give it back late otherwise).
- **Add a prefix with one tap (build 46):** when manifest photos or manifest PDFs give numbers that were left out because their prefix isn't in the prefix list, the note says "…tap Add RBY below to add them to the prefix list." (instead of "add RBY under Prefix presets … and read the photo again"), and a button **Add RBY to the prefix list** appears under the message, one per missing prefix. Tapping it adds the prefix to the prefix list (saved as usual) and adds the numbers already read with that prefix to the manifest box, without reading the photos again. The message then says "Added RBY to the prefix list and n numbers starting with RBY to the manifest list (n already there). Check them against the paper copy." followed by the earlier per-photo notes (with the "tap Add" sentence removed). If Check results is open, the results are worked out again. The button goes, and keyboard focus moves to the next Add button or, if none is left, the manifest numbers box. The buttons only show while a prefix list is set; they go when the prefix list is changed to include that prefix, or cleared, and with **Clear** or a new batch of photos or PDFs. Log photos don't get the button.
- **One bad file doesn't stop the rest:** if a manifest photo or log photo can't be read, its note says "Photo n: couldn’t be read (reason)." and the next photos are still read. Manifest PDFs already worked this way; a PDF that fails is listed under "Couldn’t read:". The exception is the PDF reader failing to load, which stops at that file with the "PDF reader couldn’t load" message.
- **Unusual digit counts:** after reading or typing manifest or log numbers, the message ends with "These have an unusual number of digits, so check them against the paper copy: …" (up to eight, then "and n more") for lines that are letters followed by digits but not 9 or 10 digits (10 or 11 for `IM`). Since build 39 `IM` numbers with 10 or 11 digits are not listed there; a 9-digit `IM` number is. Lines in another form, such as `VLT-004040265` or `004040265`, are judged only by the digits at the end (9 or 10 is fine), as before build 39; build 39 had listed them all, and build 40 put this back.
- A note under the manifest numbers box reminds you that numbers read from photos can be misread, so check them first. (This replaced the earlier "still being tested" warning at the top of the section.)
- **Check results** lists Missing (on the manifest, not logged: report), Log only (logged, not on the manifest: book in) and Matched. **Fix** corrects a misread number, ✕ removes it.
- **Pallets with no LPN (build 55):** "No LPN n" lines in the log can't be matched, so they are left out of Missing, Log only and Matched and counted on their own: the summary adds "No LPN (check by hand): n", the Excel export adds a "No LPN pallets" row to its summary box and "No LPN: n" to its title line, the PDF adds a "No LPN pallets" row to its Summary table, and the shared list ends "Pallets with no LPN (check by hand): n". These lines only appear when there are any. They aren't listed as an unusual number of digits, and a log with only No LPN pallets can still be checked. An uploaded log says, for example, "log.xlsx: 12 LPNs found and 1 with no LPN"; **Use current log** and a saved delivery now say "n pallets" (they said "n LPNs").
- **Share missing list (build 49):** a button at the top of the results. On a phone it opens the share menu (WhatsApp, Teams, email, text…) with a short message:

  ```
  Manifest check 01/11/2026, trailer TR4471
  Missing from the log (2): RBY006292169, RBY006292211
  On the log only, to book in (1): QUB001899182
  Matched: 2 of 4 on the manifest
  ```

  The date and trailer parts are left out when they aren't known, and an empty list says "none". Closing the share menu without sending does nothing. Where there is no share menu (most computers), or sharing fails, the text is copied and the message under the buttons says "The missing list was copied. Paste it into a message or email." If copying isn't allowed either, the message shows the list itself ("Sharing isn’t available here. The list is: …").
- **Export** gives the comparison as Excel (`Manifest-check-<date>-<trailer>.xlsx`), Email PDF or Print (`Manifest-check-<date>-<trailer>.pdf`). Since build 46 the trailer part is the trailer number of the delivery that was checked: the current log's trailer box when **Use current log** loaded it, or the saved delivery's trailer when a saved delivery was chosen. A log uploaded as a file or read from a photo gives no trailer part, and neither does a delivery without a trailer number. When the comparison is added to an uploaded `.xlsx` log, the file keeps the log's own name with " (with manifest check)". With "Include a copy of the log" on, an uploaded `.xlsx` log gets the comparison as a new tab, and PDFs get the log appended. When a log PDF is appended, any links and page-open actions in it are removed; the printed pages are unchanged. Values from an uploaded log are only ever written as plain text or numbers, so a file from outside can't add formulas or links to the export.
- **Photo reader:** reading photos downloads the photo reader and its language data the first time, which can take a while on a weak signal. If it hasn't started after 90 seconds, or can't be downloaded, it stops with "The photo reader couldn’t load…" and the next try downloads it again. Since build 41 one reader is started for a batch of photos (or scanned PDF pages) and reused, so the second and later photos start faster; it is closed 15 seconds after the last photo to free memory. If one photo takes longer than 2 minutes to read (for example the phone stopped the reader while the app was in the background), that photo fails with "The photo reader stopped. Try the photo again." and the next photo gets a fresh reader. Reading manifest photos and a log photo at the same time is fine: they take turns. Reading photos needs iOS 16 or newer on an iPhone; older phones can still scan barcodes, read PDFs (iOS 16.4+) and type numbers.

## Exports

| Output | File | Notes |
|---|---|---|
| Download (Excel) | `LPN-log-<yyyy-mm-dd>-<trailer>.xlsx` | Title band, numbered list, totals by type, Delivery Details, version line; A4 portrait, page numbers |
| Email PDF | `LPN-log-<yyyy-mm-dd>-<trailer>.pdf` | Opens the share sheet; if blocked, saves the file and opens a new email |
| Print | PDF in the print dialog (`LPN-log-<yyyy-mm-dd>-<trailer>.pdf` if saved) | Saves the PDF if printing isn't available |
| Basic spreadsheet (builder couldn't load) | `LPN-log-<yyyy-mm-dd>-<trailer>.xls` | See [Common problems](#common-problems) |

**Trailer number in file names (build 46).** The `-<trailer>` part is the Trailer number box, for example `LPN-log-2026-11-01-TR4471.xlsx`. Anything other than letters, numbers and dashes becomes a dash, repeated dashes become one, dashes at the start and end are dropped, and it is cut to 20 characters (`TR 4471/A` gives `-TR-4471-A`). With no trailer number the name is `LPN-log-<yyyy-mm-dd>.xlsx` as before. Exports from Saved deliveries use that delivery's trailer number. With no date the date part is `no-date`.

If an expected count is set and differs from the total, the first export attempt shows a reminder instead; choosing it again proceeds.

**Long LPNs and notes in the spreadsheets.** On the pallet log and the manifest check sheet, the LPN column widens to fit the longest LPN in the file (it never gets narrower than the usual width, and stops at 40 characters wide). A value too long even for that, such as a web address scanned by mistake, wraps onto a taller row instead of stretching the column. Rows in the Delivery Details table grow tall enough to show long notes in full. The logo above the table is sized to the width of the table.

**Which version made the file.** Every export says which version of the app made it, for example "LPN Pallet Log v4.0 (build 52)". The version is the newest entry in the Changelog (its first heading, `v4.0` since build 52; `v3.30` before); the build is the cache number in `sw.js` (`lpn-log-v52` is build 52).

| Export | Where the version appears |
|---|---|
| Excel log and manifest check sheet | A small grey line under the tables: "Made with LPN Pallet Log v4.0 (build 52) on dd/mm/yyyy at hh:mm." (the date follows the Date format setting), and the left side of the printed page footer |
| PDF (Email PDF, Print, saved deliveries) | The left side of the page footer |
| Basic `.xls` (when the spreadsheet builder can't load) | A "Made with … on … at hh:mm." line under the table |

If the build number can't be found within 1.5 seconds (for example on a very weak signal), the export goes ahead without it and shows only "LPN Pallet Log v4.0".

Importing an exported log (Saved deliveries or the Manifest check) stops reading LPNs at the "Made with" line, so it is never taken for a pallet, even if someone has deleted the blank row above it. Both read spreadsheets the same way, so a log gives the same pallets in either place.

After a log export (Excel, Email PDF or Print) the log shows "Exported at hh:mm". If pallets are changed afterwards it reads "Changed since it was exported at hh:mm" in amber, and Start new delivery will ask for a fresh export first. Exports made from Saved deliveries don't change this note.

## Saved deliveries

- Holds this week and last week (weeks start on Sunday); older entries are removed automatically.
- Each entry can be opened (the current log is saved first), exported to Excel, emailed as PDF, or deleted (with Undo).
- **Import an exported log** rebuilds a delivery from an exported spreadsheet or app-made PDF. If it is older than last week, it is offered for loading straight into the log instead.
- The panel shows when this device was last backed up, with **Back up now**.
- **Find an LPN (build 46):** a search box above the list ("Type or paste part of an LPN"). Type 3 or more letters or numbers from any part of an LPN; spaces, dashes and case are ignored (`4040 265` finds `VLT004040265`). Only the saved deliveries that hold a matching pallet stay in the list, and each shows a "Found:" line naming up to three matching pallets with their type, for example "Found: VLT004040265 (BB)", then "and n more". The line under the box says "Found in n saved deliveries." or "Not in any saved delivery from the last two weeks.", and adds "It is also in the current log." when the current log has a match. With 1 or 2 characters it says "Type at least 3 letters or numbers." and shows every delivery. Clearing the box shows every delivery again. A deleted delivery (showing "Deleted. Undo") is never counted.

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
3. Optional (build 50): **Your name (optional)**, up to 60 characters, so Jamie knows who to ask. Runs of spaces become one and the ends are trimmed. The name is remembered on this phone and filled in the next time the box opens; clearing the box and sending forgets it. Left empty, no name is sent.
4. Optional: **Add a photo**. It is made smaller before sending (at most 1600px along the long side, as a JPEG) and the note shows its size, for example "Photo added (240 KB)". **Change photo** and **Remove photo** appear once one is added.
5. **Attach the problem report** is ticked by default; untick it to send only the text and photo. The problem report holds the recent actions on this phone, with the LPNs involved (see [Problem report](#problem-report)).
6. Tap **Send**. "Sent. Thank you!" means it has arrived; the box closes by itself 1.5 seconds later.

Since build 50, **Send**, **Close** and the status line under them are pinned to the bottom of the box, so they stay on screen however tall the form gets (Extra large text, the name box, a short phone or the keyboard open); the form scrolls above them. On screens no taller than 700px the text box is a little shorter (at least 76px).

Reports go to Jamie's private GitHub repository through a Cloudflare server. A name, when given, shows in the issue under "From:" as plain text. Settings' **Report a problem or idea** section points to the Guide's **Your data and privacy** section for what a report includes (see [Your data and privacy](#your-data-and-privacy-build-50)). The problem report includes the LPNs and manifest numbers on the phone, file names, the start of text read from photos, and the browser and screen size. Since build 44 the box itself no longer says where reports go (the user's choice); it starts with "Tell Jamie what went wrong or what would help. With no signal, it’s kept on this phone and sent when you’re back online."

**Switched off (build 53).** With `report` set to `false` in the site settings, the **Report** button, the box, the Settings section, the Guide link and **Report a problem with these photos** are all gone, and reports already waiting on the phone are not sent. Use **Download problem report** instead.

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

The **Guide** button in the header opens the Guide in the side panel. Its ten sections, with their names in the contents bar in brackets, are: 1. Quick start (Start), 2. Set up the delivery (Delivery), 3. Log pallets (Logging), 4. Scanning barcodes (Scanning), 5. Check against the manifest (Manifest), 6. Export, 7. Saved deliveries and backups (Saved), 8. Install it on your phone (Install), 9. Settings and good to know (Settings) and 10. Your data and privacy (Privacy). Build 52 shortened the text from about 1,630 to about 1,180 words and rewrote it in plain language (short whole sentences, active instructions such as "Tap the type", "Enter the Date"), with the same sections and titles. It now also says that saved deliveries older than last week are removed automatically, that **Prefix presets** are in the Manifest check, and that Start new delivery clears the manifest numbers. Undo, offline use, **Tap to share**, the handheld scanner note and Live scan's **Torch** are still covered. Since build 53 section 2 also mentions **Clear trailer, seals and notes**, and the lines about features switched off in the site settings are left out, with the sections renumbered (for example, with the Manifest check off, Export becomes section 5; with every feature off there are nine sections). Since build 54 the Live scan line in section 4 says to tap **+** in the corner of the camera picture to zoom in for scanning from further away (on phones that allow it); it is part of the `liveScan` line, so it goes when Live scan is switched off.

The Guide starts with a **▶ Watch the demo video (47 seconds)** button, above the contents bar and the guide sections. (The button said 38 seconds before build 39 and 40 seconds from build 39 to 48; since build 49 the video is 46.6 seconds.) Section 9 also says what LPNs look like: a letter prefix followed by digits, usually 3 letters and 9 or 10 digits, while `IM` numbers (full pallet picks) have 2 letters and 10 or 11 digits; the v3.30 changelog notes that `IM` numbers are always kept and not called unusual.

- Nothing is downloaded until the button is tapped (the video is set to `preload="none"`).
- Tapping it hides the button and shows a video player in its place, which starts playing. The video is portrait (720×1280, about 47 seconds, about 1.7 MB), has narration and subtitles, and shows a still picture (`media/demo-poster.jpg`) before it plays. The player has the usual controls (play, pause, full screen) and plays inside the page on iPhones rather than jumping to full screen.
- The video starts at half volume, so it isn't too loud; the player's volume control can turn it up. iPhone Safari ignores volume set by a page, so there the phone's own volume buttons set the level.
- The scanning part shows picking the pallet type before scanning: FMCG is tapped, then **Scan** and **Live scan**; the first barcode is added as FMCG ("Added #9 … FMCG"), then BB is tapped and the next barcode is added as BB. The narration says: "Pick the pallet type first, then scan. Each pallet is logged with that type, so change it before the next one."
- Re-recorded for build 52 so its screens show v4.0 (same scenes, still about 47 seconds).
- The video was re-recorded for build 45, so it shows the **Report** button in the header, and the date box shows day/month/year as on a UK phone.
- Re-recorded again for build 49 with a "Damage" scene: the first pallet is tapped and marked **Wet** ("Damaged pallet? Tap it and mark it crushed, wet, or say what's wrong."). The Manifest check scene ends with a tap on **Share missing list** ("…and share the missing list in one tap."); the phone's share menu itself isn't shown.
- Closing the Guide pauses the video. Opening the Guide again shows the button again.
- When the video starts, keyboard focus moves to the player, so its controls can be used straight away.
- The video needs internet: it is not saved for offline use. If it can't play, the Guide shows "The video couldn’t play. Check you’re online, then try again."

## Changelog and version (v4.0, build 52)

The **Changelog** button opens the list of changes, newest first. Since build 52 it starts with a short **v4.0** section marked **Current**, six bullets that sum up the release for colleagues: Share this app with a QR code, the shorter Guide with its privacy section and the welcome card; damaged pallets; Share missing list, turned photos and one-tap prefix in the Manifest check; Find an LPN and trailer numbers in file names; Live scan's Torch and the seal number note; Follow phone colours, a name on reports and the what's-new card. The four newest bullets that had been under v3.30 moved into it. Build 53 added two bullets at the top of the v4.0 list: **Clear trailer, seals and notes** ("for the next trailer on the same day. It keeps the date, name and expected pallets, and can be undone.") and the site settings file ("A site settings file (**config.js** in the repo) can switch features off for everyone, or add a note that a feature is still being tested."). Build 54 added one more at the very top: "Live scan reads barcodes from further away: the camera now gives a sharper picture and keeps focusing, and phones that allow it have zoom buttons in the corner of the picture." Build 55 added "The **No LPN** button logs pallets that arrive without one, with an optional description. They go on the exports and are counted separately in the Manifest check." at the very top (hidden, like its Guide lines, when `noLpn` is switched off), and the Guide's Undo sentence now reads "An **Undo** bar appears after you remove a pallet, change one (its LPN, description or damage) or use Clear all." The newest bullet is the line the what's-new card shows after an update. The full v3.30 list and the older versions (v3.20, v3.0, v2.0, v1.5, v1.0) follow unchanged.

The version shown in the footer ("LPN Pallet Log v4.0 · Made by Jamie ·"), in the problem report, on reports sent with **Report** and on every export is read from that first heading, so it changed to v4.0 with no other code change.

## Your data and privacy (build 50)

Section 10 of the Guide, **Your data and privacy** ("Privacy" in the contents bar), says in plain words:

- Everything entered (pallets, deliveries, names and settings) stays in this browser on this phone. There is no account, and "nothing you enter is sent anywhere unless you send a report" (this wording since build 52).
- Manifest photos and PDFs are read on the phone and not saved; only a short note of what was read goes in the problem log on the phone.
- The only thing that leaves the phone is a report the person chooses to send with **Report**: their message, their name if they add it, a photo if they add one and, if ticked, the problem report. It lists what the problem report includes: the numbers in the Manifest check, the delivery date and pallet counts, recent app activity and errors (with the LPNs, file names and start of the text read from photos they mention), the prefix list, and the browser, screen size and time zone. Reports go through a Cloudflare server to a private GitHub project only Jamie can see. Cloudflare sees the internet address, "kept for up to a day to stop spam" (since build 51; it said "for an hour" before, see the note under [Feedback Worker](architecture.md#feedback-worker-toolsfeedback-worker)).
- The Excel, PDF and photo reading tools are downloaded from public code servers the first time they are needed. No data is sent to them, but they see the internet address.
- When Report is switched off in the site settings (build 53), the report lines are replaced by "There’s no Report button in this copy of the app, so nothing you enter leaves the phone.", and the line about manifest photos and PDFs is left out when the Manifest check is switched off.
- Clearing the site's data in the browser deletes the log and saved deliveries. On an iPhone, a web page not added to the home screen can be cleared after a few weeks unused, so install the app and use **Back up now**.

## Share this app (build 50)

**Settings → Share this app** (between Date format and Install) shows a QR code (180×180px) that opens `https://jamie9904.github.io/`, the address written out under it, and **Send the link**. A colleague scans the code with their phone camera, opens the app and installs it from there. The code keeps its white background in every colour theme so phone cameras can read it, and it is saved for offline use with the rest of the app.

**Send the link** opens the phone's share menu with "LPN Pallet Log: the goods-in pallet log app." and the address. Closing the share menu does nothing. Where there is no share menu (most computers), or sharing fails, the address is copied and the message says "Link copied. Paste it into a message or email."; if copying isn't allowed either, it says "Sharing isn’t available here. Send them this link: https://jamie9904.github.io/".

## Welcome and what's new card (build 50)

A card can appear at the top of the page, above the Delivery card:

- **First visit** (nothing of the app's is stored in this browser yet): "New here? The 47-second demo video shows how the app works." with **Watch the demo** and **No thanks**. **Watch the demo** opens the Guide and starts the video; either button closes the card and it isn't shown again. Since build 51 the card stays until one of them is pressed: reloading or closing the app without answering shows it again next time.
- **After an update** (the build on this phone is newer than the one last opened here): "Updated. " followed by the newest Changelog bullet as plain text (since build 55 the newest bullet of a feature that is switched on in the site settings, so a switched-off feature isn't announced) (cut to about 170 characters at a word, with "…"), with **See what’s new** (opens the Changelog) and **Got it**. It shows once per update. From build 52 that bullet was the first one of the short "v4.0 Current" summary ("Version 4.0, ready to share with colleagues: …"); from build 53 it is the **Clear trailer, seals and notes** bullet. The build last opened is remembered on every load, so the first what's-new card appears with the first update after build 50 (phones coming from build 49 had nothing remembered yet).

Either card can be switched off for everyone in the site settings (`welcome`, `whatsNew`, build 53). On a first visit the install pop-up may open on top of the card; the card can't be reached while the install box, a panel or the report box is open. When a card button is pressed, keyboard focus moves to the **Guide** button in the header before the card goes.

## Keyboard and screen readers

- The Guide, Changelog, Settings and Saved deliveries panel and the install box act as dialogs (build 41): when one opens, focus moves into it (to **✕ Close** in the panel, to the first visible button in the install box), the page behind can't be reached with Tab or a screen reader, and when it closes focus goes back to the button that opened it. Escape closes them.
- The page language is British English (`lang="en-GB"`), so screen readers use a UK voice.
- Since build 42:
  - each LPN in the log is a button named "Edit LPN <number>" (see [Logging behaviour](#logging-behaviour)); since build 49 it reads "Edit LPN <number>, or mark damage", or "Edit LPN <number>, damaged: <reason>, or mark damage", and the damage choices are a group named "Damage for <number>" with each choice announced as pressed or not;
  - Escape closes an open Export menu (the log's or the Manifest check's) and puts focus back on its **Export** button;
  - the remove (✕) column in the pallet table has the heading "Remove" for screen readers (not shown on screen);
  - the buttons in Saved deliveries say which delivery they act on, for example "Open the delivery of <date>", "Email PDF of <date>" and "Delete the delivery of <date>" (Excel already did);
  - the Missing, Log only and Matched headings in the Manifest check results are level-3 headings (were level 4), and the counts above them (`On manifest`, `Matched`…) use the normal text colour for contrast;
  - the Matched summary that opens the matched list is at least 44px tall, with its arrow;
  - the entry-bar counter is no longer read out each time it changes (the "Added" note already says it);
  - links inside the Guide jump straight to their section, without scrolling smoothly, when the phone or computer is set to reduce motion.

## Settings

Colours (Follow phone, two colours drive the whole theme, with a contrast warning; since build 41 the edges of boxes and buttons and any accent-coloured text, such as panel headings and links, are adjusted automatically so they stay readable with any chosen colours), quick themes, logo, default pallet type, keep last type, warnings, sound, vibration, confirm scans, text size, date format (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd), include log copy in comparisons, forget remembered names, share this app (QR code and **Send the link**, build 50, see [Share this app](#share-this-app-build-50)), install pop-up, backup and restore, report a problem or idea, problem report. Since build 53 **Share this app** and **Report a problem or idea** are left out when they are switched off in the site settings (see [Site settings](#site-settings-and-in-testing-notes-build-53)).

**Follow phone (build 46):** the tick box at the top of **Colours**, "Follow phone: dark (navy and orange) when the phone is in dark mode, light (light and blue) when it isn’t". When ticked, the app uses navy `#0c1830` with orange `#ff8a2a` while the phone or computer is in dark mode, and light `#eef1f6` with blue `#2563eb` otherwise, and switches straight away when the phone changes mode, without a reload. The message says "Colours now follow the phone’s light or dark mode." and the colour boxes show the colours in use. Choosing a colour with the picker or typing a hex code turns it off and keeps the colours that were showing (with your change); choosing a quick theme or **Reset to default colours** turns it off too. It is saved on the device (and in backups) with the colours.

**Logo** (under the colours): **Add logo** / **Change logo** picks an image that is kept on this device and used in the header and on exports. A saved logo is only used if it is a PNG or JPEG image stored in the app. `logo.png` next to the app is the default; when a custom logo is set, **Reset to default logo** (or **Remove logo** if there is no default) appears. The logo controls are no longer in the Delivery card.

## Common problems

| Problem | Fix |
|---|---|
| The **Clear trailer, seals and notes** button is greyed out | The trailer, seal and notes boxes are all empty, so there is nothing to clear. |
| Cleared the trailer and seals by mistake | Tap **Undo** on the Undo bar (it stays 20 seconds). |
| A button or section from the Guide isn't in the app (Report, Manifest check, Scan, Torch, damage, No LPN, Share missing list, Find an LPN, Share this app) | It has been switched off for everyone in the site settings (`config.js`). The Guide on that phone leaves it out too; if it still mentions it, the phone has an older copy: open the app online. |
| A note says "In testing: …" | That feature is marked as still being tested in the site settings. Check what it gives you, and use **Report** if something goes wrong. |
| A change to the site settings hasn't reached a phone | Phones pick up `config.js` the next time they open the app online. Close and reopen the app with a signal. If `config.js` has a mistake, every feature shows and no notes appear; the checks on GitHub fail in that case. |
| No Torch button in Live scan | The phone or browser doesn't let web pages switch the light on (most iPhones). Use more light, or **Scan by photo** with the camera app's own flash. The button only appears after the camera has started. |
| "The torch couldn't be switched on…" | The phone refused. Try again, use more light, or use **Scan by photo**. If it says it couldn't be switched off, tap **Stop scanning**, which turns the camera (and its light) off. |
| "Seal in and seal out are the same number…" or "Seal in has n characters and seal out has m…" | Check both seal numbers against the seals. If they really are right (for example a different kind of seal was put on), carry on: the note doesn't block anything and isn't on the exports. |
| Live scan doesn't start | The site must be on HTTPS and camera permission allowed. Use Scan by photo instead. |
| No zoom buttons on the camera picture | The phone or browser doesn't let web pages zoom the camera (most iPhones). Move closer to the label, or use **Scan by photo**. The buttons only appear after the camera has started. |
| Live scan won't read a label from a distance | Tap **+** to zoom in (where the buttons show) and hold the phone steady for a moment so the camera can focus. On phones with their own barcode reader the app looks at up to four pictures a second, one at a time, so a slow phone may take a moment. |
| Live scan opens already zoomed in | It uses the zoom from last time on this phone. Tap **−** to zoom out; the new level is remembered. |
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
| Export shows no build number | The app couldn't read `sw.js` in time (weak signal and nothing cached yet). The file is fine; the version line just shows "LPN Pallet Log v4.0" without "(build n)". |
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
| Manifest photos stop adding LPNs | Read the note for each photo. "1 new, 3 already in the list" means the numbers were already there. "…start with QUB, which isn’t in the prefix list" means the prefix list left them out: tap **Add QUB to the prefix list** (since build 46), or add that prefix under **Prefix presets** (or clear the prefixes) and read the photo again. "No LPNs could be read" means try a closer, sharper photo in good light. |
| "Reporting isn’t set up yet…" | The reporting server isn't online yet. Use **Download problem report** and send the file to Jamie with a description. |
| "No signal, and there’s no room to keep more reports on this phone…" | Five reports (or about 300 KB) are already waiting to be sent. Try again with signal, or use **Download problem report**. |
| The photo was not in a report sent later | Photos aren't kept while a report waits for signal. Send the photo again in a new report once online. |
| "That photo couldn’t be read." | The browser couldn't open the image to make it smaller. Try another photo or a screenshot. |
| A number in the box differs slightly from what the photo's note first suggested | The note says it was "corrected to match the others on the page". Check that number against the paper and Fix it if it is wrong. |
| The Report link with the photos has gone | It goes after **Clear** or reading manifest PDFs, and the photos are never saved. Read the photos again, or use the **Report** button and **Add a photo**. |
| Can't find which delivery a pallet was on | Open **Saved deliveries** and type at least 3 letters or numbers of the LPN in **Find an LPN**. Only this week and last week are kept. |
| "No numbers found, so turning the photo to try again…" | Nothing LPN-like was found on the photo, so it is being read again turned on its side. Wait for it to finish; it takes longer than an upright photo. |
| Colours change by themselves in the evening | **Follow phone** is on in **Settings → Colours** and the phone switched to dark mode. Untick it, or pick your own colours. |
| An export file name has no trailer number | The Trailer number box was empty when it was exported. For the Manifest check, the log came from an uploaded file or a photo, which carry no trailer number; load it with **Use current log** or from Saved deliveries instead. |
| The damage choices don't appear | Tap the LPN itself (the number), not the type or FSDU. They show under that pallet while its LPN box is open. |
| A damage note is missing from the Manifest check export | The copy of the log in a Manifest check export doesn't include damage notes. They are in Delivery Details on the log's own exports. |
| No **No LPN** button | On a phone it is under **Scan** in the entry bar. If it isn't there either, it has been switched off in the site settings (`noLpn`). |
| "Answer the check first (Skip or Add anyway), then add the pallet with no LPN." | A warning about the previous LPN is still open. Answer it, then tap **No LPN** again. |
| Scanned the next pallet while the Description box was open | If the pallet had no description yet and the box held only the scan, it is logged as the next pallet, not saved as a description. If there was other text in the box, or the pallet already had a description, the scan is saved as (part of) the description: tap the pallet, correct the description, and add the LPN again. |
| A No LPN pallet changed number (for example No LPN 2 became No LPN 4) | Two pallets had the same number (after **Undo** or an import), so the later one got the next free number. Descriptions and types are unchanged. |
| Found the LPN of a No LPN pallet | Tap the pallet, type the LPN in the empty box ("LPN if found") and press Enter. The description stays. |
| No LPN pallets aren't in the Manifest check results | They can't be matched to the manifest, so they are counted on their own ("No LPN (check by hand)"). Check them against the paper. |
| A damaged pallet was marked by mistake | Tap **Undo** on the Undo bar, or tap the LPN and choose **None**. |
| **Share missing list** copied the text instead of opening the share menu | The browser has no share menu (most computers) or refused it. Paste the copied text into a message or email. |
| A colleague's camera won't read the QR code in Settings | Make the screen brighter and hold the phones steady; the code is 180px. Or tap **Send the link**, or give them the address shown under the code. |
| **Send the link** said "Link copied" | The browser has no share menu (most computers). Paste the link into a message or email. |
| The welcome card didn't offer the demo | It only appears when the app is first opened in a browser with nothing of the app's stored (it then stays until answered). A browser first opened on build 50 and reloaded without answering won't show it. Open the **Guide** and tap **Watch the demo video**. |
| The welcome card keeps coming back | Since build 51 it stays until answered. Tap **Watch the demo** or **No thanks**. |
| No "Updated" card after an update | It only shows when this phone remembers an older build (remembered since build 50) and only once per update. The **Changelog** always has the full list. |
| My name is filled in on the report box | It was remembered from the last report on this phone. Clear the box before sending to send without it (and forget it). |
| Anything else that goes wrong | Use the **Report** button at the top of the page (or **Settings → Report a problem or idea**) (with the problem report attached), or download the problem report straight away (**Settings → Problem report → Download problem report**) and send it with a description of what happened. |
