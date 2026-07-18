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
    title:'승차권 탭이 새로 생겼습니다',
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
    title:'마이페이지 · 열차 예매 탭 신설',
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
</table><br>
<strong>■ 7/9 추가 조정 — 개활선 추월·동시 출발 해소</strong>
<table>
<tr><th>열차</th><th>내용</th><th>조정</th></tr>
<tr><td>ITX-새마을 1276</td><td>순천 대피 — KTX 911이 역에서 추월 (순천~보성 개활선 추월 해소)</td><td>순천 발 14:20→14:28 · 목포 착 +9분</td></tr>
<tr><td>무궁화 1539</td><td>전주 발차 순서 조정(KTX-산천 573 먼저) + 북순천 대피(ITX 1163 추월)</td><td>전주 발 18:50→18:55 · 여수 착 20:32</td></tr>
<tr><td>KTX 104</td><td>SRT 372와 영동~세종 개활선 교차 해소 — 372 후행으로 재배열</td><td>대전 이북 시각 조정 · 서울 착 1:04</td></tr>
<tr><td>SRT 312</td><td>KTX 18과 부산 동시 출발 해소</td><td>부산 발 7:40→7:43</td></tr>
<tr><td>ITX-새마을 1891</td><td>ITX-새마을 1153과 서울 동시 출발 해소</td><td>서울 발 7:00→7:10</td></tr>
<tr><td>ITX-새마을 1097</td><td>ITX-새마을 1085와 청량리 동시 출발 해소 · 단양 이후 무궁화 1663 후행</td><td>청량리 발 18:52→18:55 · 남대구 착 21:40</td></tr>
</table>`
  },
  {
    date:'2026-07-03',
    cat:'timetable',
    title:'한강로~순천 무궁화호 신설 (1491~1496)',
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
  },
  {
    date:'2026-07-10',
    cat:'update',
    title:'전철 모드가 새로 생겼습니다',
    body:`이제 기차뿐 아니라 <strong>수도권·지방 전철</strong>도 님비레일 시간표에서 확인하실 수 있습니다.<br><br>
<div class="n-box">
마이페이지(우상단 ☰) 상단의 <strong>🚆 기차 / 🚇 전철</strong> 토글로 모드를 전환합니다.<br>
전철 모드에서는 <strong>노선 · 노선도 · 역 정보</strong> 탭만 표시됩니다.
</div><br>
<strong>■ 노선 탭</strong><br>
권역별로 전철 노선을 골라 <span class="n-highlight">첫차·막차 시각, 출퇴근/평시 배차간격, 운행 계통</span>을 확인하고, 전 역을 타임라인으로 훑어볼 수 있습니다.<br><br>
<strong>■ 전철 노선도</strong><br>
노선도 탭에서 전철 노선을 선택하면 실제 좌표 기반 노선도가 표시됩니다. <strong>지선이 있는 노선</strong>(경부선 조치원지선, 동남선 울주지선 등)은 본선과 지선이 구분되어 그려집니다.<br><br>
<strong>■ 역 정보</strong><br>
전철 모드에서는 가까운 역 탐색과 역 상세 정보가 <span class="n-highlight">전철역 기준</span>으로 동작합니다.`
  },
  {
    date:'2026-07-10',
    cat:'update',
    title:'관제 모드 · 열차 추적 뷰가 새로 생겼습니다',
    body:`노선도 탭이 크게 확장되었습니다.<br><br>
