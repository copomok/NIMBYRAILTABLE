// ═══════════════════════════════════════════════════════════════
// 🚦 님비레일 지연 예보·시뮬레이션 엔진 (nimbi_rail.js에서 분리)
//  기반  : 인게임 발췌 지연 예측(DELAY_MODEL) — 노선·등급별 확률/범위(주기반)
//  보정  : 구간 특성(전철 병행·혼잡) · 거리(소요) · 시간대(러시) · 요일/날씨(일 단위)
//  전파  : 편성 회차 연쇄(선행 편성 지연 상속) · 원인 추적/로그(발생→전파→회복→종착→회차)
//  성질  : 결정적(열차+운행일 시드) · 하루 단위 캐시 · 등급별 회복 운전(KTX>ITX>새마을>무궁화)
//  기상  : 맑음·안개·강풍·폭염·비·폭설·태풍 — 일 단위 결정, 서행·회복 저해 반영
//  분포  : 대부분 정시~2분, 3~10분 비교적 흔함, 10~20분 가끔, 30분+ 는 태풍·차량 고장 등 특수 상황만
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
  'ITX-마음':{prob:30,min:4,max:12},'남도해양':{prob:34,min:4,max:13},'국악와인':{prob:34,min:4,max:13},'무궁화호':{prob:38,min:5,max:15}};
function _delayGradeFamily(g){ if(/KTX/.test(g))return 'KTX'; if(g==='SRT')return 'SRT';
  if(g==='ITX-새마을')return 'ITX-새마을'; if(g==='ITX-청춘')return 'ITX-청춘';
  if(g==='ITX-마음')return 'ITX-마음'; if(g==='남도해양')return '남도해양'; if(g==='국악와인')return '국악와인'; return '무궁화호'; }
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
  // 기상 유형별 특성: probMult(발생확률) · magMult(지연크기) · bigCap(상한) · recW(회복 저해)
  //   sagGate(서행 발생 게이트) · sagLabel(원인명) · wxBig(대형 지연 유발 여부)
  let wx;
  if(w<0.60)       wx={weather:'맑음', probMult:1.0, magMult:1.0, bigCap:15, recW:1.0, sagGate:0,    sagLabel:null,               wxBig:false};
  else if(w<0.70)  wx={weather:'안개', probMult:1.1, magMult:1.05,bigCap:13, recW:0.9, sagGate:0.26, sagLabel:'안개 서행',        wxBig:false};
  else if(w<0.78)  wx={weather:'강풍', probMult:1.18,magMult:1.2, bigCap:20, recW:0.8, sagGate:0.34, sagLabel:'강풍 서행',        wxBig:true};
  else if(w<0.85)  wx={weather:'폭염', probMult:1.1, magMult:1.1, bigCap:15, recW:0.88,sagGate:0.24, sagLabel:'폭염 레일온도 서행', wxBig:false};
  else if(w<0.93)  wx={weather:'비',   probMult:1.15,magMult:1.15,bigCap:20, recW:0.8, sagGate:0.32, sagLabel:'우천 서행',        wxBig:true};
  else if(w<0.975) wx={weather:'폭설', probMult:1.35,magMult:1.4, bigCap:30, recW:0.55,sagGate:0.55, sagLabel:'폭설 제설 지연',    wxBig:true};
  else             wx={weather:'태풍', probMult:1.7, magMult:1.9, bigCap:42, recW:0.4, sagGate:0.78, sagLabel:'태풍 서행',        wxBig:true};
  const rushMult=weekend?1.12:1.5;
  return (_simCtxDay=day, _simCtxCache=Object.assign({day,dow,weekend,rushMult},wx));
}
function _isRush(minOfDay){ const h=Math.floor((((minOfDay%1440)+1440)%1440)/60); return (h>=7&&h<9)||(h>=18&&h<20); }

