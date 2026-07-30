import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8');
const ctx={};
vm.createContext(ctx);
vm.runInContext(`${data};globalThis.__trains=ALL_TRAINS`,ctx);

const train=no=>ctx.__trains.find(t=>t.no===String(no));

test('신설 SRT의 0초 정차는 통과 시각을 보존한 단방향 시각이다',()=>{
  for(const no of [...Array.from({length:20},(_,i)=>681+i),...Array.from({length:22},(_,i)=>801+i)]){
    const t=train(no);
    assert.ok(t,`#${no}`);
    for(const s of t.stops.slice(1,-1)){
      assert.notEqual(s.arr&&s.dep?s.arr===s.dep:false,true,`#${no} ${s.s}`);
    }
  }
  for(const [no,station] of [[681,'수진'],[681,'남횡성'],[681,'방림'],[691,'방림'],[691,'평창'],[691,'화암'],[801,'정안'],[801,'나산']]){
    const s=train(no).stops.find(x=>x.s===station);
    assert.match(s.arr,/^\d{1,2}:\d{2}$/);
    assert.equal(s.dep,null);
  }
});

test('신설 노선도는 인게임 좌표 투영값을 사용하고 자동 밀림을 끈다',()=>{
  const js=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  for(const key of ['donghae','sejongsecheon','gyooe','boeun']){
    assert.match(js,new RegExp(`${key}:\\{[\\s\\S]{0,120}noSpread:true`));
  }
  for(const point of [
    "{n:'의정부',x:216,y:69}",
    "{n:'상주',x:483,y:457}",
    "{n:'간성',x:553,y:-117}",
    "{n:'반석',x:279,y:463}"
  ]) assert.ok(js.includes(point),point);
});
