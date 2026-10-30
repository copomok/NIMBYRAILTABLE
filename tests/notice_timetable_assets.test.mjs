import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FULL_NOTICE_IDS = [
  '20260627-regional-changes-full',
  '20260627-chungju-itx-full',
  '20260703-suncheon-mugunghwa-full',
  '20260703-honam-ktx-full',
  '20260710-major-revision',
  '20260712-southern-inland',
  '20260717-regional-expansion',
  '20260729-mugunghwa',
  '20260731-regional-revision',
  '20260731-gyeongbuk-loop',
  '20260801-gyooe-loop',
  '20260802-taebaek',
  '20260911-north-formal',
  '20261008-gonam-itx',
  '20261029-overtake-retimings-full'
];
const SUMMARY_NOTICE_IDS = [
  '20260620-ktx-adjustments',
  '20260627-regional-changes',
  '20260627-chungju-itx',
  '20260703-overtake-corrections',
  '20260703-suncheon-mugunghwa',
  '20260703-honam-ktx',
  '20260718-taebaek-adjustments',
  '20260718-mugunghwa-1360',
  '20260723-conflict-corrections',
  '20260710-major-revision-summary',
  '20260712-southern-inland-summary',
  '20260717-regional-expansion-summary',
  '20260729-mugunghwa-summary',
  '20260731-regional-revision-summary',
  '20260731-gyeongbuk-loop-summary',
  '20260801-gyooe-loop-summary',
  '20260802-taebaek-summary',
  '20260803-jamsil-mokpo-srt-expansion',
  '20260911-north-formal-summary',
  '20261008-gonam-itx-summary',
  '20261023-metro-revision',
  '20261027-service-update',
  '20261029-overtake-audit',
  '20261030-north-timetable-revision'
];
const NOTICE_IDS = [...FULL_NOTICE_IDS, ...SUMMARY_NOTICE_IDS];

const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('공지용 전체 시간표 이미지가 유효한 SVG로 생성된다', () => {
  for (const id of FULL_NOTICE_IDS) {
    const file = path.join(ROOT, 'assets', 'notices', `${id}.svg`);
    assert.ok(fs.existsSync(file), `${id}.svg 파일이 필요합니다`);
    assert.ok(fs.statSync(file).size > 10_000, `${id}.svg 내용이 지나치게 작습니다`);

    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+width="1440"/);
    assert.match(svg, /NIMBYRAIL PASSENGER INFORMATION/);
    assert.match(svg, /class="trainNo(?: [^"]+)?">#\d+/);
    assert.match(svg, /도착|출발/);
  }
});

test('공지용 운행조정 요약표가 유효한 SVG로 생성된다', () => {
  for (const id of SUMMARY_NOTICE_IDS) {
    const file = path.join(ROOT, 'assets', 'notices', `${id}.svg`);
    assert.ok(fs.existsSync(file), `${id}.svg 파일이 필요합니다`);
    assert.ok(fs.statSync(file).size > 2_000, `${id}.svg 내용이 지나치게 작습니다`);

    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+width="1440"/);
    assert.match(svg, /NIMBYRAIL PASSENGER INFORMATION/);
    assert.match(svg, /<table|<rect/);
    assert.match(svg, /조정|운행|신설/);
  }
});

test('모든 시간표 공지가 앱 내부 이미지와 연결된다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  const serviceWorker = read('sw.js');

  for (const id of NOTICE_IDS) {
    const asset = `assets/notices/${id}.svg`;
    assert.ok(notices.includes(asset), `${asset} 공지 연결이 필요합니다`);
    assert.ok(serviceWorker.includes(asset), `${asset} 오프라인 캐시 등록이 필요합니다`);
  }

  assert.match(notices, /title:'열차 개정 전체 시간표를 이미지로 제공합니다'/);
  assert.doesNotMatch(notices, /claude\.ai\/public\/artifacts\/[^'"\s<]+[^\n]*(?:시간표|시각표)/i);
});

test('모든 기차 시간표 공지에는 전체 시간표 또는 요약표가 있다', () => {
  const source = `${read('data/nimbi_rail_notices.js')}\nglobalThis.__NOTICES__ = NOTICES;`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);

  const trainTimetableNotices = context.__NOTICES__.filter(notice =>
    notice.cat === 'timetable'
    && notice.title !== '경부선 급행 시간표가 수도권 중심으로 개정됩니다'
  );
  assert.ok(trainTimetableNotices.length >= 19);
  for (const notice of trainTimetableNotices) {
    assert.match(notice.body, /notice-timetable-attachment/, `${notice.title} 공지에 이미지가 필요합니다`);
  }
});

