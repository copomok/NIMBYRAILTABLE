import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data/nimbi_latest_map.js','data/nimbi_mainline_route_overrides.js','data/nimbi_mainline_map.js'])vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context,{filename:file});
const latest=context.NIMBI_LATEST_MAP,overrides=context.NIMBI_MAINLINE_ROUTE_OVERRIDES,map=context.NIMBI_MAINLINE_MAP;
const route=id=>map.routes.find(item=>item.id===id);
const segment=(id,from,to)=>{const item=route(id),index=item.stations.findIndex((station,i)=>station.name===from&&item.stations[i+1]?.name===to);assert.ok(index>=0,`${id} ${from}-${to} 구간 누락`);return {item,index,geometry:item.routeSegments[index]};};
const hasPoint=(geometry,[lon,lat],tolerance=.000002)=>geometry.some(point=>Math.abs(point[0]-lon)<=tolerance&&Math.abs(point[1]-lat)<=tolerance);

test('route overrides use the same unmodified game snapshot',()=>{
 assert.equal(overrides.source.sha256,latest.source.sha256);
 assert.equal(map.routeOverrideSource.sha256,latest.source.sha256);
 assert.equal(latest.tracks.length,12980);
 assert.equal(overrides.segments.length,13);
 assert.equal(map.source.routeConfirmedSegments,13);
 assert.equal(map.source.syntheticEdgeCount,0);
});

test('Gyeongbu shared corridor follows Noryangjin, Guro and Gasan',()=>{
 const {item,index,geometry}=segment('gyeongbu:0','한강로','남안양');
 assert.equal(item.representativeKinds[index],'route-confirmed');
 for(const point of [[126.922419,37.514295],[126.882025,37.503095],[126.887606,37.468911]])assert.ok(hasPoint(geometry,point),`${point} 공용 경부선 좌표 누락`);
});

test('Gyooe route connects Jugyo directly to Haengsin without Neunggok',()=>{
 const item=route('gyooe:0');assert.ok(!item.stations.some(station=>station.name==='능곡'));
 const {index,geometry}=segment('gyooe:0','주교','행신');assert.equal(item.representativeKinds[index],'route-confirmed');assert.ok(geometry.length>10);
});

test('Seoul to Namgeumho follows the Gyeongui-Jungang corridor',()=>{
 const {item,index,geometry}=segment('gyeongwon:0','서울','남금호');assert.equal(item.representativeKinds[index],'route-confirmed');
 assert.ok(hasPoint(geometry,[126.987302,37.535221]));assert.ok(hasPoint(geometry,[127.000721,37.536615]));
});

test('high-speed route corrections retain curves and reject Miryang detour',()=>{
 for(const pair of [['gyeongbuhs:0','병목안','수영'],['gyeongbuhs:0','수영','천안'],['honamhs:0','공주','전주'],['honamhs:0','전주','정읍'],['honamhs:0','정읍','광주']]){const {item,index,geometry}=segment(...pair);assert.equal(item.representativeKinds[index],'route-confirmed');assert.ok(geometry.length>=17,`${pair.slice(1).join('-')} 선형 좌표 부족`);}
 const {item,index,geometry}=segment('gyeongbuhs:0','청도','부산');assert.equal(item.representativeKinds[index],'route-confirmed');
 assert.ok(hasPoint(geometry,[128.748302,35.632936]));assert.ok(hasPoint(geometry,[129.006082,35.395952]));
 assert.ok(!geometry.some(([lon,lat])=>lon<128.85&&lat>35.47&&lat<35.53),'청도-부산 경로가 밀양 정차축으로 내려갑니다.');
});
