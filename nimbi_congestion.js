// ══════════════════════════════════════════
// 🚆 님비레일 혼잡도 알고리즘 (nimbi_congestion.js)
// ══════════════════════════════════════════

// 혼잡도 세션 메모리 캐시 (localStorage 제거 → 모바일 성능 향상)
const _bookedCache={};
function loadCongestion(){ return _bookedCache; }
function saveCongestion(d){ Object.assign(_bookedCache,d); }

function getBookedSeats(trainNo, travelDate){
  const tickets=typeof loadTickets==='function'?loadTickets():[];
  const booked=new Set();
  tickets.filter(tk=>tk.trainNo===trainNo&&tk.travelDate===travelDate&&tk.status==='active')
    .forEach(tk=>(tk.seats||[]).forEach(s=>booked.add(s)));
  const key=`${trainNo}:${travelDate}`;
  (_bookedCache[key]||[]).forEach(s=>booked.add(s));
  return booked;
}

// 메모리 캐시 (세션 내 재계산 방지)
const _congCache={};
const _levelCache={};
// 자정 캐시 무효화
(()=>{
  const now=new Date();
  const midnight=new Date(now); midnight.setHours(24,0,0,0);
  setTimeout(()=>{
    Object.keys(_levelCache).forEach(k=>delete _levelCache[k]);
    Object.keys(_congCache).forEach(k=>delete _congCache[k]);
  }, midnight-now);
})();

// ── 노선별 기본 수요 ──
function getLineDemand(trainNo, grade, isWeekend){
  const n=parseInt(trainNo)||0;

  // KTX 경부고속선 (1~100, 501~600)
  if((n>=1&&n<=100)||(n>=501&&n<=600)) return isWeekend?0.88:0.85;
  // SRT (301~399)
  if(n>=301&&n<=399) return isWeekend?0.86:0.83;
  // KTX 강릉/중앙선 (711~750) — 주말 스키·관광 극성수기
  if(n>=711&&n<=750) return isWeekend?0.92:0.58;
  // KTX 호남선 (201~299)
  if(n>=201&&n<=299) return isWeekend?0.82:0.76;
  // KTX 전라선 (401~499)
  if(n>=401&&n<=499) return isWeekend?0.80:0.68;
  // ITX-청춘 경춘선 (2001~2099)
  if(n>=2001&&n<=2099) return isWeekend?0.82:0.55;
  // ITX-새마을 경부선 (1001~1099)
  if(n>=1001&&n<=1099) return isWeekend?0.72:0.68;
  // ITX-새마을 기타 (1101~1199)
  if(n>=1101&&n<=1199) return isWeekend?0.68:0.62;
  // 무궁화 경부선 (1301~1399) — 평일 단거리 통근 높음
  if(n>=1301&&n<=1399) return isWeekend?0.65:0.70;
  // 무궁화 호남선 (1501~1599)
  if(n>=1501&&n<=1599) return isWeekend?0.62:0.60;
  // 무궁화 경전선 (1741~1799) — 지방 노선, 저수요
  // 단 진주/창원~부산은 보정값 있음 (getStnBonus로 처리)
  if(n>=1741&&n<=1799) return isWeekend?0.42:0.38;
  // 무궁화 동해선 (1821~1869) — 포항~부산 구간 보정
  if(n>=1821&&n<=1869) return isWeekend?0.45:0.40;
  // 무궁화 영동선 (1591~1639) — 지방 저수요
  if(n>=1591&&n<=1639) return isWeekend?0.40:0.35;
  // 무궁화 전라선 (1701~1739)
  if(n>=1701&&n<=1739) return isWeekend?0.58:0.52;
  // 기타
  return isWeekend?0.50:0.45;
}

// 출발/도착역 기반 구간 보너스
// 경전선: 진주/창원~부산, 동해선: 포항~부산 장거리
const REGIONAL_BONUS_STNS=new Set([
  '부산','동래','포항','경주','울산','창원','마산','진주','순천'
]);
function getStnBonus(trainNo){
  const n=parseInt(trainNo)||0;
  const t=getTrainByNo(trainNo);
  if(!t) return 0;
  const stns=t.stops.map(s=>s.s);
  // 경전선: 부산~진주/창원 구간이면 보너스
  if((n>=1741&&n<=1799)){
    const hasBusan=stns.includes('부산')||stns.includes('동래');
    const hasCentral=stns.includes('창원')||stns.includes('마산')||stns.includes('진주');
    if(hasBusan&&hasCentral) return 0.15;
  }
  // 동해선: 포항~부산 구간이면 보너스
  if((n>=1821&&n<=1869)){
    const hasBusan=stns.includes('부산')||stns.includes('동래');
    const hasPoHang=stns.includes('포항')||stns.includes('경주');
    if(hasBusan&&hasPoHang) return 0.18;
  }
  return 0;
}

// ── 시간대별 수요 ──
function getHourDemand(hour, isWeekend){
  if(isWeekend){
    if(hour<=5)  return 0.28;
    if(hour<=8)  return 0.58;
    if(hour<=11) return 0.88;
    if(hour<=14) return 0.85;
    if(hour<=17) return 0.80;
    if(hour<=20) return 0.75;
    if(hour<=22) return 0.65;
    return 0.45;
  } else {
    if(hour<=5)  return 0.22;
    if(hour<=6)  return 0.48;
    if(hour<=9)  return 0.92; // 출근 피크
    if(hour<=12) return 0.62;
    if(hour<=15) return 0.65;
    if(hour<=17) return 0.72;
    if(hour<=20) return 0.90; // 퇴근 피크
    if(hour<=22) return 0.60;
    return 0.35;
  }
}

