

const GC={'KTX':'KTX','SRT':'SRT','ITX-새마을':'ITX','ITX-청춘':'ITXCC','무궁화호':'MGH'};
const GL={'KTX':'KTX','SRT':'SRT','ITX-새마을':'ITX-새마을','ITX-청춘':'ITX-청춘','무궁화호':'무궁화'};
function gc(g){return GC[g]||'MGH';}
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
function toMin(v){if(!v)return null;const m=v.match(/(\d+):(\d+)/);return m?+m[1]*60+ +m[2]:null;}
function durStr(depT,arrT){
  if(!depT||!arrT)return '-';
  const d=toMin(arrT)-toMin(depT);
  if(d<=0)return '-';
  return d<60?`${d}m`:`${Math.floor(d/60)}h ${d%60}m`;
}
function hasTime(v){return v&&/\d+:\d+/.test(v);}

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

function acShow(iid,did){
  const inp=document.getElementById(iid),drop=document.getElementById(did);
  if(!inp||!drop)return;
  const q=inp.value.trim();
  if(!q){drop.className='ac-dropdown';drop.style.display='none';return;}
  // 초성 검색 포함
  const hits=ALL_STATIONS.filter(s=>matchesQuery(s,q)).slice(0,12);
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
  const tab=document.getElementById('tab-notice');
  if(!tab)return;
  let dot=tab.querySelector('.notice-badge-dot');
  if(cnt>0){
    if(!dot){
      dot=document.createElement('span');
      dot.className='notice-badge-dot';
      tab.appendChild(dot);
    }
  } else if(dot){
    dot.remove();
  }
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

function switchTab(n){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+n).classList.add('active');
  document.getElementById('panel-'+n).classList.add('active');
  if(n==='map'){
    const content=document.getElementById('map-content');
    if(content) content.style.display='';
    // 항상 현재 활성 노선 탭 렌더링 (초기엔 경부선)
    const activeMapTab=document.querySelector('.map-line-tab.active')||document.querySelector('.map-line-tab');
    const lineKey=(activeMapTab&&activeMapTab.getAttribute('onclick').match(/['"]([\w]+)['"]/)?.[1])||'gyeongbu';
    showMapLine(lineKey, activeMapTab||document.querySelector('.map-line-tab'));
  } else {
    // 다른 탭으로 이동 시 노선도 콘텐츠 숨기기
    _mapCurrentLine=null;
    const content=document.getElementById('map-content');
    if(content) content.style.display='none';
    const countEl=document.getElementById('map-train-count');
    if(countEl) countEl.textContent='';
  }
  if(n==='alarm') renderAlarms();
  if(n==='fav') renderFavs();
  if(n==='stats') renderStats();
  if(n==='notice') renderNotice();
  
}

// ── 통과 판별 ──
// boundary: 각 섹션의 첫/끝역 → arr/dep 한쪽만 있어도 정차역으로 처리
function isPassStop(t, stn){
  const valid=t.stops.filter(s=>s.arr||s.dep);
  if(!valid.length)return true;
  const origin=valid[0].s, terminus=valid[valid.length-1].s;
  // 전체 기종점
  if(stn===origin||stn===terminus)return false;
  // 섹션 경계역 (섹션의 시작/끝)
  if(t.boundary&&t.boundary.includes(stn))return false;
  const s=t.stops.find(x=>x.s===stn);
  if(!s)return true;
  if(s.arr==='통과'||s.dep==='통과')return true;
  // arr/dep 중 하나만 시각이 있으면 통과
  return (hasTime(s.arr)&&!hasTime(s.dep))||(hasTime(s.dep)&&!hasTime(s.arr));
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

function getCurrentStatus(t){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  // 원본 stops에서 인덱스 보존하며 시각 있는 역 수집
  const all=[];
  t.stops.forEach((s,idx)=>{
    if(hasTime(s.arr)||hasTime(s.dep))all.push({s,idx});
  });
  if(!all.length)return null;

  // 자정 넘는 열차 대응: 시각이 역순으로 줄어드는 구간에서 +1440 보정
  // 각 stop의 시각을 연속된 분 값으로 정규화
  function normalizeMinutes(stops){
    const result=[];
    let offset=0;
    let prevM=-1;
    for(const item of stops){
      const s=item.s;
      const rawArr=toMin(s.arr);
      const rawDep=toMin(s.dep);
      const rawM=rawArr??rawDep;
      if(rawM===null){result.push({...item,normArr:null,normDep:null});continue;}
      // 이전 시각보다 크게 줄었으면 자정 넘긴 것
      if(prevM>=0&&rawM<prevM-60) offset+=1440;
      const normArr=rawArr!==null?rawArr+offset:null;
      const normDep=rawDep!==null?rawDep+offset:null;
      result.push({...item,normArr,normDep});
      prevM=rawM;
    }
    return result;
  }

  const normalized=normalizeMinutes(all);
  const firstDep=normalized[0].normDep??normalized[0].normArr;
  const lastItem=normalized[normalized.length-1];
  const lastArr=lastItem.normArr??lastItem.normDep;

  // nowMin도 열차 운행 범위에 맞게 보정
  // 열차가 자정을 넘겨 운행 중이면 nowMin에 1440 더해서 비교
  let nowM=nowMin;
  if(lastArr>1440&&nowMin<firstDep) nowM=nowMin+1440;

  if(nowM<firstDep)return{status:'before'};
  if(nowM>lastArr)return{status:'done'};

  for(let i=0;i<normalized.length;i++){
    const {s,idx,normArr,normDep}=normalized[i];
    const leaveM=normDep??normArr;
    // 정차 중: arrM <= now <= depM
    if(normArr!==null&&normDep!==null&&nowM>=normArr&&nowM<=normDep){
      return{status:'running',atStn:s.s,prevStn:i>0?normalized[i-1].s.s:null,nowMin};
    }
    // 이동 중: leaveM < now < 다음 역 arrM
    if(i+1<normalized.length){
      const {s:nextS,idx:nextIdx,normArr:nextArrM}=normalized[i+1];
      const nextM=nextArrM??normalized[i+1].normDep;
      if(leaveM!==null&&nextM!==null&&nowM>leaveM&&nowM<nextM){
        // 사이 통과역 확인
        for(let j=idx+1;j<nextIdx;j++){
          const mid=t.stops[j];
          if(!isPassStop(t,mid.s))continue;
          const midRaw=toMin(mid.arr)||toMin(mid.dep);
          if(midRaw===null)continue;
          // 통과역도 offset 적용 근사
          const midM=midRaw+(leaveM>=1440?1440:0);
          if(midM===nowM){
            return{status:'running',passStn:mid.s,prevStn:s.s,nowMin};
          }
        }
        return{status:'running',prevStn:s.s,nextStn:nextS.s,nowMin};
      }
    }
  }
  return{status:'running',nextStn:normalized[normalized.length-1].s.s,nowMin};
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

  return `<div class="detail-card" id="dc-${t.no}">
    <div class="detail-head" style="position:relative">
      <button class="share-btn" onclick="shareTrainLink('${t.no}')" title="링크 복사">🔗</button>
      <button class="share-btn" style="right:44px" onclick="trackTrainOnMap('${t.no}')" title="노선도에서 보기">🗺️</button>
      <div class="detail-no" style="color:var(--c-${c.toLowerCase()})">${t.no}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        ${gradeHtml(t.grade)}${lineChipHtml(t.line)}
        <span style="font-size:16px;font-weight:700">${t.dest}행</span>
      </div>
      <div class="detail-meta">${first?.s||''} ${depT} 발 → ${last?.s||''} ${arrT} 착</div>
      <div class="detail-meta" style="margin-top:2px">정차역 ${totalStops}개 &nbsp;·&nbsp; 소요시간 ${dur}</div>
    </div>
    ${statusBanner}
    <div class="tl-toolbar">
      <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="hide-pass-${t.no}" onchange="togglePassRows('${t.no}')" style="cursor:pointer">
        통과역 숨기기
      </label>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="view-toggle-btn${_detailViewMode==='timeline'?' active':''}" onclick="setDetailView('timeline','${t.no}')">⏱ 타임라인</button>
        <button class="view-toggle-btn${_detailViewMode==='table'?' active':''}" onclick="setDetailView('table','${t.no}')">📋 표</button>
      </div>
    </div>
    <div id="tl-${t.no}">${_detailViewMode==='table'?renderTableView(t):rows}</div>
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
    if(gradeF!=='all'&&t.grade!==gradeF)return;
    const stop=t.stops.find(s=>s.s===stn);
    if(!stop||(!stop.arr&&!stop.dep))return;
    const isPass=isPassStop(t,stn);
    if(passF==='stop'&&isPass)return;
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
  el.innerHTML=`<div class="result-header"><div class="result-title">🏢 ${stn} 시간표${afterLabel}</div><span class="badge blue">${results.length}편</span><button class="btn" style="font-size:12px;padding:4px 8px" onclick="searchByStation()">🔄</button></div>
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
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    if(fi===-1||ti===-1||fi>=ti)return;
    if(isPassStop(t,from)||isPassStop(t,to))return;
    const depT=getStopTime(stops[fi]);
    const arrT=hasTime(stops[ti].arr)?stops[ti].arr:hasTime(stops[ti].dep)?stops[ti].dep:null;
    if(!depT)return;
    if(afterMin!==null&&toMin(depT)<afterMin)return;
    const durM=(toMin(arrT)||0)-(toMin(depT)||0);
    if(maxDur>0&&durM>maxDur)return;
    directs.push({t,depT,arrT,dur:durStr(depT,arrT),sortT:toMin(depT)??9999});
  });
  // 정렬
  if(sortMode==='depart') directs.sort((a,b)=>a.sortT-b.sortT);
  else if(sortMode==='arrive') directs.sort((a,b)=>(toMin(a.arrT)??9999)-(toMin(b.arrT)??9999));
  else directs.sort((a,b)=>{
    const dA=toMin(a.arrT)-toMin(a.depT), dB=toMin(b.arrT)-toMin(b.depT);
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
      const totalM=toMin(arr2T)-toMin(l1.depT);
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
        arrM:toMin(arr2T)||9999,
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
          <span class="alarm-popup-option-desc">출발 5분 전 + 전역 출발 시 알림</span>
        </div>
        <span class="alarm-popup-option-icon">${boardSet?'✅':'○'}</span>
      </button>
      <button class="alarm-popup-option${arrSet?' active':''}" id="ap-arr" onclick="toggleAlarmType('arr','${trainNo}','${stn}','${arrTime}','${prevTime}')">
        <div class="alarm-popup-option-text">
          <span class="alarm-popup-option-label">🛬 하차 알람</span>
          <span class="alarm-popup-option-desc">전역 출발 시 알림</span>
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

function toggleAlarmType(type, trainNo, stn, baseTime, prevTime){
  requestNotifPermission(()=>{
    if(type==='board'){
      // 승차: 5분 전 + 전역 출발 (2개)
      const id5=`board:${trainNo}:${stn}`;
      const idPrev=`board-prev:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id5);
      if(already){
        // 취소
        const filtered=alarms.filter(a=>a.id!==id5&&a.id!==idPrev);
        saveAlarms(filtered);
        alert(`승차 알람이 취소되었습니다.`);
      } else {
        // 5분 전 알람
        const depM=toMin(baseTime);
        if(depM===null){alert('출발 시각이 없어 승차 알람을 설정할 수 없습니다.');return;}
        const m5=depM-5<0?depM-5+1440:depM-5;
        const h5=Math.floor(m5/60),mm5=m5%60;
        alarms.push({id:id5,trainNo,stn,type:'board-5',alarmM:m5,timeStr:`${h5}:${mm5.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 승차`,fired:false});
        // 전역 출발 알람
        const prevM=toMin(prevTime);
        if(prevM!==null){
          const hp=Math.floor(prevM/60),mp=prevM%60;
          alarms.push({id:idPrev,trainNo,stn,type:'board-prev',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 승차 (전역출발)`,fired:false});
        }
        saveAlarms(alarms);
        alert(`승차 알람이 설정되었습니다.`);
      }
    } else {
      // 하차: 전역 출발 1개
      const id=`arr:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id);
      if(already){
        saveAlarms(alarms.filter(a=>a.id!==id));
        alert(`하차 알람이 취소되었습니다.`);
      } else {
        const prevM=toMin(prevTime);
        if(prevM===null){alert('전역 시각이 없어 하차 알람을 설정할 수 없습니다.');return;}
        const hp=Math.floor(prevM/60),mp=prevM%60;
        alarms.push({id,trainNo,stn,type:'arr',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}번 · ${stn}역 하차`,fired:false});
        saveAlarms(alarms);
        alert(`하차 알람이 설정되었습니다.`);
      }
    }
    closeAlarmPopup();
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
  saveAlarms(loadAlarms().filter(a=>a.id!==id));
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
    el.innerHTML='<div class="alarm-empty"><div style="font-size:36px;margin-bottom:12px">🔔</div><p>설정된 알람이 없습니다.<br>열차 상세에서 🔔 버튼으로 추가하세요.</p><p class="hint" style="margin-top:16px"><button class="btn" style="font-size:12px;padding:6px 14px" onclick="testAlarm()">🧪 알람 테스트</button></p></div>';
    return;
  }
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  // board-prev는 목록에서 숨김 (승차 알람의 일부로 처리)
  const visible=alarms.filter(a=>a.type!=='board-prev');
  const sorted=[...visible].sort((a,b)=>a.alarmM-b.alarmM);
  const hasFired=alarms.some(a=>a.fired);
  const typeLabel={'board-5':'승차','arr':'하차'};
  const typeBadgeClass={'board-5':'alarm-type-board','arr':'alarm-type-arr'};
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
    <span class="badge blue">${alarms.filter(a=>!a.fired&&a.type!=='board-prev').length}개 대기</span>
    ${hasFired?'<button class="btn" style="font-size:12px;padding:4px 10px" onclick="clearFiredAlarms()">완료 지우기</button>':''}
  </div>${cards}<p class="hint">※ 브라우저 탭이 열려있어야 알람이 작동합니다</p>`;
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
          'board-5':`${a.trainNo}번 열차가 ${a.stn}역에서 5분 후 출발합니다`,
          'board-prev':`${a.trainNo}번 열차가 곧 ${a.stn}역에 도착합니다`,
          'arr':`${a.trainNo}번 열차가 곧 ${a.stn}역에 도착합니다`,
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


// ── 즐겨찾기 ──
const FAV_KEY='nimbi_favs';
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY))||[];}catch(e){return[];}}
function saveFavs(favs){localStorage.setItem(FAV_KEY,JSON.stringify(favs));}

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
  favs.push({id,type,label,data,addedAt:Date.now()});
  saveFavs(favs);
  alert('"'+label+'"을 즐겨찾기에 추가했습니다.');
  if(document.getElementById('panel-fav').classList.contains('active'))renderFavs();
}

function removeFav(id){
  saveFavs(loadFavs().filter(f=>f.id!==id));
  renderFavs();
}

function runFav(fav){
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

function renderFavs(){
  const el=document.getElementById('result-fav');
  if(!el){console.warn('result-fav 엘리먼트 없음');return;}
  try{
  const favs=loadFavs();
  console.log('renderFavs: favs 개수 =', favs.length, favs);
  if(!favs.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">⭐</div><p>즐겨찾기가 비어있습니다.<br>각 탭의 ⭐ 버튼으로 추가해보세요.</p></div>';
    return;
  }
  const typeIcon={train:'🚆',station:'🏢',route:'🔍'};
  const cards=favs.map((f,i)=>{
    const info=getFavInfo(f);
    // station은 두 줄(lines), 나머지는 한 줄(sub)
    const subHtml=info.lines
      ? info.lines.map(l=>`<div class="fav-sub">${l}</div>`).join('')
      : `<div class="fav-sub">${info.sub||''}</div>`;
    return `<div class="fav-card" draggable="true" ondragstart="favDragStart(event,${i})" ondragend="favDragEnd(event)" ondragover="favDragOver(event,${i})" onclick="runFav(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div class="fav-icon">${typeIcon[f.type]||'⭐'}</div>
      <div class="fav-info">
        <div class="fav-label">${info.main}</div>
        ${subHtml}
      </div>
      <button class="fav-del-btn" onclick="event.stopPropagation();removeFav('${f.id}')" title="삭제">✕</button>
    </div>`;
  }).join('');
  el.innerHTML=`
    <div class="result-header">
      <div class="result-title">⭐ 즐겨찾기</div>
      <span class="badge blue">${favs.length}개</span>
    </div>
    <div class="fav-list">${cards}</div>
    <p class="hint">※ 클릭 시 해당 탭으로 이동해 바로 조회합니다</p>`;
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
  });
  const chips=runningTrains.map(t=>{
    const c=GRADE_COLORS[t.grade]||'var(--accent)';
    return `<span onclick="jumpToTrain('${t.no}')" style="cursor:pointer;padding:2px 8px;border-radius:10px;border:1px solid ${c};color:${c};font-size:11px;background:rgba(0,0,0,.2)">${t.no}</span>`;
  }).join('');
  el.innerHTML=chips+`<span class="badge" style="cursor:pointer;margin-left:4px" onclick="renderStats()">접기 ▴</span>`;
}



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

  // 휠 줌
  wrap.onwheel = e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setMapZoom(_mapZoom * delta, e.clientX, e.clientY);
  };

  // 핀치 줌
  let lastDist = 0;
  wrap.ontouchstart = e => {
    if(e.touches.length === 2){
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };
  wrap.ontouchmove = e => {
    if(e.touches.length === 2){
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if(lastDist > 0){
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setMapZoom(_mapZoom * (dist / lastDist), cx, cy);
      }
      lastDist = dist;
    }
  };
  wrap.ontouchend = () => { lastDist = 0; };
}

function setMapZoom(z, cx, cy){
  _mapZoom = Math.max(0.5, Math.min(5, z));
  const svg = document.querySelector('#map-svg-wrap svg');
  if(!svg) return;
  svg.style.transform = `scale(${_mapZoom})`;
  svg.style.transformOrigin = cx && cy ? `${cx}px ${cy}px` : 'center center';
  // 줌 버튼 업데이트
  const zl = document.getElementById('map-zoom-label');
  if(zl) zl.textContent = Math.round(_mapZoom*100) + '%';
}

function mapZoomIn(){ setMapZoom(_mapZoom * 1.2); }
function mapZoomOut(){ setMapZoom(_mapZoom / 1.2); }
function mapZoomReset(){ setMapZoom(1); }

// ── 노선도에서 열차 위치 추적 ──
function trackTrainOnMap(trainNo){
  const t = ALL_TRAINS.find(t => t.no === trainNo);
  if(!t) return;

  // 경전선은 gyeongjeon, 경부선은 gyeongbu 등 노선 매핑
  const lineMap = {
    '경부선':'gyeongbu','경부고속선':'gyeongbuhs','호남선':'honam',
    '중앙선':'jungang','동해선':'donghae','강릉선':'gangreung',
    '중부내륙선':'jungnaelyuk','경전선':'gyeongjeon'
  };
  const lines = t.line.split('·').map(l=>l.trim());
  const lineKey = lineMap[lines[0]];
  if(!lineKey){ alert('해당 노선의 노선도가 없습니다'); return; }

  // 노선도 탭으로 이동 후 해당 노선 표시
  switchTab('map');
  const btn = document.querySelector(`.map-line-tab[onclick*="${lineKey}"]`);
  if(btn){ btn.click(); }
  setTimeout(()=>{
    const status = getCurrentStatus(t);
    if(!status || status.status !== 'running') return;
    const stn = status.atStn || status.nextStn || status.prevStn;
    if(!stn || !_mapStnPos[stn]) return;
    // 해당 역으로 스크롤
    const wrap = document.getElementById('map-svg-wrap');
    const pos = _mapStnPos[stn];
    if(wrap && pos){
      const {ox, oy} = _mapSvgSize;
      wrap.scrollLeft = pos.x - ox - wrap.clientWidth/2;
      wrap.scrollTop = pos.y - oy - wrap.clientHeight/2;
    }
  }, 400);
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
  if(_favDragIdx === null || _favDragIdx === idx) return;
  const favs = JSON.parse(localStorage.getItem('nimbi_favs') || '[]');
  const moved = favs.splice(_favDragIdx, 1)[0];
  favs.splice(idx, 0, moved);
  localStorage.setItem('nimbi_favs', JSON.stringify(favs));
  _favDragIdx = idx;
  renderFavs();
}

function jumpToTrain(no){
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

// 등급별 색상
const GRADE_COLORS = {
  'KTX':'#3b82f6','SRT':'#a855f7',
  'ITX-새마을':'#ef4444','ITX-청춘':'#22c55e','무궁화호':'#f97316'
};

function updateMapTrains(){
  if(!_mapCurrentLine)return;
  const svgEl=document.querySelector('#map-svg-wrap svg');
  if(!svgEl)return;

  // 기존 열차 레이어 제거
  const old=svgEl.querySelector('#train-layer');
  if(old)old.remove();

  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  const line=MAP_LINES[_mapCurrentLine];
  if(!line)return;

  // 이 노선에 속하는 운행 중 열차 수집
  const running=[];
  ALL_TRAINS.forEach(t=>{
    if(!t.line.includes(line.name))return;
    const status=getCurrentStatus(t);
    if(!status||status.status!=='running')return;
    // 방향 필터
    if(_mapDirFilter==='down'&&t.dir!=='down')return;
    if(_mapDirFilter==='up'&&t.dir!=='up')return;
    // prevStn 또는 nextStn 또는 atStn의 좌표 구하기
    const stnA=status.atStn||status.prevStn;
    const stnB=status.atStn?null:status.nextStn;
    const posA=_mapStnPos[stnA];
    const posB=stnB?_mapStnPos[stnB]:null;
    if(!posA)return;
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
    running.push({t,px,py,status});
  });

  // 열차 레이어를 SVG 문자열로 생성
  const r=Math.max(6, _mapSvgSize.w*0.018);
  const fs=Math.max(9, _mapSvgSize.w*0.016);
  let layerHtml='<g id="train-layer">';
  running.forEach(({t,px,py,status})=>{
    const color=GRADE_COLORS[t.grade]||'#888';
    layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}"
      fill="${color}" stroke="#0d1117" stroke-width="2"
      style="cursor:pointer" class="train-dot" data-no="${t.no}"/>`;
    layerHtml+=`<text x="${px.toFixed(1)}" y="${(py-r-3).toFixed(1)}"
      text-anchor="middle" font-size="${fs}" fill="${color}"
      font-family="Noto Sans KR,sans-serif" font-weight="600"
      pointer-events="none">${t.no}</text>`;
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
    const entry=running.find(r=>r.t.no===no);
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

  // 운행 열차 수 업데이트
  const countEl=document.getElementById('map-train-count');
  if(countEl)countEl.textContent=`운행 중 ${running.length}편`;
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
},60000);

