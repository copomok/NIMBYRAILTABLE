

// KTX-산천/이음은 KTX와 동일하게 취급
const GC={'KTX':'KTX','KTX-산천':'KTX','KTX-이음':'KTX','SRT':'SRT','ITX-새마을':'ITX','ITX-마음':'ITX','ITX-청춘':'ITXCC','무궁화호':'MGH','남도해양':'NDH'};
const GL={'KTX':'KTX','KTX-산천':'KTX-산천','KTX-이음':'KTX-이음','SRT':'SRT','ITX-새마을':'ITX-새마을','ITX-마음':'ITX-마음','ITX-청춘':'ITX-청춘','무궁화호':'무궁화','남도해양':'남도해양'};
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
const GC_CSS_VAR={'KTX':'ktx','SRT':'srt','ITX':'itxsm','ITXCC':'itxcc','MGH':'mgh','NDH':'ndh'};
function gcCssVar(g){return GC_CSS_VAR[gc(g)]||'mgh';}
function gradeHtml(g){return `<span class="grade g-${gc(g)}">${GL[g]||g}</span>`;}
function lineChipHtml(line){
  const parts=line.split('·');
  if(parts.length<=1)return `<span class="line-chip">${line}</span>`;
  return `<span class="line-chip line-chip-multi" onclick="showLineTooltip(this,'${line}')">${parts[0]} <span style="color:var(--text3);font-size:10px">외 ${parts.length-1}개</span></span>`;
}

function showLineTooltip(el, line){
  // 기존 툴팁 제거
  document.querySelectorAll('.line-tooltip-popup').forEach(t=>t.remove());
  const popup=document.createElement('div');
  popup.className='line-tooltip-popup';
  popup.textContent=line.split('·').join(' · ');
  popup.onclick=e=>{e.stopPropagation();popup.remove();};
  const rect=el.getBoundingClientRect();
  popup.style.cssText=`position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--text1);white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4)`;
  document.body.appendChild(popup);
  // 바깥 클릭 시 닫기
  setTimeout(()=>{
    document.addEventListener('click',()=>popup.remove(),{once:true});
  },0);
}
function trainChip(no,g,fn){return `<span class="tc tc-${gc(g)}" onclick="${fn}">${no}</span>`;}
function dirLabel(d){return d==='down'?'<span class="dir down"><span class="dir-dot"></span>하행</span>':'<span class="dir up"><span class="dir-dot"></span>상행</span>';}
// 로컬 시간 기준 YYYY-MM-DD 문자열 (toISOString의 UTC 변환으로 인한 날짜 밀림 방지)
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
function addMinToClock(clockStr, add){ const m=toMin(clockStr); if(m==null)return ''; let x=(m+add)%1440; if(x<0)x+=1440; return `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`; }

// ══════════════════════════════════════════
// 📐 실좌표 기반 거리·운임
// ══════════════════════════════════════════
let _stnAliasMap=null;
function _stnCoord(name){
  if(typeof STATION_DB==='undefined'||!name) return null;
  let d=STATION_DB[name]||STATION_DB[name+'역']||(name.endsWith('역')?STATION_DB[name.slice(0,-1)]:null);
  if(!d){
    // 별칭 폴백: "회덕" → "회덕역 / 대전차량기지" 처럼 부가 표기가 붙은 키 매칭
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
// 좌표 객체 2개 간 거리 (nimbi_station_data.js의 haversineKm(4인자)와 이름 충돌 방지 위해 별도 명명)
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
const UNTRUSTED_COORDS=new Set(['장성','장흥','춘양']);
// 등급별 대표 표정속도(km/h) — 좌표 없는 구간을 시간으로 환산할 때 사용
const GRADE_KMH={'KTX':190,'KTX-산천':190,'KTX-이음':150,'SRT':190,'ITX-새마을':100,'ITX-마음':100,'ITX-청춘':100,'무궁화호':75,'남도해양':75};

// 열차 경로(fromStn~toStn) 실제 거리(km).
// 좌표 이상치/미확보 구간은 "해당 열차의 소요시간 × 구간 평균속도"로 추정.
function routeDistanceKm(t, fromStn, toStn){
  if(!t||!t.stops)return 0;
  const S=t.stops;
  const fi=S.findIndex(s=>s.s===fromStn), ti=S.findIndex(s=>s.s===toStn);
  if(fi<0||ti<0||ti<=fi)return 0;
  const kmh=GRADE_KMH[t.grade]||90, vpm=kmh/60; // km/분 폴백
  // 구간 내 정거장: 좌표(신뢰 불가/미확보 시 null)와 시각(분)
  const E=[];
  for(let i=fi;i<=ti;i++){
    let c=_stnCoord(S[i].s);
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

// iOS Safari: overflow:auto 내부 버튼 탭 누락 방지용 이중 핸들러
// touchend로 즉시 처리 + click으로 데스크탑 커버, 중복 방지
function addMobileTap(el, fn){
  let _startY=0, _tapped=false;
  el.style.touchAction='manipulation';
  el.addEventListener('touchstart', e=>{ _startY=e.touches[0].clientY; _tapped=false; }, {passive:true});
  el.addEventListener('touchend', e=>{
    if(Math.abs(e.changedTouches[0].clientY-_startY)<10){ _tapped=true; fn(e); }
  });
  el.addEventListener('click', e=>{ if(!_tapped) fn(e); else _tapped=false; });
}

let _detailViewMode='timeline';
const ALL_STATIONS=[...new Set(ALL_TRAINS.flatMap(t=>t.stops.map(s=>s.s)))].sort((a,b)=>a.localeCompare(b,'ko'));

const acIdxMap={};
// ── 초성 검색 ──
const CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChoseong(str){
  return str.split('').map(c=>{
    const code=c.charCodeAt(0);
    if(code>=44032&&code<=55203){
      return CHO[Math.floor((code-44032)/588)];
    }
    return c;
  }).join('');
}
function matchesQuery(name,query){
  if(!query)return true;
  if(name.includes(query))return true;
  // 초성 검색
  const cho=getChoseong(name);
  const qCho=query.split('').every(c=>CHO.includes(c))?query:null;
  if(qCho&&cho.includes(qCho))return true;
  return false;
}

// 예매 가능한 역(출발역으로 직통+환승 경로가 하나라도 있는 역) 캐시
let _bookableStations=null;
function getBookableStations(){
  if(_bookableStations)return _bookableStations;
  const allStop=new Set();
  ALL_TRAINS.forEach(t=>t.stops.forEach(s=>{
    if((hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s))allStop.add(s.s);
  }));
  const valid=new Set();
  allStop.forEach(from=>{
    const depTrains=ALL_TRAINS.filter(t=>{
      const fi=t.stops.findIndex(s=>s.s===from);
      return fi>=0&&!isPassStop(t,from);
    });
    if(!depTrains.length)return;
    // 직통 가능한 목적지가 있으면 OK
    for(const t of depTrains){
      const fi=t.stops.findIndex(s=>s.s===from);
      if(t.stops.slice(fi+1).some(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s))){
        valid.add(from);return;
      }
    }
    // 환승 가능한 경로가 있으면 OK
    for(const t of depTrains){
      const fi=t.stops.findIndex(s=>s.s===from);
      const mids=t.stops.slice(fi+1).filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s));
      for(const mid of mids){
        if(ALL_TRAINS.some(t2=>{
          if(t2===t)return false;
          const xi=t2.stops.findIndex(s=>s.s===mid.s);
          if(xi<0||isPassStop(t2,mid.s))return false;
          return t2.stops.slice(xi+1).some(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t2,s.s));
        })){valid.add(from);return;}
      }
    }
  });
  _bookableStations=[...valid].sort((a,b)=>a.localeCompare(b,'ko'));
  return _bookableStations;
}

function acShow(iid,did){
  const inp=document.getElementById(iid),drop=document.getElementById(did);
  if(!inp||!drop)return;
  const q=inp.value.trim();
  if(!q){drop.className='ac-dropdown';drop.style.display='none';return;}
  // 예매 역 입력 필드면 bookable 역만 표시
  const isBookField=['book-stn-input','pass-from','pass-to'].includes(iid);
  const pool=isBookField?getBookableStations():ALL_STATIONS;
  // 초성 검색 포함
  const hits=pool.filter(s=>matchesQuery(s,q)).slice(0,12);
  if(!hits.length){drop.className='ac-dropdown';drop.style.display='none';return;}
  // 하이라이트
  drop.innerHTML=hits.map(s=>{
    let display=s;
    if(!CHO.includes(q[0])){
      const i=s.indexOf(q);
      if(i>=0) display=s.slice(0,i)+`<span style="color:var(--accent)">${s.slice(i,i+q.length)}</span>`+s.slice(i+q.length);
    }
    return `<div class="ac-item" onmousedown="event.preventDefault();acSel('${iid}','${did}','${s}')">${display}</div>`;
  }).join('');
  drop.className='ac-dropdown open';
  drop.style.zIndex='9500';
  drop.style.display='block';
}
function acHide(did){const el=document.getElementById(did);if(el){el.className='ac-dropdown';el.style.display='none';}}
function acSel(iid,did,val){const el=document.getElementById(iid);if(el)el.value=val;acHide(did);}
function acKey(e,iid,did){
  const drop=document.getElementById(did),items=drop.querySelectorAll('.ac-item');
  if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();acIdxMap[did]=Math.min((acIdxMap[did]??-1)+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();acIdxMap[did]=Math.max((acIdxMap[did]??0)-1,0);}
  else if(e.key==='Enter'){if(acIdxMap[did]>=0){e.preventDefault();acSel(iid,did,items[acIdxMap[did]].textContent);return;}acHide(did);return;}
  else if(e.key==='Escape'){acHide(did);return;}
  items.forEach((el,i)=>el.classList.toggle('selected',i===acIdxMap[did]));
  if(acIdxMap[did]>=0)items[acIdxMap[did]].scrollIntoView({block:'nearest'});
}
// ── 현재 시각 표시 ──
function updateClock(){
  const now=new Date();
  const h=String(now.getHours()).padStart(2,'0');
  const m=String(now.getMinutes()).padStart(2,'0');
  const s=String(now.getSeconds()).padStart(2,'0');
  const el=document.getElementById('header-clock');
  if(el) el.textContent=`${h}:${m}:${s}`;
}
setInterval(updateClock,1000);
updateClock();

// 공지 안읽음 뱃지 표시
function updateNoticeBadge(){
  const cnt=getUnreadNoticeCount();
  // 기존 탭 뱃지 (숨겨져 있어도 유지)
  const tab=document.getElementById('tab-notice');
  if(tab){
    let dot=tab.querySelector('.notice-badge-dot');
    if(cnt>0){
      if(!dot){dot=document.createElement('span');dot.className='notice-badge-dot';tab.appendChild(dot);}
    } else if(dot){dot.remove();}
  }
  // 마이페이지(햄버거) 버튼 뱃지는 공지와 무관 — 공지 미열람으로 인한 알림 점 제거
  const myBtn=document.querySelector('.my-btn');
  if(myBtn){const myDot=myBtn.querySelector('.notice-badge-dot');if(myDot)myDot.remove();}
}
window.addEventListener('load',()=>setTimeout(updateNoticeBadge,300));

// ── 다음 역까지 남은 시간 계산 ──
function getNextStopEta(t, status){
  if(!status||status.status!=='running')return null;
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  // 다음 정차역 찾기
  const nextStn=status.nextStn||(status.atStn?null:null);
  if(!nextStn)return null;
  const stop=t.stops.find(s=>s.s===nextStn);
  if(!stop)return null;
  const arrM=toMin(stop.arr||stop.dep);
  if(arrM===null)return null;
  // 자정 보정
  let adj=arrM;
  if(arrM<nowM-30) adj+=1440;
  const diff=adj-nowM;
  if(diff<0||diff>120)return null;
  return {stn:nextStn, min:diff, timeStr:stop.arr||stop.dep};
}


// ── 노선도 미니맵 ──
function updateMinimap(){
  const wrap=document.getElementById('map-svg-wrap');
  const miniEl=document.getElementById('map-minimap');
  if(!wrap||!miniEl) return;

  const svgEl=wrap.querySelector('svg');
  if(!svgEl) return;

  // 미니맵 SVG viewBox 가져오기
  const vb=svgEl.getAttribute('viewBox');
  if(!vb) return;

  // 현재 스크롤 위치/크기
  const scrollTop=wrap.scrollTop;
  const scrollLeft=wrap.scrollLeft;
  const visH=wrap.clientHeight;
  const visW=wrap.clientWidth;
  const totalH=wrap.scrollHeight;
  const totalW=wrap.scrollWidth;

  // 미니맵 높이 비율
  const miniH=120;
  const ratio=miniH/totalH;
  const thumbH=Math.max(16, visH*ratio);
  const thumbTop=scrollTop*ratio;

  miniEl.style.height=miniH+'px';
  miniEl.innerHTML=`<div class="map-minimap-thumb" style="height:${thumbH.toFixed(1)}px;top:${thumbTop.toFixed(1)}px"></div>`;

  // 미니맵 클릭으로 스크롤
  miniEl.onclick=e=>{
    const rect=miniEl.getBoundingClientRect();
    const clickY=e.clientY-rect.top;
    wrap.scrollTop=clickY/ratio;
  };
}

// ── 🚆/🚇 이용 모드 (기차/전철) ──
let _appMode=(()=>{try{return localStorage.getItem('nimbi_mode')||'train';}catch(e){return 'train';}})();
const METRO_MODE_TABS=['metrolines','metroroute','map','stationinfo']; // 전철 모드에서 보이는 메인 탭
const TRAIN_MODE_TABS=['train','station','route','ops','map','stats','notice','stationinfo','delay']; // 기차 모드 상단바 탭
// 그 외 탭(book/alarm/fav/ticket 등)은 마이페이지 전용 — 항상 숨김 유지
function _applyModeTabs(){
  const visible=_appMode==='metro'?METRO_MODE_TABS:TRAIN_MODE_TABS;
  document.querySelectorAll('.tab').forEach(b=>{
    const id=(b.id||'').replace('tab-','');
    if(METRO_MODE_TABS.includes(id)||TRAIN_MODE_TABS.includes(id)){
      b.style.display=visible.includes(id)?'':'none';
    } else {
      b.style.display='none';
    }
  });
}
function setAppMode(m){
  if(_appMode===m){_syncModeButtons();return;}
  _appMode=m;
  try{localStorage.setItem('nimbi_mode',m);}catch(e){}
  _syncModeButtons();
  _applyModeTabs();
  // 현재 탭이 새 모드에서 숨겨지면 기본 탭으로 이동
  const activeTab=document.querySelector('.tab.active');
  const activeId=(activeTab?.id||'').replace('tab-','');
  if(m==='metro'){
    if(!METRO_MODE_TABS.includes(activeId)) switchTab('metrolines');
    else if(activeId==='map') renderMapTabForMode();
    else if(activeId==='stationinfo') renderStationInfo();
  } else {
    if(activeId==='metrolines'||activeId==='metroroute') switchTab('train');
    else if(activeId==='map') renderMapTabForMode();
    else if(activeId==='stationinfo') renderStationInfo();
  }
}
function _syncModeButtons(){
  document.getElementById('mode-btn-train')?.classList.toggle('on',_appMode==='train');
  document.getElementById('mode-btn-metro')?.classList.toggle('on',_appMode==='metro');
}
// 헤더 새로고침: 현재 활성 탭을 다시 렌더 (마이페이지 서브패널이 열려 있으면 그 섹션을 갱신)
function refreshCurrentTab(){
  const btn=document.getElementById('hdr-refresh');
  if(btn){ btn.classList.add('spin'); setTimeout(()=>btn.classList.remove('spin'),650); }
  const sub=document.getElementById('my-sub-panel');
  if(sub&&sub.classList.contains('open')){
    const title=document.getElementById('my-sub-title')?.textContent||'';
    const sec=Object.entries(MY_TITLES).find(([k,v])=>v===title)?.[0];
    if(sec){ openMySection(sec); return; }
  }
  const a=document.querySelector('.tab.active');
  const id=a?a.id.replace('tab-',''):'train';
  switchTab(id); // 노선도·통계·공지·역정보 등은 switchTab이 재렌더
  // 검색형 탭은 현재 입력값 그대로 재검색해야 결과가 갱신됨
  try{
    if(id==='train'){
      if(document.getElementById('input-trainno')?.value.trim())searchByTrain();
      else if(document.getElementById('sel-line-train')?.value)selectTrainLine();
    } else if(id==='station'){
      if(document.getElementById('input-station')?.value.trim())searchByStation();
    } else if(id==='route'){
      if(document.getElementById('input-from')?.value.trim()&&document.getElementById('input-to')?.value.trim())searchByRoute();
    }
  }catch(e){}
}
function switchTab(n){
  try{ closeStationBoard(); }catch(e){}
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+n).classList.add('active');
  document.getElementById('panel-'+n).classList.add('active');
  if(n==='map'){
    const content=document.getElementById('map-content');
    if(content) content.style.display='';
    renderMapTabForMode();
  } else {
    // 다른 탭으로 이동 시 노선도 콘텐츠 숨기기
    _mapCurrentLine=null;
    const content=document.getElementById('map-content');
    if(content) content.style.display='none';
    const countEl=document.getElementById('map-train-count');
    if(countEl) countEl.textContent='';
    // 고정 오버레이 숨기기
    const overlay=document.getElementById('map-track-overlay');
    if(overlay) overlay.style.display='none';
  }
  if(n==='alarm') renderAlarms();
  if(n==='fav') renderFavs();
  if(n==='stationinfo'){if(typeof renderStationInfo==='function')renderStationInfo();}
  if(n==='stats') renderStats();
  if(n==='notice') renderNotice();
  if(n==='ticket') renderTickets();
  if(n==='train') updateHomeTripWidget();
  if(n==='book') renderBookTab();
  if(n==='delay'){const el=document.getElementById('result-delay');if(el)renderSIDelay(el);}
  if(n==='metrolines') renderMetroLinesTab();
  if(n==='metroroute') renderMetroRouteTab();
  if(n==='ops') renderOpsTab();

}

// ── 통과 판별 ──
// boundary: 각 섹션의 첫/끝역 → arr/dep 한쪽만 있어도 정차역으로 처리
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

function selectTrainLine(){
  const line=document.getElementById('sel-line-train').value;
  const listEl=document.getElementById('train-line-list');
  const detailEl=document.getElementById('result-train');
  detailEl.innerHTML='';
  if(!line){listEl.innerHTML='';return;}
  const trains=ALL_TRAINS.filter(t=>t.line.includes(line));
  if(!trains.length){listEl.innerHTML='<div class="empty"><div class="empty-icon">🚫</div><p>해당 노선 열차가 없습니다</p></div>';return;}
  const sorted=[...trains].sort((a,b)=>parseInt(a.no)-parseInt(b.no));
  const rows=sorted.map(t=>{
    const valid=t.stops.filter(s=>s.arr||s.dep);
    const first=valid[0], last=valid[valid.length-1];
    const depT=first?(hasTime(first.dep)?first.dep:hasTime(first.arr)?first.arr:'-'):'-';
    const arrT=last?(hasTime(last.arr)?last.arr:hasTime(last.dep)?last.dep:'-'):'-';
    return `<tr onclick="showTrainDetail('${t.no}')">
      <td>${trainChip(t.no,t.grade,`event.stopPropagation();showTrainDetail('${t.no}')`)}</td>
      <td>${gradeHtml(t.grade)}</td>
      <td>${lineChipHtml(t.line)}</td>
      <td>${dirLabel(t.dir)}</td>
      <td style="font-weight:500">${t.dest}행</td>
      <td><span class="time-dep">${depT}</span></td>
      <td><span class="time-arr">${arrT}</span></td>
    </tr>`;
  }).join('');
  listEl.innerHTML=`<div class="result-header"><div class="result-title">🚆 ${line}</div><span class="badge blue">${sorted.length}편</span></div>
  <div class="table-wrap"><table><thead><tr><th>열차</th><th>등급</th><th>노선</th><th>방향</th><th>행선지</th><th>첫 출발</th><th>최종 도착</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="hint">※ 열차번호 클릭 시 전체 운행 정보 조회</p>`;
}

function showTrainDetail(no){
  const trains=ALL_TRAINS.filter(t=>t.no===no);
  const el=document.getElementById('result-train');
  if(!trains.length)return;
  el.innerHTML=trains.map(renderDetail).join('');
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function searchByTrain(){
  const no=document.getElementById('input-trainno').value.trim();
  const el=document.getElementById('result-train');
  if(!no){el.innerHTML='';return;}
  saveHistory('train',no);
  const trains=ALL_TRAINS.filter(t=>t.no===no);
  if(!trains.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🚫</div><p><b>${no}</b>번 열차를 찾을 수 없습니다</p></div>`;return;}
  el.innerHTML=trains.map(renderDetail).join('');
  const fb=document.getElementById('fav-btn-train');
  if(fb)fb.style.display='';
}

function getCurrentStatus(t, atMin){
  const now=new Date();
  const nowMin = atMin !== undefined ? atMin : now.getHours()*60+now.getMinutes();

  // 시각 있는 역 전체 수집
  const all=[];
  t.stops.forEach((s,idx)=>{
    if(hasTime(s.arr)||hasTime(s.dep))all.push({s,idx});
  });
  if(!all.length)return null;

  // 자정 넘는 열차 대응: offset 보정
  function normalizeMinutes(stops){
    const result=[];
    let offset=0, prevM=-1;
    for(const item of stops){
      const s=item.s;
      const rawArr=toMin(s.arr), rawDep=toMin(s.dep);
      const rawM=rawArr??rawDep;
      if(rawM===null){result.push({...item,normArr:null,normDep:null});continue;}
      if(prevM>=0&&rawM<prevM-60) offset+=1440;
      result.push({...item,
        normArr:rawArr!==null?rawArr+offset:null,
        normDep:rawDep!==null?rawDep+offset:null});
      prevM=rawM;
    }
    return result;
  }

  const norm=normalizeMinutes(all);
  const firstM=norm[0].normDep??norm[0].normArr;
  const lastItem=norm[norm.length-1];
  const lastM=lastItem.normArr??lastItem.normDep;

  let nowM=nowMin;
  if(lastM>1440&&nowMin<firstM) nowM=nowMin+1440;

  if(nowM<firstM)return{status:'before'};
  if(nowM>lastM)return{status:'done',nowMin};

  // ── 핵심: 선형 탐색으로 단순하게 ──
  // 1) 정차 중 판정: nowM이 이 역의 arr~dep 사이
  for(let i=0;i<norm.length;i++){
    const {s,normArr,normDep}=norm[i];
    // case A: arr·dep 둘 다 있는 정차역
    if(normArr!==null&&normDep!==null&&nowM>=normArr&&nowM<=normDep){
      const prevStn=i>0?norm[i-1].s.s:null;
      return{status:'running',atStn:s.s,prevStn,nowMin};
    }
    // case B: arr만 있는 정차역 (arr ~ 다음역 출발 전)
    if(normArr!==null&&normDep===null&&!isPassStop(t,s.s)&&nowM>=normArr){
      const nextNorm=norm[i+1]??null;
      const nextM=nextNorm?(nextNorm.normDep??nextNorm.normArr):null;
      if(nextM===null||nowM<nextM){
        const prevStn=i>0?norm[i-1].s.s:null;
        return{status:'running',atStn:s.s,prevStn,nowMin};
      }
    }
  }

  // 2) 이동 중 판정: nowM 기준으로 가장 최근에 지난 역과 다음 도달할 역을 직접 찾기
  let prevStn=null, nextStn=null;
  for(let i=0;i<norm.length;i++){
    const {s,normArr,normDep}=norm[i];
    // 이 역을 떠난 시각 (dep 있으면 dep, 없으면 arr)
    const leaveM=normDep??normArr;
    // 이 역에 도착한 시각
    const arriveM=normArr??normDep;

    if(leaveM!==null&&leaveM<=nowM){
      prevStn=s.s; // nowM 이전에 지난 역 → 계속 갱신
    }
    if(arriveM!==null&&arriveM>nowM&&nextStn===null){
      nextStn=s.s; // nowM 이후 처음 도달할 역
    }
  }

  if(prevStn&&nextStn) return{status:'running',prevStn,nextStn,nowMin};
  return{status:'done',nowMin};

  // (아래 코드는 도달하지 않지만 구조 유지용)
  for(let i=0;i<norm.length;i++){
    const cur=norm[i];
    const {s,normArr,normDep}=cur;
    if(normDep===null) continue;
    const leaveM=normDep;
    if(nowM<=leaveM) continue;
    for(let j=i+1;j<norm.length;j++){
      const nxt=norm[j];
      const nxtArrM=nxt.normArr??nxt.normDep;
      if(nxtArrM===null) continue;
      if(nowM<nxtArrM){
        const {idx:curIdx}=cur;
        const {idx:nxtIdx}=nxt;
        for(let k=curIdx+1;k<nxtIdx;k++){
          const mid=t.stops[k];
          if(!isPassStop(t,mid.s))continue;
          const midRaw=toMin(mid.arr)??toMin(mid.dep);
          if(midRaw===null)continue;
          const midM=midRaw+(leaveM>=1440?1440:0);
          if(midM===nowM) return{status:'running',passStn:mid.s,prevStn:s.s,nowMin};
        }
        const prevStn2 = j>0 ? norm[j-1].s.s : s.s;
        return{status:'running',prevStn:prevStn2,nextStn:nxt.s.s,nowMin};
      }
      // nowM >= nxtArrM: j역에 도달했거나 지남
      // j역이 arr·dep 둘 다 있는 정차역이면 nowM이 그 사이에 있는지 체크
      if(nxt.normArr!==null&&nxt.normDep!==null&&nowM>=nxt.normArr&&nowM<=nxt.normDep){
        const prevStn=s.s;
        return{status:'running',atStn:nxt.s.s,prevStn,nowMin};
      }
      // 내부 루프 계속
      // (break 대신 continue: 통과역 여러 개 연속일 때 외부 루프가 done으로 빠지는 버그 방지)
    }
  }
  return{status:'done',nowMin};
}

function renderDetail(t){
  const valid=t.stops.filter(s=>s.arr||s.dep);
  const originStn=valid[0]?.s, terminusStn=valid[valid.length-1]?.s;
  const status=getCurrentStatus(t);
  const c=gc(t.grade);

  // ── 타임라인 rows ──
  let rows=''; let seq=0;
  t.stops.forEach(s=>{
    const arr=s.arr, dep=s.dep;
    if(!arr&&!dep)return;
    const isOrigin=s.s===originStn, isTerm=s.s===terminusStn;
    const isPass=!isOrigin&&!isTerm&&isPassStop(t,s.s);
    seq++;

    // 현재 위치 하이라이트
    let hlRow='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) hlRow=' tl-row-hl-at';
      else if(status.nextStn===s.s) hlRow=' tl-row-hl-next';
    }

    // dot 클래스
    const dot=isOrigin?'tl-dot origin':isTerm?'tl-dot term':isPass?'tl-dot pass':'tl-dot stop';

    // 시간
    let timeHtml='';
    if(isOrigin){
      timeHtml=`<span class="tl-time dep">발 ${dep||''}</span>`;
    } else if(isTerm){
      timeHtml=`<span class="tl-time arr">착 ${arr||''}</span>`;
    } else if(isPass){
      timeHtml=`<span class="tl-time pass">통과 ${arr||dep||''}</span>`;
    } else {
      const ap=hasTime(arr)?`착 ${arr}`:'';
      const dp=hasTime(dep)?`발 ${dep}`:'';
      if(ap&&dp) timeHtml=`<span class="tl-time arr">${ap}</span><span class="tl-time dep">${dp}</span>`;
      else timeHtml=`<span class="tl-time ${hasTime(arr)?'arr':'dep'}">${ap||dp}</span>`;
    }

    // 뱃지
    let badge='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) badge='<span class="tl-badge now">현재</span>';
      else if(status.nextStn===s.s) badge='<span class="tl-badge next">다음</span>';
    }

    // 알람 버튼
    let alarmBtn='';
    if(!isPass){
      const tno=t.no, tstn=s.s;
      const si=t.stops.findIndex(x=>x.s===tstn);
      const prevStop=si>0?t.stops.slice(0,si).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr)):null;
      const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;
      const anySet=hasAlarm(`board:${tno}:${tstn}`)||hasAlarm(`arr:${tno}:${tstn}`);
      alarmBtn=`<button class="alarm-bell-btn${anySet?' has-alarm':''}" onclick="openAlarmPopup('${tno}','${tstn}','${arr||''}','${dep||''}','${prevTime||''}')">🔔</button>`;
    }

    const passStyle=isPass?' tl-row-pass':'';
    rows+=`<div class="tl-row${passStyle}${hlRow}">
      <div class="tl-time-col">${timeHtml}</div>
      <div class="tl-line-col">
        <div class="${dot}"></div>
        ${isOrigin||isTerm?'':'<div class="tl-line"></div>'}
      </div>
      <div class="tl-stn-col">
        <span class="tl-stn-name ${isOrigin?'origin':isTerm?'term':isPass?'pass':'stop'}">${s.s}</span>
        ${badge}
      </div>
      <div class="tl-alarm-col">${alarmBtn}</div>
    </div>`;
  });

  // ── 운행 배너 ──
  let statusBanner='';
  if(status){
    if(status.status==='running'){
      let msg;
      if(status.passStn) msg=`${status.passStn}역을 통과 중입니다`;
      else if(status.atStn) msg=`${status.atStn}역에 정차 중입니다`;
      else if(status.nextStn) msg=`${status.nextStn}역으로 이동 중입니다`;
      else msg='운행 중입니다';
      const eta=getNextStopEta(t,status);
      const etaTxt=eta?(eta.min===0
        ?`<br><span class="eta-sub">곧 도착 예정</span>`
        :`<br><span class="eta-sub">약 ${eta.min}분 뒤 도착 예정</span>`):'';
      statusBanner=`<div class="train-status-banner running">🚆 ${msg}${etaTxt}</div>`;
    } else if(status.status==='before'){
      statusBanner=`<div class="train-status-banner before">운행을 준비중인 열차입니다</div>`;
    } else {
      statusBanner=`<div class="train-status-banner done">운행이 종료된 열차입니다</div>`;
    }
  }

  // ── 소요시간 / 정차역 수 ──
  const valid2=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const totalStops=valid2.filter(s=>!isPassStop(t,s.s)).length;
  const first=valid2[0], last=valid2[valid2.length-1];
  const depT=hasTime(first?.dep)?first.dep:first?.arr||'';
  const arrT=hasTime(last?.arr)?last.arr:last?.dep||'';
  const dur=durStr(depT,arrT);
  const st=trainStats(t);

  return `<div class="detail-card" id="dc-${t.no}">
    <div class="detail-head">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1;min-width:0">
          <div class="detail-no" style="color:var(--c-${gcCssVar(t.grade)})">${t.no}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
            ${gradeHtml(t.grade)}${lineChipHtml(t.line)}
            <span style="font-size:16px;font-weight:700">${t.dest}행</span>
          </div>
          <div class="detail-meta">${first?.s||''} ${depT} 발 → ${last?.s||''} ${arrT} 착</div>
          <div class="detail-meta" style="margin-top:2px">정차역 ${totalStops}개 &nbsp;·&nbsp; 소요시간 ${fmtDurKor(durMin(depT,arrT))}</div>
          ${st.km>0?`<div class="detail-meta" style="margin-top:2px">표정속도 ${fmtSpeed(st.speed)}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="share-btn" style="position:static" onclick="trackTrainOnMap('${t.no}')">🗺️</button>
          <button class="share-btn" style="position:static" onclick="shareTrainLink('${t.no}')">🔗</button>
        </div>
      </div>
    </div>
    ${statusBanner}
    <div class="tl-toolbar">
      <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="hide-pass-${t.no}" onchange="togglePassRows('${t.no}')" style="cursor:pointer">
        통과역 숨기기
      </label>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="view-toggle-btn" onclick="showTrainRotation('${t.no}')" title="편성 운용 추정 — 종착 후 이어 운행하는 열차">🔁</button>
        <button class="view-toggle-btn" onclick="openTrainCompare('${t.no}')" title="열차 비교 — 대피·추월 지점 확인">⚖️</button>
        <button class="view-toggle-btn${_detailViewMode==='timeline'?' active':''}" onclick="setDetailView('timeline','${t.no}')">⏱ 타임라인</button>
        <button class="view-toggle-btn${_detailViewMode==='table'?' active':''}" onclick="setDetailView('table','${t.no}')">📋 표</button>
      </div>
    </div>
    <div id="tl-${t.no}">${_detailViewMode==='table'?renderTableView(t):rows}</div>
    <div class="ticket-cta-wrap" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary ticket-cta-btn" style="flex:1" onclick="openBookingPopup('${t.no}','${first?.s||''}','${last?.s||''}','${depT}','${arrT}')">🎫 승차권 예매 (전 구간)</button>
    </div>
  </div>`;
}


function searchByStation(){
  // 드롭다운 닫기
  acHide('ac-station');
  const stn=document.getElementById('input-station').value.trim();
  if(stn)saveHistory('station',stn);
  const dir=document.getElementById('sel-dir-station').value;
  const lineF=document.getElementById('sel-line-station').value;
  const passF=document.getElementById('sel-pass-station').value;
  const terminusF=document.getElementById('sel-terminus-station')?.value||'all';
  const afterRaw=document.getElementById('input-after-time').value.trim();
  const afterMin=afterRaw?toMin(afterRaw):null;
  const gradeF=document.getElementById('sel-grade-station').value;
  const nightF=document.getElementById('sel-night-station')?.value||'all';
  const el=document.getElementById('result-station');
  if(!stn){el.innerHTML='<div class="empty"><div class="empty-icon">🏢</div><p>역 이름을 입력하세요</p></div>';return;}
  let results=[];
  ALL_TRAINS.forEach(t=>{
    if(dir!=='all'&&t.dir!==dir)return;
    if(lineF!=='all'&&!t.line.includes(lineF))return;
    if(!gradeMatch(t.grade,gradeF))return;
    const stop=t.stops.find(s=>s.s===stn);
    if(!stop||(!stop.arr&&!stop.dep))return;
    const isPass=isPassStop(t,stn);
    if(passF==='stop'&&isPass)return;
    // 당역 종착 제외 필터
    if(terminusF==='exclude'){
      const valid=t.stops.filter(s=>s.arr||s.dep);
      const terminus=valid.length?valid[valid.length-1].s:null;
      if(terminus===stn)return;
    }
    const sortT=toMin(hasTime(stop.dep)?stop.dep:null)??toMin(hasTime(stop.arr)?stop.arr:null)??9999;
    if(afterMin!==null&&sortT!==9999&&sortT<afterMin)return;
    const timeV2=hasTime(stop.dep)?stop.dep:hasTime(stop.arr)?stop.arr:null;
    if(nightF==='only'&&!isNightTrain(timeV2))return;
    results.push({t,stop,isPass,sortT,isNight:isNightTrain(timeV2)});
  });
  results.sort((a,b)=>a.sortT-b.sortT);
  if(!results.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🚫</div><p><b>${stn}</b>에 정차하는 열차가 없습니다</p></div>`;return;}
  const rows=results.map(({t,stop,isPass,sortT,isNight})=>{
    const arr=stop.arr,dep=stop.dep;
    const aC=hasTime(arr)?`<span class="time-arr">${arr}</span>`:'<span style="color:var(--text3)">-</span>';
    const dC=hasTime(dep)?`<span class="time-dep">${dep}</span>`:'<span style="color:var(--text3)">-</span>';
    const nightCls=(nightF==='highlight'&&isNight)?' class="night-train-row"':'';
    const rs=isPass?'style="opacity:.6;font-style:italic"'+nightCls:nightCls;
    return `<tr ${rs} data-sort="${sortT}" onclick="jumpToTrain('${t.no}')">
      <td>${trainChip(t.no,t.grade,`event.stopPropagation();jumpToTrain('${t.no}')`)}</td>
      <td>${gradeHtml(t.grade)}</td><td>${lineChipHtml(t.line)}</td>
      <td>${dirLabel(t.dir)}</td><td style="font-weight:500">${t.dest}</td>
      <td>${aC}</td><td>${dC}</td></tr>`;
  }).join('');
  const fb=document.getElementById('fav-btn-station');
  if(fb)fb.style.display='';
  const afterLabel=afterMin!==null?` · ${afterRaw} 이후`:'';
  el.innerHTML=`<div class="result-header"><div class="result-title">🏢 ${stn} 시간표${afterLabel}</div><span class="badge blue">${results.length}편</span></div>
  <div class="table-wrap"><table><thead><tr><th>열차</th><th>등급</th><th>노선</th><th>방향</th><th>행선지</th><th>도착</th><th>출발</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="hint">※ 열차번호 클릭 시 전체 운행 정보 · 흐린 행 = 통과</p>`;
  // 다음 열차 버튼 삽입
  insertNextTrainBtn(el);
}

function insertNextTrainBtn(el){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  const rows=[...el.querySelectorAll('tbody tr[data-sort]')];
  const target=rows.find(r=>{const t=parseInt(r.dataset.sort);return t!==9999&&t>=nowMin;});
  if(!target)return;
  // 필터 버튼 옆에 삽입
  const filterBtn=document.getElementById('btn-filter-station');
  if(!filterBtn)return;
  // 이미 있으면 제거
  const existing=document.getElementById('btn-next-train-station');
  if(existing)existing.remove();
  const btn=document.createElement('button');
  btn.id='btn-next-train-station';
  btn.className='btn-next-train';
  btn.textContent='⏩ 다음 열차';
  btn.onclick=()=>{
    target.classList.add('next-train-row');
    setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),50);
  };
  filterBtn.insertAdjacentElement('afterend',btn);
}

function toggleRouteFilter(){
  const row=document.getElementById('filter-row-route');
  const btn=document.getElementById('btn-filter-route');
  if(!row||!btn)return;
  const open=row.classList.toggle('open');
  btn.textContent=open?'필터 ▴':'필터 ▾';
  btn.classList.toggle('active',open);
}

function toggleXferSettings(){
  const el=document.getElementById('xfer-settings');
  if(el) el.style.display=el.style.display==='none'?'block':'none';
}

function setAfterRouteNow(){
  const now=new Date();
  const h=now.getHours(), m=now.getMinutes();
  document.getElementById('input-after-route').value=`${h}:${String(m).padStart(2,'0')}`;
  searchByRoute();
}

function searchByRoute(){
  acHide('ac-from');
  acHide('ac-to');
  const from=document.getElementById('input-from').value.trim();
  const to=document.getElementById('input-to').value.trim();
  if(from)saveHistory('route_from',from);
  if(to)saveHistory('route_to',to);
  const afterRaw=document.getElementById('input-after-route').value.trim();
  const afterMin=afterRaw?toMin(afterRaw):null;
  const sortMode=document.getElementById('sel-sort-route')?.value||'duration';
  const sortLabel={'duration':'소요시간순','depart':'출발시각순','arrive':'도착시각순'}[sortMode]||'';
  const maxDur=parseInt(document.getElementById('sel-max-duration')?.value||'0');
  const gradeF=document.getElementById('sel-grade-route')?.value||'all';
  const el=document.getElementById('result-route');
  if(!from||!to){el.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><p>출발역과 도착역을 입력하세요</p></div>';return;}
  if(from===to){el.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>출발역과 도착역이 같습니다</p></div>';return;}

  function getStopTime(stop){
    if(hasTime(stop.dep))return stop.dep;
    if(hasTime(stop.arr))return stop.arr;
    return null;
  }
  // durStr은 전역 함수 사용

  // ── 직통 탐색 ──
  let directs=[];
  ALL_TRAINS.forEach(t=>{
    if(!gradeMatch(t.grade,gradeF))return;
    const stops=t.stops;   const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    if(fi===-1||ti===-1||fi>=ti)return;
    if(isPassStop(t,from)||isPassStop(t,to))return;
    const depT=getStopTime(stops[fi]);
    const arrT=hasTime(stops[ti].arr)?stops[ti].arr:hasTime(stops[ti].dep)?stops[ti].dep:null;
    if(!depT)return;
    if(afterMin!==null&&toMin(depT)<afterMin)return;
    const durM=durMin(depT,arrT)??0;
    if(maxDur>0&&durM>maxDur)return;
    directs.push({t,depT,arrT,dur:durStr(depT,arrT),sortT:toMin(depT)??9999});
  });
  // 정렬
  if(sortMode==='depart') directs.sort((a,b)=>a.sortT-b.sortT);
  else if(sortMode==='arrive') directs.sort((a,b)=>arrKey(a.depT,a.arrT)-arrKey(b.depT,b.arrT));
  else directs.sort((a,b)=>{
    const dA=durMin(a.depT,a.arrT), dB=durMin(b.depT,b.arrT);
    return (dA||9999)-(dB||9999);
  });

  // 직통 있으면 직통만 표시
  if(directs.length){
    const afterLabel=afterMin!==null?` · ${afterRaw} 이후`:'';
    const rows=directs.map(({t,depT,arrT,dur})=>
      `<tr onclick="jumpToTrain('${t.no}')">
        <td>${trainChip(t.no,t.grade,`event.stopPropagation();jumpToTrain('${t.no}')`)}</td>
        <td>${gradeHtml(t.grade)}</td><td>${lineChipHtml(t.line)}</td>
        <td>${dirLabel(t.dir)}</td><td style="font-weight:500">${t.dest}</td>
        <td><span class="time-dep">${depT||'-'}</span></td>
        <td><span class="time-arr">${arrT||'-'}</span></td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text2)">${dur}</td>

      </tr>`
    ).join('');
    const fb=document.getElementById('fav-btn-route');
    if(fb)fb.style.display='';
    el.innerHTML=`<div class="result-header"><div class="result-title">🔍 ${from} → ${to}${afterLabel}</div><span class="badge blue">${directs.length}편</span><span class="badge" style="background:var(--bg3)">${sortLabel}</span></div>
    <div class="table-wrap"><table><thead><tr><th>열차</th><th>등급</th><th>노선</th><th>방향</th><th>행선지</th><th>출발</th><th>도착</th><th>소요</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">※ 열차번호 클릭 시 전체 운행 정보 조회</p>`;
    return;
  }

  // ── 직통 없음 → 환승 탐색 ──
  // 1회 환승: from → 환승역(t1) → to(t2)
  // 2회 환승: from → 환승역1(t1) → 환승역2(t2) → to(t3)
  const MIN_WAIT=Math.max(1,parseInt(document.getElementById('xfer-min')?.value)||3);
  const MAX_WAIT=Math.min(120,parseInt(document.getElementById('xfer-max')?.value)||60);

  // from에서 탈 수 있는 열차 미리 수집
  function getLegs(depStn, minDepMin){
    const legs=[];
    ALL_TRAINS.forEach(t=>{
      if(!gradeMatch(t.grade,gradeF))return;
      const stops=t.stops;
      const fi=stops.findIndex(s=>s.s===depStn);
      if(fi===-1||isPassStop(t,depStn))return;
      const depT=getStopTime(stops[fi]);
      if(!depT)return;
      const depM=toMin(depT);
      if(minDepMin!==null&&depM<minDepMin)return;
      // 이 열차가 정차하는 이후 모든 역
      for(let i=fi+1;i<stops.length;i++){
        const s=stops[i];
        if(!s.arr&&!s.dep)continue;
        if(isPassStop(t,s.s))continue;
        const arrT=hasTime(s.arr)?s.arr:hasTime(s.dep)?s.dep:null;
        if(!arrT)continue;
        legs.push({t,depStn,depT,depM,arrStn:s.s,arrT,arrM:toMin(arrT)});
      }
    });
    return legs;
  }

  // 환승 결과 수집
  let transfers=[];

  // from 출발 레그
  const legs1=getLegs(from, afterMin);

  // 1회 환승
  legs1.forEach(l1=>{
    const xStn=l1.arrStn;
    if(xStn===to){return;}// 직통(이미 처리됨)
    // 환승역에서 to로 가는 열차
    ALL_TRAINS.forEach(t2=>{
      if(t2===l1.t)return;
      const stops=t2.stops;
      const xi=stops.findIndex(s=>s.s===xStn);
      const ti=stops.findIndex(s=>s.s===to);
      if(xi===-1||ti===-1||xi>=ti)return;
      if(isPassStop(t2,xStn)||isPassStop(t2,to))return;
      const dep2T=getStopTime(stops[xi]);
      if(!dep2T)return;
      const dep2M=toMin(dep2T);
      const wait=dep2M-l1.arrM;
      if(wait<MIN_WAIT||wait>MAX_WAIT)return;
      const arr2T=hasTime(stops[ti].arr)?stops[ti].arr:hasTime(stops[ti].dep)?stops[ti].dep:null;
      if(!arr2T)return;
      const totalM=durMin(l1.depT,arr2T)??0;
      if(totalM<=0)return;
      if(maxDur>0&&totalM>maxDur)return;
      transfers.push({
        legs:[
          {t:l1.t,from,to:xStn,depT:l1.depT,arrT:l1.arrT},
          {t:t2,from:xStn,to,depT:dep2T,arrT:arr2T}
        ],
        totalDur:durStr(l1.depT,arr2T),
        totalM,
        depM:l1.depM,
        arrM:arrKey(l1.depT,arr2T),
        sortT:l1.depM
      });
    });
  });

  // 중복 제거 (같은 열차 조합+출발시각)
  const seen=new Set();
  transfers=transfers.filter(r=>{
    const key=r.legs.map(l=>l.t.no+l.depT).join('|');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  // 총 소요시간 기준 정렬 후 5건만
  // 정렬 적용
  if(sortMode==='depart') transfers.sort((a,b)=>a.depM-b.depM);
  else if(sortMode==='arrive') transfers.sort((a,b)=>a.arrM-b.arrM);
  else transfers.sort((a,b)=>a.totalM-b.totalM);
  transfers=transfers.slice(0,5);

  if(!transfers.length){
    const afterLabel=afterMin!==null?` (${afterRaw} 이후)`:'';
    el.innerHTML=`<div class="empty"><div class="empty-icon">🚫</div><p><b>${from} → ${to}</b>${afterLabel} 운행 가능한 경로가 없습니다</p></div>`;
    return;
  }

  // 환승 결과 렌더링
  const afterLabel=afterMin!==null?` · ${afterRaw} 이후`:'';
  const cards=transfers.map(({legs,totalDur})=>{
    const legsHtml=legs.map((l,i)=>`
      <div class="xfer-leg">
        <div class="xfer-leg-head">
          ${trainChip(l.t.no,l.t.grade,`jumpToTrain('${l.t.no}')`)}
          ${gradeHtml(l.t.grade)}
          ${lineChipHtml(l.t.line)}
          <span style="color:var(--text2);font-size:12px">${dirLabel(l.t.dir)} · ${l.t.dest}행</span>
        </div>
        <div class="xfer-leg-route">
          <span class="xfer-stn">${l.from}</span>
          <span class="xfer-dep time-dep">${l.depT||'-'}</span>
          <span class="xfer-arrow">→</span>
          <span class="xfer-stn">${l.to}</span>
          <span class="xfer-arr time-arr">${l.arrT||'-'}</span>

        </div>
      </div>
      ${i<legs.length-1?`<div class="xfer-wait">🔄 환승 · 대기 ${toMin(legs[i+1].depT)-toMin(l.arrT)}분</div>`:''}
    `).join('');
    return `<div class="xfer-card">
      <div class="xfer-card-head">
        <span class="xfer-badge">1회 환승</span>
        <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">${legs[0].depT} → ${legs[legs.length-1].arrT||'?'} · ${totalDur}</span>
      </div>
      ${legsHtml}
    </div>`;
  }).join('');

  const fb2=document.getElementById('fav-btn-route');
  if(fb2)fb2.style.display='';
  el.innerHTML=`<div class="result-header">
    <div class="result-title">🔄 ${from} → ${to}${afterLabel} · 환승</div>
    <span class="badge" style="background:var(--bg3)">${sortLabel}</span>
    <span class="badge yellow">${transfers.length}건</span>
  </div>
  ${cards}
  <p class="hint">※ 열차번호 클릭 시 전체 운행 정보 조회 · 환승 대기 3~60분 · 최단 소요 5건</p>`;
}
function toggleStationFilter(){
  const row=document.getElementById('filter-row-station');
  const btn=document.getElementById('btn-filter-station');
  const open=row.classList.toggle('open');
  btn.classList.toggle('active', open);
  btn.textContent=open?'필터 ▴':'필터 ▾';
}

function togglePass(cardId){
  const card=document.getElementById(cardId);
  if(!card)return;
  const btn=card.querySelector('.btn-pass-toggle');
  const hiding=card.classList.toggle('hide-pass');
  btn.textContent=hiding?'통과역 보기':'통과역 숨기기';
}

// ── 알람 시스템 ──
const ALARM_KEY='nimbi_alarms';
function loadAlarms(){try{return JSON.parse(localStorage.getItem(ALARM_KEY))||[];}catch(e){return[];}}
function saveAlarms(a){localStorage.setItem(ALARM_KEY,JSON.stringify(a));}

// ── 알람 그룹 (출근/퇴근 세트) ──
const ALARM_GROUP_KEY='nimbi_alarm_groups';
function loadAlarmGroups(){try{return JSON.parse(localStorage.getItem(ALARM_GROUP_KEY))||[];}catch(e){return[];}}
function saveAlarmGroups(g){localStorage.setItem(ALARM_GROUP_KEY,JSON.stringify(g));}

// 현재 설정된 알람들을 그룹으로 저장 (열차+역+승하차 조합만 저장, 시각은 매번 재계산)
function saveCurrentAsGroup(){
  const alarms=loadAlarms();
  if(!alarms.length){alert('저장할 알람이 없습니다. 먼저 알람을 설정해주세요.');return;}
  const name=prompt('그룹 이름을 입력하세요 (예: 출근길, 퇴근길)');
  if(!name||!name.trim())return;

  // 열차번호+역명+승차/하차 단위로 묶기 (board-*, arr-* 계열을 각각 하나의 항목으로)
  const seen=new Set();
  const items=[];
  alarms.forEach(a=>{
    const kind=a.type.startsWith('board')?'board':'arr';
    const key=`${a.trainNo}:${a.stn}:${kind}`;
    if(seen.has(key))return;
    seen.add(key);
    items.push({trainNo:a.trainNo,stn:a.stn,kind});
  });

  const groups=loadAlarmGroups();
  groups.push({id:'grp_'+Date.now(),name:name.trim(),items,createdAt:Date.now()});
  saveAlarmGroups(groups);
  alert(`'${name.trim()}' 그룹으로 저장되었습니다. (${items.length}개 알람)`);
  renderAlarmIfOpen();
}

// 그룹에 저장된 항목들을 오늘 시각표 기준으로 다시 알람 설정
function applyAlarmGroup(groupId){
  const groups=loadAlarmGroups();
  const g=groups.find(x=>x.id===groupId);
  if(!g)return;

  let okCount=0, failCount=0;
  g.items.forEach(item=>{
    const t=ALL_TRAINS.find(x=>x.no===item.trainNo);
    if(!t){failCount++;return;}
    const si=t.stops.findIndex(s=>s.s===item.stn);
    if(si===-1){failCount++;return;}
    const stop=t.stops[si];
    const prevStop=si>0?t.stops.slice(0,si).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr)):null;
    const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;

    if(item.kind==='board'){
      const depTime=hasTime(stop.dep)?stop.dep:null;
      if(!depTime){failCount++;return;}
      // 이미 같은 알람 있으면 건너뜀
      if(hasAlarm(`board:${item.trainNo}:${item.stn}`)){okCount++;return;}
      toggleAlarmType('board',item.trainNo,item.stn,depTime,prevTime);
    } else {
      const arrTime=hasTime(stop.arr)?stop.arr:hasTime(stop.dep)?stop.dep:null;
      if(!arrTime){failCount++;return;}
      if(hasAlarm(`arr:${item.trainNo}:${item.stn}`)){okCount++;return;}
      toggleAlarmType('arr',item.trainNo,item.stn,arrTime,prevTime);
    }
    okCount++;
  });
  renderAlarmIfOpen();
  if(failCount>0) alert(`'${g.name}' 그룹 적용 완료 (${okCount}개 성공, ${failCount}개 실패 - 오늘 운행하지 않는 열차일 수 있습니다)`);
}

function deleteAlarmGroup(groupId){
  if(!confirm('이 그룹을 삭제하시겠습니까?'))return;
  const groups=loadAlarmGroups().filter(g=>g.id!==groupId);
  saveAlarmGroups(groups);
  renderAlarmIfOpen();
}
function hasAlarm(id){return loadAlarms().some(a=>a.id===id&&!a.fired);}

// 알람 팝업 열기
function openAlarmPopup(trainNo, stn, arrTime, depTime, prevTime){
  // 기존 팝업 제거
  const old=document.getElementById('alarm-popup-wrap');
  if(old)old.remove();

  const boardSet=hasAlarm(`board:${trainNo}:${stn}`);
  const arrSet=hasAlarm(`arr:${trainNo}:${stn}`);

  const hasDep=hasTime(depTime), hasArr=hasTime(arrTime), hasPrev=hasTime(prevTime);

  const wrap=document.createElement('div');
  wrap.id='alarm-popup-wrap';
  wrap.innerHTML=`
    <div class="alarm-popup-backdrop" onclick="closeAlarmPopup()"></div>
    <div class="alarm-popup">
      <div class="alarm-popup-title">🔔 ${trainNo}번 · ${stn}역</div>
      <div class="alarm-popup-sub">알람 종류를 선택하세요</div>
      <button class="alarm-popup-option${boardSet?' active':''}" id="ap-board" onclick="toggleAlarmType('board','${trainNo}','${stn}','${depTime}','${prevTime}')">
        <div class="alarm-popup-option-text">
          <span class="alarm-popup-option-label">🚉 승차 알람</span>
          <span class="alarm-popup-option-desc">전역 출발 · 5분 전 · 출발 시각 (3회)</span>
        </div>
        <span class="alarm-popup-option-icon">${boardSet?'✅':'○'}</span>
      </button>
      <button class="alarm-popup-option${arrSet?' active':''}" id="ap-arr" onclick="toggleAlarmType('arr','${trainNo}','${stn}','${arrTime}','${prevTime}')">
        <div class="alarm-popup-option-text">
          <span class="alarm-popup-option-label">🛬 하차 알람</span>
          <span class="alarm-popup-option-desc">전역 출발 · 5분 전 · 도착 시각 (3회)</span>
        </div>
        <span class="alarm-popup-option-icon">${arrSet?'✅':'○'}</span>
      </button>
      <button class="alarm-popup-close" onclick="closeAlarmPopup()">닫기</button>
    </div>`;
  document.body.appendChild(wrap);
}

function closeAlarmPopup(){
  const el=document.getElementById('alarm-popup-wrap');
  if(el)el.remove();
}

function toggleAlarmType(type, trainNo, stn, baseTime, prevTime, silent){
  requestNotifPermission(()=>{
    if(type==='board'){
      // 승차: 전역 출발 + 5분 전 + 역 도착(승차 시각) - 3단계
      const idArr=`board-prev:${trainNo}:${stn}`;
      const id5=`board:${trainNo}:${stn}`;
      const idNow=`board-now:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id5);
      if(already){
        // 취소
        const filtered=alarms.filter(a=>a.id!==id5&&a.id!==idArr&&a.id!==idNow);
        saveAlarms(filtered);
        if(!silent)alert(`승차 알람이 취소되었습니다.`);
      } else {
        const depM=toMin(baseTime);
        if(depM===null){alert('출발 시각이 없어 승차 알람을 설정할 수 없습니다.');return;}
        // 1) 전역 출발 알람
        const prevM=toMin(prevTime);
        if(prevM!==null){
          const hp=Math.floor(prevM/60),mp=prevM%60;
          alarms.push({id:idArr,trainNo,stn,type:'board-prev',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 승차 (전역출발)`,fired:false});
        }
        // 2) 5분 전 알람
        const m5=depM-5<0?depM-5+1440:depM-5;
        const h5=Math.floor(m5/60),mm5=m5%60;
        alarms.push({id:id5,trainNo,stn,type:'board-5',alarmM:m5,timeStr:`${h5}:${mm5.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 승차 (5분 전)`,fired:false});
        // 3) 역 도착(승차 시각) 알람
        const hd=Math.floor(depM/60),md=depM%60;
        alarms.push({id:idNow,trainNo,stn,type:'board-now',alarmM:depM,timeStr:`${hd}:${md.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 승차 (출발)`,fired:false});
        saveAlarms(alarms);
        if(!silent)alert(`승차 알람이 설정되었습니다.`);
      }
    } else {
      // 하차: 전역 출발 + 5분 전(도착 예정) + 역 도착 - 3단계
      const idPrev=`arr-prev:${trainNo}:${stn}`;
      const id5=`arr:${trainNo}:${stn}`;
      const idNow=`arr-now:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id5);
      if(already){
        saveAlarms(alarms.filter(a=>a.id!==id5&&a.id!==idPrev&&a.id!==idNow));
        if(!silent)alert(`하차 알람이 취소되었습니다.`);
      } else {
        const arrM=toMin(baseTime);
        if(arrM===null){alert('도착 시각이 없어 하차 알람을 설정할 수 없습니다.');return;}
        // 1) 전역 출발 알람
        const prevM=toMin(prevTime);
        if(prevM!==null){
          const hp=Math.floor(prevM/60),mp=prevM%60;
          alarms.push({id:idPrev,trainNo,stn,type:'arr-prev',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 하차 (전역출발)`,fired:false});
        }
        // 2) 5분 전 알람
        const m5=arrM-5<0?arrM-5+1440:arrM-5;
        const h5=Math.floor(m5/60),mm5=m5%60;
        alarms.push({id:id5,trainNo,stn,type:'arr-5',alarmM:m5,timeStr:`${h5}:${mm5.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 하차 (5분 전)`,fired:false});
        // 3) 역 도착 알람
        const ha=Math.floor(arrM/60),ma=arrM%60;
        alarms.push({id:idNow,trainNo,stn,type:'arr-now',alarmM:arrM,timeStr:`${ha}:${ma.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 하차 (도착)`,fired:false});
        saveAlarms(alarms);
        if(!silent)alert(`하차 알람이 설정되었습니다.`);
      }
    }
    if(!silent)closeAlarmPopup();
    renderAlarmIfOpen();
    // 열차 상세 새로고침
    const card=document.getElementById('dc-'+trainNo);
    if(card){const trains=ALL_TRAINS.filter(t=>t.no===trainNo);const el=document.getElementById('result-train');if(el&&trains.length)el.innerHTML=trains.map(renderDetail).join('');}
  });
}

function requestNotifPermission(cb){
  if(!('Notification' in window)){alert('이 브라우저는 알림을 지원하지 않습니다.');return;}
  if(Notification.permission==='granted'){cb();return;}
  if(Notification.permission==='denied'){alert('알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');return;}
  Notification.requestPermission().then(p=>{if(p==='granted')cb();else alert('알림 권한이 거부되었습니다.');});
}

function renderAlarmIfOpen(){
  const panel=document.getElementById('panel-alarm');
  if(panel&&panel.classList.contains('active'))renderAlarms();
}

function deleteAlarm(id){
  const alarms=loadAlarms();
  const target=alarms.find(a=>a.id===id);
  if(!target){renderAlarms();return;}
  // 같은 열차+역+승차/하차 묶음을 한 번에 삭제 (전역출발/5분전/도착 3개 모두)
  const kind=target.type.startsWith('board')?'board':'arr';
  const filtered=alarms.filter(a=>{
    const aKind=a.type.startsWith('board')?'board':'arr';
    const sameGroup=a.trainNo===target.trainNo&&a.stn===target.stn&&aKind===kind;
    return !sameGroup;
  });
  saveAlarms(filtered);
  renderAlarms();
}
function clearFiredAlarms(){
  saveAlarms(loadAlarms().filter(a=>!a.fired));
  renderAlarms();
}

function renderAlarms(){
  const el=document.getElementById('result-alarm');
  if(!el)return;
  const alarms=loadAlarms();
  if(!alarms.length){
    el.innerHTML=`<div class="alarm-empty"><div style="font-size:36px;margin-bottom:12px">🔔</div><p>설정된 알람이 없습니다.<br>열차 상세에서 🔔 버튼으로 추가하세요.</p><p class="hint" style="margin-top:16px"><button class="btn" style="font-size:12px;padding:6px 14px" onclick="testAlarm()">🧪 알람 테스트</button></p></div>
    ${renderAlarmGroupsSection()}`;
    return;
  }
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  // 목록에는 대표 알람(승차=board-now, 하차=arr-now)만 표시.
  // 나머지(전역출발/5분전)는 발송은 그대로 되지만 목록엔 안 보임.
  const visible=alarms.filter(a=>a.type==='board-now'||a.type==='arr-now');
  const sorted=[...visible].sort((a,b)=>a.alarmM-b.alarmM);
  const hasFired=alarms.some(a=>a.fired);
  const typeLabel={'board-now':'승차','arr-now':'하차'};
  const typeBadgeClass={'board-now':'alarm-type-board','arr-now':'alarm-type-arr'};
  const cards=sorted.map(a=>{
    const diff=a.alarmM-nowMin;
    let subText,subClass='';
    if(a.fired){subText='✅ 알람 완료';subClass='done';}
    else if(diff<=0){subText='곧 도착 예정';subClass='';}
    else if(diff<60){subText=`${diff}분 후 도착 예정`;}
    else{const h=Math.floor(diff/60),m=diff%60;subText=`${h}시간 ${m>0?m+'분 ':''}후 도착 예정`;}
    return `<div class="alarm-card${a.fired?' fired':''}">
      <div class="alarm-card-info">
        <div class="alarm-card-title"><span class="alarm-type-badge ${typeBadgeClass[a.type]||'alarm-type-board'}">${typeLabel[a.type]||'알람'}</span>${a.label}</div>
        <div class="alarm-card-sub ${subClass}">${subText}</div>
      </div>
      <div class="alarm-card-time">${a.timeStr}</div>
      <button class="alarm-del-btn" onclick="deleteAlarm('${a.id}')">✕</button>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="result-header">
    <div class="result-title">🔔 알람 목록</div>
    <span class="badge blue">${visible.filter(a=>!a.fired).length}개 대기</span>
    ${hasFired?'<button class="btn" style="font-size:12px;padding:4px 10px" onclick="clearFiredAlarms()">완료 지우기</button>':''}
  </div>
  ${renderAlarmGroupsSection()}
  ${cards}<p class="hint">※ 브라우저 탭이 열려있어야 알람이 작동합니다 (출발/도착 전 총 3회 알림이 발송됩니다)</p>`;
}

// 알람 그룹 섹션 렌더링
function renderAlarmGroupsSection(){
  const groups=loadAlarmGroups();
  const alarms=loadAlarms();
  const saveBtn=`<button class="btn" style="font-size:12px;padding:5px 12px" onclick="saveCurrentAsGroup()" ${!alarms.length?'disabled':''}>💾 현재 알람을 그룹으로 저장</button>`;

  if(!groups.length){
    return `<div class="alarm-group-section">
      <div class="alarm-group-title">⏰ 알람 그룹</div>
      <p class="hint" style="margin:4px 0 8px">자주 쓰는 알람 조합을 그룹으로 저장하면 한 번에 다시 설정할 수 있습니다.</p>
      ${saveBtn}
    </div>`;
  }

  const groupCards=groups.map(g=>`
    <div class="alarm-group-card">
      <div class="alarm-group-card-info">
        <div class="alarm-group-card-name">${g.name}</div>
        <div class="alarm-group-card-desc">${g.items.length}개 알람 (열차 ${[...new Set(g.items.map(i=>i.trainNo))].join(', ')})</div>
      </div>
      <button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="applyAlarmGroup('${g.id}')">▶ 적용</button>
      <button class="alarm-del-btn" onclick="deleteAlarmGroup('${g.id}')">✕</button>
    </div>`).join('');

  return `<div class="alarm-group-section">
    <div class="alarm-group-title">⏰ 알람 그룹</div>
    ${groupCards}
    ${saveBtn}
  </div>`;
}

function sendNotification(title, body){
  if(Notification.permission!=='granted') return;
  // SW ready 방식 (가장 신뢰성 높음 - 백그라운드 포함)
  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(title,{
        body,
        icon:'/NIMBYRAILTABLE/icon-192.png',
        badge:'/NIMBYRAILTABLE/icon-192.png',
        vibrate:[200,100,200],
        requireInteraction:false,
        tag:'nimbirail-alarm-'+Date.now(),
      });
    }).catch(()=>{
      // SW 실패 시 기본 Notification 폴백
      new Notification(title,{body,icon:'/NIMBYRAILTABLE/icon-192.png'});
    });
  } else {
    new Notification(title,{body,icon:'/NIMBYRAILTABLE/icon-192.png'});
  }
}

// ══════════════════════════════════════════
// 🚆 탑승 중 승차권 - 진행 상태 지속 알림 (상단바 위젯)
// ══════════════════════════════════════════
// 같은 tag를 계속 재사용 → 새 알림이 쌓이지 않고 같은 자리에서 내용만 갱신됨
const TRIP_NOTIF_TAG='nimbirail-trip-progress';
let _tripNotifInterval=null;

// 오늘 탑승하면서 "현재 운행 중"이거나 "출발 10분 전"인 승차권 찾기
function getActiveTripTicket(){
  const tickets=loadTickets();
  if(!tickets.length)return null;
  const today=todayLocalStr();
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();

  // 어제 날짜 계산 (익일 도착 열차 체크용)
  const yesterdayD=new Date(now); yesterdayD.setDate(yesterdayD.getDate()-1);
  const yesterday=todayLocalStr(yesterdayD);

  for(const tk of tickets){
    if(tk.status!=='active')continue;
    const depM=toMin(tk.depTime);
    const arrM=toMin(tk.arrTime);
    if(depM===null||arrM===null)continue;
    // 자정 넘는 열차: dep > arr
    const isOvernight = depM>arrM;
    // 오늘 출발이거나, 어제 출발한 익일 도착 열차(현재 새벽에 운행 중)
    const isToday = tk.travelDate===today;
    const isYesterdayOvernight = isOvernight && tk.travelDate===yesterday;
    if(!isToday && !isYesterdayOvernight) continue;

    const t=ALL_TRAINS.find(x=>x.no===tk.trainNo);
    if(!t)continue;

    // 출발 10분 전 (오늘 출발 열차만): 위젯에 "승차 준비" 상태로 표시
    if(isToday){
      const minsUntilDep = depM - nowM;
      if(minsUntilDep > 0 && minsUntilDep <= 10){
        return {ticket:tk, train:t, status:null, preBoard:true, minsUntilDep};
      }
    }

    // 운행 중: 현재 상태 확인
    const status=getCurrentStatus(t);
    if(!status||status.status!=='running')continue;
    // 승차역을 이미 지났고 하차역에 아직 도착 안 했는지 확인
    const fi=t.stops.findIndex(s=>s.s===tk.fromStn);
    const ti=t.stops.findIndex(s=>s.s===tk.toStn);
    if(fi===-1||ti===-1)continue;
    // 날짜 기준으로 탑승 구간 판정.
    // 자정 넘는 열차는 '오늘 출발분(저녁, 자정 전)'과 '어제 출발분(새벽, 자정 후)'을
    // 각각 해당 날짜에만 유효하도록 분리한다.
    // (예: 어제 19:40 출발·오늘 0:52 도착 승차권이 오늘 저녁에 다시 뜨는 버그 방지)
    let inRange;
    if(depM<=arrM){
      inRange = isToday && nowM>=depM-2 && nowM<=arrM+2;   // 당일 운행
    } else if(isToday){
      inRange = nowM>=depM-2;                              // 오늘 저녁 출발분 (자정 전)
    } else {
      inRange = nowM<=arrM+2;                              // 어제 출발·오늘 새벽 도착분 (자정 후)
    }
    if(!inRange)continue;

    // 도착 5분 전: 위젯에 "도착 준비" 상태로 표시
    const effectiveArrM = isOvernight && nowM < depM ? arrM + 1440 : arrM;
    const effectiveNowM = isOvernight && nowM < depM ? nowM + 1440 : nowM;
    const minsUntilArr = effectiveArrM - effectiveNowM;
    if(minsUntilArr > 0 && minsUntilArr <= 5){
      return {ticket:tk, train:t, status, preBoard:false, minsUntilDep:0, preArr:true, minsUntilArr};
    }

    return {ticket:tk, train:t, status, preBoard:false, minsUntilDep:0, preArr:false};
  }
  return null;
}

// 진행 상태 알림 내용 구성 및 발송 (같은 tag로 갱신)
// 현재 위치 기준 이전역/현재(정차·통과)/다음역 3개를 시간순으로 추출
// (통과역도 포함, 시간 흐름에 따라 매번 새로 계산됨)
function getTripTimeline3(train, status, ticket){
  // 시각 있는 역 전체 (통과 포함)
  const allStops = train.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(!allStops.length) return null;

  const timeOf = s => !s ? null : (hasTime(s.dep)?s.dep:(hasTime(s.arr)?s.arr:null));
  const toEntry = s => s ? {name:s.s, time:timeOf(s)} : null;

  // 정차역 = dep 있는 역 + 종착역(마지막 역)
  const terminus = allStops[allStops.length-1].s;
  const isStopStn = s => hasTime(s.dep) || s.s === terminus;

  // 탑승 구간(fromStn~toStn) 내 정차역만 사용
  // ticket이 있으면 탑승 구간으로 제한
  let stopsOnly;
  if(ticket && ticket.fromStn && ticket.toStn){
    const fi = allStops.findIndex(s=>s.s===ticket.fromStn);
    const ti = allStops.findIndex(s=>s.s===ticket.toStn);
    if(fi>=0 && ti>fi){
      // fromStn~toStn 구간의 정차역만
      stopsOnly = allStops.slice(fi, ti+1).filter(s=>isStopStn(s));
      // fromStn, toStn이 정차역 목록에 없으면 강제 추가
      if(!stopsOnly.find(s=>s.s===ticket.fromStn)) stopsOnly.unshift(allStops[fi]);
      if(!stopsOnly.find(s=>s.s===ticket.toStn)) stopsOnly.push(allStops[ti]);
    } else {
      stopsOnly = allStops.filter(s=>isStopStn(s));
    }
  } else {
    stopsOnly = allStops.filter(s=>isStopStn(s));
  }
  if(!stopsOnly.length) return null;

  // ── 시간 기준 위치 계산 (통과역/status 의존성 제거, 항상 전/이번/다음 3역 확보) ──
  // 각 정차역의 "출발(=떠나는) 시각" = dep 있으면 dep, 없으면 arr. 자정 보정 누적.
  const normalized = [];
  let offset = 0, prevRaw = -1;
  for(const s of stopsOnly){
    const raw = toMin(timeOf(s));
    if(raw === null){ normalized.push({s, norm:null}); continue; }
    if(prevRaw >= 0 && raw < prevRaw - 60) offset += 1440;
    normalized.push({s, norm: raw + offset});
    prevRaw = raw;
  }

  // 현재 시각 (자정 넘는 운행 보정)
  const nowD = new Date();
  let nowM = nowD.getHours()*60 + nowD.getMinutes();
  const firstNorm = normalized.find(n=>n.norm!==null)?.norm ?? 0;
  const lastNorm  = [...normalized].reverse().find(n=>n.norm!==null)?.norm ?? 0;
  if(lastNorm > 1440 && nowM < firstNorm) nowM += 1440;

  // 이번역(cur) = 아직 떠나지 않은 첫 정차역 (도착 중이거나 정차 중)
  let ci = normalized.findIndex(n => n.norm !== null && n.norm > nowM);
  if(ci < 0) ci = stopsOnly.length - 1; // 전부 지났으면 종착역

  const prevStop = ci > 0 ? stopsOnly[ci-1] : null;
  const curStop  = stopsOnly[ci];
  const nextStop = ci+1 < stopsOnly.length ? stopsOnly[ci+1] : null;

  return {
    prev: toEntry(prevStop),
    cur:  curStop ? {name:curStop.s, time:timeOf(curStop), isPass:false} : null,
    next: toEntry(nextStop),
  };
}

// 이번 역 이후 남은 정차역 이름 목록 (다음역 ~ 하차역). LED 안내용.
function getRemainingStops(train, ticket){
  const allStops = train.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(!allStops.length) return [];
  const terminus = allStops[allStops.length-1].s;
  const isStopStn = s => hasTime(s.dep) || s.s === terminus;
  let stopsOnly;
  if(ticket && ticket.fromStn && ticket.toStn){
    const fi = allStops.findIndex(s=>s.s===ticket.fromStn);
    const ti = allStops.findIndex(s=>s.s===ticket.toStn);
    if(fi>=0 && ti>fi){
      stopsOnly = allStops.slice(fi, ti+1).filter(isStopStn);
      if(!stopsOnly.find(s=>s.s===ticket.fromStn)) stopsOnly.unshift(allStops[fi]);
      if(!stopsOnly.find(s=>s.s===ticket.toStn)) stopsOnly.push(allStops[ti]);
    } else stopsOnly = allStops.filter(isStopStn);
  } else stopsOnly = allStops.filter(isStopStn);
  if(!stopsOnly.length) return [];
  const timeOf = s => hasTime(s.dep)?s.dep:(hasTime(s.arr)?s.arr:null);
  const norm=[]; let off=0, prev=-1;
  for(const s of stopsOnly){ const raw=toMin(timeOf(s)); if(raw==null){norm.push(null);continue;} if(prev>=0&&raw<prev-60)off+=1440; norm.push(raw+off); prev=raw; }
  const nowD=new Date(); let nowM=nowD.getHours()*60+nowD.getMinutes();
  const firstN=norm.find(n=>n!=null)??0, lastN=[...norm].reverse().find(n=>n!=null)??0;
  if(lastN>1440 && nowM<firstN) nowM+=1440;
  let ci=norm.findIndex(n=>n!=null && n>nowM); if(ci<0) ci=stopsOnly.length-1;
  // 이번역(접근/정차 중) 포함하여 남은 정차역 전체
  return stopsOnly.slice(ci).map(s=>s.s);
}

// LED 표시 on/off (탑승 카드 LED 토글)
function ledEnabled(){ return localStorage.getItem('nimbi_led_on')!=='0'; }
function toggleTripLED(ev){
  if(ev) ev.stopPropagation();
  localStorage.setItem('nimbi_led_on', ledEnabled()?'0':'1');
  if(typeof renderTickets==='function') renderTickets();
  if(typeof updateHomeTripWidget==='function') updateHomeTripWidget();
}

// 탑승 카드 LED 표시 순환 프레임: 안내문구 → 이번역 → 다음역 → 행선지 → 남은 정차역(너비 맞춤 슬라이딩)
// dur: 프레임 유지 시간(ms). 남은 정차역(하나씩 쌓기/전진)은 더 빠르게.
function getTripLEDFrames(active, ledWidth){
  if(!active) return [];
  const {ticket,train,status,preBoard,minsUntilDep,preArr}=active;
  const D_HEAD=3000, D_STOP=1600;
  if(preBoard){
    return [
      {tag:'출발역', text:`${ticket.fromStn}`, dur:D_HEAD},
      {tag:'행선지', text:`${train.dest}행`, dur:D_HEAD},
      {tag:'곧 출발', text:`${fmtEta(minsUntilDep)} 출발`, dur:D_HEAD},
    ];
  }
  if(preArr){
    return [
      {tag:'안내', text:`잠시 후 ${ticket.toStn}역에 도착합니다`, dur:D_HEAD},
      {tag:'곧 도착', text:`${ticket.toStn} · 내리는 문 확인`, dur:D_HEAD},
    ];
  }
  const D_ANN=5000;
  const tl=getTripTimeline3(train,status,ticket);
  const cur = tl&&tl.cur ? tl.cur.name : (status&&status.atStn?status.atStn:null);
  // 안내 문구 판별 (정차 중 / 접근 중 5분 전)
  let announce=null;
  if(status&&status.atStn){
    announce={tag:'안내', text:`${status.atStn}역에 정차 중입니다`, dur:D_ANN};
  } else if(tl&&tl.cur&&tl.cur.time){
    const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
    const mm=toMin(tl.cur.time); const d=mm!=null?((mm-nowM+1440)%1440):null;
    if(d!=null && d<=5) announce={tag:'안내', text:`잠시 후 ${tl.cur.name}역에 도착합니다`, dur:D_ANN};
  }
  // 남은 정차역 프레임 (너비 맞춤 슬라이딩)
  const rem=getRemainingStops(train,ticket);
  const remFrames = rem.length ? computeStopWindows(rem, ledWidth).map(w=>({tag:'남은 정차역', text:w, dur:D_STOP})) : [];

  const frames=[];
  if(announce){
    // 안내 표출 시: 안내(5초) → 남은 정차역 → 안내 순으로만
    frames.push(announce);
    remFrames.forEach(f=>frames.push(f));
  } else {
    // 평상시: 이번역 → 다음역 → 행선지 → 남은 정차역
    if(cur) frames.push({tag:'이번 역', text: cur + (cur===ticket.toStn?' · 내리는 문 확인':''), dur:D_HEAD});
    if(tl&&tl.next) frames.push({tag:'다음 역', text: tl.next.name, dur:D_HEAD});
    frames.push({tag:'행선지', text:`${train.dest}행`, dur:D_HEAD});
    remFrames.forEach(f=>frames.push(f));
  }
  if(!frames.length) frames.push({tag:'이번 역', text:'-', dur:D_HEAD});
  return frames;
}

// 남은 정차역: 화면 너비에 맞춰 앞에서부터 채우고, 넘치면 맨 앞 역을 지우며 한 칸씩 전진
// 예: 천안 서청주 대전 옥천 → 서청주 대전 옥천 영동 → 대전 옥천 영동 김천 …
const LED_SEP=' · ';
let _ledCanvas=null;
function measureLedText(str){
  try{
    if(!_ledCanvas) _ledCanvas=document.createElement('canvas');
    const ctx=_ledCanvas.getContext('2d');
    ctx.font="800 15px ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace";
    return ctx.measureText(str).width + str.length*1; // letter-spacing ~1px 보정
  }catch(e){ return str.length*11; }
}
function computeStopWindows(stops, maxWidth){
  const out=[]; const n=stops.length;
  if(!n) return out;
  if(!maxWidth || maxWidth<20) maxWidth=240;
  const fits=(s,e)=>measureLedText(stops.slice(s,e+1).join(LED_SEP))<=maxWidth;
  const fitEnd=(s)=>{ let e=s; while(e+1<n && fits(s,e+1)) e++; return e; };
  // ① 앞에서부터 한 역씩 쌓기 (천안 → 천안 서청주 → …)
  out.push(stops[0]);
  let e0=0;
  while(e0+1<n && fits(0,e0+1)){ e0++; out.push(stops.slice(0,e0+1).join(LED_SEP)); }
  // ② 앞 역을 하나씩 지우며 전진, 끝에서는 종착역만 남을 때까지 축소
  for(let s=1;s<n;s++){ out.push(stops.slice(s,fitEnd(s)+1).join(LED_SEP)); }
  return out;
}

// LED 순환 갱신 (프레임별 가변 간격, 화면에 떠있는 탑승 카드 LED를 직접 업데이트)
let _ledFrameIdx=0, _ledTimer=null;
// 남은 정차역 창을 실제 LED "가용 폭"에 맞추기 위한 폭 측정 (상세=trip-led-scr, 간략=컨테이너-태그)
function measureLedWidth(){
  const scr=document.querySelector('.trip-led-scr');
  if(scr && scr.clientWidth>10) return scr.clientWidth;
  const mini=document.querySelector('.trip-mini-led');
  if(mini){
    const tag=mini.querySelector('.trip-mini-led-tag');
    const w=mini.clientWidth - (tag?tag.offsetWidth:44) - 16;
    if(w>40) return w;
  }
  return 240;
}
function updateTripLED(){
  const active = getActiveTripTicket();
  const frames = active ? getTripLEDFrames(active, measureLedWidth()) : [];
  if(!frames.length) return 3000;
  const f = frames[_ledFrameIdx % frames.length];
  document.querySelectorAll('.trip-led').forEach(led=>{
    const tag=led.querySelector('.trip-led-tag'), txt=led.querySelector('.trip-led-txt');
    if(tag) tag.textContent=f.tag;
    if(txt) txt.textContent=f.text;
  });
  document.querySelectorAll('.trip-mini-led').forEach(led=>{
    const tag=led.querySelector('.trip-mini-led-tag'), txt=led.querySelector('.trip-mini-led-txt');
    if(tag) tag.textContent=f.tag;
    if(txt) txt.textContent=f.text;
  });
  return f.dur||3000;
}
function _ledTick(){ _ledFrameIdx++; const d=updateTripLED(); _ledTimer=setTimeout(_ledTick, d); }
_ledTimer=setTimeout(_ledTick, 3000);

function updateTripProgressNotif(){
  if(Notification.permission!=='granted')return;
  const active=getActiveTripTicket();
  if(!active){
    clearTripProgressNotif();
    return;
  }
  const {ticket,train,status}=active;

  const tl = getTripTimeline3(train, status);
  let title, body;

  if(tl){
    // 타임라인: 전역 → 현재(정차/통과) → 다음역
    const parts=[];
    if(tl.prev) parts.push(`${tl.prev.name} ${tl.prev.time}`);
    if(tl.cur)  parts.push(`${tl.cur.name}${tl.cur.isPass?'(통과)':''} ${tl.cur.time}`);
    else        parts.push('이동 중');
    if(tl.next) parts.push(`${tl.next.name} ${tl.next.time}`);
    body = parts.join('  →  ');

    if(status.atStn) title=`🚆 ${train.no} · ${status.atStn}역 정차 중`;
    else if(status.passStn) title=`🚆 ${train.no} · ${status.passStn}역 통과 중`;
    else title=`🚆 ${train.no} · ${ticket.fromStn}→${ticket.toStn} 이동 중`;
  } else {
    title=`🚆 ${train.no} ${GL[train.grade]||train.grade} 탑승 중`;
    body=`${ticket.fromStn} → ${ticket.toStn} 운행 중`;
  }

  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(title,{
        body,
        icon:'/NIMBYRAILTABLE/icon-192.png',
        badge:'/NIMBYRAILTABLE/icon-192.png',
        tag:TRIP_NOTIF_TAG,       // 고정 tag → 새 알림 안 쌓이고 갱신만 됨
        renotify:false,            // 갱신 시 재진동/재알림음 없음
        silent:true,
        requireInteraction:true,   // 사용자가 직접 닫기 전까지 유지
        vibrate:[],
      });
    }).catch(()=>{});
  }
}

function clearTripProgressNotif(){
  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{
      reg.getNotifications({tag:TRIP_NOTIF_TAG}).then(list=>{
        list.forEach(n=>n.close());
      });
    }).catch(()=>{});
  }
}

// 탭이 열려있는 동안 1분마다 진행 상태 갱신 (SW가 살아있는 한 백그라운드에서도 유지됨)
function startTripProgressTracking(){
  if(_tripNotifInterval)return;
  updateTripProgressNotif();
  _tripNotifInterval=setInterval(updateTripProgressNotif,60000);
}
// 알림 대신 승차권 탭 내 위젯(trip-widget)으로 표시하므로 자동 알림 발송은 비활성화.
// window.addEventListener('load',()=>{
//   setTimeout(startTripProgressTracking,1000);
// });
// 기존에 떠 있던 진행 알림이 있다면 정리
window.addEventListener('load',()=>{
  setTimeout(()=>{ if(typeof clearTripProgressNotif==='function') clearTripProgressNotif(); },1000);
});

function checkAlarms(){
  const alarms=loadAlarms();
  if(!alarms.length)return;
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  let changed=false;
  alarms.forEach(a=>{
    if(a.fired)return;
    // 알람 시각이 됐거나 지났으면 울림 (놓침 방지: alarmM <= nowM)
    // 단 너무 오래 지난 것(10분 초과)은 조용히 fired 처리
    const diff=nowM-a.alarmM;
    if(diff>=0&&diff<=10){
      a.fired=true;changed=true;
      if(diff<=2){
        // 2분 이내는 실제 알림 발송
        const body={
          'board-prev':`${a.trainNo}번 열차가 곧 ${a.stn}역에 도착합니다 (승차 준비)`,
          'board-5':`${a.trainNo}번 열차가 ${a.stn}역에서 5분 후 출발합니다`,
          'board-now':`${a.trainNo}번 열차가 ${a.stn}역에서 곧 출발합니다`,
          'arr-prev':`${a.trainNo}번 열차가 전역을 출발했습니다 (하차 준비)`,
          'arr-5':`${a.trainNo}번 열차가 ${a.stn}역에 5분 후 도착합니다`,
          'arr-now':`${a.trainNo}번 열차가 곧 ${a.stn}역에 도착합니다`,
        }[a.type]||a.label;
        if(Notification.permission==='granted'){
          // SW를 통해 알림 발송 (백그라운드에서도 작동)
          sendNotification('🔔 님비레일 알람', body);
        }
      }
    }
  });
  if(changed){saveAlarms(alarms);renderAlarmIfOpen();}
}
// 10초마다 체크 (30초는 너무 길어 알람을 놓칠 수 있음)
setInterval(checkAlarms,10000);
// 즐겨찾기 자동 갱신 (30초마다)
setInterval(()=>{
  const panel=document.getElementById('panel-fav');
  if(panel&&panel.classList.contains('active')) renderFavs();
},30000);
// 페이지 로드 시 즉시 1회 체크
setTimeout(checkAlarms,1000);

// ── 여석 알림 ──
const SEAT_WATCH_KEY='nimbi_seat_watches';
function loadSeatWatches(){try{return JSON.parse(localStorage.getItem(SEAT_WATCH_KEY))||[];}catch(e){return[];}}
function saveSeatWatches(w){localStorage.setItem(SEAT_WATCH_KEY,JSON.stringify(w));}

function openSeatWatchPopup(trainNo, fromStn, toStn){
  const existing=loadSeatWatches().filter(w=>w.trainNo===trainNo&&w.active);
  const existingLabel=existing.length?existing.map(w=>w.seatClassLabel).join(', '):'';
  const wrap=document.createElement('div');
  wrap.id='seat-watch-wrap';
  wrap.innerHTML=`
    <div class="alarm-popup-backdrop" onclick="closeSeatWatchPopup()"></div>
    <div class="alarm-popup">
      <div class="alarm-popup-title">🔔 여석 알림 설정</div>
      <div class="alarm-popup-sub" style="margin-bottom:12px"><b>${trainNo}</b> · ${fromStn} → ${toStn}</div>
      ${existingLabel?`<div style="font-size:12px;color:var(--accent);margin-bottom:10px">현재 설정: ${existingLabel}</div>`:''}
      <div class="alarm-popup-sub" style="margin-bottom:8px">알림 받을 좌석 등급</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-general" value="general"> <span>일반실</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-special" value="special"> <span>특실</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-standing" value="standing"> <span>입석/자유석</span>
        </label>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">여석이 생기면 브라우저 알림으로 알려드립니다. (시뮬레이션 기준)</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="confirmSeatWatch('${trainNo}','${fromStn}','${toStn}')">알림 설정</button>
        <button class="btn alarm-popup-close" onclick="closeSeatWatchPopup()">취소</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function closeSeatWatchPopup(){
  document.getElementById('seat-watch-wrap')?.remove();
}

function confirmSeatWatch(trainNo, fromStn, toStn){
  const classes=[
    {id:'sw-general',key:'general',label:'일반실'},
    {id:'sw-special',key:'special',label:'특실'},
    {id:'sw-standing',key:'standing',label:'입석/자유석'}
  ].filter(c=>document.getElementById(c.id)?.checked);
  if(!classes.length){alert('알림 받을 좌석 등급을 1개 이상 선택해주세요.');return;}

  requestNotifPermission(()=>{
    const watches=loadSeatWatches().filter(w=>!(w.trainNo===trainNo));
    classes.forEach(c=>{
      watches.push({id:`sw_${trainNo}_${c.key}_${Date.now()}`,trainNo,fromStn,toStn,
        seatClass:c.key,seatClassLabel:c.label,active:true,createdAt:Date.now()});
    });
    saveSeatWatches(watches);
    closeSeatWatchPopup();
    alert(`✅ ${trainNo}번 열차 ${classes.map(c=>c.label).join('/')} 여석 알림이 설정되었습니다.`);
  });
}

function removeSeatWatch(id){
  saveSeatWatches(loadSeatWatches().filter(w=>w.id!==id));
}

function checkSeatWatches(){
  const watches=loadSeatWatches().filter(w=>w.active);
  if(!watches.length)return;
  if(Notification.permission!=='granted')return;
  watches.forEach(w=>{
    // 10% 확률로 여석 발생 시뮬레이션 (실제 API 없음)
    if(Math.random()<0.1){
      sendNotification('🔔 여석 알림', `${w.trainNo}번 열차 ${w.seatClassLabel}에 좌석이 생겼어요!`);
      // 알림 발송 후 해제
      const watches2=loadSeatWatches();
      const idx=watches2.findIndex(x=>x.id===w.id);
      if(idx>=0){watches2[idx].active=false;saveSeatWatches(watches2);}
    }
  });
}
// 5분마다 여석 체크
setInterval(checkSeatWatches, 5*60*1000);

// ── 즐겨찾기 ──
const FAV_KEY='nimbi_favs';
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY))||[];}catch(e){return[];}}
function saveFavs(favs){localStorage.setItem(FAV_KEY,JSON.stringify(favs));}

// 즐겨찾기 그룹 시스템 (사용자 정의 그룹 지원)
const FAV_GROUPS_KEY='nimbi_fav_groups';
const FAV_GROUPS_DEFAULT=[
  {id:'commute',label:'출퇴근',icon:'💼',color:'#388bfd'},
  {id:'travel', label:'여행',  icon:'✈️', color:'#3fb950'},
  {id:'etc',    label:'기타',  icon:'📌', color:'#8b949e'},
];
const FAV_GROUPS_BUILT_IN=['commute','travel','etc'];
function loadFavGroups(){
  try{
    const g=JSON.parse(localStorage.getItem(FAV_GROUPS_KEY));
    if(Array.isArray(g)&&g.length) return g;
  }catch(e){}
  return FAV_GROUPS_DEFAULT.map(g=>({...g}));
}
function saveFavGroups(groups){localStorage.setItem(FAV_GROUPS_KEY,JSON.stringify(groups));}
// 하위 호환: 기존 코드가 FAV_CATEGORIES를 참조할 경우 대비
const FAV_CATEGORIES={
  commute:{label:'출퇴근',icon:'💼',color:'#388bfd'},
  travel: {label:'여행',  icon:'✈️',color:'#3fb950'},
  etc:    {label:'기타',  icon:'📌',color:'#8b949e'},
};

function addFav(type){
  let id,label,data={};
  if(type==='train'){
    const no=document.getElementById('input-trainno').value.trim();
    if(!no){alert('열차번호를 입력 후 추가해주세요.');return;}
    id='train:'+no; label='열차 '+no; data={no};
  } else if(type==='station'){
    const stn=document.getElementById('input-station').value.trim();
    if(!stn){alert('역 이름을 입력 후 추가해주세요.');return;}
    id='station:'+stn; label=stn+'역 시간표'; data={stn};
  } else if(type==='route'){
    const from=document.getElementById('input-from').value.trim();
    const to=document.getElementById('input-to').value.trim();
    if(!from||!to){alert('출발역과 도착역을 입력 후 추가해주세요.');return;}
    id='route:'+from+':'+to; label=from+' → '+to; data={from,to};
  }
  const favs=loadFavs();
  if(favs.some(f=>f.id===id)){alert('이미 즐겨찾기에 추가된 항목입니다.');return;}
  // 카테고리 선택 팝업 띄우고 그 안에서 최종 저장
  openFavCategoryPicker(id,type,label,data);
}

// 즐겨찾기 추가 시 그룹 선택 팝업
function openFavCategoryPicker(id,type,label,data){
  const old=document.getElementById('fav-cat-popup-wrap');
  if(old)old.remove();
  const wrap=document.createElement('div');
  wrap.id='fav-cat-popup-wrap';
  const groups=loadFavGroups();
  const opts=groups.map(g=>
    `<button class="fav-cat-option" onclick="confirmAddFav('${id}','${type}','${label.replace(/'/g,"\\'")}','${g.id}')">
      <span style="font-size:18px">${g.icon}</span><span style="color:${g.color}">${g.label}</span>
    </button>`).join('');
  wrap.innerHTML=`
    <div class="alarm-popup-backdrop" onclick="closeFavCategoryPicker()"></div>
    <div class="alarm-popup">
      <div class="alarm-popup-title">⭐ ${label}</div>
      <div class="alarm-popup-sub">그룹을 선택하세요</div>
      <div class="fav-cat-options">${opts}</div>
      <button class="alarm-popup-close" onclick="closeFavCategoryPicker()">취소</button>
    </div>`;
  document.body.appendChild(wrap);
  window._pendingFavData=data;
}
function closeFavCategoryPicker(){
  const w=document.getElementById('fav-cat-popup-wrap');
  if(w)w.remove();
  window._pendingFavData=null;
}

// ── 즐겨찾기 그룹 관리 ──
const _FAV_GROUP_ICONS=['🗂️','📁','🔖','⭐','❤️','🚂','🏔️','☕'];
const _FAV_GROUP_COLORS=['#e879f9','#f59e0b','#10b981','#ec4899','#6366f1','#f97316','#06b6d4','#84cc16'];

function _gmListHtml(groups){
  return groups.map(g=>`
    <div class="group-manager-item">
      <div class="gm-label"><span style="font-size:16px">${g.icon}</span><span id="gm-lbl-${g.id}" style="font-size:14px;font-weight:600;color:${g.color}">${g.label}</span></div>
      <div class="gm-actions">
        <button onclick="startRenameGroup('${g.id}')" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit">수정</button>
        ${!FAV_GROUPS_BUILT_IN.includes(g.id)?`<button onclick="deleteFavGroup('${g.id}')" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--red);background:transparent;color:var(--red);cursor:pointer;font-family:inherit">삭제</button>`:''}
      </div>
    </div>`).join('');
}

function openGroupManager(){
  const old=document.getElementById('group-manager-wrap');
  if(old)old.remove();
  const wrap=document.createElement('div');
  wrap.id='group-manager-wrap';
  // 팝업이 overflow-y:auto면 iOS Safari에서 내부 버튼 클릭이 무시됨
  // → 팝업 자체는 스크롤 없음, 목록 영역만 overflow-y:auto
  // z-index:9500 → my-sub-panel(9002)과 booking-popup-wrap(9400) 위
  wrap.innerHTML=`
    <div id="gm-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9499"></div>
    <div id="gm-popup" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;min-width:260px;max-width:340px;width:calc(100% - 40px);z-index:9500;box-shadow:0 8px 32px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:0;max-height:calc(100vh - 48px)">
      <div class="alarm-popup-title">⚙️ 그룹 관리</div>
      <div class="alarm-popup-sub" style="margin-bottom:10px;flex-shrink:0">새 그룹 이름을 입력하고 추가하세요</div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-shrink:0">
        <input id="gm-new-name" placeholder="그룹 이름" style="flex:1;font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg1);color:var(--text1);font-family:inherit"
          onkeydown="if(event.key==='Enter')addFavGroup()">
        <button id="gm-add-btn" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;touch-action:manipulation">추가</button>
      </div>
      <div class="alarm-popup-sub" style="margin-bottom:6px;flex-shrink:0">그룹 목록 (기본 그룹은 삭제 불가)</div>
      <div id="gm-list" style="overflow-y:auto;flex:1;min-height:0">${_gmListHtml(loadFavGroups())}</div>
      <button id="gm-close-btn" class="alarm-popup-close" style="margin-top:14px;flex-shrink:0;touch-action:manipulation">닫기</button>
    </div>`;
  document.body.appendChild(wrap);
  // addEventListener 사용 (iOS Safari에서 inline onclick보다 신뢰성 높음)
  document.getElementById('gm-backdrop').addEventListener('click', closeGroupManager);
  document.getElementById('gm-add-btn').addEventListener('click', addFavGroup);
  document.getElementById('gm-close-btn').addEventListener('click', closeGroupManager);
  setTimeout(()=>document.getElementById('gm-new-name')?.focus(),50);
}

function closeGroupManager(){
  const w=document.getElementById('group-manager-wrap');
  if(w)w.remove();
  if(document.getElementById('panel-fav')?.classList.contains('active'))renderFavs();
}

function addFavGroup(){
  const inp=document.getElementById('gm-new-name');
  const label=(inp?.value||'').trim();
  if(!label){alert('그룹 이름을 입력해주세요.');return;}
  const groups=loadFavGroups();
  if(groups.some(g=>g.label===label)){alert('같은 이름의 그룹이 이미 있습니다.');return;}
  const idx=groups.length % _FAV_GROUP_ICONS.length;
  groups.push({id:'g_'+Date.now(),label,icon:_FAV_GROUP_ICONS[idx],color:_FAV_GROUP_COLORS[idx]});
  saveFavGroups(groups);
  if(inp)inp.value='';
  const list=document.getElementById('gm-list');
  if(list)list.innerHTML=_gmListHtml(loadFavGroups());
}

function deleteFavGroup(id){
  if(!confirm('이 그룹을 삭제하면 해당 그룹의 즐겨찾기 항목이 "기타"로 이동됩니다.\n삭제하시겠습니까?'))return;
  const groups=loadFavGroups().filter(g=>g.id!==id);
  saveFavGroups(groups);
  saveFavs(loadFavs().map(f=>f.cat===id?{...f,cat:'etc'}:f));
  const list=document.getElementById('gm-list');
  if(list)list.innerHTML=_gmListHtml(loadFavGroups());
}

function startRenameGroup(id){
  const lbl=document.getElementById('gm-lbl-'+id);
  if(!lbl)return;
  const old=lbl.textContent;
  lbl.outerHTML=`<span id="gm-lbl-${id}">
    <input id="gm-rename-${id}" value="${old}" style="font-size:13px;padding:3px 6px;border-radius:4px;border:1px solid var(--accent);background:var(--bg1);color:var(--text1);font-family:inherit;width:90px">
    <button onclick="confirmRenameGroup('${id}')" style="font-size:11px;padding:3px 8px;border-radius:4px;border:none;background:var(--accent);color:#fff;cursor:pointer;margin-left:4px;font-family:inherit">확인</button>
  </span>`;
  document.getElementById('gm-rename-'+id)?.focus();
}

function confirmRenameGroup(id){
  const inp=document.getElementById('gm-rename-'+id);
  const lbl=document.getElementById('gm-lbl-'+id);
  if(!inp||!lbl)return;
  const newLabel=inp.value.trim();
  if(!newLabel)return;
  const groups=loadFavGroups().map(g=>g.id===id?{...g,label:newLabel}:g);
  saveFavGroups(groups);
  const grp=groups.find(g=>g.id===id);
  lbl.innerHTML=`<span style="font-size:14px;font-weight:600;color:${grp?.color||'var(--text1)'}">${newLabel}</span>`;
}

function confirmAddFav(id,type,label,cat){
  const data=window._pendingFavData||{};
  const favs=loadFavs();
  favs.push({id,type,label,data,cat,addedAt:Date.now()});
  saveFavs(favs);
  closeFavCategoryPicker();
  alert('"'+label+'"을 즐겨찾기에 추가했습니다.');
  if(document.getElementById('panel-fav').classList.contains('active'))renderFavs();
}

function removeFav(id){
  saveFavs(loadFavs().filter(f=>f.id!==id));
  renderFavs();
}

function runFav(fav){
  closeMyPage();
  if(fav.type==='train'){
    document.getElementById('input-trainno').value=fav.data.no;
    const sel=document.getElementById('sel-line-train');
    if(sel)sel.value='';
    document.getElementById('train-line-list').innerHTML='';
    switchTab('train'); searchByTrain();
  } else if(fav.type==='station'){
    document.getElementById('input-station').value=fav.data.stn;
    switchTab('station'); searchByStation();
  } else if(fav.type==='route'){
    document.getElementById('input-from').value=fav.data.from;
    document.getElementById('input-to').value=fav.data.to;
    switchTab('route'); searchByRoute();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── 즐겨찾기 실시간 정보 계산 ──
function getFavInfo(fav){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();

  if(fav.type==='train'){
    const trains=ALL_TRAINS.filter(t=>t.no===fav.data.no);
    if(!trains.length)return{main:'열차 정보 없음',sub:''};
    const t=trains[0];
    const status=getCurrentStatus(t);
    const gradeLbl=GL[t.grade]||t.grade;
    let main=`${gradeLbl} ${t.no}`;
    let sub='';
    if(!status)sub='정보 없음';
    else if(status.status==='before')sub='운행을 준비 중';
    else if(status.status==='done')sub='운행 종료';
    else{
      if(status.atStn)sub=`${status.atStn}역 정차 중`;
      else if(status.passStn)sub=`${status.passStn}역 통과 중`;
      else if(status.nextStn)sub=`${status.prevStn||''}→${status.nextStn} 운행 중`;
      else sub='운행 중';
    }
    return{main,sub};
  }

  if(fav.type==='station'){
    const stn=fav.data.stn;
    const lines=[];
    for(const dir of ['down','up']){
      const candidates=[];
      ALL_TRAINS.forEach(t=>{
        if(t.dir!==dir)return;
        const stop=t.stops.find(s=>s.s===stn);
        if(!stop||isPassStop(t,stn))return;
        const timeV=hasTime(stop.dep)?stop.dep:hasTime(stop.arr)?stop.arr:null;
        if(!timeV)return;
        const m=toMin(timeV);
        if(m===null)return;
        const adjM=m<nowMin-30?m+1440:m;
        if(adjM>=nowMin)candidates.push({t,m:adjM,timeV});
      });
      candidates.sort((a,b)=>a.m-b.m);
      const next=candidates[0];
      const dirLbl=dir==='down'?'하행 ↓':'상행 ↑';
      if(next){
        const diff=next.m-nowMin;
        const diffStr=diff===0?'지금':`${diff}분 후`;
        lines.push(`${dirLbl}  ${next.timeV} ${next.t.dest}행 ${next.t.no} · ${diffStr}`);
      } else {
        lines.push(`${dirLbl}  운행 열차 없음`);
      }
    }
    return{main:stn+'역',lines};
  }

  if(fav.type==='route'){
    const {from,to}=fav.data;
    // 직통 다음 열차
    let best=null;
    ALL_TRAINS.forEach(t=>{
      const stops=t.stops;
      const fi=stops.findIndex(s=>s.s===from);
      const ti=stops.findIndex(s=>s.s===to);
      if(fi===-1||ti===-1||fi>=ti)return;
      if(isPassStop(t,from)||isPassStop(t,to))return;
      const depStop=stops[fi];
      const arrStop=stops[ti];
      const depV=hasTime(depStop.dep)?depStop.dep:hasTime(depStop.arr)?depStop.arr:null;
      const arrV=hasTime(arrStop.arr)?arrStop.arr:hasTime(arrStop.dep)?arrStop.dep:null;
      if(!depV)return;
      const depM=toMin(depV);
      const adjM=depM<nowMin-30?depM+1440:depM;
      if(adjM<nowMin)return;
      if(!best||adjM<best.adjM)best={t,depV,arrV,adjM};
    });
    if(!best)return{main:`${from} → ${to}`,sub:'다음 열차 없음'};
    const diff=best.adjM-nowMin;
    const diffStr=diff===0?'지금 출발':diff+'분 후 출발';
    return{main:`${from} → ${to}`,sub:`${best.t.no} ${best.depV}→${best.arrV||'?'} (${diffStr})`};
  }

  return{main:fav.label,sub:''};
}

// 현재 선택된 즐겨찾기 필터 카테고리
let _favFilterCat='all';

function setFavFilter(cat){
  _favFilterCat=cat;
  renderFavs();
}

function renderFavs(){
  const el=document.getElementById('result-fav');
  if(!el){console.warn('result-fav 엘리먼트 없음');return;}
  try{
  const allFavs=loadFavs();
  const groups=loadFavGroups();
  const typeIcon={train:'🚆',station:'🏢',route:'🔍'};

  const headerBar=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div class="result-title" style="display:flex;align-items:center;gap:8px">⭐ 즐겨찾기 <span class="badge blue">${allFavs.length}개</span></div>
    <button onclick="openGroupManager()" style="font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit;white-space:nowrap">⚙️ 그룹 관리</button>
  </div>`;

  if(!allFavs.length){
    el.innerHTML=headerBar+'<div class="empty"><div class="empty-icon">⭐</div><p>즐겨찾기가 비어있습니다.<br>각 탭의 ⭐ 버튼으로 추가해보세요.</p></div>';
    return;
  }

  // 그룹 필터 탭
  const groupCounts={all:allFavs.length};
  groups.forEach(g=>{groupCounts[g.id]=allFavs.filter(f=>(f.cat||'etc')===g.id).length;});
  const filterTabs=`<div class="fav-filter-tabs">
    <button class="fav-filter-tab${_favFilterCat==='all'?' active':''}" onclick="setFavFilter('all')">전체 ${groupCounts.all}</button>
    ${groups.map(g=>
      groupCounts[g.id]>0?`<button class="fav-filter-tab${_favFilterCat===g.id?' active':''}" onclick="setFavFilter('${g.id}')">${g.icon} ${g.label} ${groupCounts[g.id]}</button>`:''
    ).join('')}
  </div>`;

  const makeFavCard=(f,globalIdx)=>{
    const info=getFavInfo(f);
    const grp=groups.find(g=>g.id===f.cat)||groups.find(g=>g.id==='etc')||{icon:'📌',color:'#8b949e'};
    const subHtml=info.lines
      ? info.lines.map(l=>`<div class="fav-sub">${l}</div>`).join('')
      : `<div class="fav-sub">${info.sub||''}</div>`;
    return `<div class="fav-card" draggable="true" ondragstart="favDragStart(event,${globalIdx})" ondragend="favDragEnd(event)" ondragover="favDragOver(event,${globalIdx})" onclick="runFav(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div class="fav-icon">${typeIcon[f.type]||'⭐'}</div>
      <div class="fav-info">
        <div class="fav-label">${info.main} <span class="fav-cat-tag" style="color:${grp.color}">${grp.icon}</span></div>
        ${subHtml}
      </div>
      <button class="fav-del-btn" onclick="event.stopPropagation();removeFav('${f.id}')" title="삭제">✕</button>
    </div>`;
  };

  let cardsHtml='';
  if(_favFilterCat==='all'){
    // 그룹별 섹션으로 표시
    groups.forEach(g=>{
      const gFavs=allFavs.filter(f=>(f.cat||'etc')===g.id);
      if(!gFavs.length)return;
      cardsHtml+=`<div class="fav-group-header"><span style="color:${g.color};font-weight:700">${g.icon} ${g.label}</span><span style="font-size:11px;color:var(--text3)">${gFavs.length}개</span></div>`;
      cardsHtml+=gFavs.map(f=>makeFavCard(f,allFavs.indexOf(f))).join('');
    });
  } else {
    const filtered=allFavs.filter(f=>(f.cat||'etc')===_favFilterCat);
    if(!filtered.length){
      el.innerHTML=`${headerBar}${filterTabs}<div class="empty"><div class="empty-icon">📭</div><p>해당 그룹에 즐겨찾기가 없습니다.</p></div>`;
      return;
    }
    cardsHtml=filtered.map(f=>makeFavCard(f,allFavs.indexOf(f))).join('');
  }

  el.innerHTML=`${headerBar}${filterTabs}<div class="fav-list">${cardsHtml}</div><p class="hint">※ 클릭 시 해당 탭으로 이동해 바로 조회합니다</p>`;
  }catch(err){
    console.error('renderFavs 오류:', err);
    el.innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><p>즐겨찾기를 불러오는 중 오류가 발생했습니다.<br><span style="font-size:11px;color:var(--text3)">${err.message}</span></p></div>`;
  }
}

function isNightTrain(timeStr){
  const m=toMin(timeStr);
  if(m===null)return false;
  return m>=1320||m<240; // 22:00 이후 또는 04:00 이전
}

// ── 구간별 운행 열차 수 조회 ──
function calcSectionTrains(){
  const from=document.getElementById('stat-from')?.value.trim();
  const to=document.getElementById('stat-to')?.value.trim();
  const el=document.getElementById('stat-section-result');
  if(!el)return;
  if(!from||!to){el.innerHTML='<p style="font-size:12px;color:var(--text3)">출발역과 도착역을 입력하세요</p>';return;}

  const results=[];
  ALL_TRAINS.forEach(t=>{
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    if(fi===-1||ti===-1)return;
    if(fi>=ti)return; // 방향 일치 확인
    results.push(t);
  });

  if(!results.length){
    el.innerHTML=`<p style="font-size:12px;color:var(--text3)">${from} → ${to} 구간을 운행하는 열차가 없습니다</p>`;
    return;
  }

  // 등급별 집계
  const gradeCount={};
  results.forEach(t=>{gradeCount[t.grade]=(gradeCount[t.grade]||0)+1;});
  const gradeRows=Object.entries(gradeCount).sort((a,b)=>b[1]-a[1]).map(([g,c])=>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--bg3);font-size:12px;margin:2px">
      ${gradeHtml(g)} <span style="font-family:var(--mono)">${c}편</span>
    </span>`
  ).join('');

  el.innerHTML=`
    <div style="margin-bottom:8px">
      <span style="font-size:14px;font-weight:600">${from} → ${to}</span>
      <span class="badge blue" style="margin-left:8px">${results.length}편</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${gradeRows}</div>`;
}


// ── 역별 첫차/막차 조회 (통계 탭) ──
function calcStationFirstLast(){
  const stn=document.getElementById('stat-stn-input')?.value.trim();
  const el=document.getElementById('stat-stn-fl-result');
  if(!el)return;
  if(!stn){el.innerHTML='<p style="font-size:12px;color:var(--text3)">역명을 입력하세요</p>';return;}
  const data=getStationFirstLast(stn);
  if(!data.length){
    el.innerHTML=`<p style="font-size:12px;color:var(--text3)">${stn}역 정보를 찾을 수 없습니다</p>`;
    return;
  }
  const rows=data.map(d=>{
    const dirLbl=d.dir==='down'?'하행 ↓':'상행 ↑';
    return `<div class="fl-stat-row">
      <span class="fl-stat-name">${d.dest}행 ${dirLbl}</span>
      <div class="fl-stat-times">
        <span class="fl-stat-item"><span class="fl-stat-dir">첫차</span><span class="fl-stat-time">${d.firstT}</span></span>
        <span class="fl-stat-item"><span class="fl-stat-dir">막차</span><span class="fl-stat-time">${d.lastT}</span></span>
      </div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="first-last-stats">${rows}</div>`;
}


// ── 운행 중 열차 전체 보기 ──
function showAllRunningTrains(){
  const el=document.querySelector('#result-stats .running-chips-wrap');
  if(!el)return;
  const runningTrains=ALL_TRAINS.filter(t=>{
    const st=getCurrentStatus(t);
    return st&&st.status==='running';
  }).sort((a,b)=>(parseInt(a.no)||0)-(parseInt(b.no)||0));
  const chips=runningTrains.map(t=>{
    const c=GRADE_COLORS[t.grade]||'var(--accent)';
    return `<span onclick="jumpToTrain('${t.no}')" style="cursor:pointer;padding:2px 8px;border-radius:10px;border:1px solid ${c};color:${c};font-size:11px;background:rgba(0,0,0,.2)">${t.no}</span>`;
  }).join('');
  el.innerHTML=chips+`<span class="badge" style="cursor:pointer;margin-left:4px" onclick="renderStats()">접기 ▴</span>`;
}



// 096: 좌표·거리·번호 데이터 이상치 점검
function checkDataAnomalies(){
  const issues={dup:[],speed:[],nocoord:new Set()};
  const seen={}; ALL_TRAINS.forEach(t=>{seen[t.no]=(seen[t.no]||0)+1;});
  Object.entries(seen).forEach(([k,v])=>{ if(v>1) issues.dup.push(`${k} (${v}건)`); });
  const coord=b=>_stnCoord(b); // 별칭 폴백 포함(회덕역 / 대전차량기지 등)
  // 인접 정차역 간 직선거리·속도 이상(좌표 오류 탐지) — 역쌍 단위로 중복 제거
  const pairMax={};
  ALL_TRAINS.forEach(t=>{
    const stops=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
    for(let i=0;i<stops.length-1;i++){
      const a=stops[i], b=stops[i+1];
      const ca=coord(a.s), cb=coord(b.s);
      if(!ca){issues.nocoord.add(a.s);continue;}
      if(!cb){issues.nocoord.add(b.s);continue;}
      if(typeof haversineKm!=='function')continue;
      const km=haversineKm(ca.lat,ca.lon,cb.lat,cb.lon);
      let dep=toMin(a.dep||a.arr), arr=toMin(b.arr||b.dep);
      let mins=(dep!=null&&arr!=null)?(arr-dep):null; if(mins!=null&&mins<0)mins+=1440;
      const kmh=(mins&&mins>0)?km/(mins/60):0;
      // 인접역이 200km↑ 떨어졌거나 표정 450km/h↑ → 데이터(좌표) 이상
      if(km>200||kmh>450){
        const key=[a.s,b.s].sort().join('↔');
        if(!pairMax[key]||km>pairMax[key].km) pairMax[key]={km,kmh,a:a.s,b:b.s};
      }
    }
  });
  Object.values(pairMax).sort((x,y)=>y.km-x.km).forEach(v=>issues.speed.push(`${v.a}↔${v.b}: 직선 ${v.km.toFixed(0)}km${v.kmh>450?` (${Math.round(v.kmh)}km/h)`:''}`));
  return issues;
}
function runDataAnomalyCheck(){
  const el=document.getElementById('stat-anomaly-result'); if(!el)return;
  el.innerHTML='<span style="font-size:12px;color:var(--text3)">점검 중…</span>';
  setTimeout(()=>{
    const r=checkDataAnomalies();
    const uniqSpeed=[...new Set(r.speed)];
    const sec=(title,arr,color)=>arr.length?`<div style="margin-top:6px"><b style="color:${color}">${title} ${arr.length}건</b><div style="font-family:var(--mono);font-size:11px;color:var(--text2);margin-top:3px;line-height:1.6">${arr.slice(0,12).join('<br>')}${arr.length>12?'<br>… 외 '+(arr.length-12)+'건':''}</div></div>`:'';
    const clean = !r.dup.length && !uniqSpeed.length && !r.nocoord.size;
    el.innerHTML = clean
      ? '<div style="font-size:13px;color:var(--green);font-weight:700">✅ 눈에 띄는 이상치가 없습니다</div>'
      : sec('열차번호 중복', r.dup, 'var(--red)')
        + sec('속도/거리 이상 구간', uniqSpeed, 'var(--orange)')
        + ([...r.nocoord].length?`<div style="margin-top:6px"><b style="color:var(--text2)">좌표 없는 역 ${r.nocoord.size}곳</b><div style="font-family:var(--mono);font-size:11px;color:var(--text3);margin-top:3px">${[...r.nocoord].slice(0,20).join(', ')}</div></div>`:'');
  },30);
}

// 042-C: 확정 운용표 — 호남고속선 KTX 10편성 + 충북선 5편성 (조건: 착발역 복귀·짝수·목포 5–10/60+ 회차)
const CONFIRMED_ROTATION = (()=>{
  const sets=[
    {id:'호남 1', seq:['401','416','423','434','441','454']},
    {id:'호남 2', seq:['402','409','430','437','446','453']},
    {id:'호남 3', seq:['403','412','419','426','433','444','451','460']},
    {id:'호남 4', seq:['404','411','420','427','436','443','452','459']},
    {id:'호남 5', seq:['405','414','421','432','439','448']},
    {id:'호남 6', seq:['406','413','424','431','442','455']},
    {id:'호남 7', seq:['407','418','425','438','445','456']},
    {id:'호남 8', seq:['408','415','422','429','440','447']},
    {id:'호남 9', seq:['410','417','428','435','450','457']},
    {id:'호남 10', seq:['449','458']},
    {id:'충북 1', seq:['1401','1406','1411','1416','1423','1428']},
    {id:'충북 2', seq:['1402','1405','1410','1419','1424','1429']},
    {id:'충북 3', seq:['1403','1408','1413','1418','1421','1426']},
    {id:'충북 4', seq:['1404','1409','1414','1417','1422','1427']},
    {id:'충북 5', seq:['1407','1412','1415','1420','1425','1430']},
    // 남부내륙선 계통 (배포 9계통, 원단역 폐순환·최소편성)
    {id:"남대구-순천 1", seq:["1831","1834","1853","1854","1845","1848"]},
    {id:"남대구-순천 2(순천주박)", seq:["1832","1837","1840","1843","1846","1849"]},
    {id:"남대구-순천 3", seq:["1851","1852","1841","1844"]},
    {id:"남대구-순천 4", seq:["1833","1836","1839","1842","1857","1858"]},
    {id:"남대구-순천 5", seq:["1835","1838","1855","1856","1847","1850"]},
    {id:"남대구-고현 1", seq:["1861","1862","1865","1868","1871","1874"]},
    {id:"남대구-고현 2", seq:["1863","1866","1869","1872"]},
    {id:"남대구-고현 3(고현주박)", seq:["1864","1867","1870","1873"]},
    {id:"진주-고현 1", seq:["1941","1942","1943","1944","1945","1946","1947","1948","1949","1950","1951","1952","1953","1954"]},
    {id:"순천-고현 1(고현주박)", seq:["1962","1961","1964","1967","1970","1971"]},
    {id:"순천-고현 2", seq:["1963","1966","1965","1968","1969","1972"]},
    {id:"목포-고현 1", seq:["1981","1984","1989","1992"]},
    {id:"목포-고현 2", seq:["1983","1990"]},
    {id:"목포-고현 3(고현주박)", seq:["1982","1991"]},
    {id:"목포-고현 4", seq:["1985","1986","1993","1994"]},
    {id:"목포-고현 5", seq:["1987","1988"]},
    {id:"대전-고현 1", seq:["1171","1176","1179","1182","1187","1190"]},
    {id:"대전-고현 2(고현주박)", seq:["1172","1181","1184","1189"]},
    {id:"대전-고현 3", seq:["1173","1178","1183","1188"]},
    {id:"대전-고현 4(고현주박)", seq:["1174","1177","1180","1185"]},
    {id:"대전-고현 5", seq:["1175","1186"]},
    {id:"한강로-고현 1", seq:["1131","1134","1137","1142"]},
    {id:"한강로-고현 2(고현주박)", seq:["1132","1141"]},
    {id:"한강로-고현 3", seq:["1133","1138"]},
    {id:"한강로-고현 4", seq:["1135","1140"]},
    {id:"한강로-고현 5(고현주박)", seq:["1136","1139"]},
    {id:"한강로KTX 1", seq:["281","290","283","296","297","288"]},
    {id:"한강로KTX 2(고현주박)", seq:["282","291","284","295","298","287"]},
    {id:"한강로KTX 3", seq:["289","294","285","300"]},
    {id:"한강로KTX 4(고현주박)", seq:["292","293","286","299"]},
    {id:"한강로태안 1", seq:["221","224","225","228","229","230"]},
    {id:"한강로태안 2(태안주박)", seq:["222","223","226","227"]},
    {id:"영동광주 1", seq:["1431","1434","1435","1438","1439","1442"]},
    {id:"영동광주 2(광주주박)", seq:["1432","1433","1436","1437","1440","1441"]},
    {id:"강릉영주 1", seq:["1221","1226","1229","1230","1233","1236"]},
    {id:"강릉영주 2(영주주박)", seq:["1222","1225","1228","1231","1232","1235"]},
    {id:"강릉영주 3", seq:["1223","1224","1227","1234"]},
    {id:"강릉부산 1", seq:["1201","1206","1209","1214"]},
    {id:"강릉부산 2(부산주박)", seq:["1202","1207","1212","1215"]},
    {id:"강릉부산 3", seq:["1203","1208","1211","1216"]},
    {id:"강릉부산 4(부산주박)", seq:["1204","1213"]},
    {id:"강릉부산 5", seq:["1205","1210"]},
    {id:"서인천목포 1", seq:["461","464","465","468","469","472"]},
    {id:"서인천목포 2(목포주박)", seq:["462","463","466","467","470","471"]},
    {id:"서인천부산 1(부산주박)", seq:["152","165"]},
    {id:"서인천부산 2", seq:["151","154","155","160","161","164"]},
    {id:"서인천부산 3", seq:["153","158","159","162","163","166"]},
    {id:"서인천부산 4(부산주박)", seq:["156","157"]},
    {id:"마포장항전주 1", seq:["601","608","611","614"]},
    {id:"마포장항전주 2(전주주박)", seq:["602","605","606","609","612","615"]},
    {id:"마포장항전주 3", seq:["603","604","607","610","613","616"]},
    {id:"마포전주 1", seq:["481","482","485","486","489","490","493","494"]},
    {id:"마포전주 2", seq:["483","484","487","488","491","492","495","496"]},
    {id:"마포-장유 1", seq:["201","206","207","212"]},
    {id:"마포-장유 2(장유주박)", seq:["202","205","210","213"]},
    {id:"마포-장유 3", seq:["203","208","211","214"]},
    {id:"마포-장유 4(장유주박)", seq:["204","209"]},
    {id:"청량리-태백황지 1", seq:["1691","1692","1695","1696","1699","1700"]},
    {id:"청량리-태백황지 2", seq:["1693","1694","1697","1698"]},
  ];
  const m={};
  sets.forEach(s=>s.seq.forEach((no,i)=>{ m[no]={id:s.id, seq:s.seq, idx:i}; }));
  return m;
})();

// 042: 편성 운용 — 확정 운용표 우선, 없으면 종착 회차 기반 추정
function _rotStart(t){const s=t.stops.filter(x=>hasTime(x.arr)||hasTime(x.dep));return {stn:s[0].s, min:toMin(s[0].dep||s[0].arr)};}
function _rotEnd(t){const s=t.stops.filter(x=>hasTime(x.arr)||hasTime(x.dep));return {stn:s[s.length-1].s, min:toMin(s[s.length-1].arr||s[s.length-1].dep)};}
function _estimateRotation(startNo){
  const start=ALL_TRAINS.find(x=>x.no===startNo); if(!start)return [];
  const chain=[start]; const seen=new Set([start.no]);
  // 앞으로: 종착역에서 회차(6~120분) 후 반대방향 동급 열차로 이어감
  let cur=start;
  for(let i=0;i<10;i++){
    const e=_rotEnd(cur); if(e.min==null)break;
    let best=null;
    ALL_TRAINS.forEach(x=>{ if(seen.has(x.no)||x.grade!==cur.grade||x.dir===cur.dir)return;
      const s=_rotStart(x); if(s.stn!==e.stn||s.min==null)return;
      let d=s.min-e.min; if(d<0)d+=1440; if(d>=6&&d<=120&&(!best||d<best.d))best={x,d}; });
    if(!best)break; chain.push(best.x); seen.add(best.x.no); cur=best.x;
  }
  // 뒤로: 시발역으로 회차 들어온 열차 추정
  cur=start;
  for(let i=0;i<10;i++){
    const s=_rotStart(cur); if(s.min==null)break;
    let best=null;
    ALL_TRAINS.forEach(x=>{ if(seen.has(x.no)||x.grade!==cur.grade||x.dir===cur.dir)return;
      const e=_rotEnd(x); if(e.stn!==s.stn||e.min==null)return;
      let d=s.min-e.min; if(d<0)d+=1440; if(d>=6&&d<=120&&(!best||d<best.d))best={x,d}; });
    if(!best)break; chain.unshift(best.x); seen.add(best.x.no); cur=best.x;
  }
  return chain;
}
function showTrainRotation(no){
  document.getElementById('rotation-wrap')?.remove();
  const conf=CONFIRMED_ROTATION[no];
  let chain, confirmed=false, setId=null;
  if(conf){ chain=conf.seq.map(n=>ALL_TRAINS.find(x=>x.no===n)).filter(Boolean); confirmed=chain.length===conf.seq.length; setId=conf.id; }
  if(!confirmed){ chain=_estimateRotation(no); }
  const fmt=m=>{ if(m==null)return '-'; m=((m%1440)+1440)%1440; return Math.floor(m/60)+':'+String(m%60).padStart(2,'0'); };
  const rows=chain.map((t,i)=>{
    const s=_rotStart(t), e=_rotEnd(t);
    const gap = i>0 ? (()=>{ let d=s.min-_rotEnd(chain[i-1]).min; if(d<0)d+=1440; return d; })() : null;
    const c=`var(--c-${gcCssVar(t.grade)})`;
    const hi = t.no===no;
    return `${gap!=null?`<div class="rot-gap">↕ ${e.stn===s.stn?s.stn+' 회차':'회차'} ${gap}분</div>`:''}
      <div class="rot-leg${hi?' rot-cur':''}" onclick="closeRotation();jumpToTrain('${t.no}')">
        <div class="rot-leg-head"><span style="color:${c};font-weight:800">${t.grade}</span> <b>${t.no}</b>${hi?' <span class="rot-badge">이 열차</span>':''}</div>
        <div class="rot-leg-body"><span>${s.stn} <span class="rot-t">${fmt(s.min)}</span></span> <span class="rot-arr">→</span> <span>${e.stn} <span class="rot-t">${fmt(e.min)}</span></span></div>
      </div>`;
  }).join('');
  const wrap=document.createElement('div'); wrap.id='rotation-wrap';
  wrap.innerHTML=`<div class="rail-ticket-backdrop" onclick="closeRotation()"></div>
    <div class="rot-popup">
      <div class="rot-popup-head"><span>🔁 편성 운용 ${confirmed?'(확정)':'(추정)'}</span><button class="si-board-close" onclick="closeRotation()">✕</button></div>
      <div class="rot-note">${confirmed
        ? `확정 운용표 · <b>${setId}</b> 편성 · 하루 ${chain.length}회 운용 · 착발역 복귀`
        : '종착역 회차를 기준으로 같은 편성의 하루 운행을 추정한 것입니다. 실제 편성 운용과 다를 수 있습니다.'}</div>
      <div class="rot-list">${rows}</div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeRotation(){ document.getElementById('rotation-wrap')?.remove(); }

// ── 열차 상세 뷰 전환 ──
function setDetailView(mode, trainNo){
  _detailViewMode = mode;
  const trains = ALL_TRAINS.filter(t => t.no === trainNo);
  const el = document.getElementById('result-train');
  if(el && trains.length){
    el.innerHTML = trains.map(renderDetail).join('');
    // 통과역 숨기기 상태 복원
    const cb = document.getElementById(`hide-pass-${trainNo}`);
    if(cb && cb.checked) togglePassRows(trainNo);
  }
}

function renderTableView(t){
  const status=getCurrentStatus(t);
  let tableRows = '';
  let seq = 0;
  const valid = t.stops.filter(s => s.arr || s.dep);
  const originStn = valid[0]?.s, terminusStn = valid[valid.length-1]?.s;
  t.stops.forEach(s => {
    const arr = s.arr, dep = s.dep;
    if(!arr && !dep) return;
    const isOrigin = s.s === originStn, isTerm = s.s === terminusStn;
    const isPass = !isOrigin && !isTerm && isPassStop(t, s.s);
    seq++;
    // 현재 위치 하이라이트
    let hlCls='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) hlCls=' hl-at';
      else if(status.nextStn===s.s||status.prevStn===s.s) hlCls=' hl-next';
    }
    const rc = isPass ? 'sr pass-row' : `sr${hlCls}`;
    const stnNameCls = isOrigin?'origin-n':isTerm?'term-n':'';
    // 다음 역 뱃지
    const nextBadge=status&&status.nextStn===s.s&&!isPass
      ?'<span style="font-size:10px;padding:1px 5px;border-radius:8px;background:rgba(56,139,253,.2);color:var(--accent);border:1px solid rgba(56,139,253,.4);margin-left:4px;font-weight:600">다음</span>':
      status&&status.atStn===s.s?'<span style="font-size:10px;padding:1px 5px;border-radius:8px;background:rgba(63,185,80,.2);color:var(--green);border:1px solid rgba(63,185,80,.4);margin-left:4px;font-weight:600">현재</span>':'';
    const arrCell = hasTime(arr) ? `<span class="t-arr">${arr}</span>` : isOrigin ? '<span style="color:var(--text3);font-size:11px">출발역</span>' : '';
    const depCell = hasTime(dep) ? `<span class="t-dep">${dep}</span>` : isTerm ? '<span style="color:var(--text3);font-size:11px">종착역</span>' : '';
    const tno = t.no, tstn = s.s;
    const sIdx = t.stops.findIndex(x => x.s === tstn);
    const prevStop = sIdx > 0 ? t.stops.slice(0, sIdx).reverse().find(x => hasTime(x.dep) || hasTime(x.arr)) : null;
    const prevTime = prevStop ? (hasTime(prevStop.dep) ? prevStop.dep : prevStop.arr) : null;
    let alarmCell = '<div class="stn-alarm-cell">';
    if(!isPass){
      const boardSet = hasAlarm(`board:${tno}:${tstn}`);
      const arrSet = hasAlarm(`arr:${tno}:${tstn}`);
      const anySet = boardSet || arrSet;
      alarmCell += `<button class="alarm-bell-btn${anySet?' has-alarm':''}" onclick="openAlarmPopup('${tno}','${tstn}','${arr||''}','${dep||''}','${prevTime||''}')" title="알람 설정">🔔</button>`;
    }
    alarmCell += '</div>';
    tableRows += `<div class="${rc}"><div class="stn-idx">${seq}</div><div class="stn-name ${stnNameCls}">${tstn}${nextBadge}</div><div class="stn-time">${arrCell}</div><div class="stn-time">${depCell}</div>${alarmCell}</div>`;
  });
  return `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <div class="stn-grid" style="min-width:500px">
      <div class="stn-gh">#</div><div class="stn-gh">역명</div>
      <div class="stn-gh green">도착</div><div class="stn-gh blue">출발</div>
      <div class="stn-gh alarm-col">알람</div>
      ${tableRows}
    </div>
  </div>`;
}

// ── 타임라인 통과역 숨기기 토글 ──
function togglePassRows(trainNo){
  const cb=document.getElementById(`hide-pass-${trainNo}`);
  const list=document.getElementById(`tl-${trainNo}`);
  if(!cb||!list)return;
  const hide=cb.checked;
  // 타임라인 모드
  list.querySelectorAll('.tl-row').forEach(row=>{
    if(row.classList.contains('tl-row-pass')) row.style.display=hide?'none':'';
  });
  // 표 모드
  list.querySelectorAll('.sr.pass-row').forEach(row=>{
    row.style.display=hide?'none':'';
  });
}


// ── 노선도 확대/축소 ──
let _mapZoom = 1;
let _mapZoomOrigin = {x:0, y:0};

function initMapZoom(){
  const wrap = document.getElementById('map-svg-wrap');
  if(!wrap) return;
  _mapZoom = 1;

  // 휠 줌 (새 레이아웃 줌으로 위임 — transform scale은 스크롤 영역이 안 늘어나 폐기)
  wrap.onwheel = e => {
    e.preventDefault();
    mapZoom(e.deltaY > 0 ? -0.2 : 0.2);
  };
  // (구) 핀치 property 핸들러 제거 — 새 _mapBindPinch(addEventListener)가 담당
  wrap.ontouchstart = null;
  wrap.ontouchmove = null;
  wrap.ontouchend = null;
}

// (구 API 위임) 다른 코드가 호출해도 새 줌으로 동작
function setMapZoom(z){
  _mapZoomLv = Math.max(1, Math.min(4, z));
  _mapApplyZoom(true);
  const zl = document.getElementById('map-zoom-label');
  if(zl) zl.textContent = Math.round(_mapZoomLv*100) + '%';
}
function mapZoomIn(){ mapZoom(0.35); }
function mapZoomOut(){ mapZoom(-0.35); }

// ── 노선도에서 열차 위치 추적 ──
function trackTrainOnMap(trainNo){
  const t = ALL_TRAINS.find(x => x.no === trainNo);
  if(!t) return;

  const lineMap = {
    '경부선':'gyeongbu','경부고속선':'gyeongbuhs','호남고속선':'honamhs','호남선':'honam',
    '전라선':'jeolla','중앙선':'jungang','동해선':'donghae','영동선':'yeongdong',
    '강릉선':'gangreung','중부내륙선':'jungnaelyuk','경전선':'gyeongjeon','충북선':'chungbuk','장항선':'janghang','남부내륙선':'nambunaelyuk',
    '태안선':'taean','소백선':'sobaek','경북선':'gyeongbuk','태백선':'taebaek','정선선':'jeongseon'
  };

  // 현재 위치 기준으로 실제 운행 중인 노선 판단
  const status = getCurrentStatus(t);
  let lineKey = null;

  if(status && status.status === 'running'){
    const curStn = status.atStn || status.prevStn || status.nextStn;
    if(curStn){
      for(const [key, mapLine] of Object.entries(MAP_LINES)){
        if(mapLine.routes.some(r => r.stations.some(s => s.n === curStn))){
          lineKey = key; break;
        }
      }
    }
  }

  // fallback: 열차 노선 속성 첫 번째 항목
  if(!lineKey){
    for(const l of t.line.split('·').map(l=>l.trim())){
      if(lineMap[l]){ lineKey = lineMap[l]; break; }
    }
  }

  if(!lineKey){ alert('해당 노선의 노선도가 없습니다'); return; }

  _mapTrackedTrain = trainNo;
  switchTab('map');

  // 해당 노선 탭이 이미 활성이면 그냥 재렌더, 아니면 클릭
  const btn = document.querySelector(`.map-line-tab[onclick*="${lineKey}"]`);
  if(btn && !btn.classList.contains('active')){
    btn.click(); // showMapLine + updateMapTrains 호출됨
  } else {
    showMapLine(lineKey, btn || document.querySelector('.map-line-tab.active'));
  }

  setTimeout(()=>{
    updateMapTrains();
    _scrollToTrackedTrain();
    _updateMapOverlay();
  }, 420);
}

function _scrollToTrackedTrain(){
  if(!_mapTrackedTrain) return;
  const t = ALL_TRAINS.find(x => x.no === _mapTrackedTrain);
  if(!t) return;
  const status = getCurrentStatus(t);
  if(!status) return;
  const stn = status.atStn || status.prevStn || status.nextStn;
  if(!stn || !_mapStnPos[stn]) return;
  const wrap = document.getElementById('map-svg-wrap');
  const pos = _mapStnPos[stn];
  if(wrap && pos){
    const {ox, oy} = _mapSvgSize;
    wrap.scrollLeft = pos.x - ox - wrap.clientWidth/2;
    wrap.scrollTop = pos.y - oy - wrap.clientHeight/2;
  }
}

// ── 최근 검색 드롭다운 ──
function showRecentSearches(inputId, listId, type){
  const h = loadHistory(type);
  if(!h.length) return;
  const val = document.getElementById(inputId)?.value || '';
  if(val) return; // 입력 중이면 히스토리 안 보임
  const el = document.getElementById(listId);
  if(!el) return;
  el.innerHTML = h.map(v =>
    `<div class="ac-item ac-history" onmousedown="event.preventDefault();document.getElementById('${inputId}').value='${v}';document.getElementById('${listId}').style.display='none'">
      <span style="color:var(--text3);margin-right:6px;font-size:10px">🕐</span>${v}
    </div>`
  ).join('');
  el.style.display = 'block';
  el.className = 'ac-dropdown open';
}

// ── 즐겨찾기 드래그 순서 변경 ──
let _favDragIdx = null;

function favDragStart(e, idx){
  _favDragIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
}
function favDragEnd(e){
  e.currentTarget.style.opacity = '1';
}
function favDragOver(e, idx){
  e.preventDefault();
  if(_favFilterCat!=='all')return; // 필터링 중에는 순서 변경 비활성화 (인덱스 꼬임 방지)
  if(_favDragIdx === null || _favDragIdx === idx) return;
  const favs = JSON.parse(localStorage.getItem('nimbi_favs') || '[]');
  const moved = favs.splice(_favDragIdx, 1)[0];
  favs.splice(idx, 0, moved);
  localStorage.setItem('nimbi_favs', JSON.stringify(favs));
  _favDragIdx = idx;
  renderFavs();
}

function jumpToTrain(no){
  closeMyPage();
  document.getElementById('input-trainno').value=no;
  switchTab('train');searchByTrain();
  window.scrollTo({top:0,behavior:'smooth'});
}


// ── 노선도 ──
let _mapCurrentLine = null;
let _mapStnPos = {};
let _mapSvgSize = {w:0,h:0,ox:0,oy:0};
let _mapTrainInterval = null;
let _mapLayerMode = 'station'; // 'station': 역 우선, 'train': 열차 우선
let _mapDirFilter = 'both'; // 'both': 전체, 'down': 하행만, 'up': 상행만
let _mapGradeFilter = null; // null=전체, 'KTX', 'SRT', 'ITX', '무궁화'
let _mapTrackedTrain = null; // 현재 추적 중인 열차 번호
let _mapStatusColor = false;  // 038: 혼잡도에 따른 열차 상태색 표시 on/off
function toggleMapStatusColor(){
  _mapStatusColor=!_mapStatusColor;
  const btn=document.getElementById('map-status-color-btn');
  if(btn) btn.classList.toggle('active',_mapStatusColor);
  if(_mapCurrentLine) updateMapTrains();
}
// 열차 혼잡도 → 상태색 (매진임박 빨강 · 혼잡 주황 · 보통 노랑 · 여유 초록)
function _mapCongColor(t){
  try{
    const dep=t.stops[0]?.dep||t.stops[0]?.arr;
    const rate=(typeof calcRealisticFillRate==='function')?calcRealisticFillRate(t.no,todayLocalStr(),dep,t.grade):0.5;
    return rate>=0.9?'#ef4444':rate>=0.78?'#f97316':rate>=0.62?'#e3b341':'#3fb950';
  }catch(e){ return GRADE_COLORS[t.grade]||'#888'; }
}
let _mapTimelineMin = null; // null=실시간, 0~1439=재생 시각(분)
let _mapTimelinePlaying = false;
let _mapTimelinePlayInterval = null;
let _mapTimelineSpeed = 30; // 분/초

function toggleMapFilterPanel(){
  const panel=document.getElementById('map-filter-panel');
  const arrow=document.getElementById('map-filter-arrow');
  const btn=document.getElementById('map-filter-toggle-btn');
  if(!panel) return;
  const open=panel.style.display!=='none';
  panel.style.display=open?'none':'block';
  if(arrow) arrow.textContent=open?'▾':'▴';
  if(btn) btn.classList.toggle('map-filter-toggle-active',!open);
}

function toggleMapLayer(){
  _mapLayerMode = _mapLayerMode==='station'?'train':'station';
  const btn=document.getElementById('map-layer-btn');
  if(btn) btn.textContent=_mapLayerMode==='station'?'🚉 역 우선':'🚆 열차 우선';
  if(_mapCurrentLine) updateMapTrains();
}

function setMapDir(dir){
  // 버튼 상태 업데이트
  const btnDown=document.getElementById('map-dir-down');
  const btnUp=document.getElementById('map-dir-up');
  const btnAll=document.getElementById('map-dir-all');

  if(dir==='all'){
    // 전체: 둘 다 활성
    _mapDirFilter='both';
    if(btnDown)btnDown.classList.add('active');
    if(btnUp)btnUp.classList.add('active');
    if(btnAll)btnAll.classList.add('active');
  } else if(dir==='down'){
    // 하행 토글
    const isActive=btnDown&&btnDown.classList.contains('active');
    if(isActive&&_mapDirFilter!=='down'){
      // 하행만
      _mapDirFilter='down';
      if(btnDown)btnDown.classList.add('active');
      if(btnUp)btnUp.classList.remove('active');
      if(btnAll)btnAll.classList.remove('active');
    } else if(isActive){
      // 다시 전체로
      _mapDirFilter='both';
      if(btnDown)btnDown.classList.add('active');
      if(btnUp)btnUp.classList.add('active');
      if(btnAll)btnAll.classList.add('active');
    } else {
      _mapDirFilter='down';
      if(btnDown)btnDown.classList.add('active');
      if(btnUp)btnUp.classList.remove('active');
      if(btnAll)btnAll.classList.remove('active');
    }
  } else {
    // 상행 토글
    const isActive=btnUp&&btnUp.classList.contains('active');
    if(isActive&&_mapDirFilter!=='up'){
      _mapDirFilter='up';
      if(btnDown)btnDown.classList.remove('active');
      if(btnUp)btnUp.classList.add('active');
      if(btnAll)btnAll.classList.remove('active');
    } else if(isActive){
      _mapDirFilter='both';
      if(btnDown)btnDown.classList.add('active');
      if(btnUp)btnUp.classList.add('active');
      if(btnAll)btnAll.classList.add('active');
    } else {
      _mapDirFilter='up';
      if(btnDown)btnDown.classList.remove('active');
      if(btnUp)btnUp.classList.add('active');
      if(btnAll)btnAll.classList.remove('active');
    }
  }
  if(_mapCurrentLine) updateMapTrains();
}

function setMapGrade(grade){
  _mapGradeFilter = grade==='all' ? null : grade;
  const MAP_GRADE={all:null,ktx:'KTX',srt:'SRT',itx:'ITX',mgg:'무궁화'};
  Object.entries(MAP_GRADE).forEach(([k,v])=>{
    const b=document.getElementById('map-grade-'+k);
    if(!b)return;
    b.classList.toggle('active',_mapGradeFilter===v);
  });
  if(_mapCurrentLine) updateMapTrains();
}

// ── 타임라인 재생 ──
function toggleMapTimeline(){
  const bar=document.getElementById('map-timeline-bar');
  const btn=document.getElementById('map-timeline-toggle');
  if(!bar)return;
  const showing=bar.style.display!=='none';
  if(showing){
    pauseMapTimeline();
    _mapTimelineMin=null;
    bar.style.display='none';
    if(btn)btn.classList.remove('active');
    if(_mapCurrentLine) updateMapTrains();
  } else {
    const now=new Date();
    _mapTimelineMin=now.getHours()*60+now.getMinutes();
    bar.style.display='';
    if(btn)btn.classList.add('active');
    _syncTimelineUI();
    if(_mapCurrentLine) updateMapTrains();
  }
}

function _syncTimelineUI(){
  if(_mapTimelineMin===null)return;
  const slider=document.getElementById('map-timeline-slider');
  if(slider) slider.value=_mapTimelineMin;
  const timeEl=document.getElementById('map-timeline-time');
  if(timeEl){
    const h=Math.floor(_mapTimelineMin/60), m=_mapTimelineMin%60;
    timeEl.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
}

function seekMapTimeline(min){
  _mapTimelineMin=Math.max(0,Math.min(1439,min));
  _syncTimelineUI();
  if(_mapCurrentLine) updateMapTrains();
}

function toggleMapTimelinePlay(){
  if(_mapTimelinePlaying) pauseMapTimeline();
  else playMapTimeline();
}

function playMapTimeline(){
  _mapTimelinePlaying=true;
  const btn=document.getElementById('map-timeline-play-btn');
  if(btn) btn.textContent='⏸ 일시정지';
  if(_mapTimelinePlayInterval) clearInterval(_mapTimelinePlayInterval);
  _mapTimelinePlayInterval=setInterval(()=>{
    if(_mapTimelineMin===null) _mapTimelineMin=0;
    _mapTimelineMin+=_mapTimelineSpeed;
    if(_mapTimelineMin>=1440){
      _mapTimelineMin=1439;
      pauseMapTimeline();
    }
    _syncTimelineUI();
    if(_mapCurrentLine) updateMapTrains();
  },1000);
}

function pauseMapTimeline(){
  _mapTimelinePlaying=false;
  const btn=document.getElementById('map-timeline-play-btn');
  if(btn) btn.textContent='▶ 재생';
  if(_mapTimelinePlayInterval){clearInterval(_mapTimelinePlayInterval);_mapTimelinePlayInterval=null;}
}

function setTimelineSpeed(speed){
  _mapTimelineSpeed=speed;
}

function resetMapTimeline(){
  pauseMapTimeline();
  const now=new Date();
  seekMapTimeline(now.getHours()*60+now.getMinutes());
}

// 등급별 색상 (KTX-산천/이음은 KTX와 동일, ITX-마음은 ITX-새마을과 동일)
const GRADE_COLORS = {
  'KTX':'#3b82f6','KTX-산천':'#3b82f6','KTX-이음':'#3b82f6',
  'SRT':'#a855f7',
  'ITX-새마을':'#ef4444','ITX-마음':'#ef4444',
  'ITX-청춘':'#22c55e',
  '무궁화호':'#f97316',
  '남도해양':'#38bdf8'
};

// 노선명 → MAP_LINES 키, 노선별 인접역 쌍 캐시 (구간 소속 판별용)
const _lineNameToKey={'경부선':'gyeongbu','경부고속선':'gyeongbuhs','호남고속선':'honamhs','호남선':'honam','전라선':'jeolla','중앙선':'jungang','동해선':'donghae','영동선':'yeongdong','강릉선':'gangreung','중부내륙선':'jungnaelyuk','경전선':'gyeongjeon','충북선':'chungbuk','장항선':'janghang','남부내륙선':'nambunaelyuk','태안선':'taean','소백선':'sobaek','경북선':'gyeongbuk','태백선':'taebaek','정선선':'jeongseon'};
const _mapEdgeCache={};
function _mapLineEdgeSet(key){
  if(_mapEdgeCache[key])return _mapEdgeCache[key];
  const ml=MAP_LINES[key], e=new Set();
  if(ml)(ml.routes||[]).forEach(r=>{for(let i=0;i<r.stations.length-1;i++){e.add(r.stations[i].n+'|'+r.stations[i+1].n);e.add(r.stations[i+1].n+'|'+r.stations[i].n);}});
  return _mapEdgeCache[key]=e;
}

function updateMapTrains(){
  if(!_mapCurrentLine)return;
  const svgEl=document.querySelector('#map-svg-wrap svg');
  if(!svgEl)return;

  // 기존 열차 레이어 제거
  const old=svgEl.querySelector('#train-layer');
  if(old)old.remove();

  const now=new Date();
  // 034: 초 단위까지 반영해 위치를 부드럽게 보간
  const nowMin = _mapTimelineMin !== null ? _mapTimelineMin : now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const isAll=_mapCurrentLine==='all'; // 🛰️ 관제 모드: 전 노선·전 열차
  const line=isAll?{name:'__all__'}:MAP_LINES[_mapCurrentLine];
  if(!line)return;

  // 이 노선에 속하는 운행 중 열차 수집
  const running=[];
  ALL_TRAINS.forEach(t=>{
    if(!isAll&&!t.line.includes(line.name))return;
    const status=getCurrentStatus(t, nowMin);
    if(!status||status.status!=='running')return;
    // 방향 필터
    if(_mapDirFilter==='down'&&t.dir!=='down')return;
    if(_mapDirFilter==='up'&&t.dir!=='up')return;
    // 등급 필터
    if(_mapGradeFilter){
      const gradeMatch={
        'KTX':['KTX','KTX-산천','KTX-이음'],
        'SRT':['SRT'],
        'ITX':['ITX-새마을','ITX-마음','ITX-청춘'],
        '무궁화':['무궁화호','남도해양']
      };
      if(!gradeMatch[_mapGradeFilter]?.includes(t.grade))return;
    }
    // prevStn 또는 nextStn 또는 atStn의 좌표 구하기
    const stnA=status.atStn||status.prevStn;
    const stnB=status.atStn?null:status.nextStn;
    let posA=_mapStnPos[stnA];
    let posB=stnB?_mapStnPos[stnB]:null;
    if(isAll){
      // 관제: 동명이역 오배치 방지 — 열차 소속 노선의 좌표 우선
      const lp=_mapLinePos(), mk=t.line.split('·').map(s=>_lineNameToKey[s.trim()]).filter(Boolean);
      for(const k of mk){const q=lp[k]&&lp[k][stnA];if(q){posA={x:q.x+_mapSvgSize.ox,y:q.y+_mapSvgSize.oy};break;}}
      if(stnB)for(const k of mk){const q=lp[k]&&lp[k][stnB];if(q){posB={x:q.x+_mapSvgSize.ox,y:q.y+_mapSvgSize.oy};break;}}
    }
    if(!posA)return;
    // 현재 구간이 이 열차가 이용하는 '다른' 노선의 인접 구간이면 그 노선 소속 → 이 지도에서 숨김
    // (예: 호남고속선 KTX의 전주~정읍이 호남선 지도에 잘못 뜨는 것 방지. 단일 노선 급행은 영향 없음)
    // 단, 추적 중인 열차는 운행 구간 전용 뷰이므로 어느 노선 구간이든 항상 표시
    if(stnB && !isAll && !_mapTrackedTrain){
      const others=t.line.split('·').map(s=>s.trim()).filter(n=>n&&n!==line.name);
      if(others.some(n=>{const k=_lineNameToKey[n];return k&&_mapLineEdgeSet(k).has(stnA+'|'+stnB);}))return;
    }
    // 위치: atStn이면 그 역에, 이동 중이면 두 역 사이 중간
    let px,py;
    if(posB){
      // 두 역 사이 진행률 계산
      const all=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
      const iA=all.findIndex(s=>s.s===stnA);
      const iB=all.findIndex(s=>s.s===stnB);
      let progress=0.5;
      if(iA>=0&&iB>=0){
        const depA=toMin(all[iA].dep||all[iA].arr);
        const arrB=toMin(all[iB].arr||all[iB].dep);
        if(depA!==null&&arrB!==null&&arrB>depA){
          let nM=nowMin;
          if(depA>nowMin+60)nM+=1440; // 자정 보정
          progress=Math.min(1,Math.max(0,(nM-depA)/(arrB-depA)));
        }
      }
      px=posA.x+(posB.x-posA.x)*progress;
      py=posA.y+(posB.y-posA.y)*progress;
    } else {
      px=posA.x; py=posA.y;
    }
    running.push({t,px,py,status,stnA,stnB,posA,posB});
  });

  // 추적 모드: 추적 열차 + 교행(반대 방향으로 스쳐 갈) 열차 표시 / 일반 모드: 전체 표시
  let displayTrains;
  if(_mapTrackedTrain){
    const trk=running.find(x=>x.t.no===_mapTrackedTrain);
    const pathSet=trk?new Set(trk.t.stops.map(s=>s.s)):null;
    displayTrains=running.filter(x=>{
      if(x.t.no===_mapTrackedTrain)return true;
      return !!(pathSet&&x.t.dir!==trk.t.dir&&pathSet.has(x.stnA)&&(!x.stnB||pathSet.has(x.stnB)));
    });
  } else displayTrains=running;

  // 열차 레이어를 SVG 문자열로 생성
  const r=Math.max(6, _mapSvgSize.w*0.018);
  const fs=Math.max(9, _mapSvgSize.w*0.016);
  let layerHtml='<g id="train-layer">';
  displayTrains.forEach(({t,px,py,status,stnA,stnB,posA,posB})=>{
    const gradeColor=GRADE_COLORS[t.grade]||'#888';
    const color=_mapStatusColor?_mapCongColor(t):gradeColor;
    const isTracked=!!(_mapTrackedTrain&&t.no===_mapTrackedTrain);
    const isOncoming=!!(_mapTrackedTrain&&!isTracked); // 교행 열차: 작고 옅게
    const cr=isTracked?r*1.7:(isOncoming?r*0.75:r);

    if(isTracked){
      // 외부 pulse 링
      layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(cr+6).toFixed(1)}"
        fill="none" stroke="${color}" stroke-width="2.5" opacity="0.45" pointer-events="none"/>`;
      // 진행 방향 화살표 (이동 중인 경우)
      if(posA&&posB){
        const dx=posB.x-posA.x, dy=posB.y-posA.y;
        const ang=Math.atan2(dy,dx)*180/Math.PI;
        layerHtml+=`<text x="${px.toFixed(1)}" y="${py.toFixed(1)}"
          text-anchor="middle" dominant-baseline="central"
          font-size="${(cr*0.9).toFixed(1)}" fill="#fff" pointer-events="none"
          transform="rotate(${ang.toFixed(0)},${px.toFixed(1)},${py.toFixed(1)})">▶</text>`;
      }
      // 현재 위치 텍스트 (가장 위)
      const posLabel=status.atStn?`📍 ${status.atStn} 정차`
        :(status.prevStn&&status.nextStn?`📍 ${status.prevStn}→${status.nextStn}`:'📍 운행 중');
      layerHtml+=`<text x="${px.toFixed(1)}" y="${(py-cr-fs*1.5-4).toFixed(1)}"
        text-anchor="middle" font-size="${(fs*0.95).toFixed(1)}" fill="#fff"
        font-family="Noto Sans KR,sans-serif" font-weight="500"
        pointer-events="none" paint-order="stroke" stroke="#0d1117" stroke-width="3">${posLabel}</text>`;
    }

    layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${cr.toFixed(1)}"
      fill="${color}" stroke="${isTracked?'#fff':'#0d1117'}" stroke-width="${isTracked?3:2}" ${isOncoming?'opacity="0.55"':''}
      style="cursor:pointer" class="train-dot${isTracked?' tracked-train':''}" data-no="${t.no}"/>`;
    layerHtml+=`<text x="${px.toFixed(1)}" y="${(py-cr-3).toFixed(1)}"
      text-anchor="middle" font-size="${isTracked?(fs*1.15).toFixed(1):(isOncoming?(fs*0.85).toFixed(1):fs)}" fill="${color}" ${isOncoming?'opacity="0.6"':''}
      font-family="Noto Sans KR,sans-serif" font-weight="${isTracked?'800':'600'}"
      pointer-events="none" paint-order="stroke" stroke="${isTracked?'#0d1117':'none'}" stroke-width="2">${isOncoming?'⇄ ':''}${t.no}</text>`;
  });
  layerHtml+='</g>';

  // 열차 레이어를 역 히트 영역보다 아래에 삽입
  // (역 클릭이 열차 클릭보다 우선되도록)
  const tempDiv=document.createElement('div');
  tempDiv.innerHTML=`<svg>${layerHtml}</svg>`;
  const newLayer=tempDiv.querySelector('g');
  if(newLayer){
    // 첫 번째 circle(역 히트 영역) 앞에 삽입
    const firstHit=svgEl.querySelector('circle[fill="transparent"]');
    if(firstHit) svgEl.insertBefore(newLayer, firstHit);
    else svgEl.appendChild(newLayer);
  }

  // 클릭 이벤트 등록
  svgEl.querySelectorAll('.train-dot').forEach(dot=>{
    const no=dot.getAttribute('data-no');
    const entry=displayTrains.find(r=>r.t.no===no);
    if(entry) dot.addEventListener('click',()=>openMapTrainPopup(entry.t, entry.status));
  });
  // 레이어 모드에 따라 역/열차 우선순위 결정
  if(_mapLayerMode==='station'){
    // 역 우선: 역 히트 영역을 맨 위로
    const hitCircles=[...svgEl.querySelectorAll('circle[fill="transparent"]')];
    hitCircles.forEach(c=>svgEl.appendChild(c));
  } else {
    // 열차 우선: 열차 레이어를 맨 위로
    const trainLayer=svgEl.querySelector('#train-layer');
    if(trainLayer) svgEl.appendChild(trainLayer);
  }

  // 운행 열차 수 / 추적 상태 업데이트
  const countEl=document.getElementById('map-train-count');
  if(countEl){
    countEl.textContent = _mapTrackedTrain
      ? `📍 ${_mapTrackedTrain} 추적 중`
      : `운행 중 ${running.length}편`;
  }
}

function openMapTrainPopup(t, status){
  _mapCurrentStn=null;
  const valid=t.stops.filter(s=>s.arr||s.dep);
  const originStn=valid[0]?.s, terminusStn=valid[valid.length-1]?.s;
  const first=valid[0];
  const last=valid[valid.length-1];
  const depTime=first?(hasTime(first.dep)?first.dep:hasTime(first.arr)?first.arr:'-'):'-';
  const arrTime=last?(hasTime(last.arr)?last.arr:hasTime(last.dep)?last.dep:'-'):'-';
  let posText='운행 중';
  if(status.atStn)posText=`${status.atStn}역 정차 중`;
  else if(status.passStn)posText=`${status.passStn}역 통과 중`;
  else if(status.prevStn&&status.nextStn)posText=`${status.prevStn} → ${status.nextStn}`;
  const color=GRADE_COLORS[t.grade]||'#888';
  document.getElementById('map-popup-name').innerHTML=
    `<span style="color:${color}">${t.grade} ${t.no}</span>`;
  document.getElementById('map-popup-sub').textContent=
    `${originStn}(${depTime}) → ${terminusStn}(${arrTime})`;
  document.getElementById('map-popup-trains').innerHTML=
    `<div>현재위치: <b>${posText}</b></div>
     <div style="margin-top:4px">${t.line} · ${t.dest}행</div>`;
  // 버튼을 열차 조회로 변경
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){
    popupBtn.textContent='🔢 열차 조회';
    popupBtn.onclick=(e)=>{e.preventDefault();jumpToTrain(t.no);closeMapPopup();};
  }
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}

// 역 클릭 팝업 (역 정보로 넘어가기 전 먼저 표시)
function openMapPopup(stn, lineName){
  _mapCurrentStn=stn;
  const trains=ALL_TRAINS.filter(t=>t.stops.some(s=>s.s===stn&&(s.dep||s.arr)));
  const lineSet=[...new Set(trains.flatMap(t=>t.line.split('·')))];
  const gcc={}; trains.forEach(t=>{gcc[t.grade]=(gcc[t.grade]||0)+1;});
  const gradeStr=Object.entries(gcc).sort((a,b)=>b[1]-a[1]).map(([g,n])=>`${g} ${n}편`).join(' · ')||'경유 열차 없음';
  document.getElementById('map-popup-name').innerHTML=`<span>${stn}</span>`;
  if(_appMode==='metro'){
    // 전철 노선도: 환승 전철 노선 + 기차 환승 안내
    const xf=_metroXferLines(stn, _metroMapId);
    const chips=xf.map(l=>`<span onclick="closeMapPopup();showMetroMap('${l.id}')" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9px;background:var(--bg3);border:1px solid ${l.color};font-size:11px;font-weight:700;color:var(--text1)"><span style="width:8px;height:8px;border-radius:50%;background:${l.color};flex-shrink:0"></span>${l.name}</span>`).join('');
    const trainNote=trains.length?`<div style="margin-top:6px">🚆 기차 환승 · ${gradeStr}</div>`:'';
    document.getElementById('map-popup-sub').textContent=(lineName?lineName+' · ':'')+(xf.length?`환승 ${xf.length}개 노선`:'환승 노선 없음');
    document.getElementById('map-popup-trains').innerHTML=
      (xf.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div>`:'')+trainNote;
  } else {
    document.getElementById('map-popup-sub').textContent=(lineName?lineName+' · ':'')+`${trains.length}편 경유`;
    document.getElementById('map-popup-trains').innerHTML=
      `<div>${lineSet.slice(0,4).join(' · ')}${lineSet.length>4?' 외':''}</div>
       <div style="margin-top:4px">${gradeStr}</div>`;
  }
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){ popupBtn.textContent='🚉 역 정보 보기'; popupBtn.onclick=(e)=>{if(e)e.preventDefault();goToMapStation();}; }
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}
// 팝업 → 역 정보 탭으로 이동
function goToMapStation(){
  const s=_mapCurrentStn;
  closeMapPopup();
  if(s) openStationDetail(s);
}

// 역 팝업 닫힐 때 버튼 원상복구
function closeMapPopup(){
  document.getElementById('map-popup').style.display='none';
  document.getElementById('map-backdrop').style.display='none';
  // 버튼 원래대로 복구 (역 시간표 보기)
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){
    popupBtn.textContent='🏢 시간표 보기';
    popupBtn.onclick=()=>goToMapStation();
  }
  _mapCurrentStn=null;
}

// 60초마다 열차 위치 갱신
setInterval(()=>{
  if(_mapCurrentLine&&document.getElementById('panel-map').classList.contains('active')){
    updateMapTrains();
  }
},3500);

const MAP_LINES = {

gyeongbu:{
  name:'경부선', color:'#e3b341',
  routes:[
    {color:'#e3b341', stations:[
    {n:'서울',x:198,y:124},
    {n:'한강로',x:196,y:131},
    {n:'남안양',x:190,y:176},
    {n:'수원',x:204,y:208},
    {n:'오산',x:220,y:243},
    {n:'평택',x:225,y:289},
    {n:'천안',x:239,y:342},
    {n:'목천',x:258,y:352},
    {n:'병천',x:277,y:356},
    {n:'북청주',x:303,y:373},
    {n:'서청주',x:318,y:389},
    {n:'상당',x:321,y:400},
    {n:'문의',x:321,y:426},
    {n:'신탄진',x:305,y:448},
    {n:'회덕',x:305,y:465},
    {n:'대전',x:307,y:482},
    {n:'판암',x:312,y:487},
    {n:'세천',x:320,y:480},
    {n:'옥천',x:339,y:495},
    {n:'이원',x:353,y:507},
    {n:'심천',x:372,y:517},
    {n:'영동',x:389,y:528},
    {n:'황간',x:420,y:514},
    {n:'추풍령',x:439,y:517},
    {n:'봉산',x:446,y:533},
    {n:'김천',x:470,y:542},
    {n:'구미',x:522,y:542},
    {n:'약목',x:526,y:568},
    {n:'서왜관',x:532,y:582},
    {n:'하빈',x:539,y:611},
    {n:'호림',x:553,y:627},
    {n:'남대구',x:567,y:635},
    {n:'경산',x:616,y:636},
    {n:'운문',x:656,y:663},
    {n:'언양',x:705,y:707},
    {n:'동양산',x:715,y:752},
    {n:'북부산',x:699,y:792},
    {n:'동래',x:695,y:811},
    {n:'부산',x:687,y:837}
    ]}
  ]
},

gyeongbuhs:{
  name:'경부고속선', color:'#388bfd',
  routes:[
    {color:'#388bfd', stations:[
    {n:'서울',x:198,y:124},
    {n:'한강로',x:196,y:131},
    {n:'병목안',x:181,y:177},
    {n:'수영',x:194,y:217},
    {n:'천안',x:239,y:342},
    {n:'정안',x:231,y:403},
    {n:'세종',x:266,y:430},
    {n:'대전',x:307,y:482},
    {n:'산내',x:315,y:497},
    {n:'영동',x:389,y:528},
    {n:'구미',x:522,y:542},
    {n:'남대구',x:567,y:635},
    {n:'청도',x:615,y:683},
    {n:'부산',x:687,y:837}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'잠실',x:228,y:136},
    {n:'수진',x:235,y:159},
    {n:'동탄',x:225,y:230},
    {n:'천안',x:239,y:342}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'서인천',x:114,y:147},
    {n:'연수',x:129,y:168},
    {n:'안산',x:154,y:190},
    {n:'원평',x:187,y:214},
    {n:'천안',x:239,y:342}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'남대구',x:567,y:635},
    {n:'포항',x:757,y:547}
    ]},
    {color:'#388bfd', stations:[
    {n:'청도',x:615,y:683},
    {n:'창녕',x:558,y:713}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'마포',x:187,y:140},
    {n:'서울',x:198,y:124}
    ]}
  ]
},

honamhs:{
  name:'호남고속선', color:'#26a69a',
  routes:[
    {color:'#26a69a', stations:[
    {n:'천안',x:239,y:342},
    {n:'정안',x:231,y:403},
    {n:'공주',x:222,y:480},
    {n:'전주',x:231,y:631},
    {n:'정읍',x:167,y:704},
    {n:'광주',x:155,y:831}
    ]}
  ]
},

honam:{
  name:'호남선', color:'#3fb950',
  routes:[
    {color:'#3fb950', stations:[
    {n:'회덕',x:305,y:465},
    {n:'서대전',x:300,y:485},
    {n:'남대전',x:294,y:493},
    {n:'계룡',x:267,y:499},
    {n:'논산',x:224,y:518},
    {n:'연무',x:227,y:542},
    {n:'여산',x:224,y:563},
    {n:'봉동',x:231,y:595},
    {n:'전주',x:231,y:631},
    {n:'중인',x:227,y:646},
    {n:'남김제',x:204,y:661},
    {n:'신태인',x:177,y:669},
    {n:'정읍',x:167,y:704},
    {n:'입암',x:157,y:724},
    {n:'북이',x:158,y:748},
    {n:'장성',x:157,y:790},
    {n:'광주',x:155,y:831},
    {n:'나산',x:111,y:839},
    {n:'함평',x:90,y:853},
    {n:'무안',x:79,y:877},
    {n:'도림',x:70,y:899},
    {n:'목포',x:60,y:932}
    ]}
  ]
},

jeolla:{
  name:'전라선', color:'#ec4899',
  routes:[
    {color:'#ec4899', stations:[
    {n:'전주',x:231,y:631},
    {n:'운암',x:243,y:679},
    {n:'임실',x:269,y:693},
    {n:'오수',x:283,y:714},
    {n:'남원',x:292,y:754},
    {n:'구례',x:314,y:811},
    {n:'황전',x:312,y:835},
    {n:'북순천',x:319,y:877},
    {n:'순천',x:323,y:888},
    {n:'율촌',x:339,y:907},
    {n:'여수공항',x:349,y:919},
    {n:'여천',x:361,y:936},
    {n:'여수',x:381,y:944}
    ]}
  ]
},

jungang:{
  name:'중앙선', color:'#56d0e0',
  routes:[
    {color:'#56d0e0', stations:[
    {n:'청량리',x:216,y:117},
    {n:'중랑',x:224,y:112},
    {n:'도농',x:243,y:108},
    {n:'덕소',x:254,y:116},
    {n:'양수',x:280,y:128},
    {n:'양평',x:319,y:143},
    {n:'지정',x:411,y:177},
    {n:'원주',x:427,y:182},
    {n:'신림',x:459,y:219},
    {n:'제천',x:488,y:249},
    {n:'매포',x:511,y:277},
    {n:'단양',x:522,y:294},
    {n:'풍기',x:566,y:322},
    {n:'영주',x:588,y:342},
    {n:'문수',x:590,y:353},
    {n:'옹천',x:605,y:380},
    {n:'안동',x:611,y:415},
    {n:'의성',x:604,y:477},
    {n:'금성',x:600,y:503},
    {n:'이화',x:601,y:522},
    {n:'화본',x:605,y:546},
    {n:'신녕',x:628,y:565},
    {n:'영천',x:657,y:590},
    {n:'건천',x:701,y:622}
    ]},
    {color:'#56d0e0', dash:true, stations:[
    {n:'건천',x:701,y:622},
    {n:'경주',x:732,y:627}
    ]},
    {color:'#56d0e0', dash:true, stations:[
    {n:'신녕',x:628,y:565},
    {n:'하양',x:635,y:606},
    {n:'경산',x:616,y:636},
    {n:'남대구',x:567,y:635}
    ]}
  ]
},

chungbuk:{
  name:'충북선', color:'#e0873a',
  routes:[
    {color:'#e0873a', stations:[
    {n:'서청주',x:318,y:389},
    {n:'내수',x:334,y:365},
    {n:'증평',x:344,y:352},
    {n:'괴산',x:392,y:342},
    {n:'목도',x:407,y:325},
    {n:'충주',x:419,y:294},
    {n:'제천',x:488,y:249}
    ]}
  ]
},

janghang:{
  name:'장항선', color:'#9d7ad4',
  routes:[
    {color:'#9d7ad4', stations:[
    {n:'천안',x:239,y:342},
    {n:'아산',x:212,y:357},
    {n:'예산',x:168,y:384},
    {n:'홍북',x:136,y:396},
    {n:'홍성',x:129,y:409},
    {n:'광천',x:121,y:438},
    {n:'청소',x:113,y:453},
    {n:'주포',x:108,y:466},
    {n:'보령',x:113,y:484},
    {n:'서천',x:134,y:556},
    {n:'군산',x:142,y:584},
    {n:'대야',x:161,y:595},
    {n:'익산',x:195,y:599},
    {n:'삼례',x:223,y:602},
    {n:'전주',x:231,y:631}
    ]},
    {color:'#9d7ad4', dash:true, stations:[
    {n:'삼례',x:223,y:602},
    {n:'봉동',x:231,y:595}
    ]}
  ]
},

donghae:{
  name:'동해선', color:'#3fb994',
  routes:[
    {color:'#3fb994', stations:[
    {n:'강릉',x:653,y:62},
    {n:'남강릉',x:666,y:74},
    {n:'옥계',x:688,y:104},
    {n:'동해',x:705,y:134},
    {n:'북평',x:706,y:148},
    {n:'삼척',x:714,y:156},
    {n:'근덕',x:733,y:188},
    {n:'원덕',x:755,y:236},
    {n:'부구',x:765,y:257},
    {n:'울진',x:770,y:288},
    {n:'평해',x:780,y:366},
    {n:'영해',x:772,y:422},
    {n:'영덕',x:765,y:460},
    {n:'강구',x:766,y:475},
    {n:'청하',x:757,y:522},
    {n:'포항',x:757,y:547},
    {n:'안강',x:731,y:582},
    {n:'경주',x:732,y:627},
    {n:'불국사',x:747,y:645},
    {n:'입실',x:752,y:663},
    {n:'북울산',x:759,y:689},
    {n:'태화강',x:760,y:714},
    {n:'울주',x:741,y:750},
    {n:'좌천',x:733,y:780},
    {n:'기장',x:728,y:801},
    {n:'해운대',x:711,y:824},
    {n:'부산',x:687,y:837}
    ]},
    {color:'#3fb994', dash:true, stations:[
    {n:'안강',x:731,y:582},
    {n:'건천',x:701,y:622}
    ]}
  ]
},

yeongdong:{
  name:'영동선', color:'#eab308',
  routes:[
    {color:'#eab308', stations:[
    {n:'태백황지',x:673,y:233},
    {n:'황지',x:673,y:235},
    {n:'구문소',x:682,y:257},
    {n:'석포',x:691,y:273},
    {n:'승부',x:695,y:283},
    {n:'소천',x:677,y:304},
    {n:'춘양',x:656,y:306},
    {n:'법전',x:647,y:312},
    {n:'봉화',x:612,y:318},
    {n:'영주',x:588,y:342}
    ]}
  ]
},

gangreung:{
  name:'강릉선', color:'#a855f7',
  routes:[
    {color:'#a855f7', stations:[
    {n:'원주',x:427,y:182},
    {n:'남횡성',x:480,y:164},
    {n:'방림',x:514,y:155},
    {n:'평창',x:549,y:142},
    {n:'진부',x:573,y:100},
    {n:'대관령',x:606,y:87},
    {n:'강릉',x:653,y:62}
    ]}
  ]
},

gyeongjeon:{
  name:'경전선', color:'#ef4444',
  routes:[
    {color:'#ef4444', stations:[
    {n:'부산',x:687,y:837},
    {n:'장유',x:632,y:820},
    {n:'창원',x:599,y:809},
    {n:'함안',x:538,y:792},
    {n:'군북',x:523,y:792},
    {n:'진주',x:466,y:820},
    {n:'횡천',x:396,y:840},
    {n:'하동',x:382,y:852},
    {n:'진상',x:375,y:866},
    {n:'남광양',x:369,y:893},
    {n:'순천',x:323,y:888},
    {n:'별량',x:310,y:910},
    {n:'동강',x:290,y:924},
    {n:'조성',x:262,y:928},
    {n:'보성',x:224,y:938},
    {n:'장흥',x:187,y:948},
    {n:'작천',x:150,y:958},
    {n:'영암',x:135,y:929},
    {n:'시종',x:112,y:911},
    {n:'일로',x:85,y:915},
    {n:'남악',x:78,y:926},
    {n:'목포',x:60,y:932}
    ]},
    {color:'#ef4444', dash:true, stations:[
    {n:'광주',x:155,y:831},
    {n:'빛가람',x:153,y:866},
    {n:'춘양',x:197,y:903},
    {n:'보성',x:224,y:938}
    ]},
    {color:'#ef4444', dash:true, stations:[
    {n:'함평',x:90,y:853},
    {n:'다시',x:122,y:871},
    {n:'춘양',x:197,y:903}
    ]}
  ]
},

jungnaelyuk:{
  name:'중부내륙선', color:'#84cc16',
  routes:[
    {color:'#84cc16', stations:[
    {n:'오산',x:220,y:243},
    {n:'죽산',x:304,y:264},
    {n:'일죽',x:317,y:258},
    {n:'장호원',x:354,y:253},
    {n:'돈산',x:390,y:260},
    {n:'충주',x:419,y:294},
    {n:'수안보',x:438,y:332},
    {n:'북문경',x:466,y:365},
    {n:'문경',x:486,y:406},
    {n:'상주',x:482,y:457},
    {n:'청리',x:471,y:481},
    {n:'김천',x:470,y:542}
    ]}
  ]
},

nambunaelyuk:{
  name:'남부내륙선', color:'#f97316',
  routes:[
    {color:'#f97316', stations:[
    {n:'약목',x:526,y:568},
    {n:'성주',x:507,y:601},
    {n:'운수',x:504,y:640},
    {n:'고령',x:505,y:657},
    {n:'쌍림',x:500,y:674},
    {n:'합천',x:482,y:706},
    {n:'대양',x:481,y:721},
    {n:'쌍백',x:475,y:743},
    {n:'삼가',x:470,y:752},
    {n:'단성',x:433,y:782},
    {n:'사천',x:462,y:849},
    {n:'고성',x:518,y:879},
    {n:'안정',x:537,y:888},
    {n:'통영',x:540,y:910},
    {n:'사등',x:555,y:905},
    {n:'고현',x:588,y:904}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'성주',x:507,y:601},
    {n:'하빈',x:539,y:611}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'단성',x:433,y:782},
    {n:'횡천',x:396,y:840},
    {n:'사천',x:462,y:849}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'단성',x:433,y:782},
    {n:'진주',x:466,y:820},
    {n:'사천',x:462,y:849}
    ]}
  ]
},

taean:{
  name:'태안선', color:'#d946ef',
  routes:[
    {color:'#d946ef', stations:[
    {n:'아산',x:212,y:357},
    {n:'합덕',x:150,y:347},
    {n:'당진',x:122,y:323},
    {n:'승산',x:100,y:324},
    {n:'서산',x:78,y:352},
    {n:'태안',x:44,y:364},
    {n:'남면',x:41,y:384},
    {n:'창기',x:50,y:414},
    {n:'안면도',x:53,y:430},
    {n:'고남',x:67,y:458},
    {n:'보령',x:113,y:484}
    ]}
  ]
},

sobaek:{
  name:'소백선', color:'#4f46e5',
  routes:[
    {color:'#4f46e5', stations:[
    {n:'영동',x:389,y:528},
    {n:'무주',x:363,y:578},
    {n:'남무주',x:359,y:620},
    {n:'계북',x:351,y:643},
    {n:'장계',x:343,y:659},
    {n:'장수(전북)',x:328,y:684},
    {n:'남산서',x:307,y:705},
    {n:'보절',x:300,y:723},
    {n:'남원',x:292,y:754},
    {n:'곡성',x:276,y:791},
    {n:'옥과',x:238,y:794},
    {n:'고서',x:205,y:807},
    {n:'광주',x:155,y:831}
    ]}
  ]
},

gyeongbuk:{
  name:'경북선', color:'#0ea5e9',
  routes:[
    {color:'#0ea5e9', stations:[
    {n:'상주',x:482,y:457},
    {n:'남문경',x:493,y:412},
    {n:'용궁',x:514,y:396},
    {n:'예천',x:548,y:388},
    {n:'장수',x:576,y:353},
    {n:'영주',x:588,y:342}
    ]}
  ]
},

taebaek:{
  name:'태백선', color:'#64748b',
  routes:[
    {color:'#64748b', stations:[
    {n:'제천',x:488,y:249},
    {n:'어상천',x:524,y:258},
    {n:'영월',x:554,y:234},
    {n:'신동(태백)',x:587,y:226},
    {n:'무릉',x:624,y:216},
    {n:'사북',x:635,y:221},
    {n:'고한',x:642,y:228},
    {n:'태백황지',x:673,y:233},
    {n:'도계',x:687,y:217},
    {n:'고사리',x:692,y:205},
    {n:'미로',x:702,y:170},
    {n:'삼척',x:714,y:156}
    ]}
  ]
},

jeongseon:{
  name:'정선선', color:'#f43f5e',
  routes:[
    {color:'#f43f5e', stations:[
    {n:'평창',x:549,y:142},
    {n:'북평(정선)',x:579,y:157},
    {n:'정선',x:600,y:174},
    {n:'화암',x:632,y:195},
    {n:'사북',x:635,y:221}
    ]}
  ]
},

};

// 인접 역이 너무 가까워 아이콘/텍스트가 겹치는 것 방지: 경로 방향 유지하며 최소 간격 확보
function spreadMapRoutes(routes){
  const MIN=18;
  // 역명 -> [{x0,y0,x,y}] — 동명이역(춘양 등)은 원좌표가 멀면 별개의 역으로 취급
  const adj={};
  const find=(n,x,y)=>{const a=adj[n];if(a)for(const e of a){if(Math.hypot(e.x0-x,e.y0-y)<30)return e;}return null;};
  const put=(n,x0,y0,x,y)=>{(adj[n]=adj[n]||[]).push({x0,y0,x,y});};
  return routes.map(r=>({...r, stations:r.stations.map((s,i,arr)=>{
    const hit=find(s.n,s.x,s.y);
    if(hit) return {...s, x:hit.x, y:hit.y};
    if(i===0){ put(s.n,s.x,s.y,s.x,s.y); return {...s}; }
    const pp=arr[i-1], prev=find(pp.n,pp.x,pp.y)||{x:pp.x,y:pp.y};
    let dx=s.x-prev.x, dy=s.y-prev.y, dl=Math.hypot(dx,dy), nx=s.x, ny=s.y;
    if(dl<MIN){
      if(dl<0.01){
        const p2=arr[i-2]; let ux=0,uy=1;
        if(p2){const q=find(p2.n,p2.x,p2.y)||{x:p2.x,y:p2.y};const vx=prev.x-q.x,vy=prev.y-q.y,vl=Math.hypot(vx,vy);if(vl>0.01){ux=vx/vl;uy=vy/vl;}}
        nx=prev.x+ux*MIN; ny=prev.y+uy*MIN;
      } else { nx=prev.x+dx/dl*MIN; ny=prev.y+dy/dl*MIN; }
    }
    put(s.n,s.x,s.y,nx,ny); return {...s, x:nx, y:ny};
  })}));
}
// ── 노선도 확대/축소 ──
let _mapZoomLv=1;
let _mapZoomCtlHidden=(()=>{try{return localStorage.getItem('nimbi_zoomctl')==='hide';}catch(e){return false;}})();
function _zoomCtlHTML(){
  return _mapZoomCtlHidden
    ? `<div class="map-zoom-ctl" id="map-zoom-ctl"><button onclick="toggleZoomCtl()" title="줌 버튼 펼치기" style="opacity:.55;font-size:14px">🔍</button></div>`
    : `<div class="map-zoom-ctl" id="map-zoom-ctl">
        <button onclick="mapZoom(0.35)" title="확대">＋</button>
        <button onclick="mapZoom(-0.35)" title="축소">－</button>
        <button onclick="mapZoomReset()" title="원래대로">⟲</button>
        <button onclick="toggleZoomCtl()" title="버튼 접기" style="font-size:12px;opacity:.7">✕</button>
      </div>`;
}
function toggleZoomCtl(){
  _mapZoomCtlHidden=!_mapZoomCtlHidden;
  try{localStorage.setItem('nimbi_zoomctl',_mapZoomCtlHidden?'hide':'show');}catch(e){}
  const c=document.getElementById('map-zoom-ctl');
  if(c)c.outerHTML=_zoomCtlHTML();
}
function _mapApplyZoom(keepCenter){
  const wrap=document.getElementById('map-svg-wrap');
  const svg=wrap?wrap.querySelector('svg'):null;
  if(!svg)return;
  // 중심 유지용 비율 기록
  let rx=0.5,ry=0.5;
  if(keepCenter&&wrap.scrollWidth>0){
    rx=(wrap.scrollLeft+wrap.clientWidth/2)/wrap.scrollWidth;
    ry=(wrap.scrollTop+wrap.clientHeight/2)/wrap.scrollHeight;
  }
  if(_mapZoomLv<=1.001){
    svg.style.width='100%';
    // 원래 min-width 복원 (svg 생성 시 인라인으로 지정돼 있음 — 건드리지 않음)
  } else {
    svg.style.width=(100*_mapZoomLv).toFixed(0)+'%';
  }
  if(keepCenter){
    requestAnimationFrame(()=>{
      wrap.scrollLeft=rx*wrap.scrollWidth-wrap.clientWidth/2;
      wrap.scrollTop=ry*wrap.scrollHeight-wrap.clientHeight/2;
    });
  }
}
function mapZoom(d){
  _mapZoomLv=Math.min(4,Math.max(1,+( _mapZoomLv+d).toFixed(2)));
  _mapApplyZoom(true);
  const zl=document.getElementById('map-zoom-label');
  if(zl) zl.textContent=Math.round(_mapZoomLv*100)+'%';
}
function mapZoomReset(){ _mapZoomLv=1; _mapApplyZoom(false); const w=document.getElementById('map-svg-wrap'); if(w){w.scrollLeft=0;w.scrollTop=0;} }
// 두 손가락 핀치 줌
function _mapBindPinch(){
  const wrap=document.getElementById('map-svg-wrap');
  if(!wrap||wrap._pinchBound)return;
  wrap._pinchBound=true;
  let d0=0,z0=1;
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      d0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      z0=_mapZoomLv;
    }
  },{passive:true});
  wrap.addEventListener('touchmove',e=>{
    if(e.touches.length===2&&d0>0){
      e.preventDefault();
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      _mapZoomLv=Math.min(4,Math.max(1,z0*d/d0));
      _mapApplyZoom(true);
    }
  },{passive:false});
  wrap.addEventListener('touchend',()=>{d0=0;},{passive:true});
}

// 전체 노선도 좌표 인덱스 (모든 MAP_LINES 역 → 원좌표, 추적 경로 오버레이용)
let _mapGlobalPosCache=null;
function _mapGlobalPos(){
  if(_mapGlobalPosCache)return _mapGlobalPosCache;
  const g={};
  for(const ml of Object.values(MAP_LINES))
    for(const r of ml.routes)
      for(const s of r.stations)
        if(!g[s.n])g[s.n]={x:s.x,y:s.y};
  return _mapGlobalPosCache=g;
}
// 노선별 좌표 인덱스 — 동명이역(예: 영동선 춘양 vs 경전선 춘양)을 라인 컨텍스트로 구분
let _mapLinePosCache=null;
function _mapLinePos(){
  if(_mapLinePosCache)return _mapLinePosCache;
  const o={};
  for(const [k,ml] of Object.entries(MAP_LINES)){
    const m={};
    ml.routes.forEach(r=>r.stations.forEach(s=>{if(!m[s.n])m[s.n]={x:s.x,y:s.y};}));
    o[k]=m;
  }
  return _mapLinePosCache=o;
}
// 추적 열차의 운행 경로를 노선별 구간(run)으로 분할 — 각 run은 해당 노선 색의 route가 됨
// 좌표는 구간이 속한 노선의 좌표를 우선 사용 (동명이역 오배치 방지)
function _trackedRouteRuns(t){
  const g=_mapGlobalPos();
  const lp=_mapLinePos();
  const keyStns={};
  for(const [k,ml] of Object.entries(MAP_LINES)) keyStns[k]=new Set(ml.routes.flatMap(r=>r.stations.map(s=>s.n)));
  const myKeys=t.line.split('·').map(s=>_lineNameToKey[s.trim()]).filter(Boolean);
  const segKey=(a,b)=>{
    for(const k of myKeys){ if(keyStns[k].has(a)&&keyStns[k].has(b))return k; }
    for(const k of Object.keys(MAP_LINES)){ if(keyStns[k].has(a)&&keyStns[k].has(b))return k; }
    return null;
  };
  const posFor=(name,k)=>(k&&lp[k]&&lp[k][name])||g[name]||null;
  const runs=[]; let cur=null, prevName=null;
  for(const st of t.stops){
    if(!g[st.s]&&!Object.keys(MAP_LINES).some(k=>lp[k][st.s]))continue;
    if(prevName){
      const k=segKey(prevName,st.s);
      const p0=posFor(prevName,k), p1=posFor(st.s,k);
      if(p0&&p1){
        if(!cur||cur._k!==k){
          cur={_k:k,color:(k&&MAP_LINES[k])?MAP_LINES[k].color:'#8b949e',stations:[{n:prevName,x:p0.x,y:p0.y}]};
          runs.push(cur);
        }
        cur.stations.push({n:st.s,x:p1.x,y:p1.y});
      }
    }
    prevName=st.s;
  }
  return runs;
}
// ── 노선도 탭 모드별 렌더 (기차: 기존 노선 탭 / 전철: 전철 노선 선택 바) ──
let _metroMapRegion=null, _metroMapId=null;
function renderMapTabForMode(){
  const tabs=document.getElementById('map-line-tabs');
  const controls=document.getElementById('map-controls-bar');
  const filterPanel=document.getElementById('map-filter-panel');
  let bar=document.getElementById('metro-line-bar');
  if(_appMode==='metro'&&typeof METRO_LINES!=='undefined'){
    if(tabs)tabs.style.display='none';
    if(controls)controls.style.display='none';
    if(filterPanel)filterPanel.style.display='none';
    if(!bar){
      bar=document.createElement('div'); bar.id='metro-line-bar';
      tabs.parentNode.insertBefore(bar,tabs.nextSibling);
    }
    bar.style.display='';
    const regions=[...new Set(METRO_LINES.map(l=>l.region))];
    if(!_metroMapRegion)_metroMapRegion=regions[0];
    const lines=METRO_LINES.filter(l=>l.region===_metroMapRegion);
    if(_metroMapId!=='__all__'&&(!_metroMapId||!lines.some(l=>l.id===_metroMapId)))_metroMapId=lines[0].id;
    _renderMetroBar(bar);
    showMapLine(_metroMapId==='__all__'?'metroall:'+_metroMapRegion:'metro:'+_metroMapId,null);
  } else {
    if(tabs)tabs.style.display='';
    if(controls)controls.style.display='flex'; // 원래 inline display:flex 복원 (버튼 줄바꿈 방지)
    if(bar)bar.style.display='none';
    const activeMapTab=document.querySelector('.map-line-tab.active')||document.querySelector('.map-line-tab');
    const lineKey=(activeMapTab&&activeMapTab.getAttribute('onclick').match(/['"]([\w]+)['"]/)?.[1])||'gyeongbu';
    showMapLine(lineKey, activeMapTab);
  }
}
// 배차 표시 — hwPeak/hwOff 누락 노선은 'undefined분' 대신 있는 값만 표기
function _metroHeadway(o){
  const peak=(o&&o.hwPeak!=null)?`러시 <b>${o.hwPeak}분</b>`:'';
  const off=(o&&o.hwOff!=null)?`평시 <b>${o.hwOff}분</b>`:'';
  const both=[peak,off].filter(Boolean).join(' · ');
  return both?`배차 ${both}`:'배차 정보 준비 중';
}
function _renderMetroBar(bar){
  const regions=[...new Set(METRO_LINES.map(l=>l.region))];
  const lines=METRO_LINES.filter(l=>l.region===_metroMapRegion);
  const isAll=_metroMapId==='__all__';
  const sel=isAll?null:METRO_LINES.find(l=>l.id===_metroMapId);
  bar.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 6px">
      ${regions.map(r=>`<button class="metro-region-chip${_metroMapRegion===r?' on':''}" onclick="setMetroMapRegion('${r}')">${r}</button>`).join('')}
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px">
      <button class="metro-line-chip metro-all-chip${isAll?' on':''}" onclick="showMetroMap('__all__')">🗺️ 권역 전체</button>
      ${lines.map(l=>`<button class="metro-line-chip${l.id===_metroMapId?' on':''}" style="--mc:${l.color}" onclick="showMetroMap('${l.id}')">${l.name}</button>`).join('')}
    </div>
    ${isAll?`<div class="metro-map-info">
      <span style="font-weight:800">🗺️ ${_metroMapRegion} 권역 전체</span>
      <span>${lines.length}개 노선 통합 · 시·종착역만 표기</span>
      <span style="color:var(--text2)">노선 개별 보기는 위 칩에서 선택</span>
    </div>`:sel?`<div class="metro-map-info">
      <span style="color:${sel.color};font-weight:800">🚇 ${sel.name}</span>
      <span>${sel.loop?sel.from+' 기점 순환':sel.from+' ↔ '+sel.to} · ${sel.n}개역</span>
      <span>첫차 <b>${sel.first}</b> · 막차 <b>${sel.last}</b></span>
      <span>${_metroHeadway(sel)}</span>
    </div>`:''}`;
}
function setMetroMapRegion(r){const keep=_metroMapId==='__all__';_metroMapRegion=r;_metroMapId=keep?'__all__':null;renderMapTabForMode();}
function showMetroMap(id){
  _metroMapId=id;
  const bar=document.getElementById('metro-line-bar'); if(bar)_renderMetroBar(bar);
  showMapLine(id==='__all__'?'metroall:'+_metroMapRegion:'metro:'+id,null);
}
// METRO_LINES 항목 → MAP_LINES 형식 변환 (동일 렌더러 재사용)
// 전철은 기차 대비 노선이 짧아 그대로 그리면 쪼그라듦 → 평균 역 간격이 32px 이상 되도록 좌표 확대
// 좌표는 전부 위경도 투영값(동일 좌표계)이며, 지선은 별도 dash route
function _metroAsMapLine(id){
  if(typeof METRO_LINES==='undefined')return null;
  const l=METRO_LINES.find(x=>x.id===id);
  if(!l)return null;
  const srcRoutes=l.routes||[{stations:l.stations,xy:l.xy}];
  let segSum=0,segN=0;
  srcRoutes.forEach(r=>{for(let i=1;i<r.xy.length;i++){segSum+=Math.hypot(r.xy[i][0]-r.xy[i-1][0],r.xy[i][1]-r.xy[i-1][1]);segN++;}});
  const avg=segN?segSum/segN:32;
  const f=Math.min(6,Math.max(1,32/Math.max(avg,1)));
  return {name:l.name,color:l.color,isMetro:true,metroId:l.id,
    routes:srcRoutes.map(r=>({color:l.color,dash:!!r.dash,
      stations:r.stations.map((n,i)=>({n,x:Math.round(r.xy[i][0]*f),y:Math.round(r.xy[i][1]*f)}))}))};
}
// 권역 전체 전철 노선도 — 해당 권역 전 노선을 한 좌표계로 겹쳐 그림(관제 모드처럼).
// 라벨은 종착·환승역만(showMapLine의 isAllView 허브 로직이 처리). 좌표는 전 노선 공통 스케일.
let _metroRegionCache={};
function _metroRegionAsMapLine(region){
  if(typeof METRO_LINES==='undefined')return null;
  if(_metroRegionCache[region])return _metroRegionCache[region];
  const lines=METRO_LINES.filter(l=>l.region===region);
  if(!lines.length)return null;
  let segSum=0,segN=0;
  lines.forEach(l=>{(l.routes||[{stations:l.stations,xy:l.xy}]).forEach(r=>{
    for(let i=1;i<r.xy.length;i++){segSum+=Math.hypot(r.xy[i][0]-r.xy[i-1][0],r.xy[i][1]-r.xy[i-1][1]);segN++;}});});
  const avg=segN?segSum/segN:32;
  // 권역 지도는 실좌표(위경도 투영)를 그대로 겹쳐 그린다. 밀림(spread) 없이 그리므로
  // 배율을 넉넉히 키워 조밀역 겹침을 줄인다(노선별 배율을 쓰면 환승역이 어긋나므로 공용 배율).
  const f=Math.min(7,Math.max(3,44/Math.max(avg,1)));
  const routes=[];
  lines.forEach(l=>{(l.routes||[{stations:l.stations,xy:l.xy}]).forEach(r=>{
    routes.push({color:l.color,dash:!!r.dash,
      stations:r.stations.map((n,i)=>({n,x:Math.round(r.xy[i][0]*f),y:Math.round(r.xy[i][1]*f)}))});
  });});
  return _metroRegionCache[region]={name:region+' 권역 전체',color:'#8b949e',isMetro:true,allView:true,metroRegion:region,noSpread:true,lineCount:lines.length,routes};
}
// 역의 환승 전철 노선 목록 — 게임 DB 역 태그의 노선 기본명 기준, 현재 노선 제외
let _metroNameIdx=null;
function _metroXferLines(stn, excludeId){
  if(typeof METRO_LINES==='undefined'||typeof STATION_DB==='undefined')return [];
  if(!_metroNameIdx){_metroNameIdx={};METRO_LINES.forEach(l=>{_metroNameIdx[l.name]=l;});}
  const st=STATION_DB[stn+'역']||STATION_DB[stn];
  if(!st||!st.lines)return [];
  const bases=[...new Set(st.lines.map(t=>t.split('/')[0].split(' (')[0].trim()))];
  return bases.map(b=>_metroNameIdx[b]).filter(l=>l&&l.id!==excludeId);
}
// 기차(간선 열차) 정차역 여부 — _modeStnSetsInit의 집합 재사용
function _isTrainStn(n){
  _modeStnSetsInit();
  return !!(_trainStnSet&&_trainStnSet.has(n));
}
// 노선 전체의 역별 환승 표시 맵 — 같은 환승 노선이 3역 이상 연속되면 선로 공유로 보고
// 구간 양끝(노선이 갈라지는 역)에만 표시한다. 1~2역 공유는 모든 역에 표시.
function _metroXferMap(l){
  const res={};
  if(!l||typeof METRO_LINES==='undefined')return res;
  const routes=l.routes||[{stations:l.stations}];
  const uniq=[...new Set(routes.flatMap(r=>r.stations))];
  const raw={};   // 역 -> 환승 노선 배열 (전체)
  uniq.forEach(n=>{raw[n]=_metroXferLines(n,l.id);});
  const cand={};  // id -> line
  uniq.forEach(n=>raw[n].forEach(x=>{cand[x.id]=x;}));
  const show={};  // 역 -> 표시할 노선 id Set
  uniq.forEach(n=>{show[n]=new Set();});
  for(const x of Object.values(cand)){
    const has=n=>raw[n]&&raw[n].some(y=>y.id===x.id);
    for(const r of routes){
      const st=r.stations;
      let i=0;
      while(i<st.length){
        if(!has(st[i])){i++;continue;}
        let j=i;
        while(j+1<st.length&&has(st[j+1]))j++;
        if(j-i+1>=3){ show[st[i]].add(x.id); show[st[j]].add(x.id); }
        else { for(let k=i;k<=j;k++)show[st[k]].add(x.id); }
        i=j+1;
      }
    }
  }
  uniq.forEach(n=>{res[n]=raw[n].filter(x=>show[n].has(x.id));});
  return res;
}
function showMapLine(lineKey, btn){
  document.querySelectorAll('.map-line-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const line=(typeof lineKey==='string'&&lineKey.startsWith('metroall:'))?_metroRegionAsMapLine(lineKey.slice(9))
    :(typeof lineKey==='string'&&lineKey.startsWith('metro:'))?_metroAsMapLine(lineKey.slice(6))
    :(lineKey==='all'?_allAsMapLine():MAP_LINES[lineKey]);
  if(!line)return;

  // 추적 중이면: 열차가 실제 운행하는 구간만, 열차 등급 색으로 통일해 렌더
  const _trk=_mapTrackedTrain?ALL_TRAINS.find(x=>x.no===_mapTrackedTrain):null;
  let baseRoutes=line.routes, trackedView=false, _trkColor=null, _trkStopSet=null;
  if(_trk){
    const runs=_trackedRouteRuns(_trk);
    if(runs.length){
      _trkColor=(typeof GRADE_COLORS!=='undefined'&&GRADE_COLORS[_trk.grade])||'#8b949e';
      baseRoutes=runs.map(r=>({...r,color:_trkColor}));
      trackedView=true;
      // 실제 정차역 집합 — 미정차(통과)역은 옅게 표시
      _trkStopSet=new Set(_trk.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(_trk,s.s)).map(s=>s.s));
    }
  }
  // 권역 전체 지도는 밀림 왜곡 방지를 위해 실좌표 그대로(공용 배율이 조밀 노선을
  // MIN 미만으로 압축→spread가 역을 밀어 어긋남). 그 외에는 기존대로 밀림 적용.
  const routes=(line&&line.noSpread)?baseRoutes:spreadMapRoutes(baseRoutes);
  // 좌표 범위
  let minX=9999,maxX=0,minY=9999,maxY=0;
  routes.forEach(r=>r.stations.forEach(s=>{
    minX=Math.min(minX,s.x);maxX=Math.max(maxX,s.x);
    minY=Math.min(minY,s.y);maxY=Math.max(maxY,s.y);
  }));
  const pad=90;
  const svgW=maxX-minX+pad*2;
  const svgH=maxY-minY+pad*2;
  const ox=pad-minX, oy=pad-minY;

  const parts=[];
  // viewBox는 원본 좌표 그대로, width는 컨테이너에 맞게 100%
  parts.push(`<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="min-width:${line.isMetro?svgW:Math.min(svgW,400)}px;display:block;overflow:hidden" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="var(--bg1)"/>`);
  // 격자
  for(let x=0;x<svgW;x+=50)parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="#21262d" stroke-width="1"/>`);
  for(let y=0;y<svgH;y+=50)parts.push(`<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="#21262d" stroke-width="1"/>`);

  // 역 좌표 수집 (첫 등장 기준)
  const stnPos={};
  routes.forEach(r=>r.stations.forEach(s=>{
    if(!stnPos[s.n])stnPos[s.n]={x:s.x+ox,y:s.y+oy};
  }));
  _mapStnPos=stnPos;

  // 선 그리기 (곡선 path)
  function smoothPath(stations, ox, oy){
    if(stations.length<2)return '';
    const pts=stations.map(s=>({x:s.x+ox,y:s.y+oy}));
    let d=`M${pts[0].x},${pts[0].y}`;
    for(let i=1;i<pts.length;i++){
      const prev=pts[i-1], cur=pts[i];
      const next=pts[i+1];
      if(i===pts.length-1||!next){
        d+=` L${cur.x},${cur.y}`;
      } else {
        // 꺾임 각도 계산
        const dx1=cur.x-prev.x, dy1=cur.y-prev.y;
        const dx2=next.x-cur.x, dy2=next.y-cur.y;
        const len1=Math.sqrt(dx1*dx1+dy1*dy1);
        const len2=Math.sqrt(dx2*dx2+dy2*dy2);
        // 곡선 반경: 선분 길이의 25%, 최대 20px
        const r=Math.min(len1*0.25, len2*0.25, 20);
        // 꺾임 직전/직후 지점
        const bx=cur.x-dx1/len1*r, by=cur.y-dy1/len1*r;
        const ax=cur.x+dx2/len2*r, ay=cur.y+dy2/len2*r;
        d+=` L${bx.toFixed(2)},${by.toFixed(2)} Q${cur.x},${cur.y} ${ax.toFixed(2)},${ay.toFixed(2)}`;
      }
    }
    return d;
  }

  // 🛰️ 관제 모드/권역 전체: 전 노선을 얇게, 라벨은 노선 종점·노선 간 교차(환승)역만
  const isAllView=lineKey==='all'||!!(line&&line.allView);
  let _hubSet=null;
  if(isAllView){
    // 허브 = 노선 종착역 + 분기/환승역. 렌더에 쓰는 spread 좌표 기반 키로 판정하여
    // 동명이역(같은 이름·다른 위치)은 별개 취급 → 오강조 방지. (spread가 공유역은
    // 동일 좌표로 스냅하므로 환승역은 여러 route에 같은 키로 등장 → 카운트≥2)
    _hubSet=new Set();
    const kf=s=>s.n+'@'+Math.round(s.x)+','+Math.round(s.y);
    if(line&&line.metroRegion&&typeof METRO_LINES!=='undefined'){
      // 권역 전체 전철 노선도: 붐빔 방지 — 라벨은 각 노선의 시·종착역만
      const termNames=new Set();
      METRO_LINES.filter(l=>l.region===line.metroRegion).forEach(l=>{if(l.from)termNames.add(l.from);if(l.to)termNames.add(l.to);});
      routes.forEach(rt=>rt.stations.forEach(s=>{ if(termNames.has(s.n))_hubSet.add(kf(s)); }));
    } else {
      // 관제 모드: 노선 종착역 + 분기/환승역(좌표 공유 카운트≥2)
      const cnt={};
      routes.forEach(rt=>{
        if(rt.stations.length){ _hubSet.add(kf(rt.stations[0])); _hubSet.add(kf(rt.stations[rt.stations.length-1])); }
        const seen=new Set();
        rt.stations.forEach(s=>{const k=kf(s); if(!seen.has(k)){seen.add(k); cnt[k]=(cnt[k]||0)+1;}});
      });
      Object.entries(cnt).forEach(([k,c])=>{ if(c>=2)_hubSet.add(k); });
    }
  }
  routes.forEach(r=>{
    const isBranch=r.dash||false;   // 지선/경유: 본선과 같은 색, 점선
    const d=smoothPath(r.stations, ox, oy);
    parts.push(`<path d="${d}" fill="none" stroke="${r.color}" stroke-width="${isAllView?2.5:(isBranch?4:5)}" stroke-linecap="round" stroke-linejoin="round" ${isBranch?'stroke-dasharray="9,9"':''} opacity="${isAllView?0.75:(isBranch?0.85:1)}"/>`);
  });

  // 역 점 + 이름 (중복 없이)
  const rendered=new Set();
  // 전철: 역별 환승 표시 맵 (선로 공유 구간은 양끝만)
  const _xferMap=(line.isMetro&&typeof METRO_LINES!=='undefined')?_metroXferMap(METRO_LINES.find(x=>x.id===line.metroId)):null;
  routes.forEach(r=>{
    r.stations.forEach((s,i)=>{
      // 동명이역(춘양 등)은 좌표까지 같아야 중복 처리 — 위치가 다르면 각각 표시
      const rkey=s.n+'@'+Math.round(s.x)+','+Math.round(s.y);
      if(rendered.has(rkey))return;
      rendered.add(rkey);
      const x=s.x+ox, y=s.y+oy;
      const isEnd=i===0||i===r.stations.length-1;
      // 관제 뷰: 허브역 외에는 아주 작은 점 + 라벨 생략 (좌표 기반 키로 동명이역 구분)
      const isMinor=!!(_hubSet&&!_hubSet.has(rkey));
      // 추적 뷰: 미정차(통과)역은 작고 옅게
      const faded=!!(_trkStopSet&&!_trkStopSet.has(s.n));
      const r2=isMinor?2.2:(faded?3.5:(isEnd?7:5));
      const sw=isMinor?1.2:(faded?1.5:(isEnd?3:2));
      // 히트 영역
      parts.push(`<circle cx="${x}" cy="${y}" r="${r2+8}" fill="transparent" style="cursor:pointer" onclick="openMapPopup('${s.n}','${line.name}')"/>`);
      // 역 점
      parts.push(`<circle cx="${x}" cy="${y}" r="${r2}" fill="#161b22" stroke="${r.color}" stroke-width="${sw}" ${faded?'opacity="0.35"':''} pointer-events="none"/>`);
      // 역명
      // 인접 역 방향 기반 텍스트 위치 결정
      // 이전/다음 역의 x 평균으로 텍스트를 반대쪽에 배치
      const allStnList=routes.flatMap(r=>r.stations);
      const sIdx=allStnList.findIndex(q=>q.n===s.n);
      const prevS=sIdx>0?allStnList[sIdx-1]:null;
      const nextS=sIdx<allStnList.length-1?allStnList[sIdx+1]:null;
      const neighborX=prevS&&nextS?(prevS.x+nextS.x)/2:prevS?prevS.x:nextS?nextS.x:null;
      // 이웃 역보다 오른쪽이면 오른쪽, 왼쪽이면 왼쪽 → 노선에서 멀어지는 방향
      let anchor, tx, ty=y+4;
      if(neighborX!==null){
        // 노선이 수직에 가까우면(dx 작음) 좌우로, 수평에 가까우면 위아래로
        const dx=Math.abs((prevS?prevS.x:nextS.x)-(nextS?nextS.x:prevS.x));
        const dy=Math.abs((prevS?prevS.y:nextS.y)-(nextS?nextS.y:prevS.y));
        if(dy>dx*1.5){
          // 수직 구간: x 기준 좌우 배치
          anchor=x>svgW/2?'end':'start';
          tx=x+(anchor==='start'?13:-13);
        } else {
          // 수평/대각 구간: 노선 위아래 배치
          const isAbove=neighborX<x;
          anchor='middle';
          tx=x;
          ty=isAbove?y-10:y+16;
        }
      } else {
        anchor=x>svgW/2?'end':'start';
        tx=x+(anchor==='start'?13:-13);
      }
      // 특정 역 텍스트 위치 수동 오버라이드
      const manualOffset={'목포':[-16,0],'광주':[0,-14],'함평':[-14,0],'부산':[14,0],'회덕':[-14,0],'대전':[14,2]};
      if(manualOffset[s.n]){
        tx=x+manualOffset[s.n][0];
        ty=y+manualOffset[s.n][1]+4;
        anchor=manualOffset[s.n][0]<0?'end':manualOffset[s.n][0]>0?'start':'middle';
      }
      if(!isMinor) parts.push(`<text x="${tx}" y="${ty}" fill="#e6edf3" font-size="${faded?9.5:(isEnd?12:11)}" font-weight="${isEnd?700:400}" ${faded?'opacity="0.4"':''} text-anchor="${anchor}" pointer-events="none" font-family="Noto Sans KR,sans-serif">${s.n}</text>`);
      // 전철 노선도: 환승 노선 색 점 (역명 옆) + 기차 환승 표시
      if(line.isMetro&&!isMinor&&!faded){
        const xf=(_xferMap&&_xferMap[s.n])||[];
        const hasTrain=_isTrainStn(s.n);
        if(xf.length||hasTrain){
          const fs=isEnd?12:11, tw=s.n.length*fs; // 역명 폭 근사
          let dx0, dy0=ty-3.5;
          if(anchor==='start')dx0=tx+tw+5;
          else if(anchor==='end')dx0=tx-tw-5-(xf.length-1)*8-(hasTrain?11:0);
          else dx0=tx+tw/2+5;
          xf.slice(0,5).forEach((l2,k)=>{
            parts.push(`<circle cx="${dx0+k*8}" cy="${dy0}" r="3.1" fill="${l2.color}" stroke="#161b22" stroke-width="1" pointer-events="none"><title>${l2.name} 환승</title></circle>`);
          });
          if(xf.length>5)parts.push(`<text x="${dx0+5*8}" y="${dy0+3}" fill="#8b949e" font-size="8" pointer-events="none" font-family="Noto Sans KR,sans-serif">+${xf.length-5}</text>`);
          if(hasTrain)parts.push(`<text x="${dx0+Math.min(xf.length,5)*8+(xf.length?2:0)}" y="${dy0+3.5}" font-size="9" pointer-events="none">🚆</text>`);
        }
      }
    });
  });

  parts.push(`<text x="14" y="22" fill="${trackedView?_trkColor:line.color}" font-size="14" font-weight="700" font-family="Noto Sans KR,sans-serif">${trackedView?`${_trk.grade} ${_trk.no} · ${_trk.stops[0].s}→${_trk.stops[_trk.stops.length-1].s} 운행 구간`:line.name}</text>`);
  parts.push('</svg>');

  // 줌 컨트롤 (좌상단 고정, 접기 가능) — 렌더마다 리셋되지 않도록 현재 배율 유지
  parts.unshift(_zoomCtlHTML());
  document.getElementById('map-svg-wrap').innerHTML=parts.join('');
  _mapApplyZoom();
  _mapBindPinch();

  // 범례
  document.getElementById('map-legend').innerHTML=trackedView?`
    <div class="map-legend-item"><div class="map-legend-line" style="background:${_trkColor}"></div><span>${_trk.grade} ${_trk.no} 운행 구간</span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#161b22" stroke="${_trkColor}" stroke-width="2"/></svg><span>정차역</span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="3.5" fill="#161b22" stroke="${_trkColor}" stroke-width="1.5" opacity="0.35"/></svg><span>통과역</span></div>
  `:`
    <div class="map-legend-item"><div class="map-legend-line" style="background:${line.color}"></div><span>${line.name} 본선</span></div>
    <div class="map-legend-item"><div class="map-legend-line" style="background:transparent;border-top:3px dashed ${line.color};height:0;opacity:.85"></div><span>지선 / 경유</span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#161b22" stroke="${line.color}" stroke-width="2"/></svg><span>역 (클릭하여 정보 확인)</span></div>
    <div class="map-legend-item" style="gap:8px;margin-left:8px">
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#3b82f6"/></svg><span style="font-size:11px">KTX</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#a855f7"/></svg><span style="font-size:11px">SRT</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#ef4444"/></svg><span style="font-size:11px">ITX-새마을</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#22c55e"/></svg><span style="font-size:11px">ITX-청춘</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#f97316"/></svg><span style="font-size:11px">무궁화</span>
    </div>
  `;
  // 현재 노선 저장 후 열차 오버레이 시작
  _mapCurrentLine = lineKey;
  _mapStnPos = stnPos;
  _mapSvgSize = {w:svgW, h:svgH, ox, oy};
  updateMapTrains();
  // 미니맵 초기화
  setTimeout(updateMinimap, 100);
  const wrap=document.getElementById('map-svg-wrap');
  if(wrap) wrap.onscroll=updateMinimap;
  // 확대/축소 초기화
  initMapZoom();
  // 고정 오버레이 버튼 업데이트
  _updateMapOverlay();
}



// ── 검색 히스토리 ──
const HISTORY_KEY='nimbi_history';
function loadHistory(type){try{return JSON.parse(localStorage.getItem(HISTORY_KEY+'_'+type))||[];}catch(e){return[];}}
function saveHistory(type,val){
  if(!val)return;
  let h=loadHistory(type).filter(x=>x!==val);
  h.unshift(val);
  h=h.slice(0,8);
  localStorage.setItem(HISTORY_KEY+'_'+type,JSON.stringify(h));
}
function showHistory(inputId,listId,type){
  const h=loadHistory(type);
  const el=document.getElementById(listId);
  if(!el||!h.length)return;
  const val=document.getElementById(inputId).value;
  el.innerHTML=h.filter(x=>!val||x.includes(val)).map(x=>
    `<div class="ac-item" onmousedown="document.getElementById('${inputId}').value='${x}';acHide('${listId}')">${x}</div>`
  ).join('');
  el.style.display=el.innerHTML?'block':'none';
}

// 히스토리 저장은 각 함수 내부에서 처리





// ── 노선도 고정 오버레이 (추적 열차 버튼) ──
function _updateMapOverlay(){
  // 추적 중이 아니면 오버레이 자체를 제거
  if(!_mapTrackedTrain){
    const old=document.getElementById('map-track-overlay');
    if(old) old.remove();
    return;
  }

  let overlay=document.getElementById('map-track-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='map-track-overlay';
    // 헤더(56px) 바로 아래, 우측 상단 고정
    overlay.style.cssText='position:fixed;z-index:200;top:64px;right:10px;display:flex;flex-direction:column;gap:6px;pointer-events:all';
    document.body.appendChild(overlay);
  }
  overlay.style.display='flex';

  const t=ALL_TRAINS.find(x=>x.no===_mapTrackedTrain);
  const status=t?getCurrentStatus(t):null;
  let posLabel='—';
  if(status){
    if(status.status==='running'){
      posLabel=status.atStn?`${status.atStn} 정차`
        :(status.nextStn?`→ ${status.nextStn}`:'운행 중');
    } else if(status.status==='done') posLabel='운행 종료';
    else posLabel='운행 전';
  }
  const color=t?GRADE_COLORS[t.grade]||'#888':'#888';
  overlay.innerHTML=`
    <div style="background:var(--bg2);border:1px solid ${color};border-radius:10px;padding:7px 10px;font-size:11px;line-height:1.4;max-width:130px;box-shadow:0 3px 12px rgba(0,0,0,.5)">
      <div style="font-weight:700;color:${color};margin-bottom:2px">${t?t.grade+' ':''}<span style="font-size:13px">${_mapTrackedTrain}</span></div>
      <div style="color:var(--text2)">${posLabel}</div>
    </div>
    <button onclick="_scrollToTrackedTrain();_updateMapOverlay()"
      style="padding:7px 11px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.5);text-align:left">
      📍 위치 보기
    </button>
    <button onclick="shareTrainLink('${_mapTrackedTrain}')"
      style="padding:7px 11px;border-radius:8px;border:none;background:var(--bg3);color:var(--text1);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.4);text-align:left">
      🔗 링크 복사
    </button>
    <button onclick="_clearTrainTracking()"
      style="padding:5px 11px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:11px;cursor:pointer;font-family:inherit">
      ✕ 추적 해제
    </button>`;
}

function _clearTrainTracking(){
  _mapTrackedTrain=null;
  // 오버레이 완전 제거
  const overlay=document.getElementById('map-track-overlay');
  if(overlay) overlay.remove();
  // 지도 재렌더로 추적 경로 오버레이 제거 후 전체 열차 다시 표시
  if(_mapCurrentLine) showMapLine(_mapCurrentLine, document.querySelector('.map-line-tab.active'));
  updateMapTrains();
}

// ── 열차 공유 ──
function shareTrainLink(no){
  const url=`${location.origin}${location.pathname}?train=${no}`;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>alert('링크가 복사됐습니다!\n'+url));
  } else {
    prompt('아래 링크를 복사하세요:',url);
  }
}

// URL 파라미터로 열차 바로 조회
window.addEventListener('load',()=>{
  const params=new URLSearchParams(location.search);
  const trainNo=params.get('train');
  if(trainNo){
    document.getElementById('input-trainno').value=trainNo;
    setTimeout(()=>searchByTrain(),500);
  }
});

// ── 역별 시간표 첫차/막차 ──
function getStationFirstLast(stn){
  const result={};
  ALL_TRAINS.forEach(t=>{
    const stop=t.stops.find(s=>s.s===stn);
    if(!stop||isPassStop(t,stn))return;
    const timeV=hasTime(stop.dep)?stop.dep:hasTime(stop.arr)?stop.arr:null;
    if(!timeV)return;
    const m=toMin(timeV);
    if(m===null)return;
    const key=t.dest+'_'+t.dir;
    // AM 4:00(240분) 기준: 240분 미만은 익일로 처리 (+1440)
    const adjM=m<240?m+1440:m;
    if(!result[key]){
      result[key]={dest:t.dest,dir:t.dir,firstM:adjM,firstT:timeV,lastM:adjM,lastT:timeV};
    } else {
      if(adjM<result[key].firstM){result[key].firstM=adjM;result[key].firstT=timeV;}
      if(adjM>result[key].lastM){result[key].lastM=adjM;result[key].lastT=timeV;}
    }
  });
  return Object.values(result);
}

// ── 막차 시각 표시 함수 (searchByStation에서 호출) ──
function renderFirstLastTrains(stn){
  const data=getStationFirstLast(stn);
  if(!data.length)return '';
  // dest별로 첫차/막차 표시
  const rows=data.map(d=>{
    const dirLbl=d.dir==='down'?'하행':'상행';
    return `<span class="first-last-item"><span class="fl-dest">${d.dest}행</span><span class="fl-dir">${dirLbl}</span><span class="fl-time">첫 ${d.firstT}</span><span class="fl-sep">·</span><span class="fl-time">막 ${d.lastT}</span></span>`;
  }).join('');
  return `<div class="first-last-wrap">${rows}</div>`;
}

// ── 통계 탭 ──
function renderStats(){
  const el=document.querySelector('#panel-stats #result-stats')||document.getElementById('result-stats');
  if(!el)return;
  try{

  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();

  // 전체 열차 수
  const total=ALL_TRAINS.length;

  // 등급별 통계
  const gradeCount={};
  ALL_TRAINS.forEach(t=>{gradeCount[t.grade]=(gradeCount[t.grade]||0)+1;});

  // 노선별 통계
  const lineCount={};
  ALL_TRAINS.forEach(t=>{
    const lines=(t.line||'').split('·');
    lines.forEach(l=>{const ll=l.trim();lineCount[ll]=(lineCount[ll]||0)+1;});
  });

  // 현재 운행 중 (열차번호 오름차순)
  const runningTrains=ALL_TRAINS.filter(t=>{
    const st=getCurrentStatus(t);
    return st&&st.status==='running';
  }).sort((a,b)=>(parseInt(a.no)||0)-(parseInt(b.no)||0));
  const running=runningTrains.length;

  // 노선별 첫차/막차 계산
  const lineFirstLast={};
  const LINE_NAMES=['경부선','경부고속선','호남선','전라선','중앙선','동해선','영동선','강릉선','중부내륙선','경전선'];
  LINE_NAMES.forEach(ln=>{
    lineFirstLast[ln]={name:ln,downFirst:null,downLast:null,upFirst:null,upLast:null};
  });
  ALL_TRAINS.forEach(t=>{
    const lines=t.line.split('·').map(l=>l.trim());
    lines.forEach(ln=>{
      if(!lineFirstLast[ln])return;
      const valid=t.stops.filter(s=>hasTime(s.dep)||hasTime(s.arr));
      if(!valid.length)return;
      const firstStop=valid[0];
      const lastStop=valid[valid.length-1];
      const depT=hasTime(firstStop.dep)?firstStop.dep:firstStop.arr;
      const arrT=hasTime(lastStop.arr)?lastStop.arr:lastStop.dep;
      const depM=toMin(depT);
      const arrM=toMin(arrT);
      if(depM===null)return;
      // AM 4:00 기준 보정
      const adjDepM=depM<240?depM+1440:depM;
      const adjArrM=arrM!==null?(arrM<240?arrM+1440:arrM):adjDepM;
      const obj=lineFirstLast[ln];
      if(t.dir==='down'){
        if(!obj.downFirst||adjDepM<obj.downFirstM){obj.downFirst=depT;obj.downFirstM=adjDepM;}
        if(!obj.downLast||adjDepM>obj.downLastM){obj.downLast=depT;obj.downLastM=adjDepM;}
      } else {
        if(!obj.upFirst||adjDepM<obj.upFirstM){obj.upFirst=depT;obj.upFirstM=adjDepM;}
        if(!obj.upLast||adjDepM>obj.upLastM){obj.upLast=depT;obj.upLastM=adjDepM;}
      }
    });
  });

  // ── 역별 정차 횟수 TOP 10 ──
  const stnCount={};
  ALL_TRAINS.forEach(t=>{
    t.stops.forEach(s=>{
      if(!isPassStop(t,s.s)&&(hasTime(s.arr)||hasTime(s.dep))){
        stnCount[s.s]=(stnCount[s.s]||0)+1;
      }
    });
  });
  const topStns=Object.entries(stnCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxStnCount=topStns[0]?.[1]||1;
  const topStationsRows=topStns.map(([stn,cnt],i)=>`
    <div class="stat-row">
      <span style="min-width:20px;color:var(--text3);font-size:11px">${i+1}</span>
      <span style="min-width:60px">${stn}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(cnt/maxStnCount*100)}%"></div></div>
      <span class="stat-num">${cnt}회</span>
    </div>`).join('');

  // ── 노선별 운행 밀도 ──
  const peakHours=[7,8,9,17,18,19]; // 피크: 출퇴근
  const offHours=[10,11,13,14,15];  // 한산: 낮
  const densityData={};
  LINE_NAMES.forEach(ln=>{ densityData[ln]={peak:0,off:0}; });
  ALL_TRAINS.forEach(t=>{
    const lines=t.line.split('·').map(l=>l.trim());
    t.stops.forEach(s=>{
      const m=toMin(s.dep||s.arr);
      if(m===null)return;
      const h=Math.floor(m/60)%24;
      lines.forEach(ln=>{
        if(!densityData[ln])return;
        if(peakHours.includes(h)) densityData[ln].peak++;
        if(offHours.includes(h)) densityData[ln].off++;
      });
    });
  });
  const densityRows=LINE_NAMES.map(ln=>{
    const d=densityData[ln];
    if(!d||(!d.peak&&!d.off))return '';
    const maxD=Math.max(d.peak,d.off)||1;
    return `<div style="margin-bottom:10px">
      <div style="font-size:12px;font-weight:600;margin-bottom:4px">${ln}</div>
      <div class="stat-row">
        <span style="min-width:36px;font-size:11px;color:#f97316">피크</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(d.peak/maxD*100)}%;background:#f97316"></div></div>
        <span class="stat-num">${d.peak}</span>
      </div>
      <div class="stat-row">
        <span style="min-width:36px;font-size:11px;color:var(--accent)">한산</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(d.off/maxD*100)}%"></div></div>
        <span class="stat-num">${d.off}</span>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  const firstLastStatRows=LINE_NAMES.map(ln=>{
    const d=lineFirstLast[ln];
    if(!d.downFirst&&!d.upFirst)return '';
    const downPart=d.downFirst?`<span class="fl-stat-item"><span class="fl-stat-dir">하행↓</span><span class="fl-stat-time">${d.downFirst}</span><span style="color:var(--text3)">~</span><span class="fl-stat-time">${d.downLast||'-'}</span></span>`:'';
    const upPart=d.upFirst?`<span class="fl-stat-item"><span class="fl-stat-dir">상행↑</span><span class="fl-stat-time">${d.upFirst}</span><span style="color:var(--text3)">~</span><span class="fl-stat-time">${d.upLast||'-'}</span></span>`:'';
    return `<div class="fl-stat-row"><span class="fl-stat-name">${ln}</span><div class="fl-stat-times">${downPart}${upPart}</div></div>`;
  }).filter(Boolean).join('');
  const makeChips=(trains)=>trains.map(t=>{
    const c=GRADE_COLORS[t.grade]||'var(--accent)';
    return `<span onclick="jumpToTrain('${t.no}')" style="cursor:pointer;padding:2px 8px;border-radius:10px;border:1px solid ${c};color:${c};font-size:11px;background:rgba(0,0,0,.2)">${t.no}</span>`;
  }).join('');
  const CHIP_LIMIT=30;
  const runningChips=makeChips(runningTrains.slice(0,CHIP_LIMIT))
    +(runningTrains.length>CHIP_LIMIT
      ? `<span class="badge" style="cursor:pointer;margin-left:4px" onclick="showAllRunningTrains()">외 ${runningTrains.length-CHIP_LIMIT}편 더 보기 ▾</span>`
      : '');

  // 운행 전/종료
  const before=ALL_TRAINS.filter(t=>{const st=getCurrentStatus(t);return st&&st.status==='before';}).length;
  const done=ALL_TRAINS.filter(t=>{const st=getCurrentStatus(t);return st&&st.status==='done';}).length;

  // 시간대별 운행량 (1시간 단위)
  const hourly=Array(24).fill(0);
  ALL_TRAINS.forEach(t=>{
    t.stops.forEach(s=>{
      const m=toMin(s.dep||s.arr);
      if(m!==null) hourly[Math.floor(m/60)%24]++;
    });
  });
  const maxHourly=Math.max(...hourly);

  const gradeRows=Object.entries(gradeCount).sort((a,b)=>b[1]-a[1]).map(([g,c])=>`
    <div class="stat-row">
      <span>${GL[g]||g}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(c/total*100)}%;background:${GRADE_COLORS[g]||'var(--accent)'}"></div></div>
      <span class="stat-num">${c}편</span>
    </div>`).join('');

  const lineRows=Object.entries(lineCount).sort((a,b)=>b[1]-a[1]).map(([l,c])=>`
    <div class="stat-row">
      <span style="min-width:80px">${l}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(c/total*100)}%"></div></div>
      <span class="stat-num">${c}편</span>
    </div>`).join('');

  const hourlyBars=hourly.map((v,h)=>`
    <div class="hourly-col">
      <div class="hourly-val">${v>0?v:''}</div>
      <div class="hourly-bar" style="height:${maxHourly?Math.round(v/maxHourly*70):0}px" title="${h}시: ${v}회"></div>
      <div class="hourly-label">${h%3===0?h:''}</div>
    </div>`).join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">📊 운행 통계</div></div>

    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card-num">${total}</div><div class="stat-card-label">전체 열차</div></div>
      <div class="stat-card running"><div class="stat-card-num">${running}</div><div class="stat-card-label">운행 중</div></div>
      <div class="stat-card before"><div class="stat-card-num">${before}</div><div class="stat-card-label">운행 전</div></div>
      <div class="stat-card done"><div class="stat-card-num">${done}</div><div class="stat-card-label">운행 종료</div></div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">등급별</div>
      ${gradeRows}
    </div>

    <div class="stat-section">
      <div class="stat-section-title">노선별 운행 현황</div>
      ${lineRows}
    </div>
    <div class="stat-section">
      <div class="stat-section-title">현재 운행 중 열차</div>
      <div class="running-chips-wrap" style="display:flex;flex-wrap:wrap;gap:6px">${runningChips}</div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">데이터 점검</div>
      <button class="btn" style="font-size:12px;padding:6px 12px" onclick="runDataAnomalyCheck()">🔍 좌표·거리·번호 이상치 점검</button>
      <div id="stat-anomaly-result" style="margin-top:8px"></div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">시간대별 운행량</div>
      <div class="hourly-scroll"><div class="hourly-chart">${hourlyBars}</div></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">노선별 첫차 · 막차</div>
      <div class="first-last-stats">${firstLastStatRows}</div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">역별 정차 횟수 TOP 10</div>
      <div>${topStationsRows}</div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">역별 첫차 · 막차</div>
      <div class="stat-search-row">
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-stn-input" placeholder="역명 입력" autocomplete="off"
            oninput="acShow('stat-stn-input','ac-stat-stn')"
            onkeydown="acKey(event,'stat-stn-input','ac-stat-stn')"
            onblur="setTimeout(()=>acHide('ac-stat-stn'),150)">
          <div class="ac-dropdown" id="ac-stat-stn"></div>
        </div>
        <button class="btn stat-search-btn" onclick="calcStationFirstLast()">조회</button>
      </div>
      <div id="stat-stn-fl-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">구간별 운행 열차 수</div>
      <div class="stat-search-row">
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-from" placeholder="출발역" autocomplete="off"
            oninput="acShow('stat-from','ac-stat-from')"
            onkeydown="acKey(event,'stat-from','ac-stat-from')"
            onblur="setTimeout(()=>acHide('ac-stat-from'),150)">
          <div class="ac-dropdown" id="ac-stat-from"></div>
        </div>
        <span class="stat-search-arrow">→</span>
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-to" placeholder="도착역" autocomplete="off"
            oninput="acShow('stat-to','ac-stat-to')"
            onkeydown="acKey(event,'stat-to','ac-stat-to')"
            onblur="setTimeout(()=>acHide('ac-stat-to'),150)">
          <div class="ac-dropdown" id="ac-stat-to"></div>
        </div>
        <button class="btn stat-search-btn" onclick="calcSectionTrains()">조회</button>
      </div>
      <div id="stat-section-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">노선별 운행 밀도 (피크 vs 한산)</div>
      <div>${densityRows}</div>
    </div>
    <p class="hint">※ ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} 현재 기준 · AM 4:00 기준일</p>`;
  }catch(e){
    el.innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><p>통계 로딩 오류<br><small style="color:var(--text3)">${e.message}</small></p><button class="btn" onclick="renderStats()" style="margin-top:12px">🔄 다시 시도</button></div>`;
  }
}


// ── 알람 테스트 ──
function testAlarm(){
  requestNotifPermission(()=>{
    sendNotification('🔔 님비레일 알람 테스트','알람이 정상적으로 작동합니다!');
  });
}


// ── 공지사항 데이터 (읽기 전용 - 코드에서만 추가) ──
// ── 공지사항 렌더링 ──
const NOTICE_READ_KEY='nimbi_notice_read';
function getReadNotices(){try{return JSON.parse(localStorage.getItem(NOTICE_READ_KEY))||[];}catch(e){return[];}}
function markNoticeRead(idx){
  const read=getReadNotices();
  if(!read.includes(idx)){read.push(idx);localStorage.setItem(NOTICE_READ_KEY,JSON.stringify(read));}
}
function getUnreadNoticeCount(){
  const read=getReadNotices();
  return NOTICES.filter((_,i)=>!read.includes(i)).length;
}

// 공지 카테고리 정의 (색상/아이콘)
const NOTICE_CATEGORIES={
  update:  {label:'앱 업데이트', icon:'📱', color:'#388bfd'},
  timetable:{label:'시간표 개정', icon:'🕐', color:'#f97316'},
  route:   {label:'노선 정보',   icon:'🗺️', color:'#3fb950'},
  service: {label:'운행 안내',   icon:'⚠️', color:'#f85149'},
};
function noticeCatBadge(catKey, size){
  const c=NOTICE_CATEGORIES[catKey];
  if(!c)return '';
  const sm=size==='sm';
  return `<span class="notice-cat${sm?' sm':''}" style="color:${c.color};border-color:${c.color}66;background:${c.color}1a">${c.icon} ${c.label}</span>`;
}

// 현재 선택된 공지 필터 카테고리
let _noticeFilterCat='all';
function setNoticeFilter(cat){
  _noticeFilterCat=cat;
  renderNotice();
}

function renderNotice(){
  const el=document.querySelector('#panel-notice #result-notice')||document.getElementById('result-notice');
  if(!el)return;
  try{
  if(typeof NOTICES==='undefined'||!NOTICES.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">📢</div><p>등록된 공지사항이 없습니다.</p></div>`;
    return;
  }
  const read=getReadNotices();

  // 카테고리 필터 탭
  const catCounts={all:NOTICES.length};
  Object.keys(NOTICE_CATEGORIES).forEach(k=>{catCounts[k]=NOTICES.filter(n=>n.cat===k).length;});
  const filterTabs=`<div class="notice-filter-tabs">
    <button class="notice-filter-tab${_noticeFilterCat==='all'?' active':''}" onclick="setNoticeFilter('all')">전체 ${catCounts.all}</button>
    ${Object.entries(NOTICE_CATEGORIES).map(([k,c])=>
      catCounts[k]>0?`<button class="notice-filter-tab${_noticeFilterCat===k?' active':''}" style="${_noticeFilterCat===k?`background:${c.color}1a;color:${c.color};border-color:${c.color}66`:''}" onclick="setNoticeFilter('${k}')">${c.icon} ${c.label} ${catCounts[k]}</button>`:''
    ).join('')}
  </div>`;

  const filtered=_noticeFilterCat==='all'?NOTICES:NOTICES.filter(n=>n.cat===_noticeFilterCat);

  if(!filtered.length){
    el.innerHTML=`<div class="result-header"><div class="result-title">📢 공지사항</div></div>${filterTabs}<div class="empty"><div class="empty-icon">📭</div><p>해당 카테고리에 공지가 없습니다.</p></div>`;
    return;
  }

  // 최신순(배열 역순) - 원본 인덱스 유지해서 openNoticeDetail에 정확한 idx 전달
  const indexed=filtered.map(n=>({n,idx:NOTICES.indexOf(n)})).reverse();
  const rows=indexed.map(({n,idx})=>{
    const isUnread=!read.includes(idx);
    return `<div class="notice-row${isUnread?' unread':''}" onclick="openNoticeDetail(${idx})">
      <div class="notice-row-main">
        ${isUnread?'<span class="notice-dot"></span>':''}
        ${noticeCatBadge(n.cat,'sm')}
        <span class="notice-title">${n.title}</span>
      </div>
      <div class="notice-meta">
        <span class="notice-date">${n.date}</span>
        <span class="notice-arrow">›</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">📢 공지사항</div><span class="badge blue">${NOTICES.length}건</span></div>
    ${filterTabs}
    <div class="notice-list">${rows}</div>`;
  }catch(e){
    el.innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><p>공지 로딩 오류<br><small>${e.message}</small></p><button class="btn" onclick="renderNotice()">🔄</button></div>`;
  }
}

function openNoticeDetail(idx){
  const n=NOTICES[idx];
  if(!n)return;
  markNoticeRead(idx);
  const wrap=document.createElement('div');
  wrap.className='notice-popup-backdrop';
  wrap.onclick=e=>{if(e.target===wrap)closeNoticeDetail();};
  wrap.innerHTML=`
    <div class="notice-popup">
      <div class="notice-popup-head">
        <div class="notice-popup-date">${n.date}</div>
        <button class="notice-popup-close" onclick="closeNoticeDetail()">✕</button>
      </div>
      ${noticeCatBadge(n.cat)}
      <div class="notice-popup-title">${n.title}</div>
      <div class="notice-popup-body">${n.body}</div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeNoticeDetail(){
  document.querySelectorAll('.notice-popup-backdrop').forEach(e=>e.remove());
  renderNotice(); // 읽음 상태 반영
}

// ══════════════════════════════════════════
// 🎫 가상 승차권 예매 시스템
// ══════════════════════════════════════════
const TICKET_KEY='nimbi_tickets';
function loadTickets(){try{return JSON.parse(localStorage.getItem(TICKET_KEY))||[];}catch(e){return[];}}
function saveTickets(t){localStorage.setItem(TICKET_KEY,JSON.stringify(t));}

// 좌석 등급 (열차 등급별로 제공 등급이 다름)
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
  if(grade==='남도해양') return ['general']; // 관광열차: 전석 지정
  return ['general','standing']; // ITX-새마을, ITX-마음, ITX-청춘
}

// 거리비례 운임: 등급별 기본운임 + 거리(km)×등급 km단가 + 좌석등급 배율
// {base: 기본운임, rate: 원/km, min: 최저운임}
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

// 좌석 자동 배정 (가상 - 좌석배치도 연동 전까지 임시)
function randomSeat(seatClass, trainNo){
  if(seatClass==='standing') return '입석';
  // 편성 기반으로 실제 좌석 형식(연번/열+문자)에 맞춰 배정
  const grade = trainNo ? (ALL_TRAINS.find(t=>t.no===trainNo)||{}).grade : null;
  const comp = getCarComposition(getFormationType(grade||'무궁화호', trainNo));
  let pool = getCarsForClass(comp, seatClass);
  if(!pool.length) pool = comp.filter(c=>c.type!=='free');
  if(!pool.length) return `1호차 1A`;
  const c = pool[Math.floor(Math.random()*pool.length)];
  if(c.numbered){
    const total=c.totalSeats||72;
    return `${c.car}호차 ${Math.floor(Math.random()*total)+1}번`;
  }
  const cols=c.cols||['A','B','C','D'];
  const missing=new Set(c.missingSeats||[]);
  const rows=c.rows||15;
  let row,col,code,guard=0;
  do{ row=Math.floor(Math.random()*rows)+1; col=cols[Math.floor(Math.random()*cols.length)]; code=`${row}${col}`; guard++; }while(missing.has(code)&&guard<25);
  return `${c.car}호차 ${row}${col}`;
}

function genTicketId(){
  const d=new Date();
  const ymd=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand=Math.random().toString(36).slice(2,7).toUpperCase();
  return `NB${ymd}${rand}`;
}

// 예매 팝업 열기 (열차 상세/출도착 결과에서 호출)
function openBookingPopup(trainNo, fromStn, toStn, depTime, arrTime, travelDate){
  const t=ALL_TRAINS.find(x=>x.no===trainNo);
  if(!t){alert('열차 정보를 찾을 수 없습니다.');return;}
  // book-detail-backdrop(z-index:9900)이 booking popup(z-index:9400)을 가리는 것 방지
  document.getElementById('book-detail-wrap')?.remove();
  const classes=availableSeatClasses(t.grade);
  const old=document.getElementById('booking-popup-wrap');
  if(old)old.remove();
  // 모바일 onclick 파싱 오류 방지: 인자를 전역에 저장
  window._bArgs={trainNo,fromStn,toStn,depTime,arrTime};

  const wrap=document.createElement('div');
  wrap.id='booking-popup-wrap';
  wrap.style.cssText='position:fixed;top:0;right:0;bottom:0;left:0;z-index:9400;pointer-events:auto';
  const classOpts=classes.map(c=>{
    const fare=calcFare(t,fromStn,toStn,c);
    // inline onclick 제거 → addEventListener로 등록 (iOS Safari 호환)
    return `<button class="booking-seat-option" data-class="${c}">
      <span class="booking-seat-label">${SEAT_CLASSES[c].label}</span>
      <span class="booking-seat-fare">${fare.toLocaleString()}원</span>
    </button>`;
  }).join('');

  // 탑승일: 오늘 ~ 1개월 후 (로컬 시간 기준, UTC 변환으로 인한 날짜 밀림 방지)
  const toLocalDateStr=d=>{
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const today=new Date();
  const minDate=toLocalDateStr(today);
  const maxD=new Date(today); maxD.setMonth(maxD.getMonth()+1);
  const maxDate=toLocalDateStr(maxD);

  wrap.innerHTML=`
    <div style="position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.6)"></div>
    <div style="position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box">
    <div class="alarm-popup booking-popup" style="position:relative;top:auto;left:auto;transform:none;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;width:100%">
      <div style="overflow-y:auto;flex:1;min-height:0;-webkit-overflow-scrolling:touch">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
          <div class="alarm-popup-title" style="margin-bottom:0">🎫 ${t.grade} ${trainNo}</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="booking-clock"></div>
        </div>
        <div class="alarm-popup-sub">${fromStn} ${depTime||''} → ${toStn} ${arrTime||''}</div>
        ${(()=>{const d=durMin(depTime,arrTime);return d!=null?`<div class="alarm-popup-sub" style="margin-top:-2px;color:var(--text3)">소요 ${fmtDurKor(d)}</div>`:'';})()}
        <div class="booking-date-section">
          <div class="booking-section-label">탑승일</div>
          <input type="date" id="booking-date" value="${travelDate&&travelDate>=minDate?travelDate:minDate}" min="${minDate}" max="${maxDate}" class="booking-date-input">
        </div>
        <div class="booking-seat-section">
          <div class="booking-section-label">좌석 등급</div>
          <div class="booking-seat-options">${classOpts}</div>
        </div>
        <div class="booking-passenger-section">
          <div class="booking-section-label">좌석 선택 <span style="font-size:11px;color:var(--text3);font-weight:400">(선택 안 하면 자동 배정)</span></div>
          <button class="btn" id="booking-seat-select-btn" disabled style="width:100%;justify-content:center;margin-bottom:12px;font-size:13px;gap:6px;opacity:.4;cursor:not-allowed">
            🪑 직접 선택 — <span id="booking-seat-display" style="color:var(--accent2)">등급 선택 후 가능</span>
          </button>
          <div class="booking-section-label">인원</div>
          <div class="booking-passenger-control">
            <button class="booking-stepper-btn" id="booking-stepper-minus">−</button>
            <span id="booking-passenger-count">1</span>
            <button class="booking-stepper-btn" id="booking-stepper-plus">+</button>
          </div>
        </div>
        <div class="booking-passenger-section">
          <div class="booking-section-label">할인 <span style="font-size:11px;color:var(--text3);font-weight:400">(승차권에 표시)</span></div>
          <div class="booking-discount-options" id="booking-discount-options">
            ${Object.entries(DISCOUNTS).map(([k,d])=>`<button class="booking-discount-option${k==='none'?' active':''}" data-discount="${k}">${d.label}${d.rate?`<span class="booking-discount-rate">${Math.round(d.rate*100)}%↓</span>`:''}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="flex-shrink:0;padding-top:8px">
        <button class="btn btn-primary booking-confirm-btn" id="booking-confirm-btn" disabled>좌석 등급을 선택하세요</button>
        <button class="alarm-popup-close" id="booking-cancel-btn">취소</button>
      </div>
    </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e=>{ if(e.target===wrap||e.target===wrap.firstElementChild) closeBookingPopup(); });
  // addEventListener 방식으로 버튼 이벤트 등록 (iOS Safari overflow:auto 내부 onclick 미동작 방지)
  wrap.querySelectorAll('.booking-seat-option').forEach(btn=>{
    const cls=btn.dataset.class;
    btn.addEventListener('click', ()=>selectSeatClass(btn, cls));
  });
  document.getElementById('booking-seat-select-btn')?.addEventListener('click', ()=>openSeatSelectorFromBooking(trainNo));
  document.getElementById('booking-stepper-minus')?.addEventListener('click', ()=>changePassengerCount(-1));
  document.getElementById('booking-stepper-plus')?.addEventListener('click', ()=>changePassengerCount(1));
  wrap.querySelectorAll('.booking-discount-option').forEach(btn=>{
    btn.addEventListener('click', ()=>selectDiscount(btn, btn.dataset.discount));
  });
  const _confirmBtn=document.getElementById('booking-confirm-btn');
  if(_confirmBtn) addMobileTap(_confirmBtn, doConfirmBooking);
  const _cancelBtn=document.getElementById('booking-cancel-btn');
  if(_cancelBtn) addMobileTap(_cancelBtn, closeBookingPopup);
  (()=>{const cl=document.getElementById('booking-clock');if(!cl)return;
    const tick=()=>{const n=new Date();if(cl)cl.textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
    tick();const ti=setInterval(tick,1000);
    const obs=new MutationObserver(()=>{if(!document.getElementById('booking-popup-wrap')){clearInterval(ti);obs.disconnect();}});
    obs.observe(document.body,{childList:true});
  })();
  window._bookingSeatClass=null;
  window._bookingPassengerCount=1;
  window._bookingDiscount='none';
}
function selectDiscount(btn,key){
  document.querySelectorAll('.booking-discount-option').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._bookingDiscount=key;
  // 좌석 등급별 표시 요금을 할인 반영해 갱신
  const a=window._bArgs||{}; const t=ALL_TRAINS.find(x=>x.no===a.trainNo);
  if(t) document.querySelectorAll('.booking-seat-option').forEach(b=>{
    const c=b.dataset.class; const fe=b.querySelector('.booking-seat-fare');
    if(fe) fe.textContent=applyDiscount(calcFare(t,a.fromStn,a.toStn,c),key).toLocaleString()+'원';
  });
}
function closeBookingPopup(){
  const w=document.getElementById('booking-popup-wrap');
  if(w)w.remove();
}
function selectSeatClass(btn,cls){
  document.querySelectorAll('.booking-seat-option').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._bookingSeatClass=cls;
  const confirmBtn=document.getElementById('booking-confirm-btn');
  if(confirmBtn){confirmBtn.disabled=false;confirmBtn.style.opacity='1';confirmBtn.textContent='🎫 예매하기';}
  const sb=document.getElementById('booking-seat-select-btn');
  const d=document.getElementById('booking-seat-display');
  window._preselectedSeats=null;
  const isStanding = cls==='standing';
  if(sb){
    // 입석/자유석: 지정 좌석이 없으므로 좌석 선택 버튼을 막고 안내로 대체
    sb.disabled=isStanding;
    sb.style.opacity=isStanding?'.55':'1';
    sb.style.cursor=isStanding?'not-allowed':'pointer';
    sb.innerHTML=isStanding
      ? '🚉 입석·자유석 전용 칸 <span style="color:var(--text3);font-weight:400">— 좌석 지정 없음</span>'
      : '🪑 직접 선택 — <span id="booking-seat-display" style="color:var(--accent2)">자동 배정</span>';
  }
  if(!isStanding && d) d.textContent='자동 배정';
}
function changePassengerCount(delta){
  let n=(window._bookingPassengerCount||1)+delta;
  n=Math.max(1,Math.min(6,n));
  window._bookingPassengerCount=n;
  const el=document.getElementById('booking-passenger-count');
  if(el)el.textContent=n;
}
function doConfirmBooking(){
  if(!window._bookingSeatClass){alert('좌석 등급을 먼저 선택해주세요');return;}
  const a=window._bArgs||{};
  confirmBooking(a.trainNo,a.fromStn,a.toStn,a.depTime,a.arrTime);
}

function confirmBooking(trainNo,fromStn,toStn,depTime,arrTime){
  const t=ALL_TRAINS.find(x=>x.no===trainNo);
  if(!t)return;
  const seatClass=window._bookingSeatClass;
  if(!seatClass){alert('좌석 등급을 선택해주세요.');return;}
  const count=window._bookingPassengerCount||1;
  const discount=window._bookingDiscount||'none';
  const baseFare=calcFare(t,fromStn,toStn,seatClass);
  const fare=applyDiscount(baseFare,discount);

  const dateInput=document.getElementById('booking-date');
  const travelDate=dateInput&&dateInput.value?dateInput.value:todayLocalStr();

  // 오늘 날짜 예매 시 출발 시각이 현재 시각보다 이전이면 차단
  if(travelDate===todayLocalStr()){
    const nowCheck=new Date();
    const nowMCheck=nowCheck.getHours()*60+nowCheck.getMinutes();
    const depMCheck=toMin(depTime);
    if(depMCheck!==null && depMCheck<nowMCheck){
      alert(`이미 출발한 열차는 예매할 수 없습니다.\n\n${fromStn} ${depTime} 출발 → 현재 시각 ${String(nowCheck.getHours()).padStart(2,'0')}:${String(nowCheck.getMinutes()).padStart(2,'0')}`);
      return;
    }
  }

  // 같은 날짜에 탑승 시간이 겹치는 다른 승차권이 이미 있는지 확인
  const newDepM=toMin(depTime), newArrM=toMin(arrTime);
  if(newDepM!==null&&newArrM!==null){
    const existing=loadTickets().filter(tk=>tk.status==='active'&&tk.travelDate===travelDate);
    const conflict=existing.find(tk=>{
      const exDep=toMin(tk.depTime), exArr=toMin(tk.arrTime);
      if(exDep===null||exArr===null)return false;
      // 두 구간이 겹치는지: 자정 넘는 경우는 단순화하여 정상 구간만 정밀 체크
      const aStart=newDepM, aEnd=newArrM>=newDepM?newArrM:newArrM+1440;
      const bStart=exDep, bEnd=exArr>=exDep?exArr:exDep+1440;
      return aStart<bEnd && bStart<aEnd;
    });
    if(conflict){
      alert(`같은 시간대에 이미 예매한 승차권이 있습니다.\n\n${conflict.trainNo}번 · ${conflict.fromStn}→${conflict.toStn}\n${conflict.depTime}~${conflict.arrTime} (${conflict.travelDate})\n\n시간이 겹치는 승차권은 동시에 예매할 수 없습니다.`);
      return;
    }
  }

  const tickets=loadTickets();
  const seats=(window._preselectedSeats&&window._preselectedSeats.length===count)?[...window._preselectedSeats]:Array.from({length:count},()=>randomSeat(seatClass,trainNo));
  window._preselectedSeats=null;

  tickets.push({
    id:genTicketId(),
    trainNo,grade:t.grade,line:t.line,
    fromStn,toStn,depTime,arrTime,
    seatClass,seatClassLabel:SEAT_CLASSES[seatClass].label,
    seats,passengerCount:count,
    farePerPerson:fare,totalFare:fare*count,
    discount,discountLabel:DISCOUNTS[discount].label,baseFarePerPerson:baseFare,
    distanceKm:Math.round(routeDistanceKm(t,fromStn,toStn)),
    bookedAt:Date.now(),
    travelDate,
    status:'active', // active | used | cancelled
  });
  saveTickets(tickets);

  // 승차역/하차역 알람 자동 설정 (이미 설정되어 있으면 건너뜀, 안내 문구 없이 조용히)
  try{
    const fi=t.stops.findIndex(s=>s.s===fromStn);
    const ti=t.stops.findIndex(s=>s.s===toStn);
    if(Notification.permission==='granted'){
      if(fi>0 && !hasAlarm(`board:${trainNo}:${fromStn}`)){
        const prevStop=t.stops.slice(0,fi).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr));
        const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;
        toggleAlarmType('board',trainNo,fromStn,depTime,prevTime,true);
      } else if(fi===0 && !hasAlarm(`board:${trainNo}:${fromStn}`)){
        toggleAlarmType('board',trainNo,fromStn,depTime,null,true);
      }
      if(ti>=0 && !hasAlarm(`arr:${trainNo}:${toStn}`)){
        const prevStop2=t.stops.slice(0,ti).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr));
        const prevTime2=prevStop2?(hasTime(prevStop2.dep)?prevStop2.dep:prevStop2.arr):null;
        toggleAlarmType('arr',trainNo,toStn,arrTime,prevTime2,true);
      }
    }
  }catch(e){console.warn('자동 알람 설정 실패:',e);}

  closeBookingPopup();
  alert(`예매가 완료되었습니다!\n${travelDate} · ${fromStn} → ${toStn}\n${SEAT_CLASSES[seatClass].label} ${count}명${discount!=='none'?' · '+DISCOUNTS[discount].label:''} · ${(fare*count).toLocaleString()}원`);
  if(document.getElementById('panel-ticket')?.classList.contains('active')) renderTickets();
  // 왕복 예매 콜백 (편도 예매 완료 후 복편 조회)
  if(window._afterBookingCallback){
    const cb = window._afterBookingCallback;
    window._afterBookingCallback = null;
    cb();
  }
}

function cancelTicket(id){
  if(!confirm('이 승차권을 취소하시겠습니까?'))return;
  const tickets=loadTickets();
  const idx=tickets.findIndex(tk=>tk.id===id);
  if(idx<0)return;
  const tk=tickets[idx];

  // 출발 이후 취소 불가
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  const depM=toMin(tk.depTime);
  if(tk.travelDate===todayLocalStr(now) && depM!==null && depM<=nowM){
    alert(`이미 출발한 열차는 취소할 수 없습니다.\n\n${tk.fromStn} ${tk.depTime} 출발 → 현재 시각 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    return;
  }

  tickets[idx].status='cancelled';
  saveTickets(tickets);

  // 승하차 알람 자동 해제
  try{
    const alarms=loadAlarms();
    const filtered=alarms.filter(a=>!(a.trainNo===tk.trainNo&&(a.stn===tk.fromStn||a.stn===tk.toStn)));
    saveAlarms(filtered);
  }catch(e){console.warn('알람 해제 실패:',e);}

  renderTickets();
  renderAlarmIfOpen();
}
function deleteTicket(id){
  if(!confirm('이 승차권 기록을 삭제하시겠습니까?'))return;
  saveTickets(loadTickets().filter(tk=>tk.id!==id));
  renderTickets();
}


// ══════════════════════════════════════════
// 🔲 QR코드 생성 (Canvas 기반, 외부 라이브러리 없음)
// 승차권 정보를 QR 패턴으로 시각화 (디자인 요소)
// ══════════════════════════════════════════
function generateQRCanvas(text, size){
  // 간단한 매트릭스 기반 패턴 생성 (실제 QR 인코딩 근사)
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const N = 25; // 25x25 모듈
  const cell = Math.floor(size / N);

  // 문자열을 숫자 배열로 변환 (의사 랜덤 패턴)
  function strToSeed(s){
    let h = 0;
    for(let i=0;i<s.length;i++) h = (Math.imul(31,h) + s.charCodeAt(i)) | 0;
    return h;
  }
  function seededRand(seed, i){
    let x = Math.sin(seed * 9301 + i * 49297 + 233) * 803.9;
    return x - Math.floor(x);
  }

  const seed = strToSeed(text);
  const mod = [];
  for(let r=0;r<N;r++){
    mod[r]=[];
    for(let c=0;c<N;c++) mod[r][c] = seededRand(seed, r*N+c) > 0.5 ? 1 : 0;
  }

  // QR 위치 감지 패턴 (좌상/우상/좌하 코너 고정)
  function drawFinder(r, c){
    for(let dr=0;dr<7;dr++) for(let dc=0;dc<7;dc++){
      mod[r+dr][c+dc] =
        (dr===0||dr===6||dc===0||dc===6) ? 1 :
        (dr>=2&&dr<=4&&dc>=2&&dc<=4) ? 1 : 0;
    }
  }
  drawFinder(0,0); drawFinder(0,N-7); drawFinder(N-7,0);

  // 분리자 (흰색 테두리)
  for(let i=0;i<8;i++){
    mod[7][i]=0; mod[i][7]=0;
    mod[7][N-1-i]=0; mod[i][N-8]=0;
    mod[N-8][i]=0; mod[N-1-i][7]=0;
  }

  // 타이밍 패턴
  for(let i=8;i<N-8;i++){
    mod[6][i] = i%2===0?1:0;
    mod[i][6] = i%2===0?1:0;
  }

  // 렌더링
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle = '#0d1117';
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      if(mod[r][c]){
        ctx.fillRect(c*cell, r*cell, cell, cell);
      }
    }
  }
  return canvas;
}

function openQRPopup(ticketId){
  const tickets = loadTickets();
  const tk = tickets.find(t=>t.id===ticketId);
  if(!tk) return;

  const old = document.getElementById('qr-popup-wrap');
  if(old) old.remove();

  // 개표(탑승완료) 자동 전이: 하차역을 지났으면 완료 처리 후 저장
  if(tk.board==='active' && isTicketPast(tk)){ tk.board='done'; saveTickets(tickets); }
  const bs = ticketBoardState(tk);
  const _qtrain = ALL_TRAINS.find(x=>x.no===tk.trainNo);
  const tkDistKm = tk.distanceKm || (_qtrain?Math.round(routeDistanceKm(_qtrain,tk.fromStn,tk.toStn)):0);

  const qrText = `NIMBIRAIL:${tk.id}:${tk.trainNo}:${tk.fromStn}:${tk.toStn}:${tk.travelDate}:${tk.depTime}`;
  const gradeC = `var(--c-${gcCssVar(tk.grade)})`;
  const discBadge = (tk.discount && tk.discount!=='none') ? `<span class="rt-badge" style="margin-left:0">${tk.discountLabel}</span>` : '';
  const boardBadge = bs==='active' ? `<span class="rt-board-badge rt-board-active">● 탑승 중</span>`
    : bs==='done' ? `<span class="rt-board-badge rt-board-done">탑승 완료</span>`
    : `<span class="rt-board-badge rt-board-none">미개표</span>`;
  const boardBtn = canBoardTicket(tk) && bs==='none'
    ? `<button class="rt-act-btn rt-act-board" onclick="boardTicket('${tk.id}')">🎫 탑승하기 (개표)</button>`
    : bs==='active'
    ? `<button class="rt-act-btn rt-act-board" disabled>✓ 개표 완료</button>`
    : canManualBoard(tk)
    ? `<button class="rt-act-btn rt-act-board rt-act-manual" onclick="openManualBoard('${tk.id}')">🖐️ 수개표 (개표 놓침)</button>`
    : '';

  window._qrTicketId = tk.id;
  const wrap = document.createElement('div');
  wrap.id = 'qr-popup-wrap';
  wrap.innerHTML = `
    <div class="rail-ticket-backdrop"></div>
    <div class="rail-ticket-wrap">
      <div class="rt-flip" id="rt-flip">
       <div class="rt-flip-inner">
        <div class="rail-ticket rt-face rt-front" style="--tk:${gradeC}" onclick="if(event.target.closest('.rt-act-btn'))return;flipRailTicket()">
          <div class="rt-holo"></div>
          <div class="rt-watermark"><span>${('NIMBIRAIL · 재판매금지 · '+tk.id+' · ').repeat(28)}</span></div>
          <div class="rt-top">
            <span class="rt-grade" style="color:${gradeC}">${tk.grade}</span>
            <span class="rt-no">${tk.trainNo}</span>
            <span style="margin-left:auto;display:flex;gap:6px;align-items:center">${discBadge}${boardBadge}</span>
          </div>
          <div class="rt-route">
            <div class="rt-stn"><div class="rt-stn-name">${tk.fromStn}</div><div class="rt-stn-time">${tk.depTime||''}</div></div>
            <div class="rt-arrow" style="color:${gradeC}">→</div>
            <div class="rt-stn rt-stn-r"><div class="rt-stn-name">${tk.toStn}</div><div class="rt-stn-time">${tk.arrTime||''}</div></div>
          </div>
          <div class="rt-meta">
            <div><span class="rt-k">날짜</span><span class="rt-v">${tk.travelDate}</span></div>
            <div><span class="rt-k">등급</span><span class="rt-v">${tk.seatClassLabel}</span></div>
            <div><span class="rt-k">소요</span><span class="rt-v">${fmtDurKor(durMin(tk.depTime,tk.arrTime))}</span></div>
            <div><span class="rt-k">좌석</span><span class="rt-v">${seatSummary(tk.seats)}</span></div>
            <div><span class="rt-k">운임</span><span class="rt-v">${fmtWon(tk.totalFare)}</span></div>
            <div><span class="rt-k">인원</span><span class="rt-v">${tk.passengerCount}명${discBadge?' · '+tk.discountLabel:''}</span></div>
          </div>
          <div class="rt-perf"></div>
          <div class="rt-qr" id="qr-canvas-wrap"></div>
          <div class="rt-id">${tk.id}</div>
          <div class="rt-actions">
            ${boardBtn}
            <button class="rt-act-btn" onclick="flipRailTicket()">🚆 편성·좌석 ⟳</button>
          </div>
        </div>
        <div class="rail-ticket rt-face rt-back" style="--tk:${gradeC}" id="rt-back">
          <div class="rt-back-head">
            <span>🚆 ${tk.grade} ${tk.trainNo} · ${tk.seatClassLabel} ${seatSummary(tk.seats)}</span>
            <button class="tcard-back-btn" onclick="flipRailTicket()">← 승차권</button>
          </div>
          <div class="rt-back-body" id="rt-back-body"></div>
        </div>
       </div>
      </div>
      <button class="alarm-popup-close" style="margin-top:12px" onclick="closeQRPopup()">닫기</button>
    </div>`;
  document.body.appendChild(wrap);

  const canvas = generateQRCanvas(qrText, 225);
  canvas.style.cssText = 'display:block';
  document.getElementById('qr-canvas-wrap').appendChild(canvas);
}
// QR 승차권 뒤집기: 앞(QR) ↔ 뒤(편성·좌석). 뒷면은 최초 뒤집을 때 렌더.
function flipRailTicket(){
  const flip=document.getElementById('rt-flip'); if(!flip) return;
  const inner=flip.querySelector('.rt-flip-inner');
  const front=flip.querySelector('.rt-front');
  const back=flip.querySelector('.rt-back');
  if(!inner||!front||!back) return;
  const willFlip=!flip.classList.contains('flipped');
  if(willFlip){
    const body=document.getElementById('rt-back-body');
    if(body && !body.dataset.rendered){
      const tk=loadTickets().find(t=>t.id===window._qrTicketId);
      if(tk){ body.innerHTML=renderFormationContent(tk); body.dataset.rendered='1'; }
    }
    // 뒤집기 완료 후 3D 해제(settled) — iPad 뒷면 스크롤·비침 수정
    // rotateY(180)→none 전환이 transition을 타면 역회전으로 보이므로 반드시 transition 없이 적용
    clearTimeout(flip._settleT);
    flip._settleT=setTimeout(()=>{
      if(!flip.classList.contains('flipped'))return;
      inner.style.transition='none';
      flip.classList.add('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    },650);
  } else {
    // settled 해제는 transition 없이 즉시(펄럭임 방지) 원래 rotateY(180) 상태로 복귀 후 역회전
    clearTimeout(flip._settleT);
    if(flip.classList.contains('settled')){
      inner.style.transition='none';
      flip.classList.remove('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    }
  }
  inner.style.height=(willFlip?front.offsetHeight:inner.offsetHeight)+'px';
  flip.classList.toggle('flipped', willFlip); // 클래스는 즉시 토글(연타 방지)
  requestAnimationFrame(()=>{
    let h;
    if(willFlip){
      // 뒷면: 머리말 + 본문 실제 콘텐츠 높이 → 뷰포트 82%로 상한. 넘치면 본문이 스크롤
      const head=back.querySelector('.rt-back-head');
      const body=document.getElementById('rt-back-body');
      const need=(head?head.offsetHeight:44)+(body?body.scrollHeight:0)+4;
      h=Math.min(need, Math.round(window.innerHeight*0.82));
    } else h=front.offsetHeight;
    inner.style.height=h+'px';
  });
}
// 티켓 ID 기반 의사 바코드 생성 (연출용)
function genBarcodeHTML(str){
  let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0;
  let seed=h||12345, out='';
  for(let i=0;i<46;i++){ seed=(seed*1103515245+12345)>>>0; const w=1+((seed>>8)%3); const on=((seed>>4)&3)!==0; out+=`<i style="width:${w}px;background:${on?'#e6edf3':'transparent'}"></i>`; }
  return out;
}

function closeQRPopup(){
  const el = document.getElementById('qr-popup-wrap');
  if(el) el.remove();
}

// ══════════════════════════════════════════
// 🎫 개표 / 탑승 처리 (QR 체크인)
// ══════════════════════════════════════════
// 하차역(도착)을 이미 지났는지 (탑승완료 판정)
function isTicketPast(tk){
  if(tk.status==='cancelled') return false;
  const now=new Date(); const nowMin=now.getHours()*60+now.getMinutes();
  const depM=toMin(tk.depTime), arrM=toMin(tk.arrTime);
  const isOvernight = depM!==null && arrM!==null && depM>arrM;
  const arrDate = isOvernight ? (()=>{ const d=new Date(tk.travelDate+'T00:00:00'); d.setDate(d.getDate()+1); return todayLocalStr(d); })() : tk.travelDate;
  if(arrDate<todayLocalStr(now)) return true;
  if(arrDate>todayLocalStr(now)) return false;
  return arrM!==null && arrM<nowMin;
}
// 승차권 개표 상태: 'none'(미개표) | 'active'(탑승 중) | 'done'(탑승 완료)
function ticketBoardState(tk){
  if(tk.board==='done') return 'done';
  if(isTicketPast(tk)) return 'done';
  return tk.board==='active' ? 'active' : 'none';
}
// 지금 개표(탑승) 가능한가 — 열차 출발 후 10분 이내에만 (출발 전 불가)
function canBoardTicket(tk){
  if(tk.status!=='active' || isTicketPast(tk)) return false;
  const depM=toMin(tk.depTime);
  if(depM===null || !tk.travelDate) return false;
  const dep=new Date(tk.travelDate+'T00:00:00');
  if(isNaN(dep.getTime())) return false;
  dep.setMinutes(depM);
  const sinceDep=(Date.now()-dep.getTime())/60000; // 출발 후 경과 분
  return sinceDep>=0 && sinceDep<=10;
}
// 수개표 가능 — 정상 개표창(출발 후 10분)을 놓쳤지만 아직 운행 중(하차 전)일 때
function canManualBoard(tk){
  if(tk.status!=='active' || isTicketPast(tk)) return false;
  if(ticketBoardState(tk)!=='none') return false;
  const depM=toMin(tk.depTime);
  if(depM===null || !tk.travelDate) return false;
  const dep=new Date(tk.travelDate+'T00:00:00');
  if(isNaN(dep.getTime())) return false;
  dep.setMinutes(depM);
  const sinceDep=(Date.now()-dep.getTime())/60000;
  return sinceDep>10; // 정상창(0~10분) 이후 ~ 하차 전
}
// 개표 확정 (상태 갱신 + 연출) — 정상/수개표 공통
function _doBoard(id, manual){
  const tickets=loadTickets();
  const tk=tickets.find(t=>t.id===id);
  if(!tk) return;
  tk.board='active';
  if(manual) tk.manualBoard=true;
  saveTickets(tickets);
  playGateSound();
  if(navigator.vibrate) try{ navigator.vibrate([30,40,30]); }catch(e){}
  showGateAnimation(tk, ()=>{
    if(document.getElementById('qr-popup-wrap')) openQRPopup(id);
    if(typeof renderTickets==='function') renderTickets();
    if(typeof updateHomeTripWidget==='function') updateHomeTripWidget();
  }, manual);
}
// 개표 실행 → 게이트 통과 연출 + 소리 → 상태 갱신
function boardTicket(id){
  const tickets=loadTickets();
  const tk=tickets.find(t=>t.id===id);
  if(!tk) return;
  if(!canBoardTicket(tk)){ alert('지금은 개표할 수 없는 승차권입니다.\n(개표는 열차 출발 후 10분 이내에만 가능합니다)'); return; }
  _doBoard(id, false);
}
// 개표음 (WebAudio, 실제 개찰구 "삑" 2음)
function playGateSound(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ac=new AC();
    const beep=(freq,start,dur)=>{
      const o=ac.createOscillator(), g=ac.createGain();
      o.type='square'; o.frequency.value=freq;
      o.connect(g); g.connect(ac.destination);
      const t0=ac.currentTime+start;
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(0.2,t0+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.start(t0); o.stop(t0+dur+0.02);
    };
    beep(1046,0,0.11); beep(1568,0.13,0.2);
    setTimeout(()=>{ try{ ac.close(); }catch(e){} }, 900);
  }catch(e){}
}
// 게이트 통과 애니메이션 오버레이
function showGateAnimation(tk, done, manual){
  document.getElementById('gate-overlay')?.remove();
  const ov=document.createElement('div');
  ov.id='gate-overlay'; ov.className='gate-overlay';
  ov.innerHTML=`<div class="gate-scene">
    <div class="gate-beep"></div>
    <div class="gate-lamp"></div>
    <div class="gate-door left"></div>
    <div class="gate-door right"></div>
    <div class="gate-check">✓ ${manual?'수개표':'개표'} 완료 · ${tk.fromStn} 승차</div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{ ov.remove(); if(done) done(); }, 1750);
}

// 🖐️ 수개표 미니게임 — 개표 도장 타이밍 (초록 구간에 도장 3회)
let _manBoard=null;
function openManualBoard(id){
  const tickets=loadTickets(); const tk=tickets.find(t=>t.id===id); if(!tk)return;
  if(!canManualBoard(tk)){ alert('지금은 수개표할 수 없는 승차권입니다.'); return; }
  closeManualBoard();
  const ov=document.createElement('div'); ov.id='manboard-overlay'; ov.className='manboard-overlay';
  ov.innerHTML=`<div class="manboard-card">
    <div class="manboard-title">🖐️ 수개표</div>
    <div class="manboard-desc">개표 시간을 놓쳤어요.<br>움직이는 표시가 <b style="color:var(--green)">초록 구간</b>에 올 때 도장을 찍어 승무원 확인을 받으세요.</div>
    <div class="manboard-count"><span id="manboard-dots"></span> <span id="manboard-num">0 / 3</span></div>
    <div class="manboard-track" id="manboard-track">
      <div class="manboard-zone" id="manboard-zone"></div>
      <div class="manboard-marker" id="manboard-marker"></div>
    </div>
    <button class="btn btn-primary manboard-hit" id="manboard-hit" onclick="manBoardHit()">🖐️ 도장 찍기</button>
    <button class="manboard-cancel" onclick="closeManualBoard()">취소</button>
  </div>`;
  document.body.appendChild(ov);
  _manBoard={id, pos:0, dir:1, speed:0.9, need:3, done:0, zone:[0,0], lock:false, raf:null};
  _manBoardSetZone(); _manBoardRender();
  const marker=document.getElementById('manboard-marker');
  const step=()=>{ if(!_manBoard)return;
    if(!_manBoard.lock){ _manBoard.pos+=_manBoard.dir*_manBoard.speed;
      if(_manBoard.pos>=100){_manBoard.pos=100;_manBoard.dir=-1;}
      if(_manBoard.pos<=0){_manBoard.pos=0;_manBoard.dir=1;}
      if(marker)marker.style.left=_manBoard.pos+'%'; }
    _manBoard.raf=requestAnimationFrame(step); };
  _manBoard.raf=requestAnimationFrame(step);
}
function _manBoardSetZone(){
  if(!_manBoard)return;
  const widths=[20,15,11]; const w=widths[Math.min(_manBoard.done,2)];
  const center=25+Math.random()*50;
  const a=Math.max(2,center-w/2), b=Math.min(98,center+w/2);
  _manBoard.zone=[a,b]; _manBoard.speed=0.9+_manBoard.done*0.35;
  const z=document.getElementById('manboard-zone'); if(z){z.style.left=a+'%';z.style.width=(b-a)+'%';}
}
function _manBoardRender(){
  if(!_manBoard)return;
  const num=document.getElementById('manboard-num'); if(num)num.textContent=_manBoard.done+' / '+_manBoard.need;
  const dots=document.getElementById('manboard-dots'); if(dots)dots.textContent='●'.repeat(_manBoard.done)+'○'.repeat(_manBoard.need-_manBoard.done);
}
function manBoardHit(){
  if(!_manBoard||_manBoard.lock)return;
  const {pos,zone}=_manBoard;
  const mk=document.getElementById('manboard-marker');
  if(pos>=zone[0]&&pos<=zone[1]){
    _manBoard.done++; _manBoardRender(); _manBoard.lock=true;
    if(mk)mk.classList.add('stamp');
    try{playGateSound();}catch(e){}
    if(_manBoard.done>=_manBoard.need){
      const id=_manBoard.id;
      setTimeout(()=>{ closeManualBoard(); _doBoard(id,true); }, 430);
      return;
    }
    setTimeout(()=>{ if(!_manBoard)return; if(mk)mk.classList.remove('stamp'); _manBoardSetZone(); _manBoard.lock=false; }, 400);
  } else {
    const card=document.querySelector('.manboard-card');
    if(card){ card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    if(navigator.vibrate)try{navigator.vibrate(60);}catch(e){}
  }
}
function closeManualBoard(){
  if(_manBoard&&_manBoard.raf)cancelAnimationFrame(_manBoard.raf);
  _manBoard=null;
  document.getElementById('manboard-overlay')?.remove();
}

// ══════════════════════════════════════════
// 🚆 편성 정보 + 좌석 배치도
// ══════════════════════════════════════════
// 편성별 편의시설 배치 (칸 번호 → 아이콘/설명). 실제 열차 감성의 대표 배치.
function getCarAmenities(formType, composition){
  const n=composition.length;
  const map={};
  const add=(car,emoji,label)=>{ if(car>=1&&car<=n){ (map[car]=map[car]||[]).push({emoji,label}); } };
  // 카페/스낵칸 (편성 중앙 근처)
  if(formType==='ktx-1'){ add(4,'☕','카페칸'); add(4,'♿','휠체어석'); add(15,'👶','유아동반'); add(18,'🚲','자전거'); }
  else if(formType==='ktx-sancheon'||formType==='ktx-eum'){ add(1,'♿','휠체어석'); add(4,'☕','스낵자판기'); add(3,'👶','유아동반'); add(n-2,'🚲','자전거'); }
  else if(formType==='itx-cc'){ add(1,'♿','휠체어석'); add(5,'🚲','자전거'); add(6,'👶','유아동반'); }
  else if(formType==='itx-sm'){ add(1,'♿','휠체어석'); add(3,'👶','유아동반'); add(4,'🚲','자전거'); }
  else { add(1,'♿','휠체어석'); add(4,'🚲','자전거'); }
  return map;
}
// 티켓 좌석 문자열 파싱: "3호차 12A" → {car:3,row:12,col:'A'}
function parseSeat(str){
  if(!str) return null;
  const carM=String(str).match(/(\d+)\s*호차?/);
  const car=carM?parseInt(carM[1]):null;
  const rest=String(str).replace(/\d+\s*호차?/,'').trim();
  // 열+문자 (예: 12A)
  const lm=rest.match(/(\d+)\s*([A-Da-d])/);
  if(lm) return { car, row:parseInt(lm[1]), col:lm[2].toUpperCase() };
  // 연번 좌석 (예: 45, 45번)
  const nm=rest.match(/(\d+)/);
  if(nm) return { car, seatNum:parseInt(nm[1]) };
  return car!==null ? { car } : null;
}
function parseSeats(seats){ return (seats||[]).map(parseSeat).filter(Boolean); }
// 좌석 요약: 1석은 그대로, 다인석은 "첫좌석 외 N석"
function seatSummary(seats){
  if(!seats||!seats.length) return '-';
  if(seats.length===1) return String(seats[0]);
  return `${seats[0]} 외 ${seats.length-1}석`;
}
function openFormationPopup(ticketId){
  const tk=loadTickets().find(t=>t.id===ticketId);
  if(!tk){ return; }
  document.getElementById('fmt-popup-wrap')?.remove();
  const formType=getFormationType(tk.grade, tk.trainNo);
  const comp=getCarComposition(formType);
  const amen=getCarAmenities(formType, comp);
  const mySeats=parseSeats(tk.seats);
  const mySeat=mySeats[0]||null;
  const myCar = mySeat ? mySeat.car : null;
  const gradeC=`var(--c-${gcCssVar(tk.grade)})`;
  window._fmtCtx={ formType, comp, amen, mySeat, mySeats, tk };

  // 편성도 (차량 카드들)
  const carsHtml=comp.map(c=>{
    const isMine = mySeats.some(s=>s.car===c.car);
    const a=(amen[c.car]||[]).map(x=>x.emoji).join('');
    return `<div class="fmt-car t-${c.type}${isMine?' sel':''}" onclick="selectFmtCar(${c.car})" id="fmt-car-${c.car}">
      ${isMine?'<span class="fmt-car-mine">내 좌석</span>':''}
      <div class="fmt-car-no">${c.car}</div>
      <div class="fmt-car-type">${c.label}</div>
      <div class="fmt-car-amen">${a||'&nbsp;'}</div>
    </div>`;
  }).join('');

  // 정차위치 안내: 내 칸이 편성에서 앞/중/뒤 어디인지
  let platMsg='';
  if(myCar!==null){
    const ratio=myCar/comp.length;
    const zone = ratio<=0.34?'앞쪽':ratio<=0.67?'가운데':'뒤쪽';
    const markPct = Math.round(((myCar-0.5)/comp.length)*100);
    platMsg=`<div class="fmt-platform">
      <span>승강장 정차 시 내 칸(<b>${myCar}호차</b>)은 열차 <b>${zone}</b></span>
      <span class="fmt-plat-bar"><span class="fmt-plat-mark" style="left:${markPct}%"></span></span>
    </div>`;
  }

  const wrap=document.createElement('div');
  wrap.id='fmt-popup-wrap';
  wrap.innerHTML=`
    <div class="fmt-backdrop" onclick="closeFormationPopup()"></div>
    <div class="fmt-wrap">
      <div class="fmt-sheet">
        <div class="fmt-head">
          <span class="fmt-head-grade" style="color:${gradeC}">${tk.grade}</span>
          <span class="fmt-head-no">${tk.trainNo}</span>
          <span style="font-size:12px;color:var(--text2)">${tk.seatClassLabel} · ${seatSummary(tk.seats)}</span>
          <button class="fmt-head-close" onclick="closeFormationPopup()">✕</button>
        </div>
        <div class="fmt-body">
          <div class="fmt-sec-label">🚆 편성 안내 (${comp.length}량)</div>
          <div class="fmt-train"><div class="fmt-loco"></div>${carsHtml}</div>
          ${platMsg}
          <div class="fmt-sec-label">💺 좌석 배치도</div>
          <div id="fmt-seatmap"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  selectFmtCar(myCar!==null?myCar:comp.find(c=>c.type!=='free')?.car||1);
}
// 승차권 카드 뒷면용 편성/좌석 콘텐츠 (내 칸 중심, 비대화형)
function renderFormationContent(tk){
  const formType=getFormationType(tk.grade, tk.trainNo);
  const comp=getCarComposition(formType);
  const amen=getCarAmenities(formType, comp);
  const mySeats=parseSeats(tk.seats);
  const mySeat=mySeats[0]||null;
  const myCar = mySeat ? mySeat.car : (comp.find(c=>c.type!=='free')?.car||1);
  const carsHtml=comp.map(c=>{
    const isMine = mySeats.some(s=>s.car===c.car);
    const a=(amen[c.car]||[]).map(x=>x.emoji).join('');
    return `<div class="fmt-car t-${c.type}${isMine?' sel':''}">
      ${isMine?'<span class="fmt-car-mine">내 좌석</span>':''}
      <div class="fmt-car-no">${c.car}</div>
      <div class="fmt-car-type">${c.label}</div>
      <div class="fmt-car-amen">${a||'&nbsp;'}</div>
    </div>`;
  }).join('');
  let platMsg='';
  if(mySeat){
    const ratio=myCar/comp.length;
    const zone = ratio<=0.34?'앞쪽':ratio<=0.67?'가운데':'뒤쪽';
    const markPct = Math.round(((myCar-0.5)/comp.length)*100);
    platMsg=`<div class="fmt-platform">
      <span>승강장 정차 시 내 칸(<b>${myCar}호차</b>)은 열차 <b>${zone}</b></span>
      <span class="fmt-plat-bar"><span class="fmt-plat-mark" style="left:${markPct}%"></span></span>
    </div>`;
  }
  return `
    <div class="fmt-sec-label">🚆 편성 안내 (${comp.length}량)</div>
    <div class="fmt-train"><div class="fmt-loco"></div>${carsHtml}</div>
    ${platMsg}
    <div class="fmt-sec-label">💺 좌석 배치도 · ${myCar}호차</div>
    ${renderSeatMap(comp, myCar, mySeat, amen, tk.grade, mySeats)}
  `;
}
// 승차권 카드 뒤집기 (앞↔뒤). 뒷면 편성/좌석은 최초 뒤집을 때 렌더
function flipTicketCard(id, ev){
  if(ev) ev.stopPropagation();
  const flip=document.getElementById('tcf-'+id); if(!flip) return;
  const inner=flip.querySelector('.tcard-inner');
  const front=flip.querySelector('.tcard-front');
  const back=flip.querySelector('.tcard-back');
  if(!inner||!front||!back) return;
  const willFlip=!flip.classList.contains('flipped');
  if(willFlip){
    const body=document.getElementById('tcbody-'+id);
    if(body && !body.dataset.rendered){
      const tk=loadTickets().find(t=>t.id===id);
      if(tk){ body.innerHTML=renderFormationContent(tk); body.dataset.rendered='1'; }
    }
    clearTimeout(flip._settleT);
    flip._settleT=setTimeout(()=>{
      if(!flip.classList.contains('flipped'))return;
      inner.style.transition='none';
      flip.classList.add('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    },650);
  } else {
    clearTimeout(flip._settleT);
    if(flip.classList.contains('settled')){
      inner.style.transition='none';
      flip.classList.remove('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    }
  }
  inner.style.height=(willFlip?front.offsetHeight:back.offsetHeight)+'px';
  requestAnimationFrame(()=>{
    flip.classList.toggle('flipped', willFlip);
    const h = willFlip ? Math.min(back.scrollHeight, Math.round(window.innerHeight*0.78)) : front.offsetHeight;
    inner.style.height=h+'px';
  });
}
function selectFmtCar(car){
  const ctx=window._fmtCtx; if(!ctx) return;
  document.querySelectorAll('.fmt-car').forEach(el=>el.classList.remove('sel'));
  const cEl=document.getElementById('fmt-car-'+car); if(cEl) cEl.classList.add('sel');
  // 내 좌석 칸이면 selected 유지되도록 mine 클래스는 별도
  const myCar = ctx.mySeat ? ctx.mySeat.car : null;
  if(myCar!==null){ const mEl=document.getElementById('fmt-car-'+myCar); if(mEl) mEl.classList.add('sel'); }
  const box=document.getElementById('fmt-seatmap');
  if(box) box.innerHTML=renderSeatMap(ctx.comp, car, ctx.mySeat, ctx.amen, ctx.tk&&ctx.tk.grade, ctx.mySeats);
}
function renderSeatMap(comp, car, mySeat, amenMap, grade, mySeats){
  const _wide=_wideWindow(grade);
  // 창문 클래스: 넓은 창은 홀수 열에만 2열 span 창, 짝수 열은 창(bar) 없음.
  // 홀수 열이 마지막 열(아래 열 없음)이면 넓은 창 대신 1열 창으로.
  const winCls=(side,r,total)=>_winClass(grade,side,r,total);
  const c=comp.find(x=>x.car===car);
  if(!c) return '<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px">배치도 정보 없음</div>';
  if(c.type==='free'){
    return `<div class="seatmap"><div class="seatmap-caption">🚉 <b>${car}호차 · 자유석</b><br><span style="color:var(--text3)">지정 좌석이 없는 입석/자유석 칸입니다.</span></div></div>`;
  }
  const _seats = (mySeats&&mySeats.length)?mySeats:(mySeat?[mySeat]:[]);
  const carSeats = _seats.filter(s=>s&&s.car===car);
  const isMineCar = carSeats.length>0;
  const amenTags=(amenMap[car]||[]).map(a=>`${a.emoji} ${a.label}`).join(' · ');
  const legend=`
    <div class="seat-legend">
      <span><i class="seat-dot" style="background:#3fb950"></i>내 좌석</span>
      <span><i class="seat-dot" style="background:var(--bg3);border:1px solid var(--border)"></i>일반</span>
      <span>▮ 창측</span>
      <span>⚡ 콘센트</span>
    </div>
    ${amenTags?`<div style="font-size:11px;color:var(--text2);margin-bottom:8px">🏷️ ${car}호차: ${amenTags}</div>`:''}`;

  // ── 무궁화: 좌석 1~72 연번 배치 ──
  if(c.numbered){
    const per=c.perRow||4;
    const total=c.totalSeats||72;
    const half=Math.ceil(per/2);
    const nRows=Math.ceil(total/per);
    let rowsHtml='', n=1;
    for(let r=1;r<=nRows;r++){
      let cells='';
      for(let idx=0;idx<per;idx++){
        if(n>total){ cells+='<span class="seat" style="visibility:hidden"></span>'; }
        else{
          const isWindow=idx===0||idx===per-1;
          const winSide=idx===0?'wl':'wr';
          const mine=carSeats.some(s=>s.seatNum===n);
          const cls=['seat'];
          if(isWindow) cls.push(...winCls(winSide,r,nRows).split(' '));
          if(_seatPower(grade,r,isWindow,nRows)) cls.push('power');
          if(mine) cls.push('mine');
          cells+=`<span class="${cls.join(' ')}">${n}</span>`;
          n++;
        }
        if(idx===half-1) cells+='<span class="seat aisle"></span>';
      }
      rowsHtml+=`<div class="seatmap-row">${cells}</div>`;
    }
    const seatStr=carSeats.map(s=>s.seatNum+'번').filter(x=>x!=='undefined번').join(', ');
    return `${legend}
    <div class="seatmap">
      <div class="seatmap-grid">${rowsHtml}</div>
      ${isMineCar&&seatStr?`<div class="seatmap-caption">내 좌석 <b>${car}호차 ${seatStr}</b> · 창측/콘센트 표시 참고</div>`
        :`<div class="seatmap-caption" style="color:var(--text3)">${car}호차 배치도 (좌석 1~${total}번)</div>`}
    </div>`;
  }

  // ── KTX/ITX 계열: 열+좌석문자(A~D), 순/역방향 구분 ──
  const cols=c.cols||['A','B','C','D'];
  const rows=c.rows||15;
  const revRows=c.revRows||0; // 앞쪽 몇 열이 역방향인지
  const missing=new Set(c.missingSeats||[]);
  const half=Math.ceil(cols.length/2); // 통로 위치
  const faceOf = r => r<=revRows ? 'rev' : 'fwd';
  const showDir = revRows>0; // 역방향 좌석이 있을 때만 방향 화살표

  let rowsHtml='';
  for(let r=1;r<=rows;r++){
    const face=faceOf(r);
    let cells='';
    cols.forEach((col,idx)=>{
      const code=`${r}${col}`;
      if(missing.has(code)){ cells+='<span class="seat" style="visibility:hidden"></span>'; }
      else {
        const isWindow = idx===0 || idx===cols.length-1;
        const winSide = idx===0?'wl':'wr';
        const mine = carSeats.some(s=>s.row===r && String(s.col)===String(col));
        const cls=['seat'];
        if(isWindow){ cls.push(...winCls(winSide,r,rows).split(' ')); }
        if(_seatPower(grade,r,isWindow,rows)) cls.push('power');
        if(mine) cls.push('mine');
        cells+=`<span class="${cls.join(' ')}">${col}</span>`;
      }
      if(idx===half-1 && cols.length>2){
        cells+= showDir
          ? `<span class="seat aisle seatmap-arrow ${face}">${face==='fwd'?'▲':'▽'}</span>`
          : '<span class="seat aisle"></span>';
      }
    });
    rowsHtml+=`<div class="seatmap-row"><span class="seatmap-rownum">${r}</span>${cells}</div>`;
  }
  const seatStr=carSeats.map(s=>`${s.row}${s.col}`).join(', ');
  return `${legend}
    <div class="seatmap">
      ${showDir?'<div class="seatmap-dir-legend"><span class="seatmap-arrow fwd">▲</span>순방향 <span class="seatmap-arrow rev">▽</span>역방향</div>':''}
      <div class="seatmap-grid">${rowsHtml}</div>
      ${isMineCar?`<div class="seatmap-caption">내 좌석 <b>${car}호차 ${seatStr}</b> · 창측/콘센트 표시 참고</div>`
        :`<div class="seatmap-caption" style="color:var(--text3)">${car}호차 배치도 (내 좌석은 ${_seats[0]?_seats[0].car+'호차':'-'})</div>`}
    </div>`;
}
function closeFormationPopup(){ document.getElementById('fmt-popup-wrap')?.remove(); }

// ══════════════════════════════════════════
// 🎟️ 정기권 시스템
// ══════════════════════════════════════════
const PASS_KEY = 'nimbi_passes';
function loadPasses(){ try{ return JSON.parse(localStorage.getItem(PASS_KEY))||[]; }catch(e){ return []; } }
function savePasses(p){ localStorage.setItem(PASS_KEY, JSON.stringify(p)); }

function openPassRegisterPopup(){
  const old = document.getElementById('pass-register-wrap');
  if(old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'pass-register-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9950;display:flex;align-items:center;justify-content:center';
  wrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(2px);z-index:0" onclick="closePassRegisterPopup()"></div>
    <div style="position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;width:90vw;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-height:90vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div class="alarm-popup-title" style="margin-bottom:0">🎟️ 정기권 등록</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="pass-reg-clock"></div>
      </div>
      <div class="alarm-popup-sub">자주 이용하는 구간을 등록하세요</div>
      <div class="booking-section-label">출발역</div>
      <div style="margin-bottom:4px">
        <input type="text" id="pass-from" placeholder="출발역 입력" autocomplete="off"
          style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none">
        <div id="ac-pass-from" style="background:var(--bg2);border:1px solid var(--accent);border-top:none;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;display:none"></div>
      </div>
      <div class="booking-section-label">도착역</div>
      <div style="margin-bottom:4px">
        <input type="text" id="pass-to" placeholder="도착역 입력" autocomplete="off"
          style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none">
        <div id="ac-pass-to" style="background:var(--bg2);border:1px solid var(--accent);border-top:none;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;display:none"></div>
      </div>
      <div class="booking-section-label">이름 (선택)</div>
      <input type="text" id="pass-name" placeholder="예: 출근길, 주말 여행" autocomplete="off"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none;margin-bottom:4px">
      <button class="btn btn-primary booking-confirm-btn" id="pass-reg-confirm" style="margin-top:12px;width:100%;justify-content:center;touch-action:manipulation">등록하기</button>
      <button class="alarm-popup-close" id="pass-reg-cancel" style="margin-top:8px;touch-action:manipulation">취소</button>
    </div>`;
  document.body.appendChild(wrap);
  if(typeof addMobileTap==='function'){
    addMobileTap(document.getElementById('pass-reg-confirm'),confirmPassRegister);
    addMobileTap(document.getElementById('pass-reg-cancel'),closePassRegisterPopup);
  } else {
    document.getElementById('pass-reg-confirm').onclick=confirmPassRegister;
    document.getElementById('pass-reg-cancel').onclick=closePassRegisterPopup;
  }
  (()=>{const cl=document.getElementById('pass-reg-clock');if(!cl)return;
    const tick=()=>{const n=new Date();if(cl)cl.textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
    tick();const ti=setInterval(tick,1000);
    const obs=new MutationObserver(()=>{if(!document.getElementById('pass-register-wrap')){clearInterval(ti);obs.disconnect();}});
    obs.observe(document.body,{childList:true});
  })();
  // ac-dropdown 이벤트 직접 연결
  ['pass-from','pass-to'].forEach(iid=>{
    const inp=document.getElementById(iid);
    const did='ac-'+iid;
    const drop=document.getElementById(did);
    if(!inp||!drop)return;
    inp.addEventListener('input',()=>{
      const q=inp.value.trim();
      if(!q){drop.style.display='none';return;}
      const hits=getBookableStations().filter(s=>matchesQuery(s,q)).slice(0,12);
      if(!hits.length){drop.style.display='none';return;}
      drop.innerHTML=hits.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px;color:var(--text1);border-bottom:1px solid var(--border)"
        onmousedown="event.preventDefault();document.getElementById('${iid}').value='${s}';document.getElementById('${did}').style.display='none'">${s}</div>`).join('');
      drop.style.display='block';
    });
    inp.addEventListener('blur',()=>setTimeout(()=>drop.style.display='none',150));
  });
}

function closePassRegisterPopup(){
  const el = document.getElementById('pass-register-wrap');
  if(el) el.remove();
}

function confirmPassRegister(){
  const from = document.getElementById('pass-from')?.value.trim();
  const to   = document.getElementById('pass-to')?.value.trim();
  const name = document.getElementById('pass-name')?.value.trim();
  if(!from||!to){ alert('출발역과 도착역을 입력해주세요.'); return; }
  if(from===to){ alert('출발역과 도착역이 같습니다.'); return; }
  // 실제 열차 있는지 확인
  const exists = ALL_TRAINS.some(t=>{
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    return fi>=0&&ti>=0&&fi<ti&&!isPassStop(t,from)&&!isPassStop(t,to);
  });
  if(!exists){ alert(`${from} → ${to} 구간을 운행하는 열차가 없습니다.`); return; }
  const passes = loadPasses();
  if(passes.some(p=>p.from===from&&p.to===to)){ alert('이미 등록된 구간입니다.'); return; }
  passes.push({ id:'pass_'+Date.now(), from, to, name:name||(from+'→'+to), createdAt:Date.now() });
  savePasses(passes);
  closePassRegisterPopup();
  _refreshPassViews();
}

// 정기권 목록이 보이는 모든 화면 갱신 (마이페이지 정기권 섹션 + 승차권 화면)
function _refreshPassViews(){
  const my=document.getElementById('result-pass-my');
  if(my)my.innerHTML=renderPassSection();
  if(document.getElementById('result-ticket'))renderTickets();
}

function deletePass(id){
  if(!confirm('이 정기권을 삭제하시겠습니까?')) return;
  savePasses(loadPasses().filter(p=>p.id!==id));
  _refreshPassViews();
}

// 정기권으로 빠른 예매 팝업 열기
// ── 정기권 예매: 예매탭 이동 → 열차 선택 → 요일 선택 ──
function openPassBookingPopup(passId){
  const pass=loadPasses().find(p=>p.id===passId);
  if(!pass)return;
  window._bookFrom=pass.from; window._bookTo=pass.to; window._activePassId=passId;
  openMySection('book');
  setTimeout(()=>{
    // 날짜를 내일로 먼저 설정 (정기권은 요일 기반 — 오늘로 두면 현재 시각 이후 필터에 걸림)
    const dateEl=document.getElementById('book-date-go');
    if(dateEl){
      const d=new Date(); d.setDate(d.getDate()+1);
      dateEl.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    searchBookTrains(false,false);
  },200);
}
function closePassBookingPopup(){document.getElementById('pass-booking-wrap')?.remove();}

function openPassDaySelector(passId,trainNo,from,to,depT,arrT){
  const pass=loadPasses().find(p=>p.id===passId);
  const t=ALL_TRAINS.find(x=>x.no===trainNo);
  if(!pass||!t)return;
  document.getElementById('book-detail-wrap')?.remove();
  const DAY_NAMES=['일','월','화','수','목','금','토'];
  const fareHtml=availableSeatClasses(t.grade).map(c=>{
    const fare=calcFare(t,from,to,c);
    return `<button class="booking-seat-option" data-class="${c}"
      onclick="selectSeatClass(this,'${c}');updatePassDayConfirm()">
      <span class="booking-seat-label">${SEAT_CLASSES[c].label}</span>
      <span class="booking-seat-fare">${fare.toLocaleString()}원</span>
    </button>`;
  }).join('');
  const wrap=document.createElement('div');
  wrap.id='pass-day-wrap';
  // z-index는 예매 상세 시트(9901)보다 위 · 버튼은 스크롤 영역 밖 고정 (모바일 탭 씹힘 방지)
  wrap.style.cssText='position:fixed;inset:0;z-index:9950;display:flex;align-items:center;justify-content:center;pointer-events:auto';
  wrap.innerHTML=`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);z-index:0" onclick="closePassDaySelector()"></div>
    <div style="position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:14px;width:90vw;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="flex:1;min-height:0;overflow-y:auto;padding:20px 20px 4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:15px;font-weight:700">🎟️ 정기권 예매</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="pass-day-clock"></div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">${pass.name} · ${from} → ${to}</div>
        <div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <div style="color:var(--c-${gcCssVar(t.grade)});font-weight:700;margin-bottom:4px">${t.grade} ${trainNo}</div>
          <div style="font-family:var(--mono);font-size:13px">${depT} → ${arrT||'-'} · ${durStr(depT,arrT)}</div>
        </div>
        <div class="booking-section-label">매주 반복 요일 선택 (복수 선택)</div>
        <div style="display:flex;gap:6px;margin-bottom:10px">
          ${DAY_NAMES.map((d,i)=>`<button data-day="${i}"
            style="flex:1;padding:10px 2px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;touch-action:manipulation"
            onclick="togglePassDay(this)">${d}</button>`).join('')}
        </div>
        <div id="pass-day-preview" style="font-size:12px;color:var(--text3);margin-bottom:14px;min-height:16px"></div>
        <div class="booking-section-label">좌석 등급</div>
        <div class="booking-seat-options" style="margin-bottom:14px">${fareHtml}</div>
        <div class="booking-section-label">인원</div>
        <div class="booking-passenger-control" style="margin-bottom:8px">
          <button class="booking-stepper-btn" onclick="changePassengerCount(-1)">−</button>
          <span id="booking-passenger-count">1</span>
          <button class="booking-stepper-btn" onclick="changePassengerCount(1)">+</button>
        </div>
      </div>
      <div style="flex-shrink:0;padding:10px 20px 18px;border-top:1px solid var(--border)">
        <button id="pass-day-confirm" disabled
          style="width:100%;padding:13px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:14px;font-weight:700;cursor:pointer;opacity:.5;touch-action:manipulation">
          요일과 좌석 등급을 선택하세요
        </button>
        <button id="pass-day-cancel" class="alarm-popup-close" style="margin-top:8px;width:100%;touch-action:manipulation">취소</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  window._bookingSeatClass=null; window._bookingPassengerCount=1; window._selectedPassDays=[];
  // 모바일 탭 호환 등록 (inline onclick 대신)
  if(typeof addMobileTap==='function'){
    addMobileTap(document.getElementById('pass-day-confirm'),()=>confirmPassDayBooking(passId,trainNo,from,to,depT,arrT||''));
    addMobileTap(document.getElementById('pass-day-cancel'),closePassDaySelector);
  } else {
    document.getElementById('pass-day-confirm').onclick=()=>confirmPassDayBooking(passId,trainNo,from,to,depT,arrT||'');
    document.getElementById('pass-day-cancel').onclick=closePassDaySelector;
  }
  const cl=document.getElementById('pass-day-clock');
  const tick=()=>{const n=new Date();if(cl)cl.textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
  tick(); const ti=setInterval(tick,1000);
  const obs=new MutationObserver(()=>{if(!document.getElementById('pass-day-wrap')){clearInterval(ti);obs.disconnect();}});
  obs.observe(document.body,{childList:true});
}

function getDatesForDays(days){
  const dates=[]; const today=new Date(); today.setHours(0,0,0,0);
  for(let w=0;w<4;w++) for(const d of days){
    const dt=new Date(today); let diff=d-dt.getDay(); if(diff<=0)diff+=7;
    dt.setDate(dt.getDate()+diff+w*7);
    const s=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if(!dates.includes(s))dates.push(s);
  }
  return dates.sort();
}

window.togglePassDay=function(btn){
  const d=parseInt(btn.dataset.day);
  if(!window._selectedPassDays)window._selectedPassDays=[];
  const idx=window._selectedPassDays.indexOf(d);
  if(idx>=0){window._selectedPassDays.splice(idx,1);btn.style.borderColor='var(--border)';btn.style.background='var(--bg3)';btn.style.color='var(--text2)';}
  else{window._selectedPassDays.push(d);btn.style.borderColor='var(--accent)';btn.style.background='rgba(56,139,253,.15)';btn.style.color='var(--accent2)';}
  updatePassDayConfirm();
};

function updatePassDayConfirm(){
  const dates=getDatesForDays(window._selectedPassDays||[]);
  const preview=document.getElementById('pass-day-preview');
  if(preview)preview.textContent=dates.length?`앞으로 4주 · ${dates.length}장 예매 예정 (${dates.slice(0,2).join(', ')}${dates.length>2?` 외 ${dates.length-2}건`:''})` :'';
  const btn=document.getElementById('pass-day-confirm');
  if(btn){
    const ok=dates.length>0&&!!window._bookingSeatClass;
    btn.disabled=!ok;btn.style.opacity=ok?'1':'0.5';
    btn.textContent=ok?'🎫 정기권 예매하기':'요일과 좌석 등급을 선택하세요';
  }
}

function closePassDaySelector(){document.getElementById('pass-day-wrap')?.remove();}

function confirmPassDayBooking(passId,trainNo,from,to,depT,arrT){
  const seatClass=window._bookingSeatClass;
  if(!seatClass){alert('좌석 등급을 선택해주세요.');return;}
  const days=window._selectedPassDays||[];
  if(!days.length){alert('요일을 선택해주세요.');return;}
  const t=ALL_TRAINS.find(x=>x.no===trainNo);
  if(!t)return;
  const count=window._bookingPassengerCount||1, fare=calcFare(t,from,to,seatClass);
  const tickets=loadTickets(); let created=0;
  for(const date of getDatesForDays(days)){
    const depM=toMin(depT),arrM=toMin(arrT||'');
    const conflict=tickets.filter(tk=>tk.status==='active'&&tk.travelDate===date).some(tk=>{
      const eD=toMin(tk.depTime),eA=toMin(tk.arrTime);
      if(eD===null||depM===null)return false;
      return !(arrM!==null&&arrM<=eD||eA!==null&&eA<=depM);
    });
    if(conflict)continue;
    const seats=Array.from({length:count},()=>randomSeat(seatClass,trainNo));
    const id='NB'+date.replace(/-/g,'')+Math.random().toString(36).slice(2,6).toUpperCase();
    tickets.push({id,trainNo,grade:t.grade,fromStn:from,toStn:to,depTime:depT,arrTime:arrT||'',
      travelDate:date,seatClass,seatClassLabel:SEAT_CLASSES[seatClass].label,
      seats,passengerCount:count,farePerPerson:fare,totalFare:fare*count,status:'active',bookedAt:Date.now(),isPass:true,passId});
    created++;
  }
  saveTickets(tickets); closePassDaySelector(); window._activePassId=null;
  const DN=['일','월','화','수','목','금','토'];
  alert(`정기권 예매 완료!
${from} → ${to} · ${t.grade} ${trainNo}
매주 ${days.sort().map(d=>DN[d]).join('·')} · ${created}장
${SEAT_CLASSES[seatClass].label} · ${count}명 · ${(fare*count).toLocaleString()}원/회`);
  openMySection('ticket');
}

// 정기권 섹션 렌더링
function renderPassSection(){
  const passes = loadPasses();
  const addBtn = `<button class="btn" style="font-size:12px;padding:5px 12px" onclick="openPassRegisterPopup()">＋ 구간 등록</button>`;
  if(!passes.length){
    return `<div class="pass-section">
      <div class="pass-section-title">🎟️ 정기권</div>
      <p class="hint" style="margin:4px 0 8px">자주 이용하는 구간을 등록하면 날짜만 선택해서 바로 예매할 수 있습니다.</p>
      ${addBtn}
    </div>`;
  }
  const cards = passes.map(p=>`
    <div class="pass-card">
      <div class="pass-card-info" onclick="openPassBookingPopup('${p.id}')">
        <div class="pass-card-name">${p.name}</div>
        <div class="pass-card-route">${p.from} → ${p.to}</div>
      </div>
      <button class="btn btn-primary" style="font-size:12px;padding:6px 14px;white-space:nowrap" onclick="openPassBookingPopup('${p.id}')">🎫 예매</button>
      <button class="alarm-del-btn" onclick="deletePass('${p.id}')">✕</button>
    </div>`).join('');
  return `<div class="pass-section">
    <div class="pass-section-title">🎟️ 정기권 <span style="font-size:11px;color:var(--text3);font-weight:400">${passes.length}개 등록</span></div>
    ${cards}
    ${addBtn}
  </div>`;
}


// ══════════════════════════════════════════
// 🪑 열차 편성 & 좌석 배치 시스템
// ══════════════════════════════════════════
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
  if(grade==='무궁화호'||grade==='남도해양') return 'mgh';
  return 'mgh';
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
      return Array.from({length:6},(_,i)=>({car:i+1,type:'general',label:'일반실',rows:13,cols:['A','B','C','D'],revRows:0,totalSeats:52}));
    case 'itx-maum':
      // ITX-마음 한강로-충주 4량
      return Array.from({length:4},(_,i)=>({car:i+1,type:'general',label:'일반실',rows:13,cols:['A','B','C','D'],revRows:0,totalSeats:52}));
    case 'mgh':
    default:
      // 무궁화 6량: 4호차 카페객차(입석·좌석0), 나머지 5량 좌석 1~72 연번 4석 1열(18열)
      return [
        {car:1,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],perRow:4,totalSeats:72},
        {car:2,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],perRow:4,totalSeats:72},
        {car:3,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],perRow:4,totalSeats:72},
        {car:4,type:'free',label:'카페객차',cafe:true,totalSeats:0},
        {car:5,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],perRow:4,totalSeats:72},
        {car:6,type:'general',label:'일반실',numbered:true,rows:18,cols:['1','2','3','4'],perRow:4,totalSeats:72},
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
function seatSeqNum(car,row,col){ return (row-1)*((car.cols?car.cols.length:4))+((SEAT_COL_IDX[col]||0))+1; }
function seatId(car,row,col){
  return car.numbered ? `${car.car}호차 ${seatSeqNum(car,row,col)}번` : `${car.car}호차 ${row}${col}`;
}
// 넓은 창(2열당 1창) 차량 판별 — KTX-산천 계열(산천·SRT)과 ITX-마음만 좁은 창(1열당 1창)
function _wideWindow(grade){ return grade!=='KTX-산천' && grade!=='ITX-마음' && grade!=='SRT'; }
// 창문 배치 클래스 — 무궁화: 전 구간 2열 정렬창 / KTX 계열: 좌·우 한 열씩 엇갈린 걸침창 / 그 외: 좌석당 1창
function _winClass(grade, side, r, total){
  if(!_wideWindow(grade)) return `win ${side}`;
  if(grade==='무궁화호'||grade==='남도해양'){ // [1·2],[3·4]… 양쪽 동일
    return r%2===1 ? (r+1<=total?`win win-wide ${side}`:`win ${side}`) : `${side}`;
  }
  // KTX 계열 걸침: 왼쪽은 홀수행 시작, 오른쪽은 맨앞 단독 + 짝수행 시작 (좌우 엇갈림)
  if(side==='wl'){
    return r%2===1 ? (r+1<=total?`win win-wide ${side}`:`win ${side}`) : `${side}`;
  }
  if(r===1) return `win ${side}`;
  return r%2===0 ? (r+1<=total?`win win-wide ${side}`:`win ${side}`) : `${side}`;
}
// 콘센트(전원) 위치 — 등급별
function _seatPower(grade, r, isWindow, totalRows){
  if(grade==='ITX-마음'||grade==='KTX-이음') return true;      // 전좌석
  if(!isWindow) return false;                                  // 이하 창측 자리만
  if(grade==='무궁화호'||grade==='남도해양') return r===1||r===totalRows; // 맨앞·맨뒷열 창가
  if(grade==='ITX-새마을') return r<=3||r>totalRows-3;         // 앞 3열·뒤 3열 창가
  return r%2===1;                                              // KTX 계열: 창틀 만나는 홀수열 창가
}

// 혼잡도 알고리즘 → nimbi_congestion.js 참조
// ── 좌석 선택 팝업 ──
let _selectedSeats=[];
let _seatCarIdx=0;
// 003: 좌석 선호 (다중) — pos:창측/복도, dir:순/역방향, zone:앞/뒤, pw:콘센트 — 저장됨
let _seatPrefs=(()=>{try{const s=localStorage.getItem('nimbi_seatprefs');return new Set(s?JSON.parse(s):[]);}catch(e){return new Set();}})();
const _PREF_GROUP={window:'pos',aisle:'pos',fwd:'dir',rev:'dir',front:'zone',rear:'zone',power:'pw'};
let _seatPrefOpen=false;
function toggleSeatPref(p){
  if(_seatPrefs.has(p)) _seatPrefs.delete(p);
  else { const g=_PREF_GROUP[p]; for(const x of [..._seatPrefs]) if(_PREF_GROUP[x]===g) _seatPrefs.delete(x); _seatPrefs.add(p); }
  try{localStorage.setItem('nimbi_seatprefs',JSON.stringify([..._seatPrefs]));}catch(e){}
  switchSeatCar(_seatCarIdx);
}
function toggleSeatPrefPanel(){ _seatPrefOpen=!_seatPrefOpen; const p=document.getElementById('seat-pref-panel'); if(p)p.classList.toggle('open',_seatPrefOpen); const b=document.getElementById('pref-toggle-btn'); if(b)b.classList.toggle('open',_seatPrefOpen); }
function clearSeatPrefs(){ _seatPrefs.clear(); try{localStorage.setItem('nimbi_seatprefs','[]');}catch(e){} switchSeatCar(_seatCarIdx); }
// 003·004: 좌석 자동 배정 (선호/인접/마주보기)
function _seatAutoPick(mode){
  const wrap=document.getElementById('seat-selector-wrap'); if(!wrap)return;
  const trainNo=wrap.dataset.trainNo, travelDate=wrap.dataset.travelDate, seatClass=wrap.dataset.seatClass;
  const t=ALL_TRAINS.find(x=>x.no===trainNo); if(!t)return;
  const composition=getCarComposition(getFormationType(t.grade,trainNo));
  const validCars=getCarsForClass(composition,seatClass);
  const car=validCars[_seatCarIdx]; if(!car||!car.cols){return;}
  const booked=getBookedSeats(trainNo,travelDate), missing=new Set(car.missingSeats||[]);
  const count=window._bookingPassengerCount||1, cols=car.cols, n=cols.length;
  const half=Math.ceil(n/2);
  const isWin=idx=>idx===0||idx===n-1;
  const isAisle=idx=> n>2 && (idx===half-1||idx===half);
  const avail=(r,col)=>!missing.has(`${r}${col}`)&&!booked.has(seatId(car,r,col));
  let pick=[];
  if(mode==='pref'){
    const revRows=car.revRows||0;
    const faceOf=r=> r<=revRows?'rev':'fwd';
    const matches=s=>{
      for(const p of _seatPrefs){
        if(p==='window' && !isWin(s.idx)) return false;
        if(p==='aisle'  && !isAisle(s.idx)) return false;
        if(p==='fwd'    && faceOf(s.r)!=='fwd') return false;
        if(p==='rev'    && faceOf(s.r)!=='rev') return false;
        if(p==='front'  && s.r>Math.ceil(car.rows/2)) return false;
        if(p==='rear'   && s.r<=Math.floor(car.rows/2)) return false;
        if(p==='power'  && !_seatPower(t.grade,s.r,isWin(s.idx),car.rows)) return false;
      }
      return true;
    };
    const order=[];
    for(let r=1;r<=car.rows;r++) cols.forEach((col,idx)=>{ if(avail(r,col)) order.push({r,col,idx}); });
    let pool=order.filter(matches);
    if(!pool.length){ alert('선호 조건에 맞는 빈 좌석이 이 호차에 없습니다.\n조건을 줄이거나 다른 호차를 확인해 주세요.'); return; }
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; } // 조건 내 랜덤
    pick=pool.slice(0,count).map(s=>seatId(car,s.r,s.col));
    if(pick.length<count){ setTimeout(()=>alert(`선호 조건에 맞는 좌석이 ${pick.length}석뿐입니다.\n나머지는 직접 선택하거나 조건을 줄여 주세요.`),50); }
  } else if(mode==='adjacent'){
    outer: for(let r=1;r<=car.rows;r++) for(let s=0;s+count<=n;s++){
      let ok=true; for(let k=0;k<count;k++){ if(!avail(r,cols[s+k])){ok=false;break;} }
      if(ok){ for(let k=0;k<count;k++)pick.push(seatId(car,r,cols[s+k])); break outer; }
    }
  } else if(mode==='facing'){
    outer2: for(let r=1;r<car.rows;r++) for(let c=0;c+1<n;c++){
      if(avail(r,cols[c])&&avail(r,cols[c+1])&&avail(r+1,cols[c])&&avail(r+1,cols[c+1])){
        pick.push(seatId(car,r,cols[c]),seatId(car,r,cols[c+1]),seatId(car,r+1,cols[c]),seatId(car,r+1,cols[c+1])); break outer2;
      }
    }
  }
  if(!pick.length){ alert('이 호차에서 조건에 맞는 좌석을 찾지 못했어요. 다른 호차를 확인해 주세요.'); return; }
  _selectedSeats=pick.slice(0, mode==='facing'?4:count);
  switchSeatCar(_seatCarIdx);
}

function openSeatSelector(trainNo, travelDate, seatClass){
  const t=ALL_TRAINS.find(x=>x.no===trainNo);
  if(!t)return;
  const formType=getFormationType(t.grade,trainNo);
  const composition=getCarComposition(formType);
  const validCars=getCarsForClass(composition,seatClass);
  if(!validCars.length){alert('해당 좌석 등급의 호차가 없습니다.');return;}
  generateVirtualBookings(trainNo,travelDate,composition);
  _selectedSeats=[]; _seatCarIdx=0;
  document.getElementById('seat-selector-wrap')?.remove();
  const wrap=document.createElement('div');
  wrap.id='seat-selector-wrap';
  wrap.dataset.trainNo=trainNo; wrap.dataset.travelDate=travelDate; wrap.dataset.seatClass=seatClass;
  wrap.style.cssText='position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;background:var(--bg)';
  document.body.appendChild(wrap);
  _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,getBookedSeats(trainNo,travelDate),composition);
}

function _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,booked,composition){
  const car=validCars[_seatCarIdx];
  const count=window._bookingPassengerCount||1;
  const missing=new Set(car.missingSeats||[]);
  const isFreeCar = car.type==='free' || !car.rows; // 자유석/입석 칸: 지정 좌석 없음
  const isKtxType=['ktx-1','ktx-sancheon','ktx-eum'].includes(getFormationType(t.grade,trainNo));

  // 방향 표시: 역방향 좌석이 있는 칸(revRows>0)만 통로에 열별 화살표. 역방향 없는 칸(KTX 이외 등)은 방향 미표시.
  const revRows=car.revRows||0;
  const showDir=revRows>0;

  // 잔여석 한 번에 계산 (getCarRemaining 반복 호출 방지)
  function calcRem(c){
    if(c.type==='free') return '-';
    const miss=new Set(c.missingSeats||[]);
    let total=0,bc=0;
    for(let r=1;r<=c.rows;r++){
      c.cols.forEach(col=>{
        if(miss.has(`${r}${col}`))return;
        total++;
        if(booked.has(seatId(c,r,col)))bc++;
      });
    }
    return total-bc;
  }

  const _wide=_wideWindow(t.grade);
  const winCls=(side,r,total)=>_winClass(t.grade,side,r,total);
  function seatHTML(){
    const cols=car.cols;
    const half=Math.ceil(cols.length/2);
    const faceOf=r=>r<=revRows?'rev':'fwd';
    let html='';
    for(let r=1;r<=car.rows;r++){
      const face=faceOf(r);
      let cells='';
      cols.forEach((col,idx)=>{
        if(missing.has(`${r}${col}`)){ cells+='<span class="seat seat-pick seat-empty" style="visibility:hidden"></span>'; }
        else {
          const id=seatId(car,r,col);
          const label=car.numbered?`${seatSeqNum(car,r,col)}`:`${r}${col}`;
          const isB=booked.has(id), isS=_selectedSeats.includes(id);
          const isWin=idx===0||idx===cols.length-1, winSide=idx===0?'wl':'wr';
          const cls=['seat','seat-pick'];
          if(isWin) cls.push(...winCls(winSide,r,car.rows).split(' '));
          if(_seatPower(t.grade,r,isWin,car.rows)) cls.push('power');
          if(isB) cls.push('taken'); else if(isS) cls.push('sel');
          cells+=`<button class="${cls.join(' ')}" data-sid="${id}" ${isB?'disabled':''} onclick="toggleSeatBtn('${id}',${count})">${label}</button>`;
        }
        if(idx===half-1 && cols.length>2){
          cells+= showDir
            ? `<span class="seat aisle seatmap-arrow ${face}">${face==='fwd'?'▲':'▽'}</span>`
            : '<span class="seat aisle"></span>';
        }
      });
      html+=`<div class="seatmap-row"><span class="seatmap-rownum">${r}</span>${cells}</div>`;
    }
    return html;
  }

  // 현재 호차만 잔여석 계산, 나머지는 클릭 시 계산 (성능 최적화)
  const curRem=calcRem(car);
  const carTabs=validCars.map((c,i)=>`<button class="seat-car-tab${i===_seatCarIdx?' active':''}" onclick="switchSeatCar(${i})">
      ${c.car}호차<br><span style="font-size:10px;font-weight:400">${i===_seatCarIdx?curRem+'석':'…'}</span>
    </button>`).join('');

  wrap.innerHTML=`
    <div class="seat-header">
      <button class="seat-back-btn" onclick="closeSeatSelector()">✕</button>
      <div class="seat-header-info">
        <div style="font-size:14px;font-weight:700">${t.grade} ${trainNo}</div>
        <div style="font-size:11px;color:var(--text2)">${car.car}호차 · 잔여 ${curRem}석</div>
      </div>
      <div style="font-size:12px;color:var(--text2);font-family:var(--mono)" id="seat-sel-clock"></div>
    </div>
    <div class="seat-car-tabs">${carTabs}</div>
    <div class="seat-legend">
      <span class="seat-legend-item"><span class="seat-dot available"></span>선택가능</span>
      <span class="seat-legend-item"><span class="seat-dot selected"></span>선택됨</span>
      <span class="seat-legend-item"><span class="seat-dot booked"></span>예약됨</span>
      <span class="seat-legend-item">▮ 창측</span>
      <span class="seat-legend-item">⚡ 콘센트</span>
      ${showDir?'<span class="seat-legend-item"><span class="seatmap-arrow fwd">▲</span>순방향 <span class="seatmap-arrow rev">▽</span>역방향</span>':''}
    </div>
    <div class="seat-label-row">
      <div style="font-size:11px;color:var(--text3)">창측 내측</div>
      <div></div>
      <div style="font-size:11px;color:var(--text3)">내측 창측</div>
    </div>
    <div class="seat-auto-bar">
      <button class="seat-auto-chip act" onclick="_seatAutoPick('pref')">✨ 자동 배정</button>
      ${count>=2?`<button class="seat-auto-chip act" onclick="_seatAutoPick('adjacent')">👥 인접</button>`:''}
      ${count===4?`<button class="seat-auto-chip act" onclick="_seatAutoPick('facing')">🔄 마주</button>`:''}
      <button class="seat-auto-chip pref-toggle${_seatPrefs.size?' on':''}${_seatPrefOpen?' open':''}" id="pref-toggle-btn" onclick="toggleSeatPrefPanel()">🎯 선호${_seatPrefs.size?` (${_seatPrefs.size})`:''} <span class="pref-caret">▾</span></button>
    </div>
    <div class="seat-pref-panel${_seatPrefOpen?' open':''}" id="seat-pref-panel">
      <button class="seat-auto-chip${_seatPrefs.has('window')?' on':''}" onclick="toggleSeatPref('window')">🪟 창측</button>
      ${car.cols.length>2?`<button class="seat-auto-chip${_seatPrefs.has('aisle')?' on':''}" onclick="toggleSeatPref('aisle')">🚶 복도</button>`:''}
      <button class="seat-auto-chip${_seatPrefs.has('power')?' on':''}" onclick="toggleSeatPref('power')">⚡ 콘센트</button>
      <button class="seat-auto-chip${_seatPrefs.has('front')?' on':''}" onclick="toggleSeatPref('front')">⬆ 앞쪽</button>
      <button class="seat-auto-chip${_seatPrefs.has('rear')?' on':''}" onclick="toggleSeatPref('rear')">⬇ 뒤쪽</button>
      ${showDir?`<button class="seat-auto-chip${_seatPrefs.has('fwd')?' on':''}" onclick="toggleSeatPref('fwd')">▲ 순방향</button>
      <button class="seat-auto-chip${_seatPrefs.has('rev')?' on':''}" onclick="toggleSeatPref('rev')">▽ 역방향</button>`:''}
      ${_seatPrefs.size?`<button class="seat-auto-chip pref-clear" onclick="clearSeatPrefs()">✕ 초기화</button>`:''}
    </div>
    <div class="seat-map">${isFreeCar
      ? `<div class="seatmap"><div class="seatmap-caption" style="margin-top:48px;font-size:13px">🚉 <b>${car.car}호차 · ${car.label||'자유석'}</b><br><br><span style="color:var(--text3)">지정 좌석이 없는 입석·자유석 전용 칸입니다.<br>좌석 선택 없이 예매해 주세요.</span></div></div>`
      : `<div class="seatmap-grid pick">${seatHTML()}</div>`}</div>
    <div class="seat-footer">
      <div id="seat-footer-info" style="flex:1;font-size:12px;color:var(--text2)">좌석을 선택해주세요 (${count}명)</div>
      <button class="seat-confirm-btn" id="seat-confirm-btn" disabled style="opacity:.5"
        onclick="confirmSeatSelection()">선택 완료</button>
    </div>`;

  const cl=document.getElementById('seat-sel-clock');
  const tick=()=>{const n=new Date();if(cl)cl.textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
  tick(); const ti=setInterval(tick,1000);
  const obs=new MutationObserver(()=>{if(!document.getElementById('seat-selector-wrap')){clearInterval(ti);obs.disconnect();}});
  obs.observe(document.body,{childList:true});
  _updateSeatFooter(count);
}

window.toggleSeatBtn=function(id,count){
  const idx=_selectedSeats.indexOf(id);
  if(idx>=0) _selectedSeats.splice(idx,1);
  else { if(_selectedSeats.length>=count) _selectedSeats.shift(); _selectedSeats.push(id); }
  document.querySelectorAll('.seat-pick').forEach(btn=>{
    if(btn.classList.contains('taken')) return;
    btn.classList.toggle('sel', _selectedSeats.includes(btn.dataset.sid));
  });
  _updateSeatFooter(count);
};

function _updateSeatFooter(count){
  const info=document.getElementById('seat-footer-info');
  const btn=document.getElementById('seat-confirm-btn');
  if(!info||!btn)return;
  const ok=_selectedSeats.length===count;
  info.textContent=_selectedSeats.length?`선택 좌석: ${_selectedSeats.join(', ')} (${_selectedSeats.length}/${count}명)`:`좌석을 선택해주세요 (${count}명)`;
  btn.disabled=!ok; btn.style.opacity=ok?'1':'0.5';
}

window.switchSeatCar=function(idx){
  _seatCarIdx=idx;
  const wrap=document.getElementById('seat-selector-wrap');
  if(!wrap)return;
  const trainNo=wrap.dataset.trainNo, travelDate=wrap.dataset.travelDate, seatClass=wrap.dataset.seatClass;
  const t=ALL_TRAINS.find(x=>x.no===trainNo); if(!t)return;
  const formType=getFormationType(t.grade,trainNo);
  const composition=getCarComposition(formType);
  const validCars=getCarsForClass(composition,seatClass);
  _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,getBookedSeats(trainNo,travelDate),composition);
};

function closeSeatSelector(){
  document.getElementById('seat-selector-wrap')?.remove();
}

function confirmSeatSelection(){
  if(!_selectedSeats.length){alert('좌석을 선택해주세요.');return;}
  // 환승 예매 시트에서 온 좌석 선택이면 해당 구간에 반영하고 시트로 복귀
  if(window._xferSeatCtx){
    const idx=window._xferSeatCtx.legIdx; window._xferSeatCtx=null;
    if(window._xfer&&window._xfer.legs[idx])window._xfer.legs[idx].seats=[..._selectedSeats];
    closeSeatSelector();
    _renderXferBody();
    return;
  }
  window._preselectedSeats=[..._selectedSeats];
  closeSeatSelector();
  const disp=document.getElementById('booking-seat-display');
  if(disp) disp.textContent=_selectedSeats.join(', ');
  // 예매 버튼 활성화
  const confirmBtn=document.getElementById('booking-confirm-btn');
  if(confirmBtn){confirmBtn.disabled=false;confirmBtn.style.opacity='1';confirmBtn.textContent='🎫 예매하기';}
}

function openSeatSelectorFromBooking(trainNo){
  const dateInp=document.getElementById('booking-date');
  const travelDate=dateInp?.value||window._currentTravelDate||todayLocalStr();
  const seatClass=window._bookingSeatClass||'general';
  if(!window._bookingSeatClass){alert('좌석 등급을 먼저 선택해주세요.');return;}
  if(seatClass==='standing'){alert('입석·자유석은 지정 좌석이 없는 전용 칸입니다.\n좌석 선택 없이 예매하시면 됩니다.');return;}
  window._bookingPassengerCount = window._bookingPassengerCount||_bookPassengerCount||1;
  openSeatSelector(trainNo,travelDate,seatClass);
}


// 승차권 탭 렌더링
let _ticketFilterTab='upcoming'; // upcoming | past | cancelled
function setTicketFilter(f){_ticketFilterTab=f;renderTickets();}
let _ticketView='list'; // list | calendar
let _ticketCalYM=null;   // {y,m} 표시 중인 연·월 (m: 0-11)
let _ticketCalSel=null;  // 선택한 날짜 'YYYY-MM-DD'
function setTicketView(v){_ticketView=v;renderTickets();}
function ticketCalShift(delta){
  if(!_ticketCalYM){const n=new Date();_ticketCalYM={y:n.getFullYear(),m:n.getMonth()};}
  let m=_ticketCalYM.m+delta, y=_ticketCalYM.y;
  while(m<0){m+=12;y--;} while(m>11){m-=12;y++;}
  _ticketCalYM={y,m}; _ticketCalSel=null; renderTickets();
}
function selectTicketCalDate(d){ _ticketCalSel=(_ticketCalSel===d?null:d); renderTickets(); }

// ── 탑승 중인 열차 위젯 (승차권 탭 상단 고정 표시) ──
function renderTripWidget(active){
  if(!active) return '';
  const {ticket,train,status,preBoard,minsUntilDep}=active;

  // ── 승차 준비 중 위젯 (출발 10분 전) ──
  if(preBoard){
    const minStr = fmtEta(minsUntilDep);
    return `<div class="trip-widget trip-widget-preboard" onclick="jumpToTrain('${train.no}')">
      <div class="trip-widget-head">
        <span class="trip-widget-preboard-dot"></span>
        <span class="trip-widget-label" style="color:var(--orange)">승차 준비</span>
        <span class="trip-widget-grade" style="color:var(--c-${gcCssVar(train.grade)})">${train.grade}</span>
        <span class="trip-widget-no">${train.no}</span>
      </div>
      <div class="trip-widget-state" style="color:var(--orange)">🚉 ${minStr} 출발 예정</div>
      <div class="trip-widget-preboard-info">
        <span>${ticket.fromStn} <span style="font-family:var(--mono);color:var(--accent)">${ticket.depTime||''}</span> 출발</span>
        <span style="color:var(--text3)">→</span>
        <span>${ticket.toStn} <span style="font-family:var(--mono);color:var(--green)">${ticket.arrTime||''}</span> 도착</span>
      </div>
      <div class="trip-widget-preboard-seat">${ticket.seatClassLabel} · ${seatSummary(ticket.seats)}</div>
    </div>`;
  }

  // ── 도착 준비 중 위젯 (도착 5분 전) ──
  if(active.preArr){
    const minStr = fmtEta(active.minsUntilArr);
    const gradeC = `var(--c-${gcCssVar(train.grade)})`;
    return `<div class="trip-widget trip-widget-prearr" onclick="jumpToTrain('${train.no}')">
      <div class="trip-widget-head">
        <span class="trip-widget-prearr-dot"></span>
        <span class="trip-widget-label" style="color:var(--green)">도착 준비</span>
        <span class="trip-widget-grade" style="color:${gradeC}">${train.grade}</span>
        <span class="trip-widget-no">${train.no}</span>
      </div>
      <div class="trip-widget-state" style="color:var(--green)">🚉 ${minStr} 도착 예정</div>
      <div class="trip-widget-preboard-info">
        <span>${ticket.fromStn} <span style="font-family:var(--mono);color:var(--accent)">${ticket.depTime||''}</span> 출발</span>
        <span style="color:var(--text3)">→</span>
        <span>${ticket.toStn} <span style="font-family:var(--mono);color:var(--green)">${ticket.arrTime||''}</span> 도착</span>
      </div>
      <div class="trip-widget-preboard-seat">${ticket.seatClassLabel} · ${seatSummary(ticket.seats)}</div>
    </div>`;
  }

  const tl=getTripTimeline3(train,status,ticket);
  // 열차 등급 색상값(hex) — 타임라인 선·진행바에 알파 접미사(55/aa 등)를 붙이므로 hex여야 함
  const gradeColor = GRADE_COLORS[train.grade] || '#8b949e';

  let stateLabel;
  if(status.atStn){
    stateLabel=`${status.atStn}역 정차 중`;
  } else if(status.passStn){
    stateLabel=`${status.passStn}역 통과 중`;
  } else {
    stateLabel=`${ticket.fromStn} → ${ticket.toStn} 이동 중`;
  }

  // 진행률 계산 (탑승구간 기준)
  const depM=toMin(ticket.depTime), arrM=toMin(ticket.arrTime);
  const _wNow=new Date(); const nowM=_wNow.getHours()*60+_wNow.getMinutes();
  let pct=0;
  if(depM!==null&&arrM!==null&&nowM!==null){
    const total=(arrM>=depM)?(arrM-depM):(arrM+1440-depM);
    const elapsed=(nowM>=depM)?(nowM-depM):(nowM+1440-depM);
    pct=Math.max(0,Math.min(100,Math.round(elapsed/Math.max(total,1)*100)));
  }

  // 목적지까지 남은 시간 계산 (익일 도착 포함, 24h 초과 보정)
  let arrivalStr='';
  if(arrM!==null&&nowM!==null){
    let diff=(arrM>=depM)?(arrM-nowM):(arrM+1440-nowM);
    if(diff<0) diff=0;
    if(diff>=1440) diff=diff%1440;
    arrivalStr = diff===0 ? `${ticket.toStn} 곧 도착`
                          : `${ticket.toStn} ${fmtEta(diff)} 도착`;
  }

  // 013: 이번 정차역 도착 안내 (분 단위) — 헤더 우측 상단에 표시
  let nextEtaHtml='';
  if(tl&&tl.cur&&tl.cur.time){
    const cm=toMin(tl.cur.time);
    if(cm!==null){
      let d=cm-nowM; if(d<0)d+=1440;
      if(d<=180){
        const atCur = status.atStn && status.atStn===tl.cur.name;
        const etaTxt = atCur ? '정차 중' : (d<=0 ? '곧 도착' : `${d}분 후 도착 예정`);
        nextEtaHtml=`<span class="trip-widget-head-eta"><span class="tw-eta-stn">이번 정차 ${tl.cur.name}</span><span class="tw-eta-min">${etaTxt}</span></span>`;
      }
    }
  }

  const tlHtml = tl ? `
    <div class="trip-widget-timeline">
      ${tl.prev?`<div class="trip-tl-stop">
        <div class="trip-tl-dot-cell"><span class="trip-tl-dot small"></span></div>
        <div class="trip-tl-name-cell"><span class="trip-tl-name">${tl.prev.name}</span><span class="trip-tl-time">${tl.prev.time||''}</span></div>
      </div>`:''}
      ${tl.prev?`<div class="trip-tl-line-cell"><div class="trip-tl-line" style="background:linear-gradient(90deg,${gradeColor}55,${gradeColor}cc)"></div></div>`:''}
      <div class="trip-tl-stop">
        <div class="trip-tl-dot-cell"><span class="trip-tl-dot current" style="background:${gradeColor};border-color:${gradeColor};box-shadow:0 0 0 4px ${gradeColor}33"></span></div>
        <div class="trip-tl-name-cell"><span class="trip-tl-name current" style="color:${gradeColor}">${tl.cur?tl.cur.name:'이동 중'}</span><span class="trip-tl-time current" style="color:${gradeColor}">${tl.cur?tl.cur.time:''}</span></div>
      </div>
      ${tl.next?`<div class="trip-tl-line-cell"><div class="trip-tl-line" style="background:linear-gradient(90deg,${gradeColor}cc,${gradeColor}44)"></div></div>`:''}
      ${tl.next?`<div class="trip-tl-stop">
        <div class="trip-tl-dot-cell"><span class="trip-tl-dot small"></span></div>
        <div class="trip-tl-name-cell"><span class="trip-tl-name">${tl.next.name}</span><span class="trip-tl-time">${tl.next.time||''}</span></div>
      </div>`:''}
    </div>` : '';

  // 차내 LED "이번 역" 안내 (실제 열차처럼 접근/정차 중인 역을 표시)
  const ledLabel = '이번 역';
  const ledStn = (tl&&tl.cur?tl.cur.name:(status.atStn||'-'));
  const ledFinal = (ledStn===ticket.toStn) ? ' · 내리는 문 확인' : '';

  return `<div class="trip-widget" style="border-color:${gradeColor};background:linear-gradient(135deg,${gradeColor}18,${gradeColor}08)" onclick="jumpToTrain('${train.no}')">
    <div class="trip-widget-head">
      <span class="trip-widget-live-dot"></span>
      <span class="trip-widget-label">탑승 중</span>
      <span class="trip-widget-grade" style="color:${gradeColor}">${train.grade}</span>
      <span class="trip-widget-no">${train.no}</span>
      ${nextEtaHtml}
    </div>
    ${ledEnabled()?`<div class="trip-led"><span class="trip-led-tag">${ledLabel}</span><span class="trip-led-scr"><span class="trip-led-txt">${ledStn}${ledFinal}</span></span></div>`:''}
    <div class="trip-widget-state">${stateLabel}</div>
    ${arrivalStr?`<div class="trip-widget-arrival">${arrivalStr}</div>`:''}
    ${tlHtml}
    <div class="trip-widget-progress">
      <div class="trip-widget-progress-bar"><div class="trip-widget-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${gradeColor},${gradeColor}aa)"></div></div>
      <div class="trip-widget-progress-labels"><span>${ticket.fromStn} ${ticket.depTime||''}</span><span>${ticket.toStn} ${ticket.arrTime||''}</span></div>
    </div>
    <div class="trip-widget-actions">
      <button class="trip-widget-btn" onclick="event.stopPropagation();goLiveTrack('${train.no}')">🗺️ 실시간 위치</button>
      <button class="trip-widget-btn${ledEnabled()?' on':''}" onclick="event.stopPropagation();toggleTripLED(event)">💡 LED${ledEnabled()?' 켜짐':' 꺼짐'}</button>
      <button class="trip-widget-btn${liveActEnabled()?' on':''}" onclick="event.stopPropagation();toggleLiveActivity()">📲 라이브</button>
    </div>
  </div>`;
}
// 실시간 위치: 열려있는 승차권 오버레이/QR 팝업을 닫고 노선도 탭으로 이동해 추적
function goLiveTrack(no){
  try{ closeQRPopup(); }catch(e){}
  document.getElementById('fmt-popup-wrap')?.remove();
  try{ closeMyPage(); }catch(e){}
  switchTab('map');
  setTimeout(()=>trackTrainOnMap(no),200);
}
// 013: 이번 정차역 안내는 분 단위로 표시하며, 위젯 30초 주기 재렌더로 갱신된다.

// 홈(열차 탭)용 간략 여정 카드 (상세는 승차권 탭)
function renderTripWidgetCompact(active){
  if(!active) return '';
  const {ticket,train,status,preBoard,minsUntilDep,preArr,minsUntilArr}=active;
  const gc=GRADE_COLORS[train.grade]||'#8b949e';
  let label,color,ledTag,led,sub;
  if(preBoard){ label='승차 준비'; color='var(--orange)'; ledTag='곧 출발'; led=`${ticket.fromStn} ${ticket.depTime||''}`; sub=`${fmtEta(minsUntilDep)} 출발 · ${ticket.toStn}행`; }
  else if(preArr){ label='도착 준비'; color='var(--green)'; ledTag='곧 도착'; led=`${ticket.toStn}`; sub=`${fmtEta(minsUntilArr)} 도착 · 내리는 문 확인`; }
  else {
    const tl=getTripTimeline3(train,status,ticket);
    ledTag = '이번 역';
    led = (tl&&tl.cur?tl.cur.name:(status.atStn||'-'));
    if(led===ticket.toStn) led += ' · 내리는 문 확인';
    const depM=toMin(ticket.depTime), arrM=toMin(ticket.arrTime);
    const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
    let diff=(arrM!=null&&depM!=null)?((arrM>=depM)?arrM-nowM:arrM+1440-nowM):null;
    if(diff!=null&&diff<0)diff+=1440; if(diff!=null&&diff>=1440)diff%=1440;
    label='탑승 중'; color='var(--green)'; sub=`${ticket.toStn} ${diff!=null?fmtEta(diff):'-'} 도착`;
  }
  return `<div class="trip-mini" style="border-color:${gc}" onclick="switchTab('ticket')">
    <div class="trip-mini-top">
      <span class="trip-mini-dot" style="background:${color}"></span>
      <span class="trip-mini-label" style="color:${color}">${label}</span>
      <span class="trip-mini-grade" style="color:${gc}">${train.grade}</span>
      <span class="trip-mini-no">${train.no}</span>
      <span class="trip-mini-go">승차권 ›</span>
    </div>
    ${ledEnabled()?`<div class="trip-mini-led"><span class="trip-mini-led-tag">${ledTag}</span><span class="trip-mini-led-txt">${led}</span></div>`:''}
    <div class="trip-mini-sub">${sub}</div>
  </div>`;
}
// 홈(열차 탭) 상단 여정 카드 갱신 (간략)
function updateHomeTripWidget(){
  const box=document.getElementById('home-trip-widget');
  if(!box) return;
  const active=getActiveTripTicket();
  box.innerHTML = active ? renderTripWidgetCompact(active) : '';
  box.style.display = active ? '' : 'none';
  if(active) updateTripLED();
}
function renderTripWidgetIfVisible(){
  const tp=document.getElementById('panel-ticket');
  if(tp&&tp.classList.contains('active')) renderTickets();
  const hp=document.getElementById('panel-train');
  if(hp&&hp.classList.contains('active')) updateHomeTripWidget();
  updateLiveActivity();
}
setInterval(renderTripWidgetIfVisible, 30000); // 30초마다 위젯 갱신
setTimeout(()=>{ updateHomeTripWidget(); updateLiveActivity(); }, 800);

// ── 📲 라이브 활동 (잠금화면 진행 알림) ──
// 웹 한계상 iOS는 네이티브 라이브 액티비티 불가 → 안드로이드 지속 알림 / 앱 열림 시 갱신
const LIVEACT_KEY='nimbi_liveact';
function liveActEnabled(){ return localStorage.getItem(LIVEACT_KEY)==='1'; }
function toggleLiveActivity(){
  if(!liveActEnabled()){
    if(!('Notification'in window)){ alert('이 브라우저는 알림을 지원하지 않습니다.'); return; }
    Notification.requestPermission().then(p=>{
      if(p==='granted'){ localStorage.setItem(LIVEACT_KEY,'1'); _liveActLast=''; updateLiveActivity();
        alert('📲 라이브 활동을 켰습니다.\n탑승 중이면 도착까지 남은 시간을 알림으로 표시합니다.\n\n※ Android는 잠금화면에 표시됩니다.\n※ iOS는 앱이 열려 있을 때만 갱신됩니다(웹 제약).'); }
      else alert('알림 권한이 거부되어 켤 수 없습니다.');
      updateHomeTripWidget();
    });
  } else {
    localStorage.setItem(LIVEACT_KEY,'0');
    if('serviceWorker'in navigator) navigator.serviceWorker.ready.then(r=>r.getNotifications({tag:'trip-live'}).then(ns=>ns.forEach(n=>n.close()))).catch(()=>{});
    alert('라이브 활동을 껐습니다.');
    updateHomeTripWidget();
  }
}
let _liveActLast='';
function updateLiveActivity(){
  if(!liveActEnabled()||!('serviceWorker'in navigator)||!('Notification'in window)||Notification.permission!=='granted') return;
  const active=getActiveTripTicket();
  navigator.serviceWorker.ready.then(reg=>{
    if(!active){ reg.getNotifications({tag:'trip-live'}).then(ns=>ns.forEach(n=>n.close())); _liveActLast=''; return; }
    const {ticket,train,status,preBoard,minsUntilDep}=active;
    let title, body;
    if(preBoard){ title=`${train.grade} ${train.no} · 승차 준비`; body=`${ticket.fromStn} ${ticket.depTime} 출발 · ${minsUntilDep}분 전`; }
    else {
      const tl=getTripTimeline3(train,status,ticket);
      const next=(status&&status.atStn)?`${status.atStn} 정차`:(tl&&tl.next?`다음 역 ${tl.next.name}`:'이동 중');
      const arrM=toMin(ticket.arrTime), depM=toMin(ticket.depTime);
      const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
      let diff = arrM!=null&&depM!=null ? ((arrM>=depM)?arrM-nowM:arrM+1440-nowM) : null;
      if(diff!=null&&diff<0) diff+=1440; if(diff!=null&&diff>=1440) diff%=1440;
      title=`${train.grade} ${train.no} · ${ticket.toStn}행`;
      body=`${next} · 도착까지 ${diff!=null?diff+'분':'-'}`;
    }
    const key=title+'|'+body;
    if(key===_liveActLast) return; _liveActLast=key;
    reg.showNotification(title,{ body, tag:'trip-live', renotify:false, silent:true, requireInteraction:true }).catch(()=>{});
  }).catch(()=>{});
}

function renderTickets(){
  const el=document.getElementById('result-ticket');
  if(!el)return;
  const tickets=loadTickets();

  // ── 탑승 중인 열차 위젯 (맨 위 고정) ──
  const activeTrip=getActiveTripTicket();
  const tripWidget=renderTripWidget(activeTrip);

  if(!tickets.length){
    el.innerHTML=`${tripWidget}${renderPassSection()}<div class="empty"><div class="empty-icon">🎫</div><p>예매한 승차권이 없습니다.<br>열차 상세에서 🎫 예매 버튼을 눌러보세요.</p></div>`;
    return;
  }

  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();

  const isPast=tk=>{
    if(tk.status==='cancelled')return false;
    const depM=toMin(tk.depTime);
    const arrM=toMin(tk.arrTime);
    // 자정 넘는 열차 판별: dep > arr (예: 23:00 출발 → 01:00 도착)
    const isOvernight = depM!==null && arrM!==null && depM>arrM;
    // 실제 도착 날짜 계산
    const arrDate = isOvernight ? (()=>{
      const d=new Date(tk.travelDate+'T00:00:00');
      d.setDate(d.getDate()+1);
      return todayLocalStr(d);
    })() : tk.travelDate;

    // travelDate가 오늘보다 이전이고, 도착날짜도 오늘보다 이전이면 탑승완료
    if(arrDate<todayLocalStr(now)) return true;
    // 도착날짜가 오늘보다 미래면 아직 예정
    if(arrDate>todayLocalStr(now)) return false;
    // 도착날짜 == 오늘: 도착 시각이 지났으면 탑승완료
    return arrM!==null && arrM<nowMin;
  };

  const upcoming=tickets.filter(tk=>tk.status==='active'&&!isPast(tk));
  const past=tickets.filter(tk=>tk.status==='active'&&isPast(tk));
  const cancelled=tickets.filter(tk=>tk.status==='cancelled');

  const tabs=`<div class="ticket-filter-tabs">
    <button class="ticket-filter-tab${_ticketFilterTab==='upcoming'?' active':''}" onclick="setTicketFilter('upcoming')">예정 ${upcoming.length}</button>
    <button class="ticket-filter-tab${_ticketFilterTab==='past'?' active':''}" onclick="setTicketFilter('past')">탑승완료 ${past.length}</button>
    <button class="ticket-filter-tab${_ticketFilterTab==='cancelled'?' active':''}" onclick="setTicketFilter('cancelled')">취소 ${cancelled.length}</button>
  </div>`;

  const headerHTML=`
    <div class="result-header">
      <div class="result-title">🎫 내 승차권</div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="badge blue">${tickets.filter(t=>t.status==='active').length}건</span>
        <div style="position:relative">
          <button class="map-layer-btn" onclick="toggleTicketExportMenu()">내보내기 ▾</button>
          <div id="ticket-export-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:4px;z-index:50;min-width:140px;box-shadow:0 4px 12px rgba(0,0,0,.3)">
            <button class="btn" style="width:100%;text-align:left;padding:8px 12px;font-size:13px;border-radius:6px" onclick="exportTicketsCSV()">📄 CSV 다운로드</button>
            <button class="btn" style="width:100%;text-align:left;padding:8px 12px;font-size:13px;border-radius:6px" onclick="exportTicketsPDF()">🖨️ PDF 인쇄</button>
          </div>
        </div>
      </div>
    </div>`;
  const toggleHTML=`
    <div class="ticket-view-toggle">
      <button class="ticket-view-btn${_ticketView==='list'?' active':''}" onclick="setTicketView('list')">📋 목록</button>
      <button class="ticket-view-btn${_ticketView==='calendar'?' active':''}" onclick="setTicketView('calendar')">📅 캘린더</button>
    </div>`;

  if(_ticketView==='calendar'){
    el.innerHTML=`${tripWidget}${headerHTML}${toggleHTML}${renderTicketCalendarHTML(tickets)}`;
    updateTripLED();
    return;
  }

  const list=_ticketFilterTab==='upcoming'?upcoming:_ticketFilterTab==='past'?past:cancelled;
  const sorted=[...list].sort((a,b)=>{
    if(_ticketFilterTab==='upcoming') return (a.travelDate+a.depTime).localeCompare(b.travelDate+b.depTime);
    return b.bookedAt-a.bookedAt;
  });

  if(!sorted.length){
    el.innerHTML=`${tripWidget}${headerHTML}${toggleHTML}${tabs}<div class="empty"><div class="empty-icon">📭</div><p>해당하는 승차권이 없습니다.</p></div>`;
    return;
  }

  // 환승 승차권(xferGroup)은 하나의 여정 카드로 묶어 표시
  const _xfRendered=new Set();
  const cards=sorted.map(tk=>{
    if(tk.xferGroup){
      if(_xfRendered.has(tk.xferGroup))return '';
      _xfRendered.add(tk.xferGroup);
      const legs=sorted.filter(x=>x.xferGroup===tk.xferGroup);
      return legs.length>1?_xferTicketCardHTML(legs):_ticketCardHTML(tk);
    }
    return _ticketCardHTML(tk);
  }).join('');

  el.innerHTML=`${tripWidget}${headerHTML}${toggleHTML}${tabs}<div class="ticket-list">${cards}</div>`;
  updateTripLED();
}

// 승차권 카드 HTML (목록·캘린더 공용)
function _ticketCardHTML(tk){
    const c=gc(tk.grade);
    const cancelledCls=tk.status==='cancelled'?' ticket-cancelled':'';
    const seatList=seatSummary(tk.seats);
    const _tkt=ALL_TRAINS.find(x=>x.no===tk.trainNo);
    const tkDistKm=tk.distanceKm||(_tkt?Math.round(routeDistanceKm(_tkt,tk.fromStn,tk.toStn)):0);
    return `<div class="ticket-card${cancelledCls}" onclick="openQRPopup('${tk.id}')">
      <div class="ticket-card-top" style="border-color:var(--c-${gcCssVar(tk.grade)})">
        <span class="ticket-grade" style="color:var(--c-${gcCssVar(tk.grade)})">${tk.grade}</span>
        <span class="ticket-no">${tk.trainNo}</span>
        ${tk.xferGroup?`<span class="ticket-xfer-badge" title="${tk.xferOrigin}→${tk.xferVia}→${tk.xferDest} 환승">🔄 환승 ${tk.xferSeq}/${tk.xferTotal}</span>`:''}
        ${tk.status==='cancelled'?'<span class="ticket-status-badge">취소됨</span>'
          :(()=>{const bs=ticketBoardState(tk);
            if(bs==='active')return '<span class="rt-board-badge rt-board-active" style="margin-left:auto">● 탑승 중</span>';
            if(bs==='done')return '<span class="rt-board-badge rt-board-done" style="margin-left:auto">탑승 완료</span>';
            return '';})()}
      </div>
      <div class="ticket-card-route">
        <div class="ticket-station"><span class="ticket-station-name">${tk.fromStn}</span><span class="ticket-time">${tk.depTime||'-'}</span></div>
        <div class="ticket-arrow">→</div>
        <div class="ticket-station"><span class="ticket-station-name">${tk.toStn}</span><span class="ticket-time">${tk.arrTime||'-'}</span></div>
      </div>
      <div class="ticket-card-divider"></div>
      <div class="ticket-card-info">
        <div class="ticket-info-row"><span>탑승일</span><span>${tk.travelDate}</span></div>
        <div class="ticket-info-row"><span>등급</span><span>${tk.seatClassLabel}</span></div>
        <div class="ticket-info-row"><span>좌석</span><span>${seatList}</span></div>
        <div class="ticket-info-row"><span>소요</span><span>${fmtDurKor(durMin(tk.depTime,tk.arrTime))}</span></div>
        <div class="ticket-info-row"><span>인원</span><span>${tk.passengerCount}명</span></div>
        <div class="ticket-info-row"><span>운임</span><span class="ticket-fare">${tk.totalFare.toLocaleString()}원</span></div>
      </div>
      <div class="ticket-card-id" style="display:flex;align-items:center;justify-content:space-between">
        <span>예매번호 ${tk.id}</span>
        <button class="btn qr-btn" onclick="event.stopPropagation();openQRPopup('${tk.id}')" title="QR·좌석 보기">🔲 QR</button>
      </div>
      <div class="ticket-card-actions">
        <button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();jumpToTrain('${tk.trainNo}')">🕐 시간표</button>
        ${tk.status==='active'&&_ticketFilterTab==='upcoming'?`<button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();cancelTicket('${tk.id}')">예매 취소</button>`
          :`<button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();deleteTicket('${tk.id}')">기록 삭제</button>`}
      </div>
    </div>`;
}

// 🔄 환승 승차권 카드 — xferGroup으로 묶인 선행·후행을 코레일톡식으로 표시
//    (출발›환승›도착 3역 타임라인 + 하단 선행/후행 요약)
function _xferTicketCardHTML(legs){
  legs=[...legs].sort((a,b)=>(a.xferSeq||0)-(b.xferSeq||0));
  const lead=legs[0], follow=legs[legs.length-1], g=lead;
  const allCancelled=legs.every(t=>t.status==='cancelled');
  const totalFare=legs.reduce((a,t)=>a+(t.totalFare||0),0);
  const cancelledCls=allCancelled?' ticket-cancelled':'';
  const origin=lead.fromStn, via=lead.toStn, dest=follow.toStn;
  const oDep=lead.depTime||'-', vArr=lead.arrTime||'-', vDep=follow.depTime||'-', dArr=follow.arrTime||'-';
  const route=`<div class="xfer-tk-route-line">
    <div class="xfer-tk-stn">
      <span class="xfer-tk-stn-name">${origin}</span>
      <span class="xfer-tk-stn-t">${oDep}</span>
    </div>
    <span class="xfer-tk-gt">›</span>
    <div class="xfer-tk-stn xfer-tk-stn-via">
      <span class="xfer-tk-stn-name">${via}</span>
      <span class="xfer-tk-stn-t">${vArr}</span>
      <span class="xfer-tk-stn-t2">${vDep}</span>
    </div>
    <span class="xfer-tk-gt">›</span>
    <div class="xfer-tk-stn">
      <span class="xfer-tk-stn-name">${dest}</span>
      <span class="xfer-tk-stn-t">${dArr}</span>
    </div>
  </div>`;
  const legLines=legs.map(tk=>{
    const seatList=seatSummary(tk.seats);
    return `<div class="xfer-tk-legline" onclick="event.stopPropagation();openQRPopup('${tk.id}')">
      <span class="xfer-role-tag ${tk.xferSeq===1?'lead':'follow'}">${tk.xferSeq===1?'선행':'후행'}</span>
      <span class="xfer-tk-legtrain" style="color:var(--c-${gcCssVar(tk.grade)})">${tk.grade} ${tk.trainNo}</span>
      <span class="xfer-tk-legseat">${tk.seatClassLabel} ${seatList}</span>
    </div>`;
  }).join('');
  const statusBadge=allCancelled?'<span class="ticket-status-badge" style="margin-left:auto">취소됨</span>'
    :(()=>{const st=legs.map(l=>ticketBoardState(l));
      if(st.includes('active'))return '<span class="rt-board-badge rt-board-active" style="margin-left:auto">● 탑승 중</span>';
      if(st.every(s=>s==='done'))return '<span class="rt-board-badge rt-board-done" style="margin-left:auto">탑승 완료</span>';
      return '';})();
  return `<div class="ticket-card xfer-ticket-card${cancelledCls}">
    <div class="ticket-card-top" style="border-color:#d29922">
      <span class="ticket-grade" style="color:#d29922">🔄 환승 승차권</span>
      ${statusBadge}
    </div>
    ${route}
    <div class="xfer-tk-legs">${legLines}</div>
    <div class="ticket-card-divider"></div>
    <div class="ticket-card-info">
      <div class="ticket-info-row"><span>탑승일</span><span>${g.travelDate}</span></div>
      <div class="ticket-info-row"><span>인원</span><span>${g.passengerCount}명</span></div>
      <div class="ticket-info-row"><span>총 운임</span><span class="ticket-fare">${totalFare.toLocaleString()}원</span></div>
    </div>
    <div class="ticket-card-actions">
      <button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();jumpToTrain('${g.trainNo}')">🕐 시간표</button>
      ${!allCancelled&&_ticketFilterTab==='upcoming'?`<button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();cancelXferGroup('${g.xferGroup}')">환승 전체 취소</button>`
        :`<button class="btn" style="font-size:12px;padding:6px 12px" onclick="event.stopPropagation();deleteXferGroup('${g.xferGroup}')">기록 삭제</button>`}
    </div>
  </div>`;
}
function cancelXferGroup(grp){
  const tickets=loadTickets();
  const legs=tickets.filter(t=>t.xferGroup===grp&&t.status==='active');
  if(!legs.length)return;
  // 선행 열차가 이미 출발했으면 전체 취소 불가
  const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
  const lead=legs.slice().sort((a,b)=>(a.xferSeq||0)-(b.xferSeq||0))[0];
  const dM=toMin(lead.depTime);
  if(lead.travelDate===todayLocalStr(now)&&dM!==null&&dM<=nowM){
    alert(`이미 출발한 환승 여정은 취소할 수 없습니다.\n\n${lead.fromStn} ${lead.depTime} 출발`);return;
  }
  if(!confirm(`환승 여정(${lead.xferOrigin}→${lead.xferVia}→${lead.xferDest})을 전체 취소하시겠습니까?\n선행·후행 승차권이 모두 취소됩니다.`))return;
  legs.forEach(tk=>{ tk.status='cancelled'; });
  saveTickets(tickets);
  try{ const alarms=loadAlarms(); const stns=new Set(); legs.forEach(l=>{stns.add(l.fromStn);stns.add(l.toStn);});
    const nos=new Set(legs.map(l=>l.trainNo));
    saveAlarms(alarms.filter(a=>!(nos.has(a.trainNo)&&stns.has(a.stn)))); }catch(e){}
  renderTickets(); if(typeof renderAlarmIfOpen==='function')renderAlarmIfOpen();
}
function deleteXferGroup(grp){
  if(!confirm('이 환승 여정 기록을 삭제하시겠습니까?'))return;
  const tickets=loadTickets().filter(t=>t.xferGroup!==grp);
  saveTickets(tickets);
  renderTickets();
}

// 승차권 캘린더 뷰 (과거·미래 모두 표시)
function renderTicketCalendarHTML(tickets){
  if(!_ticketCalYM){const n=new Date();_ticketCalYM={y:n.getFullYear(),m:n.getMonth()};}
  const {y,m}=_ticketCalYM;
  const byDate={};
  tickets.forEach(tk=>{ if(!tk.travelDate)return; (byDate[tk.travelDate]=byDate[tk.travelDate]||[]).push(tk); });
  const monthCount=tickets.filter(tk=>tk.travelDate&&+tk.travelDate.slice(0,4)===y&&+tk.travelDate.slice(5,7)===m+1).length;
  const first=new Date(y,m,1);
  const startOffset=(first.getDay()+6)%7;           // 월=0
  const daysInMonth=new Date(y,m+1,0).getDate();
  const prevDays=new Date(y,m,0).getDate();
  const todayStr=todayLocalStr();
  const dowNames=['월','화','수','목','금','토','일'];
  const dotFor=tk=> tk.status==='cancelled'
    ? '<span class="tc-dot" style="background:var(--text3)"></span>'
    : `<span class="tc-dot" style="background:var(--c-${gcCssVar(tk.grade)})"></span>`;
  let gridHTML='';
  for(let i=0;i<42;i++){
    const dayNum=i-startOffset+1;
    const dow=i%7;
    let cy=y,cm=m,cd=dayNum,inMonth=true;
    if(dayNum<1){cm=m-1;cd=prevDays+dayNum;inMonth=false;if(cm<0){cm=11;cy=y-1;}}
    else if(dayNum>daysInMonth){cm=m+1;cd=dayNum-daysInMonth;inMonth=false;if(cm>11){cm=0;cy=y+1;}}
    if(!inMonth){gridHTML+=`<div class="tc-cell tc-out"><span class="tc-num">${cd}</span></div>`;continue;}
    const ds=`${cy}-${String(cm+1).padStart(2,'0')}-${String(cd).padStart(2,'0')}`;
    const items=byDate[ds]||[];
    const dots=items.slice(0,4).map(dotFor).join('');
    const dowCls=dow===5?' tc-sat':dow===6?' tc-sun':'';
    const clickable=items.length>0;
    gridHTML+=`<div class="tc-cell${dowCls}${ds===todayStr?' tc-today':''}${ds===_ticketCalSel?' tc-sel':''}${clickable?' tc-has':''}" ${clickable?`onclick="selectTicketCalDate('${ds}')"`:''}>
      <span class="tc-num">${cd}</span>
      <span class="tc-dots">${dots}</span>
    </div>`;
  }
  let detail;
  if(_ticketCalSel&&byDate[_ticketCalSel]){
    const items=[...byDate[_ticketCalSel]].sort((a,b)=>(a.depTime||'').localeCompare(b.depTime||''));
    detail=`<div class="tc-detail"><div class="tc-detail-head">🎫 ${_ticketCalSel} · ${items.length}건</div><div class="ticket-list">${items.map(_ticketCardHTML).join('')}</div></div>`;
  } else {
    detail=`<div class="tc-hint">날짜의 점을 눌러 그날의 승차권을 확인하세요${monthCount?'':' · 이 달엔 승차권이 없습니다'}</div>`;
  }
  return `<div class="tc-wrap">
    <div class="tc-header">
      <button class="tc-nav" onclick="ticketCalShift(-1)" aria-label="이전 달">◀</button>
      <div class="tc-title">${y}년 ${m+1}월 <span class="tc-count">(${monthCount}건)</span></div>
      <button class="tc-nav" onclick="ticketCalShift(1)" aria-label="다음 달">▶</button>
    </div>
    <div class="tc-dow">${dowNames.map((d,i)=>`<span class="${i===5?'tc-sat':i===6?'tc-sun':''}">${d}</span>`).join('')}</div>
    <div class="tc-grid">${gridHTML}</div>
    ${detail}
  </div>`;
}

function toggleTicketExportMenu(){
  const menu=document.getElementById('ticket-export-menu');
  if(!menu)return;
  menu.style.display=menu.style.display==='none'?'block':'none';
}

function exportTicketsCSV(){
  const tickets=loadTickets();
  if(!tickets.length){alert('내보낼 예매 내역이 없습니다.');return;}
  const BOM='﻿';
  const header=['예매번호','열차등급','열차번호','출발역','도착역','출발시각','도착시각','이용일','좌석등급','좌석','인원','운임(원)','상태','예매일시'];
  const rows=tickets.map(tk=>[
    tk.id, tk.grade, tk.trainNo, tk.fromStn, tk.toStn,
    tk.depTime, tk.arrTime, tk.travelDate, tk.seatClassLabel,
    tk.seats.join('/'), tk.passengerCount, tk.totalFare,
    tk.status==='active'?'유효':tk.status==='cancelled'?'취소':'완료',
    new Date(tk.bookedAt).toLocaleString('ko-KR')
  ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
  const blob=new Blob([BOM+header.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`nimbyrailtable_예매내역_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`;
  a.click(); URL.revokeObjectURL(url);
  const menu=document.getElementById('ticket-export-menu');
  if(menu)menu.style.display='none';
}

function exportTicketsPDF(){
  const menu=document.getElementById('ticket-export-menu');
  if(menu)menu.style.display='none';
  window.print();
}

// ══════════════════════════════════════════
// 👤 마이페이지 슬라이드 패널
// ══════════════════════════════════════════
function openMyPage(){
  document.getElementById('my-backdrop').classList.add('open');
  document.getElementById('my-panel').classList.add('open');
  document.body.style.overflow='hidden';
  _syncModeButtons();
  try{updateAccountCard();}catch(e){}
}
function closeMyPage(){
  document.getElementById('my-backdrop').classList.remove('open');
  document.getElementById('my-panel').classList.remove('open');
  document.getElementById('my-sub-panel').classList.remove('open');
  document.body.style.overflow='';
}
function closeMySubPanel(){
  document.getElementById('my-sub-panel').classList.remove('open');
  if(window._mySubClockTimer){clearInterval(window._mySubClockTimer);window._mySubClockTimer=null;}
}

// ══════════════════════════════════════════
// 👤 계정(로컬 프로필) 기능 — 서버 없이 여러 계정을 기기 내 프로필로 관리,
//    로그인=프로필 전환, 기기 간 연동은 동기화 코드(내보내기/가져오기)로.
// ══════════════════════════════════════════
const ACCT_REG_KEY='nimbi_accounts';
const ACCT_ACTIVE_KEY='nimbi_account_active';
const ACCT_DATA_PREFIX='nimbi_acct_data_';
// 계정에 연동되는 개인기록 키 (기기 UI 설정 nimbi_mode/led/zoom 등은 제외)
const ACCT_KEYS=['nimbi_alarms','nimbi_alarm_groups','nimbi_seat_watches','nimbi_favs','nimbi_fav_groups','nimbi_notice_read','nimbi_tickets','nimbi_passes','nimbi_seatprefs','nimbi_bookroutes','nimbi_puzzle'];
const ACCT_PREFIXES=['nimbi_history_'];
const ACCT_EMOJIS=['🚆','🚄','🚅','🚇','🚉','🎫','⭐','🧭','🗺️','🌄','🐧','🦊','🐻','🐰','🐱','🌟'];
function _acctEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 표시용 인사말: 닉네임 뒤에 '님' (이미 '님'으로 끝나면 그대로)
function _acctGreet(name){const n=String(name==null?'':name);return _acctEsc(n)+(/님\s*$/.test(n)?'':'님');}
function _acctIsKey(k){return ACCT_KEYS.includes(k)||ACCT_PREFIXES.some(p=>k.startsWith(p));}
function acctReg(){try{return JSON.parse(localStorage.getItem(ACCT_REG_KEY))||[];}catch(e){return[];}}
function acctSaveReg(list){try{localStorage.setItem(ACCT_REG_KEY,JSON.stringify(list));}catch(e){}}
function acctActiveId(){return localStorage.getItem(ACCT_ACTIVE_KEY)||'';}
function acctActive(){const id=acctActiveId();return acctReg().find(a=>a.id===id)||null;}
function _acctUid(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function acctSnapshotLive(){const snap={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(_acctIsKey(k))snap[k]=localStorage.getItem(k);}return snap;}
function acctApply(snap){const del=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(_acctIsKey(k))del.push(k);}del.forEach(k=>localStorage.removeItem(k));Object.keys(snap||{}).forEach(k=>{try{localStorage.setItem(k,snap[k]);}catch(e){}});}
function _acctSlot(id){return ACCT_DATA_PREFIX+id;}
function acctSaveSlot(id,snap){try{localStorage.setItem(_acctSlot(id),JSON.stringify(snap));}catch(e){}}
function acctLoadSlot(id){try{return JSON.parse(localStorage.getItem(_acctSlot(id)))||{};}catch(e){return{};}}
// 최초 실행: 계정 없으면 기존 로컬 데이터로 기본 계정 생성(데이터 보존)
function acctInit(){
  let reg=acctReg();
  if(!reg.length){
    const id=_acctUid();
    reg=[{id,name:'여행객',emoji:'🚆',created:Date.now()}];
    acctSaveReg(reg); localStorage.setItem(ACCT_ACTIVE_KEY,id);
    acctSaveSlot(id,acctSnapshotLive());
  } else {
    // 초기 자동생성 기본명 '나의 계정' → 인사말에 어울리는 '여행객'으로 이관
    let changed=false;
    reg.forEach(a=>{if(a.name==='나의 계정'){a.name='여행객';changed=true;}});
    if(changed)acctSaveReg(reg);
    if(!reg.find(a=>a.id===acctActiveId()))localStorage.setItem(ACCT_ACTIVE_KEY,reg[0].id);
  }
}
function acctSwitch(id){
  const cur=acctActiveId(); if(id===cur){closeMySubPanel();return;}
  if(cur)acctSaveSlot(cur,acctSnapshotLive());
  acctApply(acctLoadSlot(id)); localStorage.setItem(ACCT_ACTIVE_KEY,id); location.reload();
}
function acctCreate(name,emoji){
  const cur=acctActiveId(); if(cur)acctSaveSlot(cur,acctSnapshotLive());
  const id=_acctUid(); const reg=acctReg();
  reg.push({id,name:(name||'새 계정').slice(0,20),emoji:emoji||'🚆',created:Date.now()}); acctSaveReg(reg);
  acctSaveSlot(id,{}); acctApply({}); localStorage.setItem(ACCT_ACTIVE_KEY,id); location.reload();
}
function acctRename(id,name,emoji){
  const reg=acctReg(); const a=reg.find(x=>x.id===id); if(!a)return;
  if(name!=null)a.name=name.slice(0,20); if(emoji)a.emoji=emoji; acctSaveReg(reg);
  updateAccountCard(); if(document.getElementById('acct-sec'))renderAccountSection();
}
function acctDelete(id){
  let reg=acctReg();
  if(reg.length<=1){alert('마지막 계정은 삭제할 수 없습니다.');return;}
  const a=reg.find(x=>x.id===id); if(!a)return;
  if(!confirm(`'${a.name}' 계정과 그 안의 모든 기록(승차권·즐겨찾기·알람 등)을 이 기기에서 삭제할까요?`))return;
  reg=reg.filter(x=>x.id!==id); acctSaveReg(reg);
  try{localStorage.removeItem(_acctSlot(id));}catch(e){}
  if(acctActiveId()===id){const nid=reg[0].id;acctApply(acctLoadSlot(nid));localStorage.setItem(ACCT_ACTIVE_KEY,nid);location.reload();return;}
  renderAccountSection();
}
// ── 동기화 릴레이 (짧은 코드) ──
const ACCT_RELAY_DEFAULT=''; // 배포한 Cloudflare Worker URL을 넣으면 전 기기 무설정 사용
function acctRelayUrl(){ let u=''; try{u=localStorage.getItem('nimbi_relay_url')||'';}catch(e){} return (u||ACCT_RELAY_DEFAULT||'').replace(/\/+$/,''); }
function acctSetRelayUrl(u){ try{localStorage.setItem('nimbi_relay_url',(u||'').trim());}catch(e){} }
function _acctPayload(){ const a=acctActive(); if(!a)return null; return {v:1,id:a.id,name:a.name,emoji:a.emoji,data:acctSnapshotLive()}; }
function acctExportCodeLocal(){ const p=_acctPayload(); if(!p)return ''; try{return btoa(unescape(encodeURIComponent(JSON.stringify(p))));}catch(e){return '';} }
async function acctUploadCode(){ // 릴레이에 올리고 짧은 코드 반환
  const url=acctRelayUrl(); if(!url) throw new Error('no-relay');
  const p=_acctPayload(); if(!p) throw new Error('계정이 없습니다.');
  const res=await fetch(url+'/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  let j=null; try{j=await res.json();}catch(e){}
  if(!res.ok||!j||!j.code) throw new Error((j&&j.error)||('업로드 실패('+res.status+')'));
  return j.code;
}
async function acctDownloadPayload(code){
  const url=acctRelayUrl(); if(!url) throw new Error('no-relay');
  const res=await fetch(url+'/'+encodeURIComponent(code));
  if(res.status===404) throw new Error('코드를 찾을 수 없어요(만료되었거나 오타).');
  if(!res.ok) throw new Error('다운로드 실패('+res.status+')');
  return await res.json();
}
// 페이로드를 계정에 반영(업서트 후 새로고침)
function _acctApplyPayload(payload){
  if(!payload||!payload.id||typeof payload.data!=='object') return {ok:false,msg:'유효한 동기화 데이터가 아닙니다.'};
  const cur=acctActiveId(); if(cur)acctSaveSlot(cur,acctSnapshotLive());
  let reg=acctReg(); let a=reg.find(x=>x.id===payload.id);
  if(a){a.name=payload.name||a.name;a.emoji=payload.emoji||a.emoji;}
  else reg.push({id:payload.id,name:(payload.name||'가져온 계정').slice(0,20),emoji:payload.emoji||'🚆',created:Date.now()});
  acctSaveReg(reg); acctSaveSlot(payload.id,payload.data);
  acctApply(payload.data); localStorage.setItem(ACCT_ACTIVE_KEY,payload.id); location.reload();
  return {ok:true};
}
// 가져오기 — 짧은 코드(릴레이) 또는 레거시 base64 자동 판별
async function acctImportCode(code){
  code=(code||'').trim();
  let payload=null;
  if(/^[A-Za-z0-9]{4,12}$/.test(code)){
    if(!acctRelayUrl()) return {ok:false,msg:'짧은 코드를 쓰려면 먼저 아래 동기화 서버 설정을 완료하세요.'};
    try{ payload=await acctDownloadPayload(code); }catch(e){ return {ok:false,msg:e.message}; }
  } else {
    try{ payload=JSON.parse(decodeURIComponent(escape(atob(code)))); }catch(e){ return {ok:false,msg:'코드 형식이 올바르지 않습니다.'}; }
  }
  return _acctApplyPayload(payload);
}
// 계정별 기록 요약(개수)
function _acctSummary(){
  const cnt=k=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v.length:0;}catch(e){return 0;}};
  return {tickets:cnt('nimbi_tickets'),favs:cnt('nimbi_favs'),passes:cnt('nimbi_passes'),alarms:cnt('nimbi_alarms')};
}
// ── 계정 UI ──
function updateAccountCard(){
  const el=document.getElementById('acct-card'); if(!el)return;
  const a=acctActive(); const n=acctReg().length;
  if(!a){el.innerHTML=`<div class="acct-card-inner"><span class="acct-avatar">👤</span><div class="acct-info"><div class="acct-name">로그인</div><div class="acct-sub">계정을 만들어 기록을 연동하세요</div></div><span class="my-menu-arrow">›</span></div>`;return;}
  const s=_acctSummary();
  el.innerHTML=`<div class="acct-card-inner"><span class="acct-avatar">${a.emoji}</span><div class="acct-info"><div class="acct-name">${_acctGreet(a.name)}</div><div class="acct-sub">🎫${s.tickets} ⭐${s.favs}${n>1?' · '+n+'개 계정':''} · 동기화 코드로 연동</div></div><span class="my-menu-arrow">›</span></div>`;
}
function renderAccountSection(){
  const el=document.getElementById('my-sub-content'); if(!el)return;
  const a=acctActive(); const reg=acctReg(); const s=_acctSummary();
  const others=reg.filter(x=>x.id!==(a&&a.id));
  el.innerHTML=`<div class="acct-sec" id="acct-sec">
    <div class="acct-big">
      <span class="acct-avatar">${a?a.emoji:'👤'}</span>
      <div class="acct-info"><div class="acct-name" style="font-size:18px">${a?_acctGreet(a.name):'계정 없음'}</div>
        <div class="acct-sub">이 기기의 활성 계정</div></div>
      <button class="btn-pass-toggle" onclick="acctUiEditToggle()">✏️ 편집</button>
    </div>
    <div id="acct-edit" style="display:none"></div>

    <h3>📊 내 기록</h3>
    ${_acctRecRows()}

    <h3>🔗 기기 간 연동</h3>
    <p class="hint" style="margin:0 0 10px;font-size:12px;color:var(--text2)">이 계정의 승차권·즐겨찾기·알람 등 모든 기록을 다른 기기로 옮기려면 <b>동기화 코드</b>를 내보내고, 다른 기기에서 가져오세요.</p>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button class="btn btn-primary" style="flex:1;justify-content:center" onclick="acctUiShowExport()">📤 동기화 코드 내보내기</button>
      <button class="btn" style="flex:1;justify-content:center;background:var(--bg3);color:var(--text)" onclick="acctUiImportToggle()">📥 코드로 가져오기</button>
    </div>
    <div id="acct-export" style="display:none;margin-bottom:8px"></div>
    <div id="acct-import" style="display:none;margin-bottom:8px"></div>
    <div style="text-align:right"><button class="manboard-cancel" style="color:var(--text2);margin-top:0" onclick="acctUiRelayToggle()">⚙️ 동기화 서버 설정</button></div>
    <div id="acct-relay" style="display:none;margin-bottom:8px"></div>

    <h3>👥 계정 전환</h3>
    ${others.length?others.map(x=>{const sd=acctLoadSlot(x.id);let tc=0,fc=0;try{tc=(JSON.parse(sd.nimbi_tickets||'[]')||[]).length;fc=(JSON.parse(sd.nimbi_favs||'[]')||[]).length;}catch(e){}
      return `<div class="acct-row"><span class="acct-avatar" style="width:38px;height:38px;font-size:20px">${x.emoji}</span>
        <div class="acct-info"><div class="acct-name" style="font-size:14px">${_acctGreet(x.name)}</div><div class="acct-sub">🎫${tc} ⭐${fc}</div></div>
        <button class="btn-pass-toggle" onclick="acctSwitch('${x.id}')">전환</button>
        <button class="btn-pass-toggle" style="color:var(--red)" onclick="acctDelete('${x.id}')">삭제</button></div>`;}).join(''):'<p class="hint" style="font-size:12px;color:var(--text3);margin-bottom:8px">다른 계정이 없습니다.</p>'}
    <button class="btn" style="width:100%;justify-content:center;background:var(--bg2);color:var(--text);border:1px dashed var(--border)" onclick="acctUiNewToggle()">＋ 새 계정 만들기</button>
    <div id="acct-new" style="display:none;margin-top:8px"></div>
  </div>`;
}
// 계정 기록 요약을 '아이콘 라벨 개수' 행으로 (탭하면 해당 섹션으로)
function _acctRecRows(){
  const recs=[
    {e:'🎫',l:'승차권',k:'nimbi_tickets',u:'매',s:'ticket'},
    {e:'🎟️',l:'정기권',k:'nimbi_passes',u:'매',s:'pass'},
    {e:'⭐',l:'즐겨찾기',k:'nimbi_favs',u:'개',s:'fav'},
    {e:'🔔',l:'승하차 알람',k:'nimbi_alarms',u:'개',s:'alarm'},
  ];
  const cnt=k=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v.length:0;}catch(e){return 0;}};
  return recs.map(r=>`<div class="acct-rec" onclick="openMySection('${r.s}')"><span class="acct-rec-ic">${r.e}</span><span class="acct-rec-label">${r.l}</span><span class="acct-rec-cnt">${cnt(r.k)}${r.u}</span><span class="my-menu-arrow">›</span></div>`).join('');
}
function _acctEmojiPicker(cur,cb){
  return `<div class="acct-emoji-pick">${ACCT_EMOJIS.map(e=>`<button class="${e===cur?'sel':''}" onclick="${cb}('${e}',this)">${e}</button>`).join('')}</div>`;
}
let _acctPickEmoji='🚆';
function acctPick(e,btn){ _acctPickEmoji=e; const box=btn.parentElement; box.querySelectorAll('button').forEach(b=>b.classList.remove('sel')); btn.classList.add('sel'); }
function acctUiEditToggle(){
  const box=document.getElementById('acct-edit'); if(!box)return;
  if(box.style.display!=='none'){box.style.display='none';return;}
  const a=acctActive(); if(!a)return; _acctPickEmoji=a.emoji;
  box.style.display='block';
  box.innerHTML=`<div style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
    <input class="acct-input" id="acct-edit-name" maxlength="20" value="${_acctEsc(a.name)}" placeholder="닉네임">
    ${_acctEmojiPicker(a.emoji,'acctPick')}
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="acctRename('${a.id}',document.getElementById('acct-edit-name').value.trim()||'계정',_acctPickEmoji);acctUiEditToggle()">저장</button></div>`;
}
function acctUiNewToggle(){
  const box=document.getElementById('acct-new'); if(!box)return;
  if(box.style.display!=='none'){box.style.display='none';return;}
  _acctPickEmoji='🚆'; box.style.display='block';
  box.innerHTML=`<div style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px">
    <input class="acct-input" id="acct-new-name" maxlength="20" placeholder="새 계정 닉네임">
    ${_acctEmojiPicker('🚆','acctPick')}
    <p class="hint" style="font-size:11px;color:var(--text3);margin:4px 0 8px">새 계정은 빈 상태로 시작합니다. 현재 계정의 기록은 그대로 보존됩니다.</p>
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="acctCreate(document.getElementById('acct-new-name').value.trim()||'새 계정',_acctPickEmoji)">만들고 전환</button></div>`;
}
async function acctUiShowExport(){
  const box=document.getElementById('acct-export'); if(!box)return;
  const imp=document.getElementById('acct-import'); if(imp)imp.style.display='none';
  box.style.display='block';
  if(acctRelayUrl()){
    box.innerHTML=`<div class="acct-shortcode acct-shortcode-load">코드 생성 중…</div>`;
    try{
      const code=await acctUploadCode();
      box.innerHTML=`<div class="acct-shortcode">${_acctEsc(code)}</div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="acctUiCopyCode(this,'${_acctEsc(code)}')">📋 코드 복사</button>
        <p class="hint" style="font-size:11px;color:var(--text3);margin-top:6px">다른 기기의 '코드로 가져오기'에 이 <b>${code.length}자 코드</b>를 입력하면 기록이 그대로 옮겨집니다. (180일 후 만료)</p>`;
    }catch(e){
      box.innerHTML=`<p class="hint" style="font-size:12px;color:var(--red)">동기화 서버 연결 실패: ${_acctEsc(e.message||e)}</p>
        <p class="hint" style="font-size:11px;color:var(--text3);margin-top:4px">아래 ⚙️ 동기화 서버 설정을 확인하세요.</p>`;
    }
  } else {
    const code=acctExportCodeLocal();
    box.innerHTML=`<textarea class="acct-code" readonly onclick="this.select()">${_acctEsc(code)}</textarea>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:6px" onclick="acctUiCopyCode(this,null)">📋 코드 복사</button>
      <p class="hint" style="font-size:11px;color:var(--text3);margin-top:6px">⚙️ 동기화 서버를 설정하면 <b>6자 짧은 코드</b>로 바뀝니다. (지금은 서버 없이 쓰는 로컬 코드)</p>`;
  }
}
function acctUiCopyCode(btn,short){
  const ta=document.getElementById('acct-export')&&document.getElementById('acct-export').querySelector('textarea');
  const text=short||(ta?ta.value:'');
  const done=()=>{const o=btn.textContent;btn.textContent='✅ 복사됨';setTimeout(()=>{btn.textContent=o;},1500);};
  try{navigator.clipboard.writeText(text).then(done,()=>{if(ta){ta.select();document.execCommand('copy');}done();});}
  catch(e){if(ta){ta.select();try{document.execCommand('copy');}catch(_){}}done();}
}
function acctUiImportToggle(){
  const box=document.getElementById('acct-import'); if(!box)return;
  const exp=document.getElementById('acct-export'); if(exp)exp.style.display='none';
  if(box.style.display!=='none'){box.style.display='none';return;}
  box.style.display='block';
  box.innerHTML=`<input class="acct-input" id="acct-import-code" placeholder="6자 코드 (또는 로컬 코드 붙여넣기)" style="font-family:var(--mono);text-align:center;letter-spacing:2px;text-transform:uppercase">
    <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="acctUiDoImport(this)">📥 가져오기 (로그인)</button>
    <p class="hint" style="font-size:11px;color:var(--text3);margin-top:6px">같은 계정 코드면 기존 계정이 갱신되고, 새 계정 코드면 계정이 추가됩니다.</p>`;
}
async function acctUiDoImport(btn){
  const el=document.getElementById('acct-import-code'); const v=(el&&el.value)||'';
  if(!v.trim()){alert('코드를 입력해 주세요.');return;}
  if(btn){btn.disabled=true;btn.textContent='가져오는 중…';}
  const r=await acctImportCode(v);
  if(!r||!r.ok){ if(btn){btn.disabled=false;btn.textContent='📥 가져오기 (로그인)';} alert((r&&r.msg)||'가져오기에 실패했습니다.'); }
}
// ⚙️ 동기화 서버(릴레이) 설정
function acctUiRelayToggle(){
  const box=document.getElementById('acct-relay'); if(!box)return;
  if(box.style.display!=='none'){box.style.display='none';return;}
  box.style.display='block';
  let stored=''; try{stored=localStorage.getItem('nimbi_relay_url')||'';}catch(e){}
  box.innerHTML=`<div style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px">
    <p class="hint" style="font-size:11px;color:var(--text2);margin-bottom:8px">짧은 코드(6자)를 쓰려면 무료 Cloudflare Worker 주소가 필요합니다. 저장소의 <b>sync-worker/README.md</b> 5분 가이드를 따라 배포하세요.</p>
    <input class="acct-input" id="acct-relay-url" placeholder="https://nimbi-sync.xxx.workers.dev" value="${_acctEsc(stored)}">
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn btn-primary" style="flex:1;justify-content:center" onclick="acctUiSaveRelay()">저장</button>
      <button class="btn" style="flex:1;justify-content:center;background:var(--bg3);color:var(--text)" onclick="acctUiTestRelay()">연결 테스트</button>
    </div>
    <div id="acct-relay-msg" style="font-size:11px;margin-top:6px"></div></div>`;
}
function acctUiSaveRelay(){
  const v=(document.getElementById('acct-relay-url')||{}).value||''; acctSetRelayUrl(v);
  const m=document.getElementById('acct-relay-msg'); if(m){m.style.color='var(--green)';m.textContent=v.trim()?'✅ 저장됨. 이제 짧은 코드로 내보내기/가져오기가 됩니다.':'주소를 비웠습니다(서버 없이 로컬 코드 사용).';}
}
async function acctUiTestRelay(){
  const v=(document.getElementById('acct-relay-url')||{}).value||''; const m=document.getElementById('acct-relay-msg'); if(!m)return;
  if(!v.trim()){m.style.color='var(--red)';m.textContent='주소를 입력하세요.';return;}
  m.style.color='var(--text2)';m.textContent='테스트 중…';
  try{ const res=await fetch(v.replace(/\/+$/,'')+'/'); const j=await res.json(); if(j&&(j.ok||j.service)){m.style.color='var(--green)';m.textContent='✅ 연결 성공';}else{m.style.color='var(--red)';m.textContent='응답이 이상합니다. 주소를 확인하세요.';} }
  catch(e){ m.style.color='var(--red)';m.textContent='연결 실패: '+(e.message||e); }
}

const MY_TITLES = {
  account:'👤 내 계정',
  book:'🎫 열차 예매',
  ticket:'🎟️ 승차권 조회',
  pass:'🎟️ 정기권 예매',
  alarm:'🔔 승하차 알람',
  fav:'⭐ 즐겨찾기',
  stats:'📊 운행 통계',
  notice:'📢 공지사항',
  daytrip:'🌄 당일치기 추천',
  terminal:'🖥️ 터미널 뷰',
  puzzle:'🧩 루트 퍼즐',
};

function openMySection(section){
  const titleEl = document.getElementById('my-sub-title');
  const contentEl = document.getElementById('my-sub-content');
  if(titleEl) titleEl.textContent = MY_TITLES[section]||'';
  document.getElementById('my-sub-panel').classList.add('open');
  // 서브패널 헤더 시계
  if(window._mySubClockTimer) clearInterval(window._mySubClockTimer);
  const clockEl=document.getElementById('my-sub-clock');
  if(clockEl){
    const tick=()=>{const n=new Date();if(clockEl)clockEl.textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
    tick(); window._mySubClockTimer=setInterval(tick,1000);
  }
  if(!contentEl) return;
  contentEl.innerHTML = '';
  // 서브패널 전체화면으로 콘텐츠 렌더링 (탭 이동 없음)
  if(section==='account'){
    renderAccountSection();
  } else if(section==='book'){
    contentEl.innerHTML = '<div style="padding:0"><div id="my-result-book"></div></div>';
    renderMyBookTab();
  } else if(section==='ticket'){
    contentEl.innerHTML = '<div id="result-ticket"></div>';
    renderTickets();
  } else if(section==='alarm'){
    contentEl.innerHTML = '<div id="result-alarm"></div>';
    renderAlarms();
  } else if(section==='fav'){
    contentEl.innerHTML = '<div id="result-fav"></div>';
    renderFavs();
  } else if(section==='stats'){
    contentEl.innerHTML = '<div id="result-stats"></div>';
    renderStats();
  } else if(section==='notice'){
    contentEl.innerHTML = '<div id="result-notice"></div>';
    updateNoticeBadge(); renderNotice();
  } else if(section==='pass'){
    contentEl.innerHTML = '<div id="result-pass-my">' + renderPassSection() + '</div>';
  } else if(section==='daytrip'){
    contentEl.innerHTML = '<div id="result-daytrip"></div>';
    renderDaytrip();
  } else if(section==='terminal'){
    contentEl.innerHTML = '<div id="result-terminal"></div>';
    renderTerminalView();
  } else if(section==='puzzle'){
    contentEl.innerHTML = '<div id="result-puzzle"></div>';
    renderRoutePuzzle();
  }
}

// ══════════════════════════════════════════
// 🎫 열차 예매 탭
// ══════════════════════════════════════════
let _bookRoundTrip = false;
let _bookPassengerCount = 1;

function renderMyBookTab(){
  const el = document.getElementById('my-result-book');
  if(!el) return;
  // my-result-book용 렌더링 (마이페이지 서브패널)
  _renderBookTabInto(el, "my-book-results");
}

function renderBookTab(){
  const el = document.getElementById('result-book');
  if(!el) return;
  _renderBookTabInto(el);
}

// 002: 즐겨찾는 구간 원터치 재예매
function loadBookRoutes(){ try{ return JSON.parse(localStorage.getItem('nimbi_bookroutes'))||[]; }catch(e){ return []; } }
function saveBookRouteCurrent(){
  const f=window._bookFrom, t=window._bookTo;
  if(!f||!t){ alert('출발역과 도착역을 먼저 선택해 주세요.'); return; }
  let list=loadBookRoutes();
  const already=list.some(r=>r.from===f&&r.to===t);
  if(already) list=list.filter(r=>!(r.from===f&&r.to===t));
  else { list.unshift({from:f,to:t}); list=list.slice(0,8); }
  try{ localStorage.setItem('nimbi_bookroutes',JSON.stringify(list)); }catch(e){}
  // 신규 등록 시 즐겨찾기(구간)에도 자동 등록
  if(!already){
    const favs=loadFavs();
    const favId='route:'+f+':'+t;
    if(!favs.some(x=>x.id===favId)){
      favs.push({id:favId,type:'route',label:f+' → '+t,data:{from:f,to:t},cat:'etc',addedAt:Date.now()});
      saveFavs(favs);
      if(document.getElementById('panel-fav')?.classList.contains('active')) renderFavs();
    }
  }
  // 즉시 반영: 현재 화면(메인·마이페이지)의 구간 저장 행만 그 자리에서 갱신
  document.querySelectorAll('.book-fav-row').forEach(el=>{ el.outerHTML=_bookRoutesRowHTML(); });
}
function applyBookRoute(f,t){
  window._bookFrom=f; window._bookTo=t;
  const fn=document.getElementById('book-from-name'), tn=document.getElementById('book-to-name');
  if(fn)fn.textContent=f; if(tn)tn.textContent=t;
  searchBookTrainsUI();
}
function _bookRoutesRowHTML(){
  const list=loadBookRoutes();
  const saved=window._bookFrom&&window._bookTo&&list.some(r=>r.from===window._bookFrom&&r.to===window._bookTo);
  const chips=list.map(r=>`<button class="book-fav-chip" onclick="applyBookRoute('${r.from.replace(/'/g,"\\'")}','${r.to.replace(/'/g,"\\'")}')">${r.from}→${r.to}</button>`).join('');
  return `<div class="book-fav-row">
    <button class="book-fav-save${saved?' on':''}" onclick="saveBookRouteCurrent()">${saved?'★ 저장됨':'☆ 구간 저장'}</button>
    ${chips||'<span class="book-fav-empty">자주 타는 구간을 저장하면 원터치로 재예매</span>'}
  </div>`;
}

function _renderBookTabInto(el, resultId){
  resultId = resultId || "book-results";
  const toLocalDateStr = d => {
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const minDate = toLocalDateStr(today);
  const maxD = new Date(today); maxD.setMonth(maxD.getMonth()+1);
  const maxDate = toLocalDateStr(maxD);
  el.innerHTML = `
    <div class="book-card">
      <!-- 편도/왕복 토글 -->
      <div class="book-trip-type">
        <button class="book-type-btn${!_bookRoundTrip?' active':''}" onclick="setBookTripType(false)">편도</button>
        <button class="book-type-btn${_bookRoundTrip?' active':''}" onclick="setBookTripType(true)">왕복</button>
      </div>

      <!-- 출발/도착역 -->
      <div class="book-route-row">
        <div class="book-stn-box" onclick="openBookStnPicker('from')">
          <div class="book-stn-label">출발</div>
          <div class="book-stn-name" id="book-from-name">출발역 선택</div>
        </div>
        <button class="book-swap-btn" onclick="swapBookStations()">⇄</button>
        <div class="book-stn-box" onclick="openBookStnPicker('to')">
          <div class="book-stn-label">도착</div>
          <div class="book-stn-name" id="book-to-name">도착역 선택</div>
        </div>
      </div>

      <!-- 날짜 -->
      <div class="book-date-row">
        <div class="book-date-box">
          <div class="book-date-label">가는날</div>
          <input type="date" id="book-date-go" class="book-date-input" value="${minDate}" min="${minDate}" max="${maxDate}">
        </div>
        <div class="book-date-box" id="book-date-back-row" style="${_bookRoundTrip?'':'display:none'}">
          <div class="book-date-label">오는날</div>
          <input type="date" id="book-date-back" class="book-date-input" value="${minDate}" min="${minDate}" max="${maxDate}">
        </div>
      </div>

      <!-- 인원 -->
      <div class="book-passenger-row" onclick="openBookPassengerPicker()">
        <span class="book-passenger-label">인원 선택</span>
        <span class="book-passenger-val" id="book-passenger-val">어른 ${_bookPassengerCount}명</span>
        <span class="book-passenger-arrow">›</span>
      </div>

      <!-- 직통/환승 선택 + 조회 버튼 -->
      <div style="display:flex;gap:8px;margin-bottom:0">
        <select id="book-transfer-sel" onchange="_toggleAdjInfoBtn(this)" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text1);font-family:var(--sans);font-size:14px;padding:0 12px;outline:none;cursor:pointer;color-scheme:dark">
          <option value="direct">직통</option>
          <option value="transfer">환승 포함</option>
          <option value="adjacent">인접역 포함</option>
        </select>
        <button id="adj-info-btn" onclick="openAdjInfo()" title="인접역 취급 기준·검색" style="display:none;flex-shrink:0;width:42px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:15px;font-weight:700;cursor:pointer;font-family:var(--sans)">ⓘ</button>
        <button class="book-search-btn" style="flex:2" onclick="searchBookTrainsUI()">열차 조회</button>
      </div>
    </div>
    ${_bookRoutesRowHTML()}
    <div id="${resultId}"></div>`;

  // 역 선택 상태 복원
  if(window._bookFrom) document.getElementById('book-from-name').textContent = window._bookFrom;
  if(window._bookTo) document.getElementById('book-to-name').textContent = window._bookTo;
}

function setBookTripType(isRound){
  _bookRoundTrip = isRound;
  if(document.getElementById('my-result-book')) renderMyBookTab();
  else renderBookTab();
}

function swapBookStations(){
  const tmp = window._bookFrom;
  window._bookFrom = window._bookTo;
  window._bookTo = tmp;
  if(document.getElementById('my-result-book')) renderMyBookTab();
  else renderBookTab();
}

// 역 선택 팝업
function openBookStnPicker(type){
  document.getElementById('book-stn-picker-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'book-stn-picker-wrap';
  // 전체화면 wrap에 z-index + pointer-events 적용 (터치 차단 + 블러)
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center';
  wrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);z-index:0" onclick="closeBookStnPicker()"></div>
    <div style="position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;width:90vw;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.6)">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px">${type==='from'?'출발역':'도착역'} 선택</div>
      <input type="text" id="book-stn-input" placeholder="역명 입력 (예: 서울, ㅅㅇ)" autocomplete="off"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:14px;padding:10px 12px;outline:none;display:block;margin-bottom:6px">
      <div id="book-stn-list" style="max-height:240px;overflow-y:auto;border-radius:6px;background:var(--bg3)"></div>
      <button style="margin-top:10px;width:100%;padding:9px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:13px;cursor:pointer;font-family:var(--sans)" onclick="closeBookStnPicker()">취소</button>
    </div>`;
  document.body.appendChild(wrap);

  const inp = document.getElementById('book-stn-input');
  const list = document.getElementById('book-stn-list');
  if(!inp||!list) return;

  function renderList(q){
    if(!q){list.innerHTML='';return;}
    const validStns = type==='from'
      ? getBookableStations()
      : (window._bookFrom
          ? ALL_STATIONS.filter(s=>ALL_TRAINS.some(t=>{
              const fi=t.stops.findIndex(x=>x.s===window._bookFrom);
              const ti=t.stops.findIndex(x=>x.s===s);
              return fi>=0&&ti>fi&&!isPassStop(t,window._bookFrom)&&!isPassStop(t,s);
            }))
          : getBookableStations());
    const hits = validStns.filter(s=>matchesQuery(s,q)).slice(0,15);
    if(!hits.length){list.innerHTML='<div style="padding:10px 14px;color:var(--text3);font-size:13px">검색 결과 없음</div>';return;}
    list.innerHTML = hits.map(s=>{
      let display=s;
      if(!CHO.includes(q[0])){
        const i=s.indexOf(q);
        if(i>=0) display=s.slice(0,i)+`<span style="color:var(--accent)">${s.slice(i,i+q.length)}</span>`+s.slice(i+q.length);
      }
      return `<div data-val="${s}" style="padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px"
        onmousedown="event.preventDefault();selectBookStn('${type}','${s}')"
        ontouchend="event.preventDefault();selectBookStn('${type}','${s}')">${display}</div>`;
    }).join('');
  }

  inp.addEventListener('input', ()=>renderList(inp.value.trim()));
  inp.addEventListener('keydown', e=>{
    if(e.key==='Escape') closeBookStnPicker();
    if(e.key==='Enter'){
      const items=[...list.querySelectorAll('[data-val]')];
      if(items.length===1) selectBookStn(type,items[0].dataset.val);
    }
  });

  setTimeout(()=>inp.focus(), 80);
}
function closeBookStnPicker(){
  document.getElementById('book-stn-picker-wrap')?.remove();
}
function selectBookStn(type, val){
  if(type==='from') window._bookFrom=val;
  else window._bookTo=val;
  closeBookStnPicker();
  renderBookTab();
}

// 인원 선택 팝업
function openBookPassengerPicker(){
  const old = document.getElementById('book-pass-picker-wrap');
  if(old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'book-pass-picker-wrap';
  wrap.style.cssText='position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center';
  wrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);z-index:0" onclick="closeBookPassengerPicker()"></div>
    <div style="position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px 20px;width:88vw;max-width:300px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.6)">
      <div style="font-size:15px;font-weight:700;margin-bottom:20px">인원 선택</div>
      <div class="booking-passenger-control" style="margin:0 0 16px">
        <button class="booking-stepper-btn" onclick="changeBookPassenger(-1)">−</button>
        <span id="book-passenger-num" style="font-size:26px;font-weight:700;min-width:44px;display:inline-block">${_bookPassengerCount}</span>
        <button class="booking-stepper-btn" onclick="changeBookPassenger(1)">+</button>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:18px">어른 기준 (최대 6명)</div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;font-size:14px" onclick="confirmBookPassenger()">확인</button>
    </div>`;
  document.body.appendChild(wrap);
}
function closeBookPassengerPicker(){
  const el = document.getElementById('book-pass-picker-wrap');
  if(el) el.remove();
}
function changeBookPassenger(d){
  _bookPassengerCount = Math.max(1, Math.min(6, _bookPassengerCount+d));
  const el = document.getElementById('book-passenger-num');
  if(el) el.textContent = _bookPassengerCount;
}
function confirmBookPassenger(){
  closeBookPassengerPicker();
  const el = document.getElementById('book-passenger-val');
  if(el) el.textContent = `어른 ${_bookPassengerCount}명`;
  window._bookingPassengerCount = _bookPassengerCount;
  // 예매 팝업 내 인원도 동기화
  const bpc = document.getElementById('booking-passenger-count');
  if(bpc) bpc.textContent = _bookPassengerCount;
  window._bookingPassengerCount = _bookPassengerCount;
  // 선택된 좌석 초기화 (인원 바뀌면 좌석 다시 선택)
  window._preselectedSeats = null;
  const disp = document.getElementById('booking-seat-display');
  if(disp) disp.textContent = '자동 배정';
}

// 열차 조회
function searchBookTrainsUI(){
  window._activePassId=null; // 사용자가 직접 조회하면 정기권 예매 흐름 해제
  const sel=document.getElementById('book-transfer-sel');
  searchBookTrains(sel?.value==='transfer', sel?.value==='adjacent');
}
// 인접역: 직선거리 km 이내의 기차 정차역 (서울-청량리, 대전-서대전 같은 관계용)
function _nearbyTrainStations(name, km){
  km=km||10;
  const cur=_stnCoord(name);
  if(!cur||typeof haversineKm!=='function')return [];
  _modeStnSetsInit();
  const out=[];
  for(const s of (_trainStnSet||[])){
    if(s===name)continue;
    const c=_stnCoord(s);
    if(!c)continue;
    const d=haversineKm(cur.lat,cur.lon,c.lat,c.lon);
    if(d<=km)out.push({n:s,d});
  }
  return out.sort((a,b)=>a.d-b.d);
}
// 인접역 ⓘ 버튼: '인접역 포함' 선택 시에만 표시
function _toggleAdjInfoBtn(sel){
  const btn=document.getElementById('adj-info-btn');
  if(btn)btn.style.display=(sel&&sel.value==='adjacent')?'':'none';
}
// 인접역 취급 기준 + 역명 검색 팝업 (예매 화면 ⓘ 버튼)
function openAdjInfo(){
  const bd=document.createElement('div');
  bd.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9950;display:flex;align-items:center;justify-content:center;padding:24px';
  bd.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;max-width:360px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:18px 18px 10px;flex-shrink:0">
      <div style="font-size:15px;font-weight:800;margin-bottom:10px;color:var(--accent2)">ⓘ 인접역 안내</div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.7;color:var(--text2)">
        <b style="color:var(--text1)">취급 기준</b><br>
        · 직선거리 <b style="color:var(--accent2)">10km 이내</b>의 기차 정차역<br>
        · 조회한 역에 정차하는 열차는 제외 (같은 노선 중복 방지)<br>
        · 인접역 열차는 <span style="color:var(--orange)">인접역</span> 표시와 함께 결과에 포함되며, 예매는 실제 발착역 기준으로 진행됩니다
      </div>
      <input id="adj-info-inp" type="text" placeholder="역 이름 검색 (초성 가능, 예: ㅅㅇ)" autocomplete="off"
        style="width:100%;box-sizing:border-box;margin-top:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text1);font-size:14px;font-family:var(--sans);outline:none">
    </div>
    <div id="adj-info-results" style="overflow-y:auto;padding:0 18px;flex:1;min-height:0">
      <div style="color:var(--text3);font-size:12px;padding:6px 0 12px">역 이름을 입력하면 그 역의 인접역과 거리가 표시됩니다.</div>
    </div>
    <div style="padding:12px 18px 16px;flex-shrink:0;border-top:1px solid var(--border)">
      <button data-act="close" style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--sans);touch-action:manipulation">닫기</button>
    </div>
  </div>`;
  document.body.appendChild(bd);
  bd.querySelector('[data-act="close"]').addEventListener('click',()=>bd.remove());
  bd.addEventListener('click',e=>{if(e.target===bd)bd.remove();});
  const inp=bd.querySelector('#adj-info-inp'), res=bd.querySelector('#adj-info-results');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim();
    if(!q){res.innerHTML='<div style="color:var(--text3);font-size:12px;padding:6px 0 12px">역 이름을 입력하면 그 역의 인접역과 거리가 표시됩니다.</div>';return;}
    _modeStnSetsInit();
    const cands=[...(_trainStnSet||[])].filter(s=>matchesQuery(s,q)).sort((a,b)=>a.length-b.length).slice(0,3);
    if(!cands.length){res.innerHTML='<div style="color:var(--text3);font-size:12px;padding:6px 0 12px">일치하는 기차역이 없습니다.</div>';return;}
    res.innerHTML=cands.map(stn=>{
      const nbs=_nearbyTrainStations(stn);
      const rows=nbs.length?nbs.map(nb=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)33;font-size:13px">
          <span style="flex:1;font-weight:600">${nb.n}</span>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text3)">${nb.d.toFixed(1)}km</span>
        </div>`).join('')
        :'<div style="color:var(--text3);font-size:12px;padding:4px 0 8px">10km 이내 인접역 없음</div>';
      return `<div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:800;padding:6px 0 2px;color:var(--accent2)">🚉 ${stn} <span style="font-weight:400;color:var(--text3);font-size:11px">인접역 ${nbs.length}곳</span></div>
        ${rows}
      </div>`;
    }).join('');
  });
  setTimeout(()=>inp.focus(),50);
}
// 인접역 안내 팝업 (코레일톡 스타일) — 확인 시 계속 진행
function _bookAdjConfirm(msg,onOk){
  const bd=document.createElement('div');
  bd.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9600;display:flex;align-items:center;justify-content:center;padding:24px';
  bd.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;max-width:340px;width:100%;padding:20px 18px">
    <div style="font-size:15px;font-weight:800;margin-bottom:10px;color:var(--accent2)">이용 안내</div>
    <div style="font-size:13.5px;line-height:1.7;color:var(--text1)">${msg}</div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button data-act="no" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--sans)">취소</button>
      <button data-act="ok" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--sans)">확인</button>
    </div></div>`;
  document.body.appendChild(bd);
  bd.querySelector('[data-act="ok"]').addEventListener('click',()=>{bd.remove();onOk();});
  bd.querySelector('[data-act="no"]').addEventListener('click',()=>bd.remove());
  bd.addEventListener('click',e=>{if(e.target===bd)bd.remove();});
}

function searchBookTrains(includeTransfer, includeAdj){
  const from = window._bookFrom;
  const to = window._bookTo;
  const dateGo = document.getElementById('book-date-go')?.value;
  const dateBack = _bookRoundTrip ? document.getElementById('book-date-back')?.value : null;
  const el = document.getElementById('my-book-results') || document.getElementById('book-results');
  if(!el) return;
  // 가는날 → 탑승일 동기화
  if(dateGo){
    const bdEl=document.getElementById('booking-date');
    if(bdEl) bdEl.value=dateGo;
    window._currentTravelDate=dateGo;
  }

  if(!from||!to){
    el.innerHTML='<div class="empty"><div class="empty-icon">🚉</div><p>출발역과 도착역을 선택해주세요</p></div>';
    return;
  }
  if(from===to){
    el.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>출발역과 도착역이 같습니다</p></div>';
    return;
  }

  // 직통 열차 탐색
  const nowForFilter = new Date();
  const nowMFilter = nowForFilter.getHours()*60+nowForFilter.getMinutes();
  // 오늘 날짜 예매일 때만 현재 시각 이전 열차 제외
  const isToday = (dateGo === todayLocalStr());
  // A→B 직통 스캔 (인접역 탐색에도 재사용)
  const scanDirect=(A,B)=>{
    const arr=[];
    ALL_TRAINS.forEach(t=>{
      const stops=t.stops;
      const fi=stops.findIndex(s=>s.s===A);
      const ti=stops.findIndex(s=>s.s===B);
      if(fi<0||ti<0||fi>=ti) return;
      if(isPassStop(t,A)||isPassStop(t,B)) return;
      const depStop=stops[fi], arrStop=stops[ti];
      const depT=hasTime(depStop.dep)?depStop.dep:hasTime(depStop.arr)?depStop.arr:null;
      const arrT=hasTime(arrStop.arr)?arrStop.arr:hasTime(arrStop.dep)?arrStop.dep:null;
      if(!depT) return;
      if(isToday && toMin(depT)!==null && toMin(depT)<nowMFilter) return;
      arr.push({t, depT, arrT, dur:durStr(depT, arrT)});
    });
    return arr;
  };
  const trains = scanDirect(from,to).map(e=>({...e, aFrom:from, aTo:to, adj:false}));

  // 인접역 포함: 출발/도착역 반경 10km 내 기차역 발착 열차 (조회역 미정차 열차만)
  if(includeAdj){
    const stopsAt=(t,stn)=>{const i=t.stops.findIndex(s=>s.s===stn);return i>=0&&!isPassStop(t,stn);};
    const seen=new Set(trains.map(e=>e.t.no));
    for(const nb of _nearbyTrainStations(from)){
      scanDirect(nb.n,to).forEach(e=>{
        if(seen.has(e.t.no)||stopsAt(e.t,from))return;
        seen.add(e.t.no);
        trains.push({...e, aFrom:nb.n, aTo:to, adj:true, miss:from});
      });
    }
    for(const nb of _nearbyTrainStations(to)){
      scanDirect(from,nb.n).forEach(e=>{
        if(seen.has(e.t.no)||stopsAt(e.t,to))return;
        seen.add(e.t.no);
        trains.push({...e, aFrom:from, aTo:nb.n, adj:true, miss:to});
      });
    }
  }
  trains.sort((a,b)=>(toMin(a.depT)||0)-(toMin(b.depT)||0));

  if(!trains.length){
    if(includeTransfer){
      searchBookTransfers(from, to, dateGo, el);
    } else {
      el.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><p>${from} → ${to} ${includeAdj?'직통·인접역':'직통'} 열차가 없습니다.<br><small style="color:var(--text3)">환승 포함${includeAdj?'':' · 인접역 포함'} 옵션으로 다시 검색해보세요</small></p></div>`;
    }
    return;
  }
  const adjCount=trains.filter(e=>e.adj).length;

  // inline onclick 제거 → data 속성 저장 후 addEventListener로 등록 (iOS Safari 호환)
  const rows = trains.map(({t,depT,arrT,dur,aFrom,aTo,adj,miss})=>`
    <div class="book-train-row" data-train-no="${t.no}" data-dep="${depT}" data-arr="${arrT||''}" data-from="${aFrom}" data-to="${aTo}" data-date="${dateGo}" ${adj?`data-adj="1" data-miss="${miss}"`:''} ${adj?'style="opacity:.78"':''}>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:700;color:var(--c-${gcCssVar(t.grade)})">${t.grade}</span>
          <span style="font-size:13px;color:var(--text2);font-family:var(--mono)">${t.no}</span>
          <span style="font-size:12px;font-weight:600;color:var(--text1)">${t.dest}행</span>
          ${adj?`<span style="font-size:9.5px;font-weight:800;padding:1px 7px;border-radius:8px;background:rgba(249,115,22,.12);border:1px solid var(--orange);color:var(--orange)">인접역</span>`:''}
        </div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:17px;font-weight:700;font-family:var(--mono)">${depT}</span>
          ${adj&&aFrom!==from?`<span style="font-size:10.5px;color:var(--orange);font-weight:700">${aFrom}</span>`:''}
          <span style="color:var(--text3);font-size:12px">→</span>
          <span style="font-size:17px;font-weight:700;font-family:var(--mono);color:var(--green)">${arrT||'-'}</span>
          ${adj&&aTo!==to?`<span style="font-size:10.5px;color:var(--orange);font-weight:700">${aTo}</span>`:''}
          <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">${dur}</span>
        </div>
        ${adj?`<div style="font-size:10.5px;color:var(--text3);margin-top:3px">${miss}역 미정차 · ${aFrom!==from?aFrom+' 출발':aTo+' 도착'}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="seat-avail-btn" data-no="${t.no}"
          style="min-width:54px;height:44px;border-radius:8px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;font-family:var(--sans);color:var(--text3);text-align:center;line-height:1.3">조회<br>중</div>
        <div class="book-train-chevron">›</div>
      </div>
    </div>`).join('');

  const tripLabel = _bookRoundTrip ? `편도 (${dateGo})` : dateGo;
  el.innerHTML = `
    <div class="result-header" style="margin-top:16px">
      <div class="result-title">${from} → ${to}</div>
      <span class="badge blue">${trains.length}편</span>
      ${adjCount?`<span class="badge" style="border-color:var(--orange);color:var(--orange)">인접역 ${adjCount}편</span>`:''}
      <span class="badge" style="background:var(--bg3)">${tripLabel}</span>
    </div>
    <div class="book-train-list">${rows}</div>
    ${_bookRoundTrip&&dateBack?`<p class="hint" style="margin-top:8px">※ 왕복: 가는 열차 예매 완료 후 복편(${to}→${from}, ${dateBack}) 조회가 자동으로 열립니다</p>`:''}`;

  // 환승 포함: 직통 결과 아래에 환승 경로도 함께 표시
  if(includeTransfer){
    const xd=document.createElement('div');
    el.appendChild(xd);
    searchBookTransfers(from, to, dateGo, xd, true);
  }

  // addEventListener 방식으로 클릭 등록 (iOS Safari: overflow-y:auto 내부 div onclick 미동작 방지)
  el.querySelectorAll('.book-train-row[data-train-no]:not(.book-xfer-card)').forEach(row=>{
    row.addEventListener('click', ()=>{
      // 정기권 예매 흐름: 중간 요금 시트를 건너뛰고 바로 요일·등급 선택창을 연다
      const go=()=> window._activePassId
        ? openPassDaySelector(window._activePassId, row.dataset.trainNo, row.dataset.from||from, row.dataset.to||to, row.dataset.dep||'', row.dataset.arr||'')
        : openBookTrainDetail(row.dataset.trainNo, row.dataset.from||from, row.dataset.to||to, row.dataset.dep||'', row.dataset.arr||'', row.dataset.date||dateGo);
      if(row.dataset.adj){
        const miss=row.dataset.miss, aF=row.dataset.from, aT=row.dataset.to;
        _bookAdjConfirm(`출발역은 <b>${aF}역</b>이고 도착역은 <b>${aT}역</b>입니다.<br><br><b>${miss}역</b>은 정차하지 않습니다.`, go);
      } else go();
    });
  });

  // 좌석 가용 버튼 비동기 업데이트
  setTimeout(()=>{
    trains.forEach(({t})=>{
      const ft=getFormationType(t.grade,t.no);
      const comp=getCarComposition(ft);
      const cong=getCongestionLevel(t.no,dateGo,comp);
      const row=el.querySelector(`[data-train-no="${t.no}"]`);
      const btn=row?.querySelector('.seat-avail-btn');
      if(!btn)return;
      const r=cong.rate||0;
      const base='min-width:54px;height:44px;border-radius:8px;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--sans)';
      if(r>=0.98){btn.textContent='매진';btn.style.cssText=base+';color:var(--red);border-color:var(--red);background:rgba(248,81,73,.08)';}
      else if(r>=0.80){btn.textContent='혼잡';btn.style.cssText=base+';color:var(--orange);border-color:var(--orange);background:rgba(249,115,22,.08)';}
      else if(r>=0.50){btn.textContent='보통';btn.style.cssText=base+';color:var(--accent2);border-color:var(--accent);background:rgba(56,139,253,.08)';}
      else{btn.textContent='여유';btn.style.cssText=base+';color:var(--green);border-color:var(--green);background:rgba(63,185,80,.08)';}
    });
  },0);
}


// 열차 상세 & 예매 패널 (하단 슬라이드업)
function openBookTrainDetail(trainNo, from, to, depT, arrT, travelDate){
  const t = ALL_TRAINS.find(x=>x.no===trainNo);
  if(!t) return;

  const old = document.getElementById('book-detail-wrap');
  if(old) old.remove();

  // 매진 여부 판정 (예매 탭 매진 열차 전용 여석 알림)
  let soldOut=false;
  try{
    const _comp=getCarComposition(getFormationType(t.grade,t.no));
    soldOut=(getCongestionLevel(t.no,travelDate,_comp).rate||0)>=0.98;
  }catch(e){}

  const fare = calcFare(t, from, to, 'general');
  const fareSpec = availableSeatClasses(t.grade).map(c=>{
    const f = calcFare(t, from, to, c);
    return `<div class="book-detail-fare-row">
      <span>${SEAT_CLASSES[c].label}</span>
      <span style="font-family:var(--mono);color:var(--accent);font-weight:600">${f.toLocaleString()}원</span>
    </div>`;
  }).join('');

  const wrap = document.createElement('div');
  wrap.id = 'book-detail-wrap';
  // wrap은 스타일 없이 순수 컨테이너 (스태킹 컨텍스트 없음)
  // inline onclick 제거 → appendChild 후 addEventListener로 등록 (iOS Safari 호환)
  wrap.innerHTML = `
    <div class="book-detail-backdrop"></div>
    <div class="book-detail-panel">
      <div style="flex-shrink:0;padding:12px 20px 0">
        <div class="book-detail-handle"></div>
        <div class="book-detail-head">
          <div>
            <span class="book-detail-grade" style="color:var(--c-${gcCssVar(t.grade)})">${t.grade}</span>
            <span class="book-detail-no">${t.no}</span>
          </div>
          <button class="my-panel-close" id="bdd-close-x">✕</button>
        </div>
        <div class="book-detail-route">
          <div class="book-detail-stn">
            <div class="book-detail-stn-name">${from}</div>
            <div class="book-detail-stn-time">${depT}</div>
          </div>
          <div class="book-detail-dur">${durStr(depT,arrT)}</div>
          <div class="book-detail-stn" style="text-align:right">
            <div class="book-detail-stn-name">${to}</div>
            <div class="book-detail-stn-time">${arrT||'-'}</div>
          </div>
        </div>
      </div>
      <div class="book-detail-scroll" style="padding:0 20px">
        <div class="book-detail-fares">${fareSpec}</div>
      </div>
      <div style="flex-shrink:0;padding:8px 20px 32px;display:flex;gap:8px">
        <button class="btn" id="bdd-detail-btn" style="flex:1;justify-content:center;font-size:13px">🔍 열차 상세</button>
        ${soldOut
          ? `<button class="btn" id="bdd-watch-btn" style="flex:2;justify-content:center;font-size:14px;color:var(--red);border-color:var(--red)">🔔 여석 알림 (매진)</button>`
          : `<button class="btn btn-primary" id="bdd-book-btn" style="flex:2;justify-content:center;font-size:14px">🎫 예매하기</button>`}
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('.book-detail-backdrop').addEventListener('click', closeBookTrainDetail);
  addMobileTap(document.getElementById('bdd-close-x'), closeBookTrainDetail);
  addMobileTap(document.getElementById('bdd-detail-btn'), ()=>{ closeBookTrainDetail(); jumpToTrain(trainNo); });
  if(soldOut){
    addMobileTap(document.getElementById('bdd-watch-btn'), ()=>{ closeBookTrainDetail(); openSeatWatchPopup(trainNo,from,to); });
  }else{
    addMobileTap(document.getElementById('bdd-book-btn'), ()=>{ closeBookTrainDetail(); _bookDetailConfirm(trainNo,from,to,depT,arrT||'',travelDate); });
  }
  setTimeout(()=>wrap.querySelector('.book-detail-panel').classList.add('open'), 10);
}


// ── 열차 예매 탭 환승 탐색 ──
function searchBookTransfers(from, to, dateGo, el, append){
  const MIN_WAIT=3, MAX_WAIT=60;
  const nowForFilter=new Date();
  const nowMFilter=nowForFilter.getHours()*60+nowForFilter.getMinutes();
  const isToday=(dateGo===todayLocalStr());

  function getStopT(s){ return hasTime(s.dep)?s.dep:hasTime(s.arr)?s.arr:null; }

  // from에서 출발하는 모든 레그
  const legs1=[];
  ALL_TRAINS.forEach(t=>{
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    if(fi<0||isPassStop(t,from))return;
    const depT=getStopT(stops[fi]);
    if(!depT)return;
    const depM=toMin(depT);
    if(isToday&&depM!==null&&depM<nowMFilter)return;
    for(let i=fi+1;i<stops.length;i++){
      const s=stops[i];
      if(!s.arr&&!s.dep)continue;
      if(isPassStop(t,s.s))continue;
      const arrT=hasTime(s.arr)?s.arr:hasTime(s.dep)?s.dep:null;
      if(!arrT)continue;
      legs1.push({t,depStn:from,depT,depM,arrStn:s.s,arrT,arrM:toMin(arrT)});
    }
  });

  let transfers=[];
  legs1.forEach(l1=>{
    if(l1.arrStn===to)return;
    ALL_TRAINS.forEach(t2=>{
      if(t2===l1.t)return;
      const stops=t2.stops;
      const xi=stops.findIndex(s=>s.s===l1.arrStn);
      const ti=stops.findIndex(s=>s.s===to);
      if(xi<0||ti<0||xi>=ti)return;
      if(isPassStop(t2,l1.arrStn)||isPassStop(t2,to))return;
      const dep2T=getStopT(stops[xi]);
      if(!dep2T)return;
      const dep2M=toMin(dep2T);
      const wait=dep2M-l1.arrM;
      if(wait<MIN_WAIT||wait>MAX_WAIT)return;
      const arr2T=hasTime(stops[ti].arr)?stops[ti].arr:hasTime(stops[ti].dep)?stops[ti].dep:null;
      if(!arr2T)return;
      const totalM=toMin(arr2T)-l1.depM;
      if(totalM<=0)return;
      transfers.push({
        legs:[{t:l1.t,from,to:l1.arrStn,depT:l1.depT,arrT:l1.arrT},
              {t:t2,from:l1.arrStn,to,depT:dep2T,arrT:arr2T}],
        totalDur:durStr(l1.depT,arr2T), totalM,
        depM:l1.depM, arrM:toMin(arr2T)||9999
      });
    });
  });

  // 중복 제거 & 정렬 & 최대 5건
  const seen=new Set();
  transfers=transfers.filter(r=>{
    const key=r.legs.map(l=>l.t.no+l.depT).join('|');
    if(seen.has(key))return false; seen.add(key); return true;
  }).sort((a,b)=>a.totalM-b.totalM).slice(0,5);

  if(!transfers.length){
    el.innerHTML=append?'':`<div class="empty"><div class="empty-icon">🚫</div><p>${from} → ${to} 운행 가능한 경로가 없습니다</p></div>`;
    return;
  }

  const cards=transfers.map(({legs,totalDur})=>{
    const legsHtml=legs.map((l,i)=>`
      <div class="book-xfer-leg">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span class="xfer-role-tag ${i===0?'lead':'follow'}">${i===0?'선행':'후행'}</span>
          <span style="font-size:12px;font-weight:700;color:var(--c-${gcCssVar(l.t.grade)})">${l.t.grade}</span>
          <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">${l.t.no}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">${l.from}</span>
          <span style="font-family:var(--mono);font-size:12px;color:var(--accent)">${l.depT}</span>
          <span style="color:var(--text3)">→</span>
          <span style="font-weight:600">${l.to}</span>
          <span style="font-family:var(--mono);font-size:12px;color:var(--green)">${l.arrT||'-'}</span>
        </div>
      </div>
      ${i<legs.length-1?`<div class="book-xfer-wait">🔄 환승 · 대기 ${toMin(legs[i+1].depT)-toMin(l.arrT)}분</div>`:''}`
    ).join('');
    const firstLeg=legs[0], lastLeg=legs[legs.length-1];
    // inline onclick 제거 → data 속성 저장 후 addEventListener (iOS Safari 호환)
    return `<div class="book-train-row book-xfer-card"
      data-train-no="${firstLeg.t.no}" data-dep="${firstLeg.depT}" data-arr="${firstLeg.arrT||''}"
      data-from="${firstLeg.from}" data-to="${firstLeg.to}" data-date="${dateGo}"
      data-no2="${lastLeg.t.no}" data-xstn="${firstLeg.to}" data-dep2="${lastLeg.depT}" data-arr2="${lastLeg.arrT||''}" data-final="${lastLeg.to}">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(210,153,34,.15);color:#d29922;border:1px solid rgba(210,153,34,.3)">1회 환승</span>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text2)">${firstLeg.depT} → ${lastLeg.arrT||'?'} · ${totalDur}</span>
        </div>
        ${legsHtml}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="book-train-chevron">›</div>
      </div>
    </div>`;
  }).join('');

  const tripLabel=dateGo;
  el.innerHTML=`
    <div class="result-header" style="margin-top:16px">
      <div class="result-title">${append?'🔄 환승 경로':`${from} → ${to} · 환승`}</div>
      <span class="badge blue">${transfers.length}건</span>
      <span class="badge" style="background:var(--bg3)">${tripLabel}</span>
    </div>
    <div class="book-train-list">${cards}</div>`;

  // 환승 카드 클릭 → 두 구간 예매 상세(openBookXferDetail)
  const openXfer=row=>openBookXferDetail(
    row.dataset.trainNo, row.dataset.no2,
    row.dataset.from, row.dataset.xstn, row.dataset.final,
    row.dataset.dep||'', row.dataset.arr||'',
    row.dataset.dep2||'', row.dataset.arr2||'',
    row.dataset.date||dateGo);
  el.querySelectorAll('.book-train-row.book-xfer-card').forEach(row=>{
    row.addEventListener('click', ()=>openXfer(row));
  });
}

function _bookDetailConfirm(trainNo,from,to,depT,arrT,travelDate){
  if(window._activePassId){
    openPassDaySelector(window._activePassId,trainNo,from,to,depT,arrT||'');
  } else {
    window._bookingPassengerCount=_bookPassengerCount||1;
    const dateBack=document.getElementById('book-date-back')?.value||'';
    openBookingWithDate(trainNo,from,to,depT,arrT||'',travelDate,_bookRoundTrip,dateBack);
  }
}

function closeBookTrainDetail(){
  const el = document.getElementById('book-detail-wrap');
  if(!el) return;
  el.querySelector('.book-detail-panel').classList.remove('open');
  setTimeout(()=>el.remove(), 300);
}

// 🔄 통합 환승 예매 시트 (코레일톡 방식) — 선행·후행 두 구간을 한 시트에서
//    각각 좌석 등급·좌석·운임을 고르고, 하나의 예매 버튼으로 함께 예매한다.
function openBookXferDetail(no1,no2,from,xStn,to,depT1,arrT1,depT2,arrT2,travelDate){
  const t1=ALL_TRAINS.find(x=>x.no===no1),t2=ALL_TRAINS.find(x=>x.no===no2);
  if(!t1||!t2)return;
  const toLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=new Date(); const minDate=toLocal(today);
  const maxD=new Date(today);maxD.setMonth(maxD.getMonth()+1); const maxDate=toLocal(maxD);
  window._xfer={
    date:(travelDate&&travelDate>=minDate)?travelDate:minDate, minDate, maxDate,
    count:(typeof _bookPassengerCount!=='undefined'&&_bookPassengerCount)||1, discount:'none',
    from, to, via:xStn,
    legs:[
      {role:'선행',no:no1,grade:t1.grade,from,to:xStn,depT:depT1,arrT:arrT1,cls:null,seats:null},
      {role:'후행',no:no2,grade:t2.grade,from:xStn,to,depT:depT2,arrT:arrT2,cls:null,seats:null},
    ]
  };
  document.getElementById('book-detail-wrap')?.remove();
  const wrap=document.createElement('div');
  wrap.id='book-detail-wrap';
  wrap.innerHTML=`
    <div class="book-detail-backdrop"></div>
    <div class="book-detail-panel">
      <div style="flex-shrink:0;padding:12px 20px 0">
        <div class="book-detail-handle"></div>
        <div class="book-detail-head">
          <div style="font-size:14px;font-weight:600">🔄 환승 예매 · ${from} → ${xStn} → ${to}</div>
          <button class="my-panel-close" id="bxd-close-x">✕</button>
        </div>
      </div>
      <div id="bxd-body" style="overflow-y:auto;flex:1;min-height:0;-webkit-overflow-scrolling:touch;padding:0 20px"></div>
      <div style="flex-shrink:0;padding:10px 20px 28px">
        <button class="btn btn-primary" id="bxd-confirm" disabled style="width:100%;justify-content:center;opacity:.5">두 구간의 좌석 등급을 선택하세요</button>
        <button class="alarm-popup-close" id="bxd-cancel" style="margin-top:8px">취소</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('.book-detail-backdrop').addEventListener('click', closeBookTrainDetail);
  addMobileTap(document.getElementById('bxd-close-x'), closeBookTrainDetail);
  addMobileTap(document.getElementById('bxd-cancel'), closeBookTrainDetail);
  addMobileTap(document.getElementById('bxd-confirm'), confirmXferBooking);
  _renderXferBody();
  setTimeout(()=>wrap.querySelector('.book-detail-panel').classList.add('open'),10);
}
function _renderXferBody(){
  const X=window._xfer; const body=document.getElementById('bxd-body'); if(!X||!body)return;
  const legHtml=X.legs.map((L,idx)=>{
    const t=ALL_TRAINS.find(x=>x.no===L.no);
    const classes=availableSeatClasses(L.grade);
    const dur=durMin(L.depT,L.arrT);
    const opts=classes.map(c=>{
      const fare=applyDiscount(calcFare(t,L.from,L.to,c),X.discount);
      return `<button class="booking-seat-option${L.cls===c?' active':''}" data-leg="${idx}" data-class="${c}">
        <span class="booking-seat-label">${SEAT_CLASSES[c].label}</span>
        <span class="booking-seat-fare">${fare.toLocaleString()}원</span></button>`;
    }).join('');
    const seatRow = L.cls==='standing'
      ? `<div class="hint" style="margin:8px 0 0">🚉 입석·자유석 전용 칸 — 좌석 지정 없음</div>`
      : `<button class="btn xfer-seat-btn" data-leg="${idx}" ${L.cls?'':'disabled'} style="width:100%;justify-content:center;font-size:12.5px;margin-top:8px;gap:6px;${L.cls?'':'opacity:.4;cursor:not-allowed'}">🪑 좌석 선택 — <span style="color:var(--accent2)">${L.cls?((L.seats&&L.seats.length===X.count)?L.seats.join(', '):'자동 배정'):'등급 선택 후 가능'}</span></button>`;
    return `<div class="xfer-leg-card">
      <div class="xfer-leg-head">
        <span class="xfer-role-tag ${idx===0?'lead':'follow'}">${L.role}</span>
        <span style="color:var(--c-${gcCssVar(L.grade)});font-weight:700">${L.grade} ${L.no}</span>
        <span style="margin-left:auto;font-family:var(--mono);font-size:12.5px">${L.depT} → ${L.arrT}</span>
      </div>
      <div class="xfer-leg-route">${L.from} → ${L.to}${dur!=null?` · ${fmtDurKor(dur)}`:''}</div>
      <div class="booking-section-label" style="margin-top:6px">좌석 등급 · 운임</div>
      <div class="booking-seat-options">${opts}</div>
      ${seatRow}
    </div>`;
  }).join(`<div class="xfer-arrow">🔄 ${X.via} 환승</div>`);
  const legFare=L=>{ if(!L.cls)return null; const t=ALL_TRAINS.find(x=>x.no===L.no); return applyDiscount(calcFare(t,L.from,L.to,L.cls),X.discount); };
  const bothCls=X.legs.every(L=>L.cls);
  const total=bothCls?X.legs.reduce((a,L)=>a+legFare(L),0)*X.count:0;
  body.innerHTML=`
    <div class="booking-date-section"><div class="booking-section-label">탑승일</div>
      <input type="date" id="bxd-date" value="${X.date}" min="${X.minDate}" max="${X.maxDate}" class="booking-date-input"></div>
    <div class="booking-passenger-section" style="margin-bottom:8px">
      <div class="booking-section-label">인원</div>
      <div class="booking-passenger-control">
        <button class="booking-stepper-btn" id="bxd-minus">−</button>
        <span id="bxd-count">${X.count}</span>
        <button class="booking-stepper-btn" id="bxd-plus">+</button>
      </div>
      <div class="booking-section-label" style="margin-top:12px">할인 <span style="font-size:11px;color:var(--text3);font-weight:400">(승차권에 표시)</span></div>
      <div class="booking-discount-options">
        ${Object.entries(DISCOUNTS).map(([k,d])=>`<button class="booking-discount-option${X.discount===k?' active':''}" data-discount="${k}">${d.label}${d.rate?`<span class="booking-discount-rate">${Math.round(d.rate*100)}%↓</span>`:''}</button>`).join('')}
      </div>
    </div>
    ${legHtml}
    <div class="xfer-total"><span>총 운임 <span style="color:var(--text3);font-weight:400">· ${X.count}명</span></span><b>${bothCls?total.toLocaleString()+'원':'구간 선택 필요'}</b></div>`;
  const cbtn=document.getElementById('bxd-confirm');
  if(cbtn){cbtn.disabled=!bothCls;cbtn.style.opacity=bothCls?'1':'.5';cbtn.textContent=bothCls?'🎫 환승 예매하기':'두 구간의 좌석 등급을 선택하세요';}
  body.querySelector('#bxd-date')?.addEventListener('change',e=>{X.date=e.target.value;});
  body.querySelector('#bxd-minus')?.addEventListener('click',()=>{X.count=Math.max(1,X.count-1);X.legs.forEach(L=>L.seats=null);_renderXferBody();});
  body.querySelector('#bxd-plus')?.addEventListener('click',()=>{X.count=Math.min(6,X.count+1);X.legs.forEach(L=>L.seats=null);_renderXferBody();});
  body.querySelectorAll('.booking-discount-option').forEach(b=>b.addEventListener('click',()=>{X.discount=b.dataset.discount;_renderXferBody();}));
  body.querySelectorAll('.booking-seat-option').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.leg;X.legs[i].cls=b.dataset.class;X.legs[i].seats=null;_renderXferBody();}));
  body.querySelectorAll('.xfer-seat-btn').forEach(b=>{ if(!b.hasAttribute('disabled')) b.addEventListener('click',()=>openXferSeatSelector(+b.dataset.leg)); });
}
function openXferSeatSelector(legIdx){
  const X=window._xfer; if(!X)return; const L=X.legs[legIdx]; if(!L||!L.cls)return;
  if(L.cls==='standing'){alert('입석·자유석은 지정 좌석이 없는 전용 칸입니다.');return;}
  window._bookingPassengerCount=X.count||1;
  window._xferSeatCtx={legIdx};
  openSeatSelector(L.no, X.date, L.cls);
  const sw=document.getElementById('seat-selector-wrap'); if(sw)sw.style.zIndex='10001'; // 환승 시트(9900) 위로
}
// 승차권 자동 승하차 알람 (예매 완료 후) — 직통/환승 공용
function _autoBookAlarms(t,fromStn,toStn,depTime,arrTime){
  try{
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const fi=t.stops.findIndex(s=>s.s===fromStn), ti=t.stops.findIndex(s=>s.s===toStn);
    if(fi>=0 && !hasAlarm(`board:${t.no}:${fromStn}`)){
      const prev=t.stops.slice(0,fi).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr));
      toggleAlarmType('board',t.no,fromStn,depTime,prev?(hasTime(prev.dep)?prev.dep:prev.arr):null,true);
    }
    if(ti>=0 && !hasAlarm(`arr:${t.no}:${toStn}`)){
      const prev2=t.stops.slice(0,ti).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr));
      toggleAlarmType('arr',t.no,toStn,arrTime,prev2?(hasTime(prev2.dep)?prev2.dep:prev2.arr):null,true);
    }
  }catch(e){console.warn('환승 알람 설정 실패:',e);}
}
function confirmXferBooking(){
  const X=window._xfer; if(!X)return;
  if(!X.legs.every(L=>L.cls)){alert('두 구간 모두 좌석 등급을 선택해주세요.');return;}
  const travelDate=X.date||todayLocalStr();
  const count=X.count||1, discount=X.discount||'none';
  // 오늘 예매 시 선행 열차가 이미 출발했으면 차단
  if(travelDate===todayLocalStr()){
    const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
    const depM=toMin(X.legs[0].depT);
    if(depM!==null&&depM<nowM){alert(`이미 출발한 열차는 예매할 수 없습니다.\n\n${X.legs[0].from} ${X.legs[0].depT} 출발`);return;}
  }
  // 기존 승차권과 시간 겹침 검사 (각 구간)
  const existing=loadTickets().filter(tk=>tk.status==='active'&&tk.travelDate===travelDate);
  for(const L of X.legs){
    const nd=toMin(L.depT), na=toMin(L.arrT); if(nd===null||na===null)continue;
    const conflict=existing.find(tk=>{
      const ed=toMin(tk.depTime), ea=toMin(tk.arrTime); if(ed===null||ea===null)return false;
      const aS=nd,aE=na>=nd?na:na+1440, bS=ed,bE=ea>=ed?ea:ed+1440; return aS<bE&&bS<aE;
    });
    if(conflict){alert(`같은 시간대에 이미 예매한 승차권이 있습니다.\n\n${conflict.trainNo}번 · ${conflict.fromStn}→${conflict.toStn}\n${conflict.depTime}~${conflict.arrTime}\n\n환승 예매를 진행할 수 없습니다.`);return;}
  }
  const grp='XF'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const tickets=loadTickets(); const created=[];
  X.legs.forEach((L,idx)=>{
    const t=ALL_TRAINS.find(x=>x.no===L.no);
    const base=calcFare(t,L.from,L.to,L.cls);
    const fare=applyDiscount(base,discount);
    const seats=(L.seats&&L.seats.length===count)?[...L.seats]:Array.from({length:count},()=>randomSeat(L.cls,L.no));
    const tk={
      id:genTicketId(), trainNo:L.no,grade:t.grade,line:t.line,
      fromStn:L.from,toStn:L.to,depTime:L.depT,arrTime:L.arrT,
      seatClass:L.cls,seatClassLabel:SEAT_CLASSES[L.cls].label, seats,passengerCount:count,
      farePerPerson:fare,totalFare:fare*count, discount,discountLabel:DISCOUNTS[discount].label,baseFarePerPerson:base,
      distanceKm:Math.round(routeDistanceKm(t,L.from,L.to)), bookedAt:Date.now(), travelDate, status:'active',
      xferGroup:grp, xferSeq:idx+1, xferTotal:X.legs.length, xferVia:X.via, xferOrigin:X.from, xferDest:X.to
    };
    tickets.push(tk); created.push(tk);
  });
  saveTickets(tickets);
  created.forEach(tk=>_autoBookAlarms(ALL_TRAINS.find(x=>x.no===tk.trainNo),tk.fromStn,tk.toStn,tk.depTime,tk.arrTime));
  closeBookTrainDetail();
  const totalFare=created.reduce((a,tk)=>a+tk.totalFare,0);
  alert(`환승 예매가 완료되었습니다!\n${travelDate} · ${X.from} → ${X.via} → ${X.to}\n선행 ${created[0].grade} ${created[0].trainNo} · 후행 ${created[1].grade} ${created[1].trainNo}\n${count}명 · 총 ${totalFare.toLocaleString()}원`);
  window._xfer=null;
  if(document.getElementById('panel-ticket')?.classList.contains('active'))renderTickets();
  try{ if(typeof openMySection==='function'&&document.getElementById('my-sub-panel')?.classList.contains('open')&&document.getElementById('my-sub-title')?.textContent?.includes('승차권'))openMySection('ticket'); }catch(e){}
}

// 날짜 지정 예매 (열차 예매 탭에서 호출)
// isRound: 왕복이면 편도(가는편) 예매 완료 후 복편 조회 화면 자동 실행
function openBookingWithDate(trainNo, from, to, depT, arrT, travelDate, isRound, dateBack){
  // 예매 완료 후 콜백: 왕복이면 복편 조회로 이동
  const wantRound=(isRound===true||isRound==='true')&&dateBack;
  window._afterBookingCallback = wantRound ? ()=>{
    setTimeout(()=>{
      _bookRoundTrip=false; // 복편은 편도로 조회
      window._bookFrom = to;
      window._bookTo = from;
      openMySection('book'); // 마이페이지 예매 화면 재렌더 (역·편도 상태 반영)
      setTimeout(()=>{
        const dEl = document.getElementById('book-date-go');
        if(dEl) dEl.value = dateBack;
        searchBookTrains(false,false);
        const resEl=document.getElementById('my-book-results');
        if(resEl)resEl.insertAdjacentHTML('afterbegin',
          `<div style="margin-top:14px;padding:10px 14px;border-radius:10px;background:rgba(56,139,253,.1);border:1px solid var(--accent);font-size:12.5px;color:var(--accent2)">🔁 가는 열차 예매 완료 — <b>복편(${to} → ${from} · ${dateBack})</b>을 선택해 주세요</div>`);
      }, 150);
    }, 300);
  } : null;

  // book-detail-panel 슬라이드 닫힘 후 예매창 열기
  setTimeout(()=>{
    openBookingPopup(trainNo, from, to, depT, arrT, travelDate);
    const dateInp = document.getElementById('booking-date');
    if(dateInp && travelDate) dateInp.value = travelDate;
    if(window._bookPassengerCount>1){
      window._bookingPassengerCount = window._bookPassengerCount;
      const cnt = document.getElementById('booking-passenger-count');
      if(cnt) cnt.textContent = window._bookPassengerCount;
    }
  }, 50);
}



// ══════════════════════════════════════════
// 🚉 역 정보 탭
// ══════════════════════════════════════════
let _siSubTab='near', _siCurrent=null, _siCardPlatform=null, _siNearAll=[], _siNearShowClosed=false, _siNearLat=null, _siNearLon=null, _siHideTerm=false, _siUpcomingOnly=false, _siBoardTimer=null;
// 운행일 기준(04:00~익일 03:59) 분 변환: 04:00=0 … 03:59=1439
function _srvMin(m){ return ((m-240)%1440+1440)%1440; }

function renderStationInfo(){
  const el=document.getElementById('result-stationinfo');
  if(!el)return;
  el.innerHTML=`
    <div style="position:sticky;top:0;background:var(--bg);z-index:5;padding:8px 0 4px">
      <div style="display:flex;gap:4px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:4px">
        <button class="si-tab${_siSubTab==='near'?' active':''}" onclick="setSITab('near')">📍 가까운 ${_appMode==='metro'?'전철역':'역'}</button>
        <button class="si-tab${_siSubTab==='detail'?' active':''}" onclick="setSITab('detail')">🏢 역 상세</button>
      </div>
    </div>
    <div id="si-content" style="padding:0 0 24px"></div>`;
  renderSIContent();
}

function setSITab(t){
  _siSubTab=t;
  document.querySelectorAll('.si-tab').forEach((b,i)=>b.classList.toggle('active',['near','detail'][i]===t));
  renderSIContent();
}

function renderSIContent(){
  const el=document.getElementById('si-content');
  if(!el)return;
  if(_siSubTab==='metro')_siSubTab='near'; // 구버전 상태 복구
  if(_siSubTab==='near') renderSINear(el);
  else renderSIDetail(el);
}

// ── 🚇 전철 노선 탭 (전철 모드 전용) ──
let _metroRegion='전체', _metroDetailId=null, _metroPatSel=null;
// 계통이 정차하는 역 집합 — 게임 DB 태그("노선명/계통" 또는 "노선명 (계통)") 기준
function _metroPatStops(l,p){
  const set=new Set();
  if(typeof STATION_DB==='undefined')return set;
  const tags=[l.name+'/'+p, l.name+' ('+p+')'];
  const all=new Set((l.routes||[{stations:l.stations}]).flatMap(r=>r.stations));
  for(const n of all){
    const st=STATION_DB[n+'역']||STATION_DB[n];
    if(st&&st.lines&&tags.some(t=>st.lines.includes(t)))set.add(n);
  }
  return set;
}
// 계통 운행 구간 시퀀스 — 각 route에서 첫 정차역~마지막 정차역 구간만 취하고, 구간 내 미정차역은 pass 표시
// 계통 역을 가장 많이 담은 route부터 순회, 이미 담은 역은 건너뜀 (계통별 route가 겹치는 노선 대응)
function _metroPatSeq(l,p){
  const stops=_metroPatStops(l,p);
  if(!stops.size)return null;
  const routes=(l.routes||[{stations:l.stations}]).slice()
    .sort((a,b)=>b.stations.filter(s=>stops.has(s)).length-a.stations.filter(s=>stops.has(s)).length);
  const seq=[]; const seen=new Set();
  for(const r of routes){
    const idx=r.stations.map((s,i)=>stops.has(s)?i:-1).filter(i=>i>=0);
    if(idx.length<2)continue; // 해당 route에 정차역 1개(분기역 등)뿐이면 운행 구간 아님
    const a=idx[0], b=idx[idx.length-1];
    const seg=[];
    for(let i=a;i<=b;i++){
      const n=r.stations[i];
      if(seen.has(n))continue; // 다른 route에서 이미 표시한 역
      seg.push({n,stop:stops.has(n)});
    }
    if(!seg.filter(x=>x.stop).length)continue;
    // 분기역에서 이어지면 연속, 아니면 구분선
    const cont=seq.length&&seen.has(r.stations[a])&&seq[seq.length-1].n===r.stations[a];
    if(seq.length&&!cont)seq.push({gap:true});
    for(const x of seg){seq.push(x);seen.add(x.n);}
    r.stations.slice(a,b+1).forEach(n=>seen.add(n));
  }
  return seq.filter(x=>!x.gap).length>=2?seq:null;
}
function setMetroPat(p){_metroPatSel=p;renderMetroLinesTab();}
function renderMetroLinesTab(){
  const el=document.getElementById('result-metrolines');
  if(!el)return;
  if(typeof METRO_LINES==='undefined'){el.innerHTML='<div class="empty"><div class="empty-icon">🚇</div><p>전철 노선 데이터가 없습니다.</p></div>';return;}
  if(_metroDetailId){ _renderMetroLineDetail(el,_metroDetailId); return; }
  const regions=['전체',...new Set(METRO_LINES.map(l=>l.region))];
  const list=METRO_LINES.filter(l=>_metroRegion==='전체'||l.region===_metroRegion);
  el.innerHTML=`
    <div style="margin:14px 2px 4px;font-size:12px;color:var(--text3)">전철 ${METRO_LINES.length}개 노선 · 노선을 누르면 역 목록이 표시됩니다</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px">
      ${regions.map(r=>`<button class="metro-region-chip${_metroRegion===r?' on':''}" onclick="setMetroRegion('${r}')">${r}${r!=='전체'?` ${METRO_LINES.filter(l=>l.region===r).length}`:''}</button>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;padding-bottom:24px">${list.map(_metroCardHTML).join('')}</div>`;
}
function _metroCardHTML(l){
  return `<div class="metro-card" style="border-left:4px solid ${l.color}" onclick="openMetroLineDetail('${l.id}')">
    <div class="metro-head">
      <span class="metro-dot" style="background:${l.color}"></span>
      <span class="metro-name">${l.name}</span>
      ${l.loop?'<span class="metro-badge">순환</span>':''}
      ${l.night?'<span class="metro-badge night">심야</span>':''}
      <span class="metro-count">${l.n}개역 ›</span>
    </div>
    <div class="metro-route">${l.loop?`${l.from} 기점 순환`:`${l.from} ↔ ${l.to}`}</div>
    <div class="metro-info">
      <span>첫차 <b>${l.first}</b></span>
      <span>막차 <b>${l.last}</b></span>
      <span>${_metroHeadway(l)}</span>
    </div>
  </div>`;
}
// 노선 상세: 열차 조회처럼 타임라인 식 역 목록
function _renderMetroLineDetail(el,id){
  const l=METRO_LINES.find(x=>x.id===id);
  if(!l){_metroDetailId=null;renderMetroLinesTab();return;}
  if(_metroPatSel&&!l.patterns.includes(_metroPatSel))_metroPatSel=null;
  const patSeq=_metroPatSel?_metroPatSeq(l,_metroPatSel):null;
  if(_metroPatSel&&!patSeq)_metroPatSel=null;
  const rows=patSeq||l.stations.map(n=>({n,stop:true}));
  const stopRows=rows.filter(x=>!x.gap&&x.stop), passN=rows.filter(x=>!x.gap&&!x.stop).length;
  const patInfo=patSeq?`<div style="margin:10px 2px 0;font-size:12px;color:var(--text2)"><b style="color:var(--text1)">${_metroPatSel}</b> · ${stopRows[0].n} ↔ ${stopRows[stopRows.length-1].n} · 정차 <b>${stopRows.length}</b>역${passN?` · 통과 ${passN}역 <span style="color:var(--text3)">(음영)</span>`:''}</div>`:'';
  el.innerHTML=`
    <div style="padding:14px 0 24px">
      <button onclick="closeMetroLineDetail()" style="margin-bottom:12px;padding:7px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--sans)">← 노선 목록</button>
      <div class="metro-card" style="border-left:4px solid ${l.color};cursor:default">
        <div class="metro-head">
          <span class="metro-dot" style="background:${l.color}"></span>
          <span class="metro-name" style="font-size:17px">${l.name}</span>
          ${l.loop?'<span class="metro-badge">순환</span>':''}
          ${l.night?'<span class="metro-badge night">심야</span>':''}
          <span class="metro-count">${l.n}개역</span>
        </div>
        <div class="metro-route">${l.loop?`${l.from} 기점 순환`:`${l.from} ↔ ${l.to}`}</div>
        <div class="metro-info">
          <span>첫차 <b>${l.first}</b></span>
          <span>막차 <b>${l.last}</b></span>
          <span>${_metroHeadway(l)}</span>
        </div>
        ${l.patterns.length?`<div class="metro-pats" style="margin-top:8px">운행계통 <span class="metro-pat-chip${!_metroPatSel?' on':''}" onclick="setMetroPat(null)">전체</span>${l.patterns.map(p=>`<span class="metro-pat-chip${_metroPatSel===p?' on':''}" onclick="setMetroPat('${p.replace(/'/g,"\\'")}')">${p}</span>`).join('')}</div>`:''}
        ${patInfo}
        <div style="margin-top:10px">
          <button onclick="event.stopPropagation();showMetroOnMap('${l.id}')" style="padding:8px 14px;border-radius:10px;border:1px solid ${l.color};background:transparent;color:${l.color};font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--sans)">🗺️ 노선도에서 보기</button>
        </div>
      </div>
      <div class="mtl-tl" style="--mc:${l.color}">
        ${(()=>{const _xm=_metroXferMap(l);return rows.map((r,i)=>{
          if(r.gap)return `<div class="mtl-gap">지선 · 경유 구간</div>`;
          const isEnd=(i===0||i===rows.length-1)&&r.stop;
          const cls=r.stop?'':' pass';
          // 환승 노선 칩 (누르면 해당 노선 상세로) + 기차 환승 — 선로 공유 구간은 양끝만
          const xf=_xm[r.n]||[], hasTrain=_isTrainStn(r.n);
          const xferHTML=(xf.length||hasTrain)?`<span class="mtl-xfers">${
            xf.map(x=>`<span class="mtl-xfer" style="--xc:${x.color}" title="${x.name} 환승" onclick="event.stopPropagation();openMetroLine('${x.id}')"><i></i>${x.name}</span>`).join('')
          }${hasTrain?`<span class="mtl-xfer train" title="기차 환승">🚆</span>`:''}</span>`:'';
          return `<div class="mtl-row${cls}" onclick="openStationDetail('${r.n.replace(/'/g,"\\'")}')">
            <span class="mtl-dot${isEnd?' end':''}"></span>
            <span class="mtl-name${isEnd?' end':''}">${r.n}</span>
            ${isEnd?`<span class="mtl-endtag">${i===0?'기점':'종점'}</span>`:(!r.stop?`<span class="mtl-passtag">통과</span>`:'')}
            ${xferHTML}
          </div>`;
        }).join('');})()}
      </div>
    </div>`;
  window.scrollTo(0,0);
}
function setMetroRegion(r){_metroRegion=r;_metroDetailId=null;_metroPatSel=null;renderMetroLinesTab();}
function openMetroLineDetail(id){_metroDetailId=id;_metroPatSel=null;renderMetroLinesTab();}
function closeMetroLineDetail(){_metroDetailId=null;_metroPatSel=null;renderMetroLinesTab();}
function showMetroOnMap(id){
  const l=METRO_LINES.find(x=>x.id===id);
  if(l){_metroMapRegion=l.region;_metroMapId=id;}
  switchTab('map');
}
// 역 카드 전철 칩 → 전철 모드 노선 상세로
function openMetroLine(id){
  if(_appMode!=='metro') setAppMode('metro');
  const l=(typeof METRO_LINES!=='undefined')?METRO_LINES.find(x=>x.id===id):null;
  if(l)_metroRegion=l.region;
  _metroDetailId=id;
  switchTab('metrolines');
}

function siNearSearch(q){
  if(!q){const r=document.getElementById('si-near-search-results');if(r)r.innerHTML='';return;}
  if(typeof STATION_DB==='undefined')return;
  const res=Object.keys(STATION_DB).filter(n=>n.includes(q)).slice(0,8);
  const el=document.getElementById('si-near-search-results');
  if(!el)return;
  el.innerHTML=res.length?`<div style="display:flex;flex-wrap:wrap;gap:6px">${
    res.map(n=>`<button onclick="openStationDetail('${n}')"
      style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px;cursor:pointer;font-family:var(--sans)">${n}</button>`).join('')
  }</div>`:'<div style="color:var(--text3);font-size:12px;padding:4px">검색 결과 없음</div>';
}

// 모드별 역 집합 (기차: 열차 정차역 / 전철: 전철 노선 역)
let _trainStnSet=null,_metroStnSet=null;
function _modeStnSetsInit(){
  if(!_trainStnSet&&typeof ALL_TRAINS!=='undefined'){
    _trainStnSet=new Set();
    // 한 편이라도 실제 '정차'하는 역만 기차역으로 취급 — 통과만 하는 역은 제외
    ALL_TRAINS.forEach(t=>t.stops.forEach(s=>{if((hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s))_trainStnSet.add(s.s);}));
  }
  if(!_metroStnSet&&typeof METRO_LINES!=='undefined'){
    _metroStnSet=new Set();
    METRO_LINES.forEach(l=>(l.routes||[{stations:l.stations}]).forEach(r=>r.stations.forEach(n=>_metroStnSet.add(n))));
  }
}
// 모드 전환 + 같은 역 상세 열기 (전철↔기차 병행역 빠른 이동)
function switchModeStation(mode,name){
  setAppMode(mode);
  openStationDetail(name);
}
function _stnBaseName(n){return String(n).replace(/\s*\/.*$/,'').trim().replace(/역$/,'');}
function renderSINear(el){
  el.innerHTML=`<div style="margin-top:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:700;color:var(--text1)">가까운 ${_appMode==='metro'?'전철역':'기차역'} TOP 5</div>
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="requestNearLocation()" style="font-size:11px;font-weight:600;color:var(--accent);background:transparent;border:1px solid var(--accent);border-radius:14px;padding:4px 10px;cursor:pointer;font-family:var(--sans)">🔄 위치 다시 요청</button>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3);cursor:pointer">
          <input type="checkbox" id="si-near-closed" onchange="_siNearShowClosed=this.checked;renderSINearList()" ${_siNearShowClosed?'checked':''}>
          폐역 포함
        </label>
      </div>
    </div>
    <div id="si-near-list"><div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:20px;color:var(--text3);font-size:13px;text-align:center">위치 정보 가져오는 중...</div></div>
  </div>`;
  if(!navigator.geolocation){document.getElementById('si-near-list').innerHTML='<div style="color:var(--text3);font-size:12px;padding:12px;text-align:center">위치 서비스 미지원</div>';return;}
  if(_siNearAll.length>0){renderSINearList();return;}
  _fetchNearLocation();
}
// 위치 요청(최초/다시). 캐시 비우고 재요청 → 거절했던 경우 다시 권한 팝업 유도
function requestNearLocation(){
  _siNearAll=[]; _siNearLat=null; _siNearLon=null;
  const l=document.getElementById('si-near-list');
  if(l)l.innerHTML='<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:20px;color:var(--text3);font-size:13px;text-align:center">위치 정보 가져오는 중...</div>';
  _fetchNearLocation();
}
function _fetchNearLocation(){
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat,longitude:lon}=pos.coords;
    _siNearLat=lat; _siNearLon=lon;
    if(typeof getNearestStations==='undefined'){const l=document.getElementById('si-near-list');if(l)l.innerHTML='<div style="color:var(--red);font-size:12px;padding:12px">역 데이터 로드 안됨</div>';return;}
    _siNearAll=getNearestStations(lat,lon,50);
    renderSINearList();
  },err=>{
    const l=document.getElementById('si-near-list');
    const denied=err.code===1;
    if(l)l.innerHTML=`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:18px;text-align:center">
      <div style="color:var(--text2);font-size:13px;font-weight:600;margin-bottom:6px">${denied?'위치 권한이 거부되어 있습니다':'위치를 가져오지 못했습니다'}</div>
      <div style="color:var(--text3);font-size:11px;margin-bottom:12px">${denied?'실수로 거부하셨다면 아래 버튼으로 다시 요청하거나, 브라우저 주소창의 자물쇠(ⓘ) → 권한에서 위치를 허용해주세요.':err.message}</div>
      <button onclick="requestNearLocation()" style="font-size:12px;font-weight:700;color:#fff;background:var(--accent);border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-family:var(--sans)">📍 위치 권한 다시 요청</button>
    </div>`;
  },{timeout:8000,maximumAge:60000,enableHighAccuracy:false});
}

function renderSINearList(){
  const list=document.getElementById('si-near-list');
  if(!list)return;
  let filtered=_siNearShowClosed?_siNearAll:_siNearAll.filter(s=>s.lines&&s.lines.length>0);
  // 모드별 필터: 기차 모드=열차 정차역만, 전철 모드=전철 노선 역만
  _modeStnSetsInit();
  if(_appMode==='metro'&&_metroStnSet) filtered=filtered.filter(s=>_metroStnSet.has(_stnBaseName(s.name)));
  else if(_trainStnSet) filtered=filtered.filter(s=>_trainStnSet.has(_stnBaseName(s.name)));
  if(!filtered.length){list.innerHTML=`<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">주변에 운영 중인 ${_appMode==='metro'?'전철역':'기차역'} 없음</div>`;return;}
  const dotColors=['#3b82f6','#f97316','#a855f7','#22c55e','#ef4444'];
  const top5=filtered.slice(0,5);

  // ── Coordinate-based mini map ──
  let mapSVG='';
  if(_siNearLat!==null){
    const W=320,H=200;
    const allLats=[_siNearLat,...top5.map(s=>s.lat)];
    const allLons=[_siNearLon,...top5.map(s=>s.lon)];
    let minLat=Math.min(...allLats),maxLat=Math.max(...allLats);
    let minLon=Math.min(...allLons),maxLon=Math.max(...allLons);
    const rLat=maxLat-minLat||0.005,rLon=maxLon-minLon||0.005;
    const pad=0.28;
    minLat-=rLat*pad; maxLat+=rLat*pad;
    minLon-=rLon*pad; maxLon+=rLon*pad;
    const toX=lon=>((lon-minLon)/(maxLon-minLon))*W;
    const toY=lat=>((maxLat-lat)/(maxLat-minLat))*H;
    const myX=toX(_siNearLon),myY=toY(_siNearLat);
    const dots=top5.map((s,i)=>({x:toX(s.lon),y:toY(s.lat),c:dotColors[i],name:s.name,dist:s.dist}));
    const label=(d,ix)=>{
      // Avoid right-edge overflow and overlap with "나" label
      const lx=d.x>W*0.65?d.x-7:d.x+7;
      const anchor=d.x>W*0.65?'end':'start';
      const ly=d.y<18?d.y+16:d.y-7;
      const distStr=d.dist<1?(d.dist*1000).toFixed(0)+'m':d.dist.toFixed(1)+'km';
      return `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="5" fill="${d.c}"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="${d.c}" font-family="sans-serif" text-anchor="${anchor}">${d.name} (${distStr})</text>`;
    };
    const myLy=myY<22?myY+18:myY-10;
    mapSVG=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:10px">
      <svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block">
        ${dots.map((d,i)=>label(d,i)).join('')}
        <circle cx="${myX.toFixed(1)}" cy="${myY.toFixed(1)}" r="12" fill="#22c55e" opacity="0.18"/>
        <circle cx="${myX.toFixed(1)}" cy="${myY.toFixed(1)}" r="5" fill="#22c55e"/>
        <text x="${myX.toFixed(1)}" y="${myLy.toFixed(1)}" font-size="9" fill="#22c55e" font-family="sans-serif" text-anchor="middle" font-weight="bold">나</text>
        <text x="${(W-6).toFixed(0)}" y="${(H-6).toFixed(0)}" font-size="8" fill="rgba(180,180,180,0.4)" text-anchor="end" font-family="sans-serif">실제 좌표 기반</text>
      </svg>
    </div>`;
  }

  // ── Station list ──
  const stationList=filtered.slice(0,10).map((s,i)=>{
    const color=i<5?dotColors[i]:'var(--text2)';
    const distStr=s.dist<1?(s.dist*1000).toFixed(0)+'m':s.dist.toFixed(1)+'km';
    const mainLines=s.lines.slice(0,3).join('·');
    const extraLines=s.lines.length>3?` 외 ${s.lines.length-3}개 노선`:'';
    const pArr=s.platforms||[];
    const platStr=pArr.length>0?` · 홈 1~${Math.max(...pArr)}번`:'';
    const nameEsc=s.name.replace(/'/g,"\\'");
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;cursor:pointer"
      onclick="openStationDetail('${nameEsc}')">
      <div style="min-width:48px;font-size:14px;font-weight:700;color:${color};font-family:var(--mono)">${distStr}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700">${s.name}${s.lines.length===0?' <span style="font-size:10px;color:var(--text3)">(폐역)</span>':''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${mainLines}${extraLines}${platStr}</div>
      </div>
      <div style="font-size:18px;color:var(--text3)">›</div>
    </div>`;
  }).join('');

  list.innerHTML=mapSVG+stationList;
}

function openStationDetail(name){
  _siCurrent=name; _siSubTab='detail'; _siCardPlatform=null;
  switchTab('stationinfo');
  setTimeout(()=>renderStationInfo(),50);
}

function renderSIDetail(el){
  const curVal=(_siCurrent||'').replace(/"/g,'&quot;');
  el.innerHTML=`<div style="margin-top:12px">
    <div class="autocomplete-wrap" style="margin-bottom:12px">
      <input id="si-inp" type="text" placeholder="역 이름 검색 (초성 가능, 예: ㄷㄷㄱ)" value="${curVal}"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text1);font-size:14px;font-family:var(--sans);box-sizing:border-box"
        autocomplete="off"
        oninput="siSearch(this.value)"
        onblur="setTimeout(()=>{const r=document.getElementById('si-results');if(r){r.style.display='none';}},160)"
        onkeydown="siSearchKey(event)">
      <div id="si-results" class="ac-dropdown" style="display:none"></div>
    </div>
    <div id="si-card"></div></div>`;
  if(_siCurrent) renderSICard(_siCurrent);
}

function siSearch(q){
  const el=document.getElementById('si-results');
  if(!el)return;
  q=(q||'').trim();
  if(!q||typeof STATION_DB==='undefined'){el.style.display='none';el.innerHTML='';return;}
  const qBase=q.endsWith('역')?q.slice(0,-1):q;
  const all=Object.keys(STATION_DB).filter(n=>{
    const ns=n.endsWith('역')?n.slice(0,-1):n;
    return matchesQuery(n,q)||matchesQuery(ns,q)||matchesQuery(ns,qBase);
  });
  all.sort((a,b)=>{
    const aS=a.endsWith('역')?a.slice(0,-1):a;
    const bS=b.endsWith('역')?b.slice(0,-1):b;
    const aR=(aS===qBase||a===q)?0:aS.startsWith(qBase)?1:2;
    const bR=(bS===qBase||b===q)?0:bS.startsWith(qBase)?1:2;
    return aR!==bR?aR-bR:a.localeCompare(b,'ko');
  });
  const res=all.slice(0,12);
  if(!res.length){el.style.display='none';el.innerHTML='';return;}
  const isChoQ=q.split('').every(c=>CHO.includes(c));
  el.innerHTML=res.map(n=>{
    const nb=n.endsWith('역')?n.slice(0,-1):n;   // 검색 표시는 맨 이름(○○)
    let display=nb;
    if(!isChoQ){
      const i=nb.indexOf(qBase||q);
      if(i>=0){const L=(qBase||q).length;display=nb.slice(0,i)+`<span style="color:var(--accent)">${nb.slice(i,i+L)}</span>`+nb.slice(i+L);}
    }
    const nEsc=n.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `<div class="ac-item" onmousedown="event.preventDefault();siSelect('${nEsc}')">${display}</div>`;
  }).join('');
  el.className='ac-dropdown open';
  el.style.display='block';
}

function siSearchKey(e){
  const drop=document.getElementById('si-results');
  if(!drop||drop.style.display==='none')return;
  const items=drop.querySelectorAll('.ac-item');
  if(!items.length)return;
  let idx=-1;
  items.forEach((it,i)=>{if(it.classList.contains('active'))idx=i;});
  if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0);}
  else if(e.key==='Enter'){
    e.preventDefault();
    const t=items[Math.max(idx,0)];
    if(t)t.dispatchEvent(new MouseEvent('mousedown'));
    return;
  } else if(e.key==='Escape'){drop.style.display='none';return;}
  else return;
  items.forEach((it,i)=>it.classList.toggle('active',i===idx));
  if(items[idx])items[idx].scrollIntoView({block:'nearest'});
}

function siSelect(name){
  _siCurrent=name; _siCardPlatform=null;
  const inp=document.getElementById('si-inp');
  if(inp)inp.value=name.endsWith('역')?name.slice(0,-1):name;   // 검색창은 맨 이름(○○)
  const el=document.getElementById('si-results');
  if(el){el.style.display='none';el.innerHTML='';}
  renderSICard(name);
}

function _getPlatformInfo(stationName, platformNum){
  if(typeof PLATFORM_DB==='undefined')return null;
  const s=PLATFORM_DB[stationName];
  if(!s)return null;
  return s[String(platformNum)]||null;
}

function _gradeMatchesPlatform(trainGrade, platformGrades){
  if(!platformGrades||platformGrades.length===0)return true;
  for(const pg of platformGrades){
    if(pg==='KTX'&&(trainGrade==='KTX'||trainGrade==='KTX-산천'||trainGrade==='KTX-이음'))return true;
    if(pg==='SRT'&&trainGrade==='SRT')return true;
    if(pg==='ITX-새마을'&&trainGrade==='ITX-새마을')return true;
    if(pg==='ITX-청춘'&&trainGrade==='ITX-청춘')return true;
    if(pg==='ITX-마음'&&trainGrade==='ITX-마음')return true;
    if(pg==='무궁화호'&&(trainGrade==='무궁화호'||trainGrade==='무궁호화'))return true;
  }
  return false;
}

// ── 실사용 승강장 (게임 DB 기반, nimbi_realplat.js) ──
// trainName: 역 접미사 없는 역 이름 (REAL_PLAT 키). name: STATION_DB/PLATFORM_DB 키(역 포함).
function _realPlatform(trainNo, trainName){
  if(typeof REAL_PLAT==='undefined')return null;
  const m=REAL_PLAT[trainNo]; if(!m)return null;
  const v=m[trainName];
  return (v==null)?null:v;
}
// 실데이터가 없는 정차만 휴리스틱(등급·방면·트윈)으로 폴백
function _heuristicPlatform(name, trains, t){
  if(typeof PLATFORM_DB==='undefined'||!PLATFORM_DB[name])return null;
  const ps=Object.keys(PLATFORM_DB[name]).map(Number)
    .filter(p=>{const i=PLATFORM_DB[name][String(p)];return i&&(i.g.length>0||i.l.length>0);})
    .sort((a,b)=>a-b);
  for(const p of ps){
    if(_getFilteredTrainsForPlatform(name,trains,p).some(x=>x.no===t.no))return p;
  }
  return null;
}
// 열차가 이 역에서 실제 사용하는 승강장 (게임 DB 우선, 없으면 휴리스틱)
function _platformForTrain(name, trainName, trains, t){
  const r=_realPlatform(t.no, trainName);
  if(r!=null)return r;
  return _heuristicPlatform(name, trains, t);
}
// 이 역에 실제 정차(통과 제외)하는 열차 목록
function _stationStoppingTrains(trainName){
  return ALL_TRAINS.filter(t=>{
    const s=t.stops.find(x=>x.s===trainName);
    return s&&(hasTime(s.dep)||hasTime(s.arr))&&!isPassStop(t,trainName);
  });
}
// 조회역이 이 열차의 종착역인가 (당역종착)
function _isTerminusAt(t, trainName){
  if(t.dest===trainName) return true;
  const s=t.stops.find(x=>x.s===trainName);
  return !!(s&&hasTime(s.arr)&&!hasTime(s.dep));
}
// 역 좌표 (base 이름 → STATION_DB, 별칭 폴백 포함)
function _siStnCoord(base){
  return _stnCoord(base);
}
// 이 열차의 조회역 기준 직전/직후 정차역 (통과 제외)
function _adjStopOf(t, trainName){
  const stops=t.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s));
  const i=stops.findIndex(s=>s.s===trainName);
  return {prev:i>0?stops[i-1].s:null, next:(i>=0&&i<stops.length-1)?stops[i+1].s:null};
}
// 후보 역 중 현재역에서 가장 가까운 역 (실좌표) — 급행이 소역 통과해도 완행 기준 최근접역 선택
function _nearestStn(fromBase, cands){
  const arr=[...new Set(cands.filter(Boolean))];
  if(arr.length<=1) return arr[0]||null;
  const cur=_siStnCoord(fromBase);
  if(cur&&typeof haversineKm==='function'){
    arr.sort((a,b)=>{
      const ca=_siStnCoord(a), cb=_siStnCoord(b);
      const da=ca?haversineKm(cur.lat,cur.lon,ca.lat,ca.lon):9e9;
      const db=cb?haversineKm(cur.lat,cur.lon,cb.lat,cb.lon):9e9;
      return da-db;
    });
  }
  return arr[0];
}

function renderSICard(name){
  const el=document.getElementById('si-card');
  if(!el)return;
  // 지도 클릭은 '서울'(맨 이름), 검색은 '서울역'(DB 키) → DB 키로 정규화
  if(typeof STATION_DB!=='undefined' && !STATION_DB[name] && STATION_DB[name+'역']) name=name+'역';
  const d=typeof STATION_DB!=='undefined'?STATION_DB[name]:null;
  // ALL_TRAINS uses station names without 역 suffix (e.g. "영주"), STATION_DB uses "영주역"
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  // 통과 열차 제외 — 정차 열차만 (승강장 안내 요건)
  const trains=_stationStoppingTrains(trainName);
  // 실사용 승강장(게임 DB) 우선 — 실제 정차 열차들이 쓰는 홈 번호만 노출
  let platforms=[];
  {
    const set=new Set();
    trains.forEach(t=>{const p=_platformForTrain(name,trainName,trains,t);if(p!=null)set.add(p);});
    platforms=[...set].sort((a,b)=>a-b);
  }
  if(platforms.length===0&&d?.platforms?.length>0) platforms=d.platforms;
  // Reset selected platform if it was filtered out
  if(_siCardPlatform!==null&&!platforms.includes(_siCardPlatform)) _siCardPlatform=null;
  if(_siCardPlatform===null&&platforms.length>0) _siCardPlatform=platforms[0];
  const nameEsc=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  // 이 역을 지나는 전철 노선 (지선 포함)
  const metroLines=typeof METRO_LINES!=='undefined'
    ?METRO_LINES.filter(l=>(l.routes||[{stations:l.stations}]).some(r=>r.stations.includes(trainName)))
    :[];
  el.innerHTML=`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div style="font-size:22px;font-weight:700">${trainName}</div>
          <div style="font-size:11px;color:var(--text2);text-align:right">${_appMode==='metro'
            ?(metroLines.length?`${metroLines.length}개 노선`:'')
            :`${platforms.length>0?platforms.length+'개 홈<br>':''}${trains.length}편 경유`}</div>
        </div>
        ${d?`<div id="si-addr" data-lat="${d.lat}" data-lon="${d.lon}" style="font-size:11px;color:var(--text3);margin-top:4px">📍 ${d.addr||'주소 확인 중…'}</div>`:''}
        ${(()=>{ // 모드별 라벨: 기차 모드 = 열차 등급만 (편수·약호 없이), 전철 모드 = 전철 노선만
          if(_appMode==='metro'){
            if(!metroLines.length)return '';
            return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
              ${metroLines.map(l=>`<span onclick="openMetroLine('${l.id}')" style="cursor:pointer;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${l.color}1c;border:1px solid ${l.color};color:${l.color}">🚇 ${l.name}</span>`).join('')}
            </div>`;
          }
          const grades=[...new Set(trains.map(t=>t.grade))];
          if(!grades.length)return '';
          const ORD=['KTX','SRT','KTX-산천','KTX-이음','ITX-청춘','ITX-새마을','ITX-마음','무궁화호'];
          grades.sort((a,b)=>{
            const ia=ORD.indexOf(a), ib=ORD.indexOf(b);
            return (ia<0?99:ia)-(ib<0?99:ib);
          });
          return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
            ${grades.map(g=>{
              const c=GC_CSS_VAR[gc(g)]||'mgh';
              return `<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid var(--c-${c});color:var(--c-${c})">${g}</span>`;
            }).join('')}
          </div>`;
        })()}
      </div>
      ${_appMode!=='metro'?`<div style="padding:12px 16px 4px">
        <button class="si-board-btn" onclick="openStationBoard('${nameEsc}')">🚉 출발 안내 전광판 열기</button>
      </div>`:''}
      ${_appMode==='metro'?(()=>{ // 🚇 전철: 노선(route)별 전역/다음역 — 경유 노선·지선 분기 모두 표시
        if(typeof METRO_LINES==='undefined')return '';
        const rows=[];
        METRO_LINES.forEach(l=>{
          (l.routes||[{stations:l.stations}]).forEach(r=>{
            const i=r.stations.indexOf(trainName);
            if(i<0)return;
            const prev=i>0?r.stations[i-1]:null, next=i<r.stations.length-1?r.stations[i+1]:null;
            if(!prev&&!next)return;
            rows.push({l,dash:!!r.dash,prev,next});
          });
        });
        const seen=new Set(), uniq=[];
        rows.forEach(x=>{const k=x.l.id+'|'+(x.prev||'')+'|'+(x.next||'');if(!seen.has(k)){seen.add(k);uniq.push(x);}});
        if(!uniq.length)return '';
        const btn=(stn,arrow)=>stn
          ?`<button onclick="openStationDetail('${stn.replace(/'/g,"\\'")}')" style="flex:1;min-width:0;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:${arrow==='prev'?'left':'right'}">${arrow==='prev'?'← '+stn:stn+' →'}</button>`
          :`<span style="flex:1;min-width:0;padding:7px 10px;font-size:11px;color:var(--text3);text-align:${arrow==='prev'?'left':'right'}">${arrow==='prev'?'기점':'종점'}</span>`;
        return `<div style="padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px">🚇 전역 · 다음역</div>
          ${uniq.map(x=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="flex-shrink:0;display:inline-flex;align-items:center;gap:5px;width:86px;font-size:11px;font-weight:700;color:${x.l.color};overflow:hidden"><span style="width:8px;height:8px;border-radius:50%;background:${x.l.color};flex-shrink:0"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.l.name}${x.dash?' ·지선':''}</span></span>
            ${btn(x.prev,'prev')}${btn(x.next,'next')}
          </div>`).join('')}
        </div>`;
      })():''}
      ${_appMode==='metro'&&_isTrainStn(trainName)?`<div style="padding:12px 16px 4px">
        <button class="si-board-btn" onclick="switchModeStation('train','${nameEsc}')">🚆 기차 ${trainName}역으로 전환</button>
      </div>`:''}
      ${_appMode!=='metro'&&platforms.length>0?`
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px">🚉 홈 선택</div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">
          <div style="display:flex;gap:6px;min-width:max-content">
            ${platforms.map(p=>`
              <button id="si-ptab-${p}" onclick="selectSICardPlatform('${nameEsc}',${p})"
                style="padding:6px 16px;border-radius:20px;border:1px solid var(--border);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:var(--sans);transition:background .15s,color .15s;
                background:${_siCardPlatform===p?'var(--accent)':'var(--bg3)'};color:${_siCardPlatform===p?'#fff':'var(--text1)'}">
                ${p}
              </button>`).join('')}
          </div>
        </div>
      </div>`:''}
      ${_appMode!=='metro'?`<div id="si-platform-trains" style="padding:14px 16px">
        ${_siPlatformTrainsHTML(name, trains)}
      </div>`:''}
      ${_appMode!=='metro'&&metroLines.length?`<div style="padding:0 16px 12px">
        <button class="si-board-btn" onclick="switchModeStation('metro','${nameEsc}')">🚇 전철 ${trainName}역으로 전환</button>
      </div>`:''}
      ${d&&d.lat&&d.lon?`
      <div style="border-top:1px solid var(--border)">
        <button onclick="toggleStationMap()" style="width:100%;padding:11px 16px;background:transparent;border:none;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--sans);display:flex;align-items:center;justify-content:space-between">
          <span>🗺️ 역 주변 지도</span><span id="si-map-arrow">▼</span>
        </button>
        <div id="si-map-section" style="display:none;padding:0 16px 14px">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=${(d.lon-0.01).toFixed(5)},${(d.lat-0.008).toFixed(5)},${(d.lon+0.01).toFixed(5)},${(d.lat+0.008).toFixed(5)}&layer=mapnik&marker=${d.lat.toFixed(5)},${d.lon.toFixed(5)}"
            style="width:100%;height:220px;border:1px solid var(--border);border-radius:8px;display:block"
            loading="lazy" title="${name} 주변 지도"></iframe>
          <div style="display:flex;gap:8px;margin-top:8px">
            <a href="https://map.kakao.com/link/map/${encodeURIComponent(name)},${d.lat},${d.lon}" target="_blank" rel="noopener noreferrer"
              style="flex:1;display:block;text-align:center;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text1);text-decoration:none;font-weight:600">
              카카오지도 ↗
            </a>
            <a href="https://map.naver.com/?lng=${d.lon}&lat=${d.lat}&zoom=15" target="_blank" rel="noopener noreferrer"
              style="flex:1;display:block;text-align:center;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text1);text-decoration:none;font-weight:600">
              네이버지도 ↗
            </a>
          </div>
        </div>
      </div>`:''}
    </div>`;
  if(d) siLoadAddress(name, d.lat, d.lon);
}

// 좌표 → 주소 (사용자 브라우저에서 역지오코딩, localStorage 캐시, 실패 시 좌표 표시)
async function siLoadAddress(name, lat, lon){
  const box=document.getElementById('si-addr');
  if(!box) return;
  let cache={}; try{ cache=JSON.parse(localStorage.getItem('nimbi_addr')||'{}'); }catch(e){}
  if(cache[name]){ box.innerHTML='📍 '+cache[name]; return; }
  const coordStr=`${(+lon).toFixed(4)}°E, ${(+lat).toFixed(4)}°N`;
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ko&zoom=16&addressdetails=1`,{headers:{Accept:'application/json'}});
    const j=await r.json(); const a=j.address||{};
    const parts=[a.state||a.province, a.city||a.county||a.town||a.village, a.borough||a.city_district, a.suburb||a.neighbourhood||a.quarter, a.road].filter(Boolean);
    const seen=new Set(); const addr=parts.filter(p=>!seen.has(p)&&seen.add(p)).slice(0,4).join(' ');
    if(addr){ cache[name]=addr; try{ localStorage.setItem('nimbi_addr',JSON.stringify(cache)); }catch(e){} }
    const cur=document.getElementById('si-addr');
    if(cur && String(cur.dataset.lat)===String(lat)) cur.innerHTML='📍 '+(addr||coordStr);
  }catch(e){
    const cur=document.getElementById('si-addr');
    if(cur && String(cur.dataset.lat)===String(lat)) cur.innerHTML='📍 '+coordStr;
  }
}

function toggleStationMap(){
  const sec=document.getElementById('si-map-section');
  const arr=document.getElementById('si-map-arrow');
  if(!sec)return;
  const open=sec.style.display==='none'||sec.style.display==='';
  sec.style.display=open?'block':'none';
  if(arr)arr.textContent=open?'▲':'▼';
}


function selectSICardPlatform(name, p){
  _siCardPlatform=p;
  document.querySelectorAll('[id^="si-ptab-"]').forEach(b=>{
    const bp=parseInt(b.id.replace('si-ptab-',''));
    b.style.background=bp===p?'var(--accent)':'var(--bg3)';
    b.style.color=bp===p?'#fff':'var(--text1)';
  });
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const trains=_stationStoppingTrains(trainName);
  const el=document.getElementById('si-platform-trains');
  if(el) el.innerHTML=_siPlatformTrainsHTML(name, trains);
}

function toggleSITerm(name){
  _siHideTerm=!_siHideTerm;
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const trains=_stationStoppingTrains(trainName);
  const el=document.getElementById('si-platform-trains');
  if(el) el.innerHTML=_siPlatformTrainsHTML(name, trains);
}

function toggleSIUpcoming(name){
  _siUpcomingOnly=!_siUpcomingOnly;
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const trains=_stationStoppingTrains(trainName);
  const el=document.getElementById('si-platform-trains');
  if(el) el.innerHTML=_siPlatformTrainsHTML(name, trains);
}

function searchStation(name){
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  document.getElementById('input-station').value=trainName;
  switchTab('station');
  searchByStation();
}

function _trainMatchesPlatformRoute(train, stationName, pInfo){
  if(!pInfo.l||pInfo.l.length===0)return true;
  const stnBase=stationName.endsWith('역')?stationName.slice(0,-1):stationName;
  const gradeWords=['ITX-새마을','ITX새마을','ITX-청춘','ITX청춘','ITX-마음','ITX마음','무궁화호','무궁화','KTX','SRT'];
  const serviceCities=new Set();
  const uniqueLines=[...new Set(pInfo.l.map(l=>l.replace(/\/\S+$/,'').trim()))];
  for(const svc of uniqueLines){
    let s=svc.replace(/\([^)]*\)/g,'').trim();
    for(const g of gradeWords) s=s.replace(new RegExp(g,'g'),'').trim();
    s=s.replace(/[가-힣]+선\s*/g,'').trim();
    s.split('-').map(c=>c.trim()).filter(c=>c&&c!==stnBase&&c!==stationName)
      .forEach(c=>serviceCities.add(c));
  }
  if(serviceCities.size===0)return true;
  const dest=train.dest.endsWith('역')?train.dest.slice(0,-1):train.dest;
  if(serviceCities.has(train.dest)||serviceCities.has(dest))return true;
  const origin=train.stops?.[0]?.s;
  if(origin){
    const originBase=origin.endsWith('역')?origin.slice(0,-1):origin;
    if(serviceCities.has(origin)||serviceCities.has(originBase))return true;
  }
  return false;
}

// Returns direction ('down'|'up'|null) for a platform based on identical-service twins
function _getDirectionForPlatform(stationName, platformNum){
  if(typeof PLATFORM_DB==='undefined'||!PLATFORM_DB[stationName])return null;
  const db=PLATFORM_DB[stationName];
  const myInfo=db[String(platformNum)];
  if(!myInfo||!myInfo.l||myInfo.l.length===0)return null;
  const norm=l=>l.replace(/\/\S+$/,'').trim();
  const myKey=[...new Set(myInfo.l.map(norm))].sort().join('|');
  // Find platforms with identical (normalized) service lists → direction twins
  const twins=Object.keys(db).map(Number).filter(p=>{
    if(p===platformNum)return false;
    const info=db[String(p)];
    if(!info||!info.l||info.l.length===0)return false;
    return [...new Set(info.l.map(norm))].sort().join('|')===myKey;
  });
  if(twins.length===0)return null;
  const group=[platformNum,...twins].sort((a,b)=>a-b);
  const idx=group.indexOf(platformNum);
  // Lower half → 하행(down), upper half → 상행(up)
  return idx<Math.ceil(group.length/2)?'down':'up';
}

// Full platform train filter: grade + route + direction (terminus trains exempt from direction)
function _getFilteredTrainsForPlatform(name, allTrains, platformNum){
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const pInfo=_getPlatformInfo(name,platformNum);
  if(!pInfo)return allTrains;
  let filtered=allTrains.filter(t=>
    _gradeMatchesPlatform(t.grade,pInfo.g)&&
    _trainMatchesPlatformRoute(t,name,pInfo)
  );
  const dirFilter=_getDirectionForPlatform(name,platformNum);
  if(dirFilter!==null){
    filtered=filtered.filter(t=>{
      const stop=t.stops.find(s=>s.s===trainName);
      const isTerminus=stop&&stop.arr&&!stop.dep; // arrives but does not depart = 당역종착
      return isTerminus||t.dir===dirFilter;
    });
  }
  return filtered;
}

function _extractDestinations(lines, stationName, direction=null){
  const stnBase=stationName.endsWith('역')?stationName.slice(0,-1):stationName;
  const gradeWords=['ITX-새마을','ITX새마을','ITX-청춘','ITX청춘','ITX-마음','ITX마음','무궁화호','무궁화','KTX','SRT'];
  const citySet=new Set();
  const deduped=[...new Set(lines.map(l=>l.replace(/\/\S+$/,'').trim()))];
  for(const line of deduped){
    let s=line.replace(/\([^)]*\)/g,'').trim();
    for(const g of gradeWords) s=s.replace(new RegExp(g,'g'),'').trim();
    s=s.replace(/[가-힣]+선\s*/g,'').trim();
    if(!s.includes('-'))continue;
    const cities=s.split('-').map(c=>c.trim()).filter(c=>c&&c!==stnBase&&c!==stationName);
    if(!cities.length)continue;
    if(direction==='down') citySet.add(cities[cities.length-1]); // toward last city = downbound endpoint
    else if(direction==='up') citySet.add(cities[0]);            // toward first city = upbound endpoint
    else cities.forEach(c=>citySet.add(c));
  }
  return [...citySet].slice(0,direction?3:5);
}

function _siPlatformTrainsHTML(name, trains){
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const nameEsc=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  // 선택 홈에 실제 배정된 열차 (게임 DB 기준, 없으면 휴리스틱 폴백)
  const platTrains=_siCardPlatform!==null
    ?trains.filter(t=>_platformForTrain(name,trainName,trains,t)===_siCardPlatform)
    :[...trains];
  // 당역종착 제외 필터 (#4)
  let filtered=_siHideTerm?platTrains.filter(t=>!_isTerminusAt(t,trainName)):platTrains;
  // 이후 열차만 필터 — 운행일(04:00~익일 03:59) 기준. 23:30에 0:40 열차는 '이후'로 취급
  let svcEnded=false, firstNext=null;
  if(_siUpcomingOnly){
    const nowD=new Date();
    const nowSrv=_srvMin(nowD.getHours()*60+nowD.getMinutes());
    const upcoming=filtered.filter(t=>{
      const s=t.stops.find(x=>x.s===trainName);
      const m=toMin(s?.dep||s?.arr);
      return m!==null && _srvMin(m)>=nowSrv;
    });
    if(upcoming.length===0 && filtered.length>0){
      svcEnded=true;
      // 익일(다음 운행일) 첫차 안내용
      const byStart=[...filtered].sort((a,b)=>{
        const sa=a.stops.find(x=>x.s===trainName), sb=b.stops.find(x=>x.s===trainName);
        return _srvMin(toMin(sa?.dep||sa?.arr)||0)-_srvMin(toMin(sb?.dep||sb?.arr)||0);
      });
      const fs=byStart[0]?.stops.find(x=>x.s===trainName);
      firstNext=fs?(fs.dep||fs.arr):null;
    }
    filtered=upcoming;
  }
  const sorted=[...filtered].sort((a,b)=>{
    const sa=a.stops.find(x=>x.s===trainName), sb=b.stops.find(x=>x.s===trainName);
    const ka=toMin(sa?.dep||sa?.arr), kb=toMin(sb?.dep||sb?.arr);
    // 이후 열차만 모드에서는 운행일 순서(04시 기준)로 정렬해 자정 넘는 열차가 뒤에 오도록
    if(_siUpcomingOnly) return (ka===null?9999:_srvMin(ka))-(kb===null?9999:_srvMin(kb));
    return (ka||9999)-(kb||9999);
  });
  // 방면·방향은 실제 배정된 열차에서 도출
  const fdirs=new Set(sorted.map(t=>t.dir));
  const dirLabel=(_siCardPlatform!==null&&fdirs.size===1)?(sorted[0].dir==='down'?'하행↓':'상행↑'):'';
  const dests=_siCardPlatform!==null?[...new Set(sorted.filter(t=>!_isTerminusAt(t,trainName)).map(t=>t.dest))].slice(0,3):[];
  const destsStr=dests.length>0?dests.join(' • ')+' 방면':'';
  // 이전/다음역 이동 (#5) — 홈 열차들의 직전/직후 정차역 중 최근접역
  const nextC=[], prevC=[];
  platTrains.forEach(t=>{const a=_adjStopOf(t,trainName); if(a.next)nextC.push(a.next); if(a.prev)prevC.push(a.prev);});
  const prevStn=_nearestStn(trainName,prevC), nextStn=_nearestStn(trainName,nextC);
  const navBtn=(stn,arrow)=>`<button onclick="openStationDetail('${stn.replace(/'/g,"\\'")}')" style="flex:1;min-width:0;padding:8px 10px;border-radius:9px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${arrow==='prev'?'← '+stn:stn+' →'}</button>`;
  const navHtml=(prevStn||nextStn)?`<div style="display:flex;gap:8px;margin-bottom:10px">${prevStn?navBtn(prevStn,'prev'):''}${nextStn?navBtn(nextStn,'next'):''}</div>`:'';
  const termOn=_siHideTerm, upcOn=_siUpcomingOnly;
  const chip=(on,label,fn)=>`<button onclick="${fn}('${nameEsc}')" style="padding:4px 10px;border-radius:14px;border:1px solid ${on?'var(--accent)':'var(--border)'};background:${on?'var(--accent)':'var(--bg3)'};color:${on?'#fff':'var(--text2)'};font-size:11px;font-weight:600;cursor:pointer;font-family:var(--sans);white-space:nowrap">${label}</button>`;
  const endedHtml=svcEnded
    ?`<div style="text-align:center;padding:18px 12px;color:var(--text2);font-size:13px;line-height:1.7">
        🌙 <b>금일 운행이 종료되었습니다</b><br>
        <span style="font-size:11.5px;color:var(--text3)">운행일 기준 04:00~익일 03:59${firstNext?` · 익일 첫차 <b style="color:var(--accent);font-family:var(--mono)">${firstNext}</b>`:''}</span>
      </div>`:'';
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:${_siCardPlatform?'6':'10'}px;flex-wrap:wrap">
      <div style="font-size:12px;font-weight:700;color:var(--text2);flex:1;min-width:120px">🚆 ${_siCardPlatform?`${_siCardPlatform}번 홈${dirLabel?' ('+dirLabel+')':''} 시간표`:'역 시간표'}</div>
      ${chip(upcOn,'이후 열차만','toggleSIUpcoming')}
      ${chip(termOn,'당역종착 제외','toggleSITerm')}
    </div>
    ${destsStr?`<div style="font-size:10px;color:var(--accent2);margin-bottom:8px">📍 ${destsStr}</div>`:''}
    ${navHtml}
    ${endedHtml}
    ${sorted.length===0&&!svcEnded?'<div style="color:var(--text3);font-size:13px;text-align:center;padding:12px">운행 열차 없음</div>':''}
    ${(()=>{
      const trainRow=t=>{
        const s=t.stops.find(x=>x.s===trainName);
        const time=s?.dep||s?.arr||'-';
        const dir=t.dir==='down'?'하행↓':'상행↑';
        const dirC=t.dir==='down'?'var(--accent)':'var(--red)';
        const isTerm=_isTerminusAt(t,trainName);
        const destHtml=isTerm
          ?`<span style="color:var(--accent2)">당역종착</span>`
          :`${t.dest}행`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)22">
          <div style="font-size:15px;font-weight:700;font-family:var(--mono);min-width:46px">${time}</div>
          <div style="min-width:50px">
            <div style="font-size:12px;font-weight:700;color:var(--c-${gcCssVar(t.grade)})">${t.grade}</div>
            <div style="font-size:10px;color:var(--text3);font-family:var(--mono)">${t.no}</div>
          </div>
          <div style="flex:1;font-size:13px;font-weight:600">${destHtml}</div>
          <div style="font-size:11px;font-weight:700;color:${dirC}">${dir}</div>
        </div>`;
      };
      const shown=sorted.slice(0,20);
      const rest=sorted.slice(20);
      return shown.map(trainRow).join('')+
        (rest.length>0?`<div id="si-train-extra" style="display:none">${rest.map(trainRow).join('')}</div>
        <div onclick="document.getElementById('si-train-extra').style.display='block';this.style.display='none'"
          style="font-size:12px;color:var(--accent);text-align:center;padding:8px 0;cursor:pointer;border:1px dashed var(--border);border-radius:8px;margin-top:4px;font-weight:600">
          +${rest.length}편 더 보기 ▼
        </div>`:'');
    })()}
    <button onclick="searchStation('${nameEsc}')" style="width:100%;margin-top:10px;padding:9px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:12px;cursor:pointer;font-family:var(--sans);font-weight:600">전체 시간표 보기 →</button>
  `;
}

// ── 역 전광판 (출발 안내 LED) ──
function _siDepartureBoardHTML(name, trains, limit){
  limit=limit||6;
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  const clock=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  // 열차별 승강장 매핑 (게임 DB 우선, 없으면 휴리스틱)
  const platOf={};
  trains.forEach(t=>{ const p=_platformForTrain(name, trainName, trains, t); if(p!=null) platOf[t.no]=p; });
  // 지금 이후 출발 열차 추출
  const rows=trains.map(t=>{
    const s=t.stops.find(x=>x.s===trainName);
    if(!s) return null;
    const depStr=s.dep||s.arr; if(!depStr) return null;
    const m=toMin(depStr); if(m===null) return null;
    let diff=m-nowMin; if(diff< -180) diff+=1440; // 자정 넘긴 새벽 열차 보정
    return {t,depStr,m,diff};
  }).filter(Boolean)
    .filter(r=>r.diff>=-2)
    .sort((a,b)=>a.diff-b.diff)
    .slice(0,limit);

  const rowsHtml = rows.length ? rows.map(r=>{
    const t=r.t;
    const plat=platOf[t.no];
    let st, cls;
    if(r.diff<=0){ st='출발'; cls='sb-st-board'; }
    else if(r.diff<=5){ st=`${r.diff}분 후`; cls='sb-st-soon'; }
    else { st='정시'; cls='sb-st-sched'; }
    const isTerm = t.dest===trainName || (()=>{const s=t.stops.find(x=>x.s===trainName);return s&&s.arr&&!s.dep;})();
    return `<div class="stn-board-row">
      <span class="sb-time">${r.depStr}</span>
      <span class="sb-info">
        <span class="sb-dest">${isTerm?'당역종착':t.dest+'행'}</span>
        <span class="sb-train">${t.grade} ${t.no}</span>
      </span>
      <span class="sb-plat ${plat?'':'none'}">${plat||'–'}</span>
      <span class="sb-status ${cls}">${st}</span>
    </div>`;
  }).join('') : `<div class="stn-board-empty">현재 출발 예정 열차 없음</div>`;

  return `<div class="stn-board">
    <div class="stn-board-head">
      <span class="stn-board-title">▶ 출발 안내 · DEPARTURES</span>
      <span class="stn-board-clock">${clock}</span>
    </div>
    <div class="stn-board-cols"><span style="width:52px">시각</span><span style="flex:1">방면 · 열차</span><span style="width:30px;text-align:center">홈</span><span style="width:56px;text-align:right">안내</span></div>
    ${rowsHtml}
  </div>`;
}

// ── 출발 안내 전광판 팝업 (QR처럼 별도 창) ──
function openStationBoard(name){
  if(typeof STATION_DB!=='undefined'&&!STATION_DB[name]&&STATION_DB[name+'역']) name=name+'역';
  const trainName=name.endsWith('역')?name.slice(0,-1):name;
  const old=document.getElementById('si-board-wrap'); if(old)old.remove();
  const trains=_stationStoppingTrains(trainName);
  const wrap=document.createElement('div');
  wrap.id='si-board-wrap';
  wrap.innerHTML=`
    <div class="rail-ticket-backdrop" onclick="closeStationBoard()"></div>
    <div class="si-board-popup" role="dialog" aria-label="${trainName}역 출발 안내">
      <div class="si-board-popup-head">
        <span>🚉 ${trainName} · 출발 안내</span>
        <button class="si-board-close" onclick="closeStationBoard()" aria-label="닫기">✕</button>
      </div>
      <div id="si-board-live"></div>
    </div>`;
  document.body.appendChild(wrap);
  const draw=()=>{const el=document.getElementById('si-board-live'); if(el)el.innerHTML=_siDepartureBoardHTML(name,trains,10);};
  draw();
  if(_siBoardTimer)clearInterval(_siBoardTimer);
  _siBoardTimer=setInterval(draw,20000);
}
function closeStationBoard(){
  const el=document.getElementById('si-board-wrap'); if(el)el.remove();
  if(_siBoardTimer){clearInterval(_siBoardTimer);_siBoardTimer=null;}
}

function renderSIDelay(el){
  const model=[
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
  el.innerHTML=`<div style="margin-top:12px">
    <div style="background:var(--bg3);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.6">
      📊 Mysterious Enterprise 운행 기록 기반 · 지방 단선은 열차 수가 적어 지연↓
    </div>
    ${model.map(d=>{
      const lv=d.prob<25?'low':d.prob<40?'med':'high';
      const lc=lv==='low'?'var(--green)':lv==='med'?'var(--orange)':'var(--red)';
      const lt=lv==='low'?'낮음':lv==='med'?'보통':'높음';
      return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:${d.c}">${d.name}</div>
          <div style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;background:${lc}22;color:${lc};border:1px solid ${lc}44">${lt}</div>
        </div>
        <div style="background:var(--bg3);border-radius:6px;height:6px;overflow:hidden;margin-bottom:6px">
          <div style="width:${d.prob}%;height:100%;border-radius:6px;background:${lc}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
          <span>지연 확률 ${d.prob}%</span><span>예상 ${d.min}~${d.max}분</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── 이용 모드(기차/전철) 초기 반영 ──
try{
  _applyModeTabs();
  if(_appMode==='metro') switchTab('metrolines');
}catch(e){}

// ══════════════════════════════════════════
// 🛰️ 관제 모드 — 전 노선 결합 지도
// ══════════════════════════════════════════
let _allMapLineCache=null;
function _allAsMapLine(){
  if(_allMapLineCache)return _allMapLineCache;
  const routes=[];
  for(const ml of Object.values(MAP_LINES)) for(const r of ml.routes) routes.push(r);
  return _allMapLineCache={name:'전국 관제',color:'#8b949e',routes};
}

// ── 공용: 주요역 목록(정차 편수 상위) ──
let _majorStnsCache=null;
function _majorStations(n){
  if(!_majorStnsCache){
    const c={};
    ALL_TRAINS.forEach(t=>t.stops.forEach(s=>{if(hasTime(s.arr)||hasTime(s.dep))c[s.s]=(c[s.s]||0)+1;}));
    _majorStnsCache=Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  }
  return _majorStnsCache.slice(0,n||24);
}
// 역의 다음 출발 목록 (가까운 순, count개)
function _nextDeps(stn,count){
  const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
  const rows=[];
  ALL_TRAINS.forEach(t=>{
    const s=t.stops.find(x=>x.s===stn);
    if(!s||!hasTime(s.dep)||isPassStop(t,stn))return;
    const m=toMin(s.dep); if(m===null)return;
    let d=(m-nowM+1440)%1440; if(d>420)return; // 7시간 이내만
    rows.push({d,m,t,dep:s.dep});
  });
  rows.sort((a,b)=>a.d-b.d);
  return rows.slice(0,count||6);
}

// ══════════════════════════════════════════
// 🖥️ 터미널 뷰 — 주요역 4곳 발차 보드 동시 관전
// ══════════════════════════════════════════
// ── 공용 역 검색바 (기존 검색바 디자인·초성 검색 통일 — 앞으로 모든 역 검색은 이 컴포넌트 사용) ──
function stnSearchBoxHTML(id,value,pickFn,ph){
  return `<div class="autocomplete-wrap" style="min-width:0">
    <input type="text" id="${id}" class="term-sel" style="margin-bottom:0" value="${value||''}" placeholder="${ph||'역 이름 (초성 가능)'}" autocomplete="off"
      oninput="_stnAcShow('${id}','${pickFn}')" onfocus="this.select();_stnAcShow('${id}','${pickFn}')"
      onblur="setTimeout(()=>{const d=document.getElementById('${id}-ac');if(d)d.style.display='none';},150)">
    <div class="ac-dropdown" id="${id}-ac"></div>
  </div>`;
}
function _stnAcShow(id,pickFn){
  _majorStations(1); // 역 캐시 준비
  const inp=document.getElementById(id); if(!inp)return;
  const q=inp.value.trim();
  const el=document.getElementById(id+'-ac'); if(!el)return;
  const list=(q?_majorStnsCache.filter(n=>matchesQuery(n,q)):_majorStnsCache.slice(0,10)).slice(0,10);
  const idEsc=id.replace(/'/g,"\\'");
  el.innerHTML=list.map(n=>{
    const nEsc=n.replace(/'/g,"\\'");
    return `<div class="ac-item" onmousedown="event.preventDefault();document.getElementById('${idEsc}').value='${nEsc}';document.getElementById('${idEsc}-ac').style.display='none';window['${pickFn}']('${nEsc}','${idEsc}')">${n}</div>`;
  }).join('');
  el.className='ac-dropdown open';
  el.style.display=list.length?'block':'none';
}
let _termStns=null;
function _termPickStn(name,id){
  const i=+id.split('-').pop();
  if(Number.isFinite(i)){ _termStns[i]=name; _termFill(i); }
}
function renderTerminalView(){
  const el=document.getElementById('result-terminal'); if(!el)return;
  _majorStations(1);
  if(!_termStns){ const m=_majorStations(30); _termStns=['서울','대전','남대구','부산'].filter(s=>m.includes(s)); while(_termStns.length<4)_termStns.push(m[_termStns.length]); }
  el.innerHTML=`
    <div style="padding:14px 16px 24px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">주요역 발차 보드 · 30초마다 자동 갱신 · 역 이름을 직접 검색해 어느 역이든 볼 수 있습니다</div>
      <div class="term-grid">
        ${[0,1,2,3].map(i=>`
        <div class="term-board" id="term-b${i}">
          ${stnSearchBoxHTML('term-inp-'+i,_termStns[i],'_termPickStn')}
          <div class="term-rows" id="term-rows-${i}"></div>
        </div>`).join('')}
      </div>
    </div>`;
  [0,1,2,3].forEach(_termFill);
  clearInterval(window._termT);
  window._termT=setInterval(()=>{
    if(!document.getElementById('result-terminal')){clearInterval(window._termT);return;}
    [0,1,2,3].forEach(_termFill);
  },30000);
}
function _termFill(i){
  const box=document.getElementById('term-rows-'+i); if(!box)return;
  const rows=_nextDeps(_termStns[i],6);
  box.innerHTML=rows.length?rows.map(r=>`
    <div class="term-row" onclick="jumpToTrain('${r.t.no}')">
      <span class="term-time">${r.dep}</span>
      <span class="term-grade" style="color:var(--c-${gcCssVar(r.t.grade)})">${r.t.grade}</span>
      <span class="term-no">${r.t.no}</span>
      <span class="term-dest">${r.t.dest}행</span>
      <span class="term-eta">${r.d===0?'출발':r.d+'분'}</span>
    </div>`).join('')
    :'<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">7시간 내 출발 없음</div>';
}

// ══════════════════════════════════════════
// 🌄 당일치기 추천 — 지금 출발해서 다녀올 코스
// ══════════════════════════════════════════
let _dtpOrigin='서울';
function _dtpPickStn(name){
  _dtpOrigin=name; renderDaytrip();
}
function renderDaytrip(){
  const el=document.getElementById('result-daytrip'); if(!el)return;
  _majorStations(1);
  if(!_majorStnsCache.includes(_dtpOrigin))_dtpOrigin=_majorStnsCache[0];
  el.innerHTML=`
    <div style="padding:14px 16px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:700">출발역</span>
        <div style="width:150px">${stnSearchBoxHTML('dtp-inp',_dtpOrigin,'_dtpPickStn')}</div>
        <span style="font-size:11.5px;color:var(--text3)">지금 이후 출발 · 직통 왕복 기준</span>
      </div>
      <div id="dtp-list">${_daytripHTML(_dtpOrigin)}</div>
    </div>`;
}
function _daytripHTML(origin){
  const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
  const out={};
  ALL_TRAINS.forEach(t=>{
    const i=t.stops.findIndex(s=>s.s===origin);
    if(i<0)return; const so=t.stops[i];
    if(!hasTime(so.dep)||isPassStop(t,origin))return;
    const dm=toMin(so.dep); let d=(dm-nowM+1440)%1440;
    if(d<20||d>240)return;
    for(let j=i+1;j<t.stops.length;j++){
      const s=t.stops[j];
      if(!(hasTime(s.arr)||hasTime(s.dep))||isPassStop(t,s.s))continue;
      const am=toMin(s.arr||s.dep); if(am===null)continue;
      const arrAbs=nowM+d+(((am-dm)+1440)%1440);
      const cur=out[s.s];
      if(!cur||arrAbs<cur.arrAbs)out[s.s]={t,dep:so.dep,arr:s.arr||s.dep,arrAbs,stn:s.s};
    }
  });
  const cards=[];
  for(const [dest,o] of Object.entries(out)){
    if(dest===origin)continue;
    let best=null;
    ALL_TRAINS.forEach(t=>{
      const i=t.stops.findIndex(s=>s.s===dest);
      if(i<0)return; const sd=t.stops[i];
      if(!hasTime(sd.dep)||isPassStop(t,dest))return;
      const j=t.stops.findIndex((s,k)=>k>i&&s.s===origin);
      if(j<0)return; const sa=t.stops[j];
      if(!(hasTime(sa.arr)||hasTime(sa.dep)))return;
      const dm=toMin(sd.dep); let dAbs=nowM+(((dm-nowM)+1440)%1440);
      if(dAbs-o.arrAbs<60)return;
      if(dAbs-nowM>1200)return;
      if(!best||dAbs>best.dAbs)best={t,dep:sd.dep,arr:sa.arr||sa.dep,dAbs};
    });
    if(!best)continue;
    const stay=best.dAbs-o.arrAbs;
    cards.push({dest,o,ret:best,stay});
  }
  cards.sort((a,b)=>b.stay-a.stay);
  const top=cards.slice(0,8);
  if(!top.length)return '<div class="empty"><div class="empty-icon">🌙</div><p>지금 출발해 다녀올 수 있는 직통 왕복 코스가 없습니다.<br>내일 아침 다시 확인해보세요.</p></div>';
  const fmtStay=m=>`${Math.floor(m/60)}시간 ${String(m%60).padStart(2,'0')}분`;
  return top.map(c=>`
    <div class="dtp-card">
      <div class="dtp-head">
        <span class="dtp-dest">${c.dest}</span>
        <span class="dtp-stay">체류 ${fmtStay(c.stay)}</span>
      </div>
      <div class="dtp-leg" onclick="jumpToTrain('${c.o.t.no}')">
        <span class="dtp-tag go">가는편</span>
        <span style="color:var(--c-${gcCssVar(c.o.t.grade)});font-weight:700">${c.o.t.grade}</span>
        <span class="mono-sm">${c.o.t.no}</span>
        <span class="mono-sm">${c.o.dep} → ${c.o.arr}</span>
      </div>
      <div class="dtp-leg" onclick="jumpToTrain('${c.ret.t.no}')">
        <span class="dtp-tag back">오는편</span>
        <span style="color:var(--c-${gcCssVar(c.ret.t.grade)});font-weight:700">${c.ret.t.grade}</span>
        <span class="mono-sm">${c.ret.t.no}</span>
        <span class="mono-sm">${c.ret.dep} → ${c.ret.arr}</span>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════
// 🧩 루트 퍼즐 — 경로 순서 맞추기 (무제한 출제)
// ══════════════════════════════════════════
let _puzState=null;
function _puzSolvedCount(){
  const today=todayLocalStr(new Date());
  let saved=null; try{saved=JSON.parse(localStorage.getItem('nimbi_puzzle'));}catch(e){}
  return (saved&&saved.date===today&&saved.solved)||0;
}
function _puzNew(){
  const cands=ALL_TRAINS.filter(t=>t.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s)).length>=8);
  const t=cands[Math.floor(Math.random()*cands.length)];
  const stops=t.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s)).map(s=>s.s);
  const N=6, pick=[0];
  for(let k=1;k<N-1;k++)pick.push(Math.round(k*(stops.length-1)/(N-1)));
  pick.push(stops.length-1);
  const answer=[...new Set(pick)].map(i=>stops[i]);
  const shuffled=[...answer];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  _puzState={train:t.no,grade:t.grade,dest:t.dest,answer,shuffled,sel:[],solved:false,tries:0};
  _puzDraw();
}
function renderRoutePuzzle(){
  const el=document.getElementById('result-puzzle'); if(!el)return;
  _puzNew();
}
function _puzDraw(){
  const el=document.getElementById('result-puzzle'); if(!el)return;
  const p=_puzState;
  const slots=p.answer.map((_,i)=>`<span class="puz-slot${p.sel[i]?' fill':''}">${p.sel[i]||(i+1)}</span>`).join('<span class="puz-arrow">→</span>');
  const chips=p.shuffled.map(s=>{
    const used=p.sel.includes(s);
    return `<button class="puz-chip${used?' used':''}" ${used?'disabled':''} onclick="_puzPick('${s.replace(/'/g,"\\'")}')">${s}</button>`;
  }).join('');
  const solvedN=_puzSolvedCount();
  el.innerHTML=`
    <div style="padding:14px 16px 24px">
      <div class="puz-card">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">오늘 ${solvedN}문제 해결 · 이번 문제 시도 ${p.tries}회</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:10px">🚆 ${p.grade} <span class="mono-sm">${p.train}</span> (${p.dest}행) 열차가 지나는 역을 <span style="color:var(--accent)">운행 순서대로</span> 눌러보세요</div>
        <div class="puz-slots">${slots}</div>
        <div class="puz-chips">${chips}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn" style="flex:1" onclick="_puzNew()">🎲 다음 문제</button>
          <button class="btn" style="flex:1" onclick="_puzState.sel=[];_puzDraw()">↺ 다시 배열</button>
          ${p.sel.length===p.answer.length?`<button class="btn" style="flex:2;background:var(--accent);color:#fff;border-color:var(--accent)" onclick="_puzCheck()">정답 확인</button>`:''}
        </div>
        <div id="puz-result" style="margin-top:10px">${p.solved?`<div class="puz-ok">✅ 정답! <span style="cursor:pointer;text-decoration:underline" onclick="closeMyPage();jumpToTrain('${p.train}')">열차 보기 →</span> · <span style="cursor:pointer;text-decoration:underline" onclick="_puzNew()">🎲 다음 문제</span></div>`:''}</div>
      </div>
    </div>`;
}
function _puzPick(s){ if(_puzState.sel.length<_puzState.answer.length){_puzState.sel.push(s);_puzDraw();} }
function _puzCheck(){
  const p=_puzState; p.tries++;
  const ok=p.sel.join('|')===p.answer.join('|');
  if(ok){
    p.solved=true;
    const today=todayLocalStr(new Date());
    try{localStorage.setItem('nimbi_puzzle',JSON.stringify({date:today,solved:_puzSolvedCount()+1}));}catch(e){}
  }
  if(ok){_puzDraw();}
  else{
    const correct=p.sel.filter((s,i)=>s===p.answer[i]).length;
    p.sel=[];_puzDraw();
    const r=document.getElementById('puz-result');
    if(r)r.innerHTML=`<div class="puz-no">❌ 아쉬워요 — 자리 맞은 역 ${correct}/${p.answer.length}. 다시 도전!</div>`;
  }
}

// ══════════════════════════════════════════
// ⚖️ 열차 비교 — 대피·추월 지점 확인
// ══════════════════════════════════════════
function openTrainCompare(no){
  document.getElementById('cmp-wrap')?.remove();
  const a=ALL_TRAINS.find(t=>t.no===no); if(!a)return;
  const aStops=a.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const aSet=new Map(aStops.map(s=>[s.s,toMin(s.dep||s.arr)]));
  const sug=[];
  ALL_TRAINS.forEach(t=>{
    if(t.no===no||t.dir!==a.dir)return;
    const shared=t.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&aSet.has(s.s));
    if(shared.length<4)return;
    const f=shared[0]; const d=Math.abs((toMin(f.dep||f.arr)-aSet.get(f.s)+720+1440)%1440-720);
    if(d>120)return;
    sug.push({no:t.no,grade:t.grade,dest:t.dest,d,n:shared.length});
  });
  sug.sort((x,y)=>x.d-y.d);
  const wrap=document.createElement('div');
  wrap.id='cmp-wrap';
  wrap.style.cssText='position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center';
  wrap.innerHTML=`
    <div class="alarm-popup-backdrop" onclick="document.getElementById('cmp-wrap').remove()"></div>
    <div class="alarm-popup" style="max-width:480px;max-height:86vh;display:flex;flex-direction:column">
      <div class="alarm-popup-title">⚖️ ${a.grade} ${a.no} 열차 비교</div>
      <div class="alarm-popup-sub">같은 방향 열차와 역별 시각을 비교해 대피·추월 지점을 확인합니다</div>
      <div style="display:flex;gap:6px;margin:8px 0">
        <input id="cmp-inp" placeholder="비교할 열차번호" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text1);padding:8px 10px;font-family:var(--mono)">
        <button class="btn" onclick="renderTrainCompare('${no}',document.getElementById('cmp-inp').value.trim())">비교</button>
      </div>
      ${sug.length?`<div style="font-size:11px;color:var(--text3);margin-bottom:4px">가까운 시간대 추천</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${sug.slice(0,6).map(s=>`<button class="seat-auto-chip" onclick="renderTrainCompare('${no}','${s.no}')">${s.grade} ${s.no}<span style="opacity:.6"> ±${s.d}분</span></button>`).join('')}
      </div>`:'<div style="font-size:12px;color:var(--text3)">가까운 시간대의 같은 방향 열차가 없습니다.</div>'}
      <div id="cmp-body" style="overflow-y:auto;min-height:0;flex:1"></div>
      <button class="alarm-popup-close" onclick="document.getElementById('cmp-wrap').remove()">닫기</button>
    </div>`;
  document.body.appendChild(wrap);
  if(sug.length)renderTrainCompare(no,sug[0].no);
}
function renderTrainCompare(noA,noB){
  const body=document.getElementById('cmp-body'); if(!body)return;
  const A=ALL_TRAINS.find(t=>t.no===noA), B=ALL_TRAINS.find(t=>t.no===noB);
  if(!B){body.innerHTML='<div style="color:var(--red);font-size:12px;padding:8px">열차를 찾을 수 없습니다.</div>';return;}
  const bMap=new Map(B.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep)).map(s=>[s.s,s]));
  const shared=A.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&bMap.has(s.s));
  if(shared.length<2){body.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px">두 열차의 공유 정차역이 부족합니다.</div>';return;}
  const wd=(x,y)=>((y-x+720+1440)%1440)-720;
  let rows='', prevSign=0, events=[];
  shared.forEach(sa=>{
    const sb=bMap.get(sa.s);
    const ta=toMin(sa.dep||sa.arr), tb=toMin(sb.dep||sb.arr);
    const d=wd(ta,tb); const sign=d>0?1:d<0?-1:0;
    let mark='';
    if(prevSign!==0&&sign!==0&&sign!==prevSign){
      const arrA=toMin(sa.arr), arrB=toMin(sb.arr);
      let txt;
      if(arrA!==null&&arrB!==null){
        const firstIn = wd(arrA,arrB)>0 ? A : B;
        const passer  = firstIn===A ? B : A;
        txt=`${sa.s}에서 ${firstIn.grade} ${firstIn.no} 대피 → ${passer.grade} ${passer.no} 추월`;
      } else txt=`${sa.s} 부근에서 순서 교체`;
      events.push(txt);
      mark=`<div class="cmp-event">🔀 ${txt}</div>`;
    }
    if(sign!==0)prevSign=sign;
    rows+=`${mark}<div class="cmp-row">
      <span class="cmp-stn">${sa.s}</span>
      <span class="cmp-t">${sa.arr||'–'}<br>${sa.dep||'–'}</span>
      <span class="cmp-t">${sb.arr||'–'}<br>${sb.dep||'–'}</span>
      <span class="cmp-diff">${d>0?'+':''}${d}분</span>
    </div>`;
  });
  body.innerHTML=`
    <div class="cmp-summary">${events.length?events.map(e=>`<div>🔀 ${e}</div>`).join(''):'두 열차의 선후 관계가 유지됩니다 (추월 없음)'}</div>
    <div class="cmp-row cmp-head">
      <span class="cmp-stn">역</span>
      <span class="cmp-t" style="color:var(--c-${gcCssVar(A.grade)})">${A.no}<br><small>착/발</small></span>
      <span class="cmp-t" style="color:var(--c-${gcCssVar(B.grade)})">${B.no}<br><small>착/발</small></span>
      <span class="cmp-diff">차이</span>
    </div>
    ${rows}`;
}

// 계정(로컬 프로필) 초기화 — 최초 실행 시 기존 데이터로 기본 계정 생성
try{acctInit();}catch(e){}

// ══════════════════════════════════════════
// 🔁 열차 운용 탭 — 시간-거리 다이어그램 + 편성 운용 흐름도
// ══════════════════════════════════════════
let _opsView='diagram';   // 'diagram' | 'rake'
let _opsCorridor=null;    // 다이어그램 대상 MAP_LINES 키
let _opsGrades=null;      // 등급 필터(Set) — null이면 전체 표시
let _opsGroup=null;       // 흐름도 편성 그룹 프리픽스
function OPS_x(m){if(m==null)return null;return m<240?m+1440:m;} // 04:00~28:00 → 240~1680 (자정 넘김 연속)
function _opsEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _fmtM(m){if(m==null)return '-';m=((m%1440)+1440)%1440;return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');}

// 코리도(노선) 역 순서 + 누적 거리(스키매틱 경로 길이)
const _opsCorCache={};
function _opsCorridorData(key){
  if(_opsCorCache[key]!==undefined)return _opsCorCache[key];
  const ml=(typeof MAP_LINES!=='undefined')?MAP_LINES[key]:null;
  if(!ml||!ml.routes){return _opsCorCache[key]=null;}
  const main=ml.routes.filter(r=>!r.dash).sort((a,b)=>b.stations.length-a.stations.length)[0]||ml.routes[0];
  const sts=main.stations;
  if(!sts||sts.length<3){return _opsCorCache[key]=null;}
  const dist=[0];
  for(let i=1;i<sts.length;i++)dist[i]=dist[i-1]+Math.hypot(sts[i].x-sts[i-1].x,sts[i].y-sts[i-1].y);
  const total=dist[dist.length-1]||1;
  const dm={},names=[];
  sts.forEach((s,i)=>{if(!(s.n in dm)){dm[s.n]=dist[i];names.push(s.n);}});
  return _opsCorCache[key]={key,name:ml.name,color:ml.color,names,dm,total};
}
// 열차의 코리도 상 정차점 (시각·거리)
function _opsTrainPts(t,cor){
  const pts=[];
  t.stops.forEach(s=>{
    if(!(s.s in cor.dm))return;
    const tm=hasTime(s.dep)?toMin(s.dep):(hasTime(s.arr)?toMin(s.arr):null);
    if(tm==null)return;
    pts.push({stn:s.s,d:cor.dm[s.s],t:OPS_x(tm),pass:isPassStop(t,s.s)});
  });
  return pts;
}
// 코리도 후보 목록 — 정차 열차 3개 이상, 편수 내림차순
let _opsCorridorList=null;
function _opsCorridors(){
  if(_opsCorridorList)return _opsCorridorList;
  const list=[];
  for(const key of Object.keys(MAP_LINES)){
    const cor=_opsCorridorData(key); if(!cor)continue;
    let nT=0; for(const t of ALL_TRAINS){if(_opsTrainPts(t,cor).length>=3)nT++;}
    if(nT>0)list.push({key,name:cor.name,n:nT});
  }
  list.sort((a,b)=>b.n-a.n);
  return _opsCorridorList=list;
}
function _curCorridorGrades(){
  const cor=_opsCorridorData(_opsCorridor); if(!cor)return [];
  return [...new Set(ALL_TRAINS.filter(t=>_opsTrainPts(t,cor).length>=3).map(t=>t.grade))];
}
function _opsToggleGrade(g){
  if(_opsGrades===null)_opsGrades=new Set(_curCorridorGrades());
  if(_opsGrades.has(g))_opsGrades.delete(g); else _opsGrades.add(g);
  if(_opsGrades.size===0||_opsGrades.size>=_curCorridorGrades().length)_opsGrades=null;
  renderOpsTab();
}

function renderOpsTab(){
  const host=document.getElementById('ops-container'); if(!host)return;
  host.innerHTML=`<div class="ops-viewtoggle">
    <button class="ops-vt${_opsView==='diagram'?' on':''}" onclick="_opsView='diagram';renderOpsTab()">📈 운행 다이어그램</button>
    <button class="ops-vt${_opsView==='rake'?' on':''}" onclick="_opsView='rake';renderOpsTab()">🔁 편성 운용 흐름도</button>
  </div><div id="ops-body"></div>`;
  const body=document.getElementById('ops-body');
  if(_opsView==='diagram')renderOpsDiagram(body); else renderOpsRake(body);
}

function renderOpsDiagram(host){
  if(typeof MAP_LINES==='undefined'){host.innerHTML='<div class="empty"><div class="empty-icon">📈</div><p>노선 데이터가 없습니다.</p></div>';return;}
  const cors=_opsCorridors();
  if(!cors.length){host.innerHTML='<div class="empty"><div class="empty-icon">📈</div><p>표시할 운행 노선이 없습니다.</p></div>';return;}
  if(!_opsCorridor||!cors.some(c=>c.key===_opsCorridor))_opsCorridor=cors[0].key;
  const cor=_opsCorridorData(_opsCorridor);
  const trains=[]; for(const t of ALL_TRAINS){const pts=_opsTrainPts(t,cor);if(pts.length>=3)trains.push({t,pts});}
  const gset=[...new Set(trains.map(o=>o.t.grade))];
  const showT=trains.filter(o=>!_opsGrades||_opsGrades.has(o.t.grade));

  let h=`<div class="ops-toolbar">
    <select class="ops-sel" onchange="_opsCorridor=this.value;_opsGrades=null;renderOpsTab()">
      ${cors.map(c=>`<option value="${c.key}"${c.key===_opsCorridor?' selected':''}>${_opsEsc(c.name)} · ${c.n}편</option>`).join('')}
    </select>
    <span class="ops-count">${showT.length}편 표시</span>
  </div>`;
  h+=`<div class="ops-legend">${gset.map(g=>`<button class="ops-gchip${(!_opsGrades||_opsGrades.has(g))?' on':''}" style="--gc:${GRADE_COLORS[g]||'#8b949e'}" onclick="_opsToggleGrade('${_opsEsc(g)}')">${_opsEsc(g)}</button>`).join('')}</div>`;

  const L=66,T=26,R=16,B=10;
  const pxPerMin=1.06, plotW=Math.round(1440*pxPerMin);
  const plotH=Math.max(440, cor.names.length*22);
  const W=L+plotW+R, H=T+plotH+B;
  const X=m=>L+(m-240)*pxPerMin;
  const Y=d=>T+d/cor.total*plotH;
  const s=[];
  s.push(`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="ops-diagram-svg">`);
  s.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg)"/>`);
  for(let hh=4;hh<=28;hh++){const x=X(hh*60);
    s.push(`<line x1="${x}" y1="${T}" x2="${x}" y2="${T+plotH}" stroke="var(--border)" stroke-width="${hh%2?0.5:1}" opacity="0.55"/>`);
    s.push(`<text x="${x}" y="${T-7}" fill="var(--text2)" font-size="10" text-anchor="middle">${String(hh%24).padStart(2,'0')}</text>`);}
  let lastY=-99;
  cor.names.forEach(n=>{const y=Y(cor.dm[n]);
    s.push(`<line x1="${L}" y1="${y}" x2="${L+plotW}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>`);
    if(y-lastY>=10){s.push(`<text x="${L-6}" y="${y+3}" fill="var(--text2)" font-size="9.5" text-anchor="end">${_opsEsc(n)}</text>`);lastY=y;}});
  const now=new Date();let nm=now.getHours()*60+now.getMinutes();let nx=nm<240?nm+1440:nm;
  if(nx>=240&&nx<=1680){const x=X(nx);s.push(`<line x1="${x}" y1="${T}" x2="${x}" y2="${T+plotH}" stroke="var(--red)" stroke-width="1.3" opacity="0.9"/>`);s.push(`<text x="${x}" y="${T+plotH+8}" fill="var(--red)" font-size="9" text-anchor="middle">지금</text>`);}
  showT.forEach(o=>{
    const c=GRADE_COLORS[o.t.grade]||'#8b949e';
    const pl=o.pts.map(p=>`${X(p.t).toFixed(1)},${Y(p.d).toFixed(1)}`).join(' ');
    s.push(`<polyline points="${pl}" fill="none" stroke="transparent" stroke-width="7" style="cursor:pointer" onclick="jumpToTrain('${o.t.no}')"><title>${_opsEsc(o.t.grade)} ${o.t.no} · ${_opsEsc(o.t.stops[0].s)}→${_opsEsc(o.t.dest)}</title></polyline>`);
    s.push(`<polyline points="${pl}" fill="none" stroke="${c}" stroke-width="1.4" opacity="0.85" pointer-events="none"/>`);
    o.pts.forEach(p=>{if(!p.pass)s.push(`<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.d).toFixed(1)}" r="1.5" fill="${c}" pointer-events="none"/>`);});
  });
  s.push('</svg>');
  h+=`<div class="ops-diagram-scroll">${s.join('')}</div>`;
  h+=`<p class="ops-hint">가로축 = 시각(04→28시) · 세로축 = <b>${_opsEsc(cor.name)}</b> 역(거리순) · 선 하나 = 열차 1편 · 기울기가 급할수록 고속 · 교차점 = 교행/추월 · 선을 누르면 열차 상세로 이동</p>`;
  host.innerHTML=h;
}

// ── 편성 운용 흐름도 ──
let _rakeGroupsCache=null;
// 편성 소속(기점)역 = 하행(홈→원단) 열차의 출발역(boundary[0]). 대전→남대구 열차는
// 하행 origin=대전 → '대전 소속'이며 남대구에서 주박으로 표시된다.
function _rakeHome(seq){
  for(const no of seq){const t=ALL_TRAINS.find(x=>x.no===no);if(t&&t.dir==='down'&&t.boundary&&t.boundary[0])return t.boundary[0];}
  const f=ALL_TRAINS.find(x=>x.no===seq[0]);
  return (f&&f.boundary&&f.boundary[0])||(f?_rotStart(f).stn:'기타');
}
function _rakeGroups(){
  if(_rakeGroupsCache)return _rakeGroupsCache;
  const byId={}; Object.values(CONFIRMED_ROTATION).forEach(r=>{byId[r.id]=r.seq;});
  const groups={};
  Object.entries(byId).forEach(([id,seq])=>{
    const home=_rakeHome(seq);
    (groups[home]=groups[home]||[]).push({id,seq,home});
  });
  const arr=Object.entries(groups).map(([g,rakes])=>{
    rakes.sort((a,b)=>Math.min(...a.seq.map(Number))-Math.min(...b.seq.map(Number)));
    const minNo=Math.min(...rakes.flatMap(r=>r.seq.map(n=>+n)));
    return {g,rakes,minNo};
  });
  arr.sort((a,b)=>a.minNo-b.minNo);
  return _rakeGroupsCache=arr;
}
function renderOpsRake(host){
  if(typeof CONFIRMED_ROTATION==='undefined'){host.innerHTML='<div class="empty"><div class="empty-icon">🔁</div><p>운용 데이터가 없습니다.</p></div>';return;}
  const groups=_rakeGroups();
  if(!groups.length){host.innerHTML='<div class="empty"><div class="empty-icon">🔁</div><p>확정 운용표가 없습니다.</p></div>';return;}
  if(!_opsGroup||!groups.some(x=>x.g===_opsGroup))_opsGroup=groups[0].g;
  const grp=groups.find(x=>x.g===_opsGroup);
  let h=`<div class="ops-toolbar">
    <select class="ops-sel" onchange="_opsGroup=this.value;renderOpsTab()">
      ${groups.map(x=>`<option value="${_opsEsc(x.g)}"${x.g===_opsGroup?' selected':''}>${_opsEsc(x.g)} 소속 · ${x.rakes.length}편성</option>`).join('')}
    </select>
    <span class="ops-count">${grp.rakes.reduce((a,r)=>a+r.seq.length,0)}편 운행</span>
  </div>`;
  const ruler=[];
  for(let hh=4;hh<=28;hh+=2){const pct=(hh*60-240)/1440*100;ruler.push(`<span class="ops-tick" style="left:${pct}%">${String(hh%24).padStart(2,'0')}</span>`);}
  h+=`<div class="ops-ruler-wrap"><div class="ops-ruler">${ruler.join('')}</div></div>`;
  h+=`<div class="ops-rakes">`;
  grp.rakes.forEach(rk=>{
    const legs=rk.seq.map(no=>ALL_TRAINS.find(t=>t.no===no)).filter(Boolean);
    if(!legs.length)return;
    const blocks=legs.map(t=>{
      const st=_rotStart(t),e=_rotEnd(t);
      let a=OPS_x(st.min),b=OPS_x(e.min);
      if(b==null||a==null)return '';
      if(b<a)b=1680; // 자정 넘김 방어
      const left=(a-240)/1440*100, w=Math.max(0.7,(b-a)/1440*100);
      const c=GRADE_COLORS[t.grade]||'#8b949e';
      return `<div class="ops-blk" style="left:${left}%;width:${w}%;--gc:${c}" onclick="jumpToTrain('${t.no}')" title="${_opsEsc(t.grade)} ${t.no} · ${_opsEsc(st.stn)} ${_fmtM(st.min)} → ${_opsEsc(e.stn)} ${_fmtM(e.min)}">${w>5?`<span>${t.no}</span>`:''}</div>`;
    }).join('');
    const jm=rk.id.match(/\(([^)]*?)주박\)/);
    const jubakStn=jm?jm[1]:null;
    h+=`<div class="ops-rake">
      <div class="ops-rake-label"><b>${_opsEsc(rk.id.replace(/\(.*\)/,'').trim())}</b>${jubakStn?` <span class="ops-jubak">${_opsEsc(jubakStn)} 주박</span>`:''}<span class="ops-rake-n">${legs.length}회 운용</span></div>
      <div class="ops-rake-track">${blocks}</div>
    </div>`;
  });
  h+=`</div>`;
  h+=`<p class="ops-hint">한 줄 = 편성 1개의 하루 운용 · 블록 = 열차 1편(가로 위치·길이 = 운행 시간대) · 블록 사이 빈 구간 = 회차·주박 · 블록을 누르면 열차 상세로 이동</p>`;
  host.innerHTML=h;
}

// ══════════════════════════════════════════
// 🔍 전철 경로 검색 — 출발·도착역 최소환승 경로 안내
// ══════════════════════════════════════════
let _mrFrom='', _mrTo='';
let _metroGraphCache=null;
function _metroGraph(){
  if(_metroGraphCache)return _metroGraphCache;
  const adj={}, stnLines={}, lineById={};
  const addEdge=(a,b,lid)=>{(adj[a]=adj[a]||new Map());if(!adj[a].has(b))adj[a].set(b,new Set());adj[a].get(b).add(lid);};
  (typeof METRO_LINES!=='undefined'?METRO_LINES:[]).forEach(l=>{
    lineById[l.id]=l;
    (l.routes||[{stations:l.stations}]).forEach(r=>{
      const st=r.stations||[];
      st.forEach(s=>{(stnLines[s]=stnLines[s]||new Set()).add(l.id);});
      for(let i=1;i<st.length;i++){addEdge(st[i-1],st[i],l.id);addEdge(st[i],st[i-1],l.id);}
    });
  });
  return _metroGraphCache={adj,stnLines,lineById};
}
function _metroStnList(){const G=_metroGraph();return Object.keys(G.stnLines).sort();}
function _metroAcShow(id,pickFn){
  const inp=document.getElementById(id); if(!inp)return;
  const q=inp.value.trim();
  const el=document.getElementById(id+'-ac'); if(!el)return;
  const all=_metroStnList();
  const list=(q?all.filter(n=>matchesQuery(n,q)):all.slice(0,12)).slice(0,12);
  const iE=id.replace(/'/g,"\\'");
  el.innerHTML=list.map(n=>{const nE=n.replace(/'/g,"\\'");
    return `<div class="ac-item" onmousedown="event.preventDefault();document.getElementById('${iE}').value='${nE}';document.getElementById('${iE}-ac').style.display='none';window['${pickFn}']('${nE}')">${n}</div>`;}).join('');
  el.className='ac-dropdown open'; el.style.display=list.length?'block':'none';
}
function _mrPickFrom(n){_mrFrom=n;if(_mrTo)searchMetroRoute();}
function _mrPickTo(n){_mrTo=n;if(_mrFrom)searchMetroRoute();}
function _mrSwap(){
  const a=document.getElementById('mr-from'), b=document.getElementById('mr-to');
  if(a&&b){const t=a.value;a.value=b.value;b.value=t;_mrFrom=a.value.trim();_mrTo=b.value.trim();}
  if(_mrFrom&&_mrTo)searchMetroRoute();
}
// 최소환승 우선(환승 페널티 T) 다익스트라 — 상태=(역,노선)
function _metroFindRoute(from,to){
  const G=_metroGraph();
  if(!G.stnLines[from]||!G.stnLines[to])return {err:'noStn'};
  if(from===to)return {err:'same'};
  const T=5; // 환승 1회 = 역 5개 페널티(환승 최소화 우선)
  const dist={}, prev={}, seen=new Set(); const pq=[];
  G.stnLines[from].forEach(lid=>{const k=from+'|'+lid;dist[k]=0;prev[k]=null;pq.push({k,stn:from,lid,d:0});});
  let best=null,bestD=Infinity;
  while(pq.length){
    let mi=0;for(let i=1;i<pq.length;i++)if(pq[i].d<pq[mi].d)mi=i;
    const cur=pq.splice(mi,1)[0];
    if(seen.has(cur.k))continue; seen.add(cur.k);
    if(cur.d>=bestD)break;
    if(cur.stn===to){best=cur.k;bestD=cur.d;break;}
    const nbrs=G.adj[cur.stn];
    if(nbrs)nbrs.forEach((lset,nb)=>{
      if(!lset.has(cur.lid))return;
      const nk=nb+'|'+cur.lid, nd=cur.d+1;
      if(nd<(dist[nk]??Infinity)){dist[nk]=nd;prev[nk]=cur.k;pq.push({k:nk,stn:nb,lid:cur.lid,d:nd});}
    });
    G.stnLines[cur.stn].forEach(lid=>{
      if(lid===cur.lid)return;
      const nk=cur.stn+'|'+lid, nd=cur.d+T;
      if(nd<(dist[nk]??Infinity)){dist[nk]=nd;prev[nk]=cur.k;pq.push({k:nk,stn:cur.stn,lid,d:nd});}
    });
  }
  if(!best)return {err:'nopath'};
  const path=[]; let k=best; while(k){path.unshift(k);k=(k in prev)?prev[k]:null;}
  const nodes=path.map(x=>{const p=x.lastIndexOf('|');return {s:x.slice(0,p),lid:x.slice(p+1)};});
  const segs=[];
  nodes.forEach(nd=>{
    const last=segs[segs.length-1];
    if(last&&last.lid===nd.lid){if(last.stns[last.stns.length-1]!==nd.s)last.stns.push(nd.s);}
    else segs.push({lid:nd.lid,stns:[nd.s]});
  });
  const real=segs.filter(s=>s.stns.length>=2);
  const stops=real.reduce((a,s)=>a+s.stns.length-1,0);
  return {segments:real,stops,transfers:Math.max(0,real.length-1),from,to};
}
function renderMetroRouteTab(){
  const el=document.getElementById('result-metroroute'); if(!el)return;
  if(typeof METRO_LINES==='undefined'){el.innerHTML='<div class="empty"><div class="empty-icon">🚇</div><p>전철 노선 데이터가 없습니다.</p></div>';return;}
  el.innerHTML=`
    <div class="search-card">
      <div class="mr-io">
        <div class="mr-field"><label>출발역</label>
          <div class="autocomplete-wrap" style="min-width:0">
            <input type="text" id="mr-from" class="term-sel" style="margin-bottom:0" value="${_mrFrom||''}" placeholder="출발 전철역 (초성 가능)" autocomplete="off"
              oninput="_metroAcShow('mr-from','_mrPickFrom')" onfocus="this.select();_metroAcShow('mr-from','_mrPickFrom')"
              onblur="setTimeout(()=>{const d=document.getElementById('mr-from-ac');if(d)d.style.display='none';},150)"
              onkeydown="if(event.key==='Enter'){_mrFrom=this.value.trim();searchMetroRoute();}">
            <div class="ac-dropdown" id="mr-from-ac"></div>
          </div>
        </div>
        <button class="mr-swap" onclick="_mrSwap()" title="출발·도착 바꾸기">⇅</button>
        <div class="mr-field"><label>도착역</label>
          <div class="autocomplete-wrap" style="min-width:0">
            <input type="text" id="mr-to" class="term-sel" style="margin-bottom:0" value="${_mrTo||''}" placeholder="도착 전철역 (초성 가능)" autocomplete="off"
              oninput="_metroAcShow('mr-to','_mrPickTo')" onfocus="this.select();_metroAcShow('mr-to','_mrPickTo')"
              onblur="setTimeout(()=>{const d=document.getElementById('mr-to-ac');if(d)d.style.display='none';},150)"
              onkeydown="if(event.key==='Enter'){_mrTo=this.value.trim();searchMetroRoute();}">
            <div class="ac-dropdown" id="mr-to-ac"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:4px" onclick="_mrFrom=document.getElementById('mr-from').value.trim();_mrTo=document.getElementById('mr-to').value.trim();searchMetroRoute()">🔍 경로 검색</button>
    </div>
    <div id="mr-result"></div>`;
}
function searchMetroRoute(){
  const out=document.getElementById('mr-result'); if(!out)return;
  const from=(_mrFrom||'').trim(), to=(_mrTo||'').trim();
  if(!from||!to){out.innerHTML='<div class="mr-hint">출발역과 도착역을 모두 입력하세요.</div>';return;}
  const r=_metroFindRoute(from,to);
  if(r.err==='same'){out.innerHTML='<div class="mr-hint">출발역과 도착역이 같습니다.</div>';return;}
  if(r.err==='noStn'){const bad=_metroGraph().stnLines[from]?to:from;out.innerHTML=`<div class="mr-hint">전철 노선에 <b>${_opsEsc(bad)}</b> 역이 없습니다. 역명을 확인하세요.</div>`;return;}
  if(r.err||!r.segments||!r.segments.length){out.innerHTML='<div class="mr-hint">경로를 찾을 수 없습니다.</div>';return;}
  const G=_metroGraph();
  const mins=Math.round(r.stops*2.1+r.transfers*4);
  const segHtml=r.segments.map((s,i)=>{
    const l=G.lineById[s.lid]||{name:'?',color:'#888'};
    const board=s.stns[0], alight=s.stns[s.stns.length-1];
    const via=s.stns.slice(1,-1);
    const viaTxt=via.length?`<div class="mr-via">${via.map(_opsEsc).join(' · ')}</div>`:'';
    return `${i>0?`<div class="mr-xfer"><span class="mr-xfer-dot">🔄</span> <b>${_opsEsc(board)}</b> 환승</div>`:''}
      <div class="mr-seg" style="--lc:${l.color}">
        <div class="mr-seg-head"><span class="mr-linechip" style="background:${l.color}">${_opsEsc(l.name)}</span><span class="mr-seg-count">${s.stns.length-1}개역</span></div>
        <div class="mr-seg-route"><b>${_opsEsc(board)}</b> <span class="mr-arrow">→</span> <b>${_opsEsc(alight)}</b></div>
        ${viaTxt}
      </div>`;
  }).join('');
  out.innerHTML=`
    <div class="result-header" style="margin-top:16px">
      <div class="result-title">🚇 ${_opsEsc(from)} → ${_opsEsc(to)}</div>
      <span class="badge blue">환승 ${r.transfers}회</span>
      <span class="badge" style="background:var(--bg3)">${r.stops}개역 · 약 ${mins}분</span>
    </div>
    <div class="mr-segs">${segHtml}</div>
    <p class="ops-hint">환승 최소 경로 기준(소요는 역당 약 2분·환승 4분 추정). 실제 열차 시각은 노선 탭에서 확인하세요.</p>`;
}
