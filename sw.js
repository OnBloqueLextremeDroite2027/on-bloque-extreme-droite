// Change VERSION à chaque mise en ligne pour que les téléphones récupèrent la nouvelle version.
const VERSION = 'obed-v18';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'comptes.js', 'greenlist.js', 'maj.js', 'manifest.webmanifest', 'mentions-legales.html', 'legal.js',
               'fonts/dm-sans.woff2', 'favicon.ico', 'images/ecran-lancement.webp',
               'icons/logo-192.png', 'icons/logo-512.png', 'icons/logo-maskable-512.png', 'icons/logo-180.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  // cache: 'reload' : on prend les fichiers sur le serveur, jamais une vieille copie du navigateur.
  // Un fichier manquant n'empêche pas la mise à jour (il sera simplement pris en ligne plus tard).
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return; // le compteur passe toujours par le réseau
  // Fichiers du site : réseau d'abord, en revalidant toujours auprès du serveur (pas de copie périmée),
  // et le cache seulement si on est hors ligne
  const fresh = fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' });
  e.respondWith(fresh
    .then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
