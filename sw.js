// Service worker mínimo — só registra o app como PWA instalável.
// Não faz cache offline (precisamos sempre conectar à API).

const CACHE_NAME = 'tradutor-will-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first: sempre busca da rede.
  // O app exige conexão para funcionar (API Gemini Live).
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline — o tradutor precisa de conexão com a internet.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
