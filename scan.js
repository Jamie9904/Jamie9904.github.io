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
  const now=Date.now();
  if(v===lastCode&&now-lastAt<2500){lastAt=now;return}
  if(pendingAdd)return;
  lastCode=v;lastAt=now;
  const ok=tryAdd(v,true);
  $("smsg").textContent=ok?"Added: "+v+" ("+$("type").value+")":"Check the warning above.";
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
  $("readLabel").hidden=true;lastPhoto=null;
  if(!keepMsg){$("scanbox").hidden=true;$("smsg").textContent=""}
}
/* Scan by photo (camera) reads the barcode, and offers Read the printed LPN when there is none.
   Upload photo (photos already taken) reads the barcode, then the printed LPN. */
let lastPhoto=null,photoTag="",photoBusy=false,photoNote="";
/* Reading the printed LPN needs the photoUpload and manifestPhotos (Reading photos) switches on, and the photo reader. */
function canReadLabel(){return feat("photoUpload")&&feat("manifestPhotos")&&typeof ocrLpns==="function"}
async function decodePhoto(file,upload){
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
    if(text){lastCode="";onCode(text);return}
  }catch(e){}
  if(upload){await readLabelText(file);return}
  // Scan by photo: offer to read the printed LPN from this same photo, so it needn't be taken again.
  if(canReadLabel()){lastPhoto=file;$("readLabel").hidden=false;sm.textContent="No barcode found. Try again closer and steadier, or tap Read the printed LPN to read the number printed on the label in this photo."}
  else sm.textContent="No barcode found. Move closer, hold steady and try again.";
}
/* No barcode could be read: the LPN printed on the label is read with the photo reader instead. Text can be misread,
   so the reading is always shown with Add and Skip, to check against the label first.
   - Every LPN-shaped reading is considered, whatever the Manifest check's prefix list says (it's a single pallet's
     label): one with a listed prefix comes first, then one with an LPN's digit count. The list is only a note.
   - The same LPN printed twice (large, and again under the barcode) is offered once.
   - Other numbers (PO, SO, order numbers) are only mentioned, never offered as pallets.
   - A number read after "LPN:" without its letters is named, so it can be typed in. */
async function readLabelText(file,asked){
  const sm=$("smsg"),none="No barcode or LPN found. Try a clearer, closer photo of the label.";
  if(!canReadLabel()){sm.textContent="No barcode found. Try a clearer, closer photo of the barcode.";return}
  if(pendingAdd){sm.textContent="Answer the check above first (Add or Skip), then try the photo again.";return}
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
    if(pendingAdd){sm.textContent="Read "+lpns[0]+" from the printed label, but another check is waiting above. Answer it, then try the photo again.";return}
    const v=lpns[0],more=lpns.slice(1),mended=(r.mended||[]).includes(v);
    const notListed=pf.length&&!okPfx(v)&&!cfg.check?" Its prefix isn’t in your prefix list.":"";
    tryAdd(v,true,"Read "+v+" from the printed label (no barcode found"+(mended?", one character corrected":"")+"): check it matches the label."+notListed);
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
$("readLabel").onclick=()=>{const f=lastPhoto;$("readLabel").hidden=true;lastPhoto=null;if(f)readLabelText(f,true)};
/* Several photos chosen at once: each is read in turn. When one needs an answer (Add or Skip), the next waits for it. */
async function readPhotos(fs){
  photoBusy=true;const before=rows.length,notes=[];let none=0;
  try{
    for(let k=0;k<fs.length;k++){
      photoTag="Photo "+(k+1)+" of "+fs.length+": ";photoNote="";
      const had=rows.length;
      await decodePhoto(fs[k],true);
      // A number to type in, or a photo that couldn't be read, is kept for the summary (the next photo's messages replace it).
      if(photoNote)notes.push("Photo "+(k+1)+": "+photoNote+".");
      if(pendingAdd)await new Promise(res=>{onCheckDone=res});
      else if(rows.length===had&&!photoNote)none++;
    }
  }finally{photoTag="";photoNote="";photoBusy=false}
  const n=rows.length-before;
  $("smsg").textContent=fs.length+" photos read: "+(n?n+" pallet"+(n===1?"":"s"):"no pallets")+" added"+(none?", nothing found on "+none+" photo"+(none===1?"":"s"):"")+"."+(notes.length?" "+notes.join(" "):"");
}

$("stopscan").onclick=()=>stopScan();
syncType();
$("type").addEventListener("change",syncType);
document.querySelectorAll("#tyb button").forEach(b=>{b.onclick=()=>{$("type").value=b.dataset.t;syncType()}});
$("add").onclick=add;
$("flt").oninput=render;$("fltType").onchange=render;$("fltFsdu").onchange=render;
$("lpn").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add()}});
$("date").onchange=save;
$("recv").oninput=save;
$("notes").oninput=save;
$("expect").oninput=()=>{save();summary()};
$("clear").onclick=()=>{
  if(!rows.length)return;
  const prev=rows;rows=[];save();render();$("msg").textContent="";hideCheck();
  showUndo("Cleared "+prev.length+" pallet"+(prev.length===1?"":"s"),()=>{rows=prev;save();render()},true);
};

$("scanBtn").onclick=()=>{const b=$("btnrow"),o=!b.classList.contains("open");b.classList.toggle("open",o);$("scanBtn").setAttribute("aria-expanded",o);};
