// Runs each milestone build of the LPN Pallet Log (from git history) with the same sample delivery and screenshots it.
// node capture.js [ids…]  (writes out/shots/<id>.png and out/shots/<id>.json with the box to outline)
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const REPO = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "out", "shots"); fs.mkdirSync(OUT, { recursive: true });
const FONTS = path.join(REPO, "fonts");
const FONT_CSS = `@font-face{font-family:"Atkinson Hyperlegible";font-weight:400;src:url(/__f/AtkinsonHyperlegible-Regular.woff2)}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:700;src:url(/__f/AtkinsonHyperlegible-Bold.woff2)}
@font-face{font-family:"IBM Plex Mono";font-weight:400;src:url(/__f/IBMPlexMono-Regular.woff2)}
@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url(/__f/IBMPlexMono-Medium.woff2)}
@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(/__f/IBMPlexMono-SemiBold.woff2)}`;

const ROWS = [
  ["VLT004040265", "BB"], ["RUN001830763", "FMCG"], ["QUB001899210", "FPP"], ["RBY006291189", "Mixed"],
  ["VLT004037858", "BB"], ["QUB001899186", "FMCG"], ["RBY006291170", "BB"], ["VLT004037814", "FMCG"],
].map(([lpn, type], i) => ({ lpn, type, fsdu: i === 3 }));
const MAN = ROWS.map(r => r.lpn).concat(["VLT004037999", "RBY006291301", "QUB001899255", "RUN001830770"]).join("\n");
const DEL = { recv: "Jamie", expect: "12", trailer: "TR 4471", sealIn: "112233", sealOut: "112234", notes: "" };

// id, commit, date, extra setup, element to highlight
const ALL = [
  { id: "b13", sha: "61b7047", date: "2026-10-26", hi: "#body", act: "manifest" },
  { id: "b19", sha: "2887748", date: "2026-10-26", hi: "#trailer", act: "delivery" },
  { id: "b23", sha: "34911ce", date: "2026-10-27", hi: "#undoLast", act: "undo" },
  { id: "b34", sha: "d380cc3", date: "2026-10-31", hi: "#cmpSum", act: "manifest" },
  { id: "b44", sha: "6c323d6", date: "2026-11-01", hi: "header .top, header.top button, #fbOpen, #fbBtn", act: "top" },
  { id: "b49", sha: "fafdb43", date: "2026-11-01", hi: ".dmgtag", act: "damage" },
  { id: "b52", sha: "959983e", date: "2026-11-01", hi: "#hello", act: "welcome" },
  { id: "b56", sha: "90c083a", date: "2026-11-05", hi: ".desc, .descline, #body .nolpn", act: "nolpn" },
  { id: "b62", sha: "8b1f694", date: "2026-11-11", hi: ".reftag", act: "refused" },
  { id: "b65", sha: "b494c4e", date: "2026-11-12", hi: "#upload", act: "photos" },
];const SCENES = process.argv[2] ? ALL.filter(s => process.argv.slice(2).includes(s.id)) : ALL;

