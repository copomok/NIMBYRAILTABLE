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
  'data/nimbi_regional_platforms.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
vm.runInContext('globalThis.__platforms=REAL_PLAT', context);

test('여주 계통별 주 승강장을 유지한다', () => {
  for (let no = 681; no <= 700; no++) {
    assert.equal(context.__platforms[no]?.['여주'], no % 2 ? 1 : 2, `#${no} 여주 SRT`);
  }
  for (let no = 1761; no <= 1776; no++) {
    assert.equal(context.__platforms[no]?.['여주'], no % 2 ? 3 : 4, `#${no} 여주 무궁화`);
  }
});

test('봉화·춘양의 확인된 계통별 주 승강장을 유지한다', () => {
  for (let no = 691; no <= 700; no++) {
    assert.equal(context.__platforms[no]?.['춘양'], 1, `#${no} 춘양 SRT`);
    assert.equal(context.__platforms[no]?.['봉화'], 1, `#${no} 봉화 SRT`);
  }
  for (const [first, last] of [[1221, 1236], [1621, 1636], [1641, 1644]]) {
    for (let no = first; no <= last; no++) {
      const expected = no % 2 ? 3 : 2;
      assert.equal(context.__platforms[no]?.['춘양'], expected, `#${no} 춘양 일반열차`);
      assert.equal(context.__platforms[no]?.['봉화'], expected, `#${no} 봉화 일반열차`);
    }
  }
});

test('철회한 전수 승강장 오버레이를 앱에서 불러오거나 캐시하지 않는다', () => {
  assert.doesNotMatch(fs.readFileSync('index.html', 'utf8'), /nimbi_ingame_platforms/);
  assert.doesNotMatch(fs.readFileSync('sw.js', 'utf8'), /nimbi_ingame_platforms/);
});

test('남도해양 전 편은 영업 구간 전체에 방향별 승강장이 연결된다', () => {
  const trains=vm.runInContext('ALL_TRAINS',context);
  for(const train of trains.filter(item=>item.grade==='남도해양')){
    for(const stop of train.stops){
      assert.ok(Number.isFinite(context.__platforms[train.no]?.[stop.s]),`#${train.no} ${stop.s}`);
    }
  }
  assert.equal(context.__platforms[2501]?.['보성'],3);
  assert.equal(context.__platforms[2502]?.['보성'],4);
  assert.equal(context.__platforms[2521]?.['통영'],1);
  assert.equal(context.__platforms[2522]?.['통영'],4);
});

test('병목안 하행 1번 계통의 대응 상행은 4번 승강장을 쓴다', () => {
  const trains=vm.runInContext('ALL_TRAINS',context);
  for(const down of trains.filter(item=>item.dir==='down'&&context.__platforms[item.no]?.['병목안']===1)){
    const up=trains.find(item=>Number(item.no)===Number(down.no)+1&&item.dir==='up');
    if(up?.stops.some(stop=>stop.s==='병목안'))assert.equal(context.__platforms[up.no]?.['병목안'],4,`#${up.no}`);
  }
});

test('이천·경기광주 SRT는 방향별 본선 승강장을 일관되게 쓴다', () => {
  for(let no=681;no<=700;no++){
    const up=no%2===0;
    assert.equal(context.__platforms[no]?.['이천'],up?2:1,`#${no} 이천`);
    assert.equal(context.__platforms[no]?.['경기광주'],up?4:3,`#${no} 경기광주`);
  }
});
