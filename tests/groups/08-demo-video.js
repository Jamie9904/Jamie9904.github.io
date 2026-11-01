/* Checks: demo video. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  console.log("Demo video");
  {
    const mp4 = path.join(ROOT, "media", "demo.mp4"), poster = path.join(ROOT, "media", "demo-poster.jpg");
    check("the demo video and its poster are in the site, small enough for phones", fs.existsSync(mp4) && fs.existsSync(poster) && fs.statSync(mp4).size < 3e6, fs.existsSync(mp4) && fs.statSync(mp4).size);
    p = await page(browser, 375);
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.click("#btnGuide"); await p.waitForTimeout(200);
    s = await p.evaluate(() => { const body = document.getElementById("panelBody"), b = document.getElementById("demoPlay"), v = document.getElementById("demoVid");
      const r = b.getBoundingClientRect();
      return { first: body.firstElementChild && body.firstElementChild.contains(b), hidden: v.hidden, preload: v.preload, fits: r.left >= 0 && r.right <= innerWidth && r.height >= 44 }; });
    check("the Guide starts with a button to play the demo video, and nothing loads until it's tapped", s.first && s.hidden && s.preload === "none" && s.fits, s);
    await p.click("#demoPlay"); await p.waitForTimeout(300);
    s = await p.evaluate(() => { const v = document.getElementById("demoVid"); return { shown: !v.hidden, src: v.querySelector("source").getAttribute("src"), btn: document.getElementById("demoPlay").hidden, w: v.getBoundingClientRect().width, vol: v.volume }; });
    check("the demo video starts at half volume", s.vol === 0.5, s.vol);
    check("tapping it shows the video player in the Guide", s.shown && s.src === "media/demo.mp4" && s.btn && s.w > 200 && s.w <= 375, s);
    s = await p.evaluate(() => { closeHelp(); return document.getElementById("demoVid").paused; });
    check("closing the Guide stops the video", s === true, s);
    check("no script errors", p.errors.length === 0, p.errors);
    await p.ctx.close();
  }

  {
    // Does the Guide's demo video still show what the app looks like? Compares the key screens with the fingerprint
    // taken when it was recorded (tools/demo-video/screens.json). A difference is a warning, never a failure.
    const scr = require(path.join(ROOT, "tools", "demo-video", "screens.js"));
    const want = fs.existsSync(scr.FILE) ? JSON.parse(fs.readFileSync(scr.FILE, "utf8")) : null;
    check("the demo video's screen fingerprint is there", !!want && Array.isArray(want.log) && want.log.length > 3);
    if (want) {
      const q = await page(browser, 390);
      await q.setViewportSize({ width: 390, height: 844 });
      const diffs = scr.differences(want, await scr.fingerprint(q, URL0));
      await q.ctx.close();
      const msg = diffs.length ? "The screens differ from the Guide's demo video (" + diffs.slice(0, 6).join("; ") + "). Re-record it with sh tools/demo-video/make.sh if the change shows in the video." : "";
      console.log("  note demo video vs screens: " + (diffs.length ? msg : "still matches"));
      if (diffs.length && process.env.GITHUB_ACTIONS) console.log("::warning title=Demo video may be out of date::" + msg.replace(/[\r\n%]/g, " "));
    }
  }
};
