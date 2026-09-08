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

test('직통 편성의 실제 연속 운행 경로를 강조한다',()=>{
  assert.match(app,/function _mapReachEdgeKey\(a,b\)/);
  assert.match(app,/edges\.add\(_mapReachEdgeKey/);
  assert.match(app,/reachView\.edges\.has\(_mapReachEdgeKey\(a\.n,b\.n\)\)/);
  assert.match(app,/class="map-reachable-route"/);
});

test('시각 없는 중간역도 실제 노선도 순서로 펼쳐 직통 경로가 끊기지 않는다',()=>{
  assert.match(app,/function _addMapReachPathEdges\(edges,a,b,mode\)/);
  assert.match(app,/const _mapReachPathCache=\{train:null,metro:null\}/);
  assert.match(app,/for\(let index=best\.from;index!==best\.to;index\+=step\)/);
  assert.match(app,/_addMapReachPathEdges\(edges,routeStops\[i\]\.s,routeStops\[i\+1\]\.s,mode\)/);
});

test('직통 경로 강조선은 역 아이콘과 같은 파란색을 사용한다',()=>{
  assert.match(app,/class="map-reachable-route"[^>]+stroke="var\(--accent\)"/);
});

test('태백선 노선도는 인게임 좌표의 신동 태백역을 사용한다',()=>{
  const taebaek=app.slice(app.indexOf('taebaek:{'),app.indexOf('jeongseon:{'));
  assert.match(taebaek,/\{n:'신동\(태백\)',x:587,y:226\}/);
  assert.doesNotMatch(taebaek,/\{n:'신동',/);
  const railData=fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8');
  const stationData=fs.readFileSync(new URL('../data/nimbi_station_data.js',import.meta.url),'utf8');
  assert.match(railData,/if\(stop\.s==='신동'\)stop\.s='신동\(태백\)'/);
  assert.match(stationData,/"신동\(태백\)역":\{lon:128\.639945,lat:37\.207512/);
});

test('중부내륙선 노선도에 수영-장호원·상주-구미 지선을 표시한다',()=>{
  const line=app.slice(app.indexOf('jungnaelyuk:{'),app.indexOf('nambunaelyuk:{'));
  assert.match(line,/dash:true, stations:\[\s*\{n:'수영',x:194,y:217\},\s*\{n:'장호원',x:354,y:253\}/);
  assert.match(line,/dash:true, stations:\[\s*\{n:'상주',x:482,y:457\},\s*\{n:'구미',x:522,y:542\}/);
});

test('경전선 본선의 내서와 조성 접속 지선 순서를 유지한다',()=>{
  const line=app.slice(app.indexOf('gyeongjeon:{'),app.indexOf('jeju:{'));
  assert.match(line,/\{n:'창원',x:599,y:809\},\s*\{n:'내서',x:564,y:797\},\s*\{n:'함안',x:538,y:792\}/);
  assert.match(line,/dash:true, stations:\[\s*\{n:'조성',x:262,y:928\},\s*\{n:'춘양\(전남\)',x:197,y:903\},\s*\{n:'빛가람',x:153,y:866\},\s*\{n:'광주',x:155,y:831\}/);
  assert.doesNotMatch(line,/\{n:'춘양\(전남\)',x:197,y:903\},\s*\{n:'보성'/);
});

test('직통역이 많은 지도는 역점과 경로를 유지하면서 역명만 제한한다',()=>{
  assert.match(app,/const reachLabelThreshold=32/);
  assert.match(app,/const reachLabelLimit=28/);
  assert.match(app,/item\.important&&!item\.origin/);
  assert.match(app,/const showReachLabel=!reachView\|\|reachLabelKeys\.has\(rkey\)/);
  assert.match(app,/<title>\$\{s\.n\}<\/title>/);
});
