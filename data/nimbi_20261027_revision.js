// 2026-10-27: 태백황지·장항선 시각 보정.
(() => {
  if (typeof ALL_TRAINS === 'undefined') return;
  const byNo = new Map(ALL_TRAINS.map(train => [Number(train.no), train]));
  const minutes = value => {
    const [hour, minute] = String(value).split(':').map(Number);
    return hour * 60 + minute;
  };
  const clock = value => `${Math.floor(((value % 1440) + 1440) % 1440 / 60)}:${String(((value % 1440) + 1440) % 1440 % 60).padStart(2, '0')}`;
  const move = (value, delta) => value == null ? value : clock(minutes(value) + delta);

  // 상행 5편의 중랑 4분 정차는 2분으로 줄이고, 출발·종착 시각은 유지한다.
  for (const no of [1692,1694,1696,1698,1700]) {
    const train=byNo.get(no);
    const index=train?.stops.findIndex(item => item.s === '중랑');
    if (index < 0) continue;
    const middle=train.stops[index], terminal=train.stops[index+1];
    if (minutes(middle.dep)-minutes(middle.arr) !== 4 || terminal?.s !== '청량리') continue;
    middle.arr=move(middle.arr,2);
  }

  // 삼례부터 공통 경로인 1464호와 역전되지 않도록 1484호 전 역을 함께 이동한다.
  const no1484=byNo.get(1484);
  if (no1484) for (const item of no1484.stops) {
    item.arr=move(item.arr,11);
    item.dep=move(item.dep,11);
  }
})();
