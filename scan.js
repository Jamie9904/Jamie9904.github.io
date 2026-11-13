/* ---- barcode scanning ---- */
let wake=null;
/* One request at a time: a second one made while the first is still pending would leave a lock nobody releases. After
   a request finishes, the wanted state is checked again in case it changed meanwhile. */
let wakeAsk=null;
async function keepAwake(on){
  if(wakeAsk){await wakeAsk.catch(()=>{});if(typeof syncAwake==="function")return syncAwake();}
  try{
    if(on){if(navigator.wakeLock&&!wake){wakeAsk=navigator.wakeLock.request("screen");const w=await wakeAsk;wakeAsk=null;wake=w;w.addEventListener("release",()=>{if(wake===w)wake=null})}}
    else if(wake){const w=wake;wake=null;await w.release()}
  }catch(e){wakeAsk=null}
}
/* The screen stays on during Live scan, and while the app is open when Keep the screen on is ticked in Settings (a
   handheld scanner's scan is lost while the screen is off). The browser lets go when the app is hidden, so it is asked
   again when the app comes back, and on the first tap in case asking at start was refused. */
function syncAwake(){keepAwake(document.visibilityState==="visible"&&(scanning||cfg.awake))}
document.addEventListener("visibilitychange",syncAwake);
document.addEventListener("pointerdown",()=>{if(!wake&&cfg.awake)syncAwake()},{passive:true});
let stream=null,timer=null,zxReader=null,lastCode="",lastAt=0,scanning=false;
syncAwake();
function onCode(raw){
  const v=String(raw||"").trim();
  if(!v)return;
  if(/^LPNM\d+ /.test(v)){qrPart(v);return} // a code from another phone's Share log screen, never a pallet
  const now=Date.now();
  if(v===lastCode&&now-lastAt<2500){lastAt=now;return}
  if(pendingAdd)return;
  lastCode=v;lastAt=now;
  const ok=tryAdd(v,true);
  $("smsg").textContent=ok?"Added: "+v+" ("+$("type").value+")":"Check the warning above.";
}
/* Share log: the codes another phone shows (panels.js, qrCodesFor). They can be read in any order; when every part
   of one set is in, its pallets are added to this log (mergePallets, core.js) and the camera stops. */
