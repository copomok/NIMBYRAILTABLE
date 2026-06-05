

const GC={'KTX':'KTX','SRT':'SRT','ITX-새마을':'ITX','ITX-청춘':'ITXCC','무궁화호':'MGH'};
const GL={'KTX':'KTX','SRT':'SRT','ITX-새마을':'ITX-새마을','ITX-청춘':'ITX-청춘','무궁화호':'무궁화'};
function gc(g){return GC[g]||'MGH';}
function gradeHtml(g){return `<span class="grade g-${gc(g)}">${GL[g]||g}</span>`;}
function trainChip(no,g,fn){return `<span class="tc tc-${gc(g)}" onclick="${fn}">${no}</span>`;}
function dirLabel(d){return d==='down'?'<span class="dir down"><span class="dir-dot"></span>하행</span>':'<span class="dir up"><span class="dir-dot"></span>상행</span>';}
function toMin(v){if(!v)return null;const m=v.match(/(\d+):(\d+)/);return m?+m[1]*60+ +m[2]:null;}
function hasTime(v){return v&&/\d+:\d+/.test(v);}

const ALL_STATIONS=[...new Set(ALL_TRAINS.flatMap(t=>t.stops.map(s=>s.s)))].sort((a,b)=>a.localeCompare(b,'ko'));

