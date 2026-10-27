import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of ['nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js',
  'nimbi_north_station_revision.js','nimbi_north_rail_revision.js','nimbi_gonam_itx_revision.js',
  'nimbi_pass_stations_revision.js','nimbi_20261027_revision.js','nimbi_realplat.js',
  'nimbi_regional_platforms.js']){
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT',context);
const trains=context.__trains.filter(train=>Number(train.no)>=501&&Number(train.no)<=529);
const platforms=context.__platforms;
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const elapsed=(a,b)=>{let n=minute(b)-minute(a);if(n<0)n+=1440;return n;};
const down=['마포','서울','한강로','병목안','수영','장호원','돈산','충주','수안보','북문경','문경','상주','구미','약목','서왜관','하빈','호림','남대구','가창','청도','밀양','삼랑진','물금','북부산','동래','부산'];
const commercial=new Set(['마포','서울','병목안','수영','충주','문경','상주','구미','남대구','밀양','부산']);

test('501~526은 13왕복 KTX-이음이며 기존 불완전 527~529는 대치된다',()=>{
  assert.equal(trains.length,26);
  assert.deepEqual(Array.from(trains,t=>Number(t.no)).sort((a,b)=>a-b),Array.from({length:26},(_,i)=>501+i));
  for(const train of trains){
    assert.equal(train.grade,'KTX-이음');
    assert.equal(train.line,'경부고속선·중부내륙선·경부선·대구밀양선');
    assert.equal(train.dir,Number(train.no)%2?'down':'up');
    assert.deepEqual(Array.from(train.boundary),train.dir==='down'?['마포','부산']:['부산','마포']);
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

test('사진의 방향별 소요시간을 보존하면서 충돌 회피를 위해 편별 출발을 조정했다',()=>{
  for(const dir of ['down','up']){
    const list=trains.filter(t=>t.dir===dir).sort((a,b)=>Number(a.no)-Number(b.no));
    assert.equal(list.length,13);
    for(let i=1;i<list.length;i++)assert.ok(minute(list[i-1].stops[0].dep)<minute(list[i].stops[0].dep));
    assert.equal(list[0].stops[0].dep,dir==='down'?'5:21':'5:31');
    assert.equal(list.at(-1).stops.at(-1).arr,dir==='down'?'23:48':'23:40');
    for(const train of list)assert.equal(elapsed(train.stops[0].dep,train.stops.at(-1).arr),dir==='down'?129:131);
  }
});

test('사진에 보이는 각 정차·0초 통과역 시각은 초 버림 후 모든 편에 동일하게 투영된다',()=>{
  const downOffsets={서울:[3,4],병목안:[12,13],수영:[18,19],충주:[47,48],문경:[63,64],상주:[70,71],구미:[83,84],약목:[87,null],서왜관:[89,null],남대구:[97,98],청도:[106,null],밀양:[110,111],부산:[129,null]};
  const upOffsets={밀양:[17,18],청도:[23,null],남대구:[32,33],서왜관:[41,null],약목:[43,null],구미:[47,48],상주:[59,60],문경:[66,67],충주:[83,84],수영:[111,112],병목안:[117,118],서울:[126,127],마포:[131,null]};
  for(const train of trains){
    const first=train.stops[0].dep,offsets=train.dir==='down'?downOffsets:upOffsets;
    for(const [station,[arr,dep]] of Object.entries(offsets)){
      const stop=train.stops.find(item=>item.s===station);
      assert.equal(elapsed(first,stop.arr),arr,`#${train.no} ${station} 도착/통과`);
      if(dep!=null)assert.equal(elapsed(first,stop.dep),dep,`#${train.no} ${station} 출발`);
      else assert.equal(stop.dep,null,`#${train.no} ${station} 통과/종착`);
    }
  }
});

test('기존 열차와 신설 열차의 동일 승강장 간격이 모두 3분 이상이다',()=>{
  const windows=[];
  for(const train of context.__trains){
    train.stops.forEach((stop,index)=>{
      const platform=stop.p==null?platforms[train.no]?.[stop.s]:Number(stop.p);
      if(platform==null)return;
      const arr=minute(stop.arr||''),dep=minute(stop.dep||'');
      if(index>0&&index<train.stops.length-1&&(Number.isNaN(arr)||Number.isNaN(dep)||arr===dep))return;
      const start=Number.isNaN(arr)?dep:arr,end=Number.isNaN(dep)?arr:dep;
      if(Number.isNaN(start)||Number.isNaN(end))return;
      windows.push({no:train.no,station:stop.s,platform,start,end:end<start?end+1440:end});
    });
  }
  const byStation=new Map();
  for(const window of windows){
    const key=`${window.station}|${window.platform}`;
    if(!byStation.has(key))byStation.set(key,[]);
    byStation.get(key).push(window);
  }
  for(const train of trains){
    for(const a of windows.filter(window=>window.no===train.no)){
      for(const b of byStation.get(`${a.station}|${a.platform}`)){
        if(a.no===b.no)continue;
        for(const day of [-1440,0,1440]){
          const start=b.start+day,end=b.end+day;
          const gap=a.start>end?a.start-end:start>a.end?start-a.end:-Math.min(a.end,end)+Math.max(a.start,start);
          assert.ok(gap>=3,`#${a.no}/#${b.no} ${a.station} ${a.platform}번 ${gap}분`);
        }
      }
    }
  }
});

test('6편성의 당일 운용은 전 편을 한 번씩 포함하고 원 기점으로 복귀한다',()=>{
  const source=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
  const seqs=[
    ['501','506','509','514','517','524'],['502','505','512','515','520','523'],
    ['503','508'],['504','507','522','525'],['510','513','518','521'],
    ['511','516','519','526']
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
      assert.ok(elapsed(previous.stops.at(-1).arr,next.stops[0].dep)>=5);
    }
  }
});
