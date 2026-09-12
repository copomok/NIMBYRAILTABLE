import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};vm.createContext(context);
for(const file of ['data/nimbi_rail_data.js','data/nimbi_north_ingame_routes.js','data/nimbi_station_data.js','data/nimbi_north_station_revision.js','data/nimbi_north_rail_revision.js'])
  vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')+(file.endsWith('nimbi_rail_data.js')?';globalThis.__trains=ALL_TRAINS':file.endsWith('nimbi_north_station_revision.js')?';globalThis.__stations=STATION_DB':''),context);
const trains=context.__trains,stations=context.__stations,ranges=Array.from(context.NIMBI_NORTH_FORMAL_RANGES);
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let n=minute(b)-minute(a);if(n<0)n+=1440;return n;};
const expected=[
  [5001,5026,13,'원산','청량리','ITX-새마을'],[5031,5058,14,'원산','청량리','ITX-새마을'],
  [5061,5078,9,'신의주','서울','ITX-새마을'],[5081,5084,2,'신의주','부산','ITX-새마을'],
  [5101,5124,12,'평양','원산','ITX-새마을'],[5131,5158,14,'평양','서울','ITX-새마을'],
  [5161,5174,7,'샘물동','평양','ITX-마음'],[5181,5200,10,'녕원','평양','ITX-마음'],
  [5201,5214,7,'혜산','원산','ITX-마음'],[5221,5234,7,'무산','원산','ITX-마음'],
  [5241,5258,9,'경흥','원산','ITX-마음'],[5261,5278,9,'평양','룡연','ITX-마음'],
  [5281,5290,5,'녕원','서울','ITX-마음'],[5301,5312,6,'신의주','원산','ITX-새마을'],
  [5351,5362,6,'샘물동','서울','ITX-새마을'],[8001,8012,6,'서울','블라디보스토크','KTX-산천'],
  [8021,8036,8,'신의주','부산','KTX-산천'],[9001,9018,9,'신의주','서울','KTX-산천'],
  [9521,9540,10,'원산','부산','KTX-이음'],[9701,9716,8,'경흥','남대구','KTX-산천'],
  [9751,9764,7,'경흥','목포','KTX-산천']
];

test('정식 개편 21개 계통은 지정 번호·편수·하행 방향을 쓴다',()=>{
  assert.equal(ranges.length,21);
  for(const [first,last,count,from,to,grade] of expected){
    const selected=trains.filter(train=>Number(train.no)>=first&&Number(train.no)<=last);
    assert.equal(selected.length,count*2,`#${first} 편수`);
    for(const train of selected){
      assert.equal(train.grade,grade,`#${train.no} 등급`);
      assert.equal(Number(train.no)%2,train.dir==='down'?1:0,`#${train.no} 홀짝`);
      assert.deepEqual(Array.from(train.boundary),train.dir==='down'?[from,to]:[to,from]);
    }
  }
});

