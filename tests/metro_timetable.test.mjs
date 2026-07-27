import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const filterStart = source.indexOf('function _mttFilterEntries');
const filterEnd = source.indexOf('\nfunction setMetroTimetableExpressOnly', filterStart);
assert.ok(filterStart >= 0 && filterEnd > filterStart, '전체 시간표 급행 필터 함수 누락');

const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(filterStart, filterEnd)}\nthis.filterEntries=_mttFilterEntries;`, context);
const entries = [
  {id:'local', cls:0},
  {id:'express', cls:1},
  {id:'limited', cls:2}
];
assert.deepEqual(Array.from(context.filterEntries(entries, false), entry => entry.id), ['local','express','limited'], '필터 해제 시 모든 열차를 표시해야 합니다.');
assert.deepEqual(Array.from(context.filterEntries(entries, true), entry => entry.id), ['express','limited'], '급행만 보기에는 급행·특급만 표시해야 합니다.');

const expectedOrder = '<span class="mtt-t">${fClk(r.clk)}</span><span class="mtt-od">${od}</span>${_metroClsTag(r.cls)}';
assert.ok(source.includes(expectedOrder), '전체 시간표는 시각 → 출발지·행선지 → 급행 심볼 순이어야 합니다.');
assert.ok(source.includes('onchange="setMetroTimetableExpressOnly(this.checked)"'), '급행만 보기 체크박스가 필터 함수와 연결되어야 합니다.');

console.log('metro timetable: 행 정보 순서 및 급행·특급 필터 검증 완료');
