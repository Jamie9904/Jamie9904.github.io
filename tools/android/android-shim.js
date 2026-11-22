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
  /* The folder chosen in Settings (for example a synced OneDrive or Google Drive folder): every export also goes there. */
  const dirGet = () => { try { const v = JSON.parse(localStorage.getItem("lpnapkdir") || "null"); return v && v.uri ? v : null; } catch (e) { return null; } };
  async function toFolder(blob, name) {
    const d = dirGet(); if (!d || !N() || typeof N().saveToFolder !== "function") return "";
    const ext = (String(name).match(/\.([a-z0-9]+)$/i) || [])[1] || "";
    try { const r = await N().saveToFolder({ uri: d.uri, name: clean(name), data: await b64(blob), mime: blob.type || MIME[ext.toLowerCase()] || "application/octet-stream" }); return r && r.saved ? " and in " + (r.folder || d.name) : ""; }
    catch (e) { toast("Couldn’t save " + name + " in " + d.name + ": " + ((e && (e.message || e.errorMessage)) || e)); return ""; }
  }
  window.LPN_APK_SAVE = async function (blob, name) {
    const kept = await keep(blob, name), also = await toFolder(blob, name);
    say(kept ? "Saved " + name + " in Documents › LPN Pallet Log" + also + "." : also ? "Saved " + name + also.replace(/^ and/, "") + "." : "");
    if (kept) { savedBar(blob, name, also); return; }
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
  function savedBar(blob, name, also) {
    let b = document.getElementById("apkSaved"); if (b) b.remove();
    b = document.createElement("div"); b.id = "apkSaved"; b.className = "apksaved"; b.setAttribute("role", "status");
    const t = document.createElement("p"); t.textContent = "Saved " + name + " in Documents › LPN Pallet Log" + (also || "") + "."; b.appendChild(t);
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
    if (N() && typeof cfg !== "undefined" && cfg.vibrate && b.matches("#add,#tyb button,#scanBtn,#scan,#photo,#upload,#undoLast,#noLpn,.apkgo,#apkCarryBtn,#apkBack")) N().tap().catch(() => {});
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
    if (mode) { setMode("cmp"); return true; }
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
    if (mode) setMode("log");
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
      else if (r.what === "ocrtest") ocrTest();
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
    if (window.LPN_APK_INTRODONE && window.LPN_APK_INTRODONE()) return;
    if (window.LPN_APK_MORE && window.LPN_APK_MORE()) return;
    const a = document.querySelector(".apkask"); if (a) { if (!a.dataset.keep) a.remove(); return; }
    const sv = $("apkSaved"); if (sv) { sv.remove(); return; }
    if (openPanel()) { history.back(); return; }
    const m = $("expMenu"); if (m && !m.hidden) { m.hidden = true; const b = $("expBtn"); if (b) b.setAttribute("aria-expanded", "false"); return; }
    const sb = $("scanbox"); if (sb && !sb.hidden && typeof stopScan === "function") { stopScan(); return; }
    if (mode && mode !== "menu") { setMode("menu"); return; }
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
      const v = /^Android APK build \d+$/.test(i.version || "") ? i.version : "Android app: " + i.version; window.LPN_APK_VER = v;
      const f = $("verText"); if (f && !$("apkFoot")) { const s = document.createElement("span"); s.id = "apkFoot"; s.textContent = " " + v + " ·"; f.after(s); } // (the website's line already ends with a dot)
      whatsNew(String(i.build || ""));
    }).catch(() => {});
  }
  // Settings › Android app: which build this is, the volume button, and the exported files.
  if (P()) {
    const add = () => {
      if (!$("panelTitle") || $("panelTitle").textContent !== "Settings" || $("apkSet")) return;
      const box = document.createElement("div"); box.id = "apkSet";
      box.innerHTML = '<h3>Android app</h3><p class="note" id="apkVer"></p>'
        + '<h4 class="apksub">Scanning</h4>'
        + (has("liveScan") ? '<label class="chk"><input type="checkbox" id="apkVol"><span>Volume-down button starts and stops Live scan (volume-up still changes the volume)</span></label>'
          + '<label class="chk"><input type="checkbox" id="apkCam"><span>Live scan with the phone’s own camera scanner (faster, with tap-to-focus and automatic zoom). Untick to use the one inside the app.</span></label>' : "")
        + (has("palletLog") ? '<label class="chk"><input type="checkbox" id="apkSpeak"><span>Say the count out loud after each pallet (and “already logged” or “check” for a warning)</span></label>' : "")
        + '<label class="chk"><input type="checkbox" id="apkHand"><span>Warehouse handheld scanner (Zebra or Honeywell): scans come straight into the app, so they can’t land in the wrong box. Untick if your scanner should type like a keyboard.</span></label>'
        + (has("manifestPhotos") ? '<h4 class="apksub">Photos</h4><label class="chk"><input type="checkbox" id="apkOcr"><span>Read manifest photos with the phone’s own text reader instead of the app’s own. It can be faster, but the app’s own reader is more accurate on the test photos, so check what it finds.</span></label>' : "")
        + '<h4 class="apksub">Display</h4>'
        + (has("palletLog") ? '<label class="chk"><input type="checkbox" id="apkBig"><span>Bigger buttons, for gloves (Add, Scan, the pallet types, Undo, and in the camera scanner)</span></label>' : "")
        + '<div class="row"><button type="button" id="apkColours" hidden>Use the phone’s colours</button></div>'
        + '<h4 class="apksub">Exports</h4><p class="note" id="apkDirNote"></p><div class="row"><button type="button" id="apkDirPick">Choose a folder for exports</button><button type="button" id="apkDirOff" hidden>Stop saving there</button></div>'
        + '<div class="row"><button type="button" id="apkFilesSet">Exported files</button></div>';
      $("panelBody").prepend(box);
      $("apkVer").textContent = (window.LPN_APK_VER || "Android app") + (window.LPN_APK_STORE ? " · Data on this phone: " + mb(S.size()) : "");
      if ($("apkVol")) { $("apkVol").checked = volOn(); $("apkVol").onchange = () => { try { localStorage.setItem("lpnapkvol", $("apkVol").checked ? "on" : "off"); } catch (e) {} syncVol(); }; }
      $("apkFilesSet").onclick = () => showFiles();
      const sw = (id, key, def) => { const c = $(id); if (!c) return; c.checked = pref(key, def); c.onchange = () => { try { localStorage.setItem(key, c.checked ? "on" : "off"); } catch (e) {} }; };
      sw("apkCam", "lpnapkcamscan", true); sw("apkSpeak", "lpnapkspeak", false); sw("apkBig", "lpnapkbig", false); sw("apkHand", "lpnapkhand", true); sw("apkOcr", "lpnapkocr", OCR_DEFAULT);
      if ($("apkHand")) $("apkHand").addEventListener("change", syncHand);
      const dirShow = () => { const d = dirGet(), n = $("apkDirNote"); if (!n) return;
        n.textContent = "Exports are saved in Documents › LPN Pallet Log" + (d ? " and in " + d.name + "." : ". Choose a folder (for example a OneDrive or Google Drive folder on this phone) to put a copy of every export there too.");
        $("apkDirOff").hidden = !d; $("apkDirPick").textContent = d ? "Choose another folder" : "Choose a folder for exports"; };
      dirShow();
      $("apkDirPick").onclick = async () => { try { const r = await N().pickFolder(); if (r && r.picked) { localStorage.setItem("lpnapkdir", JSON.stringify({ uri: r.uri, name: r.name })); dirShow(); toast("Every export will also be saved in " + r.name + "."); } } catch (e) { toast((e && e.message) || "That folder can’t be used."); } };
      $("apkDirOff").onclick = () => { try { localStorage.removeItem("lpnapkdir"); } catch (e) {} dirShow(); toast("Exports are saved in Documents › LPN Pallet Log only."); };
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

  /* Warehouse handheld scanners (Zebra, Honeywell): each scan arrives from Android as one whole code, so it goes where
     it belongs whatever has focus: an open pallet edit closes first, a box someone is filling in (manifest numbers,
     search, the scanner test) gets it, the Manifest check's page adds it to the manifest numbers, and otherwise it is
     logged as the next pallet, with the usual checks. */
  function handScan(code) {
    code = String(code || "").trim(); if (!code) return;
    const a = document.activeElement;
    if (a && a.closest && a.closest(".dmgrow")) a.blur();
    else if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.id !== "lpn" && !/^(checkbox|radio|button|submit|file|date|color|range)$/i.test(a.type || "")) {
      if (a.tagName === "TEXTAREA") { const v = a.value; a.value = v + (v && !/\n$/.test(v) ? "\n" : "") + code + "\n"; a.dispatchEvent(new Event("input", { bubbles: true })); }
      else { a.value = code; a.dispatchEvent(new Event("input", { bubbles: true })); a.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }
      return;
    }
    if (openPanel()) { toast("Close this to log scans."); return; }
    if (mode === "cmp" || !has("palletLog")) {
      if (!has("manifestCheck") || typeof addNums !== "function") return;
      const r = addNums([code], "cmpNums"); $("cmpNums").dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof sfx === "function") sfx(r.added ? "ok" : "warn"); glow(r.added ? "ok" : "warn");
      toast(r.added ? "Added " + code + " to the manifest numbers." : code + " is already in the manifest numbers."); return;
    }
    if (mode && mode !== "log") setMode("log");
    const l = $("lpn"); if (!l || typeof add !== "function") return;
    const n = rows.length; l.value = code; add();
    // The same buzz and sound as a camera scan come with adding; the screen's edge flashes green, or orange for a check.
    setTimeout(() => { const chk = $("chkBar"); glow(chk && !chk.hidden ? "warn" : rows.length > n ? "ok" : "warn"); }, 60);
  }
  let glowT = 0;
  function glow(kind) {
    let g = $("apkGlow"); if (!g) { g = document.createElement("div"); g.id = "apkGlow"; g.setAttribute("aria-hidden", "true"); document.body.appendChild(g); }
    clearTimeout(glowT); g.className = kind; glowT = setTimeout(() => { g.className = ""; }, 450);
  }
  /* The Manifest date shown the app's way (day/month/year unless Settings says otherwise), like the delivery date,
     instead of the phone's own date box format. */
  function cmpDateShow() {
    const d = $("cmpDate"); if (!d) return;
    if (!d.parentElement.classList.contains("dwrap")) {
      const w = document.createElement("div"); w.className = "dwrap"; d.before(w); w.appendChild(d);
      const s = document.createElement("span"); s.className = "dshow"; s.id = "cmpDateShow"; s.setAttribute("aria-hidden", "true"); w.appendChild(s);
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      Object.defineProperty(d, "value", { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); cmpDateShow(); } });
      ["input", "change"].forEach(k => d.addEventListener(k, cmpDateShow));
    }
    const v = d.value, s = $("cmpDateShow"); s.textContent = v ? (typeof ukDate === "function" ? ukDate(v) : v) : "Pick a date"; s.classList.toggle("ph", !v);
  }
  window.LPN_APK_HANDSCAN = handScan;
  function syncHand() { if (N() && typeof N().setHandheld === "function") N().setHandheld({ on: pref("lpnapkhand", true) }).catch(() => {}); }
  window.LPN_APK_SYNCHAND = syncHand;
  if (N()) { try { N().addListener("hwScan", e => handScan(e && e.code)); } catch (e) {} window.addEventListener("load", syncHand); }

  /* Manifest photos read by the phone's own text reader (ML Kit, no internet) instead of the one inside the app: it
     stands in for that reader's worker, so the app's photo reading (close-ups, tidy-up, prefix list) is the same. If it
     fails, the app's own reader takes over. Settings › Android app can switch back to the app's own reader. */
  // Off by default: on the user's manifest photos (GitHub's virtual phone, 22 Nov 2026) it got 53 of 54 LPNs (it missed
  // V0013323651, which the app's own reader gets), so the app's own reader stays the default.
  const OCR_DEFAULT = false;
  const upper = t => String(t || "").toUpperCase().replace(/[^A-Z0-9:\s]/g, "");
  window.LPN_OCR = () => {
    if (!N() || typeof N().readText !== "function" || !pref("lpnapkocr", OCR_DEFAULT)) return null;
    let tw = null, params = {};
    const own = async () => { if (!tw) { tw = await Tesseract.createWorker("eng", 1, window.LPN_TESS); await tw.setParameters(params); } return tw; };
    return Promise.resolve({
      setParameters: async p => { params = Object.assign({}, params, p); if (tw) await tw.setParameters(p); },
      terminate: async () => { if (tw) { const t = tw; tw = null; await t.terminate(); } },
      recognize: async img => {
        if (tw) return tw.recognize(img);
        try {
          const url = img.toDataURL("image/jpeg", 0.95), r = await N().readText({ data: url.split(",")[1] });
          const words = (r.words || []).map(w => ({ text: upper(w.text).replace(/\s+/g, ""), bbox: { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 } })).filter(w => w.text);
          return { data: { text: upper(r.text), words } };
        } catch (e) { typeof diag === "function" && diag("ocr", "The phone's text reader failed (" + ((e && e.message) || e) + "), so the app's own reader was used."); return (await own()).recognize(img); }
      }
    });
  };
  /* The photo check on GitHub's virtual phone (tools/android/shots.sh): reads the manifest photos put in a test copy
     of the app and writes what was right, missing and extra to Documents › LPN Pallet Log › ocrtest.txt (one line per
     photo, then a "done" line), for the workflow to read. */
  async function ocrTest() {
    const lines = [];
    const log = async o => { lines.push(JSON.stringify(o)); try { await P().Filesystem.writeFile({ path: "LPN Pallet Log/ocrtest.txt", data: lines.join("\n") + "\n", directory: "DOCUMENTS", encoding: "utf8", recursive: true }); } catch (e) {} };
    const tot = { done: true, engine: window.LPN_OCR && window.LPN_OCR() ? "phone" : "app", right: 0, want: 0, missing: [], extra: [], ms: 0 };
    try {
      const exp = await (await fetch("ocrtest/expected.json")).json();
      for (const name of Object.keys(exp).filter(k => !k.startsWith("_"))) {
        const want = exp[name], blob = await (await fetch("ocrtest/" + name)).blob(), t0 = Date.now();
        let got = [];
        try { got = [...await readPhoto(new File([blob], name, { type: "image/jpeg" }))]; } catch (e) { await log({ name, error: String((e && e.message) || e) }); }
        const g = new Set(got), w = new Set(want), o = { name, ms: Date.now() - t0, right: want.filter(x => g.has(x)).length, of: want.length, missing: want.filter(x => !g.has(x)), extra: got.filter(x => !w.has(x)) };
        tot.right += o.right; tot.want += want.length; tot.missing.push(...o.missing); tot.extra.push(...o.extra); tot.ms += o.ms; await log(o);
      }
    } catch (e) { tot.error = String((e && e.message) || e); }
    await log(tot);
  }

  /* Start menu: the app opens on a menu to choose Log pallets or Manifest check, and each is its own page instead of
     one long page. "‹ Menu" at the top, or Back, goes back to the menu. Only while both are switched on and Simple view
     (which hides the Manifest check) is off; otherwise the app opens straight on the one that's there. */
  const menuOn = () => has("palletLog") && has("manifestCheck") && !(typeof cfg !== "undefined" && cfg && cfg.simple);
  let mode = "";
  const scrollAt = {};
  const menuCss = document.createElement("style");
  menuCss.textContent = "#apkMenu,#apkBar{display:none}"
    + "html.apkm-menu #apkMenu{display:block}html.apkm-log #apkBar,html.apkm-cmp #apkBar{display:flex}"
    + "html.apkm-menu main>.card:not(#apkMenu),html.apkm-menu #flash{display:none!important}"
    + "html.apkm-log #cmpCard{display:none!important}"
    + "html.apkm-cmp #delCard,html.apkm-cmp #entryCard,html.apkm-cmp #logCard{display:none!important}html.apkm-cmp #cmpCard{display:block!important}"
    + "html.apkm-cmp #cmpCard .chev{display:none}html.apkm-cmp #cmpToggle{cursor:default}"
    + "html.apkm-log #delCard,html.apkm-cmp #cmpCard{margin-top:0;border-top:0;padding-top:0}"
    + "html.apkm-menu main,html.apkm-cmp main{padding-bottom:40px}"
    + "#apkBar{align-items:center;gap:10px;margin:2px 0 14px}#apkBar button{min-height:44px;padding:8px 14px;font-weight:700}"
    + "#apkMenu{border-top:0!important;margin-top:0!important;padding-top:4px!important}#apkMenu h2{margin:4px 0 14px}"
    + "#apkMenu .apkgo{display:block;width:100%;text-align:left;padding:18px 18px 16px;margin:0 0 12px;border:2px solid var(--line,#35507f);border-radius:14px;background:var(--sel,#1a3562);min-height:88px}"
    + "#apkMenu .apkgo b{display:block;font-size:1.25rem;margin-bottom:4px}#apkMenu .apkgo span{display:block;color:var(--mu,#9db0d0);font-size:.95rem}"
    + "#apkMenu .apkgo.on{border-color:var(--ac,#ff8a2a)}#apkMenu .apkgo span.ip{color:var(--ink,#eaf0fa);font-weight:700}"
    + "#apkCarry{margin:-2px 0 14px}"
    + "#apkBar{position:sticky;top:0;z-index:12;background:var(--paper,#13264a);margin:-6px -18px 12px;padding:8px 18px;border-bottom:1px solid var(--line,#35507f)}"
    + "#apkBarHelp{margin-left:auto;flex:none;width:40px;height:40px;min-height:0;padding:0;border-radius:20px}"
    + "#apkBarT{font-weight:700;font-size:1.15rem;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
    + "html.apkm-log th{top:var(--apkbarh,60px)}html.apkm-cmp #cmpCard>.tglh{display:none}"
    + "#apkRecent h3{margin:18px 0 8px;font-size:1rem;color:var(--mu,#9db0d0)}#apkRecent .apkrec{display:block;width:100%;text-align:left;margin:0 0 8px;min-height:48px}"
    + "#apkRecent .apkrec span{color:var(--mu,#9db0d0);font-weight:400}"
    + ".apksub{margin:16px 0 6px;font-size:.95rem;color:var(--ac,#ff8a2a)}"
    + "#apkGlow{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2000;pointer-events:none;border:8px solid transparent;opacity:0;transition:opacity .35s}"
    + "#apkGlow.ok{border-color:#3ccf6e;opacity:1;transition:none}#apkGlow.warn{border-color:#ff9f1a;opacity:1;transition:none}"
    + "@media (prefers-reduced-motion:reduce){#apkGlow{transition:none}}"
    + "@keyframes apkin{from{transform:translateX(36px);opacity:.4}}@keyframes apkout{from{transform:translateX(-36px);opacity:.4}}"
    + "main.apkin{animation:apkin .2s ease-out}main.apkout{animation:apkout .2s ease-out}#apkBarT:focus{outline:none}"
    + "@media (prefers-reduced-motion:reduce){main.apkin,main.apkout{animation:none}}"
    + "@media (min-width:1100px){html.apkm-menu main,html.apkm-log main,html.apkm-cmp main{display:block;max-width:760px}}"; // one page at a time, not the wide two-column layout
  document.head.appendChild(menuCss);
  // No flash of the whole page before the menu: android.js runs before the app's own scripts, so the menu is put up
  // straight away (and taken down again if the settings leave only one part of the app).
  if (document.querySelector("main")) { buildMenu(); document.documentElement.classList.add("apkm-menu"); }
  function buildMenu() {
    const main = document.querySelector("main"); if (!main || $("apkMenu")) return;
    const m = document.createElement("div"); m.className = "card"; m.id = "apkMenu"; m.setAttribute("role", "region"); m.setAttribute("aria-labelledby", "apkMenuH");
    m.innerHTML = '<h2 id="apkMenuH">What do you want to do?</h2>'
      + '<button type="button" class="apkgo" id="apkGoLog"><b>Log pallets</b><span id="apkGoLogT"></span></button>'
      + '<div id="apkCarry" hidden><button type="button" class="p" id="apkCarryBtn">Carry on scanning</button></div>'
      + '<button type="button" class="apkgo" id="apkGoCmp"><b>Manifest check</b><span id="apkGoCmpT">Compare a delivery’s LPNs with the supplier’s manifest: what’s missing and what’s extra.</span></button>'
      + '<div id="apkRecent"></div>';
    const bar = document.createElement("div"); bar.id = "apkBar";
    bar.innerHTML = '<button type="button" id="apkBack" aria-label="Back to the menu">‹ Menu</button><h2 id="apkBarT"></h2><button type="button" class="helpq" id="apkBarHelp" aria-label="Help with the Manifest check" hidden>?</button>';
    main.prepend(bar); main.prepend(m);
    $("apkGoLog").onclick = () => setMode("log");
    $("apkGoCmp").onclick = () => setMode("cmp");
    $("apkCarryBtn").onclick = () => opened({ action: "scan" });
    $("apkBack").onclick = () => setMode("menu");
    // (the Manifest check's own heading, with its ?, is hidden under the title bar on its page)
    $("apkBarHelp").onclick = () => { const q = document.querySelector("#cmpCard .tglh .helpq, #cmpCard .helpq"); if (q) q.click(); };
    // On its own page the Manifest check stays open: its heading doesn't fold it away.
    // The log's keyboard shortcuts (1 to 4, F, /, Ctrl+Z) only on the log's page, where you can see what they change.
    document.addEventListener("keydown", e => { if (!mode || mode === "log") return; const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (/^[1-4fF/]$/.test(e.key) || (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey))) e.stopImmediatePropagation(); }, true);
    document.addEventListener("click", e => { if (mode === "cmp" && e.target.closest && e.target.closest("#cmpToggle") && !$("cmpBody").hidden) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  function updMenu() {
    const t = $("apkGoLogT"); if (!t) return;
    const n = typeof rows !== "undefined" ? rows.length : 0;
    t.textContent = n ? "Delivery in progress: " + countText() + "." : "Scan or type each pallet as it comes off the trailer, then export the log.";
    t.className = n ? "ip" : ""; $("apkGoLog").classList.toggle("on", !!n);
    $("apkCarry").hidden = !(n && has("liveScan"));
    // The last few saved deliveries (tap for Saved deliveries), and the way to the files made.
    const rc = $("apkRecent"), list = typeof hist !== "undefined" && Array.isArray(hist) ? hist.slice(0, 3) : [];
    const fmt = d => (typeof ukDate === "function" ? ukDate(d.date) : d.date) || "No date";
    rc.innerHTML = (list.length ? '<h3 id="apkRecH">Recent deliveries</h3>' : "") + '<div id="apkRecL"></div><div class="row"><button type="button" id="apkGoHist">Saved deliveries</button>' + (P() ? '<button type="button" id="apkGoFiles">Exported files</button>' : "") + "</div>";
    list.forEach(d => { const b = document.createElement("button"); b.type = "button"; b.className = "apkrec";
      const k = (d.rows || []).filter(r => !r.ref).length; b.innerHTML = "<b></b> <span></span>";
      b.firstChild.textContent = fmt(d) + " · " + (d.recv || "No name"); b.lastChild.textContent = "· " + k + (k === 1 ? " pallet" : " pallets");
      b.onclick = () => openHelp("history", "Saved deliveries"); $("apkRecL").appendChild(b); });
    $("apkGoHist").onclick = () => openHelp("history", "Saved deliveries");
    if ($("apkGoFiles")) $("apkGoFiles").onclick = () => showFiles();
  }
  function setMode(m) {
    const H = document.documentElement;
    if (!menuOn()) { mode = ""; H.classList.remove("apkm-menu", "apkm-log", "apkm-cmp"); return; }
    buildMenu();
    if (typeof closeHelp === "function" && m !== mode) closeHelp();
    const was = mode; if (was) scrollAt[was] = window.scrollY; mode = m;
    H.classList.toggle("apkm-menu", m === "menu"); H.classList.toggle("apkm-log", m === "log"); H.classList.toggle("apkm-cmp", m === "cmp");
    const body = $("cmpBody");
    if (m === "cmp" && body && body.hidden) $("cmpToggle").click();
    // (fold it on the log's page, or the page's own Manifest-focus mode would hide the entry bar)
    if (m === "log" && body && !body.hidden) $("cmpToggle").click();
    document.body.classList.remove("cmpfocus");
    const en = document.querySelector(".card.entry"); if (en) en.inert = m !== "log";
    if (m === "menu") updMenu();
    const bt = $("apkBarT"); if (bt) bt.textContent = m === "cmp" ? "Manifest check" : "Log pallets";
    if ($("apkBarHelp")) $("apkBarHelp").hidden = m !== "cmp" || !document.querySelector("#cmpCard .helpq");
    if (m !== "menu") requestAnimationFrame(() => { const b = $("apkBar"); if (b) H.style.setProperty("--apkbarh", b.offsetHeight + "px"); });
    if (m === "cmp") cmpDateShow();
    if (m !== was) {
      // Each page keeps its place: back on a page, it's where it was left (the menu always starts at the top).
      window.scrollTo(0, m === "menu" ? 0 : scrollAt[m] || 0);
      // Pages slide in from the side and back out to the menu, as in other Android apps (still with Remove animations on).
      const main = document.querySelector("main");
      if (main && was) { main.classList.remove("apkin", "apkout"); void main.offsetWidth; main.classList.add(m === "menu" ? "apkout" : "apkin"); }
      // TalkBack: a page says its name as it opens; back on the menu, focus is on the button you came from.
      if (was) {
        if (m === "menu") { const f = was === "cmp" ? $("apkGoCmp") : $("apkGoLog"); if (f) f.focus({ preventScroll: true }); }
        else { const t = $("apkBarT"); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }
      }
    }
  }
  window.LPN_APK_MODE = m => { if (m) setMode(m); return mode; };
  // (android.js loads before the app's own scripts, so this waits for them)
  document.addEventListener("DOMContentLoaded", () => {
    // Simple view switched on or off in Settings: the menu goes or comes back.
    if (typeof applySimple === "function") { const was = applySimple; applySimple = function () { const r = was.apply(this, arguments); if (menuOn() !== !!mode) setMode(menuOn() ? "menu" : ""); return r; }; }
    setMode("menu");
    cmpDateShow();
  });

  /* ---- A professional app's frame: an app bar with a ⋮ menu (Guide, Changelog, Settings, Exported files, About)
     instead of the row of three buttons; an About screen with the open-source licences; a short introduction on a
     first install; a progress bar with Cancel while photos or PDFs are read; a notification when photo reading
     finishes in the background; and Material-style corners throughout. */
  const proCss = document.createElement("style");
  proCss.textContent = ":root{--r:10px}#side{display:none!important}"
    + ".top .brand{position:relative}#apkMoreBtn{margin-left:auto;min-width:48px;min-height:48px;padding:0;font-size:1.6rem;line-height:1;border-radius:24px;background:transparent;border:0;color:var(--ink,#eaf0fa)}"
    + "#apkMore{position:fixed;z-index:1500;right:10px;min-width:220px;background:var(--paper,#13264a);border:1px solid var(--line,#35507f);border-radius:12px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,.45)}"
    + "#apkMore button{display:block;width:100%;text-align:left;border:0;border-radius:0;background:transparent;min-height:48px;padding:10px 18px;font-weight:400}"
    + "#apkMore button:focus-visible{outline:2px solid var(--ac,#ff8a2a);outline-offset:-2px}"
    + ".apksheet{border-radius:28px 28px 0 0!important}"
    + "#apkIntro{position:fixed;top:0;right:0;bottom:0;left:0;z-index:3000;background:var(--bg,#0c1830);display:flex;flex-direction:column;padding:calc(24px + env(safe-area-inset-top,0px)) 0 calc(18px + env(safe-area-inset-bottom,0px))}"
    + "#apkIntro .cards{flex:1;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}#apkIntro .cards::-webkit-scrollbar{display:none}"
    + "#apkIntro .cd{flex:0 0 100%;scroll-snap-align:center;padding:24px 28px;display:flex;flex-direction:column;justify-content:center;gap:14px}"
    + "#apkIntro .cd .ic{width:84px;height:84px;border-radius:24px;background:var(--ac,#ff8a2a);color:#1b1b1b;display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:700}"
    + "#apkIntro h2{margin:0;font-size:1.6rem}#apkIntro p{margin:0;color:var(--mu,#9db0d0);font-size:1.05rem;line-height:1.5}"
    + "#apkIntro .dots{display:flex;justify-content:center;gap:8px;margin:10px 0 16px}#apkIntro .dots i{width:8px;height:8px;border-radius:4px;background:var(--line,#35507f)}#apkIntro .dots i.on{width:22px;background:var(--ac,#ff8a2a)}"
    + "#apkIntro .row{display:flex;justify-content:space-between;padding:0 20px}#apkIntro .row button{min-height:48px;min-width:110px}"
    + "#apkProg{position:sticky;top:var(--apkbarh,60px);z-index:11;background:var(--paper,#13264a);margin:-12px -18px 12px;padding:10px 18px;border-bottom:1px solid var(--line,#35507f)}"
    + "#apkProg .t{display:flex;align-items:center;gap:10px;justify-content:space-between}#apkProg .t span{font-weight:700}#apkProg .t button{min-height:40px}"
    + "#apkProg .bar{height:6px;border-radius:3px;background:var(--line,#35507f);margin-top:8px;overflow:hidden}#apkProg .bar i{display:block;height:100%;width:0;background:var(--ac,#ff8a2a);transition:width .3s}"
    + "@media (prefers-reduced-motion:reduce){#apkProg .bar i{transition:none}}";
  document.head.appendChild(proCss);

  /* The ⋮ menu. */
  function moreClose(focusBtn) { const m = $("apkMore"); if (m) m.remove(); const b = $("apkMoreBtn"); if (b) { b.setAttribute("aria-expanded", "false"); if (focusBtn) b.focus(); } }
  function moreOpen() {
    if ($("apkMore")) { moreClose(true); return; }
    const b = $("apkMoreBtn"), r = b.getBoundingClientRect();
    const m = document.createElement("div"); m.id = "apkMore"; m.setAttribute("role", "menu"); m.style.top = Math.round(r.bottom + 4) + "px";
    const item = (label, fn) => { const x = document.createElement("button"); x.type = "button"; x.setAttribute("role", "menuitem"); x.textContent = label; x.onclick = () => { moreClose(false); fn(); }; m.appendChild(x); };
    item("Guide", () => $("btnGuide").click()); item("Changelog", () => $("btnLog").click()); item("Settings", () => $("btnSet").click());
    if (P()) item("Exported files", () => showFiles());
    item("About", about);
    document.body.appendChild(m); b.setAttribute("aria-expanded", "true"); m.querySelector("button").focus();
    m.addEventListener("keydown", e => { const it = [...m.querySelectorAll("button")], i = it.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); moreClose(true); } else if (e.key === "ArrowDown") { e.preventDefault(); it[(i + 1) % it.length].focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); } });
  }
  window.LPN_APK_MORE = () => $("apkMore") ? (moreClose(false), true) : false;
  document.addEventListener("pointerdown", e => { const m = $("apkMore"); if (m && !m.contains(e.target) && e.target !== $("apkMoreBtn")) moreClose(false); }, true);
  function addMoreBtn() {
    const brand = document.querySelector(".top .brand"); if (!brand || $("apkMoreBtn")) return;
    const b = document.createElement("button"); b.type = "button"; b.id = "apkMoreBtn"; b.textContent = "⋮"; b.setAttribute("aria-label", "More: Guide, Changelog, Settings, About");
    b.setAttribute("aria-haspopup", "menu"); b.setAttribute("aria-expanded", "false"); b.onclick = moreOpen; brand.appendChild(b);
  }
  if (document.querySelector(".top .brand")) addMoreBtn();

  /* About: version, privacy, and the open-source parts inside the app with their licences. */
  const LICENCES = [
    ["ExcelJS 4.4.0", "Excel files", "MIT"], ["jsPDF 2.5.1 and jsPDF-AutoTable 3.8.2", "PDF files", "MIT"], ["PDF.js 6.4.299", "reading PDFs", "Apache 2.0"],
    ["pdf-lib 1.17.1", "PDF files", "MIT"], ["Tesseract.js 5.1.1, with Tesseract and its English data", "reading photos", "Apache 2.0"],
    ["ZXing 0.21.3", "barcodes", "Apache 2.0"], ["Capacitor", "the Android app around the page", "MIT"], ["AndroidX and CameraX", "the camera scanner and Android parts", "Apache 2.0"],
    ["Google ML Kit (barcode and text reading)", "barcodes and the phone’s text reader", "ML Kit terms of service"], ["Atkinson Hyperlegible and IBM Plex Mono", "the fonts", "SIL Open Font Licence 1.1"]];
  function about() {
    if (typeof HELP === "undefined") return;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    HELP.apkabout = '<p><b>LPN Pallet Log</b>, the Android app. ' + esc(window.LPN_APK_VER || "") + '</p>'
      + '<p>Made by Jamie, for logging pallets at goods-in and checking them against the supplier’s manifest.</p>'
      + '<h3>Your data</h3><p>Everything stays on this phone: the log, saved deliveries, photos and exported files. The app works with no internet and sends nothing anywhere. A file only leaves the phone when you share, email or save it somewhere else yourself.</p>'
      + '<h3>Open-source parts</h3><p class="note">This app is built with these, under their licences:</p><ul>'
      + LICENCES.map(l => "<li><b>" + esc(l[0]) + "</b> (" + esc(l[1]) + "): " + esc(l[2]) + "</li>").join("") + "</ul>"
      + '<p class="note">MIT and Apache 2.0 allow use and sharing as long as the copyright and licence notices are kept; the full texts are at opensource.org.</p>';
    openHelp("apkabout", "About");
  }
  window.LPN_APK_ABOUT = about;

  /* A short introduction on a first install (three cards to swipe), instead of the website's welcome card. */
  function intro() {
    if ($("apkIntro")) return;
    const cards = [["✓", "Log every pallet", "Scan or type each LPN as it comes off the trailer, pick its type, and export the log as Excel or PDF."],
      ["☰", "Two parts, one menu", "The app opens on a menu: Log pallets, or Manifest check to compare a delivery with the supplier’s manifest. ‹ Menu or Back takes you back."],
      ["📷", "The camera", "The first time you scan, Android asks to use the camera: choose While using the app. Photos and logs stay on this phone."]];
    const d = document.createElement("div"); d.id = "apkIntro"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Welcome to LPN Pallet Log");
    d.innerHTML = '<div class="cards">' + cards.map((c, i) => '<section class="cd" aria-label="' + (i + 1) + ' of 3"><div class="ic" aria-hidden="true">' + c[0] + '</div><h2>' + c[1] + '</h2><p>' + c[2] + '</p></section>').join("") + '</div>'
      + '<div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div><div class="row"><button type="button" id="apkIntroSkip">Skip</button><button type="button" class="p" id="apkIntroNext">Next</button></div>';
    document.body.appendChild(d);
    const sc = d.querySelector(".cards"), dots = d.querySelectorAll(".dots i"), next = $("apkIntroNext");
    const at = () => Math.round(sc.scrollLeft / Math.max(1, sc.clientWidth));
    const upd = () => { const i = at(); dots.forEach((x, k) => x.classList.toggle("on", k === i)); next.textContent = i >= 2 ? "Get started" : "Next"; };
    const done = () => { try { localStorage.setItem("lpnapkintro", "seen"); } catch (e) {} d.remove(); const g = $("apkGoLog"); if (g) g.focus(); };
    sc.addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    next.onclick = () => { const i = at(); if (i >= 2) done(); else sc.scrollTo({ left: (i + 1) * sc.clientWidth, behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); };
    $("apkIntroSkip").onclick = done; next.focus();
  }
  window.LPN_APK_INTRO = intro;
  window.LPN_APK_INTRODONE = () => { const d = $("apkIntro"); if (d) { $("apkIntroSkip").click(); return true; } return false; };

  /* Progress while photos or PDFs are read (from the Manifest check's own messages), with Cancel for photos; and a
     notification if photo reading finishes while the app is in the background. */
  let ocrStop = false, progOn = false, progPhotos = false;
  function progress() {
    const m = $("cmpMsg"); if (!m) return;
    const t = m.textContent || "", k = /(?:Reading (log )?photo|Photo|PDF|reading page) (\d+) of (\d+)/i.exec(t);
    let p = $("apkProg");
    if (k) {
      if (!p) { p = document.createElement("div"); p.id = "apkProg"; p.setAttribute("role", "status");
        p.innerHTML = '<div class="t"><span></span><button type="button" id="apkProgStop">Cancel</button></div><div class="bar"><i></i></div>';
        const card = $("cmpCard"); (card || document.querySelector("main")).prepend(p);
        $("apkProgStop").onclick = () => { ocrStop = true; $("apkProgStop").disabled = true; p.querySelector("span").textContent = "Stopping after this photo…"; }; }
      const n = +k[2], of = +k[3], photo = /photo/i.test(k[0]) || /Photo/.test(k[0]);
      if (!ocrStop) p.querySelector("span").textContent = (photo ? "Reading photo " : /PDF/i.test(k[0]) ? "Reading PDF " : "Reading page ") + n + " of " + of;
      p.querySelector(".bar i").style.width = Math.round(((n - 1) / of) * 100 + 100 / of / 2) + "%";
      $("apkProgStop").hidden = !photo; if (photo && !progPhotos) { progPhotos = true; askNotifyOnce(); }
      progOn = true;
    } else if (progOn) {
      if (p) p.remove(); progOn = false;
      if (progPhotos && document.visibilityState === "hidden" && N() && typeof N().notify === "function")
        N().notify({ title: ocrStop ? "Photo reading stopped" : "Manifest photos read", text: t.slice(0, 300) || "Open the app to see what was found." }).catch(() => {});
      progPhotos = false; ocrStop = false;
    }
  }
  function askNotifyOnce() { let asked = null; try { asked = localStorage.getItem("lpnapknotify"); } catch (e) {} if (asked || !N() || typeof N().askNotify !== "function") return;
    try { localStorage.setItem("lpnapknotify", "asked"); } catch (e) {} N().askNotify().catch(() => {}); }
  document.addEventListener("DOMContentLoaded", () => {
    const m = $("cmpMsg"); if (m) new MutationObserver(progress).observe(m, { childList: true, characterData: true, subtree: true });
    // Cancel: the photos not started yet are skipped (the one being read finishes).
    if (typeof ocrLpns === "function") { const real = ocrLpns; ocrLpns = function (f) { if (ocrStop) return Promise.reject(new Error("stopped: you tapped Cancel")); return real.apply(this, arguments); }; }
    addMoreBtn();
    let seen = null; try { seen = localStorage.getItem("lpnapkintro"); } catch (e) {}
    const fresh = (typeof rows === "undefined" || !rows.length) && (typeof hist === "undefined" || !hist.length);
    if (!seen && fresh && N()) intro(); else if (!seen) { try { localStorage.setItem("lpnapkintro", "seen"); } catch (e) {} }
  });

  /* ---- Finishing touches: a "Saved" tick after each change, a friendly screen if something goes wrong, the app's
     status messages at the bottom when their own line is out of sight, and Next on the keyboard in Delivery. */
  const fin = document.createElement("style");
  fin.textContent = "#apkSavedTick{margin-left:auto;color:#3ccf6e;font-weight:700;font-size:.9rem;opacity:0;transition:opacity .3s;white-space:nowrap}"
    + "#apkSavedTick.on{opacity:1;transition:none}#apkBar #apkBarHelp{margin-left:10px}"
    + "@media (prefers-reduced-motion:reduce){#apkSavedTick{transition:none}}";
  document.head.appendChild(fin);
  let tickT = 0;
  function tick() {
    const bar = $("apkBar"); if (!bar || getComputedStyle(bar).display === "none") return;
    let t = $("apkSavedTick"); if (!t) { t = document.createElement("span"); t.id = "apkSavedTick"; t.setAttribute("aria-hidden", "true"); t.textContent = "✓ Saved"; const h = $("apkBarHelp"); bar.insertBefore(t, h || null); }
    clearTimeout(tickT); t.classList.add("on"); tickT = setTimeout(() => t.classList.remove("on"), 1200);
  }
  window.LPN_APK_TICK = tick;
  // Something unexpected went wrong: say so plainly (the log is already saved), with Try again and a problem report.
  let oopsAt = 0;
  function oops(what) {
    if (Date.now() - oopsAt < 30000 || document.querySelector(".apkask") || $("apkIntro")) return; oopsAt = Date.now();
    try { if (typeof diag === "function") diag("error", String(what).slice(0, 300)); } catch (e) {}
    ask("Something went wrong. Your log is safe on this phone.", [["Try again", () => location.reload()], ["Save problem report", () => { openHelp("settings", "Settings"); setTimeout(() => { const b = $("diagDl"); if (b) { b.scrollIntoView({ block: "center" }); b.click(); } }, 150); }]]);
  }
  window.LPN_APK_OOPS = oops;
  window.addEventListener("error", e => { if (e && e.error && !(e.target && e.target !== window && e.target.tagName)) oops((e.error && e.error.stack) || e.message); });
  window.addEventListener("unhandledrejection", e => { const r = e && e.reason; if (r && r instanceof Error && !/cancel|abort/i.test(r.message || "")) oops(r.stack || r.message); });
  document.addEventListener("DOMContentLoaded", () => {
    // The "Saved" tick after each change to the log or the delivery.
    if (typeof save === "function") { const real = save; save = function () { const r = real.apply(this, arguments); tick(); return r; }; }
    // The status line under the entry bar, when it can't be seen (on another page or scrolled away), also shows at the bottom.
    const m = $("msg"); if (m) new MutationObserver(() => { const t = (m.textContent || "").trim(); if (!t) return; const r = m.getBoundingClientRect();
      if (!m.getClientRects().length || r.bottom < 0 || r.top > innerHeight) toast(t); }).observe(m, { childList: true, characterData: true, subtree: true });
    // Delivery: Next on the keyboard goes to the next box; names start with a capital.
    const order = ["recv", "expect", "trailer", "sealIn", "sealOut", "notes"].map($).filter(Boolean);
    const r = $("recv"); if (r) r.setAttribute("autocapitalize", "words");
    order.forEach((el, i) => { el.setAttribute("enterkeyhint", i < order.length - 1 ? "next" : "done");
      if (el.tagName === "INPUT") el.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); const nx = order[i + 1]; if (nx) nx.focus(); else el.blur(); } }); });
  });

  /* Carry on: opening the app with a delivery in progress offers to go straight back to scanning. */
  function carryOn() {
    if (!N() || !has("palletLog") || !has("liveScan") || !rows.length || window.LPN_APK_NATIVESCAN || (typeof scanning !== "undefined" && scanning) || document.querySelector(".apkask") || ($("panel") && !$("panel").hidden)) return;
    ask("Delivery in progress: " + countText() + ".", [["Carry on scanning", () => opened({ action: "scan" })]]);
  }
  window.LPN_APK_CARRYON = carryOn;
  if (N()) window.addEventListener("load", () => setTimeout(() => { try { if (!mode) carryOn(); } catch (e) {} }, 1200));

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