test('7월 31일 목포 계통은 남대구·부산 편도 4편을 한 표에 출발순으로 표시한다', () => {
  const svg = read('assets/notices/20260731-regional-revision.svg');
  const groupStart = svg.indexOf('무궁화호 · 목포 ↔ 남대구/부산');
  assert.ok(groupStart >= 0);
  const group = svg.slice(groupStart);

  for (const sequence of [
    ['#1501', '#1451', '#1503', '#1453'],
    ['#1452', '#1502', '#1454', '#1504']
  ]) {
    let previous = -1;
    for (const number of sequence) {
      const position = group.indexOf(number);
      assert.ok(position > previous, `${sequence.join(' → ')} 순서로 표시되어야 합니다`);
      previous = position;
    }
  }
});

test('7월 10일 장항선은 서대전·전주 열차를 한 통합 계통으로 표시한다', () => {
  const svg = read('assets/notices/20260710-major-revision.svg');
  assert.match(svg, /장항선 · 한강로 ↔ 서대전\/전주/);
  assert.doesNotMatch(svg, /장항선 · 한강로 ↔ 서대전<\/text>/);
  assert.doesNotMatch(svg, /장항선 · 한강로 ↔ 전주<\/text>/);

  for (const number of ['#1461', '#1466', '#1471', '#1490']) {
    assert.ok(svg.includes(number), `${number} 열차가 통합 계통에 포함되어야 합니다`);
  }
});

test('분기 계통 역은 가까운 종착지 뒤에 다른 분기 고유역을 묶어 표시한다', () => {
  const svg = read('assets/notices/20260710-major-revision.svg');
  const groupStart = svg.indexOf('장항선 · 한강로 ↔ 서대전/전주');
  const groupEnd = svg.indexOf('전라선 KTX', groupStart);
  const group = svg.slice(groupStart, groupEnd);
  const stations = [...group.matchAll(/class="station[^"]*">([^<]+)/g)].map(match => match[1]);
  for (const station of ['삼례', '전주', '봉동', '여산', '서대전']) {
    assert.ok(stations.includes(station), `${station} 역이 장항선 통합 표에 필요합니다`);
  }
  assert.ok(stations.indexOf('삼례') < stations.indexOf('전주'));
  assert.ok(stations.indexOf('전주') < stations.indexOf('봉동'));
  assert.ok(stations.indexOf('봉동') < stations.indexOf('여산'));
  assert.ok(stations.indexOf('여산') < stations.indexOf('서대전'));
});

test('전체 시간표는 등급색과 정차·통과 시각을 명확히 구분한다', () => {
  const svg = read('assets/notices/20260731-regional-revision.svg');
  assert.match(svg, /class="gradeBadge"/);
  assert.match(svg, /class="time pass"/);
  assert.match(svg, /fill="#eef0f2"/);
  assert.match(svg, /등급색 칸은 정차, 회색 칸은 통과/);
});

test('신설 계통 공지는 요약표와 전체 시간표를 함께 제공한다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  for (const [summary, full] of [
    ['20260627-chungju-itx.svg', '20260627-chungju-itx-full.svg'],
    ['20260703-suncheon-mugunghwa.svg', '20260703-suncheon-mugunghwa-full.svg'],
    ['20260703-honam-ktx.svg', '20260703-honam-ktx-full.svg'],
    ['20260710-major-revision-summary.svg', '20260710-major-revision.svg'],
    ['20260729-mugunghwa-summary.svg', '20260729-mugunghwa.svg'],
    ['20260802-taebaek-summary.svg', '20260802-taebaek.svg'],
    ['20260911-north-formal-summary.svg', '20260911-north-formal.svg'],
    ['20261008-gonam-itx-summary.svg', '20261008-gonam-itx.svg']
  ]) {
    assert.ok(notices.includes(summary), `${summary} 연결이 필요합니다`);
    assert.ok(notices.includes(full), `${full} 연결이 필요합니다`);
  }
});

