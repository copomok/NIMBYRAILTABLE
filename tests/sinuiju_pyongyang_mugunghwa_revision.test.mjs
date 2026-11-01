import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};vm.createContext(context);
for(const file of [
  'nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js',
  'nimbi_north_station_revision.js','nimbi_north_rail_revision.js',
  'nimbi_gonam_itx_revision.js','nimbi_pass_stations_revision.js',
  'nimbi_20261027_revision.js','nimbi_realplat.js','nimbi_regional_platforms.js',
  'nimbi_global_schedule_revision.js','nimbi_20261030_revision.js'
])vm.runInContext(fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8'),context,{filename:file});
vm.runInContext(fs.readFileSync(new URL('../js/core/nimbi_rail_index.js',import.meta.url),'utf8'),context,{filename:'nimbi_rail_index.js'});
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains.filter(train=>+train.no>=5401&&+train.no<=5428);
const platforms=context.__platforms;
const minute=value=>{const [hour,min]=value.split(':').map(Number);return hour*60+min;};
const elapsed=(from,to)=>(minute(to)-minute(from)+1440)%1440;
const offsets=train=>train.stops.map(stop=>[
  stop.s,
  stop.arr==null?null:elapsed(train.stops[0].dep,stop.arr),
  stop.dep==null?null:elapsed(train.stops[0].dep,stop.dep),
  stop.p??null,
]);
const downTemplate=[
  ['신의주',null,0,'1'],['룡천',8,9,'1'],['염주',18,19,'1'],['동림',25,27,'1'],
  ['선천',37,38,'1'],['곽산',49,50,'1'],['정주',57,58,'1'],['운하',70,71,'1'],
  ['운전',78,79,'1'],['안주역전',85,86,'3'],['문덕',93,94,'1'],['금풍',103,104,'1'],
  ['평원',110,111,'1'],['순안',119,120,'1'],['서포',127,128,'1'],['서평양',131,132,'1'],
  ['평양',136,null,'2'],
];
const upTemplate=[
  ['평양',null,0,'2'],['서평양',4,5,'4'],['서포',8,9,'2'],['순안',17,18,'2'],
  ['평원',26,27,'2'],['금풍',32,33,'2'],['문덕',42,43,'4'],['안주역전',50,51,'4'],
  ['운전',58,59,'2'],['운하',66,67,'2'],['정주',79,80,'4'],['곽산',86,87,'2'],
  ['선천',98,99,'2'],['동림',110,111,'2'],['염주',118,119,'2'],['룡천',127,129,'2'],
  ['신의주',137,null,'2'],
];

test('신의주–평양 무궁화호 28편은 사진의 양방향 원형과 승강장을 그대로 쓴다',()=>{
  assert.equal(trains.length,28);
  for(const train of trains){
    assert.equal(+train.no%2,train.dir==='down'?1:0);
    assert.deepEqual(JSON.parse(JSON.stringify(offsets(train))),train.dir==='down'?downTemplate:upTemplate,`#${train.no}`);
    for(const stop of train.stops)assert.equal(platforms[train.no][stop.s],Number(stop.p),`#${train.no} ${stop.s}`);
  }
  const source=fs.readFileSync(new URL('../data/nimbi_20261030_revision.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/holdAfter\(54\d\d/);
});

test('첫막차·배차·운전시분은 공통 조건을 만족한다',()=>{
  for(const dir of ['down','up']){
    const list=trains.filter(train=>train.dir===dir).sort((a,b)=>minute(a.stops[0].dep)-minute(b.stops[0].dep));
    const first=minute(list[0].stops[0].dep),lastArrival=minute(list.at(-1).stops.at(-1).arr);
    assert.ok(first>=300&&first<=390,`${dir} 첫차`);
    assert.ok(lastArrival>=1320&&lastArrival<=1439,`${dir} 막차`);
    for(let i=1;i<list.length;i++)assert.ok(minute(list[i].stops[0].dep)-minute(list[i-1].stops[0].dep)>=45,`${dir} #${list[i].no}`);
    for(const train of list)assert.equal(elapsed(train.stops[0].dep,train.stops.at(-1).arr),dir==='down'?136:137,`#${train.no}`);
  }
});

test('신설 28편은 열차번호 검색과 양 끝역 상세 인덱스에 모두 포함된다',()=>{
  vm.runInContext(`
    globalThis.__indexed5401=getTrainsByNo('5401').map(train=>train.no);
    globalThis.__indexedSinuiju=getTrainsByStation('신의주').map(train=>train.no);
    globalThis.__indexedPyongyang=getTrainsByStation('평양').map(train=>train.no);
  `,context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.__indexed5401)),['5401']);
  const expected=JSON.parse(JSON.stringify(trains.map(train=>train.no))).sort((a,b)=>Number(a)-Number(b));
  for(const actual of [context.__indexedSinuiju,context.__indexedPyongyang]){
    const indexed=JSON.parse(JSON.stringify(actual)).filter(no=>Number(no)>=5401&&Number(no)<=5428).sort((a,b)=>Number(a)-Number(b));
    assert.deepEqual(indexed,expected);
  }
});