function serve(dir) {
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      let u = decodeURIComponent(new URL(q.url, "http://x").pathname);
      if (u === "/__fonts.css") { s.writeHead(200, { "content-type": "text/css" }); return s.end(FONT_CSS); }
      const f = u.startsWith("/__f/") ? path.join(FONTS, u.slice(5)) : path.join(dir, u === "/" ? "index.html" : u);
      fs.readFile(f, (e, b) => {
        if (e) { s.writeHead(404); return s.end(); }
        const t = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json" }[path.extname(f)] || "application/octet-stream";
        s.writeHead(200, { "content-type": t }); s.end(b);
      });
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const sc of SCENES) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lpn-" + sc.id + "-"));
    execFileSync("sh", ["-c", `git -C ${REPO} archive ${sc.sha} | tar -x -C ${dir}`]);
    const srv = await serve(dir);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    const p = await ctx.newPage();
    const errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.route("**/*", r => {
      const u = new URL(r.request().url());
      if (u.hostname === "127.0.0.1") return r.continue();
      if (u.hostname === "fonts.googleapis.com") return r.fulfill({ status: 200, contentType: "text/css", body: FONT_CSS.replace(/\/__f\//g, "http://127.0.0.1:" + srv.address().port + "/__f/") });
      return r.abort();
    });
    await p.clock.setFixedTime(new Date(sc.date + "T10:20:00"));
    const welcome = sc.act === "welcome";
    await p.addInitScript(w => { try { localStorage.setItem("lpninstallshown", "1"); localStorage.setItem("lpnseenbuild", "999"); localStorage.setItem("lpnwelcome", w ? "ask" : "1"); } catch (e) {} }, welcome);
    await p.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await p.waitForTimeout(600);
    await p.evaluate(async ({ ROWS, MAN, DEL, act }) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const $ = id => document.getElementById(id);
      const set = (id, v) => { const e = $(id); if (e) { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); } };
      rows = ROWS.map(r => Object.assign({}, r));
      if (act === "damage") rows[1].dmg = "Crushed";
      if (act === "nolpn") { rows[2].desc = "Kitchen roll, full pallet"; }
      if (act === "refused") { rows[4].ref = true; rows[1].dmg = "Wet"; rows[2].desc = "Kitchen roll, full pallet"; }
      if (act === "nolpn" && typeof addNoLpn === "function") { /* added below, after render */ }
      set("recv", DEL.recv); set("expect", DEL.expect); set("trailer", DEL.trailer); set("sealIn", DEL.sealIn); set("sealOut", DEL.sealOut);
      if (typeof save === "function") save(); if (typeof render === "function") render();
      if ($("cmpNums")) { set("cmpNums", MAN); if (typeof save === "function") save(); if (typeof render === "function") render(); }
      if (act === "manifest" && $("cmpBody") && ($("cmpBody").hidden || getComputedStyle($("cmpBody")).display === "none") && $("cmpToggle")) { $("cmpToggle").click(); await wait(200); }
      if (act === "manifest") { set("cmpNums", MAN.split("\n").filter(x => !["VLT004037858", "QUB001899186"].includes(x)).join("\n")); }
      if (act === "manifest" && $("cmpUseLog")) { $("cmpUseLog").click(); await wait(200); }
      if (act === "manifest" && $("cmpCheck")) { const lg = $("cmpLogNums"); if (lg && !lg.value) set("cmpLogNums", ROWS.map(r => r.lpn).join("\n")); $("cmpCheck").click(); await wait(300); }
      if (act === "undo" && typeof tryAdd === "function") { $("lpn").value = "VLT004037770"; $("add").click(); await wait(200); }
      if (act === "nolpn" && typeof addNoLpn === "function") { try { await addNoLpn(); } catch (e) {} await wait(200); document.activeElement && document.activeElement.blur(); }
      if (act === "photos") { const b = $("scanBtn"); if (b && getComputedStyle(b).display !== "none") b.click(); await wait(200); }
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      if (typeof render === "function" && act !== "nolpn") render();
      await wait(300);
    }, { ROWS, MAN, DEL, act: sc.act });
    await p.evaluate(() => document.fonts.ready);
    // Bring the highlighted element into view and record where it is.
    const box = await p.evaluate(sel => {
      const el = sel.split(",").map(s => document.querySelector(s.trim())).find(e => e && e.getBoundingClientRect().height > 0);
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, tag: el.tagName + "#" + el.id + "." + el.className };
    }, sc.hi);
    await p.waitForTimeout(400);
    const box2 = await p.evaluate(sel => {
      const el = sel.split(",").map(s => document.querySelector(s.trim())).find(e => e && e.getBoundingClientRect().height > 0);
      if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, sc.hi);
    await p.screenshot({ path: path.join(OUT, sc.id + ".png") });
    fs.writeFileSync(path.join(OUT, sc.id + ".json"), JSON.stringify({ box: box2, found: box && box.tag, errs }));
    console.log(sc.id, sc.sha, box ? box.tag : "NO HIGHLIGHT", errs.length ? "errors: " + errs.join(" | ").slice(0, 200) : "");
    await ctx.close(); srv.close(); fs.rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
})();
