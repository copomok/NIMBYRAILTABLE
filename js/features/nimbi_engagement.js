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
    host.className='daily-discovery';
    host.innerHTML=`<div class="daily-head"><b>오늘의 발견</b><span>매일 04:00 갱신</span></div>
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

  window.openStationWatch=function(name){
    openStationBoard(name);
    const title=document.querySelector('#station-board-overlay .sb-title, #station-board-overlay h2, #station-board-overlay .board-title');
    if(title)title.textContent=`${name.replace(/역$/,'')} 실시간 역관찰`;
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderDailyDiscovery);
  else renderDailyDiscovery();
})();