const MAP_LINES = {

gyeongbu:{
  name:'경부선', color:'#e3b341',
  routes:[{color:'#e3b341', stations:[
    {n:'서울',x:201,y:314},{n:'한강로',x:190,y:336},{n:'남안양',x:181,y:358},
    {n:'수원',x:187,y:387},{n:'오산',x:184,y:414},{n:'평택',x:181,y:442},
    {n:'천안',x:207,y:484},{n:'목천',x:225,y:502},{n:'병천',x:240,y:520},
    {n:'북청주',x:252,y:534},{n:'서청주',x:267,y:550},{n:'상당',x:274,y:564},
    {n:'문의',x:268,y:580},{n:'신탄진',x:262,y:597},{n:'회덕',x:258,y:609},
    {n:'대전',x:259,y:621},{n:'판암',x:268,y:630},{n:'세천',x:276,y:644},
    {n:'옥천',x:285,y:660},{n:'이원',x:291,y:675},{n:'심천',x:297,y:690},
    {n:'영동',x:305,y:705},{n:'황간',x:325,y:718},{n:'추풍령',x:346,y:729},
    {n:'봉산',x:367,y:735},{n:'김천',x:388,y:736},{n:'구미',x:413,y:734},
    {n:'약목',x:433,y:747},{n:'서왜관',x:446,y:760},{n:'하빈',x:458,y:776},
    {n:'호림',x:469,y:790},{n:'남대구',x:484,y:810},{n:'경산',x:506,y:818},
    {n:'운문',x:524,y:830},{n:'언양',x:536,y:848},{n:'동양산',x:539,y:864},
    {n:'북부산',x:536,y:880},{n:'동래',x:533,y:896},{n:'부산',x:531,y:914},
  ]}],
},

gyeongbuhs:{
  name:'경부고속선', color:'#388bfd',
  routes:[
    // 본선: 서울→부산
    {color:'#388bfd', stations:[
      {n:'서울',  x:201,y:314},{n:'한강로',x:190,y:336},
      {n:'병목안',x:159,y:357},{n:'수영',  x:171,y:379},
      {n:'천안',  x:207,y:484},{n:'정안',  x:192,y:526},
      {n:'세종',  x:207,y:558},{n:'대전',  x:259,y:621},
      {n:'산내',  x:268,y:648},{n:'영동',  x:305,y:705},
      {n:'구미',  x:413,y:734},{n:'남대구',x:484,y:810},
      {n:'청도',  x:516,y:824},{n:'부산',  x:531,y:914},
    ]},
    // 잠실 지선: 잠실→동탄→천안 합류
    {color:'#388bfd', dash:true, stations:[
      {n:'잠실',x:247,y:314},{n:'동탄',x:249,y:430},{n:'천안',x:207,y:484},
    ]},
    // 서인천 지선: 서인천→(안산→원평)→수영 합류
    {color:'#388bfd', dash:true, stations:[
      {n:'서인천',x:84,y:374},{n:'안산',x:117,y:398},{n:'원평',x:145,y:398},{n:'수영',x:171,y:379},
    ]},
    // 포항 지선: 구미에서 분기→포항
    {color:'#388bfd', dash:true, stations:[
      {n:'구미',x:413,y:734},{n:'포항',x:611,y:570},
    ]},
    // 창녕 지선: 청도에서 분기→창녕
    {color:'#388bfd', dash:true, stations:[
      {n:'청도',x:516,y:824},{n:'창녕',x:449,y:828},
    ]},
  ],
},

honam:{
  name:'호남선', color:'#3fb950',
  routes:[{color:'#3fb950', stations:[
    {n:'회덕',x:258,y:609},{n:'서대전',x:233,y:635},
    {n:'남대전',x:216,y:662},{n:'계룡',x:198,y:681},
    {n:'논산',x:185,y:702},{n:'연무',x:178,y:721},
    {n:'여산',x:172,y:741},{n:'봉동',x:163,y:760},
    {n:'전주',x:157,y:780},{n:'중인',x:151,y:804},
    {n:'남김제',x:145,y:824},{n:'신태인',x:139,y:844},
    {n:'정읍',x:132,y:865},{n:'입암',x:126,y:884},
    {n:'북이',x:119,y:900},{n:'장성',x:113,y:916},
    {n:'광주',x:103,y:939},{n:'나산',x:88,y:960},
    {n:'함평',x:76,y:978},{n:'무안',x:66,y:994},
    {n:'도림',x:55,y:1011},{n:'목포',x:45,y:1028},
  ]}],
},

jungang:{
  name:'중앙선', color:'#56d0e0',
  routes:[{color:'#56d0e0', stations:[
    {n:'청량리',x:244,y:314},{n:'중랑',x:266,y:329},
    {n:'도농',x:288,y:346},{n:'덕소',x:309,y:364},
    {n:'양수',x:331,y:382},{n:'양평',x:358,y:394},
    {n:'지정',x:385,y:416},{n:'원주',x:419,y:444},
    {n:'신림',x:430,y:471},{n:'제천',x:436,y:501},
    {n:'매포',x:442,y:525},{n:'단양',x:446,y:549},
    {n:'풍기',x:451,y:573},{n:'영주',x:456,y:603},
    {n:'문수',x:458,y:626},{n:'옹천',x:461,y:644},
    {n:'안동',x:463,y:668},{n:'의성',x:466,y:698},
    {n:'금성',x:469,y:722},{n:'이화',x:472,y:743},
    {n:'화본',x:475,y:761},{n:'신녕',x:478,y:779},
    {n:'영천',x:488,y:803},{n:'건천',x:503,y:817},
  ]}],
},

donghae:{
  name:'동해선', color:'#3fb994',
  routes:[{color:'#3fb994', stations:[
    {n:'강릉',x:572,y:345},{n:'남강릉',x:581,y:362},
    {n:'옥계',x:589,y:375},{n:'동해',x:597,y:390},
    {n:'북평',x:601,y:404},{n:'삼척',x:604,y:418},
    {n:'근덕',x:606,y:434},{n:'원덕',x:607,y:449},
    {n:'부구',x:608,y:464},{n:'울진',x:608,y:479},
    {n:'평해',x:607,y:494},{n:'영해',x:606,y:508},
    {n:'영덕',x:603,y:521},{n:'강구',x:598,y:535},
    {n:'청하',x:593,y:548},{n:'포항',x:586,y:562},
    {n:'안강',x:578,y:574},{n:'경주',x:568,y:586},
    {n:'불국사',x:560,y:597},{n:'입실',x:554,y:607},
    {n:'북울산',x:548,y:616},{n:'태화강',x:543,y:628},
    {n:'울주',x:545,y:640},{n:'좌천',x:547,y:652},
    {n:'기장',x:548,y:664},{n:'해운대',x:549,y:675},
    {n:'부산',x:531,y:914},
  ]}],
},

gangreung:{
  name:'강릉선', color:'#a855f7',
  routes:[
    // 청량리→원주 중앙선 경유 (점선)
    {color:'#a855f7', dash:true, stations:[
      {n:'청량리',x:244,y:314},{n:'덕소',x:309,y:364},
      {n:'양평',x:358,y:394},{n:'원주',x:419,y:444},
    ]},
    // 원주→강릉 본선
    {color:'#a855f7', stations:[
      {n:'원주',x:419,y:444},{n:'남횡성',x:450,y:428},
      {n:'방림',x:469,y:416},{n:'평창',x:496,y:405},
      {n:'진부',x:520,y:384},{n:'대관령',x:541,y:363},
      {n:'강릉',x:572,y:345},
    ]},
  ],
},

gyeongjeon:{
  name:'경전선', color:'#ef4444',
  routes:[
    {color:'#ef4444', stations:[
      {n:'부산',   x:600, y:928},
      {n:'장유',   x:565, y:925},
      {n:'창원',   x:538, y:923},
      {n:'함안',   x:508, y:920},
      {n:'군북',   x:483, y:914},
      {n:'진주',   x:454, y:933},
      {n:'횡천',   x:427, y:952},
      {n:'하동',   x:403, y:968},
      {n:'진상',   x:379, y:990},
      {n:'남광양', x:360, y:1004},
      {n:'순천',   x:341, y:1017},
      {n:'별량',   x:314, y:1033},
      {n:'동강',   x:287, y:1050},
      {n:'조성',   x:260, y:1063},
      {n:'보성',   x:234, y:1076},
      {n:'장흥',   x:210, y:1090},
      {n:'작천',   x:188, y:1102},
      {n:'영암',   x:172, y:1098},
      {n:'시종',   x:154, y:1088},
      {n:'일로',   x:136, y:1078},
      {n:'남악',   x:118, y:1068},
      {n:'목포',   x:84,  y:1058},
    ]},
    {color:'#ef4444', dash:true, stations:[
      {n:'조성',   x:260, y:1063},
      {n:'춘양',   x:238, y:1031},
      {n:'빛가람', x:214, y:996},
      {n:'광주',   x:195, y:966},
    ]},
    {color:'#ef4444', dash:true, stations:[
      {n:'춘양', x:238, y:1031},
      {n:'다시', x:179, y:1012},
      {n:'함평', x:149, y:993},
    ]},
  ],
},

jungnaelyuk:{
  name:'중부내륙선', color:'#84cc16',
  routes:[
    {color:'#84cc16', stations:[
      {n:'오산',   x:184, y:414},
      {n:'죽산',   x:235, y:424},
      {n:'일죽',   x:252, y:425},
      {n:'장호원', x:272, y:426},
      {n:'돈산',   x:291, y:432},
      {n:'충주',   x:314, y:442},
      {n:'수안보', x:330, y:477},
      {n:'북문경', x:347, y:511},
      {n:'문경',   x:343, y:544},
      {n:'상주',   x:364, y:580},
      {n:'청리',   x:382, y:680},
      {n:'김천',   x:388, y:736},
    ]},
  ],
},

};

