/* Checks: ? help links, Simple view, the empty log, ignoring a handheld double scan, remembering the delivery fold.
   Named 229 so it runs before 23-offline, which stays last. */
const { check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Help links, Simple view, empty log, double scan, delivery fold");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  // ? opens the Guide at that part, also with parts switched off (numbers change).
  for (const [sel, title] of [['#delCard .helpq', "Set up the delivery"], ['.helpq[data-guide="Log pallets"]', "Log pallets"], ['#cmpCard .helpq', "Check against the manifest"]]) {
    s = await p.evaluate(async ([sel, title]) => { const b = document.querySelector(sel); const r = b.getBoundingClientRect(); b.click(); await new Promise(r => setTimeout(r, 50)); const f = document.activeElement; const fr = f.getBoundingClientRect();
      const out = { open: !document.getElementById("panel").hidden, focus: f && f.tagName === "H3" ? f.textContent : "", inView: fr.top >= -1 && fr.bottom <= innerHeight, at: [Math.round(fr.top), Math.round(fr.bottom), innerHeight], label: b.getAttribute("aria-label"), tap: [r.width, r.height] }; closeHelp(); return out; }, [sel, title]);
    check("? by " + title + " opens the Guide at that part", s.open && s.focus.endsWith(title) && s.inView && /^Help with /.test(s.label), s);
  }
  s = await p.evaluate(async () => { SITE.on.liveScan = false; SITE.on.scanByPhoto = false; SITE.on.photoUpload = false; document.querySelector('#cmpCard .helpq').click(); await new Promise(r => setTimeout(r, 50)); const f = document.activeElement; const r = f && f.tagName === "H3" ? f.textContent : "(not a heading)"; closeHelp(); SITE.on.liveScan = SITE.on.scanByPhoto = SITE.on.photoUpload = true; return r; });
  check("? still finds its part when switched-off parts change the Guide's numbering", /^\d+\. Check against the manifest$/.test(s || ""), s);
  // Each ? sits on its heading's line with a 44 px tap area.
  s = await p.evaluate(() => [...document.querySelectorAll(".helpq")].map(b => { const h = b.closest("h2").getBoundingClientRect(), r = b.getBoundingClientRect(), a = getComputedStyle(b, "::after");
    return { id: b.dataset.guide, h2: Math.round(h.height), inRow: r.top >= h.top - 1 && r.bottom <= h.bottom + 1 && h.height <= 50, tap: Math.round(r.width - parseFloat(a.left) - parseFloat(a.right) - 2 * parseFloat(getComputedStyle(b).borderLeftWidth)) }; }));
  check("each ? sits on its heading's line, with a 44 px tap area", s.length === 3 && s.every(x => x.inRow && x.tap >= 44), s);
  s = await p.evaluate(() => ["delH", "logH", "cmpH"].map(id => { const h = document.getElementById(id).closest("h2"); return h.getAttribute("aria-labelledby") === id ? document.getElementById(id).textContent : "?"; }));
  check("the headings are named by their own text, not the help label", s.join() === "Delivery,Pallet log,Manifest check", s);
  // The empty log says what to do and has a button to the LPN box.
  s = await p.evaluate(() => { rows = []; save(); render(); const td = document.querySelector("#body .empty"); const b = document.getElementById("toLpn"); b.click(); return { text: td.textContent, focus: document.activeElement.id }; });
  check("the empty log says what to do, with a button to the LPN box", /^No pallets yet\. Pick the type, then scan or type the first LPN in the LPN box\./.test(s.text) && s.focus === "lpn", s);
  // A handheld scanner's double scan (same LPN again within 2 seconds) is ignored, not asked about.
  s = await p.evaluate(async () => { rows = []; save(); render(); const box = document.getElementById("lpn");
    box.value = "VLT004040265"; add(); box.value = "VLT004040265"; add();
    const out = { n: rows.length, msg: document.getElementById("msg").textContent, bar: !document.getElementById("chkBar").hidden, box: box.value };
    lastAdded.t -= 2500; box.value = "VLT004040265"; add(); out.later = !document.getElementById("chkBar").hidden; hideCheck();
    box.value = "RUN001830763"; add(); box.value = "VLT004040265"; add(); out.notLast = !document.getElementById("chkBar").hidden; hideCheck(); return out; });
  check("the same LPN scanned twice within 2 seconds is added once, with a note and no question", s.n === 1 && s.msg === "VLT004040265 was added a moment ago, so the second scan was ignored." && !s.bar && s.box === "", s);
  check("after 2 seconds, or when another pallet came in between, the usual already-logged check asks as before", s.later && s.notLast, s);
  // Simple view.
  s = await p.evaluate(() => { openHelp("settings", "Settings"); const c = document.getElementById("setSimple"); document.getElementById("flt").value = "VLT"; c.checked = true; c.onchange(); closeHelp();
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; };
    const out = { cmp: vis("cmpCard"), share: vis("phonesBtn"), photo: vis("photo"), upload: vis("upload"), flt: getComputedStyle(document.querySelector(".flt")).display, live: !document.getElementById("scan").hidden, nolpn: !document.getElementById("noLpn").hidden, search: document.getElementById("flt").value, saved: JSON.parse(localStorage.getItem("lpncfg") || "{}").simple };
    return out; });
  check("Simple view hides the Manifest check, Share log, the photo buttons and the search and filters (clearing a search), and is kept", !s.cmp && !s.share && !s.photo && !s.upload && s.flt === "none" && s.live && s.nolpn && s.search === "" && s.saved === true, s);
  s = await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN001830763", type: "FMCG", fsdu: false }]; save(); render();
    document.querySelector('#tots [data-t="FMCG"], #tots button[data-type="FMCG"]') ; const t = document.getElementById("fltType"); t.value = "FMCG"; render();
    const i = document.getElementById("fltInfo"); const out = { info: !i.hidden && getComputedStyle(i).display !== "none" && i.textContent }; t.value = ""; render(); rows = []; save(); render(); return out; });
  check("in Simple view a filtered log still says how many it is showing", /Showing 1 of 2/.test(s.info || ""), s);
  s = await p.evaluate(() => { document.activeElement.blur(); const e = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; });
  check("in Simple view / is left alone (the search is hidden)", s === false, s);
  s = await p.evaluate(() => { const m = document.getElementById("cmpNums"); m.value = "VLT004040265\nRUN001830763"; m.dispatchEvent(new Event("input", { bubbles: true })); rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render();
    return { live: !document.getElementById("manLive").hidden, dock: document.getElementById("dockCnt").getAttribute("aria-label") }; });
  check("Simple view also hides the live manifest count, in the log and the entry bar", !s.live && !/manifest/.test(s.dock || ""), s);
  await p.evaluate(() => { const m = document.getElementById("cmpNums"); m.value = ""; m.dispatchEvent(new Event("input", { bubbles: true })); rows = []; save(); render(); });
  await p.reload(); await p.waitForTimeout(300);
  s = await p.evaluate(() => { const on = document.documentElement.classList.contains("simple"); openHelp("settings", "Settings"); const c = document.getElementById("setSimple"); c.checked = false; c.onchange(); closeHelp(); return { on, off: !document.documentElement.classList.contains("simple"), cmp: getComputedStyle(document.getElementById("cmpCard")).display !== "none" }; });
  check("Simple view stays on after a reload, and switching it off brings everything back", s.on && s.off && s.cmp, s);
  // The delivery card's fold is remembered.
  s = await p.evaluate(() => { localStorage.removeItem("lpndelfold"); rows = []; save(); render(); document.getElementById("recv").value = "Jamie"; addValue("VLT004040270"); const auto = document.getElementById("delCard").classList.contains("dcollapsed");
    document.getElementById("delSum").click(); return { auto, now: document.getElementById("delCard").classList.contains("dcollapsed"), pref: localStorage.getItem("lpndelfold") }; });
  check("opening the folded delivery details by hand is remembered", s.auto && !s.now && s.pref === "open", s);
  await p.reload(); await p.waitForTimeout(300);
  s = await p.evaluate(() => { const after = document.getElementById("delCard").classList.contains("dcollapsed"); rows = []; save(); render(); addValue("RUN001830799"); const first = document.getElementById("delCard").classList.contains("dcollapsed"); document.getElementById("delSum").click(); return { after, first, pref: localStorage.getItem("lpndelfold") }; });
  check("after a reload and after the first pallet it stays open, as left; folding it is remembered too", !s.after && !s.first && s.pref === "folded", s);
  await p.reload(); await p.waitForTimeout(300);
  s = await p.evaluate(() => document.getElementById("delCard").classList.contains("dcollapsed"));
  check("folded stays folded after a reload", s === true, s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
