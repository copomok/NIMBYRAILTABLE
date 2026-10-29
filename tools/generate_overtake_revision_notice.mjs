import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPORT=path.join(ROOT,'reports','2026-10-29-overtake-retimings.md');
const TARGET=path.join(ROOT,'assets','notices','20261029-overtake-retimings-full.svg');
const DATA_FILES=[
  'nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js',
  'nimbi_north_station_revision.js','nimbi_north_rail_revision.js',
  'nimbi_gonam_itx_revision.js','nimbi_pass_stations_revision.js',
  'nimbi_20261027_revision.js','nimbi_realplat.js','nimbi_homonyms.js',
  'nimbi_regional_platforms.js','nimbi_gyeongui_20261027_revision.js',
  'nimbi_nyongwon_20261027_stations.js','nimbi_global_schedule_revision.js'
];

const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[character]));
const formatTime=value=>String(value??'').replace(/^0(?=\d:)/,'');

function loadGrades(){
  const context={};
  vm.createContext(context);
  for(const file of DATA_FILES){
    vm.runInContext(fs.readFileSync(path.join(ROOT,'data',file),'utf8'),context,{filename:file});
  }
  vm.runInContext('globalThis.__NOTICE_TRAINS__=ALL_TRAINS;',context);
  return new Map(Array.from(context.__NOTICE_TRAINS__||[]).map(train=>[String(train.no),String(train.grade)]));
}

function parseReport(){
  const source=fs.readFileSync(REPORT,'utf8');
  return [...source.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([+-]?\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)]
    .map(match=>{
      const route=match[2].replaceAll('–',' → ');
      const [origin,destination]=route.split(/\s*→\s*/);
      if(!origin||!destination)throw new Error(`착발역을 분리할 수 없습니다: ${route}`);
      return {
        no:match[1],route,origin,destination,
        oldDeparture:formatTime(match[3]),newDeparture:formatTime(match[4]),delta:Number(match[5])
      };
    });
}

const gradeColor=grade=>({
  KTX:'#1f5cb8','KTX-산천':'#6639a6','KTX-이음':'#274f9d',SRT:'#8b1e4f',
  'ITX-새마을':'#d52d45','ITX-마음':'#e15a2b','ITX-청춘':'#15955f',
  '무궁화호':'#e16425','국악와인':'#343d68','남도해양':'#1688aa'
}[grade]||'#2456a6');

const GRADE_ORDER=['KTX','KTX-산천','KTX-이음','SRT','ITX-새마을','ITX-마음','ITX-청춘','무궁화호','국악와인','남도해양'];
const rows=parseReport();
const grades=loadGrades();
if(rows.length!==457)throw new Error(`보고서 변경 열차는 457편이어야 합니다: ${rows.length}`);
if(new Set(rows.map(row=>row.no)).size!==rows.length)throw new Error('보고서에 중복 열차번호가 있습니다.');
const missing=rows.filter(row=>!grades.has(row.no));
if(missing.length)throw new Error(`열차등급을 찾을 수 없습니다: ${missing.map(row=>row.no).join(', ')}`);
for(const row of rows)row.grade=grades.get(row.no);

const expectedGrades={KTX:49,'KTX-산천':55,'KTX-이음':60,SRT:17,'ITX-새마을':91,'ITX-마음':42,'ITX-청춘':24,'무궁화호':113,'국악와인':4,'남도해양':2};
const actualGrades=rows.reduce((counts,row)=>(counts[row.grade]=(counts[row.grade]||0)+1,counts),{});
for(const [grade,count] of Object.entries(expectedGrades)){
  if(actualGrades[grade]!==count)throw new Error(`${grade} 변경 편수 불일치: ${actualGrades[grade]} / ${count}`);
}

const groupMap=new Map();
for(const row of rows){
  const key=`${row.grade}\u0000${row.route}`;
  if(!groupMap.has(key))groupMap.set(key,{grade:row.grade,route:row.route,rows:[]});
  groupMap.get(key).rows.push(row);
}
const groups=[...groupMap.values()].sort((a,b)=>{
  const gradeDifference=GRADE_ORDER.indexOf(a.grade)-GRADE_ORDER.indexOf(b.grade);
  return gradeDifference||a.route.localeCompare(b.route,'ko');
});
if(groups.length!==136)throw new Error(`변경 계통은 136개여야 합니다: ${groups.length}`);

const W=1440,margin=48,gap=24,columnW=(W-margin*2-gap)/2;
const sectionH=38,headH=34,rowH=30,blockGap=14;
const blockHeight=group=>sectionH+headH+group.rows.length*rowH+blockGap;
const totalHeight=groups.reduce((sum,group)=>sum+blockHeight(group),0);
let splitIndex=1,runningHeight=0,bestDifference=Number.POSITIVE_INFINITY;
for(let index=1;index<groups.length;index++){
  runningHeight+=blockHeight(groups[index-1]);
  const difference=Math.abs(totalHeight-runningHeight*2);
  if(difference<bestDifference){bestDifference=difference;splitIndex=index;}
}
const columns=[groups.slice(0,splitIndex),groups.slice(splitIndex)];
const columnHeights=columns.map(column=>column.reduce((sum,group)=>sum+blockHeight(group),0));
const startY=212,footerH=78,H=startY+Math.max(...columnHeights)+footerH;
const columnWidths=[64,96,96,100,92,92,120];
if(columnWidths.reduce((sum,width)=>sum+width,0)!==columnW)throw new Error('열 너비 합계가 맞지 않습니다.');

