import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('js/nimbi_rail.js','utf8');
const css=fs.readFileSync('assets/css/nimbi_rail.css','utf8');

assert.ok(source.includes("return{label:'매진'"),'매진 상태 매핑이 누락되었습니다.');
for(const label of ['여유','보통','혼잡'])assert.ok(source.includes(`label:'${label}'`),`${label} 상태 매핑이 누락되었습니다.`);
assert.ok(!source.includes("btn.textContent=available===1?'1석'"),'검색 결과에 잔여 좌석 수를 직접 표시하면 안 됩니다.');
assert.ok(source.includes('function _hydrateBookSeatStatuses'),'좌석 상태 점진 표출 함수가 누락되었습니다.');
assert.ok(source.includes("getODCongestion(t,aFrom||from,aTo||to,dateGo)"),'검색 결과는 조회 구간 공통 재고를 사용해야 합니다.');
assert.ok(source.includes("if('IntersectionObserver' in window)"),'화면 밖 열차의 재고 계산을 미루는 최적화가 누락되었습니다.');
assert.ok(source.includes('window.requestIdleCallback'),'좌석 상태 계산은 유휴 시간에 처리해야 합니다.');

assert.ok(source.includes('const initialPassengerCount=Math.max(1,Math.min(6,Number(window._bookingPassengerCount)||1))'),'조회 인원을 예매 팝업에 이어야 합니다.');
assert.ok(source.includes('<span id="booking-passenger-count">${initialPassengerCount}</span>'),'예매 인원 초기 표시가 조회 인원을 사용해야 합니다.');

assert.ok(source.includes('onclick="openSeatDemandInfo()"'),'좌석 선택 화면의 정보 버튼이 누락되었습니다.');
assert.ok(source.includes('function openSeatDemandInfo()'),'예매 현황 정보창 함수가 누락되었습니다.');
assert.ok(!source.includes('<div class="book-detail-fare-row"><span>총 좌석</span>'),'총 좌석 정보는 열차 선택 상세에 남아 있으면 안 됩니다.');
assert.ok(css.includes('.seat-demand-info-card'),'좌석 정보창 스타일이 누락되었습니다.');

assert.ok(css.includes('.mtb-exp--t{color:#ff4d4f;border-color:#ff4d4f}'),'특급 표시는 급행과 같이 빨간색이어야 합니다.');

console.log('booking UI revision: 상태형 좌석 표시·정보창·인원 연동·급행 색상 검증 완료');