let _mapCurrentStn=null;



function goToMapStation(){
  if(!_mapCurrentStn)return;
  document.getElementById('input-station').value=_mapCurrentStn;
  switchTab('station');
  searchByStation();
  closeMapPopup();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openMapPopup(stnName, lineName){
  _mapCurrentStn=stnName;
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  const toM=v=>{if(!v)return null;const m=String(v).match(/(\d+):(\d+)/);return m?+m[1]*60+ +m[2]:null;};
  const hasT=v=>v&&/\d+:\d+/.test(String(v));

  // 하루 운행 횟수
  const trains=ALL_TRAINS.filter(t=>t.stops.some(s=>s.s===stnName&&(s.arr||s.dep)));
  const cnt=trains.length;

  // 운행 노선
  const lineSet=new Set(trains.map(t=>t.line.split('·')[0].trim()));
  const linesStr=[...lineSet].join(', ');

  // 현재 운행 중 열차
  const running=trains.filter(t=>{
    const stop=t.stops.find(s=>s.s===stnName);
    if(!stop)return false;
    const arrM=toM(hasT(stop.arr)?stop.arr:null);
    const depM=toM(hasT(stop.dep)?stop.dep:null);
    const t1=arrM??depM, t2=depM??arrM;
    if(t1===null)return false;
    return nowMin>=t1-1&&nowMin<=(t2??t1)+1;
  });

  document.getElementById('map-popup-name').textContent=stnName+'역';
  document.getElementById('map-popup-sub').textContent=`운행 노선: ${linesStr||lineName}`;
  let html=`<div>하루 ${cnt}회 운행</div>`;
  if(running.length){
    html+=`<div style="margin-top:6px;color:var(--accent)">현재 운행 중:</div>`;
    html+=running.slice(0,5).map(t=>`<div>· ${t.no} (${t.grade}) ${t.dest}행</div>`).join('');
  }
  document.getElementById('map-popup-trains').innerHTML=html;
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}

function showMapLine(lineKey, btn){
  document.querySelectorAll('.map-line-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const line=MAP_LINES[lineKey];
  if(!line)return;

  // 좌표 범위
  let minX=9999,maxX=0,minY=9999,maxY=0;
  line.routes.forEach(r=>r.stations.forEach(s=>{
    minX=Math.min(minX,s.x);maxX=Math.max(maxX,s.x);
    minY=Math.min(minY,s.y);maxY=Math.max(maxY,s.y);
  }));
  const pad=90;
  const svgW=maxX-minX+pad*2;
  const svgH=maxY-minY+pad*2;
  const ox=pad-minX, oy=pad-minY;

  const parts=[];
  // viewBox는 원본 좌표 그대로, width는 컨테이너에 맞게 100%
  parts.push(`<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="min-width:${Math.min(svgW,400)}px;display:block;overflow:hidden" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="var(--bg1)"/>`);
  // 격자
  for(let x=0;x<svgW;x+=50)parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="#21262d" stroke-width="1"/>`);
  for(let y=0;y<svgH;y+=50)parts.push(`<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="#21262d" stroke-width="1"/>`);

  // 역 좌표 수집 (첫 등장 기준)
  const stnPos={};
  line.routes.forEach(r=>r.stations.forEach(s=>{
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

  line.routes.forEach(r=>{
    const isDash=r.dash||false;
    const d=smoothPath(r.stations, ox, oy);
    parts.push(`<path d="${d}" fill="none" stroke="${r.color}" stroke-width="${isDash?3:5}" stroke-linecap="round" stroke-linejoin="round" ${isDash?'stroke-dasharray="8,5"':''} opacity="${isDash?0.65:1}"/>`);
  });

  // 역 점 + 이름 (중복 없이)
  const rendered=new Set();
  line.routes.forEach(r=>{
    r.stations.forEach((s,i)=>{
      if(rendered.has(s.n))return;
      rendered.add(s.n);
      const x=s.x+ox, y=s.y+oy;
      const isEnd=i===0||i===r.stations.length-1;
      const r2=isEnd?7:5;
      const sw=isEnd?3:2;
      // 히트 영역
      parts.push(`<circle cx="${x}" cy="${y}" r="${r2+8}" fill="transparent" style="cursor:pointer" onclick="openMapPopup('${s.n}','${line.name}')"/>`);
      // 역 점
      parts.push(`<circle cx="${x}" cy="${y}" r="${r2}" fill="#161b22" stroke="${r.color}" stroke-width="${sw}" pointer-events="none"/>`);
      // 역명
      // 인접 역 방향 기반 텍스트 위치 결정
      // 이전/다음 역의 x 평균으로 텍스트를 반대쪽에 배치
      const allStnList=line.routes.flatMap(r=>r.stations);
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
      const manualOffset={'목포':[-16,0],'광주':[0,-14],'함평':[-14,0],'부산':[14,0]};
      if(manualOffset[s.n]){
        tx=x+manualOffset[s.n][0];
        ty=y+manualOffset[s.n][1]+4;
        anchor=manualOffset[s.n][0]<0?'end':manualOffset[s.n][0]>0?'start':'middle';
      }
      parts.push(`<text x="${tx}" y="${ty}" fill="#e6edf3" font-size="${isEnd?12:11}" font-weight="${isEnd?700:400}" text-anchor="${anchor}" pointer-events="none" font-family="Noto Sans KR,sans-serif">${s.n}</text>`);
    });
  });

  parts.push(`<text x="14" y="22" fill="${line.color}" font-size="14" font-weight="700" font-family="Noto Sans KR,sans-serif">${line.name}</text>`);
  parts.push('</svg>');

  document.getElementById('map-svg-wrap').innerHTML=parts.join('');

  // 범례
  document.getElementById('map-legend').innerHTML=`
    <div class="map-legend-item"><div class="map-legend-line" style="background:${line.color}"></div><span>${line.name} 본선</span></div>
    <div class="map-legend-item"><div class="map-legend-line" style="background:${line.color};opacity:.5"></div><span>지선 / 경유</span></div>
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
  const el=document.getElementById('result-stats');
  if(!el)return;

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
    const lines=t.line.split('·');
    lines.forEach(l=>{const ll=l.trim();lineCount[ll]=(lineCount[ll]||0)+1;});
  });

  // 현재 운행 중
  const runningTrains=ALL_TRAINS.filter(t=>{
    const st=getCurrentStatus(t);
    return st&&st.status==='running';
  });
  const running=runningTrains.length;

  // 노선별 첫차/막차 계산
  const lineFirstLast={};
  const LINE_NAMES=['경부선','경부고속선','호남선','중앙선','동해선','강릉선','중부내륙선'];
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
      <div class="hourly-bar" style="height:${maxHourly?Math.round(v/maxHourly*50):0}px" title="${h}시: ${v}회"></div>
      <div class="hourly-label">${h%3===0?h:''}</div>
    </div>`).join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">📊 운행 통계</div><button class="btn" style="font-size:12px;padding:4px 8px" onclick="renderStats()">🔄</button></div>

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
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <div class="autocomplete-wrap" style="width:140px">
          <input type="text" id="stat-stn-input" placeholder="역명 입력" autocomplete="off"
            oninput="acShow('stat-stn-input','ac-stat-stn')"
            onkeydown="acKey(event,'stat-stn-input','ac-stat-stn')"
            onblur="setTimeout(()=>acHide('ac-stat-stn'),150)">
          <div class="ac-dropdown" id="ac-stat-stn"></div>
        </div>
        <button class="btn" style="font-size:12px;padding:6px 12px" onclick="calcStationFirstLast()">조회</button>
      </div>
      <div id="stat-stn-fl-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">구간별 운행 열차 수</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <div class="autocomplete-wrap" style="width:100px">
          <input type="text" id="stat-from" placeholder="출발역" autocomplete="off"
            oninput="acShow('stat-from','ac-stat-from')"
            onkeydown="acKey(event,'stat-from','ac-stat-from')"
            onblur="setTimeout(()=>acHide('ac-stat-from'),150)">
          <div class="ac-dropdown" id="ac-stat-from"></div>
        </div>
        <span style="color:var(--text3)">→</span>
        <div class="autocomplete-wrap" style="width:100px">
          <input type="text" id="stat-to" placeholder="도착역" autocomplete="off"
            oninput="acShow('stat-to','ac-stat-to')"
            onkeydown="acKey(event,'stat-to','ac-stat-to')"
            onblur="setTimeout(()=>acHide('ac-stat-to'),150)">
          <div class="ac-dropdown" id="ac-stat-to"></div>
        </div>
        <button class="btn" style="font-size:12px;padding:6px 12px" onclick="calcSectionTrains()">조회</button>
      </div>
      <div id="stat-section-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">노선별 운행 밀도 (피크 vs 한산)</div>
      <div>${densityRows}</div>
    </div>
    <p class="hint">※ ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} 현재 기준 · AM 4:00 기준일</p>`;
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

function renderNotice(){
  const el=document.getElementById('result-notice');
  if(!el)return;
  if(!NOTICES.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">📢</div><p>등록된 공지사항이 없습니다.</p></div>`;
    return;
  }
  const read=getReadNotices();
  // 최신순(배열 역순)
  const rows=NOTICES.map((n,i)=>{
    const isUnread=!read.includes(i);
    return `<div class="notice-row${isUnread?' unread':''}" onclick="openNoticeDetail(${i})">
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
  }).reverse().join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">📢 공지사항</div><span class="badge blue">${NOTICES.length}건</span></div>
    <div class="notice-list">${rows}</div>`;
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
