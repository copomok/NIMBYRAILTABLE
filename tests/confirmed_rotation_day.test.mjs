import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('확정 편성 운용은 열차 중복 없이 당일 원 기점 복귀·5분 회차를 지킨다', () => {
  const report = JSON.parse(execFileSync(process.execPath, [new URL('../tools/audit_all_trains.mjs', import.meta.url).pathname, '--rotations'], { encoding: 'utf8' }));
  assert.ok(report.confirmedRotationTrains > 1000);
  assert.deepEqual(report.rotationDuplicates, []);
  assert.deepEqual(report.rotationExamples, []);
});
