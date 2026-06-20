// 캐시 완전 초기화 버전
const CACHE_NAME = 'nimbirail-reset-' + Date.now();
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
    // 기존 캐시 전부 삭제 후 새로 설치
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // 모든 클라이언트에 새로고침 요청
        return self.clients.matchAll({type:'window'}).then(clients => {
          clients.forEach(c => c.postMessage({type:'RELOAD'}));
        });
      })
  );
});

// 항상 네트워크 우선 (캐시 무효화)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
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
      tag: tag || 'nimbirail-alarm',
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
