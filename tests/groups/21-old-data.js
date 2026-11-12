/* Checks: data saved by older builds still opens in the current app. The files in tests/fixtures/old were made by
   each old build's own code (tools/old-data/make.js and files.py): what it kept in the browser, its backup file, the
   cells its Excel export wrote and the hidden data its Email PDF wrote. Phones keep data from whichever build
   they had, and printed or emailed logs are imported again weeks later, so none of it may stop working. */
const { fs, path, ROOT, check, REAL_LIBS, page } = require("../lib");
const DIR = path.join(ROOT, "tests/fixtures/old");
const NOW = new Date("2026-03-02T10:00:00"); // the date the files were made (saved deliveries older than last week are removed)
const FIELDS = ["date", "recv", "notes", "expect", "trailer", "sealIn", "sealOut"];
const rowsOf = a => JSON.stringify((a || []).map(r => { const o = { lpn: r.lpn, type: r.type, fsdu: !!r.fsdu }; if (r.dmg) o.dmg = r.dmg; if (r.desc) o.desc = r.desc; if (r.ref) o.ref = true; return o; }));
const delOf = o => JSON.stringify(FIELDS.map(k => String(o[k] == null ? "" : o[k])));

module.exports = async ({ browser, URL0 }) => {
  console.log("Data saved by older builds" + (REAL_LIBS ? "" : " (the real .xlsx and .pdf files are only opened on GitHub, where ExcelJS and pdf.js are installed)"));
  const builds = fs.readdirSync(DIR).filter(n => /^build-\d+$/.test(n)).sort((a, b) => a.split("-")[1] - b.split("-")[1]);
  check("saved files from at least five older builds are there to check", builds.length >= 5, builds);
  for (const b of builds) {
    const d = path.join(DIR, b), read = f => fs.readFileSync(path.join(d, f), "utf8");
    const exp = JSON.parse(read("expect.json")), storage = JSON.parse(read("storage.json")), backup = read("backup.json");
    const cells = JSON.parse(read("cells.json")).cells, kw = read("keywords.txt");
    const n = exp.build, want = rowsOf(exp.rows), wantOld = rowsOf(exp.saved[0].rows);

    // 1. What that build kept in the browser, opened by this build.
    let p = await page(browser, 1200, { real: REAL_LIBS, init: `if(!sessionStorage.getItem("old")){sessionStorage.setItem("old","1");const s=${JSON.stringify(storage)};Object.keys(s).forEach(k=>localStorage.setItem(k,s[k]))}` });
    await p.clock.setFixedTime(NOW);
    await p.goto(URL0); await p.waitForTimeout(300);
    let s = await p.evaluate(() => ({ rows: rows.map(r => Object.assign({}, r)), del: getDel(), shown: document.querySelectorAll("#body tr .lpnedit").length,
      hist: hist.map(h => ({ rows: h.rows, del: h })) }));
    check(`build ${n}: its log opens with the same pallets, types, FSDU and damage notes`, rowsOf(s.rows) === want && s.shown === exp.rows.length, { got: rowsOf(s.rows), want, shown: s.shown });
    check(`build ${n}: its date, receiver, notes, expected count, trailer and seals are all back`, delOf(s.del) === delOf(exp.delivery), { got: s.del, want: exp.delivery });
    check(`build ${n}: its saved delivery is still in Saved deliveries with its pallets and details`, s.hist.length === 1 && rowsOf(s.hist[0].rows) === wantOld && delOf(s.hist[0].del) === delOf(exp.saved[0].delivery), s.hist);
    // Saving again in this build keeps everything, and the saved delivery still opens.
    s = await p.evaluate(() => { save(); const again = JSON.parse(localStorage.getItem("lpnlog")); openHist(hist[0].id); return { again: again.rows, opened: rows.map(r => Object.assign({}, r)), del: getDel(), sig: typeof logSig === "function" ? logSig() : "" }; });
    check(`build ${n}: saving again keeps the log, and its saved delivery opens`, rowsOf(s.again) === want && rowsOf(s.opened) === wantOld && s.del.trailer === exp.saved[0].delivery.trailer, s);

    // 2. Its backup file restores here.
    s = await p.evaluate(text => {
      const f = JSON.parse(text);
      try { const c = checkBackup(f.data); const log = JSON.parse(c.data.lpnlog), h = JSON.parse(c.data.lpnhist);
        return { app: f.app, version: f.version, pallets: c.pallets, saved: c.saved, rows: log.rows, del: log, hrows: h[0] && h[0].rows };
      } catch (e) { return { err: e.message }; }
    }, backup);
    check(`build ${n}: its backup file restores with the log and the saved delivery`, s.app === "lpn-pallet-log" && s.version === 1 && s.pallets === exp.rows.length && s.saved === 1 && rowsOf(s.rows) === want && delOf(s.del) === delOf(exp.delivery) && rowsOf(s.hrows) === wantOld, s);

    // 3. Its Excel export imports (the cells it wrote, read the way an imported sheet is read).
    s = await p.evaluate(async cells => {
      const g = []; cells.forEach(([r, c, v]) => { (g[r - 1] = g[r - 1] || [])[c - 1] = v; });
      const csv = [...g].map(r => [...(r || [])].map(v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v; }).join(",")).join("\n");
      try { const imp = await parseExported(new File([csv], "old.csv")); const man = lpnsFromGrid(g.map(r => [...(r || [])].map(v => v == null ? "" : v))); return { rows: imp.rows, imp, man }; } catch (e) { return { err: e.message }; }
    }, cells);
    // Old builds wrote the damage notes in the sheet only from build 49; earlier ones have none to bring back.
    check(`build ${n}: its Excel export imports with the same pallets, types and FSDU`, !s.err && rowsOf((s.rows || []).map(r => ({ lpn: r.lpn, type: r.type, fsdu: r.fsdu }))) === rowsOf(exp.rows.map(r => ({ lpn: r.lpn, type: r.type, fsdu: r.fsdu }))), s);
    check(`build ${n}: the Manifest check reads its Excel export as a log with the same LPNs`, JSON.stringify(s.man) === JSON.stringify(exp.rows.map(r => r.lpn)), s.man);

    // 4. Its Email PDF's hidden data imports (the PDF reader is replaced by one giving that build's hidden data).
    s = await p.evaluate(async kw => {
      const real = { loadPdfJs: window.loadPdfJs, openPdf: window.openPdf };
      window.loadPdfJs = async () => {}; window.openPdf = async () => ({ numPages: 0, getMetadata: async () => ({ info: { Keywords: kw } }) });
      try { const imp = await parseExported(new File(["x"], "old.pdf")); const log = await readLogPdf(new File(["x"], "old.pdf"), () => {}); return { imp, log }; }
      catch (e) { return { err: e.message }; } finally { window.loadPdfJs = real.loadPdfJs; window.openPdf = real.openPdf; }
    }, kw);
    check(`build ${n}: its Email PDF imports with every pallet, damage note and delivery detail`, !s.err && rowsOf(s.imp.rows) === want && delOf(s.imp) === delOf(exp.delivery) && s.imp.unk === 0, s);
    check(`build ${n}: the Manifest check reads its Email PDF as a log with the same LPNs`, JSON.stringify(s.log) === JSON.stringify(exp.rows.map(r => r.lpn)), s.log);

    // 5. On GitHub: the real files, through the real ExcelJS and pdf.js.
    if (REAL_LIBS) {
      s = await p.evaluate(async ([x, f]) => {
        const file = (b64, name) => new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], name);
        try { const xi = await parseExported(file(x, "old.xlsx")), pi = await parseExported(file(f, "old.pdf"));
          const xl = await readLog(file(x, "old.xlsx")), pl = await readLog(file(f, "old.pdf"));
          return { x: xi.rows, p: pi.rows, pdel: pi, xl, pl };
        } catch (e) { return { err: e.message }; }
      }, [fs.readFileSync(path.join(d, "log.xlsx")).toString("base64"), fs.readFileSync(path.join(d, "log.pdf")).toString("base64")]);
      const lpns = JSON.stringify(exp.rows.map(r => r.lpn)), plain = a => rowsOf((a || []).map(r => ({ lpn: r.lpn, type: r.type, fsdu: r.fsdu })));
      check(`build ${n}: the real .xlsx and .pdf files import and read as logs`, !s.err && plain(s.x) === plain(exp.rows) && rowsOf(s.p) === want && delOf(s.pdel) === delOf(exp.delivery) && JSON.stringify(s.xl) === lpns && JSON.stringify(s.pl) === lpns, s);
    }
    check(`build ${n}: nothing went wrong on the page`, p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
};
