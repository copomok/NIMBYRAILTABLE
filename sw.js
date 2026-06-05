const CACHE_NAME = 'nimbirail-v2';
const ASSETS = [
  '/NIMBYRAILTABLE/',
  '/NIMBYRAILTABLE/index.html',
  '/NIMBYRAILTABLE/nimbi_rail.css',
  '/NIMBYRAILTABLE/nimbi_rail.js',
  '/NIMBYRAILTABLE/nimbi_rail_data.js',
  '/NIMBYRAILTABLE/manifest.json',
];

// 설치: 모든 파일 캐시
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
    )
  );
  self.clients.claim();
});

// 요청 처리: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 성공한 응답은 캐시에 저장
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// 푸시 알림 (백그라운드)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '🔔 님비레일 알람', {
      body: data.body || '',
      icon: '/NIMBYRAILTABLE/icon-192.png',
      badge: '/NIMBYRAILTABLE/icon-192.png',
    })
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('NIMBYRAILTABLE') && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow('/NIMBYRAILTABLE/');
    })
  );
});