let qrRecv=null,qrWant=false;const qrDone=new Set();
function qrPart(v){
  const sm=$("smsg");
  if(!feat("twoPhones"))return;
  // Only after Scan the other phone's codes was tapped, so a code seen during ordinary scanning adds nothing.
  if(!qrWant){sm.textContent="That’s a code from another phone. To add its pallets, use Share log, then Scan the other phone’s codes.";return}
  if(!/^LPNM1 /.test(v)){sm.textContent="That code is from a different version of the app. Open the app online on both phones to update them, then try again.";sfx("warn");return}
  const m=/^LPNM1 ([a-z0-9]{4}) (\d{1,2})\/(\d{1,2}) ([\s\S]*)$/.exec(v);
  if(!m)return;
  const id=m[1],k=+m[2],n=+m[3];if(!n||k<1||k>n)return;
  if(qrDone.has(id)){sm.textContent="These pallets were already added from the other phone. On that phone, close the codes.";return}
  if(pendingAdd){sm.textContent="Answer the check above first (Add or Skip), then keep the camera on the other phone.";return}
  if(!qrRecv||qrRecv.id!==id)qrRecv={id,n,parts:{}};
  if(n!==qrRecv.n||qrRecv.parts[k]!==undefined)return; // not this set's, or already read: no beep on every frame
  qrRecv.parts[k]=m[4];
  const got=Object.keys(qrRecv.parts).length;
  if(got<n){sm.textContent="Codes from the other phone: "+got+" of "+n+" read. Keep the camera on its screen.";sfx("ok");return}
  let o=null;try{o=JSON.parse(Array.from({length:n},(x,i)=>qrRecv.parts[i+1]).join(""))}catch(e){}
  qrRecv=null;
  if(o&&Array.isArray(o.r)&&o.r.length>500){sm.textContent="That’s more than 500 pallets, too many to add this way.";sfx("warn");return}
  if(!o||!Array.isArray(o.r)){sm.textContent="Those codes couldn’t be read. On the other phone, tap Show my pallets as QR codes again.";sfx("warn");return}
  const inBox=$("scanbox").contains(document.activeElement);
  qrDone.add(id);stopScan();if(inBox)$("lpn").focus({preventScroll:true});
  const mine=($("trailer").value||"").trim(),theirs=String(o.t||"").trim().slice(0,40);
  const said=mergePallets(o.r);
  $("msg").textContent=said+(mine&&theirs&&mine.toUpperCase()!==theirs.toUpperCase()?" Check the trailer: the other phone has "+theirs+", this one has "+mine+".":"");
}
function loadZX(){
  return new Promise((res,rej)=>{
    if(window.ZXing)return res();
    const s=document.createElement("script");
    const u="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
    s.crossOrigin="anonymous";if(typeof SRI==="object"&&SRI[u])s.integrity=SRI[u];s.src=u;
    s.onload=res;s.onerror=()=>rej(new Error("scanner library failed to load"));
    document.head.appendChild(s);
  });
}
/* Shows the "in testing" note (config.js) for the scan in use, if there is one. */
/* The other way to scan, naming only a photo button that is switched on. */
function photoAlt(pre,post){const k=feat("scanByPhoto")?"Scan by photo":feat("photoUpload")?"Upload photo":"";return k?pre+k+post:""}
function scanNote(k){document.querySelectorAll('#scanbox .testnote[data-test="liveScan"],#scanbox .testnote[data-test="scanByPhoto"],#scanbox .testnote[data-test="photoUpload"]').forEach(n=>{n.hidden=n.dataset.test!==k})}
/* The camera is asked for a sharp picture (up to 1920×1080) with continuous focus, so small barcodes can be read
   from further away; browsers that can't give that use the nearest they have. The slower ZXing reader (iPhones,
   Firefox) reads every pixel itself, so it asks for 1280×720. */
const camAsk=(w,h)=>({video:{facingMode:{ideal:"environment"},width:{ideal:w},height:{ideal:h},advanced:[{focusMode:"continuous"}]},audio:false});
let CAM=camAsk(1920,1080);
/* Changes a camera setting (torch or zoom) without dropping the others: each setting is its own "advanced" set, so a
   camera that can't do one still takes the rest. The changed setting goes first. */
