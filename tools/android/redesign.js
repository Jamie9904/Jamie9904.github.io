/* LPN Pallet Log, Android app: the redesigned screens (put in by build-www.js after the app's own scripts, so the app
   and android.js are ready when it runs). Nothing is taken away: every part of the page keeps its id and still works
   (the checks and android.js use them); this changes how the parts look and where they sit, as in the redesign:
   - Home: today's date, the delivery in progress as one big card (count, the type split, Carry on scanning), the
     Manifest check as a row, recent deliveries, and a bar at the bottom (Home, Log, Check, Saved).
   - Log pallets: an app bar with Search, Export and ⋮ (This delivery: details, Share log, Undo, Start new delivery,
     Saved deliveries, Clear all); the delivery details open from there; the totals as a card; the entry panel at the
     bottom with the type, the LPN box, FSDU and Undo, and a big Live scan with a camera button for the other ways in.
   - Export: a sheet with Excel, Email PDF, Print and the blank tally sheet.
   - Manifest check: steps at the top (Log, Manifest, Results), the four ways to add a manifest as tiles, and the
     results as big numbers.
   - Settings: grouped cards with the switches on the right. Share log: Send and Add theirs as tabs.
   The website is unchanged: this file is only in the Android app. */
(function () {
  if (!window.LPN_APK_MODE || !document.querySelector("main")) return;
  const $ = id => document.getElementById(id);
  const has = k => typeof feat !== "function" || feat(k);
  const H = document.documentElement;
  H.classList.add("rd");
  const svg = (d, w) => '<svg width="' + (w || 22) + '" height="' + (w || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + "</svg>";
  const IC = {
    back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    home: '<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    down: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/>',
    cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    read: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 9h10"/><path d="M7 12h10"/><path d="M7 15h6"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    tally: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M21 14v7h-4"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    bin: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    nolpn: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h10v2"/><path d="M9 13h6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
  };

  /* ---- The look: rounder cards, quieter lines, bigger numbers. The app's own colours (Settings) still apply. ---- */
  const css = document.createElement("style");
  css.textContent = [
    // cards and surfaces
    "html.rd{--rd:20px}html.rd main>.card{border:0;border-radius:var(--rd);box-shadow:none}",
    "html.rd .num,html.rd .rdmono{font-family:'IBM Plex Mono',ui-monospace,monospace}",
    // ---- app bar on Log pallets and the Manifest check
    "html.rd #apkBar{gap:4px;padding:6px 8px 6px 6px;margin:-6px -18px 12px;border-bottom:0;background:var(--bg,#0c1830)}",
    "html.rd #apkBack{width:48px;height:48px;min-height:48px;padding:0;border:0;background:transparent;border-radius:24px;font-size:0;display:flex;align-items:center;justify-content:center;color:var(--ink,#eaf0fa)}",
    "html.rd #apkBack svg{width:24px;height:24px}html.rd #apkBarT{flex:1;font-size:1.25rem}",
    ".rdib{width:48px;height:48px;min-height:48px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:24px!important;display:flex;align-items:center;justify-content:center;color:var(--ink,#eaf0fa);flex:none}",
    ".rdib[aria-pressed=true]{background:var(--sel,#1a3562)!important}",
    "#rdExport{height:40px;min-height:40px!important;padding:0 14px!important;border-radius:20px!important;border:1px solid var(--ac,#ff8a2a)!important;background:transparent!important;color:var(--ac,#ff8a2a)!important;font-weight:700;display:flex;align-items:center;gap:6px;flex:none}",
    "#rdSearch,#rdExport,#rdMenuBtn{display:none}html.apkm-log #rdSearch,html.apkm-log #rdExport,html.apkm-log #rdMenuBtn{display:flex}",
    "html.rd.rd-nosearch #rdSearch{display:none!important}html.rd.rd-noexp #rdExport{display:none!important}",
    // ---- home
    "html.rd #apkMenu{background:transparent;padding:4px 0 0!important}",
    "#rdHead{display:flex;flex-direction:column;gap:2px;margin:0 2px 16px}#rdDate{color:var(--mu,#9db0d0);font-size:.95rem}",
    "html.rd #apkMenu #apkMenuH{margin:0;font-size:1.5rem}",
    "#rdDel{background:var(--paper,#13264a);border-radius:24px;padding:6px 6px 16px;margin:0 0 14px;box-shadow:0 12px 32px rgba(0,0,0,.28)}",
    "html.rd #apkMenu #rdDel .apkgo{background:transparent;border:0;margin:0;padding:16px 16px 4px;min-height:0;border-radius:18px}",
    "html.rd #apkMenu #rdDel .apkgo b{font-size:.95rem;font-weight:400;color:var(--mu,#9db0d0)}",
    "html.rd #apkMenu #rdDel .apkgo span.ip{display:none}",
    "html.rd #apkMenu #rdNumRow{display:flex;align-items:baseline;gap:10px;margin:6px 0 14px;color:var(--ink,#eaf0fa);font-size:inherit}html.rd #apkMenu #rdNum{display:inline;font-size:3.6rem;font-weight:700;line-height:1;color:var(--ink,#eaf0fa)}html.rd #apkMenu #rdNumL{display:inline;color:var(--mu,#9db0d0);font-size:1.1rem}",
    "html.rd #apkMenu #rdBar{display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px;margin:0 0 12px}#rdBar i{display:block;min-width:4px}",
    "html.rd #apkMenu #rdLeg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;font-size:.9rem;color:var(--ink,#eaf0fa)}html.rd #apkMenu #rdLeg span{display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:.9rem;color:var(--ink,#eaf0fa)}#rdLeg i{width:8px;height:8px;border-radius:4px;flex:none}",
    "html.rd #apkCarry{margin:12px 16px 0!important}html.rd #apkCarryBtn{width:100%;min-height:56px;border-radius:16px;font-size:1.1rem;display:flex;align-items:center;justify-content:center;gap:8px}",
    "#rdDel.empty #rdNumRow,#rdDel.empty #rdBar,#rdDel.empty #rdLeg{display:none}",
    "html.rd #apkMenu #rdDel.empty .apkgo b{font-size:1.25rem;font-weight:700;color:var(--ink,#eaf0fa)}",
    "html.rd #apkMenu #apkGoCmp{display:flex;align-items:center;gap:14px;border:0;background:var(--paper,#13264a);border-radius:20px;padding:16px 18px;min-height:80px}",
    "html.rd #apkMenu #apkGoCmp .rdic{width:48px;height:48px;border-radius:14px;background:var(--sel,#1a3562);color:var(--fm,#6fa8ff);display:flex;align-items:center;justify-content:center;flex:none}",
    "html.rd #apkMenu #apkGoCmp .rdtx{flex:1;min-width:0}html.rd #apkMenu #apkGoCmp .rdtx b{font-size:1.15rem}",
    "html.rd #apkMenu #apkGoCmp .rdch{color:var(--mu,#9db0d0);flex:none;display:flex}",
    "html.rd #apkRecent h3{margin:20px 2px 8px;font-size:1.1rem;color:var(--ink,#eaf0fa)}",
    "html.rd #apkRecL{background:var(--paper,#13264a);border-radius:20px;overflow:hidden}html.rd #apkRecL:empty{display:none}",
    "html.rd #apkRecent .apkrec{margin:0;border:0;border-radius:0;background:transparent;min-height:64px;padding:12px 18px;border-top:1px solid var(--rule,#223a63)}html.rd #apkRecent .apkrec:first-child{border-top:0}",
    "html.rd #apkRecent .row{margin-top:10px}",
    // bottom navigation (home)
    "#rdNav{display:none}html.rd.apkm-menu #rdNav{display:grid}",
    "#rdNav{position:fixed;left:0;right:0;bottom:0;z-index:35;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--paper,#13264a);padding:8px 8px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--rule,#223a63)}",
    "#rdNav button{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:transparent;color:var(--mu,#9db0d0);font-size:.8rem;min-height:56px;padding:0;border-radius:16px;font-weight:400}",
    "#rdNav button span{width:56px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center}",
    "#rdNav button[aria-current=page]{color:var(--ink,#eaf0fa);font-weight:700}#rdNav button[aria-current=page] span{background:var(--sel,#1a3562);color:var(--ac,#ff8a2a)}",
    "html.rd.apkm-menu main{padding-bottom:110px}html.rd.apkm-menu .foot{margin-bottom:84px}",
    // ---- log pallets: delivery details, the old button rows and the search live elsewhere now
    "html.rd.apkm-log #delCard{display:none}",
    "html.rd.rd-del #delCard{display:block!important;position:fixed;z-index:1200;left:0;right:0;top:0;bottom:0;margin:0!important;border-radius:0;overflow-y:auto;padding:0 18px calc(24px + env(safe-area-inset-bottom,0px))!important;background:var(--bg,#0c1830)}",
    "#rdDelHead{display:none}html.rd.rd-del #rdDelHead{display:flex;position:sticky;top:0;z-index:2;align-items:center;gap:4px;margin:0 -18px 12px;padding:calc(6px + env(safe-area-inset-top,0px)) 12px 6px 6px;background:var(--bg,#0c1830)}",
    "#rdDelHead h2{margin:0;flex:1;font-size:1.25rem}#rdDelHead h2:focus{outline:none}#rdDelDone{min-height:44px;padding:0 20px}",
    "html.rd.rd-del #delCard>.ct,html.rd.rd-del #delSum{display:none!important}",
    "html.rd.rd-del #delCard>*:not(#rdDelHead):not(.ct):not(#delSum){display:revert}",
    "html.rd.apkm-log #logCard>.row:has(#newDel),html.rd.apkm-log #logCard>.act{display:none}",
    "html.rd.apkm-log #logCard .flt{display:none}html.rd.apkm-log.rd-search #logCard .flt{display:flex}",
    "html.rd.apkm-log #logCard>.ct{display:none}",
    "html.rd.apkm-log #logCard{background:transparent;padding-top:0}",
    "html.rd.apkm-log #logCard #sum{background:var(--paper,#13264a);border-radius:20px;padding:14px 16px;margin-bottom:12px}",
    "html.rd #expMenu{display:none!important}",
    // the entry panel at the bottom
    "html.rd .card.entry{border-radius:28px 28px 0 0!important;box-shadow:0 -12px 32px rgba(0,0,0,.35)}",
    "html.rd .card.entry #scanBtn,html.rd .card.entry #btnrow,html.rd .card.entry #scanTip{display:none!important}",
    "#rdScanRow{display:flex;gap:8px;margin-top:10px}#rdScanRow[hidden]{display:none}",
    "#rdLive{flex:1;min-height:60px;border-radius:18px;font-size:1.15rem;display:flex;align-items:center;justify-content:center;gap:10px}",
    "#rdWays{width:60px;min-height:60px;padding:0;border-radius:18px;display:flex;align-items:center;justify-content:center;flex:none}",
    "html.rd .card.entry #tyb{background:var(--bg,#0c1830);border-radius:16px;padding:4px;gap:4px}",
    "html.rd .card.entry #tyb button{border:0;min-height:44px;border-radius:12px}",
    "html.rd .card.entry #tyb button:not(.on){background:transparent;color:var(--ink,#eaf0fa)}",
    "html.rd .card.entry #lpn{border-radius:14px}html.rd .card.entry #add{border-radius:14px}",
    // sheets (export, this delivery, more ways)
    ".rdsheet{padding:12px 16px calc(22px + env(safe-area-inset-bottom,0px))!important}",
    ".rdsheet .rdgrab{display:block;width:40px;height:4px;border-radius:2px;background:var(--line,#35507f);margin:0 auto 14px}",
    ".rdsheet h2{margin:0;font-size:1.35rem}.rdsheet .rdsub{margin:4px 0 16px;color:var(--mu,#9db0d0);font-size:.95rem}",
    ".rdtiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}",
    ".rdtiles button{min-height:96px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px 6px;font-size:.95rem;text-align:center;line-height:1.2}",
    ".rdrow{display:flex!important;align-items:center;gap:14px;width:100%;min-height:64px;border:0!important;border-radius:16px!important;background:transparent!important;padding:6px 8px!important;text-align:left;font-weight:400!important;color:var(--ink,#eaf0fa)}",
    ".rdrow .rdic{width:44px;height:44px;border-radius:12px;background:var(--bg,#0c1830);display:flex;align-items:center;justify-content:center;flex:none}",
    ".rdrow .rdtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rdrow .rdtx b{font-size:1rem}.rdrow .rdtx span{font-size:.85rem;color:var(--mu,#9db0d0)}",
    ".rdrow.hi{background:var(--sel,#1a3562)!important}.rdrow.hi .rdic{color:var(--ac,#ff8a2a)}.rdrow.d .rdic{color:var(--dg,#ff7b6e)}",
    ".rdline{height:1px;background:var(--rule,#223a63);margin:8px 0}",
    // ---- manifest check
    "#rdSteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;list-style:none;margin:0 0 16px;padding:0}",
    "#rdSteps li{display:flex;flex-direction:column;gap:6px;font-size:.85rem;color:var(--mu,#9db0d0)}#rdSteps li i{height:4px;border-radius:2px;background:var(--rule,#223a63)}",
    "#rdSteps li.done{color:var(--ink,#eaf0fa)}#rdSteps li.done i{background:#57d38c}#rdSteps li.now{color:var(--ink,#eaf0fa);font-weight:700}#rdSteps li.now i{background:var(--ac,#ff8a2a)}",
    "#rdSteps{display:none}html.apkm-cmp #rdSteps{display:grid}",
    "html.rd.apkm-cmp #cmpCard{background:transparent}",
    "html.rd #cmpCard .cmpsteps>.grow:last-child>.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
    "html.rd #cmpCard .cmpsteps>.grow:last-child>.row button{min-height:104px;border-radius:20px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;text-align:left;padding:14px 16px;margin:0;background:var(--sel,#1a3562);border:0}",
    "html.rd #cmpCard .cmpsteps>.grow:last-child>.row button .rdtic{color:var(--ac,#ff8a2a)}",
    "html.rd #cmpCard .cmpsteps>.grow:last-child>.row button:first-child{background:var(--ac,#ff8a2a);color:#1b1b1b}html.rd #cmpCard .cmpsteps>.grow:last-child>.row button:first-child .rdtic{color:inherit}",
    "html.rd #cmpCard .cmpsteps>.grow:last-child>.row button[hidden]{display:none}",
    "html.rd #cmpCard .cmpsteps>.grow:first-child>.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}html.rd #cmpCard .cmpsteps>.grow:first-child>.row>*{margin:0;min-height:52px;border-radius:14px}",
    "html.rd #cmpCard .cmpsteps>.grow:first-child>.row>select{grid-column:1/-1}",
    "html.rd #cmpCard .cmpsteps>.grow>label{font-size:1.1rem;font-weight:700;color:var(--ink,#eaf0fa);margin:8px 2px 10px}",
    "html.rd #cmpCheck{min-height:56px;border-radius:16px;font-size:1.05rem}",
    "html.rd #cmpRes .rdbig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;background:var(--paper,#13264a);border-radius:20px;padding:18px;margin:0 0 12px}",
    "html.rd #cmpRes .rdbig div{display:flex;flex-direction:column;gap:2px}html.rd #cmpRes .rdbig b{font-size:2.4rem;line-height:1}html.rd #cmpRes .rdbig span{font-size:.9rem;color:var(--mu,#9db0d0)}",
    "html.rd #cmpRes .rdbig .mi b{color:#ff9a85}html.rd #cmpRes .rdbig .ex b{color:#8cbcff}",
    // ---- settings and the other panels
    "html.rd #panel{border-radius:0;background:var(--bg,#0c1830)}",
    "html.rd #panelBody .rdgrp{background:var(--paper,#13264a);border-radius:20px;padding:14px 16px 10px;margin:0 0 16px}",
    "html.rd #panelBody .rdgrp h3:not(:first-child){margin:18px 0 8px;padding-top:14px;border-top:1px solid var(--rule,#223a63);font-size:.85rem;letter-spacing:.05em;text-transform:uppercase;color:var(--ac,#ff8a2a)}",
    "html.rd #panelBody .rdgrp>h3:first-child{margin:0 0 8px;font-size:.85rem;letter-spacing:.05em;text-transform:uppercase;color:var(--ac,#ff8a2a)}",
    "html.rd #panelBody label.chk{display:flex;flex-direction:row-reverse;justify-content:space-between;gap:14px;min-height:56px;padding:8px 0;border-top:1px solid var(--rule,#223a63);margin:0}",
    "html.rd #panelBody .rdgrp>h3+label.chk,html.rd #panelBody .rdgrp>h3+p+label.chk{border-top:0}",
    "html.rd #panelBody label.chk>input[type=checkbox]{margin:0!important;width:52px;height:32px;border-radius:16px}",
    "html.rd #panelBody label.chk>input[type=checkbox]::after{top:5px;left:5px;width:18px;height:18px}",
    "html.rd #panelBody label.chk>input[type=checkbox]:checked::after{transform:translateX(20px);background:#1b1b1b}",
    // Share log: Send and Add theirs as tabs
    "#rdTabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;background:var(--paper,#13264a);border-radius:16px;padding:4px;margin:4px 0 16px}",
    "#rdTabs button{min-height:48px;border:0;border-radius:12px;background:transparent;color:var(--ink,#eaf0fa);font-weight:400}#rdTabs button[aria-selected=true]{background:var(--ac,#ff8a2a);color:#1b1b1b;font-weight:700}",
    ".rdpane[hidden]{display:none!important}",
    "html.rd #panelBody .qrimg{background:#fff;border-radius:24px;padding:16px}"
  ].join("");
  document.head.appendChild(css);

  /* ---- Home ---- */
  const TYPES_C = [["BB", "--bb"], ["FMCG", "--fm"], ["FPP", "--fp"], ["Mixed", "--mx"]];
  function buildHome() {
    const m = $("apkMenu"); if (!m || $("rdDel")) return;
    const h = $("apkMenuH"); h.textContent = "Goods in";
    const head = document.createElement("div"); head.id = "rdHead"; head.innerHTML = '<span id="rdDate"></span>';
    m.insertBefore(head, h); head.appendChild(h);
    const del = document.createElement("section"); del.id = "rdDel"; del.setAttribute("aria-label", "Delivery in progress");
    m.insertBefore(del, $("apkGoLog")); del.appendChild($("apkGoLog")); del.appendChild($("apkCarry"));
    const go = $("apkGoLog");
    go.insertAdjacentHTML("beforeend", '<span id="rdNumRow" aria-hidden="true"><span id="rdNum" class="rdmono"></span><span id="rdNumL"></span></span><span id="rdBar" aria-hidden="true"></span><span id="rdLeg" aria-hidden="true"></span>');
    const cb = $("apkCarryBtn"); if (cb && !cb.querySelector("svg")) cb.insertAdjacentHTML("afterbegin", svg(IC.scan));
    const gc = $("apkGoCmp");
    if (gc && !gc.querySelector(".rdic")) {
      const b = gc.querySelector("b"), t = $("apkGoCmpT"); t.textContent = "What’s missing and what’s extra";
      const tx = document.createElement("span"); tx.className = "rdtx"; tx.appendChild(b); tx.appendChild(t);
      gc.insertAdjacentHTML("afterbegin", '<span class="rdic">' + svg(IC.check, 24) + "</span>"); gc.appendChild(tx);
      gc.insertAdjacentHTML("beforeend", '<span class="rdch">' + svg(IC.chev, 20) + "</span>");
    }
    // The bar at the bottom of Home
    const nav = document.createElement("nav"); nav.id = "rdNav"; nav.setAttribute("aria-label", "Main");
    const navB = (label, ic, fn, cur) => { const b = document.createElement("button"); b.type = "button"; b.innerHTML = "<span>" + svg(ic) + "</span>" + label; b.onclick = fn; if (cur) b.setAttribute("aria-current", "page"); nav.appendChild(b); return b; };
    navB("Home", IC.home, () => LPN_APK_MODE("menu"), true);
    if (has("palletLog")) navB("Log", IC.list, () => LPN_APK_MODE("log"));
    if (has("manifestCheck")) navB("Check", IC.check, () => LPN_APK_MODE("cmp"));
    navB("Saved", IC.folder, () => openHelp("history", "Saved deliveries"));
    nav.style.gridTemplateColumns = "repeat(" + nav.children.length + ",minmax(0,1fr))";
    document.body.appendChild(nav);
    new MutationObserver(updHome).observe($("apkGoLogT"), { childList: true, characterData: true, subtree: true });
    updHome();
  }
  function updHome() {
    const n = typeof rows !== "undefined" ? rows.filter(r => !r.ref).length : 0, all = typeof rows !== "undefined" ? rows : [];
    const d = $("rdDate"); if (d) d.textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const del = $("rdDel"); if (!del) return; del.classList.toggle("empty", !all.length);
    const go = $("apkGoLog"), b = go.querySelector("b");
    const tr = ($("trailer") && $("trailer").value || "").trim();
    if (b) b.textContent = all.length ? "Delivery in progress" + (tr ? " · " + tr : "") : "Log pallets";
    $("rdNum").textContent = n;
    const ex = parseInt(($("expect") || {}).value, 10);
    $("rdNumL").textContent = (n === 1 ? "pallet" : "pallets") + (ex > 0 ? " of " + ex + " expected" : " logged");
    const cs = getComputedStyle(H), cnt = TYPES_C.map(([t]) => all.filter(r => r.type === t && !r.ref).length);
    $("rdBar").innerHTML = TYPES_C.map(([t, v], i) => cnt[i] ? '<i style="flex:' + cnt[i] + ";background:" + cs.getPropertyValue(v).trim() + '"></i>' : "").join("");
    $("rdLeg").innerHTML = TYPES_C.map(([t, v], i) => '<span><i style="background:' + cs.getPropertyValue(v).trim() + '"></i>' + t + " " + cnt[i] + "</span>").join("");
    go.setAttribute("aria-label", all.length ? "Log pallets: delivery in progress, " + n + " " + (n === 1 ? "pallet" : "pallets") + (ex > 0 ? " of " + ex : "") : "Log pallets");
  }

  /* ---- Log pallets: the app bar's Search, Export and ⋮ ---- */
  function buildBar() {
    const bar = $("apkBar"); if (!bar || $("rdMenuBtn")) return;
    const bk = $("apkBack"); bk.innerHTML = svg(IC.back, 24); // (its label stays "Back to the menu")
    const mk = (id, html, label, fn) => { const b = document.createElement("button"); b.type = "button"; b.id = id; b.innerHTML = html; if (label) b.setAttribute("aria-label", label); b.onclick = fn; return b; };
    const help = $("apkBarHelp");
    const s = mk("rdSearch", svg(IC.search), "Search pallets", () => { const on = !H.classList.contains("rd-search"); H.classList.toggle("rd-search", on); s.setAttribute("aria-pressed", on); if (on) { const f = $("flt"); if (f) f.focus(); } else { const f = $("flt"); if (f && f.value) { f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); if (typeof render === "function") render(); } } });
    s.className = "rdib"; s.setAttribute("aria-pressed", "false");
    const e = mk("rdExport", svg(IC.down, 18) + "Export", null, exportSheet);
    const mb = mk("rdMenuBtn", svg(IC.more, 24), "This delivery: details, Share log, new delivery", deliverySheet); mb.className = "rdib"; mb.setAttribute("aria-haspopup", "dialog");
    bar.insertBefore(s, help); bar.insertBefore(e, help); bar.insertBefore(mb, help);
  }
  // Search only when the app has it (Simple view hides it), Export only with pallets to export.
  function syncBar() {
    const flt = document.querySelector("#logCard .flt"), simple = typeof cfg !== "undefined" && cfg.simple;
    H.classList.toggle("rd-nosearch", !flt || !!simple);
    if (simple) H.classList.remove("rd-search");
    const eb = $("expBtn"); H.classList.toggle("rd-noexp", !eb || eb.hidden);
  }

  /* A bottom sheet (the same kind as android.js's questions, so Back and a tap outside close it). */
  function sheet(label, build) {
    const old = document.querySelector(".apkask"); if (old) old.remove();
    const d = document.createElement("div"); d.className = "apkask"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", label);
    const s = document.createElement("div"); s.className = "apksheet card rdsheet"; d.appendChild(s);
    s.innerHTML = '<span class="rdgrab" aria-hidden="true"></span>';
    d.addEventListener("click", ev => { if (ev.target === d) d.remove(); });
    d.addEventListener("keydown", ev => { if (ev.key === "Escape") { ev.preventDefault(); d.remove(); } });
    build(s, () => d.remove());
    document.body.appendChild(d);
    const f = s.querySelector("button"); if (f) f.focus();
    return d;
  }
  const rowBtn = (ic, title, sub, fn, cls) => { const b = document.createElement("button"); b.type = "button"; b.className = "rdrow" + (cls ? " " + cls : "");
    b.innerHTML = '<span class="rdic">' + svg(ic) + '</span><span class="rdtx"><b></b><span></span></span>' + svg(IC.chev, 18);
    b.querySelector("b").textContent = title; b.querySelector(".rdtx span").textContent = sub || ""; b.onclick = fn; return b; };
  const real = id => { const e = $(id); return e && !e.hidden; };

  function deliverySheet() {
    const n = typeof rows !== "undefined" ? rows.length : 0, tr = ($("trailer").value || "").trim(), d = ($("date").value || "");
    sheet("This delivery", (s, close) => {
      s.insertAdjacentHTML("beforeend", '<h2>This delivery</h2><p class="rdsub"></p>');
      s.querySelector(".rdsub").textContent = [n + (n === 1 ? " pallet" : " pallets"), tr, typeof ukDate === "function" ? ukDate(d) : d].filter(Boolean).join(" · ");
      const go = (fn) => () => { close(); fn(); };
      s.appendChild(rowBtn(IC.truck, "Delivery details", "Date, received by, trailer, seals, expected pallets, notes", go(openDel)));
      if (real("phonesBtn") && has("twoPhones")) s.appendChild(rowBtn(IC.qr, "Share log", "Two people on one trailer? Put all the pallets on one phone", go(() => $("phonesBtn").click()), "hi"));
      if (real("undoMore")) s.appendChild(rowBtn(IC.undo, "Undo", "Goes back through the last 10 changes", go(() => $("undoMore").click())));
      s.appendChild(rowBtn(IC.plus, "Start new delivery", "Keeps this one in Saved deliveries", go(() => $("newDel").click())));
      s.appendChild(rowBtn(IC.folder, "Saved deliveries", has("findLpn") ? "Earlier deliveries and Find an LPN" : "Earlier deliveries", go(() => $("histBtn").click())));
      if (n) { s.insertAdjacentHTML("beforeend", '<div class="rdline"></div>'); s.appendChild(rowBtn(IC.bin, "Clear all", "Empties this log (asks first)", go(() => $("clear").click()), "d")); }
    });
  }
  /* Delivery details: the Delivery card, full screen, with Done (Back closes it too). */
  function openDel() {
    const c = $("delCard"); if (!c) return;
    if (!$("rdDelHead")) {
      const h = document.createElement("div"); h.id = "rdDelHead";
      h.innerHTML = '<button type="button" class="rdib" id="rdDelBack" aria-label="Close delivery details">' + svg(IC.back, 24) + '</button><h2 id="rdDelT" tabindex="-1">Delivery details</h2><button type="button" class="p" id="rdDelDone">Done</button>';
      c.prepend(h); $("rdDelBack").onclick = closeDel; $("rdDelDone").onclick = closeDel;
      c.addEventListener("keydown", ev => { if (ev.key === "Escape" && H.classList.contains("rd-del")) { ev.preventDefault(); closeDel(); } });
    }
    if (typeof delCollapsed !== "undefined" && delCollapsed) { const s = $("delSum"); if (s) s.click(); }
    c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.setAttribute("aria-labelledby", "rdDelT");
    H.classList.add("rd-del"); c.scrollTop = 0; $("rdDelT").focus({ preventScroll: true });
  }
  function closeDel() {
    if (!H.classList.contains("rd-del")) return;
    const c = $("delCard"); H.classList.remove("rd-del"); if (c) { c.removeAttribute("role"); c.removeAttribute("aria-modal"); c.removeAttribute("aria-labelledby"); }
    const b = $("rdMenuBtn"); if (b) b.focus({ preventScroll: true });
    if (typeof updateDel === "function") updateDel();
  }
  // Back (android.js asks LPN_APK_MORE first): closes the delivery details before anything else.
  const moreWas = window.LPN_APK_MORE;
  window.LPN_APK_MORE = () => { if (H.classList.contains("rd-del")) { closeDel(); return true; } return moreWas ? moreWas() : false; };
  window.LPN_APK_DELDETAILS = (on) => { if (on === false) closeDel(); else if (on) openDel(); return H.classList.contains("rd-del"); };

  /* Export: one sheet instead of the menu under the log. */
  function exportSheet() {
    const n = typeof rows !== "undefined" ? rows.length : 0, tr = ($("trailer").value || "").trim();
    sheet("Export", (s, close) => {
      s.insertAdjacentHTML("beforeend", '<h2></h2><p class="rdsub"></p><div class="rdtiles"></div>');
      s.querySelector("h2").textContent = "Export " + n + (n === 1 ? " pallet" : " pallets");
      s.querySelector(".rdsub").textContent = [tr, typeof ukDate === "function" ? ukDate($("date").value) : "", ($("recv").value || "").trim() ? "received by " + $("recv").value.trim() : ""].filter(Boolean).join(" · ");
      const t = s.querySelector(".rdtiles");
      const tile = (ic, label, id, p) => { if (!real(id)) return; const b = document.createElement("button"); b.type = "button"; if (p) b.className = "p"; b.innerHTML = svg(ic, 26) + "<span></span>"; b.querySelector("span").textContent = label; b.onclick = () => { close(); $(id).click(); }; t.appendChild(b); };
      tile(IC.sheet, "Excel", "dl", true); tile(IC.file, "Email PDF", "dlMail"); tile(IC.print, "Print", "prn");
      if (!t.children.length) t.remove();
      if (real("tallyBtn") && has("tallySheet")) { s.insertAdjacentHTML("beforeend", '<div class="rdline"></div>'); s.appendChild(rowBtn(IC.tally, "Blank tally sheet", "A paper sheet to fill in by hand", () => { close(); $("tallyBtn").click(); })); }
    });
  }

  /* The entry panel: Live scan as one big button, and a camera button for Scan by photo, Upload photo and No LPN. */
  function buildEntry() {
    const en = $("entryCard"); if (!en || $("rdScanRow")) return;
    const row = document.createElement("div"); row.id = "rdScanRow";
    row.innerHTML = '<button type="button" class="p" id="rdLive">' + svg(IC.scan, 24) + 'Live scan</button><button type="button" id="rdWays" aria-label="More ways to add a pallet: scan by photo, upload photo, no LPN" aria-haspopup="dialog">' + svg(IC.cam, 24) + "</button>";
    const anchor = $("chkBar") || $("scanbox"); en.insertBefore(row, anchor);
    $("rdLive").onclick = () => { if (typeof LPN_APK_OPENED === "function") LPN_APK_OPENED({ action: "scan" }); else $("scan").click(); };
    $("rdWays").onclick = () => sheet("More ways to add a pallet", (s, close) => {
      s.insertAdjacentHTML("beforeend", "<h2>Add a pallet</h2><p class=\"rdsub\">Other ways in, besides Live scan and typing</p>");
      const w = (id, ic, title, sub) => { if (real(id) && getComputedStyle($(id)).display !== "none") s.appendChild(rowBtn(ic, title, sub, () => { close(); $(id).click(); })); };
      w("photo", IC.cam, "Scan by photo", "Take a photo of the label"); w("upload", IC.img, "Upload photo", "Photos already taken");
      w("noLpn", IC.nolpn, "No LPN", "A pallet that arrived without one");
    });
    syncEntry();
  }
  function syncEntry() {
    const live = $("scan"), ok = id => { const e = $(id); return e && !e.hidden && getComputedStyle(e).display !== "none"; };
    const row = $("rdScanRow"); if (!row) return;
    $("rdLive").hidden = !ok("scan");
    $("rdWays").hidden = !["photo", "upload", "noLpn"].some(ok);
    row.hidden = $("rdLive").hidden && $("rdWays").hidden;
    if ($("rdLive").hidden) $("rdWays").style.flex = "1";
  }

  /* ---- Manifest check: steps, tiles and big numbers ---- */
  function buildCmp() {
    const body = $("cmpBody"); if (!body || $("rdSteps")) return;
    const st = document.createElement("ol"); st.id = "rdSteps"; st.setAttribute("aria-label", "Steps");
    st.innerHTML = '<li id="rdS1"><i></i>1 · Log</li><li id="rdS2"><i></i>2 · Manifest</li><li id="rdS3"><i></i>3 · Results</li>';
    body.prepend(st);
    const tic = { apkLiveRead: IC.read, cmpCamBtn: IC.cam, cmpPhotoBtn: IC.img, cmpPdfBtn: IC.file };
    const short = { apkLiveRead: "Live read", cmpCamBtn: "Take photo", cmpPhotoBtn: "Photos", cmpPdfBtn: "PDF" };
    const sub = { apkLiveRead: "Move down the page", cmpCamBtn: "One page at a time", cmpPhotoBtn: "Already taken", cmpPdfBtn: "From email" };
    const tiles = () => Object.keys(tic).forEach(id => { const b = $(id); if (!b || b.dataset.rd) return; b.dataset.rd = "1";
      const label = b.textContent.trim(); b.setAttribute("aria-label", label);
      b.innerHTML = '<span class="rdtic">' + svg(tic[id], 28) + '</span><span><b style="display:block;font-size:1.05rem"></b><span style="font-size:.85rem;font-weight:400;opacity:.85"></span></span>';
      b.querySelector("b").textContent = short[id]; b.querySelector("span>span").textContent = sub[id]; });
    tiles(); setTimeout(tiles, 0);
    ["cmpLogNums", "cmpNums"].forEach(id => { const e = $(id); if (e) e.addEventListener("input", syncSteps); });
    const res = $("cmpRes"); if (res) new MutationObserver(() => { bigResults(); syncSteps(); }).observe(res, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    syncSteps();
  }
  const lines = id => (($(id) || {}).value || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean).length;
  function syncSteps() {
    const a = lines("cmpLogNums") > 0, b = lines("cmpNums") > 0, r = $("cmpRes") && !$("cmpRes").hidden;
    const set = (id, done, now) => { const e = $(id); if (!e) return; e.className = done ? "done" : now ? "now" : ""; if (now) e.setAttribute("aria-current", "step"); else e.removeAttribute("aria-current"); };
    set("rdS1", a, !a); set("rdS2", b, a && !b); set("rdS3", r, a && b && !r);
  }
  // The results: the counts as three big numbers above the lists (the lists and their wording are the app's own).
  function bigResults() {
    const res = $("cmpRes"); if (!res || res.hidden || res.querySelector(".rdbig")) return;
    const txt = res.textContent;
    const num = re => { const m = re.exec(txt); return m ? +m[1] : null; };
    const mi = num(/(\d+)\s+missing/i), ex = num(/(\d+)\s+extra/i), ma = num(/(\d+)\s+(?:matched|found|on both)/i);
    if (mi === null && ex === null) return;
    const d = document.createElement("div"); d.className = "rdbig"; d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<div class="mi"><b class="rdmono"></b><span>Missing</span></div><div class="ex"><b class="rdmono"></b><span>Extra</span></div><div><b class="rdmono"></b><span>Matched</span></div>';
    const bs = d.querySelectorAll("b"); bs[0].textContent = mi === null ? "0" : mi; bs[1].textContent = ex === null ? "0" : ex; bs[2].textContent = ma === null ? "–" : ma;
    res.prepend(d);
  }

  /* ---- Settings in grouped cards; Share log as two tabs ---- */
  function groupPanel() {
    const pb = $("panelBody"); if (!pb || pb.dataset.rdg === pb.innerHTML.length + "") return;
    const kids = [...pb.children]; if (!kids.some(k => k.tagName === "H3")) return;
    const t = ($("panelTitle") || {}).textContent || "";
    if (/share the log/i.test(t)) { tabs(pb); pb.dataset.rdg = pb.innerHTML.length + ""; return; }
    if (!/settings/i.test(t)) return;
    let grp = null;
    kids.forEach(k => {
      if (k.tagName === "H3") { grp = document.createElement("div"); grp.className = "rdgrp"; pb.insertBefore(grp, k); }
      if (grp) grp.appendChild(k);
    });
    pb.dataset.rdg = pb.innerHTML.length + "";
  }
  function tabs(pb) {
    if ($("rdTabs")) return;
    const kids = [...pb.children], h = kids.filter(k => k.tagName === "H3"); if (h.length < 2) return;
    const panes = [document.createElement("div"), document.createElement("div")];
    panes.forEach((p, i) => { p.className = "rdpane"; p.id = "rdPane" + i; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "rdTab" + i); });
    let cur = -1; const lead = [];
    kids.forEach(k => { if (k === h[0]) cur = 0; else if (k === h[1]) cur = 1; if (cur < 0) lead.push(k); else panes[cur].appendChild(k); });
    const bar = document.createElement("div"); bar.id = "rdTabs"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Send or add");
    ["Send my pallets", "Add theirs"].forEach((label, i) => { const b = document.createElement("button"); b.type = "button"; b.id = "rdTab" + i; b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "rdPane" + i); b.textContent = label;
      b.onclick = () => pick(i); bar.appendChild(b); });
    const after = lead[lead.length - 1]; if (after) after.after(bar); else pb.prepend(bar);
    bar.after(panes[0]); panes[0].after(panes[1]);
    h.forEach(x => { x.classList.add("sr"); });
    function pick(i) { [0, 1].forEach(j => { const on = i === j; $("rdTab" + j).setAttribute("aria-selected", on); $("rdTab" + j).tabIndex = on ? 0 : -1; panes[j].hidden = !on; }); }
    bar.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const i = $("rdTab0").getAttribute("aria-selected") === "true" ? 1 : 0; pick(i); $("rdTab" + i).focus(); } });
    pick(0);
  }

  window.LPN_APK_EXPORTSHEET = exportSheet; window.LPN_APK_DELSHEET = deliverySheet;
  function start() {
    buildHome(); buildBar(); buildEntry(); buildCmp(); syncBar(); updHome();
    // Keep up with the app: pallets added or removed, settings changed, panels opened.
    if (typeof render === "function" && !render.rd) { const r = render; render = function () { const x = r.apply(this, arguments); try { updHome(); syncBar(); } catch (e) {} return x; }; render.rd = true; }
    if (typeof applySite === "function" && !applySite.rd) { const a = applySite; applySite = function () { const x = a.apply(this, arguments); try { syncBar(); syncEntry(); } catch (e) {} return x; }; applySite.rd = true; }
    if (typeof applySimple === "function" && !applySimple.rd) { const a = applySimple; applySimple = function () { const x = a.apply(this, arguments); try { syncBar(); syncEntry(); } catch (e) {} return x; }; applySimple.rd = true; }
    const pb = $("panelBody"); if (pb) new MutationObserver(() => { try { groupPanel(); } catch (e) {} }).observe(pb, { childList: true });
    const was = window.LPN_APK_MODE;
    window.LPN_APK_MODE = m => { const r = was(m); if (m && m !== "log") H.classList.remove("rd-search"); if (m) { closeDel(); updHome(); syncSteps(); } return r; };
    const nb = $("rdNav"); if (nb) nb.hidden = false;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
