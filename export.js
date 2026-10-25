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
  const side=[["Pallet Type","Count","h"],["Brown Box",c.BB],["FMCG",c.FMCG],["FPP",c.FPP],["Mixed",c.Mixed],["Total",rows.length,"b"],["FSDU (not in total)",rows.filter(r=>r.fsdu).length],null,["Delivery Details","","h2"],["Date",d,"l"],["Received by",who,"l"]].concat(extras().map(e=>[e[0],e[1],"l"]));
  const n=Math.max(rows.length,side.length-1);
  let h='<html><head><meta charset="utf-8"><style>td,th{font-family:Arial;font-size:14pt;border:2px solid #000;padding:4px;text-align:left}th{font-size:16pt;background:#e6e9ed}</style></head><body><table>';
  for(let i=-1;i<n;i++){
    const head=i<0,t=head?"th":"td";
    const l=head?["LPN","Pallet Type","FSDU"]:rows[i]?[rows[i].lpn,rows[i].type,rows[i].fsdu?"Yes":"No"]:null;
    const r=side[i+1]||null;
    h+="<tr>";
    h+=l?l.map((v,k)=>"<"+t+(k===0&&!head?' style="mso-number-format:\'\\@\'"':"")+">"+esc(v)+"</"+t+">").join(""):"<td></td><td></td><td></td>";
    h+='<td style="border:none"></td>';
    if(r){
      const tt=(r[2]==="h"||r[2]==="b")?"th":"td";
      if(r[2]==="h2")h+="<th colspan=2>"+esc(r[0])+"</th>";
      else if(r[2]==="l")h+="<th>"+esc(r[0])+"</th><td>"+esc(r[1])+"</td>";
      else h+="<"+tt+">"+esc(r[0])+"</"+tt+"><"+tt+">"+esc(r[1])+"</"+tt+">";
    }else h+="<td></td><td></td>";
    h+="</tr>";
  }
  h+="</table></body></html>";
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
const PDF_HEAD=[230,233,237],PDF_BASE={theme:"grid",styles:{font:"helvetica",fontSize:11,cellPadding:2.2,textColor:0,lineColor:0,lineWidth:0.4,valign:"middle"},headStyles:{fillColor:PDF_HEAD,textColor:0,fontStyle:"bold",lineColor:0,lineWidth:0.4}};
async function pdfBanner(doc,x,width){
  let y=12;
  if(logo){
    try{
      const dim=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res([im.width,im.height]);im.onerror=rej;im.src=logo});
      const h=Math.max(12,Math.min(32,width*dim[1]/dim[0]));
      doc.addImage(logo,"PNG",x,y,width,h);y+=h+6;
    }catch(e){}
  }
  return y;
}
const pdfCell=(t,o)=>({content:String(t),styles:Object.assign({},o||{})});
async function buildLogPdf(d){
  await loadJsPdf();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
  doc.setProperties({title:"LPN log "+d,subject:"LPN log",keywords:"LPNLOG2:"+encodeURIComponent(JSON.stringify({d:d,r:($("recv").value||"").trim(),n:($("notes").value||"").trim(),e:$("expect").value||"",rows:rows.map(r=>[r.lpn,r.type,r.fsdu?1:0])}))});
  const who=($("recv").value||"").trim();
  const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
  const L=10,LW=100,RX=L+LW+8,RW=190-LW-8;
  const y0=await pdfBanner(doc,L,LW);
  const bold={fontStyle:"bold",fillColor:PDF_HEAD};
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:RX,right:10,top:12,bottom:12},tableWidth:RW,
    head:[["Pallet Type","Count"]],
    body:[["Brown Box",c.BB],["FMCG",c.FMCG],["FPP",c.FPP],["Mixed",c.Mixed],
      [pdfCell("Total",bold),pdfCell(rows.length,bold)],
      ["FSDU (not in total)",rows.filter(r=>r.fsdu).length]],
    columnStyles:{1:{halign:"center",cellWidth:22}}
  }));
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:doc.lastAutoTable.finalY+8,margin:{left:RX,right:10,top:12,bottom:12},tableWidth:RW,
    head:[[{content:"Delivery Details",colSpan:2}]],
    body:[[pdfCell("Date",bold),d],[pdfCell("Received by",bold),who]].concat(extras().map(e=>[pdfCell(e[0],bold),e[1]])),
    columnStyles:{0:{cellWidth:32}}
  }));
  doc.setPage(1);
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:L,right:210-L-LW,top:12,bottom:12},tableWidth:LW,
    head:[["LPN","Pallet Type","FSDU"]],
    body:rows.map(r=>[r.lpn,r.type,r.fsdu?"Yes":"No"]),
    columnStyles:{0:{cellWidth:46},1:{cellWidth:32},2:{cellWidth:22,halign:"center"}}
  }));
  return doc.output("arraybuffer");
}
async function buildCmpPdf(res,cnt,manCount,d,logCopy){
  await loadJsPdf();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
  const L=10,LW=112,RX=L+LW+6,RW=190-LW-6;
  const y0=await pdfBanner(doc,L,LW);
  const bold={fontStyle:"bold",fillColor:PDF_HEAD};
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:RX,right:10,top:12,bottom:12},tableWidth:RW,
    head:[["Summary","Count"]],
    body:[["On manifest",manCount],["Matched",cnt.ok],["Missing",cnt.missing],["Log only",cnt.book]],
    columnStyles:{1:{halign:"center",cellWidth:22}}
  }));
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:doc.lastAutoTable.finalY+8,margin:{left:RX,right:10,top:12,bottom:12},tableWidth:RW,
    head:[[{content:"Delivery Details",colSpan:2}]],
    body:[[pdfCell("Date",bold),d]],
    columnStyles:{0:{cellWidth:26}}
  }));
  doc.setPage(1);
  const ST={ok:{t:"Matched",s:{}},missing:{t:"MISSING",s:{fontStyle:"bold",fillColor:[166,166,166]}},book:{t:"LOG ONLY",s:{fontStyle:"bold",fillColor:[208,208,208]}}};
  const kd=x=>x.man&&x.log?"ok":x.man?"missing":"book";
  doc.autoTable(Object.assign({},PDF_BASE,{
    startY:y0,margin:{left:L,right:210-L-LW,top:12,bottom:12},tableWidth:LW,
    head:[["LPN","On manifest","On log","Result"]],
    body:res.map(x=>{const st=ST[kd(x)];return [pdfCell(x.n,st.s),pdfCell(x.man?"Yes":"No",st.s),pdfCell(x.log?"Yes":"No",st.s),pdfCell(st.t,st.s)]}),
    columnStyles:{0:{cellWidth:38},1:{cellWidth:28,halign:"center"},2:{cellWidth:20,halign:"center"},3:{cellWidth:26}}
  }));
  if(logCopy){
    if(logCopy.pdf){
      await loadPdfLib();
      const base=await PDFLib.PDFDocument.load(doc.output("arraybuffer"));
      const src=await PDFLib.PDFDocument.load(logCopy.pdf.buf.slice(0),{ignoreEncryption:true});
      (await base.copyPages(src,src.getPageIndices())).forEach(pg=>base.addPage(pg));
      return await base.save();
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
      if(e&&e.name==="AbortError")return;
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
$("dl").onclick=async()=>{
  const m=$("dlmsg");m.textContent="";
  if(!rows.length){m.textContent="Add at least one LPN before downloading.";return}
  const d=$("date").value||"no-date";
  try{
    m.textContent="Preparing spreadsheet…";
    const hasX=()=>window.ExcelJS;
    let ok=true;
    try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",hasX)}
    catch(e1){try{await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",hasX)}catch(e2){ok=false}}
    if(!ok){
      await fallbackXls(d);
      m.textContent="The full spreadsheet builder couldn't load (no internet or it's blocked), so a basic Excel file (.xls) was saved instead. Excel may warn about the format when opening: click Yes.";
      return;
    }
    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("LPN Log");
    ws.columns=[{width:30},{width:18},{width:11},{width:3},{width:26},{width:18}];
    const who=($("recv").value||"").trim();
    const c={BB:0,FMCG:0,FPP:0,Mixed:0};rows.forEach(r=>c[r.type]++);
    const side=[
      {v:["Pallet Type","Count"],h:1},
      {v:["Brown Box",c.BB]},{v:["FMCG",c.FMCG]},{v:["FPP",c.FPP]},{v:["Mixed",c.Mixed]},
      {v:["Total",rows.length],b:1},
      {v:["FSDU (not in total)",rows.filter(r=>r.fsdu).length]},
      null,
      {v:["Delivery Details",""],h:1,merge:1},
      {v:["Date",d],l:1},
      {v:["Received by",who],l:1}
    ].concat(extras().map(e=>({v:[e[0],e[1]],l:1,note:e[0]==="Notes"?1:0})));
    const n=Math.max(rows.length,side.length-1);
    let off=0;
    if(logo){
      off=5;
      try{
        const dim=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res([im.width,im.height]);im.onerror=rej;im.src=logo});
        const hPx=Math.max(50,Math.min(140,Math.round(428*dim[1]/dim[0])));
        const id=wb.addImage({base64:logo,extension:"png"});
        for(let k=1;k<=4;k++)ws.getRow(k).height=hPx*0.75/4;
        ws.addImage(id,{tl:{col:0,row:0},br:{col:3,row:4},editAs:"oneCell"});
      }catch(e){off=0}
    }
    const bc={argb:"FF000000"};
    const border={top:{style:"medium",color:bc},left:{style:"medium",color:bc},bottom:{style:"medium",color:bc},right:{style:"medium",color:bc}};
    for(let i=-1;i<n;i++){
      const r=ws.getRow(i+2+off);
      const head=i<0;
      const left=head?["LPN","Pallet Type","FSDU"]:rows[i]?[rows[i].lpn,rows[i].type,rows[i].fsdu?"Yes":"No"]:null;
      const right=side[i+1]||null;
      const put=(col,val,bold,isNum,big)=>{
        const cell=r.getCell(col);
        cell.value=val;
        cell.font={name:"Arial",size:big?16:14,bold:!!bold};
        cell.border=big?{...border,top:{style:"medium",color:bc}}:border;
        cell.alignment={vertical:"middle",horizontal:isNum?"center":"left",wrapText:true};
        if(bold)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE6E9ED"}};
      };
      if(left)left.forEach((v,k)=>put(k+1,v,head,false,head));
      if(right){
        put(5,right.v[0],right.h||right.b||right.l,false,right.h);
        put(6,right.v[1],right.h||right.b,typeof right.v[1]==="number",right.h);
        if(right.merge)ws.mergeCells(r.number,5,r.number,6);
      }
      if(r.number>1&&(head||(right&&right.h))){
        const up=ws.getRow(r.number-1);
        (head?[1,2,3,5,6]:[5,6]).forEach(col=>{up.getCell(col).border={bottom:{style:"medium",color:bc}}});
      }
      r.height=(head||(right&&right.h))?26:(right&&right.note?Math.max(22,Math.ceil(String(right.v[1]).length/16)*20):22);
    }
    ws.pageSetup={orientation:"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:(1+off)+":"+(1+off),margins:{left:0.4,right:0.4,top:0.6,bottom:0.6,header:0.3,footer:0.3}};
    ws.views=[{state:"frozen",ySplit:1+off}];
    const buf=await wb.xlsx.writeBuffer();
    pdfJob=()=>buildLogPdf(d);
    await deliver(buf,"LPN-log-"+d+".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    m.textContent="";
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
}
async function loadLogo(){
  try{custom=localStorage.getItem("lpnlogo")||""}catch(e){}
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
