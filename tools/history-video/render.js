// Draws every frame of the build-history video from stage.html, then mixes voice, music and sound effects.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const D = __dirname, FPS = 25, FR = path.join(D, "out", "frames");
const vo = JSON.parse(fs.readFileSync(path.join(D, "out/vo.json")));
const box = id => { try { return JSON.parse(fs.readFileSync(path.join(D, "out", "shots", id + ".json"))).box; } catch (e) { return null; } };
const shot = id => "file://" + path.join(D, "out", "shots", id + ".png");
const INFO = {
  b13: ["26 Oct 2026", 13, "The earliest build saved: every pallet logged by type, with running totals", "Build 13, the earliest one saved: every pallet logged by type, with running totals."],
  b19: ["26 Oct 2026", 19, "Trailer and seal numbers, and live tracking against the manifest", "Build 19 added trailer and seal numbers, and live tracking against the manifest."],
  b23: ["27 Oct 2026", 23, "Undo the last pallet in one tap", "Build 23: undo the last pallet in one tap."],
  b34: ["31 Oct 2026", 34, "The Manifest check: reads manifest photos and PDFs, and shows what’s missing and what’s extra", "By build 34, the Manifest check reads photos and PDFs of the manifest, and shows what’s missing and what’s extra."],
  b44: ["1 Nov 2026", 44, "A Report button for problems at the dock", "Build 44: a Report button, so problems get flagged straight from the dock."],
  b49: ["1 Nov 2026", 49, "Damaged pallets: crushed, wet or in your own words", "Build 49: damaged pallets, marked crushed, wet, or in your own words."],
  b52: ["1 Nov 2026", 52, "Version 4.0: ready to share, with a welcome card and demo video", "Version 4.0, build 52: ready to share, with a welcome card and a demo video."],
  b56: ["5 Nov 2026", 56, "Pallets with no LPN, and descriptions for FPP pallets", "Then pallets with no LPN, and descriptions for FPP pallets."],
  b62: ["11 Nov 2026", 62, "Refused pallets, sent back with the driver", "Build 62: refused pallets, sent back with the driver."],
  b65: ["12 Nov 2026", 65, "Scan by photo, Upload photo, and the printed LPN read when a barcode won’t scan", "And build 65: Scan by photo, Upload photo, and the printed LPN read when a barcode won’t scan."],
};
const ORDER = ["intro", "b13", "b19", "b23", "b34", "b44", "b49", "b52", "b56", "b62", "b65", "outro"];
let t = 0; const scenes = [];
for (const id of ORDER) {
  const v = vo[id].duration, dur = Math.max(id === "outro" ? 4.6 : 4.3, v + (id === "intro" ? 1.4 : 1.1));
  const s = { id, start: +t.toFixed(3), end: +(t + dur).toFixed(3), voStart: t + 0.35 };
  if (id === "intro") Object.assign(s, { kind: "intro", sub: "Seventeen days, fifty-two builds. Here’s how the LPN Pallet Log grew." });
  else if (id === "outro") Object.assign(s, { kind: "outro", sub: "" });
  else { const [date, build, head, sub] = INFO[id]; Object.assign(s, { kind: "build", shot: shot(id), box: box(id), date, build, head, sub }); }
  scenes.push(s); t += dur;
}
const total = t;
(async () => {
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto("file://" + path.join(D, "stage.html"));
  await p.evaluate(({ scenes, first, last }) => { window.SCENES = scenes; window.RAIL = [13, 19, 23, 34, 44, 49, 52, 56, 62, 65]; window.FIRST = first; window.LAST = last; }, { scenes, first: shot("b13"), last: shot("b65") });
  // Load every screenshot once so no frame is drawn before its picture.
  await p.evaluate(async urls => { await Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))); await document.fonts.ready; }, ORDER.filter(x => INFO[x]).map(shot));
  const n = Math.ceil(total * FPS);
  for (let f = 0; f < n; f++) {
    await p.evaluate(tt => window.renderAt(tt), f / FPS);
    if (f % 25 === 0) await p.waitForTimeout(30); // let images decode on the first frames of each scene
    await p.screenshot({ path: path.join(FR, String(f).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await b.close();
  fs.writeFileSync(path.join(D, "out/timeline.json"), JSON.stringify({ total, scenes }, null, 1));
  // Audio: voice lines at their scene starts, a whoosh on each change, the beat under it all (ducked under the voice).
  const sfx = path.join(process.env.HOME, "app-demos/lpn-pallet-log/public/sfx");
  const inp = ["-framerate", String(FPS), "-i", path.join(FR, "%05d.jpg")], flt = [], vl = [], fx = []; let k = 1;
  for (const s of scenes) { inp.push("-i", vo[s.id].file); const d = Math.round(s.voStart * 1000); flt.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${d}|${d}[v${k}]`); vl.push(`[v${k}]`); k++; }
  for (const s of scenes.slice(1)) { inp.push("-i", path.join(sfx, "whoosh.wav")); const d = Math.max(0, Math.round((s.start - 0.05) * 1000)); flt.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.3,adelay=${d}|${d}[f${k}]`); fx.push(`[f${k}]`); k++; }
  inp.push("-stream_loop", "-1", "-i", path.join(sfx, "starter-beat.mp3")); const beat = k;
  flt.push(`${vl.join("")}amix=inputs=${vl.length}:normalize=0,apad=whole_dur=${total.toFixed(2)}[vo]`);
  flt.push(`${fx.join("")}amix=inputs=${fx.length}:normalize=0,apad=whole_dur=${total.toFixed(2)}[fx]`);
  flt.push(`[${beat}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total.toFixed(2)},volume=0.22,afade=t=in:d=1,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5[bed]`);
  flt.push("[vo]asplit=2[vo1][vo2]", "[bed][vo2]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=600[duck]", "[vo1][duck][fx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]");
  const out = path.join(D, "out/lpn-pallet-log-build-history.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inp, "-filter_complex", flt.join(";"), "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(2), "-movflags", "+faststart", out]);
  console.log("Wrote", out, total.toFixed(1) + " s", n + " frames");
})();
