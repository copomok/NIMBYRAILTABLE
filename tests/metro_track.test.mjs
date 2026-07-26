import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('data/nimbi_metro.js', 'utf8')}\nthis.lines=METRO_LINES;`, context);
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

console.log(`metro track: ${context.lines.length}개 노선 / ${Object.values(context.tracks).reduce((n, t) => n + t.rn.length, 0)}개 선로 런 검증 완료`);