// ── 등급별 운행 특성: 회복률(역간 여유 시분 활용률)·선로 우선권 ──
//  KTX/SRT 50~70% · ITX 30~50% · 새마을 20~40% · 무궁화(관광 포함) 10~30%
function _gradeOps(grade){
  if(/KTX|SRT/.test(grade))   return {rec:[0.50,0.70], prio:3};  // 고속: 높은 회복·선로 우선권
  if(/^ITX/.test(grade))      return {rec:[0.30,0.50], prio:2};  // ITX: 중간 (일부 구간 KTX 양보)
  if(/새마을/.test(grade))     return {rec:[0.20,0.40], prio:1};
  return {rec:[0.10,0.30], prio:0};                              // 무궁화·관광열차: 낮은 우선순위
}

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
  return _simModelCache={lineSets};
}
// 역별 승차 혼잡 점수 0~1 (인게임 승객 통계 기반, nimbi_pax.js). 승객 적은 역·시골역=0.
function _paxScore(name){ return (typeof STATION_PAX!=='undefined'&&STATION_PAX[name])?STATION_PAX[name]/100:0; }
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
const _SIM_CONG_REF=280, _SIM_REC_RATE=0.12, _SIM_REC_CAP=1.5, _SIM_REC_HARD=1.2; // 역당 회복 상한(≈1분)

