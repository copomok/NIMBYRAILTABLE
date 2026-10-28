import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const context={};vm.createContext(context);
for(const file of ['data/nimbi_rail_data.js','data/nimbi_north_ingame_routes.js','data/nimbi_station_data.js','data/nimbi_north_station_revision.js','data/nimbi_north_rail_revision.js','data/nimbi_gyeongui_20261027_revision.js','data/nimbi_nyongwon_20261027_stations.js'])
  vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')+(file.endsWith('nimbi_rail_data.js')?';globalThis.__trains=ALL_TRAINS':file.endsWith('nimbi_north_station_revision.js')?';globalThis.__stations=STATION_DB':''),context);
const trains=context.__trains,stations=context.__stations,ranges=Array.from(context.NIMBI_NORTH_FORMAL_RANGES);
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let n=minute(b)-minute(a);if(n<0)n+=1440;return n;};
const expected=[
  [5001,5026,13,'원산','청량리','ITX-새마을'],[5031,5058,14,'원산','청량리','ITX-새마을'],
  [5061,5090,15,'신의주','서울','ITX-새마을'],[5091,5094,2,'신의주','부산','ITX-새마을'],
  [5101,5124,12,'평양','원산','ITX-새마을'],[5131,5158,14,'평양','서울','ITX-새마을'],
  [5161,5174,7,'만포','평양','ITX-마음'],[5181,5200,10,'녕원','평양','ITX-마음'],
  [5201,5214,7,'혜산','원산','ITX-마음'],[5221,5234,7,'무산','원산','ITX-마음'],
  [5241,5258,9,'경흥','원산','ITX-마음'],[5261,5278,9,'평양','룡연','ITX-마음'],
  [5281,5292,6,'녕원','서울','ITX-새마을'],[5301,5312,6,'신의주','원산','ITX-새마을'],
  [5351,5362,6,'만포','서울','ITX-새마을'],[8001,8012,6,'서울','블라디보스토크','KTX-산천'],
  [8021,8040,10,'신의주','부산','KTX-산천'],[9001,9018,9,'신의주','서울','KTX-산천'],
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
  const durations=new Map([[5241,312],[8001,240],[8021,237],[9521,178],[9701,315],[9751,279]]);
  for(const [no,duration] of durations){const train=trains.find(item=>Number(item.no)===no);assert.equal(elapsed(train.stops[0].dep,train.stops.at(-1).arr),duration,`#${no}`);}
});

test('해주 경유 새마을은 추가 사진의 1~14행 실측 시각·승강장을 사용한다',()=>{
  const down=trains.find(train=>train.no==='5131'),up=trains.find(train=>train.no==='5132');
  const at=(train,name)=>train.stops.find(stop=>stop.s===name);
  assert.equal(elapsed(down.stops[0].dep,at(down,'두단').arr),4);
  assert.equal(at(down,'두단').p,'2');
  assert.equal(elapsed(down.stops[0].dep,at(down,'해주').arr),92);
  assert.equal(elapsed(down.stops[0].dep,at(down,'개풍').arr),129);
  assert.equal(elapsed(down.stops[0].dep,down.stops.at(-1).arr),178);
  assert.equal(elapsed(up.stops[0].dep,up.stops.at(-1).arr),178);
});

test('만포–평양·서울은 공통 구간에서 한 계통처럼 60~95분 통합 배차한다',()=>{
  const both=trains.filter(train=>[5161,5351].some(first=>Number(train.no)>=first&&Number(train.no)<=first+(first===5161?13:11)));
  assert.equal(both.length,26);
  const down=both.filter(train=>train.dir==='down').map(train=>minute(train.stops[0].dep)).sort((a,b)=>a-b);
  const up=both.filter(train=>train.dir==='up').map(train=>minute(train.stops.find(stop=>stop.s==='평양').dep)).sort((a,b)=>a-b);
  for(const starts of [down,up]){
    assert.equal(starts.length,13);
    for(let index=1;index<starts.length;index++)assert.ok(starts[index]-starts[index-1]>=60&&starts[index]-starts[index-1]<=95,`${starts[index-1]}→${starts[index]}`);
  }
  assert.ok(down[0]>=300&&down[0]<=390);
  assert.ok(up[0]>=300&&up[0]<=390);
});

