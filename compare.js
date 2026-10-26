/* ---- manifest check ---- */
let mergeLog=true;try{if(localStorage.getItem("lpnmergelog")==="0")mergeLog=false}catch(e){}
let logLpns=null,logSrc=null,logPdfSrc=null,logSheets=null;
const norm=v=>String(v).toUpperCase().replace(/[^A-Z0-9]/g,"");
const cmpMsg=t=>{$("cmpMsg").textContent=t};
function getPfx(){return [...new Set(($("cmpPfx").value||"").toUpperCase().split(/[^A-Z]+/).filter(Boolean))]}
function okPfx(t){
  const pf=getPfx();if(!pf.length)return true;
  const u=String(t).toUpperCase().replace(/\s+/g,"");
  return pf.some(p=>u.startsWith(p)&&/^[0-9]/.test(u.slice(p.length)));
}
function lpnHint(){
  const pf=getPfx();
  return " Each LPN is one of these letter prefixes followed by 9 or 10 digits: "+(pf.length?pf.join(", "):"1 to 3 capital letters")+". Only list entries that start with one of those prefixes.";
}
async function loadExcel(){
  const t=()=>window.ExcelJS;
  try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",t)}
  catch(e){await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",t)}
}
function lpnsFromGrid(g){
  let col=-1,start=-1;
  g.forEach((row,i)=>{if(col>=0)return;row.forEach((c,k)=>{if(col<0&&String(c).trim().toUpperCase()==="LPN"){col=k;start=i}})});
  if(col<0)throw new Error("Couldn't find an LPN column in that file.");
  const out=[];
  for(let i=start+1;i<g.length;i++){const t=String(g[i][col]==null?"":g[i][col]).trim();if(!t)break;out.push(t)}
  return out;
}
function cellText(v){return v==null?"":v instanceof Date?v.toISOString().slice(0,10):typeof v==="object"?(v.richText?v.richText.map(x=>x.text).join(""):(v.text||v.result||"")):v}
function trimGrid(g){
  const rows=g.map(r=>r.map(c=>c==null?"":c));
  const empty=r=>r.every(c=>String(c).trim()==="");
  while(rows.length&&empty(rows[0]))rows.shift();
  while(rows.length&&empty(rows[rows.length-1]))rows.pop();
  let nc=0;rows.forEach(r=>{for(let i=r.length-1;i>=0;i--){if(String(r[i]).trim()!==""){nc=Math.max(nc,i+1);break}}});
  return rows.map(r=>{const o=r.slice(0,nc);while(o.length<nc)o.push("");return o});
}
function logGridFrom(rows,d,who){
  const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>{if(c[r.type]!==undefined)c[r.type]++});
  const side=[["Pallet Type","Count"],["Brown Box",c.BB],["FMCG",c.FMCG],["FPP",c.FPP],["Mixed",c.Mixed],["Total",rows.length],["FSDU (not in total)",rows.filter(r=>r.fsdu).length],["",""],["Delivery Details",""],["Date",d||""],["Received by",who||""]];
  const n=Math.max(rows.length+1,side.length),g=[];
  for(let i=0;i<n;i++){
    const left=i===0?["LPN","Pallet Type","FSDU"]:rows[i-1]?[rows[i-1].lpn,rows[i-1].type,rows[i-1].fsdu?"Yes":"No"]:["","",""];
    g.push([...left,"",...(side[i]||["",""])]);
  }
  return g;
}
async function readLog(f){
  logSrc=null;logPdfSrc=null;logSheets=null;
  const name=f.name.toLowerCase();
  if(name.endsWith(".pdf"))return readLogPdf(f,m=>cmpMsg("Reading log PDF: "+m));
  if(name.endsWith(".xlsx")){
    await loadExcel();
    const ab=await f.arrayBuffer();const wb=new ExcelJS.Workbook();await wb.xlsx.load(ab);
    if(!wb.worksheets.length)throw new Error("That file has no sheets.");
    const sheets=wb.worksheets.map(ws=>{const grid=[];ws.eachRow({includeEmpty:true},row=>{grid.push((row.values||[]).slice(1).map(cellText))});return {name:ws.name,grid}});
    const lp=lpnsFromGrid(sheets[0].grid);
    logSrc={buf:ab.slice(0),name:f.name};logSheets=sheets;return lp;
  }
  const text=await f.text();
  let g;
  if(/<table/i.test(text)){const doc=new DOMParser().parseFromString(text,"text/html");g=[...doc.querySelectorAll("tr")].map(tr=>[...tr.children].map(c=>c.textContent.trim()))}
  else g=text.split(/\r?\n/).map(l=>l.split(",").map(x=>x.replace(/^"|"$/g,"").trim()));
  const lp=lpnsFromGrid(g);logSheets=[{name:"Log copy",grid:g}];return lp;
}
async function shrink(f){
  const b=await createImageBitmap(f);
  const sc=Math.min(1,1800/Math.max(b.width,b.height));
  const cv=document.createElement("canvas");cv.width=Math.round(b.width*sc);cv.height=Math.round(b.height*sc);
  cv.getContext("2d").drawImage(b,0,0,cv.width,cv.height);
  return new Promise(res=>cv.toBlob(res,"image/jpeg",0.85));
}
function extractLpns(text){
  const pf=getPfx().sort((a,b)=>b.length-a.length);
  const re=new RegExp("\\b("+(pf.length?pf.join("|"):"[A-Z]{1,3}")+")[ \\t]?([0-9ODILSBZ]{8,12})\\b","gi");
  const out=[];let m;
  while((m=re.exec(text))){
    const part=m[2].toUpperCase();
    if((part.match(/[0-9]/g)||[]).length<6)continue;
    out.push(m[1].toUpperCase()+part.replace(/[OD]/g,"0").replace(/[IL]/g,"1").replace(/S/g,"5").replace(/B/g,"8").replace(/Z/g,"2"));
  }
  return out;
}
async function prep(f){
  const b=await createImageBitmap(f);
  const long=Math.max(b.width,b.height);
  const sc=long<2400?Math.min(3,2400/long):Math.min(1,3200/long);
  const cv=document.createElement("canvas");cv.width=Math.round(b.width*sc);cv.height=Math.round(b.height*sc);
  const ctx=cv.getContext("2d");ctx.imageSmoothingQuality="high";ctx.drawImage(b,0,0,cv.width,cv.height);
  const im=ctx.getImageData(0,0,cv.width,cv.height),d=im.data,n=d.length/4,hist=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4){const g=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114)|0;d[i]=d[i+1]=d[i+2]=g;hist[g]++}
  let acc=0,lo=0,hi=255;
  for(let i=0;i<256;i++){acc+=hist[i];if(acc>=n*0.01){lo=i;break}}
  acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>=n*0.01){hi=i;break}}
  const span=Math.max(1,hi-lo);
  for(let i=0;i<d.length;i+=4){const v=Math.max(0,Math.min(255,((d[i]-lo)*255/span)|0));d[i]=d[i+1]=d[i+2]=v}
  ctx.putImageData(im,0,0);return cv;
}
function cropScaled(cv,bb){
  const pad=6,x=Math.max(0,bb.x0-pad),y=Math.max(0,bb.y0-pad);
  const w=Math.max(1,Math.min(cv.width-x,bb.x1-bb.x0+2*pad)),h=Math.max(1,Math.min(cv.height-y,bb.y1-bb.y0+2*pad));
  const sc=Math.min(4,Math.max(1,110/h)),m=16;
  const c=document.createElement("canvas");c.width=Math.round(w*sc)+2*m;c.height=Math.round(h*sc)+2*m;
  const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
  ctx.imageSmoothingQuality="high";ctx.drawImage(cv,x,y,w,h,m,m,Math.round(w*sc),Math.round(h*sc));
  return c;
}
async function ocrLpns(f){
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",()=>window.Tesseract);
  const cv=await prep(f);
  const w=await Tesseract.createWorker("eng");
  try{
    await w.setParameters({tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",preserve_interword_spaces:"1"});
    const r=(await w.recognize(cv)).data;
    const out=[],orig=new Set();
    await w.setParameters({tessedit_pageseg_mode:"7"});
    for(const wd of (r.words||[])){
      const found=extractLpns(wd.text);
      if(found.length!==1)continue;
      orig.add(found[0]);
      let val=found[0];
      try{
        const again=extractLpns((await w.recognize(cropScaled(cv,wd.bbox))).data.text.replace(/\s+/g,""));
        if(again.length===1)val=again[0];
      }catch(e){}
      out.push(val);
    }
    extractLpns(r.text).forEach(x=>{if(!orig.has(x))out.push(x)});
    return out;
  }finally{await w.terminate()}
}
async function readPhoto(f){return ocrLpns(f)}
async function readLogPhoto(f){return ocrLpns(f)}
async function sendFile(buf,name,mime){return deliver(buf,name,mime)}
function oddNote(id){
  const odd=$(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).filter(x=>{const m=x.match(/\d+$/);const n=m?m[0].length:0;return n!==9&&n!==10});
  return odd.length?" These have an unusual number of digits, so check them against the paper copy: "+odd.slice(0,8).join(", ")+(odd.length>8?" and "+(odd.length-8)+" more":"")+".":"";
}
function addNums(a,id){
  id=id||"cmpNums";
  const cur=$(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const seen=new Set(cur.map(norm));
  a.forEach(x=>{x=String(x).trim();if(x&&!seen.has(norm(x))){seen.add(norm(x));cur.push(x)}});
  $(id).value=cur.join("\n");
}
$("cmpLogBtn").onclick=()=>{$("cmpLogFile").value="";$("cmpLogFile").click()};
$("cmpLogFile").onchange=async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  cmpMsg("Reading log…");
  try{const l=await readLog(f);$("cmpLogNums").value=l.join("\n");$("cmpLogName").textContent=f.name+": "+l.length+" LPNs found"+(logSrc&&mergeLog?". The comparison will be added to this file as a new tab.":"");cmpMsg(/\.pdf$/i.test(f.name)?"Read from PDF. Check the log numbers are correct, then compare."+oddNote("cmpLogNums"):"")}
  catch(err){$("cmpLogName").textContent="";cmpMsg(err.message||"Couldn't read that file.")}
};
$("cmpLogPhotoBtn").onclick=()=>{$("cmpLogPhotoFile").value="";$("cmpLogPhotoFile").click()};
$("cmpLogPhotoFile").onchange=async e=>{
  const files=[...(e.target.files||[])];if(!files.length)return;
  for(let i=0;i<files.length;i++){
    cmpMsg("Reading log photo "+(i+1)+" of "+files.length+"…");
    try{addNums(await readLogPhoto(files[i]),"cmpLogNums")}
    catch(err){cmpMsg("Couldn't read log photo "+(i+1)+": "+((err&&err.message)||"error")+" You can type the numbers in the box instead.");return}
  }
  logSrc=null;logPdfSrc=null;logSheets=null;$("cmpLogName").textContent="Read from photo of printed log";
  cmpMsg("Done. Check the log numbers are correct, then compare."+oddNote("cmpLogNums"));
};
async function loadPdfJs(){
  const t=()=>window.pdfjsLib;
  const set=b=>{pdfjsLib.GlobalWorkerOptions.workerSrc=b+"pdf.worker.min.js"};
  try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",t);set("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/")}
  catch(e){await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",t);set("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/")}
}
function lpnsFromText(text){
  const pf=getPfx().sort((a,b)=>b.length-a.length);
  const re=new RegExp("\\b("+(pf.length?pf.join("|"):"[A-Z]{1,3}")+")[ \\t]?([0-9]{8,12})\\b","gi");
  const out=[];let m;
  while((m=re.exec(text)))out.push(m[1].toUpperCase()+m[2]);
  return out;
}
async function readPdf(f,say){
  await loadPdfJs();
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
  let text="";
  for(let p=1;p<=pdf.numPages;p++){
    const tc=await (await pdf.getPage(p)).getTextContent();
    text+=tc.items.map(i=>i.str+(i.hasEOL?"\n":" ")).join("")+"\n";
  }
  const found=lpnsFromText(text);
  if(found.length)return found;
  const out=[],n=Math.min(pdf.numPages,20);
  for(let p=1;p<=n;p++){
    say("reading page "+p+" of "+n+"…");
    const page=await pdf.getPage(p),vp=page.getViewport({scale:2});
    const cv=document.createElement("canvas");cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
    await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;
    const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",0.85));
    out.push(...await readPhoto(blob));
  }
  return out;
}
async function readLogPdf(f,say){
  await loadPdfJs();
  const ab=await f.arrayBuffer();
  logPdfSrc={buf:ab.slice(0),name:f.name};
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(ab.slice(0))}).promise;
  try{
    const meta=await pdf.getMetadata();
    const kw=(meta&&meta.info&&meta.info.Keywords)||"";
    if(kw.indexOf("LPNLOG2:")===0){
      try{
        const o=JSON.parse(decodeURIComponent(kw.slice(8)));
        const rw=(o.rows||[]).map(r=>({lpn:String(r[0]),type:String(r[1]),fsdu:!!r[2]}));
        if(rw.length){logSheets=[{name:"Log copy",grid:logGridFrom(rw,o.d,o.r)}];return rw.map(r=>r.lpn)}
      }catch(e){}
    }
    if(kw.indexOf("LPNLOG|")===0){const l=kw.slice(7).split("|").map(s=>s.trim()).filter(Boolean);if(l.length)return l}
  }catch(e){}
  const col=[];
  for(let p=1;p<=pdf.numPages;p++){
    const items=(await (await pdf.getPage(p)).getTextContent()).items.filter(i=>i.str&&i.str.trim());
    const head=items.find(i=>i.str.trim()==="LPN");
    if(!head)continue;
    const x=head.transform[4],y=head.transform[5];
    items.forEach(i=>{if(i!==head&&i.transform[5]<y-1&&Math.abs(i.transform[4]-x)<6)col.push(i.str.trim())});
  }
  if(col.length)return col;
  return readPdf(f,say);
}
$("cmpPdfBtn").onclick=()=>{$("cmpPdfFile").value="";$("cmpPdfFile").click()};
$("cmpPdfFile").onchange=async e=>{
  const files=[...(e.target.files||[])];if(!files.length)return;
  let total=0;const fails=[];
  for(let i=0;i<files.length;i++){
    const tag="PDF "+(i+1)+" of "+files.length;
    cmpMsg("Reading "+tag+"…");
    try{const found=await readPdf(files[i],m=>cmpMsg(tag+": "+m));total+=found.length;addNums(found)}
    catch(err){fails.push(files[i].name+" ("+((err&&err.message)||"error")+")")}
  }
  cmpMsg("Read "+(files.length-fails.length)+" of "+files.length+" PDFs and found "+total+" LPNs."+(fails.length?" Couldn’t read: "+fails.join(", ")+". You can type those numbers in the box instead.":"")+" Check the numbers below are correct, then compare."+oddNote("cmpNums"));
};
$("cmpPhotoBtn").onclick=()=>{$("cmpPhotoFile").value="";$("cmpPhotoFile").click()};
$("cmpPhotoFile").onchange=async e=>{
  const files=[...(e.target.files||[])];if(!files.length)return;
  for(let i=0;i<files.length;i++){
    cmpMsg("Reading photo "+(i+1)+" of "+files.length+"…");
    try{addNums(await readPhoto(files[i]))}
    catch(err){cmpMsg("Couldn't read photo "+(i+1)+": "+((err&&err.message)||"error")+" You can type the numbers in the box instead.");return}
  }
  cmpMsg("Done. Check the numbers below are correct, then compare."+oddNote("cmpNums"));
};
$("cmpClear").onclick=()=>{logSrc=null;logPdfSrc=null;logSheets=null;$("cmpNums").value="";$("cmpLogNums").value="";$("cmpLogName").textContent="";$("cmpSum").innerHTML="";$("cmpRes").hidden=true;$("cmpRes").innerHTML="";cmpMsg("")};
function cmpData(){
  const lines=id=>$(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const uniq=a=>{const seen=new Set();return a.filter(x=>{const k=norm(x);if(!k||seen.has(k))return false;seen.add(k);return true})};
  const logList=uniq(lines("cmpLogNums")),man=uniq(lines("cmpNums"));
  if(!logList.length){cmpMsg("Add the LPN log first: use the current log, a saved delivery, an uploaded file or a photo of the printed copy.");return null}
  if(!man.length){cmpMsg("Add manifest photos or type the manifest numbers first.");return null}
  const ms=new Set(man.map(norm)),ls=new Set(logList.map(norm));
  const res=[];
  man.forEach(n=>res.push({n,man:true,log:ls.has(norm(n))}));
  logList.forEach(n=>{if(!ms.has(norm(n)))res.push({n,man:false,log:true})});
  const kind=x=>x.man&&x.log?"ok":x.man?"missing":"book";
  const cnt={ok:0,missing:0,book:0};res.forEach(x=>cnt[kind(x)]++);
  return {logList,man,res,cnt,kind};
}
function replaceLine(id,old,nv){
  const k=norm(old);
  const out=[];$(id).value.split(/\r?\n/).forEach(l=>{const t=l.trim();if(!t)return;if(norm(t)===k){if(nv)out.push(nv)}else out.push(t)});
  $(id).value=out.join("\n");
}
function refreshCmp(){const C=cmpData();if(C)renderCmp(C);else $("cmpRes").hidden=true}
function renderCmp(C){
  const {res,cnt,man,kind}=C;
  $("cmpSum").innerHTML="<span>On manifest: <b>"+man.length+"</b></span><span>✓ Matched: <b>"+cnt.ok+"</b></span><span>✗ Missing (report): <b>"+cnt.missing+"</b></span><span>⚠ On log only (book in): <b>"+cnt.book+"</b></span>";
  const box=$("cmpRes");box.hidden=false;box.innerHTML="";
  const mk=(title,cls,items,src,hint)=>{
    const h=document.createElement("h4");h.className=cls;h.textContent=title+" ("+items.length+")";box.appendChild(h);
    const note=document.createElement("div");note.className="note";note.style.margin="0 0 4px";note.textContent=items.length?hint:"None";box.appendChild(note);
    items.forEach(x=>{
      const row=document.createElement("div");row.className="ri";
      const l=document.createElement("span");l.className="l";l.textContent=x.n;
      const fix=document.createElement("button");fix.textContent="Fix";fix.setAttribute("aria-label","Fix "+x.n);
      const del=document.createElement("button");del.className="d";del.textContent="✕";del.setAttribute("aria-label","Remove "+x.n);
      fix.onclick=()=>{
        const inp=document.createElement("input");inp.value=x.n;inp.setAttribute("autocapitalize","characters");inp.setAttribute("aria-label","Corrected LPN");
        row.replaceChild(inp,l);inp.focus();inp.select();
        let done=false;
        const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok&&v&&v!==x.n)replaceLine(src,x.n,v);refreshCmp()};
        inp.onblur=()=>fin(true);
        inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();fin(true)}else if(e.key==="Escape")fin(false)};
      };
      del.onclick=()=>{replaceLine(src,x.n,"");refreshCmp()};
      row.append(l,fix,del);box.appendChild(row);
    });
  };
  mk("✗ Missing from the log","m",res.filter(x=>kind(x)==="missing"),"cmpNums","On the manifest but not in your log: report these. If one was misread, tap Fix.");
  mk("⚠ On the log only","b",res.filter(x=>kind(x)==="book"),"cmpLogNums","In your log but not on the manifest: book these in. If one was mistyped, tap Fix.");
  const ok=res.filter(x=>kind(x)==="ok");
  const det=document.createElement("details");
  const sm=document.createElement("summary");sm.textContent="✓ Matched ("+ok.length+")";det.appendChild(sm);
  const ml=document.createElement("div");ml.className="note";ml.style.cssText="margin:0;overflow-wrap:anywhere";ml.textContent=ok.map(x=>x.n).join(", ")||"None";det.appendChild(ml);
  box.appendChild(det);
}
function setLogFrom(list,rowsArr,d,recv,label){
  logSrc=null;logPdfSrc=null;
  logSheets=[{name:"Log copy",grid:logGridFrom(rowsArr,d,recv)}];
  $("cmpLogNums").value=list.join("\n");$("cmpLogName").textContent=label;
  cmpMsg("Log loaded. Add the manifest, then press Check results.");
  if(!$("cmpRes").hidden)refreshCmp();
}
$("cmpUseLog").onclick=()=>{
  if(!rows.length){cmpMsg("The log is empty. Add some pallets first, or upload a log.");return}
  setLogFrom(rows.map(r=>r.lpn),rows,$("date").value,$("recv").value,"Current log: "+rows.length+" LPNs");
};
function fillCmpHist(){
  try{pruneHist()}catch(e){}
  const sel=$("cmpHist");sel.innerHTML="";sel.add(new Option(hist.length?"Or use a saved delivery…":"No saved deliveries yet",""));
  hist.forEach(h=>sel.add(new Option((ukDate(h.date)||"No date")+", "+h.rows.length+" pallets"+(h.recv?" ("+h.recv+")":""),h.id)));
}
$("cmpHist").addEventListener("pointerdown",fillCmpHist);$("cmpHist").addEventListener("focus",fillCmpHist);
$("cmpHist").onchange=()=>{
  const h=hist.find(x=>x.id===$("cmpHist").value);if(!h)return;
  setLogFrom(h.rows.map(r=>r.lpn),h.rows,h.date,h.recv,"Saved delivery: "+(ukDate(h.date)||"No date")+", "+h.rows.length+" LPNs");
  $("cmpHist").value="";
};
$("cmpCheck").onclick=()=>{
  const C=cmpData();if(!C)return;
  renderCmp(C);cmpMsg("Check the results below and fix anything that was misread. Then download or email the document.");
};
$("cmpLogNums").addEventListener("input",()=>{if(!$("cmpRes").hidden)refreshCmp()});
$("cmpNums").addEventListener("input",()=>{if(!$("cmpRes").hidden)refreshCmp()});
$("cmpGo").onclick=async()=>{
  const lines=id=>$(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const uniq=a=>{const seen=new Set();return a.filter(x=>{const k=norm(x);if(!k||seen.has(k))return false;seen.add(k);return true})};
  const C=cmpData();if(!C)return;
  const {logList,man,res,cnt,kind}=C;
  renderCmp(C);
  cmpMsg("Preparing document…");
  try{
    await loadExcel();
    const d=$("cmpDate").value||"no-date";
    const merge=mergeLog,mergeSrc=merge?logSrc:null;
    const wb=new ExcelJS.Workbook();
    if(mergeSrc)await wb.xlsx.load(mergeSrc.buf);
    let tab="Manifest Check",tn=2;
    while(wb.getWorksheet(tab))tab="Manifest Check "+(tn++);
    const ws=wb.addWorksheet(tab);
    ws.columns=[{width:7},{width:21},{width:18},{width:12},{width:19},{width:3},{width:25},{width:18}];
    const bc={argb:"FF000000"},med={style:"medium",color:bc};
    const border={top:med,left:med,bottom:med,right:med};
    let off=0;
    try{off=await xlLogo(wb,ws,547)}catch(e){off=0}
    const side=[
      {v:["Summary","Count"],h:1},
      {v:["On manifest",man.length]},
      {v:["✓ Matched",cnt.ok]},
      {v:["✗ Missing",cnt.missing]},
      {v:["⚠ Log only",cnt.book]},
      null,
      {v:["Delivery Details",""],h:1,merge:1},
      {v:["Date",ukDate(d)],l:1}
    ];
    const ST={ok:{t:"✓ Matched",f:null},missing:{t:"✗ MISSING",f:"FFA6A6A6"},book:{t:"⚠ LOG ONLY",f:"FFD0D0D0"}};
    const HD="FFE6E9ED";
    const n=Math.max(res.length,side.length-1);
    const H=xlTitle(ws,off,8,"Manifest check","Date: "+ukDate(d)+"     On manifest: "+man.length+"     Matched: "+cnt.ok+"     Missing: "+cnt.missing+"     Log only: "+cnt.book);
    const lastL=H+res.length,s1=H+4,s2a=H+6,s2b=H+7;
    for(let i=-1;i<n;i++){
      const r=ws.getRow(H+i+1);
      const head=i<0,x=head?null:res[i],k0=x?kind(x):null,st=k0?ST[k0]:null;
      const left=head?["#","LPN","On manifest","On log","Result"]:x?[i+1,x.n,x.man?"Yes":"No",x.log?"Yes":"No",st.t]:null;
      const right=side[i+1]||null;
      const put=(col,val,o)=>{
        const c=r.getCell(col);c.value=val;
        c.font={name:o.mono?"Courier New":"Arial",size:14,bold:!!o.bold,color:bc};
        c.border=o.box;
        c.alignment=o.center?{vertical:"middle",horizontal:"center",wrapText:true}:{vertical:"middle",horizontal:"left",indent:1,wrapText:true};
        if(o.fill)c.fill=xlFill(o.fill);
      };
      if(left)left.forEach((v,k)=>put(k+1,v,{bold:head||k0!=="ok",mono:!head&&k===1,fill:head?HD:(st.f||(i%2?XL_ZEBRA:null)),center:k!==1&&k!==4,box:xlBox(1,5,H,lastL,k+1,r.number)}));
      if(right){
        const hd=!!right.h,inB1=i+1<=4,bx=c=>inB1?xlBox(7,8,H,s1,c,r.number):xlBox(7,8,s2a,s2b,c,r.number);
        put(7,right.v[0],{bold:hd||!!right.l,fill:(hd||right.l)?HD:null,box:bx(7)});
        put(8,right.v[1],{bold:hd,fill:hd?HD:null,center:typeof right.v[1]==="number",box:bx(8)});
        if(right.merge)ws.mergeCells(r.number,7,r.number,8);
      }
      r.height=(head||(right&&right.h))?32:24;
    }
    xlPrint(ws,H);
    if(merge&&!logSrc){
      const sheets=logSheets&&logSheets.length?logSheets:[{name:"Log copy",grid:[["LPN"],...logList.map(n=>[n])]}];
      sheets.forEach(sh=>{
        const g=trimGrid(sh.grid);if(!g.length)return;
        let nm="Log copy",tk=2;while(wb.getWorksheet(nm))nm="Log copy "+(tk++);
        const lw=wb.addWorksheet(nm),nc=g[0].length,wd=[];
        for(let c=0;c<nc;c++){let m=0;g.forEach(r=>{const t=String(r[c]);if(t)m=Math.max(m,t.length)});wd.push(m?Math.min(40,Math.max(10,Math.round(m*1.25))):3)}
        lw.columns=wd.map(w=>({width:w}));
        g.forEach((r,i)=>r.forEach((v,c)=>{
          if(v===""||v==null)return;
          const cell=lw.getRow(i+1).getCell(c+1);cell.value=v;
          cell.font={name:"Arial",size:14,bold:i===0,color:bc};cell.border=border;
          if(i===0)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:HD}};
        }));
        lw.pageSetup={orientation:nc>4?"landscape":"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:1",margins:{left:0.4,right:0.4,top:0.6,bottom:0.6,header:0.3,footer:0.3}};
      });
    }
    const outName=mergeSrc?mergeSrc.name.replace(/\.xlsx$/i,"")+" (with manifest check).xlsx":"Manifest-check-"+d+".xlsx";
    pdfJob=()=>buildCmpPdf(res,cnt,man.length,d,merge?{list:logList,pdf:logPdfSrc,sheets:logSheets}:null);
    await sendFile(await wb.xlsx.writeBuffer(),outName,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    cmpMsg("");
  }catch(err){
    if(err&&err.code==="declined"){cmpMsg("");return}
    cmpMsg("Couldn’t create the document: "+((err&&err.message)||"error"));
  }
};
try{$("cmpDate").value=localStorage.getItem("lpncmpdate")||""}catch(e){}
if(!$("cmpDate").value)$("cmpDate").value=new Date().toISOString().slice(0,10);
$("cmpDate").onchange=()=>{try{localStorage.setItem("lpncmpdate",$("cmpDate").value)}catch(e){}};
/* ---- prefix presets ---- */
const PRESET_URL="presets.json";
const BUILTIN={"Standard":"RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M"};
let filePresets={},localPresets={};
const pfxMsg=t=>{$("pfxMsg").textContent=t};
const normList=v=>(Array.isArray(v)?v.join(","):String(v)).toUpperCase().split(/[^A-Z]+/).filter(Boolean).join(", ");
const presets=()=>({...(Object.keys(filePresets).length?filePresets:BUILTIN),...localPresets});
const savePfx=()=>{try{localStorage.setItem("lpncmppfx",$("cmpPfx").value)}catch(e){}};
const saveLocal=()=>{try{localStorage.setItem("lpnpresets",JSON.stringify(localPresets))}catch(e){}};
function fillPresets(){
  const s=$("cmpPreset");s.innerHTML="";
  const a=document.createElement("option");a.value="__all";a.textContent="All prefixes (leave blank)";s.appendChild(a);
  Object.keys(presets()).forEach(n=>{const o=document.createElement("option");o.textContent=n;s.appendChild(o)});
  const c=document.createElement("option");c.value="__custom";c.textContent="Custom (not saved as a preset)";s.appendChild(c);
  syncSelect();
}
function syncSelect(){
  const cur=normList($("cmpPfx").value),p=presets();
  if(!cur){$("cmpPreset").value="__all";return}
  const hit=Object.keys(p).find(n=>normList(p[n])===cur);
  $("cmpPreset").value=hit||"__custom";
}
function applyPreset(){
  const n=$("cmpPreset").value,p=presets();
  if(n==="__all"){$("cmpPfx").value="";savePfx();return}
  if(n==="__custom"||!p[n])return;
  $("cmpPfx").value=normList(p[n]);savePfx();
}
async function loadPresetFile(){
  if(!PRESET_URL)return;
  try{
    const r=await fetch(PRESET_URL,{cache:"no-store"});
    if(!r.ok)throw new Error("missing");
    const j=await r.json(),o={};
    Object.keys(j).forEach(k=>{if(k[0]!=="_"){const v=normList(j[k]);if(v)o[k]=v}});
    filePresets=o;pfxMsg("");
  }catch(e){pfxMsg("Couldn’t load "+PRESET_URL+", so the built-in preset is being used.")}
  fillPresets();
}
try{localPresets=JSON.parse(localStorage.getItem("lpnpresets")||"{}")||{}}catch(e){localPresets={}}
try{
  if(localStorage.getItem("lpncmppfxv")!=="3"){
    const old=normList(localStorage.getItem("lpncmppfx")||"");
    if(old==="RUN, QUB, VLT, RBY, IM, V, R, Q"||old==="RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M")localStorage.setItem("lpncmppfx","");
    localStorage.setItem("lpncmppfxv","3");
  }
}catch(e){}
try{$("cmpPfx").value=localStorage.getItem("lpncmppfx")||""}catch(e){}
fillPresets();loadPresetFile();
$("cmpPreset").onchange=()=>{applyPreset();pfxMsg("")};
$("cmpPfx").oninput=()=>{savePfx();syncSelect()};
$("pfxSave").onclick=()=>{
  const name=$("pfxName").value.trim().replace(/[\r\n]+/g," "),list=normList($("cmpPfx").value);
  if(!name){pfxMsg("Type a name for the preset first.");return}
  if(name[0]==="_"){pfxMsg("A preset name can’t start with an underscore.");return}
  if(!list){pfxMsg("Add some prefixes to the list first.");return}
  localPresets[name]=list;saveLocal();fillPresets();$("cmpPreset").value=name;$("pfxName").value="";
  pfxMsg("Saved “"+name+"”."+" It is saved in this browser. Use Download presets file to share it.");
};
$("pfxDel").onclick=()=>{
  const n=$("cmpPreset").value;
  if(n==="__custom"||n==="__all"){pfxMsg("Choose a saved preset to delete.");return}
  if(Object.prototype.hasOwnProperty.call(localPresets,n)){
    delete localPresets[n];saveLocal();fillPresets();
    pfxMsg("Deleted “"+n+"”."+(presets()[n]?" The version from the presets file is now used.":""));
  }else pfxMsg("“"+n+"” is built in or comes from the presets file, so it can’t be deleted here."+" Edit presets.json to remove it.");
};
$("pfxDl").onclick=()=>{
  const o={"_note":"Each preset is a name and a comma-separated list of LPN prefixes. Edit this file and upload it next to index.html."};
  const p=presets();Object.keys(p).forEach(n=>{o[n]=normList(p[n])});
  saveBlob(JSON.stringify(o,null,2)+"\n","application/json","presets.json");
  pfxMsg("Downloaded presets.json. Replace the file next to the app with it to share these presets.");
};
$("dlMail").onclick=()=>emailVia($("dl").onclick,"dlmsg");
$("expBtn").onclick=()=>{const m=$("expMenu");m.hidden=!m.hidden;$("expBtn").setAttribute("aria-expanded",!m.hidden);};
$("expMenu").addEventListener("click",e=>{if(e.target.closest("button")){$("expMenu").hidden=true;$("expBtn").setAttribute("aria-expanded","false")}});
async function printBuf(buf,fname,m){
  let printed=false;
  try{
    const url=URL.createObjectURL(new Blob([buf],{type:"application/pdf"}));
    const fr=document.createElement("iframe");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    fr.onload=()=>{try{fr.contentWindow.focus();fr.contentWindow.print();printed=true}catch(e){}};
    fr.src=url;document.body.appendChild(fr);
    await new Promise(r=>setTimeout(r,1500));
    setTimeout(()=>{fr.remove();URL.revokeObjectURL(url)},60000);
  }catch(e){}
  if(printed){m.textContent="";return}
  await saveOnly(buf,fname,"application/pdf");
  m.textContent="Print view isn’t available here, so a PDF was saved instead. Open it to print.";
}
$("prn").onclick=async()=>{
  const m=$("dlmsg");m.textContent="";
  if(!rows.length){m.textContent="Add at least one LPN before printing.";return}
  if(!expectCheck(m))return;
  const d=$("date").value||"no-date";
  try{
    m.textContent="Preparing the print copy…";
    await printBuf(await buildLogPdf(d),"LPN-log-"+d+".pdf",m);
  }catch(e){m.textContent="Couldn’t prepare the print copy: "+((e&&e.message)||"unknown error")}
};
$("cmpExpBtn").onclick=()=>{const m=$("cmpExpMenu");m.hidden=!m.hidden;$("cmpExpBtn").setAttribute("aria-expanded",!m.hidden)};
$("cmpExpMenu").addEventListener("click",e=>{if(e.target.closest("button")){$("cmpExpMenu").hidden=true;$("cmpExpBtn").setAttribute("aria-expanded","false")}});
$("cmpPrn").onclick=async()=>{
  const C=cmpData();if(!C)return;
  renderCmp(C);
  const d=$("cmpDate").value||"no-date",merge=mergeLog;
  try{
    cmpMsg("Preparing the print copy…");
    const buf=await buildCmpPdf(C.res,C.cnt,C.man.length,d,merge?{list:C.logList,pdf:logPdfSrc,sheets:logSheets}:null);
    await printBuf(buf,"Manifest-check-"+d+".pdf",{set textContent(t){cmpMsg(t)}});
  }catch(e){cmpMsg("Couldn’t prepare the print copy: "+((e&&e.message)||"error"))}
};
$("cmpMail").onclick=()=>emailVia($("cmpGo").onclick,"cmpMsg");
$("cmpToggle").onclick=()=>{
  fillCmpHist();
  const open=$("cmpBody").hidden;
  $("cmpBody").hidden=!open;$("cmpToggle").setAttribute("aria-expanded",open?"true":"false");
};

