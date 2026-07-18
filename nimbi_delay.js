// ═══════════════════════════════════════════════════════════════
// 🚦 님비레일 지연 예보·시뮬레이션 엔진 (nimbi_rail.js에서 분리)
//  기반  : 인게임 발췌 지연 예측(DELAY_MODEL) — 노선·등급별 확률/범위(주기반)
//  보정  : 구간 특성(전철 병행·혼잡) · 거리(소요) · 시간대(러시) · 요일/날씨(일 단위)
//  전파  : 편성 회차 연쇄(선행 편성 지연 상속) · 원인 추적/로그
//  성질  : 결정적(열차+운행일 시드) · 하루 단위 캐시 · 점진 회복(구간 상한)
//  분포  : 대부분 정시~2분, 5~10분 드묾, 15분+ 희귀, 30분+ 는 악천후/재해일만
// ═══════════════════════════════════════════════════════════════

// ── 인게임 발췌 지연 예측 ──
const DELAY_MODEL=[
  {name:'경부고속선 KTX',prob:18,min:2,max:5,c:'#3b82f6'},
  {name:'호남고속선 KTX',prob:20,min:2,max:6,c:'#3b82f6'},
  {name:'강릉선 KTX',prob:28,min:3,max:8,c:'#3b82f6'},
  {name:'중앙선 KTX',prob:32,min:3,max:10,c:'#3b82f6'},
  {name:'경부고속선 SRT',prob:16,min:2,max:5,c:'#a855f7'},
  {name:'경부선 ITX-새마을',prob:38,min:5,max:15,c:'#ef4444'},
  {name:'경부선 무궁화호',prob:42,min:5,max:18,c:'#f97316'},
  {name:'호남선 무궁화호',prob:40,min:5,max:16,c:'#f97316'},
  {name:'중앙선 무궁화호',prob:30,min:4,max:12,c:'#f97316'},
  {name:'경전선 무궁화호',prob:25,min:3,max:10,c:'#f97316'},
  {name:'동해선 무궁화호',prob:22,min:3,max:8,c:'#f97316'},
];
const _DELAY_DEFAULT={'KTX':{prob:22,min:2,max:6},'SRT':{prob:18,min:2,max:5},
  'ITX-새마을':{prob:35,min:4,max:13},'ITX-청춘':{prob:30,min:4,max:12},
  'ITX-마음':{prob:30,min:4,max:12},'남도해양':{prob:34,min:4,max:13},'무궁화호':{prob:38,min:5,max:15}};
function _delayGradeFamily(g){ if(/KTX/.test(g))return 'KTX'; if(g==='SRT')return 'SRT';
  if(g==='ITX-새마을')return 'ITX-새마을'; if(g==='ITX-청춘')return 'ITX-청춘';
  if(g==='ITX-마음')return 'ITX-마음'; if(g==='남도해양')return '남도해양'; return '무궁화호'; }
function _delayLevel(prob){ return prob<25?'low':prob<40?'med':'high'; }
function _delayForecast(line,grade){
  const fam=_delayGradeFamily(grade);
  const parts=(line||'').split('·').map(s=>s.trim());
  let best=null;
  DELAY_MODEL.forEach(d=>{ const sp=d.name.lastIndexOf(' '); const dl=d.name.slice(0,sp), dg=d.name.slice(sp+1);
    if(dg===fam&&parts.includes(dl)){ if(!best||d.prob>best.prob)best=d; } });
  const base=best?{prob:best.prob,min:best.min,max:best.max}:(_DELAY_DEFAULT[fam]||_DELAY_DEFAULT['무궁화호']);
  const lv=_delayLevel(base.prob);
  return {prob:base.prob,min:base.min,max:base.max,level:lv,
    color:lv==='low'?'#3fb950':lv==='med'?'#f97316':'#f85149',
    label:lv==='low'?'낮음':lv==='med'?'보통':'높음'};
}

