import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const css = fs.readFileSync('assets/css/nimbi_rail.css', 'utf8');
const filterStart = source.indexOf('function _mttFilterEntries');
const filterEnd = source.indexOf('\nfunction setMetroTimetableExpressOnly', filterStart);
assert.ok(filterStart >= 0 && filterEnd > filterStart, '전체 시간표 급행 필터 함수 누락');

const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(filterStart, filterEnd)}\nthis.filterEntries=_mttFilterEntries;this.hasExpress=_mttHasExpress;`, context);
const entries = [
  {id:'local', cls:0},
  {id:'express', cls:1},
  {id:'limited', cls:2}
];
assert.deepEqual(Array.from(context.filterEntries(entries, false), entry => entry.id), ['local','express','limited'], '필터 해제 시 모든 열차를 표시해야 합니다.');
assert.deepEqual(Array.from(context.filterEntries(entries, true), entry => entry.id), ['express','limited'], '급행만 보기에는 급행·특급만 표시해야 합니다.');
assert.equal(context.hasExpress([{cls:0},{cls:0}]),false,'일반열차만 정차하는 역에는 급행 필터를 숨겨야 합니다.');
assert.equal(context.hasExpress([{cls:0},{cls:1}]),true,'급행이 정차하는 역에는 급행 필터를 표시해야 합니다.');

const expectedOrder = '<span class="mtt-t">${fClk(r.clk)}</span><span class="mtt-od">${od}</span>${_metroClsTag(r.cls)}';
assert.ok(source.includes(expectedOrder), '전체 시간표는 시각 → 출발지·행선지 → 급행 심볼 순이어야 합니다.');
assert.ok(source.includes('onchange="setMetroTimetableExpressOnly(this.checked)"'), '급행만 보기 체크박스가 필터 함수와 연결되어야 합니다.');
assert.ok(source.includes('${hasExpress?`<div class="mtt-filterbar">'),'급행 필터 영역은 실제 급행 정차 여부에 따라 렌더링해야 합니다.');
assert.ok(source.includes("_openMetroTimetableRow(this,'${escL(r.line)}',${r.svc},${r.clk},${r.k0},${r.k1})"), '전체 시간표 클릭은 선택 행과 방향 leg 범위를 함께 전달해야 합니다.');
assert.ok(source.includes("row.classList.add('mtt-row--selected')"), 'PC 병행 화면에서 조회 중인 시간표 행을 표시해야 합니다.');
assert.ok(source.includes("const METRO_MODE_TABS=['metrolines','metroschematic','metroroute','map','stationinfo','notice']"),'전철 공지는 가장 오른쪽 탭이어야 합니다.');
assert.ok(source.includes("b.style.order=String(Math.max(0,visible.indexOf(id)))"),'모드별 탭 순서를 화면에 적용해야 합니다.');
assert.ok(source.includes('function _metroLiveTrainLabel(dest,cls)'),'실시간 열차 행선 표기 공통 함수가 있어야 합니다.');
assert.ok(source.includes("cls===1?`${dest} 급행`:`${dest}행`"),'일반은 ○○행, 급행은 ○○ 급행 형식이어야 합니다.');
assert.ok(source.includes("onclick=\"openMetroTrain('${lineArg}',${t.svcIdx},${t.clickClock})\""),'실시간 위치 마커에서 해당 편성 시간표를 열어야 합니다.');
assert.ok(css.includes('.mtl-live.clickable{pointer-events:auto;cursor:pointer}'),'실시간 열차 마커가 클릭 가능해야 합니다.');
assert.ok(css.includes('.mtl-ltl-train.express{background:#e5484d}'),'급행·특급 실시간 위치 라벨은 빨간색이어야 합니다.');
assert.ok(css.includes('.mtt-row--selected{background:rgba(158,103,255,.2)'),'조회 중 강조는 다음 열차의 노선색과 다른 색이어야 합니다.');
assert.ok(css.includes('@keyframes mtb2PosPrimary'),'현위치 역명과 남은 역 수가 교대로 표시되어야 합니다.');
assert.ok(css.includes('margin-left:auto;text-align:right'),'현위치 문구는 기존처럼 우측 정렬되어야 합니다.');
assert.ok(source.includes("p.state==='접근'?'당역 접근'"),'조회역 접근 중에는 당역 접근으로 표시해야 합니다.');
assert.ok(source.includes("<span>${start}</span>"),'운행 전 열차는 첫 역 출발 시각을 교대로 표시해야 합니다.');
assert.ok(source.includes("<span>${p.away}전역 <b>${p.state}</b></span>"),'역명과 n전역 양쪽에 접근·도착·출발 상태를 유지해야 합니다.');

