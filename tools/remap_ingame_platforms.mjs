#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const GAME_DB = process.env.NIMBY_GAME_DB || '/Users/kimdohyun/Desktop/main/NIMBYRAILTABLE-main/db/db2_lines.json';
const write = process.argv.includes('--write');
const context = { console };
vm.createContext(context);
for (const file of [
  'data/nimbi_rail_data.js',
  'data/nimbi_station_data.js',
  'data/nimbi_platform_db.js',
  'data/nimbi_realplat.js',
  'data/nimbi_homonyms.js',
  'data/nimbi_regional_platforms.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
vm.runInContext('globalThis.__trains=ALL_TRAINS;globalThis.__platforms=REAL_PLAT', context);

const linesObject = JSON.parse(fs.readFileSync(GAME_DB, 'utf8')).lines;
const cleanStation = value => String(value || '')
  .replace(/\s*\/.*$/, '')
  .replace(/역$/, '')
  .replace(/\([^)]*\)$/, '')
  .trim();
const normalizePlatforms = value => (Array.isArray(value) ? value : [value])
  .flatMap(item => String(item ?? '').match(/\d+/g) || [])
  .map(Number)
  .filter(Number.isFinite);
const isBusinessStop = (stop, index, length) => {
  if (index === 0 || index === length - 1) return true;
  return /^\d{1,2}:\d{2}$/.test(String(stop.arr || '')) && /^\d{1,2}:\d{2}$/.test(String(stop.dep || ''));
};

const sourceLines = Object.entries(linesObject).map(([name, line]) => ({
  name,
  stops: (line.stops || []).filter(stop => stop.stn).map(stop => ({
    station: cleanStation(stop.stn),
    platforms: normalizePlatforms(stop.plat)
  }))
})).filter(line => line.stops.length);

const compact = value => cleanStation(value).replace(/[\s·()\-_/]/g, '');
const gradeAliases = grade => {
  const value = String(grade || '').replace(/-/g, '');
  if (value === 'ITX새마을') return ['ITX새마을', '새마을'];
  if (value === '무궁화호') return ['무궁화호', '무궁화'];
  return [value];
};
const knownGrades = ['KTX산천', 'KTX이음', 'ITX새마을', 'ITX청춘', 'ITX마음', '남도해양', '국악와인', '무궁화호', '무궁화', 'SRT', 'KTX'];
const sourceGrade = line => knownGrades.find(grade => compact(line.name).includes(grade)) || null;
function routeSimilarity(train, line) {
  const wanted = train.stops.map(stop => cleanStation(stop.s));
  const source = line.stops.map(stop => stop.station);
  const sourceSet = new Set(source);
  let stationOverlap = 0;
  for (const station of new Set(wanted)) if (sourceSet.has(station)) stationOverlap++;
  let orderedPairs = 0;
  for (let i = 1; i < wanted.length; i++) {
    const from = source.indexOf(wanted[i - 1]);
    if (from >= 0 && source.indexOf(wanted[i], from + 1) >= 0) orderedPairs++;
  }
  return stationOverlap * 2 + orderedPairs * 3;
}
function serviceAffinity(train, line) {
  const name = compact(line.name);
  const origin = compact(train.stops[0]?.s);
  const destination = compact(train.stops.at(-1)?.s);
  let score = 0;
  if (origin && name.includes(origin)) score += 18;
  if (destination && name.includes(destination)) score += 18;
  if (origin && destination && name.includes(origin) && name.includes(destination)) score += 12;
  const detectedGrade = sourceGrade(line);
  if (gradeAliases(train.grade).some(grade => grade && name.includes(grade))) score += 60;
  else if (detectedGrade && !gradeAliases(train.grade).includes(detectedGrade)) score -= 120;
  return score + routeSimilarity(train, line);
}

function preferredService(train) {
  const origin = cleanStation(train.stops[0]?.s);
  const destination = cleanStation(train.stops.at(-1)?.s);
  const aliases = gradeAliases(train.grade);
  const candidates = sourceLines.filter(line => {
    const name = compact(line.name);
    const stations = new Set(line.stops.map(stop => stop.station));
    return stations.has(origin) && stations.has(destination)
      && aliases.some(grade => grade && name.includes(grade));
  });
  candidates.sort((a, b) => serviceAffinity(train, b) - serviceAffinity(train, a) || a.stops.length - b.stops.length);
  return candidates[0] || null;
}

const occurrencesByStation = new Map();
for (const line of sourceLines) line.stops.forEach((stop, index) => {
  const list = occurrencesByStation.get(stop.station) || [];
  list.push({ line, index, stop });
  occurrencesByStation.set(stop.station, list);
});

// 열차 역 배열을 인게임 노선의 동일 방향 순서에 맞춘다. 중간역이 생략된
// 시간표도 허용하되, 건너뛴 원본 역 수가 가장 적은 계통을 우선한다.
function alignTrain(train) {
  const wanted = train.stops.map(stop => cleanStation(stop.s));
  const candidates = [];
  for (const line of sourceLines) {
    for (let start = 0; start < line.stops.length; start++) {
      if (line.stops[start].station !== wanted[0]) continue;
      const indices = [start];
      let cursor = start + 1;
      for (let i = 1; i < wanted.length; i++) {
        while (cursor < line.stops.length && line.stops[cursor].station !== wanted[i]) cursor++;
        if (cursor >= line.stops.length) break;
        indices.push(cursor++);
      }
      if (indices.length !== wanted.length) continue;
      const gaps = indices.at(-1) - indices[0] + 1 - wanted.length;
      const endpointPenalty = (indices[0] === 0 ? 0 : 1) + (indices.at(-1) === line.stops.length - 1 ? 0 : 1);
      const nameHint = String(train.line || '').split('·').some(part => line.name.includes(part)) ? 0 : 1;
      candidates.push({ line, indices, score: gaps * 10 + endpointPenalty * 2 + nameHint - serviceAffinity(train, line) });
    }
  }
  candidates.sort((a, b) => a.score - b.score || a.line.stops.length - b.line.stops.length || a.line.name.localeCompare(b.line.name, 'ko'));
  return candidates[0] || null;
}

function localPlatform(train, index, onlyLine = null) {
  const wanted = train.stops.map(stop => cleanStation(stop.s));
  const station = wanted[index];
  const previous = wanted[index - 1];
  const next = wanted[index + 1];
  const lineParts = String(train.line || '').split('·');
  const pool = (occurrencesByStation.get(station) || []).filter(occurrence => !onlyLine || occurrence.line === onlyLine);
  const candidates = pool.map(occurrence => {
    const source = occurrence.line.stops;
    let score = 0;
    if (previous && source[occurrence.index - 1]?.station === previous) score += 20;
    if (next && source[occurrence.index + 1]?.station === next) score += 20;
    if (!previous && occurrence.index === 0) score += 8;
    if (!next && occurrence.index === source.length - 1) score += 8;
    if (lineParts.some(part => occurrence.line.name.includes(part))) score += 4;
    score += serviceAffinity(train, occurrence.line);
    return { ...occurrence, score };
  }).filter(candidate => candidate.stop.platforms.length);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.line.stops.length - b.line.stops.length || a.line.name.localeCompare(b.line.name, 'ko'));
  const best = candidates[0];
  // 점수가 같은 다른 계통의 승강장을 합치지 않고, 실제로 선택된 인게임
  // 노선·방향의 해당 stop에 기입된 plat 배열만 사용한다.
  return { allowed: best.stop.platforms, source: best.line.name };
}

