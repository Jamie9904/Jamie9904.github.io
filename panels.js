/* ---- help panel ---- */
const HELP={guide:`<h3>1. Quick start</h3>
<ol>
<li><b>Delivery:</b> fill in the date and who received it.</li>
<li data-f="manifestCheck"><b>Manifest</b> (optional): add it in Manifest check, so pallets are ticked off as you scan.</li>
<li><b>Pallets:</b> pick the type, tick FSDU if needed, then scan or type the LPN and tap Add.</li>
<li><b>Export:</b> Download (Excel), Email PDF or Print.</li>
<li><b>Start new delivery:</b> saves this one and clears the page.</li>
</ol>
<h3>2. Set up the delivery</h3>
<p>Enter the <b>Date</b> and who <b>Received</b> it. Names used before appear as buttons. <b>Expected pallets</b>, <b>Trailer number</b>, <b>Seal in</b>, <b>Seal out</b> and <b>Delivery notes</b> are optional and go on the exports. A note asks you to check the seals if the two seal numbers are the same or have different lengths. For the next trailer on the same day, tap <b>Clear trailer, seals and notes</b>. It keeps the date, name and expected pallets, and you can undo it.</p>
<p>If the date is old, the app asks whether to use today’s. On a phone, the details fold into one line once you start. Tap it to change them. Set your <b>logo</b> in Settings.</p>
<h3>3. Log pallets</h3>
<ol>
<li>Tap the type: BB, FMCG, FPP or Mixed. It stays selected for the next pallet.</li>
<li>Tick <b>FSDU</b> if the pallet has one. It clears after each pallet.</li>
<li>Scan or type the LPN and press <b>Add</b> (or Enter).</li>
</ol>
<p>An “Added” message confirms each pallet. Tap ↶ to remove the last one. A repeated or odd-looking LPN shows a warning with <b>Skip</b> or <b>Add anyway</b>. You can turn warnings off in Settings.</p>
<p><b>Changing the log:</b> tap an LPN to correct it, change its type or FSDU in the table, or remove it with ✕. An <b>Undo</b> bar appears after you remove a pallet, change one (its LPN, description or damage) or use Clear all. You can undo the last 10 changes, newest first: after the bar has gone, use <b>Undo</b> next to Export (or Ctrl+Z on a computer). A Clear all, Start new delivery or Clear trailer can only be undone until the log or the delivery details change.</p>
<p data-f="noLpn"><b>Pallet with no LPN:</b> pick the type (and tick FSDU if needed), then tap <b>No LPN</b> (under <b>Scan</b> on a phone). It is logged as No LPN 1, No LPN 2 and so on, and a <b>Description</b> box opens for the wrap, labels, or a supplier or PO number (optional). If the LPN turns up later, tap the pallet and type it in. The description stays.</p>
<p data-f="fppDesc"><b>FPP pallet:</b> when you log an FPP pallet, a <b>Description</b> box opens so you can say what is on it, such as kitchen roll. You don’t have to fill it in. Type what is on it and press Enter, or press Enter to leave it blank. The LPN box is then ready for the next pallet. If you scan the next pallet while the box is open, it is logged as the next pallet, not as the description. The description shows under the LPN and goes on the exports. During Live scan the box doesn’t open, so tap the LPN afterwards to add a description. To change it later, tap the LPN again.</p>
<p data-f="refused"><b>Refused pallet:</b> if a pallet is sent back with the driver, tap its LPN and choose <b>Refused (sent back)</b>. It stays on the log and the exports, marked as refused, but isn’t counted in the totals of pallets received. It still counts towards the expected pallets, because it came off the trailer. Tap it again and choose <b>Not refused</b> to undo it.</p>
<p data-f="damage"><b>Damaged pallet:</b> tap the LPN, then choose Crushed, Wet or Other (type what’s wrong). It shows in red and goes on the exports. Choose None to remove the damage.</p>
<p>Use search and the filters to find pallets. The totals count the whole log. FSDUs<span data-f="refused"> and refused pallets</span> are counted separately and aren’t in the total.</p>
<h3>4. Scanning barcodes</h3>
<p data-f="liveScan|scanByPhoto|photoUpload">On a phone, tap <b>Scan</b> next to Add.</p>
<ul>
<li data-f="liveScan"><b>Live scan:</b> the camera adds each barcode it sees. To scan from further away, tap <b>+</b> in the corner of the camera picture to zoom in (on phones that allow it).<span data-f="torch"> In a dark trailer, tap <b>Torch</b> (on phones that allow it; most iPhones don’t).</span></li>
<li data-f="scanByPhoto"><b>Scan by photo:</b> take a clear photo of the barcode<span data-f="liveScan"> if Live scan doesn’t work</span>.<span data-f="photoUpload"><span data-f="manifestPhotos"> If the barcode can’t be read, tap <b>Read the printed LPN</b> to read the number printed on the label from the same photo.</span></span></li>
<li data-f="photoUpload"><b>Upload photo:</b> choose a photo of the label that you’ve already taken, or take a new one, and the app reads the barcode. You can choose several photos at once. They’re read one after another, and if a check appears, the next photo waits until you tap Add or Skip. Stop scanning stops reading the rest, and so do Clear all and Start new delivery.<span data-f="manifestPhotos"> If the barcode can’t be read, the app reads the LPN printed on the label instead and asks you to check it before it’s added (this can take up to a minute). Reading the printed LPN needs iOS 16 or newer on an iPhone.</span></li>
<li><b>Handheld or Bluetooth scanner:</b> tap the LPN box and scan. To check your scanner works with the app first, use <b>Test a handheld scanner</b> in Settings. The screen stays on while the app is open, so scans aren’t lost (you can turn this off in Settings).</li>
</ul>
<p>In Settings, you can choose to confirm each scan before it’s logged.</p>
<h3 data-f="manifestCheck">5. Check against the manifest</h3>
<p data-f="manifestCheck">Tap the <b>Manifest check</b> heading to open it.</p>
<ul data-f="manifestCheck">
<li><b>Add the manifest:</b> add <span data-f="manifestPhotos">photos or </span>PDFs (several at once), or type or paste the numbers.<span data-f="manifestPhotos"> Always check numbers read from photos. Reading photos needs iOS 16 or newer on an iPhone.</span></li>
<li><b>While you scan</b>, the log shows how many manifest pallets are found and warns about pallets not on the manifest. <b>Show missing</b> lists the manifest pallets not found yet. <b>Use n as expected</b> copies the manifest count into Expected pallets.</li>
<li><b>The log:</b> choose <b>Use current log</b>, a saved delivery, an exported file<span data-f="manifestPhotos">, or a photo of a printed log</span>.</li>
<li><b>Check results:</b> Missing (report it), On the log only (book it in) and Matched. <b>Fix</b> corrects a misread number.<span data-f="noLpn"> Pallets with no LPN can’t be matched, so the results count them for you to check by hand.</span><span data-f="shareMissing"> <b>Share missing list</b> sends the list as a message.</span></li>
<li><b>Export</b> gives the comparison as Excel, Email PDF or Print. If <b>Include a copy of the log</b> is on in Settings, a copy of the log is added.</li>
</ul>
<p data-f="manifestCheck"><span data-f="manifestPhotos"><b>Prefix presets</b> (in the Manifest check) limit which numbers are picked up from photos. If a photo finds numbers with a prefix that isn’t listed, you can add it with one tap. </span>Start new delivery clears the manifest numbers.</p>
<h3>6. Export</h3>
<p>The <b>Export</b> menu has <b>Download (Excel)</b>, <b>Email PDF</b> and <b>Print</b>. Files show your logo, the delivery details, the numbered pallet list and the totals. They fit A4 and are named with the date and trailer number. If the total doesn’t match the expected pallets, you get a reminder first.</p>
<p><b>Email PDF</b> opens your phone’s share menu with the PDF attached. If you see a message that the file is ready, tap <b>Tap to share</b>. If the share menu can’t open, the file is saved for you to attach.</p>
<h3>7. Saved deliveries and backups</h3>
<p><b>Start new delivery</b> saves the log and clears the page. If you haven’t exported, it asks you to do that first. <b>Saved deliveries</b> keeps what you saved this week and last week (weeks start on Sunday). Older ones are removed automatically. There you can open, export, email or delete a delivery<span data-nf="findLpn"> or import an exported file</span><span data-f="findLpn">, import an exported file, or use <b>Find an LPN</b> to see which delivery holds it</span>.</p>
<p>Everything is stored on this phone only, so tap <b>Back up now</b> (in Saved deliveries or Settings) from time to time. <b>Restore backup</b> in Settings shows what a backup holds and saves a copy of your current data first.</p>
<h3>8. Install it on your phone</h3>
<ul>
<li><b>Android (Chrome):</b> tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</li>
<li><b>iPhone (Safari):</b> tap <b>Share</b>, then <b>Add to Home Screen</b>.</li>
<li><button id="showInstall">Show the install pop-up again</button></li>
<li>The app works offline once you’ve opened it online. Use Download (Excel)<span data-nf="manifestCheck"> and Email PDF</span><span data-f="manifestCheck">, Email PDF and the Manifest check</span> once while online so they work offline too. When an update is ready, tap <b>Refresh</b> on the banner.</li>
</ul>
<h3>9. Settings and good to know</h3>
<ul>
<li><b>Settings</b> has colours (or follow the phone’s light or dark mode), text size, date format, default pallet type, warnings, sound<span data-nf="shareApp"> and vibration</span><span data-f="shareApp">, vibration and <b>Share this app</b></span>.</li>
<li>LPNs are a letter prefix then digits: usually 3 letters and 9 or 10 digits. IM numbers (full pallet picks) have 2 letters and 10 or 11 digits.</li>
<li data-f="report"><b>Something not working, or an idea?</b> <button type="button" class="linkbtn" id="fbGuide">Report a problem or idea</button> (also the <b>Report a problem</b> button at the top).</li>
</ul>
<h3>10. Your data and privacy</h3>
<ul>
<li>Everything you enter stays in this browser on this phone. There’s no account, and nothing you enter is sent anywhere<span data-f="report"> unless you send a report</span>.</li>
<li data-f="manifestCheck|scanByPhoto|photoUpload">Photos<span data-f="manifestCheck"> and PDFs</span> you scan or add are read on the phone and aren’t saved. Only a short note of what was read goes in the problem log on this phone.</li>
<li data-f="report">The only thing that leaves the phone is a report you choose to send with <b>Report a problem</b>: your message, your name if you add it, a photo if you add one and, if ticked, the problem report. The problem report includes the numbers in the Manifest check, the delivery date and pallet counts, recent app activity and errors (with the LPNs, file names and start of the text read from photos they mention), the prefix list, and your browser, screen size and time zone. Reports go through a Cloudflare server to a private GitHub project that only Jamie, who made the app, can see. Cloudflare sees your internet address, which is kept for up to a day to stop spam.</li>
<li data-nf="report">There’s no button for sending reports in this copy of the app, so nothing you enter leaves the phone.</li>
<li>The Excel, PDF and photo reading tools are downloaded from public code servers the first time they’re needed. Your data isn’t sent to them. Like any website, they see your internet address.</li>
<li>Clearing this site’s data deletes your log and saved deliveries. On an iPhone, if the app isn’t on the home screen, its data can be cleared after a few weeks without use. So install the app and back up.</li>
</ul>
`,log:`<h3>v4.0 <span class="ver">Current</span></h3>
<ul><li data-f="photoUpload"><b>Upload photo</b> can read several photos at once, one after another.<span data-f="scanByPhoto"><span data-f="manifestPhotos"> When Scan by photo can’t read a barcode, <b>Read the printed LPN</b> reads the number printed on the label from that same photo, so you don’t need to take it again. You still check it before it’s added.</span></span></li><li data-f="photoUpload"><b>Upload photo</b> is a new button for a photo of the label you’ve already taken.<span data-f="manifestPhotos"> When the barcode can’t be read, the app reads the LPN printed on the label and asks you to check it before it’s added.</span><span data-f="scanByPhoto"> <b>Scan by photo</b> now opens the camera straight away and reads the barcode.</span></li><li data-nf="photoUpload" data-f="scanByPhoto"><b>Scan by photo</b> now opens the camera straight away and reads the barcode.</li><li data-f="refused">A pallet sent back with the driver can be marked <b>Refused (sent back)</b>: it stays on the log and exports but isn’t counted as received.</li><li data-f="exportReminder">If a delivery from an earlier day was never exported, the app reminds you when it opens.</li><li>Add your site or store name in Settings to show it on every export.</li><li><b>Undo</b> now goes back through the last 10 changes, with an Undo button next to Export. The screen stays on while the app is open, so a handheld scanner’s scans aren’t lost (Settings can turn this off).</li><li>Importing an exported log from weeks ago now keeps it in <b>Saved deliveries</b>: they are kept by when you saved or imported them.</li><li>Fixed: <b>Start new delivery</b> on a delivery dated more than a week ago now saves it to Saved deliveries and starts the new one, instead of stopping.</li><li>Settings has <b>Test a handheld scanner</b>: scan any barcode to see what your scanner sends and whether it works with the app. Nothing is added to the log.</li><li data-f="report">The button at the top now says <b>Report a problem</b>, so it’s clear it’s for problems with the app or ideas for it.</li><li data-f="manifestPhotos">Manifest photos: LPNs starting with a single V, R or Q (such as V0013323651) are no longer left out, a number read with a gap in it is still found, and a page with only one LPN on it no longer gets an extra 0 or picks up print showing through from the back.</li><li data-f="fppDesc">When you log an FPP pallet, a box opens to say what is on it, such as kitchen roll. The description shows under the LPN and goes on the exports.</li><li>Easier to read and tap: grey text stays readable on mid-grey background colours, the pallet count in the bottom bar is never cut off, the box for editing an LPN is bigger, and long descriptions take two lines on small phones (tap the LPN to see all of it).</li><li data-f="noLpn">The <b>No LPN</b> button logs pallets that arrive without one, with an optional description. They go on the exports and are counted separately in the Manifest check.</li><li>Live scan reads barcodes from further away: the camera now gives a sharper picture and keeps focusing, and phones that allow it have zoom buttons in the corner of the picture.</li><li>Delivery has a <b>Clear trailer, seals and notes</b> button for the next trailer on the same day. It keeps the date, name and expected pallets, and can be undone.</li><li>A site settings file (<b>config.js</b> in the repo) can switch features off for everyone, or add a note that a feature is still being tested.</li><li>Version 4.0, ready to share with colleagues: <b>Share this app</b> in Settings has a QR code to scan, the Guide is shorter and has a <b>Your data and privacy</b> section, and new users get a welcome card with the demo video.</li><li>Damaged pallets: tap an LPN to mark it Crushed, Wet or in your own words. It shows on the exports.</li><li>Manifest check: <b>Share missing list</b> sends the missing and extra LPNs as a message, sideways or upside-down photos are turned and read again, and one tap adds a missing prefix.</li><li>Saved deliveries: <b>Find an LPN</b> shows which delivery holds a pallet. Exported file names include the trailer number.</li><li>Live scan has a <b>Torch</b> button on phones that allow it, and a note asks you to check seal numbers that look wrong.</li><li>Colours can follow the phone’s light or dark mode, reports can include your name, and after an update a card says what’s new.</li></ul>
<h3>v3.30</h3>
<ul><li>Faster photo reading: one photo reader is used for a whole batch of photos instead of starting a new one for each. Live scan fits small phones: the camera view is shorter so the “Added” line and Stop scanning stay on screen.</li><li>Manifest photos: the note names any number the app corrected to match the page, so you can check it against the paper, and <b>Report a problem with these photos</b> sends a report with the photo attached. On desktop the seal boxes fit longer seal numbers, and with the Manifest check open on a phone, Undo shows at the top.</li><li>Report a problem or idea with the <b>Report a problem</b> button at the top of the page (also in Settings and the Guide). It opens in the middle of the screen: choose Problem or Idea, say what happened, add a photo if it helps, and send. The problem report is attached unless you untick it. With no signal it waits on the phone and sends when you’re back online.</li><li>More accessibility fixes: on phones the Undo bar shows just above the entry bar and stays 20 seconds; LPNs in the log can be edited with the keyboard; Escape closes the Export menus; clearer labels for screen readers on saved deliveries and the log table; Guide links don’t animate when reduced motion is on.</li><li>Easier to use with gloves and in poor light: a scan made while a warning is showing is kept in the box instead of being lost (Escape skips the warning), stronger edges on boxes and buttons, accent-coloured text always readable, bigger FSDU tick box and scan buttons, the warning shows above the camera, and the Guide and Settings panels move focus in and back out for keyboard and screen reader users.</li><li>Manifest photos are read much better: shade across the page and paper grain no longer turn into junk, every number on a page with ruled lines is found, and a number read slightly wrong (VL1… for VLT…, or an extra 0) is matched to the others on the same page. Specks on the paper that look like a code are left out. IM numbers (full pallet picks, 10 or 11 digits) are always kept and not called unusual.</li><li>Manifest check: each photo or PDF now says how many LPNs it found, how many were new and how many were already listed, and names any left out because their prefix isn’t in the prefix list. One photo that can’t be read no longer stops the rest.</li><li>Problem report in Settings: if something goes wrong, download it and send it with what happened. It lists recent manifest reads and errors on this device.</li><li>Exports: long delivery notes and longer LPNs no longer get cut off in the spreadsheets, and every export notes the app version it was made with (at the bottom of the sheet and in the page footer).</li><li>Importing an exported log and loading one in the Manifest check now read spreadsheets the same way, so the version line at the bottom is always skipped.</li><li>Safer PDFs: a PDF opened in the app (a supplier manifest or an exported log) can no longer run hidden code, and the PDF reader is updated to the latest version.</li><li>Safer backups and files: a damaged backup can no longer stop the app opening, restoring asks first and saves a copy of your current data, and files from outside can’t add links, formulas or scripts to your exports.</li><li>A security policy now only lets the app run code from its own site and its three library sources, as a second line of defence.</li><li>A demo video at the top of the Guide shows the app in action, with narration and subtitles, including picking the pallet type before scanning. It starts at half volume.</li><li>Easier to use: the pallet table scrolls with the page on phones, progress only turns red when something is wrong, one count line when the manifest sets the expected number, the Manifest check starts with its steps (prefix presets tucked away), the logo moved to Settings, the entry bar steps aside in the Manifest check, and bigger tick boxes and header buttons.</li><li>Undo last pallet button on the phone entry bar, “Use n as expected” from the manifest count, an “Exported at” note with a warning before starting a new delivery that hasn’t been exported, and a “Start a new delivery?” prompt after exporting.</li><li>Trailer number, Seal in and Seal out in Delivery, shown on exports and saved deliveries.</li><li>Live manifest tracking: add the manifest numbers first and the Pallet log counts them off as you scan, shows which are still missing and warns about pallets not on the manifest.</li><li>Phone layout: a pallet counter on the entry bar, an “Added” confirmation after each pallet, Delivery folds into one line once you start logging, neater top buttons and a clearer ✕ on each row.</li><li>Smaller tweaks: a reminder when the log is dated before today, tap-to-fill “Received by” names, a check when the total differs from the expected pallets, an FSDU filter, Excel and Email PDF buttons on saved deliveries, a last-backed-up note, and an offline notice.</li><li>Exports: a title band, numbered rows, clearer grid lines, page numbers, gridlines hidden on screen, roomier headers, the logo kept in proportion and much smaller PDFs. The manifest check has the same Export menu as the log.</li><li>Date format setting (dd/mm/yyyy by default), used in exports, lists and the date box.</li><li>Fonts are now part of the app, updates show up straight away, and the tablet layout and field alignment are fixed.</li></ul>
<h3>v3.20</h3>
<ul><li>Start new delivery, Saved deliveries (this week and last week) and importing an exported log.</li><li>Warnings for duplicate or unusual LPNs, Undo for removed pallets and Clear all, and tap an LPN to edit it.</li><li>Pallet type buttons, expected pallets, delivery notes, search and filter, and an Export menu with Print.</li><li>Manifest check: use the current log or a saved delivery, a Check results panel, and Fix or remove for misread numbers.</li><li>Settings: default and keep-last type, warnings, sound, vibration, confirm each scan, text size, colour contrast warning, backup and restore, and the install pop-up.</li><li>Works offline after the first use, shows an “update available” banner, a two-column layout on wide screens, line icons, and accessibility fixes.</li></ul>
<h3>v3.0</h3>
<ul><li>New navy and orange design with a single-sheet layout, colour-coded pallet types and a docked entry bar on phones.</li><li>Settings tab: your own background and accent colours (picker or hex), quick themes, reset, and the option to include a copy of the log with the comparison.</li><li>Stacked header on phones. The manifest comparison section can be shown or hidden and starts hidden.</li></ul>
<h3>v2.0</h3>
<ul><li>Installable as an app on Android and iPhone, with a one-time install guide.</li><li>Email buttons share a PDF copy through your phone’s share sheet. Excel downloads are unchanged.</li><li>PDF logs made by the app can be read back, and a copy of the log can be added to the comparison.</li><li>Built-in Guide and Changelog.</li></ul>
<h3>v1.5</h3>
<ul><li>Manifest comparison improvements: editable prefix presets, a separate manifest date, several PDF manifests at once, more accurate text recognition, and unmatched LPNs marked as Missing or Log only.</li><li>Comparison added as a new tab on an uploaded .xlsx log.</li><li>Black and white print-friendly comparison sheet with a summary table and the logo.</li></ul>
<h3>v1.0</h3>
<ul><li>Log LPNs with pallet type (BB, FMCG, FPP, Mixed), an FSDU tick box, date and received-by name.</li><li>Barcode scanning, by photo or live camera in the standalone version.</li><li>Excel download with logo, breakdown table and delivery details, set up for A4 portrait printing.</li><li>Check delivery against manifest from photos or files.</li></ul>`};
function guideToc(html){
  const items=[];
  html=html.replace(/<h3>(\d+)\. ([^<]+)<\/h3>/g,(m,n,t)=>{items.push([n,t]);return '<h3 id="g'+n+'">'+n+'. '+t+'</h3>'});
  const short=t=>({"Quick start":"Start","Set up the delivery":"Delivery","Log pallets":"Logging","Scanning barcodes":"Scanning","Check against the manifest":"Manifest","Export":"Export","Saved deliveries and backups":"Saved","Install it on your phone":"Install","Your data and privacy":"Privacy","Settings and good to know":"Settings"})[t]||t;
  return '<nav class="guidetoc" aria-label="Guide sections">'+items.map(x=>'<a href="#g'+x[0]+'" data-g="g'+x[0]+'">'+short(x[1])+'</a>').join("")+'</nav>'+html;
}
/* The demo video at the top of the Guide: a button first, so nothing downloads until it's tapped. */
const DEMO_HTML='<div class="demo"><button type="button" id="demoPlay" class="demobtn"><span aria-hidden="true">▶</span> Watch the demo video (47 seconds)</button>'+
  '<video id="demoVid" hidden controls playsinline preload="none" poster="media/demo-poster.jpg" aria-label="Demo video of LPN Pallet Log, with narration and subtitles"><source src="media/demo.mp4" type="video/mp4"></video>'+
  '<p class="demonote" id="demoNote" role="status" hidden>The video couldn’t play. Check you’re online, then try again.</p></div>';
