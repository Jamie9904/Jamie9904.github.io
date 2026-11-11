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
  check("entry bar counter (shorter on narrow phones, full wording for screen readers)", s.dock === "1 of 3 logged" && ["1/3 logged", "1/3"].includes(s.dockShort), [s.dock, s.dockShort]);
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

  // The pallet count in the entry bar is never cut off: it picks the longest wording that fits (narrow phones, Extra
  // large text, manifest numbers); the full wording stays for screen readers.
  console.log("Pallet count, edit box, long descriptions and mid-grey colours");
  for (const [w, big, man] of [[320, false, false], [320, true, false], [360, true, true], [414, true, true], [414, false, true]]) {
    p = await page(browser, w);
    await p.setViewportSize({ width: w, height: 740 });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async ([big, man]) => {
      if (big) { cfg.size = "1.25"; applyCfg(); }
      document.getElementById("expect").value = "40";
      if (man) { document.getElementById("cmpNums").value = Array.from({ length: 34 }, (_, i) => "VLT" + String(3977037 + i).padStart(9, "0")).join("\n"); }
      rows = Array.from({ length: 12 }, (_, i) => ({ lpn: "VLT" + String(3977037 + i).padStart(9, "0"), type: "BB", fsdu: false })); save(); render(); if (man) manLive();
      await new Promise(r => setTimeout(r, 100));
      const d = document.getElementById("dockCnt"); return { text: d.textContent, label: d.getAttribute("aria-label"), fits: d.scrollWidth <= d.clientWidth + 1 };
    }, [big, man]);
    check(`at ${w} px${big ? " with Extra large text" : ""}${man ? " with manifest numbers" : ""} the pallet count fits without being cut off`, s.fits && s.text.length > 0 && !/…/.test(s.text) && (man ? s.label === "12 of 34 on manifest" : s.label === "12 of 40 logged"), s);
    // Text size changed afterwards: chosen again.
    if (w === 320 && !big) { s = await p.evaluate(async () => { cfg.size = "1.25"; applyCfg(); await new Promise(r => setTimeout(r, 50)); const d = document.getElementById("dockCnt"); return { text: d.textContent, fits: d.scrollWidth <= d.clientWidth + 1 }; });
      check("changing to Extra large text picks a shorter count that fits", s.fits, s); }
    // The LPN edit box is a full 44 px tap target; a long description is kept to two lines on narrow phones.
    s = await p.evaluate(async () => {
      rows[0].desc = "Full pallet of kitchen roll, 2-ply, white, 24 packs per layer"; save(); render();
      const tag = document.querySelector("#body .desctag"), lh = parseFloat(getComputedStyle(tag).lineHeight), th = tag.getBoundingClientRect().height;
      document.querySelector("#body .lpnedit").click(); await new Promise(r => setTimeout(r, 100));
      const h = document.querySelector("#body td.l input").getBoundingClientRect().height; document.activeElement.blur(); await new Promise(r => setTimeout(r, 50));
      return { h: Math.round(h), lines: Math.round(th / lh), page: document.documentElement.scrollWidth <= innerWidth, w: innerWidth };
    });
    check(`at ${w} px${big ? " with Extra large text" : ""} the LPN edit box is 44 px tall and a long description takes ${w < 360 ? "two lines" : "its full length"}`, s.h >= 44 && (w < 360 ? s.lines <= 2 : s.lines >= 1) && s.page, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
  // Mid-grey background colours: text and grey text (hints, placeholders) stay readable; the quick themes don't change.
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(() => {
    const r = (a, b) => { const x = lumOf(a) + .05, y = lumOf(b) + .05; return Math.max(x, y) / Math.min(x, y); }, out = {};
    for (const bg of ["#8c8c8c", "#7a7a7a", "#767676", "#5a5a5a", "#a0a0a0", "#6e6e6e"]) {
      theme = { bg, ac: "#2563eb", follow: false }; applyTheme(); const st = getComputedStyle(document.documentElement), g = k => st.getPropertyValue(k).trim();
      out[bg] = { mu: +Math.min(r(g("--mu"), g("--paper")), r(g("--mu"), bg)).toFixed(2), ink: +Math.min(r(g("--ink"), g("--paper")), r(g("--ink"), bg)).toFixed(2) };
    }
    theme = { bg: "#0c1830", ac: "#ff8a2a", follow: false }; applyTheme(); const st = getComputedStyle(document.documentElement);
    out.navy = ["--ink", "--mu", "--paper"].map(k => st.getPropertyValue(k).trim()).join(" ");
    return out;
  });
  check("on mid-grey backgrounds grey text is at least 4.5:1 and text at least 4.5:1", Object.keys(s).filter(k => k[0] === "#").every(k => s[k].mu >= 4.5 && s[k].ink >= 4.5), s);
  check("the navy and orange colours are unchanged", s.navy === "#ecedee #a3a7b0 #1f2a41", s.navy);
  await p.ctx.close();

  // Settings > Test a handheld scanner: what came through, Enter or not, speed, LPN or not; nothing is logged.
  console.log("Test a handheld scanner");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render(); openHelp("settings", "Settings"); });
  await p.waitForTimeout(100);
  const say = async (keys, after, delay) => { await p.click("#scanTest"); await p.keyboard.type(keys, { delay: delay || 0 }); if (after) await p.keyboard.press(after); else await p.waitForTimeout(1700); await p.waitForTimeout(80);
    return p.evaluate(() => ({ msg: document.getElementById("scanTestMsg").textContent, box: document.getElementById("scanTest").value, rows: rows.length, focus: document.activeElement.id })); };
  let r = await say("VLT004040265", "Enter");
  check("a scan with Enter says what came through, that Enter was sent, and that it looks like an LPN (even one already in the log); nothing is logged", /^Read “VLT004040265” \(12 characters, in \d+ ms\)\. Enter was sent after it/.test(r.msg) && /It looks like an LPN\.$/.test(r.msg) && !/typing speed/.test(r.msg) && r.box === "" && r.rows === 1 && r.focus === "scanTest", r);
  r = await say("VLT004040273", "Tab");
  check("a scanner that sends Tab is told to send Enter instead, and focus stays for the next try", /Tab was sent after it instead of Enter/.test(r.msg) && /suffix or CR/.test(r.msg) && r.focus === "scanTest", r);
  r = await say("RUN001840861", null);
  check("a scanner that sends nothing after the code is told to send Enter", /^Read “RUN001840861”/.test(r.msg) && /Nothing was sent after it, so you’d need to tap Add/.test(r.msg), r);
  r = await say("PO12345", "Enter", 150);
  check("typing by hand is noted as typing speed, and a barcode that isn't an LPN says why", /typing speed/.test(r.msg) && /has 5 digits/.test(r.msg) && r.rows === 1, r);
  await p.evaluate(() => { document.getElementById("cmpPfx").value = "VLT"; });
  r = await say("RUN001840861", "Enter");
  check("an LPN with a prefix not in the list is called an LPN, with where to add the prefix", /It looks like an LPN, but its prefix RUN isn’t in your prefix list \(add it under Prefix presets if it is one of yours\)\./.test(r.msg) && !/try an LPN label/.test(r.msg), r);
  await p.evaluate(() => { document.getElementById("cmpPfx").value = ""; });
  r = await say("AB12", "Enter");
  check("a short code scanned at once isn't called typing speed", !/typing speed/.test(r.msg), r);
  check("the Guide points handheld scanner users to the test", await p.evaluate(() => { openHelp("guide", "How to use this app"); return /Test a handheld scanner/.test(document.getElementById("panelBody").textContent) && !/hasn’t been tested yet/.test(document.getElementById("panelBody").textContent); }));
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // A delivery with an old date is kept when it is saved (it used to be removed straight away as older than last week,
  // and Start new delivery then stopped with an error). Clock fixed on a Sunday, the start of a new week.
  console.log("Saved deliveries with an old date");
  p = await page(browser, 375, { excel: true, init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "VLT003977037", type: "BB", fsdu: false }], date: "2026-10-18", recv: "Jamie" })) });
  await p.clock.setFixedTime(new Date("2026-11-08T13:00:00"));
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => {
    hist.push({ id: "old1", saved: "2026-10-19T09:00:00.000Z", date: "2026-10-18", recv: "Jamie", rows: [{ lpn: "VLT000000009", type: "BB", fsdu: false }] }); saveHist(); pruneHist();
    const before = hist.length;
    let err = "";
    try { newDelivery(); newDelivery(); } catch (e) { err = e.message; }
    await new Promise(r => setTimeout(r, 50));
    return { err, before, rows: rows.length, hist: hist.map(h => h.date + ":" + h.rows.length), msg: document.getElementById("dlmsg").textContent, undo: !document.getElementById("undoBar").hidden };
  });
  check("Start new delivery with a delivery dated 3 weeks ago saves it and starts a new one; one saved long ago is still removed", !s.err && s.before === 0 && s.rows === 0 && JSON.stringify(s.hist) === '["2026-10-18:1"]' && /Saved to history/.test(s.msg) && s.undo, s);
  s = await p.evaluate(async () => { document.querySelector("#undoBtn").click(); await new Promise(r => setTimeout(r, 50)); return { rows: rows.length, hist: hist.length }; });
  check("and Undo puts it back in the log", s.rows === 1 && s.hist === 0, s);
  // Importing an exported log dated weeks ago keeps it in Saved deliveries (kept by the day it was imported).
  await p.evaluate(() => openHelp("history", "Saved deliveries")); await p.waitForTimeout(100);
  await p.setInputFiles("#histFile", { name: "old.csv", mimeType: "text/csv", buffer: Buffer.from("Date,2026-10-12\n#,LPN,Pallet Type,FSDU\n1,VLT003977099,BB,No\n") });
  await p.waitForFunction(() => /Imported|older/.test(document.getElementById("histMsg").textContent), null, { timeout: 5000 }).catch(() => {});
  s = await p.evaluate(() => ({ msg: document.getElementById("histMsg").textContent, kept: hist.some(h => h.rows.some(r => r.lpn === "VLT003977099")), btn: !!document.querySelector("#histMsg button"), guide: (openHelp("guide", "How to use this app"), /keeps what you saved this week and last week/.test(document.getElementById("panelBody").textContent)) }));
  check("an exported log dated weeks ago is imported and kept, and the Guide says saved deliveries are kept by when they were saved", /^Imported 1 pallet\. Tap Open to use it\.$/.test(s.msg) && s.kept && !s.btn && s.guide, s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // Keep the screen on: asked for when the app opens (on by default), let go when hidden or switched off; Live scan
  // still keeps it on while scanning with the setting off.
  console.log("Keep the screen on, and Undo for the last 10 changes");
  const WAKE = () => { window.__wake = []; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async t => { const l = new EventTarget(); l.released = false; l.release = async () => { if (!l.released) { l.released = true; window.__wake.push("release"); l.dispatchEvent(new Event("release")); } }; window.__wake.push("request:" + t); return l; } } }); };
  p = await page(browser, 375, { init: WAKE });
  await p.goto(URL0); await p.waitForTimeout(300);
  s = { start: await p.evaluate(() => window.__wake.join()) };
  s.hidden = await p.evaluate(async () => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 50)); return window.__wake.join(); });
  s.back = await p.evaluate(async () => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 50)); return window.__wake.join(); });
  s.off = await p.evaluate(async () => { openHelp("settings", "Settings"); const c = document.getElementById("setAwake"); const was = c.checked; c.checked = false; c.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 50)); closeHelp(); return { was, wake: window.__wake.join(), saved: JSON.parse(localStorage.getItem("lpncfg")).awake }; });
  s.twice = await p.evaluate(async () => { window.__wake.length = 0; cfg.awake = true; syncAwake(); syncAwake(); syncAwake(); await new Promise(r => setTimeout(r, 60)); const asked = window.__wake.join(); cfg.awake = false; syncAwake(); await new Promise(r => setTimeout(r, 60)); return asked + "|" + window.__wake.join(); });
  s.scan = await p.evaluate(async () => { window.__wake.length = 0; scanning = true; syncAwake(); await new Promise(r => setTimeout(r, 30)); scanning = false; syncAwake(); await new Promise(r => setTimeout(r, 30)); return window.__wake.join(); });
  check("the screen is kept on while the app is open, let go when it's hidden, asked again when it's back, and Settings can switch it off", s.start === "request:screen" && s.hidden === "request:screen,release" && s.back === "request:screen,release,request:screen" && s.off.was === true && /release$/.test(s.off.wake) && s.off.saved === false && s.scan === "request:screen,release" && s.twice === "request:screen|request:screen,release", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // Undo for the last 10 changes, newest first, from the bar, the Undo button by Clear all, or Ctrl+Z.
  p = await page(browser, 1300);
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30));
    rows = ["VLT000000001", "VLT000000002", "VLT000000003", "VLT000000004"].map(lpn => ({ lpn, type: "BB", fsdu: false })); save(); render();
    const del = i => document.querySelectorAll("#body button.d")[i].click();
    del(0); await wait(); del(1); await wait(); // removes 0001, then 0003
    const bar1 = document.getElementById("undoTxt").textContent + document.getElementById("undoN").textContent, more1 = document.getElementById("undoMore").textContent;
    document.getElementById("undoBtn").click(); await wait();
    const msg1 = document.getElementById("msg").textContent, lbl1 = document.getElementById("undoMore").getAttribute("aria-label");
    const after1 = rows.map(r => r.lpn.slice(-1)).join(""), bar2 = document.getElementById("undoTxt").textContent + "|" + document.getElementById("undoN").textContent;
    document.getElementById("undoBar").hidden = true; document.getElementById("undoMore").click(); await wait();
    const after2 = rows.map(r => r.lpn.slice(-1)).join(""), hiddenAfter = document.getElementById("undoMore").hidden && document.getElementById("undoBar").hidden;
    // Ctrl+Z: undoes outside a box, not while typing in one.
    del(3); await wait();
    document.getElementById("lpn").focus(); document.getElementById("lpn").dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })); await wait();
    const inBox = rows.length; document.getElementById("lpn").blur();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })); await wait();
    const ctrlZ = rows.length;
    // Only the last 10 are kept.
    for (let i = 0; i < 12; i++) showUndo("change " + i, () => {});
    const kept = undoStack.length, top = undoStack[undoStack.length - 1].text, bottom = undoStack[0].text; undoClear();
    return { bar1, more1, msg1, lbl1, after1, bar2, after2, hiddenAfter, inBox, ctrlZ, kept, top, bottom };
  });
  check("each change can be undone in turn, newest first, from the bar or the Undo button by Clear all; the bar says how many earlier ones there are", s.bar1 === "Removed VLT000000003 (1 earlier)" && s.more1 === "Undo" && /^Undone: Removed VLT000000003\. 1 more can be undone\.$/.test(s.msg1) && s.lbl1 === "Undo: Removed VLT000000001" && s.after1 === "234" && s.bar2 === "Removed VLT000000001|" && s.after2 === "1234" && s.hiddenAfter, s);
  check("Ctrl+Z undoes the newest change, but not while typing in a box, and only the last 10 changes are kept", s.inBox === 3 && s.ctrlZ === 4 && s.kept === 10 && s.top === "change 11" && s.bottom === "change 2", s);
  // Clear all then a pallet logged since: the clear can't be undone (it would lose the new pallet), nor anything older.
  s = await p.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30));
    rows = ["VLT000000001", "VLT000000002"].map(lpn => ({ lpn, type: "BB", fsdu: false })); save(); render();
    document.querySelectorAll("#body button.d")[0].click(); await wait();
    document.getElementById("clear").click(); await wait();
    addValue("VLT000000009", { type: "FMCG", fsdu: false }); await wait();
    undoNow(); await wait();
    const refused = { rows: rows.map(r => r.lpn), msg: document.getElementById("msg").textContent, left: undoStack.length };
    rows = [{ lpn: "VLT000000005", type: "BB", fsdu: false }]; save(); render();
    document.getElementById("clear").click(); await wait(); undoNow(); await wait();
    return { refused, clearBack: rows.map(r => r.lpn) };
  });
  check("a Clear all can't be undone once a pallet has been logged since, and nor can older changes; straight after, it can", JSON.stringify(s.refused.rows) === '["VLT000000009"]' && /“Cleared 1 pallet” can’t be undone now, because the log has changed since, and nor can the 1 earlier change\./.test(s.refused.msg) && s.refused.left === 0 && JSON.stringify(s.clearBack) === '["VLT000000005"]', s);
  // Opening a saved delivery forgets older undos (they belong to the other delivery).
  s = await p.evaluate(async () => {
    rows = [{ lpn: "VLT000000001", type: "BB", fsdu: false }, { lpn: "VLT000000002", type: "BB", fsdu: false }]; save(); render();
    document.querySelectorAll("#body button.d")[0].click(); await new Promise(r => setTimeout(r, 30));
    pushHist({ saved: new Date().toISOString(), date: localToday(), rows: [{ lpn: "QUB000000001", type: "FPP", fsdu: false }] });
    openHist(hist[0].id); return { left: undoStack.length, more: document.getElementById("undoMore").hidden, rows: rows.map(r => r.lpn) };
  });
  check("opening a saved delivery forgets the undos from the log before it", s.left === 0 && s.more && JSON.stringify(s.rows) === '["QUB000000001"]', s);
  // Keyboard: focus moves to Export when the last undo hides the buttons; Ctrl+Z does nothing while Settings is open.
  s = await p.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30));
    rows = [{ lpn: "VLT000000001", type: "BB", fsdu: false }, { lpn: "VLT000000002", type: "BB", fsdu: false }]; save(); render();
    document.querySelectorAll("#body button.d")[0].click(); await wait();
    document.getElementById("undoMore").focus(); document.getElementById("undoMore").click(); await wait();
    const focus = document.activeElement.id, msg = document.getElementById("msg").textContent;
    document.querySelectorAll("#body button.d")[0].click(); await wait();
    openHelp("settings", "Settings"); await wait();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })); await wait();
    const inSettings = rows.length; closeHelp(); undoClear();
    return { focus, msg, inSettings };
  });
  check("after the last undo, keyboard focus goes to Export and the status says what was undone; Ctrl+Z does nothing while Settings is open", s.focus === "expBtn" && /^Undone: Removed VLT000000001\.$/.test(s.msg) && s.inSettings === 1, s);
  // Start new delivery: undone straight after (log, details and Saved deliveries back as they were), refused once a
  // pallet has been logged. Clear trailer: refused once a new trailer number has been typed. Nothing during an export
  // of a saved delivery.
  s = await p.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30)), sig = () => rows.map(r => r.lpn).join() + "|" + document.getElementById("trailer").value;
    undoClear(); rows = [{ lpn: "VLT000000001", type: "BB", fsdu: false }]; setDel({ date: localToday(), recv: "Jamie", trailer: "TR1" }); save(); render(); hist = []; saveHist();
    newDelivery(); newDelivery(); await wait();
    const started = { rows: rows.length, hist: hist.length }; undoNow(); await wait();
    const back = { sig: sig(), hist: hist.length };
    newDelivery(); newDelivery(); await wait(); addValue("VLT000000002", { type: "BB", fsdu: false }); await wait(); undoNow(); await wait();
    const refused = { sig: sig(), hist: hist.length, msg: document.getElementById("msg").textContent };
    undoClear(); document.getElementById("trailer").value = "TR2"; save(); syncClear(); document.getElementById("delClear").click(); await wait();
    document.getElementById("trailer").value = "TR3"; save(); undoNow(); await wait();
    const trailer = { value: document.getElementById("trailer").value, msg: document.getElementById("msg").textContent };
    undoClear(); document.querySelectorAll("#body button.d")[0].click(); await wait();
    window.__histExporting = true; undoNow(); const during = rows.length; window.__histExporting = false; undoClear();
    return { started, back, refused, trailer, during };
  });
  check("Start new delivery can be undone straight after, but not once a pallet is logged; Clear trailer can't be undone once a new trailer is typed; nothing is undone during an export", s.started.rows === 0 && s.started.hist === 1 && s.back.sig === "VLT000000001|TR1" && s.back.hist === 0 && s.refused.sig === "VLT000000002|" && s.refused.hist === 1 && /can’t be undone now/.test(s.refused.msg) && s.trailer.value === "TR3" && /Cleared the trailer, seals and notes” can’t be undone now/.test(s.trailer.msg) && s.during === 0, s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
  // On a phone Clear all stays at the bottom, below Undo and Export, so it isn't tapped by mistake.
  p = await page(browser, 360);
  await p.setViewportSize({ width: 360, height: 740 });
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => { rows = [{ lpn: "VLT000000001", type: "BB", fsdu: false }, { lpn: "VLT000000002", type: "BB", fsdu: false }]; save(); render();
    document.querySelectorAll("#body button.d")[0].click(); await new Promise(r => setTimeout(r, 30));
    const y = id => Math.round(document.getElementById(id).getBoundingClientRect().top); return { undo: y("undoMore"), exp: y("expBtn"), clear: y("clear") }; });
  check("on a phone Clear all is below Undo and Export", s.undo < s.exp && s.exp < s.clear, s);
  await p.ctx.close();
};