<strong>■ 🛰️ 관제 모드</strong><br>
노선 탭 맨 앞의 <span class="n-highlight">🛰️ 관제</span>를 누르면 <strong>전국 모든 노선을 한 화면</strong>에 띄우고, 운행 중인 열차 전체의 실시간 위치를 조망할 수 있습니다. 주요 역(종점·환승역)만 이름을 표시해 넓은 화면에서도 읽기 쉽게 구성했습니다.<br><br>
<strong>■ 열차 추적 전용 뷰</strong><br>
열차를 추적하면 해당 열차가 <strong>실제로 달리는 전 구간</strong>이 노선도에 나타나고, 노선 색이 <span class="n-highlight">열차 등급 색</span>으로 통일됩니다. 정차하지 않는 통과역은 옅게 표시되며, 반대편에서 스쳐 지나가는 <strong>교행 열차</strong>도 작게 함께 표시됩니다.<br><br>
<strong>■ 확대/축소 개편</strong><br>
핀치(두 손가락)와 ＋/－ 버튼으로 부드럽게 확대·축소할 수 있고, 확대 상태에서도 스와이프 이동이 자연스럽습니다. 화면 위 줌 버튼은 <span class="n-highlight">✕ 버튼으로 접어서 숨길 수</span> 있습니다.`
  },
  {
    date:'2026-07-10',
    cat:'update',
    title:'터미널 뷰 · 당일치기 · 루트 퍼즐 · 열차 비교가 새로 생겼습니다',
    body:`마이페이지에 즐길 거리와 조회 도구 4종이 추가되었습니다.<br><br>
<strong>■ 🖥️ 터미널 뷰</strong><br>
역을 검색하면 그 역의 <strong>출발/도착 전광판</strong>이 실제 역사 전광판처럼 표시됩니다. 두 역을 나란히 띄워 비교할 수도 있습니다.<br><br>
<strong>■ 🌄 당일치기 추천</strong><br>
출발역을 고르면 <strong>아침에 떠나 밤에 돌아오는 당일치기 여행지</strong>를 현지 체류 시간과 함께 추천해 드립니다.<br><br>
<strong>■ 🧩 루트 퍼즐</strong><br>
열차가 지나는 역을 <strong>운행 순서대로 맞추는 퍼즐</strong>입니다. 문제는 <span class="n-highlight">무제한</span>으로 출제되며, 🎲 다음 문제 버튼으로 계속 도전할 수 있습니다. 오늘 푼 문제 수도 기록됩니다.<br><br>
<strong>■ ⚖️ 열차 비교</strong><br>
열차 상세 화면의 ⚖️ 버튼으로 같은 노선의 두 열차를 비교하면, 역별 시각을 나란히 놓고 <strong>어느 역에서 대피하고 어디서 추월이 일어나는지</strong>를 짚어 드립니다.<br><br>
<div class="n-box">
새 기능의 역 검색은 기존 검색과 동일하게 <strong>초성 검색</strong>(예: ㅅㅇ → 서울)을 지원합니다.<br>
또한 화면 우상단 ☰ 왼쪽에 <strong>🔄 새로고침 버튼</strong>이 생겨, 어느 탭에서든 현재 화면을 바로 갱신할 수 있습니다.
</div>`
  },
  {
    date:'2026-07-10',
    cat:'timetable',
    title:'시간표 대개정 — 호남고속선·장항선·전라선·충북선·순천 계통',
    body:`실제 운행 기록을 바탕으로 여러 계통의 시간표를 신설·정비했습니다. 모든 시각은 <strong>시발역 출발 기준</strong>입니다.<br><br>

<strong>■ 신설·대개편</strong>
<table>
<tr><th>계통</th><th>열차</th><th>구간</th><th>편수</th><th>내용</th></tr>
<tr><td>호남고속선 KTX</td><td>401~460</td><td>마포 ↔ 목포</td><td>60</td><td>마포 착발로 재편</td></tr>
<tr><td>충북선 막차</td><td>1429·1430</td><td>대전 ↔ 영주</td><td>2</td><td>22시대 막차 신설</td></tr>
</table>
<span class="n-highlight" style="display:block;margin:8px 0">호남고속선 KTX는 급행(99분)·일반(103분)·완행(111분) 세 계통, 마포~목포 하루 60편(왕복 30회)입니다. 하행 첫차 401 마포 05:35 / 막차 459 마포 23:18, 상행 첫차 402 목포 05:48 / 막차 460 목포 23:25.</span>

