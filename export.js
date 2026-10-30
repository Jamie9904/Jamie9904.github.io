/* ---- shared spreadsheet look: thin inner lines, medium outline, light-grey zebra rows ---- */
const XL_BLACK={argb:"FF000000"},XL_THIN={style:"medium",color:XL_BLACK},XL_MED={style:"thick",color:XL_BLACK};
const XL_HEAD="FFE6E9ED",XL_ZEBRA="FFF2F2F2";
const xlFill=a=>({type:"pattern",pattern:"solid",fgColor:{argb:a}});
function xlBox(c1,c2,r1,r2,col,row){
  return {top:(row===r1||row===r1+1)?XL_MED:XL_THIN,bottom:(row===r2||row===r1)?XL_MED:XL_THIN,left:col===c1?XL_MED:XL_THIN,right:col===c2?XL_MED:XL_THIN};
}
/* Excel and Google Sheets don't grow a row whose height we set, so estimate how many
   lines wrapped text needs. Widths are Excel column units; 14pt Arial fits about 0.72
   characters per unit after the cell's padding. */
function xlLines(text,width,perUnit){
  const per=Math.max(4,Math.floor((width-2)*(perUnit||0.72)));let lines=0;
  String(text==null?"":text).split(/\n/).forEach(par=>{
    let len=0;lines++;
    par.split(/\s+/).filter(Boolean).forEach(w=>{
      if(len&&len+1+w.length>per){lines++;len=0}
      if(w.length>per){lines+=Math.ceil(w.length/per)-1;len=w.length%per||per}
      else len+=(len?1:0)+w.length;
    });
  });
  return Math.max(1,lines);
}
/* Width for an LPN column in 14pt Courier New: about 1.65 units a character, plus padding and indent. */
function xlLpnWidth(list,base){let m=0;list.forEach(s=>{m=Math.max(m,String(s||"").length)});return Math.min(40,Math.max(base,Math.ceil(m*1.65)+5))}
/* Lines an LPN needs in a Courier New column (about 0.6 characters a unit). */
const xlLpnLines=(v,w)=>xlLines(String(v||"").replace(/\s+/g,""),w,0.6);
function xlTitle(ws,off,lastCol,title,sub){
  const t=ws.getRow(off+1),s=ws.getRow(off+2);
  t.height=38;s.height=22;ws.getRow(off+3).height=10;
  ws.mergeCells(off+1,1,off+1,lastCol);ws.mergeCells(off+2,1,off+2,lastCol);
  const a=t.getCell(1),b=s.getCell(1);
  a.value=title;a.font={name:"Arial",size:22,bold:true};a.alignment={vertical:"middle",horizontal:"left"};
  b.value=sub;b.font={name:"Arial",size:12,color:{argb:"FF404040"}};b.alignment={vertical:"middle",horizontal:"left"};
  return off+4;
}
/* Which version of the app made a file: the changelog version plus the build number (the cache
   number in sw.js), for example "LPN Pallet Log v3.30 (build 26)". The build is read once when the
   page loads, through the same network-first route as the app's own files, so it matches the code
   this page is running even if an update arrives later. Exports never wait more than 1.5 seconds for it. */
