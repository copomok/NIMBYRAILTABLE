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
  '20260802-taebaek'
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
  '20260803-jamsil-mokpo-srt-expansion'
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
    ['20260802-taebaek-summary.svg', '20260802-taebaek.svg']
  ]) {
    assert.ok(notices.includes(summary), `${summary} 연결이 필요합니다`);
    assert.ok(notices.includes(full), `${full} 연결이 필요합니다`);
  }
});

test('공지 이미지 배포 버전이 CSS·데이터·서비스워커에 함께 반영된다', () => {
  const index = read('index.html');
  const serviceWorker = read('sw.js');

  assert.match(index, /nimbi_rail\.css\?v=2026080302/);
  assert.match(index, /nimbi_rail_notices\.js\?v=2026080302/);
  assert.match(serviceWorker, /CACHE_NAME = 'nimbirail-2026090306'/);
});
