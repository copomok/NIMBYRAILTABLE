const CACHE='raillink-036a7a7206d4';
const SHELL=['./','./index.html',"./js/app.js?v=036a7a7206d4","./js/boarding-controller.js?v=036a7a7206d4","./js/boarding-notifications.js?v=036a7a7206d4","./js/boarding-view.js?v=036a7a7206d4","./js/boarding.js?v=036a7a7206d4","./js/booking-storage.js?v=036a7a7206d4","./js/greeting-data.js?v=036a7a7206d4","./js/greeting-holidays.js?v=036a7a7206d4","./js/greetings.js?v=036a7a7206d4","./js/home.js?v=036a7a7206d4","./js/inventory-queue.js?v=036a7a7206d4","./js/journey.js?v=036a7a7206d4","./js/model.js?v=036a7a7206d4","./js/operations.js?v=036a7a7206d4","./js/pwa.js?v=036a7a7206d4","./js/query-options.js?v=036a7a7206d4","./js/rail-map-view.js?v=036a7a7206d4","./js/rail-map.js?v=036a7a7206d4","./js/railway-time.js?v=036a7a7206d4","./js/routing.js?v=036a7a7206d4","./js/search-view.js?v=036a7a7206d4","./js/seats-view.js?v=036a7a7206d4","./js/settings-view.js?v=036a7a7206d4","./js/settings.js?v=036a7a7206d4","./js/station-picker.js?v=036a7a7206d4","./js/styles.js?v=036a7a7206d4","./js/ticket-journey.js?v=036a7a7206d4","./js/ticket-qr.js?v=036a7a7206d4","./js/tickets.js?v=036a7a7206d4","./js/tour-products.js?v=036a7a7206d4","./js/tourism.js?v=036a7a7206d4","./js/train-families.js?v=036a7a7206d4","./js/travel-tools.js?v=036a7a7206d4","./css/app.css?v=036a7a7206d4","./css/boarding.css?v=036a7a7206d4","./css/booking.css?v=036a7a7206d4","./css/home.css?v=036a7a7206d4","./css/mobile.css?v=036a7a7206d4","./css/operations.css?v=036a7a7206d4","./css/product.css?v=036a7a7206d4","./css/rail-map.css?v=036a7a7206d4","./css/settings.css?v=036a7a7206d4","./css/ticketing.css?v=036a7a7206d4","./css/tourism.css?v=036a7a7206d4","./assets/apple-touch-icon.png","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./tokens.css?v=036a7a7206d4","./operations-source.css?v=036a7a7206d4","./boot.js?v=036a7a7206d4","./manifest.webmanifest","./icon.svg"];
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
