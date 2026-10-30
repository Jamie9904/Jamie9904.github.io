const TYPES=["BB","FMCG","FPP","Mixed"];
let rows=[];
let delCollapsed=false;
const DEL_F=["date","recv","notes","expect","trailer","sealIn","sealOut"];
let exported=null;
function logSig(){let h=0;const s=rows.map(r=>r.lpn+"|"+r.type+"|"+(r.fsdu?1:0)).join(",");for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return rows.length+":"+h}
function getDel(){const o={};DEL_F.forEach(k=>{o[k]=$(k).value});o.exp=exported;return o}
function setDel(o){o=o||{};DEL_F.forEach(k=>{$(k).value=k==="date"?(o.date||localToday()):(o[k]||"")});exported=o.exp||null}
const $=id=>document.getElementById(id);
function syncType(){const v=$("type").value;$("type").dataset.t=v;document.querySelectorAll("#tyb button").forEach(b=>{const on=b.dataset.t===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})}
let cfg={defType:"BB",check:true,sound:true,size:"1",keepType:true,vibrate:true,confirmScan:false,dateFmt:"uk"};
/* Saved data can come back from a backup file, so everything read from storage is checked and tidied before use.
   A damaged or crafted backup then can't stop the app starting or put anything odd into an export. */
const isTxt=v=>typeof v==="string"||typeof v==="number";
function cleanCfg(c){const out={};if(c&&typeof c==="object"&&!Array.isArray(c))Object.keys(cfg).forEach(k=>{if(typeof c[k]===typeof cfg[k])out[k]=c[k]});return out}
function cleanRows(a){return (Array.isArray(a)?a:[]).filter(r=>r&&typeof r==="object"&&isTxt(r.lpn)&&String(r.lpn).trim()).map(r=>({lpn:String(r.lpn).trim().slice(0,100),type:TYPES.indexOf(r.type)>=0?r.type:"Mixed",fsdu:!!r.fsdu}))}
function cleanDel(o){
  o=o&&typeof o==="object"?o:{};const out={};
  DEL_F.forEach(k=>{out[k]=isTxt(o[k])?String(o[k]).slice(0,2000):""});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.date))out.date="";
  const e=o.exp;out.exp=e&&typeof e==="object"&&typeof e.at==="string"&&typeof e.sig==="string"?{at:e.at,sig:e.sig}:null;
  return out;
}
function cleanHist(a){return (Array.isArray(a)?a:[]).filter(h=>h&&typeof h==="object"&&!Array.isArray(h)).map((h,i)=>Object.assign(cleanDel(h),{id:isTxt(h.id)?String(h.id):"r"+Date.now()+i,saved:typeof h.saved==="string"?h.saved:"",rows:cleanRows(h.rows)}))}
function cleanNames(a){return (Array.isArray(a)?a:[]).filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim().slice(0,60)).slice(0,6)}
const okLogo=v=>typeof v==="string"&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(v);
try{const c=JSON.parse(localStorage.getItem("lpncfg")||"null");cfg=Object.assign(cfg,cleanCfg(c))}catch(e){}
if(!TYPES.includes(cfg.defType))cfg.defType="BB";
const saveCfg=()=>{try{localStorage.setItem("lpncfg",JSON.stringify(cfg))}catch(e){}};
const applyCfg=()=>{document.documentElement.style.setProperty("--ts",cfg.size||"1")};
applyCfg();
let actx=null;
function sfx(kind){
  if(cfg.vibrate){try{navigator.vibrate&&navigator.vibrate(kind==="warn"?[140,80,140]:[70])}catch(e){}}
  if(!cfg.sound)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    actx=actx||new AC();if(actx.state==="suspended")actx.resume();
    const seq=kind==="warn"?[[300,0,.14],[300,.2,.14]]:[[880,0,.09]];
    seq.forEach(a=>{const o=actx.createOscillator(),g=actx.createGain();o.type=kind==="warn"?"square":"sine";o.frequency.value=a[0];g.gain.value=.12;o.connect(g);g.connect(actx.destination);const t0=actx.currentTime+a[1];o.start(t0);o.stop(t0+a[2])});
  }catch(e){}
}

