import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../js/features/nimbi_shell.js',import.meta.url),'utf8');
const engagement=fs.readFileSync(new URL('../js/features/nimbi_engagement.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_rail.css',import.meta.url),'utf8');
const metroData=fs.readFileSync(new URL('../data/nimbi_metro.js',import.meta.url),'utf8');
const metroSchedule=fs.readFileSync(new URL('../data/nimbi_metro_sched.js',import.meta.url),'utf8');
const platformData=fs.readFileSync(new URL('../data/nimbi_metro_platform_directions.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const serviceWorker=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('전철 홈은 장거리열차가 아닌 전철 시각표 스냅샷으로 집계한다',()=>{
  assert.match(app,/function _metroHomeSnapshot\(\)/);
  assert.match(app,/Object\.entries\(typeof METRO_SCHED/);
  assert.match(app,/_metroTrainLivePos\(line,svcIdx\)/);
  assert.match(shell,/function renderMetroOverview\(host\)/);
  assert.match(shell,/if\(appMode==='metro'\)\{\s*renderMetroOverview/);
  assert.match(shell,/도시철도 운행 편성과 노선별 현재 위치/);
  assert.match(shell,/openMetroTrain\('\$\{esc\(train\.line\)\}'/);
  assert.match(shell,/급행·특급/);
});

test('전철용 홈 하단은 전철 경로·노선 운행 정보로 별도 구성된다',()=>{
  assert.match(engagement,/function renderMetroDailyDiscovery\(host\)/);
  assert.match(engagement,/if\(currentMode==='metro'\)\{renderMetroDailyDiscovery\(host\);return;\}/);
  assert.match(engagement,/homeMetroRouteSearch/);
  assert.match(engagement,/_mrFrom=from;_mrVia='';_mrTo=to/);
  assert.match(engagement,/노선별 현재 운행/);
});

test('전철 승강장 안내는 승강장 탭에서 실제 방향만 펼쳐 표시한다',()=>{
  assert.match(app,/function _metroPlatformGuideHTML\(stn\)/);
  assert.match(app,/function _metroPlatformOccurrence\(line,stn,next\)/);
  assert.match(app,/function _metroPlatformGuideRows\(stn\)/);
  assert.match(app,/function _metroDirectionLandmarks\(stn,row\)/);
  assert.match(app,/function selectSIMetroPlatform\(stn,platform\)/);
  assert.match(app,/전철 승강장 안내/);
  assert.doesNotMatch(app,/인게임 운행 방향 기준/);
  assert.match(app,/_appMode==='metro'\?_metroPlatformGuideHTML\(trainName\)/);
  assert.doesNotMatch(app,/_appMode!=='metro'\?_metroPlatformGuideHTML\(trainName\)/);
  assert.match(app,/occurrence\.a\|\|\[\]/);
  assert.match(app,/const occurrence=_metroPlatformOccurrence\(o\.line,stn,o\.next\)/);
  assert.match(app,/plat:platformFor\(o\)/);
  assert.match(app,/si-metro-platform-tabs/);
  assert.match(app,/si-metro-platform-services/);
  assert.match(app,/si-metro-platform-heading/);
  assert.doesNotMatch(app,/\$\{platform\}<small>번<\/small>/);
  assert.doesNotMatch(app,/\$\{item\.kind\}/);
  assert.match(app,/다음역/);
  assert.match(app,/주요역/);
  assert.match(app,/종착역/);
  assert.doesNotMatch(app,/si-metro-platform-role/);
  assert.match(app,/_appMode!=='metro'&&trains\.length\?`<div id="si-platform-trains"/);
  assert.match(css,/\.si-metro-platform-guide/);
  assert.match(css,/\.si-metro-platform-tabs/);
  assert.match(css,/\.si-metro-platform-panel/);
  assert.match(css,/\.si-metro-platform-heading/);
  assert.match(css,/\.si-metro-direction/);
});

test('기차 탭의 선택 승강장은 공용 전철 노선명과 행선지를 함께 표시한다',()=>{
  assert.match(app,/function _metroLinesForTrainPlatformHTML\(stn,platform\)/);
  assert.match(app,/이 승강장을 쓰는 전철/);
  assert.match(app,/directions\.slice\(0,4\)\.join\(' · '\)/);
  assert.match(app,/당역종착/);
  assert.doesNotMatch(app,/>보조</);
  assert.match(app,/_siCardPlatform!==null\?_metroLinesForTrainPlatformHTML\(trainName,_siCardPlatform\)/);
  assert.match(css,/\.si-train-metro-uses/);
});

test('인게임 A→B→A occurrence와 보조 승강장을 원본 그대로 보존한다',()=>{
  const context={};vm.createContext(context);vm.runInContext(platformData,context);
  const data=context.METRO_PLATFORM_DIRECTIONS;
  assert.equal(data.matchedLines,65);
  assert.ok(data.auxiliaryStops>=70);
  assert.deepEqual(Array.from(data.lines['강서선'].platforms['구래'][0].p),[4]);
  assert.deepEqual(Array.from(data.lines['강서선'].platforms['구래'][0].a),[3]);
  assert.deepEqual(Array.from(data.lines['강서선'].platforms['구래'][1].p),[5]);
  assert.deepEqual(Array.from(data.lines['강서선'].platforms['구래'][1].a),[6]);
  assert.deepEqual(Array.from(data.lines['경부선'].platforms['양주'][0].p),[5]);
  assert.deepEqual(Array.from(data.lines['경부선'].platforms['양주'][1].p),[6]);
  assert.match(index,/nimbi_metro_platform_directions\.js\?v=2026100703/);
  assert.match(serviceWorker,/data\/nimbi_metro_platform_directions\.js/);
});

test('다음 정차역으로 A방면과 B방면 occurrence를 구분한다',()=>{
  const start=app.indexOf('function _metroPlatformOccurrence');
  const end=app.indexOf('\nfunction _metroPlatformUses',start);
  const context={};vm.createContext(context);vm.runInContext(platformData,context);
  vm.runInContext(app.slice(start,end),context);
  assert.deepEqual(Array.from(vm.runInContext("_metroPlatformOccurrence('강서선','구래','장기감정').p",context)),[4]);
  assert.deepEqual(Array.from(vm.runInContext("_metroPlatformOccurrence('강서선','구래','통진').p",context)),[5]);
  assert.deepEqual(Array.from(vm.runInContext("_metroPlatformOccurrence('은평선','응암','연서공원').p",context)),[2]);
  assert.deepEqual(Array.from(vm.runInContext("_metroPlatformOccurrence('은평선','응암','마포').p",context)),[1]);
});

test('실제 편성 경로에서 다음역·주요역·종착역과 당역종착을 승강장별로 계산한다',()=>{
  const context={};vm.createContext(context);
  vm.runInContext(metroData,context);
  vm.runInContext(metroSchedule,context);
  vm.runInContext(platformData,context);
  vm.runInContext("function _isTrainStn(){return false} function _opsEsc(v){return String(v)} let _siMetroGuidePlatform=null,_siCurrent=null",context);
  const parts=[
    ['function _metroLineColor','\nfunction _metroBoardSectionContains'],
    ['function _metroStationDeps','\nfunction _metroDirEntries'],
    ['function _metroPlatformOccurrence','\nfunction _metroPlatformUses'],
    ['function _metroServicePath','\nfunction renderSICard']
  ];
  parts.forEach(([from,to])=>{
    const start=app.indexOf(from),end=app.indexOf(to,start);
    assert.ok(start>=0&&end>start,`${from} 추출`);
    vm.runInContext(app.slice(start,end),context);
  });
  const rows=JSON.parse(vm.runInContext(`JSON.stringify(_metroPlatformGuideRows('서울').map(row=>({
    platform:row.platform,line:row.line,terminating:row.terminating,
    marks:_metroDirectionLandmarks('서울',row)
  })))`,context));
  assert.ok(rows.some(row=>row.platform===1&&row.line==='경의선'&&row.terminating&&row.marks.length===0));
  assert.deepEqual(rows.find(row=>row.platform===1&&row.line==='GTX-A').marks,[
    {name:'잠실',kind:'다음역'},
    {name:'수진',kind:'주요역'},
    {name:'북용인',kind:'주요역'},
    {name:'동탄',kind:'주요역'},
    {name:'평택시청',kind:'종착역'}
  ]);
  assert.equal(rows.find(row=>row.platform===1&&row.line==='GTX-A').marks.filter(mark=>mark.kind==='종착역').length,1);
  assert.ok(rows.every(row=>row.marks.length<=5));
  const trainGuide=vm.runInContext("_metroLinesForTrainPlatformHTML('서울',1)",context);
  assert.match(trainGuide,/경의선<\/b><small>\(당역종착\)<\/small>/);
  assert.match(trainGuide,/GTX-A<\/b><small>\(평택시청 방면\)<\/small>/);
});
