import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
const start=app.indexOf('donghae:{');
const end=app.indexOf('\nyeongdong:{',start);
const donghae=app.slice(start,end);
const firstRoute=donghae.slice(donghae.indexOf('stations:['),donghae.indexOf(']}',donghae.indexOf('stations:[')));

test('동해선 본선은 간성에서 강릉을 거쳐 부산까지 연속된다',()=>{
  const ordered=['간성','속초','양양','주문','강릉','동강릉','옥계','동해','북평','삼척','울진','영덕','포항','안강','경주','태화강','부산'];
  let previous=-1;
  for(const station of ordered){
    const index=firstRoute.indexOf(`{n:'${station}'`);
    assert.ok(index>previous,`${station} 본선 순서`);
    previous=index;
  }
});

test('남강릉 명칭과 안강-건천 동해선 지선이 제거된다',()=>{
  assert.doesNotMatch(app,/남강릉/);
  assert.doesNotMatch(donghae,/\{n:'안강'[^}]*\}[\s\S]{0,80}\{n:'건천'/);
  assert.doesNotMatch(donghae,/\{n:'건천'[^}]*\}[\s\S]{0,80}\{n:'안강'/);
});