function camApply(t,first){
  const adv=[first];
  if(!("zoom" in first)&&zoomTrack&&zoomNow!==zoomMin)adv.push({zoom:zoomNow});
  if(!("torch" in first)&&torchOn)adv.push({torch:true});
  adv.push({focusMode:"continuous"});
  return t.applyConstraints({width:CAM.video.width,height:CAM.video.height,advanced:adv});
}
async function startScan(){
  if(scanning)return;
  const v=$("video");
  $("scanbox").hidden=false;$("smsg").textContent="Starting camera…";$("readLabel").hidden=true;lastPhoto=null;
  scanNote("liveScan");
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    $("smsg").textContent="Camera isn't available here. You can still type or use a handheld scanner in the LPN box.";return;
  }
  scanning=true;
  try{
    if("BarcodeDetector" in window){
      CAM=camAsk(1920,1080);
      stream=await navigator.mediaDevices.getUserMedia(CAM);
      v.srcObject=stream;await v.play();
      const det=new BarcodeDetector();
      // One read at a time: on a slow phone a read of a sharp picture can take longer than 250 ms.
      let busy=false;
      timer=setInterval(async()=>{
        if(busy)return;busy=true;
        try{const r=await det.detect(v);if(r.length)onCode(r[0].rawValue)}catch(e){}finally{busy=false}
      },250);
    }else{
      await loadZX();
      zxReader=new ZXing.BrowserMultiFormatReader();
      CAM=camAsk(1280,720);
      await zxReader.decodeFromConstraints(CAM,v,(res)=>{if(res)onCode(res.getText())});
    }
    keepAwake(true);
    torchSetup(v.srcObject);zoomSetup(v.srcObject);
    try{const st=v.srcObject.getVideoTracks()[0].getSettings();diag("scan","Live scan camera "+st.width+"×"+st.height+(st.zoom?", zoom "+st.zoom:""))}catch(e){}
    $("smsg").textContent="Point the camera at a pallet barcode.";
  }catch(e){
    stopScan(true);
    const denied=e&&(e.name==="NotAllowedError"||e.name==="SecurityError");
    $("scanbox").hidden=false;
    $("smsg").textContent=denied?"Camera access was blocked. Allow camera permission for this site in your browser settings, make sure the page is opened over https"+photoAlt(", or use “","”")+".":"Couldn't start the scanner ("+((e&&e.message)||"error")+").";
  }
}
/* Torch: shown only when the phone lets a web page turn its light on (most Android phones; iPhones mostly don't). */
let torchTrack=null,torchOn=false;
function torchSetup(s){
  const b=$("torch");torchTrack=null;torchOn=false;b.hidden=true;b.setAttribute("aria-pressed","false");b.classList.remove("on");
  try{const t=s&&s.getVideoTracks&&s.getVideoTracks()[0],c=t&&t.getCapabilities&&t.getCapabilities();if(c&&c.torch&&feat("torch")){torchTrack=t;b.hidden=false}}catch(e){}
  $("scanbox").classList.toggle("hastorch",!b.hidden); // the camera view is a little shorter so both buttons stay on screen
  const tn=document.querySelector('#scanbox .testnote[data-test="torch"]');if(tn)tn.hidden=b.hidden;
}
$("torch").onclick=async()=>{
  if(!torchTrack)return;const want=!torchOn;
  try{await camApply(torchTrack,{torch:want});torchOn=want}
  catch(e){diag("scan","Torch couldn't be switched: "+((e&&e.message)||"error"));$("smsg").textContent=want?"The torch couldn't be switched on. Try more light"+photoAlt(", or ","")+".":"The torch couldn't be switched off. Stop scanning to turn it off.";return}
  const b=$("torch");b.setAttribute("aria-pressed",String(torchOn));b.classList.toggle("on",torchOn);
};
/* Zoom: − and + buttons in a corner of the camera picture on phones that let a web page zoom (most Android
   phones), for reading barcodes from further away without losing focus. Steps are 1×, 1.5×, 2×, 3×, 4×, 5× (as far as
   the camera goes). The last zoom used is remembered on this phone. */
