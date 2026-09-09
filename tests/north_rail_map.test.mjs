import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rail=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const mapSource=rail.match(/const MAP_LINES = (\{[\s\S]*?\n\});\n\n\/\/ 인접 역/);
assert.ok(mapSource,'MAP_LINES 정의를 찾을 수 없습니다.');
const MAP_LINES=vm.runInNewContext(`(${mapSource[1]})`);

test('남한 경의선 노선도는 서울에서 문산까지 연결된다',()=>{
  assert.equal(MAP_LINES.gyeongui.routes[0].stations.map(s=>s.n).join(','),'서울,행신,일산,문산');
  assert.match(index,/showMapLine\('gyeongui'/);
});

test('북한 철도망은 네 노선과 남한 경계역을 포함한다',()=>{
  const north=MAP_LINES.north;
  assert.equal(north.northOnly,true);
  assert.equal(north.routes.map(r=>r.name).join(','),'경의선,경원선,동해선,평원선');
  const routes=Object.fromEntries(north.routes.map(r=>[r.name,r.stations.map(s=>s.n)]));
  assert.equal(routes.경의선.at(-1),'문산');
  assert.equal(routes.경원선.at(-1),'철원');
  assert.equal(routes.동해선.at(-1),'간성');
  assert.ok(routes.평원선.includes('북현내'));
  assert.ok(routes.경의선.includes('금천(황해)'));
  assert.ok(routes.동해선.includes('고성(강원)'));
  assert.match(index,/showMapLine\('north'/);
});

test('북한 시간표는 추가하지 않고 교외선 순환 계통에 경의선만 병기한다',()=>{
  const context={};
  vm.runInNewContext(`${data}\nthis.trains=ALL_TRAINS`,context);
  const loop=context.trains.filter(t=>Number(t.no)>=4401&&Number(t.no)<=4428);
  assert.equal(loop.length,28);
  assert.ok(loop.every(t=>t.line.includes('교외선')&&t.line.includes('경의선')));
  assert.equal(context.trains.some(t=>['신의주','평양','원산','경흥'].includes(t.boundary?.[0])||['신의주','평양','원산','경흥'].includes(t.boundary?.[1])),false);
});
