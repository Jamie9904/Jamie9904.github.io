/* Checks: real export. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Real export libraries" + (REAL_LIBS ? "" : " (skipped here: npm install hasn't fetched ExcelJS, jsPDF and pdf.js; GitHub always runs these)"));
  {
    // The checks must test the same library versions the app loads from the CDN.
    const dev = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies || {};
    const code = ["export.js", "compare.js", "scan.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const want = { exceljs: /exceljs\/(\d[\d.]*)\/|exceljs@(\d[\d.]*)/g, jspdf: /jspdf\/(\d[\d.]*)\/jspdf\.umd|jspdf@(\d[\d.]*)\//g,
      "jspdf-autotable": /jspdf-autotable[\/@](\d[\d.]*)\//g, "pdfjs-dist": /pdf\.js\/(\d[\d.]*)\/|pdfjs-dist@(\d[\d.]*)\//g,
      "pdf-lib": /pdf-lib[\/@](\d[\d.]*)\//g, "tesseract.js": /tesseract\.js@(\d[\d.]*)\//g, "@zxing/library": /@zxing\/library@(\d[\d.]*)\//g };
    const off = Object.keys(want).map(k => { const v = [...code.matchAll(want[k])].map(m => m[1] || m[2]); return { k, app: [...new Set(v)], test: dev[k] }; })
      .filter(x => x.app.length !== 1 || x.app[0] !== x.test);
    check("the checks use the same library versions as the app", off.length === 0, off);
  }
  if (REAL_LIBS) {
    const LOG = [{ lpn: "VLT003977037", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: true, dmg: "Crushed" }, { lpn: "RBY006291167", type: "Mixed", fsdu: false }];
    const NOTE = "Two pallets wrapped badly, driver waited twenty minutes, seal checked against the paperwork and matched";
    p = await page(browser, 1300, { real: true, init: `localStorage.setItem("lpnlog", ${JSON.stringify(JSON.stringify({ rows: LOG, date: "2026-10-26", recv: "Tester", expect: "3", trailer: "TR4471", sealIn: "S1001", sealOut: "S2002", notes: NOTE }))})` });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const saved = []; window.saveOnly = async (buf, name) => { saved.push(new File([buf], name)); };
      await document.getElementById("dl").onclick();
      const xf = saved.find(f => /\.xlsx$/.test(f.name));
      if (!xf) return { err: "no .xlsx was saved", names: saved.map(f => f.name), msg: document.getElementById("dlmsg").textContent };
      const imp = await parseExported(xf);
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await xf.arrayBuffer()); const ws = wb.worksheets[0];
      const grid = sheetGrid(ws);
      const made = grid.find(r => r.some(c => /^Made with /.test(String(c))));
      let notesH = 0; ws.eachRow(row => row.eachCell(c => { if (c.value === "Notes") notesH = row.height; }));
      const cmp = await readLog(new File([await xf.arrayBuffer()], xf.name));
      return { size: xf.size, rows: imp.rows, unk: imp.unk, details: [imp.date, imp.recv, imp.expect, imp.trailer, imp.sealIn, imp.sealOut, imp.notes],
        lpnW: ws.getColumn(2).width, madeCells: made ? made.filter(Boolean).length : 0, made: made ? made.find(Boolean) : null,
        footer: ws.headerFooter && ws.headerFooter.oddFooter, notesH, cmp };
    });
    check("real ExcelJS: the log spreadsheet is made", !s.err && s.size > 4000, s.err ? s : s.size);
    if (!s.err) {
      check("real ExcelJS: importing the log gives back the same pallets", JSON.stringify(s.rows) === JSON.stringify(LOG) && s.unk === 0, s.rows);
      check("real ExcelJS: importing the log gives back the delivery details", JSON.stringify(s.details) === JSON.stringify(["2026-10-26", "Tester", "3", "TR4471", "S1001", "S2002", NOTE]), s.details);
      check("real ExcelJS: the Manifest check reads the same LPNs from the log", JSON.stringify(s.cmp) === JSON.stringify(LOG.map(r => r.lpn)), s.cmp);
      check("real ExcelJS: LPN column fits a 13-character LPN", s.lpnW >= 27, s.lpnW);
      check("real ExcelJS: the version line is one line under the table", s.madeCells === 1 && /^Made with LPN Pallet Log v\d+\.\d+ \(build \d+\) on /.test(s.made || ""), s.made);
      check("real ExcelJS: the page footer names the version", /LPN Pallet Log v\d+\.\d+ \(build \d+\)/.test(s.footer || "") && /Page &P of &N/.test(s.footer || ""), s.footer);
      check("real ExcelJS: the notes row is tall enough for a long note", s.notesH >= 100, s.notesH);
    }
    s = await p.evaluate(async () => {
      const buf = await buildLogPdf("2026-10-26");
      const imp = await parseExported(new File([buf], "log.pdf"));
      const cmp = await readLogPdf(new File([buf], "log.pdf"), () => {});
      const pdf = await openPdf(new Uint8Array(buf.slice(0)));
      const pg = await pdf.getPage(1); const words = (await pg.getTextContent()).items.map(i => i.str.trim()).filter(Boolean);
      // Drawing a page is what the photo-reading fallback does with scanned PDFs.
      const vp = pg.getViewport({ scale: 1 }); const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      const px = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let ink = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0 && px[i - 1] < 128) ink++;
      return { version: pdfjsLib.version, ink, size: buf.byteLength, rows: imp.rows, notes: imp.notes, sealOut: imp.sealOut, cmp, oneLine: words.includes("RUN0001830763"), footer: words.find(w => /^LPN Pallet Log v/.test(w)) || null };
    });
    check("real jsPDF: the log PDF is made", s.size > 4000, s.size);
    check("real pdf.js: the pinned version is the one loaded", s.version === JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies["pdfjs-dist"], s.version);
    check("real pdf.js: a page can be drawn (used for scanned PDFs)", s.ink > 500, s.ink);
    check("real jsPDF: importing the PDF gives back the same pallets and notes", JSON.stringify(s.rows) === JSON.stringify(LOG) && s.notes === NOTE && s.sealOut === "S2002", s);
    check("real jsPDF: the Manifest check reads the same LPNs from the PDF", JSON.stringify(s.cmp) === JSON.stringify(LOG.map(r => r.lpn)), s.cmp);
    check("real jsPDF: a 13-character LPN stays on one line", s.oneLine, s);
    check("real jsPDF: the footer names the version", /^LPN Pallet Log v\d+\.\d+ \(build \d+\)/.test(s.footer || ""), s.footer);
    s = await p.evaluate(async () => {
      let out = null; window.sendFile = async (buf, name) => { out = new File([buf], name); };
      document.getElementById("cmpLogNums").value = "VLT003977037\nRUN0001830763"; document.getElementById("cmpNums").value = "VLT003977037\nRUN0001830763\nRBY006291167";
      await document.getElementById("cmpGo").onclick();
      if (!out) return { err: document.getElementById("cmpMsg").textContent };
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await out.arrayBuffer());
      const ws = wb.worksheets.find(w => /Manifest/.test(w.name)) || wb.worksheets[0];
      const grid = sheetGrid(ws); let lp = []; try { lp = lpnsFromGrid(grid); } catch (e) { lp = [String(e.message)]; }
      return { sheets: wb.worksheets.map(w => w.name), lpnW: ws.getColumn(2).width, lp,
        made: grid.some(r => r.filter(Boolean).length === 1 && /^Made with LPN Pallet Log v/.test(String(r.find(Boolean)))) };
    });
    check("real ExcelJS: the manifest check spreadsheet is made", !s.err, s);
    {
      const r = await p.evaluate(async () => {
        await loadPdfLib(); const L = window.PDFLib;
        const src = await L.PDFDocument.create(); const pg = src.addPage([300, 300]);
        pg.drawText("VLT003977037", { x: 20, y: 250, size: 12 });
        pg.node.set(L.PDFName.of("AA"), src.context.obj({ O: { S: "JavaScript", JS: L.PDFString.of("app.alert(1)") } }));
        pg.node.set(L.PDFName.of("Annots"), src.context.obj([{ Type: "Annot", Subtype: "Link", Rect: [0, 0, 100, 100], A: { S: "URI", URI: L.PDFString.of("https://evil.example") } }]));
        src.setKeywords(["LPNLOG2:" + encodeURIComponent(JSON.stringify({ d: "2026-10-26", r: "T", rows: [["VLT003977037", "BB", 0]] }))]);
        const bytes = await src.save();
        const list = await readLogPdf(new File([bytes], "log.pdf"), () => {});
        document.getElementById("cmpLogNums").value = list.join("\n"); document.getElementById("cmpNums").value = "VLT003977037";
        const C = cmpData();
        const out = await buildCmpPdf(C.res, C.cnt, C.man.length, "2026-10-26", { list: C.logList, pdf: logPdfSrc, sheets: null });
        const d = await L.PDFDocument.load(out);
        return { pages: d.getPageCount(), withActions: d.getPages().filter(x => x.node.get(L.PDFName.of("AA")) || x.node.get(L.PDFName.of("Annots"))).length };
      });
      check("real pdf-lib: a merged log PDF keeps its pages but loses links and page-open scripts", r.pages >= 2 && r.withActions === 0, r);
    }
    if (!s.err) {
      check("real ExcelJS: manifest check lists every LPN and nothing else", ["VLT003977037", "RUN0001830763", "RBY006291167"].every(n => s.lp.includes(n)) && !s.lp.some(n => /Made with/.test(n)), s);
      check("real ExcelJS: manifest check LPN column fits a 13-character LPN", s.lpnW >= 27, s.lpnW);
      check("real ExcelJS: manifest check has the version line", s.made, s);
    }
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
};