/* ---- live manifest tracking in the Pallet log ---- */
function manState(){
  const mp=new Map();
  $("cmpNums").value.split(/\r?\n/).forEach(s=>{s=s.trim();const k=norm(s);if(k&&!mp.has(k))mp.set(k,s)});
  const logged=new Set(rows.map(r=>norm(r.lpn)));
  let found=0;const missing=[];
  mp.forEach((v,k)=>{if(logged.has(k))found++;else missing.push(v)});
  return {total:mp.size,found:found,missing:missing,extra:rows.filter(r=>!mp.has(norm(r.lpn))).length,has:x=>mp.has(norm(x))};
}
function manLive(){
  const box=$("manLive");if(!box)return null;
  const s=manState();
  if(!s.total){box.hidden=true;return null}
  box.hidden=false;
  box.className="manlive "+(s.missing.length||s.extra?"bad":"ok");
  $("manTxt").textContent="Manifest: "+s.found+" of "+s.total+" found"+(s.missing.length?" · "+s.missing.length+" still to find":" ✓ all found")+(s.extra?" · "+s.extra+" not on manifest":"");
  $("manShow").hidden=!s.missing.length;
  if(!s.missing.length){$("manList").hidden=true;$("manShow").setAttribute("aria-expanded","false");$("manShow").textContent="Show missing"}
  $("manList").textContent=s.missing.join("\n");
  return s;
}
$("manShow").onclick=()=>{const open=$("manList").hidden;$("manList").hidden=!open;$("manShow").setAttribute("aria-expanded",String(open));$("manShow").textContent=open?"Hide missing":"Show missing"};
(function(){
  const el=$("cmpNums"),d=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value");
  const keep=()=>{try{localStorage.setItem("lpncmpman",d.get.call(el))}catch(e){}if(typeof summary==="function")summary()};
  Object.defineProperty(el,"value",{get(){return d.get.call(this)},set(v){d.set.call(this,v);keep()},configurable:true});
  el.addEventListener("input",keep);
  try{const v=localStorage.getItem("lpncmpman");if(v)d.set.call(el,v)}catch(e){}
  summary();
})();
