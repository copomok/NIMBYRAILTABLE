import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');
const redesign=fs.readFileSync(new URL('../assets/css/nimbi_redesign.css',import.meta.url),'utf8');

test('전철 경로 검색은 출발·도착 기준 시각과 경유지를 받는다',()=>{
  assert.match(app,/id="mr-via"/);
  assert.match(app,/type="time" id="mr-time"/);
  assert.doesNotMatch(app,/id="mr-datetime"|type="datetime-local"/);
  assert.match(app,/data-picker-mode="depart"/);
  assert.match(app,/data-picker-mode="arrive"/);
  assert.match(app,/value="first"/);
  assert.match(app,/value="last"/);
  assert.match(app,/function openMrTimePicker\(\)/);
  assert.match(app,/class="mr-time-picker"/);
  assert.match(app,/>첫차타기<\/span>/);
  assert.match(app,/>막차타기<\/span>/);
  assert.match(app,/function _mrPlannedRoute\(from,via,to,mode,excludedPids\)/);
});

test('출발 검색은 익일 4시 영업 경계를 넘겨 다음날 첫차를 붙이지 않는다',()=>{
  assert.match(app,/if\(ds>=1440\|\|as>1440\)continue/);
  assert.match(app,/익일 오전 4시 전 연결 열차가 없어/);
  assert.match(app,/표시된 마지막 역까지만 이동할 수 있습니다/);
  assert.match(app,/legs\.map\(l=>l\.segment\)/);
  assert.match(app,/mapTo:realOk\?to:legs\.at\(-1\)\?\.alight\|\|from/);
  assert.match(app,/rt-service-ended/);
  assert.match(app,/\$\{fmt\(legs\[0\]\.dep\)\} → --:--/);
});

test('도착 시각 기준 검색은 목적지부터 선행 열차를 역산한다',()=>{
  assert.match(app,/function _metroSegServiceBefore/);
  assert.match(app,/else if\(_mrEdgeMode==='normal'&&_mrTimeMode==='arrive'\)/);
  assert.match(app,/for\(let i=r\.segments\.length-1;i>=0;i--\)/);
});

test('막차 검색은 출발 가능한 가장 늦은 첫 구간을 찾고 후속 구간은 가장 빠른 연결편을 탄다',()=>{
  assert.match(app,/function _mrLatestDepartJourney\(segments,graph,xbuf\)/);
  assert.match(app,/const firstSvc=_metroSegServiceBefore\([^;]+,'departure'\)/);
  assert.match(app,/for\(let i=1;i<segments\.length;i\+\+\)/);
  assert.match(app,/const svc=_metroSegService\(line\.name,segment\.stns\[0\],segment\.stns\.at\(-1\),afterSrv,segment\.pid\)/);
  assert.match(app,/beforeSrv=firstSvc\.ds-1/);
  assert.doesNotMatch(app,/let beforeSrv=_mrEdgeMode==='last'\?1440:selectedSrv/);
});