const rangesStart = source.indexOf('function _metroLegRanges');
const rangesEnd = source.indexOf('\n// 🚇 개별 편성 역별 타임라인', rangesStart);
assert.ok(rangesStart >= 0 && rangesEnd > rangesStart, '전철 회차 구간 선택 함수 누락');
const rangeContext={Number};
vm.createContext(rangeContext);
vm.runInContext(`${source.slice(rangesStart,rangesEnd)}
this.pick=_metroLegRangeForClick;`,rangeContext);
const idxSeq=[0,1,2,1,0];
const depTimes=[100,110,200,210,220];
assert.deepEqual(Array.from(rangeContext.pick(idxSeq,depTimes,200,2,4)),[2,4],'회차역 시발편은 다음 방향 leg를 열어야 합니다.');
assert.deepEqual(Array.from(rangeContext.pick(idxSeq,depTimes,200)),[2,4],'구형 호출도 회차역 출발 시 다음 방향 leg를 우선해야 합니다.');
assert.deepEqual(Array.from(rangeContext.pick([0,1,2,3,2,1,0],[10,20,30,40,50,60,70],10,0,3)),[0,3],'명시된 유효 구간은 회차 추정 결과보다 우선해야 합니다.');

// 실제 전체 노선 데이터에서 역 시간표가 생성한 모든 leg 범위가 유효한지,
// 특히 GTX-A 문산→평택시청이 반대편 회차편으로 바뀌지 않는지 검사합니다.
const schedSource=fs.readFileSync('data/nimbi_metro_sched.js','utf8');
const dataContext={};
vm.createContext(dataContext);
vm.runInContext(`${schedSource}\nthis.METRO_SCHED=METRO_SCHED;`,dataContext);
const depsStart=source.indexOf('function _metroStationDeps');
const depsEnd=source.indexOf('\n// 방면 출발편 목록',depsStart);
assert.ok(depsStart>=0&&depsEnd>depsStart,'역 시간표 운행 구간 생성 함수 누락');
dataContext.METRO_SCHED=dataContext.METRO_SCHED;
vm.runInContext(`${source.slice(depsStart,depsEnd)}\nthis.stationDeps=_metroStationDeps;`,dataContext);
let audited=0;
for(const [line,ent] of Object.entries(dataContext.METRO_SCHED)){
  for(const stn of ent.s){
    for(const d of dataContext.stationDeps(stn).filter(x=>x.line===line)){
      assert.ok(Number.isInteger(d.k0)&&Number.isInteger(d.k1)&&d.k0>=0&&d.k1<ent.t[d.svc].length/3&&d.k1>d.k0,`${line} ${stn}의 leg 범위가 유효해야 합니다.`);
      audited++;
    }
  }
}
assert.ok(audited>1000,'전체 전철 운행 구간을 충분히 검사해야 합니다.');
const gtxDeps=dataContext.stationDeps('문산').filter(x=>x.line==='GTX-A'&&x.dest==='평택시청');
assert.ok(gtxDeps.length>0,'GTX-A 문산→평택시청 출발편이 존재해야 합니다.');
for(const d of gtxDeps){
  const f=dataContext.METRO_SCHED['GTX-A'].t[d.svc],seq=[];
  for(let i=0;i<f.length;i+=3)seq.push(f[i+2]);
  const picked=Array.from(rangeContext.pick(seq,[],0,d.k0,d.k1));
  assert.deepEqual(picked,[d.k0,d.k1],'GTX-A 문산→평택시청은 직전 평택시청→문산 회차편으로 바뀌면 안 됩니다.');
  assert.equal(dataContext.METRO_SCHED['GTX-A'].s[seq[picked[0]]],'문산');
  assert.equal(dataContext.METRO_SCHED['GTX-A'].s[seq[picked[1]]],'평택시청');
}

console.log(`metro timetable: 행 표시·회차 구간·급행 라벨 및 전체 ${audited}개 leg 검증 완료`);
