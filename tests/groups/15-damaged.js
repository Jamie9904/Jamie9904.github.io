/* Checks: damaged. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Damaged pallets and Share missing list");
    const q = await page(browser, 360, { excel: true });
    await q.setViewportSize({ width: 360, height: 740 });
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: false }]; save(); render(); });
    // Tap the LPN, then a reason: the tap lands even though the LPN box had focus.
    await q.click("#body .lpnedit"); await q.waitForTimeout(100);
    let s = await q.evaluate(() => ({ choices: [...document.querySelectorAll(".dmgbox button")].filter(b => b.offsetParent).map(b => b.textContent), fits: [...document.querySelectorAll(".dmgbox button")].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().right <= innerWidth && b.getBoundingClientRect().height >= 44) }));
    check("tapping an LPN shows the damage choices under it, all on screen and big enough to tap", JSON.stringify(s.choices) === '["None","Crushed","Wet","Other…"]' && s.fits, s);
    await q.click(".dmgbox button:has-text('Wet')"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ dmg: rows[0].dmg, tag: document.querySelector("#body tr .dmgtag") && document.querySelector("#body tr .dmgtag").textContent, saved: JSON.parse(localStorage.getItem("lpnlog")).rows[0].dmg, open: !!document.querySelector(".dmgrow"), undo: document.getElementById("undoBar").textContent }));
    check("choosing Wet marks the pallet damaged, shows it in the log and saves it", s.dmg === "Wet" && s.tag === "Damaged: Wet" && s.saved === "Wet" && !s.open && /Marked VLT004040265 as damaged \(Wet\)/.test(s.undo), s);
    // Keyboard: Enter on the LPN, Tab to the choices, Other with typed text.
    await q.focus('#body .lpnedit[data-i="1"]'); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    await q.keyboard.press("Tab"); s = await q.evaluate(() => document.activeElement.textContent);
    await q.click(".dmgbox button:has-text('Other')"); await q.waitForTimeout(50);
    await q.keyboard.type("Torn label"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const s2 = await q.evaluate(() => ({ dmg: rows[1].dmg, focus: document.activeElement.className, label: document.querySelector('#body .lpnedit[data-i="1"]').getAttribute("aria-label") }));
    check("keyboard: Tab from the LPN box goes to the damage choices; Other takes typed text and focus comes back", s === "None" && s2.dmg === "Torn label" && s2.focus === "lpnedit" && /damaged: Torn label/.test(s2.label), { s, s2 });
    // Tab past the last choice: the change is kept and focus stays on that pallet.
    await q.focus('#body .lpnedit[data-i="0"]'); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    // One Tab per choice in the row (damage choices, then Refused when it is switched on), then one more past the last.
    const nChoices = await q.evaluate(() => document.querySelectorAll(".dmgrow button").length);
    for (let k = 0; k < nChoices + 1; k++) await q.keyboard.press("Tab");
    await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.className, i: document.activeElement.dataset && document.activeElement.dataset.i, open: !!document.querySelector(".dmgrow"), other: null }));
    check("Tab past the last damage choice closes them and keeps focus on that pallet", s.focus === "lpnedit" && s.i === "0" && !s.open, s);
    // The choices open in view, not under the phone entry bar, even for the last pallet.
    s = await q.evaluate(async () => { rows = rows.concat(Array.from({ length: 12 }, (_, k) => ({ lpn: "QUB0018992" + String(10 + k), type: "BB", fsdu: false }))); save(); render();
      const last = [...document.querySelectorAll("#body .lpnedit")].pop(); last.scrollIntoView({ block: "end" }); await new Promise(r => setTimeout(r, 100));
      last.click(); await new Promise(r => setTimeout(r, 300));
      const box = document.querySelector(".dmgbox").getBoundingClientRect(), bar = document.querySelector(".entry").getBoundingClientRect();
      const ae = document.activeElement; ae.blur(); await new Promise(r => setTimeout(r, 50));
      rows = rows.slice(0, 2); save(); render(); return { boxBottom: Math.round(box.bottom), barTop: Math.round(bar.top) }; });
    check("on a phone, the damage choices open above the entry bar, even for the last pallet", s.boxBottom <= s.barTop, s);
    // Exports and import keep the damage note.
    s = await q.evaluate(async () => { window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
      const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); }));
      const csv = "#,LPN,Pallet Type,FSDU\n1,VLT004040265,BB,No\n2,RUN0001830763,FMCG,No\n\nDamaged pallet,VLT004040265: Wet\nDamaged pallet,RUN0001830763: Torn label\nDamaged pallet,NOTHERE: Wet";
      const imp = await parseExported(new File([csv], "x.csv"));
      return { inSheet: vals.filter(v => v === "Damaged pallet").length, val: vals.filter(v => /: (Wet|Torn label)$/.test(v)), imp: imp.rows.map(r => r.dmg || "") }; });
    check("the Excel export lists damaged pallets in Delivery Details, and importing puts the notes back", s.inSheet === 2 && JSON.stringify(s.val) === '["VLT004040265: Wet","RUN0001830763: Torn label"]' && JSON.stringify(s.imp) === '["Wet","Torn label"]', s);
    s = await q.evaluate(() => { markExported(); const a = exported.sig === logSig(); rows[1].dmg = "Crushed"; const b = exported.sig === logSig(); rows[1].dmg = "Torn label"; return { a, b }; });
    check("marking a pallet damaged after exporting counts as a change not yet exported", s.a && !s.b, s);
    // Clearing with None, and Undo.
    await q.click("#body .lpnedit"); await q.waitForTimeout(50); await q.click(".dmgbox button.none"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ dmg: rows[0].dmg, tag: !!document.querySelector("#body tr:first-child .dmgtag") }));
    await q.click("#undoBar button"); await q.waitForTimeout(100);
    const back = await q.evaluate(() => rows[0].dmg);
    check("None removes the damage note, and Undo puts it back", s.dmg === undefined && !s.tag && back === "Wet", { s, back });
    s = await q.evaluate(() => { const r = cleanRows([{ lpn: "A1", type: "BB", dmg: { x: 1 } }, { lpn: "A2", type: "BB", dmg: "  very   long " + "x".repeat(80) }]); return [r[0].dmg, r[1].dmg.length, r[1].dmg.slice(0, 15)]; });
    check("a damage note from a backup or import is plain text up to 60 characters", s[0] === undefined && s[1] === 60 && s[2] === "very long xxxxx", s);
    // Share missing list.
    s = await q.evaluate(async () => { closeHelp && closeHelp(); document.getElementById("cmpToggle").click();
      document.getElementById("cmpLogNums").value = "VLT004040265\nRUN0001830763\nQUB001899182"; document.getElementById("cmpNums").value = "VLT004040265\nRUN0001830763\nRBY006292169\nRBY006292211";
      cmpTrailer = "TR4471"; document.getElementById("cmpDate").value = "2026-11-01"; document.getElementById("cmpCheck").click(); await new Promise(r => setTimeout(r, 100));
      let shared = null; navigator.share = async o => { shared = o; };
      document.getElementById("cmpShare").click(); await new Promise(r => setTimeout(r, 50));
      // Without the share menu, the list is copied.
      let copied = null; navigator.share = undefined; navigator.clipboard.writeText = async t => { copied = t; };
      document.getElementById("cmpShare").click(); await new Promise(r => setTimeout(r, 50));
      return { shared, copied, msg: document.getElementById("cmpMsg").textContent }; });
    const want = "Manifest check 01/11/2026, trailer TR4471\nMissing from the log (2): RBY006292169, RBY006292211\nOn the log only, to book in (1): QUB001899182\nMatched: 2 of 4 on the manifest";
    check("Share missing list sends the missing and extra LPNs as plain text through the share menu", s.shared && s.shared.text === want, s.shared);
    check("without a share menu, the list is copied and the message says so", s.copied === want && /copied/.test(s.msg), s);
    // Share this app (Settings) and Your data and privacy (Guide).
    s = await q.evaluate(async () => { document.getElementById("btnSet").click(); await new Promise(r => setTimeout(r, 200));
      const img = document.querySelector("#panelBody .shareqr"); await new Promise(r => { if (img.complete) r(); else img.onload = img.onerror = r; });
      let shared = null; navigator.share = async o => { shared = o; }; await document.getElementById("shareApp").onclick();
      let copied = null; navigator.share = undefined; navigator.clipboard.writeText = async t => { copied = t; }; await document.getElementById("shareApp").onclick();
      const r = img.getBoundingClientRect();
      const out = { loaded: img.naturalWidth > 0, alt: img.alt, w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth, url: shared && shared.url, copied, msg: document.getElementById("shareMsg").textContent };
      closeHelp(); document.getElementById("btnGuide").click(); await new Promise(r => setTimeout(r, 200));
      const pv = document.getElementById("g10"); out.privacy = pv ? pv.textContent : null; out.toc = !!document.querySelector('.guidetoc a[data-g="g10"]');
      out.text = pv ? pv.nextElementSibling.textContent : ""; closeHelp(); return out; });
    check("Settings has Share this app: a QR code that loads, and Send the link shares or copies the app's address", s.loaded && /QR code/.test(s.alt) && s.w === 180 && s.right <= s.vw && s.url === "https://jamie9904.github.io/" && s.copied === "https://jamie9904.github.io/" && /copied/.test(s.msg), s);
    check("the Guide has a Your data and privacy section, in its contents, saying what a report sends", /Your data and privacy/.test(s.privacy || "") && s.toc && /only thing that leaves the phone/.test(s.text) && /only Jamie/.test(s.text), { p: s.privacy, toc: s.toc });
    // Desktop: a long note wraps instead of pushing FSDU and ✕ out of view.
    await q.setViewportSize({ width: 1300, height: 900 }); await q.waitForTimeout(150);
    s = await q.evaluate(() => { cfg.size = "1.25"; applyCfg(); rows[0].dmg = "Corner crushed and wrap split along one whole side x"; render();
      const t = document.querySelector("#body").closest("table"), w = t.parentElement; const r = { table: Math.round(t.scrollWidth), box: Math.round(w.clientWidth) }; cfg.size = "1"; applyCfg(); return r; });
    check("on desktop with Extra large text, a long damage note wraps and the table still fits", s.table <= s.box, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
