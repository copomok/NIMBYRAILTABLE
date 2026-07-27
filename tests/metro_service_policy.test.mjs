import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of [
  'data/nimbi_metro_sched.js',
  'data/nimbi_metro_schedule_updates.js',
  'data/nimbi_metro_service_policy.js'
]){
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
}

const schedule=vm.runInContext('METRO_SCHED',context);
const policy=context.NIMBI_METRO_SERVICE_POLICY;
assert.equal(policy.cutoffMinutes,240);
assert.ok(policy.removedLegs>0,'자정 이후 시발편 제거 내역이 있어야 합니다.');

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

const wrap=value=>((value%1440)+1440)%1440;
let remainingMidnightStarts=0;
let throughMidnightTrips=0;
for(const line of Object.values(schedule)){
  for(const trip of line.t){
    for(const [start,end] of legRanges(trip)){
      const departure=wrap(trip[start*3+1]);
      if(departure<240)remainingMidnightStarts++;
      if(departure>=240){
        const clocks=[];
        for(let i=start;i<=end;i++)clocks.push(wrap(trip[i*3]),wrap(trip[i*3+1]));
        if(clocks.some(clock=>clock<240))throughMidnightTrips++;
      }
    }
  }
}
assert.equal(remainingMidnightStarts,0,'00:00~03:59에 새로 시발하는 전철이 남아 있습니다.');
assert.ok(throughMidnightTrips>0,'자정 전에 출발해 자정을 넘겨 운행하는 열차는 유지해야 합니다.');

const index=fs.readFileSync('index.html','utf8');
assert.ok(index.includes('data/nimbi_metro_service_policy.js'),'전철 공통 운행 정책 파일이 로드되어야 합니다.');
const sw=fs.readFileSync('sw.js','utf8');
assert.ok(sw.includes('/NIMBYRAILTABLE/data/nimbi_metro_service_policy.js'),'오프라인 캐시에 운행 정책 파일이 포함되어야 합니다.');

console.log(`metro service policy: 자정 이후 시발 ${policy.removedLegs}편 제거·자정 통과 ${throughMidnightTrips}편 유지 검증 완료`);
