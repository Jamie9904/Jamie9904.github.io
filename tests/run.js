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
      lpnFont: d._c[2].font.name, lpnW: ws.columns[1].width, notesH: (() => { const k = Object.keys(ws.rows).find(k => ws.rows[k]._c[6] && ws.rows[k]._c[6].value === "Notes"); return k ? ws.rows[k].height : null; })(), footer: ws.headerFooter.oddFooter, fit: ws.pageSetup.fitToWidth, titles: ws.pageSetup.printTitlesRow, hdrRow: hdr,
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
    const ws = window.__wb && window.__wb.sheets.find(w => /Manifest/.test(w.name)); return ws ? ws.columns[1].width : null;
  });
  check("manifest check LPN column fits a 13-character LPN", s >= 27, s);
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
