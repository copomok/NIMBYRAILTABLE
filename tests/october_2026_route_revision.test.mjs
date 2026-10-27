import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const rail=vm.createContext({});
for(const file of ['data/nimbi_rail_data.js','data/nimbi_20261027_revision.js','data/nimbi_realplat.js','data/nimbi_regional_platforms.js'])
  vm.runInContext(read(file),rail,{filename:file});
vm.runInContext('globalThis.trains=ALL_TRAINS;globalThis.platforms=REAL_PLAT',rail);
const train=no=>rail.trains.find(item=>Number(item.no)===no);
const min=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};

test('태백황지발 무궁화호 5편은 중랑에서 2분만 정차한다',()=>{
  const originalDepartures=new Map([[1692,'10:15'],[1694,'13:10'],[1696,'16:10'],[1698,'19:15'],[1700,'22:27']]);
  for(const no of [1692,1694,1696,1698,1700]){
    const stops=train(no).stops,index=stops.findIndex(item=>item.s==='중랑');
    assert.equal(min(stops[index].dep)-min(stops[index].arr),2);
    assert.equal(min(stops[index+1].arr)-min(stops[index].dep),2);
    assert.equal(stops[index].dep,originalDepartures.get(no));
  }
});

test('1484호는 1464호를 삼례-한강로 어디에서도 무단으로 앞서지 않는다',()=>{
  const a=train(1464),b=train(1484),byStation=new Map(a.stops.map(stop=>[stop.s,stop]));
  for(const item of b.stops){
    const front=byStation.get(item.s);
    if(!front||!item.arr||!front.dep)continue;
    assert.ok(min(item.arr)-min(front.dep)>=3,`${item.s}: 1464호 출발과 1484호 도착 간격`);
  }
});

const metro=vm.createContext({});
for(const file of [
  'data/nimbi_station_data.js','data/nimbi_metro.js','data/nimbi_metro_sched.js',
  'data/nimbi_metro_geo.js','data/nimbi_platform_db.js',
  'data/nimbi_realplat.js','data/nimbi_homonyms.js','data/nimbi_station_db_updates.js',
  'data/nimbi_metro_station_renames.js','data/nimbi_metro_20261023_update.js',
  'data/nimbi_20261027_metro_routes.js'
])vm.runInContext(read(file),metro,{filename:file});
vm.runInContext('globalThis.metro={lines:METRO_LINES,geo:METRO_GEO,station:STATION_DB,sched:METRO_SCHED}',metro);

test('교하선·서산선 역, 좌표, 노선도 인덱스가 같은 순서에 있다',()=>{
  for(const name of ['교하선','서산선']){
    const line=metro.metro.lines.find(item=>item.name===name),geo=metro.metro.geo[name];
    assert.equal(line.stations.length,geo.m.length,name);
    assert.deepEqual(Array.from(line.routes[0].stations),Array.from(line.stations),name);
    for(const target of name==='교하선'?['덕양','내곡']:['성내','내곡']){
      const index=line.stations.indexOf(target),station=metro.metro.station[`${target}역`];
      assert.deepEqual(Array.from(geo.m[index]),[station.lon,station.lat],`${name} ${target}`);
      const [before,current,after]=line.routes[0].xy.slice(index-1,index+2);
      assert.ok(current[0]>Math.min(before[0],after[0])&&current[0]<Math.max(before[0],after[0]),`${name} ${target} 노선도 X`);
      assert.ok(current[1]>Math.min(before[1],after[1])&&current[1]<Math.max(before[1],after[1]),`${name} ${target} 노선도 Y`);
    }
  }
});

test('광주1호선 일곡은 예향 이후이며 본선 광주-공항 연결을 보존한다',()=>{
  const line=metro.metro.lines.find(item=>item.name==='광주1호선');
  assert.equal(line.stations.at(-1),'일곡');
  assert.deepEqual(Array.from(line.routes[1].stations),['예향','일곡','광주']);
  assert.deepEqual(Array.from(line.routes[0].stations.slice(0,3)),['평동','광주','공항']);
  assert.equal(metro.metro.geo['광주1호선'].m.length,line.stations.length);
});
