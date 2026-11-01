/* Checks: security policy. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Security policy");
  {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    const pol = m ? m[1] : "";
    const ok = /child-src 'self' blob:/.test(pol) && /script-src 'self' https:\/\/cdnjs\.cloudflare\.com https:\/\/cdn\.jsdelivr\.net https:\/\/unpkg\.com 'wasm-unsafe-eval';/.test(pol) && !/unsafe-eval'|'unsafe-inline'[^;]*;\s*worker/.test(pol.replace("'wasm-unsafe-eval'", "")) && /base-uri 'none'/.test(pol) && /object-src blob:/.test(pol) && html.indexOf(m && m[0]) < html.indexOf("<script");
    check("the security policy is in place before any script, with no general eval allowed", !!m && ok, pol);
    // Everyday screens under the policy (libraries are stand-ins here): nothing may be blocked.
    p = await page(browser, 375, { init: () => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "inline"))); } });
    await p.goto(URL0); await p.waitForTimeout(300);
    s = await p.evaluate(async () => {
      for (const id of ["btnSet", "btnGuide"]) { const b = document.getElementById(id); if (b) { b.click(); await new Promise(r => setTimeout(r, 100)); closeHelp(); } }
      rows = [{ lpn: "RUN0001830763", type: "FPP", fsdu: false }]; save(); render();
      return window.__csp;
    });
    check("everyday screens run under the security policy with nothing blocked", s.length === 0 && p.errors.length === 0, { blocked: s, errors: p.errors });
    await p.ctx.close();
  }
};
