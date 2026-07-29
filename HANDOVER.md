# NIMBYRAILTABLE 인수인계 문서 (→ CODEX)

> 님비레일 시간표 — 게임 **NIMBY Rail**의 한국형 철도/도시철도 시간표 정적 PWA.
> 이 문서는 세션 인계 시점의 프로젝트 구조·규약·도메인 규칙·남은 작업을 정리한 것.
> 최신 코드가 항상 우선이며, 문서와 코드가 다르면 코드/테스트를 신뢰할 것.

---

## 0. 한눈에

- **성격**: 서버 없는 100% 정적 PWA. GitHub Pages 배포. 모든 로직은 클라이언트 JS.
- **배포 URL**: https://copomok.github.io/NIMBYRAILTABLE/
- **저장소 스코프**: `copomok/nimbyrailtable` (그 외 저장소 접근 금지)
- **응답 언어**: 사용자와의 대화는 **항상 한국어**.
- **도메인**: 실제 한국 철도가 아니라 **게임 NIMBY Rail의 가상 세계**. 역명·노선은 가상이며 실제와 다를 수 있음. 데이터는 인게임 파일에서 추출.

---

## 1. 반드시 지켜야 할 배포/버전 규약

정적 PWA + 서비스워커 캐시라, **버전을 안 올리면 사용자 화면이 갱신되지 않는다.** 배포마다 아래를 반드시 수행:

1. `sw.js`의 `CACHE_NAME`을 갱신 (`nimbirail-YYYYMMDDNN` 날짜형, 예: `nimbirail-2026072901`).
2. 변경한 파일의 `index.html` 내 쿼리 버전 `?v=YYYYMMDDNN`을 갱신 (파일별로 독립 버전을 씀 — 바꾼 파일만 올리면 됨). CSS·JS·데이터 각각.
3. `sw.js`의 `ASSETS` 목록에 새 파일이 있으면 추가.
4. 커밋 전 **`node --check <파일>`**로 구문 검사. JS 데이터 파일도 검사(대용량은 vm 로드로 확인).
5. **테스트 실행**: `node --test tests/` (아래 6절). 관련 테스트가 초록인지 확인.
6. 브랜치에 커밋·푸시 → `main`에 **`git merge --ff-only`** → main 푸시. (푸시는 네트워크 실패 시 2s/4s/8s/16s 백오프 재시도.)
7. GitHub Pages는 push 후 수 분 내 자동 빌드. 배포 확인은 Actions 워크플로 상태로.

> 개발 브랜치 규약: 작업은 지정 개발 브랜치에서 하고 ff로 main 반영. PR은 사용자가 명시적으로 요청할 때만 생성.

---

## 2. 파일 구조 (인계 시점)

```
index.html                     진입점. 모든 data/*.js, js/*.js를 순서대로 로드(순서 중요: 데이터→코어→기능)
sw.js                          서비스워커(캐시). CACHE_NAME + ASSETS
manifest.json                  PWA 매니페스트
js/
  nimbi_rail.js                메인 애플리케이션(초대형, 약 1.8만 줄). UI·탭·전철/기차 로직 대부분
  core/nimbi_rail_index.js     인덱스/부트스트랩
  features/
    nimbi_delay.js             지연 예보/시뮬레이션 엔진(DELAY_MODEL 등)
    nimbi_demand.js            OD 기반 수요
    nimbi_booking_dynamics.js  예매 동학
    nimbi_inventory.js         좌석 재고
    nimbi_congestion.js        혼잡도
    nimbi_engagement.js        참여/게이미피케이션
    nimbi_track_semantic.js    ★ 배선 의미 분석기(Raw s/d 폴리라인→연결그래프→코리더→트랙 타입/승강장 관계)
data/
  nimbi_rail_data.js           기차(간선) 운행 데이터
  nimbi_station_data.js        역 좌표/메타(STATION_DB)
  nimbi_metro.js               METRO_LINES(전철 노선: stations/routes/branches/color/loop/patterns/first/last…)
  nimbi_metro_sched.js         METRO_SCHED(인게임 v6 전철 시각표) — 3.3MB, 핵심
  nimbi_metro_schedule_updates.js  시각표 패치 오버레이
  nimbi_metro_service_policy.js    운행 정책 오버레이(예: 경부선 급행 심야 시발 제거)
  nimbi_metro_geo.js           전철 배선 지오데이터 {m:본선좌표, b:지선, d:차량기지}
  nimbi_platform_db.js         PLATFORM_DB(역별 홈번호→노선 매핑)
  nimbi_realplat.js            실 승강장 데이터
  nimbi_track_reference.js     배선 레퍼런스(빌드 산출물)
  nimbi_rail_notices.js        공지
  nimbi_pax.js / nimbi_train_demand.js / nimbi_demand_data.js  수요/승객
tools/
  build_track_reference.mjs    배선 레퍼런스 빌드
  build_demand_source.mjs      수요 소스 빌드
tests/                         node --test 스위트(아래 6절)
pages/nimbi_delay_explanation.html
assets/css/nimbi_rail.css      전체 스타일(단일 CSS)
assets/reference/nimbi_gyeongbu_track.svg  경부선 배선 SVG 레퍼런스
sync-worker/                   (별도 워커)
```

