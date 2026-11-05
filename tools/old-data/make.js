/* Makes the saved files from older builds that tests/groups/21-old-data.js checks the current app against.
   Run from the site folder:  node tools/old-data/make.js   (then python3 tools/old-data/files.py)
   For each build in BUILDS it takes that build's files from git history, opens it in Chromium with the outside
   libraries replaced by recording stand-ins, logs the same delivery with that build's own code, and keeps:
     storage.json  every lpn… localStorage value it saved (the log, saved deliveries, names, settings)
     backup.json   the file its Download backup button made
     cells.json    the cells its Excel export wrote (files.py turns them into log.xlsx)
     keywords.txt  the hidden data its PDF export wrote (files.py puts it in log.pdf)
     expect.json   what the current app should read back
   Add a build here when the shape of saved data or exports changes, then run both scripts and commit. */
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { EXCEL_STUB } = require("../../tests/lib");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "tests/fixtures/old");
// build number: commit that published it. Chosen where saved data or exports changed shape.
const BUILDS = {
  19: "2887748", // first build with trailer and seal fields
  30: "9e63a49", // security tidy-up of everything read from storage and backups
  46: "8b7fb74", // last build before damaged pallets
  49: "ba25fbe", // damaged pallets added (dmg on rows, extra item in the PDF data)
  54: "71b49bf", // last build before pallets with no LPN and descriptions
};
const DEL = { date: "2026-03-02", recv: "Jamie", notes: "Old build check, notes with a comma, and \"quotes\"", expect: "4", trailer: "TR 4471", sealIn: "112233", sealOut: "112234" };
const OLD = { date: "2026-03-01", recv: "Jamie", notes: "", expect: "", trailer: "TR 1001", sealIn: "", sealOut: "" };
const ROWS = [
  { lpn: "VLT004040265", type: "BB", fsdu: false },
  { lpn: "RUN000123456", type: "FMCG", fsdu: true, dmg: "Crushed" },
  { lpn: "QUB998877665", type: "FPP", fsdu: false },
  { lpn: "RBY000111222", type: "Mixed", fsdu: true, dmg: "Other: wrap torn" },
];
const OLDROWS = [{ lpn: "VLT000000001", type: "FMCG", fsdu: false }, { lpn: "VLT000000002", type: "BB", fsdu: true }];

// jsPDF stand-in that keeps the hidden data (keywords) the export writes.
const PDF_STUB = () => {
  const doc = new Proxy({}, { get(t, k) {
    if (k === "setProperties") return o => { window.__kw = o.keywords; return doc; };
    if (k === "output") return () => new ArrayBuffer(4);
    if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 }, getNumberOfPages: () => 1, getCurrentPageInfo: () => ({ pageNumber: 1 }), scaleFactor: 1 };
    if (k === "getTextWidth" || k === "getStringUnitWidth") return () => 10;
    if (k === "splitTextToSize") return s => [String(s)];
    if (k === "getNumberOfPages") return () => 1;
    if (k === "lastAutoTable") return { finalY: 100 };
    if (k === "getFontSize") return () => 10;
    if (k === "getImageProperties") return () => ({ width: 100, height: 100 });
    if (k === "then") return undefined;
    return () => doc;
  } });
  const J = function () { return doc; }; J.API = { autoTable() {} };
  window.jspdf = { jsPDF: J }; window.jsPDF = J;
};

