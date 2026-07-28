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
assert.ok(source.includes("const METRO_COMMUTER_BOARD_LINES=new Set(["),'광역철도 전광판 노선 분류가 있어야 합니다.');
assert.ok(source.includes("boardKind=_metroBoardKind(line)"),'노선에 따라 광역·도시철도 전광판을 자동 선택해야 합니다.');
assert.ok(source.includes("const lineClass=displayBoard?` mtb2-line--${boardKind}`:''"),'전광판 전용 디자인은 별도 전광판에서만 렌더링되어야 합니다.');
assert.ok(source.includes('<span class="mtb-title">🚇 실시간 도착</span>'),'기존 역 시간표 카드는 실시간 도착 제목을 유지해야 합니다.');
assert.ok(source.includes("onclick=\"openMetroStationDisplay("),'역 상세에 전광판 열기 버튼이 있어야 합니다.');
assert.ok(source.includes('function openMetroStationDisplay(stn)'),'전철 전광판은 별도 모달로 열려야 합니다.');
assert.ok(source.includes("_metroStationBoardHTML(stn,true)"),'전광판 모달은 광역·도시철도 전용 디자인을 사용해야 합니다.');
assert.ok(source.includes("const viewMode=displayBoard?'pos':_metroBoardMode"),'전광판 모달은 항상 현위치를 기본 표시해야 합니다.');
assert.ok(source.includes("const renderLines=displayBoard?[lineOrder[_metroDisplayLineIndex]]:lineOrder"),'전광판 모달은 선택한 단일 노선만 표시해야 합니다.');
assert.ok(source.includes('function setMetroDisplayLine(step)'),'환승역 전광판은 화살표로 노선을 전환해야 합니다.');
assert.ok(source.includes('function setMetroDisplayDirection(index)'),'모바일 전광판은 상·하행을 따로 전환해야 합니다.');
assert.ok(source.includes("cls===2?'특':cls===1?'급':'행'"),'광역철도 급행은 행선지 뒤에 급 표기를 붙여야 합니다.');
assert.ok(source.includes('class="mtb2-rclock"')&&source.includes('class="mtb2-rstate"'),'광역철도 시각·위치·상태는 별도 LED 열이어야 합니다.');
assert.ok(source.includes('class="mtb-urban-train"')&&source.includes('--train-pos:'),'도시철도 노선 막대에 실제 위치 열차 아이콘이 있어야 합니다.');
assert.ok(source.includes('services.push(`${_opsEsc(dest)}행 첫 ${fSrvClock(secs[0])} · 막 ${fSrvClock(secs[secs.length-1])}`)'),'도시철도 노선 막대는 행선지별 첫·막차를 교대 표시해야 합니다.');
for(const line of ['경부선','구인선','전북선','충청선','전남선','구미선','고령하양선','GTX-A','GTX-B','GTX-C','중앙선','장호원선','종원선','춘천선','광주진목선','평택안성선','화성선','경의선','동남선','김해거제선','대구밀양선','포항선']){
  assert.ok(source.includes(`'${line}'`),`${line}은 광역철도형 전광판 목록에 포함되어야 합니다.`);
}
assert.ok(css.includes('.mtb2-line--regional{border:5px solid'),'광역철도 LED 전광판 스타일이 있어야 합니다.');
assert.ok(css.includes('.mtb2-line--urban{border:3px solid'),'도시철도 LCD 전광판 스타일이 있어야 합니다.');
assert.ok(css.includes('.mtb2-line--regional .mtb2-rclock{grid-column:4'),'광역형 출발 시각은 독립된 초록색 열이어야 합니다.');
assert.ok(css.includes('.mtb2-line--regional .mtb2-rstate{grid-column:6'),'광역형 접근·도착·출발 상태는 독립된 빨간색 열이어야 합니다.');
assert.ok(css.includes('.metro-display-popup{position:fixed'),'전철 역 전광판 모달 스타일이 있어야 합니다.');
assert.ok(css.includes('#metro-display-board .mtb-display-dir-0 .mtb2-col[data-dir]:not([data-dir="0"])'),'모바일에서는 선택한 한 방향 전광판만 보여야 합니다.');
assert.ok(css.includes('.mtb-display-dir-nav{display:none}'),'PC에서는 상·하행 전환 토글을 숨겨야 합니다.');
assert.ok(css.includes('@media(max-width:600px)'),'모바일 방향 분리는 600px 이하에서만 적용되어야 합니다.');
assert.ok(css.includes('@keyframes mtbUrbanService'),'도시철도 역명과 첫·막차 안내가 교대로 표시되어야 합니다.');

const orderStart=source.indexOf('function _metroOrderDirGroups');
const orderEnd=source.indexOf('\n// 분기역 다방면',orderStart);
assert.ok(orderStart>=0&&orderEnd>orderStart,'상·하행 도착 카드 고정 정렬 함수 누락');
const orderContext={METRO_SCHED:{테스트선:{s:['기점','중간','종점']}}};
vm.createContext(orderContext);
vm.runInContext(`${source.slice(orderStart,orderEnd)}\nthis.orderGroups=_metroOrderDirGroups;`,orderContext);
assert.deepEqual(Array.from(orderContext.orderGroups('테스트선','중간',[['기점'],['종점']]),g=>Array.from(g)),[['종점'],['기점']],'하행은 왼쪽, 상행은 오른쪽에 고정해야 합니다.');
assert.deepEqual(Array.from(orderContext.orderGroups('테스트선','중간',[['종점'],['기점']]),g=>Array.from(g)),[['종점'],['기점']],'입력·운행 편수 순서와 무관하게 방면 열이 고정되어야 합니다.');

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
