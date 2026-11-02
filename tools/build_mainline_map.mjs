import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={console};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data/nimbi_station_data.js','data/nimbi_latest_map.js','data/nimbi_homonyms.js','data/nimbi_nyongwon_20261027_stations.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
vm.runInContext('globalThis.__stationDB=STATION_DB',context);

const source=fs.readFileSync(path.join(root,'js/nimbi_rail.js'),'utf8'),start=source.indexOf('const MAP_LINES ='),end=source.indexOf('\nconst NORTH_MAP_LINE_KEYS',start);
if(start<0||end<0)throw new Error('js/nimbi_rail.js에서 MAP_LINES 원본을 찾지 못했습니다.');
const lines=vm.runInContext(`(${source.slice(start+'const MAP_LINES ='.length,end).trim().replace(/;$/,'')})`,context,{filename:'MAP_LINES'}),stationDB=context.__stationDB,latest=context.NIMBI_LATEST_MAP;
const primaryAliases={'신동(태백)':'신동','고성(강원)':'고성'};
const coordinate=name=>{const alias=primaryAliases[name]||name,row=stationDB[`${alias}역`]||stationDB[alias]||stationDB[`${name}역`]||stationDB[name];if(row&&Number.isFinite(+row.lon)&&Number.isFinite(+row.lat))return {lon:+row.lon,lat:+row.lat};const raw=(latest?.stations||[]).find(item=>item.name===name||item.name===alias);return raw?{lon:+raw.lon,lat:+raw.lat}:null;};
const distance=(a,b)=>{const scale=Math.cos((a.lat+b.lat)*Math.PI/360),dx=(b.lon-a.lon)*scale,dy=b.lat-a.lat;return Math.hypot(dx,dy)*111.195;};
const segmentDistance=(point,a,b)=>{const scale=Math.cos((a.lat+b.lat+point.lat)*Math.PI/540),ax=a.lon*scale,bx=b.lon*scale,px=point.lon*scale,dx=bx-ax,dy=b.lat-a.lat,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((px-ax)*dx+(point.lat-a.lat)*dy)/den)):0;return Math.hypot(px-(ax+t*dx),point.lat-(a.lat+t*dy))*111.195;};

// The save extractor already reconstructed traversable edges from track-point refs.
// Only identical source vertices are joined here. Nearby endpoints, crossings and
// parallel tracks are deliberately never snapped or merged (a ~5 m gap is not proof).
function buildExactGraph(tracks){
 const nodes=[],ids=new Map(),grid=new Map(),cell=.0125;
 const add=raw=>{const [lon,lat]=raw,key=`${(+lon).toFixed(6)},${(+lat).toFixed(6)}`;if(ids.has(key))return ids.get(key);const id=nodes.length,node={lon:+lon,lat:+lat,links:[]};nodes.push(node);ids.set(key,id);const bucket=`${Math.floor(node.lon/cell)},${Math.floor(node.lat/cell)}`;(grid.get(bucket)||grid.set(bucket,[]).get(bucket)).push(id);return id;};
 for(const [sourcePath,path] of (tracks||[]).entries())for(let i=1;i<path.length;i++){const a=add(path[i-1]),b=add(path[i]);if(a===b)continue;const length=distance(nodes[a],nodes[b]);nodes[a].links.push({to:b,length,sourcePath});nodes[b].links.push({to:a,length,sourcePath});}
 const parent=Int32Array.from(nodes,(_,index)=>index),find=value=>{while(parent[value]!==value){parent[value]=parent[parent[value]];value=parent[value];}return value;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};for(let id=0;id<nodes.length;id++)for(const link of nodes[id].links)join(id,link.to);for(let id=0;id<nodes.length;id++)nodes[id].component=find(id);
 const anchors=coord=>{const cx=Math.floor(coord.lon/cell),cy=Math.floor(coord.lat/cell),byComponent=new Map();for(let radius=0;radius<=3;radius++)for(let x=cx-radius;x<=cx+radius;x++)for(let y=cy-radius;y<=cy+radius;y++){if(radius&&x>cx-radius&&x<cx+radius&&y>cy-radius&&y<cy+radius)continue;for(const id of grid.get(`${x},${y}`)||[]){const current=distance(coord,nodes[id]);if(current>2)continue;const component=nodes[id].component,known=byComponent.get(component);if(!known||current<known.distance)byComponent.set(component,{id,distance:current,component});}}return [...byComponent.values()].sort((a,b)=>a.distance-b.distance);};
 return {nodes,anchors};
}

