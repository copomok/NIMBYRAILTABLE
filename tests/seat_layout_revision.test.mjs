import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const css=fs.readFileSync('assets/css/nimbi_rail.css','utf8');
const start=source.indexOf('function _makeFourAcrossCar');
const end=source.indexOf('function _wideWindow');
assert.ok(start>=0&&end>start,'좌석 편성 함수 범위를 찾을 수 없습니다.');

const context={};
vm.createContext(context);
vm.runInContext(`${source.slice(start,end)}
this.getCarComposition=getCarComposition;
this.getSeatDisplayCars=getSeatDisplayCars;
this.seatSeqNum=seatSeqNum;`,context);

const saemaeul=context.getCarComposition('itx-sm');
assert.deepEqual(
  Array.from(saemaeul,c=>c.totalSeats),
  [58,74,46,62,74,58],
  'ITX-새마을 호차별 실제 좌석 구조가 맞아야 합니다.'
);
assert.deepEqual(
  Array.from(saemaeul,c=>c.car),
  [1,2,3,4,5,6],
  'ITX-새마을은 6량 편성을 유지해야 합니다.'
);
assert.ok(saemaeul[2].tags.includes('휠체어석'),'ITX-새마을 3호차 접근성 시설이 누락되었습니다.');
assert.ok(saemaeul[4].tags.includes('유아동반석'),'ITX-새마을 5호차 유아동반석이 누락되었습니다.');

const maum=context.getCarComposition('itx-maum');
assert.deepEqual(
  Array.from(maum,c=>c.totalSeats),
  [52,74,68,62],
  'ITX-마음 호차별 실제 좌석 구조가 맞아야 합니다.'
);
assert.ok(maum[0].tags.includes('전동휠체어석'),'ITX-마음 1호차 접근성 시설이 누락되었습니다.');
assert.ok(maum[2].tags.includes('유아동반석'),'ITX-마음 3호차 유아동반석이 누락되었습니다.');

const mugunghwa=context.getCarComposition('mgh');
assert.deepEqual(
  ['1','2','3','4'].map(col=>context.seatSeqNum(mugunghwa[0],1,col)),
  [3,4,2,1],
  '무궁화호 한 열은 3·4 / 통로 / 2·1 순서여야 합니다.'
);

assert.deepEqual(
  Array.from(context.getSeatDisplayCars(saemaeul,'general',{dir:'down'}),c=>c.car),
  [1,2,3,4,5,6],
  '하행도 낮은 호차부터 표시해야 합니다.'
);
assert.deepEqual(
  Array.from(context.getSeatDisplayCars(saemaeul,'general',{dir:'up'}),c=>c.car),
  [1,2,3,4,5,6],
  '상행은 낮은 호차가 앞이어야 합니다.'
);

assert.ok(css.includes('@media (min-width:900px)'),'PC 가로 좌석 배치 반응형 규칙이 누락되었습니다.');
assert.ok(css.includes('.seat-layout-shell .seatmap-grid.pick'),'PC 좌우 좌석 배치 규칙이 누락되었습니다.');
assert.ok(!source.includes("if(t.dir==='down') rowOrder.reverse()"),'하행 좌석 배치를 별도로 뒤집으면 안 됩니다.');
assert.ok(source.includes('function openSeatFacilityInfo()'),'편의시설 전용 정보창이 누락되었습니다.');
assert.ok(!source.includes('seat-consist-guide'),'불필요한 앞·뒤 전체 호차 안내가 남아 있습니다.');
assert.ok(!source.includes('seat-end-mark'),'좌석 배치 안에 선두·후두 표시가 남아 있습니다.');
assert.ok(source.includes("if(r===1) return `win ${side}`"),'2열 공유 창의 1열 단독 창 규칙이 누락되었습니다.');

console.log('seat layout revision: 실제 배치·호차 오름차순·시설 분리·창문 규칙 검증 완료');
