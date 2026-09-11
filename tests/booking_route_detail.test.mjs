import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');
const redesignCss=fs.readFileSync(new URL('../assets/css/nimbi_redesign.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../manifest.json',import.meta.url),'utf8');

test('예매 열차 상세 버튼은 선택 구간 운행 정보창을 연다',()=>{
  assert.match(app,/function openBookRouteDetail\(trainNo,from,to,travelDate\)/);
  assert.match(app,/openBookRouteDetail\(trainNo,from,to,travelDate\)/);
  assert.doesNotMatch(app,/bdd-detail-btn'\), \(\)=>\{ closeBookTrainDetail\(\); jumpToTrain/);
});

test('예매한 승차권 카드는 시간표·운행 정보·취소 순으로 동작한다',()=>{
  const card=app.slice(app.indexOf('function _ticketCardHTML'),app.indexOf('// 🔄 환승 승차권 카드'));
  const timetable=card.indexOf('ticket-action-timetable');
  const route=card.indexOf('ticket-action-route');
  const cancel=card.indexOf('ticket-action-cancel');
  assert.ok(timetable>=0&&route>timetable&&cancel>route);
  assert.match(card,/openBookRouteDetail\('\$\{tk\.trainNo\}','\$\{tk\.fromStn\}','\$\{tk\.toStn\}','\$\{tk\.travelDate\}'\)/);
  assert.match(card,/const isTravelToday=_tkt\?_bookRouteIsLiveServiceDate\(_tkt,tk\.travelDate\)/);
  assert.match(card,/\$\{isTravelToday\?`<button class="btn ticket-action-route"/);
  assert.match(redesignCss,/\.ticket-card \.ticket-action-route/);
});

test('환승 예매와 환승 승차권은 선행·후행 시간표와 운행 정보를 각각 연다',()=>{
  const card=app.slice(app.indexOf('function _xferTicketCardHTML'),app.indexOf('function cancelXferGroup'));
  assert.match(card,/선행':'후행'\} 시간표/);
  assert.match(card,/선행':'후행'\} 운행 정보/);
  assert.match(card,/openBookRouteDetail\('\$\{tk\.trainNo\}','\$\{tk\.fromStn\}','\$\{tk\.toStn\}','\$\{tk\.travelDate\}'\)/);
  const booking=app.slice(app.indexOf('function _renderXferBody'),app.indexOf('function updateXferConfirm'));
  assert.match(booking,/openJourney\('\$\{L\.no\}'\)/);
  assert.match(booking,/openBookRouteDetail\('\$\{L\.no\}','\$\{L\.from\}','\$\{L\.to\}','\$\{X\.date\}'\)/);
});

test('운행 정보창은 정차역과 승차·하차 구간을 구분한다',()=>{
  assert.match(app,/!isPassStop\(t,s\.s\)/);
  assert.match(app,/brd-stop-badge board">승차/);
  assert.match(app,/brd-stop-badge alight">하차/);
  assert.match(app,/class="brd-arr"/);
  assert.match(app,/class="brd-dep"/);
  assert.match(app,/_realPlatform\(t\.no,s\.s\)/);
  assert.match(css,/\.brd-stop\.ride \.brd-rail:before/);
  assert.match(css,/\.brd-stop\.before,.brd-stop\.after/);
});

test('운행 정보창은 반응형 시트이며 새 캐시로 배포된다',()=>{
  assert.match(css,/#book-route-detail-wrap/);
  assert.match(css,/@media\(min-width:768px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(html,/nimbi_rail\.css\?v=2026091003/);
  assert.match(html,/nimbi_rail\.js\?v=2026091101/);
  assert.match(sw,/nimbirail-2026091101/);
});

test('운행 정보는 시간표·지도 탭과 선택 구간 노선도를 제공한다',()=>{
  assert.match(app,/function setBookRouteDetailTab\(mode\)/);
  assert.match(app,/data-view="schedule"/);
  assert.match(app,/data-view="map"/);
  assert.match(app,/function _bookRouteMapHTML\(t,from,to,gradeColor,travelDate,projectMinutes=0\)/);
  assert.match(app,/class="\$\{active\?'selected':'muted'\}"/);
  assert.doesNotMatch(app,/>승차<\/text>/);
  assert.doesNotMatch(app,/>하차<\/text>/);
  assert.match(app,/const stopping=!isPassStop\(t,p\.s\.s\)/);
  assert.match(app,/const showLabel=stopping&&/);
  assert.match(app,/const points=\(t\.stops\|\|\[\]\)\.map/);
  assert.match(app,/if\(!stopping\)return ''/);
  assert.match(css,/\.brd-map-canvas line\.selected/);
  assert.match(css,/\.brd-map-canvas line\.muted/);
});

test('당일 운행 중인 열차는 지도 선형 위에 현재 위치 아이콘을 표시한다',()=>{
  assert.match(app,/function _bookRouteMapHTML\(t,from,to,gradeColor,travelDate,projectMinutes=0\)/);
  assert.match(app,/const serviceNow=now\.getHours\(\)\*60\+now\.getMinutes\(\)\+now\.getSeconds\(\)\/60-delay\+projectMinutes/);
  assert.match(app,/const fraction=Math\.max\(0,Math\.min\(1,/);
  assert.match(app,/class="brd-map-live-train"/);
  assert.match(app,/\$\{lines\}\$\{nodes\}\$\{liveMarker\}/);
  assert.match(css,/\.brd-map-live-train circle/);
});

test('현재 위치는 무시각 통과역을 포함한 실제 지도 선형을 따라 이동한다',()=>{
  assert.match(app,/map\(\(s,idx\)=>\(\{s,idx,coord:_stnCoord\(s\.s\)\}\)\)/);
  assert.match(app,/const path=points\.slice\(aPos,bPos\+1\),segments=\[\]/);
  assert.match(app,/Math\.hypot\(path\[i\+1\]\.x-path\[i\]\.x,path\[i\+1\]\.y-path\[i\]\.y\)/);
  assert.match(app,/const local=segments\[segment\]>0\?target\/segments\[segment\]:0/);
});

test('운행 정보 요약은 역 개수 대신 열차 시간표와 같은 현재 운행 문구를 표시한다',()=>{
  assert.doesNotMatch(app,/전체 \$\{allStops\.length\}개 정차역/);
  assert.match(app,/operationMain=`\$\{live\.nextStn\}역으로 이동 중입니다`/);
  assert.match(app,/operationMain=`\$\{live\.atStn\}역에 정차 중입니다`/);
  assert.match(app,/operationMain='운행을 준비중인 열차입니다'/);
  assert.match(app,/operationMain='운행이 종료된 열차입니다'/);
  assert.match(app,/class="brd-operation-state"/);
});

test('운행 정보 시간표는 예정 시각 아래에 지연 반영 시각을 표시한다',()=>{
  assert.match(app,/const timedStops=\(t\.stops\|\|\[\]\)\.filter/);
  assert.match(app,/_simDelayPairAtStop\(t,delayIdx\)/);
  assert.match(app,/addMinToClock\(arr,delayPair\.arr\)/);
  assert.match(app,/addMinToClock\(dep,delayPair\.dep\)/);
  assert.match(app,/<small>\(\$\{esc\(actual\)\}\)<\/small>/);
  assert.match(css,/\.brd-stop time>small\{[^}]*color:var\(--red\)/);
});

test('운행 정보는 도착·출발 사이 화살표 없이 현재 위치를 표시한다',()=>{
  assert.doesNotMatch(app,/class="brd-arrow"/);
  assert.match(app,/const live=getCurrentStatus\(t,serviceNow\)/);
  assert.match(app,/brd-live-marker/);
  assert.match(app,/현재 위치:/);
  assert.doesNotMatch(app,/brd-live-marker[^`]*<b>운행 중<\/b>/);
  assert.match(css,/\.brd-live-marker/);
});

test('접근 중 열차 아이콘과 대상 역 노드를 함께 표시한다',()=>{
  assert.match(css,/\.brd-live-marker\{[^}]*left:50%;top:var\(--brd-live-top,50%\)[^}]*translate\(-50%,-50%\)/);
  assert.doesNotMatch(css,/\.brd-stop\.live \.brd-rail>i\{visibility:hidden\}/);
});

