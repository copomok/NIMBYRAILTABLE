import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context = {};
vm.createContext(context);
for (const file of [
  'data/nimbi_rail_data.js',
  'data/nimbi_station_data.js',
  'data/nimbi_platform_db.js',
  'data/nimbi_realplat.js',
  'data/nimbi_homonyms.js',
  'data/nimbi_regional_platforms.js',
  'data/nimbi_ingame_platforms.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT', context);

const isTime = value => /^\d{1,2}:\d{2}$/.test(String(value || ''));
const isBusinessStop = (stop, index, length) => index === 0 || index === length - 1 || (isTime(stop.arr) && isTime(stop.dep));

test('모든 간선열차의 모든 영업 정차역에 숫자 승강장이 매핑된다', () => {
  const missing = [];
  for (const train of context.__trains) train.stops.forEach((stop, index) => {
    if (!isBusinessStop(stop, index, train.stops.length)) return;
    if (!Number.isInteger(context.__platforms[train.no]?.[stop.s])) missing.push(`#${train.no} ${stop.s}`);
  });
  assert.deepEqual(missing, []);
});

test('통과역에는 승강장을 잘못 노출하지 않는다', () => {
  const stale = [];
  for (const train of context.__trains) train.stops.forEach((stop, index) => {
    if (isBusinessStop(stop, index, train.stops.length)) return;
    if (Object.hasOwn(context.__platforms[train.no] || {}, stop.s)) stale.push(`#${train.no} ${stop.s}`);
  });
  assert.deepEqual(stale, []);
});

test('인게임 방향 문자는 제거되고 승강장 번호만 저장된다', () => {
  for (const map of Object.values(context.__platforms)) {
    for (const platform of Object.values(map)) assert.equal(typeof platform, 'number');
  }
});

test('춘양·봉화는 일반 영동선과 잠실–봉화 SRT의 인게임 계통값을 구분한다', () => {
  for (const no of ['691', '692', '693', '694', '695', '696', '697', '698', '699', '700']) {
    assert.equal(context.__platforms[no]?.['춘양'], 1, `#${no} 춘양`);
    assert.equal(context.__platforms[no]?.['봉화'], 1, `#${no} 봉화`);
  }
  for (const no of ['1621', '1623', '1625', '1627', '1629', '1631', '1633', '1635']) {
    assert.equal(context.__platforms[no]?.['춘양'], 3, `#${no} 춘양`);
    assert.equal(context.__platforms[no]?.['봉화'], 1, `#${no} 봉화`);
  }
  for (const no of ['1622', '1624', '1626', '1628', '1630', '1632', '1634', '1636']) {
    assert.equal(context.__platforms[no]?.['춘양'], 2, `#${no} 춘양`);
    assert.equal(context.__platforms[no]?.['봉화'], 2, `#${no} 봉화`);
  }
});
