import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data/nimbi_latest_map.js','data/nimbi_mainline_route_overrides.js','data/nimbi_mainline_map.js'])vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context,{filename:file});
const latest=context.NIMBI_LATEST_MAP,overrides=context.NIMBI_MAINLINE_ROUTE_OVERRIDES,map=context.NIMBI_MAINLINE_MAP;
const route=id=>map.routes.find(item=>item.id===id);
const segment=(id,from,to)=>{const item=route(id),index=item.stations.findIndex((station,i)=>station.name===from&&item.stations[i+1]?.name===to);assert.ok(index>=0,`${id} ${from}-${to} 구간 누락`);return {item,index,geometry:item.routeSegments[index]||item.segments[index]};};
const hasPoint=(geometry,[lon,lat],tolerance=.000002)=>geometry.some(point=>Math.abs(point[0]-lon)<=tolerance&&Math.abs(point[1]-lat)<=tolerance);
const distanceKm=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111.195;
const rawPoints=new Set(latest.tracks.flat().map(([lon,lat])=>`${(+lon).toFixed(6)},${(+lat).toFixed(6)}`));

test('route overrides use the same unmodified game snapshot',()=>{
 assert.equal(overrides.source.sha256,latest.source.sha256);
 assert.equal(map.routeOverrideSource.sha256,latest.source.sha256);
 assert.equal(latest.tracks.length,12980);
 assert.equal(overrides.segments.length,28);
 assert.equal(map.source.routeConfirmedSegments,28);
 assert.equal(map.source.verifiedSegments,175);
 assert.equal(map.source.verifiedTopologyLinkCount,7);
 assert.equal(map.source.verifiedBypassCount,2);
 assert.equal(map.source.passThroughVariantCount,1);
 assert.equal(map.source.syntheticEdgeCount,0);
});

test('Gyeongbu shared corridor preserves the full raw track through Noryangjin, Guro and Gasan',()=>{
 const pairs=[['한강로','남안양'],['남안양','수원'],['수원','오산'],['오산','평택'],['평택','천안']];
 for(const [from,to] of pairs){const {item,index,geometry}=segment('gyeongbu:0',from,to);assert.equal(item.representativeKinds[index],'route-confirmed');assert.ok(geometry.length>=55,`${from}-${to} 원본 좌표가 단순화됨`);assert.ok(geometry.slice(1,-1).every(([lon,lat])=>rawPoints.has(`${(+lon).toFixed(6)},${(+lat).toFixed(6)}`)),`${from}-${to}에 원본 외 선형이 포함됨`);assert.ok(Math.max(...geometry.slice(1).map((point,i)=>distanceKm(geometry[i],point)))<1.6,`${from}-${to} 화면 선형 단절`);}
 const {geometry}=segment('gyeongbu:0','한강로','남안양');
 for(const point of [[126.921536,37.51463],[126.879417,37.498842],[126.886461,37.47135]])assert.ok(hasPoint(geometry,point),`${point} 공용 경부선 좌표 누락`);
});

test('Gyooe route connects Jugyo directly to Haengsin without Neunggok',()=>{
 const item=route('gyooe:0');assert.ok(!item.stations.some(station=>station.name==='능곡'));
 const {index,geometry}=segment('gyooe:0','주교','행신');assert.equal(item.representativeKinds[index],'route-confirmed');assert.ok(geometry.length>10);
});

test('Seoul to Namgeumho uses the north-south intercity platforms',()=>{
 const {item,index,geometry}=segment('gyeongwon:0','서울','남금호');assert.equal(item.representativeKinds[index],'route-confirmed');
 assert.ok(hasPoint(geometry,[126.971424,37.540727]));assert.ok(hasPoint(geometry,[127.000721,37.536615]));assert.ok(!hasPoint(geometry,[126.973871,37.556136]));
});

test('high-speed route corrections retain curves and reject Miryang detour',()=>{
 for(const pair of [['gyeongbuhs:0','병목안','수영'],['gyeongbuhs:0','수영','천안'],['honamhs:0','공주','전주'],['honamhs:0','전주','정읍'],['honamhs:0','정읍','광주']]){const {item,index,geometry}=segment(...pair);assert.equal(item.representativeKinds[index],'route-confirmed');assert.ok(geometry.length>=17,`${pair.slice(1).join('-')} 선형 좌표 부족`);}
 const {item,index,geometry}=segment('gyeongbuhs:0','청도','부산');assert.equal(item.representativeKinds[index],'route-confirmed');
 assert.ok(hasPoint(geometry,[128.748302,35.632936]));assert.ok(hasPoint(geometry,[129.006082,35.395952]));
 assert.ok(!geometry.some(([lon,lat])=>lon<128.85&&lat>35.47&&lat<35.53),'청도-부산 경로가 밀양 정차축으로 내려갑니다.');
});

