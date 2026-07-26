import fs from'node:fs';import path from'node:path';
const dir=process.argv[2],out=process.argv[3]||'data/nimbi_train_demand.js';
if(!dir)throw Error('node tools/build_demand_source.mjs <DB 폴더> [출력]');
const rows=JSON.parse(fs.readFileSync(path.join(dir,'db5c_stats_trains.json'),'utf8')).trains||[],map={};
for(const r of rows){if(r.period&&r.period!=='lifetime')continue;const m=String(r.name||'').match(/(\d+)(?!.*\d)/),d=+r.trains_departures,p=+r.pax_boarded;if(!m||!(d>0)||!(p>=0))continue;const n=String(+m[1]),v=Math.round(p/d*10)/10;if(!map[n]||d>map[n].d)map[n]={v,d};}
const compact={};Object.keys(map).sort((a,b)=>+a-+b).forEach(n=>compact[n]=map[n].v);
fs.writeFileSync(out,'// DB pax_boarded / trains_departures: 열차 1회 운행당 기본 수요 원천\nvar NIMBI_GAME_PAX_PER_RUN='+JSON.stringify(compact)+';\n');
console.log(Object.keys(compact).length+'개 열차 생성');
