import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rail=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const mapSource=rail.match(/const MAP_LINES = (\{[\s\S]*?\n\});\n\nconst NORTH_MAP_LINE_KEYS/);
assert.ok(mapSource,'MAP_LINES 정의를 찾을 수 없습니다.');
const MAP_LINES=vm.runInNewContext(`(${mapSource[1]})`);

test('남한 경의선 노선도는 서울에서 문산까지 연결된다',()=>{
  assert.equal(MAP_LINES.gyeongui.routes[0].stations.map(s=>s.n).join(','),'서울,행신,일산,문산');
  assert.match(index,/showMapLine\('gyeongui'/);
});

test('북한 철도망은 기존 노선과 추가 노선·동해선 지선을 포함한다',()=>{
  const north=MAP_LINES.north;
  assert.equal(north.northOnly,true);
  assert.deepEqual([...new Set(north.routes.map(r=>r.name))],[
    '경의선','경원선','동해선','평원선','순천선','녕원선','만포선','평성선'
  ]);
  const routes=Object.fromEntries(north.routes.filter(r=>!r.dash).map(r=>[r.name,r.stations.map(s=>s.n)]));
  assert.equal(routes.경의선.at(-1),'문산');
  assert.equal(routes.경원선.at(-1),'철원');
  assert.equal(routes.동해선.at(-1),'간성');
  assert.ok(routes.평원선.includes('북현내'));
  assert.ok(routes.경의선.includes('금천(황해)'));
  assert.ok(routes.동해선.includes('고성(강원)'));
  assert.equal(north.routes.find(r=>r.name==='순천선').stations.map(s=>s.n).join(','),'평원,숙천,순천비행장,성천,신양,양덕,원산');
  assert.equal(north.routes.find(r=>r.name==='녕원선').stations.map(s=>s.n).join(','),'평양,은산,녕원');
  assert.equal(north.routes.find(r=>r.name==='만포선').stations.map(s=>s.n).join(','),'샘물동,강계,성간읍,전천읍,희천제사공장,향산읍,순천비행장,은산');
  assert.equal(north.routes.find(r=>r.name==='평성선').stations.map(s=>s.n).join(','),'평양,강선,강서,남포,은율,송화,장연,태탄,벽성,해주,청단읍,연안읍,금곡리,개성');
  assert.equal(north.routes.find(r=>r.name==='평성선'&&r.dash).stations.map(s=>s.n).join(','),'장연,룡연');
  const donghaeBranches=north.routes.filter(r=>r.name==='동해선'&&r.dash);
  assert.equal(JSON.stringify(donghaeBranches.map(r=>r.stations.map(s=>s.n))),JSON.stringify([['단천','북단천','혜산'],['청진','무산']]));
  assert.doesNotMatch(index,/class="map-line-tab" onclick="showMapLine\('north'/);
  assert.match(index,/data-region-choice="north"/);
});

test('북한 지역도 전체보기와 노선별 지도를 각각 제공한다',()=>{
  assert.match(rail,/const NORTH_MAP_LINE_KEYS=/);
  assert.match(rail,/north_gyeongui/);
  assert.match(rail,/north_suncheon/);
  assert.match(rail,/north_pyeongseong/);
  assert.match(rail,/northBar\.id='north-line-bar'/);
  assert.match(rail,/function showNorthMapLine\(lineKey,button\)/);
  assert.doesNotMatch(rail,/if\(_railRegion==='north'\)showMapLine\('north',null\)/);
});

test('남한 경원선과 지역 전환 설정을 제공한다',()=>{
  assert.equal(MAP_LINES.gyeongwon.routes[0].stations.map(s=>s.n).join(','),'서울,남금호,청량리,의정부,양주,동두천,연천,철원');
  assert.match(rail,/localStorage\.getItem\('nimbi_region'\)/);
  assert.match(rail,/철도 지역/);
  assert.match(index,/sidebar-region-label/);
});

test('지역 전체 선택은 남북 역·노선도·검색을 함께 제공한다',()=>{
  assert.match(index,/data-region-choice="all"/);
  assert.match(rail,/\['south','north','all'\]\.includes\(value\)/);
  assert.match(rail,/if\(_railRegion==='all'\)return true/);
  assert.match(rail,/function _allRegionsAsMapLine\(\)/);
  assert.match(rail,/routes:\[\.\.\._allAsMapLine\(\)\.routes,\.\.\.MAP_LINES\.north\.routes\]/);
  assert.match(rail,/id='all-region-line-bar'/);
  assert.match(rail,/function showRegionAllMapLine\(lineKey,button\)/);
  assert.match(rail,/\['south','남한'\],\['north','북한'\],\['all','전체'\]/);
});

test('남북 동해선은 전체 지역에서 하나의 연속 노선으로 표시된다',()=>{
  assert.match(rail,/MAP_LINES\.donghae_all=/);
  assert.match(rail,/stations:\[\.\.\.northMain\.stations,\.\.\.southMain\.stations\.slice\(1\)\]/);
  assert.match(rail,/combinedKey=key==='donghae'\?'donghae_all':key/);
  assert.match(rail,/filter\(\(\[name\]\)=>name!=='동해선'\)/);
  assert.match(rail,/\{name:'동해선',color:'#3fb994',stations:/);
});

test('남북 전체 노선도는 전 노선 열차 위치를 수집한다',()=>{
  assert.match(rail,/const isAll=_mapCurrentLine==='all'\|\|_mapCurrentLine==='allregions'/);
  assert.match(rail,/const line=isAll\?\{name:'__all__'\}:MAP_LINES\[_mapCurrentLine\]/);
});

test('교외선 순환 계통은 경의선을 함께 병기한다',()=>{
  const context={};
  vm.runInNewContext(`${data}\nthis.trains=ALL_TRAINS`,context);
  const loop=context.trains.filter(t=>Number(t.no)>=4401&&Number(t.no)<=4428);
  assert.equal(loop.length,28);
  assert.ok(loop.every(t=>t.line.includes('교외선')&&t.line.includes('경의선')));
});