로드 순서 주의: `index.html`에서 데이터(js) → `js/core` → `js/features/*(delay 등)` → `js/nimbi_rail.js` → 나머지 features 순. 전역 상수(`METRO_SCHED`, `METRO_LINES`, `PLATFORM_DB`, `STATION_DB` 등)는 `const`로 선언돼 전역에 노출됨.

---

## 3. 데이터 모델 (가장 중요)

### 3.1 영업일/시각 기준
- **영업일 04:00 = 0분** 기준으로 계산. 자정~03:59는 전날 영업일에 속함.
- 변환: `srv = (((min-240)%1440)+1440)%1440` (분), 초 단위는 `(((s-14400)%86400)+86400)%86400`.
- 시계 표기 되돌리기: `m=(srvMin+240)%1440`.

### 3.2 METRO_SCHED (전철 시각표) — 핵심 포맷
```
METRO_SCHED[노선] = {
  s: [역명...],                         // 역 인덱스 사전(병합 역 목록)
  t: [[도착분, 출발분, 역idx, ...], ...], // 편성마다 (도착,출발,역idx) 3튜플 반복
  c?: [등급...]                         // 편성별 등급 0=일반,1=급행,2=특급
}
```
- **한 편성 `t[k]`는 왕복(기점→종점→기점) 전체**를 담는다. 즉 한 물리 열차에 상·하행이 모두 들어있음. ← 매우 중요.
- `역idx`는 `s`의 인덱스. 급행 통과/지선 병합 때문에 **인덱스가 물리적 위치 순서와 일치하지 않을 수 있음**(점프 발생). 방향을 단순히 idx 증감 부호로 판단하면 안 됨.
- **종점 보정**: 왕복 편성이 착발역 한 정거장 앞에서 끝나게 기록된 경우 실 종착까지 stop을 연장해 둔 상태.
- **WP 오매핑('?'역) 제거 완료**: 과거 인게임 WP를 역으로 오인해 '?'역 시종착이 생기던 버그는 해결됨.

### 3.3 leg(편성 방향구간) 분할 — 반드시 이해할 것
- 왕복 편성을 화면/현위치용으로 쓰려면 **fold-apex(회차점)에서 leg로 잘라** 상·하행을 별개 열차처럼 취급해야 한다.
- 회차점 판정: 인덱스열에서 `ix(j+1)===ix(j)`(연속 중복=당역종착 후 재출발) 또는 `ix(j+1)===ix(j-1)`(A>B>A 정점).
- `_metroStationDeps(stn)`가 각 출발편에 **leg 경계 `k0`(출발지 인덱스)·`k1`(행선지 인덱스)**를 붙여 반환한다. 현위치 계산(`_metroTrainPos`)은 이 `k0/k1` 범위로 한정해야 반대방향(상행)이 새어나오지 않는다.
- 주의: 급행 인덱스 점프 때문에 “leg 내부에 부호변화가 있는 것처럼” 보여도, **시간(absA/absD) 기준으로는 단조**이므로 시간 기반 위치 계산은 정확하다. 검증 결과 24.4만 출발편에서 반대방향 시간 누출 0건.

### 3.4 METRO_LINES (노선 정의)
```
{ id, name, region, color, loop, night, from, to, n,
  stations:[...], routes:[{stations, xy, dash?}...], patterns:[...],
  first, last, hwPeak, hwOff }
```
- `routes[0]`=본선, `routes[1..]`=지선(dash:true). 지선은 같은 노선명을 공유하고 승강장은 `"경부선 (조치원지선)"`처럼 괄호 접미로 구분됨.
- `loop:true`면 순환선(종단 회차 없음).

