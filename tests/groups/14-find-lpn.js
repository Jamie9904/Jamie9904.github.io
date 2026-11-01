/* Checks: find lpn. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    console.log("Find an LPN, sideways photos, file names, Follow phone, one-tap prefix");
    const q = await page(browser, 375);
    await q.goto(URL0); await q.waitForTimeout(300);
    // Find an LPN in Saved deliveries.
    await q.evaluate(() => { const t = localToday();
      hist = [{ id: "a1", saved: new Date().toISOString(), date: t, recv: "Jamie", trailer: "TR4471", rows: [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN0001830763", type: "FMCG", fsdu: false }] },
        { id: "a2", saved: new Date().toISOString(), date: t, recv: "Sam", rows: [{ lpn: "QUB000111222", type: "FPP", fsdu: false }] }];
      saveHist(); rows = [{ lpn: "QUB000111222", type: "FPP", fsdu: false }]; render(); openHelp("history", "Saved deliveries"); });
    await q.fill("#histFind", "4040 265"); await q.waitForTimeout(100);
    let s = await q.evaluate(() => ({ shown: [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).map(c => c.querySelector(".hitl").textContent), msg: document.getElementById("histFindMsg").textContent }));
    check("Find an LPN shows only the saved delivery that holds it, and names the pallet", s.shown.length === 1 && /Found: VLT004040265 \(BB\)/.test(s.shown[0]) && /Found in 1 saved delivery\./.test(s.msg), s);
    await q.fill("#histFind", "qub000111"); await q.waitForTimeout(100);
    s = await q.evaluate(() => document.getElementById("histFindMsg").textContent);
    check("Find an LPN also says when the pallet is in the current log", /Found in 1 saved delivery\. It is also in the current log\./.test(s), s);
    await q.fill("#histFind", "ZZZ999"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ shown: [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).length, msg: document.getElementById("histFindMsg").textContent }));
    check("Find an LPN says when no saved delivery holds it", s.shown === 0 && /Not in any saved delivery/.test(s.msg), s);
    await q.fill("#histFind", ""); await q.waitForTimeout(100);
    s = await q.evaluate(() => [...document.querySelectorAll("#histRoot .hist")].filter(c => !c.hidden).length);
    check("clearing Find an LPN shows every saved delivery again", s === 2, s);
    s = await q.evaluate(() => { const r = document.getElementById("histFind").getBoundingClientRect(); return { right: r.right, w: innerWidth }; });
    check("the Find an LPN box fits a 375 px phone", s.right <= s.w, s);
    // Delete a delivery, then search: the deleted one isn't counted and nothing breaks.
    await q.evaluate(() => document.querySelector('#histRoot .hist button.d').click());
    await q.fill("#histFind", "4040265"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ msg: document.getElementById("histFindMsg").textContent, undo: !!document.querySelector("#histRoot .hist .row button.p") }));
    check("after deleting a saved delivery, Find an LPN still works and doesn't count the deleted one", /Not in any saved delivery/.test(s.msg) && s.undo, s);
    await q.evaluate(() => closeHelp());
    // Trailer number in file names.
    s = await q.evaluate(() => { const names = [];
      document.getElementById("trailer").value = "TR 4471/A"; names.push(fileTag());
      document.getElementById("trailer").value = ""; names.push(fileTag());
      // The Manifest check is named after the trailer of the delivery it checked.
      document.getElementById("trailer").value = "TR9999";
      setLogFrom(["QUB000111222"], [{ lpn: "QUB000111222", type: "FPP", fsdu: false }], localToday(), "Sam", "Saved delivery", "TR4471"); names.push(fileTag(cmpTrailer));
      setLogFrom(["QUB000111222"], [{ lpn: "QUB000111222", type: "FPP", fsdu: false }], localToday(), "Sam", "Saved delivery", ""); names.push(fileTag(cmpTrailer));
      document.getElementById("cmpUseLog").click(); names.push(fileTag(cmpTrailer));
      document.getElementById("cmpClear").click(); names.push(fileTag(cmpTrailer));
      document.getElementById("trailer").value = "";
      return names; });
    check("file names get the trailer number (only letters, numbers and dashes); the Manifest check uses the checked delivery's trailer", JSON.stringify(s) === '["-TR-4471-A","","-TR4471","","-TR9999",""]', s);
    // Sideways photo: nothing found, so it is turned and read again.
    s = await q.evaluate(async () => {
      const keep = { loadScript, prep, ocrWorker, ocrDone, ocrCanvas }, res = {};
      // answer(n, cv): what the n-th read of one photo finds.
      const run = async answer => { const seen = []; let first = null;
        window.prep = async () => { const c = document.createElement("canvas"); c.width = 300; c.height = 100; return first = c; };
        window.ocrCanvas = async (w, cv) => { seen.push(cv.width + "x" + cv.height); const a = answer(seen.length); const o = a.lpns.slice(); o.skipped = a.skipped || []; o.odd = []; o.mended = []; return { out: o, items: [], r: { words: [], text: "" } }; };
        const out = await ocrLpnsNow(new Blob(["x"]));
        return { seen, out: [...out], turned: out.turned, freed: first.width === 0, note: readNote("Photo 1", out, { added: out.length, dup: 0 }) }; };
      try {
        window.loadScript = async () => {}; window.ocrWorker = async () => ({}); window.ocrDone = () => {};
        res.at90 = await run(n => ({ lpns: n === 2 ? ["VLT004040265"] : [] }));
        res.at270 = await run(n => ({ lpns: n === 3 ? ["VLT004040265"] : [] }));
        res.upright = await run(() => ({ lpns: ["VLT004040265"] }));
        res.prefixOnly = await run(n => ({ lpns: [], skipped: n === 1 ? ["RBY001234567"] : [] }));
        res.at180 = await run(n => ({ lpns: n === 4 ? ["RBY006292169"] : [] }));
        res.nothing = await run(() => ({ lpns: [] }));
      } finally { Object.assign(window, keep); }
      return res; });
    check("a sideways photo with nothing found is turned and read again, and the note says so", JSON.stringify(s.at90.seen) === '["300x100","100x300"]' && s.at90.turned === 90 && s.at90.out[0] === "VLT004040265" && /The photo was sideways, so it was turned to read it\./.test(s.at90.note), s.at90);
    check("if turning one way finds nothing, the other way is tried", JSON.stringify(s.at270.seen) === '["300x100","100x300","100x300"]' && s.at270.turned === 270, s.at270);
    check("an upright photo, or one with only unlisted-prefix numbers, is read once and not called sideways", s.upright.seen.length === 1 && !s.upright.turned && !/sideways/.test(s.upright.note) && s.prefixOnly.seen.length === 1 && !s.prefixOnly.turned, { u: s.upright, p: s.prefixOnly });
    check("if neither sideways turn finds anything, the photo is read upside down, and the note says so", JSON.stringify(s.at180.seen) === '["300x100","100x300","100x300","300x100"]' && s.at180.turned === 180 && s.at180.out[0] === "RBY006292169" && /The photo was upside down, so it was turned to read it\./.test(s.at180.note) && !/sideways/.test(s.at180.note), s.at180);
    check("a photo with nothing readable any way up gives the usual note, and its canvas is freed", s.nothing.seen.length === 4 && !s.nothing.turned && /No LPNs could be read/.test(s.nothing.note) && s.nothing.freed && s.at90.freed, s.nothing);
    // One tap adds a missing prefix and its numbers.
    await q.evaluate(() => { document.getElementById("cmpToggle").click(); document.getElementById("cmpPfx").value = "VLT"; document.getElementById("cmpNums").value = "";
      window.readPhoto = async () => { const a = ["VLT004040265"]; a.skipped = ["RBY001234567", "RBY001234568"]; a.odd = []; a.mended = []; return a; }; });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [{ name: "m.png", mimeType: "image/png", buffer: png }]);
    await q.waitForFunction(() => !document.getElementById("cmpPfxAdd").hidden, null, { timeout: 5000 }).catch(() => {});
    s = await q.evaluate(() => ({ btn: [...document.querySelectorAll("#cmpPfxAdd button")].map(b => b.textContent), msg: document.getElementById("cmpMsg").textContent }));
    check("a photo with numbers whose prefix isn't listed offers a one-tap Add button", JSON.stringify(s.btn) === '["Add RBY to the prefix list"]' && /tap Add RBY below/.test(s.msg), s);
    await q.click("#cmpPfxAdd button"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ pfx: document.getElementById("cmpPfx").value, nums: document.getElementById("cmpNums").value.split("\n"), hidden: document.getElementById("cmpPfxAdd").hidden, msg: document.getElementById("cmpMsg").textContent }));
    s.focus = await q.evaluate(() => document.activeElement.id);
    check("tapping Add puts the prefix in the list and adds its numbers without reading again, keeping the earlier note", s.pfx === "VLT, RBY" && s.nums.includes("RBY001234567") && s.nums.includes("RBY001234568") && s.hidden && /Added RBY to the prefix list and 2 numbers/.test(s.msg) && /Photo 1: found 1 LPN/.test(s.msg) && !/tap Add/.test(s.msg), s);
    check("after tapping Add, keyboard focus moves to the manifest numbers", s.focus === "cmpNums", s.focus);
    await q.evaluate(() => { document.getElementById("cmpClear").click(); document.getElementById("cmpPfx").value = ""; savePfx(); });
    // Seal hint: the same number twice, or different lengths; quiet while typing.
    s = await q.evaluate(async () => { const out = {}, i = document.getElementById("sealIn"), o = document.getElementById("sealOut"), w = () => document.getElementById("sealWarn").textContent;
      const put = (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); };
      put(i, "SL123456"); put(o, "SL12"); out.typing = w();
      put(o, "SL1234567"); o.dispatchEvent(new Event("change")); out.len = w();
      put(o, "sl 123456"); o.dispatchEvent(new Event("change")); out.same = w();
      put(o, "SL654321"); out.fixed = w();
      put(o, "SL1234567"); o.dispatchEvent(new Event("change")); setDel({ sealIn: "A1", sealOut: "" }); out.cleared = w();
      setDel({ sealIn: "SEAL99", sealOut: "SEAL99" }); out.loaded = w(); setDel({});
      return out; });
    check("seal numbers that differ in length get a gentle warning when you leave the box, not while typing", s.typing === "" && /Seal in has 8 characters and seal out has 9\. Check neither is mistyped\./.test(s.len), s);
    check("the same seal number in both boxes is flagged, and the warning goes when it's fixed or cleared", /Seal in and seal out are the same number/.test(s.same) && s.fixed === "" && s.cleared === "" && /same number/.test(s.loaded), s);
    // Follow phone colours.
    await q.emulateMedia({ colorScheme: "dark" });
    await q.evaluate(() => { document.getElementById("btnSet").click(); });
    await q.waitForTimeout(200);
    await q.check("#setFollow"); await q.waitForTimeout(100);
    const bg = () => q.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
    const dark = await bg();
    await q.emulateMedia({ colorScheme: "light" }); await q.waitForTimeout(150);
    const light = await bg();
    s = await q.evaluate(() => ({ saved: JSON.parse(localStorage.getItem("lpntheme")), hex: document.getElementById("setBgHex").value }));
    check("Follow phone uses navy in dark mode and light in light mode, switching straight away", dark === "#0c1830" && light === "#eef1f6" && s.saved.follow === true && s.hex === "#eef1f6", { dark, light, s });
    await q.fill("#setAcHex", "#aa3300"); await q.waitForTimeout(100);
    s = await q.evaluate(() => ({ follow: document.getElementById("setFollow").checked, saved: JSON.parse(localStorage.getItem("lpntheme")) }));
    check("choosing your own colour turns Follow phone off and keeps the colours shown", !s.follow && !s.saved.follow && s.saved.bg === "#eef1f6" && s.saved.ac === "#aa3300", s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
