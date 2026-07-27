import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const css = fs.readFileSync('assets/css/nimbi_rail.css', 'utf8');
const filterStart = source.indexOf('function _mttFilterEntries');
const filterEnd = source.indexOf('\nfunction setMetroTimetableExpressOnly', filterStart);
assert.ok(filterStart >= 0 && filterEnd > filterStart, '전체 시간표 급행 필터 함수 누락');

const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(filterStart, filterEnd)}\nthis.filterEntries=_mttFilterEntries;this.hasExpress=_mttHasExpress;`, context);
const entries = [
  {id:'local', cls:0},
  {id:'express', cls:1},
  {id:'limited', cls:2}
];
assert.deepEqual(Array.from(context.filterEntries(entries, false), entry => entry.id), ['local','express','limited'], '필터 해제 시 모든 열차를 표시해야 합니다.');
assert.deepEqual(Array.from(context.filterEntries(entries, true), entry => entry.id), ['express','limited'], '급행만 보기에는 급행·특급만 표시해야 합니다.');
assert.equal(context.hasExpress([{cls:0},{cls:0}]),false,'일반열차만 정차하는 역에는 급행 필터를 숨겨야 합니다.');
assert.equal(context.hasExpress([{cls:0},{cls:1}]),true,'급행이 정차하는 역에는 급행 필터를 표시해야 합니다.');

const expectedOrder = '<span class="mtt-t">${fClk(r.clk)}</span><span class="mtt-od">${od}</span>${_metroClsTag(r.cls)}';
assert.ok(source.includes(expectedOrder), '전체 시간표는 시각 → 출발지·행선지 → 급행 심볼 순이어야 합니다.');
assert.ok(source.includes('onchange="setMetroTimetableExpressOnly(this.checked)"'), '급행만 보기 체크박스가 필터 함수와 연결되어야 합니다.');
assert.ok(source.includes('${hasExpress?`<div class="mtt-filterbar">'),'급행 필터 영역은 실제 급행 정차 여부에 따라 렌더링해야 합니다.');
assert.ok(source.includes('${r.clk},${r.k0},${r.k1})'), '전체 시간표 클릭은 선택한 방향 leg 범위를 함께 전달해야 합니다.');
assert.ok(source.includes("const METRO_MODE_TABS=['metrolines','metroschematic','metroroute','map','stationinfo','notice']"),'전철 공지는 가장 오른쪽 탭이어야 합니다.');
assert.ok(source.includes("b.style.order=String(Math.max(0,visible.indexOf(id)))"),'모드별 탭 순서를 화면에 적용해야 합니다.');
assert.ok(source.includes('function _metroLiveTrainLabel(dest,cls)'),'실시간 열차 행선 표기 공통 함수가 있어야 합니다.');
assert.ok(source.includes("cls===1?`${dest} 급행`:`${dest}행`"),'일반은 ○○행, 급행은 ○○ 급행 형식이어야 합니다.');
assert.ok(source.includes("onclick=\"openMetroTrain('${lineArg}',${t.svcIdx},${t.clickClock})\""),'실시간 위치 마커에서 해당 편성 시간표를 열어야 합니다.');
assert.ok(css.includes('.mtl-live.clickable{pointer-events:auto;cursor:pointer}'),'실시간 열차 마커가 클릭 가능해야 합니다.');

const rangesStart = source.indexOf('function _metroLegRanges');
const rangesEnd = source.indexOf('\n// 🚇 개별 편성 역별 타임라인', rangesStart);
assert.ok(rangesStart >= 0 && rangesEnd > rangesStart, '전철 회차 구간 선택 함수 누락');
const rangeContext={Number};
vm.createContext(rangeContext);
vm.runInContext(`${source.slice(rangesStart,rangesEnd)}
this.pick=_metroLegRangeForClick;`,rangeContext);
const idxSeq=[0,1,2,1,0];
const depTimes=[100,110,200,210,220];
assert.deepEqual(Array.from(rangeContext.pick(idxSeq,depTimes,200,2,4)),[2,4],'회차역 시발편은 다음 방향 leg를 열어야 합니다.');
assert.deepEqual(Array.from(rangeContext.pick(idxSeq,depTimes,200)),[2,4],'구형 호출도 회차역 출발 시 다음 방향 leg를 우선해야 합니다.');

console.log('metro timetable: 행 정보 순서 및 급행·특급 필터 검증 완료');
