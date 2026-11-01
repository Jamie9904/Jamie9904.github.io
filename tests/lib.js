/* Shared pieces for the checks: the local web server, check(), the page opener and the ExcelJS stand-in.
   Each file in tests/groups is one group of checks; tests/run.js runs them in order. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json",
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

module.exports = { http, fs, path, chromium, ROOT, TYPES, serve, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page, counts: () => ({ passed, failed }), fail: () => { failed++; } };
