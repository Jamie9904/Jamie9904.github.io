/* Checks: the pallet log switch (palletLog in config.js). Off leaves only the Manifest check.
   Named 230 so it runs before 23-offline, which stays last. */
const { fs, path, ROOT, check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Pallet log switch");
  // (the pallet log off, everything else as the owner has it, except Report on so this checks it stays on)
  const src = fs.readFileSync(path.join(ROOT, "config.js"), "utf8").replace(/^(\s*palletLog:\s*)true,/m, "$1false,").replace(/^(\s*report:\s*)false,/m, "$1true,");
  p = await page(browser, 375);
  await p.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: src }));
  await p.addInitScript(() => { try { localStorage.setItem("lpncfg", JSON.stringify({ simple: true, keys: true })); localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "VLT004040265", type: "BB", fsdu: false }] })); } catch (e) {} });
  await p.goto(URL0); await p.waitForTimeout(400);
  s = await p.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; };
    return { del: vis("delCard"), entry: vis("entryCard"), log: vis("logCard"), cmp: vis("cmpCard"), open: !document.getElementById("cmpBody").hidden && document.getElementById("cmpToggle").getAttribute("aria-expanded") === "true",
      useLog: vis("cmpUseLog"), hist: vis("cmpHist"), liveNote: vis("cmpLiveNote"), upload: vis("cmpLogBtn"), simple: document.documentElement.classList.contains("simple"), latest: vis("toLatest"), hello: vis("hello"),
      feats: ["liveScan", "twoPhones", "tallySheet", "noLpn", "welcome", "manifestCheck", "report"].map(k => k + ":" + feat(k)).join(), rows: rows.length }; });
  check("with the pallet log off only the Manifest check is left, open, without Use current log or saved deliveries", !s.del && !s.entry && !s.log && s.cmp && s.open && !s.useLog && !s.hist && !s.liveNote && s.upload && !s.latest, s);
  check("Simple view can't hide the Manifest check then, and the log's own features are off with it (the blank tally sheet stays)", !s.simple && s.feats === "liveScan:false,twoPhones:false,tallySheet:true,noLpn:false,welcome:false,manifestCheck:true,report:true", s);
  check("nothing saved is lost: the log is still on the phone for when it's switched back on", s.rows === 1, s.rows);
  // The blank tally sheet stays printable: in the Manifest check's step 1, with its message there.
  s = await p.evaluate(async () => { const b = document.getElementById("cmpTally"), out = { vis: !!b && !b.hidden && b.getClientRects().length > 0 && b.getBoundingClientRect().height >= 40 };
    let printed = null; const real = window.printBuf; window.printBuf = async (buf, name, m) => { printed = name; m.textContent = ""; }; const rb = window.buildTallyPdf; window.buildTallyPdf = async () => new ArrayBuffer(8);
    await b.onclick(); out.printed = printed; out.msg = document.getElementById("cmpMsg").textContent; window.printBuf = real; window.buildTallyPdf = rb;
    openHelp("guide", "How to use this app"); out.guide = /Blank tally sheet\s*\(in step 1\)/.test(document.getElementById("panelBody").textContent); closeHelp(); return out; });
  check("with the pallet log off, Blank tally sheet is in the Manifest check (step 1) and prints, and the Guide says where it is", s.vis && s.printed === "LPN-tally-sheet.pdf" && !/Couldn/.test(s.msg) && s.guide, s);
  s = await p.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); addValue("RUN001830763"); const before = rows.length; window.__undone = false; undoStack.push({ text: "test", fn: () => { window.__undone = true; } });
    for (const k of ["2", "f"]) { document.body.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); await wait(200); }
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })); await wait(200);
    return { type: document.getElementById("type").value, fsdu: document.getElementById("fsdu").checked, rows: rows.length, before, undone: window.__undone }; });
  check("keyboard shortcuts and Ctrl+Z do nothing to the hidden log", s.type !== "FMCG" && !s.fsdu && s.rows === s.before && !s.undone, s);
  s = await p.evaluate(() => { openHelp("settings", "Settings"); const st = { logging: !document.getElementById("setLogging").hidden, scanner: !document.getElementById("setScanner").hidden, text: document.getElementById("panelBody").textContent }; closeHelp();
    openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody").textContent, heads = [...document.querySelectorAll("#panelBody h3")].map(h => h.textContent); closeHelp(); return { st, g, heads }; });
  check("Settings leaves out the logging settings and the scanner test", !s.st.logging && !s.st.scanner && /Comparison/.test(s.st.text), s.st.logging + " " + s.st.scanner);
  check("the Guide covers only the Manifest check and the general parts, numbered with no gaps", s.heads.join("|") === "1. Check against the manifest|2. Install it on your phone|3. Settings and good to know|4. Your data and privacy"
    && /The Manifest check is the whole page in this copy/.test(s.g) && /choose an exported file, or a photo of a printed log, or type or paste the numbers\./.test(s.g) && !/Use current log|While you scan|Simple view|On a computer:|by Delivery/.test(s.g)
    && /text size and date format, and Share this app\./.test(s.g) && /The \? by Manifest check opens/.test(s.g), s.heads);
  s = await p.evaluate(async () => { document.querySelector("#cmpCard .helpq").click(); await new Promise(r => setTimeout(r, 50)); const f = document.activeElement; const t = f && f.textContent; closeHelp(); return t; });
  check("the ? by Manifest check still opens its part of the Guide", s === "1. Check against the manifest", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
  // On (as now): the Guide's Settings line reads as before, with the log's settings.
  p = await page(browser, 375); await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(() => { openHelp("guide", "How to use this app"); const g = document.getElementById("panelBody").textContent; closeHelp(); openHelp("settings", "Settings"); const l = !document.getElementById("setLogging").hidden; closeHelp(); return { g, l, open: !document.getElementById("cmpBody").hidden }; });
  check("with the pallet log on, everything is as before (Settings line, logging settings, Manifest check folded)", /text size and date format, plus the default pallet type, warnings, sound and vibration, and Share this app\./.test(s.g) && s.l && !s.open && /Tap the Manifest check heading to open it/.test(s.g), s.l);
  check("no script errors with it on", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