function initDemo(){
  const b=$("demoPlay"),v=$("demoVid"),n=$("demoNote");if(!b||!v)return;
  const fail=()=>{n.hidden=false};
  v.volume=0.5; // starts at half volume, so it isn't too loud; the player's own control can turn it up

  v.querySelector("source").addEventListener("error",fail);v.addEventListener("error",fail);
  b.onclick=()=>{n.hidden=true;b.hidden=true;v.hidden=false;v.focus();const p=v.play();if(p&&p.catch)p.catch(()=>{})};
}
/* The panels and the install box act as dialogs: focus moves in, the page behind can't be reached, and focus goes
   back to the button that opened them. */
let dlgOpener=null;
function pageInert(on){["main","header.top","#hello","#unexp"].forEach(s=>{const e=document.querySelector(s);if(e)e.inert=on})}
function dlgOpen(focusEl){if(!dlgOpener)dlgOpener=document.activeElement;pageInert(true);setTimeout(()=>{if(focusEl)focusEl.focus()},0)}
function dlgClose(){if(!$("panel").hidden||!$("instBox").hidden)return; // the other dialog is still open
  pageInert(false);const o=dlgOpener;dlgOpener=null;if(o&&o.focus&&document.contains(o))o.focus()}
function openHelp(k,t){
  $("panelTitle").textContent=t;$("panelBody").innerHTML=k==="guide"?DEMO_HTML+guideToc(siteHtml(HELP.guide)):siteHtml(HELP[k]);
  $("panel").hidden=false;$("shade").hidden=false;$("panel").scrollTop=0;if(k==="settings")initSettings();if(k==="history")initHistory();if(k==="guide")initDemo();
  dlgOpen($("panelClose"));
}
function closeHelp(){const v=$("demoVid");if(v)v.pause();const was=!$("panel").hidden;$("panel").hidden=true;$("shade").hidden=true;if(was)dlgClose()}
/* The fixed entry bar's height, so focused controls scroll clear of it (styles.css scroll-padding-bottom). */
(function(){const en=document.querySelector(".entry");if(!en||!window.ResizeObserver)return;new ResizeObserver(()=>document.documentElement.style.setProperty("--dockh",en.offsetHeight+"px")).observe(en)})();
/* ---- settings: custom colours ---- */
const THEME_DEFAULT={bg:"#0c1830",ac:"#ff8a2a"};
const THEME_QUICK=[["Navy and orange","#0c1830","#ff8a2a"],["Sage and teal","#e3e8e4","#2f6f68"],["Charcoal and amber","#1d1f23","#f5b324"],["Light and blue","#eef1f6","#2563eb"]];
const THEME_LIGHT={bg:"#eef1f6",ac:"#2563eb"};
let theme=Object.assign({},THEME_DEFAULT);
// Follow phone: navy and orange when the phone is in dark mode, light and blue when it is in light mode.
const mqDark=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
const themeNow=()=>theme.follow?(mqDark&&!mqDark.matches?THEME_LIGHT:THEME_DEFAULT):theme;
const hexOk=v=>/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim());
function hexNorm(v){let h=String(v).trim().replace("#","").toLowerCase();if(h.length===3)h=h.split("").map(c=>c+c).join("");return "#"+h}
const toRgb=h=>{h=hexNorm(h);return [1,3,5].map(i=>parseInt(h.substr(i,2),16))};
const toHex=a=>"#"+a.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
const mixC=(a,b,t)=>{const x=toRgb(a),y=toRgb(b);return toHex(x.map((v,i)=>v+(y[i]-v)*t))};
const lumOf=h=>{const c=toRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
function applyTheme(){
  const T=themeNow(),bg=hexNorm(T.bg),ac=hexNorm(T.ac);
  // Dark (light text) or light (dark text): whichever gives more contrast on this background, so mid greys get dark text.
  const dark=(1.05/(lumOf(bg)+.05))>((lumOf(bg)+.05)/.05);
  const paper=dark?mixC(bg,"#ffffff",.08):mixC(bg,"#ffffff",.7);
  const v={
    "--bg":bg,"--paper":paper,
    "--ink":dark?mixC(bg,"#ffffff",.92):mixC(bg,"#000000",.85),
    "--mu":dark?mixC(bg,"#ffffff",.62):mixC(bg,"#000000",.55),
    "--rule":dark?mixC(paper,"#ffffff",.1):mixC(paper,"#000000",.12),
    "--line":dark?mixC(paper,"#ffffff",.22):mixC(paper,"#000000",.22),
    // Edges of boxes and buttons: strong enough (3:1) to see outdoors or in poor light; --line stays for dividers.
    "--bd":dark?mixC(paper,"#ffffff",.42):mixC(paper,"#000000",.48),
    "--ac":ac,"--ac2":dark?mixC(ac,"#ffffff",.25):mixC(ac,"#000000",.2),
    "--acs":mixC(paper,ac,.2),"--sel":mixC(paper,ac,.12),
    "--onac":(lumOf(ac)+.05)/.05>1.05/(lumOf(ac)+.05)?"#111111":"#ffffff",
    "--bb":dark?"#dba56c":"#b07d4f","--fm":dark?"#6fa8ff":"#5382b8","--fp":dark?"#a9c95a":"#8a9a3b","--mx":dark?"#c79bf0":"#9a6aa6",
    "--dg":dark?"#ff7b6e":"#b3392f","--wn":dark?"#ffcf8a":"#7a5a1c","--wns":dark?"#3a3020":"#f6ecd2"
  };
  // Text and grey text (hints, placeholders, notes) on a mid-tone background: moved towards black or white until they
  // are readable on both the background and the boxes (7:1 for text, 4.5:1 for grey text), as far as that colour allows.
  {const r=(a,b)=>{const x=lumOf(a)+.05,y=lumOf(b)+.05;return Math.max(x,y)/Math.min(x,y)},pole=dark?"#ffffff":"#000000";
    // Boxes on a mid-tone background are first moved away from the text colour if even pure white or black text
    // wouldn't be readable on them (4.6:1).
    {const away=dark?"#000000":"#ffffff",p0=v["--paper"];let pp=p0;for(let i=1;i<=10&&r(pole,pp)<4.6;i++)pp=mixC(p0,away,i/10);v["--paper"]=pp}
    [["--ink",7],["--mu",4.5]].forEach(([k,want])=>{const c0=v[k];let c=c0;for(let i=1;i<=10&&Math.min(r(c,v["--paper"]),r(c,bg))<want;i++)c=mixC(c0,pole,i/10);v[k]=c})}
  // Warning colour (refused pallets, reminders, notes): moved towards the text colour until it is readable (4.5:1).
  {const r=(a,b)=>{const x=lumOf(a)+.05,y=lumOf(b)+.05;return Math.max(x,y)/Math.min(x,y)};const w0=v["--wn"];let w=w0;for(let i=1;i<=10&&Math.min(r(w,v["--paper"]),r(w,bg))<4.5;i++)w=mixC(w0,v["--ink"],i/10);v["--wn"]=w}
  // Accent as text (headings, links, focus ring): moved towards the text colour until it is readable (4.5:1).
  {const r=(a,b)=>{const x=lumOf(a)+.05,y=lumOf(b)+.05;return Math.max(x,y)/Math.min(x,y)};let act=ac;for(let i=1;i<=10&&Math.min(r(act,v["--paper"]),r(act,bg))<4.5;i++)act=mixC(ac,v["--ink"],i/10);v["--act"]=act}
  const st=document.documentElement.style;
  Object.keys(v).forEach(k=>st.setProperty(k,v[k]));
  st.colorScheme=dark?"dark":"light";
  const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.setAttribute("content",bg);
  const rt=(a,b)=>{const x=lumOf(a)+.05,y=lumOf(b)+.05;return Math.max(x,y)/Math.min(x,y)};
  const w=document.getElementById("setWarn");
  if(w){const r=Math.min(rt(ac,bg),rt(ac,paper));w.textContent=r<3?"Low contrast: the accent colour is hard to see against this background (ratio "+r.toFixed(1)+", aim for 3 or more). Headings, links and highlights may be hard to read. Try a lighter or darker accent.":""}
}
function saveTheme(){try{localStorage.setItem("lpntheme",JSON.stringify(theme))}catch(e){}}
try{const t=JSON.parse(localStorage.getItem("lpntheme")||"null");if(t&&hexOk(t.bg)&&hexOk(t.ac))theme={bg:hexNorm(t.bg),ac:hexNorm(t.ac),follow:t.follow===true}}catch(e){}
applyTheme();
if(mqDark){const f=()=>{if(theme.follow){applyTheme();if(window.themeSync)window.themeSync()}};if(mqDark.addEventListener)mqDark.addEventListener("change",f);else if(mqDark.addListener)mqDark.addListener(f)}
HELP.settings=`<h3>Colours</h3>
<p>Choose your own background and accent colours. Use the colour picker or type a hex code such as <b>#0c1830</b>. Changes apply straight away and are saved on this device.</p>
<label class="chk"><input type="checkbox" id="setFollow"><span>Follow phone: dark (navy and orange) when the phone is in dark mode, light (light and blue) when it isn’t</span></label>
<div class="setrow"><label for="setBgPick">Background</label><div class="setfields"><input type="color" id="setBgPick" aria-label="Background colour picker"><input id="setBgHex" maxlength="7" autocomplete="off" spellcheck="false" aria-label="Background hex code" placeholder="#0c1830"></div></div>
<div class="setrow"><label for="setAcPick">Accent</label><div class="setfields"><input type="color" id="setAcPick" aria-label="Accent colour picker"><input id="setAcHex" maxlength="7" autocomplete="off" spellcheck="false" aria-label="Accent hex code" placeholder="#ff8a2a"></div></div>
<div class="msg" id="setMsg" role="status" aria-live="polite"></div>
<div class="msg" id="setWarn" role="status" aria-live="polite"></div>
<h3>Quick themes</h3>
<div class="swatches" id="setQuick"></div>
<div class="act"><button class="d" id="setReset">Reset to default colours</button></div>
<p style="color:var(--mu)">Text, borders and shading adjust to suit the background. The pallet type colours stay the same.</p>
<h3>Logo</h3>
<p class="note" style="margin-top:0">Shown in the header and on exported files. logo.png next to the app is the default; your own logo is kept on this device.</p>
<div class="row"><button id="setLogo">Add logo</button><button class="d" id="setLogoRm" hidden>Remove logo</button></div>
<h3>Comparison</h3>
<label class="chk"><input type="checkbox" id="setMerge"><span>Include a copy of the log with the manifest comparison (a tab in the spreadsheet, extra pages at the end of the PDF)</span></label>
<h3>Logging</h3>
<div class="row" style="margin-bottom:10px"><button id="setForget">Forget remembered names</button></div>
<label for="setDef">Default pallet type</label>
<select id="setDef"><option>BB</option><option>FMCG</option><option>FPP</option><option>Mixed</option></select>
<label class="chk"><input type="checkbox" id="setKeep"><span>Keep the last pallet type selected after adding (otherwise go back to the default type)</span></label>
<label class="chk"><input type="checkbox" id="setCheck"><span>Warn me about duplicate or unusual LPNs before adding them</span></label>
<label class="chk"><input type="checkbox" id="setSound"><span>Play a sound when a pallet is added or a warning shows</span></label>
<label class="chk"><input type="checkbox" id="setVib"><span>Vibrate when a pallet is added or a warning shows</span></label>
<label class="chk"><input type="checkbox" id="setAwake"><span>Keep the screen on while the app is open</span></label>
<p class="note">So a handheld scanner’s scans aren’t lost while the screen is off. The phone won’t lock by itself while the app is open, so lock it before putting it in a pocket. It uses a little more battery, and stops when you switch to another app.</p>
<label class="chk"><input type="checkbox" id="setConf"><span>Ask me to confirm each scanned barcode before it is added</span></label>
<h3>Display</h3>
<label for="setSize">Text size</label>
<select id="setSize"><option value="1">Normal</option><option value="1.12">Large</option><option value="1.25">Extra large</option></select>
<label for="setSite">Site or store name</label>
<input type="text" id="setSite" maxlength="40" autocomplete="off" placeholder="Optional, for example 323 Wigan" aria-describedby="setSiteNote">
<p class="note" id="setSiteNote">Added to the title of every export, so logs from different sites are easy to tell apart.</p>
<label for="setDate">Date format</label>
<select id="setDate"><option value="uk">dd/mm/yyyy (UK)</option><option value="us">mm/dd/yyyy (US)</option><option value="iso">yyyy-mm-dd</option></select>
<p class="note">Used in spreadsheets, PDFs and the saved deliveries lists.</p>
<h3>Test a handheld scanner</h3>
<p>Tap the box and scan any barcode with your handheld or Bluetooth scanner. Nothing is added to the log.</p>
<label for="scanTest">Scan a barcode here</label>
<input type="text" id="scanTest" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done">
<div class="msg" id="scanTestMsg" role="status" aria-live="polite"></div>
<h3 data-f="shareApp">Share this app</h3>
<p data-f="shareApp">A colleague can scan this code with their phone camera to open the app, then install it from there. Or send them the link.</p>
<img data-f="shareApp" class="shareqr" src="media/share-qr.svg" width="180" height="180" alt="QR code that opens jamie9904.github.io">
<p data-f="shareApp" class="shareurl" id="shareUrl">https://jamie9904.github.io/</p>
<div data-f="shareApp" class="row"><button id="shareApp">Send the link</button></div>
<div data-f="shareApp" class="msg" id="shareMsg" role="status" aria-live="polite"></div>
<h3>Install</h3>
<p>Add this page to your home screen so it opens like an app.</p>
<div class="row"><button id="showInstall">Show the install pop-up</button></div>
<h3>Backup</h3>
<p>Your log, saved deliveries and settings live in this browser only. Download a backup to keep a copy or move to another device, then restore it there.</p>
<div class="row"><button id="bkDl">Download backup</button><button id="bkUp">Restore backup</button><input type="file" id="bkFile" accept=".json,application/json" hidden></div>
<div class="msg" id="bkMsg" role="status" aria-live="polite"></div>
<div class="row" id="bkAsk" style="margin-top:10px" hidden><button id="bkGo">Replace my data with this backup</button><button id="bkNo">Cancel</button></div>
<div class="row" id="bkDone" style="margin-top:10px" hidden><button id="bkReload">Reload the app</button></div>
<h3 data-f="report">Report a problem or idea</h3>
<p data-f="report">Tell Jamie what went wrong or what would help, with the problem report attached. Also on the <b>Report a problem</b> button at the top of the page. What a report includes is in the Guide, under <b>Your data and privacy</b>.</p>
<div data-f="report" class="row"><button class="p" id="fbOpenSet">Report a problem or idea</button></div>
<h3>Problem report</h3>
<p>If something goes wrong, download a problem report straight away and send it with a description of what happened. It lists what the app has done recently on this device (such as manifest photos and PDFs read, and any errors), with the LPNs, file names and the start of the text read from photos, plus your browser and screen size. It is kept on this device, and is only sent if you attach it to a report.</p>
<div class="row"><button id="diagDl">Download problem report</button><button class="d" id="diagClear">Clear</button></div>
<div class="msg" id="diagMsg" role="status" aria-live="polite"></div>`;
/* Settings > Test a handheld scanner: shows what a scanner typed, whether it sent Enter after it, how fast it came
   and whether it looks like an LPN. Nothing is logged. A scan with no Enter is judged 1.5 seconds after the last key, so slow typing isn't cut off. */
function scanTestSetup(){
  const box=$("scanTest"),msg=$("scanTestMsg");if(!box)return;
  let t0=0,last=0,wait=null;
  const judge=how=>{
    clearTimeout(wait);wait=null;
    const v=box.value,code=v.trim();if(!code){msg.textContent=how==="enter"?"Only Enter came through. Scan a barcode with the box selected.":"";t0=0;return}
    const ms=Math.max(0,Math.round(last-t0)),fast=code.length>=6&&ms<code.length*35+100;
    const iss=lpnIssues(code).filter(x=>x!=="already logged");
    let t="Read “"+code+"” ("+code.length+" characters"+(code.length>1?", in "+ms+" ms":"")+"). ";
    t+=how==="enter"?"Enter was sent after it, so a scan into the LPN box logs the pallet straight away.":how==="tab"?"Tab was sent after it instead of Enter, so a scan into the LPN box would move to the next box without logging the pallet. Set the scanner to send Enter after each scan (often called a suffix or CR) using the setup barcodes in its manual.":"Nothing was sent after it, so you’d need to tap Add after each scan. Set the scanner to send Enter after each scan (often called a suffix or CR) using the setup barcodes in its manual.";
    if(code.length>=6&&!fast)t+=" It arrived at typing speed, so if that was the scanner it works, but some scanners can be set to send faster.";
    const pfx=iss.filter(x=>/^prefix /.test(x)),other=iss.filter(x=>!/^prefix /.test(x));
    if(other.length)t+=" This barcode "+other.join(", and ")+": try an LPN label to check.";
    else if(pfx.length)t+=" It looks like an LPN, but its "+pfx[0]+" (add it under Prefix presets if it is one of yours).";
    else t+=" It looks like an LPN.";
    msg.textContent=t;box.value="";t0=0;
  };
  box.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key==="Tab"){if(box.value.trim()){e.preventDefault();judge(e.key==="Enter"?"enter":"tab")}else if(e.key==="Enter"){e.preventDefault();judge("enter")}return}
  });
  box.addEventListener("input",()=>{const now=performance.now();if(!t0||box.value.length<=1)t0=now;last=now;clearTimeout(wait);if(box.value)wait=setTimeout(()=>judge("none"),1500)});
}
/* ---- saved deliveries ---- */
let hist=[];try{hist=cleanHist(JSON.parse(localStorage.getItem("lpnhist")||"[]"))}catch(e){hist=[]}
const saveHist=()=>{try{localStorage.setItem("lpnhist",JSON.stringify(hist))}catch(e){}};
/* Weeks run Sunday to Saturday. History keeps what was saved this week and last week (see pruneHist). */
function keepFrom(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()-7);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* A saved delivery is kept by the later of its delivery date and the day it was saved, so one with an old date
   (a log left from last week, or an imported one) isn't removed the moment it is saved. */
