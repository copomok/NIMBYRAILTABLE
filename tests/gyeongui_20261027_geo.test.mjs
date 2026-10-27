import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const stationData=fs.readFileSync(new URL('../data/nimbi_station_data.js',import.meta.url),'utf8');
const revision=fs.readFileSync(new URL('../data/nimbi_gyeongui_20261027_revision.js',import.meta.url),'utf8');
const rail=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context={};
vm.runInNewContext(`${stationData}\n${revision}\nthis.stations=STATION_DB`,context);
const stations=context.stations;
const route=context.NIMBI_GYEONGUI_20261027_STATIONS;
const mapSource=rail.match(/const MAP_LINES = (\{[\s\S]*?\n\});\n\nconst NORTH_MAP_LINE_KEYS/);
assert.ok(mapSource);
const MAP_LINES=vm.runInNewContext(`(${mapSource[1]})`);

test('새 경의선 31개 현역 역은 서울-신의주 순서와 인게임 좌표를 따른다',()=>{
  assert.equal(route.length,31);
  assert.equal(route.map(([name])=>name).join(','),
    '서울,마포,행신,일산,문산,도라산,판문,개성공단,개성,금천,평산,서흥,사리원,송림,평양,서평양,서포,순안,평원,금풍,문덕,안주역전,운전,운하,정주,곽산,선천,동림,염주,룡천,신의주');
  for(const [name,id,lon,lat] of route){
    assert.match(id,/^\d+$/);
    assert.equal(stations[name].lon,lon,name);
    assert.equal(stations[name].lat,lat,name);
    assert.ok(stations[name].lines.includes('경의선'),name);
  }
  assert.equal(stations.사리원.lon,125.76367);
  assert.equal(stations.송림.lon,125.641956);
});

test('같은 이름의 구 좌표는 (구) 폐역으로 보존하고 남한 동명역은 유지한다',()=>{
  for(const [name,[lon,lat]] of Object.entries(context.NIMBI_GYEONGUI_20261027_OLD_STATIONS)){
    const old=stations[`(구) ${name}역`];
    assert.equal(old.lon,lon,name);
    assert.equal(old.lat,lat,name);
    assert.equal(old.lines.length,0,name);
    assert.equal(old.closed,true,name);
  }
  assert.equal(stations['금천역'].lon,128.898349);
  assert.equal(stations['금천'].lon,126.471457);
  assert.equal(stations['송림역'].lon,125.641956);
  assert.equal(stations['(구) 송림역'].lon,125.657431);
  assert.match(index,/nimbi_gyeongui_20261027_revision\.js/);
});

test('경의선 노선도는 새 좌표를 투영하고 기존 노선과 접속한다',()=>{
  const south=MAP_LINES.gyeongui.routes[0].stations;
  const north=MAP_LINES.north.routes.find(line=>line.name==='경의선').stations;
  const joined=[...south,...north.slice(0,-1).reverse()];
  assert.equal(joined.map(stop=>stop.n).join(','),route.map(([name])=>name).join(','));
  for(const [name,,lon,lat] of route){
    const plotted=joined.find(stop=>stop.n===name);
    assert.equal(plotted.x,Math.round((lon-126.13)*235.4),name);
    assert.equal(plotted.y,Math.round((37.975-lat)*295.4),name);
  }
  for(const name of ['평양','평원','개성']){
    const point=north.find(stop=>stop.n===name);
    for(const line of MAP_LINES.north.routes){
      const shared=line.stations.find(stop=>stop.n===name);
      if(shared){assert.equal(shared.x,point.x,`${line.name}/${name}`);assert.equal(shared.y,point.y,`${line.name}/${name}`);}
    }
  }
});
