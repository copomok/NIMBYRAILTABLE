import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[
  'nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js',
  'nimbi_north_station_revision.js','nimbi_north_rail_revision.js',
  'nimbi_gonam_itx_revision.js','nimbi_pass_stations_revision.js',
  'nimbi_20261027_revision.js','nimbi_realplat.js','nimbi_homonyms.js',
  'nimbi_regional_platforms.js','nimbi_gyeongui_20261027_revision.js',
  'nimbi_nyongwon_20261027_stations.js','nimbi_global_schedule_revision.js'
];
const c={};vm.createContext(c);
for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),c,{filename:file});
vm.runInContext('globalThis.trains=ALL_TRAINS',c);
const trains=Array.from(c.trains);
const minute=value=>{const[h,m]=value.split(':').map(Number);return h*60+m};

test('산내 정차 상행 KTX 7편의 병목안→서울 소요시간은 하행 대응 패턴에 맞춘 7분이다',()=>{
  const affected=trains.filter(train=>train.grade==='KTX'&&train.dir==='up'&&
    train.stops.some(stop=>stop.s==='산내'&&stop.dep));
  assert.deepEqual(affected.map(train=>train.no),['20','30','42','54','66','78','84']);
  for(const train of affected){
    const bottleneck=train.stops.find(stop=>stop.s==='병목안');
    const seoul=train.stops.find(stop=>stop.s==='서울');
    assert.equal((minute(seoul.arr)-minute(bottleneck.arr)+1440)%1440,7,train.no);
  }
  assert.equal(affected.find(train=>train.no==='66').stops.at(-1).arr,'17:20');
  assert.equal(affected.find(train=>train.no==='78').stops.at(-1).arr,'19:20');
});

test('부산→서울 정규 KTX는 15~25분, 예외는 10~30분이며 사이에 다른 경부고속선 KTX가 있다',()=>{
  const byId=new Map(trains.map(train=>[train.no,train]));
  assert.equal(byId.get('30').stops[0].dep,'9:40');
  assert.equal(byId.get('66').stops[0].dep,'15:40');
  assert.equal(byId.get('78').stops[0].dep,'17:40');
  const corridor=trains.filter(train=>train.grade.includes('KTX')&&train.stops[0]?.s==='부산'&&
    String(train.line).includes('경부고속선')&&train.stops[0]?.dep)
    .map(train=>({no:train.no,time:minute(train.stops[0].dep)}));
  const core=trains.filter(train=>train.grade==='KTX'&&train.stops[0]?.s==='부산'&&
    train.stops.at(-1)?.s==='서울'&&Number(train.no)>=2&&Number(train.no)<=106&&
    Number(train.no)%2===0).sort((a,b)=>minute(a.stops[0].dep)-minute(b.stops[0].dep));
  const exceptions=[];
  for(let i=1;i<core.length;i++){
    const a=core[i-1],b=core[i],start=minute(a.stops[0].dep),end=minute(b.stops[0].dep),gap=end-start;
    if(gap>=15&&gap<=25)continue;
    assert.ok(gap>=10&&gap<=30,`${a.no}→${b.no}: ${gap}분`);
    const fillers=corridor.filter(train=>train.no!==a.no&&train.no!==b.no&&train.time>start&&train.time<end);
    assert.ok(fillers.length,`${a.no}→${b.no} 사이 KTX 없음`);
    exceptions.push(`${a.no}/${b.no}`);
  }
  assert.deepEqual(exceptions,['8/10','10/12','86/88','94/96','102/104']);
});

test('최종 전 열차 시간표에 무단추월·단선 교행 충돌과 5분 미만 회차가 없다',()=>{
  const audit=JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/audit_all_trains.mjs'),'--correct-timeline'],{
    cwd:root,encoding:'utf8',maxBuffer:32*1024*1024
  }));
  assert.equal(audit.trains,1879);
  assert.equal(audit.counts['illegal overtake']||0,0);
  assert.equal(audit.counts['illegal station overtake']||0,0);
  assert.equal(audit.counts['single-track meet']||0,0);
  assert.equal(audit.rotationIssues,0);
  assert.deepEqual(audit.invalidChronology,[]);
});
