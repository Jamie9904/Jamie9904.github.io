/* Checks: layout. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Layout");
  for (const w of [375, 768, 1300]) {
    p = await page(browser, w);
    await p.goto(URL0); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const top = id => Math.round(document.getElementById(id).getBoundingClientRect().top);
      const lab = id => Math.round(document.querySelector("label[for=" + id + "]").getBoundingClientRect().top);
      return { overflow: document.documentElement.scrollWidth - innerWidth, date: lab("date"), recv: lab("recv"), dateBox: top("date"), recvBox: top("recv"),
        recvW: Math.round(document.getElementById("recv").getBoundingClientRect().width) };
    });
    check(w + "px: no sideways scrolling", r.overflow <= 0, r.overflow);
    check(w + "px: Date and Received by line up", r.date === r.recv && r.dateBox === r.recvBox, r);
    check(w + "px: Received by box is a usable width", r.recvW >= 140, r.recvW);
    check(w + "px: no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }
};
