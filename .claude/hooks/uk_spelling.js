// PostToolUse hook: after an app file is edited (index.html or an app .js file), look for US spellings in the text
// people see: quoted text and template text in the JavaScript (not comments or code), and the page's text and
// placeholder/aria-label/title/alt values in index.html (not CSS or class names). Prints each hit with its line
// and exits 2 so Claude fixes it; silent when the text is clean or the file isn't one of the app's.
// Run by hand on every app file:  node .claude/hooks/uk_spelling.js --all
const fs = require("fs"), path = require("path");
const APP = ["index.html", "core.js", "scan.js", "export.js", "compare.js", "panels.js"];
const US = [
  [/\bcolor(s|ed|ful|ing)?\b/i, "colour"], [/\bfavorit(e|es|ed)\b/i, "favourite"], [/\bfavor(s|ed|ing)?\b/i, "favour"],
  [/\b(re)?organiz(e|es|ed|ing|ation|ations)\b/i, "organise"], [/\brecogniz(e|es|ed|ing)\b/i, "recognise"],
  [/\banalyz(e|es|ed|ing)\b/i, "analyse"], [/\bcustomiz(e|es|ed|ing|ation)\b/i, "customise"],
  [/\boptimiz(e|es|ed|ing|ation)\b/i, "optimise"], [/\bminimiz(e|es|ed|ing)\b/i, "minimise"],
  [/\bprioritiz(e|es|ed|ing)\b/i, "prioritise"], [/\bsummariz(e|es|ed|ing)\b/i, "summarise"],
  [/\bapologiz(e|es|ed|ing)\b/i, "apologise"], [/\brealiz(e|es|ed|ing)\b/i, "realise"],
  [/\bauthoriz(e|es|ed|ing|ation)\b/i, "authorise"], [/\bfinaliz(e|es|ed|ing)\b/i, "finalise"],
  [/\bcenter(s|ed)?\b/i, "centre"], [/\bcancel(ed|ing)\b/i, "cancelled / cancelling"],
  [/\blabel(ed|ing)\b/i, "labelled / labelling"], [/\btravel(ed|ing)\b/i, "travelled"], [/\bmodel(ed|ing)\b/i, "modelled"],
  [/\bgray\b/i, "grey"], [/\bbehavior(s)?\b/i, "behaviour"], [/\bhonor(s|ed)?\b/i, "honour"], [/\bneighbor/i, "neighbour"],
  [/\blabor\b/i, "labour"], [/\bdefense\b/i, "defence"], [/\bfulfill(s)?\b/i, "fulfil"], [/\benroll(s)?\b/i, "enrol"],
  [/\btoward\b/i, "towards"], [/\bgotten\b/i, "got"], [/\bcatalog\b/i, "catalogue"], [/\baluminum\b/i, "aluminium"],
  [/\bmeters?\b/i, "metre (unless it's a measuring device)"], [/\bliters?\b/i, "litre"], [/\bpajamas\b/i, "pyjamas"],
];

