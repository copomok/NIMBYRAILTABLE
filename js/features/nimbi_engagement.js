// 앱 체류 동선을 위한 일일 발견 카드.
// 모든 이동은 기존 역 상세·전광판·탑승 여정·통계 기능을 재사용한다.
(function(){
  function daySeed(){
    const d=new Date();
    if(d.getHours()<4)d.setDate(d.getDate()-1);
    return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  }
  function hash(text){
    let h=2166136261;
    for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function dailyPick(items,salt){
    return items.length?items[hash(daySeed()+':'+salt)%items.length]:null;
  }
  function esc(text){
    return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function stationCandidates(){
    const counts=new Map();
    ALL_TRAINS.forEach(t=>t.stops.forEach(s=>{
      if((hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s))counts.set(s.s,(counts.get(s.s)||0)+1);
    }));
    return [...counts.entries()].filter(([,n])=>n>=8).sort((a,b)=>a[0].localeCompare(b[0],'ko'));
  }
  function currentRunning(){
    return ALL_TRAINS.filter(t=>getCurrentStatus(t)?.status==='running');
  }
  function stationObservation(name){
    const now=new Date().getHours()*60+new Date().getMinutes();
    const rows=getTrainsByStation(name).map(t=>{
      const stop=t.stops.find(s=>s.s===name);
      const minute=toMin(hasTime(stop?.dep)?stop.dep:stop?.arr);
      if(minute==null)return null;
      let diff=minute-now;if(diff<0)diff+=1440;
      return {t,diff};
    }).filter(Boolean).sort((a,b)=>a.diff-b.diff);
    const soon=rows.filter(r=>r.diff<=90).slice(0,3);
    return soon.length?soon.map(r=>`${r.t.no} ${r.diff===0?'곧':r.diff+'분 후'}`).join(' · '):'다음 90분은 한산합니다';
  }
  function patternOf(trains){
    const byLine=new Map();
    trains.forEach(t=>(t.line||'').split('·').forEach(line=>byLine.set(line,(byLine.get(line)||0)+1)));
    const peak=[...byLine.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(trains.length&&peak)return {title:`${peak[0]} 집중 운행`,sub:`현재 운행 ${trains.length}편 중 ${peak[1]}편이 이 노선을 지나고 있습니다.`};
    const allByGrade=new Map();
    ALL_TRAINS.forEach(t=>allByGrade.set(t.grade,(allByGrade.get(t.grade)||0)+1));
    const top=[...allByGrade.entries()].sort((a,b)=>b[1]-a[1])[0];
    return {title:`${top?.[0]||'열차'}의 하루`,sub:`오늘 시간표에서 ${top?.[1]||0}편으로 가장 자주 만날 수 있습니다.`};
  }
  function routePairs(){
    let favs=[];
    try{favs=(typeof loadFavs==='function'?loadFavs():[]).filter(f=>f.type==='route'&&f.data?.from&&f.data?.to);}
    catch(e){}
    const pairs=favs.map(f=>({from:f.data.from,to:f.data.to,fav:true}));
    try{
      const from=loadHistory('route_from'),to=loadHistory('route_to');
      for(let i=0;i<Math.min(from.length,to.length);i++)pairs.push({from:from[i],to:to[i],fav:false});
    }catch(e){}
    const seen=new Set();
    return pairs.filter(r=>{const k=r.from+'→'+r.to;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,4);
  }
  function jsq(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  window.homeRouteSearch=function(from,to){
    from=(from??document.getElementById('home-from')?.value??'').trim();
    to=(to??document.getElementById('home-to')?.value??'').trim();
    if(!from||!to){alert('출발역과 도착역을 입력해 주세요.');return;}
    document.getElementById('input-from').value=from;
    document.getElementById('input-to').value=to;
    switchTab('route');searchByRoute();window.scrollTo({top:0,behavior:'smooth'});
  };
  window.homeSwapRoute=function(){
    const a=document.getElementById('home-from'),b=document.getElementById('home-to');if(!a||!b)return;
    const v=a.value;a.value=b.value;b.value=v;
  };
  function nextTicket(){
    if(typeof loadTickets!=='function')return null;
    const today=todayLocalStr(),now=new Date(),nowM=now.getHours()*60+now.getMinutes();
    return loadTickets().filter(t=>t.status==='active'&&t.travelDate===today).map(ticket=>{
      const dep=toMin(ticket.depTime);return {ticket,train:getTrainByNo(ticket.trainNo),diff:dep==null?9999:(dep-nowM+1440)%1440};
    }).filter(x=>x.diff>10&&x.diff<720).sort((a,b)=>a.diff-b.diff)[0]||null;
  }
  function liveSummary(){
    const now=new Date(),nm=now.getHours()*60+now.getMinutes();
    let running=0,before=0,done=0;const delayed=[];
    ALL_TRAINS.forEach(t=>{
      const d=(typeof _simDelay==='function')?_simDelay(t,nm):0;
      const st=getCurrentStatus(t,nm-d);
      if(st?.status==='running'){running++;if(d>0)delayed.push({t,d});}
      else if(st?.status==='before')before++;else done++;
    });
    delayed.sort((a,b)=>b.d-a.d);
    return {running,before,done,delayed};
  }
  function routeStatus(route,live){
    const affected=live.delayed.filter(({t})=>{
      const a=t.stops.findIndex(s=>s.s===route.from),b=t.stops.findIndex(s=>s.s===route.to);
      return a>=0&&b>a;
    });
    return affected.length?{label:`지연 ${affected.length}편`,cls:'warn'}:{label:'현재 원활',cls:'ok'};
  }
  function outlook(){
    const ctx=typeof _simDayContext==='function'?_simDayContext():null;
    const byLine=new Map();let sum=0,n=0,ended=0;
    ALL_TRAINS.forEach(t=>{if(getCurrentStatus(t)?.status==='done'){ended++;return;}const f=_delayForecast(t.line,t.grade);sum+=f.prob;n++;
      const line=(t.line||'기타').split('·')[0];const row=byLine.get(line)||{sum:0,n:0};row.sum+=f.prob;row.n++;byLine.set(line,row);});
    const peak=[...byLine].map(([line,v])=>({line,prob:Math.round(v.sum/v.n)})).sort((a,b)=>b.prob-a.prob)[0];
    const avg=Math.round(sum/Math.max(1,n));
    return {ctx,peak,avg,ended,active:n,label:avg<25?'대체로 원활':avg<40?'일부 지연 가능':'지연 가능성 높음'};
  }

  window.renderDailyDiscovery=function(){
    const host=document.getElementById('daily-discovery');
    if(!host||typeof ALL_TRAINS==='undefined')return;
    const stations=stationCandidates();
    const station=dailyPick(stations,'station');
    const featured=dailyPick(ALL_TRAINS.filter(t=>t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep)).length>=5),'train');
    const running=currentRunning();
    const pattern=patternOf(running);
    const stationName=station?.[0]||'서울';
    const stationCount=station?.[1]||0;
    const stationEsc=stationName.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const trainNo=featured?.no||'1';
    const pairs=routePairs(),next=nextTicket(),live=liveSummary(),view=outlook();
    const pairChips=pairs.map(r=>`<button onclick="homeRouteSearch('${jsq(r.from)}','${jsq(r.to)}')">${r.fav?'★ ':''}${esc(r.from)} → ${esc(r.to)}</button>`).join('');
    const nextHtml=next?`<section class="home-section"><div class="home-section-head"><b>나의 다음 일정</b><span>${next.diff}분 후 출발</span></div>
      <button class="home-next-card" onclick="switchTab('ticket')"><div><b>${esc(next.train?.grade||'열차')} ${esc(next.ticket.trainNo)}</b><span>${esc(next.ticket.fromStn)} ${esc(next.ticket.depTime)} → ${esc(next.ticket.toStn)} ${esc(next.ticket.arrTime)}</span></div><em>승차권 ›</em></button></section>`:'';
    const interestHtml=pairs.length?`<section class="home-section"><div class="home-section-head"><b>관심 노선·구간 현황</b><span>즐겨찾기·최근 검색</span></div>
      <div class="home-interest-list">${pairs.slice(0,3).map(r=>{const s=routeStatus(r,live);return `<button onclick="homeRouteSearch('${jsq(r.from)}','${jsq(r.to)}')"><span>${esc(r.from)} → ${esc(r.to)}</span><em class="${s.cls}">${s.label}</em></button>`;}).join('')}</div></section>`:'';
    const alertHtml=live.delayed.length?`<section class="home-section home-alert"><div class="home-section-head"><b>⚠️ 이상 운행 알림</b><span>현재 기준</span></div>
      <div class="home-alert-list">${live.delayed.slice(0,3).map(x=>`<button onclick="openJourney('${esc(x.t.no)}')"><span><b>${esc(x.t.grade)} ${esc(x.t.no)}</b><small>${esc(x.t.stops[0]?.s)} → ${esc(x.t.dest)} · 클릭하여 지연 정보 보기</small></span><em>+${x.d}분</em></button>`).join('')}</div></section>`:'';
    host.className='daily-discovery';
    host.innerHTML=`${nextHtml}<section class="home-quick">
      <div class="home-section-head"><b>빠른 출도착 검색</b><span>기본 필터 자동 적용</span></div>
      <div class="home-quick-fields">
        <label class="autocomplete-wrap"><span>출발역</span><input id="home-from" placeholder="출발역 선택" autocomplete="off" oninput="acShow('home-from','ac-home-from')" onfocus="acShow('home-from','ac-home-from')" onkeydown="acKey(event,'home-from','ac-home-from');if(event.key==='Enter'&&!event.defaultPrevented)homeRouteSearch()" onblur="setTimeout(()=>acHide('ac-home-from'),150)"><div class="ac-dropdown" id="ac-home-from"></div></label>
        <button onclick="homeSwapRoute()" aria-label="출발 도착 바꾸기">⇄</button>
        <label class="autocomplete-wrap"><span>도착역</span><input id="home-to" placeholder="도착역 선택" autocomplete="off" oninput="acShow('home-to','ac-home-to')" onfocus="acShow('home-to','ac-home-to')" onkeydown="acKey(event,'home-to','ac-home-to');if(event.key==='Enter'&&!event.defaultPrevented)homeRouteSearch()" onblur="setTimeout(()=>acHide('ac-home-to'),150)"><div class="ac-dropdown" id="ac-home-to"></div></label>
        <button class="home-search-btn" onclick="homeRouteSearch()">열차 조회</button>
      </div>
      ${pairChips?`<div class="home-route-chips">${pairChips}</div>`:''}
    </section>
    <section class="home-section"><div class="home-section-head"><b>현재 운행</b><span>${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')} 기준</span></div>
      <div class="home-metrics">
        <button onclick="switchTab('ops')"><b>${live.running}</b><span>운행 중</span></button>
        <button onclick="switchTab('delay')"><b class="${live.delayed.length?'warn':''}">${live.delayed.length}</b><span>지연 운행</span></button>
        <button onclick="switchTab('train')"><b>${live.before}</b><span>운행 예정</span></button>
        <button onclick="switchTab('stats')"><b>${live.done}</b><span>운행 종료</span></button>
      </div>
    </section>
    ${interestHtml}
    <section class="home-section home-outlook"><div class="home-section-head"><b>오늘의 운행 전망</b><span>${view.ctx?.weekend?'주말·공휴일':'평일'} · ${esc(view.ctx?.weather||'맑음')}</span></div>
      <div class="home-outlook-main"><span>전체 전망</span><b>${view.label}</b><em>평균 지연 가능성 ${view.avg}%</em></div>
      <div class="home-outlook-sub">${view.peak?`${esc(view.peak.line)}의 지연 가능성이 ${view.peak.prob}%로 상대적으로 높습니다.`:'특별한 지연 요인이 없습니다.'}</div>
      <div class="home-outlook-ended"><span>전망 대상 ${view.active}편</span><b>운행 종료 ${view.ended}편</b><small>운행이 끝난 열차는 전망 집계에서 분리됩니다.</small></div>
    </section>
    ${alertHtml}
    <div class="daily-head"><b>오늘의 발견</b><span>매일 04:00 갱신</span></div>
      <div class="daily-grid">
        <button class="daily-card" onclick="openStationDetail('${stationEsc}')">
          <div class="daily-label">오늘의 역</div>
          <div class="daily-title">🚉 ${esc(stationName)}</div>
          <div class="daily-sub">${stationCount}편 정차 · ${esc(stationObservation(stationName))}</div>
          <span class="daily-live">실시간 관찰</span>
        </button>
        <button class="daily-card" onclick="openJourney('${esc(trainNo)}')">
          <div class="daily-label">오늘의 열차</div>
          <div class="daily-title">${esc(featured?.grade||'KTX')} ${esc(trainNo)}</div>
          <div class="daily-sub">${esc(featured?.stops?.[0]?.s||'')} → ${esc(featured?.dest||'')} · 탑승 여정 따라가기</div>
          <span class="daily-live">${featured&&getCurrentStatus(featured)?.status==='running'?'현재 운행 중':'오늘 운행'}</span>
        </button>
        <button class="daily-card" onclick="switchTab('stats');setTimeout(showAllRunningTrains,0)">
          <div class="daily-label">운행 패턴 발견</div>
          <div class="daily-title">📈 ${esc(pattern.title)}</div>
          <div class="daily-sub">${esc(pattern.sub)}</div>
          <span class="daily-live">운행 중 ${running.length}편 보기</span>
        </button>
      </div>`;
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderDailyDiscovery);
  else renderDailyDiscovery();
  setInterval(()=>{if(document.getElementById('panel-home')?.classList.contains('active'))renderDailyDiscovery();},60000);
})();