test('공지 이미지 배포 버전이 CSS·데이터·서비스워커에 함께 반영된다', () => {
  const index = read('index.html');
  const serviceWorker = read('sw.js');

  assert.match(index, /nimbi_redesign\.css\?v=2026100703/);
  assert.match(index, /nimbi_rail_notices\.js\?v=2026103001/);
  assert.match(index, /nimbi_rail\.css\?v=2026100703/);
  assert.match(serviceWorker, /CACHE_NAME = 'nimbirail-2026103001'/);
});

test('전철 역명 변경 공지는 노선별 개명과 동명이역 해소 내용을 안내한다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  assert.match(notices, /title:'전철 일부 역명이 변경됩니다'/);
  for (const keyword of ['광주2호선', '월곡', '광명성남선', '안양천', '강서선', '대법원', '교하선·춘천선', '운행 시각은 변경되지 않습니다']) {
    assert.ok(notices.includes(keyword), `${keyword} 안내가 필요합니다`);
  }
});

test('10월 27일 공지는 여객 관점에서 모든 운행·노선 변경을 안내한다', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${read('data/nimbi_rail_notices.js')}\nglobalThis.__NOTICES__ = NOTICES;`, context);
  const notice = context.__NOTICES__.find(item => item.title === '10월 27일 열차 운행·노선 안내');
  assert.ok(notice);
  assert.equal(notice.cat, 'timetable');
  for (const keyword of ['#501~#526', '13회 왕복', '05:21', '05:31', '삼랑진–부산은 직통', '물금·북부산·동래', '#520은 17:30', '#524는 20:42', '#1692', '#1484', '11분', '교하선', '서산선', '광주1호선', '20261027-service-update.svg']) {
    assert.ok(notice.body.includes(keyword), `${keyword} 안내가 필요합니다`);
  }
  const svg = read('assets/notices/20261027-service-update.svg');
  for (const keyword of ['13회 왕복', '삼랑진 → 부산 직통', '#1484', '중랑 정차 4분 → 2분', '교하선', '서산선', '광주1호선']) {
    assert.ok(svg.includes(keyword), `${keyword} 요약 이미지 반영이 필요합니다`);
  }
});

test('10월 28일 개별 조정과 29일 전수 개정은 29일 공지 하나로 통합된다', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${read('data/nimbi_rail_notices.js')}\nglobalThis.__NOTICES__ = NOTICES;`, context);
  assert.equal(context.__NOTICES__.filter(item => item.date === '2026-10-28').length, 0);
  assert.equal(context.__NOTICES__.filter(item => item.date === '2026-10-29').length, 1);
  const notice = context.__NOTICES__.find(item => item.title === '전 열차 추월 검증 및 시간표 조정 안내');
  assert.ok(notice);
  assert.equal(notice.cat, 'timetable');
  for (const keyword of ['#1804', '6:20', '6:19', '#2078', '13:20', '13:15', '#1214', '17:48', '17:52', '#1642', '13:50', '13:55', '#438', '16:35', '16:30', '#1008', '10:37', '10:36', '457편', '547건', '#66', '17:20', '#78', '19:20', '61편']) {
    assert.ok(notice.body.includes(keyword), `${keyword} 안내가 필요합니다`);
  }
  assert.match(notice.body, /20261029-overtake-audit\.svg/);
  assert.match(notice.body, /20261029-overtake-retimings-full\.svg/);
  assert.doesNotMatch(notice.body, /20261028-minor-retimings\.svg/);
});

