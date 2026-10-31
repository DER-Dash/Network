/* Firm Capacity service worker: lets both games open offline.
   Pages are fetched fresh from GitHub when online (so pushed changes arrive
   straight away) and fall back to the saved copy when offline or slow. */
const CACHE = 'firm-capacity-v1';
const CORE = ['./', './control-room/', './manifest.webmanifest', './control-room/manifest.webmanifest',
  './icons/gen-192.png', './icons/gen-512.png', './icons/cr-192.png', './icons/cr-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fromNetwork(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(req).then(res => { clearTimeout(t); resolve(res); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // Only this site's own files. The scoreboard, feedback and analytics always go to the network.
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/Network/')) return;
  const key = url.pathname.endsWith('/') || url.pathname.endsWith('.html') || req.mode === 'navigate'
    ? new Request(url.origin + url.pathname) : req; // ignore ?source=pwa and similar
  e.respondWith(
    fromNetwork(req, 4000).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key).then(hit => hit || caches.match(req)).then(hit => hit ||
      new Response('<h1>Offline</h1><p>Open the game once while online so it can be saved for offline play.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
  );
});
