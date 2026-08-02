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
  return (no>=1201&&no<=1236)||(no>=1241&&no<=1270)||(no>=4401&&no<=4428)||
    (no>=681&&no<=700)||(no>=801&&no<=828)||(no>=1331&&no<=1350)||
    (no>=1451&&no<=1454)||(no>=1501&&no<=1504);
};
const photoRebuilt=train=>{
  const no=Number(train.no);
  return regional(train)||(no>=1331&&no<=1350)||(no>=1451&&no<=1454)||(no>=1501&&no<=1504);
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

test('잠실–목포 SRT는 14왕복이며 방향별 배차가 60~90분이고 막차는 자정 이후 도착한다',()=>{
  const services=trains.filter(train=>Number(train.no)>=801&&Number(train.no)<=828);
  assert.equal(services.length,28);
  for(const direction of ['down','up']){
    const directional=services.filter(train=>train.dir===direction);
    const departures=directional
      .map(train=>minute(firstTime(train)))
      .sort((a,b)=>a-b);
    assert.equal(departures.length,14);
    for(let index=1;index<departures.length;index++){
      const gap=departures[index]-departures[index-1];
      assert.ok(gap>=60&&gap<=90,`${direction} ${gap}분`);
    }
    const last=directional.sort((a,b)=>minute(firstTime(a))-minute(firstTime(b))).at(-1);
    const arrival=minute(lastTime(last));
    assert.ok(arrival>=0&&arrival<=60,`${direction} 막차 도착 ${lastTime(last)}`);
  }
});

test('신설 열차의 모든 영업 정차역 승강장이 REAL_PLAT에 확정 매핑된다',()=>{
  for(const train of trains.filter(photoRebuilt)){
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
    ['1261','1264','1265','1268'],
    ['1262','1263','1266','1267'],
    ['1269','1270'],
    ['1202','1205','1210','1213'],
    ['1204','1207','1212','1215'],
    ['1201','1206','1209','1214'],
    ['1223','1228','1211','1216'],
    ['1203','1208','1231','1232','1235','1236'],
    ['1222','1225','1226','1227','1230','1233'],
    ['1221','1224','1229','1234'],
    Array.from({length:14},(_,i)=>String(4401+i*2)),
    Array.from({length:14},(_,i)=>String(4402+i*2)),
    Array.from({length:10},(_,i)=>String(681+i)),
    Array.from({length:10},(_,i)=>String(691+i)),
    ['801','804'],['803','806'],['802','805'],
    ['807','810'],['809','812'],['808','811'],
    ['813','816'],['815','818'],['814','817'],
    ['819','822'],['821','824'],['823','826'],['825','828'],['820','827']
    ,['1331','1336','1339','1344','1347','1350']
    ,['1333','1340','1343','1348']
    ,['1332','1335','1338','1341','1346','1349']
    ,['1334','1337','1342','1345']
    ,['1501','1504']
    ,['1452','1451','1454','1453']
    ,['1502','1503']
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
  const singleTrackSections={
    '교외선':new Set(['의정부','가능','송추','장흥','고양','관산','주교','능곡','행신']
      .slice(0,-1).map((station,index)=>[station,['의정부','가능','송추','장흥','고양','관산','주교','능곡','행신'][index+1]].sort().join('↔'))),
    '보은선':new Set(['문의','회인','수한','보은','장안','속리산','화남','화령','낙서','서상주','상주']
      .slice(0,-1).map((station,index)=>[station,['문의','회인','수한','보은','장안','속리산','화남','화령','낙서','서상주','상주'][index+1]].sort().join('↔')))
  };
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
        if(!singleTrackSections[line].has(key))continue;
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

test('지정 열차는 첫 역부터 전 구간을 순연하고 순환열차는 서울 종착 시각을 가진다',()=>{
  const stop=(no,station,occurrence=0)=>byNo.get(String(no)).stops
    .filter(item=>item.s===station)[occurrence];
  assert.equal(stop(918,'완도').dep,'21:05');
  assert.equal(stop(1934,'완도').dep,'21:08');

  assert.equal(stop(1761,'남횡성').arr,'8:06');
  assert.equal(stop(1761,'남횡성').dep,'8:07');
  assert.equal(stop(1761,'방림').arr,'8:15');
  assert.equal(stop(1761,'방림').dep,'8:16');
  assert.equal(stop(691,'잠실').dep,'7:29');
  assert.equal(stop(691,'남횡성').arr,'8:12');
  assert.equal(stop(691,'방림').arr,'8:14');

  const services=trains.filter(t=>Number(t.no)>=4401&&Number(t.no)<=4428);
  assert.equal(services.length,28);
  for(const train of services){
    const seoul=train.stops.filter(item=>item.s==='서울');
    assert.equal(seoul.length,2,`#${train.no} 서울 정차 순번`);
    assert.ok(seoul[0].dep&&!seoul[0].arr,`#${train.no} 서울 출발`);
    assert.ok(seoul[1].arr&&!seoul[1].dep,`#${train.no} 서울 종착`);
    // 2026-08-01 상하행 재정의: 남금호 경유 서울 진입은 상행(서울>행신 방면)이다
    if(train.dir==='up'){
      const namgeumho=train.stops.at(-2);
      assert.equal(namgeumho.s,'남금호',`#${train.no} 서울 진입 직전 역`);
      assert.equal(elapsed(namgeumho.dep,train.stops.at(-1).arr),4,`#${train.no} 남금호→서울`);
    }else{
      assert.equal(train.stops.at(-2).s,'행신',`#${train.no} 서울 진입 직전 역`);
    }
  }
  assert.ok(!trains.some(t=>Number(t.no)>=4429&&Number(t.no)<=4436));
});

test('강릉–부산 새마을과 의정부–대전 마음은 사진 템플릿·번호·배차를 지킨다',()=>{
  for(const no of Array.from({length:16},(_,index)=>1201+index)){
    const train=byNo.get(String(no));
    assert.equal(train.grade,'ITX-새마을');
    // 인게임 초 시각을 각각 버린 결과다. 분 단위 반올림값(169/165)을
    // 누적하지 않는다.
    assert.equal(elapsed(firstTime(train),lastTime(train)),167,`#${no} 소요시간`);
    const bulguksa=train.stops.find(item=>item.s==='불국사');
    const ipsil=train.stops.find(item=>item.s==='입실');
    assert.ok(bulguksa.arr&&!bulguksa.dep,`#${no} 불국사 통과`);
    assert.ok(ipsil.arr&&ipsil.dep,`#${no} 입실 정차`);
  }
  const services=trains.filter(train=>Number(train.no)>=1261&&Number(train.no)<=1270);
  assert.equal(services.length,10);
  for(const direction of ['down','up']){
    const departures=services.filter(train=>train.dir===direction)
      .map(train=>minute(firstTime(train))).sort((a,b)=>a-b);
    assert.equal(departures.join(','),(direction==='down'
      ?[326,566,746,986,1195]
      :[354,584,754,1004,1328]).join(','));
  }
  assert.ok(!services.some(train=>train.stops.some(stop=>stop.s==='대전조차장')));
  for(const train of services){
    assert.equal(train.boundary.join('→'),train.dir==='down'?'의정부→대전':'대전→의정부');
    assert.ok(!train.stops.some(stop=>['WP24013','WP24014'].includes(stop.s)));
  }
});

test('사진 원본의 초 시각은 누적 반올림 없이 역별로 독립 버림된다',()=>{
  const stop=(no,station)=>byNo.get(String(no)).stops.find(item=>item.s===station);
  assert.deepEqual([stop(1331,'황간').arr,stop(1331,'황간').dep],['5:27','5:27']);
  assert.deepEqual([stop(1451,'도림').arr,stop(1451,'도림').dep],['10:16','10:17']);
  assert.deepEqual([stop(1501,'도림').arr,stop(1501,'도림').dep],['5:30','5:31']);
  assert.equal(stop(1501,'부산').arr,'10:57');
  for(const station of ['불국사','입실']){
    const value=stop(1501,station);
    assert.ok(value.arr&&value.dep,`#1501 ${station} 정차`);
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
      const numeric=value=>/^\d{1,2}:\d{2}$/.test(value||'')?value:null;
      let start=minute(numeric(from.dep)||numeric(from.arr))+day;
      let end=minute(numeric(to.arr)||numeric(to.dep))+day;
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
  for(const current of prepared.filter(item=>{
    const no=Number(item.train.no);
    return photoRebuilt(item.train)&&!(no>=1261&&no<=1270);
  })){
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

test('2075는 불국사·입실에서 1069를 추월시키지 않는다',()=>{
  const slower=byNo.get('2075');
  const faster=byNo.get('1069');
  assert.equal(firstTime(slower),'11:46','2075 전 구간 4분 이동');
  for(const station of ['불국사','입실','북울산']){
    const left=slower.stops.find(item=>item.s===station);
    const right=faster.stops.find(item=>item.s===station);
    assert.ok(minute(left.arr)<minute(right.arr),`${station}에서 2075가 계속 선행`);
  }
  assert.ok(elapsed(
    slower.stops.find(item=>item.s==='입실').dep,
    faster.stops.find(item=>item.s==='입실').arr
  )>=4,
    '추월 불가역 입실에서 4분 시격');
});

test('교외선 노선도 정의는 하나만 존재한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  assert.equal((source.match(/name:'교외선'/g)||[]).length,1);
  assert.ok(!source.includes('gyowe:'));
});