test('10월 29일 통합 요약 이미지는 기존 공문형 디자인과 최종 개정 내용을 유지한다', () => {
  const october29 = read('assets/notices/20261029-overtake-audit.svg');
  for (const pattern of [/fill="#f4f1e9"/, /class="brand"/, /class="section"/, /class="th headerText"/, /fill="#30343b"/]) {
    assert.match(october29, pattern);
  }
  assert.doesNotMatch(october29, /fill="#0e1b2b"|fill="#0b1728"/);
  for (const keyword of ['#1804 무궁화호', '#2078 ITX-청춘', '#1214 ITX-새마을', '17:52', '#1642 무궁화호', '13:55', '#438 KTX', '#1008 ITX-새마을', '1,879편', '547건', '457편', '0건', '1,270개', '11편', '3분 미만 간격', '산내 정차 상행 KTX 7편']) {
    assert.ok(october29.includes(keyword), `${keyword} 요약 내용이 필요합니다`);
  }
});

test('10월 29일 전체 변경 이미지는 보고서의 457편을 136개 계통으로 모두 표시한다', () => {
  const full = read('assets/notices/20261029-overtake-retimings-full.svg');
  const report = read('reports/2026-10-29-overtake-retimings.md');
  assert.equal((full.match(/class="trainNo">#\d+/g) || []).length, 457);
  assert.equal((full.match(/class="group">/g) || []).length, 136);
  for (const keyword of ['출발역', '도착역', '등급', '#2', '부산', '서울', 'KTX', '5:00', '5:01', '+1분', '#9763', '경흥', '목포', 'KTX-산천', '21:10', '21:13', '+3분']) {
    assert.ok(full.includes(keyword), `${keyword} 전체 변경 이미지 반영이 필요합니다`);
  }
  assert.doesNotMatch(full, /class="time">0\d:/, '시각의 시간 앞에 0을 붙이지 않습니다');
  assert.doesNotMatch(report, /\| 0\d:\d{2} \|/, '원본 보고서도 시각의 시간 앞에 0을 붙이지 않습니다');
});

test('UI 전면 개편 안내 공지가 승객 관점의 주요 변경점을 설명한다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  assert.match(notices, /님비레일 화면이 철도 정보 중심으로 새로워졌습니다/);
  for (const keyword of ['사이드바', '통합 검색', '모바일', '타임라인', '라이트·다크·시스템 테마']) {
    assert.ok(notices.includes(keyword), `${keyword} 안내가 필요합니다`);
  }
});

test('북한 지역 철도 공지는 노선 정보에서 정식 개편 내용과 검증 기준을 안내한다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  assert.match(notices, /cat:'route',[\s\S]*title:'북한 지역 철도 정식 운행 시간표 개편'/);
  assert.doesNotMatch(notices, /북한 지역 철도 (?:임시|시범) 운행 시간표/);
  assert.match(notices, /20260911-north-formal-summary\.svg/);
  assert.match(notices, /20260911-north-formal\.svg/);
  for (const keyword of ['ITX-마음', 'ITX-새마을', '전 역에 정차', '통과 불가역', '승강장']) assert.ok(notices.includes(keyword), `${keyword} 안내가 필요합니다`);
});

test('고남 경유 ITX-마음 신설 공지는 운행계획과 두 시간표 이미지를 안내한다', () => {
  const notices = read('data/nimbi_rail_notices.js');
  assert.match(notices, /title:'고남 경유 한강로–전주·순천 ITX-마음 신설'/);
  for (const keyword of ['#1981~#1990', '#1991~#1998', '110~125분', '승산·남면·창기', '대야', '남원 · 구례', '동일 승강장 중복 점유']) {
    assert.ok(notices.includes(keyword), `${keyword} 안내가 필요합니다`);
  }
  assert.match(notices, /20261008-gonam-itx-summary\.svg/);
  assert.match(notices, /20261008-gonam-itx\.svg/);
});
