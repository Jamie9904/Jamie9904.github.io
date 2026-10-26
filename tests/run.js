/*
  LPN Pallet Log: automatic checks.
  Run from the site folder:  npm install  then  npm test
  Starts a small local web server, opens the app in Chromium (via Playwright)
  at phone, tablet and desktop sizes, and checks the main features.
  Outside libraries (ExcelJS, jsPDF and so on) are blocked and replaced with
  small stand-ins, so the checks run offline and give the same result every time.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".md": "text/plain" };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

let failed = 0, passed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log("  ok   " + name); }
  else {
    failed++;
    const msg = name + (detail !== undefined ? "  (" + JSON.stringify(detail) + ")" : "");
    console.log("  FAIL " + msg);
    if (process.env.GITHUB_ACTIONS) console.log("::error title=Check failed::" + msg.replace(/[\r\n%]/g, " "));
  }
}

/* Recording stand-in for ExcelJS: keeps every cell, border, merge and print setting. */
const EXCEL_STUB = () => {
  const mkRow = n => ({ number: n, height: 0, _c: {}, getCell(c) { return this._c[c] || (this._c[c] = {}); } });
  class WS { constructor(name) { this.name = name; this.rows = {}; this.headerFooter = {}; this.merges = []; this.images = []; }
    getRow(n) { return this.rows[n] || (this.rows[n] = mkRow(n)); }
    mergeCells(...a) { this.merges.push(a); } addImage(id, o) { this.images.push(o); } }
  class WB { constructor() { this.sheets = []; this.xlsx = { writeBuffer: async () => { window.__wb = this; return new ArrayBuffer(4); }, load: async () => {} }; }
    addWorksheet(n) { const w = new WS(n); this.sheets.push(w); return w; } getWorksheet() { return null; } addImage() { return 1; } }
  window.ExcelJS = { Workbook: WB };
};

async function page(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route("**/*", r => { const u = new URL(r.request().url()); return u.hostname === "127.0.0.1" ? r.continue() : r.abort(); });
  await p.addInitScript(() => { try { localStorage.setItem("lpninstallshown", "1"); } catch (e) {} });
  if (opts.excel) await p.addInitScript(EXCEL_STUB);
  if (opts.init) await p.addInitScript(opts.init);
  p.errors = errors; p.ctx = ctx;
  return p;
}

