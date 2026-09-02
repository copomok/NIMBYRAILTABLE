/* NIMBY Rail application shell
 * 기존 데이터/조회 함수를 재사용하고, 내비게이션·통합 검색·화면 문맥만 담당한다.
 */
(function(){
  'use strict';

  const PAGE_META={
    home:['Railway Overview','홈'],train:['Train Explorer','열차 조회'],station:['Departure Board','역 시간표'],
    route:['Journey Planner','출도착 검색'],ops:['Operations','열차 운용'],metrolines:['Metro Network','전철 노선'],
    metroroute:['Metro Journey Planner','전철 경로'],map:['Network Map','노선도'],stats:['Network Analytics','운행 통계'],
    notice:['Service Updates','공지사항'],stationinfo:['Station Directory','역 정보'],delay:['Service Status','운행 지연'],
    book:['Ticketing','열차 예매'],ticket:['My Tickets','승차권']
  };
  const svg=id=>`<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let searchItems=null,searchIndex=-1,lastFocus=null;

  function mode(){
    try{return localStorage.getItem('nimbi_mode')==='metro'?'metro':'train';}catch(e){return 'train';}
  }
  function currentTab(){
    const active=document.querySelector('.panel.active');
    return active?.id?.replace('panel-','')||'home';
  }
  function syncShell(tab=currentTab()){
    const appMode=mode();
    document.body.dataset.appMode=appMode;
    const meta=PAGE_META[tab]||['Railway Information',tab];
    const section=document.getElementById('shell-section-label');
    const title=document.getElementById('shell-page-title');
    if(section)section.textContent=meta[0];
    if(title)title.textContent=meta[1];
    document.title=`${meta[1]} · NIMBY Rail`;
    document.querySelectorAll('[data-shell-tab],[data-mobile-tab]').forEach(button=>{
      const active=button.dataset.shellTab===tab||button.dataset.mobileTab===tab;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-mode-switch]').forEach(button=>{
      const active=button.dataset.modeSwitch===appMode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const stationButton=document.querySelector('[data-mobile-tab="station"] span');
    const trainButton=document.querySelector('[data-mobile-tab="train"] span');
    if(stationButton)stationButton.textContent=appMode==='metro'?'역 정보':'시간표';
    if(trainButton)trainButton.textContent=appMode==='metro'?'노선':'열차';
  }

  window.nimbiNavigate=function(tab){
    if(typeof window.switchTab==='function')window.switchTab(tab);
    syncShell(tab);
    if(window.matchMedia('(max-width:767px)').matches)window.scrollTo({top:0,behavior:'auto'});
  };
  window.nimbiMobileStation=function(){window.nimbiNavigate(mode()==='metro'?'stationinfo':'station');};
  window.nimbiMobileTrain=function(){window.nimbiNavigate(mode()==='metro'?'metrolines':'train');};

  function buildSearchItems(){
    const out=[];
    const seen=new Set();
    if(typeof STATION_DB!=='undefined')Object.keys(STATION_DB).forEach(name=>{
      const key=`station:${name}`;if(seen.has(key))return;seen.add(key);
      const info=STATION_DB[name]||{};
      out.push({type:'STATION',title:name,meta:info.lines?.join(' · ')||'역 정보',action:()=>{closeGlobalSearch();if(typeof openStationDetail==='function')openStationDetail(name);}});
    });
    if(typeof ALL_TRAINS!=='undefined')ALL_TRAINS.forEach(train=>{
      out.push({type:'TRAIN',title:`${train.grade} ${train.no}`,meta:`${train.stops?.[0]?.s||''} → ${train.dest||''} · ${train.line||''}`,search:`${train.no} ${train.dest} ${train.grade} ${train.line}`,action:()=>{closeGlobalSearch();if(typeof jumpToTrain==='function')jumpToTrain(String(train.no));}});
    });
    if(typeof MAP_LINES!=='undefined')Object.values(MAP_LINES).forEach(line=>{
      const key=`route:${line.name}`;if(seen.has(key))return;seen.add(key);
      out.push({type:'ROUTE',title:line.name,meta:'기차 노선도',action:()=>{closeGlobalSearch();window.nimbiNavigate('map');setTimeout(()=>{const b=[...document.querySelectorAll('.map-line-tab')].find(x=>x.textContent.trim()===line.name);if(b)b.click();},0);}});
    });
    if(typeof METRO_LINES!=='undefined')METRO_LINES.forEach(line=>{
      const key=`metro:${line.name}`;if(seen.has(key))return;seen.add(key);
      out.push({type:'ROUTE',title:line.name,meta:`전철 노선 · ${line.from||''} ↔ ${line.to||''}`,action:()=>{closeGlobalSearch();if(typeof setAppMode==='function')setAppMode('metro');if(typeof openMetroLine==='function')openMetroLine(line.id);}});
    });
    searchItems=out;
    return out;
  }
  function match(item,query){
    const text=`${item.title} ${item.meta} ${item.search||''}`;
    if(typeof matchesQuery==='function')return matchesQuery(text,query);
    return text.toLowerCase().includes(query.toLowerCase());
  }
  function renderSearch(query=''){
    const host=document.getElementById('global-search-results');if(!host)return;
    const q=query.trim();searchIndex=-1;
    if(!q){host.innerHTML=`<div class="global-search-empty">${svg('i-search')}<strong>철도 정보를 한 번에 찾으세요</strong><span>역명, 열차번호, 행선지 또는 노선을 입력할 수 있습니다.<br>초성 검색도 지원합니다.</span></div>`;return;}
    const rows=(searchItems||buildSearchItems()).filter(item=>match(item,q)).slice(0,18);
    if(!rows.length){host.innerHTML='<div class="global-search-empty"><strong>검색 결과가 없습니다</strong><span>다른 역명, 열차번호 또는 노선명을 입력해 보세요.</span></div>';return;}
    host.innerHTML=rows.map((item,index)=>`<button type="button" role="option" data-search-index="${index}"><span class="search-category">${item.type}</span><span class="search-result-copy"><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><span class="search-open">열기</span></button>`).join('');
    host.querySelectorAll('button').forEach((button,index)=>button.addEventListener('click',()=>rows[index].action()));
    host._rows=rows;
  }
  function moveSearch(delta){
    const host=document.getElementById('global-search-results');const buttons=[...host.querySelectorAll('button[data-search-index]')];if(!buttons.length)return;
    searchIndex=(searchIndex+delta+buttons.length)%buttons.length;
    buttons.forEach((button,index)=>button.classList.toggle('selected',index===searchIndex));
    buttons[searchIndex].scrollIntoView({block:'nearest'});
  }
  window.openGlobalSearch=function(){
    const shell=document.getElementById('global-search');if(!shell)return;
    lastFocus=document.activeElement;shell.hidden=false;document.body.classList.add('global-search-open');
    const input=document.getElementById('global-search-input');input.value='';renderSearch();requestAnimationFrame(()=>input.focus());
  };
  window.closeGlobalSearch=function(){
    const shell=document.getElementById('global-search');if(!shell||shell.hidden)return;
    shell.hidden=true;document.body.classList.remove('global-search-open');if(lastFocus?.focus)lastFocus.focus();
  };

  function renderOverview(){
    const host=document.getElementById('home-network-overview');if(!host||typeof ALL_TRAINS==='undefined')return;
    const appMode=mode();
    const stationCount=appMode==='metro'&&typeof METRO_LINES!=='undefined'
      ?new Set(METRO_LINES.flatMap(line=>(line.routes||[{stations:line.stations||[]}]).flatMap(route=>route.stations||[]))).size
      :new Set(ALL_TRAINS.flatMap(train=>(train.stops||[]).map(stop=>stop.s))).size;
    const routeCount=appMode==='metro'&&typeof METRO_LINES!=='undefined'?METRO_LINES.length:(typeof MAP_LINES!=='undefined'?Object.keys(MAP_LINES).length:new Set(ALL_TRAINS.map(train=>train.line)).size);
    let running=[];
    if(typeof getCurrentStatus==='function')running=ALL_TRAINS.filter(train=>getCurrentStatus(train)?.status==='running');
    const delayed=running.filter(train=>typeof simDelayAt==='function'&&simDelayAt(train)>0);
    const active=running.slice(0,6);
    host.innerHTML=`<section class="rail-overview" aria-labelledby="overview-title">
      <div class="overview-heading"><div><span>${appMode==='metro'?'METRO NETWORK':'INTERCITY NETWORK'}</span><h1 id="overview-title">철도 운행 정보를 빠르게 탐색하세요</h1><p>역, 열차와 노선의 현재 정보를 하나의 작업 공간에서 확인합니다.</p></div><button type="button" onclick="openGlobalSearch()">${svg('i-search')} 통합 검색</button></div>
      <div class="network-summary" aria-label="네트워크 요약">
        <button type="button" onclick="nimbiNavigate('${appMode==='metro'?'metrolines':'ops'}')"><span>운행 중</span><strong>${running.length.toLocaleString()}</strong><small>현재 열차</small></button>
        <button type="button" onclick="nimbiNavigate('stationinfo')"><span>등록 역</span><strong>${stationCount.toLocaleString()}</strong><small>조회 가능</small></button>
        <button type="button" onclick="nimbiNavigate('${appMode==='metro'?'metrolines':'map'}')"><span>노선</span><strong>${routeCount.toLocaleString()}</strong><small>네트워크</small></button>
        <button type="button" onclick="nimbiNavigate('delay')"><span>지연</span><strong class="${delayed.length?'warning':''}">${delayed.length.toLocaleString()}</strong><small>${delayed.length?'확인 필요':'정상 운행'}</small></button>
      </div>
      ${active.length?`<div class="active-trains"><div class="rail-section-heading"><div><span>ACTIVE TRAINS</span><h2>현재 운행 열차</h2></div><button type="button" onclick="nimbiNavigate('ops')">전체 보기</button></div><div class="active-train-list">${active.map(train=>`<button type="button" onclick="openJourney('${esc(train.no)}')"><i style="--route-color:var(--c-${typeof gcCssVar==='function'?gcCssVar(train.grade):'ktx'})"></i><span><strong>${esc(train.grade)} ${esc(train.no)}</strong><small>${esc(train.stops?.[0]?.s||'')} → ${esc(train.dest||'')}</small></span><em>운행 중</em></button>`).join('')}</div></div>`:''}
    </section>`;
  }

  function initialise(){
    const originalModeSwitch=window.setAppMode;
    if(typeof originalModeSwitch==='function')window.setAppMode=function(nextMode){
      const result=originalModeSwitch(nextMode);
      setTimeout(()=>{syncShell();renderOverview();searchItems=null;},0);
      return result;
    };
    syncShell();renderOverview();
    const input=document.getElementById('global-search-input');
    input?.addEventListener('input',event=>renderSearch(event.target.value));
    input?.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'){event.preventDefault();moveSearch(1);}
      else if(event.key==='ArrowUp'){event.preventDefault();moveSearch(-1);}
      else if(event.key==='Enter'){
        const rows=document.getElementById('global-search-results')?._rows||[];
        if(rows.length){event.preventDefault();rows[Math.max(0,searchIndex)]?.action();}
      }else if(event.key==='Escape'){event.preventDefault();closeGlobalSearch();}
    });
    document.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();document.getElementById('global-search')?.hidden?openGlobalSearch():closeGlobalSearch();
      }else if(event.key==='Escape'&&!document.getElementById('global-search')?.hidden)closeGlobalSearch();
    });
    const panels=[...document.querySelectorAll('.panel')];
    const observer=new MutationObserver(records=>{if(records.some(record=>record.target.classList.contains('active'))){syncShell();if(currentTab()==='home')renderOverview();}});
    panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise);else initialise();
})();
