import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};vm.createContext(context);
for(const file of ['data/nimbi_rail_data.js','data/nimbi_station_data.js','data/nimbi_metro.js','data/nimbi_metro_sched.js','data/nimbi_metro_schedule_updates.js','data/nimbi_metro_service_policy.js','data/nimbi_metro_geo.js','data/nimbi_metro_20260924_update.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
}
const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};
vm.runInContext(`
function toMin(v){if(!v)return null;const m=v.match(/(\\d+):(\\d+)/);return m?+m[1]*60+ +m[2]:null;}
function hasTime(v){return v&&/\\d+:\\d+/.test(v);}
${slice('function _metroLegRanges','\nfunction _metroLegRangeForClick')}
let _mrTransportFilters={ktx:true,general:true,gtx:true},_mrEdgeMode='normal',_mrTimeMode='depart';
${slice('let _mrIntegratedEdgeCache=null;','\nfunction searchIntegratedRoute')}
this.integratedEdges=_mrIntegratedEdges;this.integratedJourney=_mrIntegratedJourney;
`,context);

test('통합 길찾기 그래프는 전철·기차 운행을 함께 포함한다',()=>{
  const edges=context.integratedEdges();
  const flat=Object.values(edges).flat();
  assert.ok(flat.some(edge=>edge.type==='metro'));
  assert.ok(flat.some(edge=>edge.type==='rail'));
  assert.ok(flat.some(edge=>edge.category==='ktx'));
  assert.ok(flat.some(edge=>edge.category==='general'));
});

test('통합 길찾기는 전철과 기차을 이어 실제 혼합 여정을 탐색한다',()=>{
  const journey=context.integratedJourney(['봉담','영주'],0);
  assert.ok(journey?.length,'봉담에서 영주까지 연결되는 운행 경로가 필요합니다.');
  assert.equal(journey[0].from,'봉담');
  assert.equal(journey.at(-1).to,'영주');
  assert.ok(journey.some(edge=>edge.type==='metro'));
  assert.ok(journey.some(edge=>edge.type==='rail'));
});