let zoomTrack=null,zoomNow=1,zoomMin=1,zoomMax=1;
const ZOOM_STEPS=[1,1.5,2,3,4,5];
function zoomSetup(s){
  const row=$("zoomRow");zoomTrack=null;row.hidden=true;
  try{
    const t=s&&s.getVideoTracks&&s.getVideoTracks()[0],c=t&&t.getCapabilities&&t.getCapabilities();
    if(!c||!c.zoom||!(c.zoom.max>c.zoom.min))return;
    zoomTrack=t;zoomMin=+c.zoom.min;zoomMax=Math.min(+c.zoom.max,5);zoomNow=zoomMin;
    let want=zoomMin;try{const k=parseFloat(localStorage.getItem("lpnzoom"));if(k>=zoomMin&&k<=zoomMax)want=k}catch(e){}
    row.hidden=false;showZoom(zoomMin);if(want!==zoomMin)setZoom(want);
  }catch(e){}
}
function showZoom(v){zoomNow=v;$("zoomVal").textContent=(Math.round(v*10)/10)+"×";$("zoomOut").disabled=v<=zoomMin;$("zoomIn").disabled=v>=zoomMax}
async function setZoom(v){
  if(!zoomTrack)return;
  v=Math.max(zoomMin,Math.min(zoomMax,v));
  try{await camApply(zoomTrack,{zoom:v});showZoom(v);try{localStorage.setItem("lpnzoom",String(v))}catch(e){}}
  catch(e){diag("scan","Zoom couldn't be set: "+((e&&e.message)||"error"))}
}
$("zoomIn").onclick=()=>{const n=ZOOM_STEPS.find(x=>x>zoomNow+0.01);setZoom(n===undefined?zoomMax:n)};
$("zoomOut").onclick=()=>{const n=ZOOM_STEPS.slice().reverse().find(x=>x<zoomNow-0.01);setZoom(n===undefined?zoomMin:n)};
function stopScan(keepMsg){
  scanning=false;syncAwake();
  torchSetup(null);zoomSetup(null);
  if(timer){clearInterval(timer);timer=null}
  if(zxReader){try{zxReader.reset()}catch(e){}zxReader=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  const v=$("video");v.srcObject=null;
  $("readLabel").hidden=true;lastPhoto=null;qrWant=false;
  if(!keepMsg){$("scanbox").hidden=true;$("smsg").textContent=""}
}
/* Scan by photo (camera) reads the barcode, and offers Read the printed LPN when there is none.
   Upload photo (photos already taken) reads the barcode, then the printed LPN. */
let lastPhoto=null,photoTag="",photoBusy=false,photoNote="";
/* Reading the printed LPN needs the photoUpload and manifestPhotos (Reading photos) switches on, and the photo reader. */
function canReadLabel(){return feat("photoUpload")&&feat("manifestPhotos")&&typeof ocrLpns==="function"}
async function decodePhoto(file,upload,b){ // b: the batch this photo belongs to (several photos), if any
  const sm=$("smsg");$("scanbox").hidden=false;$("video").hidden=true;$("readLabel").hidden=true;lastPhoto=null;
  scanNote(upload?"photoUpload":"scanByPhoto");
  // set a frame after the box is shown, so screen readers announce it
  sm.textContent="";requestAnimationFrame(()=>{if(!sm.textContent)sm.textContent=photoTag+"Reading barcode…"});
  try{
    let text="";
    if("BarcodeDetector" in window){
      const bmp=await createImageBitmap(file);
      try{const r=await new BarcodeDetector().detect(bmp);if(r.length)text=r[0].rawValue}
      finally{if(bmp.close)bmp.close()} // freed before the photo reader makes its own copy
    }else{
      await loadZX();
      const url=URL.createObjectURL(file);
      try{const res=await new ZXing.BrowserMultiFormatReader().decodeFromImageUrl(url);text=res.getText()}
      finally{URL.revokeObjectURL(url)}
    }
    if(text){
      if(b){if(b.cancel)return;if(pendingAdd){photoNote="busy";return}b.expect.add(text.trim())}
      else if(pendingAdd){sm.textContent="Answer the check above first (Add or Skip), then try the photo again.";return}
      lastCode="";onCode(text);return}
  }catch(e){}
  if(upload){await readLabelText(file,false,b);return}
  // Scan by photo: offer to read the printed LPN from this same photo, so it needn't be taken again.
  if(canReadLabel()){lastPhoto=file;$("readLabel").hidden=false;sm.textContent="No barcode found. Try again closer and steadier, or use Read the printed LPN to read the number printed on the label in this photo."}
  else sm.textContent="No barcode found. Move closer, hold steady and try again.";
}
/* No barcode could be read: the LPN printed on the label is read with the photo reader instead. Text can be misread,
   so the reading is always shown with Add and Skip, to check against the label first.
   - Every LPN-shaped reading is considered, whatever the Manifest check's prefix list says (it's a single pallet's
     label): one with a listed prefix comes first, then one with an LPN's digit count. The list is only a note.
   - The same LPN printed twice (large, and again under the barcode) is offered once.
   - Other numbers (PO, SO, order numbers) are only mentioned, never offered as pallets.
   - A number read after "LPN:" without its letters is named, so it can be typed in. */
async function readLabelText(file,asked,b){
  const sm=$("smsg"),none="No barcode or LPN found. Try a clearer, closer photo of the label.";
  if(!canReadLabel()){sm.textContent="No barcode found. Try a clearer, closer photo of the barcode.";return}
  if(pendingAdd){if(b){photoNote="busy";return}sm.textContent="Answer the check above first (Add or Skip), then try the photo again.";return}
  sm.textContent=photoTag+(asked?"":"No barcode found, so ")+(asked?"Reading":"reading")+" the LPN printed on the label. This can take up to a minute…";
  const mine=t=>{sm.textContent=photoTag+"Reading the printed LPN: "+t};
  if(!ocrSay)ocrSay=mine;
  try{
    const r=await ocrLpns(file);
    const seen=new Set(),all=[...r,...(r.skipped||[]),...(r.odd||[]).filter(x=>!/^LPN /.test(x))].map(x=>String(x).toUpperCase().replace(/\s+/g,"")).filter(x=>{if(seen.has(x))return false;seen.add(x);return true});
    const lost=(r.odd||[]).filter(x=>/^LPN /.test(x)).map(x=>x.slice(4));
    const pf=typeof getPfx==="function"?getPfx():[];
    const rank=x=>(pf.length&&okPfx(x)?0:1)+(lpnDigitsOk(x)?0:2);
    const lpns=all.filter(lpnDigitsOk).sort((a,b)=>rank(a)-rank(b)),others=all.filter(x=>!lpnDigitsOk(x));
    diag("scan","Printed LPN read: no barcode; LPNs read from the label: "+(lpns.join(" ")||"none")+(others.length?"; other numbers: "+others.length:""));
    if(!lpns.length){if(lost.length)photoNote="a number after “LPN:” was read without its letters ("+lost[0]+"): type it in with the letters at the start";sm.textContent=photoTag+(lost.length?"No barcode found. A number after “LPN:” was read without its letters ("+lost[0]+"): type it in with the letters at the start."  :none);return}
    if(b&&b.cancel)return;
    if(pendingAdd){if(b){photoNote="busy";return}sm.textContent="Read "+lpns[0]+" from the printed label, but another check is waiting above. Answer it, then try the photo again.";return}
    const v=lpns[0],more=lpns.slice(1),mended=(r.mended||[]).includes(v);
    const notListed=pf.length&&!okPfx(v)&&!cfg.check?" Its prefix isn’t in your prefix list.":"";
    if(b)b.expect.add(v);
    tryAdd(v,true,photoTag+"Read "+v+" from the printed label (no barcode found"+(mended?", one character corrected":"")+"): check it matches the label."+notListed);
    sm.textContent=photoTag+"Read "+v+" from the printed label. Check it, then Add or Skip above."+(more.length?" Other LPNs on the photo: "+more.slice(0,3).join(", ")+(more.length>3?"…":"")+" (scan them separately if they’re other pallets).":"")+(others.length?" "+others.length+" other number"+(others.length===1?"":"s")+" on the label "+(others.length===1?"was":"were")+" left out.":"");
  }catch(e){const m=(e&&e.message)||none;photoNote="couldn’t be read: "+m.replace(/\.$/,"");sm.textContent=photoTag+m}
  finally{if(ocrSay===mine)ocrSay=null}
}
$("scan").onclick=()=>{if(photoBusy){busyMsg();return}$("video").hidden=false;startScan()};
const busyMsg=()=>{$("smsg").textContent="Still reading your photos. "+(pendingAdd?"Answer the check above (Add or Skip) to go on to the next one.":"Wait for them to finish before choosing more.")};
const pickPhoto=id=>{if(photoBusy){busyMsg();return}if(scanning)stopScan();$(id).value="";$(id).click()};
$("photo").onclick=()=>pickPhoto("file");
$("upload").onclick=()=>pickPhoto("upFile");
$("noLpn").onclick=()=>addNoLpn();
$("file").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)decodePhoto(f,false)};
$("upFile").onchange=e=>{const fs=[...(e.target.files||[])];if(fs.length===1)decodePhoto(fs[0],true);else if(fs.length)readPhotos(fs)};
$("readLabel").onclick=async()=>{
  if(pendingAdd){$("smsg").textContent="Answer the check above first (Add or Skip), then use Read the printed LPN.";return}
  const f=lastPhoto;$("stopscan").focus();$("readLabel").hidden=true;lastPhoto=null; // focus moves before the button hides
  if(f){await readLabelText(f,true);if(pendingAdd)$("chkSkip").focus()}};
