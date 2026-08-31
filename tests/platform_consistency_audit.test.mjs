import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['nimbi_rail_data.js','nimbi_platform_db.js','nimbi_realplat.js','nimbi_regional_platforms.js']){
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT;globalThis.__db=PLATFORM_DB',context);
const trains=context.__trains,platforms=context.__platforms,db=context.__db;
const byNo=new Map(trains.map(train=>[String(train.no),train]));
const platform=(no,station)=>platforms[String(no)]?.[station];

test('확정된 방향별 승강장 교정값을 유지한다',()=>{
  const expected={
    1693:{중랑:3,도농:2,양수:1,원주:3,신림:1,제천:3},
    1695:{중랑:3,도농:2,양수:1,원주:3,신림:1,제천:3,사북:1,고한:1},
    1694:{제천:4,신림:2,원주:4,양평:4,양수:2,덕소:4,도농:1,중랑:4},
    1696:{양평:4},
    632:{태백황지:2,삼척:5,동해:6}
  };
  for(const [no,stations] of Object.entries(expected)){
    for(const [station,value] of Object.entries(stations)){
      assert.equal(platform(no,station),value,`#${no} ${station}`);
    }
  }
});

test('영업 정차 승강장은 역 승강장 구조에 실제로 존재한다',()=>{
  for(const train of trains){
    for(const stop of train.stops){
      const value=platforms[String(train.no)]?.[stop.s]??(stop.p==null?null:Number(stop.p));
      if(value==null)continue;
      const stationDb=db[stop.s]||db[`${stop.s}역`];
      if(!stationDb)continue;
      assert.ok(stationDb[String(value)],`#${train.no} ${stop.s} ${value}번 승강장`);
    }
  }
});

test('사진 기반 stop 표시와 확정 승강장 매핑이 어긋나지 않는다',()=>{
  for(const train of trains){
    for(const stop of train.stops){
      if(stop.p==null)continue;
      assert.equal(platform(train.no,stop.s),Number(stop.p),`#${train.no} ${stop.s}`);
    }
  }
});

test('복선 계통의 방향별 승강장 쌍을 분리한다',()=>{
  const pairs=[
    [231,232,'남대구',3,4],
    [251,252,'남대구',1,2],
    [551,552,'북순천',1,2],
    [1001,1002,'천안',11,12],
    [1021,1022,'천안',11,12],
    [1201,1202,'청하',2,3],
    [1201,1202,'포항',3,4],
    [1301,1302,'천안',11,12],
    [1331,1332,'황간',1,2],
    [1331,1332,'청도',4,8],
    [1331,1332,'밀양',5,6],
    [1331,1332,'삼랑진',3,4],
    [1331,1332,'물금',3,4],
    [1891,1892,'상당',1,2]
  ];
  for(const [down,up,station,downPlatform,upPlatform] of pairs){
    assert.equal(platform(down,station),downPlatform,`#${down} ${station}`);
    assert.equal(platform(up,station),upPlatform,`#${up} ${station}`);
  }
});

test('확정 승강장에는 현재 운행 경로에 없는 과거 역이 남지 않는다',()=>{
  for(const train of trains){
    const stations=new Set(train.stops.map(stop=>stop.s));
    for(const station of Object.keys(platforms[String(train.no)]||{})){
      assert.ok(stations.has(station),`#${train.no} 과거 역 ${station}`);
    }
  }
});
