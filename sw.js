// GitHub Pages caches every file for ten minutes, so a plain refresh after a deploy can run old modules
// beside new ones. Every same-origin request here revalidates with the server (a cheap 304 when nothing
// changed).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }));
});