const acIdxMap={};
function acShow(iid,did){
  const inp=document.getElementById(iid),drop=document.getElementById(did);
  const q=inp.value.trim();
  if(!q){drop.className='ac-dropdown';return;}
  const hits=ALL_STATIONS.filter(s=>s.includes(q)).slice(0,12);
  if(!hits.length){drop.className='ac-dropdown';return;}
  const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
  drop.innerHTML=hits.map(s=>`<div class="ac-item" onmousedown="acSel('${iid}','${did}','${s}')">${s.replace(re,m=>`<mark>${m}</mark>`)}</div>`).join('');
  drop.className='ac-dropdown show'; acIdxMap[did]=-1;
}
function acHide(did){document.getElementById(did).className='ac-dropdown';}
function acSel(iid,did,val){document.getElementById(iid).value=val;acHide(did);}
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
function switchTab(n){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+n).classList.add('active');
  document.getElementById('panel-'+n).classList.add('active');
  if(n==='map'){
    // 노선도 탭 진입 시만 렌더링
    if(!document.getElementById('map-svg-wrap').innerHTML.trim()){
      showMapLine('gyeongbu', document.querySelector('.map-line-tab'));
    }
  } else {
    // 다른 탭으로 이동 시 열차 오버레이 인터벌 정지
    _mapCurrentLine=null;
  }
  if(n==='alarm') renderAlarms();
  if(n==='fav') renderFavs();
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
      <td><span class="line-chip">${t.line}</span></td>
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
  const depTime=t.stops.find(s=>hasTime(s.dep))?.dep||'-';
  const status=getCurrentStatus(t);
  let rows=''; let seq=0;
  t.stops.forEach(s=>{
    const arr=s.arr,dep=s.dep;
    if(!arr&&!dep)return;
    const isOrigin=s.s===originStn, isTerm=s.s===terminusStn;
    const isPass=!isOrigin&&!isTerm&&isPassStop(t,s.s);
    seq++;
    // 현재 열차 위치 하이라이트
    let hlClass='';
    if(status?.status==='running'){
      if(status.passStn&&s.s===status.passStn) hlClass=' hl-pass';
      else if(status.atStn&&s.s===status.atStn) hlClass=' hl-at';
      // 정차 중일 땐 prevStn 하이라이트 없음
      // 이동 중일 땐 prevStn, nextStn 둘 다 진한 파랑
      else if(!status.atStn&&status.prevStn&&s.s===status.prevStn) hlClass=' hl-next';
      else if(!status.atStn&&status.nextStn&&s.s===status.nextStn) hlClass=' hl-next';
    }
    const rc=(isPass?'sr pass-row':isOrigin?'sr origin':isTerm?'sr terminus':'sr')+hlClass;
    const arrCell=hasTime(arr)?`<span class="t-arr">${arr}</span>`:isOrigin?'<span style="color:var(--text3);font-size:11px">출발역</span>':'';
    const depCell=hasTime(dep)?`<span class="t-dep">${dep}</span>`:isTerm?'<span style="color:var(--text3);font-size:11px">종착역</span>':'';
    const trainIcon=hlClass?' <span class="current-train-icon"></span>':'';
    // 통과역은 알람 버튼 없음
    const tno=t.no, tstn=s.s;
    const hasArr=hasTime(arr), hasDep=hasTime(dep);
    const sIdx=t.stops.findIndex(x=>x.s===tstn);
    const prevStop=sIdx>0?t.stops.slice(0,sIdx).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr)):null;
    const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;
    // 알람: 통과역은 버튼 없음
    let alarmCell='<div style="display:flex;align-items:center;justify-content:center">';
    if(!isPass){
      const boardSet=hasAlarm(`board:${tno}:${tstn}`);
      const arrSet=hasAlarm(`arr:${tno}:${tstn}`);
      const anySet=boardSet||arrSet;
      alarmCell+=`<button class="alarm-bell-btn${anySet?' has-alarm':''}" onclick="openAlarmPopup('${tno}','${tstn}','${arr||''}','${dep||''}','${prevTime||''}')" title="알람 설정">🔔</button>`;
    }
    alarmCell+='</div>';
    rows+=`<div class="${rc}"><div class="stn-idx">${seq}</div><div class="stn-name">${tstn}${trainIcon}</div><div>${arrCell}</div><div>${depCell}</div>${alarmCell}</div>`;
  });
  const c=gc(t.grade);
  const cardId='dc-'+t.no;
  // 운행 상태 배너
  let statusBanner='';
  if(status){
    if(status.status==='running'){
      let msg;
      if(status.passStn) msg=`${status.passStn}역을 통과 중입니다`;
      else if(status.atStn) msg=`${status.atStn}역에 정차 중입니다`;
      else if(status.nextStn) msg=`${status.nextStn}역으로 이동 중입니다`;
      else msg='운행 중입니다';
      statusBanner=`<div class="train-status-banner running">🚆 ${msg}</div>`;
    } else if(status.status==='before'){
      statusBanner=`<div class="train-status-banner before">운행 전 열차입니다</div>`;
    } else {
      statusBanner=`<div class="train-status-banner done">운행이 종료된 열차입니다</div>`;
    }
  }
  return `<div class="detail-card" id="${cardId}">
    <div class="detail-head">
      <div class="detail-no" style="color:var(--c-${c.toLowerCase()})">${t.no}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${gradeHtml(t.grade)}<span class="line-chip">${t.line}</span><span class="detail-dest">${t.dest}행</span></div>
        <div class="detail-meta"><span>${dirLabel(t.dir)}</span><span>첫 출발 ${depTime}</span><span>${originStn} → ${terminusStn}</span></div>
      </div>
      <button class="btn-pass-toggle" onclick="togglePass('${cardId}')" title="통과역 표시/숨김">통과역 숨기기</button>
    </div>
    ${statusBanner}
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <div class="stn-grid" style="min-width:420px">
        <div class="stn-gh">#</div><div class="stn-gh">역명</div>
        <div class="stn-gh green">도착</div><div class="stn-gh blue">출발</div>
        <div class="stn-gh alarm-col">알람</div>
        ${rows}
      </div>
    </div>
  </div>`;
}