test('시간표 생성기는 과거 시범 열차를 시간 원본으로 읽지 않는다',()=>{
  const source=fs.readFileSync(new URL('../data/nimbi_north_rail_revision.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/templateFromTrain|source\.get/);
  assert.match(source,/NIMBI_NORTH_INGAME_ROUTES/);
});

test('사진과 인게임 원본의 대표 운전시분을 그대로 쓴다',()=>{
  const durations=new Map([[5241,312],[8001,240],[8021,211],[9521,178],[9701,315],[9751,279]]);
  for(const [no,duration] of durations){const train=trains.find(item=>Number(item.no)===no);assert.equal(elapsed(train.stops[0].dep,train.stops.at(-1).arr),duration,`#${no}`);}
});

test('사진 제공 계통은 사진 방향의 승강장 숫자를 그대로 쓴다',()=>{
  const expectedPlatforms=new Map([
    [9521,{'원산':'1','통천':'1','고성':'3','간성':'1','속초':'1','양양':'1','주문':'1','강릉':'32','동강릉':'2','동해':'2','울진':'1','영해':'2','영덕':'1','강구':'2','청하':'2','포항':'5','경주':'3','북울산':'2','태화강':'5','울주':'5','좌천':'4','기장':'3','부산':'13'}],
    [5202,{'원산':'4','천내':'2','고원':'2','금야':'2','정평':'2','함흥':'6','락원':'1','삼호':'2','운포':'1','신포':'1','북청':'1','리원':'1','단천':'2','북단천':'2','혜산':'1'}],
    [5222,{'원산':'4','천내':'2','고원':'2','금야':'2','정평':'2','함주':'1','함흥':'6','락원':'1','삼호':'2','운포':'1','신포':'1','북청':'1','리원':'1','단천':'2','김책':'4','길주':'1','명천':'1','명간':'1','어랑':'2','경성':'4','청진':'1','무산':'1'}],
    [9752,{'목포':'1','도림':'3','무안':'5','함평':'4','광주':'16','정읍':'4','전주':'4','공주':'3','천안':'6','수영':'6','한강로':'4','청량리':'25','의정부':'2','양주':'2','동두천':'2','연천':'4','철원':'3','평강':'2','세포':'3','고산':'3','안변':'3','원산':'6','함흥':'8','북청':'2','단천':'2','김책':'2','명간':'2','경성':'3','청진':'1','라선':'1','경흥':'2'}]
  ]);
  for(const [no,platforms] of expectedPlatforms){const train=trains.find(item=>Number(item.no)===no);for(const [station,platform] of Object.entries(platforms)){const stop=train.stops.find(item=>item.s===station);if(stop?.dep||stop===train.stops.at(-1))assert.equal(stop.p,platform,`#${no} ${station}`);}}
});

test('사진 제공 네 계통은 사진 원본 방향 전 구간을 첫역 출발 기준 초 버림으로 변환한다',()=>{
  const aliases={통천읍:'통천',세포읍:'세포',고산읍:'고산',안변읍:'안변',고원읍:'고원',정평읍:'정평',금야읍:'금야',함주읍:'함주'};
  const canon=name=>aliases[name]||String(name||'').replace(/역$/,'');
  const cases=[[9521,'원산-부산 KTX','원산','부산'],[5202,'원산-혜산 ITX-마음','원산','혜산'],[5222,'원산-무산 ITX-마음','원산','무산'],[9752,'목포-경흥 KTX','목포','경흥']];
  for(const [no,routeName,from,to] of cases){
    const train=trains.find(item=>Number(item.no)===no),raw=Array.from(context.NIMBI_NORTH_INGAME_ROUTES[routeName]);
    const first=raw.findIndex(row=>canon(row.station)===from),last=raw.findIndex((row,index)=>index>first&&canon(row.station)===to),segment=raw.slice(first,last+1),origin=segment[0].departure,start=minute(train.stops[0].dep);
    for(const row of segment){if(!row.station)continue;const name=canon(row.station),stop=train.stops.find(item=>item.s===name);assert.ok(stop,`#${no} ${name}`);if(name!==from)assert.equal(minute(stop.arr),(start+Math.floor((row.arrival-origin)/60)+1440)%1440,`#${no} ${name} 도착`);if(name!==to){if(row.arrival===row.departure){assert.equal(stop.dep,null,`#${no} ${name} 0초 통과`);assert.equal(stop.p,undefined,`#${no} ${name} 통과 승강장`);}else assert.equal(minute(stop.dep),(start+Math.floor((row.departure-origin)/60)+1440)%1440,`#${no} ${name} 출발`);}}
  }
});

test('정식 계통 노선 정보에는 지선 명칭을 쓰지 않는다',()=>{
  for(const [first,last] of expected)for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last))assert.doesNotMatch(train.line,/지선/,`#${train.no} ${train.line}`);
});

test('ITX-마음·새마을은 노선상 전 역에 정차한다',()=>{
  for(const [first,last,,, ,grade] of expected.filter(row=>row[5].startsWith('ITX')))
    for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last))
      train.stops.slice(0,-1).forEach(stop=>{const photoExact=Number(train.no)>=5201&&Number(train.no)<=5234;if(!photoExact)assert.ok(stop.dep,`#${train.no} ${stop.s} 정차`);});
});

