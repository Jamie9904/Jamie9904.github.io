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

/* The real export libraries, at the versions the app loads. npm install puts them in node_modules (GitHub
   always does). Pages opened with {real:true} get them in place of the CDN copies, from either CDN. */
const LIBS = { "exceljs.min.js": "exceljs/dist/exceljs.min.js", "jspdf.umd.min.js": "jspdf/dist/jspdf.umd.min.js",
  "jspdf.plugin.autotable.min.js": "jspdf-autotable/dist/jspdf.plugin.autotable.min.js",
  "pdf.min.mjs": "pdfjs-dist/legacy/build/pdf.min.mjs", "pdf.worker.min.mjs": "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  "pdf-lib.min.js": "pdf-lib/dist/pdf-lib.min.js", "tesseract.min.js": "tesseract.js/dist/tesseract.min.js",
  "index.min.js": "@zxing/library/umd/index.min.js" };
const libFile = n => Object.prototype.hasOwnProperty.call(LIBS, n) ? path.join(ROOT, "node_modules", LIBS[n]) : null;
const REAL_LIBS = Object.keys(LIBS).every(n => fs.existsSync(libFile(n)));

async function page(browser, width, opts = {}) {
  // With the real libraries the service worker is normally turned off, so every library request reaches the router.
  // {sw:true} keeps it on and routes at the context level, which also catches the service worker's own requests.
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: (opts.real && !opts.sw) || opts.noSW ? "block" : "allow" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  const router = async r => {
    const u = new URL(r.request().url());
    if (opts.handle && await opts.handle(r, u)) return;
    if (u.hostname === "127.0.0.1") {
      return r.continue();
    }
    const f = opts.real && libFile(u.pathname.split("/").pop());
    // {net:true}: the photo reader's own worker, engine and language data come from the real internet (GitHub only).
    if (opts.net && !f && /tesseract|tessdata/.test(u.href)) return r.continue();
    // CORS header as the real CDNs send it: the app loads libraries with crossorigin and an integrity hash.
    return f && fs.existsSync(f) ? r.fulfill({ path: f, contentType: "text/javascript", headers: { "Access-Control-Allow-Origin": "*" } }) : r.abort();
  };
  if (opts.real || opts.sw) await ctx.route("**/*", router); else await p.route("**/*", router);
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
  let s = await p.evaluate(() => ({ rows: rows.length, flash: document.getElementById("flash").textContent, dock: document.getElementById("dockCnt").getAttribute("aria-label"), dockShort: document.getElementById("dockCnt").textContent,
    collapsed: document.getElementById("delCard").classList.contains("dcollapsed"), sum: document.getElementById("delSumTxt").textContent,
    saved: JSON.parse(localStorage.getItem("lpnlog")) }));
  check("pallet added", s.rows === 1, s.rows);
  check("added confirmation shown", /Added #1: VLT003977037/.test(s.flash), s.flash);
  check("entry bar counter (short on narrow phones)", s.dock === "1 of 3 logged" && s.dockShort === "1/3", [s.dock, s.dockShort]);
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

  console.log("Phone usability");
  s = await p.evaluate(() => { const w = document.querySelector(".wrap"); return { oy: getComputedStyle(w).overflowY, logoHidden: !document.querySelector(".dc-logo").offsetParent, warn: !!document.querySelector("#cmpBody .warn"), pfxClosed: !document.getElementById("pfxBox").open }; });
  check("pallet table scrolls with the page on phones", s.oy === "visible", s.oy);
  check("logo controls moved out of Delivery", s.logoHidden, s);
  check("Manifest check opens on its steps, presets tucked away", !s.warn && s.pfxClosed, s);
  s = await p.evaluate(() => { const e = document.getElementById("expect"); const old = e.value; e.value = "9"; save(); summary(); const a = document.getElementById("expInfo").className; e.value = "1"; save(); summary(); const b2 = document.getElementById("expInfo").className; e.value = String(manState().total); save(); summary(); const c2 = document.getElementById("expInfo").hidden; e.value = old; save(); summary(); return [a, b2, c2]; });
  check("progress is neutral, over-count is flagged, no duplicate line", s[0] === "expinfo prog" && s[1] === "expinfo bad" && s[2] === true, s);
  await p.click("#cmpToggle"); await p.evaluate(() => document.getElementById("cmpCard").scrollIntoView({ block: "start" })); await p.waitForTimeout(400);
  s = await p.evaluate(() => ({ focus: document.body.classList.contains("cmpfocus"), top: Math.round(document.querySelector(".card.entry").getBoundingClientRect().top), h: innerHeight }));
  check("entry bar steps aside in the Manifest check", s.focus && s.top >= s.h - 5, s);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  check("entry bar comes back above it", !(await p.evaluate(() => document.body.classList.contains("cmpfocus"))));
  await p.focus("#lpn");
  await p.evaluate(() => { document.getElementById("cmpCard").scrollIntoView({ block: "start" }); }); await p.waitForTimeout(300);
  check("entry bar stays while typing into it", !(await p.evaluate(() => document.body.classList.contains("cmpfocus"))));
  await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); }); await p.waitForTimeout(300);
  s = await p.evaluate(() => { const sv = rows; rows = sv.concat([{ lpn: "RUNXYZ100000000000", type: "BB", fsdu: false }]); render(); const w = document.documentElement.scrollWidth - innerWidth; rows = sv; render(); return w; });
  await p.setViewportSize({ width: 360, height: 740 });
  s = await p.evaluate(() => { const sv = rows; rows = sv.concat([{ lpn: "RUNXYZ100000000000", type: "BB", fsdu: false }]); render(); const w = document.documentElement.scrollWidth - innerWidth; rows = sv; render(); return w; });
  check("a very long LPN doesn't push the page sideways at 360px", s <= 0, s);
  await p.setViewportSize({ width: 375, height: 900 });
  await p.click("#cmpToggle");
  await p.evaluate(() => openHelp("settings", "Settings"));
  check("logo can be changed from Settings", /logo/i.test(await p.textContent("#setLogo")));
  s = await p.evaluate(() => ["cmpToggle", "manShow"].map(id => Math.round(document.getElementById(id).getBoundingClientRect().height)));
  check("Manifest check buttons are 44px tall", s.every(h => h >= 44 || h === 0), s);
  await p.evaluate(() => closeHelp());

  console.log("Quick actions");
  s = await p.evaluate(() => ({ use: !document.getElementById("manUseExp").hidden || document.getElementById("expect").value !== "", undo: !document.getElementById("undoLast").hidden }));
  check("undo-last button shown once pallets are logged", s.undo, s);
  await p.evaluate(() => { document.getElementById("expect").value = ""; save(); summary(); });
  check("offers the manifest count as expected", !(await p.evaluate(() => document.getElementById("manUseExp").hidden)) && /Use 2 as expected/.test(await p.textContent("#manUseExp")));
  await p.click("#manUseExp");
  check("manifest count copied into Expected pallets", await p.inputValue("#expect") === "2");
  await p.fill("#lpn", "QUB001859261"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  if (await p.isVisible("#chkBar")) await p.click("#chkAdd");
  const before = await p.evaluate(() => rows.length);
  await p.click("#undoLast");
  s = await p.evaluate(() => ({ n: rows.length, last: rows[rows.length - 1].lpn }));
  check("undo-last removes the newest pallet", s.n === before - 1 && s.last === "RBY006266507", s);
  await p.click("#undoBtn");
  check("and Undo puts it back", await p.evaluate(() => rows.length) === before);
  await p.evaluate(() => { rows.pop(); save(); render(); });
  const dock = await p.evaluate(() => { const d = document.getElementById("dockCnt"), r = d.getBoundingClientRect(), u = document.getElementById("undoLast").getBoundingClientRect(), s2 = document.getElementById("scanBtn").getBoundingClientRect(); return { fits: d.scrollWidth <= d.clientWidth + 1, overlap: u.right > s2.left + 1, text: d.textContent }; });
  check("entry bar counter fits beside the undo button", dock.fits && !dock.overlap, dock);
  await p.setViewportSize({ width: 360, height: 740 });
  await p.evaluate(() => { document.getElementById("cmpNums").value = Array.from({ length: 34 }, (_, i) => "VLT" + String(3977037 + i).padStart(9, "0")).join("\n"); });
  s = await p.evaluate(() => ["add", "scanBtn", "undoLast", "lpn"].map(id => Math.round(document.getElementById(id).getBoundingClientRect().right)).concat(innerWidth));
  check("entry bar fits a 360px phone with a long counter", s.slice(0, 4).every(r => r <= s[4]), s);
  await p.setViewportSize({ width: 375, height: 900 });

  console.log("Saved deliveries");
  await p.evaluate(() => newDelivery());
  check("Start new delivery warns when not exported", /hasn’t been exported/.test(await p.textContent("#dlmsg")) && await p.evaluate(() => rows.length) > 0);
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

  console.log("Saved data and backups from outside");
  {
    // A crafted or damaged backup already in storage: the app must still start and every panel must work.
    const seen = [];
    p = await page(browser, 375, { init: () => {
      localStorage.setItem("lpnhist", "[null]"); localStorage.setItem("lpnlog", '{"rows":"x","recv":{"formula":"1+1"}}');
      localStorage.setItem("lpnnames", "[5,{}]"); localStorage.setItem("lpncfg", '"x"'); localStorage.setItem("lpnpresets", "[1]");
      localStorage.setItem("lpnlogo", "https://tracker.example/pixel.png");
    } });
    p.on("request", r => seen.push(r.url()));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(() => { document.getElementById("btnSet").click(); const set = !document.getElementById("bkUp") ? "no settings" : "ok";
      closeHelp(); return { set, rows: rows.length, recv: document.getElementById("recv").value, body: !!document.querySelector("#body tr") }; });
    check("a damaged backup in storage doesn't stop the app starting", p.errors.length === 0 && s.set === "ok" && s.rows === 0 && s.body, { errors: p.errors, s });
    check("an object in saved data is never shown as a value", s.recv === "", s.recv);
    check("a logo setting pointing at another website is ignored", !seen.some(u => /tracker\.example/.test(u)), seen.filter(u => !/127\.0\.0\.1/.test(u)));
    await p.ctx.close();

    // Restoring: the backup is checked first, nothing changes until the user agrees, and what's written is tidied.
    p = await page(browser, 375, { init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "KEEP000000001", type: "BB", fsdu: false }], date: "2026-10-26" })) });
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.evaluate(() => { window.saveOnly = async () => { window.__bk = (window.__bk || 0) + 1; }; document.getElementById("btnSet").click(); });
    const bk = { app: "lpn-pallet-log", version: 1, data: { lpnhist: "[null,{\"date\":\"2026-10-27\",\"rows\":[{\"lpn\":\"HIST00000001\",\"type\":\"<b>\",\"fsdu\":1}]}]",
      lpnlog: JSON.stringify({ rows: [{ lpn: "NEW000000001", type: "FPP" }], recv: { hyperlink: "https://evil.example", text: "x" } }), lpnlogo: "https://tracker.example/x.png", lpnnames: "[\"Jamie\",7]" } };
    await p.setInputFiles("#bkFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bk)) });
    await p.waitForTimeout(200);
    s = await p.evaluate(() => ({ ask: !document.getElementById("bkAsk").hidden, msg: document.getElementById("bkMsg").textContent, log: localStorage.getItem("lpnlog") }));
    check("restoring a backup asks first and changes nothing yet", s.ask && /log of 1 pallet and 1 saved delivery/.test(s.msg) && /KEEP000000001/.test(s.log || ""), s);
    await p.evaluate(() => { document.getElementById("bkGo").click(); });
    await p.waitForTimeout(300);
    check("after restoring, the app waits for the user to reload", await p.evaluate(() => !document.getElementById("bkDone").hidden && /Make sure the copy/.test(document.getElementById("bkMsg").textContent)));
    s = await p.evaluate(async () => {
      const before = localStorage.getItem("lpnlog"); window.saveOnly = async () => { throw new Error("blocked"); };
      const f = new File([JSON.stringify({ app: "lpn-pallet-log", data: { lpnlog: JSON.stringify({ rows: [{ lpn: "OTHER0000001", type: "BB" }] }) } })], "b2.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      await document.getElementById("bkGo").onclick();
      return { same: localStorage.getItem("lpnlog") === before, msg: document.getElementById("bkMsg").textContent };
    });
    check("a restore stops if the copy of the current data can't be saved", s.same && /wasn’t replaced/.test(s.msg), s);
    s = await p.evaluate(() => ({ bk: window.__bk, log: JSON.parse(localStorage.getItem("lpnlog")), hist: JSON.parse(localStorage.getItem("lpnhist")), logo: localStorage.getItem("lpnlogo"), names: localStorage.getItem("lpnnames") }));
    check("a copy of the current data downloads before restoring", s.bk === 1, s.bk);
    check("a restored backup is tidied: plain text, known pallet types, no outside logo", s.log.rows[0].lpn === "NEW000000001" && s.log.recv === "" && s.hist.length === 1 && s.hist[0].rows[0].type === "Mixed" && s.hist[0].rows[0].fsdu === true && s.logo === null && s.names === '["Jamie"]', s);
    s = await p.evaluate(async () => { const f = new File(["{\"app\":\"lpn-pallet-log\",\"data\":{\"lpnhist\":\"[not json\"}}"], "bad.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      return { msg: document.getElementById("bkMsg").textContent, ask: !document.getElementById("bkAsk").hidden }; });
    check("a damaged backup file is refused without changing anything", /damaged, so nothing was changed/.test(s.msg) && !s.ask, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Hidden data in a log PDF is read as plain text, so it can't become a formula or link in an export.
    p = await page(browser, 1300);
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const kw = "LPNLOG2:" + encodeURIComponent(JSON.stringify({ d: { formula: "HYPERLINK(\"https://evil.example\",\"x\")" }, r: { hyperlink: "https://evil.example", text: "Jamie" }, n: ["a"], rows: [["RUN000000001", { formula: "1" }, 0], [{ x: 1 }, "BB", 0]] }));
      const doc = { numPages: 1, getMetadata: async () => ({ info: { Keywords: kw } }), getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) };
      const keep = [window.pdfjsLib, window.loadPdfJs];
      window.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve(doc) }) }; window.loadPdfJs = async () => {};
      try {
        const imp = await parseExported(new File(["%PDF"], "log.pdf"));
        const lp = await readLogPdf(new File(["%PDF"], "log.pdf"), () => {});
        const cells = logSheets[0].grid.flat();
        return { imp: [imp.date, imp.recv, imp.notes, imp.rows.length], lp, objects: cells.filter(c => c !== null && typeof c === "object").length };
      } finally { window.pdfjsLib = keep[0]; window.loadPdfJs = keep[1]; }
    });
    check("hidden PDF data is only ever read as plain text", JSON.stringify(s.imp) === '["","","",1]' && JSON.stringify(s.lp) === '["RUN000000001"]' && s.objects === 0, s);
    s = await p.evaluate(async () => { let html = ""; window.saveOnly = async b => { html = b; }; rows = [{ lpn: "A1", type: "BB", fsdu: false }];
      document.getElementById("notes").value = '=HYPERLINK("https://evil.example","Open")'; await fallbackXls("2026-10-26"); return html; });
    check("the basic .xls export keeps typed text as text, counts as numbers", /td\.t\{mso-number-format:"\\@"\}/.test(s) && /<td class="t">=HYPERLINK/.test(s) && !/<td class="t">\d+<\/td>/.test(s) && /<td>1<\/td>/.test(s), s.slice(s.indexOf("<table"), s.indexOf("<table") + 600));
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
  {
    // Every classic library load has an integrity hash, and every hash is used.
    const code = ["core.js", "export.js", "compare.js", "scan.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const urls = [...new Set([...code.matchAll(/loadScript\("([^"]+)"/g)].map(m => m[1]).concat([...code.matchAll(/const u="(https:[^"]+)"/g)].map(m => m[1])))];
    const sri = [...code.matchAll(/^  "(https:[^"]+)":"(sha384-[A-Za-z0-9+\/=]+)"/gm)].map(m => m[1]);
    const missing = urls.filter(u => !sri.includes(u)), unused = sri.filter(u => !urls.includes(u));
    check("every library file the app loads is checked against its fingerprint", urls.length >= 10 && !missing.length && !unused.length, { missing, unused });
  }

  console.log("Real export libraries" + (REAL_LIBS ? "" : " (skipped here: npm install hasn't fetched ExcelJS, jsPDF and pdf.js; GitHub always runs these)"));
  {
    // The checks must test the same library versions the app loads from the CDN.
    const dev = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies || {};
    const code = ["export.js", "compare.js", "scan.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const want = { exceljs: /exceljs\/(\d[\d.]*)\/|exceljs@(\d[\d.]*)/g, jspdf: /jspdf\/(\d[\d.]*)\/jspdf\.umd|jspdf@(\d[\d.]*)\//g,
      "jspdf-autotable": /jspdf-autotable[\/@](\d[\d.]*)\//g, "pdfjs-dist": /pdf\.js\/(\d[\d.]*)\/|pdfjs-dist@(\d[\d.]*)\//g,
      "pdf-lib": /pdf-lib[\/@](\d[\d.]*)\//g, "tesseract.js": /tesseract\.js@(\d[\d.]*)\//g, "@zxing/library": /@zxing\/library@(\d[\d.]*)\//g };
    const off = Object.keys(want).map(k => { const v = [...code.matchAll(want[k])].map(m => m[1] || m[2]); return { k, app: [...new Set(v)], test: dev[k] }; })
      .filter(x => x.app.length !== 1 || x.app[0] !== x.test);
    check("the checks use the same library versions as the app", off.length === 0, off);
  }
  if (REAL_LIBS) {
    const LOG = [{ lpn: "VLT003977037", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: true, dmg: "Crushed" }, { lpn: "RBY006291167", type: "Mixed", fsdu: false }];
    const NOTE = "Two pallets wrapped badly, driver waited twenty minutes, seal checked against the paperwork and matched";
    p = await page(browser, 1300, { real: true, init: `localStorage.setItem("lpnlog", ${JSON.stringify(JSON.stringify({ rows: LOG, date: "2026-10-26", recv: "Tester", expect: "3", trailer: "TR4471", sealIn: "S1001", sealOut: "S2002", notes: NOTE }))})` });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const saved = []; window.saveOnly = async (buf, name) => { saved.push(new File([buf], name)); };
      await document.getElementById("dl").onclick();
      const xf = saved.find(f => /\.xlsx$/.test(f.name));
      if (!xf) return { err: "no .xlsx was saved", names: saved.map(f => f.name), msg: document.getElementById("dlmsg").textContent };
      const imp = await parseExported(xf);
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await xf.arrayBuffer()); const ws = wb.worksheets[0];
      const grid = sheetGrid(ws);
      const made = grid.find(r => r.some(c => /^Made with /.test(String(c))));
      let notesH = 0; ws.eachRow(row => row.eachCell(c => { if (c.value === "Notes") notesH = row.height; }));
      const cmp = await readLog(new File([await xf.arrayBuffer()], xf.name));
      return { size: xf.size, rows: imp.rows, unk: imp.unk, details: [imp.date, imp.recv, imp.expect, imp.trailer, imp.sealIn, imp.sealOut, imp.notes],
        lpnW: ws.getColumn(2).width, madeCells: made ? made.filter(Boolean).length : 0, made: made ? made.find(Boolean) : null,
        footer: ws.headerFooter && ws.headerFooter.oddFooter, notesH, cmp };
    });
    check("real ExcelJS: the log spreadsheet is made", !s.err && s.size > 4000, s.err ? s : s.size);
    if (!s.err) {
      check("real ExcelJS: importing the log gives back the same pallets", JSON.stringify(s.rows) === JSON.stringify(LOG) && s.unk === 0, s.rows);
      check("real ExcelJS: importing the log gives back the delivery details", JSON.stringify(s.details) === JSON.stringify(["2026-10-26", "Tester", "3", "TR4471", "S1001", "S2002", NOTE]), s.details);
      check("real ExcelJS: the Manifest check reads the same LPNs from the log", JSON.stringify(s.cmp) === JSON.stringify(LOG.map(r => r.lpn)), s.cmp);
      check("real ExcelJS: LPN column fits a 13-character LPN", s.lpnW >= 27, s.lpnW);
      check("real ExcelJS: the version line is one line under the table", s.madeCells === 1 && /^Made with LPN Pallet Log v\d+\.\d+ \(build \d+\) on /.test(s.made || ""), s.made);
      check("real ExcelJS: the page footer names the version", /LPN Pallet Log v\d+\.\d+ \(build \d+\)/.test(s.footer || "") && /Page &P of &N/.test(s.footer || ""), s.footer);
      check("real ExcelJS: the notes row is tall enough for a long note", s.notesH >= 100, s.notesH);
    }
    s = await p.evaluate(async () => {
      const buf = await buildLogPdf("2026-10-26");
      const imp = await parseExported(new File([buf], "log.pdf"));
      const cmp = await readLogPdf(new File([buf], "log.pdf"), () => {});
      const pdf = await openPdf(new Uint8Array(buf.slice(0)));
      const pg = await pdf.getPage(1); const words = (await pg.getTextContent()).items.map(i => i.str.trim()).filter(Boolean);
      // Drawing a page is what the photo-reading fallback does with scanned PDFs.
      const vp = pg.getViewport({ scale: 1 }); const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      const px = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let ink = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0 && px[i - 1] < 128) ink++;
      return { version: pdfjsLib.version, ink, size: buf.byteLength, rows: imp.rows, notes: imp.notes, sealOut: imp.sealOut, cmp, oneLine: words.includes("RUN0001830763"), footer: words.find(w => /^LPN Pallet Log v/.test(w)) || null };
    });
    check("real jsPDF: the log PDF is made", s.size > 4000, s.size);
    check("real pdf.js: the pinned version is the one loaded", s.version === JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies["pdfjs-dist"], s.version);
    check("real pdf.js: a page can be drawn (used for scanned PDFs)", s.ink > 500, s.ink);
    check("real jsPDF: importing the PDF gives back the same pallets and notes", JSON.stringify(s.rows) === JSON.stringify(LOG) && s.notes === NOTE && s.sealOut === "S2002", s);
    check("real jsPDF: the Manifest check reads the same LPNs from the PDF", JSON.stringify(s.cmp) === JSON.stringify(LOG.map(r => r.lpn)), s.cmp);
    check("real jsPDF: a 13-character LPN stays on one line", s.oneLine, s);
    check("real jsPDF: the footer names the version", /^LPN Pallet Log v\d+\.\d+ \(build \d+\)/.test(s.footer || ""), s.footer);
    s = await p.evaluate(async () => {
      let out = null; window.sendFile = async (buf, name) => { out = new File([buf], name); };
      document.getElementById("cmpLogNums").value = "VLT003977037\nRUN0001830763"; document.getElementById("cmpNums").value = "VLT003977037\nRUN0001830763\nRBY006291167";
      await document.getElementById("cmpGo").onclick();
      if (!out) return { err: document.getElementById("cmpMsg").textContent };
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await out.arrayBuffer());
      const ws = wb.worksheets.find(w => /Manifest/.test(w.name)) || wb.worksheets[0];
      const grid = sheetGrid(ws); let lp = []; try { lp = lpnsFromGrid(grid); } catch (e) { lp = [String(e.message)]; }
      return { sheets: wb.worksheets.map(w => w.name), lpnW: ws.getColumn(2).width, lp,
        made: grid.some(r => r.filter(Boolean).length === 1 && /^Made with LPN Pallet Log v/.test(String(r.find(Boolean)))) };
    });
    check("real ExcelJS: the manifest check spreadsheet is made", !s.err, s);
    {
      const r = await p.evaluate(async () => {
        await loadPdfLib(); const L = window.PDFLib;
        const src = await L.PDFDocument.create(); const pg = src.addPage([300, 300]);
        pg.drawText("VLT003977037", { x: 20, y: 250, size: 12 });
        pg.node.set(L.PDFName.of("AA"), src.context.obj({ O: { S: "JavaScript", JS: L.PDFString.of("app.alert(1)") } }));
        pg.node.set(L.PDFName.of("Annots"), src.context.obj([{ Type: "Annot", Subtype: "Link", Rect: [0, 0, 100, 100], A: { S: "URI", URI: L.PDFString.of("https://evil.example") } }]));
        src.setKeywords(["LPNLOG2:" + encodeURIComponent(JSON.stringify({ d: "2026-10-26", r: "T", rows: [["VLT003977037", "BB", 0]] }))]);
        const bytes = await src.save();
        const list = await readLogPdf(new File([bytes], "log.pdf"), () => {});
        document.getElementById("cmpLogNums").value = list.join("\n"); document.getElementById("cmpNums").value = "VLT003977037";
        const C = cmpData();
        const out = await buildCmpPdf(C.res, C.cnt, C.man.length, "2026-10-26", { list: C.logList, pdf: logPdfSrc, sheets: null });
        const d = await L.PDFDocument.load(out);
        return { pages: d.getPageCount(), withActions: d.getPages().filter(x => x.node.get(L.PDFName.of("AA")) || x.node.get(L.PDFName.of("Annots"))).length };
      });
      check("real pdf-lib: a merged log PDF keeps its pages but loses links and page-open scripts", r.pages >= 2 && r.withActions === 0, r);
    }
    if (!s.err) {
      check("real ExcelJS: manifest check lists every LPN and nothing else", ["VLT003977037", "RUN0001830763", "RBY006291167"].every(n => s.lp.includes(n)) && !s.lp.some(n => /Made with/.test(n)), s);
      check("real ExcelJS: manifest check LPN column fits a 13-character LPN", s.lpnW >= 27, s.lpnW);
      check("real ExcelJS: manifest check has the version line", s.made, s);
    }
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }

  console.log("Security policy");
  {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    const pol = m ? m[1] : "";
    const ok = /child-src 'self' blob:/.test(pol) && /script-src 'self' https:\/\/cdnjs\.cloudflare\.com https:\/\/cdn\.jsdelivr\.net https:\/\/unpkg\.com 'wasm-unsafe-eval';/.test(pol) && !/unsafe-eval'|'unsafe-inline'[^;]*;\s*worker/.test(pol.replace("'wasm-unsafe-eval'", "")) && /base-uri 'none'/.test(pol) && /object-src blob:/.test(pol) && html.indexOf(m && m[0]) < html.indexOf("<script");
    check("the security policy is in place before any script, with no general eval allowed", !!m && ok, pol);
    // Everyday screens under the policy (libraries are stand-ins here): nothing may be blocked.
    p = await page(browser, 375, { init: () => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); } });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      for (const id of ["btnSet", "btnGuide"]) { const b = document.getElementById(id); if (b) { b.click(); await new Promise(r => setTimeout(r, 100)); closeHelp(); } }
      rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render();
      return window.__csp;
    });
    check("everyday screens run under the security policy with nothing blocked", s.length === 0 && p.errors.length === 0, { blocked: s, errors: p.errors });
    await p.ctx.close();
  }

  console.log("Demo video");
  {
    const mp4 = path.join(ROOT, "media", "demo.mp4"), poster = path.join(ROOT, "media", "demo-poster.jpg");
    check("the demo video and its poster are in the site, small enough for phones", fs.existsSync(mp4) && fs.existsSync(poster) && fs.statSync(mp4).size < 3e6, fs.existsSync(mp4) && fs.statSync(mp4).size);
    p = await page(browser, 375);
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.click("#btnGuide"); await p.waitForTimeout(200);
    s = await p.evaluate(() => { const body = document.getElementById("panelBody"), b = document.getElementById("demoPlay"), v = document.getElementById("demoVid");
      const r = b.getBoundingClientRect();
      return { first: body.firstElementChild && body.firstElementChild.contains(b), hidden: v.hidden, preload: v.preload, fits: r.left >= 0 && r.right <= innerWidth && r.height >= 44 }; });
    check("the Guide starts with a button to play the demo video, and nothing loads until it's tapped", s.first && s.hidden && s.preload === "none" && s.fits, s);
    await p.click("#demoPlay"); await p.waitForTimeout(300);
    s = await p.evaluate(() => { const v = document.getElementById("demoVid"); return { shown: !v.hidden, src: v.querySelector("source").getAttribute("src"), btn: document.getElementById("demoPlay").hidden, w: v.getBoundingClientRect().width, vol: v.volume }; });
    check("the demo video starts at half volume", s.vol === 0.5, s.vol);
    check("tapping it shows the video player in the Guide", s.shown && s.src === "media/demo.mp4" && s.btn && s.w > 200 && s.w <= 375, s);
    s = await p.evaluate(() => { closeHelp(); return document.getElementById("demoVid").paused; });
    check("closing the Guide stops the video", s === true, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }

  {
    // Does the Guide's demo video still show what the app looks like? Compares the key screens with the fingerprint
    // taken when it was recorded (tools/demo-video/screens.json). A difference is a warning, never a failure.
    const scr = require(path.join(ROOT, "tools", "demo-video", "screens.js"));
    const want = fs.existsSync(scr.FILE) ? JSON.parse(fs.readFileSync(scr.FILE, "utf8")) : null;
    check("the demo video's screen fingerprint is there", !!want && Array.isArray(want.log) && want.log.length > 3);
    if (want) {
      const q = await page(browser, 390);
      await q.setViewportSize({ width: 390, height: 844 });
      const diffs = scr.differences(want, await scr.fingerprint(q, URL0));
      await q.ctx.close();
      const msg = diffs.length ? "The screens differ from the Guide's demo video (" + diffs.slice(0, 6).join("; ") + "). Re-record it with sh tools/demo-video/make.sh if the change shows in the video." : "";
      console.log("  note demo video vs screens: " + (diffs.length ? msg : "still matches"));
      if (diffs.length && process.env.GITHUB_ACTIONS) console.log("::warning title=Demo video may be out of date::" + msg.replace(/[\r\n%]/g, " "));
    }
  }

  {
    // Reported: manifest photos stopped adding LPNs, with no hint why. Each photo now says how many it found and
    // added, which were already listed, and which were skipped for a prefix not in the list; one bad photo doesn't
    // stop the rest; and everything goes in a problem report the user can download and send.
    console.log("Manifest photo messages and problem report");
    const q = await page(browser, 390);
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.evaluate(() => {
      document.getElementById("cmpToggle").click();
      document.getElementById("cmpPfx").value = "VLT"; document.getElementById("cmpNums").value = "VLT004037790";
      let n = 0;
      window.readPhoto = async () => {
        n++;
        if (n === 2) throw new Error("blurred");
        const a = n === 1 ? ["VLT004037790", "VLT004037814"] : ["VLT004037858"];
        a.skipped = n === 1 ? ["QUB001899186", "QUB001899210"] : []; return a;
      };
    });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [1, 2, 3].map(i => ({ name: "m" + i + ".jpg", mimeType: "image/jpeg", buffer: png })));
    await q.waitForFunction(() => !/Reading photo/.test(document.getElementById("cmpMsg").textContent), null, { timeout: 5000 }).catch(() => {});
    let s = await q.evaluate(() => ({ msg: document.getElementById("cmpMsg").textContent, nums: document.getElementById("cmpNums").value.split("\n") }));
    check("a photo that can't be read doesn't stop the next photos", s.nums.includes("VLT004037858") && /photo 2/i.test(s.msg) && /blurred/.test(s.msg), s);
    check("the manifest photo message says how many were added and how many were already listed", /Photo 1: found 2 LPNs, 1 new, 1 already in the list/.test(s.msg) && /Photo 3: found 1 LPN, 1 new/.test(s.msg), s.msg);
    check("LPNs skipped for a prefix not in the list are named, with how to fix it", /QUB/.test(s.msg) && /prefix/i.test(s.msg) && s.nums.length === 3, s.msg);
    s = await q.evaluate(() => {
      document.getElementById("cmpPfx").value = "VLT";
      const t = "VLT004037790 QUB001899186 RBY 006291170 TEL 01234567890 PO 12345678 ABCD123456789";
      return { kept: extractLpns(t), skipped: extractLpns(t).skipped };
    });
    check("reading text keeps the listed prefixes and notes the rest", JSON.stringify(s.kept) === '["VLT004037790"]' && JSON.stringify(s.skipped) === '["QUB001899186","RBY006291170"]', s);
    await q.evaluate(() => setTimeout(() => { throw new Error("boom-test"); }, 0));
    await q.waitForTimeout(100);
    s = await q.evaluate(async () => {
      document.getElementById("btnSet").click();
      let out = null; window.saveOnly = async (buf, name, mime) => { out = { name, mime, text: new TextDecoder().decode(buf) }; };
      await document.getElementById("diagDl").onclick();
      const b = document.getElementById("diagDl").getBoundingClientRect();
      return { out, btn: b.width > 0 && b.right <= innerWidth, stored: (localStorage.getItem("lpndiag") || "").length };
    });
    const txt = (s.out && s.out.text) || "";
    check("Settings has a Download problem report button", s.btn && !!s.out && /^lpn-problem-report-\d{4}-\d{2}-\d{2}\.txt$/.test(s.out.name), s.out && s.out.name);
    check("the problem report names the build, browser and screen", /build \d+/.test(txt) && /Browser: /.test(txt) && /Screen: \d+×\d+/.test(txt), txt.slice(0, 400));
    check("the problem report lists the manifest photo reads, the failure and the skipped prefix", /photo 1 of 3/.test(txt) && /blurred/.test(txt) && /QUB001899186/.test(txt), txt);
    check("the problem report includes script errors", /boom-test/.test(txt), txt.slice(-600));
    s = await q.evaluate(() => {
      for (let i = 0; i < 900; i++) diag("test", "entry " + i + " " + "x".repeat(400));
      const a = JSON.parse(localStorage.getItem("lpndiag")); return { n: a.length, size: localStorage.getItem("lpndiag").length, last: a[a.length - 1].m.slice(0, 9) };
    });
    check("the problem log keeps only recent entries and stays small", s.n <= 300 && s.size < 120000 && s.last === "entry 899", s);
    s = await q.evaluate(() => ({ pdf: readNote("m.pdf", Object.assign([], { skipped: [] }), { added: 0, dup: 0 }, true), sk: readNote("m.pdf", Object.assign([], { skipped: ["QUB001899186"] }), { added: 0, dup: 0 }, true),
      bk: checkBackup({ lpndiag: "[" + "\"x\",".repeat(10) + "\"x\"]", lpnnames: "[]" }).data, longWord: (() => { const m = document.getElementById("cmpMsg"); m.textContent = "Photo 4: couldn’t be read (https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js/aaaaaaaaaaaaaaaaaaaa)"; return document.documentElement.scrollWidth <= innerWidth; })() }));
    check("PDF messages talk about the PDF, not a photo", /from this PDF/.test(s.pdf) && /read the PDF again/.test(s.sk) && !/photo/.test(s.pdf + s.sk), s);
    check("a backup can't bring in a problem log", !("lpndiag" in s.bk), Object.keys(s.bk));
    check("a long word in a message wraps instead of widening the page", s.longWord);
    s = await q.evaluate(async () => { localStorage.setItem("lpndiag", "[null,5,{\"t\":\"x\",\"k\":\"y\",\"m\":\"ok-entry\"}]"); let out = ""; window.saveOnly = async (b) => { out = new TextDecoder().decode(b); }; await downloadReport(); return out; });
    check("a damaged problem log still gives a report", /ok-entry/.test(s), s.slice(-200));
    // Readings taken from the user's four manifest photos (31 Oct 2026): first read, close-up re-read.
    s = await q.evaluate(() => {
      const V = tidyReads([["VLT004040265", "VLT004040265"], ["VLT004040273", "VLT004040273"], ["VLT004040278", "VLT004040278"], ["VLT004040355", "VL1004040355"], ["VLT004040416", "VLT004040416"], ["VLT004040418", "VLT004040418"]].map(([a, b], i) => ({ raw: a, first: a, again: b })));
      const R = tidyReads([{ raw: "RUNOO1832813", first: "RUN001832813", again: null }, { raw: "RUNO001832816", first: "RUN0001832816", again: "RUN0001832816" }, { raw: "RUNO01832832", first: "RUN001832832", again: "RUN0001832832" }]);
      // As GitHub's real photo reader saw run.jpg: an O between RUN and the 0s on two of three numbers.
      const R2 = tidyReads([{ raw: "RUNO001832813", first: "RUN0001832813", again: "RUN001832813" }, { raw: "RUN001832816", first: "RUN001832816", again: "RUN0001832816" }, { raw: "RUNO001832832", first: "RUN0001832832", again: "RUN0001832832" }]);
      const lone = tidyReads([{ raw: "RUN0001830763", first: "RUN0001830763", again: null }]);
      const keep10 = tidyReads([{ raw: "RUN0001830763", first: "RUN0001830763", again: null }, { raw: "RUN001832813", first: "RUN001832813", again: null }, { raw: "RUN001832832", first: "RUN001832832", again: null }]);
      // A prefix with an O in it and a real extra-0 number must be left alone.
      const lot = tidyReads([{ raw: "LOT0123456789", first: "LOT0123456789", again: null }, { raw: "LOT123456780", first: "LOT123456780", again: null }, { raw: "LOT123456781", first: "LOT123456781", again: null }]);
      // With VLT in the prefix list, the look-alike reading is still mended and kept, not reported as left out.
      document.getElementById("cmpPfx").value = "VLT";
      const listed = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VLT004040355", "VL1004040355"], ["QUB001899186", null]].map(([a, b]) => ({ raw: a, first: a, again: b })));
      const speck = tidyReads(["VLT004040265", "VLT004040273", "VLT004040278", "DFA51400180", "QUB001899185", "QUB001899186", "QUB00189918", "RBY006292169"].map(a => ({ raw: a, first: a, again: null })));
      const speckAlone = tidyReads([{ raw: "DFA51400180", first: "DFA51400180", again: null }]);
      // GitHub's real reader on vlt.jpg gave CO1080002090, RR1004040021 and L1121100001 from specks.
      document.getElementById("cmpPfx").value = "";
      const junk = photoLpns(["VLT004040265", "VLT004040273", "VLT004040278", "CO1080002090", "RR1004040021", "L1121100001"].map(a => ({ raw: a, first: a, again: null })));
      const note = readNote("Photo 1", junk, { added: 3, dup: 0 });
      // A real 2-letter LPN among 3-letter ones is not added either, but the note names it.
      const jd = photoLpns(["VLT004040265", "VLT004040273", "JD1234567890"].map(a => ({ raw: a, first: a, again: null })));
      const digits = ["VLT004040265", "VLT0004040265", "VLT04040265", "IM1234567890", "IM12345678901", "IM123456789", "IM123456789012"].map(lpnDigitsOk);
      const imIssues = [lpnIssues("IM12345678901").join(), lpnIssues("IM123456789").join()];
      document.getElementById("cmpNums").value = "IM1234567890\nIM12345678901\nVLT004040265\nIM123456789"; const imOdd = oddNote("cmpNums"); document.getElementById("cmpNums").value = "";
      document.getElementById("cmpPfx").value = "VLT";
      const tel = lpnsFromText("VLT004040265 TEL 01234567890 MOB 07123456789 IM 12345678901 IM 123456789").skipped.join();
      document.getElementById("cmpNums").value = "VLT-004040265\n004040265\nVLT00404026"; const plainOdd = oddNote("cmpNums"); document.getElementById("cmpNums").value = "";
      document.getElementById("cmpPfx").value = "";
      const im = photoLpns(["VLT004040265", "VLT004040273", "IM1234567890", "IM12345678"].map(a => ({ raw: a, first: a, again: null })));
      return { tel, plainOdd, digits: digits.join(), imIssues, imOdd, im: im.join(), junk: junk.join(), junkOdd: junk.odd.join(), note, jd: jd.join(), jdOdd: jd.odd.join(), jdNote: readNote("Photo 1", jd, { added: 2, dup: 0 }), R2: R2.join(), speck: speck.join(), ignored: speck.ignored.join(), speckAlone: speckAlone.join(), V, R, lone, keep10, lot, listed: listed.join(), skipped: listed.skipped.join() };
    });
    check("a prefix letter read as a digit is put back to match the rest of the page (VL1… → VLT…)", s.V.join() === "VLT004040265,VLT004040273,VLT004040278,VLT004040355,VLT004040416,VLT004040418", s.V);
    check("codes made from specks with a different prefix length are not added, and the note lists them (GitHub's reading of vlt.jpg)", s.junk === "VLT004040265,VLT004040273,VLT004040278" && s.junkOdd === "CO1080002090,RR1004040021,L1121100001" && /3 other readings \(CO1080002090, RR1004040021, L1121100001\) didn’t look like the other LPNs/.test(s.note) && /type it in the box/.test(s.note), s);
    check("phone numbers stay out of the left-out list; IM numbers, even one digit short, are named", s.tel === "IM12345678901,IM123456789", s.tel);
    check("typed lines with a dash or no letters are judged by their digits as before", !/VLT-004040265|, 004040265/.test(s.plainOdd) && /VLT00404026/.test(s.plainOdd), s.plainOdd);
    check("IM numbers have 10 or 11 digits, other LPNs 9 or 10", s.digits === "true,true,false,true,true,false,false", s.digits);
    check("an 11-digit IM number isn't called unusual; a 9-digit one is, with the IM rule in the message", s.imIssues[0] === "" && /IM numbers have 10 or 11/.test(s.imIssues[1]) && /IM123456789\./.test(s.imOdd) && !/IM12345678901/.test(s.imOdd) && !/IM1234567890,/.test(s.imOdd), s);
    check("IM numbers (full pallet picks, two letters) are always kept among 3-letter LPNs", s.im === "VLT004040265,VLT004040273,IM1234567890,IM12345678", s.im);
    check("a real-looking 9-10 digit number with another prefix length is never dropped silently", s.jd === "VLT004040265,VLT004040273" && s.jdOdd === "JD1234567890" && /JD1234567890/.test(s.jdNote), s);
    check("a tie between 9 and 10 digits goes to the plainly printed reading (GitHub's reading of run.jpg)", s.R2 === "RUN001832813,RUN001832816,RUN001832832", s.R2);
    check("an O read as an extra 0 after the prefix is dropped to match the rest of the page", s.R.join() === "RUN001832813,RUN001832816,RUN001832832", s.R);
    check("a made-up code from speckles (DFA51400180 on a page of VLT numbers) is left out; a lone other LPN and a short reading of a page prefix are kept", s.speck === "VLT004040265,VLT004040273,VLT004040278,QUB001899185,QUB001899186,QUB00189918,RBY006292169" && s.ignored === "DFA51400180" && s.speckAlone === "DFA51400180", s);
    check("a real extra-0 number with an O in its prefix (LOT) is left alone", s.lot[0] === "LOT0123456789", s.lot);
    check("with a prefix list set, a look-alike reading is mended and kept; other prefixes are reported", s.listed === "VLT004040265,VLT004040273,VLT004040355" && s.skipped === "QUB001899186", s);
    check("a reading with nothing to compare against, or a real 10-digit LPN, is kept as read", s.lone.join() === "RUN0001830763" && s.keep10[0] === "RUN0001830763", s);
    // A pale page with shade across it and paper grain, like a photo of a manifest with no dark edge in shot.
    s = await q.evaluate(async () => {
      const c = document.createElement("canvas"); c.width = 1600; c.height = 2000; const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 1600, 2000); g.addColorStop(0, "#d2d0cc"); g.addColorStop(1, "#8f8d8a"); x.fillStyle = g; x.fillRect(0, 0, 1600, 2000);
      const im = x.getImageData(0, 0, 1600, 2000); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < im.data.length; i += 4) { const n = (rnd() - 0.5) * 30; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } x.putImageData(im, 0, 0);
      x.fillStyle = "#2a2a2a"; x.font = "italic bold 60px Arial"; for (let i = 0; i < 6; i++) x.fillText("LPN:  VLT00404026" + i, 150, 300 + i * 280);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      const cv = await prep(new File([blob], "p.jpg", { type: "image/jpeg" }));
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let black = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) black++;
      const t = cv.getContext("2d").getImageData(Math.round(160 * cv.width / 1600), Math.round(270 * cv.height / 2000), Math.round(500 * cv.width / 1600), Math.round(40 * cv.height / 2000)).data; let ink = 0; for (let i = 0; i < t.length; i += 4) if (t[i] < 128) ink++;
      return { black: black / (d.length / 4), ink: ink / (t.length / 4) };
    });
    check("photo preparation turns shaded, grainy paper white and keeps the text black", s.black < 0.06 && s.ink > 0.1, s);
    // One photo reader for a batch: started once for three photos, closed after a quiet spell; a failed one is replaced.
    s = await q.evaluate(async () => {
      const real = window.Tesseract; let made = 0, closed = 0, fail = false;
      window.Tesseract = { createWorker: async () => { made++; return { setParameters: async () => {}, terminate: async () => { closed++; },
        recognize: async () => { if (fail) throw new Error("worker crashed"); return { data: { words: [], text: "VLT004040265" } }; } }; } };
      const c = document.createElement("canvas"); c.width = 200; c.height = 100; const b = await new Promise(r => c.toBlob(r, "image/png"));
      const f = new File([b], "p.png", { type: "image/png" });
      for (let i = 0; i < 3; i++) await ocrLpns(f);
      const afterBatch = { made, closed };
      fail = true; let err = ""; try { await ocrLpns(f); } catch (e) { err = e.message; }
      fail = false; await ocrLpns(f);
      const afterFail = { made, closed };
      // Two batches at once (manifest photos and a log photo) take turns: each page read is in mode 11, each close-up in mode 7.
      ocrDone(await ocrWorker(), false); // close the earlier stand-in reader first
      const modes = []; let cur = "";
      window.Tesseract = { createWorker: async () => { made++; return { setParameters: async p => { if (p.tessedit_pageseg_mode) cur = p.tessedit_pageseg_mode; await new Promise(r => setTimeout(r, 5)); }, terminate: async () => { closed++; },
        recognize: async () => { const m = cur; await new Promise(r => setTimeout(r, 20)); modes.push(m); return { data: { words: m === "11" ? [{ text: "VLT004040265", bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } }] : [], text: m === "11" ? "VLT004040265" : "VLT004040265" } }; } }; } };
      const both = await Promise.all([ocrLpns(f), ocrLpns(f)]);
      window.__modes = modes.join(); window.__both = both.map(x => x.join()).join("|");
      ocrDone(await ocrWorker(), false); // close it now rather than waiting
      window.Tesseract = real;
      return { afterBatch, err, afterFail, closedAtEnd: closed, modes: window.__modes, both: window.__both };
    });
    check("one photo reader is started for a batch of photos and kept open between them", s.afterBatch.made === 1 && s.afterBatch.closed === 0, s);
    check("a photo reader that fails is closed and the next photo gets a new one", s.err === "worker crashed" && s.afterFail.made === 2 && s.afterFail.closed === 1, s);
    check("two photo reads started together take turns: page reads in mode 11, close-ups in mode 7", s.modes === "11,7,11,7" && s.both === "VLT004040265|VLT004040265" && s.closedAtEnd >= 2, s);
    s = await q.evaluate(() => { document.getElementById("diagClear").click(); return { left: JSON.parse(localStorage.getItem("lpndiag") || "[]").length, msg: document.getElementById("diagMsg").textContent }; });
    check("the problem log can be cleared", s.left === 0 && /cleared/i.test(s.msg), s);
    await q.ctx.close();
  }

  {
    // Live scan on short phones: the camera view shrinks so the "Added" line and Stop scanning stay on screen.
    // A drawn picture stands in for the camera, and a stand-in barcode reader reports one code.
    const cam = () => { const cv = document.createElement("canvas"); cv.width = 640; cv.height = 480; const g = cv.getContext("2d");
      setInterval(() => { g.fillStyle = "#777"; g.fillRect(0, 0, 640, 480); }, 50); const st = cv.captureStream(20);
      // A camera with a torch, as on most Android phones; the calls to switch it are recorded.
      const tr = st.getVideoTracks()[0]; window.__torch = []; tr.getCapabilities = () => ({ torch: true }); tr.applyConstraints = async c => { window.__torch.push(c.advanced[0].torch); };
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => st;
      window.BarcodeDetector = class { async detect() { return window.__code ? [{ rawValue: window.__code }] : []; } }; };
    for (const [w, h, big] of [[360, 640], [375, 667], [390, 844], [360, 640, 1], [375, 667, 1]]) {
      const q = await page(browser, w, { init: cam });
      await q.setViewportSize({ width: w, height: h });
      await q.goto(URL0); await q.waitForTimeout(300);
      if (big) { await q.evaluate(() => { cfg.size = "1.25"; applyCfg(); }); await q.waitForTimeout(150); }
      await q.evaluate(() => { document.getElementById("scanBtn").click(); document.getElementById("scan").click(); });
      await q.waitForTimeout(500); await q.evaluate(() => { window.__code = "VLT004040265"; }); await q.waitForTimeout(700);
      const s = await q.evaluate(() => { const b = id => document.getElementById(id).getBoundingClientRect();
        return { stop: Math.round(b("stopscan").bottom), msg: Math.round(b("smsg").bottom), torch: Math.round(b("torch").bottom), torchR: Math.round(b("torch").right), vw: innerWidth, vh: innerHeight, text: document.getElementById("smsg").textContent }; });
      check("Live scan at " + w + "×" + h + (big ? " with Extra large text" : "") + ": the Added line, Torch and Stop scanning are on screen", /^Added: VLT004040265/.test(s.text) && s.stop <= s.vh && s.msg <= s.vh && s.torch <= s.vh && s.torchR <= s.vw, s);
      if (w === 360 && !big) {
        await q.evaluate(() => document.getElementById("torch").click()); await q.waitForTimeout(50);
        let t = await q.evaluate(() => ({ calls: window.__torch.slice(), pressed: document.getElementById("torch").getAttribute("aria-pressed") }));
        await q.evaluate(() => document.getElementById("torch").click()); await q.waitForTimeout(50);
        t.after = await q.evaluate(() => ({ calls: window.__torch.slice(), pressed: document.getElementById("torch").getAttribute("aria-pressed") }));
        await q.click("#stopscan"); await q.waitForTimeout(50);
        t.hidden = await q.evaluate(() => document.getElementById("torch").hidden);
        check("Torch switches the camera light on and off, says if it's on, and goes when scanning stops", JSON.stringify(t.calls) === "[true]" && t.pressed === "true" && JSON.stringify(t.after.calls) === "[true,false]" && t.after.pressed === "false" && t.hidden, t);
        // A camera without a torch (most iPhones): no button.
        await q.evaluate(() => { const g = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = async () => { const st = await g(); st.getVideoTracks()[0].getCapabilities = () => ({}); return st; }; document.getElementById("scan").click(); });
        await q.waitForTimeout(400);
        t = await q.evaluate(() => ({ hidden: document.getElementById("torch").hidden, msg: document.getElementById("smsg").textContent }));
        check("with no torch on the camera, the Torch button isn't shown", t.hidden && /Point the camera|Added/.test(t.msg), t);
        check("no script errors", q.errors.length === 0, q.errors);
      }
      await q.ctx.close();
    }
  }

  {
    console.log("Accessibility fixes");
    const q = await page(browser, 390);
    await q.setViewportSize({ width: 390, height: 844 });
    await q.goto(URL0); await q.waitForTimeout(300);
    // A handheld scanner types and presses Enter: a second LPN while a warning is open must not be lost.
    await q.evaluate(() => { rows = [{ lpn: "VLT004037790", type: "BB", fsdu: false }]; save(); render(); });
    await q.fill("#lpn", "VLT004037790"); await q.press("#lpn", "Enter");
    await q.fill("#lpn", "VLT004037955"); await q.press("#lpn", "Enter");
    let s = await q.evaluate(() => ({ box: document.getElementById("lpn").value, msg: document.getElementById("msg").textContent, rows: rows.length, warn: !document.getElementById("chkBar").hidden }));
    check("a scan while a warning is open is kept in the box with a message, not lost", s.box === "VLT004037955" && /Answer the check first/.test(s.msg) && s.rows === 1 && s.warn, s);
    await q.keyboard.press("Escape");
    s = await q.evaluate(() => ({ warn: !document.getElementById("chkBar").hidden, rows: rows.length }));
    check("Escape skips the warning", !s.warn && s.rows === 1, s);
    await q.press("#lpn", "Enter");
    s = await q.evaluate(() => rows.map(r => r.lpn).join());
    check("after answering, the kept LPN adds with Enter", s === "VLT004037790,VLT004037955", s);
    // The Guide acts as a dialog: focus moves to Close, the page behind is inert, focus returns to the Guide button.
    await q.click("#btnGuide"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.id, inert: document.querySelector("main").inert && document.querySelector("header.top").inert, modal: document.getElementById("panel").getAttribute("aria-modal") }));
    check("opening the Guide moves focus into it and the page behind can't be reached", s.focus === "panelClose" && s.inert && s.modal === "true", s);
    await q.click("#panelClose"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.id, inert: document.querySelector("main").inert }));
    check("closing the Guide gives focus back to the Guide button", s.focus === "btnGuide" && !s.inert, s);
    // Contrast: box and button edges at least 3:1, accent text at least 4.5:1, even with a pale accent.
    s = await q.evaluate(() => {
      const rt = (a, b) => { const x = lumOf(a) + .05, y = lumOf(b) + .05; return Math.max(x, y) / Math.min(x, y); }, cs = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const out = [];
      for (const [bg, ac] of [["#0c1830", "#ff8a2a"], ["#e3e8e4", "#2f6f68"], ["#1d1f23", "#f5b324"], ["#eef1f6", "#2563eb"], ["#ffffff", "#ff8a2a"], ["#0c1830", "#3f51b5"], ["#eef1f6", "#ffb74d"]]) {
        theme = { bg, ac }; applyTheme();
        out.push({ bg, ac, bd: +rt(cs("--bd"), cs("--paper")).toFixed(2), act: +Math.min(rt(cs("--act"), cs("--paper")), rt(cs("--act"), cs("--bg"))).toFixed(2) });
      }
      theme = Object.assign({}, THEME_DEFAULT); applyTheme(); return out;
    });
    check("box and button edges are at least 3:1 in every theme", s.every(x => x.bd >= 3), s);
    check("accent text (headings, links, focus ring) is at least 4.5:1, even with a pale or dark accent", s.every(x => x.act >= 4.5), s);
    s = await q.evaluate(() => { const sb = document.getElementById("scanbox"), ck = document.getElementById("chkBar");
      return { smsg: document.getElementById("smsg").getAttribute("role"), order: !!(ck.compareDocumentPosition(sb) & Node.DOCUMENT_POSITION_FOLLOWING), lang: document.documentElement.lang, flash: getComputedStyle(document.getElementById("flash")).pointerEvents }; });
    // LPNs in the log can be edited with the keyboard, and Undo shows where it can be seen on a phone.
    await q.evaluate(() => { rows = [{ lpn: "VLT004037790", type: "BB", fsdu: false }, { lpn: "QUB001899186", type: "FPP", fsdu: false }]; save(); render(); window.scrollTo(0, 0); });
    await q.focus("#body .lpnedit"); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    await q.keyboard.type("VLT004037791"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    let u = await q.evaluate(() => { const bar = document.getElementById("undoBar").getBoundingClientRect(), dock = document.querySelector(".entry").getBoundingClientRect();
      return { focus: document.activeElement.className, lpns: rows.map(r => r.lpn).join(), name: document.querySelector("#body .lpnedit").getAttribute("aria-label"), shown: !document.getElementById("undoBar").hidden, onScreen: bar.top >= 0 && bar.bottom <= dock.top, text: document.getElementById("undoTxt").textContent }; });
    check("an LPN in the log can be edited with the keyboard (it's a button named for the LPN), and focus comes back to it", /^VLT004037791,/.test(u.lpns) && /^Edit LPN /.test(u.name) && u.focus === "lpnedit", u);
    check("on a phone, Undo shows on screen just above the entry bar", u.shown && u.onScreen && /Changed VLT004037790 to VLT004037791/.test(u.text), u);
    u = await q.evaluate(() => { addValue("RBY006291170"); const a = document.getElementById("flash").getBoundingClientRect(), b = document.getElementById("undoBar").getBoundingClientRect(); return { flashShown: !document.getElementById("flash").hidden, apart: a.bottom <= b.top + 1 }; });
    check("on a phone, the Added note shows above the Undo bar, not under it", u.flashShown && u.apart, u);
    await q.click("#undoBtn"); u = await q.evaluate(() => rows[0].lpn);
    check("Undo from there puts the LPN back", u === "VLT004037790", u);
    await q.evaluate(() => { rows = rows.slice(0, 2); save(); render(); });
    u = await q.evaluate(() => { document.getElementById("expBtn").click(); return !document.getElementById("expMenu").hidden; });
    await q.keyboard.press("Escape");
    u = { opened: u, closed: await q.evaluate(() => document.getElementById("expMenu").hidden && document.activeElement.id === "expBtn"), th: await q.evaluate(() => [...document.querySelectorAll("thead th")].pop().textContent) };
    check("Escape closes the Export menu and goes back to its button; the remove column has a name", u.opened && u.closed && u.th === "Remove", u);
    check("Live scan messages are announced, the warning sits above the camera, the Added note can't block taps, page language en-GB", s.smsg === "status" && s.order && s.lang === "en-GB" && s.flash === "none", s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }

  {
    // The feedback Worker (tools/feedback-worker), run here with a stand-in for GitHub.
    console.log("Feedback Worker");
    const WM = await import(require("url").pathToFileURL(path.join(ROOT, "tools", "feedback-worker", "worker.mjs")).href), W = WM.default;
    // A stand-in Durable Object store, as Cloudflare gives the Worker.
    const mkLimits = () => { const m = new Map(); let alarm = null; const lim = new WM.Limits({ storage: { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }, deleteAll: async () => m.clear() } });
      return { idFromName: () => "all", get: () => ({ fetch: (u, o) => lim.fetch(new Request("https://limits/", o)) }) }; };
    const env = { REPO: "Jamie9904/lpn-feedback", ALLOWED_ORIGIN: "https://jamie9904.github.io", GITHUB_TOKEN: "test-token", LIMITS: mkLimits() };
    const calls = []; const realFetch = global.fetch;
    global.fetch = async (u, o) => { calls.push({ u, m: o.method, b: JSON.parse(o.body), auth: o.headers.Authorization }); return new Response(JSON.stringify({ number: 7 }), { status: 201 }); };
    const send = (body, origin = env.ALLOWED_ORIGIN, ip = "1.2.3.4") => W.fetch(new Request("https://lpn-feedback.example.workers.dev/report", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), env);
    const JPEG = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString("base64");
    let r = await send({ kind: "problem", text: "Photo 3 read nothing\n@someone see [link](http://x)", report: "App: LPN Pallet Log v3.30 (build 43)\nManifest numbers (2): VLT004040265", app: "LPN Pallet Log v3.30 (build 43)" });
    let j = await r.json(); const iss = calls.find(c => /\/issues$/.test(c.u));
    check("feedback Worker: a problem becomes an issue in the private repo", r.status === 200 && j.ok && j.issue === 7 && iss && iss.u === "https://api.github.com/repos/Jamie9904/lpn-feedback/issues" && iss.auth === "Bearer test-token" && /^Problem: Photo 3 read nothing/.test(iss.b.title) && /\(LPN Pallet Log v3\.30 \(build 43\)\)/.test(iss.b.body), { j, iss });
    check("feedback Worker: the typed text and report are shown as plain text (no links or mentions)", /~~~~text\nPhoto 3 read nothing\n@someone see \[link\]\(http:\/\/x\)\n~~~~/.test(iss.b.body) && /<details><summary>Problem report<\/summary>/.test(iss.b.body), iss.b.body);
    calls.length = 0;
    r = await send({ kind: "idea", text: "Bigger buttons", app: "v3.30 https://evil.example @someone", photo: JPEG }, undefined, "2.2.2.2"); j = await r.json();
    const order = calls.map(c => c.m + " " + c.u.replace("https://api.github.com/repos/Jamie9904/lpn-feedback", "")), patch = calls.find(c => c.m === "PATCH");
    check("feedback Worker: the issue is made first, then the photo saved and shown in it", j.ok && order.length === 3 && order[0] === "POST /issues" && /^PUT \/contents\/photos\/\d{4}-\d{2}\/issue-7-.+\.jpg$/.test(order[1]) && order[2] === "PATCH /issues/7" && /!\[photo\]\(https:\/\/github\.com\/Jamie9904\/lpn-feedback\/blob\/HEAD\/photos\//.test(patch.b.body), order);
    check("feedback Worker: an app field that isn't the app's version line is left out (no links or mentions)", !/evil|@someone/.test(calls[0].b.body), calls[0].b.body.slice(0, 120));
    const bad = [];
    for (const [body, origin, want] of [[{ kind: "problem", text: "x" }, "https://evil.example", 403], [{ kind: "x", text: "x" }, null, 400], [{ kind: "problem", text: "  " }, null, 400],
      [{ kind: "problem", text: "x".repeat(4001) }, null, 400], [{ kind: "problem", text: "x", website: "spam" }, null, 400], [{ kind: "problem", text: "x", photo: "data:image/png;base64,AAAA" }, null, 400],
      [{ kind: "problem", text: "x", photo: "data:image/jpeg;base64," + Buffer.from("<html>not a jpeg").toString("base64") }, null, 400]]) {
      const res = await send(body, origin || env.ALLOWED_ORIGIN, "9.9.9." + bad.length); bad.push(res.status === want ? "ok" : res.status + "≠" + want);
    }
    check("feedback Worker: refuses other sites, wrong kinds, empty or long text, spam robots and photos that aren't JPEGs", bad.every(x => x === "ok"), bad);
    let last = 0; for (let i = 0; i < WM.PER_HOUR + 1; i++) last = (await send({ kind: "idea", text: "n" + i }, undefined, "5.5.5.5")).status;
    check("feedback Worker: more than " + WM.PER_HOUR + " reports an hour from one address are refused, across all servers", last === 429, last);
    env.LIMITS = mkLimits(); let codes = [];
    for (let i = 0; i < WM.DAY_ISSUES + 1; i++) codes.push((await send({ kind: "idea", text: "d" + i }, undefined, "7.7." + Math.floor(i / 5) + "." + i)).status);
    check("feedback Worker: at most " + WM.DAY_ISSUES + " reports a day in total", codes.slice(0, WM.DAY_ISSUES).every(c => c === 200) && codes[WM.DAY_ISSUES] === 429, codes.slice(-3));
    env.LIMITS = mkLimits();
    global.fetch = async () => new Response("{}", { status: 500 });
    r = await send({ kind: "problem", text: "x" }, undefined, "6.6.6.6"); j = await r.json();
    check("feedback Worker: if GitHub is down or the key has run out, the app is told to try again later", r.status === 503 && !j.ok, j);
    global.fetch = async () => new Response("{}", { status: 422 });
    r = await send({ kind: "problem", text: "x" }, undefined, "6.6.6.7"); j = await r.json();
    check("feedback Worker: a report GitHub refuses isn't retried (so it doesn't come back for ever)", r.status === 422 && !j.ok, j);
    global.fetch = realFetch;
  }

  {
    console.log("Report a problem or idea");
    const q = await page(browser, 390);
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.click("#btnGuide"); await q.waitForTimeout(100);
    await q.click("#fbGuide"); await q.waitForTimeout(150);
    let s = await q.evaluate(() => ({ title: document.getElementById("panelTitle").textContent, focus: document.activeElement.id }));
    const fbOk = await q.evaluate(() => { const u = FEEDBACK_URL, csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content; const cs = (csp.match(/connect-src([^;]*)/) || [])[1] || "";
      return { u, allowed: !u || cs.split(/\s+/).includes(new URL(u).origin), https: !u || /^https:\/\/[a-z0-9.-]+\.workers\.dev\/report$/.test(u) }; });
    check("the feedback address is a workers.dev /report address, allowed exactly in the security policy", fbOk.allowed && fbOk.https, fbOk);
    s = await q.evaluate(() => ({ box: !document.getElementById("fbBox").hidden, panelInert: document.getElementById("panel").inert, focus: document.activeElement.id }));
    check("the Guide's Report a problem link opens the report box over the Guide", s.box && s.panelInert && s.focus === "fbText", s);
    await q.keyboard.press("Escape"); await q.waitForTimeout(50);
    s = await q.evaluate(() => ({ box: !document.getElementById("fbBox").hidden, panel: !document.getElementById("panel").hidden, panelInert: document.getElementById("panel").inert, focus: document.activeElement.id }));
    check("Escape closes the report box only; the Guide stays open with focus back on its link", !s.box && s.panel && !s.panelInert && s.focus === "fbGuide", s);
    await q.click("#panelClose"); await q.waitForTimeout(50);
    // The Report button on the main page: on screen in the top bar, opens the box in the middle of the screen.
    for (const [w, h] of [[360, 740], [390, 844], [1300, 900]]) {
      await q.setViewportSize({ width: w, height: h }); await q.waitForTimeout(100);
      const r = await q.evaluate(() => { window.scrollTo(0, 0); const b = document.getElementById("btnReport").getBoundingClientRect(); return { inBar: b.top >= 0 && b.right <= innerWidth && b.height >= 44 && b.width >= 44, page: document.documentElement.scrollWidth <= innerWidth }; });
      check("at " + w + " px the Report button is in the top bar, big enough to tap, and the page doesn't scroll sideways", r.inBar && r.page, r);
    }
    await q.setViewportSize({ width: 390, height: 844 });
    await q.click("#btnReport"); await q.waitForTimeout(80);
    s = await q.evaluate(() => { const b = document.getElementById("fbBox").getBoundingClientRect(); return { open: !document.getElementById("fbBox").hidden, centred: Math.abs((b.left + b.right) / 2 - innerWidth / 2) < 2 && Math.abs((b.top + b.bottom) / 2 - innerHeight / 2) < 2, fits: b.top >= 0 && b.bottom <= innerHeight, inert: document.querySelector("main").inert, focus: document.activeElement.id }; });
    check("the Report button opens the report box in the middle of the screen, with focus in it and the page behind set aside", s.open && s.centred && s.fits && s.inert && s.focus === "fbText", s);
    await q.click("#fbClose"); await q.waitForTimeout(50);
    s = await q.evaluate(() => ({ open: !document.getElementById("fbBox").hidden, inert: document.querySelector("main").inert, focus: document.activeElement.id }));
    check("Close shuts the box and focus goes back to the Report button", !s.open && !s.inert && s.focus === "btnReport", s);
    await q.evaluate(() => openFeedback());
    s = await q.evaluate(async () => { document.getElementById("fbText").value = "Photo 3 read nothing"; FEEDBACK_URL = ""; await document.getElementById("fbSend").onclick(); return document.getElementById("fbMsg").textContent; });
    check("before the Worker is online, the form says so and points to the problem report file", /isn’t set up yet/.test(s) && /Download problem report/.test(s), s);
    s = await q.evaluate(async () => {
      FEEDBACK_URL = "https://lpn-feedback.test.workers.dev/report"; const sent = []; const real = window.fetch;
      window.fetch = async (u, o) => { sent.push({ u, b: JSON.parse(o.body) }); return new Response(JSON.stringify({ ok: true, issue: 3 }), { status: 200 }); };
      document.querySelector('input[name="fbKind"][value="idea"]').checked = true; document.getElementById("fbText").value = "Bigger buttons please";
      await document.getElementById("fbSend").onclick();
      const ok = { n: sent.length, u: sent[0] && sent[0].u, kind: sent[0] && sent[0].b.kind, text: sent[0] && sent[0].b.text, report: sent[0] && /LPN Pallet Log problem report/.test(sent[0].b.report), app: sent[0] && sent[0].b.app, msg: document.getElementById("fbMsg").textContent, cleared: document.getElementById("fbText").value === "" };
      // No signal: kept on the phone, then sent when back online.
      window.fetch = async () => { throw new TypeError("Failed to fetch"); };
      document.querySelector('input[name="fbKind"][value="problem"]').checked = true; document.getElementById("fbText").value = "Scanner froze"; document.getElementById("fbInc").checked = false;
      await document.getElementById("fbSend").onclick();
      const off = { msg: document.getElementById("fbMsg").textContent, queued: fbQueue().length, report: fbQueue()[0] && fbQueue()[0].report };
      // A report saved while a flush is running isn't lost, and the list never grows past its limit.
      let release; window.fetch = (u, o) => new Promise(res => { release = () => { sent.push({ u, b: JSON.parse(o.body) }); res(new Response(JSON.stringify({ ok: true, issue: 9 }), { status: 200 })); }; });
      const fl = fbFlush(); await new Promise(r => setTimeout(r, 20));
      fbSave(fbQueue().concat([{ id: "late", kind: "idea", text: "Added during the flush" }]));
      release(); await new Promise(r => setTimeout(r, 20)); release && release(); await fl;
      const race = { left: fbQueue().length, sent: sent.map(x => x.b.text) };
      fbSave([]); const big = fbSave([{ id: "a", kind: "idea", text: "x", report: "y".repeat(400000) }]); const six = fbSave([1, 2, 3, 4, 5, 6].map(i => ({ id: "s" + i, kind: "idea", text: "t" })));
      fbSave([{ id: "q1", kind: "problem", text: "Scanner froze", report: "", app: "LPN Pallet Log" }]);
      window.fetch = async (u, o) => { sent.push({ u, b: JSON.parse(o.body) }); return new Response(JSON.stringify({ ok: true, issue: 4 }), { status: 200 }); };
      const flushed = await fbFlush();
      const after = { flushed, left: fbQueue().length, last: sent[sent.length - 1].b.text, stored: localStorage.getItem("lpnfeedq") };
      // A refused report says why and isn't kept.
      window.fetch = async () => new Response(JSON.stringify({ ok: false, error: "That's too long: keep it under 4000 characters." }), { status: 400 });
      document.getElementById("fbText").value = "x"; await document.getElementById("fbSend").onclick();
      const refused = { msg: document.getElementById("fbMsg").textContent, queued: fbQueue().length };
      window.fetch = real; FEEDBACK_URL = "";
      return { ok, off, after, refused, race, big, six };
    });
    check("sending an idea posts the kind, text, app version and problem report, then clears the form", s.ok.n === 1 && s.ok.u === "https://lpn-feedback.test.workers.dev/report" && s.ok.kind === "idea" && s.ok.text === "Bigger buttons please" && s.ok.report && /^LPN Pallet Log/.test(s.ok.app) && /Sent\. Thank you/.test(s.ok.msg) && s.ok.cleared, s.ok);
    check("with no signal, a report is kept on the phone (without the report when unticked) and sent when back online", /saved on this phone/.test(s.off.msg) && s.off.queued === 1 && s.off.report === "" && s.after.flushed === 1 && s.after.left === 0 && s.after.last === "Scanner froze" && s.after.stored === null, s);
    check("a report saved while saved ones are being sent isn't lost: it's sent too", s.race.left === 0 && s.race.sent.includes("Scanner froze") && s.race.sent.includes("Added during the flush"), s.race);
    check("the waiting list refuses to grow past 5 reports or 300 KB", s.big === false && s.six === false, s);
    check("a report the server refuses says why and isn't kept", /too long/.test(s.refused.msg) && s.refused.queued === 0, s.refused);
    s = await q.evaluate(() => { localStorage.setItem("lpnfeedq", JSON.stringify([{ kind: "idea", text: "x" }])); const b = checkBackup({ lpnfeedq: "[]", lpnnames: "[]" }).data; const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); localStorage.removeItem("lpnfeedq"); return { inBackup: "lpnfeedq" in b }; });
    check("unsent reports stay on this phone: not taken from or put into backups", !s.inBackup, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }

  {
    console.log("Photo notes, Report this, seal boxes, Undo with the Manifest check");
    const q = await page(browser, 390);
    await q.setViewportSize({ width: 390, height: 844 });
    await q.goto(URL0); await q.waitForTimeout(300);
    let s = await q.evaluate(() => { document.getElementById("cmpPfx").value = "";
      const out = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VLT004040355", "VL1004040355"]].map(([a, b]) => ({ raw: a, first: b || a, again: b })));
      return { mended: out.mended, note: readNote("Photo 1", out, { added: 3, dup: 0 }) }; });
    check("a number corrected to match the page is named in the note, to check against the paper", JSON.stringify(s.mended) === '["VLT004040355"]' && /1 number was corrected to match the others on the page \(VLT004040355\): check it against the paper/.test(s.note), s);
    // Report a problem with these photos: shows after a batch and opens the report box with the worst photo attached.
    await q.evaluate(() => { document.getElementById("cmpToggle").click(); let n = 0;
      window.readPhoto = async () => { n++; const a = n === 1 ? ["VLT004040265", "VLT004040273"] : []; a.skipped = []; a.odd = []; a.mended = []; return a; }; });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [1, 2].map(i => ({ name: "m" + i + ".png", mimeType: "image/png", buffer: png })));
    await q.waitForFunction(() => !document.getElementById("cmpReport").hidden, null, { timeout: 5000 }).catch(() => {});
    await q.click("#cmpReport"); await q.waitForTimeout(400);
    s = await q.evaluate(() => ({ open: !document.getElementById("fbBox").hidden, kind: document.querySelector('input[name="fbKind"]:checked').value, text: document.getElementById("fbText").value, hint: document.getElementById("fbText").placeholder, photo: !!fbPhotoData, label: document.getElementById("fbPhotoName").textContent, send: !document.getElementById("fbSend").disabled }));
    check("Report a problem with these photos opens the report box as a Problem with the worst photo attached; the question is a hint, not text", s.open && s.kind === "problem" && s.text === "" && /^What went wrong with photo 2\?/.test(s.hint) && s.photo && /^Photo 2 attached/.test(s.label) && s.send, s);
    s = await q.evaluate(async () => { closeFeedback(); fbPhotoData = null;
      // Closed while the photo is still being added: it isn't kept for the next report.
      const slow = window.fbShrink; window.fbShrink = () => new Promise(r => setTimeout(() => r("data:image/jpeg;base64,/9j/AAAA"), 200));
      openFeedback({ kind: "problem", photo: new File(["x"], "p.jpg"), photoName: "Photo 1" }); const during = document.getElementById("fbSend").disabled; closeFeedback();
      await new Promise(r => setTimeout(r, 300)); window.fbShrink = slow;
      const kept = fbPhotoData;
      // The Report link goes after Clear (and after reading PDFs).
      document.getElementById("cmpClear").click();
      const dup = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VL1004040355", null], ["VL1004040355", null]].map(([a]) => ({ raw: a, first: a, again: null })));
      return { during, kept, link: document.getElementById("cmpReport").hidden, mended: dup.mended }; });
    check("Send waits while the photo is being added, and a box closed meanwhile doesn't keep the photo", s.during === true && s.kept === null, s);
    check("the Report link goes after Clear; a number read twice and corrected is named once", s.link === true && JSON.stringify(s.mended) === '["VLT004040355"]', s);
    await q.evaluate(() => { closeFeedback(); fbPhotoData = null; document.getElementById("fbText").value = ""; });
    // With the Manifest check open on a phone, Undo shows at the top, not over the results.
    s = await q.evaluate(async () => { document.body.classList.add("cmpfocus"); showUndo("Removed X", () => {}); await new Promise(r => setTimeout(r, 50)); const b = document.getElementById("undoBar").getBoundingClientRect(); document.body.classList.remove("cmpfocus"); document.getElementById("undoBar").hidden = true; return { top: Math.round(b.top), h: innerHeight }; });
    check("with the Manifest check open, Undo shows at the top of the screen", s.top >= 0 && s.top < 80, s);
    await q.setViewportSize({ width: 1300, height: 900 }); await q.waitForTimeout(150);
    s = await q.evaluate(() => { const i = document.getElementById("sealIn"); i.value = "SEAL1234567"; return { fits: i.scrollWidth <= i.clientWidth, w: i.clientWidth }; });
    check("on desktop an 11-character seal number fits its box", s.fits, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }

  {
    console.log("Find an LPN, sideways photos, file names, Follow phone, one-tap prefix");
    const q = await page(browser, 375);
    await q.goto(URL0); await q.waitForTimeout(300);
    // Find an LPN in Saved deliveries.
    await q.evaluate(() => { const t = localToday();
      hist = [{ id: "a1", saved: new Date().toISOString(), date: t, recv: "Jamie", trailer: "TR4471", rows: [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: false }] },
        { id: "a2", saved: new Date().toISOString(), date: t, recv: "Sam", rows: [{ lpn: "QUB000111222", type: "FPP", fsdu: false }] }];
      saveHist(); rows = [{ lpn: "QUB000111222", type: "FPP", fsdu: false }]; render(); openHelp("history", "Saved deliveries"); });
    await q.fill("#histFind", "4040 265"); await q.waitForTimeout(100);
    let s = await q.evaluate(() => ({ shown: [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).map(c => c.querySelector(".hitl").textContent), msg: document.getElementById("histFindMsg").textContent }));
    check("Find an LPN shows only the saved delivery that holds it, and names the pallet", s.shown.length === 1 && /Found: VLT004040265 \(BB\)/.test(s.shown[0]) && /Found in 1 saved delivery\./.test(s.msg), s);
    await q.fill("#histFind", "qub000111"); await q.waitForTimeout(100);
    s = await q.evaluate(() => document.getElementById("histFindMsg").textContent);
    check("Find an LPN also says when the pallet is in the current log", /Found in 1 saved delivery\. It is also in the current log\./.test(s), s);
    await q.fill("#histFind", "ZZZ999"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ shown: [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).length, msg: document.getElementById("histFindMsg").textContent }));
    check("Find an LPN says when no saved delivery holds it", s.shown === 0 && /Not in any saved delivery/.test(s.msg), s);
    await q.fill("#histFind", ""); await q.waitForTimeout(100);
    s = await q.evaluate(() => [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).length);
    check("clearing Find an LPN shows every saved delivery again", s === 2, s);
    s = await q.evaluate(() => { const r = document.getElementById("histFind").getBoundingClientRect(); return { right: r.right, w: innerWidth }; });
    check("the Find an LPN box fits a 375 px phone", s.right <= s.w, s);
    // Delete a delivery, then search: the deleted one isn't counted and nothing breaks.
    await q.evaluate(() => document.querySelector('#histRoot .hist button.d').click());
    await q.fill("#histFind", "4040265"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ msg: document.getElementById("histFindMsg").textContent, undo: !!document.querySelector("#histRoot .hist .row button.p") }));
    check("after deleting a saved delivery, Find an LPN still works and doesn't count the deleted one", /Not in any saved delivery/.test(s.msg) && s.undo, s);
    await q.evaluate(() => closeHelp());
    // Trailer number in file names.
    s = await q.evaluate(() => { const names = [];
      document.getElementById("trailer").value = "TR 4471/A"; names.push(fileTag());
      document.getElementById("trailer").value = ""; names.push(fileTag());
      // The Manifest check is named after the trailer of the delivery it checked.
      document.getElementById("trailer").value = "TR9999";
      setLogFrom(["QUB000111222"], [{ lpn: "QUB000111222", type: "FPP", fsdu: false }], localToday(), "Sam", "Saved delivery", "TR4471"); names.push(fileTag(cmpTrailer));
      setLogFrom(["QUB000111222"], [{ lpn: "QUB000111222", type: "FPP", fsdu: false }], localToday(), "Sam", "Saved delivery", ""); names.push(fileTag(cmpTrailer));
      document.getElementById("cmpUseLog").click(); names.push(fileTag(cmpTrailer));
      document.getElementById("cmpClear").click(); names.push(fileTag(cmpTrailer));
      document.getElementById("trailer").value = "";
      return names; });
    check("file names get the trailer number (only letters, numbers and dashes); the Manifest check uses the checked delivery's trailer", JSON.stringify(s) === '["-TR-4471-A","","-TR4471","","-TR9999",""]', s);
    // Sideways photo: nothing found, so it is turned and read again.
    s = await q.evaluate(async () => {
      const keep = { loadScript, prep, ocrWorker, ocrDone, ocrCanvas }, res = {};
      // answer(n, cv): what the n-th read of one photo finds.
      const run = async answer => { const seen = []; let first = null;
        window.prep = async () => { const c = document.createElement("canvas"); c.width = 300; c.height = 100; return first = c; };
        window.ocrCanvas = async (w, cv) => { seen.push(cv.width + "x" + cv.height); const a = answer(seen.length); const o = a.lpns.slice(); o.skipped = a.skipped || []; o.odd = []; o.mended = []; return { out: o, items: [], r: { words: [], text: "" } }; };
        const out = await ocrLpnsNow(new Blob(["x"]));
        return { seen, out: [...out], turned: out.turned, freed: first.width === 0, note: readNote("Photo 1", out, { added: out.length, dup: 0 }) }; };
      try {
        window.loadScript = async () => {}; window.ocrWorker = async () => ({}); window.ocrDone = () => {};
        res.at90 = await run(n => ({ lpns: n === 2 ? ["VLT004040265"] : [] }));
        res.at270 = await run(n => ({ lpns: n === 3 ? ["VLT004040265"] : [] }));
        res.upright = await run(() => ({ lpns: ["VLT004040265"] }));
        res.prefixOnly = await run(n => ({ lpns: [], skipped: n === 1 ? ["RBY001234567"] : [] }));
        res.at180 = await run(n => ({ lpns: n === 4 ? ["RBY006292169"] : [] }));
        res.nothing = await run(() => ({ lpns: [] }));
      } finally { Object.assign(window, keep); }
      return res; });
    check("a sideways photo with nothing found is turned and read again, and the note says so", JSON.stringify(s.at90.seen) === '["300x100","100x300"]' && s.at90.turned === 90 && s.at90.out[0] === "VLT004040265" && /The photo was sideways, so it was turned to read it\./.test(s.at90.note), s.at90);
    check("if turning one way finds nothing, the other way is tried", JSON.stringify(s.at270.seen) === '["300x100","100x300","100x300"]' && s.at270.turned === 270, s.at270);
    check("an upright photo, or one with only unlisted-prefix numbers, is read once and not called sideways", s.upright.seen.length === 1 && !s.upright.turned && !/sideways/.test(s.upright.note) && s.prefixOnly.seen.length === 1 && !s.prefixOnly.turned, { u: s.upright, p: s.prefixOnly });
    check("if neither sideways turn finds anything, the photo is read upside down, and the note says so", JSON.stringify(s.at180.seen) === '["300x100","100x300","100x300","300x100"]' && s.at180.turned === 180 && s.at180.out[0] === "RBY006292169" && /The photo was upside down, so it was turned to read it\./.test(s.at180.note) && !/sideways/.test(s.at180.note), s.at180);
    check("a photo with nothing readable any way up gives the usual note, and its canvas is freed", s.nothing.seen.length === 4 && !s.nothing.turned && /No LPNs could be read/.test(s.nothing.note) && s.nothing.freed && s.at90.freed, s.nothing);
    // One tap adds a missing prefix and its numbers.
    await q.evaluate(() => { document.getElementById("cmpToggle").click(); document.getElementById("cmpPfx").value = "VLT"; document.getElementById("cmpNums").value = "";
      window.readPhoto = async () => { const a = ["VLT004040265"]; a.skipped = ["RBY001234567", "RBY001234568"]; a.odd = []; a.mended = []; return a; }; });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [{ name: "m.png", mimeType: "image/png", buffer: png }]);
    await q.waitForFunction(() => !document.getElementById("cmpPfxAdd").hidden, null, { timeout: 5000 }).catch(() => {});
    s = await q.evaluate(() => ({ btn: [...document.querySelectorAll("#cmpPfxAdd button")].map(b => b.textContent), msg: document.getElementById("cmpMsg").textContent }));
    check("a photo with numbers whose prefix isn't listed offers a one-tap Add button", JSON.stringify(s.btn) === '["Add RBY to the prefix list"]' && /tap Add RBY below/.test(s.msg), s);
    await q.click("#cmpPfxAdd button"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ pfx: document.getElementById("cmpPfx").value, nums: document.getElementById("cmpNums").value.split("\n"), hidden: document.getElementById("cmpPfxAdd").hidden, msg: document.getElementById("cmpMsg").textContent }));
    s.focus = await q.evaluate(() => document.activeElement.id);
    check("tapping Add puts the prefix in the list and adds its numbers without reading again, keeping the earlier note", s.pfx === "VLT, RBY" && s.nums.includes("RBY001234567") && s.nums.includes("RBY001234568") && s.hidden && /Added RBY to the prefix list and 2 numbers/.test(s.msg) && /Photo 1: found 1 LPN/.test(s.msg) && !/tap Add/.test(s.msg), s);
    check("after tapping Add, keyboard focus moves to the manifest numbers", s.focus === "cmpNums", s.focus);
    await q.evaluate(() => { document.getElementById("cmpClear").click(); document.getElementById("cmpPfx").value = ""; savePfx(); });
    // Seal hint: the same number twice, or different lengths; quiet while typing.
    s = await q.evaluate(async () => { const out = {}, i = document.getElementById("sealIn"), o = document.getElementById("sealOut"), w = () => document.getElementById("sealWarn").textContent;
      const put = (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); };
      put(i, "SL123456"); put(o, "SL12"); out.typing = w();
      put(o, "SL1234567"); o.dispatchEvent(new Event("change")); out.len = w();
      put(o, "sl 123456"); o.dispatchEvent(new Event("change")); out.same = w();
      put(o, "SL654321"); out.fixed = w();
      put(o, "SL1234567"); o.dispatchEvent(new Event("change")); setDel({ sealIn: "A1", sealOut: "" }); out.cleared = w();
      setDel({ sealIn: "SEAL99", sealOut: "SEAL99" }); out.loaded = w(); setDel({});
      return out; });
    check("seal numbers that differ in length get a gentle warning when you leave the box, not while typing", s.typing === "" && /Seal in has 8 characters and seal out has 9\. Check neither is mistyped\./.test(s.len), s);
    check("the same seal number in both boxes is flagged, and the warning goes when it's fixed or cleared", /Seal in and seal out are the same number/.test(s.same) && s.fixed === "" && s.cleared === "" && /same number/.test(s.loaded), s);
    // Follow phone colours.
    await q.emulateMedia({ colorScheme: "dark" });
    await q.evaluate(() => { document.getElementById("btnSet").click(); });
    await q.waitForTimeout(200);
    await q.check("#setFollow"); await q.waitForTimeout(100);
    const bg = () => q.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
    const dark = await bg();
    await q.emulateMedia({ colorScheme: "light" }); await q.waitForTimeout(150);
    const light = await bg();
    s = await q.evaluate(() => ({ saved: JSON.parse(localStorage.getItem("lpntheme")), hex: document.getElementById("setBgHex").value }));
    check("Follow phone uses navy in dark mode and light in light mode, switching straight away", dark === "#0c1830" && light === "#eef1f6" && s.saved.follow === true && s.hex === "#eef1f6", { dark, light, s });
    await q.fill("#setAcHex", "#aa3300"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ follow: document.getElementById("setFollow").checked, saved: JSON.parse(localStorage.getItem("lpntheme")) }));
    check("choosing your own colour turns Follow phone off and keeps the colours shown", !s.follow && !s.saved.follow && s.saved.bg === "#eef1f6" && s.saved.ac === "#aa3300", s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }

  {
    console.log("Damaged pallets and Share missing list");
    const q = await page(browser, 360, { excel: true });
    await q.setViewportSize({ width: 360, height: 740 });
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: false }]; save(); render(); });
    // Tap the LPN, then a reason: the tap lands even though the LPN box had focus.
    await q.click("#body .lpnedit"); await q.waitForTimeout(100);
    let s = await q.evaluate(() => ({ choices: [...document.querySelectorAll(".dmgbox button")].filter(b => b.offsetParent).map(b => b.textContent), fits: [...document.querySelectorAll(".dmgbox button")].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().right <= innerWidth && b.getBoundingClientRect().height >= 44) }));
    check("tapping an LPN shows the damage choices under it, all on screen and big enough to tap", JSON.stringify(s.choices) === '["None","Crushed","Wet","Other…"]' && s.fits, s);
    await q.click(".dmgbox button:has-text('Wet')"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ dmg: rows[0].dmg, tag: document.querySelector("#body tr .dmgtag") && document.querySelector("#body tr .dmgtag").textContent, saved: JSON.parse(localStorage.getItem("lpnlog")).rows[0].dmg, open: !!document.querySelector(".dmgrow"), undo: document.getElementById("undoBar").textContent }));
    check("choosing Wet marks the pallet damaged, shows it in the log and saves it", s.dmg === "Wet" && s.tag === "Damaged: Wet" && s.saved === "Wet" && !s.open && /Marked VLT004040265 as damaged \(Wet\)/.test(s.undo), s);
    // Keyboard: Enter on the LPN, Tab to the choices, Other with typed text.
    await q.focus('#body .lpnedit[data-i="1"]'); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    await q.keyboard.press("Tab"); s = await q.evaluate(() => document.activeElement.textContent);
    await q.click(".dmgbox button:has-text('Other')"); await q.waitForTimeout(50);
    await q.keyboard.type("Torn label"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const s2 = await q.evaluate(() => ({ dmg: rows[1].dmg, focus: document.activeElement.className, label: document.querySelector('#body .lpnedit[data-i="1"]').getAttribute("aria-label") }));
    check("keyboard: Tab from the LPN box goes to the damage choices; Other takes typed text and focus comes back", s === "None" && s2.dmg === "Torn label" && s2.focus === "lpnedit" && /damaged: Torn label/.test(s2.label), { s, s2 });
    // Tab past the last choice: the change is kept and focus stays on that pallet.
    await q.focus('#body .lpnedit[data-i="0"]'); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    for (let k = 0; k < 5; k++) await q.keyboard.press("Tab");
    await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.className, i: document.activeElement.dataset && document.activeElement.dataset.i, open: !!document.querySelector(".dmgrow"), other: null }));
    check("Tab past the last damage choice closes them and keeps focus on that pallet", s.focus === "lpnedit" && s.i === "0" && !s.open, s);
    // The choices open in view, not under the phone entry bar, even for the last pallet.
    s = await q.evaluate(async () => { rows = rows.concat(Array.from({ length: 12 }, (_, k) => ({ lpn: "QUB0018992" + String(10 + k), type: "BB", fsdu: false }))); save(); render();
      const last = [...document.querySelectorAll("#body .lpnedit")].pop(); last.scrollIntoView({ block: "end" }); await new Promise(r => setTimeout(r, 100));
      last.click(); await new Promise(r => setTimeout(r, 300));
      const box = document.querySelector(".dmgbox").getBoundingClientRect(), bar = document.querySelector(".entry").getBoundingClientRect();
      const ae = document.activeElement; ae.blur(); await new Promise(r => setTimeout(r, 50));
      rows = rows.slice(0, 2); save(); render(); return { boxBottom: Math.round(box.bottom), barTop: Math.round(bar.top) }; });
    check("on a phone, the damage choices open above the entry bar, even for the last pallet", s.boxBottom <= s.barTop, s);
    // Exports and import keep the damage note.
    s = await q.evaluate(async () => { window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
      const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); }));
      const csv = "#,LPN,Pallet Type,FSDU\n1,VLT004040265,BB,No\n2,RUN0001830763,FMCG,No\n\nDamaged pallet,VLT004040265: Wet\nDamaged pallet,RUN0001830763: Torn label\nDamaged pallet,NOTHERE: Wet";
      const imp = await parseExported(new File([csv], "x.csv"));
      return { inSheet: vals.filter(v => v === "Damaged pallet").length, val: vals.filter(v => /: (Wet|Torn label)$/.test(v)), imp: imp.rows.map(r => r.dmg || "") }; });
    check("the Excel export lists damaged pallets in Delivery Details, and importing puts the notes back", s.inSheet === 2 && JSON.stringify(s.val) === '["VLT004040265: Wet","RUN0001830763: Torn label"]' && JSON.stringify(s.imp) === '["Wet","Torn label"]', s);
    s = await q.evaluate(() => { markExported(); const a = exported.sig === logSig(); rows[1].dmg = "Crushed"; const b = exported.sig === logSig(); rows[1].dmg = "Torn label"; return { a, b }; });
    check("marking a pallet damaged after exporting counts as a change not yet exported", s.a && !s.b, s);
    // Clearing with None, and Undo.
    await q.click("#body .lpnedit"); await q.waitForTimeout(50); await q.click(".dmgbox button.none"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ dmg: rows[0].dmg, tag: !!document.querySelector("#body tr:first-child .dmgtag") }));
    await q.click("#undoBar button"); await q.waitForTimeout(100);
    const back = await q.evaluate(() => rows[0].dmg);
    check("None removes the damage note, and Undo puts it back", s.dmg === undefined && !s.tag && back === "Wet", { s, back });
    s = await q.evaluate(() => { const r = cleanRows([{ lpn: "A1", type: "BB", dmg: { x: 1 } }, { lpn: "A2", type: "BB", dmg: "  very   long " + "x".repeat(80) }]); return [r[0].dmg, r[1].dmg.length, r[1].dmg.slice(0, 15)]; });
    check("a damage note from a backup or import is plain text up to 60 characters", s[0] === undefined && s[1] === 60 && s[2] === "very long xxxxx", s);
    // Share missing list.
    s = await q.evaluate(async () => { closeHelp && closeHelp(); document.getElementById("cmpToggle").click();
      document.getElementById("cmpLogNums").value = "VLT004040265\nRUN0001830763\nQUB001899182"; document.getElementById("cmpNums").value = "VLT004040265\nRUN0001830763\nRBY006292169\nRBY006292211";
      cmpTrailer = "TR4471"; document.getElementById("cmpDate").value = "2026-11-01"; document.getElementById("cmpCheck").click(); await new Promise(r => setTimeout(r, 100));
      let shared = null; navigator.share = async o => { shared = o; };
      document.getElementById("cmpShare").click(); await new Promise(r => setTimeout(r, 50));
      // Without the share menu, the list is copied.
      let copied = null; navigator.share = undefined; navigator.clipboard.writeText = async t => { copied = t; };
      document.getElementById("cmpShare").click(); await new Promise(r => setTimeout(r, 50));
      return { shared, copied, msg: document.getElementById("cmpMsg").textContent }; });
    const want = "Manifest check 01/11/2026, trailer TR4471\nMissing from the log (2): RBY006292169, RBY006292211\nOn the log only, to book in (1): QUB001899182\nMatched: 2 of 4 on the manifest";
    check("Share missing list sends the missing and extra LPNs as plain text through the share menu", s.shared && s.shared.text === want, s.shared);
    check("without a share menu, the list is copied and the message says so", s.copied === want && /copied/.test(s.msg), s);
    // Desktop: a long note wraps instead of pushing FSDU and ✕ out of view.
    await q.setViewportSize({ width: 1300, height: 900 }); await q.waitForTimeout(150);
    s = await q.evaluate(() => { cfg.size = "1.25"; applyCfg(); rows[0].dmg = "Corner crushed and wrap split along one whole side x"; render();
      const t = document.querySelector("#body").closest("table"), w = t.parentElement; const r = { table: Math.round(t.scrollWidth), box: Math.round(w.clientWidth) }; cfg.size = "1"; applyCfg(); return r; });
    check("on desktop with Extra large text, a long damage note wraps and the table still fits", s.table <= s.box, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }

  console.log("Offline store and failure paths");
  {
    // The service worker is on and every outside request goes through the test's router, including its own.
    const fakeLib = "https://cdn.jsdelivr.net/npm/fake-lib@1.0.0/fake.min.js", fakeOcr = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/fake-worker.min.js";
    let broken = 0;
    p = await page(browser, 375, { sw: true, real: REAL_LIBS, handle: async (r, u) => {
      if (u.href === fakeLib + "?broken") { broken++; await r.fulfill({ status: 503, body: "busy", headers: { "Access-Control-Allow-Origin": "*" } }); return true; }
      if (u.href === fakeLib || u.href === fakeOcr) { await r.fulfill({ status: 200, contentType: "text/javascript", body: "window.__fake=1", headers: { "Access-Control-Allow-Origin": "*" } }); return true; }
      return false;
    } });
    await p.goto(URL0); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(500);
    s = await p.evaluate(async ({ fakeLib, fakeOcr }) => {
      const out = { controlled: !!navigator.serviceWorker.controller };
      await fetch(fakeLib + "?broken", { mode: "cors" }).catch(() => {});
      await fetch(fakeLib, { mode: "no-cors" });   // unchecked (opaque) download of an ordinary library
      await fetch(fakeOcr, { mode: "no-cors" });   // unchecked download of a photo-reader file: allowed
      // The service worker saves in the background, so wait until the allowed copy has landed (or 3 seconds).
      const c = await caches.open("lpn-libs-v2"); let keys = [];
      for (let i = 0; i < 30; i++) { keys = (await c.keys()).map(r => r.url); if (keys.includes(fakeOcr)) break; await new Promise(r => setTimeout(r, 100)); }
      out.keptBroken = keys.includes(fakeLib + "?broken"); out.keptOpaque = keys.includes(fakeLib); out.keptOcr = keys.includes(fakeOcr);
      // A checked request must not be answered by the unchecked copy: it fetches a fresh one instead.
      const r = await fetch(fakeOcr, { mode: "cors" }); out.checkedAnswer = r.type;
      out.v1 = (await caches.keys()).includes("lpn-libs-v1");
      return out;
    }, { fakeLib, fakeOcr });
    check("the app is controlled by its service worker", s.controlled, s);
    check("a failed library download is never kept for offline use", !s.keptBroken && broken === 1, s);
    check("an unchecked download is only kept for the photo reader", !s.keptOpaque && s.keptOcr, s);
    check("an unchecked saved copy never answers a checked request", s.checkedAnswer === "cors", s);
    if (REAL_LIBS) {
      // Use Excel and PDF once online, then go offline and use them again from the saved copies.
      await p.evaluate(async () => { rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render();
        window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await loadJsPdf(); await loadPdfJs(); });
      await p.ctx.setOffline(true); await p.reload(); await p.waitForTimeout(800);
      s = await p.evaluate(async () => {
        const out = {}; const saved = []; window.saveOnly = async (b, n) => { saved.push(n); };
        await document.getElementById("dl").onclick(); out.xlsx = saved.filter(n => /\.xlsx$/.test(n)).length;
        const buf = await buildLogPdf("2026-10-26"); const imp = await parseExported(new File([buf], "log.pdf"));
        out.pdfRows = imp.rows.map(r => r.lpn); out.rows = rows.length; return out;
      });
      check("offline after one online use: Excel export and PDF reading still work", s.xlsx === 1 && JSON.stringify(s.pdfRows) === '["RUN0001830763"]' && s.rows === 1, s);
    }
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Restore when storage runs out part-way: everything is put back as it was.
    p = await page(browser, 375, { init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "KEEP000000001", type: "BB" }], date: "2026-10-26" })) });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      window.saveOnly = async () => {}; document.getElementById("btnSet").click();
      const before = localStorage.getItem("lpnlog");
      const f = new File([JSON.stringify({ app: "lpn-pallet-log", data: { lpnlog: JSON.stringify({ rows: [{ lpn: "NEW000000001", type: "BB" }] }), lpnhist: "[]" } })], "b.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      const set = Storage.prototype.setItem; let n = 0;
      Storage.prototype.setItem = function (k, v) { if (k === "lpnhist" && n++ === 0) throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); };
      try { await document.getElementById("bkGo").onclick(); } finally { Storage.prototype.setItem = set; }
      return { same: localStorage.getItem("lpnlog") === before, msg: document.getElementById("bkMsg").textContent };
    });
    check("a restore that runs out of storage puts everything back", s.same && /ran out of storage space, so nothing was changed/.test(s.msg), s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Photo reader that fails or never starts: plain message, and only its own saved files are cleared.
    p = await page(browser, 375);
    await p.clock.install();
    await p.goto(URL0); await p.clock.runFor(500);
    const prepPhoto = async mode => p.evaluate(async mode => {
      const c = await caches.open("lpn-libs-v2");
      await c.put("https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js", new Response("x"));
      await c.put("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", new Response("y"));
      window.__started = false;
      window.Tesseract = { createWorker: () => { window.__started = true; return mode === "fail" ? Promise.reject(new Error("worker")) : new Promise(() => {}); } };
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 60; const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      window.__ocr = ocrLpns(new File([blob], "p.png", { type: "image/png" })).then(() => "ok", e => e.message);
    }, mode);
    // The message is only given after the clean-up has finished, so read it first, then the saved files.
    // wait: how long to wait for the result (real time flows alongside the fake clock); the early probe uses a short wait.
    const ocrState = (wait = 5000) => p.evaluate(async wait => { const msg = await Promise.race([window.__ocr, new Promise(r => setTimeout(() => r("still waiting"), wait))]);
      const c = await caches.open("lpn-libs-v2"); const k = (await c.keys()).map(r => r.url);
      return { msg, tess: k.some(u => /tesseract/.test(u)), other: k.some(u => /jspdf/.test(u)) }; }, wait);
    await prepPhoto("fail"); await p.waitForFunction(() => window.__started); await p.clock.runFor(1000);
    s = await ocrState();
    check("a photo reader that fails to start: plain message, its saved files cleared, others kept", /photo reader couldn’t load/.test(s.msg) && !s.tess && s.other, s);
    await prepPhoto("hang"); await p.waitForFunction(() => window.__started); await p.clock.runFor(60000);
    const early = await ocrState(50); await p.clock.runFor(31000);
    s = await ocrState();
    check("a photo reader that never starts gives up after 90 seconds", early.msg === "still waiting" && /photo reader couldn’t load/.test(s.msg) && !s.tess && s.other, { early, s });
    await p.ctx.close();
  }

  if (REAL_LIBS) {
    console.log("Real photo reading and the security policy (GitHub only)");
    // The photo reader's worker, engine and English language data come from the real internet here.
    p = await page(browser, 1300, { real: true, net: true });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const cv = document.createElement("canvas"); cv.width = 900; cv.height = 160; const g = cv.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, 900, 160); g.fillStyle = "#000"; g.font = "bold 64px monospace"; g.fillText("VLT003977037", 40, 105);
      const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      // One retry: the language data comes from the internet, and a network blip isn't a fault in the app.
      for (let i = 0; i < 2; i++) { try { return { found: await ocrLpns(new File([blob], "p.png", { type: "image/png" })), tries: i + 1 }; } catch (e) { if (i) return { err: e.message }; } }
    });
    check("real photo reading finds an LPN in a picture", Array.isArray(s.found) && s.found.includes("VLT003977037"), s);
    // Real manifest photos from the user (tools/ocr-check, address boxes cut off), read exactly as on a phone.
    {
      const oc = require(path.join(ROOT, "tools", "ocr-check", "check.js"));
      let right = 0, total = 0; const probs = [];
      for (const ph of oc.load(path.join(ROOT, "tools", "ocr-check"))) {
        const r = await oc.readJs(p, ph.file, "");
        if (r.err) { probs.push(ph.name + ": " + r.err); total += ph.want.length; continue; }
        const sc = oc.score(ph.want, r.found); right += sc.right.length; total += ph.want.length;
        if (sc.missing.length || sc.extra.length) {
          probs.push(ph.name + (sc.missing.length ? " missing " + sc.missing.join(" ") : "") + (sc.extra.length ? " extra " + sc.extra.join(" ") : ""));
          // What the reader saw for each number (raw text, first read, close-up), to work out a fix.
          if (process.env.GITHUB_ACTIONS) console.log("::notice title=Photo reading detail " + ph.name + "::" + (r.items || []).map(i => i.raw.replace(/\s+/g, "_") + ">" + i.first + ">" + (i.again || "-")).join(" ").slice(0, 900));
        }
      }
      if (process.env.GITHUB_ACTIONS) console.log("::notice title=Photo reading::" + right + " of " + total + " LPNs right on the user's manifest photos" + (probs.length ? "; " + probs.join("; ") : ", nothing extra"));
      check("real photo reading gets every LPN on the user's manifest photos, and nothing extra", right === total && !probs.length, { right, total, probs });
    }
    await p.ctx.close();

    // The app's Content-Security-Policy (index.html): every flow must work under it with nothing blocked.
    const cspConsole = [];
    p = await page(browser, 1300, { real: true, net: true, init: () => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); } });
    // Blocks inside the background workers (pdf.js, photo reader) don't reach the page's event, but do reach the console.
    const onMsg = m => { if (/Content.Security.Policy/i.test(m.text())) cspConsole.push(m.text().slice(0, 200)); };
    p.on("console", onMsg); p.on("worker", w => w.on("console", onMsg));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const flows = {};
      const run = async (name, fn) => { try { await fn(); flows[name] = "ok"; } catch (e) { flows[name] = "failed: " + e.message; } };
      rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render(); window.saveOnly = async () => {};
      await run("excel", () => document.getElementById("dl").onclick());
      let pdf; await run("pdf export", async () => { pdf = await buildLogPdf("2026-10-26"); });
      await run("pdf reading", async () => { if ((await parseExported(new File([pdf], "l.pdf"))).rows.length !== 1) throw new Error("no rows"); });
      await run("pdf merge", async () => { await loadPdfLib(); });
      await run("photo reading", async () => { const cv = document.createElement("canvas"); cv.width = 600; cv.height = 120; const g = cv.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, 600, 120); g.fillStyle = "#000"; g.font = "bold 48px monospace"; g.fillText("VLT003977037", 20, 80);
        const b = await new Promise(r => cv.toBlob(r, "image/png")); await ocrLpns(new File([b], "p.png", { type: "image/png" })); });
      await run("printing", async () => { await printBuf(pdf.slice(0), "l.pdf", { textContent: "" }); });
      await run("barcode scanner library", async () => { await loadZX(); new ZXing.BrowserMultiFormatReader(); });
      await new Promise(r => setTimeout(r, 300));
      return { flows, blocked: [...new Set(window.__csp)] };
    });
    s.workerBlocks = cspConsole;
    check("every flow works under the security policy and nothing is blocked (page and workers)", Object.values(s.flows).every(v => v === "ok") && !s.blocked.length && !cspConsole.length, s);
    await p.ctx.close();
  }

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
  // On GitHub the real libraries must be there; a summary note shows whether they ran.
  if (process.env.GITHUB_ACTIONS) {
    if (!REAL_LIBS) { failed++; console.log("::error title=Real export libraries missing::npm install didn't fetch ExcelJS, jsPDF and pdf.js, so the real export checks were skipped."); }
    console.log("::notice title=Checks::" + passed + " passed, " + failed + " failed" + (REAL_LIBS ? ", including the real export library checks" : ", real export library checks skipped"));
  }
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error(e);
  if (process.env.GITHUB_ACTIONS) console.log("::error title=Test run stopped::" + String(e && e.message || e).replace(/[\r\n%]/g, " ").slice(0, 900));
  process.exit(1);
});
