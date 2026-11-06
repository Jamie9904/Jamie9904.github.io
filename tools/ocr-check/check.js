/*
  Photo reading check: runs the app's own photo code (prep, close-up re-read, tidy-up, prefix list) on a folder of
  manifest photos and scores the LPNs it finds against the ones printed on them.

    node tools/ocr-check/check.js [folder] [--engine=cli|js] [--prefix=VLT,QUB]

  folder   photos plus expected.json ({"photo.jpg": ["LPN", ...]}); default: tools/ocr-check (photos/ + expected.json).
           Without expected.json it just lists what each photo gives.
  --url    read with the app at this address instead of this folder, e.g. the live site (uses the js engine).
  --engine cli (default when the tesseract command is installed): the Tesseract 5 command for the reading, the app's
           code for everything else. Works offline.
           js: the app's real ocrLpns() with tesseract.js, exactly as on a phone. Needs cdn.jsdelivr.net and tessdata.
  Exit code 1 when any expected LPN is missing or anything extra is found.

  tests/groups/18-real-photo.js uses score() and the js engine on GitHub, where the real photo reader can be downloaded.
*/
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..", "..");

/** Compares what was read with what is printed: right, missing and extra LPNs. */
function score(want, got) {
	const g = new Set(got), w = new Set(want);
	return { right: want.filter(x => g.has(x)), missing: want.filter(x => !g.has(x)), extra: [...g].filter(x => !w.has(x)) };
}

/** Photos and expected LPNs in a folder: [{name, file, want}] (want is null without expected.json). */
function load(folder) {
	const exp = fs.existsSync(path.join(folder, "expected.json")) ? JSON.parse(fs.readFileSync(path.join(folder, "expected.json"), "utf8")) : null;
	const dir = fs.existsSync(path.join(folder, "photos")) ? path.join(folder, "photos") : folder;
	return fs.readdirSync(dir).filter(n => /\.(jpe?g|png|webp)$/i.test(n)).sort().map(n => ({ name: n, file: path.join(dir, n), want: exp ? exp[n] || [] : null }));
}

/** Puts a photo's bytes into the page as a File and runs fn(file) there. */
const inPage = (page, file, fn, arg) => page.evaluate(async ([b64, type, fnSrc, arg]) => {
	const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
	return (0, eval)("(" + fnSrc + ")")(new File([u], "p", { type }), arg);
}, [fs.readFileSync(file).toString("base64"), /png$/i.test(file) ? "image/png" : "image/jpeg", fn.toString(), arg]);

