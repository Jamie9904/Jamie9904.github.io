/* Checks: Two phones (pallets sent from one phone to another with QR codes, qr.js) and the blank tally sheet.
   Named 225 so it runs after group 22 and before 23-offline, which stays last. */
const { fs, path, ROOT, check, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Two phones and the blank tally sheet");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);

  // The sending phone: its pallets as QR codes, several when there are many.
  s = await p.evaluate(() => {
    rows = []; for (let i = 0; i < 30; i++) rows.push({ lpn: "VLT0040402" + String(i).padStart(2, "0"), type: ["BB", "FMCG", "FPP", "Mixed"][i % 4], fsdu: i === 3 });
    rows[1].dmg = "Crushed"; rows[2].desc = "Kitchen roll, full pallet"; rows[5].ref = true; rows.push({ lpn: "No LPN 1", type: "BB", fsdu: false });
    document.getElementById("trailer").value = "TR 4471"; save(); render();
    const b = document.getElementById("phonesBtn"); const vis = !!b && !b.hidden && b.getBoundingClientRect().height >= 44;
    b.click();
    document.getElementById("qrShow").click();
    const img = document.getElementById("qrImg"), svg = img.querySelector("svg");
    return { vis, title: document.getElementById("panelTitle").textContent, svg: !!svg, count: document.getElementById("qrCount").textContent, msg: document.getElementById("qrMsg").textContent, codes: qrCodesFor(rows), w: img.getBoundingClientRect().width, label: img.getAttribute("aria-label") };
  });
  check("Share log opens from its own button and shows this phone's pallets as QR codes, several for a long log", s.vis && s.title === "Share the log with another person" && s.svg && s.codes.length > 1 && s.count === "Code 1 of " + s.codes.length && /^31 pallets in \d+ codes\./.test(s.msg) && s.w >= 250 && s.w <= 330 && s.label === "QR codes for the other phone", { ...s, codes: s.codes.length });
  check("each code is small enough for a phone camera to read off a screen", s.codes.every(c => /^LPNM1 [a-z0-9]{4} \d+\/\d+ /.test(c) && Buffer.byteLength(c) <= 330), s.codes.map(c => Buffer.byteLength(c)));
  const codes = s.codes;
  await p.waitForTimeout(2300);
  s = await p.evaluate(() => document.getElementById("qrCount").textContent);
  check("the codes change by themselves every 2 seconds", s === "Code 2 of " + codes.length, s);
  await p.click("#qrNext"); await p.waitForTimeout(2300);
  s = await p.evaluate(() => document.getElementById("qrCount").textContent);
  check("Next steps on and stops the automatic change, so a code can be held", s === "Code 3 of " + codes.length, s);
  s = await p.evaluate(() => { document.getElementById("qrShow").click(); const running = !!qrTimer; closeHelp(); return { running, after: qrTimer }; });
  check("closing the panel stops the codes changing", s.running && s.after === null, s);
  s = await p.evaluate(() => { rows = []; save(); render(); openHelp("phones", "Share the log with another person"); document.getElementById("qrShow").click(); const r = { box: document.getElementById("qrBox").hidden, msg: document.getElementById("qrMsg").textContent }; closeHelp(); return r; });
  check("with no pallets there is nothing to send, and it says so", s.box && s.msg === "There are no pallets on this phone to send.", s);

  // The receiving phone: codes read in any order; pallets already here aren't added twice; No LPN renumbered; one Undo.
  s = await p.evaluate(codes => {
    rows = [{ lpn: "VLT004040200", type: "BB", fsdu: false }, { lpn: "RUN000000001", type: "FMCG", fsdu: false }, { lpn: "No LPN 1", type: "FPP", fsdu: false }];
    document.getElementById("trailer").value = "TR 4471"; save(); render(); qrRecv = null; qrWant = true;
    const order = codes.map((c, i) => i).reverse(), seen = [];
    order.slice(0, -1).forEach(i => { onCode(codes[i]); seen.push(document.getElementById("smsg").textContent); });
    onCode(codes[order[0]]); onCode(codes[order[0]]); // the same code twice
    const before = rows.length;
    onCode(codes[order[order.length - 1]]);
    return { progress: seen[0], before, after: rows.length, msg: document.getElementById("msg").textContent, damaged: rows.find(r => r.lpn === "VLT004040201").dmg, desc: rows.find(r => r.lpn === "VLT004040202").desc, ref: !!rows.find(r => r.lpn === "VLT004040205").ref, fsdu: rows.find(r => r.lpn === "VLT004040203").fsdu, nolpn: rows.filter(r => /^No LPN/.test(r.lpn)).map(r => r.lpn), undo: document.getElementById("undoTxt").textContent, scanning };
  }, codes);
  check("the receiving phone counts the codes as they're read, in any order", s.progress === "Codes from the other phone: 1 of " + codes.length + " read. Keep the camera on its screen." && s.before === 3, s);
  check("when every code is read, the pallets are added once each, with their type, FSDU, damage, description and refused mark", s.after === 33 && s.msg === "Added 30 pallets from the other phone. 1 was already in this log." && s.damaged === "Crushed" && s.desc === "Kitchen roll, full pallet" && s.ref && s.fsdu === true, s);
  check("a No LPN pallet from the other phone gets this log's next number", JSON.stringify(s.nolpn) === '["No LPN 1","No LPN 2"]', s.nolpn);
  check("one Undo is offered for the whole merge", s.undo === "Added 30 pallets from the other phone", s.undo);
  s = await p.evaluate(() => { addValue("RUN000000099"); undoStack.length && (() => { const e = undoStack.filter(x => /other phone/.test(x.text)).pop(); e.fn(); })(); return { n: rows.length, kept: rows.some(r => r.lpn === "RUN000000099"), mine: rows.filter(r => /^VLT00404020/.test(r.lpn)).length }; });
  check("undoing the merge takes away only the other phone's pallets; ones logged since stay", s.n === 4 && s.kept && s.mine === 1, s);
  // A different trailer is pointed out; a QR code is never logged as a pallet; switched off, codes are ignored.
  s = await p.evaluate(codes => {
    rows = []; save(); render(); document.getElementById("trailer").value = "TR 9999"; qrRecv = null; qrDone.clear(); qrWant = true; codes.forEach(c => onCode(c));
    const msg = document.getElementById("msg").textContent;
    const one = qrCodesFor([{ lpn: "RBY006291189", type: "Mixed", fsdu: false }]);
    rows = []; save(); render(); SITE.on.twoPhones = false; qrRecv = null; qrWant = true; onCode(one[0]); const off = rows.length; SITE.on.twoPhones = true;
    qrWant = true; onCode("LPNM1 zzzz 1/1 {not json"); const bad = document.getElementById("smsg").textContent;
    return { msg, off, bad, logged: rows.length };
  }, codes);
  check("a different trailer number on the other phone is pointed out", /Check the trailer: the other phone has TR 4471, this one has TR 9999\.$/.test(s.msg), s.msg);
  check("with Two phones switched off, its codes are ignored, and a damaged set says to show the codes again (never logged as a pallet)", s.off === 0 && /couldn’t be read\. On the other phone, tap Show my pallets as QR codes again\./.test(s.bad) && s.logged === 0, s);
  // Safety: codes count only after Scan the other phone's codes; a set is added once; a waiting check comes first;
  // another version's codes say so; only a new code beeps; accented text still fits.
  s = await p.evaluate(() => {
    const out = {}; const sm = () => document.getElementById("smsg").textContent;
    rows = [{ lpn: "No LPN 1", type: "BB", fsdu: false }]; save(); render(); qrRecv = null; qrDone.clear();
    const set = qrCodesFor([{ lpn: "No LPN 1", type: "FPP", fsdu: false, desc: "Kitchen roll" }, { lpn: "RBY006291189", type: "Mixed", fsdu: false }]);
    qrWant = false; onCode(set[0]); out.unasked = sm(); out.rows0 = rows.length;
    qrWant = true; tryAdd("VLT004040299", true, "Handheld:"); onCode(set[0]); out.waiting = sm(); out.rows1 = rows.length; hideCheck();
    qrWant = true; onCode(set[0]); out.rows2 = rows.length;
    qrWant = true; onCode(set[0]); out.repeat = sm(); out.rows3 = rows.length;
    qrWant = true; onCode("LPNM2 abcd 1/1 {}"); out.newer = sm();
    qrWant = true; qrRecv = null; const many = qrCodesFor(Array.from({ length: 30 }, (x, i) => ({ lpn: "VLT0040403" + String(i).padStart(2, "0"), type: "BB", fsdu: false })));
    let beeps = 0; const was = window.sfx; window.sfx = () => beeps++; onCode(many[0]); lastCode = ""; onCode(many[0]); lastCode = ""; onCode(many[0]); window.sfx = was; out.beeps = beeps;
    const accents = qrCodesFor(Array.from({ length: 12 }, (x, i) => ({ lpn: "QUB00189" + String(9200 + i), type: "FPP", fsdu: false, desc: "Kitchen roll’s café – €2 ✓ Łódź" })));
    out.ascii = accents.every(c => /^[\x20-\x7e]*$/.test(c)); out.maxBytes = Math.max(...accents.map(c => new TextEncoder().encode(c).length));
    out.svgOk = accents.every(c => { try { QR.svg(c); return true; } catch (e) { return false; } });
    rows = []; save(); render(); qrWant = true; qrRecv = null; qrDone.clear(); accents.forEach(c => onCode(c)); out.accentBack = rows[0] && rows[0].desc;
    return out;
  });
  check("a code from another phone does nothing unless Scan the other phone's codes was tapped", /^That’s a code from another phone/.test(s.unasked) && s.rows0 === 1, s);
  check("a waiting check is answered before another phone's pallets are added", /^Answer the check above first/.test(s.waiting) && s.rows1 === 1 && s.rows2 === 3, s);
  check("the same set read again isn't added twice (No LPN pallets included)", /^These pallets were already added/.test(s.repeat) && s.rows3 === 3, s);
  check("a code from another version of the app says to update both phones", /different version of the app/.test(s.newer), s.newer);
  check("only a newly read code beeps, not every camera frame", s.beeps === 1, s.beeps);
  check("accented and special characters still fit in each code and come back unchanged", s.ascii && s.maxBytes <= 330 && s.svgOk && s.accentBack === "Kitchen roll’s café – €2 ✓ Łódź", s);
  // Imported text goes through the same checks as a backup: odd fields are dropped and long text cut.
  s = await p.evaluate(() => { rows = []; save(); render(); const said = mergePallets([{ lpn: "VLT004040265", type: "Nonsense", fsdu: "yes", dmg: "x".repeat(500), extra: "<img src=x onerror=alert(1)>" }, null, { lpn: "" }, "text"]); return { said, rows: JSON.stringify(rows) }; });
  check("pallets from another phone are tidied like a backup (unknown type, odd fields, very long text)", s.said === "Added 1 pallet from the other phone." && !/extra|onerror/.test(s.rows) && JSON.parse(s.rows)[0].type !== "Nonsense" && JSON.parse(s.rows)[0].dmg.length < 500, s);
  // Scan the other phone's codes: closes the panel and starts the camera.
  s = await p.evaluate(async () => { let started = 0; const was = window.startScan; window.startScan = async () => { started++; }; openHelp("phones", "Share the log with another person"); document.getElementById("qrScan").click(); await new Promise(r => setTimeout(r, 50)); window.startScan = was; return { started, panel: document.getElementById("panel").hidden }; });
  check("Scan the other phone's codes closes the panel and starts the camera", s.started === 1 && s.panel, s);
  // The QR maker: deterministic shape for a given text, sized to fit, and refuses what can't fit.
  s = await p.evaluate(() => { const a = QR.encode("LPNM1 abcd 1/1 " + "x".repeat(250)), b = QR.encode("hi"); let big = ""; try { QR.encode("y".repeat(700)); } catch (e) { big = e.message; } return { va: a.version, sa: a.size, vb: b.version, sb: b.size, big }; });
  check("the QR maker picks the smallest size that fits and refuses text that won't fit", s.vb === 1 && s.sb === 21 && s.va > 1 && s.va <= 13 && s.sa === s.va * 4 + 17 && /Too much/.test(s.big), s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  // The blank tally sheet: the Export menu button, what goes on the page.
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(async () => {
    const calls = [], texts = [];
    const doc = new Proxy({}, { get(t, k) {
      if (k === "autoTable") return o => { calls.push(o); return doc; };
      if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      if (k === "lastAutoTable") return { finalY: 90 };
      if (k === "getTextWidth") return () => 50; if (k === "getNumberOfPages") return () => 1;
      if (k === "output") return () => new ArrayBuffer(4); if (k === "then") return undefined;
      if (k === "text") return t => { texts.push(String(t)); return doc; };
      return () => doc; } });
    const J = function () { return doc; }; J.API = { autoTable() {} }; window.jspdf = { jsPDF: J };
    let printed = null; window.printBuf = async (buf, name) => { printed = name; };
    rows = []; save(); render();
    document.getElementById("expBtn").click(); const btn = document.getElementById("tallyBtn"), vis = !btn.hidden && btn.getBoundingClientRect().height >= 40;
    await btn.onclick();
    const main = calls[1] || {};
    return { dated: texts.some(t => /^Printed /.test(t)), footer: texts.some(t => /^Page 1 of 1$/.test(t)), vis, printed, msg: document.getElementById("dlmsg").textContent, details: JSON.stringify(calls[0] && calls[0].body), head: main.head && main.head[0], n: main.body ? main.body.length : 0, last: main.body && main.body[main.body.length - 1][0].content, first: main.body && main.body[0] };
  });
  check("the Export menu has Blank tally sheet, which works with an empty log; its footer has no printed date", !s.dated && s.footer && s.vis && s.printed === "LPN-tally-sheet.pdf" && !/Add at least one/.test(s.msg), s);
  check("the tally sheet has spaces for the date, receiver, trailer, expected pallets and seals", ["Date", "Received by", "Trailer number", "Expected pallets", "Seal in", "Seal out"].every(w => s.details.includes('"' + w + '"')), s.details);
  check("the tally sheet has numbered empty rows with a column per pallet type, FSDU and notes, and a totals row", JSON.stringify(s.head) === JSON.stringify(["#", "LPN", "BB", "FMCG", "FPP", "Mixed", "FSDU", "Notes (damage, refused)"]) && s.n >= 20 && s.last === "Totals" && s.first[0] === "1" && s.first.slice(1).every(c => c === ""), s);
  // If a sheet runs onto a second page, it is made again with one row fewer until it fits.
  s = await p.evaluate(async () => {
    const made = []; let rowsIn = 0;
    const mk = () => { const doc = new Proxy({}, { get(t, k) {
      if (k === "autoTable") return o => { if (o.head) rowsIn = o.body.length - 1; return doc; };
      if (k === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      if (k === "lastAutoTable") return { finalY: 90 }; if (k === "getTextWidth") return () => 50;
      if (k === "getNumberOfPages") return () => (rowsIn > 18 ? 2 : 1);
      if (k === "output") return () => { made.push(rowsIn); return new ArrayBuffer(4); }; if (k === "then") return undefined;
      return () => doc; } }); return doc; };
    const J = function () { return mk(); }; J.API = { autoTable() {} }; window.jspdf = { jsPDF: J };
    await buildTallyPdf(); return made;
  });
  check("a tally sheet that runs onto a second page is made again with fewer rows until it fits", s.length >= 2 && s[s.length - 1] === 18 && s[0] > 18, s);
  s = await p.evaluate(() => { SITE.on.tallySheet = false; applySite(); const r = document.getElementById("tallyBtn").hidden; SITE.on.tallySheet = true; SITE.on.twoPhones = false; applySite(); r && (window.__p = document.getElementById("phonesBtn").hidden); SITE.on.twoPhones = true; return { tally: r, phones: window.__p }; });
  check("each has its own switch in the site settings", s.tally && s.phones, s);
  // Marked as in testing: a note in the Share log panel, and one in the Export menu under Blank tally sheet.
  s = await p.evaluate(() => { SITE.test.twoPhones = true; SITE.test.tallySheet = true; applySite(); openHelp("phones", "Share the log with another person");
    const n1 = document.querySelector('#panelBody .testnote[data-test="twoPhones"]'), n2 = document.querySelector('#expMenu .testnote[data-test="tallySheet"]'); closeHelp();
    const r = { share: n1 && n1.textContent, tally: n2 && n2.textContent, count: document.querySelectorAll('#expMenu .testnote[data-test="tallySheet"]').length }; SITE.test.twoPhones = false; SITE.test.tallySheet = false; return r; });
  check("marked as in testing, Share log and the tally sheet each show their note", /^In testing: Sharing the log may not always work yet/.test(s.share || "") && /^In testing: The blank tally sheet may not always work yet/.test(s.tally || ""), s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();

  if (REAL_LIBS) {
    // On GitHub: the real jsPDF makes one page with every row, read back with pdf.js.
    p = await page(browser, 1300, { real: true });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      await loadPdfJs(); const buf = await buildTallyPdf(); const pdf = await openPdf(new Uint8Array(buf.slice(0)));
      const pg = await pdf.getPage(1); const words = (await pg.getTextContent()).items.map(i => i.str.trim()).filter(Boolean);
      return { printed: words.some(w => /^Printed /.test(w)), pages: pdf.numPages, size: buf.byteLength, title: words.includes("Goods-in tally sheet"), totals: words.includes("Totals"), nums: words.filter(w => /^\d+$/.test(w)).map(Number), head: words.includes("Notes (damage, refused)") };
    });
    check("real jsPDF: the tally sheet is one A4 page with its title, numbered rows and totals", s.pages === 1 && !s.printed && s.title && s.totals && s.head && s.nums.includes(1) && s.nums.includes(20), s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
};
