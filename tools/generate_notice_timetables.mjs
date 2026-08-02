import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'assets','notices');

function loadTrains(){
  const source=fs.readFileSync(path.join(ROOT,'data','nimbi_rail_data.js'),'utf8');
  const context={};
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__NOTICE_TRAINS__=ALL_TRAINS;`,context,{filename:'nimbi_rail_data.js'});
  return Array.from(context.__NOTICE_TRAINS__||[]);
}

const TRAINS=loadTrains();
const byNo=new Map(TRAINS.map(train=>[String(train.no),train]));
const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>String(from+i));
const numbers=(...parts)=>parts.flatMap(part=>Array.isArray(part)?part:[String(part)]);
const selectNumbers=(list)=>list.map(no=>byNo.get(String(no))).filter(Boolean);
const selectRoute=(from,to,grade)=>TRAINS.filter(train=>
  train.grade===grade&&train.boundary?.includes(from)&&train.boundary?.includes(to)
);

const notices=[
  {
    id:'20260710-major-revision',date:'2026.07.10',
    title:'시간표 대개정 전체 운행계획',expected:154,
    subtitle:'호남고속선·장항선·전라선·충북선·순천 계통',
    groups:[
      ['호남고속선 KTX · 마포 ↔ 목포',selectNumbers(range(401,460))],
      ['충북선 막차 · 대전 ↔ 영주',selectNumbers(['1429','1430'])],
      ['장항선 · 한강로 ↔ 서대전',selectNumbers(range(1461,1466))],
      ['장항선 · 한강로 ↔ 전주',selectNumbers(range(1471,1490))],
      ['전라선 KTX · 서울 ↔ 여수',selectNumbers(range(551,582))],
      ['충북선 · 대전 ↔ 영주',selectNumbers(range(1401,1428))],
      ['순천 계통 · 한강로 ↔ 순천',selectNumbers(range(1491,1496))]
    ]
  },
  {
    id:'20260712-southern-inland',date:'2026.07.12',
    title:'남부내륙선 개통 전체 운행계획',expected:148,
    subtitle:'약목–거제 9개 계통',
    groups:[
      ['KTX-산천 · 마포 ↔ 장유',selectRoute('마포','장유','KTX-산천')],
      ['KTX-산천 · 한강로 ↔ 고현',selectRoute('한강로','고현','KTX-산천')],
      ['ITX-새마을 · 대전 ↔ 고현',selectRoute('대전','고현','ITX-새마을')],
      ['ITX-새마을 · 한강로 ↔ 고현',selectRoute('한강로','고현','ITX-새마을')],
      ['무궁화호 · 남대구 ↔ 순천',selectRoute('남대구','순천','무궁화호')],
      ['무궁화호 · 남대구 ↔ 고현',selectRoute('남대구','고현','무궁화호')],
      ['무궁화호 · 진주 ↔ 고현',selectRoute('진주','고현','무궁화호')],
      ['무궁화호 · 순천 ↔ 고현',selectRoute('순천','고현','무궁화호')],
      ['남도해양 · 목포 ↔ 고현',selectRoute('목포','고현','남도해양')]
    ]
  },
  {
    id:'20260717-regional-expansion',date:'2026.07.17',
    title:'수도권·강원·호남 시간표 개정',expected:114,
    subtitle:'고속·특급·일반열차 8개 계통',
    groups:[
      ['KTX · 서인천 ↔ 부산',selectRoute('서인천','부산','KTX')],
      ['KTX · 서인천 ↔ 목포',selectRoute('서인천','목포','KTX')],
      ['KTX · 마포 ↔ 전주(호남선)',selectRoute('마포','전주','KTX')],
      ['KTX-이음 · 마포 ↔ 전주(장항선)',selectRoute('마포','전주','KTX-이음')],
      ['KTX-산천 · 한강로 ↔ 태안',selectRoute('한강로','태안','KTX-산천')],
      ['ITX-새마을 · 강릉 ↔ 부산',selectRoute('강릉','부산','ITX-새마을')],
      ['ITX-새마을 · 강릉 ↔ 영주',selectRoute('강릉','영주','ITX-새마을')],
      ['무궁화호 · 영동 ↔ 광주',selectRoute('영동','광주','무궁화호')]
    ]
  },
  {
    id:'20260729-mugunghwa',date:'2026.07.29',
    title:'무궁화호 신설 계통 전체 시간표',expected:46,
    subtitle:'서울–남대구·영동–부산·목포–남대구/부산',
    groups:[
      ['서울 ↔ 남대구(조치원·세종 경유)',selectNumbers(range(1311,1328))],
      ['영동 ↔ 밀양 ↔ 부산',selectNumbers(range(1331,1350))],
      ['목포 ↔ 남대구',selectNumbers(range(1451,1454))],
      ['목포 ↔ 부산',selectNumbers(range(1501,1504))]
    ]
  },
  {
    id:'20260731-regional-revision',date:'2026.07.31',
    title:'지역·광역열차 전면 개정 시간표',expected:152,
    subtitle:'SRT·ITX·무궁화호 11개 운행 계통',
    groups:[
      ['SRT · 잠실 ↔ 목포',selectNumbers(range(801,822))],
      ['SRT · 잠실 ↔ 간성',selectNumbers(range(681,690))],
      ['SRT · 잠실 ↔ 봉화',selectNumbers(range(691,700))],
      ['ITX-마음 · 문의 ↔ 상주',selectNumbers(range(1241,1252))],
      ['ITX-마음 · 의정부 ↔ 대전',selectNumbers(range(1261,1270))],
      ['ITX-새마을 · 강릉 ↔ 부산',selectNumbers(range(1201,1216))],
      ['ITX-새마을 · 강릉 ↔ 영주',selectNumbers(range(1221,1236))],
      ['교외선 순환 무궁화호',selectNumbers(range(4401,4428))],
      ['무궁화호 · 영동 ↔ 부산',selectNumbers(range(1331,1350))],
      ['무궁화호 · 목포 ↔ 남대구',selectNumbers(range(1451,1454))],
      ['무궁화호 · 목포 ↔ 부산',selectNumbers(range(1501,1504))]
    ]
  },
  {
    id:'20260731-gyeongbuk-loop',date:'2026.07.31',
    title:'경북순환·충주–남대구 운행계획',expected:12,
    subtitle:'ITX-마음 신설 전체 시간표',
    groups:[
      ['경북순환 ITX-마음',selectNumbers(range(4451,4458))],
      ['충주 ↔ 남대구 ITX-마음',selectNumbers(range(1885,1888))]
    ]
  },
  {
    id:'20260801-gyooe-loop',date:'2026.08.01',
    title:'교외선 순환 무궁화호 운행계획',expected:28,
    subtitle:'상·하행 정의 변경 및 80분 간격 시간표',
    groups:[['교외선 순환 무궁화호',selectNumbers(range(4401,4428))]]
  },
  {
    id:'20260802-taebaek',date:'2026.08.02',
    title:'태백선·남도해양 전체 운행계획',expected:58,
    subtitle:'ITX-새마을·KTX-이음 신설 및 남도해양 번호 변경',
    groups:[
      ['ITX-새마을 · 강릉 ↔ 대전',selectNumbers(range(1901,1918))],
      ['KTX-이음 · 강릉 ↔ 광주',selectNumbers(range(621,632))],
      ['남도해양 · 목포 ↔ 여수',selectNumbers(range(2501,2514))],
      ['남도해양 · 목포 ↔ 고현',selectNumbers(range(2521,2534))]
    ]
  }
];

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

function stopRows(trains){
  const items=new Map();
  for(const train of trains){
    const seen=new Map();
    train.stops.forEach((stop,index)=>{
      const occurrence=(seen.get(stop.s)||0)+1;
      seen.set(stop.s,occurrence);
      const key=`${stop.s}#${occurrence}`;
      const item=items.get(key)||{key,name:stop.s,occurrence,positions:[]};
      item.positions.push(index/Math.max(1,train.stops.length-1));
      items.set(key,item);
    });
  }
  return [...items.values()].sort((a,b)=>
    a.positions.reduce((x,y)=>x+y,0)/a.positions.length-
    b.positions.reduce((x,y)=>x+y,0)/b.positions.length
  );
}

