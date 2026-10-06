import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../js/features/nimbi_shell.js',import.meta.url),'utf8');
const engagement=fs.readFileSync(new URL('../js/features/nimbi_engagement.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');

test('전철 홈은 장거리열차가 아닌 전철 시각표 스냅샷으로 집계한다',()=>{
  assert.match(app,/function _metroHomeSnapshot\(\)/);
  assert.match(app,/Object\.entries\(typeof METRO_SCHED/);
  assert.match(app,/_metroTrainLivePos\(line,svcIdx\)/);
  assert.match(shell,/function renderMetroOverview\(host\)/);
  assert.match(shell,/if\(appMode==='metro'\)\{\s*renderMetroOverview/);
  assert.match(shell,/도시철도 운행 편성과 노선별 현재 위치/);
  assert.match(shell,/openMetroTrain\('\$\{esc\(train\.line\)\}'/);
  assert.match(shell,/급행·특급/);
});

test('전철용 홈 하단은 전철 경로·노선 운행 정보로 별도 구성된다',()=>{
  assert.match(engagement,/function renderMetroDailyDiscovery\(host\)/);
  assert.match(engagement,/if\(currentMode==='metro'\)\{renderMetroDailyDiscovery\(host\);return;\}/);
  assert.match(engagement,/homeMetroRouteSearch/);
  assert.match(engagement,/_mrFrom=from;_mrVia='';_mrTo=to/);
  assert.match(engagement,/노선별 현재 운행/);
});

test('기차 모드 역 상세는 전철 승강장 노선·방향만 정적으로 안내한다',()=>{
  assert.match(app,/function _metroPlatformGuideHTML\(stn\)/);
  assert.match(app,/METRO PLATFORMS/);
  assert.match(app,/전철 승강장 안내/);
  assert.match(app,/운행 방향 기준/);
  assert.match(app,/_appMode!=='metro'\?_metroPlatformGuideHTML\(trainName\)/);
  assert.match(app,/_appMode!=='metro'&&trains\.length\?`<div id="si-platform-trains"/);
  assert.match(css,/\.si-metro-platform-guide/);
  assert.match(css,/\.si-metro-platform-rows/);
});
