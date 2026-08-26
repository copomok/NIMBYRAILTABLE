import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/features/nimbi_delay.js',import.meta.url),'utf8');

function extract(name,nextMarker){
  const start=source.indexOf(`function ${name}`);
  const end=source.indexOf(nextMarker,start);
  assert.ok(start>=0&&end>start,`${name} 함수를 찾을 수 있어야 한다`);
  return source.slice(start,end);
}

const context={};
vm.createContext(context);
vm.runInContext(`
  const _SIM_REC_HARD=1;
  ${extract('_headwayHoldForNextStation','let _dispCache')}
  ${extract('_limitRecoverySeries','// Sched(계획 예측)')}
  globalThis.headway=_headwayHoldForNextStation;
  globalThis.limitSeries=_limitRecoverySeries;
`,context);

test('과도하게 늦은 선행 예정 열차가 구간에 들어오기 전이면 후속 열차를 붙잡지 않는다',()=>{
  const hold=context.headway(100,110,30,30,120,130,0,0,1);
  assert.equal(hold,0);
});

test('다음 역 전에 실제 추월이 생기는 경우에만 부족한 최소 시격을 대기한다',()=>{
  assert.equal(context.headway(100,130,0,0,110,125,0,0,1),6);
  assert.equal(context.headway(100,120,2,2,110,130,0,0,1),0);
});

test('한 역에서 줄어드는 지연은 최대 1분으로 제한한다',()=>{
  assert.deepEqual(Array.from(context.limitSeries([49,2,1,0])),[49,48,47,46]);
  assert.deepEqual(Array.from(context.limitSeries([3,2,1,0])),[3,2,1,0]);
});

test('자동 소멸과 원본 사건량 기반 로그가 제거되고 최종 타임라인 증감으로 기록된다',()=>{
  assert.doesNotMatch(source,/w-\(j-i\)/);
  assert.doesNotMatch(source,/veh\.amt-\(i-veh\.sec\)/);
  assert.match(source,/const delta=after-before/);
  assert.match(source,/if\(delta===0\)continue/);
  assert.match(source,/sourceArr>myArr/);
  assert.match(source,/_SIM_RECORD_MODEL=2/);
  assert.doesNotMatch(source,/_seededRand\(seed\+Math\.random\(\)\)/);
});

test('지연 로그의 분 단위 합계는 최종 타임라인 변화량과 일치한다',()=>{
  const logContext={
    _simDelayOn:true,
    _simExpired:()=>false,
    _simProfile:()=>({cd:[1,3,2,2],m:[100,110,120,130]}),
    _simViewArr:()=>[1,3,2,2],
    _dispatchInfo:()=>({events:[{idx:1,delta:20,cause:'선행 열차 연쇄 지연',txt:'B 추월 방지 대기 +20분'}]}),
    _simNowFor:()=>999,
    _simVeh:()=>null,
    hasTime:value=>typeof value==='string'&&value!==''&&value!=='통과',
    _isDwellDelayCause:()=>false
  };
  vm.createContext(logContext);
  vm.runInContext(`${extract('_simEventLog','function _simDelayReport')};globalThis.eventLog=_simEventLog`,logContext);
  const train={stops:[
    {s:'A',dep:'1:40'},{s:'B',arr:'1:50',dep:'1:51'},
    {s:'C',arr:'2:00',dep:'2:01'},{s:'D',arr:'2:10'}
  ]};
  const lines=logContext.eventLog(train,true);
  assert.match(lines[0],/\+1분$/);
  assert.match(lines[1],/\+2분$/);
  assert.match(lines[2],/−1분$/);
  assert.ok(lines.every(line=>!line.includes('+20분')));
});
