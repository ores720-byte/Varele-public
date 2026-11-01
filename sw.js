// Varèle service worker: lets the store open offline-friendly and load fast.
// Live data (Supabase, payments, other sites) is never cached.
const CACHE = "varele-shell-v2";
const SHELL = ["./", "./index.html", "./assets/manifest.json", "./varele-icon-192.png", "./varele-icon-512.png", "./varele-apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle files from this store, never the database or other sites
  if (url.origin !== self.location.origin) return;

  // Pages: try the network first so customers always get the latest store, fall back to the saved copy
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Images and other files: serve from the saved copy when there is one
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