function searchByStation(){
  const stn=document.getElementById('input-station').value.trim();
  const dir=document.getElementById('sel-dir-station').value;
  const lineF=document.getElementById('sel-line-station').value;
  const passF=document.getElementById('sel-pass-station').value;
  const afterRaw=document.getElementById('input-after-time').value.trim();
  const afterMin=afterRaw?toMin(afterRaw):null;
  const gradeF=document.getElementById('sel-grade-station').value;
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
    results.push({t,stop,isPass,sortT});
  });
  results.sort((a,b)=>a.sortT-b.sortT);
  if(!results.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🚫</div><p><b>${stn}</b>에 정차하는 열차가 없습니다</p></div>`;return;}
  const rows=results.map(({t,stop,isPass,sortT})=>{
    const arr=stop.arr,dep=stop.dep;
    const aC=hasTime(arr)?`<span class="time-arr">${arr}</span>`:'<span style="color:var(--text3)">-</span>';
    const dC=hasTime(dep)?`<span class="time-dep">${dep}</span>`:'<span style="color:var(--text3)">-</span>';
    const rs=isPass?'style="opacity:.6;font-style:italic"':'';
    return `<tr ${rs} data-sort="${sortT}" onclick="jumpToTrain('${t.no}')">
      <td>${trainChip(t.no,t.grade,`event.stopPropagation();jumpToTrain('${t.no}')`)}</td>
      <td>${gradeHtml(t.grade)}</td><td><span class="line-chip">${t.line}</span></td>
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

function searchByRoute(){
  const from=document.getElementById('input-from').value.trim();
  const to=document.getElementById('input-to').value.trim();
  const afterRaw=document.getElementById('input-after-route').value.trim();
  const afterMin=afterRaw?toMin(afterRaw):null;
  const el=document.getElementById('result-route');
  if(!from||!to){el.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><p>출발역과 도착역을 입력하세요</p></div>';return;}
  if(from===to){el.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>출발역과 도착역이 같습니다</p></div>';return;}

  function getStopTime(stop){
    if(hasTime(stop.dep))return stop.dep;
    if(hasTime(stop.arr))return stop.arr;
    return null;
  }
  function durStr(depT,arrT){
    if(!depT||!arrT)return '-';
    const d=toMin(arrT)-toMin(depT);
    if(d<=0)return '-';
    return d<60?`${d}m`:`${Math.floor(d/60)}h ${d%60}m`;
  }

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
    directs.push({t,depT,arrT,dur:durStr(depT,arrT),sortT:toMin(depT)??9999});
  });
  directs.sort((a,b)=>a.sortT-b.sortT);

  // 직통 있으면 직통만 표시
  if(directs.length){
    const afterLabel=afterMin!==null?` · ${afterRaw} 이후`:'';
    const rows=directs.map(({t,depT,arrT,dur})=>
      `<tr onclick="jumpToTrain('${t.no}')">
        <td>${trainChip(t.no,t.grade,`event.stopPropagation();jumpToTrain('${t.no}')`)}</td>
        <td>${gradeHtml(t.grade)}</td><td><span class="line-chip">${t.line}</span></td>
        <td>${dirLabel(t.dir)}</td><td style="font-weight:500">${t.dest}</td>
        <td><span class="time-dep">${depT||'-'}</span></td>
        <td><span class="time-arr">${arrT||'-'}</span></td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text2)">${dur}</td>
      </tr>`
    ).join('');
    const fb=document.getElementById('fav-btn-route');
    if(fb)fb.style.display='';
    el.innerHTML=`<div class="result-header"><div class="result-title">🔍 ${from} → ${to}${afterLabel}</div><span class="badge blue">${directs.length}편</span></div>
    <div class="table-wrap"><table><thead><tr><th>열차</th><th>등급</th><th>노선</th><th>방향</th><th>행선지</th><th>출발</th><th>도착</th><th>소요</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">※ 열차번호 클릭 시 전체 운행 정보 조회</p>`;
    return;
  }

  // ── 직통 없음 → 환승 탐색 ──
  // 1회 환승: from → 환승역(t1) → to(t2)
  // 2회 환승: from → 환승역1(t1) → 환승역2(t2) → to(t3)
  const MIN_WAIT=3, MAX_WAIT=60;

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
      transfers.push({
        legs:[
          {t:l1.t,from,to:xStn,depT:l1.depT,arrT:l1.arrT},
          {t:t2,from:xStn,to,depT:dep2T,arrT:arr2T}
        ],
        totalDur:durStr(l1.depT,arr2T),
        totalM,
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
  transfers.sort((a,b)=>a.totalM-b.totalM);
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
          <span class="line-chip">${l.t.line}</span>
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
    el.innerHTML='<div class="alarm-empty"><div style="font-size:36px;margin-bottom:12px">🔔</div><p>설정된 알람이 없습니다.<br>열차 상세에서 🔔 버튼으로 추가하세요.</p></div>';
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
          new Notification('🔔 님비레일 알람',{body,icon:'',requireInteraction:false});
        }
      }
    }
  });
  if(changed){saveAlarms(alarms);renderAlarmIfOpen();}
}
// 10초마다 체크 (30초는 너무 길어 알람을 놓칠 수 있음)
setInterval(checkAlarms,10000);
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
  if(!el)return;
  const favs=loadFavs();
  if(!favs.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">⭐</div><p>즐겨찾기가 비어있습니다.<br>각 탭의 ⭐ 버튼으로 추가해보세요.</p></div>';
    return;
  }
  const typeIcon={train:'🚆',station:'🏢',route:'🔍'};
  const cards=favs.map(f=>{
    const info=getFavInfo(f);
    // station은 두 줄(lines), 나머지는 한 줄(sub)
    const subHtml=info.lines
      ? info.lines.map(l=>`<div class="fav-sub">${l}</div>`).join('')
      : `<div class="fav-sub">${info.sub||''}</div>`;
    return `<div class="fav-card" onclick="runFav(${JSON.stringify(f).replace(/"/g,'&quot;')})">
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

  // 열차 레이어를 SVG 문자열로 생성 (innerHTML 방식 - 크로스브라우저 호환)
  const r=Math.max(6, _mapSvgSize.w*0.018);
  const fs=Math.max(9, _mapSvgSize.w*0.016);
  let layerHtml='<g id="train-layer">';
  running.forEach(({t,px,py,status})=>{
    const color=GRADE_COLORS[t.grade]||'#888';
    // 클릭 이벤트는 data 속성으로 전달
    layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}"
      fill="${color}" stroke="#0d1117" stroke-width="2"
      style="cursor:pointer" class="train-dot" data-no="${t.no}"/>`;
    layerHtml+=`<text x="${px.toFixed(1)}" y="${(py-r-3).toFixed(1)}"
      text-anchor="middle" font-size="${fs}" fill="${color}"
      font-family="Noto Sans KR,sans-serif" font-weight="600"
      pointer-events="none">${t.no}</text>`;
  });
  layerHtml+='</g>';

  // SVG에 레이어 삽입
  const tempDiv=document.createElement('div');
  tempDiv.innerHTML=`<svg>${layerHtml}</svg>`;
  const newLayer=tempDiv.querySelector('g');
  if(newLayer) svgEl.appendChild(newLayer);

  // 클릭 이벤트 등록
  svgEl.querySelectorAll('.train-dot').forEach(dot=>{
    const no=dot.getAttribute('data-no');
    const entry=running.find(r=>r.t.no===no);
    if(entry) dot.addEventListener('click',()=>openMapTrainPopup(entry.t, entry.status));
  });

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
  // 버튼을 시간표 보기 → 열차 조회로 변경
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){
    popupBtn.textContent='🔢 열차 조회';
    popupBtn.onclick=()=>{
      jumpToTrain(t.no);
      closeMapPopup();
    };
  }
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}

