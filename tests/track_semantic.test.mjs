import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';

const stored = new Map();
const context = {
  console,
  localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

for (const [file, name] of [
  ['data/nimbi_metro.js', 'METRO_LINES'],
  ['data/nimbi_metro_track.js', 'METRO_TRACK'],
  ['data/nimbi_metro_geo.js', 'METRO_GEO'],
  ['data/nimbi_platform_db.js', 'PLATFORM_DB'],
  ['data/nimbi_track_reference.js', 'NIMBI_TRACK_REFERENCE']
]) {
  vm.runInContext(`${fs.readFileSync(file, 'utf8')}\nthis.${name}=${name};`, context, {filename:file});
}
vm.runInContext(fs.readFileSync('js/features/nimbi_track_semantic.js', 'utf8'), context, {filename:'nimbi_track_semantic.js'});

const api = context.NIMBI_TRACK_SEMANTIC;
assert.ok(api?.analyzeLine, 'Track Semantic Analyzer 전역 API 누락');

const disconnected = api._test.makeGraph({
  id:'main', names:['가','나'], ss:[0,100], v:100,
  rn:[[0,0,100,0],[50,-5,50,5]]
});
assert.equal(disconnected.components.length, 2, '높이 정보가 없는 중간 교차를 임의 연결하면 안 됩니다.');

const connected = api._test.makeGraph({
  id:'main', names:['가','나'], ss:[0,100], v:100,
  rn:[[0,0,50,0,100,0],[50,0,50,5]]
});
assert.equal(connected.components.length, 1, '실제 공통 꼭짓점은 하나의 연결 그룹이어야 합니다.');
assert.ok(connected.nodes.some(node => node.kind === 'switch'), '분기기 노드가 생성되어야 합니다.');

assert.deepEqual(JSON.parse(JSON.stringify(api._test.platformBlocks([0,5]))), [
  {kind:'outside',d:0,side:'left',confidence:.8},
  {kind:'outside',d:5,side:'right',confidence:.8}
], '두 선로 승강장은 선로 바깥에 배치해야 합니다.');
assert.deepEqual(JSON.parse(JSON.stringify(api._test.platformBlocks([]))), [], '확인할 수 없는 선로에는 승강장 연결을 추측하면 안 됩니다.');
const learnedPattern = api._test.encodeBlockPattern([0,5], api._test.platformBlocks([0,5]));
assert.deepEqual(JSON.parse(JSON.stringify(api._test.applyBlockPattern([12,18], learnedPattern))), [
  {kind:'outside',d:12,side:'left',confidence:.8},
  {kind:'outside',d:18,side:'right',confidence:.8}
], '학습 캐시는 다른 역의 좌표가 아니라 승강장 구조만 재사용해야 합니다.');

const lineColors = Object.fromEntries(context.METRO_LINES.map(line => [line.name, line.color]));
const platformResolver = lineName => (route, index) => {
  const db = context.PLATFORM_DB[route.names[index]] || context.PLATFORM_DB[`${route.names[index]}역`] || {};
  return Object.entries(db).map(([pn, value]) => {
    const lines=(value.l || []).map(String);
    const bases=[...new Set(lines.map(raw => raw.split('/')[0].split(' (')[0].trim()))];
    const isCur=bases.includes(lineName),metro=bases.find(base => lineColors[base]);
    return {
      pn:Number(pn),isCur,branchOnly:false,variants:[],junction:false,
      kind:(value.g || []).length?'train':(metro?'metro':'train'),
      label:metro||bases[0]||'',color:metro?lineColors[metro]:'#8b949e',lines
    };
  });
};

const started = performance.now();
let routeCount = 0;
const analyzed = [];
for (const line of context.METRO_LINES) {
  const track = context.METRO_TRACK[line.name];
  const result = api.analyzeLine({
    line,
    track,
    geo:context.METRO_GEO[line.name],
    platformVersion:'semantic-test',
    parallelColorResolver:name=>lineColors[name],
    platformResolver:platformResolver(line.name)
  });
  analyzed.push(result);
  assert.equal(result.routes.length, 1 + (track.b?.length || 0), `${line.name}: 지선도 같은 분석기를 거쳐야 합니다.`);
  assert.equal(result.graph.routes.length, result.routes.length, `${line.name}: 통합 Track Graph 경로 누락`);
  assert.ok(result.graph.componentCount > 0, `${line.name}: Connected Component 누락`);
  assert.ok(result.graph.corridorCount > 0, `${line.name}: 선로 Corridor 누락`);
  assert.strictEqual(api.analyzeLine({
    line,
    track,
    geo:context.METRO_GEO[line.name],
    platformVersion:'semantic-test',
    parallelColorResolver:name=>lineColors[name],
    platformResolver:platformResolver(line.name)
  }), result, `${line.name}: 같은 구조 분석 결과를 캐시해야 합니다.`);
  for (const route of result.routes) {
    routeCount++;
    assert.equal(route.stations.length, route.names.length, `${line.name} ${route.id}: 역 의미 정보 수 불일치`);
    assert.ok(route.graph.platformEntries.every(entry => entry.kind === 'platform-entry'), `${line.name}: 승강장 진입점 노드 형식 오류`);
    assert.ok(route.graph.components.every(component => component.type && component.confidence >= 0 && component.confidence <= 1), `${line.name}: Component 의미 분류 오류`);
    assert.ok(route.semanticRuns.every(run => ['main','branch','siding','refuge','yard','turnback','unknown'].includes(run.type)), `${line.name}: 알 수 없는 Track Type`);
    assert.ok(route.semanticRuns.filter(run => run.visible).length <= Math.max(8, Math.min(48, route.names.length)), `${line.name}: 원본 형상 단순화 상한 초과`);
    for (const station of route.stations) {
      const topology = station.topology;
      assert.ok(topology.trackDs.every(Number.isFinite), `${line.name} ${station.name}: 비수치 선로 위치`);
      if (!topology.observed) assert.equal(topology.blocks.length, 0, `${line.name} ${station.name}: 불확실한 승강장 연결을 그리면 안 됩니다.`);
      assert.equal(topology.trackMeta.length, topology.trackDs.length, `${line.name} ${station.name}: 선로 의미 메타데이터 누락`);
    }
  }
}
const elapsed = performance.now() - started;
assert.ok(elapsed < 10000, `전체 노선 의미 분석이 너무 느립니다: ${elapsed.toFixed(0)}ms`);

const gyeongbu = analyzed.find(result => result.lineName === '경부선');
assert.ok(gyeongbu?.reference, '경부선 SVG 배선 기준이 의미 분석기에 연결되어야 합니다.');
const yangju = gyeongbu.routes[0].stations.find(station => station.name === '양주');
const cheongnyangni = gyeongbu.routes[0].stations.find(station => station.name === '청량리');
const uijeongbu = gyeongbu.routes[0].stations.find(station => station.name === '의정부');
assert.equal(yangju?.topology.reference?.currentPlatforms, 2, '양주 경부선 사용 승강장은 SVG의 주황색 2개를 따라야 합니다.');
assert.equal(yangju?.topology.reference?.otherPlatforms, 4, '양주 일반·타 노선 승강장 수를 보존해야 합니다.');
assert.equal(cheongnyangni?.topology.reference?.mirror, true, '청량리–서울 동서 구간의 좌우 반전을 보존해야 합니다.');
const shinNowonGroup = uijeongbu?.topology.parallelGroups.find(group => group.referenceOwner === '신노원선');
assert.equal(shinNowonGroup?.label, '신노원선', '파란 승강장은 신노원선 평행 승강장으로 표시해야 합니다.');
assert.equal(shinNowonGroup?.color, lineColors['신노원선'], '신노원선 평행 선로는 신노원선 실제 노선색을 사용해야 합니다.');

const source = fs.readFileSync('js/features/nimbi_track_semantic.js', 'utf8');
assert.ok(!source.includes('성환'), '특정 역 예외를 Track Semantic Analyzer에 하드코딩하면 안 됩니다.');
assert.ok(stored.has('nimbi_track_semantic_patterns_v2'), '고신뢰 구조 패턴 캐시가 생성되어야 합니다.');

const appSource = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const simpleStart = appSource.indexOf('function _sxPlatformModel');
const simpleEnd = appSource.indexOf('\n// 인게임 실좌표에서 배선의 의미만 추출한다.', simpleStart);
vm.runInContext(`${appSource.slice(simpleStart, simpleEnd)}\nthis.toSimpleTopology=_sxSimpleTopology;`, context);
for (const result of analyzed) for (const route of result.routes) for (const station of route.stations) {
  const simple = context.toSimpleTopology(station.topology);
  assert.ok(simple.trackDs.length >= 1 && simple.trackDs.length <= 6, `${result.lineName} ${station.name}: 단순 배선 선로 수 범위 오류`);
  assert.ok(simple.trackDs.every((d, i) => i === 0 || d > simple.trackDs[i - 1]), `${result.lineName} ${station.name}: 단순 배선 좌우 순서 오류`);
  assert.ok(simple.mainIdx.every(i => i >= 0 && i < simple.trackDs.length), `${result.lineName} ${station.name}: 단순 배선 본선 위치 오류`);
  assert.ok(simple.parallelGroups.length <= 2 && simple.sidings.length <= 2, `${result.lineName} ${station.name}: 단순 배선 보조 선로 상한 초과`);
}

console.log(`track semantic: ${context.METRO_LINES.length}개 노선 / ${routeCount}개 경로 / ${elapsed.toFixed(0)}ms 검증 완료`);
