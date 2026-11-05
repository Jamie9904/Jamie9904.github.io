/* First time on this phone: nothing of the app's is stored yet (checked before anything is saved). */
const FIRST_OPEN=(()=>{try{for(let i=0;i<localStorage.length;i++){if(/^lpn/.test(localStorage.key(i)))return false}return true}catch(e){return false}})();
/* Site settings from config.js (loaded before this file): which features are shown, and which carry a note that
   they are still being tested. A missing or broken config.js means every feature on and no notes. */
const FEATURES=["report","manifestCheck","manifestPhotos","liveScan","scanByPhoto","torch","damage","noLpn","shareMissing","findLpn","shareApp","welcome","whatsNew"];
/* Pallets that arrived without an LPN are logged as "No LPN 1", "No LPN 2", … (numbered within the delivery). */
const isNoLpn=v=>/^No LPN \d+$/i.test(String(v==null?"":v).trim());
const SITE=(()=>{
  const c=window.LPN_CONFIG&&typeof window.LPN_CONFIG==="object"?window.LPN_CONFIG:{},f=c.features||{},t=c.testing||{},on={},test={};
  const own=(o,k)=>o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined; // only the file's own settings
  FEATURES.forEach(k=>{on[k]=own(f,k)!==false;test[k]=on[k]&&own(t,k)===true});
  return {on,test};
})();
const feat=k=>SITE.on[k]!==false;
/* The "in testing" note for feature k, put into el (where: an insertAdjacentElement position). Returns it, or null. */
function testNote(k,el,where){
  if(!SITE.test[k]||!el)return null;
  const n=document.createElement("p");n.className="note testnote";n.dataset.test=k;
  const what={noLpn:"Logging pallets with no LPN",manifestCheck:"The Manifest check",manifestPhotos:"Reading photos",liveScan:"Live scan",scanByPhoto:"Scan by photo",torch:"The torch",damage:"Marking damage",shareMissing:"Share missing list",findLpn:"Find an LPN",shareApp:"Share this app"}[k];
  n.textContent=k==="report"?"In testing: reports may not always arrive yet, so for anything urgent also use Download problem report in Settings."
    :"In testing: "+what+" may not always work yet, so check what it gives you"+(feat("report")?", and use Report if something goes wrong.":".");
  el.insertAdjacentElement(where||"beforeend",n);return n;
}
/* Help text with the parts for switched-off features taken out: data-f="x" is removed when x is off, data-nf="x"
   when x is on. Numbered headings ("1. …") are renumbered so the Guide has no gaps. */
function siteHtml(html){
  const t=document.createElement("template");t.innerHTML=html;
  // data-f="a|b": kept while either feature is on.
  t.content.querySelectorAll("[data-f]").forEach(e=>{if(!e.dataset.f.split("|").some(feat))e.remove()});
  t.content.querySelectorAll("[data-nf]").forEach(e=>{if(feat(e.dataset.nf))e.remove()});
  t.content.querySelectorAll("[data-f],[data-nf]").forEach(e=>{e.removeAttribute("data-f");e.removeAttribute("data-nf")});
  let n=0;t.content.querySelectorAll("h3").forEach(h=>{const m=h.textContent.match(/^\d+\. (.*)$/);if(m)h.textContent=(++n)+". "+m[1]});
  return t.innerHTML;
}
/* Problem log: the last 300 notable events (manifest reads, script errors) kept on this device, so a problem
   report can be downloaded from Settings and sent for troubleshooting. It only leaves the device when attached to a report the user sends (Settings > Report a problem or idea). */
