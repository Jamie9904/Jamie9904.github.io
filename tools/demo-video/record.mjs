// Records the Guide demo video (tools/demo-video, see README.md): the real app (a local copy, made-up data) live on stage.html, captured with
// the Chrome screencast; each scene holds for its narration. Writes frames/ + timeline.json (scenes, taps).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(execSync("npm root -g").toString().trim(), "x.js"));
const { chromium } = require("playwright");
const APP = join(here, "..", ".."); // the site itself, read only
const FONTS = join(APP, "fonts");
const OUT = join(here, "out");
const vo = JSON.parse(readFileSync(join(OUT, "vo.json"), "utf8"));
const framesDir = join(OUT, "frames");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
	const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
	const file = p === "/stage.html" ? join(here, "stage.html") : p.startsWith("/t/") ? join(FONTS, p.slice(3)) : join(APP, p === "/" ? "index.html" : p);
	try { const b = readFileSync(file); res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }); res.end(b); }
	catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, serviceWorkers: "block" });
const page = await ctx.newPage();
await page.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
page.setDefaultTimeout(9000);
await page.goto(`${base}/stage.html`);
await page.evaluate(() => document.fonts.ready);
const stage = (fn, ...a) => page.evaluate(([n, x]) => window.__stage[n](...x), [fn, a]);

// A delivery already under way, so the app looks used. Made-up LPNs, no names.
const L = [["VLT004037790","FMCG"],["VLT004037814","FMCG"],["RUN0001830763","FPP"],["RBY006291170","BB"],["QUB001899186","BB"],["VLT004037858","Mixed"],["RBY006291189","FPP"],["QUB001899210","BB"]];
const rows = L.map(([lpn, type], i) => ({ lpn, type, fsdu: i === 2 })).reverse();
await stage("load", { lpninstallshown: "1", lpnbackup: new Date().toISOString(),
	lpnlog: JSON.stringify({ rows, date: new Date().toISOString().slice(0, 10), expect: "12", trailer: "TR4471", recv: "Jamie" }) });
const app = page.frameLocator("#app");
await app.locator("#lpn").waitFor();
const appFrame = () => page.frames().find((f) => f.url().includes("/index.html"));
// Collapse the delivery card so the log and totals are in view.
await appFrame().evaluate(() => { const s = document.getElementById("delSum"); if (s.getAttribute("aria-expanded") === "true") s.click(); });

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
	const file = join(framesDir, `${String(frames.length).padStart(6, "0")}.jpg`);
	frames.push({ file, t: metadata.timestamp });
	writeFileSync(file, Buffer.from(data, "base64"));
	await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const taps = [];
// The app is scaled inside the phone, which throws pointer clicks off: show the tap, then click the element itself.
const tap = async (loc) => {
	await loc.evaluate((e) => e.scrollIntoView({ block: "nearest" })).catch(() => {});
	await sleep(150);
	const b = await loc.boundingBox({ timeout: 3000 });
	await stage("tap", b.x + b.width / 2, b.y + b.height / 2);
	taps.push(Date.now() / 1000);
	await loc.evaluate((e) => { e.focus?.(); e.click(); });
};
const ring = async (loc) => { try { await stage("ring", await loc.boundingBox({ timeout: 3000 })); } catch {} };
const scrollTo = (sel, off) => appFrame().evaluate(([s, o]) => { const e = document.querySelector(s); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - o, behavior: "smooth" }); }, [sel, off]);

