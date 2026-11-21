// penpen offline cache: keeps the app shell so it opens without internet.
const V = 'penpen-v5';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'boot.js', 'voice.js', 'icon.svg', 'icon-192.png',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com')) return;
  // network first for the page (fresh updates), cache fallback offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
