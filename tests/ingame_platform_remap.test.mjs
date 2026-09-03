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
  const yeongdongDown = ['1621', '1623', '1625', '1627', '1629', '1631', '1633', '1635'];
  for (const no of yeongdongDown) {
    assert.equal(context.__platforms[no]?.['춘양'], 3, `#${no} 춘양`);
    assert.equal(context.__platforms[no]?.['봉화'], 3, `#${no} 봉화`);
  }
  for (const no of ['1622', '1624', '1626', '1628', '1630', '1632', '1634', '1636']) {
    assert.equal(context.__platforms[no]?.['춘양'], 2, `#${no} 춘양`);
    assert.equal(context.__platforms[no]?.['봉화'], 2, `#${no} 봉화`);
  }
});

test('같은 서울–부산 구간도 무궁화호와 ITX-청춘의 전용 승강장을 구분한다', () => {
  for (const no of ['1301', '1302', '1303', '1304', '1305', '1306']) {
    assert.equal(context.__platforms[no]?.['서울'], 5, `#${no} 서울`);
    assert.equal(context.__platforms[no]?.['부산'], 8, `#${no} 부산`);
  }
  for (const no of ['2001', '2003', '2005']) {
    assert.equal(context.__platforms[no]?.['서울'], 16, `#${no} 서울 하행`);
    assert.equal(context.__platforms[no]?.['부산'], 5, `#${no} 부산`);
  }
  for (const no of ['2002', '2004', '2006']) {
    assert.equal(context.__platforms[no]?.['서울'], 15, `#${no} 서울 상행`);
    assert.equal(context.__platforms[no]?.['부산'], 5, `#${no} 부산`);
  }
});

test('여주는 계통·방향별 인게임 주 승강장 하나만 사용한다', () => {
  for (const no of ['681', '683', '685', '687', '689', '691', '693', '695', '697', '699']) {
    assert.equal(context.__platforms[no]?.['여주'], 1, `#${no} 여주 SRT 하행`);
  }
  for (const no of ['682', '684', '686', '688', '690', '692', '694', '696', '698', '700']) {
    assert.equal(context.__platforms[no]?.['여주'], 2, `#${no} 여주 SRT 상행`);
  }
  for (const no of ['1761', '1763', '1765', '1767', '1769', '1771', '1773', '1775']) {
    assert.equal(context.__platforms[no]?.['여주'], 3, `#${no} 여주 무궁화 하행`);
  }
  for (const no of ['1762', '1764', '1766', '1768', '1770', '1772', '1774', '1776']) {
    assert.equal(context.__platforms[no]?.['여주'], 4, `#${no} 여주 무궁화 상행`);
  }
});

test('복수 승강장 원본은 보조 승강장을 제외하고 주 승강장 하나로 고정한다', () => {
  const groups = new Map();
  for (const train of context.__trains) {
    const signature = [train.grade, train.line, train.stops[0]?.s, train.stops.at(-1)?.s, train.dir].join('|');
    train.stops.forEach((stop, index) => {
      if (!isBusinessStop(stop, index, train.stops.length)) return;
      const key = `${signature}|${stop.s}`;
      const values = groups.get(key) || new Set();
      values.add(context.__platforms[train.no]?.[stop.s]);
      groups.set(key, values);
    });
  }
  const mixed = [...groups.entries()].filter(([, values]) => values.size > 1).map(([key, values]) => `${key}: ${[...values]}`);
  assert.deepEqual(mixed, []);
});
