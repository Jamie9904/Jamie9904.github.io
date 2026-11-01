/* Checks: outside data. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Saved data and backups from outside");
  {
    // A crafted or damaged backup already in storage: the app must still start and every panel must work.
    const seen = [];
    p = await page(browser, 375, { init: () => {
      localStorage.setItem("lpnhist", "[null]"); localStorage.setItem("lpnlog", '{"rows":"x","recv":{"formula":"1+1"}}');
      localStorage.setItem("lpnnames", "[5,{}]"); localStorage.setItem("lpncfg", '"x"'); localStorage.setItem("lpnpresets", "[1]");
      localStorage.setItem("lpnlogo", "https://tracker.example/pixel.png");
    } });
    p.on("request", r => seen.push(r.url()));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(() => { document.getElementById("btnSet").click(); const set = !document.getElementById("bkUp") ? "no settings" : "ok";
      closeHelp(); return { set, rows: rows.length, recv: document.getElementById("recv").value, body: !!document.querySelector("#body tr") }; });
    check("a damaged backup in storage doesn't stop the app starting", p.errors.length === 0 && s.set === "ok" && s.rows === 0 && s.body, { errors: p.errors, s });
    check("an object in saved data is never shown as a value", s.recv === "", s.recv);
    check("a logo setting pointing at another website is ignored", !seen.some(u => /tracker\.example/.test(u)), seen.filter(u => !/127\.0\.0\.1/.test(u)));
    await p.ctx.close();

    // Restoring: the backup is checked first, nothing changes until the user agrees, and what's written is tidied.
    p = await page(browser, 375, { init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "KEEP000000001", type: "BB", fsdu: false }], date: "2026-10-26" })) });
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.evaluate(() => { window.saveOnly = async () => { window.__bk = (window.__bk || 0) + 1; }; document.getElementById("btnSet").click(); });
    const bk = { app: "lpn-pallet-log", version: 1, data: { lpnhist: "[null,{\"date\":\"2026-10-27\",\"rows\":[{\"lpn\":\"HIST00000001\",\"type\":\"<b>\",\"fsdu\":1}]}]",
      lpnlog: JSON.stringify({ rows: [{ lpn: "NEW000000001", type: "FPP" }], recv: { hyperlink: "https://evil.example", text: "x" } }), lpnlogo: "https://tracker.example/x.png", lpnnames: "[\"Jamie\",7]" } };
    await p.setInputFiles("#bkFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bk)) });
    await p.waitForTimeout(200);
    s = await p.evaluate(() => ({ ask: !document.getElementById("bkAsk").hidden, msg: document.getElementById("bkMsg").textContent, log: localStorage.getItem("lpnlog") }));
    check("restoring a backup asks first and changes nothing yet", s.ask && /log of 1 pallet and 1 saved delivery/.test(s.msg) && /KEEP000000001/.test(s.log || ""), s);
    await p.evaluate(() => { document.getElementById("bkGo").click(); });
    await p.waitForTimeout(300);
    check("after restoring, the app waits for the user to reload", await p.evaluate(() => !document.getElementById("bkDone").hidden && /Make sure the copy/.test(document.getElementById("bkMsg").textContent)));
    s = await p.evaluate(async () => {
      const before = localStorage.getItem("lpnlog"); window.saveOnly = async () => { throw new Error("blocked"); };
      const f = new File([JSON.stringify({ app: "lpn-pallet-log", data: { lpnlog: JSON.stringify({ rows: [{ lpn: "OTHER0000001", type: "BB" }] }) } })], "b2.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      await document.getElementById("bkGo").onclick();
      return { same: localStorage.getItem("lpnlog") === before, msg: document.getElementById("bkMsg").textContent };
    });
    check("a restore stops if the copy of the current data can't be saved", s.same && /wasn’t replaced/.test(s.msg), s);
    s = await p.evaluate(() => ({ bk: window.__bk, log: JSON.parse(localStorage.getItem("lpnlog")), hist: JSON.parse(localStorage.getItem("lpnhist")), logo: localStorage.getItem("lpnlogo"), names: localStorage.getItem("lpnnames") }));
    check("a copy of the current data downloads before restoring", s.bk === 1, s.bk);
    check("a restored backup is tidied: plain text, known pallet types, no outside logo", s.log.rows[0].lpn === "NEW000000001" && s.log.recv === "" && s.hist.length === 1 && s.hist[0].rows[0].type === "Mixed" && s.hist[0].rows[0].fsdu === true && s.logo === null && s.names === '["Jamie"]', s);
    s = await p.evaluate(async () => { const f = new File(["{\"app\":\"lpn-pallet-log\",\"data\":{\"lpnhist\":\"[not json\"}}"], "bad.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      return { msg: document.getElementById("bkMsg").textContent, ask: !document.getElementById("bkAsk").hidden }; });
    check("a damaged backup file is refused without changing anything", /damaged, so nothing was changed/.test(s.msg) && !s.ask, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Hidden data in a log PDF is read as plain text, so it can't become a formula or link in an export.
    p = await page(browser, 1300);
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const kw = "LPNLOG2:" + encodeURIComponent(JSON.stringify({ d: { formula: "HYPERLINK(\"https://evil.example\",\"x\")" }, r: { hyperlink: "https://evil.example", text: "Jamie" }, n: ["a"], rows: [["RUN000000001", { formula: "1" }, 0], [{ x: 1 }, "BB", 0]] }));
      const doc = { numPages: 1, getMetadata: async () => ({ info: { Keywords: kw } }), getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) };
      const keep = [window.pdfjsLib, window.loadPdfJs];
      window.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve(doc) }) }; window.loadPdfJs = async () => {};
      try {
        const imp = await parseExported(new File(["%PDF"], "log.pdf"));
        const lp = await readLogPdf(new File(["%PDF"], "log.pdf"), () => {});
        const cells = logSheets[0].grid.flat();
        return { imp: [imp.date, imp.recv, imp.notes, imp.rows.length], lp, objects: cells.filter(c => c !== null && typeof c === "object").length };
      } finally { window.pdfjsLib = keep[0]; window.loadPdfJs = keep[1]; }
    });
    check("hidden PDF data is only ever read as plain text", JSON.stringify(s.imp) === '["","","",1]' && JSON.stringify(s.lp) === '["RUN000000001"]' && s.objects === 0, s);
    s = await p.evaluate(async () => { let html = ""; window.saveOnly = async b => { html = b; }; rows = [{ lpn: "A1", type: "BB", fsdu: false }];
      document.getElementById("notes").value = '=HYPERLINK("https://evil.example","Open")'; await fallbackXls("2026-10-26"); return html; });
    check("the basic .xls export keeps typed text as text, counts as numbers", /td\.t\{mso-number-format:"\\@"\}/.test(s) && /<td class="t">=HYPERLINK/.test(s) && !/<td class="t">\d+<\/td>/.test(s) && /<td>1<\/td>/.test(s), s.slice(s.indexOf("<table"), s.indexOf("<table") + 600));
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
  {
    // Every classic library load has an integrity hash, and every hash is used.
    const code = ["core.js", "export.js", "compare.js", "scan.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const urls = [...new Set([...code.matchAll(/loadScript\("([^"]+)"/g)].map(m => m[1]).concat([...code.matchAll(/const u="(https:[^"]+)"/g)].map(m => m[1])))];
    const sri = [...code.matchAll(/^  "(https:[^"]+)":"(sha384-[A-Za-z0-9+\/=]+)"/gm)].map(m => m[1]);
    const missing = urls.filter(u => !sri.includes(u)), unused = sri.filter(u => !urls.includes(u));
    check("every library file the app loads is checked against its fingerprint", urls.length >= 10 && !missing.length && !unused.length, { missing, unused });
  }
};