// The pieces of text a JS file shows: string and template literal contents with their line numbers.
function jsTexts(src) {
  const out = []; let i = 0, line = 1; const n = src.length;
  const stack = []; // for ${ } inside templates: brace depth to return to the template
  let prev = "(";   // last significant character, to tell a regex literal from division
  const nl = s => { for (const c of s) if (c === "\n") line++; };
  const template = () => { // i is just after a backtick or a closing } of ${ }
    let start = i, startLine = line, buf = "";
    while (i < n) {
      const c = src[i];
      if (c === "\\") { buf += src.slice(i, i + 2); nl(src.slice(i, i + 2)); i += 2; continue; }
      if (c === "`") { out.push([buf, startLine]); i++; prev = "a"; return; }
      if (c === "$" && src[i + 1] === "{") { out.push([buf, startLine]); i += 2; stack.push(0); prev = "("; return; }
      if (c === "\n") line++;
      buf += c; i++;
    }
  };
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; nl(src.slice(i, end)); i = end; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, buf = ""; const startLine = line;
      while (j < n && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") { buf += src.slice(j, j + 2); j += 2; } else buf += src[j++]; }
      out.push([buf, startLine]); i = j + 1; prev = "a"; continue;
    }
    if (c === "`") { i++; template(); continue; }
    if (c === "/" && "(,=:[!&|?{};+-*%<>~^".includes(prev)) { // regex literal
      let j = i + 1, cls = false;
      while (j < n && src[j] !== "\n") { const d = src[j]; if (d === "\\") { j += 2; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) break; j++; }
      j++; while (j < n && /[a-z]/i.test(src[j])) j++;
      i = j; prev = "a"; continue;
    }
    if (stack.length) {
      if (c === "{") stack[stack.length - 1]++;
      else if (c === "}") { if (stack[stack.length - 1] === 0) { stack.pop(); i++; template(); continue; } stack[stack.length - 1]--; }
    }
    if (c === "\n") line++;
    if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? "a" : c;
    i++;
  }
  return out;
}

// The text an HTML file shows, with line numbers: text between tags and a few attributes people read.
function htmlTexts(src) {
  const out = [];
  const lineAt = idx => src.slice(0, idx).split("\n").length;
  const blank = s => s.replace(/[^\n]/g, " ");
  const body = src.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank).replace(/<!--[\s\S]*?-->/g, blank);
  for (const m of body.matchAll(/\b(placeholder|aria-label|title|alt)\s*=\s*"([^"]*)"/gi)) out.push([m[2], lineAt(m.index)]);
  for (const m of body.matchAll(/>([^<]+)</g)) if (m[1].trim()) out.push([m[1], lineAt(m.index)]);
  return out;
}

function check(file) {
  const src = fs.readFileSync(file, "utf8");
  const pieces = file.endsWith(".html") ? htmlTexts(src) : jsTexts(src);
  const hits = [];
  for (let [text, line] of pieces) {
    // A lone code word such as "color" or "theme-color" is a name, not text people read.
    if (!/\s/.test(text.trim()) && !/^[A-Z]/.test(text.trim())) continue;
    text = text.replace(/<[^>]*>/g, m => " ".repeat(m.length)) // tags and their attributes
               .replace(/\b[a-z-]+\s*:\s*[^;"'`]*;?/g, m => /\s[a-z]+\s[a-z]+/i.test(m) ? m : " ") // CSS declarations
               .replace(/[\w-]*-[\w-]*|[#.][\w-]+|\b\w+\(/g, m => " ".repeat(m.length)); // css-names, #ids, .classes, calls
    for (const [re, uk] of US) {
      const m = text.match(re);
      if (m) hits.push(`${path.basename(file)}:${line + (text.slice(0, m.index).match(/\n/g) || []).length}: "${m[0]}" (UK: ${uk})`);
    }
  }
  return hits;
}

function main(files) {
  const hits = files.flatMap(check);
  if (hits.length) {
    process.stderr.write("UK spelling check: US spellings in text people see:\n" + hits.join("\n") +
      "\nUse the UK spelling. If one is really a code name, give it no spaces in its string so the check skips it.\n");
    process.exit(2);
  }
}

if (process.argv.includes("--all")) {
  const root = path.resolve(__dirname, "../..");
  main(APP.map(f => path.join(root, f)).filter(f => fs.existsSync(f)));
} else {
  let input = "";
  process.stdin.on("data", d => input += d).on("end", () => {
    let data = {}; try { data = JSON.parse(input || "{}"); } catch (e) { return; }
    const file = (data.tool_input && (data.tool_input.file_path || data.tool_input.path)) || "";
    if (!APP.includes(path.basename(file)) || !fs.existsSync(path.join(path.dirname(file), "sw.js"))) return;
    main([file]);
  });
}
