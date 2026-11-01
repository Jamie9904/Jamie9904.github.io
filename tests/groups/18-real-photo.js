/* Checks: real photo. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  if (REAL_LIBS) {
    console.log("Real photo reading and the security policy (GitHub only)");
    // The photo reader's worker, engine and English language data come from the real internet here.
    p = await page(browser, 1300, { real: true, net: true });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const cv = document.createElement("canvas"); cv.width = 900; cv.height = 160; const g = cv.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, 900, 160); g.fillStyle = "#000"; g.font = "bold 64px monospace"; g.fillText("VLT003977037", 40, 105);
      const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      // One retry: the language data comes from the internet, and a network blip isn't a fault in the app.
      for (let i = 0; i < 2; i++) { try { return { found: await ocrLpns(new File([blob], "p.png", { type: "image/png" })), tries: i + 1 }; } catch (e) { if (i) return { err: e.message }; } }
    });
    check("real photo reading finds an LPN in a picture", Array.isArray(s.found) && s.found.includes("VLT003977037"), s);
    // Real manifest photos from the user (tools/ocr-check, address boxes cut off), read exactly as on a phone.
    {
      const oc = require(path.join(ROOT, "tools", "ocr-check", "check.js"));
      let right = 0, total = 0; const probs = [];
      for (const ph of oc.load(path.join(ROOT, "tools", "ocr-check"))) {
        const r = await oc.readJs(p, ph.file, "");
        if (r.err) { probs.push(ph.name + ": " + r.err); total += ph.want.length; continue; }
        const sc = oc.score(ph.want, r.found); right += sc.right.length; total += ph.want.length;
        if (sc.missing.length || sc.extra.length) {
          probs.push(ph.name + (sc.missing.length ? " missing " + sc.missing.join(" ") : "") + (sc.extra.length ? " extra " + sc.extra.join(" ") : ""));
          // What the reader saw for each number (raw text, first read, close-up), to work out a fix.
          if (process.env.GITHUB_ACTIONS) console.log("::notice title=Photo reading detail " + ph.name + "::" + (r.items || []).map(i => i.raw.replace(/\s+/g, "_") + ">" + i.first + ">" + (i.again || "-")).join(" ").slice(0, 900));
        }
      }
      if (process.env.GITHUB_ACTIONS) console.log("::notice title=Photo reading::" + right + " of " + total + " LPNs right on the user's manifest photos" + (probs.length ? "; " + probs.join("; ") : ", nothing extra"));
      check("real photo reading gets every LPN on the user's manifest photos, and nothing extra", right === total && !probs.length, { right, total, probs });
    }
    await p.ctx.close();

    // The app's Content-Security-Policy (index.html): every flow must work under it with nothing blocked.
    const cspConsole = [];
    p = await page(browser, 1300, { real: true, net: true, init: () => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); } });
    // Blocks inside the background workers (pdf.js, photo reader) don't reach the page's event, but do reach the console.
    const onMsg = m => { if (/Content.Security.Policy/i.test(m.text())) cspConsole.push(m.text().slice(0, 200)); };
    p.on("console", onMsg); p.on("worker", w => w.on("console", onMsg));
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      const flows = {};
      const run = async (name, fn) => { try { await fn(); flows[name] = "ok"; } catch (e) { flows[name] = "failed: " + e.message; } };
      rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render(); window.saveOnly = async () => {};
      await run("excel", () => document.getElementById("dl").onclick());
      let pdf; await run("pdf export", async () => { pdf = await buildLogPdf("2026-10-26"); });
      await run("pdf reading", async () => { if ((await parseExported(new File([pdf], "l.pdf"))).rows.length !== 1) throw new Error("no rows"); });
      await run("pdf merge", async () => { await loadPdfLib(); });
      await run("photo reading", async () => { const cv = document.createElement("canvas"); cv.width = 600; cv.height = 120; const g = cv.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, 600, 120); g.fillStyle = "#000"; g.font = "bold 48px monospace"; g.fillText("VLT003977037", 20, 80);
        const b = await new Promise(r => cv.toBlob(r, "image/png")); await ocrLpns(new File([b], "p.png", { type: "image/png" })); });
      await run("printing", async () => { await printBuf(pdf.slice(0), "l.pdf", { textContent: "" }); });
      await run("barcode scanner library", async () => { await loadZX(); new ZXing.BrowserMultiFormatReader(); });
      await new Promise(r => setTimeout(r, 300));
      return { flows, blocked: [...new Set(window.__csp)] };
    });
    s.workerBlocks = cspConsole;
    check("every flow works under the security policy and nothing is blocked (page and workers)", Object.values(s.flows).every(v => v === "ok") && !s.blocked.length && !cspConsole.length, s);
    await p.ctx.close();
  }
};
