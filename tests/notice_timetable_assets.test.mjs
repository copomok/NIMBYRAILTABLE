import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTICE_IDS = [
  '20260710-major-revision',
  '20260712-southern-inland',
  '20260717-regional-expansion',
  '20260729-mugunghwa',
  '20260731-regional-revision',
  '20260731-gyeongbuk-loop',
  '20260801-gyooe-loop',
  '20260802-taebaek'
];

const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('공지용 전체 시간표 이미지가 유효한 SVG로 생성된다', () => {
  for (const id of NOTICE_IDS) {
    const file = path.join(ROOT, 'assets', 'notices', `${id}.svg`);
    assert.ok(fs.existsSync(file), `${id}.svg 파일이 필요합니다`);
    assert.ok(fs.statSync(file).size > 20_000, `${id}.svg 내용이 지나치게 작습니다`);

    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+width="1440"/);
    assert.match(svg, /NIMBYRAIL PASSENGER INFORMATION/);
    assert.match(svg, /class="trainNo">#\d+/);
    assert.match(svg, /도착|출발/);
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

test('공지 이미지 배포 버전이 CSS·데이터·서비스워커에 함께 반영된다', () => {
  const index = read('index.html');
  const serviceWorker = read('sw.js');

  assert.match(index, /nimbi_rail\.css\?v=2026080202/);
  assert.match(index, /nimbi_rail_notices\.js\?v=2026080202/);
  assert.match(serviceWorker, /CACHE_NAME = 'nimbirail-2026080202'/);
});
