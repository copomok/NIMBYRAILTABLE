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
const trains=context.__trains.filter(train=>Number(train.no)>=501&&Number(train.no)<=529);
const platforms=context.__platforms;
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let n=minute(b)-minute(a);if(n<0)n+=1440;return n;};
const down=['마포','서울','병목안','수영','장호원','돈산','충주','수안보','북문경','문경','상주','구미','약목','서왜관','하빈','호림','남대구'];
const commercial=new Set(['마포','서울','병목안','수영','충주','문경','상주','구미','남대구']);

test('501~526은 13왕복 KTX-이음이며 기존 불완전 527~529는 대치된다',()=>{
  assert.equal(trains.length,26);
  assert.deepEqual(Array.from(trains,t=>Number(t.no)).sort((a,b)=>a-b),Array.from({length:26},(_,i)=>501+i));
  for(const train of trains){
    assert.equal(train.grade,'KTX-이음');
    assert.equal(train.line,'경부고속선·중부내륙선·경부선');
    assert.equal(train.dir,Number(train.no)%2?'down':'up');
    assert.deepEqual(Array.from(train.boundary),train.dir==='down'?['마포','남대구']:['남대구','마포']);
    assert.deepEqual(Array.from(train.stops,s=>s.s),train.dir==='down'?down:[...down].reverse());
    assert.ok(!train.stops.some(s=>s.s==='WP8097'));
  }
});

test('통과역·정차역·승강장과 전 구간 시각이 완결되어 있다',()=>{
  for(const train of trains){
    for(const [index,stop] of train.stops.entries()){
      assert.ok(stop.arr||stop.dep,`#${train.no} ${stop.s} 시각`);
      if(commercial.has(stop.s)){
        assert.ok(stop.p,`#${train.no} ${stop.s} 승강장`);
        assert.equal(platforms[train.no]?.[stop.s],Number(stop.p),`#${train.no} ${stop.s} 확정 승강장`);
        if(index>0&&index<train.stops.length-1)assert.ok(stop.arr&&stop.dep,`#${train.no} ${stop.s} 정차`);
      }else{
        assert.equal(stop.p,undefined,`#${train.no} ${stop.s} 통과역 승강장 미표기`);
        assert.ok(stop.arr&&!stop.dep,`#${train.no} ${stop.s} 통과`);
      }
    }
  }
});

test('수영-장호원 직결 지선을 이용하고 죽산·일죽은 경유하지 않는다',()=>{
  for(const train of trains){
    const names=Array.from(train.stops,stop=>stop.s);
    assert.ok(!names.includes('죽산'),`#${train.no} 죽산 제외`);
    assert.ok(!names.includes('일죽'),`#${train.no} 일죽 제외`);
    const suyeong=names.indexOf('수영'),janghowon=names.indexOf('장호원');
    assert.equal(Math.abs(suyeong-janghowon),1,`#${train.no} 수영-장호원 직결`);
    const stop=train.stops[janghowon];
    assert.ok(stop.arr&&!stop.dep,`#${train.no} 장호원 통과`);
  }
});

test('양방향 80분 간격과 인게임 원본 방향별 소요시간을 지킨다',()=>{
  for(const dir of ['down','up']){
    const list=trains.filter(t=>t.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
    assert.equal(list.length,13);
    for(let i=1;i<list.length;i++)assert.equal(elapsed(list[i-1].stops[0].dep,list[i].stops[0].dep),80);
    assert.equal(list[0].stops[0].dep,'5:35');
    assert.equal(list.at(-1).stops.at(-1).arr,dir==='down'?'23:12':'23:10');
    for(const train of list)assert.equal(elapsed(train.stops[0].dep,train.stops.at(-1).arr),dir==='down'?97:95);
  }
});

test('최소 5편성 운용은 전 편을 한 번씩 포함하고 원 기점으로 복귀한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  const seqs=[
    ['503','508','511','516','519','524'],['502','505','510','513','518','523'],
    ['501','506','509','514','521','526'],['504','507','512','517','522','525'],
    ['515','520']
  ];
  const byNo=new Map(trains.map(t=>[t.no,t]));
  assert.deepEqual(seqs.flat().map(Number).sort((a,b)=>a-b),Array.from({length:26},(_,i)=>501+i));
  for(const seq of seqs){
    assert.ok(source.includes(`seq:[${seq.map(no=>`"${no}"`).join(',')}]`));
    const first=byNo.get(seq[0]),last=byNo.get(seq.at(-1));
    assert.equal(first.stops[0].s,last.stops.at(-1).s);
    for(let i=1;i<seq.length;i++){
      const previous=byNo.get(seq[i-1]),next=byNo.get(seq[i]);
      assert.equal(previous.stops.at(-1).s,next.stops[0].s);
      assert.ok(elapsed(previous.stops.at(-1).arr,next.stops[0].dep)>=6);
    }
  }
});
