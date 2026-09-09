import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../js/features/nimbi_shell.js',import.meta.url),'utf8');

test('북한 지도 표기명과 시간표 원본 역명을 같은 역으로 조회한다',()=>{
  assert.match(app,/NORTH_STATION_DATA_ALIASES=\{[^}]*'은산':'은산읍'[^}]*'강계':'강계학생소년궁전'/);
  assert.match(app,/function getRailTrainsByStation\(raw\)/);
  assert.match(app,/getRailTrainsByStation\(stn\)\.forEach/);
  assert.match(app,/function _stationStoppingTrains\(trainName\)[\s\S]*getRailTrainsByStation\(trainName\)/);
});

test('북한 시간표의 역과 열차와 노선을 기존 조회 화면 색인에 포함한다',()=>{
  assert.match(shell,/ALL_TRAINS[\s\S]*stationNames\.add\(stop\.s\)/);
  assert.match(shell,/ALL_TRAINS\.filter\(train=>typeof isRailTrainInRegion/);
  assert.match(app,/const names=\[\.\.\.new Set\(ALL_TRAINS[\s\S]*isRailTrainInRegion/);
  assert.match(app,/setRailRegion\(region\)[\s\S]*_populateTrainLineSelect\(\)/);
});

test('전체 지역은 남북 노선을 모두 검색하고 지역별 역 목록은 공통 판정을 쓴다',()=>{
  assert.match(shell,/_railRegion==='all'/);
  assert.match(shell,/isRailStationInRegion\(raw\)/);
  assert.match(app,/if\(_railRegion==='all'\)return true/);
});