function stopMap(train){
  const seen=new Map(),map=new Map();
  train.stops.forEach((stop,index)=>{
    const occurrence=(seen.get(stop.s)||0)+1;
    seen.set(stop.s,occurrence);
    map.set(`${stop.s}#${occurrence}`,{stop,index,last:index===train.stops.length-1});
  });
  return map;
}

const isTime=value=>/^\d{1,2}:\d{2}$/.test(value||'');
function cellText(entry){
  if(!entry)return['—','missing'];
  const {stop,index,last}=entry;
  const arr=isTime(stop.arr)?stop.arr:null,dep=isTime(stop.dep)?stop.dep:null;
  if(arr&&dep)return[arr===dep?arr:`${arr}–${dep}`,'stop'];
  if(dep)return[`${dep}${index===0?' 출발':''}`,index===0?'terminal':'pass'];
  if(arr)return[`${arr}${last?' 도착':' 통과'}`,last?'terminal':'pass'];
  if(stop.arr==='통과'||stop.dep==='통과')return['통과','pass'];
  return['—','missing'];
}

function gradeColor(grade){
  if(/KTX|SRT/.test(grade))return'#2456a6';
  if(/ITX-새마을/.test(grade))return'#d73a49';
  if(/ITX-마음/.test(grade))return'#e05a33';
  if(/남도해양/.test(grade))return'#1593b8';
  return'#c45c27';
}

