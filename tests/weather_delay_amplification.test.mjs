import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/features/nimbi_delay.js',import.meta.url),'utf8');
const start=source.indexOf('function _wxConfig');
const end=source.indexOf('function _wxClassify',start);
assert.ok(start>=0&&end>start,'기상 설정 함수를 찾을 수 있어야 한다');
const context={};
vm.createContext(context);
vm.runInContext(`${source.slice(start,end)};globalThis.config=_wxConfig`,context);

test('악천후가 심할수록 발생 확률·지연 폭은 커지고 회복력은 낮아진다',()=>{
  const clear=context.config('맑음');
  const rain=context.config('비');
  const heavy=context.config('폭우');
  const typhoon=context.config('태풍');
  assert.deepEqual({prob:clear.probMult,mag:clear.magMult,rec:clear.recW},{prob:1,mag:1,rec:1});
  assert.ok(rain.probMult>clear.probMult&&heavy.probMult>rain.probMult&&typhoon.probMult>heavy.probMult);
  assert.ok(rain.magMult>clear.magMult&&heavy.magMult>rain.magMult&&typhoon.magMult>heavy.magMult);
  assert.ok(rain.recW<clear.recW&&heavy.recW<rain.recW&&typhoon.recW<heavy.recW);
  assert.ok(rain.bigCap>clear.bigCap&&heavy.bigCap>rain.bigCap&&typhoon.bigCap>heavy.bigCap);
});

test('기상 강도는 열차 단위와 구간 단위 발생 확률에 모두 추가 반영된다',()=>{
  assert.match(source,/weatherProbBoost/);
  assert.match(source,/weatherEventBoost/);
  assert.match(source,/Math\.min\(98,/);
  assert.match(source,/Math\.min\(\.92,/);
});