function diag(kind,msg){
  try{
    let a=[];try{a=JSON.parse(localStorage.getItem("lpndiag")||"[]");if(!Array.isArray(a))a=[]}catch(e){a=[]}
    a.push({t:new Date().toISOString(),k:String(kind).slice(0,20),m:String(msg).slice(0,300)});
    if(a.length>300)a=a.slice(-300);
    localStorage.setItem("lpndiag",JSON.stringify(a));
  }catch(e){}
}
window.addEventListener("error",e=>diag("error",(e.message||"error")+(e.filename?" at "+String(e.filename).split("/").pop()+":"+e.lineno:"")));
window.addEventListener("unhandledrejection",e=>{let m="";try{const r=e.reason;m=(r&&r.message)||String(r)}catch(x){m="unknown"}diag("error","Unhandled: "+m)});
const TYPES=["BB","FMCG","FPP","Mixed"];
let rows=[];
let delCollapsed=false;
const DEL_F=["date","recv","notes","expect","trailer","sealIn","sealOut"];
let exported=null;
function logSig(){let h=0;const s=rows.map(r=>r.lpn+"|"+r.type+"|"+(r.fsdu?1:0)+(r.dmg?"|"+r.dmg:"")+(r.desc?"|d:"+r.desc:"")).join(",");for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return rows.length+":"+h}
/* "-TR4471" for file names: from the trailer box, or from the trailer given (the Manifest check passes the trailer of
   the delivery it checked, or "" when that isn't known). */
function fileTag(tr){
  const t=String((tr!==undefined?tr:$("trailer")&&$("trailer").value)||"").trim().replace(/[^A-Za-z0-9-]+/g,"-").replace(/-{2,}/g,"-").replace(/^-+|-+$/g,"").slice(0,20);
  return t?"-"+t:"";
}
function getDel(){const o={};DEL_F.forEach(k=>{o[k]=$(k).value});o.exp=exported;return o}
function setDel(o){o=o||{};DEL_F.forEach(k=>{$(k).value=k==="date"?(o.date||localToday()):(o[k]||"")});exported=o.exp||null;sealHint();syncClear()}
/* The Clear trailer, seals and notes button is only active when one of them has something in it. */
function syncClear(){const b=$("delClear");if(b)b.disabled=!["trailer","sealIn","sealOut","notes"].some(k=>($(k).value||"").trim())}
const $=id=>document.getElementById(id);
function syncType(){const v=$("type").value;$("type").dataset.t=v;document.querySelectorAll("#tyb button").forEach(b=>{const on=b.dataset.t===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})}
let cfg={defType:"BB",check:true,sound:true,size:"1",keepType:true,vibrate:true,confirmScan:false,dateFmt:"uk"};
/* Saved data can come back from a backup file, so everything read from storage is checked and tidied before use.
   A damaged or crafted backup then can't stop the app starting or put anything odd into an export. */
const isTxt=v=>typeof v==="string"||typeof v==="number";
const CFG_OK={size:["1","1.12","1.25"],dateFmt:["uk","us","iso"],defType:TYPES};
function cleanCfg(c){const out={};if(c&&typeof c==="object"&&!Array.isArray(c))Object.keys(cfg).forEach(k=>{if(typeof c[k]===typeof cfg[k]&&(!CFG_OK[k]||CFG_OK[k].indexOf(c[k])>=0))out[k]=c[k]});return out}
const isoTime=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(v)&&!isNaN(new Date(v));
function cleanRows(a){return (Array.isArray(a)?a:[]).filter(r=>r&&typeof r==="object"&&isTxt(r.lpn)&&String(r.lpn).trim()).map(r=>{const o={lpn:String(r.lpn).trim().slice(0,100),type:TYPES.indexOf(r.type)>=0?r.type:"Mixed",fsdu:!!r.fsdu};const g=isTxt(r.dmg)?String(r.dmg).replace(/\s+/g," ").trim().slice(0,60):"";if(g)o.dmg=g;const d=isTxt(r.desc)?String(r.desc).replace(/\s+/g," ").trim().slice(0,60):"";if(d)o.desc=d;return o})}
function cleanDel(o){
  o=o&&typeof o==="object"?o:{};const out={};
  DEL_F.forEach(k=>{out[k]=isTxt(o[k])?String(o[k]).slice(0,2000):""});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.date))out.date="";
  const e=o.exp;out.exp=e&&typeof e==="object"&&isoTime(e.at)&&typeof e.sig==="string"?{at:e.at,sig:e.sig}:null;
  return out;
}
function cleanHist(a){return (Array.isArray(a)?a:[]).filter(h=>h&&typeof h==="object"&&!Array.isArray(h)).map((h,i)=>Object.assign(cleanDel(h),{id:isTxt(h.id)?String(h.id):"r"+Date.now()+i,saved:isoTime(h.saved)?h.saved:"",rows:cleanRows(h.rows)}))}
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
/* Keeps "No LPN n" numbers unique in the log: Undo or an import can bring back a number that has been used again
   since, so a repeat gets the next free number. */
