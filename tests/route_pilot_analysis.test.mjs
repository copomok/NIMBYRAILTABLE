import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analysis=JSON.parse(fs.readFileSync(new URL('../data/nimbi_route_pilot_analysis.json',import.meta.url),'utf8'));

test('save line analysis keeps source identity and parsed entity counts',()=>{
 assert.equal(analysis.source.sha256,'9ef9cd8bec9a773e43830e11d07ea7a2f3b1206f4faa7b374e5e08adbbf61530');
 assert.equal(analysis.source.declaredLineCount,360);assert.equal(analysis.source.parsedLineCount,358);
 assert.equal(analysis.line.name,'서울-대전 무궁화호');assert.equal(analysis.line.code,'L-10900400');assert.equal(analysis.line.route.length,15);
 assert.deepEqual(analysis.line.route.slice(0,3).map(stop=>stop.name),['서울','남안양','수원']);
});

test('mainline representative and depot connector remain distinct',()=>{
 assert.equal(analysis.candidates.length,14);assert.equal(analysis.candidates.filter(item=>item.status==='verified').length,1);
 assert.equal(analysis.pilot.status,'verified');assert.equal(analysis.pilot.detailLevel,'mainline-representative');assert.deepEqual([analysis.pilot.from,analysis.pilot.to],['남안양','수원']);
 assert.equal(analysis.pilot.geometry.length,analysis.pilot.trackPointIds.length);assert.ok(analysis.pilot.lengthRatio<1.1);
 assert.equal(analysis.depotConnectorCandidate.status,'depot-connector');assert.deepEqual([analysis.depotConnectorCandidate.from,analysis.depotConnectorCandidate.to],['신탄진','회덕역 / 대전차량기지']);
 assert.ok(analysis.candidates.some(item=>item.from==='평택'&&item.to==='천안'&&item.status==='unavailable'));
});

test('isolated components stay visible until parser gaps can be ruled out',()=>{
 const topology=analysis.topologyClassification;assert.ok(topology.componentCount>10000);assert.ok(topology.unreferencedTrackPointCount>20000);
 assert.equal(topology.policy.connectedDeadEnd,'include');assert.equal(topology.policy.explicitMerge,'include');assert.equal(topology.policy.connectedWithoutService,'include');
 assert.equal(topology.policy.fullyIsolatedWithoutLineReference,'exclude-after-parser-validation');assert.equal(topology.policy.stationTrackDetail,'collapse-to-mainline-representative');
});
