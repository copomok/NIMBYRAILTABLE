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
vm.runInContext(`${fs.readFileSync('data/nimbi_metro_sched.js','utf8')};this.schedules=METRO_SCHED;`,context);

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
// 인게임 시각은 UTC+0 절대초이므로 tz_delta_s 설정과 무관하게 한국 표준시(+09:00)로 바꿉니다.
const KST_OFFSET_SECONDS=9*60*60;
const toMinute=(seconds,minuteMode='round')=>wrapMinute(Math[minuteMode]((meta.clock_epoch_s+seconds+KST_OFFSET_SECONDS)/60));
const rawLines=new Map(raw.filter(item=>item.class==='Line').map(line=>[line.id,line]));
const rawSchedules=raw.filter(item=>item.class==='Schedule'&&item.shifts?.length);
const nameAt=(line,stopIndex)=>stationById.get(line.stops[stopIndex].station_id)?.name.replace(/역$/,'');

function linePresentation(name,color){
  const line=raw.find(item=>item.class==='Line'&&item.name===name);
  if(!line)throw new Error(`${name} 노선을 찾을 수 없습니다.`);

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

  return {line,stations:canonicalNames,coords:canonicalCoords,
    xy:canonicalCoords.map((coords,index)=>knownDiagramXY.get(canonicalNames[index])?.slice()||project(coords)),color};
}

function collectServices({familyLineNames,stationNames,classByLine={},terminalCorrection=true,minuteMode='round'}){
  const familyLines=raw.filter(item=>item.class==='Line'&&familyLineNames.includes(item.name));
  const familyIds=new Set(familyLines.map(line=>line.id));
  const indexByName=new Map(stationNames.map((name,index)=>[name,index]));
  const seen=new Set;
  const services=[];
  let rawRuns=0,correctedTerminals=0,depotTerminations=0,excludedSingleStationRuns=0;
  for(const schedule of rawSchedules){
    const containsFamily=schedule.shifts.some(shift=>(shift.runs||[]).some(run=>familyIds.has(run.line_id)));
    if(!containsFamily)continue;
    for(const shift of schedule.shifts){
      const runs=shift.runs||[];
      for(let runPosition=0;runPosition<runs.length;runPosition++){
        const run=runs[runPosition];
        if(!familyIds.has(run.line_id))continue;
        rawRuns++;
        if(run.enter_stop_idx===run.exit_stop_idx){excludedSingleStationRuns++;continue;}
        const line=rawLines.get(run.line_id);
      const trip=[];
      for(let stopIndex=run.enter_stop_idx,arrayIndex=0;stopIndex<=run.exit_stop_idx;stopIndex++,arrayIndex+=2){
        const stationIndex=indexByName.get(nameAt(line,stopIndex));
        if(stationIndex===undefined)throw new Error(`${line.name} 역 매핑 누락: ${nameAt(line,stopIndex)}`);
        const arrival=toMinute(run.arrival_departure[arrayIndex],minuteMode);
        const departure=toMinute(run.arrival_departure[arrayIndex+1],minuteMode);
        // 반환점은 인게임 노선에 같은 역이 연속 두 번 기록되므로 한 번만 표시하되
        // 첫 기록의 도착과 둘째 기록의 출발을 보존합니다.
        if(trip.length&&trip.at(-1)===stationIndex)trip[trip.length-2]=departure;
        else trip.push(arrival,departure,stationIndex);
      }
        if(terminalCorrection&&run.exit_stop_idx===line.stops.length-1){
          const originName=nameAt(line,0);
          const nextRun=runs[runPosition+1];
          const nextLine=nextRun&&rawLines.get(nextRun.line_id);
          const nextIsFamily=nextRun&&familyIds.has(nextRun.line_id);
          const nextStartsAtOrigin=nextIsFamily&&nameAt(nextLine,nextRun.enter_stop_idx)===originName;
          const nextIsDepot=nextLine&&/(입고|주박|기지)/.test(nextLine.name);
          if(nextStartsAtOrigin){
            const originIndex=indexByName.get(originName);
            trip.push(toMinute(nextRun.arrival_departure[0],minuteMode),toMinute(nextRun.arrival_departure[1],minuteMode),originIndex);
            correctedTerminals++;
          }else if(nextIsDepot){
            depotTerminations++;
          }else if(!nextRun){
            // 주간 데이터 경계에서 다음 run이 잘린 경우에는 반대 방향의 첫 구간 운전시분으로 보완합니다.
            const firstDeparture=line.stops[0].departure;
            const nextArrival=line.stops[1].arrival;
            const travelMinutes=Math.max(1,Math.round((nextArrival-firstDeparture)/60));
            const originIndex=indexByName.get(originName);
            const arrival=wrapMinute(trip.at(-2)+travelMinutes);
            trip.push(arrival,arrival,originIndex);
            correctedTerminals++;
          }
        }
        const serviceClass=classByLine[line.name]||0;
        const key=`${serviceClass}|${trip.join(',')}`;
        if(!seen.has(key)){seen.add(key);services.push({trip,serviceClass});}
      }
    }
  }
  services.sort((a,b)=>a.trip[1]-b.trip[1]||a.serviceClass-b.serviceClass||a.trip.length-b.trip.length||a.trip.join(',').localeCompare(b.trip.join(',')));
  return {trips:services.map(item=>item.trip),classes:services.map(item=>item.serviceClass),rawRuns,correctedTerminals,depotTerminations,excludedSingleStationRuns};
}