### 3.5 PLATFORM_DB / 지오데이터
- `PLATFORM_DB[역명] = { 홈번호: { g:[등급], l:[노선원문...] } }`. 전철·기차 노선명 모두 등장.
- `nimbi_metro_geo.js`: `METRO_GEO[노선]={ m:[본선 [lon,lat]], b:[{lbl,s:[역],c:[좌표]}]지선, d:[{n:기지명,xy,j:본선역idx}]차량기지 }`.
- 참고 업로드 원천(리포 밖, 있으면 활용): `db1_stations.json`(역별 lon/lat + 홈→노선), `db4_geodata.json`(23MB, 정밀 역좌표 + 9744개 선로 geometry). 배선 레퍼런스/의미분석기의 원천.

---

## 4. 도메인 규칙 & 함정 (놓치기 쉬운 것)

1. **당역종착 처리**: 조회역이 종착인 열차(`arr` 있고 `dep` 없음, 또는 dest===조회역)는 출발편에서 제외. `_metroStationDeps`에 `dest===stn` 가드 있음. 종착역에서 이게 새면 안 됨(전 노선 스캔으로 0건 확인해야).
2. **상하행 정의**: **기점→종점 = 하행, 종점→기점 = 상행.** UI 색: 하행=노선색, 상행=주황(#e8863d). (실시간 타임라인은 하행=좌, 상행=우.)
3. **분기역 방면 병합**: 3방면 이상은 실좌표 각도 클러스터링으로 2개 물리 방면(극)으로 병합해 표기(`_metroDirGroups`). 같은 쪽 계통은 한 열로.
4. **회차 열차 = 다른 열차 취급**: 3.3의 leg 분할을 지키지 않으면 “금성행 현위치인데 봉무(반대) 접근” 같은 버그 재발.
5. **인덱스 점프**: 급행/지선 때문에 `s` 인덱스가 물리 순서와 안 맞음. 방향/거리 판단은 좌표(METRO_GEO/STATION_DB) 또는 시간으로.
6. **실좌표 부재**: 승강장별 좌표는 원천 데이터에 없음(역 단일 좌표만). 승강장 상대/섬식 정확 구분은 데이터로 불가 → `nimbi_track_semantic.js`가 선로 geometry로 추정.
7. **정적 제약**: 외부 요청 불가(폰트/CDN 등). CSP 유사. 모든 것 인라인/로컬.

---

## 5. 기능별 현황 (인계 시점)

- **전철 역 도착보드**(`_metroStationBoardHTML`/`_metroStationDeps`): 계통별 방면·첫막차·다음열차·현위치(접근/도착/출발) 토글. 남은 열차가 적으면 다음날로 감싸 억지로 채우지 않음.
- **전체 시간표 팝업**(`openMetroTimetable`): 방면별 그리드. 방면별 ‘다음 열차’ 강조 + 다음 열차로 자동 스크롤.
- **노선 상세 실시간 타임라인**(`_renderMetroLiveTimeline`): 좌=역명 게터, 중앙 복선 레일(역 원, 타이선 없음), 좌레인=하행·우레인=상행 열차 칩(리더선+디클러터). ON/OFF 토글(`_metroLiveOn`).
- **현위치 계산**: `_metroTrainPos(line, svcIdx, k0, k1, targetStn)` — leg 범위 한정. `_metroTrainLivePos`/`_metroLineLiveTrains`는 편성별 현 위치 마커.
- **지연 예보/시뮬레이션**: `js/features/nimbi_delay.js`.
- **예매/좌석/수요/재고**: `nimbi_demand.js`·`nimbi_booking_dynamics.js`·`nimbi_inventory.js` + 데이터. 실제 좌석 배치·OD 수요·구간 재고 반영.
- **배선(track schematic) 기능은 제거됨**(최근 커밋 `배선 기능 제거`). 다만 **레거시 죽은 코드가 nimbi_rail.js에 잔존**: `_metroSchCanvas`, `_metroSchCanvasLegacy`, `_sxRoute`, `_sxRouteTokens`, `renderMetroSchematicTab` 등. `index.html`엔 배선 탭 없음(비활성). → **정리(삭제) 대상.** 되살릴 계획이면 `nimbi_track_semantic.js`(의미분석기)와 `assets/reference/nimbi_gyeongbu_track.svg`, `data/nimbi_track_reference.js`가 기반.

> 참고: 배선을 두고 (a) 인게임 실선로 geometry 직접 투영, (b) 승강장 블록식+이상화 유치선/건넘선, (c) 고정축 라우트 렌더러, (d) 의미분석기 기반 재구성 순으로 여러 번 재설계되다 최종 제거됨. 다시 손댈 경우 이 히스토리(git log의 `배선`·`track schematic` 커밋들)를 먼저 읽을 것.

---

## 6. 테스트 & 빌드

- **테스트**: `node --test tests/` — metro_track, track_semantic, metro_route, metro_service_policy, metro_timetable, metro_ui_enhancements, seat_layout_revision, demand_inventory, booking_ui_revision, train_grade_revision, metro_express_revision, track_reference 등. **변경 후 관련 테스트를 돌리고 초록 확인이 이 프로젝트의 기준.**
- **빌드 도구**: `node tools/build_track_reference.mjs`, `node tools/build_demand_source.mjs` — 데이터 산출물 재생성. 원천 데이터 바뀌면 재빌드.
- **헤드리스 렌더 검증**(권장): 이 환경엔 Chromium이 있음(`/opt/pw-browsers/chromium-*/chrome-linux/chrome`, Playwright `/opt/node22/lib/node_modules/playwright`). SVG/HTML을 파일로 써서 스크린샷으로 UI를 눈으로 확인하는 방식이 매우 유용했음.

---

## 7. 남은 작업 / 알려진 이슈 (우선순위 제안)

1. **레거시 배선 코드 정리**: 비활성 `_metroSchCanvas*`/`_sxRoute*`/`renderMetroSchematicTab` 및 관련 `.msch-*`/`.tsx-*` CSS, `data/nimbi_metro_track.js`(미사용 가능성) 제거로 번들 축소. 제거 전 참조 여부 grep 필수.
2. **전체 시간표 ‘다음 열차’ 강조 정책 확인**: 현재는 방면별 다음 1편씩 강조. 사용자가 “다음 열차 이후 전부 강조”를 원할 여지 있음 — 요구 재확인.
3. **혼잡 노선 실시간 타임라인 밀집**: 한 레인에 편성이 많으면(예: 경부선 60여 편성) 디클러터로 칩이 밀려 리더선이 길어짐. 급행/완행 레인 분리 또는 칩 축약 검토.
4. **당역종착/leg 회귀 테스트 상시화**: `_metroStationDeps`의 `dest===stn` 0건, leg 반대방향 시간 누출 0건을 테스트로 고정(회귀 방지). 급행·지선 편성이 추가될 때 특히.
5. **PENDING(기존 백로그, task#19류)**: 검색바 통일, 특정역 좌표 보정, 전철 지선 표기, 지도 줌 숨김, 탭 정리, 새로고침, 루트 퍼즐, 공지 등 잔여 UI 항목 — 원 백로그 확인 요망.
6. **데이터 정합성**: METRO_SCHED에 편성/시각 추가·수정 시 종점 보정·WP 제거·회차 leg가 깨지지 않는지 스캔(전 노선 self-dest/누출/시각충돌 검증 스크립트를 만들어 CI화 권장).

---

## 8. 작업 스타일 메모

- 파일이 매우 큼(`nimbi_rail.js` 수만 줄). 정확한 앵커로 국소 편집. 대규모 함수 교체는 중괄호 매칭 스크립트로.
- 커밋 메시지는 한국어로 “무엇을/왜”. 배포마다 sw/버전 갱신을 커밋에 포함.
- UI 변경은 데이터 로직과 분리해 검증(헤드리스 스크린샷). 색/아이콘만 바꾸는 표면 수정과 좌표/그래프 재구성은 구분.
- 이 세션에서 마지막으로 반영된 것: 회차 상하행 leg 분리(k0/k1), 실시간 상하행 분리 타임라인, 당역종착 가드, 전체시간표 다음열차 강조/자동스크롤, 도착카드 잔여편 표기. 이후 커밋들이 보드/좌석/급행정책/의미분석기를 추가하고 배선을 제거함.

— 끝 —
