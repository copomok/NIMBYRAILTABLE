import fs from 'node:fs';
import vm from 'node:vm';

const [exportPath, outputPath='data/nimbi_metro_20261023_update.js']=process.argv.slice(2);
if(!exportPath)throw new Error('usage: node scripts/generate_metro_20261023.mjs <Timetable Export.json> [output.js]');
const records=JSON.parse(fs.readFileSync(exportPath,'utf8'));
const stations=new Map(records.filter(row=>row.class==='Station').map(row=>[row.id,row]));
const lines=new Map(records.filter(row=>row.class==='Line').map(row=>[row.id,row]));
const schedules=records.filter(row=>row.class==='Schedule'&&row.shifts?.length);
const affected=['교하선','남북선','성남화성선','GTX-A','경의중앙선'];
const removed=['경의선','중앙선'];
const lineByName=new Map([...lines.values()].map(line=>[line.name,line]));
// The September export established the site's UTC→KST calibration. The new export's
// clock_epoch_s is a snapshot instant, not a change to each repeating timetable.
const calibratedEpoch=1666733479+9*3600+89*60;
const minute=seconds=>((Math.round((calibratedEpoch+seconds)/60)%1440)+1440)%1440;
const short=id=>{
  const station=stations.get(id);
  if(!station)return null;
  if(station.name==='내곡역'&&station.lonlat[0]<127)return '내곡(고양)';
  return station.name.replace(/역$/,'');
};
const coords=id=>stations.get(id)?.lonlat.map(value=>Number(value.toFixed(6)));
const platNums=stop=>[...new Set((stop.areas||[]).flatMap(group=>(group||[]).map(area=>Number(String(area.platform_name||'').match(/^\d+/)?.[0])).filter(Number.isFinite)))].sort((a,b)=>a-b);