const body=[];
body.push(`<rect width="${W}" height="${H}" fill="#f4f1e9"/>`);
body.push(`<rect x="38" y="38" width="${W-76}" height="${H-76}" rx="8" fill="#fff" stroke="#d3cec2" stroke-width="2"/>`);
body.push(`<text x="${margin+30}" y="90" class="brand">NIMBYRAIL PASSENGER INFORMATION</text>`);
body.push(`<text x="${margin+30}" y="142" class="title">[붙임] 10월 29일 전 열차 시간표 변경 전체 내역</text>`);
body.push(`<text x="${margin+30}" y="181" class="subtitle">457편 · 136개 운행 방향·계통 · 각 열차 전 구간 동일 분수 조정</text>`);
body.push(`<text x="${W-margin-30}" y="142" text-anchor="end" class="date">2026-10-29 기준</text>`);

columns.forEach((column,columnIndex)=>{
  const x=margin+columnIndex*(columnW+gap);
  let y=startY;
  for(const group of column){
    const accent=gradeColor(group.grade);
    body.push(`<rect x="${x}" y="${y}" width="${columnW}" height="${sectionH}" rx="7" fill="${accent}" opacity=".10"/>`);
    body.push(`<rect x="${x}" y="${y}" width="7" height="${sectionH}" rx="4" fill="${accent}"/>`);
    body.push(`<text x="${x+20}" y="${y+25}" class="group">${esc(group.grade)} · ${esc(group.route)}</text>`);
    body.push(`<text x="${x+columnW-14}" y="${y+25}" text-anchor="end" class="count">${group.rows.length}편</text>`);
    y+=sectionH;
    body.push(`<rect x="${x}" y="${y}" width="${columnW}" height="${headH}" fill="#30343b"/>`);
    const headers=['열차','출발역','도착역','등급','기존 출발','변경 출발','증감'];
    let cursor=x;
    headers.forEach((header,index)=>{
      const width=columnWidths[index];
      body.push(`<text x="${cursor+width/2}" y="${y+22}" text-anchor="middle" class="th headerText">${header}</text>`);
      if(index)body.push(`<line x1="${cursor}" y1="${y}" x2="${cursor}" y2="${y+headH}" class="grid darkGrid"/>`);
      cursor+=width;
    });
    y+=headH;
    group.rows.forEach((row,rowIndex)=>{
      if(rowIndex%2)body.push(`<rect x="${x}" y="${y}" width="${columnW}" height="${rowH}" fill="#faf9f6"/>`);
      body.push(`<rect x="${x}" y="${y}" width="5" height="${rowH}" fill="${accent}"/>`);
      const values=[`#${row.no}`,row.origin,row.destination,row.grade,row.oldDeparture,row.newDeparture,`${row.delta>0?'+':''}${row.delta}분`];
      cursor=x;
      values.forEach((value,index)=>{
        const width=columnWidths[index];
        const className=index===0?'trainNo':index>=1&&index<=3?'route':index===6?`delta ${row.delta>0?'later':'earlier'}`:'time';
        body.push(`<text x="${cursor+width/2}" y="${y+20}" text-anchor="middle" class="${className}">${esc(value)}</text>`);
        if(index)body.push(`<line x1="${cursor}" y1="${y}" x2="${cursor}" y2="${y+rowH}" class="grid"/>`);
        cursor+=width;
      });
      body.push(`<line x1="${x}" y1="${y+rowH}" x2="${x+columnW}" y2="${y+rowH}" class="grid"/>`);
      y+=rowH;
    });
    body.push(`<rect x="${x}" y="${y-headH-group.rows.length*rowH}" width="${columnW}" height="${headH+group.rows.length*rowH}" fill="none" stroke="#777" stroke-width="1"/>`);
    y+=blockGap;
  }
});

const footerY=H-62;
body.push(`<line x1="${margin+30}" y1="${footerY-22}" x2="${W-margin-30}" y2="${footerY-22}" stroke="#aaa59b"/>`);
body.push(`<text x="${margin+30}" y="${footerY}" class="foot">※ 기존·변경 시각은 각 열차의 첫 역 출발 기준입니다. +는 늦춤, −는 앞당김입니다.</text>`);
body.push(`<text x="${W-margin-30}" y="${footerY}" text-anchor="end" class="foot">자료: 2026-10-29-overtake-retimings.md · 자동 생성</text>`);

const css=`
  .brand{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#2456a6}
  .title{font:800 31px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#151515}
  .subtitle{font:500 18px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#53565a}
  .date{font:600 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#555}
  .group{font:800 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#171717}
  .count{font:750 12px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#555}
  .th{font:800 12px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif}.headerText{fill:#fff}
  .trainNo{font:800 13px 'JetBrains Mono','SFMono-Regular',monospace;fill:#202124}
  .route{font:700 12px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
  .time,.delta{font:700 13px 'JetBrains Mono','SFMono-Regular',monospace;fill:#202124}
  .delta.later{fill:#c24132}.delta.earlier{fill:#1769aa}
  .grid{stroke:#cac7c0;stroke-width:1}.darkGrid{stroke:#777b82}
  .foot{font:500 13px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#666}
`;
const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">10월 29일 전 열차 시간표 변경 전체 내역</title><desc id="desc">457편의 열차번호, 출발역, 도착역, 열차등급, 기존 출발, 변경 출발, 조정분을 136개 계통별로 표시합니다.</desc><style>${css}</style>${body.join('')}</svg>`;
fs.mkdirSync(path.dirname(TARGET),{recursive:true});
fs.writeFileSync(TARGET,svg);
process.stdout.write(`${path.relative(ROOT,TARGET)} · ${rows.length}편 · ${groups.length}개 계통 · ${(Buffer.byteLength(svg)/1024).toFixed(1)}KB · ${W}×${H}\n`);
