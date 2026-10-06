import fs from 'node:fs';

const [previousPath, currentPath, outputPath] = process.argv.slice(2);
if (!previousPath || !currentPath || !outputPath) {
  throw new Error('usage: node tools/extract_ingame_station_updates.mjs <previous-export.json> <current-export.json> <output.js>');
}

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const previous = read(previousPath);
const current = read(currentPath);

// 동명이역 분리와 북한권 사용자 표기를 적용한 뒤 DB를 갱신한다.
// raw 이름만으로 합치면 기존에 분리한 역의 좌표·승강장이 다시 섞인다.
const DISPLAY_KEY_BY_ID = {
  '0x20000008c0001': '상도(강서선)역',
  '0x2000001410001': '세포읍',
  '0x2000001420001': '고산읍',
  '0x2000001430001': '안변읍'
};

const platformNumber = raw => {
  const match = String(raw || '').trim().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
};
const sorted = values => [...new Set(values)].sort((a, b) => typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'ko'));

function collect(records) {
  const stations = new Map(records.filter(record => record.class === 'Station').map(record => [record.id, record]));
  const usage = new Map([...stations].map(([id]) => [id, { lines: new Set(), platforms: new Map() }]));
  for (const line of records.filter(record => record.class === 'Line')) {
    for (const stop of line.stops || []) {
      const station = usage.get(stop.station_id);
      if (!station) continue;
      station.lines.add(String(line.name || '').trim());
      for (const areaGroup of stop.areas || []) {
        for (const area of areaGroup || []) {
          const number = platformNumber(area.platform_name);
          if (number == null) continue;
          if (!station.platforms.has(number)) station.platforms.set(number, new Set());
          station.platforms.get(number).add(String(line.name || '').trim());
        }
      }
    }
  }
  return new Map([...stations].map(([id, station]) => {
    const u = usage.get(id);
    const platforms = sorted([...u.platforms.keys()]);
    const platformLines = Object.fromEntries(platforms.map(number => [number, sorted(u.platforms.get(number))]));
    return [id, {
      id,
      rawName: station.name,
      key: DISPLAY_KEY_BY_ID[id] || station.name,
      lon: station.lonlat?.[0],
      lat: station.lonlat?.[1],
      platforms,
      platformLines,
      lines: sorted(u.lines)
    }];
  }));
}

const before = collect(previous);
const after = collect(current);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const revisions = [];
let added = 0, renamed = 0, moved = 0, platformChanged = 0, lineChanged = 0;

for (const [id, next] of after) {
  const prior = before.get(id);
  const isAdded = !prior;
  const isRenamed = !!prior && prior.rawName !== next.rawName;
  const isMoved = !!prior && (!equal(prior.lon, next.lon) || !equal(prior.lat, next.lat));
  const hasPlatformChange = !!prior && !equal(prior.platforms, next.platforms);
  const hasLineChange = !!prior && !equal(prior.lines, next.lines);
  if (!isAdded && !isRenamed && !isMoved && !hasPlatformChange && !hasLineChange) continue;
  if (isAdded) added++;
  if (isRenamed) renamed++;
  if (isMoved) moved++;
  if (hasPlatformChange) platformChanged++;
  if (hasLineChange) lineChanged++;
  revisions.push({
    ...next,
    previousName: prior?.rawName || null,
    previousKey: prior ? (DISPLAY_KEY_BY_ID[id] || prior.rawName) : null,
    previousLines: prior?.lines || [],
    kind: { added: isAdded, renamed: isRenamed, moved: isMoved, platforms: hasPlatformChange, lines: hasLineChange }
  });
}

const metadata = {
  source: 'NIMBY Rails Timetable Export',
  previous: '2026-09-11',
  current: '2026-09-24',
  counts: { added, renamed, moved, platformChanged, lineChanged, total: revisions.length },
  revisions
};

const output = `/* 인게임 Timetable Export 두 버전의 역·승강장 차이에서 기계 추출. 직접 편집하지 말 것. */
globalThis.NIMBI_INGAME_STATION_REVISIONS=${JSON.stringify(metadata, null, 2)};
(()=>{
  const data=globalThis.NIMBI_INGAME_STATION_REVISIONS;
  if(!data)return;
  const uniq=list=>[...new Set((list||[]).filter(Boolean))];
  const grades=lines=>uniq((lines||[]).flatMap(line=>{
    const out=[];
    if(/KTX/.test(line))out.push('KTX');
    if(/SRT/.test(line))out.push('SRT');
    if(/ITX[- ]?마음/.test(line))out.push('ITX-마음');
    if(/ITX[- ]?새마을|ITX새마을/.test(line))out.push('ITX-새마을');
    if(/ITX[- ]?청춘|ITX청춘/.test(line))out.push('ITX-청춘');
    if(/무궁화/.test(line))out.push('무궁화호');
    return out;
  }));
  for(const revision of data.revisions){
    const key=revision.key,previousKey=revision.previousKey;
    let existing=(typeof STATION_DB!=='undefined'&&STATION_DB[key])||null;
    if(!existing&&previousKey&&typeof STATION_DB!=='undefined'&&STATION_DB[previousKey])existing=STATION_DB[previousKey];
    const previousRaw=new Set(revision.previousLines||[]);
    const curated=(existing?.lines||[]).filter(line=>!previousRaw.has(line));
    if(typeof STATION_DB!=='undefined'){
      STATION_DB[key]={...(existing||{}),lon:revision.lon,lat:revision.lat,platforms:[...revision.platforms],lines:uniq([...curated,...revision.lines])};
      if(previousKey&&previousKey!==key)delete STATION_DB[previousKey];
      if(revision.previousName&&revision.previousName!==key)delete STATION_DB[revision.previousName];
      if(revision.kind.renamed&&key.endsWith('역'))delete STATION_DB[key.slice(0,-1)];
    }
    if(typeof PLATFORM_DB!=='undefined'){
      const db=PLATFORM_DB[key]||(PLATFORM_DB[key]={});
      const valid=new Set(revision.platforms.map(String));
      if(revision.kind.platforms)for(const number of Object.keys(db))if(!valid.has(number))delete db[number];
      for(const number of revision.platforms){
        const current=db[String(number)]||{g:[],l:[]};
        const retained=(current.l||[]).filter(line=>!previousRaw.has(line));
        const lines=uniq([...retained,...(revision.platformLines[String(number)]||[])]);
        db[String(number)]={g:uniq([...(current.g||[]),...grades(lines)]),l:lines};
      }
      if(previousKey&&previousKey!==key)delete PLATFORM_DB[previousKey];
      if(revision.previousName&&revision.previousName!==key)delete PLATFORM_DB[revision.previousName];
    }
  }
})();
`;

fs.writeFileSync(outputPath, output);
console.log(`wrote ${revisions.length} station revisions (${added} added, ${renamed} renamed, ${platformChanged} platform changes) to ${outputPath}`);
