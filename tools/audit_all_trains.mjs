import fs from 'node:fs';
import vm from 'node:vm';

// Read-only candidate audit: node tools/audit_all_trains.mjs [--all]
// A shared line name and adjacent station pair are used as a track proxy. This
// does not prove that two trains occupy the same physical track. Segments with
// unknown pass times are listed separately and cannot receive a safety verdict.
// Run the same data layers as index.html, without executing browser UI code.
const files = [
  'nimbi_rail_data.js', 'nimbi_north_ingame_routes.js', 'nimbi_station_data.js',
  'nimbi_north_station_revision.js', 'nimbi_north_rail_revision.js',
  'nimbi_gonam_itx_revision.js', 'nimbi_pass_stations_revision.js',
  'nimbi_20261027_revision.js', 'nimbi_realplat.js', 'nimbi_homonyms.js',
  'nimbi_regional_platforms.js', 'nimbi_gyeongui_20261027_revision.js',
  'nimbi_nyongwon_20261027_stations.js',
];
const context = {};
vm.createContext(context);
for (const file of files) vm.runInContext(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'), context, { filename: file });
vm.runInContext('globalThis.trains = ALL_TRAINS; globalThis.platforms = REAL_PLAT', context);
const trains = context.trains;
const platforms = context.platforms;
const minute = value => { const [hour, min] = String(value).split(':').map(Number); return hour * 60 + min; };
const timed = value => /^\d{1,2}:\d{2}$/.test(value || '');
const forbidden = new Set(['사천','함안','추풍령','불국사','입실','함평','어상천','영월','신동','무릉','문산','일산','수영','천안']);
const yeongdongStations = new Set(['영주','봉화','법전','춘양','소천','분천','승부','석포','동점','철암','황지','동백산','도계','신기','동해']);
const jeongseonStations = new Set(['정선','화암','북평(정선)','나전','아우라지','구절리']);
const cannotOvertake = (station, line) => forbidden.has(station) ||
  (line === '영동선' && station !== '구문소' && yeongdongStations.has(station)) ||
  (line === '정선선' && jeongseonStations.has(station));
const singleLineStations = {
  교외선: ['의정부','가능','송추','장흥','고양','관산','주교','능곡','행신'],
  보은선: ['문의','회인','수한','보은','장안','속리산','화남','화령','낙서','서상주','상주'],
};
const singleEdges = new Set(Object.entries(singleLineStations).flatMap(([line, stops]) => stops.slice(1).map((stop, index) => `${line}|${[stops[index], stop].sort().join('|')}`)));
const lineNames = train => String(train.line).split(/[·,]/).map(s => s.trim());
const stopPlatform = (train, stop) => stop.p ?? platforms[train.no]?.[stop.s] ?? null;
const intervals = new Map();
const unknown = [];
let legCount = 0;
for (const train of trains) {
  const lines = lineNames(train);
  let day = 0, previous = null;
  const points = train.stops.map((stop, index) => {
    const value = stop.arr || stop.dep;
    if (!timed(value)) return { stop, index, time: null };
    let time = minute(value) + day;
    if (previous !== null && time < previous) { day += 1440; time += 1440; }
    previous = time;
    let departure = timed(stop.dep) ? minute(stop.dep) + day : time;
    if (departure < time) departure += 1440;
    return { stop, index, time, departure };
  });
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    if (a.time === null || b.time === null) { unknown.push({ no: train.no, from: a.stop.s, to: b.stop.s }); continue; }
    const base = { no: train.no, grade: train.grade, dir: train.dir, from: a.stop.s, to: b.stop.s, start: a.departure, end: b.time, fromPlatform: stopPlatform(train, a.stop), toPlatform: stopPlatform(train, b.stop), lines };
    for (const line of lines) {
      const key = `${line}|${[base.from, base.to].sort().join('|')}`;
      const list = intervals.get(key) || [];
      list.push({ ...base, line }); intervals.set(key, list);
    }
    legCount++;
  }
}
const issues = [];
const seen = new Set();
for (const [key, legs] of intervals) {
  legs.sort((a, b) => a.start - b.start);
  for (let i = 0; i < legs.length; i++) for (let j = i + 1; j < legs.length; j++) {
    const a = legs[i], b = legs[j];
    if (a.no === b.no) continue;
    for (const offset of [-1440, 0, 1440]) {
      const start = b.start + offset, end = b.end + offset;
      if (Math.max(a.start, start) >= Math.min(a.end, end)) continue;
      const opposite = a.from === b.to && a.to === b.from;
      const same = a.from === b.from && a.to === b.to;
      if (!opposite && !same) continue;
      let kind = null, detail = '';
      if (opposite) {
        if (singleEdges.has(key)) { kind = 'single-track meet'; detail = `${a.start}-${a.end}/${start}-${end}`; }
      } else {
        const fromGap = a.start - start, toGap = a.end - end;
        const reversal = fromGap * toGap < 0;
        const sameFrom = a.fromPlatform !== null && b.fromPlatform !== null && String(a.fromPlatform) === String(b.fromPlatform);
        const sameTo = a.toPlatform !== null && b.toPlatform !== null && String(a.toPlatform) === String(b.toPlatform);
        const ktxPair = /KTX|SRT/.test(a.grade) && /KTX|SRT/.test(b.grade);
        const restricted = cannotOvertake(a.to, a.line) || (a.to === '평창' && ktxPair);
        if (reversal && (restricted || sameTo)) kind = 'illegal overtake';
        else if ((sameFrom && Math.abs(fromGap) < 3) || (sameTo && Math.abs(toGap) < 3)) kind = 'platform headway';
        else if (Math.abs(fromGap) < 3 && Math.abs(toGap) < 3) kind = 'close following';
        detail = `${fromGap}/${toGap}m, ${a.fromPlatform ?? '?'}/${b.fromPlatform ?? '?'}→${a.toPlatform ?? '?'}/${b.toPlatform ?? '?'}`;
      }
      if (!kind) continue;
      const pair = [a.no, b.no].sort((x, y) => Number(x) - Number(y)).join('/');
      const id = `${kind}|${pair}|${key}|${offset}`;
      if (seen.has(id)) continue;
      seen.add(id);
      issues.push({ kind, pair, section: `${a.from}–${a.to}`, line: a.line, detail });
    }
  }
}
const counts = Object.fromEntries([...new Set(issues.map(i => i.kind))].map(kind => [kind, issues.filter(i => i.kind === kind).length]));
const byLine = Object.entries(issues.reduce((map, issue) => (map[issue.line] = (map[issue.line] || 0) + 1, map), {})).sort((a, b) => b[1] - a[1]);
const rotationSource = fs.readFileSync(new URL('../js/nimbi_rail.js', import.meta.url), 'utf8');
const rotationStart = rotationSource.indexOf('const CONFIRMED_ROTATION =');
const rotationEnd = rotationSource.indexOf('\n// 042: 편성 운용', rotationStart);
const rotationContext = { ALL_TRAINS: trains };
vm.createContext(rotationContext);
vm.runInContext(`${rotationSource.slice(rotationStart, rotationEnd)};globalThis.rotation=CONFIRMED_ROTATION`, rotationContext);
const rotation = rotationContext.rotation;
const byNo = new Map(trains.map(train => [train.no, train]));
const sets = new Map(Object.values(rotation).map(item => [item.id, item.seq]));
const rotationIssues = [];
for (const [id, seq] of sets) {
  const first = byNo.get(seq[0]), last = byNo.get(seq.at(-1));
  if (!first || !last) { rotationIssues.push({ id, issue: 'missing train' }); continue; }
  if (first.stops[0].s !== last.stops.at(-1).s) rotationIssues.push({ id, issue: 'does not return to origin' });
  if (seq.length % 2) rotationIssues.push({ id, issue: 'odd number of trips' });
  for (let i = 1; i < seq.length; i++) {
    const previous = byNo.get(seq[i - 1]), next = byNo.get(seq[i]);
    if (!previous || !next) { rotationIssues.push({ id, issue: `${seq[i - 1]}→${seq[i]} missing train` }); continue; }
    if (previous.stops.at(-1).s !== next.stops[0].s) rotationIssues.push({ id, issue: `${seq[i - 1]}→${seq[i]} wrong turn station` });
    const arrival = previous.stops.at(-1).arr, departure = next.stops[0].dep;
    if (timed(arrival) && timed(departure)) {
      const gap = minute(departure) - minute(arrival);
      if (gap < 5) rotationIssues.push({ id, issue: `${seq[i - 1]}→${seq[i]} turn ${gap}m` });
    }
  }
}
console.log(JSON.stringify({ trains: trains.length, legs: legCount, unknownSegments: unknown.length, unknownTrains: new Set(unknown.map(i => i.no)).size, counts, affectedTrains: new Set(issues.flatMap(i => i.pair.split('/'))).size, topLines: byLine.slice(0, 15), confirmedRotationTrains: Object.keys(rotation).length, rotationSets: sets.size, rotationIssues: rotationIssues.length, rotationExamples: rotationIssues.slice(0, 20), issues: process.argv.includes('--all') ? issues : issues.slice(0, 100), unknown: unknown.slice(0, 20) }, null, 2));