test('shared metro corridors remain explicit route geometry',()=>{
 for(const name of ['GTX-A','경부선','경의중앙선','장호원선'])assert.ok(map.sharedRailMetroLines.includes(name),`${name} 공유 선로 누락`);
 const srt=map.routeVariants.find(item=>item.grade==='SRT'&&item.from==='잠실'&&item.to==='동탄');
 assert.ok(srt);assert.ok(hasPoint(srt.geometry,[127.1297247,37.3322951]),'SRT 북용인 통과 선로 누락');
 assert.ok(srt.geometry.length>20);assert.equal(srt.sourceVersion,latest.source.sha256);
});

test('Jungbu Naeryuk Osan-Juksan follows the Janghowon corridor',()=>{
 const {item,index,geometry}=segment('jungnaelyuk:0','오산','죽산');assert.equal(item.representativeKinds[index],'route-confirmed');
 for(const point of [[127.08992,37.097729],[127.129916,37.100966],[127.261888,37.081492],[127.369799,37.060829]])assert.ok(hasPoint(geometry,point),`${point} 장호원선 통과점 누락`);
 assert.ok(Math.max(...geometry.slice(1).map((point,i)=>distanceKm(geometry[i],point)))<3.1,'오산-죽산 원본 선로 구간 단절');
});

test('all trains bypass the abandoned Daeyang spur on the shared mainline',()=>{
 const north=segment('nambunaelyuk:0','합천','대양'),south=segment('nambunaelyuk:0','대양','쌍백');
 assert.equal(north.item.representativeKinds[north.index],'route-confirmed');assert.equal(south.item.representativeKinds[south.index],'route-confirmed');
 assert.ok(hasPoint(north.geometry,[128.168063,35.529724]),'합천-대양 공통 본선 누락');
 assert.ok(hasPoint(south.geometry,[128.173139,35.505792]),'대양-쌍백 공통 본선 누락');
 assert.deepEqual(Array.from(north.geometry.at(-1)),Array.from(south.geometry[0]));
 assert.ok(![...north.geometry,...south.geometry].some(point=>hasPoint([point],[128.171444,35.511189])),'대양 폐선 가지가 남음');
 assert.ok(!map.routeVariants.some(item=>item.grade==='KTX-산천'&&['합천','대양'].includes(item.from)&&['대양','쌍백'].includes(item.to)),'공통 본선에 KTX 전용 예외가 남음');
});

test('new junction corrections follow the requested source track pieces',()=>{
 const mapo=segment('gyeongbuhs:4','마포','서울').geometry;
 assert.ok(hasPoint(mapo,[126.939059,37.564233]),'마포-서울 도심 진입 선로 누락');assert.ok(hasPoint(mapo,[126.9714,37.557301]),'마포-서울 남북축 승강장 진입 선로 누락');
 assert.ok(!hasPoint(mapo,[126.969279,37.556158]),'마포-서울 동서축 전철 승강장이 남음');
 assert.ok(!hasPoint(mapo,[126.921294,37.54791]),'마포-서울 용산 우회 선로가 남음');assert.ok(!hasPoint(mapo,[126.928153,37.577274]),'마포-서울 경의선 상부 선로가 남음');
 const mapoEum=map.routeVariants.find(item=>item.grade==='KTX-이음'&&item.from==='마포'&&item.to==='서울');assert.ok(mapoEum);assert.deepEqual(Array.from(mapoEum.geometry,point=>Array.from(point)),Array.from(mapo,point=>Array.from(point)));
 const seoulNamgeumho=segment('gyeongwon:0','서울','남금호').geometry;
 for(const point of [[126.970716,37.550966],[126.971424,37.540727],[126.979654,37.535017]])assert.ok(hasPoint(seoulNamgeumho,point),`${point} 서울역 남북축 일반열차 선로 누락`);
 for(const point of [[126.973871,37.556136],[126.980917,37.554249],[126.986487,37.538873]])assert.ok(!hasPoint(seoulNamgeumho,point),`${point} 서울역 동서축 전철 선로가 남음`);
 const hangang=segment('gyeongbuhs:0','한강로','병목안').geometry;
 assert.ok(hasPoint(hangang,[126.87936,37.498845]),'구로 경부선 경유점 누락');
 const jeongan=segment('gyeongbuhs:0','정안','세종').geometry;
 assert.ok(hasPoint(jeongan,[127.192709,36.513648]));assert.ok(jeongan.slice(1,-1).every(([lon,lat])=>rawPoints.has(`${(+lon).toFixed(6)},${(+lat).toFixed(6)}`)));
 const wonpyeong=segment('gyeongbuhs:2','원평','천안').geometry;
 assert.ok(!hasPoint(wonpyeong,[126.955532,37.231321]),'원평 분기에 수영 방향 되돌이 점이 남음');
 const sacheonSegment=segment('nambunaelyuk:0','단성','사천'),sacheon=sacheonSegment.geometry;
 assert.equal(sacheonSegment.item.representativeKinds[sacheonSegment.index],'exact');
 assert.equal(sacheonSegment.item.routeSegments[sacheonSegment.index],null,'단성-사천이 경로 좌표 덮어쓰기에 의존함');
 assert.deepEqual(Array.from(sacheonSegment.item.segmentTopologyLinks[sacheonSegment.index]),['nambunaelyuk-danseong-sacheon-same-save-recovery']);
 for(const point of [[128.004382,35.104103],[128.026648,35.076733]])assert.ok(hasPoint(sacheon,point),`${point} 단성-사천 직결 단절 양단 누락`);
 assert.ok(!sacheon.some(([lon,lat])=>lon<127.94&&lat<35.2),'단성-사천이 서쪽 삼각선으로 우회함');
 assert.ok(!sacheon.some(([lon,lat])=>lon>128.07&&lat>35.16),'단성-사천이 진주 방향으로 우회함');
});

