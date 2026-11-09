// Cambia la versión cada vez que subas cambios para que el iPhone descargue la nueva.
const V = 'armario-v2';
const LIBS = 'armario-libs'; // librería y modelo de quitar fondos (se guardan para usarlos sin conexión)
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== LIBS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r)));
  } else if (/(^|\.)jsdelivr\.net$|(^|\.)staticimgly\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(LIBS).then(async c => {
      const hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r);
      if (res.ok) c.put(r, res.clone());
      return res;
    }));
  }
});