function pruneHist(){const k=keepFrom(),n=hist.length;hist=hist.filter(h=>{const d=/^\d{4}-\d{2}-\d{2}$/.test(h.date||"")?h.date:"";const s=new Date(h.saved),sd=isNaN(s)?"":s.getFullYear()+"-"+String(s.getMonth()+1).padStart(2,"0")+"-"+String(s.getDate()).padStart(2,"0");const keep=d>sd?d:sd;return (keep||k)>=k});if(hist.length!==n)saveHist()}
pruneHist();
function pushHist(entry){const id=String(Date.now())+Math.floor(Math.random()*1e4);hist.unshift(Object.assign({id:id},entry));pruneHist();hist=hist.slice(0,50);saveHist();return id}
const todayStr=localToday;
let newAck="";
function newDelivery(){
  if(!rows.length){$("dlmsg").textContent="The log is empty, so there is nothing to save.";return}
  if(!(exported&&exported.sig===logSig())&&newAck!==logSig()){
    newAck=logSig();
    $("dlmsg").textContent=(exported?"This delivery has changed since it was exported.":"This delivery hasn’t been exported or emailed yet.")+" Export it first, or press Start new delivery again to save it and start a new one anyway.";
    return;
  }
  newAck="";$("nextBar").hidden=true;
  if(typeof stopPhotos==="function")stopPhotos("log");
  const prev=Object.assign({rows:rows.slice(),man:$("cmpNums").value},getDel());
  const id=pushHist(Object.assign({saved:new Date().toISOString()},getDel(),{rows:prev.rows}));
  rows=[];setDel({recv:prev.recv,date:todayStr()});exported=null;$("cmpNums").value="";$("type").value=cfg.defType;$("type").dataset.t=cfg.defType;
  save();render();
  $("dlmsg").textContent="Saved to history and started a new delivery.";unexpCheck();
  showUndo("Saved to history. Started a new delivery.",()=>{hist=hist.filter(h=>h.id!==id);saveHist();rows=prev.rows;setDel(prev);$("cmpNums").value=prev.man||"";save();render();$("dlmsg").textContent=""},true);
}
function openHist(id){
  const h=hist.find(x=>x.id===id);if(!h)return;
  if(typeof stopPhotos==="function")stopPhotos("log");
  if(rows.length)pushHist(Object.assign({saved:new Date().toISOString()},getDel(),{rows:rows.slice()}));
  hist=hist.filter(x=>x.id!==id);saveHist();undoClear();unexpCheck();
  rows=h.rows.map(r=>Object.assign({},r));setDel(h);
  save();render();closeHelp();
  $("dlmsg").textContent="Opened the saved delivery. Your previous log, if it had pallets, was saved to history.";
}
async function parseExported(f){
  const name=f.name.toLowerCase();let unk=0;
  const normT=t=>{const k=String(t||"").trim().toUpperCase();const m={"BB":"BB","BROWN BOX":"BB","FMCG":"FMCG","FPP":"FPP","MIXED":"Mixed"}[k];if(!m)unk++;return m||"Mixed"};
  if(name.endsWith(".pdf")){
    await loadPdfJs();
    const pdf=await openPdf(new Uint8Array(await f.arrayBuffer()));
    const meta=await pdf.getMetadata();const kw=(meta&&meta.info&&meta.info.Keywords)||"";
    if(kw.indexOf("LPNLOG2:")!==0)throw new Error("That PDF wasn’t made by this app’s Email PDF button, so the pallet types can’t be read from it.");
    const o=JSON.parse(decodeURIComponent(kw.slice(8)));
    // The hidden data could have been edited, so every value is read as plain text (never an object a spreadsheet would treat as a formula or link).
    const tx=v=>isTxt(v)?String(v).slice(0,2000):"";
    return {date:/^\d{4}-\d{2}-\d{2}$/.test(tx(o.d))?tx(o.d):"",recv:tx(o.r),notes:tx(o.n),expect:tx(o.e),trailer:tx(o.t),sealIn:tx(o.si),sealOut:tx(o.so),
      rows:(Array.isArray(o.rows)?o.rows:[]).filter(r=>Array.isArray(r)&&isTxt(r[0])&&String(r[0]).trim()).map(r=>{const o={lpn:String(r[0]).trim().slice(0,100),type:normT(r[1]),fsdu:!!r[2]};const g=tx(r[3]).replace(/\s+/g," ").trim().slice(0,60);if(g)o.dmg=g;const d=tx(r[4]).replace(/\s+/g," ").trim().slice(0,60);if(d)o.desc=d;if(r[5]===1||r[5]===true)o.ref=true;return o}),unk:unk};
  }
  let g;
  if(name.endsWith(".xlsx")){
    await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());
    if(!wb.worksheets.length)throw new Error("That file has no sheets.");
    g=sheetGrid(wb.worksheets[0]);
  }else{
    const text=await f.text();
    if(/<table/i.test(text)){const doc=new DOMParser().parseFromString(text,"text/html");g=[...doc.querySelectorAll("tr")].map(tr=>[...tr.children].map(c=>c.textContent.trim()))}
    else g=text.split(/\r?\n/).map(l=>l.split(",").map(x=>x.replace(/^"|"$/g,"").trim()));
  }
  let col=-1,start=-1;
  g.forEach((r,i)=>{if(col>=0)return;r.forEach((c,k)=>{if(col<0&&String(c).trim().toUpperCase()==="LPN"){col=k;start=i}})});
  if(col<0)throw new Error("Couldn’t find an LPN column in that file.");
  const rw=[];
  for(let i=start+1;i<g.length;i++){
    const l=String(g[i][col]==null?"":g[i][col]).trim();if(!l||/^Made with /.test(l))break;
    rw.push({lpn:l,type:normT(g[i][col+1]),fsdu:/^y/i.test(String(g[i][col+2]||"").trim())});
  }
  let date="",recv="",notes="",expect="",trailer="",sealIn="",sealOut="";
  g.forEach(r=>r.forEach((c,k)=>{
    const t=String(c).trim().toLowerCase(),nx=String(r[k+1]==null?"":r[k+1]).trim();
    if(t==="date"&&!date&&isoDate(nx))date=isoDate(nx);
    if(t==="received by"&&!recv)recv=nx;
    if(t==="notes"&&!notes)notes=nx;
    if(t==="expected pallets"&&!expect)expect=nx;
    if(t==="trailer number"&&!trailer)trailer=nx;
    // "Damaged pallet" rows in Delivery Details: "LPN: reason", put back on that pallet.
    if(t==="pallet description"){const m=/^(.+?):\s*(.+)$/.exec(nx);if(m){const p=rw.find(z=>z.lpn===m[1].trim());if(p&&!p.desc)p.desc=m[2].replace(/\s+/g," ").trim().slice(0,60)}}
    if(t==="refused pallet"){const m=/^(.+?):/.exec(nx);if(m){const p=rw.find(z=>z.lpn===m[1].trim());if(p)p.ref=true}}
    if(t==="damaged pallet"){const m=/^(.+?):\s*(.+)$/.exec(nx);if(m){const p=rw.find(z=>z.lpn===m[1].trim());if(p&&!p.dmg)p.dmg=m[2].replace(/\s+/g," ").trim().slice(0,60)}}
    if(t==="seal in"&&!sealIn)sealIn=nx;
    if(t==="seal out"&&!sealOut)sealOut=nx;
  }));
  return {date:date,recv:recv,notes:notes,expect:expect,trailer:trailer,sealIn:sealIn,sealOut:sealOut,rows:rw,unk:unk};
}
HELP.history=`<p>Deliveries you save are kept in this browser on this device. Weeks run Sunday to Saturday, and deliveries you saved or imported this week and last week are kept; older ones are removed automatically.<span data-f="refused"> The number of pallets shown for each includes any refused ones.</span> Opening one puts it back in the log so you can change it or export it again. You can also export or email a saved delivery directly, without opening it.</p>
<div class="row" style="margin:10px 0"><button id="histImport">Import an exported log</button><input type="file" id="histFile" accept=".xlsx,.csv,.xls,.pdf,application/pdf" hidden></div>
<div class="bkinfo"><span id="bkNote"></span><button id="histBk">Back up now</button></div>
<div class="msg" id="histMsg" role="status" aria-live="polite"></div>
<div class="histfind" data-f="findLpn"><label for="histFind">Find an LPN</label><input type="search" id="histFind" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="Type or paste part of an LPN"></div>
<div class="msg" id="histFindMsg" role="status" aria-live="polite" data-f="findLpn"></div>
<div id="histRoot"></div>`;
async function histExport(h,mail){
  if(typeof stopPhotos==="function")stopPhotos("stopped");
  const msg=$("histMsg"),sv=Object.assign({rows:rows},getDel());
  msg.textContent="Preparing…";$("dlmsg").textContent="";
  rows=h.rows.map(r=>Object.assign({},r));setDel(h);
  const e=parseInt($("expect").value,10);expAck=isNaN(e)?"":e+":"+rows.length;
  window.__histExporting=true;
  try{
    if(mail)await emailVia($("dl").onclick,"histMsg");else await $("dl").onclick();
  }finally{
    window.__histExporting=false;
    rows=sv.rows;setDel(sv);
  }
  const t=$("dlmsg").textContent;$("dlmsg").textContent="";
  if(msg.textContent==="Preparing…")msg.textContent=t;
}
async function backupNow(msgId){
  try{
    const now=new Date().toISOString();
    try{localStorage.setItem("lpnbackup",now)}catch(e){}
    const data={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^lpn/.test(k)&&k!=="lpndiag"&&k!=="lpnfeedq")data[k]=localStorage.getItem(k)}
    const json=JSON.stringify({app:"lpn-pallet-log",version:1,saved:now,data:data});
    await saveOnly(new TextEncoder().encode(json).buffer,"lpn-backup-"+localToday()+".json","application/json");
    $(msgId).textContent="Backup downloaded.";
    if($("bkNote"))showBackupNote();
    return true;
  }catch(e){$(msgId).textContent="Couldn’t create the backup: "+((e&&e.message)||"error");return false}
}
/* Checks every value in a backup and returns tidied copies, or throws a plain message. Nothing is changed here. */
function checkBackup(d){
  const out={};let pallets=0,saved=0;
  const bad=()=>{throw new Error("That backup file is damaged, so nothing was changed.")};
  const parse=v=>{try{return JSON.parse(v)}catch(e){bad()}};
  Object.keys(d).forEach(k=>{
    const v=d[k];if(!/^lpn[a-z0-9]*$/.test(k)||typeof v!=="string")return;
    if(k==="lpndiag"||k==="lpnfeedq")return; // the problem log and unsent reports belong to this device, never to a backup
    if(k==="lpnlog"){const o=parse(v);if(!o||typeof o!=="object")bad();const r=cleanRows(o.rows);pallets=r.length;out[k]=JSON.stringify(Object.assign(cleanDel(o),{rows:r}))}
    else if(k==="lpnhist"){const h=cleanHist(parse(v));saved=h.length;out[k]=JSON.stringify(h)}
    else if(k==="lpnnames")out[k]=JSON.stringify(cleanNames(parse(v)));
    else if(k==="lpncfg")out[k]=JSON.stringify(cleanCfg(parse(v)));
    else if(k==="lpnpresets"){const p=parse(v),o={};if(p&&typeof p==="object"&&!Array.isArray(p))Object.keys(p).forEach(n=>{if(isTxt(p[n])||Array.isArray(p[n])){const l=normList(p[n]);if(l)o[String(n).slice(0,60)]=l}});out[k]=JSON.stringify(o)}
    else if(k==="lpnlogo"){if(okLogo(v))out[k]=v}
    else if(k==="lpntheme"){const t=parse(v);if(t&&typeof t==="object"&&hexOk(t.bg)&&hexOk(t.ac))out[k]=JSON.stringify(t.follow===true?{bg:t.bg,ac:t.ac,follow:true}:{bg:t.bg,ac:t.ac})}
    else out[k]=v;
  });
  return {data:out,pallets:pallets,saved:saved};
}
/* Problem report: a plain text file with the app version, the device, the current state and the problem log. */
async function reportText(){
  let ent=[];try{ent=JSON.parse(localStorage.getItem("lpndiag")||"[]");if(!Array.isArray(ent))ent=[]}catch(e){}
  let ver="LPN Pallet Log";try{ver=await appVersion()}catch(e){}
  const man=$("cmpNums").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),lg=$("cmpLogNums").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const st=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  const L=["LPN Pallet Log problem report","Made: "+new Date().toString(),"App: "+ver,"Browser: "+navigator.userAgent,
    "Screen: "+screen.width+"×"+screen.height+" (window "+innerWidth+"×"+innerHeight+", pixel ratio "+(window.devicePixelRatio||1)+")",
    "Installed as an app: "+(st?"yes":"no")+" · Online: "+(navigator.onLine?"yes":"no")+" · Service worker: "+(navigator.serviceWorker&&navigator.serviceWorker.controller?"active":"none"),
    "","Current state","Pallets in log: "+rows.length+" · Delivery date: "+$("date").value+" · Expected: "+($("expect").value||"-"),
    "Manifest check prefixes: "+(getPfx().join(", ")||"(none: any 1 to 3 letters)"),
    "Manifest numbers ("+man.length+"): "+man.join(" "),"Log numbers in the Manifest check ("+lg.length+"): "+lg.join(" "),
    "Manifest message: "+($("cmpMsg").textContent||"-"),"","Recent events (oldest first, "+ent.length+")"];
  ent.forEach(x=>{if(x&&typeof x==="object")L.push(String(x.t||"")+"  "+String(x.k||"")+"  "+String(x.m||"").slice(0,300))});
  return L.join("\n")+"\n";
}
async function downloadReport(){
  try{await saveOnly(new TextEncoder().encode(await reportText()).buffer,"lpn-problem-report-"+localToday()+".txt","text/plain");$("diagMsg").textContent="Problem report downloaded. Send it along with what happened."}
  catch(e){$("diagMsg").textContent="Couldn’t make the problem report: "+((e&&e.message)||"error")}
}
/* ---- Report a problem or idea ----
   Sent to the feedback Worker (tools/feedback-worker), which makes an issue in a private GitHub repo. Reports that
   can't be sent (no signal, server busy) wait in lpnfeedq on this phone, up to 5, and go when back online. */