(async () => {
  const srv = await serve();
  const URL0 = "http://127.0.0.1:" + srv.address().port + "/index.html";
  const browser = await chromium.launch();
  let p;

  console.log("Layout");
  for (const w of [375, 768, 1300]) {
    p = await page(browser, w);
    await p.goto(URL0); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const top = id => Math.round(document.getElementById(id).getBoundingClientRect().top);
      const lab = id => Math.round(document.querySelector("label[for=" + id + "]").getBoundingClientRect().top);
      return { overflow: document.documentElement.scrollWidth - innerWidth, date: lab("date"), recv: lab("recv"), dateBox: top("date"), recvBox: top("recv"),
        recvW: Math.round(document.getElementById("recv").getBoundingClientRect().width) };
    });
    check(w + "px: no sideways scrolling", r.overflow <= 0, r.overflow);
    check(w + "px: Date and Received by line up", r.date === r.recv && r.dateBox === r.recvBox, r);
    check(w + "px: Received by box is a usable width", r.recvW >= 140, r.recvW);
    check(w + "px: no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }

  console.log("Logging on a phone");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.fill("#recv", "Tester"); await p.fill("#expect", "3");
  await p.fill("#trailer", "TR1"); await p.fill("#sealIn", "SI1"); await p.fill("#sealOut", "SO1");
  await p.fill("#lpn", "VLT003977037"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  let s = await p.evaluate(() => ({ rows: rows.length, flash: document.getElementById("flash").textContent, dock: document.getElementById("dockCnt").textContent,
    collapsed: document.getElementById("delCard").classList.contains("dcollapsed"), sum: document.getElementById("delSumTxt").textContent,
    saved: JSON.parse(localStorage.getItem("lpnlog")) }));
  check("pallet added", s.rows === 1, s.rows);
  check("added confirmation shown", /Added #1: VLT003977037/.test(s.flash), s.flash);
  check("entry bar counter", s.dock === "1 of 3 logged", s.dock);
  check("Delivery folds into one line", s.collapsed && /Tester/.test(s.sum) && /Trailer TR1/.test(s.sum), s.sum);
  check("trailer and seals saved", s.saved.trailer === "TR1" && s.saved.sealIn === "SI1" && s.saved.sealOut === "SO1", s.saved);
  await p.fill("#lpn", "VLT003977037"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  check("duplicate LPN warning", await p.isVisible("#chkBar"));
  await p.click("#chkSkip");
  check("skipping a duplicate adds nothing", await p.evaluate(() => rows.length) === 1);

  console.log("Live manifest tracking");
  await p.evaluate(() => { document.getElementById("cmpNums").value = "VLT003977037\nQUB001859260"; });
  s = await p.evaluate(() => document.getElementById("manTxt").textContent);
  check("manifest progress shown", s === "Manifest: 1 of 2 found · 1 still to find", s);
  await p.fill("#lpn", "RBY006266507"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ t: document.getElementById("manTxt").textContent, warn: document.getElementById("flash").classList.contains("warn") }));
  check("pallet not on manifest is flagged", s.warn && /1 not on manifest/.test(s.t), s);

  console.log("Saved deliveries");
  await p.evaluate(() => newDelivery());
  s = await p.evaluate(() => ({ rows: rows.length, hist: hist.length, trailer: document.getElementById("trailer").value, man: document.getElementById("cmpNums").value, recv: document.getElementById("recv").value, histTrailer: hist[0] && hist[0].trailer }));
  check("Start new delivery saves and clears", s.rows === 0 && s.hist === 1 && s.trailer === "" && s.man === "" && s.recv === "Tester" && s.histTrailer === "TR1", s);
  await p.click("#undoBtn");
  s = await p.evaluate(() => ({ rows: rows.length, trailer: document.getElementById("trailer").value }));
  check("Undo brings the delivery back", s.rows === 2 && s.trailer === "TR1", s);
  await p.evaluate(() => openHelp("history", "Saved deliveries"));
  check("last backed up note shown", /backed up/i.test(await p.textContent("#bkNote")));
  await p.evaluate(() => closeHelp());

  console.log("Settings and dates");
  s = await p.evaluate(() => { const a = document.getElementById("dateShow").textContent; cfg.dateFmt = "iso"; showDate(); const b = document.getElementById("dateShow").textContent; cfg.dateFmt = "uk"; showDate(); return [a, b]; });
  check("date box follows Date format", /^\d\d\/\d\d\/\d{4}$/.test(s[0]) && /^\d{4}-\d\d-\d\d$/.test(s[1]), s);
  s = await p.evaluate(async () => { const csv = "LPN,Pallet Type,FSDU,,Delivery Details,\nA1,BB,No,,Date,26/10/2026\nA2,FMCG,Yes,,Trailer number,TR9\n,,,,Seal in,SI9\n,,,,Seal out,SO9";
    const r = await parseExported(new File([csv], "x.csv")); return [r.date, r.trailer, r.sealIn, r.sealOut, r.rows.length, r.rows[1].fsdu]; });
  check("importing an exported log", JSON.stringify(s) === JSON.stringify(["2026-10-26", "TR9", "SI9", "SO9", 2, true]), s);
  await p.evaluate(() => openHelp("guide", "Guide"));
  s = await p.evaluate(() => ({ toc: document.querySelectorAll(".guidetoc a").length, install: !!document.getElementById("showInstall"), wide: document.documentElement.scrollWidth - innerWidth }));
  check("Guide opens with its contents bar", s.toc >= 8 && s.install && s.wide <= 0, s);
  await p.evaluate(() => closeHelp());
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  console.log("Excel export (with a stand-in for ExcelJS)");
  p = await page(browser, 1300, { excel: true, init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "VLT003977037", type: "BB", fsdu: false }, { lpn: "QUB001859260", type: "FMCG", fsdu: true }], date: "2026-10-26", recv: "Tester", expect: "3", trailer: "TR1" })) });
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
      lpnFont: d._c[2].font.name, footer: ws.headerFooter.oddFooter, fit: ws.pageSetup.fitToWidth, titles: ws.pageSetup.printTitlesRow, hdrRow: hdr,
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
    check("fits one page wide, header repeats", s.fit === 1 && s.titles === s.hdrRow + ":" + s.hdrRow, s);
    check("delivery details include the trailer", s.side.includes("Trailer number"), s.side);
  }
  check("file handed over", await p.evaluate(() => window.__saved) === 1);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  console.log("Offline");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(800);
  const cached = await p.evaluate(async () => !!navigator.serviceWorker.controller && (await caches.keys()).some(k => /^lpn-log-v/.test(k)));
  check("app saved for offline use", cached);
  await p.ctx.setOffline(true); await p.reload(); await p.waitForTimeout(500);
  check("app opens offline", (await p.title()) === "LPN Pallet Log");
  await p.ctx.close();

  await browser.close(); srv.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error(e);
  if (process.env.GITHUB_ACTIONS) console.log("::error title=Test run stopped::" + String(e && e.message || e).replace(/[\r\n%]/g, " ").slice(0, 900));
  process.exit(1);
});
