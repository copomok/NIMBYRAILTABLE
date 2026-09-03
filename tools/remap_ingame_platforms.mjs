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
      candidates.push({ line, indices, score: gaps * 10 + endpointPenalty * 2 + nameHint });
    }
  }
  candidates.sort((a, b) => a.score - b.score || a.line.stops.length - b.line.stops.length || a.line.name.localeCompare(b.line.name, 'ko'));
  return candidates[0] || null;
}

function localPlatform(train, index, current) {
  const wanted = train.stops.map(stop => cleanStation(stop.s));
  const station = wanted[index];
  const previous = wanted[index - 1];
  const next = wanted[index + 1];
  const lineParts = String(train.line || '').split('·');
  const candidates = (occurrencesByStation.get(station) || []).map(occurrence => {
    const source = occurrence.line.stops;
    let score = 0;
    if (previous && source[occurrence.index - 1]?.station === previous) score += 20;
    if (next && source[occurrence.index + 1]?.station === next) score += 20;
    if (!previous && occurrence.index === 0) score += 8;
    if (!next && occurrence.index === source.length - 1) score += 8;
    if (lineParts.some(part => occurrence.line.name.includes(part))) score += 4;
    return { ...occurrence, score };
  }).filter(candidate => candidate.stop.platforms.length);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.line.stops.length - b.line.stops.length || a.line.name.localeCompare(b.line.name, 'ko'));
  const bestScore = candidates[0].score;
  // 방향 단서가 없는 경우에도 현재 값이 원본의 허용 승강장 중 하나라면
  // 그 값을 보존한다. 동명이역을 임의의 다른 지역 승강장으로 바꾸지 않는다.
  const old = Number(current);
  if (bestScore < 4) {
    const preserving = candidates.find(candidate => candidate.stop.platforms.includes(old));
    if (!preserving) return null;
    return { allowed: preserving.stop.platforms, chosen: old, source: preserving.line.name };
  }
  const best = candidates.filter(candidate => candidate.score === bestScore);
  const allowed = [...new Set(best.flatMap(candidate => candidate.stop.platforms))];
  const chosen = allowed.includes(old) ? old : allowed[0];
  return { allowed, chosen, source: best[0].line.name };
}

const remapped = {};
const unmatched = [];
const ambiguousChoices = [];
const unmappedStops = [];
let businessStops = 0;
let mappedStops = 0;
let changedStops = 0;

for (const train of context.__trains) {
  const match = alignTrain(train);
  const current = context.__platforms[train.no] || {};
  const map = {};
  let trainMapped = 0;
  train.stops.forEach((stop, index) => {
    if (!isBusinessStop(stop, index, train.stops.length)) return;
    businessStops++;
    let resolved = match
      ? { allowed: match.line.stops[match.indices[index]].platforms, source: match.line.name }
      : localPlatform(train, index, current[stop.s]);
    if (!resolved?.allowed?.length) resolved = localPlatform(train, index, current[stop.s]);
    const allowed = resolved?.allowed || [];
    if (!allowed.length) {
      unmappedStops.push({ no: train.no, station: stop.s, line: train.line });
      return;
    }
    const old = Number(current[stop.s]);
    const chosen = resolved.chosen ?? (allowed.includes(old) ? old : allowed[0]);
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
