/* Checks: report. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Report a problem or idea");
    const q = await page(browser, 390);
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.click("#btnGuide"); await q.waitForTimeout(100);
    await q.click("#fbGuide"); await q.waitForTimeout(150);
    let s = await q.evaluate(() => ({ title: document.getElementById("panelTitle").textContent, focus: document.activeElement.id }));
    const fbOk = await q.evaluate(() => { const u = FEEDBACK_URL, csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content; const cs = (csp.match(/connect-src([^;]*)/) || [])[1] || "";
      return { u, allowed: !u || cs.split(/\s+/).includes(new URL(u).origin), https: !u || /^https:\/\/[a-z0-9.-]+\.workers\.dev\/report$/.test(u) }; });
    check("the feedback address is a workers.dev /report address, allowed exactly in the security policy", fbOk.allowed && fbOk.https, fbOk);
    s = await q.evaluate(() => ({ box: !document.getElementById("fbBox").hidden, panelInert: document.getElementById("panel").inert, focus: document.activeElement.id }));
    check("the Guide's Report a problem link opens the report box over the Guide", s.box && s.panelInert && s.focus === "fbText", s);
    await q.keyboard.press("Escape"); await q.waitForTimeout(50);
    s = await q.evaluate(() => ({ box: !document.getElementById("fbBox").hidden, panel: !document.getElementById("panel").hidden, panelInert: document.getElementById("panel").inert, focus: document.activeElement.id }));
    check("Escape closes the report box only; the Guide stays open with focus back on its link", !s.box && s.panel && !s.panelInert && s.focus === "fbGuide", s);
    await q.click("#panelClose"); await q.waitForTimeout(50);
    // The Report button on the main page: on screen in the top bar, opens the box in the middle of the screen.
    for (const [w, h, big] of [[320, 640, true], [320, 640], [360, 740], [390, 844], [1300, 900]]) {
      await q.setViewportSize({ width: w, height: h }); await q.evaluate(big => { cfg.size = big ? "1.25" : "1"; applyCfg(); }, !!big); await q.waitForTimeout(100);
      const r = await q.evaluate(() => { window.scrollTo(0, 0); const btn = document.getElementById("btnReport"), b = btn.getBoundingClientRect(), t = document.querySelector(".top h1").getBoundingClientRect(), l = btn.querySelector(".lbl"); return { inBar: b.top >= 0 && b.right <= innerWidth && b.height >= 44 && b.width >= 44, page: document.documentElement.scrollWidth <= innerWidth, label: l.textContent, cut: l.scrollWidth > l.clientWidth, overTitle: b.left < t.right - 1 && b.top < t.bottom && b.bottom > t.top || document.querySelector(".top h1").scrollWidth > document.querySelector(".top h1").clientWidth + 1, name: btn.getAttribute("aria-label") }; });
      check("at " + w + " px" + (big ? " with Extra large text" : "") + " the button says Report a problem in full, is in the top bar, big enough to tap, clear of the app name, and the page doesn't scroll sideways", r.inBar && r.page && r.label === "Report a problem" && !r.cut && !r.overTitle && r.name.startsWith(r.label), r);
    }
    await q.setViewportSize({ width: 390, height: 844 });
    await q.click("#btnReport"); await q.waitForTimeout(80);
    s = await q.evaluate(() => { const b = document.getElementById("fbBox").getBoundingClientRect(); return { open: !document.getElementById("fbBox").hidden, centred: Math.abs((b.left + b.right) / 2 - innerWidth / 2) < 2 && Math.abs((b.top + b.bottom) / 2 - innerHeight / 2) < 2, fits: b.top >= 0 && b.bottom <= innerHeight, inert: document.querySelector("main").inert, focus: document.activeElement.id }; });
    check("the Report button opens the report box in the middle of the screen, with focus in it and the page behind set aside", s.open && s.centred && s.fits && s.inert && s.focus === "fbText", s);
    await q.click("#fbClose"); await q.waitForTimeout(50);
    s = await q.evaluate(() => ({ open: !document.getElementById("fbBox").hidden, inert: document.querySelector("main").inert, focus: document.activeElement.id }));
    check("Close shuts the box and focus goes back to the Report button", !s.open && !s.inert && s.focus === "btnReport", s);
    await q.evaluate(() => openFeedback());
    s = await q.evaluate(async () => { document.getElementById("fbText").value = "Photo 3 read nothing"; FEEDBACK_URL = ""; await document.getElementById("fbSend").onclick(); return document.getElementById("fbMsg").textContent; });
    check("before the Worker is online, the form says so and points to the problem report file", /isn’t set up yet/.test(s) && /Download problem report/.test(s), s);
    s = await q.evaluate(async () => {
      FEEDBACK_URL = "https://lpn-feedback.test.workers.dev/report"; const sent = []; const real = window.fetch;
      window.fetch = async (u, o) => { sent.push({ u, b: JSON.parse(o.body) }); return new Response(JSON.stringify({ ok: true, issue: 3 }), { status: 200 }); };
      document.querySelector('input[name="fbKind"][value="idea"]').checked = true; document.getElementById("fbText").value = "Bigger buttons please"; document.getElementById("fbName").value = "  Sam   Jones ";
      await document.getElementById("fbSend").onclick();
      const named = { name: sent[0] && sent[0].b.name, kept: localStorage.getItem("lpnfbname") };
      document.getElementById("fbName").value = "";
      const ok = { n: sent.length, u: sent[0] && sent[0].u, kind: sent[0] && sent[0].b.kind, text: sent[0] && sent[0].b.text, report: sent[0] && /LPN Pallet Log problem report/.test(sent[0].b.report), app: sent[0] && sent[0].b.app, msg: document.getElementById("fbMsg").textContent, cleared: document.getElementById("fbText").value === "" };
      // No signal: kept on the phone, then sent when back online.
      window.fetch = async () => { throw new TypeError("Failed to fetch"); };
      document.querySelector('input[name="fbKind"][value="problem"]').checked = true; document.getElementById("fbText").value = "Scanner froze"; document.getElementById("fbInc").checked = false;
      await document.getElementById("fbSend").onclick();
      const off = { msg: document.getElementById("fbMsg").textContent, queued: fbQueue().length, report: fbQueue()[0] && fbQueue()[0].report };
      // A report saved while a flush is running isn't lost, and the list never grows past its limit.
      let release; window.fetch = (u, o) => new Promise(res => { release = () => { sent.push({ u, b: JSON.parse(o.body) }); res(new Response(JSON.stringify({ ok: true, issue: 9 }), { status: 200 })); }; });
      const fl = fbFlush(); await new Promise(r => setTimeout(r, 20));
      fbSave(fbQueue().concat([{ id: "late", kind: "idea", text: "Added during the flush" }]));
      release(); await new Promise(r => setTimeout(r, 20)); release && release(); await fl;
      const race = { left: fbQueue().length, sent: sent.map(x => x.b.text) };
      fbSave([]); const big = fbSave([{ id: "a", kind: "idea", text: "x", report: "y".repeat(400000) }]); const six = fbSave([1, 2, 3, 4, 5, 6].map(i => ({ id: "s" + i, kind: "idea", text: "t" })));
      fbSave([{ id: "q1", kind: "problem", text: "Scanner froze", report: "", app: "LPN Pallet Log" }]);
      window.fetch = async (u, o) => { sent.push({ u, b: JSON.parse(o.body) }); return new Response(JSON.stringify({ ok: true, issue: 4 }), { status: 200 }); };
      const flushed = await fbFlush();
      const after = { flushed, left: fbQueue().length, last: sent[sent.length - 1].b.text, stored: localStorage.getItem("lpnfeedq") };
      // A refused report says why and isn't kept.
      window.fetch = async () => new Response(JSON.stringify({ ok: false, error: "That's too long: keep it under 4000 characters." }), { status: 400 });
      document.getElementById("fbText").value = "x"; await document.getElementById("fbSend").onclick();
      const refused = { msg: document.getElementById("fbMsg").textContent, queued: fbQueue().length };
      window.fetch = real; FEEDBACK_URL = "";
      const noName = sent.filter(x => x.b.text === "Scanner froze").every(x => !("name" in x.b));
      return { ok, off, after, refused, race, big, six, named, noName };
    });
    check("sending an idea posts the kind, text, app version and problem report, then clears the form", s.ok.n === 1 && s.ok.u === "https://lpn-feedback.test.workers.dev/report" && s.ok.kind === "idea" && s.ok.text === "Bigger buttons please" && s.ok.report && /^LPN Pallet Log/.test(s.ok.app) && /Sent\. Thank you/.test(s.ok.msg) && s.ok.cleared, s.ok);
    {
      await q.setViewportSize({ width: 360, height: 640 });
      const fit = await q.evaluate(async () => { cfg.size = "1.25"; applyCfg(); openFeedback({}); await new Promise(r => setTimeout(r, 150));
        const b = document.getElementById("fbSend").getBoundingClientRect(), out = { send: Math.round(b.bottom), vh: innerHeight }; closeFeedback(); cfg.size = "1"; applyCfg(); return out; });
      check("on a 360×640 phone with Extra large text, Send in the report box is on screen without scrolling", fit.send <= fit.vh, fit);
      await q.setViewportSize({ width: 390, height: 844 });
    }
    check("the optional name is sent tidied and remembered on this phone; left blank, no name is sent", s.named.name === "Sam Jones" && s.named.kept === "Sam Jones" && s.noName, { named: s.named, noName: s.noName });
    check("with no signal, a report is kept on the phone (without the report when unticked) and sent when back online", /saved on this phone/.test(s.off.msg) && s.off.queued === 1 && s.off.report === "" && s.after.flushed === 1 && s.after.left === 0 && s.after.last === "Scanner froze" && s.after.stored === null, s);
    check("a report saved while saved ones are being sent isn't lost: it's sent too", s.race.left === 0 && s.race.sent.includes("Scanner froze") && s.race.sent.includes("Added during the flush"), s.race);
    check("the waiting list refuses to grow past 5 reports or 300 KB", s.big === false && s.six === false, s);
    check("a report the server refuses says why and isn't kept", /too long/.test(s.refused.msg) && s.refused.queued === 0, s.refused);
    s = await q.evaluate(() => { localStorage.setItem("lpnfeedq", JSON.stringify([{ kind: "idea", text: "x" }])); const b = checkBackup({ lpnfeedq: "[]", lpnnames: "[]" }).data; const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); localStorage.removeItem("lpnfeedq"); return { inBackup: "lpnfeedq" in b }; });
    check("unsent reports stay on this phone: not taken from or put into backups", !s.inBackup, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
