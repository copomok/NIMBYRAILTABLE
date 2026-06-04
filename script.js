
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
  if(n==='map'&&!document.getElementById('map-svg-wrap').innerHTML.trim()){
    showMapLine('gyeongbu', document.querySelector('.map-line-tab'));
  }
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
  const firstDep=toMin(all[0].s.dep||all[0].s.arr);
  const lastArr=toMin(all[all.length-1].s.arr||all[all.length-1].s.dep);
  if(nowMin<firstDep)return{status:'before'};
  if(nowMin>lastArr)return{status:'done'};
  for(let i=0;i<all.length;i++){
    const {s,idx}=all[i];
    const arrM=toMin(s.arr);
    const depM=toMin(s.dep);
    const leaveM=depM??arrM;
    // 정차 중: arrM <= now <= depM
    if(arrM!==null&&depM!==null&&nowMin>=arrM&&nowMin<=depM){
      return{status:'running',atStn:s.s,prevStn:i>0?all[i-1].s.s:null,nowMin};
    }
    // 이동 중: leaveM < now < 다음 정차역 arrM
    if(i+1<all.length){
      const {s:nextS,idx:nextIdx}=all[i+1];
      const nextArrM=toMin(nextS.arr)||toMin(nextS.dep);
      if(leaveM!==null&&nextArrM!==null&&nowMin>leaveM&&nowMin<nextArrM){
        // 두 정차역 사이 통과역 확인 (원본 인덱스 사용)
        for(let j=idx+1;j<nextIdx;j++){
          const mid=t.stops[j];
          if(!isPassStop(t,mid.s))continue;
          const midM=toMin(mid.arr)||toMin(mid.dep);
          if(midM!==null&&midM===nowMin){
            return{status:'running',passStn:mid.s,prevStn:s.s,nowMin};
          }
        }
        return{status:'running',prevStn:s.s,nextStn:nextS.s,nowMin};
      }
    }
  }
  return{status:'running',nextStn:all[all.length-1].s.s,nowMin};
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
    rows+=`<div class="${rc}"><div class="stn-idx">${seq}</div><div class="stn-name">${s.s}${trainIcon}</div><div>${arrCell}</div><div>${depCell}</div></div>`;
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
    <div class="stn-grid">
      <div class="stn-gh">#</div><div class="stn-gh">역명</div>
      <div class="stn-gh green">도착</div><div class="stn-gh blue">출발</div>
      ${rows}
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
 
