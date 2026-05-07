/* ================================================================
   Lumin Home — Service Worker
   缓存静态资源，支持离线访问
   ================================================================ */

var CACHE_NAME = 'lumin-home-v1';

var STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './jukebox.js',
  './tally.js',
  './reading.js',
  './styles.css',
  './styles-modules.css',
  './manifest.json',
  './assets/fonts/zpix.ttf',
  './assets/bg/morning.png',
  './assets/bg/day.png',
  './assets/bg/sunset.png',
  './assets/bg/night.png',
  './assets/bg/late.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

/* 安装：缓存所有静态资源 */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

/* 请求拦截：静态资源走缓存优先，API 请求走网络优先 */
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Supabase API 和外部请求：网络优先，失败不缓存
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 本地静态资源：缓存优先，回退到网络
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // 缓存新请求的资源
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