// ── 출발일까지 남은 기간 ──
function getDateProximityFactor(travelDate){
  const today=new Date(); today.setHours(0,0,0,0);
  const travel=new Date(travelDate); travel.setHours(0,0,0,0);
  const d=Math.round((travel-today)/(864e5));
  if(d<=0)  return 0.98;
  if(d<=1)  return 0.93;
  if(d<=3)  return 0.85;
  if(d<=7)  return 0.72;
  if(d<=14) return 0.52; // 2주: 대부분 여유
  if(d<=21) return 0.38; // 3주: 거의 여유
  if(d<=30) return 0.28;
  return 0.18;
}

// ── 등급별 보정 ──
function getGradeCarFactor(carType){
  if(carType==='special')  return 0.72;
  if(carType==='premium')  return 0.75;
  if(carType==='free')     return 0;
  return 1.0;
}

// ── 최종 예매율 계산 ──
function calcRealisticFillRate(trainNo, travelDate, depTime, grade){
  function strSeed(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return Math.abs(h)||1;}
  const _s=strSeed(trainNo+travelDate);
  const noise=((((Math.imul(1664525,_s)+1013904223)>>>0)/4294967296)*0.16)-0.08;

  const dow=new Date(travelDate).getDay();
  const isWeekend=(dow===0||dow===6);
  const isFriday=(dow===5);

  const lineDemand=getLineDemand(trainNo, grade||'', isWeekend);
  const stnBonus=getStnBonus(trainNo);

  const h=depTime?parseInt(depTime.split(':')[0]):12;
  let hourDemand=getHourDemand(h, isWeekend);
  if(isFriday&&h>=17&&h<=21) hourDemand=Math.min(0.95,hourDemand*1.15);

  const dateFactor=getDateProximityFactor(travelDate);

  // 가중 평균: 노선(40%) + 시간대(35%) + 날짜(25%)
  const base=(lineDemand+stnBonus)*0.40 + hourDemand*0.35 + dateFactor*0.25;
  return Math.min(0.98, Math.max(0.04, base+noise));
}

// ── 가상 예약 생성 ──
function generateVirtualBookings(trainNo, travelDate, composition){
  const key=`${trainNo}:${travelDate}`;
  if(_congCache[key])return;
  const cong=loadCongestion();
  if(cong[key]){_congCache[key]=true;return;}

  const t=getTrainByNo(trainNo);
  const depTime=t?t.stops[0].dep||t.stops[0].arr:null;
  const baseFillRate=calcRealisticFillRate(trainNo,travelDate,depTime,t?.grade);

  function seededRand(seed,i){let x=Math.sin(seed*9301+i*49297+233)*803.9;return x-Math.floor(x);}
  function strSeed(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return Math.abs(h);}
  const seed=strSeed(trainNo+travelDate);

  const booked=[];
  let idx=0;
  composition.forEach(car=>{
    if(car.type==='free')return;
    const classMulti=getGradeCarFactor(car.type)||1.0;
    if(!classMulti)return;
    const fillRate=Math.min(0.98,baseFillRate*classMulti);
    const missing=new Set(car.missingSeats||[]);
    Array.from({length:car.rows||20},(_,r)=>r+1).forEach(row=>{
      (car.cols||[]).forEach(col=>{
        if(missing.has(`${row}${col}`))return;
        if(seededRand(seed,idx++)<fillRate) booked.push(typeof seatId==='function'?seatId(car,row,col):`${car.car}호차 ${row}${col}`);
      });
    });
  });
  _bookedCache[key]=booked; _congCache[key]=true;
}

// ── 혼잡도 레벨 반환 ──
function getCongestionLevel(trainNo, travelDate, composition){
  const _ck=trainNo+':'+travelDate;
  if(_levelCache[_ck])return _levelCache[_ck];
  // 좌석 순회 없이 fillRate만으로 즉시 계산 (열차 목록용)
  const t=getTrainByNo(trainNo);
  const depTime=t?t.stops[0].dep||t.stops[0].arr:null;
  const rate=calcRealisticFillRate(trainNo,travelDate,depTime,t?.grade);
  const _r=rate>=0.95?{rate,label:'매진 임박',color:'var(--red)'}:
            rate>=0.80?{rate,label:'혼잡',color:'var(--orange)'}:
            {rate,label:'',color:''}; // 보통/여유는 목록에서 표시 안 함
  _levelCache[_ck]=_r; return _r;
}

// 호차별 잔여석 계산
function getCarRemaining(trainNo, travelDate, car){
  generateVirtualBookings(trainNo, travelDate, [car]);
  const booked=getBookedSeats(trainNo,travelDate);
  const missing=new Set(car.missingSeats||[]);
  let total=0, bookedCnt=0;
  Array.from({length:car.rows||20},(_,r)=>r+1).forEach(row=>{
    (car.cols||[]).forEach(col=>{
      if(missing.has(`${row}${col}`))return;
      total++;
      if(booked.has(typeof seatId==='function'?seatId(car,row,col):`${car.car}호차 ${row}${col}`))bookedCnt++;
    });
  });
  return{total, remaining:total-bookedCnt};
}
