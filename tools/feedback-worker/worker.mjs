/*
  LPN Pallet Log feedback Worker (Cloudflare Workers, free plan).

  The app can't hold a GitHub key (the site is public), so reports go here first. This Worker checks them and
  turns each one into an issue in a private GitHub repo, with the optional photo saved in that repo.

  POST /report  JSON {kind:"problem"|"idea", text, report?, app?, photo?, website?}
    kind     problem or idea
    text     what happened (1 to 4000 characters)
    report   the app's problem report as plain text (optional, up to 60 000 characters)
    app      app version line, e.g. "LPN Pallet Log v3.30 (build 43)" (optional)
    photo    a JPEG as a data: URL (optional, up to about 1.5 MB)
    website  must be empty (a hidden field that only spam robots fill in)
  Answers {ok:true, issue:<number>} or {ok:false, error:"..."} with a plain message.

  Settings (wrangler.toml [vars]): REPO ("owner/name" of the private repo), ALLOWED_ORIGIN (the app's address).
  Secret: GITHUB_TOKEN, a fine-grained token for that one repo with Issues and Contents read and write.
*/
const MAX_BODY = 2_400_000, MAX_TEXT = 4000, MAX_REPORT = 60_000, MAX_PHOTO = 1_600_000, PER_HOUR = 20;
const hits = new Map(); // best-effort limit per address, per Worker instance

function cors(env, origin) {
	const ok = origin && origin === env.ALLOWED_ORIGIN;
	return { "Access-Control-Allow-Origin": ok ? origin : env.ALLOWED_ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
const json = (h, status, o) => new Response(JSON.stringify(o), { status, headers: { ...h, "Content-Type": "application/json" } });

/** Text shown in the issue exactly as typed: in a ~~~~ block, so it can't add links, mentions or formatting. */
export function block(s) {
	const t = String(s).replace(/\r\n?/g, "\n").replace(/~{4,}/g, (m) => m.replace(/~/g, "∼"));
	return "~~~~text\n" + t + "\n~~~~";
}

/** Checks a report and returns {kind, text, report, app, photo} or throws a plain message. */
export function check(o) {
	if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("That report couldn't be read.");
	if (o.website) throw new Error("That report couldn't be sent.");
	const kind = o.kind === "idea" ? "idea" : o.kind === "problem" ? "problem" : null;
	if (!kind) throw new Error("Choose Problem or Idea.");
	const text = typeof o.text === "string" ? o.text.trim() : "";
	if (!text) throw new Error("Write what happened first.");
	if (text.length > MAX_TEXT) throw new Error("That's too long: keep it under " + MAX_TEXT + " characters.");
	const report = typeof o.report === "string" ? o.report.slice(0, MAX_REPORT) : "";
	const app = typeof o.app === "string" ? o.app.slice(0, 200).replace(/[\r\n]+/g, " ") : "";
	let photo = null;
	if (o.photo != null && o.photo !== "") {
		const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(o.photo));
		if (!m) throw new Error("The photo couldn't be read.");
		if (m[1].length * 0.75 > MAX_PHOTO) throw new Error("The photo is too big.");
		photo = m[1];
	}
	return { kind, text, report, app, photo };
}

/** The issue's title and body. */
export function issueOf(r, photoPath, repo) {
	const first = r.text.split("\n")[0].replace(/\s+/g, " ").slice(0, 70);
	const title = (r.kind === "idea" ? "Idea: " : "Problem: ") + first + (r.text.length > first.length ? "…" : "");
	const parts = ["**" + (r.kind === "idea" ? "Idea" : "Problem") + "** sent from the app" + (r.app ? " (" + r.app.replace(/[`*_<>[\]]/g, "") + ")" : "") + ".", "", block(r.text)];
	if (photoPath) parts.push("", "Photo: [" + photoPath + "](https://github.com/" + repo + "/blob/HEAD/" + photoPath + ")", "", "![photo](https://github.com/" + repo + "/blob/HEAD/" + photoPath + "?raw=true)");
	if (r.report) parts.push("", "<details><summary>Problem report</summary>", "", block(r.report), "", "</details>");
	return { title, body: parts.join("\n") };
}

async function gh(env, path, method, body) {
	const res = await fetch("https://api.github.com/repos/" + env.REPO + path, { method,
		headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "lpn-feedback-worker", "Content-Type": "application/json" }, body: JSON.stringify(body) });
	if (!res.ok) throw Object.assign(new Error("GitHub " + res.status), { status: res.status });
	return res.json();
}

export default {
	async fetch(req, env) {
		const origin = req.headers.get("Origin") || "", h = cors(env, origin), url = new URL(req.url);
		if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
		if (url.pathname !== "/report" || req.method !== "POST") return json(h, 404, { ok: false, error: "Not found." });
		if (origin !== env.ALLOWED_ORIGIN) return json(h, 403, { ok: false, error: "Reports can only be sent from the app." });
		if (!env.GITHUB_TOKEN || !env.REPO) return json(h, 503, { ok: false, error: "Reporting isn't set up yet." });
		const ip = req.headers.get("CF-Connecting-IP") || "?", now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
		if (list.length >= PER_HOUR) return json(h, 429, { ok: false, error: "Too many reports in the last hour. Try again later." });
		const len = +(req.headers.get("Content-Length") || 0);
		if (len > MAX_BODY) return json(h, 413, { ok: false, error: "That report is too big. Try a smaller photo." });
		let r;
		try { const raw = await req.text(); if (raw.length > MAX_BODY) throw new Error("That report is too big. Try a smaller photo."); r = check(JSON.parse(raw)); }
		catch (e) { return json(h, 400, { ok: false, error: e instanceof SyntaxError ? "That report couldn't be read." : e.message }); }
		list.push(now); hits.set(ip, list);
		try {
			let photoPath = null;
			if (r.photo) {
				const d = new Date().toISOString();
				photoPath = "photos/" + d.slice(0, 7) + "/" + d.replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
				await gh(env, "/contents/" + photoPath, "PUT", { message: "Photo for a report from the app", content: r.photo });
			}
			const is = issueOf(r, photoPath, env.REPO);
			const made = await gh(env, "/issues", "POST", { title: is.title, body: is.body });
			return json(h, 200, { ok: true, issue: made.number });
		} catch (e) {
			return json(h, 502, { ok: false, error: "The report couldn't be saved just now (" + (e.status || "error") + "). It will be tried again." });
		}
	},
};
