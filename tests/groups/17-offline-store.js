/* Checks: offline store. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Offline store and failure paths");
  {
    // The service worker is on and every outside request goes through the test's router, including its own.
    const fakeLib = "https://cdn.jsdelivr.net/npm/fake-lib@1.0.0/fake.min.js", fakeOcr = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/fake-worker.min.js";
    let broken = 0;
    p = await page(browser, 375, { sw: true, real: REAL_LIBS, handle: async (r, u) => {
      if (u.href === fakeLib + "?broken") { broken++; await r.fulfill({ status: 503, body: "busy", headers: { "Access-Control-Allow-Origin": "*" } }); return true; }
      if (u.href === fakeLib || u.href === fakeOcr) { await r.fulfill({ status: 200, contentType: "text/javascript", body: "window.__fake=1", headers: { "Access-Control-Allow-Origin": "*" } }); return true; }
      return false;
    } });
    await p.goto(URL0); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(500);
    s = await p.evaluate(async ({ fakeLib, fakeOcr }) => {
      const out = { controlled: !!navigator.serviceWorker.controller };
      await fetch(fakeLib + "?broken", { mode: "cors" }).catch(() => {});
      await fetch(fakeLib, { mode: "no-cors" });   // unchecked (opaque) download of an ordinary library
      await fetch(fakeOcr, { mode: "no-cors" });   // unchecked download of a photo-reader file: allowed
      // The service worker saves in the background, so wait until the allowed copy has landed (or 3 seconds).
      const c = await caches.open("lpn-libs-v2"); let keys = [];
      for (let i = 0; i < 30; i++) { keys = (await c.keys()).map(r => r.url); if (keys.includes(fakeOcr)) break; await new Promise(r => setTimeout(r, 100)); }
      out.keptBroken = keys.includes(fakeLib + "?broken"); out.keptOpaque = keys.includes(fakeLib); out.keptOcr = keys.includes(fakeOcr);
      // A checked request must not be answered by the unchecked copy: it fetches a fresh one instead.
      const r = await fetch(fakeOcr, { mode: "cors" }); out.checkedAnswer = r.type;
      out.v1 = (await caches.keys()).includes("lpn-libs-v1");
      return out;
    }, { fakeLib, fakeOcr });
    check("the app is controlled by its service worker", s.controlled, s);
    check("a failed library download is never kept for offline use", !s.keptBroken && broken === 1, s);
    check("an unchecked download is only kept for the photo reader", !s.keptOpaque && s.keptOcr, s);
    check("an unchecked saved copy never answers a checked request", s.checkedAnswer === "cors", s);
    if (REAL_LIBS) {
      // Use Excel and PDF once online, then go offline and use them again from the saved copies.
      await p.evaluate(async () => { rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render();
        window.saveOnly = async () => {}; await document.getElementById("dl").onclick(); await loadJsPdf(); await loadPdfJs(); });
      await p.ctx.setOffline(true); await p.reload(); await p.waitForTimeout(800);
      s = await p.evaluate(async () => {
        const out = {}; const saved = []; window.saveOnly = async (b, n) => { saved.push(n); };
        await document.getElementById("dl").onclick(); out.xlsx = saved.filter(n => /\.xlsx$/.test(n)).length;
        const buf = await buildLogPdf("2026-10-26"); const imp = await parseExported(new File([buf], "log.pdf"));
        out.pdfRows = imp.rows.map(r => r.lpn); out.rows = rows.length; return out;
      });
      check("offline after one online use: Excel export and PDF reading still work", s.xlsx === 1 && JSON.stringify(s.pdfRows) === '["RUN0001830763"]' && s.rows === 1, s);
    }
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Restore when storage runs out part-way: everything is put back as it was.
    p = await page(browser, 375, { init: () => localStorage.setItem("lpnlog", JSON.stringify({ rows: [{ lpn: "KEEP000000001", type: "BB" }], date: "2026-10-26" })) });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      window.saveOnly = async () => {}; document.getElementById("btnSet").click();
      const before = localStorage.getItem("lpnlog");
      const f = new File([JSON.stringify({ app: "lpn-pallet-log", data: { lpnlog: JSON.stringify({ rows: [{ lpn: "NEW000000001", type: "BB" }] }), lpnhist: "[]" } })], "b.json");
      const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById("bkFile"); i.files = dt.files; await i.onchange({ target: i });
      const set = Storage.prototype.setItem; let n = 0;
      Storage.prototype.setItem = function (k, v) { if (k === "lpnhist" && n++ === 0) throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); };
      try { await document.getElementById("bkGo").onclick(); } finally { Storage.prototype.setItem = set; }
      return { same: localStorage.getItem("lpnlog") === before, msg: document.getElementById("bkMsg").textContent };
    });
    check("a restore that runs out of storage puts everything back", s.same && /ran out of storage space, so nothing was changed/.test(s.msg), s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();

    // Photo reader that fails or never starts: plain message, and only its own saved files are cleared.
    p = await page(browser, 375);
    await p.clock.install();
    await p.goto(URL0); await p.clock.runFor(500);
    const prepPhoto = async mode => p.evaluate(async mode => {
      const c = await caches.open("lpn-libs-v2");
      await c.put("https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js", new Response("x"));
      await c.put("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", new Response("y"));
      window.__started = false;
      window.Tesseract = { createWorker: () => { window.__started = true; return mode === "fail" ? Promise.reject(new Error("worker")) : new Promise(() => {}); } };
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 60; const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      window.__ocr = ocrLpns(new File([blob], "p.png", { type: "image/png" })).then(() => "ok", e => e.message);
    }, mode);
    // The message is only given after the clean-up has finished, so read it first, then the saved files.
    // wait: how long to wait for the result (real time flows alongside the fake clock); the early probe uses a short wait.
    const ocrState = (wait = 5000) => p.evaluate(async wait => { const msg = await Promise.race([window.__ocr, new Promise(r => setTimeout(() => r("still waiting"), wait))]);
      const c = await caches.open("lpn-libs-v2"); const k = (await c.keys()).map(r => r.url);
      return { msg, tess: k.some(u => /tesseract/.test(u)), other: k.some(u => /jspdf/.test(u)) }; }, wait);
    await prepPhoto("fail"); await p.waitForFunction(() => window.__started); await p.clock.runFor(1000);
    s = await ocrState();
    check("a photo reader that fails to start: plain message, its saved files cleared, others kept", /photo reader couldn’t load/.test(s.msg) && !s.tess && s.other, s);
    await prepPhoto("hang"); await p.waitForFunction(() => window.__started); await p.clock.runFor(60000);
    const early = await ocrState(50); await p.clock.runFor(31000);
    s = await ocrState();
    check("a photo reader that never starts gives up after 90 seconds", early.msg === "still waiting" && /photo reader couldn’t load/.test(s.msg) && !s.tess && s.other, { early, s });
    await p.ctx.close();
  }
};
