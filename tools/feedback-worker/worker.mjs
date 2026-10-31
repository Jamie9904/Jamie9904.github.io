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

  Limits are kept in one Durable Object (Limits), so they hold across all of Cloudflare's servers: at most
  PER_HOUR reports an hour from one address, and DAY_ISSUES reports and DAY_PHOTOS photos a day in total. The
  Origin check only stops other websites, not scripts, so these limits are what stop spam.
*/
const MAX_BODY = 2_400_000, MAX_TEXT = 4000, MAX_REPORT = 60_000, MAX_PHOTO = 1_600_000;
export const PER_HOUR = 10, DAY_ISSUES = 50, DAY_PHOTOS = 20;

/** Durable Object holding the counts. POST {ip, photo:boolean} → {ok, photo, error?}. */
export class Limits {
	constructor(state) { this.state = state; }
	async fetch(req) {
		const { ip, photo } = await req.json(), now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
		const st = this.state.storage;
		let d = (await st.get("day")) || { day, issues: 0, photos: 0 };
		if (d.day !== day) d = { day, issues: 0, photos: 0 };
		const key = "ip:" + ip, list = ((await st.get(key)) || []).filter((t) => now - t < 3600_000);
		if (list.length >= PER_HOUR) return Response.json({ ok: false, error: "Too many reports from here in the last hour. Try again later." });
		if (d.issues >= DAY_ISSUES) return Response.json({ ok: false, error: "Too many reports today. Try again tomorrow." });
		const withPhoto = !!photo && d.photos < DAY_PHOTOS;
		list.push(now); d.issues++; if (withPhoto) d.photos++;
		await st.put(key, list); await st.put("day", d);
		if (!(await st.getAlarm())) await st.setAlarm(now + 86_400_000);
		return Response.json({ ok: true, photo: withPhoto });
	}
	async alarm() { await this.state.storage.deleteAll(); } // a daily clear-out of old addresses
}

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
	// Only the app's own version line is shown, so nothing else can add links or mentions outside the text block.
	const app = typeof o.app === "string" && /^LPN Pallet Log( v[\d.]+)?( \(build \d+\))?$/.test(o.app) ? o.app : "";
	let photo = null;
	if (o.photo != null && o.photo !== "") {
		const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(o.photo));
		if (!m || !m[1].startsWith("/9j/")) throw new Error("The photo couldn't be read."); // a JPEG starts FF D8 FF
		if (m[1].length / 4 * 3 - (m[1].match(/=*$/)[0].length) > MAX_PHOTO) throw new Error("The photo is too big.");
		photo = m[1];
	}
	return { kind, text, report, app, photo };
}

/** The issue's title and body. */
export function issueOf(r, photoPath, repo) {
	const first = r.text.split("\n")[0].replace(/\s+/g, " ").slice(0, 70);
	const title = (r.kind === "idea" ? "Idea: " : "Problem: ") + first + (r.text.length > first.length ? "…" : "");
	const parts = ["**" + (r.kind === "idea" ? "Idea" : "Problem") + "** sent from the app" + (r.app ? " (" + r.app + ")" : "") + ".", "", block(r.text)];
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
		const len = +(req.headers.get("Content-Length") || 0);
		if (len > MAX_BODY) return json(h, 413, { ok: false, error: "That report is too big. Try a smaller photo." });
		let r;
		try { const raw = await req.text(); if (raw.length > MAX_BODY) throw new Error("That report is too big. Try a smaller photo."); r = check(JSON.parse(raw)); }
		catch (e) { return json(h, 400, { ok: false, error: e instanceof SyntaxError ? "That report couldn't be read." : e.message }); }
		const ip = req.headers.get("CF-Connecting-IP") || "?";
		const lim = await (await env.LIMITS.get(env.LIMITS.idFromName("all")).fetch("https://limits/", { method: "POST", body: JSON.stringify({ ip, photo: !!r.photo }) })).json();
		if (!lim.ok) return json(h, 429, { ok: false, error: lim.error });
		let made;
		try { const is = issueOf(r, null, env.REPO); made = await gh(env, "/issues", "POST", { title: is.title, body: is.body }); }
		catch (e) {
			// A key that has run out or been changed, or GitHub busy: worth trying again later. Anything else won't work on a retry.
			const again = e.status === 401 || e.status === 403 || e.status === 429 || !e.status || e.status >= 500;
			return json(h, again ? 503 : 422, { ok: false, error: again ? "The report couldn't be saved just now. It will be tried again." : "The report couldn't be saved (" + e.status + ")." });
		}
		// The photo goes in after the issue exists, so a failed issue never leaves a stray photo behind.
		let note = r.photo && !lim.photo ? "Photo not saved: today's photo limit was reached." : "";
		if (r.photo && lim.photo) {
			try {
				const d = new Date().toISOString();
				const photoPath = "photos/" + d.slice(0, 7) + "/issue-" + made.number + "-" + d.replace(/[:.]/g, "-") + ".jpg";
				await gh(env, "/contents/" + photoPath, "PUT", { message: "Photo for issue #" + made.number, content: r.photo });
				await gh(env, "/issues/" + made.number, "PATCH", { body: issueOf(r, photoPath, env.REPO).body });
			} catch (e) { note = "The photo couldn't be saved."; }
		}
		return json(h, 200, { ok: true, issue: made.number, note });
	},
};
