// ── 님비레일 공지사항 데이터 ──
// 새 공지는 배열 맨 아래에 추가하세요 (화면엔 최신순으로 자동 정렬됩니다)
//
// 각 공지는 cat(카테고리)을 지정합니다. 사용 가능한 값:
//   update    📱 앱 업데이트   - 새 기능, UI 개선, 버그 수정 등
//   timetable 🕐 시간표 개정   - 열차 시간표 변경/조정
//   route     🗺️ 노선 정보     - 노선도 추가/수정
//   service   ⚠️ 운행 안내     - 운행 중단/재개, 임시 변경 등
//
// body는 HTML을 그대로 사용할 수 있습니다. 아래 클래스를 활용하세요:
//   <br>                         줄바꿈
//   <strong>텍스트</strong>      굵게
//   <span class="n-highlight">텍스트</span>   파란 강조 박스
//   <span class="n-warn">텍스트</span>        빨간 경고 박스
//   <div class="n-box">텍스트</div>           회색 박스(인용/안내문)
//   <hr>                         구분선
//   <ul><li>...</li></ul>        목록
//   <table><tr><th>..</th></tr><tr><td>..</td></tr></table>   표

const NOTICES = [
  {
    date:'2026-06-20',
    cat:'update',
    title:'공지사항 탭이 새로 생겼습니다',
    body:`이제 시간표 변경, 노선 추가, 앱 업데이트 소식을 <strong>공지사항 탭</strong>에서 한눈에 확인하실 수 있습니다.<br><br>
<div class="n-box">
공지는 아래 카테고리로 구분됩니다.<br><br>
📱 앱 업데이트 — 새 기능, UI 개선, 버그 수정<br>
🕐 시간표 개정 — 열차 시간표 변경/조정<br>
🗺️ 노선 정보 — 노선도 추가/수정<br>
⚠️ 운행 안내 — 운행 중단·재개 등
</div><br>
안 읽은 공지는 제목 옆에 <span class="n-highlight">파란 점</span>으로 표시되며, 탭 아이콘에도 알림 점이 함께 뜹니다.`
  },
  {
    date:'2026-06-20',
    cat:'route',
    title:'경전선 노선도가 추가되었습니다',
    body:`노선도 탭에서 <strong>경전선(부산~목포)</strong>을 확인하실 수 있습니다.<br><br>
<strong>■ 본선</strong><br>
부산 → 진주 → 순천 → 보성 → 목포<br><br>
<strong>■ 지선</strong><br>
조성 → 춘양 → 빛가람 → 광주<br>
춘양 → 다시 → 함평<br><br>
노선도 탭에서 <span class="n-highlight">확대/축소 기능</span>도 함께 추가되었습니다.`
  },
  {
    date:'2026-06-20',
    cat:'timetable',
    title:'KTX 시간표 미세조정 안내',
    body:`KTX 열차의 운행 시간표가 일부 조정되었습니다.<br>
<div class="n-box">모든 시간은 시발역 출발 시각 기준입니다.</div>

<strong>■ 서울 ↔ 부산 KTX</strong>
<table>
<tr><th>열차번호</th><th>기존</th><th>변경</th><th>비고</th></tr>
<tr><td>#5</td><td>5:40</td><td>5:44</td><td>4분 ↓</td></tr>
<tr><td>#10</td><td>6:20</td><td>6:22</td><td>2분 ↓</td></tr>
<tr><td>#11</td><td>6:40</td><td>6:44</td><td>4분 ↓</td></tr>
<tr><td>#17</td><td>7:40</td><td>7:48</td><td>8분 ↓</td></tr>
<tr><td>#23</td><td>8:40</td><td>8:41</td><td>1분 ↓</td></tr>
<tr><td>#35</td><td>10:40</td><td>10:43</td><td>3분 ↓</td></tr>
<tr><td>#47</td><td>12:40</td><td>12:43</td><td>3분 ↓</td></tr>
<tr><td>#59</td><td>14:40</td><td>14:43</td><td>3분 ↓</td></tr>
<tr><td>#71</td><td>16:40</td><td>16:43</td><td>3분 ↓</td></tr>
<tr><td>#91</td><td>20:40</td><td>20:43</td><td>3분 ↓</td></tr>
<tr><td>#100</td><td>22:20</td><td>22:21</td><td>1분 ↓</td></tr>
<tr><td>#101</td><td>22:40</td><td>22:43</td><td>3분 ↓</td></tr>
</table>

<strong>■ 한강로 ↔ 포항/창녕 KTX</strong>
<table>
<tr><th>열차번호</th><th>기존</th><th>변경</th><th>비고</th></tr>
<tr><td>#235</td><td>10:00</td><td>10:02</td><td>2분 ↓</td></tr>
<tr><td>#238</td><td>11:45</td><td>11:55</td><td>10분 ↓</td></tr>
<tr><td>#244</td><td>19:20</td><td>19:16</td><td><span class="n-highlight">4분 ↑</span></td></tr>
<tr><td>#246</td><td>21:20</td><td>21:16</td><td><span class="n-highlight">4분 ↑</span></td></tr>
<tr><td>#247</td><td>23:10</td><td>23:12</td><td>2분 ↓</td></tr>
<tr><td>#248</td><td>23:20</td><td>23:28</td><td>8분 ↓</td></tr>
<tr><td>#254</td><td>9:20</td><td>9:19</td><td><span class="n-highlight">1분 ↑</span></td></tr>
<tr><td>#258</td><td>18:20</td><td>18:19</td><td><span class="n-highlight">1분 ↑</span></td></tr>
</table>
<br>
변동된 시간표는 시간표 탭에서 바로 확인하실 수 있습니다.`
  },
];