let FEEDBACK_URL="https://lpn-feedback.jamie9904.workers.dev/report"; // the feedback Worker (tools/feedback-worker)
let fbPhotoData=null;
const fbQueue=()=>{try{const q=JSON.parse(localStorage.getItem("lpnfeedq")||"[]");return Array.isArray(q)?q.filter(x=>x&&typeof x==="object"):[]}catch(e){return[]}};
// The waiting list is kept small (5 reports, about 300 KB, no photos) so it can never crowd out the log's own saving.
const fbSave=q=>{try{const s=JSON.stringify(q);if(q.length>5||s.length>300000)return false;if(q.length)localStorage.setItem("lpnfeedq",s);else localStorage.removeItem("lpnfeedq");return true}catch(e){return false}};
async function fbPost(item){
  let r;try{r=await fetch(FEEDBACK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item)})}
  catch(e){throw Object.assign(new Error("no connection"),{retry:true})}
  let j={};try{j=await r.json()}catch(e){}
  if(r.ok&&j&&j.ok)return j;
  throw Object.assign(new Error(String((j&&j.error)||"The report couldn’t be sent (HTTP "+r.status+").").slice(0,300)),{retry:r.status>=500||r.status===429});
}
let fbBusy=false;
async function fbFlush(){
  if(!FEEDBACK_URL||fbBusy||!navigator.onLine||!feat("report"))return 0; // Report switched off: nothing is sent
  fbBusy=true;let sent=0;
  // The list is read again before each change, so a report saved meanwhile (from Send) is never lost.
  const drop=id=>fbSave(fbQueue().filter(x=>x.id!==id));
  try{for(let item=fbQueue()[0];item;item=fbQueue()[0]){
      const {id,...body}=item;
      try{await fbPost(body);drop(id);sent++}
      catch(e){if(e.retry)break;diag("feedback","A saved report was refused and removed: "+e.message);drop(id)}}
  }finally{fbBusy=false}
  if(sent)diag("feedback","Sent "+sent+" saved report"+(sent===1?"":"s"));
  return sent;
}
window.addEventListener("online",()=>{fbFlush()});
setTimeout(()=>{fbFlush()},4000);
/* A photo is made smaller before sending: at most 1600 px along its long side, as a JPEG. */
async function fbShrink(f){
  const b=await createImageBitmap(f),sc=Math.min(1,1600/Math.max(b.width,b.height));
  const c=document.createElement("canvas");c.width=Math.round(b.width*sc);c.height=Math.round(b.height*sc);
  c.getContext("2d").drawImage(b,0,0,c.width,c.height);if(b.close)b.close();
  let d=c.toDataURL("image/jpeg",.8);if(d.length>1900000)d=c.toDataURL("image/jpeg",.6);
  c.width=c.height=0;return d;
}
/* The report form is a box in the middle of the screen, opened from the Report button at the top, Settings or the
   Guide. It can open over a panel: the panel is set aside while it's open, and focus goes back where it came from. */
