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
const segmentDistance=(point,a,b)=>{const scale=Math.cos((a.lat+b.lat+point.lat)*Math.PI/540),ax=a.lon*scale,bx=b.lon*scale,px=point.lon*scale,dx=bx-ax,dy=b.lat-a.lat,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((px-ax)*dx+(point.lat-a.lat)*dy)/den)):0;return {distance:Math.hypot(px-(ax+t*dx),point.lat-(a.lat+t*dy))*111.195,t};};

function buildTrackGraph(tracks){
 const nodes=[],ids=new Map(),grid=new Map(),endpoints=new Set(),cell=.0125;
 const add=raw=>{const [lon,lat]=raw,key=`${(+lon).toFixed(6)},${(+lat).toFixed(6)}`;if(ids.has(key))return ids.get(key);const id=nodes.length,node={lon:+lon,lat:+lat,links:[]};nodes.push(node);ids.set(key,id);const bucket=`${Math.floor(node.lon/cell)},${Math.floor(node.lat/cell)}`;(grid.get(bucket)||grid.set(bucket,[]).get(bucket)).push(id);return id;};
 for(const path of tracks||[]){if(path.length<2)continue;endpoints.add(add(path[0]));endpoints.add(add(path.at(-1)));for(let i=1;i<path.length;i++){const a=add(path[i-1]),b=add(path[i]);if(a===b)continue;const length=distance(nodes[a],nodes[b]);nodes[a].links.push([b,length,false]);nodes[b].links.push([a,length,false]);}}
 const parent=Int32Array.from(nodes,(_,i)=>i),size=new Uint32Array(nodes.length);size.fill(1);const find=value=>{while(parent[value]!==value){parent[value]=parent[parent[value]];value=parent[value];}return value;},join=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(size[a]<size[b])[a,b]=[b,a];parent[b]=a;size[a]+=size[b];};for(let id=0;id<nodes.length;id++)for(const [next] of nodes[id].links)join(id,next);
 for(const id of endpoints){const point=nodes[id],cx=Math.floor(point.lon/cell),cy=Math.floor(point.lat/cell),candidates=new Map();for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const other of grid.get(`${x},${y}`)||[]){if(other===id||find(other)===find(id))continue;const d=distance(point,nodes[other]),root=find(other),known=candidates.get(root);if(d<=.8&&(!known||d<known.distance))candidates.set(root,{id:other,distance:d});}for(const candidate of [...candidates.values()].sort((a,b)=>a.distance-b.distance).slice(0,2)){nodes[id].links.push([candidate.id,candidate.distance,true]);nodes[candidate.id].links.push([id,candidate.distance,true]);}}
 const nearest=coord=>{const cx=Math.floor(coord.lon/cell),cy=Math.floor(coord.lat/cell);let best=-1,bestDistance=Infinity;for(let radius=0;radius<=4;radius++)for(let x=cx-radius;x<=cx+radius;x++)for(let y=cy-radius;y<=cy+radius;y++){if(radius&&x>cx-radius&&x<cx+radius&&y>cy-radius&&y<cy+radius)continue;for(const id of grid.get(`${x},${y}`)||[]){const d=distance(coord,nodes[id]);if(d<bestDistance){best=id;bestDistance=d;}}}return best>=0&&bestDistance<=5?best:-1;};
 return {nodes,grid,cell,nearest};
}

