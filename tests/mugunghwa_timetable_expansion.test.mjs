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
    if(current!=null&&previous>=0&&current+offset<previous){
      offset+=1440;
    }
    if(arr!=null)arr+=offset;
    if(dep!=null){
      dep+=offset;
      if(arr!=null&&dep<arr)dep+=1440;
    }
    if(dep!=null||arr!=null)previous=dep??arr;
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
  const allowedGrades=new Set([
    'KTX','KTX-산천','KTX-이음','SRT','ITX-새마을','ITX-청춘','ITX-마음',
    '무궁화호','남도해양','국악와인'
  ]);
  for(const train of newTrains){
    assert.ok(allowedGrades.has(train.grade),`${train.no}: 허용되지 않은 열차 등급입니다.`);
    assert.equal(train.boundary[0],train.stops[0].s,`${train.no}: boundary 기점 불일치`);
    assert.equal(train.boundary[1],train.stops.at(-1).s,`${train.no}: boundary 종점 불일치`);
    assert.equal(train.dest,train.stops.at(-1).s,`${train.no}: 행선지와 종착역 불일치`);
    assert.ok(['down','up'].includes(train.dir),`${train.no}: 잘못된 운행 방향`);
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
    {min:1331,max:1350,headway:[80,140]}
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

  const integrated=newTrains
    .filter(train=>+train.no>=1451&&+train.no<=1504)
    .filter(train=>+train.no<=1454||+train.no>=1501);
  const expected={
    down:['1501','1451','1503','1453'],
    up:['1452','1502','1454','1504']
  };
  for(const dir of ['down','up']){
    const departures=integrated
      .filter(train=>train.dir===dir)
      .map(train=>({no:train.no,time:minute(train.stops[0].dep)}))
      .sort((a,b)=>a.time-b.time);
    assert.deepEqual(departures.map(entry=>entry.no),expected[dir],`${dir}: 남대구·부산 행선지가 번갈아야 합니다.`);
    assert.ok(departures[0].time>=300&&departures[0].time<=390,`${dir}: 통합 첫 운행은 05:00~06:30이어야 합니다.`);
    assert.ok(departures.at(-1).time>=1170&&departures.at(-1).time<=1230,`${dir}: 통합 막차는 19:30~20:30에 출발해야 합니다.`);
    for(let index=1;index<departures.length;index++){
      const gap=departures[index].time-departures[index-1].time;
      assert.ok(gap>=270&&gap<=330,`${dir}: 통합 배차 ${gap}분`);
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

function samePhysicalLine(a,b){
  const aLines=new Set(String(a.line||'').split('·').map(value=>value.trim()));
  return String(b.line||'').split('·').some(value=>aLines.has(value.trim()));
}

const noPassTrack=new Set([
  '사천','추풍령','석포','승부','소천','법전','홍성','율촌','춘양',
  '남악','일로','시종','영암','작천','장흥','별량','입실','불국사'
]);

function hasTime(value){
  return typeof value==='string'&&/^\d{1,2}:\d{2}$/.test(value);
}

function isPassStop(stop,index,length){
  if(index===0||index===length-1)return false;
  if(stop.arr==='통과'||stop.dep==='통과')return true;
  return hasTime(stop.arr)!==hasTime(stop.dep);
}

function trainPlatform(train,station){
  const legacy=station==='장수(전북)'?'장수':station==='북평(정선)'?'북평':station;
  return realPlat[train.no]?.[station]??realPlat[train.no]?.[legacy]??null;
}

function hasPassingPoint(a,b,aFrom,aTo,bFrom,bTo){
  const bByStation=new Map();
  for(let index=bFrom;index<=bTo;index++){
    const stop=b.stops[index];
    if(stop)bByStation.set(stop.s,{stop,index});
  }
  for(let index=aFrom;index<=aTo;index++){
    const aStop=a.stops[index];
    const match=bByStation.get(aStop.s);
    if(!match||noPassTrack.has(aStop.s))continue;
    if(isPassStop(aStop,index,a.stops.length)===isPassStop(match.stop,match.index,b.stops.length))continue;
    const aPlatform=trainPlatform(a,aStop.s);
    const bPlatform=trainPlatform(b,aStop.s);
    if(aPlatform!=null&&bPlatform!=null&&String(aPlatform)!==String(bPlatform))return true;
  }
  return false;
}

function followsSameCorridor(a,b,aFrom,aTo,bFrom,bTo){
  const aMiddle=a.stops.slice(aFrom+1,aTo).map(stop=>stop.s);
  const bMiddle=b.stops.slice(bFrom+1,bTo).map(stop=>stop.s);
  if(aMiddle.length<2||bMiddle.length<2)return true;
  const bStations=new Set(bMiddle);
  return aMiddle.some(station=>bStations.has(station));
}

function parallelTrackException(a,b,from,to){
  const corridor=['남안양','수원','오산','평택'];
  const fromIndex=corridor.indexOf(from);
  const toIndex=corridor.indexOf(to);
  const itx=train=>String(train.grade).startsWith('ITX');
  return fromIndex>=0&&toIndex>fromIndex&&
    ((itx(a)&&b.grade==='무궁화호')||(itx(b)&&a.grade==='무궁화호'));
}

function sharedTimedIntervals(a,b){
  if(a.dir!==b.dir||!samePhysicalLine(a,b))return [];
  const aStops=absoluteStops(a).map((stop,index)=>({...stop,index})).filter(stop=>stop.arrMinute!=null||stop.depMinute!=null);
  const bStops=absoluteStops(b).map((stop,index)=>({...stop,index})).filter(stop=>stop.arrMinute!=null||stop.depMinute!=null);
  const bIndexes=new Map();
  bStops.forEach((stop,index)=>{
    if(!bIndexes.has(stop.s))bIndexes.set(stop.s,[]);
    bIndexes.get(stop.s).push(index);
  });
  const matches=[];
  let cursor=-1;
  for(const stop of aStops){
    const found=(bIndexes.get(stop.s)||[]).find(index=>index>cursor);
    if(found==null)continue;
    matches.push({a:stop,b:bStops[found]});
    cursor=found;
  }
  const intervals=[];
  for(let index=1;index<matches.length;index++){
    const left=matches[index-1];
    const right=matches[index];
    if(parallelTrackException(a,b,left.a.s,right.a.s))continue;
    if(!followsSameCorridor(a,b,left.a.index,right.a.index,left.b.index,right.b.index))continue;
    intervals.push({
      from:left.a.s,
      to:right.a.s,
      a0:left.a.depMinute??left.a.arrMinute,
      a1:right.a.arrMinute??right.a.depMinute,
      b0:left.b.depMinute??left.b.arrMinute,
      b1:right.b.arrMinute??right.b.depMinute,
      passingPoint:hasPassingPoint(a,b,left.a.index,right.a.index,left.b.index,right.b.index)
    });
  }
  return intervals;
}

test('신설 열차는 기존 열차와 3분 시격을 확보하고 개활선 중복 운행이 없다',()=>{
  let comparedIntervals=0;
  let parallelIntervals=0;
  const checkedPairs=new Set();
  for(const train of newTrains){
    for(const other of trains){
      if(train===other)continue;
      const pair=[train.no,other.no].sort().join('/');
      if(checkedPairs.has(pair))continue;
      checkedPairs.add(pair);
      const intervals=sharedTimedIntervals(train,other);
      if(!intervals.length)continue;
      comparedIntervals+=intervals.length;
      const parallelPair=train.grade===other.grade&&intervals.filter(interval=>
        Math.abs((interval.a1-interval.a0)-(interval.b1-interval.b0))<=1
      ).length>=2;
      for(const interval of intervals){
        const startGap=interval.a0-interval.b0;
        const endGap=interval.a1-interval.b1;
        const sameSpeed=Math.abs(
          (interval.a1-interval.a0)-(interval.b1-interval.b0)
        )<=1;
        assert.ok(
          startGap!==0||endGap!==0,
          `${train.no}/${other.no} ${interval.from}–${interval.to}: 같은 선로를 같은 시각에 운행합니다.`
        );
        if(parallelPair&&sameSpeed){
          parallelIntervals++;
          assert.ok(
            Math.abs(startGap)>=3&&Math.abs(endGap)>=3,
            `${train.no}/${other.no} ${interval.from}–${interval.to}: 병행 운행 시격이 3분 미만입니다.`
          );
          assert.ok(
            startGap*endGap>0,
            `${train.no}/${other.no} ${interval.from}–${interval.to}: 개활선에서 운행 순서가 뒤집힙니다.`
          );
        }
        const comparableTrack=train.grade===other.grade||
          String(train.line||'')===String(other.line||'');
        if(comparableTrack&&startGap*endGap<0){
          assert.ok(
            interval.passingPoint,
            `${train.no}/${other.no} ${interval.from}–${interval.to}: 대피 가능한 역 없이 개활선에서 추월합니다.`
          );
        }
      }
    }
  }
  assert.ok(comparedIntervals>1000,'기존 열차와 충분한 수의 공유 구간을 비교해야 합니다.');
  assert.ok(parallelIntervals>100,'3분 시격 검증이 실제 병행 구간에서 실행되어야 합니다.');

  const integrated=trains
    .filter(train=>['1451','1452','1453','1454','1501','1502','1503','1504'].includes(train.no));
  assert.equal(integrated.length,8,'통합 배차 열차가 모두 존재해야 합니다.');
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
