import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8')+';globalThis.__trains=ALL_TRAINS',context);
vm.runInContext(fs.readFileSync(new URL('../data/nimbi_realplat.js',import.meta.url),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('../data/nimbi_regional_platforms.js',import.meta.url),'utf8')+';globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains;
const platforms=context.__platforms;
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let value=minute(b)-minute(a);if(value<0)value+=1440;return value;};
const groups=[
  [3001,3024,12,80,100,'평원선','무궁화호'],
  [3501,3528,14,60,90,'경원선','무궁화호'],
  [8001,8012,6,175,185,'경원선·동해선','KTX-산천'],
  [9001,9036,18,55,65,'경의선','KTX-산천'],
  [9051,9078,14,70,90,'평성선','KTX-이음'],
  [9101,9114,7,120,180,'평원선','KTX-이음'],
  [9521,9540,10,90,120,'동해선','KTX-이음'],
  [9551,9576,13,70,90,'경원선·경부고속선','KTX-이음'],
  [9581,9594,7,130,180,'동해선','KTX-이음'],
  [9601,9614,7,130,180,'동해선','KTX-이음'],
  [9701,9716,8,110,130,'대구선·동해선','KTX-산천'],
  [9751,9764,7,110,130,'호남고속선·경부고속선·경원선·동해선','KTX-산천']
];

test('북한 12개 계통은 지정 번호·등급·노선과 동일한 양방향 편수를 쓴다',()=>{
  for(const [first,last,count,, ,line,grade] of groups){
    const selected=trains.filter(train=>Number(train.no)>=first&&Number(train.no)<=last);
    assert.equal(selected.length,count*2,`${first}번대 총 편수`);
    assert.equal(selected.filter(train=>train.dir==='down').length,count,`${first}번대 하행`);
    assert.equal(selected.filter(train=>train.dir==='up').length,count,`${first}번대 상행`);
    assert.ok(selected.every(train=>train.line===line&&train.grade===grade),`${first}번대 노선·등급`);
    assert.ok(selected.every(train=>Number(train.no)%2===(train.dir==='down'?1:0)),`${first}번대 홀짝 방향`);
  }
});

test('사용자가 지정한 북한 계통의 하행 방향은 홀수편에 적용된다',()=>{
  const expected=new Map([
    [9001,['신의주','서울']],[9101,['샘물동','평양']],[9521,['원산','부산']],
    [9551,['원산','마포']],[9581,['혜산','원산']],[9601,['무산','원산']],
    [9701,['경흥','남대구']],[9751,['경흥','목포']]
  ]);
  for(const [no,[from,to]] of expected){
    const train=trains.find(item=>Number(item.no)===no);
    assert.equal(train.dir,'down',`#${no} 하행`);
    assert.deepEqual(Array.from(train.boundary),[from,to],`#${no} 운행 방향`);
    assert.equal(train.stops[0].s,from,`#${no} 기점`);
    assert.equal(train.stops.at(-1).s,to,`#${no} 종점`);
  }
});

test('경흥발 남대구·목포 KTX-산천은 합산 약 1시간 간격으로 교차 운행한다',()=>{
  const departures=trains.filter(train=>train.dir==='down'&&((Number(train.no)>=9701&&Number(train.no)<=9716)||(Number(train.no)>=9751&&Number(train.no)<=9764)))
    .map(train=>minute(train.stops[0].dep)).sort((a,b)=>a-b);
  for(let index=1;index<departures.length;index++){
    const gap=departures[index]-departures[index-1];
    assert.ok(gap>=50&&gap<=70,`경흥발 합산 배차 ${gap}분`);
  }
});

test('남대구-경흥은 대구선의 경산·건천·안강을 시간 있는 통과역으로 지난다',()=>{
  for(const train of trains.filter(item=>Number(item.no)>=9701&&Number(item.no)<=9716)){
    for(const station of ['경산','건천','안강']){
      const stop=train.stops.find(item=>item.s===station);
      assert.ok(stop?.arr,`#${train.no} ${station} 통과 시각`);
      assert.equal(stop.dep,null,`#${train.no} ${station} 통과`);
      assert.equal(stop.p,undefined,`#${train.no} ${station} 승강장 제외`);
    }
  }
});