const remapped = {};
const unmatched = [];
const ambiguousChoices = [];
const unmappedStops = [];
let businessStops = 0;
let mappedStops = 0;
let changedStops = 0;
let multiPlatformStops = 0;

for (const train of context.__trains) {
  const match = alignTrain(train);
  const preferred = preferredService(train);
  const current = context.__platforms[train.no] || {};
  const map = {};
  let trainMapped = 0;
  train.stops.forEach((stop, index) => {
    if (!isBusinessStop(stop, index, train.stops.length)) return;
    businessStops++;
    let resolved = preferred ? localPlatform(train, index, preferred) : null;
    if (!resolved) resolved = match
      ? { allowed: match.line.stops[match.indices[index]].platforms, source: match.line.name }
      : localPlatform(train, index);
    if (!resolved?.allowed?.length) resolved = localPlatform(train, index);
    const allowed = resolved?.allowed || [];
    if (!allowed.length) {
      unmappedStops.push({ no: train.no, station: stop.s, line: train.line });
      return;
    }
    const old = Number(current[stop.s]);
    if (allowed.length > 1) multiPlatformStops++;
    // 선택된 인게임 노선 stop에 복수 plat가 있으면 앞의 보조 승강장은
    // 제외하고, 해당 stop에 기록된 주 승강장(마지막 값) 하나만 사용한다.
    const chosen = allowed.at(-1);
    map[stop.s] = chosen;
    mappedStops++;
    trainMapped++;
    if (old !== chosen) changedStops++;
    if (allowed.length > 1 && !allowed.includes(old)) ambiguousChoices.push({ no: train.no, station: stop.s, allowed, chosen, source: resolved.source });
  });
  if (trainMapped) remapped[train.no] = map;
  if (!match) unmatched.push({ no: train.no, grade: train.grade, route: `${train.stops[0]?.s}→${train.stops.at(-1)?.s}`, line: train.line, mappedStops: trainMapped });
}

const report = {
  source: GAME_DB,
  trains: context.__trains.length,
  wholeRouteMatchedTrains: context.__trains.length - unmatched.length,
  locallyMatchedTrains: unmatched.filter(item => item.mappedStops).length,
  zeroMatchedTrains: unmatched.filter(item => !item.mappedStops).length,
  businessStops,
  mappedStops,
  changedStops,
  multiPlatformStops,
  ambiguousChoices: ambiguousChoices.length,
  unmappedStops: unmappedStops.length,
  unmatchedExamples: unmatched.slice(0, 30),
  ambiguousExamples: ambiguousChoices.slice(0, 20),
  unmappedExamples: unmappedStops.slice(0, 50)
};
console.log(JSON.stringify(report, null, 2));

if (write) {
  const body = `// 인게임 db2_lines.json의 노선별 승강장 정보를 전체 간선열차에 재매핑한 생성 파일.\n` +
    `// 생성: node tools/remap_ingame_platforms.mjs --write (N/S/E/W 방향 문자는 숫자만 보존)\n` +
    `(function(){\n  if(typeof REAL_PLAT==='undefined')return;\n  const mapped=${JSON.stringify(remapped)};\n  for(const no of Object.keys(mapped))REAL_PLAT[no]=mapped[no];\n})();\n`;
  fs.writeFileSync('data/nimbi_ingame_platforms.js', body);
}
