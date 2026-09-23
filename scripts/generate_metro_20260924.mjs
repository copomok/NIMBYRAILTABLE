import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath=process.argv[2];
const outputPath=process.argv[3]||'data/nimbi_metro_20260924_update.js';
if(!sourcePath)throw new Error('사용법: node scripts/generate_metro_20260924.mjs <인게임 시간표 JSON> [출력 파일]');

const raw=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const meta=raw.find(item=>item.class==='ExportMeta');
const stations=raw.filter(item=>item.class==='Station');
const stationById=new Map(stations.map(station=>[station.id,station]));
const stationIdsByName=new Map;
for(const station of stations){
  const name=station.name.replace(/역$/,'');
  if(!stationIdsByName.has(name))stationIdsByName.set(name,[]);
  stationIdsByName.get(name).push(station.id);
}

const context={};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro.js','utf8')};this.lines=METRO_LINES;`,context);

// 기존 노선도에서 동명이 아닌 역의 화면 좌표를 수집합니다. 이미 표시되던 역은
// 이 값을 그대로 보존하고, 신설 역만 해당 노선의 실제 경위도로 국소 보간합니다.
const knownDiagramXY=new Map;
for(const line of context.lines){
  for(const route of line.routes||[]){
    (route.stations||[]).forEach((name,index)=>{
      const ids=stationIdsByName.get(name);
      const xy=route.xy?.[index];
      if(!ids||ids.length!==1||!xy)return;
      if(!knownDiagramXY.has(name))knownDiagramXY.set(name,xy);
    });
  }
}
function regression(calibration,inputIndex,outputIndex){
  const n=calibration.length;
  let sx=0,sy=0,sxx=0,sxy=0;
  for(const point of calibration){
    const x=point[inputIndex],y=point[outputIndex];
    sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;
  }
  const scale=(n*sxy-sx*sy)/(n*sxx-sx*sx);
  return {scale,offset:(sy-scale*sx)/n};
}

const wrapMinute=value=>((value%1440)+1440)%1440;
const toMinute=(seconds,tz)=>wrapMinute(Math.round((meta.clock_epoch_s+seconds+tz)/60));
function buildRevision(name,color){
  const line=raw.find(item=>item.class==='Line'&&item.name===name);
  const schedule=raw
    .filter(item=>item.class==='Schedule'&&item.name===name&&item.shifts?.length)
    .sort((a,b)=>b.shifts.length-a.shifts.length)[0];
  if(!line||!schedule)throw new Error(`${name} 활성 노선 또는 스케줄을 찾을 수 없습니다.`);

  const stopNames=line.stops.map(stop=>stationById.get(stop.station_id)?.name.replace(/역$/,''));
  const canonicalNames=[];
  const canonicalCoords=[];
  const indexByName=new Map;
  line.stops.forEach((stop,index)=>{
    const nameAtStop=stopNames[index];
    if(indexByName.has(nameAtStop))return;
    indexByName.set(nameAtStop,canonicalNames.length);
    canonicalNames.push(nameAtStop);
    canonicalCoords.push(stationById.get(stop.station_id).lonlat.map(value=>Number(value.toFixed(6))));
  });
  const localCalibration=[];
  canonicalNames.forEach((stationName,index)=>{
    const xy=knownDiagramXY.get(stationName);
    if(xy)localCalibration.push([...canonicalCoords[index],...xy]);
  });
  const xProjection=regression(localCalibration,0,2);
  const yProjection=regression(localCalibration,1,3);
  const project=([lon,lat])=>[
    Number((lon*xProjection.scale+xProjection.offset).toFixed(1)),
    Number((lat*yProjection.scale+yProjection.offset).toFixed(1))
  ];

  const seen=new Set;
  const trips=[];
  for(const shift of schedule.shifts){
    for(const run of shift.runs||[]){
      if(run.line_id!==line.id)continue;
      const trip=[];
      for(let stopIndex=run.enter_stop_idx,arrayIndex=0;stopIndex<=run.exit_stop_idx;stopIndex++,arrayIndex+=2){
        const stationIndex=indexByName.get(stopNames[stopIndex]);
        const arrival=toMinute(run.arrival_departure[arrayIndex],schedule.tz_delta_s);
        const departure=toMinute(run.arrival_departure[arrayIndex+1],schedule.tz_delta_s);
        // 반환점은 인게임 노선에 같은 역이 연속 두 번 기록되므로 한 번만 표시하되
        // 첫 기록의 도착과 둘째 기록의 출발을 보존합니다.
        if(trip.length&&trip.at(-1)===stationIndex)trip[trip.length-2]=departure;
        else trip.push(arrival,departure,stationIndex);
      }
      const key=trip.join(',');
      if(!seen.has(key)){seen.add(key);trips.push(trip);}
    }
  }
  trips.sort((a,b)=>a[1]-b[1]||a.length-b.length||a.join(',').localeCompare(b.join(',')));

  return {
    name,color,lineId:line.id,scheduleId:schedule.id,
    stations:canonicalNames,
    coords:canonicalCoords,
    xy:canonicalCoords.map((coords,index)=>knownDiagramXY.get(canonicalNames[index])?.slice()||project(coords)),
    trips,
    rawRuns:schedule.shifts.flatMap(shift=>shift.runs||[]).filter(run=>run.line_id===line.id).length
  };
}

const revisions=[buildRevision('강서선','#6ccc6c'),buildRevision('은평선','#545454')];
const payload=Object.fromEntries(revisions.map(item=>[item.name,item]));
const output=`// 이 파일은 scripts/generate_metro_20260924.mjs로 인게임 JSON에서 생성했습니다. 직접 편집하지 마세요.
(function applyMetroSeptemberRevision(global){
  'use strict';
  const lines=typeof METRO_LINES!=='undefined'?METRO_LINES:global.METRO_LINES;
  const schedules=typeof METRO_SCHED!=='undefined'?METRO_SCHED:global.METRO_SCHED;
  const geo=typeof METRO_GEO!=='undefined'?METRO_GEO:global.METRO_GEO;
  if(!Array.isArray(lines)||!schedules||!geo)return;
  const revisions=${JSON.stringify(payload)};
  for(const [name,revision] of Object.entries(revisions)){
    const line=lines.find(item=>item.name===name);
    if(line){
      line.color=revision.color;
      line.from=revision.stations[0];
      line.to=revision.stations.at(-1);
      line.n=revision.stations.length;
      line.stations=revision.stations.slice();
      line.routes=[{stations:revision.stations.slice(),xy:revision.xy.map(point=>point.slice())}];
    }
    geo[name]={m:revision.coords.map(point=>point.slice())};
    schedules[name]={s:revision.stations.slice(),t:revision.trips.map(trip=>trip.slice())};
  }
  global.NIMBI_METRO_SEPTEMBER_REVISION={
    version:'2026-09-24',source:'Mysterious Enterprise Timetable Export 20221025T213119Z.json',
    lines:Object.fromEntries(Object.entries(revisions).map(([name,item])=>[name,{lineId:item.lineId,scheduleId:item.scheduleId,rawRuns:item.rawRuns,services:item.trips.length}])),
    exactGameCoordinates:true,exactRunTimes:true,preservedPassengerColors:true
  };
})(typeof globalThis!=='undefined'?globalThis:window);
`;
fs.writeFileSync(outputPath,output);
for(const item of revisions)console.log(`${item.name}: ${item.stations.length}역, 원시 ${item.rawRuns}회, 일자 중복 제거 ${item.trips.length}편`);