<strong>■ 인게임 실측 시각 반영 (정비)</strong>
<table>
<tr><th>계통</th><th>열차</th><th>구간</th><th>편수</th><th>비고</th></tr>
<tr><td>장항선(서대전)</td><td>1461~1466</td><td>한강로 ↔ 서대전</td><td>6</td><td>정차 시각 정비</td></tr>
<tr><td>장항선(전주)</td><td>1471~1490</td><td>한강로 ↔ 전주</td><td>20</td><td>정차 시각 정비</td></tr>
<tr><td>전라선 KTX</td><td>551~582</td><td>서울 ↔ 여수</td><td>32</td><td>통과역 이동시각 정렬</td></tr>
<tr><td>충북선</td><td>1401~1430</td><td>대전 ↔ 영주</td><td>30</td><td>인게임 실측 반영·전 역 정차 60초 통일(소요 약 121분)</td></tr>
<tr><td>순천 계통</td><td>1491~1496</td><td>한강로 ↔ 순천</td><td>6</td><td>35정차 대장정, 시각 정비</td></tr>
</table>
<span class="n-highlight" style="display:block;margin:8px 0">충북선(영주↔대전 무궁화 30편)은 인게임 실측 시각표에 맞춰 전 구간을 재정비하고 <strong>역별 정차 시간을 60초로 통일</strong>했습니다. 상·하행 소요 약 121분이며, 전 열차 통과·추월·교행 및 편성 회차(최소 15분)를 재검증했습니다.</span>

<strong>■ 운용상 개별 조정</strong>
<table>
<tr><th>열차</th><th>변경 전</th><th>변경 후</th><th>비고</th></tr>
<tr><td>무궁화 1463</td><td>한강로 14:27</td><td>한강로 14:07</td><td>20분 앞당김</td></tr>
<tr><td>무궁화 1487</td><td>한강로 17:58</td><td>한강로 17:50</td><td>8분 앞당김(운용)</td></tr>
</table>
<span class="n-warn" style="display:block;margin-top:8px">모든 변경 시각은 통과·추월 재검증(개활선 무단추월 0건)과 기존 열차와의 시격 점검을 거쳤습니다. 세부 시각은 각 열차 조회에서 확인하실 수 있습니다.</span>`
  },
  {
    date:'2026-07-10',
    cat:'timetable',
    title:'신설·개정 열차 전체 시각표 (참조용 페이지)',
    body:`이번 시간표 대개정으로 <strong>신설·정비된 156편</strong>의 전 정차 시각을 계통별 표로 정리한 참조 페이지를 공개합니다.<br><br>
<div class="n-box">
계통별(호남고속선 KTX·장항선·전라선 KTX·충북선·순천 계통)로 <strong>하행/상행 시각표</strong>가 정리되어 있으며,<br>
· 행 = 역명(운행 순서), 열 = 열차번호<br>
· 통과역 시각은 흐리게 표시<br>
· 역명·열차번호는 스크롤해도 고정
</div><br>
<a href="https://claude.ai/code/artifact/3aec6ea0-542e-44df-8a2c-c6f25bea8d25" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;text-decoration:none">🔗 전체 시각표 열기</a><br><br>
<span class="n-highlight">모든 시각은 통과·추월 재검증을 거친 값이며, 세부 역별 시각은 각 열차 조회에서도 확인하실 수 있습니다.</span>`
  },
  {
    date:'2026-07-12',
    cat:'timetable',
    title:'남부내륙선 개통 — 약목~거제 9개 계통 운행 개시',
    body:`경부선 <strong>약목</strong>에서 분기해 성주·고령·합천·진주·통영을 거쳐 <strong>거제(고현)</strong>까지 잇는 <strong>남부내륙선</strong> 여객 운행을 시작합니다. KTX·ITX-새마을·무궁화호·남도해양(S-Train)까지 <strong>총 9개 계통·148편</strong>이 투입되어, 수도권·대구·대전·호남에서 거제를 직결합니다. 모든 시각은 <strong>시발역 출발 기준</strong>입니다.<br><br>

