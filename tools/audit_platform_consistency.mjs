import fs from 'node:fs';
import vm from 'node:vm';

const context={console};
vm.createContext(context);
for(const file of ['data/nimbi_rail_data.js','data/nimbi_station_data.js','data/nimbi_realplat.js','data/nimbi_platform_db.js','data/nimbi_homonyms.js','data/nimbi_regional_platforms.js','data/nimbi_ingame_platforms.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__real=REAL_PLAT;globalThis.__db=PLATFORM_DB',context);
const trains=context.__trains,real=context.__real,db=context.__db;
const family=grade=>/KTX/.test(grade||'')?'KTX':grade==='SRT'?'SRT':
  /^ITX/.test(grade||'')?'ITX':/새마을|남도해양|국악와인/.test(grade||'')?'새마을':'무궁화';
const dbKey=station=>db[station]?station:db[station+'역']?station+'역':null;
const platformAt=(train,stop)=>real[train.no]?.[stop.s]??(stop.p==null?null:Number(stop.p));
const rows=[];
for(const train of trains){
  train.stops.forEach((stop,index)=>{
    const platform=platformAt(train,stop);
    if(!Number.isFinite(platform))return;
    const prev=train.stops[index-1]?.s||null,next=train.stops[index+1]?.s||null;
    rows.push({train,stop,index,platform,prev,next,grade:family(train.grade),key:dbKey(stop.s)});
  });
}
const routeKey=train=>[family(train.grade),train.line||'',train.stops.map(stop=>stop.s).join('>')].join('\u0002');
const bySignature=new Map(),byService=new Map();
for(const row of rows){
  if(!row.prev||!row.next)continue;
  const key=[row.stop.s,row.prev,row.next,row.grade].join('\u0001');
  if(!bySignature.has(key))bySignature.set(key,[]);
  bySignature.get(key).push(row);
  const service=[routeKey(row.train),row.stop.s].join('\u0001');
  if(!byService.has(service))byService.set(service,[]);
  byService.get(service).push(row);
}
const invalid=[],outliers=[],serviceOutliers=[];
for(const row of rows){
  const stationDb=row.key&&db[row.key];
  if(stationDb&&!stationDb[String(row.platform)]){
    invalid.push({no:String(row.train.no),station:row.stop.s,platform:row.platform,reason:'없는 승강장'});
  }
  if(!row.prev||!row.next)continue;
  const peers=bySignature.get([row.stop.s,row.prev,row.next,row.grade].join('\u0001'))||[];
  const counts=new Map();
  for(const peer of peers)counts.set(peer.platform,(counts.get(peer.platform)||0)+1);
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
  if(peers.length<4||!ranked.length)continue;
  const [recommended,support]=ranked[0],second=ranked[1]?.[1]||0;
  if(row.platform!==recommended&&support>=4&&support/peers.length>=.72&&support>=second*2){
    outliers.push({no:String(row.train.no),station:row.stop.s,from:row.platform,to:recommended,
      grade:row.grade,prev:row.prev,next:row.next,support,total:peers.length});
  }
  const servicePeers=byService.get([routeKey(row.train),row.stop.s].join('\u0001'))||[];
  const serviceCounts=new Map();
  for(const peer of servicePeers)serviceCounts.set(peer.platform,(serviceCounts.get(peer.platform)||0)+1);
  const serviceRanked=[...serviceCounts].sort((a,b)=>b[1]-a[1]);
  if(servicePeers.length>=4&&serviceRanked.length){
    const [servicePlatform,serviceSupport]=serviceRanked[0],serviceSecond=serviceRanked[1]?.[1]||0;
    if(row.platform!==servicePlatform&&serviceSupport/servicePeers.length>=.8&&serviceSupport>=serviceSecond*3){
      serviceOutliers.push({no:String(row.train.no),station:row.stop.s,from:row.platform,to:servicePlatform,
        grade:row.grade,service:`${row.train.stops[0]?.s}→${row.train.stops.at(-1)?.s}`,
        support:serviceSupport,total:servicePeers.length});
    }
  }
}
const unique=list=>[...new Map(list.map(item=>[[item.no,item.station].join('|'),item])).values()];
const stale=[];
for(const train of trains){
  const stations=new Set(train.stops.map(stop=>stop.s));
  for(const station of Object.keys(real[train.no]||{})){
    if(!stations.has(station))stale.push({no:String(train.no),station});
  }
}
const result={trainCount:trains.length,mappedStops:rows.length,invalid:unique(invalid),stale,
  serviceOutliers:unique(serviceOutliers),directionOutliers:unique(outliers)};
console.log(JSON.stringify(result,null,2));
