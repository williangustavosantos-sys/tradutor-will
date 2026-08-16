// Service worker mínimo — só registra o app como PWA instalável.
// Não faz cache offline (as traduções dependem do backend /api/translate).
// Network-first: sempre busca da rede, inclusive as chamadas à API.

const CACHE_NAME = 'tradutor-will-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline — o tradutor precisa de conexão com a internet.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