test('첫차·막차와 계통별 배차간격 조건을 지킨다',()=>{
  for(const [first,last,,minGap,maxGap] of groups){
    const selected=trains.filter(train=>Number(train.no)>=first&&Number(train.no)<=last);
    for(const dir of ['down','up']){
      const list=selected.filter(train=>train.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
      const firstDeparture=minute(list[0].stops[0].dep);
      assert.ok(firstDeparture>=300&&firstDeparture<=390,`#${first} ${dir} 첫차`);
      const lastArrival=minute(list.at(-1).stops.at(-1).arr);
      assert.ok(lastArrival>=1320||lastArrival<=30,`#${first} ${dir} 막차`);
      for(let index=1;index<list.length;index++){
        const gap=elapsed(list[index-1].stops[0].dep,list[index].stops[0].dep);
        assert.ok(gap>=minGap&&gap<=maxGap,`#${list[index-1].no}/#${list[index].no} 배차 ${gap}분`);
      }
    }
  }
});

test('상행은 하행 구간시각을 역산하고 시종착역을 완전히 복원한다',()=>{
  for(const [first,last] of groups){
    const selected=trains.filter(train=>Number(train.no)>=first&&Number(train.no)<=last);
    const down=selected.find(train=>train.dir==='down'),up=selected.find(train=>train.dir==='up');
    assert.equal(down.stops[0].s,up.stops.at(-1).s,`#${first} 원 기점 복원`);
    assert.equal(down.stops.at(-1).s,up.stops[0].s,`#${first} 반대 기점 복원`);
    const downSegments=down.stops.slice(1).map((stop,index)=>elapsed(down.stops[index].dep||down.stops[index].arr,stop.arr||stop.dep));
    const upSegments=up.stops.slice(1).map((stop,index)=>elapsed(up.stops[index].dep||up.stops[index].arr,stop.arr||stop.dep));
    const reversed=downSegments.toReversed();
    assert.equal(upSegments.length,reversed.length,`#${first} 역산 구간 수`);
    upSegments.forEach((duration,index)=>assert.ok(Math.abs(duration-reversed[index])<=1,`#${first} 역산 ${index+1}구간`));
  }
});

test('원산-무산은 함흥을 양방향 동일 순서로 정차한다',()=>{
  const selected=trains.filter(train=>Number(train.no)>=9601&&Number(train.no)<=9614);
  for(const train of selected){
    const stations=train.stops.map(stop=>stop.s);
    assert.equal(stations.filter(station=>station==='함흥').length,1,`#${train.no} 함흥 횟수`);
    const hamju=stations.indexOf('함주읍'),hamheung=stations.indexOf('함흥'),gwangbok=stations.indexOf('광복1동');
    assert.ok((hamju<hamheung&&hamheung<gwangbok)||(gwangbok<hamheung&&hamheung<hamju),`#${train.no} 함흥 순서`);
    assert.ok(train.stops[hamheung].dep,`#${train.no} 함흥 정차`);
  }
});

test('원산-마포의 전곡만 인게임 원본대로 통과 처리한다',()=>{
  const selected=trains.filter(train=>Number(train.no)>=9551&&Number(train.no)<=9576);
  for(const train of selected){
    const stop=train.stops.find(item=>item.s==='전곡');
    assert.ok(stop?.arr,`#${train.no} 전곡 시각`);
    assert.equal(stop.dep,null,`#${train.no} 전곡 통과`);
    assert.equal(stop.p,undefined,`#${train.no} 전곡 승강장 제외`);
  }
});

test('인게임 방향별 승강장은 모든 영업 정차에 확정 매핑된다',()=>{
  for(const [first,last] of groups){
    for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last)){
      for(const stop of train.stops){
        if(stop.dep!=null||stop===train.stops.at(-1)){
          assert.equal(platforms[train.no]?.[stop.s],Number(stop.p),`#${train.no} ${stop.s} 승강장`);
        }else{
          assert.equal(platforms[train.no]?.[stop.s],undefined,`#${train.no} ${stop.s} 통과역 승강장 제외`);
        }
      }
    }
  }
});

test('기존 열차를 포함해 같은 승강장을 같은 분에 중복 점유하지 않는다',()=>{
  const isNew=no=>groups.some(([first,last])=>no>=first&&no<=last);
  const occupied=new Map();
  for(const train of trains){
    train.stops.forEach((stop,index)=>{
      if(stop.dep==null&&index!==train.stops.length-1)return;
      const platform=platforms[train.no]?.[stop.s]??stop.p;
      if(platform==null)return;
      for(const value of [stop.arr,stop.dep]){
        if(!value)return;
        const key=`${stop.s}|${platform}|${minute(value)}`;
        const list=occupied.get(key)||[];
        list.push(Number(train.no));occupied.set(key,list);
      }
    });
  }
  for(const [key,numbers] of occupied){
    const unique=[...new Set(numbers)];
    if(unique.some(isNew))assert.equal(unique.length,1,`${key}: ${unique.join(',')}`);
  }
});

test('확정 운용표는 모든 신설편을 한 번씩 포함하고 5분 이상 회차해 원 기점으로 복귀한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  const start=source.indexOf('const CONFIRMED_ROTATION =');
  const end=source.indexOf('\n// 042: 편성 운용',start);
  const rotationContext={ALL_TRAINS:trains};
  vm.createContext(rotationContext);
  vm.runInContext(source.slice(start,end)+';globalThis.__rotation=CONFIRMED_ROTATION',rotationContext);
  const rotation=rotationContext.__rotation;
  const expected=groups.flatMap(([first,last])=>Array.from({length:last-first+1},(_,index)=>String(first+index)));
  const assigned=[];
  const byNo=new Map(trains.map(train=>[train.no,train]));
  const northSets=new Map();
  for(const no of expected){
    const item=rotation[no];
    assert.ok(item,`#${no} 확정 운용 누락`);
    northSets.set(item.id,item.seq);
    assigned.push(no);
  }
  assert.equal(new Set(assigned).size,expected.length);
  for(const [id,sequence] of northSets){
    const first=byNo.get(sequence[0]),last=byNo.get(sequence.at(-1));
    assert.equal(first.stops[0].s,last.stops.at(-1).s,`${id} 원 기점 복귀`);
    for(let index=1;index<sequence.length;index++){
      const previous=byNo.get(sequence[index-1]),next=byNo.get(sequence[index]);
      assert.equal(previous.stops.at(-1).s,next.stops[0].s,`${id} ${index}회차역`);
      assert.ok(elapsed(previous.stops.at(-1).arr,next.stops[0].dep)>=5,`${id} ${index}회차시간`);
    }
  }
});