const WL = ["-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ", "-c", "preserve_interword_spaces=1"];
function tess(png, psm, tsv) {
	const f = path.join(os.tmpdir(), "lpn-ocr-" + process.pid + ".png"); fs.writeFileSync(f, png);
	return execFileSync("tesseract", [f, "-", "--psm", String(psm), ...WL, ...(tsv ? ["tsv"] : [])], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/** The cli engine: app prep → Tesseract (mode 11) → app close-up crops → Tesseract (mode 7) → app tidy-up. Like
    ocrLpnsNow, a photo with nothing LPN-like is turned 90°, then 270°, then 180° and read again. */
async function readCli(page, file, prefix) {
	await inPage(page, file, async f => { window.__cv0 = window.__cv = await prep(f); return 1; });
	let got = await readCliCanvas(page, prefix), turned = 0;
	const none = o => !o.found.length && !o.skipped.length && !(o.odd || []).length;
	for (const deg of [90, 270, 180]) {
		if (!none(got)) break;
		await page.evaluate(deg => { window.__cv = turnCanvas(window.__cv0, deg); }, deg);
		const g = await readCliCanvas(page, prefix);
		if (!none(g)) { got = g; turned = deg; }
	}
	if (turned) got.turned = turned;
	return got;
}
async function readCliCanvas(page, prefix) {
	const png = await page.evaluate(() => window.__cv.toDataURL("image/png").split(",")[1]);
	const rows = tess(Buffer.from(png, "base64"), 11, true).trim().split("\n").slice(1).map(l => l.split("\t")).filter(r => r.length > 11 && r[11].trim());
	const items = [], orig = new Set();
	// The app's own word handling (labels, numbers read with a gap), so this check and phones agree.
	const words = rows.map(r => ({ text: r[11], bbox: { x0: +r[6], y0: +r[7], x1: +r[6] + +r[8], y1: +r[7] + +r[9] } }));
	for (const c of await page.evaluate(w => ocrWordCands(w), words)) {
		orig.add(c.first);
		const crop = await page.evaluate(bb => cropScaled(window.__cv, bb).toDataURL("image/png").split(",")[1], c.bbox);
		const again = await page.evaluate(t => { const a = extractLpns(t, true); return a.length === 1 ? a[0] : null; }, tess(Buffer.from(crop, "base64"), 7).replace(/\s+/g, ""));
		items.push({ raw: c.raw, first: c.first, again, lab: c.lab });
	}
	const text = rows.map(r => r[11]).join(" ");
	return page.evaluate(([items, text, orig, prefix]) => {
		extractLpns(text, true).forEach(x => { if (!orig.includes(x)) items.push({ raw: x, first: x, again: null, whole: true }); });
		document.getElementById("cmpPfx").value = prefix; const out = photoLpns(items);
		return { found: [...out], skipped: out.skipped, ignored: tidyReads(items).ignored, odd: out.odd };
	}, [items, text, [...orig], prefix]);
}

/** The js engine: the app's real ocrLpns(), as on a phone. */
async function readJs(page, file, prefix) {
	return inPage(page, file, async (f, prefix) => {
		document.getElementById("cmpPfx").value = prefix;
		for (let i = 0; i < 2; i++) { try { const out = await ocrLpns(f); return { found: [...out], skipped: out.skipped, items: window.__ocrItems }; } catch (e) { if (i) return { err: e.message }; } }
	}, prefix);
}

/** Opens the app from this folder in a browser page; net:true lets the photo reader's files download. */
async function openApp(chromium, net, url) {
	if (url) { // the live site (or any copy): nothing served from here
		const b = await chromium.launch(), ctx = await b.newContext({ serviceWorkers: "block" }), page = await ctx.newPage(), host = new URL(url).hostname;
		await page.route("**/*", r => { const u = new URL(r.request().url()); return u.hostname === host || (net && /tesseract|tessdata/.test(u.href)) ? r.continue() : r.abort(); });
		await page.addInitScript(() => { try { localStorage.setItem("lpninstallshown", "1"); } catch (e) {} });
		await page.goto(url + (url.includes("?") ? "&" : "?") + "check=" + Date.now()); await page.waitForTimeout(800);
		return { page, close: () => b.close() };
	}
	const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
	const srv = http.createServer((q, r) => {
		const p = decodeURIComponent(q.url.split("?")[0]), f = path.join(ROOT, p === "/" ? "index.html" : p);
		if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
		r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
	}).listen(0, "127.0.0.1");
	await new Promise(r => srv.on("listening", r));
	const b = await chromium.launch(), ctx = await b.newContext({ serviceWorkers: "block" }), page = await ctx.newPage();
	await page.route("**/*", r => { const u = new URL(r.request().url()); return u.hostname === "127.0.0.1" || (net && /tesseract|tessdata/.test(u.href)) ? r.continue() : r.abort(); });
	await page.addInitScript(() => { try { localStorage.setItem("lpninstallshown", "1"); } catch (e) {} });
	await page.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await page.waitForTimeout(300);
	return { page, close: async () => { await b.close(); srv.close(); } };
}

module.exports = { score, load, readJs, readCli, openApp };

if (require.main === module) (async () => {
	const args = process.argv.slice(2), opt = n => (args.find(a => a.startsWith("--" + n + "=")) || "").split("=").slice(1).join("=");
	const folder = path.resolve(args.find(a => !a.startsWith("--")) || __dirname);
	let engine = opt("engine"); if (!engine) { try { execFileSync("tesseract", ["--version"], { stdio: "ignore" }); engine = "cli"; } catch (e) { engine = "js"; } }
	const prefix = opt("prefix") || "";
	const { chromium } = require("playwright");
	const url = opt("url"); if (url) engine = "js"; // the live site's own reader
	const app = await openApp(chromium, engine === "js", url);
	let right = 0, total = 0, bad = 0;
	console.log("Photo reading check (" + engine + " engine" + (url ? ", " + url : "") + (prefix ? ", prefixes " + prefix : "") + ")");
	for (const ph of load(folder)) {
		const t0 = Date.now();
		const r = engine === "js" ? await readJs(app.page, ph.file, prefix) : await readCli(app.page, ph.file, prefix);
		const secs = ((Date.now() - t0) / 1000).toFixed(1) + " s";
		if (r.err) { console.log("  " + ph.name + ": couldn't be read (" + r.err + ")"); bad++; continue; }
		if (!ph.want) { console.log("  " + ph.name + " (" + secs + "): " + r.found.join(" ") + (r.skipped && r.skipped.length ? " | left out for prefix: " + r.skipped.join(" ") : "")); continue; }
		// With a prefix list, only the expected LPNs with a listed prefix should be found; the rest should be reported.
		const pf = prefix ? prefix.toUpperCase().split(/[^A-Z]+/).filter(Boolean) : [];
		const want = pf.length ? ph.want.filter(x => pf.some(p => x.startsWith(p))) : ph.want;
		const notReported = pf.length ? ph.want.filter(x => !want.includes(x) && !(r.skipped || []).includes(x)) : [];
		const s = score(want, r.found); if (notReported.length) s.missing.push(...notReported.map(x => x + " (not reported as left out)")); right += s.right.length; total += want.length; if (s.missing.length || s.extra.length) bad++;
		console.log("  " + ph.name + " (" + secs + "): " + s.right.length + " of " + want.length + " right" + (s.missing.length ? " · missing " + s.missing.join(" ") : "") + (s.extra.length ? " · extra " + s.extra.join(" ") : "") + (r.ignored && r.ignored.length ? " · ignored " + r.ignored.join(" ") : "") + (pf.length && r.skipped && r.skipped.length ? " · reported as left out: " + r.skipped.length : ""));
	}
	if (total) console.log("Total: " + right + " of " + total + " right" + (bad ? ", " + bad + " photo(s) with problems" : ", nothing extra"));
	await app.close();
	process.exit(bad ? 1 : 0);
})();
