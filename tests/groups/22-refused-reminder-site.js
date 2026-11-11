/* Checks: refused pallets (sent back with the driver), the reminder about a delivery from an earlier day that was never
   exported, and the site or store name on exports. */
const { check, page } = require("../lib");
const cells = () => { const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); })); return vals; };
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Refused pallets");
  p = await page(browser, 375, { excel: true });
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "VLT004040273", type: "FMCG", fsdu: true }, { lpn: "VLT004040278", type: "BB", fsdu: false }]; document.getElementById("expect").value = "3"; save(); render(); });
  await p.click('#body .lpnedit[data-i="1"]'); await p.waitForTimeout(100);
  s = await p.evaluate(() => { const b = document.querySelector(".dmgrow .refbtn"); return { text: b && b.textContent, on: b && b.classList.contains("on"), label: b && b.getAttribute("aria-label"), h: b && Math.round(b.getBoundingClientRect().height) }; });
  check("tapping a pallet offers Refused (sent back), big enough to tap", s.text === "Refused (sent back)" && !s.on && /Mark VLT004040273 as refused, sent back with the driver/.test(s.label) && s.h >= 44, s);
  await p.click(".dmgrow .refbtn"); await p.waitForTimeout(100);
  s = await p.evaluate(() => { const tr = document.querySelectorAll("#body tr")[1], sum = document.getElementById("sum").textContent;
    return { ref: rows[1].ref, open: !!document.querySelector(".dmgrow"), tag: tr.querySelector(".reftag") && tr.querySelector(".reftag").textContent, cls: tr.classList.contains("refused"), sum, exp: document.getElementById("expInfo").textContent, undo: document.getElementById("undoTxt").textContent, saved: JSON.parse(localStorage.getItem("lpnlog")).rows[1].ref,
    label: tr.querySelector(".lpnedit").getAttribute("aria-label"), wrap: getComputedStyle(tr.querySelector(".reftag")).wordBreak, tagH: Math.round(tr.querySelector(".reftag").getBoundingClientRect().height) }; });
  check("a refused pallet stays on the log, marked, and isn't counted as received; it's still one of the expected pallets", s.ref === true && !s.open && s.tag === "Refused: sent back" && s.cls && /^2Total2BB0FMCG0FPP0Mixed0FSDU1Refused$/.test(s.sum) && /3 of 3 expected/.test(s.exp) && s.undo === "Marked VLT004040273 as refused (sent back)" && s.saved === true && /^Edit LPN VLT004040273, refused, sent back/.test(s.label) && s.wrap === "normal" && s.tagH < 26, s);
  // Still refused after the app is opened again (and in a backup, which goes through the same tidy-up).
  await p.reload(); await p.waitForTimeout(300);
  s = await p.evaluate(() => ({ ref: rows[1].ref, backup: JSON.parse(checkBackup({ lpnlog: localStorage.getItem("lpnlog") }).data.lpnlog).rows[1].ref }));
  check("a refused pallet is still refused when the app is opened again, and in a backup", s.ref === true && s.backup === true, s);
  // Exports: Excel totals and Delivery details; the PDF's hidden data; both read back on import.
  s = await p.evaluate(async () => {
    window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const v = (() => { const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); })); return vals; })();
    const at = l => v.indexOf(l) >= 0 ? v[v.indexOf(l) + 1] : null;
    const csv = "#,LPN,Pallet Type,FSDU\n1,VLT004040265,BB,No\n2,VLT004040273,FMCG,Yes\n\nRefused pallet,VLT004040273: sent back with the driver";
    const imp = await parseExported(new File([csv], "x.csv"));
    const kw = "LPNLOG2:" + encodeURIComponent(JSON.stringify({ d: "2026-11-11", rows: [["VLT004040265", "BB", 0], ["VLT004040273", "FMCG", 1, "", "", 1]] }));
    const real = { loadPdfJs: window.loadPdfJs, openPdf: window.openPdf };
    window.loadPdfJs = async () => {}; window.openPdf = async () => ({ numPages: 0, getMetadata: async () => ({ info: { Keywords: kw } }) });
    let pdf; try { pdf = await parseExported(new File(["x"], "x.pdf")); } finally { window.loadPdfJs = real.loadPdfJs; window.openPdf = real.openPdf; }
    return { total: at("Total"), refused: at("Refused (not in total)"), fsdu: at("FSDU (not in total)"), detail: at("Refused pallet"), imp: imp.rows.map(r => r.lpn + (r.ref ? "*" : "")).join(), pdf: pdf.rows.map(r => r.lpn + (r.ref ? "*" : "")).join() };
  });
  check("the Excel export leaves refused pallets out of the total, counts them on their own and lists them in Delivery details; Excel and PDF logs read back with them marked", s.total === "2" && s.refused === "1" && s.fsdu === "0" && s.detail === "VLT004040273: sent back with the driver" && s.imp === "VLT004040265,VLT004040273*" && s.pdf === "VLT004040265,VLT004040273*", s);
  // The Excel boxes (thick outer edges, medium inner ones): the Pallet Type box ends under its Refused row, and the
  // Delivery Details box starts with its header row, however many rows the first box has.
  s = await p.evaluate(() => { const ws = window.__wb.sheets[0], find = t => Object.keys(ws.rows).find(k => ws.rows[k]._c[6] && ws.rows[k]._c[6].value === t);
    const ref = find("Refused (not in total)"), dd = find("Delivery Details"), b = (k, c) => ws.rows[k]._c[c].border, st = x => x && (x.style || x);
    return { refBottom: st(b(ref, 6).bottom), refTop: st(b(ref, 6).top), ddTop: st(b(dd, 6).top), ddBottom: st(b(dd, 6).bottom), fsduBottom: st(b(+ref - 1, 6).bottom) }; });
  check("in the Excel export the Refused row closes the Pallet Type box and the Delivery Details box starts on its header", s.refBottom === "thick" && s.fsduBottom === "medium" && s.ddTop === "thick" && s.ddBottom === "thick", s);
  // The Manifest check's copy of the log and the Saved deliveries list count refused pallets the same way.
  s = await p.evaluate(() => { const g = logGridFrom(rows.map(r => Object.assign({}, r)), "2026-11-11", "Jamie"), at = l => { const r = g.find(x => x[4] === l); return r ? r[5] : null; };
    hist = [{ id: "h1", saved: new Date().toISOString(), date: localToday(), rows: rows.map(r => Object.assign({}, r)) }]; saveHist(); openHelp("history", "Saved deliveries");
    const list = [...document.querySelectorAll("#panelBody .hist .sb")].map(x => x.textContent).join(" | "); closeHelp(); return { total: at("Total"), refused: at("Refused (not in total)"), list }; });
  check("the Manifest check's copy of the log and the Saved deliveries list leave refused pallets out of the counts and show them on their own", s.total === 2 && s.refused === 1 && /FSDU 0, refused 1/.test(s.list), s);
  // The app's own PDF export (with jsPDF replaced by a stand-in that keeps the hidden data) marks the refused pallet.
  s = await p.evaluate(async () => {
    const doc = new Proxy({}, { get(t, k) {
      if (k === "setProperties") return o => { window.__kw = o.keywords; return doc; };
      if (k === "text") return (t) => { (window.__txt = window.__txt || []).push(String(t)); return doc; };
      if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 }, getNumberOfPages: () => 1, getCurrentPageInfo: () => ({ pageNumber: 1 }), scaleFactor: 1 };
      if (k === "getTextWidth" || k === "getStringUnitWidth") return () => 10;
      if (k === "splitTextToSize") return x => [String(x)];
      if (k === "getNumberOfPages") return () => 1;
      if (k === "lastAutoTable") return { finalY: 100 };
      if (k === "getFontSize") return () => 10;
      if (k === "getImageProperties") return () => ({ width: 100, height: 100 });
      if (k === "output") return () => new ArrayBuffer(4);
      if (k === "then") return undefined;
      return () => doc; } });
    const J = function () { return doc; }; J.API = { autoTable() {} }; window.jspdf = { jsPDF: J };
    try { await buildLogPdf(document.getElementById("date").value || "2026-11-11"); } catch (e) { return "error: " + e.message; }
    const o = JSON.parse(decodeURIComponent(String(window.__kw || "").slice(8))); window.__pdfDoc = doc; return JSON.stringify(o.rows[1]);
  });
  check("the PDF's hidden data marks a refused pallet, so it reads back marked", s === '["VLT004040273","FMCG",1,"","",1]', s);
  // The Manifest check still matches a refused pallet (it came off the trailer).
  s = await p.evaluate(() => { document.getElementById("cmpLogNums").value = rows.map(r => r.lpn).join("\n"); document.getElementById("cmpNums").value = "VLT004040265\nVLT004040273\nVLT004040278"; const C = cmpData(); return C.cnt; });
  check("the Manifest check still matches a refused pallet", s.ok === 3 && s.missing === 0, s);
  // Not refused puts it back.
  await p.click('#body .lpnedit[data-i="1"]'); await p.waitForTimeout(100);
  s = await p.evaluate(() => document.querySelector(".dmgrow .refbtn").textContent);
  await p.click(".dmgrow .refbtn"); await p.waitForTimeout(100);
  s = { btn: s, ref: await p.evaluate(() => rows[1].ref || false), sum: await p.evaluate(() => document.getElementById("sum").textContent) };
  check("Not refused counts it as received again", s.btn === "Not refused" && s.ref === false && /^3Total/.test(s.sum) && !/Refused/.test(s.sum), s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
  // Switched off: no button, but a pallet already marked keeps its mark; in testing: the note shows by the button.
  for (const [mode, body] of [["off", { features: { refused: false }, testing: {} }], ["testing", { features: {}, testing: { refused: true } }]]) {
    p = await page(browser, 375);
    await p.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.LPN_CONFIG=" + JSON.stringify(body) + ";" }));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false, ref: true }, { lpn: "VLT004040273", type: "BB", fsdu: false }]; save(); render();
      document.querySelector('#body .lpnedit[data-i="1"]').click(); await new Promise(r => setTimeout(r, 100));
      const out = { btn: !!document.querySelector(".dmgrow .refbtn"), note: !!document.querySelector('.dmgrow .testnote[data-test="refused"]'), tag: !!document.querySelector("#body .reftag") };
      openHelp("guide", "How to use this app"); out.guide = /Refused pallet:/.test(document.getElementById("panelBody").textContent); closeHelp(); return out; });
    if (mode === "off") check("with refused switched off there is no Refused button or Guide line, and a pallet already marked keeps its mark", !s.btn && !s.guide && s.tag, s);
    else check("with refused marked as in testing the note shows by the Refused button", s.btn && s.note && s.guide, s);
    await p.ctx.close();
  }

  console.log("Reminder about a delivery not exported");
  const opened = async (log, extra, body) => {
    const q = await page(browser, 375, { init: `localStorage.setItem("lpnlog", ${JSON.stringify(JSON.stringify(log))});${extra || ""}` });
    if (body) await q.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.LPN_CONFIG=" + JSON.stringify(body) + ";" }));
    await q.clock.setFixedTime(new Date("2026-11-11T08:00:00"));
    await q.goto(URL0); await q.waitForTimeout(300);
    return q;
  };
  const old = { rows: [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "VLT004040273", type: "BB", fsdu: false }], date: "2026-11-10", recv: "Jamie" };
  p = await opened(old);
  s = await p.evaluate(() => ({ shown: !document.getElementById("unexp").hidden, text: document.getElementById("unexpTxt").textContent }));
  check("a delivery from an earlier day that was never exported shows a reminder when the app opens", s.shown && s.text === "The delivery from 10/11/2026 (2 pallets) hasn’t been exported or emailed yet.", s);
  await p.click("#unexpGo"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ hidden: document.getElementById("unexp").hidden, menu: !document.getElementById("expMenu").hidden, focus: document.activeElement.id }));
  check("Export now opens the Export menu", s.hidden && s.menu && s.focus === "expBtn", s);
  await p.ctx.close();
  p = await opened(old);
  s = await p.evaluate(() => { openHelp("guide", "How to use this app"); const inert = document.getElementById("unexp").inert; closeHelp(); return { inert, after: document.getElementById("unexp").inert }; });
  check("the reminder is set aside while a panel is open over the page", s.inert === true && s.after === false, s);
  await p.click("#unexpNo"); await p.waitForTimeout(50);
  check("after Not now, focus goes to the page, not to a header button", await p.evaluate(() => document.activeElement.tagName === "MAIN"));
  await p.ctx.close();
  p = await opened(old);
  await p.click("#unexpNo"); await p.waitForTimeout(50);
  s = { now: await p.evaluate(() => document.getElementById("unexp").hidden) };
  await p.reload(); await p.waitForTimeout(300);
  s.again = await p.evaluate(() => document.getElementById("unexp").hidden);
  s.changed = await p.evaluate(() => { rows.push({ lpn: "VLT004040278", type: "BB", fsdu: false }); save(); unexpCheck(); return document.getElementById("unexp").hidden; });
  check("Not now hides it for that delivery, until the delivery changes", s.now && s.again && !s.changed, s);
  await p.ctx.close();
  const cases = [["today's delivery", Object.assign({}, old, { date: "2026-11-11" })], ["an exported one", Object.assign({}, old, { exp: { at: "2026-11-10T16:00:00.000Z", sig: "" } })], ["an empty log", { rows: [], date: "2026-11-10" }]];
  for (const [what, log] of cases) {
    p = await opened(log);
    if (what === "an exported one") { await p.evaluate(() => { exported = { at: "2026-11-10T16:00:00.000Z", sig: logSig() }; save(); unexpCheck(); }); }
    s = await p.evaluate(() => document.getElementById("unexp").hidden);
    check("no reminder for " + what, s, s);
    await p.ctx.close();
  }
  p = await opened(old, "", { features: { exportReminder: false }, testing: {} });
  check("no reminder with exportReminder switched off", await p.evaluate(() => document.getElementById("unexp").hidden));
  await p.ctx.close();
  p = await opened(old, "", { features: {}, testing: { exportReminder: true } });
  check("with the reminder marked as in testing, the note shows in it", await p.evaluate(() => !document.getElementById("unexp").hidden && !!document.querySelector('#unexp .testnote[data-test="exportReminder"]')));
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // The warning colour stays readable on a mid-grey background someone picks.
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(() => { const r = (a, b) => { const x = lumOf(a) + .05, y = lumOf(b) + .05; return Math.max(x, y) / Math.min(x, y); }, out = {};
    for (const bg of ["#808080", "#6e6e6e", "#9a9a9a", "#0c1830", "#eef1f6"]) { theme = { bg, ac: "#ffee00", follow: false }; applyTheme(); const st = getComputedStyle(document.documentElement), g = k => st.getPropertyValue(k).trim(); out[bg] = +Math.min(r(g("--wn"), g("--paper")), r(g("--wn"), bg)).toFixed(2); } return out; });
  check("the warning colour (refused tags, reminders) is readable on any background colour", Object.values(s).every(v => v >= 4.5), s);
  await p.ctx.close();

  console.log("Site or store name on exports");
  p = await page(browser, 1300, { excel: true });
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => {
    openHelp("settings", "Settings"); const i = document.getElementById("setSite"); i.value = "  323   Wigan  " + "x".repeat(60); i.dispatchEvent(new Event("change")); const shown = i.value; closeHelp();
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render();
    window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); }));
    const title = vals.find(v => /Goods-in pallet log/.test(v));
    window.__txt = []; const doc = new Proxy({}, { get(t, k) {
      if (k === "text") return x => { window.__txt.push(String(x)); return doc; };
      if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 }, getNumberOfPages: () => 1, getCurrentPageInfo: () => ({ pageNumber: 1 }), scaleFactor: 1 };
      if (k === "getTextWidth" || k === "getStringUnitWidth") return () => 10;
      if (k === "splitTextToSize") return x => [String(x)];
      if (k === "getNumberOfPages") return () => 1;
      if (k === "lastAutoTable") return { finalY: 100 };
      if (k === "getFontSize") return () => 10;
      if (k === "getImageProperties") return () => ({ width: 100, height: 100 });
      if (k === "output") return () => new ArrayBuffer(4);
      if (k === "then") return undefined;
      return () => doc; } });
    const J = function () { return doc; }; J.API = { autoTable() {} }; window.jspdf = { jsPDF: J };
    try { await buildLogPdf("2026-11-11"); } catch (e) {}
    const pdfT = window.__txt.find(x => /Goods-in pallet log/.test(x));
    // A long site name in capitals still fits between the PDF's margins (smaller font), and the Excel title gets smaller too.
    cfg.site = "MORRISONS DISTRIBUTION CENTRE WIGAN 3231"; window.__txt = []; window.__drawnAt = undefined; let fsz = []; const wOf = (t, f) => t.length * f * 0.62 * 0.3528;
    const doc2 = new Proxy({}, { get(t, k) { if (k === "setFontSize") return f => { fsz.push(f); return doc2; }; if (k === "getTextWidth") return t2 => wOf(t2, fsz[fsz.length - 1]);
      if (k === "text") return x => { window.__txt.push(String(x)); if (window.__drawnAt === undefined) window.__drawnAt = fsz[fsz.length - 1]; return doc2; }; if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297 } }; if (k === "then") return undefined; return () => doc2; } });
    window.pdfTitle(doc2, 10, 10, "Goods-in pallet log", "sub");
    const longTitle = window.__txt[0];
    const ws3 = { getRow: () => ({ getCell: () => ({}) , height: 0 }), mergeCells: () => {} }; const cells3 = []; ws3.getRow = () => ({ getCell: () => { const c = {}; cells3.push(c); return c; } });
    xlTitle(ws3, 0, 7, "Goods-in pallet log", "sub"); cfg.site = "";
    const pdfFit = wOf(longTitle, window.__drawnAt) <= 190 && window.__drawnAt < 18;
    cfg.site = ""; saveCfg(); window.__wb = null; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const plain = []; const w2 = window.__wb.sheets[0]; Object.keys(w2.rows).forEach(k => Object.keys(w2.rows[k]._c).forEach(j => { const c = w2.rows[k]._c[j]; if (c && /Goods-in pallet log/.test(String(c.value))) plain.push(String(c.value)); }));
    return { shown, saved: JSON.parse(localStorage.getItem("lpncfg")).site, title, pdfTitle: pdfT, plain: plain[0], pdfFit, xlSize: cells3[0].font && cells3[0].font.size };
  });
  check("the site name from Settings (tidied, up to 40 characters) is added to the Excel and PDF titles, and left off when blank", s.shown === "323 Wigan " + "x".repeat(30) && s.title === "Goods-in pallet log – 323 Wigan " + "x".repeat(30) && s.pdfTitle === s.title && s.pdfFit && s.xlSize < 22 && s.plain === "Goods-in pallet log", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
