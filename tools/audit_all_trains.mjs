import fs from 'node:fs';
import vm from 'node:vm';

// Read-only timetable audit: node tools/audit_all_trains.mjs [--all]
// Use --no-global-revision --correct-timeline for the pre-retiming baseline.
// An adjacent station/geoKey pair is used as a track proxy. This does not
// prove that two trains occupy the same physical track. Segments with
// unknown pass times are listed separately and cannot receive a safety verdict.
// Run the same data layers as index.html, without executing browser UI code.
const files = [
  'nimbi_rail_data.js', 'nimbi_north_ingame_routes.js', 'nimbi_station_data.js',
  'nimbi_north_station_revision.js', 'nimbi_north_rail_revision.js',
  'nimbi_gonam_itx_revision.js', 'nimbi_pass_stations_revision.js',
  'nimbi_20261027_revision.js', 'nimbi_realplat.js', 'nimbi_homonyms.js',
  'nimbi_regional_platforms.js', 'nimbi_gyeongui_20261027_revision.js',
  'nimbi_nyongwon_20261027_stations.js',
  'nimbi_global_schedule_revision.js',
  'nimbi_20261030_revision.js',
];
const context = {};
vm.createContext(context);
for (const file of files) {
  if (file === 'nimbi_global_schedule_revision.js' && process.argv.includes('--no-global-revision')) continue;
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
vm.runInContext('globalThis.trains = ALL_TRAINS; globalThis.platforms = REAL_PLAT', context);
const trains = context.trains;
const platforms = context.platforms;
const minute = value => { const [hour, min] = String(value).split(':').map(Number); return hour * 60 + min; };
const timed = value => /^\d{1,2}:\d{2}$/.test(value || '');
const originalTurnTimes = new Map(trains.map(train => [train.no, {
  departure: train.stops[0]?.dep,
  arrival: train.stops.at(-1)?.arr,
}]));
const shifts = new Map(process.argv.filter(arg => arg.startsWith('--shift=')).map(arg => {
  const [no, amount] = arg.slice(8).split(':');
  if (!no || !Number.isInteger(Number(amount))) throw new Error(`Invalid shift: ${arg}`);
  return [no, Number(amount)];
}));
const shiftFile = process.argv.find(arg => arg.startsWith('--shift-file='))?.slice(13);
if (shiftFile) for (const [no, amount] of Object.entries(JSON.parse(fs.readFileSync(shiftFile, 'utf8')).changed || {})) shifts.set(no, amount);
if (process.argv.includes('--correct-timeline')) for (const train of trains) {
  for (let index = 1; index < train.stops.length; index++) {
    const previous = train.stops[index - 1], stop = train.stops[index];
    if (previous.s !== '수영' || stop.s !== '병목안' || !timed(previous.dep) || !timed(stop.arr)) continue;
    if ((minute(previous.dep) - minute(stop.arr) + 1440) % 1440 !== 9) continue;
    const fixed = (minute(previous.dep) + 5) % 1440;
    stop.arr = `${Math.floor(fixed / 60)}:${String(fixed % 60).padStart(2, '0')}`;
  }
}
const minGapArg = process.argv.find(arg => arg.startsWith('--minimum-gap='));
const minGap = minGapArg ? Number(minGapArg.slice('--minimum-gap='.length)) : 3;
if (!Number.isInteger(minGap) || minGap < 1 || minGap > 30) throw new Error('Invalid minimum gap');
for (const train of trains) {
  const delta = shifts.get(train.no);
  if (!delta) continue;
  for (const stop of train.stops) for (const field of ['arr', 'dep']) {
    if (!timed(stop[field])) continue;
    const shifted = (minute(stop[field]) + delta + 1440 * 10) % 1440;
    stop[field] = `${Math.floor(shifted / 60)}:${String(shifted % 60).padStart(2, '0')}`;
  }
}
const forbidden = new Set(['사천','함안','추풍령','불국사','입실','함평','어상천','영월','신동','무릉','문산','일산','수영','천안','녕원','덕천','북창','은산','향산','희천']);
const yeongdongStations = new Set(['영주','봉화','법전','춘양','소천','분천','승부','석포','동점','철암','황지','동백산','도계','신기','동해']);
const jeongseonStations = new Set(['정선','화암','북평(정선)','나전','아우라지','구절리']);
const cannotOvertake = (station, line) => forbidden.has(station) ||
  (line === '영동선' && station !== '구문소' && yeongdongStations.has(station)) ||
  (line === '정선선' && jeongseonStations.has(station));
const singleLineStations = {
  교외선: ['의정부','가능','송추','장흥','고양','관산','주교','행신'],
  보은선: ['문의','회인','수한','보은','장안','속리산','화남','화령','낙서','서상주','상주'],
};
const singleEdges = new Set(Object.entries(singleLineStations).flatMap(([, stops]) => stops.slice(1).map((stop, index) => [stops[index], stop].sort().join('|'))));
for (const [a, b] of [['주교','능곡'], ['능곡','행신']]) singleEdges.add([a, b].sort().join('|'));
const lineNames = train => String(train.line).split(/[·,]/).map(s => s.trim());
const stopPlatform = (train, stop) => stop.p ?? platforms[train.no]?.[stop.s] ?? null;
const intervals = new Map();
const stationVisits = new Map();
const unknown = [];
const invalidChronology = [];
let legCount = 0;
for (const train of trains) {
  const lines = lineNames(train);
  let day = 0, previous = null;
  let invalid = false;
  const points = train.stops.map((stop, index) => {
    const value = stop.arr || stop.dep;
    if (!timed(value)) return { stop, index, time: null };
    let time = minute(value) + day;
    if (previous !== null && time < previous) {
      if (previous - time < 720) { invalidChronology.push({ no: train.no, station: stop.s, time: value }); invalid = true; }
      day += 1440; time += 1440;
    }
    previous = time;
    let departure = timed(stop.dep) ? minute(stop.dep) + day : time;
    if (departure < time) departure += 1440;
    return { stop, index, time, departure };
  });
  if (invalid) continue;
  for (let i = 1; i + 1 < points.length; i++) {
    const before = points[i - 1], here = points[i], after = points[i + 1];
    if (before.time === null || here.time === null || after.time === null) continue;
    const key = [before.stop.geoKey || before.stop.s, here.stop.geoKey || here.stop.s, after.stop.geoKey || after.stop.s].join('|');
    const list = stationVisits.get(key) || [];
    list.push({ no: train.no, stop: here.stop, station: here.stop.s, arr: here.time, dep: here.departure, grade: train.grade, line: lines.join('·'), platform: stopPlatform(train, here.stop) });
    stationVisits.set(key, list);
  }
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    if (a.time === null || b.time === null) { unknown.push({ no: train.no, from: a.stop.s, to: b.stop.s }); continue; }
    const base = { no: train.no, grade: train.grade, dir: train.dir, from: a.stop.s, to: b.stop.s, start: a.departure, end: b.time, fromPlatform: stopPlatform(train, a.stop), toPlatform: stopPlatform(train, b.stop), lines, line: lines.join('·') };
    const key = [a.stop.geoKey || base.from, b.stop.geoKey || base.to].sort().join('|');
    const list = intervals.get(key) || [];
    list.push(base); intervals.set(key, list);
    legCount++;
  }
}
const issues = [];
const seen = new Set();
for (const visits of stationVisits.values()) for (let i = 0; i < visits.length; i++) for (let j = i + 1; j < visits.length; j++) {
  const a = visits[i], b = visits[j];
  if (a.no === b.no) continue;
  for (const offset of [-1440, 0, 1440]) {
    const arrivalGap = a.arr - b.arr - offset, departureGap = a.dep - b.dep - offset;
    if (arrivalGap * departureGap >= 0) continue;
    const slow = arrivalGap < 0 ? a : b, fast = arrivalGap < 0 ? b : a;
    const fastTime = fast.arr + (fast === b ? offset : 0);
    const slowArr = slow.arr + (slow === b ? offset : 0), slowDep = slow.dep + (slow === b ? offset : 0);
    const fasterPasses = !timed(fast.stop.dep) || fast.arr === fast.dep;
    const samePlatform = slow.platform !== null && fast.platform !== null && String(slow.platform) === String(fast.platform);
    const ktxPair = /KTX|SRT/.test(a.grade) && /KTX|SRT/.test(b.grade);
    const blocked = forbidden.has(a.station) || (a.station === '평창' && ktxPair) ||
      ((a.line.includes('영동선') || b.line.includes('영동선')) && a.station !== '구문소' && yeongdongStations.has(a.station)) ||
      ((a.line.includes('정선선') || b.line.includes('정선선')) && jeongseonStations.has(a.station));
    if (fasterPasses && fastTime >= slowArr && fastTime <= slowDep && !samePlatform && !blocked) continue;
    const pair = [a.no, b.no].sort((x, y) => Number(x) - Number(y)).join('/');
    const id = `illegal station overtake|${pair}|${a.station}|${offset}`;
    if (seen.has(id)) continue;
    seen.add(id);
    issues.push({ kind: 'illegal station overtake', pair, section: a.station, line: a.line, detail: `${slow.no} ${slowArr}-${slowDep} / ${fast.no} ${fastTime}${fasterPasses ? ' 통과' : ' 정차'}${blocked ? ', 추월 금지 역' : ''}${samePlatform ? ', 동일 승강장' : ''}` });
  }
}
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
        // 순서가 역전된 구간 안에는 추월 가능한 역이 없다. 승강장이나
        // 종착역의 추월 허용 여부와 무관하게 구간 내부 추월은 불가능하다.
        if (reversal) kind = 'illegal overtake';
        else if ((sameFrom && Math.abs(fromGap) < minGap) || (sameTo && Math.abs(toGap) < minGap)) kind = 'platform headway';
        else if (Math.abs(fromGap) < minGap && Math.abs(toGap) < minGap) kind = 'close following';
        detail = `${fromGap}/${toGap}m, ${a.fromPlatform ?? '?'}/${b.fromPlatform ?? '?'}→${a.toPlatform ?? '?'}/${b.toPlatform ?? '?'}${restricted ? ', 추월 금지 역' : ''}`;
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
// 구간이 겹치지 않아도 역 자체에서 같은 승강장을 거의 동시에 쓰면 충돌한다.
const stationEvents = new Map();
for (const train of trains) for (const [index, stop] of train.stops.entries()) {
  if (stop.dep == null && index < train.stops.length - 1) continue;
  const platform = stopPlatform(train, stop);
  if (platform == null) continue;
  const station = stop.geoKey || stop.s;
  const key = `${station}|${platform}`;
  const events = stationEvents.get(key) || [];
  for (const value of new Set([stop.arr, stop.dep].filter(timed))) events.push({ no: train.no, time: minute(value) });
  stationEvents.set(key, events);
}
for (const [key, events] of stationEvents) {
  events.sort((a, b) => a.time - b.time);
  const extended = [...events, ...events.map(event => ({ ...event, time: event.time + 1440 }))];
  for (let i = 0; i < events.length; i++) for (let j = i + 1; j < extended.length && extended[j].time - extended[i].time < minGap; j++) {
    if (extended[i].no === extended[j].no) continue;
    const pair = [extended[i].no, extended[j].no].sort((a, b) => Number(a) - Number(b)).join('/');
    const id = `station headway|${pair}|${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    issues.push({ kind: 'station headway', pair, section: key, line: '역 승강장', detail: `${extended[i].time}-${extended[j].time} (${extended[j].time - extended[i].time}m)` });
  }
}
const counts = Object.fromEntries([...new Set(issues.map(i => i.kind))].map(kind => [kind, issues.filter(i => i.kind === kind).length]));
const byLine = Object.entries(issues.reduce((map, issue) => (map[issue.line] = (map[issue.line] || 0) + 1, map), {})).sort((a, b) => b[1] - a[1]);
const rotationSource = fs.readFileSync(new URL('../js/nimbi_rail.js', import.meta.url), 'utf8');
const rotationStart = rotationSource.indexOf('const CONFIRMED_ROTATION =');
const rotationEnd = rotationSource.indexOf('\n// 042: 편성 운용', rotationStart);
const rotationContext = { ALL_TRAINS: trains };
vm.createContext(rotationContext);
vm.runInContext(`${rotationSource.slice(rotationStart, rotationEnd).replace('  const m={};\n  sets.forEach', '  globalThis.rotationSets=sets;\n  const m={};\n  sets.forEach')};globalThis.rotation=CONFIRMED_ROTATION`, rotationContext);
const rotation = rotationContext.rotation;
const byNo = new Map(trains.map(train => [train.no, train]));
const sets = new Map(Object.values(rotation).map(item => [item.id, item.seq]));
const rotationDuplicates = Object.entries(rotationContext.rotationSets.flatMap(set => set.seq).reduce((map, no) => (map[no] = (map[no] || 0) + 1, map), {})).filter(([, count]) => count > 1);
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
    const arrival = originalTurnTimes.get(previous.no)?.arrival;
    const departure = originalTurnTimes.get(next.no)?.departure;
    if (timed(arrival) && timed(departure)) {
      // Compare the original forward turn with both whole-train shifts.
      // Merely comparing wrapped clock times can mistake a moved midnight
      // service for a 23-hour layover, or conceal a negative same-day turn.
      const gap = (minute(departure) - minute(arrival) + 1440) % 1440
        + (shifts.get(next.no) || 0) - (shifts.get(previous.no) || 0);
      if (gap < 5) rotationIssues.push({ id, issue: `${seq[i - 1]}→${seq[i]} turn ${gap}m` });
    }
  }
}
const rotationsOnly = process.argv.includes('--rotations');
const focusTrain = process.argv.find(arg => arg.startsWith('--train='))?.slice(8);
console.log(JSON.stringify({ trains: trains.length, appliedRevision: context.NIMBI_GLOBAL_SCHEDULE_APPLIED || null, legs: legCount, unknownSegments: unknown.length, unknownTrains: new Set(unknown.map(i => i.no)).size, invalidChronology, counts, affectedTrains: new Set(issues.flatMap(i => i.pair.split('/'))).size, topLines: byLine.slice(0, 15), confirmedRotationTrains: Object.keys(rotation).length, rotationSets: sets.size, rotationDuplicates, rotationIssues: rotationIssues.length, rotationExamples: process.argv.includes('--all') || rotationsOnly ? rotationIssues : rotationIssues.slice(0, 20), issues: rotationsOnly ? [] : focusTrain ? issues.filter(issue => issue.pair.split('/').includes(focusTrain)) : process.argv.includes('--all') ? issues : issues.slice(0, 100), unknown: unknown.slice(0, 20) }, null, 2));
