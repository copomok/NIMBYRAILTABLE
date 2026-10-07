import fs from 'node:fs';
import vm from 'node:vm';

const [exportPath, schedulePath, outputPath] = process.argv.slice(2);
if (!exportPath || !schedulePath || !outputPath) {
  throw new Error('usage: node tools/extract_ingame_metro_platform_directions.mjs <timetable-export.json> <nimbi_metro_sched.js> <output.js>');
}

const records = Object.values(JSON.parse(fs.readFileSync(exportPath, 'utf8')));
const context = {};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync(schedulePath, 'utf8')}\nthis.__schedule=METRO_SCHED;`, context);
const scheduleLines = new Set(Object.keys(context.__schedule || {}));

// 기존 동명이역/북한권 표기와 동일한 키를 사용한다.
const DISPLAY_KEY_BY_ID = {
  '0x20000008c0001': '상도(강서선)역',
  '0x2000001410001': '세포읍',
  '0x2000001420001': '고산읍',
  '0x2000001430001': '안변읍'
};

const stations = new Map(records.filter(record => record.class === 'Station').map(record => [record.id, record]));
const platformNumber = value => {
  const match = String(value || '').trim().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
};
const uniqueNumbers = values => [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
const stationName = id => {
  const raw = DISPLAY_KEY_BY_ID[id] || stations.get(id)?.name || '';
  return raw.endsWith('역') ? raw.slice(0, -1) : raw;
};

const result = {};
let matchedLines = 0;
let mappedStops = 0;
let auxiliaryStops = 0;

for (const line of records.filter(record => record.class === 'Line')) {
  const lineName = String(line.name || '').trim();
  if (!scheduleLines.has(lineName)) continue;
  matchedLines++;
  const route = (line.stops || []).map(stop => stationName(stop.station_id));
  const lineMap = {};
  result[lineName] = { route, platforms: lineMap };
  for (let stopIndex = 0; stopIndex < (line.stops || []).length; stopIndex++) {
    const stop = line.stops[stopIndex];
    const name = stationName(stop.station_id);
    if (!name) continue;
    const entry = { i: stopIndex, p: [], a: [] };
    let hasPlatform = false;
    for (let groupIndex = 0; groupIndex < (stop.areas || []).length; groupIndex++) {
      const named = (stop.areas[groupIndex] || [])
        .map(area => platformNumber(area.platform_name))
        .filter(number => number != null);
      if (!named.length) continue;
      hasPlatform = true;
      if (groupIndex > 0) auxiliaryStops++;
      entry[groupIndex === 0 ? 'p' : 'a'].push(...named);
    }
    entry.p = uniqueNumbers(entry.p);
    entry.a = uniqueNumbers(entry.a).filter(number => !entry.p.includes(number));
    if (hasPlatform) {
      (lineMap[name] ||= []).push(entry);
      mappedStops++;
    }
  }
  if (!Object.keys(lineMap).length) delete result[lineName];
}

const payload = {
  source: 'NIMBY Rails Timetable Export 2026-09-24',
  matchedLines,
  mappedStops,
  auxiliaryStops,
  // route는 게임 Line의 A→B→A 선형, platforms의 i는 해당 방향 occurrence의 route index다.
  // p는 주 승강장, a는 같은 방향에서 사용할 수 있는 보조 승강장이다.
  lines: result
};

fs.writeFileSync(outputPath, `/* 인게임 Line.stops[].areas에서 기계 추출한 전철 방향별 주·보조 승강장. 직접 편집하지 말 것. */\n` +
  `globalThis.METRO_PLATFORM_DIRECTIONS=${JSON.stringify(payload)};\n`);

console.log(JSON.stringify({ matchedLines, mappedStops, auxiliaryStops, outputPath }, null, 2));
