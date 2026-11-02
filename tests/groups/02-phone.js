/* Checks: phone. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Logging on a phone");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.fill("#recv", "Tester"); await p.fill("#expect", "3");
  await p.fill("#trailer", "TR1"); await p.fill("#sealIn", "SI1"); await p.fill("#sealOut", "SO1");
  await p.fill("#lpn", "VLT003977037"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ rows: rows.length, flash: document.getElementById("flash").textContent, dock: document.getElementById("dockCnt").getAttribute("aria-label"), dockShort: document.getElementById("dockCnt").textContent,
    collapsed: document.getElementById("delCard").classList.contains("dcollapsed"), sum: document.getElementById("delSumTxt").textContent,
    saved: JSON.parse(localStorage.getItem("lpnlog")) }));
  check("pallet added", s.rows === 1, s.rows);
  check("added confirmation shown", /Added #1: VLT003977037/.test(s.flash), s.flash);
  check("entry bar counter (short on narrow phones)", s.dock === "1 of 3 logged" && s.dockShort === "1/3", [s.dock, s.dockShort]);
  check("Delivery folds into one line", s.collapsed && /Tester/.test(s.sum) && /Trailer TR1/.test(s.sum), s.sum);
  check("trailer and seals saved", s.saved.trailer === "TR1" && s.saved.sealIn === "SI1" && s.saved.sealOut === "SO1", s.saved);
  await p.fill("#lpn", "VLT003977037"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  check("duplicate LPN warning", await p.isVisible("#chkBar"));
  await p.click("#chkSkip");
  check("skipping a duplicate adds nothing", await p.evaluate(() => rows.length) === 1);

  console.log("Live manifest tracking");
  await p.evaluate(() => { document.getElementById("cmpNums").value = "VLT003977037\nQUB001859260"; });
  s = await p.evaluate(() => document.getElementById("manTxt").textContent);
  check("manifest progress shown", s === "Manifest: 1 of 2 found · 1 still to find", s);
  await p.fill("#lpn", "RBY006266507"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ t: document.getElementById("manTxt").textContent, warn: document.getElementById("flash").classList.contains("warn") }));
  check("pallet not on manifest is flagged", s.warn && /1 not on manifest/.test(s.t), s);

  console.log("Phone usability");
  s = await p.evaluate(() => { const w = document.querySelector(".wrap"); return { oy: getComputedStyle(w).overflowY, logoHidden: !document.querySelector(".dc-logo").offsetParent, warn: !!document.querySelector("#cmpBody .warn"), pfxClosed: !document.getElementById("pfxBox").open }; });
  check("pallet table scrolls with the page on phones", s.oy === "visible", s.oy);
  check("logo controls moved out of Delivery", s.logoHidden, s);
  check("Manifest check opens on its steps, presets tucked away", !s.warn && s.pfxClosed, s);
  s = await p.evaluate(() => { const e = document.getElementById("expect"); const old = e.value; e.value = "9"; save(); summary(); const a = document.getElementById("expInfo").className; e.value = "1"; save(); summary(); const b2 = document.getElementById("expInfo").className; e.value = String(manState().total); save(); summary(); const c2 = document.getElementById("expInfo").hidden; e.value = old; save(); summary(); return [a, b2, c2]; });
  check("progress is neutral, over-count is flagged, no duplicate line", s[0] === "expinfo prog" && s[1] === "expinfo bad" && s[2] === true, s);
  await p.click("#cmpToggle"); await p.evaluate(() => document.getElementById("cmpCard").scrollIntoView({ block: "start" })); await p.waitForTimeout(400);
  s = await p.evaluate(() => ({ focus: document.body.classList.contains("cmpfocus"), top: Math.round(document.querySelector(".card.entry").getBoundingClientRect().top), h: innerHeight }));
  check("entry bar steps aside in the Manifest check", s.focus && s.top >= s.h - 5, s);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  check("entry bar comes back above it", !(await p.evaluate(() => document.body.classList.contains("cmpfocus"))));
  await p.focus("#lpn");
  await p.evaluate(() => { document.getElementById("cmpCard").scrollIntoView({ block: "start" }); }); await p.waitForTimeout(300);
  check("entry bar stays while typing into it", !(await p.evaluate(() => document.body.classList.contains("cmpfocus"))));
  await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); }); await p.waitForTimeout(300);
  s = await p.evaluate(() => { const sv = rows; rows = sv.concat([{ lpn: "RUNXYZ100000000000", type: "BB", fsdu: false }]); render(); const w = document.documentElement.scrollWidth - innerWidth; rows = sv; render(); return w; });
  await p.setViewportSize({ width: 360, height: 740 });
  s = await p.evaluate(() => { const sv = rows; rows = sv.concat([{ lpn: "RUNXYZ100000000000", type: "BB", fsdu: false }]); render(); const w = document.documentElement.scrollWidth - innerWidth; rows = sv; render(); return w; });
  check("a very long LPN doesn't push the page sideways at 360px", s <= 0, s);
  await p.setViewportSize({ width: 375, height: 900 });
  await p.click("#cmpToggle");
  await p.evaluate(() => openHelp("settings", "Settings"));
  check("logo can be changed from Settings", /logo/i.test(await p.textContent("#setLogo")));
  s = await p.evaluate(() => ["cmpToggle", "manShow"].map(id => Math.round(document.getElementById(id).getBoundingClientRect().height)));
  check("Manifest check buttons are 44px tall", s.every(h => h >= 44 || h === 0), s);
  await p.evaluate(() => closeHelp());

  console.log("Quick actions");
  s = await p.evaluate(() => ({ use: !document.getElementById("manUseExp").hidden || document.getElementById("expect").value !== "", undo: !document.getElementById("undoLast").hidden }));
  check("undo-last button shown once pallets are logged", s.undo, s);
  await p.evaluate(() => { document.getElementById("expect").value = ""; save(); summary(); });
  check("offers the manifest count as expected", !(await p.evaluate(() => document.getElementById("manUseExp").hidden)) && /Use 2 as expected/.test(await p.textContent("#manUseExp")));
  await p.click("#manUseExp");
  check("manifest count copied into Expected pallets", await p.inputValue("#expect") === "2");
  await p.fill("#lpn", "QUB001859261"); await p.press("#lpn", "Enter"); await p.waitForTimeout(100);
  if (await p.isVisible("#chkBar")) await p.click("#chkAdd");
  const before = await p.evaluate(() => rows.length);
  await p.click("#undoLast");
  s = await p.evaluate(() => ({ n: rows.length, last: rows[rows.length - 1].lpn }));
  check("undo-last removes the newest pallet", s.n === before - 1 && s.last === "RBY006266507", s);
  await p.click("#undoBtn");
  check("and Undo puts it back", await p.evaluate(() => rows.length) === before);
  await p.evaluate(() => { rows.pop(); save(); render(); });
  const dock = await p.evaluate(() => { const d = document.getElementById("dockCnt"), r = d.getBoundingClientRect(), u = document.getElementById("undoLast").getBoundingClientRect(), s2 = document.getElementById("scanBtn").getBoundingClientRect(); return { fits: d.scrollWidth <= d.clientWidth + 1, overlap: u.right > s2.left + 1, text: d.textContent }; });
  check("entry bar counter fits beside the undo button", dock.fits && !dock.overlap, dock);
  await p.setViewportSize({ width: 360, height: 740 });
  await p.evaluate(() => { document.getElementById("cmpNums").value = Array.from({ length: 34 }, (_, i) => "VLT" + String(3977037 + i).padStart(9, "0")).join("\n"); });
  s = await p.evaluate(() => ["add", "scanBtn", "undoLast", "lpn"].map(id => Math.round(document.getElementById(id).getBoundingClientRect().right)).concat(innerWidth));
  check("entry bar fits a 360px phone with a long counter", s.slice(0, 4).every(r => r <= s[4]), s);
  await p.setViewportSize({ width: 375, height: 900 });

  console.log("Saved deliveries");
  await p.evaluate(() => newDelivery());
  check("Start new delivery warns when not exported", /hasn’t been exported/.test(await p.textContent("#dlmsg")) && await p.evaluate(() => rows.length) > 0);
  await p.evaluate(() => newDelivery());
  s = await p.evaluate(() => ({ rows: rows.length, hist: hist.length, trailer: document.getElementById("trailer").value, man: document.getElementById("cmpNums").value, recv: document.getElementById("recv").value, histTrailer: hist[0] && hist[0].trailer }));
  check("Start new delivery saves and clears", s.rows === 0 && s.hist === 1 && s.trailer === "" && s.man === "" && s.recv === "Tester" && s.histTrailer === "TR1", s);
  await p.click("#undoBtn");
  s = await p.evaluate(() => ({ rows: rows.length, trailer: document.getElementById("trailer").value }));
  check("Undo brings the delivery back", s.rows === 2 && s.trailer === "TR1", s);
  await p.evaluate(() => openHelp("history", "Saved deliveries"));
  check("last backed up note shown", /backed up/i.test(await p.textContent("#bkNote")));
  await p.evaluate(() => closeHelp());

  console.log("Settings and dates");
  s = await p.evaluate(() => { const a = document.getElementById("dateShow").textContent; cfg.dateFmt = "iso"; showDate(); const b = document.getElementById("dateShow").textContent; cfg.dateFmt = "uk"; showDate(); return [a, b]; });
  check("date box follows Date format", /^\d\d\/\d\d\/\d{4}$/.test(s[0]) && /^\d{4}-\d\d-\d\d$/.test(s[1]), s);
  s = await p.evaluate(async () => { const csv = "LPN,Pallet Type,FSDU,,Delivery Details,\nA1,BB,No,,Date,26/10/2026\nA2,FMCG,Yes,,Trailer number,TR9\n,,,,Seal in,SI9\n,,,,Seal out,SO9";
    const r = await parseExported(new File([csv], "x.csv")); return [r.date, r.trailer, r.sealIn, r.sealOut, r.rows.length, r.rows[1].fsdu]; });
  check("importing an exported log", JSON.stringify(s) === JSON.stringify(["2026-10-26", "TR9", "SI9", "SO9", 2, true]), s);
  await p.evaluate(() => openHelp("guide", "Guide"));
  s = await p.evaluate(() => ({ toc: document.querySelectorAll(".guidetoc a").length, install: !!document.getElementById("showInstall"), wide: document.documentElement.scrollWidth - innerWidth }));
  check("Guide opens with its contents bar", s.toc >= 8 && s.install && s.wide <= 0, s);
  await p.evaluate(() => closeHelp());
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  console.log("Clear trailer, seals and notes");
  for (const [w, h] of [[360, 740], [800, 900], [1300, 900]]) {
    p = await page(browser, w);
    await p.setViewportSize({ width: w, height: h });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(() => { const b = document.getElementById("delClear"), r = b.getBoundingClientRect(); return { off: b.disabled, right: Math.round(r.right), vw: innerWidth, h: Math.round(r.height), page: document.documentElement.scrollWidth <= innerWidth }; });
    check("at " + w + " px the Clear trailer, seals and notes button fits and is off while they're empty", s.off && s.right <= s.vw && s.h >= 44 && s.page, s);
    if (w !== 360) { await p.ctx.close(); continue; }
    await p.fill("#recv", "Jamie"); await p.fill("#expect", "12");
    await p.fill("#trailer", "TR4471"); await p.fill("#sealIn", "SL123456"); await p.fill("#sealOut", "SL654321"); await p.fill("#notes", "Driver waited");
    s = await p.evaluate(() => !document.getElementById("delClear").disabled);
    await p.click("#delClear"); await p.waitForTimeout(100);
    const after = await p.evaluate(() => ({ vals: ["trailer", "sealIn", "sealOut", "notes", "recv", "expect"].map(k => document.getElementById(k).value), saved: JSON.parse(localStorage.getItem("lpnlog")), undo: document.getElementById("undoTxt").textContent, off: document.getElementById("delClear").disabled, focus: document.activeElement.id }));
    check("it clears the trailer, seals and notes, keeps the name and expected pallets, saves, and offers Undo", s && JSON.stringify(after.vals) === '["","","","","Jamie","12"]' && after.saved.trailer === "" && after.saved.notes === "" && after.saved.recv === "Jamie" && /Cleared the trailer, seals and notes/.test(after.undo) && after.off && after.focus === "trailer", after);
    await p.click("#undoBtn"); await p.waitForTimeout(100);
    s = await p.evaluate(() => ({ vals: ["trailer", "sealIn", "sealOut", "notes"].map(k => document.getElementById(k).value), saved: JSON.parse(localStorage.getItem("lpnlog")).sealOut }));
    check("Undo puts the trailer, seals and notes back", JSON.stringify(s.vals) === '["TR4471","SL123456","SL654321","Driver waited"]' && s.saved === "SL654321", s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
};
