/* Checks: feedback worker. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    // The feedback Worker (tools/feedback-worker), run here with a stand-in for GitHub.
    console.log("Feedback Worker");
    const WM = await import(require("url").pathToFileURL(path.join(ROOT, "tools", "feedback-worker", "worker.mjs")).href), W = WM.default;
    // A stand-in Durable Object store, as Cloudflare gives the Worker.
    const mkLimits = () => { const m = new Map(); let alarm = null; const lim = new WM.Limits({ storage: { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }, deleteAll: async () => m.clear() } });
      return { idFromName: () => "all", get: () => ({ fetch: (u, o) => lim.fetch(new Request("https://limits/", o)) }) }; };
    const env = { REPO: "Jamie9904/lpn-feedback", ALLOWED_ORIGIN: "https://jamie9904.github.io", GITHUB_TOKEN: "test-token", LIMITS: mkLimits() };
    const calls = []; const realFetch = global.fetch;
    global.fetch = async (u, o) => { calls.push({ u, m: o.method, b: JSON.parse(o.body), auth: o.headers.Authorization }); return new Response(JSON.stringify({ number: 7 }), { status: 201 }); };
    const send = (body, origin = env.ALLOWED_ORIGIN, ip = "1.2.3.4") => W.fetch(new Request("https://lpn-feedback.example.workers.dev/report", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), env);
    const JPEG = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString("base64");
    let r = await send({ kind: "problem", text: "Photo 3 read nothing\n@someone see [link](http://x)", report: "App: LPN Pallet Log v3.30 (build 43)\nManifest numbers (2): VLT004040265", app: "LPN Pallet Log v3.30 (build 43)" });
    let j = await r.json(); const iss = calls.find(c => /\/issues$/.test(c.u));
    check("feedback Worker: a problem becomes an issue in the private repo", r.status === 200 && j.ok && j.issue === 7 && iss && iss.u === "https://api.github.com/repos/Jamie9904/lpn-feedback/issues" && iss.auth === "Bearer test-token" && /^Problem: Photo 3 read nothing/.test(iss.b.title) && /\(LPN Pallet Log v3\.30 \(build 43\)\)/.test(iss.b.body), { j, iss });
    check("feedback Worker: the typed text and report are shown as plain text (no links or mentions)", /~~~~text\nPhoto 3 read nothing\n@someone see \[link\]\(http:\/\/x\)\n~~~~/.test(iss.b.body) && /<details><summary>Problem report<\/summary>/.test(iss.b.body), iss.b.body);
    calls.length = 0;
    r = await send({ kind: "problem", text: "Torch didn't work", name: "  Sam   @boss [x](http://y)  " }, undefined, "3.3.3.3"); j = await r.json();
    const nb = calls[0] && calls[0].b.body;
    check("feedback Worker: the sender's name is shown in its own plain-text block (no links or mentions)", j.ok && /From:\n\n~~~~text\nSam @boss \[x\]\(http:\/\/y\)\n~~~~/.test(nb) && !/^From:.*@boss/m.test(nb), nb);
    calls.length = 0;
    r = await send({ kind: "problem", text: "No name" }, undefined, "3.3.3.4"); j = await r.json();
    check("feedback Worker: no name, no From line", j.ok && !/From:/.test(calls[0].b.body), calls[0].b.body.slice(0, 120));
    calls.length = 0;
    r = await send({ kind: "idea", text: "Bigger buttons", app: "v3.30 https://evil.example @someone", photo: JPEG }, undefined, "2.2.2.2"); j = await r.json();
    const order = calls.map(c => c.m + " " + c.u.replace("https://api.github.com/repos/Jamie9904/lpn-feedback", "")), patch = calls.find(c => c.m === "PATCH");
    check("feedback Worker: the issue is made first, then the photo saved and shown in it", j.ok && order.length === 3 && order[0] === "POST /issues" && /^PUT \/contents\/photos\/\d{4}-\d{2}\/issue-7-.+\.jpg$/.test(order[1]) && order[2] === "PATCH /issues/7" && /!\[photo\]\(https:\/\/github\.com\/Jamie9904\/lpn-feedback\/blob\/HEAD\/photos\//.test(patch.b.body), order);
    check("feedback Worker: an app field that isn't the app's version line is left out (no links or mentions)", !/evil|@someone/.test(calls[0].b.body), calls[0].b.body.slice(0, 120));
    const bad = [];
    for (const [body, origin, want] of [[{ kind: "problem", text: "x" }, "https://evil.example", 403], [{ kind: "x", text: "x" }, null, 400], [{ kind: "problem", text: "  " }, null, 400],
      [{ kind: "problem", text: "x".repeat(4001) }, null, 400], [{ kind: "problem", text: "x", website: "spam" }, null, 400], [{ kind: "problem", text: "x", photo: "data:image/png;base64,AAAA" }, null, 400],
      [{ kind: "problem", text: "x", photo: "data:image/jpeg;base64," + Buffer.from("<html>not a jpeg").toString("base64") }, null, 400]]) {
      const res = await send(body, origin || env.ALLOWED_ORIGIN, "9.9.9." + bad.length); bad.push(res.status === want ? "ok" : res.status + "≠" + want);
    }
    check("feedback Worker: refuses other sites, wrong kinds, empty or long text, spam robots and photos that aren't JPEGs", bad.every(x => x === "ok"), bad);
    let last = 0; for (let i = 0; i < WM.PER_HOUR + 1; i++) last = (await send({ kind: "idea", text: "n" + i }, undefined, "5.5.5.5")).status;
    check("feedback Worker: more than " + WM.PER_HOUR + " reports an hour from one address are refused, across all servers", last === 429, last);
    env.LIMITS = mkLimits(); let codes = [];
    for (let i = 0; i < WM.DAY_ISSUES + 1; i++) codes.push((await send({ kind: "idea", text: "d" + i }, undefined, "7.7." + Math.floor(i / 5) + "." + i)).status);
    check("feedback Worker: at most " + WM.DAY_ISSUES + " reports a day in total", codes.slice(0, WM.DAY_ISSUES).every(c => c === 200) && codes[WM.DAY_ISSUES] === 429, codes.slice(-3));
    env.LIMITS = mkLimits();
    global.fetch = async () => new Response("{}", { status: 500 });
    r = await send({ kind: "problem", text: "x" }, undefined, "6.6.6.6"); j = await r.json();
    check("feedback Worker: if GitHub is down or the key has run out, the app is told to try again later", r.status === 503 && !j.ok, j);
    global.fetch = async () => new Response("{}", { status: 422 });
    r = await send({ kind: "problem", text: "x" }, undefined, "6.6.6.7"); j = await r.json();
    check("feedback Worker: a report GitHub refuses isn't retried (so it doesn't come back for ever)", r.status === 422 && !j.ok, j);
    global.fetch = realFetch;
  }
};
