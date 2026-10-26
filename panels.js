/* ---- help panel ---- */
const HELP={guide:`<h3>1. Set up the delivery</h3>
<p>Enter the <b>Date</b> and the name of the person who <b>Received</b> the delivery at the top. Use <b>Add logo</b> if you want a logo on the page and on the spreadsheet. If a file called logo.png sits next to the app, it is used as the default logo. <b>Change logo</b> overrides it on this device and <b>Reset to default logo</b> brings it back.</p>
<h3>2. Log pallets</h3>
<ol>
<li>Type or scan the LPN into the LPN box.</li>
<li>Choose the pallet type: BB, FMCG, FPP or Mixed.</li>
<li>Tick <b>FSDU</b> if the pallet contains one.</li>
<li>Press <b>Add</b> (or Enter).</li>
</ol>
<p>The FSDU tick box clears after every pallet. The pallet type stays as you left it, unless you turn that off in Settings. If an LPN is already in the log, or doesn’t look right, you get a warning and can choose Skip or Add anyway.</p>
<p>In the table you can change a pallet’s type or FSDU tick afterwards, or remove it with ✕. The totals above the table count each pallet once. The FSDU count is shown separately and is not part of the total.</p>
<p><b>Warnings:</b> before a pallet is added, the app checks the LPN. If it is already in the log, doesn’t look like an LPN, uses a prefix that isn’t in your prefix list, or has an unusual number of digits, a red warning appears with a vibration and a sound. Tap <b>Skip</b> to leave it out or <b>Add anyway</b> to log it. You can switch the warnings off in Settings.</p>
<p><b>Undo:</b> when you remove a pallet with ✕, edit an LPN or use Clear all, an <b>Undo</b> bar appears for a few seconds.</p>
<p><b>Pallet type buttons:</b> tap BB, FMCG, FPP or Mixed above the LPN box before adding. The chosen type stays selected unless you change that in Settings.</p>
<p><b>Expected pallets:</b> enter how many pallets you expect and the log shows a running count, for example “12 of 14 expected”, turning green when they match. It appears in the exports.</p>
<p><b>Export menu:</b> Export opens Download (Excel), Email PDF and Print. Print opens the print dialog for the PDF layout, or saves the PDF if printing isn’t available.</p>
<p><b>Confirming scans:</b> turn on “Ask me to confirm each scanned barcode” in Settings to see each scan and tap Add or Skip before it is logged.</p>
<p><b>Backup:</b> Settings has Download backup and Restore backup for your log, saved deliveries and settings.</p>
<p><b>Editing and finding pallets:</b> tap an LPN in the log to correct it. Use the search box and type filter above the log to find pallets; the counts at the top always cover the whole log. Delivery notes are optional and appear in the exports.</p>
<p><b>Saved deliveries:</b> <b>Start new delivery</b> saves the current log to history and clears the page. <b>Saved deliveries</b> lists them (this week and last week, with weeks starting on Sunday) so you can open one again, delete it, or import an exported spreadsheet or app-made PDF. The history is stored on this device only.</p>
<h3>3. Scanning barcodes</h3>
<p>On phones the scan options are tucked away: tap <b>Scan</b> next to the Add button to show <b>Live scan</b> and <b>Scan by photo</b>.</p>
<ul>
<li><b>Scan by photo:</b> take a clear photo of the barcode. Its contents are added as an LPN with the selected type.</li>
<li><b>Handheld or Bluetooth scanner:</b> click the LPN box and scan. It types the code and presses Enter for you. This hasn’t been tested, so it may not work.</li>
<li><b>Live scan:</b> opens the camera and adds each barcode it sees. It needs the app to be opened over HTTPS and camera permission. If Live scan doesn’t work, try Scan by photo.</li>
</ul>
<h3>4. Download the spreadsheet</h3>
<p>Press <b>Download (Excel)</b>. The file has your logo, the Pallet table (LPN, pallet type, FSDU), a breakdown of pallets by type with a Total, an FSDU line that is not included in the Total, and Delivery Details with the date and who received it. It is set up to print on A4 portrait. In the spreadsheet BB is shown as “Brown Box”. If the spreadsheet builder can’t load (for example no internet), a basic .xls file is saved instead.</p>
<p><b>Emailing it:</b> press <b>Email PDF</b> and your phone’s share sheet opens with a PDF copy of the spreadsheet attached, because phones don’t allow Excel files to be shared this way. The Excel download is unchanged. Choose your email app from the list. <b>Compare and email PDF</b> does the same for the comparison (just the comparison, not the merged workbook). If it says the file is ready, tap <b>Tap to share</b>. If the browser can’t attach files, the file is saved and you are asked to attach it to your email yourself.</p>
<h3>5. Check a delivery against the manifest</h3>
<ol>
<li><b>Showing the section:</b> the manifest check is hidden by default. Tap its heading to show or hide it.</li>
<li><b>Quick start:</b> tap <b>Use current log</b> (or pick a saved delivery) for step 1, add the manifest, then press <b>Check results</b>. The results appear on screen: Missing (report), On the log only (book in), and Matched. Tap <b>Fix</b> on any number to correct a misread or mistype, or ✕ to remove it, and the results update straight away. Then use Compare and download, or Compare and email PDF, to make the document.</li>
<li><b>Manifest date:</b> set the date of the manifest. It can be different from today and is used on the comparison spreadsheet.</li>
<li><b>Prefix preset:</b> choose a preset to fill the list of LPN prefixes, then edit the list if a delivery is different. Only numbers starting with these prefixes are picked up from photos. Leave the list blank, or choose <b>All prefixes</b>, to pick up any LPN made of 1 to 3 letters followed by digits. Use <b>Save as preset</b> to keep a list under a name. <b>Download presets file</b> creates an updated copy from your current presets.</li>
<li><b>LPN log:</b> upload an exported spreadsheet or a PDF of the log, or take a photo of the printed log. PDFs made by this app’s email button are read exactly. Other PDFs are read like manifests.</li>
<li><b>Manifest:</b> add one or more photos or PDF files of the manifest. You can choose several PDFs at once. PDFs with selectable text are read directly, and scanned PDFs are read like photos.</li>
<li>Check the two lists of numbers and fix any mistakes. You can also type numbers in.</li>
<li>Press <b>Compare and download</b> to get a spreadsheet that lists every LPN from both sources. <b>✓ Matched</b> means it is on both. <b>✗ MISSING</b> means it is on the manifest but not the log, so report it as missing. <b>⚠ LOG ONLY</b> means it is on the log but not the manifest, so it still needs booking in. If you uploaded the log as an .xlsx file, the comparison is added as a new tab called <b>Manifest Check</b> in a copy of that file, so you get both in one workbook. With a photo of the printed log you get a separate spreadsheet.</li>
</ol>
<p>Photos are read with text recognition. It looks for entries that match the LPN format and fixes common lookalike characters in the number part, but it can still misread the letters, so check the lists before comparing. It cleans up the image and re-reads each number close up to improve accuracy, and flags numbers with an unusual number of digits.</p>
<p><b>Include a copy of the log:</b> in <b>Settings</b>, this option is on by default. When it is on, the Excel comparison is added as a new tab on your uploaded log workbook. If the log came from a PDF or another type of file, the comparison workbook gets a <b>Log copy</b> tab with all of the log’s information. The emailed PDF has the log added as extra pages after the comparison: your uploaded PDF as it is, or a table copy of the spreadsheet’s information. If the log was read from a photo or a PDF not made by this app, only the LPN numbers are available to copy. Turn it off in Settings to get the comparison on its own.</p>
<h3>6. Install it on your phone</h3>
<ul>
<li><b>Android (Chrome):</b> open the app’s web address, tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</li>
<li><b>iPhone (Safari):</b> open the web address in Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>. It must be Safari, not another browser.</li>
<li><button id="showInstall">Show the install pop-up again</button> You can also open it from the Install section in <b>Settings</b>.</li>
<li>It then opens full screen from its own icon. It keeps working without a connection once it has been opened online. The Excel builder, PDF maker and text recognition are saved the first time you use each one, so use Download (Excel), Email PDF and the Manifest check once while online. Until you have, they need a connection. This hasn’t been tested on every phone, so downloads may behave differently, for example going to the Files app on iPhone.</li>
</ul>
<p><b>Colours:</b> open <b>Settings</b> next to Guide and Changelog to choose your own background and accent colours with a colour picker or a hex code. They are saved on this device.</p>
<h3>7. Good to know</h3>
<ul>
<li>Your entries, date, name and logo are saved in this browser on this device only. <b>Clear all</b> removes the entries.</li>
<li>LPNs are expected as a letter prefix followed by digits, for example RUN000000000. The prefix list only affects numbers read from photos, not numbers you type in.</li>
<li>Always check numbers read from photos before comparing, as photos can be misread.</li>
</ul>`,log:`<h3>v3.20 <span class="ver">Current</span></h3>
<ul><li>Importing an exported log older than last week now explains why it isn’t kept and offers to load it straight into the log.</li><li>Filter the log by pallets with or without an FSDU.</li><li>Tidier spreadsheets and PDFs: a title band, numbered rows, thin grid lines, light-grey alternate rows and page numbers. Gridlines are hidden on screen in the log and manifest check sheets. Dates show as dd/mm/yyyy by default; change this under Settings, Date format.</li><li>Warnings before adding duplicate or unusual LPNs, with a skip or add anyway choice.</li><li>Undo for removed pallets.</li><li>Start new delivery, a Saved deliveries list, and importing an exported log. Saved deliveries older than the start of last week (weeks start on Sunday) are removed automatically.</li><li>The install pop-up can now be opened again from Settings as well as the Guide, and the pop-up itself says so.</li><li>Settings now warns when your accent colour is hard to see against your background, and status messages are announced by screen readers.</li><li>An “update available” banner appears in installed apps when a new version has been uploaded.</li><li>Look and feel: a header mark, quieter buttons and delete icons, tidier fields, a two-column layout on wide screens, a version line at the bottom, one chevron style, and a contents bar at the top of the Guide.</li><li>Accessibility and layout fixes: the log fits on phones with larger tap targets, rows and sections are labelled for screen readers, placeholder text is easier to read, the entry bar is shorter on phones, and the Add button sits next to the LPN box on larger screens.</li><li>Icons are now simple line icons instead of emoji, and deleting a saved delivery has an Undo instead of a confirmation box.</li><li>Exports and the manifest check can now work offline after the first online use.</li><li>Manifest check: Use current log or a saved delivery as the log, a Check results panel on screen, and Fix or remove buttons for misread numbers.</li><li>Pallet type buttons, an expected pallets count, an Export menu with Print, confirm-each-scan option, separate sound and vibration settings, and backup and restore in Settings.</li><li>Tap an LPN to edit it, search and filter the log, delivery notes in the exports, Clear all now has Undo, saved deliveries show their totals, and the screen stays awake while live scanning.</li><li>New Settings: default pallet type, keep last type, warnings on or off, sound and vibration, and text size.</li></ul>
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
  const short=t=>t.replace(/^(Set up the delivery)$/,"Delivery").replace(/^Log pallets$/,"Logging").replace(/^Scanning barcodes$/,"Scanning").replace(/^Download the spreadsheet$/,"Export").replace(/^Check a delivery against the manifest$/,"Manifest check").replace(/^Install it on your phone$/,"Install").replace(/^Good to know$/,"Good to know");
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
<h3>Comparison</h3>
<label class="chk"><input type="checkbox" id="setMerge"><span>Include a copy of the log with the manifest comparison (a tab in the spreadsheet, extra pages at the end of the PDF)</span></label>
<h3>Logging</h3>
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
const todayStr=()=>new Date().toISOString().slice(0,10);
function newDelivery(){
  if(!rows.length){$("dlmsg").textContent="The log is empty, so there is nothing to save.";return}
  const prev={rows:rows.slice(),date:$("date").value,recv:$("recv").value,notes:$("notes").value,expect:$("expect").value};
  pushHist({saved:new Date().toISOString(),date:prev.date,recv:prev.recv,notes:prev.notes,expect:prev.expect,rows:prev.rows});
  const id=hist[0].id;
  rows=[];$("notes").value="";$("expect").value="";$("date").value=todayStr();$("type").value=cfg.defType;$("type").dataset.t=cfg.defType;
  save();render();
  $("dlmsg").textContent="Saved to history and started a new delivery.";
  showUndo("Saved to history. Started a new delivery.",()=>{hist=hist.filter(h=>h.id!==id);saveHist();rows=prev.rows;$("date").value=prev.date;$("recv").value=prev.recv;$("notes").value=prev.notes||"";$("expect").value=prev.expect||"";save();render();$("dlmsg").textContent=""});
}
function openHist(id){
  const h=hist.find(x=>x.id===id);if(!h)return;
  if(rows.length)pushHist({saved:new Date().toISOString(),date:$("date").value,recv:$("recv").value,notes:$("notes").value,expect:$("expect").value,rows:rows.slice()});
  hist=hist.filter(x=>x.id!==id);saveHist();
  rows=h.rows.map(r=>Object.assign({},r));$("date").value=h.date||todayStr();$("recv").value=h.recv||"";$("notes").value=h.notes||"";$("expect").value=h.expect||"";
  save();render();closeHelp();
  $("dlmsg").textContent="Opened the saved delivery. Your previous log, if it had pallets, was saved to history.";
}
async function parseExported(f){
  const name=f.name.toLowerCase();let unk=0;
  const normT=t=>{const k=String(t||"").trim().toUpperCase();const m={"BB":"BB","BROWN BOX":"BB","FMCG":"FMCG","FPP":"FPP","MIXED":"Mixed"}[k];if(!m)unk++;return m||"Mixed"};
  if(name.endsWith(".pdf")){
    await loadPdfJs();
    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
    const meta=await pdf.getMetadata();const kw=(meta&&meta.info&&meta.info.Keywords)||"";
    if(kw.indexOf("LPNLOG2:")!==0)throw new Error("That PDF wasn’t made by this app’s Email PDF button, so the pallet types can’t be read from it.");
    const o=JSON.parse(decodeURIComponent(kw.slice(8)));
    return {date:o.d||"",recv:o.r||"",notes:o.n||"",expect:o.e||"",rows:(o.rows||[]).map(r=>({lpn:String(r[0]),type:normT(r[1]),fsdu:!!r[2]})),unk:unk};
  }
  let g;
  if(name.endsWith(".xlsx")){
    await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());
    g=[];wb.worksheets[0].eachRow({includeEmpty:true},row=>{g.push((row.values||[]).slice(1).map(cellText))});
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
    const l=String(g[i][col]==null?"":g[i][col]).trim();if(!l)break;
    rw.push({lpn:l,type:normT(g[i][col+1]),fsdu:/^y/i.test(String(g[i][col+2]||"").trim())});
  }
  let date="",recv="",notes="",expect="";
  g.forEach(r=>r.forEach((c,k)=>{
    const t=String(c).trim().toLowerCase(),nx=String(r[k+1]==null?"":r[k+1]).trim();
    if(t==="date"&&!date&&isoDate(nx))date=isoDate(nx);
    if(t==="received by"&&!recv)recv=nx;
    if(t==="notes"&&!notes)notes=nx;
    if(t==="expected pallets"&&!expect)expect=nx;
  }));
  return {date:date,recv:recv,notes:notes,expect:expect,rows:rw,unk:unk};
}
HELP.history=`<p>Deliveries you save are kept in this browser on this device. Weeks run Sunday to Saturday, and only this week and last week are kept; older ones are removed automatically. Opening one puts it back in the log so you can change it or export it again.</p>
<div class="row" style="margin:10px 0"><button id="histImport">Import an exported log</button><input type="file" id="histFile" accept=".xlsx,.csv,.xls,.pdf,application/pdf" hidden></div>
<div class="msg" id="histMsg" role="status" aria-live="polite"></div>
<div id="histRoot"></div>`;
function initHistory(){
  pruneHist();
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
    const r=document.createElement("div");r.className="row";
    const o=document.createElement("button");o.className="p";o.textContent="Open";o.onclick=()=>openHist(h.id);
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
    r.append(o,x);d.append(hd,tt,sb,r);root.appendChild(d);
  });
  $("histImport").onclick=()=>{$("histFile").value="";$("histFile").click()};
  $("histFile").onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    $("histMsg").textContent="Reading "+f.name+"…";
    try{
      const r=await parseExported(f);
      if(!r.rows.length)throw new Error("No pallets were found in that file.");
      const nid=pushHist({saved:new Date().toISOString(),date:r.date,recv:r.recv,notes:r.notes,expect:r.expect,rows:r.rows});
      const unk=r.unk?" "+r.unk+" had a pallet type that couldn’t be read, so they were set to Mixed.":"";
      initHistory();
      const hm=$("histMsg");
      if(hist.some(h=>h.id===nid)){hm.textContent="Imported "+r.rows.length+" pallets."+unk+" Tap Open to use it."}
      else{
        hm.textContent="Read "+r.rows.length+" pallets"+(r.date?" dated "+ukDate(r.date):"")+", but that is older than last week, so it can’t be kept in Saved deliveries."+unk+" ";
        const b=document.createElement("button");b.className="p";b.textContent="Load it into the log";
        b.onclick=()=>{
          if(rows.length)pushHist({saved:new Date().toISOString(),date:$("date").value,recv:$("recv").value,notes:$("notes").value,expect:$("expect").value,rows:rows.slice()});
          rows=r.rows.map(x=>Object.assign({},x));$("date").value=r.date||todayStr();$("recv").value=r.recv||"";$("notes").value=r.notes||"";$("expect").value=r.expect||"";
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
  applyTheme();
  $("bkDl").onclick=async()=>{
    try{
      const data={};
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^lpn/.test(k))data[k]=localStorage.getItem(k)}
      const json=JSON.stringify({app:"lpn-pallet-log",version:1,saved:new Date().toISOString(),data:data});
      await saveOnly(new TextEncoder().encode(json).buffer,"lpn-backup-"+new Date().toISOString().slice(0,10)+".json","application/json");
      $("bkMsg").textContent="Backup downloaded.";
    }catch(e){$("bkMsg").textContent="Couldn’t create the backup: "+((e&&e.message)||"error")}
  };
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
  $("setDef").value=cfg.defType;$("setDef").onchange=()=>{cfg.defType=$("setDef").value;saveCfg();$("type").value=cfg.defType;syncType()};
  $("setVib").checked=cfg.vibrate;$("setVib").onchange=()=>{cfg.vibrate=$("setVib").checked;saveCfg();if(cfg.vibrate)sfx("ok")};
  $("setConf").checked=cfg.confirmScan;$("setConf").onchange=()=>{cfg.confirmScan=$("setConf").checked;saveCfg()};
  $("setKeep").checked=cfg.keepType;$("setKeep").onchange=()=>{cfg.keepType=$("setKeep").checked;saveCfg()};
  $("setCheck").checked=cfg.check;$("setCheck").onchange=()=>{cfg.check=$("setCheck").checked;saveCfg();if(!cfg.check)hideCheck()};
  $("setSound").checked=cfg.sound;$("setSound").onchange=()=>{cfg.sound=$("setSound").checked;saveCfg();if(cfg.sound)sfx("ok")};
  $("setDate").value=cfg.dateFmt;$("setDate").onchange=()=>{cfg.dateFmt=$("setDate").value;saveCfg()};
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
