import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro.js', 'utf8')}\nthis.lines=METRO_LINES;`, context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro_geo.js', 'utf8')}\nthis.geo=METRO_GEO;`, context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro_track.js', 'utf8')}\nthis.tracks=METRO_TRACK;`, context);

assert.equal(context.lines.length, Object.keys(context.tracks).length, '모든 전철 노선에 배선 데이터가 있어야 합니다.');

for (const line of context.lines) {
  const track = context.tracks[line.name];
  assert.ok(track, `${line.name}: 배선 데이터 누락`);
  assert.equal(track.ss.length, line.stations.length, `${line.name}: 역과 배선 기준점 수 불일치`);
  assert.ok(track.rn.length >= 2, `${line.name}: 실선로 런 부족`);
  // 일부 인게임 노선에는 미기록 역 기준점이 0으로 남아 있다. 렌더러는 이를 앞뒤 값으로 보간한다.
  assert.ok(track.ss.every(Number.isFinite), `${line.name}: 비수치 역 기준점`);
  assert.ok(track.rn.every(run => run.length >= 4 && run.length % 2 === 0), `${line.name}: 잘못된 s/d 선로 런`);
  for (const run of track.rn) {
    for (let i = 0; i < run.length; i += 2) {
      assert.ok(Number.isFinite(run[i]) && Number.isFinite(run[i + 1]), `${line.name}: 비수치 선로 좌표`);
      assert.ok(run[i] >= 0 && run[i] <= track.v, `${line.name}: 노선 범위를 벗어난 선로 좌표`);
    }
  }
}

const samrangjin = context.lines.find(line => line.name === '삼랑진기장선');
assert.deepEqual(
  Array.from(samrangjin.stations.slice(0, 3)),
  ['진영', '남진영', '진례'],
  '삼랑진기장선은 진영–남진영–진례가 하나의 본선으로 이어져야 합니다.'
);
assert.equal(samrangjin.routes.length, 1, '삼랑진기장선의 남진영 지선 정의를 제거해야 합니다.');
assert.ok(!context.tracks['삼랑진기장선'].b?.length, '삼랑진기장선 배선에도 별도 남진영 지선이 남으면 안 됩니다.');
assert.ok(!context.geo['삼랑진기장선'].b?.length, '삼랑진기장선 지도에도 별도 남진영 지선이 남으면 안 됩니다.');