let fbOpener=null,fbPhotoJob=0;
function openFeedback(opts){
  if(!feat("report"))return;
  if(!$("fbBox").hidden)return;
  opts=opts||{};
  if(opts.kind){const r=document.querySelector('input[name="fbKind"][value="'+(opts.kind==="idea"?"idea":"problem")+'"]');if(r)r.checked=true}
  // A suggested question goes in as the box's hint, not as text, so a report can't be sent without the person's own words.
  $("fbText").placeholder=opts.hint||"";
  // The name typed last time is filled in again (kept on this phone, and in its backups).
  if(!$("fbName").value){try{$("fbName").value=String(localStorage.getItem("lpnfbname")||"").slice(0,60)}catch(e){}}
  if(opts.photo){
    // The photo is made smaller first; Send waits for it, and a box closed meanwhile doesn't keep it.
    const mine=++fbPhotoJob;$("fbSend").disabled=true;fbShowPhoto("Adding "+(opts.photoName||"the photo").toLowerCase()+"…");
    fbShrink(opts.photo).then(d=>{if(mine!==fbPhotoJob||$("fbBox").hidden)return;fbPhotoData=d;fbShowPhoto((opts.photoName||"Photo")+" attached ("+Math.round(d.length*0.75/1024)+" KB)")})
      .catch(()=>{if(mine===fbPhotoJob){fbShowPhoto(fbPhotoData?"Photo added":"");$("fbMsg").textContent="That photo couldn’t be added. You can still send the report, or add it with Add a photo."}})
      .finally(()=>{if(mine===fbPhotoJob)$("fbSend").disabled=false});
  }
  fbOpener=document.activeElement;
  $("fbShade").hidden=false;$("fbBox").hidden=false;
  pageInert(true);if($("panel"))$("panel").inert=true;if($("instBox"))$("instBox").inert=true;
  const waiting=fbQueue().length;$("fbMsg").textContent=waiting?waiting+" report"+(waiting===1?" is":"s are")+" waiting to be sent when you’re back online.":"";
  setTimeout(()=>$("fbText").focus(),0);
}
function closeFeedback(){
  if($("fbBox").hidden)return;
  fbPhotoJob++;$("fbSend").disabled=false;$("fbText").placeholder="";
  $("fbShade").hidden=true;$("fbBox").hidden=true;
  if($("panel"))$("panel").inert=false;if($("instBox"))$("instBox").inert=false;
  if($("panel").hidden&&$("instBox").hidden)pageInert(false);
  const o=fbOpener;fbOpener=null;if(o&&o.focus&&document.contains(o))o.focus();
}
function fbShowPhoto(name){$("fbPhotoName").textContent=name||"";$("fbPhotoRm").hidden=!name;$("fbPhotoBtn").textContent=name?"Change photo":"Add a photo"}
function initFeedback(){
  $("btnReport").onclick=openFeedback;$("fbClose").onclick=closeFeedback;$("fbShade").onclick=closeFeedback;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fbBox").hidden){e.stopImmediatePropagation();closeFeedback()}},true);
  const msg=t=>{$("fbMsg").textContent=t};
  const showPhoto=fbShowPhoto;
  showPhoto(fbPhotoData?"Photo added":"");
  $("fbPhotoBtn").onclick=()=>{$("fbPhoto").value="";$("fbPhoto").click()};
  $("fbPhotoRm").onclick=()=>{fbPhotoData=null;showPhoto("")};
  $("fbPhoto").onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
    try{fbPhotoData=await fbShrink(f);showPhoto("Photo added ("+Math.round(fbPhotoData.length*0.75/1024)+" KB)")}catch(err){fbPhotoData=null;showPhoto("");msg("That photo couldn’t be read.")}};
  $("fbSend").onclick=async()=>{
    const text=$("fbText").value.trim();
    if(!text){msg("Write what happened first.");$("fbText").focus();return}
    if(!FEEDBACK_URL){msg("Reporting isn’t set up yet. Use Download problem report below and send the file to Jamie instead.");return}
    const kind=(document.querySelector('input[name="fbKind"]:checked')||{}).value==="idea"?"idea":"problem";
    let app="LPN Pallet Log";try{app=await appVersion()}catch(e){}
    const name=$("fbName").value.replace(/\s+/g," ").trim().slice(0,60);
    try{if(name)localStorage.setItem("lpnfbname",name);else localStorage.removeItem("lpnfbname")}catch(e){}
    const item={kind,text,app,name:name||undefined,report:$("fbInc").checked?await reportText():"",photo:fbPhotoData||undefined};
    $("fbSend").disabled=true;msg("Sending…");
    const done=()=>{$("fbText").value="";fbPhotoData=null;showPhoto("")};
    try{const j=await fbPost(item);done();diag("feedback","Sent a "+kind+" report (issue "+j.issue+")");msg("Sent. Thank you!");setTimeout(()=>{if($("fbMsg").textContent==="Sent. Thank you!")closeFeedback()},1500)}
    catch(e){
      if(e.retry){
        const q=fbQueue();let note="";
        if(item.photo){delete item.photo;note=" Photos can’t be kept for later, so send the photo again when you have signal if it matters."}
        if(item.report&&item.report.length>60000)item.report=item.report.slice(0,60000);
        item.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        q.push(item);
        if(fbSave(q)){done();diag("feedback","Saved a "+kind+" report to send later");msg("No signal or the server is busy: saved on this phone, and it will be sent when you’re back online."+note)}
        else msg("No signal, and there’s no room to keep more reports on this phone. Try again when you have signal, or use Download problem report below.");
      }else msg(e.message);
    }finally{$("fbSend").disabled=false}
  };
}
initFeedback();
function showBackupNote(){
  const el=$("bkNote");if(!el)return;
  let t="";try{t=localStorage.getItem("lpnbackup")||""}catch(e){}
  const d=t?new Date(t):null;
  if(!d||isNaN(d)){el.textContent="Not backed up on this device yet. Saved deliveries are only kept in this browser, so download a backup now and then.";el.className="old";return}
  const days=Math.floor((Date.now()-d.getTime())/86400000);
  el.textContent="Last backed up: "+ukDate(localDateStr(d))+" at "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+(days>=1?" ("+days+(days===1?" day":" days")+" ago)":" (today)")+".";
  el.className=days>=7?"old":"";
}
function localDateStr(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function initHistory(){
  pruneHist();
  showBackupNote();
  $("histBk").onclick=()=>backupNow("histMsg");
  const root=$("histRoot");root.innerHTML="";
  if(!hist.length){const p=document.createElement("p");p.className="empty";p.textContent="No saved deliveries from the last two weeks. Use Start new delivery to save the current log, or import an exported log.";root.appendChild(p)}
  hist.forEach(h=>{
    const d=document.createElement("div");d.className="hist";
    const hd=document.createElement("div");hd.className="hd";hd.textContent=(ukDate(h.date)||"No date")+", "+h.rows.length+(h.rows.length===1?" pallet":" pallets");
    const sb=document.createElement("div");sb.className="sb";
    let when="";try{when=new Date(h.saved).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch(e){}
    const ht=typeCounts(h.rows),hc=ht.c;
    const tt=document.createElement("div");tt.className="sb";tt.textContent="BB "+hc.BB+", FMCG "+hc.FMCG+", FPP "+hc.FPP+", Mixed "+hc.Mixed+", FSDU "+ht.fsdu+(ht.refused?", refused "+ht.refused:"");
    sb.textContent=(h.recv?"Received by "+h.recv+". ":"")+"Saved "+when+".";
    const ts=[h.trailer?"Trailer "+h.trailer:"",h.sealIn?"Seal in "+h.sealIn:"",h.sealOut?"Seal out "+h.sealOut:""].filter(Boolean).join(", ");
    if(ts)sb.textContent+=" "+ts+".";
    const r=document.createElement("div");r.className="row";
    const o=document.createElement("button");o.className="p";o.textContent="Open";o.setAttribute("aria-label","Open the delivery of "+(ukDate(h.date)||"this date"));o.onclick=()=>openHist(h.id);
    const xl=document.createElement("button");xl.textContent="Excel";xl.setAttribute("aria-label","Download Excel for "+(ukDate(h.date)||"this delivery"));xl.onclick=()=>histExport(h,false);
    const em=document.createElement("button");em.textContent="Email PDF";em.setAttribute("aria-label","Email PDF of "+(ukDate(h.date)||"this delivery"));em.onclick=()=>histExport(h,true);
    const x=document.createElement("button");x.className="d";x.textContent="Delete";x.setAttribute("aria-label","Delete the delivery of "+(ukDate(h.date)||"this date"));
    x.onclick=()=>{
      const at=Math.max(0,hist.findIndex(z=>z.id===h.id));
      hist=hist.filter(z=>z.id!==h.id);saveHist();
      delete d._h;d.hidden=false;
      d.innerHTML="";d.className="hist";
      const t=document.createElement("span");t.textContent="Deleted. ";
      const u=document.createElement("button");u.textContent="Undo";u.className="p";
      u.onclick=()=>{hist.splice(Math.min(at,hist.length),0,h);saveHist();initHistory()};
      const row=document.createElement("div");row.className="row";row.style.alignItems="center";row.append(t,u);d.appendChild(row);
      d.setAttribute("role","status");
    };
    const fm=document.createElement("div");fm.className="sb hitl";fm.hidden=true;
    r.append(o,xl,em,x);d.append(hd,tt,sb,fm,r);d._h=h;root.appendChild(d);
  });
  if($("histFind")){$("histFind").oninput=histFilter;histFilter();testNote("findLpn",document.querySelector(".histfind"),"afterend")}
  $("histImport").onclick=()=>{$("histFile").value="";$("histFile").click()};
  $("histFile").onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    $("histMsg").textContent="Reading "+f.name+"…";
    try{
      const r=await parseExported(f);
      if(!r.rows.length)throw new Error("No pallets were found in that file.");
      pushHist({saved:new Date().toISOString(),date:r.date,recv:r.recv,notes:r.notes,expect:r.expect,trailer:r.trailer,sealIn:r.sealIn,sealOut:r.sealOut,rows:r.rows});
      const unk=r.unk?" "+r.unk+" had a pallet type that couldn’t be read, so they were set to Mixed.":"";
      initHistory();
      const hm=$("histMsg");
      // Kept by the day it was imported, however old its delivery date (see pruneHist).
      hm.textContent="Imported "+r.rows.length+" pallet"+(r.rows.length===1?"":"s")+"."+unk+" Tap Open to use it.";
    }catch(err){$("histMsg").textContent=(err&&err.message)||"Couldn’t read that file."}
  };
}
/* Find an LPN: shows only the saved deliveries that hold it (3 or more letters or numbers, any part of the LPN). */
function histFilter(){
  const inp=$("histFind"),msg=$("histFindMsg");if(!inp||!msg)return;
  const q=norm(inp.value),cards=[...$("histRoot").children].filter(c=>c._h);
  let n=0;
  cards.forEach(c=>{
    const fm=c.querySelector(".hitl");if(!fm)return;
    if(q.length<3){c.hidden=false;fm.hidden=true;return}
    const hit=c._h.rows.filter(z=>norm(z.lpn).includes(q));
    c.hidden=!hit.length;fm.hidden=!hit.length;
    if(hit.length){n++;fm.textContent="Found: "+hit.slice(0,3).map(z=>z.lpn+" ("+z.type+")").join(", ")+(hit.length>3?" and "+(hit.length-3)+" more":"")}
  });
  if(q.length<3){msg.textContent=q?"Type at least 3 letters or numbers.":"";return}
  const inLog=rows.some(z=>norm(z.lpn).includes(q))?" It is also in the current log.":"";
  msg.textContent=(n?"Found in "+n+(n===1?" saved delivery.":" saved deliveries."):"Not in any saved delivery from the last two weeks.")+inLog;
}
$("newDel").onclick=newDelivery;
$("histBtn").onclick=()=>openHelp("history","Saved deliveries");
/* Share this app: the phone's share menu, or copy the link. */
async function shareApp(){
  const url="https://jamie9904.github.io/",m=$("shareMsg");
  if(navigator.share){try{await navigator.share({title:"LPN Pallet Log",text:"LPN Pallet Log: the goods-in pallet log app.",url:url});m.textContent="";return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(url);m.textContent="Link copied. Paste it into a message or email.";return}catch(e){}
  m.textContent="Sharing isn’t available here. Send them this link: "+url;
}
function initSettings(){
  if($("shareApp")){$("shareApp").onclick=shareApp;testNote("shareApp",$("shareApp").parentElement,"afterend")}
  $("setLogo").onclick=()=>$("logoBtn").click();$("setLogoRm").onclick=()=>$("logoRm").click();showLogo();
  applyTheme();
  $("bkDl").onclick=()=>backupNow("bkMsg");
  $("diagDl").onclick=downloadReport;
  $("diagClear").onclick=()=>{try{localStorage.removeItem("lpndiag")}catch(e){}$("diagMsg").textContent="Problem log cleared."};
  $("bkUp").onclick=()=>{$("bkFile").value="";$("bkFile").click()};
  let pendingBk=null;
  $("bkFile").onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    pendingBk=null;$("bkAsk").hidden=true;
    try{
      let o;try{o=JSON.parse(await f.text())}catch(x){o=null}
      if(!o||o.app!=="lpn-pallet-log"||!o.data||typeof o.data!=="object")throw new Error("That isn’t a backup from this app.");
      const b=checkBackup(o.data);pendingBk=b.data;
      $("bkMsg").textContent="This backup has a log of "+b.pallets+" pallet"+(b.pallets===1?"":"s")+" and "+b.saved+" saved deliver"+(b.saved===1?"y":"ies")+". Restoring it replaces everything in this browser. A copy of your current data downloads first.";
      $("bkAsk").hidden=false;
    }catch(err){$("bkMsg").textContent=(err&&err.message)||"Couldn’t read that backup."}
  };
  $("bkNo").onclick=()=>{pendingBk=null;$("bkAsk").hidden=true;$("bkMsg").textContent="Nothing was changed."};
  $("bkGo").onclick=async()=>{
    if(!pendingBk)return;const data=pendingBk;pendingBk=null;$("bkAsk").hidden=true;
    if(!await backupNow("bkMsg")){$("bkMsg").textContent+=" Your data wasn’t replaced, because the copy of it couldn’t be saved first.";return}
    const before={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^lpn/.test(k)&&k!=="lpndiag"&&k!=="lpnfeedq")before[k]=localStorage.getItem(k)}
    diag("backup","Restoring a backup");
    try{
      Object.keys(before).forEach(k=>localStorage.removeItem(k));
      Object.keys(data).forEach(k=>localStorage.setItem(k,data[k]));
    }catch(err){
      // Not enough room (or storage blocked): put everything back as it was.
      try{Object.keys(data).forEach(k=>localStorage.removeItem(k));Object.keys(before).forEach(k=>localStorage.setItem(k,before[k]))}catch(x){}
      $("bkMsg").textContent="Couldn’t restore that backup because this browser ran out of storage space, so nothing was changed.";return;
    }
    // No automatic reload: on phones the copy of the old data may still be waiting to be saved (iPhone asks first).
    undoClear(); // an undo now would write the old data over the restored backup
    $("bkMsg").textContent="Backup restored. Make sure the copy of your previous data has saved, then reload the app to see the restored data.";
    $("bkDone").hidden=false;
  };
  $("bkReload").onclick=()=>location.reload();
  $("setForget").onclick=()=>{names=[];saveNames();drawNames();$("setForget").textContent="Names forgotten"};
  $("setDef").value=cfg.defType;$("setDef").onchange=()=>{cfg.defType=$("setDef").value;saveCfg();$("type").value=cfg.defType;syncType()};
  $("setSite").value=cfg.site||"";$("setSite").onchange=()=>{cfg.site=$("setSite").value.replace(/\s+/g," ").trim().slice(0,40);$("setSite").value=cfg.site;saveCfg()};
  $("setAwake").checked=cfg.awake;$("setAwake").onchange=()=>{cfg.awake=$("setAwake").checked;saveCfg();if(typeof syncAwake==="function")syncAwake()};
  $("setVib").checked=cfg.vibrate;$("setVib").onchange=()=>{cfg.vibrate=$("setVib").checked;saveCfg();if(cfg.vibrate)sfx("ok")};
  $("setConf").checked=cfg.confirmScan;$("setConf").onchange=()=>{cfg.confirmScan=$("setConf").checked;saveCfg()};
  $("setKeep").checked=cfg.keepType;$("setKeep").onchange=()=>{cfg.keepType=$("setKeep").checked;saveCfg()};
  $("setCheck").checked=cfg.check;$("setCheck").onchange=()=>{cfg.check=$("setCheck").checked;saveCfg();if(!cfg.check){if(typeof stopPhotos==="function")stopPhotos("stopped");hideCheck()}};
  $("setSound").checked=cfg.sound;$("setSound").onchange=()=>{cfg.sound=$("setSound").checked;saveCfg();if(cfg.sound)sfx("ok")};
  $("setDate").value=cfg.dateFmt;$("setDate").onchange=()=>{cfg.dateFmt=$("setDate").value;saveCfg();showDate();updateDel()};
  $("setSize").value=cfg.size;$("setSize").onchange=()=>{cfg.size=$("setSize").value;saveCfg();applyCfg()};
  scanTestSetup();
  $("setMerge").checked=mergeLog;
  $("setMerge").onchange=()=>{mergeLog=$("setMerge").checked;try{localStorage.setItem("lpnmergelog",mergeLog?"1":"0")}catch(e){}};
  // The boxes show the colours in use. Choosing your own colours turns Follow phone off.
  const sync=()=>{const T=themeNow();$("setBgPick").value=hexNorm(T.bg);$("setAcPick").value=hexNorm(T.ac);$("setBgHex").value=hexNorm(T.bg);$("setAcHex").value=hexNorm(T.ac);$("setFollow").checked=!!theme.follow};
  window.themeSync=()=>{if($("setFollow"))sync()};
  sync();
  const own=()=>{if(theme.follow){const T=themeNow();theme={bg:T.bg,ac:T.ac};$("setFollow").checked=false}};
  $("setFollow").onchange=()=>{
    if($("setFollow").checked)theme={bg:hexNorm(theme.bg),ac:hexNorm(theme.ac),follow:true};else own();
    sync();applyTheme();saveTheme();
    $("setMsg").textContent=theme.follow?"Colours now follow the phone’s light or dark mode.":"";
  };
  const pick=(id,key,hexId)=>{$(id).oninput=()=>{own();theme[key]=$(id).value;$(hexId).value=hexNorm(theme[key]);$("setMsg").textContent="";applyTheme();saveTheme()}};
  pick("setBgPick","bg","setBgHex");pick("setAcPick","ac","setAcHex");
  const typed=(hexId,key,pickId)=>{$(hexId).oninput=()=>{
    const v=$(hexId).value;
    if(hexOk(v)){own();theme[key]=hexNorm(v);$(pickId).value=theme[key];$("setMsg").textContent="";$(hexId).style.borderColor="";applyTheme();saveTheme()}
    else{$("setMsg").textContent="Enter a hex code with 3 or 6 digits, for example #ff8a2a.";$(hexId).style.borderColor="var(--dg)"}
  };$(hexId).onblur=()=>{$(hexId).value=hexNorm(themeNow()[key]);$(hexId).style.borderColor="";$("setMsg").textContent=""}};
  typed("setBgHex","bg","setBgPick");typed("setAcHex","ac","setAcPick");
  const q=$("setQuick");q.innerHTML="";
  THEME_QUICK.forEach(t=>{
    const b=document.createElement("button");b.type="button";b.className="sw";
    b.innerHTML='<span class="chip" style="background:'+t[1]+'"><i style="background:'+t[2]+'"></i></span>'+t[0];
    b.onclick=()=>{theme={bg:t[1],ac:t[2]};sync();applyTheme();saveTheme()};
    q.appendChild(b);
  });
  $("setReset").onclick=()=>{theme=Object.assign({},THEME_DEFAULT);sync();applyTheme();try{localStorage.removeItem("lpntheme")}catch(e){}};
}
$("btnGuide").onclick=()=>openHelp("guide","How to use this app");
$("btnLog").onclick=()=>openHelp("log","Changelog");
$("footLog").onclick=()=>openHelp("log","Changelog");
{const vm=HELP.log.match(/<h3>(v\d+\.\d+)/);$("verText").textContent="LPN Pallet Log "+(vm?vm[1]:"")+" · Made by Jamie ·"}
$("btnSet").onclick=()=>openHelp("settings","Settings");
$("panelClose").onclick=closeHelp;$("shade").onclick=closeHelp;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeHelp()});
/* ---- install pop-up ---- */
let deferredInstall=null;
function openInstall(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const a=$("instAnd"),b=$("instIos"),par=a.parentNode;
  if(ios)par.insertBefore(b,a);else par.insertBefore(a,b);
  $("instShade").hidden=false;$("instBox").hidden=false;$("instBox").scrollTop=0;
  dlgOpen($("instBox").querySelector("button:not([hidden])"));
}
function closeInstall(){const was=!$("instBox").hidden;$("instShade").hidden=true;$("instBox").hidden=true;if(was)dlgClose()}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("instNow").hidden=false});
$("instNow").onclick=async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();
  try{await deferredInstall.userChoice}catch(e){}
  deferredInstall=null;$("instNow").hidden=true;closeInstall();
};
$("instClose").onclick=closeInstall;$("instShade").onclick=closeInstall;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeInstall()});
$("panelBody").addEventListener("click",e=>{if(e.target&&(e.target.id==="fbGuide"||e.target.id==="fbOpenSet")){openFeedback();return}if(e.target&&e.target.id==="showInstall"){closeHelp();openInstall()}const a=e.target&&e.target.closest&&e.target.closest("a[data-g]");if(a){e.preventDefault();const t=document.getElementById(a.dataset.g);if(t)t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})}});
(function(){
  const installed=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  let seen=false;try{seen=!!localStorage.getItem("lpninstallshown")}catch(e){}
  if(installed||seen)return;
  try{localStorage.setItem("lpninstallshown","1")}catch(e){}
  setTimeout(openInstall,700);
})();
/* Switched-off features are hidden and "in testing" notes added, from config.js (see core.js). */
function applySite(){
  const hide=id=>{const e=$(id);if(e)e.hidden=true};
  if(!feat("report"))hide("btnReport");
  if(!feat("manifestCheck"))hide("cmpCard");
  if(!feat("manifestPhotos")){
    const g=$("cmpPhotoBtn").closest(".grow"),l=g&&g.querySelector("label");if(l)l.textContent="2. Manifest PDFs";
    ["cmpPhotoBtn","cmpLogPhotoBtn","pfxBox"].forEach(hide);
  }
  if(!feat("liveScan"))hide("scan");
  if(!feat("scanByPhoto"))hide("photo");
  if(!feat("photoUpload"))hide("upload");
  { // the tip names only photo buttons that are switched on
    const alt=[feat("scanByPhoto")&&"Scan by photo",feat("photoUpload")&&"Upload photo"].filter(Boolean);
    if(feat("liveScan")&&alt.length)$("scanTip").textContent="Tip: if Live scan doesn’t work, try "+alt.join(" or ")+" instead.";else hide("scanTip");
  }
  if(!feat("noLpn"))hide("noLpn");
  if(!feat("liveScan")&&!feat("scanByPhoto")&&!feat("photoUpload")&&!feat("noLpn")){hide("scanBtn");hide("btnrow")}
  testNote("report",$("fbBox").querySelector("p"),"afterend");
  testNote("manifestCheck",$("cmpBody"),"afterbegin");
  testNote("manifestPhotos",$("cmpPhotoBtn").closest(".grow"),"beforeend");
  // Live scan, Scan by photo and Upload photo notes sit in the camera box, shown by scan.js for the one in use.
  [testNote("liveScan",$("scanbox"),"afterbegin"),testNote("scanByPhoto",$("scanbox"),"afterbegin"),testNote("photoUpload",$("scanbox"),"afterbegin")].forEach(n=>{if(n)n.hidden=true});
  const tn=testNote("torch",$("scanbox"));if(tn)tn.hidden=true;
}
applySite();
/* A card at the top of the page: on the first visit, an offer of the demo video; after an update, what's new.
   lpnseenbuild remembers the build last opened on this phone; lpnwelcome that the welcome was answered. */
