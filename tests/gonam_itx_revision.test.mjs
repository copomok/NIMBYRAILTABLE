import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
let src='';
for(const file of ['data/nimbi_rail_data.js','data/nimbi_north_ingame_routes.js','data/nimbi_station_data.js','data/nimbi_north_station_revision.js','data/nimbi_north_rail_revision.js','data/nimbi_gonam_itx_revision.js','data/nimbi_realplat.js','data/nimbi_regional_platforms.js'])src+=fs.readFileSync(new URL(file,root),'utf8')+'\n';
src+=';globalThis.__trains=ALL_TRAINS;globalThis.__stations=STATION_DB;globalThis.__realplat=REAL_PLAT;';
const context={};vm.createContext(context);vm.runInContext(src,context);
const trains=context.__trains,selected=trains.filter(t=>Number(t.no)>=1981&&Number(t.no)<=1998);
const byNo=no=>selected.find(t=>t.no===String(no));
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};

test('1981~1998은 9왕복 ITX-마음으로 완전 대치된다',()=>{
  assert.equal(selected.length,18);
  assert.equal(new Set(selected.map(t=>t.no)).size,18);
  for(let no=1981;no<=1998;no++)assert.ok(byNo(no),`#${no}`);
  for(const train of selected){
    assert.equal(train.grade,'ITX-마음');
    assert.equal(train.dir,Number(train.no)%2?'down':'up');
    assert.equal(train.boundary[Number(train.no)%2?0:1],'한강로');
  }
});

test('사진 원본 역순·노선·초 버림 결과를 보존한다',()=>{
  assert.equal(byNo(1981).line,'경부선·태안선·장항선');
  assert.equal(byNo(1991).line,'경부선·태안선·장항선·전라선');
  assert.deepEqual(Array.from(byNo(1981).stops,s=>s.s),['한강로','수원','오산','천안','아산','합덕','당진','승산','서산','태안','남면','창기','안면도','고남','보령','서천','군산','대야','익산','삼례','전주']);
  assert.equal(byNo(1981).stops.find(s=>s.s==='수원').arr,'5:17');
  assert.equal(byNo(1981).stops.find(s=>s.s==='수원').dep,'5:19');
  assert.equal(minute(byNo(1991).stops.find(s=>s.s==='전주').arr)-minute(byNo(1991).stops[0].dep),177);
  assert.equal(minute(byNo(1991).stops.at(-1).arr)-minute(byNo(1991).stops[0].dep),239);
});

test('#1994 사진 원본으로 순천발 상행 전 구간을 재작성한다',()=>{
  const train=byNo(1994),start=minute(train.stops[0].dep);
  const expected={
    순천:[null,0,'6'],북순천:[2,null,null],황전:[9,null,null],구례:[13,14,'4'],
    남원:[25,27,'4'],오수:[34,35,'2'],임실:[41,42,'2'],운암:[47,null,null],
    전주:[56,58,'6'],삼례:[63,65,'2'],익산:[70,72,'5'],대야:[78,null,null],
    군산:[82,84,'4'],서천:[90,91,'2'],보령:[105,107,'2'],고남:[116,118,'2'],
    안면도:[123,125,'2'],창기:[128,null,null],남면:[133,null,null],태안:[137,138,'2'],
    서산:[145,146,'1'],승산:[153,null,null],당진:[157,159,'5'],합덕:[166,168,'2'],
    아산:[179,181,'4'],천안:[187,189,'4'],오산:[207,209,'2'],수원:[215,217,'6'],
    한강로:[236,null,'9']
  };
  assert.deepEqual(Array.from(train.stops,s=>s.s),Object.keys(expected));
  for(const stop of train.stops){
    const [arr,dep,p]=expected[stop.s];
    assert.equal(stop.arr==null?null:minute(stop.arr)-start,arr,`${stop.s} 도착`);
    assert.equal(stop.dep==null?null:minute(stop.dep)-start,dep,`${stop.s} 출발`);
    assert.equal(stop.p??null,p,`${stop.s} 승강장`);
  }
  for(const no of [1992,1994,1996,1998]){
    const up=byNo(no);
    assert.equal(minute(up.stops.at(-1).arr)-minute(up.stops[0].dep),236,`#${no}`);
  }
});

test('0초 정차와 미확정 시각 통과역은 승강장 없는 통과로 남는다',()=>{
  for(const train of selected){
    for(const name of ['승산','남면','창기','대야']){
      const s=train.stops.find(stop=>stop.s===name);assert.ok(s,`${train.no} ${name}`);assert.equal(s.dep,null);assert.equal(s.p,undefined);
    }
    for(const s of train.stops.slice(1,-1))if(s.dep===null)assert.equal(s.p,undefined,`${train.no} ${s.s}`);
  }
  for(const name of ['운암','황전','북순천'])assert.equal(byNo(1991).stops.find(s=>s.s===name).dep,null);
  assert.deepEqual(Array.from(byNo(1991).stops.slice(-5),s=>s.s),['남원','구례','황전','북순천','순천']);
  assert.notEqual(byNo(1991).stops.find(s=>s.s==='구례').dep,null);
  assert.equal(byNo(1991).stops.some(s=>s.s==='곡성'),false);
  assert.equal(byNo(1991).stops.some(s=>s.s==='송악'),false);
});

test('정차역 승강장은 사진의 숫자만 저장한다',()=>{
  const expected={한강로:'9',수원:'4',오산:'8',천안:'3',아산:'3',합덕:'3',당진:'6',서산:'2',태안:'1',안면도:'1',고남:'1',보령:'1',서천:'1',군산:'3',익산:'2',삼례:'1',전주:'7'};
  for(const [name,p] of Object.entries(expected))assert.equal(byNo(1981).stops.find(s=>s.s===name).p,p,name);
  for(const train of selected)for(const s of train.stops)if(s.p!=null)assert.match(s.p,/^\d+$/);
});