// 60초마다 열차 위치 갱신
setInterval(()=>{
  if(_mapCurrentLine&&document.getElementById('panel-map').classList.contains('active')){
    updateMapTrains();
  }
},60000);

const MAP_LINES = {

// SVG 좌표계: 800 x 1600 (넉넉하게)
gyeongbu:{
  name:'경부선', color:'#e3b341',
  routes:[
    {color:'#e3b341', stations:[
      {n:'서울',     x:280,y:80},
      {n:'한강로',   x:268,y:108},
      {n:'남안양',   x:255,y:140},
      {n:'수원',     x:260,y:175},
      {n:'오산',     x:257,y:210},
      {n:'평택',     x:254,y:248},
      {n:'천안',     x:268,y:300},
      {n:'목천',     x:282,y:328},
      {n:'병천',     x:294,y:354},
      {n:'북청주',   x:306,y:380},
      {n:'서청주',   x:320,y:410},
      {n:'상당',     x:328,y:436},
      {n:'문의',     x:322,y:464},
      {n:'신탄진',   x:316,y:492},
      {n:'회덕',     x:312,y:516},
      {n:'대전',     x:316,y:548},
      {n:'판암',     x:322,y:576},
      {n:'세천',     x:330,y:602},
      {n:'옥천',     x:340,y:628},
      {n:'이원',     x:348,y:652},
      {n:'심천',     x:356,y:674},
      {n:'영동',     x:368,y:696},
      {n:'황간',     x:392,y:716},
      {n:'추풍령',   x:416,y:732},
      {n:'봉산',     x:440,y:744},
      {n:'김천',     x:462,y:752},
      {n:'구미',     x:492,y:748},
      {n:'약목',     x:516,y:760},
      {n:'서왜관',   x:530,y:776},
      {n:'하빈',     x:544,y:794},
      {n:'호림',     x:556,y:812},
      {n:'남대구',   x:570,y:836},
      {n:'경산',     x:592,y:844},
      {n:'운문',     x:610,y:858},
      {n:'언양',     x:622,y:876},
      {n:'동양산',   x:626,y:896},
      {n:'북부산',   x:622,y:916},
      {n:'동래',     x:618,y:936},
      {n:'부산',     x:612,y:958},
    ]},
  ],
},

gyeongbuhs:{
  name:'경부고속선', color:'#388bfd',
  routes:[
    // 본선: 서울→부산 (최대한 직선)
    {color:'#388bfd', stations:[
      {n:'서울',   x:280,y:80},
      {n:'한강로', x:268,y:108},
      {n:'병목안', x:240,y:148},
      {n:'수영',   x:252,y:180},
      {n:'천안',   x:268,y:300},
      {n:'정안',   x:268,y:348},
      {n:'세종',   x:272,y:396},
      {n:'대전',   x:316,y:548},
      {n:'산내',   x:330,y:588},
      {n:'영동',   x:368,y:696},
      {n:'구미',   x:492,y:748},
      {n:'남대구', x:570,y:836},
      {n:'청도',   x:600,y:872},
      {n:'부산',   x:612,y:958},
    ]},
    // 잠실 지선
    {color:'#388bfd', dash:true, stations:[
      {n:'잠실',  x:370,y:72},
      {n:'동탄',  x:312,y:228},
      {n:'천안',  x:268,y:300},
    ]},
    // 서인천 지선
    {color:'#388bfd', dash:true, stations:[
      {n:'서인천', x:108,y:164},
      {n:'수영',   x:252,y:180},
    ]},
    // 포항 분기
    {color:'#388bfd', dash:true, stations:[
      {n:'청도',  x:600,y:872},
      {n:'포항',  x:680,y:864},
    ]},
    // 창녕 분기
    {color:'#388bfd', dash:true, stations:[
      {n:'부산',  x:612,y:958},
      {n:'창녕',  x:480,y:990},
    ]},
  ],
},

honam:{
  name:'호남선', color:'#3fb950',
  routes:[
    {color:'#3fb950', stations:[
      {n:'회덕',   x:312,y:516},
      {n:'서대전', x:292,y:558},
      {n:'남대전', x:272,y:594},
      {n:'계룡',   x:252,y:626},
      {n:'논산',   x:236,y:660},
      {n:'연무',   x:222,y:692},
      {n:'여산',   x:210,y:722},
      {n:'봉동',   x:198,y:752},
      {n:'전주',   x:190,y:782},
      {n:'중인',   x:182,y:814},
      {n:'남김제', x:174,y:844},
      {n:'신태인', x:166,y:876},
      {n:'정읍',   x:158,y:908},
      {n:'입암',   x:150,y:936},
      {n:'북이',   x:142,y:962},
      {n:'장성',   x:134,y:988},
      {n:'광주',   x:122,y:1022},
      {n:'나산',   x:104,y:1056},
      {n:'함평',   x:88,y:1088},
      {n:'무안',   x:74,y:1116},
      {n:'도림',   x:62,y:1144},
      {n:'목포',   x:50,y:1172},
    ]},
  ],
},

jungang:{
  name:'중앙선', color:'#56d0e0',
  routes:[
    {color:'#56d0e0', stations:[
      {n:'청량리', x:354,y:80},
      {n:'중랑',   x:376,y:104},
      {n:'도농',   x:400,y:130},
      {n:'덕소',   x:424,y:156},
      {n:'양수',   x:448,y:180},
      {n:'양평',   x:476,y:200},
      {n:'지정',   x:506,y:224},
      {n:'원주',   x:542,y:256},
      {n:'신림',   x:558,y:290},
      {n:'제천',   x:568,y:328},
      {n:'매포',   x:576,y:362},
      {n:'단양',   x:582,y:396},
      {n:'풍기',   x:586,y:432},
      {n:'영주',   x:592,y:472},
      {n:'문수',   x:596,y:504},
      {n:'옹천',   x:598,y:534},
      {n:'안동',   x:600,y:566},
      {n:'의성',   x:602,y:604},
      {n:'금성',   x:604,y:636},
      {n:'이화',   x:606,y:664},
      {n:'화본',   x:608,y:690},
      {n:'신녕',   x:610,y:716},
      {n:'영천',   x:616,y:744},
      {n:'건천',   x:624,y:768},
    ]},
  ],
},

donghae:{
  name:'동해선', color:'#3fb994',
  routes:[
    {color:'#3fb994', stations:[
      {n:'강릉',   x:650,y:80},
      {n:'남강릉', x:656,y:116},
      {n:'옥계',   x:662,y:152},
      {n:'동해',   x:668,y:190},
      {n:'북평',   x:672,y:226},
      {n:'삼척',   x:675,y:262},
      {n:'근덕',   x:677,y:298},
      {n:'원덕',   x:679,y:334},
      {n:'부구',   x:680,y:370},
      {n:'울진',   x:681,y:408},
      {n:'평해',   x:681,y:444},
      {n:'영해',   x:680,y:478},
      {n:'영덕',   x:678,y:512},
      {n:'강구',   x:675,y:546},
      {n:'청하',   x:671,y:578},
      {n:'포항',   x:680,y:616},
      {n:'안강',   x:666,y:648},
      {n:'경주',   x:654,y:682},
      {n:'불국사', x:644,y:712},
      {n:'입실',   x:636,y:740},
      {n:'북울산', x:628,y:766},
      {n:'태화강', x:622,y:792},
      {n:'울주',   x:624,y:820},
      {n:'좌천',   x:626,y:846},
      {n:'기장',   x:628,y:872},
      {n:'해운대', x:629,y:898},
      {n:'부산',   x:612,y:958},
    ]},
  ],
},

};

let _mapCurrentStn=null;

function closeMapPopup(){
  document.getElementById('map-popup').style.display='none';
  document.getElementById('map-backdrop').style.display='none';
  _mapCurrentStn=null;
}

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

  // 선 그리기
  line.routes.forEach(r=>{
    const pts=r.stations.map(s=>`${s.x+ox},${s.y+oy}`).join(' ');
    const isDash=r.dash||false;
    parts.push(`<polyline points="${pts}" fill="none" stroke="${r.color}" stroke-width="${isDash?3:5}" stroke-linecap="round" stroke-linejoin="round" ${isDash?'stroke-dasharray="8,5"':''} opacity="${isDash?0.65:1}"/>`);
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
      const anchor=x>svgW/2?'end':'start';
      const tx=x+(anchor==='start'?13:-13);
      parts.push(`<text x="${tx}" y="${y+4}" fill="#e6edf3" font-size="${isEnd?12:11}" font-weight="${isEnd?700:400}" text-anchor="${anchor}" pointer-events="none" font-family="Noto Sans KR,sans-serif">${s.n}</text>`);
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
}