// ── 시드/공용 ──
let _simDelayOn=(()=>{try{return localStorage.getItem('nimbi_simdelay')==='1';}catch(e){return false;}})();
function _simDayKey(){ const d=new Date(); if(d.getHours()<4)d.setDate(d.getDate()-1);
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function _seededRand(seed){ const x=Math.sin(seed)*10000; return x-Math.floor(x); }
function _simSeed(no){ const s=String(no)+':'+_simDayKey(); let h=2166136261;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/1000; }
function _simDaySeed(salt){ return _seededRand(_simDayKey()*0.000131+salt); } // 그날 전 열차 공통

// ── 오늘의 운행 컨텍스트(요일·날씨) — 네트워크 전체 상관 ──
let _simCtxCache=null,_simCtxDay=null;
function _simDayContext(){
  const day=_simDayKey();
  if(_simCtxCache&&_simCtxDay===day)return _simCtxCache;
  const d=new Date(); if(d.getHours()<4)d.setDate(d.getDate()-1);
  const dow=d.getDay(), weekend=(dow===0||dow===6);
  const w=_simDaySeed(3.71);
  let weather,probMult,magMult,bigCap;
  if(w<0.70){ weather='맑음'; probMult=1.0; magMult=1.0; bigCap=15; }        // 대부분의 날
  else if(w<0.90){ weather='비'; probMult=1.15; magMult=1.15; bigCap=20; }
  else if(w<0.975){ weather='폭우·폭설'; probMult=1.35; magMult=1.4; bigCap=30; }
  else { weather='태풍·기상특보'; probMult=1.7; magMult=1.9; bigCap=42; }    // 드문 재해일에만 30분+
  const rushMult=weekend?1.12:1.5;
  return (_simCtxDay=day, _simCtxCache={day,dow,weekend,weather,probMult,magMult,bigCap,rushMult});
}
function _isRush(minOfDay){ const h=Math.floor((((minOfDay%1440)+1440)%1440)/60); return (h>=7&&h<9)||(h>=18&&h<20); }

// ── 혼잡/전철 병행 모델 ──
let _simModelCache=null;
function _simModel(){
  if(_simModelCache)return _simModelCache;
  const EXC=new Set(['남안양','수원','오산','평택','천안']); // 경부선 남안양~천안: 별개 선로
  // 전철 노선별 역 집합(같은 노선 판정용) — EXC 제외
  const lineSets=[];
  if(typeof METRO_LINES!=='undefined')METRO_LINES.forEach(l=>{
    const set=new Set();
    (l.routes||[{stations:l.stations}]).forEach(r=>r.stations.forEach(n=>{ if(!EXC.has(n))set.add(n); }));
    if(set.size)lineSets.push(set);
  });
  const load={};
  ALL_TRAINS.forEach(t=>t.stops.forEach(s=>{if(hasTime(s.arr)||hasTime(s.dep))load[s.s]=(load[s.s]||0)+1;}));
  return _simModelCache={lineSets,load};
}
// 전철 병행 구간 판정: 같은 전철 노선과 '3개 이상 연속' 공유되는 구간만 true.
// (경부고속선·호남고속선처럼 드문드문 겹치는 역은 병행으로 보지 않음)
function _metroParSections(timed){
  const {lineSets}=_simModel();
  const secN=timed.length-1;
  const par=new Array(Math.max(0,secN)).fill(false);
  const S=timed.map(s=>s.s);
  for(const set of lineSets){
    let j=0;
    while(j<S.length){
      if(set.has(S[j])){ let k=j; while(k+1<S.length&&set.has(S[k+1]))k++;
        if(k-j+1>=3){ for(let s=j;s<k;s++)par[s]=true; } j=k+1; }
      else j++;
    }
  }
  return par;
}
const _SIM_CONG_REF=280, _SIM_REC_RATE=0.12, _SIM_REC_CAP=1.5;

// ── 편성 회차 선행열차 맵(같은 날 연쇄 지연) ──
let _simRotPredCache=null;
function _simRotPred(){
  if(_simRotPredCache)return _simRotPredCache;
  const pred={};
  if(typeof CONFIRMED_ROTATION!=='undefined')Object.values(CONFIRMED_ROTATION).forEach(r=>{
    const seq=r.seq||[]; for(let i=1;i<seq.length;i++)pred[seq[i]]=seq[i-1]; });
  return _simRotPredCache=pred;
}
// 선행 편성(pt) 종착 → 이 열차(t) 첫 출발 사이 스케줄 여유(분). 회차가 아니면 null.
function _turnaroundBuffer(pt, t){
  const pl=pt.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const tf=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(!pl.length||!tf.length)return null;
  const pLast=pl[pl.length-1], tFirst=tf[0];
  const a=toMin(hasTime(pLast.arr)?pLast.arr:pLast.dep), b=toMin(hasTime(tFirst.dep)?tFirst.dep:tFirst.arr);
  if(a==null||b==null)return null;
  let buf=b-a; if(buf<0)buf+=1440;
  return buf>240?null:buf; // 4시간 초과면 같은 서비스 회차로 보지 않음
}

// ── 단선 구간(인게임 상 유일): 영동선 영주~소천 ──
const _SIM_SINGLE_TRACK=new Set(['영주','봉화','법전','춘양','소천']);
function _isSingleTrack(a,b){ return _SIM_SINGLE_TRACK.has(a)&&_SIM_SINGLE_TRACK.has(b); }
// ── 지연 원인 태그 ──
const _CAUSE_MISC=['신호 대기','선행 열차 간격 조정','운전 정리 지시','승강장 혼선'];
function _sectionCause(rush, metroPar, congHi, weather, r, singleTrack){
  if(singleTrack && r<0.7) return '단선 교행 대기';   // 단선 구간에서만
  if(weather!=='맑음' && r<0.32) return weather==='비'?'우천 서행':'기상 악화 서행';
  if(rush) return '출퇴근 승객 집중';
  if(metroPar) return '전철 병행 구간 혼잡';
  if(congHi) return '승객 집중·정차 지연';
  return _CAUSE_MISC[Math.floor(r*_CAUSE_MISC.length)%_CAUSE_MISC.length];
}

// ── 지연 프로파일(핵심) ── 역별 누적 지연 cd[] + 원인/로그
let _simProfileCache={};
function _simProfile(t){
  const key=t.no+':'+_simDayKey();
  if(_simProfileCache[key])return _simProfileCache[key];
  _simProfileCache[key]={cd:[],m:[],firstM:null,lastM:null,predictedFlag:false,cause:null,events:[]}; // 재귀 가드
  return _simProfileCache[key]=_computeProfile(t);
}
function _computeProfile(t){
  const empty={cd:[],m:[],firstM:null,lastM:null,predictedFlag:false,cause:null,events:[]};
  const f=_delayForecast(t.line,t.grade);
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(timed.length<2||!f.prob)return empty;
  let off=0,prev=-1;const m=[];
  for(const s of timed){ const rm=toMin(hasTime(s.dep)?s.dep:s.arr);
    if(rm==null){m.push(m.length?m[m.length-1]:0);continue;}
    if(prev>=0&&rm<prev-60)off+=1440; m.push(rm+off); prev=rm; }
  const ctx=_simDayContext();
  const {load}=_simModel();
  const secN=timed.length-1;
  const metroParArr=_metroParSections(timed);   // 같은 노선 3연속 공유 구간만 true
  let ms=0,cs=0; for(let i=0;i<timed.length;i++){cs+=load[timed[i].s]||0;if(i<secN&&metroParArr[i])ms++;}
  const metroFrac=ms/Math.max(1,secN), congNorm=Math.min(1,(cs/timed.length)/_SIM_CONG_REF);
  const causeFactor=0.6+0.9*(0.5*metroFrac+0.5*congNorm);
  const runMin=Math.max(1,m[m.length-1]-m[0]);
  const lenFactor=Math.min(1, runMin/180);                 // 단거리↓
  const effProb=Math.min(96, f.prob*causeFactor*(0.4+0.6*lenFactor)*ctx.probMult*(ctx.weekend?0.9:1));
  const seed=_simSeed(t.no);
  const r1=_seededRand(seed+0.137), r4=_seededRand(seed+11.2), rSev=_seededRand(seed+2.23);
  const flagged=r1*100<effProb, surprise=!flagged&&r4<0.07*lenFactor*ctx.probMult;
  // 심각도: 지연 열차 대부분은 소폭, 일부만 인게임 범위까지. 악천후일수록 심각 쪽으로.
  const sevRoll=Math.min(1, rSev*(ctx.probMult>1.2?1.35:1));
  const severity=surprise?0.3:(sevRoll<0.55?0.35:sevRoll<0.85?0.7:1.0);

  // 회차 연쇄: 선행 편성 지연 상속(회차 여유로 일부 흡수)
  let inherited=0;
  const predNo=_simRotPred()[t.no];
  if(predNo){ const pt=(typeof ALL_TRAINS!=='undefined')&&ALL_TRAINS.find(x=>x.no===predNo);
    if(pt){ const pp=_simProfile(pt); const pf=(pp.cd&&pp.cd.length)?pp.cd[pp.cd.length-1]:0;
      if(pf>0){ const buf=_turnaroundBuffer(pt,t); if(buf!=null) inherited=Math.max(0, pf-Math.max(3,buf)); } } }

  const events=[];
  const cd=[Math.round(inherited)];
  let dominant=null;
  if(inherited>0){ events.push({idx:0,delta:Math.round(inherited),cause:'전 편성 회차 지연'}); dominant='회차 지연'; }

  if(flagged||surprise||inherited>0){
    const incUnit=(flagged?Math.max(0.6,(f.max||6)/11):0.6)*(0.6+0.4*lenFactor)*severity*ctx.magMult;
    const evBase=(flagged?Math.min(0.34,effProb/100*0.45+0.06):0.05)*(0.6+0.5*severity);
    let cur=inherited;
    for(let i=0;i<secN;i++){
      const dt=Math.max(1,m[i+1]-m[i]);
      const metroPar=metroParArr[i];   // 같은 전철 노선 3연속 공유 구간만
      const singleTrack=_isSingleTrack(timed[i].s, timed[i+1].s);   // 단선 교행 대기 구간
      const cong=Math.min(1,(((load[timed[i].s]||0)+(load[timed[i+1].s]||0))/2)/_SIM_CONG_REF);
      const rush=ctx.weekend?false:_isRush(m[i]);
      const exposure=Math.min(1, 0.45*(metroPar?1:0)+0.45*cong+(rush?0.25:0)+(singleTrack?0.25:0));
      const ra=_seededRand(seed+i*2.7+0.5), rb=_seededRand(seed+i*2.7+1.9), rc=_seededRand(seed+i*2.7+3.3), rd=_seededRand(seed+i*2.7+5.1);
      const pInc=evBase*(0.35+exposure*1.3);
      let inc=0, cause=null;
      if(ra<pInc){ inc=incUnit*(0.6+rb)*(rush?1.25:1);
        cause=_sectionCause(rush, metroPar, cong>0.55, ctx.weather, rd, singleTrack); }
      // 회복: 지연이 있고 여유 구간일 때만, 구간 소요·상한으로 조금씩만
      let rec=0;
      if(cur>0 && inc===0 && rc<0.35+0.4*(1-exposure)) rec=Math.min(cur,_SIM_REC_RATE*dt,_SIM_REC_CAP)*(0.5+0.5*rc);
      cur=Math.max(0, Math.min(ctx.bigCap, cur+inc-rec));
      cd.push(cur);
      if(inc>=0.5&&cause){ events.push({idx:i+1,delta:+inc.toFixed(1),cause}); if(!dominant||inc>2)dominant=dominant&&inc<=2?dominant:cause; }
      else if(rec>=0.5) events.push({idx:i+1,delta:-+rec.toFixed(1),cause:'운전 정리 회복'});
    }
    if(!dominant){ const anyInc=events.find(e=>e.delta>0); dominant=anyInc?anyInc.cause:null; }
  } else { for(let i=0;i<secN;i++)cd.push(0); }

  return {cd:cd.map(v=>Math.round(v)), m, firstM:m[0], lastM:m[m.length-1],
    predictedFlag:flagged, cause:dominant, events, weather:ctx.weather};
}

// ── 조회 API ──
function _simDelayAtStop(t, idx){ if(!_simDelayOn)return 0; const cd=_simProfile(t).cd; return (idx>=0&&idx<cd.length)?cd[idx]:0; }
function _simDelay(t, clock){
  if(!_simDelayOn) return 0;
  const pr=_simProfile(t); const {cd,m,firstM,lastM}=pr;
  if(!cd.length||firstM==null) return 0;
  let nowM=clock;
  if(lastM>=1440&&clock<firstM){ const sh=clock+1440; if(clock<240||sh<=lastM)nowM=sh; }
  if(nowM<=firstM) return 0;
  if(nowM>=lastM) return cd[cd.length-1];
  for(let i=0;i<m.length-1;i++){
    if(nowM>=m[i]&&nowM<=m[i+1]){ const fr=(nowM-m[i])/Math.max(1,m[i+1]-m[i]); return Math.round(cd[i]+(cd[i+1]-cd[i])*fr); }
  }
  return cd[cd.length-1];
}
// '지연 예상' 라벨용(예측된 열차만). 회차/서프라이즈만인 열차는 라벨 없이 실시간 지연으로만 노출.
function _simFinalDelay(t){ if(!_simDelayOn)return 0; const pr=_simProfile(t);
  return (pr.predictedFlag&&pr.cd.length)?(pr.cd[pr.cd.length-1]||0):0; }
function _liveDelayOf(t){
  if(!_simDelayOn)return 0;
  const n=new Date(); const nm=n.getHours()*60+n.getMinutes();
  const d=_simDelay(t, nm);
  if(d<=0)return 0;
  const st=getCurrentStatus(t, nm-d);
  return (st&&st.status==='running')?d:0;
}
// 지연 원인 요약(대표 + 부가) · 최대 2개
function _simCauseSummary(t){
  if(!_simDelayOn)return '';
  const pr=_simProfile(t); if(!pr.events||!pr.events.length)return '';
  const seen=[]; pr.events.filter(e=>e.delta>0).forEach(e=>{ if(!seen.includes(e.cause))seen.push(e.cause); });
  return seen.slice(0,2).join(' · ');
}
// 관제 로그(코레일톡식) — 시각·역·원인
function _simEventLog(t){
  if(!_simDelayOn)return [];
  const pr=_simProfile(t); if(!pr.events||!pr.events.length)return [];
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const fmt=mm=>{const v=(((mm%1440)+1440)%1440);return String(Math.floor(v/60)).padStart(2,'0')+':'+String(Math.round(v%60)).padStart(2,'0');};
  return pr.events.map(e=>{
    const st=timed[e.idx]?timed[e.idx].s:'';
    const clk=pr.m[e.idx]!=null?fmt(pr.m[e.idx]+(e.delta>0?e.delta:0)):'';
    if(e.delta>0)return `[${clk}] ${st} · ${e.cause} +${Math.round(e.delta)}분`;
    return `[${clk}] ${st} · ${e.cause||'운전 정리'} −${Math.abs(Math.round(e.delta))}분`;
  });
}
// 지연 보상: 30분 이상 지연 = 전액 환불 원칙.
//  단, 예매 시 (①장시간 지연 예보가 있던 열차 / ②이미 10분 이상 지연 중이던 열차)는 제외.
//  반환: null(해당 없음) | {eligible:true, delay} | {eligible:false, reason}
function _simRefundInfo(tk){
  if(!_simDelayOn||!tk)return null;
  const t=(typeof ALL_TRAINS!=='undefined')&&ALL_TRAINS.find(x=>x.no===tk.trainNo); if(!t)return null;
  const pr=_simProfile(t); const fin=pr.cd.length?pr.cd[pr.cd.length-1]:0;
  if(fin<30)return null;                                  // 30분 미만: 보상 대상 아님
  // 예외1: 예매 시점에 이미 장시간 지연 예보(상시 지연 '높음')가 뜨던 노선·등급
  const f=_delayForecast(t.line,t.grade);
  if(f.level==='high'&&f.max>=15)return {eligible:false,reason:'예매 시 장시간 지연 예보 열차'};
  // 예외2: 예매 시점에 이미 10분 이상 지연 중이던 열차
  if(tk.bookedAt){ const d=new Date(tk.bookedAt); const pm=d.getHours()*60+d.getMinutes();
    if(_simDelay(t,pm)>=10)return {eligible:false,reason:'예매 시 이미 10분 이상 지연'}; }
  return {eligible:true, delay:fin};
}
