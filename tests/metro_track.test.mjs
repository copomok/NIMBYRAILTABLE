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

const index = fs.readFileSync('index.html', 'utf8');
const trackLoad = index.indexOf('data/nimbi_metro_track.js');
const appLoad = index.indexOf('js/nimbi_rail.js');
assert.ok(trackLoad >= 0 && trackLoad < appLoad, '인게임 배선 데이터는 앱 렌더러보다 먼저 로드해야 합니다.');

const app = fs.readFileSync('js/nimbi_rail.js', 'utf8');
const modelStart = app.indexOf('function _sxPlatformModel');
const modelEnd = app.indexOf('\n// 인게임 실좌표에서 배선의 의미만 추출한다.', modelStart);
assert.ok(modelStart >= 0 && modelEnd > modelStart, '승강장 배선 모델 함수 누락');
vm.runInContext(`${app.slice(modelStart, modelEnd)}\nthis.platformModel=_sxPlatformModel;`, context);
const side = context.platformModel(2, '경부선', '신묵');
assert.deepEqual(JSON.parse(JSON.stringify(side.blocks)), [
  {kind:'outside', d:0, side:'left'},
  {kind:'outside', d:5, side:'right'}
], '2선 2면역은 바깥쪽 상대식이어야 합니다.');
assert.deepEqual(Array.from(context.platformModel(4, '경부선', '종로1가').mainIdx), [1,2], '일반 4선역은 2·3번이 본선이어야 합니다.');
assert.deepEqual(Array.from(context.platformModel(4, '경부선', '성환').mainIdx), [0,3], '성환역은 1·4번이 본선이어야 합니다.');
const linkStart = app.indexOf('function _sxSidingIsConnected');
const linkEnd = app.indexOf('\n// 인게임 실좌표에서 배선의 의미만 추출한다.', linkStart);
assert.ok(linkStart >= 0 && linkEnd > linkStart, '독립·연결 선로 판정 함수 누락');
vm.runInContext(`${app.slice(linkStart, linkEnd)}\nthis.sidingConnected=_sxSidingIsConnected;`, context);
assert.equal(context.sidingConnected([[{s:100,d:-5},{s:160,d:0}]], -5, [0,5]), true, '실제 짧은 분기 선분은 본선 연결로 판정해야 합니다.');
assert.equal(context.sidingConnected([[{s:100,d:-10},{s:240,d:-10}]], -10, [0,5]), false, '나란한 독립선은 본선 연결로 판정하면 안 됩니다.');
assert.equal(context.sidingConnected([[{s:100,d:-5},{s:500,d:0}]], -5, [0,5]), false, '멀리 떨어진 좌표를 억지 분기로 연결하면 안 됩니다.');
assert.ok(Object.values(context.tracks).some(t => t.b?.length), '같은 노선 지선 배선 데이터 누락');
assert.ok(Object.values(context.geo).some(g => g.d?.length), '차량기지·주박선 연결 데이터 누락');

console.log(`metro track: ${context.lines.length}개 노선 / ${Object.values(context.tracks).reduce((n, t) => n + t.rn.length, 0)}개 선로 런 검증 완료`);