test('익일 자정 이후에는 전날 출발한 막차를 현재 운행으로 판정한다',()=>{
  assert.match(app,/function _trainRunsPastMidnight\(t\)/);
  assert.match(app,/function _bookRouteIsLiveServiceDate\(t,serviceDate,now=new Date\(\)\)/);
  assert.match(app,/serviceDate===todayLocalStr\(yesterday\)&&now\.getHours\(\)<4&&_trainRunsPastMidnight\(t\)/);
  assert.match(app,/const liveServiceDate=_bookRouteIsLiveServiceDate\(t,serviceDate\)/);
});

test('모바일에서도 열차 아이콘은 타임라인 선과 역 노드 위에 표시된다',()=>{
  assert.match(css,/\.brd-rail\{[^}]*isolation:isolate;z-index:2/);
  assert.match(css,/\.brd-rail:before\{[^}]*z-index:0/);
  assert.match(css,/\.brd-live-marker\{[^}]*z-index:6/);
});

test('모바일 운행 정보창은 후속 터치로 닫히지 않는다',()=>{
  assert.match(app,/performance\.now\(\)-openedAt>400/);
  assert.match(css,/@media\(max-width:380px\)/);
});

test('운행 정보는 매분 0초에 위치 정보만 자동 갱신한다',()=>{
  assert.match(app,/function _scheduleBookRouteDetailTick\(\)/);
  assert.match(app,/const wait=60000-\(Date\.now\(\)%60000\)\+30/);
  assert.match(app,/function updateBookRouteLive\(trainNo,from,to,travelDate\)/);
  assert.match(app,/row\.classList\.toggle\('live',i===liveStopIdx\)/);
  assert.match(app,/probe\.innerHTML=_bookRouteMapHTML/);
  assert.doesNotMatch(app,/class="brd-refresh"/);
  assert.match(app,/clearTimeout\(_bookRouteDetailTimer\)/);
});