function renderNotice(notice){
  const count=notice.groups.reduce((sum,[,trains])=>sum+trains.length,0);
  if(count!==notice.expected)throw new Error(`${notice.id}: 대상 열차 ${count}편 (예상 ${notice.expected}편)`);
  for(const [name,trains] of notice.groups)if(!trains.length)throw new Error(`${notice.id}: 빈 계통 ${name}`);

  const W=1440,margin=72,tableW=W-margin*2,stationW=190,colW=(tableW-stationW)/6;
  const rowH=42,headH=58,groupGap=58,dirGap=26;
  let y=220;
  const body=[];
  body.push(`<rect width="${W}" height="__HEIGHT__" fill="#f4f1e9"/>`);
  body.push(`<rect x="38" y="38" width="${W-76}" height="__INNER__" rx="8" fill="#fff" stroke="#d3cec2" stroke-width="2"/>`);
  body.push(`<text x="${margin}" y="92" class="brand">NIMBYRAIL PASSENGER INFORMATION</text>`);
  body.push(`<text x="${margin}" y="142" class="title">[붙임] ${esc(notice.title)}</text>`);
  body.push(`<text x="${margin}" y="181" class="subtitle">${esc(notice.subtitle)} · ${count}편</text>`);
  body.push(`<text x="${W-margin}" y="142" text-anchor="end" class="date">${esc(notice.date)} 기준</text>`);

  for(const [groupName,all] of notice.groups){
    const directions=[['하행',all.filter(t=>t.dir==='down')],['상행',all.filter(t=>t.dir==='up')]]
      .filter(([,trains])=>trains.length);
    body.push(`<rect x="${margin}" y="${y}" width="8" height="34" rx="4" fill="${gradeColor(all[0]?.grade||'')}"/>`);
    body.push(`<text x="${margin+22}" y="${y+26}" class="group">${esc(groupName)}</text>`);
    body.push(`<text x="${W-margin}" y="${y+25}" text-anchor="end" class="groupCount">${all.length}편 · ${esc(all[0]?.grade||'')}</text>`);
    y+=50;

    for(const [dir,trains] of directions){
      const rows=stopRows(trains),maps=new Map(trains.map(t=>[t,stopMap(t)]));
      for(let offset=0;offset<trains.length;offset+=6){
        const page=trains.slice(offset,offset+6),x=margin;
        body.push(`<text x="${x}" y="${y+24}" class="direction">${dir} · ${esc(page[0].boundary?.[0]||page[0].stops[0]?.s)} → ${esc(page[0].dest)}</text>`);
        y+=38;
        body.push(`<rect x="${x}" y="${y}" width="${tableW}" height="${headH+rows.length*rowH}" fill="#fff" stroke="#5f6368" stroke-width="1.5"/>`);
        body.push(`<rect x="${x}" y="${y}" width="${tableW}" height="${headH}" fill="#ecebe7"/>`);
        body.push(`<text x="${x+stationW/2}" y="${y+36}" text-anchor="middle" class="th">역명</text>`);
        page.forEach((train,index)=>{
          const cx=x+stationW+index*colW;
          body.push(`<rect x="${cx}" y="${y}" width="${colW}" height="${headH}" fill="${gradeColor(train.grade)}" opacity=".10"/>`);
          body.push(`<text x="${cx+colW/2}" y="${y+25}" text-anchor="middle" class="trainNo">#${esc(train.no)}</text>`);
          body.push(`<text x="${cx+colW/2}" y="${y+45}" text-anchor="middle" class="dest">${esc(train.dest)}행</text>`);
        });
        for(let i=0;i<=page.length;i++){
          const vx=x+stationW+i*colW;
          body.push(`<line x1="${vx}" y1="${y}" x2="${vx}" y2="${y+headH+rows.length*rowH}" class="grid"/>`);
        }
        rows.forEach((row,rowIndex)=>{
          const ry=y+headH+rowIndex*rowH;
          if(rowIndex%2)body.push(`<rect x="${x}" y="${ry}" width="${tableW}" height="${rowH}" fill="#faf9f6"/>`);
          body.push(`<line x1="${x}" y1="${ry}" x2="${x+tableW}" y2="${ry}" class="grid"/>`);
          const label=row.occurrence>1?`${row.name}(도착)`:row.name;
          body.push(`<text x="${x+18}" y="${ry+28}" class="station">${esc(label)}</text>`);
          page.forEach((train,index)=>{
            const [text,state]=cellText(maps.get(train).get(row.key));
            const cx=x+stationW+index*colW+colW/2;
            body.push(`<text x="${cx}" y="${ry+27}" text-anchor="middle" class="time ${state}">${esc(text)}</text>`);
          });
        });
        y+=headH+rows.length*rowH+dirGap;
      }
    }
    y+=groupGap;
  }

  y+=35;
  body.push(`<line x1="${margin}" y1="${y}" x2="${W-margin}" y2="${y}" stroke="#aaa59b"/>`);
  body.push(`<text x="${margin}" y="${y+34}" class="foot">※ 출발역은 ‘출발’, 종착역은 ‘도착’으로 표시합니다. 회색 글자는 통과역입니다.</text>`);
  body.push(`<text x="${W-margin}" y="${y+34}" text-anchor="end" class="foot">자료: NIMBYRAILTABLE ALL_TRAINS · 자동 생성</text>`);
  const H=y+86;
  const css=`
    .brand{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#2456a6}
    .title{font:800 31px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#151515}
    .subtitle{font:500 18px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#53565a}
    .date{font:600 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#555}
    .group{font:800 24px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#171717}
    .groupCount{font:600 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#666}
    .direction{font:800 18px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
    .th,.trainNo{font:800 16px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
    .dest{font:700 12px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#555}
    .station{font:700 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
    .time{font:600 14px 'JetBrains Mono','SFMono-Regular',monospace;fill:#202124}
    .time.pass{fill:#9a9a9a;font-weight:500}.time.missing{fill:#c9c6bf}.time.terminal{font-weight:800}
    .grid{stroke:#b8b6b0;stroke-width:1}.foot{font:500 13px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#666}
  `;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>${css}</style>${body.join('').replaceAll('__HEIGHT__',H).replaceAll('__INNER__',H-76)}</svg>`;
}

fs.mkdirSync(OUT,{recursive:true});
for(const notice of notices){
  const svg=renderNotice(notice);
  const target=path.join(OUT,`${notice.id}.svg`);
  fs.writeFileSync(target,svg);
  console.log(`${path.relative(ROOT,target)} · ${notice.expected}편 · ${(Buffer.byteLength(svg)/1024).toFixed(1)}KB`);
}
