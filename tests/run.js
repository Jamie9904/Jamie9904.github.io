/*
  LPN Pallet Log: automatic checks.
  Run from the site folder:  npm install  then  npm test
  Starts a small local web server, opens the app in Chromium (via Playwright)
  at phone, tablet and desktop sizes, and checks the main features.
  Outside libraries (ExcelJS, jsPDF and so on) are blocked and replaced with
  small stand-ins, so the checks run offline and give the same result every time.
  The checks are in tests/groups (one file per area, run in name order); shared helpers
  such as check() and page() are in tests/lib.js.
*/const fs = require("fs");
const path = require("path");
const { chromium, serve, REAL_LIBS, counts, fail } = require("./lib");

(async () => {
  const srv = await serve();
  const URL0 = "http://127.0.0.1:" + srv.address().port + "/index.html";
  const browser = await chromium.launch();
  // Every file in tests/groups, in name order (01-…, 02-…).
  for (const f of fs.readdirSync(path.join(__dirname, "groups")).filter(n => /^\d+-.+\.js$/.test(n)).sort()) {
    await require("./groups/" + f)({ browser, URL0 });
  }
  await browser.close(); srv.close();
  const { passed, failed } = counts();
  console.log("\n" + passed + " passed, " + failed + " failed");
  // On GitHub the real libraries must be there; a summary note shows whether they ran.
  if (process.env.GITHUB_ACTIONS) {
    if (!REAL_LIBS) { fail(); console.log("::error title=Real export libraries missing::npm install didn't fetch ExcelJS, jsPDF and pdf.js, so the real export checks were skipped."); }
    const c = counts();
    console.log("::notice title=Checks::" + c.passed + " passed, " + c.failed + " failed" + (REAL_LIBS ? ", including the real export library checks" : ", real export library checks skipped"));
  }
  process.exit(counts().failed ? 1 : 0);
})().catch(e => {
  console.error(e);
  if (process.env.GITHUB_ACTIONS) console.log("::error title=Test run stopped::" + String(e && e.message || e).replace(/[\r\n%]/g, " ").slice(0, 900));
  process.exit(1);
});
