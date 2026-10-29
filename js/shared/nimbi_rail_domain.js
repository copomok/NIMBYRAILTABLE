// Shared by NIMBY Rail and RailLink. No UI bootstrap or booking persistence.
const GC={'KTX':'KTX','KTX-산천':'KTX','KTX-이음':'KTX','SRT':'SRT','ITX-새마을':'ITX','ITX-마음':'ITX','ITX-청춘':'ITXCC','무궁화호':'MGH','남도해양':'NDH','국악와인':'GAW'};
const GL={'KTX':'KTX','KTX-산천':'KTX-산천','KTX-이음':'KTX-이음','SRT':'SRT','ITX-새마을':'ITX-새마을','ITX-마음':'ITX-마음','ITX-청춘':'ITX-청춘','무궁화호':'무궁화','남도해양':'남도해양','국악와인':'국악와인'};
function gc(g){return GC[g]||'MGH';}
// 등급 필터 매칭: select 값(전체/KTX/SRT/ITX-새마을/ITX-청춘/무궁화호)과 열차 등급 비교
// KTX는 산천·이음 포함, ITX-새마을은 ITX-마음 포함(동일 등급군)
function gradeMatch(trainGrade, filterVal){
  if(!filterVal||filterVal==='all')return true;
  if(filterVal==='KTX')return gc(trainGrade)==='KTX';
  if(filterVal==='SRT')return gc(trainGrade)==='SRT';
  if(filterVal==='ITX-새마을')return gc(trainGrade)==='ITX';
  if(filterVal==='ITX-청춘')return trainGrade==='ITX-청춘';
  if(filterVal==='무궁화호')return trainGrade==='무궁화호';
  return trainGrade===filterVal;
}
// gc() → CSS 변수명 (KTX-산천/이음 모두 파란색)
const GC_CSS_VAR={'KTX':'ktx','SRT':'srt','ITX':'itxsm','ITXCC':'itxcc','MGH':'mgh','NDH':'ndh','GAW':'gaw'};
function gcCssVar(g){return GC_CSS_VAR[gc(g)]||'mgh';}

