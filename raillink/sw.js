const CACHE='raillink-ee4c19519ca7';
const SHELL=['./','./index.html',"./js/app.js?v=ee4c19519ca7","./js/boarding-controller.js?v=ee4c19519ca7","./js/boarding-notifications.js?v=ee4c19519ca7","./js/boarding-view.js?v=ee4c19519ca7","./js/boarding.js?v=ee4c19519ca7","./js/booking-storage.js?v=ee4c19519ca7","./js/greeting-data.js?v=ee4c19519ca7","./js/greeting-holidays.js?v=ee4c19519ca7","./js/greetings.js?v=ee4c19519ca7","./js/home.js?v=ee4c19519ca7","./js/inventory-queue.js?v=ee4c19519ca7","./js/journey.js?v=ee4c19519ca7","./js/model.js?v=ee4c19519ca7","./js/operations.js?v=ee4c19519ca7","./js/pwa.js?v=ee4c19519ca7","./js/query-options.js?v=ee4c19519ca7","./js/rail-map-view.js?v=ee4c19519ca7","./js/rail-map.js?v=ee4c19519ca7","./js/railway-time.js?v=ee4c19519ca7","./js/routing.js?v=ee4c19519ca7","./js/search-view.js?v=ee4c19519ca7","./js/seats-view.js?v=ee4c19519ca7","./js/settings-view.js?v=ee4c19519ca7","./js/settings.js?v=ee4c19519ca7","./js/station-picker.js?v=ee4c19519ca7","./js/styles.js?v=ee4c19519ca7","./js/ticket-journey.js?v=ee4c19519ca7","./js/ticket-qr.js?v=ee4c19519ca7","./js/tickets.js?v=ee4c19519ca7","./js/tour-products.js?v=ee4c19519ca7","./js/tourism.js?v=ee4c19519ca7","./js/train-families.js?v=ee4c19519ca7","./js/travel-tools.js?v=ee4c19519ca7","./css/app.css?v=ee4c19519ca7","./css/boarding.css?v=ee4c19519ca7","./css/booking.css?v=ee4c19519ca7","./css/home.css?v=ee4c19519ca7","./css/mobile.css?v=ee4c19519ca7","./css/operations.css?v=ee4c19519ca7","./css/product.css?v=ee4c19519ca7","./css/rail-map.css?v=ee4c19519ca7","./css/settings.css?v=ee4c19519ca7","./css/ticketing.css?v=ee4c19519ca7","./css/tourism.css?v=ee4c19519ca7","./assets/apple-touch-icon.png","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./tokens.css?v=ee4c19519ca7","./operations-source.css?v=ee4c19519ca7","./boot.js?v=ee4c19519ca7","./manifest.webmanifest","./icon.svg"];
const allowed=url=>url.origin===self.location.origin&&(url.pathname.startsWith(new URL('./',self.location).pathname)||url.pathname.startsWith('/NIMBYRAILTABLE/'));
self.addEventListener('notificationclick',event=>{
 const id=event.notification.data?.boardingId;event.notification.close();if(typeof id!=='string')return;
 event.waitUntil((async()=>{
  // Private, one-shot navigation handoff in the existing local database, never in a URL.
  const saved=await new Promise(resolve=>{
   const request=indexedDB.open('raillink-bookings',1);
   request.onerror=()=>resolve(false);
   request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('state')){db.close();resolve(false);return;}
    const transaction=db.transaction('state','readwrite');transaction.objectStore('state').put({id,at:Date.now()},'raillink.boarding.pending');
    transaction.oncomplete=()=>{db.close();resolve(true);};transaction.onabort=()=>{db.close();resolve(false);};
   };
  });
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=clients.find(c=>c.url.startsWith(new URL('./',self.location).href));
  if(client){await client.focus();client.postMessage({type:'open-boarding',id});}
  // No background scheduling: this only opens a notification already delivered while running.
  else await self.clients.openWindow(new URL(saved?'./#boarding':'./#tickets',self.location).href);
 })());
});
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('raillink-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('message',event=>{
 if(event.data?.type==='activate-update'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type!=='cache-sources'||!Array.isArray(event.data.urls))return;
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all([...new Set(event.data.urls)].map(async raw=>{const url=new URL(raw,self.location);if(!allowed(url))return;try{const response=await fetch(url);if(response.ok)await cache.put(url,response);}catch{}}));event.ports[0]?.postMessage({ready:true});})());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||!allowed(url))return;
 if(url.pathname==='/NIMBYRAILTABLE/index.html'){
  const cachePromise=caches.open(CACHE),refresh=cachePromise.then(async cache=>{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;});
  event.waitUntil(refresh.then(()=>undefined,()=>undefined));event.respondWith(cachePromise.then(async cache=>(await cache.match(request))||await refresh));return;
 }
 event.respondWith((async()=>{const cache=await caches.open(CACHE),immutable=url.searchParams.has('v')&&request.mode!=='navigate';if(immutable){const saved=await cache.match(request);if(saved)return saved;}try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}catch(error){const saved=await cache.match(request);if(saved)return saved;if(request.mode==='navigate'){const shell=await cache.match(new URL('./index.html',self.location));if(shell)return shell;}throw error;}})());
});
