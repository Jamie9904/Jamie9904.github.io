/*
  Checks that every library file the app loads still matches the fingerprint (integrity hash) in core.js.
  If a CDN ever changes a file, the browser would refuse it and that feature would stop working, so this
  runs weekly in health.yml (and on every push without blocking it) to give warning first.
  Run: node tests/sri.js   (needs internet)
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const GH = !!process.env.GITHUB_ACTIONS;
const code = fs.readFileSync(path.join(__dirname, "..", "core.js"), "utf8");
const list = [...code.matchAll(/^  "(https:[^"]+)":"(sha384-[A-Za-z0-9+\/=]+)"/gm)].map(m => ({ url: m[1], want: m[2] }));
(async () => {
  let bad = 0;
  if (!list.length) { console.log((GH ? "::error title=Fingerprints::" : "") + "No fingerprints found in core.js"); process.exit(1); }
  for (const { url, want } of list) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const got = "sha384-" + crypto.createHash("sha384").update(Buffer.from(await r.arrayBuffer())).digest("base64");
      if (got === want) console.log("ok    " + url);
      else { bad++; console.log((GH ? "::error title=Library file changed::" : "FAIL  ") + url + " no longer matches its fingerprint (now " + got + ")"); }
    } catch (e) { bad++; console.log((GH ? "::error title=Library download failed::" : "FAIL  ") + url + ": " + (e.message || e)); }
  }
  console.log((GH ? "::notice title=Library fingerprints::" : "\n") + (list.length - bad) + " of " + list.length + " library files match");
  process.exit(bad ? 1 : 0);
})();