async function hello(){
  const box=$("hello"),txt=$("helloTxt"),btns=$("helloBtns");
  let b="";try{b=await appBuildP}catch(e){}
  // The welcome stays until it is answered: marked "ask" on the very first visit, "1" once answered.
  let seen="",welcome="";try{seen=localStorage.getItem("lpnseenbuild")||"";welcome=localStorage.getItem("lpnwelcome")||"";if(FIRST_OPEN&&!welcome){welcome="ask";localStorage.setItem("lpnwelcome","ask")}}catch(e){}
  const close=()=>{box.hidden=true;btns.innerHTML=""};
  const btn=(t,cls,fn)=>{const x=document.createElement("button");x.type="button";x.textContent=t;if(cls)x.className=cls;x.onclick=()=>{$("btnGuide").focus();close();fn&&fn()};/* focus moves somewhere that stays before the card goes */btns.appendChild(x);return x};
  if(welcome==="ask"&&feat("welcome")){
    txt.textContent="New here? The 47-second demo video shows how the app works.";
    const done=()=>{try{localStorage.setItem("lpnwelcome","1")}catch(e){}};
    btn("Watch the demo","p",()=>{done();openHelp("guide","How to use this app");setTimeout(()=>{const p=$("demoPlay");if(p)p.click()},100)});
    btn("No thanks","",done);
    box.hidden=false;
  }else if(b&&seen&&+seen<+b&&feat("whatsNew")){
    // The newest changelog line, as plain text.
    const d=document.createElement("div");d.innerHTML=(siteHtml(HELP.log).match(/<li>([\s\S]*?)<\/li>/)||[])[1]||"";
    let t=d.textContent.replace(/\s+/g," ").trim();if(t.length>170)t=t.slice(0,170).replace(/\s+\S*$/,"")+"…";
    txt.textContent="Updated. "+t;
    btn("See what’s new","p",()=>openHelp("log","Changelog"));
    btn("Got it","");
    box.hidden=false;
  }
  if(b){try{localStorage.setItem("lpnseenbuild",b)}catch(e){}}
}
hello();
/* A delivery from an earlier day that has pallets but was never exported or emailed: say so when the app opens, so it
   isn't forgotten at the end of a shift. "Not now" hides it for that delivery until it changes. */
