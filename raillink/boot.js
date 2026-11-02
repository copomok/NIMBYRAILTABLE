// Download shared sources together, then execute them in their canonical order.
try {
  window.NIMBI_DISABLE_WEATHER=true;
  const loading=document.querySelector('.loading');
  const progress=text=>{if(loading)loading.textContent=text;};
  const root=new URL("../",location.href);
  const response=await fetch(new URL('index.html',root),{cache:'default'});
  if(!response.ok)throw new Error('공통 데이터 목록을 불러올 수 없습니다.');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  const features=new Set(['nimbi_demand.js','nimbi_booking_dynamics.js','nimbi_inventory.js','nimbi_delay.js','nimbi_congestion.js']);
  const excluded=new Set(["data/nimbi_metro.js","data/nimbi_metro_sched.js","data/nimbi_metro_schedule_updates.js","data/nimbi_metro_service_policy.js","data/nimbi_metro_geo.js","data/nimbi_metro_20260924_update.js","data/nimbi_metro_platform_directions.js","data/nimbi_metro_station_renames.js","data/nimbi_metro_20261023_update.js","data/nimbi_20261027_metro_routes.js","data/nimbi_station_history.js","data/nimbi_rail_notices.js"]);
  const sources=[...doc.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')).filter(src=>{const file=src.split('?')[0];return (file.startsWith('data/')||file.startsWith('js/core/')||file.startsWith('js/shared/')||features.has(file.split('/').pop()))&&!excluded.has(file);});
  if(!sources.some(s=>s.includes('nimbi_rail_domain.js')))throw new Error('공통 모듈이 아직 배포되지 않았습니다.');
  const urls=sources.map(src=>{const url=new URL(src,root);if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))throw new Error('잘못된 데이터 경로');return url;});
  window.RailSourceURLs=Object.freeze(urls.map(url=>url.href));
  let received=0;progress('공통 철도 데이터를 내려받는 중입니다…');
  const payloads=await Promise.all(urls.map(async url=>{
    const source=await fetch(url,{cache:'force-cache'});if(!source.ok)throw new Error('공통 데이터를 불러오지 못했습니다.');
    const text=await source.text();received++;progress('공통 철도 데이터 '+received+'/'+urls.length);return {url,text};
  }));
  progress('열차 정보를 준비하는 중입니다…');
  for(const payload of payloads){
    const blob=URL.createObjectURL(new Blob([payload.text+'\n//# sourceURL='+payload.url.href],{type:'text/javascript'}));
    try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=blob;script.onload=()=>{script.remove();resolve();};script.onerror=()=>{script.remove();reject(new Error('공통 데이터 실행에 실패했습니다.'));};document.body.append(script);});}
    finally{URL.revokeObjectURL(blob);}
  }
  window.RailData=Object.freeze({trains:ALL_TRAINS,grades:GL,colors:GRADE_COLORS,classes:SEAT_CLASSES,discounts:DISCOUNTS,stops:NIMBI_Demand.getStops,fare:calcFare,discount:applyDiscount,formation:getFormationType,cars:getCarComposition,classCars:getCarsForClass,seatId,inventory:getSeatInventoryState,forecast:_delayForecast,platform:_realPlatform,virtualSeats:generateVirtualBookings,bookedSeats:getBookedSeats,invalidate:invalidateCongestion,duration:durMin,coordinate:_stnCoord,isPass:isPassStop,distance:routeDistanceKm,stationDB:STATION_DB,latestMap:globalThis.NIMBI_LATEST_MAP||null,setSimulation:enabled=>{_simDelayOn=!!enabled;},delayState:_simState,delayAt:_simDelayAtStop,delayPair:_simDelayPairAtStop});
  if(!window.RailData?.trains?.length)throw new Error('공통 열차 데이터를 준비하지 못했습니다.');
  await import('./js/app.js?v=036a7a7206d4');
} catch(error){document.getElementById('main').textContent=error.message+' 새로고침하여 다시 시도하세요.';}