let appVer="",appVerTry="";
const appBuildP=(async()=>{
  try{const t=await Promise.race([fetch("sw.js",{cache:"no-cache"}).then(r=>r.text()),new Promise((_,rej)=>setTimeout(()=>rej(new Error("slow")),4000))]);const m=t.match(/lpn-log-v(\d+)/);if(m)return m[1]}catch(e){}
  try{if(window.caches){const ks=(await caches.keys()).map(k=>(k.match(/^lpn-log-v(\d+)$/)||[])[1]).filter(Boolean).map(Number);if(ks.length)return String(Math.min(...ks))}}catch(e){}
  return "";
})();
async function appVersion(){
  if(appVer)return appVer;
  const v=(typeof HELP!=="undefined"&&(HELP.log.match(/<h3>(v\d+\.\d+)/)||[])[1])||"";
  const b=await Promise.race([appBuildP,new Promise(r=>setTimeout(()=>r(""),1500))]);
  const out="LPN Pallet Log"+(v?" "+v:"")+(b?" (build "+b+")":"");
  if(b)appVer=out;
  appVerTry=out;
  return out;
}
/* A small grey line under the tables saying when and with which version the file was made. */
function xlMadeWith(ws,row,lastCol){
  const now=new Date(),t=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  ws.mergeCells(row,1,row,lastCol);
  const c=ws.getRow(row).getCell(1);
  c.value="Made with "+(appVer||appVerTry||"LPN Pallet Log")+" on "+ukDate(localToday())+" at "+t+".";
  c.font={name:"Arial",size:10,italic:true,color:{argb:"FF595959"}};
  c.alignment={vertical:"middle",horizontal:"left"};
  ws.getRow(row).height=18;
}
function xlPrint(ws,hdrRow,landscape){
  ws.pageSetup={orientation:landscape?"landscape":"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,printTitlesRow:hdrRow+":"+hdrRow,margins:{left:0.4,right:0.4,top:0.6,bottom:0.7,header:0.3,footer:0.3}};
  ws.headerFooter.oddFooter="&L&9"+(appVer||appVerTry||"LPN Pallet Log").replace(/&/g,"&&")+"&C&9Page &P of &N&R&9Printed &D";
  ws.views=[{state:"frozen",ySplit:hdrRow,showGridLines:false}];
}
function saveBlob(data,type,name){
  const blob=new Blob([data],{type:type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;a.style.display="none";
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},10000);
}
async function fallbackXls(d){
  const esc=v=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const who=($("recv").value||"").trim();
  const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
  const side=[["Pallet Type","Count","h"],["Brown Box",c.BB],["FMCG",c.FMCG],["FPP",c.FPP],["Mixed",c.Mixed],["Total",rows.length,"b"],["FSDU (not in total)",rows.filter(r=>r.fsdu).length],null,["Delivery Details","","h2"],["Date",ukDate(d),"l"],["Received by",who,"l"]].concat(extras().map(e=>[e[0],e[1],"l"]));
  const n=Math.max(rows.length,side.length-1);
  let h='<html><head><meta charset="utf-8"><style>td,th{font-family:Arial;font-size:14pt;border:1px solid #000;padding:4px;text-align:left}th{font-size:16pt;background:#e6e9ed}td.c{text-align:center}td.m{font-family:\'Courier New\'}td{mso-number-format:"\\@"}</style></head><body><h2 style="font-family:Arial">Goods-in pallet log</h2><table>';
  for(let i=-1;i<n;i++){
    const head=i<0,t=head?"th":"td";
    const l=head?["#","LPN","Pallet Type","FSDU"]:rows[i]?[i+1,rows[i].lpn,rows[i].type,rows[i].fsdu?"Yes":"No"]:null;
    const r=side[i+1]||null;
    h+="<tr>";
    h+=l?l.map((v,k)=>"<"+t+(head?"":k===1?' class="m" style="mso-number-format:\'\\@\'"':k===0||k>=2?' class="c"':"")+">"+esc(v)+"</"+t+">").join(""):"<td></td><td></td><td></td><td></td>";
    h+='<td style="border:none"></td>';
    if(r){
      const tt=(r[2]==="h"||r[2]==="b")?"th":"td";
      if(r[2]==="h2")h+="<th colspan=2>"+esc(r[0])+"</th>";
      else if(r[2]==="l")h+="<th>"+esc(r[0])+"</th><td>"+esc(r[1])+"</td>";
      else h+="<"+tt+">"+esc(r[0])+"</"+tt+"><"+tt+">"+esc(r[1])+"</"+tt+">";
    }else h+="<td></td><td></td>";
    h+="</tr>";
  }
  await appVersion();
  const nw=new Date(),hm=String(nw.getHours()).padStart(2,"0")+":"+String(nw.getMinutes()).padStart(2,"0");
  h+="</table><p style=\"font-family:Arial;font-size:10pt;color:#595959;font-style:italic\">Made with "+esc(appVer||appVerTry)+" on "+esc(ukDate(localToday()))+" at "+hm+".</p></body></html>";
  await deliver(h,"LPN-log-"+d+".xls","application/vnd.ms-excel");
}
function pdfLogSheet(doc,sh,multi){
  const g=trimGrid(sh.grid);
  if(!g.length)return;
  const wide=g[0].length>4;
  doc.addPage("a4",wide?"landscape":"portrait");
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(0);
  doc.text("Log copy"+(multi?": "+sh.name:""),10,14);
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:20,margin:{left:10,right:10,top:20,bottom:12},
    styles:Object.assign({},PDF_BASE.styles,{fontSize:wide?9:11,cellPadding:1.8}),
    head:[g[0].map(String)],body:g.slice(1).map(r=>r.map(String)),
    didParseCell:d=>{if(String(d.cell.text.join("")).trim()===""){d.cell.styles.lineWidth=0;d.cell.styles.fillColor=[255,255,255]}}
  }));
}
async function loadPdfLib(){
  const ok=()=>window.PDFLib;
  try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",ok)}
  catch(e){await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",ok)}
}
async function loadJsPdf(){
  const ok=()=>window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable;
  try{
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",()=>window.jspdf);
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",ok);
  }catch(e){
    await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",()=>window.jspdf);
    await loadScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",ok);
  }
}
const PDF_HEAD=[230,233,237],PDF_BASE={theme:"grid",styles:{font:"helvetica",fontSize:11,cellPadding:2.2,textColor:0,lineColor:0,lineWidth:0.25,valign:"middle"},headStyles:{fillColor:PDF_HEAD,textColor:0,fontStyle:"bold",lineColor:0,lineWidth:0.25},alternateRowStyles:{fillColor:[242,242,242]}};
const PDF_PLAIN={alternateRowStyles:{fillColor:[255,255,255]}};
function pdfTitle(doc,x,y,title,sub){
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.setTextColor(0);doc.text(title,x,y+6);
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(60);doc.text(sub,x,y+12);doc.setTextColor(0);
  return y+17;
}
function pdfFooter(doc,extra){
  const n=doc.getNumberOfPages(),tot=n+(extra||0),pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight();
  const now=new Date(),pd=String(now.getDate()).padStart(2,"0")+"/"+String(now.getMonth()+1).padStart(2,"0")+"/"+now.getFullYear();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90);
    doc.text(appVer||appVerTry||"LPN Pallet Log",10,ph-7);doc.text("Page "+i+" of "+tot,pw/2,ph-7,{align:"center"});doc.text("Printed "+pd,pw-10,ph-7,{align:"right"});}
  doc.setTextColor(0);
}

