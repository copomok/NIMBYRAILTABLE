import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/nimbi_station_data.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_sched.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_geo.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_20260924_update.js','utf8'),context);

const slice=(start,end)=>{
  const from=source.indexOf(start);
  const to=source.indexOf(end,from);
  assert.ok(from>=0&&to>from,`${start} 함수 구간을 찾을 수 없습니다.`);
  return source.slice(from,to);
};

vm.runInContext(`
${slice('function _metroLegRanges','\nfunction _metroLegRangeForClick')}
${slice('let _metroGraphCache=null;','\nfunction renderMetroRouteTab')}
${slice('function _metroSegService','\nfunction searchMetroRoute')}
this.findRoute=_metroFindRoute;
this.graph=_metroGraph;
this.nextService=_metroSegService;
`,context);

const direct=context.findRoute('행신','고양중앙로','transfer');
assert.equal(direct.transfers,0,'인접한 실제 직통 구간에 불필요한 환승을 만들면 안 됩니다.');
assert.equal(direct.stops,1,'행신→고양중앙로를 영등포 방면으로 우회하면 안 됩니다.');
assert.deepEqual(Array.from(direct.segments,segment=>[
  context.graph().lineById[segment.lid].name,
  segment.stns[0],
  segment.stns.at(-1)
]),[['신강서선','행신','고양중앙로']]);

const branch=context.findRoute('서울','조치원','transfer');
assert.equal(branch.transfers,1,'같은 경부선이라도 한 편성으로 갈 수 없는 서울→조치원은 환승해야 합니다.');
assert.equal(branch.segments.length,2,'서울→조치원은 실제 운행 패턴 두 구간으로 나뉘어야 합니다.');
assert.equal(branch.segments[0].stns.at(-1),branch.segments[1].stns[0],'환승역에서 두 운행 구간이 이어져야 합니다.');

for(const segment of branch.segments){
  const line=context.graph().lineById[segment.lid];
  const service=context.nextService(line.name,segment.stns[0],segment.stns.at(-1),300,segment.pid);
  assert.ok(service,`${segment.stns[0]}→${segment.stns.at(-1)} 실제 운행편을 찾아야 합니다.`);
  assert.ok(service.as>service.ds,'실제 소요시간은 양수여야 합니다.');
}

assert.ok(!source.includes('운행 데이터 없는 구간 → 추정 fallback'),'실제 운행편이 없는 경로를 허위 추정 직통으로 표시하면 안 됩니다.');

