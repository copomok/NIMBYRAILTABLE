import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');

test('전철 경로 검색은 출발·도착 기준 시각과 경유지를 받는다',()=>{
  assert.match(app,/id="mr-via"/);
  assert.match(app,/id="mr-datetime"[^>]+type="datetime-local"|type="datetime-local"[^>]+id="mr-datetime"/);
  assert.match(app,/data-time-mode="depart"/);
  assert.match(app,/data-time-mode="arrive"/);
  assert.match(app,/function _mrPlannedRoute\(from,via,to,mode\)/);
});

test('출발 검색은 익일 4시 영업 경계를 넘겨 다음날 첫차를 붙이지 않는다',()=>{
  assert.match(app,/if\(ds>=1440\|\|as>1440\)continue/);
  assert.match(app,/익일 오전 4시 전 연결 열차가 없어/);
  assert.match(app,/여기까지만 이동할 수 있습니다/);
});

test('도착 시각 기준 검색은 목적지부터 선행 열차를 역산한다',()=>{
  assert.match(app,/function _metroSegServiceBefore/);
  assert.match(app,/if\(_mrTimeMode==='arrive'\)/);
  assert.match(app,/for\(let i=r\.segments\.length-1;i>=0;i--\)/);
});

test('각 환승 구간은 승차역 출발과 하차역 도착 시각을 모두 표시한다',()=>{
  assert.match(app,/class="rt-node rt-leg-arrive"/);
  assert.match(app,/<b>\$\{fmt\(lg\.arr\)\}<\/b><small>도착<\/small>/);
});

test('지도 역 팝업에서 출발·경유·도착지를 설정할 수 있다',()=>{
  assert.match(app,/setMapStationAsRoutePoint\('from'/);
  assert.match(app,/setMapStationAsRoutePoint\('via'/);
  assert.match(app,/setMapStationAsRoutePoint\('to'/);
  assert.match(css,/\.map-route-point-actions/);
});

test('검색 경로는 실제 지도 강조와 별도 선형 노선도로 볼 수 있다',()=>{
  assert.match(app,/_mrOpenMap\('map'\)/);
  assert.match(app,/_mrOpenMap\('linear'\)/);
  assert.match(app,/class="map-journey-route"/);
  assert.match(app,/function _mrShowLinearDiagram/);
  assert.match(app,/function showMetroLineLinear/);
  assert.match(app,/>선형 노선도<\/button>/);
  assert.match(css,/\.mr-linear-overlay/);
});
