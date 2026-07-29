import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(
  `${fs.readFileSync('data/nimbi_rail_data.js','utf8')};this.trains=ALL_TRAINS;`,
  context
);
vm.runInContext(
  `${fs.readFileSync('data/nimbi_realplat.js','utf8')};this.realPlat=REAL_PLAT;`,
  context
);
vm.runInContext(
  `${fs.readFileSync('data/nimbi_metro_sched.js','utf8')};this.metro=METRO_SCHED;`,
  context
);

const trains=Array.from(context.trains);
const realPlat=context.realPlat;
const metro=context.metro;
const newNumbers=[
  ...Array.from({length:18},(_,i)=>String(1311+i)),
  ...Array.from({length:20},(_,i)=>String(1331+i)),
  '1451','1452','1453','1454',
  '1501','1502','1503','1504'
];
const newTrains=newNumbers.map(no=>trains.find(train=>train.no===no));

function minute(value){
  const [hour,min]=value.split(':').map(Number);
  return hour*60+min;
}

function absoluteStops(train){
  let offset=0;
  let previous=-1;
  return train.stops.map(stop=>{
    let arr=stop.arr&&stop.arr!=='통과'?minute(stop.arr):null;
    let dep=stop.dep&&stop.dep!=='통과'?minute(stop.dep):null;
    const current=arr??dep;
    if(previous>=0&&current+offset<previous){
      offset+=1440;
    }
    if(arr!=null)arr+=offset;
    if(dep!=null){
      dep+=offset;
      if(arr!=null&&dep<arr)dep+=1440;
    }
    previous=dep??arr;
    return {...stop,arrMinute:arr,depMinute:dep};
  });
}

test('신규 무궁화호 번호와 왕복 횟수가 명세와 일치한다',()=>{
  assert.ok(newTrains.every(Boolean),'신규 열차번호가 모두 존재해야 합니다.');
  assert.equal(new Set(trains.map(train=>train.no)).size,trains.length,'열차번호가 중복되면 안 됩니다.');
  assert.equal(newTrains.filter(train=>+train.no>=1311&&+train.no<=1328).length,18);
  assert.equal(newTrains.filter(train=>+train.no>=1331&&+train.no<=1350).length,20);
  assert.equal(newTrains.filter(train=>+train.no>=1451&&+train.no<=1454).length,4);
  assert.equal(newTrains.filter(train=>+train.no>=1501&&+train.no<=1504).length,4);
  assert.equal(trains.find(train=>train.no==='1501').boundary.join('→'),'목포→부산');
});

test('신규 열차는 단조 증가하고 중간 정차는 모두 1분이다',()=>{
  for(const train of newTrains){
    const stops=absoluteStops(train);
    assert.ok(minute(train.stops[0].dep)>=300,`${train.no}: 05시 전에 출발하면 안 됩니다.`);
    assert.ok(minute(train.stops[0].dep)<1440,`${train.no}: 자정 이후 새 운행을 시작하면 안 됩니다.`);
    for(let i=0;i<stops.length;i++){
      const stop=stops[i];
      if(i===0){
        assert.equal(stop.arr,null,`${train.no}: 시발역 도착 시각은 null이어야 합니다.`);
      }else if(i===stops.length-1){
        assert.equal(stop.dep,null,`${train.no}: 종착역 출발 시각은 null이어야 합니다.`);
      }else{
        assert.equal(stop.depMinute-stop.arrMinute,1,`${train.no} ${stop.s}: 정차시간은 1분이어야 합니다.`);
      }
      if(i>0){
        const previous=stops[i-1];
        assert.ok(
          stop.arrMinute>=(previous.depMinute??previous.arrMinute),
          `${train.no} ${previous.s}→${stop.s}: 시각이 역전되었습니다.`
        );
      }
    }
    assert.ok(
      stops.at(-1).arrMinute<=1530,
      `${train.no}: 종착 시각은 다음 날 01:30 이전이어야 합니다.`
    );
  }
});

test('각 계통 첫 운행과 배차 간격이 명세 범위 안이다',()=>{
  const groups=[
    {min:1311,max:1328,headway:[90,135]},
    {min:1331,max:1350,headway:[80,140]},
    {min:1451,max:1454},
    {min:1501,max:1504}
  ];
  for(const group of groups){
    for(const dir of ['down','up']){
      const departures=newTrains
        .filter(train=>+train.no>=group.min&&+train.no<=group.max&&train.dir===dir)
        .map(train=>minute(train.stops[0].dep))
        .sort((a,b)=>a-b);
      assert.ok(departures[0]>=300&&departures[0]<=390,`${group.min} ${dir}: 첫 운행은 05:00~06:30이어야 합니다.`);
      if(group.headway){
        for(let i=1;i<departures.length;i++){
          const gap=departures[i]-departures[i-1];
          assert.ok(gap>=group.headway[0]&&gap<=group.headway[1],`${group.min} ${dir}: 배차 ${gap}분`);
        }
      }
    }
  }
});