const gangseo=vm.runInContext("METRO_LINES.find(line=>line.name==='강서선')",context);
const eunpyeong=vm.runInContext("METRO_LINES.find(line=>line.name==='은평선')",context);
assert.equal(gangseo.color,'#6ccc6c','강서선 승객용 노선색을 유지해야 합니다.');
assert.equal(eunpyeong.color,'#545454','은평선 승객용 노선색을 유지해야 합니다.');
assert.deepEqual(Array.from(gangseo.stations),['강화','월곶','통진','구래','장기감정','북변','풍무','장기노오지','김포공항','신월','화곡','등촌','목동','선유도','당산','노량진','상도','국사봉','서사당','이수','내방','서초','교대','서강남','서역삼','역삼중앙','선릉','삼성','종합운동장','잠실새내','잠실']);
assert.deepEqual(Array.from(eunpyeong.stations),['진관사','신도','은평','연서공원','응암','마포','망원','서교','창전','염리','한강로','이촌','동작','이수','사당','북과천','과천','내손','호계','남안양']);
assert.equal(vm.runInContext("METRO_SCHED['강서선'].t.length",context),234);
assert.equal(vm.runInContext("METRO_SCHED['은평선'].t.length",context),162);
assert.equal(vm.runInContext("METRO_SCHED['안산안양선'].t.length",context),332);
assert.ok(vm.runInContext("METRO_SCHED['강서선'].t.some(t=>t.some((_,i)=>i%3===2&&t[i]===30))",context),'강서선 잠실 운행편이 필요합니다.');
assert.ok(vm.runInContext("METRO_SCHED['은평선'].t.some(t=>t.some((_,i)=>i%3===2&&t[i]===19))",context),'은평선 남안양 운행편이 필요합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['강서선'].m[0]",context)),[126.486408,37.745926],'강화역은 인게임 실제 좌표를 사용해야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['강서선'].m.at(-1)",context)),[127.099814,37.513113],'잠실역은 인게임 실제 좌표를 사용해야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['은평선'].m.at(-1)",context)),[126.939517,37.378651],'남안양역은 인게임 실제 좌표를 사용해야 합니다.');
assert.equal(vm.runInContext('NIMBI_METRO_SEPTEMBER_REVISION.exactGameCoordinates',context),true);
assert.equal(vm.runInContext('NIMBI_METRO_SEPTEMBER_REVISION.exactRunTimes',context),true);
assert.equal(vm.runInContext('NIMBI_METRO_SEPTEMBER_REVISION.utcOffsetMinutes',context),540);
assert.equal(vm.runInContext("METRO_SCHED['강서선'].c.filter(value=>value===1).length",context),75,'강서선 급행 75편을 별도 등급으로 표시해야 합니다.');
assert.equal(vm.runInContext("METRO_SCHED['은평선'].t.filter(t=>{const s=METRO_SCHED['은평선'].s,q=t.filter((_,i)=>i%3===2).map(i=>s[i]);return q.includes('한강로')&&q.at(-1)==='신도'}).length",context),0,'한강로 이후 상행이 신도에서 잘리면 안 됩니다.');
assert.ok(vm.runInContext("METRO_SCHED['은평선'].t.some(t=>{const s=METRO_SCHED['은평선'].s,q=t.filter((_,i)=>i%3===2).map(i=>s[i]);return q.includes('한강로')&&q.at(-1)==='진관사'})",context),'한강로 이후 진관사 종착 보정편이 필요합니다.');
assert.equal(vm.runInContext("METRO_SCHED['안산안양선'].t.filter(t=>METRO_SCHED['안산안양선'].s[t.at(-1)]==='원시').length",context),12,'입고로 이어지는 실제 원시 종착편을 유지해야 합니다.');
assert.ok(vm.runInContext("METRO_SCHED['안산안양선'].t.some(t=>METRO_SCHED['안산안양선'].s[t.at(-1)]==='새솔')",context),'후속 영업운행이 있는 원시 도착편은 새솔까지 보완해야 합니다.');
assert.equal(vm.runInContext("Math.min(...METRO_SCHED['강서선'].t.map((t,i)=>METRO_SCHED['강서선'].c[i]===0&&METRO_SCHED['강서선'].s[t[2]]==='강화'&&METRO_SCHED['강서선'].s[t[5]]==='월곶'?(t[1]<240?t[1]+1440:t[1]):Infinity))",context),300,'강화발 잠실 방면 일반 첫차는 05:00이어야 합니다.');
assert.equal(vm.runInContext("Math.min(...METRO_SCHED['강서선'].t.map((t,i)=>METRO_SCHED['강서선'].c[i]===1&&METRO_SCHED['강서선'].s[t[2]]==='김포공항'&&METRO_SCHED['강서선'].s[t[5]]==='화곡'?(t[1]<240?t[1]+1440:t[1]):Infinity))",context),300,'김포공항발 급행 첫차는 05:00이어야 합니다.');
assert.equal(vm.runInContext("Math.min(...METRO_SCHED['은평선'].t.flatMap(t=>{const s=METRO_SCHED['은평선'].s,r=[];for(let i=0;i<t.length-3;i+=3)if(s[t[i+2]]==='응암'&&s[t[i+5]]==='연서공원')r.push(t[i+1]<240?t[i+1]+1440:t[i+1]);return r}))",context),260,'응암발 진관사 방면 첫차는 04:20이어야 합니다.');
assert.equal(vm.runInContext("Math.min(...METRO_SCHED['안산안양선'].t.map(t=>t[1]<240?t[1]+1440:t[1]))",context),276,'안산안양선 최초 시발은 04:36이어야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_SCHED['안산안양선'].t.filter(t=>METRO_SCHED['안산안양선'].s[t[2]]==='비산').map(t=>t[1]).sort((a,b)=>a-b).slice(0,2)",context)),[308,314],'비산 시발 영업열차는 인게임 기준 05:08, 05:14이어야 합니다.');
assert.equal(vm.runInContext("Object.values(METRO_SCHED).flatMap(x=>x.t||[]).filter(t=>t.length<=3).length",context),0,'한 역에만 머무는 심야 주박 운행은 시간표에서 제외해야 합니다.');
assert.ok(vm.runInContext("Object.values(NIMBI_METRO_SEPTEMBER_REVISION.lines).reduce((sum,line)=>sum+line.excludedSingleStationRuns,0)",context)>0,'인게임 원본의 단일역 주박 운행 제외 건수가 기록되어야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("[STATION_DB['잠실새내역'].lon,STATION_DB['잠실새내역'].lat]",context)),[127.085504,37.511594],'신설역 주소 조회에는 실제 인게임 좌표를 써야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("[STATION_DB['월곶(김포)역'].lon,STATION_DB['월곶(김포)역'].lat]",context)),[126.551426,37.714442],'동명이역 월곶(김포)의 실제 좌표를 분리해 저장해야 합니다.');
assert.ok(fs.readFileSync('js/features/nimbi_shell.js','utf8').includes("route.stations||[]).forEach(name=>stationNames.add(name))"),'전철 신설역이 통합 검색에 포함되어야 합니다.');
assert.ok(source.includes('const cacheKey=`${name}|${(+lat).toFixed(6)},${(+lon).toFixed(6)}`'),'주소 캐시는 역 이름뿐 아니라 실제 좌표까지 구분해야 합니다.');

console.log('metro route tests passed');
