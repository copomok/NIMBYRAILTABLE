import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const svgPath = 'assets/reference/nimbi_gyeongbu_track.svg';
const dataPath = 'data/nimbi_track_reference.js';
const context = {};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync(dataPath, 'utf8')}\nthis.reference=NIMBI_TRACK_REFERENCE;`, context);

const reference = JSON.parse(JSON.stringify(context.reference));
const line = reference.lines['경부선'];
assert.ok(line, '경부선 SVG 배선 기준 누락');
assert.equal(reference.sourceHash, crypto.createHash('sha256').update(fs.readFileSync(svgPath)).digest('hex').slice(0,16), 'SVG 원본과 생성 데이터의 해시가 달라졌습니다.');
assert.equal(reference.rules.trafficSide, 'right', '모든 노선은 우측통행 기준이어야 합니다.');
assert.deepEqual(line.direction, {
  down:{from:'양주', via:'청량리', toward:'노량진'},
  diagram:{left:'north', right:'south'}
}, '경부선 하행 및 도면 방위 기준 오류');
assert.equal(Object.keys(line.stations).length, 15, 'SVG 역 추출 수 오류');
const platformCount = Object.values(line.stations).reduce((sum, station) =>
  sum + station.platforms.current
    + Object.values(station.platforms.parallel).reduce((n, count) => n + count, 0)
    + station.platforms.other, 0);
assert.equal(platformCount, 81, 'SVG 승강장 블록 추출 수 오류');
assert.deepEqual(line.stations['의정부'].platforms, {
  current:2,
  parallel:{'신노원선':2},
  other:2,
  order:line.stations['의정부'].platforms.order
}, '의정부 경부선·신노원선·기타 승강장 분류 오류');
assert.equal(line.stations['서울'].platforms.other, 14, '서울 일반열차·타 노선 승강장 수 오류');
assert.deepEqual(line.orientationExceptions[0].stations, ['청량리','장신대','종로5가','종로1가','서울'], '청량리–서울 좌우 반전 적용 범위 오류');

const tempPath = path.join(os.tmpdir(), `nimbi-track-reference-${process.pid}.js`);
const generated = spawnSync(process.execPath, ['tools/build_track_reference.mjs', svgPath, tempPath], {encoding:'utf8'});
assert.equal(generated.status, 0, generated.stderr || 'SVG 기준 재생성 실패');
assert.equal(fs.readFileSync(tempPath, 'utf8'), fs.readFileSync(dataPath, 'utf8'), '생성 도구 결과가 저장된 기준 데이터와 다릅니다.');
fs.unlinkSync(tempPath);

console.log(`track reference: ${Object.keys(line.stations).length}개 역 / ${platformCount}개 승강장 / 우측통행·반전 구간 검증 완료`);
