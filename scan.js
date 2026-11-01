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
async function startScan(){
  if(scanning)return;
  const v=$("video");
  $("scanbox").hidden=false;$("smsg").textContent="Starting camera…";
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    $("smsg").textContent="Camera isn't available here. You can still type or use a handheld scanner in the LPN box.";return;
  }
  scanning=true;
  try{
    if("BarcodeDetector" in window){
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      v.srcObject=stream;await v.play();
      const det=new BarcodeDetector();
      timer=setInterval(async()=>{
        try{const r=await det.detect(v);if(r.length)onCode(r[0].rawValue)}catch(e){}
      },250);
    }else{
      await loadZX();
      zxReader=new ZXing.BrowserMultiFormatReader();
      await zxReader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}},audio:false},v,(res)=>{if(res)onCode(res.getText())});
    }
    keepAwake(true);
    torchSetup(v.srcObject);
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
  try{const t=s&&s.getVideoTracks&&s.getVideoTracks()[0],c=t&&t.getCapabilities&&t.getCapabilities();if(c&&c.torch){torchTrack=t;b.hidden=false}}catch(e){}
  $("scanbox").classList.toggle("hastorch",!b.hidden); // the camera view is a little shorter so both buttons stay on screen
}
$("torch").onclick=async()=>{
  if(!torchTrack)return;const want=!torchOn;
  try{await torchTrack.applyConstraints({advanced:[{torch:want}]});torchOn=want}
  catch(e){diag("scan","Torch couldn't be switched: "+((e&&e.message)||"error"));$("smsg").textContent=want?"The torch couldn't be switched on. Try more light, or Scan by photo.":"The torch couldn't be switched off. Stop scanning to turn it off.";return}
  const b=$("torch");b.setAttribute("aria-pressed",String(torchOn));b.classList.toggle("on",torchOn);
};
function stopScan(keepMsg){
  scanning=false;keepAwake(false);
  torchSetup(null);
  if(timer){clearInterval(timer);timer=null}
  if(zxReader){try{zxReader.reset()}catch(e){}zxReader=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  const v=$("video");v.srcObject=null;
  if(!keepMsg){$("scanbox").hidden=true;$("smsg").textContent=""}
}
async function decodePhoto(file){
  const sm=$("smsg");$("scanbox").hidden=false;$("video").hidden=true;
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
