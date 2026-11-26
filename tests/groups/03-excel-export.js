/* Checks: excel export. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Excel export (with a stand-in for ExcelJS)");
  p = await page(browser, 1300, { excel: true, init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "VLT003977037", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: true }], date: "2026-10-26", recv: "Tester", expect: "3", trailer: "TR1", notes: "Two pallets wrapped badly, driver waited twenty minutes, seal checked against the paperwork" })) });
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => { window.saveOnly = async () => { window.__saved = (window.__saved || 0) + 1; }; });
  await p.evaluate(() => document.getElementById("dl").onclick()); await p.waitForTimeout(100);
  check("expected-count check stops the first export", /Expected 3 pallets but 2/.test(await p.textContent("#dlmsg")));
  await p.evaluate(() => document.getElementById("dl").onclick()); await p.waitForTimeout(300);
  s = await p.evaluate(() => {
    const ws = window.__wb && window.__wb.sheets[0]; if (!ws) return null;
    let hdr = 0; Object.keys(ws.rows).forEach(k => { const c = ws.rows[k]._c; if (c[2] && c[2].value === "LPN") hdr = +k; });
    const h = ws.rows[hdr], d = ws.rows[hdr + 1];
    const all4 = c => c.border && ["top", "bottom", "left", "right"].every(x => c.border[x] && c.border[x].style);
    const titleRow = Object.keys(ws.rows).find(k => ws.rows[k]._c[1] && ws.rows[k]._c[1].value === "Goods-in pallet log");
    return { title: titleRow ? ws.rows[titleRow]._c[1].value : null, logo: ws.images.length, titleBelowLogo: !ws.images.length || +titleRow > 4, hdr: [1, 2, 3, 4].map(c => h._c[c].value), hdrH: h.height, borders: [1, 2, 3, 4].every(c => all4(h._c[c]) && all4(d._c[c])),
      lpnFont: d._c[2].font.name, made: (() => { const k = Object.keys(ws.rows).find(k => ws.rows[k]._c[1] && /^Made with/.test(ws.rows[k]._c[1].value || "")); return k ? ws.rows[k]._c[1].value : null; })(), lpnW: ws.columns[1].width, notesH: (() => { const k = Object.keys(ws.rows).find(k => ws.rows[k]._c[6] && ws.rows[k]._c[6].value === "Notes"); return k ? ws.rows[k].height : null; })(), footer: ws.headerFooter.oddFooter, fit: ws.pageSetup.fitToWidth, titles: ws.pageSetup.printTitlesRow, hdrRow: hdr,
      side: Object.keys(ws.rows).map(k => ws.rows[k]._c[6] && ws.rows[k]._c[6].value).filter(Boolean) };
  });
  check("spreadsheet was built", !!s, s);
  if (s) {
    check("title band", s.title === "Goods-in pallet log", s.title);
    check("logo (if any) sits above the title", s.titleBelowLogo, s);
    check("table header", JSON.stringify(s.hdr) === JSON.stringify(["#", "LPN", "Pallet Type", "FSDU"]), s.hdr);
    check("header row is tall enough", s.hdrH >= 30, s.hdrH);
    check("cells have all four borders", s.borders);
    check("LPNs in Courier New", s.lpnFont === "Courier New", s.lpnFont);
    check("page footer with page numbers", /Page &P of &N/.test(s.footer || ""), s.footer);
    check("footer names the app version and build", /LPN Pallet Log v\d+\.\d+ \(build \d+\)/.test(s.footer || ""), s.footer);
    check("note under the tables says which version made it", /^Made with LPN Pallet Log v\d+\.\d+ \(build \d+\) on \d\d\/\d\d\/\d{4} at \d\d:\d\d\.$/.test(s.made || ""), s.made);
    check("fits one page wide, header repeats", s.fit === 1 && s.titles === s.hdrRow + ":" + s.hdrRow, s);
    check("delivery details include the trailer", s.side.includes("Trailer number"), s.side);
    check("LPN column fits the longest LPN (13 characters)", s.lpnW >= 27, s.lpnW);
    {
      // 14pt Arial in the 20-wide Notes column fits about 13 characters a line; each line needs about 17pt.
      const words = "Two pallets wrapped badly, driver waited twenty minutes, seal checked against the paperwork".split(" ");
      let lines = 1, len = 0; words.forEach(w => { if (len && len + 1 + w.length > 13) { lines++; len = w.length; } else len += (len ? 1 : 0) + w.length; });
      check("long delivery notes get a tall enough row", s.notesH >= lines * 17, { height: s.notesH, needs: lines * 17 });
    }
  }
  check("file handed over", await p.evaluate(() => window.__saved) === 1);
  s = await p.evaluate(async () => {
    window.sendFile = async () => {}; window.__wb = null;
    document.getElementById("cmpLogNums").value = "VLT003977037\nRUN0001830763"; document.getElementById("cmpNums").value = "VLT003977037\nRUN0001830763\nRBY006291167";
    await document.getElementById("cmpGo").onclick();
    const ws = window.__wb && window.__wb.sheets.find(w => /Manifest/.test(w.name)); window.__cmpMade = ws && Object.keys(ws.rows).some(k => ws.rows[k]._c[1] && /^Made with LPN Pallet Log v/.test(ws.rows[k]._c[1].value || "")); return ws ? ws.columns[1].width : null;
  });
  check("manifest check LPN column fits a 13-character LPN", s >= 27, s);
  check("manifest check notes the app version too", await p.evaluate(() => window.__cmpMade));
  s = await p.evaluate(async () => {
    const junk = "HTTPSEXAMPLECOMTHISISNOTANLPNBUTAVERYLONGSCANNEDVALUE1234567890ABCDEFGHIJ";
    window.__wb = null; document.getElementById("cmpLogNums").value = "VLT003977037\n" + junk; document.getElementById("cmpNums").value = "VLT003977037";
    await document.getElementById("cmpGo").onclick();
    const ws = window.__wb.sheets.find(w => /Manifest/.test(w.name));
    const k = Object.keys(ws.rows).find(k => ws.rows[k]._c[2] && ws.rows[k]._c[2].value === junk);
    return { w: ws.columns[1].width, h: k ? ws.rows[k].height : null };
  });
  check("a junk scan can't stretch the LPN column, it wraps onto a taller row", s.w <= 40 && s.h > 24, s);
  // Notes for the check: kept on the phone, in Delivery Details on the Excel, in the shared missing list; Clear empties them.
  s = await p.evaluate(async () => {
    window.__wb = null; const nb = document.getElementById("cmpNotes"), note = "The Daventry DC didn't send a manifest for the RBY pallets, so they show as log only.";
    nb.value = note; nb.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("cmpLogNums").value = "VLT003977037\nRBY006291167"; document.getElementById("cmpNums").value = "VLT003977037";
    await document.getElementById("cmpGo").onclick();
    const ws = window.__wb.sheets.find(w => /Manifest/.test(w.name)), val = (k, c) => ws.rows[k]._c[c] && ws.rows[k]._c[c].value;
    const kl = Object.keys(ws.rows).find(k => val(k, 7) === "Notes"), kt = Object.keys(ws.rows).find(k => val(k, 7) === note);
    const out = { label: !!kl, text: !!kt, below: kl && kt && +kt === +kl + 1, merged: ws.merges.some(m => m[0] === +kt && m[2] === +kt && m[1] === 7 && m[3] === 8), h: kt ? ws.rows[kt].height : 0,
      stored: localStorage.getItem("lpncmpnotes"), share: cmpShareText(cmpData()).split("\n").pop() };
    document.getElementById("cmpClear").click(); out.cleared = nb.value === "" && localStorage.getItem("lpncmpnotes") === null; return out;
  });
  check("notes for a manifest check go under Delivery Details on the Excel (a row of their own, tall enough), in the shared list, and stay until Clear",
    s.label && s.text && s.below && s.merged && s.h >= 42 && /^The Daventry DC/.test(s.stored || "") && s.share === "Notes: The Daventry DC didn't send a manifest for the RBY pallets, so they show as log only." && s.cleared, s);
  // A DC with pallets on the log but none on the manifest: "No manifest received", by DC, on screen, the Excel and the shared list.
  s = await p.evaluate(async () => {
    window.__wb = null; const out = {};
    document.getElementById("cmpLogNums").value = ["VLT003977037", "VLT003977038", "RBY006291167", "IM00012345678", "RBY006291168", "QUB001899182"].join("\n");
    document.getElementById("cmpNums").value = ["VLT003977037", "V0013323651", "QUB001899182"].join("\n");
    const C = cmpData(); out.kinds = C.res.map(x => x.n + ":" + C.kind(x)).join(","); out.dcs = JSON.stringify(C.nmDcs);
    document.getElementById("cmpCheck").click(); await new Promise(r => setTimeout(r, 50));
    const res = document.getElementById("cmpRes"); out.head = (res.querySelector("h3.nm") || {}).textContent; out.row = (res.querySelector(".nmri .l") || {}).textContent;
    out.share = cmpShareText(cmpData()).split("\n").find(l => /^No manifest/.test(l));
    await document.getElementById("cmpGo").onclick();
    const ws = window.__wb.sheets.find(w => /Manifest/.test(w.name)), val = (k, c) => ws.rows[k]._c[c] && ws.rows[k]._c[c].value, ks = Object.keys(ws.rows);
    out.xlRow = val(ks.find(k => val(k, 2) === "RBY006291167"), 5); out.xlSum = val(ks.find(k => val(k, 7) === "⊘ No manifest"), 8); out.xlFrom = val(ks.find(k => val(k, 7) === "No manifest from"), 8);
    res.querySelector(".nmri button").click(); const C2 = cmpData(); out.after = C2.res.filter(x => C2.kind(x) === "book").map(x => x.n).join(",") + "|" + C2.nmDcs.length;
    document.getElementById("cmpClear").click(); out.clear = cmpNoManKeep.size; return out;
  });
  check("a DC with pallets on the log but none on the manifest shows as No manifest received (by DC: VLT/V Vault, RUN/R Runcorn, QUB/Q Qube, RBY/IM Rugby), not log only",
    s.kinds === "VLT003977037:ok,V0013323651:missing,QUB001899182:ok,VLT003977038:book,RBY006291167:noman,IM00012345678:noman,RBY006291168:noman" && s.dcs === '[{"dc":"Rugby","n":3}]'
    && s.head === "⊘ No manifest received (3)" && s.row === "Rugby: 3 pallets on the log" && s.share === "No manifest received: Rugby (3 pallets)", s);
  check("No manifest goes on the Excel (each pallet's result, the summary count and which DCs), and Count as log only puts a DC back to log only until Clear",
    s.xlRow === "⊘ NO MANIFEST" && s.xlSum === 3 && s.xlFrom === "Rugby" && s.after === "VLT003977038,RBY006291167,IM00012345678,RBY006291168|0" && s.clear === 0, s);
  s = await p.evaluate(() => ({ note: document.getElementById("expNote").textContent, next: !document.getElementById("nextBar").hidden }));
  check("export is noted and a new delivery is offered", /Exported at \d\d:\d\d/.test(s.note) && s.next, s);
  await p.click("#nextNew");
  check("Start new delivery from the prompt goes straight through", await p.evaluate(() => rows.length) === 0);
  // Pallets per DC: a By DC line on the pallet log's exports and per-DC results on the Manifest check's, when more than one DC.
  s = await p.evaluate(async () => {
    const keep = rows.slice(), out = {}, ex = () => (extras().find(e => e[0] === "By DC") || [])[1];
    rows = ["VLT004040901", "VLT004040902", "V0013323651", "RBY006292501", "IM0012345679", "RUN0001830901", "XQZ004040903"].map(l => ({ lpn: l, type: "BB", fsdu: false }));
    rows.push({ lpn: "RBY006292502", type: "BB", fsdu: false, ref: true }, { lpn: "No LPN 1", type: "BB", fsdu: false });
    const expKeep = document.getElementById("expect").value; document.getElementById("expect").value = "";
    out.line = ex(); window.__wb = null; window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const ws = window.__wb.sheets[0], v = (k, c) => ws.rows[k]._c[c] && ws.rows[k]._c[c].value; out.xl = v(Object.keys(ws.rows).find(k => v(k, 6) === "By DC"), 7);
    rows = ["VLT004040901", "VLT004040902"].map(l => ({ lpn: l, type: "BB", fsdu: false })); out.one = ex() === undefined;
    window.__wb = null; document.getElementById("cmpLogNums").value = "VLT004040801\nVLT004040802\nRBY006292401\nRUN0001830801"; document.getElementById("cmpNums").value = "VLT004040801\nVLT004040899\nRUN0001830801";
    await document.getElementById("cmpGo").onclick();
    const wc = window.__wb.sheets.find(w => /Manifest/.test(w.name)), vc = (k, c) => wc.rows[k]._c[c] && wc.rows[k]._c[c].value, kc = Object.keys(wc.rows).map(Number).sort((a, b) => a - b);
    const kh = kc.find(k => vc(k, 7) === "By DC"); out.cmpXl = kh ? [1, 2, 3].map(i => vc(kh + i, 7) + ": " + vc(kh + i, 8)).join("|") : "";
    out.cmpShare = cmpShareText(cmpData()).split("\n").slice(-4).join("|");
    document.getElementById("cmpClear").click(); rows = keep; document.getElementById("expect").value = expKeep; return out;
  });
  check("the pallet log's exports get a By DC line in Delivery Details when the pallets came from more than one DC (refused and No LPN left out), and none for one DC",
    s.line === "Vault 3 · Rugby 2 · Runcorn 1 · Other 1" && s.xl === s.line && s.one, s);
  check("the Manifest check's Excel and shared list give the results for each DC, problems first",
    s.cmpXl === "Vault: 1 missing · 1 extra · 1 matched|Rugby: no manifest (1 on the log)|Runcorn: 1 matched" && s.cmpShare === "By DC:|Vault: 1 missing · 1 extra · 1 matched|Rugby: no manifest (1 on the log)|Runcorn: 1 matched", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