<strong>■ 고속·특급 (KTX·ITX-새마을)</strong>
<table>
<tr><th>계통</th><th>등급</th><th>편수</th><th>첫차(하행/상행)</th></tr>
<tr><td>마포 ↔ 장유</td><td>KTX-산천</td><td>14</td><td>마포 04:43 / 장유 05:46</td></tr>
<tr><td>한강로 ↔ 고현</td><td>KTX-산천</td><td>20</td><td>한강로 05:48 / 고현 06:25</td></tr>
<tr><td>대전 ↔ 고현</td><td>ITX-새마을</td><td>20</td><td>대전 04:44 / 고현 05:49</td></tr>
<tr><td>한강로 ↔ 고현</td><td>ITX-새마을</td><td>12</td><td>한강로 05:13 / 고현 06:30</td></tr>
</table>

<strong>■ 일반·관광 (무궁화호·남도해양)</strong>
<table>
<tr><th>계통</th><th>등급</th><th>편수</th><th>첫차(하행/상행)</th></tr>
<tr><td>남대구 ↔ 순천</td><td>무궁화호</td><td>28</td><td>남대구 05:00 / 순천 05:56</td></tr>
<tr><td>남대구 ↔ 고현</td><td>무궁화호</td><td>14</td><td>남대구 05:30 / 고현 07:46</td></tr>
<tr><td>진주 ↔ 고현</td><td>무궁화호</td><td>14</td><td>진주 05:23 / 고현 07:05</td></tr>
<tr><td>순천 ↔ 고현</td><td>무궁화호</td><td>12</td><td>순천 06:53 / 고현 05:30</td></tr>
<tr><td>목포 ↔ 고현</td><td>남도해양</td><td>14</td><td>목포 05:47 / 고현 08:59</td></tr>
</table>
<span class="n-highlight" style="display:block;margin:8px 0">목포 ↔ 고현 <strong>남도해양(S-Train)</strong>은 경전선·남부내륙선을 잇는 관광전용 열차입니다. 남해안의 경관을 따라 목포에서 거제까지 하루 왕복 7회 운행합니다.</span>

<strong>■ 전 계통 시각표 (참조 페이지)</strong><br>
9개 계통 148편의 하행·상행 전 정차/통과 시각을 계통별 표로 정리했습니다.<br><br>
<a href="https://claude.ai/code/artifact/58718991-6650-4e71-a94c-45c504256133" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;text-decoration:none">🔗 남부내륙선 전체 시각표 열기</a><br><br>
<span class="n-warn" style="display:block">행=역(운행 순서)·열=열차번호이며, 통과역 시각은 흐리게 표시됩니다. 세부 착·발 시각은 앱의 각 열차 조회에서 확인하실 수 있습니다.</span>`
  },
  {
    date:'2026-07-15',
    cat:'update',
    title:'계정 기능이 추가되었습니다',
    body:`이제 <strong>마이페이지</strong>에서 나만의 계정을 만들어 승차권·즐겨찾기·알람을 계정별로 관리할 수 있습니다.<br><br>
