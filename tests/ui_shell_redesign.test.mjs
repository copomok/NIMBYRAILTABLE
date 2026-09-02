import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_redesign.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../js/features/nimbi_shell.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('새 애플리케이션 셸은 기존 패널과 별도로 내비게이션·검색·모바일 메뉴를 제공한다',()=>{
  assert.match(html,/class="app-sidebar"/);
  assert.match(html,/id="global-search-input"/);
  assert.match(html,/class="mobile-bottom-nav"/);
  assert.match(html,/id="panel-train"/);
  assert.match(html,/id="panel-station"/);
  assert.match(html,/id="panel-map"/);
});

test('통합 검색은 초성 검색과 키보드 탐색을 기존 조회 함수에 연결한다',()=>{
  assert.match(shell,/typeof matchesQuery/);
  assert.match(shell,/event\.metaKey\|\|event\.ctrlKey/);
  assert.match(shell,/ArrowDown/);
  assert.match(shell,/jumpToTrain/);
  assert.match(shell,/openStationDetail/);
});

test('반응형 레이아웃은 desktop, tablet, mobile 구간을 분리한다',()=>{
  assert.match(css,/--sidebar-w:232px/);
  assert.match(css,/@media\(max-width:1024px\)/);
  assert.match(css,/@media\(max-width:767px\)/);
  assert.match(css,/font-variant-numeric:tabular-nums/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('새 UI 자산은 서비스워커 캐시에 포함된다',()=>{
  assert.match(sw,/assets\/css\/nimbi_redesign\.css/);
  assert.match(sw,/js\/features\/nimbi_shell\.js/);
});
