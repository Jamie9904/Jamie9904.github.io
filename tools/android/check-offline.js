/*
  Offline Android app, step 3: checks tools/android/www in a browser with the internet blocked, before it goes into the APK.
  Run after build-www.js: node tools/android/check-offline.js
  Android's file saving and share menu are stood in for, so the checks see what the app hands to them.
*/
const fs = require("fs");
const path = require("path");
const http = require("http");
const WWW = path.join(__dirname, "www");
const OCR = path.join(__dirname, "..", "ocr-check");
const GH = !!process.env.GITHUB_ACTIONS;
const { readJs, load, score } = require(path.join(OCR, "check.js"));
let passed = 0, failed = 0;
const check = (name, ok, info) => { if (ok) { passed++; console.log("  ok    " + name); } else { failed++; console.log((GH ? "::error title=Offline app check::" : "  FAIL  ") + name + (info === undefined ? "" : "  (" + JSON.stringify(info).slice(0, 400) + ")")); } };
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json" };

(async () => {
  const srv = http.createServer((q, r) => {
    const p = decodeURIComponent(q.url.split("?")[0]), f = path.join(WWW, p === "/" ? "index.html" : p);
    if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1");
  await new Promise(r => srv.on("listening", r));
  const { chromium } = require("playwright");
  const b = await chromium.launch(), ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const outside = [];
  await ctx.route("**/*", r => { const u = new URL(r.request().url()); if (u.hostname === "127.0.0.1" || /^(data|blob):/.test(u.protocol)) return r.continue(); outside.push(u.href); return r.abort(); });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  // Stand-ins for the Android app's file saving and share menu.
  await page.addInitScript(() => {
    try { localStorage.setItem("lpninstallshown", "1"); } catch (e) {}
    window.__fs = []; window.__share = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: { writeFile: async o => { window.__fs.push({ path: o.path, directory: o.directory, size: o.data.length, head: o.data.slice(0, 8) }); return { uri: "file:///data/" + o.directory + "/" + o.path }; } },
      Share: { share: async o => { window.__share.push(o); } } } };
  });
  await page.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await page.waitForTimeout(800);
  console.log("Offline Android app");

  let s = await page.evaluate(() => ({ apk: window.LPN_APK === true, report: (() => { const e = document.getElementById("btnReport"); return !!e && !e.hidden && e.getClientRects().length > 0; })(),
    sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), feats: { report: feat("report"), shareApp: feat("shareApp") } }));
  check("opens with no internet, as the Android copy", s.apk && !s.sw, s);
  check("Report a problem and Share this app are switched off", !s.report && s.feats.report === false && s.feats.shareApp === false, s);
  s = await page.evaluate(() => { openHelp("settings", "Settings"); const t = document.getElementById("panelBody").textContent; closeHelp(); openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody").textContent; closeHelp(); return { share: /Share this app/.test(t) || !!document.getElementById("shareUrl"), report: /Report a problem/.test(t + g) }; });
  check("Settings and the Guide don't offer Share this app or Report a problem", !s.share && !s.report, s);

  s = await page.evaluate(async () => { const out = {};
    for (const [k, f] of Object.entries({ excel: () => loadExcel(), pdf: () => loadJsPdf(), pdflib: () => loadPdfLib(), pdfread: () => loadPdfJs(),
      barcode: () => loadScript("lib/cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js", () => window.ZXing) }))
      try { await f(); out[k] = true; } catch (e) { out[k] = String(e.message || e); }
    return out; });
  check("the Excel, PDF, PDF reading and barcode libraries load from inside the app", Object.values(s).every(v => v === true), s);
  s = await page.evaluate(async () => { if (!window.jspdf || !window.pdfjsLib) return { pages: 0, text: "libraries not loaded" }; const d = new window.jspdf.jsPDF(); d.text("LPN VLT004040265", 20, 20); const buf = d.output("arraybuffer");
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; const pg = await doc.getPage(1); const tc = await pg.getTextContent(); return { pages: doc.numPages, text: tc.items.map(i => i.str).join(" ") }; });
  check("a PDF is read with the reader inside the app", s.pages === 1 && /VLT004040265/.test(s.text), s);

  // Excel export: kept in Documents and handed to the share menu.
  s = await page.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN001830763", type: "FMCG", fsdu: false }]; save(); render();
    document.getElementById("recv").value = "Jamie"; document.getElementById("expect").value = "2"; save();
    window.__fs = []; window.__share = [];
    document.getElementById("dl").click();
    for (let i = 0; i < 100 && !window.__share.length; i++) await new Promise(r => setTimeout(r, 100));
    return { fs: window.__fs, share: window.__share.map(x => ({ title: x.title, files: x.files })), msg: document.getElementById("msg").textContent };
  });
  const xl = s.fs.find(f => f.directory === "DOCUMENTS");
  check("Export to Excel keeps the file in Documents › LPN Pallet Log and opens the share menu with it",
    !!xl && /^LPN Pallet Log\/.+\.xlsx$/.test(xl.path) && xl.size > 4000 && xl.head.startsWith("UEsD") && s.share.length === 1 && /\.xlsx$/.test(s.share[0].files[0]) && /Saved .+\.xlsx in Documents/.test(s.msg), s);
  // Sharing a file (Email PDF and others) goes to Android's share menu.
  s = await page.evaluate(async () => { window.__share = []; const f = new File(["hi"], "test.pdf", { type: "application/pdf" }); const ok = navigator.canShare({ files: [f] }); await navigator.share({ files: [f], title: "t", text: "x" }); return { ok, share: window.__share }; });
  check("sharing a file uses Android's share menu", s.ok && s.share.length === 1 && /share\/test\.pdf$/.test(s.share[0].files[0]) && s.share[0].text === "x", s);
  s = await page.evaluate(async () => { window.Capacitor.Plugins.Share.share = async () => { throw new Error("Share canceled"); }; try { await navigator.share({ text: "x" }); return "no error"; } catch (e) { return e.name; } });
  check("closing the share menu counts as cancelled, not as an error", s === "AbortError", s);

  // Photo reading with only the files inside the app.
  const photos = load(OCR).filter(p => p.want && p.want.length);
  let right = 0, total = 0, extra = 0, bad = [];
  for (const ph of photos) { const r = await readJs(page, ph.file, ""); if (r.err) { bad.push(ph.name + ": " + r.err); continue; } const sc = score(ph.want, r.found); right += sc.right.length; total += ph.want.length; extra += sc.extra.length; }
  check("photo reading works offline: " + right + " of " + total + " LPNs right on the manifest photos" + (extra ? ", " + extra + " extra" : ""), !bad.length && total > 0 && right === total && !extra, bad);

  check("nothing tried to reach the internet", outside.length === 0, outside.slice(0, 10));
  check("no script errors", errors.length === 0, errors.slice(0, 5));
  await b.close(); srv.close();
  console.log((GH ? (failed ? "::error title=Offline app checks::" : "::notice title=Offline app checks::") : "\n") + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log((GH ? "::error title=Offline app checks::" : "") + (e.stack || e.message)); process.exit(1); });
