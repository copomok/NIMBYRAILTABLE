# 님비레일 동기화 릴레이 배포 (Cloudflare Workers, 무료)

계정 데이터를 짧은 코드(6자)로 주고받기 위한 아주 작은 저장소입니다. 무료 플랜으로 충분합니다.

## 1) Cloudflare 계정 준비
- https://dash.cloudflare.com 에서 무료 가입/로그인.

## 2) KV 네임스페이스 만들기
- 좌측 **Storage & Databases → KV → Create a namespace**
- 이름 예: `nimbi_sync` → 생성.

## 3) Worker 만들기
- **Workers & Pages → Create → Worker** → 이름 예: `nimbi-sync` → Deploy.
- 배포 후 **Edit code**로 들어가 `worker.js`의 내용을 그대로 붙여넣고 Deploy.

## 4) KV 바인딩 연결 (중요)
- 그 Worker의 **Settings → Bindings → Add → KV namespace**
- **Variable name 은 반드시 `SYNC`**, Namespace 는 2)에서 만든 것 선택 → Save & Deploy.

## 5) 앱에 URL 등록
- 배포된 주소(예: `https://nimbi-sync.<계정>.workers.dev`)를 복사.
- 앱 → 마이페이지 → 내 계정 → 기기 간 연동 → **동기화 서버 설정**에 붙여넣기.
  (또는 이 URL을 알려주시면 앱에 기본값으로 넣어 드립니다 → 모든 기기 무설정 사용)

## 동작
- 내보내기: 데이터를 릴레이에 저장하고 6자 코드를 받음.
- 가져오기: 6자 코드로 데이터를 내려받아 계정에 반영.
- 저장 데이터는 180일 후 자동 삭제됩니다.
