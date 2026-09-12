/* Service worker: makes the site installable and usable without a connection.
   Bump CACHE whenever the shell file list below changes. */
const CACHE = "training-v1";
const SHELL = [
  "./",
  "./index.html",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.ico",
  "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      /* one bad URL must not fail the whole install */
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
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
  /* YouTube and Google Fonts go straight to the network — never cached here */
  if (new URL(req.url).origin !== location.origin) return;

  /* The page itself: network first, so an update is picked up as soon as
     there is a connection, with the cached copy as the offline fallback. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* Icons and the manifest: cache first, they rarely change. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
