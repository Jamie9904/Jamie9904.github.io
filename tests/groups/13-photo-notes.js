/* Checks: photo notes. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Photo notes, Report this, seal boxes, Undo with the Manifest check");
    const q = await page(browser, 390);
    await q.setViewportSize({ width: 390, height: 844 });
    await q.goto(URL0); await q.waitForTimeout(300);
    let s = await q.evaluate(() => { document.getElementById("cmpPfx").value = "";
      const out = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VLT004040355", "VL1004040355"]].map(([a, b]) => ({ raw: a, first: b || a, again: b })));
      return { mended: out.mended, note: readNote("Photo 1", out, { added: 3, dup: 0 }) }; });
    check("a number corrected to match the page is named in the note, to check against the paper", JSON.stringify(s.mended) === '["VLT004040355"]' && /1 number looked misread, so it was corrected \(VLT004040355\): check it against the paper/.test(s.note), s);
    // Report a problem with these photos: shows after a batch and opens the report box with the worst photo attached.
    await q.evaluate(() => { document.getElementById("cmpToggle").click(); let n = 0;
      window.readPhoto = async () => { n++; const a = n === 1 ? ["VLT004040265", "VLT004040273"] : []; a.skipped = []; a.odd = []; a.mended = []; return a; }; });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [1, 2].map(i => ({ name: "m" + i + ".png", mimeType: "image/png", buffer: png })));
    await q.waitForFunction(() => !document.getElementById("cmpReport").hidden, null, { timeout: 5000 }).catch(() => {});
    await q.click("#cmpReport"); await q.waitForTimeout(400);
    s = await q.evaluate(() => ({ open: !document.getElementById("fbBox").hidden, kind: document.querySelector('input[name="fbKind"]:checked').value, text: document.getElementById("fbText").value, hint: document.getElementById("fbText").placeholder, photo: !!fbPhotoData, label: document.getElementById("fbPhotoName").textContent, send: !document.getElementById("fbSend").disabled }));
    check("Report a problem with these photos opens the report box as a Problem with the worst photo attached; the question is a hint, not text", s.open && s.kind === "problem" && s.text === "" && /^What went wrong with photo 2\?/.test(s.hint) && s.photo && /^Photo 2 attached/.test(s.label) && s.send, s);
    s = await q.evaluate(async () => { closeFeedback(); fbPhotoData = null;
      // Closed while the photo is still being added: it isn't kept for the next report.
      const slow = window.fbShrink; window.fbShrink = () => new Promise(r => setTimeout(() => r("data:image/jpeg;base64,/9j/AAAA"), 200));
      openFeedback({ kind: "problem", photo: new File(["x"], "p.jpg"), photoName: "Photo 1" }); const during = document.getElementById("fbSend").disabled; closeFeedback();
      await new Promise(r => setTimeout(r, 300)); window.fbShrink = slow;
      const kept = fbPhotoData;
      // The Report link goes after Clear (and after reading PDFs).
      document.getElementById("cmpClear").click();
      const dup = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VL1004040355", null], ["VL1004040355", null]].map(([a]) => ({ raw: a, first: a, again: null })));
      return { during, kept, link: document.getElementById("cmpReport").hidden, mended: dup.mended }; });
    check("Send waits while the photo is being added, and a box closed meanwhile doesn't keep the photo", s.during === true && s.kept === null, s);
    check("the Report link goes after Clear; a number read twice and corrected is named once", s.link === true && JSON.stringify(s.mended) === '["VLT004040355"]', s);
    await q.evaluate(() => { closeFeedback(); fbPhotoData = null; document.getElementById("fbText").value = ""; });
    // With the Manifest check open on a phone, Undo shows at the top, not over the results.
    s = await q.evaluate(async () => { document.body.classList.add("cmpfocus"); showUndo("Removed X", () => {}); await new Promise(r => setTimeout(r, 50)); const b = document.getElementById("undoBar").getBoundingClientRect(); document.body.classList.remove("cmpfocus"); document.getElementById("undoBar").hidden = true; return { top: Math.round(b.top), h: innerHeight }; });
    check("with the Manifest check open, Undo shows at the top of the screen", s.top >= 0 && s.top < 80, s);
    await q.setViewportSize({ width: 1300, height: 900 }); await q.waitForTimeout(150);
    s = await q.evaluate(() => { const i = document.getElementById("sealIn"); i.value = "SEAL1234567"; return { fits: i.scrollWidth <= i.clientWidth, w: i.clientWidth }; });
    check("on desktop an 11-character seal number fits its box", s.fits, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