const SCENES = [
	{ id: "hook", hold: 3.0, run: async (at) => {
		await stage("card", "hook", true); await sleep(150);
		await stage("typeLpn", "RUN0001830763", 55);
		await at(1050); await stage("logged", true); taps.push(Date.now() / 1000 + 0.0001); // ding
	} },
	{ id: "intro", hold: 4.3, run: async (at) => {
		await stage("card", "hook", false);
		await stage("head", "Meet", "LPN Pallet Log");
		await at(250); await stage("phone", true);
	} },
	{ id: "scan", hold: 6.6, run: async (at) => {
		await stage("head", "Log pallets", "Scan or type.<br>Tap the type.");
		const lpn = app.locator("#lpn");
		await at(700); await tap(app.locator('#tyb button[data-t="FMCG"]'));
		await at(1500); await tap(lpn);
		await lpn.pressSequentially("VLT004037901", { delay: 55 }); await lpn.press("Enter");
		await at(3900); await tap(lpn);
		await lpn.pressSequentially("RUN0001830770", { delay: 55 }); await lpn.press("Enter");
	} },
	{ id: "totals", hold: 4.7, run: async (at) => {
		await stage("head", "Live totals", "You know what’s left.");
		await scrollTo("#sum", 40); await sleep(700);
		await ring(app.locator("#sum"));
		await at(4300); await stage("ring", null);
	} },
	{ id: "manifest", hold: 6.0, run: async (at) => {
		await stage("head", "Manifest check", "Missing or extra,<br>caught at the dock.");
		const tg = app.locator("#cmpToggle");
		await scrollTo("#cmpToggle", 200); await sleep(500);
		await tap(tg);
		await app.locator("#cmpUseLog").waitFor({ state: "visible" });
		await at(1100); await tap(app.locator("#cmpUseLog"));
		await app.locator("#cmpNums").fill(["VLT004037790","VLT004037814","RUN0001830763","RBY006291170","QUB001899186","VLT004037858","RBY006291189","VLT004037901","VLT004037999","RBY006291301"].join("\n"));
		await at(2100); await tap(app.locator("#cmpCheck"));
		await sleep(500);
		await scrollTo("#cmpSum", 120); await sleep(800);
		await ring(app.locator("#cmpSum"));
		await at(5600); await stage("ring", null);
	} },
	{ id: "export", hold: 5.1, run: async (at) => {
		await stage("head", "Exports", "Excel or PDF,<br>ready to print.");
		await scrollTo("#expBtn", 120); await sleep(800);
		await tap(app.locator("#expBtn"));
		await sleep(400); await ring(app.locator("#expMenu"));
		await at(4700); await stage("ring", null);
	} },
	{ id: "outro", hold: 6.4, run: async (at) => {
		await stage("head", "", ""); await stage("phone", false);
		await at(300); await stage("card", "end", true);
		await at(900); await stage("on", "c1", true); await at(1250); await stage("on", "c2", true); await at(1600); await stage("on", "c3", true);
		await at(3900); await stage("on", "endt", true);
	} },
];

await stage("sync", true); await sleep(300); await stage("sync", false); await sleep(300);
const timeline = { scenes: [] };
for (const s of SCENES) {
	const d = vo[s.id].duration;
	const hold = Math.max(s.hold, d + 0.8) * 1000;
	const start = Date.now();
	await stage("sub", "");
	const at = async (ms) => { const w = start + ms - Date.now(); if (w > 0) await sleep(w); };
	const subT = setTimeout(() => stage("sub", vo[s.id].say).catch(() => {}), 250);
	try { await s.run(at); } catch (e) { console.log(`  ${s.id}: ${String(e.message).split("\n")[0]}`); }
	await at(hold);
	clearTimeout(subT);
	timeline.scenes.push({ id: s.id, start: start / 1000, end: Date.now() / 1000, voStart: start / 1000 + 0.25 });
	console.log(`${s.id}: ${((Date.now() - start) / 1000).toFixed(2)} s`);
}
await stage("sub", "");
await sleep(1200);
await cdp.send("Page.stopScreencast");
await sleep(300);
timeline.frames = frames;
timeline.taps = taps;
timeline.end = Date.now() / 1000;
writeFileSync(join(OUT, "timeline.json"), JSON.stringify(timeline));
await browser.close(); server.close();
console.log(`${frames.length} frames`);
