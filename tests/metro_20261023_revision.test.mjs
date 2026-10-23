import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={};
vm.createContext(context);
for(const file of [
  'data/nimbi_metro.js','data/nimbi_metro_sched.js','data/nimbi_metro_geo.js',
  'data/nimbi_platform_db.js','data/nimbi_station_data.js',
  'data/nimbi_metro_platform_directions.js','data/nimbi_metro_20261023_update.js'
])vm.runInContext(read(file),context);
vm.runInContext('globalThis.snapshot={lines:METRO_LINES,sched:METRO_SCHED,geo:METRO_GEO,stations:typeof STATION_DB==="undefined"?null:STATION_DB,platforms:typeof PLATFORM_DB==="undefined"?null:PLATFORM_DB}',context);
const {lines,sched,geo,stations,platforms}=context.snapshot;

test('인게임 개편 노선과 실제 운행편이 반영된다',()=>{
  const expected={경의중앙선:112,성남화성선:202,교하선:141,남북선:118,'GTX-A':76};
  for(const [name,count] of Object.entries(expected)){
    assert.equal(sched[name].t.length,count,name);
    assert.equal(sched[name].c.length,count,name);
    assert.equal(geo[name].m.length,sched[name].s.length,name);
    for(const trip of sched[name].t){
      assert.ok(trip.length>=6&&trip.length%3===0,`${name} 단일역 주박이나 손상된 편성`);
      for(let i=2;i<trip.length;i+=3)assert.ok(trip[i]>=0&&trip[i]<sched[name].s.length,`${name} 역 인덱스`);
    }
  }
  assert.deepEqual(Array.from(sched.경의중앙선.s.slice(0,8)),['임진강','문산','월롱','덕은','금릉','운정','야당','탄현']);
  assert.deepEqual(Array.from(sched.성남화성선.s.slice(0,4)),['잠실','가락','복정','수진']);
  assert.equal(lines.find(line=>line.name==='경의중앙선').color,'#10b0a8');
  assert.equal(context.NIMBI_METRO_OCTOBER_REVISION.lines.성남화성선.rawRuns,1344);
  assert.deepEqual(Array.from(sched.교하선.s.slice(15,18)),['이태원','녹사평','서빙고']);
  assert.deepEqual(Array.from(sched.남북선.s.slice(6,9)),['서빙고','한강진','한남']);
  assert.ok(!sched['GTX-A'].s.includes('야당'));
  for(const oldName of ['경의선','중앙선']){
    assert.ok(!lines.some(line=>line.name===oldName));
    assert.equal(sched[oldName],undefined);
    assert.equal(geo[oldName],undefined);
  }
});

test('신설역 위치는 인게임 좌표와 일치하고 주박선 연결은 유지된다',()=>{
  const gameCoords={
    녹사평:[126.987302,37.535221],한강진:[127.000721,37.536615],
    운정:[126.767016,37.725557],탄현:[126.761121,37.69445],풍산:[126.78635,37.672223]
  };
  for(const [name,coordinates] of Object.entries(gameCoords)){
    const line=Object.keys(sched).find(key=>sched[key]?.s?.includes(name)&&geo[key]?.m);
    assert.ok(line,`${name} 사이트 노선`);
    assert.deepEqual(Array.from(geo[line].m[sched[line].s.indexOf(name)]),coordinates,`${name} 좌표`);
  }
  assert.deepEqual(Array.from(geo.남북선.d.map(item=>item.j)),[17,0]);
  assert.deepEqual(Array.from(geo.경의중앙선.d.map(item=>item.j)),[15,13,0]);
  assert.equal(stations?.['녹사평역']?.lon,126.987302);
  assert.ok(platforms?.['한강진역']);
});
