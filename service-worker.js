const CACHE = 'ledger-cache-v7';
const ASSETS = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the app shell (index.html, manifest, this script) so updates
// show up immediately. Falls back to cache only when offline. Icons/fonts still
// cache normally since they rarely change and offline support matters more there.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAppShell = url.origin === self.location.origin;

  if (isAppShell) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Third-party assets (fonts, icon css, xlsx library): cache-first, network fallback
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => cached))
    );
  }
});
