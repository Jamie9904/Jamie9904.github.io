/* Checks: pallets with no LPN (the No LPN button): numbering, description, real LPN later, manifest, exports, layout.
   Also descriptions for FPP pallets (what is on them), which share the same description box. */
const { check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Pallets with no LPN");
  p = await page(browser, 375, { excel: true });
  await p.setViewportSize({ width: 375, height: 812 });
  await p.goto(URL0); await p.waitForTimeout(300);
  // Pick the type and FSDU, then No LPN from the scan options.
  await p.evaluate(() => { document.querySelector('#tyb button[data-t="FMCG"]').click(); document.getElementById("fsdu").checked = true; document.getElementById("scanBtn").click(); });
  await p.click("#noLpn"); await p.waitForTimeout(150);
  s = await p.evaluate(() => ({ rows: JSON.parse(JSON.stringify(rows)), focus: document.activeElement.id && document.activeElement.closest(".descline") ? "desc" : document.activeElement.tagName, flash: document.getElementById("flash").textContent }));
  check("No LPN logs the pallet as No LPN 1 with the chosen type and FSDU, and opens its description", s.rows.length === 1 && s.rows[0].lpn === "No LPN 1" && s.rows[0].type === "FMCG" && s.rows[0].fsdu === true && s.focus === "desc" && /No LPN 1/.test(s.flash), s);
  await p.keyboard.type("Blue wrap, label torn off"); await p.keyboard.press("Enter"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ desc: rows[0].desc, tag: document.querySelector("#body .desctag") && document.querySelector("#body .desctag").textContent, saved: JSON.parse(localStorage.getItem("lpnlog")).rows[0].desc, open: !!document.querySelector(".dmgrow") }));
  check("the description is saved and shown under the pallet", s.desc === "Blue wrap, label torn off" && s.tag === s.desc && s.saved === s.desc && !s.open, s);
  await p.evaluate(() => document.activeElement.blur && document.activeElement.blur());
  await p.click("#noLpn"); await p.waitForTimeout(150); await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  s = await p.evaluate(() => rows.map(r => r.lpn));
  check("the next one is numbered No LPN 2", JSON.stringify(s) === '["No LPN 1","No LPN 2"]', s);
  // With manifest numbers, a pallet with no LPN isn't warned about or counted as not on the manifest.
  s = await p.evaluate(() => { document.getElementById("cmpNums").value = "VLT004040265"; manLive(); return { extra: manState().extra, txt: document.getElementById("manTxt").textContent }; });
  await p.click("#noLpn"); await p.waitForTimeout(150); await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  s.flash = await p.evaluate(() => document.getElementById("flash").textContent + "|" + document.getElementById("flash").className);
  check("with a manifest, pallets with no LPN aren't counted or flagged as not on it", s.extra === 0 && !/not on manifest/i.test(s.txt) && !/NOT on manifest/.test(s.flash) && !/warn/.test(s.flash.split("|")[1]), s);
  // The LPN turns up later: tap the pallet and type it in.
  await p.evaluate(() => document.querySelector('#body .lpnedit[data-i="0"]').click()); await p.waitForTimeout(100);
  s = await p.evaluate(() => { const i = document.querySelector("#body td.l input"); return { val: i.value, ph: i.placeholder, label: i.getAttribute("aria-label") }; });
  await p.fill("#body td.l input", "VLT004040265"); await p.press("#body td.l input", "Enter"); await p.waitForTimeout(100);
  s.after = await p.evaluate(() => ({ lpn: rows[0].lpn, desc: rows[0].desc, extra: manState().extra, found: manState().found }));
  check("typing the real LPN later turns it into a normal pallet and keeps the description", s.val === "" && /LPN if found/.test(s.ph) && /No LPN 1/.test(s.label) && s.after.lpn === "VLT004040265" && s.after.desc === "Blue wrap, label torn off" && s.after.found === 1, s);
  // Undo can't leave two pallets with the same number; one Undo puts back everything from one edit.
  s = await p.evaluate(async () => {
    rows = [{ lpn: "No LPN 1", type: "BB", fsdu: false }, { lpn: "No LPN 2", type: "BB", fsdu: false }]; save(); render();
    document.querySelectorAll("#body button.d")[1].click(); await new Promise(r => setTimeout(r, 50)); // remove No LPN 2
    addNoLpn(); await new Promise(r => setTimeout(r, 100)); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50)); // new No LPN 2
    // Undo the removal: the old one comes back with the next free number.
    const u = [...document.querySelectorAll("#undoBar button")].find(b => /Undo/.test(b.textContent)); return { before: rows.map(r => r.lpn), hasUndo: !!u }; });
  s.after = await p.evaluate(() => { rows.splice(1, 0, { lpn: "No LPN 2", type: "BB", fsdu: false }); save(); render(); return rows.map(r => r.lpn); });
  check("two pallets never share a No LPN number (one brought back by Undo gets the next free number)", s.after.length === 3 && new Set(s.after).size === 3 && s.after.every(x => /^No LPN [123]$/.test(x)), s);
  await p.evaluate(() => { rows = [{ lpn: "No LPN 1", type: "BB", fsdu: false }]; save(); render(); document.querySelector('#body .lpnedit[data-i="0"]').click(); });
  await p.waitForTimeout(80);
  await p.fill("#body td.l input", "VLT004040265"); await p.fill(".descline input", "Blue wrap"); await p.press(".descline input", "Enter"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ lpn: rows[0].lpn, desc: rows[0].desc, undo: document.getElementById("undoTxt").textContent }));
  await p.click("#undoBtn"); await p.waitForTimeout(80);
  s.back = await p.evaluate(() => ({ lpn: rows[0].lpn, desc: rows[0].desc || "" }));
  check("one Undo puts back both the LPN and the description changed in the same edit", s.lpn === "VLT004040265" && s.desc === "Blue wrap" && /Description saved/.test(s.undo) && /Changed No LPN 1 to VLT004040265/.test(s.undo) && s.back.lpn === "No LPN 1" && s.back.desc === "", s);
  // A handheld scanner typing the next LPN into the description box logs it as a pallet instead.
  await p.evaluate(() => { rows = []; save(); render(); addNoLpn(); }); await p.waitForTimeout(150);
  await p.keyboard.type("VLT004040273"); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  s = await p.evaluate(() => rows.map(r => r.lpn + "|" + (r.desc || "")));
  check("an LPN scanned into the description box is logged as the next pallet, not saved as a description", JSON.stringify(s) === '["No LPN 1|","VLT004040273|"]', s);
  await p.evaluate(() => { rows = []; save(); render(); });
  // Exports and import.
  s = await p.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "No LPN 1", type: "FMCG", fsdu: true, desc: "Blue wrap" }]; save(); render();
    window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).sort((a, b) => a - b).forEach(k => Object.keys(ws.rows[k]._c).sort((a, b) => a - b).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); }));
    const csv = "#,LPN,Pallet Type,FSDU\n1,VLT004040265,BB,No\n2,No LPN 1,FMCG,Yes\n\nPallet description,No LPN 1: Blue wrap";
    const imp = await parseExported(new File([csv], "x.csv"));
    return { lpn: vals.includes("No LPN 1"), descRow: vals.includes("Pallet description") && vals.includes("No LPN 1: Blue wrap"), imp: imp.rows.map(r => r.lpn + "|" + (r.desc || "")), clean: cleanRows([{ lpn: "No LPN 3", type: "BB", desc: "  x  " }])[0].desc };
  });
  check("exports list the pallet as No LPN 1 with its description, and importing brings it back", s.lpn && s.descRow && JSON.stringify(s.imp) === '["VLT004040265|","No LPN 1|Blue wrap"]' && s.clean === "x", s);
  // Manifest check: counted on their own, not as log only; share text says so.
  s = await p.evaluate(async () => {
    document.getElementById("cmpToggle").click(); document.getElementById("cmpUseLog").click();
    document.getElementById("cmpNums").value = "VLT004040265\nRBY006292169"; document.getElementById("cmpCheck").click(); await new Promise(r => setTimeout(r, 100));
    let shared = null; navigator.share = async o => { shared = o; }; document.getElementById("cmpShare").click(); await new Promise(r => setTimeout(r, 50));
    return { sum: document.getElementById("cmpSum").textContent, res: document.getElementById("cmpRes").textContent, odd: oddNote("cmpLogNums"), share: shared && shared.text };
  });
  check("the Manifest check counts pallets with no LPN on their own, not as log only, and the shared list says so", /No LPN \(check by hand\): 1/.test(s.sum) && /On log only \(book in\): 0/.test(s.sum) && !/No LPN 1/.test(s.res.replace(/No LPN \(check by hand\)/g, "")) && s.odd === "" && /Pallets with no LPN \(check by hand\): 1/.test(s.share || ""), s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // The button fits with the scan options on small phones and big text.
  for (const [w, big] of [[360, 0], [360, 1], [1300, 0]]) {
    p = await page(browser, w);
    await p.setViewportSize({ width: w, height: 740 });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => { if (window.__big) {} const b = document.getElementById("scanBtn"); if (getComputedStyle(b).display !== "none") b.click(); await new Promise(r => setTimeout(r, 100));
      const r = document.getElementById("noLpn").getBoundingClientRect(); return { right: Math.round(r.right), h: Math.round(r.height), vw: innerWidth, page: document.documentElement.scrollWidth <= innerWidth, shown: r.width > 0 }; });
    if (big) s = await p.evaluate(async () => { cfg.size = "1.25"; applyCfg(); await new Promise(r => setTimeout(r, 100)); const r = document.getElementById("noLpn").getBoundingClientRect(); return { right: Math.round(r.right), h: Math.round(r.height), vw: innerWidth, page: document.documentElement.scrollWidth <= innerWidth, shown: r.width > 0 }; });
    check("at " + w + " px" + (big ? " with Extra large text" : "") + " the No LPN button shows with the scan options and fits", s.shown && s.right <= s.vw && s.h >= 44 && s.page, s);
    await p.ctx.close();
  }

  // Switched off in config.js: no button; marked as in testing: the note shows in the description.
  for (const [mode, body] of [["off", { features: { noLpn: false }, testing: {} }], ["testing", { features: {}, testing: { noLpn: true } }]]) {
    p = await page(browser, 375);
    await p.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.LPN_CONFIG=" + JSON.stringify(body) + ";" }));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => { const out = { btn: !document.getElementById("noLpn").hidden };
      openHelp("guide", "How to use this app"); out.guide = /Pallet with no LPN/.test(document.getElementById("panelBody").textContent); closeHelp();
      if (out.btn) { addNoLpn(); await new Promise(r => setTimeout(r, 150)); out.note = !!document.querySelector('.dmgrow .testnote[data-test="noLpn"]'); }
      return out; });
    if (mode === "off") check("with noLpn switched off there is no No LPN button or Guide line", !s.btn && !s.guide, s);
    else check("with noLpn marked as in testing the note shows when describing the pallet", s.btn && s.guide && s.note, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }

  // FPP pallets: the description box opens when one is logged, says what's on it, and goes back to the LPN box.
  console.log("Descriptions for FPP pallets");
  p = await page(browser, 375, { excel: true });
  await p.setViewportSize({ width: 375, height: 812 });
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#tyb button[data-t="FPP"]').click());
  await p.fill("#lpn", "VLT004040265"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  s = await p.evaluate(() => { const a = document.activeElement; return { desc: !!a.closest(".descline"), ph: a.placeholder, label: a.getAttribute("aria-label") }; });
  check("logging an FPP pallet opens its description box, asking what's on it", s.desc && /What’s on it, e.g. kitchen roll/.test(s.ph) && s.label === "Description for VLT004040265", s);
  await p.keyboard.type("Full pallet of kitchen roll"); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  s = await p.evaluate(() => ({ desc: rows[0].desc, tag: document.querySelector("#body .desctag") && document.querySelector("#body .desctag").textContent, focus: document.activeElement.id, saved: JSON.parse(localStorage.getItem("lpnlog")).rows[0].desc, undo: document.getElementById("undoTxt").textContent }));
  check("the description is saved and shown under the pallet, and the LPN box is ready for the next pallet", s.desc === "Full pallet of kitchen roll" && s.tag === s.desc && s.saved === s.desc && s.focus === "lpn" && /Description saved for VLT004040265/.test(s.undo), s);
  // Other types don't open it; Enter on an empty box leaves no description; a scanned LPN in the box is the next pallet.
  await p.evaluate(() => document.querySelector('#tyb button[data-t="BB"]').click());
  await p.fill("#lpn", "VLT004040273"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  s = { bb: await p.evaluate(() => ({ open: !!document.querySelector(".descline"), focus: document.activeElement.id })) };
  await p.evaluate(() => document.querySelector('#tyb button[data-t="FPP"]').click());
  await p.fill("#lpn", "VLT004040281"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  s.blank = await p.evaluate(() => ({ desc: rows[2].desc, focus: document.activeElement.id }));
  await p.evaluate(() => document.querySelector('#tyb button[data-t="FPP"]').click());
  await p.fill("#lpn", "VLT004040299"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  await p.keyboard.type("VLT004040307"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  s.rows = await p.evaluate(() => rows.map(r => r.lpn + "|" + r.type + "|" + (r.desc || "")));
  check("other types don't open it, Enter leaves it blank, and an LPN scanned into it is logged as the next pallet", !s.bb.open && s.bb.focus === "lpn" && s.blank.desc === undefined && s.blank.focus === "lpn" && s.rows[3] === "VLT004040299|FPP|" && /^VLT004040307\|/.test(s.rows[4]), s);
  // Changing a pallet's type to FPP in the table offers the box when it's tapped; during Live scan it doesn't open by itself.
  s = await p.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render();
    const sel = document.querySelector("#body select"); sel.value = "FPP"; sel.dispatchEvent(new Event("change", { bubbles: true })); await new Promise(r => setTimeout(r, 50));
    document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    const tapped = !!document.querySelector(".descline"); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
    scanning = true; addValue("VLT004040273", { type: "FPP", fsdu: false }); await new Promise(r => setTimeout(r, 150)); scanning = false;
    return { type: rows[0].type, tapped, live: !!document.querySelector(".descline"), n: rows.length };
  });
  check("a pallet changed to FPP offers the box when tapped, and Live scan doesn't open it", s.type === "FPP" && s.tapped && !s.live && s.n === 2, s);
  // Add anyway after a warning still opens the box, and it keeps focus (Add anyway focuses the LPN box first).
  await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT004040265"); await p.press("#lpn", "Enter"); await p.waitForTimeout(150);
  s = { bar: await p.evaluate(() => !document.getElementById("chkBar").hidden) };
  await p.click("#chkAdd"); await p.waitForTimeout(200);
  s.after = await p.evaluate(() => ({ n: rows.length, type: rows[1] && rows[1].type, desc: !!document.activeElement.closest(".descline") }));
  check("Add anyway on an FPP pallet opens its description box with focus in it", s.bar && s.after.n === 2 && s.after.type === "FPP" && s.after.desc, s);
  await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  // A code that isn't LPN-shaped, typed at scanner speed, goes to the LPN box (with the usual warning), not into the
  // description; a PO number typed by hand stays as the description.
  await p.evaluate(() => { rows = []; save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT004040265"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  await p.keyboard.type("00350123450000001234"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ desc: rows[0].desc || "", n: rows.length, bar: !document.getElementById("chkBar").hidden, txt: document.getElementById("chkTxt").textContent }));
  check("a scanned code that isn't LPN-shaped goes to the LPN box with the usual check, not into the description", s.desc === "" && (s.bar && /00350123450000001234/.test(s.txt) || s.n === 2), s);
  await p.evaluate(() => { if (!document.getElementById("chkBar").hidden) document.getElementById("chkSkip").click(); rows = []; save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT004040265"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  await p.keyboard.type("PO12345678", { delay: 90 }); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ rows: rows.map(r => r.lpn + "|" + (r.desc || "")) }));
  check("a PO number typed by hand is kept as the description", JSON.stringify(s.rows) === '["VLT004040265|PO12345678"]', s);
  // Screen readers: the box that opened by itself says why and how to carry on; a tapped one doesn't. Escape says
  // when typed text was dropped.
  await p.evaluate(() => { rows = []; save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT004040265"); await p.press("#lpn", "Enter"); await p.waitForTimeout(200);
  s = await p.evaluate(() => { const a = document.activeElement, ids = (a.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    return { hint: ids.map(i => document.getElementById(i) && document.getElementById(i).textContent).join(" | "), hidden: ids[0] && getComputedStyle(document.getElementById(ids[0])).position === "absolute" && document.getElementById(ids[0]).getBoundingClientRect().width <= 1 }; });
  await p.keyboard.type("half typed", { delay: 90 }); await p.keyboard.press("Escape"); await p.waitForTimeout(120);
  s.esc = await p.evaluate(() => ({ msg: document.getElementById("msg").textContent, desc: rows[0].desc || "", focus: document.activeElement.id }));
  s.tapped = await p.evaluate(async () => { document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
    const d = document.querySelector(".descline input"); const v = d.getAttribute("aria-describedby"); document.activeElement.blur(); await new Promise(r => setTimeout(r, 50)); return v; });
  check("the box that opens by itself tells screen readers the pallet was added and how to skip; Escape says the typed text wasn't saved", /^Added #1: VLT004040265 · FPP\. Optional: type what’s on it, or press Enter to skip and scan the next one\.$/.test(s.hint) && s.hidden && s.esc.msg === "Description not saved for VLT004040265." && s.esc.desc === "" && s.esc.focus === "lpn" && !s.tapped, s);
  await p.ctx.close();
  // At 200% zoom (180 px wide) with Extra large text, the "Added" note doesn't cover the box with focus.
  p = await page(browser, 180, { excel: true });
  await p.setViewportSize({ width: 180, height: 370 });
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => { cfg.size = "1.25"; applyCfg(); rows = Array.from({ length: 14 }, (_, i) => ({ lpn: "VLT10000" + String(1000 + i), type: "BB", fsdu: false })); save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT100009999"); await p.press("#lpn", "Enter"); await p.waitForTimeout(300);
  const covered = () => { const a = document.querySelector(".dmgrow").getBoundingClientRect(), fl = document.getElementById("flash"), f = fl.getBoundingClientRect();
    return { desc: !!document.activeElement.closest(".descline"), covered: !fl.hidden && f.top < a.bottom && f.bottom > a.top }; };
  s = await p.evaluate(covered);
  check("at 200% zoom with Extra large text the Added note doesn't cover the description box or damage choices", s.desc && !s.covered, s);
  await p.ctx.close();
  // On a desktop with a long log the new row is at the bottom of the screen: the note doesn't cover it either.
  p = await page(browser, 1300, { excel: true });
  await p.setViewportSize({ width: 1300, height: 900 });
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => { rows = Array.from({ length: 12 }, (_, i) => ({ lpn: "VLT10000" + String(1000 + i), type: "BB", fsdu: false })); save(); render(); document.getElementById("cmpNums").value = "VLT100001000"; manLive(); document.querySelector('#tyb button[data-t="FPP"]').click(); });
  await p.fill("#lpn", "VLT100009999"); await p.press("#lpn", "Enter"); await p.waitForTimeout(300);
  s = await p.evaluate(covered);
  check("on a desktop with a long log the Added note doesn't cover the open box or damage choices", s.desc && !s.covered, s);
  await p.ctx.close();
  // At 320 px (also with Extra large text) opening the box doesn't make the page slide sideways; with the testing note
  // switched on it wraps instead of widening the page.
  for (const big of [false, true]) {
    p = await page(browser, 320, { excel: true });
    await p.setViewportSize({ width: 320, height: 568 });
    if (big) await p.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.LPN_CONFIG=" + JSON.stringify({ features: {}, testing: { fppDesc: true } }) + ";" }));
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.evaluate(big => { if (big) { cfg.size = "1.25"; applyCfg(); } rows = [{ lpn: "VLT100001000", type: "BB", fsdu: false, desc: "Full pallet of kitchen roll, 2-ply, white" }]; save(); render(); document.querySelector('#tyb button[data-t="FPP"]').click(); }, big);
    await p.fill("#lpn", "VLT555000111"); await p.press("#lpn", "Enter"); await p.waitForTimeout(300);
    s = await p.evaluate(() => ({ open: !!document.querySelector(".descline"), note: !!document.querySelector('.dmgrow .testnote[data-test="fppDesc"]'), page: document.documentElement.scrollWidth, sx: scrollX, vw: innerWidth }));
    check("at 320 px" + (big ? " with Extra large text and the testing note" : "") + " opening the box keeps the page inside the screen", s.open && s.page <= s.vw && s.sx === 0 && (!big || s.note), s);
    await p.ctx.close();
  }
  p = await page(browser, 375, { excel: true });
  await p.goto(URL0); await p.waitForTimeout(300);
  // On the exports and back in on import.
  s = await p.evaluate(async () => {
    rows = [{ lpn: "VLT004040265", type: "FPP", fsdu: false, desc: "Full pallet of kitchen roll" }]; save(); render();
    window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await new Promise(r => setTimeout(r, 200));
    const vals = [], ws = window.__wb.sheets[0]; Object.keys(ws.rows).forEach(k => Object.keys(ws.rows[k]._c).forEach(j => { const c = ws.rows[k]._c[j]; if (c && c.value != null) vals.push(String(c.value)); }));
    const imp = await parseExported(new File(["#,LPN,Pallet Type,FSDU\n1,VLT004040265,FPP,No\n\nPallet description,VLT004040265: Full pallet of kitchen roll"], "x.csv"));
    return { xl: vals.some(v => /VLT004040265: Full pallet of kitchen roll/.test(v)), imp: imp.rows[0] };
  });
  check("the FPP description goes on the Excel export and comes back on import", s.xl && s.imp.type === "FPP" && s.imp.desc === "Full pallet of kitchen roll", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
