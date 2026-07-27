import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['data/nimbi_metro_sched.js','data/nimbi_metro_schedule_updates.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
}

const beforePolicy=vm.runInContext('JSON.parse(JSON.stringify(METRO_SCHED))',context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_service_policy.js','utf8'),context);
const schedule=vm.runInContext('METRO_SCHED',context);
const policy=context.NIMBI_METRO_SERVICE_POLICY;
assert.equal(policy.cutoffMinutes,240);
assert.equal(policy.targetLine,'경부선');
assert.equal(policy.targetClass,1);

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
let expressMidnightStarts=0;
let expressThroughMidnightTrips=0;
const gyeongbu=schedule['경부선'];
for(let serviceIndex=0;serviceIndex<gyeongbu.t.length;serviceIndex++){
  if(gyeongbu.c[serviceIndex]!==1)continue;
  const trip=gyeongbu.t[serviceIndex];
    for(const [start,end] of legRanges(trip)){
      const departure=wrap(trip[start*3+1]);
      if(departure<240)expressMidnightStarts++;
      if(departure>=240){
        const clocks=[];
        for(let i=start;i<=end;i++)clocks.push(wrap(trip[i*3]),wrap(trip[i*3+1]));
        if(clocks.some(clock=>clock<240))expressThroughMidnightTrips++;
      }
    }
}
assert.equal(expressMidnightStarts,0,'00:00~03:59에 새로 시발하는 경부선 급행이 남아 있습니다.');
assert.ok(expressThroughMidnightTrips>0,'자정 전에 출발해 자정을 넘겨 운행하는 경부선 급행은 유지해야 합니다.');

for(const lineName of Object.keys(schedule)){
  if(lineName==='경부선')continue;
  assert.deepEqual(schedule[lineName],beforePolicy[lineName],`${lineName} 시간표를 경부선 급행 정책이 변경했습니다.`);
}
const beforeLocal=beforePolicy['경부선'].t.filter((_,index)=>beforePolicy['경부선'].c[index]!==1);
const afterLocal=gyeongbu.t.filter((_,index)=>gyeongbu.c[index]!==1);
assert.deepEqual(afterLocal,beforeLocal,'경부선 일반 전철 시간표는 변경하면 안 됩니다.');

const synthetic={
  METRO_SCHED:{
    '경부선':{s:['가','나'],t:[[0,30,0,40,40,1],[0,30,0,40,40,1]],c:[1,0]},
    '다른선':{s:['다','라'],t:[[0,30,0,40,40,1]],c:[1]}
  }
};
vm.createContext(synthetic);
vm.runInContext(fs.readFileSync('data/nimbi_metro_service_policy.js','utf8'),synthetic);
assert.equal(synthetic.METRO_SCHED['경부선'].t.length,1,'자정 이후 경부선 급행만 제거해야 합니다.');
assert.equal(synthetic.METRO_SCHED['경부선'].c[0],0,'경부선 일반 전철은 유지해야 합니다.');
assert.equal(synthetic.METRO_SCHED['다른선'].t.length,1,'다른 노선 급행은 유지해야 합니다.');

const index=fs.readFileSync('index.html','utf8');
assert.ok(index.includes('data/nimbi_metro_service_policy.js'),'전철 공통 운행 정책 파일이 로드되어야 합니다.');
const sw=fs.readFileSync('sw.js','utf8');
assert.ok(sw.includes('/NIMBYRAILTABLE/data/nimbi_metro_service_policy.js'),'오프라인 캐시에 운행 정책 파일이 포함되어야 합니다.');

console.log(`metro service policy: 경부선 급행 전용·자정 통과 ${expressThroughMidnightTrips}편 유지·타 노선 원상 보존 검증 완료`);
