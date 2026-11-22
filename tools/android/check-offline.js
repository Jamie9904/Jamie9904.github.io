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
    try { localStorage.setItem("lpninstallshown", "1"); localStorage.setItem("lpnmigtest", "from before"); localStorage.setItem("lpnapkintro", "seen"); } catch (e) {}
    // The app's own storage (native/LpnStore.java), standing in for the phone's.
    window.__realLS = window.localStorage; const m = new Map(); let mig = false;
    window.LpnStore = { get: k => m.has(k) ? m.get(k) : null, set: (k, v) => { m.set(k, v); return true; }, remove: k => { m.delete(k); }, clear: () => m.clear(),
      keys: () => JSON.stringify([...m.keys()]), size: () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0), migrated: () => mig, markMigrated: () => { mig = true; }, _map: m };
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
        allowExit: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["exit", o.ms]); },
        saveAs: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["saveAs", o.name, o.mime, o.data.slice(0, 5)]); return { saved: true }; },
        setDelivery: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["delivery", o.label]); },
        startScanner: async () => { window.Capacitor.Plugins.LpnNative.calls.push(["scanner"]); },
        scanStatus: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["status", o.text, !!o.close, o.flash]); },
        setBars: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["bars", o.colour, o.light]); },
        tap: async () => { window.Capacitor.Plugins.LpnNative.calls.push(["tap"]); },
        speak: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["speak", o.text]); },
        battery: async () => window.__batt || { level: 80, charging: false },
        phoneColours: async () => ({ available: true, bg: "#1a1c1e", ac: "#9ecaff" }),
        scanners: async () => ({ names: [] }),
        notify: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["notify", o.title, o.text]); return { shown: true }; },
        askNotify: async () => { window.Capacitor.Plugins.LpnNative.calls.push(["askNotify"]); return { asked: true }; },
        startTextScan: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["textScan", (o || {}).target]); },
        textScanStatus: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["textStatus", o.text, o.flash, o.recent, o.canUndo, o.forget]); },
        ringer: async () => ({ silent: !!window.__silent }),
        setHandheld: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["hand", o.on]); },
        readText: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["readText", o.data.length > 100]); if (!window.__ocrStub) throw new Error("no reader here"); return window.__ocrStub(o); },
        pickFolder: async () => ({ picked: true, uri: "content://tree/drive", name: "Drive" }),
        saveToFolder: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["folder", o.uri, o.name, o.mime]); return { saved: true, folder: "Drive" }; },
        vibrate: async o => { window.Capacitor.Plugins.LpnNative.calls.push(["vib", o.pattern.join(",")]); },
        takePending: async () => { const N = window.Capacitor.Plugins.LpnNative, r = N.pending || {}; N.pending = null; return r; },
        addListener: (ev, fn) => { window.Capacitor.Plugins.LpnNative.listeners[ev] = fn; return { remove() {} }; } },
      App: { exited: 0, back: null, addListener: (ev, fn) => { if (ev === "backButton") window.Capacitor.Plugins.App.back = fn; return { remove() {} }; },
        getInfo: async () => ({ version: "Android APK build 9", build: "60" }), exitApp: () => { window.Capacitor.Plugins.App.exited++; } } } };
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
  // The start menu: Log pallets and Manifest check are separate pages; ‹ Menu and Back go back to the menu.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), shown = () => ["apkMenu", "apkBar", "delCard", "entryCard", "logCard", "cmpCard"].filter(i => { const e = document.getElementById(i); return e && e.getClientRects().length > 0; }).join(",");
    const N = window.Capacitor.Plugins.LpnNative, out = { start: LPN_APK_MODE() + ":" + shown() };
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render(); LPN_APK_MODE("menu"); out.menuText = document.getElementById("apkGoLogT").textContent; out.carry = !document.getElementById("apkCarry").hidden;
    document.getElementById("apkGoLog").click(); await wait(50); out.log = LPN_APK_MODE() + ":" + shown(); out.entryUsable = !document.querySelector(".card.entry").inert;
    document.getElementById("apkBack").click(); await wait(50); document.getElementById("apkGoCmp").click(); await wait(50);
    out.cmp = LPN_APK_MODE() + ":" + shown() + ":" + !document.getElementById("cmpBody").hidden;
    document.getElementById("cmpToggle").click(); await wait(50); out.stays = !document.getElementById("cmpBody").hidden;
    N.listeners.back(); await wait(50); out.back = LPN_APK_MODE();
    document.getElementById("apkGoLog").click(); await wait(50); out.logAfterCmp = !document.body.classList.contains("cmpfocus") && document.getElementById("cmpBody").hidden;
    rows = []; save(); render(); return out; });
  check("the app opens on a menu (Log pallets or Manifest check) with nothing else on the page", s.start === "menu:apkMenu", s);
  check("the menu shows a delivery in progress, with Carry on scanning", s.menuText === "Delivery in progress: 1 pallet." && s.carry, s);
  check("Log pallets opens the log on its own page (no Manifest check), with ‹ Menu at the top", s.log === "log:apkBar,delCard,entryCard,logCard" && s.entryUsable && s.logAfterCmp, s);
  check("Manifest check opens on its own page, open, and its heading doesn't fold it away; Back goes to the menu", s.cmp === "cmp:apkBar,cmpCard:true" && s.stays && s.back === "menu", s);
  // A professional app's frame: the ⋮ menu, About with the licences, the first-install introduction.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), N = window.Capacitor.Plugins.LpnNative, out = {};
    out.side = getComputedStyle(document.getElementById("side")).display; const mb = document.getElementById("apkMoreBtn"); out.btn = !!mb && mb.getClientRects().length > 0;
    mb.click(); await wait(50); out.items = [...document.querySelectorAll("#apkMore button")].map(b => b.textContent).join(",");
    N.listeners.back(); await wait(30); out.backCloses = !document.getElementById("apkMore");
    mb.click(); await wait(30); [...document.querySelectorAll("#apkMore button")].find(b => b.textContent === "About").click(); await wait(100);
    out.about = document.getElementById("panelTitle").textContent + ":" + /Everything stays on this phone/.test(document.getElementById("panelBody").textContent) + ":" + document.querySelectorAll("#panelBody li").length; closeHelp();
    mb.click(); await wait(30); [...document.querySelectorAll("#apkMore button")].find(b => b.textContent === "Settings").click(); await wait(100); out.settings = document.getElementById("panelTitle").textContent; closeHelp();
    LPN_APK_INTRO(); await wait(50); const d = document.getElementById("apkIntro"); out.cards = d ? d.querySelectorAll(".cd").length : 0;
    const sc = d.querySelector(".cards"); sc.scrollLeft = sc.clientWidth * 2; sc.dispatchEvent(new Event("scroll")); await wait(80); out.last = document.getElementById("apkIntroNext").textContent;
    N.listeners.back(); await wait(30); out.introGone = !document.getElementById("apkIntro") && localStorage.getItem("lpnapkintro") === "seen";
    return out; });
  check("an app bar with a ⋮ menu (Guide, Changelog, Settings, Exported files, About) instead of the three buttons; Back closes it", s.side === "none" && s.btn && s.items === "Guide,Changelog,Settings,Exported files,About" && s.backCloses && s.settings === "Settings", s);
  check("About shows the version, that data stays on the phone, and the open-source parts with their licences", /^About:true:(9|1\d)$/.test(s.about), s);
  check("a first install gets a three-card introduction ending in Get started; Back (or Skip) closes it for good", s.cards === 3 && s.last === "Get started" && s.introGone, s);
  // Progress with Cancel while photos are read, and a notification when it finishes in the background.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), N = window.Capacitor.Plugins.LpnNative, out = {}; N.calls = []; LPN_APK_MODE("cmp");
    try { localStorage.removeItem("lpnapknotify"); } catch (e) {}
    const msg = document.getElementById("cmpMsg"); msg.textContent = "Reading photo 2 of 4…"; await wait(50);
    const p = document.getElementById("apkProg"); out.shown = p ? p.querySelector("span").textContent + ":" + p.querySelector(".bar i").style.width : "";
    out.asked = N.calls.filter(c => c[0] === "askNotify").length;
    document.getElementById("apkProgStop").click(); out.stopped = await readPhoto(new File([new Uint8Array(4)], "x.jpg", { type: "image/jpeg" })).then(() => "read", e => String(e.message));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    msg.textContent = "Read 1 of 4 photos and found 3 LPNs."; await wait(50); delete document.visibilityState;
    out.gone = !document.getElementById("apkProg"); out.note = N.calls.filter(c => c[0] === "notify").map(c => c[1]).join();
    out.after = await Promise.race([readPhoto(new File([new Uint8Array(4)], "x.jpg", { type: "image/jpeg" })).then(() => "read", e => String(e.message)), wait(400).then(() => "running")]);
    msg.textContent = ""; LPN_APK_MODE("log"); return out; });
  check("reading photos shows a progress bar (photo 2 of 4) with Cancel, which skips the photos not started yet", s.shown === "Reading photo 2 of 4:38%" && /Cancel/.test(s.stopped) && s.gone && !/Cancel/.test(s.after), s);
  check("a notification says when photo reading finishes in the background (Android asks once, when photos are first read)", s.note === "Photo reading stopped" && s.asked === 1, s);
  // Finishing touches: the Saved tick, the friendly error screen, messages at the bottom, Next in Delivery.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), out = {};
    LPN_APK_MODE("log"); document.querySelectorAll(".apkask").forEach(a => a.remove()); save(); out.tick = !!document.querySelector("#apkSavedTick.on");
    LPN_APK_OOPS("check"); await wait(30); const a = document.querySelector(".apkask"); out.oops = a ? a.querySelector(".apkasktitle").textContent + "|" + [...a.querySelectorAll("button")].map(b => b.textContent).join(",") : ""; if (a) a.remove();
    LPN_APK_MODE("menu"); document.getElementById("msg").textContent = "Copied VLT004040265."; await wait(50); out.toast = (document.getElementById("apkToast") || {}).textContent;
    LPN_APK_MODE("log"); document.getElementById("msg").textContent = ""; const r = document.getElementById("recv"); r.focus(); r.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    out.next = document.activeElement.id + ":" + r.getAttribute("enterkeyhint") + ":" + document.getElementById("notes").getAttribute("enterkeyhint") + ":" + r.getAttribute("autocapitalize");
    document.activeElement.blur(); LPN_APK_MODE("menu"); return out; });
  check("a ✓ Saved tick shows in the page's bar after each change", s.tick, s);
  check("if something goes wrong, a plain message says the log is safe, with Try again and Save problem report", s.oops === "Something went wrong. Your log is safe on this phone.|Try again,Save problem report,Cancel", s);
  check("a status message that can't be seen where it normally shows (here on the menu) also shows at the bottom", s.toast === "Copied VLT004040265.", s);
  check("in Delivery, Next on the keyboard goes to the next box, and names start with a capital", s.next === "expect:next:done:words", s);
  // Silent mode: scan sounds and the spoken count stay quiet, the buzz stays.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, out = {}; let osc = 0;
    const AC = window.AudioContext; window.AudioContext = function () { return { state: "running", currentTime: 0, resume() {}, destination: {}, createOscillator() { osc++; return { type: "", frequency: {}, connect() {}, start() {}, stop() {} }; }, createGain() { return { gain: {}, connect() {} }; } }; };
    const was = { sound: cfg.sound, vib: cfg.vibrate }; cfg.sound = true; cfg.vibrate = true; actx = null; localStorage.setItem("lpnapkspeak", "on");
    N.listeners.ringer({ silent: true }); N.calls = []; sfx("ok"); out.silent = osc + ":" + N.calls.filter(c => c[0] === "vib").length;
    N.listeners.ringer({ silent: false }); osc = 0; actx = null; sfx("ok"); out.loud = osc;
    N.listeners.ringer({ silent: true }); localStorage.setItem("lpnapkquiet", "off"); osc = 0; actx = null; sfx("ok"); out.optOut = osc;
    localStorage.removeItem("lpnapkquiet"); localStorage.removeItem("lpnapkspeak"); N.listeners.ringer({ silent: false });
    window.AudioContext = AC; actx = null; cfg.sound = was.sound; cfg.vibrate = was.vib; return out; });
  check("with the phone on silent, vibrate or Do Not Disturb a scan only buzzes (sound back when it isn't; Settings can turn this off)", s.silent === "0:1" && s.loud === 1 && s.optOut === 1, s);
  // Live read manifest: numbers after "LPN:" read by the camera go into the manifest numbers, tidied and checked.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, L = LPN_APK_LIVEREAD, box = document.getElementById("cmpNums"), pf = document.getElementById("cmpPfx"), out = {};
    const st = () => { const c = N.calls.filter(x => x[0] === "textStatus").pop(); return c ? c[1] + "|" + c[2] + "|" + c[4] + (c[5] ? "|forget " + c[5] : "") : ""; };
    LPN_APK_MODE("menu"); box.value = "QUB001899182"; pf.value = ""; const b = document.getElementById("apkLiveRead"); N.calls = [];
    out.btn = !!b && b.textContent; b.click(); await new Promise(r => setTimeout(r, 30)); out.started = N.calls.some(c => c[0] === "textScan" && c[1] === "manifest") && LPN_APK_MODE() === "cmp";
    out.vis = b.getClientRects().length > 0;
    N.listeners.textScan({ value: "VLT004040265" }); out.add = st();
    N.listeners.textScan({ value: "VLTOO4040273" }); out.fix = box.value.split("\n").pop();
    N.listeners.textScan({ value: "QUB001899182" }); out.dup = st();
    pf.value = "QUB, VLT"; N.listeners.textScan({ value: "RUN001832813" }); out.skip = st(); pf.value = "";
    N.listeners.textScan({ value: "PO12345678" }); out.notLpn = box.value.split("\n").length;
    N.listeners.textScanUndo(); out.undo = st() + "|" + box.value.replace(/\n/g, ",");
    N.listeners.textScanClosed(); out.closed = document.getElementById("cmpMsg").textContent;
    out.rule = JSON.stringify(LPN_APK_AFTERLABELS(["Item", "LPN:", "VLT004040265", "Qty", "LPN", "QUB00191", "1625", "LPN:", "PO", "1", "Ref", "VLT004040999", "LPN:RUN001832813"]));
    box.value = ""; LPN_APK_MODE("log"); return out; });
  check("Live read manifest (in the Manifest check) opens the camera's text reader on the Manifest check's page", s.btn === "Live read manifest" && s.started && s.vis, s);
  check("a number read after “LPN:” is added to the manifest numbers with a green flash, tidied like photos (O read for 0)", s.add === "Added VLT004040265. 2 in the manifest list.|ok|true" && s.fix === "VLT004040273", s);
  check("one already listed isn't added twice; one with a prefix not in the list is skipped (orange); a non-LPN is left out", /^QUB001899182 is already in the list\./.test(s.dup) && /^RUN001832813 skipped: its prefix isn't in your prefix list\..*\|warn\|true$/.test(s.skip) && s.notLpn === 3, s);
  check("Remove last takes the last one added back out (and lets it be read again); closing says how many were added", s.undo === "Removed VLT004040273. 2 in the manifest list.||true|forget VLT004040273|QUB001899182,VLT004040265" && /Live read added 1 LPN/.test(s.closed), s);
  check("only numbers straight after an “LPN” label are taken, with a number read with a gap joined", s.rule === '["VLT004040265","QUB001911625","RUN001832813"]', s.rule);
  // Live read log: a printed log's LPNs (no "LPN:" label) go into the log numbers.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, box = document.getElementById("cmpLogNums"), out = {};
    const st = () => { const c = N.calls.filter(x => x[0] === "textStatus").pop(); return c ? c[1] + "|" + c[2] : ""; };
    LPN_APK_MODE("menu"); box.value = ""; document.getElementById("cmpNums").value = ""; document.getElementById("cmpPfx").value = ""; N.calls = [];
    const k = document.getElementById("apkLiveLog"); out.btn = !!k && k.textContent + ":" + (k.previousElementSibling || {}).id; k.click(); await new Promise(r => setTimeout(r, 30));
    out.started = N.calls.some(c => c[0] === "textScan" && c[1] === "log") && LPN_APK_MODE() === "cmp";
    N.listeners.textScan({ value: "VLT004040265" }); out.add = st(); N.listeners.textScan({ value: "PO12345678" }); N.listeners.textScan({ value: "QUB001899182" });
    out.box = box.value.replace(/\n/g, ","); out.manifest = document.getElementById("cmpNums").value;
    N.listeners.textScanClosed(); out.closed = document.getElementById("cmpMsg").textContent;
    out.rule = JSON.stringify(LPN_APK_LPNWORDS(["1", "VLT004040265", "BB", "QUB00191", "1625", "PO", "12345678", "Tel", "01234567890", "No", "LPN", "1", "12/11/2026"]));
    box.value = ""; LPN_APK_MODE("log"); return out; });
  check("Live read log (in step 1, after Photo of printed log) reads a printed log's LPNs into the log numbers, not the manifest", s.btn === "Live read log:cmpLogPhotoBtn" && s.started && s.add === "Added VLT004040265. 1 in the log numbers.|ok" && s.box === "VLT004040265,QUB001899182" && s.manifest === "" && /2 LPNs to the log numbers/.test(s.closed), s);
  check("on a printed log any LPN-shaped number is taken (a number read with a gap joined), but not order, phone or date numbers", s.rule === '["VLT004040265","QUB001911625"]', s.rule);
  // Moving between the menu and the pages: a slide, each page keeps its place, TalkBack hears the page's name, and
  // focus goes back to the button you came from; the menu buttons give the light tap.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), N = window.Capacitor.Plugins.LpnNative, main = document.querySelector("main");
    LPN_APK_MODE("menu"); document.getElementById("apkGoLog").click(); await wait(50);
    const out = { focus: document.activeElement.id, slideIn: main.classList.contains("apkin") };
    window.scrollTo(0, 300); await wait(30); const y = window.scrollY; document.getElementById("apkBack").click(); await wait(50);
    out.menuFocus = document.activeElement.id; out.slideOut = main.classList.contains("apkout"); out.menuTop = window.scrollY === 0;
    document.getElementById("apkGoLog").click(); await wait(50); out.kept = y > 0 && Math.abs(window.scrollY - y) < 2;
    LPN_APK_MODE("menu"); N.calls = []; cfg.vibrate = true; document.getElementById("apkGoCmp").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); out.tap = N.calls.filter(c => c[0] === "tap").length;
    out.first = main.firstElementChild && main.firstElementChild.id; return out; });
  check("pages slide in and back out, TalkBack hears the page's name, focus goes back to the menu button, and each page keeps its place",
    s.focus === "apkBarT" && s.slideIn && s.menuFocus === "apkGoLog" && s.slideOut && s.menuTop && s.kept, s);
  check("the menu is the first thing on the page, and its buttons give the light tap", s.first === "apkMenu" && s.tap === 1, s);
  // The menu's recent deliveries and shortcuts, the page title bar, and the Manifest date shown the app's way.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), out = {};
    const keep = hist; hist = [{ id: "a", date: "2026-11-20", recv: "Sam", rows: [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "VLT004040273", type: "BB", fsdu: false }] }, { id: "b", date: "2026-11-19", recv: "", rows: [] }];
    LPN_APK_MODE("log"); LPN_APK_MODE("menu"); out.recent = [...document.querySelectorAll("#apkRecL .apkrec")].map(b => b.textContent).join("|");
    document.querySelector("#apkRecL .apkrec").click(); await wait(100); out.hist = !document.getElementById("panel").hidden && document.getElementById("panelTitle").textContent; closeHelp();
    out.files = !!document.getElementById("apkGoFiles"); hist = keep;
    document.getElementById("apkGoCmp").click(); await wait(80); const bar = document.getElementById("apkBar");
    out.title = document.getElementById("apkBarT").textContent + ":" + getComputedStyle(bar).position;
    const hb = document.getElementById("apkBarHelp"); out.help = !hb.hidden; hb.click(); await wait(100); out.helpOpen = !document.getElementById("panel").hidden; closeHelp();
    const d = document.getElementById("cmpDate"); d.value = "2026-11-05"; out.date = document.getElementById("cmpDateShow").textContent + ":" + (d.closest(".dwrap") ? "wrapped" : "");
    LPN_APK_MODE("log"); out.logTitle = document.getElementById("apkBarT").textContent; await wait(50); out.thTop = getComputedStyle(document.querySelector("#logCard th")).top !== "0px";
    LPN_APK_MODE("menu"); return out; });
  check("the menu lists recent saved deliveries (tap for Saved deliveries) with Saved deliveries and Exported files buttons", s.recent === "20/11/2026 · Sam · 2 pallets|19/11/2026 · No name · 0 pallets" && s.hist === "Saved deliveries" && s.files, s);
  check("each page has a title bar (‹ Menu, the page name, and the Manifest check's ?) that stays at the top, with the log's column headings below it", s.title === "Manifest check:sticky" && s.help && s.helpOpen && s.logTitle === "Log pallets" && s.thTop, s);
  check("the Manifest date shows day/month/year like the delivery date, whatever the phone's date format", s.date === "05/11/2026:wrapped", s);
  s = await page.evaluate(() => { cfg.simple = true; applySimple(); const on = { mode: LPN_APK_MODE(), cls: document.documentElement.className.includes("apkm-") };
    cfg.simple = false; applySimple(); on.back = LPN_APK_MODE(); return on; });
  check("Simple view (which hides the Manifest check) opens straight on the log with no menu; switching it off brings the menu back", s.mode === "" && !s.cls && s.back === "menu", s);
  await page.evaluate(() => LPN_APK_MODE("log")); // the checks below use the log's page
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
  const apkBuild = JSON.parse(fs.readFileSync(path.join(__dirname, "build.json"), "utf8")).build;
  check("exports say \"LPN Pallet Log (Android APK build N)\" with the Android app's own build number, not the website's", s === "LPN Pallet Log (Android APK build " + apkBuild + ")", s);
  // Excel export: kept in Documents, then a bar with Open and Share (the share menu only when asked).
  s = await page.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN001830763", type: "FMCG", fsdu: false }]; save(); render();
    document.getElementById("recv").value = "Jamie"; document.getElementById("expect").value = "2"; save();
    window.__fs = []; window.__share = []; const N = window.Capacitor.Plugins.LpnNative; N.calls = [];
    document.getElementById("dl").click();
    for (let i = 0; i < 100 && !document.getElementById("apkSaved"); i++) await new Promise(r => setTimeout(r, 100));
    const bar = document.getElementById("apkSaved"), en = document.querySelector(".card.entry"), clear = bar && en ? bar.getBoundingClientRect().bottom <= en.getBoundingClientRect().top + 1 : false, out = { clear, dock: LPN_APK_DOCKH(), fs: window.__fs, msg: document.getElementById("msg").textContent, bar: bar && bar.querySelector("p").textContent, btns: bar ? [...bar.querySelectorAll("button")].map(b => b.textContent).join() : "", sharedBefore: window.__share.length };
    bar.querySelector("button:nth-child(2)").click(); for (let i = 0; i < 30 && !window.__share.length; i++) await new Promise(r => setTimeout(r, 100));
    out.share = window.__share.map(x => x.files); out.gone = !document.getElementById("apkSaved");
    document.getElementById("dl").click(); for (let i = 0; i < 100 && !document.getElementById("apkSaved"); i++) await new Promise(r => setTimeout(r, 100));
    document.querySelector("#apkSaved button").click(); await new Promise(r => setTimeout(r, 100)); out.open = N.calls.filter(c => c[0] === "open");
    return out;
  });
  const xl = s.fs.find(f => f.directory === "DOCUMENTS");
  check("Export to Excel keeps the file in Documents › LPN Pallet Log and shows Saved with Open and Share",
    !!xl && /^LPN Pallet Log\/.+\.xlsx$/.test(xl.path) && xl.size > 4000 && xl.head.startsWith("UEsD") && /Saved .+\.xlsx in Documents/.test(s.msg) && /^Saved LPN-log-.+\.xlsx in Documents › LPN Pallet Log\.$/.test(s.bar || "") && s.btns === "Open,Share,Save to…,✕" && s.sharedBefore === 0 && s.clear && s.dock > 0, s);
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
    window.__codes = []; return { mlkit: window.LPN_APK_MLKIT === true, calls: N.calls.filter(c => c[0] === "decode"), rows: rows.map(r => r.lpn) }; });
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
  // Buzzes through Android's own vibrator: one short for added, a double for a warning.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); cfg.vibrate = true; rows = []; save(); render(); N.calls = [];
    addValue("VLT004040431"); await wait(50); lastAdded = null; document.getElementById("lpn").value = "VLT004040431"; add(); await wait(100); const v = N.calls.filter(c => c[0] === "vib").map(c => c[1]); hideCheck(); return v; });
  check("buzzes go to Android's own vibrator: one short when a pallet is added, a double for a warning", s.length === 2 && s[0] === "70" && s[1] === "140,80,140", s);
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
  await page.evaluate(() => { LPN_APK_MODE("log"); }); // the log's page (folds the Manifest check)
  await open({ action: "manifest" });
  s = await page.evaluate(() => ({ open: !document.getElementById("cmpBody").hidden, mode: LPN_APK_MODE() }));
  check("the Manifest check shortcut opens the Manifest check on its own page", s.open && s.mode === "cmp", s);
  await page.evaluate(() => { window.Capacitor.Plugins.LpnNative.calls = []; });
  await open({ action: "scan" });
  s = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); return { calls: window.Capacitor.Plugins.LpnNative.calls.filter(c => c[0] === "scanner").length, web: scanning }; });
  s.mode = await page.evaluate(() => LPN_APK_MODE());
  check("the Scan shortcut goes to the log's page and starts Live scan (the phone's own camera scanner)", s.calls === 1 && !s.web && s.mode === "log", s);
  // Back, with the predictive back gesture.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); N.calls = [];
    const bar = document.getElementById("apkSaved"); if (bar) bar.remove(); // a Saved bar left by an earlier check (Back closes it first)
    openHelp("guide", "How to use this app"); await wait(100); const panel = document.getElementById("panel");
    N.listeners.backProgress({ progress: 0.5 }); const during = panel.style.transform;
    N.listeners.backCancelled(); const cancelled = panel.style.transform, stillOpen = !panel.hidden;
    N.listeners.backProgress({ progress: 0.8 }); N.listeners.back(); await wait(300); const closed = panel.hidden;
    const before = { scanning, scanbox: !document.getElementById("scanbox").hidden, menu: !document.getElementById("expMenu").hidden, saved: !!document.getElementById("apkSaved") };
    if (scanning || before.scanbox) stopScan(); LPN_APK_MODE("log"); N.listeners.back(); const toMenu = LPN_APK_MODE(); N.calls = [];
    N.listeners.back(); const t = document.getElementById("apkToast").textContent; LPN_APK_MODE("log"); return { during, cancelled, stillOpen, closed, toMenu, t, calls: N.calls, before }; });
  check("Back follows the swipe on an open panel, cancelling puts it back, letting go closes it; on a page Back goes to the menu, and on the menu the next Back closes the app",
    /translateX\(24px\) scale\(0\.97\)/.test(s.during) && s.cancelled === "" && s.stillOpen && s.closed && s.toMenu === "menu" && s.t === "Press Back again to close the app." && JSON.stringify(s.calls) === '[["exit",2000]]', s);
  // Which build this is.
  s = await page.evaluate(async () => { openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 100)); const v = document.getElementById("apkVer"); const out = { set: v && v.textContent, foot: (document.getElementById("apkFoot") || {}).textContent }; closeHelp(); return out; });
  check("Settings and the footer say which Android build this is", /^Android APK build 9( · Data on this phone: .+)?$/.test(s.set || "") && s.foot === " Android APK build 9 ·", s);

  // What's new after an Android update: not on a first install, once after an update.
  s = await page.evaluate(() => { const card = () => document.getElementById("apkNew"); localStorage.removeItem("lpnapkseen");
    LPN_APK_WHATSNEW("9"); const first = { card: !!card(), seen: localStorage.getItem("lpnapkseen") };
    localStorage.setItem("lpnapkseen", "5"); LPN_APK_WHATSNEW("9"); const upd = { card: !!card(), items: card() ? card().querySelectorAll("li").length : 0, title: card() ? card().textContent.slice(0, 40) : "" };
    card().querySelector("button").click(); const after = { card: !!card(), seen: localStorage.getItem("lpnapkseen") }; LPN_APK_WHATSNEW("9"); after.again = !!card(); return { first, upd, after }; });
  check("What's new shows once after an Android update (not on a first install)", !s.first.card && s.first.seen === "9" && s.upd.card && s.upd.items > 0 && /What’s new in this Android update/.test(s.upd.title) && !s.after.card && s.after.seen === "9" && !s.after.again, s);
  // Settings › Android app, with the volume button switch.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; N.calls = []; openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 50));
    const first = document.getElementById("panelBody").firstElementChild, v = document.getElementById("apkVol"), on = v && v.checked; v.click(); await new Promise(r => setTimeout(r, 50));
    const off = { stored: localStorage.getItem("lpnapkvol"), calls: N.calls.filter(c => c[0] === "vol") }; v.click(); await new Promise(r => setTimeout(r, 50)); const back = localStorage.getItem("lpnapkvol"); closeHelp();
    return { first: first && first.id, head: first && first.querySelector("h3").textContent, on, off, back, files: !!document.getElementById("apkFilesBtn") }; });
  check("Settings starts with an Android app section, where the volume button can be switched off and on", s.first === "apkSet" && s.head === "Android app" && s.on === true && s.off.stored === "off" && JSON.stringify(s.off.calls) === '[["vol",false]]' && s.back === "on", s);
  // Volume-down starts and stops Live scan; not while a panel is open.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); localStorage.setItem("lpnapkcam", "1"); localStorage.setItem("lpnapkcamscan", "off"); // the scanner inside the app
    N.listeners.volumeDown(); for (let i = 0; i < 30 && !scanning; i++) await wait(100); const started = scanning && !document.getElementById("scanbox").hidden;
    N.listeners.volumeDown(); await wait(200); const stopped = !scanning && document.getElementById("scanbox").hidden;
    openHelp("guide", "How to use this app"); N.listeners.volumeDown(); await wait(300); const inPanel = scanning; closeHelp(); if (scanning) stopScan(); localStorage.removeItem("lpnapkcamscan"); return { started, stopped, inPanel }; });
  check("volume-down starts Live scan and stops it again, but does nothing while a panel is open", s.started && s.stopped && !s.inPanel, s);
  // The phone's own camera scanner: what it reads goes through the app's checks, and it shows the result.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); if (scanning) stopScan(); rows = []; document.getElementById("expect").value = "20"; save(); render(); N.calls = [];
    document.getElementById("scan").click(); await wait(200); const started = N.calls.filter(c => c[0] === "scanner").length, web = scanning;
    N.listeners.nativeScan({ values: ["00350123450000000017", "VLT004040401"] }); await wait(100); const first = { rows: rows.map(r => r.lpn).join(), status: N.calls.filter(c => c[0] === "status").pop() };
    N.calls = []; lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040401"] }); await wait(100); const dup = { status: N.calls.filter(c => c[0] === "status").pop(), pending: !!pendingAdd, bar: !document.getElementById("chkBar").hidden };
    N.listeners.nativeScanClosed({ reason: "check" }); hideCheck(); return { started, web, first, dup, flag: window.LPN_APK_NATIVESCAN }; });
  check("Live scan opens the phone's own camera scanner, and a pallet it reads is added with the count shown in the scanner", s.started === 1 && !s.web && s.first.rows === "VLT004040401" && /^Added: VLT004040401 \(.+\) · 1 of 20$/.test(s.first.status[1]) && !s.first.status[2], s);
  check("a pallet that needs a check closes the scanner, so it can be answered in the app", s.dup.pending && s.dup.bar && !!s.dup.status && s.dup.status[2] === true && /already logged/.test(s.dup.status[1]), s);
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; localStorage.setItem("lpnapkcamscan", "off"); N.calls = []; document.getElementById("scan").click(); await new Promise(r => setTimeout(r, 800));
    const out = { native: N.calls.filter(c => c[0] === "scanner").length, web: scanning }; if (scanning) stopScan(); localStorage.removeItem("lpnapkcamscan"); return out; });
  check("with the phone's scanner switched off in Settings, Live scan uses the one inside the app", s.native === 0 && s.web, s);
  // In the scanner: the pallet type, FSDU, Remove last and the last three pallets.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)), st = () => N.calls.filter(c => c[0] === "state").pop();
    const orig = N.scanStatus; N.scanStatus = async o => { if (o.state) N.calls.push(["state", o.state]); return orig(o); };
    rows = []; save(); render(); document.querySelector('#tyb button[data-t="BB"]').click(); N.calls = [];
    document.getElementById("scan").click(); await wait(200); const open = st() && st()[1];
    N.listeners.scanType({ type: "FPP" }); await wait(50); const typed = { page: document.getElementById("type").value, sent: st()[1].type };
    N.listeners.scanFsdu({ on: true }); await wait(50); const fsdu = { page: document.getElementById("fsdu").checked, sent: st()[1].fsdu };
    lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040501"] }); await wait(50); lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040502"] }); await wait(50);
    const after = st()[1], added = rows.map(r => r.lpn + ":" + r.type + ":" + r.fsdu).join();
    N.listeners.scanUndo(); await wait(50); const undo = { rows: rows.map(r => r.lpn).join(), status: N.calls.filter(c => c[0] === "status").pop(), state: st()[1] };
    N.listeners.nativeScanClosed({ reason: "done" }); N.scanStatus = orig; return { open, typed, fsdu, after, added, undo }; });
  check("the scanner gets the pallet type, FSDU, last pallets and the main screen's type colours when it opens", !!s.open && s.open.type === "BB" && s.open.fsdu === false && s.open.canUndo === false && s.open.colours === "#dba56c,#6fa8ff,#a9c95a,#c79bf0", s.open);
  check("the type and FSDU buttons in the scanner change the app's own (FSDU clears after the next pallet, as usual)", s.typed.page === "FPP" && s.typed.sent === "FPP" && s.fsdu.page && s.fsdu.sent && s.added === "VLT004040501:FPP:true,VLT004040502:FPP:false", s);
  check("the scanner shows the last pallets, newest first", s.after.recent === "VLT004040502 · FPP\nVLT004040501 · FPP + FSDU" && s.after.canUndo, s.after);
  check("Remove last in the scanner removes the last pallet (with Undo in the app)", s.undo.rows === "VLT004040501" && /^Removed VLT004040502 · 1 of 20\. Undo is in the app\.$/.test(s.undo.status[1]) && s.undo.state.recent === "VLT004040501 · FPP + FSDU", s.undo);
  // Carry on scanning.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; document.querySelectorAll(".apkask").forEach(a => a.remove()); N.calls = []; LPN_APK_CARRYON(); const a = document.querySelector(".apkask");
    const out = { q: a && a.querySelector(".apkasktitle").textContent, b: a ? [...a.querySelectorAll("button")].map(x => x.textContent).join() : "" }; a.querySelector("button").click(); await new Promise(r => setTimeout(r, 300));
    out.started = N.calls.filter(c => c[0] === "scanner").length; N.listeners.nativeScanClosed({ reason: "done" }); rows = []; save(); render(); LPN_APK_CARRYON(); out.empty = !!document.querySelector(".apkask"); return out; });
  check("with a delivery in progress, opening the app offers Carry on scanning, which opens the scanner", s.q === "Delivery in progress: 1 of 20." && s.b === "Carry on scanning,Cancel" && s.started === 1 && !s.empty, s);
  // Bigger buttons.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); openHelp("settings", "Settings"); await wait(100); const c = document.getElementById("apkBig"); c.click(); await wait(50); closeHelp();
    const h = id => Math.round(document.getElementById(id).getBoundingClientRect().height), out = { on: document.documentElement.classList.contains("apkbig"), add: h("add"), wide: document.documentElement.scrollWidth <= innerWidth };
    openHelp("settings", "Settings"); await wait(100); document.getElementById("apkBig").click(); await wait(50); closeHelp(); out.off = !document.documentElement.classList.contains("apkbig"); return out; });
  check("Bigger buttons makes Add and the other main buttons at least 60 px tall, without the page getting wider", s.on && s.add >= 60 && s.wide && s.off, s);
  // The scanner's frame flashes green for an added pallet, orange for a check.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); rows = []; save(); render(); N.calls = [];
    lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040601"] }); await wait(50); lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040601"] }); await wait(50);
    const st = N.calls.filter(c => c[0] === "status").map(c => c[3] + ":" + c[2]); hideCheck(); N.listeners.nativeScanClosed({ reason: "check" }); return st; });
  check("the scanner's frame flashes green when a pallet is added and orange for a check (which closes the scanner)", s.join() === "ok:false,warn:true", s);
  // Questions are Android-style bottom sheets; tapping the dimmed page closes them (unless they must be answered).
  s = await page.evaluate(async () => { rows = [{ lpn: "VLT004040611", type: "BB", fsdu: false }]; save(); render(); document.querySelectorAll(".apkask").forEach(a => a.remove()); LPN_APK_CARRYON(); await new Promise(r => setTimeout(r, 400)); // after it has slid up
    const a = document.querySelector(".apkask"), sh = a && a.querySelector(".apksheet"), r = sh && sh.getBoundingClientRect(), out = { sheet: !!sh, atBottom: r && Math.abs(r.bottom - innerHeight) < 2, full: r && Math.round(r.width) === innerWidth, dim: getComputedStyle(a).backgroundColor, solid: (() => { const c = getComputedStyle(sh).backgroundColor.match(/[\d.]+/g); return !!c && (c.length < 4 || +c[3] === 1); })() };
    sh.querySelector(".apkasktitle").click(); out.stillOpen = !!document.querySelector(".apkask"); a.click(); out.closed = !document.querySelector(".apkask"); return out; });
  check("questions slide up as a solid bottom sheet over a dimmed page, and tapping the dimmed part closes them", s.sheet && s.atBottom && s.full && s.solid && /rgba\(0, 0, 0, 0\.45\)/.test(s.dim) && s.stillOpen && s.closed, s);
  // A light tap on the main buttons, with Vibrate on.
  s = await page.evaluate(() => { const N = window.Capacitor.Plugins.LpnNative, fire = id => document.getElementById(id).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    N.calls = []; cfg.vibrate = true; fire("add"); fire("histBtn"); const on = N.calls.filter(c => c[0] === "tap").length; cfg.vibrate = false; fire("add"); const off = N.calls.filter(c => c[0] === "tap").length - on; cfg.vibrate = true; return { on, off }; });
  check("a light tap on the main buttons (Add, types, Scan…), not others, and none with Vibrate off", s.on === 1 && s.off === 0, s);
  // The status and navigation bars follow the app's colours.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); N.calls = [];
    theme = { bg: "#f2f2f2", ac: "#0b3d91" }; applyTheme(); await wait(50); const light = N.calls.filter(c => c[0] === "bars").pop();
    theme = { bg: "#0c1830", ac: "#ff8a2a" }; applyTheme(); await wait(50); const dark = N.calls.filter(c => c[0] === "bars").pop(); return { light, dark }; });
  check("the status and navigation bars take the app's background colour, with dark icons on a light theme", s.light && s.light[1] === "#f2f2f2" && s.light[2] === true && s.dark && s.dark[1] === "#0c1830" && s.dark[2] === false, s);
  // All in: at the expected count the scanner says so and Done stands out.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); rows = []; document.getElementById("expect").value = "2"; save(); render(); N.calls = [];
    const orig = N.scanStatus; N.scanStatus = async o => { N.calls.push(["st", o.text, o.state && o.state.allIn]); return orig(o); };
    lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040701"] }); await wait(50); lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040702"] }); await wait(50); lastAt = 0; N.listeners.nativeScan({ values: ["VLT004040703"] }); await wait(50);
    N.scanStatus = orig; const st = N.calls.filter(c => c[0] === "st"); N.listeners.nativeScanClosed({ reason: "done" }); document.getElementById("expect").value = "20"; save(); return st.map(c => c[1] + "|" + c[2]); });
  check("at the expected count the scanner says 'all in' and highlights Done; over it, 'more than expected'", /· 1 of 2\|false$/.test(s[0]) && /· 2 of 2, all in\|true$/.test(s[1]) && /· 3 of 2, more than expected\|true$/.test(s[2]), s);
  // Spoken count.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); rows = []; save(); render(); N.calls = [];
    addValue("VLT004040411"); const off = N.calls.filter(c => c[0] === "speak").length;
    localStorage.setItem("lpnapkspeak", "on"); addValue("VLT004040412"); document.getElementById("lpn").value = "VLT004040412"; add(); lastAdded = null; await wait(50);
    document.getElementById("lpn").value = "VLT004040412"; add(); await wait(100); const said = N.calls.filter(c => c[0] === "speak").map(c => c[1]); hideCheck(); localStorage.removeItem("lpnapkspeak"); return { off, said }; });
  check("with Say the count on, the count is said after each pallet and a warning is named (off by default)", s.off === 0 && s.said[0] === "2 of 20" && s.said.includes("Already logged"), s);
  // Low battery.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); rows = [{ lpn: "VLT004040421", type: "BB", fsdu: false }]; exported = null; save(); render();
    window.__batt = { level: 40, charging: false }; await LPN_APK_BATTERY(); const high = !!document.querySelector(".apkask");
    window.__batt = { level: 14, charging: true }; await LPN_APK_BATTERY(); const charging = !!document.querySelector(".apkask");
    window.__batt = { level: 14, charging: false }; await LPN_APK_BATTERY(); const a = document.querySelector(".apkask"), low = a ? { q: a.querySelector(".apkasktitle").textContent, b: [...a.querySelectorAll("button")].map(x => x.textContent).join() } : null;
    if (a) a.remove(); await LPN_APK_BATTERY(); const again = !!document.querySelector(".apkask"); window.__batt = null; return { high, charging, low, again }; });
  check("at 15% battery or less (not charging) with pallets not exported, it offers to export or back up, once", !s.high && !s.charging && s.low && s.low.q === "Battery at 14%. Export or back up the log now, so nothing is lost if the phone runs out." && s.low.b === "Download (Excel),Back up,Cancel" && !s.again, s);
  // The phone's colours.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); openHelp("settings", "Settings"); await wait(200); const b = document.getElementById("apkColours"), shown = b && !b.hidden; b.click(); await wait(100);
    const out = { shown, bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(), saved: JSON.parse(localStorage.getItem("lpntheme") || "{}") }; document.getElementById("setReset").click(); closeHelp(); return out; });
  check("Use the phone's colours takes Android's wallpaper colours for the app (Reset goes back)", s.shown && s.bg === "#1a1c1e" && s.saved.bg === "#1a1c1e" && s.saved.ac === "#9ecaff", s);
  // A scanner connecting or dropping off.
  s = await page.evaluate(() => { const N = window.Capacitor.Plugins.LpnNative; N.listeners.scanner({ connected: true, name: "CS3070" }); const on = document.getElementById("apkToast").textContent;
    N.listeners.scanner({ connected: false, name: "CS3070" }); return { on, off: document.getElementById("apkToast").textContent }; });
  check("a Bluetooth or USB scanner connecting or dropping off is shown", s.on === "Scanner connected: CS3070." && s.off === "Scanner disconnected: CS3070. Scans won’t reach the app until it reconnects.", s);

  // Exported files.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); if (scanning) stopScan(); N.calls = []; window.__share = [];
    window.__dir = [{ name: "LPN-log-2026-11-18.xlsx", type: "file", size: 9000, mtime: 1763460000000, uri: "file:///docs/a.xlsx" }, { name: "LPN-log-2026-11-19.pdf", type: "file", size: 52000, mtime: 1763550000000, uri: "file:///docs/b.pdf" }, { name: "sub", type: "directory" }];
    document.getElementById("apkFilesBtn").click(); await wait(200);
    const items = [...document.querySelectorAll(".apkfiles li")].map(li => ({ name: li.querySelector(".apkfname").textContent, btns: [...li.querySelectorAll("button")].map(b => b.textContent).join() }));
    const first = document.querySelectorAll(".apkfiles li")[0], btn = t => [...first.querySelectorAll("button")].find(b => b.textContent === t);
    btn("Print").click(); await wait(100); btn("Share").click(); await wait(100); btn("Open").click(); await wait(100);
    const out = { title: document.getElementById("panelTitle").textContent, items, calls: N.calls.filter(c => c[0] !== "decode"), share: window.__share.map(x => x.files) };
    window.__dir = []; closeHelp(); return out; });
  check("Exported files lists the saved files newest first, to open, share or print (PDFs) again", s.title === "Exported files" && s.items.length === 2 && s.items[0].name === "LPN-log-2026-11-19.pdf" && s.items[0].btns === "Open,Share,Save to…,Print" && s.items[1].btns === "Open,Share,Save to…"
    && JSON.stringify(s.calls) === '[["print","LPN-log-2026-11-19","JVBER"],["open","LPN-log-2026-11-19.pdf"]]' && JSON.stringify(s.share) === '[["file:///docs/b.pdf"]]', s);
  // The camera: explained once, before Android asks.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), App = window.Capacitor.Plugins.App; localStorage.removeItem("lpnapkcam"); window.__camAllowed = false;
    const inp = document.getElementById("file"), real = inp.click; let picked = 0; inp.click = () => { picked++; };
    document.getElementById("photo").click(); await wait(100);
    const a = document.querySelector(".apkask"), q = { text: a && a.textContent, btns: a ? [...a.querySelectorAll("button")].map(b => b.textContent).join() : "", picked };
    window.Capacitor.Plugins.LpnNative.listeners.back(); q.afterBack = !!document.querySelector(".apkask");
    document.querySelector(".apkask button").click(); await wait(100); q.pickedAfter = picked; q.kept = localStorage.getItem("lpnapkcam");
    document.getElementById("photo").click(); await wait(100); q.again = !!document.querySelector(".apkask"); q.pickedAgain = picked;
    inp.click = real; window.__camAllowed = true; return q; });
  check("before Android first asks for the camera, the app says what it's for (once, Continue only)", /uses the camera to scan pallet barcodes/.test(s.text || "") && s.btns === "Continue" && s.picked === 0 && s.afterBack && s.pickedAfter === 1 && s.kept === "1" && !s.again && s.pickedAgain === 2, s);
  s = await page.evaluate(async () => (await (await fetch("scan.js")).text()).includes("Allow the camera for LPN Pallet Log in your phone’s Settings › Apps"));
  check("if the camera is refused, the message says where Android keeps the setting", s === true, s);

  // Storage: the app's own, without the browser's limit; what was saved before is copied across once.
  s = await page.evaluate(async () => { const st = window.LpnStore._map; rows = [{ lpn: "VLT004040201", type: "BB", fsdu: false }]; save();
    openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 100)); const v = document.getElementById("apkVer").textContent; closeHelp();
    return { flag: window.LPN_APK_STORE === true, copied: st.get("lpnmigtest"), inStore: /VLT004040201/.test(st.get("lpnlog") || ""), inBrowser: /VLT004040201/.test(window.__realLS.getItem("lpnlog") || ""), viaApp: localStorage.getItem("lpnmigtest"), v }; });
  check("the app keeps its data in its own storage (no 10 MB limit), copied across from before, and Settings shows how much", s.flag && s.copied === "from before" && s.inStore && !s.inBrowser && s.viaApp === "from before" && /Data on this phone: \d/.test(s.v), s);
  // Save to…
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); N.calls = []; rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; document.getElementById("expect").value = ""; save(); render();
    document.getElementById("dl").click(); for (let i = 0; i < 100 && !document.getElementById("apkSaved"); i++) await wait(100);
    [...document.querySelectorAll("#apkSaved button")].find(b => b.textContent === "Save to…").click(); await wait(200);
    window.__dir = [{ name: "LPN-log-2026-11-19.pdf", type: "file", size: 52000, mtime: 1763550000000, uri: "file:///docs/b.pdf" }];
    document.getElementById("apkFilesBtn").click(); await wait(200); [...document.querySelectorAll(".apkfiles button")].find(b => b.textContent === "Save to…").click(); await wait(200);
    window.__dir = []; closeHelp(); return N.calls.filter(c => c[0] === "saveAs"); });
  check("Save to… hands the file to Android's own save screen, from the Saved bar and from Exported files", s.length === 2 && /^LPN-log-.+\.xlsx$/.test(s[0][1]) && s[0][2] === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && s[0][3] === "UEsDB"
    && s[1][1] === "LPN-log-2026-11-19.pdf" && s[1][2] === "application/pdf" && s[1][3] === "JVBER", s);
  // The Continue shortcut follows the delivery.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); rows = []; save(); await wait(1300); N.calls = [];
    addValue("VLT004040301"); addValue("VLT004040302"); await wait(1300); const two = N.calls.filter(c => c[0] === "delivery").map(c => c[1]);
    rows = []; save(); await wait(1300); const none = N.calls.filter(c => c[0] === "delivery").map(c => c[1]); return { two, none }; });
  check("the Continue shortcut says how many pallets the delivery has, and goes when the log is cleared", s.two.join() === "Continue: 2 pallets" && s.none.join("|") === "Continue: 2 pallets|", s);
  // From the Manifest check scrolled to the top (where the entry bar slides away on a phone).
  await page.evaluate(async () => { const b = document.getElementById("cmpBody"); if (b.hidden) document.getElementById("cmpToggle").click(); document.getElementById("cmpCard").scrollIntoView({ block: "start" }); window.dispatchEvent(new Event("scroll")); await new Promise(r => setTimeout(r, 200)); });
  const slid = await page.evaluate(() => { LPN_APK_MODE("cmp"); return LPN_APK_MODE() === "cmp"; }); // the Manifest check's own page
  await open({ action: "continue" });
  s = await page.evaluate(() => { const a = document.activeElement, l = document.getElementById("lpn"); const out = { f: a ? (a.id || a.tagName + "." + a.className + ":" + (a.textContent || "").slice(0, 40)) : "", mode: l.getAttribute("inputmode"), page: LPN_APK_MODE() };
    l.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); out.after = l.getAttribute("inputmode"); return out; });
  check("the Continue shortcut goes back to the LPN box (without the keyboard until it's tapped), even from the Manifest check's page", s.f === "lpn" && s.mode === "none" && s.after !== "none" && slid && s.page === "log", { s, slid });
  // Android-style controls.
  s = await page.evaluate(async () => { openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 100)); const c = document.querySelector("#panelBody label.chk > input[type=checkbox]"), cs = getComputedStyle(c);
    const out = { appearance: cs.appearance, w: cs.width, role: c.type }; closeHelp();
    const b = document.getElementById("histBtn"), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
    out.ripple = !!b.querySelector(".apkripple"); out.text = b.textContent;
    const q = document.querySelector(".helpq"), before = getComputedStyle(q).position; q.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); out.helpq = [before, getComputedStyle(q).position];
    return out; });
  check("Android-style switches in Settings (still checkboxes) and a ripple where a button is pressed, without changing buttons' text or position", s.appearance === "none" && s.w === "44px" && s.role === "checkbox" && s.ripple && s.text === "Saved deliveries" && s.helpq[0] === s.helpq[1], s);

  // Warehouse handheld scanners: each scan goes where it belongs.
  s = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)), N = window.Capacitor.Plugins.LpnNative, out = {};
    N.calls = []; LPN_APK_SYNCHAND(); await wait(50); out.on = N.calls.some(c => c[0] === "hand" && c[1] === true);
    document.querySelectorAll(".apkask").forEach(a => a.remove()); closeHelp(); if (document.activeElement) document.activeElement.blur();
    ["flt", "fltType", "fltFsdu"].forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; }); // no search or filter left by an earlier check
    rows = []; save(); render(); LPN_APK_MODE("log"); document.querySelector('#tyb button[data-t="BB"]').click(); LPN_APK_MODE("menu"); // BB (an FPP pallet opens its description box)
    N.listeners.hwScan({ code: "VLT004040703" }); await wait(150); out.log = LPN_APK_MODE() + ":" + rows.map(r => r.lpn).join();
    if (!rows.length) return Object.assign(out, { act: document.activeElement && (document.activeElement.id || document.activeElement.tagName), panel: !document.getElementById("panel").hidden, chk: !document.getElementById("chkBar").hidden, toast: (document.getElementById("apkToast") || {}).textContent, msg: document.getElementById("msg").textContent });
    const eb = document.querySelector("#body .lpnedit"); if (!eb) return Object.assign(out, { noRow: document.getElementById("body").innerHTML.slice(0, 200) });
    eb.click(); await wait(100); const d = document.querySelector(".descline input"); if (d) d.focus();
    N.listeners.hwScan({ code: "VLT004040711" }); await wait(150); out.fromEdit = !document.querySelector(".dmgrow") && rows.map(r => r.lpn).join();
    const f = document.getElementById("flt"); f.focus(); N.listeners.hwScan({ code: "VLT004040703" }); await wait(100); out.search = f.value + ":" + rows.length; f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); f.blur();
    LPN_APK_MODE("cmp"); document.getElementById("cmpNums").value = ""; N.listeners.hwScan({ code: "QUB001899182" }); await wait(100); out.cmp = document.getElementById("cmpNums").value.trim() + ":" + rows.length;
    document.getElementById("cmpNums").value = ""; LPN_APK_MODE("log"); rows = []; save(); render(); return out; });
  check("a handheld scanner is set up on opening, and a scan from the menu is logged as the next pallet on the log's page", s.on && s.log === "log:VLT004040703", s);
  s.glow = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; LPN_APK_MODE("log"); rows = []; save(); render(); const seen = [];
    const g = () => (document.getElementById("apkGlow") || {}).className || "";
    N.listeners.hwScan({ code: "VLT004040729" }); await new Promise(r => setTimeout(r, 90)); seen.push(g());
    await new Promise(r => setTimeout(r, 500)); N.listeners.hwScan({ code: "VLT004040729" }); await new Promise(r => setTimeout(r, 90)); seen.push(g());
    const sk = document.getElementById("chkSkip"); if (sk && !document.getElementById("chkBar").hidden) sk.click(); rows = []; save(); render(); return seen.join(","); });
  check("a handheld scan flashes the screen's edge green, or orange when the same pallet is scanned again", s.glow === "ok,warn", s.glow);
  check("a handheld scan closes an open pallet edit and is logged, goes into a box being filled in, and on the Manifest check's page into the manifest numbers", s.fromEdit === "VLT004040703,VLT004040711" && s.search === "VLT004040703:2" && s.cmp === "QUB001899182:2", s);
  // The phone's own text reader for manifest photos: its words go through the app's photo reading; if it fails, the
  // app's own reader takes over.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative; N.calls = []; const def = LPN_OCR() === null; localStorage.setItem("lpnapkocr", "on");
    window.__ocrStub = () => ({ text: "Manifest\nLPN: vlt004040265 x", words: [{ text: "LPN:", x0: 10, y0: 10, x1: 60, y1: 30 }, { text: "vlt004040265", x0: 70, y0: 10, x1: 250, y1: 30 }] });
    const c = document.createElement("canvas"); c.width = 400; c.height = 120; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 400, 120); x.fillStyle = "#000"; x.font = "20px sans-serif"; x.fillText("LPN: VLT004040265", 10, 30);
    const blob = await new Promise(r => c.toBlob(r, "image/png")), out = {};
    try { out.found = [...await readPhoto(new File([blob], "m.png", { type: "image/png" }))]; } catch (e) { out.err = String(e.message || e); }
    out.reads = N.calls.filter(k => k[0] === "readText").length;
    window.__ocrStub = null; const w = await LPN_OCR(); await w.setParameters({ tessedit_pageseg_mode: "11" });
    try { const r = await w.recognize(c); out.fallback = typeof (r && r.data && r.data.text) === "string"; } catch (e) { out.fallbackErr = String(e.message || e); } await w.terminate();
    try { localStorage.setItem("lpnapkocr", "off"); out.off = LPN_OCR() === null; } finally { localStorage.removeItem("lpnapkocr"); }
    out.def = def; return out; });
  check("manifest photos are read by the phone's own text reader (the page and a close-up of each number), through the app's photo reading", JSON.stringify(s.found) === '["VLT004040265"]' && s.reads === 2, s);
  check("if the phone's text reader fails the app's own reader takes over; it's off unless switched on in Settings (the app's own reader is more accurate)", s.fallback && s.off && s.def, s);
  // A folder chosen for exports gets a copy of every export.
  s = await page.evaluate(async () => { const N = window.Capacitor.Plugins.LpnNative, wait = ms => new Promise(r => setTimeout(r, ms)); N.calls = [];
    openHelp("settings", "Settings"); await wait(150); const before = document.getElementById("apkDirNote").textContent; document.getElementById("apkDirPick").click(); await wait(100);
    const after = document.getElementById("apkDirNote").textContent; closeHelp();
    await LPN_APK_SAVE(new Blob(["%PDF-1.3"], { type: "application/pdf" }), "LPN log 22-11-2026.pdf"); await wait(100);
    const bar = (document.getElementById("apkSaved") || {}).textContent || "", folder = N.calls.filter(c => c[0] === "folder");
    const sb = document.getElementById("apkSaved"); if (sb) sb.remove(); localStorage.removeItem("lpnapkdir"); return { before, after, bar, folder }; });
  check("Settings › Android app can choose a folder (such as a synced Drive folder), and every export is then saved there too", /Choose a folder/.test(s.before) && / and in Drive\.$/.test(s.after) && /in Documents › LPN Pallet Log and in Drive\./.test(s.bar)
    && JSON.stringify(s.folder) === '[["folder","content://tree/drive","LPN log 22-11-2026.pdf","application/pdf"]]', s);

  // The photo reader is got ready as the Manifest check's page opens.
  s = await page.evaluate(async () => { LPN_APK_MODE("log"); const before = !!ocrW; LPN_APK_MODE("cmp");
    for (let i = 0; i < 60 && !ocrW; i++) await new Promise(r => setTimeout(r, 250));
    let ready = false; try { ready = !!(ocrW && await ocrW); } catch (e) {} LPN_APK_MODE("log"); return { before, ready }; });
  check("the photo reader starts as the Manifest check's page opens, so the first photo doesn't wait for it", s.ready, s);

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
