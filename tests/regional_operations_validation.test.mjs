import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['nimbi_rail_data.js','nimbi_realplat.js','nimbi_regional_platforms.js']){
  const source=fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8');
  vm.runInContext(source,context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains;
const platforms=context.__platforms;
const byNo=new Map(trains.map(train=>[train.no,train]));
const minute=value=>{
  const [hour,min]=value.split(':').map(Number);
  return hour*60+min;
};
const firstTime=train=>train.stops.find(stop=>stop.dep||stop.arr)?.dep||
  train.stops.find(stop=>stop.dep||stop.arr)?.arr;
const lastTime=train=>[...train.stops].reverse().find(stop=>stop.arr||stop.dep)?.arr||
  [...train.stops].reverse().find(stop=>stop.arr||stop.dep)?.dep;
const elapsed=(from,to)=>{
  let value=minute(to)-minute(from);
  if(value<0)value+=1440;
  return value;
};
const regional=train=>{
  const no=Number(train.no);
  return (no>=1241&&no<=1252)||(no>=4401&&no<=4436)||
    (no>=681&&no<=700)||(no>=801&&no<=822);
};

test('지정 통과역과 황지역 정차가 SRT 전 편에 반영된다',()=>{
  for(const train of trains.filter(t=>Number(t.no)>=681&&Number(t.no)<=700)){
    const names=train.stops.map(stop=>stop.s);
    const yeoju=names.indexOf('여주');
    const wonju=names.indexOf('원주');
    const jijung=names.indexOf('지정');
    assert.ok(jijung>=0,`#${train.no} 지정`);
    assert.ok(Math.min(yeoju,wonju)<jijung&&jijung<Math.max(yeoju,wonju),`#${train.no} 지정 순서`);
    const stop=train.stops[jijung];
    assert.ok(stop.arr&&!stop.dep,`#${train.no} 지정 통과시각`);
  }
  for(const train of trains.filter(t=>Number(t.no)>=691&&Number(t.no)<=700)){
    assert.ok(train.stops.some(stop=>stop.s==='황지'&&stop.p),`#${train.no} 황지 정차`);
    assert.ok(!train.stops.some(stop=>stop.s==='태백황지'),`#${train.no} 태백황지 미사용`);
  }
});

test('잠실–목포 SRT는 11왕복이며 방향별 배차가 80~120분이다',()=>{
  const services=trains.filter(train=>Number(train.no)>=801&&Number(train.no)<=822);
  assert.equal(services.length,22);
  for(const direction of ['down','up']){
    const departures=services.filter(train=>train.dir===direction)
      .map(train=>minute(firstTime(train)))
      .sort((a,b)=>a-b);
    assert.equal(departures.length,11);
    for(let index=1;index<departures.length;index++){
      const gap=departures[index]-departures[index-1];
      assert.ok(gap>=80&&gap<=120,`${direction} ${gap}분`);
    }
  }
});

test('신설 열차의 모든 영업 정차역 승강장이 REAL_PLAT에 확정 매핑된다',()=>{
  for(const train of trains.filter(regional)){
    for(const stop of train.stops){
      if(stop.p==null)continue;
      assert.equal(platforms[train.no]?.[stop.s],Number(stop.p),`#${train.no} ${stop.s}`);
    }
  }
});

test('확정 운용표는 최소 5분 회차하고 모든 편성이 출발지로 복귀한다',()=>{
  const rotations=[
    ['1241','1244','1245','1248','1249','1252'],
    ['1242','1243','1246','1247','1250','1251'],
    Array.from({length:18},(_,i)=>String(4401+i*2)),
    Array.from({length:18},(_,i)=>String(4402+i*2)),
    Array.from({length:10},(_,i)=>String(681+i)),
    Array.from({length:10},(_,i)=>String(691+i)),
    ['801','802','805','806','809','810','813','814','817','818','821','822'],
    ['803','804','807','808','811','812','815','816'],
    ['819','820']
  ];
  const assigned=new Set;
  for(const sequence of rotations){
    assert.equal(sequence.length%2,0,sequence.join(','));
    const service=sequence.map(no=>{
      assert.ok(!assigned.has(no),`#${no} 중복 운용`);
      assigned.add(no);
      return byNo.get(no);
    });
    assert.equal(service[0].stops[0].s,service.at(-1).stops.at(-1).s,sequence.join(','));
    for(let index=1;index<service.length;index++){
      const previous=service[index-1];
      const current=service[index];
      assert.equal(previous.stops.at(-1).s,current.stops[0].s,`${previous.no}→${current.no} 회차역`);
      assert.ok(elapsed(lastTime(previous),firstTime(current))>=5,
        `${previous.no}→${current.no} 회차 ${elapsed(lastTime(previous),firstTime(current))}분`);
    }
  }
  for(const train of trains.filter(regional))assert.ok(assigned.has(train.no),`#${train.no} 운용 누락`);
});

test('교외선·보은선 단선 구간에서 반대방향 열차가 같은 폐색을 점유하지 않는다',()=>{
  for(const line of ['교외선','보은선']){
    const sections=new Map;
    for(const train of trains.filter(t=>t.line.split('·').includes(line))){
      let day=0;
      for(let index=0;index<train.stops.length-1;index++){
        const from=train.stops[index],to=train.stops[index+1];
        let start=minute(from.dep||from.arr)+day;
        let end=minute(to.arr||to.dep)+day;
        if(end<start){end+=1440;day+=1440;}
        const key=[from.s,to.s].sort().join('↔');
        const runs=sections.get(key)||[];
        runs.push({no:train.no,from:from.s,to:to.s,start,end});
        sections.set(key,runs);
      }
    }
    for(const [section,runs] of sections){
      for(let a=0;a<runs.length;a++)for(let b=a+1;b<runs.length;b++){
        const left=runs[a],right=runs[b];
        if(left.from!==right.to||left.to!==right.from)continue;
        for(const offset of [-1440,0,1440]){
          const overlap=Math.max(left.start,right.start+offset)<Math.min(left.end,right.end+offset);
          assert.ok(!overlap,`${line} ${section}: #${left.no}/#${right.no} 교행 충돌`);
        }
      }
    }
  }
});

test('신설 열차는 기존 전 편과 공유 선로에서 3분 시격을 지키고 개활 추월하지 않는다',()=>{
  const lineTokens=train=>new Set(train.line.split('·'));
  const legs=train=>{
    const result=[];
    let day=0;
    const timed=train.stops.filter(stop=>/^\d{1,2}:\d{2}$/.test(stop.arr||stop.dep||''));
    for(let index=0;index<timed.length-1;index++){
      const from=timed[index],to=timed[index+1];
      let start=minute(from.dep||from.arr)+day;
      let end=minute(to.arr||to.dep)+day;
      if(end<start){end+=1440;day+=1440;}
      result.push({from:from.s,to:to.s,start,end});
    }
    return result;
  };
  const prepared=trains.map(train=>({train,legs:legs(train),lines:lineTokens(train)}));
  let compared=0;
  const issues=[];
  const noPassing=new Set([
    '사천','함안','추풍령','불국사','입실',
    '법전','춘양','소천','승부','석포','황지',
    '고한','사북','화암','정선','북평','북평(정선)'
  ]);
  const platformAt=(train,station)=>platforms[train.no]?.[station]??null;
  const mayOvertakeAt=(station,a,b)=>{
    if(noPassing.has(station))return false;
    if(station==='평창'&&a.grade.match(/^(SRT|KTX)/)&&b.grade.match(/^(SRT|KTX)/))return false;
    const ap=platformAt(a,station),bp=platformAt(b,station);
    return ap==null||bp==null||ap!==bp;
  };
  for(const current of prepared.filter(item=>regional(item.train))){
    for(const other of prepared){
      if(current===other)continue;
      if(![...current.lines].some(line=>other.lines.has(line)))continue;
      for(const left of current.legs){
        for(const right of other.legs){
          if(left.from!==right.from||left.to!==right.to)continue;
          for(const offset of [-1440,0,1440]){
            const start=right.start+offset,end=right.end+offset;
            if(Math.max(left.start,start)>=Math.min(left.end,end))continue;
            compared++;
            const startGap=left.start-start,endGap=left.end-end;
            const reversed=startGap*endGap<=0;
            const legalOvertake=reversed&&(
              mayOvertakeAt(left.from,current.train,other.train)||
              mayOvertakeAt(left.to,current.train,other.train)
            );
            const sameStartPlatform=platformAt(current.train,left.from)!=null&&
              platformAt(current.train,left.from)===platformAt(other.train,left.from);
            const sameEndPlatform=platformAt(current.train,left.to)!=null&&
              platformAt(current.train,left.to)===platformAt(other.train,left.to);
            const platformGapViolation=
              (sameStartPlatform&&Math.abs(startGap)<3)||
              (sameEndPlatform&&Math.abs(endGap)<3);
            if((reversed&&!legalOvertake)||platformGapViolation){
              issues.push(`#${current.train.no}/#${other.train.no} ${left.from}–${left.to} `+
                `시격 ${startGap}/${endGap}분`);
            }
          }
        }
      }
    }
  }
  assert.ok(compared>50,'기존 열차와 공유 선로 비교가 충분히 실행되어야 한다');
  assert.deepEqual([...new Set(issues)],[],'공유 선로 시격·개활 추월 결함');
});

test('교외선 노선도 정의는 하나만 존재한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  assert.equal((source.match(/name:'교외선'/g)||[]).length,1);
  assert.ok(!source.includes('gyowe:'));
});