test('매분 갱신 시 시간표의 현재 위치 행도 다음 실제 정차역으로 이동한다',()=>{
  assert.match(app,/function _bookRouteTimelinePosition\(t,rowStations,live,serviceNow\)/);
  assert.match(app,/!isPassStop\(t,stop\.s\)/);
  assert.match(app,/const position=_bookRouteTimelinePosition\(t,rows\.map\(row=>row\.dataset\.station\),projectedLive,projectedNow\)/);
  assert.match(app,/liveStopIdx=position\.idx;liveMarkerIdx=position\.markerIdx;liveTop=position\.top/);
});

test('정차 중 아이콘은 역 노드 중앙에 포개지고 이동 중에는 1분간 부드럽게 움직인다',()=>{
  assert.match(app,/return \{idx:exact,markerIdx:exact,top:50,between:false/);
  assert.match(app,/top:50\+fraction\*100/);
  assert.match(app,/style="--brd-live-top:\$\{liveTop\}%"/);
  assert.match(css,/transition:top 59s linear/);
  assert.match(css,/\.brd-map-live-train\{[^}]*transition:transform 59s linear/);
  assert.match(app,/_bookRouteMapHTML\(t,from,to,color,travelDate,1\)/);
});

test('설치형 모바일 앱은 세로 방향을 유지한다',()=>{
  assert.equal(JSON.parse(manifest).orientation,'portrait-primary');
});
