import fs from 'node:fs';

const input=process.argv[2];
const output=process.argv[3];
if(!input||!output)throw new Error('usage: node tools/extract_north_ingame_routes.mjs <timetable-export.json> <output.js>');
const records=JSON.parse(fs.readFileSync(input,'utf8'));
const stations=new Map(records.filter(item=>item.class==='Station').map(item=>[item.id,item.name.replace(/역$/,'')]));
const wanted=[
  '경부선','한강로-부산 ITX새마을',
  '원산-부산 KTX','서울-신의주 KTX','남대구-경흥 KTX','평양-만포 KTX',
  '평양-개성 (해주 경유) KTX','원산-마포 ITX-마음','평양-녕원 KTX',
  '원산-혜산 ITX-마음','원산-무산 ITX-마음','평양-원산 무궁화호',
  '신의주-부산 KTX','서울-양구-원산 무궁화호','평양-룡연 KTX',
  '목포-경흥 KTX','서울-블라디보스토크 KTX','원산-경흥 ITX-마음'
];
const routes={};
const stationLines=new Map();
for(const name of wanted){
  const line=records.find(item=>item.class==='Line'&&item.name===name);
  if(!line)throw new Error(`missing in-game line: ${name}`);
  routes[name]=line.stops.map(stop=>({
    station:stations.get(stop.station_id)||null,
    arrival:stop.arrival,
    departure:stop.departure,
    platform:(stop.areas?.[0]?.[0]?.platform_name||'').replace(/[^0-9].*$/,'')||null,
    track:stop.station_id==='0x0'?(stop.areas?.[0]?.[0]?.track_id||null):null
  }));
  for(const stop of line.stops)if(stop.station_id!=='0x0'){
    const set=stationLines.get(stop.station_id)||new Set();set.add(name);stationLines.set(stop.station_id,set);
  }
}
const stationMeta={};
for(const station of records.filter(item=>item.class==='Station'&&stationLines.has(item.id))){
  const name=station.name.replace(/역$/,'');
  const platforms=new Set();
  for(const route of Object.values(routes))for(const stop of route)if(stop.station===name&&stop.platform)platforms.add(Number(stop.platform));
  stationMeta[name]={lon:station.lonlat[0],lat:station.lonlat[1],platforms:[...platforms].sort((a,b)=>a-b),lines:[...stationLines.get(station.id)]};
}
const header='/* 새 인게임 Timetable Export에서 기계 추출. 직접 편집하지 말 것. */\n';
fs.writeFileSync(output,`${header}globalThis.NIMBI_NORTH_INGAME_ROUTES=${JSON.stringify(routes,null,2)};\nglobalThis.NIMBI_NORTH_INGAME_STATIONS=${JSON.stringify(stationMeta,null,2)};\n`);
console.log(`extracted ${Object.keys(routes).length} routes to ${output}`);
