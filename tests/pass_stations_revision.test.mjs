import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const files=['nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js',
  'nimbi_north_station_revision.js','nimbi_north_rail_revision.js','nimbi_gonam_itx_revision.js'];
const context={};
vm.createContext(context);
for(const file of files)vm.runInContext(fs.readFileSync(new URL(`data/${file}`,root),'utf8'),context);
vm.runInContext('globalThis.before=JSON.parse(JSON.stringify(ALL_TRAINS))',context);
vm.runInContext(fs.readFileSync(new URL('data/nimbi_pass_stations_revision.js',root),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('data/nimbi_realplat.js',root),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('data/nimbi_regional_platforms.js',root),'utf8'),context);
vm.runInContext('globalThis.after=ALL_TRAINS;globalThis.platforms=REAL_PLAT',context);
const before=context.before,after=context.after;
const byNo=no=>after.find(train=>Number(train.no)===no);
const mins=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const duration=(a,b)=>(mins(b)-mins(a)+1440)%1440;

test('추가 통과역 외 기존 정차 시각은 전 편 그대로 유지된다',()=>{
  assert.equal(after.length,before.length);
  for(let i=0;i<after.length;i++){
    const original=before[i],changed=after[i];
    const no=Number(changed.no);
    if(!((no>=1981&&no<=1998)||(no>=621&&no<=632)||
      (changed.grade.startsWith('KTX')&&changed.stops.some(stop=>stop.s==='청도'))))continue;
    assert.equal(changed.no,original.no);
    let oldIndex=0;
    for(const stop of changed.stops){
      const old=original.stops[oldIndex];
      if(old?.s!==stop.s)continue;
      oldIndex++;
      assert.equal(stop.arr===old.arr||
        (+changed.no===181&&stop.s==='청도'&&old.arr==='통과')||
        (+changed.no>=621&&+changed.no<=632&&stop.s==='북이'),true,`#${changed.no} ${stop.s} 도착`);
      if(stop.s==='장성'&&+changed.no>=621&&+changed.no<=632){
        assert.equal(stop.dep,null,`#${changed.no} 장성 통과`);
      }else assert.equal(stop.dep,old.dep,`#${changed.no} ${stop.s} 출발`);
    }
    assert.equal(oldIndex,original.stops.length,`#${changed.no} 기존 역 누락`);
  }
});

test('남대구–부산 KTX의 청도 통과 시각은 두 정차역 사이에 있다',()=>{
  const trains=after.filter(train=>/^KTX/.test(train.grade)&&train.stops.some(stop=>stop.s==='남대구')&&
    train.stops.some(stop=>stop.s==='부산')&&train.stops.some(stop=>stop.s==='청도'));
  assert.ok(trains.length>130);
  for(const train of trains){
    const names=train.stops.map(stop=>stop.s);
    const a=names.indexOf('남대구'),b=names.indexOf('부산'),c=names.indexOf('청도');
    if(!(Math.min(a,b)<c&&c<Math.max(a,b)))continue;
    const pass=train.stops[c],start=train.stops[Math.min(a,b)],end=train.stops[Math.max(a,b)];
    if(pass.dep!=null)continue; // 다른 계통의 원래 청도 영업 정차
    assert.match(pass.arr,/^\d{1,2}:\d{2}$/,`#${train.no}`);
    assert.ok(duration(start.dep,pass.arr)>0,`#${train.no} 선행 구간`);
    assert.ok(duration(pass.arr,end.arr)>0,`#${train.no} 후속 구간`);
    assert.equal(pass.p,undefined);
  }
  assert.match(byNo(181).stops.find(stop=>stop.s==='청도').arr,/^\d{1,2}:\d{2}$/);
});

test('태안선 ITX의 남안양·평택은 사진 WP 시분대로 전 편에 추가된다',()=>{
  for(const train of after.filter(train=>+train.no>=1981&&+train.no<=1998)){
    const names=train.stops.map(stop=>stop.s);
    const nam=train.stops.find(stop=>stop.s==='남안양');
    const pyeong=train.stops.find(stop=>stop.s==='평택');
    assert.equal(names.indexOf('남안양'),train.dir==='down'?1:names.length-2);
    assert.ok(names.indexOf('평택')>Math.min(names.indexOf('오산'),names.indexOf('천안')));
    assert.ok(names.indexOf('평택')<Math.max(names.indexOf('오산'),names.indexOf('천안')));
    assert.equal(nam.dep,null);
    assert.equal(pyeong.dep,null);
    assert.equal(nam.p,undefined);
    assert.equal(pyeong.p,undefined);
    if(train.dir==='down'){
      assert.equal(duration(train.stops[0].dep,nam.arr),10);
      assert.equal(duration(train.stops[0].dep,pyeong.arr),35);
    }else{
      assert.equal(duration(train.stops.find(stop=>stop.s==='수원').dep,nam.arr),7);
      assert.equal(duration(train.stops.find(stop=>stop.s==='천안').dep,pyeong.arr),10);
    }
  }
});

test('강릉–광주 KTX-이음은 정읍·북이·장성을 통과하며 장성 승강장을 배정하지 않는다',()=>{
  for(let no=621;no<=632;no++){
    const train=byNo(no),names=train.stops.map(stop=>stop.s);
    const order=train.dir==='down'?['전주','정읍','북이','장성','광주']:
      ['광주','장성','북이','정읍','전주'];
    assert.deepEqual(Array.from(names.filter(name=>order.includes(name))),order,`#${no} 역 순서`);
    for(const station of ['정읍','북이','장성']){
      const stop=train.stops.find(item=>item.s===station);
      assert.match(stop.arr,/^\d{1,2}:\d{2}$/,`#${no} ${station}`);
      assert.equal(stop.dep,null,`#${no} ${station} 통과`);
      assert.equal(stop.p,undefined,`#${no} ${station} 승강장`);
      assert.equal(context.platforms[train.no]?.[station],undefined,`#${no} ${station} 매핑`);
    }
  }
});
