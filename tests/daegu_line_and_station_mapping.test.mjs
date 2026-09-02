import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['nimbi_station_data.js','nimbi_rail_data.js','nimbi_platform_db.js','nimbi_realplat.js','nimbi_regional_platforms.js']){
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT;globalThis.__stations=STATION_DB',context);
const trains=context.__trains,platforms=context.__platforms,stations=context.__stations;

test('청량리-태백황지 무궁화호 역명을 지정·신동(태백)으로 통일한다',()=>{
  const family=trains.filter(train=>Number(train.no)>=1691&&Number(train.no)<=1700);
  assert.equal(family.length,10);
  for(const train of family){
    const names=train.stops.map(stop=>stop.s);
    assert.ok(names.includes('지정'),`#${train.no} 지정 누락`);
    assert.ok(names.includes('신동(태백)'),`#${train.no} 신동(태백) 누락`);
    assert.ok(!names.includes('지평'),`#${train.no} 지평 잔존`);
    assert.ok(!names.includes('신동'),`#${train.no} 신동 잔존`);
    assert.ok(!Object.hasOwn(platforms[String(train.no)]||{},'지평'));
    assert.ok(!Object.hasOwn(platforms[String(train.no)]||{},'신동'));
  }
});

test('청량리-태백황지 무궁화호 전 편에 무릉 정차 시각이 있다',()=>{
  const expected={
    1691:['7:36','7:37'],1692:['8:13','8:14'],1693:['10:31','10:32'],
    1694:['11:08','11:09'],1695:['13:31','13:32'],1696:['14:08','14:09'],
    1697:['16:36','16:37'],1698:['17:13','17:14'],1699:['19:48','19:49'],
    1700:['20:25','20:26']
  };
  for(const [no,times] of Object.entries(expected)){
    const train=trains.find(item=>item.no===no);
    const index=train.stops.findIndex(stop=>stop.s==='무릉');
    assert.ok(index>0,`#${no} 무릉 누락`);
    assert.deepEqual([train.stops[index].arr,train.stops[index].dep],times,`#${no} 무릉 시각`);
    const neighbors=[train.stops[index-1].s,train.stops[index+1].s];
    assert.deepEqual(Array.from(neighbors),train.dir==='down'?['신동(태백)','사북']:['사북','신동(태백)'],`#${no} 무릉 순서`);
  }
});

test('경산-건천 구간 운행 열차는 모두 대구선 노선 정보를 가진다',()=>{
  const users=trains.filter(train=>train.stops.some((stop,index)=>{
    const next=train.stops[index+1]?.s;
    return (stop.s==='경산'&&next==='건천')||(stop.s==='건천'&&next==='경산');
  }));
  assert.ok(users.length>0);
  for(const train of users){
    assert.ok(train.line.split('·').includes('대구선'),`#${train.no} 대구선 누락`);
  }
  for(const station of ['경산역','건천역','안강역']){
    assert.ok(stations[station].lines.includes('대구선'),`${station} 노선 정보`);
  }
});

test('한강로-포항 KTX-산천은 대구선 통과역을 무시각으로 표시한다',()=>{
  for(const train of trains.filter(train=>Number(train.no)>=231&&Number(train.no)<=248)){
    const expected=train.dir==='down'
      ?['남대구','경산','건천','안강','포항']
      :['포항','안강','건천','경산','남대구'];
    const names=train.stops.map(stop=>stop.s);
    const start=names.indexOf(expected[0]);
    assert.deepEqual(Array.from(names.slice(start,start+5)),expected,`#${train.no} 경로`);
    for(const name of expected.slice(1,4)){
      const stop=train.stops.find(item=>item.s===name);
      assert.equal(stop.arr,'통과',`#${train.no} ${name}`);
      assert.equal(stop.dep,null,`#${train.no} ${name} 출발시각`);
      assert.equal(stop.p,undefined,`#${train.no} ${name} 승강장`);
    }
  }
});

test('노선도에는 대구선이 있고 경부고속선 포항 직결 지선은 없다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  assert.match(source,/daegu:\{\s*name:'대구선'[\s\S]*?\{n:'경산'[\s\S]*?\{n:'건천'[\s\S]*?\{n:'안강'/);
  const highSpeed=source.slice(source.indexOf('gyeongbuhs:{'),source.indexOf('\nhonamhs:{'));
  assert.doesNotMatch(highSpeed,/\{n:'남대구'[\s\S]{0,120}\{n:'포항'/);
});
