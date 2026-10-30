/*
  Fingerprint of the screens the Guide demo video shows: position, size, text and colours of the key parts of the
  log view and the manifest check results, with the same made-up delivery the video uses (fixed date).
  tests/run.js compares the app against screens.json and warns (never fails) when they differ, meaning the video
  may be out of date. make.sh writes screens.json after re-recording:  node tools/demo-video/screens.js --write
*/
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "screens.json");
const L = [["VLT004037790","FMCG"],["VLT004037814","FMCG"],["RUN0001830763","FPP"],["RBY006291170","BB"],["QUB001899186","BB"],["VLT004037858","Mixed"],["RBY006291189","FPP"],["QUB001899210","BB"]];
const SEED = { lpninstallshown: "1", lpnbackup: "2026-10-30T12:00:00.000Z",
	lpnlog: JSON.stringify({ rows: L.map(([lpn, type], i) => ({ lpn, type, fsdu: i === 2 })).reverse(), date: "2026-10-30", expect: "12", trailer: "TR4471", recv: "Jamie" }) };
const MANIFEST = ["VLT004037790","VLT004037814","RUN0001830763","RBY006291170","QUB001899186","VLT004037858","RBY006291189","VLT004037999","RBY006291301"];

/** Opens the app at phone size in `page` (already routed to the local server at url) and returns the fingerprint. */
async function fingerprint(page, url) {
	await page.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); }, SEED);
	await page.goto(url); await page.waitForTimeout(400);
	const grab = (sels) => page.evaluate((sels) => sels.map((s) => {
		const e = document.querySelector(s); if (!e) return { s, missing: true };
		const r = e.getBoundingClientRect(), c = getComputedStyle(e);
		return { s, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
			text: (e.innerText || e.value || "").replace(/\s+/g, " ").trim().slice(0, 80), bg: c.backgroundColor, fg: c.color };
	}), sels);
	await page.evaluate(() => { const s = document.getElementById("delSum"); if (s.getAttribute("aria-expanded") === "true") s.click(); window.scrollTo(0, 0); });
	await page.waitForTimeout(200);
	const log = await grab(["header h1", "#btnGuide", "#delSum", "#sum", "#tyb", "#lpn", "#expBtn"]);
	await page.evaluate((man) => {
		document.getElementById("cmpToggle").click(); document.getElementById("cmpUseLog").click();
		document.getElementById("cmpNums").value = man.join("\n"); document.getElementById("cmpCheck").click();
	}, MANIFEST);
	await page.waitForTimeout(400);
	await page.evaluate(() => document.getElementById("cmpSum").scrollIntoView({ block: "start" }));
	await page.waitForTimeout(200);
	const cmp = (await grab(["#cmpSum", "#cmpRes"])).map((e) => ({ ...e, y: undefined })); // position on the page depends on scrolling
	return { log, cmp };
}

/** Lists what differs: missing parts, changed text or colours, or moves/resizes beyond 6 px. */
function differences(want, got) {
	const out = [];
	for (const k of ["log", "cmp"]) (want[k] || []).forEach((a, i) => {
		const b = (got[k] || [])[i] || { missing: true };
		if (a.missing !== b.missing) return out.push(a.s + (b.missing ? " is gone" : " is new"));
		if (a.missing) return;
		if (a.text !== b.text) out.push(a.s + " text: \"" + a.text + "\" → \"" + b.text + "\"");
		if (a.bg !== b.bg || a.fg !== b.fg) out.push(a.s + " colours changed");
		for (const d of ["x", "y", "w", "h"]) if (a[d] !== undefined && Math.abs(a[d] - b[d]) > 6) { out.push(a.s + " moved or resized"); break; }
	});
	return out;
}

module.exports = { fingerprint, differences, FILE };

// node tools/demo-video/screens.js --write : records the current screens as the reference.
if (require.main === module && process.argv.includes("--write")) (async () => {
	const http = require("http");
	const { chromium } = require("playwright");
	const ROOT = path.join(__dirname, "..", "..");
	const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg" };
	const srv = http.createServer((req, res) => {
		const p = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, p === "/" ? "index.html" : p);
		if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
		res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
	}).listen(0, "127.0.0.1");
	await new Promise((r) => srv.on("listening", r));
	const b = await chromium.launch();
	const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
	const p = await ctx.newPage();
	await p.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
	const fp = await fingerprint(p, "http://127.0.0.1:" + srv.address().port + "/index.html");
	fs.writeFileSync(FILE, JSON.stringify(fp, null, 1) + "\n");
	await b.close(); srv.close();
	console.log("Wrote " + FILE);
})();
