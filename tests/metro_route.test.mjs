import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/nimbi_metro.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/nimbi_metro_sched.js','utf8'),context);

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

console.log('metro route tests passed');
