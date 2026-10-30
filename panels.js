/* ---- help panel ---- */
const HELP={guide:`<h3>1. Quick start</h3>
<ol>
<li><b>Fill in the delivery:</b> date, who received it, and optionally expected pallets, trailer and seals.</li>
<li><b>Add the manifest</b> (optional) in Manifest check, so the log can tick pallets off as you scan.</li>
<li><b>Scan or type each pallet:</b> pick the type, tick FSDU if needed, then Add.</li>
<li><b>Export:</b> Download (Excel), Email PDF or Print from the Export menu.</li>
<li><b>Start new delivery:</b> saves this one to Saved deliveries and clears the page for the next.</li>
</ol>
<h3>2. Set up the delivery</h3>
<p>Enter the <b>Date</b> and who <b>Received</b> the delivery. Names you have used before appear underneath as buttons, so one tap fills them in. <b>Expected pallets</b>, <b>Trailer number</b>, <b>Seal in</b>, <b>Seal out</b> and <b>Delivery notes</b> are optional and appear on the exports.</p>
<p>If the log is dated before today you are asked whether to use today’s date. On a phone, once you start logging, the delivery details fold into one line to save space. Tap it to change them.</p>
<p><b>Logo:</b> set it in <b>Settings</b>. logo.png next to the app is used by default; <b>Change logo</b> uses your own on this device, and <b>Reset to default logo</b> brings the default back.</p>
<h3>3. Log pallets</h3>
<ol>
<li>Tap the pallet type: BB, FMCG, FPP or Mixed. It stays selected for the next pallet unless you change that in Settings.</li>
<li>Tick <b>FSDU</b> if the pallet has one. It clears after each pallet.</li>
<li>Scan or type the LPN and press <b>Add</b> (or Enter).</li>
</ol>
<p>A short “Added” message confirms each pallet, and the bar at the bottom of a phone shows how many are logged. The ↶ button next to the count removes the last pallet (with Undo). If an LPN is already in the log or doesn’t look right, you get a warning with <b>Skip</b> or <b>Add anyway</b>. The warnings can be switched off in Settings.</p>
<p><b>Changing the log:</b> tap an LPN to correct it, change its type or FSDU in the table, or remove it with ✕. An <b>Undo</b> bar appears after removing, editing or Clear all. Search and the type and FSDU filters help find pallets; the totals always cover the whole log, and FSDUs are counted separately from the total.</p>
<h3>4. Scanning barcodes</h3>
<p>On phones, tap <b>Scan</b> next to Add to show the scan options.</p>
<ul>
<li><b>Live scan:</b> opens the camera and adds each barcode it sees. The screen stays on while it runs. It needs camera permission.</li>
<li><b>Scan by photo:</b> take a clear photo of the barcode. Use it if Live scan doesn’t work.</li>
<li><b>Handheld or Bluetooth scanner:</b> tap the LPN box and scan. Not yet tested, so it may not work.</li>
</ul>
<p>Turn on “Ask me to confirm each scanned barcode” in Settings to check each scan before it is logged.</p>
<h3>5. Check against the manifest</h3>
<p>Tap the <b>Manifest check</b> heading to open it.</p>
<ul>
<li><b>Add the manifest:</b> photos or PDFs of the manifest (several at once is fine), or type or paste the numbers. PDFs with selectable text are read exactly; photos and scans are read with text recognition, so check the numbers.</li>
<li><b>Live tracking:</b> while manifest numbers are there, the Pallet log shows how many are found and which are still missing as you scan, and warns about pallets not on the manifest. Tap <b>Show missing</b> for the list, and <b>Use n as expected</b> to copy the manifest count into Expected pallets.</li>
<li><b>On a phone</b>, the pallet entry bar slides out of the way while you work in the Manifest check, and comes back when you scroll up to the log.</li>
<li><b>The log:</b> tap <b>Use current log</b>, pick a saved delivery, or upload an exported spreadsheet, a PDF or a photo of a printed log.</li>
<li><b>Check results:</b> shows Missing (report it), On the log only (book it in) and Matched. Tap <b>Fix</b> to correct a misread number or ✕ to remove it.</li>
<li><b>Export</b> gives the comparison as Excel, Email PDF or Print. ✓ Matched is on both, ✗ MISSING is on the manifest but not the log, ⚠ LOG ONLY is on the log but not the manifest.</li>
</ul>
<p><b>Prefix presets</b> (tap to open, below the two steps) limit which numbers are picked up from photos: choose a preset, edit the list, or leave it blank for any LPN made of 1 to 3 letters then digits. <b>Include a copy of the log</b> in Settings adds the log to the comparison (a tab in the spreadsheet, extra pages in the PDF). Start new delivery clears the manifest numbers.</p>
<h3>6. Export</h3>
<p>The <b>Export</b> menu has <b>Download (Excel)</b>, <b>Email PDF</b> and <b>Print</b>. If an expected pallet count is set and the total doesn’t match, the first try shows a reminder; choose it again to go ahead.</p>
<p>The spreadsheet and PDF have your logo, a title with the delivery details, the numbered pallet list, the totals by type (FSDUs listed separately), and the Delivery Details. They fit A4 portrait with page numbers, and the bottom of each says which version of the app made it. BB is shown as “Brown Box”.</p>
<p><b>Email PDF</b> opens your phone’s share sheet with a PDF attached, as phones can’t share Excel files that way. If it says the file is ready, tap <b>Tap to share</b>. If sharing isn’t possible, the file is saved for you to attach yourself.</p>
<h3>7. Saved deliveries and backups</h3>
<p>After an export the log shows when it was exported and offers to start a new delivery. <b>Start new delivery</b> saves the log and clears the page (with Undo); if the delivery hasn’t been exported since its last change it asks you to export first, and pressing it again goes ahead anyway. <b>Saved deliveries</b> lists this week and last week (weeks start on Sunday): open one, export or email it directly, delete it, or import an exported spreadsheet or app-made PDF.</p>
<p>Everything is stored on this device only. The Saved deliveries list shows when you last backed up; use <b>Back up now</b> there, or Settings, to download a backup, and <b>Restore backup</b> in Settings to bring it back.</p>
<h3>8. Install it on your phone</h3>
<ul>
<li><b>Android (Chrome):</b> open the app’s web address, tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</li>
<li><b>iPhone (Safari):</b> open the web address in Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.</li>
<li><button id="showInstall">Show the install pop-up again</button> You can also open it from the Install section in <b>Settings</b>.</li>
<li>It works offline once opened online. Use Download (Excel), Email PDF and the Manifest check once while online so they are saved too. When a new version is uploaded, tap <b>Refresh</b> on the banner.</li>
</ul>
<h3>9. Settings and good to know</h3>
<ul>
<li><b>Settings</b> has your colours, text size, date format, default pallet type, warnings, sound and vibration.</li>
<li>LPNs are a letter prefix followed by digits, for example RUN000000000.</li>
<li>Always check numbers read from photos before relying on them.</li>
</ul>`,log:`<h3>v3.30 <span class="ver">Current</span></h3>
<ul><li>Exports: long delivery notes and longer LPNs no longer get cut off in the spreadsheets, and every export notes the app version it was made with (at the bottom of the sheet and in the page footer).</li><li>Importing an exported log and loading one in the Manifest check now read spreadsheets the same way, so the version line at the bottom is always skipped.</li><li>Safer PDFs: a PDF opened in the app (a supplier manifest or an exported log) can no longer run hidden code.</li><li>Easier to use: the pallet table scrolls with the page on phones, progress only turns red when something is wrong, one count line when the manifest sets the expected number, the Manifest check starts with its steps (prefix presets tucked away), the logo moved to Settings, the entry bar steps aside in the Manifest check, and bigger tick boxes and header buttons.</li><li>Undo last pallet button on the phone entry bar, “Use n as expected” from the manifest count, an “Exported at” note with a warning before starting a new delivery that hasn’t been exported, and a “Start a new delivery?” prompt after exporting.</li><li>Trailer number, Seal in and Seal out in Delivery, shown on exports and saved deliveries.</li><li>Live manifest tracking: add the manifest numbers first and the Pallet log counts them off as you scan, shows which are still missing and warns about pallets not on the manifest.</li><li>Phone layout: a pallet counter on the entry bar, an “Added” confirmation after each pallet, Delivery folds into one line once you start logging, neater top buttons and a clearer ✕ on each row.</li><li>Smaller tweaks: a reminder when the log is dated before today, tap-to-fill “Received by” names, a check when the total differs from the expected pallets, an FSDU filter, Excel and Email PDF buttons on saved deliveries, a last-backed-up note, and an offline notice.</li><li>Exports: a title band, numbered rows, clearer grid lines, page numbers, gridlines hidden on screen, roomier headers, the logo kept in proportion and much smaller PDFs. The manifest check has the same Export menu as the log.</li><li>Date format setting (dd/mm/yyyy by default), used in exports, lists and the date box.</li><li>Fonts are now part of the app, updates show up straight away, and the tablet layout and field alignment are fixed.</li></ul>
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
  const short=t=>({"Quick start":"Start","Set up the delivery":"Delivery","Log pallets":"Logging","Scanning barcodes":"Scanning","Check against the manifest":"Manifest","Export":"Export","Saved deliveries and backups":"Saved","Install it on your phone":"Install","Settings and good to know":"Settings"})[t]||t;
  return '<nav class="guidetoc" aria-label="Guide sections">'+items.map(x=>'<a href="#g'+x[0]+'" data-g="g'+x[0]+'">'+short(x[1])+'</a>').join("")+'</nav>'+html;
}
function openHelp(k,t){
  $("panelTitle").textContent=t;$("panelBody").innerHTML=k==="guide"?guideToc(HELP.guide):HELP[k];
  $("panel").hidden=false;$("shade").hidden=false;$("panel").scrollTop=0;if(k==="settings")initSettings();if(k==="history")initHistory();
}
function closeHelp(){$("panel").hidden=true;$("shade").hidden=true}
/* ---- settings: custom colours ---- */
const THEME_DEFAULT={bg:"#0c1830",ac:"#ff8a2a"};
const THEME_QUICK=[["Navy and orange","#0c1830","#ff8a2a"],["Sage and teal","#e3e8e4","#2f6f68"],["Charcoal and amber","#1d1f23","#f5b324"],["Light and blue","#eef1f6","#2563eb"]];
let theme=Object.assign({},THEME_DEFAULT);
const hexOk=v=>/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim());
function hexNorm(v){let h=String(v).trim().replace("#","").toLowerCase();if(h.length===3)h=h.split("").map(c=>c+c).join("");return "#"+h}
const toRgb=h=>{h=hexNorm(h);return [1,3,5].map(i=>parseInt(h.substr(i,2),16))};
const toHex=a=>"#"+a.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
const mixC=(a,b,t)=>{const x=toRgb(a),y=toRgb(b);return toHex(x.map((v,i)=>v+(y[i]-v)*t))};
const lumOf=h=>{const c=toRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
function applyTheme(){
  const bg=hexNorm(theme.bg),ac=hexNorm(theme.ac),dark=lumOf(bg)<.3;
  const paper=dark?mixC(bg,"#ffffff",.08):mixC(bg,"#ffffff",.7);
  const v={
    "--bg":bg,"--paper":paper,
    "--ink":dark?mixC(bg,"#ffffff",.92):mixC(bg,"#000000",.85),
    "--mu":dark?mixC(bg,"#ffffff",.62):mixC(bg,"#000000",.55),
    "--rule":dark?mixC(paper,"#ffffff",.1):mixC(paper,"#000000",.12),
    "--line":dark?mixC(paper,"#ffffff",.22):mixC(paper,"#000000",.22),
    "--ac":ac,"--ac2":dark?mixC(ac,"#ffffff",.25):mixC(ac,"#000000",.2),
    "--acs":mixC(paper,ac,.2),"--sel":mixC(paper,ac,.12),
    "--onac":(lumOf(ac)+.05)/.05>1.05/(lumOf(ac)+.05)?"#111111":"#ffffff",
    "--bb":dark?"#dba56c":"#b07d4f","--fm":dark?"#6fa8ff":"#5382b8","--fp":dark?"#a9c95a":"#8a9a3b","--mx":dark?"#c79bf0":"#9a6aa6",
    "--dg":dark?"#ff7b6e":"#b3392f","--wn":dark?"#ffcf8a":"#7a5a1c","--wns":dark?"#3a3020":"#f6ecd2"
  };
  const st=document.documentElement.style;
  Object.keys(v).forEach(k=>st.setProperty(k,v[k]));
  st.colorScheme=dark?"dark":"light";
  const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.setAttribute("content",bg);
  const rt=(a,b)=>{const x=lumOf(a)+.05,y=lumOf(b)+.05;return Math.max(x,y)/Math.min(x,y)};
  const w=document.getElementById("setWarn");
  if(w){const r=Math.min(rt(ac,bg),rt(ac,paper));w.textContent=r<3?"Low contrast: the accent colour is hard to see against this background (ratio "+r.toFixed(1)+", aim for 3 or more). Headings, links and highlights may be hard to read. Try a lighter or darker accent.":""}
}
function saveTheme(){try{localStorage.setItem("lpntheme",JSON.stringify(theme))}catch(e){}}
try{const t=JSON.parse(localStorage.getItem("lpntheme")||"null");if(t&&hexOk(t.bg)&&hexOk(t.ac))theme={bg:hexNorm(t.bg),ac:hexNorm(t.ac)}}catch(e){}
applyTheme();
HELP.settings=`<h3>Colours</h3>
<p>Choose your own background and accent colours. Use the colour picker or type a hex code such as <b>#0c1830</b>. Changes apply straight away and are saved on this device.</p>
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
<label class="chk"><input type="checkbox" id="setConf"><span>Ask me to confirm each scanned barcode before it is added</span></label>
<h3>Display</h3>
<label for="setSize">Text size</label>
<select id="setSize"><option value="1">Normal</option><option value="1.12">Large</option><option value="1.25">Extra large</option></select>
<label for="setDate">Date format</label>
<select id="setDate"><option value="uk">dd/mm/yyyy (UK)</option><option value="us">mm/dd/yyyy (US)</option><option value="iso">yyyy-mm-dd</option></select>
<p class="note">Used in spreadsheets, PDFs and the saved deliveries lists.</p>
<h3>Install</h3>
<p>Add this page to your home screen so it opens like an app.</p>
<div class="row"><button id="showInstall">Show the install pop-up</button></div>
<h3>Backup</h3>
<p>Your log, saved deliveries and settings live in this browser only. Download a backup to keep a copy or move to another device, then restore it there.</p>
<div class="row"><button id="bkDl">Download backup</button><button id="bkUp">Restore backup</button><input type="file" id="bkFile" accept=".json,application/json" hidden></div>
<div class="msg" id="bkMsg" role="status" aria-live="polite"></div>`;
/* ---- saved deliveries ---- */
let hist=[];try{hist=JSON.parse(localStorage.getItem("lpnhist")||"[]")||[]}catch(e){hist=[]}
const saveHist=()=>{try{localStorage.setItem("lpnhist",JSON.stringify(hist))}catch(e){}};
/* Weeks run Sunday to Saturday. History keeps this week and last week only. */
function keepFrom(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()-7);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function pruneHist(){const k=keepFrom(),n=hist.length;hist=hist.filter(h=>{let d=h.date;if(!/^\d{4}-\d{2}-\d{2}$/.test(d||"")){const s=new Date(h.saved);d=isNaN(s)?k:s.getFullYear()+"-"+String(s.getMonth()+1).padStart(2,"0")+"-"+String(s.getDate()).padStart(2,"0")}return d>=k});if(hist.length!==n)saveHist()}
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
  const prev=Object.assign({rows:rows.slice(),man:$("cmpNums").value},getDel());
  pushHist(Object.assign({saved:new Date().toISOString()},getDel(),{rows:prev.rows}));
  const id=hist[0].id;
  rows=[];setDel({recv:prev.recv,date:todayStr()});exported=null;$("cmpNums").value="";$("type").value=cfg.defType;$("type").dataset.t=cfg.defType;
  save();render();
  $("dlmsg").textContent="Saved to history and started a new delivery.";
  showUndo("Saved to history. Started a new delivery.",()=>{hist=hist.filter(h=>h.id!==id);saveHist();rows=prev.rows;setDel(prev);$("cmpNums").value=prev.man||"";save();render();$("dlmsg").textContent=""});
}
function openHist(id){
  const h=hist.find(x=>x.id===id);if(!h)return;
  if(rows.length)pushHist(Object.assign({saved:new Date().toISOString()},getDel(),{rows:rows.slice()}));
  hist=hist.filter(x=>x.id!==id);saveHist();
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
    return {date:o.d||"",recv:o.r||"",notes:o.n||"",expect:o.e||"",trailer:o.t||"",sealIn:o.si||"",sealOut:o.so||"",rows:(o.rows||[]).map(r=>({lpn:String(r[0]),type:normT(r[1]),fsdu:!!r[2]})),unk:unk};
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
    if(t==="seal in"&&!sealIn)sealIn=nx;
    if(t==="seal out"&&!sealOut)sealOut=nx;
  }));
  return {date:date,recv:recv,notes:notes,expect:expect,trailer:trailer,sealIn:sealIn,sealOut:sealOut,rows:rw,unk:unk};
}
HELP.history=`<p>Deliveries you save are kept in this browser on this device. Weeks run Sunday to Saturday, and only this week and last week are kept; older ones are removed automatically. Opening one puts it back in the log so you can change it or export it again. You can also export or email a saved delivery directly, without opening it.</p>
<div class="row" style="margin:10px 0"><button id="histImport">Import an exported log</button><input type="file" id="histFile" accept=".xlsx,.csv,.xls,.pdf,application/pdf" hidden></div>
<div class="bkinfo"><span id="bkNote"></span><button id="histBk">Back up now</button></div>
<div class="msg" id="histMsg" role="status" aria-live="polite"></div>
<div id="histRoot"></div>`;
async function histExport(h,mail){
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
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^lpn/.test(k))data[k]=localStorage.getItem(k)}
    const json=JSON.stringify({app:"lpn-pallet-log",version:1,saved:now,data:data});
    await saveOnly(new TextEncoder().encode(json).buffer,"lpn-backup-"+localToday()+".json","application/json");
    $(msgId).textContent="Backup downloaded.";
    if($("bkNote"))showBackupNote();
  }catch(e){$(msgId).textContent="Couldn’t create the backup: "+((e&&e.message)||"error")}
}
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
    const hc={BB:0,FMCG:0,FPP:0,Mixed:0};h.rows.forEach(z=>{if(hc[z.type]!==undefined)hc[z.type]++});
    const tt=document.createElement("div");tt.className="sb";tt.textContent="BB "+hc.BB+", FMCG "+hc.FMCG+", FPP "+hc.FPP+", Mixed "+hc.Mixed+", FSDU "+h.rows.filter(z=>z.fsdu).length;
    sb.textContent=(h.recv?"Received by "+h.recv+". ":"")+"Saved "+when+".";
    const ts=[h.trailer?"Trailer "+h.trailer:"",h.sealIn?"Seal in "+h.sealIn:"",h.sealOut?"Seal out "+h.sealOut:""].filter(Boolean).join(", ");
    if(ts)sb.textContent+=" "+ts+".";
    const r=document.createElement("div");r.className="row";
    const o=document.createElement("button");o.className="p";o.textContent="Open";o.onclick=()=>openHist(h.id);
    const xl=document.createElement("button");xl.textContent="Excel";xl.setAttribute("aria-label","Download Excel for "+(ukDate(h.date)||"this delivery"));xl.onclick=()=>histExport(h,false);
    const em=document.createElement("button");em.textContent="Email PDF";em.onclick=()=>histExport(h,true);
    const x=document.createElement("button");x.className="d";x.textContent="Delete";
    x.onclick=()=>{
      const at=Math.max(0,hist.findIndex(z=>z.id===h.id));
      hist=hist.filter(z=>z.id!==h.id);saveHist();
      d.innerHTML="";d.className="hist";
      const t=document.createElement("span");t.textContent="Deleted. ";
      const u=document.createElement("button");u.textContent="Undo";u.className="p";
      u.onclick=()=>{hist.splice(Math.min(at,hist.length),0,h);saveHist();initHistory()};
      const row=document.createElement("div");row.className="row";row.style.alignItems="center";row.append(t,u);d.appendChild(row);
      d.setAttribute("role","status");
    };
    r.append(o,xl,em,x);d.append(hd,tt,sb,r);root.appendChild(d);
  });
  $("histImport").onclick=()=>{$("histFile").value="";$("histFile").click()};
  $("histFile").onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    $("histMsg").textContent="Reading "+f.name+"…";
    try{
      const r=await parseExported(f);
      if(!r.rows.length)throw new Error("No pallets were found in that file.");
      const nid=pushHist({saved:new Date().toISOString(),date:r.date,recv:r.recv,notes:r.notes,expect:r.expect,trailer:r.trailer,sealIn:r.sealIn,sealOut:r.sealOut,rows:r.rows});
      const unk=r.unk?" "+r.unk+" had a pallet type that couldn’t be read, so they were set to Mixed.":"";
      initHistory();
      const hm=$("histMsg");
      if(hist.some(h=>h.id===nid)){hm.textContent="Imported "+r.rows.length+" pallets."+unk+" Tap Open to use it."}
      else{
        hm.textContent="Read "+r.rows.length+" pallets"+(r.date?" dated "+ukDate(r.date):"")+", but that is older than last week, so it can’t be kept in Saved deliveries."+unk+" ";
        const b=document.createElement("button");b.className="p";b.textContent="Load it into the log";
        b.onclick=()=>{
          if(rows.length)pushHist(Object.assign({saved:new Date().toISOString()},getDel(),{rows:rows.slice()}));
          rows=r.rows.map(x=>Object.assign({},x));setDel(r);
          save();render();closeHelp();
        };
        hm.appendChild(b);
      }
    }catch(err){$("histMsg").textContent=(err&&err.message)||"Couldn’t read that file."}
  };
}
$("newDel").onclick=newDelivery;
$("histBtn").onclick=()=>openHelp("history","Saved deliveries");
function initSettings(){
  $("setLogo").onclick=()=>$("logoBtn").click();$("setLogoRm").onclick=()=>$("logoRm").click();showLogo();
  applyTheme();
  $("bkDl").onclick=()=>backupNow("bkMsg");
  $("bkUp").onclick=()=>{$("bkFile").value="";$("bkFile").click()};
  $("bkFile").onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    try{
      const o=JSON.parse(await f.text());
      if(!o||o.app!=="lpn-pallet-log"||!o.data||typeof o.data!=="object")throw new Error("That isn’t a backup from this app.");
      const old=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^lpn/.test(k))old.push(k)}
      old.forEach(k=>localStorage.removeItem(k));
      Object.keys(o.data).forEach(k=>{if(/^lpn/.test(k)&&typeof o.data[k]==="string")localStorage.setItem(k,o.data[k])});
      $("bkMsg").textContent="Backup restored. Reloading…";
      setTimeout(()=>location.reload(),700);
    }catch(err){$("bkMsg").textContent=(err&&err.message)||"Couldn’t read that backup."}
  };
  $("setForget").onclick=()=>{names=[];saveNames();drawNames();$("setForget").textContent="Names forgotten"};
  $("setDef").value=cfg.defType;$("setDef").onchange=()=>{cfg.defType=$("setDef").value;saveCfg();$("type").value=cfg.defType;syncType()};
  $("setVib").checked=cfg.vibrate;$("setVib").onchange=()=>{cfg.vibrate=$("setVib").checked;saveCfg();if(cfg.vibrate)sfx("ok")};
  $("setConf").checked=cfg.confirmScan;$("setConf").onchange=()=>{cfg.confirmScan=$("setConf").checked;saveCfg()};
  $("setKeep").checked=cfg.keepType;$("setKeep").onchange=()=>{cfg.keepType=$("setKeep").checked;saveCfg()};
  $("setCheck").checked=cfg.check;$("setCheck").onchange=()=>{cfg.check=$("setCheck").checked;saveCfg();if(!cfg.check)hideCheck()};
  $("setSound").checked=cfg.sound;$("setSound").onchange=()=>{cfg.sound=$("setSound").checked;saveCfg();if(cfg.sound)sfx("ok")};
  $("setDate").value=cfg.dateFmt;$("setDate").onchange=()=>{cfg.dateFmt=$("setDate").value;saveCfg();showDate();updateDel()};
  $("setSize").value=cfg.size;$("setSize").onchange=()=>{cfg.size=$("setSize").value;saveCfg();applyCfg()};
  $("setMerge").checked=mergeLog;
  $("setMerge").onchange=()=>{mergeLog=$("setMerge").checked;try{localStorage.setItem("lpnmergelog",mergeLog?"1":"0")}catch(e){}};
  const sync=()=>{$("setBgPick").value=hexNorm(theme.bg);$("setAcPick").value=hexNorm(theme.ac);$("setBgHex").value=hexNorm(theme.bg);$("setAcHex").value=hexNorm(theme.ac)};
  sync();
  const pick=(id,key,hexId)=>{$(id).oninput=()=>{theme[key]=$(id).value;$(hexId).value=hexNorm(theme[key]);$("setMsg").textContent="";applyTheme();saveTheme()}};
  pick("setBgPick","bg","setBgHex");pick("setAcPick","ac","setAcHex");
  const typed=(hexId,key,pickId)=>{$(hexId).oninput=()=>{
    const v=$(hexId).value;
    if(hexOk(v)){theme[key]=hexNorm(v);$(pickId).value=theme[key];$("setMsg").textContent="";$(hexId).style.borderColor="";applyTheme();saveTheme()}
    else{$("setMsg").textContent="Enter a hex code with 3 or 6 digits, for example #ff8a2a.";$(hexId).style.borderColor="var(--dg)"}
  };$(hexId).onblur=()=>{$(hexId).value=hexNorm(theme[key]);$(hexId).style.borderColor="";$("setMsg").textContent=""}};
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
}
function closeInstall(){$("instShade").hidden=true;$("instBox").hidden=true}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("instNow").hidden=false});
$("instNow").onclick=async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();
  try{await deferredInstall.userChoice}catch(e){}
  deferredInstall=null;$("instNow").hidden=true;closeInstall();
};
$("instClose").onclick=closeInstall;$("instShade").onclick=closeInstall;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeInstall()});
$("panelBody").addEventListener("click",e=>{if(e.target&&e.target.id==="showInstall"){closeHelp();openInstall()}const a=e.target&&e.target.closest&&e.target.closest("a[data-g]");if(a){e.preventDefault();const t=document.getElementById(a.dataset.g);if(t)t.scrollIntoView({behavior:"smooth",block:"start"})}});
(function(){
  const installed=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  let seen=false;try{seen=!!localStorage.getItem("lpninstallshown")}catch(e){}
  if(installed||seen)return;
  try{localStorage.setItem("lpninstallshown","1")}catch(e){}
  setTimeout(openInstall,700);
})();
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
$("dateFix").onclick=()=>{$("date").value=localToday();save();$("dateBar").hidden=true};
$("dateKeep").onclick=()=>{dateSkip=$("date").value+"|"+localToday();$("dateBar").hidden=true};
$("date").addEventListener("change",()=>{dateSkip="";checkDate(true)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDate()});
checkDate();
let names=[];try{names=JSON.parse(localStorage.getItem("lpnnames")||"[]")||[]}catch(e){names=[]}
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