vm.runInContext(`${fs.readFileSync('data/nimbi_station_data.js', 'utf8')}\nthis.stations=STATION_DB;`, context);
vm.runInContext(`${fs.readFileSync('data/nimbi_platform_db.js', 'utf8')}\nthis.platforms=PLATFORM_DB;`, context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro_sched.js', 'utf8')}\nthis.schedules=METRO_SCHED;`, context);
assert.ok(context.stations['회덕'] && !context.stations['회덕역 / 대전차량기지'], '회덕 역 정보는 회덕 키 하나로 통합해야 합니다.');
assert.ok(context.platforms['회덕'] && !context.platforms['회덕역 / 대전차량기지'], '회덕 승강장 정보는 회덕 키 하나로 통합해야 합니다.');
for (const line of ['충청선', '노은산내선']) {
  assert.ok(context.schedules[line].s.includes('회덕'), `${line} 시간표는 통합된 회덕 역명을 사용해야 합니다.`);
  assert.ok(!context.schedules[line].s.includes('회덕역 / 대전차량기지'), `${line} 시간표에 이전 회덕 역명이 남으면 안 됩니다.`);
}

const index = fs.readFileSync('index.html', 'utf8');
const trackLoad = index.indexOf('data/nimbi_metro_track.js');
const referenceLoad = index.indexOf('data/nimbi_track_reference.js');
const semanticLoad = index.indexOf('js/features/nimbi_track_semantic.js');
assert.equal(trackLoad,-1,'삭제된 배선 기능의 대용량 원본 데이터를 앱에서 불러오면 안 됩니다.');
assert.equal(referenceLoad,-1,'삭제된 배선 기능의 SVG 기준 데이터를 앱에서 불러오면 안 됩니다.');
assert.equal(semanticLoad,-1,'삭제된 배선 기능의 의미 분석기를 앱에서 불러오면 안 됩니다.');

const app = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const modelStart = app.indexOf('function _sxPlatformModel');
const modelEnd = app.indexOf('\n// 인게임 실좌표에서 배선의 의미만 추출한다.', modelStart);
assert.ok(modelStart >= 0 && modelEnd > modelStart, '승강장 배선 모델 함수 누락');
vm.runInContext(`${app.slice(modelStart, modelEnd)}\nthis.platformModel=_sxPlatformModel;this.simpleTopology=_sxSimpleTopology;`, context);
const side = context.platformModel(2, '경부선', '신묵');
assert.deepEqual(JSON.parse(JSON.stringify(side.blocks)), [
  {kind:'outside', d:0, side:'left'},
  {kind:'outside', d:5, side:'right'}
], '2선 2면역은 바깥쪽 상대식이어야 합니다.');
assert.deepEqual(Array.from(context.platformModel(4, '경부선', '종로1가').mainIdx), [1,2], '일반 4선역은 2·3번이 본선이어야 합니다.');
assert.deepEqual(Array.from(context.platformModel(4, '임의노선', '임의역').mainIdx), [1,2], '폴백 모델도 특정 역 예외 없이 구조 규칙만 사용해야 합니다.');
assert.ok(!app.slice(modelStart, modelEnd).includes('성환'), '특정 역의 본선 위치를 하드코딩하면 안 됩니다.');
const simple = context.simpleTopology({
  observed:true,trackDs:[-18,-6,7,19],mainDs:[-6,7],mainIdx:[1,2],
  blocks:[{kind:'between',a:-18,b:-6},{kind:'between',a:7,b:19}],
  sidings:[{d:-25,connected:true},{d:28,connected:false}],parallelGroups:[],cross:2,platforms:4,trackMeta:[]
});
assert.deepEqual(Array.from(simple.trackDs), [-5,0,5,10], '원본 좌우 순서는 유지하되 배선 간격은 단순화해야 합니다.');
assert.deepEqual(Array.from(simple.mainIdx), [1,2], '단순 배선에서도 본선 선로 위치를 유지해야 합니다.');
assert.equal(simple.cross, 1, '건넘선은 알아보기 쉽게 한 개 기호로 단순화해야 합니다.');
const laneStart = app.indexOf('function _sxTopologyTrainLane');
const laneEnd = app.indexOf('\nfunction _metroSchCanvas', laneStart);
assert.ok(laneStart >= 0 && laneEnd > laneStart, '우측통행 열차 선로 선택 함수 누락');
vm.runInContext(`${app.slice(laneStart, laneEnd)}\nthis.topologyTrainLane=_sxTopologyTrainLane;`, context);
const laneLayer = {parallelMap:{}};
const regularTopology = {mainDs:[0,5],parallelGroups:[],reference:{mirror:false}};
const mirroredTopology = {mainDs:[0,5],parallelGroups:[],reference:{mirror:true}};
assert.equal(context.topologyTrainLane(laneLayer, regularTopology, 100, 3.2, true, []), 116, '일반 구간 하행 열차는 우측 선로를 사용해야 합니다.');
assert.equal(context.topologyTrainLane(laneLayer, regularTopology, 100, 3.2, false, []), 100, '일반 구간 상행 열차는 좌측 선로를 사용해야 합니다.');
assert.equal(context.topologyTrainLane(laneLayer, mirroredTopology, 100, 3.2, true, []), 100, '청량리–서울 반전 구간 하행 선로를 좌우 반전해야 합니다.');
assert.equal(context.topologyTrainLane(laneLayer, mirroredTopology, 100, 3.2, false, []), 116, '청량리–서울 반전 구간 상행 선로를 좌우 반전해야 합니다.');
vm.runInContext('this.alignedBranchY=_sxAlignedBranchY;this.platformMatchesRoute=_sxPlatformMatchesRoute;', context);
assert.deepEqual(Array.from(context.alignedBranchY(['분기역','지선중간','합류역'], {분기역:0,합류역:2}, [30,90,150], 44)), [30,90,150], '지선의 공통역은 본선과 같은 높이에 정렬되어야 합니다.');
assert.equal(context.platformMatchesRoute({variants:['구로-남평택']},{label:'평택→남평택',names:['평택','남평택']}), true, '가지 노선 전용 승강장은 지선 종착역으로 연결되어야 합니다.');
assert.ok(app.includes("p.kind==='metro'||p.kind==='train'"), '일반열차 병행 승강장을 평행 선로군에 포함해야 합니다.');
assert.ok(app.includes('branchRoutes.find'), '지선 운행 열차는 본선이 아닌 지선 선로군에 배치해야 합니다.');
assert.ok(!app.includes('분리 승강장'), '같은 노선의 별도 승강장에 분리 승강장 표기를 남기면 안 됩니다.');
for (const line of context.lines) {
  const track = context.tracks[line.name];
  const mainIndex = Object.fromEntries(line.stations.map((name, i) => [name, i]));
  const mainY = line.stations.map((_, i) => 30 + i * 62);
  for (const branch of track.b || []) {
    const common = branch.names.filter(name => mainIndex[name] != null);
    assert.ok(common.length, `${line.name} ${branch.lbl}: 본선 분기역 누락`);
    const branchY = Array.from(context.alignedBranchY(branch.names, mainIndex, mainY, 44));
    assert.ok(branchY.every((y, i) => i === 0 || y >= branchY[i - 1]), `${line.name} ${branch.lbl}: 지선 세로 순서 역전`);
    branch.names.forEach((name, i) => {
      if (mainIndex[name] != null) assert.equal(branchY[i], mainY[mainIndex[name]], `${line.name} ${branch.lbl}: 공통역 높이 불일치`);
    });
  }
  for (const depot of context.geo[line.name]?.d || []) {
    assert.ok(Number.isInteger(depot.j) && depot.j >= 0 && depot.j < line.stations.length, `${line.name} ${depot.n}: 기지 인입역 인덱스 오류`);
  }
}
const linkStart = app.indexOf('function _sxSidingIsConnected');
const linkEnd = app.indexOf('\n// 인게임 실좌표에서 배선의 의미만 추출한다.', linkStart);
assert.ok(linkStart >= 0 && linkEnd > linkStart, '독립·연결 선로 판정 함수 누락');
vm.runInContext(`${app.slice(linkStart, linkEnd)}\nthis.sidingConnected=_sxSidingIsConnected;`, context);
assert.equal(context.sidingConnected([[{s:100,d:-5},{s:160,d:0}]], -5, [0,5]), true, '실제 짧은 분기 선분은 본선 연결로 판정해야 합니다.');
assert.equal(context.sidingConnected([[{s:100,d:-10},{s:240,d:-10}]], -10, [0,5]), false, '나란한 독립선은 본선 연결로 판정하면 안 됩니다.');
assert.equal(context.sidingConnected([[{s:100,d:-5},{s:500,d:0}]], -5, [0,5]), false, '멀리 떨어진 좌표를 억지 분기로 연결하면 안 됩니다.');
assert.ok(Object.values(context.tracks).some(t => t.b?.length), '같은 노선 지선 배선 데이터 누락');
assert.ok(Object.values(context.geo).some(g => g.d?.length), '차량기지·주박선 연결 데이터 누락');
const canvasStart=app.indexOf('function _metroSchCanvas(l)');
const canvasEnd=app.indexOf('\\nfunction ',canvasStart+10);
const canvasBody=app.slice(canvasStart,canvasEnd);
assert.ok(!canvasBody.includes('_sxDetailedTrackLayer('), '단순 배선도에 원본 선로 조각을 직접 겹쳐 그리면 안 됩니다.');
assert.ok(canvasBody.includes('_sxSchematicTrackLayer('), '본선과 가지 노선은 동일한 단순 배선 렌더러를 사용해야 합니다.');

console.log(`metro track: ${context.lines.length}개 노선 / ${Object.values(context.tracks).reduce((n, t) => n + t.rn.length, 0)}개 선로 런 검증 완료`);