/* Several photos chosen at once: each is read in turn. When one needs an answer (Add or Skip), the next waits for it.
   The batch stops when the log is replaced (Clear all, Start new delivery, opening or exporting a saved delivery)
   or Stop scanning is used, so no photo is added to the wrong delivery. */
let batch=null;
function stopPhotos(why){
  const b=batch;if(!b||b.cancel)return; // the first reason is kept
  b.cancel=why||"stopped";batch=null;photoBusy=false;photoTag=""; // the buttons work again straight away
  photoSummary(b);
  if(!b.waiting)return;
  // Only the batch's own question is taken away; one from a handheld scan stays for an answer.
  if(pendingAdd&&b.expect&&b.expect.has(pendingAdd.v))hideCheck();
  else{onCheckDone=null;b.release()}
}
// Called by addValue (core.js): counts pallets added from this batch's photos, not other scans meanwhile.
function onAdded(v){if(batch&&batch.expect&&batch.expect.has(v))batch.added++}
const waitCheck=b=>new Promise(res=>{b.waiting=true;b.release=()=>{b.waiting=false;res()};onCheckDone=b.release});
/* What a batch did. A stopped one says so in the main message line, since the camera box closes; one ended by a
   new or opened delivery only says so if the camera box is still showing (that delivery says what happened). */
