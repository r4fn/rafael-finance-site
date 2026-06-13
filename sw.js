const CACHE = 'escolha-certa-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/finance.js',
  './js/app.js',
  './js/pwa.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala e armazena em cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // API do Banco Central (CDI): network-first, com fallback ao cache offline.
  // Garante que o valor mais recente seja buscado sempre que houver internet.
  if (url.hostname === 'api.bcb.gov.br') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Demais recursos (app + fontes): cache-first, atualiza em segundo plano.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
