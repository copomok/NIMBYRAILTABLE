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

function renderSummary(config, notice) {
  const tables = extractTables(notice.body);
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

    parts.push(`<rect x="${margin}" y="${y}" width="8" height="32" rx="4" fill="#2456a6"/>`);
    parts.push(`<text x="${margin + 22}" y="${y + 25}" class="section">${esc(table.heading)}</text>`);
    y += 48;
    parts.push(`<rect x="${margin}" y="${y}" width="${tableW}" height="${tableH}" fill="#fff" stroke="#555" stroke-width="1.5"/>`);

    let rowY = y;
    table.rows.forEach((row, rowIndex) => {
      const height = rowHeights[rowIndex];
      const isHeader = rowIndex === 0 || row.every(cell => cell.header);
      if (isHeader) parts.push(`<rect x="${margin}" y="${rowY}" width="${tableW}" height="${height}" fill="#ecebe7"/>`);
      else if (rowIndex % 2 === 0) parts.push(`<rect x="${margin}" y="${rowY}" width="${tableW}" height="${height}" fill="#faf9f6"/>`);

      for (let column = 0; column < columns; column += 1) {
        const x = margin + column * colW;
        const cell = row[column]?.text || '—';
        parts.push(textBlock(x + colW / 2, rowY + height / 2 + 5, cell, maxChars, isHeader ? 'th' : 'td'));
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
    .th{font:800 16px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
    .td{font:600 15px 'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;fill:#202124}
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
