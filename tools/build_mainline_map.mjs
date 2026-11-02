import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={console};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data/nimbi_station_data.js','data/nimbi_latest_map.js','data/nimbi_homonyms.js','data/nimbi_nyongwon_20261027_stations.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}
vm.runInContext('globalThis.__stationDB=STATION_DB',context);

const source=fs.readFileSync(path.join(root,'js/nimbi_rail.js'),'utf8');
const start=source.indexOf('const MAP_LINES =');
const end=source.indexOf('\nconst NORTH_MAP_LINE_KEYS',start);
if(start<0||end<0)throw new Error('js/nimbi_rail.js에서 MAP_LINES 원본을 찾지 못했습니다.');
const literal=source.slice(start+'const MAP_LINES ='.length,end).trim().replace(/;$/,'');
const lines=vm.runInContext(`(${literal})`,context,{filename:'MAP_LINES'});
const stationDB=context.__stationDB,latest=context.NIMBI_LATEST_MAP;
const primaryAliases={'신동(태백)':'신동','고성(강원)':'고성'};
const coordinate=name=>{
  const alias=primaryAliases[name]||name;
  const row=stationDB[`${alias}역`]||stationDB[alias]||stationDB[`${name}역`]||stationDB[name];
  if(row&&Number.isFinite(+row.lon)&&Number.isFinite(+row.lat))return {lon:+row.lon,lat:+row.lat};
  const raw=(latest?.stations||[]).find(item=>item.name===name||item.name===alias);
  return raw?{lon:+raw.lon,lat:+raw.lat}:null;
};

const routes=[];
for(const [key,line] of Object.entries(lines))for(const [routeIndex,route] of (line.routes||[]).entries()){
  const stations=(route.stations||[]).map(station=>{
    const coord=coordinate(station.n);
    if(!coord)throw new Error(`${line.name}: ${station.n}의 실제 좌표를 찾지 못했습니다.`);
    return {name:station.n,...coord};
  });
  if(stations.length>1)routes.push({id:`${key}:${routeIndex}`,line:line.name,name:route.name||line.name,color:route.color||line.color||'#64748b',north:key==='north',stations});
}
const stationCount=new Set(routes.flatMap(route=>route.stations.map(station=>station.name))).size;
const edgeCount=new Set(routes.flatMap(route=>route.stations.slice(1).map((station,index)=>[route.stations[index].name,station.name].sort().join('\0')))).size;
const payload={source:{kind:'nimby-map-lines',mainlineOnly:true,detail:'station-to-station',lineCount:Object.keys(lines).length,routeCount:routes.length,stationCount,edgeCount},routes};
const output=`/* Generated from js/nimbi_rail.js MAP_LINES. METRO_LINES is intentionally excluded. */\nwindow.NIMBI_MAINLINE_MAP=Object.freeze(${JSON.stringify(payload)});\n`;
fs.writeFileSync(path.join(root,'data/nimbi_mainline_map.js'),output);
console.log(`일반철도 노선도 생성: ${routes.length}개 경로, ${stationCount}개 역, ${edgeCount}개 인접역 구간`);