// ── 편성 회차 선행열차 맵(같은 날 연쇄 지연) ──
let _simRotPredCache=null,_simRotSuccCache=null;
function _simRotPred(){
  if(_simRotPredCache)return _simRotPredCache;
  const pred={};
  if(typeof CONFIRMED_ROTATION!=='undefined')Object.values(CONFIRMED_ROTATION).forEach(r=>{
    const seq=r.seq||[]; for(let i=1;i<seq.length;i++)pred[seq[i]]=seq[i-1]; });
  return _simRotPredCache=pred;
}
function _simRotSucc(){
  if(_simRotSuccCache)return _simRotSuccCache;
  const succ={};
  if(typeof CONFIRMED_ROTATION!=='undefined')Object.values(CONFIRMED_ROTATION).forEach(r=>{
    const seq=r.seq||[]; for(let i=0;i<seq.length-1;i++)succ[seq[i]]=seq[i+1]; });
  return _simRotSuccCache=succ;
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
//  운행(신호·점유·대피·추월·교행) / 차량 / 역(승객) / 기상 — 우선순위 낮은 등급일수록 운행 원인↑
const _CAUSE_MISC=['신호 대기','선행 열차 간격 조정','운전 정리 지시','승강장 혼선'];
const _CAUSE_LOWPRIO=['대피선 대기','추월 대기','선행 열차 지연','KTX 통과 대기'];
function _sectionCause(rush, metroPar, congHi, ctx, r, singleTrack, prio){
  if(singleTrack && r<0.7) return '단선 교행 대기';       // 단선 구간(영동선 영주~소천)에서만
  if(ctx.sagGate && r<ctx.sagGate) return ctx.sagLabel;   // 기상 서행(악천후일수록 잦음)
  if(rush) return '출퇴근 승객 집중';
  if(metroPar) return '전철 병행 구간 혼잡';
  if(congHi) return '승차 혼잡';
  // 새마을·무궁화 등 낮은 우선순위: 대피·추월·선행 열차 영향이 잦음
  if(prio<=1 && r<0.45) return _CAUSE_LOWPRIO[Math.floor(r*47)%_CAUSE_LOWPRIO.length];
  return _CAUSE_MISC[Math.floor(r*_CAUSE_MISC.length)%_CAUSE_MISC.length];
}
// 크게 누적될 수 있는 원인(그 외는 소폭에 그침)
function _isBigCause(cause, ctx){
  if(cause==='단선 교행 대기')return true;
  if(cause===ctx.sagLabel)return !!ctx.wxBig;             // 강풍·비·폭설·태풍 서행만 대형
  return false;
}
// 중간 크기 원인(운행 계열: 대피·추월·선행 지연)
function _isMidCause(cause){ return _CAUSE_LOWPRIO.includes(cause); }

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
  _simModel();
  const secN=timed.length-1;
  const metroParArr=_metroParSections(timed);   // 같은 노선 3연속 공유 구간만 true
  // 승차 혼잡: 승객 수 많은 역에서만. _paxScore(역)=0~1(고승객역=1, 시골역/종착역=0)
  let ms=0,cs=0; for(let i=0;i<timed.length;i++){cs+=_paxScore(timed[i].s);if(i<secN&&metroParArr[i])ms++;}
  const metroFrac=ms/Math.max(1,secN), congNorm=Math.min(1,cs/Math.max(1,timed.length));
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

  // 드문 차량 이벤트(경미한 고장·응급조치): 날씨 무관 특수 상황 — 30분+ 가능 경로
  const rVeh=_seededRand(seed+7.77);
  const vehSec=rVeh<0.008?Math.floor(_seededRand(seed+8.31)*secN):-1;

  // 등급별 회복 특성: 역간 여유 시분 활용률(KTX 50~70% … 무궁화 10~30%) + 선로 우선권
  const go=_gradeOps(t.grade);
  const recFrac=go.rec[0]+(go.rec[1]-go.rec[0])*_seededRand(seed+4.44);
  const prioMult=[1.25,1.1,1.0,0.85][go.prio];            // 낮은 우선순위=지연 사건 잦음
  // 역별 계획 정차 시분(분) — 지연 시 2분+ 정차역에서 1분 정차로 단축해 회복
  const dwell=timed.map(s=>{const a=toMin(s.arr),d=toMin(s.dep);
    return (a!=null&&d!=null)?((d-a+1440)%1440):0;});

  if(flagged||surprise||inherited>0||vehSec>=0){
    // 대형 원인(기상 서행·단선 교행)은 인게임 범위까지 커질 수 있음
    const bigUnit=(flagged?Math.max(0.6,(f.max||6)/11):0.6)*(0.6+0.4*lenFactor)*severity*ctx.magMult;
    // 소형 원인(전철 병행·승차 혼잡·출퇴근 집중 등)은 소폭 → 회복으로 웬만해선 2분 이하로 끝남
    const smallUnit=0.45+0.5*severity;
    const evBase=(flagged?Math.min(0.34,effProb/100*0.45+0.06):0.05)*(0.6+0.5*severity)*prioMult;
    let cur=inherited, recTotal=0;
    for(let i=0;i<secN;i++){
      const dt=Math.max(1,m[i+1]-m[i]);
      const metroPar=metroParArr[i];   // 같은 전철 노선 3연속 공유 구간만
      const singleTrack=_isSingleTrack(timed[i].s, timed[i+1].s);   // 단선 교행 대기 구간
      const cong=_paxScore(timed[i].s);       // 출발역 승차 혼잡도(0~1) — 고승객역만 높음
      const congHi=cong>0.6;                   // 승객 많은 역에서만 승차 혼잡
      const rush=ctx.weekend?false:_isRush(m[i]);
      const exposure=Math.min(1, 0.4*(metroPar?1:0)+0.5*cong+(rush?0.2:0)+(singleTrack?0.3:0));
      const ra=_seededRand(seed+i*2.7+0.5), rb=_seededRand(seed+i*2.7+1.9), rc=_seededRand(seed+i*2.7+3.3), rd=_seededRand(seed+i*2.7+5.1);
      const pInc=evBase*(0.35+exposure*1.3);
      let inc=0, cause=null;
      if(i===vehSec){                          // 차량 고장: 크게, 이후 서서히 회복
        inc=Math.min(ctx.bigCap, (8+_seededRand(seed+9.9)*14)*(0.7+0.3*ctx.magMult));
        cause='차량 고장 응급조치';
      } else if(ra<pInc){
        cause=_sectionCause(rush, metroPar, congHi, ctx, rd, singleTrack, go.prio);
        inc=_isBigCause(cause,ctx) ? bigUnit*(0.6+rb)
          : _isMidCause(cause)     ? Math.min(5, bigUnit*0.55*(0.6+rb)+smallUnit*0.5)
          :                          smallUnit*(0.5+0.6*rb); }
      // 회복 운전: 지연이 클수록 적극적으로.
      //  ① 역간 여유 시분(≈소요의 16%)을 등급별 회복률만큼 사용
      //  ② 2분 이상 정차역에서는 1분 정차로 단축(정차 단축 회복)
      //  단, 한 역당 회복은 1분 안팎(_SIM_REC_HARD)까지만 — 비현실적 회복 방지.
      //  악천후 중에는 회복이 더뎌 지연이 누적(재해일에 30분+ 발생 여지).
      let rec=0, dcut=0;
      if(cur>0 && inc===0){
        const urg=Math.min(1, cur/8);                            // 지연 클수록 적극적(8분+ 최대)
        const gate=(0.25+0.55*urg)*ctx.recW*(0.9+0.05*go.prio);  // 시도 확률도 지연에 비례
        if(rc<gate){
          const runRec=Math.min(0.16*dt*recFrac, 0.8)*(0.5+0.5*rc);            // 주행 여유 사용
          dcut=(cur>=2&&dwell[i+1]>=2)?Math.min(dwell[i+1]-1,1)*(0.4+0.6*urg):0; // 정차 단축(최대 1분)
          rec=Math.min(cur, (runRec+dcut)*ctx.recW, _SIM_REC_HARD);            // 역당 상한 ≈1분
        }
      }
      cur=Math.max(0, Math.min(ctx.bigCap, cur+inc-rec));
      cd.push(cur); recTotal+=rec;
      if(inc>=0.5&&cause){ events.push({idx:i+1,delta:+inc.toFixed(1),cause}); if(!dominant||inc>2)dominant=dominant&&inc<=2?dominant:cause; }
      else if(rec>=0.5) events.push({idx:i+1,delta:-+rec.toFixed(1),cause:dcut>=0.3?'정차 단축·회복 운전':'회복 운전'});
    }
    if(!dominant){ const anyInc=events.find(e=>e.delta>0); dominant=anyInc?anyInc.cause:null; }
    var _recTotal=recTotal;
  } else { for(let i=0;i<secN;i++)cd.push(0); var _recTotal=0; }

  return {cd:cd.map(v=>Math.round(v)), m, firstM:m[0], lastM:m[m.length-1],
    predictedFlag:flagged, cause:dominant, events, weather:ctx.weather,
    inheritedFrom:(inherited>0&&predNo)?predNo:null, recovered:Math.round(_recTotal)};
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
// 지연 라이프사이클 요약 — 최초 원인·전파 원인·회복 여부·최종 지연·영향 열차
function _simDelayReport(t){
  if(!_simDelayOn)return null;
  const pr=_simProfile(t); if(!pr.cd||!pr.cd.length)return null;
  const fin=pr.cd[pr.cd.length-1]||0;
  const incs=(pr.events||[]).filter(e=>e.delta>0);
  if(!incs.length&&fin<=0&&!(pr.recovered>0))return null;
  const first=pr.inheritedFrom?`전 편성 회차 지연 (${pr.inheritedFrom} 열차)`:(incs[0]?incs[0].cause:null);
  const spread=[]; incs.forEach(e=>{ if(e.cause!==((incs[0]||{}).cause)&&e.cause!=='전 편성 회차 지연'&&!spread.includes(e.cause))spread.push(e.cause); });
  // 영향을 받은 열차: 다음 회차 편성이 회차 여유보다 큰 지연을 이어받는 경우
  let affects=null;
  const succNo=_simRotSucc()[t.no];
  if(succNo&&fin>0&&typeof ALL_TRAINS!=='undefined'){
    const nt=ALL_TRAINS.find(x=>x.no===succNo);
    if(nt){ const buf=_turnaroundBuffer(t,nt); if(buf!=null&&fin>Math.max(3,buf))affects=succNo; }
  }
  return {first, spread:spread.slice(0,3), recovered:pr.recovered||0, final:fin, affects};
}
// 오늘의 사전 예측(영업일 전망) — 기상·예보 기반으로 지연 예상 열차 목록 생성
function _simOutlook(limit){
  if(!_simDelayOn)return null;
  const ctx=_simDayContext();
  const rows=[];
  if(typeof ALL_TRAINS!=='undefined')ALL_TRAINS.forEach(t=>{
    const pr=_simProfile(t); if(!pr.predictedFlag)return;
    const fin=pr.cd.length?pr.cd[pr.cd.length-1]:0;
    const peak=pr.cd.length?Math.max.apply(null,pr.cd):0;
    const est=Math.max(fin,peak); if(est<3)return;
    rows.push({t,est});
  });
  rows.sort((a,b)=>b.est-a.est);
  return {ctx, rows:rows.slice(0,limit||8), total:rows.length};
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
