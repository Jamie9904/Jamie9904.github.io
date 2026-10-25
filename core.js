const TYPES=["BB","FMCG","FPP","Mixed"];
let rows=[];
const $=id=>document.getElementById(id);
function syncType(){const v=$("type").value;$("type").dataset.t=v;document.querySelectorAll("#tyb button").forEach(b=>{const on=b.dataset.t===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})}
let cfg={defType:"BB",check:true,sound:true,size:"1",keepType:true,vibrate:true,confirmScan:false};
try{const c=JSON.parse(localStorage.getItem("lpncfg")||"null");if(c)cfg=Object.assign(cfg,c)}catch(e){}
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
    if(d){const o=JSON.parse(d);rows=o.rows||[];$("date").value=o.date||"";$("recv").value=o.recv||"";$("notes").value=o.notes||"";$("expect").value=o.expect||"";}
  }catch(e){}
  if(!$("date").value)$("date").value=new Date().toISOString().slice(0,10);
}
function save(){
  try{localStorage.setItem("lpnlog",JSON.stringify({rows,date:$("date").value,recv:$("recv").value,notes:$("notes").value,expect:$("expect").value}))}catch(e){}
}
function render(){
  syncType();
  const b=$("body");b.innerHTML="";
  if(!rows.length){b.innerHTML='<tr><td colspan="5" class="empty">No pallets logged yet</td></tr>'}
  const q=($("flt").value||"").trim().toUpperCase().replace(/\s+/g,""),ft=$("fltType").value;
  let shown=0;
  rows.forEach((r,i)=>{
    if(q&&r.lpn.toUpperCase().replace(/\s+/g,"").indexOf(q)<0)return;
    if(ft&&r.type!==ft)return;
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
    s.dataset.t=r.type;
    s.onchange=()=>{r.type=s.value;s.dataset.t=s.value;tr.dataset.t=s.value;save();summary()};
    t.appendChild(s);
    const f=document.createElement("td");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!r.fsdu;cb.setAttribute("aria-label","FSDU for "+r.lpn);
    cb.onchange=()=>{r.fsdu=cb.checked;save()};
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
function extras(){const o=[];const e=parseInt($("expect").value,10);if(e>=0)o.push(["Expected pallets",String(e)]);const n=($("notes").value||"").trim();if(n)o.push(["Notes",n]);return o}
function summary(){
  const ei=$("expInfo"),ex=parseInt($("expect").value,10);
  if(ex>=0){const d=rows.length-ex;ei.hidden=false;ei.className="expinfo "+(d===0?"ok":"bad");ei.textContent=rows.length+" of "+ex+" expected"+(d===0?" ✓ all accounted for":d<0?" ("+(-d)+" to go)":" ("+d+" more than expected)")}else ei.hidden=true;
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
  save();render();sfx("ok");
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
function loadScript(src,test){
  return new Promise((res,rej)=>{
    if(test())return res();
    const el=document.createElement("script");
    const t=setTimeout(()=>rej(new Error("lib")),10000);
    el.src=src;
    el.onload=()=>{clearTimeout(t);test()?res():rej(new Error("lib"))};
    el.onerror=()=>{clearTimeout(t);rej(new Error("lib"))};
    document.head.appendChild(el);
  });
}
