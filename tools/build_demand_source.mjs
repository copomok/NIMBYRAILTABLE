import fs from'node:fs';import path from'node:path';
const dir=process.argv[2],out=process.argv[3]||'data/nimbi_train_demand.js';
if(!dir)throw Error('node tools/build_demand_source.mjs <DB 폴더> [출력]');
const rows=JSON.parse(fs.readFileSync(path.join(dir,'db5c_stats_trains.json'),'utf8')).trains||[],map={};
for(const r of rows){if(r.period&&r.period!=='lifetime')continue;const m=String(r.name||'').match(/(\d+)(?!.*\d)/),d=+r.trains_departures,p=+r.pax_boarded;if(!m||!(d>0)||!(p>=0))continue;const n=String(+m[1]),v=Math.round(p/d*10)/10;if(!map[n]||d>map[n].d)map[n]={v,d};}
const compact={};Object.keys(map).sort((a,b)=>+a-+b).forEach(n=>compact[n]=map[n].v);
const lineRows=JSON.parse(fs.readFileSync(path.join(dir,'db5a_stats_company_lines.json'),'utf8')).lines||[],lineMap={};
for(const r of lineRows){if(r.period&&r.period!=='lifetime')continue;const name=String(r.name||'').trim(),d=+r.trains_departures,p=+r.pax_boarded;if(!name||!(d>0)||!(p>=0))continue;const v=Math.round(p/d*10)/10;if(!lineMap[name]||d>lineMap[name].d)lineMap[name]={v,d};}
const compactLines={};Object.keys(lineMap).sort((a,b)=>a.localeCompare(b,'ko')).forEach(name=>compactLines[name]=lineMap[name].v);
fs.writeFileSync(out,'// 인게임 DB의 승차 인원 / 운행 횟수 기반 1회 운행 수요 원천\nvar NIMBI_GAME_PAX_PER_RUN='+JSON.stringify(compact)+';\nvar NIMBI_GAME_ROUTE_PAX_PER_RUN='+JSON.stringify(compactLines)+';\n');
console.log(`${Object.keys(compact).length}개 열차 · ${Object.keys(compactLines).length}개 운행 계통 생성`);
