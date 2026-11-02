const CACHE='raillink-fb8c4bb014fa';
const SHELL=['./','./index.html',"./js/app.js?v=fb8c4bb014fa","./js/boarding-controller.js?v=fb8c4bb014fa","./js/boarding-notifications.js?v=fb8c4bb014fa","./js/boarding-view.js?v=fb8c4bb014fa","./js/boarding.js?v=fb8c4bb014fa","./js/booking-storage.js?v=fb8c4bb014fa","./js/greeting-data.js?v=fb8c4bb014fa","./js/greeting-holidays.js?v=fb8c4bb014fa","./js/greetings.js?v=fb8c4bb014fa","./js/home.js?v=fb8c4bb014fa","./js/inventory-queue.js?v=fb8c4bb014fa","./js/journey.js?v=fb8c4bb014fa","./js/model.js?v=fb8c4bb014fa","./js/operations.js?v=fb8c4bb014fa","./js/pwa.js?v=fb8c4bb014fa","./js/query-options.js?v=fb8c4bb014fa","./js/rail-map-view.js?v=fb8c4bb014fa","./js/rail-map.js?v=fb8c4bb014fa","./js/railway-time.js?v=fb8c4bb014fa","./js/routing.js?v=fb8c4bb014fa","./js/search-view.js?v=fb8c4bb014fa","./js/seats-view.js?v=fb8c4bb014fa","./js/settings-view.js?v=fb8c4bb014fa","./js/settings.js?v=fb8c4bb014fa","./js/station-picker.js?v=fb8c4bb014fa","./js/styles.js?v=fb8c4bb014fa","./js/ticket-journey.js?v=fb8c4bb014fa","./js/ticket-qr.js?v=fb8c4bb014fa","./js/tickets.js?v=fb8c4bb014fa","./js/tour-products.js?v=fb8c4bb014fa","./js/tourism.js?v=fb8c4bb014fa","./js/train-families.js?v=fb8c4bb014fa","./js/travel-tools.js?v=fb8c4bb014fa","./css/app.css?v=fb8c4bb014fa","./css/boarding.css?v=fb8c4bb014fa","./css/booking.css?v=fb8c4bb014fa","./css/home.css?v=fb8c4bb014fa","./css/mobile.css?v=fb8c4bb014fa","./css/operations.css?v=fb8c4bb014fa","./css/product.css?v=fb8c4bb014fa","./css/rail-map.css?v=fb8c4bb014fa","./css/settings.css?v=fb8c4bb014fa","./css/ticketing.css?v=fb8c4bb014fa","./css/tourism.css?v=fb8c4bb014fa","./assets/apple-touch-icon.png","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./tokens.css?v=fb8c4bb014fa","./operations-source.css?v=fb8c4bb014fa","./boot.js?v=fb8c4bb014fa","./manifest.webmanifest","./icon.svg"];
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
