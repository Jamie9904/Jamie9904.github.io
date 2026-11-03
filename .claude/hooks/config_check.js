// PostToolUse hook: after config.js is edited or written, check it the way the app and the GitHub check read it:
// it must run, set window.LPN_CONFIG with plain features/testing lists, use only names from FEATURES in core.js,
// give every feature a value, use only true or false, and contain no __proto__/constructor/prototype.
// Prints the problems and exits 2 (shown to Claude) when something is wrong; silent otherwise.
const fs = require("fs"), path = require("path"), vm = require("vm");
let input = "";
process.stdin.on("data", d => input += d).on("end", () => {
  let data = {};
  try { data = JSON.parse(input || "{}"); } catch (e) { return; }
  const file = (data.tool_input && (data.tool_input.file_path || data.tool_input.path)) || "";
  if (path.basename(file) !== "config.js") return;
  const root = path.dirname(file), core = path.join(root, "core.js");
  if (!fs.existsSync(core)) return; // not the LPN Pallet Log's config.js
  const bad = [];
  let known = [];
  try { known = JSON.parse(fs.readFileSync(core, "utf8").match(/const FEATURES=(\[[^\]]*\])/)[1]); } catch (e) { bad.push("couldn't read FEATURES from core.js"); }
  let src = "", cfg = null, OP = Object.prototype;
  try { src = fs.readFileSync(file, "utf8"); } catch (e) { bad.push("couldn't read config.js"); }
  try { const ctx = vm.createContext({ window: {} }); vm.runInContext(src, ctx, { timeout: 1000 }); cfg = ctx.window.LPN_CONFIG; OP = vm.runInContext("Object.prototype", ctx); }
  catch (e) { bad.push("config.js doesn't run: " + e.message); }
  if (src && /__proto__|constructor|prototype/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""))) bad.push("config.js may only contain the feature names");
  if (!bad.length) {
    if (!cfg || typeof cfg !== "object") bad.push("config.js must set window.LPN_CONFIG = { features: {…}, testing: {…} }");
    else {
      for (const part of ["features", "testing"]) {
        const o = cfg[part];
        if (o === undefined) continue;
        if (typeof o !== "object" || o === null || Array.isArray(o) || Object.getPrototypeOf(o) !== OP) { bad.push(part + " must be a plain { … } list"); continue; }
        for (const [k, v] of Object.entries(o)) {
          if (!known.includes(k)) bad.push(part + "." + k + " isn't a known feature");
          if (typeof v !== "boolean") bad.push(part + "." + k + " must be true or false");
        }
      }
      for (const k of known) if (!Object.prototype.hasOwnProperty.call(cfg.features || {}, k)) bad.push("features." + k + " is missing");
    }
  }
  if (bad.length) {
    process.stderr.write("config.js check: " + bad.join("; ") + ". Fix config.js (the app would ignore the broken part and keep every feature on).\n");
    process.exit(2);
  }
});
