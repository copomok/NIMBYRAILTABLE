import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let source='';
for(const file of [
  'data/nimbi_rail_data.js',
  'data/nimbi_north_ingame_routes.js',
  'data/nimbi_north_station_revision.js',
  'data/nimbi_north_rail_revision.js',
  'data/nimbi_gonam_itx_revision.js',
  'data/nimbi_realplat.js',
  'data/nimbi_regional_platforms.js'
])source+=fs.readFileSync(file,'utf8')+'\n';
source+=';globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT;';
const context={};
vm.createContext(context);
vm.runInContext(source,context);
const trains=context.__trains;
const platforms=context.__platforms;

test('장항선 무궁화호 아산~광천 승강장은 인게임 방향별 원본을 따른다',()=>{
  const expected={
    down:{아산:3,예산:2,홍북:1,홍성:1,광천:3},
    up:{아산:4,예산:1,홍북:2,홍성:2,광천:4}
  };
  const targets=trains.filter(train=>{
    const no=Number(train.no);
    return no>=1461&&no<=1490&&train.grade==='무궁화호';
  });
  assert.equal(targets.length,26);
  for(const train of targets)for(const [station,platform] of Object.entries(expected[train.dir])){
    assert.equal(platforms[train.no]?.[station],platform,`#${train.no} ${station}`);
    assert.equal(train.stops.find(stop=>stop.s===station)?.p,String(platform),`#${train.no} ${station} stop`);
  }
});

test('서산역은 계통과 방향에 맞는 인게임 승강장을 사용한다',()=>{
  for(const train of trains.filter(train=>train.stops.some(stop=>stop.s==='서산'))){
    const no=Number(train.no);
    const expected=no>=221&&no<=230?(train.dir==='up'?4:5):(train.dir==='up'?1:2);
    assert.equal(platforms[train.no]?.서산,expected,`#${train.no}`);
    assert.equal(train.stops.find(stop=>stop.s==='서산')?.p,String(expected),`#${train.no} stop`);
  }
});
