import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['../data/nimbi_rail_data.js','../data/nimbi_realplat.js','../data/nimbi_regional_platforms.js']){
  vm.runInContext(fs.readFileSync(new URL(file,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains.filter(train=>Number(train.no)>=402&&Number(train.no)<=460&&Number(train.no)%2===0);
const platforms=context.__platforms;
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let n=minute(b)-minute(a);if(n<0)n+=1440;return n;};
const stopping=new Set([408,420,432,444,456]);

test('마포-목포 KTX 상행은 하행 대응 패턴의 5편만 정안에 정차한다',()=>{
  assert.equal(trains.length,30);
  for(const train of trains){
    const stop=train.stops.find(item=>item.s==='정안');
    assert.ok(stop,`#${train.no} 정안 누락`);
    assert.equal(Boolean(stop.dep),stopping.has(Number(train.no)),`#${train.no} 정안 정차 구분`);
    if(stopping.has(Number(train.no)))assert.equal(platforms[train.no]?.['정안'],2,`#${train.no} 정안 승강장`);
    else{
      assert.equal(stop.p,undefined,`#${train.no} 통과역 자체 승강장`);
      assert.equal(platforms[train.no]?.['정안'],undefined,`#${train.no} 통과역 승강장 매핑`);
    }
  }
});

test('정안 통과 상행은 공주 출발·통과부터 천안 도착까지 10분이다',()=>{
  for(const train of trains.filter(train=>!stopping.has(Number(train.no)))){
    const gongju=train.stops.find(stop=>stop.s==='공주');
    const jeongan=train.stops.find(stop=>stop.s==='정안');
    const cheonan=train.stops.find(stop=>stop.s==='천안');
    assert.equal(elapsed(gongju.dep||gongju.arr,cheonan.arr||cheonan.dep),10,`#${train.no} 공주-천안`);
    assert.equal(elapsed(gongju.dep||gongju.arr,jeongan.arr),4,`#${train.no} 정안 통과시각`);
  }
});
