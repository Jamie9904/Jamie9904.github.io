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
// Exports say they were made with the Android app: "LPN Pallet Log v4.0 (build 66, Android app)".
// (sw.js is copied only so the app can read its build number; it isn't started.)
edit("export.js", 'const out="LPN Pallet Log"+(v?" "+v:"")+(b?" (build "+b+")":"");', 'const out="LPN Pallet Log"+(v?" "+v:"")+(b?" (build "+b+", Android app)":" (Android app)");');
// No service worker.
edit("panels.js", 'if("serviceWorker" in navigator){', 'if(false&&"serviceWorker" in navigator){');
// The photo reader's worker, engine and language data come from lib/.
edit("compare.js", 'Tesseract.createWorker("eng")', 'Tesseract.createWorker("eng",1,window.LPN_TESS)');
// The page's own way of printing (a hidden frame) doesn't work inside the app: skip it, so a failed print saves and shares.
edit("compare.js", "fr.onload=()=>{try{fr.contentWindow.focus();", "fr.onload=()=>{try{if(window.LPN_APK)throw 0;fr.contentWindow.focus();");
// Print opens Android's own print screen first (android.js); if that can't, the PDF is saved and shared as above.
edit("compare.js", "async function printBuf(buf,fname,m){", "async function printBuf(buf,fname,m){if(window.LPN_APK_PRINT&&await window.LPN_APK_PRINT(buf,fname)){m.textContent=\"\";return}");

const tess = JSON.parse(fs.readFileSync(path.join(LIB, "tess.json"), "utf8"));
fs.writeFileSync(path.join(WWW, "android.js"), fs.readFileSync(path.join(__dirname, "android-shim.js"), "utf8").replace("/*TESS*/null", JSON.stringify(tess)));

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
