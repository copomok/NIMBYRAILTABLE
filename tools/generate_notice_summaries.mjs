import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'notices');

function loadNotices() {
  const source = fs.readFileSync(path.join(ROOT, 'data', 'nimbi_rail_notices.js'), 'utf8');
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__SUMMARY_NOTICES__=NOTICES;`, context, {
    filename: 'nimbi_rail_notices.js'
  });
  return Array.from(context.__SUMMARY_NOTICES__ || []);
}

const manualTable = (heading, headers, rows) => ({
  heading,
  rows: [
    headers.map(text => ({ header: true, text })),
    ...rows.map(row => row.map(text => ({ header: false, text })))
  ]
});

const CONFIGS = [
  {
    id: '20260620-ktx-adjustments',
    noticeTitle: 'KTX 시간표 미세조정 안내',
    title: 'KTX 운행시간 조정 대상열차',
    subtitle: '서울–부산·한강로–포항/창녕 계통',
    callouts: ['시각은 시발역 출발 기준 · 앞당김과 늦춤을 열차별로 확인해 주세요.']
  },
  {
    id: '20260627-regional-changes',
    noticeTitle: '경부선·보은선 ITX새마을 및 한강로-강릉 무궁화호 시간표 개정',
    title: '보은 연장·강릉 계통 운행계획',
    subtitle: 'ITX-새마을 연장 및 무궁화호 신설',
    callouts: ['서울–보은 ITX-새마을 4왕복 · 한강로–강릉 무궁화호 6왕복']
  },
  {
    id: '20260627-chungju-itx',
    noticeTitle: '충주행 ITX-마음이 개통되었습니다',
    title: '한강로–충주 ITX-마음 운행계획',
    subtitle: '중부내륙선 경유 · 하루 2왕복',
    callouts: ['한강로–충주 편도 약 1시간 8분']
  },
  {
    id: '20260703-overtake-corrections',
    noticeTitle: '개활선 무단 추월(역전) 구간 시간표 조정',
    title: '개활선 추월 해소 운행조정 대상열차',
    subtitle: '대피역 정차·발차 순서·동시 출발 조정',
    callouts: ['추월은 정차역에서만 이뤄지도록 조정 · 표에 없는 구간 시각은 종전과 동일']
  },
  {
    id: '20260703-suncheon-mugunghwa',
    noticeTitle: '한강로~순천 무궁화호 신설 (1491~1496)',
    title: '한강로–순천 무궁화호 운행계획',
    subtitle: '경부선·호남선·경전선 경유 · 하루 3왕복',
    callouts: ['한강로–순천 장거리 직결 운행 · #1491~#1496']
  },
  {
    id: '20260703-honam-ktx',
    noticeTitle: '호남고속선 KTX 신설 (401~460)',
    title: '호남고속선 KTX 신설 운행계획',
    subtitle: '서울–목포 급행·일반·완행 60편',
    callouts: ['정차역이 다른 3개 계통을 통합해 약 30~40분 간격으로 운행']
  },
  {
    id: '20260718-taebaek-adjustments',
    noticeTitle: '청량리~태백황지 무궁화호 시간표 개정',
    title: '태백황지 출발시각 조정 대상열차',
    subtitle: '회차시간 확보를 위한 상행 5편 조정',
    callouts: ['태백황지 회차 여유 4분 확보 · 이후 정차역 시각도 순차 조정']
  },
  {
    id: '20260718-mugunghwa-1360',
    noticeTitle: '무궁화호 #1360 신설 · 운용표 보완',
    title: '무궁화호 #1360 신설·운용 조정',
    subtitle: '대전–서울 완행 계통 및 편성 운용 보완',
    callouts: [
      '운용표: 대전 4편성(#1389→#1392→#1395→#1398) · 보은 2편성(#1895→#1898)',
      '행신·전주 편성의 누락·중복 기재도 함께 정정'
    ]
  },
  {
    id: '20260723-conflict-corrections',
    noticeTitle: '열차 시간표 조정 안내 (충돌·무단추월 해소)',
    title: '충돌·무단추월 해소 운행조정 대상열차',
    subtitle: '미세조정·정차역 변경·운행순서 정비',
    callouts: [
      '통과→정차: 수영 KTX 14편 · 추풍령 무궁화 3편 · 여산·회덕 무궁화 12편',
      '제주→부산 KTX 10편은 추자·노화 정차 추가 · #1481은 전 구간 1분 앞당김'
    ]
  },
  {
    id: '20260710-major-revision-summary',
    noticeTitle: '시간표 대개정 — 호남고속선·장항선·전라선·충북선·순천 계통',
    title: '7월 10일 신설·개편 요약',
    subtitle: '호남고속선·장항선·전라선·충북선·순천 계통',
    callouts: ['신설·대개편 계통은 전체 시간표에서 역별 시각을 함께 확인할 수 있습니다.']
  },
  {
    id: '20260712-southern-inland-summary',
    noticeTitle: '남부내륙선 개통 — 약목~거제 9개 계통 운행 개시',
    title: '남부내륙선 신설 계통 요약',
    subtitle: 'KTX·ITX·무궁화호·남도해양 9개 계통',
    callouts: ['수도권·대구·대전·호남에서 거제를 직결하는 148편의 전체 시간표를 함께 제공합니다.']
  },
  {
    id: '20260717-regional-expansion-summary',
    noticeTitle: '시간표 개정 — 수도권·강원·호남 8개 계통 신설·확충',
    title: '수도권·강원·호남 신설 계통 요약',
    subtitle: '고속·특급·일반열차 8개 계통·114편',
    callouts: ['열차 등급과 첫차 시간대를 요약했으며, 역별 시각은 전체 시간표를 확인해 주세요.']
  },
  {
    id: '20260729-mugunghwa-summary',
    noticeTitle: '무궁화호 4개 운행 계통이 신설됩니다',
    title: '무궁화호 신설 계통 요약',
    subtitle: '서울·영동·목포에서 남대구·부산 방면',
    tables: [manualTable('새로 운행하는 열차', ['계통', '열차번호', '운행 횟수', '이용 안내'], [
      ['서울 ↔ 남대구(조치원·세종)', '#1311~#1328', '9회 왕복', '세종세천선 경유'],
      ['영동 ↔ 밀양 ↔ 부산', '#1331~#1350', '10회 왕복', '밀양선 경유'],
      ['목포 ↔ 남대구/부산', '#1451~#1454·#1501~#1504', '통합 4회 왕복', '약 5시간 간격 번갈아 운행']
    ])],
    callouts: ['목포–남대구·부산은 하나의 통합 계통으로 안내합니다.']
  },
  {
    id: '20260731-regional-revision-summary',
    noticeTitle: '지역·광역열차 시간표 전면 개정 및 신규 운행 안내',
    title: '지역·광역열차 신설·개편 요약',
    subtitle: 'SRT·ITX·무궁화호 10개 운행 계통',
    callouts: ['목포–남대구/부산은 통합 계통으로 방향별 4편을 한 표에 배치합니다.']
  },
  {
    id: '20260731-gyeongbuk-loop-summary',
    noticeTitle: '경북순환 ITX-마음 신설 · 충주–남대구 ITX-마음 첫·막차 신설',
    title: '경북순환·충주–남대구 신설 요약',
    subtitle: 'ITX-마음 12편 운행계획',
    tables: [manualTable('새로 운행하는 열차', ['계통', '열차번호', '운행 횟수', '운행 안내'], [
      ['경북순환 ITX-마음', '#4451~#4458', '하루 8회', '남대구 출발 순환 운행'],
      ['충주 ↔ 남대구 ITX-마음', '#1885~#1888', '2회 왕복', '이른 첫차·늦은 막차']
    ])],
    callouts: ['경북순환과 충주–남대구 열차는 같은 2개 편성이 연결 운행합니다.']
  },
  {
    id: '20260801-gyooe-loop-summary',
    noticeTitle: '교외선 순환 무궁화호 상·하행 정의 변경 및 시간표 개정',
    title: '교외선 순환 운행조정 요약',
    subtitle: '상·하행 정의 변경·80분 간격 유지',
    callouts: ['신규 계통이 아닌 운행방향·시각 조정으로, 요약표 중심으로 안내합니다.']
  },
  {
    id: '20260802-taebaek-summary',
    noticeTitle: '태백선 ITX-새마을·KTX-이음 신설 및 남도해양 열차번호 변경',
    title: '태백선 신설·남도해양 변경 요약',
    subtitle: '강릉–대전·광주 신설 및 남도해양 번호 변경',
    callouts: ['신설 2개 계통은 전체 시간표를 함께 제공하며, 남도해양은 번호만 변경됩니다.']
  },
  {
    id: '20260803-jamsil-mokpo-srt-expansion',
    noticeTitle: '잠실–목포 SRT가 14회 왕복으로 증편됩니다',
    title: '잠실–목포 SRT 증편 운행 안내',
    subtitle: '하루 14회 왕복 · 60~90분 간격 · 심야 운행 확대',
    tables: [manualTable('증편 전후 운행계획', ['구분', '열차번호', '운행 횟수', '배차 간격', '마지막 열차'], [
      ['기존', '#801~#822', '11회 왕복', '약 1시간 20분~2시간', '잠실 21:12 / 목포 22:45 출발'],
      ['변경', '#801~#828', '14회 왕복', '약 1시간 19분~1시간 25분', '잠실 22:58 / 목포 23:31 출발']
    ])],
    callouts: [
      '막차 도착: 목포 00:26 · 잠실 00:59',
      '기존 정차역·승강장·편도 약 1시간 28분의 운행시간은 유지됩니다.'
    ]
  }
];

const decode = value => String(value || '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&rarr;|&gt;/g, '→')
  .replace(/&larr;|&lt;/g, '←')
  .replace(/&middot;/g, '·')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function extractTables(body) {
  const tables = [];
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = tablePattern.exec(body))) {
    const before = body.slice(0, match.index);
    const headings = [...before.matchAll(/<strong>\s*■\s*([\s\S]*?)<\/strong>/gi)];
    const heading = decode(headings.at(-1)?.[1] || '운행조정 내역');
    const rows = [];
    for (const rowMatch of match[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<t([hd])[^>]*>([\s\S]*?)<\/t[hd]>/gi)]
        .map(cell => ({ header: cell[1].toLowerCase() === 'h', text: decode(cell[2]) }));
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push({ heading, rows });
  }
  return tables;
}

function wrapText(value, maxChars) {
  const text = String(value || '—');
  if (text.length <= maxChars) return [text];
  const lines = [];
  let current = '';
  for (const token of text.split(/(?<=\s)|(?=\s)|(?<=[·→/()])|(?=[·→/()])/)) {
    if ((current + token).length > maxChars && current.trim()) {
      lines.push(current.trim());
      current = token.trimStart();
    } else current += token;
  }
  if (current.trim()) lines.push(current.trim());
  if (lines.some(line => line.length > maxChars)) {
    return text.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [text];
  }
  return lines;
}

function textBlock(x, centerY, value, maxChars, className, anchor = 'middle') {
  const lines = wrapText(value, maxChars);
  const startY = centerY - ((lines.length - 1) * 10);
  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" class="${className}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? 20 : 0}">${esc(line)}</tspan>`).join('')}</text>`;
}

function accentForText(value) {
  const text = String(value || '');
  if(/SRT/.test(text)) return '#8b1e4f';
  if(/KTX-산천/.test(text)) return '#6639a6';
  if(/KTX-이음/.test(text)) return '#274f9d';
  if(/KTX/.test(text)) return '#1f5cb8';
  if(/ITX-새마을/.test(text)) return '#d52d45';
  if(/ITX-마음/.test(text)) return '#e15a2b';
  if(/ITX-청춘/.test(text)) return '#15955f';
  if(/남도해양/.test(text)) return '#1688aa';
  if(/국악와인/.test(text)) return '#343d68';
  if(/무궁화/.test(text)) return '#e16425';
  return '#2456a6';
}

function renderSummary(config, notice) {
  const tables = config.tables || extractTables(notice.body);
  if (!tables.length) throw new Error(`${config.id}: 공지에서 표를 찾지 못했습니다.`);

  const W = 1440;
  const margin = 78;
  const tableW = W - margin * 2;
  const parts = [];
  let y = 220;

  parts.push(`<rect width="${W}" height="__HEIGHT__" fill="#f4f1e9"/>`);
  parts.push(`<rect x="38" y="38" width="${W - 76}" height="__INNER__" rx="8" fill="#fff" stroke="#d3cec2" stroke-width="2"/>`);
  parts.push(`<text x="${margin}" y="90" class="brand">NIMBYRAIL PASSENGER INFORMATION</text>`);
  parts.push(`<text x="${margin}" y="142" class="title">[붙임] ${esc(config.title)}</text>`);
  parts.push(`<text x="${margin}" y="181" class="subtitle">${esc(config.subtitle)}</text>`);
  parts.push(`<text x="${W - margin}" y="142" text-anchor="end" class="date">${esc(notice.date)} 기준</text>`);

  for (const table of tables) {
    const columns = Math.max(...table.rows.map(row => row.length));
    const colW = tableW / columns;
    const maxChars = Math.max(8, Math.floor((colW - 24) / 13));
    const rowHeights = table.rows.map((row, rowIndex) => {
      if (rowIndex === 0 || row.every(cell => cell.header)) return 56;
      const lineCount = Math.max(...row.map(cell => wrapText(cell.text, maxChars).length));
      return Math.max(46, 24 + lineCount * 20);
    });
    const tableH = rowHeights.reduce((sum, height) => sum + height, 0);

    const sectionAccent=accentForText(`${table.heading} ${table.rows.flat().map(cell=>cell.text).join(' ')}`);
    parts.push(`<rect x="${margin}" y="${y}" width="${tableW}" height="42" rx="9" fill="${sectionAccent}" opacity=".10"/>`);
    parts.push(`<rect x="${margin}" y="${y}" width="9" height="42" rx="5" fill="${sectionAccent}"/>`);
    parts.push(`<text x="${margin + 24}" y="${y + 29}" class="section">${esc(table.heading)}</text>`);
    y += 54;
    parts.push(`<rect x="${margin}" y="${y}" width="${tableW}" height="${tableH}" fill="#fff" stroke="#555" stroke-width="1.5"/>`);

    let rowY = y;
    table.rows.forEach((row, rowIndex) => {
      const height = rowHeights[rowIndex];
      const isHeader = rowIndex === 0 || row.every(cell => cell.header);
      const rowText=row.map(cell=>cell.text).join(' ');
      const rowAccent=accentForText(rowText);
      if (isHeader) parts.push(`<rect x="${margin}" y="${rowY}" width="${tableW}" height="${height}" fill="#30343b"/>`);
      else if (rowIndex % 2 === 0) parts.push(`<rect x="${margin}" y="${rowY}" width="${tableW}" height="${height}" fill="#faf9f6"/>`);
      if(!isHeader)parts.push(`<rect x="${margin}" y="${rowY}" width="6" height="${height}" fill="${rowAccent}"/>`);

      for (let column = 0; column < columns; column += 1) {
        const x = margin + column * colW;
        const cell = row[column]?.text || '—';
        const gradeCell=!isHeader&&/KTX|SRT|ITX|무궁화|남도해양|국악와인/.test(cell);
        if(gradeCell)parts.push(`<rect x="${x+8}" y="${rowY+8}" width="${colW-16}" height="${height-16}" rx="8" fill="${accentForText(cell)}" opacity=".13"/>`);
        parts.push(textBlock(x + colW / 2, rowY + height / 2 + 5, cell, maxChars, isHeader ? 'th headerText' : gradeCell ? 'td gradeText' : 'td'));
        if (column) parts.push(`<line x1="${x}" y1="${rowY}" x2="${x}" y2="${rowY + height}" class="grid"/>`);
      }
      rowY += height;
      if (rowIndex < table.rows.length - 1) parts.push(`<line x1="${margin}" y1="${rowY}" x2="${margin + tableW}" y2="${rowY}" class="grid"/>`);
    });
    y += tableH + 54;
  }

  if (config.callouts?.length) {
    const boxHeight = 34 + config.callouts.length * 34;
    parts.push(`<rect x="${margin}" y="${y}" width="${tableW}" height="${boxHeight}" rx="9" fill="#eef3fb" stroke="#b6c7e2"/>`);
    config.callouts.forEach((callout, index) => {
      parts.push(`<circle cx="${margin + 25}" cy="${y + 28 + index * 34}" r="5" fill="#2456a6"/>`);
      parts.push(`<text x="${margin + 42}" y="${y + 34 + index * 34}" class="callout">${esc(callout)}</text>`);
    });
    y += boxHeight + 40;
  }

  parts.push(`<text x="${margin}" y="${y}" class="foot">※ 실제 운행 시각은 앱의 열차 상세 시간표에서 다시 확인해 주세요.</text>`);
  const height = y + 82;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}"><style>
    .brand{font:700 14px Arial,sans-serif;letter-spacing:2px;fill:#2456a6}
    .title{font:800 31px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#151515}
    .subtitle{font:500 18px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#53565a}
    .date{font:600 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#555}
    .section{font:800 22px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#171717}
    .th{font:850 16px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif}.headerText{fill:#fff}
    .td{font:650 16px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}.gradeText{font-weight:850}
    .callout{font:650 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#24344d}
    .foot{font:500 13px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#666}
    .grid{stroke:#b8b6b0;stroke-width:1}
  </style>${parts.join('').replace(/__HEIGHT__/g, String(height)).replace(/__INNER__/g, String(height - 76))}</svg>`;
}

const notices = loadNotices();
fs.mkdirSync(OUT, { recursive: true });

for (const config of CONFIGS) {
  const notice = notices.find(item => item.title === config.noticeTitle);
  if (!notice) throw new Error(`${config.id}: 공지를 찾지 못했습니다: ${config.noticeTitle}`);
  const svg = renderSummary(config, notice);
  const file = path.join(OUT, `${config.id}.svg`);
  fs.writeFileSync(file, svg);
  process.stdout.write(`${path.relative(ROOT, file)} · ${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB\n`);
}