const context={};vm.createContext(context);
for(const file of ['data/nimbi_metro.js','data/nimbi_metro_geo.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
vm.runInContext('globalThis.baseLines=METRO_LINES;globalThis.baseGeo=METRO_GEO',context);
const baseLineByName=new Map(context.baseLines.map(line=>[line.name,line]));
const oldXY=new Map;
for(const line of context.baseLines)for(const route of line.routes||[])(route.stations||[]).forEach((name,index)=>{
  if(route.xy?.[index]&&!oldXY.has(name))oldXY.set(name,route.xy[index]);
});
function projectedXY(names,points){
  const result=names.map(name=>oldXY.get(name)?.slice()||null);
  const distance=(a,b)=>Math.hypot((a[0]-b[0])*88,(a[1]-b[1])*111);
  for(let i=0;i<result.length;i++){
    if(result[i])continue;
    let before=i-1,after=i+1;
    while(before>=0&&!result[before])before--;
    while(after<result.length&&!result[after])after++;
    if(before>=0&&after<result.length){
      const fraction=distance(points[before],points[i])/(distance(points[before],points[i])+distance(points[i],points[after])||1);
      result[i]=[0,1].map(axis=>Number((result[before][axis]+(result[after][axis]-result[before][axis])*fraction).toFixed(1)));
    }else if(before>=0){
      const prior=Math.max(0,before-1);
      const px=result[prior]||result[before];
      result[i]=[0,1].map(axis=>Number((result[before][axis]+(result[before][axis]-px[axis])*(i-before)).toFixed(1)));
    }else if(after<result.length){
      result[i]=result[after].slice();
    }
  }
  return result;
}
function mainRoute(line){
  const names=[],ids=[];
  const seen=new Set;
  for(const stop of line.stops||[]){
    const name=short(stop.station_id);
    if(!name||seen.has(stop.station_id))continue;
    seen.add(stop.station_id);names.push(name);ids.push(stop.station_id);
  }
  return {names,ids,points:ids.map(coords)};
}
function services(line,route){
  const stationIndex=new Map(route.ids.map((id,index)=>[id,index]));
  const output=[],seen=new Set;
  let rawRuns=0,excludedSingleStationRuns=0,correctedTerminals=0,depotTerminations=0;
  for(const schedule of schedules)for(const shift of schedule.shifts||[]){
    const runs=shift.runs||[];
    for(let ri=0;ri<runs.length;ri++){
      const run=runs[ri];
      if(run.line_id!==line.id)continue;
      rawRuns++;
      if(run.enter_stop_idx===run.exit_stop_idx){excludedSingleStationRuns++;continue;}
      const count=run.exit_stop_idx-run.enter_stop_idx+1;
      if((run.arrival_departure||[]).length<count*2)throw new Error(`${line.name}: incomplete arrival_departure`);
      const trip=[];
      for(let stopIndex=run.enter_stop_idx;stopIndex<=run.exit_stop_idx;stopIndex++){
        const idx=stationIndex.get(line.stops[stopIndex].station_id);
        if(idx===undefined)continue; // Removed phantom stop (GTX-A, station_id 0x0).
        const arr=minute(run.arrival_departure[(stopIndex-run.enter_stop_idx)*2]);
        const dep=minute(run.arrival_departure[(stopIndex-run.enter_stop_idx)*2+1]);
        if(trip.length&&trip.at(-1)===idx)trip[trip.length-2]=dep;
        else trip.push(arr,dep,idx);
      }
      if(trip.length<6)continue;
      if(run.exit_stop_idx===line.stops.length-1&&trip.at(-1)!==0){
        const next=runs[ri+1],nextLine=next&&lines.get(next.line_id);
        const nextSame=nextLine?.id===line.id&&next.enter_stop_idx===0;
        const nextDepot=nextLine&&/(입고|주박|기지)/.test(nextLine.name);
        if(nextSame){
          trip.push(minute(next.arrival_departure[0]),minute(next.arrival_departure[1]),0);
          correctedTerminals++;
        }else if(nextDepot){depotTerminations++;}
        else if(!next){
          const travelSeconds=Math.max(60,(line.stops[1].arrival||0)-(line.stops[0].departure||0));
          const arrival=minute(run.arrival_departure.at(-2)+travelSeconds);
          trip.push(arrival,arrival,0);correctedTerminals++;
        }
      }
      const key=trip.join(',');
      if(!seen.has(key)){seen.add(key);output.push(trip);}
    }
  }
  output.sort((a,b)=>a[1]-b[1]||a.length-b.length||a.join(',').localeCompare(b.join(',')));
  return {trips:output,rawRuns,excludedSingleStationRuns,correctedTerminals,depotTerminations};
}
function directions(line){
  const route=line.stops.map(stop=>short(stop.station_id)||'');
  const platforms={};
  line.stops.forEach((stop,index)=>{
    const name=route[index];if(!name)return;
    const [main,...aux]=(stop.areas||[]).map(group=>[...new Set((group||[]).map(area=>Number(String(area.platform_name||'').match(/^\d+/)?.[0])).filter(Number.isFinite))].sort((a,b)=>a-b));
    if(!main?.length&&!aux.some(group=>group.length))return;
    (platforms[name]||=[]).push({i:index,p:main||[],a:[...new Set(aux.flat())].filter(number=>!main?.includes(number))});
  });
  return {route,platforms};
}
const payload={source:'Mysterious Enterprise Timetable Export 20221026T132850Z.json',removed,lines:{},stationRecords:{}};
for(const name of affected){
  const line=lineByName.get(name);
  if(!line)throw new Error(`${name} missing from export`);
  const route=mainRoute(line),svc=services(line,route),dir=directions(line);
  if(!svc.trips.length)throw new Error(`${name}: no services`);
  const display=baseLineByName.get(name);
  const color=display?.color||`#${line.color.slice(-6)}`;
  const depotSource=name==='경의중앙선'?'경의선':name;
  const oldRoute=baseLineByName.get(depotSource)?.routes?.[0]?.stations||[];
  const depots=(context.baseGeo[depotSource]?.d||[]).map(depot=>({
    ...depot,j:route.names.indexOf(oldRoute[depot.j])
  })).filter(depot=>depot.j>=0);
  payload.lines[name]={stations:route.names,coords:route.points,xy:projectedXY(route.names,route.points),color,
    trips:svc.trips,depots,platformDirections:dir,summary:Object.fromEntries(Object.entries(svc).filter(([key])=>key!=='trips'))};
  for(const stop of line.stops){
    const nameAtStop=short(stop.station_id);
    if(!nameAtStop)continue;
    const station=stations.get(stop.station_id);
    const record=payload.stationRecords[nameAtStop]||={coords:coords(stop.station_id),platformLines:{},lines:[]};
    if(!record.lines.includes(name))record.lines.push(name);
    for(const platform of platNums(stop)){
      const names=record.platformLines[platform]||=[];
      if(!names.includes(name))names.push(name);
    }
  }
  console.log(`${name}: ${route.names.length} stations, ${svc.trips.length} unique trips, ${svc.rawRuns} raw runs`);
}
const output=`// Generated from the October 23 NIMBY Rails timetable export by scripts/generate_metro_20261023.mjs.
(() => {
  const data=${JSON.stringify(payload)};
  const changedNames=Object.keys(data.lines), retired=new Set(data.removed);
  if(typeof METRO_LINES==='undefined'||typeof METRO_SCHED==='undefined'||typeof METRO_GEO==='undefined')return;
  for(let index=METRO_LINES.length-1;index>=0;index--)if(retired.has(METRO_LINES[index].name))METRO_LINES.splice(index,1);
  for(const name of retired){delete METRO_SCHED[name];delete METRO_GEO[name];delete globalThis.METRO_PLATFORM_DIRECTIONS?.lines?.[name];}
  for(const [name,revision] of Object.entries(data.lines)){
    let line=METRO_LINES.find(item=>item.name===name);
    if(!line){line={id:'metro-gyeongui-jungang',name,region:'수도권',loop:false,night:false,patterns:[]};
      METRO_LINES.splice(Math.max(0,METRO_LINES.findIndex(item=>item.name==='교하선')),0,line);}
    Object.assign(line,{color:revision.color,from:revision.stations[0],to:revision.stations.at(-1),n:revision.stations.length,
      stations:revision.stations.slice(),routes:[{stations:revision.stations.slice(),xy:revision.xy.map(point=>point.slice())}]});
    const starts=revision.trips.map(trip=>trip[1]).filter(value=>value>=240).sort((a,b)=>a-b);
    const clock=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
    line.first=clock(starts[0]);line.last=clock(starts.at(-1));
    METRO_GEO[name]={m:revision.coords.map(point=>point.slice()),...(revision.depots.length?{d:revision.depots.map(depot=>({...depot,xy:depot.xy.slice()}))}:{})};
    METRO_SCHED[name]={s:revision.stations.slice(),t:revision.trips.map(trip=>trip.slice()),c:Array(revision.trips.length).fill(0)};
    if(globalThis.METRO_PLATFORM_DIRECTIONS?.lines)globalThis.METRO_PLATFORM_DIRECTIONS.lines[name]=revision.platformDirections;
  }
  const touched=new Set([...changedNames,...retired]);
  if(typeof STATION_DB!=='undefined'){
    for(const station of Object.values(STATION_DB))station.lines=(station.lines||[]).filter(name=>!touched.has(name));
    for(const [name,record] of Object.entries(data.stationRecords)){
      const key=name+'역',previous=STATION_DB[key]||{};
      STATION_DB[key]={...previous,lon:record.coords[0],lat:record.coords[1],
        platforms:[...new Set([...(previous.platforms||[]),...Object.keys(record.platformLines).map(Number)])].sort((a,b)=>a-b),
        lines:[...new Set([...(previous.lines||[]),...record.lines])]};
    }
  }
  if(typeof PLATFORM_DB!=='undefined'){
    for(const record of Object.values(PLATFORM_DB))for(const info of Object.values(record))info.l=(info.l||[]).filter(name=>!touched.has(name));
    for(const [name,record] of Object.entries(data.stationRecords)){
      const target=PLATFORM_DB[name+'역']||={};
      for(const [platform,names] of Object.entries(record.platformLines)){
        const info=target[platform]||={g:[],l:[]};info.l=[...new Set([...(info.l||[]),...names])];
      }
    }
  }
  globalThis.NIMBI_METRO_OCTOBER_REVISION={source:data.source,timezone:'Asia/Seoul',preservedCalibrationMinutes:89,
    retired:data.removed,lines:Object.fromEntries(Object.entries(data.lines).map(([name,item])=>[name,{stations:item.stations.length,trips:item.trips.length,...item.summary}]))};
})();
`;
fs.writeFileSync(outputPath,output);
