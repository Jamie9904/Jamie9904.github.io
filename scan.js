/* ---- barcode scanning ---- */
let wake=null;
async function keepAwake(on){try{if(on){if(navigator.wakeLock&&!wake){wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>{wake=null})}}else if(wake){await wake.release();wake=null}}catch(e){wake=null}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&scanning)keepAwake(true)});
let stream=null,timer=null,zxReader=null,lastCode="",lastAt=0,scanning=false;
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
function scanNote(k){document.querySelectorAll('#scanbox .testnote[data-test="liveScan"],#scanbox .testnote[data-test="scanByPhoto"]').forEach(n=>{n.hidden=n.dataset.test!==k})}
/* The camera is asked for a sharp picture (up to 1920×1080) with continuous focus, so small barcodes can be read
   from further away; browsers that can't give that use the nearest they have. */
const CAM={video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080},advanced:[{focusMode:"continuous"}]},audio:false};
async function startScan(){
  if(scanning)return;
  const v=$("video");
  $("scanbox").hidden=false;$("smsg").textContent="Starting camera…";
  scanNote("liveScan");
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    $("smsg").textContent="Camera isn't available here. You can still type or use a handheld scanner in the LPN box.";return;
  }
  scanning=true;
  try{
    if("BarcodeDetector" in window){
      stream=await navigator.mediaDevices.getUserMedia(CAM);
      v.srcObject=stream;await v.play();
      const det=new BarcodeDetector();
      timer=setInterval(async()=>{
        try{const r=await det.detect(v);if(r.length)onCode(r[0].rawValue)}catch(e){}
      },250);
    }else{
      await loadZX();
      zxReader=new ZXing.BrowserMultiFormatReader();
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
    $("smsg").textContent=denied?"Camera access was blocked. Allow camera permission for this site in your browser settings, make sure the page is opened over https, or use “Scan by photo”.":"Couldn't start the scanner ("+((e&&e.message)||"error")+").";
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
  try{await torchTrack.applyConstraints({advanced:[{torch:want}]});torchOn=want}
  catch(e){diag("scan","Torch couldn't be switched: "+((e&&e.message)||"error"));$("smsg").textContent=want?"The torch couldn't be switched on. Try more light, or Scan by photo.":"The torch couldn't be switched off. Stop scanning to turn it off.";return}
  const b=$("torch");b.setAttribute("aria-pressed",String(torchOn));b.classList.toggle("on",torchOn);
};
/* Zoom: a slider over the camera picture on phones that let a web page zoom (most Android phones), for reading
   barcodes from further away without losing focus. The last zoom used is remembered on this phone. */
let zoomTrack=null;
function zoomSetup(s){
  const row=$("zoomRow"),z=$("zoom");zoomTrack=null;row.hidden=true;
  try{
    const t=s&&s.getVideoTracks&&s.getVideoTracks()[0],c=t&&t.getCapabilities&&t.getCapabilities();
    if(!c||!c.zoom||!(c.zoom.max>c.zoom.min))return;
    zoomTrack=t;z.min=c.zoom.min;z.max=Math.min(c.zoom.max,8);z.step=c.zoom.step||0.1;
    let want=+c.zoom.min;try{const k=parseFloat(localStorage.getItem("lpnzoom"));if(k>=c.zoom.min&&k<=c.zoom.max)want=k}catch(e){}
    z.value=want;showZoom();if(want!==+c.zoom.min)setZoom(want);
    row.hidden=false;
  }catch(e){}
}
function showZoom(){const v=(+$("zoom").value).toFixed(1).replace(/\.0$/,"")+"×";$("zoomVal").textContent=v;$("zoom").setAttribute("aria-valuetext",v)}
async function setZoom(v){
  if(!zoomTrack)return;
  try{await zoomTrack.applyConstraints({advanced:[{zoom:v}]});try{localStorage.setItem("lpnzoom",String(v))}catch(e){}}
  catch(e){diag("scan","Zoom couldn't be set: "+((e&&e.message)||"error"))}
}
$("zoom").oninput=()=>{showZoom();setZoom(+$("zoom").value)};
function stopScan(keepMsg){
  scanning=false;keepAwake(false);
  torchSetup(null);zoomSetup(null);
  if(timer){clearInterval(timer);timer=null}
  if(zxReader){try{zxReader.reset()}catch(e){}zxReader=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  const v=$("video");v.srcObject=null;
  if(!keepMsg){$("scanbox").hidden=true;$("smsg").textContent=""}
}
async function decodePhoto(file){
  const sm=$("smsg");$("scanbox").hidden=false;$("video").hidden=true;
  scanNote("scanByPhoto");
  sm.textContent="Reading barcode…";
  try{
    let text="";
    if("BarcodeDetector" in window){
      const bmp=await createImageBitmap(file);
      const r=await new BarcodeDetector().detect(bmp);
      if(r.length)text=r[0].rawValue;
    }else{
      await loadZX();
      const url=URL.createObjectURL(file);
      try{const res=await new ZXing.BrowserMultiFormatReader().decodeFromImageUrl(url);text=res.getText()}
      finally{URL.revokeObjectURL(url)}
    }
    if(text){lastCode="";onCode(text)}
    else sm.textContent="No barcode found. Move closer, hold steady and try again.";
  }catch(e){
    sm.textContent="No barcode found. Move closer, hold steady and try again.";
  }
}
$("scan").onclick=()=>{$("video").hidden=false;startScan()};
$("photo").onclick=()=>{$("file").value="";$("file").click()};
$("file").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)decodePhoto(f)};

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
  showUndo("Cleared "+prev.length+" pallets",()=>{rows=prev;save();render()});
};

$("scanBtn").onclick=()=>{const b=$("btnrow"),o=!b.classList.contains("open");b.classList.toggle("open",o);$("scanBtn").setAttribute("aria-expanded",o);};
