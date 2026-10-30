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
  "pdf-lib.min.js": "pdf-lib/dist/pdf-lib.min.js", "tesseract.min.js": "tesseract.js/dist/tesseract.min.js" };
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
      // {csp:"..."}: serve index.html with that Content-Security-Policy, to rehearse it before it's adopted.
      if (opts.csp && /\/(index\.html)?$/.test(u.pathname)) {
        const res = await r.fetch(); const body = (await res.text()).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + opts.csp + '">');
        return r.fulfill({ response: res, body });
      }
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
    const LOG = [{ lpn: "VLT003977037", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: true }, { lpn: "RBY006291167", type: "Mixed", fsdu: false }];
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
    const ok = /script-src 'self' https:\/\/cdnjs\.cloudflare\.com https:\/\/cdn\.jsdelivr\.net https:\/\/unpkg\.com 'wasm-unsafe-eval';/.test(pol) && !/unsafe-eval'|'unsafe-inline'[^;]*;\s*worker/.test(pol.replace("'wasm-unsafe-eval'", "")) && /base-uri 'none'/.test(pol) && /object-src blob:/.test(pol) && html.indexOf(m && m[0]) < html.indexOf("<script");
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
    await p.goto(URL0); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(800);
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
      window.Tesseract = { createWorker: () => mode === "fail" ? Promise.reject(new Error("worker")) : new Promise(() => {}) };
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 60; const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      window.__ocr = ocrLpns(new File([blob], "p.png", { type: "image/png" })).then(() => "ok", e => e.message);
    }, mode);
    // The message is only given after the clean-up has finished, so read it first, then the saved files.
    const ocrState = () => p.evaluate(async () => { const msg = await Promise.race([window.__ocr, new Promise(r => setTimeout(() => r("still waiting"), 50))]);
      const c = await caches.open("lpn-libs-v2"); const k = (await c.keys()).map(r => r.url);
      return { msg, tess: k.some(u => /tesseract/.test(u)), other: k.some(u => /jspdf/.test(u)) }; });
    await prepPhoto("fail"); await p.clock.runFor(1000);
    s = await ocrState();
    check("a photo reader that fails to start: plain message, its saved files cleared, others kept", /photo reader couldn’t load/.test(s.msg) && !s.tess && s.other, s);
    await prepPhoto("hang"); await p.clock.runFor(60000);
    const early = await ocrState(); await p.clock.runFor(31000);
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
      try { return { found: await ocrLpns(new File([blob], "p.png", { type: "image/png" })) }; } catch (e) { return { err: e.message }; }
    });
    check("real photo reading finds an LPN in a picture", Array.isArray(s.found) && s.found.includes("VLT003977037"), s);
    await p.ctx.close();

    // The app's Content-Security-Policy (index.html): every flow must work under it with nothing blocked.
    p = await page(browser, 1300, { real: true, net: true, init: () => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); } });
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
      await new Promise(r => setTimeout(r, 300));
      return { flows, blocked: [...new Set(window.__csp)] };
    });
    check("every flow works under the security policy and nothing is blocked", Object.values(s.flows).every(v => v === "ok") && !s.blocked.length, s);
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