const graph=buildExactGraph(latest?.tracks),routeCache=new Map(),diagnostics={noAnchor:0,noCommonComponent:0,ambiguousComponent:0,sameAnchor:0,noPath:0,detour:0,verified:0};
function simplifyRange(points,tolerance){if(points.length<=2)return points;const keep=new Uint8Array(points.length),stack=[[0,points.length-1]];keep[0]=keep[points.length-1]=1;while(stack.length){const [a,b]=stack.pop();let best=0,index=-1;for(let i=a+1;i<b;i++){const current=segmentDistance(points[i],points[a],points[b]);if(current>best){best=current;index=i;}}if(best>tolerance){keep[index]=1;stack.push([a,index],[index,b]);}}return points.filter((_,index)=>keep[index]);}
function simplifyProtected(ids,tolerance=.025){const protectedAt=[0];for(let i=1;i<ids.length-1;i++)if(graph.nodes[ids[i]].links.length!==2)protectedAt.push(i);protectedAt.push(ids.length-1);const result=[];for(let i=1;i<protectedAt.length;i++){const part=simplifyRange(ids.slice(protectedAt[i-1],protectedAt[i]+1).map(id=>graph.nodes[id]),tolerance);result.push(...(result.length?part.slice(1):part));}return result;}
function verifiedTrackRoute(from,to){
 const forwardKey=`${from.lon},${from.lat}|${to.lon},${to.lat}`,reverseKey=`${to.lon},${to.lat}|${from.lon},${from.lat}`;if(routeCache.has(forwardKey))return routeCache.get(forwardKey);if(routeCache.has(reverseKey)){const cached=routeCache.get(reverseKey);return cached?{...cached,geometry:[...cached.geometry].reverse()}:null;}
 const starts=graph.anchors(from),ends=graph.anchors(to);if(!starts.length||!ends.length){diagnostics.noAnchor++;routeCache.set(forwardKey,null);return null;}const endByComponent=new Map(ends.map(anchor=>[anchor.component,anchor])),pairs=starts.filter(anchor=>endByComponent.has(anchor.component)).map(start=>({start,end:endByComponent.get(start.component)}));if(!pairs.length){diagnostics.noCommonComponent++;routeCache.set(forwardKey,null);return null;}if(pairs.length!==1){diagnostics.ambiguousComponent++;routeCache.set(forwardKey,null);return null;}const {start,end}=pairs[0];if(start.id===end.id){diagnostics.sameAnchor++;routeCache.set(forwardKey,null);return null;}
 const direct=Math.max(.1,distance(from,to)),corridor=Math.max(1.2,Math.min(10,direct*.35)),dist=new Float64Array(graph.nodes.length),previous=new Int32Array(graph.nodes.length),previousSource=new Int32Array(graph.nodes.length),heap=[];dist.fill(Infinity);previous.fill(-1);previousSource.fill(-1);
 const push=item=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;},pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1][0]<heap[child][0])child++;if(heap[child][0]>=last[0])break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
 dist[start.id]=0;push([distance(graph.nodes[start.id],graph.nodes[end.id]),0,start.id]);let visited=0;while(heap.length&&visited++<graph.nodes.length){const [,cost,id]=pop();if(cost!==dist[id])continue;if(id===end.id)break;for(const link of graph.nodes[id].links){if(link.to!==end.id&&segmentDistance(graph.nodes[link.to],from,to)>corridor)continue;const value=cost+link.length;if(value>=dist[link.to])continue;dist[link.to]=value;previous[link.to]=id;previousSource[link.to]=link.sourcePath;push([value+distance(graph.nodes[link.to],graph.nodes[end.id]),value,link.to]);}}
 if(!Number.isFinite(dist[end.id])){diagnostics.noPath++;routeCache.set(forwardKey,null);return null;}if(dist[end.id]>Math.min(direct*2.5,direct+18)){diagnostics.detour++;routeCache.set(forwardKey,null);return null;}
 const ids=[],sources=new Set();for(let id=end.id;id>=0;id=previous[id]){ids.push(id);if(previousSource[id]>=0)sources.add(previousSource[id]);if(id===start.id)break;}if(ids.at(-1)!==start.id){diagnostics.noPath++;routeCache.set(forwardKey,null);return null;}ids.reverse();const geometry=simplifyProtected(ids),length=ids.slice(1).reduce((sum,id,index)=>sum+distance(graph.nodes[ids[index]],graph.nodes[id]),0),result={geometry,sourcePaths:[...sources].sort((a,b)=>a-b),length,anchorDistance:[start.distance,end.distance]};diagnostics.verified++;routeCache.set(forwardKey,result);return result;
}

