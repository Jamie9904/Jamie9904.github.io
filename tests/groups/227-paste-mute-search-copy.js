/* Checks: pasting several LPNs, the mute button, clearing the search, copying an LPN by press and hold.
   Named 227 so it runs before 23-offline, which stays last. */
const { check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Paste several LPNs, mute, clear search, copy an LPN");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  const paste = (text) => p.evaluate(t => { const dt = new DataTransfer(); dt.setData("text/plain", t); const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }); const box = document.getElementById("lpn"); box.focus(); const went = box.dispatchEvent(ev); return { went, box: box.value }; }, text);

  // Several LPNs pasted at once: each added with the chosen type; ones the checks would ask about are named, not added.
  await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }]; save(); render(); document.querySelector('#tyb button[data-t="FMCG"]').click(); document.getElementById("flt").value = "VLT004040265"; render(); });
  s = await paste("RUN001830763\nQUB001899210, RBY006291189;VLT004040265\nnot-an-lpn\nRUN001830763");
  s.after = await p.evaluate(() => ({ rows: rows.map(r => r.lpn + "|" + r.type).join(), msg: document.getElementById("msg").textContent, undo: document.getElementById("undoTxt").textContent, search: document.getElementById("flt").value, shown: document.querySelectorAll("#body .lpnedit").length }));
  check("pasting a list adds each LPN with the type chosen, in one go", s.went === false && s.box === "" && s.after.rows === "VLT004040265|BB,RUN001830763|FMCG,QUB001899210|FMCG,RBY006291189|FMCG", s);
  check("pasted LPNs the checks would ask about are named (at most 3) and left out, with what to do", s.after.msg === "Not added: VLT004040265 is already logged; not-an-lpn doesn’t look like an LPN; RUN001830763 is already logged. Type or scan them to add them.", s.after.msg);
  check("one Undo takes the pasted pallets away again, and the old search is cleared so they show", s.after.undo === "Added 3 pasted pallets" && s.after.search === "" && s.after.shown === 4, s.after);
  s = await p.evaluate(() => { const e = undoStack.filter(x => /pasted/.test(x.text)).pop(); addValue("RUN000000099"); e.fn(); return rows.map(r => r.lpn).join(); });
  check("undoing a paste keeps pallets added since", s === "VLT004040265,RUN000000099", s);
  s = await paste("QUB001899210");
  check("a single LPN pasted goes into the box as usual", s.went === true, s);
  await p.evaluate(() => { document.getElementById("lpn").value = ""; });
  s = await p.evaluate(() => { tryAdd("VLT00XX", true, "Hand:"); return true; });
  s = await paste("QUB001899210\nQUB001899211");
  s.msg = await p.evaluate(() => { const m = document.getElementById("msg").textContent, n = rows.length; hideCheck(); return { m, n }; });
  check("with a check waiting, a paste says to answer it first and adds nothing", /^Answer the check first/.test(s.msg.m) && s.msg.n === 2, s);

  // Mute button: the same switch as Settings, kept after a reload.
  s = await p.evaluate(() => { const b = document.getElementById("muteBtn"), r = b.getBoundingClientRect(); const out = { h: r.height, w: r.width, label0: b.getAttribute("aria-label"), pressed0: b.getAttribute("aria-pressed") }; b.click(); out.sound = cfg.sound; out.pressed = b.getAttribute("aria-pressed"); out.label = b.getAttribute("aria-label"); out.msg = document.getElementById("msg").textContent; let beeps = 0; const ac = window.AudioContext; out.saved = JSON.parse(localStorage.getItem("lpncfg")).sound; return out; });
  check("the mute button turns the beeps off and says so", s.h >= 44 && s.w >= 40 && s.label0 === "Mute beeps" && s.pressed0 === "false" && s.sound === false && s.pressed === "true" && s.label === "Mute beeps" && s.msg === "Beeps muted." && s.saved === false, s);
  await p.reload(); await p.waitForTimeout(300);
  s = await p.evaluate(() => { openHelp("settings", "Settings"); const set = document.getElementById("setSound").checked; closeHelp(); return { set, pressed: document.getElementById("muteBtn").getAttribute("aria-pressed") }; });
  check("muting stays after a reload and matches the sound switch in Settings", s.set === false && s.pressed === "true", s);
  s = await p.evaluate(() => { openHelp("settings", "Settings"); const c = document.getElementById("setSound"); c.checked = true; c.onchange(); closeHelp(); return document.getElementById("muteBtn").getAttribute("aria-pressed"); });
  check("turning sound on in Settings un-mutes the button too", s === "false", s);

  // After a tap on mute, focus goes back to the LPN box, so a handheld scan lands there (not on mute again).
  await p.click("#muteBtn"); await p.waitForTimeout(50);
  s = await p.evaluate(() => ({ focus: document.activeElement && document.activeElement.id, sound: cfg.sound }));
  await p.keyboard.type("VLT004040299"); await p.keyboard.press("Enter"); await p.waitForTimeout(100);
  s.after = await p.evaluate(() => ({ added: rows.some(r => r.lpn === "VLT004040299"), sound: cfg.sound }));
  check("after tapping mute a handheld scan goes into the LPN box and doesn't press mute again", s.focus === "lpn" && s.after.added && s.after.sound === s.sound, s);
  await p.evaluate(() => { const b = document.getElementById("muteBtn"); if (!cfg.sound) b.click(); });
  // Clearing the search.
  s = await p.evaluate(() => { rows = [{ lpn: "VLT004040265", type: "BB", fsdu: false }, { lpn: "RUN001830763", type: "BB", fsdu: false }]; save(); render(); const f = document.getElementById("flt"), c = document.getElementById("fltClear"); const out = { hidden0: c.hidden }; f.value = "RUN"; f.dispatchEvent(new Event("input", { bubbles: true })); render(); out.shown = document.querySelectorAll("#body .lpnedit").length; out.hidden1 = c.hidden; const r = c.getBoundingClientRect(); out.size = [r.width, r.height]; c.click(); out.value = f.value; out.all = document.querySelectorAll("#body .lpnedit").length; out.focus = document.activeElement === f; out.hidden2 = c.hidden; return out; });
  check("the ✕ in the search box shows only with a search, clears it and shows everything", s.hidden0 && s.shown === 1 && !s.hidden1 && s.size[0] >= 40 && s.size[1] >= 40 && s.value === "" && s.all === 2 && s.focus && s.hidden2, s);
  s = await p.evaluate(() => { const f = document.getElementById("flt"); f.value = "RUN"; render(); addValue("QUB001899210"); return { value: f.value, shown: document.querySelectorAll("#body .lpnedit").length }; });
  check("adding a pallet clears an old search, so the new pallet shows", s.value === "" && s.shown === 3, s);

  // Press and hold an LPN to copy it; the editor doesn't open. Ctrl+C on it does the same.
  await p.evaluate(() => { window.__copied = []; navigator.clipboard.writeText = async t => { window.__copied.push(t); }; });
  const bx = await p.locator('#body .lpnedit[data-i="1"]').boundingBox();
  await p.mouse.move(bx.x + 20, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(750); await p.mouse.up(); await p.waitForTimeout(150);
  s = await p.evaluate(() => ({ copied: window.__copied.join(), msg: document.getElementById("msg").textContent, editor: !!document.querySelector(".dmgrow"), input: !!document.querySelector("#body td input.lpnin, #body td input") }));
  check("pressing and holding an LPN copies it and doesn't open the editor", s.copied === "RUN001830763" && s.msg === "Copied RUN001830763." && !s.editor, s);
  await p.click('#body .lpnedit[data-i="0"]'); await p.waitForTimeout(150);
  s = await p.evaluate(() => { const b = document.querySelector(".dmgrow .copybtn"), r = { editor: !!document.querySelector(".dmgrow"), btn: b && b.textContent, label: b && b.getAttribute("aria-label"), h: b && b.getBoundingClientRect().height }; b.click(); r.copied = window.__copied.slice(-1)[0]; r.open = !!document.querySelector(".dmgrow"); document.activeElement.blur(); return r; });
  check("a normal tap still opens the editor, which has a Copy LPN button for one-tap and keyboard copying", s.editor && s.btn === "Copy LPN" && s.label === "Copy VLT004040265" && s.h >= 44 && s.copied === "VLT004040265" && s.open, s);
  await p.waitForTimeout(100); await p.evaluate(() => { const b = document.querySelector('#body .lpnedit[data-i="2"]'); b.focus(); });
  await p.keyboard.press("Control+c"); await p.waitForTimeout(100);
  s = await p.evaluate(() => window.__copied.slice(-1)[0]);
  check("Ctrl+C on an LPN copies it", s === "QUB001899210", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