function photoSummary(b){
  if(b.cancel==="log"&&$("scanbox").hidden)return;
  const n=b.added,parts=[(n?n+" pallet"+(n===1?"":"s"):"no pallets")+" added"];
  if(b.skipped)parts.push(b.skipped+" skipped");
  if(b.none)parts.push("nothing found on "+b.none+" photo"+(b.none===1?"":"s"));
  const head=b.cancel?"Stopped reading photos"+(b.cancel==="log"?" because the log changed":"")+" ("+b.done+" of "+b.total+" read): ":b.total+" photos read: ";
  const msg=head+parts.join(", ")+"."+(b.notes.length?" "+b.notes.join(" "):"");
  if(b.cancel==="stopped"||$("scanbox").hidden)$("msg").textContent=msg;else $("smsg").textContent=msg;
}
async function readPhotos(fs){
  const b=batch={cancel:"",added:0,skipped:0,none:0,notes:[],expect:null,waiting:false,done:0,total:fs.length};photoBusy=true;
  try{
    for(let k=0;k<fs.length&&!b.cancel;k++){
      if(pendingAdd){await waitCheck(b);if(b.cancel)break} // another check (a handheld scan) is answered first
      photoTag="Photo "+(k+1)+" of "+fs.length+": ";photoNote="";b.expect=new Set();
      const had=b.added;
      await decodePhoto(fs[k],true,b);
      if(b.cancel)break;
      if(photoNote==="busy"){k--;continue} // a check opened while it was being read: read it again after that
      b.done++;
      // A number to type in, or a photo that couldn't be read, is kept for the summary (the next photo's messages replace it).
      if(photoNote)b.notes.push("Photo "+(k+1)+": "+photoNote+".");
      if(pendingAdd&&b.expect.size){await waitCheck(b);if(b.added===had&&!b.cancel)b.skipped++}
      else if(b.added===had&&!photoNote)b.none++;
    }
  }finally{if(batch===b){photoTag="";photoNote="";photoBusy=false;batch=null}}
  if(!b.cancel)photoSummary(b); // a stopped batch gave its summary when it was stopped
}

