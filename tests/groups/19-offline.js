/* Checks: offline. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Offline");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(800);
  const cached = await p.evaluate(async () => !!navigator.serviceWorker.controller && (await caches.keys()).some(k => /^lpn-log-v/.test(k)));
  check("app saved for offline use", cached);
  await p.ctx.setOffline(true); await p.reload(); await p.waitForTimeout(500);
  check("app opens offline", (await p.title()) === "LPN Pallet Log");
  await p.ctx.close();
};
