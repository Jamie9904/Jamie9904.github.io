/* Android app (offline copy) only. tools/android/build-www.js adds this file as android.js; it is not part of the website.
   Inside the Android app a page can't download files or use the browser's share menu, so:
   - saving a file (Excel, PDF, backup…) keeps a copy in Documents › LPN Pallet Log, then opens Android's share menu
     (to email it, put it in Drive, or send it to a printer app);
   - sharing (Email PDF, Share missing list…) uses Android's share menu;
   - barcodes are read by Google's ML Kit on the phone (behind the page's own BarcodeDetector path), for Live scan,
     Scan by photo and Share log codes;
   - Print opens Android's print screen; Keep the screen on holds the screen on natively;
   - files opened or shared into the app (manifest PDFs, logs, photos, backups) and the Scan / Manifest check shortcuts
     go to the right place; Back closes what's open, and on the main screen asks before leaving;
   - Settings and the footer show which Android build this is. */
(function () {
  "use strict";
  window.LPN_APK = true;

  /* Storage: the app's own (LpnStore, native/LpnStore.java) instead of the browser's, which Android caps at about 10 MB.
     The first time, everything already saved is copied across; the browser's copy is left as it was. */
  const S = window.LpnStore;
  if (S && typeof S.get === "function") {
    try {
      if (!S.migrated()) {
        const old = window.localStorage;
        for (let i = 0; i < old.length; i++) { const k = old.key(i); if (k !== null) S.set(k, old.getItem(k)); }
        S.markMigrated();
      }
      const keys = () => { try { return JSON.parse(S.keys()); } catch (e) { return []; } };
      const store = {
        getItem: k => { const v = S.get(String(k)); return v === undefined ? null : v; },
        setItem: (k, v) => { if (!S.set(String(k), String(v))) { const e = new Error("The phone is out of space, so this couldn’t be saved."); e.name = "QuotaExceededError"; throw e; } },
        removeItem: k => { S.remove(String(k)); },
        clear: () => { S.clear(); },
        key: i => { const k = keys()[i]; return k === undefined ? null : k; },
        get length() { return keys().length; }
      };
      Object.defineProperty(window, "localStorage", { value: store, configurable: true });
      window.LPN_APK_STORE = true;
    } catch (e) {}
  }
  // The photo reader's files inside the app (filled in by build-www.js), as full addresses.
  const t = /*TESS*/null;
  if (t) window.LPN_TESS = { workerPath: new URL(t.workerPath, location.href).href, corePath: new URL(t.corePath, location.href).href, langPath: new URL(t.langPath, location.href).href, workerBlobURL: false };

  const P = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins) || null;
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const clean = n => String(n || "file").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
  const cancelled = e => /cancel/i.test(String((e && (e.message || e.errorMessage)) || e));
  const say = t => { const m = document.getElementById("msg"); if (m && t) m.textContent = t; };
  async function toCache(blob, name) {
    const r = await P().Filesystem.writeFile({ path: "share/" + clean(name), data: await b64(blob), directory: "CACHE", recursive: true });
    return r.uri;
  }
  async function keep(blob, name) {
    try { await P().Filesystem.writeFile({ path: "LPN Pallet Log/" + clean(name), data: await b64(blob), directory: "DOCUMENTS", recursive: true }); return true; }
    catch (e) { return false; }
  }
  const shareFile = async (blob, name) => {
    try { await P().Share.share({ title: name, files: [await toCache(blob, name)], dialogTitle: "Send or save " + name }); }
    catch (e) { if (!cancelled(e)) throw e; }
  };
  window.LPN_APK_SAVE = async function (blob, name) {
    const kept = await keep(blob, name);
    say(kept ? "Saved " + name + " in Documents › LPN Pallet Log." : "");
    if (kept) { savedBar(blob, name); return; }
    // Couldn't keep a copy (older Android): straight to the share menu, to save or send it.
    try { await shareFile(blob, name); } catch (e) { say("Couldn’t save " + name + ": " + ((e && e.message) || e)); }
  };
  /* Save to…: Android's own save screen, to put a copy in any folder or in Drive. */
  const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", pdf: "application/pdf", csv: "text/csv", json: "application/json" };
  async function saveTo(data, name, mime) {
    const ext = (String(name).match(/\.([a-z0-9]+)$/i) || [])[1] || "";
    const r = await P().LpnNative.saveAs({ data, name: clean(name), mime: mime || MIME[ext.toLowerCase()] || "application/octet-stream" });
    if (r && r.saved) say("Saved a copy of " + name + " where you chose.");
  }
  /* After saving: a bar at the bottom with Open and Share, so the file needn't be looked for. */
  let barT = 0;
  function savedBar(blob, name) {
    let b = document.getElementById("apkSaved"); if (b) b.remove();
    b = document.createElement("div"); b.id = "apkSaved"; b.className = "apksaved"; b.setAttribute("role", "status");
    const t = document.createElement("p"); t.textContent = "Saved " + name + " in Documents › LPN Pallet Log."; b.appendChild(t);
    const row = document.createElement("div"); row.className = "row"; b.appendChild(row);
    const done = () => { clearTimeout(barT); b.remove(); };
    const btn = (label, fn, cls) => { const x = document.createElement("button"); x.type = "button"; x.textContent = label; if (cls) x.className = cls; x.onclick = fn; row.appendChild(x); return x; };
    btn("Open", async () => { done(); try { await P().LpnNative.openFile({ name: clean(name) }); } catch (e) { say((e && e.message) || "No app on this phone can open that file."); } }, "p");
    btn("Share", async () => { done(); try { await shareFile(blob, name); } catch (e) { say("Couldn’t share " + name + ": " + ((e && e.message) || e)); } });
    btn("Save to…", async () => { done(); try { await saveTo(await b64(blob), name, blob.type); } catch (e) { say("Couldn’t save " + name + " there: " + ((e && e.message) || e)); } });
    btn("✕", done).setAttribute("aria-label", "Close");
    b.style.bottom = (12 + dockH()) + "px";
    document.body.appendChild(b);
    // Stays while it's being used; otherwise goes after 12 seconds.
    const later = () => { clearTimeout(barT); barT = setTimeout(() => { if (!b.contains(document.activeElement)) done(); else later(); }, 12000); };
    later();
  }

  // Downloads: the app saves files by clicking a hidden link with a download name.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (P() && this.download && /^(blob|data):/.test(this.href)) {
      const name = this.download, href = this.href;
      fetch(href).then(r => r.blob()).then(b => window.LPN_APK_SAVE(b, name)).catch(e => say("Couldn’t save " + name + ": " + ((e && e.message) || e)));
      return;
    }
    return click.call(this);
  };

  // Sharing uses Android's share menu.
  if (P()) {
    navigator.canShare = () => true;
    navigator.share = async function (d) {
      d = d || {};
      const files = [];
      for (const f of d.files || []) files.push(await toCache(f, f.name));
      try { await P().Share.share({ title: d.title, text: d.text, url: d.url, files: files.length ? files : undefined, dialogTitle: d.title || "Share" }); }
      catch (e) { if (cancelled(e)) { const x = new Error("Share cancelled"); x.name = "AbortError"; throw x; } throw e; }
    };
  }
  /* ---- Android-only native helpers (tools/android/native) ---- */
  const N = () => (P() && P().LpnNative) || null;
  const A = () => (P() && P().App) || null;
  const $ = id => document.getElementById(id);
  // Styles for the two small things this file adds: a short message at the bottom, and a question (Open a PDF as…).
  const css = document.createElement("style");
  css.textContent = ".apktoast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100vw - 32px);padding:10px 16px;border-radius:12px;background:#1f2a41;color:#fff;font-size:.95rem;z-index:1000;box-shadow:0 4px 16px rgba(0,0,0,.35)}"
    + ".apkask{position:fixed;top:0;right:0;bottom:0;left:0;z-index:1000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end}"
    + ".apksheet{width:100%;margin:0;background:var(--paper,#13264a);color:var(--ink,#eaf0fa);border-top:2px solid var(--ac,#ff8a2a);border-radius:18px 18px 0 0;padding:28px 16px 18px;position:relative;box-shadow:0 -6px 24px rgba(0,0,0,.35);animation:apkup .2s ease-out}"
    + ".apksheet::before{content:'';position:absolute;top:10px;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:var(--mu,#9db0d0);opacity:.6}"
    + "@keyframes apkup{from{transform:translateY(40px);opacity:.4}}@media (prefers-reduced-motion:reduce){.apksheet{animation:none}}.apkask .apkasktitle{margin:0 0 10px;font-weight:700}"
    + ".apksaved{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1000;padding:12px 14px;border-radius:12px;background:#1f2a41;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.4)}.apksaved p{margin:0 0 8px;overflow-wrap:anywhere}"
    + ".apkfiles{list-style:none;padding:0;margin:8px 0}.apkfiles li{padding:10px 0;border-bottom:1px solid var(--rule,#223a63)}.apkfname{margin:0;font-weight:700;overflow-wrap:anywhere}.apkfiles .note{margin:2px 0 8px}";
  document.head.appendChild(css);
  /* Android-style controls (the app's own colours): a ripple where a button is pressed, and switches for the on/off
     settings. They still work as checkboxes for TalkBack and the keyboard. */
  const mat = document.createElement("style");
  mat.textContent = "button{-webkit-tap-highlight-color:transparent}.apkripwrap{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;border-radius:inherit;pointer-events:none}"
    + ".apkripple{position:absolute;border-radius:50%;pointer-events:none;background:currentColor;opacity:.22;transform:scale(0);animation:apkrip .45s ease-out forwards}"
    + "@keyframes apkrip{to{transform:scale(1);opacity:0}}@media (prefers-reduced-motion:reduce){.apkripple{display:none}}"
    + "#panelBody label.chk{align-items:center}"
    + "#panelBody label.chk>input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:44px;height:26px;margin:0 12px 0 0;border-radius:13px;background:var(--rule,#223a63);border:2px solid var(--mu,#9db0d0);position:relative;cursor:pointer;transition:background .15s,border-color .15s}"
    + "#panelBody label.chk>input[type=checkbox]::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--mu,#9db0d0);transition:transform .15s,background .15s}"
    + "#panelBody label.chk>input[type=checkbox]:checked{background:var(--ac,#ff8a2a);border-color:var(--ac,#ff8a2a)}"
    + "#panelBody label.chk>input[type=checkbox]:checked::after{transform:translateX(18px);background:#fff}"
    + "#panelBody label.chk>input[type=checkbox]:focus-visible{outline:2px solid var(--ink,#eaf0fa);outline-offset:2px}";
  document.head.appendChild(mat);
  document.addEventListener("pointerdown", e => {
    const b = e.target && e.target.closest && e.target.closest("button"); if (!b || b.disabled) return;
    // A light tap on the main buttons, like Android's keyboard (with Vibrate on in Settings).
    if (N() && typeof cfg !== "undefined" && cfg.vibrate && b.matches("#add,#tyb button,#scanBtn,#scan,#photo,#upload,#undoLast,#noLpn")) N().tap().catch(() => {});
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement("span");
    if (getComputedStyle(b).position === "static") b.style.position = "relative"; // the ripple sits inside the button; its tap area isn't clipped
    const w = document.createElement("span"); w.className = "apkripwrap"; w.setAttribute("aria-hidden", "true");
    s.className = "apkripple"; s.style.width = s.style.height = d + "px"; s.style.left = (e.clientX - r.left - d / 2) + "px"; s.style.top = (e.clientY - r.top - d / 2) + "px";
    w.appendChild(s); b.appendChild(w); setTimeout(() => w.remove(), 500);
  }, { passive: true });
  // On a phone the entry bar (Add, Scan) is fixed at the bottom: messages and the Saved bar sit just above it.
  function dockH() {
    const en = document.querySelector(".card.entry");
    if (!en || en.hidden || document.body.classList.contains("cmpfocus") || getComputedStyle(en).position !== "fixed") return 0;
    return Math.round(en.getBoundingClientRect().height);
  }
  window.LPN_APK_DOCKH = dockH;
  let toastT = 0;
  function toast(t) {
    let e = $("apkToast");
    if (!e) { e = document.createElement("div"); e.id = "apkToast"; e.className = "apktoast"; e.setAttribute("role", "status"); e.setAttribute("aria-live", "polite"); document.body.appendChild(e); }
    e.style.bottom = (16 + dockH()) + "px";
    e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3000);
  }
  window.LPN_APK_TOAST = toast;

  // Which of several barcodes on one label to use: a Share log code, then an LPN, then anything LPN-shaped.
  const rankCode = v => /^LPNM\d+ /.test(v) ? 0 : typeof lpnDigitsOk === "function" && lpnDigitsOk(tidyLpn(v)) ? 1 : /^[A-Z]{1,3}\d+$/i.test(String(v).replace(/[\s-]+/g, "")) ? 2 : 3;
  // Barcodes: ML Kit, given a still of the camera picture or the photo.
  function still(src) {
    const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return null;
    const max = typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement ? 1280 : 2000, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  if (N()) {
    window.BarcodeDetector = class {
      constructor() {}
      static async getSupportedFormats() { return ["aztec", "code_128", "code_39", "code_93", "codabar", "data_matrix", "ean_13", "ean_8", "itf", "pdf417", "qr_code", "upc_a", "upc_e"]; }
      async detect(src) {
        const c = still(src); if (!c) return [];
        const r = await N().decodeBarcodes({ data: c.toDataURL("image/jpeg", 0.85).split(",")[1] });
        // A label can have several barcodes (an LPN and a shipping code): the LPN comes first, so it's the one used.
        return ((r && r.barcodes) || []).map((b, i) => ({ rawValue: b.rawValue, format: String(b.format), i })).sort((a, b) => rankCode(a.rawValue) - rankCode(b.rawValue) || a.i - b.i).map(({ rawValue, format }) => ({ rawValue, format }));
      }
    };
    window.LPN_APK_MLKIT = true;
  }

  // Buzzes: Android's own vibrator at full strength (the browser's is faint or missing on many phones). Added is one
  // short buzz, a warning a double one (core.js sfx), and copying an LPN a tick.
  if (N()) {
    const vib = p => { const a = (Array.isArray(p) ? p : [p]).map(Number).filter(n => n >= 0); if (a.length && a.some(n => n > 0)) N().vibrate({ pattern: a }).catch(() => {}); return true; };
    try { Object.defineProperty(navigator, "vibrate", { value: vib, configurable: true }); } catch (e) {}
  }

  // Keep the screen on: the page asks for a "wake lock"; the app holds the screen on itself.
  if (N()) {
    let held = null;
    const wl = { request: async () => {
      await N().keepAwake({ on: true });
      const fns = new Set(), s = { type: "screen", released: false, onrelease: null,
        addEventListener: (t, f) => { if (t === "release") fns.add(f); }, removeEventListener: (t, f) => fns.delete(f),
        release: async () => { if (s.released) return; s.released = true; if (held === s) { held = null; await N().keepAwake({ on: false }); } fns.forEach(f => { try { f({ type: "release" }); } catch (e) {} }); } };
      held = s; return s; } };
    try { Object.defineProperty(navigator, "wakeLock", { value: wl, configurable: true }); } catch (e) {}
  }

  // Print: Android's print screen (compare.js printBuf calls this first; it saves and shares if this fails).
  window.LPN_APK_PRINT = async (buf, name) => {
    if (!N()) return false;
    try { await N().printPdf({ data: await b64(new Blob([buf], { type: "application/pdf" })), name: String(name || "LPN Pallet Log").replace(/\.pdf$/i, "") }); return true; }
    catch (e) { return false; }
  };

  // Files opened or shared into the app, and the home-screen shortcuts.
  const has = k => typeof feat !== "function" || feat(k);
  function openManifest() {
    if (!has("manifestCheck")) { toast("The Manifest check is switched off in this app."); return false; }
    if (typeof closeHelp === "function") closeHelp();
    const body = $("cmpBody"); if (body && body.hidden) $("cmpToggle").click();
    const card = $("cmpCard"); if (card) card.scrollIntoView({ block: "start" });
    return true;
  }
  function give(id, file) {
    const inp = $(id); if (!inp) return;
    const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function ask(title, choices, noCancel) {
    const old = document.querySelector(".apkask"); if (old) old.remove();
    // An Android-style bottom sheet over a dimmed page: tapping the dimmed part closes it (unless it must be answered).
    const d = document.createElement("div"); d.className = "apkask"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", title);
    const sheet = document.createElement("div"); sheet.className = "apksheet card"; d.appendChild(sheet);
    d.addEventListener("click", e => { if (e.target === d && !d.dataset.keep) d.remove(); });
    const h = document.createElement("p"); h.className = "apkasktitle"; h.textContent = title; sheet.appendChild(h);
    const row = document.createElement("div"); row.className = "row"; sheet.appendChild(row);
    if (noCancel) d.dataset.keep = "1"; // Back doesn't close it: it must be answered
    choices.concat(noCancel ? [] : [["Cancel", null]]).forEach(([label, fn], i) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label; if (i === 0) b.className = "p";
      b.onclick = () => { d.remove(); if (fn) fn(); }; row.appendChild(b);
    });
    document.body.appendChild(d); row.querySelector("button").focus();
  }
  /* Back to the log: on a phone the entry bar slides away while the open Manifest check fills the screen, so bring
     the log into view and the bar back before using it. */
  /* Focus a box without the on-screen keyboard (a handheld scanner still types into it); a tap on it brings the keyboard. */
  function quietFocus(el) {
    const had = el.getAttribute("inputmode");
    el.setAttribute("inputmode", "none"); el.focus();
    const back = () => { if (had === null) el.removeAttribute("inputmode"); else el.setAttribute("inputmode", had); el.removeEventListener("pointerdown", back); el.removeEventListener("blur", back); };
    el.addEventListener("pointerdown", back); el.addEventListener("blur", back);
  }
  function toLog() {
    const lc = $("logCard"); if (lc && !lc.hidden) lc.scrollIntoView({ block: "start" });
    document.body.classList.remove("cmpfocus"); const en = document.querySelector(".card.entry"); if (en) en.inert = false;
  }
  function opened(r) {
    if (!r) return;
    if (r.error) { toast(r.error); return; }
    if (r.action === "scan") {
      if (typeof closeHelp === "function") closeHelp();
      if (has("palletLog")) toLog();
      const id = has("liveScan") ? "scan" : has("scanByPhoto") ? "photo" : "";
      if (!id) { const l = $("lpn"); if (l) l.focus(); return; }
      const row = $("btnrow"), sb = $("scanBtn");
      if (row && sb && !sb.hidden && !row.classList.contains("open")) sb.click();
      $(id).click(); return;
    }
    if (r.action === "manifest") { openManifest(); return; }
    if (r.action === "show") { // the screenshot check on GitHub (tools/android/shots.sh)
      if (r.what === "settings") { if (typeof closeHelp === "function") closeHelp(); openHelp("settings", "Settings"); }
      else if (r.what === "carry") carryOn();
      else if (r.what === "big-on" || r.what === "big-off") { try { localStorage.setItem("lpnapkbig", r.what === "big-on" ? "on" : "off"); } catch (e) {} applyBig(); }
      return;
    }
    if (r.action === "continue") { if (typeof closeHelp === "function") closeHelp(); const l = $("lpn"); if (l && has("palletLog")) { toLog(); quietFocus(l); } return; }
    if (typeof r.text === "string") { sharedText(r.text); return; }
    if (!r.file) return;
    const bin = atob(r.file.data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const name = r.file.name || "file", mime = r.file.mime || "", file = new File([u], name, { type: mime });
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1] || "";
    if (/json/i.test(mime) || /^json$/i.test(ext)) {
      if (typeof closeHelp === "function") closeHelp();
      openHelp("settings", "Settings"); give("bkFile", file); return;
    }
    if (/^image\//.test(mime) || /^(jpe?g|png|webp|heic)$/i.test(ext)) {
      if (!has("manifestPhotos")) { toast("Reading photos is switched off in this app."); return; }
      if (openManifest()) give("cmpPhotoFile", file); return;
    }
    if (/pdf/i.test(mime) || /^pdf$/i.test(ext)) {
      if (!has("manifestCheck")) { toast("The Manifest check is switched off in this app."); return; }
      ask("Open " + name + " in the Manifest check as:", [["The manifest", () => { if (openManifest()) give("cmpPdfFile", file); }], ["The log", () => { if (openManifest()) give("cmpLogFile", file); }]]);
      return;
    }
    if (/sheet|excel|csv/i.test(mime) || /^(xlsx|xls|csv)$/i.test(ext)) {
      if (openManifest()) { give("cmpLogFile", file); toast("Opened " + name + " as the log in the Manifest check."); } return;
    }
    toast("This app can’t open " + name + ".");
  }
  window.LPN_APK_OPENED = opened;

  /* Back, with Android's predictive back gesture: while you swipe, an open panel or question eases back with your
     finger; letting go closes it (cancelling puts it back). On the main screen the first Back asks, and the next one
     within 2 seconds closes the app with Android's own animation. */
  const openPanel = () => ["panel", "fbBox", "instBox"].map($).find(e => e && !e.hidden) || null;
  const backTarget = () => { const a = document.querySelector(".apkask"); return (a && !a.dataset.keep && a) || openPanel(); };
  function backMove(p) { const t = backTarget(); if (!t) return; t.style.transition = "none"; t.style.transform = "translateX(" + Math.round(p * 48) + "px) scale(" + (1 - p * 0.06).toFixed(3) + ")"; t.style.opacity = String(1 - p * 0.25); }
  function backReset() { [document.querySelector(".apkask"), openPanel()].forEach(t => { if (t) { t.style.transition = "transform .15s, opacity .15s"; t.style.transform = ""; t.style.opacity = ""; } }); }
  function back() {
    backReset();
    const a = document.querySelector(".apkask"); if (a) { if (!a.dataset.keep) a.remove(); return; }
    const sv = $("apkSaved"); if (sv) { sv.remove(); return; }
    if (openPanel()) { history.back(); return; }
    const m = $("expMenu"); if (m && !m.hidden) { m.hidden = true; const b = $("expBtn"); if (b) b.setAttribute("aria-expanded", "false"); return; }
    const sb = $("scanbox"); if (sb && !sb.hidden && typeof stopScan === "function") { stopScan(); return; }
    toast("Press Back again to close the app.");
    N().allowExit({ ms: 2000 }).catch(() => {});
  }
  if (N()) {
    try { N().addListener("back", back); N().addListener("backProgress", e => backMove(Math.max(0, Math.min(1, Number(e && e.progress) || 0)))); N().addListener("backCancelled", backReset); } catch (e) {}
  }
  /* Text shared into the app: the LPNs in it, as manifest numbers or as pallets for the log (with the usual checks). */
  function sharedText(text) {
    // LPN-shaped numbers only; not PO or SO (order) numbers, and only the Manifest check's prefixes when some are set.
    const found = [], pf = typeof getPfx === "function" ? getPfx() : [];
    for (const m of String(text).matchAll(/\b[A-Za-z]{1,3}[ -]?\d{6,12}\b/g)) {
      const v = tidyLpn(m[0]), p = (v.match(/^[A-Z]+/) || [""])[0];
      if (!lpnDigitsOk(v) || /^(PO|SO)$/.test(p) || (pf.length && !pf.includes(p)) || found.includes(v)) continue;
      found.push(v);
    }
    if (!found.length) { toast("No LPNs found in the shared text."); return; }
    const n = found.length + (found.length === 1 ? " LPN" : " LPNs"), choices = [];
    if (has("manifestCheck")) choices.push(["Manifest numbers", () => {
      if (!openManifest()) return;
      const box = $("cmpNums"), have = box.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean), add = found.filter(v => !have.includes(v));
      box.value = have.concat(add).join("\n"); box.dispatchEvent(new Event("input", { bubbles: true }));
      toast(add.length ? "Added " + add.length + " to the manifest numbers." : "Those are already in the manifest numbers.");
    }]);
    if (has("palletLog")) choices.push(["Pallets in the log", () => {
      if (typeof closeHelp === "function") closeHelp();
      addPasted(found.join("\n")); const l = $("lpn"); if (l) l.scrollIntoView({ block: "center" });
    }]);
    if (!choices.length) { toast("This app can’t use shared LPNs."); return; }
    ask("Found " + n + " in the shared text. Use " + (found.length === 1 ? "it" : "them") + " as:", choices);
  }
  if (N()) {
    const take = async () => { try { opened(await N().takePending()); } catch (e) {} };
    try { N().addListener("opened", take); } catch (e) {}
    window.addEventListener("load", () => setTimeout(take, 300));
  }

  // Back: closes what's open (panels go back through the page's own history); on the main screen it asks first.
  if (A()) {
    // Which Android build this is (footer), and what's new after an Android update.
    A().getInfo().then(i => {
      const v = "Android app: " + i.version; window.LPN_APK_VER = v;
      const f = $("verText"); if (f && !$("apkFoot")) { const s = document.createElement("span"); s.id = "apkFoot"; s.textContent = " · " + v; f.after(s); }
      whatsNew(String(i.build || ""));
    }).catch(() => {});
  }
  // Settings › Android app: which build this is, the volume button, and the exported files.
  if (P()) {
    const add = () => {
      if (!$("panelTitle") || $("panelTitle").textContent !== "Settings" || $("apkSet")) return;
      const box = document.createElement("div"); box.id = "apkSet";
      box.innerHTML = '<h3>Android app</h3><p class="note" id="apkVer"></p>'
        + (has("liveScan") ? '<label class="chk"><input type="checkbox" id="apkVol"><span>Volume-down button starts and stops Live scan (volume-up still changes the volume)</span></label>'
          + '<label class="chk"><input type="checkbox" id="apkCam"><span>Live scan with the phone’s own camera scanner (faster, with tap-to-focus and automatic zoom). Untick to use the one inside the app.</span></label>' : "")
        + (has("palletLog") ? '<label class="chk"><input type="checkbox" id="apkSpeak"><span>Say the count out loud after each pallet (and “already logged” or “check” for a warning)</span></label>' : "")
        + (has("palletLog") ? '<label class="chk"><input type="checkbox" id="apkBig"><span>Bigger buttons, for gloves (Add, Scan, the pallet types, Undo, and in the camera scanner)</span></label>' : "")
        + '<div class="row"><button type="button" id="apkColours" hidden>Use the phone’s colours</button></div>' 
        + '<div class="row"><button type="button" id="apkFilesSet">Exported files</button></div>';
      $("panelBody").prepend(box);
      $("apkVer").textContent = (window.LPN_APK_VER || "Android app") + (window.LPN_APK_STORE ? " · Data on this phone: " + mb(S.size()) : "");
      if ($("apkVol")) { $("apkVol").checked = volOn(); $("apkVol").onchange = () => { try { localStorage.setItem("lpnapkvol", $("apkVol").checked ? "on" : "off"); } catch (e) {} syncVol(); }; }
      $("apkFilesSet").onclick = () => showFiles();
      const sw = (id, key, def) => { const c = $(id); if (!c) return; c.checked = pref(key, def); c.onchange = () => { try { localStorage.setItem(key, c.checked ? "on" : "off"); } catch (e) {} }; };
      sw("apkCam", "lpnapkcamscan", true); sw("apkSpeak", "lpnapkspeak", false); sw("apkBig", "lpnapkbig", false);
      if ($("apkBig")) $("apkBig").addEventListener("change", applyBig);
      if (N()) N().phoneColours().then(c => { const b = $("apkColours"); if (!b || !c || !c.available) return; b.hidden = false;
        b.onclick = () => { theme = { bg: c.bg, ac: c.ac }; applyTheme(); saveTheme(); closeHelp(); openHelp("settings", "Settings"); toast("Using your phone’s colours. Reset to default colours (in Settings) goes back."); }; }).catch(() => {});
    };
    if ($("panelBody")) new MutationObserver(add).observe($("panelBody"), { childList: true });
  }

  /* What's new: after each Android update (not on a first install), once, a card with tools/android/whats-new.json. */
  const NOTES = /*NOTES*/[];
  function whatsNew(build) {
    let seen = null; try { seen = localStorage.getItem("lpnapkseen"); } catch (e) {}
    const done = () => { try { localStorage.setItem("lpnapkseen", build); } catch (e) {} };
    if (!build) return;
    if (seen === null || seen === build || !NOTES.length) { done(); return; }
    const old = $("apkNew"); if (old) old.remove();
    const c = document.createElement("div"); c.className = "hello"; c.id = "apkNew"; c.setAttribute("role", "region"); c.setAttribute("aria-label", "What's new in this Android update");
    const h = document.createElement("p"); h.innerHTML = "<b>What’s new in this Android update</b>"; c.appendChild(h);
    const ul = document.createElement("ul"); NOTES.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); }); c.appendChild(ul);
    const row = document.createElement("div"); row.className = "row"; const b = document.createElement("button"); b.type = "button"; b.className = "p"; b.textContent = "OK";
    b.onclick = () => { done(); c.remove(); }; row.appendChild(b); c.appendChild(row);
    const main = document.querySelector("main"); if (main) main.prepend(c);
  }
  window.LPN_APK_WHATSNEW = whatsNew;
  const pref = (key, def) => { try { const v = localStorage.getItem(key); return v === null ? def : v === "on"; } catch (e) { return def; } };

  /* Live scan with the phone's own camera scanner (native/ScanActivity.java). What it reads comes here and goes through
     the page's own scan handling (onCode: same checks, beeps and Share log codes); the scanner shows the result. A
     warning closes the scanner, so the check can be answered in the app. */
  window.LPN_APK_NATIVESCAN = false;
  // What the scanner shows besides the last message: type, FSDU, the last three pallets, bigger buttons.
  const typeColours = () => { const cs = getComputedStyle(document.documentElement); return ["--bb", "--fm", "--fp", "--mx"].map(v => cs.getPropertyValue(v).trim()).filter(c => /^#[0-9a-f]{6}$/i.test(c)).join(","); };
  const expected = () => parseInt(($("expect") || {}).value, 10);
  const allIn = () => { const ex = expected(); return ex > 0 && rows.length >= ex; };
  const scanState = () => ({ allIn: allIn(), type: ($("type") || {}).value || "BB", fsdu: !!($("fsdu") || {}).checked, canUndo: rows.length > 0, big: pref("lpnapkbig", false), colours: typeColours(),
    recent: rows.slice(-3).reverse().map(r => r.lpn + " · " + r.type + (r.fsdu ? " + FSDU" : "")).join("\n") });
  function pushScan(text) { if (N()) N().scanStatus(text ? { text, state: scanState() } : { state: scanState() }).catch(() => {}); }
  window.LPN_APK_SCANSTATE = scanState;
  const countText = () => { const n = rows.length, ex = parseInt(($("expect") || {}).value, 10); return ex > 0 ? n + " of " + ex : n + (n === 1 ? " pallet" : " pallets"); };
  if (N()) {
    document.addEventListener("click", e => {
      const b = e.target && e.target.closest && e.target.closest("#scan");
      if (!b || !pref("lpnapkcamscan", true)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      cameraOk().then(() => { pushScan(); return N().startScanner(); }).then(() => { window.LPN_APK_NATIVESCAN = true; }).catch(() => { if (typeof startScan === "function") { $("video").hidden = false; startScan(); } });
    }, true);
    try {
      N().addListener("nativeScan", e => {
        const vals = ((e && e.values) || []).slice().sort((a, b) => rankCode(a) - rankCode(b)); const v = vals[0]; if (!v) return;
        if (pendingAdd) { N().scanStatus({ text: "Answer the check in the app first.", close: true }); return; }
        onCode(v);
        const said = ($("smsg") || {}).textContent || "";
        if (pendingAdd) N().scanStatus({ text: (($("chkTxt") || {}).textContent || said) + " Answer it in the app.", close: true, flash: "warn" });
        else {
          const ex = expected(), n = rows.length, done = /^Added/.test(said) && ex > 0 && n >= ex;
          const tail = done ? (n === ex ? countText() + ", all in" : countText() + ", more than expected") : countText();
          N().scanStatus({ text: /^LPNM/.test(v) ? said : said + " · " + tail, state: scanState(), flash: /^Added/.test(said) ? "ok" : undefined });
        }
      });
      // The scanner's own buttons change the page's controls, and the scanner shows the result.
      N().addListener("scanType", e => { const b = document.querySelector('#tyb button[data-t="' + e.type + '"]'); if (b) b.click(); pushScan(); });
      N().addListener("scanFsdu", e => { const f = $("fsdu"); if (f) f.checked = !!e.on; pushScan(); });
      N().addListener("scanUndo", () => {
        if (!rows.length) { pushScan("There’s nothing to remove."); return; }
        const last = rows[rows.length - 1].lpn; $("undoLast").click(); pushScan("Removed " + last + " · " + countText() + ". Undo is in the app.");
      });
      N().addListener("nativeScanClosed", e => {
        window.LPN_APK_NATIVESCAN = false;
        if (e && e.reason === "denied") { $("scanbox").hidden = false; $("smsg").textContent = "Camera access was blocked. Allow the camera for LPN Pallet Log in your phone’s Settings › Apps."; }
        else if (e && e.reason === "check") { const c = $("chkBar"); if (c) c.scrollIntoView({ block: "center" }); }
      });
    } catch (e) {}
  }

  /* The status and navigation bars take the app's background colour, with dark icons on a light one. */
  function syncBars() {
    if (!N()) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0c1830";
    const m = /^#?([0-9a-f]{6})$/i.exec(bg); if (!m) return;
    const c = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
    const lum = .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    N().setBars({ colour: "#" + m[1], light: lum > 0.4 }).catch(() => {});
  }
  window.LPN_APK_BARS = syncBars;
  if (N()) window.addEventListener("load", () => {
    syncBars();
    if (typeof window.applyTheme === "function") { const orig = window.applyTheme; window.applyTheme = function () { const r = orig.apply(this, arguments); setTimeout(syncBars, 0); return r; }; }
    try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(syncBars, 50)); } catch (e) {}
  });

  /* Bigger buttons, for gloves (Settings › Android app). */
  function applyBig() { document.documentElement.classList.toggle("apkbig", pref("lpnapkbig", false) && has("palletLog")); }
  window.addEventListener("load", applyBig);
  const bigCss = document.createElement("style");
  bigCss.textContent = "html.apkbig #add,html.apkbig #scanBtn,html.apkbig #undoLast,html.apkbig #tyb button,html.apkbig #btnrow button,html.apkbig #noLpn{min-height:60px;font-size:1.15rem}"
    + "html.apkbig #fsdu{width:30px;height:30px}html.apkbig #tyb button{min-width:64px}";
  document.head.appendChild(bigCss);

  /* Carry on: opening the app with a delivery in progress offers to go straight back to scanning. */
  function carryOn() {
    if (!N() || !has("palletLog") || !has("liveScan") || !rows.length || window.LPN_APK_NATIVESCAN || (typeof scanning !== "undefined" && scanning) || document.querySelector(".apkask") || ($("panel") && !$("panel").hidden)) return;
    ask("Delivery in progress: " + countText() + ".", [["Carry on scanning", () => opened({ action: "scan" })]]);
  }
  window.LPN_APK_CARRYON = carryOn;
  if (N()) window.addEventListener("load", () => setTimeout(() => { try { carryOn(); } catch (e) {} }, 1200));

  /* The count out loud after each pallet, and a word for a warning (Settings › Android app). */
  function sayIt(t) { if (N() && pref("lpnapkspeak", false)) N().speak({ text: t }).catch(() => {}); }
  if (N()) window.addEventListener("load", () => {
    if (typeof window.addValue === "function") { const orig = window.addValue; window.addValue = function () { const r = orig.apply(this, arguments); const n = rows.length, ex = parseInt(($("expect") || {}).value, 10); sayIt(ex > 0 ? n + " of " + ex : String(n)); return r; }; }
    const bar = $("chkBar");
    if (bar) new MutationObserver(() => { if (!bar.hidden) { const t = ($("chkTxt") || {}).textContent || ""; sayIt(/already logged/.test(t) ? "Already logged" : /Check /.test(t) ? "Check" : "Add it?"); } }).observe(bar, { attributes: true, attributeFilter: ["hidden"] });
  });

  /* Low battery: at 15% or less, not charging, with pallets not yet exported, offer to export or back up (once per drop). */
  let battWarned = false;
  async function checkBattery() {
    if (!N() || document.visibilityState !== "visible") return;
    let b; try { b = await N().battery(); } catch (e) { return; }
    if (b.charging || b.level > 20) { battWarned = false; return; }
    if (b.level > 15 || battWarned || !has("palletLog") || !rows.length || (exported && exported.sig === logSig())) return;
    battWarned = true;
    ask("Battery at " + b.level + "%. Export or back up the log now, so nothing is lost if the phone runs out.",
      [["Download (Excel)", () => $("dl").click()], ["Back up", () => { if (typeof closeHelp === "function") closeHelp(); openHelp("settings", "Settings"); $("bkDl").click(); }]]);
  }
  window.LPN_APK_BATTERY = checkBattery;
  if (N()) { window.addEventListener("load", () => setTimeout(checkBattery, 3000)); setInterval(checkBattery, 120000); document.addEventListener("visibilitychange", checkBattery); }

  /* A scanner that types into the app (Bluetooth or USB) connecting or dropping off. */
  if (N()) try { N().addListener("scanner", e => {
    if (!has("palletLog")) return;
    toast(e.connected ? "Scanner connected: " + e.name + "." : "Scanner disconnected: " + e.name + ". Scans won’t reach the app until it reconnects.");
    if (!e.connected) sayIt("Scanner disconnected");
  }); } catch (e) {}
  const mb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  /* The "Continue" shortcut (long-press the app icon) follows the delivery in progress: "Continue: 14 pallets". */
  let contT = 0, contLast = null;
  function syncContinue() {
    if (!N() || typeof rows === "undefined") return;
    const n = has("palletLog") ? rows.length : 0, label = n ? "Continue: " + n + (n === 1 ? " pallet" : " pallets") : "";
    if (label === contLast) return; contLast = label;
    N().setDelivery({ label }).catch(() => {});
  }
  window.LPN_APK_CONTINUE = syncContinue;
  if (N()) window.addEventListener("load", () => {
    syncContinue();
    if (typeof window.save === "function") { const orig = window.save; window.save = function () { const r = orig.apply(this, arguments); clearTimeout(contT); contT = setTimeout(syncContinue, 1000); return r; }; }
  });

  /* Volume-down: starts Live scan, or stops it. On unless switched off in Settings, and only with Live scan on. */
  const volOn = () => { try { return localStorage.getItem("lpnapkvol") !== "off"; } catch (e) { return true; } };
  function syncVol() { if (N()) N().setVolumeScan({ on: volOn() && has("liveScan") && has("palletLog") }).catch(() => {}); }
  if (N()) {
    window.addEventListener("load", syncVol);
    window.addEventListener("load", followFont);
    try { N().addListener("volumeDown", () => {
      const main = document.querySelector("main"); if (main && main.inert) return; // a panel or box is open
      if (typeof scanning !== "undefined" && scanning && typeof stopScan === "function") { stopScan(); return; }
      opened({ action: "scan" });
    }); } catch (e) {}
  }

  /* Text size: follows the phone's when that changes (Large or Extra large for big text), and can still be changed in Settings. */
  async function followFont() {
    if (!N() || typeof cfg === "undefined") return;
    let scale = 1; try { scale = Number((await N().fontScale()).scale) || 1; } catch (e) { return; }
    const key = String(Math.round(scale * 100)); let last = null; try { last = localStorage.getItem("lpnapkfont"); } catch (e) {}
    if (last === key) return; // the phone's setting hasn't changed: leave whatever was chosen in Settings
    try { localStorage.setItem("lpnapkfont", key); } catch (e) {}
    const size = scale >= 1.3 ? "1.25" : scale >= 1.12 ? "1.12" : "1";
    if (last === null && size === "1") return; // first open at normal size: nothing to change
    if (cfg.size !== size) { cfg.size = size; saveCfg(); applyCfg(); }
  }
  window.LPN_APK_FONT = followFont;

  /* Exported files: what the app saved in Documents › LPN Pallet Log, newest first, to open, share or print again. */
  async function showFiles() {
    if (typeof HELP === "undefined") return;
    HELP.apkfiles = '<p class="note">Files this app saved in <b>Documents › LPN Pallet Log</b>, newest first. They stay on this phone; delete them in the Files app.</p><div id="apkFiles"><p class="note">Looking…</p></div><div class="msg" id="apkFilesMsg" role="status" aria-live="polite"></div>';
    if (typeof closeHelp === "function") closeHelp();
    openHelp("apkfiles", "Exported files");
    const box = $("apkFiles"), msg = t => { $("apkFilesMsg").textContent = t; };
    let files = [];
    try { files = ((await P().Filesystem.readdir({ path: "LPN Pallet Log", directory: "DOCUMENTS" })).files || []).filter(f => f.type !== "directory"); } catch (e) {}
    files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    box.innerHTML = "";
    if (!files.length) { box.innerHTML = '<p class="note">No exported files yet. Files appear here after Download (Excel), Email PDF or saving a backup.</p>'; return; }
    const when = t => { if (!t) return ""; const d = new Date(Number(t)); return (typeof ukDate === "function" ? ukDate(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")) : d.toDateString()) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
    const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
    const ul = document.createElement("ul"); ul.className = "apkfiles";
    files.slice(0, 100).forEach(f => {
      const li = document.createElement("li");
      const t = document.createElement("p"); t.className = "apkfname"; t.textContent = f.name; li.appendChild(t);
      const d = document.createElement("p"); d.className = "note"; d.textContent = [when(f.mtime), f.size ? kb(f.size) : ""].filter(Boolean).join(" · "); li.appendChild(d);
      const row = document.createElement("div"); row.className = "row";
      const btn = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.setAttribute("aria-label", label + " " + f.name); b.onclick = () => fn().catch(e => msg(((e && e.message) || "That didn’t work") + ".")); row.appendChild(b); };
      btn("Open", async () => { msg(""); await N().openFile({ name: f.name }); });
      btn("Share", async () => { msg(""); try { await P().Share.share({ title: f.name, files: [f.uri], dialogTitle: "Send " + f.name }); } catch (e) { if (!cancelled(e)) throw e; } });
      btn("Save to…", async () => { msg(""); const r = await P().Filesystem.readFile({ path: "LPN Pallet Log/" + f.name, directory: "DOCUMENTS" }); await saveTo(r.data, f.name); });
      if (/\.pdf$/i.test(f.name)) btn("Print", async () => { msg(""); const r = await P().Filesystem.readFile({ path: "LPN Pallet Log/" + f.name, directory: "DOCUMENTS" }); await N().printPdf({ data: r.data, name: f.name.replace(/\.pdf$/i, "") }); });
      li.appendChild(row); ul.appendChild(li);
    });
    box.appendChild(ul);
  }
  window.LPN_APK_FILES = showFiles;
  if (P()) {
    const h = $("histBtn");
    if (h && !$("apkFilesBtn")) { const b = document.createElement("button"); b.type = "button"; b.id = "apkFilesBtn"; b.textContent = "Exported files"; b.onclick = () => showFiles(); h.after(b); }
  }

  /* The camera: before Android first asks, a line saying what it's for. */
  const explained = () => { try { return localStorage.getItem("lpnapkcam") === "1"; } catch (e) { return false; } };
  async function cameraOk() {
    if (!N() || explained()) return true;
    try { if ((await N().cameraAllowed()).allowed) { localStorage.setItem("lpnapkcam", "1"); return true; } } catch (e) { return true; }
    await new Promise(res => ask("LPN Pallet Log uses the camera to scan pallet barcodes and to take photos of labels and manifests. Android will ask you to allow it next.", [["Continue", res]], true));
    try { localStorage.setItem("lpnapkcam", "1"); } catch (e) {}
    return true;
  }
  if (N() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async c => { if (c && c.video) await cameraOk(); return gum(c); };
  }
  if (N()) document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("#photo");
    if (!b || explained()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    cameraOk().then(() => b.click());
  }, true);
})();
