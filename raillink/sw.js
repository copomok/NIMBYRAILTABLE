const CACHE='raillink-2630ba1bac60';
const SHELL=['./','./index.html',"./js/app.js?v=2630ba1bac60","./js/boarding-controller.js?v=2630ba1bac60","./js/boarding-notifications.js?v=2630ba1bac60","./js/boarding-view.js?v=2630ba1bac60","./js/boarding.js?v=2630ba1bac60","./js/booking-storage.js?v=2630ba1bac60","./js/greeting-data.js?v=2630ba1bac60","./js/greeting-holidays.js?v=2630ba1bac60","./js/greetings.js?v=2630ba1bac60","./js/home.js?v=2630ba1bac60","./js/inventory-queue.js?v=2630ba1bac60","./js/journey.js?v=2630ba1bac60","./js/model.js?v=2630ba1bac60","./js/operations.js?v=2630ba1bac60","./js/pwa.js?v=2630ba1bac60","./js/query-options.js?v=2630ba1bac60","./js/rail-map-view.js?v=2630ba1bac60","./js/rail-map.js?v=2630ba1bac60","./js/railway-time.js?v=2630ba1bac60","./js/routing.js?v=2630ba1bac60","./js/search-view.js?v=2630ba1bac60","./js/seats-view.js?v=2630ba1bac60","./js/settings-view.js?v=2630ba1bac60","./js/settings.js?v=2630ba1bac60","./js/station-picker.js?v=2630ba1bac60","./js/styles.js?v=2630ba1bac60","./js/ticket-journey.js?v=2630ba1bac60","./js/ticket-qr.js?v=2630ba1bac60","./js/tickets.js?v=2630ba1bac60","./js/tour-products.js?v=2630ba1bac60","./js/tourism.js?v=2630ba1bac60","./js/train-families.js?v=2630ba1bac60","./js/travel-tools.js?v=2630ba1bac60","./css/app.css?v=2630ba1bac60","./css/boarding.css?v=2630ba1bac60","./css/booking.css?v=2630ba1bac60","./css/home.css?v=2630ba1bac60","./css/mobile.css?v=2630ba1bac60","./css/operations.css?v=2630ba1bac60","./css/product.css?v=2630ba1bac60","./css/rail-map.css?v=2630ba1bac60","./css/settings.css?v=2630ba1bac60","./css/ticketing.css?v=2630ba1bac60","./css/tourism.css?v=2630ba1bac60","./assets/apple-touch-icon.png","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./tokens.css?v=2630ba1bac60","./operations-source.css?v=2630ba1bac60","./boot.js?v=2630ba1bac60","./manifest.webmanifest","./icon.svg"];
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