test('통과 불가역은 고속열차도 정차하고 통과역에는 승강장을 넣지 않는다',()=>{
  const forbidden=new Set(['기장','사천','함안','추풍령','불국사','입실','함평','라선','경흥','청진','단천','통천','고성','간성','속초','양양']);
  for(const [first,last] of expected)for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last)){
    train.stops.forEach((stop,index)=>{
      const photoExact=Number(train.no)>=9521&&Number(train.no)<=9540||Number(train.no)>=9751&&Number(train.no)<=9764;
      if(forbidden.has(stop.s)&&index<train.stops.length-1&&!photoExact)assert.ok(stop.dep,`#${train.no} ${stop.s} 통과 금지`);
      if(index<train.stops.length-1&&stop.dep==null)assert.equal(stop.p,undefined,`#${train.no} ${stop.s} 통과 승강장 제외`);
    });
  }
});

test('양방향 역 순서는 완전한 역순이며 시종착이 잘리지 않는다',()=>{
  for(const [first] of expected){const down=trains.find(t=>Number(t.no)===first),up=trains.find(t=>Number(t.no)===first+1);assert.deepEqual(down.stops.map(s=>s.s),up.stops.map(s=>s.s).toReversed(),`#${first}`);}
});

test('정식 시간표의 모든 역은 새 인게임 역 좌표에 연결된다',()=>{
  const names=new Set();for(const [first,last] of expected)for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last))for(const stop of train.stops)names.add(stop.s);
  for(const name of names)assert.ok(stations[name]||stations[`${name}역`],name);
});

test('복선역의 상·하행 정차 승강장은 인게임 구조에 맞게 분리된다',()=>{
  for(const [first] of expected){
    const down=trains.find(train=>Number(train.no)===first),up=trains.find(train=>Number(train.no)===first+1);
    for(const stop of down.stops.filter(item=>item.p!=null)){
      const opposite=up.stops.find(item=>item.s===stop.s),entry=stations[stop.s]||stations[`${stop.s}역`];
      if(opposite?.p!=null&&entry?.platforms?.length>=2)assert.notEqual(stop.p,opposite.p,`#${first} ${stop.s}`);
    }
  }
});

