/* Checks: Back closes panels, no pull-to-refresh, totals as filters, the ↓ Latest button (build 66).
   Named 226 so it runs before 23-offline, which stays last. */
const { check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Back button, totals as filters, ↓ Latest");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  // Back closes a panel instead of leaving the app; closing it with ✕ leaves no extra step behind.
  const start = await p.evaluate(() => history.length);
  await p.evaluate(() => openHelp("guide", "Guide")); await p.waitForTimeout(100);
  await p.goBack(); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ panel: document.getElementById("panel").hidden, url: location.href, inert: document.querySelector("main").inert }));
  check("the phone's Back button closes an open panel and stays in the app", s.panel && /index\.html|\/$/.test(s.url) && !s.inert, s);
  await p.evaluate(() => { openHelp("settings", "Settings"); }); await p.waitForTimeout(100);
  await p.evaluate(() => document.getElementById("panelClose").click()); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ panel: document.getElementById("panel").hidden, state: history.state, n: backStack.length }));
  check("closing a panel with its button takes its Back step off again", s.panel && !(s.state && s.state.lpnDlg) && s.n === 0, s);
  await p.evaluate(() => { openHelp("guide", "Guide"); openFeedback(); }); await p.waitForTimeout(150);
  await p.goBack(); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ fb: document.getElementById("fbBox").hidden, panel: document.getElementById("panel").hidden }));
  check("with the report box open over a panel, Back closes the report box first, then the panel", s.fb && !s.panel, s);
  await p.goBack(); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ panel: document.getElementById("panel").hidden, n: backStack.length }));
  check("…and Back again closes the panel", s.panel && s.n === 0, s);
  // Closing and opening panels quickly one after another never leaves the app.
  await p.evaluate(async () => { for (let k = 0; k < 4; k++) { openHelp("settings", "Settings"); await new Promise(r => setTimeout(r, 30)); closeHelp(); openHelp("guide", "Guide"); closeHelp(); } });
  await p.waitForTimeout(300);
  s = await p.evaluate(() => ({ url: location.href, n: backStack.length, panel: document.getElementById("panel").hidden }));
  check("opening and closing panels quickly never leaves the app", /index\.html|\/$/.test(s.url) && s.n === 0 && s.panel, s);
  // No pull-to-refresh.
  s = await p.evaluate(() => [getComputedStyle(document.documentElement).overscrollBehaviorY, getComputedStyle(document.body).overscrollBehaviorY]);
  check("pulling down at the top of the page doesn't reload it", s.every(v => v === "contain"), s);
  // Totals as filters.
  s = await p.evaluate(() => {
    rows = []; ["BB", "FMCG", "FMCG", "FPP", "Mixed", "BB"].forEach((t, i) => rows.push({ lpn: "VLT00404026" + i, type: t, fsdu: i === 2 })); save(); render();
    const btn = k => document.querySelector('#sum .sumbtn[data-f="' + k + '"]');
    const shown = () => document.querySelectorAll("#body .lpnedit").length;
    const out = { h: btn("FMCG").getBoundingClientRect().height, label: btn("FMCG").getAttribute("aria-label") };
    btn("FMCG").click(); out.fmcg = shown(); out.pressed = btn("FMCG").getAttribute("aria-pressed"); out.sel = document.getElementById("fltType").value; out.focus = document.activeElement === btn("FMCG");
    btn("FMCG").click(); out.all = shown(); out.sel2 = document.getElementById("fltType").value;
    btn("FSDU").click(); out.fsdu = shown(); out.ff = document.getElementById("fltFsdu").value;
    btn("BB").click(); out.bb = shown(); out.ff2 = document.getElementById("fltFsdu").value;
    document.getElementById("fltType").value = ""; render(); out.total = document.querySelector("#sum span").textContent;
    return out;
  });
  check("tapping a total shows only those pallets, and tapping it again shows all", s.fmcg === 2 && s.pressed === "true" && s.sel === "FMCG" && s.focus && s.all === 6 && s.sel2 === "", s);
  check("FSDU works the same way, and picking a type clears the FSDU filter", s.fsdu === 1 && s.ff === "y" && s.bb === 2 && s.ff2 === "", s);
  check("the totals are buttons big enough to tap, named for screen readers, and the Total itself isn't a filter", s.h >= 44 && /^2 FMCG, tap to show only these$/.test(s.label) && /^6Total$/.test(s.total), s);
  // ↓ Latest.
  s = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const b = document.getElementById("toLatest");
    rows = []; for (let i = 0; i < 40; i++) rows.push({ lpn: "RUN0018307" + String(i).padStart(2, "0"), type: "BB", fsdu: false }); save(); render();
    const lastRow = () => document.querySelector("#body").lastElementChild;
    lastRow().scrollIntoView({ block: "center" }); await wait(150); const atEnd = b.hidden;
    window.scrollTo(0, 0); await wait(150); const up = !b.hidden, r = b.getBoundingClientRect(), en = document.querySelector(".entry").getBoundingClientRect();
    b.click(); await wait(150);
    const lr = lastRow().getBoundingClientRect();
    return { atEnd, up, clear: r.bottom <= en.top, h: r.height, after: b.hidden, inView: lr.top >= 0 && lr.bottom <= en.top, focus: document.activeElement === lastRow().querySelector(".lpnedit") };
  });
  check("↓ Latest appears only when the newest pallet is out of sight, above the entry bar", s.atEnd && s.up && s.clear && s.h >= 44, s);
  check("↓ Latest brings the newest pallet into view, clear of the entry bar, and puts focus on it", s.after && s.inView && s.focus, s);
  s = await p.evaluate(async () => { rows = rows.slice(0, 5); save(); render(); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 150)); return document.getElementById("toLatest").hidden; });
  check("on a short log ↓ Latest stays out of the way", s === true, s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
