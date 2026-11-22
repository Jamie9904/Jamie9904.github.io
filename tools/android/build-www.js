/*
  Offline Android app, step 2: builds tools/android/www, the copy of the app that goes inside the APK.
  Run after fetch-libs.js: node tools/android/build-www.js

  It is the website's own files with these changes, each checked so a change to the site that breaks one stops the build:
  - library addresses point at the copies in lib/ (the fingerprints in core.js still check them);
  - the page may only load its own files (Content-Security-Policy), so nothing can reach the internet;
  - its own settings, tools/android/config.js, instead of the website's (Report a problem and Share this app always off);
  - no service worker (everything is already inside the app);
  - the photo reader uses its files in lib/;
  - android.js (saving, sharing and printing on Android) loads first.
*/
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const WWW = path.join(__dirname, "www");
const LIB = path.join(__dirname, "lib");
const GH = !!process.env.GITHUB_ACTIONS;
const fail = m => { console.log((GH ? "::error title=Offline app build::" : "FAIL ") + m); process.exit(1); };
if (!fs.existsSync(path.join(LIB, "tess.json"))) fail("run fetch-libs.js first");

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });
const FILES = ["index.html", "config.js", "core.js", "qr.js", "scan.js", "export.js", "compare.js", "panels.js", "styles.css", "manifest.webmanifest", "presets.json", "sw.js", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(WWW, f));
for (const d of ["fonts", "media"]) fs.cpSync(path.join(ROOT, d), path.join(WWW, d), { recursive: true });
fs.rmSync(path.join(WWW, "media", "share-qr.svg"), { force: true }); // the QR code to the website (Share this app is off)
// No logo.png: the Android app has no default logo. People add their own in Settings (Add logo), as on the website.
fs.cpSync(LIB, path.join(WWW, "lib"), { recursive: true, filter: s => !s.endsWith("tess.json") });

const edit = (f, from, to, n = 1) => {
  const p = path.join(WWW, f); let s = fs.readFileSync(p, "utf8");
  const count = typeof from === "string" ? s.split(from).length - 1 : (s.match(new RegExp(from.source, from.flags.includes("g") ? from.flags : from.flags + "g")) || []).length;
  if (n === "any" ? count < 1 : count !== n) fail(f + ": expected " + n + " of " + from + " but found " + count + ". The website changed: update tools/android/build-www.js.");
  s = typeof from === "string" ? s.split(from).join(to) : s.replace(new RegExp(from.source, from.flags.includes("g") ? from.flags : from.flags + "g"), to);
  fs.writeFileSync(p, s);
};

// Only the app's own files: no CDNs, no report server.
edit("index.html", /<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
  `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; child-src 'self' blob:; connect-src 'self' blob: data:; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src blob:; object-src blob:; base-uri 'none'; form-action 'none'">`);
edit("index.html", '<script src="config.js"></script>', '<script src="android.js"></script>\n<script src="config.js"></script>');
// Library addresses -> the copies inside the app.
for (const f of ["core.js", "scan.js", "export.js", "compare.js"]) edit(f, /https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\//, "./lib/$1/", "any"); // "./": pdf.js is loaded with import(), which needs it
// The Android app has its own settings (tools/android/config.js), separate from the website's config.js.
{
  const src = fs.readFileSync(path.join(__dirname, "config.js"), "utf8");
  const win = {}; try { new Function("window", src)(win); } catch (e) { fail("tools/android/config.js has a mistake: " + e.message); }
  const c = win.LPN_CONFIG || {}, feats = c.features || {}, test = c.testing || {};
  const known = JSON.parse(/const FEATURES=(\[[^\]]*\])/.exec(fs.readFileSync(path.join(ROOT, "core.js"), "utf8"))[1]);
  const missing = known.filter(k => !(k in feats)), unknown = Object.keys(feats).concat(Object.keys(test)).filter(k => !known.includes(k));
  const notBool = Object.entries(feats).concat(Object.entries(test)).filter(([, v]) => typeof v !== "boolean").map(([k]) => k);
  if (missing.length) fail("tools/android/config.js has no line for: " + missing.join(", ") + ". Add each under features (true or false) so the Android app's choice is written down.");
  if (unknown.length) fail("tools/android/config.js names features the app doesn't have: " + unknown.join(", "));
  if (notBool.length) fail("tools/android/config.js: use true or false for " + notBool.join(", "));
  if (feats.report || feats.shareApp) fail("tools/android/config.js: report and shareApp must stay false (they need the internet or the website)");
  fs.writeFileSync(path.join(WWW, "config.js"), src);
}
// Exports say they were made with the Android app and its own build number (tools/android/build.json),
// not the website's: "LPN Pallet Log (Android APK build 1)".
const APK_BUILD = (() => { let b; try { b = JSON.parse(fs.readFileSync(path.join(__dirname, "build.json"), "utf8")).build; } catch (e) { fail("tools/android/build.json is missing or isn't valid JSON"); }
  if (!Number.isInteger(b) || b < 1) fail("tools/android/build.json: build must be a whole number from 1"); return b; })();
