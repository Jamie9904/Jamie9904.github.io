/* Checks: welcome. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Welcome and what's new");
    // First visit: nothing of the app's stored yet.
    let q = await page(browser, 360, { init: () => { if (!sessionStorage.getItem("again")) { localStorage.clear(); sessionStorage.setItem("again", "1"); } } });
    await q.setViewportSize({ width: 360, height: 740 });
    await q.goto(URL0); await q.waitForTimeout(500);
    let s = await q.evaluate(() => { const h = document.getElementById("hello"), r = h.getBoundingClientRect(); return { shown: !h.hidden, text: h.textContent, right: Math.round(r.right), vw: innerWidth }; });
    check("on the first visit a card offers the demo video, and fits a 360 px phone", s.shown && /New here\? The 47-second demo video/.test(s.text) && s.right <= s.vw, s);
    await q.evaluate(() => { if (typeof closeInstall === "function") closeInstall(); }); await q.reload(); await q.waitForTimeout(500);
    s = await q.evaluate(() => !document.getElementById("hello").hidden);
    check("the welcome card stays until it is answered (still there after a reload)", s === true, s);
    await q.evaluate(() => { if (typeof closeInstall === "function") closeInstall(); [...document.querySelectorAll("#helloBtns button")].find(b => b.textContent === "Watch the demo").click(); });
    await q.waitForTimeout(300);
    s = await q.evaluate(() => ({ panel: !document.getElementById("panel").hidden, title: document.getElementById("panelTitle").textContent, playing: !!document.getElementById("demoVid") && !document.getElementById("demoVid").hidden, card: !document.getElementById("hello").hidden, saved: localStorage.getItem("lpnwelcome") }));
    check("Watch the demo opens the Guide and starts the video; the card goes and isn't shown again", s.panel && /How to use/.test(s.title) && s.playing && !s.card && s.saved === "1", s);
    await q.reload(); await q.waitForTimeout(400);
    s = await q.evaluate(() => !document.getElementById("hello").hidden);
    check("after answering, the welcome card doesn't come back", s === false, s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
    // After an update: the newest changelog line, once.
    q = await page(browser, 375, { init: () => { if (!sessionStorage.getItem("again")) { localStorage.setItem("lpnseenbuild", "1"); localStorage.setItem("lpnlog", JSON.stringify({ rows: [] })); sessionStorage.setItem("again", "1"); } } });
    await q.goto(URL0); await q.waitForTimeout(600);
    s = await q.evaluate(() => { const h = document.getElementById("hello"), first = (siteHtml(HELP.log).match(/<li>([\s\S]*?)<\/li>/) || [])[1].replace(/<[^>]+>/g, "").slice(0, 30); return { shown: !h.hidden, text: document.getElementById("helloTxt").textContent, first, seen: localStorage.getItem("lpnseenbuild") }; });
    const build = await q.evaluate(() => appBuildP);
    check("after an update, a card shows the newest changelog line, and the build is remembered", s.shown && s.text.startsWith("Updated. " + s.first) && s.seen === build && +build > 1, { s, build });
    await q.evaluate(() => [...document.querySelectorAll("#helloBtns button")].find(b => /See what/.test(b.textContent)).click()); await q.waitForTimeout(200);
    s = await q.evaluate(() => ({ title: document.getElementById("panelTitle").textContent, card: !document.getElementById("hello").hidden, inert: document.getElementById("hello").inert }));
    await q.evaluate(() => closeHelp()); await q.waitForTimeout(100);
    s.back = await q.evaluate(() => document.activeElement.id);
    check("while a panel is open the card can't be reached, and closing it puts focus back on a button that stays", s.inert === true && s.back === "btnGuide", s); await q.reload(); await q.waitForTimeout(500);
    const again = await q.evaluate(() => !document.getElementById("hello").hidden);
    check("See what's new opens the Changelog, and the card isn't shown again for the same build", s.title === "Changelog" && !s.card && again === false, { s, again });
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
