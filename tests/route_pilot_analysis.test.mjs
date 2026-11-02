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

test('unresolved line pairs are never promoted to verified routes',()=>{
 assert.equal(analysis.candidates.length,14);assert.equal(analysis.candidates.filter(item=>item.status==='verified').length,0);
 assert.equal(analysis.pilotCandidate.status,'pending');assert.equal(analysis.pilotCandidate.branchNodeCount,1);
 assert.equal(analysis.pilotCandidate.geometry.length,analysis.pilotCandidate.trackPointIds.length);
 assert.ok(analysis.pilotCandidate.lengthRatio<1.01);assert.ok(analysis.candidates.some(item=>item.from==='평택'&&item.to==='천안'&&item.status==='unavailable'));
});
