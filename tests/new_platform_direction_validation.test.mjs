import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['nimbi_rail_data.js','nimbi_realplat.js','nimbi_regional_platforms.js']){
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains, platforms=context.__platforms;
const byNo=new Map(trains.map(train=>[String(train.no),train]));
const platform=(no,station)=>Number(byNo.get(String(no)).stops.find(stop=>stop.s===station)?.p);

test('사진 원본 하행 승강장은 보존하고 반대 방향 승강장을 기존 운용 구조로 분리한다',()=>{
  const pairs=[
    [1201,1202,{기장:[3,4],태화강:[7,8],입실:[1,2],경주:[5,4],영덕:[3,4],영해:[1,4],울진:[3,4],부구:[1,2],삼척:[2,5],동해:[5,6]}],
    [1241,1242,{보은:[1,2],회인:[3,4]}],
    [691,692,{황지:[3,2],원주:[5,6]}],
    [621,622,{태백황지:[3,2],삼척:[6,5],동해:[2,6]}],
    [1261,1262,{서청주:[3,4],천안:[11,10],수원:[4,3],서울:[3,16]}],
    [1331,1332,{동래:[3,4],북부산:[1,2],남대구:[3,6],구미:[2,6],김천:[1,4]}]
  ];
  for(const [down,up,stations] of pairs){
    for(const [station,[downPlatform,upPlatform]] of Object.entries(stations)){
      assert.equal(platform(down,station),downPlatform,`#${down} ${station}`);
      assert.equal(platform(up,station),upPlatform,`#${up} ${station}`);
    }
  }
});

test('신설 전 편 영업 정차 승강장은 표시값과 확정 매핑이 일치한다',()=>{
  const inScope=no=>[[621,630],[681,700],[801,828],[1201,1236],[1241,1270],
    [1331,1350],[1451,1454],[1501,1504],[1885,1888],[1901,1918],
    [2501,2534],[4401,4428],[4451,4458]].some(([from,to])=>no>=from&&no<=to);
  for(const train of trains.filter(train=>inScope(Number(train.no)))){
    for(const stop of train.stops){
      if(stop.p==null)continue;
      assert.equal(platforms[train.no]?.[stop.s],Number(stop.p),`#${train.no} ${stop.s}`);
    }
  }
});
