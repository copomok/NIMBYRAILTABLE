const CACHE_NAME = 'nimbirail-b90b825d';
const ASSETS = [
  '/NIMBYRAILTABLE/',
  '/NIMBYRAILTABLE/index.html',
  '/NIMBYRAILTABLE/nimbi_rail.css',
  '/NIMBYRAILTABLE/nimbi_rail.js',
  '/NIMBYRAILTABLE/nimbi_rail_data.js',
  '/NIMBYRAILTABLE/manifest.json',
  '/NIMBYRAILTABLE/icon-192.png',
  '/NIMBYRAILTABLE/icon-512.png',
];

// 설치
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || net;
    })
  );
});

// ── 알림 처리 ──
// showNotification 요청 수신 (페이지에서 postMessage로 전달)
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = e.data;
    self.registration.showNotification(title || '🔔 님비레일 알람', {
      body: body || '',
      icon: icon || '/NIMBYRAILTABLE/icon-192.png',
      badge: badge || '/NIMBYRAILTABLE/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: tag || 'nimbirail-alarm',
    });
  }
});

// 알림 클릭 시 앱 열기
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
