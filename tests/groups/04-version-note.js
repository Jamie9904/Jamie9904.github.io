/* Checks: version note. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Export version note");
  // Make every request for sw.js hang for 15 seconds, as on a very weak signal.
  p = await page(browser, 1300, { excel: true, init: () => {
    localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "VLT003977037", type: "BB", fsdu: false }], date: "2026-10-26", recv: "Tester" }));
    const f = window.fetch; window.fetch = (u, o) => /sw\.js/.test(String(u)) ? new Promise(res => setTimeout(() => res(f(u, o)), 15000)) : f(u, o);
  } });
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => { window.saveOnly = async () => {}; const t0 = Date.now(); await document.getElementById("dl").onclick(); return Date.now() - t0; });
  check("a slow network doesn't hold up an export", s < 3000, s);
  s = await p.evaluate(async () => {
    let html = ""; window.saveOnly = async (buf) => { html = typeof buf === "string" ? buf : ""; };
    await fallbackXls("2026-10-26"); return html.match(/Made with [^<]*/) ? html.match(/Made with [^<]*/)[0] : null;
  });
  check("basic .xls fallback has the version line with a time", /^Made with LPN Pallet Log v\d+\.\d+.* on \d\d\/\d\d\/\d{4} at \d\d:\d\d\.$/.test(s || ""), s);
  s = await p.evaluate(async () => {
    const texts = []; let kw = "";
    const any = () => new Proxy(function () {}, { get: (t, k) => k === "lastAutoTable" ? { finalY: 60 } : k === "internal" ? { pageSize: { getWidth: () => 210, getHeight: () => 297 } } : k === "getNumberOfPages" ? () => 1 : k === "output" ? () => new ArrayBuffer(4) : k === "text" ? (x) => { texts.push(String(x)); } : k === "setProperties" ? (o) => { kw = o.keywords; } : () => {} , apply: () => {} });
    window.jspdf = { jsPDF: function () { return any(); } }; window.jspdf.jsPDF.API = { autoTable: () => {} };
    await buildLogPdf("2026-10-26");
    const o = JSON.parse(decodeURIComponent(kw.slice(8)));
    return { app: o.app, rows: o.rows.length, footer: texts.find(x => /^LPN Pallet Log/.test(x)) || null };
  });
  check("PDF records the version in its data and footer", /^LPN Pallet Log v\d+\.\d+/.test(s.app || "") && s.rows === 1 && /^LPN Pallet Log v/.test(s.footer || ""), s);
  s = await p.evaluate(async () => { const csv = "#,LPN,Pallet Type,FSDU\n1,A1,BB,No\n2,A2,FMCG,Yes\nMade with LPN Pallet Log v3.30 (build 26),Made with LPN Pallet Log v3.30 (build 26),,"; const r = await parseExported(new File([csv], "x.csv")); return r.rows.length; });
  check("importing stops at the version line", s === 2, s);
  // The pdf.js version the app loads must be outside the known ranges where a crafted PDF could run code.
  {
    const code = fs.readFileSync(path.join(ROOT, "compare.js"), "utf8");
    const vers = [...new Set([...code.matchAll(/pdfjs-dist@(\d+)\.(\d+)\.(\d+)\//g)].map(m => m.slice(1, 4).join(",")))];
    const lt = (a, b) => { a = a.split(",").map(Number); for (let k = 0; k < 3; k++) if (a[k] !== b[k]) return a[k] < b[k]; return false; };
    const bad = vers.filter(v => lt(v, [4, 2, 67]) || (!lt(v, [5, 6, 83]) && lt(v, [6, 2, 109])));
    check("the PDF reader is a version without the known flaws", vers.length === 1 && bad.length === 0, { vers, bad });
  }
  {
    // Every outside request is blocked. The service worker is off too, or it would fetch pdf.js itself where there is internet.
    const q = await page(browser, 375, { noSW: true });
    await q.goto(URL0); await q.waitForTimeout(200);
    s = await q.evaluate(async () => { try { await parseExported(new File(["%PDF"], "log.pdf")); return "no error"; } catch (e) { return e.message; } });
    check("a PDF reader that can't load gives a plain message", /^The PDF reader couldn’t load\. Check you’re online/.test(s), s);
    await q.ctx.close();
  }
  {
    const src = ["core.js", "scan.js", "export.js", "compare.js", "panels.js"].map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]);
    const direct = src.flatMap(([f, t]) => (t.match(/getDocument\(/g) || []).map(() => f));
    check("PDFs are only opened through openPdf()", direct.length === 1 && direct[0] === "compare.js" && /getDocument\(\{data:bytes\}\)/.test(src[3][1]), direct);
  }
  // A stand-in ExcelJS sheet that behaves like the real one for merged cells: every cell in a merged block
  // reports the block's text, and only the top-left cell is its own master. Here the version line comes
  // straight after the pallets (no blank row), as it would if someone tidied the sheet before sending it.
  s = await p.evaluate(async () => {
    const made = "Made with LPN Pallet Log v3.30 (build 26) on 30/10/2026 at 14:43.";
    const cells = [["Goods-in pallet log", "Goods-in pallet log", "Goods-in pallet log", "", "", "", ""], ["#", "LPN", "Pallet Type", "FSDU", "", "Pallet Type", "Count"],
      [1, "VLT004037790", "BB", "Yes", "", "Notes", "Seal checked"], [2, "RUN0001830763", "FPP", "No", "", "Received by", "Jamie"], Array(7).fill(made)];
    const merges = [{ r: 0, c1: 1, c2: 3 }, { r: 4, c1: 1, c2: 7 }];
    const ws = { name: "Pallet Log", eachRow(o, fn) { cells.forEach((r, i) => fn({ values: [undefined, ...r], eachCell(o2, f2) {
      for (let c = 1; c <= r.length; c++) { const m = merges.find(x => x.r === i && c >= x.c1 && c <= x.c2); const cell = { isMerged: !!m }; if (m) cell.master = c === m.c1 ? cell : {}; f2(cell, c); } } }, i + 1)); } };
    const keep = [window.ExcelJS, window.loadExcel];
    window.ExcelJS = { Workbook: class { constructor() { this.worksheets = [ws]; this.xlsx = { load: async () => {} }; } } };
    window.loadExcel = async () => {};
    try {
      const grid = sheetGrid(ws);
      const imp = await parseExported(new File(["x"], "log.xlsx"));
      const cmp = await readLog(new File(["x"], "log.xlsx"));
      return { versionRow: grid[4].filter(Boolean).length, title: grid[0].filter(Boolean).length, imp: imp.rows.map(r => r.lpn), notes: imp.notes, recv: imp.recv, cmp };
    } finally { window.ExcelJS = keep[0]; window.loadExcel = keep[1]; }
  });
  check("a merged line in a spreadsheet is read once, not in every column", s.versionRow === 1 && s.title === 1, s);
  check("importing a spreadsheet stops at the version line", JSON.stringify(s.imp) === '["VLT004037790","RUN0001830763"]' && s.notes === "Seal checked" && s.recv === "Jamie", s);
  check("the Manifest check reads the same pallets from that spreadsheet", JSON.stringify(s.cmp) === JSON.stringify(s.imp), s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
