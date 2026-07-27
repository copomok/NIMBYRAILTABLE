import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('data/nimbi_rail_data.js','utf8')};this.trains=ALL_TRAINS;`,context);

const targetNos=new Set(['774',...Array.from({length:20},(_,index)=>String(901+index))]);
const targets=Array.from(context.trains).filter(train=>targetNos.has(String(train.no)));

assert.equal(targets.length,21,'774편과 부산–제주 계통 20편이 모두 존재해야 합니다.');
assert.ok(targets.every(train=>train.grade==='KTX-이음'),'대상 열차는 모두 KTX-이음이어야 합니다.');

const jeju=targets.filter(train=>String(train.no)!=='774');
assert.ok(jeju.every(train=>{
  const origin=train.stops[0]?.s;
  return (origin==='부산'&&train.dest==='제주')||(origin==='제주'&&train.dest==='부산');
}),'901~920편은 부산–제주 왕복 계통이어야 합니다.');

console.log('train grade revision: 774편 및 부산–제주 20편 KTX-이음 전환 검증 완료');