test('첫차와 막차는 일반·승인 예외 범위를 지킨다',()=>{
  const lateKtx=new Set([8001,8021,9701,9751]),lateItx=new Set([5081]);
  for(const [first,last] of expected){for(const dir of ['down','up']){
    const list=trains.filter(t=>Number(t.no)>=first&&Number(t.no)<=last&&t.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
    const firstDeparture=minute(list[0].stops[0].dep);
    if(first!==5351)assert.ok(firstDeparture>=300&&firstDeparture<=390,`#${first} ${dir} 첫차`);
    const arrival=minute(list.at(-1).stops.at(-1).arr),normalized=arrival<300?arrival+1440:arrival;
    const max=lateItx.has(first)?1620:lateKtx.has(first)?1560:1470;
    assert.ok(normalized<=max,`#${first} ${dir} 막차 ${list.at(-1).stops.at(-1).arr}`);
  }}
});

test('정차역 시각은 전 구간에서 역행하지 않는다',()=>{
  for(const [first,last] of expected)for(const train of trains.filter(t=>Number(t.no)>=first&&Number(t.no)<=last)){
    let lastTime=minute(train.stops[0].dep);
    for(const stop of train.stops.slice(1)){
      let now=minute(stop.arr);while(now<lastTime)now+=1440;assert.ok(now>=lastTime,`#${train.no} ${stop.s} 도착 역행`);lastTime=now;
      if(stop.dep){let dep=minute(stop.dep);while(dep<lastTime)dep+=1440;assert.ok(dep>=lastTime,`#${train.no} ${stop.s} 출발 역행`);lastTime=dep;}
    }
  }
});

test('기존 열차와 같은 승강장을 같은 분에 중복 점유하지 않는다',()=>{
  const isFormal=no=>expected.some(([first,last])=>no>=first&&no<=last),occupied=new Map();
  for(const train of trains)train.stops.forEach((stop,index)=>{
    if(stop.p==null||(stop.dep==null&&index<train.stops.length-1))return;
    for(const value of new Set([stop.arr,stop.dep].filter(Boolean))){const key=`${stop.s}|${stop.p}|${minute(value)}`,list=occupied.get(key)||[];list.push(Number(train.no));occupied.set(key,list);}
  });
  for(const [key,numbers] of occupied){const unique=[...new Set(numbers)];if(unique.some(isFormal))assert.equal(unique.length,1,`${key}: ${unique.join(',')}`);}
});

test('기존 열차를 포함한 전 구간에서 금지된 무단 추월이 없다',()=>{
  const isFormal=no=>expected.some(([first,last])=>no>=first&&no<=last);
  const noPass=new Set(['기장','사천','함안','추풍령','불국사','입실','함평','라선','경흥','청진','단천','통천','고성','간성','속초','양양']);
  const fastNoPass=new Set(['평창','포항','영덕','울진','함평','천안','수영','명간']);
  const timeline=train=>{let last=null,day=0;return train.stops.map((stop,index)=>{const value=stop.arr||stop.dep;if(!value)return {...stop,index,time:Number.NaN};let time=minute(value);if(last!=null&&time+day<last)day+=1440;time+=day;last=time;return {...stop,index,time};});};
  const lineTokens=train=>new Set(String(train.line).split(/[·,]/));
  const issues=[];
  for(let i=0;i<trains.length;i++)for(let j=i+1;j<trains.length;j++){
    const first=trains[i],second=trains[j];
    if(first.dir!==second.dir||(!isFormal(Number(first.no))&&!isFormal(Number(second.no))))continue;
    const firstLines=lineTokens(first),secondLines=lineTokens(second);if(![...firstLines].some(line=>secondLines.has(line)))continue;
    const a=timeline(first),b=timeline(second),byStation=new Map(b.map(stop=>[stop.s,stop]));
    for(const offset of [-1440,0,1440])for(let k=1;k<a.length;k++){
      const from=a[k-1],to=a[k],otherFrom=byStation.get(from.s),otherTo=byStation.get(to.s);
      if(!otherFrom||!otherTo||otherTo.index!==otherFrom.index+1)continue;
      const startGap=from.time-(otherFrom.time+offset),endGap=to.time-(otherTo.time+offset);
      const overlaps=Math.max(from.time,otherFrom.time+offset)<=Math.min(to.time,otherTo.time+offset);
      if(!overlaps||startGap*endGap>0)continue;
      const firstStop=first.stops[to.index],secondStop=second.stops[otherTo.index];
      const highSpeedRestriction=/KTX/.test(first.grade)&&/KTX/.test(second.grade)&&fastNoPass.has(to.s);
      const legal=!noPass.has(to.s)&&!highSpeedRestriction&&(!firstStop?.p||!secondStop?.p||firstStop.p!==secondStop.p);
      if(!legal)issues.push(`#${first.no}/#${second.no} ${from.s}-${to.s}`);
    }
  }
  assert.deepEqual([...new Set(issues)],[]);
});

test('정식 운용표는 전 편을 한 번씩 포함하고 회차시간 5분 이상으로 원 기점에 복귀한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8'),start=source.indexOf('const CONFIRMED_ROTATION ='),end=source.indexOf('\n// 042: 편성 운용',start);
  const rotationContext={ALL_TRAINS:trains};vm.createContext(rotationContext);vm.runInContext(source.slice(start,end)+';globalThis.rotation=CONFIRMED_ROTATION',rotationContext);
  const rotation=rotationContext.rotation,byNo=new Map(trains.map(train=>[train.no,train])),sets=new Map();
  for(const [first,last] of expected)for(let no=first;no<=last;no++){const item=rotation[String(no)];assert.ok(item,`#${no} 운용 누락`);sets.set(item.id,Array.from(item.seq));}
  for(const [id,sequence] of sets){const first=byNo.get(sequence[0]),last=byNo.get(sequence.at(-1));assert.equal(first.stops[0].s,last.stops.at(-1).s,`${id} 원 기점`);for(let i=1;i<sequence.length;i++){const previous=byNo.get(sequence[i-1]),next=byNo.get(sequence[i]);assert.equal(previous.stops.at(-1).s,next.stops[0].s,`${id} 회차역`);assert.ok(elapsed(previous.stops.at(-1).arr,next.stops[0].dep)>=5,`${id} 회차 ${sequence[i-1]}→${sequence[i]}`);}}
});