<div class="n-box">
계정마다 아래 개인기록이 <strong>따로</strong> 보관됩니다.<br><br>
🎫 승차권 · 정기권<br>
⭐ 즐겨찾기(그룹 포함)<br>
🔔 열차 알람 · 좌석 감시<br>
🕐 이용 기록 · 예매 경로<br>
🧩 퍼즐 진행 상황
</div><br>
<strong>■ 여러 계정 전환</strong><br>
가족이 한 기기를 함께 쓰거나 용도별로 기록을 나누고 싶을 때, 계정을 여러 개 만들고 <span class="n-highlight">탭 한 번으로 전환</span>할 수 있습니다. 계정마다 이름과 아바타 이모지를 지정할 수 있어요.<br><br>
<strong>■ 다른 기기로 연동</strong><br>
새 휴대폰·태블릿으로 기록을 그대로 옮기려면 <strong>동기화 코드</strong>를 쓰세요. 기존 기기에서 <strong>📤 동기화 코드 내보내기</strong>로 코드를 만든 뒤, 새 기기에서 <strong>📥 코드로 가져오기</strong>에 입력하면 승차권부터 즐겨찾기까지 한 번에 이동합니다.<br><br>
<span class="n-warn" style="display:block">별도의 회원가입·비밀번호는 없습니다. 모든 기록은 기기 안에 저장되며, 연동할 때만 동기화 코드로 오갑니다.</span>`
  },
  {
    date:'2026-07-17',
    cat:'timetable',
    title:'시간표 개정 — 수도권·강원·호남 8개 계통 신설·확충',
    body:`실제 운행 다이어에 맞춰 <strong>8개 계통·114편</strong>을 신설·확충했습니다. 수도권과 부산·목포·전주를 잇는 KTX부터 강원권 ITX-새마을, 소백선 무궁화호까지 포함됩니다. 모든 시각은 <strong>시발역 출발 기준</strong>입니다.<br><br>

<strong>■ 고속열차 (KTX·KTX-이음·KTX-산천)</strong>
<table>
<tr><th>계통</th><th>등급</th><th>편수</th><th>하행 첫차</th></tr>
<tr><td>서인천 ↔ 부산</td><td>KTX</td><td>16</td><td>서인천 06:05</td></tr>
<tr><td>서인천 ↔ 목포</td><td>KTX</td><td>12</td><td>서인천 05:20</td></tr>
<tr><td>마포 ↔ 전주 <span style="font-size:11px;color:var(--text2)">(호남선)</span></td><td>KTX</td><td>16</td><td>마포 05:15</td></tr>
<tr><td>마포 ↔ 전주 <span style="font-size:11px;color:var(--text2)">(장항선)</span></td><td>KTX-이음</td><td>16</td><td>마포 05:30</td></tr>
<tr><td>한강로 ↔ 태안</td><td>KTX-산천</td><td>10</td><td>한강로 06:21</td></tr>
</table>

<strong>■ 특급·일반 (ITX-새마을·무궁화호)</strong>
<table>
<tr><th>계통</th><th>등급</th><th>편수</th><th>하행 첫차</th></tr>
<tr><td>강릉 ↔ 부산</td><td>ITX-새마을</td><td>16</td><td>강릉 06:04</td></tr>
<tr><td>강릉 ↔ 영주</td><td>ITX-새마을</td><td>16</td><td>강릉 05:30</td></tr>
<tr><td>영동 ↔ 광주</td><td>무궁화호</td><td>12</td><td>영동 06:00</td></tr>
</table>
<span class="n-highlight" style="display:block;margin:8px 0">강릉 ↔ 영주 ITX-새마을(영동선·태백선)은 강릉·동해·삼척·도계·<strong>태백황지·황지·춘양</strong>·봉화·영주에 정차합니다. 태백·봉화 산간 구간을 잇는 계통입니다.</span>

<strong>■ 전 계통 시각표 (참조 페이지)</strong><br>
8개 계통 114편의 하행·상행 전 정차/통과 시각을 계통별 표로 정리했습니다.<br><br>
<a href="https://claude.ai/code/artifact/f5fd7b80-efbb-4f83-9edd-ff37396205b6" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;text-decoration:none">🔗 7월 17일 개정 전체 시각표 열기</a><br><br>
<span class="n-warn" style="display:block">모든 시각은 통과·추월 재검증을 거친 값입니다. 세부 착·발 시각은 앱의 각 열차 조회에서 확인하실 수 있습니다.</span>`
  },
  {
    date:'2026-07-17',
    cat:'update',
    title:'운용 탭과 권역 전체 노선도가 추가되었습니다',
    body:`열차가 하루 동안 어떻게 움직이는지 깊이 들여다볼 수 있는 <strong>운용 탭</strong>과, 권역별 전철 노선을 한눈에 보는 <strong>권역 전체 노선도</strong>가 새로 생겼습니다.<br><br>