function unexpCheck(){
  const box=$("unexp");if(!box)return;box.hidden=true;
  if(!feat("exportReminder")||!rows.length||(exported&&exported.sig===logSig()))return;
  const d=$("date").value;if(!d||d>=localToday())return;
  let skip="";try{skip=localStorage.getItem("lpnunexp")||""}catch(e){}
  if(skip===logSig())return;
  $("unexpTxt").textContent="The delivery from "+ukDate(d)+" ("+rows.length+" pallet"+(rows.length===1?"":"s")+") hasn’t been exported or emailed yet.";
  $("unexpGo").onclick=()=>{box.hidden=true;const b=$("expBtn");b.scrollIntoView({block:"center"});b.focus({preventScroll:true});if($("expMenu").hidden)b.click()};
  $("unexpNo").onclick=()=>{box.hidden=true;try{localStorage.setItem("lpnunexp",logSig())}catch(e){};const m=document.querySelector("main");m.setAttribute("tabindex","-1");m.focus({preventScroll:true})};
  const old=box.querySelector(".testnote");if(old)old.remove();
  testNote("exportReminder",box.querySelector("p"),"afterend");
  box.hidden=false;
}
if("serviceWorker" in navigator){
  const hadSW=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(hadSW)$("updBar").hidden=false});
  $("updBtn").onclick=()=>location.reload();
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").then(reg=>{
    const chk=()=>{reg.update().catch(()=>{})};
    chk();document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")chk()});
  }).catch(()=>{}));
}
setTimeout(()=>{loadExcel().catch(()=>{});loadJsPdf().catch(()=>{})},2500);
load();render();$("type").value=cfg.defType;syncType();
unexpCheck(); // after the saved log has loaded