function jumpToTrain(no){
  document.getElementById('input-trainno').value=no;
  switchTab('train');searchByTrain();
  window.scrollTo({top:0,behavior:'smooth'});
}
 
 
// ── 노선도 ──
const MAP_LINES = {
 
// 경부선(빨강): 서울(북) → 수원 → 대전(중앙 약간 서) → 대구(동쪽) → 부산(남동)
gyeongbu:{
  name:'경부선', color:'#e3b341',
  routes:[
    {color:'#e3b341',stations:[
      {n:'서울',      x:578, y:50},
      {n:'한강로',    x:570, y:90},
      {n:'남안양',    x:552, y:130},
      {n:'수원',      x:541, y:168},
      {n:'오산',      x:534, y:202},
      {n:'평택',      x:527, y:238},
      {n:'천안',      x:518, y:278},
      {n:'목천',      x:513, y:312},
      {n:'병천',      x:510, y:344},
      {n:'북청주',    x:507, y:376},
      {n:'서청주',    x:505, y:406},
      {n:'상당',      x:503, y:434},
      {n:'문의',      x:502, y:462},
      {n:'신탄진',    x:500, y:490},
      {n:'회덕',      x:500, y:518},
      {n:'대전',      x:502, y:552},
      {n:'판암',      x:507, y:583},
      {n:'세천',      x:513, y:610},
      {n:'옥천',      x:522, y:636},
      {n:'이원',      x:532, y:660},
      {n:'심천',      x:544, y:683},
      {n:'영동',      x:558, y:705},
      {n:'황간',      x:573, y:726},
      {n:'추풍령',    x:590, y:746},
      {n:'봉산',      x:609, y:764},
      {n:'김천',      x:629, y:780},
      {n:'구미',      x:654, y:798},
      {n:'약목',      x:677, y:814},
      {n:'서왜관',    x:695, y:828},
      {n:'하빈',      x:711, y:842},
      {n:'호림',      x:722, y:856},
      {n:'남대구',    x:731, y:874},
      {n:'경산',      x:748, y:896},
      {n:'운문',      x:768, y:918},
      {n:'언양',      x:785, y:938},
      {n:'동양산',    x:796, y:957},
      {n:'북부산',    x:799, y:976},
      {n:'동래',      x:796, y:994},
      {n:'부산',      x:789, y:1014},
    ]},
  ],
},
 
// 경부고속선(파랑): 서울 → 직선에 가깝게 남하 → 대전 → 대구 → 부산
gyeongbuhs:{
  name:'경부고속선', color:'#388bfd',
  routes:[
    // 본선
    {color:'#388bfd',stations:[
      {n:'서울',    x:561, y:50},
      {n:'한강로',  x:554, y:88},
      {n:'병목안',  x:544, y:138},
      {n:'수영',    x:536, y:178},
      {n:'천안',    x:518, y:268},
      {n:'정안',    x:510, y:312},
      {n:'세종',    x:503, y:352},
      {n:'대전',    x:496, y:392},
      {n:'산내',    x:493, y:432},
      {n:'영동',    x:502, y:478},
      {n:'구미',    x:547, y:546},
      {n:'남대구',  x:592, y:598},
      {n:'청도',    x:626, y:648},
      {n:'부산',    x:660, y:720},
    ]},
    // 잠실 지선 (서울 동쪽 → 동탄 → 천안)
    {color:'#388bfd',dash:true,stations:[
      {n:'잠실',  x:714, y:65},
      {n:'동탄',  x:646, y:200},
      {n:'천안',  x:518, y:268},
    ]},
    // 서인천 지선 (수영에서 서쪽 분기)
    {color:'#388bfd',dash:true,stations:[
      {n:'서인천', x:252, y:162},
      {n:'수영',   x:536, y:178},
    ]},
    // 포항 분기 (청도 → 포항, 동쪽)
    {color:'#388bfd',dash:true,stations:[
      {n:'청도',  x:626, y:648},
      {n:'포항',  x:816, y:668},
    ]},
    // 창녕 분기 (부산 → 창녕, 서쪽)
    {color:'#388bfd',dash:true,stations:[
      {n:'부산',  x:660, y:720},
      {n:'창녕',  x:476, y:750},
    ]},
  ],
},
 
// 호남선(노랑): 회덕 → 논산 → 전주 → 광주 → 목포 (서쪽으로 향함)
honam:{
  name:'호남선', color:'#3fb950',
  routes:[
    {color:'#3fb950',stations:[
      {n:'회덕',    x:500, y:50},
      {n:'서대전',  x:473, y:84},
      {n:'남대전',  x:450, y:116},
      {n:'계룡',    x:428, y:148},
      {n:'논산',    x:408, y:180},
      {n:'연무',    x:388, y:208},
      {n:'여산',    x:371, y:234},
      {n:'봉동',    x:357, y:258},
      {n:'전주',    x:347, y:284},
      {n:'중인',    x:337, y:310},
      {n:'남김제',  x:326, y:336},
      {n:'신태인',  x:320, y:362},
      {n:'정읍',    x:313, y:390},
      {n:'입암',    x:306, y:416},
      {n:'북이',    x:299, y:440},
      {n:'장성',    x:292, y:466},
      {n:'광주',    x:286, y:498},
      {n:'나산',    x:269, y:528},
      {n:'함평',    x:252, y:556},
      {n:'무안',    x:235, y:582},
      {n:'도림',    x:218, y:606},
      {n:'목포',    x:201, y:632},
    ]},
  ],
},
 
// 중앙선(하늘): 청량리 → 강원도 경유(북동) → 영주 → 안동 → 영천 → 건천
jungang:{
  name:'중앙선', color:'#56d0e0',
  routes:[
    {color:'#56d0e0',stations:[
      {n:'청량리',  x:476, y:50},
      {n:'중랑',    x:507, y:72},
      {n:'도농',    x:541, y:95},
      {n:'덕소',    x:575, y:118},
      {n:'양수',    x:609, y:142},
      {n:'양평',    x:646, y:166},
      {n:'지정',    x:683, y:194},
      {n:'원주',    x:721, y:228},
      {n:'신림',    x:751, y:262},
      {n:'제천',    x:779, y:300},
      {n:'매포',    x:796, y:334},
      {n:'단양',    x:809, y:368},
      {n:'풍기',    x:816, y:404},
      {n:'영주',    x:816, y:442},
      {n:'문수',    x:809, y:476},
      {n:'옹천',    x:799, y:508},
      {n:'안동',    x:785, y:542},
      {n:'의성',    x:768, y:578},
      {n:'금성',    x:755, y:610},
      {n:'이화',    x:748, y:640},
      {n:'화본',    x:745, y:668},
      {n:'신녕',    x:745, y:696},
      {n:'영천',    x:748, y:726},
      {n:'건천',    x:755, y:758},
    ]},
  ],
},
 
// 동해선(민트): 강릉(북동) → 동해안 따라 남하 → 포항 → 경주 → 부산
donghae:{
  name:'동해선', color:'#3fb994',
  routes:[
    {color:'#3fb994',stations:[
      {n:'강릉',    x:816, y:50},
      {n:'남강릉',  x:823, y:88},
      {n:'옥계',    x:830, y:128},
      {n:'동해',    x:836, y:168},
      {n:'북평',    x:842, y:206},
      {n:'삼척',    x:845, y:244},
      {n:'근덕',    x:848, y:282},
      {n:'원덕',    x:850, y:320},
      {n:'부구',    x:852, y:358},
      {n:'울진',    x:853, y:396},
      {n:'평해',    x:853, y:432},
      {n:'영해',    x:852, y:466},
      {n:'영덕',    x:848, y:500},
      {n:'강구',    x:843, y:534},
      {n:'청하',    x:836, y:566},
      {n:'포항',    x:826, y:600},
      {n:'안강',    x:813, y:634},
      {n:'경주',    x:796, y:668},
      {n:'불국사',  x:782, y:700},
      {n:'입실',    x:768, y:730},
      {n:'북울산',  x:755, y:760},
      {n:'태화강',  x:745, y:790},
      {n:'울주',    x:734, y:818},
      {n:'좌천',    x:728, y:846},
      {n:'기장',    x:724, y:874},
      {n:'해운대',  x:728, y:902},
      {n:'부산',    x:734, y:934},
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
  parts.push(`<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="min-width:${Math.min(svgW,400)}px;display:block" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="var(--bg1)"/>`);
  // 격자
  for(let x=0;x<svgW;x+=50)parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="#21262d" stroke-width="1"/>`);
  for(let y=0;y<svgH;y+=50)parts.push(`<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="#21262d" stroke-width="1"/>`);
 
  // 역 좌표 수집 (첫 등장 기준)
  const stnPos={};
  line.routes.forEach(r=>r.stations.forEach(s=>{
    if(!stnPos[s.n])stnPos[s.n]={x:s.x+ox,y:s.y+oy};
  }));
 
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
  `;
}
 
 
