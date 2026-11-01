/* Checks: accessibility. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Accessibility fixes");
    const q = await page(browser, 390);
    await q.setViewportSize({ width: 390, height: 844 });
    await q.goto(URL0); await q.waitForTimeout(300);
    // A handheld scanner types and presses Enter: a second LPN while a warning is open must not be lost.
    await q.evaluate(() => { rows = [{ lpn: "VLT004037790", type: "BB", fsdu: false }]; save(); render(); });
    await q.fill("#lpn", "VLT004037790"); await q.press("#lpn", "Enter");
    await q.fill("#lpn", "VLT004037955"); await q.press("#lpn", "Enter");
    let s = await q.evaluate(() => ({ box: document.getElementById("lpn").value, msg: document.getElementById("msg").textContent, rows: rows.length, warn: !document.getElementById("chkBar").hidden }));
    check("a scan while a warning is open is kept in the box with a message, not lost", s.box === "VLT004037955" && /Answer the check first/.test(s.msg) && s.rows === 1 && s.warn, s);
    await q.keyboard.press("Escape");
    s = await q.evaluate(() => ({ warn: !document.getElementById("chkBar").hidden, rows: rows.length }));
    check("Escape skips the warning", !s.warn && s.rows === 1, s);
    await q.press("#lpn", "Enter");
    s = await q.evaluate(() => rows.map(r => r.lpn).join());
    check("after answering, the kept LPN adds with Enter", s === "VLT004037790,VLT004037955", s);
    // The Guide acts as a dialog: focus moves to Close, the page behind is inert, focus returns to the Guide button.
    await q.click("#btnGuide"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.id, inert: document.querySelector("main").inert && document.querySelector("header.top").inert, modal: document.getElementById("panel").getAttribute("aria-modal") }));
    check("opening the Guide moves focus into it and the page behind can't be reached", s.focus === "panelClose" && s.inert && s.modal === "true", s);
    await q.click("#panelClose"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ focus: document.activeElement.id, inert: document.querySelector("main").inert }));
    check("closing the Guide gives focus back to the Guide button", s.focus === "btnGuide" && !s.inert, s);
    // Contrast: box and button edges at least 3:1, accent text at least 4.5:1, even with a pale accent.
    s = await q.evaluate(() => {
      const rt = (a, b) => { const x = lumOf(a) + .05, y = lumOf(b) + .05; return Math.max(x, y) / Math.min(x, y); }, cs = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const out = [];
      for (const [bg, ac] of [["#0c1830", "#ff8a2a"], ["#e3e8e4", "#2f6f68"], ["#1d1f23", "#f5b324"], ["#eef1f6", "#2563eb"], ["#ffffff", "#ff8a2a"], ["#0c1830", "#3f51b5"], ["#eef1f6", "#ffb74d"]]) {
        theme = { bg, ac }; applyTheme();
        out.push({ bg, ac, bd: +rt(cs("--bd"), cs("--paper")).toFixed(2), act: +Math.min(rt(cs("--act"), cs("--paper")), rt(cs("--act"), cs("--bg"))).toFixed(2) });
      }
      theme = Object.assign({}, THEME_DEFAULT); applyTheme(); return out;
    });
    check("box and button edges are at least 3:1 in every theme", s.every(x => x.bd >= 3), s);
    check("accent text (headings, links, focus ring) is at least 4.5:1, even with a pale or dark accent", s.every(x => x.act >= 4.5), s);
    s = await q.evaluate(() => { const sb = document.getElementById("scanbox"), ck = document.getElementById("chkBar");
      return { smsg: document.getElementById("smsg").getAttribute("role"), order: !!(ck.compareDocumentPosition(sb) & Node.DOCUMENT_POSITION_FOLLOWING), lang: document.documentElement.lang, flash: getComputedStyle(document.getElementById("flash")).pointerEvents }; });
    // LPNs in the log can be edited with the keyboard, and Undo shows where it can be seen on a phone.
    await q.evaluate(() => { rows = [{ lpn: "VLT004037790", type: "BB", fsdu: false }, { lpn: "QUB001899186", type: "FPP", fsdu: false }]; save(); render(); window.scrollTo(0, 0); });
    await q.focus("#body .lpnedit"); await q.keyboard.press("Enter"); await q.waitForTimeout(50);
    await q.keyboard.type("VLT004037791"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    let u = await q.evaluate(() => { const bar = document.getElementById("undoBar").getBoundingClientRect(), dock = document.querySelector(".entry").getBoundingClientRect();
      return { focus: document.activeElement.className, lpns: rows.map(r => r.lpn).join(), name: document.querySelector("#body .lpnedit").getAttribute("aria-label"), shown: !document.getElementById("undoBar").hidden, onScreen: bar.top >= 0 && bar.bottom <= dock.top, text: document.getElementById("undoTxt").textContent }; });
    check("an LPN in the log can be edited with the keyboard (it's a button named for the LPN), and focus comes back to it", /^VLT004037791,/.test(u.lpns) && /^Edit LPN /.test(u.name) && u.focus === "lpnedit", u);
    check("on a phone, Undo shows on screen just above the entry bar", u.shown && u.onScreen && /Changed VLT004037790 to VLT004037791/.test(u.text), u);
    u = await q.evaluate(() => { addValue("RBY006291170"); const a = document.getElementById("flash").getBoundingClientRect(), b = document.getElementById("undoBar").getBoundingClientRect(); return { flashShown: !document.getElementById("flash").hidden, apart: a.bottom <= b.top + 1 }; });
    check("on a phone, the Added note shows above the Undo bar, not under it", u.flashShown && u.apart, u);
    await q.click("#undoBtn"); u = await q.evaluate(() => rows[0].lpn);
    check("Undo from there puts the LPN back", u === "VLT004037790", u);
    await q.evaluate(() => { rows = rows.slice(0, 2); save(); render(); });
    u = await q.evaluate(() => { document.getElementById("expBtn").click(); return !document.getElementById("expMenu").hidden; });
    await q.keyboard.press("Escape");
    u = { opened: u, closed: await q.evaluate(() => document.getElementById("expMenu").hidden && document.activeElement.id === "expBtn"), th: await q.evaluate(() => [...document.querySelectorAll("thead th")].pop().textContent) };
    check("Escape closes the Export menu and goes back to its button; the remove column has a name", u.opened && u.closed && u.th === "Remove", u);
    check("Live scan messages are announced, the warning sits above the camera, the Added note can't block taps, page language en-GB", s.smsg === "status" && s.order && s.lang === "en-GB" && s.flash === "none", s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