function todayLocalStr(d){
  d=d||new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function toMin(v){if(!v)return null;const m=v.match(/(\d+):(\d+)/);return m?+m[1]*60+ +m[2]:null;}
// 자정 넘김: 도착 시각이 출발보다 작으면 다음날로 간주(+1440)
function durMin(depT,arrT){
  if(depT==null||arrT==null)return null;
  let d=toMin(arrT)-toMin(depT);
  if(d<0)d+=1440;
  return d;
}
// 정렬용 도착 절대분: 출발 이후 시각이 더 작으면 +1440
function arrKey(depT,arrT){
  const a=toMin(arrT); if(a==null)return 9999;
  return (toMin(depT)!=null&&a<toMin(depT))?a+1440:a;
}
function durStr(depT,arrT){
  if(!depT||!arrT)return '-';
  const d=durMin(depT,arrT);
  if(d==null||d<=0)return '-';
  return d<60?`${d}m`:`${Math.floor(d/60)}h ${d%60}m`;
}
function hasTime(v){return v&&/\d+:\d+/.test(v);}

// ══════════════════════════════════════════
// 📏 표기 포맷 헬퍼 (앱 전반 통일)
// ══════════════════════════════════════════
function fmtWon(n){ return (Math.round(n||0)).toLocaleString()+'원'; }
function fmtKm(km){ if(km==null||!isFinite(km))return '-'; return km>=100?`${Math.round(km)} km`:`${(Math.round(km*10)/10).toFixed(1)} km`; }
function fmtDurKor(min){ if(min==null||min<0)return '-'; const h=Math.floor(min/60),m=min%60; return h>0?(m>0?`${h}시간 ${m}분`:`${h}시간`):`${m}분`; }
function fmtSpeed(kmh){ if(kmh==null||!isFinite(kmh)||kmh<=0)return '-'; return `${Math.round(kmh)} km/h`; }
// 남은시간 + 도착시각: "12분 후 (14:30)"
function fmtEta(mins, clockStr){ if(mins==null)return '-'; const t=mins<=0?'곧':(mins===1?'1분 후':`${mins}분 후`); return clockStr?`${t} (${clockStr})`:t; }
function addMinToClock(clockStr, add){ const m=toMin(clockStr); if(m==null)return ''; let x=(m+add)%1440; if(x<0)x+=1440; return `${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`; }

// ══════════════════════════════════════════
// 📐 실좌표 기반 거리·운임
// ══════════════════════════════════════════
let _stnAliasMap=null;
function _stnCoord(name){
  if(typeof STATION_DB==='undefined'||!name) return null;
  let d=STATION_DB[name]||STATION_DB[name+'역']||(name.endsWith('역')?STATION_DB[name.slice(0,-1)]:null);
  if(!d){
    // 별칭 폴백: 역명 뒤에 부가 표기가 붙은 데이터 키도 기본 역명으로 매칭
    if(!_stnAliasMap){
      _stnAliasMap={};
      for(const k of Object.keys(STATION_DB)){
        const stripped=k.replace(/\s*\/.*$/,'').trim();          // "회덕역"
        if(stripped!==k){ _stnAliasMap[stripped]=k; _stnAliasMap[stripped.replace(/역$/,'')]=k; }
      }
    }
    const ak=_stnAliasMap[name]||_stnAliasMap[name+'역'];
    if(ak)d=STATION_DB[ak];
  }
  return (d&&d.lat!=null&&d.lon!=null)?{lat:+d.lat,lon:+d.lon}:null;
}
// 좌표 객체 2개 간 거리 (data/nimbi_station_data.js의 haversineKm(4인자)와 이름 충돌 방지 위해 별도 명명)
function havPt(a,b){
  if(!a||!b)return 0;
  const R=6371,r=Math.PI/180;
  const dLat=(b.lat-a.lat)*r, dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
// 좌표가 신뢰 불가한 역(동명이역 충돌 등): DB 좌표를 무시하고 소요시간으로 거리 추정
// - 장성/장흥/춘양: 남부(경전·호남) 노선과 북부(교외·영동) 노선에 같은 이름이 존재해
//   STATION_DB의 단일 좌표가 한쪽만 가리킴 → 노선별 소요시간 기반으로 위치/거리 추정
const UNTRUSTED_COORDS=new Set();
// 등급별 대표 표정속도(km/h) — 좌표 없는 구간을 시간으로 환산할 때 사용
const GRADE_KMH={'KTX':190,'KTX-산천':190,'KTX-이음':150,'SRT':190,'ITX-새마을':100,'ITX-마음':100,'ITX-청춘':100,'무궁화호':75,'남도해양':75,'국악와인':75};

// 같은 역이 두 번 등장하는 순환열차도 출발 occurrence와 이후 도착
// occurrence를 정확히 짝짓는다(예: 서울 출발 → 서울 종착).
function travelStopIndexes(t,fromStn,toStn){
  if(!t||!Array.isArray(t.stops))return null;
  for(let fi=0;fi<t.stops.length;fi++){
    const from=t.stops[fi];
    if(from.s!==fromStn||!hasTime(from.dep))continue;
    for(let ti=fi+1;ti<t.stops.length;ti++){
      const to=t.stops[ti];
      if(to.s===toStn&&hasTime(to.arr))return {fi,ti};
    }
  }
  return null;
}

// 열차 경로(fromStn~toStn) 실제 거리(km).
// 좌표 이상치/미확보 구간은 "해당 열차의 소요시간 × 구간 평균속도"로 추정.
function routeDistanceKm(t, fromStn, toStn){
  if(!t||!t.stops)return 0;
  const S=t.stops;
  const pair=travelStopIndexes(t,fromStn,toStn);
  if(!pair)return 0;
  const {fi,ti}=pair;
  const kmh=GRADE_KMH[t.grade]||90, vpm=kmh/60; // km/분 폴백
  // 구간 내 정거장: 좌표(신뢰 불가/미확보 시 null)와 시각(분)
  const E=[];
  for(let i=fi;i<=ti;i++){
    let c=_stnCoord(S[i].geoKey||S[i].s);
    if(UNTRUSTED_COORDS.has(S[i].s)) c=null; // 신뢰 불가 좌표 무시 → 시간으로 추정
    const m=toMin(hasTime(S[i].dep)?S[i].dep:(hasTime(S[i].arr)?S[i].arr:null));
    E.push({c, m});
  }
  const SPIKE=150; // 정상 최장 구간 ~93km, 좌표 오류는 240km+
  let vi=E.map((e,i)=>e.c?i:-1).filter(i=>i>=0);
  // 남은 좌표 중 내부 스파이크(앞뒤로 튀었다 되돌아옴) → 무시(이웃 직선으로 흡수)
  for(let k=1;k+1<vi.length;k++){
    const Lc=E[vi[k-1]].c, Mc=E[vi[k]].c, Rc=E[vi[k+1]].c;
    if(havPt(Lc,Mc)>SPIKE && havPt(Mc,Rc)>SPIKE && havPt(Lc,Rc)<Math.min(havPt(Lc,Mc),havPt(Mc,Rc))) E[vi[k]].c=null;
  }
  vi=E.map((e,i)=>e.c?i:-1).filter(i=>i>=0);
  // 좌표가 1개 이하 → 전체를 소요시간으로 환산
  if(vi.length<2){
    const span=(E[E.length-1].m!=null&&E[0].m!=null)?((E[E.length-1].m-E[0].m+1440)%1440):0;
    return span>0 ? span*vpm : 0;
  }
  // 유효 좌표 폴리라인
  let total=0;
  for(let k=1;k<vi.length;k++) total+=havPt(E[vi[k-1]].c, E[vi[k]].c);
  // 폴리라인 구간의 평균속도(km/분)
  const fM=E[vi[0]].m, lM=E[vi[vi.length-1]].m;
  const cMin=(fM!=null&&lM!=null)?((lM-fM+1440)%1440):0;
  const avg=cMin>0 ? total/cMin : vpm;
  // 앞/뒤 좌표 없는 구간(시종착이 이상치/미확보) → 시간 × 평균속도로 보충
  let add=0;
  const fromM=E[0].m, toM=E[E.length-1].m;
  if(vi[0]>0 && fM!=null && fromM!=null){ const g=(fM-fromM+1440)%1440; if(g>=0&&g<600) add+=g*avg; }
  if(vi[vi.length-1]<E.length-1 && toM!=null && lM!=null){ const g=(toM-lM+1440)%1440; if(g>=0&&g<600) add+=g*avg; }
  return total+add;
}
// 열차 전체(시종착) 거리·표정속도
function trainStats(t){
  const valid=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(valid.length<2)return {km:0,min:0,speed:0};
  const f=valid[0], l=valid[valid.length-1];
  const dep=hasTime(f.dep)?f.dep:f.arr, arr=hasTime(l.arr)?l.arr:l.dep;
  const km=routeDistanceKm(t, f.s, l.s);
  const min=durMin(dep,arr)||0;
  return {km, min, speed: min>0?km/(min/60):0};
}


const GRADE_COLORS = {
  'KTX':'#3b82f6','KTX-산천':'#3b82f6','KTX-이음':'#3b82f6',
  'SRT':'#a855f7',
  'ITX-새마을':'#ef4444','ITX-마음':'#ef4444',
  'ITX-청춘':'#22c55e',
  '무궁화호':'#f97316',
  '남도해양':'#38bdf8',
  '국악와인':'#343d68'
};


const SEAT_CLASSES={
  general:{label:'일반실',mult:1.0},
  special:{label:'특실',mult:1.4},
  premium:{label:'우등실',mult:1.3},
  standing:{label:'입석/자유석',mult:0.85},
};
// 운임 할인 (여객 유형별)
const DISCOUNTS={
  none:{label:'일반',rate:0},
  child:{label:'어린이',rate:0.5,note:'만 6~12세'},
  infant:{label:'유아',rate:0.75,note:'만 6세 미만'},
  senior:{label:'경로우대',rate:0.3,note:'만 65세 이상'},
  disabled:{label:'장애인',rate:0.5,note:'복지'},
  veteran:{label:'국가유공',rate:0.5,note:'유공자'},
};
function applyDiscount(fare,key){const d=DISCOUNTS[key]||DISCOUNTS.none;return Math.round(fare*(1-d.rate)/100)*100;}
function availableSeatClasses(grade){
  if(grade==='KTX'||grade==='KTX-산천'||grade==='SRT') return ['special','general','standing'];
  if(grade==='KTX-이음') return ['premium','general','standing'];
  if(grade==='무궁화호') return ['general','standing'];
  if(grade==='남도해양'||grade==='국악와인') return ['general','standing'];
  return ['general','standing']; // ITX-새마을, ITX-마음, ITX-청춘
}
function seatClassDisplayLabel(train,seatClass){
  if(seatClass!=='standing')return SEAT_CLASSES[seatClass]?.label||seatClass;
  try{return getTrainCapacity(train)?.standingMode==='free'?'입석 / 자유석':'입석';}catch(e){return'입석';}
}
function seatClassSaleMeta(train,from,to,date,seatClass){
  try{
    const state=getSeatInventoryState(train,from,to,date,seatClass);
    if(seatClass==='standing'){
      const threshold=Math.round((state.threshold||.76)*100);
      return{...state,label:state.label||seatClassDisplayLabel(train,seatClass),
        reason:!state.eligible?`좌석 혼잡도 ${threshold}%부터 판매`:state.available<=0?'판매 종료':`(${state.available}석)`};
    }
    return{...state,label:seatClassDisplayLabel(train,seatClass),reason:state.available<=0?'매진':`${state.available}석`};
  }catch(e){return{available:1,eligible:true,label:seatClassDisplayLabel(train,seatClass),reason:''};}
}

const FARE_TABLE={
  'KTX':      {base:3800, rate:148, min:8400},
  'KTX-산천': {base:3800, rate:148, min:8400},
  'KTX-이음': {base:3200, rate:120, min:8400},
  'SRT':      {base:3600, rate:140, min:8000},
  'ITX-새마을':{base:2800, rate:96,  min:4800},
  'ITX-마음': {base:2800, rate:92,  min:4800},
  'ITX-청춘': {base:2400, rate:74,  min:4200},
  '무궁화호': {base:2600, rate:63,  min:2600},
  '남도해양': {base:2800, rate:96,  min:4800}, // 관광열차: 새마을급 운임
  '국악와인': {base:2800, rate:96,  min:4800}, // 관광열차: 새마을급 운임
};
function calcFare(t, fromStn, toStn, seatClass){
  const tb=FARE_TABLE[t.grade]||{base:3000,rate:90,min:3000};
  let km=routeDistanceKm(t, fromStn, toStn);
  if(!km||km<=0){
    // 좌표 부재 등으로 거리 산출 실패 시: 정차역 수 기반 보조 추정
    const stops=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
    const fi=stops.findIndex(s=>s.s===fromStn), ti=stops.findIndex(s=>s.s===toStn);
    km=(fi>=0&&ti>=0?Math.max(1,ti-fi):3)*18;
  }
  const raw=Math.max(tb.min, tb.base + km*tb.rate);
  const mult=SEAT_CLASSES[seatClass]?.mult||1;
  return Math.round(raw*mult/100)*100; // 100원 단위 반올림
}


function getFormationType(grade, trainNo){
  const n=parseInt(trainNo);
  if(grade==='KTX-이음') return 'ktx-eum';
  if(grade==='KTX-산천'){
    if((n>=251&&n<=258)||n===260) return 'ktx-sancheon-4'; // 한강로-창녕 4량
    return 'ktx-sancheon';
  }
  if(grade==='KTX'){
    if(n>=401&&n<=460) return 'ktx-mokpo'; // 마포-목포 10량
    if((n>=501&&n<=529)||(n>=701&&n<=773)) return 'ktx-eum';
    if((n>=151&&n<=181)||(n>=231&&n<=258)||(n>=551&&n<=582)) return 'ktx-sancheon';
    return 'ktx-1';
  }
  if(grade==='SRT') return 'ktx-sancheon';
  if(grade==='ITX-청춘') return 'itx-cc';
  if(grade==='ITX-새마을') return 'itx-sm';
  if(grade==='ITX-마음') return 'itx-maum'; // 한강로-충주 4량
  if(grade==='무궁화호'||grade==='남도해양'||grade==='국악와인') return 'mgh';
  return 'mgh';
}

function _makeFourAcrossCar(car, rows, starts, ends, extra={}){
  const cols=['A','B','C','D'];
  const missingSeats=[];
  cols.forEach(col=>{
    const first=starts?.[col]||1;
    const last=ends?.[col]||rows;
    for(let row=1;row<=rows;row++){
      if(row<first||row>last) missingSeats.push(`${row}${col}`);
    }
  });
  return {
    car,type:'general',label:'일반실',rows,cols,revRows:0,
    missingSeats,totalSeats:(rows*cols.length)-missingSeats.length,
    ...extra
  };
}

function getCarComposition(formType){
  switch(formType){
    case 'ktx-1':
      // 일반실: 1~8열 역방향, 9~15열 순방향
      return [
        {car:1,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        {car:2,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        {car:3,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        ...Array.from({length:15},(_,i)=>({car:i+4,type:'general',label:'일반실',rows:15,cols:['A','B','C','D'],revRows:8,totalSeats:60})),
        {car:19,type:'free',label:'자유석',totalSeats:0},
        {car:20,type:'free',label:'자유석',totalSeats:0},
      ];
    case 'ktx-sancheon':
      // 일반실: 1~15열 전부 순방향
      return [
        {car:1,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        ...Array.from({length:7},(_,i)=>({car:i+2,type:'general',label:'일반실',rows:15,cols:['A','B','C','D'],revRows:0,totalSeats:60})),
        {car:9,type:'free',label:'자유석',totalSeats:0},
        {car:10,type:'free',label:'자유석',totalSeats:0},
      ];
    case 'ktx-sancheon-4':
      // KTX-산천 한강로-창녕 4량: 특실1 + 일반2 + 자유석1
      return [
        {car:1,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        {car:2,type:'general',label:'일반실',rows:15,cols:['A','B','C','D'],revRows:0,totalSeats:60},
        {car:3,type:'general',label:'일반실',rows:15,cols:['A','B','C','D'],revRows:0,totalSeats:60},
        {car:4,type:'free',label:'자유석',totalSeats:0},
      ];
    case 'ktx-mokpo':
      // KTX 마포-목포 10량: 특실1 + 일반8(1~4열 역방향) + 자유석1
      return [
        {car:1,type:'special',label:'특실',rows:11,cols:['A','B','C'],totalSeats:33},
        ...Array.from({length:8},(_,i)=>({car:i+2,type:'general',label:'일반실',rows:15,cols:['A','B','C','D'],revRows:4,totalSeats:60})),
        {car:10,type:'free',label:'자유석',totalSeats:0},
      ];
    case 'ktx-eum':
      // 일반실: 1~19열 전부 순방향, 19열은 A·B만 (C·D 없음)
      return [
        {car:1,type:'premium',label:'우등실',rows:12,cols:['A','B','C','D'],totalSeats:46,
         missingSeats:['12A','12B']},
        ...Array.from({length:5},(_,i)=>({car:i+2,type:'general',label:'일반실',rows:19,cols:['A','B','C','D'],revRows:0,missingSeats:['19C','19D'],totalSeats:74})),
        {car:7,type:'free',label:'자유석',totalSeats:0},
        {car:8,type:'free',label:'자유석',totalSeats:0},
      ];
    case 'itx-cc':
      return Array.from({length:10},(_,i)=>({car:i+1,type:'general',label:'일반실',rows:13,cols:['A','B','C','D'],revRows:0,totalSeats:52}));
    case 'itx-sm':
      // 실제 ITX-새마을 6량 좌석·시설 배치. 시설 공간은 판매 좌석에서 제외한다.
      return [
        _makeFourAcrossCar(1,15,{A:1,B:1,C:1,D:1},{A:15,B:15,C:14,D:14},{
          facilities:{start:[],end:[{icon:'🧳',label:'수하물'},{icon:'🚻',label:'화장실'}]}
        }),
        _makeFourAcrossCar(2,19,{A:2,B:2,C:1,D:1},null,{
          facilities:{start:[{icon:'🧳',label:'수하물'}],end:[]}
        }),
        _makeFourAcrossCar(3,14,{A:3,B:3,C:4,D:4},null,{
          tags:['휠체어석','전동휠체어석'],
          facilities:{start:[{icon:'🫀',label:'AED'},{icon:'♿',label:'휠체어석'},{icon:'🧳',label:'수하물'}],end:[{icon:'🥤',label:'자동판매기'}]}
        }),
        _makeFourAcrossCar(4,16,{A:2,B:2,C:1,D:1},null,{
          facilities:{start:[{icon:'🥤',label:'자동판매기'},{icon:'🧳',label:'수하물'}],end:[{icon:'🚻',label:'화장실'}]}
        }),
        _makeFourAcrossCar(5,19,{A:2,B:2,C:1,D:1},null,{
          tags:['유아동반석'],
          notice:'유아동반 고객을 배려하기 위한 객실입니다.',
          facilities:{start:[{icon:'🧳',label:'수하물'}],end:[]}
        }),
        _makeFourAcrossCar(6,15,{A:2,B:2,C:1,D:1},null,{
          facilities:{start:[{icon:'🍼',label:'수유실'},{icon:'🧳',label:'수하물'}],end:[{icon:'🚻',label:'화장실'}]}
        })
      ];
    case 'itx-maum':
      // 실제 ITX-마음 4량 좌석·시설 배치
      return [
        _makeFourAcrossCar(1,13,null,null,{
          tags:['휠체어석','전동휠체어석'],
          facilities:{start:[],end:[{icon:'♿',label:'휠체어석'},{icon:'🦼',label:'전동휠체어석'}]}
        }),
        _makeFourAcrossCar(2,19,{A:1,B:1,C:2,D:2},null,{
          facilities:{start:[],end:[]}
        }),
        _makeFourAcrossCar(3,17,null,null,{
          tags:['유아동반석'],
          notice:'유아동반 고객을 배려하기 위한 객실입니다.',
          facilities:{start:[],end:[{icon:'🚻',label:'가족 화장실'}]}
        }),
        _makeFourAcrossCar(4,16,{A:2,B:2,C:1,D:1},null,{
          facilities:{start:[],end:[]}
        })
      ];
    case 'mgh':
    default:
      // 무궁화 6량: 4호차 카페객차(입석·좌석0), 나머지 5량 좌석 1~72 연번 4석 1열(18열)
      return [
        {car:1,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],seatOrder:[3,4,2,1],perRow:4,totalSeats:72},
        {car:2,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],seatOrder:[3,4,2,1],perRow:4,totalSeats:72},
        {car:3,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],seatOrder:[3,4,2,1],perRow:4,totalSeats:72},
        {car:4,type:'free',label:'카페객차',cafe:true,totalSeats:0},
        {car:5,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],seatOrder:[3,4,2,1],perRow:4,totalSeats:72},
        {car:6,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],seatOrder:[3,4,2,1],perRow:4,totalSeats:72},
      ];
  }
}

function getCarsForClass(composition, seatClass){
  if(seatClass==='special') return composition.filter(c=>c.type==='special');
  if(seatClass==='premium') return composition.filter(c=>c.type==='premium');
  if(seatClass==='general') return composition.filter(c=>c.type==='general');
  if(seatClass==='standing') return composition.filter(c=>c.type==='free');
  return composition.filter(c=>c.type==='general');
}

// 좌석 열문자 → 인덱스, 좌석 고유 ID 생성 (연번/열+문자 통일)
const SEAT_COL_IDX={'가':0,'나':1,'다':2,'라':3,'A':0,'B':1,'C':2,'D':3,'1':0,'2':1,'3':2,'4':3};
function seatSeqNum(car,row,col){
  const idx=SEAT_COL_IDX[col]||0;
  const order=car.seatOrder||null;
  const withinRow=order?.[idx]||idx+1;
  return (row-1)*((car.cols?car.cols.length:4))+withinRow;
}
function seatId(car,row,col){
  return car.numbered ? `${car.car}호차 ${seatSeqNum(car,row,col)}번` : `${car.car}호차 ${row}${col}`;
}

// 좌석 선택 화면은 운행 방향과 관계없이 항상 낮은 호차부터 표시한다.
function getSeatDisplayCars(composition,seatClass,train){
  const cars=getCarsForClass(composition,seatClass).slice();
  return cars.sort((a,b)=>a.car-b.car);
}
// 넓은 창(2열당 1창) 차량 판별 — KTX-산천 계열(산천·SRT)과 ITX-마음만 좁은 창(1열당 1창)

function isPassStop(t, stn){
  const valid=t.stops.filter(s=>s.arr||s.dep);
  if(!valid.length)return true;
  const origin=valid[0].s, terminus=valid[valid.length-1].s;
  // 전체 기종점
  if(stn===origin||stn===terminus)return false;
  const s=t.stops.find(x=>x.s===stn);
  if(!s)return true;
  if(s.arr==='통과'||s.dep==='통과')return true;
  // arr/dep 중 하나만 시각이 있으면 통과형(정차 아님)
  const oneSided=(hasTime(s.arr)&&!hasTime(s.dep))||(hasTime(s.dep)&&!hasTime(s.arr));
  // 섹션 경계역(주요역)이라도 양쪽 시각이 다 있어야 정차. 한쪽만 있으면 통과 (예: 중앙선 풍기·문수)
  return oneSided;
}


function _realPlatform(trainNo, trainName){
  if(typeof REAL_PLAT==='undefined')return null;
  const m=REAL_PLAT[trainNo]; if(!m)return null;
  const legacyName=trainName==='장수(전북)'?'장수':
    trainName==='북평(정선)'?'북평':trainName;
  const v=m[trainName]??m[legacyName];
  return (v==null)?null:v;
}
