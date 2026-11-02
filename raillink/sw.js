const CACHE='raillink-e7d9e4474203';
const SHELL=['./','./index.html',"./js/app.js?v=e7d9e4474203","./js/boarding-controller.js?v=e7d9e4474203","./js/boarding-notifications.js?v=e7d9e4474203","./js/boarding-view.js?v=e7d9e4474203","./js/boarding.js?v=e7d9e4474203","./js/booking-storage.js?v=e7d9e4474203","./js/greeting-data.js?v=e7d9e4474203","./js/greeting-holidays.js?v=e7d9e4474203","./js/greetings.js?v=e7d9e4474203","./js/home.js?v=e7d9e4474203","./js/inventory-queue.js?v=e7d9e4474203","./js/journey.js?v=e7d9e4474203","./js/model.js?v=e7d9e4474203","./js/operations.js?v=e7d9e4474203","./js/pwa.js?v=e7d9e4474203","./js/query-options.js?v=e7d9e4474203","./js/rail-map-view.js?v=e7d9e4474203","./js/rail-map.js?v=e7d9e4474203","./js/railway-time.js?v=e7d9e4474203","./js/routing.js?v=e7d9e4474203","./js/search-view.js?v=e7d9e4474203","./js/seats-view.js?v=e7d9e4474203","./js/settings-view.js?v=e7d9e4474203","./js/settings.js?v=e7d9e4474203","./js/station-picker.js?v=e7d9e4474203","./js/styles.js?v=e7d9e4474203","./js/ticket-journey.js?v=e7d9e4474203","./js/ticket-qr.js?v=e7d9e4474203","./js/tickets.js?v=e7d9e4474203","./js/tour-products.js?v=e7d9e4474203","./js/tourism.js?v=e7d9e4474203","./js/train-families.js?v=e7d9e4474203","./js/travel-tools.js?v=e7d9e4474203","./css/app.css?v=e7d9e4474203","./css/boarding.css?v=e7d9e4474203","./css/booking.css?v=e7d9e4474203","./css/home.css?v=e7d9e4474203","./css/mobile.css?v=e7d9e4474203","./css/operations.css?v=e7d9e4474203","./css/product.css?v=e7d9e4474203","./css/rail-map.css?v=e7d9e4474203","./css/settings.css?v=e7d9e4474203","./css/ticketing.css?v=e7d9e4474203","./css/tourism.css?v=e7d9e4474203","./assets/apple-touch-icon.png","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./tokens.css?v=e7d9e4474203","./operations-source.css?v=e7d9e4474203","./boot.js?v=e7d9e4474203","./manifest.webmanifest","./icon.svg"];
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
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
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
