/* Checks: site config (config.js): features switched off, "in testing" notes, and a broken file. */
const { fs, path, ROOT, check, page } = require("../lib");
const vm = require("vm");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Site config (config.js)");
  // The file as it is in the repo: it must run, and use only the known feature names with true or false.
  const src = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, "core.js"), "utf8").match(/const FEATURES=(\[[^\]]*\])/)[1]);
  let cfg = null, err = "";
  let OP = Object.prototype;
  try { const ctx = vm.createContext({ window: {} }); vm.runInContext(src, ctx); cfg = ctx.window.LPN_CONFIG; OP = vm.runInContext("Object.prototype", ctx); } catch (e) { err = e.message; }
  const bad = [];
  if (cfg) {
    for (const part of ["features", "testing"]) { const o = cfg[part]; if (o !== undefined && (typeof o !== "object" || o === null || Array.isArray(o) || Object.getPrototypeOf(o) !== OP)) bad.push(part + " must be a plain { … } list"); }
    if (/__proto__|constructor|prototype/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""))) bad.push("config.js may only contain the feature names");
  }
  if (cfg && !bad.length) {
    for (const part of ["features", "testing"]) for (const [k, v] of Object.entries(cfg[part] || {})) { if (!known.includes(k)) bad.push(part + "." + k + " isn't a known feature"); if (typeof v !== "boolean") bad.push(part + "." + k + " must be true or false"); }
    for (const k of known) if (!Object.prototype.hasOwnProperty.call(cfg.features || {}, k)) bad.push("features." + k + " is missing");
  }
  check("config.js runs and only uses known feature names with true or false", cfg && !bad.length, err || bad);

  const withConfig = async (width, body) => {
    const q = await page(browser, width);
    await q.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body }));
    await q.goto(URL0); await q.waitForTimeout(400);
    return q;
  };
  const all = v => Object.fromEntries(known.map(k => [k, v]));

  // Everything off.
  p = await withConfig(375, "window.LPN_CONFIG=" + JSON.stringify({ features: all(false), testing: {} }) + ";");
  s = await p.evaluate(async () => {
    const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; };
    const out = { report: vis("btnReport"), cmp: vis("cmpCard"), scanBtn: vis("scanBtn"), welcome: !document.getElementById("hello").hidden };
    openFeedback(); out.fb = !document.getElementById("fbBox").hidden;
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render();
    document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    out.dmg = !!document.querySelector(".dmgrow"); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    // An FPP pallet gets no description box, by itself or when tapped (one already typed still shows).
    rows = []; addValue("VLT004040273", { type: "FPP", fsdu: false }); await new Promise(r => setTimeout(r, 150));
    out.fppAuto = !!document.querySelector(".descline"); if (document.activeElement) document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    out.fppTap = !!document.querySelector(".descline"); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    // Old manifest numbers and queued reports do nothing while those features are off.
    document.getElementById("cmpNums").value = "VLT004040265\nRBY006292169"; manLive(); out.track = !document.getElementById("manLive").hidden;
    fbSave([{ id: "q", kind: "idea", text: "x" }]); let sent = 0; const rf = window.fetch; window.fetch = async () => { sent++; return new Response("{}"); };
    out.flushed = await fbFlush(); window.fetch = rf; out.sent = sent; fbSave([]);
    out.pfx = (document.getElementById("cmpPfx").value = "VLT", getPfx().length);
    openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody");
    out.heads = [...g.querySelectorAll("h3")].map(h => h.textContent); out.toc = g.querySelectorAll(".guidetoc a").length;
    out.guideText = g.textContent; closeHelp();
    openHelp("settings", "Settings"); out.setText = document.getElementById("panelBody").textContent; closeHelp();
    openHelp("history", "Saved deliveries"); out.find = !!document.getElementById("histFind"); closeHelp();
    return out; });
  check("with every feature off: no Report button or box, Manifest check (or its tracking), Scan button, damage choices, FPP description box, welcome card, prefix filter or queued reports sent", !s.report && !s.fb && !s.cmp && !s.scanBtn && !s.dmg && !s.fppAuto && !s.fppTap && !s.welcome && !s.track && s.flushed === 0 && s.sent === 0 && s.pfx === 0, s);
  check("with every feature off the Guide leaves out those parts and is numbered 1 to 9 with no gaps", s.heads.length === 9 && s.heads.every((h, i) => h.startsWith((i + 1) + ". ")) && s.toc === 9 && !/Check against the manifest|Damaged pallet|FPP pallet:|Torch|Live scan|Scan by photo|Upload photo|Find an LPN|Share this app|Report a problem|tap Scan|Manifest photos and PDFs|the Manifest check once/.test(s.guideText) && /no button for sending reports in this copy/.test(s.guideText), { heads: s.heads, toc: s.toc });
  check("with every feature off Settings has no Share this app or Report sections, and Saved deliveries no Find box", !/Share this app|Report a problem or idea/.test(s.setText) && !s.find, s.setText.slice(0, 80));
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // Only photos off: PDFs and typing stay.
  p = await withConfig(375, "window.LPN_CONFIG=" + JSON.stringify({ features: Object.assign(all(true), { manifestPhotos: false, liveScan: false }), testing: {} }) + ";");
  s = await p.evaluate(() => { const vis = id => !document.getElementById(id).hidden; return { photo: vis("cmpPhotoBtn"), logPhoto: vis("cmpLogPhotoBtn"), pdf: vis("cmpPdfBtn"), presets: vis("pfxBox"), label: document.getElementById("cmpPdfBtn").closest(".grow").querySelector("label").textContent, live: vis("scan"), byPhoto: vis("photo"), upload: vis("upload"), tip: vis("scanTip"), scanBtn: vis("scanBtn") }; });
  check("with manifest photos off, PDFs stay and the step says Manifest PDFs; with Live scan off, Scan by photo and Upload photo stay and the Live scan tip goes", !s.photo && !s.logPhoto && s.pdf && !s.presets && s.label === "2. Manifest PDFs" && !s.live && s.byPhoto && s.upload && !s.tip && s.scanBtn, s);
  await p.ctx.close();

  // Every feature marked as in testing.
  p = await withConfig(375, "window.LPN_CONFIG=" + JSON.stringify({ features: all(true), testing: all(true) }) + ";");
  s = await p.evaluate(async () => {
    const notes = () => [...document.querySelectorAll(".testnote")].map(n => n.dataset.test);
    const out = { start: notes() };
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render();
    document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    out.dmg = !!document.querySelector(".dmgrow .testnote"); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    rows = [{ lpn: "VLT004040273", type: "FPP", fsdu: false }]; save(); render();
    document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    out.fpp = (() => { const n = document.querySelector('.dmgrow .testnote[data-test="fppDesc"]'), d = document.querySelector(".descline input"); return !!n && !!d && (d.getAttribute("aria-describedby") || "").split(" ").includes(n.id); })(); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    document.getElementById("cmpLogNums").value = "VLT004040265"; document.getElementById("cmpNums").value = "VLT004040265\nRBY006292169";
    document.getElementById("cmpCheck").click(); await new Promise(r => setTimeout(r, 100));
    out.share = !!document.querySelector('#cmpRes .testnote[data-test="shareMissing"]');
    openHelp("history", "Saved deliveries"); out.find = !!document.querySelector('#panelBody .testnote[data-test="findLpn"]'); closeHelp();
    openHelp("settings", "Settings"); out.shareApp = !!document.querySelector('#panelBody .testnote[data-test="shareApp"]'); closeHelp();
    out.text = document.querySelector('.testnote[data-test="report"]').textContent; out.photoText = document.querySelector('.testnote[data-test="manifestPhotos"]').textContent;
    out.scanNotes = [...document.querySelectorAll('#scanbox .testnote')].map(n => n.dataset.test + ":" + n.hidden).join(",");
    await startScan().catch(() => {}); await new Promise(r => setTimeout(r, 200));
    out.liveShown = [...document.querySelectorAll('#scanbox .testnote')].filter(n => !n.hidden).map(n => n.dataset.test).join(","); stopScan();
    out.torchHidden = document.querySelector('#scanbox .testnote[data-test="torch"]').hidden;
    return out; });
  check("marking features as in testing adds the note to each one", ["report", "manifestCheck", "manifestPhotos", "liveScan", "scanByPhoto", "photoUpload", "torch"].every(k => s.start.includes(k)) && s.dmg && s.fpp && s.share && s.find && s.shareApp, s);
  check("each testing note names its feature; the report one points to the problem report; scan and torch notes wait in the camera box", /^In testing: reports may not always arrive yet/.test(s.text) && /^In testing: Reading photos may not always work yet, so check what it gives you, and use Report a problem if something goes wrong\.$/.test(s.photoText) && s.torchHidden && s.scanNotes === "photoUpload:true,scanByPhoto:true,liveScan:true,torch:true" && s.liveShown === "liveScan", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // A config.js with a mistake: everything stays on, no notes.
  p = await withConfig(375, "window.LPN_CONFIG = { features: { report: false,, } };");
  s = await p.evaluate(() => ({ report: !document.getElementById("btnReport").hidden, cmp: !document.getElementById("cmpCard").hidden, notes: document.querySelectorAll(".testnote").length, ok: typeof render === "function" }));
  check("a config.js with a mistake leaves every feature on and the app working", s.report && s.cmp && s.notes === 0 && s.ok && p.errors.every(e => /Unexpected token|SyntaxError/.test(e)), { s, errors: p.errors });
  await p.ctx.close();
};
