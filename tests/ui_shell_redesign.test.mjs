import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/nimbi_redesign.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../js/features/nimbi_shell.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/nimbi_rail.js',import.meta.url),'utf8');
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
  assert.match(css,/@media\(max-width:1023px\)/);
  assert.match(css,/@media\(max-width:767px\)/);
  assert.match(css,/grid-template-columns:repeat\(6,1fr\)/);
  assert.match(css,/font-variant-numeric:tabular-nums/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('라이트·다크·시스템 테마는 초기 화면 전에 적용되고 저장된다',()=>{
  assert.match(html,/localStorage\.getItem\('nimbi_theme'\)/);
  assert.match(html,/data-theme-choice="light"/);
  assert.match(html,/data-theme-choice="dark"/);
  assert.match(html,/data-theme-choice="system"/);
  assert.match(shell,/localStorage\.setItem\('nimbi_theme'/);
  assert.match(css,/\[data-theme="dark"\]/);
  assert.match(css,/--bg:#0d1117/);
});

test('홈과 역 화면은 카드 갤러리 대신 고밀도 표 컴포넌트를 사용한다',()=>{
  assert.match(shell,/class="rail-table"/);
  assert.match(shell,/class="station-table"/);
  assert.match(html,/id="station-directory-shell"/);
  assert.match(shell,/nimbiOpenStationDirectory/);
  assert.match(shell,/Object\.entries\(MAP_LINES\)/);
  assert.match(shell,/Object\.values\(MAP_LINES\)/);
});

test('지도는 노선 우선 표현과 저대비 보조 격자를 사용한다',()=>{
  assert.match(css,/\.map-coordinate-grid/);
  assert.match(css,/\.train-label\{opacity:0/);
  assert.match(shell,/map:\['Network Map','지도'\]/);
  assert.match(html,/>전체보기<\/button>/);
  assert.match(shell,/nimbiOpenNetwork/);
  assert.match(app,/map-station-hit/);
  assert.match(app,/pointerEvents='none'/);
  assert.match(app,/appendChild\(trainLayer\)/);
});

test('보조 화면은 테마 토큰과 하단 시트 구조를 공유한다',()=>{
  assert.match(css,/\.ticket-card,.tcard-back,.trip-widget,.journey-sheet/);
  assert.match(css,/\.global-search-dialog,.global-search-dialog>header/);
  assert.match(css,/\.cmp-row\.cmp-head,.rt-back-head,.tcard-back-head/);
  assert.match(css,/\.si-board-popup\{--bg:#0d1117/);
  assert.match(css,/\.filter-row\.open,#map-filter-panel,.map-popup\{position:fixed!important/);
  assert.match(css,/@keyframes nimbi-sheet-up/);
});

test('열차 상세와 검색 화면은 타임라인 및 compact workspace 규칙을 따른다',()=>{
  assert.match(css,/\.tl-row\{[^}]*border-bottom:0/);
  assert.match(css,/\.train-status-banner\.done\{[^}]*justify-content:center/);
  assert.match(css,/\.detail-head-actions\{position:absolute/);
  assert.match(css,/#panel-station>\.search-card,#panel-route>\.search-card,#panel-metroroute>\.search-card/);
  assert.match(css,/#map-train-count,#map-layer-btn\{height:36px/);
});

test('새 UI 자산은 서비스워커 캐시에 포함된다',()=>{
  assert.match(sw,/assets\/css\/nimbi_redesign\.css/);
  assert.match(sw,/js\/features\/nimbi_shell\.js/);
});