test('각 환승 구간은 승차역 출발과 하차역 도착 시각을 모두 표시한다',()=>{
  assert.match(app,/rt-leg-arrive\$\{finalLeg/);
  assert.match(app,/<b>\$\{fmt\(lg\.arr\)\}<\/b><div class="rt-time-label"><small>\$\{cutOff\?'운행 종료':'도착'\}<\/small><\/div>/);
});

test('지도 역 팝업에서 출발·경유·도착지를 설정할 수 있다',()=>{
  assert.match(app,/setMapStationAsRoutePoint\('from'/);
  assert.match(app,/setMapStationAsRoutePoint\('via'/);
  assert.match(app,/setMapStationAsRoutePoint\('to'/);
  assert.match(css,/\.map-route-point-actions/);
});

test('검색 경로는 실제 지도에서만 강조하고 별도 선형 지도는 제공하지 않는다',()=>{
  assert.match(app,/_mrOpenMap\('map'\)/);
  assert.match(app,/class="map-journey-route"/);
  assert.doesNotMatch(app,/_mrOpenMap\('linear'\)|function _mrShowLinearDiagram|function showMetroLineLinear|>선형 노선도<\/button>/);
  assert.doesNotMatch(css,/\.mr-linear-overlay/);
});

test('경로 검색 입력부는 간결한 단일 지점 스택으로 표시한다',()=>{
  assert.match(app,/class="mr-place-stack"/);
  assert.match(app,/class="mr-search-foot"/);
  assert.match(redesign,/\.mr-place-stack\{/);
});

test('경로 지도는 경로 핵심역만 표시하고 실시간 열차를 숨긴다',()=>{
  assert.match(app,/if\(journeyView&&!journeyNamedStations\.has\(s\.n\)\)return/);
  assert.match(app,/const journeyActive=!!\(_metroJourneyMap/);
  assert.match(app,/countEl\.textContent='경로 안내'/);
  assert.match(app,/isJourneyMajor\?8:4/);
});

test('여러 권역을 지나는 경로는 통과하는 모든 권역 노선을 합쳐 그린다',()=>{
  assert.match(app,/function _metroRegionsAsMapLine\(encodedRegions\)/);
  assert.match(app,/new Set\(_mrLastJourney\.segments\.map\(segment=>graph\.lineById\[segment\.lid\]\?\.region\)/);
  assert.match(app,/regions\.length>1\?`metrojourney:/);
  assert.match(app,/lineKey\.startsWith\('metrojourney:'\)/);
});

test('실제 종착 행선지와 첫차·막차 표식을 사용한다',()=>{
  assert.match(app,/dest:names\[idxSeq\[end\]\]/);
  assert.match(app,/lg\.isFirst\?'<span class="rt-edge-tag first">첫차<\/span>'/);
  assert.match(app,/lg\.isLast\?'<span class="rt-edge-tag last">막차<\/span>'/);
});

test('경로의 역명을 누르면 해당 편성이 강조된 역 시간표를 연다',()=>{
  assert.match(app,/function openMetroRouteTimetable\(stn,line,svc,clk,k0,k1\)/);
  assert.match(app,/data-svc="\$\{r\.svc\}" data-clk="\$\{r\.clk\}" data-k0="\$\{r\.k0\}" data-k1="\$\{r\.k1\}"/);
  assert.match(app,/routeRow\.classList\.add\('mtt-row--route'\)/);
  assert.match(app,/class="rt-stn rt-stn-link"/);
  assert.match(redesign,/\.rt-stn-link\{[^}]*font-weight:800/);
});

test('현재 시각 기본값과 첫차·막차 실제 출발 시각을 검색 상자에 반영한다',()=>{
  assert.match(app,/const shownTime=_mrTimeExplicit&&_mrTime\?_mrTime:_mrDefaultTime\(\)/);
  assert.match(app,/function _mrShowResolvedTime\(clockMinute\)/);
  assert.match(app,/if\(_mrEdgeMode!=='normal'\)_mrShowResolvedTime\(legs\[0\]\.dep\)/);
});

test('부분 운행 종료 시 이용 불가 운행 패턴을 제외하고 대체 경로를 다시 찾는다',()=>{
  assert.match(app,/function _metroFindRoute\(from,to,mode,excludedPids\)/);
  assert.match(app,/blocked\.add\(failedPid\)/);
  assert.match(app,/return searchMetroRoute\(blocked,routeAttempt\+1\)/);
});

test('통합 길찾기는 전철·기차와 교통수단 필터 및 예상 운임을 제공한다',()=>{
  assert.match(app,/>통합 길찾기<\/button>/);
  assert.match(app,/function _mrIntegratedEdges\(\)/);
  assert.match(app,/function searchIntegratedRoute\(from,via,to\)/);
  assert.match(app,/KTX·SRT/);
  assert.match(app,/일반열차/);
  assert.match(app,/>GTX<\/label>/);
  assert.match(app,/function _mrMetroFare\(distanceKm\)/);
  assert.match(app,/예상 \$\{fare\.toLocaleString\(\)\}원/);
});

test('첫차·막차 표식은 출발 시각 옆에만 표시하고 결과 행의 구분선은 제거한다',()=>{
  assert.match(app,/<div class="rt-time-label"><small>출발<\/small>\$\{edge\}<\/div>/);
  assert.doesNotMatch(app,/<small>\$\{cutOff\?'운행 종료':'도착'\}<\/small>\$\{edge\}/);
  assert.match(redesign,/#mr-result \.rt-info\{[^}]*border:0/);
});

test('마지막 역 아이콘에서 타임라인 선이 끝난다',()=>{
  assert.match(redesign,/\.rt-final-arrive \.rt-seg\{display:none\}/);
});

test('좁은 화면에서도 지도 지점 설정 버튼은 가로 3열을 유지한다',()=>{
  assert.match(css,/\.map-route-point-actions\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
