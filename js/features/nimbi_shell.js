/* NIMBY Rail application shell
 * 기존 데이터/조회 함수를 재사용하고, 내비게이션·통합 검색·화면 문맥만 담당한다.
 */
(function(){
  'use strict';

  const PAGE_META={
    home:['Railway Overview','홈'],train:['Train Explorer','열차 조회'],station:['Departure Board','역 시간표'],
    route:['Journey Planner','출도착 검색'],ops:['Operations','열차 운용'],metrolines:['Metro Network','전철 노선'],
    metroroute:['Metro Journey Planner','전철 경로'],map:['Network Map','지도'],stats:['Network Analytics','운행 통계'],
    notice:['Service Updates','공지사항'],stationinfo:['Station Directory','역'],delay:['Service Status','운행 지연'],
    book:['Ticketing','열차 예매'],ticket:['My Tickets','승차권']
  };
  const svg=id=>`<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let searchItems=null,searchIndex=-1,lastFocus=null,stationDirectoryQuery='',stationDirectoryLine='all',stationDirectoryPage=0;
  const THEME_LABEL={light:'라이트',dark:'다크',system:'시스템'};

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
    if(tab==='stationinfo'&&!document.body.classList.contains('station-detail-open'))document.body.classList.add('station-directory-open');
    if(tab!=='stationinfo'){document.body.classList.remove('station-directory-open');document.body.classList.remove('station-detail-open');}
    const meta=PAGE_META[tab]||['Railway Information',tab];
    const section=document.getElementById('shell-section-label');
    const title=document.getElementById('shell-page-title');
    if(section)section.textContent=meta[0];
    if(title)title.textContent=meta[1];
    document.title=`${meta[1]} · NIMBY Rail`;
    document.querySelectorAll('[data-shell-tab],[data-mobile-tab]').forEach(button=>{
      const mobile=button.dataset.mobileTab;
      const active=button.dataset.shellTab===tab||mobile===tab||(mobile==='station'&&tab==='stationinfo')||(mobile==='timetable'&&tab==='station');
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
    const timetableButton=document.querySelector('[data-mobile-tab="timetable"] span');
    if(stationButton)stationButton.textContent='역';
    if(trainButton)trainButton.textContent='열차';
    if(timetableButton)timetableButton.textContent='시간표';
  }

  window.nimbiNavigate=function(tab){
    if(typeof window.switchTab==='function')window.switchTab(tab);
    syncShell(tab);
    if(window.matchMedia('(max-width:767px)').matches)window.scrollTo({top:0,behavior:'auto'});
  };
  window.nimbiMobileStation=function(){window.nimbiOpenStationDirectory();};
  window.nimbiMobileTrain=function(){window.nimbiNavigate(mode()==='metro'?'metrolines':'train');};
  window.nimbiMobileTimetable=function(){window.nimbiNavigate(mode()==='metro'?'stationinfo':'station');};

  function resolvedTheme(preference){
    return preference==='dark'||(preference==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
  }
  function syncThemeControls(){
    let preference='system';try{preference=localStorage.getItem('nimbi_theme')||'system';}catch(_){}
    document.documentElement.dataset.theme=resolvedTheme(preference);
    document.documentElement.dataset.themePreference=preference;
    document.querySelectorAll('[data-theme-choice]').forEach(button=>{
      const active=button.dataset.themeChoice===preference;
      button.classList.toggle('active',active);button.setAttribute('aria-checked',String(active));
    });
    const label=document.getElementById('sidebar-theme-label');if(label)label.textContent=THEME_LABEL[preference]||THEME_LABEL.system;
    const icon=document.querySelector('#theme-toggle use');if(icon)icon.setAttribute('href',`#i-${preference==='light'?'sun':preference==='dark'?'moon':'monitor'}`);
    const color=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
  }
  window.setNimbiTheme=function(preference){
    if(!THEME_LABEL[preference])return;
    try{localStorage.setItem('nimbi_theme',preference);}catch(_){}
    syncThemeControls();const menu=document.getElementById('theme-menu');if(menu)menu.hidden=true;
  };
  window.toggleThemeMenu=function(anchor){
    const menu=document.getElementById('theme-menu');if(!menu)return;
    menu.hidden=!menu.hidden;
    if(!menu.hidden&&anchor){const r=anchor.getBoundingClientRect();menu.style.top=`${Math.min(innerHeight-170,r.bottom+7)}px`;menu.style.left=`${Math.max(12,Math.min(innerWidth-170,r.right-158))}px`;menu.querySelector('.active')?.focus();}
  };

  function buildSearchItems(){
    const out=[];
    const seen=new Set();
    if(typeof STATION_DB!=='undefined')Object.keys(STATION_DB).forEach(name=>{
      const key=`station:${name}`;if(seen.has(key))return;seen.add(key);
      const info=STATION_DB[name]||{};
      out.push({type:'STATION',title:name,meta:info.lines?.join(' · ')||'역 정보',action:()=>{closeGlobalSearch();window.nimbiOpenStation(name);}});
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
    const nq=q.toLowerCase().replace(/역$/,'');
    const rank=item=>{const title=item.title.toLowerCase(),base=title.replace(/역$/,'');if(base===nq)return 0;if(base.startsWith(nq))return 1;if(title.includes(nq))return 2;if(item.type==='STATION')return 3;return 4;};
    const rows=(searchItems||buildSearchItems()).filter(item=>match(item,q)).sort((a,b)=>rank(a)-rank(b)||a.title.localeCompare(b.title,'ko')).slice(0,18);
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

  function platformAt(train,status){
    const station=status?.atStn||status?.nextStn||train.stops?.[0]?.s;
    if(!station||typeof REAL_PLAT==='undefined')return '—';
    const value=REAL_PLAT[String(train.no)]?.[station];return value==null?'—':String(value);
  }
  function trainDelay(train){return typeof simDelayAt==='function'?Math.max(0,Number(simDelayAt(train))||0):0;}
  function renderNetworkPreview(appMode){
    const routes=appMode==='metro'&&typeof METRO_LINES!=='undefined'
      ?METRO_LINES.slice(0,6).map(line=>({name:line.name,color:line.color||'var(--accent)'}))
      :typeof MAP_LINES!=='undefined'?Object.values(MAP_LINES).slice(0,6).map(line=>({name:line.name,color:line.color||'var(--accent)'})):[];
    return `<div class="network-preview" role="img" aria-label="네트워크 노선 미리보기"><div class="network-preview-lines">${routes.map((route,index)=>`<button type="button" style="--route-color:${esc(route.color)};--route-offset:${index}" onclick="nimbiNavigate('${appMode==='metro'?'metrolines':'map'}')"><i></i><span>${esc(route.name)}</span></button>`).join('')}</div><button class="network-preview-open" type="button" onclick="nimbiNavigate('map')">${svg('i-map')} 전체 네트워크 열기</button></div>`;
  }
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
    const active=running.slice().sort((a,b)=>{
      const sa=getCurrentStatus(a),sb=getCurrentStatus(b);return (sa?.nowMin||0)-(sb?.nowMin||0);
    }).slice(0,8);
    host.innerHTML=`<section class="rail-overview" aria-labelledby="overview-title">
      <div class="overview-heading"><div><span>${appMode==='metro'?'METRO NETWORK':'INTERCITY NETWORK'}</span><h1 id="overview-title">홈</h1><p>철도 네트워크 운행 현황을 한눈에 확인하세요.</p></div><time id="overview-clock" aria-label="현재 시간"></time></div>
      <div class="network-summary" aria-label="네트워크 요약">
        <button type="button" onclick="nimbiNavigate('${appMode==='metro'?'metrolines':'ops'}')"><span>운행 중</span><strong>${running.length.toLocaleString()}</strong><small>현재 열차</small></button>
        <button type="button" onclick="nimbiNavigate('stationinfo')"><span>등록 역</span><strong>${stationCount.toLocaleString()}</strong><small>조회 가능</small></button>
        <button type="button" onclick="nimbiNavigate('${appMode==='metro'?'metrolines':'map'}')"><span>노선</span><strong>${routeCount.toLocaleString()}</strong><small>네트워크</small></button>
        <button type="button" onclick="nimbiNavigate('delay')"><span>지연</span><strong class="${delayed.length?'warning':''}">${delayed.length.toLocaleString()}</strong><small>${delayed.length?'확인 필요':'정상 운행'}</small></button>
      </div>
      <div class="overview-workspace">
        <section class="active-trains"><div class="rail-section-heading"><div><span>ACTIVE TRAINS</span><h2>현재 운행 열차</h2></div><button type="button" onclick="nimbiNavigate('ops')">전체 보기</button></div>
          ${active.length?`<div class="rail-table" role="table" aria-label="현재 운행 열차"><div class="rail-table-head" role="row"><span>시간</span><span>열차</span><span>운행 구간</span><span>승강장</span><span>상태</span></div>${active.map(train=>{const status=getCurrentStatus(train),delay=trainDelay(train);return `<button type="button" class="rail-table-row" role="row" onclick="openJourney('${esc(train.no)}')"><time>${esc(train.stops?.[0]?.dep||train.stops?.[0]?.arr||'—')}</time><span class="rail-train-name"><i style="--route-color:var(--c-${typeof gcCssVar==='function'?gcCssVar(train.grade):'ktx'})"></i><strong>${esc(train.grade)} ${esc(train.no)}</strong></span><span>${esc(train.stops?.[0]?.s||'')} → ${esc(train.dest||'')}</span><b>${esc(platformAt(train,status))}</b><em class="${delay?'is-delay':'is-normal'}">${delay?`+${delay}분`:'정상'}</em></button>`;}).join('')}</div>`:`<div class="rail-empty">현재 운행 중인 열차가 없습니다.</div>`}
        </section>
        <aside class="overview-aside"><section class="quick-station"><div class="rail-section-heading"><div><span>QUICK SEARCH</span><h2>빠른 역 검색</h2></div></div><label for="overview-station-search">역 이름</label><div><input id="overview-station-search" type="search" placeholder="예: 서울, ㄷㄷㄱ" onkeydown="if(event.key==='Enter')nimbiQuickStation(this.value)"><button type="button" onclick="nimbiQuickStation(document.getElementById('overview-station-search').value)">${svg('i-search')}<span>역 찾기</span></button></div></section>${renderNetworkPreview(appMode)}</aside>
      </div>
    </section>`;
    const clock=document.getElementById('overview-clock');if(clock)clock.textContent=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  }

  window.nimbiQuickStation=function(raw){
    const q=String(raw||'').trim();if(!q){openGlobalSearch();return;}
    const names=typeof STATION_DB!=='undefined'?Object.keys(STATION_DB):[];
    const found=names.find(name=>name===q||name.replace(/역$/,'')===q)||names.find(name=>match({title:name,meta:''},q));
    if(found&&typeof openStationDetail==='function')openStationDetail(found);else{openGlobalSearch();const input=document.getElementById('global-search-input');if(input){input.value=q;renderSearch(q);}}
  };

  function directoryStations(){
    if(typeof STATION_DB==='undefined')return [];
    const isMetro=mode()==='metro';
    const lineMap={},counts={};
    if(isMetro&&typeof METRO_LINES!=='undefined')METRO_LINES.forEach(line=>(line.routes||[{stations:line.stations||[]}]).forEach(route=>(route.stations||[]).forEach(name=>{(lineMap[name]=lineMap[name]||new Set()).add(line.name);})));
    if(!isMetro&&typeof ALL_TRAINS!=='undefined')ALL_TRAINS.forEach(train=>(train.stops||[]).forEach(stop=>{counts[stop.s]=(counts[stop.s]||0)+1;(lineMap[stop.s]=lineMap[stop.s]||new Set()).add(train.line);}));
    return Object.entries(STATION_DB).map(([key,data])=>{const name=key.replace(/역$/,'');return{key,name,lines:[...(lineMap[name]||[])],platform:(data.platforms||[]).join(' · ')||'—',count:counts[name]||0};}).filter(item=>lineMap[item.name]?.size);
  }
  function renderStationDirectory(){
    const host=document.getElementById('station-directory-shell');if(!host)return;
    const all=directoryStations();const lineOptions=[...new Set(all.flatMap(item=>item.lines.map(line=>line.split('/')[0].split(' (')[0])))].sort((a,b)=>a.localeCompare(b,'ko'));
    const filtered=all.filter(item=>(stationDirectoryLine==='all'||item.lines.some(line=>line.includes(stationDirectoryLine)))&&(!stationDirectoryQuery||match({title:item.name,meta:item.lines.join(' ')},stationDirectoryQuery))).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    const perPage=60,pages=Math.max(1,Math.ceil(filtered.length/perPage));stationDirectoryPage=Math.min(stationDirectoryPage,pages-1);const rows=filtered.slice(stationDirectoryPage*perPage,(stationDirectoryPage+1)*perPage);
    host.innerHTML=`<section class="station-directory" aria-labelledby="station-directory-title"><header class="directory-header"><div><span>STATIONS</span><h1 id="station-directory-title">역</h1><p>${mode()==='metro'?'전철':'기차'} 운행 데이터에 등록된 역을 찾습니다.</p></div><button type="button" onclick="nimbiShowNearbyStations()">${svg('i-map')} 가까운 역</button></header><div class="directory-toolbar"><label>${svg('i-search')}<input type="search" value="${esc(stationDirectoryQuery)}" placeholder="역 검색 (초성 지원)" oninput="nimbiFilterStations(this.value)"></label><select onchange="nimbiFilterStationLine(this.value)" aria-label="노선 필터"><option value="all">전체 노선</option>${lineOptions.map(line=>`<option value="${esc(line)}"${line===stationDirectoryLine?' selected':''}>${esc(line)}</option>`).join('')}</select><span>${filtered.length.toLocaleString()}개 역</span></div><div class="station-table"><div class="station-table-head"><span>역</span><span>노선</span><span>운행 열차</span><span>승강장</span><span></span></div>${rows.map(item=>`<button type="button" onclick="nimbiOpenStation('${esc(item.key)}')"><span><strong>${esc(item.name)}</strong><small>${esc(item.key.toUpperCase())}</small></span><span class="station-lines">${item.lines.slice(0,3).map((line,index)=>`<i style="--line-index:${index}">${esc(line)}</i>`).join('')}${item.lines.length>3?`<small>외 ${item.lines.length-3}개</small>`:''}</span><b>${item.count?item.count.toLocaleString():'—'}</b><span>${esc(item.platform)}</span>${svg('i-chevron')}</button>`).join('')||'<div class="rail-empty">조건에 맞는 역이 없습니다.</div>'}</div>${pages>1?`<nav class="directory-pages" aria-label="역 목록 페이지"><button ${stationDirectoryPage===0?'disabled':''} onclick="nimbiStationPage(-1)">이전</button><span>${stationDirectoryPage+1} / ${pages}</span><button ${stationDirectoryPage===pages-1?'disabled':''} onclick="nimbiStationPage(1)">다음</button></nav>`:''}</section>`;
  }
  window.nimbiOpenStationDirectory=function(){document.body.classList.remove('station-detail-open');document.body.classList.add('station-directory-open');window.nimbiNavigate('stationinfo');renderStationDirectory();};
  window.nimbiOpenStation=function(name){document.body.classList.remove('station-directory-open');document.body.classList.add('station-detail-open');if(typeof openStationDetail==='function')openStationDetail(name);};
  window.nimbiShowNearbyStations=function(){document.body.classList.remove('station-directory-open');document.body.classList.add('station-detail-open');window.nimbiNavigate('stationinfo');if(typeof renderStationInfo==='function')renderStationInfo();};
  window.nimbiFilterStations=function(value){stationDirectoryQuery=value;stationDirectoryPage=0;renderStationDirectory();};
  window.nimbiFilterStationLine=function(value){stationDirectoryLine=value;stationDirectoryPage=0;renderStationDirectory();};
  window.nimbiStationPage=function(delta){stationDirectoryPage+=delta;renderStationDirectory();document.getElementById('station-directory-title')?.scrollIntoView({block:'start'});};

  const LEGACY_ICON_MAP={
    '🔍':'i-search','⭐':'i-star','🔔':'i-bell','🚆':'i-train','🚇':'i-train','🗺️':'i-map','⏱️':'i-clock',
    '📋':'i-notice','⚖️':'i-route','🔗':'i-route','🎫':'i-ticket','🧳':'i-bag','🎟️':'i-ticket','⚙️':'i-settings',
    '🧩':'i-route','🛰️':'i-map','🏢':'i-station','🚉':'i-station','🔢':'i-train','🎨':'i-filter','📍':'i-map','🔄':'i-refresh','🕐':'i-clock'
  };
  function enhanceLegacyIcons(root=document){
    const nodes=[];
    const iconTargets='button,.empty-icon,.mtb-title,.home-section-title,.si-board-btn,.train-status-banner,.result-title,.alarm-popup-title,.fmt-sec-label,.pass-section-title';
    if(root.nodeType===1&&root.matches?.(iconTargets))nodes.push(root);
    root.querySelectorAll?.(iconTargets).forEach(node=>nodes.push(node));
    nodes.forEach(node=>{
      if(node.querySelector?.(':scope > .legacy-ui-icon'))return;
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let textNode;
      while((textNode=walker.nextNode())){
        const value=textNode.nodeValue||'';const token=Object.keys(LEGACY_ICON_MAP).find(icon=>value.trimStart().startsWith(icon));if(!token)continue;
        textNode.nodeValue=value.replace(token,'').replace(/^\s+/,'');
        const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.classList.add('legacy-ui-icon');icon.setAttribute('aria-hidden','true');
        const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href',`#${LEGACY_ICON_MAP[token]}`);icon.appendChild(use);textNode.parentNode.insertBefore(icon,textNode);break;
      }
    });
  }

  function initialise(){
    const originalStationDetail=window.openStationDetail;
    if(typeof originalStationDetail==='function')window.openStationDetail=function(name){document.body.classList.remove('station-directory-open');document.body.classList.add('station-detail-open');return originalStationDetail(name);};
    const originalModeSwitch=window.setAppMode;
    if(typeof originalModeSwitch==='function')window.setAppMode=function(nextMode){
      const result=originalModeSwitch(nextMode);
      setTimeout(()=>{syncShell();renderOverview();searchItems=null;},0);
      return result;
    };
    syncThemeControls();syncShell();renderOverview();renderStationDirectory();enhanceLegacyIcons(document);
    const scheme=matchMedia('(prefers-color-scheme: dark)');scheme.addEventListener?.('change',()=>{if((localStorage.getItem('nimbi_theme')||'system')==='system')syncThemeControls();});
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
    document.addEventListener('click',event=>{const menu=document.getElementById('theme-menu');if(menu&&!menu.hidden&&!event.target.closest('#theme-menu')&&!event.target.closest('[onclick^="toggleThemeMenu"]'))menu.hidden=true;});
    const uiObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)enhanceLegacyIcons(node);})));uiObserver.observe(document.body,{childList:true,subtree:true});
    const panels=[...document.querySelectorAll('.panel')];
    const observer=new MutationObserver(records=>{if(records.some(record=>record.target.classList.contains('active'))){syncShell();if(currentTab()==='home')renderOverview();}});
    panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise);else initialise();
})();
