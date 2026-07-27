// ── 전철 공통 운행 정책 ──
// 자정 전에 출발해 계속 운행하는 열차는 유지하되, 00:00~03:59에 새로 시발하는 운행은 제거합니다.
(function applyMetroServicePolicy(global){
  'use strict';

  const schedule=typeof METRO_SCHED!=='undefined'?METRO_SCHED:global.METRO_SCHED;
  if(!schedule)return;

  const wrap=value=>((value%1440)+1440)%1440;
  const isMidnightStart=departure=>wrap(departure)<240;
  function legRanges(trip){
    const ranges=[];
    const count=trip.length/3;
    const indexAt=position=>trip[position*3+2];
    let start=0;
    for(let i=1;i<count-1;i++){
      if(indexAt(i-1)===indexAt(i+1)){
        ranges.push([start,i]);
        start=i;
      }else if(indexAt(i)===indexAt(i+1)){
        ranges.push([start,i]);
        start=i+1;
      }
    }
    ranges.push([start,count-1]);
    return ranges.filter(([from,to])=>to>from);
  }

  let removedLegs=0;
  let splitServices=0;
  const affectedLines={};

  for(const [lineName,line] of Object.entries(schedule)){
    if(!Array.isArray(line.t))continue;
    const classes=Array.isArray(line.c)?line.c:null;
    const nextTrips=[];
    const nextClasses=[];
    line.t.forEach((trip,serviceIndex)=>{
      const ranges=legRanges(trip);
      const keep=ranges.map(([start])=>!isMidnightStart(trip[start*3+1]));
      const removed=keep.filter(value=>!value).length;
      if(!removed){
        nextTrips.push(trip);
        if(classes)nextClasses.push(classes[serviceIndex]);
        return;
      }
      removedLegs+=removed;
      affectedLines[lineName]=(affectedLines[lineName]||0)+removed;

      const groups=[];
      for(let i=0;i<ranges.length;){
        if(!keep[i]){i++;continue;}
        const first=i;
        while(i+1<ranges.length&&keep[i+1])i++;
        groups.push([first,i]);
        i++;
      }
      if(groups.length>1)splitServices+=groups.length-1;
      groups.forEach(([firstRange,lastRange])=>{
        const from=ranges[firstRange][0];
        const to=ranges[lastRange][1];
        const fragment=trip.slice(from*3,to*3+3);
        if(firstRange>0)fragment[0]=wrap(fragment[1]-1);
        if(lastRange<ranges.length-1)fragment[fragment.length-2]=fragment[fragment.length-3];
        nextTrips.push(fragment);
        if(classes)nextClasses.push(classes[serviceIndex]);
      });
    });
    line.t=nextTrips;
    if(classes)line.c=nextClasses;
  }

  global.NIMBI_METRO_SERVICE_POLICY={
    version:'2026-07-27',
    cutoffMinutes:240,
    removedLegs,
    splitServices,
    affectedLines
  };
})(typeof globalThis!=='undefined'?globalThis:window);
