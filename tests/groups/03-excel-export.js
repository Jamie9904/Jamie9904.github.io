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
  s = await p.evaluate(() => ({ note: document.getElementById("expNote").textContent, next: !document.getElementById("nextBar").hidden }));
  check("export is noted and a new delivery is offered", /Exported at \d\d:\d\d/.test(s.note) && s.next, s);
  await p.click("#nextNew");
  check("Start new delivery from the prompt goes straight through", await p.evaluate(() => rows.length) === 0);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