/* ---- date reminder, remembered names, offline notice ---- */
let dateSkip="";
function checkDate(noReset){
  const t=localToday(),d=$("date").value,bar=$("dateBar");
  if(!d||d===t||(!rows.length)){
    if(!noReset&&!rows.length&&d!==t){$("date").value=t;save()}
    bar.hidden=true;return;
  }
  if(dateSkip===d+"|"+t){bar.hidden=true;return}
  $("dateTxt").textContent="This log is dated "+ukDate(d)+", but today is "+ukDate(t)+".";
  bar.hidden=false;
}
$("dateFix").onclick=()=>{$("date").value=localToday();save();$("dateBar").hidden=true;unexpCheck()};
$("dateKeep").onclick=()=>{dateSkip=$("date").value+"|"+localToday();$("dateBar").hidden=true};
$("date").addEventListener("change",()=>{dateSkip="";checkDate(true)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDate()});
checkDate();
let names=[];try{names=cleanNames(JSON.parse(localStorage.getItem("lpnnames")||"[]"))}catch(e){names=[]}
const saveNames=()=>{try{localStorage.setItem("lpnnames",JSON.stringify(names))}catch(e){}};
function drawNames(){
  const box=$("recvChips"),cur=($("recv").value||"").trim().toLowerCase();
  box.innerHTML="";
  names.filter(x=>x.toLowerCase()!==cur).forEach(x=>{
    const b=document.createElement("button");b.type="button";b.textContent=x;b.onclick=()=>{$("recv").value=x;save();rememberName();drawNames()};
    box.appendChild(b);
  });
  box.hidden=!box.children.length;
}
function rememberName(){
  const v=($("recv").value||"").trim();if(!v)return;
  names=[v].concat(names.filter(x=>x.toLowerCase()!==v.toLowerCase())).slice(0,6);saveNames();
}
$("recv").addEventListener("change",rememberName);
$("recv").addEventListener("input",drawNames);
drawNames();
function showOffline(){$("offBar").hidden=navigator.onLine!==false}
window.addEventListener("online",()=>{$("offBar").hidden=true});
window.addEventListener("offline",()=>{$("offBar").hidden=false});
$("offBar").hidden=navigator.onLine!==false;

delCollapsed=!!(rows.length&&($("recv").value||"").trim());updateDel();
$("nextNew").onclick=()=>{$("nextBar").hidden=true;newDelivery()};

(function(){
  let t=0;
  const entry=document.querySelector(".card.entry");
  const upd=()=>{t=0;const open=!$("cmpBody").hidden,top=$("cmpCard").getBoundingClientRect().top;
    /* phones only, and never while someone is typing or scanning into the bar */
    const hide=open&&top<innerHeight*0.45&&matchMedia("(max-width:759px)").matches&&!entry.contains(document.activeElement);
    document.body.classList.toggle("cmpfocus",hide);entry.inert=hide;};
  entry.addEventListener("focusin",()=>{if(!t)t=setTimeout(upd,60)});
  addEventListener("scroll",()=>{if(!t)t=setTimeout(upd,60)},{passive:true});
  addEventListener("resize",()=>{if(!t)t=setTimeout(upd,60)});
  $("cmpToggle").addEventListener("click",()=>setTimeout(upd,0));
  upd();
})();
/* show the chosen preset in the closed Prefix presets heading */
function pfxSummary(){
  const sel=$("cmpPreset"),v=($("cmpPfx").value||"").trim();
  const named=sel&&sel.value&&sel.value!=="__custom"&&sel.value!=="__all"&&sel.selectedOptions[0];
  $("pfxSum").textContent="("+(!v?"all prefixes":named?named.textContent:v)+")";
}
["change","input"].forEach(ev=>{$("cmpPreset").addEventListener(ev,()=>setTimeout(pfxSummary,0));$("cmpPfx").addEventListener(ev,pfxSummary)});pfxSummary();