test('same-save recovery links restore the actual Gangneung, Daegu and Gyooe tracks',()=>{
 const gangneung=segment('donghae:0','강릉','동강릉');assert.equal(gangneung.item.representativeKinds[gangneung.index],'exact');assert.ok(hasPoint(gangneung.geometry,[128.885778,37.739533]));assert.ok(!hasPoint(gangneung.geometry,[128.894021,37.758135]));
 const daegu=segment('daegu:0','경산','건천');assert.equal(daegu.item.representativeKinds[daegu.index],'exact');assert.ok(hasPoint(daegu.geometry,[128.963829,35.806281]));assert.ok(daegu.item.segmentTopologyLinks[daegu.index].includes('daegu-gyeongsan-geoncheon-mainline-junction'));
 const gyooe=route('gyooe:0');for(const [from,to] of [['의정부','가능'],['가능','송추'],['송추','장흥(양주)'],['장흥(양주)','고양']]){const restored=segment('gyooe:0',from,to);assert.equal(restored.item.representativeKinds[restored.index],'exact',`${from}-${to}`);assert.ok(restored.item.segmentTopologyLinks[restored.index].includes('gyooe-uijeongbu-goyang-same-save-recovery'),`${from}-${to}`);}assert.equal(gyooe.representativeKinds[4],'exact');
});

test('non-stopping trains use verified station bypasses and Seoul city HSR',()=>{
 const yeongdong=map.bypassSegments.find(item=>item.id==='sobaek-yeongdong-through-mainline');assert.ok(yeongdong);assert.equal(yeongdong.from,'무주');assert.equal(yeongdong.to,'황간');assert.ok(hasPoint(yeongdong.geometry,[127.793238,36.171838]));assert.ok(!hasPoint(yeongdong.geometry,[127.780379,36.174695]));
 const pyeongchang=map.bypassSegments.find(item=>item.id==='jeongseon-pyeongchang-south-through-mainline');assert.ok(pyeongchang);assert.deepEqual(Array.from(pyeongchang.via),['남횡성','방림','평창','북평(정선)']);assert.ok(hasPoint(pyeongchang.geometry,[128.462296,37.464555]));assert.ok(!hasPoint(pyeongchang.geometry,[128.460107,37.495142]));
 const city=map.passThroughVariants[0];assert.deepEqual([city.from,city.via,city.to],['서울','한강로','병목안']);assert.ok(hasPoint(city.geometry,[126.917462,37.501305]));assert.ok(!hasPoint(city.geometry,[126.87936,37.498845]));
});

test('Jungang trains use the verified Geumseong-Hwabon mainline',()=>{
 const geumseong=segment('jungang:0','금성','이화'),hwabon=segment('jungang:0','이화','화본');assert.equal(geumseong.item.representativeKinds[geumseong.index],'route-confirmed');assert.equal(hwabon.item.representativeKinds[hwabon.index],'route-confirmed');
 for(const point of [[128.675327,36.228993],[128.705686,36.178511],[128.711627,36.133646]])assert.ok(hasPoint([...geumseong.geometry,...hwabon.geometry],point),`${point} 중앙선 본선 좌표 누락`);
 for(const point of [[128.721492,36.170502],[128.696073,36.115641]])assert.ok(!hasPoint(hwabon.geometry,point),`${point} 화본 남쪽 분기 우회가 남음`);
 const city=map.passThroughVariants.find(item=>item.id==='seoul-byeongmokan-city-hsr-via-hangangro-pass');assert.ok(hasPoint(city.geometry,[126.896959,37.376851]));assert.ok(!hasPoint(city.geometry,[126.891416,37.376859]));assert.ok(!hasPoint(city.geometry,[126.90716,37.371245]));
});
