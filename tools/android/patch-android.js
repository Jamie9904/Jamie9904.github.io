/*
  Offline Android app, step 4: adjusts the Android project that "npx cap add android" made in tools/android/android.
  Run: node tools/android/patch-android.js <versionCode> "<versionName>"
  - camera (Live scan, Scan by photo) and vibration permissions;
  - version number;
  - the app's own icon and a plain dark start-up screen instead of Capacitor's.
  The icons are drawn with the browser the checks already use (Playwright), so nothing else needs installing.
*/
const fs = require("fs");
const path = require("path");
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

// Draws a PNG: a w x h canvas filled with bg (or clear), with the icon centred at size s.
const pngSize = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const jobs = [];
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  const dir = path.join(RES, "mipmap-" + d); fs.mkdirSync(dir, { recursive: true });
  const leg = Math.round(48 * k), fg = Math.round(108 * k);
  jobs.push({ f: path.join(dir, "ic_launcher.png"), w: leg, h: leg, s: leg, bg: null });
  jobs.push({ f: path.join(dir, "ic_launcher_round.png"), w: leg, h: leg, s: leg, bg: null });
  jobs.push({ f: path.join(dir, "ic_launcher_foreground.png"), w: fg, h: fg, s: Math.round(fg * 0.72), bg: null });
}
// Start-up screen: the dark background with the icon in the middle, at each size Capacitor ships.
for (const d of fs.readdirSync(RES).filter(d => /^drawable/.test(d))) {
  const f = path.join(RES, d, "splash.png"); if (!fs.existsSync(f)) continue;
  const [w, h] = pngSize(f); jobs.push({ f, w, h, s: Math.round(Math.min(w, h) * 0.28), bg: BG });
}
if (!jobs.some(j => /splash/.test(j.f))) fail("found no start-up screen images to replace");
fs.writeFileSync(path.join(RES, "values", "ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
(async () => {
  const { chromium } = require("playwright");
  const b = await chromium.launch(), page = await b.newPage();
  const icon = "data:image/png;base64," + fs.readFileSync(ICON).toString("base64");
  for (const j of jobs) {
    const data = await page.evaluate(async ({ icon, j }) => {
      const im = new Image(); im.src = icon; await im.decode();
      const c = document.createElement("canvas"); c.width = j.w; c.height = j.h; const x = c.getContext("2d");
      if (j.bg) { x.fillStyle = j.bg; x.fillRect(0, 0, j.w, j.h); }
      x.imageSmoothingQuality = "high"; x.drawImage(im, Math.round((j.w - j.s) / 2), Math.round((j.h - j.s) / 2), j.s, j.s);
      return c.toDataURL("image/png").split(",")[1];
    }, { icon, j });
    fs.writeFileSync(j.f, Buffer.from(data, "base64"));
  }
  await b.close();
console.log("Android project set up: version " + name + " (" + code + "), camera and vibration allowed, app icon and start-up screen in place");
})().catch(e => fail(e.stack || e.message));