function serveDir(dir) {
  const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };
  return new Promise(res => { const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1", () => res(s)); });
}

(async () => {
  const browser = await chromium.launch();
  for (const [build, sha] of Object.entries(BUILDS)) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lpn-old-"));
    execFileSync("sh", ["-c", `git -C "${ROOT}" archive ${sha} | tar -x -C "${dir}"`]);
    const srv = await serveDir(dir);
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
    const p = await ctx.newPage();
    const errors = []; p.on("pageerror", e => errors.push(e.message));
    await p.route("**/*", r => new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort());
    await p.addInitScript(() => { try { localStorage.setItem("lpninstallshown", "1"); localStorage.setItem("lpnwelcome", "1"); } catch (e) {} });
    await p.clock.setFixedTime(new Date("2026-03-02T10:00:00")); // saved deliveries older than last week are removed
    await p.addInitScript(EXCEL_STUB); await p.addInitScript(PDF_STUB);
    await p.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await p.waitForTimeout(500);
    const hasDmg = +build >= 49;
    const strip = rs => rs.map(r => { const o = { lpn: r.lpn, type: r.type, fsdu: r.fsdu }; if (hasDmg && r.dmg) o.dmg = r.dmg; return o; });
    const out = await p.evaluate(async ({ DEL, OLD, ROWS, OLDROWS }) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      window.saveOnly = async (buf, name) => { window.__saved = { name, text: new TextDecoder().decode(new Uint8Array(buf)) }; };
      if (typeof emailVia === "function") window.navigator.share = undefined;
      // A delivery saved to Saved deliveries, then the current one.
      rows = OLDROWS.map(r => Object.assign({}, r)); setDel(OLD); save(); render();
      newDelivery(); newDelivery(); await wait(50);
      rows = ROWS.map(r => Object.assign({}, r)); setDel(DEL); save(); render();
      // Excel export (the stand-in keeps the cells).
      await document.getElementById("dl").onclick(); await wait(300);
      const ws = window.__wb && window.__wb.sheets[0], cells = [];
      if (ws) Object.keys(ws.rows).forEach(k => Object.keys(ws.rows[k]._c).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null && c.value !== "") cells.push([+k, +j, typeof c.value === "object" ? (c.value.richText ? c.value.richText.map(t => t.text).join("") : c.value.text || String(c.value)) : c.value]); }));
      const merges = ws ? ws.merges : [];
      // PDF export (the stand-in keeps the hidden data).
      window.__kw = "";
      try { await buildLogPdf(DEL.date); } catch (e) { window.__pdfErr = String(e); }
      await wait(300);
      const kw = window.__kw || "";
      // Download backup.
      window.__saved = null; await backupNow(document.getElementById("bkMsg") ? "bkMsg" : "dlmsg"); await wait(100);
      const storage = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^lpn/.test(k) && k !== "lpndiag") storage[k] = localStorage.getItem(k); }
      return { storage, backup: window.__saved && window.__saved.text, cells, merges, kw, pdfErr: window.__pdfErr || "" };
    }, { DEL, OLD, ROWS: strip(ROWS), OLDROWS });
    const d = path.join(OUT, "build-" + build); fs.mkdirSync(d, { recursive: true });
    const problems = [];
    if (errors.length) problems.push("page errors: " + errors.join("; "));
    if (!out.backup) problems.push("no backup file");
    if (!out.cells.length) problems.push("no Excel cells");
    if (!/^LPNLOG2:/.test(out.kw)) problems.push("no PDF hidden data" + (out.pdfErr ? " (" + out.pdfErr + ")" : ""));
    fs.writeFileSync(path.join(d, "storage.json"), JSON.stringify(out.storage, null, 1) + "\n");
    if (out.backup) fs.writeFileSync(path.join(d, "backup.json"), out.backup);
    fs.writeFileSync(path.join(d, "cells.json"), JSON.stringify({ cells: out.cells, merges: out.merges }) + "\n");
    fs.writeFileSync(path.join(d, "keywords.txt"), out.kw);
    fs.writeFileSync(path.join(d, "expect.json"), JSON.stringify({ build: +build, commit: sha, delivery: DEL, rows: strip(ROWS), saved: [{ delivery: OLD, rows: OLDROWS }] }, null, 1) + "\n");
    console.log("build " + build + ": " + (problems.length ? "PROBLEM " + problems.join(", ") : "ok") + " (" + out.cells.length + " cells, " + Object.keys(out.storage).length + " stored values)");
    await ctx.close(); srv.close(); fs.rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
