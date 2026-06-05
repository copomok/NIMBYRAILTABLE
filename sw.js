const CACHE_NAME = 'nimbirail-eda62c6b';
const ASSETS = [
  '/NIMBYRAILTABLE/',
  '/NIMBYRAILTABLE/index.html',
  '/NIMBYRAILTABLE/nimbi_rail.css',
  '/NIMBYRAILTABLE/nimbi_rail.js',
  '/NIMBYRAILTABLE/nimbi_rail_data.js',
  '/NIMBYRAILTABLE/manifest.json',
];

// 설치: 캐시 저장 후 즉시 활성화
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 대기 없이 즉시 활성화
});

// 활성화: 이전 캐시 삭제 후 즉시 모든 탭 제어
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // 즉시 모든 탭 제어
  );
});

// 요청 처리: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', e => {
  // HTML은 항상 네트워크 우선 (최신 버전 보장)
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
  // JS/CSS/기타: 캐시 우선 (오프라인 지원), 네트워크에서 백그라운드 갱신
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || networkFetch;
    })
  );
});

// 새 SW 활성화 시 모든 탭에 업데이트 메시지 전송
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
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