/* The logo for exports: a JPEG on white, at most 600px, keeping its shape. Keeps files small. */
let logoX=null,logoXsrc="";
async function exportLogo(){
  if(!logo)return null;
  if(logoX&&logoXsrc===logo)return logoX;
  const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=logo});
  const sc=Math.min(1,600/Math.max(im.width,im.height));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));
  const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
  logoX={data:c.toDataURL("image/jpeg",0.9),r:c.height/c.width};logoXsrc=logo;
  return logoX;
}
/* Fit the logo inside maxW x maxH without stretching it. */
function fitLogo(r,maxW,maxH){let w=maxW,h=w*r;if(h>maxH){h=maxH;w=h/r}return {w:w,h:h}}
async function xlLogo(wb,ws,maxWpx){
  const L=await exportLogo();if(!L)return 0;
  const f=fitLogo(L.r,maxWpx,110);
  const id=wb.addImage({base64:L.data,extension:"jpeg"});
  for(let k=1;k<=4;k++)ws.getRow(k).height=f.h*0.75/4;
  ws.addImage(id,{tl:{col:0,row:0},ext:{width:Math.round(f.w),height:Math.round(f.h)},editAs:"oneCell"});
  return 5;
}
async function pdfBanner(doc,x,width){
  let y=12;
  try{
    const L=await exportLogo();
    if(L){const f=fitLogo(L.r,width,30);doc.addImage(L.data,"JPEG",x,y,f.w,f.h);y+=f.h+6}
  }catch(e){}
  return y;
}
const pdfCell=(t,o)=>({content:String(t),styles:Object.assign({},o||{})});
async function buildLogPdf(d){
  await loadJsPdf();await appVersion();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
  doc.setProperties({title:"LPN log "+d,subject:"LPN log",keywords:"LPNLOG2:"+encodeURIComponent(JSON.stringify({app:appVer||appVerTry,d:d,r:($("recv").value||"").trim(),n:($("notes").value||"").trim(),e:$("expect").value||"",t:($("trailer").value||"").trim(),si:($("sealIn").value||"").trim(),so:($("sealOut").value||"").trim(),rows:rows.map(r=>[r.lpn,r.type,r.fsdu?1:0])}))});
  const who=($("recv").value||"").trim();
  const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
  const L=10,LW=100,RX=L+LW+8,RW=190-LW-8;
  const yb=await pdfBanner(doc,L,LW);
  const exp=$("expect").value;
  const y0=pdfTitle(doc,L,yb-6<12?12:yb-6,"Goods-in pallet log",ukDate(d)+(who?"   |   Received by "+who:"")+(exp?"   |   Expected pallets "+exp:"")+(($("trailer").value||"").trim()?"   |   Trailer "+$("trailer").value.trim():""))+2;
  const bold={fontStyle:"bold",fillColor:PDF_HEAD};
  doc.autoTable(Object.assign({},PDF_BASE,PDF_PLAIN,{
    startY:y0,margin:{left:RX,right:10,top:12,bottom:16},tableWidth:RW,
    head:[["Pallet Type","Count"]],
    body:[["Brown Box",c.BB],["FMCG",c.FMCG],["FPP",c.FPP],["Mixed",c.Mixed],
      [pdfCell("Total",bold),pdfCell(rows.length,bold)],
      ["FSDU (not in total)",rows.filter(r=>r.fsdu).length]],
    columnStyles:{1:{halign:"center",cellWidth:22}}
  }));
  doc.autoTable(Object.assign({},PDF_BASE,PDF_PLAIN,{
    startY:doc.lastAutoTable.finalY+8,margin:{left:RX,right:10,top:12,bottom:16},tableWidth:RW,
    head:[[{content:"Delivery Details",colSpan:2}]],
    body:[[pdfCell("Date",bold),ukDate(d)],[pdfCell("Received by",bold),who]].concat(extras().map(e=>[pdfCell(e[0],bold),e[1]])),
    columnStyles:{0:{cellWidth:32}}
  }));
  doc.setPage(1);
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:L,right:210-L-LW,top:12,bottom:16},tableWidth:LW,
    head:[["#","LPN","Pallet Type","FSDU"]],
    body:rows.map((r,i)=>[i+1,r.lpn,r.type,r.fsdu?"Yes":"No"]),
    columnStyles:{0:{cellWidth:12,halign:"center"},1:{cellWidth:42,font:"courier"},2:{cellWidth:28,halign:"center"},3:{cellWidth:18,halign:"center"}}
  }));
  pdfFooter(doc);
  return doc.output("arraybuffer");
}
async function buildCmpPdf(res,cnt,manCount,d,logCopy){
  await loadJsPdf();await appVersion();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
  const L=10,LW=112,RX=L+LW+6,RW=190-LW-6;
  const yb=await pdfBanner(doc,L,LW);
  const y0=pdfTitle(doc,L,yb-6<12?12:yb-6,"Manifest check",ukDate(d))+2;
  const bold={fontStyle:"bold",fillColor:PDF_HEAD};
  doc.autoTable(Object.assign({},PDF_BASE,PDF_PLAIN,{
    startY:y0,margin:{left:RX,right:10,top:12,bottom:16},tableWidth:RW,
    head:[["Summary","Count"]],
    body:[["On manifest",manCount],["Matched",cnt.ok],["Missing",cnt.missing],["Log only",cnt.book]],
    columnStyles:{1:{halign:"center",cellWidth:22}}
  }));
  doc.autoTable(Object.assign({},PDF_BASE,PDF_PLAIN,{
    startY:doc.lastAutoTable.finalY+8,margin:{left:RX,right:10,top:12,bottom:16},tableWidth:RW,
    head:[[{content:"Delivery Details",colSpan:2}]],
    body:[[pdfCell("Date",bold),ukDate(d)]],
    columnStyles:{0:{cellWidth:26}}
  }));
  doc.setPage(1);
  const ST={ok:{t:"Matched",s:{}},missing:{t:"MISSING",s:{fontStyle:"bold",fillColor:[166,166,166]}},book:{t:"LOG ONLY",s:{fontStyle:"bold",fillColor:[208,208,208]}}};
  const kd=x=>x.man&&x.log?"ok":x.man?"missing":"book";
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:L,right:210-L-LW,top:12,bottom:16},tableWidth:LW,
    head:[["#","LPN","On manifest","On log","Result"]],
    body:res.map((x,i)=>{const st=ST[kd(x)];return [pdfCell(i+1,st.s),pdfCell(x.n,st.s),pdfCell(x.man?"Yes":"No",st.s),pdfCell(x.log?"Yes":"No",st.s),pdfCell(st.t,st.s)]}),
    columnStyles:{0:{cellWidth:11,halign:"center"},1:{cellWidth:36,font:"courier"},2:{cellWidth:24,halign:"center"},3:{cellWidth:16,halign:"center"},4:{cellWidth:25}}
  }));
  if(logCopy){
    if(logCopy.pdf){
      await loadPdfLib();
      const src=await PDFLib.PDFDocument.load(logCopy.pdf.buf.slice(0),{ignoreEncryption:true});
      pdfFooter(doc,src.getPageCount());
      const base2=await PDFLib.PDFDocument.load(doc.output("arraybuffer"));
      // Copy only what's printed: page-open actions (which can be scripts) and links or other annotations are
      // removed, so a log PDF from outside can't pass them on in the file that gets emailed and printed.
      (await base2.copyPages(src,src.getPageIndices())).forEach(pg=>{pg.node.delete(PDFLib.PDFName.of("AA"));pg.node.delete(PDFLib.PDFName.of("Annots"));base2.addPage(pg)});
      return await base2.save();
    }
    if(logCopy.sheets&&logCopy.sheets.length){
      logCopy.sheets.forEach(sh=>pdfLogSheet(doc,sh,logCopy.sheets.length>1));
    }else{
      doc.addPage();
      doc.setFontSize(14);doc.setFont("helvetica","bold");doc.text("Log copy",L,16);
      doc.autoTable(Object.assign({},PDF_BASE,{
        startY:22,margin:{left:L,right:210-L-100,top:12,bottom:12},tableWidth:100,
        head:[["LPN"]],body:logCopy.list.map(n=>[n])
      }));
    }
  }
  pdfFooter(doc);
  return doc.output("arraybuffer");
}
let pdfJob=null;
let emailMode=false,emailNote="",pendingShare=null;
async function deliver(buf,name,mime){
  if(!emailMode){pdfJob=null;return saveOnly(buf,name,mime)}
  if(pdfJob){const job=pdfJob;pdfJob=null;buf=await job();name=name.replace(/\.[^.]+$/,"")+".pdf";mime="application/pdf"}
  const file=new File([buf],name,{type:mime});
  const subject=name.replace(/\.[^.]+$/,"");
  const data={files:[file],title:subject,text:"Please find the attached file: "+name};
  let reason="sharing isn’t supported in this browser";
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share(data);return}
    catch(e){
      if(e&&e.name==="AbortError")return false;
      if(e&&e.name==="NotAllowedError"&&!(navigator.userActivation&&navigator.userActivation.isActive)){pendingShare={data,buf,name,mime};return}
      reason=(e&&e.name==="NotAllowedError")?"the browser blocked sharing it from a web app (NotAllowedError). Chrome only allows some file types to be shared this way, and Excel files may not be one of them":"sharing failed ("+((e&&e.name)||"error")+")";
    }
  }
  await fallbackMail(buf,name,mime,subject,reason);
}
async function fallbackMail(buf,name,mime,subject,reason){
  await saveOnly(buf,name,mime);
  emailNote="The file was saved because "+reason+". Please attach it to your email.";
  try{window.location.href="mailto:?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent("Please find the attached file: "+name)}catch(e){}
}
async function emailVia(handler,msgId){
  emailMode=true;emailNote="";pendingShare=null;
  try{await handler()}finally{emailMode=false}
  const el=$(msgId);
  if(pendingShare){
    const ps=pendingShare;pendingShare=null;
    el.textContent="File ready. ";
    const b=document.createElement("button");b.className="p";b.textContent="Tap to share";
    b.onclick=async()=>{
      b.disabled=true;
      try{await navigator.share(ps.data);el.textContent=""}
      catch(e){
        if(e&&e.name==="AbortError"){b.disabled=false;return}
        try{await fallbackMail(ps.buf,ps.name,ps.mime,ps.data.title,(e&&e.name==="NotAllowedError")?"the browser blocked sharing it from a web app (NotAllowedError). Chrome only allows some file types to be shared this way, and Excel files may not be one of them":"sharing failed ("+((e&&e.name)||"error")+")");el.textContent=emailNote}
        catch(err){el.textContent="Couldn’t save the file."}
      }
    };
    el.appendChild(b);
  }else if(emailNote)el.textContent=emailNote;
}
async function saveOnly(buf,name,mime){saveBlob(buf,mime,name)}
let expAck="";
/* If an expected pallet count is set and doesn't match, ask once before exporting (the second try goes through). */
function expectCheck(m){
  const e=parseInt($("expect").value,10);
  if(isNaN(e)||e===rows.length)return true;
  const key=e+":"+rows.length;
  if(expAck===key)return true;
  expAck=key;
  m.textContent="Expected "+e+" pallets but "+rows.length+" "+(rows.length===1?"is":"are")+" logged. Open Export and choose it again if that is right.";
  return false;
}
$("dl").onclick=async()=>{
  const m=$("dlmsg");m.textContent="";
  if(!rows.length){m.textContent="Add at least one LPN before downloading.";return}
  if(!expectCheck(m))return;
  const d=$("date").value||"no-date";
  try{
    m.textContent="Preparing spreadsheet…";
    const hasX=()=>window.ExcelJS;
    let ok=true;
    try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",hasX)}
    catch(e1){try{await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",hasX)}catch(e2){ok=false}}
    if(!ok){
      await fallbackXls(d);markExported();
      m.textContent="The full spreadsheet builder couldn't load (no internet or it's blocked), so a basic Excel file (.xls) was saved instead. Excel may warn about the format when opening: click Yes.";
      return;
    }
    await appVersion();
    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("LPN Log");
    const lpnW=xlLpnWidth(rows.map(r=>r.lpn),26);
    ws.columns=[{width:7},{width:lpnW},{width:22},{width:12},{width:3},{width:26},{width:20}];
    const who=($("recv").value||"").trim();
    const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
    const side=[
      {v:["Pallet Type","Count"],h:1},
      {v:["Brown Box",c.BB]},{v:["FMCG",c.FMCG]},{v:["FPP",c.FPP]},{v:["Mixed",c.Mixed]},
      {v:["Total",rows.length],b:1},
      {v:["FSDU (not in total)",rows.filter(r=>r.fsdu).length]},
      null,
      {v:["Delivery Details",""],h:1,merge:1},
      {v:["Date",ukDate(d)],l:1},
      {v:["Received by",who],l:1}
    ].concat(extras().map(e=>({v:[e[0],e[1]],l:1})));
    const n=Math.max(rows.length,side.length-1);
    let off=0;
    try{off=await xlLogo(wb,ws,Math.round((7+lpnW+22+12)*7.3))}catch(e){off=0}
    const exp=$("expect").value;
    const H=xlTitle(ws,off,7,"Goods-in pallet log","Date: "+ukDate(d)+(who?"     Received by: "+who:"")+(exp?"     Expected pallets: "+exp:"")+(($("trailer").value||"").trim()?"     Trailer: "+$("trailer").value.trim():""));
    const lastL=H+rows.length,s1=H+6,s2a=H+8,s2b=H+side.length-1;
    for(let i=-1;i<n;i++){
      const r=ws.getRow(H+i+1);
      const head=i<0;
      const left=head?["#","LPN","Pallet Type","FSDU"]:rows[i]?[i+1,rows[i].lpn,rows[i].type,rows[i].fsdu?"Yes":"No"]:null;
      const right=side[i+1]||null;
      const put=(col,val,o)=>{
        const cell=r.getCell(col);
        cell.value=val;
        cell.font={name:o.mono?"Courier New":"Arial",size:14,bold:!!o.bold,color:XL_BLACK};
        cell.border=o.box;
        cell.alignment=o.center?{vertical:"middle",horizontal:"center",wrapText:!o.big}:{vertical:"middle",horizontal:"left",indent:1,wrapText:!o.big};
        if(o.fill)cell.fill=xlFill(o.fill);
      };
      if(left)left.forEach((v,k)=>put(k+1,v,{bold:head,big:head,mono:!head&&k===1,center:head?k!==1:k!==1,fill:head?XL_HEAD:(i%2?XL_ZEBRA:null),box:xlBox(1,4,H,lastL,k+1,r.number)}));
      if(right){
        const inB1=i+1<=6,bx=c=>inB1?xlBox(6,7,H,s1,c,r.number):xlBox(6,7,s2a,s2b,c,r.number);
        const fl=right.h||right.b||right.l;
        put(6,right.v[0],{bold:fl,big:right.h,fill:fl?XL_HEAD:null,box:bx(6)});
        put(7,right.v[1],{bold:right.h||right.b,big:right.h,center:typeof right.v[1]==="number",fill:(right.h||right.b)?XL_HEAD:null,box:bx(7)});
        if(right.merge)ws.mergeCells(r.number,6,r.number,7);
      }
      r.height=(head||(right&&right.h))?32:Math.max(24,right?xlLines(right.v[1],20)*18+6:0,rows[i]?xlLpnLines(rows[i].lpn,lpnW)*18+6:0);
    }
    xlMadeWith(ws,H+n+2,7);
    xlPrint(ws,H);
    const buf=await wb.xlsx.writeBuffer();
    pdfJob=()=>buildLogPdf(d);
    const done=await deliver(buf,"LPN-log-"+d+".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    m.textContent="";
    if(done!==false)markExported();
  }catch(e){
    m.textContent="Couldn't create the spreadsheet: "+((e&&e.message)||"unknown error")+". Please try again or tell me this message.";
  }
};
/* ---- logo ---- */
/* Default logo: put an image file named logo.png in the same folder as this page. */
const DEFAULT_LOGO_URL="logo.png";
let logo="",custom="",defaultLogo="";
function scaleToData(bmp){
  const sc=Math.min(1,600/bmp.width);
  const cv=document.createElement("canvas");
  cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
  cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
  return cv.toDataURL("image/png");
}
function showLogo(){
  logo=custom||defaultLogo;
  $("logoImg").hidden=!logo;if(logo)$("logoImg").src=logo;
  $("logoBtn").textContent=logo?"Change logo":"Add logo";
  $("logoRm").hidden=!custom;
  $("logoRm").textContent=defaultLogo?"Reset to default logo":"Remove logo";
  if($("setLogo")){$("setLogo").textContent=$("logoBtn").textContent;$("setLogoRm").hidden=$("logoRm").hidden;$("setLogoRm").textContent=$("logoRm").textContent}
}
async function loadLogo(){
  try{custom=localStorage.getItem("lpnlogo")||"";if(!okLogo(custom))custom=""}catch(e){}
  showLogo();
  try{
    const r=await fetch(DEFAULT_LOGO_URL);
    if(r.ok)defaultLogo=scaleToData(await createImageBitmap(await r.blob()));
  }catch(e){}
  showLogo();
}
$("logoBtn").onclick=()=>{$("logoFile").value="";$("logoFile").click()};
$("logoFile").onchange=async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  try{
    custom=scaleToData(await createImageBitmap(f));
    try{localStorage.setItem("lpnlogo",custom)}catch(err){}
    showLogo();
  }catch(err){$("msg").textContent="Couldn't read that image file."}
};
$("logoRm").onclick=()=>{custom="";try{localStorage.removeItem("lpnlogo")}catch(e){}showLogo()};
loadLogo();
