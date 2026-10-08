import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
for(const file of [
  'data/nimbi_station_data.js','data/nimbi_metro.js','data/nimbi_metro_sched.js',
  'data/nimbi_metro_geo.js','data/nimbi_metro_20260924_update.js',
  'data/nimbi_platform_db.js','data/nimbi_realplat.js','data/nimbi_homonyms.js',
  'data/nimbi_station_db_updates.js','data/nimbi_metro_platform_directions.js',
  'data/nimbi_metro_station_renames.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
vm.runInContext('globalThis.L=METRO_LINES;globalThis.S=METRO_SCHED;globalThis.D=STATION_DB;globalThis.P=PLATFORM_DB;globalThis.M=METRO_PLATFORM_DIRECTIONS',context);

const stations=line=>Array.from(context.L.find(item=>item.name===line).stations);

assert.ok(stations('광주1호선').includes('일곡'));
assert.ok(!stations('광주1호선').some(name=>name.startsWith('일곡(')));
assert.ok(stations('광주2호선').includes('월곡'));
assert.ok(!stations('광주2호선').includes('일곡'));
assert.ok(stations('광명성남선').includes('안양천'));
assert.ok(!stations('광명성남선').some(name=>name.startsWith('비산')));
assert.ok(stations('안산안양선').includes('비산'));
assert.ok(context.D['일곡역']&&context.D['월곡역']&&context.D['안양천역']);
assert.equal(context.D['일곡(광주북부)역'],undefined);
assert.equal(context.D['비산(만안)역'],undefined);
assert.ok(context.P['일곡역']&&context.P['월곡역']&&context.P['안양천역']);
assert.ok(context.M.lines['광주1호선'].platforms['일곡']);
assert.ok(context.M.lines['광주2호선'].platforms['월곡']);
assert.ok(context.M.lines['광명성남선'].platforms['안양천']);

console.log('metro station renames passed');
