import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8');

test('의정부-대전 ITX-마음은 한강로 무시각 통과 뒤 남안양에 원본 시각을 매핑한다',()=>{
  const section=data.slice(
    data.indexOf('// 위에서 생성된 #1261~1270 전 편에 사진의 초 단위 템플릿을 최종 적용한다.'),
    data.indexOf('// 사진 원본 적용 후 기존 열차 전 편과 비교한 공유 선로 최소 시격 보정.')
  );
  assert.match(section,/\['한강로','통과',null\],\['남안양',3169,null\]/);
  assert.match(section,/arr==='통과'\?'통과'/);
  assert.doesNotMatch(section,/\['한강로',3169,null\]/);
});