test('인게임 승강장과 동명이역 구분이 열차 데이터에 반영된다',()=>{
  for(const train of newTrains){
    assert.ok(realPlat[train.no],`${train.no}: 인게임 승강장 정보가 없습니다.`);
    for(const stop of train.stops){
      assert.ok(Number.isFinite(realPlat[train.no][stop.s]),`${train.no} ${stop.s}: 승강장이 없습니다.`);
    }
  }
  for(const train of trains.filter(train=>train.line.split('·').includes('소백선'))){
    assert.ok(!train.stops.some(stop=>stop.s==='장수'),`${train.no}: 소백선 장수 동명이역 미분리`);
  }
  for(const train of trains.filter(train=>train.line.split('·').includes('정선선')||(+train.no>=1751&&+train.no<=1760))){
    assert.ok(!train.stops.some(stop=>stop.s==='북평'),`${train.no}: 정선선 북평 동명이역 미분리`);
  }
});

function metroTrips(lineName,orderedStations){
  const data=metro[lineName];
  const result=[];
  for(const raw of data.t){
    const sequence=[];
    let offset=0;
    let previous=-1;
    for(let index=0;index<raw.length;index+=3){
      let arr=raw[index]+offset;
      let dep=raw[index+1]+offset;
      if(previous>=0&&arr<previous-720){
        offset+=1440;
        arr+=1440;
        dep+=1440;
      }
      previous=arr;
      sequence.push({name:data.s[raw[index+2]],arr,dep});
    }
    let cursor=-1;
    const selected=[];
    for(const station of orderedStations){
      const found=sequence.findIndex((entry,index)=>index>cursor&&entry.name===station);
      if(found>=0){
        selected.push(sequence[found]);
        cursor=found;
      }
    }
    if(selected.length>=2&&selected.at(-1).arr-selected[0].arr<180){
      result.push(selected);
    }
  }
  return result;
}

test('서울–남대구 계통은 천안–세천 전철 공유구간을 실제 운행표로 검증한다',()=>{
  const corridor={
    down:[
      ['경부선',['천안','조치원']],
      ['세종세천선',['조치원','세종','반석','서대전','대전','세천']]
    ],
    up:[
      ['세종세천선',['세천','대전','서대전','반석','세종','조치원']],
      ['경부선',['조치원','천안']]
    ]
  };
  const passingStations=new Set(['천안','조치원','세종','반석','서대전','대전','세천']);
  let comparedTrips=0;
  let overtakesChecked=0;
  for(const train of newTrains.filter(train=>+train.no>=1311&&+train.no<=1328)){
    const trainTimes=Object.fromEntries(absoluteStops(train).map(stop=>[
      stop.s,(stop.arrMinute??stop.depMinute)
    ]));
    if(train.dir==='down')trainTimes.세천=trainTimes.대전+5;
    else trainTimes.세천=trainTimes.대전-5;
    for(const [lineName,stations] of corridor[train.dir]){
      assert.ok(metro[lineName],`${lineName} 전철 시간표가 필요합니다.`);
      for(const trip of metroTrips(lineName,stations)){
        const common=stations.filter(station=>
          trainTimes[station]!=null&&trip.some(entry=>entry.name===station)
        );
        if(common.length<2)continue;
        comparedTrips++;
        const metroTimes=Object.fromEntries(trip.map(entry=>[
          entry.name,(entry.arr+entry.dep)/2
        ]));
        for(const shift of [-1440,0,1440]){
          const differences=common.map(station=>trainTimes[station]-(metroTimes[station]+shift));
          for(let i=1;i<differences.length;i++){
            if(differences[i-1]*differences[i]>=0)continue;
            overtakesChecked++;
            assert.ok(
              passingStations.has(common[i-1])||passingStations.has(common[i]),
              `${train.no}: ${common[i-1]}–${common[i]} 역간에서 전철을 무단 추월합니다.`
            );
          }
        }
      }
    }
  }
  assert.ok(comparedTrips>100,'공유구간 전철 운행과 충분히 비교해야 합니다.');
  assert.ok(overtakesChecked>0,'전철 추월 검증 경로가 실제 실행되어야 합니다.');
});

test('밀양선·세종세천선 기차 노선도가 신규 계통에 연결된다',()=>{
  const source=fs.readFileSync('js/nimbi_rail.js','utf8');
  assert.match(source,/'밀양선':'miryang'/);
  assert.match(source,/'세종세천선':'sejongsecheon'/);
  for(const station of ['남대구','가창','청도','밀양','삼랑진','물금','북부산']){
    assert.match(source,new RegExp(`miryang:[\\s\\S]*?\\{n:'${station}'`));
  }
  for(const station of ['천안','조치원','세종','판암','서대전','대전']){
    assert.match(source,new RegExp(`sejongsecheon:[\\s\\S]*?\\{n:'${station}'`));
  }
});