$("stopscan").onclick=()=>{stopPhotos("stopped");stopScan()};
syncType();
$("type").addEventListener("change",syncType);
document.querySelectorAll("#tyb button").forEach(b=>{b.onclick=e=>{$("type").value=b.dataset.t;syncType();if(e&&e.detail>0&&matchMedia("(pointer:coarse)").matches)$("lpn").focus({preventScroll:true})}});
$("add").onclick=add;
$("flt").oninput=render;$("fltType").onchange=render;$("fltFsdu").onchange=render;
$("lpn").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add()}});
// A pasted list goes in pallet by pallet; one LPN pasted on its own goes in the box as usual.
$("lpn").addEventListener("paste",e=>{const t=(e.clipboardData||window.clipboardData).getData("text")||"";
  if(t.trim().split(/[\r\n,;\t]+/).filter(Boolean).length<2&&!/^\s*[A-Za-z]{1,3}\d{6,}(\s+[A-Za-z]{1,3}\d{6,})+\s*$/.test(t))return;
  e.preventDefault();$("lpn").value="";addPasted(t);$("lpn").focus()});
// − and + by Expected pallets: no keyboard needed. Never below 0; − on an empty box does nothing.
const stepExp=d=>{const e=$("expect"),n=parseInt(e.value,10);const v=isNaN(n)?(d>0?1:NaN):Math.max(0,n+d);
  if(isNaN(v)){$("msg").textContent="Expected pallets is empty: tap + or type a number.";return}e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));$("msg").textContent="Expected pallets: "+v+"."};
$("expDown").onclick=()=>stepExp(-1);$("expUp").onclick=()=>stepExp(1);
// Trailer numbers are tidied to capitals as they're typed (the cursor stays where it was).
// Not while a phone keyboard is still building a word (that can repeat letters); the word is done on compositionend.
const upTrailer=()=>{const e=$("trailer"),u=e.value.toUpperCase();if(u!==e.value){const p=e.selectionStart;e.value=u;try{e.setSelectionRange(p,p)}catch(x){}}};
$("trailer").addEventListener("input",ev=>{if(!ev.isComposing)upTrailer()});$("trailer").addEventListener("compositionend",upTrailer);$("trailer").addEventListener("change",upTrailer);
$("fltClear").onclick=()=>{$("flt").value="";render();$("flt").focus()};
$("flt").addEventListener("input",()=>{$("fltClear").hidden=!$("flt").value});
// The mute button on the entry bar: the same as the sound switch in Settings.
function syncMute(){const b=$("muteBtn");b.setAttribute("aria-pressed",String(!cfg.sound));b.classList.toggle("muted",!cfg.sound);b.title=cfg.sound?"Mute beeps":"Beeps muted: tap to turn them on"}
// After a tap (not the keyboard), focus goes back to the LPN box: a handheld scan then lands there instead of
// pressing mute again with its Enter.
$("muteBtn").onclick=e=>{cfg.sound=!cfg.sound;saveCfg();syncMute();if($("setSound"))$("setSound").checked=cfg.sound;if(cfg.sound)sfx("ok");$("msg").textContent=cfg.sound?"Beeps on.":"Beeps muted.";if(e&&e.detail>0)$("lpn").focus({preventScroll:true})};
syncMute();
$("date").onchange=save;
$("recv").oninput=save;
$("notes").oninput=save;
$("expect").oninput=()=>{save();summary()};
$("clear").onclick=()=>{
  if(!rows.length)return;
  stopPhotos("log");const prev=rows;rows=[];save();render();$("msg").textContent="";hideCheck();
  showUndo("Cleared "+prev.length+" pallet"+(prev.length===1?"":"s"),()=>{rows=prev;save();render()},true);
};

$("scanBtn").onclick=()=>{const b=$("btnrow"),o=!b.classList.contains("open");b.classList.toggle("open",o);$("scanBtn").setAttribute("aria-expanded",o);};
