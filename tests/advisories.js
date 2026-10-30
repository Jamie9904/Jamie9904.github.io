/*
  Security advisories for the libraries the app loads from CDNs.
  Asks the OSV database (osv.dev, which includes GitHub's advisories) about the exact versions pinned in
  package.json, which a check in tests/run.js keeps equal to the versions the app loads.
  - A new HIGH or CRITICAL advisory fails the run (GitHub then emails a failure notice).
  - Other new advisories are warnings.
  - Advisories listed in tests/advisories-accepted.json, with the reason they don't affect the app, are notes.
  Run: node tests/advisories.js   (needs internet; on GitHub it runs weekly in health.yml and on every push)
  Testing without internet: node tests/advisories.js --from saved-osv-answers.json
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIBS = ["exceljs", "jspdf", "jspdf-autotable", "pdfjs-dist", "pdf-lib", "tesseract.js", "@zxing/library"];
const GH = !!process.env.GITHUB_ACTIONS;
const say = (kind, title, msg) => console.log(GH ? "::" + kind + " title=" + title + "::" + msg.replace(/[\r\n%]/g, " ") : kind.toUpperCase() + "  " + title + ": " + msg);

async function query(name, version) {
  const r = await fetch("https://api.osv.dev/v1/query", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package: { name, ecosystem: "npm" }, version }) });
  if (!r.ok) throw new Error("OSV answered " + r.status + " for " + name + "@" + version);
  return (await r.json()).vulns || [];
}

function severity(v) {
  const s = String((v.database_specific && v.database_specific.severity) || "").toUpperCase();
  return s || "UNKNOWN";
}
function fixedIn(v, name) {
  return (v.affected || []).filter(a => a.package && a.package.name === name)
    .flatMap(a => (a.ranges || []).flatMap(r => (r.events || []).filter(e => e.fixed).map(e => e.fixed))).join(" or ") || "no fix yet";
}

(async () => {
  const dev = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies || {};
  const accepted = JSON.parse(fs.readFileSync(path.join(__dirname, "advisories-accepted.json"), "utf8"));
  const fromIdx = process.argv.indexOf("--from");
  const saved = fromIdx > 0 ? JSON.parse(fs.readFileSync(process.argv[fromIdx + 1], "utf8")) : null;
  let errors = 0, warnings = 0, notes = 0, failed = 0;
  for (const name of LIBS) {
    const version = dev[name];
    if (!version) { say("error", "Library not pinned", name + " is missing from package.json devDependencies"); errors++; continue; }
    let vulns;
    try { vulns = saved ? (saved[name + "@" + version] || []) : await query(name, version); }
    catch (e) { say("error", "Advisory lookup failed", name + "@" + version + ": " + String(e.message || e)); failed++; continue; }
    const ok = accepted[name] || {};
    const seen = new Set();
    for (const v of vulns) {
      const ids = [v.id, ...(v.aliases || [])]; ids.forEach(i => seen.add(i));
      const key = ids.find(i => ok[i]);
      const sev = severity(v), line = name + "@" + version + ": " + v.id + (v.aliases && v.aliases.length ? " (" + v.aliases.join(", ") + ")" : "") + " " + sev + ", fixed in " + fixedIn(v, name) + ". " + (v.summary || "");
      if (key) { notes++; console.log("note   " + line + "  Accepted: " + ok[key]); }
      else if (sev === "HIGH" || sev === "CRITICAL") { errors++; say("error", "New security advisory", line); }
      else { warnings++; say("warning", "New security advisory", line); }
    }
    Object.keys(ok).filter(id => !seen.has(id)).forEach(id => say("notice", "Accepted advisory no longer applies", name + "@" + version + ": " + id + " can be removed from tests/advisories-accepted.json"));
    if (!vulns.length) console.log("ok     " + name + "@" + version + ": no known advisories");
  }
  const sum = errors + " new serious, " + warnings + " new other, " + notes + " accepted" + (failed ? ", " + failed + " couldn't be checked" : "");
  if (GH) console.log("::notice title=Security advisories::" + sum); else console.log("\n" + sum);
  process.exit(errors || failed ? 1 : 0);
})().catch(e => { say("error", "Advisory check stopped", String(e && e.message || e)); process.exit(1); });
