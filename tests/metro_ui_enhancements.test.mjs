import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/css/nimbi_rail.css','utf8');

assert.ok(index.includes('id="map-fullscreen-btn" onclick="toggleMapFullscreen()"'),'PC 노선도 전체화면 버튼이 누락되었습니다.');
assert.ok(source.includes('function toggleMapFullscreen()'),'노선도 전체화면 제어 함수가 누락되었습니다.');
assert.ok(source.includes("document.addEventListener('fullscreenchange'"),'브라우저 전체화면 종료 상태를 동기화해야 합니다.');
assert.ok(css.includes('.ui-pc .map-fullscreen-btn{display:inline-flex'),'전체화면 버튼은 PC 환경에서만 표시해야 합니다.');
assert.ok(css.includes('#panel-map:fullscreen'),'노선도 전체화면 레이아웃이 누락되었습니다.');

const rowsStart=source.indexOf('function _metroRouteGroups');
const rowsEnd=source.indexOf('\nfunction _metroRouteGroupsHTML',rowsStart);
assert.ok(rowsStart>=0&&rowsEnd>rowsStart,'전체 계통 분리 함수가 누락되었습니다.');
const context={};
vm.createContext(context);
vm.runInContext(`${source.slice(rowsStart,rowsEnd)}\nthis.routeGroups=_metroRouteGroups;`,context);
const groups=context.routeGroups({
  stations:['본선A','분기','본선B'],
  routes:[
    {stations:['본선A','분기','본선B']},
    {stations:['분기','지선A','지선B'],dash:true}
  ]
});
assert.equal(groups.length,2,'본선과 지선은 서로 다른 타임라인 그룹이어야 합니다.');
assert.ok(groups[1].branch&&groups[1].rows.some(row=>row.n==='지선A')&&groups[1].rows.some(row=>row.n==='지선B'),'지선 그룹에 지선 역이 표시되어야 합니다.');
assert.ok(groups[1].label.includes('분기'),'지선 그룹에 분기 안내가 있어야 합니다.');
assert.ok(source.includes('const groups=patSeq?'),'계통 전체 선택 시 route 그룹을 사용해야 합니다.');
assert.ok(source.includes('_metroRouteGroupsHTML(l,groups,_metroLiveOn)'),'분기 계통은 별도 타임라인으로 렌더링해야 합니다.');

console.log('metro UI enhancements: PC 전체화면·실시간 편성 클릭·전체 지선 표시 검증 완료');
