/* Checks: − and + on Expected pallets, the type badge in the "Added" note, keyboard shortcuts (not for scanners),
   the seal number keypad and trailer capitals. Named 228 so it runs before 23-offline, which stays last. */
const { check, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Expected stepper, Added badge, keyboard shortcuts, seal keypad");
  p = await page(browser, 375);
  await p.goto(URL0); await p.waitForTimeout(300);
  s = await p.evaluate(() => {
    const e = document.getElementById("expect"), up = document.getElementById("expUp"), down = document.getElementById("expDown"), out = {};
    e.value = ""; down.click(); out.empty = e.value; up.click(); out.one = e.value; up.click(); up.click(); out.three = e.value; down.click(); out.two = e.value;
    e.value = "0"; down.click(); out.zero = e.value;
    e.value = ""; down.click(); out.emptyMsg = document.getElementById("msg").textContent;
    e.value = "12"; up.click(); out.upMsg = document.getElementById("msg").textContent; out.saved = JSON.parse(localStorage.getItem("lpnlog")).expect; out.summary = document.getElementById("delSum") ? document.getElementById("delSum").textContent : "";
    const r1 = up.getBoundingClientRect(), r2 = down.getBoundingClientRect(), ri = e.getBoundingClientRect();
    out.sizes = [r1.width, r1.height, r2.width, r2.height]; out.inputW = ri.width; out.labels = [down.getAttribute("aria-label"), up.getAttribute("aria-label")];
    return out; });
  check("− and + change Expected pallets one at a time, never below 0, saved and announced", s.empty === "" && s.one === "1" && s.three === "3" && s.two === "2" && s.zero === "0" && s.saved === "13" && s.upMsg === "Expected pallets: 13." && /^Expected pallets is empty/.test(s.emptyMsg), s);
  check("the − and + buttons are big enough for gloves and named for screen readers", s.sizes.every(x => x >= 44) && s.inputW >= 80 && s.labels[0] === "One fewer expected pallet" && s.labels[1] === "One more expected pallet", s);
  // Added note: the type as a badge in its colour.
  s = await p.evaluate(() => { rows = []; save(); render(); document.querySelector('#tyb button[data-t="FMCG"]').click(); addValue("VLT004040265"); const f = document.getElementById("flash"), b = f.querySelector(".ftype"); return { color: b && getComputedStyle(b).color, text: f.textContent, badge: b && b.textContent, bg: b && getComputedStyle(b).backgroundColor, fm: getComputedStyle(document.documentElement).getPropertyValue("--fm").trim() }; });
  const hex = h => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h); return m ? "rgb(" + m.slice(1).map(x => parseInt(x, 16)).join(", ") + ")" : h; };
  check("the Added note shows the pallet type as a badge in that type's colour", s.text === "Added #1: VLT004040265 · FMCG" && s.badge === "FMCG" && s.bg === hex(s.fm) && s.color === "rgb(0, 0, 0)", s);
  // Keyboard shortcuts.
  await p.evaluate(() => { document.activeElement.blur(); document.body.focus(); });
  await p.keyboard.press("3"); await p.waitForTimeout(150);
  s = await p.evaluate(() => document.getElementById("type").value);
  await p.keyboard.press("f"); await p.waitForTimeout(150);
  const f1 = await p.evaluate(() => document.getElementById("fsdu").checked);
  await p.keyboard.press("/"); await p.waitForTimeout(150);
  const slash = await p.evaluate(() => ({ focus: document.activeElement.id, val: document.getElementById("flt").value }));
  check("on a computer 3 picks FPP, F ticks FSDU and / goes to the search (without typing a /)", s === "FPP" && f1 === true && slash.focus === "flt" && slash.val === "", { s, f1, slash });
  await p.keyboard.type("12", { delay: 120 }); await p.waitForTimeout(150);
  s = await p.evaluate(() => ({ type: document.getElementById("type").value, flt: document.getElementById("flt").value }));
  check("keys typed in a box are just typing", s.type === "FPP" && s.flt === "12", s);
  // A handheld scanner typing an LPN into the page (keys a few ms apart) changes nothing.
  await p.evaluate(() => { document.getElementById("flt").value = ""; render(); document.activeElement.blur(); document.getElementById("fsdu").checked = false; });
  await p.keyboard.type("FAB1234567", { delay: 8 }); await p.waitForTimeout(200);
  s = await p.evaluate(() => ({ type: document.getElementById("type").value, fsdu: document.getElementById("fsdu").checked }));
  check("a scanner's fast keys (F and digits in an LPN) don't change the type or FSDU", s.type === "FPP" && s.fsdu === false, s);
  s = await p.evaluate(async () => { openHelp("guide", "Guide"); return true; });
  await p.keyboard.press("2"); await p.waitForTimeout(150);
  s = await p.evaluate(() => { const t = document.getElementById("type").value; closeHelp(); return t; });
  check("shortcuts do nothing while a panel is open", s === "FPP", s);
  // The type change is said; not behind the Export menu; the Settings switch turns the shortcuts off.
  await p.evaluate(() => { document.activeElement.blur(); });
  await p.keyboard.press("2"); await p.waitForTimeout(150);
  s = await p.evaluate(() => document.getElementById("msg").textContent);
  check("a type picked from the keyboard is announced", s === "Type: FMCG for the next pallet.", s);
  await p.evaluate(() => { document.getElementById("expBtn").click(); document.activeElement.blur(); });
  await p.keyboard.press("4"); await p.waitForTimeout(150);
  s = await p.evaluate(() => { const t = document.getElementById("type").value; document.getElementById("expBtn").click(); return t; });
  check("shortcuts don't change the type behind an open menu", s === "FMCG", s);
  await p.evaluate(() => { openHelp("settings", "Settings"); const c = document.getElementById("setKeys"); c.checked = false; c.onchange(); closeHelp(); document.activeElement.blur(); });
  await p.keyboard.press("1"); await p.waitForTimeout(150);
  s = await p.evaluate(() => { const r = { type: document.getElementById("type").value, saved: JSON.parse(localStorage.getItem("lpncfg")).keys }; cfg.keys = true; saveCfg(); return r; });
  check("Settings can turn the keyboard shortcuts off", s.type === "FMCG" && s.saved === false, s);
  // Seals open the number keypad; trailer numbers go into capitals.
  s = await p.evaluate(() => ({ si: document.getElementById("sealIn").inputMode, so: document.getElementById("sealOut").inputMode }));
  await p.fill("#trailer", ""); await p.click("#trailer"); await p.keyboard.type("tr 4471a");
  s.trailer = await p.evaluate(() => document.getElementById("trailer").value);
  check("seal boxes open the number keypad and trailer numbers are put into capitals", s.si === "numeric" && s.so === "numeric" && s.trailer === "TR 4471A", s);
  check("no script errors", p.errors.length === 0, p.errors);
  await p.ctx.close();
};