<strong>■ 운용 탭 (상단 🔁 운용)</strong><br>
두 가지 보기를 제공합니다.<br><br>
<div class="n-box">
<strong>📈 운행 다이어그램</strong><br>
가로축은 시각(04~28시), 세로축은 노선의 역(거리순)입니다. 열차 한 편이 대각선 한 줄로 그려져, 선의 <span class="n-highlight">기울기로 속도</span>를, 선이 <span class="n-highlight">교차하는 지점으로 교행·추월</span>을 한눈에 볼 수 있습니다. 노선과 등급을 골라 볼 수 있고, 선을 누르면 그 열차 상세로 이동합니다.<br><br>
<strong>🔁 편성 운용 흐름도</strong><br>
편성(차량) 한 대가 하루에 어떤 열차로 이어 운행하는지를 가로 타임라인으로 보여줍니다. 블록 하나가 열차 한 편이며, 블록 사이 빈 구간은 회차·주박입니다. <span class="n-highlight">소속(기점)역별</span>로 편성을 묶어 보며, 블록을 누르면 열차 상세로 이동합니다.
</div><br>

<strong>■ 권역 전체 노선도 (전철 모드 · 노선도)</strong><br>
노선도 상단에서 <span class="n-highlight">🗺️ 권역 전체</span>를 누르면 해당 권역(수도권·영남·충청·호남)의 모든 전철 노선을 한 화면에 겹쳐 볼 수 있습니다. 화면이 복잡해지지 않도록 <strong>역 이름은 시·종착역에만</strong> 표시되며, 개별 노선은 기존처럼 칩에서 선택할 수 있습니다.<br><br>
<span class="n-warn" style="display:block">운용 탭은 기차 모드 상단, 권역 전체 노선도는 전철 모드 노선도에서 이용하실 수 있습니다.</span>`
  },
  {
    date:'2026-07-17',
    cat:'update',
    title:'노선도 겹쳐보기 추가 · 권역 전체 확대/축소 개선',
    body:`전철 노선도에 두 가지 개선이 적용되었습니다.<br><br>

<strong>■ 노선 겹쳐보기</strong><br>
노선도 상단의 <span class="n-highlight">🔀 겹쳐보기</span>를 누른 뒤 원하는 노선 칩들을 골라, <strong>특정 노선 몇 개만</strong> 한 화면에 겹쳐 볼 수 있습니다. 권역에 상관없이 자유롭게 조합할 수 있고, 고른 노선끼리의 <span class="n-highlight">환승역과 시·종착역</span>이 표시되어 노선 간 관계를 비교하기 좋습니다. <strong>✕ 전체 해제</strong>로 선택을 초기화할 수 있습니다.<br><br>

<strong>■ 권역 전체 노선도 확대/축소 수정</strong><br>
권역 전체 노선도에서 <span class="n-highlight">확대/축소(＋ －)</span>가 적용되지 않던 문제를 바로잡았습니다. 이제 겹쳐보기와 권역 전체 노선도에서도 원하는 만큼 확대해 세부 구간을 살펴볼 수 있습니다.`
  },
  {
    date:'2026-07-18',
    cat:'route',
    title:'제주선이 노선도에 추가되었습니다',
    body:`기차 노선도에 <strong>제주선</strong>이 새로 추가되었습니다.<br><br>

<strong>■ 운행 구간</strong><br>
<div class="n-box">장흥 — 강진 — 완도 — 노화 — 추자 — <strong>제주</strong></div>
<span class="n-highlight">작천 — 강진</span> 지선도 함께 표기됩니다.<br><br>

해당 구간을 운행하는 <strong>부산–제주 KTX</strong>와 <strong>목포–완도 무궁화호</strong>의 소속 노선에 제주선이 반영되어, 열차 조회·노선도 추적에서 제주선 구간을 확인하실 수 있습니다.<br><br>
<span style="color:var(--text2)">기차 모드 · 노선도 탭 상단에서 제주선을 선택해 보세요.</span>`
  },
  {
    date:'2026-07-18',
    cat:'update',
    title:'운행 다이어그램·심야 열차 상태 표시 개선',
    body:`세 가지 사용성 개선이 적용되었습니다.<br><br>

