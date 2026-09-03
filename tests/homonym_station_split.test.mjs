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

test('동명이역마다 대표 역 하나만 괄호 없는 이름을 사용한다', () => {
  for (const name of ambiguous) {
    const keys = Object.keys(context.result.stations).filter(key => key === `${name}역` || key.startsWith(`${name}(`));
    assert.ok(keys.includes(`${name}역`), `${name}: 대표 역`);
    assert.ok(keys.length >= 2, `${name}: 분리된 역`);
    assert.equal(keys.filter(key => key === `${name}역`).length, 1, `${name}: 괄호 없는 이름은 하나`);
  }
});

test('대표 동명이역 쌍은 서로 다른 인게임 좌표를 유지한다', () => {
  const pairs = [
    ['장흥역','장흥(교외선)역'], ['송정역','송정(부산)역'],
    ['춘양(경전선)역','춘양역'], ['장성역','장성(포항)역'],
    ['월곶역','월곶(김포)역'], ['내곡(고양)역','내곡역'],
    ['내덕역','내덕(김해)역'], ['고성역','고성(경남)역'],
    ['북평(정선)역','북평역'], ['신동역','신동(춘천)역']
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
  assert.ok(stations('신강서선').includes('송정'));
  assert.ok(stations('개봉서정선').includes('월곶'));
  assert.ok(stations('청주선').includes('내덕'));
  assert.ok(stations('제2경의선').includes('내곡(고양)'));
  assert.ok(context.result.trains.some(train => train.stops.some(stop => stop.s === '장흥(교외선)')));
  assert.ok(context.result.trains.some(train => train.stops.some(stop => stop.s === '장흥')));
});

test('통합 검색은 분리된 역 DB 키를 각각 별도 결과로 만든다', () => {
  const shell = fs.readFileSync('js/features/nimbi_shell.js', 'utf8');
  assert.match(shell, /const key=`station:\$\{name\}`/);
  for (const name of ['금천역','금천(황해)역','금천(경북)역','송정역','송정(부산)역']) {
    assert.ok(context.result.stations[name], `${name}: 검색 원본`);
  }
});
