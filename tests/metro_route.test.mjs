import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const context={};
vm.createContext(context);
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
assert.equal(vm.runInContext("METRO_SCHED['강서선'].t.length",context),166);
assert.equal(vm.runInContext("METRO_SCHED['은평선'].t.length",context),168);
assert.ok(vm.runInContext("METRO_SCHED['강서선'].t.some(t=>t.some((_,i)=>i%3===2&&t[i]===30))",context),'강서선 잠실 운행편이 필요합니다.');
assert.ok(vm.runInContext("METRO_SCHED['은평선'].t.some(t=>t.some((_,i)=>i%3===2&&t[i]===19))",context),'은평선 남안양 운행편이 필요합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['강서선'].m[0]",context)),[126.486408,37.745926],'강화역은 인게임 실제 좌표를 사용해야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['강서선'].m.at(-1)",context)),[127.099814,37.513113],'잠실역은 인게임 실제 좌표를 사용해야 합니다.');
assert.deepEqual(Array.from(vm.runInContext("METRO_GEO['은평선'].m.at(-1)",context)),[126.939517,37.378651],'남안양역은 인게임 실제 좌표를 사용해야 합니다.');
assert.equal(vm.runInContext('NIMBI_METRO_SEPTEMBER_REVISION.exactGameCoordinates',context),true);
assert.equal(vm.runInContext('NIMBI_METRO_SEPTEMBER_REVISION.exactRunTimes',context),true);

console.log('metro route tests passed');
