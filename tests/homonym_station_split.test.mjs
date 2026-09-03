import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ console });
for (const file of [
  'data/nimbi_rail_data.js', 'data/nimbi_station_data.js', 'data/nimbi_metro.js',
  'data/nimbi_metro_sched.js', 'data/nimbi_platform_db.js', 'data/nimbi_realplat.js',
  'data/nimbi_homonyms.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename:file });
vm.runInContext('this.result={trains:ALL_TRAINS,lines:METRO_LINES,schedules:METRO_SCHED,stations:STATION_DB,platforms:PLATFORM_DB}', context);

const ambiguous = ['고성','금천','내곡','내덕','덕양','반송','북평','비산','삼산','상도','선암','성내','송정','신동','신정','신천','안정','연희','월곶','일곡','장곡','장성','장수','장안','장흥','춘양','태전','화정','흥덕'];

test('운행 데이터에는 미분리 동명이역이 남지 않는다', () => {
  const names = [];
  for (const train of context.result.trains) names.push(...train.stops.map(stop => stop.s));
  for (const line of context.result.lines) for (const route of line.routes || []) names.push(...(route.stations || []));
  for (const schedule of Object.values(context.result.schedules)) names.push(...(schedule.s || []));
  assert.deepEqual([...new Set(names.filter(name => ambiguous.includes(name)))], []);
});

test('대표 동명이역 쌍은 서로 다른 인게임 좌표를 유지한다', () => {
  const pairs = [
    ['장흥(경전선)역','장흥(교외선)역'], ['송정(서울)역','송정(부산)역'],
    ['춘양(경전선)역','춘양(영동선)역'], ['장성(호남선)역','장성(포항)역'],
    ['월곶(시흥)역','월곶(김포)역'], ['내곡(고양)역','내곡(서울)역'],
    ['내덕(청주)역','내덕(김해)역'], ['고성(강원)역','고성(경남)역'],
    ['북평(정선)역','북평(동해)역'], ['신동(태백)역','신동(춘천)역']
  ];
  for (const [a,b] of pairs) {
    assert.ok(context.result.stations[a], a);
    assert.ok(context.result.stations[b], b);
    assert.notDeepEqual(
      [context.result.stations[a].lon, context.result.stations[a].lat],
      [context.result.stations[b].lon, context.result.stations[b].lat]
    );
  }
});

test('노선 문맥에 맞는 동명이역으로 연결된다', () => {
  const stations = lineName => context.result.lines.find(line => line.name === lineName)?.routes.flatMap(route => route.stations) || [];
  assert.ok(stations('신강서선').includes('송정(서울)'));
  assert.ok(stations('개봉서정선').includes('월곶(시흥)'));
  assert.ok(stations('청주선').includes('내덕(청주)'));
  assert.ok(stations('제2경의선').includes('내곡(고양)'));
  assert.ok(context.result.trains.some(train => train.stops.some(stop => stop.s === '장흥(교외선)')));
  assert.ok(context.result.trains.some(train => train.stops.some(stop => stop.s === '장흥(경전선)')));
});