const routes=[];let verifiedSegments=0,unverifiedSegments=0;
for(const [key,line] of Object.entries(lines))for(const [routeIndex,route] of (line.routes||[]).entries()){
 const stations=(route.stations||[]).map(station=>{const coord=coordinate(station.n);if(!coord)throw new Error(`${line.name}: ${station.n}의 실제 좌표를 찾지 못했습니다.`);return {name:station.n,...coord};});
 if(stations.length<2)continue;const segments=[],segmentSources=[];
 for(let i=1;i<stations.length;i++){const match=verifiedTrackRoute(stations[i-1],stations[i]);if(!match){segments.push(null);segmentSources.push([]);unverifiedSegments++;continue;}segments.push(match.geometry.map(point=>[+point.lon.toFixed(6),+point.lat.toFixed(6)]));segmentSources.push(match.sourcePaths);verifiedSegments++;}
 routes.push({id:`${key}:${routeIndex}`,line:line.name,name:route.name||line.name,color:route.color||line.color||'#64748b',north:key==='north',stations,segments,segmentSources,unverifiedSegments:segments.map((segment,index)=>segment?null:index).filter(index=>index!==null)});
}
const stationCount=new Set(routes.flatMap(route=>route.stations.map(station=>station.name))).size,edgeCount=new Set(routes.flatMap(route=>route.stations.slice(1).map((station,index)=>[route.stations[index].name,station.name].sort().join('\0')))).size,sourceVersion=latest?.source?.sha256||'unknown';
const usedPaths=[...new Set(routes.flatMap(route=>route.segmentSources.flat()))].sort((a,b)=>a-b),pathIds=usedPaths.map(lineIndex=>({sourceVersion,featureIndex:0,lineIndex,coordinateHash:crypto.createHash('sha256').update(JSON.stringify(latest.tracks[lineIndex])).digest('hex').slice(0,16)}));
const payload={source:{kind:'nimby-map-lines-exact-topology',mainlineOnly:true,detail:'verified-source-edges-simplified-after-routing',sourceVersion,lineCount:Object.keys(lines).length,routeCount:routes.length,stationCount,edgeCount,verifiedSegments,unverifiedSegments,simplifyToleranceMeters:25,syntheticEdgeCount:0},sourceGeometry:{featureIndex:0,pathIds},routes};
fs.writeFileSync(path.join(root,'data/nimbi_mainline_map.js'),`/* Generated from MAP_LINES and save-file track refs. No proximity or synthetic edges. METRO_LINES is excluded. */\nwindow.NIMBI_MAINLINE_MAP=Object.freeze(${JSON.stringify(payload)});\n`);
console.log(`일반철도 노선도 생성: ${verifiedSegments}개 검증 구간, ${unverifiedSegments}개 미확인 구간, 합성 연결 0개`);console.log(diagnostics);
