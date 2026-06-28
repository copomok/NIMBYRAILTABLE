const CACHE_NAME = 'nimbirail-1782614432';
const ASSETS = [
  '/NIMBYRAILTABLE/',
  '/NIMBYRAILTABLE/index.html',
  '/NIMBYRAILTABLE/nimbi_rail.css',
  '/NIMBYRAILTABLE/nimbi_rail.js',
  '/NIMBYRAILTABLE/nimbi_rail_data.js',
  '/NIMBYRAILTABLE/nimbi_rail_notices.js',
  '/NIMBYRAILTABLE/manifest.json',
  '/NIMBYRAILTABLE/icon-192.png',
  '/NIMBYRAILTABLE/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 우리 앱 파일(ASSETS)만 네트워크 우선으로 캐싱.
// 외부 리소스(구글 폰트 등)는 캐시에 절대 저장하지 않고 그대로 통과시켜
// 캐시가 무한정 불어나는 것을 방지한다.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isOwnAsset = url.origin === self.location.origin
    && ASSETS.some(a => url.pathname === a || url.pathname.endsWith(a.replace('/NIMBYRAILTABLE/', '/NIMBYRAILTABLE/')));

  if (!isOwnAsset) {
    // 외부 리소스(폰트 등): 캐시 저장 없이 그냥 네트워크로 패스
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// 알림 처리
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title || '🔔 님비레일 알람', {
      body: body || '',
      icon: '/NIMBYRAILTABLE/icon-192.png',
      badge: '/NIMBYRAILTABLE/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: tag || 'nimbirail-1782614432alarm',
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('NIMBYRAILTABLE') && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow('/NIMBYRAILTABLE/');
    })
  );
});
