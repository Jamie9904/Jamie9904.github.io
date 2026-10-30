const CACHE="lpn-log-v30";
// v2: only complete, checkable downloads are kept (v1 could keep a failed one), so v1 is cleared once.
const LIBS="lpn-libs-v2";
const SHELL=["./","index.html","sw.js","styles.css","core.js","scan.js","export.js","compare.js","panels.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","fonts/AtkinsonHyperlegible-Regular.woff2","fonts/AtkinsonHyperlegible-Bold.woff2","fonts/IBMPlexMono-Regular.woff2","fonts/IBMPlexMono-Medium.woff2","fonts/IBMPlexMono-SemiBold.woff2"];
// Libraries the app loads from these hosts are saved the first time they load, so Excel, PDF, print and the manifest check keep working offline.
const CDN=["cdnjs.cloudflare.com","cdn.jsdelivr.net","unpkg.com","tessdata.projectnaptha.com"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==LIBS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const u=new URL(req.url);
  if(u.origin!==location.origin){
    if(CDN.indexOf(u.hostname)<0)return;
    // Library files never change at a given address, so use the saved copy first.
    e.respondWith(caches.open(LIBS).then(async c=>{
      const hit=await c.match(req);
      if(hit)return hit;
      try{
        const res=await fetch(req);
        // Only complete downloads are saved. The photo reader's worker files can only be fetched unchecked (opaque);
        // those are kept too, and the app clears them if the reader fails to start.
        if(res.ok||(res.type==="opaque"&&/tesseract|tessdata/.test(u.href)))c.put(req,res.clone());
        return res;
      }catch(err){return Response.error()}
    }));
    return;
  }
  // Network first for the app itself, so updates show up when online; falls back to the saved copy when offline.
  e.respondWith(
    fetch(req,{cache:"no-cache"}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match("index.html")))
  );
});
