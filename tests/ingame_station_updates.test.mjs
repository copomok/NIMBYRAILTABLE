import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('..',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');

function loadStationDatabases(){
  const context=vm.createContext({console});
  vm.runInContext(`${read('data/nimbi_station_data.js')}\n${read('data/nimbi_platform_db.js')}\n${read('data/nimbi_station_db_updates.js')}\nthis.stations=STATION_DB;this.platforms=PLATFORM_DB;`,context);
  return context;
}

test('최신 인게임 역 diff는 신설·이름·승강장·노선 변경을 모두 보존한다',()=>{
  const context=loadStationDatabases();
  assert.deepEqual(JSON.parse(JSON.stringify(context.NIMBI_INGAME_STATION_REVISIONS.counts)),{
    added:13,renamed:1,moved:4,platformChanged:8,lineChanged:55,total:76
  });
  for(const name of ['이수역','내방역','서초역','교대역','서강남역','서역삼역','역삼중앙역','선릉역','삼성역','종합운동장역','잠실새내역','이촌역','동작역']){
    assert.ok(context.stations[name],`${name} 역 DB가 필요합니다`);
    assert.ok(context.stations[name].platforms.length,`${name} 승강장 정보가 필요합니다`);
    assert.ok(context.platforms[name],`${name} 승강장별 노선 DB가 필요합니다`);
  }
});

test('방향 접미사를 제거한 승강장 번호와 동명이역·북한 표시명을 정확히 갱신한다',()=>{
  const {stations,platforms}=loadStationDatabases();
  assert.deepEqual([...stations['신월역'].platforms],[1,4,5,6]);
  assert.deepEqual([...stations['선유도역'].platforms],[1,4]);
  assert.deepEqual([...stations['상도(강서선)역'].platforms],[1,2,5,6]);
  assert.deepEqual([...stations['세포읍'].platforms],[1,2,3,4]);
  assert.deepEqual([...stations['고산읍'].platforms],[1,2,3,4]);
  assert.deepEqual([...stations['안변읍'].platforms],[1,2,3,4]);
  assert.ok(stations['한강로역'].platforms.includes(14));
  assert.ok(!stations['한강로역'].platforms.includes(2));
  assert.ok(stations['잠실역'].platforms.includes(11)&&stations['잠실역'].platforms.includes(12));
  assert.ok(platforms['상도(강서선)역']['5'].l.some(line=>line.includes('강서선')));
});

test('인게임 개명은 검색·운행 데이터까지 호평으로 통일하고 배포 자산에 연결한다',()=>{
  const {stations}=loadStationDatabases();
  assert.ok(stations['호평역']);
  assert.equal(stations['평동초등학교'],undefined);
  assert.doesNotMatch(read('data/nimbi_rail_data.js'),/평동초등학교/);
  assert.doesNotMatch(read('data/nimbi_north_ingame_routes.js'),/평동초등학교/);
  assert.match(read('index.html'),/nimbi_homonyms\.js[^]*nimbi_station_db_updates\.js[^]*nimbi_regional_platforms\.js/);
  assert.match(read('sw.js'),/data\/nimbi_station_db_updates\.js/);
});

test('재생성 도구는 인게임 승강장의 N·S·E·W 접미사를 숫자 승강장으로 정규화한다',()=>{
  const source=read('tools/extract_ingame_station_updates.mjs');
  assert.match(source,/match\(\/\^\(\\d\+\)\//);
  assert.match(source,/DISPLAY_KEY_BY_ID/);
  assert.match(source,/previousLines/);
});