edit("export.js", "  if(appVer)return appVer;\n", '  appVer="LPN Pallet Log (Android APK build ' + APK_BUILD + ')";return appVer;\n');
// The start menu (android.js): the Guide says how to get between Log pallets and the Manifest check.
edit("panels.js", '<span data-f="palletLog">Tap the <b>Manifest check</b> heading to open it.</span>', '<span data-f="palletLog">Choose <b>Manifest check</b> on the start menu (from the log, tap <b>‹ Menu</b> at the top or press Back). In Simple view the app opens straight on the log, with no menu or Manifest check.</span>');
edit("panels.js", '<h3>1. Quick start</h3>\n<ol>\n', '<h3>1. Quick start</h3>\n<ol>\n<li data-f="manifestCheck"><b>Start menu:</b> the app opens on a menu: choose <b>Log pallets</b> or <b>Manifest check</b>. Each has its own page; <b>‹ Menu</b> at the top, or Back, takes you back to the menu.</li>\n');
// Nothing about installing: the Android app is already installed (Guide section, Settings, and the first-visit pop-up).
edit("panels.js", /<h3>\d+\. Install it on your phone<\/h3>[\s\S]*?(?=<h3>\d+\. Settings and good to know<\/h3>)/, "");
edit("panels.js", '<h3>Install</h3>\n<p>Add this page to your home screen so it opens like an app.</p>\n<div class="row"><button id="showInstall">Show the install pop-up</button></div>\n', "");
edit("panels.js", "if(installed||seen)return;", "if(installed||seen||window.LPN_APK)return;");
// The tools are inside the app, not downloaded.
edit("panels.js", "<li>The Excel, PDF and photo reading tools are downloaded from public code servers the first time they’re needed. Your data isn’t sent to them. Like any website, they see your internet address.</li>",
  "<li>The Excel, PDF, barcode and photo reading tools are inside this app, so nothing is downloaded and the app never needs the internet.</li>");
// Camera refused: say where Android keeps the setting (the website's text talks about browser settings and https).
edit("scan.js", '"Camera access was blocked. Allow camera permission for this site in your browser settings, make sure the page is opened over https"',
  '"Camera access was blocked. Allow the camera for LPN Pallet Log in your phone’s Settings › Apps"');
// No service worker.
edit("panels.js", 'if("serviceWorker" in navigator){', 'if(false&&"serviceWorker" in navigator){');
// The photo reader's worker, engine and language data come from lib/.
edit("compare.js", 'Tesseract.createWorker("eng")', '((window.LPN_OCR&&window.LPN_OCR())||Tesseract.createWorker("eng",1,window.LPN_TESS))'); // the phone's own text reader when it's on (android.js)
// The page's own way of printing (a hidden frame) doesn't work inside the app: skip it, so a failed print saves and shares.
edit("compare.js", "fr.onload=()=>{try{fr.contentWindow.focus();", "fr.onload=()=>{try{if(window.LPN_APK)throw 0;fr.contentWindow.focus();");
// Print opens Android's own print screen first (android.js); if that can't, the PDF is saved and shared as above.
edit("compare.js", "async function printBuf(buf,fname,m){", "async function printBuf(buf,fname,m){if(window.LPN_APK_PRINT&&await window.LPN_APK_PRINT(buf,fname)){m.textContent=\"\";return}");

const tess = JSON.parse(fs.readFileSync(path.join(LIB, "tess.json"), "utf8"));
// The language data unzipped: Android's app build treats files ending in .gz specially (the app then can't find
// eng.traineddata.gz, and the photo reader waits 90 seconds and gives up), so the reader is told not to expect .gz.
{ const zlib = require("zlib"), dir = path.join(WWW, "lib", tess.langPath.replace(/^\.?\/?lib\//, "")), gz = path.join(dir, "eng.traineddata.gz");
  if (!fs.existsSync(gz)) fail("the photo reader's language data isn't at " + path.relative(ROOT, gz));
  fs.writeFileSync(path.join(dir, "eng.traineddata"), zlib.gunzipSync(fs.readFileSync(gz))); fs.unlinkSync(gz);
  tess.gzip = false; }
const notes = JSON.parse(fs.readFileSync(path.join(__dirname, "whats-new.json"), "utf8"));
if (!Array.isArray(notes.items) || notes.items.some(t => typeof t !== "string")) fail("tools/android/whats-new.json: items must be a list of sentences");
fs.writeFileSync(path.join(WWW, "android.js"), fs.readFileSync(path.join(__dirname, "android-shim.js"), "utf8").replace("/*TESS*/null", JSON.stringify(tess)).replace("/*NOTES*/[]", JSON.stringify(notes.items)));

// Nothing may still point at the internet (the website's own address in text is fine).
const left = [];
for (const f of fs.readdirSync(WWW).filter(f => /\.(js|html|css)$/.test(f))) {
  const s = fs.readFileSync(path.join(WWW, f), "utf8");
  for (const m of s.matchAll(/https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|tessdata\.projectnaptha\.com)[^"'\s]*/g)) left.push(f + ": " + m[0]);
}
if (left.length) fail("still pointing at the internet:\n  " + left.join("\n  "));
for (const k of Object.values(tess)) if (!fs.existsSync(path.join(WWW, k))) fail("missing " + k);
let size = 0; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : size += fs.statSync(path.join(d, e.name)).size); walk(WWW);
console.log((GH ? "::notice title=Offline app::" : "") + "Offline copy of the app built (" + (size / 1048576).toFixed(1) + " MB)");
