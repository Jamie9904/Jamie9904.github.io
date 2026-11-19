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
  window.LPN_APK_SAVE = async function (blob, name) {
    const kept = await keep(blob, name);
    say(kept ? "Saved " + name + " in Documents › LPN Pallet Log." : "");
    try { await P().Share.share({ title: name, files: [await toCache(blob, name)], dialogTitle: "Send or save " + name }); }
    catch (e) { if (!cancelled(e) && !kept) say("Couldn’t save " + name + ": " + ((e && e.message) || e)); }
  };

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
    + ".apkask{position:fixed;left:12px;right:12px;bottom:12px;z-index:1000;margin:0;box-shadow:0 6px 24px rgba(0,0,0,.4)}.apkask .apkasktitle{margin:0 0 10px;font-weight:700}";
  document.head.appendChild(css);
  let toastT = 0;
  function toast(t) {
    let e = $("apkToast");
    if (!e) { e = document.createElement("div"); e.id = "apkToast"; e.className = "apktoast"; e.setAttribute("role", "status"); e.setAttribute("aria-live", "polite"); document.body.appendChild(e); }
    e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3000);
  }
  window.LPN_APK_TOAST = toast;

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
        return ((r && r.barcodes) || []).map(b => ({ rawValue: b.rawValue, format: String(b.format) }));
      }
    };
    window.LPN_APK_MLKIT = true;
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
  function ask(title, choices) {
    const old = document.querySelector(".apkask"); if (old) old.remove();
    const d = document.createElement("div"); d.className = "apkask card"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", title);
    const h = document.createElement("p"); h.className = "apkasktitle"; h.textContent = title; d.appendChild(h);
    const row = document.createElement("div"); row.className = "row"; d.appendChild(row);
    choices.concat([["Cancel", null]]).forEach(([label, fn], i) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label; if (i === 0) b.className = "p";
      b.onclick = () => { d.remove(); if (fn) fn(); }; row.appendChild(b);
    });
    document.body.appendChild(d); row.querySelector("button").focus();
  }
  function opened(r) {
    if (!r) return;
    if (r.error) { toast(r.error); return; }
    if (r.action === "scan") {
      if (typeof closeHelp === "function") closeHelp();
      const id = has("liveScan") ? "scan" : has("scanByPhoto") ? "photo" : "";
      if (!id) { const l = $("lpn"); if (l) l.focus(); return; }
      const row = $("btnrow"), sb = $("scanBtn");
      if (row && sb && !sb.hidden && !row.classList.contains("open")) sb.click();
      $(id).click(); return;
    }
    if (r.action === "manifest") { openManifest(); return; }
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
  if (N()) {
    const take = async () => { try { opened(await N().takePending()); } catch (e) {} };
    try { N().addListener("opened", take); } catch (e) {}
    window.addEventListener("load", () => setTimeout(take, 300));
  }

  // Back: closes what's open (panels go back through the page's own history); on the main screen it asks first.
  if (A()) {
    let last = 0;
    try { A().addListener("backButton", ({ canGoBack }) => {
      const a = document.querySelector(".apkask"); if (a) { a.remove(); return; }
      if (canGoBack) { history.back(); return; }
      const sb = $("scanbox"); if (sb && !sb.hidden && typeof stopScan === "function") { stopScan(); return; }
      const now = Date.now();
      if (now - last < 2000) { A().exitApp(); return; }
      last = now; toast("Press Back again to close the app.");
    }); } catch (e) {}
    // Which Android build this is: in Settings and the footer.
    A().getInfo().then(i => {
      const v = "Android app: " + i.version; window.LPN_APK_VER = v;
      const f = $("verText"); if (f && !$("apkFoot")) { const s = document.createElement("span"); s.id = "apkFoot"; s.textContent = " · " + v; f.after(s); }
      const add = () => { if ($("panelTitle") && $("panelTitle").textContent === "Settings" && !$("apkVer")) { const p = document.createElement("p"); p.className = "note"; p.id = "apkVer"; p.textContent = v; $("panelBody").prepend(p); } };
      new MutationObserver(add).observe($("panelBody"), { childList: true }); add();
    }).catch(() => {});
  }
})();
