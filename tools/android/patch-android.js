/*
  Offline Android app, step 4: adjusts the Android project that "npx cap add android" made in tools/android/android.
  Run: node tools/android/patch-android.js <versionCode> "<versionName>"
  - camera (Live scan, Scan by photo) and vibration permissions;
  - version number;
  - the app's own icon and a plain dark start-up screen instead of Capacitor's.
  Needs ImageMagick (convert), which GitHub's Ubuntu machines have.
*/
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const AND = path.join(__dirname, "android", "app");
const RES = path.join(AND, "src", "main", "res");
const ICON = path.join(__dirname, "..", "..", "icon-512.png");
const BG = "#0c1830";
const GH = !!process.env.GITHUB_ACTIONS;
const fail = m => { console.log((GH ? "::error title=Android project::" : "FAIL ") + m); process.exit(1); };
const [code, name] = process.argv.slice(2);
if (!/^\d+$/.test(code || "") || !name) fail("usage: patch-android.js <versionCode> <versionName>");
const edit = (f, from, to) => { let s = fs.readFileSync(f, "utf8"); if (!from.test(s)) fail(path.basename(f) + ": couldn't find " + from); fs.writeFileSync(f, s.replace(from, to)); };

const man = path.join(AND, "src", "main", "AndroidManifest.xml");
edit(man, /(<manifest[^>]*>)/, `$1
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />`);
edit(path.join(AND, "build.gradle"), /versionCode \d+/, "versionCode " + code);
edit(path.join(AND, "build.gradle"), /versionName "[^"]*"/, 'versionName "' + name.replace(/"/g, "") + '"');

const im = (...a) => execFileSync("convert", a);
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  const dir = path.join(RES, "mipmap-" + d); fs.mkdirSync(dir, { recursive: true });
  const leg = Math.round(48 * k), fg = Math.round(108 * k), inner = Math.round(108 * k * 0.72);
  im(ICON, "-resize", leg + "x" + leg, path.join(dir, "ic_launcher.png"));
  im(ICON, "-resize", leg + "x" + leg, path.join(dir, "ic_launcher_round.png"));
  im("-size", fg + "x" + fg, "xc:none", "(", ICON, "-resize", inner + "x" + inner, ")", "-gravity", "center", "-composite", path.join(dir, "ic_launcher_foreground.png"));
}
const bgXml = path.join(RES, "values", "ic_launcher_background.xml");
fs.writeFileSync(bgXml, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
// Start-up screen: the dark background with the icon in the middle, at each size Capacitor ships.
let splash = 0;
for (const d of fs.readdirSync(RES).filter(d => /^drawable/.test(d))) {
  const f = path.join(RES, d, "splash.png"); if (!fs.existsSync(f)) continue;
  const [w, h] = String(execFileSync("identify", ["-format", "%w %h", f])).trim().split(" ").map(Number);
  const s = Math.round(Math.min(w, h) * 0.28);
  im("-size", w + "x" + h, "xc:" + BG, "(", ICON, "-resize", s + "x" + s, ")", "-gravity", "center", "-composite", f);
  splash++;
}
if (!splash) fail("found no start-up screen images to replace");
console.log("Android project set up: version " + name + " (" + code + "), camera and vibration allowed, app icon and start-up screen in place");
