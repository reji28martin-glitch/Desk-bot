/* Minimal offline shell cache for the PWA build. */
const CACHE = 'deskbot-shell-v1';
const SHELL = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/config.js', './js/api.js', './js/robot.js', './js/chat.js',
  './js/memory.js', './js/music.js', './js/settings.js', './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Never cache robot/backend API calls - only the app shell.
  if(e.request.method !== 'GET' || !SHELL.some(p => e.request.url.endsWith(p.replace('./','/')))){
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