test('사진 승강장이 앱 REAL_PLAT에 전편 연결되고 통과역은 제외된다',()=>{
  for(const train of selected){
    const mapped=context.__realplat[train.no];
    assert.ok(mapped,`#${train.no}`);
    for(const stop of train.stops){
      if(stop.p!=null)assert.equal(mapped[stop.s],Number(stop.p),`${train.no} ${stop.s}`);
      else assert.equal(Object.hasOwn(mapped,stop.s),false,`${train.no} ${stop.s} 통과역`);
    }
  }
  assert.equal(context.__realplat['1981']['한강로'],9);
  assert.equal(context.__realplat['1981']['전주'],7);
  assert.equal(context.__realplat['1982']['전주'],7);
  assert.equal(context.__realplat['1991']['구례'],1);
  assert.equal(context.__realplat['1991']['순천'],6);
  assert.equal(context.__realplat['1992']['구례'],4);
  assert.equal(context.__realplat['1992']['전주'],6);
  assert.equal(context.__realplat['1992']['서산'],1);
  assert.equal(context.__realplat['1992']['수원'],6);
  assert.equal(Object.hasOwn(context.__realplat['1991'],'대야'),false);
  assert.equal(Object.hasOwn(context.__realplat['1991'],'황전'),false);
  assert.equal(Object.hasOwn(context.__realplat['1991'],'북순천'),false);
});

test('통합 배차·첫막차 조건을 충족한다',()=>{
  const down=selected.filter(t=>t.dir==='down').sort((a,b)=>minute(a.stops[0].dep)-minute(b.stops[0].dep));
  assert.deepEqual(Array.from(down,t=>minute(t.stops[0].dep)),[300,411,530,646,760,875,996,1114,1235]);
  for(let i=1;i<down.length;i++){
    const gap=minute(down[i].stops[0].dep)-minute(down[i-1].stops[0].dep);
    assert.ok(gap>=110&&gap<=125,`${down[i-1].no}/${down[i].no}: ${gap}분`);
  }
  assert.ok(minute(down[0].stops[0].dep)>=300&&minute(down[0].stops[0].dep)<=390);
  for(const train of selected)assert.ok(minute(train.stops.at(-1).arr)<=1470,train.no);
});

test('모든 역명이 역 DB에 있고 동일 승강장 점유 충돌이 없다',()=>{
  for(const train of selected)for(const s of train.stops)assert.ok(context.__stations[s.s]||context.__stations[`${s.s}역`],`${train.no} ${s.s}`);
  const occupations=[];
  for(const train of selected)for(const s of train.stops)if(s.p&&s.dep){const a=minute(s.arr||s.dep),d=minute(s.dep);occupations.push({no:train.no,s:s.s,p:s.p,a,d});}
  for(let i=0;i<occupations.length;i++)for(let j=i+1;j<occupations.length;j++){const a=occupations[i],b=occupations[j];if(a.s===b.s&&a.p===b.p)assert.ok(Math.max(a.a,b.a)>=Math.min(a.d,b.d),`${a.no}/${b.no} ${a.s} ${a.p}`);}
  const existing=trains.filter(t=>Number(t.no)<1981||Number(t.no)>1998);
  for(const a of occupations)for(const train of existing)for(const s of train.stops){
    if(s.s!==a.s||!s.dep)continue;
    const p=s.p??context.__realplat?.[train.no]?.[s.s];if(String(p)!==a.p)continue;
    const x=minute(s.arr||s.dep),y=minute(s.dep);
    // 사진의 초를 버린 분 단위 구간이므로 한 열차의 출발 분과 다음 열차의
    // 도착 분이 같은 경계 접촉은 점유 중복으로 보지 않는다.
    assert.ok(Math.max(a.a,x)>=Math.min(a.d,y),`${a.no}/${train.no} ${a.s} ${a.p}`);
  }
});

test('확정 운용표는 전 편을 한 번씩 포함하고 회차가 5분 이상이다',()=>{
  const rail=fs.readFileSync(new URL('js/nimbi_rail.js',root),'utf8');
  const begin=rail.indexOf('const CONFIRMED_ROTATION ='),end=rail.indexOf('\n// 042: 편성 운용',begin);
  const rctx={ALL_TRAINS:trains};vm.createContext(rctx);vm.runInContext(rail.slice(begin,end)+';globalThis.R=CONFIRMED_ROTATION',rctx);
  const sets=[...new Map(Object.values(rctx.R).filter(r=>r.id.includes('한강로-고남')).map(r=>[r.id,r])).values()];
  const numbers=sets.flatMap(r=>r.seq);
  assert.deepEqual(Array.from(numbers).sort((a,b)=>a-b),Array.from(selected,t=>t.no).sort((a,b)=>a-b));
  assert.equal(new Set(numbers).size,18);
  assert.equal(sets.length,7);
  assert.deepEqual(Array.from(sets.find(set=>set.id.includes('전주 ITX-마음 2')).seq),['1982','1983','1986','1989']);
  assert.equal(sets.some(set=>set.id.includes('익일')),false);
  for(const set of sets){
    const seq=set.seq.map(byNo);assert.equal(seq[0].boundary[0],seq.at(-1).boundary[1],set.id);
    for(let i=1;i<seq.length;i++){
      const prev=seq[i-1],next=seq[i];assert.equal(prev.boundary[1],next.boundary[0],set.id);
      const gap=minute(next.stops[0].dep)-minute(prev.stops.at(-1).arr);
      assert.ok(gap>=5,`${set.id}: ${prev.no}->${next.no} ${gap}분`);
    }
  }
});