function calibrateServices(data,offsetByClass){
  data.trips=data.trips.map((trip,index)=>{
    const offset=offsetByClass[data.classes[index]]??offsetByClass.default??0;
    return trip.map((value,position)=>position%3===2?value:wrapMinute(value+offset));
  });
  const paired=data.trips.map((trip,index)=>({trip,serviceClass:data.classes[index]}));
  paired.sort((a,b)=>a.trip[1]-b.trip[1]||a.serviceClass-b.serviceClass||a.trip.length-b.trip.length||a.trip.join(',').localeCompare(b.trip.join(',')));
  data.trips=paired.map(item=>item.trip);
  data.classes=paired.map(item=>item.serviceClass);
  data.calibrationMinutes=offsetByClass;
  return data;
}

const gangseo=linePresentation('강서선','#6ccc6c');
const eunpyeong=linePresentation('은평선','#545454');
const ansanLine=context.lines.find(line=>line.name==='안산안양선');
const revisions={
  '강서선':{...gangseo,...calibrateServices(collectServices({familyLineNames:['강서선','강서선/급행'],stationNames:gangseo.stations,classByLine:{'강서선/급행':1}}),{0:89,1:89}),updateLine:true},
  '은평선':{...eunpyeong,...calibrateServices(collectServices({familyLineNames:['은평선'],stationNames:eunpyeong.stations}),{0:89}),updateLine:true},
  // 기존 표시가 전 편 1분 늦었으므로 원본 초 시각의 정상 반올림 뒤 보정축을 1분 당깁니다.
  '안산안양선':{stations:context.schedules['안산안양선'].s.slice(),...calibrateServices(collectServices({familyLineNames:['안산안양선','안산안양선/1','안산안양선/2'],stationNames:context.schedules['안산안양선'].s}),{0:88}),updateLine:false}
};
const output=`// 이 파일은 scripts/generate_metro_20260924.mjs로 인게임 JSON에서 생성했습니다. 직접 편집하지 마세요.
(function applyMetroSeptemberRevision(global){
  'use strict';
  const lines=typeof METRO_LINES!=='undefined'?METRO_LINES:global.METRO_LINES;
  const schedules=typeof METRO_SCHED!=='undefined'?METRO_SCHED:global.METRO_SCHED;
  const geo=typeof METRO_GEO!=='undefined'?METRO_GEO:global.METRO_GEO;
  const stationDb=typeof STATION_DB!=='undefined'?STATION_DB:global.STATION_DB;
  if(!Array.isArray(lines)||!schedules||!geo)return;
  const revisions=${JSON.stringify(revisions)};
  for(const [name,revision] of Object.entries(revisions)){
    const line=lines.find(item=>item.name===name);
    if(line&&revision.updateLine){
      line.color=revision.color;
      line.from=revision.stations[0];
      line.to=revision.stations.at(-1);
      line.n=revision.stations.length;
      line.stations=revision.stations.slice();
      line.routes=[{stations:revision.stations.slice(),xy:revision.xy.map(point=>point.slice())}];
    }
    if(revision.updateLine)geo[name]={m:revision.coords.map(point=>point.slice())};
    schedules[name]={s:revision.stations.slice(),t:revision.trips.map(trip=>trip.slice()),c:revision.classes.slice()};
    if(revision.updateLine&&stationDb){
      revision.stations.forEach((station,index)=>{
        const key=name==='강서선'&&station==='월곶'?'월곶(김포)역':name==='강서선'&&station==='상도'?'상도(강서선)역':station+'역';
        const previous=stationDb[key]||{};
        const [lon,lat]=revision.coords[index];
        stationDb[key]={...previous,lon,lat,platforms:Array.isArray(previous.platforms)?previous.platforms:[],lines:[...new Set([...(previous.lines||[]),name])]};
      });
    }
  }
  let removedSingleStationServices=0;
  for(const schedule of Object.values(schedules)){
    if(!Array.isArray(schedule.t))continue;
    const keep=schedule.t.map(trip=>Array.isArray(trip)&&trip.length>3);
    removedSingleStationServices+=keep.filter(value=>!value).length;
    schedule.t=schedule.t.filter((_,index)=>keep[index]);
    if(Array.isArray(schedule.c))schedule.c=schedule.c.filter((_,index)=>keep[index]);
  }
  global.NIMBI_METRO_SEPTEMBER_REVISION={
    version:'2026-09-24',source:'Mysterious Enterprise Timetable Export 20221025T213119Z.json',
    timezone:'Asia/Seoul',utcOffsetMinutes:540,
    lines:Object.fromEntries(Object.entries(revisions).map(([name,item])=>[name,{rawRuns:item.rawRuns,services:item.trips.length,correctedTerminals:item.correctedTerminals,depotTerminations:item.depotTerminations,excludedSingleStationRuns:item.excludedSingleStationRuns,expressServices:item.classes.filter(value=>value===1).length,calibrationMinutes:item.calibrationMinutes}])),
    removedSingleStationServices,exactGameCoordinates:true,exactRunTimes:true,terminalCorrection:true,preservedPassengerColors:true
  };
})(typeof globalThis!=='undefined'?globalThis:window);
`;
fs.writeFileSync(outputPath,output);
for(const [name,item] of Object.entries(revisions))console.log(`${name}: ${item.stations.length}역, 원시 ${item.rawRuns}회, 중복 제거 ${item.trips.length}편, 종점 보정 ${item.correctedTerminals}회, 입고 종착 ${item.depotTerminations}회, 급행 ${item.classes.filter(value=>value===1).length}편, 기준 보정 ${JSON.stringify(item.calibrationMinutes)}분`);
