import fs from 'node:fs';
import vm from 'node:vm';

// Find a minimum same-day fleet for one two-terminal service without altering
// its train times. Usage: node tools/plan_rotation.mjs 5131 5158
const first = Number(process.argv[2]), last = Number(process.argv[3]);
if (!Number.isInteger(first) || !Number.isInteger(last) || first > last) throw new Error('Give first and last train numbers');
const context = {};
vm.createContext(context);
for (const file of ['nimbi_rail_data.js','nimbi_north_ingame_routes.js','nimbi_station_data.js','nimbi_north_station_revision.js','nimbi_north_rail_revision.js','nimbi_gonam_itx_revision.js','nimbi_pass_stations_revision.js','nimbi_20261027_revision.js']) {
  vm.runInContext(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
vm.runInContext('globalThis.trains = ALL_TRAINS', context);
const minute = value => { const [hour, min] = value.split(':').map(Number); return hour * 60 + min; };
const trips = context.trains.filter(train => Number(train.no) >= first && Number(train.no) <= last).map(train => {
  const from = train.stops[0], to = train.stops.at(-1), start = minute(from.dep);
  let end = minute(to.arr);
  if (end < start) end += 1440;
  return { no: train.no, from: from.s, to: to.s, start, end };
}).sort((a, b) => a.start - b.start || Number(a.no) - Number(b.no));
if (!trips.length) throw new Error('No trains found');
const terminals = new Set(trips.flatMap(trip => [trip.from, trip.to]));
if (terminals.size !== 2) throw new Error(`Not a two-terminal shuttle: ${[...terminals].join(', ')}`);
const maxStates = 2_000_000;

function solve(fleet) {
  const paths = Array.from({ length: fleet }, () => []);
  const lastTrip = Array(fleet).fill(-1);
  const seen = new Set();
  let aborted = false;
  function visit(index) {
    if (index === trips.length) return paths.every(path => path.length % 2 === 0) ? paths.filter(path => path.length).map(path => [...path]) : null;
    if (seen.size > maxStates) { aborted = true; return null; }
    const key = `${index}|${lastTrip.join(',')}|${paths.map(path => path.length % 2).join('')}`;
    if (seen.has(key)) return null;
    const trip = trips[index];
    for (let set = 0; set < fleet; set++) {
      const previousIndex = lastTrip[set];
      if (previousIndex === -1 && set > 0 && lastTrip[set - 1] === -1) continue;
      if (previousIndex !== -1) {
        const previous = trips[previousIndex];
        if (previous.to !== trip.from || trip.start - previous.end < 5) continue;
      }
      lastTrip[set] = index;
      paths[set].push(trip.no);
      const solution = visit(index + 1);
      if (solution) return solution;
      paths[set].pop();
      lastTrip[set] = previousIndex;
      if (aborted) return null;
    }
    seen.add(key);
    return null;
  }
  const sequences = visit(0);
  return { sequences, states: seen.size, aborted };
}
for (let fleet = 1; fleet <= trips.length / 2; fleet++) {
  const result = solve(fleet);
  if (result.sequences) {
    console.log(JSON.stringify({ first, last, trains: trips.length, minimumFleet: fleet, sequences: result.sequences }, null, 2));
    process.exit(0);
  }
  if (result.aborted) {
    console.log(JSON.stringify({ first, last, trains: trips.length, inconclusiveFromFleet: fleet, states: result.states }, null, 2));
    process.exit(2);
  }
}
console.log(JSON.stringify({ first, last, trains: trips.length, feasible: false }, null, 2));
process.exit(1);