function fixNoLpn(){
  const used=new Set();let max=0;rows.forEach(r=>{const m=/^No LPN (\d+)$/i.exec(String(r.lpn).trim());if(m)max=Math.max(max,+m[1])});
  rows.forEach(r=>{const m=/^No LPN (\d+)$/i.exec(String(r.lpn).trim());if(!m)return;if(used.has(+m[1]))r.lpn="No LPN "+(++max);else used.add(+m[1])});
}
function save(){
  fixNoLpn();
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
    // The LPN is a button, so it can be edited with the keyboard and screen readers too, not only by tapping.
    const l=document.createElement("td");l.className="l";
    const eb=document.createElement("button");eb.type="button";eb.className="lpnedit";eb.textContent=r.lpn;eb.title=feat("damage")?"Tap to edit or mark damage":"Tap to edit";eb.setAttribute("aria-label","Edit LPN "+r.lpn+(r.dmg?", damaged: "+r.dmg:"")+(feat("damage")?", or mark damage":""));eb.dataset.i=i;l.appendChild(eb);
    if(r.dmg){tr.classList.add("dmg");const dt=document.createElement("span");dt.className="dmgtag";dt.textContent="Damaged: "+r.dmg;l.appendChild(dt)}
    if(isNoLpn(r.lpn))eb.classList.add("nolpn");
    if(r.desc){const dd=document.createElement("span");dd.className="desctag";dd.textContent=r.desc;l.appendChild(dd)}
    l.onclick=()=>{
      if(l.querySelector("input"))return;
      const noL=isNoLpn(r.lpn);
      const inp=document.createElement("input");inp.value=noL?"":r.lpn;inp.setAttribute("autocapitalize","characters");inp.setAttribute("aria-label",noL?"LPN for "+r.lpn+", if you find one":"Edit LPN");if(noL)inp.placeholder="LPN if found";
      l.textContent="";l.appendChild(inp);
      // Damage choices in a row under the pallet while it is being edited. Taps on them don't take focus from the
      // LPN box (phones would otherwise close the edit before the tap lands).
      // (with damage switched off in config.js, an empty row stands in, so the rest works the same)
      // (with damage switched off in config.js and no description to edit, an empty row stands in, so the rest works the same)
      const wantDesc=noL||!!r.desc,useRow=feat("damage")||wantDesc;
      const dr=useRow?dmgRow(r,(g,key)=>{dmgPick=g;finish(true,key)},{damage:feat("damage"),desc:wantDesc,save:key=>finish(true,key)}):document.createElement("tr");if(useRow)tr.after(dr);
      if(focusDesc&&dr._desc){focusDesc=false;dr._desc.focus()}else{focusDesc=false;inp.focus();inp.select()}
      // Keep the choices clear of the entry bar on phones (the page keeps room for it when scrolling).
      try{dr.scrollIntoView({block:"nearest"})}catch(e){}
      let done=false,dmgPick;
      const finish=(ok,key)=>{
        if(done)return;done=true;dr.remove();
        // Everything changed in this edit goes back with one Undo.
        const said=[],backs=[],name=r.lpn;
        if(ok&&dr._desc){
          const d=dr._desc.value.replace(/\s+/g," ").trim().slice(0,60),wasD=r.desc||"";
          if(d!==wasD){if(d)r.desc=d;else delete r.desc;said.push(d?"Description saved for "+name:"Description removed from "+name);backs.push(()=>{if(wasD)r.desc=wasD;else delete r.desc})}
        }
        if(ok&&dmgPick!==undefined&&dmgPick!==(r.dmg||"")){
          const was=r.dmg||"";if(dmgPick)r.dmg=dmgPick;else delete r.dmg;
          said.push(dmgPick?"Marked "+name+" as damaged ("+dmgPick+")":"Damage note removed from "+name);backs.push(()=>{if(was)r.dmg=was;else delete r.dmg});
        }
        const v=inp.value.trim();
        if(ok&&v&&v!==r.lpn){
          const u=v.toUpperCase().replace(/\s+/g,"");
          const dup=rows.some((z,k)=>k!==i&&z.lpn.toUpperCase().replace(/\s+/g,"")===u);
          const old=r.lpn;r.lpn=v;
          $("msg").textContent=dup?"Note: "+v+" is already in the log.":"";
          if(dup)sfx("warn");
          said.push("Changed "+old+" to "+v);backs.push(()=>{r.lpn=old});
        }
        if(said.length){save();showUndo(said.join(". "),()=>{backs.forEach(f=>f());save();render()})}
        render();
        // Back on the edited LPN, so keyboard users don't lose their place.
        // (also when focus was on a part of the table that has just been redrawn)
        if(key||!document.activeElement||document.activeElement===document.body){const back=document.querySelector('#body .lpnedit[data-i="'+i+'"]');if(back)back.focus({preventScroll:!key})}
      };
      // Finish when focus leaves both the LPN box and the damage choices.
      inp.onblur=()=>setTimeout(()=>{if(!dr.contains(document.activeElement)&&document.activeElement!==inp)finish(true)},0);
      dr.addEventListener("focusout",()=>setTimeout(()=>{if(!dr.contains(document.activeElement)&&document.activeElement!==inp)finish(true)},0));
      dr.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();finish(false,true)}});
      inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();finish(true,true)}else if(e.key==="Escape"){finish(false,true)}
        // Tab goes on to the damage choices (they come after the rest of the row on the page).
        else if(e.key==="Tab"&&!e.shiftKey&&dr.querySelector("input,button")){e.preventDefault();dr.querySelector("input,button").focus()}};
      if(dr.querySelector("input,button"))dr.querySelector("input,button").addEventListener("keydown",e=>{if(e.key==="Tab"&&e.shiftKey){e.preventDefault();inp.focus()}});
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
/* The damage choices shown under a pallet while it is edited. pick(reason or "", fromKeyboard). */
const DMG_REASONS=["Crushed","Wet"];
function dmgRow(r,pick,opt){
  opt=opt||{damage:true};
  const tr=document.createElement("tr");tr.className="dmgrow";
  const td=document.createElement("td");td.colSpan=5;tr.appendChild(td);
  // Description (for pallets with no LPN, or any pallet that already has one): saved when the edit closes.
  if(opt.desc){
    const dl=document.createElement("div");dl.className="descline";
    const id="desc"+Math.random().toString(36).slice(2,8),lb=document.createElement("label");lb.htmlFor=id;lb.textContent="Description";
    const di=document.createElement("input");di.id=id;di.maxLength=60;di.value=r.desc||"";di.placeholder="Optional: wrap, labels, PO number";
    di.setAttribute("aria-label","Description for "+r.lpn);
    // A handheld scanner can type the next pallet's LPN here (the box opens by itself after No LPN): if a fresh
    // description is just one LPN-shaped word, it is logged as the next pallet instead.
    di.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const v=di.value.trim().toUpperCase().replace(/\s+/g,"");
      if(!r.desc&&/^[A-Z]{1,3}\d{8,12}$/.test(v)){di.value="";opt.save&&opt.save(false);$("lpn").value=v;add();return}
      opt.save&&opt.save(true)}};
    dl.append(lb,di);td.appendChild(dl);tr._desc=di;
    if(isNoLpn(r.lpn))testNote("noLpn",td);
  }
  if(opt.damage===false)return tr;
  const box=document.createElement("div");box.className="dmgbox";box.setAttribute("role","group");box.setAttribute("aria-label","Damage for "+r.lpn);td.appendChild(box);
  const lab=document.createElement("span");lab.className="dmglab";lab.textContent="Damage:";box.appendChild(lab);
  const cur=r.dmg||"",keep=e=>e.preventDefault();
  const btn=(text,val)=>{const b=document.createElement("button");b.type="button";b.textContent=text;b.setAttribute("aria-pressed",String(cur===val||!!(val===null&&cur&&DMG_REASONS.indexOf(cur)<0)));
    b.addEventListener("pointerdown",keep);b.addEventListener("mousedown",keep);box.appendChild(b);return b};
  const nb=btn("None","");nb.classList.add("none");nb.onclick=e=>pick("",e.detail===0);
  DMG_REASONS.forEach(x=>{btn(x,x).onclick=e=>pick(x,e.detail===0)});
  const oth=btn("Other…",null);
  const ow=document.createElement("span");ow.className="dmgother";ow.hidden=true;
  const oi=document.createElement("input");oi.maxLength=60;oi.setAttribute("aria-label","Other damage, for example torn label");oi.placeholder="What’s wrong?";
  const ok=document.createElement("button");ok.type="button";ok.textContent="Save";ok.addEventListener("pointerdown",keep);ok.addEventListener("mousedown",keep);
  const go=key=>{const v=oi.value.replace(/\s+/g," ").trim().slice(0,60);if(v)pick(v,key);else oi.focus()};
  ok.onclick=e=>go(e.detail===0);oi.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();go(true)}};
  ow.append(oi,ok);box.appendChild(ow);
  oth.onclick=()=>{ow.hidden=false;if(cur&&DMG_REASONS.indexOf(cur)<0)oi.value=cur;oi.focus()};
  const tn=testNote("damage",td);if(tn)tn.style.margin="0 0 6px";
  return tr;
}
function extras(){const o=[];const e=parseInt($("expect").value,10);if(e>=0)o.push(["Expected pallets",String(e)]);[["trailer","Trailer number"],["sealIn","Seal in"],["sealOut","Seal out"]].forEach(f=>{const v=($(f[0]).value||"").trim();if(v)o.push([f[1],v])});const n=($("notes").value||"").trim();if(n)o.push(["Notes",n]);rows.forEach(r=>{if(r.dmg)o.push(["Damaged pallet",r.lpn+": "+r.dmg])});rows.forEach(r=>{if(r.desc)o.push(["Pallet description",r.lpn+": "+r.desc])});return o}
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
/* LPN digit counts: 9 or 10 after the letters, except IM (full pallet picks), which has 10 or 11. */
function lpnDigitsOk(x){const m=String(x).toUpperCase().replace(/\s+/g,"").match(/^([A-Z]+)(\d+)$/);if(!m)return false;const n=m[2].length;return m[1]==="IM"?n===10||n===11:n===9||n===10}
function lpnIssues(v){
  const out=[];
  const u=v.toUpperCase().replace(/\s+/g,"");
  if(rows.some(r=>r.lpn.toUpperCase().replace(/\s+/g,"")===u))out.push("already logged");
  const m=u.match(/^([A-Z]{1,3})(\d+)$/);
  if(!m)out.push("doesn’t look like an LPN (1 to 3 letters then digits)");
  else{
    const pf=typeof getPfx==="function"?getPfx():[];
    if(pf.length&&pf.indexOf(m[1])<0)out.push("prefix "+m[1]+" isn’t in your prefix list");
    if(!lpnDigitsOk(u))out.push("has "+m[2].length+" digits ("+(m[1]==="IM"?"IM numbers have 10 or 11":"usually 9 or 10")+")");
  }
  return out;
}
let pendingAdd=null;
// Escape skips a waiting warning, but not while a panel is open or another box (like an LPN being edited) has the key.
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||$("chkBar").hidden)return;
  if(($("panel")&&!$("panel").hidden)||($("instBox")&&!$("instBox").hidden))return;
  const t=e.target;if(t&&/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)&&t.id!=="lpn")return;
  $("chkSkip").click();
});
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
  // A warning is waiting for an answer: keep this LPN in the box rather than losing it (a handheld scanner types
  // and presses Enter without anyone looking at the screen).
  if(pendingAdd){$("msg").textContent="Answer the check first (Skip or Add anyway), then add "+v+".";sfx("warn");$("lpn").select();return}
  tryAdd(v);
  $("lpn").value="";$("lpn").focus();
}
function addValue(v,o){
  o=o||{type:$("type").value,fsdu:$("fsdu").checked};
  $("msg").textContent="";
  rows.push({lpn:v,type:o.type,fsdu:!!o.fsdu});
  if(o===undefined||!arguments[1])$("fsdu").checked=false;
  if(!cfg.keepType){$("type").value=cfg.defType;$("type").dataset.t=cfg.defType}
  const off=!isNoLpn(v)&&typeof manState==="function"&&(()=>{const s=manState();return s.total&&!s.has(v)})();
  save();render();sfx(off?"warn":"ok");
  if(rows.length===1&&($("recv").value||"").trim())delCollapsed=true;
  updateDel();flashAdded(v,o.type,!!o.fsdu);
}
/* No LPN button: logs a pallet with no LPN as the next "No LPN n", with the type and FSDU chosen, then opens it so a
   description (or the real LPN, if found) can be added. */
