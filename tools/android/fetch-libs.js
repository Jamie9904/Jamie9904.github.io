/*
  Offline Android app, step 1: downloads every library file the app loads from the internet, so the APK can carry them.
  Run on GitHub (needs internet): node tools/android/fetch-libs.js
  Writes tools/android/lib/<host>/<path> and tools/android/lib/tess.json (where the photo reader's files went).

  - Script libraries: every cdnjs / jsDelivr / unpkg address in the app's files, checked against the fingerprints in core.js.
  - Photo reader (tesseract.js): its worker, engine and English language data are found by starting the real reader
    in a browser exactly as the website does, so the APK reads photos with the same files as the site.
*/
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..", "..");
const LIB = path.join(__dirname, "lib");
const GH = !!process.env.GITHUB_ACTIONS;
const HOSTS = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|tessdata\.projectnaptha\.com)\//;
const APP = ["index.html", "core.js", "qr.js", "scan.js", "export.js", "compare.js", "panels.js"];
const fail = m => { console.log((GH ? "::error title=Offline libraries::" : "FAIL ") + m); process.exit(1); };
const local = u => { const m = HOSTS.exec(u); return path.join(LIB, m[1], decodeURIComponent(u.slice(m[0].length).split(/[?#]/)[0])); };
const save = (u, buf) => { const f = local(u); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); return f; };
async function get(u) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u); if (r.ok) return Buffer.from(await r.arrayBuffer()); if (r.status === 404) throw new Error("HTTP 404"); } catch (e) { if (i === 2 || /404/.test(e.message)) throw e; } await new Promise(r => setTimeout(r, 2000)); } throw new Error("download failed"); }

(async () => {
  fs.rmSync(LIB, { recursive: true, force: true });
  const urls = new Set();
  for (const f of APP) for (const m of fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(/https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\/[^"'\s)<>]+/g)) urls.add(m[0]);
  const sri = Object.fromEntries([...fs.readFileSync(path.join(ROOT, "core.js"), "utf8").matchAll(/^  "(https:[^"]+)":"(sha384-[A-Za-z0-9+\/=]+)"/gm)].map(m => [m[1], m[2]]));
  if (urls.size < 10) fail("found only " + urls.size + " library addresses in the app's files");
  for (const u of urls) {
    const buf = await get(u).catch(e => fail(u + ": " + e.message));
    if (sri[u]) { const got = "sha384-" + crypto.createHash("sha384").update(buf).digest("base64"); if (got !== sri[u]) fail(u + " doesn't match its fingerprint in core.js"); }
    save(u, buf); console.log("ok    " + u + (sri[u] ? "  (fingerprint matches)" : ""));
  }

  // The photo reader fetches more files once it starts: catch them by starting it in a browser, as the site does.
  const { chromium } = require("playwright");
  const server = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html")); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { "Content-Type": /\.html$/.test(p) ? "text/html" : /\.m?js$/.test(p) ? "text/javascript" : /\.css$/.test(p) ? "text/css" : "application/octet-stream" }); fs.createReadStream(p).pipe(s); }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const seen = new Map();
  const note = r => { const u = r.url(); if (/tesseract|tessdata/.test(u) && HOSTS.test(u)) seen.set(u, r); };
  ctx.on("response", note); ctx.on("serviceworker", () => {});
  const page = await ctx.newPage();
  page.on("worker", w => w.on && w.on("response", note));
  await page.goto("http://127.0.0.1:" + port + "/index.html"); await page.waitForTimeout(500);
  await page.evaluate(async () => { await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", () => window.Tesseract); const w = await Tesseract.createWorker("eng"); await w.terminate(); });
  await page.waitForTimeout(500);
  const tess = {};
  for (const [u, r] of seen) {
    if (/tesseract\.min\.js$/.test(u)) continue;
    const buf = await r.body().catch(() => null) || await get(u);
    save(u, buf); console.log("ok    " + u + "  (photo reader)");
    if (/worker(\.min)?\.js$/.test(u)) tess.workerPath = u;
    else if (/tesseract-core[^/]*\.js$/.test(u)) {
      tess.corePath = u.replace(/[^/]+$/, "");
      // The phone may use the other engine build (with or without SIMD), so bring both.
      const name = u.split("/").pop(), other = /-simd/.test(name) ? name.replace("-simd", "") : name.replace("tesseract-core", "tesseract-core-simd");
      save(tess.corePath + other, await get(tess.corePath + other)); console.log("ok    " + tess.corePath + other + "  (photo reader, other engine build)");
    } else if (/traineddata/.test(u)) tess.langPath = u.replace(/[^/]+$/, "");
  }
  await browser.close(); server.close();
  for (const k of ["workerPath", "corePath", "langPath"]) if (!tess[k]) fail("didn't see the photo reader's " + k + " being downloaded (saw: " + [...seen.keys()].join(", ") + ")");
  const rel = u => "lib/" + u.replace("https://", "");
  fs.writeFileSync(path.join(LIB, "tess.json"), JSON.stringify({ workerPath: rel(tess.workerPath), corePath: rel(tess.corePath), langPath: rel(tess.langPath) }, null, 2));
  let size = 0; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : size += fs.statSync(path.join(d, e.name)).size); walk(LIB);
  console.log((GH ? "::notice title=Offline libraries::" : "\n") + (urls.size + seen.size - 1) + " library files saved for the offline app (" + (size / 1048576).toFixed(1) + " MB)");
})().catch(e => fail(e.stack || e.message));
