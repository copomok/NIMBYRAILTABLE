import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('예매 열차 상세 버튼은 선택 구간 운행 정보창을 연다',()=>{
  assert.match(app,/function openBookRouteDetail\(trainNo,from,to,travelDate\)/);
  assert.match(app,/openBookRouteDetail\(trainNo,from,to,travelDate\)/);
  assert.doesNotMatch(app,/bdd-detail-btn'\), \(\)=>\{ closeBookTrainDetail\(\); jumpToTrain/);
});

test('운행 정보창은 정차역과 승차·하차 구간을 구분한다',()=>{
  assert.match(app,/!isPassStop\(t,s\.s\)/);
  assert.match(app,/brd-stop-badge board">승차/);
  assert.match(app,/brd-stop-badge alight">하차/);
  assert.match(app,/class="brd-arr"/);
  assert.match(app,/class="brd-dep"/);
  assert.match(app,/_realPlatform\(t\.no,s\.s\)/);
  assert.match(css,/\.brd-stop\.ride \.brd-rail:before/);
  assert.match(css,/\.brd-stop\.before,.brd-stop\.after/);
});

test('운행 정보창은 반응형 시트이며 새 캐시로 배포된다',()=>{
  assert.match(css,/#book-route-detail-wrap/);
  assert.match(css,/@media\(min-width:768px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(html,/nimbi_rail\.css\?v=2026090801/);
  assert.match(html,/nimbi_rail\.js\?v=2026090801/);
  assert.match(sw,/nimbirail-2026090801/);
});
