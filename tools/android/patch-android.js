/*
  Offline Android app, step 4: adjusts the Android project that "npx cap add android" made in tools/android/android.
  Run: node tools/android/patch-android.js <versionCode> "<versionName>"
  - camera (Live scan, Scan by photo) and vibration permissions;
  - version number;
  - the app's own icon (with a themed version for Android 13+) and a plain dark start-up screen instead of Capacitor's;
  - the Android-only code in native/ (edge-to-edge screen, ML Kit barcodes, printing, screen on, opening files),
    the file types the app opens, and the Scan and Manifest check shortcuts.
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
// The app's data stays on the phone: no copies in Google's backups (the owner keeps backups with Download backup).
edit(man, /android:allowBackup="true"/, 'android:allowBackup="false"');
edit(path.join(AND, "build.gradle"), /versionCode \d+/, "versionCode " + code);
edit(path.join(AND, "build.gradle"), /versionName "[^"]*"/, 'versionName "' + name.replace(/"/g, "") + '"');

// Android-only code (tools/android/native): edge-to-edge screen, ML Kit barcodes, printing, keeping the screen on, opened files.
const JAVA = path.join(AND, "src", "main", "java", "io", "github", "jamie9904", "lpnlog");
if (!fs.existsSync(path.join(JAVA, "MainActivity.java"))) fail("Capacitor's MainActivity.java isn't where it was expected (" + JAVA + ")");
for (const f of fs.readdirSync(path.join(__dirname, "native"))) fs.copyFileSync(path.join(__dirname, "native", f), path.join(JAVA, f));
edit(path.join(AND, "build.gradle"), /dependencies \{/, "dependencies {\n    implementation 'com.google.mlkit:barcode-scanning:17.3.0' // ML Kit, model inside the app (no internet)");
// Files people open or share into the app, and the home-screen shortcuts.
const MIMES = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv", "text/comma-separated-values", "application/json", "image/*"];
const dataLines = MIMES.map(m => `                <data android:mimeType="${m}" />`).join("\n");
edit(man, /(<activity[\s\S]*?android:name="[\w.]*MainActivity"[\s\S]*?)(\s*<\/activity>)/, `$1
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="content" />
${dataLines}
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
${dataLines}
            </intent-filter>
            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />$2`);
fs.mkdirSync(path.join(RES, "xml"), { recursive: true });
const sc = (id, label, action) => `    <shortcut android:shortcutId="${id}" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/sc_${id}" android:shortcutLongLabel="@string/sc_${id}">
        <intent android:action="io.github.jamie9904.lpnlog.${action}" android:targetPackage="io.github.jamie9904.lpnlog" android:targetClass="io.github.jamie9904.lpnlog.MainActivity" />
    </shortcut>`;
fs.writeFileSync(path.join(RES, "xml", "shortcuts.xml"), `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${sc("scan", "Scan", "SCAN")}
${sc("manifest", "Manifest check", "MANIFEST")}
</shortcuts>
`);
edit(path.join(RES, "values", "strings.xml"), /<\/resources>/, `    <string name="sc_scan">Scan</string>
    <string name="sc_manifest">Manifest check</string>
</resources>`);
// Themed icon (Android 13+): the icon's shapes in one colour, which Android tints to match the phone.
let mono = 0;
for (const f of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  const p = path.join(RES, "mipmap-anydpi-v26", f); if (!fs.existsSync(p)) continue;
  let x = fs.readFileSync(p, "utf8"); if (!/<monochrome/.test(x)) x = x.replace(/<\/adaptive-icon>/, '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>');
  fs.writeFileSync(p, x); mono++;
}
if (!mono) fail("found no adaptive icon files to add the themed icon to");

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
  jobs.push({ f: path.join(dir, "ic_launcher_monochrome.png"), w: fg, h: fg, s: Math.round(fg * 0.72), bg: null, mono: true });
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
      if (j.mono) { // white where the icon differs from its navy background, see-through elsewhere
        const d = x.getImageData(0, 0, j.w, j.h), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const dist = Math.hypot(p[i] - 12, p[i + 1] - 24, p[i + 2] - 48); const a = p[i + 3] * Math.min(1, Math.max(0, (dist - 40) / 80));
          p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = a; }
        x.putImageData(d, 0, 0);
      }
      return c.toDataURL("image/png").split(",")[1];
    }, { icon, j });
    fs.writeFileSync(j.f, Buffer.from(data, "base64"));
  }
  await b.close();
console.log("Android project set up: version " + name + " (" + code + "), camera and vibration allowed, native code, opened files, shortcuts, app icon (themed too) and start-up screen in place");
})().catch(e => fail(e.stack || e.message));