let focusDesc=false;
function addNoLpn(){
  if(pendingAdd){$("msg").textContent="Answer the check first (Skip or Add anyway), then add the pallet with no LPN.";sfx("warn");return}
  let n=0;rows.forEach(r=>{const m=/^No LPN (\d+)$/i.exec(String(r.lpn).trim());if(m)n=Math.max(n,+m[1])});
  addValue("No LPN "+(n+1));
  const i=rows.length-1;
  setTimeout(()=>{const b=document.querySelector('#body .lpnedit[data-i="'+i+'"]');if(b){focusDesc=true;b.click()}},0);
}
let flashTimer=null;
function flashAdded(v,t,f){
  const el=$("flash");el.dataset.t=t;el.hidden=false;const en=document.querySelector(".entry");const ub=$("undoBar"),ph=matchMedia("(max-width:759px)").matches;
  // On phones the Undo bar sits in the same place, so the note goes just above it while it shows.
  el.style.bottom=((ph&&en?en.offsetHeight+10:20)+(ph&&ub&&!ub.hidden?ub.offsetHeight+8:0))+"px";
  let man="";
  if(typeof manState==="function"&&!isNoLpn(v)){const s=manState();if(s.total)man=s.has(v)?" · ✓ on manifest":" · ⚠ NOT on manifest"}
  el.classList.toggle("warn",man.indexOf("NOT")>=0);
  el.textContent="Added #"+rows.length+": "+v+" · "+t+(f?" · FSDU":"")+man;
  clearTimeout(flashTimer);flashTimer=setTimeout(()=>{el.hidden=true},man.indexOf("NOT")>=0?4000:2200);
}
/* A gentle check of the seal numbers: the same number in both boxes, or two lengths that differ (seals on one trailer
   are normally the same kind). While typing it only clears a warning; a new one shows when you leave the box. */
