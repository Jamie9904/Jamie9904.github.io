/* Checks: manifest photos. Run by tests/run.js with the shared helpers (tests/lib.js), the browser and the app's address. */
const { fs, path, ROOT, check, EXCEL_STUB, LIBS, libFile, REAL_LIBS, page } = require("../lib");
module.exports = async ({ browser, URL0 }) => {
  let p, s;
  {
    // Reported: manifest photos stopped adding LPNs, with no hint why. Each photo now says how many it found and
    // added, which were already listed, and which were skipped for a prefix not in the list; one bad photo doesn't
    // stop the rest; and everything goes in a problem report the user can download and send.
    console.log("Manifest photo messages and problem report");
    const q = await page(browser, 390);
    await q.goto(URL0); await q.waitForTimeout(300);
    await q.evaluate(() => {
      document.getElementById("cmpToggle").click();
      document.getElementById("cmpPfx").value = "VLT"; document.getElementById("cmpNums").value = "VLT004037790";
      let n = 0;
      window.readPhoto = async () => {
        n++;
        if (n === 2) throw new Error("blurred");
        const a = n === 1 ? ["VLT004037790", "VLT004037814"] : ["VLT004037858"];
        a.skipped = n === 1 ? ["QUB001899186", "QUB001899210"] : []; return a;
      };
    });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await q.setInputFiles("#cmpPhotoFile", [1, 2, 3].map(i => ({ name: "m" + i + ".jpg", mimeType: "image/jpeg", buffer: png })));
    await q.waitForFunction(() => !/Reading photo/.test(document.getElementById("cmpMsg").textContent), null, { timeout: 5000 }).catch(() => {});
    let s = await q.evaluate(() => ({ msg: document.getElementById("cmpMsg").textContent, nums: document.getElementById("cmpNums").value.split("\n") }));
    check("a photo that can't be read doesn't stop the next photos", s.nums.includes("VLT004037858") && /photo 2/i.test(s.msg) && /blurred/.test(s.msg), s);
    check("the manifest photo message says how many were added and how many were already listed", /Photo 1: found 2 LPNs, 1 new, 1 already in the list/.test(s.msg) && /Photo 3: found 1 LPN, 1 new/.test(s.msg), s.msg);
    check("LPNs skipped for a prefix not in the list are named, with how to fix it", /QUB/.test(s.msg) && /prefix/i.test(s.msg) && s.nums.length === 3, s.msg);
    s = await q.evaluate(() => {
      document.getElementById("cmpPfx").value = "VLT";
      const t = "VLT004037790 QUB001899186 RBY 006291170 TEL 01234567890 PO 12345678 ABCD123456789";
      return { kept: extractLpns(t), skipped: extractLpns(t).skipped };
    });
    check("reading text keeps the listed prefixes and notes the rest", JSON.stringify(s.kept) === '["VLT004037790"]' && JSON.stringify(s.skipped) === '["QUB001899186","RBY006291170"]', s);
    await q.evaluate(() => setTimeout(() => { throw new Error("boom-test"); }, 0));
    await q.waitForTimeout(100);
    s = await q.evaluate(async () => {
      document.getElementById("btnSet").click();
      let out = null; window.saveOnly = async (buf, name, mime) => { out = { name, mime, text: new TextDecoder().decode(buf) }; };
      await document.getElementById("diagDl").onclick();
      const b = document.getElementById("diagDl").getBoundingClientRect();
      return { out, btn: b.width > 0 && b.right <= innerWidth, stored: (localStorage.getItem("lpndiag") || "").length };
    });
    const txt = (s.out && s.out.text) || "";
    check("Settings has a Download problem report button", s.btn && !!s.out && /^lpn-problem-report-\d{4}-\d{2}-\d{2}\.txt$/.test(s.out.name), s.out && s.out.name);
    check("the problem report names the build, browser and screen", /build \d+/.test(txt) && /Browser: /.test(txt) && /Screen: \d+×\d+/.test(txt), txt.slice(0, 400));
    check("the problem report lists the manifest photo reads, the failure and the skipped prefix", /photo 1 of 3/.test(txt) && /blurred/.test(txt) && /QUB001899186/.test(txt), txt);
    check("the problem report includes script errors", /boom-test/.test(txt), txt.slice(-600));
    s = await q.evaluate(() => {
      for (let i = 0; i < 900; i++) diag("test", "entry " + i + " " + "x".repeat(400));
      const a = JSON.parse(localStorage.getItem("lpndiag")); return { n: a.length, size: localStorage.getItem("lpndiag").length, last: a[a.length - 1].m.slice(0, 9) };
    });
    check("the problem log keeps only recent entries and stays small", s.n <= 300 && s.size < 120000 && s.last === "entry 899", s);
    s = await q.evaluate(() => ({ pdf: readNote("m.pdf", Object.assign([], { skipped: [] }), { added: 0, dup: 0 }, true), sk: readNote("m.pdf", Object.assign([], { skipped: ["QUB001899186"] }), { added: 0, dup: 0 }, true),
      bk: checkBackup({ lpndiag: "[" + "\"x\",".repeat(10) + "\"x\"]", lpnnames: "[]" }).data, longWord: (() => { const m = document.getElementById("cmpMsg"); m.textContent = "Photo 4: couldn’t be read (https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js/aaaaaaaaaaaaaaaaaaaa)"; return document.documentElement.scrollWidth <= innerWidth; })() }));
    check("PDF messages talk about the PDF, not a photo", /from this PDF/.test(s.pdf) && /read the PDF again/.test(s.sk) && !/photo/.test(s.pdf + s.sk), s);
    check("a backup can't bring in a problem log", !("lpndiag" in s.bk), Object.keys(s.bk));
    check("a long word in a message wraps instead of widening the page", s.longWord);
    s = await q.evaluate(async () => { localStorage.setItem("lpndiag", "[null,5,{\"t\":\"x\",\"k\":\"y\",\"m\":\"ok-entry\"}]"); let out = ""; window.saveOnly = async (b) => { out = new TextDecoder().decode(b); }; await downloadReport(); return out; });
    check("a damaged problem log still gives a report", /ok-entry/.test(s), s.slice(-200));
    // Readings taken from the user's four manifest photos (31 Oct 2026): first read, close-up re-read.
    s = await q.evaluate(() => {
      const V = tidyReads([["VLT004040265", "VLT004040265"], ["VLT004040273", "VLT004040273"], ["VLT004040278", "VLT004040278"], ["VLT004040355", "VL1004040355"], ["VLT004040416", "VLT004040416"], ["VLT004040418", "VLT004040418"]].map(([a, b], i) => ({ raw: a, first: a, again: b })));
      const R = tidyReads([{ raw: "RUNOO1832813", first: "RUN001832813", again: null }, { raw: "RUNO001832816", first: "RUN0001832816", again: "RUN0001832816" }, { raw: "RUNO01832832", first: "RUN001832832", again: "RUN0001832832" }]);
      // As GitHub's real photo reader saw run.jpg: an O between RUN and the 0s on two of three numbers.
      const R2 = tidyReads([{ raw: "RUNO001832813", first: "RUN0001832813", again: "RUN001832813" }, { raw: "RUN001832816", first: "RUN001832816", again: "RUN0001832816" }, { raw: "RUNO001832832", first: "RUN0001832832", again: "RUN0001832832" }]);
      const lone = tidyReads([{ raw: "RUN0001830763", first: "RUN0001830763", again: null }]);
      const keep10 = tidyReads([{ raw: "RUN0001830763", first: "RUN0001830763", again: null }, { raw: "RUN001832813", first: "RUN001832813", again: null }, { raw: "RUN001832832", first: "RUN001832832", again: null }]);
      // A prefix with an O in it and a real extra-0 number must be left alone.
      const lot = tidyReads([{ raw: "LOT0123456789", first: "LOT0123456789", again: null }, { raw: "LOT123456780", first: "LOT123456780", again: null }, { raw: "LOT123456781", first: "LOT123456781", again: null }]);
      // With VLT in the prefix list, the look-alike reading is still mended and kept, not reported as left out.
      document.getElementById("cmpPfx").value = "VLT";
      const listed = photoLpns([["VLT004040265", null], ["VLT004040273", null], ["VLT004040355", "VL1004040355"], ["QUB001899186", null]].map(([a, b]) => ({ raw: a, first: a, again: b })));
      const speck = tidyReads(["VLT004040265", "VLT004040273", "VLT004040278", "DFA51400180", "QUB001899185", "QUB001899186", "QUB00189918", "RBY006292169"].map(a => ({ raw: a, first: a, again: null })));
      const speckAlone = tidyReads([{ raw: "DFA51400180", first: "DFA51400180", again: null }]);
      // GitHub's real reader on vlt.jpg gave CO1080002090, RR1004040021 and L1121100001 from specks.
      document.getElementById("cmpPfx").value = "";
      const junk = photoLpns(["VLT004040265", "VLT004040273", "VLT004040278", "CO1080002090", "RR1004040021", "L1121100001"].map(a => ({ raw: a, first: a, again: null })));
      const note = readNote("Photo 1", junk, { added: 3, dup: 0 });
      // A real 2-letter LPN among 3-letter ones is not added either, but the note names it.
      const jd = photoLpns(["VLT004040265", "VLT004040273", "JD1234567890"].map(a => ({ raw: a, first: a, again: null })));
      const digits = ["VLT004040265", "VLT0004040265", "VLT04040265", "IM1234567890", "IM12345678901", "IM123456789", "IM123456789012"].map(lpnDigitsOk);
      const imIssues = [lpnIssues("IM12345678901").join(), lpnIssues("IM123456789").join()];
      document.getElementById("cmpNums").value = "IM1234567890\nIM12345678901\nVLT004040265\nIM123456789"; const imOdd = oddNote("cmpNums"); document.getElementById("cmpNums").value = "";
      document.getElementById("cmpPfx").value = "VLT";
      const tel = lpnsFromText("VLT004040265 TEL 01234567890 MOB 07123456789 IM 12345678901 IM 123456789").skipped.join();
      document.getElementById("cmpNums").value = "VLT-004040265\n004040265\nVLT00404026"; const plainOdd = oddNote("cmpNums"); document.getElementById("cmpNums").value = "";
      document.getElementById("cmpPfx").value = "";
      const im = photoLpns(["VLT004040265", "VLT004040273", "IM1234567890", "IM12345678"].map(a => ({ raw: a, first: a, again: null })));
      return { tel, plainOdd, digits: digits.join(), imIssues, imOdd, im: im.join(), junk: junk.join(), junkOdd: junk.odd.join(), note, jd: jd.join(), jdOdd: jd.odd.join(), jdNote: readNote("Photo 1", jd, { added: 2, dup: 0 }), R2: R2.join(), speck: speck.join(), ignored: speck.ignored.join(), speckAlone: speckAlone.join(), V, R, lone, keep10, lot, listed: listed.join(), skipped: listed.skipped.join() };
    });
    check("a prefix letter read as a digit is put back to match the rest of the page (VL1… → VLT…)", s.V.join() === "VLT004040265,VLT004040273,VLT004040278,VLT004040355,VLT004040416,VLT004040418", s.V);
    check("codes made from specks with a different prefix length are not added, and the note lists them (GitHub's reading of vlt.jpg)", s.junk === "VLT004040265,VLT004040273,VLT004040278" && s.junkOdd === "CO1080002090,RR1004040021,L1121100001" && /3 other readings \(CO1080002090, RR1004040021, L1121100001\) didn’t look like the other LPNs/.test(s.note) && /type it in the box/.test(s.note), s);
    check("phone numbers stay out of the left-out list; IM numbers, even one digit short, are named", s.tel === "IM12345678901,IM123456789", s.tel);
    check("typed lines with a dash or no letters are judged by their digits as before", !/VLT-004040265|, 004040265/.test(s.plainOdd) && /VLT00404026/.test(s.plainOdd), s.plainOdd);
    check("IM numbers have 10 or 11 digits, other LPNs 9 or 10", s.digits === "true,true,false,true,true,false,false", s.digits);
    check("an 11-digit IM number isn't called unusual; a 9-digit one is, with the IM rule in the message", s.imIssues[0] === "" && /IM numbers have 10 or 11/.test(s.imIssues[1]) && /IM123456789\./.test(s.imOdd) && !/IM12345678901/.test(s.imOdd) && !/IM1234567890,/.test(s.imOdd), s);
    check("IM numbers (full pallet picks, two letters) are always kept among 3-letter LPNs", s.im === "VLT004040265,VLT004040273,IM1234567890,IM12345678", s.im);
    check("a real-looking 9-10 digit number with another prefix length is never dropped silently", s.jd === "VLT004040265,VLT004040273" && s.jdOdd === "JD1234567890" && /JD1234567890/.test(s.jdNote), s);
    check("a tie between 9 and 10 digits goes to the plainly printed reading (GitHub's reading of run.jpg)", s.R2 === "RUN001832813,RUN001832816,RUN001832832", s.R2);
    check("an O read as an extra 0 after the prefix is dropped to match the rest of the page", s.R.join() === "RUN001832813,RUN001832816,RUN001832832", s.R);
    check("a made-up code from speckles (DFA51400180 on a page of VLT numbers) is left out; a lone other LPN and a short reading of a page prefix are kept", s.speck === "VLT004040265,VLT004040273,VLT004040278,QUB001899185,QUB001899186,QUB00189918,RBY006292169" && s.ignored === "DFA51400180" && s.speckAlone === "DFA51400180", s);
    check("a real extra-0 number with an O in its prefix (LOT) is left alone", s.lot[0] === "LOT0123456789", s.lot);
    check("with a prefix list set, a look-alike reading is mended and kept; other prefixes are reported", s.listed === "VLT004040265,VLT004040273,VLT004040355" && s.skipped === "QUB001899186", s);
    check("a reading with nothing to compare against, or a real 10-digit LPN, is kept as read", s.lone.join() === "RUN0001830763" && s.keep10[0] === "RUN0001830763", s);
    // A pale page with shade across it and paper grain, like a photo of a manifest with no dark edge in shot.
    s = await q.evaluate(async () => {
      const c = document.createElement("canvas"); c.width = 1600; c.height = 2000; const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 1600, 2000); g.addColorStop(0, "#d2d0cc"); g.addColorStop(1, "#8f8d8a"); x.fillStyle = g; x.fillRect(0, 0, 1600, 2000);
      const im = x.getImageData(0, 0, 1600, 2000); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < im.data.length; i += 4) { const n = (rnd() - 0.5) * 30; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } x.putImageData(im, 0, 0);
      x.fillStyle = "#2a2a2a"; x.font = "italic bold 60px Arial"; for (let i = 0; i < 6; i++) x.fillText("LPN:  VLT00404026" + i, 150, 300 + i * 280);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      const cv = await prep(new File([blob], "p.jpg", { type: "image/jpeg" }));
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let black = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) black++;
      const t = cv.getContext("2d").getImageData(Math.round(160 * cv.width / 1600), Math.round(270 * cv.height / 2000), Math.round(500 * cv.width / 1600), Math.round(40 * cv.height / 2000)).data; let ink = 0; for (let i = 0; i < t.length; i += 4) if (t[i] < 128) ink++;
      return { black: black / (d.length / 4), ink: ink / (t.length / 4) };
    });
    check("photo preparation turns shaded, grainy paper white and keeps the text black", s.black < 0.06 && s.ink > 0.1, s);
    // One photo reader for a batch: started once for three photos, closed after a quiet spell; a failed one is replaced.
    s = await q.evaluate(async () => {
      const real = window.Tesseract; let made = 0, closed = 0, fail = false;
      window.Tesseract = { createWorker: async () => { made++; return { setParameters: async () => {}, terminate: async () => { closed++; },
        recognize: async () => { if (fail) throw new Error("worker crashed"); return { data: { words: [], text: "VLT004040265" } }; } }; } };
      const c = document.createElement("canvas"); c.width = 200; c.height = 100; const b = await new Promise(r => c.toBlob(r, "image/png"));
      const f = new File([b], "p.png", { type: "image/png" });
      for (let i = 0; i < 3; i++) await ocrLpns(f);
      const afterBatch = { made, closed };
      fail = true; let err = ""; try { await ocrLpns(f); } catch (e) { err = e.message; }
      fail = false; await ocrLpns(f);
      const afterFail = { made, closed };
      // Two batches at once (manifest photos and a log photo) take turns: each page read is in mode 11, each close-up in mode 7.
      ocrDone(await ocrWorker(), false); // close the earlier stand-in reader first
      const modes = []; let cur = "";
      window.Tesseract = { createWorker: async () => { made++; return { setParameters: async p => { if (p.tessedit_pageseg_mode) cur = p.tessedit_pageseg_mode; await new Promise(r => setTimeout(r, 5)); }, terminate: async () => { closed++; },
        recognize: async () => { const m = cur; await new Promise(r => setTimeout(r, 20)); modes.push(m); return { data: { words: m === "11" ? [{ text: "VLT004040265", bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } }] : [], text: m === "11" ? "VLT004040265" : "VLT004040265" } }; } }; } };
      const both = await Promise.all([ocrLpns(f), ocrLpns(f)]);
      window.__modes = modes.join(); window.__both = both.map(x => x.join()).join("|");
      ocrDone(await ocrWorker(), false); // close it now rather than waiting
      window.Tesseract = real;
      return { afterBatch, err, afterFail, closedAtEnd: closed, modes: window.__modes, both: window.__both };
    });
    check("one photo reader is started for a batch of photos and kept open between them", s.afterBatch.made === 1 && s.afterBatch.closed === 0, s);
    check("a photo reader that fails is closed and the next photo gets a new one", s.err === "worker crashed" && s.afterFail.made === 2 && s.afterFail.closed === 1, s);
    check("two photo reads started together take turns: page reads in mode 11, close-ups in mode 7", s.modes === "11,7,11,7" && s.both === "VLT004040265|VLT004040265" && s.closedAtEnd >= 2, s);
    s = await q.evaluate(() => { document.getElementById("diagClear").click(); return { left: JSON.parse(localStorage.getItem("lpndiag") || "[]").length, msg: document.getElementById("diagMsg").textContent }; });
    check("the problem log can be cleared", s.left === 0 && /cleared/i.test(s.msg), s);
    await q.ctx.close();
  }

  {
    // Live scan on short phones: the camera view shrinks so the "Added" line and Stop scanning stay on screen.
    // A drawn picture stands in for the camera, and a stand-in barcode reader reports one code.
    const cam = () => { const cv = document.createElement("canvas"); cv.width = 640; cv.height = 480; const g = cv.getContext("2d");
      setInterval(() => { g.fillStyle = "#777"; g.fillRect(0, 0, 640, 480); }, 50); const st = cv.captureStream(20);
      // A camera with a torch and zoom, as on most Android phones; the calls to switch them are recorded.
      const tr = st.getVideoTracks()[0]; window.__torch = []; window.__zoom = []; tr.getCapabilities = () => ({ torch: true, zoom: { min: 1, max: 5, step: 0.1 } });
      tr.applyConstraints = async c => { (window.__applies = window.__applies || []).push(c); const a = c.advanced[0]; if ("torch" in a) window.__torch.push(a.torch); if ("zoom" in a) window.__zoom.push(a.zoom); };
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async c => { window.__camAsk = c; return st; };
      window.BarcodeDetector = class { async detect() { return window.__code ? [{ rawValue: window.__code }] : []; } }; };
    for (const [w, h, big] of [[360, 640], [375, 667], [390, 844], [360, 640, 1], [375, 667, 1]]) {
      const q = await page(browser, w, { init: cam });
      await q.setViewportSize({ width: w, height: h });
      await q.goto(URL0); await q.waitForTimeout(300);
      if (big) { await q.evaluate(() => { cfg.size = "1.25"; applyCfg(); }); await q.waitForTimeout(150); }
      await q.evaluate(() => { document.getElementById("scanBtn").click(); document.getElementById("scan").click(); });
      await q.waitForTimeout(500); await q.evaluate(() => { window.__code = "VLT004040265"; }); await q.waitForTimeout(700);
      const s = await q.evaluate(() => { const b = id => document.getElementById(id).getBoundingClientRect();
        const zr = b("zoomRow"), vr = b("video");
        return { zoomIn: !document.getElementById("zoomRow").hidden && zr.top >= vr.top && zr.bottom <= vr.bottom + 1 && zr.right <= innerWidth && b("zoomIn").height >= 44 && b("zoomIn").width >= 44 && zr.width * zr.height <= vr.width * vr.height * 0.45, stop: Math.round(b("stopscan").bottom), msg: Math.round(b("smsg").bottom), torch: Math.round(b("torch").bottom), torchR: Math.round(b("torch").right), vw: innerWidth, vh: innerHeight, text: document.getElementById("smsg").textContent }; });
      check("Live scan at " + w + "×" + h + (big ? " with Extra large text" : "") + ": the Added line, Torch and Stop scanning are on screen", /^Added: VLT004040265/.test(s.text) && s.stop <= s.vh && s.msg <= s.vh && s.torch <= s.vh && s.torchR <= s.vw && s.zoomIn, s);
      if (w === 360 && !big) {
        // A sharper picture with continuous focus is asked for, and the zoom buttons set the camera's zoom and it is remembered.
        let zm = await q.evaluate(async () => { const zin = document.getElementById("zoomIn"), out0 = document.getElementById("zoomOut").disabled;
          for (let i = 0; i < 3; i++) { zin.click(); await new Promise(r => setTimeout(r, 30)); }
          return { ask: window.__camAsk.video, calls: window.__zoom.slice(), saved: localStorage.getItem("lpnzoom"), label: document.getElementById("zoomVal").textContent, out0, name: document.getElementById("zoomRow").getAttribute("aria-label"), inName: zin.getAttribute("aria-label"), last: window.__applies[window.__applies.length - 1] }; });
        check("Live scan asks for a sharp picture (1920×1080) with continuous focus", zm.ask.width.ideal === 1920 && zm.ask.height.ideal === 1080 && zm.ask.advanced[0].focusMode === "continuous", zm.ask);
        await q.evaluate(async () => { document.getElementById("stopscan").click(); window.__zoom = []; document.getElementById("scan").click(); await new Promise(r => setTimeout(r, 400)); });
        zm.again = await q.evaluate(() => ({ calls: window.__zoom.slice(), value: document.getElementById("zoomVal").textContent }));
        check("Zoom in steps the camera's zoom (1.5×, 2×, 3×), says how much, and the zoom is used again next time", JSON.stringify(zm.calls) === "[1.5,2,3]" && zm.saved === "3" && zm.label === "3×" && zm.out0 === true && zm.name === "Zoom" && zm.inName === "Zoom in" && JSON.stringify(zm.again.calls) === "[3]" && zm.again.value === "3×", zm);
        check("changing the zoom keeps the sharp picture and continuous focus", zm.last.width.ideal === 1920 && zm.last.height.ideal === 1080 && zm.last.advanced.some(a => a.focusMode === "continuous"), zm.last);
        await q.evaluate(() => document.getElementById("torch").click()); await q.waitForTimeout(50);
        let t = await q.evaluate(() => ({ calls: window.__torch.slice(), pressed: document.getElementById("torch").getAttribute("aria-pressed") }));
        await q.evaluate(() => document.getElementById("torch").click()); await q.waitForTimeout(50);
        t.after = await q.evaluate(() => ({ calls: window.__torch.slice(), pressed: document.getElementById("torch").getAttribute("aria-pressed") }));
        await q.click("#stopscan"); await q.waitForTimeout(50);
        t.hidden = await q.evaluate(() => document.getElementById("torch").hidden);
        check("Torch switches the camera light on and off, says if it's on, and goes when scanning stops", JSON.stringify(t.calls) === "[true]" && t.pressed === "true" && JSON.stringify(t.after.calls) === "[true,false]" && t.after.pressed === "false" && t.hidden, t);
        // A camera without a torch (most iPhones): no button.
        await q.evaluate(() => { const g = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = async () => { const st = await g(); st.getVideoTracks()[0].getCapabilities = () => ({}); return st; }; document.getElementById("scan").click(); });
        await q.waitForTimeout(400);
        t = await q.evaluate(() => ({ hidden: document.getElementById("torch").hidden, zoom: document.getElementById("zoomRow").hidden, msg: document.getElementById("smsg").textContent }));
        check("with no torch or zoom on the camera (most iPhones), the Torch button and zoom buttons aren't shown", t.hidden && t.zoom && /Point the camera|Added/.test(t.msg), t);
        check("no script errors", q.errors.length === 0, q.errors);
      }
      await q.ctx.close();
    }
  }

  // The user's photos of 6 Nov 2026 (problem report #2), with the readings GitHub's real photo reader gave:
  // V0013323651 among VLT numbers was left out; QUB001911625 was read with a gap (QUB00191 1625); RUN001840861, alone
  // on its page, came out as RUN0001840861 because the close-up added a 0, with print showing through from the back
  // of the page read as FI8111010009.
  {
    console.log("Manifest photos: single-letter prefixes, numbers read with a gap, a page with one LPN");
    const q = await page(browser, 390);
    await q.goto(URL0); await q.waitForTimeout(300);
    const s = await q.evaluate(() => {
      const it = (x, lab, again) => ({ raw: x, first: x, again: again === undefined ? null : again, lab });
      const page1 = ["VLT004055885", "VLT004055887", "VLT004055889", "VLT004055998", "VLT004056066"];
      const v = tidyReads([it("V0013323651", true), ...page1.map(x => it(x, true)), it("HB0182007092", false), it("L1121100001", true), it("V12345", true)]);
      const single = tidyReads([it("RUN001840861", true, "RUN0001840861"), it("FI8111010009", false)]);
      // A real 10-digit number read the same both times, and a close-up that differs in other ways, keep the close-up rule.
      const ten = tidyReads([it("RUN0001840861", true, "RUN0001840861")]), other = tidyReads([it("RUN001840861", true, "RUN001840867")]);
      const bb = (x0, y0) => ({ x0, y0, x1: x0 + 50, y1: y0 + 20 });
      const w = (a) => a.map(([text, x, y]) => ({ text, bbox: bb(x, y === undefined ? 10 : y) }));
      const c = ocrWordCands(w([["LPN", 0], ["QUB00191", 60], ["1625", 115], ["LPN:", 0], ["QUB001911630", 60], ["LPN", 0], ["V0013323651", 60], ["VLT004055885", 0], ["2056", 60], ["Trailer", 0], ["2056", 60]]));
      const apart = ocrWordCands(w([["QUB00191", 60], ["1625", 400]])), below = ocrWordCands(w([["QUB001", 60], ["395312", 115, 60]]));
      const nol = ocrWordCands(w([["LPN:", 0], ["0013323651", 60], ["ITEM", 0], ["014908200", 60]]));
      return { v: v.join(), vIgn: v.ignored.join(), single: single.join(), singleIgn: single.ignored.join(), ten: ten.join(), other: other.join(),
        cands: c.map(x => x.first + (x.lab ? "*" : "")).join(), box: c[0] && c[0].bbox, apart: apart.length, below: below.length, nol: nol.noLetters.join(), nolC: nol.length,
        lpnPfx: extractLpns("LPN 0013323651 LPN VLT004055885", true).join() };
    });
    check("a V, R or Q number with an LPN's digit count is kept among 3-letter prefixes (V0013323651); specks and short ones are still left out", /^V0013323651,VLT004055885/.test(s.v) && s.vIgn === "HB0182007092,L1121100001,V12345", s);
    check("on a page with one LPN, a close-up that only adds a 0 to a plainly read number is not used (RUN001840861), and print showing through is left out", s.single === "RUN001840861" && s.singleIgn === "FI8111010009" && s.ten === "RUN0001840861" && s.other === "RUN001840867", s);
    check("a number read with a gap on the same line (QUB00191 1625) is read as one LPN; labelled numbers are marked; other digits aren't joined on", s.cands === "QUB001911625*,QUB001911630*,V0013323651*,VLT004055885" && s.box.x0 === 60 && s.box.x1 === 165, s);
    check("digits far along the line or on the next line are never joined on", s.apart === 0 && s.below === 0, s);
    check("an LPN read without its letters is named for the note, not lost; the LPN label is never a prefix", s.nol === "0013323651" && s.nolC === 0 && s.lpnPfx === "VLT004055885", s);
    check("no script errors", q.errors.length === 0, q.errors);
    await q.ctx.close();
  }
};
