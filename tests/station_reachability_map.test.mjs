import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');

test('역 상세 카드는 전체 지도 직통역 보기로 연결된다',()=>{
  assert.match(app,/onclick="openStationReachabilityMap/);
  assert.match(app,/지도에서 직통역 보기/);
  assert.match(app,/function openStationReachabilityMap\(stn\)/);
  assert.match(css,/\.si-network-map-action/);
});

test('직통역은 실제 정차 편성과 전철 운행 편성에서 계산한다',()=>{
  assert.match(app,/function _directReachableStations\(stn,mode\)/);
  assert.match(app,/!isPassStop\(t,s\.s\)/);
  assert.match(app,/Object\.values\(METRO_SCHED\)/);
  assert.match(app,/names\.includes\(stn\)/);
});

test('전체 네트워크에서 출발역과 직통역을 구분해 표시한다',()=>{
  assert.match(app,/const isReachable=!!\(reachView&&reachView\.stations\.has\(s\.n\)\)/);
  assert.match(app,/const isReachOrigin=!!\(reachView&&reachView\.origin===s\.n\)/);
  assert.match(app,/map-station-reachable/);
  assert.match(app,/환승 없이 갈 수 있는 역/);
  assert.match(css,/\.map-reach-summary/);
});
