import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_sched.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_schedule_updates.js','utf8'),context);

const line=vm.runInContext("METRO_SCHED['경부선']",context);
const revision=context.NIMBI_GYEONGBU_EXPRESS_REVISION;
assert.equal(revision.version,'2026-07-27');
assert.equal(revision.serviceObjects,50,'기존 급행 운용 객체 50개를 유지해야 합니다.');

const routeOrder=[
  '양주','의정부','도봉','청량리','장신대','종로5가','종로1가','서울','한강로',
  '구로','북안양','남안양','의왕','수원','병점','오산','평택','남평택',
  '성환','천안','아산','온양','신창','합덕'
];
const order=new Map(routeOrder.map((name,index)=>[name,index]));
const expressTrips=line.t.filter((_,index)=>line.c[index]===1);
assert.equal(expressTrips.length,50);

function records(trip){
  const result=[];
  for(let i=0;i<trip.length;i+=3){
    result.push({arr:trip[i],dep:trip[i+1],name:line.s[trip[i+2]]});
  }
  return result;
}

function splitLegs(trip){
  const items=records(trip);
  let previousSign=0;
  for(let i=1;i<items.length;i++){
    const diff=order.get(items[i].name)-order.get(items[i-1].name);
    const sign=Math.sign(diff);
    if(previousSign&&sign&&sign!==previousSign){
      return [items.slice(0,i),items.slice(i-1)];
    }
    if(sign)previousSign=sign;
  }
  return [items];
}

const legs=expressTrips.flatMap(splitLegs);
assert.equal(legs.length,90,'방향별 45회, 총 90회여야 합니다.');

const pairCounts={};
for(const leg of legs){
  const key=`${leg[0].name}→${leg.at(-1).name}`;
  pairCounts[key]=(pairCounts[key]||0)+1;
  const names=leg.map(item=>item.name);
  assert.ok(names.includes('청량리')&&names.includes('수원'),`${key}가 청량리–수원 공통 구간을 벗어났습니다.`);

  let previous=null;
  for(const item of leg){
    let current=item.dep;
    if(previous!==null&&current<previous-600)current+=1440;
    assert.ok(previous===null||current>=previous,`${key}의 시각 순서가 역전되었습니다.`);
    previous=current;
  }
}

assert.deepEqual(pairCounts,{
  '양주→수원':11,
  '수원→양주':11,
  '의정부→수원':10,
  '수원→의정부':10,
  '의정부→남평택':12,
  '남평택→의정부':12,
  '청량리→신창':8,
  '신창→청량리':8,
  '청량리→합덕':4,
  '합덕→청량리':4
});

const departures={};
for(const leg of legs){
  const key=`${leg[0].name}→${leg.at(-1).name}`;
  (departures[key]||(departures[key]=[])).push(leg[0].dep);
}
const toMinute=value=>{
  const [hour,min]=value.split(':').map(Number);
  return hour*60+min;
};
for(const [key,times] of Object.entries({
  '양주→수원':revision.departures.A_S,
  '수원→양주':revision.departures.A_N,
  '의정부→수원':revision.departures.U_S,
  '수원→의정부':revision.departures.U_N,
  '의정부→남평택':revision.departures.N_S,
  '남평택→의정부':revision.departures.N_N,
  '청량리→신창':revision.departures.S_S,
  '신창→청량리':revision.departures.S_N,
  '청량리→합덕':revision.departures.H_S,
  '합덕→청량리':revision.departures.H_N
})){
  assert.equal(
    departures[key].toSorted((a,b)=>a-b).join(','),
    Array.from(times,toMinute).toSorted((a,b)=>a-b).join(','),
    `${key} 출발 시각 불일치`
  );
}

const appSource=fs.readFileSync('js/nimbi_rail.js','utf8');
assert.match(appSource,/const METRO_MODE_TABS=\[[^\]]*'notice'/,'전철 탭에도 공지 진입점이 있어야 합니다.');
const notices=fs.readFileSync('data/nimbi_rail_notices.js','utf8');
assert.ok(notices.includes('경부선 급행 시간표가 수도권 중심으로 개정됩니다'),'급행 시간표 개정 공지가 누락되었습니다.');

console.log('metro express revision: 5개 계통·90회·공지 노출 검증 완료');