function sealIssue(){
  const n=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,""),a=n($("sealIn").value),b=n($("sealOut").value);
  if(!a||!b)return "";
  if(a===b)return "Seal in and seal out are the same number. Check them: the seal put on should be a new one.";
  if(a.length!==b.length)return "Seal in has "+a.length+" characters and seal out has "+b.length+". Check neither is mistyped.";
  return "";
}
function sealHint(live){const w=$("sealWarn");if(!w)return;const t=sealIssue();if(live&&t&&w.textContent!==t){if(w.textContent)w.textContent="";return}if(w.textContent!==t)w.textContent=t}
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
/* On phones the Undo bar shows just above the entry bar (styles.css), where it can be seen. It stays 20 seconds,
   and doesn't go while it has focus. */
function showUndo(text,fn){
  const bar=$("undoBar");
  $("undoTxt").textContent=text;bar.hidden=false;
  const fl=$("flash");if(fl)fl.hidden=true;
  clearTimeout(undoTimer);
  const hide=()=>{if(bar.contains(document.activeElement)){undoTimer=setTimeout(hide,3000);return}bar.hidden=true};
  $("undoBtn").onclick=()=>{clearTimeout(undoTimer);bar.hidden=true;fn()};
  undoTimer=setTimeout(hide,20000);
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
  ["trailer","sealIn","sealOut"].forEach(id=>$(id).addEventListener("input",()=>{save();updateDel();sealHint(true)}));
  ["trailer","sealIn","sealOut","notes"].forEach(id=>$(id).addEventListener("input",syncClear));
  syncClear();
  // Clear trailer, seals and notes: for the next trailer on the same day, keeping the date, name and expected count.
  $("delClear").onclick=()=>{
    const ids=["trailer","sealIn","sealOut","notes"],was={};ids.forEach(k=>was[k]=$(k).value);
    if(!ids.some(k=>was[k].trim()))return;
    ids.forEach(k=>$(k).value="");save();updateDel();sealHint();syncClear();
    showUndo("Cleared the trailer, seals and notes",()=>{ids.forEach(k=>$(k).value=was[k]);save();updateDel();sealHint();syncClear()});
    $("trailer").focus();
  };
  ["sealIn","sealOut"].forEach(id=>$(id).addEventListener("change",()=>sealHint()));
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
