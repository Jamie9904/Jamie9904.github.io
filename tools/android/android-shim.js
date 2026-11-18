/* Android app (offline copy) only. tools/android/build-www.js adds this file as android.js; it is not part of the website.
   Inside the Android app a page can't download files or use the browser's share menu, so:
   - saving a file (Excel, PDF, backup…) keeps a copy in Documents › LPN Pallet Log, then opens Android's share menu
     (to email it, put it in Drive, or send it to a printer app);
   - sharing (Email PDF, Share missing list…) uses Android's share menu. */
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
})();