<strong>■ 운행 다이어그램 역명 고정</strong><br>
운용 탭의 <strong>운행 다이어그램</strong>을 좌우로 넘길 때 세로축 <span class="n-highlight">역 이름은 고정</span>되고 그래프만 움직이도록 바꿨습니다. 먼 시간대를 봐도 어느 역인지 바로 참조할 수 있습니다.<br><br>

<strong>■ 자정 넘겨 운행하는 열차 상태</strong><br>
익일 새벽까지 운행하는 열차가 종착 직후부터 다음 날 출발 전까지 계속 <strong>운행 종료</strong>로 표시되던 문제를 바로잡았습니다.<br>
<div class="n-box">운행 종료 후 <strong>03:59까지 '운행 종료'</strong> · <strong>04:00부터 '운행 준비중'</strong>으로 전환됩니다. (운행일 경계 04시 기준)</div><br>

<strong>■ 운행 준비중 열차 출발 안내</strong><br>
운행 준비중인 열차에도 운행 중 열차처럼 <span class="n-highlight">"약 N분 후 출발 예정"</span> 문구가 함께 표시됩니다.`
  },
  {
    date:'2026-07-18',
    cat:'update',
    title:'탑승 여정·역 전광판·다이어그램 등 4가지 기능 추가',
    body:`실제 열차를 타는 듯한 경험을 위해 기존 기능을 확장한 <strong>네 가지</strong>가 추가되었습니다.<br><br>

<strong>■ 🚆 탑승 여정 (실시간 승차 화면)</strong><br>
열차 상세 오른쪽 위 <span class="n-highlight">🚆</span> 버튼을 누르면, 그 열차의 <strong>현재 위치·진행률·다음 정차역까지 남은 시간</strong>과 전 정차역 타임라인(승강장·통과역 표시, 지나온 역은 흐리게, 현재역은 강조)이 한 화면에 뜹니다. 약 5초마다 자동 갱신됩니다.<br><br>

<strong>■ 🚉 역 실시간 전광판 (도착 추가)</strong><br>
역 정보의 <strong>출발 안내 전광판</strong>에 <span class="n-highlight">도착(ARRIVALS)</span> 탭이 생겼습니다. 출발/도착을 전환하며 승강장·행선지(또는 출발지)·안내 상태를 실제 역 전광판처럼 볼 수 있습니다.<br><br>

<strong>■ 📈 운행 다이어그램 상호작용</strong><br>
다이어그램에서 <strong>열차 선을 누르면 그 열차만 강조</strong>되고 나머지는 흐려집니다. 동시에 그 열차의 <span style="color:#ef4444;font-weight:700">교행</span>·<span style="color:#f0883e;font-weight:700">추월</span> 지점이 표시되고, 어느 역에서 몇 시에 어떤 열차와 만나는지 목록으로 정리됩니다.<br><br>

<strong>■ 🔍 출도착 "지금 출발" 안내</strong><br>
출도착 검색 결과에 현재 시각 기준 <span class="n-highlight">"N분 후 출발"</span> 배지가 표시됩니다. <strong>⏱ 지금</strong> 버튼과 함께 지금 탈 수 있는 열차를 바로 확인하세요.<br><br>

<span class="n-warn" style="display:block">더불어 열차 탭의 노선 선택 목록이 노선도의 전체 노선과 일치하도록 개선되어, 그동안 목록에서 빠져 있던 호남고속선·장항선·태안선·소백선·경북선·태백선·정선선·영동선·충북선·남부내륙선도 선택할 수 있습니다.</span>`
  },
  {
    date:'2026-07-18',
    cat:'update',
    title:'지연 예보를 열차 화면에서 바로 확인',
    body:`지금까지 <strong>지연 예측</strong> 탭에서만 볼 수 있던 노선·등급별 지연 정보를, 이제 열차를 보는 화면에서 바로 확인할 수 있습니다.<br><br>