test('전 구간 조정 후 검사 가능한 구간의 무단 추월과 단선 충돌은 없다',()=>{
  const audit=spawnSync(process.execPath,[new URL('../tools/audit_all_trains.mjs',import.meta.url).pathname,'--all'],{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(audit.status,0,audit.stderr);
  const report=JSON.parse(audit.stdout);
  assert.equal(report.appliedRevision.shifted,458);
  assert.equal(report.appliedRevision.corrected,11);
  assert.equal(report.invalidChronology.length,0);
  assert.equal(report.rotationIssues,0);
  for(const kind of ['illegal overtake','illegal station overtake','single-track meet'])
    assert.equal(report.counts[kind]||0,0,kind);
  assert.ok(report.unknownSegments>0,'통과 시각이 없는 구간은 별도로 보고해야 한다');
});

test('신설 KTX와 녕원 ITX는 사진 역순·통과·승강장·초 버림을 보존한다',()=>{
  const get=no=>trains.find(train=>train.no===String(no));
  const ktx=get(8021),ktxUp=get(8022),long=get(5281),short=get(5181);
  const at=(train,name,occurrence=0)=>train.stops.filter(stop=>stop.s===name)[occurrence];
  assert.equal(elapsed(ktx.stops[0].dep,at(ktx,'정주').arr),23);
  assert.equal(elapsed(ktx.stops[0].dep,at(ktx,'평양').dep),61);
  assert.equal(elapsed(ktx.stops[0].dep,ktx.stops.at(-1).arr),237);
  assert.deepEqual([at(ktx,'천안').dep,at(ktx,'천안').p],[null,undefined]);
  assert.deepEqual([at(ktxUp,'수영').dep,at(ktxUp,'수영').p],[null,undefined]);
  assert.equal(elapsed(long.stops[0].dep,long.stops.at(-1).arr),179);
  assert.deepEqual([at(long,'송림',0).p,at(long,'송림',1).p],['1','4']);
  assert.deepEqual([at(long,'송림',0).geoKey,at(long,'송림',1).geoKey],['송림(녕원선)',undefined]);
  assert.notEqual(stations[at(long,'송림',0).geoKey].lat,stations['송림'].lat);
  assert.deepEqual([at(long,'일산').dep!=null,at(long,'문산').dep!=null],[true,true]);
  assert.deepEqual([at(short,'평양').p,at(short,'덕천').p],['7','2']);
});

test('신의주–부산 KTX는 사진의 모든 WP를 양방향 통과 시각으로 반영한다',()=>{
  const down=trains.find(train=>train.no==='8021'),up=trains.find(train=>train.no==='8022');
  const route=['신의주','룡천','염주','동림','선천','곽산','정주','운하','운전','안주역전','문덕','금풍','평원','순안','서포','서평양','평양','송림','사리원','서흥','평산','금천','개성','개성공단','판문','도라산','문산','일산','행신','서울','병목안','수영','천안','정안','세종','대전','산내','영동','구미','남대구','청도','부산'];
  assert.deepEqual(Array.from(down.stops,stop=>stop.s),route);
  assert.deepEqual(Array.from(up.stops,stop=>stop.s),route.toReversed());
  for(const train of trains.filter(item=>+item.no>=8021&&+item.no<=8040)){
    assert.equal(train.stops.length,route.length,`#${train.no} 경유역 수`);
    for(const stop of train.stops){
      assert.notEqual(stop.arr,'통과',`#${train.no} ${stop.s} 통과 시각 누락`);
      if(stop.dep==null&&stop!==train.stops.at(-1))assert.equal(stop.p,undefined,`#${train.no} ${stop.s} 통과역 승강장`);
    }
  }
  const offset=(train,name)=>elapsed(train.stops[0].dep,train.stops.find(stop=>stop.s===name).arr);
  for(const [name,value] of [['룡천',6],['염주',9],['동림',11],['선천',15],['곽산',20],['행신',126],['병목안',145],['정안',164],['세종',168],['산내',181],['영동',187],['구미',198],['청도',219]])assert.equal(offset(down,name),value,`하행 ${name}`);
  for(const [name,value] of [['청도',18],['구미',38],['영동',50],['산내',56],['세종',69],['정안',73],['병목안',95],['행신',111],['곽산',219],['선천',223],['동림',227],['염주',230],['룡천',234]])assert.equal(offset(up,name),value,`상행 ${name}`);
});

test('신의주–부산 KTX 야간 2왕복은 남북간 막차 예외와 열차번호를 지킨다',()=>{
  const late=trains.filter(train=>+train.no>=8037&&+train.no<=8040).sort((a,b)=>+a.no-+b.no);
  assert.deepEqual(Array.from(late,train=>train.no),['8037','8038','8039','8040']);
  for(const train of late){
    const departure=minute(train.stops[0].dep),arrival=minute(train.stops.at(-1).arr);
    assert.ok(departure>=20*60+45&&departure<=22*60,`#${train.no} 출발`);
    assert.ok(arrival<=120,`#${train.no} 익일 02:00 이전 도착`);
    assert.equal(+train.no%2,train.dir==='down'?1:0);
  }
  assert.equal(new Set(trains.map(train=>train.no)).size,trains.length,'열차번호 중복');
});

test('녕원–평양·서울 통합 배차는 양방향 60–75분이며 당일 종착한다',()=>{
  for(const dir of ['down','up']){
    const list=trains.filter(train=>train.dir===dir&&((+train.no>=5181&&+train.no<=5200)||(+train.no>=5281&&+train.no<=5292))).sort((a,b)=>minute(a.stops[0].dep)-minute(b.stops[0].dep));
    assert.equal(list.length,16);
    assert.equal(list[0].stops[0].dep,'5:00');
    for(let i=1;i<list.length;i++)assert.ok(elapsed(list[i-1].stops[0].dep,list[i].stops[0].dep)>=60&&elapsed(list[i-1].stops[0].dep,list[i].stops[0].dep)<=75,`통합 ${dir} ${i}`);
    assert.equal(list.at(-1).stops[0].dep,'21:15');
    const lastArrival=minute(list.at(-1).stops.at(-1).arr);
    assert.ok(lastArrival>=1320||lastArrival<=30);
    assert.deepEqual(Array.from(list.slice(-2),train=>train.no),dir==='down'?['5291','5199']:['5292','5200']);
  }
});

test('신의주–서울 새마을은 새 사진의 사리원 구간·승강장·초 버림을 보존한다',()=>{
  const down=trains.find(train=>train.no==='5061'),up=trains.find(train=>train.no==='5062');
  const order=['서울','마포','행신','일산','문산','도라산','판문','개성공단','개성','금천','평산','서흥','사리원','송림','평양','서평양','서포','순안','평원','금풍','문덕','안주역전','운전','운하','정주','곽산','선천','동림','염주','룡천','신의주'];
  assert.deepEqual(Array.from(up.stops,stop=>stop.s),order);
  assert.deepEqual(Array.from(down.stops,stop=>stop.s),order.toReversed());
  for(const train of trains.filter(item=>Number(item.no)>=5061&&Number(item.no)<=5090))assert.deepEqual(Array.from(train.stops,stop=>stop.s),train.dir==='up'?order:order.toReversed(),`#${train.no} 역순`);
  const check=(train,station,arrival,departure,platform)=>{const stop=train.stops.find(item=>item.s===station);assert.deepEqual([stop.arr,stop.dep,stop.p],[arrival,departure,platform],`#${train.no} ${station}`);};
  check(down,'신의주',null,'5:00','5');check(down,'룡천','5:06','5:07','1');check(down,'염주','5:15','5:16','1');check(down,'곽산','5:41','5:42','1');check(down,'금풍','6:27','6:28','1');check(down,'사리원','7:26','7:27','5');check(down,'판문','8:25','8:26','1');check(down,'문산','8:34','8:35','3');check(down,'마포','8:53','8:54','5');
  check(up,'서울',null,'5:00','10');check(up,'문산','5:23','5:24','4');check(up,'판문','5:32','5:33','2');check(up,'사리원','6:31','6:32','6');check(up,'금풍','7:30','7:31','2');check(up,'정주','8:09','8:10','4');check(up,'곽산','8:16','8:17','2');check(up,'염주','8:42','8:43','2');check(up,'룡천','8:51','8:52','2');check(up,'신의주','8:59',null,'5');
  for(const [train,time] of [[down,'8:50'],[up,'5:08']]){const stop=train.stops.find(item=>item.s==='행신');assert.equal(stop.arr,time,`#${train.no} 행신`);assert.equal(stop.dep,null);assert.equal(stop.p,undefined);}
  assert.equal(elapsed(down.stops[0].dep,down.stops.at(-1).arr),238);
  assert.equal(elapsed(up.stops[0].dep,up.stops.at(-1).arr),239);
  for(const train of [down,up])assert.ok(train.stops.every(stop=>!stop.s.startsWith('WP')&&!stop.s.startsWith('웨이포인트')));
});

test('신의주–서울 새마을은 양방향 60–80분 배차와 00:30 이전 막차를 지킨다',()=>{
  for(const dir of ['down','up']){
    const list=trains.filter(train=>Number(train.no)>=5061&&Number(train.no)<=5090&&train.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
    assert.equal(list.length,15);assert.equal(list[0].stops[0].dep,'5:00');
    for(let index=1;index<list.length;index++)assert.ok(elapsed(list[index-1].stops[0].dep,list[index].stops[0].dep)>=60&&elapsed(list[index-1].stops[0].dep,list[index].stops[0].dep)<=80);
    assert.ok(minute(list.at(-1).stops.at(-1).arr)<=30,`${dir} 막차`);
  }
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

test('ITX-마음·새마을은 사진에 표시된 통과역 외에는 정차한다',()=>{
  for(const [first,last,,, ,grade] of expected.filter(row=>row[5].startsWith('ITX')))
    for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last))
      train.stops.slice(0,-1).forEach(stop=>{const photoExact=Number(train.no)>=5201&&Number(train.no)<=5234;const saemaeulPass=Number(train.no)>=5061&&Number(train.no)<=5090&&stop.s==='행신';if(!photoExact&&!saemaeulPass)assert.ok(stop.dep,`#${train.no} ${stop.s} 정차`);});
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

test('기존 좌표에 없는 사진 속 신설역은 최신 인게임 파일 대기 목록에만 남는다',()=>{
  const names=new Set();for(const [first,last] of expected)for(const train of trains.filter(item=>Number(item.no)>=first&&Number(item.no)<=last))for(const stop of train.stops)names.add(stop.s);
  // 사용자 제공 예정인 최신 인게임 파일로만 좌표를 확정한다.
  const awaitingExport=new Set(['북숙천','석천','룡포','두단','개풍','시중','동신','구장','북개천']);
  for(const name of awaitingExport)assert.ok(names.has(name)&&!stations[name]&&!stations[`${name}역`],name);
  for(const name of names)if(!awaitingExport.has(name))assert.ok(stations[name]||stations[`${name}역`],name);
});

test('복선역의 상·하행 정차 승강장은 인게임 구조에 맞게 분리된다',()=>{
  for(const [first] of expected){
    if([5061,5101,5131,5161,5261,5351,9001].includes(first))continue; // 사진의 실측 승강장을 우선한다.
    const down=trains.find(train=>Number(train.no)===first),up=trains.find(train=>Number(train.no)===first+1);
    for(const stop of down.stops.filter(item=>item.p!=null)){
      const opposite=up.stops[down.stops.length-1-down.stops.indexOf(stop)],entry=stations[stop.s]||stations[`${stop.s}역`];
      if((first===5281&&stop.s==='서울')||(first===8021&&stop.s==='부산'))continue; // 사진 속 같은 승강장 회차.
      if(opposite?.p!=null&&entry?.platforms?.length>=2)assert.notEqual(stop.p,opposite.p,`#${first} ${stop.s}`);
    }
  }
});

test('첫차와 막차는 일반·승인 예외 범위를 지킨다',()=>{
  const lateKtx=new Set([8001,8021,9701,9751]),lateItx=new Set([5091]);
  for(const [first,last] of expected){for(const dir of ['down','up']){
    const list=trains.filter(t=>Number(t.no)>=first&&Number(t.no)<=last&&t.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
    const firstDeparture=minute(list[0].stops[0].dep);
    assert.ok(firstDeparture>=300&&firstDeparture<=390,`#${first} ${dir} 첫차`);
    const arrival=minute(list.at(-1).stops.at(-1).arr),normalized=arrival<300?arrival+1440:arrival;
    const max=lateItx.has(first)?1620:lateKtx.has(first)?1560:1470;
    assert.ok(normalized<=max,`#${first} ${dir} 막차 ${list.at(-1).stops.at(-1).arr}`);
  }}
});

test('정차역 시각은 전 구간에서 역행하지 않는다',()=>{
  for(const [first,last] of expected)for(const train of trains.filter(t=>Number(t.no)>=first&&Number(t.no)<=last)){
    let lastTime=minute(train.stops[0].dep);
    for(const stop of train.stops.slice(1)){
      if(stop.arr==='통과')continue;
      let now=minute(stop.arr);while(now<lastTime)now+=1440;assert.ok(now>=lastTime,`#${train.no} ${stop.s} 도착 역행`);lastTime=now;
      if(stop.dep){let dep=minute(stop.dep);while(dep<lastTime)dep+=1440;assert.ok(dep>=lastTime,`#${train.no} ${stop.s} 출발 역행`);lastTime=dep;}
    }
  }
});

test('기존 열차와 같은 승강장을 같은 분에 중복 점유하지 않는다',()=>{
  const isFormal=no=>expected.some(([first,last])=>no>=first&&no<=last),occupied=new Map(),byNo=new Map(trains.map(train=>[Number(train.no),train]));
  const photo=no=>no>=5181&&no<=5200||no>=5281&&no<=5292||no>=8021&&no<=8040;
  const provisional=no=>!photo(no)&&String(byNo.get(no)?.line||'').includes('경의선');
  for(const train of trains)train.stops.forEach((stop,index)=>{
    if(stop.p==null||(stop.dep==null&&index<train.stops.length-1))return;
    for(const value of new Set([stop.arr,stop.dep].filter(Boolean))){const key=`${stop.s}|${stop.p}|${minute(value)}`,list=occupied.get(key)||[];list.push(Number(train.no));occupied.set(key,list);}
  });
  for(const [key,numbers] of occupied){const unique=[...new Set(numbers)];if(unique.length>1&&unique.every(no=>String(byNo.get(no)?.line||'').includes('경의선'))&&!unique.some(photo))continue;const active=unique.some(photo)?unique.filter(no=>!provisional(no)):unique;if(active.some(isFormal))assert.equal(active.length,1,`${key}: ${active.join(',')}`);}
});

test('이번 신설 열차의 승강장 사용은 기존 확정 열차와 최소 3분 분리된다',()=>{
  const revised=no=>no>=5181&&no<=5200||no>=5281&&no<=5292||no>=8021&&no<=8040;
  const events=[];
  for(const train of trains)for(const stop of train.stops){
    if(stop.p==null||stop.dep==null&&stop!==train.stops.at(-1))continue;
    for(const value of new Set([stop.arr,stop.dep].filter(Boolean)))events.push({station:stop.s,platform:stop.p,time:minute(value),no:+train.no,line:train.line});
  }
  const byPlatform=new Map();
  for(const event of events){const key=`${event.station}|${event.platform}`,list=byPlatform.get(key)||[];list.push(event);byPlatform.set(key,list);}
  for(const [key,list] of byPlatform)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=list[i],b=list[j];if(a.no===b.no||!(revised(a.no)||revised(b.no)))continue;
    if((!revised(a.no)&&a.line.includes('경의선'))||(!revised(b.no)&&b.line.includes('경의선')))continue;
    const gap=Math.min(Math.abs(a.time-b.time),1440-Math.abs(a.time-b.time));
    assert.ok(gap>=3,`${key} #${a.no}/#${b.no} ${gap}분`);
  }
});

test('기존 제한 검사는 사진 확정 편의 지정 역 추월만 확인한다',()=>{
  const isFormal=no=>expected.some(([first,last])=>no>=first&&no<=last);
  const noPass=new Set(['기장','사천','함안','추풍령','불국사','입실','함평','라선','경흥','청진','단천','통천','고성','간성','속초','양양']);
  const fastNoPass=new Set(['평창','포항','영덕','울진','함평','천안','수영','명간']);
  const noOvertake=new Set(['문산','일산','수영','천안']);
  const timeline=train=>{let last=null,day=0;return train.stops.map((stop,index)=>{const value=stop.arr||stop.dep;if(!value)return {...stop,index,time:Number.NaN};let time=minute(value);if(last!=null&&time+day<last)day+=1440;time+=day;last=time;return {...stop,index,time};});};
  const lineTokens=train=>new Set(String(train.line).split(/[·,]/));
  const issues=[];
  for(let i=0;i<trains.length;i++)for(let j=i+1;j<trains.length;j++){
    const first=trains[i],second=trains[j];
    const photo=no=>no>=5181&&no<=5200||no>=5281&&no<=5292||no>=8021&&no<=8040;
    const provisional=train=>!photo(Number(train.no))&&String(train.line).includes('경의선');
    if((photo(Number(first.no))&&provisional(second))||(photo(Number(second.no))&&provisional(first))||(provisional(first)&&provisional(second)))continue;
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
      const legal=!noPass.has(to.s)&&!noOvertake.has(to.s)&&!highSpeedRestriction&&(!firstStop?.p||!secondStop?.p||firstStop.p!==secondStop.p);
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
  for(const [id,sequence] of sets){const first=byNo.get(sequence[0]),last=byNo.get(sequence.at(-1));assert.equal(first.stops[0].s,last.stops.at(-1).s,`${id} 원 기점`);for(let i=1;i<sequence.length;i++){const previous=byNo.get(sequence[i-1]),next=byNo.get(sequence[i]);assert.equal(previous.stops.at(-1).s,next.stops[0].s,`${id} 회차역`);const turn=id.startsWith('신의주-부산 KTX')||id.startsWith('녕원-서울 ITX')?minute(next.stops[0].dep)-minute(previous.stops.at(-1).arr):elapsed(previous.stops.at(-1).arr,next.stops[0].dep);assert.ok(turn>=5,`${id} 회차 ${sequence[i-1]}→${sequence[i]}`);}}
  const newSets=[...sets].filter(([id])=>id.startsWith('신의주-서울 ITX-새마을 '));
  assert.equal(newSets.length,9,'신의주–서울 당일 운용 편성 수');
  assert.deepEqual(newSets.flatMap(([,sequence])=>sequence).map(Number).sort((a,b)=>a-b),Array.from({length:30},(_,i)=>5061+i));
  for(const [id,sequence] of newSets)for(let i=1;i<sequence.length;i++){
    const previous=byNo.get(sequence[i-1]),next=byNo.get(sequence[i]);
    assert.ok(minute(next.stops[0].dep)-minute(previous.stops.at(-1).arr)>=5,`${id} 당일 시각순 회차`);
  }
});