function load(){
  try{
    const d=localStorage.getItem("lpnlog");
    if(d){const o=JSON.parse(d);rows=cleanRows(o&&o.rows);setDel(cleanDel(o));}
  }catch(e){}
  if(!$("date").value)$("date").value=localToday();
}
function save(){
  try{localStorage.setItem("lpnlog",JSON.stringify(Object.assign({rows:rows},getDel())))}catch(e){}
}
function render(){
  syncType();
  const b=$("body");b.innerHTML="";
  if(!rows.length){b.innerHTML='<tr><td colspan="5" class="empty">No pallets logged yet</td></tr>'}
  const q=($("flt").value||"").trim().toUpperCase().replace(/\s+/g,""),ft=$("fltType").value,ff=$("fltFsdu").value;
  let shown=0;
  rows.forEach((r,i)=>{
    if(q&&r.lpn.toUpperCase().replace(/\s+/g,"").indexOf(q)<0)return;
    if(ft&&r.type!==ft)return;
    if(ff==="y"&&!r.fsdu)return;
    if(ff==="n"&&r.fsdu)return;
    shown++;
    const tr=document.createElement("tr");tr.dataset.t=r.type;
    const n=document.createElement("td");n.textContent=i+1;
    const l=document.createElement("td");l.className="l";l.textContent=r.lpn;l.title="Tap to edit";
    l.onclick=()=>{
      if(l.querySelector("input"))return;
      const inp=document.createElement("input");inp.value=r.lpn;inp.setAttribute("autocapitalize","characters");inp.setAttribute("aria-label","Edit LPN");
      l.textContent="";l.appendChild(inp);inp.focus();inp.select();
      let done=false;
      const finish=ok=>{
        if(done)return;done=true;
        const v=inp.value.trim();
        if(ok&&v&&v!==r.lpn){
          const u=v.toUpperCase().replace(/\s+/g,"");
          const dup=rows.some((z,k)=>k!==i&&z.lpn.toUpperCase().replace(/\s+/g,"")===u);
          const old=r.lpn;r.lpn=v;save();
          $("msg").textContent=dup?"Note: "+v+" is already in the log.":"";
          if(dup)sfx("warn");
          showUndo("Changed "+old+" to "+v,()=>{r.lpn=old;save();render()});
        }
        render();
      };
      inp.onblur=()=>finish(true);
      inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();finish(true)}else if(e.key==="Escape"){finish(false)}};
    };
    const t=document.createElement("td");
    const s=document.createElement("select");
    TYPES.forEach(x=>{const o=document.createElement("option");o.textContent=x;if(x===r.type)o.selected=true;s.appendChild(o)});
    s.dataset.t=r.type;s.setAttribute("aria-label","Pallet type for "+r.lpn);
    s.onchange=()=>{r.type=s.value;s.dataset.t=s.value;tr.dataset.t=s.value;save();summary()};
    t.appendChild(s);
    const f=document.createElement("td");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!r.fsdu;cb.setAttribute("aria-label","FSDU for "+r.lpn);
    cb.onchange=()=>{r.fsdu=cb.checked;save()};
    f.className="f";f.onclick=e=>{if(e.target!==cb){cb.checked=!cb.checked;r.fsdu=cb.checked;save()}};
    f.appendChild(cb);
    const x=document.createElement("td");
    const btn=document.createElement("button");btn.className="d";btn.textContent="✕";btn.setAttribute("aria-label","Delete "+r.lpn);
    btn.onclick=()=>{const removed=rows.splice(i,1)[0];save();render();showUndo("Removed "+removed.lpn,()=>{rows.splice(Math.min(i,rows.length),0,removed);save();render()})};
    x.appendChild(btn);
    tr.append(n,l,t,f,x);b.appendChild(tr);
  });
  if(rows.length&&!shown){b.innerHTML='<tr><td colspan="5" class="empty">No pallets match the search</td></tr>'}
  const fi=$("fltInfo");const fa=!!(q||ft);fi.hidden=!fa;if(fa)fi.textContent="Showing "+shown+" of "+rows.length+" pallets (counts above are for the whole log).";
  summary();
}
function extras(){const o=[];const e=parseInt($("expect").value,10);if(e>=0)o.push(["Expected pallets",String(e)]);[["trailer","Trailer number"],["sealIn","Seal in"],["sealOut","Seal out"]].forEach(f=>{const v=($(f[0]).value||"").trim();if(v)o.push([f[1],v])});const n=($("notes").value||"").trim();if(n)o.push(["Notes",n]);return o}
function summary(){
  $("undoLast").hidden=!rows.length;
  {const en=$("expNote"),fresh=exported&&exported.sig===logSig();
   if(exported&&rows.length){const t=new Date(exported.at),hm=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");en.hidden=false;en.textContent=fresh?"Exported at "+hm+".":"Changed since it was exported at "+hm+".";en.classList.toggle("stale",!fresh)}else en.hidden=true;
   if(!fresh)$("nextBar").hidden=true;}
  const ms=typeof manLive==="function"?manLive():null;
  updateDel();{const ex=parseInt($("expect").value,10),nar=innerWidth<400,dc=$("dockCnt");
    const full=ms?ms.found+" of "+ms.total+" on manifest":rows.length?rows.length+(ex>=0?" of "+ex:"")+" logged":"";
    dc.textContent=!rows.length&&!ms?"":ms?(nar?ms.found+"/"+ms.total:ms.found+"/"+ms.total+" on manifest"):(ex>=0?(nar?rows.length+"/"+ex:rows.length+" of "+ex+" logged"):rows.length+" logged");
    dc.title=full;dc.setAttribute("aria-label",full);}
  const ei=$("expInfo"),ex=parseInt($("expect").value,10);
  if(ex>=0&&ms&&ms.total===ex)ei.hidden=true;
  else if(ex>=0){const d=rows.length-ex;ei.hidden=false;ei.className="expinfo "+(d===0?"ok":d<0?"prog":"bad");ei.textContent=rows.length+" of "+ex+" expected"+(d===0?" ✓ all accounted for":d<0?" ("+(-d)+" to go)":" ("+d+" more than expected)")}else ei.hidden=true;
  const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
  $("sum").innerHTML="<span><b>"+rows.length+"</b>Total</span><span><b>"+c.BB+"</b>BB</span><span><b>"+c.FMCG+"</b>FMCG</span><span><b>"+c.FPP+"</b>FPP</span><span><b>"+c.Mixed+"</b>Mixed</span><span><b>"+rows.filter(r=>r.fsdu).length+"</b>FSDU</span>";
}
function lpnIssues(v){
  const out=[];
  const u=v.toUpperCase().replace(/\s+/g,"");
  if(rows.some(r=>r.lpn.toUpperCase().replace(/\s+/g,"")===u))out.push("already logged");
  const m=u.match(/^([A-Z]{1,3})(\d+)$/);
  if(!m)out.push("doesn’t look like an LPN (1 to 3 letters then digits)");
  else{
    const pf=typeof getPfx==="function"?getPfx():[];
    if(pf.length&&pf.indexOf(m[1])<0)out.push("prefix "+m[1]+" isn’t in your prefix list");
    if(m[2].length!==9&&m[2].length!==10)out.push("has "+m[2].length+" digits (usually 9 or 10)");
  }
  return out;
}
let pendingAdd=null;
function hideCheck(){pendingAdd=null;$("chkBar").hidden=true}
function tryAdd(v,scan){
  if(pendingAdd)return false;
  const issues=cfg.check?lpnIssues(v):[];
  if(!issues.length&&!(scan&&cfg.confirmScan)){addValue(v);return true}
  pendingAdd={v:v,type:$("type").value,fsdu:$("fsdu").checked};
  $("fsdu").checked=false;
  $("chkTxt").textContent=issues.length?"Check "+v+": "+issues.join("; ")+".":"Scanned "+v+" as "+pendingAdd.type+". Add it?";
  $("chkAdd").textContent=issues.length?"Add anyway":"Add";
  $("chkBar").hidden=false;
  $("msg").textContent="";
  if(issues.length)sfx("warn");
  return false;
}
function add(){
  const v=$("lpn").value.trim();
  if(!v){$("msg").textContent="Enter an LPN number first.";return}
  tryAdd(v);
  $("lpn").value="";$("lpn").focus();
}
function addValue(v,o){
  o=o||{type:$("type").value,fsdu:$("fsdu").checked};
  $("msg").textContent="";
  rows.push({lpn:v,type:o.type,fsdu:!!o.fsdu});
  if(o===undefined||!arguments[1])$("fsdu").checked=false;
  if(!cfg.keepType){$("type").value=cfg.defType;$("type").dataset.t=cfg.defType}
  const off=typeof manState==="function"&&(()=>{const s=manState();return s.total&&!s.has(v)})();
  save();render();sfx(off?"warn":"ok");
  if(rows.length===1&&($("recv").value||"").trim())delCollapsed=true;
  updateDel();flashAdded(v,o.type,!!o.fsdu);
}
let flashTimer=null;
function flashAdded(v,t,f){
  const el=$("flash");el.dataset.t=t;el.hidden=false;const en=document.querySelector(".entry");el.style.bottom=(matchMedia("(max-width:759px)").matches&&en?en.offsetHeight+10:20)+"px";
  let man="";
  if(typeof manState==="function"){const s=manState();if(s.total)man=s.has(v)?" · ✓ on manifest":" · ⚠ NOT on manifest"}
  el.classList.toggle("warn",man.indexOf("NOT")>=0);
  el.textContent="Added #"+rows.length+": "+v+" · "+t+(f?" · FSDU":"")+man;
  clearTimeout(flashTimer);flashTimer=setTimeout(()=>{el.hidden=true},man.indexOf("NOT")>=0?4000:2200);
}
function updateDel(){
  const card=$("delCard");if(!card)return;
  if(!rows.length)delCollapsed=false;
  const d=$("date").value,r=($("recv").value||"").trim(),e=parseInt($("expect").value,10),tr=($("trailer").value||"").trim();
  $("delSumTxt").textContent=[ukDate(d)||"No date",r||"No name",e>=0?e+" expected":"",tr?"Trailer "+tr:""].filter(Boolean).join(" · ");
  card.classList.toggle("hasrows",rows.length>0);
  card.classList.toggle("dcollapsed",delCollapsed&&rows.length>0);
  $("delSum").setAttribute("aria-expanded",String(!(delCollapsed&&rows.length>0)));
}
function showDate(){
  const v=$("date").value;$("dateShow").textContent=v?ukDate(v):"Pick a date";$("dateShow").classList.toggle("ph",!v);
}
$("chkSkip").onclick=()=>{hideCheck();$("lpn").focus()};
$("chkAdd").onclick=()=>{const p=pendingAdd;hideCheck();if(p)addValue(p.v,{type:p.type,fsdu:p.fsdu});$("lpn").focus()};
let undoTimer=null;
function showUndo(text,fn){
  $("undoTxt").textContent=text;$("undoBar").hidden=false;
  clearTimeout(undoTimer);
  $("undoBtn").onclick=()=>{clearTimeout(undoTimer);$("undoBar").hidden=true;fn()};
  undoTimer=setTimeout(()=>{$("undoBar").hidden=true},9000);
}
/* Each library file's fingerprint (Subresource Integrity). The browser refuses a file that doesn't match, so a
   changed or tampered copy on a CDN can't run in the app. tests/sri.js checks these against the CDNs every week. */
const SRI={
  "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js":"sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz",
  "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js":"sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js":"sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js":"sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js":"sha384-fCAW/rDWORTbQXSiB7mOg0QtQ5c+r0f544y6XoKjuVva0nMBlCpNUjiFeG5iMdS3",
  "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js":"sha384-fCAW/rDWORTbQXSiB7mOg0QtQ5c+r0f544y6XoKjuVva0nMBlCpNUjiFeG5iMdS3",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js":"sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js":"sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js":"sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F",
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js":"sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB"
};
function loadScript(src,test){
  return new Promise((res,rej)=>{
    if(test())return res();
    const el=document.createElement("script");
    const t=setTimeout(()=>rej(new Error("lib")),10000);
    el.crossOrigin="anonymous";if(SRI[src])el.integrity=SRI[src];
    el.src=src;
    el.onload=()=>{clearTimeout(t);test()?res():rej(new Error("lib"))};
    el.onerror=()=>{clearTimeout(t);rej(new Error("lib"))};
    document.head.appendChild(el);
  });
}

function ukDate(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));if(!m)return String(iso||"");const f=cfg.dateFmt;return f==="iso"?iso:f==="us"?m[2]+"/"+m[3]+"/"+m[1]:m[3]+"/"+m[2]+"/"+m[1]}
function isoDate(t){t=String(t||"").trim();let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t);if(m)return t;m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);if(!m)return "";let a=+m[1],b=+m[2],us=cfg.dateFmt==="us";if(a>12)us=false;else if(b>12)us=true;const dd=us?b:a,mm=us?a:b;return m[3]+"-"+String(mm).padStart(2,"0")+"-"+String(dd).padStart(2,"0")}

function localToday(){const n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")}

(function(){
  const el=$("date"),d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
  Object.defineProperty(el,"value",{get(){return d.get.call(this)},set(v){d.set.call(this,v);showDate()},configurable:true});
  ["input","change"].forEach(ev=>el.addEventListener(ev,()=>{showDate();updateDel()}));
  el.addEventListener("click",()=>{try{el.showPicker&&el.showPicker()}catch(e){}});
  ["recv","expect"].forEach(id=>$(id).addEventListener("input",updateDel));
  ["trailer","sealIn","sealOut"].forEach(id=>$(id).addEventListener("input",()=>{save();updateDel()}));
  $("delSum").onclick=()=>{delCollapsed=!delCollapsed;updateDel()};
  showDate();
})();

function markExported(){
  if(window.__histExporting)return;
  exported={at:new Date().toISOString(),sig:logSig()};save();summary();
  $("nextBar").hidden=false;
}
$("undoLast").onclick=()=>{
  if(!rows.length)return;
  const r=rows.pop();save();render();$("flash").hidden=true;
  showUndo("Removed "+r.lpn,()=>{rows.push(r);save();render()});
  $("lpn").focus();
};
$("nextNo").onclick=()=>{$("nextBar").hidden=true};