<strong>■ 열차 상세 · 탑승 여정</strong><br>
각 열차에 <span class="n-highlight">지연 예보</span> 칩이 표시됩니다. 그 열차가 지나는 노선과 등급을 바탕으로 <strong>지연 위험(낮음/보통/높음)·확률·예상 지연(+분)</strong>을 안내합니다.<br><br>

<strong>■ 역 전광판</strong><br>
출발·도착 전광판의 각 열차 옆에 <span style="color:#3fb950;font-weight:700">초록</span>·<span style="color:#f97316;font-weight:700">주황</span>·<span style="color:#f85149;font-weight:700">빨강</span> 점으로 지연 위험을 표시합니다.<br><br>

<div class="n-box">지연 예보는 Mysterious Enterprise 운행 경향을 바탕으로 한 <strong>예측값</strong>이며, 실제 지연과 다를 수 있습니다. 지방 단선·고속열차는 지연이 적은 편입니다.</div>`
  },
  {
    date:'2026-07-18',
    cat:'update',
    title:'지연 시뮬레이션 (실험적)',
    body:`지연 예보를 <strong>실제 운행에 반영</strong>하는 시뮬레이션 기능이 추가되었습니다.<br><br>

<strong>■ 켜는 법</strong><br>
<span class="n-highlight">지연 예측 탭</span> 상단의 <strong>🔴 지연 시뮬레이션</strong> 스위치를 켜면 적용됩니다. (기본 꺼짐)<br><br>

<strong>■ 무엇이 달라지나</strong><br>
켜면 각 열차에 <strong>오늘의 실제 지연</strong>이 부여되어 다음 화면에 반영됩니다.<br>
<div class="n-box">
🗺️ <strong>노선도</strong> — 열차가 지연된 실제 위치에 표시<br>
🚆 <strong>탑승 여정</strong> — "약 N분 지연 운행 중" · 도착 지연 예상<br>
🚉 <strong>전광판</strong> — 정시 대신 "N분 지연" 표시<br>
🎫 <strong>예매·승차권</strong> — 구입 화면에 "현재 약 N분 지연 운행 중"<br>
📋 <strong>지연 예측 탭</strong> — 지금 지연 운행 중인 열차 목록(누르면 여정)
</div><br>

<strong>■ 지연은 이렇게 정해집니다</strong><br>
지연 확률·크기는 <strong>인게임 지연 예측(노선·등급별)</strong>을 그대로 기반으로 합니다. 여기에 <span class="n-highlight">열차가 몰리는 혼잡 구간</span>과 <span class="n-highlight">전철과 병행하는 구간</span>을 <strong>참고</strong>해 "어느 노선에서 주로 지연되는지" 확률을 가감합니다. (별개 선로인 경부선 남안양~천안은 전철 병행에서 제외) 그래서 수도권·간선 혼잡 노선일수록 지연이 잦고, 한산한 지방 단선은 거의 정시로 운행합니다.<br><br>
지연은 운행 중 문제 구간에서 서서히 누적됐다가 여유 구간에서 <strong>조금씩만 회복</strong>됩니다(한 번에 크게 줄지 않음). 그래서 지연 예상 열차가 예상보다 일찍·정시에 도착하기도 하고, 반대로 예상에 없던 소폭 지연이 생기기도 합니다. <strong>단거리 열차는 장거리 열차보다 지연 확률·지연량이 적습니다.</strong> 같은 열차는 그날 하루 같은 패턴을 유지합니다(매일 조금씩 달라짐).<br><br>
<span class="n-warn" style="display:block"><strong>시간표 조회 화면은 언제나 정시 그대로</strong>입니다. 시뮬레이션은 라이브 화면에만 적용되며, 실제 운행과 무관한 예측 기반 연출입니다.</span>`
  }
];
