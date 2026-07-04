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
  {
    date:'2026-06-21',
    cat:'update',
    title:'알람·즐겨찾기·공지사항 기능이 개선되었습니다',
    body:`이번 업데이트에서 달라진 점을 안내드립니다.<br><br>

<strong>🔔 승차/하차 알람 3단계 개편</strong><br>
이제 승차·하차 알람 모두 <span class="n-highlight">전역 출발 → 5분 전 → 출발·도착</span> 3단계로 알림이 발송됩니다. 알람 목록에는 대표 시각 하나만 깔끔하게 표시됩니다.<br><br>

<strong>⏰ 알람 그룹 (출근/퇴근 세트)</strong><br>
자주 쓰는 알람 조합을 그룹으로 저장해두면, 다음에 버튼 하나로 한 번에 다시 설정할 수 있습니다. 알람 탭에서 <span class="n-highlight">💾 현재 알람을 그룹으로 저장</span>을 눌러보세요.<br><br>

<strong>⭐ 즐겨찾기 카테고리</strong><br>
즐겨찾기 추가 시 <span class="n-highlight">출퇴근 · 여행 · 기타</span> 카테고리를 선택할 수 있습니다. 즐겨찾기 탭 상단 필터로 카테고리별로 모아볼 수 있습니다.<br><br>

<strong>📢 공지사항 카테고리 필터</strong><br>
공지사항도 카테고리별로 필터링해서 볼 수 있도록 상단에 필터 탭이 추가되었습니다.<br><br>

<div class="n-box">
그 외 역 시간표 필터 순서 정리, 출도착 탭 레이아웃 개선 등 자잘한 수정이 함께 포함되었습니다.
</div>`
  },
  {
    date:'2026-06-21',
    cat:'update',
    title:'🎫 승차권 탭이 새로 생겼습니다',
    body:`이제 가상으로 승차권을 예매하고 관리할 수 있는 <strong>승차권 탭</strong>이 추가되었습니다.<br><br>

<strong>🎫 예매하기</strong><br>
열차 상세에서는 전 구간을, 출도착 탭 검색 결과에서는 원하는 구간만 골라 예매할 수 있습니다. 탑승일은 <span class="n-highlight">오늘부터 최대 1개월 후</span>까지 선택 가능합니다.<br><br>

<strong>💺 좌석 등급 · 운임</strong><br>
열차 등급에 따라 일반실·특실 등 선택 가능한 좌석 등급이 다르며, 구간 거리에 따라 운임이 자동 계산됩니다. 좌석은 호차·열까지 자동으로 배정됩니다.<br><br>

<strong>🚆 탑승 중 위치 위젯</strong><br>
오늘 탑승 시간에 맞는 승차권이 있으면, 승차권 탭 맨 위에 <span class="n-highlight">직전역 · 현재역 · 다음역</span> 타임라인과 진행률이 실시간으로 표시됩니다.<br><br>

<strong>🔔 승하차 알람 자동 설정</strong><br>
예매가 완료되면 승차역·하차역 알람이 자동으로 설정됩니다. 알람 권한이 꺼져 있다면 별도로 설정해주세요.<br><br>

<div class="n-box">
같은 날짜에 시간이 겹치는 승차권은 중복으로 예매할 수 없습니다. 승차권 탭에서 예매/탑승완료/취소 내역을 한눈에 확인하고 관리할 수 있습니다.
</div>`
  },
  {
    date:'2026-06-23',
    cat:'update',
    title:'🔖 마이페이지 · 열차 예매 탭 신설',
    body:`님비레일 시간표에 <strong>마이페이지</strong>와 <strong>열차 예매</strong> 기능이 새로 추가되었습니다.<br><br>

<strong>☰ 마이페이지 (우측 상단 버튼)</strong><br>
기존에 탭으로 존재하던 <span class="n-highlight">승차권 조회 · 정기권 예매 · 승하차 알람 · 즐겨찾기</span> 기능이 마이페이지 안으로 통합되었습니다. 우측 상단 햄버거 메뉴(≡)를 눌러 접근할 수 있습니다.<br><br>

<strong>🎫 열차 예매 탭</strong><br>
출발역·도착역을 선택하고 날짜·인원을 고른 후 열차를 조회할 수 있는 전용 예매 탭이 마이페이지 안에 새로 생겼습니다. 직통 열차가 없는 경우 <span class="n-highlight">1회 환승 경로</span>도 자동으로 탐색합니다. 편도/왕복 선택도 가능합니다.<br><br>

<strong>🎟️ 정기권 예매 개편</strong><br>
정기권 예매 방식이 바뀌었습니다. 구간을 등록한 후 예매 탭에서 열차를 선택하고, <span class="n-highlight">매주 반복할 요일</span>을 선택하면 앞으로 4주간 해당 요일의 승차권이 한 번에 생성됩니다.<br><br>

<div class="n-box">
탭 구성이 일부 변경되었습니다. 기존 알람·즐겨찾기 탭은 마이페이지에서 접근하고, 통계·공지 탭은 기존과 동일하게 상단 탭바에 유지됩니다.
</div>`
  },
  
  {
    date:'2026-06-27',
    cat:'timetable',
    title:'경부선·보은선 ITX새마을 및 한강로-강릉 무궁화호 시간표 개정',
    body:`이번 개정에서 추가·변경된 열차 계통을 안내드립니다.<br><br>

<strong>■ 서울 ↔ 보은 ITX새마을 (1891~1898)</strong><br>
기존 서청주·상당 구간에서 <span class="n-highlight">상당~보은 구간이 연장</span>되었습니다.<br><br>
<div class="n-box">
추가 정차역: 상당(통과) · 회인(통과) · 수한(통과) · 보은<br><br>
<table>
<tr><th>열차</th><th>방향</th><th>보은 착발</th></tr>
<tr><td>#1891</td><td>서울→보은</td><td>8:22 도착</td></tr>
<tr><td>#1892</td><td>보은→서울</td><td>5:25 출발</td></tr>
<tr><td>#1893</td><td>서울→보은</td><td>13:12 도착</td></tr>
<tr><td>#1894</td><td>보은→서울</td><td>8:50 출발</td></tr>
<tr><td>#1895</td><td>서울→보은</td><td>17:22 도착</td></tr>
<tr><td>#1896</td><td>보은→서울</td><td>15:20 출발</td></tr>
<tr><td>#1897</td><td>서울→보은</td><td>22:12 도착</td></tr>
<tr><td>#1898</td><td>보은→서울</td><td>18:50 출발</td></tr>
</table>
</div><br>

<strong>■ 한강로 ↔ 강릉 무궁화호 신설 (1761~1772)</strong><br>
한강로에서 강릉까지 운행하는 무궁화호 열차가 새로 신설되었습니다.<br><br>
<div class="n-box">
경유: 한강로 → 수원 → 오산 → 죽산 → 일죽 → 가남 → 여주 → 지정 → 원주 → 남횡성 → 방림 → 평창 → 진부 → 대관령 → 강릉<br><br>
<table>
<tr><th>열차</th><th>방향</th><th>한강로 출발</th><th>강릉 도착</th></tr>
<tr><td>#1761</td><td>한강로→강릉</td><td>6:20</td><td>9:11</td></tr>
<tr><td>#1762</td><td>강릉→한강로</td><td>6:20</td><td>9:11</td></tr>
<tr><td>#1763</td><td>한강로→강릉</td><td>8:10</td><td>11:02</td></tr>
<tr><td>#1764</td><td>강릉→한강로</td><td>8:10</td><td>11:02</td></tr>
<tr><td>#1765</td><td>한강로→강릉</td><td>10:10</td><td>13:02</td></tr>
<tr><td>#1766</td><td>강릉→한강로</td><td>10:10</td><td>13:02</td></tr>
<tr><td>#1767</td><td>한강로→강릉</td><td>12:20</td><td>15:12</td></tr>
<tr><td>#1768</td><td>강릉→한강로</td><td>12:10</td><td>15:02</td></tr>
<tr><td>#1769</td><td>한강로→강릉</td><td>14:30</td><td>17:22</td></tr>
<tr><td>#1770</td><td>강릉→한강로</td><td>14:30</td><td>17:22</td></tr>
<tr><td>#1771</td><td>한강로→강릉</td><td>17:30</td><td>20:22</td></tr>
<tr><td>#1772</td><td>강릉→한강로</td><td>17:00</td><td>19:52</td></tr>
</table>
</div><br>
<span class="n-warn">한강로-강릉 무궁화호는 신설 계통으로, 일부 시간대 좌석이 빠르게 마감될 수 있습니다.</span>`
  },
  {
    date:'2026-06-27',
    cat:'timetable',
    title:'충주행 ITX-마음이 개통되었습니다',
    body:`중부내륙선을 경유하는 <strong>한강로 ↔ 충주 ITX-마음</strong>이 새로 개통되었습니다.<br><br>
<div class="n-box">
경유: 한강로 → 남안양 → 수원 → 오산 → 죽산 → 일죽 → 장호원 → 돈산 → 충주<br><br>
<table>
<tr><th>열차</th><th>방향</th><th>출발</th><th>도착</th></tr>
<tr><td>#1882</td><td>충주→한강로</td><td>충주 5:30</td><td>한강로 6:38</td></tr>
<tr><td>#1884</td><td>충주→한강로</td><td>충주 7:00</td><td>한강로 8:08</td></tr>
<tr><td>#1881</td><td>한강로→충주</td><td>한강로 21:20</td><td>충주 22:28</td></tr>
<tr><td>#1883</td><td>한강로→충주</td><td>한강로 22:10</td><td>충주 23:18</td></tr>
</table>
</div><br>
편도 소요시간은 약 <strong>1시간 8분</strong>입니다. 예매 탭에서 좌석을 예약하실 수 있습니다.`
  },
  {
    date:'2026-07-02',
    cat:'update',
    title:'역 정보·지연 예측 기능이 개선되었습니다',
    body:`<strong>역 정보</strong>와 <strong>지연 예측</strong> 기능이 업데이트되었습니다.<br><br>
<div class="n-box">
🚉 역 정보 — 각 역의 경유 노선과 플랫폼 정보를 더 정확하게 확인할 수 있습니다.<br>
📊 지연 예측 — 실제 운행 기록을 기반으로 시간대·노선별 지연 확률과 예상 지연 시간을 안내합니다.
</div><br>
<span class="n-highlight">자정을 넘겨 운행하는 열차의 소요시간이 올바르게 계산되도록 함께 개선되었습니다.</span>`
  },
  {
    date:'2026-07-03',
    cat:'timetable',
    title:'개활선 무단 추월(역전) 구간 시간표 조정',
    body:`느린 열차가 정차역이 아닌 <strong>역과 역 사이(개활선)</strong>에서 빠른 열차에 추월당하던 구간을 바로잡았습니다.<br><br>
<div class="n-box">
느린 열차를 직전 정차역에서 잠시 대피(정차)시켜 <strong>빠른 열차가 역에서 안전하게 추월</strong>하도록 조정했습니다. 각 열차의 종착 직전 구간만 소폭(3~4분) 늦춰지며, 그 외 시각은 변동이 없습니다.
</div><br>
<strong>■ 조정된 열차 (대피역에서 대피 · 종착 도착 3~4분 지연)</strong>
<table>
<tr><th>열차</th><th>대피역</th><th>구간</th><th>추월 열차</th><th>조정</th></tr>
<tr><td>무궁화 1530</td><td>운암</td><td>운암~전주</td><td>KTX-산천 564</td><td>+4분</td></tr>
<tr><td>무궁화 1544</td><td>운암</td><td>운암~전주</td><td>KTX-산천 582</td><td>+4분</td></tr>
<tr><td>무궁화 1558</td><td>남안양</td><td>남안양~서울</td><td>ITX-새마을 1156</td><td>+4분</td></tr>
<tr><td>무궁화 1562</td><td>남안양</td><td>남안양~서울</td><td>ITX-새마을 1160</td><td>+4분</td></tr>
<tr><td>무궁화 1923</td><td>강진</td><td>강진~완도</td><td>KTX 903</td><td>+3분</td></tr>
<tr><td>무궁화 1931</td><td>강진</td><td>강진~완도</td><td>KTX 915</td><td>+3분</td></tr>
</table>`
  },
  {
    date:'2026-07-03',
    cat:'timetable',
    title:'한강로↔순천 무궁화호 신설 (1491~1496)',
    body:`<strong>한강로~순천</strong>을 잇는 장거리 무궁화호 <strong>1491~1496</strong>(왕복 3편)이 신설되었습니다.<br><br>
<div class="n-box">
경부선 <strong>한강로~회덕</strong> · 호남선 <strong>회덕~광주</strong> · 경전선 <strong>광주~순천</strong>을 잇습니다.<br>
한강로 ─ 남안양 ─ 천안 ─ 회덕 ─ 서대전 ─ 전주 ─ 정읍 ─ 장성 ─ 광주 ─ 빛가람 ─ 순천
</div><br>
<strong>■ 운행 시각</strong>
<table>
<tr><th>열차</th><th>방면</th><th>출발</th><th>도착</th></tr>
<tr><td>무궁화 1491</td><td>순천행</td><td>한강로 06:02</td><td>순천 11:15</td></tr>
<tr><td>무궁화 1492</td><td>한강로행</td><td>순천 05:56</td><td>한강로 11:08</td></tr>
<tr><td>무궁화 1493</td><td>순천행</td><td>한강로 13:18</td><td>순천 18:31</td></tr>
<tr><td>무궁화 1494</td><td>한강로행</td><td>순천 11:33</td><td>한강로 16:45</td></tr>
<tr><td>무궁화 1495</td><td>순천행</td><td>한강로 17:51</td><td>순천 23:04</td></tr>
<tr><td>무궁화 1496</td><td>한강로행</td><td>순천 18:26</td><td>한강로 23:38</td></tr>
</table><br>
<span class="n-highlight">이른 아침부터 심야까지 하루 3왕복으로 운행합니다. 통과·추월 검증을 거쳐 개활선 무단 추월 없이 동시 출발 간격도 확보했습니다.</span>`
  },
  {
    date:'2026-07-03',
    cat:'timetable',
    title:'호남고속선 KTX 신설 (401~460)',
    body:`<strong>서울~목포</strong>를 잇는 <strong>호남고속선 KTX</strong> 60편(왕복 30회)이 신설되었습니다.<br><br>
<div class="n-box">
경부고속선 <strong>서울~천안</strong> · 호남고속선 <strong>천안~광주</strong> · 호남선 <strong>광주~목포</strong>를 이용합니다.
</div><br>
<strong>■ 계통 (정차역 차등)</strong>
<table>
<tr><th>계통</th><th>성격</th><th>주요 정차</th><th>편성</th></tr>
<tr><td>/1</td><td>급행</td><td>서울·수영·천안·전주·광주</td><td>22편</td></tr>
<tr><td>/2</td><td>일반</td><td>+공주·함평·무안</td><td>28편</td></tr>
<tr><td>/3</td><td>완행</td><td>+병목안·정안·정읍</td><td>10편</td></tr>
</table><br>
<strong>■ 운행 시각</strong>
<table>
<tr><th>방면</th><th>첫차</th><th>막차(종착 도착)</th><th>배차</th></tr>
<tr><td>목포행(하행)</td><td>서울 05:40</td><td>서울 23:24 → 목포 00:51</td><td>약 30~40분</td></tr>
<tr><td>서울행(상행)</td><td>목포 05:48</td><td>목포 23:25 → 서울 00:52</td><td>약 30~40분</td></tr>
</table><br>
<span class="n-highlight" style="display:block;margin-bottom:8px">심야 막차는 급행(/1)으로 편성해 종착 도착이 0시~1시대에 들어오도록 연장했습니다. 서울~목포 상·하행 소요시간을 게임 노선 파일 기준으로 대칭화했습니다(급행 87분·일반 94분·완행 95분).</span>
<span class="n-warn" style="display:block">각 계통의 통과역(병목안·정안·공주·정읍 및 광주~목포 기존선 나산·도림 등)과 통과 시각을 표기했습니다. 전철 전용역(월전·계림·북목포 등)은 제외했습니다. <strong>통과 시각은 역간 거리 비례로 산정한 임시값</strong>으로, 정확한 값은 추후 반영 예정입니다.</span>
<span class="n-highlight">일반 &gt; 급행 &gt; 완행 순으로 세 계통을 통합 약 30~40분 간격으로 배치했습니다. 통과·추월 검증(경부고속·호남고속·호남선 구간)을 거쳐 개활선 무단 추월 0건, 같은 승강장 3분 미만 근접 0건으로 조정했습니다.</span>`
  }
];
