const CACHE="lpn-log-v14";
const LIBS="lpn-libs-v1";
const SHELL=["./","index.html","styles.css","core.js","scan.js","export.js","compare.js","panels.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];
// Libraries and fonts the app loads from these hosts are saved the first time they load, so Excel, PDF, print and the manifest check keep working offline.
const CDN=["cdnjs.cloudflare.com","cdn.jsdelivr.net","unpkg.com","fonts.googleapis.com","fonts.gstatic.com","tessdata.projectnaptha.com"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
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
        if(res.ok||res.type==="opaque")c.put(req,res.clone());
        return res;
      }catch(err){return Response.error()}
    }));
    return;
  }
  // Network first for the app itself, so updates show up when online; falls back to the saved copy when offline.
  e.respondWith(
    fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match("index.html")))
  );
});
