/* Checks: pallets with no LPN (the No LPN button): numbering, description, real LPN later, manifest, exports, layout. */
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
};
