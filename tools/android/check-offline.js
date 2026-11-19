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
  const b = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }), ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
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
      Share: { share: async o => { window.__share.push(o); } },
      // The app's own Android helpers (tools/android/native) and Capacitor's App plugin.
      LpnNative: { calls: [], pending: null, listeners: {},
        decodeBarcodes: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["decode", o.data.slice(0, 4), o.data.length]); return { barcodes: window.__codes || [] }; },
        keepAwake: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["awake", o.on]); },
        printPdf: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["print", o.name, o.data.slice(0, 5)]); },
        setVolumeScan: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["vol", o.on]); },
        cameraAllowed: async () => ({ allowed: window.__camAllowed !== false }),
        openFile: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["open", o.name]); },
        takePending: async () => { const N = window.Capacitor.Plugins.LpnNative, r = N.pending || {}; N.pending = null; return r; },
        addListener: (ev, fn) => { window.Capacitor.Plugins.LpnNative.listeners[ev] = fn; return { remove() {} }; } },
      App: { exited: 0, back: null, addListener: (ev, fn) => { if (ev === "backButton") window.Capacitor.Plugins.App.back = fn; return { remove() {} }; },
        getInfo: async () => ({ version: "Build 66 (Android 9)", build: "9" }), exitApp: () => { window.Capacitor.Plugins.App.exited++; } } } };
    window.__fsData = {};
    window.Capacitor.Plugins.Filesystem.readdir = async o => ({ files: window.__dir || [] });
    window.Capacitor.Plugins.Filesystem.readFile = async o => ({ data: "JVBERi0xLjM=" });
    const w = window.Capacitor.Plugins.Filesystem.writeFile; window.Capacitor.Plugins.Filesystem.writeFile = async o => { window.__fsData[o.path] = o.data; return w(o); };
  });
  await page.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await page.waitForTimeout(800);
  console.log("Offline Android app");

  let s = await page.evaluate(() => ({ apk: window.LPN_APK === true, report: (() => { const e = document.getElementById("btnReport"); return !!e && !e.hidden && e.getClientRects().length > 0; })(),
    sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), feats: { report: feat("report"), shareApp: feat("shareApp") } }));
  check("opens with no internet, as the Android copy", s.apk && !s.sw, s);
  check("Report a problem and Share this app are switched off", !s.report && s.feats.report === false && s.feats.shareApp === false, s);
  s = await page.evaluate(src => { const w = {}; new Function("window", src)(w); const want = w.LPN_CONFIG.features; return Object.keys(want).filter(k => feat(k) !== want[k]); }, fs.readFileSync(path.join(__dirname, "config.js"), "utf8"));
  check("uses the Android app's own settings (tools/android/config.js), not the website's", s.length === 0, s);
  s = await page.evaluate(() => { openHelp("settings", "Settings"); const t = document.getElementById("panelBody").textContent; closeHelp(); openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody").textContent; closeHelp(); return { share: /Share this app/.test(t) || !!document.getElementById("shareUrl"), report: /Report a problem/.test(t + g) }; });
  check("Settings and the Guide don't offer Share this app or Report a problem", !s.share && !s.report, s);
  s = await page.evaluate(() => { openHelp("settings", "Settings"); const t = document.getElementById("panelBody").textContent; closeHelp(); openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody").textContent, heads = [...document.querySelectorAll("#panelBody h3")].map(h => h.textContent); closeHelp();
    return { set: /Show the install pop-up|home screen/.test(t), guide: heads.some(h => /Install/.test(h)) || /Install app|Add to Home Screen|public code servers/.test(g), nums: heads.filter(h => /^\d+\. /.test(h)).map(h => parseInt(h)), tools: /inside this app, so nothing is downloaded/.test(g), pop: !document.getElementById("instBox").hidden }; });
  check("nothing about installing (Guide, Settings or the first-visit pop-up), and the Guide says the tools are inside the app", !s.set && !s.guide && !s.pop && s.tools && s.nums.every((n, i) => n === i + 1), s);

  s = await page.evaluate(async () => { const before = { logo: logo, shown: !document.getElementById("logoImg").hidden, btn: document.getElementById("logoBtn").textContent };
    const c = document.createElement("canvas"); c.width = 40; c.height = 20; const x = c.getContext("2d"); x.fillStyle = "#c00"; x.fillRect(0, 0, 40, 20);
    const blob = await new Promise(r => c.toBlob(r, "image/png")); const inp = document.getElementById("logoFile"); const dt = new DataTransfer(); dt.items.add(new File([blob], "mine.png", { type: "image/png" })); inp.files = dt.files; inp.dispatchEvent(new Event("change"));
    for (let i = 0; i < 50 && !logo; i++) await new Promise(r => setTimeout(r, 100));
    const after = { logo: !!logo, shown: !document.getElementById("logoImg").hidden, rm: document.getElementById("logoRm").textContent, kept: !!localStorage.getItem("lpnlogo") };
    document.getElementById("logoRm").click(); return { before, after, gone: !logo }; });
  check("no default logo, and a logo of your own can still be added and removed", s.before.logo === "" && !s.before.shown && s.before.btn === "Add logo" && s.after.logo && s.after.shown && s.after.rm === "Remove logo" && s.after.kept && s.gone, s);
  s = await page.evaluate(async () => { const out = {};
    for (const [k, f] of Object.entries({ excel: () => loadExcel(), pdf: () => loadJsPdf(), pdflib: () => loadPdfLib(), pdfread: () => loadPdfJs(),
      barcode: () => loadScript("./lib/cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js", () => window.ZXing) }))
      try { await f(); out[k] = true; } catch (e) { out[k] = String(e.message || e); }
    return out; });
  check("the Excel, PDF, PDF reading and barcode libraries load from inside the app", Object.values(s).every(v => v === true), s);
  s = await page.evaluate(async () => { if (!window.jspdf || !window.pdfjsLib) return { pages: 0, text: "libraries not loaded" }; const d = new window.jspdf.jsPDF(); d.text("LPN VLT004040265", 20, 20); const buf = d.output("arraybuffer");
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; const pg = await doc.getPage(1); const tc = await pg.getTextContent(); return { pages: doc.numPages, text: tc.items.map(i => i.str).join(" ") }; });
  check("a PDF is read with the reader inside the app", s.pages === 1 && /VLT004040265/.test(s.text), s);

  s = await page.evaluate(async () => { return await appVersion(); });
  check("exports say they were made with the Android app, with the build number", /^LPN Pallet Log v\d+\.\d+ \(build \d+, Android app\)$/.test(s), s);
  // Excel export: kept in Documents, then a bar with Open and Share (the share menu only when asked).
  s = await page.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN001830763", type: "FMCG", fsdu: false }]; save(); render();
    document.getElementById("recv").value = "Jamie"; document.getElementById("expect").value = "2"; save();
    window.__fs = []; window.__share = []; const N = window.Capacitor.Plugins.LpnNative; N.calls = [];
    document.getElementById("dl").click();
    for (let i = 0; i < 100 && !document.getElementById("apkSaved"); i++) await new Promise(r => setTimeout(r, 100));
    const bar = document.getElementById("apkSaved"), out = { fs: window.__fs, msg: document.getElementById("msg").textContent, bar: bar && bar.querySelector("p").textContent, btns: bar ? [...bar.querySelectorAll("button")].map(b => b.textContent).join() : "", sharedBefore: window.__share.length };
    bar.querySelector("button:nth-child(2)").click(); for (let i = 0; i < 30 && !window.__share.length; i++) await new Promise(r => setTimeout(r, 100));
    out.share = window.__share.map(x => x.files); out.gone = !document.getElementById("apkSaved");
    document.getElementById("dl").click(); for (let i = 0; i < 100 && !document.getElementById("apkSaved"); i++) await new Promise(r => setTimeout(r, 100));
    document.querySelector("#apkSaved button").click(); await new Promise(r => setTimeout(r, 100)); out.open = N.calls.filter(c => c[0] === "open");
    return out;
  });
  const xl = s.fs.find(f => f.directory === "DOCUMENTS");
  check("Export to Excel keeps the file in Documents › LPN Pallet Log and shows Saved with Open and Share",
    !!xl && /^LPN Pallet Log\/.+\.xlsx$/.test(xl.path) && xl.size > 4000 && xl.head.startsWith("UEsD") && /Saved .+\.xlsx in Documents/.test(s.msg) && /^Saved LPN-log-.+\.xlsx in Documents › LPN Pallet Log\.$/.test(s.bar || "") && s.btns === "Open,Share,✕" && s.sharedBefore === 0, s);
  check("Share on that bar opens the share menu with the file, and Open opens it in another app", s.share.length === 1 && /\.xlsx$/.test(s.share[0][0]) && s.gone && s.open.length === 1 && /^LPN-log-.+\.xlsx$/.test(s.open[0][1]), s);
  // Sharing a file (Email PDF and others) goes to Android's share menu.
  s = await page.evaluate(async () => { window.__share = []; const f = new File(["hi"], "test.pdf", { type: "application/pdf" }); const ok = navigator.canShare({ files: [f] }); await navigator.share({ files: [f], title: "t", text: "x" }); return { ok, share: window.__share }; });
  check("sharing a file uses Android's share menu", s.ok && s.share.length === 1 && /share\/test\.pdf$/.test(s.share[0].files[0]) && s.share[0].text === "x", s);
  s = await page.evaluate(async () => { window.Capacitor.Plugins.Share.share = async () => { throw new Error("Share canceled"); }; try { await navigator.share({ text: "x" }); return "no error"; } catch (e) { return e.name; } });
  check("closing the share menu counts as cancelled, not as an error", s === "AbortError", s);

  await page.evaluate(() => { window.Capacitor.Plugins.Share.share = async o => { window.__share.push(o); }; });
  // Barcodes go to ML Kit (stood in for here) through the page's own BarcodeDetector path.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; N.calls = []; rows = []; save(); render();
    window.__codes = [{ rawValue: "VLT004040277", format: "256" }];
    const c = document.createElement("canvas"); c.width = 800; c.height = 600; c.getContext("2d").fillRect(0, 0, 10, 10);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg")); await decodePhoto(new File([blob], "label.jpg", { type: "image/jpeg" }), false);
    window.__codes = []; return { mlkit: window.LPN_APK_MLKIT === true, calls: N.calls, rows: rows.map(r => r.lpn) }; });
  check("barcodes are read by ML Kit: a photo's barcode is decoded natively and the pallet added", s.mlkit && s.calls.length === 1 && s.calls[0][0] === "decode" && s.calls[0][1] === "/9j/" && s.rows.join() === "VLT004040277", s);
  // A label with several barcodes: the LPN is used, not the shipping code read first.
  s = await page.evaluate(async () => { rows = []; save(); render(); window.__codes = [{ rawValue: "00350123450000000017", format: "1" }, { rawValue: "VLT004040288", format: "1" }];
    const c = document.createElement("canvas"); c.width = 600; c.height = 400; const blob = await new Promise(r => c.toBlob(r, "image/jpeg"));
    await decodePhoto(new File([blob], "label.jpg", { type: "image/jpeg" }), false); window.__codes = []; return rows.map(r => r.lpn).join(); });
  check("on a label with several barcodes the LPN is the one used", s === "VLT004040288", s);
  // The phone's text size.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, out = {}; cfg.size = "1"; saveCfg(); applyCfg();
    localStorage.removeItem("lpnapkfont"); N.fontScale = async () => ({ scale: 1 }); await LPN_APK_FONT(); out.normal = cfg.size;
    N.fontScale = async () => ({ scale: 1.3 }); await LPN_APK_FONT(); out.big = cfg.size; out.css = getComputedStyle(document.documentElement).getPropertyValue("--ts").trim();
    cfg.size = "1.12"; saveCfg(); await LPN_APK_FONT(); out.kept = cfg.size;
    N.fontScale = async () => ({ scale: 1 }); await LPN_APK_FONT(); out.back = cfg.size; return out; });
  check("text size follows the phone's when that changes, and a choice made in Settings stays until it changes again", s.normal === "1" && s.big === "1.25" && s.css === "1.25" && s.kept === "1.12" && s.back === "1", s);
  // Keep the screen on, natively.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; await keepAwake(false); N.calls = []; await keepAwake(true); await keepAwake(false); return N.calls; });
  check("keeping the screen on uses the app's own switch (on, then off)", JSON.stringify(s) === '[["awake",true],["awake",false]]', s);
  // Print: Android's print screen, with the PDF.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; N.calls = []; window.__share = []; rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; document.getElementById("expect").value = ""; save(); render();
    document.getElementById("prn").click(); for (let i = 0; i < 100 && !N.calls.length; i++) await new Promise(r => setTimeout(r, 100)); return { calls: N.calls, shared: window.__share.length, msg: document.getElementById("dlmsg").textContent }; });
  check("Print opens Android's print screen with the PDF (not the share menu)", s.calls.length === 1 && s.calls[0][0] === "print" && /^LPN-log-/.test(s.calls[0][1]) && !/\.pdf$/.test(s.calls[0][1]) && s.calls[0][2] === "JVBER" && s.shared === 0, s);
  // Files opened or shared into the app.
  const open = r => page.evaluate(async r => { const N = window.Capacitor.Plugins.LpnNative; N.pending = r; await N.listeners.opened(); await new Promise(x => setTimeout(x, 300)); }, r);
  const pdfB64 = await page.evaluate(() => { const d = new window.jspdf.jsPDF(); d.text("VLT004040265", 20, 20); d.text("RUN001830763", 20, 30); return btoa(d.output()); });
  await open({ file: { name: "manifest.pdf", mime: "application/pdf", data: pdfB64 } });
  s = await page.evaluate(() => { const a = document.querySelector(".apkask"); return { q: a && a.textContent, btns: a ? [...a.querySelectorAll("button")].map(b => b.textContent) : [] }; });
  check("a PDF opened into the app asks whether it's the manifest or the log", /Open manifest\.pdf in the Manifest check as:/.test(s.q || "") && s.btns.join() === "The manifest,The log,Cancel", s);
  s = await page.evaluate(async () => { document.querySelector(".apkask button").click(); for (let i = 0; i < 100 && !/RUN001830763/.test(document.getElementById("cmpNums").value); i++) await new Promise(r => setTimeout(r, 100));
    return { nums: document.getElementById("cmpNums").value, open: !document.getElementById("cmpBody").hidden }; });
  check("choosing The manifest reads it into the Manifest check", s.open && /VLT004040265/.test(s.nums) && /RUN001830763/.test(s.nums), s);
  await open({ file: { name: "log.csv", mime: "text/csv", data: Buffer.from("LPN\nVLT004040299\nRUN001830700\n").toString("base64") } });
  s = await page.evaluate(async () => { for (let i = 0; i < 50 && !/VLT004040299/.test(document.getElementById("cmpLogNums").value); i++) await new Promise(r => setTimeout(r, 100)); return document.getElementById("cmpLogNums").value; });
  check("a spreadsheet or CSV opened into the app becomes the log in the Manifest check", /VLT004040299/.test(s) && /RUN001830700/.test(s), s);
  s = await page.evaluate(async () => { window.__fsData = {}; openHelp("settings", "Settings"); document.getElementById("bkDl").click(); for (let i = 0; i < 50 && !Object.keys(window.__fsData).some(k => /\.json$/.test(k)); i++) await new Promise(r => setTimeout(r, 100)); closeHelp();
    const k = Object.keys(window.__fsData).find(k => /^LPN Pallet Log\/.+\.json$/.test(k)); return { k, data: k && window.__fsData[k] }; });
  await open({ file: { name: s.k ? s.k.split("/").pop() : "backup.json", mime: "application/json", data: s.data || "" } });
  s = await page.evaluate(async () => { for (let i = 0; i < 50 && document.getElementById("bkAsk") && document.getElementById("bkAsk").hidden; i++) await new Promise(r => setTimeout(r, 100));
    const out = { title: document.getElementById("panelTitle").textContent, ask: !!document.getElementById("bkAsk") && !document.getElementById("bkAsk").hidden }; closeHelp(); return out; });
  check("a backup file opened into the app goes to Restore backup in Settings, which asks before replacing anything", s.title === "Settings" && s.ask, s);
  await open({ error: "The file is too large to open (over 40 MB)." });
  s = await page.evaluate(() => { const t = document.getElementById("apkToast"); return t && !t.hidden && t.textContent; });
  check("a file that can't be opened says why", s === "The file is too large to open (over 40 MB).", s);
  // Text shared into the app: the LPNs in it, as manifest numbers or pallets.
  await page.evaluate(() => { rows = []; save(); render(); document.getElementById("cmpNums").value = "VLT004040265"; });
  await open({ text: "Hi, the manifest for today: VLT004040265, run 001830763 and QUB-001899210. PO 4500123456." });
  s = await page.evaluate(() => { const a = document.querySelector(".apkask"); return { q: a && a.querySelector(".apkasktitle").textContent, btns: a ? [...a.querySelectorAll("button")].map(b => b.textContent).join() : "" }; });
  check("text shared into the app finds the LPNs in it and asks how to use them", s.q === "Found 3 LPNs in the shared text. Use them as:" && s.btns === "Manifest numbers,Pallets in the log,Cancel", s);
  s = await page.evaluate(async () => { document.querySelector(".apkask button").click(); await new Promise(r => setTimeout(r, 100)); return document.getElementById("cmpNums").value; });
  check("as manifest numbers they're added to the Manifest check, without repeats", s === "VLT004040265\nRUN001830763\nQUB001899210", s);
  await open({ text: "RUN001830763 and VLT004040266" });
  s = await page.evaluate(async () => { [...document.querySelectorAll(".apkask button")].find(b => b.textContent === "Pallets in the log").click(); await new Promise(r => setTimeout(r, 200)); return rows.map(r => r.lpn).join(); });
  check("as pallets they're added to the log, like pasting a list", s === "RUN001830763,VLT004040266", s);
  await open({ text: "Thanks, see you tomorrow" });
  s = await page.evaluate(() => document.getElementById("apkToast").textContent);
  check("text with no LPNs says so", s === "No LPNs found in the shared text.", s);
  // Home-screen shortcuts.
  await page.evaluate(() => { document.getElementById("cmpToggle").click(); }); // fold the Manifest check again
  await open({ action: "manifest" });
  s = await page.evaluate(() => !document.getElementById("cmpBody").hidden);
  check("the Manifest check shortcut opens the Manifest check", s === true, s);
  await open({ action: "scan" });
  s = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 500)); const out = !document.getElementById("scanbox").hidden; stopScan(); return out; });
  check("the Scan shortcut starts Live scan", s === true, s);
  // Back button.
  s = await page.evaluate(async () => { const App = window.Capacitor.Plugins.App; App.exited = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
    openHelp("guide", "How to use this app"); await wait(100); App.back({ canGoBack: history.length > 1 && !document.getElementById("panel").hidden }); await wait(300);
    const closed = document.getElementById("panel").hidden;
    App.back({ canGoBack: false }); const t1 = document.getElementById("apkToast").textContent, e1 = App.exited;
    App.back({ canGoBack: false }); return { closed, t1, e1, e2: App.exited }; });
  check("Back closes an open panel; on the main screen it asks first, and a second Back closes the app", s.closed && s.t1 === "Press Back again to close the app." && s.e1 === 0 && s.e2 === 1, s);
  // Which build this is.
  s = await page.evaluate(async () => { openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 100)); const v = document.getElementById("apkVer"); const out = { set: v && v.textContent, foot: (document.getElementById("apkFoot") || {}).textContent }; closeHelp(); return out; });
  check("Settings and the footer say which Android build this is", s.set === "Android app: Build 66 (Android 9)" && s.foot === " · Android app: Build 66 (Android 9)", s);

  // What's new after an Android update: not on a first install, once after an update.
  s = await page.evaluate(() => { const card = () => document.getElementById("apkNew"); localStorage.removeItem("lpnapkseen");
    LPN_APK_WHATSNEW("9"); const first = { card: !!card(), seen: localStorage.getItem("lpnapkseen") };
    localStorage.setItem("lpnapkseen", "5"); LPN_APK_WHATSNEW("9"); const upd = { card: !!card(), items: card() ? card().querySelectorAll("li").length : 0, title: card() ? card().textContent.slice(0, 40) : "" };
    card().querySelector("button").click(); const after = { card: !!card(), seen: localStorage.getItem("lpnapkseen") }; LPN_APK_WHATSNEW("9"); after.again = !!card(); return { first, upd, after }; });
  check("What's new shows once after an Android update (not on a first install)", !s.first.card && s.first.seen === "9" && s.upd.card && s.upd.items > 0 && /What’s new in this Android update/.test(s.upd.title) && !s.after.card && s.after.seen === "9" && !s.after.again, s);
  // Settings › Android app, with the volume button switch.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; N.calls = []; openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 50));
    const first = document.getElementById("panelBody").firstElementChild, v = document.getElementById("apkVol"), on = v && v.checked; v.click(); await new Promise(r => setTimeout(r, 50));
    const off = { stored: localStorage.getItem("lpnapkvol"), calls: N.calls.slice() }; v.click(); await new Promise(r => setTimeout(r, 50)); const back = localStorage.getItem("lpnapkvol"); closeHelp();
    return { first: first && first.id, head: first && first.querySelector("h3").textContent, on, off, back, files: !!document.getElementById("apkFilesBtn") }; });
  check("Settings starts with an Android app section, where the volume button can be switched off and on", s.first === "apkSet" && s.head === "Android app" && s.on === true && s.off.stored === "off" && JSON.stringify(s.off.calls) === '[["vol",false]]' && s.back === "on", s);
  // Volume-down starts and stops Live scan; not while a panel is open.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); localStorage.setItem("lpnapkcam", "1");
    N.listeners.volumeDown(); for (let i = 0; i < 30 && !scanning; i++) await wait(100); const started = scanning && !document.getElementById("scanbox").hidden;
    N.listeners.volumeDown(); await wait(200); const stopped = !scanning && document.getElementById("scanbox").hidden;
    openHelp("guide", "How to use this app"); N.listeners.volumeDown(); await wait(300); const inPanel = scanning; closeHelp(); if (scanning) stopScan(); return { started, stopped, inPanel }; });
  check("volume-down starts Live scan and stops it again, but does nothing while a panel is open", s.started && s.stopped && !s.inPanel, s);
  // Exported files.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); if (scanning) stopScan(); N.calls = []; window.__share = [];
    window.__dir = [{ name: "LPN-log-2026-11-18.xlsx", type: "file", size: 9000, mtime: 1763460000000, uri: "file:///docs/a.xlsx" }, { name: "LPN-log-2026-11-19.pdf", type: "file", size: 52000, mtime: 1763550000000, uri: "file:///docs/b.pdf" }, { name: "sub", type: "directory" }];
    document.getElementById("apkFilesBtn").click(); await wait(200);
    const items = [...document.querySelectorAll(".apkfiles li")].map(li => ({ name: li.querySelector(".apkfname").textContent, btns: [...li.querySelectorAll("button")].map(b => b.textContent).join() }));
    const first = document.querySelectorAll(".apkfiles li")[0], btn = t => [...first.querySelectorAll("button")].find(b => b.textContent === t);
    btn("Print").click(); await wait(100); btn("Share").click(); await wait(100); btn("Open").click(); await wait(100);
    const out = { title: document.getElementById("panelTitle").textContent, items, calls: N.calls.filter(c => c[0] !== "decode"), share: window.__share.map(x => x.files) };
    window.__dir = []; closeHelp(); return out; });
  check("Exported files lists the saved files newest first, to open, share or print (PDFs) again", s.title === "Exported files" && s.items.length === 2 && s.items[0].name === "LPN-log-2026-11-19.pdf" && s.items[0].btns === "Open,Share,Print" && s.items[1].btns === "Open,Share"
    && JSON.stringify(s.calls) === '[["print","LPN-log-2026-11-19","JVBER"],["open","LPN-log-2026-11-19.pdf"]]' && JSON.stringify(s.share) === '[["file:///docs/b.pdf"]]', s);
  // The camera: explained once, before Android asks.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), App = window.Capacitor.Plugins.App; localStorage.removeItem("lpnapkcam"); window.__camAllowed = false;
    const inp = document.getElementById("file"), real = inp.click; let picked = 0; inp.click = () => { picked++; };
    document.getElementById("photo").click(); await wait(100);
    const a = document.querySelector(".apkask"), q = { text: a && a.textContent, btns: a ? [...a.querySelectorAll("button")].map(b => b.textContent).join() : "", picked };
    App.back({ canGoBack: false }); q.afterBack = !!document.querySelector(".apkask");
    document.querySelector(".apkask button").click(); await wait(100); q.pickedAfter = picked; q.kept = localStorage.getItem("lpnapkcam");
    document.getElementById("photo").click(); await wait(100); q.again = !!document.querySelector(".apkask"); q.pickedAgain = picked;
    inp.click = real; window.__camAllowed = true; return q; });
  check("before Android first asks for the camera, the app says what it's for (once, Continue only)", /uses the camera to scan pallet barcodes/.test(s.text || "") && s.btns === "Continue" && s.picked === 0 && s.afterBack && s.pickedAfter === 1 && s.kept === "1" && !s.again && s.pickedAgain === 2, s);
  s = await page.evaluate(async () => (await (await fetch("scan.js")).text()).includes("Allow the camera for LPN Pallet Log in your phone’s Settings › Apps"));
  check("if the camera is refused, the message says where Android keeps the setting", s === true, s);

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