const graph=buildTrackGraph(latest?.tracks),shapeCache=new Map();
function simplify(points,tolerance=.22){
 if(points.length<=2)return points;const keep=new Uint8Array(points.length),stack=[[0,points.length-1]];keep[0]=keep[points.length-1]=1;while(stack.length){const [a,b]=stack.pop();let best=0,index=-1;for(let i=a+1;i<b;i++){const d=segmentDistance(points[i],points[a],points[b]).distance;if(d>best){best=d;index=i;}}if(best>tolerance){keep[index]=1;stack.push([a,index],[index,b]);}}let result=points.filter((_,i)=>keep[i]);if(result.length>28){const sampled=[result[0]];for(let i=1;i<27;i++)sampled.push(result[Math.round(i*(result.length-1)/27)]);sampled.push(result.at(-1));result=sampled;}return result;
}
function cloudFallback(from,to){
 const direct=distance(from,to),corridor=Math.max(1.5,Math.min(10,direct*.3)),bins=Array.from({length:7},()=>[]),nodes=graph.nodes;for(const point of nodes){const hit=segmentDistance(point,from,to);if(hit.t<=.03||hit.t>=.97||hit.distance>corridor)continue;const bin=Math.min(6,Math.floor(hit.t*7));bins[bin].push({point,hit});}
 const result=[from];for(let i=0;i<bins.length;i++){const target=(i+.5)/bins.length,candidate=bins[i].sort((a,b)=>(Math.abs(a.hit.t-target)*direct+a.hit.distance*.35)-(Math.abs(b.hit.t-target)*direct+b.hit.distance*.35))[0];if(candidate)result.push(candidate.point);}result.push(to);return simplify(result,.3);
}
function trackShape(from,to){
 const key=[`${from.lon},${from.lat}`,`${to.lon},${to.lat}`].sort().join('|');if(shapeCache.has(key)){const cached=shapeCache.get(key),forward=cached[0].lon===from.lon&&cached[0].lat===from.lat;return forward?cached:[...cached].reverse();}
 const start=graph.nearest(from),end=graph.nearest(to),direct=Math.max(.1,distance(from,to));let result=null;
 if(start>=0&&end>=0){const corridor=Math.max(2.5,Math.min(18,direct*.45)),dist=new Float64Array(graph.nodes.length),previous=new Int32Array(graph.nodes.length),heap=[];dist.fill(Infinity);previous.fill(-1);const push=item=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;},pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};dist[start]=0;push([distance(graph.nodes[start],graph.nodes[end]),0,start]);let visited=0;while(heap.length&&visited++<graph.nodes.length){const [,cost,id]=pop();if(cost!==dist[id])continue;if(id===end)break;for(const [next,length,bridge] of graph.nodes[id].links){if(next!==end&&segmentDistance(graph.nodes[next],from,to).distance>corridor)continue;const value=cost+length*(bridge?1.2:1);if(value>=dist[next])continue;dist[next]=value;previous[next]=id;push([value+distance(graph.nodes[next],graph.nodes[end]),value,next]);}}
  if(Number.isFinite(dist[end])&&dist[end]<=Math.min(direct*3,direct+24)){const points=[];for(let id=end;id>=0;id=previous[id]){points.push(graph.nodes[id]);if(id===start)break;}if(points.at(-1)===graph.nodes[start]){points.reverse();result=simplify([from,...points,to]);}}
 }
 if(!result||result.length<3)result=cloudFallback(from,to);let length=0;for(let i=1;i<result.length;i++)length+=distance(result[i-1],result[i]);if(length>Math.min(direct*3,direct+24))result=[from,to];const stored=result.map(point=>({lon:+point.lon,lat:+point.lat}));shapeCache.set(key,stored);return stored;
}

const routes=[];let shapedSegments=0;
for(const [key,line] of Object.entries(lines))for(const [routeIndex,route] of (line.routes||[]).entries()){
 const stations=(route.stations||[]).map(station=>{const coord=coordinate(station.n);if(!coord)throw new Error(`${line.name}: ${station.n}의 실제 좌표를 찾지 못했습니다.`);return {name:station.n,...coord};});
 if(stations.length>1){const segments=stations.slice(1).map((station,index)=>trackShape(stations[index],station).map(point=>[+point.lon.toFixed(6),+point.lat.toFixed(6)]));shapedSegments+=segments.filter(segment=>segment.length>2).length;routes.push({id:`${key}:${routeIndex}`,line:line.name,name:route.name||line.name,color:route.color||line.color||'#64748b',north:key==='north',stations,segments});}
}
const stationCount=new Set(routes.flatMap(route=>route.stations.map(station=>station.name))).size,edgeCount=new Set(routes.flatMap(route=>route.stations.slice(1).map((station,index)=>[route.stations[index].name,station.name].sort().join('\0')))).size;
const payload={source:{kind:'nimby-map-lines',mainlineOnly:true,detail:'simplified-track-shaped-segments',lineCount:Object.keys(lines).length,routeCount:routes.length,stationCount,edgeCount,shapedSegments,simplifyToleranceMeters:220},routes};
fs.writeFileSync(path.join(root,'data/nimbi_mainline_map.js'),`/* Generated from MAP_LINES; raw tracks shape segments at build time. METRO_LINES is excluded. */\nwindow.NIMBI_MAINLINE_MAP=Object.freeze(${JSON.stringify(payload)});\n`);
console.log(`일반철도 노선도 생성: ${routes.length}개 경로, ${stationCount}개 역, ${edgeCount}개 인접역 구간, ${shapedSegments}개 곡선 구간`);
