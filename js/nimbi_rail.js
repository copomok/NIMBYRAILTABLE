

// KTX-ì‚°ì²œ/ì´ìŒì€ KTXì™€ ë™ì¼í•˜ê²Œ ì·¨ê¸‰
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
function gradeHtml(g){return `<span class="grade g-${gc(g)}">${GL[g]||g}</span>`;}
function lineChipHtml(line){
  const parts=line.split('Â·');
  if(parts.length<=1)return `<span class="line-chip">${line}</span>`;
  return `<span class="line-chip line-chip-multi" onclick="showLineTooltip(this,'${line}')">${parts[0]} <span style="color:var(--text3);font-size:10px">ì™¸ ${parts.length-1}ê°œ</span></span>`;
}

function showLineTooltip(el, line){
  // ê¸°ì¡´ íˆ´íŒ ì œê±°
  document.querySelectorAll('.line-tooltip-popup').forEach(t=>t.remove());
  const popup=document.createElement('div');
  popup.className='line-tooltip-popup';
  popup.textContent=line.split('Â·').join(' Â· ');
  popup.onclick=e=>{e.stopPropagation();popup.remove();};
  const rect=el.getBoundingClientRect();
  popup.style.cssText=`position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--text1);white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4)`;
  document.body.appendChild(popup);
  // ë°”ê¹¥ í´ë¦­ ì‹œ ë‹«ê¸°
  setTimeout(()=>{
    document.addEventListener('click',()=>popup.remove(),{once:true});
  },0);
}
function trainChip(no,g,fn){return `<span class="tc tc-${gc(g)}" onclick="${fn}">${no}</span>`;}
function dirLabel(d){return d==='down'?'<span class="dir down"><span class="dir-dot"></span>í•˜í–‰</span>':'<span class="dir up"><span class="dir-dot"></span>ìƒí–‰</span>';}
// ë¡œì»¬ ì‹œê°„ ê¸°ì¤€ YYYY-MM-DD ë¬¸ìì—´ (toISOStringì˜ UTC ë³€í™˜ìœ¼ë¡œ ì¸í•œ ë‚ ì§œ ë°€ë¦¼ ë°©ì§€)
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
// iOS Safari: overflow:auto ë‚´ë¶€ ë²„íŠ¼ íƒ­ ëˆ„ë½ ë°©ì§€ìš© ì´ì¤‘ í•¸ë“¤ëŸ¬
// touchendë¡œ ì¦‰ì‹œ ì²˜ë¦¬ + clickìœ¼ë¡œ ë°ìŠ¤í¬íƒ‘ ì»¤ë²„, ì¤‘ë³µ ë°©ì§€
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
// â”€â”€ ì´ˆì„± ê²€ìƒ‰ â”€â”€
const CHO=['ã„±','ã„²','ã„´','ã„·','ã„¸','ã„¹','ã…','ã…‚','ã…ƒ','ã……','ã…†','ã…‡','ã…ˆ','ã…‰','ã…Š','ã…‹','ã…Œ','ã…','ã…'];
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
  // ì´ˆì„± ê²€ìƒ‰
  const cho=getChoseong(name);
  const qCho=query.split('').every(c=>CHO.includes(c))?query:null;
  if(qCho&&cho.includes(qCho))return true;
  return false;
}

// ì˜ˆë§¤ ê°€ëŠ¥í•œ ì—­(ì¶œë°œì—­ìœ¼ë¡œ ì§í†µ+í™˜ìŠ¹ ê²½ë¡œê°€ í•˜ë‚˜ë¼ë„ ìˆëŠ” ì—­) ìºì‹œ
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
    // ì§í†µ ê°€ëŠ¥í•œ ëª©ì ì§€ê°€ ìˆìœ¼ë©´ OK
    for(const t of depTrains){
      const fi=t.stops.findIndex(s=>s.s===from);
      if(t.stops.slice(fi+1).some(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s))){
        valid.add(from);return;
      }
    }
    // í™˜ìŠ¹ ê°€ëŠ¥í•œ ê²½ë¡œê°€ ìˆìœ¼ë©´ OK
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
  // ì˜ˆë§¤ ì—­ ì…ë ¥ í•„ë“œë©´ bookable ì—­ë§Œ í‘œì‹œ
  const isBookField=['book-stn-input','pass-from','pass-to'].includes(iid);
  const pool=isBookField?getBookableStations():ALL_STATIONS;
  // ì´ˆì„± ê²€ìƒ‰ í¬í•¨ Â· ê¸°ì°¨ íƒ­ ê²€ìƒ‰ì´ë¯€ë¡œ ì „ì²  ì „ìš©ì—­(ë¬´ì •ì°¨)ì€ ì œì™¸
  const hits=pool.filter(s=>matchesQuery(s,q)&&!_isMetroOnly(s)&&(typeof isRailStationInRegion!=='function'||isRailStationInRegion(s))).slice(0,12);
  if(!hits.length){drop.className='ac-dropdown';drop.style.display='none';return;}
  // í•˜ì´ë¼ì´íŠ¸
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
// â”€â”€ í˜„ì¬ ì‹œê° í‘œì‹œ â”€â”€
function updateClock(){
  const now=new Date();
  const h=String(now.getHours()).padStart(2,'0');
  const m=String(now.getMinutes()).padStart(2,'0');
  const s=String(now.getSeconds()).padStart(2,'0');
  const el=document.getElementById('header-clock');
  if(el) el.textContent=`${h}:${m}:${s}`;
  _handleCalendarDayChange(false,now);
}
let _appCalendarDay=todayLocalStr();
let _calendarRefreshPending=false;
function _handleCalendarDayChange(force,now){
  const nextDay=todayLocalStr(now||new Date());
  if(!force&&nextDay===_appCalendarDay)return;
  _appCalendarDay=nextDay;
  if(_calendarRefreshPending)return;
  _calendarRefreshPending=true;
  setTimeout(()=>{
    _calendarRefreshPending=false;
    // ì—´ë ¤ ìˆëŠ” ë‚ ì§œ ì…ë ¥ì´ ì–´ì œ ë‚ ì§œì— ê³ ì •ë˜ì§€ ì•Šë„ë¡ í•˜ë˜ ì‚¬ìš©ìê°€ ê³ ë¥¸ ë¯¸ë˜ ë‚ ì§œëŠ” ìœ ì§€í•œë‹¤.
    const maxDateObj=new Date((now||new Date()).getTime());
    maxDateObj.setDate(maxDateObj.getDate()+30);
    const nextMax=todayLocalStr(maxDateObj);
    document.querySelectorAll('input[type="date"]').forEach(input=>{
      if(input.min&&input.min<nextDay)input.min=nextDay;
      if(input.max&&input.max<nextMax)input.max=nextMax;
      if(input.value&&input.value<nextDay)input.value=nextDay;
    });
    try{refreshCurrentTab();}catch(e){console.warn('day rollover refresh',e);}
    try{updateHomeTripWidget();}catch(e){}
    try{updateLiveActivity();}catch(e){}
  },0);
}
setInterval(updateClock,1000);
updateClock();

// ê³µì§€ ì•ˆì½ìŒ ë±ƒì§€ í‘œì‹œ
function updateNoticeBadge(){
  const cnt=getUnreadNoticeCount();
  // ê¸°ì¡´ íƒ­ ë±ƒì§€ (ìˆ¨ê²¨ì ¸ ìˆì–´ë„ ìœ ì§€)
  const tab=document.getElementById('tab-notice');
  if(tab){
    let dot=tab.querySelector('.notice-badge-dot');
    if(cnt>0){
      if(!dot){dot=document.createElement('span');dot.className='notice-badge-dot';tab.appendChild(dot);}
    } else if(dot){dot.remove();}
  }
  // ë§ˆì´í˜ì´ì§€(í–„ë²„ê±°) ë²„íŠ¼ ë±ƒì§€ëŠ” ê³µì§€ì™€ ë¬´ê´€ â€” ê³µì§€ ë¯¸ì—´ëŒìœ¼ë¡œ ì¸í•œ ì•Œë¦¼ ì  ì œê±°
  const myBtn=document.querySelector('.my-btn');
  if(myBtn){const myDot=myBtn.querySelector('.notice-badge-dot');if(myDot)myDot.remove();}
}
window.addEventListener('load',()=>setTimeout(updateNoticeBadge,300));

// â”€â”€ ë‹¤ìŒ ì—­ê¹Œì§€ ë‚¨ì€ ì‹œê°„ ê³„ì‚° â”€â”€
function getNextStopEta(t, status){
  if(!status||status.status!=='running')return null;
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  // ë‹¤ìŒ ì •ì°¨ì—­ ì°¾ê¸°
  const nextStn=status.nextStn||(status.atStn?null:null);
  if(!nextStn)return null;
  const stop=t.stops.find(s=>s.s===nextStn);
  if(!stop)return null;
  const arrM=toMin(stop.arr||stop.dep);
  if(arrM===null)return null;
  // ìì • ë³´ì •
  let adj=arrM;
  if(arrM<nowM-30) adj+=1440;
  const diff=adj-nowM;
  if(diff<0||diff>120)return null;
  return {stn:nextStn, min:diff, timeStr:stop.arr||stop.dep};
}


// â”€â”€ ë…¸ì„ ë„ ë¯¸ë‹ˆë§µ â”€â”€
function updateMinimap(){
  const wrap=document.getElementById('map-svg-wrap');
  const miniEl=document.getElementById('map-minimap');
  if(!wrap||!miniEl) return;

  const svgEl=wrap.querySelector('svg');
  if(!svgEl) return;

  // ë¯¸ë‹ˆë§µ SVG viewBox ê°€ì ¸ì˜¤ê¸°
  const vb=svgEl.getAttribute('viewBox');
  if(!vb) return;

  // í˜„ì¬ ìŠ¤í¬ë¡¤ ìœ„ì¹˜/í¬ê¸°
  const scrollTop=wrap.scrollTop;
  const scrollLeft=wrap.scrollLeft;
  const visH=wrap.clientHeight;
  const visW=wrap.clientWidth;
  const totalH=wrap.scrollHeight;
  const totalW=wrap.scrollWidth;

  // ë¯¸ë‹ˆë§µ ë†’ì´ ë¹„ìœ¨
  const miniH=120;
  const ratio=miniH/totalH;
  const thumbH=Math.max(16, visH*ratio);
  const thumbTop=scrollTop*ratio;

  miniEl.style.height=miniH+'px';
  miniEl.innerHTML=`<div class="map-minimap-thumb" style="height:${thumbH.toFixed(1)}px;top:${thumbTop.toFixed(1)}px"></div>`;

  // ë¯¸ë‹ˆë§µ í´ë¦­ìœ¼ë¡œ ìŠ¤í¬ë¡¤
  miniEl.onclick=e=>{
    const rect=miniEl.getBoundingClientRect();
    const clickY=e.clientY-rect.top;
    wrap.scrollTop=clickY/ratio;
  };
}

// â”€â”€ ğŸš†/ğŸš‡ ì´ìš© ëª¨ë“œ (ê¸°ì°¨/ì „ì² ) â”€â”€
let _appMode=(()=>{try{return localStorage.getItem('nimbi_mode')||'train';}catch(e){return 'train';}})();
const METRO_MODE_TABS=['metrolines','metroroute','map','stationinfo','notice','control']; // ì „ì²  ëª¨ë“œì—ì„œ ë³´ì´ëŠ” ë©”ì¸ íƒ­
const TRAIN_MODE_TABS=['train','route','ops','map','stats','notice','stationinfo','delay','control']; // ê¸°ì°¨ ëª¨ë“œ ìƒë‹¨ë°” íƒ­
// ê·¸ ì™¸ íƒ­(book/alarm/fav/ticket ë“±)ì€ ë§ˆì´í˜ì´ì§€ ì „ìš© â€” í•­ìƒ ìˆ¨ê¹€ ìœ ì§€
function _applyModeTabs(){
  const visible=_appMode==='metro'?METRO_MODE_TABS:TRAIN_MODE_TABS;
  document.querySelectorAll('.tab').forEach(b=>{
    const id=(b.id||'').replace('tab-','');
    if(METRO_MODE_TABS.includes(id)||TRAIN_MODE_TABS.includes(id)){
      b.style.display=visible.includes(id)?'':'none';
      b.style.order=String(Math.max(0,visible.indexOf(id)));
    } else {
      b.style.display='none';
      b.style.order='';
    }
  });
}
function setAppMode(m){
  if(_appMode===m){_syncModeButtons();return;}
  _appMode=m;
  try{localStorage.setItem('nimbi_mode',m);}catch(e){}
  _syncModeButtons();
  _applyModeTabs();
  // í˜„ì¬ íƒ­ì´ ìƒˆ ëª¨ë“œì—ì„œ ìˆ¨ê²¨ì§€ë©´ ê¸°ë³¸ íƒ­ìœ¼ë¡œ ì´ë™
  if(document.getElementById('panel-home')?.classList.contains('active')){
    renderDailyDiscovery();
    updateHomeTripWidget();
    return;
  }
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
// í—¤ë” ìƒˆë¡œê³ ì¹¨: í˜„ì¬ í™œì„± íƒ­ì„ ë‹¤ì‹œ ë Œë” (ë§ˆì´í˜ì´ì§€ ì„œë¸ŒíŒ¨ë„ì´ ì—´ë ¤ ìˆìœ¼ë©´ ê·¸ ì„¹ì…˜ì„ ê°±ì‹ )
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
  const homeActive=document.getElementById('panel-home')?.classList.contains('active');
  const id=homeActive?'home':a?a.id.replace('tab-',''):'train';
  switchTab(id); // ë…¸ì„ ë„Â·í†µê³„Â·ê³µì§€Â·ì—­ì •ë³´ ë“±ì€ switchTabì´ ì¬ë Œë”
  // ê²€ìƒ‰í˜• íƒ­ì€ í˜„ì¬ ì…ë ¥ê°’ ê·¸ëŒ€ë¡œ ì¬ê²€ìƒ‰í•´ì•¼ ê²°ê³¼ê°€ ê°±ì‹ ë¨
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
  document.getElementById('tab-'+n)?.classList.add('active');
  const targetPanel=document.getElementById('panel-'+n);
  if(!targetPanel)return;
  targetPanel.classList.add('active');
  if(n==='map'){
    const content=document.getElementById('map-content');
    if(content) content.style.display='';
    renderMapTabForMode();
  } else {
    // ë‹¤ë¥¸ íƒ­ìœ¼ë¡œ ì´ë™ ì‹œ ë…¸ì„ ë„ ì½˜í…ì¸  ìˆ¨ê¸°ê¸°
    _mapCurrentLine=null;
    const content=document.getElementById('map-content');
    if(content) content.style.display='none';
    const countEl=document.getElementById('map-train-count');
    if(countEl) countEl.textContent='';
    // ê³ ì • ì˜¤ë²„ë ˆì´ ìˆ¨ê¸°ê¸°
    const overlay=document.getElementById('map-track-overlay');
    if(overlay) overlay.style.display='none';
  }
  if(n==='alarm') renderAlarms();
  if(n==='fav') renderFavs();
  if(n==='stationinfo'){if(typeof renderStationInfo==='function')renderStationInfo();}
  if(n==='stats') renderStats();
  if(n==='notice') renderNotice();
  if(n==='ticket') renderTickets();
  if(n==='home'){
    if(typeof renderDailyDiscovery==='function')renderDailyDiscovery();
    updateHomeTripWidget();
  }
  if(n==='book') renderBookTab();
  if(n==='delay'){const el=document.getElementById('result-delay');if(el)renderSIDelay(el);}
  if(n==='metrolines') renderMetroLinesTab();
  if(n==='metroroute') renderMetroRouteTab();
  if(n==='ops') renderOpsTab();
  if(n==='control'&&typeof renderOperationsHub==='function')renderOperationsHub();

}

// â”€â”€ í†µê³¼ íŒë³„ â”€â”€
// boundary: ê° ì„¹ì…˜ì˜ ì²«/ëì—­ â†’ arr/dep í•œìª½ë§Œ ìˆì–´ë„ ì •ì°¨ì—­ìœ¼ë¡œ ì²˜ë¦¬
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
// ì—´ì°¨ íƒ­ ë…¸ì„  ë“œë¡­ë‹¤ìš´ì„ ë…¸ì„ ë„(MAP_LINES)ì™€ ë™ì¼í•˜ê²Œ ìë™ ìƒì„± â€” í•˜ë“œì½”ë”© ëˆ„ë½Â·ì¤‘ë³µ ë°©ì§€
function _populateTrainLineSelect(){
  const sel=document.getElementById('sel-line-train');
  if(!sel||typeof ALL_TRAINS==='undefined')return;
  const cur=sel.value;
  const names=[...new Set(ALL_TRAINS
    .filter(t=>typeof isRailTrainInRegion!=='function'||isRailTrainInRegion(t))
    .flatMap(t=>String(t.line||'').split('Â·').map(n=>n.trim()).filter(Boolean)))]
    .sort((a,b)=>a.localeCompare(b,'ko'));
  sel.innerHTML='<option value="">ë…¸ì„  ì„ íƒ</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(cur&&names.includes(cur))sel.value=cur;
}
function selectTrainLine(){
  const line=document.getElementById('sel-line-train').value;
  const listEl=document.getElementById('train-line-list');
  const detailEl=document.getElementById('result-train');
  detailEl.innerHTML='';
  if(!line){listEl.innerHTML='';return;}
  const trains=ALL_TRAINS.filter(t=>t.line.includes(line)&&(typeof isRailTrainInRegion!=='function'||isRailTrainInRegion(t)));
  if(!trains.length){listEl.innerHTML='<div class="empty"><div class="empty-icon">ğŸš«</div><p>í•´ë‹¹ ë…¸ì„  ì—´ì°¨ê°€ ì—†ìŠµë‹ˆë‹¤</p></div>';return;}
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
      <td style="font-weight:500">${t.dest}í–‰</td>
      <td><span class="time-dep">${depT}</span></td>
      <td><span class="time-arr">${arrT}</span></td>
    </tr>`;
  }).join('');
  listEl.innerHTML=`<div class="result-header"><div class="result-title">ğŸš† ${line}</div><span class="badge blue">${sorted.length}í¸</span></div>
  <div class="table-wrap"><table><thead><tr><th>ì—´ì°¨</th><th>ë“±ê¸‰</th><th>ë…¸ì„ </th><th>ë°©í–¥</th><th>í–‰ì„ ì§€</th><th>ì²« ì¶œë°œ</th><th>ìµœì¢… ë„ì°©</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="hint">â€» ì—´ì°¨ë²ˆí˜¸ í´ë¦­ ì‹œ ì „ì²´ ìš´í–‰ ì •ë³´ ì¡°íšŒ</p>`;
}

function showTrainDetail(no){
  const trains=getTrainsByNo(no);
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
  const trains=getTrainsByNo(no);
  if(!trains.length){el.innerHTML=`<div class="empty"><div class="empty-icon">ğŸš«</div><p><b>${no}</b>ë²ˆ ì—´ì°¨ë¥¼ ì°¾ì„ ìˆ˜ ì—†ìŠµë‹ˆë‹¤</p></div>`;return;}
  el.innerHTML=trains.map(renderDetail).join('');
  const fb=document.getElementById('fav-btn-train');
  if(fb)fb.style.display='';
}

// ì¶œë°œê¹Œì§€ ë‚¨ì€ ì‹œê°„ í•œêµ­ì–´ í‘œê¸° (ìš´í–‰ ì¤€ë¹„ì¤‘ ì—´ì°¨ìš©)
function fmtEtaKor(m){
  if(m==null)return '';
  m=Math.round(m);
  if(m<=0)return 'ê³§ ì¶œë°œ ì˜ˆì •';
  if(m<60)return `ì•½ ${m}ë¶„ í›„ ì¶œë°œ ì˜ˆì •`;
  const h=Math.floor(m/60), mm=m%60;
  return `ì•½ ${h}ì‹œê°„${mm?` ${mm}ë¶„`:''} í›„ ì¶œë°œ ì˜ˆì •`;
}
function getCurrentStatus(t, atMin){
  const now=new Date();
  const nowMin = atMin !== undefined ? atMin : now.getHours()*60+now.getMinutes();

  // ì‹œê° ìˆëŠ” ì—­ ì „ì²´ ìˆ˜ì§‘
  const all=[];
  t.stops.forEach((s,idx)=>{
    if(hasTime(s.arr)||hasTime(s.dep))all.push({s,idx});
  });
  if(!all.length)return null;

  // ìì • ë„˜ëŠ” ì—´ì°¨ ëŒ€ì‘: offset ë³´ì •
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
  if(lastM>=1440&&nowMin<firstM){
    // ìì • ë„˜ê²¨ ìµì¼ê¹Œì§€ ìš´í–‰í•˜ëŠ” ì—´ì°¨: 04ì‹œ(ìš´í–‰ì¼ ê²½ê³„) ì´ì „ì´ê±°ë‚˜, ì‹œí”„íŠ¸í•´ë„ ì•„ì§
    // ìš´í–‰ ì¤‘ì´ë©´ ì „ì¼ ì¶œë°œë¶„ìœ¼ë¡œ ê°„ì£¼(ì‹œí”„íŠ¸). 04ì‹œ ì´í›„ì´ë©´ì„œ ì´ë¯¸ ì¢…ë£Œëë‹¤ë©´ ì‹œí”„íŠ¸í•˜ì§€
    // ì•Šì•„ 'ìš´í–‰ ì¤€ë¹„ì¤‘'(ì˜¤ëŠ˜ ë°¤ ì¶œë°œ ëŒ€ê¸°)ìœ¼ë¡œ í‘œì‹œ â†’ 3:59ê¹Œì§€ ì¢…ë£Œ, 4:00ë¶€í„° ì¤€ë¹„ì¤‘.
    const shifted=nowMin+1440;
    if(nowMin<240||shifted<=lastM) nowM=shifted;
  }

  if(nowM<firstM)return{status:'before',nowMin,etaMin:firstM-nowM};
  if(nowM>lastM)return{status:'done',nowMin};

  // â”€â”€ í•µì‹¬: ì„ í˜• íƒìƒ‰ìœ¼ë¡œ ë‹¨ìˆœí•˜ê²Œ â”€â”€
  // 1) ì •ì°¨ ì¤‘ íŒì •: nowMì´ ì´ ì—­ì˜ arr~dep ì‚¬ì´
  for(let i=0;i<norm.length;i++){
    const {s,normArr,normDep}=norm[i];
    // case A: arrÂ·dep ë‘˜ ë‹¤ ìˆëŠ” ì •ì°¨ì—­
    if(normArr!==null&&normDep!==null&&nowM>=normArr&&nowM<=normDep){
      const prevStn=i>0?norm[i-1].s.s:null;
      return{status:'running',atStn:s.s,prevStn,nowMin};
    }
    // case B: arrë§Œ ìˆëŠ” ì •ì°¨ì—­ (arr ~ ë‹¤ìŒì—­ ì¶œë°œ ì „)
    if(normArr!==null&&normDep===null&&!isPassStop(t,s.s)&&nowM>=normArr){
      const nextNorm=norm[i+1]??null;
      const nextM=nextNorm?(nextNorm.normDep??nextNorm.normArr):null;
      if(nextM===null||nowM<nextM){
        const prevStn=i>0?norm[i-1].s.s:null;
        return{status:'running',atStn:s.s,prevStn,nowMin};
      }
    }
  }

  // 2) ì´ë™ ì¤‘ íŒì •: nowM ê¸°ì¤€ìœ¼ë¡œ ê°€ì¥ ìµœê·¼ì— ì§€ë‚œ ì—­ê³¼ ë‹¤ìŒ ë„ë‹¬í•  ì—­ì„ ì§ì ‘ ì°¾ê¸°
  let prevStn=null, nextStn=null;
  for(let i=0;i<norm.length;i++){
    const {s,normArr,normDep}=norm[i];
    // ì´ ì—­ì„ ë– ë‚œ ì‹œê° (dep ìˆìœ¼ë©´ dep, ì—†ìœ¼ë©´ arr)
    const leaveM=normDep??normArr;
    // ì´ ì—­ì— ë„ì°©í•œ ì‹œê°
    const arriveM=normArr??normDep;

    if(leaveM!==null&&leaveM<=nowM){
      prevStn=s.s; // nowM ì´ì „ì— ì§€ë‚œ ì—­ â†’ ê³„ì† ê°±ì‹ 
    }
    if(arriveM!==null&&arriveM>nowM&&nextStn===null){
      nextStn=s.s; // nowM ì´í›„ ì²˜ìŒ ë„ë‹¬í•  ì—­
    }
  }

  if(prevStn&&nextStn) return{status:'running',prevStn,nextStn,nowMin};
  return{status:'done',nowMin};

  // (ì•„ë˜ ì½”ë“œëŠ” ë„ë‹¬í•˜ì§€ ì•Šì§€ë§Œ êµ¬ì¡° ìœ ì§€ìš©)
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
      // nowM >= nxtArrM: jì—­ì— ë„ë‹¬í–ˆê±°ë‚˜ ì§€ë‚¨
      // jì—­ì´ arrÂ·dep ë‘˜ ë‹¤ ìˆëŠ” ì •ì°¨ì—­ì´ë©´ nowMì´ ê·¸ ì‚¬ì´ì— ìˆëŠ”ì§€ ì²´í¬
      if(nxt.normArr!==null&&nxt.normDep!==null&&nowM>=nxt.normArr&&nowM<=nxt.normDep){
        const prevStn=s.s;
        return{status:'running',atStn:nxt.s.s,prevStn,nowMin};
      }
      // ë‚´ë¶€ ë£¨í”„ ê³„ì†
      // (break ëŒ€ì‹  continue: í†µê³¼ì—­ ì—¬ëŸ¬ ê°œ ì—°ì†ì¼ ë•Œ ì™¸ë¶€ ë£¨í”„ê°€ doneìœ¼ë¡œ ë¹ ì§€ëŠ” ë²„ê·¸ ë°©ì§€)
    }
  }
  return{status:'done',nowMin};
}
function _trainRunsPastMidnight(t){
  let previous=null,offset=0,last=null;
  for(const stop of t?.stops||[]){
    const raw=toMin(hasTime(stop.arr)?stop.arr:hasTime(stop.dep)?stop.dep:null);if(raw==null)continue;
    if(previous!=null&&raw<previous-60)offset+=1440;
    last=raw+offset;previous=raw;
  }
  return last!=null&&last>=1440;
}
function _bookRouteIsLiveServiceDate(t,serviceDate,now=new Date()){
  const today=todayLocalStr(now);if(serviceDate===today)return true;
  const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
  return serviceDate===todayLocalStr(yesterday)&&now.getHours()<4&&_trainRunsPastMidnight(t);
}

function renderDetail(t){
  const valid=t.stops.filter(s=>s.arr||s.dep);
  const firstTimedIndex=t.stops.findIndex(s=>s.arr||s.dep);
  const lastTimedIndex=t.stops.length-1-[...t.stops].reverse().findIndex(s=>s.arr||s.dep);
  const liveDelay=(typeof _liveDelayOf==='function')?_liveDelayOf(t):0;
  const now=new Date(), nowM=now.getHours()*60+now.getMinutes();
  const status=getCurrentStatus(t,nowM-liveDelay);
  const c=gc(t.grade);

  // â”€â”€ íƒ€ì„ë¼ì¸ rows â”€â”€
  let rows=''; let seq=0;
  t.stops.forEach((s,stopIndex)=>{
    const arr=s.arr, dep=s.dep;
    if(!arr&&!dep)return;
    const isOrigin=stopIndex===firstTimedIndex, isTerm=stopIndex===lastTimedIndex;
    const isPass=!isOrigin&&!isTerm&&isPassStop(t,s.s);
    seq++;

    // í˜„ì¬ ìœ„ì¹˜ í•˜ì´ë¼ì´íŠ¸
    let hlRow='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) hlRow=' tl-row-hl-at';
      else if(status.nextStn===s.s) hlRow=' tl-row-hl-next';
    }

    // dot í´ë˜ìŠ¤
    const dot=isOrigin?'tl-dot origin':isTerm?'tl-dot term':isPass?'tl-dot pass':'tl-dot stop';

    // ì‹œê°„
    let timeHtml='';
    if(isOrigin){
      timeHtml=`<span class="tl-time dep">ë°œ ${dep||''}</span>`;
    } else if(isTerm){
      timeHtml=`<span class="tl-time arr">ì°© ${arr||''}</span>`;
    } else if(isPass){
      timeHtml=`<span class="tl-time pass">í†µê³¼ ${arr||dep||''}</span>`;
    } else {
      const ap=hasTime(arr)?`ì°© ${arr}`:'';
      const dp=hasTime(dep)?`ë°œ ${dep}`:'';
      if(ap&&dp) timeHtml=`<span class="tl-time arr">${ap}</span><span class="tl-time dep">${dp}</span>`;
      else timeHtml=`<span class="tl-time ${hasTime(arr)?'arr':'dep'}">${ap||dp}</span>`;
    }

    // ë±ƒì§€
    let badge='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) badge='<span class="tl-badge now">í˜„ì¬</span>';
      else if(status.nextStn===s.s) badge='<span class="tl-badge next">ë‹¤ìŒ</span>';
    }

    // ì•ŒëŒ ë²„íŠ¼
    let alarmBtn='';
    if(!isPass){
      const tno=t.no, tstn=s.s;
      const si=t.stops.findIndex(x=>x.s===tstn);
      const prevStop=si>0?t.stops.slice(0,si).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr)):null;
      const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;
      const anySet=hasAlarm(`board:${tno}:${tstn}`)||hasAlarm(`arr:${tno}:${tstn}`);
      alarmBtn=`<button class="alarm-bell-btn${anySet?' has-alarm':''}" onclick="openAlarmPopup('${tno}','${tstn}','${arr||''}','${dep||''}','${prevTime||''}')">ğŸ””</button>`;
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

  // â”€â”€ ìš´í–‰ ë°°ë„ˆ â”€â”€
  let statusBanner='';
  if(status){
    if(status.status==='running'){
      let msg;
      if(status.passStn) msg=`${status.passStn}ì—­ì„ í†µê³¼ ì¤‘ì…ë‹ˆë‹¤`;
      else if(status.atStn) msg=`${status.atStn}ì—­ì— ì •ì°¨ ì¤‘ì…ë‹ˆë‹¤`;
      else if(status.nextStn) msg=`${status.nextStn}ì—­ìœ¼ë¡œ ì´ë™ ì¤‘ì…ë‹ˆë‹¤`;
      else msg='ìš´í–‰ ì¤‘ì…ë‹ˆë‹¤';
      const eta=getNextStopEta(t,status);
      const etaTxt=eta?(eta.min===0
        ?`<br><span class="eta-sub">ê³§ ë„ì°© ì˜ˆì •</span>`
        :`<br><span class="eta-sub">ì•½ ${eta.min}ë¶„ ë’¤ ë„ì°© ì˜ˆì •</span>`):'';
      statusBanner=liveDelay>0
        ?`<button class="train-status-banner running delayed" type="button" onclick="event.stopPropagation();openJourney('${t.no}')">
            <strong>ğŸ”´ ì§€ì—° ìš´í–‰ ì¤‘ì¸ ì—´ì°¨ì…ë‹ˆë‹¤ Â· ì•½ ${liveDelay}ë¶„</strong>
            <small>í´ë¦­í•˜ì—¬ ì§€ì—° ì •ë³´ ë³´ê¸°</small>
          </button>`
        :`<div class="train-status-banner running">ğŸš† ${msg}${etaTxt}</div>`;
    } else if(status.status==='before'){
      const etaTxt=(status.etaMin!=null)?`<br><span class="eta-sub">${fmtEtaKor(status.etaMin)}</span>`:'';
      statusBanner=`<div class="train-status-banner before">ğŸ•’ ìš´í–‰ì„ ì¤€ë¹„ì¤‘ì¸ ì—´ì°¨ì…ë‹ˆë‹¤${etaTxt}</div>`;
    } else {
      statusBanner=`<div class="train-status-banner done">ìš´í–‰ì´ ì¢…ë£Œëœ ì—´ì°¨ì…ë‹ˆë‹¤</div>`;
    }
  }

  // â”€â”€ ì†Œìš”ì‹œê°„ / ì •ì°¨ì—­ ìˆ˜ â”€â”€
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
            <span style="font-size:16px;font-weight:700">${t.dest}í–‰</span>
          </div>
          <div class="detail-meta">${first?.s||''} ${depT} ë°œ â†’ ${last?.s||''} ${arrT} ì°©</div>
          <div class="detail-meta" style="margin-top:2px">ì •ì°¨ì—­ ${totalStops}ê°œ &nbsp;Â·&nbsp; ì†Œìš”ì‹œê°„ ${fmtDurKor(durMin(depT,arrT))}</div>
        </div>
        <div class="detail-head-actions">
          <button class="share-btn" onclick="trackTrainOnMap('${t.no}')" title="ì§€ë„ë¡œ ë³´ê¸° Â· ì¶”ì  ëª¨ë“œ" aria-label="${t.no}ë²ˆ ì—´ì°¨ ì§€ë„ë¡œ ë³´ê¸°">ğŸ—ºï¸</button>
          <button class="share-btn" onclick="shareTrainLink('${t.no}')" title="ì—´ì°¨ ë§í¬ ê³µìœ " aria-label="${t.no}ë²ˆ ì—´ì°¨ ë§í¬ ê³µìœ ">ğŸ”—</button>
        </div>
      </div>
    </div>
    ${statusBanner}
    <div class="tl-toolbar">
      <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="hide-pass-${t.no}" onchange="togglePassRows('${t.no}')" style="cursor:pointer">
        í†µê³¼ì—­ ìˆ¨ê¸°ê¸°
      </label>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="view-toggle-btn" onclick="showTrainRotation('${t.no}')" title="í¸ì„± ìš´ìš© ì¶”ì • â€” ì¢…ì°© í›„ ì´ì–´ ìš´í–‰í•˜ëŠ” ì—´ì°¨">ğŸ”</button>
        <button class="view-toggle-btn" onclick="openTrainCompare('${t.no}')" title="ì—´ì°¨ ë¹„êµ â€” ëŒ€í”¼Â·ì¶”ì›” ì§€ì  í™•ì¸">âš–ï¸</button>
        <button class="view-toggle-btn${_detailViewMode==='timeline'?' active':''}" onclick="setDetailView('timeline','${t.no}')">â± íƒ€ì„ë¼ì¸</button>
        <button class="view-toggle-btn${_detailViewMode==='table'?' active':''}" onclick="setDetailView('table','${t.no}')">ğŸ“‹ í‘œ</button>
      </div>
    </div>
    <div id="tl-${t.no}">${_detailViewMode==='table'?renderTableView(t):rows}</div>
    <div class="ticket-cta-wrap" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary ticket-cta-btn" style="flex:1" onclick="openBookingPopup('${t.no}','${first?.s||''}','${last?.s||''}','${depT}','${arrT}')">ğŸ« ìŠ¹ì°¨ê¶Œ ì˜ˆë§¤ (ì „ êµ¬ê°„)</button>
    </div>
  </div>`;
}


function searchByStation(){
  // ë“œë¡­ë‹¤ìš´ ë‹«ê¸°
  acHide('ac-station');
  const enteredStn=document.getElementById('input-station').value.trim();
  const stn=typeof railStationDataName==='function'?railStationDataName(enteredStn):enteredStn;
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
  if(!stn){el.innerHTML='<div class="empty"><div class="empty-icon">ğŸ¢</div><p>ì—­ ì´ë¦„ì„ ì…ë ¥í•˜ì„¸ìš”</p></div>';return;}
  let results=[];
  getRailTrainsByStation(stn).forEach(t=>{
    if(dir!=='all'&&t.dir!==dir)return;
    if(lineF!=='all'&&!t.line.includes(lineF))return;
    if(!gradeMatch(t.grade,gradeF))return;
    const timedIndexes=t.stops.map((stop,index)=>({stop,index}))
      .filter(item=>item.stop.s===stn&&(item.stop.arr||item.stop.dep));
    const first=t.stops.findIndex(stop=>stop.arr||stop.dep);
    const last=t.stops.length-1-[...t.stops].reverse().findIndex(stop=>stop.arr||stop.dep);
    for(const {stop,index} of timedIndexes){
      const isEndpoint=index===first||index===last;
      const isPass=!isEndpoint&&(
        stop.arr==='í†µê³¼'||stop.dep==='í†µê³¼'||
        (hasTime(stop.arr)&&!hasTime(stop.dep))||
        (hasTime(stop.dep)&&!hasTime(stop.arr))
      );
      if(passF==='stop'&&isPass)continue;
      if(terminusF==='exclude'&&index===last)continue;
      const sortT=toMin(hasTime(stop.dep)?stop.dep:null)??toMin(hasTime(stop.arr)?stop.arr:null)??9999;
      if(afterMin!==null&&sortT!==9999&&sortT<afterMin)continue;
      const timeV2=hasTime(stop.dep)?stop.dep:hasTime(stop.arr)?stop.arr:null;
      if(nightF==='only'&&!isNightTrain(timeV2))continue;
      results.push({t,stop,isPass,sortT,isNight:isNightTrain(timeV2)});
    }
  });
  results.sort((a,b)=>a.sortT-b.sortT);
  if(!results.length){el.innerHTML=`<div class="empty"><div class="empty-icon">ğŸš«</div><p><b>${stn}</b>ì— ì •ì°¨í•˜ëŠ” ì—´ì°¨ê°€ ì—†ìŠµë‹ˆë‹¤</p></div>`;return;}
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
  const afterLabel=afterMin!==null?` Â· ${afterRaw} ì´í›„`:'';
  el.innerHTML=`<div class="result-header"><div class="result-title">ğŸ¢ ${stn} ì‹œê°„í‘œ${afterLabel}</div><span class="badge blue">${results.length}í¸</span></div>
  <div class="table-wrap"><table><thead><tr><th>ì—´ì°¨</th><th>ë“±ê¸‰</th><th>ë…¸ì„ </th><th>ë°©í–¥</th><th>í–‰ì„ ì§€</th><th>ë„ì°©</th><th>ì¶œë°œ</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="hint">â€» ì—´ì°¨ë²ˆí˜¸ í´ë¦­ ì‹œ ì „ì²´ ìš´í–‰ ì •ë³´ Â· íë¦° í–‰ = í†µê³¼</p>`;
  // ë‹¤ìŒ ì—´ì°¨ ë²„íŠ¼ ì‚½ì…
  insertNextTrainBtn(el);
}

function insertNextTrainBtn(el){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  const rows=[...el.querySelectorAll('tbody tr[data-sort]')];
  const target=rows.find(r=>{const t=parseInt(r.dataset.sort);return t!==9999&&t>=nowMin;});
  if(!target)return;
  // í•„í„° ë²„íŠ¼ ì˜†ì— ì‚½ì…
  const filterBtn=document.getElementById('btn-filter-station');
  if(!filterBtn)return;
  // ì´ë¯¸ ìˆìœ¼ë©´ ì œê±°
  const existing=document.getElementById('btn-next-train-station');
  if(existing)existing.remove();
  const btn=document.createElement('button');
  btn.id='btn-next-train-station';
  btn.className='btn-next-train';
  btn.textContent='â© ë‹¤ìŒ ì—´ì°¨';
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
  btn.textContent=open?'í•„í„° â–´':'í•„í„° â–¾';
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

// ì¹´ì¹´ì˜¤ë§µì‹ ê¸¸ì°¾ê¸° íƒ€ì„ë¼ì¸ ì¹´ë“œ â€” legs=[{t,from,to,depT,arrT}]
function _journeyCardHTML(legs){
  const esc=s=>String(s).replace(/'/g,"\\'");
  const depT=legs[0].depT, arrT=legs[legs.length-1].arrT;
  const totalDur=durStr(depT,arrT);
  const xfer=legs.length-1;
  const stnCount=(t,from,to)=>{ const fi=t.stops.findIndex(s=>s.s===from), ti=t.stops.findIndex(s=>s.s===to); return (fi>=0&&ti>fi)?ti-fi:1; };
  let rail='';
  legs.forEach((l,i)=>{
    const col=`var(--c-${gcCssVar(l.t.grade)})`;
    const n=stnCount(l.t,l.from,l.to), legDur=durStr(l.depT,l.arrT);
    rail+=`<div class="rt-node" style="--lc:${col}">
      <div class="rt-time">${l.depT||'-'}</div>
      <div class="rt-rail"><span class="rt-dot rt-board">${GL[l.t.grade]?GL[l.t.grade][0]:'â—'}</span><span class="rt-seg"></span></div>
      <div class="rt-info">
        <div class="rt-stn">${l.from}<span class="rt-chev">â€º</span></div>
        <div class="rt-sub"><span class="tc tc-${gc(l.t.grade)}" onclick="event.stopPropagation();jumpToTrain('${esc(l.t.no)}')">${l.t.no}</span> ${l.t.dest}í–‰ Â· ${GL[l.t.grade]||l.t.grade}</div>
        <div class="rt-cnt">${n}ê°œ ì—­ Â· ${legDur}</div>
      </div></div>`;
    if(i<legs.length-1){ const wait=(toMin(legs[i+1].depT)-toMin(l.arrT));
      rail+=`<div class="rt-node rt-walk">
        <div class="rt-time"></div>
        <div class="rt-rail"><span class="rt-seg rt-dash"></span><span class="rt-walk-ic">ğŸš¶</span></div>
        <div class="rt-info"><div class="rt-sub rt-xfer">${l.to} í™˜ìŠ¹ Â· ëŒ€ê¸° ${wait>=0?wait:0}ë¶„</div></div></div>`;
    }
  });
  const last=legs[legs.length-1];
  rail+=`<div class="rt-node rt-last" style="--lc:var(--c-${gcCssVar(last.t.grade)})">
    <div class="rt-time">${arrT||'-'}</div>
    <div class="rt-rail"><span class="rt-dot rt-alight">í•˜ì°¨</span></div>
    <div class="rt-info"><div class="rt-stn">${last.to}<span class="rt-chev">â€º</span></div></div></div>`;
  return `<div class="rt-card">
    <div class="rt-sum"><div class="rt-dur">${totalDur}</div>
      <div class="rt-sum-meta">${xfer>0?`í™˜ìŠ¹ ${xfer}íšŒ`:'ì§í†µ'} Â· <span class="rt-mono">${depT}â†’${arrT||'?'}</span></div></div>
    <div class="rt-tl">${rail}</div></div>`;
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
  const sortLabel={'duration':'ì†Œìš”ì‹œê°„ìˆœ','depart':'ì¶œë°œì‹œê°ìˆœ','arrive':'ë„ì°©ì‹œê°ìˆœ'}[sortMode]||'';
  const maxDur=parseInt(document.getElementById('sel-max-duration')?.value||'0');
  const gradeF=document.getElementById('sel-grade-route')?.value||'all';
  const el=document.getElementById('result-route');
  if(!from||!to){el.innerHTML='<div class="empty"><div class="empty-icon">ğŸ”</div><p>ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì„ ì…ë ¥í•˜ì„¸ìš”</p></div>';return;}
  if(from===to){el.innerHTML='<div class="empty"><div class="empty-icon">âš ï¸</div><p>ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì´ ê°™ìŠµë‹ˆë‹¤</p></div>';return;}

  function getStopTime(stop){
    if(hasTime(stop.dep))return stop.dep;
    if(hasTime(stop.arr))return stop.arr;
    return null;
  }
  // durStrì€ ì „ì—­ í•¨ìˆ˜ ì‚¬ìš©

  // â”€â”€ ì§í†µ íƒìƒ‰ â”€â”€
  let directs=[];
  ALL_TRAINS.forEach(t=>{
    if(!gradeMatch(t.grade,gradeF))return;
    const stops=t.stops;
    const pair=travelStopIndexes(t,from,to);
    if(!pair)return;
    const {fi,ti}=pair;
    if(isPassStop(t,from)||isPassStop(t,to))return;
    const depT=getStopTime(stops[fi]);
    const arrT=hasTime(stops[ti].arr)?stops[ti].arr:hasTime(stops[ti].dep)?stops[ti].dep:null;
    if(!depT)return;
    if(afterMin!==null&&toMin(depT)<afterMin)return;
    const durM=durMin(depT,arrT)??0;
    if(maxDur>0&&durM>maxDur)return;
    directs.push({t,depT,arrT,dur:durStr(depT,arrT),sortT:toMin(depT)??9999});
  });
  // ì •ë ¬
  if(sortMode==='depart') directs.sort((a,b)=>a.sortT-b.sortT);
  else if(sortMode==='arrive') directs.sort((a,b)=>arrKey(a.depT,a.arrT)-arrKey(b.depT,b.arrT));
  else directs.sort((a,b)=>{
    const dA=durMin(a.depT,a.arrT), dB=durMin(b.depT,b.arrT);
    return (dA||9999)-(dB||9999);
  });

  // ì§í†µ ìˆìœ¼ë©´ ì§í†µë§Œ í‘œì‹œ
  if(directs.length){
    const afterLabel=afterMin!==null?` Â· ${afterRaw} ì´í›„`:'';
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
    el.innerHTML=`<div class="result-header"><div class="result-title">ğŸ” ${from} â†’ ${to}${afterLabel}</div><span class="badge blue">${directs.length}í¸</span><span class="badge" style="background:var(--bg3)">${sortLabel}</span></div>
    <div class="table-wrap"><table><thead><tr><th>ì—´ì°¨</th><th>ë“±ê¸‰</th><th>ë…¸ì„ </th><th>ë°©í–¥</th><th>í–‰ì„ ì§€</th><th>ì¶œë°œ</th><th>ë„ì°©</th><th>ì†Œìš”</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">â€» ì—´ì°¨ë²ˆí˜¸ í´ë¦­ ì‹œ ì „ì²´ ìš´í–‰ ì •ë³´ ì¡°íšŒ</p>`;
    return;
  }

  // â”€â”€ ì§í†µ ì—†ìŒ â†’ í™˜ìŠ¹ íƒìƒ‰ â”€â”€
  // 1íšŒ í™˜ìŠ¹: from â†’ í™˜ìŠ¹ì—­(t1) â†’ to(t2)
  // 2íšŒ í™˜ìŠ¹: from â†’ í™˜ìŠ¹ì—­1(t1) â†’ í™˜ìŠ¹ì—­2(t2) â†’ to(t3)
  const MIN_WAIT=Math.max(1,parseInt(document.getElementById('xfer-min')?.value)||3);
  const MAX_WAIT=Math.min(120,parseInt(document.getElementById('xfer-max')?.value)||60);

  // fromì—ì„œ íƒˆ ìˆ˜ ìˆëŠ” ì—´ì°¨ ë¯¸ë¦¬ ìˆ˜ì§‘
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
      // ì´ ì—´ì°¨ê°€ ì •ì°¨í•˜ëŠ” ì´í›„ ëª¨ë“  ì—­
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

  // í™˜ìŠ¹ ê²°ê³¼ ìˆ˜ì§‘
  let transfers=[];

  // from ì¶œë°œ ë ˆê·¸
  const legs1=getLegs(from, afterMin);

  // 1íšŒ í™˜ìŠ¹
  legs1.forEach(l1=>{
    const xStn=l1.arrStn;
    if(xStn===to){return;}// ì§í†µ(ì´ë¯¸ ì²˜ë¦¬ë¨)
    // í™˜ìŠ¹ì—­ì—ì„œ toë¡œ ê°€ëŠ” ì—´ì°¨
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

  // ì¤‘ë³µ ì œê±° (ê°™ì€ ì—´ì°¨ ì¡°í•©+ì¶œë°œì‹œê°)
  const seen=new Set();
  transfers=transfers.filter(r=>{
    const key=r.legs.map(l=>l.t.no+l.depT).join('|');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  // ì´ ì†Œìš”ì‹œê°„ ê¸°ì¤€ ì •ë ¬ í›„ 5ê±´ë§Œ
  // ì •ë ¬ ì ìš©
  if(sortMode==='depart') transfers.sort((a,b)=>a.depM-b.depM);
  else if(sortMode==='arrive') transfers.sort((a,b)=>a.arrM-b.arrM);
  else transfers.sort((a,b)=>a.totalM-b.totalM);
  transfers=transfers.slice(0,5);

  if(!transfers.length){
    const afterLabel=afterMin!==null?` (${afterRaw} ì´í›„)`:'';
    el.innerHTML=`<div class="empty"><div class="empty-icon">ğŸš«</div><p><b>${from} â†’ ${to}</b>${afterLabel} ìš´í–‰ ê°€ëŠ¥í•œ ê²½ë¡œê°€ ì—†ìŠµë‹ˆë‹¤</p></div>`;
    return;
  }

  // í™˜ìŠ¹ ê²°ê³¼ ë Œë”ë§
  const afterLabel=afterMin!==null?` Â· ${afterRaw} ì´í›„`:'';
  const cards=transfers.map(({legs,totalDur})=>{
    const legsHtml=legs.map((l,i)=>`
      <div class="xfer-leg">
        <div class="xfer-leg-head">
          ${trainChip(l.t.no,l.t.grade,`jumpToTrain('${l.t.no}')`)}
          ${gradeHtml(l.t.grade)}
          ${lineChipHtml(l.t.line)}
          <span style="color:var(--text2);font-size:12px">${dirLabel(l.t.dir)} Â· ${l.t.dest}í–‰</span>
        </div>
        <div class="xfer-leg-route">
          <span class="xfer-stn">${l.from}</span>
          <span class="xfer-dep time-dep">${l.depT||'-'}</span>
          <span class="xfer-arrow">â†’</span>
          <span class="xfer-stn">${l.to}</span>
          <span class="xfer-arr time-arr">${l.arrT||'-'}</span>

        </div>
      </div>
      ${i<legs.length-1?`<div class="xfer-wait">ğŸ”„ í™˜ìŠ¹ Â· ëŒ€ê¸° ${toMin(legs[i+1].depT)-toMin(l.arrT)}ë¶„</div>`:''}
    `).join('');
    return `<div class="xfer-card">
      <div class="xfer-card-head">
        <span class="xfer-badge">1íšŒ í™˜ìŠ¹</span>
        <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">${legs[0].depT} â†’ ${legs[legs.length-1].arrT||'?'} Â· ${totalDur}</span>
      </div>
      ${legsHtml}
    </div>`;
  }).join('');

  const fb2=document.getElementById('fav-btn-route');
  if(fb2)fb2.style.display='';
  el.innerHTML=`<div class="result-header">
    <div class="result-title">ğŸ”„ ${from} â†’ ${to}${afterLabel} Â· í™˜ìŠ¹</div>
    <span class="badge" style="background:var(--bg3)">${sortLabel}</span>
    <span class="badge yellow">${transfers.length}ê±´</span>
  </div>
  ${cards}
  <p class="hint">â€» ì—´ì°¨ë²ˆí˜¸ í´ë¦­ ì‹œ ì „ì²´ ìš´í–‰ ì •ë³´ ì¡°íšŒ Â· í™˜ìŠ¹ ëŒ€ê¸° 3~60ë¶„ Â· ìµœë‹¨ ì†Œìš” 5ê±´</p>`;
}
function toggleStationFilter(){
  const row=document.getElementById('filter-row-station');
  const btn=document.getElementById('btn-filter-station');
  const open=row.classList.toggle('open');
  btn.classList.toggle('active', open);
  btn.textContent=open?'í•„í„° â–´':'í•„í„° â–¾';
}

function togglePass(cardId){
  const card=document.getElementById(cardId);
  if(!card)return;
  const btn=card.querySelector('.btn-pass-toggle');
  const hiding=card.classList.toggle('hide-pass');
  btn.textContent=hiding?'í†µê³¼ì—­ ë³´ê¸°':'í†µê³¼ì—­ ìˆ¨ê¸°ê¸°';
}

// â”€â”€ ì•ŒëŒ ì‹œìŠ¤í…œ â”€â”€
const ALARM_KEY='nimbi_alarms';
function loadAlarms(){try{return JSON.parse(localStorage.getItem(ALARM_KEY))||[];}catch(e){return[];}}
function saveAlarms(a){localStorage.setItem(ALARM_KEY,JSON.stringify(a));}

// â”€â”€ ì•ŒëŒ ê·¸ë£¹ (ì¶œê·¼/í‡´ê·¼ ì„¸íŠ¸) â”€â”€
const ALARM_GROUP_KEY='nimbi_alarm_groups';
function loadAlarmGroups(){try{return JSON.parse(localStorage.getItem(ALARM_GROUP_KEY))||[];}catch(e){return[];}}
function saveAlarmGroups(g){localStorage.setItem(ALARM_GROUP_KEY,JSON.stringify(g));}

// í˜„ì¬ ì„¤ì •ëœ ì•ŒëŒë“¤ì„ ê·¸ë£¹ìœ¼ë¡œ ì €ì¥ (ì—´ì°¨+ì—­+ìŠ¹í•˜ì°¨ ì¡°í•©ë§Œ ì €ì¥, ì‹œê°ì€ ë§¤ë²ˆ ì¬ê³„ì‚°)
function saveCurrentAsGroup(){
  const alarms=loadAlarms();
  if(!alarms.length){alert('ì €ì¥í•  ì•ŒëŒì´ ì—†ìŠµë‹ˆë‹¤. ë¨¼ì € ì•ŒëŒì„ ì„¤ì •í•´ì£¼ì„¸ìš”.');return;}
  const name=prompt('ê·¸ë£¹ ì´ë¦„ì„ ì…ë ¥í•˜ì„¸ìš” (ì˜ˆ: ì¶œê·¼ê¸¸, í‡´ê·¼ê¸¸)');
  if(!name||!name.trim())return;

  // ì—´ì°¨ë²ˆí˜¸+ì—­ëª…+ìŠ¹ì°¨/í•˜ì°¨ ë‹¨ìœ„ë¡œ ë¬¶ê¸° (board-*, arr-* ê³„ì—´ì„ ê°ê° í•˜ë‚˜ì˜ í•­ëª©ìœ¼ë¡œ)
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
  alert(`'${name.trim()}' ê·¸ë£¹ìœ¼ë¡œ ì €ì¥ë˜ì—ˆìŠµë‹ˆë‹¤. (${items.length}ê°œ ì•ŒëŒ)`);
  renderAlarmIfOpen();
}

// ê·¸ë£¹ì— ì €ì¥ëœ í•­ëª©ë“¤ì„ ì˜¤ëŠ˜ ì‹œê°í‘œ ê¸°ì¤€ìœ¼ë¡œ ë‹¤ì‹œ ì•ŒëŒ ì„¤ì •
function applyAlarmGroup(groupId){
  const groups=loadAlarmGroups();
  const g=groups.find(x=>x.id===groupId);
  if(!g)return;

  let okCount=0, failCount=0;
  g.items.forEach(item=>{
    const t=getTrainByNo(item.trainNo);
    if(!t){failCount++;return;}
    const si=t.stops.findIndex(s=>s.s===item.stn);
    if(si===-1){failCount++;return;}
    const stop=t.stops[si];
    const prevStop=si>0?t.stops.slice(0,si).reverse().find(x=>hasTime(x.dep)||hasTime(x.arr)):null;
    const prevTime=prevStop?(hasTime(prevStop.dep)?prevStop.dep:prevStop.arr):null;

    if(item.kind==='board'){
      const depTime=hasTime(stop.dep)?stop.dep:null;
      if(!depTime){failCount++;return;}
      // ì´ë¯¸ ê°™ì€ ì•ŒëŒ ìˆìœ¼ë©´ ê±´ë„ˆëœ€
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
  if(failCount>0) alert(`'${g.name}' ê·¸ë£¹ ì ìš© ì™„ë£Œ (${okCount}ê°œ ì„±ê³µ, ${failCount}ê°œ ì‹¤íŒ¨ - ì˜¤ëŠ˜ ìš´í–‰í•˜ì§€ ì•ŠëŠ” ì—´ì°¨ì¼ ìˆ˜ ìˆìŠµë‹ˆë‹¤)`);
}

function deleteAlarmGroup(groupId){
  if(!confirm('ì´ ê·¸ë£¹ì„ ì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?'))return;
  const groups=loadAlarmGroups().filter(g=>g.id!==groupId);
  saveAlarmGroups(groups);
  renderAlarmIfOpen();
}
function hasAlarm(id){return loadAlarms().some(a=>a.id===id&&!a.fired);}

// ì•ŒëŒ íŒì—… ì—´ê¸°
function openAlarmPopup(trainNo, stn, arrTime, depTime, prevTime){
  // ê¸°ì¡´ íŒì—… ì œê±°
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
      <div class="alarm-popup-title">ğŸ”” ${trainNo}ë²ˆ Â· ${stn}ì—­</div>
      <div class="alarm-popup-sub">ì•ŒëŒ ì¢…ë¥˜ë¥¼ ì„ íƒí•˜ì„¸ìš”</div>
      <button class="alarm-popup-option${boardSet?' active':''}" id="ap-board" onclick="toggleAlarmType('board','${trainNo}','${stn}','${depTime}','${prevTime}')">
        <div class="alarm-popup-option-text">
          <span class="alarm-popup-option-label">ğŸš‰ ìŠ¹ì°¨ ì•ŒëŒ</span>
          <span class="alarm-popup-option-desc">ì „ì—­ ì¶œë°œ Â· 5ë¶„ ì „ Â· ì¶œë°œ ì‹œê° (3íšŒ)</span>
        </div>
        <span class="alarm-popup-option-icon">${boardSet?'âœ…':'â—‹'}</span>
      </button>
      <button class="alarm-popup-option${arrSet?' active':''}" id="ap-arr" onclick="toggleAlarmType('arr','${trainNo}','${stn}','${arrTime}','${prevTime}')">
        <div class="alarm-popup-option-text">
          <span class="alarm-popup-option-label">ğŸ›¬ í•˜ì°¨ ì•ŒëŒ</span>
          <span class="alarm-popup-option-desc">ì „ì—­ ì¶œë°œ Â· 5ë¶„ ì „ Â· ë„ì°© ì‹œê° (3íšŒ)</span>
        </div>
        <span class="alarm-popup-option-icon">${arrSet?'âœ…':'â—‹'}</span>
      </button>
      <button class="alarm-popup-close" onclick="closeAlarmPopup()">ë‹«ê¸°</button>
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
      // ìŠ¹ì°¨: ì „ì—­ ì¶œë°œ + 5ë¶„ ì „ + ì—­ ë„ì°©(ìŠ¹ì°¨ ì‹œê°) - 3ë‹¨ê³„
      const idArr=`board-prev:${trainNo}:${stn}`;
      const id5=`board:${trainNo}:${stn}`;
      const idNow=`board-now:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id5);
      if(already){
        // ì·¨ì†Œ
        const filtered=alarms.filter(a=>a.id!==id5&&a.id!==idArr&&a.id!==idNow);
        saveAlarms(filtered);
        if(!silent)alert(`ìŠ¹ì°¨ ì•ŒëŒì´ ì·¨ì†Œë˜ì—ˆìŠµë‹ˆë‹¤.`);
      } else {
        const depM=toMin(baseTime);
        if(depM===null){alert('ì¶œë°œ ì‹œê°ì´ ì—†ì–´ ìŠ¹ì°¨ ì•ŒëŒì„ ì„¤ì •í•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.');return;}
        // 1) ì „ì—­ ì¶œë°œ ì•ŒëŒ
        const prevM=toMin(prevTime);
        if(prevM!==null){
          const hp=Math.floor(prevM/60),mp=prevM%60;
          alarms.push({id:idArr,trainNo,stn,type:'board-prev',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ ìŠ¹ì°¨ (ì „ì—­ì¶œë°œ)`,fired:false});
        }
        // 2) 5ë¶„ ì „ ì•ŒëŒ
        const m5=depM-5<0?depM-5+1440:depM-5;
        const h5=Math.floor(m5/60),mm5=m5%60;
        alarms.push({id:id5,trainNo,stn,type:'board-5',alarmM:m5,timeStr:`${h5}:${mm5.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ ìŠ¹ì°¨ (5ë¶„ ì „)`,fired:false});
        // 3) ì—­ ë„ì°©(ìŠ¹ì°¨ ì‹œê°) ì•ŒëŒ
        const hd=Math.floor(depM/60),md=depM%60;
        alarms.push({id:idNow,trainNo,stn,type:'board-now',alarmM:depM,timeStr:`${hd}:${md.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ ìŠ¹ì°¨ (ì¶œë°œ)`,fired:false});
        saveAlarms(alarms);
        if(!silent)alert(`ìŠ¹ì°¨ ì•ŒëŒì´ ì„¤ì •ë˜ì—ˆìŠµë‹ˆë‹¤.`);
      }
    } else {
      // í•˜ì°¨: ì „ì—­ ì¶œë°œ + 5ë¶„ ì „(ë„ì°© ì˜ˆì •) + ì—­ ë„ì°© - 3ë‹¨ê³„
      const idPrev=`arr-prev:${trainNo}:${stn}`;
      const id5=`arr:${trainNo}:${stn}`;
      const idNow=`arr-now:${trainNo}:${stn}`;
      const alarms=loadAlarms();
      const already=alarms.some(a=>a.id===id5);
      if(already){
        saveAlarms(alarms.filter(a=>a.id!==id5&&a.id!==idPrev&&a.id!==idNow));
        if(!silent)alert(`í•˜ì°¨ ì•ŒëŒì´ ì·¨ì†Œë˜ì—ˆìŠµë‹ˆë‹¤.`);
      } else {
        const arrM=toMin(baseTime);
        if(arrM===null){alert('ë„ì°© ì‹œê°ì´ ì—†ì–´ í•˜ì°¨ ì•ŒëŒì„ ì„¤ì •í•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.');return;}
        // 1) ì „ì—­ ì¶œë°œ ì•ŒëŒ
        const prevM=toMin(prevTime);
        if(prevM!==null){
          const hp=Math.floor(prevM/60),mp=prevM%60;
          alarms.push({id:idPrev,trainNo,stn,type:'arr-prev',alarmM:prevM,timeStr:`${hp}:${mp.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ í•˜ì°¨ (ì „ì—­ì¶œë°œ)`,fired:false});
        }
        // 2) 5ë¶„ ì „ ì•ŒëŒ
        const m5=arrM-5<0?arrM-5+1440:arrM-5;
        const h5=Math.floor(m5/60),mm5=m5%60;
        alarms.push({id:id5,trainNo,stn,type:'arr-5',alarmM:m5,timeStr:`${h5}:${mm5.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ í•˜ì°¨ (5ë¶„ ì „)`,fired:false});
        // 3) ì—­ ë„ì°© ì•ŒëŒ
        const ha=Math.floor(arrM/60),ma=arrM%60;
        alarms.push({id:idNow,trainNo,stn,type:'arr-now',alarmM:arrM,timeStr:`${ha}:${ma.toString().padStart(2,'0')}`,label:`${trainNo}ë²ˆ Â· ${stn}ì—­ í•˜ì°¨ (ë„ì°©)`,fired:false});
        saveAlarms(alarms);
        if(!silent)alert(`í•˜ì°¨ ì•ŒëŒì´ ì„¤ì •ë˜ì—ˆìŠµë‹ˆë‹¤.`);
      }
    }
    if(!silent)closeAlarmPopup();
    renderAlarmIfOpen();
    // ì—´ì°¨ ìƒì„¸ ìƒˆë¡œê³ ì¹¨
    const card=document.getElementById('dc-'+trainNo);
    if(card){const trains=getTrainsByNo(trainNo);const el=document.getElementById('result-train');if(el&&trains.length)el.innerHTML=trains.map(renderDetail).join('');}
  });
}

function requestNotifPermission(cb){
  if(!('Notification' in window)){alert('ì´ ë¸Œë¼ìš°ì €ëŠ” ì•Œë¦¼ì„ ì§€ì›í•˜ì§€ ì•ŠìŠµë‹ˆë‹¤.');return;}
  if(Notification.permission==='granted'){cb();return;}
  if(Notification.permission==='denied'){alert('ì•Œë¦¼ì´ ì°¨ë‹¨ë˜ì–´ ìˆìŠµë‹ˆë‹¤. ë¸Œë¼ìš°ì € ì„¤ì •ì—ì„œ ì•Œë¦¼ì„ í—ˆìš©í•´ì£¼ì„¸ìš”.');return;}
  Notification.requestPermission().then(p=>{if(p==='granted')cb();else alert('ì•Œë¦¼ ê¶Œí•œì´ ê±°ë¶€ë˜ì—ˆìŠµë‹ˆë‹¤.');});
}

function renderAlarmIfOpen(){
  const panel=document.getElementById('panel-alarm');
  if(panel&&panel.classList.contains('active'))renderAlarms();
}

function deleteAlarm(id){
  const alarms=loadAlarms();
  const target=alarms.find(a=>a.id===id);
  if(!target){renderAlarms();return;}
  // ê°™ì€ ì—´ì°¨+ì—­+ìŠ¹ì°¨/í•˜ì°¨ ë¬¶ìŒì„ í•œ ë²ˆì— ì‚­ì œ (ì „ì—­ì¶œë°œ/5ë¶„ì „/ë„ì°© 3ê°œ ëª¨ë‘)
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
    el.innerHTML=`<div class="alarm-empty"><div style="font-size:36px;margin-bottom:12px">ğŸ””</div><p>ì„¤ì •ëœ ì•ŒëŒì´ ì—†ìŠµë‹ˆë‹¤.<br>ì—´ì°¨ ìƒì„¸ì—ì„œ ğŸ”” ë²„íŠ¼ìœ¼ë¡œ ì¶”ê°€í•˜ì„¸ìš”.</p><p class="hint" style="margin-top:16px"><button class="btn" style="font-size:12px;padding:6px 14px" onclick="testAlarm()">ğŸ§ª ì•ŒëŒ í…ŒìŠ¤íŠ¸</button></p></div>
    ${renderAlarmGroupsSection()}`;
    return;
  }
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  // ëª©ë¡ì—ëŠ” ëŒ€í‘œ ì•ŒëŒ(ìŠ¹ì°¨=board-now, í•˜ì°¨=arr-now)ë§Œ í‘œì‹œ.
  // ë‚˜ë¨¸ì§€(ì „ì—­ì¶œë°œ/5ë¶„ì „)ëŠ” ë°œì†¡ì€ ê·¸ëŒ€ë¡œ ë˜ì§€ë§Œ ëª©ë¡ì—” ì•ˆ ë³´ì„.
  const visible=alarms.filter(a=>a.type==='board-now'||a.type==='arr-now');
  const sorted=[...visible].sort((a,b)=>a.alarmM-b.alarmM);
  const hasFired=alarms.some(a=>a.fired);
  const typeLabel={'board-now':'ìŠ¹ì°¨','arr-now':'í•˜ì°¨'};
  const typeBadgeClass={'board-now':'alarm-type-board','arr-now':'alarm-type-arr'};
  const cards=sorted.map(a=>{
    const diff=a.alarmM-nowMin;
    let subText,subClass='';
    if(a.fired){subText='âœ… ì•ŒëŒ ì™„ë£Œ';subClass='done';}
    else if(diff<=0){subText='ê³§ ë„ì°© ì˜ˆì •';subClass='';}
    else if(diff<60){subText=`${diff}ë¶„ í›„ ë„ì°© ì˜ˆì •`;}
    else{const h=Math.floor(diff/60),m=diff%60;subText=`${h}ì‹œê°„ ${m>0?m+'ë¶„ ':''}í›„ ë„ì°© ì˜ˆì •`;}
    return `<div class="alarm-card${a.fired?' fired':''}">
      <div class="alarm-card-info">
        <div class="alarm-card-title"><span class="alarm-type-badge ${typeBadgeClass[a.type]||'alarm-type-board'}">${typeLabel[a.type]||'ì•ŒëŒ'}</span>${a.label}</div>
        <div class="alarm-card-sub ${subClass}">${subText}</div>
      </div>
      <div class="alarm-card-time">${a.timeStr}</div>
      <button class="alarm-del-btn" onclick="deleteAlarm('${a.id}')">âœ•</button>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="result-header">
    <div class="result-title">ğŸ”” ì•ŒëŒ ëª©ë¡</div>
    <span class="badge blue">${visible.filter(a=>!a.fired).length}ê°œ ëŒ€ê¸°</span>
    ${hasFired?'<button class="btn" style="font-size:12px;padding:4px 10px" onclick="clearFiredAlarms()">ì™„ë£Œ ì§€ìš°ê¸°</button>':''}
  </div>
  ${renderAlarmGroupsSection()}
  ${cards}<p class="hint">â€» ë¸Œë¼ìš°ì € íƒ­ì´ ì—´ë ¤ìˆì–´ì•¼ ì•ŒëŒì´ ì‘ë™í•©ë‹ˆë‹¤ (ì¶œë°œ/ë„ì°© ì „ ì´ 3íšŒ ì•Œë¦¼ì´ ë°œì†¡ë©ë‹ˆë‹¤)</p>`;
}

// ì•ŒëŒ ê·¸ë£¹ ì„¹ì…˜ ë Œë”ë§
function renderAlarmGroupsSection(){
  const groups=loadAlarmGroups();
  const alarms=loadAlarms();
  const saveBtn=`<button class="btn" style="font-size:12px;padding:5px 12px" onclick="saveCurrentAsGroup()" ${!alarms.length?'disabled':''}>ğŸ’¾ í˜„ì¬ ì•ŒëŒì„ ê·¸ë£¹ìœ¼ë¡œ ì €ì¥</button>`;

  if(!groups.length){
    return `<div class="alarm-group-section">
      <div class="alarm-group-title">â° ì•ŒëŒ ê·¸ë£¹</div>
      <p class="hint" style="margin:4px 0 8px">ìì£¼ ì“°ëŠ” ì•ŒëŒ ì¡°í•©ì„ ê·¸ë£¹ìœ¼ë¡œ ì €ì¥í•˜ë©´ í•œ ë²ˆì— ë‹¤ì‹œ ì„¤ì •í•  ìˆ˜ ìˆìŠµë‹ˆë‹¤.</p>
      ${saveBtn}
    </div>`;
  }

  const groupCards=groups.map(g=>`
    <div class="alarm-group-card">
      <div class="alarm-group-card-info">
        <div class="alarm-group-card-name">${g.name}</div>
        <div class="alarm-group-card-desc">${g.items.length}ê°œ ì•ŒëŒ (ì—´ì°¨ ${[...new Set(g.items.map(i=>i.trainNo))].join(', ')})</div>
      </div>
      <button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="applyAlarmGroup('${g.id}')">â–¶ ì ìš©</button>
      <button class="alarm-del-btn" onclick="deleteAlarmGroup('${g.id}')">âœ•</button>
    </div>`).join('');

  return `<div class="alarm-group-section">
    <div class="alarm-group-title">â° ì•ŒëŒ ê·¸ë£¹</div>
    ${groupCards}
    ${saveBtn}
  </div>`;
}

function sendNotification(title, body){
  if(Notification.permission!=='granted') return;
  // SW ready ë°©ì‹ (ê°€ì¥ ì‹ ë¢°ì„± ë†’ìŒ - ë°±ê·¸ë¼ìš´ë“œ í¬í•¨)
  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(title,{
        body,
        icon:'/NIMBYRAILTABLE/assets/icons/icon-192.png',
        badge:'/NIMBYRAILTABLE/assets/icons/icon-192.png',
        vibrate:[200,100,200],
        requireInteraction:false,
        tag:'nimbirail-alarm-'+Date.now(),
      });
    }).catch(()=>{
      // SW ì‹¤íŒ¨ ì‹œ ê¸°ë³¸ Notification í´ë°±
      new Notification(title,{body,icon:'/NIMBYRAILTABLE/assets/icons/icon-192.png'});
    });
  } else {
    new Notification(title,{body,icon:'/NIMBYRAILTABLE/assets/icons/icon-192.png'});
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸš† íƒ‘ìŠ¹ ì¤‘ ìŠ¹ì°¨ê¶Œ - ì§„í–‰ ìƒíƒœ ì§€ì† ì•Œë¦¼ (ìƒë‹¨ë°” ìœ„ì ¯)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ê°™ì€ tagë¥¼ ê³„ì† ì¬ì‚¬ìš© â†’ ìƒˆ ì•Œë¦¼ì´ ìŒ“ì´ì§€ ì•Šê³  ê°™ì€ ìë¦¬ì—ì„œ ë‚´ìš©ë§Œ ê°±ì‹ ë¨
const TRIP_NOTIF_TAG='nimbirail-trip-progress';
let _tripNotifInterval=null;

// ì˜¤ëŠ˜ íƒ‘ìŠ¹í•˜ë©´ì„œ "í˜„ì¬ ìš´í–‰ ì¤‘"ì´ê±°ë‚˜ "ì¶œë°œ 10ë¶„ ì „"ì¸ ìŠ¹ì°¨ê¶Œ ì°¾ê¸°
function getActiveTripTicket(){
  const tickets=loadTickets();
  if(!tickets.length)return null;
  const today=todayLocalStr();
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();

  // ì–´ì œ ë‚ ì§œ ê³„ì‚° (ìµì¼ ë„ì°© ì—´ì°¨ ì²´í¬ìš©)
  const yesterdayD=new Date(now); yesterdayD.setDate(yesterdayD.getDate()-1);
  const yesterday=todayLocalStr(yesterdayD);

  for(const tk of tickets){
    if(tk.status!=='active')continue;
    const depM=toMin(tk.depTime);
    const arrM=toMin(tk.arrTime);
    if(depM===null||arrM===null)continue;
    // ìì • ë„˜ëŠ” ì—´ì°¨: dep > arr
    const isOvernight = depM>arrM;
    // ì˜¤ëŠ˜ ì¶œë°œì´ê±°ë‚˜, ì–´ì œ ì¶œë°œí•œ ìµì¼ ë„ì°© ì—´ì°¨(í˜„ì¬ ìƒˆë²½ì— ìš´í–‰ ì¤‘)
    const isToday = tk.travelDate===today;
    const isYesterdayOvernight = isOvernight && tk.travelDate===yesterday;
    if(!isToday && !isYesterdayOvernight) continue;

    const t=getTrainByNo(tk.trainNo);
    if(!t)continue;

    // ì¶œë°œ 10ë¶„ ì „ (ì˜¤ëŠ˜ ì¶œë°œ ì—´ì°¨ë§Œ): ìœ„ì ¯ì— "ìŠ¹ì°¨ ì¤€ë¹„" ìƒíƒœë¡œ í‘œì‹œ
    if(isToday){
      const minsUntilDep = depM - nowM;
      if(minsUntilDep > 0 && minsUntilDep <= 10){
        return {ticket:tk, train:t, status:null, preBoard:true, minsUntilDep};
      }
    }

    // ìš´í–‰ ì¤‘: í˜„ì¬ ìƒíƒœ í™•ì¸
    const status=getCurrentStatus(t);
    if(!status||status.status!=='running')continue;
    // ìŠ¹ì°¨ì—­ì„ ì´ë¯¸ ì§€ë‚¬ê³  í•˜ì°¨ì—­ì— ì•„ì§ ë„ì°© ì•ˆ í–ˆëŠ”ì§€ í™•ì¸
    const fi=t.stops.findIndex(s=>s.s===tk.fromStn);
    const ti=t.stops.findIndex(s=>s.s===tk.toStn);
    if(fi===-1||ti===-1)continue;
    // ë‚ ì§œ ê¸°ì¤€ìœ¼ë¡œ íƒ‘ìŠ¹ êµ¬ê°„ íŒì •.
    // ìì • ë„˜ëŠ” ì—´ì°¨ëŠ” 'ì˜¤ëŠ˜ ì¶œë°œë¶„(ì €ë…, ìì • ì „)'ê³¼ 'ì–´ì œ ì¶œë°œë¶„(ìƒˆë²½, ìì • í›„)'ì„
    // ê°ê° í•´ë‹¹ ë‚ ì§œì—ë§Œ ìœ íš¨í•˜ë„ë¡ ë¶„ë¦¬í•œë‹¤.
    // (ì˜ˆ: ì–´ì œ 19:40 ì¶œë°œÂ·ì˜¤ëŠ˜ 0:52 ë„ì°© ìŠ¹ì°¨ê¶Œì´ ì˜¤ëŠ˜ ì €ë…ì— ë‹¤ì‹œ ëœ¨ëŠ” ë²„ê·¸ ë°©ì§€)
    let inRange;
    if(depM<=arrM){
      inRange = isToday && nowM>=depM-2 && nowM<=arrM+2;   // ë‹¹ì¼ ìš´í–‰
    } else if(isToday){
      inRange = nowM>=depM-2;                              // ì˜¤ëŠ˜ ì €ë… ì¶œë°œë¶„ (ìì • ì „)
    } else {
      inRange = nowM<=arrM+2;                              // ì–´ì œ ì¶œë°œÂ·ì˜¤ëŠ˜ ìƒˆë²½ ë„ì°©ë¶„ (ìì • í›„)
    }
    if(!inRange)continue;

    // ë„ì°© 5ë¶„ ì „: ìœ„ì ¯ì— "ë„ì°© ì¤€ë¹„" ìƒíƒœë¡œ í‘œì‹œ
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

// ì§„í–‰ ìƒíƒœ ì•Œë¦¼ ë‚´ìš© êµ¬ì„± ë° ë°œì†¡ (ê°™ì€ tagë¡œ ê°±ì‹ )
// í˜„ì¬ ìœ„ì¹˜ ê¸°ì¤€ ì´ì „ì—­/í˜„ì¬(ì •ì°¨Â·í†µê³¼)/ë‹¤ìŒì—­ 3ê°œë¥¼ ì‹œê°„ìˆœìœ¼ë¡œ ì¶”ì¶œ
// (í†µê³¼ì—­ë„ í¬í•¨, ì‹œê°„ íë¦„ì— ë”°ë¼ ë§¤ë²ˆ ìƒˆë¡œ ê³„ì‚°ë¨)
function getTripTimeline3(train, status, ticket){
  // ì‹œê° ìˆëŠ” ì—­ ì „ì²´ (í†µê³¼ í¬í•¨)
  const allStops = train.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(!allStops.length) return null;

  const timeOf = s => !s ? null : (hasTime(s.dep)?s.dep:(hasTime(s.arr)?s.arr:null));
  const toEntry = s => s ? {name:s.s, time:timeOf(s)} : null;

  // ì •ì°¨ì—­ = dep ìˆëŠ” ì—­ + ì¢…ì°©ì—­(ë§ˆì§€ë§‰ ì—­)
  const terminus = allStops[allStops.length-1].s;
  const isStopStn = s => hasTime(s.dep) || s.s === terminus;

  // íƒ‘ìŠ¹ êµ¬ê°„(fromStn~toStn) ë‚´ ì •ì°¨ì—­ë§Œ ì‚¬ìš©
  // ticketì´ ìˆìœ¼ë©´ íƒ‘ìŠ¹ êµ¬ê°„ìœ¼ë¡œ ì œí•œ
  let stopsOnly;
  if(ticket && ticket.fromStn && ticket.toStn){
    const fi = allStops.findIndex(s=>s.s===ticket.fromStn);
    const ti = allStops.findIndex(s=>s.s===ticket.toStn);
    if(fi>=0 && ti>fi){
      // fromStn~toStn êµ¬ê°„ì˜ ì •ì°¨ì—­ë§Œ
      stopsOnly = allStops.slice(fi, ti+1).filter(s=>isStopStn(s));
      // fromStn, toStnì´ ì •ì°¨ì—­ ëª©ë¡ì— ì—†ìœ¼ë©´ ê°•ì œ ì¶”ê°€
      if(!stopsOnly.find(s=>s.s===ticket.fromStn)) stopsOnly.unshift(allStops[fi]);
      if(!stopsOnly.find(s=>s.s===ticket.toStn)) stopsOnly.push(allStops[ti]);
    } else {
      stopsOnly = allStops.filter(s=>isStopStn(s));
    }
  } else {
    stopsOnly = allStops.filter(s=>isStopStn(s));
  }
  if(!stopsOnly.length) return null;

  // â”€â”€ ì‹œê°„ ê¸°ì¤€ ìœ„ì¹˜ ê³„ì‚° (í†µê³¼ì—­/status ì˜ì¡´ì„± ì œê±°, í•­ìƒ ì „/ì´ë²ˆ/ë‹¤ìŒ 3ì—­ í™•ë³´) â”€â”€
  // ê° ì •ì°¨ì—­ì˜ "ì¶œë°œ(=ë– ë‚˜ëŠ”) ì‹œê°" = dep ìˆìœ¼ë©´ dep, ì—†ìœ¼ë©´ arr. ìì • ë³´ì • ëˆ„ì .
  const normalized = [];
  let offset = 0, prevRaw = -1;
  for(const s of stopsOnly){
    const raw = toMin(timeOf(s));
    if(raw === null){ normalized.push({s, norm:null}); continue; }
    if(prevRaw >= 0 && raw < prevRaw - 60) offset += 1440;
    normalized.push({s, norm: raw + offset});
    prevRaw = raw;
  }

  // í˜„ì¬ ì‹œê° (ìì • ë„˜ëŠ” ìš´í–‰ ë³´ì •)
  const nowD = new Date();
  let nowM = nowD.getHours()*60 + nowD.getMinutes();
  const firstNorm = normalized.find(n=>n.norm!==null)?.norm ?? 0;
  const lastNorm  = [...normalized].reverse().find(n=>n.norm!==null)?.norm ?? 0;
  if(lastNorm > 1440 && nowM < firstNorm) nowM += 1440;

  // ì´ë²ˆì—­(cur) = ì•„ì§ ë– ë‚˜ì§€ ì•Šì€ ì²« ì •ì°¨ì—­ (ë„ì°© ì¤‘ì´ê±°ë‚˜ ì •ì°¨ ì¤‘)
  let ci = normalized.findIndex(n => n.norm !== null && n.norm > nowM);
  if(ci < 0) ci = stopsOnly.length - 1; // ì „ë¶€ ì§€ë‚¬ìœ¼ë©´ ì¢…ì°©ì—­

  const prevStop = ci > 0 ? stopsOnly[ci-1] : null;
  const curStop  = stopsOnly[ci];
  const nextStop = ci+1 < stopsOnly.length ? stopsOnly[ci+1] : null;

  return {
    prev: toEntry(prevStop),
    cur:  curStop ? {name:curStop.s, time:timeOf(curStop), isPass:false} : null,
    next: toEntry(nextStop),
  };
}

// ì´ë²ˆ ì—­ ì´í›„ ë‚¨ì€ ì •ì°¨ì—­ ì´ë¦„ ëª©ë¡ (ë‹¤ìŒì—­ ~ í•˜ì°¨ì—­). LED ì•ˆë‚´ìš©.
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
  // ì´ë²ˆì—­(ì ‘ê·¼/ì •ì°¨ ì¤‘) í¬í•¨í•˜ì—¬ ë‚¨ì€ ì •ì°¨ì—­ ì „ì²´
  return stopsOnly.slice(ci).map(s=>s.s);
}

// LED í‘œì‹œ on/off (íƒ‘ìŠ¹ ì¹´ë“œ LED í† ê¸€)
function ledEnabled(){ return localStorage.getItem('nimbi_led_on')!=='0'; }
// íƒ‘ìŠ¹ ì—¬ì • ì¹´ë“œ ì¶•ì†Œ í‘œì‹œ (ì„¤ì •)
let _tripCompact = localStorage.getItem('nimbi_trip_compact')==='1';
function toggleTripCompact(){
  _tripCompact=!_tripCompact;
  try{ localStorage.setItem('nimbi_trip_compact', _tripCompact?'1':'0'); }catch(e){}
  if(typeof updateHomeTripWidget==='function') updateHomeTripWidget();
  const el=document.getElementById('my-sub-content'); if(el&&typeof renderSettingsSection==='function') renderSettingsSection(el);
}
function toggleTripLED(ev){
  if(ev) ev.stopPropagation();
  localStorage.setItem('nimbi_led_on', ledEnabled()?'0':'1');
  if(typeof renderTickets==='function') renderTickets();
  if(typeof updateHomeTripWidget==='function') updateHomeTripWidget();
}

// íƒ‘ìŠ¹ ì¹´ë“œ LED í‘œì‹œ ìˆœí™˜ í”„ë ˆì„: ì•ˆë‚´ë¬¸êµ¬ â†’ ì´ë²ˆì—­ â†’ ë‹¤ìŒì—­ â†’ í–‰ì„ ì§€ â†’ ë‚¨ì€ ì •ì°¨ì—­(ë„ˆë¹„ ë§ì¶¤ ìŠ¬ë¼ì´ë”©)
// dur: í”„ë ˆì„ ìœ ì§€ ì‹œê°„(ms). ë‚¨ì€ ì •ì°¨ì—­(í•˜ë‚˜ì”© ìŒ“ê¸°/ì „ì§„)ì€ ë” ë¹ ë¥´ê²Œ.
function getTripLEDFrames(active, ledWidth){
  if(!active) return [];
  const {ticket,train,status,preBoard,minsUntilDep,preArr}=active;
  const D_HEAD=3000, D_STOP=1600;
  if(preBoard){
    return [
      {tag:'ì¶œë°œì—­', text:`${ticket.fromStn}`, dur:D_HEAD},
      {tag:'í–‰ì„ ì§€', text:`${train.dest}í–‰`, dur:D_HEAD},
      {tag:'ê³§ ì¶œë°œ', text:`${fmtEta(minsUntilDep)} ì¶œë°œ`, dur:D_HEAD},
    ];
  }
  if(preArr){
    return [
      {tag:'ì•ˆë‚´', text:`ì ì‹œ í›„ ${ticket.toStn}ì—­ì— ë„ì°©í•©ë‹ˆë‹¤`, dur:D_HEAD},
      {tag:'ê³§ ë„ì°©', text:`${ticket.toStn} Â· ë‚´ë¦¬ëŠ” ë¬¸ í™•ì¸`, dur:D_HEAD},
    ];
  }
  const D_ANN=5000;
  const tl=getTripTimeline3(train,status,ticket);
  const cur = tl&&tl.cur ? tl.cur.name : (status&&status.atStn?status.atStn:null);
  // ì•ˆë‚´ ë¬¸êµ¬ íŒë³„ (ì •ì°¨ ì¤‘ / ì ‘ê·¼ ì¤‘ 5ë¶„ ì „)
  let announce=null;
  if(status&&status.atStn){
    announce={tag:'ì•ˆë‚´', text:`${status.atStn}ì—­ì— ì •ì°¨ ì¤‘ì…ë‹ˆë‹¤`, dur:D_ANN};
  } else if(tl&&tl.cur&&tl.cur.time){
    const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
    const mm=toMin(tl.cur.time); const d=mm!=null?((mm-nowM+1440)%1440):null;
    if(d!=null && d<=5) announce={tag:'ì•ˆë‚´', text:`ì ì‹œ í›„ ${tl.cur.name}ì—­ì— ë„ì°©í•©ë‹ˆë‹¤`, dur:D_ANN};
  }
  // ë‚¨ì€ ì •ì°¨ì—­ í”„ë ˆì„ (ë„ˆë¹„ ë§ì¶¤ ìŠ¬ë¼ì´ë”©)
  const rem=getRemainingStops(train,ticket);
  const remFrames = rem.length ? computeStopWindows(rem, ledWidth).map(w=>({tag:'ë‚¨ì€ ì •ì°¨ì—­', text:w, dur:D_STOP})) : [];

  const frames=[];
  if(announce){
    // ì•ˆë‚´ í‘œì¶œ ì‹œ: ì•ˆë‚´(5ì´ˆ) â†’ ë‚¨ì€ ì •ì°¨ì—­ â†’ ì•ˆë‚´ ìˆœìœ¼ë¡œë§Œ
    frames.push(announce);
    remFrames.forEach(f=>frames.push(f));
  } else {
    // í‰ìƒì‹œ: ì´ë²ˆì—­ â†’ ë‹¤ìŒì—­ â†’ í–‰ì„ ì§€ â†’ ë‚¨ì€ ì •ì°¨ì—­
    if(cur) frames.push({tag:'ì´ë²ˆ ì—­', text: cur + (cur===ticket.toStn?' Â· ë‚´ë¦¬ëŠ” ë¬¸ í™•ì¸':''), dur:D_HEAD});
    if(tl&&tl.next) frames.push({tag:'ë‹¤ìŒ ì—­', text: tl.next.name, dur:D_HEAD});
    frames.push({tag:'í–‰ì„ ì§€', text:`${train.dest}í–‰`, dur:D_HEAD});
    remFrames.forEach(f=>frames.push(f));
  }
  if(!frames.length) frames.push({tag:'ì´ë²ˆ ì—­', text:'-', dur:D_HEAD});
  return frames;
}

// ë‚¨ì€ ì •ì°¨ì—­: í™”ë©´ ë„ˆë¹„ì— ë§ì¶° ì•ì—ì„œë¶€í„° ì±„ìš°ê³ , ë„˜ì¹˜ë©´ ë§¨ ì• ì—­ì„ ì§€ìš°ë©° í•œ ì¹¸ì”© ì „ì§„
// ì˜ˆ: ì²œì•ˆ ì„œì²­ì£¼ ëŒ€ì „ ì˜¥ì²œ â†’ ì„œì²­ì£¼ ëŒ€ì „ ì˜¥ì²œ ì˜ë™ â†’ ëŒ€ì „ ì˜¥ì²œ ì˜ë™ ê¹€ì²œ â€¦
const LED_SEP=' Â· ';
let _ledCanvas=null;
function measureLedText(str){
  try{
    if(!_ledCanvas) _ledCanvas=document.createElement('canvas');
    const ctx=_ledCanvas.getContext('2d');
    ctx.font="800 15px ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace";
    return ctx.measureText(str).width + str.length*1; // letter-spacing ~1px ë³´ì •
  }catch(e){ return str.length*11; }
}
function computeStopWindows(stops, maxWidth){
  const out=[]; const n=stops.length;
  if(!n) return out;
  if(!maxWidth || maxWidth<20) maxWidth=240;
  const fits=(s,e)=>measureLedText(stops.slice(s,e+1).join(LED_SEP))<=maxWidth;
  const fitEnd=(s)=>{ let e=s; while(e+1<n && fits(s,e+1)) e++; return e; };
  // â‘  ì•ì—ì„œë¶€í„° í•œ ì—­ì”© ìŒ“ê¸° (ì²œì•ˆ â†’ ì²œì•ˆ ì„œì²­ì£¼ â†’ â€¦)
  out.push(stops[0]);
  let e0=0;
  while(e0+1<n && fits(0,e0+1)){ e0++; out.push(stops.slice(0,e0+1).join(LED_SEP)); }
  // â‘¡ ì• ì—­ì„ í•˜ë‚˜ì”© ì§€ìš°ë©° ì „ì§„, ëì—ì„œëŠ” ì¢…ì°©ì—­ë§Œ ë‚¨ì„ ë•Œê¹Œì§€ ì¶•ì†Œ
  for(let s=1;s<n;s++){ out.push(stops.slice(s,fitEnd(s)+1).join(LED_SEP)); }
  return out;
}

// LED ìˆœí™˜ ê°±ì‹  (í”„ë ˆì„ë³„ ê°€ë³€ ê°„ê²©, í™”ë©´ì— ë– ìˆëŠ” íƒ‘ìŠ¹ ì¹´ë“œ LEDë¥¼ ì§ì ‘ ì—…ë°ì´íŠ¸)
let _ledFrameIdx=0, _ledTimer=null;
// ë‚¨ì€ ì •ì°¨ì—­ ì°½ì„ ì‹¤ì œ LED "ê°€ìš© í­"ì— ë§ì¶”ê¸° ìœ„í•œ í­ ì¸¡ì • (ìƒì„¸=trip-led-scr, ê°„ëµ=ì»¨í…Œì´ë„ˆ-íƒœê·¸)
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
    // íƒ€ì„ë¼ì¸: ì „ì—­ â†’ í˜„ì¬(ì •ì°¨/í†µê³¼) â†’ ë‹¤ìŒì—­
    const parts=[];
    if(tl.prev) parts.push(`${tl.prev.name} ${tl.prev.time}`);
    if(tl.cur)  parts.push(`${tl.cur.name}${tl.cur.isPass?'(í†µê³¼)':''} ${tl.cur.time}`);
    else        parts.push('ì´ë™ ì¤‘');
    if(tl.next) parts.push(`${tl.next.name} ${tl.next.time}`);
    body = parts.join('  â†’  ');

    if(status.atStn) title=`ğŸš† ${train.no} Â· ${status.atStn}ì—­ ì •ì°¨ ì¤‘`;
    else if(status.passStn) title=`ğŸš† ${train.no} Â· ${status.passStn}ì—­ í†µê³¼ ì¤‘`;
    else title=`ğŸš† ${train.no} Â· ${ticket.fromStn}â†’${ticket.toStn} ì´ë™ ì¤‘`;
  } else {
    title=`ğŸš† ${train.no} ${GL[train.grade]||train.grade} íƒ‘ìŠ¹ ì¤‘`;
    body=`${ticket.fromStn} â†’ ${ticket.toStn} ìš´í–‰ ì¤‘`;
  }

  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(title,{
        body,
        icon:'/NIMBYRAILTABLE/assets/icons/icon-192.png',
        badge:'/NIMBYRAILTABLE/assets/icons/icon-192.png',
        tag:TRIP_NOTIF_TAG,       // ê³ ì • tag â†’ ìƒˆ ì•Œë¦¼ ì•ˆ ìŒ“ì´ê³  ê°±ì‹ ë§Œ ë¨
        renotify:false,            // ê°±ì‹  ì‹œ ì¬ì§„ë™/ì¬ì•Œë¦¼ìŒ ì—†ìŒ
        silent:true,
        requireInteraction:true,   // ì‚¬ìš©ìê°€ ì§ì ‘ ë‹«ê¸° ì „ê¹Œì§€ ìœ ì§€
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

// íƒ­ì´ ì—´ë ¤ìˆëŠ” ë™ì•ˆ 1ë¶„ë§ˆë‹¤ ì§„í–‰ ìƒíƒœ ê°±ì‹  (SWê°€ ì‚´ì•„ìˆëŠ” í•œ ë°±ê·¸ë¼ìš´ë“œì—ì„œë„ ìœ ì§€ë¨)
function startTripProgressTracking(){
  if(_tripNotifInterval)return;
  updateTripProgressNotif();
  _tripNotifInterval=setInterval(updateTripProgressNotif,60000);
}
// ì•Œë¦¼ ëŒ€ì‹  ìŠ¹ì°¨ê¶Œ íƒ­ ë‚´ ìœ„ì ¯(trip-widget)ìœ¼ë¡œ í‘œì‹œí•˜ë¯€ë¡œ ìë™ ì•Œë¦¼ ë°œì†¡ì€ ë¹„í™œì„±í™”.
// window.addEventListener('load',()=>{
//   setTimeout(startTripProgressTracking,1000);
// });
// ê¸°ì¡´ì— ë–  ìˆë˜ ì§„í–‰ ì•Œë¦¼ì´ ìˆë‹¤ë©´ ì •ë¦¬
window.addEventListener('load',()=>{
  setTimeout(()=>{ if(typeof clearTripProgressNotif==='function') clearTripProgressNotif(); },1000);
  if(typeof _populateTrainLineSelect==='function') _populateTrainLineSelect();
});

function checkAlarms(){
  const alarms=loadAlarms();
  if(!alarms.length)return;
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  let changed=false;
  alarms.forEach(a=>{
    if(a.fired)return;
    // ì•ŒëŒ ì‹œê°ì´ ëê±°ë‚˜ ì§€ë‚¬ìœ¼ë©´ ìš¸ë¦¼ (ë†“ì¹¨ ë°©ì§€: alarmM <= nowM)
    // ë‹¨ ë„ˆë¬´ ì˜¤ë˜ ì§€ë‚œ ê²ƒ(10ë¶„ ì´ˆê³¼)ì€ ì¡°ìš©íˆ fired ì²˜ë¦¬
    const diff=nowM-a.alarmM;
    if(diff>=0&&diff<=10){
      a.fired=true;changed=true;
      if(diff<=2){
        // 2ë¶„ ì´ë‚´ëŠ” ì‹¤ì œ ì•Œë¦¼ ë°œì†¡
        const body={
          'board-prev':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ê³§ ${a.stn}ì—­ì— ë„ì°©í•©ë‹ˆë‹¤ (ìŠ¹ì°¨ ì¤€ë¹„)`,
          'board-5':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ${a.stn}ì—­ì—ì„œ 5ë¶„ í›„ ì¶œë°œí•©ë‹ˆë‹¤`,
          'board-now':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ${a.stn}ì—­ì—ì„œ ê³§ ì¶œë°œí•©ë‹ˆë‹¤`,
          'arr-prev':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ì „ì—­ì„ ì¶œë°œí–ˆìŠµë‹ˆë‹¤ (í•˜ì°¨ ì¤€ë¹„)`,
          'arr-5':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ${a.stn}ì—­ì— 5ë¶„ í›„ ë„ì°©í•©ë‹ˆë‹¤`,
          'arr-now':`${a.trainNo}ë²ˆ ì—´ì°¨ê°€ ê³§ ${a.stn}ì—­ì— ë„ì°©í•©ë‹ˆë‹¤`,
        }[a.type]||a.label;
        if(Notification.permission==='granted'){
          // SWë¥¼ í†µí•´ ì•Œë¦¼ ë°œì†¡ (ë°±ê·¸ë¼ìš´ë“œì—ì„œë„ ì‘ë™)
          sendNotification('ğŸ”” ë‹˜ë¹„ë ˆì¼ ì•ŒëŒ', body);
        }
      }
    }
  });
  if(changed){saveAlarms(alarms);renderAlarmIfOpen();}
}
// 10ì´ˆë§ˆë‹¤ ì²´í¬ (30ì´ˆëŠ” ë„ˆë¬´ ê¸¸ì–´ ì•ŒëŒì„ ë†“ì¹  ìˆ˜ ìˆìŒ)
setInterval(checkAlarms,10000);
// ì¦ê²¨ì°¾ê¸° ìë™ ê°±ì‹  (30ì´ˆë§ˆë‹¤)
setInterval(()=>{
  const panel=document.getElementById('panel-fav');
  if(panel&&panel.classList.contains('active')) renderFavs();
},30000);
// í˜ì´ì§€ ë¡œë“œ ì‹œ ì¦‰ì‹œ 1íšŒ ì²´í¬
setTimeout(checkAlarms,1000);

// â”€â”€ ì—¬ì„ ì•Œë¦¼ â”€â”€
const SEAT_WATCH_KEY='nimbi_seat_watches';
function loadSeatWatches(){try{return JSON.parse(localStorage.getItem(SEAT_WATCH_KEY))||[];}catch(e){return[];}}
function saveSeatWatches(w){localStorage.setItem(SEAT_WATCH_KEY,JSON.stringify(w));}

function openSeatWatchPopup(trainNo, fromStn, toStn, travelDate){
  travelDate=travelDate||todayLocalStr();
  const existing=loadSeatWatches().filter(w=>w.trainNo===trainNo&&w.active&&(w.travelDate||travelDate)===travelDate);
  const existingLabel=existing.length?existing.map(w=>w.seatClassLabel).join(', '):'';
  const wrap=document.createElement('div');
  wrap.id='seat-watch-wrap';
  wrap.innerHTML=`
    <div class="alarm-popup-backdrop" onclick="closeSeatWatchPopup()"></div>
    <div class="alarm-popup">
      <div class="alarm-popup-title">ğŸ”” ì—¬ì„ ì•Œë¦¼ ì„¤ì •</div>
      <div class="alarm-popup-sub" style="margin-bottom:12px"><b>${trainNo}</b> Â· ${fromStn} â†’ ${toStn}</div>
      ${existingLabel?`<div style="font-size:12px;color:var(--accent);margin-bottom:10px">í˜„ì¬ ì„¤ì •: ${existingLabel}</div>`:''}
      <div class="alarm-popup-sub" style="margin-bottom:8px">ì•Œë¦¼ ë°›ì„ ì¢Œì„ ë“±ê¸‰</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-general" value="general"> <span>ì¼ë°˜ì‹¤</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-special" value="special"> <span>íŠ¹ì‹¤</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;background:var(--bg3);border-radius:8px">
          <input type="checkbox" id="sw-standing" value="standing"> <span>ì…ì„/ììœ ì„</span>
        </label>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">ì—¬ì„ì´ ìƒê¸°ë©´ ë¸Œë¼ìš°ì € ì•Œë¦¼ìœ¼ë¡œ ì•Œë ¤ë“œë¦½ë‹ˆë‹¤. (ì‹œë®¬ë ˆì´ì…˜ ê¸°ì¤€)</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="confirmSeatWatch('${trainNo}','${fromStn}','${toStn}','${travelDate}')">ì•Œë¦¼ ì„¤ì •</button>
        <button class="btn alarm-popup-close" onclick="closeSeatWatchPopup()">ì·¨ì†Œ</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function closeSeatWatchPopup(){
  document.getElementById('seat-watch-wrap')?.remove();
}

function confirmSeatWatch(trainNo, fromStn, toStn, travelDate){
  const classes=[
    {id:'sw-general',key:'general',label:'ì¼ë°˜ì‹¤'},
    {id:'sw-special',key:'special',label:'íŠ¹ì‹¤'},
    {id:'sw-standing',key:'standing',label:'ì…ì„/ììœ ì„'}
  ].filter(c=>document.getElementById(c.id)?.checked);
  if(!classes.length){alert('ì•Œë¦¼ ë°›ì„ ì¢Œì„ ë“±ê¸‰ì„ 1ê°œ ì´ìƒ ì„ íƒí•´ì£¼ì„¸ìš”.');return;}

  requestNotifPermission(()=>{
    travelDate=travelDate||todayLocalStr();
    const watches=loadSeatWatches().filter(w=>!(w.trainNo===trainNo&&w.fromStn===fromStn&&w.toStn===toStn&&(w.travelDate||travelDate)===travelDate));
    classes.forEach(c=>{
      watches.push({id:`sw_${trainNo}_${c.key}_${Date.now()}`,trainNo,fromStn,toStn,
        travelDate,seatClass:c.key,seatClassLabel:c.label,active:true,createdAt:Date.now(),lastAvailable:0,notifiedEvents:[]});
    });
    saveSeatWatches(watches);
    closeSeatWatchPopup();
    alert(`âœ… ${trainNo}ë²ˆ ì—´ì°¨ ${classes.map(c=>c.label).join('/')} ì—¬ì„ ì•Œë¦¼ì´ ì„¤ì •ë˜ì—ˆìŠµë‹ˆë‹¤.`);
  });
}

function removeSeatWatch(id){
  saveSeatWatches(loadSeatWatches().filter(w=>w.id!==id));
}

function checkSeatWatches(){
  const all=loadSeatWatches(),watches=all.filter(w=>w.active);
  if(!watches.length)return;
  let changed=false;
  watches.forEach(w=>{
    const t=getTrainByNo(w.trainNo),date=w.travelDate||todayLocalStr();if(!t)return;
    const available=typeof getAvailableSeats==='function'?getAvailableSeats(t,w.fromStn,w.toStn,date,w.seatClass):0;
    const eventId=`${w.trainNo}:${date}:${w.fromStn}:${w.toStn}:${available}`,was=Number(w.lastAvailable)||0,notified=Array.isArray(w.notifiedEvents)?w.notifiedEvents:[];
    if(was===0&&available>0&&!notified.includes(eventId)){
      if(typeof Notification!=='undefined'&&Notification.permission==='granted')sendNotification('ğŸ”” ì—¬ì„ ì•Œë¦¼',`${w.trainNo}ë²ˆ ${w.fromStn}â†’${w.toStn} ${w.seatClassLabel} ì·¨ì†Œí‘œ ${available}ì„ì´ ìƒê²¼ì–´ìš”!`);
      w.notifiedEvents=[...notified,eventId].slice(-12);w.active=false;
    }
    w.lastAvailable=available;changed=true;
  });
  if(changed)saveSeatWatches(all);
}
// 5ë¶„ë§ˆë‹¤ ì—¬ì„ ì²´í¬
setInterval(checkSeatWatches, 5*60*1000);

// â”€â”€ ì¦ê²¨ì°¾ê¸° â”€â”€
const FAV_KEY='nimbi_favs';
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY))||[];}catch(e){return[];}}
function saveFavs(favs){localStorage.setItem(FAV_KEY,JSON.stringify(favs));}

// ì¦ê²¨ì°¾ê¸° ê·¸ë£¹ ì‹œìŠ¤í…œ (ì‚¬ìš©ì ì •ì˜ ê·¸ë£¹ ì§€ì›)
const FAV_GROUPS_KEY='nimbi_fav_groups';
const FAV_GROUPS_DEFAULT=[
  {id:'commute',label:'ì¶œí‡´ê·¼',icon:'ğŸ’¼',color:'#388bfd'},
  {id:'travel', label:'ì—¬í–‰',  icon:'âœˆï¸', color:'#3fb950'},
  {id:'etc',    label:'ê¸°íƒ€',  icon:'ğŸ“Œ', color:'#8b949e'},
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
// í•˜ìœ„ í˜¸í™˜: ê¸°ì¡´ ì½”ë“œê°€ FAV_CATEGORIESë¥¼ ì°¸ì¡°í•  ê²½ìš° ëŒ€ë¹„
const FAV_CATEGORIES={
  commute:{label:'ì¶œí‡´ê·¼',icon:'ğŸ’¼',color:'#388bfd'},
  travel: {label:'ì—¬í–‰',  icon:'âœˆï¸',color:'#3fb950'},
  etc:    {label:'ê¸°íƒ€',  icon:'ğŸ“Œ',color:'#8b949e'},
};

function addFav(type){
  let id,label,data={};
  if(type==='train'){
    const no=document.getElementById('input-trainno').value.trim();
    if(!no){alert('ì—´ì°¨ë²ˆí˜¸ë¥¼ ì…ë ¥ í›„ ì¶”ê°€í•´ì£¼ì„¸ìš”.');return;}
    id='train:'+no; label='ì—´ì°¨ '+no; data={no};
  } else if(type==='station'){
    const stn=document.getElementById('input-station').value.trim();
    if(!stn){alert('ì—­ ì´ë¦„ì„ ì…ë ¥ í›„ ì¶”ê°€í•´ì£¼ì„¸ìš”.');return;}
    id='station:'+stn; label=stn+'ì—­ ì‹œê°„í‘œ'; data={stn};
  } else if(type==='route'){
    const from=document.getElementById('input-from').value.trim();
    const to=document.getElementById('input-to').value.trim();
    if(!from||!to){alert('ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì„ ì…ë ¥ í›„ ì¶”ê°€í•´ì£¼ì„¸ìš”.');return;}
    id='route:'+from+':'+to; label=from+' â†’ '+to; data={from,to};
  }
  const favs=loadFavs();
  if(favs.some(f=>f.id===id)){alert('ì´ë¯¸ ì¦ê²¨ì°¾ê¸°ì— ì¶”ê°€ëœ í•­ëª©ì…ë‹ˆë‹¤.');return;}
  // ì¹´í…Œê³ ë¦¬ ì„ íƒ íŒì—… ë„ìš°ê³  ê·¸ ì•ˆì—ì„œ ìµœì¢… ì €ì¥
  openFavCategoryPicker(id,type,label,data);
}

// ì¦ê²¨ì°¾ê¸° ì¶”ê°€ ì‹œ ê·¸ë£¹ ì„ íƒ íŒì—…
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
      <div class="alarm-popup-title">â­ ${label}</div>
      <div class="alarm-popup-sub">ê·¸ë£¹ì„ ì„ íƒí•˜ì„¸ìš”</div>
      <div class="fav-cat-options">${opts}</div>
      <button class="alarm-popup-close" onclick="closeFavCategoryPicker()">ì·¨ì†Œ</button>
    </div>`;
  document.body.appendChild(wrap);
  window._pendingFavData=data;
}
function closeFavCategoryPicker(){
  const w=document.getElementById('fav-cat-popup-wrap');
  if(w)w.remove();
  window._pendingFavData=null;
}

// â”€â”€ ì¦ê²¨ì°¾ê¸° ê·¸ë£¹ ê´€ë¦¬ â”€â”€
const _FAV_GROUP_ICONS=['ğŸ—‚ï¸','ğŸ“','ğŸ”–','â­','â¤ï¸','ğŸš‚','ğŸ”ï¸','â˜•'];
const _FAV_GROUP_COLORS=['#e879f9','#f59e0b','#10b981','#ec4899','#6366f1','#f97316','#06b6d4','#84cc16'];

function _gmListHtml(groups){
  return groups.map(g=>`
    <div class="group-manager-item">
      <div class="gm-label"><span style="font-size:16px">${g.icon}</span><span id="gm-lbl-${g.id}" style="font-size:14px;font-weight:600;color:${g.color}">${g.label}</span></div>
      <div class="gm-actions">
        <button onclick="startRenameGroup('${g.id}')" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit">ìˆ˜ì •</button>
        ${!FAV_GROUPS_BUILT_IN.includes(g.id)?`<button onclick="deleteFavGroup('${g.id}')" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--red);background:transparent;color:var(--red);cursor:pointer;font-family:inherit">ì‚­ì œ</button>`:''}
      </div>
    </div>`).join('');
}

function openGroupManager(){
  const old=document.getElementById('group-manager-wrap');
  if(old)old.remove();
  const wrap=document.createElement('div');
  wrap.id='group-manager-wrap';
  // íŒì—…ì´ overflow-y:autoë©´ iOS Safariì—ì„œ ë‚´ë¶€ ë²„íŠ¼ í´ë¦­ì´ ë¬´ì‹œë¨
  // â†’ íŒì—… ìì²´ëŠ” ìŠ¤í¬ë¡¤ ì—†ìŒ, ëª©ë¡ ì˜ì—­ë§Œ overflow-y:auto
  // z-index:9500 â†’ my-sub-panel(9002)ê³¼ booking-popup-wrap(9400) ìœ„
  wrap.innerHTML=`
    <div id="gm-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9499"></div>
    <div id="gm-popup" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;min-width:260px;max-width:340px;width:calc(100% - 40px);z-index:9500;box-shadow:0 8px 32px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:0;max-height:calc(100vh - 48px)">
      <div class="alarm-popup-title">âš™ï¸ ê·¸ë£¹ ê´€ë¦¬</div>
      <div class="alarm-popup-sub" style="margin-bottom:10px;flex-shrink:0">ìƒˆ ê·¸ë£¹ ì´ë¦„ì„ ì…ë ¥í•˜ê³  ì¶”ê°€í•˜ì„¸ìš”</div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-shrink:0">
        <input id="gm-new-name" placeholder="ê·¸ë£¹ ì´ë¦„" style="flex:1;font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg1);color:var(--text1);font-family:inherit"
          onkeydown="if(event.key==='Enter')addFavGroup()">
        <button id="gm-add-btn" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;touch-action:manipulation">ì¶”ê°€</button>
      </div>
      <div class="alarm-popup-sub" style="margin-bottom:6px;flex-shrink:0">ê·¸ë£¹ ëª©ë¡ (ê¸°ë³¸ ê·¸ë£¹ì€ ì‚­ì œ ë¶ˆê°€)</div>
      <div id="gm-list" style="overflow-y:auto;flex:1;min-height:0">${_gmListHtml(loadFavGroups())}</div>
      <button id="gm-close-btn" class="alarm-popup-close" style="margin-top:14px;flex-shrink:0;touch-action:manipulation">ë‹«ê¸°</button>
    </div>`;
  document.body.appendChild(wrap);
  // addEventListener ì‚¬ìš© (iOS Safariì—ì„œ inline onclickë³´ë‹¤ ì‹ ë¢°ì„± ë†’ìŒ)
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
  if(!label){alert('ê·¸ë£¹ ì´ë¦„ì„ ì…ë ¥í•´ì£¼ì„¸ìš”.');return;}
  const groups=loadFavGroups();
  if(groups.some(g=>g.label===label)){alert('ê°™ì€ ì´ë¦„ì˜ ê·¸ë£¹ì´ ì´ë¯¸ ìˆìŠµë‹ˆë‹¤.');return;}
  const idx=groups.length % _FAV_GROUP_ICONS.length;
  groups.push({id:'g_'+Date.now(),label,icon:_FAV_GROUP_ICONS[idx],color:_FAV_GROUP_COLORS[idx]});
  saveFavGroups(groups);
  if(inp)inp.value='';
  const list=document.getElementById('gm-list');
  if(list)list.innerHTML=_gmListHtml(loadFavGroups());
}

function deleteFavGroup(id){
  if(!confirm('ì´ ê·¸ë£¹ì„ ì‚­ì œí•˜ë©´ í•´ë‹¹ ê·¸ë£¹ì˜ ì¦ê²¨ì°¾ê¸° í•­ëª©ì´ "ê¸°íƒ€"ë¡œ ì´ë™ë©ë‹ˆë‹¤.\nì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?'))return;
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
    <button onclick="confirmRenameGroup('${id}')" style="font-size:11px;padding:3px 8px;border-radius:4px;border:none;background:var(--accent);color:#fff;cursor:pointer;margin-left:4px;font-family:inherit">í™•ì¸</button>
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
  alert('"'+label+'"ì„ ì¦ê²¨ì°¾ê¸°ì— ì¶”ê°€í–ˆìŠµë‹ˆë‹¤.');
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
    if(typeof nimbiOpenStationTimetable==='function')nimbiOpenStationTimetable();else switchTab('station');
    searchByStation();
  } else if(fav.type==='route'){
    document.getElementById('input-from').value=fav.data.from;
    document.getElementById('input-to').value=fav.data.to;
    switchTab('route'); searchByRoute();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

// â”€â”€ ì¦ê²¨ì°¾ê¸° ì‹¤ì‹œê°„ ì •ë³´ ê³„ì‚° â”€â”€
function getFavInfo(fav){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();

  if(fav.type==='train'){
    const trains=getTrainsByNo(fav.data.no);
    if(!trains.length)return{main:'ì—´ì°¨ ì •ë³´ ì—†ìŒ',sub:''};
    const t=trains[0];
    const status=getCurrentStatus(t);
    const gradeLbl=GL[t.grade]||t.grade;
    let main=`${gradeLbl} ${t.no}`;
    let sub='';
    if(!status)sub='ì •ë³´ ì—†ìŒ';
    else if(status.status==='before')sub=status.etaMin!=null?`ìš´í–‰ ì¤€ë¹„ ì¤‘ Â· ${fmtEtaKor(status.etaMin)}`:'ìš´í–‰ì„ ì¤€ë¹„ ì¤‘';
    else if(status.status==='done')sub='ìš´í–‰ ì¢…ë£Œ';
    else{
      if(status.atStn)sub=`${status.atStn}ì—­ ì •ì°¨ ì¤‘`;
      else if(status.passStn)sub=`${status.passStn}ì—­ í†µê³¼ ì¤‘`;
      else if(status.nextStn)sub=`${status.prevStn||''}â†’${status.nextStn} ìš´í–‰ ì¤‘`;
      else sub='ìš´í–‰ ì¤‘';
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
      const dirLbl=dir==='down'?'í•˜í–‰ â†“':'ìƒí–‰ â†‘';
      if(next){
        const diff=next.m-nowMin;
        const diffStr=diff===0?'ì§€ê¸ˆ':`${diff}ë¶„ í›„`;
        lines.push(`${dirLbl}  ${next.timeV} ${next.t.dest}í–‰ ${next.t.no} Â· ${diffStr}`);
      } else {
        lines.push(`${dirLbl}  ìš´í–‰ ì—´ì°¨ ì—†ìŒ`);
      }
    }
    return{main:stn+'ì—­',lines};
  }

  if(fav.type==='route'){
    const {from,to}=fav.data;
    // ì§í†µ ë‹¤ìŒ ì—´ì°¨
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
    if(!best)return{main:`${from} â†’ ${to}`,sub:'ë‹¤ìŒ ì—´ì°¨ ì—†ìŒ'};
    const diff=best.adjM-nowMin;
    const diffStr=diff===0?'ì§€ê¸ˆ ì¶œë°œ':diff+'ë¶„ í›„ ì¶œë°œ';
    return{main:`${from} â†’ ${to}`,sub:`${best.t.no} ${best.depV}â†’${best.arrV||'?'} (${diffStr})`};
  }

  return{main:fav.label,sub:''};
}

// í˜„ì¬ ì„ íƒëœ ì¦ê²¨ì°¾ê¸° í•„í„° ì¹´í…Œê³ ë¦¬
let _favFilterCat='all';

function setFavFilter(cat){
  _favFilterCat=cat;
  renderFavs();
}

function renderFavs(){
  const el=document.getElementById('result-fav');
  if(!el){console.warn('result-fav ì—˜ë¦¬ë¨¼íŠ¸ ì—†ìŒ');return;}
  try{
  const allFavs=loadFavs();
  const groups=loadFavGroups();
  const typeIcon={train:'ğŸš†',station:'ğŸ¢',route:'ğŸ”'};

  const headerBar=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div class="result-title" style="display:flex;align-items:center;gap:8px">â­ ì¦ê²¨ì°¾ê¸° <span class="badge blue">${allFavs.length}ê°œ</span></div>
    <button onclick="openGroupManager()" style="font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit;white-space:nowrap">âš™ï¸ ê·¸ë£¹ ê´€ë¦¬</button>
  </div>`;

  if(!allFavs.length){
    el.innerHTML=headerBar+'<div class="empty"><div class="empty-icon">â­</div><p>ì¦ê²¨ì°¾ê¸°ê°€ ë¹„ì–´ìˆìŠµë‹ˆë‹¤.<br>ê° íƒ­ì˜ â­ ë²„íŠ¼ìœ¼ë¡œ ì¶”ê°€í•´ë³´ì„¸ìš”.</p></div>';
    return;
  }

  // ê·¸ë£¹ í•„í„° íƒ­
  const groupCounts={all:allFavs.length};
  groups.forEach(g=>{groupCounts[g.id]=allFavs.filter(f=>(f.cat||'etc')===g.id).length;});
  const filterTabs=`<div class="fav-filter-tabs">
    <button class="fav-filter-tab${_favFilterCat==='all'?' active':''}" onclick="setFavFilter('all')">ì „ì²´ ${groupCounts.all}</button>
    ${groups.map(g=>
      groupCounts[g.id]>0?`<button class="fav-filter-tab${_favFilterCat===g.id?' active':''}" onclick="setFavFilter('${g.id}')">${g.icon} ${g.label} ${groupCounts[g.id]}</button>`:''
    ).join('')}
  </div>`;

  const makeFavCard=(f,globalIdx)=>{
    const info=getFavInfo(f);
    const grp=groups.find(g=>g.id===f.cat)||groups.find(g=>g.id==='etc')||{icon:'ğŸ“Œ',color:'#8b949e'};
    const subHtml=info.lines
      ? info.lines.map(l=>`<div class="fav-sub">${l}</div>`).join('')
      : `<div class="fav-sub">${info.sub||''}</div>`;
    return `<div class="fav-card" draggable="true" ondragstart="favDragStart(event,${globalIdx})" ondragend="favDragEnd(event)" ondragover="favDragOver(event,${globalIdx})" onclick="runFav(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div class="fav-icon">${typeIcon[f.type]||'â­'}</div>
      <div class="fav-info">
        <div class="fav-label">${info.main} <span class="fav-cat-tag" style="color:${grp.color}">${grp.icon}</span></div>
        ${subHtml}
      </div>
      <button class="fav-del-btn" onclick="event.stopPropagation();removeFav('${f.id}')" title="ì‚­ì œ">âœ•</button>
    </div>`;
  };

  let cardsHtml='';
  if(_favFilterCat==='all'){
    // ê·¸ë£¹ë³„ ì„¹ì…˜ìœ¼ë¡œ í‘œì‹œ
    groups.forEach(g=>{
      const gFavs=allFavs.filter(f=>(f.cat||'etc')===g.id);
      if(!gFavs.length)return;
      cardsHtml+=`<div class="fav-group-header"><span style="color:${g.color};font-weight:700">${g.icon} ${g.label}</span><span style="font-size:11px;color:var(--text3)">${gFavs.length}ê°œ</span></div>`;
      cardsHtml+=gFavs.map(f=>makeFavCard(f,allFavs.indexOf(f))).join('');
    });
  } else {
    const filtered=allFavs.filter(f=>(f.cat||'etc')===_favFilterCat);
    if(!filtered.length){
      el.innerHTML=`${headerBar}${filterTabs}<div class="empty"><div class="empty-icon">ğŸ“­</div><p>í•´ë‹¹ ê·¸ë£¹ì— ì¦ê²¨ì°¾ê¸°ê°€ ì—†ìŠµë‹ˆë‹¤.</p></div>`;
      return;
    }
    cardsHtml=filtered.map(f=>makeFavCard(f,allFavs.indexOf(f))).join('');
  }

  el.innerHTML=`${headerBar}${filterTabs}<div class="fav-list">${cardsHtml}</div><p class="hint">â€» í´ë¦­ ì‹œ í•´ë‹¹ íƒ­ìœ¼ë¡œ ì´ë™í•´ ë°”ë¡œ ì¡°íšŒí•©ë‹ˆë‹¤</p>`;
  }catch(err){
    console.error('renderFavs ì˜¤ë¥˜:', err);
    el.innerHTML=`<div class="empty"><div class="empty-icon">âš ï¸</div><p>ì¦ê²¨ì°¾ê¸°ë¥¼ ë¶ˆëŸ¬ì˜¤ëŠ” ì¤‘ ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.<br><span style="font-size:11px;color:var(--text3)">${err.message}</span></p></div>`;
  }
}

function isNightTrain(timeStr){
  const m=toMin(timeStr);
  if(m===null)return false;
  return m>=1320||m<240; // 22:00 ì´í›„ ë˜ëŠ” 04:00 ì´ì „
}

// â”€â”€ êµ¬ê°„ë³„ ìš´í–‰ ì—´ì°¨ ìˆ˜ ì¡°íšŒ â”€â”€
function calcSectionTrains(){
  const from=document.getElementById('stat-from')?.value.trim();
  const to=document.getElementById('stat-to')?.value.trim();
  const el=document.getElementById('stat-section-result');
  if(!el)return;
  if(!from||!to){el.innerHTML='<p style="font-size:12px;color:var(--text3)">ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì„ ì…ë ¥í•˜ì„¸ìš”</p>';return;}

  const results=[];
  ALL_TRAINS.forEach(t=>{
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    if(fi===-1||ti===-1)return;
    if(fi>=ti)return; // ë°©í–¥ ì¼ì¹˜ í™•ì¸
    results.push(t);
  });

  if(!results.length){
    el.innerHTML=`<p style="font-size:12px;color:var(--text3)">${from} â†’ ${to} êµ¬ê°„ì„ ìš´í–‰í•˜ëŠ” ì—´ì°¨ê°€ ì—†ìŠµë‹ˆë‹¤</p>`;
    return;
  }

  // ë“±ê¸‰ë³„ ì§‘ê³„
  const gradeCount={};
  results.forEach(t=>{gradeCount[t.grade]=(gradeCount[t.grade]||0)+1;});
  const gradeRows=Object.entries(gradeCount).sort((a,b)=>b[1]-a[1]).map(([g,c])=>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--bg3);font-size:12px;margin:2px">
      ${gradeHtml(g)} <span style="font-family:var(--mono)">${c}í¸</span>
    </span>`
  ).join('');

  el.innerHTML=`
    <div style="margin-bottom:8px">
      <span style="font-size:14px;font-weight:600">${from} â†’ ${to}</span>
      <span class="badge blue" style="margin-left:8px">${results.length}í¸</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${gradeRows}</div>`;
}


// â”€â”€ ì—­ë³„ ì²«ì°¨/ë§‰ì°¨ ì¡°íšŒ (í†µê³„ íƒ­) â”€â”€
function calcStationFirstLast(){
  const stn=document.getElementById('stat-stn-input')?.value.trim();
  const el=document.getElementById('stat-stn-fl-result');
  if(!el)return;
  if(!stn){el.innerHTML='<p style="font-size:12px;color:var(--text3)">ì—­ëª…ì„ ì…ë ¥í•˜ì„¸ìš”</p>';return;}
  const data=getStationFirstLast(stn);
  if(!data.length){
    el.innerHTML=`<p style="font-size:12px;color:var(--text3)">${stn}ì—­ ì •ë³´ë¥¼ ì°¾ì„ ìˆ˜ ì—†ìŠµë‹ˆë‹¤</p>`;
    return;
  }
  const rows=data.map(d=>{
    const dirLbl=d.dir==='down'?'í•˜í–‰ â†“':'ìƒí–‰ â†‘';
    return `<div class="fl-stat-row">
      <span class="fl-stat-name">${d.dest}í–‰ ${dirLbl}</span>
      <div class="fl-stat-times">
        <span class="fl-stat-item"><span class="fl-stat-dir">ì²«ì°¨</span><span class="fl-stat-time">${d.firstT}</span></span>
        <span class="fl-stat-item"><span class="fl-stat-dir">ë§‰ì°¨</span><span class="fl-stat-time">${d.lastT}</span></span>
      </div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="first-last-stats">${rows}</div>`;
}


// â”€â”€ ìš´í–‰ ì¤‘ ì—´ì°¨ ì „ì²´ ë³´ê¸° â”€â”€
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
  el.innerHTML=chips+`<span class="badge" style="cursor:pointer;margin-left:4px" onclick="renderStats()">ì ‘ê¸° â–´</span>`;
}



// 096: ì¢Œí‘œÂ·ê±°ë¦¬Â·ë²ˆí˜¸ ë°ì´í„° ì´ìƒì¹˜ ì ê²€
function checkDataAnomalies(){
  const issues={dup:[],speed:[],nocoord:new Set()};
  const seen={}; ALL_TRAINS.forEach(t=>{seen[t.no]=(seen[t.no]||0)+1;});
  Object.entries(seen).forEach(([k,v])=>{ if(v>1) issues.dup.push(`${k} (${v}ê±´)`); });
  const coord=b=>_stnCoord(b); // ë¶€ê°€ í‘œê¸° ì—­ëª… ë³„ì¹­ í´ë°± í¬í•¨
  // ì¸ì ‘ ì •ì°¨ì—­ ê°„ ì§ì„ ê±°ë¦¬Â·ì†ë„ ì´ìƒ(ì¢Œí‘œ ì˜¤ë¥˜ íƒì§€) â€” ì—­ìŒ ë‹¨ìœ„ë¡œ ì¤‘ë³µ ì œê±°
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
      // ì¸ì ‘ì—­ì´ 200kmâ†‘ ë–¨ì–´ì¡Œê±°ë‚˜ í‘œì • 450km/hâ†‘ â†’ ë°ì´í„°(ì¢Œí‘œ) ì´ìƒ
      if(km>200||kmh>450){
        const key=[a.s,b.s].sort().join('â†”');
        if(!pairMax[key]||km>pairMax[key].km) pairMax[key]={km,kmh,a:a.s,b:b.s};
      }
    }
  });
  Object.values(pairMax).sort((x,y)=>y.km-x.km).forEach(v=>issues.speed.push(`${v.a}â†”${v.b}: ì§ì„  ${v.km.toFixed(0)}km${v.kmh>450?` (${Math.round(v.kmh)}km/h)`:''}`));
  return issues;
}
function runDataAnomalyCheck(){
  const el=document.getElementById('stat-anomaly-result'); if(!el)return;
  el.innerHTML='<span style="font-size:12px;color:var(--text3)">ì ê²€ ì¤‘â€¦</span>';
  setTimeout(()=>{
    const r=checkDataAnomalies();
    const uniqSpeed=[...new Set(r.speed)];
    const sec=(title,arr,color)=>arr.length?`<div style="margin-top:6px"><b style="color:${color}">${title} ${arr.length}ê±´</b><div style="font-family:var(--mono);font-size:11px;color:var(--text2);margin-top:3px;line-height:1.6">${arr.slice(0,12).join('<br>')}${arr.length>12?'<br>â€¦ ì™¸ '+(arr.length-12)+'ê±´':''}</div></div>`:'';
    const clean = !r.dup.length && !uniqSpeed.length && !r.nocoord.size;
    el.innerHTML = clean
      ? '<div style="font-size:13px;color:var(--green);font-weight:700">âœ… ëˆˆì— ë„ëŠ” ì´ìƒì¹˜ê°€ ì—†ìŠµë‹ˆë‹¤</div>'
      : sec('ì—´ì°¨ë²ˆí˜¸ ì¤‘ë³µ', r.dup, 'var(--red)')
        + sec('ì†ë„/ê±°ë¦¬ ì´ìƒ êµ¬ê°„', uniqSpeed, 'var(--orange)')
        + ([...r.nocoord].length?`<div style="margin-top:6px"><b style="color:var(--text2)">ì¢Œí‘œ ì—†ëŠ” ì—­ ${r.nocoord.size}ê³³</b><div style="font-family:var(--mono);font-size:11px;color:var(--text3);margin-top:3px">${[...r.nocoord].slice(0,20).join(', ')}</div></div>`:'');
  },30);
}

// 042-C: í™•ì • ìš´ìš©í‘œ â€” í˜¸ë‚¨ê³ ì†ì„  KTX 10í¸ì„± + ì¶©ë¶ì„  5í¸ì„± (ì¡°ê±´: ì°©ë°œì—­ ë³µê·€Â·ì§ìˆ˜Â·ëª©í¬ 5â€“10/60+ íšŒì°¨)
const CONFIRMED_ROTATION = (()=>{
  const sets=[
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 1(ë§ˆí¬ê¸°ì )", seq:["501","506","509","514","517","524"]},
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 2(ë¶€ì‚°ê¸°ì )", seq:["502","505","512","515","520","523"]},
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 3(ë§ˆí¬ê¸°ì )", seq:["503","508"]},
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 4(ë¶€ì‚°ê¸°ì )", seq:["504","507","522","525"]},
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 5(ë¶€ì‚°ê¸°ì )", seq:["510","513","518","521"]},
    {id:"ë§ˆí¬-ë¶€ì‚°(ì¶©ì£¼ ê²½ìœ ) KTX-ì´ìŒ 6(ë§ˆí¬ê¸°ì )", seq:["511","516","519","526"]},
    {id:"ë¬¸ì˜-ìƒì£¼ 1(ë¬¸ì˜ê¸°ì )", seq:["1241","1244","1245","1248","1249","1252"]},
    {id:"ë¬¸ì˜-ìƒì£¼ 2(ìƒì£¼ê¸°ì )", seq:["1242","1243","1246","1247","1250","1251"]},
    {id:"ì˜ì •ë¶€-ëŒ€ì „ 1(ì˜ì •ë¶€ê¸°ì )", seq:["1261","1264","1265","1268"]},
    {id:"ì˜ì •ë¶€-ëŒ€ì „ 2(ëŒ€ì „ê¸°ì )", seq:["1262","1263","1266","1267"]},
    {id:"ì˜ì •ë¶€-ëŒ€ì „ 3(ì˜ì •ë¶€ê¸°ì )", seq:["1269","1270"]},
    {id:"ì¶©ì£¼-ê²½ë¶ìˆœí™˜ 1(í•˜í–‰ ìˆœí™˜)", seq:["1887","4451","4453","4455","4457","1886"]},
    {id:"ì¶©ì£¼-ê²½ë¶ìˆœí™˜ 2(ìƒí–‰ ìˆœí™˜)", seq:["1885","4452","4454","4456","4458","1888"]},
    {id:"êµì™¸ì„  ìˆœí™˜ 1(í•˜í–‰ ë°˜ì‹œê³„)", seq:["4401","4403","4405","4407","4409","4411","4413","4415","4417","4419","4421","4423","4425","4427"]},
    {id:"êµì™¸ì„  ìˆœí™˜ 2(ìƒí–‰ ì‹œê³„)", seq:["4402","4404","4406","4408","4410","4412","4414","4416","4418","4420","4422","4424","4426","4428"]},
    {id:"ì ì‹¤-ê°„ì„± SRT", seq:["681","682","683","684","685","686","687","688","689","690"]},
    {id:"ì ì‹¤-ë´‰í™” SRT", seq:["691","692","693","694","695","696","697","698","699","700"]},
    {id:"ì ì‹¤-ëª©í¬ SRT 1", seq:["801","804","807","810","813","816","819","822","825","828"]},
    {id:"ì ì‹¤-ëª©í¬ SRT 2", seq:["802","805","808","811","814","817","820","823"]},
    {id:"ì ì‹¤-ëª©í¬ SRT 3", seq:["803","806","809","812","815","818","821","826"]},
    {id:"ì ì‹¤-ëª©í¬ SRT 4", seq:["824","827"]},
    {id:"ì˜ë™-ë¶€ì‚° ë¬´ê¶í™” 1", seq:["1331","1336","1339","1344","1347","1350"]},
    {id:"ì˜ë™-ë¶€ì‚° ë¬´ê¶í™” 2", seq:["1333","1340","1343","1348"]},
    {id:"ì˜ë™-ë¶€ì‚° ë¬´ê¶í™” 3", seq:["1332","1335","1338","1341","1346","1349"]},
    {id:"ì˜ë™-ë¶€ì‚° ë¬´ê¶í™” 4", seq:["1334","1337","1342","1345"]},
    {id:"ëª©í¬-ë‚¨ëŒ€êµ¬Â·ë¶€ì‚° ë¬´ê¶í™” 1(ëª©í¬ê¸°ì )", seq:["1501","1504"]},
    {id:"ëª©í¬-ë‚¨ëŒ€êµ¬Â·ë¶€ì‚° ë¬´ê¶í™” 2(ë‚¨ëŒ€êµ¬ê¸°ì )", seq:["1452","1451","1454","1453"]},
    {id:"ëª©í¬-ë‚¨ëŒ€êµ¬Â·ë¶€ì‚° ë¬´ê¶í™” 3(ë¶€ì‚°ê¸°ì )", seq:["1502","1503"]},
    {id:'í˜¸ë‚¨ 1', seq:['401','416','423','434','441','454']},
    {id:'í˜¸ë‚¨ 2', seq:['402','409','430','437','446','453']},
    {id:'í˜¸ë‚¨ 3', seq:['403','412','419','426','433','444','451','460']},
    {id:'í˜¸ë‚¨ 4', seq:['404','411','420','427','436','443','452','459']},
    {id:'í˜¸ë‚¨ 5', seq:['405','414','421','432','439','448']},
    {id:'í˜¸ë‚¨ 6', seq:['406','413','424','431','442','455']},
    {id:'í˜¸ë‚¨ 7', seq:['407','418','425','438','445','456']},
    {id:'í˜¸ë‚¨ 8', seq:['408','415','422','429','440','447']},
    {id:'í˜¸ë‚¨ 9', seq:['410','417','428','435','450','457']},
    {id:'í˜¸ë‚¨ 10', seq:['449','458']},
    {id:'ì¶©ë¶ 1', seq:['1401','1406','1411','1416','1423','1428']},
    {id:'ì¶©ë¶ 2', seq:['1402','1405','1410','1419','1424','1429']},
    {id:'ì¶©ë¶ 3', seq:['1403','1408','1413','1418','1421','1426']},
    {id:'ì¶©ë¶ 4', seq:['1404','1409','1414','1417','1422','1427']},
    {id:'ì¶©ë¶ 5', seq:['1407','1412','1415','1420','1425','1430']},
    // ë‚¨ë¶€ë‚´ë¥™ì„  ê³„í†µ (ë°°í¬ 9ê³„í†µ, ì›ë‹¨ì—­ íìˆœí™˜Â·ìµœì†Œí¸ì„±)
    {id:"ë‚¨ëŒ€êµ¬-ìˆœì²œ 1", seq:["1831","1834","1853","1854","1845","1848"]},
    {id:"ë‚¨ëŒ€êµ¬-ìˆœì²œ 2(ìˆœì²œì£¼ë°•)", seq:["1832","1837","1840","1843","1846","1849"]},
    {id:"ë‚¨ëŒ€êµ¬-ìˆœì²œ 3", seq:["1851","1852","1841","1844"]},
    {id:"ë‚¨ëŒ€êµ¬-ìˆœì²œ 4", seq:["1833","1836","1839","1842","1857","1858"]},
    {id:"ë‚¨ëŒ€êµ¬-ìˆœì²œ 5", seq:["1835","1838","1855","1856","1847","1850"]},
    {id:"ë‚¨ëŒ€êµ¬-ê³ í˜„ 1", seq:["1861","1864","1867","1870","1873","1874"]},
    {id:"ë‚¨ëŒ€êµ¬-ê³ í˜„ 2(ê³ í˜„ì£¼ë°•)", seq:["1862","1865","1868","1871"]},
    {id:"ë‚¨ëŒ€êµ¬-ê³ í˜„ 3", seq:["1863","1866","1869","1872"]},
    {id:"ì§„ì£¼-ê³ í˜„ 1", seq:["1941","1942","1945","1946","1949","1950","1951","1952"]},
    {id:"ì§„ì£¼-ê³ í˜„ 2", seq:["1943","1944","1947","1948","1953","1954"]},
    {id:"ìˆœì²œ-ê³ í˜„ 1(ê³ í˜„ì£¼ë°•)", seq:["1962","1963","1966","1967","1970","1971"]},
    {id:"ìˆœì²œ-ê³ í˜„ 2", seq:["1961","1964","1965","1968","1969","1972"]},
    {id:"ëª©í¬-ê³ í˜„ 1", seq:["2521","2522","2529","2530"]},
    {id:"ëª©í¬-ê³ í˜„ 2", seq:["2523","2526","2531","2534"]},
    {id:"ëª©í¬-ê³ í˜„ 3", seq:["2525","2528"]},
    {id:"ëª©í¬-ê³ í˜„ 4(ê³ í˜„ì£¼ë°•)", seq:["2524","2533"]},
    {id:"ëª©í¬-ê³ í˜„ 5", seq:["2527","2532"]},
    {id:"ëª©í¬-ì—¬ìˆ˜ ë‚¨ë„í•´ì–‘ 1(ëª©í¬ê¸°ì )", seq:["2501","2502","2505","2506","2509","2510","2513","2514"]},
    {id:"ëª©í¬-ì—¬ìˆ˜ ë‚¨ë„í•´ì–‘ 2(ëª©í¬ê¸°ì )", seq:["2503","2504","2507","2508","2511","2512"]},
    {id:"ê°•ë¦‰-ëŒ€ì „ ìƒˆë§ˆì„ 1", seq:["1901","1904","1909","1912"]},
    {id:"ê°•ë¦‰-ëŒ€ì „ ìƒˆë§ˆì„ 2(ëŒ€ì „ì£¼ë°•)", seq:["1902","1907","1910","1917"]},
    {id:"ê°•ë¦‰-ëŒ€ì „ ìƒˆë§ˆì„ 3", seq:["1903","1906","1911","1914"]},
    {id:"ê°•ë¦‰-ëŒ€ì „ ìƒˆë§ˆì„ 4", seq:["1905","1908","1913","1916"]},
    {id:"ê°•ë¦‰-ëŒ€ì „ ìƒˆë§ˆì„ 5", seq:["1915","1918"]},
    // ê³ ë‚¨ ê²½ìœ  ITX-ë§ˆìŒ â€” ë‹¹ì¼ ì¶œê³ Â·ë‹¹ì¼ ì…ê³  7í¸ì„±.
    // ìì • ê²½ê³„ë¥¼ ë„˜ê²¨ ë‹¤ìŒ ë‚  ì²«ì°¨ë¡œ ì‡ì§€ ì•Šê³ , ê° í¸ì„±ì˜ í•˜ë£¨ ì¼ê³¼ê°€
    // ì‹œê°ìˆœìœ¼ë¡œ ì§„í–‰ëœ ë’¤ ìµœì´ˆ ì¶œë°œì§€ì— ëŒì•„ì˜¤ë„ë¡ êµ¬ì„±í•œë‹¤.
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ì „ì£¼ ITX-ë§ˆìŒ 1(í•œê°•ë¡œê¸°ì )", seq:["1981","1984","1985","1988"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ì „ì£¼ ITX-ë§ˆìŒ 2(ì „ì£¼ê¸°ì )", seq:["1982","1983","1986","1989"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ì „ì£¼ ITX-ë§ˆìŒ 3(í•œê°•ë¡œê¸°ì )", seq:["1987","1990"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ìˆœì²œ ITX-ë§ˆìŒ 1(í•œê°•ë¡œê¸°ì )", seq:["1991","1996"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ìˆœì²œ ITX-ë§ˆìŒ 2(ìˆœì²œê¸°ì )", seq:["1992","1995"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ìˆœì²œ ITX-ë§ˆìŒ 3(í•œê°•ë¡œê¸°ì )", seq:["1993","1998"]},
    {id:"í•œê°•ë¡œ-ê³ ë‚¨-ìˆœì²œ ITX-ë§ˆìŒ 4(ìˆœì²œê¸°ì )", seq:["1994","1997"]},
    {id:"ê°•ë¦‰-ê´‘ì£¼ KTX-ì´ìŒ 1(ê°•ë¦‰ê¸°ì )", seq:["621","624","627","630"]},
    {id:"ê°•ë¦‰-ê´‘ì£¼ KTX-ì´ìŒ 2(ê´‘ì£¼ê¸°ì )", seq:["622","625","628","631"]},
    {id:"ê°•ë¦‰-ê´‘ì£¼ KTX-ì´ìŒ 3(ê°•ë¦‰ê¸°ì )", seq:["623","626","629","632"]},
    {id:"ëŒ€ì „-ê³ í˜„ 1", seq:["1171","1176","1179","1182","1187","1190"]},
    {id:"ëŒ€ì „-ê³ í˜„ 2(ê³ í˜„ì£¼ë°•)", seq:["1172","1181","1184","1189"]},
    {id:"ëŒ€ì „-ê³ í˜„ 3", seq:["1173","1178","1183","1188"]},
    {id:"ëŒ€ì „-ê³ í˜„ 4(ê³ í˜„ì£¼ë°•)", seq:["1174","1177","1180","1185"]},
    {id:"ëŒ€ì „-ê³ í˜„ 5", seq:["1175","1186"]},
    {id:"í•œê°•ë¡œ-ê³ í˜„ 1", seq:["1131","1134","1137","1142"]},
    {id:"í•œê°•ë¡œ-ê³ í˜„ 2(ê³ í˜„ì£¼ë°•)", seq:["1132","1141"]},
    {id:"í•œê°•ë¡œ-ê³ í˜„ 3", seq:["1133","1138"]},
    {id:"í•œê°•ë¡œ-ê³ í˜„ 4", seq:["1135","1140"]},
    {id:"í•œê°•ë¡œ-ê³ í˜„ 5(ê³ í˜„ì£¼ë°•)", seq:["1136","1139"]},
    {id:"í•œê°•ë¡œKTX 1", seq:["281","290","283","296","297","288"]},
    {id:"í•œê°•ë¡œKTX 2(ê³ í˜„ì£¼ë°•)", seq:["282","291","284","295","298","287"]},
    {id:"í•œê°•ë¡œKTX 3", seq:["289","294","285","300"]},
    {id:"í•œê°•ë¡œKTX 4(ê³ í˜„ì£¼ë°•)", seq:["292","293","286","299"]},
    {id:"í•œê°•ë¡œíƒœì•ˆ 1", seq:["221","224","225","228","229","230"]},
    {id:"í•œê°•ë¡œíƒœì•ˆ 2(íƒœì•ˆì£¼ë°•)", seq:["222","223","226","227"]},
    {id:"ì˜ë™ê´‘ì£¼ 1", seq:["1431","1434","1435","1438","1439","1442"]},
    {id:"ì˜ë™ê´‘ì£¼ 2(ê´‘ì£¼ì£¼ë°•)", seq:["1432","1433","1436","1437","1440","1441"]},
    {id:"ê°•ë¦‰ì˜ì£¼ 1", seq:["1221","1224","1227","1230","1233","1234"]},
    {id:"ê°•ë¦‰ì˜ì£¼ 2", seq:["1223","1226","1229","1232","1235","1236"]},
    {id:"ê°•ë¦‰ì˜ì£¼ 3(ì˜ì£¼ì£¼ë°•)", seq:["1222","1225","1228","1231"]},
    {id:"ê°•ë¦‰ë¶€ì‚° 1", seq:["1201","1206","1209","1214"]},
    {id:"ê°•ë¦‰ë¶€ì‚° 2(ë¶€ì‚°ì£¼ë°•)", seq:["1202","1207","1212","1215"]},
    {id:"ê°•ë¦‰ë¶€ì‚° 3", seq:["1203","1208","1211","1216"]},
    {id:"ê°•ë¦‰ë¶€ì‚° 4(ë¶€ì‚°ì£¼ë°•)", seq:["1204","1213"]},
    {id:"ê°•ë¦‰ë¶€ì‚° 5", seq:["1205","1210"]},
    {id:"ì„œì¸ì²œëª©í¬ 1", seq:["461","464","465","468","469","472"]},
    {id:"ì„œì¸ì²œëª©í¬ 2(ëª©í¬ì£¼ë°•)", seq:["462","463","466","467","470","471"]},
    {id:"ì„œì¸ì²œë¶€ì‚° 1(ë¶€ì‚°ì£¼ë°•)", seq:["152","153","156","157","162","163"]},
    {id:"ì„œì¸ì²œë¶€ì‚° 2", seq:["151","154","155","158","161","164"]},
    {id:"ì„œì¸ì²œë¶€ì‚° 3", seq:["159","166"]},
    {id:"ì„œì¸ì²œë¶€ì‚° 4(ë¶€ì‚°ì£¼ë°•)", seq:["160","165"]},
    {id:"ë§ˆí¬ì¥í•­ì „ì£¼ 1", seq:["601","604","607","610","613","616"]},
    {id:"ë§ˆí¬ì¥í•­ì „ì£¼ 2(ì „ì£¼ì£¼ë°•)", seq:["602","605","606","609","612","615"]},
    {id:"ë§ˆí¬ì¥í•­ì „ì£¼ 3", seq:["603","608","611","614"]},
    {id:"ë§ˆí¬ì „ì£¼ 1", seq:["481","482","485","486","489","490","493","494"]},
    {id:"ë§ˆí¬ì „ì£¼ 2", seq:["483","484","487","492","495","496"]},
    {id:"ë§ˆí¬ì „ì£¼ 3", seq:["488","491"]},
    {id:"ë§ˆí¬-ì¥ìœ  1", seq:["201","206","207","212"]},
    {id:"ë§ˆí¬-ì¥ìœ  2(ì¥ìœ ì£¼ë°•)", seq:["202","205","210","213"]},
    {id:"ë§ˆí¬-ì¥ìœ  3", seq:["203","208","211","214"]},
    {id:"ë§ˆí¬-ì¥ìœ  4(ì¥ìœ ì£¼ë°•)", seq:["204","209"]},
    {id:"ì²­ëŸ‰ë¦¬-íƒœë°±í™©ì§€ 1", seq:["1691","1694","1697","1700"]},
    {id:"ì²­ëŸ‰ë¦¬-íƒœë°±í™©ì§€ 2(íƒœë°±í™©ì§€ì£¼ë°•)", seq:["1692","1695"]},
    {id:"ì²­ëŸ‰ë¦¬-íƒœë°±í™©ì§€ 3", seq:["1693","1698"]},
    {id:"ì²­ëŸ‰ë¦¬-íƒœë°±í™©ì§€ 4(íƒœë°±í™©ì§€ì£¼ë°•)", seq:["1696","1699"]},
    // í–‰ì‹  ì†Œì† (ì„œìš¸ì—­ ì°©ë°œ) â€” ì „ì£¼/ì„œëŒ€ì „Â·ëŒ€ì „ ì¶œë„ì°©ì€ ê°ê° ì „ì£¼Â·ëŒ€ì „ ì£¼ë°•
    {id:"í–‰ì‹  1", seq:["1351","1354","1355","1358","1359","1364"]},
    {id:"í–‰ì‹  2(ëŒ€ì „ì£¼ë°•)", seq:["1352","1371","1374","1365"]},
    {id:"í–‰ì‹  3", seq:["1353","1356","1357","1360","1569","1574"]},
    {id:"í–‰ì‹  4(ì„œëŒ€ì „ì£¼ë°•)", seq:["1372","1555","1562","1379"]},
    {id:"í–‰ì‹  5", seq:["1551","1558","1373","1380"]},
    {id:"í–‰ì‹  6", seq:["1553","1560"]},
    {id:"í–‰ì‹  7(ì „ì£¼ì£¼ë°•)", seq:["1554","1557","1564","1571"]},
    {id:"í–‰ì‹  8(ì „ì£¼ì£¼ë°•)", seq:["1556","1559","1566","1573"]},
    {id:"í–‰ì‹  9", seq:["1561","1568"]},
    {id:"í–‰ì‹  10", seq:["1361","1366"]},
    {id:"í–‰ì‹  11(ëŒ€ì „ì£¼ë°•)", seq:["1362","1363"]},
    {id:"í–‰ì‹  12", seq:["1301","1304","1375","1378"]},
    {id:"í–‰ì‹  13(ì„œëŒ€ì „ì£¼ë°•)", seq:["1376","1377"]},
    {id:"í–‰ì‹  14(ë¶€ì‚°ì£¼ë°•)", seq:["1302","1305"]},
    {id:"í–‰ì‹  16", seq:["1565","1572"]},
    {id:"í–‰ì‹  17(ì „ì£¼ì£¼ë°•)", seq:["1552","1567"]},
    {id:"í–‰ì‹  18", seq:["1563","1570"]},
    {id:"í–‰ì‹  15", seq:["1303","1306"]},
    // ë³´ì€ ì£¼ë°•
    {id:"ë³´ì€ 1(ë³´ì€ì£¼ë°•)", seq:["1892","1891","1894","1893","1896","1897"]},
    {id:"ë³´ì€ 2", seq:["1895","1898"]},
    // ì˜ì£¼ ì†Œì†
    {id:"ì˜ì£¼ 1", seq:["1622","1623","1624","1625","1626","1627","1628","1629","1630","1631"]},
    {id:"ì˜ì£¼ 2(íƒœë°±í™©ì§€ì£¼ë°•)", seq:["1621","1634","1641","1642","1633","1632"]},
    {id:"ì˜ì£¼ 3", seq:["1636","1643","1644","1635"]},
    // ëŒ€ì „ ì†Œì† â€” 1Â·2í¸ì„± êµ­ì•…ì™€ì¸ì—´ì°¨
    {id:"ëŒ€ì „ 1(êµ­ì•…ì™€ì¸)", seq:["1381","1384","1385","1388","1391","1394","1397","1400"]},
    {id:"ëŒ€ì „ 2(êµ­ì•…ì™€ì¸Â·ë‚¨ëŒ€êµ¬ì£¼ë°•)", seq:["1382","1387","1390","1393","1396","1399"]},
    {id:"ëŒ€ì „ 3", seq:["1383","1386"]},
    {id:"ëŒ€ì „ 4", seq:["1389","1392","1395","1398"]},
    // ì „ì£¼ ì†Œì† â€” ëª©í¬/ì—¬ìˆ˜ ì¶œë„ì°©ì€ ê°ê° ëª©í¬Â·ì—¬ìˆ˜ ì£¼ë°•
    {id:"ì „ì£¼ 1", seq:["1581","1584","1585","1592","1595","1598"]},
    {id:"ì „ì£¼ 2(ëª©í¬ì£¼ë°•)", seq:["1582","1583","1586","1587","1590","1593","1594","1597"]},
    {id:"ì „ì£¼ 3", seq:["1521","1526","1529","1534","1591","1596"]},
    {id:"ì „ì£¼ 4", seq:["1523","1528","1531","1536","1539","1544"]},
    {id:"ì „ì£¼ 5(ì—¬ìˆ˜ì£¼ë°•)", seq:["1522","1525","1530","1533","1540","1543"]},
    {id:"ì „ì£¼ 6(ì—¬ìˆ˜ì£¼ë°•)", seq:["1524","1527","1532","1535"]},
    {id:"ì „ì£¼ 7", seq:["1537","1542"]},
    {id:"ì „ì£¼ 8(ì—¬ìˆ˜ì£¼ë°•)", seq:["1538","1541"]},
    {id:"ì „ì£¼ 9(ëª©í¬ì£¼ë°•)", seq:["1588","1589"]},
  ];
  // ê° ê³„í†µì˜ í™•ì • ì‹œê°ìœ¼ë¡œ ìµœì†Œ í¸ì„±ì„ íƒìƒ‰í•œ ë‹¹ì¼ ë³µê·€ ìš´ìš©.
  // ëª¨ë“  ì—°ê²°ì€ ì¢…ì°© ë’¤ 5ë¶„ ì´ìƒì´ë©° ë‹¤ìŒ ë‚  ìš´í–‰ì„ ê°™ì€ ì¼ê³¼ë¡œ í•©ì¹˜ì§€ ì•ŠëŠ”ë‹¤.
  const northPlans={
    5001:[[5001,5004,5005,5008,5009,5012,5013,5016,5017,5020,5021,5024],[5002,5003,5006,5007,5010,5011,5014,5015,5018,5019,5022,5025],[5023,5026]],
    5031:[[5031,5038,5043,5054],[5032,5037,5044,5049],[5033,5042,5047,5056],[5034,5039,5048,5053],[5035,5046,5051,5058],[5036,5041,5050,5055],[5040,5045,5052,5057]],
    5091:[[5091,5094],[5092,5093]],
    5101:[[5101,5106,5109,5114,5117,5122],[5102,5105,5110,5113,5118,5121],[5103,5108,5111,5116,5119,5124],[5104,5107,5112,5115,5120,5123]],
    5161:[[5161,5164,5167,5170],[5162,5165,5168,5173],[5163,5166,5169,5172],[5171,5174]],
    5201:[[5201,5206,5209,5214],[5202,5205,5210,5213],[5203,5212],[5204,5207],[5208,5211]],
    5221:[[5222,5225,5230,5233],[5221,5226,5229,5234],[5223,5232],[5224,5227],[5228,5231]],
    5241:[[5241,5252],[5242,5249],[5244,5251],[5243,5254],[5246,5253],[5245,5256],[5248,5255],[5247,5258],[5250,5257]],
    5261:[[5261,5266,5269,5274],[5262,5265,5270,5273],[5263,5268,5271,5278],[5264,5267,5272,5275],[5276,5277]],
    5301:[[5301,5304,5305,5308,5309,5312],[5302,5303,5306,5307,5310,5311]],
    5351:[[5352,5355],[5351,5360],[5354,5357],[5353,5362],[5356,5359],[5358,5361]],
    8001:[[8002,8005,8010,8011],[8001,8006,8009,8012],[8003,8008],[8004,8007]],
    9001:[[9001,9006,9009,9016],[9002,9005,9010,9013],[9004,9007,9012,9015],[9003,9008,9011,9018],[9014,9017]],
    9521:[[9521,9526,9529,9538],[9522,9525,9530,9533],[9523,9532,9535,9540],[9524,9527,9534,9537],[9528,9531,9536,9539]],
    9701:[[9702,9707],[9701,9708],[9703,9712],[9704,9711],[9705,9714],[9706,9713],[9710,9715],[9709,9716]],
    9751:[[9752,9755,9760,9763],[9751,9756,9759,9764],[9753,9762],[9754,9757],[9758,9761]]
  };
  const addNorthCycles=(label,first)=>northPlans[first].forEach((seq,index)=>sets.push({id:`${label} ${index+1}(ë‹¹ì¼ë³µê·€)`,seq:seq.map(String)}));
  addNorthCycles('ì›ì‚°-ì²­ëŸ‰ë¦¬ ITX-ìƒˆë§ˆì„',5001);
  addNorthCycles('ì›ì‚°-ì–‘êµ¬-ì²­ëŸ‰ë¦¬ ITX-ìƒˆë§ˆì„',5031);
  // 65ë¶„ ê°„ê²©Â·ì•½ 4ì‹œê°„ í¸ë„ ìš´í–‰: 9í¸ì„±ìœ¼ë¡œ ë‹¹ì¼ ì „ í¸ë„ ìš´í–‰í•˜ê³  ì› ê¸°ì ì— ë³µê·€í•œë‹¤.
  // ì¸ë±ìŠ¤ ì°¨ 4ì¹¸ì€ ì¢…ì°© í›„ ì•½ 21~22ë¶„ íšŒì°¨ë¥¼ ë³´ì¥í•œë‹¤.
  for(let r=0;r<3;r++){
    const down=i=>String(5061+i*2),up=i=>String(5062+i*2);
    sets.push({id:`ì‹ ì˜ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ ${r*2+1}(ì‹ ì˜ì£¼ê¸°ì )`,seq:[down(r),up(r+4),down(r+8),up(r+12)]});
    sets.push({id:`ì‹ ì˜ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ ${r*2+2}(ì„œìš¸ê¸°ì )`,seq:[up(r),down(r+4),up(r+8),down(r+12)]});
  }
  sets.push({id:'ì‹ ì˜ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ 7(ì‹ ì˜ì£¼ê¸°ì )',seq:['5067','5076']});
  sets.push({id:'ì‹ ì˜ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ 8(ì„œìš¸ê¸°ì )',seq:['5068','5083']});
  sets.push({id:'ì‹ ì˜ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ 9(ì‹ ì˜ì£¼ê¸°ì )',seq:['5075','5084']});
  addNorthCycles('ì‹ ì˜ì£¼-ë¶€ì‚° ITX-ìƒˆë§ˆì„',5091);
  addNorthCycles('í‰ì–‘-ì›ì‚° ITX-ìƒˆë§ˆì„',5101);
  // í•´ì£¼ ê²½ìœ  ì‚¬ì§„ì˜ ì™•ë³µ ìš´ì „ì‹œë¶„(ì•½ 6ì‹œê°„)ì„ ë°˜ì˜í•œ 14ì™•ë³µ ìµœì†Œ 7í¸ì„±.
  for(const [id,seq] of [
    ['1(í‰ì–‘ê¸°ì )',['5131','5138','5143','5150']],
    ['2(ì„œìš¸ê¸°ì )',['5132','5137','5144','5153']],
    ['3(í‰ì–‘ê¸°ì )',['5133','5140','5147','5154']],
    ['4(ì„œìš¸ê¸°ì )',['5134','5141','5148','5155']],
    ['5(í‰ì–‘ê¸°ì )',['5135','5142','5149','5156']],
    ['6(ì„œìš¸ê¸°ì )',['5136','5145','5152','5157']],
    ['7(í‰ì–‘ê¸°ì )',['5139','5146','5151','5158']]
  ])sets.push({id:`í‰ì–‘-í•´ì£¼-ì„œìš¸ ITX-ìƒˆë§ˆì„ ${id}`,seq});
  addNorthCycles('ë§Œí¬-í‰ì–‘ ITX-ë§ˆìŒ',5161);
  // ë…•ì›ì„  ë‹¨ê±°ë¦¬ 10ì™•ë³µ: ì„œìš¸ ì§í†µí¸ê³¼ í†µí•© 65ë¶„ ê°„ê²©, ë‹¹ì¼ ì› ê¸°ì  ë³µê·€.
  sets.push({id:'ë…•ì›-í‰ì–‘ ITX-ë§ˆìŒ 1(í‰ì–‘ê¸°ì )',seq:['5182','5185','5190','5193','5198','5199']});
  sets.push({id:'ë…•ì›-í‰ì–‘ ITX-ë§ˆìŒ 2(ë…•ì›ê¸°ì )',seq:['5181','5186','5189','5194','5197','5200']});
  sets.push({id:'ë…•ì›-í‰ì–‘ ITX-ë§ˆìŒ 3(ë…•ì›ê¸°ì )',seq:['5183','5188','5191','5196']});
  sets.push({id:'ë…•ì›-í‰ì–‘ ITX-ë§ˆìŒ 4(í‰ì–‘ê¸°ì )',seq:['5184','5187','5192','5195']});
  addNorthCycles('í˜œì‚°-ì›ì‚° ITX-ë§ˆìŒ',5201);
  addNorthCycles('ë¬´ì‚°-ì›ì‚° ITX-ë§ˆìŒ',5221);
  addNorthCycles('ê²½í¥-ì›ì‚° ITX-ë§ˆìŒ',5241);
  addNorthCycles('í‰ì–‘-ë£¡ì—° ITX-ë§ˆìŒ',5261);
  sets.push({id:'ë…•ì›-ì„œìš¸ ITX-ìƒˆë§ˆì„ 1(ì„œìš¸ê¸°ì )',seq:['5282','5283','5288','5289']});
  sets.push({id:'ë…•ì›-ì„œìš¸ ITX-ìƒˆë§ˆì„ 2(ë…•ì›ê¸°ì )',seq:['5281','5286','5287','5292']});
  sets.push({id:'ë…•ì›-ì„œìš¸ ITX-ìƒˆë§ˆì„ 3(ì„œìš¸ê¸°ì )',seq:['5284','5291']});
  sets.push({id:'ë…•ì›-ì„œìš¸ ITX-ìƒˆë§ˆì„ 4(ë…•ì›ê¸°ì )',seq:['5285','5290']});
  // ì‹ ì˜ì£¼â€“í‰ì–‘ ë¬´ê¶í™”í˜¸ 14ì™•ë³µ: ì‚¬ì§„ ì›í˜• ì¬ë°°ì¹˜ í›„ ì „ í¸ ë‹¹ì¼ ì› ê¸°ì  ë³µê·€.
  // ì „ í¸ 5ë¶„ ì´ìƒ íšŒì°¨ë¥¼ ë§Œì¡±í•˜ëŠ” ìµœì†Œ 6í¸ì„± ìš´ìš©ì´ë‹¤.
  for(const [id,seq] of [
    ['1(ì‹ ì˜ì£¼ê¸°ì )',['5401','5406','5409','5416','5421','5426']],
    ['2(í‰ì–‘ê¸°ì )',['5402','5405','5410','5415','5422','5425']],
    ['3(ì‹ ì˜ì£¼ê¸°ì )',['5403','5412','5417','5424']],
    ['4(í‰ì–‘ê¸°ì )',['5404','5411','5418','5423']],
    ['5(ì‹ ì˜ì£¼ê¸°ì )',['5407','5414','5419','5428']],
    ['6(í‰ì–‘ê¸°ì )',['5408','5413','5420','5427']]
  ])sets.push({id:`ì‹ ì˜ì£¼-í‰ì–‘ ë¬´ê¶í™”í˜¸ ${id}`,seq});
  addNorthCycles('ì‹ ì˜ì£¼-ì›ì‚° ITX-ìƒˆë§ˆì„',5301);
  addNorthCycles('ë§Œí¬-ì„œìš¸ ITX-ìƒˆë§ˆì„',5351);
  addNorthCycles('ì„œìš¸-ë¸”ë¼ë””ë³´ìŠ¤í† í¬ KTX-ì‚°ì²œ',8001);
  // ì•¼ê°„ 2ì™•ë³µ ì¦í¸ í›„ì˜ ë‹¹ì¼ ìˆœí™˜. ê° í¸ì„±ì€ 5ë¶„ ì´ìƒ íšŒì°¨í•˜ê³  ì› ê¸°ì ìœ¼ë¡œ ëŒì•„ê°„ë‹¤.
  for(const [id,seq] of [
    ['1(ì‹ ì˜ì£¼ê¸°ì )',['8021','8026','8029','8036']],
    ['2(ë¶€ì‚°ê¸°ì )',['8022','8025','8030','8035']],
    ['3(ì‹ ì˜ì£¼ê¸°ì )',['8023','8028','8031','8038']],
    ['4(ë¶€ì‚°ê¸°ì )',['8024','8027','8032','8037']],
    ['5(ì‹ ì˜ì£¼ê¸°ì )',['8033','8040']],
    ['6(ë¶€ì‚°ê¸°ì )',['8034','8039']]
  ])sets.push({id:`ì‹ ì˜ì£¼-ë¶€ì‚° KTX-ì‚°ì²œ ${id}`,seq});
  addNorthCycles('ì‹ ì˜ì£¼-ì„œìš¸ KTX-ì‚°ì²œ',9001);
  addNorthCycles('ì›ì‚°-ë¶€ì‚° KTX-ì´ìŒ',9521);
  addNorthCycles('ê²½í¥-ë‚¨ëŒ€êµ¬ KTX-ì‚°ì²œ',9701);
  addNorthCycles('ê²½í¥-ëª©í¬ KTX-ì‚°ì²œ',9751);
  const m={};
  sets.forEach(s=>s.seq.forEach((no,i)=>{ m[no]={id:s.id, seq:s.seq, idx:i}; }));
  return m;
})();

// 042: í¸ì„± ìš´ìš© â€” í™•ì • ìš´ìš©í‘œ ìš°ì„ , ì—†ìœ¼ë©´ ì¢…ì°© íšŒì°¨ ê¸°ë°˜ ì¶”ì •
function _rotStart(t){const s=t.stops.filter(x=>hasTime(x.arr)||hasTime(x.dep));return {stn:s[0].s, min:toMin(s[0].dep||s[0].arr)};}
function _rotEnd(t){const s=t.stops.filter(x=>hasTime(x.arr)||hasTime(x.dep));return {stn:s[s.length-1].s, min:toMin(s[s.length-1].arr||s[s.length-1].dep)};}
function _estimateRotation(startNo){
  const start=getTrainByNo(startNo); if(!start)return [];
  const chain=[start]; const seen=new Set([start.no]);
  // ì•ìœ¼ë¡œ: ì¢…ì°©ì—­ì—ì„œ íšŒì°¨(6~120ë¶„) í›„ ë°˜ëŒ€ë°©í–¥ ë™ê¸‰ ì—´ì°¨ë¡œ ì´ì–´ê°
  let cur=start;
  for(let i=0;i<10;i++){
    const e=_rotEnd(cur); if(e.min==null)break;
    let best=null;
    ALL_TRAINS.forEach(x=>{ if(seen.has(x.no)||x.grade!==cur.grade||x.dir===cur.dir)return;
      const s=_rotStart(x); if(s.stn!==e.stn||s.min==null)return;
      let d=s.min-e.min; if(d<0)d+=1440; if(d>=6&&d<=120&&(!best||d<best.d))best={x,d}; });
    if(!best)break; chain.push(best.x); seen.add(best.x.no); cur=best.x;
  }
  // ë’¤ë¡œ: ì‹œë°œì—­ìœ¼ë¡œ íšŒì°¨ ë“¤ì–´ì˜¨ ì—´ì°¨ ì¶”ì •
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
  if(conf){ chain=conf.seq.map(n=>getTrainByNo(n)).filter(Boolean); confirmed=chain.length===conf.seq.length; setId=conf.id; }
  if(!confirmed){ chain=_estimateRotation(no); }
  const fmt=m=>{ if(m==null)return '-'; m=((m%1440)+1440)%1440; return Math.floor(m/60)+':'+String(m%60).padStart(2,'0'); };
  const rows=chain.map((t,i)=>{
    const s=_rotStart(t), e=_rotEnd(t);
    const gap = i>0 ? (()=>{ let d=s.min-_rotEnd(chain[i-1]).min; if(d<0)d+=1440; return d; })() : null;
    const c=`var(--c-${gcCssVar(t.grade)})`;
    const hi = t.no===no;
    return `${gap!=null?`<div class="rot-gap">â†• ${e.stn===s.stn?s.stn+' íšŒì°¨':'íšŒì°¨'} ${gap}ë¶„</div>`:''}
      <div class="rot-leg${hi?' rot-cur':''}" onclick="closeRotation();jumpToTrain('${t.no}')">
        <div class="rot-leg-head"><span style="color:${c};font-weight:800">${t.grade}</span> <b>${t.no}</b>${hi?' <span class="rot-badge">ì´ ì—´ì°¨</span>':''}</div>
        <div class="rot-leg-body"><span>${s.stn} <span class="rot-t">${fmt(s.min)}</span></span> <span class="rot-arr">â†’</span> <span>${e.stn} <span class="rot-t">${fmt(e.min)}</span></span></div>
      </div>`;
  }).join('');
  const wrap=document.createElement('div'); wrap.id='rotation-wrap';
  wrap.innerHTML=`<div class="rail-ticket-backdrop" onclick="closeRotation()"></div>
    <div class="rot-popup">
      <div class="rot-popup-head"><span>ğŸ” í¸ì„± ìš´ìš© ${confirmed?'(í™•ì •)':'(ì¶”ì •)'}</span><button class="si-board-close" onclick="closeRotation()">âœ•</button></div>
      <div class="rot-note">${confirmed
        ? `í™•ì • ìš´ìš©í‘œ Â· <b>${setId}</b> í¸ì„± Â· í•˜ë£¨ ${chain.length}íšŒ ìš´ìš© Â· ì°©ë°œì—­ ë³µê·€`
        : 'ì¢…ì°©ì—­ íšŒì°¨ë¥¼ ê¸°ì¤€ìœ¼ë¡œ ê°™ì€ í¸ì„±ì˜ í•˜ë£¨ ìš´í–‰ì„ ì¶”ì •í•œ ê²ƒì…ë‹ˆë‹¤. ì‹¤ì œ í¸ì„± ìš´ìš©ê³¼ ë‹¤ë¥¼ ìˆ˜ ìˆìŠµë‹ˆë‹¤.'}</div>
      <div class="rot-list">${rows}</div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeRotation(){ document.getElementById('rotation-wrap')?.remove(); }

// â”€â”€ ì—´ì°¨ ìƒì„¸ ë·° ì „í™˜ â”€â”€
function setDetailView(mode, trainNo){
  _detailViewMode = mode;
  const trains = getTrainsByNo(trainNo);
  const el = document.getElementById('result-train');
  if(el && trains.length){
    el.innerHTML = trains.map(renderDetail).join('');
    // í†µê³¼ì—­ ìˆ¨ê¸°ê¸° ìƒíƒœ ë³µì›
    const cb = document.getElementById(`hide-pass-${trainNo}`);
    if(cb && cb.checked) togglePassRows(trainNo);
  }
}

function renderTableView(t){
  const status=getCurrentStatus(t);
  let tableRows = '';
  let seq = 0;
  const valid = t.stops.filter(s => s.arr || s.dep);
  const firstTimedIndex=t.stops.findIndex(s=>s.arr||s.dep);
  const lastTimedIndex=t.stops.length-1-[...t.stops].reverse().findIndex(s=>s.arr||s.dep);
  t.stops.forEach((s,stopIndex) => {
    const arr = s.arr, dep = s.dep;
    if(!arr && !dep) return;
    const isOrigin=stopIndex===firstTimedIndex, isTerm=stopIndex===lastTimedIndex;
    const isPass = !isOrigin && !isTerm && isPassStop(t, s.s);
    seq++;
    // í˜„ì¬ ìœ„ì¹˜ í•˜ì´ë¼ì´íŠ¸
    let hlCls='';
    if(status&&status.status==='running'){
      if(status.atStn===s.s) hlCls=' hl-at';
      else if(status.nextStn===s.s||status.prevStn===s.s) hlCls=' hl-next';
    }
    const rc = isPass ? 'sr pass-row' : `sr${hlCls}`;
    const stnNameCls = isOrigin?'origin-n':isTerm?'term-n':'';
    // ë‹¤ìŒ ì—­ ë±ƒì§€
    const nextBadge=status&&status.nextStn===s.s&&!isPass
      ?'<span style="font-size:10px;padding:1px 5px;border-radius:8px;background:rgba(56,139,253,.2);color:var(--accent);border:1px solid rgba(56,139,253,.4);margin-left:4px;font-weight:600">ë‹¤ìŒ</span>':
      status&&status.atStn===s.s?'<span style="font-size:10px;padding:1px 5px;border-radius:8px;background:rgba(63,185,80,.2);color:var(--green);border:1px solid rgba(63,185,80,.4);margin-left:4px;font-weight:600">í˜„ì¬</span>':'';
    const arrCell = hasTime(arr) ? `<span class="t-arr">${arr}</span>` : isOrigin ? '<span style="color:var(--text3);font-size:11px">ì¶œë°œì—­</span>' : '';
    const depCell = hasTime(dep) ? `<span class="t-dep">${dep}</span>` : isTerm ? '<span style="color:var(--text3);font-size:11px">ì¢…ì°©ì—­</span>' : '';
    const tno = t.no, tstn = s.s;
    const sIdx = t.stops.findIndex(x => x.s === tstn);
    const prevStop = sIdx > 0 ? t.stops.slice(0, sIdx).reverse().find(x => hasTime(x.dep) || hasTime(x.arr)) : null;
    const prevTime = prevStop ? (hasTime(prevStop.dep) ? prevStop.dep : prevStop.arr) : null;
    let alarmCell = '<div class="stn-alarm-cell">';
    if(!isPass){
      const boardSet = hasAlarm(`board:${tno}:${tstn}`);
      const arrSet = hasAlarm(`arr:${tno}:${tstn}`);
      const anySet = boardSet || arrSet;
      alarmCell += `<button class="alarm-bell-btn${anySet?' has-alarm':''}" onclick="openAlarmPopup('${tno}','${tstn}','${arr||''}','${dep||''}','${prevTime||''}')" title="ì•ŒëŒ ì„¤ì •">ğŸ””</button>`;
    }
    alarmCell += '</div>';
    tableRows += `<div class="${rc}"><div class="stn-idx">${seq}</div><div class="stn-name ${stnNameCls}">${tstn}${nextBadge}</div><div class="stn-time">${arrCell}</div><div class="stn-time">${depCell}</div>${alarmCell}</div>`;
  });
  return `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <div class="stn-grid" style="min-width:500px">
      <div class="stn-gh">#</div><div class="stn-gh">ì—­ëª…</div>
      <div class="stn-gh green">ë„ì°©</div><div class="stn-gh blue">ì¶œë°œ</div>
      <div class="stn-gh alarm-col">ì•ŒëŒ</div>
      ${tableRows}
    </div>
  </div>`;
}

// â”€â”€ íƒ€ì„ë¼ì¸ í†µê³¼ì—­ ìˆ¨ê¸°ê¸° í† ê¸€ â”€â”€
function togglePassRows(trainNo){
  const cb=document.getElementById(`hide-pass-${trainNo}`);
  const list=document.getElementById(`tl-${trainNo}`);
  if(!cb||!list)return;
  const hide=cb.checked;
  // íƒ€ì„ë¼ì¸ ëª¨ë“œ
  list.querySelectorAll('.tl-row').forEach(row=>{
    if(row.classList.contains('tl-row-pass')) row.style.display=hide?'none':'';
  });
  // í‘œ ëª¨ë“œ
  list.querySelectorAll('.sr.pass-row').forEach(row=>{
    row.style.display=hide?'none':'';
  });
}


// â”€â”€ ë…¸ì„ ë„ í™•ëŒ€/ì¶•ì†Œ â”€â”€
let _mapZoom = 1;
let _mapZoomOrigin = {x:0, y:0};

function initMapZoom(){
  const wrap = document.getElementById('map-svg-wrap');
  if(!wrap) return;
  _mapZoom = 1;

  // íœ  ì¤Œ (ìƒˆ ë ˆì´ì•„ì›ƒ ì¤Œìœ¼ë¡œ ìœ„ì„ â€” transform scaleì€ ìŠ¤í¬ë¡¤ ì˜ì—­ì´ ì•ˆ ëŠ˜ì–´ë‚˜ íê¸°)
  wrap.onwheel = e => {
    e.preventDefault();
    mapZoom(e.deltaY > 0 ? -0.2 : 0.2);
  };
  // (êµ¬) í•€ì¹˜ property í•¸ë“¤ëŸ¬ ì œê±° â€” ìƒˆ _mapBindPinch(addEventListener)ê°€ ë‹´ë‹¹
  wrap.ontouchstart = null;
  wrap.ontouchmove = null;
  wrap.ontouchend = null;
}

// (êµ¬ API ìœ„ì„) ë‹¤ë¥¸ ì½”ë“œê°€ í˜¸ì¶œí•´ë„ ìƒˆ ì¤Œìœ¼ë¡œ ë™ì‘
function setMapZoom(z){
  _mapZoomLv = Math.max(1, Math.min(4, z));
  _mapApplyZoom(true);
  const zl = document.getElementById('map-zoom-label');
  if(zl) zl.textContent = Math.round(_mapZoomLv*100) + '%';
}
function mapZoomIn(){ mapZoom(0.35); }
function mapZoomOut(){ mapZoom(-0.35); }

// â”€â”€ ë…¸ì„ ë„ì—ì„œ ì—´ì°¨ ìœ„ì¹˜ ì¶”ì  â”€â”€
function trackTrainOnMap(trainNo){
  const t = getTrainByNo(trainNo);
  if(!t) return;

  const lineMap = {
    'ê²½ë¶€ì„ ':'gyeongbu','ê²½ë¶€ê³ ì†ì„ ':'gyeongbuhs','í˜¸ë‚¨ê³ ì†ì„ ':'honamhs','í˜¸ë‚¨ì„ ':'honam',
    'ì „ë¼ì„ ':'jeolla','ì¤‘ì•™ì„ ':'jungang','ë™í•´ì„ ':'donghae','ì˜ë™ì„ ':'yeongdong',
    'ê°•ë¦‰ì„ ':'gangreung','ì¤‘ë¶€ë‚´ë¥™ì„ ':'jungnaelyuk','ê²½ì „ì„ ':'gyeongjeon','ì œì£¼ì„ ':'jeju','ì¶©ë¶ì„ ':'chungbuk','ì¥í•­ì„ ':'janghang','ë‚¨ë¶€ë‚´ë¥™ì„ ':'nambunaelyuk',
    'ì„œì‚°ì„ ':'seosan','íƒœì•ˆì„ ':'taean','ê²½ê°•ì„ ':'seogang','ì†Œë°±ì„ ':'sobaek','ê²½ë¶ì„ ':'gyeongbuk','íƒœë°±ì„ ':'taebaek','ì •ì„ ì„ ':'jeongseon','ëŒ€êµ¬ì„ ':'daegu'
  };

  // í˜„ì¬ ìœ„ì¹˜ ê¸°ì¤€ìœ¼ë¡œ ì‹¤ì œ ìš´í–‰ ì¤‘ì¸ ë…¸ì„  íŒë‹¨
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

  // fallback: ì—´ì°¨ ë…¸ì„  ì†ì„± ì²« ë²ˆì§¸ í•­ëª©
  if(!lineKey){
    for(const l of t.line.split('Â·').map(l=>l.trim())){
      if(lineMap[l]){ lineKey = lineMap[l]; break; }
    }
  }

  if(!lineKey){ alert('í•´ë‹¹ ë…¸ì„ ì˜ ë…¸ì„ ë„ê°€ ì—†ìŠµë‹ˆë‹¤'); return; }

  _mapTrackedTrain = trainNo;
  switchTab('map');

  // í•´ë‹¹ ë…¸ì„  íƒ­ì´ ì´ë¯¸ í™œì„±ì´ë©´ ê·¸ëƒ¥ ì¬ë Œë”, ì•„ë‹ˆë©´ í´ë¦­
  const btn = document.querySelector(`.map-line-tab[onclick*="${lineKey}"]`);
  if(btn && !btn.classList.contains('active')){
    btn.click(); // showMapLine + updateMapTrains í˜¸ì¶œë¨
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
  const t = getTrainByNo(_mapTrackedTrain);
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

// â”€â”€ ìµœê·¼ ê²€ìƒ‰ ë“œë¡­ë‹¤ìš´ â”€â”€
function showRecentSearches(inputId, listId, type){
  const h = loadHistory(type);
  if(!h.length) return;
  const val = document.getElementById(inputId)?.value || '';
  if(val) return; // ì…ë ¥ ì¤‘ì´ë©´ íˆìŠ¤í† ë¦¬ ì•ˆ ë³´ì„
  const el = document.getElementById(listId);
  if(!el) return;
  el.innerHTML = h.map(v =>
    `<div class="ac-item ac-history" onmousedown="event.preventDefault();document.getElementById('${inputId}').value='${v}';document.getElementById('${listId}').style.display='none'">
      <span style="color:var(--text3);margin-right:6px;font-size:10px">ğŸ•</span>${v}
    </div>`
  ).join('');
  el.style.display = 'block';
  el.className = 'ac-dropdown open';
}

// â”€â”€ ì¦ê²¨ì°¾ê¸° ë“œë˜ê·¸ ìˆœì„œ ë³€ê²½ â”€â”€
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
  if(_favFilterCat!=='all')return; // í•„í„°ë§ ì¤‘ì—ëŠ” ìˆœì„œ ë³€ê²½ ë¹„í™œì„±í™” (ì¸ë±ìŠ¤ ê¼¬ì„ ë°©ì§€)
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


// â”€â”€ ë…¸ì„ ë„ â”€â”€
let _mapCurrentLine = null;
let _mapStnPos = {};
let _mapSvgSize = {w:0,h:0,ox:0,oy:0};
let _mapTrainInterval = null;
let _mapLayerMode = 'station'; // 'station': ì—­ ìš°ì„ , 'train': ì—´ì°¨ ìš°ì„ 
let _mapShowTrains = localStorage.getItem('nimbi_map_show_trains')!=='0';
let _mapDirFilter = 'both'; // 'both': ì „ì²´, 'down': í•˜í–‰ë§Œ, 'up': ìƒí–‰ë§Œ
let _mapGradeFilter = null; // null=ì „ì²´, 'KTX', 'SRT', 'ITX', 'ë¬´ê¶í™”'
let _mapTrackedTrain = null; // í˜„ì¬ ì¶”ì  ì¤‘ì¸ ì—´ì°¨ ë²ˆí˜¸
let _mapReachability = null; // {origin, stations:Set, mode} â€” ì—­ì—ì„œ í™˜ìŠ¹ ì—†ì´ ê°ˆ ìˆ˜ ìˆëŠ” ì—­
let _mapStatusColor = false;  // 038: í˜¼ì¡ë„ì— ë”°ë¥¸ ì—´ì°¨ ìƒíƒœìƒ‰ í‘œì‹œ on/off
function toggleMapStatusColor(){
  _mapStatusColor=!_mapStatusColor;
  const btn=document.getElementById('map-status-color-btn');
  if(btn) btn.classList.toggle('active',_mapStatusColor);
  if(_mapCurrentLine) updateMapTrains();
}
// ì—´ì°¨ í˜¼ì¡ë„ â†’ ìƒíƒœìƒ‰ (ë§¤ì§„ì„ë°• ë¹¨ê°• Â· í˜¼ì¡ ì£¼í™© Â· ë³´í†µ ë…¸ë‘ Â· ì—¬ìœ  ì´ˆë¡)
function _mapCongColor(t){
  try{
    const dep=t.stops[0]?.dep||t.stops[0]?.arr;
    const rate=(typeof calcRealisticFillRate==='function')?calcRealisticFillRate(t.no,todayLocalStr(),dep,t.grade):0.5;
    return rate>=0.9?'#ef4444':rate>=0.78?'#f97316':rate>=0.62?'#e3b341':'#3fb950';
  }catch(e){ return GRADE_COLORS[t.grade]||'#888'; }
}
let _mapTimelineMin = null; // null=ì‹¤ì‹œê°„, 0~1439=ì¬ìƒ ì‹œê°(ë¶„)
let _mapTimelinePlaying = false;
let _mapTimelinePlayInterval = null;
let _mapTimelineSpeed = 30; // ë¶„/ì´ˆ

function toggleMapFilterPanel(){
  const panel=document.getElementById('map-filter-panel');
  const arrow=document.getElementById('map-filter-arrow');
  const btn=document.getElementById('map-filter-toggle-btn');
  if(!panel) return;
  const open=panel.style.display!=='none';
  panel.style.display=open?'none':'block';
  if(arrow) arrow.textContent=open?'â–¾':'â–´';
  if(btn) btn.classList.toggle('map-filter-toggle-active',!open);
}

function toggleMapLayer(){
  _mapLayerMode = _mapLayerMode==='station'?'train':'station';
  const btn=document.getElementById('map-layer-btn');
  if(btn) btn.textContent=_mapLayerMode==='station'?'ì—­ ìš°ì„ ':'ì—´ì°¨ ìš°ì„ ';
  if(_mapCurrentLine) updateMapTrains();
}

function _mapReachEdgeKey(a,b){return a<b?`${a}|${b}`:`${b}|${a}`;}
const _mapReachPathCache={train:null,metro:null};
function _mapReachPaths(mode){
  const cacheKey=mode==='metro'?'metro':'train';
  if(_mapReachPathCache[cacheKey])return _mapReachPathCache[cacheKey];
  const paths=cacheKey==='metro'&&typeof METRO_LINES!=='undefined'
    ?METRO_LINES.flatMap(line=>(line.routes||[{stations:line.stations||[]}]).map(route=>route.stations||[]))
    :(typeof MAP_LINES!=='undefined'?Object.values(MAP_LINES).flatMap(line=>(line.routes||[]).map(route=>route.stations.map(station=>station.n))):[]);
  _mapReachPathCache[cacheKey]=paths;
  return paths;
}
function _addMapReachPathEdges(edges,a,b,mode){
  const paths=_mapReachPaths(mode);
  let best=null;
  paths.forEach(names=>{
    const from=names.indexOf(a),to=names.indexOf(b);
    if(from<0||to<0||from===to)return;
    const distance=Math.abs(to-from);
    if(!best||distance<best.distance)best={names,from,to,distance};
  });
  if(!best){edges.add(_mapReachEdgeKey(a,b));return;}
  const step=best.to>best.from?1:-1;
  for(let index=best.from;index!==best.to;index+=step){
    edges.add(_mapReachEdgeKey(best.names[index],best.names[index+step]));
  }
}
function _directReachableStations(stn,mode){
  const origin=mode==='train'?railStationDisplayName(railStationDataName(stn)):stn;
  const originKey=mode==='train'?railStationDataName(stn):stn;
  const out=new Set([origin]);
  const edges=new Set();
  if(mode==='metro'&&typeof METRO_SCHED!=='undefined'){
    Object.values(METRO_SCHED).forEach(ent=>(ent.t||[]).forEach(service=>{
      const names=[];
      for(let i=2;i<service.length;i+=3){const name=ent.s?.[service[i]];if(name)names.push(name);}
      if(names.includes(stn)){
        names.forEach(name=>out.add(name));
        for(let i=0;i<names.length-1;i++)_addMapReachPathEdges(edges,names[i],names[i+1],mode);
      }
    }));
  }else if(typeof ALL_TRAINS!=='undefined'){
    ALL_TRAINS.forEach(t=>{
      const stops=(t.stops||[]).filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(t,s.s));
      if(stops.some(s=>railStationDataName(s.s)===originKey)){
        stops.forEach(s=>out.add(railStationDisplayName(railStationDataName(s.s))));
        const routeStops=(t.stops||[]).filter(s=>hasTime(s.arr)||hasTime(s.dep));
        for(let i=0;i<routeStops.length-1;i++){
          const from=railStationDisplayName(railStationDataName(routeStops[i].s));
          const to=railStationDisplayName(railStationDataName(routeStops[i+1].s));
          _addMapReachPathEdges(edges,from,to,mode);
        }
      }
    });
  }
  return {stations:out,edges};
}
function openStationReachabilityMap(stn){
  const mode=_appMode==='metro'?'metro':'train';
  const direct=_directReachableStations(stn,mode);
  const origin=mode==='train'?railStationDisplayName(railStationDataName(stn)):stn;
  let stations=direct.stations;
  const mapped=mode==='metro'&&typeof METRO_LINES!=='undefined'
    ?new Set(METRO_LINES.flatMap(l=>(l.routes||[{stations:l.stations||[]}]).flatMap(r=>r.stations||[])))
    :new Set(Object.values(MAP_LINES).flatMap(l=>(l.routes||[]).flatMap(r=>r.stations.map(s=>s.n))));
  stations=new Set([...stations].filter(name=>mapped.has(name)));
  if(mapped.has(origin))stations.add(origin);
  _mapTrackedTrain=null;
  _mapReachability={origin,stations,edges:direct.edges,mode,region:mode==='train'?_railRegion:null};
  if(mode==='metro'&&typeof METRO_LINES!=='undefined'){
    const line=METRO_LINES.find(l=>(l.routes||[{stations:l.stations||[]}]).some(r=>(r.stations||[]).includes(stn)));
    if(line)_metroMapRegion=line.region;
    _metroMapId='__all__';
  }
  switchTab('map');
  const key=mode==='metro'?`metroall:${_metroMapRegion}`
    :_railRegion==='north'?'north':_railRegion==='all'?'allregions':'all';
  const btn=mode==='train'&&key==='all'?document.querySelector('.map-line-tab[onclick*="\'all\'"]'):null;
  showMapLine(key,btn);
}
function clearStationReachabilityMap(){
  _mapReachability=null;
  renderMapTabForMode();
}

function _syncMapTrainVisibilityButton(){
  const btn=document.getElementById('map-train-visibility-btn');
  if(!btn)return;
  btn.textContent=_mapShowTrains?'ì—´ì°¨ ìœ„ì¹˜ ì¼¬':'ì—´ì°¨ ìœ„ì¹˜ ë”';
  btn.classList.toggle('active',_mapShowTrains);
  btn.setAttribute('aria-pressed',String(_mapShowTrains));
}
function toggleMapTrainVisibility(){
  _mapShowTrains=!_mapShowTrains;
  localStorage.setItem('nimbi_map_show_trains',_mapShowTrains?'1':'0');
  _syncMapTrainVisibilityButton();
  if(_mapCurrentLine)updateMapTrains();
}

function setMapDir(dir){
  // ë²„íŠ¼ ìƒíƒœ ì—…ë°ì´íŠ¸
  const btnDown=document.getElementById('map-dir-down');
  const btnUp=document.getElementById('map-dir-up');
  const btnAll=document.getElementById('map-dir-all');

  if(dir==='all'){
    // ì „ì²´: ë‘˜ ë‹¤ í™œì„±
    _mapDirFilter='both';
    if(btnDown)btnDown.classList.add('active');
    if(btnUp)btnUp.classList.add('active');
    if(btnAll)btnAll.classList.add('active');
  } else if(dir==='down'){
    // í•˜í–‰ í† ê¸€
    const isActive=btnDown&&btnDown.classList.contains('active');
    if(isActive&&_mapDirFilter!=='down'){
      // í•˜í–‰ë§Œ
      _mapDirFilter='down';
      if(btnDown)btnDown.classList.add('active');
      if(btnUp)btnUp.classList.remove('active');
      if(btnAll)btnAll.classList.remove('active');
    } else if(isActive){
      // ë‹¤ì‹œ ì „ì²´ë¡œ
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
    // ìƒí–‰ í† ê¸€
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
  const MAP_GRADE={all:null,ktx:'KTX',srt:'SRT',itx:'ITX',mgg:'ë¬´ê¶í™”'};
  Object.entries(MAP_GRADE).forEach(([k,v])=>{
    const b=document.getElementById('map-grade-'+k);
    if(!b)return;
    b.classList.toggle('active',_mapGradeFilter===v);
  });
  if(_mapCurrentLine) updateMapTrains();
}

// â”€â”€ íƒ€ì„ë¼ì¸ ì¬ìƒ â”€â”€
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
  if(btn) btn.textContent='â¸ ì¼ì‹œì •ì§€';
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
  if(btn) btn.textContent='â–¶ ì¬ìƒ';
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

// ë“±ê¸‰ë³„ ìƒ‰ìƒ (KTX-ì‚°ì²œ/ì´ìŒì€ KTXì™€ ë™ì¼, ITX-ë§ˆìŒì€ ITX-ìƒˆë§ˆì„ê³¼ ë™ì¼)
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
// ë…¸ì„ ëª… â†’ MAP_LINES í‚¤, ë…¸ì„ ë³„ ì¸ì ‘ì—­ ìŒ ìºì‹œ (êµ¬ê°„ ì†Œì† íŒë³„ìš©)
const _lineNameToKey={'ê²½ë¶€ì„ ':'gyeongbu','ê²½ë¶€ê³ ì†ì„ ':'gyeongbuhs','í˜¸ë‚¨ê³ ì†ì„ ':'honamhs','í˜¸ë‚¨ì„ ':'honam','ì „ë¼ì„ ':'jeolla','ì¤‘ì•™ì„ ':'jungang','ë™í•´ì„ ':'donghae','ì˜ë™ì„ ':'yeongdong','ê°•ë¦‰ì„ ':'gangreung','ì¤‘ë¶€ë‚´ë¥™ì„ ':'jungnaelyuk','ê²½ì „ì„ ':'gyeongjeon','ì œì£¼ì„ ':'jeju','ì¶©ë¶ì„ ':'chungbuk','ì¥í•­ì„ ':'janghang','ë‚¨ë¶€ë‚´ë¥™ì„ ':'nambunaelyuk','ì„œì‚°ì„ ':'seosan','íƒœì•ˆì„ ':'taean','ê²½ê°•ì„ ':'seogang','ì†Œë°±ì„ ':'sobaek','ê²½ë¶ì„ ':'gyeongbuk','íƒœë°±ì„ ':'taebaek','ì •ì„ ì„ ':'jeongseon','ë°€ì–‘ì„ ':'miryang','ì„¸ì¢…ì„¸ì²œì„ ':'sejongsecheon','êµì™¸ì„ ':'gyooe','ê²½ì˜ì„ ':'gyeongui','ê²½ì›ì„ ':'gyeongwon','ë³´ì€ì„ ':'boeun','ëŒ€êµ¬ì„ ':'daegu'};
const _mapEdgeCache={};
function _mapLineEdgeSet(key){
  if(_mapEdgeCache[key])return _mapEdgeCache[key];
  const ml=MAP_LINES[key], e=new Set();
  if(ml)(ml.routes||[]).forEach(r=>{for(let i=0;i<r.stations.length-1;i++){e.add(r.stations[i].n+'|'+r.stations[i+1].n);e.add(r.stations[i+1].n+'|'+r.stations[i].n);}});
  return _mapEdgeCache[key]=e;
}

function _updateMetroMapTrains(svgEl){
  if(typeof METRO_LINES==='undefined'||typeof _metroLineLiveTrains!=='function')return;
  if(!_mapShowTrains){
    const countEl=document.getElementById('map-train-count');
    if(countEl)countEl.textContent='ì—´ì°¨ ìœ„ì¹˜ ìˆ¨ê¹€';
    return;
  }
  let lines=[];
  if(_mapCurrentLine.startsWith('metro:')){
    const id=_mapCurrentLine.slice(6);lines=METRO_LINES.filter(line=>line.id===id);
  }else if(_mapCurrentLine.startsWith('metroall:')){
    const region=_mapCurrentLine.slice(9);lines=METRO_LINES.filter(line=>line.region===region);
  }else if(_mapCurrentLine.startsWith('metropick:')){
    lines=METRO_LINES.filter(line=>_metroPickSet.has(line.id));
  }
  const markers=[];
  lines.forEach(line=>_metroLineLiveTrains(line.name).forEach(train=>{
    const from=_mapStnPos[train.fromStn],to=_mapStnPos[train.toStn]||from;if(!from||!to)return;
    const frac=train.atStation?0:Math.min(1,Math.max(0,train.frac||0));
    markers.push({line,train,x:from.x+(to.x-from.x)*frac,y:from.y+(to.y-from.y)*frac,angle:Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI});
  }));
  const occupied=new Map();markers.forEach(marker=>{
    const key=`${Math.round(marker.x/4)},${Math.round(marker.y/4)}`,nth=occupied.get(key)||0;occupied.set(key,nth+1);
    if(nth){const rad=7*Math.ceil(nth/2),sign=nth%2?1:-1,a=(marker.angle+90)*Math.PI/180;marker.x+=Math.cos(a)*rad*sign;marker.y+=Math.sin(a)*rad*sign;}
  });
  let html='<g id="train-layer" class="metro-map-train-layer">';
  markers.forEach(({line,train,x,y,angle})=>{
    const color=train.cls>0?'#ef4444':line.color,label=_metroLiveTrainLabel(train.dest,train.cls);
    html+=`<g class="metro-map-train" data-line="${_mapStationEsc(line.name)}" data-svc="${train.svcIdx}" role="button" tabindex="0" aria-label="${_mapStationEsc(label)} ì‹œê°„í‘œ ë³´ê¸°" style="cursor:pointer"><circle class="train-dot metro-train-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${color}" stroke="var(--surface)" stroke-width="2"><title>${_mapStationEsc(label)}</title></circle><path d="M -2.8 -3 L 3.2 0 L -2.8 3 Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})" fill="#fff" pointer-events="none"/><text class="train-label metro-train-label" x="${x.toFixed(1)}" y="${(y-10).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="10" font-weight="800" pointer-events="none" paint-order="stroke" stroke="var(--surface)" stroke-width="3">${_mapStationEsc(label)}</text></g>`;
  });
  html+='</g>';
  const temp=document.createElement('div');temp.innerHTML=`<svg>${html}</svg>`;const layer=temp.querySelector('g');
  if(layer){
    const firstHit=svgEl.querySelector('.map-station-hit');
    if(_mapLayerMode==='station'&&firstHit)svgEl.insertBefore(layer,firstHit);
    else svgEl.appendChild(layer);
  }
  svgEl.querySelectorAll('.metro-map-train').forEach(node=>{const line=node.dataset.line,svc=Number(node.dataset.svc),entry=markers.find(item=>item.line.name===line&&item.train.svcIdx===svc);if(entry){const open=event=>{event.stopPropagation();openMetroTrain(line,svc,entry.train.clickClock);};node.addEventListener('click',open);node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(event);}});}});
  const countEl=document.getElementById('map-train-count');if(countEl)countEl.textContent=`ìš´í–‰ ì¤‘ ${markers.length}í¸`;
}

function updateMapTrains(){
  if(!_mapCurrentLine)return;
  const svgEl=document.querySelector('#map-svg-wrap svg');
  if(!svgEl)return;

  // ê¸°ì¡´ ì—´ì°¨ ë ˆì´ì–´ ì œê±°
  const old=svgEl.querySelector('#train-layer');
  if(old)old.remove();

  const reachActive=_mapReachability&&(
    (_mapReachability.mode==='train'&&['all','north','allregions'].includes(_mapCurrentLine))||
    (_mapReachability.mode==='metro'&&_mapCurrentLine.startsWith('metroall:'))
  );
  if(reachActive){
    const countEl=document.getElementById('map-train-count');
    if(countEl)countEl.textContent=`ì§í†µ ${Math.max(0,_mapReachability.stations.size-1)}ê°œ ì—­`;
    return;
  }

  // ê²½ë¡œ ì•ˆë‚´ ì§€ë„ëŠ” ì„ íƒ êµ¬ê°„ ìì²´ë§Œ ë³´ì—¬ ì¤€ë‹¤. ì‹¤ì‹œê°„ ì—´ì°¨ í‘œì‹œëŠ”
  // ê²½ë¡œì„ ê³¼ ì¶œë°œÂ·ê²½ìœ Â·í™˜ìŠ¹Â·ë„ì°© ì§€ì ì˜ íŒë…ì„ ë°©í•´í•˜ë¯€ë¡œ í‘œì‹œí•˜ì§€ ì•ŠëŠ”ë‹¤.
  const journeyActive=!!(_metroJourneyMap&&typeof _mapCurrentLine==='string'&&(_mapCurrentLine.startsWith('metroall:')||_mapCurrentLine.startsWith('metrojourney:')));
  if(journeyActive){
    const countEl=document.getElementById('map-train-count');
    if(countEl)countEl.textContent='ê²½ë¡œ ì•ˆë‚´';
    return;
  }

  _syncMapTrainVisibilityButton();
  if(!_mapShowTrains){
    const countEl=document.getElementById('map-train-count');
    if(countEl)countEl.textContent='ì—´ì°¨ ìœ„ì¹˜ ìˆ¨ê¹€';
    return;
  }

  if(typeof _mapCurrentLine==='string'&&(_mapCurrentLine.startsWith('metro:')||_mapCurrentLine.startsWith('metroall:')||_mapCurrentLine.startsWith('metropick:'))){
    _updateMetroMapTrains(svgEl);
    return;
  }

  const now=new Date();
  // 034: ì´ˆ ë‹¨ìœ„ê¹Œì§€ ë°˜ì˜í•´ ìœ„ì¹˜ë¥¼ ë¶€ë“œëŸ½ê²Œ ë³´ê°„
  const nowMin = _mapTimelineMin !== null ? _mapTimelineMin : now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const isAll=_mapCurrentLine==='all'||_mapCurrentLine==='allregions'; // ğŸ›°ï¸ ë‚¨í•œÂ·ë‚¨ë¶ ì „ì²´ë³´ê¸°: ì „ ë…¸ì„ Â·ì „ ì—´ì°¨
  const line=isAll?{name:'__all__'}:MAP_LINES[_mapCurrentLine];
  if(!line)return;

  // ì´ ë…¸ì„ ì— ì†í•˜ëŠ” ìš´í–‰ ì¤‘ ì—´ì°¨ ìˆ˜ì§‘
  const running=[];
  ALL_TRAINS.forEach(t=>{
    if(!isAll&&!t.line.includes(line.name))return;
    const tNow=nowMin-_simDelay(t, nowMin);   // ì§€ì—° ì‹œë®¬: ì—´ì°¨ëŠ” ì§€ì—°ë¶„ë§Œí¼ ë’¤ì²˜ì§„ ìœ„ì¹˜
    const status=getCurrentStatus(t, tNow);
    if(!status||status.status!=='running')return;
    // ë°©í–¥ í•„í„°
    if(_mapDirFilter==='down'&&t.dir!=='down')return;
    if(_mapDirFilter==='up'&&t.dir!=='up')return;
    // ë“±ê¸‰ í•„í„°
    if(_mapGradeFilter){
      const gradeMatch={
        'KTX':['KTX','KTX-ì‚°ì²œ','KTX-ì´ìŒ'],
        'SRT':['SRT'],
        'ITX':['ITX-ìƒˆë§ˆì„','ITX-ë§ˆìŒ','ITX-ì²­ì¶˜'],
        'ë¬´ê¶í™”':['ë¬´ê¶í™”í˜¸','ë‚¨ë„í•´ì–‘','êµ­ì•…ì™€ì¸']
      };
      if(!gradeMatch[_mapGradeFilter]?.includes(t.grade))return;
    }
    // prevStn ë˜ëŠ” nextStn ë˜ëŠ” atStnì˜ ì¢Œí‘œ êµ¬í•˜ê¸°
    const stnA=status.atStn||status.prevStn;
    const stnB=status.atStn?null:status.nextStn;
    let posA=_mapStnPos[stnA];
    let posB=stnB?_mapStnPos[stnB]:null;
    if(isAll){
      // ê´€ì œ: ë™ëª…ì´ì—­ ì˜¤ë°°ì¹˜ ë°©ì§€ â€” ì—´ì°¨ ì†Œì† ë…¸ì„ ì˜ ì¢Œí‘œ ìš°ì„ 
      const lp=_mapLinePos(), mk=t.line.split('Â·').map(s=>_lineNameToKey[s.trim()]).filter(Boolean);
      for(const k of mk){const q=lp[k]&&lp[k][stnA];if(q){posA={x:q.x+_mapSvgSize.ox,y:q.y+_mapSvgSize.oy};break;}}
      if(stnB)for(const k of mk){const q=lp[k]&&lp[k][stnB];if(q){posB={x:q.x+_mapSvgSize.ox,y:q.y+_mapSvgSize.oy};break;}}
    }
    if(!posA)return;
    // í˜„ì¬ êµ¬ê°„ì´ ì´ ì—´ì°¨ê°€ ì´ìš©í•˜ëŠ” 'ë‹¤ë¥¸' ë…¸ì„ ì˜ ì¸ì ‘ êµ¬ê°„ì´ë©´ ê·¸ ë…¸ì„  ì†Œì† â†’ ì´ ì§€ë„ì—ì„œ ìˆ¨ê¹€
    // (ì˜ˆ: í˜¸ë‚¨ê³ ì†ì„  KTXì˜ ì „ì£¼~ì •ìì´ í˜¸ë‚¨ì„  ì§€ë„ì— ì˜ëª» ëœ¨ëŠ” ê²ƒ ë°©ì§€. ë‹¨ì¼ ë…¸ì„  ê¸‰í–‰ì€ ì˜í–¥ ì—†ìŒ)
    // ë‹¨, ì¶”ì  ì¤‘ì¸ ì—´ì°¨ëŠ” ìš´í–‰ êµ¬ê°„ ì „ìš© ë·°ì´ë¯€ë¡œ ì–´ëŠ ë…¸ì„  êµ¬ê°„ì´ë“  í•­ìƒ í‘œì‹œ
    if(stnB && !isAll && !_mapTrackedTrain){
      const others=t.line.split('Â·').map(s=>s.trim()).filter(n=>n&&n!==line.name);
      if(others.some(n=>{const k=_lineNameToKey[n];return k&&_mapLineEdgeSet(k).has(stnA+'|'+stnB);}))return;
    }
    // ìœ„ì¹˜: atStnì´ë©´ ê·¸ ì—­ì—, ì´ë™ ì¤‘ì´ë©´ ë‘ ì—­ ì‚¬ì´ ì¤‘ê°„
    let px,py;
    if(posB){
      // ë‘ ì—­ ì‚¬ì´ ì§„í–‰ë¥  ê³„ì‚°
      const all=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
      const iA=all.findIndex(s=>s.s===stnA);
      const iB=all.findIndex(s=>s.s===stnB);
      let progress=0.5;
      if(iA>=0&&iB>=0){
        const depA=toMin(all[iA].dep||all[iA].arr);
        const arrB=toMin(all[iB].arr||all[iB].dep);
        if(depA!==null&&arrB!==null&&arrB>depA){
          let nM=tNow;
          if(depA>tNow+60)nM+=1440; // ìì • ë³´ì •
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

  // ì¶”ì  ëª¨ë“œ: ì¶”ì  ì—´ì°¨ + êµí–‰(ë°˜ëŒ€ ë°©í–¥ìœ¼ë¡œ ìŠ¤ì³ ê°ˆ) ì—´ì°¨ í‘œì‹œ / ì¼ë°˜ ëª¨ë“œ: ì „ì²´ í‘œì‹œ
  let displayTrains;
  if(_mapTrackedTrain){
    const trk=running.find(x=>x.t.no===_mapTrackedTrain);
    const pathSet=trk?new Set(trk.t.stops.map(s=>s.s)):null;
    displayTrains=running.filter(x=>{
      if(x.t.no===_mapTrackedTrain)return true;
      return !!(pathSet&&x.t.dir!==trk.t.dir&&pathSet.has(x.stnA)&&(!x.stnB||pathSet.has(x.stnB)));
    });
  } else displayTrains=running;

  // ì—´ì°¨ ë ˆì´ì–´ë¥¼ SVG ë¬¸ìì—´ë¡œ ìƒì„±
  // ì§€ë„ ìì²´ê°€ ë¨¼ì € ì½íˆë„ë¡ ê¸°ë³¸ ë§ˆì»¤ë¥¼ ì‘ê²Œ ìœ ì§€í•œë‹¤. ì„ íƒÂ·ì¶”ì  ì‹œì—ë§Œ í™•ëŒ€í•œë‹¤.
  const r=Math.max(3.5,Math.min(6,_mapSvgSize.w*0.008));
  const fs=Math.max(8,Math.min(11,_mapSvgSize.w*0.012));
  let layerHtml='<g id="train-layer">';
  displayTrains.forEach(({t,px,py,status,stnA,stnB,posA,posB})=>{
    const gradeColor=GRADE_COLORS[t.grade]||'#888';
    const color=_mapStatusColor?_mapCongColor(t):gradeColor;
    const isTracked=!!(_mapTrackedTrain&&t.no===_mapTrackedTrain);
    const isOncoming=!!(_mapTrackedTrain&&!isTracked); // êµí–‰ ì—´ì°¨: ì‘ê³  ì˜…ê²Œ
    const cr=isTracked?r*1.7:(isOncoming?r*0.75:r);

    if(isTracked){
      // ì™¸ë¶€ pulse ë§
      layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(cr+6).toFixed(1)}"
        fill="none" stroke="${color}" stroke-width="2.5" opacity="0.45" pointer-events="none"/>`;
      // ì§„í–‰ ë°©í–¥ í™”ì‚´í‘œ (ì´ë™ ì¤‘ì¸ ê²½ìš°)
      if(posA&&posB){
        const dx=posB.x-posA.x, dy=posB.y-posA.y;
        const ang=Math.atan2(dy,dx)*180/Math.PI;
        layerHtml+=`<text x="${px.toFixed(1)}" y="${py.toFixed(1)}"
          text-anchor="middle" dominant-baseline="central"
          font-size="${(cr*0.9).toFixed(1)}" fill="#fff" pointer-events="none"
          transform="rotate(${ang.toFixed(0)},${px.toFixed(1)},${py.toFixed(1)})">â–¶</text>`;
      }
      // í˜„ì¬ ìœ„ì¹˜ í…ìŠ¤íŠ¸ (ê°€ì¥ ìœ„)
      const posLabel=status.atStn?`${status.atStn} ì •ì°¨`
        :(status.prevStn&&status.nextStn?`${status.prevStn}â†’${status.nextStn}`:'ìš´í–‰ ì¤‘');
      layerHtml+=`<text x="${px.toFixed(1)}" y="${(py-cr-fs*1.5-4).toFixed(1)}"
        text-anchor="middle" font-size="${(fs*0.95).toFixed(1)}" fill="#fff"
        font-family="Noto Sans KR,sans-serif" font-weight="500"
        pointer-events="none" paint-order="stroke" stroke="#0d1117" stroke-width="3">${posLabel}</text>`;
    }

    layerHtml+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${cr.toFixed(1)}"
      fill="${color}" stroke="${isTracked?'#fff':'#0d1117'}" stroke-width="${isTracked?3:2}" ${isOncoming?'opacity="0.55"':''}
      style="cursor:pointer" class="train-dot${isTracked?' tracked-train':''}" data-no="${t.no}"/>`;
    layerHtml+=`<text class="train-label${isTracked?' tracked-train-label':''}" x="${px.toFixed(1)}" y="${(py-cr-3).toFixed(1)}"
      text-anchor="middle" font-size="${isTracked?(fs*1.15).toFixed(1):(isOncoming?(fs*0.85).toFixed(1):fs)}" fill="${color}" ${isOncoming?'opacity="0.6"':''}
      font-family="Noto Sans KR,sans-serif" font-weight="${isTracked?'800':'600'}"
      pointer-events="none" paint-order="stroke" stroke="${isTracked?'#0d1117':'none'}" stroke-width="2">${isOncoming?'â‡„ ':''}${t.no}</text>`;
  });
  layerHtml+='</g>';

  // ê¸°ë³¸ ì‚½ì… ìœ„ì¹˜ëŠ” ì—­ íˆíŠ¸ ì˜ì—­ ì•„ë˜. ìµœì¢… ìš°ì„ ìˆœìœ„ëŠ” ì•„ë˜ì—ì„œ ëª…ì‹œì ìœ¼ë¡œ
  // ì¬ë°°ì¹˜í•˜ê³  pointer-eventsë„ í•¨ê»˜ ì „í™˜í•œë‹¤.
  const tempDiv=document.createElement('div');
  tempDiv.innerHTML=`<svg>${layerHtml}</svg>`;
  const newLayer=tempDiv.querySelector('g');
  if(newLayer){
    // ì²« ë²ˆì§¸ circle(ì—­ íˆíŠ¸ ì˜ì—­) ì•ì— ì‚½ì…
    const firstHit=svgEl.querySelector('.map-station-hit');
    if(firstHit) svgEl.insertBefore(newLayer, firstHit);
    else svgEl.appendChild(newLayer);
  }

  // í´ë¦­ ì´ë²¤íŠ¸ ë“±ë¡
  svgEl.querySelectorAll('.train-dot').forEach(dot=>{
    const no=dot.getAttribute('data-no');
    const entry=displayTrains.find(r=>r.t.no===no);
    if(entry) dot.addEventListener('click',()=>openMapTrainPopup(entry.t, entry.status));
  });
  // ë ˆì´ì–´ ëª¨ë“œì— ë”°ë¼ ì—­/ì—´ì°¨ ìš°ì„ ìˆœìœ„ ê²°ì •
  if(_mapLayerMode==='station'){
    // ì—­ ìš°ì„ : ì—­ íˆíŠ¸ ì˜ì—­ì„ ë§¨ ìœ„ë¡œ
    const hitCircles=[...svgEl.querySelectorAll('.map-station-hit')];
    hitCircles.forEach(c=>{c.style.pointerEvents='all';svgEl.appendChild(c);});
  } else {
    // ì—´ì°¨ ìš°ì„ : ì—´ì°¨ ë ˆì´ì–´ë§Œ ë§¨ ìœ„ë¡œ ì˜®ê¸´ë‹¤. ì—­ í´ë¦­ ì˜ì—­ì€ ìœ ì§€í•˜ì—¬
    // ì—´ì°¨ì™€ ê²¹ì¹˜ì§€ ì•Šì€ ì—­ì€ ì–´ëŠ ëª¨ë“œì—ì„œë„ ê³„ì† ì„ íƒí•  ìˆ˜ ìˆê²Œ í•œë‹¤.
    svgEl.querySelectorAll('.map-station-hit').forEach(c=>{c.style.pointerEvents='all';});
    const trainLayer=svgEl.querySelector('#train-layer');
    if(trainLayer){trainLayer.style.pointerEvents='all';svgEl.appendChild(trainLayer);}
  }

  // ìš´í–‰ ì—´ì°¨ ìˆ˜ / ì¶”ì  ìƒíƒœ ì—…ë°ì´íŠ¸
  const countEl=document.getElementById('map-train-count');
  if(countEl){
    countEl.textContent = _mapTrackedTrain
      ? `${_mapTrackedTrain} ì¶”ì  ì¤‘`
      : `ìš´í–‰ ì¤‘ ${running.length}í¸`;
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
  let posText='ìš´í–‰ ì¤‘';
  if(status.atStn)posText=`${status.atStn}ì—­ ì •ì°¨ ì¤‘`;
  else if(status.passStn)posText=`${status.passStn}ì—­ í†µê³¼ ì¤‘`;
  else if(status.prevStn&&status.nextStn)posText=`${status.prevStn} â†’ ${status.nextStn}`;
  const color=GRADE_COLORS[t.grade]||'#888';
  document.getElementById('map-popup-name').innerHTML=
    `<span style="color:${color}">${t.grade} ${t.no}</span>`;
  document.getElementById('map-popup-sub').textContent=
    `${originStn}(${depTime}) â†’ ${terminusStn}(${arrTime})`;
  document.getElementById('map-popup-trains').innerHTML=
    `<div>í˜„ì¬ìœ„ì¹˜: <b>${posText}</b></div>
     <div style="margin-top:4px">${t.line} Â· ${t.dest}í–‰</div>
     <button class="btn" style="width:100%;margin-top:10px;font-size:12px" onclick="event.stopPropagation();closeMapPopup();jumpToTrain('${t.no}')">ì—´ì°¨ ì¡°íšŒë¡œ ì´ë™</button>`;
  // ì£¼ ë²„íŠ¼ = íƒ‘ìŠ¹ ì—¬ì •
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){
    popupBtn.textContent='íƒ‘ìŠ¹ ì—¬ì •';
    popupBtn.onclick=(e)=>{e.preventDefault();closeMapPopup();openJourney(t.no);};
  }
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}

// ì—­ í´ë¦­ íŒì—… (ì—­ ì •ë³´ë¡œ ë„˜ì–´ê°€ê¸° ì „ ë¨¼ì € í‘œì‹œ)
function openMapPopup(stn, lineName){
  _mapCurrentStn=stn;
  const dataStn=railStationDataName(stn);
  const trains=getRailTrainsByStation(dataStn).filter(t=>t.stops.some(s=>railStationDataName(s.s)===dataStn&&(s.dep||s.arr)));
  const lineSet=[...new Set(trains.flatMap(t=>t.line.split('Â·')))];
  const gcc={}; trains.forEach(t=>{gcc[t.grade]=(gcc[t.grade]||0)+1;});
  const gradeStr=Object.entries(gcc).sort((a,b)=>b[1]-a[1]).map(([g,n])=>`${g} ${n}í¸`).join(' Â· ')||'ê²½ìœ  ì—´ì°¨ ì—†ìŒ';
  document.getElementById('map-popup-name').innerHTML=`<span>${stn}</span>`;
  if(_appMode==='metro'){
    // ì „ì²  ë…¸ì„ ë„: í™˜ìŠ¹ ì „ì²  ë…¸ì„  + ê¸°ì°¨ í™˜ìŠ¹ ì•ˆë‚´
    const xf=_metroXferLines(stn, _metroMapId);
    const chips=xf.map(l=>`<span onclick="closeMapPopup();showMetroMap('${l.id}')" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9px;background:var(--bg3);border:1px solid ${l.color};font-size:11px;font-weight:700;color:var(--text1)"><span style="width:8px;height:8px;border-radius:50%;background:${l.color};flex-shrink:0"></span>${l.name}</span>`).join('');
    const trainNote=trains.length?`<div style="margin-top:6px">ê¸°ì°¨ í™˜ìŠ¹ Â· ${gradeStr}</div>`:'';
    document.getElementById('map-popup-sub').textContent=(lineName?lineName+' Â· ':'')+(xf.length?`í™˜ìŠ¹ ${xf.length}ê°œ ë…¸ì„ `:'í™˜ìŠ¹ ë…¸ì„  ì—†ìŒ');
    document.getElementById('map-popup-trains').innerHTML=
      (xf.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div>`:'')+trainNote+
      `<div class="map-route-point-actions"><button onclick="event.stopPropagation();setMapStationAsRoutePoint('from','${_opsEsc(stn)}')">ì¶œë°œì§€ë¡œ ì„¤ì •</button><button onclick="event.stopPropagation();setMapStationAsRoutePoint('via','${_opsEsc(stn)}')">ê²½ìœ ì§€ë¡œ ì„¤ì •</button><button onclick="event.stopPropagation();setMapStationAsRoutePoint('to','${_opsEsc(stn)}')">ë„ì°©ì§€ë¡œ ì„¤ì •</button></div>`;
  } else {
    document.getElementById('map-popup-sub').textContent=(lineName?lineName+' Â· ':'')+`${trains.length}í¸ ê²½ìœ `;
    document.getElementById('map-popup-trains').innerHTML=
      `<div>${lineSet.slice(0,4).join(' Â· ')}${lineSet.length>4?' ì™¸':''}</div>
       <div style="margin-top:4px">${gradeStr}</div>`;
  }
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){ popupBtn.textContent='ì—­ ì •ë³´ ë³´ê¸°'; popupBtn.onclick=(e)=>{if(e)e.preventDefault();goToMapStation();}; }
  document.getElementById('map-popup').style.display='block';
  document.getElementById('map-backdrop').style.display='block';
}
// íŒì—… â†’ ì—­ ì •ë³´ íƒ­ìœ¼ë¡œ ì´ë™
function goToMapStation(){
  const s=_mapCurrentStn;
  closeMapPopup();
  if(s) openStationDetail(s);
}

// ì—­ íŒì—… ë‹«í ë•Œ ë²„íŠ¼ ì›ìƒë³µêµ¬
function closeMapPopup(){
  document.getElementById('map-popup').style.display='none';
  document.getElementById('map-backdrop').style.display='none';
  // ë²„íŠ¼ ì›ë˜ëŒ€ë¡œ ë³µêµ¬ (ì—­ ì‹œê°„í‘œ ë³´ê¸°)
  const popupBtn=document.querySelector('#map-popup .btn.btn-primary');
  if(popupBtn){
    popupBtn.textContent='ì‹œê°„í‘œ ë³´ê¸°';
    popupBtn.onclick=()=>goToMapStation();
  }
  _mapCurrentStn=null;
}

let _mapStationListState={query:'',route:'all',dir:'forward',page:0};
let _mapStationListKeyHandler=null;

function _mapStationListSource(){
  if(_appMode==='metro'&&typeof METRO_LINES!=='undefined'){
    let lines=[];
    if(_metroMapId==='__pick__')lines=METRO_LINES.filter(line=>_metroPickSet.has(line.id));
    else if(_metroMapId==='__all__')lines=METRO_LINES.filter(line=>line.region===_metroMapRegion);
    else lines=METRO_LINES.filter(line=>line.id===_metroMapId);
    return{title:lines.length===1?lines[0].name:`${_metroMapRegion||'ì „ì² '} ê¶Œì—­`,color:lines[0]?.color||'#388bfd',lines:lines.map(line=>({key:line.id,name:line.name,color:line.color,routes:(line.routes||[{stations:line.stations||[]}]).map(route=>({stations:route.stations||[]}))}))};
  }
  const entries=_mapCurrentLine&&_mapCurrentLine!=='all'&&MAP_LINES[_mapCurrentLine]
    ?[[_mapCurrentLine,MAP_LINES[_mapCurrentLine]]]:Object.entries(MAP_LINES||{});
  return{title:entries.length===1?entries[0][1].name:'ì „ì²´ ë„¤íŠ¸ì›Œí¬',color:entries[0]?.[1]?.color||'#388bfd',lines:entries.map(([key,line])=>({key,name:line.name,color:line.color,routes:(line.routes||[]).map(route=>({stations:(route.stations||[]).map(station=>typeof station==='string'?station:station.n)}))}))};
}

function _mapStationGeo(name){return (typeof STATION_DB!=='undefined'&&(STATION_DB[name]||STATION_DB[name+'ì—­']))||null;}
function _mapStationAffiliations(name){
  const lines=_appMode==='metro'&&typeof METRO_LINES!=='undefined'
    ?METRO_LINES.map(line=>({name:line.name,color:line.color,routes:line.routes||[{stations:line.stations||[]}]}))
    :Object.values(MAP_LINES||{});
  return lines.filter(line=>(line.routes||[]).some(route=>(route.stations||[]).some(station=>(typeof station==='string'?station:station.n)===name))).map(line=>({name:line.name,color:line.color||'#388bfd'}));
}
function _mapStationListModel(){
  const source=_mapStationListSource(),routeOptions=[],rowByName=new Map();let rows=[];
  source.lines.forEach((line,lineIndex)=>(line.routes||[]).forEach((route,routeIndex)=>{
    const token=`${lineIndex}:${routeIndex}`,label=source.lines.length===1?(routeIndex===0?'ë³¸ì„ ':`ì§€ì„  ${routeIndex}`):`${line.name}${routeIndex?` Â· ì§€ì„  ${routeIndex}`:''}`;
    routeOptions.push({token,label});
    if(_mapStationListState.route!=='all'&&_mapStationListState.route!==token)return;
    (route.stations||[]).forEach(name=>{
      let row=rowByName.get(name);
      if(!row){row={name,lineName:line.name,lineColor:line.color,routeToken:token,routeLabels:[]};rowByName.set(name,row);rows.push(row);}
      if(!row.routeLabels.includes(label))row.routeLabels.push(label);
    });
  }));
  const directionApplies=routeOptions.length===1||_mapStationListState.route!=='all';
  if(_mapStationListState.dir==='reverse'&&directionApplies)rows.reverse();
  const total=rows.length,query=_mapStationListState.query.trim();if(query)rows=rows.filter(row=>typeof matchesQuery==='function'?matchesQuery(row.name,query):row.name.includes(query));
  rows=rows.map((row,index)=>{const db=_mapStationGeo(row.name);return{...row,index:index+1,platforms:(db?.platforms||[]).join(' Â· ')||'â€”',lines:_mapStationAffiliations(row.name)};});
  return{source,routeOptions,rows,total};
}
function _mapStationEsc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function _renderMapStationList(){
  const host=document.getElementById('map-station-list-wrap');if(!host)return;
  const {source,routeOptions,rows,total}=_mapStationListModel(),visible=rows;
  host.innerHTML=`<div class="map-station-list-backdrop" onclick="closeCurrentLineStationList()"></div><section class="map-station-list" role="dialog" aria-modal="true" aria-labelledby="map-station-list-title" style="--map-list-color:${source.color}">
    <header><span class="map-station-list-icon"><svg aria-hidden="true"><use href="#i-station"/></svg></span><div><div><h2 id="map-station-list-title">ì—­ ëª©ë¡</h2><span class="map-station-list-line">${_mapStationEsc(source.title)}</span></div><p>${_mapStationListState.query.trim()?`${rows.length.toLocaleString()}ê°œ ê²€ìƒ‰ ê²°ê³¼ Â· ì „ì²´ ${total.toLocaleString()}ê°œ ì—­`:`ì´ ${total.toLocaleString()}ê°œ ì—­`}</p></div><button class="map-station-list-close" onclick="closeCurrentLineStationList()" aria-label="ì—­ ëª©ë¡ ë‹«ê¸°">Ã—</button></header>
    <div class="map-station-list-tools"><label><svg aria-hidden="true"><use href="#i-search"/></svg><input type="search" value="${_mapStationEsc(_mapStationListState.query)}" placeholder="ì—­ëª… ê²€ìƒ‰ (ì´ˆì„± ê²€ìƒ‰ ì§€ì›)" oninput="setMapStationListQuery(this.value)"></label><select aria-label="êµ¬ê°„ ì„ íƒ" onchange="setMapStationListRoute(this.value)"><option value="all">ì „ì²´ ì—­</option>${routeOptions.map(option=>`<option value="${option.token}"${_mapStationListState.route===option.token?' selected':''}>${_mapStationEsc(option.label)}</option>`).join('')}</select><select aria-label="ë°©í–¥ ì„ íƒ"${routeOptions.length>1&&_mapStationListState.route==='all'?' disabled':''} onchange="setMapStationListDirection(this.value)"><option value="forward"${_mapStationListState.dir==='forward'?' selected':''}>í•˜í–‰ ê¸°ì¤€</option><option value="reverse"${_mapStationListState.dir==='reverse'?' selected':''}>ìƒí–‰ ê¸°ì¤€</option></select></div>
    <div class="map-station-list-table"><div class="map-station-list-head"><span></span><span>ì—­ëª…</span><span>ìŠ¹ê°•ì¥</span><span>ê²½ë¡œ</span><span>ë…¸ì„ </span><span></span></div>${visible.map(row=>`<button class="map-station-list-row" data-station="${_mapStationEsc(row.name)}" onclick="focusMapStationFromList(this.dataset.station)"><span class="map-station-order"><b>${String(row.index).padStart(2,'0')}</b><i></i></span><strong>${_mapStationEsc(row.name)}</strong><code>${_mapStationEsc(row.platforms)}</code><span class="map-station-list-routes">${row.routeLabels.map(label=>_mapStationEsc(label)).join(' Â· ')}</span><span class="map-station-list-badges">${row.lines.slice(0,3).map(line=>`<i style="--badge-color:${line.color}">${_mapStationEsc(line.name.replace(/ì„ $/,''))}</i>`).join('')}${row.lines.length>3?`<small>+${row.lines.length-3}</small>`:''}</span><span class="map-station-list-arrow" aria-hidden="true">â€º</span></button>`).join('')||'<div class="map-station-list-empty">ê²€ìƒ‰ ì¡°ê±´ì— ë§ëŠ” ì—­ì´ ì—†ìŠµë‹ˆë‹¤.</div>'}</div>
    <div class="map-station-list-summary">${_mapStationListState.query.trim()?`ê²€ìƒ‰ ê²°ê³¼ ${rows.length.toLocaleString()}ê°œ Â· ì„ íƒ ê²½ë¡œì˜ ì—­ ${total.toLocaleString()}ê°œ`:`${total.toLocaleString()}ê°œ ì—­ í‘œì‹œ`}</div>
    <footer><button onclick="downloadCurrentLineStationList()"><svg aria-hidden="true"><use href="#i-download"/></svg> ëª©ë¡ ë‹¤ìš´ë¡œë“œ (CSV)</button><button class="primary" onclick="centerCurrentMapFromStationList()"><svg aria-hidden="true"><use href="#i-target"/></svg> ì§€ë„ì˜ ì¤‘ì‹¬ìœ¼ë¡œ ì´ë™</button></footer>
  </section>`;
}
function openCurrentLineStationList(){
  _mapStationListState={query:'',route:'all',dir:'forward',page:0};
  const filterPanel=document.getElementById('map-filter-panel');if(filterPanel)filterPanel.style.display='none';
  document.getElementById('map-filter-toggle-btn')?.classList.remove('map-filter-toggle-active');const arrow=document.getElementById('map-filter-arrow');if(arrow)arrow.textContent='â–¾';
  let host=document.getElementById('map-station-list-wrap');if(!host){host=document.createElement('div');host.id='map-station-list-wrap';document.body.appendChild(host);}
  _renderMapStationList();document.body.classList.add('map-station-list-open');
  if(_mapStationListKeyHandler)document.removeEventListener('keydown',_mapStationListKeyHandler);_mapStationListKeyHandler=event=>{if(event.key==='Escape')closeCurrentLineStationList();};document.addEventListener('keydown',_mapStationListKeyHandler);
  requestAnimationFrame(()=>document.querySelector('.map-station-list-close')?.focus());
}
function closeCurrentLineStationList(){document.getElementById('map-station-list-wrap')?.remove();document.body.classList.remove('map-station-list-open');if(_mapStationListKeyHandler)document.removeEventListener('keydown',_mapStationListKeyHandler);_mapStationListKeyHandler=null;}
function setMapStationListQuery(value){_mapStationListState.query=value;_mapStationListState.page=0;_renderMapStationList();const input=document.querySelector('.map-station-list-tools input');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}}
function setMapStationListRoute(value){_mapStationListState.route=value;_mapStationListState.page=0;_renderMapStationList();}
function setMapStationListDirection(value){_mapStationListState.dir=value;_mapStationListState.page=0;_renderMapStationList();}
function setMapStationListPage(page){_mapStationListState.page=Math.max(0,page);_renderMapStationList();document.querySelector('.map-station-list-table')?.scrollTo({top:0});}
function focusMapStationFromList(name){const wrap=document.getElementById('map-svg-wrap'),pos=_mapStnPos[name];closeCurrentLineStationList();if(wrap&&pos){const {ox,oy}=_mapSvgSize;wrap.scrollTo({left:pos.x-ox-wrap.clientWidth/2,top:pos.y-oy-wrap.clientHeight/2,behavior:'smooth'});}}
function centerCurrentMapFromStationList(){closeCurrentLineStationList();mapZoomReset();const wrap=document.getElementById('map-svg-wrap');if(wrap)wrap.scrollTo({left:Math.max(0,(wrap.scrollWidth-wrap.clientWidth)/2),top:Math.max(0,(wrap.scrollHeight-wrap.clientHeight)/2),behavior:'smooth'});}
function downloadCurrentLineStationList(){const {source,rows}=_mapStationListModel(),csv=['ìˆœë²ˆ,ì—­ëª…,ìŠ¹ê°•ì¥,ê²½ë¡œ,ë…¸ì„ ',...rows.map(row=>[row.index,row.name,row.platforms,row.routeLabels.join(' / '),row.lines.map(line=>line.name).join(' / ')].map(value=>`"${String(value).replace(/"/g,'""')}"`).join(','))].join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${source.title}-ì—­ëª©ë¡.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}

// 60ì´ˆë§ˆë‹¤ ì—´ì°¨ ìœ„ì¹˜ ê°±ì‹ 
setInterval(()=>{
  if(_mapCurrentLine&&document.getElementById('panel-map').classList.contains('active')){
    updateMapTrains();
  }
},3500);

const MAP_LINES = {
gyeongbu:{
  name:'ê²½ë¶€ì„ ', color:'#e3b341',
  routes:[
    {color:'#e3b341', stations:[
    {n:'ì„œìš¸',x:198,y:124},
    {n:'í•œê°•ë¡œ',x:196,y:131},
    {n:'ë‚¨ì•ˆì–‘',x:190,y:176},
    {n:'ìˆ˜ì›',x:204,y:208},
    {n:'ì˜¤ì‚°',x:220,y:243},
    {n:'í‰íƒ',x:225,y:289},
    {n:'ì²œì•ˆ',x:239,y:342},
    {n:'ëª©ì²œ',x:258,y:352},
    {n:'ë³‘ì²œ',x:277,y:356},
    {n:'ë¶ì²­ì£¼',x:303,y:373},
    {n:'ì„œì²­ì£¼',x:318,y:389},
    {n:'ìƒë‹¹',x:321,y:400},
    {n:'ë¬¸ì˜',x:321,y:426},
    {n:'ì‹ íƒ„ì§„',x:305,y:448},
    {n:'íšŒë•',x:305,y:465},
    {n:'ëŒ€ì „',x:307,y:482},
    {n:'íŒì•”',x:312,y:487},
    {n:'ì„¸ì²œ',x:320,y:480},
    {n:'ì˜¥ì²œ',x:339,y:495},
    {n:'ì´ì›',x:353,y:507},
    {n:'ì‹¬ì²œ',x:372,y:517},
    {n:'ì˜ë™',x:389,y:528},
    {n:'í™©ê°„',x:420,y:514},
    {n:'ì¶”í’ë ¹',x:439,y:517},
    {n:'ë´‰ì‚°',x:446,y:533},
    {n:'ê¹€ì²œ',x:470,y:542},
    {n:'êµ¬ë¯¸',x:522,y:542},
    {n:'ì•½ëª©',x:526,y:568},
    {n:'ì„œì™œê´€',x:532,y:582},
    {n:'í•˜ë¹ˆ',x:539,y:611},
    {n:'í˜¸ë¦¼',x:553,y:627},
    {n:'ë‚¨ëŒ€êµ¬',x:567,y:635},
    {n:'ê²½ì‚°',x:616,y:636},
    {n:'ìš´ë¬¸',x:656,y:663},
    {n:'ì–¸ì–‘',x:705,y:707},
    {n:'ë™ì–‘ì‚°',x:715,y:752},
    {n:'ë¶ë¶€ì‚°',x:699,y:792},
    {n:'ë™ë˜',x:695,y:811},
    {n:'ë¶€ì‚°',x:687,y:837}
    ]}
  ]
},

daegu:{
  name:'ëŒ€êµ¬ì„ ', color:'#d97706',
  routes:[
    {color:'#d97706', stations:[
    {n:'ê²½ì‚°',x:616,y:636},
    {n:'ê±´ì²œ',x:701,y:622},
    {n:'ì•ˆê°•',x:731,y:582}
    ]}
  ]
},

gyeongbuhs:{
  name:'ê²½ë¶€ê³ ì†ì„ ', color:'#388bfd',
  routes:[
    {color:'#388bfd', stations:[
    {n:'ì„œìš¸',x:198,y:124},
    {n:'í•œê°•ë¡œ',x:196,y:131},
    {n:'ë³‘ëª©ì•ˆ',x:181,y:177},
    {n:'ìˆ˜ì˜',x:194,y:217},
    {n:'ì²œì•ˆ',x:239,y:342},
    {n:'ì •ì•ˆ',x:231,y:403},
    {n:'ì„¸ì¢…',x:266,y:430},
    {n:'ëŒ€ì „',x:307,y:482},
    {n:'ì‚°ë‚´',x:315,y:497},
    {n:'ì˜ë™',x:389,y:528},
    {n:'êµ¬ë¯¸',x:522,y:542},
    {n:'ë‚¨ëŒ€êµ¬',x:567,y:635},
    {n:'ì²­ë„',x:615,y:683},
    {n:'ë¶€ì‚°',x:687,y:837}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'ì ì‹¤',x:228,y:136},
    {n:'ìˆ˜ì§„',x:235,y:159},
    {n:'ë™íƒ„',x:225,y:230},
    {n:'ì²œì•ˆ',x:239,y:342}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'ì„œì¸ì²œ',x:114,y:147},
    {n:'ì—°ìˆ˜',x:129,y:168},
    {n:'ì•ˆì‚°',x:154,y:190},
    {n:'ì›í‰',x:187,y:214},
    {n:'ì²œì•ˆ',x:239,y:342}
    ]},
    {color:'#388bfd', stations:[
    {n:'ì²­ë„',x:615,y:683},
    {n:'ì°½ë…•',x:558,y:713}
    ]},
    {color:'#388bfd', dash:true, stations:[
    {n:'ë§ˆí¬',x:187,y:140},
    {n:'ì„œìš¸',x:198,y:124}
    ]}
  ]
},

honamhs:{
  name:'í˜¸ë‚¨ê³ ì†ì„ ', color:'#26a69a',
  routes:[
    {color:'#26a69a', stations:[
    {n:'ì²œì•ˆ',x:239,y:342},
    {n:'ì •ì•ˆ',x:231,y:403},
    {n:'ê³µì£¼',x:222,y:480},
    {n:'ì „ì£¼',x:231,y:631},
    {n:'ì •ì',x:167,y:704},
    {n:'ê´‘ì£¼',x:155,y:831}
    ]}
  ]
},

honam:{
  name:'í˜¸ë‚¨ì„ ', color:'#3fb950',
  routes:[
    {color:'#3fb950', stations:[
    {n:'íšŒë•',x:305,y:465},
    {n:'ì„œëŒ€ì „',x:300,y:485},
    {n:'ë‚¨ëŒ€ì „',x:294,y:493},
    {n:'ê³„ë£¡',x:267,y:499},
    {n:'ë…¼ì‚°',x:224,y:518},
    {n:'ì—°ë¬´',x:227,y:542},
    {n:'ì—¬ì‚°',x:224,y:563},
    {n:'ë´‰ë™',x:231,y:595},
    {n:'ì „ì£¼',x:231,y:631},
    {n:'ì¤‘ì¸',x:227,y:646},
    {n:'ë‚¨ê¹€ì œ',x:204,y:661},
    {n:'ì‹ íƒœì¸',x:177,y:669},
    {n:'ì •ì',x:167,y:704},
    {n:'ì…ì•”',x:157,y:724},
    {n:'ë¶ì´',x:158,y:748},
    {n:'ì¥ì„±',x:157,y:790},
    {n:'ê´‘ì£¼',x:155,y:831},
    {n:'ë‚˜ì‚°',x:111,y:839},
    {n:'í•¨í‰',x:90,y:853},
    {n:'ë¬´ì•ˆ',x:79,y:877},
    {n:'ë„ë¦¼',x:70,y:899},
    {n:'ëª©í¬',x:60,y:932}
    ]}
  ]
},

jeolla:{
  name:'ì „ë¼ì„ ', color:'#ec4899',
  routes:[
    {color:'#ec4899', stations:[
    {n:'ì „ì£¼',x:231,y:631},
    {n:'ìš´ì•”',x:243,y:679},
    {n:'ì„ì‹¤',x:269,y:693},
    {n:'ì˜¤ìˆ˜',x:283,y:714},
    {n:'ë‚¨ì›',x:292,y:754},
    {n:'êµ¬ë¡€',x:314,y:811},
    {n:'í™©ì „',x:312,y:835},
    {n:'ë¶ìˆœì²œ',x:319,y:877},
    {n:'ìˆœì²œ',x:323,y:888},
    {n:'ìœ¨ì´Œ',x:339,y:907},
    {n:'ì—¬ìˆ˜ê³µí•­',x:349,y:919},
    {n:'ì—¬ì²œ',x:361,y:936},
    {n:'ì—¬ìˆ˜',x:381,y:944}
    ]}
  ]
},

jungang:{
  name:'ì¤‘ì•™ì„ ', color:'#56d0e0',
  routes:[
    {color:'#56d0e0', stations:[
    {n:'ì²­ëŸ‰ë¦¬',x:216,y:117},
    {n:'ì¤‘ë‘',x:224,y:112},
    {n:'ë„ë†',x:243,y:108},
    {n:'ë•ì†Œ',x:254,y:116},
    {n:'ì–‘ìˆ˜',x:280,y:128},
    {n:'ì–‘í‰',x:319,y:143},
    {n:'ì§€ì •',x:411,y:177},
    {n:'ì›ì£¼',x:427,y:182},
    {n:'ì‹ ë¦¼',x:459,y:219},
    {n:'ì œì²œ',x:488,y:249},
    {n:'ë§¤í¬',x:511,y:277},
    {n:'ë‹¨ì–‘',x:522,y:294},
    {n:'í’ê¸°',x:566,y:322},
    {n:'ì˜ì£¼',x:588,y:342},
    {n:'ë¬¸ìˆ˜',x:590,y:353},
    {n:'ì˜¹ì²œ',x:605,y:380},
    {n:'ì•ˆë™',x:611,y:415},
    {n:'ì˜ì„±',x:604,y:477},
    {n:'ê¸ˆì„±',x:600,y:503},
    {n:'ì´í™”',x:601,y:522},
    {n:'í™”ë³¸',x:605,y:546},
    {n:'ì‹ ë…•',x:628,y:565},
    {n:'ì˜ì²œ',x:657,y:590},
    {n:'ê±´ì²œ',x:701,y:622}
    ]},
    {color:'#56d0e0', dash:true, stations:[
    {n:'ê±´ì²œ',x:701,y:622},
    {n:'ê²½ì£¼',x:732,y:627}
    ]},
    {color:'#56d0e0', dash:true, stations:[
    {n:'ì‹ ë…•',x:628,y:565},
    {n:'í•˜ì–‘',x:635,y:606},
    {n:'ê²½ì‚°',x:616,y:636},
    {n:'ë‚¨ëŒ€êµ¬',x:567,y:635}
    ]}
  ]
},

chungbuk:{
  name:'ì¶©ë¶ì„ ', color:'#e0873a',
  routes:[
    {color:'#e0873a', stations:[
    {n:'ì„œì²­ì£¼',x:318,y:389},
    {n:'ë‚´ìˆ˜',x:334,y:365},
    {n:'ì¦í‰',x:344,y:352},
    {n:'ê´´ì‚°',x:392,y:342},
    {n:'ëª©ë„',x:407,y:325},
    {n:'ì¶©ì£¼',x:419,y:294},
    {n:'ì œì²œ',x:488,y:249}
    ]}
  ]
},

janghang:{
  name:'ì¥í•­ì„ ', color:'#9d7ad4',
  routes:[
    {color:'#9d7ad4', stations:[
    {n:'ì²œì•ˆ',x:239,y:342},
    {n:'ì•„ì‚°',x:212,y:357},
    {n:'ì˜ˆì‚°',x:168,y:384},
    {n:'í™ë¶',x:136,y:396},
    {n:'í™ì„±',x:129,y:409},
    {n:'ê´‘ì²œ',x:121,y:438},
    {n:'ì²­ì†Œ',x:113,y:453},
    {n:'ì£¼í¬',x:108,y:466},
    {n:'ë³´ë ¹',x:113,y:484},
    {n:'ì„œì²œ',x:134,y:556},
    {n:'êµ°ì‚°',x:142,y:584},
    {n:'ëŒ€ì•¼',x:161,y:595},
    {n:'ìµì‚°',x:195,y:599},
    {n:'ì‚¼ë¡€',x:223,y:602},
    {n:'ì „ì£¼',x:231,y:631}
    ]},
    {color:'#9d7ad4', dash:true, stations:[
    {n:'ì‚¼ë¡€',x:223,y:602},
    {n:'ë´‰ë™',x:231,y:595}
    ]}
  ]
},

donghae:{
  name:'ë™í•´ì„ ', color:'#3fb994', noSpread:true,
  routes:[
    {color:'#3fb994', stations:[
    {n:'ê°„ì„±',x:553,y:-117},
    {n:'ì†ì´ˆ',x:576,y:-63},
    {n:'ì–‘ì–‘',x:589,y:-29},
    {n:'ì£¼ë¬¸',x:635,y:26},
    {n:'ê°•ë¦‰',x:653,y:62},
    {n:'ë™ê°•ë¦‰',x:666,y:74},
    {n:'ì˜¥ê³„',x:688,y:104},
    {n:'ë™í•´',x:705,y:134},
    {n:'ë¶í‰',x:706,y:148},
    {n:'ì‚¼ì²™',x:714,y:156},
    {n:'ê·¼ë•',x:733,y:188},
    {n:'ì›ë•',x:755,y:236},
    {n:'ë¶€êµ¬',x:765,y:257},
    {n:'ìš¸ì§„',x:770,y:288},
    {n:'í‰í•´',x:780,y:366},
    {n:'ì˜í•´',x:772,y:422},
    {n:'ì˜ë•',x:765,y:460},
    {n:'ê°•êµ¬',x:766,y:475},
    {n:'ì²­í•˜',x:757,y:522},
    {n:'í¬í•­',x:757,y:547},
    {n:'ì•ˆê°•',x:731,y:582},
    {n:'ê²½ì£¼',x:732,y:627},
    {n:'ë¶ˆêµ­ì‚¬',x:747,y:645},
    {n:'ì…ì‹¤',x:752,y:663},
    {n:'ë¶ìš¸ì‚°',x:759,y:689},
    {n:'íƒœí™”ê°•',x:760,y:714},
    {n:'ìš¸ì£¼',x:741,y:750},
    {n:'ì¢Œì²œ',x:733,y:780},
    {n:'ê¸°ì¥',x:728,y:801},
    {n:'ì†¡ì •(ë¶€ì‚°)',x:719,y:814},
    {n:'í•´ìš´ëŒ€',x:711,y:824},
    {n:'ë¶€ì‚°',x:687,y:837}
    ]},
  ]
},

yeongdong:{
  name:'ì˜ë™ì„ ', color:'#eab308',
  routes:[
    {color:'#eab308', stations:[
    {n:'íƒœë°±í™©ì§€',x:673,y:233},
    {n:'í™©ì§€',x:673,y:235},
    {n:'êµ¬ë¬¸ì†Œ',x:682,y:257},
    {n:'ì„í¬',x:691,y:273},
    {n:'ìŠ¹ë¶€',x:695,y:283},
    {n:'ì†Œì²œ',x:677,y:304},
    {n:'ì¶˜ì–‘',x:656,y:306},
    {n:'ë²•ì „',x:647,y:312},
    {n:'ë´‰í™”',x:612,y:318},
    {n:'ì˜ì£¼',x:588,y:342}
    ]}
  ]
},

gangreung:{
  name:'ê°•ë¦‰ì„ ', color:'#a855f7',
  routes:[
    {color:'#a855f7', stations:[
    {n:'ì›ì£¼',x:427,y:182},
    {n:'ë‚¨íš¡ì„±',x:480,y:164},
    {n:'ë°©ë¦¼',x:514,y:155},
    {n:'í‰ì°½',x:549,y:142},
    {n:'ì§„ë¶€',x:573,y:100},
    {n:'ëŒ€ê´€ë ¹',x:606,y:87},
    {n:'ê°•ë¦‰',x:653,y:62}
    ]}
  ]
},

gyeongjeon:{
  name:'ê²½ì „ì„ ', color:'#ef4444',
  routes:[
    {color:'#ef4444', stations:[
    {n:'ë¶€ì‚°',x:687,y:837},
    {n:'ì¥ìœ ',x:632,y:820},
    {n:'ì°½ì›',x:599,y:809},
    {n:'ë‚´ì„œ',x:564,y:797},
    {n:'í•¨ì•ˆ',x:538,y:792},
    {n:'êµ°ë¶',x:523,y:792},
    {n:'ì§„ì£¼',x:466,y:820},
    {n:'íš¡ì²œ',x:396,y:840},
    {n:'í•˜ë™',x:382,y:852},
    {n:'ì§„ìƒ',x:375,y:866},
    {n:'ë‚¨ê´‘ì–‘',x:369,y:893},
    {n:'ìˆœì²œ',x:323,y:888},
    {n:'ë³„ëŸ‰',x:310,y:910},
    {n:'ë™ê°•',x:290,y:924},
    {n:'ì¡°ì„±',x:262,y:928},
    {n:'ë³´ì„±',x:224,y:938},
    {n:'ì¥í¥',x:187,y:948},
    {n:'ì‘ì²œ',x:150,y:958},
    {n:'ì˜ì•”',x:135,y:929},
    {n:'ì‹œì¢…',x:112,y:911},
    {n:'ì¼ë¡œ',x:85,y:915},
    {n:'ë‚¨ì•…',x:78,y:926},
    {n:'ëª©í¬',x:60,y:932}
    ]},
    {color:'#ef4444', dash:true, stations:[
    {n:'ì¡°ì„±',x:262,y:928},
    {n:'ì¶˜ì–‘(ì „ë‚¨)',x:197,y:903},
    {n:'ë¹›ê°€ëŒ',x:153,y:866},
    {n:'ê´‘ì£¼',x:155,y:831}
    ]},
    {color:'#ef4444', dash:true, stations:[
    {n:'í•¨í‰',x:90,y:853},
    {n:'ë‹¤ì‹œ',x:122,y:871},
    {n:'ì¶˜ì–‘(ì „ë‚¨)',x:197,y:903}
    ]}
  ]
},

jeju:{
  name:'ì œì£¼ì„ ', color:'#0d9488',
  routes:[
    {color:'#0d9488', stations:[
    {n:'ì¥í¥',x:187,y:948},
    {n:'ê°•ì§„',x:155,y:976},
    {n:'ì™„ë„',x:147,y:1072},
    {n:'ë…¸í™”',x:104,y:1107},
    {n:'ì¶”ì',x:44,y:1179},
    {n:'ì œì£¼',x:94,y:1310}
    ]},
    {color:'#0d9488', dash:true, stations:[
    {n:'ì‘ì²œ',x:150,y:958},
    {n:'ê°•ì§„',x:155,y:976}
    ]}
  ]
},

jungnaelyuk:{
  name:'ì¤‘ë¶€ë‚´ë¥™ì„ ', color:'#84cc16',
  routes:[
    {color:'#84cc16', stations:[
    {n:'ì˜¤ì‚°',x:220,y:243},
    {n:'ì£½ì‚°',x:304,y:264},
    {n:'ì¼ì£½',x:317,y:258},
    {n:'ì¥í˜¸ì›',x:354,y:253},
    {n:'ëˆì‚°',x:390,y:260},
    {n:'ì¶©ì£¼',x:419,y:294},
    {n:'ìˆ˜ì•ˆë³´',x:438,y:332},
    {n:'ë¶ë¬¸ê²½',x:466,y:365},
    {n:'ë¬¸ê²½',x:486,y:406},
    {n:'ìƒì£¼',x:482,y:457},
    {n:'ì²­ë¦¬',x:471,y:481},
    {n:'ê¹€ì²œ',x:470,y:542}
    ]},
    {color:'#84cc16', dash:true, stations:[
    {n:'ìˆ˜ì˜',x:194,y:217},
    {n:'ì¥í˜¸ì›',x:354,y:253}
    ]},
    {color:'#84cc16', dash:true, stations:[
    {n:'ìƒì£¼',x:482,y:457},
    {n:'êµ¬ë¯¸',x:522,y:542}
    ]}
  ]
},

nambunaelyuk:{
  name:'ë‚¨ë¶€ë‚´ë¥™ì„ ', color:'#f97316',
  routes:[
    {color:'#f97316', stations:[
    {n:'ì•½ëª©',x:526,y:568},
    {n:'ì„±ì£¼',x:507,y:601},
    {n:'ìš´ìˆ˜',x:504,y:640},
    {n:'ê³ ë ¹',x:505,y:657},
    {n:'ìŒë¦¼',x:500,y:674},
    {n:'í•©ì²œ',x:482,y:706},
    {n:'ëŒ€ì–‘',x:481,y:721},
    {n:'ìŒë°±',x:475,y:743},
    {n:'ì‚¼ê°€',x:470,y:752},
    {n:'ë‹¨ì„±',x:433,y:782},
    {n:'ì‚¬ì²œ',x:462,y:849},
    {n:'ê³ ì„±(ê²½ë‚¨)',x:518,y:879},
    {n:'ì•ˆì •',x:537,y:888},
    {n:'í†µì˜',x:540,y:910},
    {n:'ì‚¬ë“±',x:555,y:905},
    {n:'ê³ í˜„',x:588,y:904}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'ì„±ì£¼',x:507,y:601},
    {n:'í•˜ë¹ˆ',x:539,y:611}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'ë‹¨ì„±',x:433,y:782},
    {n:'íš¡ì²œ',x:396,y:840},
    {n:'ì‚¬ì²œ',x:462,y:849}
    ]},
    {color:'#f97316', dash:true, stations:[
    {n:'ë‹¨ì„±',x:433,y:782},
    {n:'ì§„ì£¼',x:466,y:820},
    {n:'ì‚¬ì²œ',x:462,y:849}
    ]}
  ]
},

seosan:{
  name:'ì„œì‚°ì„ ', color:'#14b8a6',
  routes:[
    {color:'#14b8a6', stations:[
    {n:'ìˆ˜ì˜',x:194,y:217},
    {n:'ë´‰ë‹´',x:184,y:236},
    {n:'ì™•ë¦¼',x:176,y:252},
    {n:'í–¥ë‚¨',x:168,y:268},
    {n:'ì²­ë¶',x:159,y:283},
    {n:'ì•ˆì¤‘',x:150,y:296},
    {n:'í˜„ë•',x:142,y:308},
    {n:'ì†¡ì•…',x:132,y:317},
    {n:'ë‹¹ì§„',x:122,y:323},
    {n:'ì‚¬ê¸°ì†Œ(ëŒ€ìš´ì‚°)',x:100,y:338},
    {n:'ì„œì‚°',x:78,y:352}
    ]}
  ]
},

taean:{
  name:'íƒœì•ˆì„ ', color:'#d946ef',
  routes:[
    {color:'#d946ef', stations:[
    {n:'ì•„ì‚°',x:212,y:357},
    {n:'í•©ë•',x:150,y:347},
    {n:'ë‹¹ì§„',x:122,y:323},
    {n:'ìŠ¹ì‚°',x:100,y:324},
    {n:'ì„œì‚°',x:78,y:352},
    {n:'íƒœì•ˆ',x:44,y:364},
    {n:'ë‚¨ë©´',x:41,y:384},
    {n:'ì°½ê¸°',x:50,y:414},
    {n:'ì•ˆë©´ë„',x:53,y:430},
    {n:'ê³ ë‚¨',x:67,y:458},
    {n:'ë³´ë ¹',x:113,y:484}
    ]}
  ]
},

seogang:{
  name:'ê²½ê°•ì„ ', color:'#7c3aed',
  routes:[
    {color:'#7c3aed', stations:[
    {n:'ìˆ˜ì§„',x:235,y:159},
    {n:'ê²½ê¸°ê´‘ì£¼',x:262,y:168},
    {n:'ì´ì²œ',x:295,y:182},
    {n:'ì—¬ì£¼',x:345,y:190},
    {n:'ì§€ì •',x:411,y:177}
    ]},
    {color:'#7c3aed', dash:true, stations:[
    {n:'ì¼ì£½',x:317,y:258},
    {n:'ê°€ë‚¨',x:332,y:222},
    {n:'ì—¬ì£¼',x:345,y:190}
    ]}
  ]
},

sobaek:{
  name:'ì†Œë°±ì„ ', color:'#4f46e5',
  routes:[
    {color:'#4f46e5', stations:[
    {n:'ì˜ë™',x:389,y:528},
    {n:'ë¬´ì£¼',x:363,y:578},
    {n:'ë‚¨ë¬´ì£¼',x:359,y:620},
    {n:'ê³„ë¶',x:351,y:643},
    {n:'ì¥ê³„',x:343,y:659},
    {n:'ì¥ìˆ˜(ì „ë¶)',x:328,y:684},
    {n:'ë‚¨ì‚°ì„œ',x:307,y:705},
    {n:'ë³´ì ˆ',x:300,y:723},
    {n:'ë‚¨ì›',x:292,y:754},
    {n:'ê³¡ì„±',x:276,y:791},
    {n:'ì˜¥ê³¼',x:238,y:794},
    {n:'ê³ ì„œ',x:205,y:807},
    {n:'ê´‘ì£¼',x:155,y:831}
    ]}
  ]
},

gyeongbuk:{
  name:'ê²½ë¶ì„ ', color:'#0ea5e9',
  routes:[
    {color:'#0ea5e9', stations:[
    {n:'ìƒì£¼',x:482,y:457},
    {n:'ë‚¨ë¬¸ê²½',x:493,y:412},
    {n:'ìš©ê¶',x:514,y:396},
    {n:'ì˜ˆì²œ',x:548,y:388},
    {n:'ì¥ìˆ˜',x:576,y:353},
    {n:'ì˜ì£¼',x:588,y:342}
    ]}
  ]
},

taebaek:{
  name:'íƒœë°±ì„ ', color:'#64748b',
  routes:[
    {color:'#64748b', stations:[
    {n:'ì œì²œ',x:488,y:249},
    {n:'ì–´ìƒì²œ',x:524,y:258},
    {n:'ì˜ì›”',x:554,y:234},
    {n:'ì‹ ë™(íƒœë°±)',x:587,y:226},
    {n:'ë¬´ë¦‰',x:624,y:216},
    {n:'ì‚¬ë¶',x:635,y:221},
    {n:'ê³ í•œ',x:642,y:228},
    {n:'íƒœë°±í™©ì§€',x:673,y:233},
    {n:'ë„ê³„',x:687,y:217},
    {n:'ê³ ì‚¬ë¦¬',x:692,y:205},
    {n:'ë¯¸ë¡œ',x:702,y:170},
    {n:'ì‚¼ì²™',x:714,y:156}
    ]}
  ]
},

jeongseon:{
  name:'ì •ì„ ì„ ', color:'#f43f5e',
  routes:[
    {color:'#f43f5e', stations:[
    {n:'í‰ì°½',x:549,y:142},
    {n:'ë¶í‰(ì •ì„ )',x:579,y:157},
    {n:'ì •ì„ ',x:600,y:174},
    {n:'í™”ì•”',x:632,y:195},
    {n:'ì‚¬ë¶',x:635,y:221}
    ]}
  ]
},

miryang:{
  name:'ë°€ì–‘ì„ ', color:'#a16207',
  routes:[
    {color:'#a16207', stations:[
    {n:'ë‚¨ëŒ€êµ¬',x:567,y:635},
    {n:'ê°€ì°½',x:589,y:643},
    {n:'ì²­ë„',x:615,y:683},
    {n:'ë°€ì–‘',x:611,y:721},
    {n:'ì‚¼ë‘ì§„',x:628,y:752},
    {n:'ë¬¼ê¸ˆ',x:667,y:778},
    {n:'ë¶ë¶€ì‚°',x:699,y:792}
    ]}
  ]
},

sejongsecheon:{
  name:'ì„¸ì¢…ì„¸ì²œì„ ', color:'#8b5cf6', noSpread:true,
  routes:[
    {color:'#8b5cf6', stations:[
    {n:'ì²œì•ˆ',x:239,y:342},
    {n:'ì¡°ì¹˜ì›',x:276,y:414},
    {n:'ì„¸ì¢…',x:268,y:441},
    {n:'ë°˜ì„',x:279,y:463},
    {n:'íŒì•”',x:312,y:487},
    {n:'ì„œëŒ€ì „',x:300,y:493},
    {n:'ëŒ€ì „',x:307,y:482}
    ]}
  ]
},

gyooe:{
  name:'êµì™¸ì„ ', color:'#65a30d', noSpread:true,
  routes:[
    {color:'#65a30d', stations:[
    {n:'ì˜ì •ë¶€',x:216,y:68},
    {n:'ê°€ëŠ¥',x:212,y:67},
    {n:'ì†¡ì¶”',x:200,y:75},
    {n:'ì¥í¥(ì–‘ì£¼)',x:191,y:76},
    {n:'ê³ ì–‘',x:182,y:80},
    {n:'ê´€ì‚°',x:173,y:85},
    {n:'ì£¼êµ',x:167,y:92},
    {n:'ëŠ¥ê³¡',x:162,y:104},
    {n:'í–‰ì‹ ',x:167,y:107},
    {n:'ì„œìš¸',x:198,y:124}
    ]}
  ]
},

gyeongui:{
  name:'ê²½ì˜ì„ ', color:'#2563eb', noSpread:true,
  routes:[{color:'#2563eb',stations:[
    {n:'ì„œìš¸',x:198,y:124},{n:'ë§ˆí¬',x:182,y:118},{n:'í–‰ì‹ ',x:167,y:107},
    {n:'ì¼ì‚°',x:151,y:87},{n:'ë¬¸ì‚°',x:153,y:35}
  ]}]
},

gyeongwon:{
  name:'ê²½ì›ì„ ', color:'#f59e0b', noSpread:true,
  routes:[{color:'#f59e0b',stations:[
    {n:'ì„œìš¸',x:198,y:124},{n:'ë‚¨ê¸ˆí˜¸',x:209,y:126},{n:'ì²­ëŸ‰ë¦¬',x:216,y:117},
    {n:'ì˜ì •ë¶€',x:216,y:68},{n:'ì–‘ì£¼',x:216,y:56},{n:'ë™ë‘ì²œ',x:218,y:23},
    {n:'ì „ê³¡',x:221,y:-15},{n:'ì—°ì²œ',x:222,y:-37},{n:'ì² ì›',x:244,y:-85}
  ]}]
},

// ì¸ê²Œì„ ì—­ ì¢Œí‘œë¥¼ ê¸°ì¡´ ë‚¨í•œ ë…¸ì„ ë„ íˆ¬ì˜ì‹ìœ¼ë¡œ ë°°ì¹˜í•œ ë¶í•œ ê¶Œì—­ë„.
// ë¬¸ì‚°Â·ì² ì›Â·ê°„ì„±ì„ ì—°ê²°ì ìœ¼ë¡œ í¬í•¨í•˜ë˜ ë‚¨í•œ êµ¬ê°„ì€ ì¤‘ë³µí•˜ì§€ ì•ŠëŠ”ë‹¤.
north:{
  name:'ë¶í•œ ì² ë„ë§', color:'#64748b', noSpread:true, northOnly:true, mapOnly:true,
  routes:[
    {name:'ê²½ì˜ì„ ',color:'#2563eb',stations:[
      {n:'ì‹ ì˜ì£¼',x:-406,y:-630},{n:'ë£¡ì²œ',x:-394,y:-594},{n:'ì—¼ì£¼',x:-362,y:-565},
      {n:'ë™ë¦¼',x:-333,y:-556},{n:'ì„ ì²œ',x:-285,y:-539},{n:'ê³½ì‚°',x:-247,y:-505},
      {n:'ì •ì£¼',x:-216,y:-506},{n:'ìš´í•˜',x:-166,y:-482},{n:'ìš´ì „',x:-144,y:-498},
      {n:'ì•ˆì£¼ì—­ì „',x:-124,y:-480},{n:'ë¬¸ë•',x:-129,y:-451},{n:'ê¸ˆí’',x:-143,y:-410},
      {n:'í‰ì›',x:-128,y:-391},{n:'ìˆœì•ˆ',x:-105,y:-360},{n:'ì„œí¬',x:-93,y:-331},
      {n:'ì„œí‰ì–‘',x:-95,y:-319},{n:'í‰ì–‘',x:-93,y:-304},{n:'ì†¡ë¦¼',x:-115,y:-228},
      {n:'ì‚¬ë¦¬ì›',x:-86,y:-156},{n:'ì„œí¥',x:27,y:-134},{n:'í‰ì‚°',x:63,y:-108},
      {n:'ê¸ˆì²œ(í™©í•´)',x:80,y:-55},{n:'ê°œì„±',x:97,y:2},{n:'ê°œì„±ê³µë‹¨',x:115,y:8},
      {n:'íŒë¬¸',x:121,y:14},{n:'ë„ë¼ì‚°',x:136,y:22},{n:'ë¬¸ì‚°',x:153,y:35}
    ]},
    {name:'ê²½ì›ì„ ',color:'#f59e0b',stations:[
      {n:'ì›ì‚°',x:307,y:-353},{n:'ì•ˆë³€ì',x:328,y:-315},{n:'ê³ ì‚°ì',x:304,y:-259},
      {n:'ì„¸í¬ì',x:289,y:-197},{n:'í‰ê°•',x:273,y:-130},{n:'ì² ì›',x:244,y:-85}
    ]},
    {name:'ë™í•´ì„ ',color:'#3fb994',stations:[
      {n:'ê²½í¥',x:992,y:-1340},{n:'ë¼ì„ ',x:983,y:-1262},{n:'ì²­ì§„',x:861,y:-1126},
      {n:'ê²½ì„±',x:819,y:-1066},{n:'ì–´ë‘',x:832,y:-1025},{n:'ëª…ê°„',x:794,y:-969},{n:'ëª…ì²œ',x:778,y:-913},
      {n:'ê¸¸ì£¼',x:753,y:-877},{n:'ê¹€ì±…',x:724,y:-794},{n:'ë‹¨ì²œ',x:655,y:-724},{n:'ë¦¬ì›',x:594,y:-695},{n:'ë¶ì²­',x:516,y:-670},
      {n:'ì‹ í¬',x:483,y:-609},{n:'ìš´í¬',x:459,y:-612},{n:'ì‚¼í˜¸',x:409,y:-583},{n:'ë½ì›',x:387,y:-572},
      {n:'í•¨í¥',x:334,y:-571},{n:'í•¨ì£¼ì',x:308,y:-553},{n:'ì •í‰ì',x:296,y:-536},{n:'ê¸ˆì•¼ì',x:258,y:-464},{n:'ê³ ì›ì',x:261,y:-433},
      {n:'ì²œë‚´',x:256,y:-411},{n:'ì›ì‚°',x:307,y:-353},{n:'í†µì²œì',x:415,y:-288},{n:'ì¡°ì„ ë°˜ë„;í•œë°˜ë„',x:440,y:-262},{n:'ê³ ì„±(ê°•ì›)',x:483,y:-226},
      {n:'ì„œêµ¬ì',x:489,y:-210},{n:'ë¶í˜„ë‚´',x:504,y:-184},{n:'ê°„ì„±',x:552,y:-119}
    ]},
    {name:'í‰ì›ì„ ',color:'#8b5cf6',stations:[
      {n:'í‰ì–‘',x:-93,y:-304},{n:'ìŠ¹í˜¸',x:-37,y:-300},{n:'ì—°ì‚°ì',x:30,y:-265},
      {n:'ìˆ˜ì•ˆì',x:52,y:-235},{n:'ì‹ ê³„ì',x:95,y:-157},{n:'ì´ì²œì',x:178,y:-152},
      {n:'í‰ê°•',x:273,y:-130},{n:'í™”ì²œ',x:371,y:-37},{n:'í•´ì•ˆ',x:474,y:-92},{n:'ê°„ì„±',x:552,y:-119}
    ]},
    {name:'ìˆœì²œì„ ',color:'#14b8a6',stations:[
      {n:'í‰ì›',x:-128,y:-391},{n:'ìˆ™ì²œ',x:-119,y:-424},{n:'ìˆœì²œë¹„í–‰ì¥',x:-46,y:-429},
      {n:'ì„±ì²œ',x:28,y:-405},{n:'ì‹ ì–‘',x:76,y:-385},{n:'ì–‘ë•',x:121,y:-367},{n:'ì›ì‚°',x:307,y:-353}
    ]},
    {name:'ë…•ì›ì„ ',color:'#84cc16',stations:[
      {n:'í‰ì–‘',x:-93,y:-304},{n:'ì„œí‰ì–‘',x:-95,y:-319},{n:'ì„œí¬',x:-93,y:-331},
      {n:'ë°°ì‚°ì ',x:-62,y:-366},{n:'í‰ì„±',x:-59,y:-375},{n:'ì€ì‚°',x:-26,y:-419},
      {n:'êµ¬ë´‰',x:8,y:-447},{n:'ë¶ì°½',x:40,y:-471},{n:'ì†¡ë¦¼(ë…•ì›ì„ )',x:40,y:-486},
      {n:'ë‚¨ë•',x:38,y:-502},{n:'ë•ì²œ',x:42,y:-527},{n:'ë…•ì›',x:98,y:-546}
    ]},
    {name:'ë§Œí¬ì„ ',color:'#ec4899',stations:[
      {n:'í‰ì–‘',x:-93,y:-304},{n:'ì€ì‚°ì',x:-27,y:-419},{n:'ìˆœì²œë¹„í–‰ì¥',x:-46,y:-429},
      {n:'í–¥ì‚°ì',x:9,y:-609},{n:'í¬ì²œì œì‚¬ê³µì¥',x:32,y:-649},{n:'ì „ì²œì',x:78,y:-779},{n:'ì„±ê°„ì',x:102,y:-832},
      {n:'ê°•ê³„í•™ìƒì†Œë…„ê¶ì „',x:108,y:-883},{n:'ìƒ˜ë¬¼ë™',x:38,y:-938}
    ]},
    {name:'í‰ì„±ì„ ',color:'#f43f5e',stations:[
      {n:'í‰ì–‘',x:-93,y:-304},{n:'ê°•ì„ ',x:-128,y:-284},{n:'ê°•ì„œ',x:-144,y:-278},
      {n:'ë‚¨í¬',x:-178,y:-223},{n:'ì€ìœ¨',x:-221,y:-159},{n:'ì†¡í™”',x:-235,y:-114},
      {n:'ì¥ì—°',x:-243,y:-82},{n:'íƒœíƒ„',x:-195,y:-34},{n:'ë²½ì„±',x:-136,y:-23},
      {n:'í•´ì£¼',x:-98,y:-19},{n:'ì²­ë‹¨ì',x:-46,y:1},{n:'ì—°ì•ˆì',x:7,y:18},
      {n:'ê¸ˆê³¡ë¦¬',x:57,y:14},{n:'ê°œì„±',x:97,y:2}
    ]},
    {name:'í‰ì„±ì„ ',color:'#f43f5e',dash:true,stations:[
      {n:'ì¥ì—°',x:-243,y:-82},{n:'ë£¡ì—°',x:-296,y:-50}
    ]},
    {name:'ë™í•´ì„ ',color:'#3fb994',dash:true,stations:[
      {n:'ë‹¨ì²œ',x:655,y:-724},{n:'ë¶ë‹¨ì²œ',x:631,y:-868},{n:'í˜œì‚°',x:482,y:-1010}
    ]},
    {name:'ë™í•´ì„ ',color:'#3fb994',dash:true,stations:[
      {n:'ì²­ì§„',x:861,y:-1126},{n:'ë¬´ì‚°',x:728,y:-1253}
    ]}
  ]
},

boeun:{
  name:'ë³´ì€ì„ ', color:'#0d9488', noSpread:true,
  routes:[
    {color:'#0d9488', stations:[
    {n:'ë¬¸ì˜',x:322,y:426},
    {n:'íšŒì¸',x:346,y:435},
    {n:'ìˆ˜í•œ',x:370,y:438},
    {n:'ë³´ì€',x:376,y:438},
    {n:'ì¥ì•ˆ(ë³´ì€)',x:391,y:442},
    {n:'ì†ë¦¬ì‚°',x:410,y:448},
    {n:'í™”ë‚¨',x:419,y:447},
    {n:'í™”ë ¹',x:429,y:449},
    {n:'ë‚™ì„œ',x:447,y:461},
    {n:'ì„œìƒì£¼',x:474,y:457},
    {n:'ìƒì£¼',x:483,y:457}
    ]}
  ]
},

};

const NORTH_MAP_LINE_KEYS={
  'ê²½ì˜ì„ ':'north_gyeongui','ê²½ì›ì„ ':'north_gyeongwon','ë™í•´ì„ ':'north_donghae','í‰ì›ì„ ':'north_pyeongwon',
  'ìˆœì²œì„ ':'north_suncheon','ë…•ì›ì„ ':'north_nyeongwon','ë§Œí¬ì„ ':'north_manpo','í‰ì„±ì„ ':'north_pyeongseong'
};
Object.entries(NORTH_MAP_LINE_KEYS).forEach(([name,key])=>{
  const routes=MAP_LINES.north.routes.filter(route=>route.name===name);
  MAP_LINES[key]={name,color:routes[0]?.color||'#64748b',noSpread:true,northOnly:true,mapOnly:true,routes};
});
{
  const joinRegionalMain=(key,{reverseSouth=false}={})=>{
    const south=MAP_LINES[key].routes,north=MAP_LINES.north.routes.filter(route=>route.name===MAP_LINES[key].name);
    const northMain=north.find(route=>!route.dash),southMain=south.find(route=>!route.dash);
    const southStations=reverseSouth?[...southMain.stations].reverse():southMain.stations;
    const junction=northMain.stations.at(-1)?.n;
    const tail=southStations[0]?.n===junction?southStations.slice(1):southStations;
    MAP_LINES[`${key}_all`]={
      name:MAP_LINES[key].name,color:MAP_LINES[key].color,noSpread:true,mapOnly:true,combinedOnly:true,
      routes:[
        {name:MAP_LINES[key].name,color:MAP_LINES[key].color,stations:[...northMain.stations,...tail]},
        ...north.filter(route=>route.dash),...south.filter(route=>route.dash)
      ]
    };
  };
  joinRegionalMain('gyeongui',{reverseSouth:true});
  joinRegionalMain('gyeongwon',{reverseSouth:true});
  joinRegionalMain('donghae');
}

// ì¸ì ‘ ì—­ì´ ë„ˆë¬´ ê°€ê¹Œì›Œ ì•„ì´ì½˜/í…ìŠ¤íŠ¸ê°€ ê²¹ì¹˜ëŠ” ê²ƒ ë°©ì§€: ê²½ë¡œ ë°©í–¥ ìœ ì§€í•˜ë©° ìµœì†Œ ê°„ê²© í™•ë³´
function spreadMapRoutes(routes){
  const MIN=18;
  // ì—­ëª… -> [{x0,y0,x,y}] â€” ë™ëª…ì´ì—­(ì¶˜ì–‘ ë“±)ì€ ì›ì¢Œí‘œê°€ ë©€ë©´ ë³„ê°œì˜ ì—­ìœ¼ë¡œ ì·¨ê¸‰
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
// â”€â”€ ë…¸ì„ ë„ í™•ëŒ€/ì¶•ì†Œ â”€â”€
let _mapZoomLv=1;
let _mapZoomCtlHidden=(()=>{try{return localStorage.getItem('nimbi_zoomctl')==='hide';}catch(e){return false;}})();
function _zoomCtlHTML(){
  return _mapZoomCtlHidden
    ? `<div class="map-zoom-ctl" id="map-zoom-ctl"><button onclick="toggleZoomCtl()" title="ì¤Œ ë²„íŠ¼ í¼ì¹˜ê¸°" style="opacity:.55;font-size:14px">ğŸ”</button></div>`
    : `<div class="map-zoom-ctl" id="map-zoom-ctl">
        <button onclick="mapZoom(0.35)" title="í™•ëŒ€">ï¼‹</button>
        <button onclick="mapZoom(-0.35)" title="ì¶•ì†Œ">ï¼</button>
        <button onclick="mapZoomReset()" title="ì›ë˜ëŒ€ë¡œ">âŸ²</button>
        <button onclick="toggleZoomCtl()" title="ë²„íŠ¼ ì ‘ê¸°" style="font-size:12px;opacity:.7">âœ•</button>
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
  // ì¤‘ì‹¬ ìœ ì§€ìš© ë¹„ìœ¨ ê¸°ë¡
  let rx=0.5,ry=0.5;
  if(keepCenter&&wrap.scrollWidth>0){
    rx=(wrap.scrollLeft+wrap.clientWidth/2)/wrap.scrollWidth;
    ry=(wrap.scrollTop+wrap.clientHeight/2)/wrap.scrollHeight;
  }
  const vbW=+svg.dataset.svgw||(svg.viewBox&&svg.viewBox.baseVal?svg.viewBox.baseVal.width:0)||0;
  const isMetro=svg.dataset.metro==='1';
  // ê¸°ì¤€ í­: ê¶Œì—­/ì „ì²´ ë…¸ì„ ë„(isMetro)ëŠ” ì›ë³¸ ë·°ë°•ìŠ¤ í­, ê°œë³„ ë…¸ì„ ì€ ì»¨í…Œì´ë„ˆ í­(ìµœëŒ€ 400)
  const base=isMetro?vbW:Math.max(wrap.clientWidth||0,Math.min(vbW,400));
  if(_mapZoomLv<=1.001){
    if(isMetro){
      // ì›ë³¸ í¬ê¸°ë¡œ ë³µì› (min-width ì¸ë¼ì¸ ì§€ì •ê°’ê³¼ ë™ì¼)
      svg.style.width=vbW+'px';
      svg.style.minWidth=vbW+'px';
    } else {
      svg.style.width='100%';
      svg.style.minWidth=Math.min(vbW,400)+'px';
    }
  } else {
    const w=Math.round(base*_mapZoomLv);
    svg.style.width=w+'px';
    svg.style.minWidth=w+'px';
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
function _syncMapFullscreenButton(){
  const panel=document.getElementById('panel-map'),btn=document.getElementById('map-fullscreen-btn');
  if(!panel||!btn)return;
  const on=document.fullscreenElement===panel||panel.classList.contains('map-fullscreen-fallback');
  btn.textContent=on?'âœ• ì „ì²´í™”ë©´ ì¢…ë£Œ':'â›¶ ì „ì²´í™”ë©´';
  btn.classList.toggle('active',on);
}
function toggleMapFullscreen(){
  if(_uiMode!=='pc')return;
  const panel=document.getElementById('panel-map'); if(!panel)return;
  if(document.fullscreenElement===panel){
    document.exitFullscreen?.();
  }else if(panel.classList.contains('map-fullscreen-fallback')){
    panel.classList.remove('map-fullscreen-fallback');
    document.body.classList.remove('map-fullscreen-open');
    _syncMapFullscreenButton();
  }else if(panel.requestFullscreen){
    panel.requestFullscreen().catch(()=>{
      panel.classList.add('map-fullscreen-fallback');
      document.body.classList.add('map-fullscreen-open');
      _syncMapFullscreenButton();
    });
  }else{
    panel.classList.add('map-fullscreen-fallback');
    document.body.classList.add('map-fullscreen-open');
    _syncMapFullscreenButton();
  }
}
document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement)document.body.classList.remove('map-fullscreen-open');
  _syncMapFullscreenButton();
});
// ë‘ ì†ê°€ë½ í•€ì¹˜ ì¤Œ
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

// ì „ì²´ ë…¸ì„ ë„ ì¢Œí‘œ ì¸ë±ìŠ¤ (ëª¨ë“  MAP_LINES ì—­ â†’ ì›ì¢Œí‘œ, ì¶”ì  ê²½ë¡œ ì˜¤ë²„ë ˆì´ìš©)
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
// ë…¸ì„ ë³„ ì¢Œí‘œ ì¸ë±ìŠ¤ â€” ë™ëª…ì´ì—­(ì˜ˆ: ì˜ë™ì„  ì¶˜ì–‘ vs ê²½ì „ì„  ì¶˜ì–‘)ì„ ë¼ì¸ ì»¨í…ìŠ¤íŠ¸ë¡œ êµ¬ë¶„
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
// ì¶”ì  ì—´ì°¨ì˜ ìš´í–‰ ê²½ë¡œë¥¼ ë…¸ì„ ë³„ êµ¬ê°„(run)ìœ¼ë¡œ ë¶„í•  â€” ê° runì€ í•´ë‹¹ ë…¸ì„  ìƒ‰ì˜ routeê°€ ë¨
// ì¢Œí‘œëŠ” êµ¬ê°„ì´ ì†í•œ ë…¸ì„ ì˜ ì¢Œí‘œë¥¼ ìš°ì„  ì‚¬ìš© (ë™ëª…ì´ì—­ ì˜¤ë°°ì¹˜ ë°©ì§€)
function _trackedRouteRuns(t){
  const g=_mapGlobalPos();
  const lp=_mapLinePos();
  const keyStns={};
  for(const [k,ml] of Object.entries(MAP_LINES)) keyStns[k]=new Set(ml.routes.flatMap(r=>r.stations.map(s=>s.n)));
  const myKeys=t.line.split('Â·').map(s=>_lineNameToKey[s.trim()]).filter(Boolean);
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
// â”€â”€ ë…¸ì„ ë„ íƒ­ ëª¨ë“œë³„ ë Œë” (ê¸°ì°¨: ê¸°ì¡´ ë…¸ì„  íƒ­ / ì „ì² : ì „ì²  ë…¸ì„  ì„ íƒ ë°”) â”€â”€
let _metroMapRegion=null, _metroMapId=null;
let _railRegion=(()=>{try{const value=localStorage.getItem('nimbi_region');return ['south','north','all'].includes(value)?value:'south';}catch(e){return 'south';}})();
function _syncRailRegionControls(){
  document.querySelectorAll('[data-region-choice]').forEach(button=>{
    const active=button.dataset.regionChoice===_railRegion;
    button.classList.toggle('active',active);button.setAttribute('aria-checked',String(active));
  });
  const label=document.getElementById('sidebar-region-label');if(label)label.textContent={south:'ë‚¨í•œ',north:'ë¶í•œ',all:'ì „ì²´'}[_railRegion];
}
function setRailRegion(region){
  if(!['south','north','all'].includes(region))return;
  _railRegion=region;try{localStorage.setItem('nimbi_region',region);}catch(e){}
  _syncRailRegionControls();
  const menu=document.getElementById('region-menu');if(menu)menu.hidden=true;
  _populateTrainLineSelect();
  if(_appMode==='train')renderMapTabForMode();
  document.dispatchEvent(new CustomEvent('nimbi-region-change',{detail:{region}}));
}
function toggleRegionMenu(anchor){
  const menu=document.getElementById('region-menu');if(!menu)return;
  menu.hidden=!menu.hidden;_syncRailRegionControls();
  if(!menu.hidden&&anchor){const r=anchor.getBoundingClientRect();menu.style.top=`${Math.min(innerHeight-180,r.bottom+7)}px`;menu.style.left=`${Math.max(12,Math.min(innerWidth-170,r.right-158))}px`;menu.querySelector('.active')?.focus();}
}
const NORTH_STATION_DATA_ALIASES={'ë£¡ì—°':'ë£¡ì—°ì'};
function railStationDataName(raw){
  const name=String(raw||'').replace(/ì—­$/,'');
  return NORTH_STATION_DATA_ALIASES[name]||name;
}
function railStationDisplayName(raw){
  const name=String(raw||'').replace(/ì—­$/,'');
  return Object.keys(NORTH_STATION_DATA_ALIASES).find(key=>NORTH_STATION_DATA_ALIASES[key]===name)||name;
}
function _northRailStationNames(){
  return new Set((MAP_LINES.north?.routes||[]).flatMap(route=>route.stations.map(station=>railStationDataName(station.n))));
}
function getRailTrainsByStation(raw){
  const dataName=railStationDataName(raw),names=new Set([dataName,railStationDisplayName(dataName)]),found=[];
  names.forEach(name=>getTrainsByStation(name).forEach(t=>{if(!found.includes(t))found.push(t);}));
  return found;
}
function isRailStationInRegion(raw){
  const name=railStationDataName(raw);
  const northNames=_northRailStationNames();
  const shared=new Set(['ë¬¸ì‚°','ì² ì›','ê°„ì„±']);
  if(_railRegion==='all')return true;
  if(shared.has(name))return true;
  return _railRegion==='north'?northNames.has(name):!northNames.has(name);
}
function isRailTrainInRegion(train){
  if(_railRegion==='all')return true;
  const northNames=_northRailStationNames();
  ['ë¬¸ì‚°','ì² ì›','ê°„ì„±'].forEach(name=>northNames.delete(name));
  const flags=(train?.stops||[]).filter(s=>s.arr||s.dep).map(s=>northNames.has(railStationDataName(s.s)));
  return _railRegion==='north'?flags.some(Boolean):flags.some(flag=>!flag);
}
function renderMapTabForMode(){
  const tabs=document.getElementById('map-line-tabs');
  const controls=document.getElementById('map-controls-bar');
  const filterPanel=document.getElementById('map-filter-panel');
  let bar=document.getElementById('metro-line-bar');
  let northBar=document.getElementById('north-line-bar');
  let allBar=document.getElementById('all-region-line-bar');
  if(_appMode==='metro'&&typeof METRO_LINES!=='undefined'){
    if(tabs)tabs.style.display='none';
    if(controls)controls.style.display='none';
    if(filterPanel)filterPanel.style.display='none';
    if(!bar){
      bar=document.createElement('div'); bar.id='metro-line-bar';
      tabs.parentNode.insertBefore(bar,tabs.nextSibling);
    }
    if(northBar)northBar.style.display='none';
    if(allBar)allBar.style.display='none';
    bar.style.display='';
    const regions=[...new Set(METRO_LINES.map(l=>l.region))];
    if(!_metroMapRegion)_metroMapRegion=regions[0];
    const lines=METRO_LINES.filter(l=>l.region===_metroMapRegion);
    if(_metroMapId!=='__all__'&&_metroMapId!=='__pick__'&&(!_metroMapId||!lines.some(l=>l.id===_metroMapId)))_metroMapId=lines[0].id;
    _renderMetroBar(bar);
    showMapLine(_metroMapId==='__all__'?'metroall:'+_metroMapRegion:_metroMapId==='__pick__'?'metropick:':'metro:'+_metroMapId,null);
  } else {
    if(tabs)tabs.style.display=_railRegion==='south'?'':'none';
    if(controls)controls.style.display='flex'; // ì›ë˜ inline display:flex ë³µì› (ë²„íŠ¼ ì¤„ë°”ê¿ˆ ë°©ì§€)
    if(bar)bar.style.display='none';
    if(_railRegion==='north'){
      if(allBar)allBar.style.display='none';
      if(!northBar){
        northBar=document.createElement('div');northBar.id='north-line-bar';northBar.className='map-line-tabs north-line-tabs';
        tabs.parentNode.insertBefore(northBar,tabs.nextSibling);
      }
      northBar.style.display='';
      northBar.innerHTML=`<button class="map-line-tab ctrl" onclick="showNorthMapLine('north',this)">ì „ì²´ë³´ê¸°</button>${Object.entries(NORTH_MAP_LINE_KEYS).map(([name,key])=>`<button class="map-line-tab" onclick="showNorthMapLine('${key}',this)">${name}</button>`).join('')}`;
      const currentKey=(_mapCurrentLine==='north'||Object.values(NORTH_MAP_LINE_KEYS).includes(_mapCurrentLine))?_mapCurrentLine:'north';
      const active=[...northBar.querySelectorAll('.map-line-tab')].find(button=>button.getAttribute('onclick')?.includes(`'${currentKey}'`))||northBar.querySelector('.map-line-tab');
      showNorthMapLine(currentKey,active);
    }
    else if(_railRegion==='all'){
      if(northBar)northBar.style.display='none';
      if(!allBar){
        allBar=document.createElement('div');allBar.id='all-region-line-bar';allBar.className='map-line-tabs all-region-line-tabs';
        tabs.parentNode.insertBefore(allBar,tabs.nextSibling);
      }
      allBar.style.display='';
      const sharedLines=new Set(['gyeongui','gyeongwon','donghae']);
      const south=[...tabs.querySelectorAll('.map-line-tab:not(.ctrl)')].map(button=>{
        const key=button.getAttribute('onclick')?.match(/['"]([\w]+)['"]/)?.[1];
        const combinedKey=sharedLines.has(key)?`${key}_all`:key;
        return key?`<button class="map-line-tab" onclick="showRegionAllMapLine('${combinedKey}',this)">${button.textContent}</button>`:'';
      }).join('');
      const north=Object.entries(NORTH_MAP_LINE_KEYS).filter(([name])=>!['ê²½ì˜ì„ ','ê²½ì›ì„ ','ë™í•´ì„ '].includes(name)).map(([name,key])=>`<button class="map-line-tab" onclick="showRegionAllMapLine('${key}',this)">${name}</button>`).join('');
      allBar.innerHTML=`<button class="map-line-tab ctrl" onclick="showRegionAllMapLine('allregions',this)">ì „ì²´ë³´ê¸°</button>${south}${north}`;
      const valid=['allregions',...Object.keys(MAP_LINES).filter(key=>!MAP_LINES[key].northOnly),...Object.values(NORTH_MAP_LINE_KEYS).filter(key=>key!=='north_donghae')];
      const currentKey=valid.includes(_mapCurrentLine)?_mapCurrentLine:'allregions';
      const active=[...allBar.querySelectorAll('.map-line-tab')].find(button=>button.getAttribute('onclick')?.includes(`'${currentKey}'`))||allBar.querySelector('.map-line-tab');
      showRegionAllMapLine(currentKey,active);
    }
    else{
      if(northBar)northBar.style.display='none';
      if(allBar)allBar.style.display='none';
      const activeMapTab=document.querySelector('.map-line-tab.active')||document.querySelector('.map-line-tab');
      const lineKey=(activeMapTab&&activeMapTab.getAttribute('onclick').match(/['"]([\w]+)['"]/)?.[1])||'gyeongbu';
      showMapLine(lineKey,activeMapTab);
    }
  }
}
function showNorthMapLine(lineKey,button){
  showMapLine(lineKey,null);
  document.querySelectorAll('#north-line-bar .map-line-tab').forEach(item=>item.classList.toggle('active',item===button));
}
function showRegionAllMapLine(lineKey,button){
  showMapLine(lineKey,null);
  document.querySelectorAll('#all-region-line-bar .map-line-tab').forEach(item=>item.classList.toggle('active',item===button));
}
// ë°°ì°¨ í‘œì‹œ â€” hwPeak/hwOff ëˆ„ë½ ë…¸ì„ ì€ 'undefinedë¶„' ëŒ€ì‹  ìˆëŠ” ê°’ë§Œ í‘œê¸°
function _metroHeadway(o){
  const peak=(o&&o.hwPeak!=null)?`ëŸ¬ì‹œ <b>${o.hwPeak}ë¶„</b>`:'';
  const off=(o&&o.hwOff!=null)?`í‰ì‹œ <b>${o.hwOff}ë¶„</b>`:'';
  const both=[peak,off].filter(Boolean).join(' Â· ');
  return both?`ë°°ì°¨ ${both}`:'ë°°ì°¨ ì •ë³´ ì¤€ë¹„ ì¤‘';
}
let _metroPickSet=new Set();
let _metroPickQuery='';
function _renderMetroBar(bar){
  const regions=[...new Set(METRO_LINES.map(l=>l.region))];
  const lines=METRO_LINES.filter(l=>l.region===_metroMapRegion);
  const isAll=_metroMapId==='__all__';
  const isPick=_metroMapId==='__pick__';
  const sel=(isAll||isPick)?null:METRO_LINES.find(l=>l.id===_metroMapId);
  // ê²¹ì³ë³´ê¸°: ë…¸ì„ ì´ ë§¤ìš° ë§ì•„(ìˆ˜ë„ê¶Œ 39ê°œ) ê°€ë¡œ ìŠ¤í¬ë¡¤ ì¹©ì€ ë¶€ì í•© â†’
  // ê²€ìƒ‰ + ê¶Œì—­ë³„ ê·¸ë£¹ ê·¸ë¦¬ë“œ íŒ¨ë„ë¡œ ì „í™˜. ì „ ê¶Œì—­ì„ í•œëˆˆì—, ìŠ¤í¬ë¡¤ë¡œ ì§€ë„ ì˜ì—­ ë³´ì¡´.
  if(isPick){ _renderMetroPickPanel(bar,regions); return; }
  const pickNames=[...METRO_LINES].filter(l=>_metroPickSet.has(l.id));
  bar.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 6px">
      ${regions.map(r=>`<button class="metro-region-chip${_metroMapRegion===r?' on':''}" onclick="setMetroMapRegion('${r}')">${r}</button>`).join('')}
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px">
      <button class="metro-line-chip metro-all-chip${isAll?' on':''}" onclick="showMetroMap('__all__')">ğŸ—ºï¸ ê¶Œì—­ ì „ì²´</button>
      <button class="metro-line-chip metro-pick-chip" onclick="toggleMetroPickMode()">ğŸ”€ ê²¹ì³ë³´ê¸°${_metroPickSet.size?` <b>${_metroPickSet.size}</b>`:''}</button>
      <button class="metro-line-chip" onclick="openCurrentLineStationList()">ì—­ ëª©ë¡</button>
      ${lines.map(l=>`<button class="metro-line-chip${l.id===_metroMapId?' on':''}" style="--mc:${l.color}" onclick="showMetroMap('${l.id}')">${l.name}</button>`).join('')}
    </div>
    ${isAll?`<div class="metro-map-info">
      <span style="font-weight:800">ğŸ—ºï¸ ${_metroMapRegion} ê¶Œì—­ ì „ì²´</span>
      <span>${lines.length}ê°œ ë…¸ì„  í†µí•© Â· ì‹œÂ·ì¢…ì°©ì—­ë§Œ í‘œê¸°</span>
      <span style="color:var(--text2)">ë…¸ì„  ê°œë³„ ë³´ê¸°ëŠ” ìœ„ ì¹©ì—ì„œ ì„ íƒ</span>
    </div>`:sel?`<div class="metro-map-info">
      <span style="color:${sel.color};font-weight:800">ğŸš‡ ${sel.name}</span>
      <span>${sel.loop?sel.from+' ê¸°ì  ìˆœí™˜':sel.from+' â†” '+sel.to} Â· ${sel.n}ê°œì—­</span>
      <span>ì²«ì°¨ <b>${sel.first}</b> Â· ë§‰ì°¨ <b>${sel.last}</b></span>
      <span>${_metroHeadway(sel)}</span>
    </div>`:''}`;
}
// ê²¹ì³ë³´ê¸° ì „ìš© ì„ íƒ íŒ¨ë„ â€” ê²€ìƒ‰ + ê¶Œì—­ë³„ ê·¸ë£¹, ì „ ë…¸ì„  í•œ í™”ë©´
function _renderMetroPickPanel(bar,regions){
  const q=_metroPickQuery.trim();
  const pickNames=[...METRO_LINES].filter(l=>_metroPickSet.has(l.id));
  const groups=regions.map(r=>{
    const ls=METRO_LINES.filter(l=>l.region===r);
    const selN=ls.filter(l=>_metroPickSet.has(l.id)).length;
    const chips=ls.map(l=>{
      const on=_metroPickSet.has(l.id);
      return `<button class="mpick-chip${on?' on':''}" data-nm="${l.name}" style="--mc:${l.color}" onclick="toggleMetroPick('${l.id}')">${on?'âœ“ ':''}${l.name}</button>`;
    }).join('');
    return `<div class="mpick-group" data-region="${r}"><div class="mpick-group-h">${r}<span>${selN}/${ls.length}</span></div><div class="mpick-grid">${chips}</div></div>`;
  }).join('');
  bar.innerHTML=`
    <div class="mpick-head">
      <span class="mpick-title">ğŸ”€ ë…¸ì„  ê²¹ì³ë³´ê¸° ${_metroPickSet.size?`<b>${_metroPickSet.size}</b>ê°œ`:''}</span>
      <span style="display:flex;gap:6px">
        ${_metroPickSet.size?`<button class="metro-pick-clear" onclick="clearMetroPick()">âœ• ì „ì²´ í•´ì œ</button>`:''}
        <button class="metro-pick-clear" onclick="toggleMetroPickMode()">ê²¹ì³ë³´ê¸° ì¢…ë£Œ</button>
      </span>
    </div>
    ${_metroPickSet.size?`<div class="mpick-sel">${pickNames.map(l=>`<span style="color:${l.color}">â— ${l.name}</span>`).join('')}</div>`:''}
    <input class="mpick-search" type="search" placeholder="ğŸ” ë…¸ì„  ì´ë¦„ìœ¼ë¡œ ê²€ìƒ‰" value="${q.replace(/"/g,'&quot;')}" oninput="_metroPickFilter(this.value)">
    <div class="mpick-scroll">${groups}</div>
    <div class="mpick-hint">ì—¬ëŸ¬ ê¶Œì—­ì„ ììœ ë¡­ê²Œ ì¡°í•©í•  ìˆ˜ ìˆì–´ìš” Â· ê³ ë¥¸ ë…¸ì„ ë¼ë¦¬ì˜ í™˜ìŠ¹ì—­Â·ì‹œì¢…ì°©ì—­ì´ í‘œì‹œë©ë‹ˆë‹¤</div>`;
  if(q)_metroPickFilter(q);
}
// ê²€ìƒ‰ì–´ë¡œ ì¹© í•„í„° (ì¬ë Œë” ì—†ì´ í‘œì‹œë§Œ í† ê¸€ â†’ ì…ë ¥ í¬ì»¤ìŠ¤ ìœ ì§€)
function _metroPickFilter(v){
  _metroPickQuery=v;
  const q=v.trim();
  const bar=document.getElementById('metro-line-bar'); if(!bar)return;
  bar.querySelectorAll('.mpick-group').forEach(g=>{
    let vis=0;
    g.querySelectorAll('.mpick-chip').forEach(c=>{
      const show=!q||c.getAttribute('data-nm').includes(q);
      c.style.display=show?'':'none'; if(show)vis++;
    });
    g.style.display=vis?'':'none';
  });
}
function setMetroMapRegion(r){const keep=_metroMapId==='__all__';_metroMapRegion=r;_metroMapId=keep?'__all__':(_metroMapId==='__pick__'?'__pick__':null);renderMapTabForMode();}
function showMetroMap(id){
  _metroJourneyMap=null;
  _metroMapId=id;
  const bar=document.getElementById('metro-line-bar'); if(bar)_renderMetroBar(bar);
  showMapLine(id==='__all__'?'metroall:'+_metroMapRegion:'metro:'+id,null);
}
// ê²¹ì³ë³´ê¸° ëª¨ë“œ í† ê¸€ â€” ì—¬ëŸ¬ ë…¸ì„ ì„ ê³¨ë¼ í•œ ì¢Œí‘œê³„ì— ê²¹ì³ ê·¸ë¦¼
function toggleMetroPickMode(){
  if(_metroMapId==='__pick__'){ _metroMapId=null; renderMapTabForMode(); return; }
  const prev=_metroMapId;
  _metroMapId='__pick__'; _metroPickQuery='';
  // ì²˜ìŒ ì§„ì… ì‹œ ë°©ê¸ˆ ë³´ë˜ ê°œë³„ ë…¸ì„ ì„ ì‹œë“œë¡œ ì¶”ê°€(ë¹ˆ í™”ë©´ ë°©ì§€)
  if(!_metroPickSet.size&&prev&&prev!=='__all__'&&METRO_LINES.some(l=>l.id===prev))_metroPickSet.add(prev);
  renderMapTabForMode();
}
function toggleMetroPick(id){
  if(_metroPickSet.has(id))_metroPickSet.delete(id); else _metroPickSet.add(id);
  _repaintPickBar();
  showMapLine('metropick:',null);
}
function clearMetroPick(){
  _metroPickSet.clear();
  _repaintPickBar();
  showMapLine('metropick:',null);
}
// íŒ¨ë„ ì¬ë Œë” ì‹œ ìŠ¤í¬ë¡¤ ìœ„ì¹˜ ë³´ì¡´(ì¹©ì´ ë§ì•„ ë§¤ë²ˆ ìœ„ë¡œ íŠ€ëŠ” ê²ƒ ë°©ì§€)
function _repaintPickBar(){
  const bar=document.getElementById('metro-line-bar'); if(!bar)return;
  const sc=bar.querySelector('.mpick-scroll'); const top=sc?sc.scrollTop:0;
  _renderMetroBar(bar);
  const sc2=bar.querySelector('.mpick-scroll'); if(sc2)sc2.scrollTop=top;
}
// METRO_LINES í•­ëª© â†’ MAP_LINES í˜•ì‹ ë³€í™˜ (ë™ì¼ ë Œë”ëŸ¬ ì¬ì‚¬ìš©)
// ì „ì² ì€ ê¸°ì°¨ ëŒ€ë¹„ ë…¸ì„ ì´ ì§§ì•„ ê·¸ëŒ€ë¡œ ê·¸ë¦¬ë©´ ìª¼ê·¸ë¼ë“¦ â†’ í‰ê·  ì—­ ê°„ê²©ì´ 32px ì´ìƒ ë˜ë„ë¡ ì¢Œí‘œ í™•ëŒ€
// ì¢Œí‘œëŠ” ì „ë¶€ ìœ„ê²½ë„ íˆ¬ì˜ê°’(ë™ì¼ ì¢Œí‘œê³„)ì´ë©°, ì§€ì„ ì€ ë³„ë„ dash route
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
// ê¶Œì—­ ì „ì²´ ì „ì²  ë…¸ì„ ë„ â€” í•´ë‹¹ ê¶Œì—­ ì „ ë…¸ì„ ì„ í•œ ì¢Œí‘œê³„ë¡œ ê²¹ì³ ê·¸ë¦¼(ê´€ì œ ëª¨ë“œì²˜ëŸ¼).
// ë¼ë²¨ì€ ì¢…ì°©Â·í™˜ìŠ¹ì—­ë§Œ(showMapLineì˜ isAllView í—ˆë¸Œ ë¡œì§ì´ ì²˜ë¦¬). ì¢Œí‘œëŠ” ì „ ë…¸ì„  ê³µí†µ ìŠ¤ì¼€ì¼.
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
  // ê¶Œì—­ ì§€ë„ëŠ” ì‹¤ì¢Œí‘œ(ìœ„ê²½ë„ íˆ¬ì˜)ë¥¼ ê·¸ëŒ€ë¡œ ê²¹ì³ ê·¸ë¦°ë‹¤. ë°€ë¦¼(spread) ì—†ì´ ê·¸ë¦¬ë¯€ë¡œ
  // ë°°ìœ¨ì„ ë„‰ë„‰íˆ í‚¤ì›Œ ì¡°ë°€ì—­ ê²¹ì¹¨ì„ ì¤„ì¸ë‹¤(ë…¸ì„ ë³„ ë°°ìœ¨ì„ ì“°ë©´ í™˜ìŠ¹ì—­ì´ ì–´ê¸‹ë‚˜ë¯€ë¡œ ê³µìš© ë°°ìœ¨).
  const f=Math.min(7,Math.max(3,44/Math.max(avg,1)));
  const routes=[];
  lines.forEach(l=>{(l.routes||[{stations:l.stations,xy:l.xy}]).forEach(r=>{
    routes.push({color:l.color,dash:!!r.dash,
      stations:r.stations.map((n,i)=>({n,x:Math.round(r.xy[i][0]*f),y:Math.round(r.xy[i][1]*f)}))});
  });});
  return _metroRegionCache[region]={name:region+' ê¶Œì—­ ì „ì²´',color:'#8b949e',isMetro:true,allView:true,metroRegion:region,noSpread:true,lineCount:lines.length,routes};
}
// ê²½ë¡œê°€ ë‘˜ ì´ìƒì˜ ê¶Œì—­ì„ ì§€ë‚  ë•ŒëŠ” ê° ê¶Œì—­ì˜ ì „ì²´ ë…¸ì„ ì„ ê°™ì€ ì¢Œí‘œê³„ì— í•©ì¹œë‹¤.
// ì¶œë°œ ê¶Œì—­ í•˜ë‚˜ë§Œ ê·¸ë¦¬ë©´ í™˜ìŠ¹ ì´í›„ ê²½ë¡œ ì¢Œí‘œê°€ ì—†ì–´ ê°•ì¡°ì„ ì´ ëŠê¸°ê¸° ë•Œë¬¸ì´ë‹¤.
let _metroJourneyRegionCache={};
function _metroRegionsAsMapLine(encodedRegions){
  if(typeof METRO_LINES==='undefined')return null;
  const regions=decodeURIComponent(encodedRegions||'').split('|').filter(Boolean);
  const key=regions.slice().sort().join('|');if(_metroJourneyRegionCache[key])return _metroJourneyRegionCache[key];
  const regionSet=new Set(regions),lines=METRO_LINES.filter(line=>regionSet.has(line.region));if(!lines.length)return null;
  let segSum=0,segN=0;
  lines.forEach(line=>(line.routes||[{stations:line.stations,xy:line.xy}]).forEach(route=>{for(let i=1;i<route.xy.length;i++){segSum+=Math.hypot(route.xy[i][0]-route.xy[i-1][0],route.xy[i][1]-route.xy[i-1][1]);segN++;}}));
  const avg=segN?segSum/segN:32,f=Math.min(7,Math.max(3,44/Math.max(avg,1))),routes=[];
  lines.forEach(line=>(line.routes||[{stations:line.stations,xy:line.xy}]).forEach(route=>routes.push({color:line.color,dash:!!route.dash,stations:route.stations.map((name,index)=>({n:name,x:Math.round(route.xy[index][0]*f),y:Math.round(route.xy[index][1]*f)}))})));
  return _metroJourneyRegionCache[key]={name:`${regions.join('Â·')} ê²½ë¡œ ê¶Œì—­`,color:'#8b949e',isMetro:true,allView:true,metroRegions:regions,noSpread:true,lineCount:lines.length,routes};
}
// ê²¹ì³ë³´ê¸° â€” ì‚¬ìš©ìê°€ ê³ ë¥¸ ë…¸ì„ ë“¤(_metroPickSet)ë§Œ í•œ ì¢Œí‘œê³„ì— ê²¹ì³ ê·¸ë¦¼.
// ê¶Œì—­ê³¼ ë¬´ê´€í•˜ê²Œ ì—¬ëŸ¬ ë…¸ì„  í˜¼í•© ê°€ëŠ¥. ë¼ë²¨ì€ ì‹œÂ·ì¢…ì°©ì—­ + ê³ ë¥¸ ë…¸ì„ ë¼ë¦¬ì˜ í™˜ìŠ¹ì—­(ì¢Œí‘œ ê³µìœ ).
function _metroPickAsMapLine(){
  if(typeof METRO_LINES==='undefined')return null;
  const lines=METRO_LINES.filter(l=>_metroPickSet.has(l.id));
  if(!lines.length)return null;
  let segSum=0,segN=0;
  lines.forEach(l=>{(l.routes||[{stations:l.stations,xy:l.xy}]).forEach(r=>{
    for(let i=1;i<r.xy.length;i++){segSum+=Math.hypot(r.xy[i][0]-r.xy[i-1][0],r.xy[i][1]-r.xy[i-1][1]);segN++;}});});
  const avg=segN?segSum/segN:32;
  const f=Math.min(7,Math.max(3,44/Math.max(avg,1)));
  const routes=[];
  lines.forEach(l=>{(l.routes||[{stations:l.stations,xy:l.xy}]).forEach(r=>{
    routes.push({color:l.color,dash:!!r.dash,
      stations:r.stations.map((n,i)=>({n,x:Math.round(r.xy[i][0]*f),y:Math.round(r.xy[i][1]*f)}))});
  });});
  return {name:'ê²¹ì³ë³´ê¸°',color:'#8b949e',isMetro:true,allView:true,noSpread:true,metroPick:true,lineCount:lines.length,routes};
}
// ì—­ì˜ í™˜ìŠ¹ ì „ì²  ë…¸ì„  ëª©ë¡ â€” ê²Œì„ DB ì—­ íƒœê·¸ì˜ ë…¸ì„  ê¸°ë³¸ëª… ê¸°ì¤€, í˜„ì¬ ë…¸ì„  ì œì™¸
let _metroNameIdx=null;
function _metroXferLines(stn, excludeId){
  if(typeof METRO_LINES==='undefined'||typeof STATION_DB==='undefined')return [];
  if(!_metroNameIdx){_metroNameIdx={};METRO_LINES.forEach(l=>{_metroNameIdx[l.name]=l;});}
  const st=STATION_DB[stn+'ì—­']||STATION_DB[stn];
  if(!st||!st.lines)return [];
  const bases=[...new Set(st.lines.map(t=>t.split('/')[0].split(' (')[0].trim()))];
  return bases.map(b=>_metroNameIdx[b]).filter(l=>l&&l.id!==excludeId);
}
// ê¸°ì°¨(ê°„ì„  ì—´ì°¨) ì •ì°¨ì—­ ì—¬ë¶€ â€” _modeStnSetsInitì˜ ì§‘í•© ì¬ì‚¬ìš©
function _isTrainStn(n){
  _modeStnSetsInit();
  return !!(_trainStnSet&&_trainStnSet.has(n));
}
// ë…¸ì„  ì „ì²´ì˜ ì—­ë³„ í™˜ìŠ¹ í‘œì‹œ ë§µ â€” ê°™ì€ í™˜ìŠ¹ ë…¸ì„ ì´ 3ì—­ ì´ìƒ ì—°ì†ë˜ë©´ ì„ ë¡œ ê³µìœ ë¡œ ë³´ê³ 
// êµ¬ê°„ ì–‘ë(ë…¸ì„ ì´ ê°ˆë¼ì§€ëŠ” ì—­)ì—ë§Œ í‘œì‹œí•œë‹¤. 1~2ì—­ ê³µìœ ëŠ” ëª¨ë“  ì—­ì— í‘œì‹œ.
function _metroXferMap(l){
  const res={};
  if(!l||typeof METRO_LINES==='undefined')return res;
  const routes=l.routes||[{stations:l.stations}];
  const uniq=[...new Set(routes.flatMap(r=>r.stations))];
  const raw={};   // ì—­ -> í™˜ìŠ¹ ë…¸ì„  ë°°ì—´ (ì „ì²´)
  uniq.forEach(n=>{raw[n]=_metroXferLines(n,l.id);});
  const cand={};  // id -> line
  uniq.forEach(n=>raw[n].forEach(x=>{cand[x.id]=x;}));
  const show={};  // ì—­ -> í‘œì‹œí•  ë…¸ì„  id Set
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
  const line=lineKey==='allregions'?_allRegionsAsMapLine()
    :(typeof lineKey==='string'&&lineKey.startsWith('metroall:'))?_metroRegionAsMapLine(lineKey.slice(9))
    :(typeof lineKey==='string'&&lineKey.startsWith('metrojourney:'))?_metroRegionsAsMapLine(lineKey.slice(13))
    :(typeof lineKey==='string'&&lineKey.startsWith('metropick:'))?_metroPickAsMapLine()
    :(typeof lineKey==='string'&&lineKey.startsWith('metro:'))?_metroAsMapLine(lineKey.slice(6))
    :(lineKey==='all'?_allAsMapLine():MAP_LINES[lineKey]);
  if(!line){ const wrap=document.getElementById('map-svg-wrap'); if(wrap&&typeof lineKey==='string'&&lineKey.startsWith('metropick:'))wrap.innerHTML='<div style="padding:40px 16px;text-align:center;color:var(--text2)">ê²¹ì³ ë³¼ ë…¸ì„ ì„ ì¹©ì—ì„œ ì„ íƒí•˜ì„¸ìš”</div>'; return; }
  const reachView=_mapReachability&&(
    (_mapReachability.mode==='train'&&['all','north','allregions'].includes(lineKey))||
    (_mapReachability.mode==='metro'&&typeof lineKey==='string'&&lineKey.startsWith('metroall:'))
  )?_mapReachability:null;
  const journeyView=_metroJourneyMap&&typeof lineKey==='string'&&(lineKey.startsWith('metroall:')||lineKey.startsWith('metrojourney:'))?_metroJourneyMap:null;

  // ì¶”ì  ì¤‘ì´ë©´: ì—´ì°¨ê°€ ì‹¤ì œ ìš´í–‰í•˜ëŠ” êµ¬ê°„ë§Œ, ì—´ì°¨ ë“±ê¸‰ ìƒ‰ìœ¼ë¡œ í†µì¼í•´ ë Œë”
  const _trk=_mapTrackedTrain?getTrainByNo(_mapTrackedTrain):null;
  let baseRoutes=line.routes, trackedView=false, _trkColor=null, _trkStopSet=null;
  if(_trk){
    const runs=_trackedRouteRuns(_trk);
    if(runs.length){
      _trkColor=(typeof GRADE_COLORS!=='undefined'&&GRADE_COLORS[_trk.grade])||'#8b949e';
      baseRoutes=runs.map(r=>({...r,color:_trkColor}));
      trackedView=true;
      // ì‹¤ì œ ì •ì°¨ì—­ ì§‘í•© â€” ë¯¸ì •ì°¨(í†µê³¼)ì—­ì€ ì˜…ê²Œ í‘œì‹œ
      _trkStopSet=new Set(_trk.stops.filter(s=>(hasTime(s.arr)||hasTime(s.dep))&&!isPassStop(_trk,s.s)).map(s=>s.s));
    }
  }
  // ê¶Œì—­ ì „ì²´ ì§€ë„ëŠ” ë°€ë¦¼ ì™œê³¡ ë°©ì§€ë¥¼ ìœ„í•´ ì‹¤ì¢Œí‘œ ê·¸ëŒ€ë¡œ(ê³µìš© ë°°ìœ¨ì´ ì¡°ë°€ ë…¸ì„ ì„
  // MIN ë¯¸ë§Œìœ¼ë¡œ ì••ì¶•â†’spreadê°€ ì—­ì„ ë°€ì–´ ì–´ê¸‹ë‚¨). ê·¸ ì™¸ì—ëŠ” ê¸°ì¡´ëŒ€ë¡œ ë°€ë¦¼ ì ìš©.
  const routes=(line&&line.noSpread)?baseRoutes:spreadMapRoutes(baseRoutes);
  // ì¢Œí‘œ ë²”ìœ„
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
  // viewBoxëŠ” ì›ë³¸ ì¢Œí‘œ ê·¸ëŒ€ë¡œ, widthëŠ” ì»¨í…Œì´ë„ˆì— ë§ê²Œ 100%
  parts.push(`<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" data-svgw="${svgW}" data-metro="${line.isMetro?1:0}" style="min-width:${line.isMetro?svgW:Math.min(svgW,400)}px;display:block;overflow:hidden" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="var(--bg1)"/>`);
  // ì¢Œí‘œ íŒë…ì„ ë•ëŠ” ë³´ì¡° ê²©ì. ë…¸ì„ ë³´ë‹¤ ë¨¼ì € ë³´ì´ì§€ ì•Šë„ë¡ í…Œë§ˆ í† í°ê³¼
  // ë‚®ì€ ë¶ˆíˆ¬ëª…ë„ë¥¼ ì‚¬ìš©í•œë‹¤.
  for(let x=0;x<svgW;x+=50)parts.push(`<line class="map-coordinate-grid" x1="${x}" y1="0" x2="${x}" y2="${svgH}"/>`);
  for(let y=0;y<svgH;y+=50)parts.push(`<line class="map-coordinate-grid" x1="0" y1="${y}" x2="${svgW}" y2="${y}"/>`);

  // ì—­ ì¢Œí‘œ ìˆ˜ì§‘ (ì²« ë“±ì¥ ê¸°ì¤€)
  const stnPos={};
  routes.forEach(r=>r.stations.forEach(s=>{
    if(!stnPos[s.n])stnPos[s.n]={x:s.x+ox,y:s.y+oy};
  }));
  _mapStnPos=stnPos;

  // ì„  ê·¸ë¦¬ê¸° (ê³¡ì„  path)
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
        // êº¾ì„ ê°ë„ ê³„ì‚°
        const dx1=cur.x-prev.x, dy1=cur.y-prev.y;
        const dx2=next.x-cur.x, dy2=next.y-cur.y;
        const len1=Math.sqrt(dx1*dx1+dy1*dy1);
        const len2=Math.sqrt(dx2*dx2+dy2*dy2);
        // ê³¡ì„  ë°˜ê²½: ì„ ë¶„ ê¸¸ì´ì˜ 25%, ìµœëŒ€ 20px
        const r=Math.min(len1*0.25, len2*0.25, 20);
        // êº¾ì„ ì§ì „/ì§í›„ ì§€ì 
        const bx=cur.x-dx1/len1*r, by=cur.y-dy1/len1*r;
        const ax=cur.x+dx2/len2*r, ay=cur.y+dy2/len2*r;
        d+=` L${bx.toFixed(2)},${by.toFixed(2)} Q${cur.x},${cur.y} ${ax.toFixed(2)},${ay.toFixed(2)}`;
      }
    }
    return d;
  }

  // ğŸ›°ï¸ ê´€ì œ ëª¨ë“œ/ê¶Œì—­ ì „ì²´: ì „ ë…¸ì„ ì„ ì–‡ê²Œ, ë¼ë²¨ì€ ë…¸ì„  ì¢…ì Â·ë…¸ì„  ê°„ êµì°¨(í™˜ìŠ¹)ì—­ë§Œ
  const isAllView=lineKey==='all'||!!(line&&line.allView);
  let _hubSet=null;
  if(isAllView){
    // í—ˆë¸Œ = ë…¸ì„  ì¢…ì°©ì—­ + ë¶„ê¸°/í™˜ìŠ¹ì—­. ë Œë”ì— ì“°ëŠ” spread ì¢Œí‘œ ê¸°ë°˜ í‚¤ë¡œ íŒì •í•˜ì—¬
    // ë™ëª…ì´ì—­(ê°™ì€ ì´ë¦„Â·ë‹¤ë¥¸ ìœ„ì¹˜)ì€ ë³„ê°œ ì·¨ê¸‰ â†’ ì˜¤ê°•ì¡° ë°©ì§€. (spreadê°€ ê³µìœ ì—­ì€
    // ë™ì¼ ì¢Œí‘œë¡œ ìŠ¤ëƒ…í•˜ë¯€ë¡œ í™˜ìŠ¹ì—­ì€ ì—¬ëŸ¬ routeì— ê°™ì€ í‚¤ë¡œ ë“±ì¥ â†’ ì¹´ìš´íŠ¸â‰¥2)
    _hubSet=new Set();
    const kf=s=>s.n+'@'+Math.round(s.x)+','+Math.round(s.y);
    if(line&&line.metroRegion&&typeof METRO_LINES!=='undefined'){
      // ê¶Œì—­ ì „ì²´ ì „ì²  ë…¸ì„ ë„: ë¶ë¹” ë°©ì§€ â€” ë¼ë²¨ì€ ê° ë…¸ì„ ì˜ ì‹œÂ·ì¢…ì°©ì—­ë§Œ
      const termNames=new Set();
      METRO_LINES.filter(l=>l.region===line.metroRegion).forEach(l=>{if(l.from)termNames.add(l.from);if(l.to)termNames.add(l.to);});
      routes.forEach(rt=>rt.stations.forEach(s=>{ if(termNames.has(s.n))_hubSet.add(kf(s)); }));
    } else {
      // ê´€ì œ ëª¨ë“œ: ë…¸ì„  ì¢…ì°©ì—­ + ë¶„ê¸°/í™˜ìŠ¹ì—­(ì¢Œí‘œ ê³µìœ  ì¹´ìš´íŠ¸â‰¥2)
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
    const isBranch=r.dash||false;   // ì§€ì„ /ê²½ìœ : ë³¸ì„ ê³¼ ê°™ì€ ìƒ‰, ì ì„ 
    const d=smoothPath(r.stations, ox, oy);
    parts.push(`<path d="${d}" fill="none" stroke="${reachView||journeyView?'var(--text3)':r.color}" stroke-width="${isAllView?2.5:(isBranch?4:5)}" stroke-linecap="round" stroke-linejoin="round" ${isBranch?'stroke-dasharray="9,9"':''} opacity="${reachView||journeyView?0.18:(isAllView?0.75:(isBranch?0.85:1))}"/>`);
  });
  if(reachView&&reachView.edges){
    routes.forEach(r=>{
      for(let i=0;i<r.stations.length-1;i++){
        const a=r.stations[i],b=r.stations[i+1];
        if(!reachView.edges.has(_mapReachEdgeKey(a.n,b.n)))continue;
        const d=smoothPath([a,b],ox,oy);
        parts.push(`<path class="map-reachable-route" d="${d}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".95" pointer-events="none"/>`);
      }
    });
  }
  if(journeyView){
    const graph=_metroGraph();
    journeyView.segments.forEach(segment=>{
      const metroLine=graph.lineById[segment.lid]||{color:'#388bfd'};
      for(let i=0;i<segment.stns.length-1;i++){
        const a=stnPos[segment.stns[i]],b=stnPos[segment.stns[i+1]];if(!a||!b)continue;
        parts.push(`<path class="map-journey-route" d="M${a.x},${a.y} L${b.x},${b.y}" fill="none" stroke="${metroLine.color}" stroke-width="5" stroke-linecap="round" opacity=".98" pointer-events="none"/>`);
      }
    });
  }

  // ì§í†µì—­ì´ ë§ì€ ëŒ€í˜•ì—­ì—ì„œëŠ” ëª¨ë“  ì—­ëª…ì„ ë™ì‹œì— ì“°ë©´ ë…¸ì„ ê³¼ ì—­ì ì´ ê°€ë ¤ì§„ë‹¤.
  // ì—­ì ê³¼ ì‹¤ì œ ìš´í–‰ ê²½ë¡œëŠ” ëª¨ë‘ ìœ ì§€í•˜ë˜, ì¶œë°œì—­Â·í—ˆë¸ŒÂ·ë…¸ì„  ëì ì„ ë¨¼ì € í‘œì‹œí•˜ê³ 
  // ë‚¨ì€ ì—­ëª…ì€ ë…¸ì„  ìˆœì„œ ì „ì²´ì— ê³ ë¥´ê²Œ ë°°ë¶„í•œë‹¤. ê° ì—­ì€ í´ë¦­/í˜¸ë²„ë¡œ ê³„ì† í™•ì¸ ê°€ëŠ¥í•˜ë‹¤.
  const reachLabelKeys=new Set();
  const reachLabelThreshold=32;
  const reachLabelLimit=28;
  if(reachView){
    const candidates=[];
    const seenCandidates=new Set();
    routes.forEach(r=>r.stations.forEach((s,i)=>{
      if(!reachView.stations.has(s.n))return;
      const key=s.n+'@'+Math.round(s.x)+','+Math.round(s.y);
      if(seenCandidates.has(key))return;
      seenCandidates.add(key);
      candidates.push({
        key,
        origin:s.n===reachView.origin,
        important:i===0||i===r.stations.length-1||!!(_hubSet&&_hubSet.has(key))
      });
    }));
    if(candidates.length<=reachLabelThreshold){
      candidates.forEach(item=>reachLabelKeys.add(item.key));
    }else{
      candidates.filter(item=>item.origin).forEach(item=>reachLabelKeys.add(item.key));
      candidates.filter(item=>item.important&&!item.origin).forEach(item=>{
        if(reachLabelKeys.size<reachLabelLimit)reachLabelKeys.add(item.key);
      });
      const remaining=candidates.filter(item=>!reachLabelKeys.has(item.key));
      const slots=Math.max(0,reachLabelLimit-reachLabelKeys.size);
      for(let i=0;i<slots&&remaining.length;i++){
        const index=Math.min(remaining.length-1,Math.floor((i+.5)*remaining.length/slots));
        reachLabelKeys.add(remaining[index].key);
      }
    }
  }
  const journeyNamedStations=new Set();
  const journeyMajorStations=new Set();
  if(journeyView){
    const mapTo=journeyView.mapTo||journeyView.to;
    journeyNamedStations.add(journeyView.from);journeyNamedStations.add(mapTo);
    journeyMajorStations.add(journeyView.from);journeyMajorStations.add(mapTo);
    if(journeyView.via&&journeyView.segments.some(segment=>segment.stns.includes(journeyView.via)))journeyNamedStations.add(journeyView.via);
    journeyView.segments.forEach((segment,index)=>{
      if(index){journeyNamedStations.add(segment.stns[0]);journeyMajorStations.add(segment.stns[0]);}
      if(index<journeyView.segments.length-1){journeyNamedStations.add(segment.stns.at(-1));journeyMajorStations.add(segment.stns.at(-1));}
    });
  }

  // ì—­ ì  + ì´ë¦„ (ì¤‘ë³µ ì—†ì´)
  const rendered=new Set();
  // ì „ì² : ì—­ë³„ í™˜ìŠ¹ í‘œì‹œ ë§µ (ì„ ë¡œ ê³µìœ  êµ¬ê°„ì€ ì–‘ëë§Œ)
  const _xferMap=(line.isMetro&&typeof METRO_LINES!=='undefined')?_metroXferMap(METRO_LINES.find(x=>x.id===line.metroId)):null;
  routes.forEach(r=>{
    r.stations.forEach((s,i)=>{
      if(journeyView&&!journeyNamedStations.has(s.n))return;
      // ë™ëª…ì´ì—­(ì¶˜ì–‘ ë“±)ì€ ì¢Œí‘œê¹Œì§€ ê°™ì•„ì•¼ ì¤‘ë³µ ì²˜ë¦¬ â€” ìœ„ì¹˜ê°€ ë‹¤ë¥´ë©´ ê°ê° í‘œì‹œ
      const rkey=s.n+'@'+Math.round(s.x)+','+Math.round(s.y);
      if(rendered.has(rkey))return;
      rendered.add(rkey);
      const x=s.x+ox, y=s.y+oy;
      const isEnd=i===0||i===r.stations.length-1;
      // ê´€ì œ ë·°: í—ˆë¸Œì—­ ì™¸ì—ëŠ” ì•„ì£¼ ì‘ì€ ì  + ë¼ë²¨ ìƒëµ (ì¢Œí‘œ ê¸°ë°˜ í‚¤ë¡œ ë™ëª…ì´ì—­ êµ¬ë¶„)
      const isReachable=!!(reachView&&reachView.stations.has(s.n));
      const isReachOrigin=!!(reachView&&reachView.origin===s.n);
      const isJourneyPoint=!!(journeyView&&journeyNamedStations.has(s.n));
      const isJourneyMajor=!!(journeyView&&journeyMajorStations.has(s.n));
      const showReachLabel=!reachView||reachLabelKeys.has(rkey);
      const isMinor=!!(_hubSet&&!_hubSet.has(rkey)&&!(isReachable&&showReachLabel));
      // ì¶”ì  ë·°: ë¯¸ì •ì°¨(í†µê³¼)ì—­ì€ ì‘ê³  ì˜…ê²Œ
      const faded=!!(_trkStopSet&&!_trkStopSet.has(s.n));
      const r2=isJourneyPoint?(isJourneyMajor?8:4):isReachOrigin?10:isReachable?6:isMinor?2.2:(faded?3.5:(isEnd?7:5));
      const sw=isJourneyPoint?(isJourneyMajor?3:2):isReachOrigin?4:isReachable?3:isMinor?1.2:(faded?1.5:(isEnd?3:2));
      const nodeColor=isJourneyPoint?r.color:isReachable?'var(--accent)':r.color;
      const nodeOpacity=reachView&&!isReachable?'0.14':(faded?'0.35':'1');
      // íˆíŠ¸ ì˜ì—­
      parts.push(`<circle class="map-station-hit" cx="${x}" cy="${y}" r="${r2+8}" fill="transparent" style="cursor:pointer" onclick="openMapPopup('${s.n}','${line.name}')"><title>${s.n}</title></circle>`);
      // ì—­ ì 
      if(isReachOrigin)parts.push(`<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".35" pointer-events="none"/>`);
      parts.push(`<circle class="map-station-node${isReachable?' map-station-reachable':''}${isReachOrigin?' origin':''}" cx="${x}" cy="${y}" r="${r2}" fill="var(--bg2)" stroke="${nodeColor}" stroke-width="${sw}" opacity="${nodeOpacity}" pointer-events="none"/>`);
      // ì—­ëª…
      // ì¸ì ‘ ì—­ ë°©í–¥ ê¸°ë°˜ í…ìŠ¤íŠ¸ ìœ„ì¹˜ ê²°ì •
      // ì´ì „/ë‹¤ìŒ ì—­ì˜ x í‰ê· ìœ¼ë¡œ í…ìŠ¤íŠ¸ë¥¼ ë°˜ëŒ€ìª½ì— ë°°ì¹˜
      const allStnList=routes.flatMap(r=>r.stations);
      const sIdx=allStnList.findIndex(q=>q.n===s.n);
      const prevS=sIdx>0?allStnList[sIdx-1]:null;
      const nextS=sIdx<allStnList.length-1?allStnList[sIdx+1]:null;
      const neighborX=prevS&&nextS?(prevS.x+nextS.x)/2:prevS?prevS.x:nextS?nextS.x:null;
      // ì´ì›ƒ ì—­ë³´ë‹¤ ì˜¤ë¥¸ìª½ì´ë©´ ì˜¤ë¥¸ìª½, ì™¼ìª½ì´ë©´ ì™¼ìª½ â†’ ë…¸ì„ ì—ì„œ ë©€ì–´ì§€ëŠ” ë°©í–¥
      let anchor, tx, ty=y+4;
      if(neighborX!==null){
        // ë…¸ì„ ì´ ìˆ˜ì§ì— ê°€ê¹Œìš°ë©´(dx ì‘ìŒ) ì¢Œìš°ë¡œ, ìˆ˜í‰ì— ê°€ê¹Œìš°ë©´ ìœ„ì•„ë˜ë¡œ
        const dx=Math.abs((prevS?prevS.x:nextS.x)-(nextS?nextS.x:prevS.x));
        const dy=Math.abs((prevS?prevS.y:nextS.y)-(nextS?nextS.y:prevS.y));
        if(dy>dx*1.5){
          // ìˆ˜ì§ êµ¬ê°„: x ê¸°ì¤€ ì¢Œìš° ë°°ì¹˜
          anchor=x>svgW/2?'end':'start';
          tx=x+(anchor==='start'?13:-13);
        } else {
          // ìˆ˜í‰/ëŒ€ê° êµ¬ê°„: ë…¸ì„  ìœ„ì•„ë˜ ë°°ì¹˜
          const isAbove=neighborX<x;
          anchor='middle';
          tx=x;
          ty=isAbove?y-10:y+16;
        }
      } else {
        anchor=x>svgW/2?'end':'start';
        tx=x+(anchor==='start'?13:-13);
      }
      // íŠ¹ì • ì—­ í…ìŠ¤íŠ¸ ìœ„ì¹˜ ìˆ˜ë™ ì˜¤ë²„ë¼ì´ë“œ
      const manualOffset={'ëª©í¬':[-16,0],'ê´‘ì£¼':[0,-14],'í•¨í‰':[-14,0],'ë¶€ì‚°':[14,0],'íšŒë•':[-14,0],'ëŒ€ì „':[14,2]};
      if(manualOffset[s.n]){
        tx=x+manualOffset[s.n][0];
        ty=y+manualOffset[s.n][1]+4;
        anchor=manualOffset[s.n][0]<0?'end':manualOffset[s.n][0]>0?'start':'middle';
      }
      if(!isMinor&&showReachLabel) parts.push(`<text x="${tx}" y="${ty}" fill="${isJourneyPoint?'var(--text1)':isReachable?'var(--text1)':'var(--text2)'}" font-size="${isJourneyPoint?(isJourneyMajor?12:10):isReachOrigin?13:(faded?9.5:(isEnd?12:11))}" font-weight="${isJourneyMajor||isReachable?800:(isEnd?700:500)}" opacity="${reachView&&!isReachable?0.12:(faded?0.4:1)}" text-anchor="${anchor}" pointer-events="none" font-family="Noto Sans KR,sans-serif">${s.n}</text>`);
      // ì „ì²  ë…¸ì„ ë„: í™˜ìŠ¹ ë…¸ì„  ìƒ‰ ì  (ì—­ëª… ì˜†) + ê¸°ì°¨ í™˜ìŠ¹ í‘œì‹œ
      if(line.isMetro&&!journeyView&&!isMinor&&!faded){
        const xf=(_xferMap&&_xferMap[s.n])||[];
        const hasTrain=_isTrainStn(s.n);
        if(xf.length||hasTrain){
          const fs=isEnd?12:11, tw=s.n.length*fs; // ì—­ëª… í­ ê·¼ì‚¬
          let dx0, dy0=ty-3.5;
          if(anchor==='start')dx0=tx+tw+5;
          else if(anchor==='end')dx0=tx-tw-5-(xf.length-1)*8-(hasTrain?11:0);
          else dx0=tx+tw/2+5;
          xf.slice(0,5).forEach((l2,k)=>{
            parts.push(`<circle cx="${dx0+k*8}" cy="${dy0}" r="3.1" fill="${l2.color}" stroke="var(--bg2)" stroke-width="1" pointer-events="none"><title>${l2.name} í™˜ìŠ¹</title></circle>`);
          });
          if(xf.length>5)parts.push(`<text x="${dx0+5*8}" y="${dy0+3}" fill="#8b949e" font-size="8" pointer-events="none" font-family="Noto Sans KR,sans-serif">+${xf.length-5}</text>`);
          if(hasTrain){const ix=dx0+Math.min(xf.length,5)*8+(xf.length?3:0);parts.push(`<rect x="${ix}" y="${dy0-3.5}" width="7" height="7" rx="1.5" fill="none" stroke="var(--text2)" stroke-width="1" pointer-events="none"><title>ì¼ë°˜ì² ë„ í™˜ìŠ¹</title></rect>`);}
        }
      }
    });
  });

  parts.push(`<text x="14" y="22" fill="${reachView?'var(--accent)':journeyView?'var(--accent)':trackedView?_trkColor:line.color}" font-size="14" font-weight="700" font-family="Noto Sans KR,sans-serif">${reachView?`${reachView.origin}ì—ì„œ í™˜ìŠ¹ ì—†ì´ ê°ˆ ìˆ˜ ìˆëŠ” ì—­`:journeyView?`${journeyView.from} â†’ ${journeyView.to} ì´ë™ ê²½ë¡œ`:trackedView?`${_trk.grade} ${_trk.no} Â· ${_trk.stops[0].s}â†’${_trk.stops[_trk.stops.length-1].s} ìš´í–‰ êµ¬ê°„`:line.name}</text>`);
  parts.push('</svg>');

  // ì¤Œ ì»¨íŠ¸ë¡¤ (ì¢Œìƒë‹¨ ê³ ì •, ì ‘ê¸° ê°€ëŠ¥) â€” ë Œë”ë§ˆë‹¤ ë¦¬ì…‹ë˜ì§€ ì•Šë„ë¡ í˜„ì¬ ë°°ìœ¨ ìœ ì§€
  parts.unshift(_zoomCtlHTML());
  document.getElementById('map-svg-wrap').innerHTML=parts.join('');
  _mapApplyZoom();
  _mapBindPinch();

  // ë²”ë¡€
  document.getElementById('map-legend').innerHTML=reachView?`
    <div class="map-reach-summary"><strong>${reachView.origin}</strong><span>í™˜ìŠ¹ ì—†ì´ ê°ˆ ìˆ˜ ìˆëŠ” ì—­ ${Math.max(0,reachView.stations.size-1).toLocaleString()}ê³³</span><button type="button" onclick="clearStationReachabilityMap()">ì „ì²´ë³´ê¸°ë¡œ ëŒì•„ê°€ê¸°</button></div>
  `:journeyView?`<div class="map-reach-summary"><strong>${journeyView.from} â†’ ${journeyView.to}</strong><span>${journeyView.via?`${journeyView.via} ê²½ìœ  Â· `:''}${journeyView.segments.length>1?`í™˜ìŠ¹ ${journeyView.segments.length-1}íšŒ`:'ì§í†µ'}</span><button type="button" onclick="_metroJourneyMap=null;renderMapTabForMode()">ì „ì²´ë³´ê¸°ë¡œ ëŒì•„ê°€ê¸°</button></div>`:trackedView?`
    <div class="map-legend-item"><div class="map-legend-line" style="background:${_trkColor}"></div><span>${_trk.grade} ${_trk.no} ìš´í–‰ êµ¬ê°„</span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#161b22" stroke="${_trkColor}" stroke-width="2"/></svg><span>ì •ì°¨ì—­</span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="3.5" fill="#161b22" stroke="${_trkColor}" stroke-width="1.5" opacity="0.35"/></svg><span>í†µê³¼ì—­</span></div>
  `:`
    <div class="map-legend-item"><div class="map-legend-line" style="background:${line.color}"></div><span>${line.name} ë³¸ì„ </span></div>
    <div class="map-legend-item"><div class="map-legend-line" style="background:transparent;border-top:3px dashed ${line.color};height:0;opacity:.85"></div><span>ì§€ì„  / ê²½ìœ </span></div>
    <div class="map-legend-item" style="gap:8px"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#161b22" stroke="${line.color}" stroke-width="2"/></svg><span>ì—­ (í´ë¦­í•˜ì—¬ ì •ë³´ í™•ì¸)</span></div>
    <div class="map-legend-item" style="gap:8px;margin-left:8px">
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#3b82f6"/></svg><span style="font-size:11px">KTX</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#a855f7"/></svg><span style="font-size:11px">SRT</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#ef4444"/></svg><span style="font-size:11px">ITX-ìƒˆë§ˆì„</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#22c55e"/></svg><span style="font-size:11px">ITX-ì²­ì¶˜</span>
      <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#f97316"/></svg><span style="font-size:11px">ë¬´ê¶í™”</span>
    </div>
  `;
  // í˜„ì¬ ë…¸ì„  ì €ì¥ í›„ ì—´ì°¨ ì˜¤ë²„ë ˆì´ ì‹œì‘
  _mapCurrentLine = lineKey;
  _mapStnPos = stnPos;
  _mapSvgSize = {w:svgW, h:svgH, ox, oy};
  updateMapTrains();
  if(reachView&&stnPos[reachView.origin])setTimeout(()=>{
    const host=document.getElementById('map-svg-wrap'),p=stnPos[reachView.origin];
    if(host&&p){host.scrollLeft=p.x-host.clientWidth/2;host.scrollTop=p.y-host.clientHeight/2;}
  },80);
  // ë¯¸ë‹ˆë§µ ì´ˆê¸°í™”
  setTimeout(updateMinimap, 100);
  const wrap=document.getElementById('map-svg-wrap');
  if(wrap) wrap.onscroll=updateMinimap;
  // í™•ëŒ€/ì¶•ì†Œ ì´ˆê¸°í™”
  initMapZoom();
  // ê³ ì • ì˜¤ë²„ë ˆì´ ë²„íŠ¼ ì—…ë°ì´íŠ¸
  _updateMapOverlay();
}



// â”€â”€ ê²€ìƒ‰ íˆìŠ¤í† ë¦¬ â”€â”€
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

// íˆìŠ¤í† ë¦¬ ì €ì¥ì€ ê° í•¨ìˆ˜ ë‚´ë¶€ì—ì„œ ì²˜ë¦¬





// â”€â”€ ë…¸ì„ ë„ ê³ ì • ì˜¤ë²„ë ˆì´ (ì¶”ì  ì—´ì°¨ ë²„íŠ¼) â”€â”€
function _updateMapOverlay(){
  // ì¶”ì  ì¤‘ì´ ì•„ë‹ˆë©´ ì˜¤ë²„ë ˆì´ ìì²´ë¥¼ ì œê±°
  if(!_mapTrackedTrain){
    const old=document.getElementById('map-track-overlay');
    if(old) old.remove();
    return;
  }

  let overlay=document.getElementById('map-track-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='map-track-overlay';
    // í—¤ë”(56px) ë°”ë¡œ ì•„ë˜, ìš°ì¸¡ ìƒë‹¨ ê³ ì •
    overlay.style.cssText='position:fixed;z-index:200;top:64px;right:10px;display:flex;flex-direction:column;gap:6px;pointer-events:all';
    document.body.appendChild(overlay);
  }
  overlay.style.display='flex';

  const t=getTrainByNo(_mapTrackedTrain);
  const status=t?getCurrentStatus(t):null;
  let posLabel='â€”';
  if(status){
    if(status.status==='running'){
      posLabel=status.atStn?`${status.atStn} ì •ì°¨`
        :(status.nextStn?`â†’ ${status.nextStn}`:'ìš´í–‰ ì¤‘');
    } else if(status.status==='done') posLabel='ìš´í–‰ ì¢…ë£Œ';
    else posLabel='ìš´í–‰ ì „';
  }
  const color=t?GRADE_COLORS[t.grade]||'#888':'#888';
  overlay.innerHTML=`
    <div style="background:var(--bg2);border:1px solid ${color};border-radius:10px;padding:7px 10px;font-size:11px;line-height:1.4;max-width:130px;box-shadow:0 3px 12px rgba(0,0,0,.5)">
      <div style="font-weight:700;color:${color};margin-bottom:2px">${t?t.grade+' ':''}<span style="font-size:13px">${_mapTrackedTrain}</span></div>
      <div style="color:var(--text2)">${posLabel}</div>
    </div>
    <button onclick="_scrollToTrackedTrain();_updateMapOverlay()"
      style="padding:7px 11px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.5);text-align:left">
      ğŸ“ ìœ„ì¹˜ ë³´ê¸°
    </button>
    <button onclick="shareTrainLink('${_mapTrackedTrain}')"
      style="padding:7px 11px;border-radius:8px;border:none;background:var(--bg3);color:var(--text1);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.4);text-align:left">
      ğŸ”— ë§í¬ ë³µì‚¬
    </button>
    <button onclick="_clearTrainTracking()"
      style="padding:5px 11px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:11px;cursor:pointer;font-family:inherit">
      âœ• ì¶”ì  í•´ì œ
    </button>`;
}

function _clearTrainTracking(){
  _mapTrackedTrain=null;
  // ì˜¤ë²„ë ˆì´ ì™„ì „ ì œê±°
  const overlay=document.getElementById('map-track-overlay');
  if(overlay) overlay.remove();
  // ì§€ë„ ì¬ë Œë”ë¡œ ì¶”ì  ê²½ë¡œ ì˜¤ë²„ë ˆì´ ì œê±° í›„ ì „ì²´ ì—´ì°¨ ë‹¤ì‹œ í‘œì‹œ
  if(_mapCurrentLine) showMapLine(_mapCurrentLine, document.querySelector('.map-line-tab.active'));
  updateMapTrains();
}

// â”€â”€ ì—´ì°¨ ê³µìœ  â”€â”€
function shareTrainLink(no){
  const url=`${location.origin}${location.pathname}?train=${no}`;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>alert('ë§í¬ê°€ ë³µì‚¬ëìŠµë‹ˆë‹¤!\n'+url));
  } else {
    prompt('ì•„ë˜ ë§í¬ë¥¼ ë³µì‚¬í•˜ì„¸ìš”:',url);
  }
}

// URL íŒŒë¼ë¯¸í„°ë¡œ ì—´ì°¨ ë°”ë¡œ ì¡°íšŒ
window.addEventListener('load',()=>{
  const params=new URLSearchParams(location.search);
  const trainNo=params.get('train');
  if(trainNo){
    document.getElementById('input-trainno').value=trainNo;
    setTimeout(()=>searchByTrain(),500);
  }
});

// â”€â”€ ì—­ë³„ ì‹œê°„í‘œ ì²«ì°¨/ë§‰ì°¨ â”€â”€
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
    // AM 4:00(240ë¶„) ê¸°ì¤€: 240ë¶„ ë¯¸ë§Œì€ ìµì¼ë¡œ ì²˜ë¦¬ (+1440)
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

// â”€â”€ ë§‰ì°¨ ì‹œê° í‘œì‹œ í•¨ìˆ˜ (searchByStationì—ì„œ í˜¸ì¶œ) â”€â”€
function renderFirstLastTrains(stn){
  const data=getStationFirstLast(stn);
  if(!data.length)return '';
  // destë³„ë¡œ ì²«ì°¨/ë§‰ì°¨ í‘œì‹œ
  const rows=data.map(d=>{
    const dirLbl=d.dir==='down'?'í•˜í–‰':'ìƒí–‰';
    return `<span class="first-last-item"><span class="fl-dest">${d.dest}í–‰</span><span class="fl-dir">${dirLbl}</span><span class="fl-time">ì²« ${d.firstT}</span><span class="fl-sep">Â·</span><span class="fl-time">ë§‰ ${d.lastT}</span></span>`;
  }).join('');
  return `<div class="first-last-wrap">${rows}</div>`;
}

// â”€â”€ í†µê³„ íƒ­ â”€â”€
function renderStats(){
  const el=document.querySelector('#panel-stats #result-stats')||document.getElementById('result-stats');
  if(!el)return;
  try{

  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();

  // ì „ì²´ ì—´ì°¨ ìˆ˜
  const total=ALL_TRAINS.length;

  // ë“±ê¸‰ë³„ í†µê³„
  const gradeCount={};
  ALL_TRAINS.forEach(t=>{gradeCount[t.grade]=(gradeCount[t.grade]||0)+1;});

  // ë…¸ì„ ë³„ í†µê³„
  const lineCount={};
  ALL_TRAINS.forEach(t=>{
    const lines=(t.line||'').split('Â·');
    lines.forEach(l=>{const ll=l.trim();lineCount[ll]=(lineCount[ll]||0)+1;});
  });

  // í˜„ì¬ ìš´í–‰ ì¤‘ (ì—´ì°¨ë²ˆí˜¸ ì˜¤ë¦„ì°¨ìˆœ)
  const runningTrains=ALL_TRAINS.filter(t=>{
    const st=getCurrentStatus(t);
    return st&&st.status==='running';
  }).sort((a,b)=>(parseInt(a.no)||0)-(parseInt(b.no)||0));
  const running=runningTrains.length;

  // ë…¸ì„ ë³„ ì²«ì°¨/ë§‰ì°¨ ê³„ì‚°
  const lineFirstLast={};
  const LINE_NAMES=['ê²½ë¶€ì„ ','ê²½ë¶€ê³ ì†ì„ ','í˜¸ë‚¨ì„ ','ì „ë¼ì„ ','ì¤‘ì•™ì„ ','ë™í•´ì„ ','ì˜ë™ì„ ','ê°•ë¦‰ì„ ','ì¤‘ë¶€ë‚´ë¥™ì„ ','ê²½ì „ì„ '];
  LINE_NAMES.forEach(ln=>{
    lineFirstLast[ln]={name:ln,downFirst:null,downLast:null,upFirst:null,upLast:null};
  });
  ALL_TRAINS.forEach(t=>{
    const lines=t.line.split('Â·').map(l=>l.trim());
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
      // AM 4:00 ê¸°ì¤€ ë³´ì •
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

  // â”€â”€ ì—­ë³„ ì •ì°¨ íšŸìˆ˜ TOP 10 â”€â”€
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
      <span class="stat-num">${cnt}íšŒ</span>
    </div>`).join('');

  // â”€â”€ ë…¸ì„ ë³„ ìš´í–‰ ë°€ë„ â”€â”€
  const peakHours=[7,8,9,17,18,19]; // í”¼í¬: ì¶œí‡´ê·¼
  const offHours=[10,11,13,14,15];  // í•œì‚°: ë‚®
  const densityData={};
  LINE_NAMES.forEach(ln=>{ densityData[ln]={peak:0,off:0}; });
  ALL_TRAINS.forEach(t=>{
    const lines=t.line.split('Â·').map(l=>l.trim());
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
        <span style="min-width:36px;font-size:11px;color:#f97316">í”¼í¬</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(d.peak/maxD*100)}%;background:#f97316"></div></div>
        <span class="stat-num">${d.peak}</span>
      </div>
      <div class="stat-row">
        <span style="min-width:36px;font-size:11px;color:var(--accent)">í•œì‚°</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(d.off/maxD*100)}%"></div></div>
        <span class="stat-num">${d.off}</span>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  const firstLastStatRows=LINE_NAMES.map(ln=>{
    const d=lineFirstLast[ln];
    if(!d.downFirst&&!d.upFirst)return '';
    const downPart=d.downFirst?`<span class="fl-stat-item"><span class="fl-stat-dir">í•˜í–‰â†“</span><span class="fl-stat-time">${d.downFirst}</span><span style="color:var(--text3)">~</span><span class="fl-stat-time">${d.downLast||'-'}</span></span>`:'';
    const upPart=d.upFirst?`<span class="fl-stat-item"><span class="fl-stat-dir">ìƒí–‰â†‘</span><span class="fl-stat-time">${d.upFirst}</span><span style="color:var(--text3)">~</span><span class="fl-stat-time">${d.upLast||'-'}</span></span>`:'';
    return `<div class="fl-stat-row"><span class="fl-stat-name">${ln}</span><div class="fl-stat-times">${downPart}${upPart}</div></div>`;
  }).filter(Boolean).join('');
  const makeChips=(trains)=>trains.map(t=>{
    const c=GRADE_COLORS[t.grade]||'var(--accent)';
    return `<span onclick="jumpToTrain('${t.no}')" style="cursor:pointer;padding:2px 8px;border-radius:10px;border:1px solid ${c};color:${c};font-size:11px;background:rgba(0,0,0,.2)">${t.no}</span>`;
  }).join('');
  const CHIP_LIMIT=30;
  const runningChips=makeChips(runningTrains.slice(0,CHIP_LIMIT))
    +(runningTrains.length>CHIP_LIMIT
      ? `<span class="badge" style="cursor:pointer;margin-left:4px" onclick="showAllRunningTrains()">ì™¸ ${runningTrains.length-CHIP_LIMIT}í¸ ë” ë³´ê¸° â–¾</span>`
      : '');

  // ìš´í–‰ ì „/ì¢…ë£Œ
  const before=ALL_TRAINS.filter(t=>{const st=getCurrentStatus(t);return st&&st.status==='before';}).length;
  const done=ALL_TRAINS.filter(t=>{const st=getCurrentStatus(t);return st&&st.status==='done';}).length;

  // ì‹œê°„ëŒ€ë³„ ìš´í–‰ëŸ‰ (1ì‹œê°„ ë‹¨ìœ„)
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
      <span class="stat-num">${c}í¸</span>
    </div>`).join('');

  const lineRows=Object.entries(lineCount).sort((a,b)=>b[1]-a[1]).map(([l,c])=>`
    <div class="stat-row">
      <span style="min-width:80px">${l}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.round(c/total*100)}%"></div></div>
      <span class="stat-num">${c}í¸</span>
    </div>`).join('');

  const hourlyBars=hourly.map((v,h)=>`
    <div class="hourly-col">
      <div class="hourly-val">${v>0?v:''}</div>
      <div class="hourly-bar" style="height:${maxHourly?Math.round(v/maxHourly*70):0}px" title="${h}ì‹œ: ${v}íšŒ"></div>
      <div class="hourly-label">${h%3===0?h:''}</div>
    </div>`).join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">ğŸ“Š ìš´í–‰ í†µê³„</div></div>

    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card-num">${total}</div><div class="stat-card-label">ì „ì²´ ì—´ì°¨</div></div>
      <div class="stat-card running"><div class="stat-card-num">${running}</div><div class="stat-card-label">ìš´í–‰ ì¤‘</div></div>
      <div class="stat-card before"><div class="stat-card-num">${before}</div><div class="stat-card-label">ìš´í–‰ ì „</div></div>
      <div class="stat-card done"><div class="stat-card-num">${done}</div><div class="stat-card-label">ìš´í–‰ ì¢…ë£Œ</div></div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">ë“±ê¸‰ë³„</div>
      ${gradeRows}
    </div>

    <div class="stat-section">
      <div class="stat-section-title">ë…¸ì„ ë³„ ìš´í–‰ í˜„í™©</div>
      ${lineRows}
    </div>
    <div class="stat-section">
      <div class="stat-section-title">í˜„ì¬ ìš´í–‰ ì¤‘ ì—´ì°¨</div>
      <div class="running-chips-wrap" style="display:flex;flex-wrap:wrap;gap:6px">${runningChips}</div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">ë°ì´í„° ì ê²€</div>
      <button class="btn" style="font-size:12px;padding:6px 12px" onclick="runDataAnomalyCheck()">ğŸ” ì¢Œí‘œÂ·ê±°ë¦¬Â·ë²ˆí˜¸ ì´ìƒì¹˜ ì ê²€</button>
      <div id="stat-anomaly-result" style="margin-top:8px"></div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">ì‹œê°„ëŒ€ë³„ ìš´í–‰ëŸ‰</div>
      <div class="hourly-scroll"><div class="hourly-chart">${hourlyBars}</div></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">ë…¸ì„ ë³„ ì²«ì°¨ Â· ë§‰ì°¨</div>
      <div class="first-last-stats">${firstLastStatRows}</div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">ì—­ë³„ ì •ì°¨ íšŸìˆ˜ TOP 10</div>
      <div>${topStationsRows}</div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">ì—­ë³„ ì²«ì°¨ Â· ë§‰ì°¨</div>
      <div class="stat-search-row">
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-stn-input" placeholder="ì—­ëª… ì…ë ¥" autocomplete="off"
            oninput="acShow('stat-stn-input','ac-stat-stn')"
            onkeydown="acKey(event,'stat-stn-input','ac-stat-stn')"
            onblur="setTimeout(()=>acHide('ac-stat-stn'),150)">
          <div class="ac-dropdown" id="ac-stat-stn"></div>
        </div>
        <button class="btn stat-search-btn" onclick="calcStationFirstLast()">ì¡°íšŒ</button>
      </div>
      <div id="stat-stn-fl-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">êµ¬ê°„ë³„ ìš´í–‰ ì—´ì°¨ ìˆ˜</div>
      <div class="stat-search-row">
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-from" placeholder="ì¶œë°œì—­" autocomplete="off"
            oninput="acShow('stat-from','ac-stat-from')"
            onkeydown="acKey(event,'stat-from','ac-stat-from')"
            onblur="setTimeout(()=>acHide('ac-stat-from'),150)">
          <div class="ac-dropdown" id="ac-stat-from"></div>
        </div>
        <span class="stat-search-arrow">â†’</span>
        <div class="autocomplete-wrap stat-search-input">
          <input type="text" id="stat-to" placeholder="ë„ì°©ì—­" autocomplete="off"
            oninput="acShow('stat-to','ac-stat-to')"
            onkeydown="acKey(event,'stat-to','ac-stat-to')"
            onblur="setTimeout(()=>acHide('ac-stat-to'),150)">
          <div class="ac-dropdown" id="ac-stat-to"></div>
        </div>
        <button class="btn stat-search-btn" onclick="calcSectionTrains()">ì¡°íšŒ</button>
      </div>
      <div id="stat-section-result"></div>
    </div>
    <div class="stat-section">
      <div class="stat-section-title">ë…¸ì„ ë³„ ìš´í–‰ ë°€ë„ (í”¼í¬ vs í•œì‚°)</div>
      <div>${densityRows}</div>
    </div>
    <p class="hint">â€» ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} í˜„ì¬ ê¸°ì¤€ Â· AM 4:00 ê¸°ì¤€ì¼</p>`;
  }catch(e){
    el.innerHTML=`<div class="empty"><div class="empty-icon">âš ï¸</div><p>í†µê³„ ë¡œë”© ì˜¤ë¥˜<br><small style="color:var(--text3)">${e.message}</small></p><button class="btn" onclick="renderStats()" style="margin-top:12px">ğŸ”„ ë‹¤ì‹œ ì‹œë„</button></div>`;
  }
}


// â”€â”€ ì•ŒëŒ í…ŒìŠ¤íŠ¸ â”€â”€
function testAlarm(){
  requestNotifPermission(()=>{
    sendNotification('ğŸ”” ë‹˜ë¹„ë ˆì¼ ì•ŒëŒ í…ŒìŠ¤íŠ¸','ì•ŒëŒì´ ì •ìƒì ìœ¼ë¡œ ì‘ë™í•©ë‹ˆë‹¤!');
  });
}


// â”€â”€ ê³µì§€ì‚¬í•­ ë°ì´í„° (ì½ê¸° ì „ìš© - ì½”ë“œì—ì„œë§Œ ì¶”ê°€) â”€â”€
// â”€â”€ ê³µì§€ì‚¬í•­ ë Œë”ë§ â”€â”€
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

// ê³µì§€ ì¹´í…Œê³ ë¦¬ ì •ì˜ (ìƒ‰ìƒ/ì•„ì´ì½˜)
const NOTICE_CATEGORIES={
  update:  {label:'ì•± ì—…ë°ì´íŠ¸', icon:'ğŸ“±', color:'#388bfd'},
  timetable:{label:'ì‹œê°„í‘œ ê°œì •', icon:'ğŸ•', color:'#f97316'},
  route:   {label:'ë…¸ì„  ì •ë³´',   icon:'ğŸ—ºï¸', color:'#3fb950'},
  service: {label:'ìš´í–‰ ì•ˆë‚´',   icon:'âš ï¸', color:'#f85149'},
};
function noticeCatBadge(catKey, size){
  const c=NOTICE_CATEGORIES[catKey];
  if(!c)return '';
  const sm=size==='sm';
  return `<span class="notice-cat${sm?' sm':''}" style="color:${c.color};border-color:${c.color}66;background:${c.color}1a">${c.icon} ${c.label}</span>`;
}

// í˜„ì¬ ì„ íƒëœ ê³µì§€ í•„í„° ì¹´í…Œê³ ë¦¬
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
    el.innerHTML=`<div class="empty"><div class="empty-icon">ğŸ“¢</div><p>ë“±ë¡ëœ ê³µì§€ì‚¬í•­ì´ ì—†ìŠµë‹ˆë‹¤.</p></div>`;
    return;
  }
  const read=getReadNotices();

  // ì¹´í…Œê³ ë¦¬ í•„í„° íƒ­
  const catCounts={all:NOTICES.length};
  Object.keys(NOTICE_CATEGORIES).forEach(k=>{catCounts[k]=NOTICES.filter(n=>n.cat===k).length;});
  const filterTabs=`<div class="notice-filter-tabs">
    <button class="notice-filter-tab${_noticeFilterCat==='all'?' active':''}" onclick="setNoticeFilter('all')">ì „ì²´ ${catCounts.all}</button>
    ${Object.entries(NOTICE_CATEGORIES).map(([k,c])=>
      catCounts[k]>0?`<button class="notice-filter-tab${_noticeFilterCat===k?' active':''}" style="${_noticeFilterCat===k?`background:${c.color}1a;color:${c.color};border-color:${c.color}66`:''}" onclick="setNoticeFilter('${k}')">${c.icon} ${c.label} ${catCounts[k]}</button>`:''
    ).join('')}
  </div>`;

  const filtered=_noticeFilterCat==='all'?NOTICES:NOTICES.filter(n=>n.cat===_noticeFilterCat);

  if(!filtered.length){
    el.innerHTML=`<div class="result-header"><div class="result-title">ğŸ“¢ ê³µì§€ì‚¬í•­</div></div>${filterTabs}<div class="empty"><div class="empty-icon">ğŸ“­</div><p>í•´ë‹¹ ì¹´í…Œê³ ë¦¬ì— ê³µì§€ê°€ ì—†ìŠµë‹ˆë‹¤.</p></div>`;
    return;
  }

  // ìµœì‹ ìˆœ(ë°°ì—´ ì—­ìˆœ) - ì›ë³¸ ì¸ë±ìŠ¤ ìœ ì§€í•´ì„œ openNoticeDetailì— ì •í™•í•œ idx ì „ë‹¬
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
        <span class="notice-arrow">â€º</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div class="result-header"><div class="result-title">ğŸ“¢ ê³µì§€ì‚¬í•­</div><span class="badge blue">${NOTICES.length}ê±´</span></div>
    ${filterTabs}
    <div class="notice-list">${rows}</div>`;
  }catch(e){
    el.innerHTML=`<div class="empty"><div class="empty-icon">âš ï¸</div><p>ê³µì§€ ë¡œë”© ì˜¤ë¥˜<br><small>${e.message}</small></p><button class="btn" onclick="renderNotice()">ğŸ”„</button></div>`;
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
        <button class="notice-popup-close" onclick="closeNoticeDetail()">âœ•</button>
      </div>
      ${noticeCatBadge(n.cat)}
      <div class="notice-popup-title">${n.title}</div>
      <div class="notice-popup-body">${n.body}</div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeNoticeDetail(){
  document.querySelectorAll('.notice-popup-backdrop').forEach(e=>e.remove());
  renderNotice(); // ì½ìŒ ìƒíƒœ ë°˜ì˜
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸ« ê°€ìƒ ìŠ¹ì°¨ê¶Œ ì˜ˆë§¤ ì‹œìŠ¤í…œ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const TICKET_KEY='nimbi_tickets';
function loadTickets(){try{return JSON.parse(localStorage.getItem(TICKET_KEY))||[];}catch(e){return[];}}
function saveTickets(t){localStorage.setItem(TICKET_KEY,JSON.stringify(t));}

// ì¢Œì„ ë“±ê¸‰ (ì—´ì°¨ ë“±ê¸‰ë³„ë¡œ ì œê³µ ë“±ê¸‰ì´ ë‹¤ë¦„)
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
function refreshBookingSeatOptions(){
  const args=window._bArgs||{},train=getTrainByNo(args.trainNo),date=document.getElementById('booking-date')?.value||todayLocalStr();
  if(!train)return;
  const count=window._bookingPassengerCount||1;
  document.querySelectorAll('#booking-popup-wrap .booking-seat-option').forEach(btn=>{
    const cls=btn.dataset.class;
    const meta=seatClassSaleMeta(train,args.fromStn,args.toStn,date,cls);
    let disabled=!meta.eligible||meta.available<=0;
    // ì¢Œì„ ë“±ê¸‰ì´ ì „ êµ¬ê°„ ë§¤ì§„ì´ì–´ë„ ê²°í•©ê¶Œ(ì…ì„+ì¢Œì„)ì´ ì„±ë¦½í•˜ë©´ ì„ íƒ ê°€ëŠ¥í•˜ê²Œ ìœ ì§€
    let mixable=false,mix=null;
    if(disabled&&cls!=='standing'&&typeof computeMixedSegments==='function'){
      mix=computeMixedSegments(train,args.fromStn,args.toStn,date,count,cls);
      if(mix){mixable=true;disabled=false;}
    }
    btn.disabled=disabled;btn.style.opacity=disabled?'.45':'1';btn.style.cursor=disabled?'not-allowed':'pointer';
    btn.title=mixable?'ì¼ë¶€ êµ¬ê°„ ë§¤ì§„ â€” ì…ì„+ì¢Œì„ ê²°í•©ê¶Œìœ¼ë¡œ ì˜ˆë§¤ ê°€ëŠ¥':(meta.reason||'');
    const label=btn.querySelector('.booking-seat-label');
    if(label)label.textContent=mixable?`${meta.label} Â· ì…ì„ï¼‹ì¢Œì„ ê°€ëŠ¥`:meta.label+(meta.reason?`${meta.reason.startsWith('(')?' ':' Â· '}${meta.reason}`:'');
    // ê²°í•©ê¶Œì´ë©´ ì‹¤ì œ(êµ¬ê°„ í•©ì‚°) ìš´ì„ìœ¼ë¡œ í‘œì‹œ
    const fareEl=btn.querySelector('.booking-seat-fare');
    if(fareEl&&mixable){const disc=window._bookingDiscount||'none';fareEl.textContent=mix.reduce((a,r)=>a+applyDiscount(r.baseFarePerPerson,disc),0).toLocaleString()+'ì›';}
    if(disabled&&btn.classList.contains('active')){
      btn.classList.remove('active');window._bookingSeatClass=null;
      const confirm=document.getElementById('booking-confirm-btn');
      if(confirm){confirm.disabled=true;confirm.textContent='ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•˜ì„¸ìš”';}
    }
  });
}

// ê±°ë¦¬ë¹„ë¡€ ìš´ì„: ë“±ê¸‰ë³„ ê¸°ë³¸ìš´ì„ + ê±°ë¦¬(km)Ã—ë“±ê¸‰ kmë‹¨ê°€ + ì¢Œì„ë“±ê¸‰ ë°°ìœ¨
// {base: ê¸°ë³¸ìš´ì„, rate: ì›/km, min: ìµœì €ìš´ì„}
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
// ì¢Œì„ ìë™ ë°°ì • (ê°€ìƒ - ì¢Œì„ë°°ì¹˜ë„ ì—°ë™ ì „ê¹Œì§€ ì„ì‹œ)
function randomSeat(seatClass, trainNo){
  if(seatClass==='standing') return 'ì…ì„';
  // í¸ì„± ê¸°ë°˜ìœ¼ë¡œ ì‹¤ì œ ì¢Œì„ í˜•ì‹(ì—°ë²ˆ/ì—´+ë¬¸ì)ì— ë§ì¶° ë°°ì •
  const grade = trainNo ? (getTrainByNo(trainNo)||{}).grade : null;
  const comp = getCarComposition(getFormationType(grade||'ë¬´ê¶í™”í˜¸', trainNo));
  let pool = getCarsForClass(comp, seatClass);
  if(!pool.length) pool = comp.filter(c=>c.type!=='free');
  if(!pool.length) return `1í˜¸ì°¨ 1A`;
  const c = pool[Math.floor(Math.random()*pool.length)];
  if(c.numbered){
    const total=c.totalSeats||72;
    return `${c.car}í˜¸ì°¨ ${Math.floor(Math.random()*total)+1}ë²ˆ`;
  }
  const cols=c.cols||['A','B','C','D'];
  const missing=new Set(c.missingSeats||[]);
  const rows=c.rows||15;
  let row,col,code,guard=0;
  do{ row=Math.floor(Math.random()*rows)+1; col=cols[Math.floor(Math.random()*cols.length)]; code=`${row}${col}`; guard++; }while(missing.has(code)&&guard<25);
  return `${c.car}í˜¸ì°¨ ${row}${col}`;
}

function genTicketId(){
  const d=new Date();
  const ymd=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand=Math.random().toString(36).slice(2,7).toUpperCase();
  return `NB${ymd}${rand}`;
}

// ì˜ˆë§¤ íŒì—… ì—´ê¸° (ì—´ì°¨ ìƒì„¸/ì¶œë„ì°© ê²°ê³¼ì—ì„œ í˜¸ì¶œ)
function openBookingPopup(trainNo, fromStn, toStn, depTime, arrTime, travelDate){
  const t=getTrainByNo(trainNo);
  if(!t){alert('ì—´ì°¨ ì •ë³´ë¥¼ ì°¾ì„ ìˆ˜ ì—†ìŠµë‹ˆë‹¤.');return;}
  const initialPassengerCount=Math.max(1,Math.min(6,Number(window._bookingPassengerCount)||1));
  // book-detail-backdrop(z-index:9900)ì´ booking popup(z-index:9400)ì„ ê°€ë¦¬ëŠ” ê²ƒ ë°©ì§€
  document.getElementById('book-detail-wrap')?.remove();
  const classes=availableSeatClasses(t.grade);
  const old=document.getElementById('booking-popup-wrap');
  if(old)old.remove();
  // ëª¨ë°”ì¼ onclick íŒŒì‹± ì˜¤ë¥˜ ë°©ì§€: ì¸ìë¥¼ ì „ì—­ì— ì €ì¥
  window._bArgs={trainNo,fromStn,toStn,depTime,arrTime};

  const wrap=document.createElement('div');
  wrap.id='booking-popup-wrap';
  wrap.style.cssText='position:fixed;top:0;right:0;bottom:0;left:0;z-index:9400;pointer-events:auto';
  const classOpts=classes.map(c=>{
    const fare=calcFare(t,fromStn,toStn,c);
    // inline onclick ì œê±° â†’ addEventListenerë¡œ ë“±ë¡ (iOS Safari í˜¸í™˜)
    return `<button class="booking-seat-option" data-class="${c}">
      <span class="booking-seat-label">${SEAT_CLASSES[c].label}</span>
      <span class="booking-seat-fare">${fare.toLocaleString()}ì›</span>
    </button>`;
  }).join('');

  // íƒ‘ìŠ¹ì¼: ì˜¤ëŠ˜ ~ 1ê°œì›” í›„ (ë¡œì»¬ ì‹œê°„ ê¸°ì¤€, UTC ë³€í™˜ìœ¼ë¡œ ì¸í•œ ë‚ ì§œ ë°€ë¦¼ ë°©ì§€)
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
          <div class="alarm-popup-title" style="margin-bottom:0">ğŸ« ${t.grade} ${trainNo}</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="booking-clock"></div>
        </div>
        <div class="alarm-popup-sub">${fromStn} ${depTime||''} â†’ ${toStn} ${arrTime||''}</div>
        ${(()=>{const d=durMin(depTime,arrTime);return d!=null?`<div class="alarm-popup-sub" style="margin-top:-2px;color:var(--text3)">ì†Œìš” ${fmtDurKor(d)}</div>`:'';})()}
        <div id="booking-delay-banner-slot">${_bookingDelayBannerHTML(t,travelDate&&travelDate>=minDate?travelDate:minDate)}</div>
        <div class="booking-date-section">
          <div class="booking-section-label">íƒ‘ìŠ¹ì¼</div>
          <input type="date" id="booking-date" value="${travelDate&&travelDate>=minDate?travelDate:minDate}" min="${minDate}" max="${maxDate}" class="booking-date-input">
        </div>
        <div class="booking-seat-section">
          <div class="booking-section-label">ì¢Œì„ ë“±ê¸‰</div>
          <div class="booking-seat-options">${classOpts}</div>
        </div>
        <div class="booking-passenger-section">
          <div class="booking-section-label">ì¢Œì„ ì„ íƒ <span style="font-size:11px;color:var(--text3);font-weight:400">(ì„ íƒ ì•ˆ í•˜ë©´ ìë™ ë°°ì •)</span></div>
          <button class="btn" id="booking-seat-select-btn" disabled style="width:100%;justify-content:center;margin-bottom:12px;font-size:13px;gap:6px;opacity:.4;cursor:not-allowed">
            ğŸª‘ ì§ì ‘ ì„ íƒ â€” <span id="booking-seat-display" style="color:var(--accent2)">ë“±ê¸‰ ì„ íƒ í›„ ê°€ëŠ¥</span>
          </button>
          <div class="booking-section-label">ì¸ì›</div>
          <div class="booking-passenger-control">
            <button class="booking-stepper-btn" id="booking-stepper-minus">âˆ’</button>
            <span id="booking-passenger-count">${initialPassengerCount}</span>
            <button class="booking-stepper-btn" id="booking-stepper-plus">+</button>
          </div>
        </div>
        <div class="booking-passenger-section">
          <div class="booking-section-label">í• ì¸ <span style="font-size:11px;color:var(--text3);font-weight:400">(ìŠ¹ì°¨ê¶Œì— í‘œì‹œ)</span></div>
          <div class="booking-discount-options" id="booking-discount-options">
            ${Object.entries(DISCOUNTS).map(([k,d])=>`<button class="booking-discount-option${k==='none'?' active':''}" data-discount="${k}">${d.label}${d.rate?`<span class="booking-discount-rate">${Math.round(d.rate*100)}%â†“</span>`:''}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="flex-shrink:0;padding-top:8px">
        <button class="btn btn-primary booking-confirm-btn" id="booking-confirm-btn" disabled>ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•˜ì„¸ìš”</button>
        <button class="alarm-popup-close" id="booking-cancel-btn">ì·¨ì†Œ</button>
      </div>
    </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e=>{ if(e.target===wrap||e.target===wrap.firstElementChild) closeBookingPopup(); });
  // addEventListener ë°©ì‹ìœ¼ë¡œ ë²„íŠ¼ ì´ë²¤íŠ¸ ë“±ë¡ (iOS Safari overflow:auto ë‚´ë¶€ onclick ë¯¸ë™ì‘ ë°©ì§€)
  wrap.querySelectorAll('.booking-seat-option').forEach(btn=>{
    const cls=btn.dataset.class;
    btn.addEventListener('click', ()=>selectSeatClass(btn, cls));
  });
  document.getElementById('booking-seat-select-btn')?.addEventListener('click', ()=>openSeatSelectorFromBooking(trainNo));
  document.getElementById('booking-stepper-minus')?.addEventListener('click', ()=>changePassengerCount(-1));
  document.getElementById('booking-stepper-plus')?.addEventListener('click', ()=>changePassengerCount(1));
  document.getElementById('booking-date')?.addEventListener('change',e=>{
    const slot=document.getElementById('booking-delay-banner-slot');
    if(slot)slot.innerHTML=_bookingDelayBannerHTML(t,e.target.value);
    refreshBookingSeatOptions();
  });
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
  window._bookingPassengerCount=initialPassengerCount;
  window._bookingDiscount='none';
  refreshBookingSeatOptions();
}
function selectDiscount(btn,key){
  document.querySelectorAll('.booking-discount-option').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._bookingDiscount=key;
  // ì¢Œì„ ë“±ê¸‰ë³„ í‘œì‹œ ìš”ê¸ˆì„ í• ì¸ ë°˜ì˜í•´ ê°±ì‹ 
  const a=window._bArgs||{}; const t=getTrainByNo(a.trainNo);
  if(t) document.querySelectorAll('.booking-seat-option').forEach(b=>{
    const c=b.dataset.class; const fe=b.querySelector('.booking-seat-fare');
    if(fe) fe.textContent=applyDiscount(calcFare(t,a.fromStn,a.toStn,c),key).toLocaleString()+'ì›';
  });
  // ê²°í•©ê¶Œ í‘œì‹œ ìš´ì„(êµ¬ê°„ í•©ì‚°)ì€ ë³„ë„ ì¬ê³„ì‚°
  refreshBookingSeatOptions();
}
function closeBookingPopup(){
  const w=document.getElementById('booking-popup-wrap');
  if(w)w.remove();
}
function selectSeatClass(btn,cls){
  if(btn.disabled)return;
  document.querySelectorAll('.booking-seat-option').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._bookingSeatClass=cls;
  window._preselectedSeats=null;
  const isStanding = cls==='standing';
  // ì „ êµ¬ê°„ ë§¤ì§„ì´ì§€ë§Œ ì…ì„+ì¢Œì„ ê²°í•©ê¶Œìœ¼ë¡œ ì˜ˆë§¤ ê°€ëŠ¥í•œ ì¢Œì„ ë“±ê¸‰ íŒë³„
  const isMixed = !isStanding && _isMixedBookingSelection(cls);
  const confirmBtn=document.getElementById('booking-confirm-btn');
  if(confirmBtn){confirmBtn.disabled=false;confirmBtn.style.opacity='1';confirmBtn.textContent=isMixed?'ğŸ« ì…ì„ï¼‹ì¢Œì„ ì˜ˆë§¤í•˜ê¸°':'ğŸ« ì˜ˆë§¤í•˜ê¸°';}
  const sb=document.getElementById('booking-seat-select-btn');
  const d=document.getElementById('booking-seat-display');
  if(sb){
    // ì…ì„/ììœ ì„Â·ê²°í•©ê¶Œ: ì¢Œì„ ì§€ì • ì—†ì´ ìë™ ë°°ì • â†’ ì¢Œì„ ì„ íƒ ë²„íŠ¼ ë¹„í™œì„±í™”
    const noSeatPick = isStanding || isMixed;
    sb.disabled=noSeatPick;
    sb.style.opacity=noSeatPick?'.55':'1';
    sb.style.cursor=noSeatPick?'not-allowed':'pointer';
    sb.innerHTML=isStanding
      ? 'ğŸš‰ ì…ì„Â·ììœ ì„ ì „ìš© ì¹¸ <span style="color:var(--text3);font-weight:400">â€” ì¢Œì„ ì§€ì • ì—†ìŒ</span>'
      : isMixed
      ? 'ğŸ« ì…ì„ï¼‹ì¢Œì„ ê²°í•© <span style="color:var(--text3);font-weight:400">â€” êµ¬ê°„ë³„ ìë™ ë°°ì •</span>'
      : 'ğŸª‘ ì§ì ‘ ì„ íƒ â€” <span id="booking-seat-display" style="color:var(--accent2)">ìë™ ë°°ì •</span>';
  }
  if(!isStanding && !isMixed && d) d.textContent='ìë™ ë°°ì •';
}
// ì¢Œì„ ë“±ê¸‰ì´ ì „ êµ¬ê°„ ë§¤ì§„ì´ì§€ë§Œ ê²°í•©ê¶Œ(ì…ì„+ì¢Œì„)ìœ¼ë¡œ ì˜ˆë§¤ ê°€ëŠ¥í•œì§€
function _isMixedBookingSelection(cls){
  if(cls==='standing'||typeof computeMixedSegments!=='function'||typeof canBookOD!=='function')return false;
  const a=window._bArgs||{},t=getTrainByNo(a.trainNo);
  if(!t)return false;
  const date=document.getElementById('booking-date')?.value||todayLocalStr();
  const count=window._bookingPassengerCount||1;
  if(canBookOD(t,a.fromStn,a.toStn,count,date,cls))return false; // ì „ êµ¬ê°„ ì¢Œì„ ê°€ëŠ¥ â†’ ê²°í•©ê¶Œ ì•„ë‹˜
  return !!computeMixedSegments(t,a.fromStn,a.toStn,date,count,cls);
}
function changePassengerCount(delta){
  let n=(window._bookingPassengerCount||1)+delta;
  n=Math.max(1,Math.min(6,n));
  window._bookingPassengerCount=n;
  const el=document.getElementById('booking-passenger-count');
  if(el)el.textContent=n;
  // ì¸ì› ë³€ê²½ ì‹œ ì¢Œì„/ê²°í•©ê¶Œ ê°€ëŠ¥ ì—¬ë¶€Â·í‘œì‹œ ê°±ì‹ 
  refreshBookingSeatOptions();
  if(window._bookingSeatClass){
    const active=document.querySelector('.booking-seat-option.active');
    if(active&&!active.disabled)selectSeatClass(active,window._bookingSeatClass);
  }
}
function doConfirmBooking(){
  if(!window._bookingSeatClass){alert('ì¢Œì„ ë“±ê¸‰ì„ ë¨¼ì € ì„ íƒí•´ì£¼ì„¸ìš”');return;}
  const a=window._bArgs||{};
  confirmBooking(a.trainNo,a.fromStn,a.toStn,a.depTime,a.arrTime);
}

// â”€â”€ ì…ì„ + ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ì¥ê±°ë¦¬ ìŠ¹ê°ì´ í•œ ì—´ì°¨ì—ì„œ ì¢Œì„ êµ¬ê°„(ì—¬ì„ ìˆìŒ)ê³¼ ì…ì„ êµ¬ê°„(ë§¤ì§„)ì„ ì´ì–´ì„œ
// ì´ìš©í•  ìˆ˜ ìˆë„ë¡, ì—¬ì •ì„ ì¢Œì„ run / ì…ì„ run ìœ¼ë¡œ ìµœëŒ€ ë³‘í•©í•´ ë¶„í• í•œë‹¤.
// ì…ì„ run ì€ ê¸°ì¡´ ì…ì„ê³¼ ë™ì¼í•˜ê²Œ "ì…ì„ ì˜ˆë§¤ê°€ ì—´ë ¤ìˆëŠ”(eligible) êµ¬ê°„"ì—ì„œë§Œ ì„±ë¦½.
// ë°˜í™˜: [{kind:'seat'|'standing',fromStn,toStn,depTime,arrTime,seatClass,seatClassLabel,
//          baseFarePerPerson,farePerPerson,distanceKm}] ë˜ëŠ” (ì„±ë¦½ ë¶ˆê°€ ì‹œ) null.
const _mixMemo=new Map();
function _clearMixMemo(){_mixMemo.clear();}
function computeMixedSegments(t,fromStn,toStn,date,count,seatClass){
  if(!t||seatClass==='standing')return null;
  if(typeof getAvailableSeats!=='function'||typeof getSeatInventoryState!=='function')return null;
  // ì§§ì€ ì‹œê°„(2ì´ˆ) ë™ì•ˆ ë™ì¼ ì¡°íšŒë¥¼ ë©”ëª¨ì´ì¦ˆ â€” ì˜ˆë§¤ íŒì—… ê°±ì‹ /ì„ íƒ/í™•ì • ì‹œ ì¤‘ë³µ ê³„ì‚° ë°©ì§€
  const memoKey=`${t.no}|${fromStn}|${toStn}|${date}|${count}|${seatClass}`;
  const cached=_mixMemo.get(memoKey);
  if(cached&&Date.now()-cached.at<2000)return cached.v;
  const _memo=v=>{_mixMemo.set(memoKey,{at:Date.now(),v});return v;};
  const pair=travelStopIndexes(t,fromStn,toStn);
  if(!pair)return _memo(null);
  const S=t.stops;
  // ì—¬ì • ë‚´ ì‹¤ì œ ì •ì°¨ì—­(ì‹œê° ì¡´ì¬) ì´ë¦„ì„ ìˆœì„œëŒ€ë¡œ ìˆ˜ì§‘ â†’ í™‰ ê²½ê³„
  const names=[];
  for(let i=pair.fi;i<=pair.ti;i++){
    const st=S[i];
    if(i===pair.fi||i===pair.ti||hasTime(st.arr)||hasTime(st.dep)){
      if(names[names.length-1]!==st.s)names.push(st.s);
    }
  }
  if(names.length<2)return _memo(null);
  // ê° í™‰ì„ ì¢Œì„/ì…ì„ìœ¼ë¡œ ë¶„ë¥˜ (ì¢Œì„ ìš°ì„ , ë¶ˆê°€ ì‹œ ì…ì„ ì—´ë¦¼ êµ¬ê°„ë§Œ í—ˆìš©)
  const kinds=[];
  for(let k=0;k+1<names.length;k++){
    const a=names[k],b=names[k+1];
    if(getAvailableSeats(t,a,b,date,seatClass)>=count){kinds.push('seat');continue;}
    const st=getSeatInventoryState(t,a,b,date,'standing');
    if(st&&st.eligible&&st.available>=count){kinds.push('standing');continue;}
    return _memo(null); // ì¢Œì„ë„ ì…ì„ë„ ë¶ˆê°€í•œ êµ¬ê°„ ì¡´ì¬ â†’ ê²°í•©ê¶Œ ì„±ë¦½ ë¶ˆê°€
  }
  // ê°™ì€ ì¢…ë¥˜ì˜ ì—°ì† í™‰ì„ í•˜ë‚˜ì˜ run ìœ¼ë¡œ ë³‘í•©
  const runs=[];
  for(let k=0;k<kinds.length;k++){
    const last=runs[runs.length-1];
    if(last&&last.kind===kinds[k])last.to=names[k+1];
    else runs.push({kind:kinds[k],from:names[k],to:names[k+1]});
  }
  // ì¢Œì„ run ê³¼ ì…ì„ run ì´ ëª¨ë‘ ìˆì–´ì•¼ ê²°í•©ê¶Œ ì˜ë¯¸ê°€ ìˆìŒ
  if(!runs.some(r=>r.kind==='seat')||!runs.some(r=>r.kind==='standing'))return _memo(null);
  // run ë‹¨ìœ„ ì¬í™•ì¸ + ìƒì„¸ ì •ë³´ êµ¬ì„±
  const out=[];
  for(const r of runs){
    const cls=r.kind==='standing'?'standing':seatClass;
    if(r.kind==='seat'){
      if(getAvailableSeats(t,r.from,r.to,date,seatClass)<count)return _memo(null);
    }else{
      const st=getSeatInventoryState(t,r.from,r.to,date,'standing');
      if(!st||!st.eligible||st.available<count)return _memo(null);
    }
    const base=calcFare(t,r.from,r.to,cls);
    const _dep=t.stops.find(x=>x.s===r.from&&hasTime(x.dep));
    const _arr=[...t.stops].reverse().find(x=>x.s===r.to&&hasTime(x.arr));
    out.push({kind:r.kind,fromStn:r.from,toStn:r.to,
      depTime:_dep?_dep.dep:'',arrTime:_arr?_arr.arr:'',
      seatClass:cls,seatClassLabel:seatClassDisplayLabel(t,cls),
      baseFarePerPerson:base,farePerPerson:applyDiscount(base,'none'),
      distanceKm:Math.round(routeDistanceKm(t,r.from,r.to))});
  }
  return _memo(out);
}

// ì…ì„+ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ í™•ì • ìƒì„±
function confirmMixedBooking(trainNo,fromStn,toStn,depTime,arrTime,travelDate,mix,count,discount){
  const t=getTrainByNo(trainNo);
  if(!t||!Array.isArray(mix)||!mix.length)return;
  discount=discount||'none';
  // ì´ë¯¸ ì¶œë°œí•œ ì—´ì°¨ ì°¨ë‹¨ (ì˜¤ëŠ˜ ë‚ ì§œ)
  if(travelDate===todayLocalStr()){
    const nowCheck=new Date(),nowMCheck=nowCheck.getHours()*60+nowCheck.getMinutes(),depMCheck=toMin(depTime);
    let bookDelay=0;
    if(depMCheck!==null&&typeof _simDelayOn!=='undefined'&&_simDelayOn&&typeof _simDelayAtStop==='function'){
      const timedStops=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
      const fi=timedStops.findIndex(s=>s.s===fromStn);
      if(fi>=0)bookDelay=_simDelayAtStop(t,fi)||0;
    }
    if(depMCheck!==null&&depMCheck+bookDelay<nowMCheck){
      alert('ì´ë¯¸ ì¶œë°œí•œ ì—´ì°¨ëŠ” ì˜ˆë§¤í•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.');return;
    }
  }
  // ê°™ì€ ì‹œê°„ëŒ€ ì¤‘ë³µ ì˜ˆë§¤ ì°¨ë‹¨
  const newDepM=toMin(depTime),newArrM=toMin(arrTime);
  if(newDepM!==null&&newArrM!==null){
    const existing=loadTickets().filter(tk=>tk.status==='active'&&tk.travelDate===travelDate);
    const conflict=existing.find(tk=>{
      const exDep=toMin(tk.depTime),exArr=toMin(tk.arrTime);
      if(exDep===null||exArr===null)return false;
      const aStart=newDepM,aEnd=newArrM>=newDepM?newArrM:newArrM+1440;
      const bStart=exDep,bEnd=exArr>=exDep?exArr:exDep+1440;
      return aStart<bEnd&&bStart<aEnd;
    });
    if(conflict){
      alert(`ê°™ì€ ì‹œê°„ëŒ€ì— ì´ë¯¸ ì˜ˆë§¤í•œ ìŠ¹ì°¨ê¶Œì´ ìˆìŠµë‹ˆë‹¤.\n\n${conflict.trainNo}ë²ˆ Â· ${conflict.fromStn}â†’${conflict.toStn}\n${conflict.depTime}~${conflict.arrTime} (${conflict.travelDate})`);
      return;
    }
  }
  // êµ¬ê°„ë³„ ì¢Œì„ ë°°ì • + ìš´ì„(í• ì¸ ë°˜ì˜) ê³„ì‚°
  const segments=mix.map(r=>{
    const seats=Array.from({length:count},()=>r.kind==='standing'?'ì…ì„':randomSeat(r.seatClass,trainNo));
    const base=r.baseFarePerPerson,fare=applyDiscount(base,discount);
    return{...r,seats,baseFarePerPerson:base,farePerPerson:fare};
  });
  const farePerPerson=segments.reduce((a,s)=>a+s.farePerPerson,0);
  const baseFarePerPerson=segments.reduce((a,s)=>a+s.baseFarePerPerson,0);
  // ìƒìœ„ seats: ìŠ¹ê°ë³„ "ì¢Œì„/ì…ì„" ì¡°í•© ë¬¸ìì—´ (ì¸ì› ìˆ˜ ìœ ì§€)
  const topSeats=Array.from({length:count},(_,i)=>segments.map(s=>s.seats[i]).join(' / '));
  const tickets=loadTickets();
  tickets.push({
    id:genTicketId(),
    trainNo,grade:t.grade,line:t.line,
    fromStn,toStn,depTime,arrTime,
    seatClass:'mixed',seatClassLabel:'ì…ì„ï¼‹ì¢Œì„',
    mixed:segments,
    seats:topSeats,passengerCount:count,
    farePerPerson,totalFare:farePerPerson*count,
    discount,discountLabel:DISCOUNTS[discount].label,baseFarePerPerson,
    distanceKm:Math.round(routeDistanceKm(t,fromStn,toStn)),
    bookedAt:Date.now(),travelDate,status:'active',
  });
  saveTickets(tickets);
  _clearMixMemo();
  if(typeof invalidateCongestion==='function')invalidateCongestion(trainNo,travelDate);
  closeBookingPopup();
  const seatRuns=segments.filter(s=>s.kind==='seat').map(s=>`${s.fromStn}â†’${s.toStn}`).join(', ');
  const standRuns=segments.filter(s=>s.kind==='standing').map(s=>`${s.fromStn}â†’${s.toStn}`).join(', ');
  alert(`ì…ì„ï¼‹ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ ì˜ˆë§¤ê°€ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤!\n${travelDate} Â· ${fromStn} â†’ ${toStn}\nğŸª‘ ì¢Œì„: ${seatRuns}\nğŸš‰ ì…ì„: ${standRuns}\n${count}ëª…${discount!=='none'?' Â· '+DISCOUNTS[discount].label:''} Â· ${(farePerPerson*count).toLocaleString()}ì›`);
  if(document.getElementById('panel-ticket')?.classList.contains('active'))renderTickets();
  if(window._afterBookingCallback){const cb=window._afterBookingCallback;window._afterBookingCallback=null;cb();}
}

// ì…ì„+ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ ì œì•ˆ ì¹´ë“œ (ë¯¸ë¦¬ë³´ê¸° ì•„í‹°íŒ©íŠ¸ì™€ ë™ì¼í•œ ìŠ¤íƒ€ì¼)
function showMixedBookingDialog(t,fromStn,toStn,depTime,arrTime,travelDate,mix,count,discount,seatClass){
  document.getElementById('mixed-dialog-wrap')?.remove();
  const seatLbl=seatClassDisplayLabel(t,seatClass);
  const perDisc=mix.reduce((a,r)=>a+applyDiscount(r.baseFarePerPerson,discount||'none'),0);
  const legs=mix.map(r=>{
    const stand=r.kind==='standing';
    return `<div class="mxd-leg">
      <span class="mxd-ico">${stand?'ğŸš‰':'ğŸª‘'}</span>
      <b>${r.fromStn} â†’ ${r.toStn}</b>
      <span class="mxd-kind ${stand?'stand':'seat'}">${stand?'ì…ì„':r.seatClassLabel}</span>
    </div>`;}).join('');
  const wrap=document.createElement('div');
  wrap.id='mixed-dialog-wrap';
  wrap.innerHTML=`<div class="mxd-backdrop"></div>
    <div class="mxd-card" role="dialog" aria-modal="true">
      <h3 class="mxd-title">ğŸ« ì…ì„ ï¼‹ ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ</h3>
      <p class="mxd-desc">ì„ íƒí•˜ì‹  ${seatLbl}ì€ ì¼ë¶€ êµ¬ê°„ì´ ë§¤ì§„ë˜ì—ˆìŠµë‹ˆë‹¤. ì•„ë˜ì™€ ê°™ì´ ì´ì–´ì„œ ì˜ˆë§¤í•  ìˆ˜ ìˆì–´ìš”.</p>
      <div class="mxd-legs">${legs}</div>
      <div class="mxd-fare"><span>ì´ ìš´ì„ Â· ${count}ëª…</span><b>${(perDisc*count).toLocaleString()}ì›</b></div>
      <div class="mxd-btns">
        <button class="mxd-no" id="mxd-cancel">ì·¨ì†Œ</button>
        <button class="mxd-yes" id="mxd-confirm">ì´ëŒ€ë¡œ ì˜ˆë§¤</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  // ì˜ˆë§¤ ë²„íŠ¼ íƒ­ ì§í›„ ë°œìƒí•˜ëŠ” ìœ ë ¹ í´ë¦­(ghost click)ì´ ë°©ê¸ˆ ì—´ë¦° ì˜¤ë²„ë ˆì´ë¥¼
  // ê³§ë°”ë¡œ ë‹«ì•„ë²„ë¦¬ëŠ” ë¬¸ì œ ë°©ì§€ â€” open í›„ ì§§ì€ ì‹œê°„ ë™ì•ˆ ìƒí˜¸ì‘ìš©ì„ ë¬´ì‹œí•œë‹¤.
  const openedAt=Date.now();
  const guarded=()=>Date.now()-openedAt<500;
  const close=()=>{if(guarded())return;wrap.remove();};
  wrap.querySelector('.mxd-backdrop').addEventListener('click',close);
  const cancelBtn=document.getElementById('mxd-cancel');
  if(cancelBtn)addMobileTap(cancelBtn,close);
  const confirmBtn=document.getElementById('mxd-confirm');
  if(confirmBtn)addMobileTap(confirmBtn,()=>{if(guarded())return;wrap.remove();confirmMixedBooking(t.no,fromStn,toStn,depTime,arrTime,travelDate,mix,count,discount);});
}

function confirmBooking(trainNo,fromStn,toStn,depTime,arrTime){
  const t=getTrainByNo(trainNo);
  if(!t)return;
  const seatClass=window._bookingSeatClass;
  if(!seatClass){alert('ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•´ì£¼ì„¸ìš”.');return;}
  const count=window._bookingPassengerCount||1;
  const discount=window._bookingDiscount||'none';
  const baseFare=calcFare(t,fromStn,toStn,seatClass);
  const fare=applyDiscount(baseFare,discount);

  const dateInput=document.getElementById('booking-date');
  const travelDate=dateInput&&dateInput.value?dateInput.value:todayLocalStr();
  if(typeof canBookOD==='function'&&!canBookOD(t,fromStn,toStn,count,travelDate,seatClass)){
    const left=typeof getAvailableSeats==='function'?getAvailableSeats(t,fromStn,toStn,travelDate,seatClass):0;
    // ì¢Œì„ ë“±ê¸‰ì´ ì¼ë¶€ êµ¬ê°„ë§Œ ë§¤ì§„ëœ ê²½ìš°: ì…ì„+ì¢Œì„ ê²°í•© ìŠ¹ì°¨ê¶Œ ì œì•ˆ
    // (ê¸°ì¡´ ì…ì„ê³¼ ë™ì¼í•˜ê²Œ ì…ì„ ì˜ˆë§¤ê°€ ì—´ë ¤ìˆëŠ” êµ¬ê°„ì—ì„œë§Œ ì„±ë¦½)
    if(seatClass!=='standing'){
      const mix=computeMixedSegments(t,fromStn,toStn,travelDate,count,seatClass);
      if(mix){
        // ë„¤ì´í‹°ë¸Œ confirm ëŒ€ì‹  ì¸ì•± ìŠ¤íƒ€ì¼ ê²°í•©ê¶Œ ì œì•ˆ ì¹´ë“œ í‘œì‹œ
        showMixedBookingDialog(t,fromStn,toStn,depTime,arrTime,travelDate,mix,count,discount,seatClass);
        return;
      }
    }
    alert(left>0?`ì„ íƒí•œ êµ¬ê°„ì—ëŠ” ${left}ì„ë§Œ ë‚¨ì•„ ìˆìŠµë‹ˆë‹¤.`:'ì„ íƒí•œ êµ¬ê°„ì€ ë§¤ì§„ë˜ì—ˆìŠµë‹ˆë‹¤. ì—¬ì„ ì•Œë¦¼ì„ ì„¤ì •í•´ ì£¼ì„¸ìš”.');
    return;
  }

  // ì˜¤ëŠ˜ ë‚ ì§œ ì˜ˆë§¤ ì‹œ ì¶œë°œ ì‹œê°ì´ í˜„ì¬ ì‹œê°ë³´ë‹¤ ì´ì „ì´ë©´ ì°¨ë‹¨
  // (ì§€ì—° ì‹œë®¬ë ˆì´ì…˜ ì¤‘ ì§€ì—° ì—´ì°¨ëŠ” 'ì‹¤ì œ ì§€ì—° ì¶œë°œ ì˜ˆì • ì‹œê°'ê¹Œì§€ ì˜ˆë§¤ ê°€ëŠ¥)
  if(travelDate===todayLocalStr()){
    const nowCheck=new Date();
    const nowMCheck=nowCheck.getHours()*60+nowCheck.getMinutes();
    const depMCheck=toMin(depTime);
    let bookDelay=0;
    if(depMCheck!==null&&typeof _simDelayOn!=='undefined'&&_simDelayOn&&typeof _simDelayAtStop==='function'){
      const timedStops=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
      const fi=timedStops.findIndex(s=>s.s===fromStn);
      if(fi>=0) bookDelay=_simDelayAtStop(t,fi)||0;
    }
    if(depMCheck!==null && depMCheck+bookDelay<nowMCheck){
      alert(`ì´ë¯¸ ì¶œë°œí•œ ì—´ì°¨ëŠ” ì˜ˆë§¤í•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.\n\n${fromStn} ${depTime} ì¶œë°œ${bookDelay>0?` (ì•½ ${bookDelay}ë¶„ ì§€ì—°)`:''} â†’ í˜„ì¬ ì‹œê° ${String(nowCheck.getHours()).padStart(2,'0')}:${String(nowCheck.getMinutes()).padStart(2,'0')}`);
      return;
    }
  }

  // ê°™ì€ ë‚ ì§œì— íƒ‘ìŠ¹ ì‹œê°„ì´ ê²¹ì¹˜ëŠ” ë‹¤ë¥¸ ìŠ¹ì°¨ê¶Œì´ ì´ë¯¸ ìˆëŠ”ì§€ í™•ì¸
  const newDepM=toMin(depTime), newArrM=toMin(arrTime);
  if(newDepM!==null&&newArrM!==null){
    const existing=loadTickets().filter(tk=>tk.status==='active'&&tk.travelDate===travelDate);
    const conflict=existing.find(tk=>{
      const exDep=toMin(tk.depTime), exArr=toMin(tk.arrTime);
      if(exDep===null||exArr===null)return false;
      // ë‘ êµ¬ê°„ì´ ê²¹ì¹˜ëŠ”ì§€: ìì • ë„˜ëŠ” ê²½ìš°ëŠ” ë‹¨ìˆœí™”í•˜ì—¬ ì •ìƒ êµ¬ê°„ë§Œ ì •ë°€ ì²´í¬
      const aStart=newDepM, aEnd=newArrM>=newDepM?newArrM:newArrM+1440;
      const bStart=exDep, bEnd=exArr>=exDep?exArr:exDep+1440;
      return aStart<bEnd && bStart<aEnd;
    });
    if(conflict){
      alert(`ê°™ì€ ì‹œê°„ëŒ€ì— ì´ë¯¸ ì˜ˆë§¤í•œ ìŠ¹ì°¨ê¶Œì´ ìˆìŠµë‹ˆë‹¤.\n\n${conflict.trainNo}ë²ˆ Â· ${conflict.fromStn}â†’${conflict.toStn}\n${conflict.depTime}~${conflict.arrTime} (${conflict.travelDate})\n\nì‹œê°„ì´ ê²¹ì¹˜ëŠ” ìŠ¹ì°¨ê¶Œì€ ë™ì‹œì— ì˜ˆë§¤í•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.`);
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
    seatClass,seatClassLabel:seatClassDisplayLabel(t,seatClass),
    seats,passengerCount:count,
    farePerPerson:fare,totalFare:fare*count,
    discount,discountLabel:DISCOUNTS[discount].label,baseFarePerPerson:baseFare,
    distanceKm:Math.round(routeDistanceKm(t,fromStn,toStn)),
    bookedAt:Date.now(),
    travelDate,
    status:'active', // active | used | cancelled
  });
  saveTickets(tickets);
  _clearMixMemo();
  if(typeof invalidateCongestion==='function')invalidateCongestion(trainNo,travelDate);

  // ìŠ¹ì°¨ì—­/í•˜ì°¨ì—­ ì•ŒëŒ ìë™ ì„¤ì • (ì´ë¯¸ ì„¤ì •ë˜ì–´ ìˆìœ¼ë©´ ê±´ë„ˆëœ€, ì•ˆë‚´ ë¬¸êµ¬ ì—†ì´ ì¡°ìš©íˆ)
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
  }catch(e){console.warn('ìë™ ì•ŒëŒ ì„¤ì • ì‹¤íŒ¨:',e);}

  closeBookingPopup();
  alert(`ì˜ˆë§¤ê°€ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤!\n${travelDate} Â· ${fromStn} â†’ ${toStn}\n${seatClassDisplayLabel(t,seatClass)} ${count}ëª…${discount!=='none'?' Â· '+DISCOUNTS[discount].label:''} Â· ${(fare*count).toLocaleString()}ì›`);
  if(document.getElementById('panel-ticket')?.classList.contains('active')) renderTickets();
  // ì™•ë³µ ì˜ˆë§¤ ì½œë°± (í¸ë„ ì˜ˆë§¤ ì™„ë£Œ í›„ ë³µí¸ ì¡°íšŒ)
  if(window._afterBookingCallback){
    const cb = window._afterBookingCallback;
    window._afterBookingCallback = null;
    cb();
  }
}

function cancelTicket(id){
  if(!confirm('ì´ ìŠ¹ì°¨ê¶Œì„ ì·¨ì†Œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?'))return;
  const tickets=loadTickets();
  const idx=tickets.findIndex(tk=>tk.id===id);
  if(idx<0)return;
  const tk=tickets[idx];

  // ì¶œë°œ ì´í›„ ì·¨ì†Œ ë¶ˆê°€
  const now=new Date();
  const nowM=now.getHours()*60+now.getMinutes();
  const depM=toMin(tk.depTime);
  if(tk.travelDate===todayLocalStr(now) && depM!==null && depM<=nowM){
    alert(`ì´ë¯¸ ì¶œë°œí•œ ì—´ì°¨ëŠ” ì·¨ì†Œí•  ìˆ˜ ì—†ìŠµë‹ˆë‹¤.\n\n${tk.fromStn} ${tk.depTime} ì¶œë°œ â†’ í˜„ì¬ ì‹œê° ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    return;
  }

  tickets[idx].status='cancelled';
  saveTickets(tickets);
  if(typeof invalidateCongestion==='function')invalidateCongestion(tk.trainNo,tk.travelDate);

  // ìŠ¹í•˜ì°¨ ì•ŒëŒ ìë™ í•´ì œ
  try{
    const alarms=loadAlarms();
    const filtered=alarms.filter(a=>!(a.trainNo===tk.trainNo&&(a.stn===tk.fromStn||a.stn===tk.toStn)));
    saveAlarms(filtered);
  }catch(e){console.warn('ì•ŒëŒ í•´ì œ ì‹¤íŒ¨:',e);}

  renderTickets();
  renderAlarmIfOpen();
}
function deleteTicket(id){
  if(!confirm('ì´ ìŠ¹ì°¨ê¶Œ ê¸°ë¡ì„ ì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?'))return;
  saveTickets(loadTickets().filter(tk=>tk.id!==id));
  renderTickets();
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸ”² QRì½”ë“œ ìƒì„± (Canvas ê¸°ë°˜, ì™¸ë¶€ ë¼ì´ë¸ŒëŸ¬ë¦¬ ì—†ìŒ)
// ìŠ¹ì°¨ê¶Œ ì •ë³´ë¥¼ QR íŒ¨í„´ìœ¼ë¡œ ì‹œê°í™” (ë””ìì¸ ìš”ì†Œ)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function generateQRCanvas(text, size){
  // ê°„ë‹¨í•œ ë§¤íŠ¸ë¦­ìŠ¤ ê¸°ë°˜ íŒ¨í„´ ìƒì„± (ì‹¤ì œ QR ì¸ì½”ë”© ê·¼ì‚¬)
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const N = 25; // 25x25 ëª¨ë“ˆ
  const cell = Math.floor(size / N);

  // ë¬¸ìì—´ì„ ìˆ«ì ë°°ì—´ë¡œ ë³€í™˜ (ì˜ì‚¬ ëœë¤ íŒ¨í„´)
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

  // QR ìœ„ì¹˜ ê°ì§€ íŒ¨í„´ (ì¢Œìƒ/ìš°ìƒ/ì¢Œí•˜ ì½”ë„ˆ ê³ ì •)
  function drawFinder(r, c){
    for(let dr=0;dr<7;dr++) for(let dc=0;dc<7;dc++){
      mod[r+dr][c+dc] =
        (dr===0||dr===6||dc===0||dc===6) ? 1 :
        (dr>=2&&dr<=4&&dc>=2&&dc<=4) ? 1 : 0;
    }
  }
  drawFinder(0,0); drawFinder(0,N-7); drawFinder(N-7,0);

  // ë¶„ë¦¬ì (í°ìƒ‰ í…Œë‘ë¦¬)
  for(let i=0;i<8;i++){
    mod[7][i]=0; mod[i][7]=0;
    mod[7][N-1-i]=0; mod[i][N-8]=0;
    mod[N-8][i]=0; mod[N-1-i][7]=0;
  }

  // íƒ€ì´ë° íŒ¨í„´
  for(let i=8;i<N-8;i++){
    mod[6][i] = i%2===0?1:0;
    mod[i][6] = i%2===0?1:0;
  }

  // ë Œë”ë§
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

  // ê°œí‘œ(íƒ‘ìŠ¹ì™„ë£Œ) ìë™ ì „ì´: í•˜ì°¨ì—­ì„ ì§€ë‚¬ìœ¼ë©´ ì™„ë£Œ ì²˜ë¦¬ í›„ ì €ì¥
  if(tk.board==='active' && isTicketPast(tk)){ tk.board='done'; saveTickets(tickets); }
  const bs = ticketBoardState(tk);
  const _qtrain = getTrainByNo(tk.trainNo);
  const tkDistKm = tk.distanceKm || (_qtrain?Math.round(routeDistanceKm(_qtrain,tk.fromStn,tk.toStn)):0);

  const qrText = `NIMBIRAIL:${tk.id}:${tk.trainNo}:${tk.fromStn}:${tk.toStn}:${tk.travelDate}:${tk.depTime}`;
  const gradeC = (typeof GRADE_COLORS!=='undefined' && GRADE_COLORS[tk.grade]) || '#388bfd';
  const discBadge = (tk.discount && tk.discount!=='none') ? `<span class="rt-badge" style="margin-left:0">${tk.discountLabel}</span>` : '';
  const boardBadge = bs==='active' ? `<span class="rt-board-badge rt-board-active">â— íƒ‘ìŠ¹ ì¤‘</span>`
    : bs==='done' ? `<span class="rt-board-badge rt-board-done">íƒ‘ìŠ¹ ì™„ë£Œ</span>`
    : `<span class="rt-board-badge rt-board-none">ë¯¸ê°œí‘œ</span>`;
  const boardBtn = canBoardTicket(tk) && bs==='none'
    ? `<button class="rt-act-btn rt-act-board" onclick="boardTicket('${tk.id}')">ğŸ« íƒ‘ìŠ¹í•˜ê¸° (ê°œí‘œ)</button>`
    : bs==='active'
    ? `<button class="rt-act-btn rt-act-board" disabled>âœ“ ê°œí‘œ ì™„ë£Œ</button>`
    : canManualBoard(tk)
    ? `<button class="rt-act-btn rt-act-board rt-act-manual" onclick="openManualBoard('${tk.id}')">ğŸ–ï¸ ìˆ˜ê°œí‘œ (ê°œí‘œ ë†“ì¹¨)</button>`
    : '';
  const qrDelay=_ticketEndpointDelayHTML(tk);

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
          <div class="rt-watermark"><span>${('NIMBIRAIL Â· ì¬íŒë§¤ê¸ˆì§€ Â· '+tk.id+' Â· ').repeat(28)}</span></div>
          <div class="rt-top">
            <span class="rt-grade" style="color:${gradeC}">${tk.grade}</span>
            <span class="rt-no">${tk.trainNo}</span>
            <span style="margin-left:auto;display:flex;gap:6px;align-items:center">${discBadge}${boardBadge}</span>
          </div>
          <div class="rt-route">
            <div class="rt-stn"><div class="rt-stn-name">${tk.fromStn}</div><div class="rt-stn-time">${tk.depTime||''}${qrDelay.from}</div></div>
            <div class="rt-arrow" style="color:${gradeC}">â†’</div>
            <div class="rt-stn rt-stn-r"><div class="rt-stn-name">${tk.toStn}</div><div class="rt-stn-time">${tk.arrTime||''}${qrDelay.to}</div></div>
          </div>
          <div class="rt-meta">
            <div><span class="rt-k">ë‚ ì§œ</span><span class="rt-v">${tk.travelDate}</span></div>
            <div><span class="rt-k">ë“±ê¸‰</span><span class="rt-v">${tk.seatClassLabel}</span></div>
            <div><span class="rt-k">ì†Œìš”</span><span class="rt-v">${fmtDurKor(durMin(tk.depTime,tk.arrTime))}</span></div>
            <div><span class="rt-k">ì¢Œì„</span><span class="rt-v">${seatSummary(tk.seats)}</span></div>
            <div><span class="rt-k">ìš´ì„</span><span class="rt-v">${fmtWon(tk.totalFare)}</span></div>
            <div><span class="rt-k">ì¸ì›</span><span class="rt-v">${tk.passengerCount}ëª…${discBadge?' Â· '+tk.discountLabel:''}</span></div>
          </div>
          <div class="rt-perf"></div>
          <div class="rt-qr" id="qr-canvas-wrap"></div>
          <div class="rt-id">${tk.id}</div>
          <div class="rt-actions">
            ${boardBtn}
            <button class="rt-act-btn" onclick="flipRailTicket()">ğŸš† í¸ì„±Â·ì¢Œì„ âŸ³</button>
          </div>
        </div>
        <div class="rail-ticket rt-face rt-back" style="--tk:${gradeC}" id="rt-back">
          <div class="rt-back-head">
            <span>ğŸš† ${tk.grade} ${tk.trainNo} Â· ${tk.seatClassLabel} ${seatSummary(tk.seats)}</span>
            <button class="tcard-back-btn" onclick="flipRailTicket()">â† ìŠ¹ì°¨ê¶Œ</button>
          </div>
          <div class="rt-back-body" id="rt-back-body"></div>
        </div>
       </div>
      </div>
      <button class="alarm-popup-close" style="margin-top:12px" onclick="closeQRPopup()">ë‹«ê¸°</button>
    </div>`;
  document.body.appendChild(wrap);

  const canvas = generateQRCanvas(qrText, 225);
  canvas.style.cssText = 'display:block';
  document.getElementById('qr-canvas-wrap').appendChild(canvas);
}
// QR ìŠ¹ì°¨ê¶Œ ë’¤ì§‘ê¸°: ì•(QR) â†” ë’¤(í¸ì„±Â·ì¢Œì„). ë’·ë©´ì€ ìµœì´ˆ ë’¤ì§‘ì„ ë•Œ ë Œë”.
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
    // ë’¤ì§‘ê¸° ì™„ë£Œ í›„ 3D í•´ì œ(settled) â€” iPad ë’·ë©´ ìŠ¤í¬ë¡¤Â·ë¹„ì¹¨ ìˆ˜ì •
    // rotateY(180)â†’none ì „í™˜ì´ transitionì„ íƒ€ë©´ ì—­íšŒì „ìœ¼ë¡œ ë³´ì´ë¯€ë¡œ ë°˜ë“œì‹œ transition ì—†ì´ ì ìš©
    clearTimeout(flip._settleT);
    flip._settleT=setTimeout(()=>{
      if(!flip.classList.contains('flipped'))return;
      inner.style.transition='none';
      flip.classList.add('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    },650);
  } else {
    // settled í•´ì œëŠ” transition ì—†ì´ ì¦‰ì‹œ(í„ëŸ­ì„ ë°©ì§€) ì›ë˜ rotateY(180) ìƒíƒœë¡œ ë³µê·€ í›„ ì—­íšŒì „
    clearTimeout(flip._settleT);
    if(flip.classList.contains('settled')){
      inner.style.transition='none';
      flip.classList.remove('settled');
      void inner.offsetHeight;
      inner.style.transition='';
    }
  }
  inner.style.height=(willFlip?front.offsetHeight:inner.offsetHeight)+'px';
  flip.classList.toggle('flipped', willFlip); // í´ë˜ìŠ¤ëŠ” ì¦‰ì‹œ í† ê¸€(ì—°íƒ€ ë°©ì§€)
  requestAnimationFrame(()=>{
    let h;
    if(willFlip){
      // ë’·ë©´: ë¨¸ë¦¬ë§ + ë³¸ë¬¸ ì‹¤ì œ ì½˜í…ì¸  ë†’ì´ â†’ ë·°í¬íŠ¸ 82%ë¡œ ìƒí•œ. ë„˜ì¹˜ë©´ ë³¸ë¬¸ì´ ìŠ¤í¬ë¡¤
      const head=back.querySelector('.rt-back-head');
      const body=document.getElementById('rt-back-body');
      const need=(head?head.offsetHeight:44)+(body?body.scrollHeight:0)+4;
      h=Math.min(need, Math.round(window.innerHeight*0.82));
    } else h=front.offsetHeight;
    inner.style.height=h+'px';
  });
}
// í‹°ì¼“ ID ê¸°ë°˜ ì˜ì‚¬ ë°”ì½”ë“œ ìƒì„± (ì—°ì¶œìš©)
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸ« ê°œí‘œ / íƒ‘ìŠ¹ ì²˜ë¦¬ (QR ì²´í¬ì¸)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// í•˜ì°¨ì—­(ë„ì°©)ì„ ì´ë¯¸ ì§€ë‚¬ëŠ”ì§€ (íƒ‘ìŠ¹ì™„ë£Œ íŒì •)
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
// ìŠ¹ì°¨ê¶Œ ê°œí‘œ ìƒíƒœ: 'none'(ë¯¸ê°œí‘œ) | 'active'(íƒ‘ìŠ¹ ì¤‘) | 'done'(íƒ‘ìŠ¹ ì™„ë£Œ)
function ticketBoardState(tk){
  if(tk.board==='done') return 'done';
  if(isTicketPast(tk)) return 'done';
  return tk.board==='active' ? 'active' : 'none';
}
// ì§€ê¸ˆ ê°œí‘œ(íƒ‘ìŠ¹) ê°€ëŠ¥í•œê°€ â€” ì—´ì°¨ ì¶œë°œ í›„ 10ë¶„ ì´ë‚´ì—ë§Œ (ì¶œë°œ ì „ ë¶ˆê°€)
function canBoardTicket(tk){
  if(tk.status!=='active' || isTicketPast(tk)) return false;
  const depM=toMin(tk.depTime);
  if(depM===null || !tk.travelDate) return false;
  const dep=new Date(tk.travelDate+'T00:00:00');
  if(isNaN(dep.getTime())) return false;
  dep.setMinutes(depM);
  const sinceDep=(Date.now()-dep.getTime())/60000; // ì¶œë°œ í›„ ê²½ê³¼ ë¶„
  return sinceDep>=0 && sinceDep<=10;
}
// ìˆ˜ê°œí‘œ ê°€ëŠ¥ â€” ì •ìƒ ê°œí‘œì°½(ì¶œë°œ í›„ 10ë¶„)ì„ ë†“ì³¤ì§€ë§Œ ì•„ì§ ìš´í–‰ ì¤‘(í•˜ì°¨ ì „)ì¼ ë•Œ
function canManualBoard(tk){
  if(tk.status!=='active' || isTicketPast(tk)) return false;
  if(ticketBoardState(tk)!=='none') return false;
  const depM=toMin(tk.depTime);
  if(depM===null || !tk.travelDate) return false;
  const dep=new Date(tk.travelDate+'T00:00:00');
  if(isNaN(dep.getTime())) return false;
  dep.setMinutes(depM);
  const sinceDep=(Date.now()-dep.getTime())/60000;
  return sinceDep>10; // ì •ìƒì°½(0~10ë¶„) ì´í›„ ~ í•˜ì°¨ ì „
}
// ê°œí‘œ í™•ì • (ìƒíƒœ ê°±ì‹  + ì—°ì¶œ) â€” ì •ìƒ/ìˆ˜ê°œí‘œ ê³µí†µ
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
// ê°œí‘œ ì‹¤í–‰ â†’ ê²Œì´íŠ¸ í†µê³¼ ì—°ì¶œ + ì†Œë¦¬ â†’ ìƒíƒœ ê°±ì‹ 
function boardTicket(id){
  const tickets=loadTickets();
  const tk=tickets.find(t=>t.id===id);
  if(!tk) return;
  if(!canBoardTicket(tk)){ alert('ì§€ê¸ˆì€ ê°œí‘œí•  ìˆ˜ ì—†ëŠ” ìŠ¹ì°¨ê¶Œì…ë‹ˆë‹¤.\n(ê°œí‘œëŠ” ì—´ì°¨ ì¶œë°œ í›„ 10ë¶„ ì´ë‚´ì—ë§Œ ê°€ëŠ¥í•©ë‹ˆë‹¤)'); return; }
  _doBoard(id, false);
}
// ê°œí‘œìŒ (WebAudio, ì‹¤ì œ ê°œì°°êµ¬ "ì‚‘" 2ìŒ)
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
// ê²Œì´íŠ¸ í†µê³¼ ì• ë‹ˆë©”ì´ì…˜ ì˜¤ë²„ë ˆì´
function showGateAnimation(tk, done, manual){
  document.getElementById('gate-overlay')?.remove();
  const ov=document.createElement('div');
  ov.id='gate-overlay'; ov.className='gate-overlay';
  ov.innerHTML=`<div class="gate-scene">
    <div class="gate-beep"></div>
    <div class="gate-lamp"></div>
    <div class="gate-door left"></div>
    <div class="gate-door right"></div>
    <div class="gate-check">âœ“ ${manual?'ìˆ˜ê°œí‘œ':'ê°œí‘œ'} ì™„ë£Œ Â· ${tk.fromStn} ìŠ¹ì°¨</div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{ ov.remove(); if(done) done(); }, 1750);
}

// ğŸ–ï¸ ìˆ˜ê°œí‘œ ë¯¸ë‹ˆê²Œì„ â€” ê°œí‘œ ë„ì¥ íƒ€ì´ë° (ì´ˆë¡ êµ¬ê°„ì— ë„ì¥ 3íšŒ)
let _manBoard=null;
function openManualBoard(id){
  const tickets=loadTickets(); const tk=tickets.find(t=>t.id===id); if(!tk)return;
  if(!canManualBoard(tk)){ alert('ì§€ê¸ˆì€ ìˆ˜ê°œí‘œí•  ìˆ˜ ì—†ëŠ” ìŠ¹ì°¨ê¶Œì…ë‹ˆë‹¤.'); return; }
  closeManualBoard();
  const ov=document.createElement('div'); ov.id='manboard-overlay'; ov.className='manboard-overlay';
  ov.innerHTML=`<div class="manboard-card">
    <div class="manboard-title">ğŸ–ï¸ ìˆ˜ê°œí‘œ</div>
    <div class="manboard-desc">ê°œí‘œ ì‹œê°„ì„ ë†“ì³¤ì–´ìš”.<br>ì›€ì§ì´ëŠ” í‘œì‹œê°€ <b style="color:var(--green)">ì´ˆë¡ êµ¬ê°„</b>ì— ì˜¬ ë•Œ ë„ì¥ì„ ì°ì–´ ìŠ¹ë¬´ì› í™•ì¸ì„ ë°›ìœ¼ì„¸ìš”.</div>
    <div class="manboard-count"><span id="manboard-dots"></span> <span id="manboard-num">0 / 3</span></div>
    <div class="manboard-track" id="manboard-track">
      <div class="manboard-zone" id="manboard-zone"></div>
      <div class="manboard-marker" id="manboard-marker"></div>
    </div>
    <button class="btn btn-primary manboard-hit" id="manboard-hit" onclick="manBoardHit()">ğŸ–ï¸ ë„ì¥ ì°ê¸°</button>
    <button class="manboard-cancel" onclick="closeManualBoard()">ì·¨ì†Œ</button>
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
  const dots=document.getElementById('manboard-dots'); if(dots)dots.textContent='â—'.repeat(_manBoard.done)+'â—‹'.repeat(_manBoard.need-_manBoard.done);
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸš† í¸ì„± ì •ë³´ + ì¢Œì„ ë°°ì¹˜ë„
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// í¸ì„±ë³„ í¸ì˜ì‹œì„¤ ë°°ì¹˜ (ì¹¸ ë²ˆí˜¸ â†’ ì•„ì´ì½˜/ì„¤ëª…). ì‹¤ì œ ì—´ì°¨ ê°ì„±ì˜ ëŒ€í‘œ ë°°ì¹˜.
function getCarAmenities(formType, composition){
  const n=composition.length;
  const map={};
  const add=(car,emoji,label)=>{ if(car>=1&&car<=n){ (map[car]=map[car]||[]).push({emoji,label}); } };
  // ì¹´í˜/ìŠ¤ë‚µì¹¸ (í¸ì„± ì¤‘ì•™ ê·¼ì²˜)
  if(formType==='ktx-1'){ add(4,'â˜•','ì¹´í˜ì¹¸'); add(4,'â™¿','íœ ì²´ì–´ì„'); add(15,'ğŸ‘¶','ìœ ì•„ë™ë°˜'); add(18,'ğŸš²','ìì „ê±°'); }
  else if(formType==='ktx-sancheon'||formType==='ktx-eum'){ add(1,'â™¿','íœ ì²´ì–´ì„'); add(4,'â˜•','ìŠ¤ë‚µìíŒê¸°'); add(3,'ğŸ‘¶','ìœ ì•„ë™ë°˜'); add(n-2,'ğŸš²','ìì „ê±°'); }
  else if(formType==='itx-cc'){ add(1,'â™¿','íœ ì²´ì–´ì„'); add(5,'ğŸš²','ìì „ê±°'); add(6,'ğŸ‘¶','ìœ ì•„ë™ë°˜'); }
  else if(formType==='itx-sm'){ add(1,'â™¿','íœ ì²´ì–´ì„'); add(3,'ğŸ‘¶','ìœ ì•„ë™ë°˜'); add(4,'ğŸš²','ìì „ê±°'); }
  else { add(1,'â™¿','íœ ì²´ì–´ì„'); add(4,'ğŸš²','ìì „ê±°'); }
  return map;
}
// í‹°ì¼“ ì¢Œì„ ë¬¸ìì—´ íŒŒì‹±: "3í˜¸ì°¨ 12A" â†’ {car:3,row:12,col:'A'}
function parseSeat(str){
  if(!str) return null;
  const carM=String(str).match(/(\d+)\s*í˜¸ì°¨?/);
  const car=carM?parseInt(carM[1]):null;
  const rest=String(str).replace(/\d+\s*í˜¸ì°¨?/,'').trim();
  // ì—´+ë¬¸ì (ì˜ˆ: 12A)
  const lm=rest.match(/(\d+)\s*([A-Da-d])/);
  if(lm) return { car, row:parseInt(lm[1]), col:lm[2].toUpperCase() };
  // ì—°ë²ˆ ì¢Œì„ (ì˜ˆ: 45, 45ë²ˆ)
  const nm=rest.match(/(\d+)/);
  if(nm) return { car, seatNum:parseInt(nm[1]) };
  return car!==null ? { car } : null;
}
function parseSeats(seats){ return (seats||[]).map(parseSeat).filter(Boolean); }
// ì¢Œì„ ìš”ì•½: 1ì„ì€ ê·¸ëŒ€ë¡œ, ë‹¤ì¸ì„ì€ "ì²«ì¢Œì„ ì™¸ Nì„"
function seatSummary(seats){
  if(!seats||!seats.length) return '-';
  if(seats.length===1) return String(seats[0]);
  return `${seats[0]} ì™¸ ${seats.length-1}ì„`;
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

  // í¸ì„±ë„ (ì°¨ëŸ‰ ì¹´ë“œë“¤)
  const carsHtml=comp.map(c=>{
    const isMine = mySeats.some(s=>s.car===c.car);
    const a=(amen[c.car]||[]).map(x=>x.emoji).join('');
    return `<div class="fmt-car t-${c.type}${isMine?' sel':''}" onclick="selectFmtCar(${c.car})" id="fmt-car-${c.car}">
      ${isMine?'<span class="fmt-car-mine">ë‚´ ì¢Œì„</span>':''}
      <div class="fmt-car-no">${c.car}</div>
      <div class="fmt-car-type">${c.label}</div>
      <div class="fmt-car-amen">${a||'&nbsp;'}</div>
    </div>`;
  }).join('');

  // ì •ì°¨ìœ„ì¹˜ ì•ˆë‚´: ë‚´ ì¹¸ì´ í¸ì„±ì—ì„œ ì•/ì¤‘/ë’¤ ì–´ë””ì¸ì§€
  let platMsg='';
  if(myCar!==null){
    const ratio=myCar/comp.length;
    const zone = ratio<=0.34?'ì•ìª½':ratio<=0.67?'ê°€ìš´ë°':'ë’¤ìª½';
    const markPct = Math.round(((myCar-0.5)/comp.length)*100);
    platMsg=`<div class="fmt-platform">
      <span>ìŠ¹ê°•ì¥ ì •ì°¨ ì‹œ ë‚´ ì¹¸(<b>${myCar}í˜¸ì°¨</b>)ì€ ì—´ì°¨ <b>${zone}</b></span>
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
          <span style="font-size:12px;color:var(--text2)">${tk.seatClassLabel} Â· ${seatSummary(tk.seats)}</span>
          <button class="fmt-head-close" onclick="closeFormationPopup()">âœ•</button>
        </div>
        <div class="fmt-body">
          <div class="fmt-sec-label">ğŸš† í¸ì„± ì•ˆë‚´ (${comp.length}ëŸ‰)</div>
          <div class="fmt-train"><div class="fmt-loco"></div>${carsHtml}</div>
          ${platMsg}
          <div class="fmt-sec-label">ğŸ’º ì¢Œì„ ë°°ì¹˜ë„</div>
          <div id="fmt-seatmap"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  selectFmtCar(myCar!==null?myCar:comp.find(c=>c.type!=='free')?.car||1);
}
// ìŠ¹ì°¨ê¶Œ ì¹´ë“œ ë’·ë©´ìš© í¸ì„±/ì¢Œì„ ì½˜í…ì¸  (ë‚´ ì¹¸ ì¤‘ì‹¬, ë¹„ëŒ€í™”í˜•)
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
      ${isMine?'<span class="fmt-car-mine">ë‚´ ì¢Œì„</span>':''}
      <div class="fmt-car-no">${c.car}</div>
      <div class="fmt-car-type">${c.label}</div>
      <div class="fmt-car-amen">${a||'&nbsp;'}</div>
    </div>`;
  }).join('');
  let platMsg='';
  if(mySeat){
    const ratio=myCar/comp.length;
    const zone = ratio<=0.34?'ì•ìª½':ratio<=0.67?'ê°€ìš´ë°':'ë’¤ìª½';
    const markPct = Math.round(((myCar-0.5)/comp.length)*100);
    platMsg=`<div class="fmt-platform">
      <span>ìŠ¹ê°•ì¥ ì •ì°¨ ì‹œ ë‚´ ì¹¸(<b>${myCar}í˜¸ì°¨</b>)ì€ ì—´ì°¨ <b>${zone}</b></span>
      <span class="fmt-plat-bar"><span class="fmt-plat-mark" style="left:${markPct}%"></span></span>
    </div>`;
  }
  return `
    <div class="fmt-sec-label">ğŸš† í¸ì„± ì•ˆë‚´ (${comp.length}ëŸ‰)</div>
    <div class="fmt-train"><div class="fmt-loco"></div>${carsHtml}</div>
    ${platMsg}
    <div class="fmt-sec-label">ğŸ’º ì¢Œì„ ë°°ì¹˜ë„ Â· ${myCar}í˜¸ì°¨</div>
    ${renderSeatMap(comp, myCar, mySeat, amen, tk.grade, mySeats)}
  `;
}
// ìŠ¹ì°¨ê¶Œ ì¹´ë“œ ë’¤ì§‘ê¸° (ì•â†”ë’¤). ë’·ë©´ í¸ì„±/ì¢Œì„ì€ ìµœì´ˆ ë’¤ì§‘ì„ ë•Œ ë Œë”
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
  // ë‚´ ì¢Œì„ ì¹¸ì´ë©´ selected ìœ ì§€ë˜ë„ë¡ mine í´ë˜ìŠ¤ëŠ” ë³„ë„
  const myCar = ctx.mySeat ? ctx.mySeat.car : null;
  if(myCar!==null){ const mEl=document.getElementById('fmt-car-'+myCar); if(mEl) mEl.classList.add('sel'); }
  const box=document.getElementById('fmt-seatmap');
  if(box) box.innerHTML=renderSeatMap(ctx.comp, car, ctx.mySeat, ctx.amen, ctx.tk&&ctx.tk.grade, ctx.mySeats);
}
function renderSeatMap(comp, car, mySeat, amenMap, grade, mySeats){
  const _wide=_wideWindow(grade);
  // ì°½ë¬¸ í´ë˜ìŠ¤: ë„“ì€ ì°½ì€ í™€ìˆ˜ ì—´ì—ë§Œ 2ì—´ span ì°½, ì§ìˆ˜ ì—´ì€ ì°½(bar) ì—†ìŒ.
  // í™€ìˆ˜ ì—´ì´ ë§ˆì§€ë§‰ ì—´(ì•„ë˜ ì—´ ì—†ìŒ)ì´ë©´ ë„“ì€ ì°½ ëŒ€ì‹  1ì—´ ì°½ìœ¼ë¡œ.
  const winCls=(side,r,total)=>_winClass(grade,side,r,total);
  const c=comp.find(x=>x.car===car);
  if(!c) return '<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px">ë°°ì¹˜ë„ ì •ë³´ ì—†ìŒ</div>';
  if(c.type==='free'){
    return `<div class="seatmap"><div class="seatmap-caption">ğŸš‰ <b>${car}í˜¸ì°¨ Â· ììœ ì„</b><br><span style="color:var(--text3)">ì§€ì • ì¢Œì„ì´ ì—†ëŠ” ì…ì„/ììœ ì„ ì¹¸ì…ë‹ˆë‹¤.</span></div></div>`;
  }
  const _seats = (mySeats&&mySeats.length)?mySeats:(mySeat?[mySeat]:[]);
  const carSeats = _seats.filter(s=>s&&s.car===car);
  const isMineCar = carSeats.length>0;
  const amenTags=(amenMap[car]||[]).map(a=>`${a.emoji} ${a.label}`).join(' Â· ');
  const legend=`
    <div class="seat-legend">
      <span><i class="seat-dot" style="background:#3fb950"></i>ë‚´ ì¢Œì„</span>
      <span><i class="seat-dot" style="background:var(--bg3);border:1px solid var(--border)"></i>ì¼ë°˜</span>
      <span>â–® ì°½ì¸¡</span>
      <span>âš¡ ì½˜ì„¼íŠ¸</span>
    </div>
    ${amenTags?`<div style="font-size:11px;color:var(--text2);margin-bottom:8px">ğŸ·ï¸ ${car}í˜¸ì°¨: ${amenTags}</div>`:''}`;

  // â”€â”€ ë¬´ê¶í™”: ì¢Œì„ 1~72 ì—°ë²ˆ ë°°ì¹˜ â”€â”€
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
    const seatStr=carSeats.map(s=>s.seatNum+'ë²ˆ').filter(x=>x!=='undefinedë²ˆ').join(', ');
    return `${legend}
    <div class="seatmap">
      <div class="seatmap-grid">${rowsHtml}</div>
      ${isMineCar&&seatStr?`<div class="seatmap-caption">ë‚´ ì¢Œì„ <b>${car}í˜¸ì°¨ ${seatStr}</b> Â· ì°½ì¸¡/ì½˜ì„¼íŠ¸ í‘œì‹œ ì°¸ê³ </div>`
        :`<div class="seatmap-caption" style="color:var(--text3)">${car}í˜¸ì°¨ ë°°ì¹˜ë„ (ì¢Œì„ 1~${total}ë²ˆ)</div>`}
    </div>`;
  }

  // â”€â”€ KTX/ITX ê³„ì—´: ì—´+ì¢Œì„ë¬¸ì(A~D), ìˆœ/ì—­ë°©í–¥ êµ¬ë¶„ â”€â”€
  const cols=c.cols||['A','B','C','D'];
  const rows=c.rows||15;
  const revRows=c.revRows||0; // ì•ìª½ ëª‡ ì—´ì´ ì—­ë°©í–¥ì¸ì§€
  const missing=new Set(c.missingSeats||[]);
  const half=Math.ceil(cols.length/2); // í†µë¡œ ìœ„ì¹˜
  const faceOf = r => r<=revRows ? 'rev' : 'fwd';
  const showDir = revRows>0; // ì—­ë°©í–¥ ì¢Œì„ì´ ìˆì„ ë•Œë§Œ ë°©í–¥ í™”ì‚´í‘œ

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
          ? `<span class="seat aisle seatmap-arrow ${face}">${face==='fwd'?'â–²':'â–½'}</span>`
          : '<span class="seat aisle"></span>';
      }
    });
    rowsHtml+=`<div class="seatmap-row"><span class="seatmap-rownum">${r}</span>${cells}</div>`;
  }
  const seatStr=carSeats.map(s=>`${s.row}${s.col}`).join(', ');
  return `${legend}
    <div class="seatmap">
      ${showDir?'<div class="seatmap-dir-legend"><span class="seatmap-arrow fwd">â–²</span>ìˆœë°©í–¥ <span class="seatmap-arrow rev">â–½</span>ì—­ë°©í–¥</div>':''}
      <div class="seatmap-grid">${rowsHtml}</div>
      ${isMineCar?`<div class="seatmap-caption">ë‚´ ì¢Œì„ <b>${car}í˜¸ì°¨ ${seatStr}</b> Â· ì°½ì¸¡/ì½˜ì„¼íŠ¸ í‘œì‹œ ì°¸ê³ </div>`
        :`<div class="seatmap-caption" style="color:var(--text3)">${car}í˜¸ì°¨ ë°°ì¹˜ë„ (ë‚´ ì¢Œì„ì€ ${_seats[0]?_seats[0].car+'í˜¸ì°¨':'-'})</div>`}
    </div>`;
}
function closeFormationPopup(){ document.getElementById('fmt-popup-wrap')?.remove(); }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸŸï¸ ì •ê¸°ê¶Œ ì‹œìŠ¤í…œ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
        <div class="alarm-popup-title" style="margin-bottom:0">ğŸŸï¸ ì •ê¸°ê¶Œ ë“±ë¡</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="pass-reg-clock"></div>
      </div>
      <div class="alarm-popup-sub">ìì£¼ ì´ìš©í•˜ëŠ” êµ¬ê°„ì„ ë“±ë¡í•˜ì„¸ìš”</div>
      <div class="booking-section-label">ì¶œë°œì—­</div>
      <div style="margin-bottom:4px">
        <input type="text" id="pass-from" placeholder="ì¶œë°œì—­ ì…ë ¥" autocomplete="off"
          style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none">
        <div id="ac-pass-from" style="background:var(--bg2);border:1px solid var(--accent);border-top:none;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;display:none"></div>
      </div>
      <div class="booking-section-label">ë„ì°©ì—­</div>
      <div style="margin-bottom:4px">
        <input type="text" id="pass-to" placeholder="ë„ì°©ì—­ ì…ë ¥" autocomplete="off"
          style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none">
        <div id="ac-pass-to" style="background:var(--bg2);border:1px solid var(--accent);border-top:none;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;display:none"></div>
      </div>
      <div class="booking-section-label">ì´ë¦„ (ì„ íƒ)</div>
      <input type="text" id="pass-name" placeholder="ì˜ˆ: ì¶œê·¼ê¸¸, ì£¼ë§ ì—¬í–‰" autocomplete="off"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text1);font-family:var(--sans);font-size:13px;padding:8px 12px;outline:none;margin-bottom:4px">
      <button class="btn btn-primary booking-confirm-btn" id="pass-reg-confirm" style="margin-top:12px;width:100%;justify-content:center;touch-action:manipulation">ë“±ë¡í•˜ê¸°</button>
      <button class="alarm-popup-close" id="pass-reg-cancel" style="margin-top:8px;touch-action:manipulation">ì·¨ì†Œ</button>
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
  // ac-dropdown ì´ë²¤íŠ¸ ì§ì ‘ ì—°ê²°
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
  if(!from||!to){ alert('ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì„ ì…ë ¥í•´ì£¼ì„¸ìš”.'); return; }
  if(from===to){ alert('ì¶œë°œì—­ê³¼ ë„ì°©ì—­ì´ ê°™ìŠµë‹ˆë‹¤.'); return; }
  // ì‹¤ì œ ì—´ì°¨ ìˆëŠ”ì§€ í™•ì¸
  const exists = ALL_TRAINS.some(t=>{
    const stops=t.stops;
    const fi=stops.findIndex(s=>s.s===from);
    const ti=stops.findIndex(s=>s.s===to);
    return fi>=0&&ti>=0&&fi<ti&&!isPassStop(t,from)&&!isPassStop(t,to);
  });
  if(!exists){ alert(`${from} â†’ ${to} êµ¬ê°„ì„ ìš´í–‰í•˜ëŠ” ì—´ì°¨ê°€ ì—†ìŠµë‹ˆë‹¤.`); return; }
  const passes = loadPasses();
  if(passes.some(p=>p.from===from&&p.to===to)){ alert('ì´ë¯¸ ë“±ë¡ëœ êµ¬ê°„ì…ë‹ˆë‹¤.'); return; }
  passes.push({ id:'pass_'+Date.now(), from, to, name:name||(from+'â†’'+to), createdAt:Date.now() });
  savePasses(passes);
  closePassRegisterPopup();
  _refreshPassViews();
}

// ì •ê¸°ê¶Œ ëª©ë¡ì´ ë³´ì´ëŠ” ëª¨ë“  í™”ë©´ ê°±ì‹  (ë§ˆì´í˜ì´ì§€ ì •ê¸°ê¶Œ ì„¹ì…˜ + ìŠ¹ì°¨ê¶Œ í™”ë©´)
function _refreshPassViews(){
  const my=document.getElementById('result-pass-my');
  if(my)my.innerHTML=renderPassSection();
  if(document.getElementById('result-ticket'))renderTickets();
}

function deletePass(id){
  if(!confirm('ì´ ì •ê¸°ê¶Œì„ ì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?')) return;
  savePasses(loadPasses().filter(p=>p.id!==id));
  _refreshPassViews();
}

// ì •ê¸°ê¶Œìœ¼ë¡œ ë¹ ë¥¸ ì˜ˆë§¤ íŒì—… ì—´ê¸°
// â”€â”€ ì •ê¸°ê¶Œ ì˜ˆë§¤: ì˜ˆë§¤íƒ­ ì´ë™ â†’ ì—´ì°¨ ì„ íƒ â†’ ìš”ì¼ ì„ íƒ â”€â”€
function openPassBookingPopup(passId){
  const pass=loadPasses().find(p=>p.id===passId);
  if(!pass)return;
  window._bookFrom=pass.from; window._bookTo=pass.to; window._activePassId=passId;
  openMySection('book');
  setTimeout(()=>{
    // ë‚ ì§œë¥¼ ë‚´ì¼ë¡œ ë¨¼ì € ì„¤ì • (ì •ê¸°ê¶Œì€ ìš”ì¼ ê¸°ë°˜ â€” ì˜¤ëŠ˜ë¡œ ë‘ë©´ í˜„ì¬ ì‹œê° ì´í›„ í•„í„°ì— ê±¸ë¦¼)
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
  const t=getTrainByNo(trainNo);
  if(!pass||!t)return;
  document.getElementById('book-detail-wrap')?.remove();
  const DAY_NAMES=['ì¼','ì›”','í™”','ìˆ˜','ëª©','ê¸ˆ','í† '];
  const fareHtml=availableSeatClasses(t.grade).map(c=>{
    const fare=calcFare(t,from,to,c);
    return `<button class="booking-seat-option" data-class="${c}"
      onclick="selectSeatClass(this,'${c}');updatePassDayConfirm()">
      <span class="booking-seat-label">${SEAT_CLASSES[c].label}</span>
      <span class="booking-seat-fare">${fare.toLocaleString()}ì›</span>
    </button>`;
  }).join('');
  const wrap=document.createElement('div');
  wrap.id='pass-day-wrap';
  // z-indexëŠ” ì˜ˆë§¤ ìƒì„¸ ì‹œíŠ¸(9901)ë³´ë‹¤ ìœ„ Â· ë²„íŠ¼ì€ ìŠ¤í¬ë¡¤ ì˜ì—­ ë°– ê³ ì • (ëª¨ë°”ì¼ íƒ­ ì”¹í˜ ë°©ì§€)
  wrap.style.cssText='position:fixed;inset:0;z-index:9950;display:flex;align-items:center;justify-content:center;pointer-events:auto';
  wrap.innerHTML=`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);z-index:0" onclick="closePassDaySelector()"></div>
    <div style="position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:14px;width:90vw;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="flex:1;min-height:0;overflow-y:auto;padding:20px 20px 4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:15px;font-weight:700">ğŸŸï¸ ì •ê¸°ê¶Œ ì˜ˆë§¤</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text2)" id="pass-day-clock"></div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">${pass.name} Â· ${from} â†’ ${to}</div>
        <div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <div style="color:var(--c-${gcCssVar(t.grade)});font-weight:700;margin-bottom:4px">${t.grade} ${trainNo}</div>
          <div style="font-family:var(--mono);font-size:13px">${depT} â†’ ${arrT||'-'} Â· ${durStr(depT,arrT)}</div>
        </div>
        <div class="booking-section-label">ë§¤ì£¼ ë°˜ë³µ ìš”ì¼ ì„ íƒ (ë³µìˆ˜ ì„ íƒ)</div>
        <div style="display:flex;gap:6px;margin-bottom:10px">
          ${DAY_NAMES.map((d,i)=>`<button data-day="${i}"
            style="flex:1;padding:10px 2px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;touch-action:manipulation"
            onclick="togglePassDay(this)">${d}</button>`).join('')}
        </div>
        <div id="pass-day-preview" style="font-size:12px;color:var(--text3);margin-bottom:14px;min-height:16px"></div>
        <div class="booking-section-label">ì¢Œì„ ë“±ê¸‰</div>
        <div class="booking-seat-options" style="margin-bottom:14px">${fareHtml}</div>
        <div class="booking-section-label">ì¸ì›</div>
        <div class="booking-passenger-control" style="margin-bottom:8px">
          <button class="booking-stepper-btn" onclick="changePassengerCount(-1)">âˆ’</button>
          <span id="booking-passenger-count">1</span>
          <button class="booking-stepper-btn" onclick="changePassengerCount(1)">+</button>
        </div>
      </div>
      <div style="flex-shrink:0;padding:10px 20px 18px;border-top:1px solid var(--border)">
        <button id="pass-day-confirm" disabled
          style="width:100%;padding:13px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:14px;font-weight:700;cursor:pointer;opacity:.5;touch-action:manipulation">
          ìš”ì¼ê³¼ ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•˜ì„¸ìš”
        </button>
        <button id="pass-day-cancel" class="alarm-popup-close" style="margin-top:8px;width:100%;touch-action:manipulation">ì·¨ì†Œ</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  window._bookingSeatClass=null; window._bookingPassengerCount=1; window._selectedPassDays=[];
  // ëª¨ë°”ì¼ íƒ­ í˜¸í™˜ ë“±ë¡ (inline onclick ëŒ€ì‹ )
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
  if(preview)preview.textContent=dates.length?`ì•ìœ¼ë¡œ 4ì£¼ Â· ${dates.length}ì¥ ì˜ˆë§¤ ì˜ˆì • (${dates.slice(0,2).join(', ')}${dates.length>2?` ì™¸ ${dates.length-2}ê±´`:''})` :'';
  const btn=document.getElementById('pass-day-confirm');
  if(btn){
    const ok=dates.length>0&&!!window._bookingSeatClass;
    btn.disabled=!ok;btn.style.opacity=ok?'1':'0.5';
    btn.textContent=ok?'ğŸ« ì •ê¸°ê¶Œ ì˜ˆë§¤í•˜ê¸°':'ìš”ì¼ê³¼ ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•˜ì„¸ìš”';
  }
}

function closePassDaySelector(){document.getElementById('pass-day-wrap')?.remove();}

function confirmPassDayBooking(passId,trainNo,from,to,depT,arrT){
  const seatClass=window._bookingSeatClass;
  if(!seatClass){alert('ì¢Œì„ ë“±ê¸‰ì„ ì„ íƒí•´ì£¼ì„¸ìš”.');return;}
  const days=window._selectedPassDays||[];
  if(!days.length){alert('ìš”ì¼ì„ ì„ íƒí•´ì£¼ì„¸ìš”.');return;}
  const t=getTrainByNo(trainNo);
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
  const DN=['ì¼','ì›”','í™”','ìˆ˜','ëª©','ê¸ˆ','í† '];
  alert(`ì •ê¸°ê¶Œ ì˜ˆë§¤ ì™„ë£Œ!
${from} â†’ ${to} Â· ${t.grade} ${trainNo}
ë§¤ì£¼ ${days.sort().map(d=>DN[d]).join('Â·')} Â· ${created}ì¥
${SEAT_CLASSES[seatClass].label} Â· ${count}ëª… Â· ${(fare*count).toLocaleString()}ì›/íšŒ`);
  openMySection('ticket');
}

// ì •ê¸°ê¶Œ ì„¹ì…˜ ë Œë”ë§
function renderPassSection(){
  const passes = loadPasses();
  const addBtn = `<button class="btn" style="font-size:12px;padding:5px 12px" onclick="openPassRegisterPopup()">ï¼‹ êµ¬ê°„ ë“±ë¡</button>`;
  if(!passes.length){
    return `<div class="pass-section">
      <div class="pass-section-title">ğŸŸï¸ ì •ê¸°ê¶Œ</div>
      <p class="hint" style="margin:4px 0 8px">ìì£¼ ì´ìš©í•˜ëŠ” êµ¬ê°„ì„ ë“±ë¡í•˜ë©´ ë‚ ì§œë§Œ ì„ íƒí•´ì„œ ë°”ë¡œ ì˜ˆë§¤í•  ìˆ˜ ìˆìŠµë‹ˆë‹¤.</p>
      ${addBtn}
    </div>`;
  }
  const cards = passes.map(p=>`
    <div class="pass-card">
      <div class="pass-card-info" onclick="openPassBookingPopup('${p.id}')">
        <div class="pass-card-name">${p.name}</div>
        <div class="pass-card-route">${p.from} â†’ ${p.to}</div>
      </div>
      <button class="btn btn-primary" style="font-size:12px;padding:6px 14px;white-space:nowrap" onclick="openPassBookingPopup('${p.id}')">ğŸ« ì˜ˆë§¤</button>
      <button class="alarm-del-btn" onclick="deletePass('${p.id}')">âœ•</button>
    </div>`).join('');
  return `<div class="pass-section">
    <div class="pass-section-title">ğŸŸï¸ ì •ê¸°ê¶Œ <span style="font-size:11px;color:var(--text3);font-weight:400">${passes.length}ê°œ ë“±ë¡</span></div>
    ${cards}
    ${addBtn}
  </div>`;
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ğŸª‘ ì—´ì°¨ í¸ì„± & ì¢Œì„ ë°°ì¹˜ ì‹œìŠ¤í…œ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ê³µí†µ ì² ë„ ê·œì¹™: js/shared/nimbi_rail_domain.js
function _wideWindow(grade){ return grade!=='KTX-ì‚°ì²œ' && grade!=='ITX-ë§ˆìŒ' && grade!=='SRT'; }
// ì°½ë¬¸ ë°°ì¹˜ í´ë˜ìŠ¤ â€” ë¬´ê¶í™”: ì „ êµ¬ê°„ 2ì—´ ì •ë ¬ì°½ / KTX ê³„ì—´: ì¢ŒÂ·ìš° í•œ ì—´ì”© ì—‡ê°ˆë¦° ê±¸ì¹¨ì°½ / ê·¸ ì™¸: ì¢Œì„ë‹¹ 1ì°½
function _winClass(grade, side, r, total){
  if(!_wideWindow(grade)) return `win ${side}`;
  // 1ì—´ì€ ë‹¨ë… ì°½, ì´í›„ [2Â·3], [4Â·5]â€¦ ë‘ ì—´ì´ í•œ ì°½ì„ ê³µìœ í•œë‹¤.
  if(r===1) return `win ${side}`;
  return r%2===0 ? (r+1<=total?`win win-wide ${side}`:`win ${side}`) : `${side}`;
}
// ì½˜ì„¼íŠ¸(ì „ì›) ìœ„ì¹˜ â€” ë“±ê¸‰ë³„
function _seatPower(grade, r, isWindow, totalRows){
  if(grade==='ITX-ë§ˆìŒ'||grade==='KTX-ì´ìŒ') return true;      // ì „ì¢Œì„
  if(!isWindow) return false;                                  // ì´í•˜ ì°½ì¸¡ ìë¦¬ë§Œ
  if(grade==='ë¬´ê¶í™”í˜¸'||grade==='ë‚¨ë„í•´ì–‘'||grade==='êµ­ì•…ì™€ì¸') return r===1||r===totalRows; // ë§¨ì•Â·ë§¨ë’·ì—´ ì°½ê°€
  if(grade==='ITX-ìƒˆë§ˆì„') return r<=3||r>totalRows-3;         // ì• 3ì—´Â·ë’¤ 3ì—´ ì°½ê°€
  return r%2===1;                                              // KTX ê³„ì—´: ì°½í‹€ ë§Œë‚˜ëŠ” í™€ìˆ˜ì—´ ì°½ê°€
}

// í˜¼ì¡ë„ ì•Œê³ ë¦¬ì¦˜ â†’ js/features/nimbi_congestion.js ì°¸ì¡°
// â”€â”€ ì¢Œì„ ì„ íƒ íŒì—… â”€â”€
let _selectedSeats=[];
let _seatCarIdx=0;
// 003: ì¢Œì„ ì„ í˜¸ (ë‹¤ì¤‘) â€” pos:ì°½ì¸¡/ë³µë„, dir:ìˆœ/ì—­ë°©í–¥, zone:ì•/ë’¤, pw:ì½˜ì„¼íŠ¸ â€” ì €ì¥ë¨
const _PREF_GROUP={window:'pos',aisle:'pos',fwd:'dir',rev:'dir',front:'zone',rear:'zone',power:'pw'};
let _seatPrefs=(()=>{
  try{
    const raw=JSON.parse(localStorage.getItem('nimbi_seatprefs')||'[]');
    const clean=Array.isArray(raw)?raw.filter(x=>Object.prototype.hasOwnProperty.call(_PREF_GROUP,x)):[];
    const out=new Set();
    clean.forEach(p=>{
      const group=_PREF_GROUP[p];
      for(const old of [...out])if(_PREF_GROUP[old]===group)out.delete(old);
      out.add(p);
    });
    return out;
  }catch(e){return new Set();}
})();
let _seatPrefOpen=false;
function toggleSeatPref(p){
  if(_seatPrefs.has(p)) _seatPrefs.delete(p);
  else { const g=_PREF_GROUP[p]; for(const x of [..._seatPrefs]) if(_PREF_GROUP[x]===g) _seatPrefs.delete(x); _seatPrefs.add(p); }
  try{localStorage.setItem('nimbi_seatprefs',JSON.stringify([..._seatPrefs]));}catch(e){}
  switchSeatCar(_seatCarIdx);
}
function toggleSettingsSeatPref(p){
  if(_seatPrefs.has(p)) _seatPrefs.delete(p);
  else {
    const g=_PREF_GROUP[p];
    for(const x of [..._seatPrefs])if(_PREF_GROUP[x]===g)_seatPrefs.delete(x);
    _seatPrefs.add(p);
  }
  try{localStorage.setItem('nimbi_seatprefs',JSON.stringify([..._seatPrefs]));}catch(e){}
  const el=document.getElementById('my-sub-content');
  if(el)renderSettingsSection(el);
}
function clearSettingsSeatPrefs(){
  _seatPrefs.clear();
  try{localStorage.setItem('nimbi_seatprefs','[]');}catch(e){}
  const el=document.getElementById('my-sub-content');
  if(el)renderSettingsSection(el);
}
function toggleSeatPrefPanel(){ _seatPrefOpen=!_seatPrefOpen; const p=document.getElementById('seat-pref-panel'); if(p)p.classList.toggle('open',_seatPrefOpen); const b=document.getElementById('pref-toggle-btn'); if(b)b.classList.toggle('open',_seatPrefOpen); }
function clearSeatPrefs(){ _seatPrefs.clear(); try{localStorage.setItem('nimbi_seatprefs','[]');}catch(e){} switchSeatCar(_seatCarIdx); }
// 003Â·004: ì¢Œì„ ìë™ ë°°ì • (ì„ í˜¸/ì¸ì ‘/ë§ˆì£¼ë³´ê¸°)
function _seatAutoPick(mode){
  const wrap=document.getElementById('seat-selector-wrap'); if(!wrap)return;
  const trainNo=wrap.dataset.trainNo, travelDate=wrap.dataset.travelDate, seatClass=wrap.dataset.seatClass;
  const t=getTrainByNo(trainNo); if(!t)return;
  const composition=getCarComposition(getFormationType(t.grade,trainNo));
  const validCars=getSeatDisplayCars(composition,seatClass,t);
  const car=validCars[_seatCarIdx]; if(!car||!car.cols){return;}
  const booked=getBookedSeats(trainNo,travelDate,null,null,seatClass), missing=new Set(car.missingSeats||[]);
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
    if(!pool.length){ alert('ì„ í˜¸ ì¡°ê±´ì— ë§ëŠ” ë¹ˆ ì¢Œì„ì´ ì´ í˜¸ì°¨ì— ì—†ìŠµë‹ˆë‹¤.\nì¡°ê±´ì„ ì¤„ì´ê±°ë‚˜ ë‹¤ë¥¸ í˜¸ì°¨ë¥¼ í™•ì¸í•´ ì£¼ì„¸ìš”.'); return; }
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; } // ì¡°ê±´ ë‚´ ëœë¤
    pick=pool.slice(0,count).map(s=>seatId(car,s.r,s.col));
    if(pick.length<count){ setTimeout(()=>alert(`ì„ í˜¸ ì¡°ê±´ì— ë§ëŠ” ì¢Œì„ì´ ${pick.length}ì„ë¿ì…ë‹ˆë‹¤.\në‚˜ë¨¸ì§€ëŠ” ì§ì ‘ ì„ íƒí•˜ê±°ë‚˜ ì¡°ê±´ì„ ì¤„ì—¬ ì£¼ì„¸ìš”.`),50); }
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
  if(!pick.length){ alert('ì´ í˜¸ì°¨ì—ì„œ ì¡°ê±´ì— ë§ëŠ” ì¢Œì„ì„ ì°¾ì§€ ëª»í–ˆì–´ìš”. ë‹¤ë¥¸ í˜¸ì°¨ë¥¼ í™•ì¸í•´ ì£¼ì„¸ìš”.'); return; }
  _selectedSeats=pick.slice(0, mode==='facing'?4:count);
  switchSeatCar(_seatCarIdx);
}

function openSeatSelector(trainNo, travelDate, seatClass){
  const t=getTrainByNo(trainNo);
  if(!t)return;
  const formType=getFormationType(t.grade,trainNo);
  const composition=getCarComposition(formType);
  const validCars=getSeatDisplayCars(composition,seatClass,t);
  if(!validCars.length){alert('í•´ë‹¹ ì¢Œì„ ë“±ê¸‰ì˜ í˜¸ì°¨ê°€ ì—†ìŠµë‹ˆë‹¤.');return;}
  generateVirtualBookings(trainNo,travelDate,validCars,null,null,seatClass);
  _selectedSeats=[]; _seatCarIdx=0;
  document.getElementById('seat-selector-wrap')?.remove();
  const wrap=document.createElement('div');
  wrap.id='seat-selector-wrap';
  wrap.dataset.trainNo=trainNo; wrap.dataset.travelDate=travelDate; wrap.dataset.seatClass=seatClass;
  wrap.dataset.trainDir=t.dir||'up';
  const xLeg=window._xferSeatCtx&&window._xfer?.legs?.[window._xferSeatCtx.legIdx];
  const direct=window._bArgs&&String(window._bArgs.trainNo)===String(trainNo)?window._bArgs:null;
  wrap.dataset.from=xLeg?.from||direct?.fromStn||t.stops?.[0]?.s||'';
  wrap.dataset.to=xLeg?.to||direct?.toStn||t.stops?.[t.stops.length-1]?.s||'';
  wrap.style.cssText='position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;background:var(--bg)';
  document.body.appendChild(wrap);
  _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,getBookedSeats(trainNo,travelDate,null,null,seatClass),composition);
}

function _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,booked,composition){
  const car=validCars[_seatCarIdx];
  const count=window._bookingPassengerCount||1;
  const missing=new Set(car.missingSeats||[]);
  const isFreeCar = car.type==='free' || !car.rows; // ììœ ì„/ì…ì„ ì¹¸: ì§€ì • ì¢Œì„ ì—†ìŒ
  const isKtxType=['ktx-1','ktx-sancheon','ktx-eum'].includes(getFormationType(t.grade,trainNo));

  // ë°©í–¥ í‘œì‹œ: ì—­ë°©í–¥ ì¢Œì„ì´ ìˆëŠ” ì¹¸(revRows>0)ë§Œ í†µë¡œì— ì—´ë³„ í™”ì‚´í‘œ. ì—­ë°©í–¥ ì—†ëŠ” ì¹¸(KTX ì´ì™¸ ë“±)ì€ ë°©í–¥ ë¯¸í‘œì‹œ.
  const revRows=car.revRows||0;
  const showDir=revRows>0;

  // ì”ì—¬ì„ í•œ ë²ˆì— ê³„ì‚° (getCarRemaining ë°˜ë³µ í˜¸ì¶œ ë°©ì§€)
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
    const rowOrder=Array.from({length:car.rows},(_,idx)=>idx+1);
    for(const r of rowOrder){
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
            ? `<span class="seat aisle seatmap-arrow ${face}">${face==='fwd'?'â–²':'â–½'}</span>`
            : '<span class="seat aisle"></span>';
        }
      });
      html+=`<div class="seatmap-row"><span class="seatmap-rownum">${r}</span>${cells}</div>`;
    }
    return html;
  }

  // í˜„ì¬ í˜¸ì°¨ë§Œ ì”ì—¬ì„ ê³„ì‚°, ë‚˜ë¨¸ì§€ëŠ” í´ë¦­ ì‹œ ê³„ì‚° (ì„±ëŠ¥ ìµœì í™”)
  const curRem=calcRem(car);
  const carTabs=validCars.map((c,i)=>`<button class="seat-car-tab${i===_seatCarIdx?' active':''}" onclick="switchSeatCar(${i})">
      ${c.car}í˜¸ì°¨<br>
      <span style="font-size:10px;font-weight:400">${i===_seatCarIdx?curRem+'ì„':'â€¦'}</span>
    </button>`).join('');

  wrap.innerHTML=`
    <div class="seat-header">
      <button class="seat-back-btn" onclick="closeSeatSelector()">âœ•</button>
      <div class="seat-header-info">
        <div style="font-size:14px;font-weight:700">${t.grade} ${trainNo}</div>
        <div style="font-size:11px;color:var(--text2)">${car.car}í˜¸ì°¨ Â· ì”ì—¬ ${curRem}ì„</div>
      </div>
      <button class="seat-info-btn" onclick="openSeatDemandInfo()" aria-label="ì˜ˆë§¤ í˜„í™© ì •ë³´" title="ì˜ˆë§¤ í˜„í™© ì •ë³´">i</button>
      <button class="seat-facility-btn" onclick="openSeatFacilityInfo()" aria-label="ì°¨ë‚´ í¸ì˜ì‹œì„¤" title="ì°¨ë‚´ í¸ì˜ì‹œì„¤">ğŸš»</button>
      <div style="font-size:12px;color:var(--text2);font-family:var(--mono)" id="seat-sel-clock"></div>
    </div>
    <div class="seat-car-tabs">${carTabs}</div>
    <div class="seat-legend">
      <span class="seat-legend-item"><span class="seat-dot available"></span>ì„ íƒê°€ëŠ¥</span>
      <span class="seat-legend-item"><span class="seat-dot selected"></span>ì„ íƒë¨</span>
      <span class="seat-legend-item"><span class="seat-dot booked"></span>ì˜ˆì•½ë¨</span>
      <span class="seat-legend-item">â–® ì°½ì¸¡</span>
      <span class="seat-legend-item">âš¡ ì½˜ì„¼íŠ¸</span>
      ${showDir?'<span class="seat-legend-item"><span class="seatmap-arrow fwd">â–²</span>ìˆœë°©í–¥ <span class="seatmap-arrow rev">â–½</span>ì—­ë°©í–¥</span>':''}
    </div>
    <div class="seat-label-row">
      <div style="font-size:11px;color:var(--text3)">ì°½ì¸¡ ë‚´ì¸¡</div>
      <div></div>
      <div style="font-size:11px;color:var(--text3)">ë‚´ì¸¡ ì°½ì¸¡</div>
    </div>
    <div class="seat-auto-bar">
      <button class="seat-auto-chip act" onclick="_seatAutoPick('pref')">âœ¨ ìë™ ë°°ì •</button>
      ${count>=2?`<button class="seat-auto-chip act" onclick="_seatAutoPick('adjacent')">ğŸ‘¥ ì¸ì ‘</button>`:''}
      ${count===4?`<button class="seat-auto-chip act" onclick="_seatAutoPick('facing')">ğŸ”„ ë§ˆì£¼</button>`:''}
      <button class="seat-auto-chip pref-toggle${_seatPrefs.size?' on':''}${_seatPrefOpen?' open':''}" id="pref-toggle-btn" onclick="toggleSeatPrefPanel()">ğŸ¯ ì„ í˜¸${_seatPrefs.size?` (${_seatPrefs.size})`:''} <span class="pref-caret">â–¾</span></button>
    </div>
    <div class="seat-pref-panel${_seatPrefOpen?' open':''}" id="seat-pref-panel">
      <button class="seat-auto-chip${_seatPrefs.has('window')?' on':''}" onclick="toggleSeatPref('window')">ğŸªŸ ì°½ì¸¡</button>
      ${car.cols.length>2?`<button class="seat-auto-chip${_seatPrefs.has('aisle')?' on':''}" onclick="toggleSeatPref('aisle')">ğŸš¶ ë³µë„</button>`:''}
      <button class="seat-auto-chip${_seatPrefs.has('power')?' on':''}" onclick="toggleSeatPref('power')">âš¡ ì½˜ì„¼íŠ¸</button>
      <button class="seat-auto-chip${_seatPrefs.has('front')?' on':''}" onclick="toggleSeatPref('front')">â¬† ì•ìª½</button>
      <button class="seat-auto-chip${_seatPrefs.has('rear')?' on':''}" onclick="toggleSeatPref('rear')">â¬‡ ë’¤ìª½</button>
      ${showDir?`<button class="seat-auto-chip${_seatPrefs.has('fwd')?' on':''}" onclick="toggleSeatPref('fwd')">â–² ìˆœë°©í–¥</button>
      <button class="seat-auto-chip${_seatPrefs.has('rev')?' on':''}" onclick="toggleSeatPref('rev')">â–½ ì—­ë°©í–¥</button>`:''}
      ${_seatPrefs.size?`<button class="seat-auto-chip pref-clear" onclick="clearSeatPrefs()">âœ• ì´ˆê¸°í™”</button>`:''}
    </div>
    <div class="seat-map">${isFreeCar
      ? `<div class="seatmap"><div class="seatmap-caption" style="margin-top:48px;font-size:13px">ğŸš‰ <b>${car.car}í˜¸ì°¨ Â· ${car.label||'ììœ ì„'}</b><br><br><span style="color:var(--text3)">ì§€ì • ì¢Œì„ì´ ì—†ëŠ” ì…ì„Â·ììœ ì„ ì „ìš© ì¹¸ì…ë‹ˆë‹¤.<br>ì¢Œì„ ì„ íƒ ì—†ì´ ì˜ˆë§¤í•´ ì£¼ì„¸ìš”.</span></div></div>`
      : `<div class="seat-layout-shell" aria-label="${car.car}í˜¸ì°¨ ì¢Œì„ ë°°ì¹˜">
          <div class="seatmap-grid pick">${seatHTML()}</div>
        </div>`}</div>
    <div class="seat-footer">
      <div id="seat-footer-info" style="flex:1;font-size:12px;color:var(--text2)">ì¢Œì„ì„ ì„ íƒí•´ì£¼ì„¸ìš” (${count}ëª…)</div>
      <button class="seat-confirm-btn" id="seat-confirm-btn" disabled style="opacity:.5"
        onclick="confirmSeatSelection()">ì„ íƒ ì™„ë£Œ</button>
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
  info.textContent=_selectedSeats.length?`ì„ íƒ ì¢Œì„: ${_selectedSeats.join(', ')} (${_selectedSeats.length}/${count}ëª…)`:`ì¢Œì„ì„ ì„ íƒí•´ì£¼ì„¸ìš” (${count}ëª…)`;
  btn.disabled=!ok; btn.style.opacity=ok?'1':'0.5';
}

window.switchSeatCar=function(idx){
  _seatCarIdx=idx;
  const wrap=document.getElementById('seat-selector-wrap');
  if(!wrap)return;
  const trainNo=wrap.dataset.trainNo, travelDate=wrap.dataset.travelDate, seatClass=wrap.dataset.seatClass;
  const t=getTrainByNo(trainNo); if(!t)return;
  const formType=getFormationType(t.grade,trainNo);
  const composition=getCarComposition(formType);
  const validCars=getSeatDisplayCars(composition,seatClass,t);
  _renderSeatMap(wrap,t,trainNo,travelDate,seatClass,validCars,getBookedSeats(trainNo,travelDate,null,null,seatClass),composition);
};

function closeSeatSelector(){
  document.getElementById('seat-demand-info-wrap')?.remove();
  document.getElementById('seat-facility-info-wrap')?.remove();
  document.getElementById('seat-selector-wrap')?.remove();
}

function openSeatFacilityInfo(){
  const seatWrap=document.getElementById('seat-selector-wrap');if(!seatWrap)return;
  const t=getTrainByNo(seatWrap.dataset.trainNo);if(!t)return;
  const composition=getCarComposition(getFormationType(t.grade,t.no)).slice().sort((a,b)=>a.car-b.car);
  const rows=composition.map(car=>{
    const facilities=[...(car.facilities?.start||[]),...(car.facilities?.end||[])];
    const names=[...new Set(facilities.map(item=>`${item.icon||'â€¢'} ${item.label}`))];
    const tags=car.tags||[];
    const tagIcon=tag=>tag.includes('ìœ ì•„')?'ğŸ‘¶':tag.includes('íœ ì²´ì–´')?'â™¿':'â€¢';
    const contents=[...names,...tags.map(tag=>`${tagIcon(tag)} ${tag}`)];
    if(car.cafe) contents.push('â˜• ì¹´í˜ê°ì°¨');
    return `<div class="seat-facility-row">
      <b>${car.car}í˜¸ì°¨</b>
      <div>${contents.length?contents.map(x=>`<span>${x}</span>`).join(''):'<small>ë³„ë„ í¸ì˜ì‹œì„¤ ì—†ìŒ</small>'}</div>
      ${car.notice?`<p>${car.notice}</p>`:''}
    </div>`;
  }).join('');
  document.getElementById('seat-facility-info-wrap')?.remove();
  const info=document.createElement('div');
  info.id='seat-facility-info-wrap';
  info.innerHTML=`<div class="seat-demand-info-backdrop"></div>
    <section class="seat-facility-info-card" role="dialog" aria-modal="true" aria-label="ì°¨ë‚´ í¸ì˜ì‹œì„¤ ìœ„ì¹˜">
      <div class="seat-demand-info-head"><div><small>${t.grade} ${t.no}</small><b>ì°¨ë‚´ í¸ì˜ì‹œì„¤ ìœ„ì¹˜</b></div><button aria-label="ë‹«ê¸°">âœ•</button></div>
      <div class="seat-facility-list">${rows}</div>
      <p>í¸ì„± ìš´ìš©ì— ë”°ë¼ ì‹¤ì œ ì„¤ë¹„ ìœ„ì¹˜ê°€ ë‹¬ë¼ì§ˆ ìˆ˜ ìˆìŠµë‹ˆë‹¤.</p>
    </section>`;
  document.body.appendChild(info);
  const close=()=>info.remove();
  info.querySelector('button')?.addEventListener('click',close);
  info.querySelector('.seat-demand-info-backdrop')?.addEventListener('click',close);
}

function openSeatDemandInfo(){
  const seatWrap=document.getElementById('seat-selector-wrap');if(!seatWrap)return;
  const t=getTrainByNo(seatWrap.dataset.trainNo),date=seatWrap.dataset.travelDate;
  if(!t)return;
  const from=seatWrap.dataset.from,to=seatWrap.dataset.to;
  const inventory=typeof getTrainInventorySnapshot==='function'?getTrainInventorySnapshot(t,date):null;
  const cong=typeof getODCongestion==='function'?getODCongestion(t,from,to,date):null;
  if(!inventory)return;
  let busiest='-';
  if(inventory.segmentLoads?.length){
    let max=-1,index=0;
    inventory.segmentLoads.forEach((value,i)=>{if(value>max){max=value;index=i;}});
    busiest=`${inventory.stops[index]} â†’ ${inventory.stops[index+1]} Â· ${Math.round(max/Math.max(1,inventory.capacity.total)*100)}%`;
  }
  const status=_bookSeatStatus(cong);
  document.getElementById('seat-demand-info-wrap')?.remove();
  const info=document.createElement('div');
  info.id='seat-demand-info-wrap';
  info.innerHTML=`<div class="seat-demand-info-backdrop"></div>
    <section class="seat-demand-info-card" role="dialog" aria-modal="true" aria-label="ì˜ˆë§¤ í˜„í™©">
      <div class="seat-demand-info-head"><div><small>${from} â†’ ${to}</small><b>ì˜ˆë§¤ í˜„í™©</b></div><button aria-label="ë‹«ê¸°">âœ•</button></div>
      <div class="seat-demand-info-grid">
        <div><span>ì´ ì¢Œì„</span><b>${inventory.capacity.total}ì„</b></div>
        <div><span>ì¡°íšŒ êµ¬ê°„ í˜„ì¬ ì˜ˆì•½</span><b>${cong?.booked||0}ëª…</b></div>
        <div><span>ì¡°íšŒ êµ¬ê°„ ìƒíƒœ</span><b style="color:${status.color}">${status.label}</b></div>
        <div><span>ì˜ˆìƒ ìµœì¢… ì˜ˆë§¤ìœ¨</span><b>${Math.round((inventory.expectedFinalRate||0)*100)}%</b></div>
      </div>
      <div class="seat-demand-info-busiest"><span>ê°€ì¥ í˜¼ì¡í•œ êµ¬ê°„</span><b>${busiest}</b></div>
      <p>ìˆ˜ìš”Â·ì˜ˆì•½ ì‹œì Â·ì·¨ì†Œí‘œë¥¼ ë°˜ì˜í•œ ì‹œë®¬ë ˆì´ì…˜ ì •ë³´ì´ë©° ì‹¤ì œ ì˜ˆë§¤ ìƒí™©ì— ë”°ë¼ ë‹¬ë¼ì§ˆ ìˆ˜ ìˆìŠµë‹ˆë‹¤.</p>
    </section>`;
  document.body.appendChild(info);
  const close=()=>info.remove();
  info.querySelector('button')?.addEventListener('click',close);
  info.querySelector('.seat-demand-info-backdrop')?.addEventListener('click',close);
}

function confirmSeatSelection(){
  if(!_selectedSeats.length){alert('ì¢Œì„ì„ ì„ íƒí•´ì£¼ì„¸ìš”.');return;}
  // í™˜ìŠ¹ ì˜ˆë§¤ ì‹œíŠ¸ì—ì„œ ì˜¨ ì¢Œì„ ì„ íƒì´ë©´ í•´ë‹¹ êµ¬ê°„ì— ë°˜ì˜í•˜ê³  ì‹œíŠ¸ë¡œ ë³µê·€
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
  // ì˜ˆë§¤ ë²„íŠ¼ í™œì„±í™”
  const confirmBtn=document.getElementById('booking-confirm-btn');
  if(confirmBtn){confirmBtn.disabled=false;confirmBtn.style.opacity='1';confirmBtn.textContent='ğŸ« ì˜ˆë§¤í•˜ê¸°';}
}

function openSeatSelectorFromBooking(trainNo){
  const dateInp=document.getElementById('booking-date');
  const travelDate=dateInp?.value||window._currentTravelDate||todayLocalStr();
  const seatClass=window._bookingSeatClass||'general';
  if(!window._bookingSeatClass){alert('ì¢Œì„ ë“±ê¸‰ì„ ë¨¼ì € ì„ íƒí•´ì£¼ì„¸ìš”.');return;}
  if(seatClass==='standing'){alert('ì…ì„Â·ììœ ì„ì€ ì§€ì • ì¢Œì„ì´ ì—†ëŠ” ì „ìš© ì¹¸ì…ë‹ˆë‹¤.\nì¢Œì„ ì„ íƒ ì—†ì´ ì˜ˆë§¤í•˜ì‹œë©´ ë©ë‹ˆë‹¤.');return;}
  window._bookingPassengerCount = window._bookingPassengerCount||_bookPassengerCount||1;
  openSeatSelector(trainNo,travelDate,seatClass);
}


// ìŠ¹ì°¨ê¶Œ íƒ­ ë Œë”ë§
let _ticketFilterTab='upcoming'; // upcoming | past | cancelled
function setTicketFilter(f){_ticketFilterTab=f;renderTickets();}
let _ticketView='list'; // list | calendar
let _ticketCalYM=null;   // {y,m} í‘œì‹œ ì¤‘ì¸ ì—°Â·ì›” (m: 0-11)
let _ticketCalSel=null;  // ì„ íƒí•œ ë‚ ì§œ 'YYYY-MM-DD'
function setTicketView(v){_ticketView=v;renderTickets();}
function ticketCalShift(delta){
  if(!_ticketCalYM){const n=new Date();_ticketCalYM={y:n.getFullYear(),m:n.getMonth()};}
  let m=_ticketCalYM.m+delta, y=_ticketCalYM.y;
  while(m<0){m+=12;y--;} while(m>11){m-=12;y++;}
  _ticketCalYM={y,m}; _ticketCalSel=null; renderTickets();
}
function selectTicketCalDate(d){ _ticketCalSel=(_ticketCalSel===d?null:d); renderTickets(); }

// â”€â”€ íƒ‘ìŠ¹ ì¤‘ì¸ ì—´ì°¨ ìœ„ì ¯ (ìŠ¹ì°¨ê¶Œ íƒ­ ìƒë‹¨ ê³ ì • í‘œì‹œ) â”€â”€
function renderTripWidget(active){
  if(!active) return '';
  const {ticket,train,status,preBoard,minsUntilDep,preArr}=active;

  // â”€â”€ ìŠ¹ì°¨ ì¤€ë¹„ ì¤‘ ìœ„ì ¯ (ì¶œë°œ 10ë¶„ ì „) â”€â”€
  if(preBoard){
    const minStr = fmtEta(minsUntilDep);
    return `<div class="trip-widget trip-widget-preboard" onclick="jumpToTrain('${train.no}')">
      <div class="trip-widget-head">
        <span class="trip-widget-preboard-dot"></span>
        <span class="trip-widget-label" style="color:var(--orange)">ìŠ¹ì°¨ ì¤€ë¹„</span>
        <span class="trip-widget-grade" style="color:var(--c-${gcCssVar(train.grade)})">${train.grade}</span>
        <span class="trip-widget-no">${train.no}</span>
      </div>
      <div class="trip-widget-state" style="color:var(--orange)">ğŸš‰ ${minStr} ì¶œë°œ ì˜ˆì •</div>
      <div class="trip-widget-preboard-info">
        <span>${ticket.fromStn} <span style="font-family:var(--mono);color:var(--accent)">${ticket.depTime||''}</span> ì¶œë°œ</span>
        <span style="color:var(--text3)">â†’</span>
        <span>${ticket.toStn} <span style="font-family:var(--mono);color:var(--green)">${ticket.arrTime||''}</span> ë„ì°©</span>
      </div>
      <div class="trip-widget-preboard-seat">${ticket.seatClassLabel} Â· ${seatSummary(ticket.seats)}</div>
    </div>`;
  }

  // â”€â”€ ë„ì°© ì¤€ë¹„ ì¤‘ ìœ„ì ¯ (ë„ì°© 5ë¶„ ì „) â”€â”€
  if(active.preArr){
    const minStr = fmtEta(active.minsUntilArr);
    const gradeC = `var(--c-${gcCssVar(train.grade)})`;
    return `<div class="trip-widget trip-widget-prearr" onclick="jumpToTrain('${train.no}')">
      <div class="trip-widget-head">
        <span class="trip-widget-prearr-dot"></span>
        <span class="trip-widget-label" style="color:var(--green)">ë„ì°© ì¤€ë¹„</span>
        <span class="trip-widget-grade" style="color:${gradeC}">${train.grade}</span>
        <span class="trip-widget-no">${train.no}</span>
      </div>
      <div class="trip-widget-state" style="color:var(--green)">ğŸš‰ ${minStr} ë„ì°© ì˜ˆì •</div>
      <div class="trip-widget-preboard-info">
        <span>${ticket.fromStn} <span style="font-family:var(--mono);color:var(--accent)">${ticket.depTime||''}</span> ì¶œë°œ</span>
        <span style="color:var(--text3)">â†’</span>
        <span>${ticket.toStn} <span style="font-family:var(--mono);color:var(--green)">${ticket.arrTime||''}</span> ë„ì°©</span>
      </div>
      <div class="trip-widget-preboard-seat">${ticket.seatClassLabel} Â· ${seatSummary(ticket.seats)}</div>
    </div>`;
  }

  const tl=getTripTimeline3(train,status,ticket);
  // ì—´ì°¨ ë“±ê¸‰ ìƒ‰ìƒê°’(hex) â€” íƒ€ì„ë¼ì¸ ì„ Â·ì§„í–‰ë°”ì— ì•ŒíŒŒ ì ‘ë¯¸ì‚¬(55/aa ë“±)ë¥¼ ë¶™ì´ë¯€ë¡œ hexì—¬ì•¼ í•¨
  const gradeColor = GRADE_COLORS[train.grade] || '#8b949e';

  let stateLabel;
  if(status.atStn){
    stateLabel=`${status.atStn}ì—­ ì •ì°¨ ì¤‘`;
  } else if(status.passStn){
    stateLabel=`${status.passStn}ì—­ í†µê³¼ ì¤‘`;
  } else {
    stateLabel=`${ticket.fromStn} â†’ ${ticket.toStn} ì´ë™ ì¤‘`;
  }

  // ì§„í–‰ë¥  ê³„ì‚° (íƒ‘ìŠ¹êµ¬ê°„ ê¸°ì¤€)
  const depM=toMin(ticket.depTime), arrM=toMin(ticket.arrTime);
  const _wNow=new Date(); const nowM=_wNow.getHours()*60+_wNow.getMinutes();
  let pct=0;
  if(depM!==null&&arrM!==null&&nowM!==null){
    const total=(arrM>=depM)?(arrM-depM):(arrM+1440-depM);
    const elapsed=(nowM>=depM)?(nowM-depM):(nowM+1440-depM);
    pct=Math.max(0,Math.min(100,Math.round(elapsed/Math.max(total,1)*100)));
  }

  // ëª©ì ì§€ê¹Œì§€ ë‚¨ì€ ì‹œê°„ ê³„ì‚° (ìµì¼ ë„ì°© í¬í•¨, 24h ì´ˆê³¼ ë³´ì •)
  let arrivalStr='';
  if(arrM!==null&&nowM!==null){
    let diff=(arrM>=depM)?(arrM-nowM):(arrM+1440-nowM);
    if(diff<0) diff=0;
    if(diff>=1440) diff=diff%1440;
    arrivalStr = diff===0 ? `${ticket.toStn} ê³§ ë„ì°©`
                          : `${ticket.toStn} ${fmtEta(diff)} ë„ì°©`;
  }

  // 013: ì´ë²ˆ ì •ì°¨ì—­ ë„ì°© ì•ˆë‚´ (ë¶„ ë‹¨ìœ„) â€” í—¤ë” ìš°ì¸¡ ìƒë‹¨ì— í‘œì‹œ
  let nextEtaHtml='';
  if(tl&&tl.cur&&tl.cur.time){
    const cm=toMin(tl.cur.time);
    if(cm!==null){
      let d=cm-nowM; if(d<0)d+=1440;
      if(d<=180){
        const atCur = status.atStn && status.atStn===tl.cur.name;
        const etaTxt = atCur ? 'ì •ì°¨ ì¤‘' : (d<=0 ? 'ê³§ ë„ì°©' : `${d}ë¶„ í›„ ë„ì°© ì˜ˆì •`);
        nextEtaHtml=`<span class="trip-widget-head-eta"><span class="tw-eta-stn">ì´ë²ˆ ì •ì°¨ ${tl.cur.name}</span><span class="tw-eta-min">${etaTxt}</span></span>`;
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
        <div class="trip-tl-name-cell"><span class="trip-tl-name current" style="color:${gradeColor}">${tl.cur?tl.cur.n×vë–òµë(š+myÕ¹Ñ1¥ÍÑ•¹•È ¥¹ÁÕĞœ° ¤ôùì(€€€½¹ÍĞÄõ¥¹À¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€¥˜ …Ä¥íÉ•Ì¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÙÁà€À€ÄÉÁàˆû²^´ƒ²vÓ®š²vƒ²z®‚—¶Vc®¦ĞƒªŞàƒ²^·²v`ƒ²vã²‚G²^·ªÎğƒªÆÃ®š³ªÂ ƒ¶Fs².s®B§®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€€€}µ½‘•MÑ¹M•ÑÍ%¹¥Ğ ¤ì(€€€½¹ÍĞ…¹‘Ìõl¸¸¸¡}ÑÉ…¥¹MÑ¹M•Ñññmt¥t¹™¥±Ñ•È¡Ìôùµ…Ñ¡•ÍEÕ•Éä¡Ì±Ä¤¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹±•¹Ñ µˆ¹±•¹Ñ ¤¹Í±¥” À°Ì¤ì(€€€¥˜ ……¹‘Ì¹±•¹Ñ ¥íÉ•Ì¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÙÁà€À€ÄÉÁàˆû²vó²æc¶Vc®*PƒªâÃ²Â£²^·²vĞƒ²^²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€€€É•Ì¹¥¹¹•É!Q50õ…¹‘Ì¹µ…À¡ÍÑ¸ôùì(€€€€€½¹ÍĞ¹‰Ìõ}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ì¡ÍÑ¸¤ì(€€€€€½¹ÍĞÉ½İÌõ¹‰Ì¹±•¹Ñ ı¹‰Ì¹µ…À¡¹ˆôù€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàíÁ…‘‘¥¹œèÙÁà€Àí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ÌÌí™½¹ĞµÍ¥é”èÄÍÁàˆø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™±•àèÄí™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í¹ˆ¹¹ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø‘í¹ˆ¹¹Ñ½¥á• Ä¥õ­´ğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤(€€€€€€€€èœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÑÁà€À€áÁàˆøÄÁ­´ƒ²vÓ®
Ğƒ²vã²‚G²^´ƒ²^²v0ğ½‘¥Øøœì(€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èÄÉÁàˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèàÀÀíÁ…‘‘¥¹œèÙÁà€À€ÉÁàí½±½ÈéÙ…È ´µ…•¹ĞÈ¤ˆûÂ~j$€‘íÍÑ¹ô€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµİ•¥¡ĞèĞÀÀí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÅÁàˆû²vã²‚G²^´€‘í¹‰Ì¹±•¹Ñ¡÷ªÎÌğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€‘íÉ½İÍô(€€€€€€ğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤ì(€ô¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôù¥¹À¹™½ÕÌ ¤°ÔÀ¤ì)ô(¼¼ƒ²vã²‚G²^´ƒ²V#®
Ğƒ¶2w²^€£²öS®‚#²vó¶„ƒ²*“¶²vğ¤ƒŠPƒ¶fW²vàƒ².pƒªÎ²4ƒ²¶Z$)™Õ¹Ñ¥½¸}‰½½­‘©½¹™¥É´¡µÍœ±½¹=¬¥ì(€½¹ÍĞ‰õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€‰¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸ÔÔ¤íèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÈÑÁàœì(€‰¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàíµ…àµİ¥‘Ñ èÌĞÁÁàíİ¥‘Ñ èÄÀÀ”íÁ…‘‘¥¹œèÈÁÁà€ÄáÁàˆø(€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÕÁàí™½¹Ğµİ•¥¡ĞèàÀÀíµ…É¥¸µ‰½ÑÑ½´èÄÁÁàí½±½ÈéÙ…È ´µ…•¹ĞÈ¤ˆû²vÓ²j¤ƒ²V#®
Ğğ½‘¥Øø(€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÌ¸ÕÁàí±¥¹”µ¡•¥¡ĞèÄ¸Üí½±½ÈéÙ…È ´µÑ•áĞÄ¤ˆø‘íµÍôğ½‘¥Øø(€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèáÁàíµ…É¥¸µÑ½ÀèÄÙÁàˆø(€€€€€€ñ‰ÕÑÑ½¸‘…Ñ„µ…Ğô‰¹¼ˆÍÑå±”ô‰™±•àèÄíÁ…‘‘¥¹œèÄÅÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆû²Ş£²0ğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸‘…Ñ„µ…Ğô‰½¬ˆÍÑå±”ô‰™±•àèÄíÁ…‘‘¥¹œèÄÅÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ…•¹Ğ¤í‰…­É½Õ¹éÙ…È ´µ…•¹Ğ¤í½±½Èè™™˜í™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆû¶fW²vàğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øøğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡‰¤ì(€‰¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µ…Ğô‰½¬‰tœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí‰¹É•µ½Ù” ¤í½¹=¬ ¤íô¤ì(€‰¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µ…Ğô‰¹¼‰tœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôù‰¹É•µ½Ù” ¤¤ì(€‰¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•Ğôôõ‰¥‰¹É•µ½Ù” ¤íô¤ì)ô()™Õ¹Ñ¥½¸Í•…É¡	½½­QÉ…¥¹Ì¡¥¹±Õ‘•QÉ…¹Í™•È°¥¹±Õ‘•‘¨¥ì(€½¹ÍĞ™É½´€ôİ¥¹‘½Ü¹}‰½½­É½´ì(€½¹ÍĞÑ¼€ôİ¥¹‘½Ü¹}‰½½­Q¼ì(€½¹ÍĞ‘…Ñ•¼€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘…Ñ”µ¼œ¤ü¹Ù…±Õ”ì(€½¹ÍĞ‘…Ñ•	…¬€ô}‰½½­I½Õ¹‘QÉ¥À€ü‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘…Ñ”µ‰…¬œ¤ü¹Ù…±Õ”€è¹Õ±°ì(€½¹ÍĞ•°€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµ‰½½¬µÉ•ÍÕ±ÑÌœ¤ñğ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ•ÍÕ±ÑÌœ¤ì(€¥˜ …•°¤É•ÑÕÉ¸ì(€€¼¼ƒªÂ®*S®
€ƒŠHƒ¶G²*ç²vğƒ®>gªâÃ¶fP(€¥˜¡‘…Ñ•¼¥ì(€€€½¹ÍĞ‰‘°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½­¥¹œµ‘…Ñ”œ¤ì(€€€¥˜¡‰‘°¤‰‘°¹Ù…±Õ”õ‘…Ñ•¼ì(€€€İ¥¹‘½Ü¹}ÕÉÉ•¹ÑQÉ…Ù•±…Ñ”õ‘…Ñ•¼ì(€ô((€¥˜ …™É½µñğ…Ñ¼¥ì(€€€•°¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~j$ğ½‘¥ØøñÀû²Ús®Âs²^·ªÎğƒ®>²Â§²^·²vƒ²ƒ¶w¶VÓ²ó²ã²jPğ½Àøğ½‘¥Øøœì(€€€É•ÑÕÉ¸ì(€ô(€¥˜¡™É½´ôôõÑ¼¥ì(€€€•°¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûŠjƒ¾â<ğ½‘¥ØøñÀû²Ús®Âs²^·ªÎğƒ®>²Â§²^·²vĞƒªÂg²*×®.#®.ğ½Àøğ½‘¥Øøœì(€€€É•ÑÕÉ¸ì(€ô((€€¼¼ƒ²¶Ôƒ²^Ó²Â ƒ¶C²$(€½¹ÍĞ¹½İ½É¥±Ñ•È€ô¹•Ü…Ñ” ¤ì(€½¹ÍĞ¹½İ5¥±Ñ•È€ô¹½İ½É¥±Ñ•È¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İ½É¥±Ñ•È¹•Ñ5¥¹ÕÑ•Ì ¤ì(€€¼¼ƒ²b“®*`ƒ®
ƒ²pƒ²b#®“²vğƒ®V3®0ƒ¶b²z°ƒ².sªÂƒ²vÓ²‚ƒ²^Ó²Â ƒ²‚s²fà(€½¹ÍĞ¥ÍQ½‘…ä€ô€¡‘…Ñ•¼€ôôôÑ½‘…å1½…±MÑÈ ¤¤ì(€€¼¼ŠIƒ²¶Ôƒ²*“²êP€£²vã²‚G²^´ƒ¶C²'²^C®>ƒ²z³²
³²j¤¤(€½¹ÍĞÍ…¹¥É•Ğô¡±¤ôùì(€€€½¹ÍĞ…ÉÈõmtì(€€€11}QI%9L¹™½É… ¡Ğôùì(€€€€€½¹ÍĞÍÑ½ÁÌõĞ¹ÍÑ½ÁÌì(€€€€€½¹ÍĞ™¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ¤ì(€€€€€½¹ÍĞÑ¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ¤ì(€€€€€¥˜¡™¤ğÁññÑ¤ğÁññ™¤øõÑ¤¤É•ÑÕÉ¸ì(€€€€€¥˜¡¥ÍA…ÍÍMÑ½À¡Ğ±¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±¤¤É•ÑÕÉ¸ì(€€€€€½¹ÍĞ‘•ÁMÑ½ÀõÍÑ½ÁÍm™¥t°…ÉÉMÑ½ÀõÍÑ½ÁÍmÑ¥tì(€€€€€½¹ÍĞ‘•ÁPõ¡…ÍQ¥µ”¡‘•ÁMÑ½À¹‘•À¤ı‘•ÁMÑ½À¹‘•Àé¡…ÍQ¥µ”¡‘•ÁMÑ½À¹…ÉÈ¤ı‘•ÁMÑ½À¹…ÉÈé¹Õ±°ì(€€€€€½¹ÍĞ…ÉÉPõ¡…ÍQ¥µ”¡…ÉÉMÑ½À¹…ÉÈ¤ı…ÉÉMÑ½À¹…ÉÈé¡…ÍQ¥µ”¡…ÉÉMÑ½À¹‘•À¤ı…ÉÉMÑ½À¹‘•Àé¹Õ±°ì(€€€€€¥˜ …‘•ÁP¤É•ÑÕÉ¸ì(€€€€€¥˜¡¥ÍQ½‘…ä€˜˜Ñ½5¥¸¡‘•ÁP¤„ôõ¹Õ±°€˜˜Ñ½5¥¸¡‘•ÁP¤ñ¹½İ5¥±Ñ•È¤É•ÑÕÉ¸ì(€€€€€…ÉÈ¹ÁÕÍ ¡íĞ°‘•ÁP°…ÉÉP°‘ÕÈé‘ÕÉMÑÈ¡‘•ÁP°…ÉÉP¥ô¤ì(€€€ô¤ì(€€€É•ÑÕÉ¸…ÉÈì(€ôì(€½¹ÍĞÑÉ…¥¹Ì€ôÍ…¹¥É•Ğ¡™É½´±Ñ¼¤¹µ…À¡”ôø¡ì¸¸¹”°…É½´é™É½´°…Q¼éÑ¼°…‘¨é™…±Í•ô¤¤ì((€€¼¼ƒ²vã²‚G²^´ƒ¶>³¶V èƒ²Ús®Âp¿®>²Â§²^´ƒ®ÂcªÊô€ÄÁ­´ƒ®
ĞƒªâÃ²Â£²^´ƒ®Âs²Â¤ƒ²^Ó²Â €£²†Ã¶j3²^´ƒ®¾ã²‚W²Â ƒ²^Ó²Â£®0¤(€¥˜¡¥¹±Õ‘•‘¨¥ì(€€€½¹ÍĞÍÑ½ÁÍĞô¡Ğ±ÍÑ¸¤ôùí½¹ÍĞ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹ÌôôõÍÑ¸¤íÉ•ÑÕÉ¸¤øôÀ˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±ÍÑ¸¤íôì(€€€½¹ÍĞÍ••¸õ¹•ÜM•Ğ¡ÑÉ…¥¹Ì¹µ…À¡”ôù”¹Ğ¹¹¼¤¤ì(€€€™½È¡½¹ÍĞ¹ˆ½˜}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ì¡™É½´¤¥ì(€€€€€Í…¹¥É•Ğ¡¹ˆ¹¸±Ñ¼¤¹™½É… ¡”ôùì(€€€€€€€¥˜¡Í••¸¹¡…Ì¡”¹Ğ¹¹¼¥ññÍÑ½ÁÍĞ¡”¹Ğ±™É½´¤¥É•ÑÕÉ¸ì(€€€€€€€Í••¸¹…‘¡”¹Ğ¹¹¼¤ì(€€€€€€€ÑÉ…¥¹Ì¹ÁÕÍ ¡ì¸¸¹”°…É½´é¹ˆ¹¸°…Q¼éÑ¼°…‘¨éÑÉÕ”°µ¥ÍÌé™É½µô¤ì(€€€€€ô¤ì(€€€ô(€€€™½È¡½¹ÍĞ¹ˆ½˜}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ì¡Ñ¼¤¥ì(€€€€€Í…¹¥É•Ğ¡™É½´±¹ˆ¹¸¤¹™½É… ¡”ôùì(€€€€€€€¥˜¡Í••¸¹¡…Ì¡”¹Ğ¹¹¼¥ññÍÑ½ÁÍĞ¡”¹Ğ±Ñ¼¤¥É•ÑÕÉ¸ì(€€€€€€€Í••¸¹…‘¡”¹Ğ¹¹¼¤ì(€€€€€€€ÑÉ…¥¹Ì¹ÁÕÍ ¡ì¸¸¹”°…É½´é™É½´°…Q¼é¹ˆ¹¸°…‘¨éÑÉÕ”°µ¥ÍÌéÑ½ô¤ì(€€€€€ô¤ì(€€€ô(€ô(€ÑÉ…¥¹Ì¹Í½ÉĞ ¡„±ˆ¤ôø¡Ñ½5¥¸¡„¹‘•ÁP¥ñğÀ¤´¡Ñ½5¥¸¡ˆ¹‘•ÁP¥ñğÀ¤¤ì((€¥˜ …ÑÉ…¥¹Ì¹±•¹Ñ ¥ì(€€€¥˜¡¥¹±Õ‘•QÉ…¹Í™•È¥ì(€€€€€Í•…É¡	½½­QÉ…¹Í™•ÉÌ¡™É½´°Ñ¼°‘…Ñ•¼°•°¤ì(€€€ô•±Í”ì(€€€€€•°¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~R4ğ½‘¥ØøñÀø‘í™É½µôƒŠH€‘íÑ½ô€‘í¥¹±Õ‘•‘¨üŸ²¶×
ß²vã²‚G²^´œèŸ²¶Ôôƒ²^Ó²Â£ªÂ ƒ²^²*×®.#®.¸ñ‰ÈøñÍµ…±°ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû¶fc²*äƒ¶>³¶V ‘í¥¹±Õ‘•‘¨üœœèœƒ
Üƒ²vã²‚G²^´ƒ¶>³¶V ôƒ²b×²c²ró®†pƒ®.“².pƒªÊ²'¶VÓ®ÎÓ²ã²jPğ½Íµ…±°øğ½Àøğ½‘¥Øù€ì(€€€ô(€€€É•ÑÕÉ¸ì(€ô(€½¹ÍĞ…‘©½Õ¹ĞõÑÉ…¥¹Ì¹™¥±Ñ•È¡”ôù”¹…‘¨¤¹±•¹Ñ ì((€€¼¼¥¹±¥¹”½¹±¥¬ƒ²‚sªÆÀƒŠH‘…Ñ„ƒ²7²Äƒ²‚²z”ƒ¶n…‘‘Ù•¹Ñ1¥ÍÑ•¹•Ë®†pƒ®NÇ®†t€¡¥=LM…™…É¤ƒ¶bã¶f`¤(€½¹ÍĞÉ½İÌ€ôÑÉ…¥¹Ì¹µ…À ¡íĞ±‘•ÁP±…ÉÉP±‘ÕÈ±…É½´±…Q¼±…‘¨±µ¥ÍÍô¤ôù€(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µÉ½Üˆ‘…Ñ„µÑÉ…¥¸µ¹¼ôˆ‘íĞ¹¹½ôˆ‘…Ñ„µ‘•Àôˆ‘í‘•ÁQôˆ‘…Ñ„µ…ÉÈôˆ‘í…ÉÉQñğœôˆ‘…Ñ„µ™É½´ôˆ‘í…É½µôˆ‘…Ñ„µÑ¼ôˆ‘í…Q½ôˆ‘…Ñ„µ‘…Ñ”ôˆ‘í‘…Ñ•½ôˆ€‘í…‘¨ı‘…Ñ„µ…‘¨ôˆÄˆ‘…Ñ„µµ¥ÍÌôˆ‘íµ¥ÍÍô‰€èœô€‘í…‘¨üÍÑå±”ô‰½Á…¥Ñäè¸Üàˆœèœôø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àèÄíµ¥¸µİ¥‘Ñ èÀˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÙÁàíµ…É¥¸µ‰½ÑÑ½´èÑÁàˆø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡Ğ¹É…‘”¥ô¤ˆø‘íĞ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘íĞ¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèØÀÀí½±½ÈéÙ…È ´µÑ•áĞÄ¤ˆø‘íĞ¹‘•ÍÑ÷¶Z$ğ½ÍÁ…¸ø(€€€€€€€€€€‘í…‘¨ı€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èä¸ÕÁàí™½¹Ğµİ•¥¡ĞèàÀÀíÁ…‘‘¥¹œèÅÁà€İÁàí‰½É‘•ÈµÉ…‘¥ÕÌèáÁàí‰…­É½Õ¹éÉ‰„ ÈĞä°ÄÄÔ°ÈÈ°¸ÄÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ½É…¹”¤í½±½ÈéÙ…È ´µ½É…¹”¤ˆû²vã²‚G²^´ğ½ÍÁ…¸ù€èœô(€€€€€€€€€€‘ì  ¤ôùí½¹ÍĞÍÑ…Ñ”õÑåÁ•½˜}Í¥µMÑ…Ñ”ôôô™Õ¹Ñ¥½¸œı}Í¥µMÑ…Ñ”¡Ğ±‘…Ñ•¼¤é¹Õ±°í½¹ÍĞ±¥Ù”õÍÑ…Ñ”ü¹Á¡…Í”ôôôÉÕ¹¹¥¹œœıÍÑ…Ñ”¹ÕÉÉ•¹ĞèÀ±•ÍĞõÍÑ…Ñ”ü¹Á¡…Í”ôôô‰•™½É”œıÍÑ…Ñ”¹™¥¹…°èÀíÉ•ÑÕÉ¸±¥Ù”øÀı€ñÍÁ…¸±…ÍÌô‰‰½½¬µ‘•±…äµÑ…œ±¥Ù”ˆø‘í±¥Ù•÷®Úƒ²²^Àğ½ÍÁ…¸ù€é•ÍĞøÀı€ñÍÁ…¸±…ÍÌô‰‰½½¬µ‘•±…äµÑ…œ•ÍĞˆø‘í•ÍÑ÷®Úƒ²²^Àƒ²b#²ğ½ÍÁ…¸ù€èœœíô¤ ¥ô(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé‰…Í•±¥¹”í…ÀèÙÁàˆø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄİÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘í‘•ÁQôğ½ÍÁ…¸ø(€€€€€€€€€€‘í…‘¨˜™…É½´„ôõ™É½´ı€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÀ¸ÕÁàí½±½ÈéÙ…È ´µ½É…¹”¤í™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘í…É½µôğ½ÍÁ…¸ù€èœô(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàˆûŠHğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄİÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í½±½ÈéÙ…È ´µÉ••¸¤ˆø‘í…ÉÉQñğœ´ôğ½ÍÁ…¸ø(€€€€€€€€€€‘í…‘¨˜™…Q¼„ôõÑ¼ı€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÀ¸ÕÁàí½±½ÈéÙ…È ´µ½É…¹”¤í™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘í…Q½ôğ½ÍÁ…¸ù€èœô(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘í‘ÕÉôğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€‘í…‘¨ı€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÀ¸ÕÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µÑ½ÀèÍÁàˆø‘íµ¥ÍÍ÷²^´ƒ®¾ã²‚W²Â ƒ
Ü€‘í…É½´„ôõ™É½´ı…É½´¬œƒ²Ús®Âpœé…Q¼¬œƒ®>²Â¤ôğ½‘¥Øù€èœô(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàí™±•àµÍ¡É¥¹¬èÀˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰Í•…Ğµ…Ù…¥°µ‰Ñ¸ˆ‘…Ñ„µ¹¼ôˆ‘íĞ¹¹½ôˆ(€€€€€€€€€ÍÑå±”ô‰µ¥¸µİ¥‘Ñ èÔÑÁàí¡•¥¡ĞèĞÑÁàí‰½É‘•ÈµÉ…‘¥ÕÌèáÁàí‰½É‘•ÈèÄ¸ÕÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÁÁàí™½¹Ğµİ•¥¡ĞèØÀÀí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤í½±½ÈéÙ…È ´µÑ•áĞÌ¤íÑ•áĞµ…±¥¸é•¹Ñ•Èí±¥¹”µ¡•¥¡ĞèÄ¸Ìˆû²†Ã¶j0ñ‰Èû²’Dğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µ¡•ÙÉ½¸ˆûŠèğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤ì((€½¹ÍĞÑÉ¥Á1…‰•°€ô}‰½½­I½Õ¹‘QÉ¥À€üƒ¶:ã®>€ ‘í‘…Ñ•½ô¥€€è‘…Ñ•¼ì(€•°¹¥¹¹•É!Q50€ô€(€€€€ñ‘¥Ø±…ÍÌô‰É•ÍÕ±Ğµ¡•…‘•ÈˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÙÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰É•ÍÕ±ĞµÑ¥Ñ±”ˆø‘í™É½µôƒŠH€‘íÑ½ôğ½‘¥Øø(€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”‰±Õ”ˆø‘íÑÉ…¥¹Ì¹±•¹Ñ¡÷¶:àğ½ÍÁ…¸ø(€€€€€€‘í…‘©½Õ¹Ğı€ñÍÁ…¸±…ÍÌô‰‰…‘”ˆÍÑå±”ô‰‰½É‘•Èµ½±½ÈéÙ…È ´µ½É…¹”¤í½±½ÈéÙ…È ´µ½É…¹”¤ˆû²vã²‚G²^´€‘í…‘©½Õ¹Ñ÷¶:àğ½ÍÁ…¸ù€èœô(€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”ˆÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤ˆø‘íÑÉ¥Á1…‰•±ôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µ±¥ÍĞˆø‘íÉ½İÍôğ½‘¥Øø(€€€€‘í}‰½½­I½Õ¹‘QÉ¥À˜™‘…Ñ•	…¬ı€ñÀ±…ÍÌô‰¡¥¹ĞˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèáÁàˆûŠìƒ²fW®ÎÔèƒªÂ®*Pƒ²^Ó²Â ƒ²b#®ƒ²f®0ƒ¶nƒ®Î×¶:à ‘íÑ½÷ŠH‘í™É½µô°€‘í‘…Ñ•	…­ô¤ƒ²†Ã¶j3ªÂ ƒ²zC®>g²ró®†pƒ²^Ó®š÷®.#®.ğ½Àù€èœõ€ì((€€¼¼ƒ¶fc²*äƒ¶>³¶V èƒ²¶ÔƒªÊÃªÎğƒ²V®zc²^@ƒ¶fc²*äƒªÊ÷®†s®>ƒ¶V£ªî`ƒ¶Fs².p(€¥˜¡¥¹±Õ‘•QÉ…¹Í™•È¥ì(€€€½¹ÍĞáõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€€€•°¹…ÁÁ•¹‘¡¥±¡á¤ì(€€€Í•…É¡	½½­QÉ…¹Í™•ÉÌ¡™É½´°Ñ¼°‘…Ñ•¼°á°ÑÉÕ”¤ì(€ô((€€¼¼…‘‘Ù•¹Ñ1¥ÍÑ•¹•Èƒ®Â§².w²ró®†pƒ¶Ó®š´ƒ®NÇ®†t€¡¥=LM…™…É¤è½Ù•É™±½Üµäé…ÕÑ¼ƒ®
Ó®Ú ‘¥Ø½¹±¥¬ƒ®¾ã®>g²zDƒ®Â§² ¤(€•°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½¬µÑÉ…¥¸µÉ½İm‘…Ñ„µÑÉ…¥¸µ¹½té¹½Ğ ¹‰½½¬µá™•Èµ…É¤œ¤¹™½É… ¡É½Üôùì(€€€É½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°€ ¤ôùì(€€€€€€¼¼ƒ®
Ğƒ²^³¶Z$€Ÿ²vó²‚Tƒ²ÚSªÂ œƒ®ª£®Npèƒ²b#®ƒ®2².€ƒ²^³²‚Tƒ®.ÓªâÀƒ²Â÷²vƒ²^Ã®.(€€€€€¥˜¡İ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”¥ì(€€€€€€€½¹ÍĞ´õİ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”ì(€€€€€€€½¹ÍĞÁÉ½••ô ¤ôù½Á•¹QÉ¥Á1•A¥­•È¡É½Ü¹‘…Ñ…Í•Ğ¹ÑÉ…¥¹9¼°É½Ü¹‘…Ñ…Í•Ğ¹™É½µññ™É½´°É½Ü¹‘…Ñ…Í•Ğ¹Ñ½ññÑ¼°É½Ü¹‘…Ñ…Í•Ğ¹‘•Áñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÉñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹‘…Ñ•ññ‘…Ñ•¼¤ì(€€€€€€€½¹ÍĞ½¹˜ô¡ÑåÁ•½˜}ÑÉ¥Á…å=Ù•É±…Àôôô™Õ¹Ñ¥½¸œ¤ı}ÑÉ¥Á…å=Ù•É±…À¡´¹ÑÉ¥Á%°´¹‘…ä°É½Ü¹‘…Ñ…Í•Ğ¹‘•À°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÈ¤é¹Õ±°ì(€€€€€€€¥˜¡½¹˜¥ì(€€€€€€€€€¥˜¡½¹™¥É´¡ƒŠjƒ¾â<ƒ²vÓ®¾àƒ®.ÓªâĞƒ²vó²‚WªÎğƒ².sªÂ²vĞƒªÊç²æ§®.#®.¹q¹q¸‘í½¹˜¹ÑÉ…¥¹9½÷®Ê ƒ
Ü€‘í½¹˜¹™É½µMÑ¹÷ŠH‘í½¹˜¹Ñ½MÑ¹õq¸‘í½¹˜¹‘•ÁQ¥µ•õø‘í½¹˜¹…ÉÉQ¥µ•ô€ ‘í´¹‘…å÷²vó²Â ¥q¹q»ªŞã®zc®>ƒ²vĞƒ²^Ó²Â£®–ğ€‘í´¹‘…å÷²vó²Â£²^@ƒ²ÚSªÂ¶Vc².sªÊƒ²*×®.#ªæ0ı€¤¤ÁÉ½•• ¤ì(€€€€€€€ô•±Í”ÁÉ½•• ¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€€¼¼ƒ²‚WªâÃªÚ0ƒ²b#®ƒ¶vC®šèƒ²’GªÂƒ²jSªâ ƒ².s¶*ã®–ğƒªÆÓ®#®nÃªÎ€ƒ®ÂS®†pƒ²jS²vó
ß®NÇªâ$ƒ²ƒ¶w²Â÷²vƒ²^Ã®.(€€€€€½¹ÍĞ¼ô ¤ôøİ¥¹‘½Ü¹}…Ñ¥Ù•A…ÍÍ%(€€€€€€€€ü½Á•¹A…ÍÍ…åM•±•Ñ½È¡İ¥¹‘½Ü¹}…Ñ¥Ù•A…ÍÍ%°É½Ü¹‘…Ñ…Í•Ğ¹ÑÉ…¥¹9¼°É½Ü¹‘…Ñ…Í•Ğ¹™É½µññ™É½´°É½Ü¹‘…Ñ…Í•Ğ¹Ñ½ññÑ¼°É½Ü¹‘…Ñ…Í•Ğ¹‘•Áñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÉñğœœ¤(€€€€€€€€è½Á•¹	½½­QÉ…¥¹•Ñ…¥°¡É½Ü¹‘…Ñ…Í•Ğ¹ÑÉ…¥¹9¼°É½Ü¹‘…Ñ…Í•Ğ¹™É½µññ™É½´°É½Ü¹‘…Ñ…Í•Ğ¹Ñ½ññÑ¼°É½Ü¹‘…Ñ…Í•Ğ¹‘•Áñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÉñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹‘…Ñ•ññ‘…Ñ•¼¤ì(€€€€€¥˜¡É½Ü¹‘…Ñ…Í•Ğ¹…‘¨¥ì(€€€€€€€½¹ÍĞµ¥ÍÌõÉ½Ü¹‘…Ñ…Í•Ğ¹µ¥ÍÌ°…õÉ½Ü¹‘…Ñ…Í•Ğ¹™É½´°…PõÉ½Ü¹‘…Ñ…Í•Ğ¹Ñ¼ì(€€€€€€€}‰½½­‘©½¹™¥É´¡ƒ²Ús®Âs²^·²v €ñˆø‘í…÷²^´ğ½ˆû²vÓªÎ€ƒ®>²Â§²^·²v €ñˆø‘í…Q÷²^´ğ½ˆû²z®.#®.¸ñ‰Èøñ‰Èøñˆø‘íµ¥ÍÍ÷²^´ğ½ˆû²v ƒ²‚W²Â£¶Vc² ƒ²V+²*×®.#®.¹€°¼¤ì(€€€€€ô•±Í”¼ ¤ì(€€€ô¤ì(€ô¤ì((€€¼¼ƒ®
Ğƒ²^³¶Z$€Ÿ²vó²‚Tƒ²ÚSªÂ œƒ®ª£®Npèƒ²vÓ®¾àƒ®.ÓªâĞƒ²vó²‚WªÎğƒ².sªÂ²vĞƒªÊç²æc®*Pƒ²^Ó²Â£®*Pƒ²v3²bƒ¶Fs².p(€¥˜¡İ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”€˜˜ÑåÁ•½˜}ÑÉ¥Á…å=Ù•É±…Àôôô™Õ¹Ñ¥½¸œ¥ì(€€€½¹ÍĞ´õİ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”ì(€€€•°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½¬µÑÉ…¥¸µÉ½İm‘…Ñ„µÑÉ…¥¸µ¹½té¹½Ğ ¹‰½½¬µá™•Èµ…É¤œ¤¹™½É… ¡É½Üôùì(€€€€€½¹ÍĞ½¹˜õ}ÑÉ¥Á…å=Ù•É±…À¡´¹ÑÉ¥Á%°´¹‘…ä°É½Ü¹‘…Ñ…Í•Ğ¹‘•À°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÈ¤ì(€€€€€¥˜¡½¹˜¥ìÉ½Ü¹±…ÍÍ1¥ÍĞ¹…‘ ÑÉ¥ÀµÉ½Üµ½Ù•É±…Àœ¤ìÉ½Ü¹Í•ÑÑÑÉ¥‰ÕÑ” Ñ¥Ñ±”œ°Ÿ²vÓ®¾àƒ®.ÓªâĞƒ²vó²‚WªÎğƒ².sªÂ²vĞƒªÊç²æ§®.#®.œ¤ìô(€€€ô¤ì(€ô((€€¼¼ƒ²†Ã¶j0ƒªÖ³ªÂƒªÎ×¶Ôƒ²z³ªÎƒ®0ƒ®¢ó²‚ ƒªÎ²
Ã¶VcªÎ€ƒ²V{²ªôƒªÊÃªÎó®Ú¶Àƒ¶Fs²Ús¶Vs®.¸(€€¼¼ƒ²Š3²tƒ®NÇªâ'®Îƒ²²àƒªÎ²
Ã²v ƒ²Š3²tƒ²ƒ¶tƒ².s²‚Cªæ3² ƒ®¾ã®’ƒ²Ò#ªâÀƒªÊ²'²vƒªÂ®Î7ªÊ0ƒ²rƒ²¶Vs®.¸(€}¡å‘É…Ñ•	½½­M•…ÑMÑ…ÑÕÍ•Ì¡ÑÉ…¥¹Ì±•°±‘…Ñ•¼±™É½´±Ñ¼¤ì)ô()™Õ¹Ñ¥½¸}‰½½­M•…ÑMÑ…ÑÕÌ¡½¹œ¥ì(€½¹ÍĞÉ…Ñ”õ5…Ñ ¹µ…à À±9Õµ‰•È¡½¹œü¹É…Ñ”¥ñğÀ¤±…Ù…¥±…‰±”õ5…Ñ ¹µ…à À±9Õµ‰•È¡½¹œü¹…Ù…¥±…‰±”¥ñğÀ¤ì(€¥˜¡…Ù…¥±…‰±”ğôÁññÉ…Ñ”øôÄ¥ì(€€€¥˜ ¡9Õµ‰•È¡½¹œü¹ÍÑ…¹‘¥¹Ù…¥±…‰±”¥ñğÀ¤øÀ˜™½¹œü¹ÍÑ…¹‘¥¹±¥¥‰±”¥É•ÑÕÉ¹í±…‰•°èŸ²z²tœ±½±½ÈèœŒÀàÑ™Œœ±‰œèÉ‰„ ÄäÈ°ÄÌÈ°ÈÔÈ°¸ÄÀ¤ôì(€€€É•ÑÕÉ¹í±…‰•°èŸ®“²œ±½±½ÈèÙ…È ´µÉ•¤œ±‰œèÉ‰„ ÈĞà°àÄ°ÜÌ°¸Àà¤ôì(€ô(€¥˜¡É…Ñ”ğô¸ÔÔ¥É•ÑÕÉ¹í±…‰•°èŸ²^³²r€œ±½±½ÈèÙ…È ´µÉ••¸¤œ±‰œèÉ‰„ ØÌ°ÄàÔ°àÀ°¸Àà¤ôì(€¥˜¡É…Ñ”ğô¸ÜÔ¥É•ÑÕÉ¹í±…‰•°èŸ®ÎÓ¶Ôœ±½±½ÈèÙ…È ´µ…•¹ĞÈ¤œ±‰œèÉ‰„ ÔØ°ÄÌä°ÈÔÌ°¸Àà¤ôì(€É•ÑÕÉ¹í±…‰•°èŸ¶bó²z„œ±½±½ÈèÙ…È ´µ½É…¹”¤œ±‰œèÉ‰„ ÈĞä°ÄÄÔ°ÈÈ°¸Àà¤ôì)ô)™Õ¹Ñ¥½¸}¡å‘É…Ñ•	½½­M•…ÑMÑ…ÑÕÍ•Ì¡ÑÉ…¥¹Ì±•°±‘…Ñ•¼±™É½´±Ñ¼¥ì(€½¹ÍĞ‰…Í”ôµ¥¸µİ¥‘Ñ èÔÑÁàí¡•¥¡ĞèĞÑÁàí‰½É‘•ÈµÉ…‘¥ÕÌèáÁàí‰½É‘•ÈèÄ¸ÕÁàÍ½±¥í‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤œì(€½¹ÍĞ•¹•É…Ñ¥½¸õİ¥¹‘½Ü¹}‰½½­M•…Ñ!å‘É…Ñ¥½¹•¹•É…Ñ¥½¸ô¡İ¥¹‘½Ü¹}‰½½­M•…Ñ!å‘É…Ñ¥½¹•¹•É…Ñ¥½¹ñğÀ¤¬Äì(€½¹ÍĞ•¹ÑÉ¥•Ìõl¸¸¹•°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½¬µÑÉ…¥¸µÉ½İm‘…Ñ„µÑÉ…¥¸µ¹½té¹½Ğ ¹‰½½¬µá™•Èµ…É¤œ¥t¹µ…À ¡É½Ü±¥¹‘•à¤ôø¡ì(€€€É½Ü±‰Ñ¸éÉ½Ü¹ÅÕ•ÉåM•±•Ñ½È œ¹Í•…Ğµ…Ù…¥°µ‰Ñ¸œ¤±É•ÍÕ±ĞéÑÉ…¥¹Ím¥¹‘•át(€ô¤¤¹™¥±Ñ•È¡àôùà¹‰Ñ¸˜™à¹É•ÍÕ±Ğ¤ì(€½¹ÍĞ‰åI½Üõ¹•Ü5…À¡•¹ÑÉ¥•Ì¹µ…À¡•¹ÑÉäôùm•¹ÑÉä¹É½Ü±•¹ÑÉåt¤¤±ÅÕ•Õ”õmtì(€±•ĞÍ¡•‘Õ±•õ™…±Í”ì(€½¹ÍĞ…Ñ¥Ù”õ•¹ÑÉäôùİ¥¹‘½Ü¹}‰½½­M•…Ñ!å‘É…Ñ¥½¹•¹•É…Ñ¥½¸ôôõ•¹•É…Ñ¥½¸˜™•°¹¥Í½¹¹•Ñ•˜™•¹ÑÉä¹‰Ñ¸¹¥Í½¹¹•Ñ•ì(€½¹ÍĞÁÉ½•ÍÍ9•áĞô ¤ôùì(€€€Í¡•‘Õ±•õ™…±Í”ì(€€€½¹ÍĞ•¹ÑÉäõÅÕ•Õ”¹Í¡¥™Ğ ¤ì(€€€¥˜ …•¹ÑÉä¥É•ÑÕÉ¸ì(€€€¥˜¡…Ñ¥Ù”¡•¹ÑÉä¤¥ì(€€€€€½¹ÍĞíĞ±…É½´±…Q½ôõ•¹ÑÉä¹É•ÍÕ±Ğì(€€€€€½¹ÍĞ½¹œõÑåÁ•½˜•Ñ=½¹•ÍÑ¥½¸ôôô™Õ¹Ñ¥½¸œı•Ñ=½¹•ÍÑ¥½¸¡Ğ±…É½µññ™É½´±…Q½ññÑ¼±‘…Ñ•¼¤é¹Õ±°ì(€€€€€¥˜¡…Ñ¥Ù”¡•¹ÑÉä¤¥ì(€€€€€€€½¹ÍĞµ•Ñ„õ}‰½½­M•…ÑMÑ…ÑÕÌ¡½¹œ¤ì(€€€€€€€•¹ÑÉä¹‰Ñ¸¹Ñ•áÑ½¹Ñ•¹Ğõµ•Ñ„¹±…‰•°ì(€€€€€€€•¹ÑÉä¹‰Ñ¸¹ÍÑå±”¹ÍÍQ•áĞõ€‘í‰…Í•ôí½±½Èè‘íµ•Ñ„¹½±½Éôí‰½É‘•Èµ½±½Èè‘íµ•Ñ„¹½±½Éôí‰…­É½Õ¹è‘íµ•Ñ„¹‰õ€ì(€€€€€€€•¹ÑÉä¹‰Ñ¸¹‘…Ñ…Í•Ğ¹Í•…Ñ!å‘É…Ñ•ôœÄœì(€€€€€ô(€€€ô(€€€Í¡•‘Õ±•9•áĞ ¤ì(€ôì(€½¹ÍĞÍ¡•‘Õ±•9•áĞô ¤ôùì(€€€¥˜¡Í¡•‘Õ±•‘ñğ…ÅÕ•Õ”¹±•¹Ñ¡ññİ¥¹‘½Ü¹}‰½½­M•…Ñ!å‘É…Ñ¥½¹•¹•É…Ñ¥½¸„ôõ•¹•É…Ñ¥½¸¥É•ÑÕÉ¸ì(€€€Í¡•‘Õ±•õÑÉÕ”ì(€€€¥˜¡İ¥¹‘½Ü¹É•ÅÕ•ÍÑ%‘±•…±±‰…¬¥İ¥¹‘½Ü¹É•ÅÕ•ÍÑ%‘±•…±±‰…¬¡ÁÉ½•ÍÍ9•áĞ±íÑ¥µ•½ÕĞèĞÔÁô¤ì(€€€•±Í”İ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ¡ÁÉ½•ÍÍ9•áĞ°À¤ì(€ôì(€½¹ÍĞ¡å‘É…Ñ”õ•¹ÑÉäôùì(€€€¥˜¡•¹ÑÉä¹‰Ñ¸¹‘…Ñ…Í•Ğ¹Í•…Ñ!å‘É…Ñ•ôôôœÄññ•¹ÑÉä¹‰Ñ¸¹‘…Ñ…Í•Ğ¹Í•…ÑEÕ•Õ•ôôôœÄœ¥É•ÑÕÉ¸ì(€€€•¹ÑÉä¹‰Ñ¸¹‘…Ñ…Í•Ğ¹Í•…ÑEÕ•Õ•ôœÄœì(€€€ÅÕ•Õ”¹ÁÕÍ ¡•¹ÑÉä¤ì(€€€Í¡•‘Õ±•9•áĞ ¤ì(€ôì(€€¼¨(€€€¨ƒ¶Vpƒ®Ê#²v`¥‘±”…±±‰…¯²^C²pƒ²^³®~°ƒ¶:ã²Ç²v`ƒ²‚²ÊĞ=ƒ²z³ªÎƒ®–ğƒ²^Ã²4ƒªÎ²
Ã¶Vc² ƒ²V+®*S®.¸(€€€¨ƒªÊ²'²vƒ®.“².pƒ¶VcªÆÃ®
`ƒ¶fS®¦Ó²vƒ®.¯²ró®¦Ğ•¹•É…Ñ¥½»²vĞƒ®ÂS®3²ZĞƒ²vÓ²‚ƒªÊ²'²v`ƒªÎ²
Ã®>ƒ²š'².pƒ¶>CªâÃ®Bs®.¸(€€€¨¼(€¥˜ %¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•Èœ¥¸İ¥¹‘½Ü¥ì(€€€İ¥¹‘½Ü¹}‰½½­M•…Ñ=‰Í•ÉÙ•Èü¹‘¥Í½¹¹•Ğ ¤ì(€€€½¹ÍĞ½‰Í•ÉÙ•Èõ¹•Ü%¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•È¡¥Ñ•µÌôùì(€€€€€¥Ñ•µÌ¹™½É… ¡¥Ñ•´ôùì(€€€€€€€¥˜ …¥Ñ•´¹¥Í%¹Ñ•ÉÍ•Ñ¥¹œ¥É•ÑÕÉ¸ì(€€€€€€€½¹ÍĞ•¹ÑÉäõ‰åI½Ü¹•Ğ¡¥Ñ•´¹Ñ…É•Ğ¤ì(€€€€€€€¥˜¡•¹ÑÉä¥¡å‘É…Ñ”¡•¹ÑÉä¤ì(€€€€€€€½‰Í•ÉÙ•È¹Õ¹½‰Í•ÉÙ”¡¥Ñ•´¹Ñ…É•Ğ¤ì(€€€€€ô¤ì(€€€ô±íÉ½½Ğé¹Õ±°±É½½Ñ5…É¥¸èœÈĞÁÁà€ÁÁàô¤ì(€€€İ¥¹‘½Ü¹}‰½½­M•…Ñ=‰Í•ÉÙ•Èõ½‰Í•ÉÙ•Èì(€€€•¹ÑÉ¥•Ì¹™½É… ¡•¹ÑÉäôù½‰Í•ÉÙ•È¹½‰Í•ÉÙ”¡•¹ÑÉä¹É½Ü¤¤ì(€€€İ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€€€¥˜ …•°¹¥Í½¹¹•Ñ•‘ññİ¥¹‘½Ü¹}‰½½­M•…Ñ=‰Í•ÉÙ•È„ôõ½‰Í•ÉÙ•È¥½‰Í•ÉÙ•È¹‘¥Í½¹¹•Ğ ¤ì(€€€ô°ÄÈÀÀÀÀ¤ì(€õ•±Í•ì(€€€€¼¼ƒªÖ³¶bTƒ®â3®vó²jÃ²‚®*Pƒ²V{²ªôƒªÊÃªÎó®0ƒ²š'².pƒªÎ²
Ã¶VcªÎ€ƒ®
c®¢ã²®*Pƒ²Ÿ²v ƒªÂªÊ§²ró®†pƒ®Ú²
Ã¶Vs®.¸(€€€•¹ÑÉ¥•Ì¹™½É… ¡•¹ÑÉäôù¡å‘É…Ñ”¡•¹ÑÉä¤¤ì(€ô)ô(((¼¼ƒ²^Ó²Â ƒ²²à€˜ƒ²b#®ƒ¶2£®@€£¶Vc®. ƒ²*³®vó²vÓ®Ns²^¤)™Õ¹Ñ¥½¸½Á•¹	½½­QÉ…¥¹•Ñ…¥°¡ÑÉ…¥¹9¼°™É½´°Ñ¼°‘•ÁP°…ÉÉP°ÑÉ…Ù•±…Ñ”¥ì(€½¹ÍĞĞ€ô•ÑQÉ…¥¹	å9¼¡ÑÉ…¥¹9¼¤ì(€¥˜ …Ğ¤É•ÑÕÉ¸ì((€½¹ÍĞ½±€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘•Ñ…¥°µİÉ…Àœ¤ì(€¥˜¡½±¤½±¹É•µ½Ù” ¤ì((€€¼¼ƒ®“²ƒ²^³®Ú ƒ¶2C²‚T€£²b#®ƒ¶´ƒ®“²ƒ²^Ó²Â ƒ²‚²j¤ƒ²^³²tƒ²V3®šğ¤(€±•ĞÍ½±‘=ÕĞõ™…±Í”ì(€ÑÉåì(€€€Í½±‘=ÕĞõ}‰½½­M•…ÑMÑ…ÑÕÌ¡•Ñ=½¹•ÍÑ¥½¸¡Ğ±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¤¤¹±…‰•°ôôôŸ®“²œì(€õ…Ñ ¡”¥íô((€½¹ÍĞ™…É”€ô…±…É”¡Ğ°™É½´°Ñ¼°€•¹•É…°œ¤ì(€½¹ÍĞ™…É•MÁ•Œ€ô…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡Ğ¹É…‘”¤¹µ…À¡Œôùì(€€€½¹ÍĞ˜€ô…±…É”¡Ğ°™É½´°Ñ¼°Œ¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ™…É”µÉ½Üˆø(€€€€€€ñÍÁ…¸ø‘íÍ•…Ñ±…ÍÍ¥ÍÁ±…å1…‰•°¡Ğ±Œ¥ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í½±½ÈéÙ…È ´µ…•¹Ğ¤í™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í˜¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½ÍÁ…¸ø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì((€½¹ÍĞİÉ…À€ô‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥€ô€‰½½¬µ‘•Ñ…¥°µİÉ…Àœì(€€¼¼İÉ…Ã²v ƒ²*“¶²vğƒ²^²vĞƒ²"s²"`ƒ²î£¶3²vÓ® €£²*“¶s¶
äƒ²î£¶7²*“¶*àƒ²^²v0¤(€€¼¼¥¹±¥¹”½¹±¥¬ƒ²‚sªÆÀƒŠH…ÁÁ•¹‘¡¥±ƒ¶n…‘‘Ù•¹Ñ1¥ÍÑ•¹•Ë®†pƒ®NÇ®†t€¡¥=LM…™…É¤ƒ¶bã¶f`¤(€İÉ…À¹¥¹¹•É!Q50€ô€(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ‰…­‘É½Àˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÁ…¹•°ˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àµÍ¡É¥¹¬èÀíÁ…‘‘¥¹œèÄÉÁà€ÈÁÁà€Àˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ¡…¹‘±”ˆøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ¡•…ˆø(€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÉ…‘”ˆÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡Ğ¹É…‘”¥ô¤ˆø‘íĞ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ¹¼ˆø‘íĞ¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µäµÁ…¹•°µ±½Í”ˆ¥ô‰‰‘µ±½Í”µàˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÉ½ÕÑ”ˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸ˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸µ¹…µ”ˆø‘í™É½µôğ½‘¥Øø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸µÑ¥µ”ˆø‘í‘•ÁQôğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ‘ÕÈˆø‘í‘ÕÉMÑÈ¡‘•ÁP±…ÉÉP¥ôğ½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸ˆÍÑå±”ô‰Ñ•áĞµ…±¥¸éÉ¥¡Ğˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸µ¹…µ”ˆø‘íÑ½ôğ½‘¥Øø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÑ¸µÑ¥µ”ˆø‘í…ÉÉQñğœ´ôğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÍÉ½±°ˆÍÑå±”ô‰Á…‘‘¥¹œèÀ€ÈÁÁàˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ™…É•Ìˆø‘í™…É•MÁ•ôğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àµÍ¡É¥¹¬èÀíÁ…‘‘¥¹œèáÁà€ÈÁÁà€ÌÉÁàí‘¥ÍÁ±…äé™±•àí…ÀèáÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ¥ô‰‰‘µ‘•Ñ…¥°µ‰Ñ¸ˆÍÑå±”ô‰™±•àèÄí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÍÁàˆû²^Ó²Â ƒ²²àğ½‰ÕÑÑ½¸ø(€€€€€€€€‘íÍ½±‘=ÕĞ(€€€€€€€€€€ü€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ¥ô‰‰‘µİ…Ñ µ‰Ñ¸ˆÍÑå±”ô‰™±•àèÈí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÑÁàí½±½ÈéÙ…È ´µÉ•¤í‰½É‘•Èµ½±½ÈéÙ…È ´µÉ•¤ˆûÂ~RPƒ²^³²tƒ²V3®šğ€£®“²¤ğ½‰ÕÑÑ½¸ù€(€€€€€€€€€€è€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰‰‘µ‰½½¬µ‰Ñ¸ˆÍÑå±”ô‰™±•àèÈí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÑÁàˆûÂ~:¬ƒ²b#®“¶VcªâÀğ½‰ÕÑÑ½¸ùô(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µ‘•Ñ…¥°µ‰…­‘É½Àœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°±½Í•	½½­QÉ…¥¹•Ñ…¥°¤ì(€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰‘µ±½Í”µàœ¤°±½Í•	½½­QÉ…¥¹•Ñ…¥°¤ì(€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰‘µ‘•Ñ…¥°µ‰Ñ¸œ¤°”ôùì”ü¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í”ü¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤í±½Í•	½½­QÉ…¥¹•Ñ…¥° ¤í½Á•¹	½½­I½ÕÑ••Ñ…¥°¡ÑÉ…¥¹9¼±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¤ìô¤ì(€¥˜¡Í½±‘=ÕĞ¥ì(€€€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰‘µİ…Ñ µ‰Ñ¸œ¤°€ ¤ôùì±½Í•	½½­QÉ…¥¹•Ñ…¥° ¤ì½Á•¹M•…Ñ]…Ñ¡A½ÁÕÀ¡ÑÉ…¥¹9¼±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¤ìô¤ì(€õ•±Í•ì(€€€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰‘µ‰½½¬µ‰Ñ¸œ¤°€ ¤ôùì±½Í•	½½­QÉ…¥¹•Ñ…¥° ¤ì}‰½½­•Ñ…¥±½¹™¥É´¡ÑÉ…¥¹9¼±™É½´±Ñ¼±‘•ÁP±…ÉÉQñğœœ±ÑÉ…Ù•±…Ñ”¤ìô¤ì(€ô(€Í•ÑQ¥µ•½ÕĞ  ¤ôùİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µ‘•Ñ…¥°µÁ…¹•°œ¤¹±…ÍÍ1¥ÍĞ¹…‘ ½Á•¸œ¤°€ÄÀ¤ì)ô()™Õ¹Ñ¥½¸}‰½½­I½ÕÑ•5…Á!Q50¡Ğ±™É½´±Ñ¼±É…‘•½±½È±ÑÉ…Ù•±…Ñ”±ÁÉ½©•Ñ5¥¹ÕÑ•ÌôÀ¥ì(€½¹ÍĞ•ÍŒõÌôùMÑÉ¥¹œ¡Ìüüœœ¤¹É•Á±…” ½l˜ğøˆt½œ±Œôø¡ìœ˜œèœ™…µÀìœ°œğœèœ™±Ğìœ°œøœèœ™Ğìœ°œˆœèœ™ÅÕ½Ğìœ°ˆœˆèœ˜ŒÌäìõmt¤¤ì(€€¼¼ƒ®²Ó².sªÂƒ¶×ªÎó²^·ªæ3² ƒ²Š3¶Fs²‚C²ró®†pƒ²rƒ²¶VÓ²Vğƒ².“²‚pƒ®ã²€ƒ²ƒ¶bW²vĞƒ®+ªâÃªÆÃ®
`ƒ²²ƒ¶fS®Bc² ƒ²V+®*S®.¸(€€¼¼ƒ¶×ªÎó²^·²v`ƒ²‚C
ß²^·®ª²v ƒ²V®z`ƒ®ã®Npƒ®.£ªÎ²^C²pƒªŞã®š³² ƒ²V+ªÎ€ƒ²ƒ®ÚƒªÎ²
Ã²^C®0ƒ²
³²j§¶Vs®.¸(€½¹ÍĞÁ½¥¹ÑÌô¡Ğ¹ÍÑ½ÁÍññmt¤¹µ…À ¡Ì±¥‘à¤ôø¡íÌ±¥‘à±½½Éé}ÍÑ¹½½É¡Ì¹•½-•åññÌ¹Ì¥ô¤¤¹™¥±Ñ•È¡àôùà¹½½É¤ì(€±•Ğ™É½µ%‘àõÁ½¥¹ÑÌ¹™¥¹‘%¹‘•à¡àôùà¹Ì¹Ìôôõ™É½´¤±Ñ½%‘àõÁ½¥¹ÑÌ¹™¥¹‘%¹‘•à ¡à±¤¤ôù¤ù™É½µ%‘à˜™à¹Ì¹ÌôôõÑ¼¤ì(€¥˜¡Á½¥¹ÑÌ¹±•¹Ñ ğÉññ™É½µ%‘àğÁññÑ½%‘àğÀ¥É•ÑÕÉ¸€œñ‘¥Ø±…ÍÌô‰‰Éµµ…Àµ•µÁÑäˆû¶Fs².s¶V€ƒ²"`ƒ²z#®*Pƒ®ã²€ƒ²Š3¶FsªÂ ƒ²^²*×®.#®.¸ğ½‘¥Øøœì(€½¹ÍĞ\ôØÈÀ± ôÌàÀ±@ôĞàì(€½¹ÍĞ±½¹ÌõÁ½¥¹ÑÌ¹µ…À¡àôùà¹½½É¹±½¸¤±±…ÑÌõÁ½¥¹ÑÌ¹µ…À¡àôùà¹½½É¹±…Ğ¤ì(€½¹ÍĞµ¥¹1½¸õ5…Ñ ¹µ¥¸ ¸¸¹±½¹Ì¤±µ…á1½¸õ5…Ñ ¹µ…à ¸¸¹±½¹Ì¤±µ¥¹1…Ğõ5…Ñ ¹µ¥¸ ¸¸¹±…ÑÌ¤±µ…á1…Ğõ5…Ñ ¹µ…à ¸¸¹±…ÑÌ¤ì(€½¹ÍĞ‘àõ5…Ñ ¹µ…à ¸ÀÄ±µ…á1½¸µµ¥¹1½¸¤±‘äõ5…Ñ ¹µ…à ¸ÀÄ±µ…á1…Ğµµ¥¹1…Ğ¤ì(€½¹ÍĞÍ…±”õ5…Ñ ¹µ¥¸ ¡\µ@¨È¤½‘à°¡ µ@¨È¤½‘ä¤ì(€½¹ÍĞÕÍ•‘\õ‘à©Í…±”±ÕÍ•‘ õ‘ä©Í…±”±½àô¡\µÕÍ•‘\¤¼È±½äô¡ µÕÍ•‘ ¤¼Èì(€Á½¥¹ÑÌ¹™½É… ¡ÀôùíÀ¹àõ½à¬¡À¹½½É¹±½¸µµ¥¹1½¸¤©Í…±”íÀ¹äõ½ä¬¡µ…á1…ĞµÀ¹½½É¹±…Ğ¤©Í…±”íô¤ì(€±•Ğ±¥¹•Ìôœœì(€™½È¡±•Ğ¤ôÀí¤ñÁ½¥¹ÑÌ¹±•¹Ñ ´Äí¤¬¬¥ì(€€€½¹ÍĞ…Ñ¥Ù”õ¤øõ™É½µ%‘à˜™¤ñÑ½%‘àì(€€€±¥¹•Ì¬õ€ñ±¥¹”àÄôˆ‘íÁ½¥¹ÑÍm¥t¹à¹Ñ½¥á• Ä¥ôˆäÄôˆ‘íÁ½¥¹ÑÍm¥t¹ä¹Ñ½¥á• Ä¥ôˆàÈôˆ‘íÁ½¥¹ÑÍm¤¬Åt¹à¹Ñ½¥á• Ä¥ôˆäÈôˆ‘íÁ½¥¹ÑÍm¤¬Åt¹ä¹Ñ½¥á• Ä¥ôˆ±…ÍÌôˆ‘í…Ñ¥Ù”üÍ•±•Ñ•œèµÕÑ•ôˆ¼ù€ì(€ô(€½¹ÍĞ±…‰•±MÑ•Àõ5…Ñ ¹µ…à Ä±5…Ñ ¹•¥°¡Á½¥¹ÑÌ¹±•¹Ñ ¼ÄÈ¤¤ì(€½¹ÍĞ¹½‘•ÌõÁ½¥¹ÑÌ¹µ…À ¡À±¤¤ôùì(€€€½¹ÍĞÍ•±•Ñ•õ¤ôôõ™É½µ%‘áññ¤ôôõÑ½%‘à±…Ñ¥Ù”õ¤øõ™É½µ%‘à˜™¤ğõÑ½%‘àì(€€€½¹ÍĞÍÑ½ÁÁ¥¹œô…¥ÍA…ÍÍMÑ½À¡Ğ±À¹Ì¹Ì¤ì(€€€¥˜ …ÍÑ½ÁÁ¥¹œ¥É•ÑÕÉ¸€œœì(€€€½¹ÍĞÍ¡½İ1…‰•°õÍÑ½ÁÁ¥¹œ˜˜¡Í•±•Ñ•‘ññ¤ôôôÁññ¤ôôõÁ½¥¹ÑÌ¹±•¹Ñ ´Åññ¤•±…‰•±MÑ•ÀôôôÀ¤ì(€€€½¹ÍĞ…¹¡½ÈõÀ¹àù\¨¸ØÜü•¹œéÀ¹àñ\¨¸ÌÌüÍÑ…ÉĞœèµ¥‘‘±”œì(€€€½¹ÍĞÑàõÀ¹à¬¡…¹¡½ÈôôôÍÑ…ÉĞœüàé…¹¡½Èôôô•¹œü´àèÀ¤±ÑäõÀ¹ä¬¡…¹¡½Èôôôµ¥‘‘±”œü´ÄÀèĞ¤ì(€€€É•ÑÕÉ¸€ñœ±…ÍÌôˆ‘í…Ñ¥Ù”üÍ•±•Ñ•œèµÕÑ•ô‘íÍ•±•Ñ•üœ•¹‘Á½¥¹Ğœèœô‘íÍÑ½ÁÁ¥¹œüœÍÑ½ÀœèœÁ…ÍÌôˆøñ¥É±”àôˆ‘íÀ¹à¹Ñ½¥á• Ä¥ôˆäôˆ‘íÀ¹ä¹Ñ½¥á• Ä¥ôˆÈôˆ‘íÍ•±•Ñ•üÜéÍÑ½ÁÁ¥¹œüÌ¸ÔèÈ¸ÉôˆøñÑ¥Ñ±”ø‘í•ÍŒ¡À¹Ì¹Ì¥ô‘íÍÑ½ÁÁ¥¹œüœœèœ€£¶×ªÎğ¤ôğ½Ñ¥Ñ±”øğ½¥É±”ø‘íÍ¡½İ1…‰•°ı€ñÑ•áĞàôˆ‘íÑà¹Ñ½¥á• Ä¥ôˆäôˆ‘íÑä¹Ñ½¥á• Ä¥ôˆÑ•áĞµ…¹¡½Èôˆ‘í…¹¡½Éôˆø‘í•ÍŒ¡À¹Ì¹Ì¥ôğ½Ñ•áĞù€èœôğ½œù€ì(€ô¤¹©½¥¸ œœ¤ì(€±•Ğ±¥Ù•5…É­•Èôœœì(€¥˜¡}‰½½­I½ÕÑ•%Í1¥Ù•M•ÉÙ¥•…Ñ”¡Ğ±ÑÉ…Ù•±…Ñ•ññÑ½‘…å1½…±MÑÈ ¤¤¥ì(€€€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤±‘•±…äõÑåÁ•½˜}±¥Ù••±…å=˜ôôô™Õ¹Ñ¥½¸œı}±¥Ù••±…å=˜¡Ğ¤èÀì(€€€½¹ÍĞÍ•ÉÙ¥•9½Üõ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤­¹½Ü¹•ÑM•½¹‘Ì ¤¼ØÀµ‘•±…ä­ÁÉ½©•Ñ5¥¹ÕÑ•Ìì(€€€½¹ÍĞ±¥Ù”õ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ±Í•ÉÙ¥•9½Ü¤ì(€€€¥˜¡±¥Ù”ü¹ÍÑ…ÑÕÌôôôÉÕ¹¹¥¹œœ¥ì(€€€€€±•Ğàõ¹Õ±°±äõ¹Õ±°±±…‰•°ôŸ¶b²z°ƒ²^Ó²Â ƒ²r²æ`œì(€€€€€¥˜¡±¥Ù”¹…ÑMÑ¸¥ì(€€€€€€€½¹ÍĞÁ½¥¹ĞõÁ½¥¹ÑÌ¹™¥¹¡ÀôùÀ¹Ì¹Ìôôõ±¥Ù”¹…ÑMÑ¸¤ì(€€€€€€€¥˜¡Á½¥¹Ğ¥íàõÁ½¥¹Ğ¹àíäõÁ½¥¹Ğ¹äí±…‰•°õƒ¶b²z°ƒ²r²æ`è€‘í±¥Ù”¹…ÑMÑ¹õ€íô(€€€€€õ•±Í”¥˜¡±¥Ù”¹ÁÉ•ÙMÑ¸˜™±¥Ù”¹¹•áÑMÑ¸¥ì(€€€€€€€½¹ÍĞ…A½ÌõÁ½¥¹ÑÌ¹™¥¹‘%¹‘•à¡ÀôùÀ¹Ì¹Ìôôõ±¥Ù”¹ÁÉ•ÙMÑ¸¤ì(€€€€€€€½¹ÍĞ‰A½ÌõÁ½¥¹ÑÌ¹™¥¹‘%¹‘•à ¡À±¤¤ôù¤ù…A½Ì˜™À¹Ì¹Ìôôõ±¥Ù”¹¹•áÑMÑ¸¤ì(€€€€€€€½¹ÍĞ„õ…A½ÌøôÀıÁ½¥¹ÑÍm…A½Íté¹Õ±°±ˆõ‰A½ÌøôÀıÁ½¥¹ÑÍm‰A½Íté¹Õ±°ì(€€€€€€€¥˜¡„˜™ˆ¥ì(€€€€€€€€€±•Ğ‘•Á…ÉĞõÑ½5¥¸¡„¹Ì¹‘•Áññ„¹Ì¹…ÉÈ¤±…ÉÉ¥Ù”õÑ½5¥¸¡ˆ¹Ì¹…ÉÉññˆ¹Ì¹‘•À¤±ÕÉÉ•¹ĞõÍ•ÉÙ¥•9½Üì(€€€€€€€€€¥˜¡‘•Á…ÉĞ„õ¹Õ±°˜™…ÉÉ¥Ù”„õ¹Õ±°¥ì(€€€€€€€€€€€¥˜¡…ÉÉ¥Ù”ñ‘•Á…ÉĞ¥…ÉÉ¥Ù”¬ôÄĞĞÀì(€€€€€€€€€€€¥˜¡ÕÉÉ•¹Ğñ‘•Á…ÉĞ˜™…ÉÉ¥Ù”øôÄĞĞÀ¥ÕÉÉ•¹Ğ¬ôÄĞĞÀì(€€€€€€€€€€€½¹ÍĞ™É…Ñ¥½¸õ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸ Ä°¡ÕÉÉ•¹Ğµ‘•Á…ÉĞ¤½5…Ñ ¹µ…à Ä±…ÉÉ¥Ù”µ‘•Á…ÉĞ¤¤¤ì(€€€€€€€€€€€€¼¼ƒ®²Ó².sªÂƒ¶×ªÎó²^·®>ƒ².“²‚pƒ²ƒ¶bW²v`ƒªò·²O²‚C²ró®†pƒ¶>³¶V£¶VĞƒ²r²æc®–ğƒ®ÎÓªÂ¶Vs®.¸(€€€€€€€€€€€½¹ÍĞÁ…Ñ õÁ½¥¹ÑÌ¹Í±¥”¡…A½Ì±‰A½Ì¬Ä¤±Í•µ•¹ÑÌõmtì(€€€€€€€€€€€±•ĞÑ½Ñ…°ôÀì(€€€€€€€€€€€™½È¡±•Ğ¤ôÀí¤ñÁ…Ñ ¹±•¹Ñ ´Äí¤¬¬¥ì(€€€€€€€€€€€€€½¹ÍĞ±•¹Ñ õ5…Ñ ¹¡åÁ½Ğ¡Á…Ñ¡m¤¬Åt¹àµÁ…Ñ¡m¥t¹à±Á…Ñ¡m¤¬Åt¹äµÁ…Ñ¡m¥t¹ä¤ì(€€€€€€€€€€€€€Í•µ•¹ÑÌ¹ÁÕÍ ¡±•¹Ñ ¤íÑ½Ñ…°¬õ±•¹Ñ ì(€€€€€€€€€€€ô(€€€€€€€€€€€±•ĞÑ…É•ĞõÑ½Ñ…°©™É…Ñ¥½¸±Í•µ•¹ĞôÀì(€€€€€€€€€€€İ¡¥±”¡Í•µ•¹ĞñÍ•µ•¹ÑÌ¹±•¹Ñ ´Ä˜™Ñ…É•ĞùÍ•µ•¹ÑÍmÍ•µ•¹Ñt¥Ñ…É•Ğ´õÍ•µ•¹ÑÍmÍ•µ•¹Ğ¬­tì(€€€€€€€€€€€½¹ÍĞÍÑ…ÉĞõÁ…Ñ¡mÍ•µ•¹Ñt±•¹õÁ…Ñ¡m5…Ñ ¹µ¥¸¡Í•µ•¹Ğ¬Ä±Á…Ñ ¹±•¹Ñ ´Ä¥tì(€€€€€€€€€€€½¹ÍĞ±½…°õÍ•µ•¹ÑÍmÍ•µ•¹ÑtøÀıÑ…É•Ğ½Í•µ•¹ÑÍmÍ•µ•¹ÑtèÀì(€€€€€€€€€€€àõÍÑ…ÉĞ¹à¬¡•¹¹àµÍÑ…ÉĞ¹à¤©±½…°íäõÍÑ…ÉĞ¹ä¬¡•¹¹äµÍÑ…ÉĞ¹ä¤©±½…°ì(€€€€€€€€€€€±…‰•°õƒ¶b²z°ƒ²r²æ`è€‘í±¥Ù”¹ÁÉ•ÙMÑ¹÷ŠL‘í±¥Ù”¹¹•áÑMÑ¹õ€ì(€€€€€€€€€ô(€€€€€€€ô(€€€€€ô(€€€€€¥˜¡à„õ¹Õ±°˜™ä„õ¹Õ±°¥±¥Ù•5…É­•Èõ€ñœ±…ÍÌô‰‰Éµµ…Àµ±¥Ù”µÑÉ…¥¸ˆÍÑå±”ô‰ÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ‘íà¹Ñ½¥á• Ä¥õÁà°‘íä¹Ñ½¥á• Ä¥õÁà¤ˆÉ½±”ô‰¥µœˆ…É¥„µ±…‰•°ôˆ‘í•ÍŒ¡±…‰•°¥ôˆøñ¥É±”ÈôˆÄÈˆ¼øñÁ…Ñ ô‰4´Ô´İ ÄÁ„Ì€Ì€À€À€Ä€Ì€ÍØá„Ì€Ì€À€À€Ä´Ì€Í ´Õ„Ì€Ì€À€À€Ä´Ì´ÍØ´á„Ì€Ì€À€À€Ä€Ì´Íi´À€ÍØÕ ÄÁØ´Õi´Ä€á ¸Å4Ğ€Ñ ¸Å4´Ô€ÄÁ°È´Í4Ô€ÄÀ€Ì€Üˆ¼øñÑ¥Ñ±”ø‘í•ÍŒ¡±…‰•°¥ôğ½Ñ¥Ñ±”øğ½œù€ì(€€€ô(€ô(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‰ÉµÉ½ÕÑ”µµ…ÀˆÍÑå±”ôˆ´µÉ½ÕÑ”µÉ…‘”è‘íÉ…‘•½±½Éôˆøñ‘¥Ø±…ÍÌô‰‰Éµµ…Àµ­•äˆøñÍÁ…¸øñ¤±…ÍÌô‰Í•±•Ñ•ˆøğ½¤û²*ç²Â ƒªÖ³ªÂğ½ÍÁ…¸øñÍÁ…¸øñ¤øğ½¤ûªŞàƒ²fàƒ²jÓ¶Z$ƒªÖ³ªÂğ½ÍÁ…¸ø‘í±¥Ù•5…É­•ÈüœñÍÁ…¸øñ¤±…ÍÌô‰±¥Ù”ˆøğ½¤û¶b²z°ƒ²r²æ`ğ½ÍÁ…¸øœèœôğ½‘¥Øøñ‘¥Ø±…ÍÌô‰‰Éµµ…Àµ…¹Ù…ÌˆøñÍÙœÙ¥•İ	½àôˆÀ€À€‘í]ô€‘í!ôˆÉ½±”ô‰¥µœˆ…É¥„µ±…‰•°ôˆ‘í•ÍŒ¡Ğ¹É…‘”¥ô€‘í•ÍŒ¡Ğ¹¹¼¥ôƒ²‚²ÊĞƒ²jÓ¶Z$ƒªÖ³ªÂƒ®ã²ƒ®>ˆø‘í±¥¹•Íô‘í¹½‘•Íô‘í±¥Ù•5…É­•Éôğ½ÍÙœøğ½‘¥ØøñÀø‘í•ÍŒ¡Ğ¹ÍÑ½ÁÍlÁtü¹Ì¥ôƒŠH€‘í•ÍŒ¡Ğ¹ÍÑ½ÁÍmĞ¹ÍÑ½ÁÌ¹±•¹Ñ ´Åtü¹Ì¥ôƒ²‚²ÊĞƒ²jÓ¶Z$ƒªÖ³ªÂğ½Àøğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸Í•Ñ	½½­I½ÕÑ••Ñ…¥±Q…ˆ¡µ½‘”¥ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…Àœ¤í¥˜ …İÉ…À¥É•ÑÕÉ¸ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰ÉµÙ¥•ÜµÑ…ˆœ¤¹™½É… ¡‰Ñ¸ôùí½¹ÍĞ½¸õ‰Ñ¸¹‘…Ñ…Í•Ğ¹Ù¥•Üôôõµ½‘”í‰Ñ¸¹±…ÍÍ1¥ÍĞ¹Ñ½±” …Ñ¥Ù”œ±½¸¤í‰Ñ¸¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µÍ•±•Ñ•œ±MÑÉ¥¹œ¡½¸¤¤íô¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰ÉµÍ¡•‘Õ±”µÙ¥•Üœ¤ü¹±…ÍÍ1¥ÍĞ¹Ñ½±” …Ñ¥Ù”œ±µ½‘”ôôôÍ¡•‘Õ±”œ¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµµ…ÀµÙ¥•Üœ¤ü¹±…ÍÍ1¥ÍĞ¹Ñ½±” …Ñ¥Ù”œ±µ½‘”ôôôµ…Àœ¤ì)ô()±•Ğ}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•Èõ¹Õ±°ì)™Õ¹Ñ¥½¸}‰½½­I½ÕÑ•Q¥µ•±¥¹•A½Í¥Ñ¥½¸¡Ğ±É½İMÑ…Ñ¥½¹Ì±±¥Ù”±Í•ÉÙ¥•9½Ü¥ì(€¥˜ …±¥Ù•ññ±¥Ù”¹ÍÑ…ÑÕÌ„ôôÉÕ¹¹¥¹œœ¥É•ÑÕÉ¸í¥‘àè´Ä±µ…É­•É%‘àè´Ä±Ñ½ÀèÔÀ±‰•Ñİ••¸é™…±Í”±ÍÑ…Ñ¥½¸èœôì(€¥˜¡±¥Ù”¹…ÑMÑ¸¥ì(€€€½¹ÍĞ•á…ĞõÉ½İMÑ…Ñ¥½¹Ì¹¥¹‘•á=˜¡±¥Ù”¹…ÑMÑ¸¤ì(€€€¥˜¡•á…ĞøôÀ¥É•ÑÕÉ¸í¥‘àé•á…Ğ±µ…É­•É%‘àé•á…Ğ±Ñ½ÀèÔÀ±‰•Ñİ••¸é™…±Í”±ÍÑ…Ñ¥½¸é±¥Ù”¹…ÑMÑ¹ôì(€ô(€½¹ÍĞÉ½ÕÑ”õĞ¹ÍÑ½ÁÍññmtì(€±•ĞÕÉÍ½Èô´Ä±½™™Í•ĞôÀ±ÁÉ•Ù¥½ÕÍI…Üô´Äì(€½¹ÍĞÑ¥µ•õÉ½İMÑ…Ñ¥½¹Ì¹µ…À¡ÍÑ…Ñ¥½¸ôùì(€€€½¹ÍĞÉ½ÕÑ•%‘àõÉ½ÕÑ”¹™¥¹‘%¹‘•à ¡Ì±¤¤ôù¤ùÕÉÍ½È˜™Ì¹ÌôôõÍÑ…Ñ¥½¸˜˜¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¤ì(€€€¥˜¡É½ÕÑ•%‘àğÀ¥É•ÑÕÉ¸¹Õ±°ì(€€€ÕÉÍ½ÈõÉ½ÕÑ•%‘àí½¹ÍĞÍÑ½ÀõÉ½ÕÑ•mÉ½ÕÑ•%‘át±É…İÉÈõÑ½5¥¸¡ÍÑ½À¹…ÉÈ¤±É…İ•ÀõÑ½5¥¸¡ÍÑ½À¹‘•À¤±É…ÜõÉ…İÉÈüıÉ…İ•Àì(€€€¥˜¡ÁÉ•Ù¥½ÕÍI…ÜøôÀ˜™É…ÜñÁÉ•Ù¥½ÕÍI…Ü´ØÀ¥½™™Í•Ğ¬ôÄĞĞÀì(€€€ÁÉ•Ù¥½ÕÍI…ÜõÉ…Üì(€€€É•ÑÕÉ¸íÍÑ…Ñ¥½¸±…ÉÈéÉ…İÉÈ„õ¹Õ±°ıÉ…İÉÈ­½™™Í•Ğé¹Õ±°±‘•ÀéÉ…İ•À„õ¹Õ±°ıÉ…İ•À­½™™Í•Ğé¹Õ±±ôì(€ô¤¹™¥±Ñ•È¡	½½±•…¸¤ì(€¥˜¡Ñ¥µ•¹±•¹Ñ øôÈ˜™9Õµ‰•È¹¥Í¥¹¥Ñ”¡Í•ÉÙ¥•9½Ü¤¥ì(€€€±•ĞÕÉÉ•¹ĞõÍ•ÉÙ¥•9½Üì(€€€½¹ÍĞ™¥ÉÍĞõÑ¥µ•‘lÁt¹‘•ÀüıÑ¥µ•‘lÁt¹…ÉÈ±±…ÍĞõÑ¥µ•‘mÑ¥µ•¹±•¹Ñ ´Åt¹…ÉÈüıÑ¥µ•‘mÑ¥µ•¹±•¹Ñ ´Åt¹‘•Àì(€€€¥˜¡±…ÍĞøôÄĞĞÀ˜™ÕÉÉ•¹Ğñ™¥ÉÍĞ¥ÕÉÉ•¹Ğ¬ôÄĞĞÀì(€€€±•ĞÁÉ•Øô´Ä±¹•áĞô´Äì(€€€™½È¡±•Ğ¤ôÀí¤ñÑ¥µ•¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞ±•…Ù”õÑ¥µ•‘m¥t¹‘•ÀüıÑ¥µ•‘m¥t¹…ÉÈ±…ÉÉ¥Ù”õÑ¥µ•‘m¥t¹…ÉÈüıÑ¥µ•‘m¥t¹‘•Àì(€€€€€¥˜¡±•…Ù”„õ¹Õ±°˜™±•…Ù”ğõÕÉÉ•¹Ğ¥ÁÉ•Øõ¤ì(€€€€€¥˜¡¹•áĞğÀ˜™…ÉÉ¥Ù”„õ¹Õ±°˜™…ÉÉ¥Ù”ùÕÉÉ•¹Ğ¥¹•áĞõ¤ì(€€€ô(€€€¥˜¡ÁÉ•ØøôÀ˜™¹•áĞùÁÉ•Ø¥ì(€€€€€½¹ÍĞ‘•Á…ÉĞõÑ¥µ•‘mÁÉ•Ùt¹‘•ÀüıÑ¥µ•‘mÁÉ•Ùt¹…ÉÈ±…ÉÉ¥Ù”õÑ¥µ•‘m¹•áÑt¹…ÉÈüıÑ¥µ•‘m¹•áÑt¹‘•Àì(€€€€€½¹ÍĞ™É…Ñ¥½¸õ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸ Ä°¡ÕÉÉ•¹Ğµ‘•Á…ÉĞ¤½5…Ñ ¹µ…à Ä±…ÉÉ¥Ù”µ‘•Á…ÉĞ¤¤¤ì(€€€€€É•ÑÕÉ¸í¥‘àé¹•áĞ±µ…É­•É%‘àéÁÉ•Ø±Ñ½ÀèÔÀ­™É…Ñ¥½¸¨ÄÀÀ±‰•Ñİ••¸éÑÉÕ”±ÍÑ…Ñ¥½¸éÑ¥µ•‘m¹•áÑt¹ÍÑ…Ñ¥½¹ôì(€€€ô(€ô(€±•ĞÁÉ•ÙI½ÕÑ”ô´Ä±¹•áÑI½ÕÑ”ô´Äì(€¥˜¡±¥Ù”¹ÁÉ•ÙMÑ¸¥ÁÉ•ÙI½ÕÑ”õÉ½ÕÑ”¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ±¥Ù”¹ÁÉ•ÙMÑ¸¤ì(€¥˜¡±¥Ù”¹¹•áÑMÑ¸¥¹•áÑI½ÕÑ”õÉ½ÕÑ”¹™¥¹‘%¹‘•à ¡Ì±¤¤ôù¤ùÁÉ•ÙI½ÕÑ”˜™Ì¹Ìôôõ±¥Ù”¹¹•áÑMÑ¸¤ì(€¥˜¡¹•áÑI½ÕÑ”ğÀ˜™±¥Ù”¹…ÑMÑ¸¥¹•áÑI½ÕÑ”õÉ½ÕÑ”¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ±¥Ù”¹…ÑMÑ¸¤ì(€½¹ÍĞÍÑ…ÉĞõ5…Ñ ¹µ…à À±¹•áÑI½ÕÑ”øôÀı¹•áÑI½ÕÑ”éÁÉ•ÙI½ÕÑ”¬Ä¤ì(€™½È¡±•Ğ¤õÍÑ…ÉĞí¤ñÉ½ÕÑ”¹±•¹Ñ í¤¬¬¥ì(€€€½¹ÍĞÍÑ½ÀõÉ½ÕÑ•m¥tì(€€€¥˜ ¡¡…ÍQ¥µ”¡ÍÑ½À¹…ÉÈ¥ññ¡…ÍQ¥µ”¡ÍÑ½À¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±ÍÑ½À¹Ì¤¥ì(€€€€€½¹ÍĞ¥‘àõÉ½İMÑ…Ñ¥½¹Ì¹¥¹‘•á=˜¡ÍÑ½À¹Ì¤ì(€€€€€¥˜¡¥‘àøôÀ¥É•ÑÕÉ¸í¥‘à±µ…É­•É%‘àé5…Ñ ¹µ…à À±¥‘à´Ä¤±Ñ½ÀèÄÀÀ±‰•Ñİ••¸éÑÉÕ”±ÍÑ…Ñ¥½¸éÍÑ½À¹Íôì(€€€ô(€ô(€É•ÑÕÉ¸í¥‘àè´Ä±µ…É­•É%‘àè´Ä±Ñ½ÀèÔÀ±‰•Ñİ••¸é™…±Í”±ÍÑ…Ñ¥½¸èœôì)ô)™Õ¹Ñ¥½¸}Í¡•‘Õ±•	½½­I½ÕÑ••Ñ…¥±Q¥¬ ¥ì(€¥˜¡}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•È¥±•…ÉQ¥µ•½ÕĞ¡}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•È¤ì(€½¹ÍĞİ…¥ĞôØÀÀÀÀ´¡…Ñ”¹¹½Ü ¤”ØÀÀÀÀ¤¬ÌÀì(€}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•ÈõÍ•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…Àœ¤ì(€€€¥˜ …İÉ…À¥í}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•Èõ¹Õ±°íÉ•ÑÕÉ¸íô(€€€ÕÁ‘…Ñ•	½½­I½ÕÑ•1¥Ù”¡İÉ…À¹‘…Ñ…Í•Ğ¹ÑÉ…¥¸±İÉ…À¹‘…Ñ…Í•Ğ¹™É½´±İÉ…À¹‘…Ñ…Í•Ğ¹Ñ¼±İÉ…À¹‘…Ñ…Í•Ğ¹‘…Ñ”¤ì(€€€}Í¡•‘Õ±•	½½­I½ÕÑ••Ñ…¥±Q¥¬ ¤ì(€ô±İ…¥Ğ¤ì)ô)™Õ¹Ñ¥½¸ÕÁ‘…Ñ•	½½­I½ÕÑ•1¥Ù”¡ÑÉ…¥¹9¼±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¥ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…Àœ¤±Ğõ•ÑQÉ…¥¹	å9¼¡ÑÉ…¥¹9¼¤ì(€¥˜ …İÉ…Áñğ…ÑññİÉ…À¹‘…Ñ…Í•Ğ¹ÑÉ…¥¸„ôõMÑÉ¥¹œ¡ÑÉ…¥¹9¼¤¥É•ÑÕÉ¸ì(€½¹ÍĞ•ÍŒõÑåÁ•½˜}½ÁÍÍŒôôô™Õ¹Ñ¥½¸œı}½ÁÍÍŒéÌôùMÑÉ¥¹œ¡Ìüüœœ¤¹É•Á±…” ½l˜ğùt½œ±Œôø¡ìœ˜œèœ™…µÀìœ°œğœèœ™±Ğìœ°œøœèœ™Ğìõmt¤¤ì(€½¹ÍĞÑ½‘…äõÑ½‘…å1½…±MÑÈ ¤±Í•ÉÙ¥•…Ñ”õÑÉ…Ù•±…Ñ•ññÑ½‘…äì(€½¹ÍĞ±¥Ù•M•ÉÙ¥•…Ñ”õ}‰½½­I½ÕÑ•%Í1¥Ù•M•ÉÙ¥•…Ñ”¡Ğ±Í•ÉÙ¥•…Ñ”¤ì(€±•Ğ±¥Ù”õ¹Õ±°±±¥Ù•MÑ½Á%‘àô´Ä±±¥Ù•5…É­•É%‘àô´Ä±±¥Ù•Q½ÀôÔÀ±±¥Ù•	•Ñİ••¸õ™…±Í”±±¥Ù•1…‰•°ôœœ±µ…¥¸ôœœ±ÍÕˆôœœì(€¥˜¡±¥Ù•M•ÉÙ¥•…Ñ”¥ì(€€€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤±‘•±…äõÑåÁ•½˜}±¥Ù••±…å=˜ôôô™Õ¹Ñ¥½¸œı}±¥Ù••±…å=˜¡Ğ¤èÀì(€€€½¹ÍĞÍ•ÉÙ¥•9½Üõ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤­¹½Ü¹•ÑM•½¹‘Ì ¤¼ØÀµ‘•±…äì(€€€±¥Ù”õ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ±Í•ÉÙ¥•9½Ü¤ì(€€€¥˜¡±¥Ù”ü¹ÍÑ…ÑÕÌôôôÉÕ¹¹¥¹œœ¥ì(€€€€€¥˜¡±¥Ù”¹Á…ÍÍMÑ¸¥µ…¥¸õ€‘í±¥Ù”¹Á…ÍÍMÑ¹÷²^·²vƒ¶×ªÎğƒ²’G²z®.#®.‘€ì(€€€€€•±Í”¥˜¡±¥Ù”¹…ÑMÑ¸¥µ…¥¸õ€‘í±¥Ù”¹…ÑMÑ¹÷²^·²^@ƒ²‚W²Â ƒ²’G²z®.#®.‘€ì(€€€€€•±Í”¥˜¡±¥Ù”¹¹•áÑMÑ¸¥µ…¥¸õ€‘í±¥Ù”¹¹•áÑMÑ¹÷²^·²ró®†pƒ²vÓ®>dƒ²’G²z®.#®.‘€ì(€€€€€•±Í”µ…¥¸ôŸ²jÓ¶Z$ƒ²’G²z®.#®.œì(€€€€€½¹ÍĞ•Ñ„õ•Ñ9•áÑMÑ½ÁÑ„¡Ğ±±¥Ù”¤í¥˜¡•Ñ„¥ÍÕˆõ•Ñ„¹µ¥¸ôôôÀüŸªÎœƒ®>²Â¤ƒ²b#²‚Tœéƒ²Vô€‘í•Ñ„¹µ¥¹÷®Úƒ®Jƒ®>²Â¤ƒ²b#²‚U€ì(€€€€€½¹ÍĞÉ½İÌõl¸¸¹İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰ÉµÍÑ½Àœ¥tì(€€€€€½¹ÍĞÁÉ½©•Ñ•‘9½ÜõÍ•ÉÙ¥•9½Ü¬Ä±ÁÉ½©•Ñ•‘1¥Ù”õ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ±ÁÉ½©•Ñ•‘9½Ü¤ì(€€€€€½¹ÍĞÁ½Í¥Ñ¥½¸õ}‰½½­I½ÕÑ•Q¥µ•±¥¹•A½Í¥Ñ¥½¸¡Ğ±É½İÌ¹µ…À¡É½ÜôùÉ½Ü¹‘…Ñ…Í•Ğ¹ÍÑ…Ñ¥½¸¤±ÁÉ½©•Ñ•‘1¥Ù”±ÁÉ½©•Ñ•‘9½Ü¤ì(€€€€€±¥Ù•MÑ½Á%‘àõÁ½Í¥Ñ¥½¸¹¥‘àí±¥Ù•5…É­•É%‘àõÁ½Í¥Ñ¥½¸¹µ…É­•É%‘àí±¥Ù•Q½ÀõÁ½Í¥Ñ¥½¸¹Ñ½Àí±¥Ù•	•Ñİ••¸õÁ½Í¥Ñ¥½¸¹‰•Ñİ••¸ì(€€€€€±¥Ù•1…‰•°õÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¸ü¡Á½Í¥Ñ¥½¸¹‰•Ñİ••¸ı€‘íÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¹ôƒ®Â§®¦Ğƒ²vÓ®>dƒ²’E€é€‘íÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¹ôƒ²‚W²Â ƒ²’E€¤èŸ²jÓ¶Z$ƒ²’Dœì(€€€õ•±Í”¥˜¡±¥Ù”ü¹ÍÑ…ÑÕÌôôô‰•™½É”œ¥ì(€€€€€µ…¥¸ôŸ²jÓ¶Z'²vƒ²’®æ²’G²vàƒ²^Ó²Â£²z®.#®.œí¥˜¡±¥Ù”¹•Ñ…5¥¸„õ¹Õ±°¥ÍÕˆõ™µÑÑ…-½È¡±¥Ù”¹•Ñ…5¥¸¤ì(€€€õ•±Í”µ…¥¸ôŸ²jÓ¶Z'²vĞƒ²Š®3®Bpƒ²^Ó²Â£²z®.#®.œì(€õ•±Í”¥˜¡Í•ÉÙ¥•…Ñ”ùÑ½‘…ä¥µ…¥¸ôŸ²jÓ¶Z'²vƒ²’®æ²’G²vàƒ²^Ó²Â£²z®.#®.œì(€•±Í”µ…¥¸ôŸ²jÓ¶Z'²vĞƒ²Š®3®Bpƒ²^Ó²Â£²z®.#®.œì(€½¹ÍĞÍÑ…Ñ”õİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµ½Á•É…Ñ¥½¸µÍÑ…Ñ”œ¤ì(€¥˜¡ÍÑ…Ñ”¥ÍÑ…Ñ”¹¥¹¹•É!Q50õ€ñˆø‘í•ÍŒ¡µ…¥¸¥ôğ½ˆø‘íÍÕˆı€ñÍÁ…¸ø‘í•ÍŒ¡ÍÕˆ¥ôğ½ÍÁ…¸ù€èœõ€ì(€½¹ÍĞÉ½İÌõl¸¸¹İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰ÉµÍÑ½Àœ¥tì(€½¹ÍĞ½±‘5…É­•ÈõİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµ±¥Ù”µµ…É­•Èœ¤ì(€É½İÌ¹™½É…  ¡É½Ü±¤¤ôùì(€€€É½Ü¹±…ÍÍ1¥ÍĞ¹Ñ½±” ±¥Ù”œ±¤ôôõ±¥Ù•MÑ½Á%‘à¤ì(€€€É½Ü¹±…ÍÍ1¥ÍĞ¹Ñ½±” ±¥Ù”µµ…É­•ÈµÉ½Üœ±¤ôôõ±¥Ù•5…É­•É%‘à¤ì(€€€¥˜¡¤ôôõ±¥Ù•5…É­•É%‘à¥ì(€€€€€½¹ÍĞÉ…¥°õÉ½Ü¹ÅÕ•ÉåM•±•Ñ½È œ¹‰ÉµÉ…¥°œ¤ì(€€€€€¥˜¡½±‘5…É­•È˜™½±‘5…É­•È¹Á…É•¹Ñ±•µ•¹ĞôôõÉ…¥°¥ì(€€€€€€€½±‘5…É­•È¹±…ÍÍ1¥ÍĞ¹Ñ½±” ‰•Ñİ••¸œ±±¥Ù•	•Ñİ••¸¤í½±‘5…É­•È¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ‰Éµ±¥Ù”µÑ½Àœ±€‘í±¥Ù•Q½Áô•€¤ì(€€€€€€€½±‘5…É­•È¹Ñ¥Ñ±”õ±¥Ù•1…‰•°í½±‘5…É­•È¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ±ƒ¶b²z°ƒ²r²æ`è€‘í±¥Ù•1…‰•±õ€¤ì(€€€€€õ•±Í•ì(€€€€€€€½±‘5…É­•Èü¹É•µ½Ù” ¤ì(€€€€€€€É…¥°ü¹¥¹Í•ÉÑ‘©…•¹Ñ!Q50 ‰•™½É••¹œ±€ñÍÁ…¸±…ÍÌô‰‰Éµ±¥Ù”µµ…É­•È‘í±¥Ù•	•Ñİ••¸üœ‰•Ñİ••¸œèœôˆÍÑå±”ôˆ´µ‰Éµ±¥Ù”µÑ½Àè‘í±¥Ù•Q½Áô”ˆÑ¥Ñ±”ôˆ‘í•ÍŒ¡±¥Ù•1…‰•°¥ôˆ…É¥„µ±…‰•°ô‹¶b²z°ƒ²r²æ`è€‘í•ÍŒ¡±¥Ù•1…‰•°¥ôˆøñÍÙœÙ¥•İ	½àôˆÀ€À€ÈĞ€ÈĞˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñÉ•ĞàôˆÔˆäôˆÌˆİ¥‘Ñ ôˆÄĞˆ¡•¥¡ĞôˆÄÜˆÉàôˆĞˆ¼øñÁ…Ñ ô‰4à€İ áØÕ áé4à€Äİ ¸ÀÅ4ÄØ€Äİ ¸ÀÅ4à€ÈÅ°´È€É4ÄØ€ÈÅ°È€Èˆ¼øğ½ÍÙœøğ½ÍÁ…¸ù€¤ì(€€€€€ô(€€€ô(€€€½¹ÍĞ‘•±…å%‘àõ9Õµ‰•È¡É½Ü¹‘…Ñ…Í•Ğ¹‘•±…å%¹‘•à¤ì(€€€½¹ÍĞÁ…¥Èõ±¥Ù•M•ÉÙ¥•…Ñ”˜™‘•±…å%‘àøôÀ˜™ÑåÁ•½˜}Í¥µ•±…åA…¥ÉÑMÑ½Àôôô™Õ¹Ñ¥½¸œı}Í¥µ•±…åA…¥ÉÑMÑ½À¡Ğ±‘•±…å%‘à¤éí…ÉÈèÀ±‘•ÀèÁôì(€€€ml…ÉÈœ±Á…¥È¹…ÉÉñğÁt±l‘•Àœ±Á…¥È¹‘•ÁñğÁut¹™½É…  ¡m­¥¹±‘•±…åt¤ôùì(€€€€€½¹ÍĞ•±°õÉ½Ü¹ÅÕ•ÉåM•±•Ñ½È¡€¹‰É´‘í­¥¹‘õ€¤±Í¡•‘Õ±•õÉ½Ü¹‘…Ñ…Í•Ñm­¥¹‘uñğœœí¥˜ …•±°¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ…ÑÕ…°õÍ¡•‘Õ±•˜™‘•±…äøÀı…‘‘5¥¹Q½±½¬¡Í¡•‘Õ±•±‘•±…ä¤èœœì(€€€€€•±°¹¥¹¹•É!Q50õÍ¡•‘Õ±•ı€ñÍÁ…¸ø‘í•ÍŒ¡Í¡•‘Õ±•¥ôğ½ÍÁ…¸ø‘í…ÑÕ…°ı€ñÍµ…±°ø ‘í•ÍŒ¡…ÑÕ…°¥ô¤ğ½Íµ…±°ù€èœõ€èŸŠPœì(€€€ô¤ì(€ô¤ì(€¥˜¡±¥Ù•5…É­•É%‘àğÀ¥½±‘5…É­•Èü¹É•µ½Ù” ¤ì(€½¹ÍĞµ…ÀõİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµµ…ÀµÙ¥•Üœ¤ì(€¥˜¡µ…À¥ì(€€€½¹ÍĞ½±½Èô¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmĞ¹É…‘•t¥ññÙ…È ´µŒ´‘íÍÍY…È¡Ğ¹É…‘”¥ô¥€ì(€€€½¹ÍĞÁÉ½‰”õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤íÁÉ½‰”¹¥¹¹•É!Q50õ}‰½½­I½ÕÑ•5…Á!Q50¡Ğ±™É½´±Ñ¼±½±½È±ÑÉ…Ù•±…Ñ”°Ä¤ì(€€€½¹ÍĞÕÉÉ•¹Ñ5…É­•Èõµ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµµ…Àµ±¥Ù”µÑÉ…¥¸œ¤±Ñ…É•Ñ5…É­•ÈõÁÉ½‰”¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµµ…Àµ±¥Ù”µÑÉ…¥¸œ¤ì(€€€¥˜¡ÕÉÉ•¹Ñ5…É­•È˜™Ñ…É•Ñ5…É­•È¥íÕÉÉ•¹Ñ5…É­•È¹ÍÑå±”¹ÑÉ…¹Í™½É´õÑ…É•Ñ5…É­•È¹ÍÑå±”¹ÑÉ…¹Í™½É´íÕÉÉ•¹Ñ5…É­•È¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ±Ñ…É•Ñ5…É­•È¹•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ¥ñğŸ¶b²z°ƒ²^Ó²Â ƒ²r²æ`œ¤íô(€€€•±Í”¥˜ …ÕÉÉ•¹Ñ5…É­•È˜™Ñ…É•Ñ5…É­•È¥µ…À¹¥¹¹•É!Q50õÁÉ½‰”¹¥¹¹•É!Q50ì(€€€•±Í”¥˜¡ÕÉÉ•¹Ñ5…É­•È˜˜…Ñ…É•Ñ5…É­•È¥ÕÉÉ•¹Ñ5…É­•È¹É•µ½Ù” ¤ì(€ô)ô((¼¼ƒ²b#®ƒªÖ³ªÂƒªâÃ²’ ƒ²jÓ¶Z$ƒ²‚W®ÎĞƒŠPƒ²‚²ÊĞƒ²‚W²Â£²^´ƒ²’Dƒ²*ç²Â£
ß¶Vc²Â ƒªÖ³ªÂ²vƒªÂW²†Ã¶Vs®.¸)™Õ¹Ñ¥½¸½Á•¹	½½­I½ÕÑ••Ñ…¥°¡ÑÉ…¥¹9¼±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¥ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡ÑÉ…¥¹9¼¤í¥˜ …Ğ¥É•ÑÕÉ¸ì(€½¹ÍĞÁÉ•Ù¥½ÕÌõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…Àœ¤ì(€¥˜¡ÁÉ•Ù¥½ÕÌ¥íÁÉ•Ù¥½ÕÌ¹É•µ½Ù” ¤í‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” …ÁÀµµ½‘…°µ½Á•¸œ¤íô(€½¹ÍĞ…±±MÑ½ÁÌô¡Ğ¹ÍÑ½ÁÍññmt¤¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¤ì(€½¹ÍĞ™É½µ%‘àõ…±±MÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ™É½´¤ì(€½¹ÍĞÑ½%‘àõ…±±MÑ½ÁÌ¹™¥¹‘%¹‘•à ¡Ì±¤¤ôù¤ù™É½µ%‘à˜™Ì¹ÌôôõÑ¼¤ì(€¥˜¡™É½µ%‘àğÁññÑ½%‘àğÀ¥í©ÕµÁQ½QÉ…¥¸¡ÑÉ…¥¹9¼¤íÉ•ÑÕÉ¸íô(€½¹ÍĞ•ÍŒõÑåÁ•½˜}½ÁÍÍŒôôô™Õ¹Ñ¥½¸œı}½ÁÍÍŒéÌôùMÑÉ¥¹œ¡Ìüüœœ¤¹É•Á±…” ½l˜ğùt½œ±Œôø¡ìœ˜œèœ™…µÀìœ°œğœèœ™±Ğìœ°œøœèœ™Ğìõmt¤¤ì(€½¹ÍĞÉ…‘•½±½Èô¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmĞ¹É…‘•t¥ññÙ…È ´µŒ´‘íÍÍY…È¡Ğ¹É…‘”¥ô¥€ì(€½¹ÍĞ‘…Ñ•1…‰•°ô  ¤ôùí½¹ÍĞ´õMÑÉ¥¹œ¡ÑÉ…Ù•±…Ñ•ñğœœ¤¹µ…Ñ  ½x¡q‘ìÑô¤´¡q‘ìÉô¤´¡q‘ìÉô¤¼¤í¥˜ …´¥É•ÑÕÉ¸•ÍŒ¡ÑÉ…Ù•±…Ñ•ññÑ½‘…å1½…±MÑÈ ¤¤í½¹ÍĞõ¹•Ü…Ñ” ­µlÅt°­µlÉt´Ä°­µlÍt¤íÉ•ÑÕÉ¸€‘íµlÅuô¸‘íµlÉuô¸‘íµlÍuô€ ‘ílŸ²vğœ°Ÿ²nPœ°Ÿ¶fPœ°Ÿ²"`œ°Ÿ®ª¤œ°Ÿªâ œ°Ÿ¶€um¹•Ñ…ä ¥uô¥€íô¤ ¤ì(€±•Ğ±¥Ù•MÑ½Á%‘àô´Ä±±¥Ù•5…É­•É%‘àô´Ä±±¥Ù•Q½ÀôÔÀ±±¥Ù•	•Ñİ••¸õ™…±Í”±±¥Ù•1…‰•°ôœœ±½Á•É…Ñ¥½¹5…¥¸ôœœ±½Á•É…Ñ¥½¹MÕˆôœœì(€½¹ÍĞÍ•ÉÙ¥•…Ñ”õÑÉ…Ù•±…Ñ•ññÑ½‘…å1½…±MÑÈ ¤±Ñ½‘…äõÑ½‘…å1½…±MÑÈ ¤ì(€½¹ÍĞ±¥Ù•M•ÉÙ¥•…Ñ”õ}‰½½­I½ÕÑ•%Í1¥Ù•M•ÉÙ¥•…Ñ”¡Ğ±Í•ÉÙ¥•…Ñ”¤ì(€¥˜¡±¥Ù•M•ÉÙ¥•…Ñ”¥ì(€€€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤±±¥Ù••±…äõÑåÁ•½˜}±¥Ù••±…å=˜ôôô™Õ¹Ñ¥½¸œı}±¥Ù••±…å=˜¡Ğ¤èÀì(€€€½¹ÍĞÍ•ÉÙ¥•9½Üõ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤­¹½Ü¹•ÑM•½¹‘Ì ¤¼ØÀµ±¥Ù••±…äì(€€€½¹ÍĞ±¥Ù”õ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ±Í•ÉÙ¥•9½Ü¤ì(€€€¥˜¡±¥Ù”ü¹ÍÑ…ÑÕÌôôôÉÕ¹¹¥¹œœ¥ì(€€€€€¥˜¡±¥Ù”¹Á…ÍÍMÑ¸¥½Á•É…Ñ¥½¹5…¥¸õ€‘í±¥Ù”¹Á…ÍÍMÑ¹÷²^·²vƒ¶×ªÎğƒ²’G²z®.#®.‘€ì(€€€€€•±Í”¥˜¡±¥Ù”¹…ÑMÑ¸¥½Á•É…Ñ¥½¹5…¥¸õ€‘í±¥Ù”¹…ÑMÑ¹÷²^·²^@ƒ²‚W²Â ƒ²’G²z®.#®.‘€ì(€€€€€•±Í”¥˜¡±¥Ù”¹¹•áÑMÑ¸¥½Á•É…Ñ¥½¹5…¥¸õ€‘í±¥Ù”¹¹•áÑMÑ¹÷²^·²ró®†pƒ²vÓ®>dƒ²’G²z®.#®.‘€ì(€€€€€•±Í”½Á•É…Ñ¥½¹5…¥¸ôŸ²jÓ¶Z$ƒ²’G²z®.#®.œì(€€€€€½¹ÍĞ•Ñ„õ•Ñ9•áÑMÑ½ÁÑ„¡Ğ±±¥Ù”¤ì(€€€€€¥˜¡•Ñ„¥½Á•É…Ñ¥½¹MÕˆõ•Ñ„¹µ¥¸ôôôÀüŸªÎœƒ®>²Â¤ƒ²b#²‚Tœéƒ²Vô€‘í•Ñ„¹µ¥¹÷®Úƒ®Jƒ®>²Â¤ƒ²b#²‚U€ì(€€€€€½¹ÍĞÁ½Í¥Ñ¥½¸õ}‰½½­I½ÕÑ•Q¥µ•±¥¹•A½Í¥Ñ¥½¸¡Ğ±…±±MÑ½ÁÌ¹µ…À¡ÌôùÌ¹Ì¤±±¥Ù”±Í•ÉÙ¥•9½Ü¤ì(€€€€€±¥Ù•MÑ½Á%‘àõÁ½Í¥Ñ¥½¸¹¥‘àí±¥Ù•5…É­•É%‘àõÁ½Í¥Ñ¥½¸¹µ…É­•É%‘àí±¥Ù•Q½ÀõÁ½Í¥Ñ¥½¸¹Ñ½Àí±¥Ù•	•Ñİ••¸õÁ½Í¥Ñ¥½¸¹‰•Ñİ••¸ì(€€€€€±¥Ù•1…‰•°õÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¸ü¡Á½Í¥Ñ¥½¸¹‰•Ñİ••¸ı€‘íÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¹ôƒ®Â§®¦Ğƒ²vÓ®>dƒ²’E€é€‘íÁ½Í¥Ñ¥½¸¹ÍÑ…Ñ¥½¹ôƒ²‚W²Â ƒ²’E€¤èŸ²jÓ¶Z$ƒ²’Dœì(€€€õ•±Í”¥˜¡±¥Ù”ü¹ÍÑ…ÑÕÌôôô‰•™½É”œ¥ì(€€€€€½Á•É…Ñ¥½¹5…¥¸ôŸ²jÓ¶Z'²vƒ²’®æ²’G²vàƒ²^Ó²Â£²z®.#®.œì(€€€€€¥˜¡±¥Ù”¹•Ñ…5¥¸„õ¹Õ±°¥½Á•É…Ñ¥½¹MÕˆõ™µÑÑ…-½È¡±¥Ù”¹•Ñ…5¥¸¤ì(€€€õ•±Í•ì(€€€€€½Á•É…Ñ¥½¹5…¥¸ôŸ²jÓ¶Z'²vĞƒ²Š®3®Bpƒ²^Ó²Â£²z®.#®.œì(€€€ô(€õ•±Í”¥˜¡Í•ÉÙ¥•…Ñ”ùÑ½‘…ä¥ì(€€€½Á•É…Ñ¥½¹5…¥¸ôŸ²jÓ¶Z'²vƒ²’®æ²’G²vàƒ²^Ó²Â£²z®.#®.œì(€õ•±Í•ì(€€€½Á•É…Ñ¥½¹5…¥¸ôŸ²jÓ¶Z'²vĞƒ²Š®3®Bpƒ²^Ó²Â£²z®.#®.œì(€ô(€½¹ÍĞÑ¥µ•‘MÑ½ÁÌô¡Ğ¹ÍÑ½ÁÍññmt¤¹™¥±Ñ•È¡Ìôù¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤ì(€½¹ÍĞÍ¡½İ•±…åQ¥µ•Ìõ±¥Ù•M•ÉÙ¥•…Ñ”˜™ÑåÁ•½˜}Í¥µ•±…åA…¥ÉÑMÑ½Àôôô™Õ¹Ñ¥½¸œì(€½¹ÍĞÉ½İÌõ…±±MÑ½ÁÌ¹µ…À ¡Ì±¤¤ôùì(€€€½¹ÍĞ¥¹I¥‘”õ¤øõ™É½µ%‘à˜™¤ğõÑ½%‘à±‰•™½É”õ¤ñ™É½µ%‘à±…™Ñ•Èõ¤ùÑ½%‘àì(€€€½¹ÍĞÁ±…ĞõÑåÁ•½˜}É•…±A±…Ñ™½É´ôôô™Õ¹Ñ¥½¸œı}É•…±A±…Ñ™½É´¡Ğ¹¹¼±Ì¹Ì¤é¹Õ±°ì(€€€½¹ÍĞ‰…‘”õ¤ôôõ™É½µ%‘àüœñÍÁ…¸±…ÍÌô‰‰ÉµÍÑ½Àµ‰…‘”‰½…Éˆû²*ç²Â ğ½ÍÁ…¸øœé¤ôôõÑ½%‘àüœñÍÁ…¸±…ÍÌô‰‰ÉµÍÑ½Àµ‰…‘”…±¥¡Ğˆû¶Vc²Â ğ½ÍÁ…¸øœèœœì(€€€½¹ÍĞ…ÉÈõ¡…ÍQ¥µ”¡Ì¹…ÉÈ¤ıÌ¹…ÉÈèœœ±‘•Àõ¡…ÍQ¥µ”¡Ì¹‘•À¤ıÌ¹‘•Àèœœì(€€€½¹ÍĞ‘•±…å%‘àõÑ¥µ•‘MÑ½ÁÌ¹¥¹‘•á=˜¡Ì¤ì(€€€½¹ÍĞ‘•±…åA…¥ÈõÍ¡½İ•±…åQ¥µ•Ì˜™‘•±…å%‘àøôÀı}Í¥µ•±…åA…¥ÉÑMÑ½À¡Ğ±‘•±…å%‘à¤éí…ÉÈèÀ±‘•ÀèÁôì(€€€½¹ÍĞ…ÑÕ…±ÉÈõ…ÉÈ˜™‘•±…åA…¥È¹…ÉÈøÀı…‘‘5¥¹Q½±½¬¡…ÉÈ±‘•±…åA…¥È¹…ÉÈ¤èœœì(€€€½¹ÍĞ…ÑÕ…±•Àõ‘•À˜™‘•±…åA…¥È¹‘•ÀøÀı…‘‘5¥¹Q½±½¬¡‘•À±‘•±…åA…¥È¹‘•À¤èœœì(€€€½¹ÍĞÑ¥µ••±°ô¡Í¡•‘Õ±•±…ÑÕ…°¤ôùÍ¡•‘Õ±•(€€€€€€ı€ñÍÁ…¸ø‘í•ÍŒ¡Í¡•‘Õ±•¥ôğ½ÍÁ…¸ø‘í…ÑÕ…°ı€ñÍµ…±°ø ‘í•ÍŒ¡…ÑÕ…°¥ô¤ğ½Íµ…±°ù€èœõ€(€€€€€€èŸŠPœì(€€€½¹ÍĞ±¥Ù•5…É­•Èõ¤ôôõ±¥Ù•5…É­•É%‘àı€ñÍÁ…¸±…ÍÌô‰‰Éµ±¥Ù”µµ…É­•È‘í±¥Ù•	•Ñİ••¸üœ‰•Ñİ••¸œèœôˆÍÑå±”ôˆ´µ‰Éµ±¥Ù”µÑ½Àè‘í±¥Ù•Q½Áô”ˆÑ¥Ñ±”ôˆ‘í•ÍŒ¡±¥Ù•1…‰•°¥ôˆ…É¥„µ±…‰•°ô‹¶b²z°ƒ²r²æ`è€‘í•ÍŒ¡±¥Ù•1…‰•°¥ôˆøñÍÙœÙ¥•İ	½àôˆÀ€À€ÈĞ€ÈĞˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñÉ•ĞàôˆÔˆäôˆÌˆİ¥‘Ñ ôˆÄĞˆ¡•¥¡ĞôˆÄÜˆÉàôˆĞˆ¼øñÁ…Ñ ô‰4à€İ áØÕ áé4à€Äİ ¸ÀÅ4ÄØ€Äİ ¸ÀÅ4à€ÈÅ°´È€É4ÄØ€ÈÅ°È€Èˆ¼øğ½ÍÙœøğ½ÍÁ…¸ù€èœœì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‰ÉµÍÑ½À‘í¥¹I¥‘”üœÉ¥‘”œèœô‘í‰•™½É”üœ‰•™½É”œèœô‘í…™Ñ•Èüœ…™Ñ•Èœèœô‘í¤ôôõ™É½µ%‘àüœ‰½…Éœèœô‘í¤ôôõÑ½%‘àüœ…±¥¡Ğœèœô‘í¤ôôõ±¥Ù•MÑ½Á%‘àüœ±¥Ù”œèœô‘í¤ôôõ±¥Ù•5…É­•É%‘àüœ±¥Ù”µµ…É­•ÈµÉ½Üœèœôˆ‘…Ñ„µÍÑ…Ñ¥½¸ôˆ‘í•ÍŒ¡Ì¹Ì¥ôˆ‘…Ñ„µ‘•±…äµ¥¹‘•àôˆ‘í‘•±…å%‘áôˆ‘…Ñ„µ…ÉÈôˆ‘í•ÍŒ¡…ÉÈ¥ôˆ‘…Ñ„µ‘•Àôˆ‘í•ÍŒ¡‘•À¥ôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÉ…¥°ˆøñ¤øğ½¤ø‘í±¥Ù•5…É­•Éôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÍÑ…Ñ¥½¸ˆø‘í‰…‘•ôñÍÑÉ½¹œø‘í•ÍŒ¡Ì¹Ì¥ôğ½ÍÑÉ½¹œø‘íÁ±…Ğ„õ¹Õ±°ı€ñÍÁ…¸ø‘í•ÍŒ¡Á±…Ğ¥÷®Ê ƒ²*çªÂW²z”ğ½ÍÁ…¸ù€èœôğ½‘¥Øø(€€€€€€ñÑ¥µ”±…ÍÌô‰‰Éµ…ÉÈˆø‘íÑ¥µ••±°¡…ÉÈ±…ÑÕ…±ÉÈ¥ôğ½Ñ¥µ”øñÑ¥µ”±…ÍÌô‰‰Éµ‘•Àˆø‘íÑ¥µ••±°¡‘•À±…ÑÕ…±•À¥ôğ½Ñ¥µ”ø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞÉ½ÕÑ•5…Àõ}‰½½­I½ÕÑ•5…Á!Q50¡Ğ±™É½´±Ñ¼±É…‘•½±½È±ÑÉ…Ù•±…Ñ”¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤íİÉ…À¹¥ô‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…ÀœíİÉ…À¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ‰ÉµÉ…‘”œ±É…‘•½±½È¤ì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µ‰…­‘É½Àˆøğ½‘¥ØøñÍ•Ñ¥½¸±…ÍÌô‰‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µÍ¡••ĞˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆ…É¥„µ±…‰•°ôˆ‘í•ÍŒ¡Ğ¹É…‘”¥ô€‘í•ÍŒ¡Ğ¹¹¼¥ôƒ²jÓ¶Z$ƒ²‚W®ÎĞˆø(€€€€ñ¡•…‘•È±…ÍÌô‰‰Éµ¡•…‘•Èˆøñ‘¥Ø±…ÍÌô‰‰Éµ¡•…µ¥¹™¼ˆøñÍµ…±°û²jÓ¶Z$ƒ²‚W®ÎĞğ½Íµ…±°øñ ÈøñÍÁ…¸ø‘í•ÍŒ¡Ğ¹É…‘”¥ôğ½ÍÁ…¸øñˆø‘í•ÍŒ¡Ğ¹¹¼¥ôğ½ˆøğ½ Èøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰‰Éµ¡•…µ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰‰Éµ±½Í”ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½¡•…‘•Èø(€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÍÕµµ…ÉäˆøñÑ¥µ”ø‘í‘…Ñ•1…‰•±ôğ½Ñ¥µ”øñÍÑÉ½¹œø‘í•ÍŒ¡™É½´¥ô€ñÍÁ…¸ø‘í•ÍŒ¡…±±MÑ½ÁÍm™É½µ%‘át¹‘•Áññ…±±MÑ½ÁÍm™É½µ%‘át¹…ÉÉñğŸŠPœ¥ôğ½ÍÁ…¸øñ¤ûŠHğ½¤ø€‘í•ÍŒ¡Ñ¼¥ô€ñÍÁ…¸ø‘í•ÍŒ¡…±±MÑ½ÁÍmÑ½%‘át¹…ÉÉññ…±±MÑ½ÁÍmÑ½%‘át¹‘•ÁñğŸŠPœ¥ôğ½ÍÁ…¸øğ½ÍÑÉ½¹œøñÍµ…±°±…ÍÌô‰‰Éµ½Á•É…Ñ¥½¸µÍÑ…Ñ”ˆøñˆø‘í•ÍŒ¡½Á•É…Ñ¥½¹5…¥¸¥ôğ½ˆø‘í½Á•É…Ñ¥½¹MÕˆı€ñÍÁ…¸ø‘í•ÍŒ¡½Á•É…Ñ¥½¹MÕˆ¥ôğ½ÍÁ…¸ù€èœôğ½Íµ…±°øğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÙ¥•ÜµÑ…‰ÌˆÉ½±”ô‰Ñ…‰±¥ÍĞˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰‰ÉµÙ¥•ÜµÑ…ˆ…Ñ¥Ù”ˆ‘…Ñ„µÙ¥•Üô‰Í¡•‘Õ±”ˆÉ½±”ô‰Ñ…ˆˆ…É¥„µÍ•±•Ñ•ô‰ÑÉÕ”ˆ½¹±¥¬ô‰Í•Ñ	½½­I½ÕÑ••Ñ…¥±Q…ˆ Í¡•‘Õ±”œ¤ˆû².sªÂ¶Fpğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰‰ÉµÙ¥•ÜµÑ…ˆˆ‘…Ñ„µÙ¥•Üô‰µ…ÀˆÉ½±”ô‰Ñ…ˆˆ…É¥„µÍ•±•Ñ•ô‰™…±Í”ˆ½¹±¥¬ô‰Í•Ñ	½½­I½ÕÑ••Ñ…¥±Q…ˆ µ…Àœ¤ˆû²®>ğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÙ¥•Ü‰ÉµÍ¡•‘Õ±”µÙ¥•Ü…Ñ¥Ù”ˆøñ‘¥Ø±…ÍÌô‰‰Éµ½±Õµ¹ÌˆøñÍÁ…¸û²^·®ªğ½ÍÁ…¸øñÍÁ…¸û®>²Â¤ğ½ÍÁ…¸øñÍÁ…¸û²Ús®Âpğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰‰ÉµÍÑ½Àµ±¥ÍĞˆø‘íÉ½İÍôğ½‘¥Øøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰ÉµÙ¥•Ü‰Éµµ…ÀµÙ¥•Üˆø‘íÉ½ÕÑ•5…Áôğ½‘¥Øø(€€ğ½Í•Ñ¥½¸ù€ì(€İÉ…À¹‘…Ñ…Í•Ğ¹ÑÉ…¥¸õMÑÉ¥¹œ¡ÑÉ…¥¹9¼¤íİÉ…À¹‘…Ñ…Í•Ğ¹™É½´õ™É½´íİÉ…À¹‘…Ñ…Í•Ğ¹Ñ¼õÑ¼íİÉ…À¹‘…Ñ…Í•Ğ¹‘…Ñ”õÑÉ…Ù•±…Ñ•ññÑ½‘…å1½…±MÑÈ ¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ …ÁÀµµ½‘…°µ½Á•¸œ¤ì(€½¹ÍĞ½Á•¹•‘ĞõÁ•É™½Éµ…¹”¹¹½Ü ¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µ‰…­‘É½Àœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùì(€€€¥˜¡”¹Ñ…É•Ğôôõ”¹ÕÉÉ•¹ÑQ…É•Ğ˜™Á•É™½Éµ…¹”¹¹½Ü ¤µ½Á•¹•‘ĞøĞÀÀ¥±½Í•	½½­I½ÕÑ••Ñ…¥° ¤ì(€ô¤ì(€…‘‘5½‰¥±•Q…À¡İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰Éµ±½Í”œ¤±±½Í•	½½­I½ÕÑ••Ñ…¥°¤ì(€É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”  ¤ôùİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µÍ¡••Ğœ¤ü¹±…ÍÍ1¥ÍĞ¹…‘ ½Á•¸œ¤¤ì(€É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”  ¤ôùİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰ÉµÍÑ½À¹‰½…Éœ¤ü¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è•¹Ñ•Èô¤¤ì(€É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”  ¤ôùÕÁ‘…Ñ•	½½­I½ÕÑ•1¥Ù”¡ÑÉ…¥¹9¼±™É½´±Ñ¼±ÑÉ…Ù•±…Ñ”¤¤ì(€}Í¡•‘Õ±•	½½­I½ÕÑ••Ñ…¥±Q¥¬ ¤ì)ô)™Õ¹Ñ¥½¸±½Í•	½½­I½ÕÑ••Ñ…¥° ¥ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µİÉ…Àœ¤í¥˜ …İÉ…À¥É•ÑÕÉ¸ì(€¥˜¡}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•È¥í±•…ÉQ¥µ•½ÕĞ¡}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•È¤í}‰½½­I½ÕÑ••Ñ…¥±Q¥µ•Èõ¹Õ±°íô(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µÉ½ÕÑ”µ‘•Ñ…¥°µÍ¡••Ğœ¤ü¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ½Á•¸œ¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” …ÁÀµµ½‘…°µ½Á•¸œ¤íÍ•ÑQ¥µ•½ÕĞ  ¤ôùİÉ…À¹É•µ½Ù” ¤°ÈÈÀ¤ì)ô(((¼¼ƒŠRŠR ƒ²^Ó²Â ƒ²b#®ƒ¶´ƒ¶fc²*äƒ¶C²$ƒŠRŠR )™Õ¹Ñ¥½¸Í•…É¡	½½­QÉ…¹Í™•ÉÌ¡™É½´°Ñ¼°‘…Ñ•¼°•°°…ÁÁ•¹¥ì(€½¹ÍĞ5%9}]%PôÌ°5a}]%PôØÀì(€½¹ÍĞ¹½İ½É¥±Ñ•Èõ¹•Ü…Ñ” ¤ì(€½¹ÍĞ¹½İ5¥±Ñ•Èõ¹½İ½É¥±Ñ•È¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İ½É¥±Ñ•È¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ¥ÍQ½‘…äô¡‘…Ñ•¼ôôõÑ½‘…å1½…±MÑÈ ¤¤ì((€™Õ¹Ñ¥½¸•ÑMÑ½ÁP¡Ì¥ìÉ•ÑÕÉ¸¡…ÍQ¥µ”¡Ì¹‘•À¤ıÌ¹‘•Àé¡…ÍQ¥µ”¡Ì¹…ÉÈ¤ıÌ¹…ÉÈé¹Õ±°ìô((€€¼¼™É½·²^C²pƒ²Ús®Âs¶Vc®*Pƒ®ª£®N€ƒ®‚#ªŞà(€½¹ÍĞ±•ÌÄõmtì(€11}QI%9L¹™½É… ¡Ğôùì(€€€½¹ÍĞÍÑ½ÁÌõĞ¹ÍÑ½ÁÌì(€€€½¹ÍĞ™¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ™É½´¤ì(€€€¥˜¡™¤ğÁññ¥ÍA…ÍÍMÑ½À¡Ğ±™É½´¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞ‘•ÁPõ•ÑMÑ½ÁP¡ÍÑ½ÁÍm™¥t¤ì(€€€¥˜ …‘•ÁP¥É•ÑÕÉ¸ì(€€€½¹ÍĞ‘•Á4õÑ½5¥¸¡‘•ÁP¤ì(€€€¥˜¡¥ÍQ½‘…ä˜™‘•Á4„ôõ¹Õ±°˜™‘•Á4ñ¹½İ5¥±Ñ•È¥É•ÑÕÉ¸ì(€€€™½È¡±•Ğ¤õ™¤¬Äí¤ñÍÑ½ÁÌ¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞÌõÍÑ½ÁÍm¥tì(€€€€€¥˜ …Ì¹…ÉÈ˜˜…Ì¹‘•À¥½¹Ñ¥¹Õ”ì(€€€€€¥˜¡¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ…ÉÉPõ¡…ÍQ¥µ”¡Ì¹…ÉÈ¤ıÌ¹…ÉÈé¡…ÍQ¥µ”¡Ì¹‘•À¤ıÌ¹‘•Àé¹Õ±°ì(€€€€€¥˜ ……ÉÉP¥½¹Ñ¥¹Õ”ì(€€€€€±•ÌÄ¹ÁÕÍ ¡íĞ±‘•ÁMÑ¸é™É½´±‘•ÁP±‘•Á4±…ÉÉMÑ¸éÌ¹Ì±…ÉÉP±…ÉÉ4éÑ½5¥¸¡…ÉÉP¥ô¤ì(€€€ô(€ô¤ì((€±•ĞÑÉ…¹Í™•ÉÌõmtì(€±•ÌÄ¹™½É… ¡°Äôùì(€€€¥˜¡°Ä¹…ÉÉMÑ¸ôôõÑ¼¥É•ÑÕÉ¸ì(€€€11}QI%9L¹™½É… ¡ĞÈôùì(€€€€€¥˜¡ĞÈôôõ°Ä¹Ğ¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÍÑ½ÁÌõĞÈ¹ÍÑ½ÁÌì(€€€€€½¹ÍĞá¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ°Ä¹…ÉÉMÑ¸¤ì(€€€€€½¹ÍĞÑ¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹ÌôôõÑ¼¤ì(€€€€€¥˜¡á¤ğÁññÑ¤ğÁññá¤øõÑ¤¥É•ÑÕÉ¸ì(€€€€€¥˜¡¥ÍA…ÍÍMÑ½À¡ĞÈ±°Ä¹…ÉÉMÑ¸¥ññ¥ÍA…ÍÍMÑ½À¡ĞÈ±Ñ¼¤¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ‘•ÀÉPõ•ÑMÑ½ÁP¡ÍÑ½ÁÍmá¥t¤ì(€€€€€¥˜ …‘•ÀÉP¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ‘•ÀÉ4õÑ½5¥¸¡‘•ÀÉP¤ì(€€€€€½¹ÍĞİ…¥Ğõ‘•ÀÉ4µ°Ä¹…ÉÉ4ì(€€€€€¥˜¡İ…¥Ğñ5%9}]%Qññİ…¥Ğù5a}]%P¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ…ÉÈÉPõ¡…ÍQ¥µ”¡ÍÑ½ÁÍmÑ¥t¹…ÉÈ¤ıÍÑ½ÁÍmÑ¥t¹…ÉÈé¡…ÍQ¥µ”¡ÍÑ½ÁÍmÑ¥t¹‘•À¤ıÍÑ½ÁÍmÑ¥t¹‘•Àé¹Õ±°ì(€€€€€¥˜ ……ÉÈÉP¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÑ½Ñ…±4õÑ½5¥¸¡…ÉÈÉP¤µ°Ä¹‘•Á4ì(€€€€€¥˜¡Ñ½Ñ…±4ğôÀ¥É•ÑÕÉ¸ì(€€€€€ÑÉ…¹Í™•ÉÌ¹ÁÕÍ ¡ì(€€€€€€€±•ÌémíĞé°Ä¹Ğ±™É½´±Ñ¼é°Ä¹…ÉÉMÑ¸±‘•ÁPé°Ä¹‘•ÁP±…ÉÉPé°Ä¹…ÉÉQô°(€€€€€€€€€€€€€íĞéĞÈ±™É½´é°Ä¹…ÉÉMÑ¸±Ñ¼±‘•ÁPé‘•ÀÉP±…ÉÉPé…ÉÈÉQõt°(€€€€€€€Ñ½Ñ…±ÕÈé‘ÕÉMÑÈ¡°Ä¹‘•ÁP±…ÉÈÉP¤°Ñ½Ñ…±4°(€€€€€€€‘•Á4é°Ä¹‘•Á4°…ÉÉ4éÑ½5¥¸¡…ÉÈÉP¥ñğääää(€€€€€ô¤ì(€€€ô¤ì(€ô¤ì((€€¼¼ƒ²’G®ÎÔƒ²‚sªÆÀ€˜ƒ²‚W®‚°€˜ƒ²Ös®2 €×ªÆĞ(€½¹ÍĞÍ••¸õ¹•ÜM•Ğ ¤ì(€ÑÉ…¹Í™•ÉÌõÑÉ…¹Í™•ÉÌ¹™¥±Ñ•È¡Èôùì(€€€½¹ÍĞ­•äõÈ¹±•Ì¹µ…À¡°ôù°¹Ğ¹¹¼­°¹‘•ÁP¤¹©½¥¸ ğœ¤ì(€€€¥˜¡Í••¸¹¡…Ì¡­•ä¤¥É•ÑÕÉ¸™…±Í”ìÍ••¸¹…‘¡­•ä¤ìÉ•ÑÕÉ¸ÑÉÕ”ì(€ô¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹Ñ½Ñ…±4µˆ¹Ñ½Ñ…±4¤¹Í±¥” À°Ô¤ì((€¥˜ …ÑÉ…¹Í™•ÉÌ¹±•¹Ñ ¥ì(€€€•°¹¥¹¹•É!Q50õ…ÁÁ•¹üœœé€ñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~j¬ğ½‘¥ØøñÀø‘í™É½µôƒŠH€‘íÑ½ôƒ²jÓ¶Z$ƒªÂ®*—¶VpƒªÊ÷®†sªÂ ƒ²^²*×®.#®.ğ½Àøğ½‘¥Øù€ì(€€€É•ÑÕÉ¸ì(€ô((€½¹ÍĞ…É‘ÌõÑÉ…¹Í™•ÉÌ¹µ…À ¡í±•Ì±Ñ½Ñ…±ÕÉô¤ôùì(€€€½¹ÍĞ±•Í!Ñµ°õ±•Ì¹µ…À ¡°±¤¤ôù€(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µá™•Èµ±•œˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÙÁàíµ…É¥¸µ‰½ÑÑ½´èÑÁàˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰á™•ÈµÉ½±”µÑ…œ€‘í¤ôôôÀü±•…œè™½±±½Üôˆø‘í¤ôôôÀüŸ²ƒ¶Z$œèŸ¶n¶Z$ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡°¹Ğ¹É…‘”¥ô¤ˆø‘í°¹Ğ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤ˆø‘í°¹Ğ¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàˆø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í°¹™É½µôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µ…•¹Ğ¤ˆø‘í°¹‘•ÁQôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆûŠHğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í°¹Ñ½ôğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÉ••¸¤ˆø‘í°¹…ÉÉQñğœ´ôğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€‘í¤ñ±•Ì¹±•¹Ñ ´Äı€ñ‘¥Ø±…ÍÌô‰‰½½¬µá™•Èµİ…¥ĞˆûÂ~Rƒ¶fc²*äƒ
Üƒ®2ªâÀ€‘íÑ½5¥¸¡±•Ím¤¬Åt¹‘•ÁP¤µÑ½5¥¸¡°¹…ÉÉP¥÷®Úğ½‘¥Øù€èœõ€(€€€€¤¹©½¥¸ œœ¤ì(€€€½¹ÍĞ™¥ÉÍÑ1•œõ±•ÍlÁt°±…ÍÑ1•œõ±•Ím±•Ì¹±•¹Ñ ´Åtì(€€€€¼¼¥¹±¥¹”½¹±¥¬ƒ²‚sªÆÀƒŠH‘…Ñ„ƒ²7²Äƒ²‚²z”ƒ¶n…‘‘Ù•¹Ñ1¥ÍÑ•¹•È€¡¥=LM…™…É¤ƒ¶bã¶f`¤(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µÉ½Ü‰½½¬µá™•Èµ…Éˆ(€€€€€‘…Ñ„µÑÉ…¥¸µ¹¼ôˆ‘í™¥ÉÍÑ1•œ¹Ğ¹¹½ôˆ‘…Ñ„µ‘•Àôˆ‘í™¥ÉÍÑ1•œ¹‘•ÁQôˆ‘…Ñ„µ…ÉÈôˆ‘í™¥ÉÍÑ1•œ¹…ÉÉQñğœôˆ(€€€€€‘…Ñ„µ™É½´ôˆ‘í™¥ÉÍÑ1•œ¹™É½µôˆ‘…Ñ„µÑ¼ôˆ‘í™¥ÉÍÑ1•œ¹Ñ½ôˆ‘…Ñ„µ‘…Ñ”ôˆ‘í‘…Ñ•½ôˆ(€€€€€‘…Ñ„µ¹¼Èôˆ‘í±…ÍÑ1•œ¹Ğ¹¹½ôˆ‘…Ñ„µáÍÑ¸ôˆ‘í™¥ÉÍÑ1•œ¹Ñ½ôˆ‘…Ñ„µ‘•ÀÈôˆ‘í±…ÍÑ1•œ¹‘•ÁQôˆ‘…Ñ„µ…ÉÈÈôˆ‘í±…ÍÑ1•œ¹…ÉÉQñğœôˆ‘…Ñ„µ™¥¹…°ôˆ‘í±…ÍÑ1•œ¹Ñ½ôˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àèÄˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàíµ…É¥¸µ‰½ÑÑ½´èáÁàˆø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèØÀÀíÁ…‘‘¥¹œèÉÁà€áÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰…­É½Õ¹éÉ‰„ ÈÄÀ°ÄÔÌ°ÌĞ°¸ÄÔ¤í½±½ÈèÈääÈÈí‰½É‘•ÈèÅÁàÍ½±¥É‰„ ÈÄÀ°ÄÔÌ°ÌĞ°¸Ì¤ˆøÇ¶j0ƒ¶fc²*äğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤ˆø‘í™¥ÉÍÑ1•œ¹‘•ÁQôƒŠH€‘í±…ÍÑ1•œ¹…ÉÉQñğœüôƒ
Ü€‘íÑ½Ñ…±ÕÉôğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€‘í±•Í!Ñµ±ô(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàí™±•àµÍ¡É¥¹¬èÀˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µ¡•ÙÉ½¸ˆûŠèğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì((€½¹ÍĞÑÉ¥Á1…‰•°õ‘…Ñ•¼ì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰É•ÍÕ±Ğµ¡•…‘•ÈˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÙÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰É•ÍÕ±ĞµÑ¥Ñ±”ˆø‘í…ÁÁ•¹üŸÂ~Rƒ¶fc²*äƒªÊ÷®†pœé€‘í™É½µôƒŠH€‘íÑ½ôƒ
Üƒ¶fc²*åôğ½‘¥Øø(€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”‰±Õ”ˆø‘íÑÉ…¹Í™•ÉÌ¹±•¹Ñ¡÷ªÆĞğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”ˆÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤ˆø‘íÑÉ¥Á1…‰•±ôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µÑÉ…¥¸µ±¥ÍĞˆø‘í…É‘Íôğ½‘¥Øù€ì((€€¼¼ƒ¶fc²*äƒ²æÓ®Npƒ¶Ó®š´ƒŠHƒ®F@ƒªÖ³ªÂƒ²b#®ƒ²²à¡½Á•¹	½½­a™•É•Ñ…¥°¤(€½¹ÍĞ½Á•¹a™•ÈõÉ½Üôù½Á•¹	½½­a™•É•Ñ…¥° (€€€É½Ü¹‘…Ñ…Í•Ğ¹ÑÉ…¥¹9¼°É½Ü¹‘…Ñ…Í•Ğ¹¹¼È°(€€€É½Ü¹‘…Ñ…Í•Ğ¹™É½´°É½Ü¹‘…Ñ…Í•Ğ¹áÍÑ¸°É½Ü¹‘…Ñ…Í•Ğ¹™¥¹…°°(€€€É½Ü¹‘…Ñ…Í•Ğ¹‘•Áñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÉñğœœ°(€€€É½Ü¹‘…Ñ…Í•Ğ¹‘•ÀÉñğœœ°É½Ü¹‘…Ñ…Í•Ğ¹…ÉÈÉñğœœ°(€€€É½Ü¹‘…Ñ…Í•Ğ¹‘…Ñ•ññ‘…Ñ•¼¤ì(€•°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½¬µÑÉ…¥¸µÉ½Ü¹‰½½¬µá™•Èµ…Éœ¤¹™½É… ¡É½Üôùì(€€€É½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°€ ¤ôù½Á•¹a™•È¡É½Ü¤¤ì(€ô¤ì)ô()™Õ¹Ñ¥½¸}‰½½­•Ñ…¥±½¹™¥É´¡ÑÉ…¥¹9¼±™É½´±Ñ¼±‘•ÁP±…ÉÉP±ÑÉ…Ù•±…Ñ”¥ì(€¥˜¡İ¥¹‘½Ü¹}…Ñ¥Ù•A…ÍÍ%¥ì(€€€½Á•¹A…ÍÍ…åM•±•Ñ½È¡İ¥¹‘½Ü¹}…Ñ¥Ù•A…ÍÍ%±ÑÉ…¥¹9¼±™É½´±Ñ¼±‘•ÁP±…ÉÉQñğœœ¤ì(€ô•±Í”ì(€€€İ¥¹‘½Ü¹}‰½½­¥¹A…ÍÍ•¹•É½Õ¹Ğõ}‰½½­A…ÍÍ•¹•É½Õ¹ÑñğÄì(€€€½¹ÍĞ‘…Ñ•	…¬õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘…Ñ”µ‰…¬œ¤ü¹Ù…±Õ•ñğœœì(€€€½Á•¹	½½­¥¹]¥Ñ¡…Ñ”¡ÑÉ…¥¹9¼±™É½´±Ñ¼±‘•ÁP±…ÉÉQñğœœ±ÑÉ…Ù•±…Ñ”±}‰½½­I½Õ¹‘QÉ¥À±‘…Ñ•	…¬¤ì(€ô)ô()™Õ¹Ñ¥½¸±½Í•	½½­QÉ…¥¹•Ñ…¥° ¥ì(€½¹ÍĞ•°€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘•Ñ…¥°µİÉ…Àœ¤ì(€¥˜ …•°¤É•ÑÕÉ¸ì(€•°¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µ‘•Ñ…¥°µÁ…¹•°œ¤¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ½Á•¸œ¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôù•°¹É•µ½Ù” ¤°€ÌÀÀ¤ì)ô((¼¼ƒÂ~Rƒ¶×¶V¤ƒ¶fc²*äƒ²b#®ƒ².s¶*à€£²öS®‚#²vó¶„ƒ®Â§².t¤ƒŠPƒ²ƒ¶Z'
ß¶n¶Z$ƒ®F@ƒªÖ³ªÂ²vƒ¶Vpƒ².s¶*ã²^C²p(¼¼€€€ƒªÂªÂƒ²Š3²tƒ®NÇªâ'
ß²Š3²w
ß²jÓ²z²vƒªÎƒ®–ÓªÎ€°ƒ¶Vc®
c²v`ƒ²b#®ƒ®Ê¶*ó²ró®†pƒ¶V£ªî`ƒ²b#®“¶Vs®.¸)™Õ¹Ñ¥½¸½Á•¹	½½­a™•É•Ñ…¥°¡¹¼Ä±¹¼È±™É½´±áMÑ¸±Ñ¼±‘•ÁPÄ±…ÉÉPÄ±‘•ÁPÈ±…ÉÉPÈ±ÑÉ…Ù•±…Ñ”¥ì(€½¹ÍĞĞÄõ•ÑQÉ…¥¹	å9¼¡¹¼Ä¤±ĞÈõ•ÑQÉ…¥¹	å9¼¡¹¼È¤ì(€¥˜ …ĞÅñğ…ĞÈ¥É•ÑÕÉ¸ì(€½¹ÍĞÑ½1½…°õôù€‘í¹•ÑÕ±±e•…È ¥ô´‘íMÑÉ¥¹œ¡¹•Ñ5½¹Ñ  ¤¬Ä¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ô´‘íMÑÉ¥¹œ¡¹•Ñ…Ñ” ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€½¹ÍĞÑ½‘…äõ¹•Ü…Ñ” ¤ì½¹ÍĞµ¥¹…Ñ”õÑ½1½…°¡Ñ½‘…ä¤ì(€½¹ÍĞµ…áõ¹•Ü…Ñ”¡Ñ½‘…ä¤íµ…á¹Í•Ñ5½¹Ñ ¡µ…á¹•Ñ5½¹Ñ  ¤¬Ä¤ì½¹ÍĞµ…á…Ñ”õÑ½1½…°¡µ…á¤ì(€İ¥¹‘½Ü¹}á™•Èõì(€€€‘…Ñ”è¡ÑÉ…Ù•±…Ñ”˜™ÑÉ…Ù•±…Ñ”øõµ¥¹…Ñ”¤ıÑÉ…Ù•±…Ñ”éµ¥¹…Ñ”°µ¥¹…Ñ”°µ…á…Ñ”°(€€€½Õ¹Ğè¡ÑåÁ•½˜}‰½½­A…ÍÍ•¹•É½Õ¹Ğ„ôôÕ¹‘•™¥¹•œ˜™}‰½½­A…ÍÍ•¹•É½Õ¹Ğ¥ñğÄ°‘¥Í½Õ¹Ğè¹½¹”œ°(€€€™É½´°Ñ¼°Ù¥„éáMÑ¸°(€€€±•Ìél(€€€€€íÉ½±”èŸ²ƒ¶Z$œ±¹¼é¹¼Ä±É…‘”éĞÄ¹É…‘”±™É½´±Ñ¼éáMÑ¸±‘•ÁPé‘•ÁPÄ±…ÉÉPé…ÉÉPÄ±±Ìé¹Õ±°±Í•…ÑÌé¹Õ±±ô°(€€€€€íÉ½±”èŸ¶n¶Z$œ±¹¼é¹¼È±É…‘”éĞÈ¹É…‘”±™É½´éáMÑ¸±Ñ¼±‘•ÁPé‘•ÁPÈ±…ÉÉPé…ÉÉPÈ±±Ìé¹Õ±°±Í•…ÑÌé¹Õ±±ô°(€€€t(€ôì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘•Ñ…¥°µİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥ô‰½½¬µ‘•Ñ…¥°µİÉ…Àœì(€İÉ…À¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ‰…­‘É½Àˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µÁ…¹•°ˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àµÍ¡É¥¹¬èÀíÁ…‘‘¥¹œèÄÉÁà€ÈÁÁà€Àˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ¡…¹‘±”ˆøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½¬µ‘•Ñ…¥°µ¡•…ˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÑÁàí™½¹Ğµİ•¥¡ĞèØÀÀˆûÂ~Rƒ¶fc²*äƒ²b#®ƒ
Ü€‘í™É½µôƒŠH€‘íáMÑ¹ôƒŠH€‘íÑ½ôğ½‘¥Øø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µäµÁ…¹•°µ±½Í”ˆ¥ô‰‰áµ±½Í”µàˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø¥ô‰‰áµ‰½‘äˆÍÑå±”ô‰½Ù•É™±½Üµäé…ÕÑ¼í™±•àèÄíµ¥¸µ¡•¥¡ĞèÀìµİ•‰­¥Ğµ½Ù•É™±½ÜµÍÉ½±±¥¹œéÑ½Õ íÁ…‘‘¥¹œèÀ€ÈÁÁàˆøğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àµÍ¡É¥¹¬èÀíÁ…‘‘¥¹œèÄÁÁà€ÈÁÁà€ÈáÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰‰áµ½¹™¥É´ˆ‘¥Í…‰±•ÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí½Á…¥Ñäè¸Ôˆû®F@ƒªÖ³ªÂ²v`ƒ²Š3²tƒ®NÇªâ'²vƒ²ƒ¶w¶Vc²ã²jPğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰‰áµ…¹•°ˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèáÁàˆû²Ş£²0ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µ‘•Ñ…¥°µ‰…­‘É½Àœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°±½Í•	½½­QÉ…¥¹•Ñ…¥°¤ì(€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰áµ±½Í”µàœ¤°±½Í•	½½­QÉ…¥¹•Ñ…¥°¤ì(€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰áµ…¹•°œ¤°±½Í•	½½­QÉ…¥¹•Ñ…¥°¤ì(€…‘‘5½‰¥±•Q…À¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰áµ½¹™¥É´œ¤°½¹™¥Éµa™•É	½½­¥¹œ¤ì(€}É•¹‘•Éa™•É	½‘ä ¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôùİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹‰½½¬µ‘•Ñ…¥°µÁ…¹•°œ¤¹±…ÍÍ1¥ÍĞ¹…‘ ½Á•¸œ¤°ÄÀ¤ì)ô)™Õ¹Ñ¥½¸}É•¹‘•Éa™•É	½‘ä ¥ì(€½¹ÍĞ`õİ¥¹‘½Ü¹}á™•Èì½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰áµ‰½‘äœ¤ì¥˜ …añğ…‰½‘ä¥É•ÑÕÉ¸ì(€½¹ÍĞ±•!Ñµ°õ`¹±•Ì¹µ…À ¡0±¥‘à¤ôùì(€€€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡0¹¹¼¤ì(€€€½¹ÍĞ±…ÍÍ•Ìõ…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡0¹É…‘”¤ì(€€€½¹ÍĞ‘ÕÈõ‘ÕÉ5¥¸¡0¹‘•ÁP±0¹…ÉÉP¤ì(€€€½¹ÍĞ½ÁÑÌõ±…ÍÍ•Ì¹µ…À¡Œôùì(€€€€€½¹ÍĞ™…É”õ…ÁÁ±å¥Í½Õ¹Ğ¡…±…É”¡Ğ±0¹™É½´±0¹Ñ¼±Œ¤±`¹‘¥Í½Õ¹Ğ¤ì(€€€€€½¹ÍĞÍ…±”õÍ•…Ñ±…ÍÍM…±•5•Ñ„¡Ğ±0¹™É½´±0¹Ñ¼±`¹‘…Ñ”±Œ¤±‘¥Í…‰±•ô…Í…±”¹•±¥¥‰±•ññÍ…±”¹…Ù…¥±…‰±”ğôÀì(€€€€€É•ÑÕÉ¸€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¸‘í0¹±ÌôôõŒüœ…Ñ¥Ù”œèœôˆ‘…Ñ„µ±•œôˆ‘í¥‘áôˆ‘…Ñ„µ±…ÍÌôˆ‘íôˆ€‘í‘¥Í…‰±•ü‘¥Í…‰±•œèœô(€€€€€€€ÍÑå±”ôˆ‘í‘¥Í…‰±•ü½Á…¥Ñäè¸ĞÔíÕÉÍ½Èé¹½Ğµ…±±½İ•œèœôˆÑ¥Ñ±”ôˆ‘íÍ…±”¹É•…Í½¹ñğœôˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ±…‰•°ˆø‘íÍ…±”¹±…‰•±ô‘íÍ…±”¹É•…Í½¸ı€‘íÍ…±”¹É•…Í½¸¹ÍÑ…ÉÑÍ]¥Ñ  œ œ¤üœ€œèœƒ
Ü€ô‘íÍ…±”¹É•…Í½¹õ€èœôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ™…É”ˆø‘í™…É”¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ù€ì(€€€ô¤¹©½¥¸ œœ¤ì(€€€½¹ÍĞÍ•…ÑI½Ü€ô0¹±ÌôôôÍÑ…¹‘¥¹œœ(€€€€€€ü€ñ‘¥Ø±…ÍÌô‰¡¥¹ĞˆÍÑå±”ô‰µ…É¥¸èáÁà€À€ÀˆûÂ~j$ƒ²z²w
ß²zC²rƒ²tƒ²‚²j¤ƒ²æàƒŠPƒ²Š3²tƒ²²‚Tƒ²^²v0ğ½‘¥Øù€(€€€€€€è€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸á™•ÈµÍ•…Ğµ‰Ñ¸ˆ‘…Ñ„µ±•œôˆ‘í¥‘áôˆ€‘í0¹±Ìüœœè‘¥Í…‰±•ôÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí™½¹ĞµÍ¥é”èÄÈ¸ÕÁàíµ…É¥¸µÑ½ÀèáÁàí…ÀèÙÁàì‘í0¹±Ìüœœè½Á…¥Ñäè¸ĞíÕÉÍ½Èé¹½Ğµ…±±½İ•ôˆûÂ~ªDƒ²Š3²tƒ²ƒ¶tƒŠP€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ…•¹ĞÈ¤ˆø‘í0¹±Ìü ¡0¹Í•…ÑÌ˜™0¹Í•…ÑÌ¹±•¹Ñ ôôõ`¹½Õ¹Ğ¤ı0¹Í•…ÑÌ¹©½¥¸ œ°€œ¤èŸ²zC®>dƒ®ÂÃ²‚Tœ¤èŸ®NÇªâ$ƒ²ƒ¶tƒ¶nƒªÂ®*”ôğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ù€ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰á™•Èµ±•œµ…Éˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰á™•Èµ±•œµ¡•…ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰á™•ÈµÉ½±”µÑ…œ€‘í¥‘àôôôÀü±•…œè™½±±½Üôˆø‘í0¹É½±•ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡0¹É…‘”¥ô¤í™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘í0¹É…‘•ô€‘í0¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰µ…É¥¸µ±•™Ğé…ÕÑ¼í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÈ¸ÕÁàˆø‘í0¹‘•ÁQôƒŠH€‘í0¹…ÉÉQôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰á™•Èµ±•œµÉ½ÕÑ”ˆø‘í0¹™É½µôƒŠH€‘í0¹Ñ½ô‘í‘ÕÈ„õ¹Õ±°ı€ƒ
Ü€‘í™µÑÕÉ-½È¡‘ÕÈ¥õ€èœôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰á™•Èµ±•œµ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰‰Ñ¸ˆ½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤í½Á•¹)½ÕÉ¹•ä œ‘í0¹¹½ôœ¤ˆû².sªÂ¶Fpğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰‰Ñ¸Ñ¥­•Ğµ…Ñ¥½¸µÉ½ÕÑ”ˆ½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤í½Á•¹	½½­I½ÕÑ••Ñ…¥° œ‘í0¹¹½ôœ°œ‘í0¹™É½µôœ°œ‘í0¹Ñ½ôœ°œ‘í`¹‘…Ñ•ôœ¤ˆû²jÓ¶Z$ƒ²‚W®ÎĞğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÙÁàˆû²Š3²tƒ®NÇªâ$ƒ
Üƒ²jÓ²zğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¹Ìˆø‘í½ÁÑÍôğ½‘¥Øø(€€€€€€‘íÍ•…ÑI½İô(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸¡€ñ‘¥Ø±…ÍÌô‰á™•Èµ…ÉÉ½ÜˆûÂ~R€‘í`¹Ù¥…ôƒ¶fc²*äğ½‘¥Øù€¤ì(€½¹ÍĞ±•…É”õ0ôùì¥˜ …0¹±Ì¥É•ÑÕÉ¸¹Õ±°ì½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡0¹¹¼¤ìÉ•ÑÕÉ¸…ÁÁ±å¥Í½Õ¹Ğ¡…±…É”¡Ğ±0¹™É½´±0¹Ñ¼±0¹±Ì¤±`¹‘¥Í½Õ¹Ğ¤ìôì(€½¹ÍĞ‰½Ñ¡±Ìõ`¹±•Ì¹•Ù•Éä¡0ôù0¹±Ì¤ì(€½¹ÍĞÑ½Ñ…°õ‰½Ñ¡±Ìı`¹±•Ì¹É•‘Õ” ¡„±0¤ôù„­±•…É”¡0¤°À¤©`¹½Õ¹ĞèÀì(€‰½‘ä¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµ‘…Ñ”µÍ•Ñ¥½¸ˆøñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆû¶G²*ç²vğğ½‘¥Øø(€€€€€€ñ¥¹ÁÕĞÑåÁ”ô‰‘…Ñ”ˆ¥ô‰‰áµ‘…Ñ”ˆÙ…±Õ”ôˆ‘í`¹‘…Ñ•ôˆµ¥¸ôˆ‘í`¹µ¥¹…Ñ•ôˆµ…àôˆ‘í`¹µ…á…Ñ•ôˆ±…ÍÌô‰‰½½­¥¹œµ‘…Ñ”µ¥¹ÁÕĞˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÁ…ÍÍ•¹•ÈµÍ•Ñ¥½¸ˆÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èáÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆû²vã²n@ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÁ…ÍÍ•¹•Èµ½¹ÑÉ½°ˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰‰áµµ¥¹ÕÌˆûŠ"Hğ½‰ÕÑÑ½¸ø(€€€€€€€€ñÍÁ…¸¥ô‰‰áµ½Õ¹Ğˆø‘í`¹½Õ¹Ñôğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰‰áµÁ±ÕÌˆø¬ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÉÁàˆû¶Vƒ²và€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹Ğµİ•¥¡ĞèĞÀÀˆø£²*ç²Â£ªÚ3²^@ƒ¶Fs².p¤ğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµ‘¥Í½Õ¹Ğµ½ÁÑ¥½¹Ìˆø(€€€€€€€€‘í=‰©•Ğ¹•¹ÑÉ¥•Ì¡%M=U9QL¤¹µ…À ¡m¬±‘t¤ôù€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµ‘¥Í½Õ¹Ğµ½ÁÑ¥½¸‘í`¹‘¥Í½Õ¹Ğôôõ¬üœ…Ñ¥Ù”œèœôˆ‘…Ñ„µ‘¥Í½Õ¹Ğôˆ‘í­ôˆø‘í¹±…‰•±ô‘í¹É…Ñ”ı€ñÍÁ…¸±…ÍÌô‰‰½½­¥¹œµ‘¥Í½Õ¹ĞµÉ…Ñ”ˆø‘í5…Ñ ¹É½Õ¹¡¹É…Ñ”¨ÄÀÀ¥ô—ŠLğ½ÍÁ…¸ù€èœôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€‘í±•!Ñµ±ô(€€€€ñ‘¥Ø±…ÍÌô‰á™•ÈµÑ½Ñ…°ˆøñÍÁ…¸û²Òtƒ²jÓ²z€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹Ğµİ•¥¡ĞèĞÀÀˆû
Ü€‘í`¹½Õ¹Ñ÷®ªğ½ÍÁ…¸øğ½ÍÁ…¸øñˆø‘í‰½Ñ¡±ÌıÑ½Ñ…°¹Ñ½1½…±•MÑÉ¥¹œ ¤¬Ÿ²n@œèŸªÖ³ªÂƒ²ƒ¶tƒ¶V²jPôğ½ˆøğ½‘¥Øù€ì(€½¹ÍĞ‰Ñ¸õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰áµ½¹™¥É´œ¤ì(€¥˜¡‰Ñ¸¥í‰Ñ¸¹‘¥Í…‰±•ô…‰½Ñ¡±Ìí‰Ñ¸¹ÍÑå±”¹½Á…¥Ñäõ‰½Ñ¡±ÌüœÄœèœ¸Ôœí‰Ñ¸¹Ñ•áÑ½¹Ñ•¹Ğõ‰½Ñ¡±ÌüŸÂ~:¬ƒ¶fc²*äƒ²b#®“¶VcªâÀœèŸ®F@ƒªÖ³ªÂ²v`ƒ²Š3²tƒ®NÇªâ'²vƒ²ƒ¶w¶Vc²ã²jPœíô(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ‰áµ‘…Ñ”œ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ¡…¹”œ±”ôùí`¹‘…Ñ”õ”¹Ñ…É•Ğ¹Ù…±Õ”í`¹±•Ì¹™½É… ¡0ôùí0¹±Ìõ¹Õ±°í0¹Í•…ÑÌõ¹Õ±°íô¤í}É•¹‘•Éa™•É	½‘ä ¤íô¤ì(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ‰áµµ¥¹ÕÌœ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí`¹½Õ¹Ğõ5…Ñ ¹µ…à Ä±`¹½Õ¹Ğ´Ä¤í`¹±•Ì¹™½É… ¡0ôù0¹Í•…ÑÌõ¹Õ±°¤í}É•¹‘•Éa™•É	½‘ä ¤íô¤ì(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ‰áµÁ±ÕÌœ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí`¹½Õ¹Ğõ5…Ñ ¹µ¥¸ Ø±`¹½Õ¹Ğ¬Ä¤í`¹±•Ì¹™½É… ¡0ôù0¹Í•…ÑÌõ¹Õ±°¤í}É•¹‘•Éa™•É	½‘ä ¤íô¤ì(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½­¥¹œµ‘¥Í½Õ¹Ğµ½ÁÑ¥½¸œ¤¹™½É… ¡ˆôùˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí`¹‘¥Í½Õ¹Ğõˆ¹‘…Ñ…Í•Ğ¹‘¥Í½Õ¹Ğí}É•¹‘•Éa™•É	½‘ä ¤íô¤¤ì(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¸é¹½Ğ¡m‘¥Í…‰±•‘t¤œ¤¹™½É… ¡ˆôùˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí½¹ÍĞ¤ô­ˆ¹‘…Ñ…Í•Ğ¹±•œí`¹±•Ím¥t¹±Ìõˆ¹‘…Ñ…Í•Ğ¹±…ÍÌí`¹±•Ím¥t¹Í•…ÑÌõ¹Õ±°í}É•¹‘•Éa™•É	½‘ä ¤íô¤¤ì(€‰½‘ä¹ÅÕ•ÉåM•±•Ñ½É±° œ¹á™•ÈµÍ•…Ğµ‰Ñ¸œ¤¹™½É… ¡ˆôùì¥˜ …ˆ¹¡…ÍÑÑÉ¥‰ÕÑ” ‘¥Í…‰±•œ¤¤ˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôù½Á•¹a™•ÉM•…ÑM•±•Ñ½È ­ˆ¹‘…Ñ…Í•Ğ¹±•œ¤¤ìô¤ì)ô)™Õ¹Ñ¥½¸½Á•¹a™•ÉM•…ÑM•±•Ñ½È¡±•%‘à¥ì(€½¹ÍĞ`õİ¥¹‘½Ü¹}á™•Èì¥˜ …`¥É•ÑÕÉ¸ì½¹ÍĞ0õ`¹±•Ím±•%‘átì¥˜ …1ñğ…0¹±Ì¥É•ÑÕÉ¸ì(€¥˜¡0¹±ÌôôôÍÑ…¹‘¥¹œœ¥í…±•ÉĞ Ÿ²z²w
ß²zC²rƒ²w²v ƒ²²‚Tƒ²Š3²w²vĞƒ²^®*Pƒ²‚²j¤ƒ²æã²z®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€İ¥¹‘½Ü¹}‰½½­¥¹A…ÍÍ•¹•É½Õ¹Ğõ`¹½Õ¹ÑñğÄì(€İ¥¹‘½Ü¹}á™•ÉM•…ÑÑàõí±•%‘áôì(€½Á•¹M•…ÑM•±•Ñ½È¡0¹¹¼°`¹‘…Ñ”°0¹±Ì¤ì(€½¹ÍĞÍÜõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í•…ĞµÍ•±•Ñ½ÈµİÉ…Àœ¤ì¥˜¡ÍÜ¥ÍÜ¹ÍÑå±”¹é%¹‘•àôœÄÀÀÀÄœì€¼¼ƒ¶fc²*äƒ².s¶*à ääÀÀ¤ƒ²r®†p)ô(¼¼ƒ²*ç²Â£ªÚ0ƒ²zC®>dƒ²*ç¶Vc²Â ƒ²V3®z0€£²b#®ƒ²f®0ƒ¶n¤ƒŠPƒ²¶Ô¿¶fc²*äƒªÎ×²j¤)™Õ¹Ñ¥½¸}…ÕÑ½	½½­±…ÉµÌ¡Ğ±™É½µMÑ¸±Ñ½MÑ¸±‘•ÁQ¥µ”±…ÉÉQ¥µ”¥ì(€ÑÉåì(€€€¥˜¡ÑåÁ•½˜9½Ñ¥™¥…Ñ¥½¸ôôôÕ¹‘•™¥¹•ññ9½Ñ¥™¥…Ñ¥½¸¹Á•Éµ¥ÍÍ¥½¸„ôôÉ…¹Ñ•œ¥É•ÑÕÉ¸ì(€€€½¹ÍĞ™¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ™É½µMÑ¸¤°Ñ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹ÌôôõÑ½MÑ¸¤ì(€€€¥˜¡™¤øôÀ€˜˜€…¡…Í±…É´¡‰½…Éè‘íĞ¹¹½ôè‘í™É½µMÑ¹õ€¤¥ì(€€€€€½¹ÍĞÁÉ•ØõĞ¹ÍÑ½ÁÌ¹Í±¥” À±™¤¤¹É•Ù•ÉÍ” ¤¹™¥¹¡àôù¡…ÍQ¥µ”¡à¹‘•À¥ññ¡…ÍQ¥µ”¡à¹…ÉÈ¤¤ì(€€€€€Ñ½±•±…ÉµQåÁ” ‰½…Éœ±Ğ¹¹¼±™É½µMÑ¸±‘•ÁQ¥µ”±ÁÉ•Øü¡¡…ÍQ¥µ”¡ÁÉ•Ø¹‘•À¤ıÁÉ•Ø¹‘•ÀéÁÉ•Ø¹…ÉÈ¤é¹Õ±°±ÑÉÕ”¤ì(€€€ô(€€€¥˜¡Ñ¤øôÀ€˜˜€…¡…Í±…É´¡…ÉÈè‘íĞ¹¹½ôè‘íÑ½MÑ¹õ€¤¥ì(€€€€€½¹ÍĞÁÉ•ØÈõĞ¹ÍÑ½ÁÌ¹Í±¥” À±Ñ¤¤¹É•Ù•ÉÍ” ¤¹™¥¹¡àôù¡…ÍQ¥µ”¡à¹‘•À¥ññ¡…ÍQ¥µ”¡à¹…ÉÈ¤¤ì(€€€€€Ñ½±•±…ÉµQåÁ” …ÉÈœ±Ğ¹¹¼±Ñ½MÑ¸±…ÉÉQ¥µ”±ÁÉ•ØÈü¡¡…ÍQ¥µ”¡ÁÉ•ØÈ¹‘•À¤ıÁÉ•ØÈ¹‘•ÀéÁÉ•ØÈ¹…ÉÈ¤é¹Õ±°±ÑÉÕ”¤ì(€€€ô(€õ…Ñ ¡”¥í½¹Í½±”¹İ…É¸ Ÿ¶fc²*äƒ²V3®z0ƒ²“²‚Tƒ².“¶2 èœ±”¤íô)ô)™Õ¹Ñ¥½¸½¹™¥Éµa™•É	½½­¥¹œ ¥ì(€½¹ÍĞ`õİ¥¹‘½Ü¹}á™•Èì¥˜ …`¥É•ÑÕÉ¸ì(€¥˜ …`¹±•Ì¹•Ù•Éä¡0ôù0¹±Ì¤¥í…±•ÉĞ Ÿ®F@ƒªÖ³ªÂƒ®ª£®F@ƒ²Š3²tƒ®NÇªâ'²vƒ²ƒ¶w¶VÓ²ó²ã²jP¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞÑÉ…Ù•±…Ñ”õ`¹‘…Ñ•ññÑ½‘…å1½…±MÑÈ ¤ì(€½¹ÍĞ½Õ¹Ğõ`¹½Õ¹ÑñğÄ°‘¥Í½Õ¹Ğõ`¹‘¥Í½Õ¹Ññğ¹½¹”œì(€™½È¡½¹ÍĞ0½˜`¹±•Ì¥ì(€€€½¹ÍĞ¥¹Ù•¹Ñ½ÉåQÉ…¥¸õ•ÑQÉ…¥¹	å9¼¡0¹¹¼¤ì(€€€¥˜¡ÑåÁ•½˜…¹	½½­=ôôô™Õ¹Ñ¥½¸œ˜˜……¹	½½­=¡¥¹Ù•¹Ñ½ÉåQÉ…¥¸±0¹™É½´±0¹Ñ¼±½Õ¹Ğ±ÑÉ…Ù•±…Ñ”±0¹±Ì¤¥ì(€€€€€½¹ÍĞ±•™ĞõÑåÁ•½˜•ÑÙ…¥±…‰±•M•…ÑÌôôô™Õ¹Ñ¥½¸œı•ÑÙ…¥±…‰±•M•…ÑÌ¡¥¹Ù•¹Ñ½ÉåQÉ…¥¸±0¹™É½´±0¹Ñ¼±ÑÉ…Ù•±…Ñ”±0¹±Ì¤èÀì(€€€€€…±•ÉĞ¡€‘í0¹™É½µôƒŠH€‘í0¹Ñ½ôƒªÖ³ªÂ²v €‘í±•™ĞøÀı€‘í±•™Ñ÷²w®0ƒ®
£²V€èŸ®“²®Bc²ZĞôƒ¶fc²*äƒ²b#®“®–ğƒ²¶Z'¶V€ƒ²"`ƒ²^²*×®.#®.¹€¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€ô(€€¼¼ƒ²b“®*`ƒ²b#®ƒ².pƒ²ƒ¶Z$ƒ²^Ó²Â£ªÂ ƒ²vÓ®¾àƒ²Ús®Âs¶Z#²ró®¦Ğƒ²Â£®. €£²²^Àƒ²^Ó²Â£®*Pƒ²²^Àƒ²Ús®Âpƒ².sªÂªæ3² ƒ¶^#²j¤¤(€¥˜¡ÑÉ…Ù•±…Ñ”ôôõÑ½‘…å1½…±MÑÈ ¤¥ì(€€€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì½¹ÍĞ¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€€€½¹ÍĞ‘•Á4õÑ½5¥¸¡`¹±•ÍlÁt¹‘•ÁP¤ì(€€€±•ĞáôÀì(€€€¥˜¡‘•Á4„ôõ¹Õ±°˜™ÑåÁ•½˜}Í¥µ•±…å=¸„ôôÕ¹‘•™¥¹•œ˜™}Í¥µ•±…å=¸˜™ÑåÁ•½˜}Í¥µ•±…åÑMÑ½Àôôô™Õ¹Ñ¥½¸œ¥ì(€€€€€½¹ÍĞáĞõ•ÑQÉ…¥¹	å9¼¡`¹±•ÍlÁt¹ÑÉ…¥¹9¼¤ì(€€€€€¥˜¡áĞ¥ì½¹ÍĞÑÌõáĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôù¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤ì(€€€€€€€½¹ÍĞ™¤õÑÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ`¹±•ÍlÁt¹™É½´¤ì¥˜¡™¤øôÀ¥áõ}Í¥µ•±…åÑMÑ½À¡áĞ±™¤¥ñğÀìô(€€€ô(€€€¥˜¡‘•Á4„ôõ¹Õ±°˜™‘•Á4­áñ¹½İ4¥í…±•ÉĞ¡ƒ²vÓ®¾àƒ²Ús®Âs¶Vpƒ²^Ó²Â£®*Pƒ²b#®“¶V€ƒ²"`ƒ²^²*×®.#®.¹q¹q¸‘í`¹±•ÍlÁt¹™É½µô€‘í`¹±•ÍlÁt¹‘•ÁQôƒ²Ús®Âp‘íáøÀı€€£²Vô€‘íá‘÷®Úƒ²²^À¥€èœõ€¤íÉ•ÑÕÉ¸íô(€ô(€€¼¼ƒªâÃ²†Ğƒ²*ç²Â£ªÚ3ªÎğƒ².sªÂƒªÊç²æ ƒªÊ²
°€£ªÂƒªÖ³ªÂ¤(€½¹ÍĞ•á¥ÍÑ¥¹œõ±½…‘Q¥­•ÑÌ ¤¹™¥±Ñ•È¡Ñ¬ôùÑ¬¹ÍÑ…ÑÕÌôôô…Ñ¥Ù”œ˜™Ñ¬¹ÑÉ…Ù•±…Ñ”ôôõÑÉ…Ù•±…Ñ”¤ì(€™½È¡½¹ÍĞ0½˜`¹±•Ì¥ì(€€€½¹ÍĞ¹õÑ½5¥¸¡0¹‘•ÁP¤°¹„õÑ½5¥¸¡0¹…ÉÉP¤ì¥˜¡¹ôôõ¹Õ±±ññ¹„ôôõ¹Õ±°¥½¹Ñ¥¹Õ”ì(€€€½¹ÍĞ½¹™±¥Ğõ•á¥ÍÑ¥¹œ¹™¥¹¡Ñ¬ôùì(€€€€€½¹ÍĞ•õÑ½5¥¸¡Ñ¬¹‘•ÁQ¥µ”¤°•„õÑ½5¥¸¡Ñ¬¹…ÉÉQ¥µ”¤ì¥˜¡•ôôõ¹Õ±±ññ•„ôôõ¹Õ±°¥É•ÑÕÉ¸™…±Í”ì(€€€€€½¹ÍĞ…Lõ¹±…õ¹„øõ¹ı¹„é¹„¬ÄĞĞÀ°‰Lõ•±‰õ•„øõ•ı•„é•¬ÄĞĞÀìÉ•ÑÕÉ¸…Lñ‰˜™‰Lñ…ì(€€€ô¤ì(€€€¥˜¡½¹™±¥Ğ¥í…±•ÉĞ¡ƒªÂg²v ƒ².sªÂ®2²^@ƒ²vÓ®¾àƒ²b#®“¶Vpƒ²*ç²Â£ªÚ3²vĞƒ²z#²*×®.#®.¹q¹q¸‘í½¹™±¥Ğ¹ÑÉ…¥¹9½÷®Ê ƒ
Ü€‘í½¹™±¥Ğ¹™É½µMÑ¹÷ŠH‘í½¹™±¥Ğ¹Ñ½MÑ¹õq¸‘í½¹™±¥Ğ¹‘•ÁQ¥µ•õø‘í½¹™±¥Ğ¹…ÉÉQ¥µ•õq¹q»¶fc²*äƒ²b#®“®–ğƒ²¶Z'¶V€ƒ²"`ƒ²^²*×®.#®.¹€¤íÉ•ÑÕÉ¸íô(€ô(€½¹ÍĞÉÀôaœ­…Ñ”¹¹½Ü ¤¹Ñ½MÑÉ¥¹œ ÌØ¤­5…Ñ ¹É…¹‘½´ ¤¹Ñ½MÑÉ¥¹œ ÌØ¤¹Í±¥” È°Ô¤ì(€½¹ÍĞÑ¥­•ÑÌõ±½…‘Q¥­•ÑÌ ¤ì½¹ÍĞÉ•…Ñ•õmtì(€`¹±•Ì¹™½É…  ¡0±¥‘à¤ôùì(€€€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡0¹¹¼¤ì(€€€½¹ÍĞ‰…Í”õ…±…É”¡Ğ±0¹™É½´±0¹Ñ¼±0¹±Ì¤ì(€€€½¹ÍĞ™…É”õ…ÁÁ±å¥Í½Õ¹Ğ¡‰…Í”±‘¥Í½Õ¹Ğ¤ì(€€€½¹ÍĞÍ•…ÑÌô¡0¹Í•…ÑÌ˜™0¹Í•…ÑÌ¹±•¹Ñ ôôõ½Õ¹Ğ¤ıl¸¸¹0¹Í•…ÑÍtéÉÉ…ä¹™É½´¡í±•¹Ñ é½Õ¹Ñô° ¤ôùÉ…¹‘½µM•…Ğ¡0¹±Ì±0¹¹¼¤¤ì(€€€½¹ÍĞÑ¬õì(€€€€€¥é•¹Q¥­•Ñ% ¤°ÑÉ…¥¹9¼é0¹¹¼±É…‘”éĞ¹É…‘”±±¥¹”éĞ¹±¥¹”°(€€€€€™É½µMÑ¸é0¹™É½´±Ñ½MÑ¸é0¹Ñ¼±‘•ÁQ¥µ”é0¹‘•ÁP±…ÉÉQ¥µ”é0¹…ÉÉP°(€€€€€Í•…Ñ±…ÍÌé0¹±Ì±Í•…Ñ±…ÍÍ1…‰•°éÍ•…Ñ±…ÍÍ¥ÍÁ±…å1…‰•°¡Ğ±0¹±Ì¤°Í•…ÑÌ±Á…ÍÍ•¹•É½Õ¹Ğé½Õ¹Ğ°(€€€€€™…É•A•ÉA•ÉÍ½¸é™…É”±Ñ½Ñ…±…É”é™…É”©½Õ¹Ğ°‘¥Í½Õ¹Ğ±‘¥Í½Õ¹Ñ1…‰•°é%M=U9QMm‘¥Í½Õ¹Ñt¹±…‰•°±‰…Í•…É•A•ÉA•ÉÍ½¸é‰…Í”°(€€€€€‘¥ÍÑ…¹•-´é5…Ñ ¹É½Õ¹¡É½ÕÑ•¥ÍÑ…¹•-´¡Ğ±0¹™É½´±0¹Ñ¼¤¤°‰½½­•‘Ğé…Ñ”¹¹½Ü ¤°ÑÉ…Ù•±…Ñ”°ÍÑ…ÑÕÌè…Ñ¥Ù”œ°(€€€€€á™•ÉÉ½ÕÀéÉÀ°á™•ÉM•Äé¥‘à¬Ä°á™•ÉQ½Ñ…°é`¹±•Ì¹±•¹Ñ °á™•ÉY¥„é`¹Ù¥„°á™•É=É¥¥¸é`¹™É½´°á™•É•ÍĞé`¹Ñ¼(€€€ôì(€€€Ñ¥­•ÑÌ¹ÁÕÍ ¡Ñ¬¤ìÉ•…Ñ•¹ÁÕÍ ¡Ñ¬¤ì(€ô¤ì(€Í…Ù•Q¥­•ÑÌ¡Ñ¥­•ÑÌ¤ì(€É•…Ñ•¹™½É… ¡Ñ¬ôùí¥˜¡ÑåÁ•½˜¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸ôôô™Õ¹Ñ¥½¸œ¥¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸¡Ñ¬¹ÑÉ…¥¹9¼±Ñ¬¹ÑÉ…Ù•±…Ñ”¤íô¤ì(€É•…Ñ•¹™½É… ¡Ñ¬ôù}…ÕÑ½	½½­±…ÉµÌ¡•ÑQÉ…¥¹	å9¼¡Ñ¬¹ÑÉ…¥¹9¼¤±Ñ¬¹™É½µMÑ¸±Ñ¬¹Ñ½MÑ¸±Ñ¬¹‘•ÁQ¥µ”±Ñ¬¹…ÉÉQ¥µ”¤¤ì(€±½Í•	½½­QÉ…¥¹•Ñ…¥° ¤ì(€½¹ÍĞÑ½Ñ…±…É”õÉ•…Ñ•¹É•‘Õ” ¡„±Ñ¬¤ôù„­Ñ¬¹Ñ½Ñ…±…É”°À¤ì(€…±•ÉĞ¡ƒ¶fc²*äƒ²b#®“ªÂ ƒ²f®3®Bc²^#²*×®.#®.…q¸‘íÑÉ…Ù•±…Ñ•ôƒ
Ü€‘í`¹™É½µôƒŠH€‘í`¹Ù¥…ôƒŠH€‘í`¹Ñ½õq»²ƒ¶Z$€‘íÉ•…Ñ•‘lÁt¹É…‘•ô€‘íÉ•…Ñ•‘lÁt¹ÑÉ…¥¹9½ôƒ
Üƒ¶n¶Z$€‘íÉ•…Ñ•‘lÅt¹É…‘•ô€‘íÉ•…Ñ•‘lÅt¹ÑÉ…¥¹9½õq¸‘í½Õ¹Ñ÷®ªƒ
Üƒ²Òt€‘íÑ½Ñ…±…É”¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²nA€¤ì(€İ¥¹‘½Ü¹}á™•Èõ¹Õ±°ì(€¥˜¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Á…¹•°µÑ¥­•Ğœ¤ü¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì …Ñ¥Ù”œ¤¥É•¹‘•ÉQ¥­•ÑÌ ¤ì(€ÑÉåì¥˜¡ÑåÁ•½˜½Á•¹5åM•Ñ¥½¸ôôô™Õ¹Ñ¥½¸œ˜™‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµÍÕˆµÁ…¹•°œ¤ü¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ½Á•¸œ¤˜™‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµÍÕˆµÑ¥Ñ±”œ¤ü¹Ñ•áÑ½¹Ñ•¹Ğü¹¥¹±Õ‘•Ì Ÿ²*ç²Â£ªÚ0œ¤¥½Á•¹5åM•Ñ¥½¸ Ñ¥­•Ğœ¤ìõ…Ñ ¡”¥íô)ô((¼¼ƒ®
ƒ²pƒ²²‚Tƒ²b#®€£²^Ó²Â ƒ²b#®ƒ¶·²^C²pƒ¶bã²Úp¤(¼¼¥ÍI½Õ¹èƒ²fW®Î×²vÓ®¦Ğƒ¶:ã®>£ªÂ®*S¶:à¤ƒ²b#®ƒ²f®0ƒ¶nƒ®Î×¶:àƒ²†Ã¶j0ƒ¶fS®¦Ğƒ²zC®>dƒ².“¶Z$)™Õ¹Ñ¥½¸½Á•¹	½½­¥¹]¥Ñ¡…Ñ”¡ÑÉ…¥¹9¼°™É½´°Ñ¼°‘•ÁP°…ÉÉP°ÑÉ…Ù•±…Ñ”°¥ÍI½Õ¹°‘…Ñ•	…¬¥ì(€€¼¼ƒ²b#®ƒ²f®0ƒ¶nƒ²ös®ÂÄèƒ²fW®Î×²vÓ®¦Ğƒ®Î×¶:àƒ²†Ã¶j3®†pƒ²vÓ®>d(€½¹ÍĞİ…¹ÑI½Õ¹ô¡¥ÍI½Õ¹ôôõÑÉÕ•ññ¥ÍI½Õ¹ôôôÑÉÕ”œ¤˜™‘…Ñ•	…¬ì(€İ¥¹‘½Ü¹}…™Ñ•É	½½­¥¹…±±‰…¬€ôİ…¹ÑI½Õ¹€ü€ ¤ôùì(€€€Í•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€€€}‰½½­I½Õ¹‘QÉ¥Àõ™…±Í”ì€¼¼ƒ®Î×¶:ã²v ƒ¶:ã®>®†pƒ²†Ã¶j0(€€€€€İ¥¹‘½Ü¹}‰½½­É½´€ôÑ¼ì(€€€€€İ¥¹‘½Ü¹}‰½½­Q¼€ô™É½´ì(€€€€€½Á•¹5åM•Ñ¥½¸ ‰½½¬œ¤ì€¼¼ƒ®#²vÓ¶:c²vÓ² ƒ²b#®ƒ¶fS®¦Ğƒ²z³®‚3®6P€£²^·
ß¶:ã®>ƒ²¶pƒ®Âc²b¤(€€€€€Í•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€€€€€½¹ÍĞ‘°€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘…Ñ”µ¼œ¤ì(€€€€€€€¥˜¡‘°¤‘°¹Ù…±Õ”€ô‘…Ñ•	…¬ì(€€€€€€€Í•…É¡	½½­QÉ…¥¹Ì¡™…±Í”±™…±Í”¤ì(€€€€€€€½¹ÍĞÉ•Í°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµ‰½½¬µÉ•ÍÕ±ÑÌœ¤ì(€€€€€€€¥˜¡É•Í°¥É•Í°¹¥¹Í•ÉÑ‘©…•¹Ñ!Q50 …™Ñ•É‰•¥¸œ°(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÑÁàíÁ…‘‘¥¹œèÄÁÁà€ÄÑÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰…­É½Õ¹éÉ‰„ ÔØ°ÄÌä°ÈÔÌ°¸Ä¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ…•¹Ğ¤í™½¹ĞµÍ¥é”èÄÈ¸ÕÁàí½±½ÈéÙ…È ´µ…•¹ĞÈ¤ˆûÂ~RƒªÂ®*Pƒ²^Ó²Â ƒ²b#®ƒ²f®0ƒŠP€ñˆû®Î×¶:à ‘íÑ½ôƒŠH€‘í™É½µôƒ
Ü€‘í‘…Ñ•	…­ô¤ğ½ˆû²vƒ²ƒ¶w¶VĞƒ²ó²ã²jPğ½‘¥Øù€¤ì(€€€€€ô°€ÄÔÀ¤ì(€€€ô°€ÌÀÀ¤ì(€ô€è¹Õ±°ì((€€¼¼‰½½¬µ‘•Ñ…¥°µÁ…¹•°ƒ²*³®vó²vÓ®Npƒ®.¯¶z`ƒ¶nƒ²b#®“²Âôƒ²^ÓªâÀ(€Í•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€½Á•¹	½½­¥¹A½ÁÕÀ¡ÑÉ…¥¹9¼°™É½´°Ñ¼°‘•ÁP°…ÉÉP°ÑÉ…Ù•±…Ñ”¤ì(€€€½¹ÍĞ‘…Ñ•%¹À€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½­¥¹œµ‘…Ñ”œ¤ì(€€€¥˜¡‘…Ñ•%¹À€˜˜ÑÉ…Ù•±…Ñ”¤‘…Ñ•%¹À¹Ù…±Õ”€ôÑÉ…Ù•±…Ñ”ì(€€€¥˜¡İ¥¹‘½Ü¹}‰½½­A…ÍÍ•¹•É½Õ¹ĞøÄ¥ì(€€€€€İ¥¹‘½Ü¹}‰½½­¥¹A…ÍÍ•¹•É½Õ¹Ğ€ôİ¥¹‘½Ü¹}‰½½­A…ÍÍ•¹•É½Õ¹Ğì(€€€€€½¹ÍĞ¹Ğ€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½­¥¹œµÁ…ÍÍ•¹•Èµ½Õ¹Ğœ¤ì(€€€€€¥˜¡¹Ğ¤¹Ğ¹Ñ•áÑ½¹Ñ•¹Ğ€ôİ¥¹‘½Ü¹}‰½½­A…ÍÍ•¹•É½Õ¹Ğì(€€€ô(€ô°€ÔÀ¤ì)ô((((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~j$ƒ²^´ƒ²‚W®ÎĞƒ¶´(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}Í¥MÕ‰Q…ˆô¹•…Èœ°}Í¥ÕÉÉ•¹Ğõ¹Õ±°°}Í¥…É‘A±…Ñ™½É´õ¹Õ±°°}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´õ¹Õ±°°}Í¥9•…É±°õmt°}Í¥9•…ÉM¡½İ±½Í•õ™…±Í”°}Í¥9•…É1…Ğõ¹Õ±°°}Í¥9•…É1½¸õ¹Õ±°°}Í¥!¥‘•Q•É´õ™…±Í”°}Í¥UÁ½µ¥¹=¹±äõ™…±Í”°}Í¥	½…É‘Q¥µ•Èõ¹Õ±°ì(¼¼ƒ²jÓ¶Z'²vğƒªâÃ²’  ÀĞèÀÁû²v×²vğ€ÀÌèÔä¤ƒ®Úƒ®Î¶f`è€ÀĞèÀÀôÀƒŠ˜€ÀÌèÔäôÄĞÌä)™Õ¹Ñ¥½¸}ÍÉÙ5¥¸¡´¥ìÉ•ÑÕÉ¸€ ¡´´ÈĞÀ¤”ÄĞĞÀ¬ÄĞĞÀ¤”ÄĞĞÀìô()™Õ¹Ñ¥½¸É•¹‘•ÉMÑ…Ñ¥½¹%¹™¼ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÍÑ…Ñ¥½¹¥¹™¼œ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€•°¹¥¹¹•É!Q50ôœñ‘¥Ø¥ô‰Í¤µ½¹Ñ•¹ĞˆÍÑå±”ô‰Á…‘‘¥¹œèÀ€À€ÈÑÁàˆøğ½‘¥Øøœì(€É•¹‘•ÉM%½¹Ñ•¹Ğ ¤ì)ô()™Õ¹Ñ¥½¸Í•ÑM%Q…ˆ¡Ğ¥ì(€}Í¥MÕ‰Q…ˆõĞì(€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œ¹Í¤µÑ…ˆœ¤¹™½É…  ¡ˆ±¤¤ôùˆ¹±…ÍÍ1¥ÍĞ¹Ñ½±” …Ñ¥Ù”œ±l¹•…Èœ°‘•Ñ…¥°um¥tôôõĞ¤¤ì(€É•¹‘•ÉM%½¹Ñ•¹Ğ ¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•ÉM%½¹Ñ•¹Ğ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ½¹Ñ•¹Ğœ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€¥˜¡}Í¥MÕ‰Q…ˆôôôµ•ÑÉ¼œ¥}Í¥MÕ‰Q…ˆô¹•…Èœì€¼¼ƒªÖ³®Ê²‚ƒ²¶pƒ®Î×ªÖ°(€¥˜¡}Í¥MÕ‰Q…ˆôôô¹•…Èœ¤É•¹‘•ÉM%9•…È¡•°¤ì(€•±Í”É•¹‘•ÉM%•Ñ…¥°¡•°¤ì)ô((¼¼ƒŠRŠR ƒÂ~jƒ²‚²Ê€ƒ®ã²€ƒ¶´€£²‚²Ê€ƒ®ª£®Npƒ²‚²j¤¤ƒŠRŠR )±•Ğ}µ•ÑÉ½I•¥½¸ôŸ²‚²ÊĞœ°}µ•ÑÉ½•Ñ…¥±%õ¹Õ±°°}µ•ÑÉ½A…ÑM•°õ¹Õ±°ì(¼¼ƒªÎ¶×²vĞƒ²‚W²Â£¶Vc®*Pƒ²^´ƒ²G¶V¤ƒŠPƒªÊ3²zƒ¶sªŞà ‹®ã²ƒ®ª¿ªÎ¶Ôˆƒ®bC®*P€‹®ã²ƒ®ª€£ªÎ¶Ô¤ˆ¤ƒªâÃ²’ )™Õ¹Ñ¥½¸}µ•ÑÉ½A…ÑMÑ½ÁÌ¡°±À¥ì(€½¹ÍĞÍ•Ğõ¹•ÜM•Ğ ¤ì(€¥˜¡ÑåÁ•½˜MQQ%=9}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸Í•Ğì(€½¹ÍĞÑ…Ìõm°¹¹…µ”¬œ¼œ­À°°¹¹…µ”¬œ€ œ­À¬œ¤tì(€½¹ÍĞ…±°õ¹•ÜM•Ğ ¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹™±…Ñ5…À¡ÈôùÈ¹ÍÑ…Ñ¥½¹Ì¤¤ì(€™½È¡½¹ÍĞ¸½˜…±°¥ì(€€€½¹ÍĞÍĞõMQQ%=9}	m¸¬Ÿ²^´uññMQQ%=9}	m¹tì(€€€¥˜¡ÍĞ˜™ÍĞ¹±¥¹•Ì˜™Ñ…Ì¹Í½µ”¡ĞôùÍĞ¹±¥¹•Ì¹¥¹±Õ‘•Ì¡Ğ¤¤¥Í•Ğ¹…‘¡¸¤ì(€ô(€É•ÑÕÉ¸Í•Ğì)ô(¼¼ƒªÎ¶Ôƒ²jÓ¶Z$ƒªÖ³ªÂƒ².s¶²*ƒŠPƒªÂÉ½ÕÑ—²^C²pƒ²Ê¬ƒ²‚W²Â£²^µû®#²®$ƒ²‚W²Â£²^´ƒªÖ³ªÂ®0ƒ²Ş£¶VcªÎ€°ƒªÖ³ªÂƒ®
Ğƒ®¾ã²‚W²Â£²^·²v Á…ÍÌƒ¶Fs².p(¼¼ƒªÎ¶Ôƒ²^·²vƒªÂ²z”ƒ®;²vĞƒ®.Ó²v É½ÕÑ—®Ú¶Àƒ²"s¶j0°ƒ²vÓ®¾àƒ®.Ó²v ƒ²^·²v ƒªÆÓ®#®r €£ªÎ¶×®ÎÉ½ÕÑ—ªÂ ƒªÊç²æc®*Pƒ®ã²€ƒ®2²vD¤)™Õ¹Ñ¥½¸}µ•ÑÉ½A…ÑM•Ä¡°±À¥ì(€½¹ÍĞÍÑ½ÁÌõ}µ•ÑÉ½A…ÑMÑ½ÁÌ¡°±À¤ì(€¥˜ …ÍÑ½ÁÌ¹Í¥é”¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÉ½ÕÑ•Ìô¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹Í±¥” ¤(€€€€¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹ÍÑ…Ñ¥½¹Ì¹™¥±Ñ•È¡ÌôùÍÑ½ÁÌ¹¡…Ì¡Ì¤¤¹±•¹Ñ µ„¹ÍÑ…Ñ¥½¹Ì¹™¥±Ñ•È¡ÌôùÍÑ½ÁÌ¹¡…Ì¡Ì¤¤¹±•¹Ñ ¤ì(€½¹ÍĞÍ•Äõmtì½¹ÍĞÍ••¸õ¹•ÜM•Ğ ¤ì(€™½È¡½¹ÍĞÈ½˜É½ÕÑ•Ì¥ì(€€€½¹ÍĞ¥‘àõÈ¹ÍÑ…Ñ¥½¹Ì¹µ…À ¡Ì±¤¤ôùÍÑ½ÁÌ¹¡…Ì¡Ì¤ı¤è´Ä¤¹™¥±Ñ•È¡¤ôù¤øôÀ¤ì(€€€¥˜¡¥‘à¹±•¹Ñ ğÈ¥½¹Ñ¥¹Õ”ì€¼¼ƒ¶VÓ®.äÉ½ÕÑ—²^@ƒ²‚W²Â£²^´€ÇªÂp£®ÚªâÃ²^´ƒ®NÄ§®şC²vÓ®¦Ğƒ²jÓ¶Z$ƒªÖ³ªÂƒ²V®.`(€€€½¹ÍĞ„õ¥‘álÁt°ˆõ¥‘ám¥‘à¹±•¹Ñ ´Åtì(€€€½¹ÍĞÍ•œõmtì(€€€™½È¡±•Ğ¤õ„í¤ğõˆí¤¬¬¥ì(€€€€€½¹ÍĞ¸õÈ¹ÍÑ…Ñ¥½¹Ím¥tì(€€€€€¥˜¡Í••¸¹¡…Ì¡¸¤¥½¹Ñ¥¹Õ”ì€¼¼ƒ®.“®–àÉ½ÕÑ—²^C²pƒ²vÓ®¾àƒ¶Fs².s¶Vpƒ²^´(€€€€€Í•œ¹ÁÕÍ ¡í¸±ÍÑ½ÀéÍÑ½ÁÌ¹¡…Ì¡¸¥ô¤ì(€€€ô(€€€¥˜ …Í•œ¹™¥±Ñ•È¡àôùà¹ÍÑ½À¤¹±•¹Ñ ¥½¹Ñ¥¹Õ”ì(€€€€¼¼ƒ®ÚªâÃ²^·²^C²pƒ²vÓ²ZÓ²®¦Ğƒ²^Ã²4°ƒ²V®.#®¦ĞƒªÖ³®Ú²€(€€€½¹ÍĞ½¹ĞõÍ•Ä¹±•¹Ñ ˜™Í••¸¹¡…Ì¡È¹ÍÑ…Ñ¥½¹Ím…t¤˜™Í•ÅmÍ•Ä¹±•¹Ñ ´Åt¹¸ôôõÈ¹ÍÑ…Ñ¥½¹Ím…tì(€€€¥˜¡Í•Ä¹±•¹Ñ ˜˜…½¹Ğ¥Í•Ä¹ÁÕÍ ¡í…ÀéÑÉÕ•ô¤ì(€€€™½È¡½¹ÍĞà½˜Í•œ¥íÍ•Ä¹ÁÕÍ ¡à¤íÍ••¸¹…‘¡à¹¸¤íô(€€€È¹ÍÑ…Ñ¥½¹Ì¹Í±¥”¡„±ˆ¬Ä¤¹™½É… ¡¸ôùÍ••¸¹…‘¡¸¤¤ì(€ô(€É•ÑÕÉ¸Í•Ä¹™¥±Ñ•È¡àôø…à¹…À¤¹±•¹Ñ øôÈıÍ•Äé¹Õ±°ì)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½A…Ğ¡À¥í}µ•ÑÉ½A…ÑM•°õÀíÉ•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤íô)™Õ¹Ñ¥½¸}µ•ÑÉ½I½ÕÑ•É½ÕÁÌ¡°¥ì(€½¹ÍĞÉ½ÕÑ•Ìô¡°¹É½ÕÑ•Ì˜™°¹É½ÕÑ•Ì¹±•¹Ñ ı°¹É½ÕÑ•ÌémíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íññmuõt¤¹™¥±Ñ•È¡ÈôùÈ¹ÍÑ…Ñ¥½¹Ì˜™È¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ¤ì(€¥˜ …É½ÕÑ•Ì¹±•¹Ñ ¥É•ÑÕÉ¹mtì(€½¹ÍĞÁÉ¥µ…ÉäõÉ½ÕÑ•Ì¹™¥¹¡ÈôùÈ¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ôôô¡°¹ÍÑ…Ñ¥½¹Íññmt¤¹±•¹Ñ ˜™È¹ÍÑ…Ñ¥½¹Ì¹•Ù•Éä ¡¸±¤¤ôù¸ôôõ°¹ÍÑ…Ñ¥½¹Ím¥t¤¥ññÉ½ÕÑ•ÍlÁtì(€½¹ÍĞ½É‘•É•õmÁÉ¥µ…Éä°¸¸¹É½ÕÑ•Ì¹™¥±Ñ•È¡ÈôùÈ„ôõÁÉ¥µ…Éä¥t°µ…¥¹M•Ğõ¹•ÜM•Ğ¡ÁÉ¥µ…Éä¹ÍÑ…Ñ¥½¹Ì¤ì(€É•ÑÕÉ¸½É‘•É•¹µ…À ¡É½ÕÑ”±É½ÕÑ•%¹‘•à¤ôùì(€€€½¹ÍĞ©Õ¹Ñ¥½¹ÌõÉ½ÕÑ•%¹‘•àıÉ½ÕÑ”¹ÍÑ…Ñ¥½¹Ì¹™¥±Ñ•È¡¸ôùµ…¥¹M•Ğ¹¡…Ì¡¸¤¤émtì(€€€½¹ÍĞÍÑ…ÉĞõÉ½ÕÑ”¹ÍÑ…Ñ¥½¹ÍlÁt±•¹õÉ½ÕÑ”¹ÍÑ…Ñ¥½¹ÍmÉ½ÕÑ”¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ´Åtì(€€€É•ÑÕÉ¹ì(€€€€€É½ÕÑ”éÉ½ÕÑ•%¹‘•à°(€€€€€‰É…¹ éÉ½ÕÑ•%¹‘•àøÀ°(€€€€€±…‰•°éÉ½ÕÑ•%¹‘•àü¡©Õ¹Ñ¥½¹Ì¹±•¹Ñ ı€‘í©Õ¹Ñ¥½¹ÍlÁuôƒ®ÚªâÀƒ
Ü€‘í•¹‘ôƒ®Â§®¦Ñ€éƒ®Î®>ƒ²jÓ¶Z'ªÎ¶Ôƒ
Ü€‘íÍÑ…ÉÑ÷ŠL‘í•¹‘õ€¤èŸ®Îã²€œ°(€€€€€É½İÌéÉ½ÕÑ”¹ÍÑ…Ñ¥½¹Ì¹µ…À ¡¸±¤¤ôø¡í¸±ÍÑ½ÀéÑÉÕ”±É½ÕÑ”éÉ½ÕÑ•%¹‘•à±‰É…¹ éÉ½ÕÑ•%¹‘•àøÀ±É½ÕÑ•MÑ…ÉĞé¤ôôôÀ±É½ÕÑ•¹é¤ôôõÉ½ÕÑ”¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ´Åô¤¤(€€€ôì(€ô¤ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½I½ÕÑ•É½ÕÁÍ!Q50¡°±É½ÕÁÌ±±¥Ù”¥ì(€É•ÑÕÉ¸É½ÕÁÌ¹µ…À ¡É½ÕÀ±¥¹‘•à¤ôù€ñÍ•Ñ¥½¸±…ÍÌô‰µÑ°µÉ½ÕÑ”µÉ½ÕÀ‘íÉ½ÕÀ¹‰É…¹ üœ‰É…¹ œèœôˆø(€€€€‘í¥¹‘•àı€ñ‘¥Ø±…ÍÌô‰µÑ°µÉ½ÕÑ”µÉ½ÕÀµ¡•…ˆøñÍÁ…¸ÍÑå±”ô‰‰…­É½Õ¹è‘í°¹½±½Éôˆøğ½ÍÁ…¸øñˆø‘í}½ÁÍÍŒ¡É½ÕÀ¹±…‰•°¥ôğ½ˆøğ½‘¥Øù€èœô(€€€€‘í±¥Ù”ı}É•¹‘•É5•ÑÉ½1¥Ù•Q¥µ•±¥¹”¡°±É½ÕÀ¹É½İÌ¤é}µ•ÑÉ½MÑ…Ñ¥Q1!Q50¡°±É½ÕÀ¹É½İÌ¥ô(€€ğ½Í•Ñ¥½¸ù€¤¹©½¥¸ œœ¤ì)ô)™Õ¹Ñ¥½¸É•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµµ•ÑÉ½±¥¹•Ìœ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€¥˜¡ÑåÁ•½˜5QI=}1%9LôôôÕ¹‘•™¥¹•œ¥í•°¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~jğ½‘¥ØøñÀû²‚²Ê€ƒ®ã²€ƒ®6Ã²vÓ¶ÃªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜¡}µ•ÑÉ½•Ñ…¥±%¥ì}É•¹‘•É5•ÑÉ½1¥¹••Ñ…¥°¡•°±}µ•ÑÉ½•Ñ…¥±%¤ìÉ•ÑÕÉ¸ìô(€½¹ÍĞÉ•¥½¹ÌõlŸ²‚²ÊĞœ°¸¸¹¹•ÜM•Ğ¡5QI=}1%9L¹µ…À¡°ôù°¹É•¥½¸¤¥tì(€½¹ÍĞ±¥ÍĞõ5QI=}1%9L¹™¥±Ñ•È¡°ôù}µ•ÑÉ½I•¥½¸ôôôŸ²‚²ÊĞññ°¹É•¥½¸ôôõ}µ•ÑÉ½I•¥½¸¤ì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰µ…É¥¸èÄÑÁà€ÉÁà€ÑÁàí™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû²‚²Ê€€‘í5QI=}1%9L¹±•¹Ñ¡÷ªÂpƒ®ã²€ƒ
Üƒ®ã²ƒ²vƒ®"®–Ó®¦Ğƒ²^´ƒ®ª§®†w²vĞƒ¶Fs².s®B§®.#®.ğ½‘¥Øø(€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàí™±•àµİÉ…ÀéİÉ…Àíµ…É¥¸èáÁà€À€ÄÉÁàˆø(€€€€€€‘íÉ•¥½¹Ì¹µ…À¡Èôù€ñ‰ÕÑÑ½¸±…ÍÌô‰µ•ÑÉ¼µÉ•¥½¸µ¡¥À‘í}µ•ÑÉ½I•¥½¸ôôõÈüœ½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½I•¥½¸ œ‘íÉôœ¤ˆø‘íÉô‘íÈ„ôôŸ²‚²ÊĞœı€€‘í5QI=}1%9L¹™¥±Ñ•È¡°ôù°¹É•¥½¸ôôõÈ¤¹±•¹Ñ¡õ€èœôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€€€ğ½‘¥Øø(€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…ÀèáÁàíÁ…‘‘¥¹œµ‰½ÑÑ½´èÈÑÁàˆø‘í±¥ÍĞ¹µ…À¡}µ•ÑÉ½…É‘!Q50¤¹©½¥¸ œœ¥ôğ½‘¥Øù€ì)ô(¼¼ƒ¶bƒ².sªÂ¶Fp¡5QI=}M!¤ƒªâÃ²’ ƒ²Ê¯
ß®'²Â ¿®ÂÃ²Â ƒ²
Ã²ÚpƒŠPƒ®ã²ƒ®ª®Îƒ®¦S®ª£²vÓ²š )±•Ğ}µ•ÑÉ½MÑ…Ñ…¡”õíôì)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡•‘MÑ…ÑÌ¡¹…µ”¥ì(€¥˜¡¹…µ”¥¸}µ•ÑÉ½MÑ…Ñ…¡”¤É•ÑÕÉ¸}µ•ÑÉ½MÑ…Ñ…¡•m¹…µ•tì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m¹…µ•tì(€¥˜ …•¹Ññğ…•¹Ğ¹Ññğ…•¹Ğ¹Ğ¹±•¹Ñ ¤É•ÑÕÉ¸}µ•ÑÉ½MÑ…Ñ…¡•m¹…µ•tõ¹Õ±°ì(€½¹ÍĞÍÉØõ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼€ÀĞèÀÀôÀ(€½¹ÍĞ±¬õÍ´ôùí½¹ÍĞŒô¡Í´¬ÈĞÀ¤”ÄĞĞÀíÉ•ÑÕÉ¸5…Ñ ¹™±½½È¡Œ¼ØÀ¤¬œèœ­MÑÉ¥¹œ¡Œ”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¤íôì(€½¹ÍĞ‰å¥Èõíôì±•Ğµ¥¹Lõ%¹™¥¹¥Ñä±µ…áLôµ%¹™¥¹¥Ñäì(€™½È¡½¹ÍĞ˜½˜•¹Ğ¹Ğ¥ì½¹ÍĞÍ´õÍÉØ¡™lÅt¤ì¥˜¡Í´ñµ¥¹L¥µ¥¹LõÍ´ì¥˜¡Í´ùµ…áL¥µ…áLõÍ´ì€€€¼¼ƒ²nC²‚@ƒ²Ús®Âp£²Ê¬ƒ²‚W²Â ¤(€€€½¹ÍĞõ™lÉt¬œøœ¬¡˜¹±•¹Ñ øôØı™lÕtèœœ¤ì€¡‰å¥Ém‘tõ‰å¥Ém‘uññmt¤¹ÁÕÍ ¡Í´¤ìô€€€€€€€€¼¼ƒ®Â§¶Z”÷²nC²‚@û®.“²v3²^´(€€¼¼ƒ²ğƒ®Â§¶Z”£¶:ã²"`ƒ²Ös®.§²v`ƒ²óªÂƒ²^Ã²4ƒ®ÂÃ²Â ƒªÂªÊ¤ƒŠHƒ®~³².p÷¶Vc²r€ÄÔ”°ƒ¶>'².p÷²²r€àÀ”ƒ®Ú²r(€½¹ÍĞÁÉ¥µ…Éäõ=‰©•Ğ¹­•åÌ¡‰å¥È¤¹Í½ÉĞ ¡„±ˆ¤ôù‰å¥Ém‰t¹±•¹Ñ µ‰å¥Ém…t¹±•¹Ñ ¥lÁtì(€½¹ÍĞ‘•ÁÌõ‰å¥ÉmÁÉ¥µ…Éåt¹Í±¥” ¤¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€½¹ÍĞ…ÁÌõmtì™½È¡±•Ğ¤ôÄí¤ñ‘•ÁÌ¹±•¹Ñ í¤¬¬¥í½¹ÍĞœõ‘•ÁÍm¥tµ‘•ÁÍm¤´Åtì¥˜¡œøÀ˜™œğôÄÈÀ˜™‘•ÁÍm¤´ÅtøôäÀ˜™‘•ÁÍm¤´ÅtğôÄÄÜÀ¥…ÁÌ¹ÁÕÍ ¡œ¤íô(€…ÁÌ¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€½¹ÍĞÁĞõÀôù…ÁÌ¹±•¹Ñ ı…ÁÍm5…Ñ ¹µ¥¸¡…ÁÌ¹±•¹Ñ ´Ä±5…Ñ ¹™±½½È¡À©…ÁÌ¹±•¹Ñ ¤¥té¹Õ±°ì(€É•ÑÕÉ¸}µ•ÑÉ½MÑ…Ñ…¡•m¹…µ•tõí™¥ÉÍĞé±¬¡µ¥¹L¤±±…ÍĞé±¬¡µ…áL¤±¡İA•…¬éÁĞ À¸ÄÔ¤±¡İ=™˜éÁĞ À¸à¥ôì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½…É‘!Q50¡°¥ì(€½¹ÍĞÍĞõ}µ•ÑÉ½M¡•‘MÑ…ÑÌ¡°¹¹…µ”¤ì(€½¹ÍĞ™¥ÉÍĞô¡ÍĞ˜™ÍĞ¹™¥ÉÍĞ¥ññ°¹™¥ÉÍĞ°±…ÍĞô¡ÍĞ˜™ÍĞ¹±…ÍĞ¥ññ°¹±…ÍĞ°¡İ=‰¨ô¡ÍĞ˜™ÍĞ¹¡İA•…¬„õ¹Õ±°¤ıÍĞé°ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ…ÉˆÍÑå±”ô‰‰½É‘•Èµ±•™ĞèÑÁàÍ½±¥€‘í°¹½±½Éôˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½1¥¹••Ñ…¥° œ‘í°¹¥‘ôœ¤ˆø(€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ¡•…ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‘½ĞˆÍÑå±”ô‰‰…­É½Õ¹è‘í°¹½±½Éôˆøğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ¹…µ”ˆø‘í°¹¹…µ•ôğ½ÍÁ…¸ø(€€€€€€‘í°¹±½½ÀüœñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‰…‘”ˆû²"s¶f`ğ½ÍÁ…¸øœèœô(€€€€€€‘í°¹¹¥¡ĞüœñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‰…‘”¹¥¡Ğˆû².³²Vğğ½ÍÁ…¸øœèœô(€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ½Õ¹Ğˆø‘í°¹¹÷ªÂs²^´ƒŠèğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µÉ½ÕÑ”ˆø‘í°¹±½½Àı€‘í°¹™É½µôƒªâÃ²‚@ƒ²"s¶fa€é€‘í°¹™É½µôƒŠP€‘í°¹Ñ½õôğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ¥¹™¼ˆø(€€€€€€ñÍÁ…¸û²Ê¯²Â €ñˆø‘í™¥ÉÍÑôğ½ˆøğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸û®'²Â €ñˆø‘í±…ÍÑôğ½ˆøğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸ø‘í}µ•ÑÉ½!•…‘İ…ä¡¡İ=‰¨¥ôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô(¼¼ƒ®ã²€ƒ²²àèƒ²^Ó²Â ƒ²†Ã¶j3²Êc®~ğƒ¶²z®vó²vàƒ².tƒ²^´ƒ®ª§®†t)™Õ¹Ñ¥½¸}É•¹‘•É5•ÑÉ½1¥¹••Ñ…¥°¡•°±¥¥ì(€½¹ÍĞ°õ5QI=}1%9L¹™¥¹¡àôùà¹¥ôôõ¥¤ì(€¥˜ …°¥í}µ•ÑÉ½•Ñ…¥±%õ¹Õ±°íÉ•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤íÉ•ÑÕÉ¸íô(€¥˜¡}µ•ÑÉ½A…ÑM•°˜˜…°¹Á…ÑÑ•É¹Ì¹¥¹±Õ‘•Ì¡}µ•ÑÉ½A…ÑM•°¤¥}µ•ÑÉ½A…ÑM•°õ¹Õ±°ì(€½¹ÍĞÁ…ÑM•Äõ}µ•ÑÉ½A…ÑM•°ı}µ•ÑÉ½A…ÑM•Ä¡°±}µ•ÑÉ½A…ÑM•°¤é¹Õ±°ì(€¥˜¡}µ•ÑÉ½A…ÑM•°˜˜…Á…ÑM•Ä¥}µ•ÑÉ½A…ÑM•°õ¹Õ±°ì(€½¹ÍĞÉ½ÕÁÌõÁ…ÑM•ÄımíÉ½ÕÑ”èÀ±‰É…¹ é™…±Í”±±…‰•°é}µ•ÑÉ½A…ÑM•°±É½İÌéÁ…ÑM•Åõté}µ•ÑÉ½I½ÕÑ•É½ÕÁÌ¡°¤ì(€½¹ÍĞÉ½İÌõÉ½ÕÁÌ¹™±…Ñ5…À¡É½ÕÀôùÉ½ÕÀ¹É½İÌ¤ì(€½¹ÍĞÍÑ½ÁI½İÌõÉ½İÌ¹™¥±Ñ•È¡àôø…à¹…À˜™à¹ÍÑ½À¤°Á…ÍÍ8õÉ½İÌ¹™¥±Ñ•È¡àôø…à¹…À˜˜…à¹ÍÑ½À¤¹±•¹Ñ ì(€½¹ÍĞÁ…Ñ%¹™¼õÁ…ÑM•Äı€ñ‘¥ØÍÑå±”ô‰µ…É¥¸èÄÁÁà€ÉÁà€Àí™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤ˆøñˆÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÄ¤ˆø‘í}µ•ÑÉ½A…ÑM•±ôğ½ˆøƒ
Ü€‘íÍÑ½ÁI½İÍlÁt¹¹ôƒŠP€‘íÍÑ½ÁI½İÍmÍÑ½ÁI½İÌ¹±•¹Ñ ´Åt¹¹ôƒ
Üƒ²‚W²Â €ñˆø‘íÍÑ½ÁI½İÌ¹±•¹Ñ¡ôğ½ˆû²^´‘íÁ…ÍÍ8ı€ƒ
Üƒ¶×ªÎğ€‘íÁ…ÍÍ9÷²^´€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø£²v3²b¤ğ½ÍÁ…¸ù€èœôğ½‘¥Øù€èœœì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÑÁà€À€ÈÑÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑ°µ‘•Ñ…¥°µ¹…Øˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÑ°µ‘•Ñ…¥°µ±¥ÍĞˆ½¹±¥¬ô‰±½Í•5•ÑÉ½1¥¹••Ñ…¥° ¤ˆûŠ@ƒ®ã²€ƒ®ª§®†tğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÍ µ¹…Ù‰Ñ¸ˆ½¹±¥¬ô‰ÍÑ•Á5•ÑÉ½1¥¹••Ñ…¥° ´Ä¤ˆ…É¥„µ±…‰•°ô‹²vÓ²‚ƒ®ã²€ˆûŠ^ ğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÍ µ¹…Ù‰Ñ¸ˆ½¹±¥¬ô‰ÍÑ•Á5•ÑÉ½1¥¹••Ñ…¥° Ä¤ˆ…É¥„µ±…‰•°ô‹®.“²v0ƒ®ã²€ˆûŠZØğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ…ÉˆÍÑå±”ô‰‰½É‘•Èµ±•™ĞèÑÁàÍ½±¥€‘í°¹½±½ÉôíÕÉÍ½Èé‘•™…Õ±Ğˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ¡•…ˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‘½ĞˆÍÑå±”ô‰‰…­É½Õ¹è‘í°¹½±½Éôˆøğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ¹…µ”ˆÍÑå±”ô‰™½¹ĞµÍ¥é”èÄİÁàˆø‘í°¹¹…µ•ôğ½ÍÁ…¸ø(€€€€€€€€€€‘í°¹±½½ÀüœñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‰…‘”ˆû²"s¶f`ğ½ÍÁ…¸øœèœô(€€€€€€€€€€‘í°¹¹¥¡ĞüœñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ‰…‘”¹¥¡Ğˆû².³²Vğğ½ÍÁ…¸øœèœô(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µ½Õ¹Ğˆø‘í°¹¹÷ªÂs²^´ğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µÉ½ÕÑ”ˆø‘í°¹±½½Àı€‘í°¹™É½µôƒªâÃ²‚@ƒ²"s¶fa€é€‘í°¹™É½µôƒŠP€‘í°¹Ñ½õôğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ¥¹™¼ˆø(€€€€€€€€€€ñÍÁ…¸û²Ê¯²Â €ñˆø‘ì  ¤ôùí½¹ÍĞÍĞõ}µ•ÑÉ½M¡•‘MÑ…ÑÌ¡°¹¹…µ”¤íÉ•ÑÕÉ¸€¡ÍĞ˜™ÍĞ¹™¥ÉÍĞ¥ññ°¹™¥ÉÍĞíô¤ ¥ôğ½ˆøğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸û®'²Â €ñˆø‘ì  ¤ôùí½¹ÍĞÍĞõ}µ•ÑÉ½M¡•‘MÑ…ÑÌ¡°¹¹…µ”¤íÉ•ÑÕÉ¸€¡ÍĞ˜™ÍĞ¹±…ÍĞ¥ññ°¹±…ÍĞíô¤ ¥ôğ½ˆøğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ø‘ì  ¤ôùí½¹ÍĞÍĞõ}µ•ÑÉ½M¡•‘MÑ…ÑÌ¡°¹¹…µ”¤íÉ•ÑÕÉ¸}µ•ÑÉ½!•…‘İ…ä ¡ÍĞ˜™ÍĞ¹¡İA•…¬„õ¹Õ±°¤ıÍĞé°¤íô¤ ¥ôğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€‘í°¹Á…ÑÑ•É¹Ì¹±•¹Ñ ı€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µÁ…ÑÌˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèáÁàˆû²jÓ¶Z'ªÎ¶Ô€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µÁ…Ğµ¡¥À‘ì…}µ•ÑÉ½A…ÑM•°üœ½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½A…Ğ¡¹Õ±°¤ˆû²‚²ÊĞğ½ÍÁ…¸ø‘í°¹Á…ÑÑ•É¹Ì¹µ…À¡Àôù€ñÍÁ…¸±…ÍÌô‰µ•ÑÉ¼µÁ…Ğµ¡¥À‘í}µ•ÑÉ½A…ÑM•°ôôõÀüœ½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½A…Ğ œ‘íÀ¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆø‘íÁôğ½ÍÁ…¸ù€¤¹©½¥¸ œœ¥ôğ½‘¥Øù€èœô(€€€€€€€€‘íÁ…Ñ%¹™½ô(€€€€€€€€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÁÁàí‘¥ÍÁ±…äé™±•àí…ÀèáÁàí™±•àµİÉ…ÀéİÉ…Àˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤íÍ¡½İ5•ÑÉ½=¹5…À œ‘í°¹¥‘ôœ¤ˆÍÑå±”ô‰Á…‘‘¥¹œèáÁà€ÄÑÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰½É‘•ÈèÅÁàÍ½±¥€‘í°¹½±½Éôí‰…­É½Õ¹éÑÉ…¹ÍÁ…É•¹Ğí½±½Èè‘í°¹½±½Éôí™½¹ĞµÍ¥é”èÄÈ¸ÕÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆû²®>¶bTƒ®ã²ƒ®>ğ½‰ÕÑÑ½¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑ°µ±¥Ù”µ¡•…ˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÑ°µ±¥Ù”µÑ½±”‘í}µ•ÑÉ½1¥Ù•=¸üœ½¸œèœôˆÍÑå±”ôˆ´µµŒè‘í°¹½±½Éôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½1¥Ù•=¸ ‘í}µ•ÑÉ½1¥Ù•=¸ü™…±Í”œèÑÉÕ”ô¤ˆøñÍÁ…¸±…ÍÌô‰µÑ°µ±¥Ù”µÍÜˆøğ½ÍÁ…¸û².“².sªÂƒ²r²æ`€‘í}µ•ÑÉ½1¥Ù•=¸ü=8œè=ôğ½‰ÕÑÑ½¸ø(€€€€€€€€‘í}µ•ÑÉ½1¥Ù•=¸ı€ñÍÁ…¸±…ÍÌô‰µÑ°µ±¥Ù”µÉÕ¸ˆÍÑå±”ôˆ´µµŒè‘í°¹½±½ÉôˆûÂ~j€ñˆø‘í}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡°¹¹…µ”¤¹±•¹Ñ¡ôğ½ˆû®2 ƒ²jÓ¶Z$ƒ²’Dğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÑ°µ±¥Ù”µÉ•™É•Í ˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½1¥¹••Ñ…¥° œ‘í°¹¥‘ôœ¤ˆÑ¥Ñ±”ô‹²#®†sªÎƒ²æ ˆûŠìğ½‰ÕÑÑ½¸ù€èœô(€€€€€€ğ½‘¥Øø(€€€€€€‘í}µ•ÑÉ½1¥Ù•=¸ı€ñ‘¥Ø±…ÍÌô‰µÑ°µ±¥Ù”µ±••¹ˆøñÍÁ…¸±…ÍÌô‰µÑ°µ±¥Ù”µ±œ‘½İ¸ˆûŠZğƒ¶Vc¶Z$€ñÍµ…±°ûªâÃ²‚CŠK²Š²‚@ğ½Íµ…±°øğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑ°µ±¥Ù”µ±œÕÀˆûŠZÈƒ²¶Z$€ñÍµ…±°û²Š²‚CŠKªâÃ²‚@ğ½Íµ…±°øğ½ÍÁ…¸øğ½‘¥Øù€èœô(€€€€€€‘í}µ•ÑÉ½I½ÕÑ•É½ÕÁÍ!Q50¡°±É½ÕÁÌ±}µ•ÑÉ½1¥Ù•=¸¥ô(€€€€ğ½‘¥Øù€ì(€¥˜ …}µ•ÑÉ½1¥Ù•=¸¥}Á±…•5•ÑÉ½1¥Ù•5…É­•ÉÌ¡•°°°¹¹…µ”¤ì(€İ¥¹‘½Ü¹ÍÉ½±±Q¼ À°À¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½I•¥½¸¡È¥í}µ•ÑÉ½I•¥½¸õÈí}µ•ÑÉ½•Ñ…¥±%õ¹Õ±°í}µ•ÑÉ½A…ÑM•°õ¹Õ±°íÉ•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤íô)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½1¥¹••Ñ…¥°¡¥¥í}µ•ÑÉ½•Ñ…¥±%õ¥í}µ•ÑÉ½A…ÑM•°õ¹Õ±°íÉ•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤íô)™Õ¹Ñ¥½¸±½Í•5•ÑÉ½1¥¹••Ñ…¥° ¥í}µ•ÑÉ½•Ñ…¥±%õ¹Õ±°í}µ•ÑÉ½A…ÑM•°õ¹Õ±°íÉ•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤íô)™Õ¹Ñ¥½¸ÍÑ•Á5•ÑÉ½1¥¹••Ñ…¥°¡‘¥È¥ì(€¥˜¡ÑåÁ•½˜5QI=}1%9LôôôÕ¹‘•™¥¹•ñğ…5QI=}1%9L¹±•¹Ñ ¥É•ÑÕÉ¸ì(€½¹ÍĞ¤õ5QI=}1%9L¹™¥¹‘%¹‘•à¡°ôù°¹¥ôôõ}µ•ÑÉ½•Ñ…¥±%¤ì(€½¹ÍĞ¹¤ô¡¤ğÀüÀè¡¤­‘¥È­5QI=}1%9L¹±•¹Ñ ¤•5QI=}1%9L¹±•¹Ñ ¤ì(€½Á•¹5•ÑÉ½1¥¹••Ñ…¥°¡5QI=}1%9Mm¹¥t¹¥¤ì)ô)™Õ¹Ñ¥½¸Í¡½İ5•ÑÉ½=¹5…À¡¥¥ì(€½¹ÍĞ°õ5QI=}1%9L¹™¥¹¡àôùà¹¥ôôõ¥¤ì(€¥˜¡°¥í}µ•ÑÉ½5…ÁI•¥½¸õ°¹É•¥½¸í}µ•ÑÉ½5…Á%õ¥íô(€Íİ¥Ñ¡Q…ˆ µ…Àœ¤ì)ô(¼¼ƒ²^´ƒ²æÓ®Npƒ²‚²Ê€ƒ²æ¤ƒŠHƒ²‚²Ê€ƒ®ª£®Npƒ®ã²€ƒ²²ã®†p)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½1¥¹”¡¥¥ì(€¥˜¡}…ÁÁ5½‘”„ôôµ•ÑÉ¼œ¤Í•ÑÁÁ5½‘” µ•ÑÉ¼œ¤ì(€½¹ÍĞ°ô¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¤ı5QI=}1%9L¹™¥¹¡àôùà¹¥ôôõ¥¤é¹Õ±°ì(€¥˜¡°¥}µ•ÑÉ½I•¥½¸õ°¹É•¥½¸ì(€}µ•ÑÉ½•Ñ…¥±%õ¥ì(€Íİ¥Ñ¡Q…ˆ µ•ÑÉ½±¥¹•Ìœ¤ì)ô()™Õ¹Ñ¥½¸Í¥9•…ÉM•…É ¡Ä¥ì(€¥˜ …Ä¥í½¹ÍĞÈõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…ÈµÍ•…É µÉ•ÍÕ±ÑÌœ¤í¥˜¡È¥È¹¥¹¹•É!Q50ôœœíÉ•ÑÕÉ¸íô(€¥˜¡ÑåÁ•½˜MQQ%=9}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸ì(€½¹ÍĞÉ•Ìõ=‰©•Ğ¹­•åÌ¡MQQ%=9}¤¹™¥±Ñ•È¡¸ôù¸¹¥¹±Õ‘•Ì¡Ä¤¤¹Í±¥” À°à¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…ÈµÍ•…É µÉ•ÍÕ±ÑÌœ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€•°¹¥¹¹•É!Q50õÉ•Ì¹±•¹Ñ ı€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí™±•àµİÉ…ÀéİÉ…Àí…ÀèÙÁàˆø‘ì(€€€É•Ì¹µ…À¡¸ôù€ñ‰ÕÑÑ½¸½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘í¹ôœ¤ˆ(€€€€€ÍÑå±”ô‰Á…‘‘¥¹œèÙÁà€ÄÉÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÈÁÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹ĞµÍ¥é”èÄÉÁàíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆø‘í¹ôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¤(€ôğ½‘¥Øù€èœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÑÁàˆûªÊ²$ƒªÊÃªÎğƒ²^²v0ğ½‘¥Øøœì)ô((¼¼ƒ®ª£®Ns®Îƒ²^´ƒ²G¶V¤€£ªâÃ²Â èƒ²^Ó²Â ƒ²‚W²Â£²^´€¼ƒ²‚²Ê€èƒ²‚²Ê€ƒ®ã²€ƒ²^´¤)±•Ğ}ÑÉ…¥¹MÑ¹M•Ğõ¹Õ±°±}µ•ÑÉ½MÑ¹M•Ğõ¹Õ±°ì)™Õ¹Ñ¥½¸}µ½‘•MÑ¹M•ÑÍ%¹¥Ğ ¥ì(€¥˜ …}ÑÉ…¥¹MÑ¹M•Ğ˜™ÑåÁ•½˜11}QI%9L„ôôÕ¹‘•™¥¹•œ¥ì(€€€}ÑÉ…¥¹MÑ¹M•Ğõ¹•ÜM•Ğ ¤ì(€€€€¼¼ƒ¶Vpƒ¶:ã²vÓ®vó®>ƒ².“²‚p€Ÿ²‚W²Â Ÿ¶Vc®*Pƒ²^·®0ƒªâÃ²Â£²^·²ró®†pƒ²Ş£ªâ$ƒŠPƒ¶×ªÎó®0ƒ¶Vc®*Pƒ²^·²v ƒ²‚s²fà(€€€11}QI%9L¹™½É… ¡ĞôùĞ¹ÍÑ½ÁÌ¹™½É… ¡Ìôùí¥˜ ¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¥}ÑÉ…¥¹MÑ¹M•Ğ¹…‘¡Ì¹Ì¤íô¤¤ì(€ô(€¥˜ …}µ•ÑÉ½MÑ¹M•Ğ˜™ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¥ì(€€€}µ•ÑÉ½MÑ¹M•Ğõ¹•ÜM•Ğ ¤ì(€€€5QI=}1%9L¹™½É… ¡°ôø¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹™½É… ¡ÈôùÈ¹ÍÑ…Ñ¥½¹Ì¹™½É… ¡¸ôù}µ•ÑÉ½MÑ¹M•Ğ¹…‘¡¸¤¤¤¤ì(€ô)ô(¼¼ƒ²‚²Ê€ƒ²‚²j§²^´èƒ²‚²Ê€ƒ®ã²ƒ²^C®*Pƒ²z#²ró®
`ƒ²ZÓ®Zƒ²^Ó²Â£®>ƒ²‚W²Â£¶Vc² ƒ²V+®*Pƒ²^´£¶×ªÎó®0ƒ¶>³¶V ¤(¼¼ƒŠHƒªâÃ²Â ƒ¶´ƒ²^´ƒªÊ²'²^C²pƒ²‚s²fàƒ®2²)™Õ¹Ñ¥½¸}¥Í5•ÑÉ½=¹±ä¡¹…µ”¥ì(€}µ½‘•MÑ¹M•ÑÍ%¹¥Ğ ¤ì(€É•ÑÕÉ¸€„„¡}µ•ÑÉ½MÑ¹M•Ğ˜™}µ•ÑÉ½MÑ¹M•Ğ¹¡…Ì¡¹…µ”¤˜™}ÑÉ…¥¹MÑ¹M•Ğ˜˜…}ÑÉ…¥¹MÑ¹M•Ğ¹¡…Ì¡¹…µ”¤¤ì)ô(¼¼ƒ®ª£®Npƒ²‚¶f`€¬ƒªÂg²v ƒ²^´ƒ²²àƒ²^ÓªâÀ€£²‚²ÊƒŠSªâÃ²Â ƒ®ÎG¶Z'²^´ƒ®æƒ®–àƒ²vÓ®>d¤)™Õ¹Ñ¥½¸Íİ¥Ñ¡5½‘•MÑ…Ñ¥½¸¡µ½‘”±¹…µ”¥ì(€Í•ÑÁÁ5½‘”¡µ½‘”¤ì(€½Á•¹MÑ…Ñ¥½¹•Ñ…¥°¡¹…µ”¤ì)ô)™Õ¹Ñ¥½¸}ÍÑ¹	…Í•9…µ”¡¸¥íÉ•ÑÕÉ¸MÑÉ¥¹œ¡¸¤¹É•Á±…” ½qÌ©p¼¸¨¼°œœ¤¹ÑÉ¥´ ¤¹É•Á±…” ¿²^´¼°œœ¤íô)™Õ¹Ñ¥½¸É•¹‘•ÉM%9•…È¡•°¥ì(€•°¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÉÁàˆø(€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹ĞéÍÁ…”µ‰•Ñİ••¸íµ…É¥¸µ‰½ÑÑ½´èÄÁÁàí…ÀèáÁàí™±•àµİÉ…ÀéİÉ…Àˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µÑ•áĞÄ¤ˆûªÂªæ3²jĞ€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œüŸ²‚²Êƒ²^´œèŸªâÃ²Â£²^´ôQ=@€Ôğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÄÁÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰É•ÅÕ•ÍÑ9•…É1½…Ñ¥½¸ ¤ˆÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèØÀÀí½±½ÈéÙ…È ´µ…•¹Ğ¤í‰…­É½Õ¹éÑÉ…¹ÍÁ…É•¹Ğí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ…•¹Ğ¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàíÁ…‘‘¥¹œèÑÁà€ÄÁÁàíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆûÂ~Rƒ²r²æ`ƒ®.“².pƒ²jS²Ê´ğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ±…‰•°ÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÑÁàí™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íÕÉÍ½ÈéÁ½¥¹Ñ•Èˆø(€€€€€€€€€€ñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆ¥ô‰Í¤µ¹•…Èµ±½Í•ˆ½¹¡…¹”ô‰}Í¥9•…ÉM¡½İ±½Í•õÑ¡¥Ì¹¡•­•íÉ•¹‘•ÉM%9•…É1¥ÍĞ ¤ˆ€‘í}Í¥9•…ÉM¡½İ±½Í•ü¡•­•œèœôø(€€€€€€€€€ƒ¶>C²^´ƒ¶>³¶V (€€€€€€€€ğ½±…‰•°ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰Í¤µ¹•…Èµ±¥ÍĞˆøñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèÈÁÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÍÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆû²r²æ`ƒ²‚W®ÎĞƒªÂ²‚ã²b“®*Pƒ²’D¸¸¸ğ½‘¥Øøğ½‘¥Øø(€€ğ½‘¥Øù€ì(€¥˜ …¹…Ù¥…Ñ½È¹•½±½…Ñ¥½¸¥í‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…Èµ±¥ÍĞœ¤¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÄÉÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆû²r²æ`ƒ²s®æ²*ƒ®¾ã²²n@ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜¡}Í¥9•…É±°¹±•¹Ñ øÀ¥íÉ•¹‘•ÉM%9•…É1¥ÍĞ ¤íÉ•ÑÕÉ¸íô(€}™•Ñ¡9•…É1½…Ñ¥½¸ ¤ì)ô(¼¼ƒ²r²æ`ƒ²jS²Ê´£²Ös²Ò ¿®.“².p¤¸ƒ²êC².pƒ®æ²jÃªÎ€ƒ²z³²jS²Ê´ƒŠHƒªÆÃ²‚#¶Z#®6`ƒªÊ÷²jÀƒ®.“².pƒªÚ3¶Vpƒ¶2w²^ƒ²rƒ®>)™Õ¹Ñ¥½¸É•ÅÕ•ÍÑ9•…É1½…Ñ¥½¸ ¥ì(€}Í¥9•…É±°õmtì}Í¥9•…É1…Ğõ¹Õ±°ì}Í¥9•…É1½¸õ¹Õ±°ì(€½¹ÍĞ°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…Èµ±¥ÍĞœ¤ì(€¥˜¡°¥°¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèÈÁÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÍÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆû²r²æ`ƒ²‚W®ÎĞƒªÂ²‚ã²b“®*Pƒ²’D¸¸¸ğ½‘¥Øøœì(€}™•Ñ¡9•…É1½…Ñ¥½¸ ¤ì)ô)™Õ¹Ñ¥½¸}™•Ñ¡9•…É1½…Ñ¥½¸ ¥ì(€¥˜ …¹…Ù¥…Ñ½È¹•½±½…Ñ¥½¸¥É•ÑÕÉ¸ì(€¹…Ù¥…Ñ½È¹•½±½…Ñ¥½¸¹•ÑÕÉÉ•¹ÑA½Í¥Ñ¥½¸¡Á½Ìôùì(€€€½¹ÍĞí±…Ñ¥ÑÕ‘”é±…Ğ±±½¹¥ÑÕ‘”é±½¹ôõÁ½Ì¹½½É‘Ìì(€€€}Í¥9•…É1…Ğõ±…Ğì}Í¥9•…É1½¸õ±½¸ì(€€€¥˜¡ÑåÁ•½˜•Ñ9•…É•ÍÑMÑ…Ñ¥½¹ÌôôôÕ¹‘•™¥¹•œ¥í½¹ÍĞ°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…Èµ±¥ÍĞœ¤í¥˜¡°¥°¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÉ•¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÄÉÁàˆû²^´ƒ®6Ã²vÓ¶Àƒ®†s®Npƒ²V#®B ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€€€}Í¥9•…É±°õ•Ñ9•…É•ÍÑMÑ…Ñ¥½¹Ì¡±…Ğ±±½¸°ÔÀ¤ì(€€€É•¹‘•ÉM%9•…É1¥ÍĞ ¤ì(€ô±•ÉÈôùì(€€€½¹ÍĞ°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…Èµ±¥ÍĞœ¤ì(€€€½¹ÍĞ‘•¹¥•õ•ÉÈ¹½‘”ôôôÄì(€€€¥˜¡°¥°¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèÄáÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÈ¤í™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèØÀÀíµ…É¥¸µ‰½ÑÑ½´èÙÁàˆø‘í‘•¹¥•üŸ²r²æ`ƒªÚ3¶Vs²vĞƒªÆÃ®Ú®Bc²ZĞƒ²z#²*×®.#®.œèŸ²r²æc®–ğƒªÂ²‚ã²b“² ƒ®ªï¶Z#²*×®.#®.ôğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÅÁàíµ…É¥¸µ‰½ÑÑ½´èÄÉÁàˆø‘í‘•¹¥•üŸ².“²"c®†pƒªÆÃ®Ú¶Vc²£®.“®¦Ğƒ²V®z`ƒ®Ê¶*ó²ró®†pƒ®.“².pƒ²jS²Ê·¶VcªÆÃ®
`°ƒ®â3®vó²jÃ²‚ ƒ²ó²3²Â÷²v`ƒ²zC®²ó²€£ŠN`¤ƒŠHƒªÚ3¶Vs²^C²pƒ²r²æc®–ğƒ¶^#²j§¶VÓ²ó²ã²jP¸œé•ÉÈ¹µ•ÍÍ…•ôğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰É•ÅÕ•ÍÑ9•…É1½…Ñ¥½¸ ¤ˆÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½Èè™™˜í‰…­É½Õ¹éÙ…È ´µ…•¹Ğ¤í‰½É‘•Èé¹½¹”í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèåÁà€ÄáÁàíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤ˆûÂ~N4ƒ²r²æ`ƒªÚ3¶Vpƒ®.“².pƒ²jS²Ê´ğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€ô±íÑ¥µ•½ÕĞèàÀÀÀ±µ…á¥µÕµ”èØÀÀÀÀ±•¹…‰±•!¥¡ÕÉ…äé™…±Í•ô¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•ÉM%9•…É1¥ÍĞ ¥ì(€½¹ÍĞ±¥ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…Èµ±¥ÍĞœ¤ì(€¥˜ …±¥ÍĞ¥É•ÑÕÉ¸ì(€±•Ğ™¥±Ñ•É•õ}Í¥9•…ÉM¡½İ±½Í•ı}Í¥9•…É±°é}Í¥9•…É±°¹™¥±Ñ•È¡ÌôùÌ¹±¥¹•Ì˜™Ì¹±¥¹•Ì¹±•¹Ñ øÀ¤ì(€€¼¼ƒ®ª£®Ns®Îƒ¶V¶ÀèƒªâÃ²Â ƒ®ª£®Np÷²^Ó²Â ƒ²‚W²Â£²^·®0°ƒ²‚²Ê€ƒ®ª£®Np÷²‚²Ê€ƒ®ã²€ƒ²^·®0(€}µ½‘•MÑ¹M•ÑÍ%¹¥Ğ ¤ì(€¥˜¡}…ÁÁ5½‘”ôôôµ•ÑÉ¼œ˜™}µ•ÑÉ½MÑ¹M•Ğ¤™¥±Ñ•É•õ™¥±Ñ•É•¹™¥±Ñ•È¡Ìôù}µ•ÑÉ½MÑ¹M•Ğ¹¡…Ì¡}ÍÑ¹	…Í•9…µ”¡Ì¹¹…µ”¤¤¤ì(€•±Í”¥˜¡}ÑÉ…¥¹MÑ¹M•Ğ¤™¥±Ñ•É•õ™¥±Ñ•É•¹™¥±Ñ•È¡Ìôù}ÑÉ…¥¹MÑ¹M•Ğ¹¡…Ì¡}ÍÑ¹	…Í•9…µ”¡Ì¹¹…µ”¤¤¤ì(€¥˜ …™¥±Ñ•É•¹±•¹Ñ ¥í±¥ÍĞ¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÍÁàíÑ•áĞµ…±¥¸é•¹Ñ•ÈíÁ…‘‘¥¹œèáÁàˆû²ó®Î²^@ƒ²jÓ²bƒ²’G²và€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œüŸ²‚²Êƒ²^´œèŸªâÃ²Â£²^´ôƒ²^²v0ğ½‘¥Øù€íÉ•ÑÕÉ¸íô(€½¹ÍĞ‘½Ñ½±½ÉÌõlœŒÍˆàÉ˜Øœ°œ˜äÜÌÄØœ°œ„àÔÕ˜Üœ°œŒÈÉŒÔÕ”œ°œ•˜ĞĞĞĞtì(€½¹ÍĞÑ½ÀÔõ™¥±Ñ•É•¹Í±¥” À°Ô¤ì((€€¼¼ƒŠRŠR ½½É‘¥¹…Ñ”µ‰…Í•µ¥¹¤µ…ÀƒŠRŠR (€±•Ğµ…ÁMYôœœì(€¥˜¡}Í¥9•…É1…Ğ„ôõ¹Õ±°¥ì(€€€½¹ÍĞ\ôÌÈÀ± ôÈÀÀì(€€€½¹ÍĞ…±±1…ÑÌõm}Í¥9•…É1…Ğ°¸¸¹Ñ½ÀÔ¹µ…À¡ÌôùÌ¹±…Ğ¥tì(€€€½¹ÍĞ…±±1½¹Ìõm}Í¥9•…É1½¸°¸¸¹Ñ½ÀÔ¹µ…À¡ÌôùÌ¹±½¸¥tì(€€€±•Ğµ¥¹1…Ğõ5…Ñ ¹µ¥¸ ¸¸¹…±±1…ÑÌ¤±µ…á1…Ğõ5…Ñ ¹µ…à ¸¸¹…±±1…ÑÌ¤ì(€€€±•Ğµ¥¹1½¸õ5…Ñ ¹µ¥¸ ¸¸¹…±±1½¹Ì¤±µ…á1½¸õ5…Ñ ¹µ…à ¸¸¹…±±1½¹Ì¤ì(€€€½¹ÍĞÉ1…Ğõµ…á1…Ğµµ¥¹1…ÑñğÀ¸ÀÀÔ±É1½¸õµ…á1½¸µµ¥¹1½¹ñğÀ¸ÀÀÔì(€€€½¹ÍĞÁ…ôÀ¸Èàì(€€€µ¥¹1…Ğ´õÉ1…Ğ©Á…ìµ…á1…Ğ¬õÉ1…Ğ©Á…ì(€€€µ¥¹1½¸´õÉ1½¸©Á…ìµ…á1½¸¬õÉ1½¸©Á…ì(€€€½¹ÍĞÑ½`õ±½¸ôø ¡±½¸µµ¥¹1½¸¤¼¡µ…á1½¸µµ¥¹1½¸¤¤©\ì(€€€½¹ÍĞÑ½dõ±…Ğôø ¡µ…á1…Ğµ±…Ğ¤¼¡µ…á1…Ğµµ¥¹1…Ğ¤¤© ì(€€€½¹ÍĞµå`õÑ½`¡}Í¥9•…É1½¸¤±µådõÑ½d¡}Í¥9•…É1…Ğ¤ì(€€€½¹ÍĞ‘½ÑÌõÑ½ÀÔ¹µ…À ¡Ì±¤¤ôø¡íàéÑ½`¡Ì¹±½¸¤±äéÑ½d¡Ì¹±…Ğ¤±Œé‘½Ñ½±½ÉÍm¥t±¹…µ”éÌ¹¹…µ”±‘¥ÍĞéÌ¹‘¥ÍÑô¤¤ì(€€€½¹ÍĞ±…‰•°ô¡±¥à¤ôùì(€€€€€€¼¼Ù½¥É¥¡Ğµ•‘”½Ù•É™±½Ü…¹½Ù•É±…Àİ¥Ñ €‹®
`ˆ±…‰•°(€€€€€½¹ÍĞ±àõ¹àù\¨À¸ØÔı¹à´Üé¹à¬Üì(€€€€€½¹ÍĞ…¹¡½Èõ¹àù\¨À¸ØÔü•¹œèÍÑ…ÉĞœì(€€€€€½¹ÍĞ±äõ¹äğÄàı¹ä¬ÄØé¹ä´Üì(€€€€€½¹ÍĞ‘¥ÍÑMÑÈõ¹‘¥ÍĞğÄü¡¹‘¥ÍĞ¨ÄÀÀÀ¤¹Ñ½¥á• À¤¬´œé¹‘¥ÍĞ¹Ñ½¥á• Ä¤¬­´œì(€€€€€É•ÑÕÉ¸€ñ¥É±”àôˆ‘í¹à¹Ñ½¥á• Ä¥ôˆäôˆ‘í¹ä¹Ñ½¥á• Ä¥ôˆÈôˆÔˆ™¥±°ôˆ‘í¹ôˆ¼ø(€€€€€€€€ñÑ•áĞàôˆ‘í±à¹Ñ½¥á• Ä¥ôˆäôˆ‘í±ä¹Ñ½¥á• Ä¥ôˆ™½¹ĞµÍ¥é”ôˆäˆ™¥±°ôˆ‘í¹ôˆ™½¹Ğµ™…µ¥±äô‰Í…¹ÌµÍ•É¥˜ˆÑ•áĞµ…¹¡½Èôˆ‘í…¹¡½Éôˆø‘í¹¹…µ•ô€ ‘í‘¥ÍÑMÑÉô¤ğ½Ñ•áĞù€ì(€€€ôì(€€€½¹ÍĞµå1äõµådğÈÈıµåd¬Äàéµåd´ÄÀì(€€€µ…ÁMYõ€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí½Ù•É™±½Üé¡¥‘‘•¸íµ…É¥¸µ‰½ÑÑ½´èÄÁÁàˆø(€€€€€€ñÍÙœİ¥‘Ñ ôˆÄÀÀ”ˆÙ¥•İ	½àôˆÀ€À€‘í]ô€‘í!ôˆÍÑå±”ô‰‘¥ÍÁ±…äé‰±½¬ˆø(€€€€€€€€‘í‘½ÑÌ¹µ…À ¡±¤¤ôù±…‰•°¡±¤¤¤¹©½¥¸ œœ¥ô(€€€€€€€€ñ¥É±”àôˆ‘íµå`¹Ñ½¥á• Ä¥ôˆäôˆ‘íµåd¹Ñ½¥á• Ä¥ôˆÈôˆÄÈˆ™¥±°ôˆŒÈÉŒÔÕ”ˆ½Á…¥ÑäôˆÀ¸Äàˆ¼ø(€€€€€€€€ñ¥É±”àôˆ‘íµå`¹Ñ½¥á• Ä¥ôˆäôˆ‘íµåd¹Ñ½¥á• Ä¥ôˆÈôˆÔˆ™¥±°ôˆŒÈÉŒÔÕ”ˆ¼ø(€€€€€€€€ñÑ•áĞàôˆ‘íµå`¹Ñ½¥á• Ä¥ôˆäôˆ‘íµå1ä¹Ñ½¥á• Ä¥ôˆ™½¹ĞµÍ¥é”ôˆäˆ™¥±°ôˆŒÈÉŒÔÕ”ˆ™½¹Ğµ™…µ¥±äô‰Í…¹ÌµÍ•É¥˜ˆÑ•áĞµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ğµİ•¥¡Ğô‰‰½±ˆû®
`ğ½Ñ•áĞø(€€€€€€€€ñÑ•áĞàôˆ‘ì¡\´Ø¤¹Ñ½¥á• À¥ôˆäôˆ‘ì¡ ´Ø¤¹Ñ½¥á• À¥ôˆ™½¹ĞµÍ¥é”ôˆàˆ™¥±°ô‰É‰„ ÄàÀ°ÄàÀ°ÄàÀ°À¸Ğ¤ˆÑ•áĞµ…¹¡½Èô‰•¹ˆ™½¹Ğµ™…µ¥±äô‰Í…¹ÌµÍ•É¥˜ˆû².“²‚pƒ²Š3¶FpƒªâÃ®Â`ğ½Ñ•áĞø(€€€€€€ğ½ÍÙœø(€€€€ğ½‘¥Øù€ì(€ô((€€¼¼ƒŠRŠR MÑ…Ñ¥½¸±¥ÍĞƒŠRŠR (€½¹ÍĞÍÑ…Ñ¥½¹1¥ÍĞõ™¥±Ñ•É•¹Í±¥” À°ÄÀ¤¹µ…À ¡Ì±¤¤ôùì(€€€½¹ÍĞ½±½Èõ¤ğÔı‘½Ñ½±½ÉÍm¥tèÙ…È ´µÑ•áĞÈ¤œì(€€€½¹ÍĞ‘¥ÍÑMÑÈõÌ¹‘¥ÍĞğÄü¡Ì¹‘¥ÍĞ¨ÄÀÀÀ¤¹Ñ½¥á• À¤¬´œéÌ¹‘¥ÍĞ¹Ñ½¥á• Ä¤¬­´œì(€€€½¹ÍĞµ…¥¹1¥¹•ÌõÌ¹±¥¹•Ì¹Í±¥” À°Ì¤¹©½¥¸ Ÿ
Üœ¤ì(€€€½¹ÍĞ•áÑÉ…1¥¹•ÌõÌ¹±¥¹•Ì¹±•¹Ñ øÌı€ƒ²fà€‘íÌ¹±¥¹•Ì¹±•¹Ñ ´Í÷ªÂpƒ®ã²€èœœì(€€€½¹ÍĞÁÉÈõÌ¹Á±…Ñ™½ÉµÍññmtì(€€€½¹ÍĞÁ±…ÑMÑÈõÁÉÈ¹±•¹Ñ øÀı€ƒ
Üƒ¶f €Åø‘í5…Ñ ¹µ…à ¸¸¹ÁÉÈ¥÷®Ê!€èœœì(€€€½¹ÍĞ¹…µ•ÍŒõÌ¹¹…µ”¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÄÁÁàíÁ…‘‘¥¹œèÄÁÁà€ÄÉÁàí‰…­É½Õ¹éÙ…È ´µ‰œÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíµ…É¥¸µ‰½ÑÑ½´èÙÁàíÕÉÍ½ÈéÁ½¥¹Ñ•Èˆ(€€€€€½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘í¹…µ•Íôœ¤ˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰µ¥¸µİ¥‘Ñ èĞáÁàí™½¹ĞµÍ¥é”èÄÑÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½Èè‘í½±½Éôí™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘í‘¥ÍÑMÑÉôğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àèÄˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÕÁàí™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘íÌ¹¹…µ•ô‘íÌ¹±¥¹•Ì¹±•¹Ñ ôôôÀüœ€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÁÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø£¶>C²^´¤ğ½ÍÁ…¸øœèœôğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µÑ½ÀèÉÁàˆø‘íµ…¥¹1¥¹•Íô‘í•áÑÉ…1¥¹•Íô‘íÁ±…ÑMÑÉôğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄáÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆûŠèğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì((€±¥ÍĞ¹¥¹¹•É!Q50õµ…ÁMY­ÍÑ…Ñ¥½¹1¥ÍĞì)ô()™Õ¹Ñ¥½¸½Á•¹MÑ…Ñ¥½¹•Ñ…¥°¡¹…µ”¥ì(€}Í¥ÕÉÉ•¹ĞõÉ…¥±MÑ…Ñ¥½¹…Ñ…9…µ”¡¹…µ”¤ì}Í¥MÕ‰Q…ˆô‘•Ñ…¥°œì}Í¥…É‘A±…Ñ™½É´õ¹Õ±°ì}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´õ¹Õ±°ì(€Íİ¥Ñ¡Q…ˆ ÍÑ…Ñ¥½¹¥¹™¼œ¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôùÉ•¹‘•ÉMÑ…Ñ¥½¹%¹™¼ ¤°ÔÀ¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•ÉM%•Ñ…¥°¡•°¥ì(€½¹ÍĞÕÉY…°ô¡}Í¥ÕÉÉ•¹Ññğœœ¤¹É•Á±…” ¼ˆ½œ°œ™ÅÕ½Ğìœ¤ì(€•°¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÉÁàˆø(€€€€ñ‘¥Ø±…ÍÌô‰…ÕÑ½½µÁ±•Ñ”µİÉ…ÀˆÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èÄÉÁàˆø(€€€€€€ñ¥¹ÁÕĞ¥ô‰Í¤µ¥¹ÀˆÑåÁ”ô‰Ñ•áĞˆÁ±…•¡½±‘•Èô‹²^´ƒ²vÓ®šƒªÊ²$€£²Ò#²ÄƒªÂ®*”°ƒ²b èƒßßÄ¤ˆÙ…±Õ”ôˆ‘íÕÉY…±ôˆ(€€€€€€€ÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèÄÁÁà€ÄÑÁàí½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹ĞµÍ¥é”èÄÑÁàí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤í‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àˆ(€€€€€€€…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆ(€€€€€€€½¹¥¹ÁÕĞô‰Í¥M•…É ¡Ñ¡¥Ì¹Ù…±Õ”¤ˆ(€€€€€€€½¹‰±ÕÈô‰Í•ÑQ¥µ•½ÕĞ  ¤ôùí½¹ÍĞÈõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÉ•ÍÕ±ÑÌœ¤í¥˜¡È¥íÈ¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíõô°ÄØÀ¤ˆ(€€€€€€€½¹­•å‘½İ¸ô‰Í¥M•…É¡-•ä¡•Ù•¹Ğ¤ˆø(€€€€€€ñ‘¥Ø¥ô‰Í¤µÉ•ÍÕ±ÑÌˆ±…ÍÌô‰…Œµ‘É½Á‘½İ¸ˆÍÑå±”ô‰‘¥ÍÁ±…äé¹½¹”ˆøğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰Í¤µ…Éˆøğ½‘¥Øøğ½‘¥Øù€ì(€¥˜¡}Í¥ÕÉÉ•¹Ğ¤É•¹‘•ÉM%…É¡}Í¥ÕÉÉ•¹Ğ¤ì)ô()™Õ¹Ñ¥½¸Í¥M•…É ¡Ä¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÉ•ÍÕ±ÑÌœ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€Äô¡Åñğœœ¤¹ÑÉ¥´ ¤ì(€¥˜ …ÅññÑåÁ•½˜MQQ%=9}ôôôÕ¹‘•™¥¹•œ¥í•°¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œí•°¹¥¹¹•É!Q50ôœœíÉ•ÑÕÉ¸íô(€½¹ÍĞÅ	…Í”õÄ¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ıÄ¹Í±¥” À°´Ä¤éÄì(€½¹ÍĞÍÑ…Ñ¥½¹9…µ•Ìõ¹•ÜM•Ğ¡=‰©•Ğ¹­•åÌ¡MQQ%=9}¤¤ì(€¥˜¡ÑåÁ•½˜11}QI%9L„ôôÕ¹‘•™¥¹•œ¥11}QI%9L¹™½É… ¡Ğôø¡Ğ¹ÍÑ½ÁÍññmt¤¹™½É… ¡Ìôùí¥˜¡Ì¹Ì˜˜¡Ì¹…ÉÉññÌ¹‘•À¤¥ÍÑ…Ñ¥½¹9…µ•Ì¹…‘¡Ì¹Ì¤íô¤¤ì(€=‰©•Ğ¹­•åÌ¡9=IQ!}MQQ%=9}Q}1%ML¤¹™½É… ¡¸ôùÍÑ…Ñ¥½¹9…µ•Ì¹…‘¡¸¤¤ì(€½¹ÍĞÕ¹¥ÅÕ•9…µ•Ìõ¹•Ü5…À ¤ì(€ÍÑ…Ñ¥½¹9…µ•Ì¹™½É… ¡¸ôùí½¹ÍĞ‰…Í”õ¸¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¸¹Í±¥” À°´Ä¤é¸í¥˜ …Õ¹¥ÅÕ•9…µ•Ì¹¡…Ì¡‰…Í”¥ñğ…¸¹•¹‘Í]¥Ñ  Ÿ²^´œ¤¥Õ¹¥ÅÕ•9…µ•Ì¹Í•Ğ¡‰…Í”±¸¤íô¤ì(€½¹ÍĞ…±°õl¸¸¹Õ¹¥ÅÕ•9…µ•Ì¹Ù…±Õ•Ì ¥t¹™¥±Ñ•È¡¸ôù¥ÍI…¥±MÑ…Ñ¥½¹%¹I•¥½¸¡¸¤¤¹™¥±Ñ•È¡¸ôùì(€€€½¹ÍĞ¹Ìõ¸¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¸¹Í±¥” À°´Ä¤é¸ì(€€€É•ÑÕÉ¸µ…Ñ¡•ÍEÕ•Éä¡¸±Ä¥ññµ…Ñ¡•ÍEÕ•Éä¡¹Ì±Ä¥ññµ…Ñ¡•ÍEÕ•Éä¡¹Ì±Å	…Í”¤ì(€ô¤ì(€…±°¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€½¹ÍĞ…Lõ„¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı„¹Í±¥” À°´Ä¤é„ì(€€€½¹ÍĞ‰Lõˆ¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ıˆ¹Í±¥” À°´Ä¤éˆì(€€€½¹ÍĞ…Hô¡…LôôõÅ	…Í•ññ„ôôõÄ¤üÀé…L¹ÍÑ…ÉÑÍ]¥Ñ ¡Å	…Í”¤üÄèÈì(€€€½¹ÍĞ‰Hô¡‰LôôõÅ	…Í•ññˆôôõÄ¤üÀé‰L¹ÍÑ…ÉÑÍ]¥Ñ ¡Å	…Í”¤üÄèÈì(€€€É•ÑÕÉ¸…H„ôõ‰Hı…Hµ‰Hé„¹±½…±•½µÁ…É”¡ˆ°­¼œ¤ì(€ô¤ì(€½¹ÍĞÉ•Ìõ…±°¹Í±¥” À°ÄÈ¤ì(€¥˜ …É•Ì¹±•¹Ñ ¥í•°¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œí•°¹¥¹¹•É!Q50ôœœíÉ•ÑÕÉ¸íô(€½¹ÍĞ¥Í¡½DõÄ¹ÍÁ±¥Ğ œœ¤¹•Ù•Éä¡Œôù!<¹¥¹±Õ‘•Ì¡Œ¤¤ì(€•°¹¥¹¹•É!Q50õÉ•Ì¹µ…À¡¸ôùì(€€€½¹ÍĞ¹ˆõ¸¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¸¹Í±¥” À°´Ä¤é¸ì€€€¼¼ƒªÊ²$ƒ¶Fs².s®*Pƒ® ƒ²vÓ®š£Š^/Š^,¤(€€€±•Ğ‘¥ÍÁ±…äõ¹ˆì(€€€¥˜ …¥Í¡½D¥ì(€€€€€½¹ÍĞ¤õ¹ˆ¹¥¹‘•á=˜¡Å	…Í•ññÄ¤ì(€€€€€¥˜¡¤øôÀ¥í½¹ÍĞ0ô¡Å	…Í•ññÄ¤¹±•¹Ñ í‘¥ÍÁ±…äõ¹ˆ¹Í±¥” À±¤¤­€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ…•¹Ğ¤ˆø‘í¹ˆ¹Í±¥”¡¤±¤­0¥ôğ½ÍÁ…¸ù€­¹ˆ¹Í±¥”¡¤­0¤íô(€€€ô(€€€½¹ÍĞ¹ÍŒõ¸¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰…Œµ¥Ñ•´ˆ½¹µ½ÕÍ•‘½İ¸ô‰•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤íÍ¥M•±•Ğ œ‘í¹Íôœ¤ˆø‘í‘¥ÍÁ±…åôğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€•°¹±…ÍÍ9…µ”ô…Œµ‘É½Á‘½İ¸½Á•¸œì(€•°¹ÍÑå±”¹‘¥ÍÁ±…äô‰±½¬œì)ô()™Õ¹Ñ¥½¸Í¥M•…É¡-•ä¡”¥ì(€½¹ÍĞ‘É½Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÉ•ÍÕ±ÑÌœ¤ì(€¥˜ …‘É½Áññ‘É½À¹ÍÑå±”¹‘¥ÍÁ±…äôôô¹½¹”œ¥É•ÑÕÉ¸ì(€½¹ÍĞ¥Ñ•µÌõ‘É½À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹…Œµ¥Ñ•´œ¤ì(€¥˜ …¥Ñ•µÌ¹±•¹Ñ ¥É•ÑÕÉ¸ì(€±•Ğ¥‘àô´Äì(€¥Ñ•µÌ¹™½É…  ¡¥Ğ±¤¤ôùí¥˜¡¥Ğ¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì …Ñ¥Ù”œ¤¥¥‘àõ¤íô¤ì(€¥˜¡”¹­•äôôôÉÉ½İ½İ¸œ¥í”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í¥‘àõ5…Ñ ¹µ¥¸¡¥‘à¬Ä±¥Ñ•µÌ¹±•¹Ñ ´Ä¤íô(€•±Í”¥˜¡”¹­•äôôôÉÉ½İUÀœ¥í”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í¥‘àõ5…Ñ ¹µ…à¡¥‘à´Ä°À¤íô(€•±Í”¥˜¡”¹­•äôôô¹Ñ•Èœ¥ì(€€€”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€½¹ÍĞĞõ¥Ñ•µÍm5…Ñ ¹µ…à¡¥‘à°À¥tì(€€€¥˜¡Ğ¥Ğ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•Ü5½ÕÍ•Ù•¹Ğ µ½ÕÍ•‘½İ¸œ¤¤ì(€€€É•ÑÕÉ¸ì(€ô•±Í”¥˜¡”¹­•äôôôÍ…Á”œ¥í‘É½À¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíÉ•ÑÕÉ¸íô(€•±Í”É•ÑÕÉ¸ì(€¥Ñ•µÌ¹™½É…  ¡¥Ğ±¤¤ôù¥Ğ¹±…ÍÍ1¥ÍĞ¹Ñ½±” …Ñ¥Ù”œ±¤ôôõ¥‘à¤¤ì(€¥˜¡¥Ñ•µÍm¥‘át¥¥Ñ•µÍm¥‘át¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è¹•…É•ÍĞô¤ì)ô()™Õ¹Ñ¥½¸Í¥M•±•Ğ¡¹…µ”¥ì(€¹…µ”õÉ…¥±MÑ…Ñ¥½¹…Ñ…9…µ”¡¹…µ”¤ì(€}Í¥ÕÉÉ•¹Ğõ¹…µ”ì}Í¥…É‘A±…Ñ™½É´õ¹Õ±°ì}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´õ¹Õ±°ì(€½¹ÍĞ¥¹Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¥¹Àœ¤ì(€¥˜¡¥¹À¥¥¹À¹Ù…±Õ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì€€€¼¼ƒªÊ²'²Â÷²v ƒ® ƒ²vÓ®š£Š^/Š^,¤(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÉ•ÍÕ±ÑÌœ¤ì(€¥˜¡•°¥í•°¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œí•°¹¥¹¹•É!Q50ôœœíô(€É•¹‘•ÉM%…É¡¹…µ”¤ì)ô()™Õ¹Ñ¥½¸}•ÑA±…Ñ™½Éµ%¹™¼¡ÍÑ…Ñ¥½¹9…µ”°Á±…Ñ™½Éµ9Õ´¥ì(€¥˜¡ÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÌõA1Q=I5}	mÍÑ…Ñ¥½¹9…µ•tì(€¥˜ …Ì¥É•ÑÕÉ¸¹Õ±°ì(€É•ÑÕÉ¸ÍmMÑÉ¥¹œ¡Á±…Ñ™½Éµ9Õ´¥uññ¹Õ±°ì)ô()™Õ¹Ñ¥½¸}É…‘•5…Ñ¡•ÍA±…Ñ™½É´¡ÑÉ…¥¹É…‘”°Á±…Ñ™½ÉµÉ…‘•Ì¥ì(€¥˜ …Á±…Ñ™½ÉµÉ…‘•ÍññÁ±…Ñ™½ÉµÉ…‘•Ì¹±•¹Ñ ôôôÀ¥É•ÑÕÉ¸ÑÉÕ”ì(€™½È¡½¹ÍĞÁœ½˜Á±…Ñ™½ÉµÉ…‘•Ì¥ì(€€€¥˜¡Áœôôô-Q`œ˜˜¡ÑÉ…¥¹É…‘”ôôô-Q`ññÑÉ…¥¹É…‘”ôôô-Q`·²
Ã²ÊpññÑÉ…¥¹É…‘”ôôô-Q`·²vÓ²v0œ¤¥É•ÑÕÉ¸ÑÉÕ”ì(€€€¥˜¡ÁœôôôMIPœ˜™ÑÉ…¥¹É…‘”ôôôMIPœ¥É•ÑÕÉ¸ÑÉÕ”ì(€€€¥˜¡Áœôôô%Q`·²#®#²vœ˜™ÑÉ…¥¹É…‘”ôôô%Q`·²#®#²vœ¥É•ÑÕÉ¸ÑÉÕ”ì(€€€¥˜¡Áœôôô%Q`·²Ê·²Ú`œ˜™ÑÉ…¥¹É…‘”ôôô%Q`·²Ê·²Ú`œ¥É•ÑÕÉ¸ÑÉÕ”ì(€€€¥˜¡Áœôôô%Q`·®#²v0œ˜™ÑÉ…¥¹É…‘”ôôô%Q`·®#²v0œ¥É•ÑÕÉ¸ÑÉÕ”ì(€€€¥˜¡ÁœôôôŸ®²ÓªÚ¶fS¶bàœ˜˜¡ÑÉ…¥¹É…‘”ôôôŸ®²ÓªÚ¶fS¶bàññÑÉ…¥¹É…‘”ôôôŸ®²ÓªÚ¶bã¶fPœ¤¥É•ÑÕÉ¸ÑÉÕ”ì(€ô(€É•ÑÕÉ¸™…±Í”ì)ô((¼¼ƒŠRŠR ƒ².“²
³²j¤ƒ²*çªÂW²z”€£ªÊ3²zƒªâÃ®Â`°‘…Ñ„½¹¥µ‰¥}É•…±Á±…Ğ¹©Ì¤ƒŠRŠR (¼¼ÑÉ…¥¹9…µ”èƒ²^´ƒ²‚G®¾ã²
°ƒ²^®*Pƒ²^´ƒ²vÓ®š€¡I1}A1Pƒ¶
¤¸¹…µ”èMQQ%=9}½A1Q=I5}ƒ¶
£²^´ƒ¶>³¶V ¤¸)¥˜¡ÑåÁ•½˜A1Q=I5}„ôôÕ¹‘•™¥¹•œ¥ì(€¥˜ …A1Q=I5}	lŸ²z—²"`£²‚®Ú§²^´t¥ì(€€€A1Q=I5}	lŸ²z—²"`£²‚®Ú§²^´tõì(€€€€€€ÄéíœélŸ®²ÓªÚ¶fS¶bàt±°élŸ²3®ÂÇ²€uô°(€€€€€€Èéíœémt±°émuô°(€€€€€€Ìéíœémt±°émuô°(€€€€€€ĞéíœélŸ®²ÓªÚ¶fS¶bàt±°élŸ²3®ÂÇ²€uô(€€€ôì(€ô(€¥˜ …A1Q=I5}	lŸ®Ú¶>$£²‚W²€§²^´t¥ì(€€€A1Q=I5}	lŸ®Ú¶>$£²‚W²€§²^´tõì(€€€€€€ÄéíœélŸ®²ÓªÚ¶fS¶bàt±°élŸ²‚W²ƒ²€uô°(€€€€€€ÈéíœélŸ®²ÓªÚ¶fS¶bàt±°élŸ²‚W²ƒ²€uô(€€€ôì(€ô)ô(¼¼ƒªÎ×¶Ôƒ²Êƒ®>ƒªŞs²ædè©Ì½Í¡…É•½¹¥µ‰¥}É…¥±}‘½µ…¥¸¹©Ì(¼¼ƒ².“®6Ã²vÓ¶ÃªÂ ƒ²^®*Pƒ²‚W²Â£®0ƒ¶rÓ®š³²*“¶.Ä£®NÇªâ'
ß®Â§®¦Ó
ß¶*ã²r §²ró®†pƒ¶>Ó®ÂÄ)™Õ¹Ñ¥½¸}¡•ÕÉ¥ÍÑ¥A±…Ñ™½É´¡¹…µ”°ÑÉ…¥¹Ì°Ğ¥ì(€¥˜¡ÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•ñğ…A1Q=I5}	m¹…µ•t¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÁÌõ=‰©•Ğ¹­•åÌ¡A1Q=I5}	m¹…µ•t¤¹µ…À¡9Õµ‰•È¤(€€€€¹™¥±Ñ•È¡Àôùí½¹ÍĞ¤õA1Q=I5}	m¹…µ•umMÑÉ¥¹œ¡À¥tíÉ•ÑÕÉ¸¤˜˜¡¤¹œ¹±•¹Ñ øÁññ¤¹°¹±•¹Ñ øÀ¤íô¤(€€€€¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€™½È¡½¹ÍĞÀ½˜ÁÌ¥ì(€€€¥˜¡}•Ñ¥±Ñ•É•‘QÉ…¥¹Í½ÉA±…Ñ™½É´¡¹…µ”±ÑÉ…¥¹Ì±À¤¹Í½µ”¡àôùà¹¹¼ôôõĞ¹¹¼¤¥É•ÑÕÉ¸Àì(€ô(€É•ÑÕÉ¸¹Õ±°ì)ô(¼¼ƒ²^Ó²Â£ªÂ ƒ²vĞƒ²^·²^C²pƒ².“²‚pƒ²
³²j§¶Vc®*Pƒ²*çªÂW²z”€£ªÊ3²zƒ²jÃ²€°ƒ²^²ró®¦Ğƒ¶rÓ®š³²*“¶.Ä¤)™Õ¹Ñ¥½¸}Á±…Ñ™½Éµ½ÉQÉ…¥¸¡¹…µ”°ÑÉ…¥¹9…µ”°ÑÉ…¥¹Ì°Ğ¥ì(€½¹ÍĞÈõ}É•…±A±…Ñ™½É´¡Ğ¹¹¼°ÑÉ…¥¹9…µ”¤ì(€¥˜¡È„õ¹Õ±°¥É•ÑÕÉ¸Èì(€É•ÑÕÉ¸}¡•ÕÉ¥ÍÑ¥A±…Ñ™½É´¡¹…µ”°ÑÉ…¥¹Ì°Ğ¤ì)ô(¼¼ƒ²vĞƒ²^·²^@ƒ².“²‚pƒ²‚W²Â £¶×ªÎğƒ²‚s²fà§¶Vc®*Pƒ²^Ó²Â ƒ®ª§®†t)™Õ¹Ñ¥½¸}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¥ì(€ÑÉ…¥¹9…µ”õÉ…¥±MÑ…Ñ¥½¹…Ñ…9…µ”¡ÑÉ…¥¹9…µ”¤ì(€É•ÑÕÉ¸•ÑI…¥±QÉ…¥¹Í	åMÑ…Ñ¥½¸¡ÑÉ…¥¹9…µ”¤¹™¥±Ñ•È¡Ğôùì(€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùÉ…¥±MÑ…Ñ¥½¹…Ñ…9…µ”¡à¹Ì¤ôôõÑÉ…¥¹9…µ”¤ì(€€€É•ÑÕÉ¸Ì˜˜¡¡…ÍQ¥µ”¡Ì¹‘•À¥ññ¡…ÍQ¥µ”¡Ì¹…ÉÈ¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤ì(€ô¤ì)ô(¼¼ƒ²†Ã¶j3²^·²vĞƒ²vĞƒ²^Ó²Â£²v`ƒ²Š²Â§²^·²vãªÂ €£®.ç²^·²Š²Â¤¤)™Õ¹Ñ¥½¸}¥ÍQ•Éµ¥¹ÕÍĞ¡Ğ°ÑÉ…¥¹9…µ”¥ì(€¥˜¡Ğ¹‘•ÍĞôôõÑÉ…¥¹9…µ”¤É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€É•ÑÕÉ¸€„„¡Ì˜™¡…ÍQ¥µ”¡Ì¹…ÉÈ¤˜˜…¡…ÍQ¥µ”¡Ì¹‘•À¤¤ì)ô(¼¼ƒ²^´ƒ²Š3¶Fp€¡‰…Í”ƒ²vÓ®šƒŠHMQQ%=9}°ƒ®Î²æ´ƒ¶>Ó®ÂÄƒ¶>³¶V ¤)™Õ¹Ñ¥½¸}Í¥MÑ¹½½É¡‰…Í”¥ì(€É•ÑÕÉ¸}ÍÑ¹½½É¡‰…Í”¤ì)ô(¼¼ƒ²vĞƒ²^Ó²Â£²v`ƒ²†Ã¶j3²^´ƒªâÃ²’ ƒ²²‚¿²¶nƒ²‚W²Â£²^´€£¶×ªÎğƒ²‚s²fà¤)™Õ¹Ñ¥½¸}…‘©MÑ½Á=˜¡Ğ°ÑÉ…¥¹9…µ”¥ì(€½¹ÍĞÍÑ½ÁÌõĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¤ì(€½¹ÍĞ¤õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹ÌôôõÑÉ…¥¹9…µ”¤ì(€É•ÑÕÉ¸íÁÉ•Øé¤øÀıÍÑ½ÁÍm¤´Åt¹Ìé¹Õ±°°¹•áĞè¡¤øôÀ˜™¤ñÍÑ½ÁÌ¹±•¹Ñ ´Ä¤ıÍÑ½ÁÍm¤¬Åt¹Ìé¹Õ±±ôì)ô(¼¼ƒ¶n®ÎĞƒ²^´ƒ²’Dƒ¶b²z³²^·²^C²pƒªÂ²z”ƒªÂªæ3²jĞƒ²^´€£².“²Š3¶Fp¤ƒŠPƒªâ'¶Z'²vĞƒ²3²^´ƒ¶×ªÎó¶VÓ®>ƒ²f¶Z$ƒªâÃ²’ ƒ²ÖsªŞó²‚G²^´ƒ²ƒ¶t)™Õ¹Ñ¥½¸}¹•…É•ÍÑMÑ¸¡™É½µ	…Í”°…¹‘Ì¥ì(€½¹ÍĞ…ÉÈõl¸¸¹¹•ÜM•Ğ¡…¹‘Ì¹™¥±Ñ•È¡	½½±•…¸¤¥tì(€¥˜¡…ÉÈ¹±•¹Ñ ğôÄ¤É•ÑÕÉ¸…ÉÉlÁuññ¹Õ±°ì(€½¹ÍĞÕÈõ}Í¥MÑ¹½½É¡™É½µ	…Í”¤ì(€¥˜¡ÕÈ˜™ÑåÁ•½˜¡…Ù•ÉÍ¥¹•-´ôôô™Õ¹Ñ¥½¸œ¥ì(€€€…ÉÈ¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€€€½¹ÍĞ„õ}Í¥MÑ¹½½É¡„¤°ˆõ}Í¥MÑ¹½½É¡ˆ¤ì(€€€€€½¹ÍĞ‘„õ„ı¡…Ù•ÉÍ¥¹•-´¡ÕÈ¹±…Ğ±ÕÈ¹±½¸±„¹±…Ğ±„¹±½¸¤èå”äì(€€€€€½¹ÍĞ‘ˆõˆı¡…Ù•ÉÍ¥¹•-´¡ÕÈ¹±…Ğ±ÕÈ¹±½¸±ˆ¹±…Ğ±ˆ¹±½¸¤èå”äì(€€€€€É•ÑÕÉ¸‘„µ‘ˆì(€€€ô¤ì(€ô(€É•ÑÕÉ¸…ÉÉlÁtì)ô((¼¼ƒŠRŠR ƒÂ~jƒ²‚²Ê€ƒ²^´ƒ².sªÂ¶Fpƒ®ÎÓ®Np€£²vãªÊ3²zƒ²*“²ò²’5QI=}M!ƒªâÃ®Â`¤ƒŠRŠR (¼¼ƒ®Â§®¦Ğ£®ã²€¯²Š²Â¤§®Îƒ²Ê¯²Â£
ß®'²Â£
ß®.“²v0ƒ²^Ó²Â £².sªÂ¶Fp¤€¬ƒ²^´ƒ²‚²ÊĞƒ¶b²z°ƒ²jÓ¶Z$ƒ¶:ã²"`¸)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•½±½È¡¹…µ”¥ì½¹ÍĞ°ô¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}1%9L¹™¥¹¡àôùà¹¹…µ”ôôõ¹…µ”¤ìÉ•ÑÕÉ¸°ı°¹½±½ÈèœŒáˆäĞå”œìô(¼¼ƒ®NÇªâ$ƒ®ÂÃ² è€Ä÷ªâ'¶Z$°€È÷¶*çªâ$€£²vó®Âc²v ƒ¶Fs².pƒ²^²v0¤)™Õ¹Ñ¥½¸}µ•ÑÉ½±ÍQ…œ¡Œ¥ìÉ•ÑÕÉ¸ŒôôôÈüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀµÑˆµ•áÀ´µĞˆû¶*çªâ$ğ½ÍÁ…¸øœéŒôôôÄüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀˆûªâ'¶Z$ğ½ÍÁ…¸øœèœœìô(¼¼ƒ²^´ƒ²‚ªÒG¶2@ƒ²fã¶bTƒ®Ú®–`¸ƒ²jÓ¶Z$ƒ®†s²²v ƒ®>g²vó¶VcªÎ€ƒ¶Fs².pƒ²z—²æc²v`ƒ²ã®2
ß¶bW¶s®0ƒªÖ³®Ú¶Vs®.¸)½¹ÍĞ5QI=}=55UQI}	=I}1%9Lõ¹•ÜM•Ğ¡l(€€ŸªÊ÷®Ú²€œ°ŸªÖ³²vã²€œ°Ÿ²‚®Ú²€œ°Ÿ²Ú§²Ê·²€œ°Ÿ²‚®
£²€œ°ŸªÖ³®¾ã²€œ°ŸªÎƒ®‚ç¶Vc²ZG²€œ°(€€ŸªÊ÷²vc²’G²Vg²€œ°Ÿ²z—¶bã²nC²€œ°Ÿ²Š²nC²€œ°Ÿ²Úc²Ês²€œ°(€€ŸªÒG²ó²®ª§²€œ°Ÿ¶>'¶w²V#²Ç²€œ°Ÿ¶fS²Ç²€œ°Ÿ®>g®
£²€œ°Ÿªæ¶VÓªÆÃ²‚s²€œ°(€€Ÿ®2ªÖ³®Â²ZG²€œ°Ÿ¶>³¶V·²€œ)t¤ì)½¹ÍĞ5QI=}	=I}MQ%=9}IU1Lõl(€í±¥¹”èŸªÊ÷®Ú²€œ±™É½´èŸ²Ê·®~'®š°œ±Ñ¼èŸ²s²jàœ±­¥¹èÕÉ‰…¸ô°(€í±¥¹”èŸªÊ÷ªâÃ®Ú®Ú²€œ±™É½´èŸ²Êƒ²n@œ±Ñ¼èŸ²vc²‚W®Ú œ±­¥¹èÉ•¥½¹…°ô°(€í±¥¹”èŸ®ã²nC²€œ±™É½´èŸ²Êƒ²n@œ±Ñ¼èŸ²vc²‚W®Ú œ±­¥¹èÉ•¥½¹…°ô°(€í±¥¹”èŸ²Š²nC²€œ±™É½´èŸ²Ê·®~'®š°œ±Ñ¼èŸ²¶v³ªÎ×²n@œ±­¥¹èÕÉ‰…¸ô°(€í±¥¹”èŸ¶>³¶V·²€œ±™É½´èŸ¶>³¶V´œ±Ñ¼èŸ²b“²Êpœ±­¥¹èÕÉ‰…¸ô)tì)™Õ¹Ñ¥½¸}µ•ÑÉ½	½…É‘M•Ñ¥½¹½¹Ñ…¥¹Ì¡ÉÕ±”±ÍÑ¸¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!mÉÕ±”¹±¥¹•tì(€½¹ÍĞ¹…µ•Ìõ•¹Ğ˜™•¹Ğ¹Ìì(€¥˜ …¹…µ•Ì¥É•ÑÕÉ¸™…±Í”ì(€½¹ÍĞ„õ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹™É½´¤±ˆõ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹Ñ¼¤±¤õ¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¸¤ì(€É•ÑÕÉ¸„øôÀ˜™ˆøôÀ˜™¤øõ5…Ñ ¹µ¥¸¡„±ˆ¤˜™¤ğõ5…Ñ ¹µ…à¡„±ˆ¤ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½	½…É‘-¥¹¡±¥¹”±ÍÑ¸¥ì(€½¹ÍĞÍ•Ñ¥½¸õ5QI=}	=I}MQ%=9}IU1L¹™¥¹¡ÉÕ±”ôùÉÕ±”¹±¥¹”ôôõ±¥¹”˜™}µ•ÑÉ½	½…É‘M•Ñ¥½¹½¹Ñ…¥¹Ì¡ÉÕ±”±ÍÑ¸¤¤ì(€¥˜¡Í•Ñ¥½¸¥É•ÑÕÉ¸Í•Ñ¥½¸¹­¥¹ì(€É•ÑÕÉ¸5QI=}=55UQI}	=I}1%9L¹¡…Ì¡±¥¹”¤üÉ•¥½¹…°œèÕÉ‰…¸œì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½	½…É‘A±…Ñ™½ÉµÌ¡ÍÑ¸±±¥¹”¥ì(€¥˜¡ÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸mtì(€½¹ÍĞ­•äõA1Q=I5}	mÍÑ¹tıÍÑ¸è¡A1Q=I5}	mÍÑ¸¬Ÿ²^´tıÍÑ¸¬Ÿ²^´œé¹Õ±°¤ì¥˜ …­•ä¥É•ÑÕÉ¸mtì(€É•ÑÕÉ¸=‰©•Ğ¹­•åÌ¡A1Q=I5}	m­•åt¤¹µ…À¡9Õµ‰•È¤¹™¥±Ñ•È¡9Õµ‰•È¹¥Í¥¹¥Ñ”¤¹™¥±Ñ•È¡Àôø(€€€€¡A1Q=I5}	m­•åumÁtü¹±ññmt¤¹Í½µ”¡É…Üôùì(€€€€€½¹ÍĞ‰…Í”õMÑÉ¥¹œ¡É…Ü¤¹ÍÁ±¥Ğ œ¼œ¥lÁt¹ÍÁ±¥Ğ œ€ œ¥lÁt¹ÑÉ¥´ ¤ì(€€€€€É•ÑÕÉ¸‰…Í”ôôõ±¥¹”ì(€€€ô¤(€€¤¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì)ô(¼¼ØØƒ².sªÂ¶FpƒªâÃ®Â`èƒªÂƒ¶:ã²ÄÑm¥tõo®>²Â§®Ú³²Ús®Âs®Ú³²^µ¥‘à°€¸¸¹t€£²‚W²Â£®#®.ƒ®>²Â§
ß²Ús®Âpƒ²24°ƒ®Î×²n@ƒ²^²v0¤¸(¼¼ƒ¶Vpƒ²^·²vƒ²®
c®*Pƒ®ª£®N€ƒ²²‚C²^C²pƒ²Ús®Âs¶:àƒ²w²Ä¸ƒ¶Z'²ƒ² ÷²¶Z'®Â§¶Z”ƒ¶j3²Â£²‚@£²fW®ÎÔ§
ß®#²®'²^´£²¶Ô¤°(¼¼ƒ²Ús®Âs² ÷²¶Z$ƒ®Âc®2®Â§¶Z”ƒ¶j3²Â£²‚C
ß²Ê¯²^´¸…ÑM•Œ÷²vĞƒ²^´ƒ²Ús®Âp¡¤°…ÉÈ÷®#²®'²^´ƒ®>²Â¤¡„¤¸)™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ…Ñ¥½¹•ÁÌ¡ÍÑ¸¥ì(€¥˜¡ÑåÁ•½˜5QI=}M!ôôôÕ¹‘•™¥¹•œ¤É•ÑÕÉ¸mtì(€½¹ÍĞ½ÕĞõmtì(€™½È¡½¹ÍĞ±¥¹”¥¸5QI=}M!¥ì(€€€½¹ÍĞ•¹Ğõ5QI=}M!m±¥¹•t°¹…µ•Ìõ•¹Ğ¹Ì°ÍÙÌõ•¹Ğ¹Ğì(€€€¥˜ …¹…µ•Ì¹¥¹±Õ‘•Ì¡ÍÑ¸¤¤½¹Ñ¥¹Õ”ì(€€€½¹ÍĞÍ%‘àõ¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¸¤°ÉÈõ•¹Ğ¹Œì(€€€™½È¡±•ĞÍ¤ôÀíÍ¤ñÍÙÌ¹±•¹Ñ íÍ¤¬¬¥ì(€€€€€½¹ÍĞ˜õÍÙÍmÍ¥t°±ÌõÉÈıÉÉmÍ¥tèÀì(€€€€€½¹ÍĞ¸õ˜¹±•¹Ñ ¼Ì°¥àõ¬ôù™lÌ©¬¬Étì(€€€€€™½È¡±•Ğ¬ôÀí¬ñ¸´Äí¬¬¬¥ì(€€€€€€€¥˜¡¥à¡¬¤„ôõÍ%‘à¤½¹Ñ¥¹Õ”ì(€€€€€€€¥˜¡¥à¡¬¬Ä¤ôôõÍ%‘à¤½¹Ñ¥¹Õ”ì€€€€€€€€€€€€€€€€€€€€€€¼¼ƒ®.ç²^·²Š²Â¤£®>²Â¤¤ƒ²²‚@ƒ²*“¶
ÔƒŠPƒ¶j3²Â ƒ²Ús®Âpƒ²²‚C®0ƒ²rƒ² (€€€€€€€½¹ÍĞ¹•áÑ9…µ”õ¹…µ•Ím¥à¡¬¬Ä¥tì(€€€€€€€€¼¼ƒ¶Z'²ƒ² èƒ²¶Z'®Â§¶Z”ƒ¶j3²Â£²‚@¡ùù
ß²^Ã²7²’G®ÎÔ¤ƒªâÃ²’²ró®†p±•œƒ®Ú¶V€ƒŠPƒ¶j3²Â£²‚@ƒ²vÓ²‚ªæ3² °ƒ²^²ró®¦Ğƒ®#²®'²^´(€€€€€€€€¼¼€£ªÎ‡²‚WŠK²vÓ²ÊsŠK²nC¶>$ƒ²Ús²zªÎ€ƒ¶:ã²Ç²v ƒªÎ‡²‚WŠë²vÓ²Êp°ƒ²vÓ²ÊsŠë²nC¶>$ƒ®F@±•Ÿ®†pƒ®Ú¶V€ƒ¶FsªâÀ¤(€€€€€€€±•Ğ‘•ÍĞõ¹…µ•Ím¥à¡¸´Ä¥t°¬Äõ¸´Äì(€€€€€€€™½È¡±•Ğ¨õ¬¬Äí¨ñ¸´Äí¨¬¬¥ì(€€€€€€€€€¥˜¡¥à¡¨¬Ä¤ôôõ¥à¡¨¤¥ì‘•ÍĞõ¹…µ•Ím¥à¡¨¥tì¬Äõ¨ì‰É•…¬ìô(€€€€€€€€€¥˜¡¥à¡¨¬Ä¤ôôõ¥à¡¨´Ä¤¥ì‘•ÍĞõ¹…µ•Ím¥à¡¨¥tì¬Äõ¨ì‰É•…¬ìô(€€€€€€€ô(€€€€€€€¥˜¡‘•ÍĞôôõÍÑ¸¤½¹Ñ¥¹Õ”ì€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼ƒ®.ç²^·²Š²Â¤£²zCªâÀƒ²^´ƒ¶Z'²ƒ² §²v ƒ²Ús®Âs¶:ã²vĞƒ²V®.`(€€€€€€€€¼¼ƒ²Ús®Âs² èƒ¶j3²Â ƒ²Ús®Âp£²²‚ƒ®>g²vó²^´÷®.ç²^·²Š²Â¤ƒ¶nƒ²Ús®Âp°ƒ®bC®*Pùùƒ²‚W²‚@÷²vĞƒ²^·²vĞƒ¶j3²Â£²^´§²vÓ®¦Ğƒ²vĞƒ²^´(€€€€€€€±•Ğ½É¥œ°¬Àì(€€€€€€€¥˜¡¬øÀ€˜˜€¡¥à¡¬´Ä¤ôôõÍ%‘àñğ¥à¡¬´Ä¤ôôõ¥à¡¬¬Ä¤¤¥ì½É¥œõÍÑ¸ì¬Àõ¬ìô(€€€€€€€•±Í”ì(€€€€€€€€€½É¥œõ¹…µ•Ím¥à À¥tì¬ÀôÀì(€€€€€€€€€™½È¡±•Ğ¨õ¬´Äí¨øÀí¨´´¥ì(€€€€€€€€€€€¥˜¡¥à¡¨´Ä¤ôôõ¥à¡¨¤¥ì½É¥œõ¹…µ•Ím¥à¡¨¥tì¬Àõ¨ì‰É•…¬ìô(€€€€€€€€€€€¥˜¡¥à¡¨´Ä¤ôôõ¥à¡¨¬Ä¤¥ì½É¥œõ¹…µ•Ím¥à¡¨¥tì¬Àõ¨ì‰É•…¬ìô(€€€€€€€€€ô(€€€€€€€ô(€€€€€€€½¹ÍĞ…Ñ5¥¸õ™lÌ©¬¬Åtì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼ƒ²vĞƒ²^´ƒ²Ús®Âp¡¤(€€€€€€€½ÕĞ¹ÁÕÍ ¡í±¥¹”°¹•áĞé¹•áÑ9…µ”°‘•ÍĞ°½É¥œ°±Ì°ÍÙŒéÍ¤°…ÑM•Œé…Ñ5¥¸¨ØÀ°‘•Àé™lÅt°…ÉÈé™lÌ¨¡¸´Ä¥t°¬À°¬Åô¤ì(€€€€€ô(€€€ô(€ô(€É•ÑÕÉ¸½ÕĞì)ô(¼¼ƒ®Â§®¦Ğƒ²Ús®Âs¶:àƒ®ª§®†tƒŠHƒ²jÓ¶Z'²vó²Ò ƒ²‚W®‚°£²’G®ÎÔƒ®Úƒ²‚sªÆÀ¤¸ØÌƒ².“²â„ƒ².sªÂ¶Fs®–ğƒªŞã®2®†pƒ®Âc²b£®ÎÓªÂƒ²^²v0¤¸)™Õ¹Ñ¥½¸}µ•ÑÉ½¥É¹ÑÉ¥•Ì¡±¥ÍĞ±ÁÉ•Í•ÉÙ•1¥¹•Ìõ™…±Í”¥ì(€½¹ÍĞÍÉÙM•ŒõÌôø  ¡Ì´ÄĞĞÀÀ¤”àØĞÀÀ¤¬àØĞÀÀ¤”àØĞÀÀì(€½¹ÍĞÉ•…°õ±¥ÍĞ¹µ…À¡¼ôø¡íÍ•ŒéÍÉÙM•Œ¡¼¹…ÑM•Œ¤±‘•ÍĞé¼¹‘•ÍĞ±½É¥œé¼¹½É¥œ±¹•áĞé¼¹¹•áĞ±±Ìé¼¹±Ì±ÍÙŒé¼¹ÍÙŒ±±¥¹”é¼¹±¥¹”±¬Àé¼¹¬À±¬Äé¼¹¬Åô¤¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹Í•Œµˆ¹Í•Œ¤ì(€½¹ÍĞÍ••¸õ¹•ÜM•Ğ ¤ì(€½¹ÍĞ•¹ÑÉ¥•ÌõÉ•…°¹™¥±Ñ•È¡¼ôùí½¹ÍĞ´õ5…Ñ ¹™±½½È¡¼¹Í•Œ¼ØÀ¤±­•äõÁÉ•Í•ÉÙ•1¥¹•Ìı€‘í¼¹±¥¹•õğ‘íµõ€é´ì¥˜¡Í••¸¹¡…Ì¡­•ä¤¥É•ÑÕÉ¸™…±Í”ìÍ••¸¹…‘¡­•ä¤ìÉ•ÑÕÉ¸ÑÉÕ”íô¤ì(€½¹ÍĞÍ•Ìõ•¹ÑÉ¥•Ì¹µ…À¡¼ôù5…Ñ ¹™±½½È¡¼¹Í•Œ¼ØÀ¤¨ØÀ¤ì(€É•ÑÕÉ¸í•¹ÑÉ¥•Ì°™¥ÉÍĞéÍ•ÍlÁt°±…ÍĞéÍ•ÍmÍ•Ì¹±•¹Ñ ´Åuôì)ô(¼¼ƒ®ã²ƒ®Îƒ²^·®ªŠK²Š3¶Fp€¡5QI=}1%9LÉ½ÕÑ•ÌƒªâÃ®Â`°ƒ®¦S®ª£²vÓ²š ¤)±•Ğ}µ•ÑÉ½ae…¡”õíôì)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•ad¡±¥¹•9…µ”¥ì(€¥˜¡±¥¹•9…µ”¥¸}µ•ÑÉ½ae…¡”¤É•ÑÕÉ¸}µ•ÑÉ½ae…¡•m±¥¹•9…µ•tì(€½¹ÍĞ°ô¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}1%9L¹™¥¹¡àôùà¹¹…µ”ôôõ±¥¹•9…µ”¤ì(€½¹ÍĞ´õíôì(€¥˜¡°¤¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Ì±áäé°¹áåõt¤¹™½É… ¡Èôùí½¹ÍĞÍĞõÈ¹ÍÑ…Ñ¥½¹Íññmt±áäõÈ¹áåññmtì(€€€ÍĞ¹™½É…  ¡Ì±¤¤ôùì¥˜¡áåm¥t˜™µmMÑÉ¥¹œ¡Ì¤¹É•Á±…” ¿²^´¼°œœ¥tôõ¹Õ±°¥µmMÑÉ¥¹œ¡Ì¤¹É•Á±…” ¿²^´¼°œœ¥tõáåm¥tìô¤íô¤ì(€É•ÑÕÉ¸}µ•ÑÉ½ae…¡•m±¥¹•9…µ•tõ´ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½ae½˜¡á´±¹…µ”¥ì¥˜¡áµm¹…µ•t¥É•ÑÕÉ¸áµm¹…µ•tì½¹ÍĞ„õMÑÉ¥¹œ¡¹…µ”¤¹É•Á±…” ¿²^´¼°œœ¤ì¥˜¡áµm…t¥É•ÑÕÉ¸áµm…tì(€½¹ÍĞ õMÑÉ¥¹œ¡¹…µ”¤¹ÍÁ±¥Ğ œ€¼€œ¥lÁt¹É•Á±…” ¿²^´¼°œœ¤ìÉ•ÑÕÉ¸áµm¡uññ¹Õ±°ìô(¼¼ƒ®>²Â¤ƒ²æÓ®Npƒ®Â§®¦Ğƒ²^ĞƒªÎƒ²‚Tèƒ®ã²€ƒ®ÂÃ²^Ó²v`ƒªâÃ²‚CŠK²Š²‚@£¶Vc¶Z$§²v ƒ²fó²ªô°ƒ²^·²"p£²¶Z$§²v ƒ²b“®–ã²ªô¸(¼¼ƒ²jÓ¶Z$ƒ¶:ã²"c®
`ƒ²Ê¯²Â ƒ².sªÂ²vĞƒ®.³®vó²‚ã®>ƒ²^Ğƒ²r²æcªÂ ƒ®J“®ÂS®3² ƒ²V+ªÊ0ƒ¶Vs®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½=É‘•É¥ÉÉ½ÕÁÌ¡±¥¹•9…µ”±ÍÑ¹9…µ”±É½ÕÁÌ¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•9…µ•t°¹…µ•Ìõ•¹Ğ˜™•¹Ğ¹Ìì(€¥˜ …¹…µ•Íñğ…É½ÕÁÍññÉ½ÕÁÌ¹±•¹Ñ ğÈ¥É•ÑÕÉ¸É½ÕÁÍññmtì(€½¹ÍĞÍ¤õ¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¹9…µ”¤ì(€¥˜¡Í¤ğÀ¥É•ÑÕÉ¸É½ÕÁÌì(€½¹ÍĞÍ½É”õœôùì(€€€½¹ÍĞ‘Ìõœ¹µ…À¡¬ôù¹…µ•Ì¹¥¹‘•á=˜¡¬¤¤¹™¥±Ñ•È¡¤ôù¤øôÀ¤¹µ…À¡¤ôù¤µÍ¤¤ì(€€€É•ÑÕÉ¸‘Ì¹±•¹Ñ ı‘Ì¹É•‘Õ” ¡„±ˆ¤ôù„­ˆ°À¤½‘Ì¹±•¹Ñ èÀì(€ôì(€É•ÑÕÉ¸É½ÕÁÌ¹µ…À ¡œ±¤¤ôø¡íœ±¤±ÌéÍ½É”¡œ¥ô¤¤¹Í½ÉĞ ¡„±ˆ¤ôø¡ˆ¹Ìµ„¹Ì¥ñğ¡„¹¤µˆ¹¤¤¤¹µ…À¡àôùà¹œ¤ì)ô(¼¼ƒ®ÚªâÃ²^´ƒ®.“®Â§®¦Ğ Ì¬¤ƒŠHƒ².“²‚pƒ²Š3¶Fpƒ®Â§¶Z—²ró®†p€ËªÂpƒ®²ó®š°ƒ®Â§®¦Ğ£ªŞä§²ró®†pƒ®ÎG¶V¤¸ƒªÂg²v ƒ²ªôƒªÎ¶×²v ƒ¶Vpƒ²^Ó®†p¸)™Õ¹Ñ¥½¸}µ•ÑÉ½¥ÉÉ½ÕÁÌ¡±¥¹•9…µ”°ÍÑ¹9…µ”°‘¥É½Õ¹ÑÌ¥ì(€½¹ÍĞ­•åÌõ=‰©•Ğ¹­•åÌ¡‘¥É½Õ¹ÑÌ¤¹Í½ÉĞ ¡„±ˆ¤ôù‘¥É½Õ¹ÑÍm‰tµ‘¥É½Õ¹ÑÍm…t¤ì(€¥˜¡­•åÌ¹±•¹Ñ ğôÈ¤É•ÑÕÉ¸}µ•ÑÉ½=É‘•É¥ÉÉ½ÕÁÌ¡±¥¹•9…µ”±ÍÑ¹9…µ”±­•åÌ¹µ…À¡¬ôùm­t¤¤ì(€½¹ÍĞá´õ}µ•ÑÉ½1¥¹•ad¡±¥¹•9…µ”¤°Lõ}µ•ÑÉ½ae½˜¡á´±ÍÑ¹9…µ”¤ì(€½¹ÍĞİ¥Ñ¡adõ­•åÌ¹™¥±Ñ•È¡¬ôù}µ•ÑÉ½ae½˜¡á´±¬¤¤°¹½adõ­•åÌ¹™¥±Ñ•È¡¬ôø…}µ•ÑÉ½ae½˜¡á´±¬¤¤ì(€¥˜ …Mññİ¥Ñ¡ad¹±•¹Ñ ğÈ¤É•ÑÕÉ¸}µ•ÑÉ½=É‘•É¥ÉÉ½ÕÁÌ¡±¥¹•9…µ”±ÍÑ¹9…µ”±mm­•åÍlÁut°­•åÌ¹Í±¥” Ä¥t¤ì€¼¼ƒ²Š3¶Fpƒ®Ú²†Äƒ².pƒ¶>Ó®ÂÄ(€½¹ÍĞÙ•Œõ¬ôùí½¹ÍĞÀõ}µ•ÑÉ½ae½˜¡á´±¬¤í½¹ÍĞ‘àõÁlÁtµMlÁt±‘äõÁlÅtµMlÅt±0õ5…Ñ ¹¡åÁ½Ğ¡‘à±‘ä¥ñğÄíÉ•ÑÕÉ¸m‘à½0±‘ä½1tíôì(€½¹ÍĞÀÄõÙ•Œ¡İ¥Ñ¡aelÁt¤ì±•ĞÀÈõ¹Õ±°±µ¸ôÈì(€™½È¡½¹ÍĞ¬½˜İ¥Ñ¡ad¥í½¹ÍĞØõÙ•Œ¡¬¤í½¹ÍĞõÙlÁt©ÀÅlÁt­ÙlÅt©ÀÅlÅtí¥˜¡ñµ¸¥íµ¸õíÀÈõØíõô(€½¹ÍĞœÄõmt±œÈõmtì(€™½È¡½¹ÍĞ¬½˜İ¥Ñ¡ad¥í½¹ÍĞØõÙ•Œ¡¬¤í½¹ÍĞÄõÙlÁt©ÀÅlÁt­ÙlÅt©ÀÅlÅtí½¹ÍĞÈõÀÈıÙlÁt©ÀÉlÁt­ÙlÅt©ÀÉlÅtè´Èì¡ÄøõÈıœÄéœÈ¤¹ÁÕÍ ¡¬¤íô(€¥˜¡¹½ad¹±•¹Ñ ¥í½¹ÍĞ¹…µ•Ìõ5QI=}M!m±¥¹•9…µ•t¹Ìí½¹ÍĞ…¤õœôùœ¹±•¹Ñ ıœ¹É•‘Õ” ¡Ì±¬¤ôùÌ­¹…µ•Ì¹¥¹‘•á=˜¡¬¤°À¤½œ¹±•¹Ñ é¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¹9…µ”¤ì(€€€½¹ÍĞ„Äõ…¤¡œÄ¤±„Èõ…¤¡œÈ¤í™½È¡½¹ÍĞ¬½˜¹½ad¥í½¹ÍĞ¹¤õ¹…µ•Ì¹¥¹‘•á=˜¡¬¤ì¡5…Ñ ¹…‰Ì¡¹¤µ„Ä¤ğõ5…Ñ ¹…‰Ì¡¹¤µ„È¤ıœÄéœÈ¤¹ÁÕÍ ¡¬¤íõô(€É•ÑÕÉ¸}µ•ÑÉ½=É‘•É¥ÉÉ½ÕÁÌ¡±¥¹•9…µ”±ÍÑ¹9…µ”±mœÄ±œÉt¹™¥±Ñ•È¡œôùœ¹±•¹Ñ ¤¤ì)ô(¼¼ƒ²^³®~°ƒ®ã²ƒ²v`ƒªâ'¶Z'
ß²f¶Z$ƒ®.“²v0ƒ²^·²vƒ².“²‚pƒ²®>ƒ²Š3¶Fpƒ®Â§¶Z—²ró®†pƒ®²Û²ZĞƒªÎ×²j¤ƒ²ƒ®†s²v`ƒ®F@ƒ®Â§®¦Ó²vƒ®3®N·®.#®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…É•‘¥ÉÉ½ÕÁÌ¡Í½ÕÉ•1¥¹•Ì±ÍÑ¹9…µ”±‘¥É½Õ¹ÑÌ¥ì(€½¹ÍĞ­•åÌõ=‰©•Ğ¹­•åÌ¡‘¥É½Õ¹ÑÌ¤¹Í½ÉĞ ¡„±ˆ¤ôù‘¥É½Õ¹ÑÍm‰tµ‘¥É½Õ¹ÑÍm…t¤ì(€¥˜¡­•åÌ¹±•¹Ñ ğôÈ¥É•ÑÕÉ¸­•åÌ¹µ…À¡­•äôùm­•åt¤ì(€½¹ÍĞÙ•Ñ½ÉÌõíôì(€™½È¡½¹ÍĞ­•ä½˜­•åÌ¥ì(€€€™½È¡½¹ÍĞ±¥¹”½˜Í½ÕÉ•1¥¹•Ì¥ì(€€€€€½¹ÍĞá´õ}µ•ÑÉ½1¥¹•ad¡±¥¹”¤±Ìõ}µ•ÑÉ½ae½˜¡á´±ÍÑ¹9…µ”¤±Àõ}µ•ÑÉ½ae½˜¡á´±­•ä¤ì(€€€€€¥˜ …Íñğ…À¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ‘àõÁlÁtµÍlÁt±‘äõÁlÅtµÍlÅt±±•¸õ5…Ñ ¹¡åÁ½Ğ¡‘à±‘ä¥ñğÄì(€€€€€Ù•Ñ½ÉÍm­•åtõm‘à½±•¸±‘ä½±•¹tí‰É•…¬ì(€€€ô(€ô(€½¹ÍĞİ¥Ñ¡Y•Ñ½Èõ­•åÌ¹™¥±Ñ•È¡­•äôùÙ•Ñ½ÉÍm­•åt¤ì(€¥˜¡İ¥Ñ¡Y•Ñ½È¹±•¹Ñ ğÈ¥É•ÑÕÉ¸m­•åÍtì(€½¹ÍĞÀÄõÙ•Ñ½ÉÍmİ¥Ñ¡Y•Ñ½ÉlÁutì(€±•ĞÀÈõ¹Õ±°±µ¥¹½ĞôÈì(€İ¥Ñ¡Y•Ñ½È¹™½É… ¡­•äôùí½¹ÍĞØõÙ•Ñ½ÉÍm­•åt±‘½ĞõÙlÁt©ÀÅlÁt­ÙlÅt©ÀÅlÅtí¥˜¡‘½Ğñµ¥¹½Ğ¥íµ¥¹½Ğõ‘½ĞíÀÈõØíõô¤ì(€¥˜ …ÀÉññµ¥¹½Ğø´¸ÄÈ¥É•ÑÕÉ¸m­•åÍtì(€½¹ÍĞÉ½ÕÁÌõmmt±mutì(€­•åÌ¹™½É… ¡­•äôùì(€€€½¹ÍĞØõÙ•Ñ½ÉÍm­•åtì(€€€¥˜ …Ø¥íÉ½ÕÁÍmÉ½ÕÁÍlÁt¹±•¹Ñ ğõÉ½ÕÁÍlÅt¹±•¹Ñ üÀèÅt¹ÁÕÍ ¡­•ä¤íÉ•ÑÕÉ¸íô(€€€½¹ÍĞÄõÙlÁt©ÀÅlÁt­ÙlÅt©ÀÅlÅt±ÈõÙlÁt©ÀÉlÁt­ÙlÅt©ÀÉlÅtì(€€€É½ÕÁÍmÄøõÈüÀèÅt¹ÁÕÍ ¡­•ä¤ì(€ô¤ì(€É•ÑÕÉ¸É½ÕÁÌ¹™¥±Ñ•È¡É½ÕÀôùÉ½ÕÀ¹±•¹Ñ ¤ì)ô(¼¼ƒ®Â§®¦ĞƒªŞã®ä£®.“²’Dƒ®.“²v3²^´¤ƒ¶:àƒ®ÎG¶V¤ƒŠPƒ²²ƒ®Î®†pƒ®Ú®
Ğƒ²’G®ÎÔƒ²‚sªÆÀƒ¶nƒ¶V§²æ £²s®†pƒ®.“®–àƒªÎ¶Ôƒ®>g².sªÂ²v ƒ²rƒ² ¤)™Õ¹Ñ¥½¸}µ•ÑÉ½É½ÕÁ¹ÑÉ¥•Ì¡‘¥ÉÍ5…À°­•åÌ°ÁÉ•Í•ÉÙ•1¥¹•Ìõ™…±Í”¥ì(€±•Ğ…±°õmtì™½È¡½¹ÍĞ¬½˜­•åÌ¤…±°õ…±°¹½¹…Ğ¡}µ•ÑÉ½¥É¹ÑÉ¥•Ì¡‘¥ÉÍ5…Ám­t±ÁÉ•Í•ÉÙ•1¥¹•Ì¤¹•¹ÑÉ¥•Ì¤ì(€…±°¹Í½ÉĞ ¡„±ˆ¤ôù„¹Í•Œµˆ¹Í•Œ¤ì(€½¹ÍĞÍ•Ìõ…±°¹µ…À¡¼ôù5…Ñ ¹™±½½È¡¼¹Í•Œ¼ØÀ¤¨ØÀ¤ì(€É•ÑÕÉ¸í•¹ÑÉ¥•Ìé…±°°™¥ÉÍĞéÍ•ÍlÁt°±…ÍĞéÍ•ÍmÍ•Ì¹±•¹Ñ ´Åuôì)ô)±•Ğ}µ•ÑÉ½	½…É‘5½‘”ôÑ¥µ”œì€€€¼¼€Ñ¥µ”œğ€Á½Ìœ£¶b²r²æ`¤)±•Ğ}µ•ÑÉ½	½…É‘MÑ¸õ¹Õ±°ì)±•Ğ}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•àôÀì)±•Ğ}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àôÀì)±•Ğ}µ•ÑÉ½¥ÍÁ±…å1¥¹•Ìõmtì)±•Ğ}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌõmtì(¼¼ƒªÂg²v ƒ®²ó®š°ƒ²ƒ®†s®–ğƒ²
³²j§¶Vc®*PƒªÖ³ªÂ¸)½¹ÍĞ5QI=}M!I}QI-}	=I}MQ%=9Lõl(€í™É½´èŸ²Ê·®~'®š°œ±Ñ¼èŸ¶VsªÂW®†pœ±±¥¹•ÌélŸªÊ÷®Ú²€œ°ŸªÖ³²vã²€œ°Ÿ².ƒ®ã²nC²€uô°(€í™É½´èŸ¶VsªÂW®†pœ±Ñ¼èŸªÖ³®†pœ±±¥¹•ÌélŸªÊ÷®Ú²€œ°ŸªÖ³²vã²€uô°(€í™É½´èŸ²vc²‚W®Ú œ±Ñ¼èŸ®Ú²ªÎœ±±¥¹•ÌélŸ².ƒ®ã²nC²€œ°Ÿ®ã²nC²€uô°(€í™É½´èŸ®NÇ²Ò0œ±Ñ¼èŸ®.ç²
Àœ±±¥¹•ÌélŸªÂW²s²€œ°Ÿ²vã²Ês²Š®.£²€uô°(€í™É½´èŸªâÃ¶v”œ±Ñ¼èŸ²Êc²vàœ±±¥¹•ÌélŸ²"c²nC²vÓ²Ês²€œ°Ÿ²V#²
Ã²j§²vã²€uô°(€í™É½´èŸ®2²Vó®¾àœ±Ñ¼èŸ²nC².pœ±±¥¹•ÌélŸ²V#²
Ã²Ç®
£²€œ°Ÿ²V#²
Ã²V#²ZG²€uô°(€í™É½´èŸ²"c²n@œ±Ñ¼èŸªÂ#ªÎØœ±±¥¹•ÌélŸªÊ÷®Ú²€œ°Ÿ²z—¶bã²nC²€uô°(€í™É½´èŸ²Ês²V œ±Ñ¼èŸ®.ç²œ±±¥¹•ÌélŸªÊ÷®Ú²€œ°ŸªÎƒ®
 ·¶V§®6Tƒ¶×ªŞğuô°(€í™É½´èŸ²s®>g¶œ±Ñ¼èŸ²Ê·ªÎœ±±¥¹•ÌélŸ²V#²ZG®>g¶²€œ°Ÿ¶fS²Ç²€uô°(€í™É½´èŸ²zƒ².œ±Ñ¼èŸ²"c²œ±±¥¹•ÌélŸ²Š²nC²€œ°Ÿ²Ç®
£¶fS²Ç²€uô°(€í™É½´èŸ²²‚Tœ±Ñ¼èŸ¶2C®Ú œ±±¥¹•ÌélŸ²Š²nC²€œ°ŸªÊ÷²vc²’G²Vg²€uô)tì)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…É•‘QÉ…­M•Ñ¥½¹½¹Ñ…¥¹Ì¡ÉÕ±”±ÍÑ¸¥ì(€¥˜¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¥ì(€€€™½È¡½¹ÍĞ±¥¹”½˜ÉÕ±”¹±¥¹•Ì¥ì(€€€€€½¹ÍĞ‘•˜õ5QI=}1%9L¹™¥¹¡¥Ñ•´ôù¥Ñ•´¹¹…µ”ôôõ±¥¹”¤ì(€€€€€¥˜ …‘•˜¥½¹Ñ¥¹Õ”ì(€€€€€™½È¡½¹ÍĞÉ½ÕÑ”½˜€¡‘•˜¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé‘•˜¹ÍÑ…Ñ¥½¹Íõt¤¥ì(€€€€€€€½¹ÍĞ¹…µ•ÌõÉ½ÕÑ”¹ÍÑ…Ñ¥½¹Íññmt±„õ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹™É½´¤±ˆõ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹Ñ¼¤±Àõ¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¸¤ì(€€€€€€€¥˜¡„øôÀ˜™ˆøôÀ˜™Àøõ5…Ñ ¹µ¥¸¡„±ˆ¤˜™Àğõ5…Ñ ¹µ…à¡„±ˆ¤¥É•ÑÕÉ¸ÑÉÕ”ì(€€€€€ô(€€€ô(€ô(€€¼¼ƒªÖ³¶bW
ß²ÚW²Vôƒ®6Ã²vÓ¶Àƒ¶>Ó®ÂÄ¸ƒ².“²‚pƒªÖ³ªÂƒ¶2C²‚W²v ƒ²r²v`ƒ®ã²ƒ®>ƒ²ƒ¶bW²vƒ²jÃ²ƒ¶V§®.#®.¸(€¥˜¡ÑåÁ•½˜5QI=}M!ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸™…±Í”ì(€™½È¡½¹ÍĞ±¥¹”½˜ÉÕ±”¹±¥¹•Ì¥ì(€€€½¹ÍĞ¹…µ•Ìõ5QI=}M!m±¥¹•t˜™5QI=}M!m±¥¹•t¹Ìì(€€€¥˜ …¹…µ•Ì¥½¹Ñ¥¹Õ”ì(€€€½¹ÍĞ„õ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹™É½´¤±ˆõ¹…µ•Ì¹¥¹‘•á=˜¡ÉÕ±”¹Ñ¼¤±Àõ¹…µ•Ì¹¥¹‘•á=˜¡ÍÑ¸¤ì(€€€¥˜¡„øôÀ˜™ˆøôÀ˜™Àøõ5…Ñ ¹µ¥¸¡„±ˆ¤˜™Àğõ5…Ñ ¹µ…à¡„±ˆ¤¥É•ÑÕÉ¸ÑÉÕ”ì(€ô(€É•ÑÕÉ¸™…±Í”ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…É•‘QÉ…­1¥¹•ÍĞ¡ÍÑ¸±Í•±•Ñ•‘1¥¹”±…Ù…¥±…‰±•1¥¹•Ì¥ì(€½¹ÍĞ…Ù…¥±…‰±”õ¹•ÜM•Ğ¡…Ù…¥±…‰±•1¥¹•Íññmt¤ì(€¥˜ …}µ•ÑÉ½M¡…É•‘QÉ…­	½…É‘=¹ñğ……Ù…¥±…‰±”¹¡…Ì¡Í•±•Ñ•‘1¥¹”¤¥É•ÑÕÉ¸mÍ•±•Ñ•‘1¥¹•tì(€½¹ÍĞ©½¥¹•õ¹•ÜM•Ğ¡mÍ•±•Ñ•‘1¥¹•t¤ì(€±•Ğ¡…¹•õÑÉÕ”ì(€İ¡¥±”¡¡…¹•¥ì(€€€¡…¹•õ™…±Í”ì(€€€5QI=}M!I}QI-}	=I}MQ%=9L¹™½É… ¡ÉÕ±”ôùì(€€€€€¥˜ …}µ•ÑÉ½M¡…É•‘QÉ…­M•Ñ¥½¹½¹Ñ…¥¹Ì¡ÉÕ±”±ÍÑ¸¥ñğ…ÉÕ±”¹±¥¹•Ì¹Í½µ”¡±¥¹”ôù©½¥¹•¹¡…Ì¡±¥¹”¤¤¥É•ÑÕÉ¸ì(€€€€€ÉÕ±”¹±¥¹•Ì¹™½É… ¡±¥¹”ôùí¥˜¡…Ù…¥±…‰±”¹¡…Ì¡±¥¹”¤˜˜…©½¥¹•¹¡…Ì¡±¥¹”¤¥í©½¥¹•¹…‘¡±¥¹”¤í¡…¹•õÑÉÕ”íõô¤ì(€€€ô¤ì(€ô(€É•ÑÕÉ¸€¡…Ù…¥±…‰±•1¥¹•Íññmt¤¹™¥±Ñ•È¡±¥¹”ôù©½¥¹•¹¡…Ì¡±¥¹”¤¤ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½¥ÍÁ±…åÉ½ÕÁÍ½ÉMÑ…Ñ¥½¸¡ÍÑ¸±±¥¹•=É‘•È¥ì(€½¹ÍĞÉ½ÕÁÌõmt±Í••¸õ¹•ÜM•Ğ ¤ì(€±¥¹•=É‘•È¹™½É… ¡±¥¹”ôùì(€€€½¹ÍĞÉ½ÕÀõ}µ•ÑÉ½M¡…É•‘QÉ…­1¥¹•ÍĞ¡ÍÑ¸±±¥¹”±±¥¹•=É‘•È¤ì(€€€½¹ÍĞ­•äõl¸¸¹É½ÕÁt¹Í½ÉĞ ¤¹©½¥¸ ğœ¤ì(€€€¥˜ …Í••¸¹¡…Ì¡­•ä¤¥íÍ••¸¹…‘¡­•ä¤íÉ½ÕÁÌ¹ÁÕÍ ¡É½ÕÀ¤íô(€ô¤ì(€É•ÑÕÉ¸É½ÕÁÌì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…É•‘	½…É‘MÁ•Ì¡±¥¹•¥ÉÌ±É•¹‘•É1¥¹•Ì±Í¡…É•‘¥ÍÁ±…ä¥ì(€¥˜ …Í¡…É•‘¥ÍÁ±…ä¥É•ÑÕÉ¸É•¹‘•É1¥¹•Ì¹µ…À¡±¥¹”ôø¡í±¥¹”±±…‰•°é±¥¹”±Í½ÕÉ•1¥¹•Ìém±¥¹•t±‘¥ÉÌé±¥¹•¥ÉÍm±¥¹•uô¤¤ì(€½¹ÍĞ‘¥ÉÌõíôì(€É•¹‘•É1¥¹•Ì¹™½É… ¡±¥¹”ôù=‰©•Ğ¹•¹ÑÉ¥•Ì¡±¥¹•¥ÉÍm±¥¹•uññíô¤¹™½É…  ¡m¹•áĞ±•¹ÑÉ¥•Ít¤ôùì(€€€€¡‘¥ÉÍm¹•áÑtõ‘¥ÉÍm¹•áÑuññmt¤¹ÁÕÍ  ¸¸¹•¹ÑÉ¥•Ì¤ì(€ô¤¤ì(€É•ÑÕÉ¸mí±¥¹”éÉ•¹‘•É1¥¹•ÍlÁt±±…‰•°éÉ•¹‘•É1¥¹•Ì¹©½¥¸ œƒ
Ü€œ¤±Í½ÕÉ•1¥¹•Ìél¸¸¹É•¹‘•É1¥¹•Ít±‘¥ÉÍõtì)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½	½…É‘5½‘”¡´±Ñ…É•Ñ%¥ì(€}µ•ÑÉ½	½…É‘5½‘”õ´ì(€½¹ÍĞ¥õÑ…É•Ñ%‘ñğµ•ÑÉ¼µ‰½…Éœì(€½¹ÍĞ¡½ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡¥¤ì(€¥˜¡¡½ÍĞ˜™}µ•ÑÉ½	½…É‘MÑ¸¥ì(€€€½¹ÍĞ¡Ñµ°õ}µ•ÑÉ½MÑ…Ñ¥½¹	½…É‘!Q50¡}µ•ÑÉ½	½…É‘MÑ¸±¥ôôôµ•ÑÉ¼µ‘¥ÍÁ±…äµ‰½…Éœ¤ì(€€€¥˜¡¡Ñµ°¥í½¹ÍĞÑµÀõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤íÑµÀ¹¥¹¹•É!Q50õ¡Ñµ°í¡½ÍĞ¹É•Á±…•]¥Ñ ¡ÑµÀ¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¤íô(€ô)ô)™Õ¹Ñ¥½¸}É•™É•Í¡5•ÑÉ½¥ÍÁ±…å	½…É ¥ì(€½¹ÍĞ¡½ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µ•ÑÉ¼µ‘¥ÍÁ±…äµ‰½…Éœ¤ì(€¥˜ …¡½ÍÑñğ…}µ•ÑÉ½	½…É‘MÑ¸¥É•ÑÕÉ¸ì(€½¹ÍĞ¡Ñµ°õ}µ•ÑÉ½MÑ…Ñ¥½¹	½…É‘!Q50¡}µ•ÑÉ½	½…É‘MÑ¸±ÑÉÕ”¤ì(€¥˜¡¡Ñµ°¥í½¹ÍĞÑµÀõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤íÑµÀ¹¥¹¹•É!Q50õ¡Ñµ°í¡½ÍĞ¹É•Á±…•]¥Ñ ¡ÑµÀ¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¤íô)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½¥ÍÁ±…å1¥¹”¡ÍÑ•À¥ì(€¥˜ …}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ¥É•ÑÕÉ¸ì(€}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•àô¡}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•à­9Õµ‰•È¡ÍÑ•À¤­}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ¤•}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ì(€}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àôÀì(€}É•™É•Í¡5•ÑÉ½¥ÍÁ±…å	½…É ¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½¥ÍÁ±…å¥É•Ñ¥½¸¡¥¹‘•à¥ì(€}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àõ5…Ñ ¹µ…à À±9Õµ‰•È¡¥¹‘•à¥ñğÀ¤ì(€}É•™É•Í¡5•ÑÉ½¥ÍÁ±…å	½…É ¤ì)ô(¼¼ƒ¶:ã²Ç²v`ƒ¶b²z°ƒ²r²æ`£¶b²r²æ`ƒ®ÎÓªâÀ¤èƒ²‚W²Â ƒ²’D÷®>²Â¤°ƒ²^·ªÂ÷²²‚²^´ƒ²Ús®Âp°(¼¼ƒ®.“²v0ƒ²^´ƒ®>²Â¤€Ç®Úƒ²‚®Ú¶Ã®0ƒ²‚GªŞó²ró®†pƒ²‚¶fc¶Vs®.¸(¼¼ƒ¶:ã²Äƒ¶b²r²æ`¸¬À½¬Äƒ²ó®¦Ğƒ¶VÓ®.ä±•œ£®.£²vó®Â§¶Z”ƒªÖ³ªÂ§®0ƒªÎ²
ÀƒŠHƒ¶j3²Â ƒ²^Ó²Â£²v`ƒ²
ß¶Vc¶Z'²vƒ²s®†pƒ®.“®–àƒ²^Ó²Â£®†pƒ²Ş£ªâ$)™Õ¹Ñ¥½¸}µ•ÑÉ½QÉ…¥¹A½Ì¡±¥¹”°ÍÙ%‘à°¬À°¬Ä°Ñ…É•ÑMÑ¸¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•tì¥˜ …•¹Ğ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ˜õ•¹Ğ¹ÑmÍÙ%‘át°¹…µ•Ìõ•¹Ğ¹Ìì¥˜ …˜¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ8õ˜¹±•¹Ñ ¼Ìì¥˜¡¬Àôõ¹Õ±°¥¬ÀôÀì¥˜¡¬Äôõ¹Õ±±ññ¬Äù8´Ä¥¬Äõ8´Äì¥˜¡¬Äğõ¬À¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ¸õ¬Äµ¬À¬Ä°ÍÉØõàôø  ¡à´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ°¹´õ¬ôù¹…µ•Ím™lÌ¨¡¬À­¬¤¬Éutì(€½¹ÍĞÍÑ…ÉÑ5¥¸ô ¡™lÌ©¬À¬Åt”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€±•ĞÑ…É•Ñ%‘àô´Äì¥˜¡Ñ…É•ÑMÑ¸„õ¹Õ±°¥í™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥í¥˜¡¹´¡¤¤ôôõÑ…É•ÑMÑ¸¥íÑ…É•Ñ%‘àõ¤í‰É•…¬íõõô(€½¹ÍĞÉ•ÍÕ±Ğô¡ÍÑ…Ñ”±ÍÑ¸±¥¹‘•à¤ôø¡íÍÑ…Ñ”±ÍÑ¸±¥¹‘•à±Ñ…É•Ñ%‘à±…İ…äéÑ…É•Ñ%‘àğÀı¹Õ±°éÑ…É•Ñ%‘àµ¥¹‘•à±ÍÑ…ÉÑ5¥¹ô¤ì(€½¹ÍĞ™±…Ğõmtì™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì™±…Ğ¹ÁÕÍ ¡ÍÉØ¡™lÌ¨¡¬À­¤¥t¤°ÍÉØ¡™lÌ¨¡¬À­¤¤¬Åt¤¤ìô(€±•Ğ½™˜ôÀì½¹ÍĞµ½¹¼õmtì™½È¡±•Ğ¤ôÀí¤ñ™±…Ğ¹±•¹Ñ í¤¬¬¥ì±•ĞØõ™±…Ñm¥t­½™˜ì¥˜¡¤øÀ˜™Øñµ½¹½m¤´Åt¥í½™˜¬ôÄĞĞÀíØ¬ôÄĞĞÀíôµ½¹¼¹ÁÕÍ ¡Ø¤ìô(€½¹ÍĞ…‰Íõmt±…‰Íõmtì™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥í…‰Í¹ÁÕÍ ¡µ½¹½lÈ©¥t¤í…‰Í¹ÁÕÍ ¡µ½¹½lÈ©¤¬Åt¤íô(€½¹ÍĞ¹½İŒõ¹•Ü…Ñ” ¤ì±•Ğ¹½ÜõÍÉØ¡¹½İŒ¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İŒ¹•Ñ5¥¹ÕÑ•Ì ¤­¹½İŒ¹•ÑM•½¹‘Ì ¤¼ØÀ¤ì(€İ¡¥±”¡¹½Üñ…‰ÍlÁt´ÜÈÀ¥¹½Ü¬ôÄĞĞÀìİ¡¥±”¡¹½Üù…‰Ím¸´Åt¬ÜÈÀ¥¹½Ü´ôÄĞĞÀì(€¥˜¡¹½Üñ…‰ÍlÁt¤É•ÑÕÉ¸É•ÍÕ±Ğ ‰•™½É”œ±¹´ À¤°À¤ì(€¥˜¡¹½Üøõ…‰Ím¸´Åt¤É•ÑÕÉ¸É•ÍÕ±Ğ …™Ñ•Èœ±¹´¡¸´Ä¤±¸´Ä¤ì(€™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì(€€€¥˜¡¹½Üøõ…‰Ím¥t˜™¹½Üğõ…‰Ím¥t¤É•ÑÕÉ¸É•ÍÕ±Ğ Ÿ®>²Â¤œ±¹´¡¤¤±¤¤ì(€€€¥˜¡¤ñ¸´Ä˜™¹½Üù…‰Ím¥t˜™¹½Üñ…‰Ím¤¬Åt¥ì(€€€€€É•ÑÕÉ¸¹½Üøõ…‰Ím¤¬Åt´Ä€üÉ•ÍÕ±Ğ Ÿ²‚GªŞğœ±¹´¡¤¬Ä¤±¤¬Ä¤€èÉ•ÍÕ±Ğ Ÿ²Ús®Âpœ±¹´¡¤¤±¤¤ì(€€€ô(€ô(€É•ÑÕÉ¸É•ÍÕ±Ğ …™Ñ•Èœ±¹´¡¸´Ä¤±¸´Ä¤ì)ô(¼¼ƒ¶:ã²Äƒ¶b²r²æ`£®ã²ƒ®>ƒ®#²î“²j¤¤èƒ²jÓ¶Z$ƒ²’G²vÓ®¦ĞƒªÖ³ªÂ
ß²¶Z'®–ƒ
ß²¶Z'®Â§¶Z”ƒ¶Z'²ƒ² ƒ®Âc¶f`°ƒ²V®.#®¦Ğ¹Õ±°)™Õ¹Ñ¥½¸}µ•ÑÉ½QÉ…¥¹1¥Ù•A½Ì¡±¥¹”°ÍÙ%‘à¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•tì¥˜ …•¹Ğ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ˜õ•¹Ğ¹ÑmÍÙ%‘át°¹…µ•Ìõ•¹Ğ¹Ìì¥˜ …˜¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ¸õ˜¹±•¹Ñ ¼Ì°ÍÉØõàôø  ¡à´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ°¹´õ¬ôù¹…µ•Ím™lÌ©¬¬Éutì(€½¹ÍĞ™±…Ğõmtì™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì™±…Ğ¹ÁÕÍ ¡ÍÉØ¡™lÌ©¥t¤°ÍÉØ¡™lÌ©¤¬Åt¤¤ìô(€±•Ğ½™˜ôÀì½¹ÍĞµ½¹¼õmtì™½È¡±•Ğ¤ôÀí¤ñ™±…Ğ¹±•¹Ñ í¤¬¬¥ì±•ĞØõ™±…Ñm¥t­½™˜ì¥˜¡¤øÀ˜™Øñµ½¹½m¤´Åt¥í½™˜¬ôÄĞĞÀíØ¬ôÄĞĞÀíôµ½¹¼¹ÁÕÍ ¡Ø¤ìô(€½¹ÍĞ…‰Íõmt±…‰Íõmtì™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥í…‰Í¹ÁÕÍ ¡µ½¹½lÈ©¥t¤í…‰Í¹ÁÕÍ ¡µ½¹½lÈ©¤¬Åt¤íô(€½¹ÍĞ¹½İŒõ¹•Ü…Ñ” ¤ì±•Ğ¹½ÜõÍÉØ¡¹½İŒ¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İŒ¹•Ñ5¥¹ÕÑ•Ì ¤­¹½İŒ¹•ÑM•½¹‘Ì ¤¼ØÀ¤ì(€İ¡¥±”¡¹½Üñ…‰ÍlÁt´ÜÈÀ¥¹½Ü¬ôÄĞĞÀìİ¡¥±”¡¹½Üù…‰Ím¸´Åt¬ÜÈÀ¥¹½Ü´ôÄĞĞÀì(€¥˜¡¹½Üñ…‰ÍlÁuññ¹½Üøõ…‰Ím¸´Åt¤É•ÑÕÉ¸¹Õ±°ì(€±•ĞÕÉ%‘àô´Ä°Ñ½%‘àô´Ä°™É…ŒôÀ°…ÑMÑ…Ñ¥½¸õ™…±Í”ì(€™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì(€€€¥˜¡¹½Üøõ…‰Ím¥t˜™¹½Üğõ…‰Ím¥t¥ìÕÉ%‘àõ¤ìÑ½%‘àõ5…Ñ ¹µ¥¸¡¤¬Ä±¸´Ä¤ì…ÑMÑ…Ñ¥½¸õÑÉÕ”ì‰É•…¬ìô(€€€¥˜¡¤ñ¸´Ä˜™¹½Üù…‰Ím¥t˜™¹½Üñ…‰Ím¤¬Åt¥ìÕÉ%‘àõ¤ìÑ½%‘àõ¤¬Äì™É…Œô¡¹½Üµ…‰Ím¥t¤½5…Ñ ¹µ…à Ä±…‰Ím¤¬Åtµ…‰Ím¥t¤ì‰É•…¬ìô(€ô(€¥˜¡ÕÉ%‘àğÀ¤É•ÑÕÉ¸¹Õ±°ì(€±•Ğ‘•ÍĞõ¹´¡¸´Ä¤ì€€€¼¼ƒ²¶Z'®Â§¶Z”ƒ¶j3²Â£²‚@¡ùù
ß²^Ã²7²’G®ÎÔ¤ƒ²vÓ²‚ªæ3² °ƒ²^²ró®¦Ğƒ²Ös²Š²^´(€™½È¡±•Ğ¨õÕÉ%‘à¬Äí¨ñ¸´Äí¨¬¬¥ì¥˜¡™lÌ¨¡¨¬Ä¤¬Étôôõ™lÌ©¨¬Ét¥í‘•ÍĞõ¹´¡¨¤í‰É•…¬íô¥˜¡™lÌ¨¡¨¬Ä¤¬Étôôõ™lÌ¨¡¨´Ä¤¬Ét¥í‘•ÍĞõ¹´¡¨¤í‰É•…¬íôô(€½¹ÍĞ±¥­±½¬ô ¡™lÌ©ÕÉ%‘à¬Åt”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€É•ÑÕÉ¸í™É½µMÑ¸é¹´¡ÕÉ%‘à¤°Ñ½MÑ¸é¹´¡Ñ½%‘à¤°™É…Œ°…ÑMÑ…Ñ¥½¸°‘•ÍĞ°±¥­±½­ôì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡±¥¹•9…µ”¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•9…µ•tì¥˜ …•¹Ğ¥É•ÑÕÉ¸mtì(€½¹ÍĞ½ÕĞõmtì™½È¡±•ĞÌôÀíÌñ•¹Ğ¹Ğ¹±•¹Ñ íÌ¬¬¥ì½¹ÍĞÀõ}µ•ÑÉ½QÉ…¥¹1¥Ù•A½Ì¡±¥¹•9…µ”±Ì¤ì¥˜¡À¥½ÕĞ¹ÁÕÍ ¡ì¸¸¹À±ÍÙ%‘àéÌ±±Ìé•¹Ğ¹Œı•¹Ğ¹mÍtèÁô¤ìô(€É•ÑÕÉ¸½ÕĞì)ô)±•Ğ}µ•ÑÉ½!½µ•M¹…ÁÍ¡½Ñ…¡”õ¹Õ±°ì(¼¼ƒ¶f ƒ¶fS®¦Ó²j¤ƒ²‚²Ê€ƒ²jÓ¶Z$ƒ²*“®²Ü¸ƒ²z—ªÆÃ®š³²^Ó²Â 11}QI%9O²f ƒ®Ú®š³¶VĞƒ²‚²Ê€ƒ².sªÂ¶Fs®0ƒ²GªÎ¶Vs®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½!½µ•M¹…ÁÍ¡½Ğ ¥ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤±­•äõ€‘í¹½Ü¹•ÑÕ±±e•…È ¥ô´‘í¹½Ü¹•Ñ5½¹Ñ  ¥ô´‘í¹½Ü¹•Ñ…Ñ” ¥ô´‘í¹½Ü¹•Ñ!½ÕÉÌ ¥ô´‘í¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¥õ€ì(€¥˜¡}µ•ÑÉ½!½µ•M¹…ÁÍ¡½Ñ…¡”ü¹­•äôôõ­•ä¥É•ÑÕÉ¸}µ•ÑÉ½!½µ•M¹…ÁÍ¡½Ñ…¡”¹Ù…±Õ”ì(€½¹ÍĞÍÑ…Ñ¥½¹9…µ•Ìõ¹•ÜM•Ğ ¤±ÉÕ¹¹¥¹œõmt±±¥¹•½Õ¹ÑÌõ¹•Ü5…À ¤ì(€±•Ğ‰•™½É”ôÀ±‘½¹”ôÀ±•áÁÉ•ÍÌôÀ±±¥µ¥Ñ•ôÀ±Ñ½Ñ…°ôÀì(€½¹ÍĞ±¥¹••™Ìõ¹•Ü5…À ¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œı5QI=}1%9Lémt¤¹µ…À¡±¥¹”ôùm±¥¹”¹¹…µ”±±¥¹•t¤¤ì(€™½È¡½¹ÍĞm±¥¹”±•¹Ñt½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œı5QI=}M!éíô¤¥ì(€€€€¡•¹Ğ¹Íññmt¤¹™½É… ¡¹…µ”ôùÍÑ…Ñ¥½¹9…µ•Ì¹…‘¡¹…µ”¤¤ì(€€€™½È¡±•ĞÍÙ%‘àôÀíÍÙ%‘àğ¡•¹Ğ¹Ñññmt¤¹±•¹Ñ íÍÙ%‘à¬¬¥ì(€€€€€½¹ÍĞ˜õ•¹Ğ¹ÑmÍÙ%‘át±¬Äõ5…Ñ ¹™±½½È ¡˜ü¹±•¹Ñ¡ñğÀ¤¼Ì¤´Äí¥˜ …™ññ¬ÄğÄ¥½¹Ñ¥¹Õ”ì(€€€€€Ñ½Ñ…°¬¬ì(€€€€€½¹ÍĞÁ½Í¥Ñ¥½¸õ}µ•ÑÉ½QÉ…¥¹A½Ì¡±¥¹”±ÍÙ%‘à°À±¬Ä¤±±¥Ù”õ}µ•ÑÉ½QÉ…¥¹1¥Ù•A½Ì¡±¥¹”±ÍÙ%‘à¤±±Ìõ•¹Ğ¹Œü¹mÍÙ%‘áuñğÀì(€€€€€¥˜¡Á½Í¥Ñ¥½¸ü¹ÍÑ…Ñ”ôôô‰•™½É”œ¥í‰•™½É”¬¬í½¹Ñ¥¹Õ”íô(€€€€€¥˜¡Á½Í¥Ñ¥½¸ü¹ÍÑ…Ñ”ôôô…™Ñ•Èñğ…±¥Ù”¥í‘½¹”¬¬í½¹Ñ¥¹Õ”íô(€€€€€¥˜¡±ÌôôôÄ¥•áÁÉ•ÍÌ¬¬í•±Í”¥˜¡±ÌôôôÈ¥±¥µ¥Ñ•¬¬ì(€€€€€±¥¹•½Õ¹ÑÌ¹Í•Ğ¡±¥¹”°¡±¥¹•½Õ¹ÑÌ¹•Ğ¡±¥¹”¥ñğÀ¤¬Ä¤ì(€€€€€½¹ÍĞ‘•˜õ±¥¹••™Ì¹•Ğ¡±¥¹”¤ì(€€€€€ÉÕ¹¹¥¹œ¹ÁÕÍ ¡ì(€€€€€€€±¥¹”±±¥¹•%é‘•˜ü¹¥‘ñğœœ±½±½Èé‘•˜ü¹½±½ÉñğœŒÌàá‰™œ±ÍÙ%‘à±±Ì±¬Ä°(€€€€€€€½É¥¥¸é•¹Ğ¹Ím™lÉut±‘•ÍĞé±¥Ù”¹‘•ÍĞ±™É½µMÑ¸é±¥Ù”¹™É½µMÑ¸±Ñ½MÑ¸é±¥Ù”¹Ñ½MÑ¸°(€€€€€€€…ÑMÑ…Ñ¥½¸é±¥Ù”¹…ÑMÑ…Ñ¥½¸±™É…Œé±¥Ù”¹™É…Œ±±¥­±½¬é±¥Ù”¹±¥­±½¬±ÍÑ…ÉÑ±½¬é™lÅt(€€€€€ô¤ì(€€€ô(€ô(€ÉÕ¹¹¥¹œ¹Í½ÉĞ ¡„±ˆ¤ôø¡ˆ¹±Ìµ„¹±Ì¥ñğ¡ˆ¹ÍÑ…ÉÑ±½¬µ„¹ÍÑ…ÉÑ±½¬¥ññ„¹±¥¹”¹±½…±•½µÁ…É”¡ˆ¹±¥¹”°­¼œ¤¤ì(€½¹ÍĞÙ…±Õ”õíÉÕ¹¹¥¹œ±‰•™½É”±‘½¹”±Ñ½Ñ…°±•áÁÉ•ÍÌ±±¥µ¥Ñ•±ÍÑ…Ñ¥½¹½Õ¹ĞéÍÑ…Ñ¥½¹9…µ•Ì¹Í¥é”±±¥¹•½Õ¹Ğé±¥¹••™Ì¹Í¥é”±±¥¹•½Õ¹ÑÌél¸¸¹±¥¹•½Õ¹ÑÍt¹Í½ÉĞ ¡„±ˆ¤ôù‰lÅtµ…lÅt¥ôì(€}µ•ÑÉ½!½µ•M¹…ÁÍ¡½Ñ…¡”õí­•ä±Ù…±Õ•ôì(€É•ÑÕÉ¸Ù…±Õ”ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥Ù•QÉ…¥¹1…‰•°¡‘•ÍĞ±±Ì¥íÉ•ÑÕÉ¸±ÌôôôÈı€‘í‘•ÍÑôƒ¶*çªâ%€é±ÌôôôÄı€‘í‘•ÍÑôƒªâ'¶Z%€é€‘í‘•ÍÑ÷¶Z%€íô)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥Ù•ÉÉ½İA…Ñ ¡à±ä±‘½İ¹İ…É¥ì(€½¹ÍĞõ¸ôø ­¸¤¹Ñ½¥á• Ä¤ì(€É•ÑÕÉ¸‘½İ¹İ…É(€€€€ü4€‘í¡à´Ğ¥ô€‘í¡ä´Ğ¥ô0€‘í¡à¬Ğ¥ô€‘í¡ä´Ğ¥ô0€‘í¡à¥ô€‘í¡ä¬Ğ¥ôi€(€€€€è4€‘í¡à´Ğ¥ô€‘í¡ä¬Ğ¥ô0€‘í¡à¬Ğ¥ô€‘í¡ä¬Ğ¥ô0€‘í¡à¥ô€‘í¡ä´Ğ¥ôi€ì)ô)±•Ğ}µ•ÑÉ½1¥Ù•=¸õÑÉÕ”ì€€€¼¼ƒ®ã²€ƒ²²àƒ².“².sªÂƒ²r²æ`ƒ¶Fs².p½¸½½™˜)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½1¥Ù•=¸¡½¸¥ì}µ•ÑÉ½1¥Ù•=¸õ½¸ì¥˜¡}µ•ÑÉ½•Ñ…¥±%¥É•¹‘•É5•ÑÉ½1¥¹•ÍQ…ˆ ¤ìô(¼¼ƒ®ã²€ƒ²²àƒ¶²z®vó²vàƒ²r²^@ƒ²jÓ¶Z$ƒ²’Dƒ¶:ã²Äƒ®#²î“®–ğƒ².“²‚pƒ²¶Z'®–€ƒ²r²æc²^@ƒ®ÂÃ²æ`€£®Ê²*“²VÇ².t°ƒ²¿¶Vc¶Z$ƒ²Š3²jÀƒ®Ú®š°¤(¼¼ƒ¶Vc¶Z$÷ªâÃ²‚CŠK²Š²‚@£¶Z$ƒ²V®zc®†p¤°ƒ²¶Z$÷²Š²‚CŠKªâÃ²‚@£¶Z$ƒ²r®†p¤)™Õ¹Ñ¥½¸}Á±…•5•ÑÉ½1¥Ù•5…É­•ÉÌ¡½¹Ñ…¥¹•È°±¥¹•9…µ”¥ì(€¥˜ …}µ•ÑÉ½1¥Ù•=¸¥É•ÑÕÉ¸ì(€½¹ÍĞÑ°õ½¹Ñ…¥¹•È¹ÅÕ•ÉåM•±•Ñ½È œ¹µÑ°µÑ°œ¤ì¥˜ …Ñ°¥É•ÑÕÉ¸ì(€Ñ°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÑ°µ±¥Ù”œ¤¹™½É… ¡´ôù´¹É•µ½Ù” ¤¤ì(€½¹ÍĞÉ½İ±ÌõíôìÑ°¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÑ°µÉ½Üœ¤¹™½É… ¡Èôùì½¹ÍĞ¹´õÈ¹‘…Ñ…Í•Ğ¹ÍÑ¸ì¥˜¡¹´˜˜…É½İ±Ím¹µt¥É½İ±Ím¹µtõÈìô¤ì(€}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡±¥¹•9…µ”¤¹™½É… ¡Ğôùì(€€€½¹ÍĞ™É½µ°õÉ½İ±ÍmĞ¹™É½µMÑ¹t°Ñ½°õÉ½İ±ÍmĞ¹Ñ½MÑ¹t°…¹¡½Èõ™É½µ±ññÑ½°ì¥˜ ……¹¡½È¥É•ÑÕÉ¸ì(€€€½¹ÍĞ…ÑÈõ…¹¡½È¹½™™Í•ÑQ½À­…¹¡½È¹½™™Í•Ñ!•¥¡Ğ¼Èì±•Ğäõ…ÑÈ°‘½İ¹İ…ÉõÑÉÕ”ì(€€€¥˜¡™É½µ°˜™Ñ½°¥ì½¹ÍĞ™ÑÈõ™É½µ°¹½™™Í•ÑQ½À­™É½µ°¹½™™Í•Ñ!•¥¡Ğ¼È°ÑÑÈõÑ½°¹½™™Í•ÑQ½À­Ñ½°¹½™™Í•Ñ!•¥¡Ğ¼Èì(€€€€€äõĞ¹…ÑMÑ…Ñ¥½¸ı™ÑÈé™ÑÈ¬¡ÑÑÈµ™ÑÈ¤©Ğ¹™É…Œì‘½İ¹İ…ÉõÑ½°¹½™™Í•ÑQ½Àøõ™É½µ°¹½™™Í•ÑQ½Àìô€€¼¼ƒ²V®zc®†p÷ªâÃ²‚CŠK²Š²‚@÷¶Vc¶Z$(€€€½¹ÍĞ´õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€€€´¹±…ÍÍ9…µ”ôµÑ°µ±¥Ù”±¥­…‰±”œ¬¡‘½İ¹İ…Éüœ‘½İ¸œèœÕÀœ¤¬¡Ğ¹…ÑMÑ…Ñ¥½¸üœ…Ğœèœœ¤¬¡Ğ¹±ÌøÀüœ•áÁÉ•ÍÌœèœœ¤ì(€€€´¹ÍÑå±”¹Ñ½Àõä¬Áàœì(€€€´¹Í•ÑÑÑÉ¥‰ÕÑ” É½±”œ°‰ÕÑÑ½¸œ¤í´¹Í•ÑÑÑÉ¥‰ÕÑ” Ñ…‰¥¹‘•àœ°œÀœ¤í´¹Í•ÑÑÑÉ¥‰ÕÑ” Ñ¥Ñ±”œ°Ÿ²^Ó²Â ƒ².sªÂ¶Fpƒ®ÎÓªâÀœ¤ì(€€€½¹ÍĞ½Á•¸ô ¤ôù½Á•¹5•ÑÉ½QÉ…¥¸¡±¥¹•9…µ”±Ğ¹ÍÙ%‘à±Ğ¹±¥­±½¬¤ì(€€€´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±½Á•¸¤í´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ­•å‘½İ¸œ±”ôùí¥˜¡”¹­•äôôô¹Ñ•Èññ”¹­•äôôôœ€œ¥í”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í½Á•¸ ¤íõô¤ì(€€€´¹¥¹¹•É!Q50õ€ñÍÁ…¸±…ÍÌô‰µÑ°µ±¥Ù”µ‘•ÍĞˆø‘í}½ÁÍÍŒ¡}µ•ÑÉ½1¥Ù•QÉ…¥¹1…‰•°¡Ğ¹‘•ÍĞ±Ğ¹±Ì¤¥ôğ½ÍÁ…¸ù€ì(€€€Ñ°¹…ÁÁ•¹‘¡¥±¡´¤ì(€ô¤ì)ô(¼¼ƒ².“².sªÂ=èƒªâÃ²†Ğƒ®.£²vğƒ¶²z®vó²và)™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ…Ñ¥Q1!Q50¡°±É½İÌ¥ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑ°µÑ°ˆÍÑå±”ôˆ´µµŒè‘í°¹½±½Éôˆø(€€€€‘ì  ¤ôùí½¹ÍĞ}á´õ}µ•ÑÉ½a™•É5…À¡°¤íÉ•ÑÕÉ¸É½İÌ¹µ…À ¡È±¤¤ôùì(€€€€€¥˜¡È¹…À¥É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑ°µ…Àˆø‘í}½ÁÍÍŒ¡È¹±…‰•±ñğŸ²²€ƒ
ÜƒªÊ÷²r€ƒªÖ³ªÂœ¥ôğ½‘¥Øù€ì(€€€€€½¹ÍĞ¥Í¹ô¡È¹É½ÕÑ•MÑ…ÉÑññÈ¹É½ÕÑ•¹‘ññ¤ôôôÁññ¤ôôõÉ½İÌ¹±•¹Ñ ´Ä¤˜™È¹ÍÑ½Àì(€€€€€½¹ÍĞ±ÌõÈ¹ÍÑ½ÀüœœèœÁ…ÍÌœì(€€€€€½¹ÍĞá˜õ}áµmÈ¹¹uññmt°¡…ÍQÉ…¥¸õ}¥ÍQÉ…¥¹MÑ¸¡È¹¸¤ì(€€€€€½¹ÍĞá™•É!Q50ô¡á˜¹±•¹Ñ¡ññ¡…ÍQÉ…¥¸¤ı€ñÍÁ…¸±…ÍÌô‰µÑ°µá™•ÉÌˆø‘ì(€€€€€€€á˜¹µ…À¡àôù€ñÍÁ…¸±…ÍÌô‰µÑ°µá™•ÈˆÍÑå±”ôˆ´µáŒè‘íà¹½±½ÉôˆÑ¥Ñ±”ôˆ‘íà¹¹…µ•ôƒ¶fc²*äˆ½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤í½Á•¹5•ÑÉ½1¥¹” œ‘íà¹¥‘ôœ¤ˆøñ¤øğ½¤ø‘íà¹¹…µ•ôğ½ÍÁ…¸ù€¤¹©½¥¸ œœ¤(€€€€€ô‘í¡…ÍQÉ…¥¸ı€ñÍÁ…¸±…ÍÌô‰µÑ°µá™•ÈÑÉ…¥¸ˆÑ¥Ñ±”ô‹ªâÃ²Â ƒ¶fc²*äˆûÂ~jğ½ÍÁ…¸ù€èœôğ½ÍÁ…¸ù€èœœì(€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑ°µÉ½Ü‘í±Íôˆ‘…Ñ„µÍÑ¸ôˆ‘íMÑÉ¥¹œ¡È¹¸¤¹É•Á±…” ¼˜½œ°œ™…µÀìœ¤¹É•Á±…” ¼ˆ½œ°œ™ÅÕ½Ğìœ¥ôˆ½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘íÈ¹¸¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µÑ°µ‘½Ğ‘í¥Í¹üœ•¹œèœôˆøğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µÑ°µ¹…µ”‘í¥Í¹üœ•¹œèœôˆø‘íÈ¹¹ôğ½ÍÁ…¸ø(€€€€€€€€‘í¥Í¹ı€ñÍÁ…¸±…ÍÌô‰µÑ°µ•¹‘Ñ…œˆø‘íÈ¹‰É…¹ ü¡È¹É½ÕÑ•MÑ…ÉĞüŸ®ÚªâÀœèŸ²²€ƒ²Š²‚@œ¤è¡È¹É½ÕÑ•MÑ…ÉÑññ¤ôôôÀüŸªâÃ²‚@œèŸ²Š²‚@œ¥ôğ½ÍÁ…¸ù€è …È¹ÍÑ½Àı€ñÍÁ…¸±…ÍÌô‰µÑ°µÁ…ÍÍÑ…œˆû¶×ªÎğğ½ÍÁ…¸ù€èœœ¥ô(€€€€€€€€‘íá™•É!Q51ô(€€€€€€ğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤íô¤ ¥ô(€€ğ½‘¥Øù€ì)ô(¼¼ƒ².“².sªÂ=8èƒ²¶Vc¶Z$ƒ®Ú®š°ƒ¶²z®vó²và€£®ÂÃ²ƒ®>².t¤¸ƒ²Š0÷²^·®ªƒªÊ3¶À°ƒ²’G²Vd÷®Î×²€°ƒ²Š3®‚#²và÷²¶Z$ƒ²^Ó²Â °ƒ²jÃ®‚#²và÷¶Vc¶Z$ƒ²^Ó²Â )™Õ¹Ñ¥½¸}É•¹‘•É5•ÑÉ½1¥Ù•Q¥µ•±¥¹”¡°±É½İÌ¥ì(€½¹ÍĞ½±½Èõ°¹½±½È°õàôø ­à¤¹Ñ½¥á• Ä¤°•ÍŒõÌôù}½ÁÍÍŒ¡MÑÉ¥¹œ¡Ì¤¤ì(€½¹ÍĞI=] ôÌÀ°Q=@ôÈÈ°UPôØĞ°U19ôÄÄà°@ôÄØ°19ôÄÄà°Aôàì(€½¹ÍĞÉ…¥±TõUP­U19¬ÄÀ°É…¥±õÉ…¥±T­@ì(€½¹ÍĞ\õÉ…¥±¬ÄÀ­19­Aì(€€¼¼ƒ²^·®Îä€¡…Àƒ²‚s²fà¤(€½¹ÍĞÍÑ¹dõíô°‘½ÑÌõmt°¹…µ•Ìõmtì±•ĞäõQ=@ì±•Ğ™¥ÉÍÑMÑ½Á$ô´Ä±±…ÍÑMÑ½Á$ô´Äì(€É½İÌ¹™½É…  ¡È±¤¤ôùì¥˜¡È¹…À¥íä¬õI=] ¨À¸ÔÔíÉ•ÑÕÉ¸íô¥˜¡È¹ÍÑ½À¥í¥˜¡™¥ÉÍÑMÑ½Á$ğÀ¥™¥ÉÍÑMÑ½Á$õ¤í±…ÍÑMÑ½Á$õ¤íôô¤ì(€É½İÌ¹™½É…  ¡È±¤¤ôùì(€€€¥˜¡È¹…À¥ì¹…µ•Ì¹ÁÕÍ ¡€ñ‘¥Ø±…ÍÌô‰µÑ°µ±Ñ°µ…ÀˆÍÑå±”ô‰Ñ½Àè‘í¡ä­I=] ¨À¸ÀÔ¥õÁàí±•™Ğè‘í¡É…¥±T´Ø¥õÁàˆø‘í•ÍŒ¡È¹±…‰•±ñğŸ²²€ƒªÊ÷²r€œ¥ôğ½‘¥Øù€¤ìä¬õI=] ¨À¸ÔÔìÉ•ÑÕÉ¸ìô(€€€½¹ÍĞ•¹õÈ¹É½ÕÑ•MÑ…ÉÑññÈ¹É½ÕÑ•¹‘ññ¤ôôõ™¥ÉÍÑMÑ½Á%ññ¤ôôõ±…ÍÑMÑ½Á$ì(€€€€¡ÍÑ¹emÈ¹¹tõÍÑ¹emÈ¹¹uññmt¤¹ÁÕÍ ¡ä¤ì(€€€‘½ÑÌ¹ÁÕÍ ¡íä±•¹±ÍÑ½ÀéÈ¹ÍÑ½Áô¤ì(€€€½¹ÍĞ•¹‘1…‰•°õÈ¹‰É…¹ ü¡È¹É½ÕÑ•MÑ…ÉĞüŸ®ÚªâÀœèŸ²²€ƒ²Š²‚@œ¤è¡È¹É½ÕÑ•MÑ…ÉÑññ¤ôôõ™¥ÉÍÑMÑ½Á$üŸªâÃ²‚@œèŸ²Š²‚@œ¤ì(€€€¹…µ•Ì¹ÁÕÍ ¡€ñÍÁ…¸±…ÍÌô‰µÑ°µ±Ñ°µ¹…µ”‘í•¹üœ•¹œèœô‘íÈ¹ÍÑ½ÀüœœèœÁ…ÍÌôˆÍÑå±”ô‰Ñ½Àè‘í¡ä¥õÁàíİ¥‘Ñ è‘íUP´áõÁàˆ½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘íMÑÉ¥¹œ¡È¹¸¤¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆø‘í•ÍŒ¡È¹¸¥ô‘í•¹ı€ñˆ±…ÍÌô‰µÑ°µ±Ñ°µÑ…œˆø‘í•¹‘1…‰•±ôğ½ˆù€èœôğ½ÍÁ…¸ù€¤ì(€€€ä¬õI=] ì(€ô¤ì(€½¹ÍĞ õä¬ÄĞ°åQ½Àõ‘½ÑÌ¹±•¹Ñ ı‘½ÑÍlÁt¹äéQ=@°å	½Ğõ‘½ÑÌ¹±•¹Ñ ı‘½ÑÍm‘½ÑÌ¹±•¹Ñ ´Åt¹äé ì(€€¼¼ƒ®Î×²€ƒ®‚#²vğ£¶²vĞƒ²^²v0¤€¬ƒ²^´ƒ²nC¶Fs².p(€±•ĞÍÙœõ€ñ±¥¹”àÄôˆ‘íÉ…¥±UôˆäÄôˆ‘í¡åQ½À¥ôˆàÈôˆ‘íÉ…¥±UôˆäÈôˆ‘í¡å	½Ğ¥ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌˆÍÑÉ½­”µ±¥¹•…Àô‰É½Õ¹ˆ¼ù€¬(€€€€€€€€€€ñ±¥¹”àÄôˆ‘íÉ…¥±ôˆäÄôˆ‘í¡åQ½À¥ôˆàÈôˆ‘íÉ…¥±ôˆäÈôˆ‘í¡å	½Ğ¥ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌˆÍÑÉ½­”µ±¥¹•…Àô‰É½Õ¹ˆ¼ù€ì(€‘½ÑÌ¹™½É… ¡ôùì¥˜ …¹ÍÑ½À¥É•ÑÕÉ¸ì(€€€ÍÙœ¬õ€ñ¥É±”àôˆ‘íÉ…¥±Uôˆäôˆ‘í¡¹ä¥ôˆÈôˆ‘í¹•¹üÌ¸ĞèÈ¸Ùôˆ™¥±°ôˆ‘í¹•¹üœ™™˜œèÙ…È ´µ‰œÈ¤ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÈˆ¼øñ¥É±”àôˆ‘íÉ…¥±ôˆäôˆ‘í¡¹ä¥ôˆÈôˆ‘í¹•¹üÌ¸ĞèÈ¸Ùôˆ™¥±°ôˆ‘í¹•¹üœ™™˜œèÙ…È ´µ‰œÈ¤ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÈˆ¼ù€ìô¤ì(€€¼¼ƒ²^Ó²Â ƒ®ÂÃ²æ`èƒ¶Vc¶Z$÷²Š3®‚#²và¡É…¥±T¤°ƒ²¶Z$÷²jÃ®‚#²và¡É…¥±¤°ç²Ú§®>0ƒ®RS¶Ó®~³¶À(€½¹ÍĞÕÀõmt±‘¸õmtì(€}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡°¹¹…µ”¤¹™½É… ¡Ğôùì½¹ÍĞ™åÌõÍÑ¹emĞ¹™É½µMÑ¹uññmt°ÑåÌõÍÑ¹emĞ¹Ñ½MÑ¹uññmtì¥˜ …™åÌ¹±•¹Ñ ˜˜…ÑåÌ¹±•¹Ñ ¥É•ÑÕÉ¸ì(€€€±•Ğ˜õ™åÍlÁtüıÑåÍlÁt±ÑĞõÑåÍlÁtüı™åÍlÁt±‰•ÍĞõ%¹™¥¹¥Ñäì(€€€™½È¡½¹ÍĞ„½˜€¡™åÌ¹±•¹Ñ ı™åÌémÑÑt¤¥™½È¡½¹ÍĞˆ½˜€¡ÑåÌ¹±•¹Ñ ıÑåÌém…t¤¥í½¹ÍĞõ5…Ñ ¹…‰Ì¡ˆµ„¤í¥˜¡ñ‰•ÍĞ¥í‰•ÍĞõí˜õ„íÑĞõˆíõô(€€€½¹ÍĞ‘½İ¸õÑĞøõ˜ì½¹ÍĞ•äõĞ¹…ÑMÑ…Ñ¥½¸ı˜é˜¬¡ÑĞµ˜¤¨¡Ğ¹™É…ñğÀ¤ì(€€€€¡‘½İ¸ı‘¸éÕÀ¤¹ÁÕÍ ¡í•ä±‘•ÍĞéĞ¹‘•ÍĞ±…ĞéĞ¹…ÑMÑ…Ñ¥½¸±±ÌéĞ¹±Ì±ÍÙ%‘àéĞ¹ÍÙ%‘à±±¥­±½¬éĞ¹±¥­±½­ô¤ìô¤ì(€±•Ğ¡¥ÁÌôœœì(€½¹ÍĞ±…¹”ô¡…ÉÈ±Í¥‘”±½°¤ôùì…ÉÈ¹Í½ÉĞ ¡„±ˆ¤ôù„¹•äµˆ¹•ä¤ì±•ĞÁÉ•Øô´ääì½¹ÍĞ±•™Ğô¡Í¥‘”ôôô±•™Ğœ¤°É…¥±`õ±•™ĞıÉ…¥±TéÉ…¥±°‘¥Èõ±•™Ğü´ÄèÄì(€€€…ÉÈ¹™½É… ¡Ğôùì±•Ğäõ5…Ñ ¹µ…à¡Ğ¹•ä°ÁÉ•Ø¬ÈÈ¤ìÁÉ•Øõäì(€€€€€ÍÙœ¬õ€ñÁ…Ñ ô‰4€‘íÉ…¥±aô€‘í¡Ğ¹•ä¥ô0€‘í¡É…¥±`­‘¥È¨ä¥ô€‘í¡ä¥ôˆÍÑÉ½­”ôˆ‘í½±ôˆÍÑÉ½­”µİ¥‘Ñ ôˆÄ¸Ğˆ½Á…¥Ñäôˆ¸Üˆ™¥±°ô‰¹½¹”ˆ¼ù€¬(€€€€€€€€€€€ñÁ…Ñ ôˆ‘í}µ•ÑÉ½1¥Ù•ÉÉ½İA…Ñ ¡É…¥±`±Ğ¹•ä±±•™Ğ¥ôˆ™¥±°ôˆ‘í½±ôˆ¼ù€ì(€€€€€½¹ÍĞÍÑå±”õ±•™ĞıÉ¥¡Ğè‘í¡\´¡É…¥±T´ÄÄ¤¥õÁàíÑ½Àè‘í¡ä¥õÁá€é±•™Ğè‘í¡É…¥±¬ÄÄ¥õÁàíÑ½Àè‘í¡ä¥õÁá€ì(€€€€€½¹ÍĞ±¥¹•ÉœõMÑÉ¥¹œ¡°¹¹…µ”¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€€€¡¥ÁÌ¬õ€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰µÑ°µ±Ñ°µÑÉ…¥¸€‘í±•™Ğü‘½İ¸œèÕÀô‘íĞ¹…Ğüœ…Ğœèœô‘íĞ¹±ÌøÀüœ•áÁÉ•ÍÌœèœôˆÍÑå±”ôˆ‘íÍÑå±•ôì´µÑŒè‘í½±ôˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½QÉ…¥¸ œ‘í±¥¹•Éôœ°‘íĞ¹ÍÙ%‘áô°‘íĞ¹±¥­±½­ô¤ˆÑ¥Ñ±”ô‹²^Ó²Â ƒ².sªÂ¶Fpƒ®ÎÓªâÀˆø‘í•ÍŒ¡}µ•ÑÉ½1¥Ù•QÉ…¥¹1…‰•°¡Ğ¹‘•ÍĞ±Ğ¹±Ì¤¥ôğ½‰ÕÑÑ½¸ù€ì(€€€ô¤ì(€ôì(€±…¹”¡‘¸°±•™Ğœ±½±½È¤ì±…¹”¡ÕÀ°É¥¡Ğœ°œ”ààØÍœ¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑ°µ±Ñ°ˆÍÑå±”ô‰¡•¥¡Ğè‘í¡ ¥õÁàíİ¥‘Ñ è‘í]õÁàì´µµŒè‘í½±½ÉôˆøñÍÙœ±…ÍÌô‰µÑ°µ±Ñ°µÍÙœˆİ¥‘Ñ ôˆ‘í]ôˆ¡•¥¡Ğôˆ‘í¡ ¥ôˆÙ¥•İ	½àôˆÀ€À€‘í]ô€‘í¡ ¥ôˆø‘íÍÙôğ½ÍÙœø‘í¹…µ•Ì¹©½¥¸ œœ¥ô‘í¡¥ÁÍôğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½¥ÍÁ±…å•ÍÑ¥¹…Ñ¥½¸¡‘•ÍĞ±±Ì±Í¡½ÜõÑÉÕ”¥ì(€¥˜ …Í¡½Ü¥É•ÑÕÉ¸€œ™¹‰ÍÀìœì(€É•ÑÕÉ¸€‘í}½ÁÍÍŒ¡‘•ÍĞ¥ô‘í±ÌôôôÄüœñ•´±…ÍÌô‰µÑˆÈµÈµ•áÁÉ•ÍÌˆûªâ'¶Z$ğ½•´øœé±ÌôôôÈüŸ¶*çªâ$œèŸ¶Z$õ€ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½I•¥½¹…±A½Í¥Ñ¥½¹!Q50¡À¥ì(€¥˜ …ÁññÀ¹ÍÑ…Ñ”ôôô‰•™½É”œ¥ì(€€€É•ÑÕÉ¸€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ±½ŒˆøñÍÁ…¸û²jÓ¶Z$ƒ²‚ğ½ÍÁ…¸øğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑˆÈµÉÍÑ…Ñ”ˆû²Ús®Âpƒ²b#²‚Tğ½ÍÁ…¸ù€ì(€ô(€¥˜¡À¹ÍÑ…Ñ”ôôô…™Ñ•Èœ¥ì(€€€É•ÑÕÉ¸€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ±½ŒˆøñÍÁ…¸û²Š²Â¤ğ½ÍÁ…¸øğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑˆÈµÉÍÑ…Ñ”ˆû²jÓ¶Z$ƒ²Š®0ğ½ÍÁ…¸ù€ì(€ô(€½¹ÍĞ±½ŒõÀ¹…İ…äôôôÀüŸ®.ç²^´œé}½ÁÍÍŒ¡À¹ÍÑ¸¤ì(€½¹ÍĞ…İ…äõ9Õµ‰•È¹¥Í¥¹¥Ñ”¡À¹…İ…ä¤˜™À¹…İ…äøÀı€‘íÀ¹…İ…å÷²‚²^µ€é±½Œì(€½¹ÍĞ±½!Q50õ…İ…ä„ôõ±½Œ(€€€€ı€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ±½ŒµÑˆÈµÉ±½Œ´µ™±¥ÀˆøñÍÁ…¸±…ÍÌô‰µÑˆÈµÉÍÑ…Ñ¥½¸ˆø‘í±½ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ…İ…äˆø‘í…İ…åôğ½ÍÁ…¸øğ½ÍÁ…¸ù€(€€€€é€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ±½ŒˆøñÍÁ…¸±…ÍÌô‰µÑˆÈµÉÍÑ…Ñ¥½¸ˆø‘í±½ôğ½ÍÁ…¸øğ½ÍÁ…¸ù€ì(€½¹ÍĞÍÑ…Ñ”õÀ¹…İ…äôôôÀ˜™À¹ÍÑ…Ñ”ôôôŸ²‚GªŞğœüŸ²‚GªŞğœéÀ¹ÍÑ…Ñ”ì(€É•ÑÕÉ¸€‘í±½!Q51ôñÍÁ…¸±…ÍÌô‰µÑˆÈµÉÍÑ…Ñ”ˆø‘íÍÑ…Ñ•ôğ½ÍÁ…¸ù€ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½UÉ‰…¹I½ÕÑ•!Q50¡±¥¹”±ÍÑ¸±Ô±•¹ÑÉ¥•Ì¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•tì(€¥˜ …•¹Ññğ…Ô¥É•ÑÕÉ¸€œœì(€½¹ÍĞ˜õ•¹Ğ¹ÑmÔ¹ÍÙtì¥˜ …˜¥É•ÑÕÉ¸€œœì(€½¹ÍĞ¹…µ•Ìõ•¹Ğ¹Ì°Í•Äõmtì(€™½È¡±•Ğ¬õÔ¹¬Àí¬ğõÔ¹¬Äí¬¬¬¥ì(€€€½¹ÍĞ¹…µ”õ¹…µ•Ím™lÌ©¬¬Éutì(€€€¥˜¡¹…µ”˜™Í•ÅmÍ•Ä¹±•¹Ñ ´Åt„ôõ¹…µ”¥Í•Ä¹ÁÕÍ ¡¹…µ”¤ì(€ô(€¥˜ …Í•Ä¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€±•ĞÑ…É•ĞõÍ•Ä¹¥¹‘•á=˜¡ÍÑ¸¤ì¥˜¡Ñ…É•ĞğÀ¥Ñ…É•ĞôÀì(€½¹ÍĞÍÑ…ÉĞõ5…Ñ ¹µ…à À±Ñ…É•Ğ´Ğ¤ì(€½¹ÍĞÍ¡½İ¸õÍ•Ä¹Í±¥”¡ÍÑ…ÉĞ±Ñ…É•Ğ¬Ä¤ì(€½¹ÍĞ‘•¹½µ¥¹…Ñ½Èõ5…Ñ ¹µ…à Ä±Í¡½İ¸¹±•¹Ñ ´Ä¤ì(€½¹ÍĞÍÑ…Ñ¥½¹!Q50õÍ¡½İ¸¹µ…À ¡¹…µ”±¤¤ôù€ñÍÁ…¸±…ÍÌô‰µÑˆµÕÉ‰…¸µÍÑ½À‘í¹…µ”ôôõÍÑ¸üœÕÉÉ•¹ĞœèœôˆÍÑå±”ôˆ´µÍÑ½ÀµÁ½Ìè‘íÍ¡½İ¸¹±•¹Ñ ôôôÄüÔÀè¡¤½‘•¹½µ¥¹…Ñ½È¤¨ÄÀÁô”ˆøñ¤øğ½¤øñˆø‘í}½ÁÍÍŒ¡¹…µ”¥ôğ½ˆøğ½ÍÁ…¸ù€¤¹©½¥¸ œœ¤ì(€½¹ÍĞÍÉØõàôø  ¡à´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€½¹ÍĞ¹½İ…Ñ”õ¹•Ü…Ñ” ¤ì(€½¹ÍĞ±½­9½ÜõÍÉØ¡¹½İ…Ñ”¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İ…Ñ”¹•Ñ5¥¹ÕÑ•Ì ¤­¹½İ…Ñ”¹•ÑM•½¹‘Ì ¤¼ØÀ¤ì(€½¹ÍĞÕ¹¥ÅÕ•¹ÑÉ¥•Ìõl¸¸¹¹•Ü5…À ¡•¹ÑÉ¥•Íññmt¤¹µ…À¡”ôùm€‘í”¹±¥¹•ññ±¥¹•õğ‘í”¹ÍÙõğ‘í”¹¬Áõğ‘í”¹¬Åõ€±•t¤¤¹Ù…±Õ•Ì ¥tì(€½¹ÍĞÑÉ…¥¹A½Í¥Ñ¥½¹ÌõÕ¹¥ÅÕ•¹ÑÉ¥•Ì¹µ…À¡”ôùì(€€€½¹ÍĞ•¹ÑÉå1¥¹”õ”¹±¥¹•ññ±¥¹”ì(€€€½¹ÍĞ•¹ÑÉå¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m•¹ÑÉå1¥¹•tì(€€€½¹ÍĞÍ•ÉÙ¥”õ•¹ÑÉå¹Ğ˜™•¹ÑÉå¹Ğ¹Ñm”¹ÍÙtì(€€€¥˜ …Í•ÉÙ¥”¥É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞ•¹ÑÉå9…µ•Ìõ•¹ÑÉå¹Ğ¹Ìì(€€€½¹ÍĞÉ…Üõmtì(€€€±•Ğ½™™Í•ĞôÀ°ÁÉ•Ù¥½ÕÌôµ%¹™¥¹¥Ñäì(€€€™½È¡±•Ğ¬õ”¹¬Àí¬ğõ”¹¬Äí¬¬¬¥ì(€€€€€±•Ğ…ÉÈõÍÉØ¡Í•ÉÙ¥•lÌ©­t¤­½™™Í•Ğ°‘•ÀõÍÉØ¡Í•ÉÙ¥•lÌ©¬¬Åt¤­½™™Í•Ğì(€€€€€İ¡¥±”¡…ÉÈñÁÉ•Ù¥½ÕÌ¥í½™™Í•Ğ¬ôÄĞĞÀí…ÉÈ¬ôÄĞĞÀí‘•À¬ôÄĞĞÀíô(€€€€€¥˜¡‘•Àñ…ÉÈ¥‘•À¬ôÄĞĞÀì(€€€€€ÁÉ•Ù¥½ÕÌõ‘•Àì(€€€€€É…Ü¹ÁÕÍ ¡í¹…µ”é•¹ÑÉå9…µ•ÍmÍ•ÉÙ¥•lÌ©¬¬Éut±…ÉÈ±‘•Áô¤ì(€€€ô(€€€¥˜ …É…Ü¹±•¹Ñ ¥É•ÑÕÉ¸¹Õ±°ì(€€€±•Ğ¹½Üõ±½­9½Üì(€€€İ¡¥±”¡¹½ÜñÉ…İlÁt¹…ÉÈ´ÜÈÀ¥¹½Ü¬ôÄĞĞÀì(€€€İ¡¥±”¡¹½ÜùÉ…İmÉ…Ü¹±•¹Ñ ´Åt¹‘•À¬ÜÈÀ¥¹½Ü´ôÄĞĞÀì(€€€¥˜¡¹½ÜñÉ…İlÁt¹…ÉÉññ¹½ÜùÉ…İmÉ…Ü¹±•¹Ñ ´Åt¹‘•À¥É•ÑÕÉ¸¹Õ±°ì(€€€±•ĞÑÉ…¥¹%¹‘•àõ¹Õ±°ì(€€€™½È¡±•Ğ¤ôÀí¤ñÉ…Ü¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞ¡•É”õÍ•Ä¹¥¹‘•á=˜¡É…İm¥t¹¹…µ”¤ì(€€€€€¥˜¡¡•É”ğÀ¥½¹Ñ¥¹Õ”ì(€€€€€¥˜¡¹½ÜøõÉ…İm¥t¹…ÉÈ˜™¹½ÜğõÉ…İm¥t¹‘•À¥íÑÉ…¥¹%¹‘•àõ¡•É”í‰É•…¬íô(€€€€€¥˜¡¤ñÉ…Ü¹±•¹Ñ ´Ä˜™¹½ÜùÉ…İm¥t¹‘•À˜™¹½ÜñÉ…İm¤¬Åt¹…ÉÈ¥ì(€€€€€€€½¹ÍĞÑ¡•É”õÍ•Ä¹¥¹‘•á=˜¡É…İm¤¬Åt¹¹…µ”¤ì(€€€€€€€¥˜¡Ñ¡•É”ğÀ¥½¹Ñ¥¹Õ”ì(€€€€€€€½¹ÍĞ™É…Œô¡¹½ÜµÉ…İm¥t¹‘•À¤½5…Ñ ¹µ…à Ä±É…İm¤¬Åt¹…ÉÈµÉ…İm¥t¹‘•À¤ì(€€€€€€€ÑÉ…¥¹%¹‘•àõ¡•É”¬¡Ñ¡•É”µ¡•É”¤©™É…Œì(€€€€€€€‰É•…¬ì(€€€€€ô(€€€ô(€€€¥˜¡ÑÉ…¥¹%¹‘•àôõ¹Õ±±ññÑÉ…¥¹%¹‘•àñÍÑ…ÉÑññÑÉ…¥¹%¹‘•àùÑ…É•Ğ¥É•ÑÕÉ¸¹Õ±°ì(€€€É•ÑÕÉ¸ì(€€€€€Á½Ìé5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸ ÄÀÀ° ¡ÑÉ…¥¹%¹‘•àµÍÑ…ÉĞ¤½‘•¹½µ¥¹…Ñ½È¤¨ÄÀÀ¤¤°(€€€€€±¥¹”é•¹ÑÉå1¥¹”±ÍÙŒé”¹ÍÙŒ±¬Àé”¹¬À±¬Äé”¹¬Ä°(€€€€€±¥­±½¬è ¡Í•ÉÙ¥•lÌ©”¹¬À¬Åt”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ(€€€ôì(€ô¤¹™¥±Ñ•È¡	½½±•…¸¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹Á½Ìµˆ¹Á½Ì¤ì(€½¹ÍĞ±…¹•¹‘Ìõlµ%¹™¥¹¥Ñä°µ%¹™¥¹¥Ñä°µ%¹™¥¹¥Ñä°µ%¹™¥¹¥Ñåtì(€½¹ÍĞÑÉ…¥¹!Q50õÑÉ…¥¹A½Í¥Ñ¥½¹Ì¹µ…À ¡ÑÉ…¥¸±¤¤ôùì(€€€½¹ÍĞÁ½ÌõÑÉ…¥¸¹Á½Ìì(€€€½¹ÍĞ±¥¹•ÉœõMÑÉ¥¹œ¡ÑÉ…¥¸¹±¥¹•ññ±¥¹”¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€±•Ğ±…¹”õ±…¹•¹‘Ì¹™¥¹‘%¹‘•à¡±…ÍĞôùÁ½Ìµ±…ÍĞøôÜ¤ì(€€€¥˜¡±…¹”ğÀ¥±…¹”õ¤•±…¹•¹‘Ì¹±•¹Ñ ì(€€€±…¹•¹‘Ím±…¹•tõÁ½Ìì(€€€É•ÑÕÉ¸€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰µÑˆµÕÉ‰…¸µÑÉ…¥¸ˆÍÑå±”ôˆ´µÑÉ…¥¸µÁ½Ìè‘íÁ½Íô”ì´µÑÉ…¥¸µ±…¹”è‘í±…¹”¨áõÁàˆ…É¥„µ±…‰•°ô‹²jÓ¶Z$ƒ²’Dƒ²^Ó²Â €‘í¤¬Åôƒ².sªÂ¶Fpƒ®ÎÓªâÀˆÑ¥Ñ±”ô‹²^Ó²Â ƒ².sªÂ¶Fpƒ®ÎÓªâÀˆ½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤í½Á•¹5•ÑÉ½QÉ…¥¸ œ‘í±¥¹•Éôœ°‘íÑÉ…¥¸¹ÍÙô°‘íÑÉ…¥¸¹±¥­±½­ô°‘íÑÉ…¥¸¹¬Áô°‘íÑÉ…¥¸¹¬Åô¤ˆûÂ~jğ½‰ÕÑÑ½¸ù€ì(€ô¤¹©½¥¸ œœ¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑˆÈµÕÉ‰…¸µÉ½ÕÑ”ˆø(€€€€ñ‘¥Ø±…ÍÌô‰µÑˆµÕÉ‰…¸µÑÉ…¬ˆøñÍÁ…¸±…ÍÌô‰µÑˆµÕÉ‰…¸µ±¥¹”ˆøğ½ÍÁ…¸ø‘íÍÑ…Ñ¥½¹!Q51ô‘íÑÉ…¥¹!Q51ôğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ…Ñ¥½¹	½…É‘!Q50¡ÍÑ¸±‘¥ÍÁ±…å	½…Éõ™…±Í”¥ì(€¥˜¡ÑåÁ•½˜5QI=}M!ôôôÕ¹‘•™¥¹•œ¤É•ÑÕÉ¸€œœì(€}µ•ÑÉ½	½…É‘MÑ¸õÍÑ¸ì(€½¹ÍĞÙ¥•İ5½‘”õ‘¥ÍÁ±…å	½…ÉüÁ½Ìœé}µ•ÑÉ½	½…É‘5½‘”ì(€½¹ÍĞ‘•ÁÌõ}µ•ÑÉ½MÑ…Ñ¥½¹•ÁÌ¡ÍÑ¸¤ì(€¥˜ …‘•ÁÌ¹±•¹Ñ ¤É•ÑÕÉ¸€œœì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì(€½¹ÍĞ¹½İM•Œõ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ÌØÀÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤¨ØÀ­¹½Ü¹•ÑM•½¹‘Ì ¤ì(€½¹ÍĞÍÉÙM•ŒõÌôø  ¡Ì´ÄĞĞÀÀ¤”àØĞÀÀ¤¬àØĞÀÀ¤”àØĞÀÀì€€€€€€¼¼ƒ²jÓ¶Z'²vğƒªâÃ²’ ƒ²Ò  ÀĞèÀÀôÀ¤(€½¹ÍĞ¹½İLõÍÉÙM•Œ¡¹½İM•Œ¤°¹½İ5¥¸õ5…Ñ ¹™±½½È¡¹½İM•Œ¼ØÀ¤ì(€½¹ÍĞÉÕ¹¹¥¹œõ‘•ÁÌ¹™¥±Ñ•È¡¼ôùí½¹ÍĞõ¼¹‘•À±„õ¼¹…ÉÈìÉ•ÑÕÉ¸€¡ğõ„¤ü¡¹½İ5¥¸øõ˜™¹½İ5¥¸ğõ„¤è¡¹½İ5¥¸øõ‘ññ¹½İ5¥¸ğõ„¤íô¤¹±•¹Ñ ì(€½¹ÍĞ™MÉÙ±½¬õÍÌôùí½¹ÍĞ´ô¡5…Ñ ¹™±½½È¡ÍÌ¼ØÀ¤¬ÈĞÀ¤”ÄĞĞÀíÉ•ÑÕÉ¸€‘í5…Ñ ¹™±½½È¡´¼ØÀ¥ôè‘íMÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€íôì€¼¼ƒ²jÓ¶Z'²vó²Ò#ŠK².sªÎ(€½¹ÍĞÉ•±QáĞõÉ•°ôùí½¹ÍĞ´õ5…Ñ ¹™±½½È¡É•°¼ØÀ¤ì¥˜¡´ğôÀ¥É•ÑÕÉ¸€ŸªÎœœìÉ•ÑÕÉ¸´¬Ÿ®Úœíôì€€€¼¼ƒ®Úƒ®.£²rƒ¶×²vğ äÃ®Úƒ².t¤(€€¼¼ƒ®ã²€ƒŠHƒ®Â§®¦Ğ£®.“²v3²^´¤ƒŠHƒ¶:àƒ®ª§®†t(€½¹ÍĞ±¥¹•Ìõíôì(€‘•ÁÌ¹™½É… ¡¼ôùì€¡±¥¹•Ím¼¹±¥¹•tõ±¥¹•Ím¼¹±¥¹•uññíô¤ì€¡±¥¹•Ím¼¹±¥¹•um¼¹¹•áÑtõ±¥¹•Ím¼¹±¥¹•um¼¹¹•áÑuññmt¤¹ÁÕÍ ¡¼¤ìô¤ì(€½¹ÍĞ±¥¹•=É‘•Èõ=‰©•Ğ¹­•åÌ¡±¥¹•Ì¤¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€½¹ÍĞ„õ=‰©•Ğ¹Ù…±Õ•Ì¡±¥¹•Ím…t¤¹É•‘Õ” ¡Ì±Ø¤ôùÌ­Ø¹±•¹Ñ °À¤ì(€€€½¹ÍĞˆõ=‰©•Ğ¹Ù…±Õ•Ì¡±¥¹•Ím‰t¤¹É•‘Õ” ¡Ì±Ø¤ôùÌ­Ø¹±•¹Ñ °À¤ì(€€€É•ÑÕÉ¸ˆµ„ì(€ô¤ì(€¥˜¡‘¥ÍÁ±…å	½…É¥ì(€€€½¹ÍĞÁÉ•Ù¥½ÕÍ1¥¹”ô¡}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÍm}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•áuññmt¥lÁuññ}µ•ÑÉ½¥ÍÁ±…å1¥¹•Ím}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•áuñğœœì(€€€}µ•ÑÉ½¥ÍÁ±…å1¥¹•Ìõ±¥¹•=É‘•Èì(€€€}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌõ}µ•ÑÉ½¥ÍÁ±…åÉ½ÕÁÍ½ÉMÑ…Ñ¥½¸¡ÍÑ¸±±¥¹•=É‘•È¤ì(€€€½¹ÍĞÁÉ•Í•ÉÙ•‘%¹‘•àõÁÉ•Ù¥½ÕÍ1¥¹”ı}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹™¥¹‘%¹‘•à¡É½ÕÀôùÉ½ÕÀ¹¥¹±Õ‘•Ì¡ÁÉ•Ù¥½ÕÍ1¥¹”¤¤è´Äì(€€€}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•àõÁÉ•Í•ÉÙ•‘%¹‘•àøôÀıÁÉ•Í•ÉÙ•‘%¹‘•àé5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸¡}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•à±}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ´Ä¤¤ì(€ô(€½¹ÍĞÉ•¹‘•É1¥¹•Ìõ‘¥ÍÁ±…å	½…Éü¡}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÍm}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•áuññm±¥¹•=É‘•ÉlÁut¤é±¥¹•=É‘•Èì(€½¹ÍĞÍ¡…É•‘¥ÍÁ±…äõ‘¥ÍÁ±…å	½…É˜™É•¹‘•É1¥¹•Ì¹±•¹Ñ øÄì(€±•Ğ‘¥ÍÁ±…å¥É1…‰•±Ìõmtì(€½¹ÍĞ‰½…É‘MÁ•Ìõ}µ•ÑÉ½M¡…É•‘	½…É‘MÁ•Ì¡±¥¹•Ì±É•¹‘•É1¥¹•Ì±Í¡…É•‘¥ÍÁ±…ä¤ì(€½¹ÍĞ‰±½­Ìõ‰½…É‘MÁ•Ì¹µ…À¡ÍÁ•Œôùì(€€€½¹ÍĞ±¥¹”õÍÁ•Œ¹±¥¹”±Í½ÕÉ•1¥¹•ÌõÍÁ•Œ¹Í½ÕÉ•1¥¹•Ì±‘¥ÉÌõÍÁ•Œ¹‘¥ÉÌ±Í¡…É•‘	±½¬õÍ½ÕÉ•1¥¹•Ì¹±•¹Ñ øÄì(€€€½¹ÍĞ½±½Èõ}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤±‰½…É‘-¥¹õ}µ•ÑÉ½	½…É‘-¥¹¡±¥¹”±ÍÑ¸¤ì(€€€€¼¼ƒ®ÚªâÃ²^´£ªÎ¶Ôƒ®.“²"`§²v ƒ²Š3¶FpƒªâÃ²’ €ËªÂpƒ®²ó®š°ƒ®Â§®¦Ó²ró®†pƒ®ÎG¶V¤ƒŠPƒªÂg²v ƒ²ªôƒªÎ¶×²v ƒ¶Vpƒ²^Ó²^@ƒ¶×¶V¤(€€€½¹ÍĞ‘¥É½Õ¹ÑÌõíôì=‰©•Ğ¹­•åÌ¡‘¥ÉÌ¤¹™½É… ¡¬ôù‘¥É½Õ¹ÑÍm­tõ‘¥ÉÍm­t¹±•¹Ñ ¤ì(€€€½¹ÍĞÉ½ÕÁÌõÍ¡…É•‘	±½¬ı}µ•ÑÉ½M¡…É•‘¥ÉÉ½ÕÁÌ¡Í½ÕÉ•1¥¹•Ì±ÍÑ¸±‘¥É½Õ¹ÑÌ¤é}µ•ÑÉ½¥ÉÉ½ÕÁÌ¡±¥¹”±ÍÑ¸±‘¥É½Õ¹ÑÌ¤ì(€€€¥˜¡‘¥ÍÁ±…å	½…É¥‘¥ÍÁ±…å¥É1…‰•±ÌõÉ½ÕÁÌ¹µ…À ¡ÉÀ±¤¤ôù€‘í¤ôôôÀüŸ¶Vc¶Z$œèŸ²¶Z$ôƒ
Ü€‘íÉÀ¹©½¥¸ Ÿ
Üœ¥ôƒ®Â§®¦Ñ€¤ì(€€€}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àõ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸¡}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•à±É½ÕÁÌ¹±•¹Ñ ´Ä¤¤ì(€€€½¹ÍĞÁ±…Ñ™½Éµ9½Ìõ}µ•ÑÉ½	½…É‘A±…Ñ™½ÉµÌ¡ÍÑ¸±±¥¹”¤ì(€€€½¹ÍĞ•ÍŒõàôùMÑÉ¥¹œ¡à¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€½¹ÍĞÁ±…Ñ™½Éµ½Èõ¼ôùì(€€€€€½¹ÍĞ½ÕÉÉ•¹”õ}µ•ÑÉ½A±…Ñ™½Éµ=ÕÉÉ•¹”¡¼¹±¥¹”±ÍÑ¸±¼¹¹•áĞ¤ì(€€€€€¥˜¡½ÕÉÉ•¹”ü¹Àü¹±•¹Ñ ¥É•ÑÕÉ¸½ÕÉÉ•¹”¹À¹©½¥¸ Ÿ
Üœ¤ì(€€€€€¥˜ …Í¡…É•‘	±½¬¥ì(€€€€€€€½¹ÍĞÉ½ÕÁ%¹‘•àõ5…Ñ ¹µ…à À±É½ÕÁÌ¹™¥¹‘%¹‘•à¡É½ÕÀôùÉ½ÕÀ¹¥¹±Õ‘•Ì¡¼¹¹•áĞ¤¤¤ì(€€€€€€€É•ÑÕÉ¸Á±…Ñ™½Éµ9½Ì¹±•¹Ñ ıÁ±…Ñ™½Éµ9½Ím5…Ñ ¹µ¥¸¡É½ÕÁ%¹‘•à±Á±…Ñ™½Éµ9½Ì¹±•¹Ñ ´Ä¥tèŸŠPœì(€€€€€ô(€€€€€½¹ÍĞÍ½ÕÉ•¥ÉÌõ±¥¹•Ím¼¹±¥¹•uññíô±Í½ÕÉ•½Õ¹ÑÌõíôí=‰©•Ğ¹­•åÌ¡Í½ÕÉ•¥ÉÌ¤¹™½É… ¡­•äôùÍ½ÕÉ•½Õ¹ÑÍm­•åtõÍ½ÕÉ•¥ÉÍm­•åt¹±•¹Ñ ¤ì(€€€€€½¹ÍĞÍ½ÕÉ•É½ÕÁÌõ}µ•ÑÉ½¥ÉÉ½ÕÁÌ¡¼¹±¥¹”±ÍÑ¸±Í½ÕÉ•½Õ¹ÑÌ¤ì(€€€€€½¹ÍĞÍ½ÕÉ•%¹‘•àõ5…Ñ ¹µ…à À±Í½ÕÉ•É½ÕÁÌ¹™¥¹‘%¹‘•à¡É½ÕÀôùÉ½ÕÀ¹¥¹±Õ‘•Ì¡¼¹¹•áĞ¤¤¤ì(€€€€€½¹ÍĞÍ½ÕÉ•A±…Ñ™½ÉµÌõ}µ•ÑÉ½	½…É‘A±…Ñ™½ÉµÌ¡ÍÑ¸±¼¹±¥¹”¤ì(€€€€€É•ÑÕÉ¸Í½ÕÉ•A±…Ñ™½ÉµÌ¹±•¹Ñ ıÍ½ÕÉ•A±…Ñ™½ÉµÍm5…Ñ ¹µ¥¸¡Í½ÕÉ•%¹‘•à±Í½ÕÉ•A±…Ñ™½ÉµÌ¹±•¹Ñ ´Ä¥tèŸŠPœì(€€€ôì(€€€½¹ÍĞ½±ÌõÉ½ÕÁÌ¹µ…À ¡ÉÀ±ÉÁ%‘à¤ôùì(€€€€€½¹ÍĞ±…‰•°õÉÀ¹©½¥¸ œƒŠˆ€œ¤ì(€€€€€½¹ÍĞí•¹ÑÉ¥•Ì±™¥ÉÍĞ±±…ÍÑôõ}µ•ÑÉ½É½ÕÁ¹ÑÉ¥•Ì¡‘¥ÉÌ±ÉÀ±Í¡…É•‘	±½¬¤ì(€€€€€½¹ÍĞÑ½QÉ…¥¸õ¼ôø¡íÉ•°é¼¹Í•Œµ¹½İL±‘•ÍĞé¼¹‘•ÍĞ±Í•Œé¼¹Í•Œ±¹•áĞé¼¹¹•áĞ±±Ìé¼¹±Ì±ÍÙŒé¼¹ÍÙŒ±±¥¹”é¼¹±¥¹”±¬Àé¼¹¬À±¬Äé¼¹¬Ä±Á±…ĞéÁ±…Ñ™½Éµ½È¡¼¥ô¤ì(€€€€€±•ĞÑÉ…¥¹Í!Ñµ°°É½ÕÑ•QÉ…¥¸õ•¹ÑÉ¥•ÍlÁtıÑ½QÉ…¥¸¡•¹ÑÉ¥•ÍlÁt¤é¹Õ±°ì(€€€€€¥˜¡¹½İLù±…ÍĞ¥ì(€€€€€€€€¼¼ƒ²b“®*`ƒ®'²Â ƒ²vÓ¶nƒŠHƒ²jÓ¶Z$ƒ²Š®0€¬ƒ²Ê¯²Â£
ß¶Z'²ƒ² ƒ²V#®
Ğ(€€€€€€€½¹ÍĞ™õ•¹ÑÉ¥•ÍlÁt˜™•¹ÑÉ¥•ÍlÁt¹‘•ÍĞì½¹ÍĞÍ¡½İõ™˜™™„ôõÍÑ¸ì(€€€€€€€ÑÉ…¥¹Í!Ñµ°õ€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ•¹‘•ˆøñÍÁ…¸±…ÍÌô‰µÑˆÈµ•¹‘•µĞˆû²jÓ¶Z$ƒ²Š®0ğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰µÑˆÈµ•¹‘•µ™¥ÉÍĞˆû²Ê¯²Â €‘í™MÉÙ±½¬¡™¥ÉÍĞ¥ô‘íÍ¡½İı€€ñˆø‘í™‘÷¶Z$ğ½ˆù€èœôğ½ÍÁ…¸øğ½‘¥Øù€ì(€€€€€ô•±Í”ì(€€€€€€€½¹ÍĞÕÀõ•¹ÑÉ¥•Ì¹µ…À¡Ñ½QÉ…¥¸¤(€€€€€€€€€€¹™¥±Ñ•È¡ÔôùÔ¹É•°øô´ØÀ¤€€€€€¼¼ƒ®.äƒ²b²^²vğƒ®
£²v ƒ²^Ó²Â£®0£®.“²v3®
ƒ®†pƒªÂC².àƒ²Z×²®†pƒ²Æ²jÃ² ƒ²V+²v0¤(€€€€€€€€€€¹Í½ÉĞ ¡„±ˆ¤ôù„¹É•°µˆ¹É•°¤(€€€€€€€€€€¹Í±¥” À°Ì¤ì(€€€€€€€É½ÕÑ•QÉ…¥¸õÕÁlÁuññ¹Õ±°ì(€€€€€€€ÑÉ…¥¹Í!Ñµ°õÕÀ¹µ…À ¡Ô±¤¤ôùì(€€€€€€€€€½¹ÍĞÍ¡½İ•ÍĞõÔ¹‘•ÍĞ˜™Ô¹‘•ÍĞ„ôõÍÑ¸ì€€€¼¼ƒ²zCªâÃ²Âã²†Àƒ®vó®Ê£®0ƒ²"£ªæ £²vã²‚G²^´ƒ²Š²Â§²v ƒ¶FsªâÀ¤(€€€€€€€€€½¹ÍĞ‘•ÍÑ!Q50õ‘¥ÍÁ±…å	½…É˜™‰½…É‘-¥¹ôôôÉ•¥½¹…°œ(€€€€€€€€€€€€ı}µ•ÑÉ½¥ÍÁ±…å•ÍÑ¥¹…Ñ¥½¸¡Ô¹‘•ÍĞ±Ô¹±Ì±Í¡½İ•ÍĞ¤(€€€€€€€€€€€€é€‘í}µ•ÑÉ½±ÍQ…œ¡Ô¹±Ì¥ô‘íÍ¡½İ•ÍĞıÔ¹‘•ÍĞ¬Ÿ¶Z$œèœ™¹‰ÍÀìõ€ì(€€€€€€€€€½¹ÍĞ‘•ÍÑ!Ñµ°õ€ñÍÁ…¸±…ÍÌô‰µÑˆÈµ‘•ÍĞˆø‘í‘•ÍÑ!Q51ôğ½ÍÁ…¸ù€ì(€€€€€€€€€±•Ğ¥¹™½!Ñµ°ì(€€€€€€€€€¥˜¡‘¥ÍÁ±…å	½…É˜™‰½…É‘-¥¹ôôôÉ•¥½¹…°œ¥ì(€€€€€€€€€€€¥¹™½!Ñµ°õ}µ•ÑÉ½I•¥½¹…±A½Í¥Ñ¥½¹!Q50¡}µ•ÑÉ½QÉ…¥¹A½Ì¡Ô¹±¥¹”±Ô¹ÍÙŒ±Ô¹¬À±Ô¹¬Ä±ÍÑ¸¤¤ì(€€€€€€€€€ô•±Í”¥˜¡Ù¥•İ5½‘”ôôôÁ½Ìœ¥ì(€€€€€€€€€€€½¹ÍĞÀõ}µ•ÑÉ½QÉ…¥¹A½Ì¡Ô¹±¥¹”±Ô¹ÍÙŒ±Ô¹¬À±Ô¹¬Ä±ÍÑ¸¤ì(€€€€€€€€€€€¥˜ …ÁññÀ¹ÍÑ…Ñ”ôôô‰•™½É”œ¥ì(€€€€€€€€€€€€€½¹ÍĞÍÑ…ÉĞõÀ˜™9Õµ‰•È¹¥Í¥¹¥Ñ”¡À¹ÍÑ…ÉÑ5¥¸¤ı€‘í5…Ñ ¹™±½½È¡À¹ÍÑ…ÉÑ5¥¸¼ØÀ¥ôè‘íMÑÉ¥¹œ¡À¹ÍÑ…ÉÑ5¥¸”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôƒ²jÓ¶Z$ƒ².s²zE€èœœì(€€€€€€€€€€€€€¥¹™½!Ñµ°õÍÑ…ÉĞı€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´µİ…¥ĞµÑˆÈµÁ½Ì´µ™±¥ÀˆøñÍÁ…¸û²jÓ¶Z$ƒ²‚ğ½ÍÁ…¸øñÍÁ…¸ø‘íÍÑ…ÉÑôğ½ÍÁ…¸øğ½ÍÁ…¸ù€èœñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´µİ…¥Ğˆû²jÓ¶Z$ƒ²‚ğ½ÍÁ…¸øœì(€€€€€€€€€€€ô(€€€€€€€€€€€•±Í”¥˜¡À¹ÍÑ…Ñ”ôôô…™Ñ•Èœ¤¥¹™½!Ñµ°ôœñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´µİ…¥Ğˆû²jÓ¶Z$ƒ²Š®0ğ½ÍÁ…¸øœì(€€€€€€€€€€€•±Í”¥˜¡À¹…İ…äôôôÀ¥ì(€€€€€€€€€€€€€½¹ÍĞÑáĞõÀ¹ÍÑ…Ñ”ôôôŸ²‚GªŞğœüŸ®.ç²^´ƒ²‚GªŞğœéÀ¹ÍÑ…Ñ”ôôôŸ®>²Â¤œüŸ®.ç²^´ƒ®>²Â¤œèŸ®.ç²^´ƒ²Ús®Âpœì(€€€€€€€€€€€€€½¹ÍĞÍŒõÀ¹ÍÑ…Ñ”ôôôŸ®>²Â¤œü…ĞœéÀ¹ÍÑ…Ñ”ôôôŸ²Ús®Âpœü‘•Àœè…ÁÀœì(€€€€€€€€€€€€€¥¹™½!Ñµ°õ€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´´‘íÍôˆøñˆø‘íÑáÑôğ½ˆøğ½ÍÁ…¸ù€ì(€€€€€€€€€€€ô•±Í”¥˜¡9Õµ‰•È¹¥Í¥¹¥Ñ”¡À¹…İ…ä¤˜™À¹…İ…äøÀ¥ì(€€€€€€€€€€€€€½¹ÍĞÍŒõÀ¹ÍÑ…Ñ”ôôôŸ®>²Â¤œü…ĞœéÀ¹ÍÑ…Ñ”ôôôŸ²Ús®Âpœü‘•Àœè…ÁÀœì(€€€€€€€€€€€€€¥¹™½!Ñµ°õ€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´´‘íÍôµÑˆÈµÁ½Ì´µ™±¥ÀˆøñÍÁ…¸ø‘í}½ÁÍÍŒ¡À¹ÍÑ¸¥ô€ñˆø‘íÀ¹ÍÑ…Ñ•ôğ½ˆøğ½ÍÁ…¸øñÍÁ…¸ø‘íÀ¹…İ…å÷²‚²^´€ñˆø‘íÀ¹ÍÑ…Ñ•ôğ½ˆøğ½ÍÁ…¸øğ½ÍÁ…¸ù€ì(€€€€€€€€€€€ô•±Í”ì(€€€€€€€€€€€€€½¹ÍĞÍŒõÀ¹ÍÑ…Ñ”ôôôŸ®>²Â¤œü…ĞœéÀ¹ÍÑ…Ñ”ôôôŸ²Ús®Âpœü‘•Àœè…ÁÀœì(€€€€€€€€€€€€€¥¹™½!Ñµ°õ€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ½ÌµÑˆÈµÁ½Ì´´‘íÍôˆø‘í}½ÁÍÍŒ¡À¹ÍÑ¸¥ô€ñˆø‘íÀ¹ÍÑ…Ñ•ôğ½ˆøğ½ÍÁ…¸ù€ì(€€€€€€€€€€€ô(€€€€€€€€€ô•±Í”ì(€€€€€€€€€€€¥¹™½!Ñµ°õ€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÉ•°ˆø‘íÉ•±QáĞ¡Ô¹É•°¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑˆÈµ±¬ˆø‘í™MÉÙ±½¬¡Ô¹Í•Œ¥ôğ½ÍÁ…¸ù€ì(€€€€€€€€€ô(€€€€€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑˆÈµÑÉ…¥¸‘í¤ôôôÀüœµÑˆÈµÑÉ…¥¸´µ¹½Üœèœôˆø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰µÑˆÈµÍ•Äˆø‘í¤¬Åôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑˆÈµÁ±…Ğˆø‘íÔ¹Á±…ĞôôôŸŠPœüŸŠPœéÔ¹Á±…Ğ¬Ÿ¶f ôğ½ÍÁ…¸ø‘í‘•ÍÑ!Ñµ±ô‘í¥¹™½!Ñµ±ôğ½‘¥Øù€ì(€€€€€€€ô¤¹©½¥¸ œœ¥ñğœñ‘¥Ø±…ÍÌô‰µÑˆÈµ¹½¹”ˆû²jÓ¶Z$ƒ²‚W®ÎĞƒ²^²v0ğ½‘¥Øøœì(€€€€€ô(€€€€€½¹ÍĞÉ½ÕÑ•1¥¹”õÍ¡…É•‘	±½¬ü¡•¹ÑÉ¥•Ì¹™¥¹¡•¹ÑÉäôù•¹ÑÉä¹±¥¹”ôôõ±¥¹”¤ü¹±¥¹•ññ•¹ÑÉ¥•ÍlÁtü¹±¥¹•ññ±¥¹”¤é±¥¹”ì(€€€€€½¹ÍĞÁÉ¥µ…Éå¹ÑÉ¥•ÌõÍ¡…É•‘	±½¬ı•¹ÑÉ¥•Ì¹™¥±Ñ•È¡•¹ÑÉäôù•¹ÑÉä¹±¥¹”ôôõÉ½ÕÑ•1¥¹”¤é•¹ÑÉ¥•Ìì(€€€€€½¹ÍĞÁÉ¥µ…ÉåI½ÕÑ•QÉ…¥¸õÁÉ¥µ…Éå¹ÑÉ¥•ÍlÁtıÑ½QÉ…¥¸¡ÁÉ¥µ…Éå¹ÑÉ¥•ÍlÁt¤éÉ½ÕÑ•QÉ…¥¸ì(€€€€€½¹ÍĞÉ½ÕÑ•¹ÑÉ¥•ÌõÍ¡…É•‘	±½¬ı•¹ÑÉ¥•ÌéÁÉ¥µ…Éå¹ÑÉ¥•Ìì(€€€€€½¹ÍĞÉ½ÕÑ•!Q50õ‘¥ÍÁ±…å	½…É˜™‰½…É‘-¥¹ôôôÕÉ‰…¸œ(€€€€€€€€ı}µ•ÑÉ½UÉ‰…¹I½ÕÑ•!Q50¡É½ÕÑ•1¥¹”±ÍÑ¸±ÁÉ¥µ…ÉåI½ÕÑ•QÉ…¥¸±É½ÕÑ•¹ÑÉ¥•Ì¤(€€€€€€€€é€ñ‘¥Ø±…ÍÌô‰µÑˆÈµÕÉ‰…¸µÉ½ÕÑ”ˆøñÍÁ…¸ø‘í}½ÁÍÍŒ¡ÍÑ¸¥ôğ½ÍÁ…¸øñ¤øğ½¤øñ¤øğ½¤øñ¤øğ½¤øñˆø‘í}½ÁÍÍŒ¡ÉÁlÁuññ±…‰•°¥ôğ½ˆøğ½‘¥Øù€ì(€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ½°ˆ‘…Ñ„µ‘¥Èôˆ‘íÉÁ%‘áôˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ‘¥ÈˆøñÍÁ…¸±…ÍÌô‰µÑˆÈµ…ÉÈˆûŠZàğ½ÍÁ…¸ø‘í±…‰•±ôƒ®Â§®¦Ğğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ±•µ¡•…ˆøñÍÁ…¸û²"s®Ê ğ½ÍÁ…¸øñÍÁ…¸û¶®*PƒªÎÌğ½ÍÁ…¸øñÍÁ…¸û¶Z'²ƒ² ğ½ÍÁ…¸øñÍÁ…¸û¶b²r²æ`ğ½ÍÁ…¸øñÍÁ…¸û²¶pğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€‘íÑÉ…¥¹Í!Ñµ±ô(€€€€€€€€‘íÉ½ÕÑ•!Q51ô(€€€€€€€€‘í‘¥ÍÁ±…å	½…É˜™‰½…É‘-¥¹ôôôÕÉ‰…¸œüœœé€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ™°ˆû²Ê¬€‘í™MÉÙ±½¬¡™¥ÉÍĞ¥ôƒ
Üƒ®$€‘í™MÉÙ±½¬¡±…ÍĞ¥ôğ½‘¥Øùô(€€€€€€ğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤ì(€€€½¹ÍĞ±½¬õ€‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ!½ÕÉÌ ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€€€½¹ÍĞ±¥¹•±…ÍÌõ‘¥ÍÁ±…å	½…Éı€µÑˆÈµ±¥¹”´´‘í‰½…É‘-¥¹‘õ€èœœì(€€€½¹ÍĞ½Á•¹Ñ¥½¸õ‘¥ÍÁ±…å	½…É(€€€€€€ı±½Í•5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä ¤í½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±” œ‘í•ÍŒ¡ÍÑ¸¥ôœ°œ‘í•ÍŒ¡±¥¹”¥ôœ¥€(€€€€€€é½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±” œ‘í•ÍŒ¡ÍÑ¸¥ôœ°œ‘í•ÍŒ¡±¥¹”¥ôœ¥€ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ±¥¹”‘í±¥¹•±…ÍÍôˆÍÑå±”ôˆ´µµŒè‘í½±½ÉôíÕÉÍ½ÈéÁ½¥¹Ñ•Èˆ½¹±¥¬ôˆ‘í½Á•¹Ñ¥½¹ôˆÉ½±”ô‰‰ÕÑÑ½¸ˆÑ¥Ñ±”ô‹²‚²ÊĞƒ².sªÂ¶Fpƒ®ÎÓªâÀˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ±¡•…ˆøñÍÁ…¸±…ÍÌô‰µÑˆÈµ‘½Ğˆøğ½ÍÁ…¸øñˆø‘í}½ÁÍÍŒ¡ÍÁ•Œ¹±…‰•°¥ôğ½ˆø(€€€€€€€€‘í‘¥ÍÁ±…å	½…Éı€ñÍÁ…¸±…ÍÌô‰µÑˆÈµ‘•Ù¥”µÑ¥Ñ±”ˆø‘í‰½…É‘-¥¹ôôôÉ•¥½¹…°œı€‘íÍÑ¹ôƒ®Â§®¦Ğƒ¶®*PƒªÎÌƒ²V#®
Ñ€èŸ²vÓ®Ê#²^Ó²Â ƒ²jÓ¶Z$ƒ²V#®
Ğôğ½ÍÁ…¸ø(€€€€€€€€ñÑ¥µ”ø‘í±½­ôğ½Ñ¥µ”ù€èœôñÍÁ…¸±…ÍÌô‰µÑˆÈµµ½É”ˆû²‚²ÊĞƒ².sªÂ¶FpƒŠèğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑˆÈµ½±Ìˆø‘í½±Íôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞ‰½…É‘%õ‘¥ÍÁ±…å	½…Éüµ•ÑÉ¼µ‘¥ÍÁ±…äµ‰½…Éœèµ•ÑÉ¼µ‰½…Éœì(€½¹ÍĞÍ•±•Ñ•‘É½ÕÀõ‘¥ÍÁ±…å	½…Éü¡}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÍm}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•áuññmt¤émtì(€½¹ÍĞÍ•±•Ñ•‘1¥¹”õÍ•±•Ñ•‘É½ÕÁlÁuñğœœì(€½¹ÍĞÍ•±•Ñ•‘½±½Èõ‘¥ÍÁ±…å	½…Éı}µ•ÑÉ½1¥¹•½±½È¡Í•±•Ñ•‘1¥¹”¤èœœì(€½¹ÍĞÍ•±•Ñ•‘1…‰•°õÍ•±•Ñ•‘É½ÕÀ¹±•¹Ñ øÄıÍ•±•Ñ•‘É½ÕÀ¹©½¥¸ œƒ
Ü€œ¤éÍ•±•Ñ•‘1¥¹”ì(€½¹ÍĞ±¥¹•9…Øõ‘¥ÍÁ±…å	½…Éı€ñ‘¥Ø±…ÍÌô‰µÑˆµ‘¥ÍÁ±…äµ±¥¹”µ¹…ØˆÍÑå±”ôˆ´µµŒè‘íÍ•±•Ñ•‘½±½Éôˆø(€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤íÍ•Ñ5•ÑÉ½¥ÍÁ±…å1¥¹” ´Ä¤ˆ…É¥„µ±…‰•°ô‹²vÓ²‚ƒ®ã²€ˆ‘í}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ğÈüœ‘¥Í…‰±•œèœôûŠ^ ğ½‰ÕÑÑ½¸ø(€€€€ñÍÁ…¸øñ¤øğ½¤øñˆø‘í}½ÁÍÍŒ¡Í•±•Ñ•‘1…‰•°¥ôğ½ˆøñÍµ…±°ø‘í}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•à¬Åô€¼€‘í}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ¡ôğ½Íµ…±°øğ½ÍÁ…¸ø(€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤íÍ•Ñ5•ÑÉ½¥ÍÁ±…å1¥¹” Ä¤ˆ…É¥„µ±…‰•°ô‹®.“²v0ƒ®ã²€ˆ‘í}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌ¹±•¹Ñ ğÈüœ‘¥Í…‰±•œèœôûŠZØğ½‰ÕÑÑ½¸ø(€€ğ½‘¥Øù€èœœì(€½¹ÍĞ‘¥É9…Øõ‘¥ÍÁ±…å	½…É˜™‘¥ÍÁ±…å¥É1…‰•±Ì¹±•¹Ñ øÄı€ñ‘¥Ø±…ÍÌô‰µÑˆµ‘¥ÍÁ±…äµ‘¥Èµ¹…ØˆÍÑå±”ôˆ´µµŒè‘íÍ•±•Ñ•‘½±½Éôˆø(€€€€‘í‘¥ÍÁ±…å¥É1…‰•±Ì¹Í±¥” À°È¤¹µ…À ¡±…‰•°±¤¤ôù€ñ‰ÕÑÑ½¸±…ÍÌôˆ‘í}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àôôõ¤ü½¸œèœôˆ½¹±¥¬ô‰•Ù•¹Ğ¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤íÍ•Ñ5•ÑÉ½¥ÍÁ±…å¥É•Ñ¥½¸ ‘í¥ô¤ˆø‘í}½ÁÍÍŒ¡±…‰•°¥ôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€ğ½‘¥Øù€èœœì(€É•ÑÕÉ¸€ñ‘¥Ø¥ôˆ‘í‰½…É‘%‘ôˆÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁàí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ˆø(€€€€‘í‘¥ÍÁ±…å	½…Éı±¥¹•9…Øé€ñ‘¥Ø±…ÍÌô‰µÑˆµ¡•…ˆøñÍÁ…¸±…ÍÌô‰µÑˆµÑ¥Ñ±”ˆûÂ~jƒ².“².sªÂƒ®>²Â¤ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÑˆµµ½‘•Ñ½œˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÑˆµµ½‘”‘í}µ•ÑÉ½	½…É‘5½‘”ôôôÑ¥µ”œüœ½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½	½…É‘5½‘” Ñ¥µ”œ¤ˆû².sªÂğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÑˆµµ½‘”‘í}µ•ÑÉ½	½…É‘5½‘”ôôôÁ½Ìœüœ½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5•ÑÉ½	½…É‘5½‘” Á½Ìœ¤ˆû¶b²r²æ`ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½ÍÁ…¸øğ½‘¥Øùô(€€€€‘í‘¥É9…Ùô(€€€€ñ‘¥Ø±…ÍÌôˆ‘í‘¥ÍÁ±…å	½…ÉüµÑˆµ‘¥ÍÁ±…äµÍ•±•Ñ•µ‘¥ÈµÑˆµ‘¥ÍÁ±…äµ‘¥È´œ­}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àèœôˆø(€€€€‘í‰±½­Íô(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µÑˆµ™½½Ğˆû²vãªÊ3²zƒ².sªÂ¶FpƒªâÃ²’ ƒ
Üƒ²jÓ¶Z$€‘íÉÕ¹¹¥¹÷¶:àƒ
Ü€‘íÙ¥•İ5½‘”ôôôÁ½ÌœüŸ¶:ã²Äƒ¶b²r²æ`£²^·®ª
ß®
£²v ƒ²^´ƒ²"`¤œèŸªÎ¶×®Îƒ².“²‚pƒ²Â§®Âpƒ®Âc²bôğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô(¼¼ƒ²vãªÊ3²z1¥¹—²v ŠIŠIƒ²ƒ¶bW²^C²pƒªÂg²v ƒ²^·²vƒ®Â§¶Z—®Î½ÕÉÉ•¹—®†pƒ®RÃ®†pƒ®ÎÓªÒ¶Vs®.¸(¼¼ƒ².“²‚pƒ¶:ã²Ç²v`ƒ®.“²v0ƒ²‚W²Â£²^·²vĞÉ½ÕÑ—²ƒ²ZÓ®*@½ÕÉÉ•¹”ƒ®J“²^@ƒ²b“®*S² ƒ®æªÖC¶VĞƒ²
³²j§¶V€ƒ²*çªÂW²z—²vƒ²Âû®*S®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½A±…Ñ™½Éµ=ÕÉÉ•¹”¡±¥¹”±ÍÑ¸±¹•áĞ¥ì(€½¹ÍĞ‘…Ñ„ô¡ÑåÁ•½˜5QI=}A1Q=I5}%IQ%=9L„ôôÕ¹‘•™¥¹•œ˜™5QI=}A1Q=I5}%IQ%=9L¹±¥¹•Ìü¹m±¥¹•t¥ññ¹Õ±°ì(€½¹ÍĞÉ½İÌõ‘…Ñ„ü¹Á±…Ñ™½ÉµÌü¹mÍÑ¹uññmt±É½ÕÑ”õ‘…Ñ„ü¹É½ÕÑ•ññmtì(€¥˜ …É½İÌ¹±•¹Ñ ¥É•ÑÕÉ¸¹Õ±°ì(€±•Ğ‰•ÍĞõ¹Õ±°±‰•ÍÑ…Àõ%¹™¥¹¥Ñäì(€É½İÌ¹™½É… ¡É½Üôùì(€€€±•Ğ‰½Õ¹õÉ½ÕÑ”¹±•¹Ñ ì(€€€™½È¡±•Ğ¤õÉ½Ü¹¤¬Äí¤ñÉ½ÕÑ”¹±•¹Ñ í¤¬¬¥í¥˜¡É½ÕÑ•m¥tôôõÍÑ¸¥í‰½Õ¹õ¤í‰É•…¬íõô(€€€™½È¡±•Ğ¤õÉ½Ü¹¤¬Äí¤ñ‰½Õ¹í¤¬¬¥ì(€€€€€¥˜¡É½ÕÑ•m¥tôôõ¹•áĞ˜™¤µÉ½Ü¹¤ñ‰•ÍÑ…À¥í‰•ÍĞõÉ½Üí‰•ÍÑ…Àõ¤µÉ½Ü¹¤í‰É•…¬íô(€€€ô(€ô¤ì(€¥˜¡‰•ÍĞ¥É•ÑÕÉ¸‰•ÍĞì(€€¼¼ƒ®.£®Â§¶Z”ƒ²zC®3®
`ƒ®Ú#²f²‚¶Vpƒ²²ƒ²v ƒªÂ²z”ƒªÂªæ3²jĞƒ®>g²vğƒ²^´½ÕÉÉ•¹—®–ğƒ²V#²‚¶Vpƒ¶>Ó®ÂÇ²ró®†pƒ²
³²j§¶Vs®.¸(€É½İÌ¹™½É… ¡É½Üôùì(€€€É½ÕÑ”¹™½É…  ¡¹…µ”±¥¹‘•à¤ôùì(€€€€€½¹ÍĞ…Àõ5…Ñ ¹…‰Ì¡¥¹‘•àµÉ½Ü¹¤¤ì(€€€€€¥˜¡¹…µ”ôôõ¹•áĞ˜™…ÀøÀ˜™…Àñ‰•ÍÑ…À¥í‰•ÍĞõÉ½Üí‰•ÍÑ…Àõ…Àíô(€€€ô¤ì(€ô¤ì(€É•ÑÕÉ¸‰•ÍÑññÉ½İÍlÁtì)ô()™Õ¹Ñ¥½¸}µ•ÑÉ½A±…Ñ™½ÉµUÍ•Ì¡ÍÑ¸±Á±…Ñ™½É´¥ì(€½¹ÍĞÕÍ•Ìõ¹•Ü5…À ¤±…Ñ¥Ù•1¥¹•Ìõ¹•ÜM•Ğ¡}µ•ÑÉ½MÑ…Ñ¥½¹•ÁÌ¡ÍÑ¸¤¹µ…À¡¥Ñ•´ôù¥Ñ•´¹±¥¹”¤¤ì(€½¹ÍĞ±¥¹•Ìô¡ÑåÁ•½˜5QI=}A1Q=I5}%IQ%=9L„ôôÕ¹‘•™¥¹•œ˜™5QI=}A1Q=I5}%IQ%=9L¹±¥¹•Ì¥ññíôì(€=‰©•Ğ¹•¹ÑÉ¥•Ì¡±¥¹•Ì¤¹™½É…  ¡m±¥¹”±‘…Ñ…t¤ôùì(€€€¥˜¡…Ñ¥Ù•1¥¹•Ì¹Í¥é”˜˜……Ñ¥Ù•1¥¹•Ì¹¡…Ì¡±¥¹”¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞÉ½±•Ìõ¹•ÜM•Ğ ¤ì(€€€€¡‘…Ñ„¹Á±…Ñ™½ÉµÌü¹mÍÑ¹uññmt¤¹™½É… ¡É½Üôùì(€€€€€¥˜ ¡É½Ü¹Áññmt¤¹¥¹±Õ‘•Ì¡Á±…Ñ™½É´¤¥É½±•Ì¹…‘ Ÿ²ğœ¤ì(€€€€€¥˜ ¡É½Ü¹…ññmt¤¹¥¹±Õ‘•Ì¡Á±…Ñ™½É´¤¥É½±•Ì¹…‘ Ÿ®ÎÓ²†Àœ¤ì(€€€ô¤ì(€€€¥˜¡É½±•Ì¹Í¥é”¥ÕÍ•Ì¹Í•Ğ¡±¥¹”±í±¥¹”±½±½Èé}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤±É½±•Ìél¸¸¹É½±•Íuô¤ì(€ô¤ì(€€¼¼ƒ²Ös².€ƒ²nC®Îã²^@ƒ²^®*Pƒ²"c®>dƒ²‚²Ê€ƒ®ã²ƒ²v ƒªâÃ²†ĞA1Q=I5}²v`ƒ®ã²€ƒ²^ÃªÊÃ²vƒ²rƒ²¶Vs®.¸(€¥˜¡ÑåÁ•½˜A1Q=I5}„ôôÕ¹‘•™¥¹•œ¥ì(€€€½¹ÍĞ­•äõA1Q=I5}	mÍÑ¹tıÍÑ¸è¡A1Q=I5}	mÍÑ¸¬Ÿ²^´tıÍÑ¸¬Ÿ²^´œé¹Õ±°¤ì(€€€½¹ÍĞ¥¹™¼õ­•ä˜™A1Q=I5}	m­•åtü¹mMÑÉ¥¹œ¡Á±…Ñ™½É´¥tì(€€€€¡¥¹™¼ü¹±ññmt¤¹™½É… ¡É…Üôùì(€€€€€½¹ÍĞ±¥¹”õMÑÉ¥¹œ¡É…Ü¤¹ÍÁ±¥Ğ œ¼œ¥lÁt¹ÍÁ±¥Ğ œ€ œ¥lÁt¹ÑÉ¥´ ¤ì(€€€€€¥˜¡…Ñ¥Ù•1¥¹•Ì¹¡…Ì¡±¥¹”¤˜˜…ÕÍ•Ì¹¡…Ì¡±¥¹”¤¥ÕÍ•Ì¹Í•Ğ¡±¥¹”±í±¥¹”±½±½Èé}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤±É½±•ÌélŸ²ğuô¤ì(€€€ô¤ì(€ô(€É•ÑÕÉ¸l¸¸¹ÕÍ•Ì¹Ù…±Õ•Ì ¥t¹Í½ÉĞ ¡„±ˆ¤ôù„¹±¥¹”¹±½…±•½µÁ…É”¡ˆ¹±¥¹”°­¼œ¤¤ì)ô((¼¼ƒ¶:ã²Äƒ®ÂÃ²^Ó²^C²pƒ¶b²z°ƒ²^´ƒ²vÓ¶n²v`ƒ².“²‚pƒ²jÓ¶Z$ƒªÖ³ªÂ²vƒ®Î×²nC¶Vs®.¸ŠIŠIƒ²ƒ¶bW®>ƒ®.“²v0ƒ²^·²ró®†p½ÕÉÉ•¹—®–ğƒªÖ³®Ú¶Vs®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½M•ÉÙ¥•A…Ñ ¡ÍÑ¸±‘•À¥ì(€½¹ÍĞ•¹ĞõÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ˜™5QI=}M!m‘•À¹±¥¹•t±˜õ•¹Ğü¹Ğü¹m‘•À¹ÍÙtì(€¥˜ …•¹Ññğ…˜¥É•ÑÕÉ¸mtì(€½¹ÍĞ¸õ˜¹±•¹Ñ ¼Ì±…Ğõ¬ôù•¹Ğ¹Ím™lÌ©¬¬Éutì(€±•ĞÍÑ…ÉĞô´Äì(€™½È¡±•Ğ¬õ5…Ñ ¹µ…à À±‘•À¹¬ÁñğÀ¤í¬ñ¸´Äí¬¬¬¥ì(€€€¥˜¡…Ğ¡¬¤ôôõÍÑ¸˜™…Ğ¡¬¬Ä¤ôôõ‘•À¹¹•áĞ¥íÍÑ…ÉĞõ¬í‰É•…¬íô(€ô(€¥˜¡ÍÑ…ÉĞğÀ¥í™½È¡±•Ğ¬ôÀí¬ñ¸´Äí¬¬¬¥í¥˜¡…Ğ¡¬¤ôôõÍÑ¸˜™…Ğ¡¬¬Ä¤ôôõ‘•À¹¹•áĞ¥íÍÑ…ÉĞõ¬í‰É•…¬íõõô(€¥˜¡ÍÑ…ÉĞğÀ¥É•ÑÕÉ¸mtì(€½¹ÍĞ•¹õ5…Ñ ¹µ¥¸¡9Õµ‰•È¹¥Í¥¹¥Ñ”¡‘•À¹¬Ä¤ı‘•À¹¬Äé¸´Ä±¸´Ä¤±Á…Ñ õmtì(€™½È¡±•Ğ¬õÍÑ…ÉĞí¬ğõ•¹í¬¬¬¥í½¹ÍĞ¹…µ”õ…Ğ¡¬¤í¥˜¡¹…µ”˜™Á…Ñ¡mÁ…Ñ ¹±•¹Ñ ´Åt„ôõ¹…µ”¥Á…Ñ ¹ÁÕÍ ¡¹…µ”¤íô(€É•ÑÕÉ¸Á…Ñ ì)ô()™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ…Ñ¥½¹%µÁ½ÉÑ…¹”¡¹…µ”¥ì(€¥˜ …¹…µ”¥É•ÑÕÉ¸€Àì(€±•ĞÍ½É”õ}¥ÍQÉ…¥¹MÑ¸¡¹…µ”¤üĞèÀì(€¥˜¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ¥5QI=}1%9L¹™½É… ¡±¥¹”ôùì(€€€¥˜ ¡±¥¹”¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé±¥¹”¹ÍÑ…Ñ¥½¹Íññmuõt¤¹Í½µ”¡É½ÕÑ”ôø¡É½ÕÑ”¹ÍÑ…Ñ¥½¹Íññmt¤¹¥¹±Õ‘•Ì¡¹…µ”¤¤¥Í½É”¬¬ì(€ô¤ì(€É•ÑÕÉ¸Í½É”ì)ô((¼¼ƒ².“²‚pƒ¶Z'²€ƒ²V#®
Ó¶2C²Êc®~ğƒ®.“²v3²^´€ÇªÎÏ
ß²ó²jS²^´ƒ²Ös®2 €ÏªÎÏ
ß®2¶Fpƒ²Ös²Šƒ²Š²Â§²^´€ÇªÎÏ²vƒ²jÓ¶Z$ƒ²"s²s®2®†pƒªÎƒ®–ã®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½¥É•Ñ¥½¹1…¹‘µ…É­Ì¡ÍÑ¸±É½Ü¥ì(€¥˜¡É½Ü¹Ñ•Éµ¥¹…Ñ¥¹œ˜˜…É½Ü¹‘•ÁÌ¹±•¹Ñ ¥É•ÑÕÉ¸mtì(€½¹ÍĞÁ…Ñ¡ÌõÉ½Ü¹‘•ÁÌ¹µ…À¡‘•Àôù}µ•ÑÉ½M•ÉÙ¥•A…Ñ ¡ÍÑ¸±‘•À¤¤¹™¥±Ñ•È¡Á…Ñ ôùÁ…Ñ ¹±•¹Ñ øÄ¤¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹±•¹Ñ µ„¹±•¹Ñ ¤ì(€½¹ÍĞ¹•áĞõl¸¸¹¹•ÜM•Ğ¡É½Ü¹‘•ÁÌ¹µ…À¡‘•Àôù‘•À¹¹•áĞ¤¹™¥±Ñ•È¡¹…µ”ôù¹…µ”˜™¹…µ”„ôõÍÑ¸¤¥tì(€½¹ÍĞÑ•Éµ¥¹¤õl¸¸¹¹•ÜM•Ğ¡É½Ü¹‘•ÁÌ¹µ…À¡‘•Àôù‘•À¹‘•ÍĞ¤¹™¥±Ñ•È¡¹…µ”ôù¹…µ”˜™¹…µ”„ôõÍÑ¸¤¥tì(€½¹ÍĞ½ÕĞõmt±Í••¸õ¹•ÜM•Ğ ¤±ÁÕÍ ô¡¹…µ”±­¥¹¤ôùí¥˜¡¹…µ”˜˜…Í••¸¹¡…Ì¡¹…µ”¤˜™½ÕĞ¹±•¹Ñ ğÔ¥íÍ••¸¹…‘¡¹…µ”¤í½ÕĞ¹ÁÕÍ ¡í¹…µ”±­¥¹‘ô¤íõôì(€¹•áĞ¹Í±¥” À°Ä¤¹™½É… ¡¹…µ”ôùÁÕÍ ¡¹…µ”°Ÿ®.“²v3²^´œ¤¤ì(€½¹ÍĞÁ…Ñ õÁ…Ñ¡ÍlÁuññmt±Ñ•Éµ¥¹…°õÁ…Ñ¡mÁ…Ñ ¹±•¹Ñ ´ÅuññÑ•Éµ¥¹¥lÁuññ¹Õ±°ì(€½¹ÍĞµ¥‘‘±”õÁ…Ñ ¹Í±¥” È°´Ä¤¹™¥±Ñ•È¡¹…µ”ôø…Í••¸¹¡…Ì¡¹…µ”¤˜™¹…µ”„ôõÑ•Éµ¥¹…°¤ì(€¥˜¡µ¥‘‘±”¹±•¹Ñ ¥ì(€€€½¹ÍĞµ¥‘Á½¥¹Ğô¡Á…Ñ ¹±•¹Ñ ´Ä¤¼Èì(€€€½¹ÍĞµ…©½ÉÌõµ¥‘‘±”¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€€€½¹ÍĞ…Ìõ}µ•ÑÉ½MÑ…Ñ¥½¹%µÁ½ÉÑ…¹”¡„¤±‰Ìõ}µ•ÑÉ½MÑ…Ñ¥½¹%µÁ½ÉÑ…¹”¡ˆ¤ì(€€€€€¥˜¡…Ì„ôõ‰Ì¥É•ÑÕÉ¸‰Ìµ…Ìì(€€€€€É•ÑÕÉ¸5…Ñ ¹…‰Ì¡Á…Ñ ¹¥¹‘•á=˜¡„¤µµ¥‘Á½¥¹Ğ¤µ5…Ñ ¹…‰Ì¡Á…Ñ ¹¥¹‘•á=˜¡ˆ¤µµ¥‘Á½¥¹Ğ¤ì(€€€ô¤¹Í±¥” À°Ì¤¹Í½ÉĞ ¡„±ˆ¤ôùÁ…Ñ ¹¥¹‘•á=˜¡„¤µÁ…Ñ ¹¥¹‘•á=˜¡ˆ¤¤ì(€€€µ…©½ÉÌ¹™½É… ¡¹…µ”ôùÁÕÍ ¡¹…µ”°Ÿ²ó²jS²^´œ¤¤ì(€ô(€ÁÕÍ ¡Ñ•Éµ¥¹…°°Ÿ²Š²Â§²^´œ¤ì(€É•ÑÕÉ¸½ÕĞì)ô()™Õ¹Ñ¥½¸}µ•ÑÉ½¥É•Ñ¥½¹!Q50¡ÍÑ¸±É½Ü¥ì(€½¹ÍĞ±…¹‘µ…É­Ìõ}µ•ÑÉ½¥É•Ñ¥½¹1…¹‘µ…É­Ì¡ÍÑ¸±É½Ü¤ì(€¥˜ …±…¹‘µ…É­Ì¹±•¹Ñ ¥É•ÑÕÉ¸€œñÍÁ…¸±…ÍÌô‰Í¤µµ•ÑÉ¼µÑ•Éµ¥¹…°ˆû®.ç²^·²Š²Â¤ğ½ÍÁ…¸øœì(€É•ÑÕÉ¸€ñÍÁ…¸±…ÍÌô‰Í¤µµ•ÑÉ¼µ‘¥É•Ñ¥½¸ˆøñÍÁ…¸ø‘í±…¹‘µ…É­Ì¹µ…À¡¥Ñ•´ôù}½ÁÍÍŒ¡¥Ñ•´¹¹…µ”¤¤¹©½¥¸ œƒ
Ü€œ¥ôğ½ÍÁ…¸øñ•´û®Â§®¦Ğğ½•´øğ½ÍÁ…¸ù€ì)ô((¼¼ƒ²*çªÂW²z—®Î
ß®Â§¶Z—®Îƒ²
³²j¤ƒ²‚W®ÎÓ®–ğƒ®3®Nƒ®.¸ƒ®ÎÓ²†Àƒ¶f#®>ƒªÂg²v ƒ²*çªÂW²z”ƒ®ª§®†w²^@ƒ¶>³¶V£¶Vc®B`U'²^C²pƒ®NÇªâ'²vƒªÖ³®Ú¶Vc² ƒ²V+®*S®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½A±…Ñ™½ÉµÕ¥‘•I½İÌ¡ÍÑ¸¥ì(€¥˜¡ÑåÁ•½˜5QI=}M!ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸mtì(€½¹ÍĞÕÍ…”õ¹•Ü5…À ¤±ÍÑ…Ñ¥½¹•ÁÌõ}µ•ÑÉ½MÑ…Ñ¥½¹•ÁÌ¡ÍÑ¸¤ì(€½¹ÍĞ…‘ô¡±¥¹”±Á±…Ñ™½É´±‘¥É•Ñ¥½¹-•ä±‘•À±Ñ•Éµ¥¹…Ñ¥¹œõ™…±Í”¤ôùì(€€€¥˜ …9Õµ‰•È¹¥Í¥¹¥Ñ”¡9Õµ‰•È¡Á±…Ñ™½É´¤¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞ­•äõ€‘í9Õµ‰•È¡Á±…Ñ™½É´¥õğ‘í±¥¹•õğ‘í‘¥É•Ñ¥½¹-•åõ€ì(€€€½¹ÍĞÉ½ÜõÕÍ…”¹•Ğ¡­•ä¥ññíÁ±…Ñ™½É´é9Õµ‰•È¡Á±…Ñ™½É´¤±±¥¹”±½±½Èé}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤±‘•ÁÌémt±Ñ•Éµ¥¹…Ñ¥¹ôì(€€€¥˜¡‘•À˜˜…É½Ü¹‘•ÁÌ¹Í½µ”¡¥Ñ•´ôù¥Ñ•´¹ÍÙŒôôõ‘•À¹ÍÙŒ˜™¥Ñ•´¹¹•áĞôôõ‘•À¹¹•áĞ˜™¥Ñ•´¹‘•ÍĞôôõ‘•À¹‘•ÍĞ¤¥É½Ü¹‘•ÁÌ¹ÁÕÍ ¡‘•À¤ì(€€€É½Ü¹Ñ•Éµ¥¹…Ñ¥¹œõÉ½Ü¹Ñ•Éµ¥¹…Ñ¥¹ññÑ•Éµ¥¹…Ñ¥¹œì(€€€ÕÍ…”¹Í•Ğ¡­•ä±É½Ü¤ì(€ôì(€l¸¸¹¹•ÜM•Ğ¡ÍÑ…Ñ¥½¹•ÁÌ¹µ…À¡¥Ñ•´ôù¥Ñ•´¹±¥¹”¤¥t¹™½É… ¡±¥¹”ôùì(€€€½¹ÍĞ‘•ÁÌõÍÑ…Ñ¥½¹•ÁÌ¹™¥±Ñ•È¡¥Ñ•´ôù¥Ñ•´¹±¥¹”ôôõ±¥¹”¤ì(€€€½¹ÍĞÉ…Üô¡ÑåÁ•½˜5QI=}A1Q=I5}%IQ%=9L„ôôÕ¹‘•™¥¹•œ˜™5QI=}A1Q=I5}%IQ%=9L¹±¥¹•Ìü¹m±¥¹•t¥ññ¹Õ±°ì(€€€½¹ÍĞµ…Ñ¡•‘=ÕÉÉ•¹•Ìõ¹•ÜM•Ğ ¤ì(€€€‘•ÁÌ¹™½É… ¡‘•Àôùì(€€€€€½¹ÍĞ½ÕÉÉ•¹”õ}µ•ÑÉ½A±…Ñ™½Éµ=ÕÉÉ•¹”¡±¥¹”±ÍÑ¸±‘•À¹¹•áĞ¤í¥˜ …½ÕÉÉ•¹”¥É•ÑÕÉ¸ì(€€€€€µ…Ñ¡•‘=ÕÉÉ•¹•Ì¹…‘¡½ÕÉÉ•¹”¹¤¤ì(€€€€€l¸¸¸¡½ÕÉÉ•¹”¹Áññmt¤°¸¸¸¡½ÕÉÉ•¹”¹…ññmt¥t¹™½É… ¡Á±…Ñ™½É´ôù…‘¡±¥¹”±Á±…Ñ™½É´±É…Ü´‘í½ÕÉÉ•¹”¹¥õ€±‘•À¤¤ì(€€€ô¤ì(€€€€¼¼ƒ²Ús®Âs¶:ã²vĞƒ²^®*Pƒ²Š²Â¤½ÕÉÉ•¹—®>ƒ²*çªÂW²z”ƒ²V#®
Ó²^C²pƒ®"®v÷¶Vc² ƒ²V+®*S®.¸(€€€€¡É…Üü¹Á±…Ñ™½ÉµÌü¹mÍÑ¹uññmt¤¹™¥±Ñ•È¡½Œôø…µ…Ñ¡•‘=ÕÉÉ•¹•Ì¹¡…Ì¡½Œ¹¤¤¤¹™½É… ¡½Œôùì(€€€€€l¸¸¸¡½Œ¹Áññmt¤°¸¸¸¡½Œ¹…ññmt¥t¹™½É… ¡Á±…Ñ™½É´ôù…‘¡±¥¹”±Á±…Ñ™½É´±É…Ü´‘í½Œ¹¥õ€±¹Õ±°±ÑÉÕ”¤¤ì(€€€ô¤ì(€€€¥˜¡É…İñğ…‘•ÁÌ¹±•¹Ñ ¥É•ÑÕÉ¸ì(€€€€¼¼ƒ²nC®Îã²^@ƒ²^®*Pƒ²"c®>dƒ®ã²ƒ²v ƒªâÃ²†Ğƒ²*çªÂW²z”ƒ²"s²s²f ƒ®Â§®¦ĞƒªŞã®ç²vƒ®2²vG¶Vs®.¸(€€€½¹ÍĞ‘¥É½Õ¹ÑÌõíôí‘•ÁÌ¹™½É… ¡‘•Àôùí‘¥É½Õ¹ÑÍm‘•À¹¹•áÑtô¡‘¥É½Õ¹ÑÍm‘•À¹¹•áÑuñğÀ¤¬Äíô¤ì(€€€½¹ÍĞÉ½ÕÁÌõ}µ•ÑÉ½¥ÉÉ½ÕÁÌ¡±¥¹”±ÍÑ¸±‘¥É½Õ¹ÑÌ¤±Á±…Ñ™½ÉµÌõ}µ•ÑÉ½	½…É‘A±…Ñ™½ÉµÌ¡ÍÑ¸±±¥¹”¤ì(€€€É½ÕÁÌ¹™½É…  ¡É½ÕÀ±¥¹‘•à¤ôùì(€€€€€½¹ÍĞÁ±…Ñ™½É´õÁ±…Ñ™½ÉµÍm5…Ñ ¹µ¥¸¡¥¹‘•à±Á±…Ñ™½ÉµÌ¹±•¹Ñ ´Ä¥tí¥˜¡Á±…Ñ™½É´ôõ¹Õ±°¥É•ÑÕÉ¸ì(€€€€€‘•ÁÌ¹™¥±Ñ•È¡‘•ÀôùÉ½ÕÀ¹¥¹±Õ‘•Ì¡‘•À¹¹•áĞ¤¤¹™½É… ¡‘•Àôù…‘¡±¥¹”±Á±…Ñ™½É´±™…±±‰…¬´‘í¥¹‘•áõ€±‘•À¤¤ì(€€€ô¤ì(€ô¤ì(€É•ÑÕÉ¸l¸¸¹ÕÍ…”¹Ù…±Õ•Ì ¥t¹Í½ÉĞ ¡„±ˆ¤ôù„¹Á±…Ñ™½É´µˆ¹Á±…Ñ™½Éµññ„¹±¥¹”¹±½…±•½µÁ…É”¡ˆ¹±¥¹”°­¼œ¤¤ì)ô((¼¼ƒ²‚²Ê€ƒ¶´ƒ²‚²j¤ƒ²‚W²‚ƒ²*çªÂW²z”ƒ²V#®
Ğ¸ƒ²*çªÂW²z”ƒ®Ê¶*ó²vƒªÎƒ®–Ó®¦ĞƒªŞàƒ¶f#²v`ƒ².“²‚pƒ®ã²ƒ
ß®Â§¶Z—®0ƒ¶:ó²æs®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½A±…Ñ™½ÉµÕ¥‘•!Q50¡ÍÑ¸¥ì(€¥˜¡ÑåÁ•½˜5QI=}1%9LôôôÕ¹‘•™¥¹•ññÑåÁ•½˜5QI=}M!ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸€œœì(€½¹ÍĞÉ½İÌõ}µ•ÑÉ½A±…Ñ™½ÉµÕ¥‘•I½İÌ¡ÍÑ¸¤±Á±…Ñ™½ÉµÌõl¸¸¹¹•ÜM•Ğ¡É½İÌ¹µ…À¡É½ÜôùÉ½Ü¹Á±…Ñ™½É´¤¥tì(€¥˜ …Á±…Ñ™½ÉµÌ¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€¥˜¡}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´ôôõ¹Õ±±ñğ…Á±…Ñ™½ÉµÌ¹¥¹±Õ‘•Ì¡}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´¤¥}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´õÁ±…Ñ™½ÉµÍlÁtì(€½¹ÍĞÍ•±•Ñ•õÉ½İÌ¹™¥±Ñ•È¡É½ÜôùÉ½Ü¹Á±…Ñ™½É´ôôõ}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´¤ì(€½¹ÍĞÍÑ¹ÍŒõMÑÉ¥¹œ¡ÍÑ¸¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€É•ÑÕÉ¸€ñÍ•Ñ¥½¸±…ÍÌô‰Í¤µµ•ÑÉ¼µÁ±…Ñ™½É´µÕ¥‘”ˆøñ‘¥Ø±…ÍÌô‰Í¤µµ•ÑÉ¼µÁ±…Ñ™½É´µ¡•…‘¥¹œˆøñˆû²‚²Ê€ƒ²*çªÂW²z”ƒ²V#®
Ğğ½ˆøñÍµ…±°û²Òt€‘íÁ±…Ñ™½ÉµÌ¹±•¹Ñ¡÷ªÂpƒ²*çªÂW²z”ğ½Íµ…±°øğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰Í¤µµ•ÑÉ¼µÁ±…Ñ™½É´µÑ…‰ÌˆÉ½±”ô‰Ñ…‰±¥ÍĞˆ…É¥„µ±…‰•°ô‹²‚²Ê€ƒ²*çªÂW²z”ƒ²ƒ¶tˆø‘íÁ±…Ñ™½ÉµÌ¹µ…À¡Á±…Ñ™½É´ôù€ñ‰ÕÑÑ½¸±…ÍÌôˆ‘íÁ±…Ñ™½É´ôôõ}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´ü½¸œèœôˆ½¹±¥¬ô‰Í•±•ÑM%5•ÑÉ½A±…Ñ™½É´ œ‘íÍÑ¹Íôœ°‘íÁ±…Ñ™½Éµô¤ˆÉ½±”ô‰Ñ…ˆˆ…É¥„µ±…‰•°ôˆ‘íÁ±…Ñ™½Éµ÷®Ê ƒ²*çªÂW²z”ˆ…É¥„µÍ•±•Ñ•ôˆ‘íÁ±…Ñ™½É´ôôõ}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½Éµôˆø‘íÁ±…Ñ™½Éµôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ôğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰Í¤µµ•ÑÉ¼µÁ±…Ñ™½É´µÁ…¹•°ˆøñÍÑÉ½¹œ…É¥„µ±…‰•°ôˆ‘í}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½Éµ÷®Ê ƒ²*çªÂW²z”ˆø‘í}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½Éµôğ½ÍÑÉ½¹œøñ‘¥Ø±…ÍÌô‰Í¤µµ•ÑÉ¼µÁ±…Ñ™½É´µÍ•ÉÙ¥•Ìˆø‘íÍ•±•Ñ•¹µ…À¡É½Üôù€ñ…ÉÑ¥±”ÍÑå±”ôˆ´µµ•ÑÉ¼µ±¥¹”è‘íÉ½Ü¹½±½Éôˆøñ¤øğ½¤øñˆø‘í}½ÁÍÍŒ¡É½Ü¹±¥¹”¥ôğ½ˆø‘í}µ•ÑÉ½¥É•Ñ¥½¹!Q50¡ÍÑ¸±É½Ü¥ôğ½…ÉÑ¥±”ù€¤¹©½¥¸ œœ¥ôğ½‘¥Øøğ½‘¥Øø(€€ğ½Í•Ñ¥½¸ù€ì)ô()™Õ¹Ñ¥½¸Í•±•ÑM%5•ÑÉ½A±…Ñ™½É´¡ÍÑ¸±Á±…Ñ™½É´¥ì(€}Í¥5•ÑÉ½Õ¥‘•A±…Ñ™½É´õ9Õµ‰•È¡Á±…Ñ™½É´¤ì(€É•¹‘•ÉM%…É¡}Í¥ÕÉÉ•¹ÑññÍÑ¸¤ì)ô()™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•Í½ÉQÉ…¥¹A±…Ñ™½Éµ!Q50¡ÍÑ¸±Á±…Ñ™½É´¥ì(€¥˜¡Á±…Ñ™½É´ôõ¹Õ±°¥É•ÑÕÉ¸€œœì(€½¹ÍĞÉ½İÌõ}µ•ÑÉ½A±…Ñ™½ÉµÕ¥‘•I½İÌ¡ÍÑ¸¤¹™¥±Ñ•È¡É½ÜôùÉ½Ü¹Á±…Ñ™½É´ôôõ9Õµ‰•È¡Á±…Ñ™½É´¤¤í¥˜ …É½İÌ¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€½¹ÍĞÉ½ÕÁ•õ¹•Ü5…À ¤ì(€É½İÌ¹™½É… ¡É½Üôùì(€€€½¹ÍĞ¥Ñ•´õÉ½ÕÁ•¹•Ğ¡É½Ü¹±¥¹”¥ññí±¥¹”éÉ½Ü¹±¥¹”±½±½ÈéÉ½Ü¹½±½È±‘•ÍÑ¥¹…Ñ¥½¹Ìé¹•ÜM•Ğ ¤±Ñ•Éµ¥¹…Ñ¥¹œé™…±Í•ôì(€€€É½Ü¹‘•ÁÌ¹™½É… ¡‘•Àôùí¥˜¡‘•À¹‘•ÍĞ˜™‘•À¹‘•ÍĞ„ôõÍÑ¸¥¥Ñ•´¹‘•ÍÑ¥¹…Ñ¥½¹Ì¹…‘¡‘•À¹‘•ÍĞ¤íô¤ì(€€€¥Ñ•´¹Ñ•Éµ¥¹…Ñ¥¹œõ¥Ñ•´¹Ñ•Éµ¥¹…Ñ¥¹ññÉ½Ü¹Ñ•Éµ¥¹…Ñ¥¹œì(€€€É½ÕÁ•¹Í•Ğ¡É½Ü¹±¥¹”±¥Ñ•´¤ì(€ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰Í¤µÑÉ…¥¸µµ•ÑÉ¼µÕÍ•ÌˆøñÍÑÉ½¹œûÂ~jƒ²vĞƒ²*çªÂW²z—²vƒ²NÃ®*Pƒ²‚²Ê€ğ½ÍÑÉ½¹œøñ‘¥Øø‘íl¸¸¹É½ÕÁ•¹Ù…±Õ•Ì ¥t¹µ…À¡¥Ñ•´ôùì(€€€½¹ÍĞ‘¥É•Ñ¥½¹Ìõl¸¸¹¥Ñ•´¹‘•ÍÑ¥¹…Ñ¥½¹Ít±±…‰•°õ‘¥É•Ñ¥½¹Ì¹±•¹Ñ ı€‘í‘¥É•Ñ¥½¹Ì¹Í±¥” À°Ğ¤¹©½¥¸ œƒ
Ü€œ¥ôƒ®Â§®¦Ñ€èŸ®.ç²^·²Š²Â¤œì(€€€É•ÑÕÉ¸€ñÍÁ…¸ÍÑå±”ôˆ´µµ•ÑÉ¼µ±¥¹”è‘í¥Ñ•´¹½±½Éôˆøñ¤øğ½¤øñˆø‘í}½ÁÍÍŒ¡¥Ñ•´¹±¥¹”¥ôğ½ˆøñÍµ…±°ø ‘í}½ÁÍÍŒ¡±…‰•°¥ô¤ğ½Íµ…±°øğ½ÍÁ…¸ù€ì(€ô¤¹©½¥¸ œœ¥ôğ½‘¥Øøğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸É•¹‘•ÉM%…É¡¹…µ”¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ…Éœ¤ì(€¥˜ …•°¥É•ÑÕÉ¸ì(€¹…µ”õÉ…¥±MÑ…Ñ¥½¹…Ñ…9…µ”¡¹…µ”¤ì(€€¼¼ƒ²®>ƒ¶Ó®š·²v €Ÿ²s²jàœ£® ƒ²vÓ®š¤°ƒªÊ²'²v €Ÿ²s²jã²^´œ¡ƒ¶
¤ƒŠHƒ¶
“®†pƒ²‚WªŞs¶fP(€¥˜¡ÑåÁ•½˜MQQ%=9}„ôôÕ¹‘•™¥¹•œ€˜˜€…MQQ%=9}	m¹…µ•t€˜˜MQQ%=9}	m¹…µ”¬Ÿ²^´t¤¹…µ”õ¹…µ”¬Ÿ²^´œì(€½¹ÍĞõÑåÁ•½˜MQQ%=9}„ôôÕ¹‘•™¥¹•œıMQQ%=9}	m¹…µ•té¹Õ±°ì(€€¼¼11}QI%9LÕÍ•ÌÍÑ…Ñ¥½¸¹…µ•Ìİ¥Ñ¡½ÕĞƒ²^´ÍÕ™™¥à€¡”¹œ¸€‹²b²ğˆ¤°MQQ%=9}ÕÍ•Ì€‹²b²ó²^´ˆ(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€€¼¼ƒ¶×ªÎğƒ²^Ó²Â ƒ²‚s²fàƒŠPƒ²‚W²Â ƒ²^Ó²Â£®0€£²*çªÂW²z”ƒ²V#®
Ğƒ²jSªÆĞ¤(€½¹ÍĞÑÉ…¥¹Ìõ}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¤ì(€€¼¼ƒ².“²
³²j¤ƒ²*çªÂW²z”£ªÊ3²z¤ƒ²jÃ²€ƒŠPƒ².“²‚pƒ²‚W²Â ƒ²^Ó²Â£®N“²vĞƒ²NÃ®*Pƒ¶f ƒ®Ê#¶bã®0ƒ®ã²Úp(€±•ĞÁ±…Ñ™½ÉµÌõmtì(€ì(€€€½¹ÍĞÍ•Ğõ¹•ÜM•Ğ ¤ì(€€€ÑÉ…¥¹Ì¹™½É… ¡Ğôùí½¹ÍĞÀõ}Á±…Ñ™½Éµ½ÉQÉ…¥¸¡¹…µ”±ÑÉ…¥¹9…µ”±ÑÉ…¥¹Ì±Ğ¤í¥˜¡À„õ¹Õ±°¥Í•Ğ¹…‘¡À¤íô¤ì(€€€Á±…Ñ™½ÉµÌõl¸¸¹Í•Ñt¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€ô(€¥˜¡Á±…Ñ™½ÉµÌ¹±•¹Ñ ôôôÀ˜™ÑÉ…¥¹Ì¹±•¹Ñ øÀ˜™ü¹Á±…Ñ™½ÉµÌü¹±•¹Ñ øÀ¤Á±…Ñ™½ÉµÌõ¹Á±…Ñ™½ÉµÌì(€€¼¼I•Í•ĞÍ•±•Ñ•Á±…Ñ™½É´¥˜¥Ğİ…Ì™¥±Ñ•É•½ÕĞ(€¥˜¡}Í¥…É‘A±…Ñ™½É´„ôõ¹Õ±°˜˜…Á±…Ñ™½ÉµÌ¹¥¹±Õ‘•Ì¡}Í¥…É‘A±…Ñ™½É´¤¤}Í¥…É‘A±…Ñ™½É´õ¹Õ±°ì(€¥˜¡}Í¥…É‘A±…Ñ™½É´ôôõ¹Õ±°˜™Á±…Ñ™½ÉµÌ¹±•¹Ñ øÀ¤}Í¥…É‘A±…Ñ™½É´õÁ±…Ñ™½ÉµÍlÁtì(€½¹ÍĞ¹…µ•ÍŒõ¹…µ”¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€¼¼ƒ²vĞƒ²^·²vƒ²®
c®*Pƒ²‚²Ê€ƒ®ã²€€£²²€ƒ¶>³¶V ¤(€½¹ÍĞµ•ÑÉ½1¥¹•ÌõÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œ(€€€€ı5QI=}1%9L¹™¥±Ñ•È¡°ôø¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹Í½µ”¡ÈôùÈ¹ÍÑ…Ñ¥½¹Ì¹¥¹±Õ‘•Ì¡ÑÉ…¥¹9…µ”¤¤¤(€€€€émtì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàí½Ù•É™±½Üé¡¥‘‘•¸ˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÙÁàí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé™±•àµÍÑ…ÉĞí©ÕÍÑ¥™äµ½¹Ñ•¹ĞéÍÁ…”µ‰•Ñİ••¸ˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÈÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘íÑÉ…¥¹9…µ•ôğ½‘¥Øø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤íÑ•áĞµ…±¥¸éÉ¥¡Ğˆø‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œ(€€€€€€€€€€€€ü¡µ•ÑÉ½1¥¹•Ì¹±•¹Ñ ı€‘íµ•ÑÉ½1¥¹•Ì¹±•¹Ñ¡÷ªÂpƒ®ã²€èœœ¤(€€€€€€€€€€€€è¡ÑÉ…¥¹Ì¹±•¹Ñ ı€‘íÁ±…Ñ™½ÉµÌ¹±•¹Ñ øÀıÁ±…Ñ™½ÉµÌ¹±•¹Ñ ¬ŸªÂpƒ¶f ñ‰Èøœèœô‘íÑÉ…¥¹Ì¹±•¹Ñ¡÷¶:àƒªÊ÷²r€è¡µ•ÑÉ½1¥¹•Ì¹±•¹Ñ ı€‘íµ•ÑÉ½1¥¹•Ì¹±•¹Ñ¡÷ªÂpƒ²‚²Ê€ƒ®ã²€èœœ¤¥ôğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€‘íı€ñ‘¥Ø¥ô‰Í¤µ…‘‘Èˆ‘…Ñ„µ±…Ğôˆ‘í¹±…Ñôˆ‘…Ñ„µ±½¸ôˆ‘í¹±½¹ôˆÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µÑ½ÀèÑÁàˆûÂ~N4€‘í¹…‘‘ÉñğŸ²ó²0ƒ¶fW²vàƒ²’GŠ˜ôğ½‘¥Øù€èœô(€€€€€€€€‘ì  ¤ôùì€¼¼ƒ®ª£®Ns®Îƒ®vó®Ê èƒªâÃ²Â ƒ®ª£®Np€ôƒ²^Ó²Â ƒ®NÇªâ'®0€£¶:ã²"c
ß²V÷¶bàƒ²^²vĞ¤°ƒ²‚²Ê€ƒ®ª£®Np€ôƒ²‚²Ê€ƒ®ã²ƒ®0(€€€€€€€€€¥˜¡}…ÁÁ5½‘”ôôôµ•ÑÉ¼œ¥ì(€€€€€€€€€€€¥˜ …µ•ÑÉ½1¥¹•Ì¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€€€€€€€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàí™±•àµİÉ…ÀéİÉ…Àíµ…É¥¸µÑ½ÀèÄÁÁàˆø(€€€€€€€€€€€€€€‘íµ•ÑÉ½1¥¹•Ì¹µ…À¡°ôù€ñÍÁ…¸½¹±¥¬ô‰½Á•¹5•ÑÉ½1¥¹” œ‘í°¹¥‘ôœ¤ˆÍÑå±”ô‰ÕÉÍ½ÈéÁ½¥¹Ñ•ÈíÁ…‘‘¥¹œèÍÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàí™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí‰…­É½Õ¹è‘í°¹½±½ÉôÅŒí‰½É‘•ÈèÅÁàÍ½±¥€‘í°¹½±½Éôí½±½Èè‘í°¹½±½ÉôˆûÂ~j€‘í°¹¹…µ•ôğ½ÍÁ…¸ù€¤¹©½¥¸ œœ¥ô(€€€€€€€€€€€€ğ½‘¥Øù€ì(€€€€€€€€€ô(€€€€€€€€€½¹ÍĞÉ…‘•Ìõl¸¸¹¹•ÜM•Ğ¡ÑÉ…¥¹Ì¹µ…À¡ĞôùĞ¹É…‘”¤¥tì(€€€€€€€€€¥˜ …É…‘•Ì¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€€€€€€€€€½¹ÍĞ=Iõl-Q`œ°MIPœ°-Q`·²
Ã²Êpœ°-Q`·²vÓ²v0œ°%Q`·²Ê·²Ú`œ°%Q`·²#®#²vœ°%Q`·®#²v0œ°Ÿ®²ÓªÚ¶fS¶bàtì(€€€€€€€€€É…‘•Ì¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€€€€€€€€€½¹ÍĞ¥„õ=I¹¥¹‘•á=˜¡„¤°¥ˆõ=I¹¥¹‘•á=˜¡ˆ¤ì(€€€€€€€€€€€É•ÑÕÉ¸€¡¥„ğÀüääé¥„¤´¡¥ˆğÀüääé¥ˆ¤ì(€€€€€€€€€ô¤ì(€€€€€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàí™±•àµİÉ…ÀéİÉ…Àíµ…É¥¸µÑ½ÀèÄÁÁàˆø(€€€€€€€€€€€€‘íÉ…‘•Ì¹µ…À¡œôùì(€€€€€€€€€€€€€½¹ÍĞŒõ}MM}YImŒ¡œ¥uñğµ œì(€€€€€€€€€€€€€É•ÑÕÉ¸€ñÍÁ…¸ÍÑå±”ô‰Á…‘‘¥¹œèÍÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàí™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèØÀÀí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µŒ´‘íô¤í½±½ÈéÙ…È ´µŒ´‘íô¤ˆø‘íôğ½ÍÁ…¸ù€ì(€€€€€€€€€€€ô¤¹©½¥¸ œœ¥ô(€€€€€€€€€€ğ½‘¥Øù€ì(€€€€€€€ô¤ ¥ô(€€€€€€ğ½‘¥Øø(€€€€€€‘í}…ÁÁ5½‘”„ôôµ•ÑÉ¼œ˜™ÑÉ…¥¹Ì¹±•¹Ñ ı€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁà€ÑÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ‰Ñ¸ˆ½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹	½…É œ‘í¹…µ•Íôœ¤ˆûÂ~j$ƒ²Ús®Âpƒ²V#®
Ğƒ²‚ªÒG¶2@ƒ²^ÓªâÀğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œı€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁà€ÑÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ‰Ñ¸ˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä œ‘íÑÉ…¥¹9…µ”¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆûÂ~jƒ²Ús®Âpƒ²V#®
Ğƒ²‚ªÒG¶2@ƒ²^ÓªâÀğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œü  ¤ôùì€¼¼ƒÂ~jƒ²‚²Ê€èƒ®ã²€¡É½ÕÑ”§®Îƒ²‚²^´¿®.“²v3²^´ƒŠPƒªÊ÷²r€ƒ®ã²ƒ
ß²²€ƒ®ÚªâÀƒ®ª£®F@ƒ¶Fs².p(€€€€€€€¥˜¡ÑåÁ•½˜5QI=}1%9LôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸€œœì(€€€€€€€½¹ÍĞÉ½İÌõmtì(€€€€€€€5QI=}1%9L¹™½É… ¡°ôùì(€€€€€€€€€€¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹™½É… ¡Èôùì(€€€€€€€€€€€½¹ÍĞ¤õÈ¹ÍÑ…Ñ¥½¹Ì¹¥¹‘•á=˜¡ÑÉ…¥¹9…µ”¤ì(€€€€€€€€€€€¥˜¡¤ğÀ¥É•ÑÕÉ¸ì(€€€€€€€€€€€½¹ÍĞÁÉ•Øõ¤øÀıÈ¹ÍÑ…Ñ¥½¹Ím¤´Åté¹Õ±°°¹•áĞõ¤ñÈ¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ´ÄıÈ¹ÍÑ…Ñ¥½¹Ím¤¬Åté¹Õ±°ì(€€€€€€€€€€€¥˜ …ÁÉ•Ø˜˜…¹•áĞ¥É•ÑÕÉ¸ì(€€€€€€€€€€€É½İÌ¹ÁÕÍ ¡í°±‘…Í è„…È¹‘…Í ±ÁÉ•Ø±¹•áÑô¤ì(€€€€€€€€€ô¤ì(€€€€€€€ô¤ì(€€€€€€€½¹ÍĞÍ••¸õ¹•ÜM•Ğ ¤°Õ¹¥Äõmtì(€€€€€€€É½İÌ¹™½É… ¡àôùí½¹ÍĞ¬õà¹°¹¥¬ğœ¬¡à¹ÁÉ•Ùñğœœ¤¬ğœ¬¡à¹¹•áÑñğœœ¤í¥˜ …Í••¸¹¡…Ì¡¬¤¥íÍ••¸¹…‘¡¬¤íÕ¹¥Ä¹ÁÕÍ ¡à¤íõô¤ì(€€€€€€€¥˜ …Õ¹¥Ä¹±•¹Ñ ¥É•ÑÕÉ¸€œœì(€€€€€€€½¹ÍĞ‰Ñ¸ô¡ÍÑ¸±…ÉÉ½Ü¤ôùÍÑ¸(€€€€€€€€€€ı€ñ‰ÕÑÑ½¸½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘íÍÑ¸¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆÍÑå±”ô‰™±•àèÄíµ¥¸µİ¥‘Ñ èÀíÁ…‘‘¥¹œèİÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèåÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤íİ¡¥Ñ”µÍÁ…”é¹½İÉ…Àí½Ù•É™±½Üé¡¥‘‘•¸íÑ•áĞµ½Ù•É™±½Üé•±±¥ÁÍ¥ÌíÑ•áĞµ…±¥¸è‘í…ÉÉ½ÜôôôÁÉ•Øœü±•™ĞœèÉ¥¡Ğôˆø‘í…ÉÉ½ÜôôôÁÉ•ØœüŸŠ@€œ­ÍÑ¸éÍÑ¸¬œƒŠHôğ½‰ÕÑÑ½¸ù€(€€€€€€€€€€é€ñÍÁ…¸ÍÑå±”ô‰™±•àèÄíµ¥¸µİ¥‘Ñ èÀíÁ…‘‘¥¹œèİÁà€ÄÁÁàí™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íÑ•áĞµ…±¥¸è‘í…ÉÉ½ÜôôôÁÉ•Øœü±•™ĞœèÉ¥¡Ğôˆø‘í…ÉÉ½ÜôôôÁÉ•ØœüŸªâÃ²‚@œèŸ²Š²‚@ôğ½ÍÁ…¸ù€ì(€€€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁàí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µÑ•áĞÈ¤íµ…É¥¸µ‰½ÑÑ½´èáÁàˆûÂ~jƒ²‚²^´ƒ
Üƒ®.“²v3²^´ğ½‘¥Øø(€€€€€€€€€€‘íÕ¹¥Ä¹µ…À¡àôù€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàíµ…É¥¸µ‰½ÑÑ½´èÙÁàˆø(€€€€€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™±•àµÍ¡É¥¹¬èÀí‘¥ÍÁ±…äé¥¹±¥¹”µ™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÕÁàíİ¥‘Ñ èàÙÁàí™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½Èè‘íà¹°¹½±½Éôí½Ù•É™±½Üé¡¥‘‘•¸ˆøñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èáÁàí¡•¥¡ĞèáÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÔÀ”í‰…­É½Õ¹è‘íà¹°¹½±½Éôí™±•àµÍ¡É¥¹¬èÀˆøğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰İ¡¥Ñ”µÍÁ…”é¹½İÉ…Àí½Ù•É™±½Üé¡¥‘‘•¸íÑ•áĞµ½Ù•É™±½Üé•±±¥ÁÍ¥Ìˆø‘íà¹°¹¹…µ•ô‘íà¹‘…Í üœƒ
ß²²€œèœôğ½ÍÁ…¸øğ½ÍÁ…¸ø(€€€€€€€€€€€€‘í‰Ñ¸¡à¹ÁÉ•Ø°ÁÉ•Øœ¥ô‘í‰Ñ¸¡à¹¹•áĞ°¹•áĞœ¥ô(€€€€€€€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¥ô(€€€€€€€€ğ½‘¥Øù€ì(€€€€€ô¤ ¤èœô(€€€€€€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œı}µ•ÑÉ½A±…Ñ™½ÉµÕ¥‘•!Q50¡ÑÉ…¥¹9…µ”¤èœô(€€€€€€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œı}µ•ÑÉ½MÑ…Ñ¥½¹	½…É‘!Q50¡ÑÉ…¥¹9…µ”¤èœô(€€€€€€‘í}…ÁÁ5½‘”ôôôµ•ÑÉ¼œ˜™}¥ÍQÉ…¥¹MÑ¸¡ÑÉ…¥¹9…µ”¤ı€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁà€ÑÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ‰Ñ¸ˆ½¹±¥¬ô‰Íİ¥Ñ¡5½‘•MÑ…Ñ¥½¸ ÑÉ…¥¸œ°œ‘í¹…µ•Íôœ¤ˆûÂ~jƒªâÃ²Â €‘íÑÉ…¥¹9…µ•÷²^·²ró®†pƒ²‚¶f`ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€‘í}…ÁÁ5½‘”„ôôµ•ÑÉ¼œ˜™Á±…Ñ™½ÉµÌ¹±•¹Ñ øÀı€(€€€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÉÁà€ÄÙÁàí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µÑ•áĞÈ¤íµ…É¥¸µ‰½ÑÑ½´èáÁàˆûÂ~j$ƒ¶f ƒ²ƒ¶tğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰½Ù•É™±½Üµàé…ÕÑ¼ìµİ•‰­¥Ğµ½Ù•É™±½ÜµÍÉ½±±¥¹œéÑ½Õ íÁ…‘‘¥¹œµ‰½ÑÑ½´èÉÁàˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàíµ¥¸µİ¥‘Ñ éµ…àµ½¹Ñ•¹Ğˆø(€€€€€€€€€€€€‘íÁ±…Ñ™½ÉµÌ¹µ…À¡Àôù€(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸¥ô‰Í¤µÁÑ…ˆ´‘íÁôˆ½¹±¥¬ô‰Í•±•ÑM%…É‘A±…Ñ™½É´ œ‘í¹…µ•Íôœ°‘íÁô¤ˆ(€€€€€€€€€€€€€€€ÍÑå±”ô‰Á…‘‘¥¹œèÙÁà€ÄÙÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÈÁÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèØÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èíİ¡¥Ñ”µÍÁ…”é¹½İÉ…Àí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤íÑÉ…¹Í¥Ñ¥½¸é‰…­É½Õ¹€¸ÄÕÌ±½±½È€¸ÄÕÌì(€€€€€€€€€€€€€€€‰…­É½Õ¹è‘í}Í¥…É‘A±…Ñ™½É´ôôõÀüÙ…È ´µ…•¹Ğ¤œèÙ…È ´µ‰œÌ¤ôí½±½Èè‘í}Í¥…É‘A±…Ñ™½É´ôôõÀüœ™™˜œèÙ…È ´µÑ•áĞÄ¤ôˆø(€€€€€€€€€€€€€€€€‘íÁô(€€€€€€€€€€€€€€ğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€‘í}…ÁÁ5½‘”„ôôµ•ÑÉ¼œ˜™ÑÉ…¥¹Ì¹±•¹Ñ ı€ñ‘¥Ø¥ô‰Í¤µÁ±…Ñ™½É´µÑÉ…¥¹ÌˆÍÑå±”ô‰Á…‘‘¥¹œèÄÑÁà€ÄÙÁàˆø(€€€€€€€€‘í}Í¥A±…Ñ™½ÉµQÉ…¥¹Í!Q50¡¹…µ”°ÑÉ…¥¹Ì¥ô(€€€€€€ğ½‘¥Øù€èœô(€€€€€€‘í}…ÁÁ5½‘”„ôôµ•ÑÉ¼œ˜™µ•ÑÉ½1¥¹•Ì¹±•¹Ñ ı€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÀ€ÄÙÁà€ÄÉÁàˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ‰Ñ¸ˆ½¹±¥¬ô‰Íİ¥Ñ¡5½‘•MÑ…Ñ¥½¸ µ•ÑÉ¼œ°œ‘í¹…µ•Íôœ¤ˆûÂ~jƒ²‚²Ê€€‘íÑÉ…¥¹9…µ•÷²^·²ró®†pƒ²‚¶f`ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€ñ‘¥Ø±…ÍÌô‰Í¤µ¹•Ñİ½É¬µµ…Àµ…Ñ¥½¸ˆø(€€€€€€€€‘í˜™¹±…Ğ˜™¹±½¸ı€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ…É¥„µ•áÁ…¹‘•ô‰™…±Í”ˆ…É¥„µ½¹ÑÉ½±Ìô‰Í¤µ¹•…É‰äµµ…ÀµÍ•Ñ¥½¸ˆ½¹±¥¬ô‰Ñ½±•MÑ…Ñ¥½¹9•…É‰å5…À¡Ñ¡¥Ì¤ˆøñÍÙœ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñÕÍ”¡É•˜ôˆ¤µµ…Àˆ¼øğ½ÍÙœøñÍÁ…¸øñÍÑÉ½¹œû²^´ƒ²ó®Î ƒ²®>ƒ®ÎÓªâÀğ½ÍÑÉ½¹œøñÍµ…±°ø‘íÑÉ…¥¹9…µ•÷²^´ƒ²ó®Î²v`ƒ².“²‚pƒ²®>®–ğƒ¶fW²vã¶V§®.#®.ğ½Íµ…±°øğ½ÍÁ…¸øñ¤±…ÍÌô‰Í¤µµ…Àµ¡•ÙÉ½¸ˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆûŠ2ğ½¤øğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‘¥Ø¥ô‰Í¤µ¹•…É‰äµµ…ÀµÍ•Ñ¥½¸ˆ±…ÍÌô‰Í¤µ¹•…É‰äµµ…ÀµÍ•Ñ¥½¸ˆ¡¥‘‘•¸ø(€€€€€€€€€€ñ¥™É…µ”ÍÉŒô‰¡ÑÑÁÌè¼½İİÜ¹½Á•¹ÍÑÉ••Ñµ…À¹½Éœ½•áÁ½ÉĞ½•µ‰•¹¡Ñµ°ı‰‰½àô‘ì¡¹±½¸´À¸ÀÄ¤¹Ñ½¥á• Ô¥ô°‘ì¡¹±…Ğ´À¸ÀÀà¤¹Ñ½¥á• Ô¥ô°‘ì¡¹±½¸¬À¸ÀÄ¤¹Ñ½¥á• Ô¥ô°‘ì¡¹±…Ğ¬À¸ÀÀà¤¹Ñ½¥á• Ô¥ô™…µÀí±…å•Èõµ…Á¹¥¬™…µÀíµ…É­•Èô‘í¹±…Ğ¹Ñ½¥á• Ô¥ô°‘í¹±½¸¹Ñ½¥á• Ô¥ôˆ±½…‘¥¹œô‰±…éäˆÑ¥Ñ±”ôˆ‘í¹…µ•Íôƒ²ó®Î ƒ²®>ˆøğ½¥™É…µ”ø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰Í¤µ¹•…É‰äµµ…Àµ±¥¹­Ìˆø(€€€€€€€€€€€€ñ„¡É•˜ô‰¡ÑÑÁÌè¼½µ…À¹­…­…¼¹½´½±¥¹¬½µ…À¼‘í•¹½‘•UI%½µÁ½¹•¹Ğ¡¹…µ”¥ô°‘í¹±…Ñô°‘í¹±½¹ôˆÑ…É•Ğô‰}‰±…¹¬ˆÉ•°ô‰¹½½Á•¹•È¹½É•™•ÉÉ•Èˆû²æÓ²æÓ²b“²®>²^C²pƒ²^ÓªâÀğ½„ø(€€€€€€€€€€€€ñ„¡É•˜ô‰¡ÑÑÁÌè¼½µ…À¹¹…Ù•È¹½´¼ı±¹œô‘í¹±½¹ô™…µÀí±…Ğô‘í¹±…Ñô™…µÀíé½½´ôÄÔˆÑ…É•Ğô‰}‰±…¹¬ˆÉ•°ô‰¹½½Á•¹•È¹½É•™•ÉÉ•Èˆû®“²vÓ®Ê²®>²^C²pƒ²^ÓªâÀğ½„ø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½‘¥Øù€èœô(€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹I•…¡…‰¥±¥Ñå5…À œ‘íÑÉ…¥¹9…µ”¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆøñÍÙœ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñÕÍ”¡É•˜ôˆ¤µµ…Àˆ¼øğ½ÍÙœøñÍÁ…¸øñÍÑÉ½¹œû²®>²^C²pƒ²¶×²^´ƒ®ÎÓªâÀğ½ÍÑÉ½¹œøñÍµ…±°ø‘íÑÉ…¥¹9…µ•÷²^·²^C²pƒ¶fc²*äƒ²^²vĞƒªÂ ƒ²"`ƒ²z#®*Pƒ²^·²vƒ¶Fs².s¶V§®.#®.ğ½Íµ…±°øğ½ÍÁ…¸øñ¤…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆûŠèğ½¤øğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€¥˜¡¤Í¥1½…‘‘‘É•ÍÌ¡¹…µ”°¹±…Ğ°¹±½¸¤ì)ô()™Õ¹Ñ¥½¸Ñ½±•MÑ…Ñ¥½¹9•…É‰å5…À¡‰ÕÑÑ½¸¥ì(€½¹ÍĞÍ•Ñ¥½¸õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ¹•…É‰äµµ…ÀµÍ•Ñ¥½¸œ¤ì(€¥˜ …Í•Ñ¥½¸¥É•ÑÕÉ¸ì(€½¹ÍĞİ¥±±=Á•¸õÍ•Ñ¥½¸¹¡¥‘‘•¸ì(€Í•Ñ¥½¸¹¡¥‘‘•¸ô…İ¥±±=Á•¸ì(€¥˜¡‰ÕÑÑ½¸¥ì(€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ•áÁ…¹‘•œ±MÑÉ¥¹œ¡İ¥±±=Á•¸¤¤ì(€€€‰ÕÑÑ½¸¹±…ÍÍ1¥ÍĞ¹Ñ½±” ¥Ìµ½Á•¸œ±İ¥±±=Á•¸¤ì(€ô)ô((¼¼ƒ²Š3¶FpƒŠHƒ²ó²0€£²
³²j§²z@ƒ®â3®vó²jÃ²‚²^C²pƒ²^·²²b“²öS®R¤°±½…±MÑ½É…”ƒ²êC².p°ƒ².“¶2 ƒ².pƒ²Š3¶Fpƒ¶Fs².p¤)…Íå¹Œ™Õ¹Ñ¥½¸Í¥1½…‘‘‘É•ÍÌ¡¹…µ”°±…Ğ°±½¸¥ì(€½¹ÍĞ‰½àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ…‘‘Èœ¤ì(€¥˜ …‰½à¤É•ÑÕÉ¸ì(€±•Ğ…¡”õíôìÑÉåì…¡”õ)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ ¹¥µ‰¥}…‘‘Èœ¥ñğíôœ¤ìõ…Ñ ¡”¥íô(€½¹ÍĞ…¡•-•äõ€‘í¹…µ•õğ‘ì ­±…Ğ¤¹Ñ½¥á• Ø¥ô°‘ì ­±½¸¤¹Ñ½¥á• Ø¥õ€ì(€¥˜¡…¡•m…¡•-•åt¥ì‰½à¹¥¹¹•É!Q50ôŸÂ~N4€œ­…¡•m…¡•-•åtìÉ•ÑÕÉ¸ìô(€½¹ÍĞ½½É‘MÑÈõ€‘ì ­±½¸¤¹Ñ½¥á• Ğ¥÷
Á°€‘ì ­±…Ğ¤¹Ñ½¥á• Ğ¥÷
Á9€ì(€ÑÉåì(€€€½¹ÍĞÈõ…İ…¥Ğ™•Ñ ¡¡ÑÑÁÌè¼½¹½µ¥¹…Ñ¥´¹½Á•¹ÍÑÉ••Ñµ…À¹½Éœ½É•Ù•ÉÍ”ı™½Éµ…Ğõ©Í½¸™±…Ğô‘í±…Ñô™±½¸ô‘í±½¹ô™…•ÁĞµ±…¹Õ…”õ­¼™é½½´ôÄØ™…‘‘É•ÍÍ‘•Ñ…¥±ÌôÅ€±í¡•…‘•ÉÌéí•ÁĞè…ÁÁ±¥…Ñ¥½¸½©Í½¸õô¤ì(€€€½¹ÍĞ¨õ…İ…¥ĞÈ¹©Í½¸ ¤ì½¹ÍĞ„õ¨¹…‘‘É•ÍÍññíôì(€€€½¹ÍĞÁ…ÉÑÌõm„¹ÍÑ…Ñ•ññ„¹ÁÉ½Ù¥¹”°„¹¥Ñåññ„¹½Õ¹Ñåññ„¹Ñ½İ¹ññ„¹Ù¥±±…”°„¹‰½É½Õ¡ññ„¹¥Ñå}‘¥ÍÑÉ¥Ğ°„¹ÍÕ‰ÕÉ‰ññ„¹¹•¥¡‰½ÕÉ¡½½‘ññ„¹ÅÕ…ÉÑ•È°„¹É½…‘t¹™¥±Ñ•È¡	½½±•…¸¤ì(€€€½¹ÍĞÍ••¸õ¹•ÜM•Ğ ¤ì½¹ÍĞ…‘‘ÈõÁ…ÉÑÌ¹™¥±Ñ•È¡Àôø…Í••¸¹¡…Ì¡À¤˜™Í••¸¹…‘¡À¤¤¹Í±¥” À°Ğ¤¹©½¥¸ œ€œ¤ì(€€€¥˜¡…‘‘È¥ì…¡•m…¡•-•åtõ…‘‘ÈìÑÉåì±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ¹¥µ‰¥}…‘‘Èœ±)M=8¹ÍÑÉ¥¹¥™ä¡…¡”¤¤ìõ…Ñ ¡”¥íôô(€€€½¹ÍĞÕÈõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ…‘‘Èœ¤ì(€€€¥˜¡ÕÈ€˜˜MÑÉ¥¹œ¡ÕÈ¹‘…Ñ…Í•Ğ¹±…Ğ¤ôôõMÑÉ¥¹œ¡±…Ğ¤¤ÕÈ¹¥¹¹•É!Q50ôŸÂ~N4€œ¬¡…‘‘Éññ½½É‘MÑÈ¤ì(€õ…Ñ ¡”¥ì(€€€½¹ÍĞÕÈõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ…‘‘Èœ¤ì(€€€¥˜¡ÕÈ€˜˜MÑÉ¥¹œ¡ÕÈ¹‘…Ñ…Í•Ğ¹±…Ğ¤ôôõMÑÉ¥¹œ¡±…Ğ¤¤ÕÈ¹¥¹¹•É!Q50ôŸÂ~N4€œ­½½É‘MÑÈì(€ô)ô()™Õ¹Ñ¥½¸Í•±•ÑM%…É‘A±…Ñ™½É´¡¹…µ”°À¥ì(€}Í¥…É‘A±…Ñ™½É´õÀì(€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° m¥‘xô‰Í¤µÁÑ…ˆ´‰tœ¤¹™½É… ¡ˆôùì(€€€½¹ÍĞ‰ÀõÁ…ÉÍ•%¹Ğ¡ˆ¹¥¹É•Á±…” Í¤µÁÑ…ˆ´œ°œœ¤¤ì(€€€ˆ¹ÍÑå±”¹‰…­É½Õ¹õ‰ÀôôõÀüÙ…È ´µ…•¹Ğ¤œèÙ…È ´µ‰œÌ¤œì(€€€ˆ¹ÍÑå±”¹½±½Èõ‰ÀôôõÀüœ™™˜œèÙ…È ´µÑ•áĞÄ¤œì(€ô¤ì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞÑÉ…¥¹Ìõ}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÁ±…Ñ™½É´µÑÉ…¥¹Ìœ¤ì(€¥˜¡•°¤•°¹¥¹¹•É!Q50õ}Í¥A±…Ñ™½ÉµQÉ…¥¹Í!Q50¡¹…µ”°ÑÉ…¥¹Ì¤ì)ô()™Õ¹Ñ¥½¸Ñ½±•M%Q•É´¡¹…µ”¥ì(€}Í¥!¥‘•Q•É´ô…}Í¥!¥‘•Q•É´ì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞÑÉ…¥¹Ìõ}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÁ±…Ñ™½É´µÑÉ…¥¹Ìœ¤ì(€¥˜¡•°¤•°¹¥¹¹•É!Q50õ}Í¥A±…Ñ™½ÉµQÉ…¥¹Í!Q50¡¹…µ”°ÑÉ…¥¹Ì¤ì)ô()™Õ¹Ñ¥½¸Ñ½±•M%UÁ½µ¥¹œ¡¹…µ”¥ì(€}Í¥UÁ½µ¥¹=¹±äô…}Í¥UÁ½µ¥¹=¹±äì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞÑÉ…¥¹Ìõ}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÁ±…Ñ™½É´µÑÉ…¥¹Ìœ¤ì(€¥˜¡•°¤•°¹¥¹¹•É!Q50õ}Í¥A±…Ñ™½ÉµQÉ…¥¹Í!Q50¡¹…µ”°ÑÉ…¥¹Ì¤ì)ô()™Õ¹Ñ¥½¸Í•…É¡MÑ…Ñ¥½¸¡¹…µ”¥ì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ¥¹ÁÕĞµÍÑ…Ñ¥½¸œ¤¹Ù…±Õ”õÑÉ…¥¹9…µ”ì(€¥˜¡ÑåÁ•½˜¹¥µ‰¥=Á•¹MÑ…Ñ¥½¹Q¥µ•Ñ…‰±”ôôô™Õ¹Ñ¥½¸œ¥¹¥µ‰¥=Á•¹MÑ…Ñ¥½¹Q¥µ•Ñ…‰±” ¤í•±Í”Íİ¥Ñ¡Q…ˆ ÍÑ…Ñ¥½¸œ¤ì(€Í•…É¡	åMÑ…Ñ¥½¸ ¤ì)ô()™Õ¹Ñ¥½¸}ÑÉ…¥¹5…Ñ¡•ÍA±…Ñ™½ÉµI½ÕÑ”¡ÑÉ…¥¸°ÍÑ…Ñ¥½¹9…µ”°Á%¹™¼¥ì(€¥˜ …Á%¹™¼¹±ññÁ%¹™¼¹°¹±•¹Ñ ôôôÀ¥É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍĞÍÑ¹	…Í”õÍÑ…Ñ¥½¹9…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ıÍÑ…Ñ¥½¹9…µ”¹Í±¥” À°´Ä¤éÍÑ…Ñ¥½¹9…µ”ì(€½¹ÍĞÉ…‘•]½É‘Ìõl%Q`·²#®#²vœ°%Qc²#®#²vœ°%Q`·²Ê·²Ú`œ°%Qc²Ê·²Ú`œ°%Q`·®#²v0œ°%Qc®#²v0œ°Ÿ®²ÓªÚ¶fS¶bàœ°Ÿ®²ÓªÚ¶fPœ°-Q`œ°MIPtì(€½¹ÍĞÍ•ÉÙ¥•¥Ñ¥•Ìõ¹•ÜM•Ğ ¤ì(€½¹ÍĞÕ¹¥ÅÕ•1¥¹•Ìõl¸¸¹¹•ÜM•Ğ¡Á%¹™¼¹°¹µ…À¡°ôù°¹É•Á±…” ½p½qL¬¼°œœ¤¹ÑÉ¥´ ¤¤¥tì(€™½È¡½¹ÍĞÍÙŒ½˜Õ¹¥ÅÕ•1¥¹•Ì¥ì(€€€±•ĞÌõÍÙŒ¹É•Á±…” ½p¡mx¥t©p¤½œ°œœ¤¹ÑÉ¥´ ¤ì(€€€™½È¡½¹ÍĞœ½˜É…‘•]½É‘Ì¤ÌõÌ¹É•Á±…”¡¹•ÜI•áÀ¡œ°œœ¤°œœ¤¹ÑÉ¥´ ¤ì(€€€ÌõÌ¹É•Á±…” ½oªÂ ·¶zt¯²qÌ¨½œ°œœ¤¹ÑÉ¥´ ¤ì(€€€Ì¹ÍÁ±¥Ğ œ´œ¤¹µ…À¡ŒôùŒ¹ÑÉ¥´ ¤¤¹™¥±Ñ•È¡ŒôùŒ˜™Œ„ôõÍÑ¹	…Í”˜™Œ„ôõÍÑ…Ñ¥½¹9…µ”¤(€€€€€€¹™½É… ¡ŒôùÍ•ÉÙ¥•¥Ñ¥•Ì¹…‘¡Œ¤¤ì(€ô(€¥˜¡Í•ÉÙ¥•¥Ñ¥•Ì¹Í¥é”ôôôÀ¥É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍĞ‘•ÍĞõÑÉ…¥¸¹‘•ÍĞ¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ıÑÉ…¥¸¹‘•ÍĞ¹Í±¥” À°´Ä¤éÑÉ…¥¸¹‘•ÍĞì(€¥˜¡Í•ÉÙ¥•¥Ñ¥•Ì¹¡…Ì¡ÑÉ…¥¸¹‘•ÍĞ¥ññÍ•ÉÙ¥•¥Ñ¥•Ì¹¡…Ì¡‘•ÍĞ¤¥É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍĞ½É¥¥¸õÑÉ…¥¸¹ÍÑ½ÁÌü¹lÁtü¹Ìì(€¥˜¡½É¥¥¸¥ì(€€€½¹ÍĞ½É¥¥¹	…Í”õ½É¥¥¸¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı½É¥¥¸¹Í±¥” À°´Ä¤é½É¥¥¸ì(€€€¥˜¡Í•ÉÙ¥•¥Ñ¥•Ì¹¡…Ì¡½É¥¥¸¥ññÍ•ÉÙ¥•¥Ñ¥•Ì¹¡…Ì¡½É¥¥¹	…Í”¤¥É•ÑÕÉ¸ÑÉÕ”ì(€ô(€É•ÑÕÉ¸™…±Í”ì)ô((¼¼I•ÑÕÉ¹Ì‘¥É•Ñ¥½¸€ ‘½İ¸ğÕÀñ¹Õ±°¤™½È„Á±…Ñ™½É´‰…Í•½¸¥‘•¹Ñ¥…°µÍ•ÉÙ¥”Ñİ¥¹Ì)™Õ¹Ñ¥½¸}•Ñ¥É•Ñ¥½¹½ÉA±…Ñ™½É´¡ÍÑ…Ñ¥½¹9…µ”°Á±…Ñ™½Éµ9Õ´¥ì(€¥˜¡ÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•ñğ…A1Q=I5}	mÍÑ…Ñ¥½¹9…µ•t¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ‘ˆõA1Q=I5}	mÍÑ…Ñ¥½¹9…µ•tì(€½¹ÍĞµå%¹™¼õ‘‰mMÑÉ¥¹œ¡Á±…Ñ™½Éµ9Õ´¥tì(€¥˜ …µå%¹™½ñğ…µå%¹™¼¹±ññµå%¹™¼¹°¹±•¹Ñ ôôôÀ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ¹½É´õ°ôù°¹É•Á±…” ½p½qL¬¼°œœ¤¹ÑÉ¥´ ¤ì(€½¹ÍĞµå-•äõl¸¸¹¹•ÜM•Ğ¡µå%¹™¼¹°¹µ…À¡¹½É´¤¥t¹Í½ÉĞ ¤¹©½¥¸ ğœ¤ì(€€¼¼¥¹Á±…Ñ™½ÉµÌİ¥Ñ ¥‘•¹Ñ¥…°€¡¹½Éµ…±¥é•¤Í•ÉÙ¥”±¥ÍÑÌƒŠH‘¥É•Ñ¥½¸Ñİ¥¹Ì(€½¹ÍĞÑİ¥¹Ìõ=‰©•Ğ¹­•åÌ¡‘ˆ¤¹µ…À¡9Õµ‰•È¤¹™¥±Ñ•È¡Àôùì(€€€¥˜¡ÀôôõÁ±…Ñ™½Éµ9Õ´¥É•ÑÕÉ¸™…±Í”ì(€€€½¹ÍĞ¥¹™¼õ‘‰mMÑÉ¥¹œ¡À¥tì(€€€¥˜ …¥¹™½ñğ…¥¹™¼¹±ññ¥¹™¼¹°¹±•¹Ñ ôôôÀ¥É•ÑÕÉ¸™…±Í”ì(€€€É•ÑÕÉ¸l¸¸¹¹•ÜM•Ğ¡¥¹™¼¹°¹µ…À¡¹½É´¤¥t¹Í½ÉĞ ¤¹©½¥¸ ğœ¤ôôõµå-•äì(€ô¤ì(€¥˜¡Ñİ¥¹Ì¹±•¹Ñ ôôôÀ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÉ½ÕÀõmÁ±…Ñ™½Éµ9Õ´°¸¸¹Ñİ¥¹Ít¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€½¹ÍĞ¥‘àõÉ½ÕÀ¹¥¹‘•á=˜¡Á±…Ñ™½Éµ9Õ´¤ì(€€¼¼1½İ•È¡…±˜ƒŠHƒ¶Vc¶Z$¡‘½İ¸¤°ÕÁÁ•È¡…±˜ƒŠHƒ²¶Z$¡ÕÀ¤(€É•ÑÕÉ¸¥‘àñ5…Ñ ¹•¥°¡É½ÕÀ¹±•¹Ñ ¼È¤ü‘½İ¸œèÕÀœì)ô((¼¼Õ±°Á±…Ñ™½É´ÑÉ…¥¸™¥±Ñ•ÈèÉ…‘”€¬É½ÕÑ”€¬‘¥É•Ñ¥½¸€¡Ñ•Éµ¥¹ÕÌÑÉ…¥¹Ì•á•µÁĞ™É½´‘¥É•Ñ¥½¸¤)™Õ¹Ñ¥½¸}•Ñ¥±Ñ•É•‘QÉ…¥¹Í½ÉA±…Ñ™½É´¡¹…µ”°…±±QÉ…¥¹Ì°Á±…Ñ™½Éµ9Õ´¥ì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞÁ%¹™¼õ}•ÑA±…Ñ™½Éµ%¹™¼¡¹…µ”±Á±…Ñ™½Éµ9Õ´¤ì(€¥˜ …Á%¹™¼¥É•ÑÕÉ¸…±±QÉ…¥¹Ìì(€±•Ğ™¥±Ñ•É•õ…±±QÉ…¥¹Ì¹™¥±Ñ•È¡Ğôø(€€€}É…‘•5…Ñ¡•ÍA±…Ñ™½É´¡Ğ¹É…‘”±Á%¹™¼¹œ¤˜˜(€€€}ÑÉ…¥¹5…Ñ¡•ÍA±…Ñ™½ÉµI½ÕÑ”¡Ğ±¹…µ”±Á%¹™¼¤(€€¤ì(€½¹ÍĞ‘¥É¥±Ñ•Èõ}•Ñ¥É•Ñ¥½¹½ÉA±…Ñ™½É´¡¹…µ”±Á±…Ñ™½Éµ9Õ´¤ì(€¥˜¡‘¥É¥±Ñ•È„ôõ¹Õ±°¥ì(€€€™¥±Ñ•É•õ™¥±Ñ•É•¹™¥±Ñ•È¡Ğôùì(€€€€€½¹ÍĞÍÑ½ÀõĞ¹ÍÑ½ÁÌ¹™¥¹¡ÌôùÌ¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€€€½¹ÍĞ¥ÍQ•Éµ¥¹ÕÌõÍÑ½À˜™ÍÑ½À¹…ÉÈ˜˜…ÍÑ½À¹‘•Àì€¼¼…ÉÉ¥Ù•Ì‰ÕĞ‘½•Ì¹½Ğ‘•Á…ÉĞ€ôƒ®.ç²^·²Š²Â¤(€€€€€É•ÑÕÉ¸¥ÍQ•Éµ¥¹ÕÍññĞ¹‘¥Èôôõ‘¥É¥±Ñ•Èì(€€€ô¤ì(€ô(€É•ÑÕÉ¸™¥±Ñ•É•ì)ô()™Õ¹Ñ¥½¸}•áÑÉ…Ñ•ÍÑ¥¹…Ñ¥½¹Ì¡±¥¹•Ì°ÍÑ…Ñ¥½¹9…µ”°‘¥É•Ñ¥½¸õ¹Õ±°¥ì(€½¹ÍĞÍÑ¹	…Í”õÍÑ…Ñ¥½¹9…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ıÍÑ…Ñ¥½¹9…µ”¹Í±¥” À°´Ä¤éÍÑ…Ñ¥½¹9…µ”ì(€½¹ÍĞÉ…‘•]½É‘Ìõl%Q`·²#®#²vœ°%Qc²#®#²vœ°%Q`·²Ê·²Ú`œ°%Qc²Ê·²Ú`œ°%Q`·®#²v0œ°%Qc®#²v0œ°Ÿ®²ÓªÚ¶fS¶bàœ°Ÿ®²ÓªÚ¶fPœ°-Q`œ°MIPtì(€½¹ÍĞ¥ÑåM•Ğõ¹•ÜM•Ğ ¤ì(€½¹ÍĞ‘•‘ÕÁ•õl¸¸¹¹•ÜM•Ğ¡±¥¹•Ì¹µ…À¡°ôù°¹É•Á±…” ½p½qL¬¼°œœ¤¹ÑÉ¥´ ¤¤¥tì(€™½È¡½¹ÍĞ±¥¹”½˜‘•‘ÕÁ•¥ì(€€€±•ĞÌõ±¥¹”¹É•Á±…” ½p¡mx¥t©p¤½œ°œœ¤¹ÑÉ¥´ ¤ì(€€€™½È¡½¹ÍĞœ½˜É…‘•]½É‘Ì¤ÌõÌ¹É•Á±…”¡¹•ÜI•áÀ¡œ°œœ¤°œœ¤¹ÑÉ¥´ ¤ì(€€€ÌõÌ¹É•Á±…” ½oªÂ ·¶zt¯²qÌ¨½œ°œœ¤¹ÑÉ¥´ ¤ì(€€€¥˜ …Ì¹¥¹±Õ‘•Ì œ´œ¤¥½¹Ñ¥¹Õ”ì(€€€½¹ÍĞ¥Ñ¥•ÌõÌ¹ÍÁ±¥Ğ œ´œ¤¹µ…À¡ŒôùŒ¹ÑÉ¥´ ¤¤¹™¥±Ñ•È¡ŒôùŒ˜™Œ„ôõÍÑ¹	…Í”˜™Œ„ôõÍÑ…Ñ¥½¹9…µ”¤ì(€€€¥˜ …¥Ñ¥•Ì¹±•¹Ñ ¥½¹Ñ¥¹Õ”ì(€€€¥˜¡‘¥É•Ñ¥½¸ôôô‘½İ¸œ¤¥ÑåM•Ğ¹…‘¡¥Ñ¥•Ím¥Ñ¥•Ì¹±•¹Ñ ´Åt¤ì€¼¼Ñ½İ…É±…ÍĞ¥Ñä€ô‘½İ¹‰½Õ¹•¹‘Á½¥¹Ğ(€€€•±Í”¥˜¡‘¥É•Ñ¥½¸ôôôÕÀœ¤¥ÑåM•Ğ¹…‘¡¥Ñ¥•ÍlÁt¤ì€€€€€€€€€€€€¼¼Ñ½İ…É™¥ÉÍĞ¥Ñä€ôÕÁ‰½Õ¹•¹‘Á½¥¹Ğ(€€€•±Í”¥Ñ¥•Ì¹™½É… ¡Œôù¥ÑåM•Ğ¹…‘¡Œ¤¤ì(€ô(€É•ÑÕÉ¸l¸¸¹¥ÑåM•Ñt¹Í±¥” À±‘¥É•Ñ¥½¸üÌèÔ¤ì)ô()™Õ¹Ñ¥½¸}Í¥A±…Ñ™½ÉµQÉ…¥¹Í!Q50¡¹…µ”°ÑÉ…¥¹Ì¥ì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞ¹…µ•ÍŒõ¹…µ”¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€¼¼ƒ²ƒ¶tƒ¶f#²^@ƒ².“²‚pƒ®ÂÃ²‚W®Bpƒ²^Ó²Â €£ªÊ3²zƒªâÃ²’ °ƒ²^²ró®¦Ğƒ¶rÓ®š³²*“¶.Äƒ¶>Ó®ÂÄ¤(€½¹ÍĞÁ±…ÑQÉ…¥¹Ìõ}Í¥…É‘A±…Ñ™½É´„ôõ¹Õ±°(€€€€ıÑÉ…¥¹Ì¹™¥±Ñ•È¡Ğôù}Á±…Ñ™½Éµ½ÉQÉ…¥¸¡¹…µ”±ÑÉ…¥¹9…µ”±ÑÉ…¥¹Ì±Ğ¤ôôõ}Í¥…É‘A±…Ñ™½É´¤(€€€€él¸¸¹ÑÉ…¥¹Ítì(€€¼¼ƒ®.ç²^·²Š²Â¤ƒ²‚s²fàƒ¶V¶À€ ŒĞ¤(€±•Ğ™¥±Ñ•É•õ}Í¥!¥‘•Q•É´ıÁ±…ÑQÉ…¥¹Ì¹™¥±Ñ•È¡Ğôø…}¥ÍQ•Éµ¥¹ÕÍĞ¡Ğ±ÑÉ…¥¹9…µ”¤¤éÁ±…ÑQÉ…¥¹Ìì(€€¼¼ƒ²vÓ¶nƒ²^Ó²Â£®0ƒ¶V¶ÀƒŠPƒ²jÓ¶Z'²vğ ÀĞèÀÁû²v×²vğ€ÀÌèÔä¤ƒªâÃ²’ ¸€ÈÌèÌÃ²^@€ÀèĞÀƒ²^Ó²Â£®*P€Ÿ²vÓ¶nŸ®†pƒ²Ş£ªâ$(€±•ĞÍÙ¹‘•õ™…±Í”°™¥ÉÍÑ9•áĞõ¹Õ±°ì(€¥˜¡}Í¥UÁ½µ¥¹=¹±ä¥ì(€€€½¹ÍĞ¹½İõ¹•Ü…Ñ” ¤ì(€€€½¹ÍĞ¹½İMÉØõ}ÍÉÙ5¥¸¡¹½İ¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İ¹•Ñ5¥¹ÕÑ•Ì ¤¤ì(€€€½¹ÍĞÕÁ½µ¥¹œõ™¥±Ñ•É•¹™¥±Ñ•È¡Ğôùì(€€€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€€€½¹ÍĞ´õÑ½5¥¸¡Ìü¹‘•ÁññÌü¹…ÉÈ¤ì(€€€€€É•ÑÕÉ¸´„ôõ¹Õ±°€˜˜}ÍÉÙ5¥¸¡´¤øõ¹½İMÉØì(€€€ô¤ì(€€€¥˜¡ÕÁ½µ¥¹œ¹±•¹Ñ ôôôÀ€˜˜™¥±Ñ•É•¹±•¹Ñ øÀ¥ì(€€€€€ÍÙ¹‘•õÑÉÕ”ì(€€€€€€¼¼ƒ²v×²vğ£®.“²v0ƒ²jÓ¶Z'²vğ¤ƒ²Ê¯²Â ƒ²V#®
Ó²j¤(€€€€€½¹ÍĞ‰åMÑ…ÉĞõl¸¸¹™¥±Ñ•É•‘t¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€€€€€½¹ÍĞÍ„õ„¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤°Íˆõˆ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€€€€€É•ÑÕÉ¸}ÍÉÙ5¥¸¡Ñ½5¥¸¡Í„ü¹‘•ÁññÍ„ü¹…ÉÈ¥ñğÀ¤µ}ÍÉÙ5¥¸¡Ñ½5¥¸¡Íˆü¹‘•ÁññÍˆü¹…ÉÈ¥ñğÀ¤ì(€€€€€ô¤ì(€€€€€½¹ÍĞ™Ìõ‰åMÑ…ÉÑlÁtü¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€€€™¥ÉÍÑ9•áĞõ™Ìü¡™Ì¹‘•Áññ™Ì¹…ÉÈ¤é¹Õ±°ì(€€€ô(€€€™¥±Ñ•É•õÕÁ½µ¥¹œì(€ô(€½¹ÍĞÍ½ÉÑ•õl¸¸¹™¥±Ñ•É•‘t¹Í½ÉĞ ¡„±ˆ¤ôùì(€€€½¹ÍĞÍ„õ„¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤°Íˆõˆ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€½¹ÍĞ­„õÑ½5¥¸¡Í„ü¹‘•ÁññÍ„ü¹…ÉÈ¤°­ˆõÑ½5¥¸¡Íˆü¹‘•ÁññÍˆü¹…ÉÈ¤ì(€€€€¼¼ƒ²vÓ¶nƒ²^Ó²Â£®0ƒ®ª£®Ns²^C²s®*Pƒ²jÓ¶Z'²vğƒ²"s²p ÀÓ².pƒªâÃ²’ §®†pƒ²‚W®‚³¶VĞƒ²zC²‚Tƒ®c®*Pƒ²^Ó²Â£ªÂ ƒ®J“²^@ƒ²b“®>®†t(€€€¥˜¡}Í¥UÁ½µ¥¹=¹±ä¤É•ÑÕÉ¸€¡­„ôôõ¹Õ±°üääääé}ÍÉÙ5¥¸¡­„¤¤´¡­ˆôôõ¹Õ±°üääääé}ÍÉÙ5¥¸¡­ˆ¤¤ì(€€€É•ÑÕÉ¸€¡­…ñğääää¤´¡­‰ñğääää¤ì(€ô¤ì(€€¼¼ƒ®Â§®¦Ó
ß®Â§¶Z—²v ƒ².“²‚pƒ®ÂÃ²‚W®Bpƒ²^Ó²Â£²^C²pƒ®>²Úp(€½¹ÍĞ™‘¥ÉÌõ¹•ÜM•Ğ¡Í½ÉÑ•¹µ…À¡ĞôùĞ¹‘¥È¤¤ì(€½¹ÍĞ‘¥É1…‰•°ô¡}Í¥…É‘A±…Ñ™½É´„ôõ¹Õ±°˜™™‘¥ÉÌ¹Í¥é”ôôôÄ¤ü¡Í½ÉÑ•‘lÁt¹‘¥Èôôô‘½İ¸œüŸ¶Vc¶Z'ŠLœèŸ²¶Z'ŠDœ¤èœœì(€½¹ÍĞ‘•ÍÑÌõ}Í¥…É‘A±…Ñ™½É´„ôõ¹Õ±°ıl¸¸¹¹•ÜM•Ğ¡Í½ÉÑ•¹™¥±Ñ•È¡Ğôø…}¥ÍQ•Éµ¥¹ÕÍĞ¡Ğ±ÑÉ…¥¹9…µ”¤¤¹µ…À¡ĞôùĞ¹‘•ÍĞ¤¥t¹Í±¥” À°Ì¤émtì(€½¹ÍĞ‘•ÍÑÍMÑÈõ‘•ÍÑÌ¹±•¹Ñ øÀı‘•ÍÑÌ¹©½¥¸ œƒŠˆ€œ¤¬œƒ®Â§®¦Ğœèœœì(€€¼¼ƒ²vÓ²‚¿®.“²v3²^´ƒ²vÓ®>d€ ŒÔ¤ƒŠPƒ¶f ƒ²^Ó²Â£®N“²v`ƒ²²‚¿²¶nƒ²‚W²Â£²^´ƒ²’Dƒ²ÖsªŞó²‚G²^´(€½¹ÍĞ¹•áÑõmt°ÁÉ•Ùõmtì(€Á±…ÑQÉ…¥¹Ì¹™½É… ¡Ğôùí½¹ÍĞ„õ}…‘©MÑ½Á=˜¡Ğ±ÑÉ…¥¹9…µ”¤ì¥˜¡„¹¹•áĞ¥¹•áÑ¹ÁÕÍ ¡„¹¹•áĞ¤ì¥˜¡„¹ÁÉ•Ø¥ÁÉ•Ù¹ÁÕÍ ¡„¹ÁÉ•Ø¤íô¤ì(€½¹ÍĞÁÉ•ÙMÑ¸õ}¹•…É•ÍÑMÑ¸¡ÑÉ…¥¹9…µ”±ÁÉ•Ù¤°¹•áÑMÑ¸õ}¹•…É•ÍÑMÑ¸¡ÑÉ…¥¹9…µ”±¹•áÑ¤ì(€½¹ÍĞ¹…Ù	Ñ¸ô¡ÍÑ¸±…ÉÉ½Ü¤ôù€ñ‰ÕÑÑ½¸½¹±¥¬ô‰½Á•¹MÑ…Ñ¥½¹•Ñ…¥° œ‘íÍÑ¸¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆÍÑå±”ô‰™±•àèÄíµ¥¸µİ¥‘Ñ èÀíÁ…‘‘¥¹œèáÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèåÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹ĞµÍ¥é”èÄÈ¸ÕÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤íİ¡¥Ñ”µÍÁ…”é¹½İÉ…Àí½Ù•É™±½Üé¡¥‘‘•¸íÑ•áĞµ½Ù•É™±½Üé•±±¥ÁÍ¥Ìˆø‘í…ÉÉ½ÜôôôÁÉ•ØœüŸŠ@€œ­ÍÑ¸éÍÑ¸¬œƒŠHôğ½‰ÕÑÑ½¸ù€ì(€½¹ÍĞ¹…Ù!Ñµ°ô¡ÁÉ•ÙMÑ¹ññ¹•áÑMÑ¸¤ı€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèáÁàíµ…É¥¸µ‰½ÑÑ½´èÄÁÁàˆø‘íÁÉ•ÙMÑ¸ı¹…Ù	Ñ¸¡ÁÉ•ÙMÑ¸°ÁÉ•Øœ¤èœô‘í¹•áÑMÑ¸ı¹…Ù	Ñ¸¡¹•áÑMÑ¸°¹•áĞœ¤èœôğ½‘¥Øù€èœœì(€½¹ÍĞÑ•Éµ=¸õ}Í¥!¥‘•Q•É´°ÕÁ=¸õ}Í¥UÁ½µ¥¹=¹±äì(€½¹ÍĞ¡¥Àô¡½¸±±…‰•°±™¸¤ôù€ñ‰ÕÑÑ½¸½¹±¥¬ôˆ‘í™¹ô œ‘í¹…µ•Íôœ¤ˆÍÑå±”ô‰Á…‘‘¥¹œèÑÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàí‰½É‘•ÈèÅÁàÍ½±¥€‘í½¸üÙ…È ´µ…•¹Ğ¤œèÙ…È ´µ‰½É‘•È¤ôí‰…­É½Õ¹è‘í½¸üÙ…È ´µ…•¹Ğ¤œèÙ…È ´µ‰œÌ¤ôí½±½Èè‘í½¸üœ™™˜œèÙ…È ´µÑ•áĞÈ¤ôí™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèØÀÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤íİ¡¥Ñ”µÍÁ…”é¹½İÉ…Àˆø‘í±…‰•±ôğ½‰ÕÑÑ½¸ù€ì(€½¹ÍĞ•¹‘•‘!Ñµ°õÍÙ¹‘•(€€€€ı€ñ‘¥ØÍÑå±”ô‰Ñ•áĞµ…±¥¸é•¹Ñ•ÈíÁ…‘‘¥¹œèÄáÁà€ÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤í™½¹ĞµÍ¥é”èÄÍÁàí±¥¹”µ¡•¥¡ĞèÄ¸Üˆø(€€€€€€€ƒÂ~2d€ñˆûªâ#²vğƒ²jÓ¶Z'²vĞƒ²Š®3®Bc²^#²*×®.#®.ğ½ˆøñ‰Èø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÄ¸ÕÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû²jÓ¶Z'²vğƒªâÃ²’ €ÀĞèÀÁû²v×²vğ€ÀÌèÔä‘í™¥ÉÍÑ9•áĞı€ƒ
Üƒ²v×²vğƒ²Ê¯²Â €ñˆÍÑå±”ô‰½±½ÈéÙ…È ´µ…•¹Ğ¤í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘í™¥ÉÍÑ9•áÑôğ½ˆù€èœôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øù€èœœì(€É•ÑÕÉ¸€(€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÙÁàíµ…É¥¸µ‰½ÑÑ½´è‘í}Í¥…É‘A±…Ñ™½É´üœØœèœÄÀõÁàí™±•àµİÉ…ÀéİÉ…Àˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µÑ•áĞÈ¤í™±•àèÄíµ¥¸µİ¥‘Ñ èÄÈÁÁàˆûÂ~j€‘í}Í¥…É‘A±…Ñ™½É´ı€‘í}Í¥…É‘A±…Ñ™½Éµ÷®Ê ƒ¶f ‘í‘¥É1…‰•°üœ€ œ­‘¥É1…‰•°¬œ¤œèœôƒ².sªÂ¶Fq€èŸ²^´ƒ².sªÂ¶Fpôğ½‘¥Øø(€€€€€€‘í¡¥À¡ÕÁ=¸°Ÿ²vÓ¶nƒ²^Ó²Â£®0œ°Ñ½±•M%UÁ½µ¥¹œœ¥ô(€€€€€€‘í¡¥À¡Ñ•Éµ=¸°Ÿ®.ç²^·²Š²Â¤ƒ²‚s²fàœ°Ñ½±•M%Q•É´œ¥ô(€€€€ğ½‘¥Øø(€€€€‘í}Í¥…É‘A±…Ñ™½É´„ôõ¹Õ±°ı}µ•ÑÉ½1¥¹•Í½ÉQÉ…¥¹A±…Ñ™½Éµ!Q50¡ÑÉ…¥¹9…µ”±}Í¥…É‘A±…Ñ™½É´¤èœô(€€€€‘í‘•ÍÑÍMÑÈı€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÁÁàí½±½ÈéÙ…È ´µ…•¹ĞÈ¤íµ…É¥¸µ‰½ÑÑ½´èáÁàˆûÂ~N4€‘í‘•ÍÑÍMÑÉôğ½‘¥Øù€èœô(€€€€‘í¹…Ù!Ñµ±ô(€€€€‘í•¹‘•‘!Ñµ±ô(€€€€‘íÍ½ÉÑ•¹±•¹Ñ ôôôÀ˜˜…ÍÙ¹‘•üœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÍÁàíÑ•áĞµ…±¥¸é•¹Ñ•ÈíÁ…‘‘¥¹œèÄÉÁàˆû²jÓ¶Z$ƒ²^Ó²Â ƒ²^²v0ğ½‘¥Øøœèœô(€€€€‘ì  ¤ôùì(€€€€€½¹ÍĞÑÉ…¥¹I½ÜõĞôùì(€€€€€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€€€€€½¹ÍĞÑ¥µ”õÌü¹‘•ÁññÌü¹…ÉÉñğœ´œì(€€€€€€€½¹ÍĞ‘¥ÈõĞ¹‘¥Èôôô‘½İ¸œüŸ¶Vc¶Z'ŠLœèŸ²¶Z'ŠDœì(€€€€€€€½¹ÍĞ‘¥ÉõĞ¹‘¥Èôôô‘½İ¸œüÙ…È ´µ…•¹Ğ¤œèÙ…È ´µÉ•¤œì(€€€€€€€½¹ÍĞ¥ÍQ•É´õ}¥ÍQ•Éµ¥¹ÕÍĞ¡Ğ±ÑÉ…¥¹9…µ”¤ì(€€€€€€€½¹ÍĞ‘•ÍÑ!Ñµ°õ¥ÍQ•É´(€€€€€€€€€€ı€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ…•¹ĞÈ¤ˆû®.ç²^·²Š²Â¤ğ½ÍÁ…¸ù€(€€€€€€€€€€é€‘íĞ¹‘•ÍÑ÷¶Z%€ì(€€€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁàíÁ…‘‘¥¹œèáÁà€Àí‰½É‘•Èµ‰½ÑÑ½´èÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤ÈÈˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÕÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤íµ¥¸µİ¥‘Ñ èĞÙÁàˆø‘íÑ¥µ•ôğ½‘¥Øø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰µ¥¸µİ¥‘Ñ èÔÁÁàˆø(€€€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡Ğ¹É…‘”¥ô¤ˆø‘íĞ¹É…‘•ôğ½‘¥Øø(€€€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÁÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø‘íĞ¹¹½ôğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àèÄí™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í‘•ÍÑ!Ñµ±ôğ½‘¥Øø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½Èè‘í‘¥Éôˆø‘í‘¥Éôğ½‘¥Øø(€€€€€€€€ğ½‘¥Øù€ì(€€€€€ôì(€€€€€½¹ÍĞÍ¡½İ¸õÍ½ÉÑ•¹Í±¥” À°ÈÀ¤ì(€€€€€½¹ÍĞÉ•ÍĞõÍ½ÉÑ•¹Í±¥” ÈÀ¤ì(€€€€€É•ÑÕÉ¸Í¡½İ¸¹µ…À¡ÑÉ…¥¹I½Ü¤¹©½¥¸ œœ¤¬(€€€€€€€€¡É•ÍĞ¹±•¹Ñ øÀı€ñ‘¥Ø¥ô‰Í¤µÑÉ…¥¸µ•áÑÉ„ˆÍÑå±”ô‰‘¥ÍÁ±…äé¹½¹”ˆø‘íÉ•ÍĞ¹µ…À¡ÑÉ…¥¹I½Ü¤¹©½¥¸ œœ¥ôğ½‘¥Øø(€€€€€€€€ñ‘¥Ø½¹±¥¬ô‰‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µÑÉ…¥¸µ•áÑÉ„œ¤¹ÍÑå±”¹‘¥ÍÁ±…äô‰±½¬œíÑ¡¥Ì¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œˆ(€€€€€€€€€ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µ…•¹Ğ¤íÑ•áĞµ…±¥¸é•¹Ñ•ÈíÁ…‘‘¥¹œèáÁà€ÀíÕÉÍ½ÈéÁ½¥¹Ñ•Èí‰½É‘•ÈèÅÁà‘…Í¡•Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèáÁàíµ…É¥¸µÑ½ÀèÑÁàí™½¹Ğµİ•¥¡ĞèØÀÀˆø(€€€€€€€€€€¬‘íÉ•ÍĞ¹±•¹Ñ¡÷¶:àƒ®6Pƒ®ÎÓªâÀƒŠZğ(€€€€€€€€ğ½‘¥Øù€èœœ¤ì(€€€ô¤ ¥ô(€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰Í•…É¡MÑ…Ñ¥½¸ œ‘í¹…µ•Íôœ¤ˆÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”íµ…É¥¸µÑ½ÀèÄÁÁàíÁ…‘‘¥¹œèåÁàí‰½É‘•ÈµÉ…‘¥ÕÌèáÁàí‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ…•¹Ğ¤í‰…­É½Õ¹éÑÉ…¹ÍÁ…É•¹Ğí½±½ÈéÙ…È ´µ…•¹Ğ¤í™½¹ĞµÍ¥é”èÄÉÁàíÕÉÍ½ÈéÁ½¥¹Ñ•Èí™½¹Ğµ™…µ¥±äéÙ…È ´µÍ…¹Ì¤í™½¹Ğµİ•¥¡ĞèØÀÀˆû²‚²ÊĞƒ².sªÂ¶Fpƒ®ÎÓªâÀƒŠHğ½‰ÕÑÑ½¸ø(€€ì)ô((¼¼ƒŠRŠR ƒ²^´ƒ²‚ªÒG¶2@ƒªÎ×¶Ôèƒ²jÓ¶Z'²vğƒ²Š®0ƒ².p€Ÿ²jÓ¶Z$ƒ²Š®0ƒŠPƒ®
Ó²vğƒ²Ê¬ƒ²^Ó²Â œƒªÖC®2 ƒ¶Fs².pƒŠRŠR )™Õ¹Ñ¥½¸}Í‰¹‘•‘!Q50¡½±Í!Ñµ°°ÑµÉI½İÍ!Ñµ°°™¥ÉÍÑMÑÈ°­¥¹‘1…‰•°¥ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ•¹‘•ˆø(€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µ™±¥ÀÍ‰”µ„ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µµ½½¸ˆûÂ~2dğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µµÍœˆûªâ#²vğƒ²jÓ¶Z'²vĞƒ²Š®3®Bc²^#²*×®.#®.ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µÍÕˆˆû²jÓ¶Z'²vğƒªâÃ²’ €ÀĞèÀÀøƒ²v×²vğ€ÀÌèÔä‘í™¥ÉÍÑMÑÈı€ƒ
Üƒ®
Ó²vğƒ²Ê¬€‘í­¥¹‘1…‰•±ô€ñˆø‘í™¥ÉÍÑMÑÉôğ½ˆù€èœôğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µ™±¥ÀÍ‰”µˆˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í‰”µ¹•áĞµ¡•…ˆûÂ~jƒ®
Ó²vğƒ²jÓ¶Z$ƒ²b#²‚Tğ½‘¥Øø(€€€€€€‘í½±Í!Ñµ±ô(€€€€€€‘íÑµÉI½İÍ!Ñµ±ñğœñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ•µÁÑäˆû®
Ó²vğƒ²jÓ¶Z$ƒ²‚W®ÎĞƒ²^²v0ğ½‘¥Øøô(€€€€ğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô((¼¼ƒŠRŠR ƒ²^´ƒ²‚ªÒG¶2@€£²Ús®Âpƒ²V#®
Ğ1¤ƒŠRŠR ƒ²b“®*`£²jÓ¶Z'²vğ€ÀĞèÀÁû²v×²vğ€ÀÌèÔä¤ƒ²^Ó²Â£®0ƒ¶Fs².p)™Õ¹Ñ¥½¸}Í¥•Á…ÉÑÕÉ•	½…É‘!Q50¡¹…µ”°ÑÉ…¥¹Ì°±¥µ¥Ğ¥ì(€±¥µ¥Ğõ±¥µ¥ÑñğØì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì(€½¹ÍĞ¹½İ5¥¸õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ¹½İMÉØõ}ÍÉÙ5¥¸¡¹½İ5¥¸¤ì(€½¹ÍĞ±½¬õ€‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ!½ÕÉÌ ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€€¼¼ƒ²^Ó²Â£®Îƒ²*çªÂW²z”ƒ®“¶VD€£ªÊ3²zƒ²jÃ²€°ƒ²^²ró®¦Ğƒ¶rÓ®š³²*“¶.Ä¤(€½¹ÍĞÁ±…Ñ=˜õíôì(€ÑÉ…¥¹Ì¹™½É… ¡Ğôùì½¹ÍĞÀõ}Á±…Ñ™½Éµ½ÉQÉ…¥¸¡¹…µ”°ÑÉ…¥¹9…µ”°ÑÉ…¥¹Ì°Ğ¤ì¥˜¡À„õ¹Õ±°¤Á±…Ñ=™mĞ¹¹½tõÀìô¤ì(€€¼¼ƒ²Ús®Âs¶2@ƒ¶n®ÎĞ£®.ç²^·²Š²Â¤ƒ²‚s²fà¤ƒŠPƒ²jÓ¶Z'²vğƒªâÃ²’ ƒ².sªÂ¡‘¥™˜€ôƒ²jÓ¶Z'²vğƒ®Úƒ²Â£²vĞ¤(€½¹ÍĞ…¹õÑÉ…¥¹Ì¹µ…À¡Ğôùì(€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€¥˜ …Ì¤É•ÑÕÉ¸¹Õ±°ì(€€€¥˜¡Ğ¹‘•ÍĞôôõÑÉ…¥¹9…µ•ñğ¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¤˜˜…¡…ÍQ¥µ”¡Ì¹‘•À¤¤¤É•ÑÕÉ¸¹Õ±°ì€¼¼ƒ®.ç²^·²Š²Â§²v ƒ²Ús®Âs¶2@ƒ²‚s²fà(€€€½¹ÍĞ‘•ÁMÑÈõÌ¹‘•ÁññÌ¹…ÉÈì¥˜ …‘•ÁMÑÈ¤É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞÑ¥µ•õĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡àôù¡…ÍQ¥µ”¡à¹…ÉÈ¥ññ¡…ÍQ¥µ”¡à¹‘•À¤¤ì(€€€½¹ÍĞÍ¤õÑ¥µ•¹™¥¹‘%¹‘•à¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€½¹ÍĞ‘•±…äõÍ¤øôÀı}Í¥µ•±…åÑMÑ½À¡Ğ±Í¤¤èÀì(€€€½¹ÍĞ•áÁ•Ñ•õ‘•±…äøÀı…‘‘5¥¹Q½±½¬¡‘•ÁMÑÈ±‘•±…ä¤é‘•ÁMÑÈì(€€€½¹ÍĞ´õÑ½5¥¸¡•áÁ•Ñ•¤ì¥˜¡´ôôõ¹Õ±°¤É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞÍÉØõ}ÍÉÙ5¥¸¡´¤ì(€€€½¹ÍĞ‘¥™˜õÍÉØµ¹½İMÉØì€¼¼ƒ²jÓ¶Z'²vğƒªâÃ²’ ƒ¶b²z³²f²v`ƒ®Úƒ²Â£²vĞ€£®.“²v0ƒ²jÓ¶Z'²vğƒ²^Ó²Â£®*Pƒ²v3²"`ƒŠHƒ²‚s²fà¤(€€€É•ÑÕÉ¸íĞ±‘•ÁMÑÈ±•áÁ•Ñ•±‘•±…ä±ÍÉØ±‘¥™™ôì(€ô¤¹™¥±Ñ•È¡	½½±•…¸¤ì(€½¹ÍĞ‘•ÁI½Üô¡È±ÑµÈ¤ôùì(€€€½¹ÍĞĞõÈ¹Ğ°Á±…ĞõÁ±…Ñ=™mĞ¹¹½tì(€€€±•ĞÍĞ°±Ìì(€€€¥˜¡ÑµÈ¥ìÍĞôŸ®
Ó²vğœì±ÌôÍˆµÍĞµÍ¡•œìô(€€€•±Í”¥˜¡È¹‘¥™˜ğôÀ¥ìÍĞôŸ²Ús®Âpœì±ÌôÍˆµÍĞµ‰½…Éœìô(€€€•±Í”¥˜¡È¹‘¥™˜ğôÔ¥ìÍĞõ€‘íÈ¹‘¥™™÷®Úƒ¶n€ì±ÌôÍˆµÍĞµÍ½½¸œìô(€€€•±Í”ìÍĞôŸ²‚W².pœì±ÌôÍˆµÍĞµÍ¡•œìô(€€€½¹ÍĞÍ‘±äõÑµÈüÀéÈ¹‘•±…äì(€€€¥˜¡Í‘±äøÀ¥ìÍĞõ€‘íÍ‘±å÷®Úƒ²²^Á€ì±ÌôÍˆµÍĞµ‘•±…äœìô(€€€½¹ÍĞ¥ÍQ•É´€ôĞ¹‘•ÍĞôôõÑÉ…¥¹9…µ”ñğ€  ¤ôùí½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤íÉ•ÑÕÉ¸Ì˜™Ì¹…ÉÈ˜˜…Ì¹‘•Àíô¤ ¤ì(€€€½¹ÍĞ‘˜õ}‘•±…å½É•…ÍĞ¡Ğ¹±¥¹”±Ğ¹É…‘”¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…ÉµÉ½Üˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÑ¥µ”‘íÍ‘±äøÀüœ‘•±…å•œèœôˆø‘íÍ‘±äøÀı€ñ¤ø‘íÈ¹‘•ÁMÑÉôğ½¤øñ¤ø‘íÈ¹•áÁ•Ñ•‘ôğ½¤ù€éÈ¹‘•ÁMÑÉôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Íˆµ¥¹™¼ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰Íˆµ‘•ÍĞˆø‘í¥ÍQ•É´üŸ®.ç²^·²Š²Â¤œéĞ¹‘•ÍĞ¬Ÿ¶Z$ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÑÉ…¥¸ˆø‘íĞ¹É…‘•ô€‘íĞ¹¹½ô€ñÍÁ…¸±…ÍÌô‰ÍˆµÉ¥Í¬ˆÍÑå±”ô‰‰…­É½Õ¹è‘í‘˜¹½±½ÉôˆÑ¥Ñ±”ô‹²²^Àƒ²r¶^`€‘í‘˜¹±…‰•±ôˆøğ½ÍÁ…¸øğ½ÍÁ…¸ø(€€€€€€ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÁ±…Ğ€‘íÁ±…Ğüœœè¹½¹”ôˆø‘íÁ±…ÑñğŸŠLôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÍÑ…ÑÕÌ€‘í±Íôˆø‘íÍÑôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øù€ì(€ôì(€½¹ÍĞ½±Ìõ€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ½±ÌˆøñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÔÉÁàˆû².sªÂğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰™±•àèÄˆû®Â§®¦Ğƒ
Üƒ²^Ó²Â ğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÌÁÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆû¶f ğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÔÙÁàíÑ•áĞµ…±¥¸éÉ¥¡Ğˆû²V#®
Ğğ½ÍÁ…¸øğ½‘¥Øù€ì(€€¼¼ƒ²b“®*`£¶b²z°ƒ²vÓ¶n¤ƒ²Ús®Âpƒ²^Ó²Â (€½¹ÍĞÉ½İÌõ…¹¹™¥±Ñ•È¡ÈôùÈ¹‘¥™˜øô´È¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹‘¥™˜µˆ¹‘¥™˜¤¹Í±¥” À±±¥µ¥Ğ¤ì(€½¹ÍĞÍÙ¹‘•€ôÉ½İÌ¹±•¹Ñ ôôôÀ€˜˜…¹¹±•¹Ñ øÀì(€±•Ğ‰½‘äì(€¥˜¡ÍÙ¹‘•¥ì(€€€½¹ÍĞÑµÈõl¸¸¹…¹‘t¹Í½ÉĞ ¡„±ˆ¤ôù„¹ÍÉØµˆ¹ÍÉØ¤¹Í±¥” À±±¥µ¥Ğ¤ì(€€€‰½‘äõ}Í‰¹‘•‘!Q50¡½±Ì°ÑµÈ¹µ…À¡Èôù‘•ÁI½Ü¡È±ÑÉÕ”¤¤¹©½¥¸ œœ¤°ÑµÉlÁtü¹‘•ÁMÑÈ°€Ÿ²Ús®Âpœ¤ì(€ô•±Í”ì(€€€‰½‘äõ½±Ì¬¡É½İÌ¹±•¹Ñ ıÉ½İÌ¹µ…À¡Èôù‘•ÁI½Ü¡È±™…±Í”¤¤¹©½¥¸ œœ¤é€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ•µÁÑäˆû¶b²z°ƒ²Ús®Âpƒ²b#²‚Tƒ²^Ó²Â ƒ²^²v0ğ½‘¥Øù€¤ì(€ô(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ¡•…ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍÑ¸µ‰½…ÉµÑ¥Ñ±”ˆûŠZØƒ²Ús®Âpƒ²V#®
Ğƒ
ÜAIQUILğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍÑ¸µ‰½…Éµ±½¬ˆø‘í±½­ôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€‘í‰½‘åô(€€ğ½‘¥Øù€ì)ô((¼¼ƒŠRŠR ƒ®>²Â¤ƒ²V#®
Ğƒ²‚ªÒG¶2@€£²Ús®Âs¶2C²v`ƒ®>²Â¤ƒ®Ê²‚°ƒ®>²Â¤ƒ².sªÂƒªâÃ²’ ¤ƒŠRŠR ƒ²b“®*`ƒ²^Ó²Â£®0ƒ¶Fs².p)™Õ¹Ñ¥½¸}Í¥ÉÉ¥Ù…±	½…É‘!Q50¡¹…µ”°ÑÉ…¥¹Ì°±¥µ¥Ğ¥ì(€±¥µ¥Ğõ±¥µ¥ÑñğÄÀì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì(€½¹ÍĞ¹½İ5¥¸õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ¹½İMÉØõ}ÍÉÙ5¥¸¡¹½İ5¥¸¤ì(€½¹ÍĞ±½¬õ€‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ!½ÕÉÌ ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€½¹ÍĞÁ±…Ñ=˜õíôì(€ÑÉ…¥¹Ì¹™½É… ¡Ğôùì½¹ÍĞÀõ}Á±…Ñ™½Éµ½ÉQÉ…¥¸¡¹…µ”°ÑÉ…¥¹9…µ”°ÑÉ…¥¹Ì°Ğ¤ì¥˜¡À„õ¹Õ±°¤Á±…Ñ=™mĞ¹¹½tõÀìô¤ì(€½¹ÍĞ…¹õÑÉ…¥¹Ì¹µ…À¡Ğôùì(€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€¥˜ …Ì¤É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞ…ÉÉMÑÈõÌ¹…ÉÈì¥˜ ……ÉÉMÑÉñğ…¡…ÍQ¥µ”¡…ÉÉMÑÈ¤¤É•ÑÕÉ¸¹Õ±°ì€¼¼ƒ®>²Â¤ƒ².sªÂƒ²z#®*Pƒ²^Ó²Â£®0£²Ús®Âs²^´ƒ²‚s²fà¤(€€€½¹ÍĞÑ¥µ•õĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡àôù¡…ÍQ¥µ”¡à¹…ÉÈ¥ññ¡…ÍQ¥µ”¡à¹‘•À¤¤ì(€€€½¹ÍĞÍ¤õÑ¥µ•¹™¥¹‘%¹‘•à¡àôùà¹ÌôôõÑÉ…¥¹9…µ”¤ì(€€€½¹ÍĞ‘•±…äõÍ¤øôÀı}Í¥µ•±…åÑMÑ½À¡Ğ±Í¤¤èÀì(€€€½¹ÍĞ•áÁ•Ñ•õ‘•±…äøÀı…‘‘5¥¹Q½±½¬¡…ÉÉMÑÈ±‘•±…ä¤é…ÉÉMÑÈì(€€€½¹ÍĞ´õÑ½5¥¸¡•áÁ•Ñ•¤ì¥˜¡´ôôõ¹Õ±°¤É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞÍÉØõ}ÍÉÙ5¥¸¡´¤ì(€€€½¹ÍĞ‘¥™˜õÍÉØµ¹½İMÉØì(€€€±•Ğ™É½µMÑ¸õ¹Õ±°ì(€€€™½È¡±•Ğ¤ôÀí¤ñĞ¹ÍÑ½ÁÌ¹±•¹Ñ í¤¬¬¥ì¥˜¡¡…ÍQ¥µ”¡Ğ¹ÍÑ½ÁÍm¥t¹‘•À¥ññ¡…ÍQ¥µ”¡Ğ¹ÍÑ½ÁÍm¥t¹…ÉÈ¤¥ì™É½µMÑ¸õĞ¹ÍÑ½ÁÍm¥t¹Ìì‰É•…¬ìôô(€€€½¹ÍĞ¥ÍQ•É´ô¡Ğ¹‘•ÍĞôôõÑÉ…¥¹9…µ”¥ñğ …¡…ÍQ¥µ”¡Ì¹‘•À¤¤ì(€€€É•ÑÕÉ¸íĞ±…ÉÉMÑÈ±•áÁ•Ñ•±‘•±…ä±ÍÉØ±‘¥™˜±™É½µMÑ¸±¥ÍQ•Éµôì(€ô¤¹™¥±Ñ•È¡	½½±•…¸¤ì(€½¹ÍĞ…ÉÉI½Üô¡È±ÑµÈ¤ôùì(€€€½¹ÍĞĞõÈ¹Ğ°Á±…ĞõÁ±…Ñ=™mĞ¹¹½tì(€€€±•ĞÍĞ°±Ìì(€€€¥˜¡ÑµÈ¥ìÍĞôŸ®
Ó²vğœì±ÌôÍˆµÍĞµÍ¡•œìô(€€€•±Í”¥˜¡È¹‘¥™˜ğôÀ¥ìÍĞôŸ®>²Â¤œì±ÌôÍˆµÍĞµ‰½…Éœìô(€€€•±Í”¥˜¡È¹‘¥™˜ğôÔ¥ìÍĞõ€‘íÈ¹‘¥™™÷®Úƒ¶n€ì±ÌôÍˆµÍĞµÍ½½¸œìô(€€€•±Í”ìÍĞôŸ²‚W².pœì±ÌôÍˆµÍĞµÍ¡•œìô(€€€½¹ÍĞÍ‘±äõÑµÈüÀéÈ¹‘•±…äì(€€€¥˜¡Í‘±äøÀ¥ìÍĞõ€‘íÍ‘±å÷®Úƒ²²^Á€ì±ÌôÍˆµÍĞµ‘•±…äœìô(€€€½¹ÍĞ‘˜õ}‘•±…å½É•…ÍĞ¡Ğ¹±¥¹”±Ğ¹É…‘”¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…ÉµÉ½Üˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÑ¥µ”‘íÍ‘±äøÀüœ‘•±…å•œèœôˆø‘íÍ‘±äøÀı€ñ¤ø‘íÈ¹…ÉÉMÑÉôğ½¤øñ¤ø‘íÈ¹•áÁ•Ñ•‘ôğ½¤ù€éÈ¹…ÉÉMÑÉôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Íˆµ¥¹™¼ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰Íˆµ‘•ÍĞˆø‘íÈ¹¥ÍQ•É´üŸ®.ç²^·²Š²Â¤œè¡È¹™É½µMÑ¸ıÈ¹™É½µMÑ¸¬œƒ®ÂpœéĞ¹‘•ÍĞ¬Ÿ¶Z$œ¥ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÑÉ…¥¸ˆø‘íĞ¹É…‘•ô€‘íĞ¹¹½ô€ñÍÁ…¸±…ÍÌô‰ÍˆµÉ¥Í¬ˆÍÑå±”ô‰‰…­É½Õ¹è‘í‘˜¹½±½ÉôˆÑ¥Ñ±”ô‹²²^Àƒ²r¶^`€‘í‘˜¹±…‰•±ôˆøğ½ÍÁ…¸øğ½ÍÁ…¸ø(€€€€€€ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÁ±…Ğ€‘íÁ±…Ğüœœè¹½¹”ôˆø‘íÁ±…ÑñğŸŠLôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍˆµÍÑ…ÑÕÌ€‘í±Íôˆø‘íÍÑôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øù€ì(€ôì(€½¹ÍĞ½±Ìõ€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ½±ÌˆøñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÔÉÁàˆû².sªÂğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰™±•àèÄˆû²Ús®Âs² ƒ
Üƒ²^Ó²Â ğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÌÁÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆû¶f ğ½ÍÁ…¸øñÍÁ…¸ÍÑå±”ô‰İ¥‘Ñ èÔÙÁàíÑ•áĞµ…±¥¸éÉ¥¡Ğˆû²V#®
Ğğ½ÍÁ…¸øğ½‘¥Øù€ì(€½¹ÍĞÉ½İÌõ…¹¹™¥±Ñ•È¡ÈôùÈ¹‘¥™˜øô´È¤¹Í½ÉĞ ¡„±ˆ¤ôù„¹‘¥™˜µˆ¹‘¥™˜¤¹Í±¥” À±±¥µ¥Ğ¤ì(€½¹ÍĞÍÙ¹‘•€ôÉ½İÌ¹±•¹Ñ ôôôÀ€˜˜…¹¹±•¹Ñ øÀì(€±•Ğ‰½‘äì(€¥˜¡ÍÙ¹‘•¥ì(€€€½¹ÍĞÑµÈõl¸¸¹…¹‘t¹Í½ÉĞ ¡„±ˆ¤ôù„¹ÍÉØµˆ¹ÍÉØ¤¹Í±¥” À±±¥µ¥Ğ¤ì(€€€‰½‘äõ}Í‰¹‘•‘!Q50¡½±Ì°ÑµÈ¹µ…À¡Èôù…ÉÉI½Ü¡È±ÑÉÕ”¤¤¹©½¥¸ œœ¤°ÑµÉlÁtü¹…ÉÉMÑÈ°€Ÿ®>²Â¤œ¤ì(€ô•±Í”ì(€€€‰½‘äõ½±Ì¬¡É½İÌ¹±•¹Ñ ıÉ½İÌ¹µ…À¡Èôù…ÉÉI½Ü¡È±™…±Í”¤¤¹©½¥¸ œœ¤é€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ•µÁÑäˆû¶b²z°ƒ®>²Â¤ƒ²b#²‚Tƒ²^Ó²Â ƒ²^²v0ğ½‘¥Øù€¤ì(€ô(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ¸µ‰½…Éµ¡•…ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍÑ¸µ‰½…ÉµÑ¥Ñ±”ˆûŠZğƒ®>²Â¤ƒ²V#®
Ğƒ
ÜII%Y1Lğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÍÑ¸µ‰½…Éµ±½¬ˆø‘í±½­ôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€‘í‰½‘åô(€€ğ½‘¥Øù€ì)ô(¼¼ƒŠRŠR ƒ²^´ƒ².“².sªÂƒ²‚ªÒG¶2@ƒ¶2w²^€£²Ús®Âp¿®>²Â¤ƒ¶´ƒ
Üƒ²zC®>dƒªÂÇ².€¤ƒŠRŠR )±•Ğ}Í¥	½…É‘5½‘”ô‘•Àœ°}Í¥	½…É‘9…µ”õ¹Õ±°°}Í¥	½…É‘QÉ…¥¹Ìõ¹Õ±°ì)™Õ¹Ñ¥½¸½Á•¹MÑ…Ñ¥½¹	½…É¡¹…µ”¥ì(€¥˜¡ÑåÁ•½˜MQQ%=9}„ôôÕ¹‘•™¥¹•œ˜˜…MQQ%=9}	m¹…µ•t˜™MQQ%=9}	m¹…µ”¬Ÿ²^´t¤¹…µ”õ¹…µ”¬Ÿ²^´œì(€½¹ÍĞÑÉ…¥¹9…µ”õ¹…µ”¹•¹‘Í]¥Ñ  Ÿ²^´œ¤ı¹…µ”¹Í±¥” À°´Ä¤é¹…µ”ì(€½¹ÍĞ½±õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ‰½…ÉµİÉ…Àœ¤ì¥˜¡½±¥½±¹É•µ½Ù” ¤ì(€}Í¥	½…É‘9…µ”õ¹…µ”ì}Í¥	½…É‘QÉ…¥¹Ìõ}ÍÑ…Ñ¥½¹MÑ½ÁÁ¥¹QÉ…¥¹Ì¡ÑÉ…¥¹9…µ”¤ì}Í¥	½…É‘5½‘”ô‘•Àœì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥ôÍ¤µ‰½…ÉµİÉ…Àœì(€İÉ…À¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰É…¥°µÑ¥­•Ğµ‰…­‘É½Àˆ½¹±¥¬ô‰±½Í•MÑ…Ñ¥½¹	½…É ¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰Í¤µ‰½…ÉµÁ½ÁÕÀˆÉ½±”ô‰‘¥…±½œˆ…É¥„µ±…‰•°ôˆ‘íÑÉ…¥¹9…µ•÷²^´ƒ²^Ó²Â ƒ²V#®
Ğˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í¤µ‰½…ÉµÁ½ÁÕÀµ¡•…ˆø(€€€€€€€€ñÍÁ…¸ûÂ~j$€‘íÑÉ…¥¹9…µ•÷²^´ğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ±½Í”ˆ½¹±¥¬ô‰±½Í•MÑ…Ñ¥½¹	½…É ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Í¤µ‰½…ÉµÑ…‰Ìˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…ÉµÑ…ˆˆ¥ô‰Í¤µ‰Ğµ‘•Àˆ½¹±¥¬ô‰Í•ÑMÑ…Ñ¥½¹	½…É‘5½‘” ‘•Àœ¤ˆûŠZØƒ²Ús®Âpğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…ÉµÑ…ˆˆ¥ô‰Í¤µ‰Ğµ…ÉÈˆ½¹±¥¬ô‰Í•ÑMÑ…Ñ¥½¹	½…É‘5½‘” …ÉÈœ¤ˆûŠZğƒ®>²Â¤ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø¥ô‰Í¤µ‰½…Éµ±¥Ù”ˆøğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€}‘É…İMÑ…Ñ¥½¹	½…É ¤ì(€¥˜¡}Í¥	½…É‘Q¥µ•È¥±•…É%¹Ñ•ÉÙ…°¡}Í¥	½…É‘Q¥µ•È¤ì(€}Í¥	½…É‘Q¥µ•ÈõÍ•Ñ%¹Ñ•ÉÙ…°¡}‘É…İMÑ…Ñ¥½¹	½…É°ÄÔÀÀÀ¤ì)ô)™Õ¹Ñ¥½¸}‘É…İMÑ…Ñ¥½¹	½…É ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ‰½…Éµ±¥Ù”œ¤ì¥˜ …•±ñğ…}Í¥	½…É‘9…µ”¥É•ÑÕÉ¸ì(€•°¹¥¹¹•É!Q50õ}Í¥	½…É‘5½‘”ôôô…ÉÈœ(€€€€ı}Í¥ÉÉ¥Ù…±	½…É‘!Q50¡}Í¥	½…É‘9…µ”±}Í¥	½…É‘QÉ…¥¹Ì°ÄÈ¤(€€€€é}Í¥•Á…ÉÑÕÉ•	½…É‘!Q50¡}Í¥	½…É‘9…µ”±}Í¥	½…É‘QÉ…¥¹Ì°ÄÈ¤ì(€½¹ÍĞ‘Ğõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ‰Ğµ‘•Àœ¤°…Ğõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ‰Ğµ…ÉÈœ¤ì(€¥˜¡‘Ğ¥‘Ğ¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½¸œ±}Í¥	½…É‘5½‘”ôôô‘•Àœ¤ì(€¥˜¡…Ğ¥…Ğ¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½¸œ±}Í¥	½…É‘5½‘”ôôô…ÉÈœ¤ì)ô)™Õ¹Ñ¥½¸Í•ÑMÑ…Ñ¥½¹	½…É‘5½‘”¡´¥ì}Í¥	½…É‘5½‘”õ´ì}‘É…İMÑ…Ñ¥½¹	½…É ¤ìô)™Õ¹Ñ¥½¸±½Í•MÑ…Ñ¥½¹	½…É ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Í¤µ‰½…ÉµİÉ…Àœ¤ì¥˜¡•°¥•°¹É•µ½Ù” ¤ì(€¥˜¡}Í¥	½…É‘Q¥µ•È¥í±•…É%¹Ñ•ÉÙ…°¡}Í¥	½…É‘Q¥µ•È¤í}Í¥	½…É‘Q¥µ•Èõ¹Õ±°íô(€}Í¥	½…É‘9…µ”õ¹Õ±°ì}Í¥	½…É‘QÉ…¥¹Ìõ¹Õ±°ì)ô(¼¼ƒÂ~jƒ²‚²Ê€ƒ²Ús®Âpƒ²V#®
Ğƒ²‚ªÒG¶2@ƒ¶2w²^ƒŠPƒ²^´ƒ²²ã²v`ƒªâÃ²†Ğƒ².“².sªÂƒ®>²Â¤ƒ²æÓ®Ns®*Pƒ²rƒ²¶VcªÎ€ƒ®Î®>ƒ®Ê¶*ó²ró®†pƒ²^÷®.#®.¸)±•Ğ}µ•ÑÉ½¥ÍÁ±…åQ¥µ•Èõ¹Õ±°ì)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä¡ÍÑ¸¥ì(€±½Í•5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä ¤ì(€}µ•ÑÉ½	½…É‘5½‘”ôÁ½Ìœì(€}µ•ÑÉ½¥ÍÁ±…å1¥¹•%¹‘•àôÀì(€}µ•ÑÉ½¥ÍÁ±…å¥É%¹‘•àôÀì(€}µ•ÑÉ½¥ÍÁ±…å1¥¹•Ìõmtì(€}µ•ÑÉ½¥ÍÁ±…å1¥¹•É½ÕÁÌõmtì(€½¹ÍĞ¡Ñµ°õ}µ•ÑÉ½MÑ…Ñ¥½¹	½…É‘!Q50¡ÍÑ¸±ÑÉÕ”¤ì(€¥˜ …¡Ñµ°¥É•ÑÕÉ¸ì(€½¹ÍĞÍ…™”õ}½ÁÍÍŒ¡ÍÑ¸¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥ôµ•ÑÉ¼µ‘¥ÍÁ±…äµİÉ…Àœì(€İÉ…À¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰É…¥°µÑ¥­•Ğµ‰…­‘É½Àˆ½¹±¥¬ô‰±½Í•5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä ¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ½ÁÕÀˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆ…É¥„µ±…‰•°ôˆ‘íÍ…™•÷²^´ƒ²Ús®Âpƒ²V#®
Ğƒ²‚ªÒG¶2@ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ‘¥ÍÁ±…äµ¡•…ˆø(€€€€€€€€ñÍÁ…¸ûÂ~j€‘íÍ…™•÷²^´ƒ²Ús®Âpƒ²V#®
Ğƒ²‚ªÒG¶2@ğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ±½Í”ˆ½¹±¥¬ô‰±½Í•5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µ•ÑÉ¼µ‘¥ÍÁ±…äµÍÉ½±°ˆø‘í¡Ñµ±ôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€}µ•ÑÉ½¥ÍÁ±…åQ¥µ•ÈõÍ•Ñ%¹Ñ•ÉÙ…°¡}É•™É•Í¡5•ÑÉ½¥ÍÁ±…å	½…É°ÄÔÀÀÀ¤ì)ô)™Õ¹Ñ¥½¸±½Í•5•ÑÉ½MÑ…Ñ¥½¹¥ÍÁ±…ä ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µ•ÑÉ¼µ‘¥ÍÁ±…äµİÉ…Àœ¤ì¥˜¡•°¥•°¹É•µ½Ù” ¤ì(€¥˜¡}µ•ÑÉ½¥ÍÁ±…åQ¥µ•È¥í±•…É%¹Ñ•ÉÙ…°¡}µ•ÑÉ½¥ÍÁ±…åQ¥µ•È¤í}µ•ÑÉ½¥ÍÁ±…åQ¥µ•Èõ¹Õ±°íô(€¥˜¡‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ…¥É•œ¤¥±½Í•5•ÑÉ½QÉ…¥¸ ¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ…¥É•œ¤ì)ô(¼¼ƒÂ~jƒ²‚²Ê€ƒ²^´ƒ²‚²ÊĞƒ².sªÂ¶FpƒŠPƒ²æÓ²æÓ²b“²¶Vc²Êƒ².t£®Â§®¦Ó®Îƒ²^Ğ°ƒªÂg²v ƒ².sªÂ®2®*PƒªÂg²v ƒ¶Z'²^@ƒ²‚W®‚°¤)±•Ğ}µÑÑáÁÉ•ÍÍ=¹±äõ™…±Í”°}µÑÑMÑ…Ñ¥½¸õ¹Õ±°°}µÑÑ1¥¹”õ¹Õ±°°}µÑÑI½ÕÑ•MÙŒõ¹Õ±°°}µÑÑI½ÕÑ•-•äõ¹Õ±°ì)™Õ¹Ñ¥½¸}µÑÑ¥±Ñ•É¹ÑÉ¥•Ì¡•¹ÑÉ¥•Ì±•áÁÉ•ÍÍ=¹±ä¥ì(€É•ÑÕÉ¸•áÁÉ•ÍÍ=¹±äı•¹ÑÉ¥•Ì¹™¥±Ñ•È¡•¹ÑÉäôù9Õµ‰•È¡•¹ÑÉä¹±Ì¤øÀ¤é•¹ÑÉ¥•Ìì)ô)™Õ¹Ñ¥½¸}µÑÑ!…ÍáÁÉ•ÍÌ¡•¹ÑÉ¥•Ì¥ì(€É•ÑÕÉ¸•¹ÑÉ¥•Ì¹Í½µ”¡•¹ÑÉäôù9Õµ‰•È¡•¹ÑÉä¹±Ì¤øÀ¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5•ÑÉ½Q¥µ•Ñ…‰±•áÁÉ•ÍÍ=¹±ä¡¡•­•¥ì(€}µÑÑáÁÉ•ÍÍ=¹±äô„…¡•­•ì(€¥˜¡}µÑÑMÑ…Ñ¥½¸˜™}µÑÑ1¥¹”¥½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±”¡}µÑÑMÑ…Ñ¥½¸±}µÑÑ1¥¹”±ÑÉÕ”¤ì)ô)™Õ¹Ñ¥½¸}½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±•I½Ü¡É½Ü±±¥¹”±ÍÙŒ±±¬±¬À±¬Ä¥ì(€½¹ÍĞİÉ…ÀõÉ½Ü˜™É½Ü¹±½Í•ÍĞıÉ½Ü¹±½Í•ÍĞ œµÑĞµİÉ…Àœ¤é¹Õ±°ì(€¥˜¡İÉ…À¥İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÑĞµÉ½Ü´µÍ•±•Ñ•œ¤¹™½É… ¡•°ôù•°¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µÑĞµÉ½Ü´µÍ•±•Ñ•œ¤¤ì(€¥˜¡É½Ü˜™É½Ü¹±…ÍÍ1¥ÍĞ¥É½Ü¹±…ÍÍ1¥ÍĞ¹…‘ µÑĞµÉ½Ü´µÍ•±•Ñ•œ¤ì(€½Á•¹5•ÑÉ½QÉ…¥¸¡±¥¹”±ÍÙŒ±±¬±¬À±¬Ä¤ì)ô)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½I½ÕÑ•Q¥µ•Ñ…‰±”¡ÍÑ¸±±¥¹”±ÍÙŒ±±¬±¬À±¬Ä¥ì(€}µÑÑI½ÕÑ•MÙŒõ9Õµ‰•È¡ÍÙŒ¤ì(€}µÑÑI½ÕÑ•-•äõí±¬é9Õµ‰•È¡±¬¤±¬Àé9Õµ‰•È¡¬À¤±¬Äé9Õµ‰•È¡¬Ä¥ôì(€½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±”¡ÍÑ¸±±¥¹”±™…±Í”¤ì)ô)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±”¡ÍÑ¸°±¥¹”°ÁÉ•Í•ÉÙ•¥±Ñ•È¥ì(€½¹ÍĞ½±õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑĞµİÉ…Àœ¤ì¥˜¡½±¥½±¹É•µ½Ù” ¤ì(€½¹ÍĞ‘•ÁÌõ}µ•ÑÉ½MÑ…Ñ¥½¹•ÁÌ¡ÍÑ¸¤¹™¥±Ñ•È¡¼ôù¼¹±¥¹”ôôõ±¥¹”¤ì(€¥˜ …‘•ÁÌ¹±•¹Ñ ¤É•ÑÕÉ¸ì(€¥˜ …ÁÉ•Í•ÉÙ•¥±Ñ•È¥}µÑÑáÁÉ•ÍÍ=¹±äõ™…±Í”ì(€½¹ÍĞ¡…ÍáÁÉ•ÍÌõ}µÑÑ!…ÍáÁÉ•ÍÌ¡‘•ÁÌ¤ì(€¥˜ …¡…ÍáÁÉ•ÍÌ¥}µÑÑáÁÉ•ÍÍ=¹±äõ™…±Í”ì(€}µÑÑMÑ…Ñ¥½¸õÍÑ¸í}µÑÑ1¥¹”õ±¥¹”ì(€½¹ÍĞ™±¬õ´ôù5…Ñ ¹™±½½È¡´¼ØÀ¤¬œèœ­MÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¤ì(€½¹ÍĞ‘¥ÉÌõíôì‘•ÁÌ¹™½É… ¡¼ôùì€¡‘¥ÉÍm¼¹¹•áÑtõ‘¥ÉÍm¼¹¹•áÑuññmt¤¹ÁÕÍ ¡¼¤ìô¤ì(€€¼¼ƒ®ÚªâÃ²^·²v ƒ²Š3¶FpƒªâÃ²’ €ËªÂpƒ®²ó®š°ƒ®Â§®¦Ó²ró®†pƒ®ÎG¶V¤ƒŠPƒªÂg²v ƒ²ªôƒªÎ¶×²v ƒ¶Vpƒ²^Ó²^@ƒ¶×¶V¤(€½¹ÍĞ‘¥É½Õ¹ÑÌõíôì=‰©•Ğ¹­•åÌ¡‘¥ÉÌ¤¹™½É… ¡¬ôù‘¥É½Õ¹ÑÍm­tõ‘¥ÉÍm­t¹±•¹Ñ ¤ì(€½¹ÍĞÉ½ÕÁÌõ}µ•ÑÉ½¥ÉÉ½ÕÁÌ¡±¥¹”°ÍÑ¸°‘¥É½Õ¹ÑÌ¤ì(€½¹ÍĞ½±½Èõ}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤ì(€½¹ÍĞ¹½İ4õ¹•Ü…Ñ” ¤¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹•Ü…Ñ” ¤¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ¹½İMÉØô  ¡¹½İ4´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì€€€¼¼ƒ²jÓ¶Z'²vğƒªâÃ²’ ƒ®Ú ÀĞèÀÀôÀ¤(€±•Ğ¹•áÑ¹¡½É4õ%¹™¥¹¥Ñäì(€€¼¼ƒ®Â§®¦Ğ£ªŞã®ä§®Îƒ².sªÂ²"pƒ¶:àƒ®ª§®†t€£²²ƒ®Îƒ®Ú®
Ğƒ²’G®ÎÔƒ²‚sªÆÀƒ¶nƒ®ÎG¶V¤¤€¬ƒ®Â§®¦Ó®Î€Ÿ®.“²v0ƒ²^Ó²Â œƒ¶Fs².p(€½¹ÍĞ½±…Ñ„õÉ½ÕÁÌ¹µ…À¡ÉÀôùì(€€€½¹ÍĞí•¹ÑÉ¥•Íôõ}µ•ÑÉ½É½ÕÁ¹ÑÉ¥•Ì¡‘¥ÉÌ°ÉÀ¤ì(€€€½¹ÍĞÉ½İÌõ}µÑÑ¥±Ñ•É¹ÑÉ¥•Ì¡•¹ÑÉ¥•Ì±}µÑÑáÁÉ•ÍÍ=¹±ä¤(€€€€€€¹µ…À¡¼ôø¡í´é5…Ñ ¹™±½½È¡¼¹Í•Œ¼ØÀ¤±½É¥œé¼¹½É¥œ±‘•ÍĞé¼¹‘•ÍĞ±±Ìé¼¹±Ì±ÍÙŒé¼¹ÍÙŒ±±¥¹”é¼¹±¥¹”±¬Àé¼¹¬À±¬Äé¼¹¬Åô¤¤(€€€€€€¹Í½ÉĞ ¡„±ˆ¤ôù„¹´µˆ¹´¤(€€€€€€¹µ…À¡¼ôø¡ì¸¸¹¼±±¬è¡¼¹´¬ÈĞÀ¤”ÄĞĞÁô¤¤ì(€€€½¹ÍĞ¹¤õÉ½İÌ¹™¥¹‘%¹‘•à¡ÈôùÈ¹´øõ¹½İMÉØ¤ì€€€¼¼ƒ²vĞƒ®Â§®¦Ó²v`ƒ®.“²v0ƒ²^Ó²Â (€€€¥˜¡¹¤øôÀ¥ìÉ½İÍm¹¥t¹¥Í9•áĞõÑÉÕ”ì¥˜¡É½İÍm¹¥t¹´ñ¹•áÑ¹¡½É4¥¹•áÑ¹¡½É4õÉ½İÍm¹¥t¹´ìô(€€€É•ÑÕÉ¸É½İÌì(€ô¤ì(€½¹ÍĞ…¹¡½ÈõíÍ•Ğé™…±Í•ôì(€€¼¼ƒ®NÇ²z—¶Vc®*Pƒ²jÓ¶Z'²vğ€Ÿ².pœƒ®ª§®†t(€½¹ÍĞ¡½ÕÉM•Ğõ¹•ÜM•Ğ ¤ì½±…Ñ„¹™½É… ¡É½İÌôùÉ½İÌ¹™½É… ¡Èôù¡½ÕÉM•Ğ¹…‘¡5…Ñ ¹™±½½È¡È¹´¼ØÀ¤¤¤¤ì(€½¹ÍĞ¡½ÕÉÌõl¸¸¹¡½ÕÉM•Ñt¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€½¹ÍĞ•Í0õàôùMÑÉ¥¹œ¡à¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€½¹ÍĞÉ½İ!Q50õÈôùì(€€€½¹ÍĞ½ô¡È¹½É¥œ˜™È¹½É¥œ„ôõÈ¹‘•ÍĞ¤ı€‘íÈ¹½É¥ôƒŠè€‘íÈ¹‘•ÍÑõ€é€‘íÈ¹‘•ÍÑõ€ì(€€€½¹ÍĞÕÈõÈ¹¥Í9•áĞüœµÑĞµÉ½Ü´µ¹•áĞœèœœì(€€€±•Ğ¥‘ÑÑÈôœœì¥˜¡È¹¥Í9•áĞ˜˜……¹¡½È¹Í•Ğ˜™È¹´ôôõ¹•áÑ¹¡½É4¥ì¥‘ÑÑÈôœ¥ô‰µÑĞµ¹•áĞˆœì…¹¡½È¹Í•ĞõÑÉÕ”ìô(€€€½¹ÍĞ±¬ô¡È¹ÍÙŒ„õ¹Õ±°¤ı€½¹±¥¬ô‰}½Á•¹5•ÑÉ½Q¥µ•Ñ…‰±•I½Ü¡Ñ¡¥Ì°œ‘í•Í0¡È¹±¥¹”¥ôœ°‘íÈ¹ÍÙô°‘íÈ¹±­ô°‘íÈ¹¬Áô°‘íÈ¹¬Åô¤‰€èœœì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑĞµÉ½Ü‘íÕÉô‘íÈ¹ÍÙŒ„õ¹Õ±°üœµÑĞµÉ½Ü´µÑ…Àœèœôˆ‘í¥‘ÑÑÉô‘íÈ¹ÍÙŒ„õ¹Õ±°ı€‘…Ñ„µÍÙŒôˆ‘íÈ¹ÍÙôˆ‘…Ñ„µ±¬ôˆ‘íÈ¹±­ôˆ‘…Ñ„µ¬Àôˆ‘íÈ¹¬Áôˆ‘…Ñ„µ¬Äôˆ‘íÈ¹¬Åô‰€èœô‘í±­ôøñÍÁ…¸±…ÍÌô‰µÑĞµĞˆø‘í™±¬¡È¹±¬¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰µÑĞµ½ˆø‘í½‘ôğ½ÍÁ…¸ø‘í}µ•ÑÉ½±ÍQ…œ¡È¹±Ì¥ôğ½‘¥Øù€ì(€ôì(€½¹ÍĞÉ¥õ¡½ÕÉÌ¹µ…À¡ ôùì(€€€½¹ÍĞ•±±Ìõ½±…Ñ„¹µ…À¡É½İÌôùì(€€€€€½¹ÍĞ¡ÈõÉ½İÌ¹™¥±Ñ•È¡Èôù5…Ñ ¹™±½½È¡È¹´¼ØÀ¤ôôõ ¤ì(€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑĞµ¡•±°ˆø‘í¡È¹µ…À¡É½İ!Q50¤¹©½¥¸ œœ¥ñğœñ‘¥Ø±…ÍÌô‰µÑĞµ•µÁÑäˆû
Üğ½‘¥Øøôğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰µÑĞµ¡É½Üˆø‘í•±±Íôğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞ¡•…‘ÌõÉ½ÕÁÌ¹µ…À¡ÉÀôù€ñ‘¥Ø±…ÍÌô‰µÑĞµ‘¥É¡•…ˆøñÍÁ…¸±…ÍÌô‰µÑĞµ…ÉÈˆûŠZàğ½ÍÁ…¸ø‘íÉÀ¹©½¥¸ œƒŠˆ€œ¥ôƒ®Â§®¦Ğğ½‘¥Øù€¤¹©½¥¸ œœ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥ôµÑĞµİÉ…Àœì(€İÉ…À¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰É…¥°µÑ¥­•Ğµ‰…­‘É½Àˆ½¹±¥¬ô‰±½Í•5•ÑÉ½Q¥µ•Ñ…‰±” ¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµÁ½ÁÕÀˆÉ½±”ô‰‘¥…±½œˆ…É¥„µ±…‰•°ôˆ‘í±¥¹•ô€‘íÍÑ¹ôƒ².sªÂ¶FpˆÍÑå±”ôˆ´µµŒè‘í½±½Éôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµ¡•…ˆøñÍÁ…¸øñˆÍÑå±”ô‰½±½Èè‘í½±½ÉôˆûÂ~j€‘í±¥¹•ôğ½ˆøƒ
Ü€‘íÍÑ¹ôğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ±½Í”ˆ½¹±¥¬ô‰±½Í•5•ÑÉ½Q¥µ•Ñ…‰±” ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€‘í¡…ÍáÁÉ•ÍÌı€ñ‘¥Ø±…ÍÌô‰µÑĞµ™¥±Ñ•É‰…Èˆø(€€€€€€€€ñ±…‰•°±…ÍÌô‰µÑĞµ™¥±Ñ•É¡•¬ˆøñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆ‘í}µÑÑáÁÉ•ÍÍ=¹±äüœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5•ÑÉ½Q¥µ•Ñ…‰±•áÁÉ•ÍÍ=¹±ä¡Ñ¡¥Ì¹¡•­•¤ˆøñÍÁ…¸ûªâ'¶Z'®0ƒ®ÎÓªâÀğ½ÍÁ…¸øğ½±…‰•°ø(€€€€€€ğ½‘¥Øù€èœô(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµÍÉ½±°ˆÍÑå±”ôˆ´µ½±Ìè‘íÉ½ÕÁÌ¹±•¹Ñ¡ôˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµ¡•…‘É½Üˆø‘í¡•…‘Íôğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµÉ¥ˆø‘íÉ¥‘ôğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑĞµ™½½Ğˆû²vãªÊ3²zƒ².sªÂ¶FpƒªâÃ²’ ƒ
Üƒ².“²‚pƒ²‚W²Â£².sªÂƒ
Üƒ²Ús®Âs² ƒŠèƒ¶Z'²ƒ² ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€€¼¼ƒ®.“²v0ƒ²^Ó²Â ƒ²r²æc®†pƒ²zC®>dƒ²*“¶³®†£²^²ró®¦Ğƒ® ƒ²r¤(€½¹ÍĞÉ½ÕÑ•I½Üõ}µÑÑI½ÕÑ•MÙŒôõ¹Õ±°ı¹Õ±°éİÉ…À¹ÅÕ•ÉåM•±•Ñ½È¡€¹µÑĞµÉ½İm‘…Ñ„µÍÙŒôˆ‘í}µÑÑI½ÕÑ•MÙô‰um‘…Ñ„µ±¬ôˆ‘í}µÑÑI½ÕÑ•-•äü¹±­ô‰um‘…Ñ„µ¬Àôˆ‘í}µÑÑI½ÕÑ•-•äü¹¬Áô‰um‘…Ñ„µ¬Äôˆ‘í}µÑÑI½ÕÑ•-•äü¹¬Åô‰u€¤ì(€¥˜¡É½ÕÑ•I½Ü¥íİÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÑĞµÉ½Ü´µ¹•áĞœ¤¹™½É… ¡É½ÜôùÉ½Ü¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µÑĞµÉ½Ü´µ¹•áĞœ¤¤íÉ½ÕÑ•I½Ü¹±…ÍÍ1¥ÍĞ¹…‘ µÑĞµÉ½Ü´µÉ½ÕÑ”œ¤íÉ½ÕÑ•I½Ü¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è•¹Ñ•Èô¤íô(€•±Í”í½¹ÍĞ¹àõİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œµÑĞµ¹•áĞœ¤±ÍŒõİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹µÑĞµÍÉ½±°œ¤í¥˜¡¹à¥¹à¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è•¹Ñ•Èô¤í•±Í”¥˜¡ÍŒ¥ÍŒ¹ÍÉ½±±Q½ÀôÀíô)ô)™Õ¹Ñ¥½¸±½Í•5•ÑÉ½Q¥µ•Ñ…‰±” ¥ì½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑĞµİÉ…Àœ¤ì¥˜¡•°¥•°¹É•µ½Ù” ¤ì½¹ÍĞĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑ¸µİÉ…Àœ¤ì¥˜¡Ğ¥Ğ¹É•µ½Ù” ¤ì}µÑÑMÑ…Ñ¥½¸õ¹Õ±°í}µÑÑ1¥¹”õ¹Õ±°í}µÑÑáÁÉ•ÍÍ=¹±äõ™…±Í”í}µÑÑI½ÕÑ•MÙŒõ¹Õ±°í}µÑÑI½ÕÑ•-•äõ¹Õ±°ì‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µ•ÑÉ¼µÁ…¥É•œ¤ìô(¼¼ƒ²fW®ÎÔƒ¶:ã²Ç²vƒ¶j3²Â£²‚@¡ùù
ß²^Ã²7²’G®ÎÔ¤ƒªâÃ²’ ƒ®Â§¶Z—®Î±•œƒªÖ³ªÂ²ró®†pƒ®Ú¶V€)™Õ¹Ñ¥½¸}µ•ÑÉ½1•I…¹•Ì¡¥‘áM•Ä¥ì(€½¹ÍĞÉ…¹•Ìõmtì±•ĞÍÑ…ÉĞôÀì½¹ÍĞ¸õ¥‘áM•Ä¹±•¹Ñ ì(€™½È¡±•Ğ¨ôÄí¨ñ¸´Äí¨¬¬¥ì(€€€¥˜¡¥‘áM•Åm¨´Åtôôõ¥‘áM•Åm¨¬Åt¥ìÉ…¹•Ì¹ÁÕÍ ¡mÍÑ…ÉĞ±©t¤ìÍÑ…ÉĞõ¨ìô€€€€€€€€¼¼ùùƒ¶j3²Â£²‚@€ôƒ².ƒ²Š²‚@(€€€•±Í”¥˜¡¥‘áM•Åm©tôôõ¥‘áM•Åm¨¬Åt¥ìÉ…¹•Ì¹ÁÕÍ ¡mÍÑ…ÉĞ±©t¤ìÍÑ…ÉĞõ¨¬Äìô€€€€¼¼ƒ²^Ã²7²’G®ÎÔ£¶j3²Â ƒ²‚W²Â ¤(€ô(€É…¹•Ì¹ÁÕÍ ¡mÍÑ…ÉĞ±¸´Åt¤ì(€É•ÑÕÉ¸É…¹•Ì¹™¥±Ñ•È ¡mÌ±•t¤ôù”ùÌ¤ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½1•I…¹•½É±¥¬¡¥‘áM•Ä±‘P±¡±±¬±±•MÑ…ÉĞ±±•¹¥ì(€½¹ÍĞÉ…¹•Ìõ}µ•ÑÉ½1•I…¹•Ì¡¥‘áM•Ä¤ì(€¥˜¡9Õµ‰•È¹¥Í%¹Ñ••È¡±•MÑ…ÉĞ¤˜™9Õµ‰•È¹¥Í%¹Ñ••È¡±•¹¤¥ì(€€€€¼¼ƒ²‚²ÊĞƒ².sªÂ¶Fpƒ¶Z'²v ƒ².“²‚pƒ²Ús®Âs²^·ŠK²Š²Â§²^´±•Ÿ®–ğƒ²vÓ®¾àƒªÎ²
Ã¶VĞƒ²‚®.³¶Vs®.¸(€€€€¼¼ƒ¶j3²Â£
ß²²€ƒªÖ³²†Ã®–ğƒ®.“².pƒ²ÚS²‚W¶Vc®¦Ğƒ²²‚ƒ®Âc®2 ƒ®Â§¶Z”ƒ¶:ã²Ç²ró®†pƒ®Bc®>3²VªÂ ƒ²"`ƒ²z#²ró®¾®†p(€€€€¼¼ƒ²rƒ¶j£¶Vpƒ®ª².pƒ®ÊS²r®*Pƒ®ª£®N€ƒ®ã²ƒ²^C²pƒ²ÚS²‚W®ÎÓ®.ƒ²jÃ²ƒ¶Vs®.¸(€€€¥˜¡±•MÑ…ÉĞøôÀ˜™±•¹ñ¥‘áM•Ä¹±•¹Ñ ˜™±•¹ù±•MÑ…ÉĞ¥É•ÑÕÉ¸m±•MÑ…ÉĞ±±•¹‘tì(€ô(€½¹ÍĞ¹½É´õ´ôø  ¡´”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ¤ì(€±•Ğ¤ôÀì(€™½È¡±•Ğ¤ôÀí¤ñ‘P¹±•¹Ñ í¤¬¬¥í¥˜¡¹½É´¡‘Qm¥t¤ôôõ¡±±¬¥í¤õ¤í‰É•…¬íõô(€€¼¼ƒ¶j3²Â£²^·²v ƒ²Vxƒ²jÓ¶Z'²v`ƒ²Š²Â§²‚C²vÓ²z@ƒ®.“²v0ƒ²jÓ¶Z'²v`ƒ².s®Âs²‚C²vÓ®.¸(€€¼¼ƒ²‚²ÊĞƒ².sªÂ¶Fs®*Pƒ²Ús®Âpƒ¶Z'²vƒ²^³®*Pƒ¶fS®¦Ó²vÓ®¾®†pƒªÊ÷ªÎ²^C²s®*Pƒ®.“²v0±•Ÿ®–ğƒ²jÃ²ƒ¶Vs®.¸(€É•ÑÕÉ¸É…¹•Ì¹™¥¹ ¡mÍt¤ôùÌôôõ¤¥ññÉ…¹•Ì¹™¥¹ ¡mÌ±•t¤ôù¤øõÌ˜™¤ğõ”¥ññlÀ±¥‘áM•Ä¹±•¹Ñ ´Åtì)ô(¼¼ƒÂ~jƒªÂs®Îƒ¶:ã²Äƒ²^·®Îƒ¶²z®vó²vàƒŠPƒªâÃ²Â ƒ¶G²*äƒ²^³²‚WªÎğƒ®>g²vó¶Vpƒ®RS²zC²và°ƒ²fW®Î×²v ƒ².ƒ²Š²‚@ƒªâÃ²’ ƒ®Â§¶Z”±•Ÿ®0ƒ¶Fs².p)™Õ¹Ñ¥½¸½Á•¹5•ÑÉ½QÉ…¥¸¡±¥¹”°ÍÙ%‘à°¡±±¬°±•MÑ…ÉĞ°±•¹¥ì(€½¹ÍĞ½±õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑ¸µİÉ…Àœ¤ì¥˜¡½±¥½±¹É•µ½Ù” ¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µ•ÑÉ¼µÁ…¥É•œ°µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ…¥É•œ¤ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•tì¥˜ …•¹Ğ¥É•ÑÕÉ¸ì(€½¹ÍĞ˜õ•¹Ğ¹ÑmÍÙ%‘átì¥˜ …˜¥É•ÑÕÉ¸ì(€½¹ÍĞ¹…µ•Ìõ•¹Ğ¹Ì°±Ìõ•¹Ğ¹Œı•¹Ğ¹mÍÙ%‘átèÀ°½±½Èõ}µ•ÑÉ½1¥¹•½±½È¡±¥¹”¤ì(€½¹ÍĞ¸õ˜¹±•¹Ñ ¼Ì°¹½É´õ´ôø  ¡´”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ¤ì(€½¹ÍĞ™µĞõ´ôù€‘í5…Ñ ¹™±½½È¡¹½É´¡´¤¼ØÀ¥ôè‘íMÑÉ¥¹œ¡¹½É´¡´¤”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€½¹ÍĞ¥‘áM•Äõmt°…Põmt°‘Põmtì™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì¥‘áM•Ä¹ÁÕÍ ¡™lÌ©¤¬Ét¤ì…P¹ÁÕÍ ¡™lÌ©¥t¤ì‘P¹ÁÕÍ ¡™lÌ©¤¬Åt¤ìô(€€¼¼ƒ¶Ó®š´ƒ²²‚@ƒŠHƒªŞàƒ²²‚C²vĞƒ²7¶Vpƒ®Â§¶Z”±•œ¸ƒ¶j3²Â£²^´ƒ²Ús®Âs²v ƒ²²‚ƒ²Š²Â§¶:ã²vĞƒ²V®.0ƒ®.“²v0ƒ²jÓ¶Z'²vƒ²^÷®.#®.¸(€½¹ÍĞm±Ì±±•tõ}µ•ÑÉ½1•I…¹•½É±¥¬¡¥‘áM•Ä±‘P±¡±±¬±±•MÑ…ÉĞ±±•¹¤ì(€€¼¼ƒ¶×ªÎó²^´÷²Ús®Âp¡¤ƒ¶Fs².p°±•œƒ²Š²Â§²^´÷®>²Â¤¡„¤ƒ¶Fs².p£®Âc®2®Â§¶Z”ƒ¶j3²Â ƒ²Ús®Âs².sªÂƒ²b“ªâÀƒ®Â§² ¤(€½¹ÍĞÍ•Äõmtì™½È¡±•Ğ¤õ±Ìí¤ğõ±”í¤¬¬¥ì½¹ÍĞÍĞõíÌé¹…µ•Ím¥‘áM•Åm¥ut°„é…Qm¥t°è¡¤ôôõ±”ı…Qm¥té‘Qm¥t¤°´è¡¤ôôõ±”ı…Qm¥té‘Qm¥t¥ôì¥˜ …Í•Ä¹±•¹Ñ¡ññÍ•ÅmÍ•Ä¹±•¹Ñ ´Åt¹Ì„ôõÍĞ¹Ì¤Í•Ä¹ÁÕÍ ¡ÍĞ¤ì•±Í”Í•ÅmÍ•Ä¹±•¹Ñ ´ÅtõÍĞìô(€½¹ÍĞ½É¥œõÍ•ÅlÁt¹Ì°‘•ÍĞõÍ•ÅmÍ•Ä¹±•¹Ñ ´Åt¹Ìì(€€¼¼ƒ².“².sªÂƒ²¶Z$ƒ²r²æ`èƒªâÃ²Â ƒ¶G²*äƒ²^³²‚WªÎğƒ®>g²vğƒŠPƒ²‚W²Â ƒ²’G²vÓ®¦ĞƒªŞàƒ²^´÷¶b²z°°ƒ²vÓ®>dƒ²’G²vÓ®¦Ğƒ®.“²v3²^´÷®.“²v0£ªÂW²†À¤(€½¹ÍĞÍÉØõàôø  ¡à´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€½¹ÍĞ™±…ĞõmtìÍ•Ä¹™½É… ¡ÍĞôùì™±…Ğ¹ÁÕÍ ¡ÍÉØ¡ÍĞ¹„¤°ÍÉØ¡ÍĞ¹¤¤ìô¤ì€€€¼¼ƒ®>²Â§
ß²Ús®ÂpƒªÖC®2 (€±•Ğ½™˜ôÀì½¹ÍĞµ½¹¼õmtì™½È¡±•Ğ¤ôÀí¤ñ™±…Ğ¹±•¹Ñ í¤¬¬¥ì±•ĞØõ™±…Ñm¥t­½™˜ì¥˜¡¤øÀ˜™Øñµ½¹½m¤´Åt¥ì½™˜¬ôÄĞĞÀìØ¬ôÄĞĞÀìôµ½¹¼¹ÁÕÍ ¡Ø¤ìô(€½¹ÍĞ…‰ÍõÍ•Ä¹µ…À ¡|±¤¤ôùµ½¹½lÈ©¥t¤°…‰ÍõÍ•Ä¹µ…À ¡|±¤¤ôùµ½¹½lÈ©¤¬Åt¤ì(€½¹ÍĞ¹½İŒõ¹•Ü…Ñ” ¤ì±•Ğ¹½İ‰ÌõÍÉØ¡¹½İŒ¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½İŒ¹•Ñ5¥¹ÕÑ•Ì ¤¤ì(€İ¡¥±”¡¹½İ‰Ìñ…‰ÍlÁt´ÜÈÀ¥¹½İ‰Ì¬ôÄĞĞÀìİ¡¥±”¡¹½İ‰Ìù…‰Ím…‰Í¹±•¹Ñ ´Åt¬ÜÈÀ¥¹½İ‰Ì´ôÄĞĞÀì(€±•ĞÁ¡…Í”°‘İ•±±%‘àô´Ä°¹•áÑ%‘àô´Äì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼‘İ•±±%‘àèƒ²‚W²Â ƒ²’Dƒ²^´°¹•áÑ%‘àèƒ²‚GªŞğƒ²’Dƒ®.“²v3²^´(€¥˜¡¹½İ‰Ìñ…‰ÍlÁt¤Á¡…Í”ô‰•™½É”œì(€•±Í”¥˜¡¹½İ‰Ìøõ…‰Ím…‰Í¹±•¹Ñ ´Åt¤Á¡…Í”ô‘½¹”œì(€•±Í”ìÁ¡…Í”ôÉÕ¹¹¥¹œœì(€€€™½È¡±•Ğ¤ôÀí¤ñÍ•Ä¹±•¹Ñ í¤¬¬¥ì¥˜¡¹½İ‰Ìøõ…‰Ím¥t˜™¹½İ‰Ìğõ…‰Ím¥t¥ì‘İ•±±%‘àõ¤ì‰É•…¬ìôô(€€€¥˜¡‘İ•±±%‘àğÀ¥ì™½È¡±•Ğ¤ôÀí¤ñÍ•Ä¹±•¹Ñ í¤¬¬¥ì¥˜¡…‰Ím¥tù¹½İ‰Ì¥ì¹•áÑ%‘àõ¤ì‰É•…¬ìôôô(€ô(€½¹ÍĞÉ½İÌõÍ•Ä¹µ…À ¡ÍĞ±¤¤ôùì(€€€½¹ÍĞ¥Í=É¥¥¸õ¤ôôôÀ°¥ÍQ•É´õ¤ôôõÍ•Ä¹±•¹Ñ ´Äì(€€€½¹ÍĞÁ…ÍÍ•ô¡Á¡…Í”ôôô‘½¹”œ¥ñğ¡Á¡…Í”ôôôÉÕ¹¹¥¹œœ˜™¹½İ‰Ìù…‰Ím¥t¬Å”´Ø¤ì(€€€½¹ÍĞ¥ÍÕÈõÁ¡…Í”ôôôÉÕ¹¹¥¹œœ˜™¤ôôõ‘İ•±±%‘àì(€€€½¹ÍĞ¥Í9•áĞõÁ¡…Í”ôôôÉÕ¹¹¥¹œœ˜™¤ôôõ¹•áÑ%‘à˜™‘İ•±±%‘àğÀì(€€€½¹ÍĞ±Íõl©ÈµÍÑ½Àtì¥˜¡Á…ÍÍ•˜˜…¥ÍÕÈ¥±Í¹ÁÕÍ  ‘½¹”œ¤ì¥˜¡¥ÍÕÈ¥±Í¹ÁÕÍ  ÕÈœ¤ì¥˜¡¥Í9•áĞ¥±Í¹ÁÕÍ  ¹•áĞœ¤ì(€€€½¹ÍĞ¹…µ•±Ìõ¥Í=É¥¥¸ü©Èµ½É¥¥¸œé¥ÍQ•É´ü©ÈµÑ•É´œèœœì(€€€½¹ÍĞ‰…‘”õ¥ÍÕÈüœñÍÁ…¸±…ÍÌô‰©Èµ‰…‘”ÕÈˆû¶b²z°ğ½ÍÁ…¸øœé¥Í9•áĞüœñÍÁ…¸±…ÍÌô‰©Èµ‰…‘”¹•áĞˆû®.“²v0ğ½ÍÁ…¸øœèœœì(€€€½¹ÍĞÑ¥µ•QáĞõ¥Í=É¥¥¸ı€‘í™µĞ¡ÍĞ¹´¥ôƒ²Ús®Âq€é¥ÍQ•É´ı€‘í™µĞ¡ÍĞ¹´¥ôƒ®>²Â¥€é™µĞ¡ÍĞ¹´¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌôˆ‘í±Í¹©½¥¸ œ€œ¥ôˆÍÑå±”ôˆ´µŒè‘í½±½Éôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ‘½Ğˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ¥¹™¼ˆøñÍÁ…¸±…ÍÌô‰©Èµ¹…µ”€‘í¹…µ•±Íôˆø‘í}½ÁÍÍŒ¡ÍĞ¹Ì¥ô‘í‰…‘•ôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÑ¥µ”ˆø‘íÑ¥µ•QáÑôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞÍÑ…ÑÕÍQáĞõÁ¡…Í”ôôô‰•™½É”œüŸ²jÓ¶Z$ƒ²‚œéÁ¡…Í”ôôô‘½¹”œüŸ²jÓ¶Z$ƒ²Š®0œèŸ²jÓ¶Z$ƒ²’Dœì(€½¹ÍĞ•áÀõ±ÌôôôÈüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀµÑˆµ•áÀ´µĞˆû¶*çªâ$ğ½ÍÁ…¸øœé±ÌôôôÄüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀˆûªâ'¶Z$ğ½ÍÁ…¸øœèœœì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôµÑ¸µİÉ…Àœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰É…¥°µÑ¥­•Ğµ‰…­‘É½Àˆ½¹±¥¬ô‰±½Í•5•ÑÉ½QÉ…¥¸ ¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µÑ¸µÁ½ÁÕÀˆÉ½±”ô‰‘¥…±½œˆ…É¥„µ±…‰•°ôˆ‘í}½ÁÍÍŒ¡±¥¹”¥ô€‘í}½ÁÍÍŒ¡½É¥œ¥÷ŠH‘í}½ÁÍÍŒ¡‘•ÍĞ¥ôƒ².sªÂ¶FpˆÍÑå±”ôˆ´µµŒè‘í½±½Éôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑ¸µ¡•…ˆøñÍÁ…¸±…ÍÌô‰µÑ¸µ±¡¥ÀˆÍÑå±”ô‰‰…­É½Õ¹è‘í½±½Éôˆø‘í}½ÁÍÍŒ¡±¥¹”¥ôğ½ÍÁ…¸ø(€€€€€€€€ñˆø‘í}½ÁÍÍŒ¡½É¥œ¥ôğ½ˆøñÍÁ…¸±…ÍÌô‰µÑ¸µ…ÉÉ½ÜˆûŠZÛŠZÛŠZØğ½ÍÁ…¸øñˆø‘í}½ÁÍÍŒ¡‘•ÍĞ¥ôğ½ˆø‘í•áÁô(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Í¤µ‰½…Éµ±½Í”ˆ½¹±¥¬ô‰±½Í•5•ÑÉ½QÉ…¥¸ ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÑ¥µ•±¥¹”µÑ¸µÑ°ˆø‘íÉ½İÍôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÑ¸µ™½½Ğˆû²vãªÊ3²zƒ².sªÂ¶FpƒªâÃ²’ ƒ
Ü€‘íÍ•Ä¹±•¹Ñ¡÷ªÂpƒ²^´ƒ
Ü€ñˆÍÑå±”ô‰½±½Èè‘í½±½Éôˆø‘íÍÑ…ÑÕÍQáÑôğ½ˆøğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€€¼¼ƒ²^´ƒ².sªÂ¶Fp¡µÑĞ§²^C²pƒ²^Ó®‚ã²ró®¦Ğƒ®
c®z¶z ¿²b“®Ê®‚#²vĞƒ¶:c²ZĞƒ®‚#²vÓ²V²nƒ²‚²j¤(€¥˜¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑĞµİÉ…Àœ¤¤‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ µ•ÑÉ¼µÁ…¥É•œ¤ì(€•±Í”¥˜¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µ•ÑÉ¼µ‘¥ÍÁ±…äµİÉ…Àœ¤¤‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ…¥É•œ¤ì(€½¹ÍĞÕÈõİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÑ½À¹ÕÈœ¥ññİÉ…À¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÑ½À¹¹•áĞœ¤ì¥˜¡ÕÈ¥ÕÈ¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è•¹Ñ•Èô¤ì)ô)™Õ¹Ñ¥½¸±½Í•5•ÑÉ½QÉ…¥¸ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑ¸µİÉ…Àœ¤ì¥˜¡•°¥•°¹É•µ½Ù” ¤ì(€½¹ÍĞÑ¥µ•Ñ…‰±”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÑĞµİÉ…Àœ¤ì(€¥˜¡Ñ¥µ•Ñ…‰±”¥Ñ¥µ•Ñ…‰±”¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÑĞµÉ½Ü´µÍ•±•Ñ•œ¤¹™½É… ¡É½ÜôùÉ½Ü¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µÑĞµÉ½Ü´µÍ•±•Ñ•œ¤¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µ•ÑÉ¼µÁ…¥É•œ°µ•ÑÉ¼µ‘¥ÍÁ±…äµÁ…¥É•œ¤ì)ô((¼¼ƒÂ~n“¾â<ƒ®ÂÃ²ƒ®>£ªÂ²vĞ¤èƒ®Î×²€ƒ¶*ã®zd€¬ƒ²*çªÂW²z”€¬ƒ®Â§¶Z”ƒ¶fS²
Ó¶Fpƒ²^Ó²Â ¸ƒ²¶Z$£²Š²‚CŠKªâÃ²‚@¤÷²Š3²â‡
ßŠZÈ°ƒ¶Vc¶Z$£ªâÃ²‚CŠK²Š²‚@¤÷²jÃ²â‡
ßŠZğ)±•Ğ}µ±9…µ•M•Ğõ¹Õ±°ì)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•9…µ•M•Ğ ¥ì¥˜¡}µ±9…µ•M•Ğ¥É•ÑÕÉ¸}µ±9…µ•M•Ğì}µ±9…µ•M•Ğõ¹•ÜM•Ğ ¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œı5QI=}1%9Lémt¤¹µ…À¡°ôù°¹¹…µ”¤¤ìÉ•ÑÕÉ¸}µ±9…µ•M•Ğìô(¼¼ƒ²^·²v`ƒ®ª£®N€ƒ²*çªÂW²z”ƒ²‚W®ÎĞ€¡A1Q=I5}¤ƒŠPƒ²vĞƒ®ã²€¿¶ ƒ®ã²€¿ªâÃ²Â ƒªÖ³®Ú€¬ƒ®2¶Fs²$(¼¼ƒ²^´ƒ¶f#²v`ƒ²‚²ÊĞƒ®ã²€ƒ²vÓ®šƒ²G¶V¤£²*çªÂW²z—ŠK®ã²€ƒ²nC®²à¤ƒŠPƒ¶>'¶Z'²Äƒ¶2C²‚W²j¤)™Õ¹Ñ¥½¸}ÍÑ¹1¥¹•9…µ•Ì¡Ì¥ì(€¥˜¡Ìôõ¹Õ±±ññÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸¹•ÜM•Ğ ¤ì(€½¹ÍĞ¬õA1Q=I5}	mÍtıÌè¡A1Q=I5}	mÌ¬Ÿ²^´tıÌ¬Ÿ²^´œé¹Õ±°¤ì¥˜ …¬¥É•ÑÕÉ¸¹•ÜM•Ğ ¤ì(€½¹ÍĞÍ•Ğõ¹•ÜM•Ğ ¤ì½¹ÍĞÁ°õA1Q=I5}	m­tì(€™½È¡½¹ÍĞÁ¸½˜=‰©•Ğ¹­•åÌ¡Á°¤¤¡Á±mÁ¹t¹±ññmt¤¹™½É… ¡àôùÍ•Ğ¹…‘¡MÑÉ¥¹œ¡à¤¤¤ì(€É•ÑÕÉ¸Í•Ğì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½1¥¹•Y…É¥…¹Ğ¡É…Ü±‰…Í”¥ì(€½¹ÍĞÌõMÑÉ¥¹œ¡É…İñğœœ¤¹ÑÉ¥´ ¤ì(€¥˜¡Ìôôõ‰…Í”¥É•ÑÕÉ¸€œœì(€¥˜¡Ì¹ÍÑ…ÉÑÍ]¥Ñ ¡‰…Í”¬œ¼œ¤¥É•ÑÕÉ¸Ì¹Í±¥”¡‰…Í”¹±•¹Ñ ¬Ä¤¹ÑÉ¥´ ¤ì(€¥˜¡Ì¹ÍÑ…ÉÑÍ]¥Ñ ¡‰…Í”¬œ€ œ¤¥É•ÑÕÉ¸Ì¹Í±¥”¡‰…Í”¹±•¹Ñ ¤¹É•Á±…” ½yqÌ©p¡ñp¥qÌ¨½œ°œœ¤¹ÑÉ¥´ ¤ì(€É•ÑÕÉ¸¹Õ±°ì)ô(¼¼ƒ²^´ƒ²*çªÂW²z”ƒ®Ú®–`¸ÁÉ•Ø½¹•áĞƒ²ó²ZÓ²®¦Ğƒ¶ ƒ®ã²ƒ²v €Ÿ¶>'¶Z$£²‚
ß®.“²v3²^´ƒ²^Ã²4¤Ÿ®0ƒ®
£ªâÃªÎ€°ƒ¶Vs²ª÷®0÷².s²zG²‚@°ƒ²^²ró®¦Ğƒ²‚s²fà¸)™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ…Ñ¥½¹A±…Ñ™½ÉµÌ¡ÍÑ¸°ÕÉ	…Í”°ÁÉ•ÙMÑ¸°¹•áÑMÑ¸¥ì(€¥˜¡ÑåÁ•½˜A1Q=I5}ôôôÕ¹‘•™¥¹•œ¥É•ÑÕÉ¸mtì(€½¹ÍĞ­•äõA1Q=I5}	mÍÑ¹tıÍÑ¸è¡A1Q=I5}	mÍÑ¸¬Ÿ²^´tıÍÑ¸¬Ÿ²^´œé¹Õ±°¤ì¥˜ …­•ä¥É•ÑÕÉ¸mtì(€½¹ÍĞÁ±…ÑÌõA1Q=I5}	m­•åt°µÍ•Ğõ}µ•ÑÉ½1¥¹•9…µ•M•Ğ ¤°½ÕĞõmtì(€½¹ÍĞÍ¥‘•Ìõmtì¥˜¡ÁÉ•ÙMÑ¸„õ¹Õ±°¥Í¥‘•Ì¹ÁÕÍ ¡}ÍÑ¹1¥¹•9…µ•Ì¡ÁÉ•ÙMÑ¸¤¤ì¥˜¡¹•áÑMÑ¸„õ¹Õ±°¥Í¥‘•Ì¹ÁÕÍ ¡}ÍÑ¹1¥¹•9…µ•Ì¡¹•áÑMÑ¸¤¤ì(€™½È¡½¹ÍĞÁ¸½˜=‰©•Ğ¹­•åÌ¡Á±…ÑÌ¤¥ì(€€€½¹ÍĞ¹Õ´õ9Õµ‰•È¡Á¸¤ì¥˜¡¥Í9…8¡¹Õ´¤¥½¹Ñ¥¹Õ”ì(€€€½¹ÍĞ±¥¹•Ìô¡Á±…ÑÍmÁ¹t¹±ññmt¤¹µ…À¡MÑÉ¥¹œ¤ì(€€€½¹ÍĞ‰…Í•Ìõl¸¸¹¹•ÜM•Ğ¡±¥¹•Ì¹µ…À¡àôùà¹ÍÁ±¥Ğ œ¼œ¥lÁt¹ÍÁ±¥Ğ œ€ œ¥lÁt¹ÑÉ¥´ ¤¤¥tì(€€€½¹ÍĞµ•ÑÉ½	…Í•Ìõ‰…Í•Ì¹™¥±Ñ•È¡ˆôùµÍ•Ğ¹¡…Ì¡ˆ¤¤ì(€€€½¹ÍĞ¥ÍÕÈõµ•ÑÉ½	…Í•Ì¹¥¹±Õ‘•Ì¡ÕÉ	…Í”¤ì(€€€€¼¼ƒ²²€ƒ²‚²j¤ƒ²*çªÂW²z”£²vĞƒ®ã²€ƒªÒ®‚ ƒ²vÓ®š²vĞƒ®ª£®F@€Ÿ²²€œ¤ƒŠHƒ®Îã²ƒ²^C²pƒ®æóªÎ€ƒ²²€ƒ²^Ó®†p(€€€½¹ÍĞÕÉ1¥¹•Ìõ±¥¹•Ì¹™¥±Ñ•È¡°ôù°¹ÍÁ±¥Ğ œ¼œ¥lÁt¹ÍÁ±¥Ğ œ€ œ¥lÁt¹ÑÉ¥´ ¤ôôõÕÉ	…Í”¤ì(€€€½¹ÍĞÙ…É¥…¹ÑÌõl¸¸¹¹•ÜM•Ğ¡ÕÉ1¥¹•Ì¹µ…À¡°ôù}µ•ÑÉ½1¥¹•Y…É¥…¹Ğ¡°±ÕÉ	…Í”¤¤¹™¥±Ñ•È¡ØôùØ„õ¹Õ±°˜™Ø„ôôœœ¤¥tì(€€€€¼¼ƒªâÃ®Îàƒ®ã²ƒ®ª²vĞƒ²^®*P€¼Ç
Ü¼Ë
ßŠ^/Š^/²²€ƒ²‚²j¤ƒ¶f#²v ƒ®Îã²€ƒ¶f#ªÎğƒ®Î®>ƒ²ƒ®†sªÖÃ²ró®†pƒ²rƒ²¶Vs®.¸(€€€½¹ÍĞ‰É…¹¡=¹±äõ¥ÍÕÈ˜™ÕÉ1¥¹•Ì¹±•¹Ñ øÀ˜˜…ÕÉ1¥¹•Ì¹Í½µ”¡°ôù}µ•ÑÉ½1¥¹•Y…É¥…¹Ğ¡°±ÕÉ	…Í”¤ôôôœœ¤ì(€€€€¼¼ƒ¶>'¶Z'²Äèƒ¶ ƒ®ã²€ƒ²*çªÂW²z—²v ƒ²‚¿®.“²v3²^·ªÎğƒ²^Ã²7®B€ƒ®V3®0ƒ®ÂÃ²ƒ²^@ƒ¶>³¶V (€€€±•ĞÑ¡É½Õ ôÈì(€€€¥˜ …¥ÍÕÈ˜™Í¥‘•Ì¹±•¹Ñ ¥ì(€€€€€±•Ğ…ĞôÀìÍ¥‘•Ì¹™½É… ¡Íôùì¥˜¡±¥¹•Ì¹Í½µ”¡°ôùÍ¹¡…Ì¡°¤¤¥…Ğ¬¬ìô¤ì(€€€€€Ñ¡É½Õ ô¡…ĞôôôÀ¤üÀè¡…ĞñÍ¥‘•Ì¹±•¹Ñ üÄèÈ¤ì(€€€€€¥˜¡Ñ¡É½Õ ôôôÀ¥½¹Ñ¥¹Õ”ì€¼¼ƒ¶>'¶Z$ƒ²V®.`ƒŠHƒ²‚s²fà(€€€ô(€€€±•Ğ½±½È±­¥¹ì(€€€¥˜¡¥ÍÕÈ¥ì½±½Èõ}µ•ÑÉ½1¥¹•½±½È¡ÕÉ	…Í”¤ì­¥¹ôÕÈœìô(€€€•±Í”¥˜¡µ•ÑÉ½	…Í•Ì¹±•¹Ñ ¥ì½±½Èõ}µ•ÑÉ½1¥¹•½±½È¡µ•ÑÉ½	…Í•ÍlÁt¤ì­¥¹ôµ•ÑÉ¼œìô(€€€•±Í”ì½±½ÈôœŒáˆäĞå”œì­¥¹ôÑÉ…¥¸œìô(€€€½ÕĞ¹ÁÕÍ ¡íÁ¸é¹Õ´±¥ÍÕÈ±½±½È±­¥¹±±…‰•°è¡µ•ÑÉ½	…Í•ÍlÁuññ±¥¹•ÍlÁuñğœœ¤±Í¡…É•é¥ÍÕÈ˜™µ•ÑÉ½	…Í•Ì¹±•¹Ñ øÄ±©Õ¹Ñ¥½¸éÑ¡É½Õ ôôôÄ±Ñ¡É½Õ ±‰É…¹¡=¹±ä±Ù…É¥…¹ÑÌ±±¥¹•Íô¤ì(€ô(€É•ÑÕÉ¸½ÕĞ¹Í½ÉĞ ¡„±ˆ¤ôù„¹Á¸µˆ¹Á¸¤ì)ô(¼¼ƒ®ÂÃ²ƒ®>ƒ²êS®Ê²*!Q50ƒ²w²Ä€£¶´ƒ²vã®vó²vàƒªÎ×²j¤¤¸ƒ®Âc¶f`èí¹Ğ°¡Ñµ±ô(¼¼ƒ²*çªÂW²z—²v ƒ®Ê#¶bã²"pƒªÎƒ²‚Tƒ²*³®†¼ Ä€È€Ì€ÓŠ˜¤°ƒ²vĞƒ®ã²€ƒ®Î×²€ƒ¶*ã®zg²v ƒ²zCªâÀƒ²*çªÂW²z”ƒ²r²æc®†pƒ¶rc²ZÓªÂ@£²r®æd¤¸(¼¼ƒŠRŠR ƒ®>².s²Êƒ®>ƒ®ÂÃ²€ƒ®‚3®6S®~°ØÈèƒ²’G².³²ÚTƒªÎƒ²‚Tƒ²²€ƒ®Î×²€€¬ƒ²‚²Æ®>ƒ²*çªÂW²z”€¬¥é¥•Èƒ®ÚªâÀ¿¶V§®–`¿¶j3²Â €¬ƒ²²€ƒ²f²‚®ÂÃ²€ƒŠRŠR )½¹ÍĞM`õí95\èÔĞ±Q=@èÌÀ±I=\èĞØ±èÈÀ±	\èÄÈ±	 èÈØ±A<èà±MèÄáôì)™Õ¹Ñ¥½¸}Íád¡½½É‘Ì±I=\¥ì½¹ÍĞ¸õ½½É‘Ì¹±•¹Ñ ì½¹ÍĞÉ½İ õ¹•ÜÉÉ…ä¡5…Ñ ¹µ…à À±¸´Ä¤¤¹™¥±°¡I=\¤ì(€¥˜¡½½É‘Ì˜™½½É‘Ì¹±•¹Ñ ôôõ¸˜™½½É‘Ì¹•Ù•Éä¡	½½±•…¸¤˜™¸øôÈ¥ì½¹ÍĞ±…ĞÀõ½½É‘ÍlÁulÅt±­àõ5…Ñ ¹½Ì¡±…ĞÀ©5…Ñ ¹A$¼ÄàÀ¤¨ÄÄÄÌÈÀ±­äôÄÄÀÔĞÀì(€€€½¹ÍĞ@õ½½É‘Ì¹µ…À ¡m±¼±±…t¤ôùl¡±¼µ½½É‘ÍlÁulÁt¤©­à°¡±„µ±…ĞÀ¤©­åt¤ì(€€€½¹ÍĞÍ•œõmtí™½È¡±•Ğ¤ôÀí¤ñ¸´Äí¤¬¬¥Í•œ¹ÁÕÍ ¡5…Ñ ¹¡åÁ½Ğ¡Am¤¬ÅulÁtµAm¥ulÁt±Am¤¬ÅulÅtµAm¥ulÅt¤¤ì(€€€½¹ÍĞÍÈõl¸¸¹Í•t¹™¥±Ñ•È¡ôùøÄ¤¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤±µ•õÍÈ¹±•¹Ñ ıÍÉmÍÈ¹±•¹Ñ øøÅtèÄì(€€€™½È¡±•Ğ¤ôÀí¤ñ¸´Äí¤¬¬¥É½İ!m¥tõ5…Ñ ¹µ…à¡I=\±5…Ñ ¹µ¥¸¡I=\¨È¸Ä±Í•m¥t¨¡I=\½5…Ñ ¹µ…à ÈÀÀ±µ•¤¤¤¤ìô(€½¹ÍĞdõ¹•ÜÉÉ…ä¡¸¤íelÁtõM`¹Q=@í™½È¡±•Ğ¤ôÄí¤ñ¸í¤¬¬¥em¥tõem¤´Åt­É½İ!m¤´ÅtìÉ•ÑÕÉ¸dì)ô(¼¼ƒ¶Vpƒ®vó²jÃ¶*à£®Îã²€¿²²€¤ƒ®‚3®6Pèƒ²²€ƒ®Î×²€€¬ƒ²*çªÂW²z”€¬ƒ®2¶Rğƒ²rƒ²æc²€€¬ƒ²Š®. ƒ¶j3²Â )™Õ¹Ñ¥½¸}ÍáI½ÕÑ”¡¹…µ•Ì±ÕÉ	…Í”±…á¥Í`±d±½±½È±½ÁÑÌ¥ì(€½ÁÑÌõ½ÁÑÍññíôì½¹ÍĞ¸õ¹…µ•Ì¹±•¹Ñ ±í±	\±	 ±A<±MôõM`°ÕÀõ…á¥Í`µ¼È°‘¸õ…á¥Í`­¼È°õàôø ­à¤¹Ñ½¥á• Ä¤ì(€±•ĞÁ±…ÑÌôœœ±Í¥‘”ôœœ±µ¥¹`õÕÀ´È±µ…á`õ‘¸¬Èì(€½¹ÍĞ‰½àô¡à±±…ˆ±ä¤ôùíµ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±àµ	\¼È¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±à­	\¼È¤íÉ•ÑÕÉ¸€ñÉ•Ğàôˆ‘í¡àµ	\¼È¥ôˆäôˆ‘í¡äµ	 ¼È¥ôˆİ¥‘Ñ ôˆ‘í	]ôˆ¡•¥¡Ğôˆ‘í	!ôˆÉàôˆÈ¸Ôˆ±…ÍÌô‰ÑÍàµÁ±…Ğˆ¼ù€¬¡±…ˆ„ôôœœ˜™±…ˆ„õ¹Õ±°ı€ñÑ•áĞàôˆ‘í¡à¥ôˆäôˆ‘í¡ä¬Ì¥ôˆ±…ÍÌô‰ÑÍàµÁ¹Õ´ˆø‘í±…‰ôğ½Ñ•áĞù€èœœ¤íôì(€™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥ì½¹ÍĞäõem¥tì(€€€½¹ÍĞÁ™Ìõ}µ•ÑÉ½MÑ…Ñ¥½¹A±…Ñ™½ÉµÌ¡¹…µ•Ím¥t±ÕÉ	…Í”±¹…µ•Ím¤´Åt±¹…µ•Ím¤¬Åt¤ì(€€€½¹ÍĞÕÈõÁ™Ì¹™¥±Ñ•È¡ÀôùÀ¹¥ÍÕÈ˜˜…À¹‰É…¹¡=¹±ä¤ì±•ĞÁ¹ÌõÕÈ¹µ…À¡ÀôùÀ¹Á¸¤ì¥˜ …Á¹Ì¹±•¹Ñ ¥Á¹Ìõlœtì(€€€½¹ÍĞ@õÁ¹Ì¹±•¹Ñ ì(€€€¥˜¡@ğôÄ¥ìÁ±…ÑÌ¬õ‰½à¡…á¥Í`±Á¹ÍlÁt±ä¤ìô(€€€•±Í”¥˜¡@ôôôÈ¥ìÁ±…ÑÌ¬õ‰½à¡ÕÀµA<µ	\¼È±Á¹ÍlÁt±ä¤­‰½à¡‘¸­A<­	\¼È±Á¹ÍlÅt±ä¤ìô(€€€•±Í”ìÁ±…ÑÌ¬õ‰½à¡ÕÀµA<µ	\¼È±Á¹ÍlÁt±ä¤­‰½à¡‘¸­A<­	\¼È±Á¹ÍlÅt±ä¤ì(€€€€€½¹ÍĞÉ¡Tõä´¡em¤´Åt„õ¹Õ±°ıem¤´ÅtéäµM`¹I=\¤°É¡ô¡em¤¬Åt„õ¹Õ±°ıem¤¬Åtéä­M`¹I=\¤µäì(€€€€€½¹ÍĞM õ5…Ñ ¹µ¥¸ ÄÌ±5…Ñ ¹µ¥¸¡É¡T±É¡¤¨À¸Ì¤°Qõ5…Ñ ¹µ¥¸ ÈÀ±5…Ñ ¹µ¥¸¡É¡T±É¡¤¨À¸Ğ¤ì(€€€€€™½È¡±•Ğ¬ôÈí¬ñ@í¬¬¬¥ì½¹ÍĞ”õ¬´Èì½¹ÍĞ‰½áàõ‘¸­A<­	\¼È¬¡”¬Ä¤¨¡	\­M¤ì½¹ÍĞÑàõ‰½áàµ	\¼ÈµA<ì(€€€€€€€Á±…ÑÌ¬õ‰½à¡‰½áà±Á¹Ím­t±ä¤ì(€€€€€€€Í¥‘”¬õ€ñÁ…Ñ ô‰4€‘í¡‘¸¥ô€‘í¡äµM µQ¥ô€‘í¡‘¸¥ô€‘í¡äµM µQ¨À¸Ğ¥ô°€‘í¡Ñà¥ô€‘í¡äµM µQ¨À¸Ğ¥ô°€‘í¡Ñà¥ô€‘í¡äµM ¥ô0€‘í¡Ñà¥ô€‘í¡ä­M ¥ô€‘í¡Ñà¥ô€‘í¡ä­M ­Q¨À¸Ğ¥ô°€‘í¡‘¸¥ô€‘í¡ä­M ­Q¨À¸Ğ¥ô°€‘í¡‘¸¥ô€‘í¡ä­M ­Q¥ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÈ¸Ğˆ±…ÍÌô‰ÑÍàµÍ¥‘¥¹œˆ¼ù€ì(€€€€€ô(€€€ô(€ô(€€¼¼ƒ²²€ƒ®Îã²€ƒ®Î×²€(€½¹ÍĞäÀõelÁt°å8õem¸´Åtì(€±•Ğµ…¥¸õ€ñ±¥¹”àÄôˆ‘í¡ÕÀ¥ôˆäÄôˆ‘í¡äÀ¥ôˆàÈôˆ‘í¡ÕÀ¥ôˆäÈôˆ‘í¡å8¥ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌ¸ĞˆÍÑÉ½­”µ±¥¹•…Àô‰É½Õ¹ˆ¼ù€¬(€€€€€€€€€€€ñ±¥¹”àÄôˆ‘í¡‘¸¥ôˆäÄôˆ‘í¡äÀ¥ôˆàÈôˆ‘í¡‘¸¥ôˆäÈôˆ‘í¡å8¥ôˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌ¸ĞˆÍÑÉ½­”µ±¥¹•…Àô‰É½Õ¹ˆ¼ù€ì(€€¼¼ƒ²Š®. ƒ¶j3²Â £²r¿²V®z`¤(€½¹ÍĞÑ•É´ô¡ä±‘¥È¤ôùì½¹ÍĞ¼õ‘¥È¨ÄÔìÉ•ÑÕÉ¸€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡ä¥ô€‘í¡ÕÀ¥ô€‘í¡ä­¼¥ô°€‘í¡‘¸¥ô€‘í¡ä­¼¥ô°€‘í¡‘¸¥ô€‘í¡ä¥ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌˆÍÑÉ½­”µ±¥¹•…Àô‰É½Õ¹ˆ¼ù€¬(€€€€€€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡äµ‘¥È¨ÄÀ¥ô0€‘í¡‘¸¥ô€‘í¡ä¥ô4€‘í¡‘¸¥ô€‘í¡äµ‘¥È¨ÄÀ¥ô0€‘í¡ÕÀ¥ô€‘í¡ä¥ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÄ¸Üˆ½Á…¥Ñäôˆ¸Üˆ¼ù€ìôì(€¥˜¡½ÁÑÌ¹Ñ•ÉµQ½À¥µ…¥¸¬õÑ•É´¡äÀ°´Ä¤ì(€¥˜¡½ÁÑÌ¹Ñ•Éµ	½ÑÑ½´¥µ…¥¸¬õÑ•É´¡å8°Ä¤ì(€É•ÑÕÉ¸íÁ±…ÑÌ°ÑÉ…­ÌéÍ¥‘”­µ…¥¸°ÕÀ°‘¸°µ¥¹`°µ…áaôì)ô()™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…¹Ù…Í1•…ä¡°¥ì(€½¹ÍĞ½±½Èõ°¹½±½È°õàôø ­à¤¹Ñ½¥á• Ä¤°í95\±Q=@±I=\±±	\±A=ôõM`ì(€½¹ÍĞ<ô¡ÑåÁ•½˜5QI=}<„ôôÕ¹‘•™¥¹•œ¤ı5QI=}=m°¹¹…µ•té¹Õ±°ì(€½¹ÍĞµ½½É‘Ìô¡<˜™<¹´¥ññ°¹ÍÑ…Ñ¥½¹Ì¹µ…À  ¤ôù¹Õ±°¤ì(€½¹ÍĞdõ}Íád¡µ½½É‘Ì°I=\¤°¸õ°¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ì(€½¹ÍĞ5%9`ôäØì(€½¹ÍĞµ…¥¹%‘àõíôì°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡Ì±¤¤ôùí¥˜¡µ…¥¹%‘ámÍtôõ¹Õ±°¥µ…¥¹%‘ámÍtõ¤íô¤ì(€½¹ÍĞHõ}ÍáI½ÕÑ”¡°¹ÍÑ…Ñ¥½¹Ì°°¹¹…µ”°5%9`°d°½±½È°íÑ•ÉµQ½Àè…°¹±½½À°Ñ•Éµ	½ÑÑ½´è…°¹±½½Áô¤ì(€±•ĞÁ±…ÑÍMYõH¹Á±…ÑÌ°ÑÉ…­ÍMYõH¹ÑÉ…­Ì°¹…µ•Í!Q50ôœœ°±…‰•±Í!Q50ôœœì(€€¼¼ƒ²^·®ª£²Š3²â„ƒªÎƒ²‚TƒªÊ3¶À¤(€°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡Ì±¤¤ôùì½¹ÍĞ•¹ô¡¤ôôôÁññ¤ôôõ¸´Ä¤ì(€€€¹…µ•Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ¹…µ”‘í•¹üœ•¹œèœôˆÍÑå±”ô‰Ñ½Àè‘í¡em¥t¥õÁàˆø‘í}½ÁÍÍŒ¡Ì¥ôğ½ÍÁ…¸ù€ìô¤ì(€±•ĞÕÉ5…á`õH¹µ…á`° õem¸´Åt¬ÌĞì(€€¼¼ƒŠRŠR ƒ²²€èƒ®>g²vğƒ²^S²²ró®†pƒ²f²‚ƒ®ÂÃ²€£²zC²ÊĞƒ²ÚT¤ƒŠRŠR (€€ ¡<˜™<¹ˆ¥ññmt¤¹™½É… ¡ˆôùì¥˜ …ˆ¹Íññˆ¹Ì¹±•¹Ñ ğÉñğ…ˆ¹ññˆ¹Œ¹Í½µ”¡àôø…à¤¥É•ÑÕÉ¸ì(€€€±•Ğ©ˆõˆ¹Ì¹™¥¹‘%¹‘•à ¡Ì±¤¤ôùµ…¥¹%‘ámÍt„õ¹Õ±°˜˜ ¡¤¬Äñˆ¹Ì¹±•¹Ñ ˜™µ…¥¹%‘ámˆ¹Ím¤¬Åutôõ¹Õ±°¥ñğ¡¤´ÄøôÀ˜™µ…¥¹%‘ámˆ¹Ím¤´Åutôõ¹Õ±°¤¤¤ì(€€€¥˜¡©ˆğÀ¥©ˆõˆ¹Ì¹™¥¹‘%¹‘•à¡Ìôùµ…¥¹%‘ámÍt„õ¹Õ±°¤ì¥˜¡©ˆğÀ¥©ˆôÀì(€€€½¹ÍĞµ¨õµ…¥¹%‘ámˆ¹Ím©‰ut°…¹¡½Édô¡µ¨„õ¹Õ±°¤ıemµ©téQ=@ì(€€€½¹ÍĞÉ…İdõ}Íád¡ˆ¹Œ°I=\¤ì½¹ÍĞÍ¡¥™Ğõ…¹¡½ÉdµÉ…İem©‰tì±•Ğ‰dõÉ…İd¹µ…À¡äôùä­Í¡¥™Ğ¤ì(€€€½¹ÍĞµ¸õ5…Ñ ¹µ¥¸ ¸¸¹‰d¤ì¥˜¡µ¸ñQ=@¥í½¹ÍĞõQ=@µµ¸í‰dõ‰d¹µ…À¡äôùä­¤íô(€€€½¹ÍĞ‰àõÕÉ5…á`¬ØĞì(€€€½¹ÍĞ	Hõ}ÍáI½ÕÑ”¡ˆ¹Ì°°¹¹…µ”°‰à°‰d°½±½È°íÑ•ÉµQ½Àé©ˆøÀ°Ñ•Éµ	½ÑÑ½´éÑÉÕ•ô¤ì(€€€Á±…ÑÍMY¬õ	H¹Á±…ÑÌìÑÉ…­ÍMY¬õ	H¹ÑÉ…­Ìì(€€€€¼¼ƒ®ÚªâÀƒ²^ÃªÊÃ²€£®Îã²€ƒ¶Vc¶Z$ƒŠHƒ²²€¤¥é¥•È(€€€½¹ÍĞ©äõ‰em©‰t°ÑÑdõ‰em©ˆñˆ¹Ì¹±•¹Ñ ´Äı©ˆ¬Äé©‰tì(€€€ÑÉ…­ÍMY¬õ€ñÁ…Ñ ô‰4€‘í¡5%9`­¼È¥ô€‘í¡…¹¡½Éd¥ô€‘í ¡5%9`­¼È­	H¹ÕÀ¤¼È¥ô€‘í¡…¹¡½Éd¥ô°€‘í¡	H¹ÕÀ¥ô€‘í¡…¹¡½Éd¥ô°€‘í¡	H¹ÕÀ¥ô€‘í¡ÑÑd¥ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘í½±½ÉôˆÍÑÉ½­”µİ¥‘Ñ ôˆÌˆ½Á…¥Ñäôˆ¸àÔˆ¼ù€ì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‰ÉÑ…œˆÍÑå±”ô‰±•™Ğè‘í¡‰à¥õÁàíÑ½Àè‘í¡5…Ñ ¹µ¥¸ ¸¸¹‰d¤´ÄØ¥õÁàì´µÁŒè‘í½±½Éôˆû²²€ğ½ÍÁ…¸ù€ì(€€€ˆ¹Ì¹™½É…  ¡‰¸±‰¤¤ôùì¥˜¡‰¤ôôõ©ˆ¥É•ÑÕÉ¸ì¹…µ•Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‰¹…µ”ˆÍÑå±”ô‰±•™Ğè‘í¡	H¹µ…á`¬Ü¥õÁàíÑ½Àè‘í¡‰em‰¥t¥õÁàˆø‘í}½ÁÍÍŒ¡‰¸¥ôğ½ÍÁ…¸ù€ìô¤ì(€€€ÕÉ5…á`õ5…Ñ ¹µ…à¡ÕÉ5…á`±	H¹µ…á`¤ì(€€€ õ5…Ñ ¹µ…à¡ °5…Ñ ¹µ…à ¸¸¹‰d¤¬ÌĞ¤ì(€ô¤ì(€€¼¼ƒŠRŠR ƒ²Â£®~'ªâÃ² ƒ²vã²z²€¥é¥•ÈƒŠRŠR (€±•Ğ‘•Á`õÕÉ5…á`¬ĞÀì½¹ÍĞ‘•Ádõíôì(€€ ¡<˜™<¹¥ññmt¤¹™½É… ¡ôùì½¹ÍĞ¨õ¹¨°äÀô¡em©t„õ¹Õ±°ıem©téQ=@¤°­•äõ5…Ñ ¹É½Õ¹¡äÀ¼ÈØ¤ì‘•Áem­•åtô¡‘•Áem­•åuñğÀ¤ì½¹ÍĞåäõäÀ­‘•Áem­•åt¨ÈÀì‘•Áem­•åt¬¬ì(€€€ÑÉ…­ÍMY¬õ€ñÁ…Ñ ô‰4€‘í¡5%9`­¼È¥ô€‘í¡äÀ¥ô€‘í ¡5%9`­¼È­‘•Á`¤¼È¥ô€‘í¡äÀ¥ô°€‘í¡‘•Á`¥ô€‘í¡åä¥ô°€‘í¡‘•Á`¬ÄĞ¥ô€‘í¡åä¥ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆŒáˆäĞå”ˆÍÑÉ½­”µİ¥‘Ñ ôˆÈ¸ÈˆÍÑÉ½­”µ‘…Í¡…ÉÉ…äôˆĞ€Ìˆ½Á…¥Ñäôˆ¸àÔˆ¼ù€ì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‘•Á½ĞˆÍÑå±”ô‰±•™Ğè‘í¡‘•Á`¬Äà¥õÁàíÑ½Àè‘í¡åä¥õÁàˆûÂ~>´€‘í}½ÁÍÍŒ¡MÑÉ¥¹œ¡¹¸¤¹É•Á±…” Ÿ²^´€¼€œ°œ€œ¤¹É•Á±…” Ÿ²ó®ÂW²€œ°œƒ²ó®ÂTœ¤¹É•Á±…” Ÿ²Â£®~'²
³²^²0œ°œƒ²
³²^²0œ¤¹ÑÉ¥´ ¤¥ôğ½ÍÁ…¸ù€ì(€€€ÕÉ5…á`õ5…Ñ ¹µ…à¡ÕÉ5…á`±‘•Á`¬ÄÈÀ¤ì õ5…Ñ ¹µ…à¡ ±åä¬ÈØ¤ì(€ô¤ì(€€¼¼ƒŠRŠR ƒ²^Ó²Â èƒ².“²‚pƒ®Îã²€ƒ¶*ã®zdƒ²rƒŠRŠR (€±•Ğ¹ĞôÀì½¹ÍĞÑÈõmtì(€}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡°¹¹…µ”¤¹™½É… ¡Ğôùì½¹ÍĞ™¤õµ…¥¹%‘ámĞ¹™É½µMÑ¹t±Ñ¤õµ…¥¹%‘ámĞ¹Ñ½MÑ¹tì¥˜¡™¤ôõ¹Õ±±ññÑ¤ôõ¹Õ±°¥É•ÑÕÉ¸ì¹Ğ¬¬ì(€€€½¹ÍĞ‘½İ¸õÑ¤ù™¤ì½¹ÍĞäõĞ¹…ÑMÑ…Ñ¥½¸ıem™¥téem™¥t­Ğ¹™É…Œ¨¡emÑ¥tµem™¥t¤ì½¹ÍĞàõ‘½İ¸ı5%9`­¼Èé5%9`µ¼Èì(€€€ÑÈ¹ÁÕÍ ¡íà±ä±‘½İ¸±‘•ÍĞéĞ¹‘•ÍÑô¤ìô¤ì(€ÑÈ¹Í½ÉĞ ¡„±ˆ¤ôù„¹äµˆ¹ä¤ì±•Ğ±…ÍÑdô´ääì(€ÑÈ¹™½É… ¡Ğôùì½¹ÍĞÍ¡¥™Ğô¡Ğ¹äµ±…ÍÑdğÄĞ¤üÄèÀì±…ÍÑdõĞ¹äì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ…ÉÜ€‘íĞ¹‘½İ¸ü‘½İ¸œèÕÀôˆÍÑå±”ô‰±•™Ğè‘í¡Ğ¹à¥õÁàíÑ½Àè‘í¡Ğ¹ä¥õÁàˆø‘íĞ¹‘½İ¸üŸŠZğœèŸŠZÈôğ½ÍÁ…¸ù€¬(€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÍàµÑ±‰°ˆÍÑå±”ô‰±•™Ğè‘í¡Ğ¹à¬¡Ğ¹‘½İ¸üÄÀè´ÄÀ¤¥õÁàíÑ½Àè‘í¡Ğ¹ä¥õÁàì´µÑŒè‘íĞ¹‘½İ¸ı½±½ÈèœäÜàÉ˜ôíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ‘íĞ¹‘½İ¸üœÀœèœ´ÄÀÀ”ô°´ÔÀ”¤ˆø‘í}½ÁÍÍŒ¡Ğ¹‘•ÍĞ¥ôğ½ÍÁ…¸ù€ì(€ô¤ì(€½¹ÍĞ\õ5…Ñ ¹•¥°¡ÕÉ5…á`¬ÄØ¤° õ5…Ñ ¹•¥°¡ ¤ì(€½¹ÍĞÍÙœõ€ñÍÙœ±…ÍÌô‰ÑÍàµÍÙœˆİ¥‘Ñ ôˆ‘í]ôˆ¡•¥¡Ğôˆ‘í!ôˆÙ¥•İ	½àôˆÀ€À€‘í]ô€‘í!ôˆøñœ±…ÍÌô‰ÑÍàµÁ±…Ñ±…å•Èˆø‘íÁ±…ÑÍMYôğ½œøñœ±…ÍÌô‰ÑÍàµÑÉ…­±…å•Èˆø‘íÑÉ…­ÍMYôğ½œøğ½ÍÙœù€ì(€É•ÑÕÉ¸í¹Ğ°¡Ñµ°é€ñ‘¥Ø±…ÍÌô‰ÑÍàµ…¹Ù…ÌˆÍÑå±”ô‰¡•¥¡Ğè‘í!õÁàíİ¥‘Ñ è‘í]õÁàì´µµŒè‘í½±½Éôˆø‘íÍÙô‘í¹…µ•Í!Q51ô‘í±…‰•±Í!Q51ôğ½‘¥Øùôì)ô((¼¼ƒŠRŠR ƒ®>².s²Êƒ®>ƒ®ÂÃ²€ƒ®‚3®6S®~°ØÌèƒ²vãªÊ3²zÌ½ƒ²ƒ®†p•½µ•ÑÉç®–ğƒ²Š®. ƒ®ÂÃ²ƒ²ró®†pƒ¶"³²bƒŠRŠR (¼¼Ì÷®ã²€ƒ²’G².³²€ƒ®"²‚ªÆÃ®š°°÷²’G².³²€ƒ²Š3²jÀƒ¶:ã²Â ¸ƒ².“²‚pƒ®ÚªâÃ
ßªÆÓ®c²ƒ
ß®2¶Ró²ƒ²v ƒ¶j3²$ƒªâÃ®Âc²ƒ²ró®†p°(¼¼ƒ²z—ªÆÃ®š°ƒ®Îã²ƒªÎğƒ²’G².³²ÚTƒ²^ÃªÊÃ²ƒ²v ƒ®ã²ƒ²$ƒ²‚C²r€ƒªÊ÷®†s®†pƒ¶Fs².s¶Vs®.¸)™Õ¹Ñ¥½¸}ÍáQÉ…­d¡Ì°ÍÌ°d¥ì(€¥˜ …ÍÍñğ…ÍÌ¹±•¹Ñ¡ñğ…eñğ…d¹±•¹Ñ ¥É•ÑÕÉ¸M`¹Q=@ì(€¥˜¡ÌğõÍÍlÁt¥É•ÑÕÉ¸elÁtì½¹ÍĞ±…ÍĞõÍÌ¹±•¹Ñ ´Äì(€¥˜¡ÌøõÍÍm±…ÍÑt¥É•ÑÕÉ¸em5…Ñ ¹µ¥¸¡±…ÍĞ±d¹±•¹Ñ ´Ä¥tì(€±•Ğ±¼ôÀ±¡¤õ±…ÍĞì(€İ¡¥±”¡±¼¬Äñ¡¤¥í½¹ÍĞ´ô¡±¼­¡¤¤øøÄí¥˜¡ÍÍmµtğõÌ¥±¼õ´í•±Í”¡¤õ´íô(€½¹ÍĞÍÁ…¸õ5…Ñ ¹µ…à Ä±ÍÍm¡¥tµÍÍm±½t¤°…Àõem¡¥tµem±½t°É•°õÌµÍÍm±½tì(€€¼¼ƒ².“²‚pƒ²^´ƒªÖ³®
Ğƒ®ÚªâÃªâÃ®*Pƒ²"c².µû²"c®ÂÄ·²^@ƒ®Ú#ªÎó¶Vc®.¸ƒ²vÓ®–ğƒ²"`­´ƒ²^·ªÂƒªÆÃ®š³²f ƒªÂg²v (€€¼¼ƒ²ÚW²Êg²ró®†pƒ²’²vÓ®¦Ğƒ²"c¶>$ƒªÂ².s²Êc®~ğƒªÊç²æc®¾®†pƒ²ZG²ªôƒ²^´ƒ²‚¶nƒªÖ³ªÂ²^@ƒ¶fS®¦Ğƒ®K²vÓ®–ğƒ®6Pƒ®ÂÃ²‚W¶Vs®.¸(€½¹ÍĞÑ¡É½…Ñ4õ5…Ñ ¹µ¥¸ ØÔÀ±ÍÁ…¸¨¸ÈÈ¤°Ñ¡É½…ÑAàõ5…Ñ ¹µ¥¸ Ää±…À¨¸ÌÈ¤ì(€¥˜¡É•°ğõÑ¡É½…Ñ4¥É•ÑÕÉ¸em±½t¬¡É•°½Ñ¡É½…Ñ4¤©Ñ¡É½…ÑAàì(€¥˜¡ÍÁ…¸µÉ•°ğõÑ¡É½…Ñ4¥É•ÑÕÉ¸em¡¥t´ ¡ÍÁ…¸µÉ•°¤½Ñ¡É½…Ñ4¤©Ñ¡É½…ÑAàì(€½¹ÍĞµ¥‘4õ5…Ñ ¹µ…à Ä±ÍÁ…¸µÑ¡É½…Ñ4¨È¤±µ¥‘Aàõ5…Ñ ¹µ…à Ä±…ÀµÑ¡É½…ÑAà¨È¤ì(€É•ÑÕÉ¸em±½t­Ñ¡É½…ÑAà¬ ¡É•°µÑ¡É½…Ñ4¤½µ¥‘4¤©µ¥‘Aàì)ô)™Õ¹Ñ¥½¸}Íá9½Éµ…±¥é•MÑ½ÁÌ¡É…Ü±Ñ½Ñ…°¥ì(€½¹ÍĞÍÌô¡É…İññmt¤¹µ…À¡9Õµ‰•È¤±¸õÍÌ¹±•¹Ñ í¥˜ …¸¥É•ÑÕÉ¸ÍÌì(€ÍÍlÁtôÀì(€™½È¡±•Ğ¤ôÄí¤ñ¸í¤¬¬¥¥˜ …9Õµ‰•È¹¥Í¥¹¥Ñ”¡ÍÍm¥t¥ññÍÍm¥tğõÍÍm¤´Åt¥ì(€€€±•Ğ¨õ¤¬Äíİ¡¥±”¡¨ñ¸˜˜ …9Õµ‰•È¹¥Í¥¹¥Ñ”¡ÍÍm©t¥ññÍÍm©tğõÍÍm¤´Åt¤¥¨¬¬ì(€€€½¹ÍĞ•¹õ¨ñ¸ıÍÍm©té5…Ñ ¹µ…à¡9Õµ‰•È¡Ñ½Ñ…°¥ññÍÍm¤´Åt¬Ä±ÍÍm¤´Åt¬Ä¤ì(€€€™½È¡±•Ğ¬õ¤í¬ñ¨í¬¬¬¥ÍÍm­tõÍÍm¤´Åt¬¡•¹µÍÍm¤´Åt¤¨¡¬µ¤¬Ä¤¼¡¨µ¤¬Ä¤ì(€ô(€É•ÑÕÉ¸ÍÌì)ô)™Õ¹Ñ¥½¸}ÍáQÉ…­IÕ¹MÑ…ÑÌ¡ÉÕ¸¥ì(€±•Ğµ¥¹Lõ%¹™¥¹¥Ñä±µ…áLôµ%¹™¥¹¥Ñä±¹•…ÈôÀ±¸ôÀ±µ¥¹õ%¹™¥¹¥Ñä±µ…áôµ%¹™¥¹¥Ñäì(€™½È¡±•Ğ¤ôÀí¤¬ÄñÉÕ¸¹±•¹Ñ í¤¬ôÈ¥í½¹ÍĞÌõ9Õµ‰•È¡ÉÕ¹m¥t¤±õ9Õµ‰•È¡ÉÕ¹m¤¬Åt¤í¥˜ …9Õµ‰•È¹¥Í¥¹¥Ñ”¡Ì¥ñğ…9Õµ‰•È¹¥Í¥¹¥Ñ”¡¤¥½¹Ñ¥¹Õ”ì(€€€µ¥¹Lõ5…Ñ ¹µ¥¸¡µ¥¹L±Ì¤íµ…áLõ5…Ñ ¹µ…à¡µ…áL±Ì¤íµ¥¹õ5…Ñ ¹µ¥¸¡µ¥¹±¤íµ…áõ5…Ñ ¹µ…à¡µ…á±¤í¥˜¡5…Ñ ¹…‰Ì¡¤ğôä¥¹•…È¬¬í¸¬¬íô(€É•ÑÕÉ¸íÍÁ…¸é5…Ñ ¹µ…à À±µ…áLµµ¥¹L¤±¹•…Èé¸ı¹•…È½¸èÀ±µ¥¹±µ…áôì)ô)™Õ¹Ñ¥½¸}ÍáM¥µÁ±•A±…Ñ™½ÉµÌ¡°±ÑÉ…¬±d±…á¥Í`±Í…±”±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¥ì(€½¹ÍĞõàôø ­à¤¹Ñ½¥á• Ä¤ì±•ĞÍÙœôœœ±µ¥¹`õ…á¥Í`±µ…á`õ…á¥Í`ì(€½¹ÍĞ‰½àô¡à±ä±Ü± ¤ôùíµ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±àµÜ¼È¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±à­Ü¼È¤íÍÙœ¬õ€ñÉ•Ğàôˆ‘í¡àµÜ¼È¥ôˆäôˆ‘í¡äµ ¼È¥ôˆİ¥‘Ñ ôˆ‘í¡Ü¥ôˆ¡•¥¡Ğôˆ‘í¡ ¥ôˆÉàôˆÈˆ±…ÍÌô‰ÑÍàµÁ±…ĞÑÍàµÁ±…Ğ´µ…µ”ˆ¼ù€íôì(€½¹ÍĞÁ…É…±±•±5…Àõ}ÍáA…É…±±•±½±Õµ¹5…À¡°±ÑÉ…¬±ÑÉ…¬¹ÍÌ±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¤ì(€½¹ÍĞ…‘‘	±½­Ìô¡‰±½­Ì±ä± ±½™™Í•Ğ¤ôùì(€€€‰±½­Ì¹™½É… ¡ˆôùì(€€€€€¥˜¡ˆ¹­¥¹ôôô‰•Ñİ••¸œ¥ì(€€€€€€€½¹ÍĞ„õˆ¹„­½™™Í•Ğ±‰ˆõˆ¹ˆ­½™™Í•Ğ±…Àô¡‰ˆµ„¤©Í…±”±Üõ5…Ñ ¹µ…à à±5…Ñ ¹µ¥¸ ÄÈ±…À´Ô¤¤ì(€€€€€€€‰½à¡…á¥Í`¬ ¡„­‰ˆ¤¼È¤©Í…±”±ä±Ü± ¤ì(€€€€€õ•±Í•ì(€€€€€€€½¹ÍĞõˆ¹­½™™Í•Ğ±ÜôÄÀ±àõ…á¥Í`­©Í…±”¬¡ˆ¹Í¥‘”ôôô±•™Ğœü´¡Ü¼È¬Ô¤è¡Ü¼È¬Ô¤¤ì(€€€€€€€‰½à¡à±ä±Ü± ¤ì(€€€€€ô(€€€ô¤ì(€ôì(€°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡¹…µ”±¤¤ôùì(€€€½¹ÍĞÑ½Á¼õ}ÍáMÑ…Ñ¥½¹Q½Á½±½ä¡°±ÑÉ…¬±ÑÉ…¬¹ÍÌ±¤±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¤°äõem¥tì(€€€½¹ÍĞ õ5…Ñ ¹µ¥¸ ĞĞ°ÌØ­5…Ñ ¹µ…à À±Ñ½Á¼¹Á±…Ñ™½ÉµÌ´È¤¨È¤ì(€€€…‘‘	±½­Ì¡Ñ½Á¼¹‰±½­Ì±ä± °À¤ì(€€€Ñ½Á¼¹Á…É…±±•±É½ÕÁÌ¹™½É… ¡œôùí½¹ÍĞÁ´õÁ…É…±±•±5…Ámœ¹­•åtí¥˜¡Á´˜™œ¹µ½‘•°¹½‰Í•ÉÙ•„ôõ™…±Í”¥…‘‘	±½­Ì¡œ¹µ½‘•°¹‰±½­Ì±ä±5…Ñ ¹µ¥¸ ĞÀ°ÌĞ­œ¹½Õ¹Ğ¨È¤±Á´¹½™™Í•Ğ¤íô¤ì(€ô¤ì(€É•ÑÕÉ¸íÍÙœ±µ¥¹`±µ…áaôì)ô)™Õ¹Ñ¥½¸}ÍáA±…Ñ™½Éµ5½‘•°¡Á±…Ñ™½ÉµÌ±±¥¹•9…µ”±ÍÑ…Ñ¥½¹9…µ”¥ì(€Á±…Ñ™½ÉµÌõ5…Ñ ¹µ…à Ä±9Õµ‰•È¡Á±…Ñ™½ÉµÌ¥ñğÄ¤ì(€½¹ÍĞÑÉ…­ÌõÉÉ…ä¹™É½´¡í±•¹Ñ éÁ±…Ñ™½ÉµÍô°¡|±¬¤ôøÈ¸Ô¬¡¬´¡Á±…Ñ™½ÉµÌ´Ä¤¼È¤¨Ô¤±‰±½­Ìõmtì(€¥˜¡Á±…Ñ™½ÉµÌôôôÄ¥‰±½­Ì¹ÁÕÍ ¡í­¥¹è½ÕÑÍ¥‘”œ±éÑÉ…­ÍlÁt±Í¥‘”èÉ¥¡Ğô¤ì(€•±Í”¥˜¡Á±…Ñ™½ÉµÌôôôÈ¥‰±½­Ì¹ÁÕÍ ¡í­¥¹è½ÕÑÍ¥‘”œ±éÑÉ…­ÍlÁt±Í¥‘”è±•™Ğô±í­¥¹è½ÕÑÍ¥‘”œ±éÑÉ…­ÍlÅt±Í¥‘”èÉ¥¡Ğô¤ì(€•±Í•ì(€€€±•Ğ¬ôÀí¥˜¡Á±…Ñ™½ÉµÌ”È¥í‰±½­Ì¹ÁÕÍ ¡í­¥¹è½ÕÑÍ¥‘”œ±éÑÉ…­ÍlÁt±Í¥‘”è±•™Ğô¤í¬ôÄíô(€€€™½È í¬¬ÄñÁ±…Ñ™½ÉµÌí¬¬ôÈ¥‰±½­Ì¹ÁÕÍ ¡í­¥¹è‰•Ñİ••¸œ±„éÑÉ…­Ím­t±ˆéÑÉ…­Ím¬¬Åuô¤ì(€ô(€±•Ğµ…¥¹%‘àì(€¥˜¡Á±…Ñ™½ÉµÌôôôÄ¥µ…¥¹%‘àõlÀ°Átì(€•±Í”¥˜¡Á±…Ñ™½ÉµÌôôôÈ¥µ…¥¹%‘àõlÀ°Åtì(€•±Í”µ…¥¹%‘àõm5…Ñ ¹™±½½È ¡Á±…Ñ™½ÉµÌ´Ä¤¼È¤±5…Ñ ¹•¥° ¡Á±…Ñ™½ÉµÌ´Ä¤¼È¥tì(€É•ÑÕÉ¸íÑÉ…­Ì±‰±½­Ì±µ…¥¹%‘à±µ…¥¹Ìéµ…¥¹%‘à¹µ…À¡¬ôùÑÉ…­Ím­t¥ôì)ô)™Õ¹Ñ¥½¸}Íá½¹Í•ÕÑ¥Ù•A±…Ñ™½ÉµÉ½ÕÁÌ¡¥Ñ•µÌ±­•å¸¥ì(€½¹ÍĞ‰äõíôí¥Ñ•µÌ¹™½É… ¡Àôùí½¹ÍĞ¬õ­•å¸¡À¤ì¡‰åm­tõ‰åm­uññmt¤¹ÁÕÍ ¡À¤íô¤í½¹ÍĞ½ÕĞõmtì(€=‰©•Ğ¹­•åÌ¡‰ä¤¹™½É… ¡¬ôùí½¹ÍĞ„õ‰åm­t¹Í½ÉĞ ¡à±ä¤ôùà¹Á¸µä¹Á¸¤í±•Ğœõmtì(€€€„¹™½É… ¡Àôùí¥˜¡œ¹±•¹Ñ ˜™À¹Á¸ùmœ¹±•¹Ñ ´Åt¹Á¸¬Ä¥í½ÕĞ¹ÁÕÍ ¡í­•äé¬±¥Ñ•µÌéô¤íœõmtíõœ¹ÁÕÍ ¡À¤íô¤ì(€€€¥˜¡œ¹±•¹Ñ ¥½ÕĞ¹ÁÕÍ ¡í­•äé¬±¥Ñ•µÌéô¤ì(€ô¤íÉ•ÑÕÉ¸½ÕĞì)ô)™Õ¹Ñ¥½¸}ÍáI½ÕÑ•Q½­•¹Ì¡É½ÕÑ•!¥¹Ğ¥ì(€¥˜ …É½ÕÑ•!¥¹Ğ¥É•ÑÕÉ¸mtì(€É•ÑÕÉ¸l¸¸¹¹•ÜM•Ğ¡mÉ½ÕÑ•!¥¹Ğ¹±…‰•°°¸¸¸¡É½ÕÑ•!¥¹Ğ¹¹…µ•Íññmt¥t(€€€€¹™±…Ñ5…À¡ØôùMÑÉ¥¹œ¡Ùñğœœ¤¹ÍÁ±¥Ğ ½mqÏŠIpµ|¼ ¥t¬¼¤¤¹µ…À¡ØôùØ¹ÑÉ¥´ ¤¤¹™¥±Ñ•È¡ØôùØ¹±•¹Ñ øôÈ¤¥tì)ô)™Õ¹Ñ¥½¸}ÍáA±…Ñ™½Éµ5…Ñ¡•ÍI½ÕÑ”¡À±É½ÕÑ•!¥¹Ğ¥ì(€¥˜ …Áñğ…É½ÕÑ•!¥¹Ññğ…À¹Ù…É¥…¹ÑÌü¹±•¹Ñ ¥É•ÑÕÉ¸™…±Í”ì(€½¹ÍĞÑ½­•¹Ìõ}ÍáI½ÕÑ•Q½­•¹Ì¡É½ÕÑ•!¥¹Ğ¤ì(€É•ÑÕÉ¸À¹Ù…É¥…¹ÑÌ¹Í½µ”¡ØôùÑ½­•¹Ì¹Í½µ”¡ĞôùMÑÉ¥¹œ¡Ø¤¹¥¹±Õ‘•Ì¡Ğ¥ññĞ¹¥¹±Õ‘•Ì¡MÑÉ¥¹œ¡Ø¤¤¤¤ì)ô)™Õ¹Ñ¥½¸}Íá±¥¹•‘	É…¹¡d¡¹…µ•Ì±µ…¥¹%‘à±µ…¥¹d±É½Ü¥ì(€É½Üõ9Õµ‰•È¡É½Ü¥ñğĞĞí½¹ÍĞ½µµ½¸õmtì(€¹…µ•Ì¹™½É…  ¡¸±¤¤ôùí¥˜¡µ…¥¹%‘ám¹t„õ¹Õ±°¥½µµ½¸¹ÁÕÍ ¡¤¤íô¤ì(€¥˜ …½µµ½¸¹±•¹Ñ ¥É•ÑÕÉ¸}Íád¡¹…µ•Ì¹µ…À  ¤ôù¹Õ±°¤±É½Ü¤ì(€½¹ÍĞ½ÕĞõ¹•ÜÉÉ…ä¡¹…µ•Ì¹±•¹Ñ ¤±™¥ÉÍĞõ½µµ½¹lÁt±±…ÍĞõ½µµ½¹m½µµ½¸¹±•¹Ñ ´Åtì(€½µµ½¸¹™½É… ¡¤ôùí½ÕÑm¥tõµ…¥¹emµ…¥¹%‘ám¹…µ•Ím¥uutíô¤ì(€½¹ÍĞÕÁMÑ•Àõ™¥ÉÍĞı5…Ñ ¹µ¥¸¡É½Ü±5…Ñ ¹µ…à Äà°¡½ÕÑm™¥ÉÍÑt´ÄÈ¤½™¥ÉÍĞ¤¤éÉ½Üì(€™½È¡±•Ğ¤õ™¥ÉÍĞ´Äí¤øôÀí¤´´¥½ÕÑm¥tõ½ÕÑm¤¬ÅtµÕÁMÑ•Àì(€™½È¡±•Ğ¤õ±…ÍĞ¬Äí¤ñ¹…µ•Ì¹±•¹Ñ í¤¬¬¥½ÕÑm¥tõ½ÕÑm¤´Åt­É½Üì(€™½È¡±•ĞŒôÀíŒ¬Äñ½µµ½¸¹±•¹Ñ íŒ¬¬¥ì(€€€½¹ÍĞ„õ½µµ½¹mt±ˆõ½µµ½¹mŒ¬Åt±ÍÁ…¸õˆµ„ì(€€€™½È¡±•Ğ¤õ„¬Äí¤ñˆí¤¬¬¥½ÕÑm¥tõ½ÕÑm…t¬¡½ÕÑm‰tµ½ÕÑm…t¤¨¡¤µ„¤½ÍÁ…¸ì(€ô(€É•ÑÕÉ¸½ÕĞì)ô)™Õ¹Ñ¥½¸}ÍáM¥‘¥¹%Í½¹¹•Ñ•¡±½…±IÕ¹Ì±Í¥‘¥¹±ÍÑ…Ñ¥½¹QÉ…­Ì¥ì(€½¹ÍĞ½¹M¥‘¥¹œõôù5…Ñ ¹…‰Ì¡9Õµ‰•È¡¤µÍ¥‘¥¹¤ğôÈ¸ÜÔì(€½¹ÍĞ½¹MÑ…Ñ¥½¹QÉ…¬õôùÍÑ…Ñ¥½¹QÉ…­Ì¹Í½µ”¡Ñôù5…Ñ ¹…‰Ì¡9Õµ‰•È¡¤µÑ¤ğôÈ¸ÜÔ¤ì(€É•ÑÕÉ¸±½…±IÕ¹Ì¹Í½µ”¡Á½¥¹ÑÌôùì(€€€™½È¡±•Ğ¤ôÀí¤¬ÄñÁ½¥¹ÑÌ¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞ„õÁ½¥¹ÑÍm¥t±ˆõÁ½¥¹ÑÍm¤¬Åt±±½¹¥ÑÕ‘¥¹…°õ5…Ñ ¹…‰Ì¡ˆ¹Ìµ„¹Ì¤±±…Ñ•É…°õ5…Ñ ¹…‰Ì¡ˆ¹µ„¹¤ì(€€€€€€¼¼ƒªÂg²v ƒ¶>Ó®š³®vó²vã²^@ƒ²jÃ²^Ã¶z ƒ®F@ƒ²ƒ®†sªÂ ƒ®N“²ZĞƒ²z#®.“®*Pƒ²vÓ²rƒ®3²ró®†pƒ²^ÃªÊÃ¶Vc² ƒ²V+®*S®.¸(€€€€€€¼¼ƒ²^´ƒªÖ³®
Ó²v`ƒ²ŸªÎ€ƒ²^Ã²7®Bpƒ®ÚªâÀƒ²ƒ®Ú²vĞƒ².“²‚pƒ²ZDƒ²ƒ®†s®–ğƒ²z®*PƒªÊ÷²jÃ®0ƒ²^ÃªÊÃ®†pƒ²vã²‚W¶Vs®.¸(€€€€€¥˜¡±½¹¥ÑÕ‘¥¹…°ğÉññ±½¹¥ÑÕ‘¥¹…°øÈÈÁññ±…Ñ•É…°ğÈ¸Õññ±…Ñ•É…°øà¸Ô¥½¹Ñ¥¹Õ”ì(€€€€€¥˜ ¡½¹M¥‘¥¹œ¡„¹¤˜™½¹MÑ…Ñ¥½¹QÉ…¬¡ˆ¹¤¥ñğ¡½¹M¥‘¥¹œ¡ˆ¹¤˜™½¹MÑ…Ñ¥½¹QÉ…¬¡„¹¤¤¥É•ÑÕÉ¸ÑÉÕ”ì(€€€ô(€€€É•ÑÕÉ¸™…±Í”ì(€ô¤ì)ô(¼¼ƒ²vc®¾àƒ®Ú²tƒªÊÃªÎó²v`ƒ².“²‚pƒ²Š3²jÀƒ²"s²s²f ƒ²^ÃªÊÀƒªÒªÎ®*Pƒ²rƒ²¶Vc®B`°ƒ²nC®Îàƒ²Š3¶Fs²v`ƒ®¾ã²ã¶Vpƒ¶vS®N“®šó²v (¼¼ƒ¶fS®¦Ó²^@ƒ²²‚Dƒ¶"³²b¶Vc² ƒ²V+®*S®.¸ƒ®ÂÃ²ƒ®>²^C®*Pƒ²^·®#®.ƒ²Ös®2 €Û²ƒªæ3²®0ƒªŞƒ®NÄƒªÂªÊ§²ró®†pƒ²‚W®š³¶Vs®.¸)™Õ¹Ñ¥½¸}ÍáM¥µÁ±•Q½Á½±½ä¡É…Ü¥ì(€¥˜ …É…Ü¥É•ÑÕÉ¸É…Üì(€½¹ÍĞ½‰Í•ÉÙ•õÉ…Ü¹½‰Í•ÉÙ•„ôõ™…±Í”˜™ÉÉ…ä¹¥ÍÉÉ…ä¡É…Ü¹ÑÉ…­Ì¤˜™É…Ü¹ÑÉ…­Ì¹±•¹Ñ øÀì(€½¹ÍĞÍ½ÕÉ•Ìõ½‰Í•ÉÙ•ıÉ…Ü¹ÑÉ…­Ìémtì(€½¹ÍĞ™…±±‰…­½Õ¹Ğõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ Ğ±9Õµ‰•È¡É…Ü¹Á±…Ñ™½ÉµÌ¥ñğÈ¤¤ì(€½¹ÍĞ½Õ¹Ğõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ Ø±Í½ÕÉ•Ì¹±•¹Ñ¡ññ™…±±‰…­½Õ¹Ğ¤¤ì(€½¹ÍĞ•¹Ñ•Èô¡½Õ¹Ğ´Ä¤¼È±ÑÉ…­ÌõÉÉ…ä¹™É½´¡í±•¹Ñ é½Õ¹Ñô°¡|±¤¤ôøÈ¸Ô¬¡¤µ•¹Ñ•È¤¨Ô¤ì(€½¹ÍĞÍ½ÕÉ•%¹‘•àõôùì(€€€¥˜ …Í½ÕÉ•Ì¹±•¹Ñ ¥É•ÑÕÉ¸€´Äì(€€€±•Ğ‰•ÍĞôÀ±‘¥ÍĞõ%¹™¥¹¥ÑäíÍ½ÕÉ•Ì¹™½É…  ¡Ø±¤¤ôùí½¹ÍĞ¸õ5…Ñ ¹…‰Ì¡Øµ¤í¥˜¡¸ñ‘¥ÍĞ¥í‘¥ÍĞõ¸í‰•ÍĞõ¤íõô¤ì(€€€É•ÑÕÉ¸‰•ÍĞì(€ôì(€½¹ÍĞµ…ÁÁ•‘%¹‘•àõ¤ôù5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸¡½Õ¹Ğ´Ä±5…Ñ ¹É½Õ¹ ¡5…Ñ ¹µ…à À±¤¤¤¨¡½Õ¹Ğ´Ä¤½5…Ñ ¹µ…à Ä±Í½ÕÉ•Ì¹±•¹Ñ ´Ä¤¤¤¤ì(€±•Ğµ…¥¹%‘àô¡É…Ü¹µ…¥¹Íññmt¤¹µ…À¡ôùµ…ÁÁ•‘%¹‘•à¡Í½ÕÉ•%¹‘•à¡¤¤¤¹Í±¥” À°È¤ì(€¥˜¡µ…¥¹%‘à¹±•¹Ñ ğÈ¥µ…¥¹%‘àõ½Õ¹ĞôôôÄılÀ°Átém5…Ñ ¹™±½½È ¡½Õ¹Ğ´Ä¤¼È¤±5…Ñ ¹•¥° ¡½Õ¹Ğ´Ä¤¼È¥tì(€µ…¥¹%‘à¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤ì(€½¹ÍĞµ…¥¹Ìõµ…¥¹%‘à¹µ…À¡¤ôùÑÉ…­Ím¥t¤ì(€½¹ÍĞ‰±½­Ìõ½‰Í•ÉÙ•ü¡É…Ü¹‰±½­Íññmt¤¹µ…À¡ˆôùì(€€€¥˜¡ˆ¹­¥¹ôôô‰•Ñİ••¸œ¥ì(€€€€€½¹ÍĞ„õµ…ÁÁ•‘%¹‘•à¡Í½ÕÉ•%¹‘•à¡ˆ¹„¤¤±Œõµ…ÁÁ•‘%¹‘•à¡Í½ÕÉ•%¹‘•à¡ˆ¹ˆ¤¤ì(€€€€€É•ÑÕÉ¸„ôôõŒı¹Õ±°éí­¥¹è‰•Ñİ••¸œ±„éÑÉ…­Ím5…Ñ ¹µ¥¸¡„±Œ¥t±ˆéÑÉ…­Ím5…Ñ ¹µ…à¡„±Œ¥t±½¹™¥‘•¹”éˆ¹½¹™¥‘•¹•ôì(€€€ô(€€€½¹ÍĞ¤õµ…ÁÁ•‘%¹‘•à¡Í½ÕÉ•%¹‘•à¡ˆ¹¤¤íÉ•ÑÕÉ¸í­¥¹è½ÕÑÍ¥‘”œ±éÑÉ…­Ím¥t±Í¥‘”éˆ¹Í¥‘”±½¹™¥‘•¹”éˆ¹½¹™¥‘•¹•ôì(€ô¤¹™¥±Ñ•È¡	½½±•…¸¤é}ÍáA±…Ñ™½Éµ5½‘•°¡½Õ¹Ğ°œœ°œœ¤¹‰±½­Ìì(€½¹ÍĞ½ÕÑÍ¥‘”õmÑÉ…­ÍlÁt´Ô±ÑÉ…­ÍmÑÉ…­Ì¹±•¹Ñ ´Åt¬Õtì(€½¹ÍĞÍ¥‘¥¹Ìô¡É…Ü¹Í¥‘¥¹Íññmt¤¹Í±¥” À°È¤¹µ…À ¡Ì±¤¤ôø¡ì¸¸¹Ì±é½ÕÑÍ¥‘•m¤”Éuô¤¤ì(€½¹ÍĞÁ…É…±±•±É½ÕÁÌô¡É…Ü¹Á…É…±±•±É½ÕÁÍññmt¤¹™¥±Ñ•È¡œôùœ¹µ½‘•°˜™œ¹µ½‘•°¹½‰Í•ÉÙ•„ôõ™…±Í”¤¹Í±¥” À°È¤¹µ…À¡œôùì(€€€½¹ÍĞ¸õ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ Ğ±œ¹µ½‘•°¹ÑÉ…­Ì¹±•¹Ñ¡ññœ¹½Õ¹ÑñğÈ¤¤ì(€€€½¹ÍĞ‘ÌõÉÉ…ä¹™É½´¡í±•¹Ñ é¹ô°¡|±¤¤ôøÈ¸Ô¬¡¤´¡¸´Ä¤¼È¤¨Ô¤ì(€€€É•ÑÕÉ¸ì¸¸¹œ±µ½‘•°éì¸¸¹œ¹µ½‘•°±ÑÉ…­Ìé‘Ì±µ…¥¹Ìé¸ôôôÄım‘ÍlÁt±‘ÍlÁutém‘ÍlÁt±‘Ím¸´Åut±‰±½­Ìé}ÍáA±…Ñ™½Éµ5½‘•°¡¸°œœ°œœ¤¹‰±½­Ì±½‰Í•ÉÙ•éÑÉÕ•õôì(€ô¤ì(€½¹ÍĞÑÉ…­5•Ñ„õÑÉ…­Ì¹µ…À ¡±¥¹‘•à¤ôùì(€€€½¹ÍĞÍÉŒõÉ…Ü¹ÑÉ…­5•Ñ„˜™É…Ü¹ÑÉ…­5•Ñ…m5…Ñ ¹µ¥¸¡¥¹‘•à±É…Ü¹ÑÉ…­5•Ñ„¹±•¹Ñ ´Ä¥tì(€€€É•ÑÕÉ¸í¥¹‘•à±±ÑåÁ”éÍÉŒü¹ÑåÁ•ñğÕ¹­¹½İ¸œ±½¹™¥‘•¹”éÍÉŒü¹½¹™¥‘•¹•ñğÀ±½¹¹•Ñ•éÍÉŒü¹½¹¹•Ñ•„ôõ™…±Í”±½‰Í•ÉÙ•‘ôì(€ô¤ì(€É•ÑÕÉ¸ì¸¸¹É…Ü±ÑÉ…­Ì±ÑÉ…­5•Ñ„±µ…¥¹%‘à±µ…¥¹Ì±‰±½­Ì±Í¥‘¥¹Ì±Á…É…±±•±É½ÕÁÌ±É½ÍÌéÉ…Ü¹É½ÍÌüÄèÀ±½‰Í•ÉÙ•‘ôì)ô(¼¼ƒ²vãªÊ3²zƒ².“²Š3¶Fs²^C²pƒ®ÂÃ²ƒ²v`ƒ²vc®¾ã®0ƒ²ÚS²Ús¶Vs®.¸ƒ²nC®Îàƒ¶>Ó®š³®vó²vã²vƒªŞã®2®†pƒ²ÚW²3¶Vc² ƒ²V+ªÎ€(¼¼ƒ®Ú®Îã²€ƒ²"c
ßªÆÓ®c²ƒ
ß¶j3²Â ¿²rƒ²æc²€ƒ²†Ó²z³®–ğƒªÒ²‚pƒ®ÂÃ²€ƒªâÃ¶bã®†pƒ®.“².pƒªŞã®šÃ®.¸)™Õ¹Ñ¥½¸}ÍáMÑ…Ñ¥½¹Q½Á½±½ä¡°±ÑÉ…¬±ÍÌ±¤±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¥ì(€½¹ÍĞÍ•µ…¹Ñ¥Q½Á½±½äõÍ•µ…¹Ñ¥I½ÕÑ”˜™Í•µ…¹Ñ¥I½ÕÑ”¹ÍÑ…Ñ¥½¹Ì˜™Í•µ…¹Ñ¥I½ÕÑ”¹ÍÑ…Ñ¥½¹Ím¥t˜™Í•µ…¹Ñ¥I½ÕÑ”¹ÍÑ…Ñ¥½¹Ím¥t¹Ñ½Á½±½äì(€¥˜¡Í•µ…¹Ñ¥Q½Á½±½ä¥É•ÑÕÉ¸}ÍáM¥µÁ±•Q½Á½±½ä¡Í•µ…¹Ñ¥Q½Á½±½ä¤ì(€½¹ÍĞÌõÍÍm¥t±ÁÉ•Øõ¤ıÍÍm¤´ÅtéÌ±¹•áĞõ¤¬ÄñÍÌ¹±•¹Ñ ıÍÍm¤¬ÅtéÌì(€½¹ÍĞİ¥¹‘½Üõ5…Ñ ¹µ¥¸ ÜÈÀ±5…Ñ ¹µ…à ÈØÀ±5…Ñ ¹µ¥¸¡¤ıÌµÁÉ•Øé%¹™¥¹¥Ñä±¤¬ÄñÍÌ¹±•¹Ñ ı¹•áĞµÌé%¹™¥¹¥Ñä¤¨¸ÈĞ¤¤ì(€½¹ÍĞÍÕÁÁ½ÉÑÌõ¹•Ü5…À ¤±±½…±IÕ¹Ìõmtí±•ĞÉ½ÍÌôÀ±Á½­•ĞôÀì(€€¡ÑÉ…¬¹É¹ññmt¤¹™½É… ¡ÉÕ¸ôùì(€€€½¹ÍĞÍĞõ}ÍáQÉ…­IÕ¹MÑ…ÑÌ¡ÉÕ¸¤í¥˜¡ÍĞ¹ÍÁ…¸ğÈÈ¥É•ÑÕÉ¸ì(€€€±•Ğµ¥¹Lõ%¹™¥¹¥Ñä±µ…áLôµ%¹™¥¹¥Ñäí½¹ÍĞ‘Ìõmt±Á½¥¹ÑÌõmtì(€€€™½È¡±•Ğ¬ôÀí¬¬ÄñÉÕ¸¹±•¹Ñ í¬¬ôÈ¥í½¹ÍĞÉÌõ9Õµ‰•È¡ÉÕ¹m­t¤±õ9Õµ‰•È¡ÉÕ¹m¬¬Åt¤íµ¥¹Lõ5…Ñ ¹µ¥¸¡µ¥¹L±ÉÌ¤íµ…áLõ5…Ñ ¹µ…à¡µ…áL±ÉÌ¤í¥˜¡5…Ñ ¹…‰Ì¡ÉÌµÌ¤ğõİ¥¹‘½Ü¥í‘Ì¹ÁÕÍ ¡¤íÁ½¥¹ÑÌ¹ÁÕÍ ¡íÌéÉÌ±‘ô¤íõô(€€€¥˜¡µ…áLñÌµİ¥¹‘½İññµ¥¹LùÌ­İ¥¹‘½İñğ…‘Ì¹±•¹Ñ ¥É•ÑÕÉ¸ì(€€€¥˜¡Á½¥¹ÑÌ¹±•¹Ñ øÄ¥±½…±IÕ¹Ì¹ÁÕÍ ¡Á½¥¹ÑÌ¤ì(€€€¥˜¡ÍĞ¹ÍÁ…¸øôÜÀ¥‘Ì¹™½É… ¡ôùí½¹ÍĞÄõ5…Ñ ¹É½Õ¹¡¼Ô¤¨Ôí¥˜¡Äğ´ÅññÄøØ¥ÍÕÁÁ½ÉÑÌ¹Í•Ğ¡Ä°¡ÍÕÁÁ½ÉÑÌ¹•Ğ¡Ä¥ñğÀ¤¬Ä¤íô¤ì(€€€¥˜¡ÍĞ¹ÍÁ…¸ğôÔÈÀ˜™ÍĞ¹µ¥¹ğôÄ˜™ÍĞ¹µ…áøôĞ˜™ÍĞ¹µ…áµÍĞ¹µ¥¹ğôÄÌ¥É½ÍÌ¬¬ì(€€€½¹ÍĞİ¡½±±å1½…°õµ¥¹LøõÌµİ¥¹‘½Ü˜™µ…áLğõÌ­İ¥¹‘½Üì(€€€¥˜¡İ¡½±±å1½…°˜™ÍĞ¹ÍÁ…¸øôàÀ˜™ÍĞ¹ÍÁ…¸ğôÜØÀ˜™ÍĞ¹µ¥¹ø´Ä˜™ÍĞ¹µ…áğÜ¥Á½­•Ğ¬¬ì(€ô¤ì(€½¹ÍĞ…±±A™Ìõ}µ•ÑÉ½MÑ…Ñ¥½¹A±…Ñ™½ÉµÌ¡°¹ÍÑ…Ñ¥½¹Ím¥t±°¹¹…µ”±°¹ÍÑ…Ñ¥½¹Ím¤´Åt±°¹ÍÑ…Ñ¥½¹Ím¤¬Åt¤ì(€½¹ÍĞµ…Ñ¡•‘I½ÕÑ•A™ÌõÉ½ÕÑ•!¥¹Ğı…±±A™Ì¹™¥±Ñ•È¡ÀôùÀ¹¥ÍÕÈ˜™}ÍáA±…Ñ™½Éµ5…Ñ¡•ÍI½ÕÑ”¡À±É½ÕÑ•!¥¹Ğ¤¤émtì(€½¹ÍĞÉ½ÕÑ•A™Ìõµ…Ñ¡•‘I½ÕÑ•A™Ì¹±•¹Ñ ıµ…Ñ¡•‘I½ÕÑ•A™Ìè¡É½ÕÑ•!¥¹Ğı…±±A™Ì¹™¥±Ñ•È¡ÀôùÀ¹¥ÍÕÈ˜™À¹‰É…¹¡=¹±ä¤émt¤ì(€½¹ÍĞµ…¥¹A½½°õÉ½ÕÑ•A™Ì¹±•¹Ñ ıÉ½ÕÑ•A™Ìé…±±A™Ì¹™¥±Ñ•È¡ÀôùÀ¹¥ÍÕÈ˜˜…À¹‰É…¹¡=¹±ä¤ì(€½¹ÍĞÕÉÉ½ÕÁÌõ}Íá½¹Í•ÕÑ¥Ù•A±…Ñ™½ÉµÉ½ÕÁÌ¡µ…¥¹A½½°° ¤ôù°¹¹…µ”¤ì(€ÕÉÉ½ÕÁÌ¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹¥Ñ•µÌ¹±•¹Ñ µ„¹¥Ñ•µÌ¹±•¹Ñ¡ññ„¹¥Ñ•µÍlÁt¹Á¸µˆ¹¥Ñ•µÍlÁt¹Á¸¤ì(€½¹ÍĞÁ™ÌõÕÉÉ½ÕÁÌ¹±•¹Ñ ıÕÉÉ½ÕÁÍlÁt¹¥Ñ•µÌémtì(€½¹ÍĞÁ±…Ñ™½ÉµÌõ5…Ñ ¹µ…à Ä±Á™Ì¹±•¹Ñ¡ñğÄ¤±¹ÕµÌõÁ™Ì¹±•¹Ñ ıÁ™Ì¹µ…À¡ÀôùÀ¹Á¸¤¹Í½ÉĞ ¡„±ˆ¤ôù„µˆ¤élÅtì(€€¼¼ƒ²*çªÂW²z”ƒ®Ê#¶bã®*Pƒ²Š3ŠK²jÀƒ²ƒ®†pƒ²"s²s®†pƒ²
³²j§¶Vc®¦Àƒ²®2².t¿²³².tƒªÖ³²†Ã²f ƒ®Îã²€ƒ®Ê#¶bã®–ğ(€€¼¼ƒ¶Vc®
c²v`ƒ®ª£®6ã²^C²pƒ¶V£ªî`ƒ²
Ã²Ús¶Vs®.¸(€½¹ÍĞµ½‘•°õ}ÍáA±…Ñ™½Éµ5½‘•°¡Á±…Ñ™½ÉµÌ±°¹¹…µ”±°¹ÍÑ…Ñ¥½¹Ím¥t¤ì(€½¹ÍĞíÑÉ…­Ì±‰±½­Ì±µ…¥¹%‘à±µ…¥¹Íôõµ½‘•°ì(€€¼¼ƒ²*çªÂW²z—²vĞƒ²^®*Pƒ²vãªÊ3²zƒ²fã²â„ƒ²ƒ®†sªÂ ƒ®Âc®ÎÔƒªÊ²Ús®B€ƒ®V3®0ƒ²ÚSªÂ ƒ²rƒ²æ`¿®2¶Ró²ƒ²ró®†pƒ®
£ªâÓ®.¸(€½¹ÍĞ½ÕÁ¥•‘5¥¸õÑÉ…­ÍlÁt±½ÕÁ¥•‘5…àõÑÉ…­ÍmÑÉ…­Ì¹±•¹Ñ ´Åtì(€±•ĞÍ¥‘¥¹Ìõl¸¸¹ÍÕÁÁ½ÉÑÍt¹™¥±Ñ•È ¡m±¹t¤ôù¸øôÌ˜˜¡ñ½ÕÁ¥•‘5¥¸´Éññù½ÕÁ¥•‘5…à¬È¤¤¹Í½ÉĞ ¡„±ˆ¤ôù‰lÅtµ…lÅt¤(€€€€¹µ…À ¡m‘t¤ôø¡í±½¹¹•Ñ•é}ÍáM¥‘¥¹%Í½¹¹•Ñ•¡±½…±IÕ¹Ì±±ÑÉ…­Ì¥ô¤¤¹Í±¥” À°È¤ì(€½¹ÍĞÍ•½¹‘…ÉåÕÈõÉ½ÕÑ•!¥¹ĞımtéÕÉÉ½ÕÁÌ¹Í±¥” Ä¤¹µ…À ¡œ±¤¤ôø¡í­•äé€‘í°¹¹…µ•ôë²ó²jP‘í¥õ€±±…‰•°èœœ±½±½Èé°¹½±½È±­¥¹èµ…¥¸œ±¥Ñ•µÌéœ¹¥Ñ•µÍô¤¤ì(€½¹ÍĞµ…ÁÁ•‘	É…¹ ô…É½ÕÑ•!¥¹Ğ˜˜¡ÑÉ…¬¹‰ññmt¤¹Í½µ”¡ˆôùÉÉ…ä¹¥ÍÉÉ…ä¡ˆ¹¹…µ•Ì¤˜™ˆ¹¹…µ•Ì¹¥¹±Õ‘•Ì¡°¹ÍÑ…Ñ¥½¹Ím¥t¤¤ì(€½¹ÍĞÙ…É¥…¹ÑÉ½ÕÁÌõÉ½ÕÑ•!¥¹Ñññµ…ÁÁ•‘	É…¹ ımté}Íá½¹Í•ÕÑ¥Ù•A±…Ñ™½ÉµÉ½ÕÁÌ¡…±±A™Ì¹™¥±Ñ•È¡ÀôùÀ¹¥ÍÕÈ˜™À¹‰É…¹¡=¹±ä¤±ÀôùÀ¹Ù…É¥…¹ÑÌü¹©½¥¸ Ÿ
Üœ¥ñğŸªÂ² œ¤(€€€€¹µ…À¡œôø¡í­•äéƒªÂ² è‘í°¹¹…µ•ôè‘íœ¹­•åõ€±±…‰•°é€‘í°¹¹…µ•ô€‘íœ¹­•åõ€±½±½Èé°¹½±½È±­¥¹èÙ…É¥…¹Ğœ±É½ÕÑ•-•åÌéœ¹¥Ñ•µÌ¹™±…Ñ5…À¡ÀôùÀ¹Ù…É¥…¹ÑÍññmt¤±¥Ñ•µÌéœ¹¥Ñ•µÍô¤¤ì(€½¹ÍĞ½Ñ¡•ÈõÉ½ÕÑ•!¥¹Ğımté}Íá½¹Í•ÕÑ¥Ù•A±…Ñ™½ÉµÉ½ÕÁÌ¡…±±A™Ì¹™¥±Ñ•È¡Àôø…À¹¥ÍÕÈ˜˜…À¹©Õ¹Ñ¥½¸˜˜¡À¹­¥¹ôôôµ•ÑÉ¼ññÀ¹­¥¹ôôôÑÉ…¥¸œ¤¤±ÀôùÀ¹­¥¹ôôôÑÉ…¥¸œüŸ²vó®Âc²^Ó²Â ƒ®ÎG¶Z'²€œè¡À¹±…‰•±ñğŸ¶>'¶Z'²€œ¤¤(€€€€¹µ…À¡œôø¡í­•äéƒ¶>'¶Z$è‘íœ¹­•åõ€±±…‰•°éœ¹­•ä±½±½Èéœ¹¥Ñ•µÍlÁt¹½±½È±­¥¹éœ¹¥Ñ•µÍlÁt¹­¥¹±¥Ñ•µÌéœ¹¥Ñ•µÍô¤¤ì(€½¹ÍĞÁ…É…±±•±É½ÕÁÌõl¸¸¹Í•½¹‘…ÉåÕÈ°¸¸¹Ù…É¥…¹ÑÉ½ÕÁÌ°¸¸¹½Ñ¡•Ét¹µ…À¡œôø¡ì¸¸¹œ±½Õ¹Ğéœ¹¥Ñ•µÌ¹±•¹Ñ ±Á±…Ñ™½Éµ9ÕµÌéœ¹¥Ñ•µÌ¹µ…À¡ÀôùÀ¹Á¸¤±µ½‘•°é}ÍáA±…Ñ™½Éµ5½‘•°¡œ¹¥Ñ•µÌ¹±•¹Ñ ±œ¹±…‰•°±°¹ÍÑ…Ñ¥½¹Ím¥t¥ô¤¤ì(€É•ÑÕÉ¸íÑÉ…­Ì±µ…¥¹Ì±µ…¥¹%‘à±‰±½­Ì±Í¥‘¥¹Ì±Á…É…±±•±É½ÕÁÌ±É½ÍÌé5…Ñ ¹µ¥¸ È±É½ÍÌ¤±Á½­•ĞéÁ½­•ĞøÀ±Á±…Ñ™½ÉµÌ±¹ÕµÍôì)ô)™Õ¹Ñ¥½¸}ÍáA…É…±±•±½±Õµ¹5…À¡°±ÑÉ…¬±ÍÌ±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¥ì(€½¹ÍĞ­•åÌõíôí°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡Ì±¤¤ôù}ÍáMÑ…Ñ¥½¹Q½Á½±½ä¡°±ÑÉ…¬±ÍÌ±¤±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¤¹Á…É…±±•±É½ÕÁÌ¹™½É… ¡œôùí¥˜¡œ¹µ½‘•°¹½‰Í•ÉÙ•„ôõ™…±Í”¥­•åÍmœ¹­•åtõœíô¤¤ì(€½¹ÍĞ½ÕĞõíôí=‰©•Ğ¹­•åÌ¡­•åÌ¤¹Í½ÉĞ ¤¹™½É…  ¡¬±¤¤ôùí½¹ÍĞ´õ­•åÍm­t¹µ½‘•°í½ÕÑm­tõí½™™Í•ĞèÈÔ­¤¨ÄÔµ´¹ÑÉ…­ÍlÁt±½±½Èé­•åÍm­t¹½±½È±±…‰•°é­•åÍm­t¹±…‰•±ôíô¤ì(€É•ÑÕÉ¸½ÕĞì)ô)™Õ¹Ñ¥½¸}ÍáM¡•µ…Ñ¥QÉ…­1…å•È¡°±ÑÉ…¬±ÍÌ±d±…á¥Í`±Í…±”±½±½È±É½ÕÑ•!¥¹Ğ±½ÁÑÌ±Í•µ…¹Ñ¥I½ÕÑ”¥ì(€½ÁÑÌõ½ÁÑÍññíôì(€½¹ÍĞõàôø ­à¤¹Ñ½¥á• Ä¤±ÕÀõ…á¥Í`±‘½İ¸õ…á¥Í`¬Ô©Í…±”±äÀõelÁt±å8õemd¹±•¹Ñ ´Åtì(€±•Ğ…Õàôœœ±µ¥¹`õÕÀ±µ…á`õ‘½İ¸ì(€½¹ÍĞÑ½Á½Ìõ°¹ÍÑ…Ñ¥½¹Ì¹µ…À ¡Ì±¤¤ôù}ÍáMÑ…Ñ¥½¹Q½Á½±½ä¡°±ÑÉ…¬±ÍÌ±¤±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¤¤±Á…É…±±•±5…Àõ}ÍáA…É…±±•±½±Õµ¹5…À¡°±ÑÉ…¬±ÍÌ±É½ÕÑ•!¥¹Ğ±Í•µ…¹Ñ¥I½ÕÑ”¤ì(€½¹ÍĞÉ½ÕÑ•Ìõm4€‘í¡ÕÀ¥ô€‘í¡äÀ¥õ€±4€‘í¡‘½İ¸¥ô€‘í¡äÀ¥õtì(€°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡¹…µ”±¤¤ôùì(€€€½¹ÍĞäõem¥t±Ñ½Á¼õÑ½Á½Ím¥tì(€€€½¹ÍĞ¡…±˜õ5…Ñ ¹µ¥¸ ÈĞ°Äà­5…Ñ ¹µ…à À±Ñ½Á¼¹Á±…Ñ™½ÉµÌ´È¤¨Ä¸Ô¤±Ñ¡É½…Ğõ¡…±˜¬ÄÌì(€€€Ñ½Á¼¹ÑÉ…­Ì¹™½É…  ¡±Ñ¤¤ôùì(€€€€€¥˜¡Ñ½Á¼¹µ…¥¹%‘à¹¥¹±Õ‘•Ì¡Ñ¤¤¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞàõ…á¥Í`­©Í…±”±µ…¥¸õğÈ¸ÔıÕÀé‘½İ¸ì(€€€€€µ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±à¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±à¤ì(€€€€€½¹ÍĞµ•Ñ„õÑ½Á¼¹ÑÉ…­5•Ñ„˜™Ñ½Á¼¹ÑÉ…­5•Ñ…mÑ¥tì(€€€€€¥˜¡µ•Ñ„˜™µ•Ñ„¹½‰Í•ÉÙ•˜˜…µ•Ñ„¹½¹¹•Ñ•¥ì(€€€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡à¥ô€‘í¡äµ¡…±˜¥ô0€‘í¡à¥ô€‘í¡ä­¡…±˜¥ô4€‘í¡à´Ì¥ô€‘í¡äµ¡…±˜¥ô0€‘í¡à¬Ì¥ô€‘í¡äµ¡…±˜¥ô4€‘í¡à´Ì¥ô€‘í¡ä­¡…±˜¥ô0€‘í¡à¬Ì¥ô€‘í¡ä­¡…±˜¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÉ…¬ÑÍàµÍåµ‰½°µ‘•Ñ…¡•ˆ¼ù€ì(€€€€€õ•±Í•ì(€€€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡µ…¥¸¥ô€‘í¡äµÑ¡É½…Ğ¥ô€‘í¡µ…¥¸¥ô€‘í¡äµÑ¡É½…Ğ¬Ø¥ô°€‘í¡à¥ô€‘í¡äµ¡…±˜´Ô¥ô°€‘í¡à¥ô€‘í¡äµ¡…±˜¥ô0€‘í¡à¥ô€‘í¡ä­¡…±˜¥ô€‘í¡à¥ô€‘í¡ä­¡…±˜¬Ô¥ô°€‘í¡µ…¥¸¥ô€‘í¡ä­Ñ¡É½…Ğ´Ø¥ô°€‘í¡µ…¥¸¥ô€‘í¡ä­Ñ¡É½…Ğ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÉ…¬ˆ¼ù€ì(€€€€€ô(€€€ô¤ì(€€€Ñ½Á¼¹Í¥‘¥¹Ì¹™½É…  ¡Í¥‘¥¹œ±Í¤¤ôùì(€€€€€½¹ÍĞõÍ¥‘¥¹œ¹ì(€€€€€½¹ÍĞàõ…á¥Í`­©Í…±”±µ…¥¸õğÈ¸ÔıÕÀé‘½İ¸± õ¡…±˜´ÌµÍ¤¨È±ĞõÑ¡É½…Ğ¬Ô­Í¤¨Ìì(€€€€€µ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±à¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±à¤ì(€€€€€¥˜¡Í¥‘¥¹œ¹½¹¹•Ñ•¥ì(€€€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡µ…¥¸¥ô€‘í¡äµĞ¥ô€‘í¡µ…¥¸¥ô€‘í¡äµĞ¬Ø¥ô°€‘í¡à¥ô€‘í¡äµ ´Ô¥ô°€‘í¡à¥ô€‘í¡äµ ¥ô0€‘í¡à¥ô€‘í¡ä­ ¥ô€‘í¡à¥ô€‘í¡ä­ ¬Ô¥ô°€‘í¡µ…¥¸¥ô€‘í¡ä­Ğ´Ø¥ô°€‘í¡µ…¥¸¥ô€‘í¡ä­Ğ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÉ…¬ÑÍàµÍåµ‰½°µÍ¥‘¥¹œˆ¼ù€ì(€€€€€õ•±Í•ì(€€€€€€€€¼¼ƒ²vãªÊ3²z²^C²pƒ®Îã²€ƒ²^ÃªÊÃ²vĞƒ¶fW²vã®Bc² ƒ²V+²v ƒ¶>'¶Z'²ƒ
ß®K²vÓªÂ ƒ®.“®–àƒ²ƒ®†s
ß²rƒ²æc²ƒ²v (€€€€€€€€¼¼ƒ®Îã²ƒ²^@ƒ²Z×²®†pƒ®Úg²vÓ² ƒ²V+ªÎ€ƒ®>®šôƒ²ƒ®†s®†pƒ®w®
ã®.¸(€€€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡à¥ô€‘í¡äµ ¥ô0€‘í¡à¥ô€‘í¡ä­ ¥ô4€‘í¡à´Ì¥ô€‘í¡äµ ¥ô0€‘í¡à¬Ì¥ô€‘í¡äµ ¥ô4€‘í¡à´Ì¥ô€‘í¡ä­ ¥ô0€‘í¡à¬Ì¥ô€‘í¡ä­ ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÉ…¬ÑÍàµÍåµ‰½°µ‘•Ñ…¡•ˆ¼ù€ì(€€€€€ô(€€€ô¤ì(€€€Ñ½Á¼¹Á…É…±±•±É½ÕÁÌ¹™½É… ¡œôùì(€€€€€¥˜¡œ¹µ½‘•°¹½‰Í•ÉÙ•ôôõ™…±Í”¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÁ´õÁ…É…±±•±5…Ámœ¹­•åtí¥˜ …Á´¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÁ õ5…Ñ ¹µ¥¸ ÈÈ°ÄÜ­œ¹½Õ¹Ğ¤±ÁÉ•ØõÑ½Á½Ím¤´Åtü¹Á…É…±±•±É½ÕÁÌ¹Í½µ”¡àôùà¹­•äôôõœ¹­•ä¤±¹•áĞõÑ½Á½Ím¤¬Åtü¹Á…É…±±•±É½ÕÁÌ¹Í½µ”¡àôùà¹­•äôôõœ¹­•ä¤ì(€€€€€œ¹µ½‘•°¹ÑÉ…­Ì¹™½É… ¡ôùì(€€€€€€€½¹ÍĞàõ…á¥Í`¬¡­Á´¹½™™Í•Ğ¤©Í…±”íµ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±à¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±à¤ì(€€€€€€€½¹ÍĞµ…©½Èõœ¹­¥¹ôôôµ…¥¸ññœ¹­¥¹ôôôÙ…É¥…¹Ğœì(€€€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡à¥ô€‘í¡äµÁ ¥ô0€‘í¡à¥ô€‘í¡¹•áĞıem¤¬ÅtµÁ éä­Á ¥ôˆ±…ÍÌô‰ÑÍàµÁ…É…±±•°µÑÉ…¬‘íµ…©½ÈüœÑÍàµÁ…É…±±•°µÑÉ…¬´µµ…©½ÈœèœôˆÍÑÉ½­”ôˆ‘íœ¹½±½Éôˆ¼ù€ì(€€€€€ô¤ì(€€€€€¥˜ …ÁÉ•Ø˜™œ¹±…‰•°¥…Õà¬õ€ñÑ•áĞàôˆ‘í¡…á¥Í`¬¡œ¹µ½‘•°¹ÑÉ…­Ímœ¹µ½‘•°¹ÑÉ…­Ì¹±•¹Ñ ´Åt­Á´¹½™™Í•Ğ¤©Í…±”¬Ü¥ôˆäôˆ‘í¡ä¬Ì¥ôˆ±…ÍÌô‰ÑÍàµÁ…É…±±•°µ±…‰•°ˆ™¥±°ôˆ‘íœ¹½±½Éôˆø‘í}½ÁÍÍŒ¡œ¹±…‰•°¥ôğ½Ñ•áĞù€ì(€€€ô¤ì(€€€mÕÀ±‘½İ¹t¹™½É…  ¡ÑÉÕ¹­`±‘¥È¤ôùì(€€€€€½¹ÍĞÑ…É•Ğõ…á¥Í`­Ñ½Á¼¹µ…¥¹Ím‘¥Ét©Í…±”ì(€€€€€µ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±Ñ…É•Ğ¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±Ñ…É•Ğ¤ì(€€€€€É½ÕÑ•Ím‘¥Ét¬õ€0€‘í¡ÑÉÕ¹­`¥ô€‘í¡äµÑ¡É½…Ğ¥ô€‘í¡ÑÉÕ¹­`¥ô€‘í¡äµÑ¡É½…Ğ¬Ø¥ô°€‘í¡Ñ…É•Ğ¥ô€‘í¡äµ¡…±˜´Ô¥ô°€‘í¡Ñ…É•Ğ¥ô€‘í¡äµ¡…±˜¥ô0€‘í¡Ñ…É•Ğ¥ô€‘í¡ä­¡…±˜¥ô€‘í¡Ñ…É•Ğ¥ô€‘í¡ä­¡…±˜¬Ô¥ô°€‘í¡ÑÉÕ¹­`¥ô€‘í¡ä­Ñ¡É½…Ğ´Ø¥ô°€‘í¡ÑÉÕ¹­`¥ô€‘í¡ä­Ñ¡É½…Ğ¥õ€ì(€€€ô¤ì(€€€¥˜¡Ñ½Á¼¹É½ÍÌ¥ì(€€€€€½¹ÍĞäõäµÑ¡É½…Ğ´àì(€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡ä´à¥ô0€‘í¡‘½İ¸¥ô€‘í¡ä¬à¥ô‘íÑ½Á¼¹É½ÍÌøÄı€4€‘í¡‘½İ¸¥ô€‘í¡ä´à¥ô0€‘í¡ÕÀ¥ô€‘í¡ä¬à¥õ€èœôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÍİ¥Ñ ˆ¼ù€ì(€€€ô(€€€¥˜¡Ñ½Á¼¹Á½­•Ğ¥ì(€€€€€½¹ÍĞàô¡ÕÀ­‘½İ¸¤¼È±‘¥Èô¡¤ôôõ°¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ´Äü´ÄèÄ¤±„õä­‘¥È¨Äà±ˆõä­‘¥È¨ÌÔì(€€€€€…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡„¥ô€‘í¡ÕÀ¥ô€‘í¡„­‘¥È¨Ô¥ô°€‘í¡à¥ô€‘í¡„­‘¥È¨Ü¥ô°€‘í¡à¥ô€‘í¡„­‘¥È¨ÄÈ¥ô0€‘í¡à¥ô€‘í¡ˆ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÁ½­•Ğˆ¼øñÁ…Ñ ô‰4€‘í¡à´Ì¥ô€‘í¡ˆ¥ô0€‘í¡à¬Ì¥ô€‘í¡ˆ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÍÑ½Àˆ¼ù€ì(€€€ô(€ô¤ì(€¥˜ …°¹±½½À¥ì(€€€¥˜¡½ÁÑÌ¹Ñ•ÉµQ½À„ôõ™…±Í”¥…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡äÀ¥ô€‘í¡ÕÀ¥ô€‘í¡äÀ´ÄÌ¥ô°€‘í¡‘½İ¸¥ô€‘í¡äÀ´ÄÌ¥ô°€‘í¡‘½İ¸¥ô€‘í¡äÀ¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÕÉ¹‰…¬ˆ¼ù€ì(€€€¥˜¡½ÁÑÌ¹Ñ•Éµ	½ÑÑ½´„ôõ™…±Í”¥…Õà¬õ€ñÁ…Ñ ô‰4€‘í¡ÕÀ¥ô€‘í¡å8¥ô€‘í¡ÕÀ¥ô€‘í¡å8¬ÄÌ¥ô°€‘í¡‘½İ¸¥ô€‘í¡å8¬ÄÌ¥ô°€‘í¡‘½İ¸¥ô€‘í¡å8¥ôˆ±…ÍÌô‰ÑÍàµÍåµ‰½°µÑÕÉ¹‰…¬ˆ¼ù€ì(€ô(€½¹ÍĞÑÉÕ¹¬õÉ½ÕÑ•Ì¹µ…À ¡±‘¥È¤ôù€ñÁ…Ñ ôˆ‘í‘ô0€‘í¡‘¥Èı‘½İ¸éÕÀ¥ô€‘í¡å8¥ôˆ±…ÍÌô‰ÑÍàµÉ•…°µÑÉÕ¹¬ˆÍÑÉ½­”ôˆ‘í½±½Éôˆ¼ù€¤¹©½¥¸ œœ¤ì(€É•ÑÕÉ¸íÍÙœé€ñœ±…ÍÌô‰ÑÍàµÍåµ‰½°µ…Õàˆø‘í…Õáôğ½œøñœ±…ÍÌô‰ÑÍàµÉ•…°µÑÉÕ¹­Ìˆø‘íÑÉÕ¹­ôğ½œù€±µ¥¹`±µ…á`±Ñ½Á½Ì±Á…É…±±•±5…Áôì)ô)™Õ¹Ñ¥½¸}Íá5•ÑÉ½M•ÉÙ¥•MÑ½ÁÌ¡±¥¹•9…µ”±ÍÙ%‘à¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•9…µ•t±˜õ•¹Ğ˜™•¹Ğ¹Ğ˜™•¹Ğ¹ÑmÍÙ%‘átì(€¥˜ …•¹Ññğ…ÉÉ…ä¹¥ÍÉÉ…ä¡˜¤¥É•ÑÕÉ¸mtì(€½¹ÍĞ½ÕĞõmtí™½È¡±•Ğ¤ôÈí¤ñ˜¹±•¹Ñ í¤¬ôÌ¥í½¹ÍĞ¸õ•¹Ğ¹Ím™m¥utí¥˜¡¸„õ¹Õ±°˜™½ÕÑm½ÕĞ¹±•¹Ñ ´Åt„ôõ¸¥½ÕĞ¹ÁÕÍ ¡¸¤íô(€É•ÑÕÉ¸½ÕĞì)ô)™Õ¹Ñ¥½¸}ÍáQ½Á½±½åQÉ…¥¹1…¹”¡±…å•È±Ñ½Á¼±…á¥Í`±Í…±”±‘½İ¸±Í•ÉÙ¥•MÑ½ÁÌ¥ì(€½¹ÍĞÉ½ÕÑ•Q•áĞô¡Í•ÉÙ¥•MÑ½ÁÍññmt¤¹©½¥¸ œ€œ¤ì(€½¹ÍĞ±…¹•½İ¸õÑ½Á¼¹É•™•É•¹”˜™Ñ½Á¼¹É•™•É•¹”¹µ¥ÉÉ½Èü…‘½İ¸é‘½İ¸ì(€½¹ÍĞÉ½ÕÀõÑ½Á¼¹Á…É…±±•±É½ÕÁÌ¹™¥¹¡œôùœ¹­¥¹ôôôÙ…É¥…¹Ğœ˜˜¡œ¹É½ÕÑ•-•åÍññmt¤¹Í½µ”¡¬ôùì(€€€½¹ÍĞÁ…ÉÑÌõMÑÉ¥¹œ¡¬¤¹ÍÁ±¥Ğ ½mqÏŠIpµ| ¥t¬¼¤¹™¥±Ñ•È¡àôùà¹±•¹Ñ øôÈ¤ì(€€€É•ÑÕÉ¸Á…ÉÑÌ¹±•¹Ñ ˜™Á…ÉÑÌ¹•Ù•Éä¡ÀôùÉ½ÕÑ•Q•áĞ¹¥¹±Õ‘•Ì¡À¤¤ì(€ô¤¤ì(€¥˜¡É½ÕÀ˜™É½ÕÀ¹µ½‘•°¹½‰Í•ÉÙ•„ôõ™…±Í”¥ì(€€€½¹ÍĞÁ´õ±…å•È¹Á…É…±±•±5…ÁmÉ½ÕÀ¹­•åt±õÉ½ÕÀ¹µ½‘•°¹µ…¥¹Ím±…¹•½İ¸üÄèÁtì(€€€¥˜¡Á´¥É•ÑÕÉ¸…á¥Í`¬¡­Á´¹½™™Í•Ğ¤©Í…±”ì(€ô(€É•ÑÕÉ¸…á¥Í`­Ñ½Á¼¹µ…¥¹Ím±…¹•½İ¸üÄèÁt©Í…±”ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡…¹Ù…Ì¡°¥ì(€½¹ÍĞÑÉ…¬ô¡ÑåÁ•½˜5QI=}QI,„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}QI-m°¹¹…µ•tì(€¥˜ …ÑÉ…­ñğ…ÉÉ…ä¹¥ÍÉÉ…ä¡ÑÉ…¬¹ÍÌ¥ññÑÉ…¬¹ÍÌ¹±•¹Ñ „ôõ°¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ¡ñğ…ÉÉ…ä¹¥ÍÉÉ…ä¡ÑÉ…¬¹É¸¥ñğ…ÑÉ…¬¹É¸¹±•¹Ñ ¤(€€€É•ÑÕÉ¸}µ•ÑÉ½M¡…¹Ù…Í1•…ä¡°¤ì(€½¹ÍĞ½±½Èõ°¹½±½È±õàôø ­à¤¹Ñ½¥á• Ä¤±<ô¡ÑåÁ•½˜5QI=}<„ôôÕ¹‘•™¥¹•œ¤ı5QI=}=m°¹¹…µ•té¹Õ±°ì(€½¹ÍĞÍ•µ…¹Ñ¥Œô¡ÑåÁ•½˜9%5	%}QI-}M59Q%„ôôÕ¹‘•™¥¹•œ¤ı9%5	%}QI-}M59Q%¹…¹…±åé•1¥¹”¡ì(€€€±¥¹”é°±ÑÉ…¬±•¼é<±Í¡•‘Õ±”è¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ˜™5QI=}M!m°¹¹…µ•t¥ññ¹Õ±°°(€€€Á±…Ñ™½ÉµY•ÉÍ¥½¸èœÈÀÈØÀÜÈÜµÉ•™•É•¹”Äœ°(€€€É•™•É•¹”è¡ÑåÁ•½˜9%5	%}QI-}II9„ôôÕ¹‘•™¥¹•œ˜™9%5	%}QI-}II9¹±¥¹•Ì˜™9%5	%}QI-}II9¹±¥¹•Ím°¹¹…µ•t¥ññ¹Õ±°°(€€€É•™•É•¹•Y•ÉÍ¥½¸è¡ÑåÁ•½˜9%5	%}QI-}II9„ôôÕ¹‘•™¥¹•œ˜™9%5	%}QI-}II9¹Ù•ÉÍ¥½¸¥ñğœœ°(€€€Á…É…±±•±½±½ÉI•Í½±Ù•Èé¹…µ”ôù}µ•ÑÉ½1¥¹•½±½È¡¹…µ”¤°(€€€Á±…Ñ™½ÉµI•Í½±Ù•Èè¡É½ÕÑ”±¤¤ôù}µ•ÑÉ½MÑ…Ñ¥½¹A±…Ñ™½ÉµÌ¡É½ÕÑ”¹¹…µ•Ím¥t±°¹¹…µ”±É½ÕÑ”¹¹…µ•Ím¤´Åt±É½ÕÑ”¹¹…µ•Ím¤¬Åt¤(€ô¤é¹Õ±°ì(€½¹ÍĞµ…¥¹M•µ…¹Ñ¥ŒõÍ•µ…¹Ñ¥Œ˜™Í•µ…¹Ñ¥Œ¹É½ÕÑ•Ì˜™Í•µ…¹Ñ¥Œ¹É½ÕÑ•ÍlÁt±ÍÑ½ÁLõµ…¥¹M•µ…¹Ñ¥Œıµ…¥¹M•µ…¹Ñ¥Œ¹ÍÌé}Íá9½Éµ…±¥é•MÑ½ÁÌ¡ÑÉ…¬¹ÍÌ±ÑÉ…¬¹Ø¤ì(€½¹ÍĞdõ}Íád ¡<˜™<¹´¥ññ°¹ÍÑ…Ñ¥½¹Ì¹µ…À  ¤ôù¹Õ±°¤°ØÈ¤°…á¥Í`ôÄÈÈ°Í…±”ôÌ¸Èì(€½¹ÍĞ±…å•Èõ}ÍáM¡•µ…Ñ¥QÉ…­1…å•È¡°±ÑÉ…¬±ÍÑ½ÁL±d±…á¥Í`±Í…±”±½±½È±¹Õ±°±¹Õ±°±µ…¥¹M•µ…¹Ñ¥Œ¤ì(€½¹ÍĞÉ•¹‘•ÉQÉ…¬õì¸¸¹ÑÉ…¬±ÍÌéÍÑ½ÁMô±Á±…ÑÌõ}ÍáM¥µÁ±•A±…Ñ™½ÉµÌ¡°±É•¹‘•ÉQÉ…¬±d±…á¥Í`±Í…±”±¹Õ±°±µ…¥¹M•µ…¹Ñ¥Œ¤ì(€±•Ğ¹…µ•Í!Q50ôœœ±±…‰•±Í!Q50ôœœ±Á±…ÑMYõÁ±…ÑÌ¹ÍÙœ±ÑÉ…­MYõ±…å•È¹ÍÙœì(€±•Ğµ¥¹`õ5…Ñ ¹µ¥¸¡±…å•È¹µ¥¹`±Á±…ÑÌ¹µ¥¹`¤±µ…á`õ5…Ñ ¹µ…à¡±…å•È¹µ…á`±Á±…ÑÌ¹µ…á`¤± õemd¹±•¹Ñ ´Åt¬ĞÈì(€½¹ÍĞ•½µ•ÑÉåI¥¡Ğõµ…á`ì(€½¹ÍĞµ…¥¹%‘àõíôì°¹ÍÑ…Ñ¥½¹Ì¹™½É…  ¡Ì±¤¤ôùí¥˜¡µ…¥¹%‘ámÍtôõ¹Õ±°¥µ…¥¹%‘ámÍtõ¤ì(€€€¹…µ•Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ¹…µ”ÑÍàµ¹…µ”´µ…µ”‘í¤ôôôÁññ¤ôôõ°¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ´Äüœ•¹œèœôˆÍÑå±”ô‰Ñ½Àè‘í¡em¥t¥õÁàˆø‘í}½ÁÍÍŒ¡Ì¥ôğ½ÍÁ…¸ù€íô¤ì(€€¼¼ƒŠRŠR ƒªÂg²v ƒ®ã²€ƒ²²€èƒ².“²‚pƒ®ÚªâÃ²^´ƒ®K²vÓ²^@ƒ®{²ÚÀƒ®Îã²€ƒ²b²^C²pƒ².s²zG¶VcªÎ€ƒ¶>'¶Z'¶VcªÊ0ƒ²¶Z$ƒŠRŠR (€½¹ÍĞ‰É…¹¡I½ÕÑ•Ìõmtí±•Ğ‰É…¹¡`õ•½µ•ÑÉåI¥¡Ğ¬ĞÈì(€€ ¡ÑÉ…¬˜™ÑÉ…¬¹ˆ¥ññmt¤¹™½É…  ¡ˆ±‰¤¤ôùì(€€€¥˜ …ÉÉ…ä¹¥ÍÉÉ…ä¡ˆ¹¹…µ•Ì¥ññˆ¹¹…µ•Ì¹±•¹Ñ ğÉñğ…ÉÉ…ä¹¥ÍÉÉ…ä¡ˆ¹ÍÌ¥ñğ…ÉÉ…ä¹¥ÍÉÉ…ä¡ˆ¹É¸¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞ‰É…¹¡M•µ…¹Ñ¥ŒõÍ•µ…¹Ñ¥Œ˜™Í•µ…¹Ñ¥Œ¹É½ÕÑ•Ì˜™Í•µ…¹Ñ¥Œ¹É½ÕÑ•Ím‰¤¬Åt±‰Ìõ‰É…¹¡M•µ…¹Ñ¥Œı‰É…¹¡M•µ…¹Ñ¥Œ¹ÍÌé}Íá9½Éµ…±¥é•MÑ½ÁÌ¡ˆ¹ÍÌ±ˆ¹Ø¤±‰dõ}Íá±¥¹•‘	É…¹¡d¡ˆ¹¹…µ•Ì±µ…¥¹%‘à±d°ĞĞ¤ì(€€€½¹ÍĞ¡¥¹Ğõí±…‰•°éˆ¹±‰±ñğœœ±¹…µ•Ìéˆ¹¹…µ•Íô±‰°õì¸¸¹°±ÍÑ…Ñ¥½¹Ìéˆ¹¹…µ•Ì±±½½Àé™…±Í•ô±‰Ğõì¸¸¹ˆ±ÍÌé‰Íôì(€€€½¹ÍĞ™¥ÉÍÑ½µµ½¸õµ…¥¹%‘ámˆ¹¹…µ•ÍlÁut„õ¹Õ±°±±…ÍÑ½µµ½¸õµ…¥¹%‘ámˆ¹¹…µ•Ímˆ¹¹…µ•Ì¹±•¹Ñ ´Åut„õ¹Õ±°ì(€€€½¹ÍĞ‰1…å•Èõ}ÍáM¡•µ…Ñ¥QÉ…­1…å•È¡‰°±‰Ğ±‰Ì±‰d±…á¥Í`±Í…±”±½±½È±¡¥¹Ğ±íÑ•ÉµQ½Àè…™¥ÉÍÑ½µµ½¸±Ñ•Éµ	½ÑÑ½´è…±…ÍÑ½µµ½¹ô±‰É…¹¡M•µ…¹Ñ¥Œ¤ì(€€€½¹ÍĞ‰A±…ÑÌõ}ÍáM¥µÁ±•A±…Ñ™½ÉµÌ¡‰°±‰Ğ±‰d±…á¥Í`±Í…±”±¡¥¹Ğ±‰É…¹¡M•µ…¹Ñ¥Œ¤ì(€€€½¹ÍĞ‘àõ‰É…¹¡`µ…á¥Í`ì(€€€Á±…ÑMY¬õ€ñœÑÉ…¹Í™½É´ô‰ÑÉ…¹Í±…Ñ” ‘í¡‘à¥ô€À¤ˆø‘í‰A±…ÑÌ¹ÍÙôğ½œù€ì(€€€ÑÉ…­MY¬õ€ñœÑÉ…¹Í™½É´ô‰ÑÉ…¹Í±…Ñ” ‘í¡‘à¥ô€À¤ˆø‘í‰1…å•È¹ÍÙôğ½œù€ì(€€€€¼¼ƒªÎ×¶ÔƒªÖ³ªÂ²v`ƒ²²z
ß²vÓ¶ ƒªÊ÷ªÎ²^C²s®0ƒ®Îã²ƒªÎğƒ²^ÃªÊÃ¶Vs®.¸ƒªÎ×¶×²^´ƒ²‚®Ú®–ğƒªÂ®†s²ƒ²ró®†pƒ®²Û² ƒ²V+®*S®.¸(€€€½¹ÍĞ©Õ¹Ñ¥½¹Ìõmtíˆ¹¹…µ•Ì¹™½É…  ¡¸±¨¤ôùì(€€€€€¥˜¡µ…¥¹%‘ám¹tôõ¹Õ±°¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÁÉ•Ùá±ÕÍ¥Ù”õ¨øÀ˜™µ…¥¹%‘ámˆ¹¹…µ•Ím¨´Åutôõ¹Õ±°±¹•áÑá±ÕÍ¥Ù”õ¨¬Äñˆ¹¹…µ•Ì¹±•¹Ñ ˜™µ…¥¹%‘ámˆ¹¹…µ•Ím¨¬Åutôõ¹Õ±°ì(€€€€€¥˜¡ÁÉ•Ùá±ÕÍ¥Ù•ññ¹•áÑá±ÕÍ¥Ù•ññ¨ôôôÁññ¨ôôõˆ¹¹…µ•Ì¹±•¹Ñ ´Ä¥©Õ¹Ñ¥½¹Ì¹ÁÕÍ ¡¨¤ì(€€€ô¤ì(€€€l¸¸¹¹•ÜM•Ğ¡©Õ¹Ñ¥½¹Ì¥t¹™½É… ¡¨ôùì(€€€€€½¹ÍĞµäõemµ…¥¹%‘ámˆ¹¹…µ•Ím©uut±‰àõ‰É…¹¡`±ÍÉŒõ…á¥Í`¬Ô©Í…±”ì(€€€€€ÑÉ…­MY¬õ€ñÁ…Ñ ô‰4€‘í¡ÍÉŒ¥ô€‘í¡µä¥ô€‘í¡ÍÉŒ¬ÄÈ¥ô€‘í¡µä¥ô°€‘í¡‰à´ÄÈ¥ô€‘í¡‰em©t¥ô°€‘í¡‰à¥ô€‘í¡‰em©t¥ôˆ±…ÍÌô‰ÑÍàµ‰É…¹ µ±¥¹¬ˆÍÑÉ½­”ôˆ‘í½±½Éôˆ¼ù€ì(€€€ô¤ì(€€€½¹ÍĞ™¥ÉÍÑá±ÕÍ¥Ù”õˆ¹¹…µ•Ì¹™¥¹‘%¹‘•à¡¸ôùµ…¥¹%‘ám¹tôõ¹Õ±°¤±Ñ…Ğõ™¥ÉÍÑá±ÕÍ¥Ù”øôÀı™¥ÉÍÑá±ÕÍ¥Ù”èÀì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‰ÉÑ…œÑÍàµ‰ÉÑ…œ´µ…µ”ˆÍÑå±”ô‰±•™Ğè‘í¡‰É…¹¡`¬È¥õÁàíÑ½Àè‘í¡5…Ñ ¹µ…à ÄÈ±‰emÑ…Ñt´ÄÄ¤¥õÁàì´µÁŒè‘í½±½Éôˆø‘í}½ÁÍÍŒ¡ˆ¹±‰±ññ€‘íˆ¹¹…µ•ÍlÁu÷ŠH‘íˆ¹¹…µ•Ímˆ¹¹…µ•Ì¹±•¹Ñ ´Åuõ€¥ôğ½ÍÁ…¸ù€ì(€€€ˆ¹¹…µ•Ì¹™½É…  ¡¸±¨¤ôùí¥˜¡µ…¥¹%‘ám¹t„õ¹Õ±°¥É•ÑÕÉ¸í¹…µ•Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‰¹…µ”ÑÍàµ‰¹…µ”´µ…µ”ˆÍÑå±”ô‰±•™Ğè‘í¡‰É…¹¡`­‰1…å•È¹µ…á`µ…á¥Í`¬ä¥õÁàíÑ½Àè‘í¡‰em©t¥õÁàˆø‘í}½ÁÍÍŒ¡¸¥ôğ½ÍÁ…¸ù€íô¤ì(€€€½¹ÍĞÉ½ÕÑ”õíˆ±‰Ì±‰d±…á¥Í`é‰É…¹¡`±±…å•Èé‰1…å•È±‰°±‰Ğ±¡¥¹Ğ±•á±ÕÍ¥Ù”é¹•ÜM•Ğ¡ˆ¹¹…µ•Ì¹™¥±Ñ•È¡¸ôùµ…¥¹%‘ám¹tôõ¹Õ±°¤¥ôì(€€€‰É…¹¡I½ÕÑ•Ì¹ÁÕÍ ¡É½ÕÑ”¤ì(€€€µ…á`õ5…Ñ ¹µ…à¡µ…á`±‰É…¹¡`­5…Ñ ¹µ…à¡‰1…å•È¹µ…á`±‰A±…ÑÌ¹µ…á`¤µ…á¥Í`¬Üà¤í õ5…Ñ ¹µ…à¡ ±5…Ñ ¹µ…à ¸¸¹‰d¤¬ĞÈ¤ì(€€€‰É…¹¡`õµ…á`¬ÈØì(€ô¤ì(€€¼¼ƒŠRŠR ƒ²Â£®~'ªâÃ²
ß²ó®ÂW²€èƒ²’GªÂ²^·ªÎğƒ²Š²‚@ƒ®ª£®F@ƒ¶b²z°ƒ²^´ƒ®K²vÓ²^C²pƒ²vã²z°ƒ²ƒªÖÀƒ®ÂSªæ—²^@ƒ²rƒ²æc²€ƒ¶Fs².pƒŠRŠR (€½¹ÍĞ‘•Á½Ñ`õµ…á`¬ÌÀ±‘•Á½ÑI½İÌõíôì(€€ ¡<˜™<¹¥ññmt¤¹™½É…  ¡±‘¤¤ôùì(€€€½¹ÍĞ‰…Í•dõem¹©t„õ¹Õ±°ıem¹©téelÁt±­•äõ5…Ñ ¹É½Õ¹¡‰…Í•d¼Èà¤±É½Üõ‘•Á½ÑI½İÍm­•åuñğÀí‘•Á½ÑI½İÍm­•åtõÉ½Ü¬Äì(€€€¥˜¡¹¨ôôõd¹±•¹Ñ ´Ä¥ì(€€€€€½¹ÍĞ•¹Ñ•Èõ…á¥Í`¬È¸Ô©Í…±”±™…¹dõ‰…Í•d¬ØĞ­É½Ü¨ÌĞ±±…¹•Ìõl´ÌÀ°´ÄÔ°À°ÄÔ°ÌÁt¹µ…À¡Øôù•¹Ñ•È­Ø¤ì(€€€€€ÑÉ…­MY¬õ€ñœ±…ÍÌô‰ÑÍàµå…ÉÑÍàµå…É´µÑ•Éµ¥¹…°ˆø‘í±…¹•Ì¹µ…À ¡à±¬¤ôùì(€€€€€€€½¹ÍĞÍÉŒõ¬ğÈı…á¥Í`é…á¥Í`¬Ô©Í…±”ì(€€€€€€€É•ÑÕÉ¸€ñÁ…Ñ ô‰4€‘í¡ÍÉŒ¥ô€‘í¡‰…Í•d¬Ô¥ô€‘í¡ÍÉŒ¥ô€‘í¡‰…Í•d¬ÈĞ¥ô°€‘í¡à¥ô€‘í¡‰…Í•d¬ÈÜ¥ô°€‘í¡à¥ô€‘í¡™…¹d¥ôˆ¼ù€ì(€€€€€ô¤¹©½¥¸ œœ¥ôñÁ…Ñ ô‰4€‘í¡±…¹•ÍlÁt¥ô€‘í¡™…¹d¥ô0€‘í¡±…¹•Ím±…¹•Ì¹±•¹Ñ ´Åt¥ô€‘í¡™…¹d¥ôˆ¼øğ½œù€ì(€€€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‘•Á½ĞÑÍàµ‘•Á½Ğ´µ…µ”ˆÍÑå±”ô‰±•™Ğè‘í¡±…¹•Ím±…¹•Ì¹±•¹Ñ ´Åt¬ÄÈ¥õÁàíÑ½Àè‘í¡™…¹d´à¥õÁàˆûÂ~>´€‘í}½ÁÍÍŒ¡MÑÉ¥¹œ¡¹¸¤¹É•Á±…” Ÿ²Â£®~'²
³²^²0œ°Ÿ²
³²^²0œ¤¥ôğ½ÍÁ…¸ù€ì(€€€€€µ¥¹`õ5…Ñ ¹µ¥¸¡µ¥¹`±±…¹•ÍlÁt¤íµ…á`õ5…Ñ ¹µ…à¡µ…á`±±…¹•Ím±…¹•Ì¹±•¹Ñ ´Åt¬ÄÌÀ¤í õ5…Ñ ¹µ…à¡ ±™…¹d¬ÈĞ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€½¹ÍĞàõ‘•Á½Ñ`­É½Ü¨ĞÈ±äõ‰…Í•d­É½Ü¨Äà±ÍÉŒõ…á¥Í`¬Ô©Í…±”ì(€€€ÑÉ…­MY¬õ€ñœ±…ÍÌô‰ÑÍàµå…ÉˆøñÁ…Ñ ô‰4€‘í¡ÍÉŒ¥ô€‘í¡‰…Í•d¥ô€‘í¡ÍÉŒ¬ÄĞ¥ô€‘í¡‰…Í•d¥ô°€‘í¡à´ÄĞ¥ô€‘í¡ä¥ô°€‘í¡à¥ô€‘í¡ä¥ôˆ¼ù€¬(€€€€€lÀ°Ä°Ét¹µ…À¡¬ôù€ñÁ…Ñ ô‰4€‘í¡à­¬¨à¥ô€‘í¡ä´ÈÀ¥ô0€‘í¡à­¬¨à¥ô€‘í¡ä¬ÈÀ¥ôˆ¼ù€¤¹©½¥¸ œœ¤¬(€€€€€€ñÁ…Ñ ô‰4€‘í¡à¥ô€‘í¡ä´ÄĞ¥ô0€‘í¡à¬à¥ô€‘í¡ä´Ü¥ô0€‘í¡à¬ÄØ¥ô€‘í¡ä¥ô4€‘í¡à¥ô€‘í¡ä¬ÄĞ¥ô0€‘í¡à¬à¥ô€‘í¡ä¬Ü¥ô0€‘í¡à¬ÄØ¥ô€‘í¡ä¥ôˆ¼øğ½œù€ì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµ‘•Á½ĞÑÍàµ‘•Á½Ğ´µ…µ”ˆÍÑå±”ô‰±•™Ğè‘í¡à¬ÈÜ¥õÁàíÑ½Àè‘í¡ä¥õÁàˆûÂ~>´€‘í}½ÁÍÍŒ¡MÑÉ¥¹œ¡¹¸¤¹É•Á±…” Ÿ²Â£®~'²
³²^²0œ°Ÿ²
³²^²0œ¤¥ôğ½ÍÁ…¸ù€ì(€€€µ…á`õ5…Ñ ¹µ…à¡µ…á`±à¬ÄÌÀ¤í õ5…Ñ ¹µ…à¡ ±ä¬Ìà¤ì(€ô¤ì(€±•Ğ¹ĞôÀì½¹ÍĞÑÉ…¥¹Ìõmtì(€}µ•ÑÉ½1¥¹•1¥Ù•QÉ…¥¹Ì¡°¹¹…µ”¤¹™½É… ¡Ğôùì(€€€½¹ÍĞÍ•ÉÙ¥•MÑ½ÁÌõ}Íá5•ÑÉ½M•ÉÙ¥•MÑ½ÁÌ¡°¹¹…µ”±Ğ¹ÍÙ%‘à¤ì(€€€½¹ÍĞ‰É…¹ õ‰É…¹¡I½ÕÑ•Ì¹™¥¹¡ÈôùÍ•ÉÙ¥•MÑ½ÁÌ¹Í½µ”¡¸ôùÈ¹•á±ÕÍ¥Ù”¹¡…Ì¡¸¤¤˜™È¹ˆ¹¹…µ•Ì¹¥¹±Õ‘•Ì¡Ğ¹™É½µMÑ¸¤˜™È¹ˆ¹¹…µ•Ì¹¥¹±Õ‘•Ì¡Ğ¹Ñ½MÑ¸¤¤ì(€€€¥˜¡‰É…¹ ¥ì(€€€€€½¹ÍĞ™¤õ‰É…¹ ¹ˆ¹¹…µ•Ì¹¥¹‘•á=˜¡Ğ¹™É½µMÑ¸¤±Ñ¤õ‰É…¹ ¹ˆ¹¹…µ•Ì¹¥¹‘•á=˜¡Ğ¹Ñ½MÑ¸¤í¥˜¡™¤ğÁññÑ¤ğÀ¥É•ÑÕÉ¸í¹Ğ¬¬ì(€€€€€½¹ÍĞ‘½İ¸õÑ¤ù™¤±ÌõĞ¹…ÑMÑ…Ñ¥½¸ı‰É…¹ ¹‰Ím™¥té‰É…¹ ¹‰Ím™¥t­Ğ¹™É…Œ¨¡‰É…¹ ¹‰ÍmÑ¥tµ‰É…¹ ¹‰Ím™¥t¤ì(€€€€€½¹ÍĞÑ½Á¼õ‰É…¹ ¹±…å•È¹Ñ½Á½Ím™¥t±àõ}ÍáQ½Á½±½åQÉ…¥¹1…¹”¡‰É…¹ ¹±…å•È±Ñ½Á¼±‰É…¹ ¹…á¥Í`±Í…±”±‘½İ¸±Í•ÉÙ¥•MÑ½ÁÌ¤ì(€€€€€ÑÉ…¥¹Ì¹ÁÕÍ ¡íà±äé}ÍáQÉ…­d¡Ì±‰É…¹ ¹‰Ì±‰É…¹ ¹‰d¤±‘½İ¸±‘•ÍĞéĞ¹‘•ÍĞ±¥éL‘íMÑÉ¥¹œ¡Ğ¹ÍÙ%‘à¬Ä¤¹Á…‘MÑ…ÉĞ Ğ°œÀœ¥õô¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€½¹ÍĞ™¤õµ…¥¹%‘ámĞ¹™É½µMÑ¹t±Ñ¤õµ…¥¹%‘ámĞ¹Ñ½MÑ¹tí¥˜¡™¤ôõ¹Õ±±ññÑ¤ôõ¹Õ±°¥É•ÑÕÉ¸í¹Ğ¬¬ì(€€€½¹ÍĞ‘½İ¸õÑ¤ù™¤±ÌõĞ¹…ÑMÑ…Ñ¥½¸ıÍÑ½ÁMm™¥téÍÑ½ÁMm™¥t­Ğ¹™É…Œ¨¡ÍÑ½ÁMmÑ¥tµÍÑ½ÁMm™¥t¤±Ñ½Á¼õ±…å•È¹Ñ½Á½Ím™¥tì(€€€½¹ÍĞàõ}ÍáQ½Á½±½åQÉ…¥¹1…¹”¡±…å•È±Ñ½Á¼±…á¥Í`±Í…±”±‘½İ¸±Í•ÉÙ¥•MÑ½ÁÌ¤ì(€€€ÑÉ…¥¹Ì¹ÁÕÍ ¡íà±äé}ÍáQÉ…­d¡Ì±ÍÑ½ÁL±d¤±‘½İ¸±‘•ÍĞéĞ¹‘•ÍĞ±¥éL‘íMÑÉ¥¹œ¡Ğ¹ÍÙ%‘à¬Ä¤¹Á…‘MÑ…ÉĞ Ğ°œÀœ¥õô¤ì(€ô¤ì(€ÑÉ…¥¹Ì¹Í½ÉĞ ¡„±ˆ¤ôù„¹äµˆ¹ä¤ì½¹ÍĞ½ÕÁ¥•õmtì(€ÑÉ…¥¹Ì¹™½É…  ¡Ğ±¤¤ôùì(€€€±•ĞÍ¡¥™ĞôÀìİ¡¥±”¡½ÕÁ¥•¹Í½µ”¡¼ôù5…Ñ ¹…‰Ì¡¼¹äµĞ¹ä¤ğÄà˜™¼¹Í¡¥™ĞôôõÍ¡¥™Ğ¤¥Í¡¥™Ğ¬¬í½ÕÁ¥•¹ÁÕÍ ¡íäéĞ¹ä±Í¡¥™Ñô¤ì(€€€½¹ÍĞÍ¥‘”õĞ¹‘½İ¸üÄè´Ä±ÑàõĞ¹à­Í¥‘”¨ ÄÈ­Í¡¥™Ğ¨Ìà¤ì(€€€±…‰•±Í!Q50¬õ€ñÍÁ…¸±…ÍÌô‰ÑÍàµÑÉ…¥¸µ…ÉÉ½Ü€‘íĞ¹‘½İ¸ü‘½İ¸œèÕÀôˆÍÑå±”ô‰±•™Ğè‘í¡Ğ¹à¥õÁàíÑ½Àè‘í¡Ğ¹ä¥õÁàˆø‘íĞ¹‘½İ¸üŸŠZğœèŸŠZÈôğ½ÍÁ…¸ù€¬(€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÍàµÑÉ…¥¸µ…ÉˆÍÑå±”ô‰±•™Ğè‘í¡Ñà¥õÁàíÑ½Àè‘í¡Ğ¹ä¥õÁàíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ‘íĞ¹‘½İ¸üœÀœèœ´ÄÀÀ”ô°´ÔÀ”¤ì´µÑŒè‘í½±½Éôˆøñˆø‘íĞ¹¥‘ôğ½ˆøñÍÁ…¸ø‘í}½ÁÍÍŒ¡Ğ¹‘•ÍĞ¥÷¶Z$ğ½ÍÁ…¸øğ½ÍÁ…¸ù€ì(€ô¤ì(€ õ5…Ñ ¹•¥°¡ ¤í½¹ÍĞÍ¡¥™Ñ`õ5…Ñ ¹µ…à À°ÜĞµµ¥¹`¤±\õ5…Ñ ¹•¥°¡µ…á`­Í¡¥™Ñ`¬Äà¤ì(€€¼¼ƒ².“²‚p“ªÂ ƒ²v3²"c²vàƒ²ƒ®†sªÂ ƒ²vÓ®šƒªÊ3¶Ã®–ğƒ²æ£®ÊS¶Vc®¦Ğƒ²ƒ®†s
ß®vó®Ê£®0ƒ¶V£ªî`ƒ²jÃ²â„ƒ²vÓ®>g¶Vs®.¸(€½¹ÍĞÍÙœõ€ñÍÙœ±…ÍÌô‰ÑÍàµÍÙœˆİ¥‘Ñ ôˆ‘í]ôˆ¡•¥¡Ğôˆ‘í!ôˆÙ¥•İ	½àôˆÀ€À€‘í]ô€‘í!ôˆøñœÑÉ…¹Í™½É´ô‰ÑÉ…¹Í±…Ñ” ‘í¡Í¡¥™Ñ`¥ô€À¤ˆøñœ±…ÍÌô‰ÑÍàµÁ±…Ñ±…å•Èˆø‘íÁ±…ÑMYôğ½œøñœ±…ÍÌô‰ÑÍàµÑÉ…­±…å•Èˆø‘íÑÉ…­MYôğ½œøğ½œøğ½ÍÙœù€ì(€¥˜¡Í¡¥™Ñ`¤±…‰•±Í!Q50õ±…‰•±Í!Q50¹É•Á±…” ½±•™Ğè¡lÀ´ä¸µt¬¥Áà½œ°¡´±Ø¤ôù±•™Ğè‘í¡9Õµ‰•È¡Ø¤­Í¡¥™Ñ`¥õÁá€¤ì(€É•ÑÕÉ¸í¹Ğ±¡Ñµ°é€ñ‘¥Ø±…ÍÌô‰ÑÍàµ…¹Ù…ÌÑÍàµ…¹Ù…Ì´µ…µ”ˆÍÑå±”ô‰¡•¥¡Ğè‘í!õÁàíİ¥‘Ñ è‘í]õÁàì´µµŒè‘í½±½Éôˆø‘íÍÙô‘í¹…µ•Í!Q51ô‘í±…‰•±Í!Q51ôğ½‘¥Øùôì)ô(¼¼ƒŠRŠR ƒ²²^Àƒ²b#²â„ƒ®ª£®6à€£®ã²ƒ
ß®NÇªâ'®Îƒ¶fW®–€¿²b#²ƒ²²^À¤ƒŠRŠR (¼¼ƒŠRŠR ƒ²²^Àƒ²b#®ÎĞ¿².s®º³®‚#²vÓ²`ƒ²^S²²v ©Ì½™•…ÑÕÉ•Ì½¹¥µ‰¥}‘•±…ä¹©Ï®†pƒ®Ú®š°€¡1e}5=3
İ}‘•±…å½É•…ÍÓ
İ}Í¥µAÉ½™¥±—
İ}Í¥µ•±…ç
İ}Í¥µ¥¹…±•±…ç
İ}±¥Ù••±…å=›
İ}Í¥µ…ÕÍ•MÕµµ…Éç
İ}Í¥µÙ•¹Ñ1½œƒ®NÄ¤ƒŠRŠR (¼¼ƒ¶G²*äƒ²^³²‚Tƒ¶^“®6S²j¤ƒ²²^Àƒ²b#®ÎĞƒ²æ¤)™Õ¹Ñ¥½¸}‘•±…å¡¥Á!Q50¡Ğ¥ì(€½¹ÍĞ˜õ}‘•±…å½É•…ÍĞ¡Ğ¹±¥¹”±Ğ¹É…‘”¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‘•±…äµ¡¥ÀˆÍÑå±”ôˆ´µ‘Œè‘í˜¹½±½ÉôˆøñÍÁ…¸±…ÍÌô‰‘•±…äµ‘½Ğˆøğ½ÍÁ…¸øñˆû²²^Àƒ²b#®ÎĞ€‘í˜¹±…‰•±ôğ½ˆøñÍÁ…¸±…ÍÌô‰‘•±…äµµ•Ñ„ˆû¶fW®–€€‘í˜¹ÁÉ½‰ô”ƒ
Üƒ²b#²€¬‘í˜¹µ¥¹õø‘í˜¹µ…á÷®Úğ½ÍÁ…¸øğ½‘¥Øù€ì)ô(¼¼ƒ²^Ó²Â ƒ²²àƒ®¦S¶²’²j¤ƒ²²^Àƒ²b#®ÎĞ£®ÂÃ®#ªÂ ƒ²V®.0ƒ²‚W®ÎĞƒ¶Vpƒ²’®†p¤)™Õ¹Ñ¥½¸}‘•±…å5•Ñ…!Q50¡Ğ¥ì(€½¹ÍĞ˜õ}‘•±…å½É•…ÍĞ¡Ğ¹±¥¹”±Ğ¹É…‘”¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‘•Ñ…¥°µµ•Ñ„ˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÉÁàˆû²²^Àƒ²b#®ÎĞ€ñˆÍÑå±”ô‰½±½Èè‘í˜¹½±½Éôˆø‘í˜¹±…‰•±ôğ½ˆø€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû
Üğ½ÍÁ…¸øƒ¶fW®–€€‘í˜¹ÁÉ½‰ô”€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû
Üğ½ÍÁ…¸øƒ²b#²€¬‘í˜¹µ¥¹õø‘í˜¹µ…á÷®Úğ½‘¥Øù€ì)ô(¼¼ƒ²b#®“
ß²*ç²Â£ªÚ3²j¤ƒ²öS®‚#²vó¶‡².tƒ²²^Àƒ²V#®
Ğ£²b#²ƒ²²^Ã²vĞƒ²z#®*Pƒ²^Ó²Â£®0¤¸ƒ¶b²z°ƒ²jÓ¶Z$ƒ²’G²vÓ®¦Ğƒ².“².sªÂƒ²²^Ã®>ƒ¶V£ªî`¸)™Õ¹Ñ¥½¸}‰½½­¥¹•±…å	…¹¹•É!Q50¡Ğ±ÑÉ…Ù•±…Ñ”¥ì(€¥˜¡ÑÉ…Ù•±…Ñ”˜™ÑåÁ•½˜}Í¥µQ¥­•Ñ5…Ñ¡•ÍM•ÉÙ¥•…äôôô™Õ¹Ñ¥½¸œ˜˜…}Í¥µQ¥­•Ñ5…Ñ¡•ÍM•ÉÙ¥•…ä¡Ğ±ÑÉ…Ù•±…Ñ”¤¥É•ÑÕÉ¸€œœì(€½¹ÍĞ•ÍĞõ}Í¥µ¥¹…±•±…ä¡Ğ±ÑÉ…Ù•±…Ñ”¤ì¥˜¡•ÍĞğôÀ¥É•ÑÕÉ¸€œœì(€½¹ÍĞ±¥Ù”õ}±¥Ù••±…å=˜¡Ğ¤ì(€½¹ÍĞ±¥Ù•QáĞõ±¥Ù”øÀı€ñ‰ÈøñÍÁ…¸±…ÍÌô‰‰¬µ‘•±…äµ±¥Ù”ˆû¶b²z°ƒ²Vô€‘í±¥Ù•÷®Úƒ²²^Àƒ²jÓ¶Z$ƒ²’Dğ½ÍÁ…¸ù€èœœì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµ‘•±…äµ‰…¹¹•Èˆø(€€€€ñ‘¥Ø±…ÍÌô‰‰¬µ‘•±…äµ¡•…ˆûŠjƒ¾â<ƒ²ƒ¶w¶Vc².€ƒ²^Ó²Â£®*P€ñˆû²Vô€‘í•ÍÑ÷®Úƒ²²^Àƒ²b#²ğ½ˆøƒ²^Ó²Â£²z®.#®.ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‰¬µ‘•±…äµ¹½Ñ”ˆû²^Ó²Â ƒ²jÓ¶Z$ƒ²
³¶V·²vƒ¶fW²vã¶VcªÎ€ƒªÖ³²z¶Vc²ã²jP¸ƒ²²^Ã²^@ƒ®RÃ®–àƒ®Î®>ƒ®ÂÃ²²v ƒ²^²*×®.#®.¸‘í±¥Ù•QáÑôğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô(¼¼ƒ²²^Àƒ²b#²â„ƒ¶´èƒ²ªâ ƒ²²^Àƒ²jÓ¶Z$ƒ²’G²vàƒ²^Ó²Â ƒ®ª§®†t)™Õ¹Ñ¥½¸}‘•±…å•‘QÉ…¥¹Í!Q50 ¥ì(€¥˜ …}Í¥µ•±…å=¸¥É•ÑÕÉ¸€œœì(€½¹ÍĞ¸õ¹•Ü…Ñ” ¤°¹´õ¸¹•Ñ!½ÕÉÌ ¤¨ØÀ­¸¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞÉ½İÌõmtì(€11}QI%9L¹™½É… ¡Ğôùì(€€€½¹ÍĞõ}Í¥µ•±…ä¡Ğ±¹´¤ì¥˜¡ğôÀ¥É•ÑÕÉ¸ì(€€€½¹ÍĞÍĞõ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ°¹´µ¤ì¥˜ …ÍÑññÍĞ¹ÍÑ…ÑÕÌ„ôôÉÕ¹¹¥¹œœ¥É•ÑÕÉ¸ì(€€€½¹ÍĞÁ½ÌõÍĞ¹…ÑMÑ¸ı€‘íÍĞ¹…ÑMÑ¹ôƒ²‚W²Â¡€è¡ÍĞ¹Á…ÍÍMÑ¸ı€‘íÍĞ¹Á…ÍÍMÑ¹ôƒ¶×ªÎñ€è¡ÍĞ¹ÁÉ•ÙMÑ¸˜™ÍĞ¹¹•áÑMÑ¸ı€‘íÍĞ¹ÁÉ•ÙMÑ¹÷ŠH‘íÍĞ¹¹•áÑMÑ¹õ€èŸ²jÓ¶Z$ƒ²’Dœ¤¤ì(€€€É½İÌ¹ÁÕÍ ¡íĞ±±Á½Íô¤ì(€ô¤ì(€É½İÌ¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹µ„¹¤ì(€¥˜ …É½İÌ¹±•¹Ñ ¥É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‘•±…å•µ•µÁÑäˆû¶b²z°ƒ²²^Àƒ²jÓ¶Z$ƒ²’G²vàƒ²^Ó²Â£ªÂ ƒ²^²*×®.#®.¸ğ½‘¥Øù€ì(€½¹ÍĞ°õœôø¡ÑåÁ•½˜0„ôôÕ¹‘•™¥¹•œ˜™1mt¥ññœì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰‘•±…å•µ±¥ÍĞˆø(€€€€ñ‘¥Ø±…ÍÌô‰‘•±…å•µ¡•…ˆûÂ~RĞƒ²ªâ ƒ²²^Àƒ²jÓ¶Z$ƒ²’D€ñˆø‘íÉ½İÌ¹±•¹Ñ¡ôğ½ˆû¶:à€ñÍÁ…¸±…ÍÌô‰‘•±…å•µÍÕˆˆû®"®–Ó®¦Ğƒ¶G²*äƒ²^³²‚Tğ½ÍÁ…¸øğ½‘¥Øø(€€€€‘íÉ½İÌ¹Í±¥” À°ĞÀ¤¹µ…À¡Èôù€ñ‰ÕÑÑ½¸±…ÍÌô‰‘•±…å•µÉ½Üˆ½¹±¥¬ô‰½Á•¹)½ÕÉ¹•ä œ‘íÈ¹Ğ¹¹½ôœ¤ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰‘°µÉ…‘”ˆÍÑå±”ô‰‰…­É½Õ¹è‘ì¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmÈ¹Ğ¹É…‘•t¥ñğœŒàààôˆø‘í}½ÁÍÍŒ¡°¡È¹Ğ¹É…‘”¤¥ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰‘°µ¹¼ˆø‘í}½ÁÍÍŒ¡È¹Ğ¹¹¼¥ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰‘°µÉ½ÕÑ”ˆø‘í}½ÁÍÍŒ¡È¹Ğ¹ÍÑ½ÁÍlÁt¹Ì¥÷ŠH‘í}½ÁÍÍŒ¡È¹Ğ¹‘•ÍĞ¥ôƒ
Ü€‘í}½ÁÍÍŒ¡È¹Á½Ì¥ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰‘°µ‘•±…äˆø¬‘íÈ¹‘÷®Úğ½ÍÁ…¸ø(€€€€ğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€€€‘íÉ½İÌ¹±•¹Ñ øĞÀı€ñ‘¥Ø±…ÍÌô‰‘•±…å•µµ½É”ˆû²fà€‘íÉ½İÌ¹±•¹Ñ ´ĞÁ÷¶:àğ½‘¥Øù€èœô(€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸Ñ½±•M¥µ•±…ä ¥ì(€}Í¥µ•±…å=¸ô…}Í¥µ•±…å=¸ì(€ÑÉåí±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ¹¥µ‰¥}Í¥µ‘•±…äœ±}Í¥µ•±…å=¸üœÄœèœÀœ¤íõ…Ñ ¡”¥íô(€½¹ÍĞÍŒõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµÍÕˆµ½¹Ñ•¹Ğœ¤ì(€¥˜¡ÍŒ˜™ÍŒ¹ÅÕ•ÉåM•±•Ñ½È œ¹Í•Ğµµ½‘•Ìœ¤¥É•¹‘•ÉM•ÑÑ¥¹ÍM•Ñ¥½¸¡ÍŒ¤ì(€¥˜¡ÑåÁ•½˜É•¹‘•ÉM%½¹Ñ•¹Ğôôô™Õ¹Ñ¥½¸œ¥í½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµ‘•±…äœ¤ì¥˜¡•°˜™‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Á…¹•°µ‘•±…äœ¤ü¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì …Ñ¥Ù”œ¤¥É•¹‘•ÉM%•±…ä¡•°¤íô(€½¹ÍĞ‘”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµ‘•±…äœ¤ì¥˜¡‘”˜™‘”¹½™™Í•ÑA…É•¹Ğ„ôõ¹Õ±°¥É•¹‘•ÉM%•±…ä¡‘”¤ì(€¥˜¡}©½ÕÉ¹•å9¼˜™ÑåÁ•½˜}É•¹‘•É)½ÕÉ¹•äôôô™Õ¹Ñ¥½¸œ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ©½ÕÉ¹•äµ‰½‘äœ¤ì¥˜¡ˆ¥ˆ¹}ÍÉ½±±•‘=¹”õÑÉÕ”ì}É•¹‘•É)½ÕÉ¹•ä ¤íô(€¥˜¡}Í¥	½…É‘9…µ”˜™ÑåÁ•½˜}‘É…İMÑ…Ñ¥½¹	½…Éôôô™Õ¹Ñ¥½¸œ¥}‘É…İMÑ…Ñ¥½¹	½…É ¤ì(€¥˜¡ÑåÁ•½˜ÕÁ‘…Ñ•5…ÁQÉ…¥¹Ìôôô™Õ¹Ñ¥½¸œ˜™}µ…ÁÕÉÉ•¹Ñ1¥¹”¥ÕÁ‘…Ñ•5…ÁQÉ…¥¹Ì ¤ì)ô)™Õ¹Ñ¥½¸}½ÕÑ±½½­!Q50 ¥ì(€¥˜ …}Í¥µ•±…å=¹ññÑåÁ•½˜}Í¥µ=ÕÑ±½½¬„ôô™Õ¹Ñ¥½¸œ¥É•ÑÕÉ¸€œœì(€½¹ÍĞ¼õ}Í¥µ=ÕÑ±½½¬¡İ¥¹‘½Ü¹}½±±°üÄÀÀÀÀèà¤ì¥˜ …¼¥É•ÑÕÉ¸€œœì(€½¹ÍĞ}¸õ¹•Ü…Ñ” ¤°¹½İ5¥¸õ}¸¹•Ñ!½ÕÉÌ ¤¨ØÀ­}¸¹•Ñ5¥¹ÕÑ•Ì ¤ì(€€¼¼ƒ²®. ƒ®2¶FpƒªâÃ²²v ƒ¶b²z°ƒ².sªÂ
ß²²^´ƒªâÃ²’²ró®†pƒ²z³ªÎ²
À£¶Vc® Á•…¬ƒ®.£²vóªÂHƒ²V®.`¤ƒŠHƒ²²^´ƒ®ª£²"pƒ¶VÓ²0(€½¹ÍĞ¡°ô¡ÑåÁ•½˜}İá!•…‘±¥¹”ôôô™Õ¹Ñ¥½¸œ¤ı}İá!•…‘±¥¹”¡¹½İ5¥¸¤é¹Õ±°ì(€½¹ÍĞ¡•…‘]•…Ñ¡•Èõ¡°ı¡°¹ÁÉ¥µ…Éå]•…Ñ¡•Èé¼¹Ñà¹İ•…Ñ¡•Èì(€½¹ÍĞ¡•…‘1…‰•°õ¡°ı¡°¹±…‰•°é¼¹Ñà¹İ•…Ñ¡•Èì(€½¹ÍĞİá%¼õìŸ®G²v0œèŸŠb¾â<œ°Ÿ²V#ªÂpœèŸÂ~2¯¾â<œ°ŸªÂW¶J4œèŸÂ~J œ°Ÿ¶>·²^ğœèŸÂ~2‡¾â<œ°Ÿ®æœèŸÂ~2Ÿ¾â<œ°Ÿ¶>·²jÀœèŸŠn#¾â<œ°Ÿ¶>·²œèŸŠv¾â<œ°Ÿ¶s¶J4œèŸÂ~2 õm¡•…‘]•…Ñ¡•ÉuñğŸÂ~2“¾â<œì(€½¹ÍĞ‰…õ¡•…‘]•…Ñ¡•È„ôôŸ®G²v0œì(€½¹ÍĞÉ•…±]àô¡¡°ı¡°¹Í½ÕÉ”é¼¹Ñà¹İ•…Ñ¡•ÉM½ÕÉ”¤ôôôŸ².“²‚pƒ²b#®ÎĞœì(€½¹ÍĞÍÉ1…‰•°õ¡°ı¡°¹Í½ÕÉ”è¡¼¹Ñà¹İ•…Ñ¡•ÉM½ÕÉ”ôôôŸ².“²‚pƒ²b#®ÎĞœüŸ².“²‚pƒ²b#®ÎĞœèŸ®.c®æ®‚#²vğƒ².s®º³®‚#²vÓ²`ƒ²b#®ÎĞœ¤ì(€½¹ÍĞ¥¹™½	Ñ¸ô¡¡°˜™¡°¹¡…ÍI•¥½¹Ì¤ı€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰İ•…Ñ¡•Èµ¥¹™¼µ‰Ñ¸ˆ…É¥„µ±…‰•°ô‹²²^·®Îƒ®
ƒ²R ƒ²²àƒ®ÎÓªâÀˆ½¹±¥¬ô‰½Á•¹I•¥½¹…±]•…Ñ¡•É5½‘…° ¤ˆûŠN`ğ½‰ÕÑÑ½¸ù€èœœì(€½¹ÍĞÁ•…­]àõÉ•…±]à˜™‰…˜™¼¹Ñà¹É•¥½¸ı€‘í}½ÁÍÍŒ¡¼¹Ñà¹É•¥½¸¥ô€‘íMÑÉ¥¹œ¡¼¹Ñà¹¡½ÕÈ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥÷².pƒ²b¶Z”ƒ²G²’E€èœœì(€½¹ÍĞ°õœôø¡ÑåÁ•½˜0„ôôÕ¹‘•™¥¹•œ˜™1mt¥ññœì(€½¹ÍĞÉ½İÌõ¼¹É½İÌ¹µ…À¡Èôùì(€€€½¹ÍĞÉ¹œõÈ¹É…¹•Q•áÑññ€‘íÈ¹•ÍÑ÷®Úƒ®
Ó²fá€ì(€€€½¹ÍĞŒô¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmÈ¹Ğ¹É…‘•t¥ñğœŒàààœì(€€€½¹ÍĞÍ•ØõÈ¹•ÍĞøôÄÔüÈœéÈ¹•ÍĞøôàü¼œèäœì(€€€É•ÑÕÉ¸€ñ‰ÕÑÑ½¸±…ÍÌô‰½°µÉ½Üˆ½¹±¥¬ô‰½Á•¹)½ÕÉ¹•ä œ‘í}½ÁÍÍŒ¡È¹Ğ¹¹¼¥ôœ¤ˆøñÍÁ…¸±…ÍÌô‰½°µÉ…‘”ˆÍÑå±”ô‰‰…­É½Õ¹è‘íôˆø‘í}½ÁÍÍŒ¡°¡È¹Ğ¹É…‘”¤¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰½°µ¹¼ˆø‘í}½ÁÍÍŒ¡È¹Ğ¹¹¼¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰½°µÉ½ÕÑ”ˆø‘í}½ÁÍÍŒ¡È¹Ğ¹ÍÑ½ÁÍlÁt¹Ì¥ôñÍÁ…¸±…ÍÌô‰½°µ…ÉÈˆûŠHğ½ÍÁ…¸ø‘í}½ÁÍÍŒ¡È¹Ğ¹‘•ÍĞ¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰½°µÉ¹œ½°µÍ•Ø´‘íÍ•Ùôˆø‘íÉ¹ôğ½ÍÁ…¸ø‘íÈ¹…ÕÍ”ı€ñÍÁ…¸±…ÍÌô‰½°µèˆø ‘í}½ÁÍÍŒ¡È¹…ÕÍ”¥ô¤ğ½ÍÁ…¸ù€èœôğ½‰ÕÑÑ½¸ù€ì(€ô¤¹©½¥¸ œœ¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰½ÕÑ±½½¬µ…É‘í‰…üœ‰…œèœôˆø(€€€€ñ‘¥Ø±…ÍÌô‰½°µ¡•…ˆø‘íİá%½ôƒ²b“®*c²v`ƒ²jÓ¶Z$ƒ²‚®t€‘í¥¹™½	Ñ¹ô€ñÍÁ…¸±…ÍÌô‰½°µİàˆø‘í}½ÁÍÍŒ¡¡•…‘1…‰•°¥ôƒ
Ü€‘í¼¹Ñà¹İ••­•¹üŸ²ó®C
ßªÎ×¶rÓ²vğœèŸ¶>'²vğôğ½ÍÁ…¸øğ½‘¥Øø(€€€€‘í¼¹É½İÌ¹±•¹Ñ ı€ñ‘¥Ø±…ÍÌô‰½°µ‘•ÍŒˆø‘í‰…ı€‘í}½ÁÍÍŒ¡¡•…‘]•…Ñ¡•È¥ôƒ²b#®ÎÓ®–ğƒ®Âc²b¶VĞƒ®.“²v0ƒ²^Ó²Â£²v`ƒ²²^ÀƒªÂ®*—²Ç²vƒªÎ²
Ã¶Z#²*×®.#®.¹€èŸ².“²‚pƒ²b#®ÎÓ®–ğƒ®Âc²b¶VpƒªÊÃªÎğƒ®.“²v0ƒ²^Ó²Â£²v`ƒ²²^ÀƒªÂ®*—²Ç²vĞƒ²z#²*×®.#®.¸ôğ½‘¥Øø‘íÉ½İÍô‘í¼¹Ñ½Ñ…°øàı€ñ‰ÕÑÑ½¸±…ÍÌô‰½°µ…±±‰Ñ¸ˆ½¹±¥¬ô‰İ¥¹‘½Ü¹}½±±°ô…İ¥¹‘½Ü¹}½±±°íÙ…È”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµ‘•±…äœ¤í¥˜¡”¥É•¹‘•ÉM%•±…ä¡”¤ˆø‘íİ¥¹‘½Ü¹}½±±°üŸ²‚GªâÀƒŠZÈœéƒ²‚²ÊĞ€‘í¼¹Ñ½Ñ…±÷¶:àƒ®ÎÓªâÀƒŠZñôğ½‰ÕÑÑ½¸ù€èœõ€(€€€€€€é€ñ‘¥Ø±…ÍÌô‰½°µ‘•ÍŒˆû¶b²z°ƒ²²^Ã²vĞƒ²b#®ÎÓ®Bpƒ²^Ó²Â£ªÂ ƒ²^²*×®.#®.¸ƒ²‚ƒ²^Ó²Â ƒ²‚W²ƒ²jÓ¶Z'²vĞƒ²b#²®B§®.#®.¸ğ½‘¥Øùô(€€€€ñ‘¥Ø±…ÍÌô‰½°µ…Ù•…Ğˆø(€€€€€ƒ²b#²â‡²v ƒ¶fW²‚W²vĞƒ²V®.#®¦À°ƒªâÃ²ƒ¶bã²‚ƒ®NÇ²^@ƒ®RÃ®vğƒ²‚W²ƒ²jÓ¶Z'²ró®†pƒ®ÎªÊ÷®B€ƒ²"`ƒ²z#²*×®.#®.¸(€€€€€€ñÍÁ…¸û²jÓ¶Z$ƒ²‚ªÎğƒ²jÓ¶Z$ƒ²’G²^C®>ƒªÒ²â„ƒ²¶f¤°ƒ²^´ƒ¶×ªÎğ°ƒ®>3®Âs²¶f§²^@ƒ®RÃ®vğƒ²²^Àƒ²‚W®ÎÓ²f ƒ²b#®ÎÓªÂ ƒ®.³®vó² ƒ²"`ƒ²z#²*×®.#®.¸ğ½ÍÁ…¸ø(€€€€€€‘íÉ•…±]àüœñÍÁ…¸ûªâÃ²ƒ²b#®ÎĞƒ²‚sªÎÔè=Á•¸µ5•Ñ•¼ƒ
Üƒ²‚G²4ƒ².pƒ²Ös².€ƒ²b#®ÎĞƒ¶fW²vàğ½ÍÁ…¸øœèœô(€€€€ğ½‘¥Øø(€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰½°µ•áÁ±…¥¸µ‰Ñ¸ˆ½¹±¥¬ô‰½Á•¹•±…åáÁ±…¹…Ñ¥½¸ ¤ˆû²²^Ã²v ƒ²ZÓ®ZïªÊ0ƒ²
Ã²‚W®Bc®
c²jPüğ½‰ÕÑÑ½¸ø(€€ğ½‘¥Øù€ì)ô((¼¼ƒ²*çªÂw²j¤ƒ²²^Àƒ²
Ã²‚Tƒ²V#®
Ó®*Pƒ®Î®>!Q50ƒ²†ÃªÂ²ró®†pƒªÒ®š³¶Vs®.¸(¼¼ƒ¶Vpƒ®Ê ƒ®Ú#®~³²b ƒ®
Ó²j§²v ƒ¶´ƒ²z³®‚3®6S®ƒ².pƒ²z³²
³²j§¶VĞƒ®Ú#¶V²jS¶Vpƒ®“¶*ã²n3¶°ƒ²jS²Ê·²vƒ®'®*S®.¸)±•Ğ}‘•±…åáÁ±…¹…Ñ¥½¹AÉ½µ¥Í”õ¹Õ±°ì)™Õ¹Ñ¥½¸}±½…‘•±…åáÁ±…¹…Ñ¥½¸¡¡½ÍĞ¥ì(€¥˜ …¡½ÍĞ¥É•ÑÕÉ¸ì(€¥˜ …}‘•±…åáÁ±…¹…Ñ¥½¹AÉ½µ¥Í”¥ì(€€€}‘•±…åáÁ±…¹…Ñ¥½¹AÉ½µ¥Í”õ™•Ñ  Á…•Ì½¹¥µ‰¥}‘•±…å}•áÁ±…¹…Ñ¥½¸¹¡Ñµ°ıØôÈÀÈØÀÜÈÀÌÈœ¤(€€€€€€¹Ñ¡•¸¡É•Ìôùì(€€€€€€€¥˜ …É•Ì¹½¬¥Ñ¡É½Ü¹•ÜÉÉ½È¡!QQ@€‘íÉ•Ì¹ÍÑ…ÑÕÍõ€¤ì(€€€€€€€É•ÑÕÉ¸É•Ì¹Ñ•áĞ ¤ì(€€€€€ô¤(€€€€€€¹…Ñ ¡•ÉÈôùì(€€€€€€€}‘•±…åáÁ±…¹…Ñ¥½¹AÉ½µ¥Í”õ¹Õ±°ì(€€€€€€€Ñ¡É½Ü•ÉÈì(€€€€€ô¤ì(€ô(€}‘•±…åáÁ±…¹…Ñ¥½¹AÉ½µ¥Í”(€€€€¹Ñ¡•¸¡¡Ñµ°ôùì(€€€€€½¹ÍĞÕÉÉ•¹Ğõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°µ‰½‘äœ¤ì(€€€€€¥˜ …ÕÉÉ•¹Ğ¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞÁ…ÉÍ•õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€€€€€Á…ÉÍ•¹¥¹¹•É!Q50õ¡Ñµ°ì(€€€€€½¹ÍĞ½¹Ñ•¹ĞõÁ…ÉÍ•¹ÅÕ•ÉåM•±•Ñ½È ‘•Ñ…¥±Ì€ø‘¥Øœ¤ì(€€€€€ÕÉÉ•¹Ğ¹¥¹¹•É!Q50õ½¹Ñ•¹Ğı½¹Ñ•¹Ğ¹½ÕÑ•É!Q50é¡Ñµ°ì(€€€ô¤(€€€€¹…Ñ   ¤ôùì(€€€€€½¹ÍĞÕÉÉ•¹Ğõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°µ‰½‘äœ¤ì(€€€€€¥˜¡ÕÉÉ•¹Ğ¥ÕÉÉ•¹Ğ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰‘•±…å•µ•µÁÑäˆû²²^Àƒ²
Ã²‚Tƒ®Â§².tƒ²V#®
Ó®–ğƒ®Ú#®~³²b“² ƒ®ªï¶Z#²*×®.#®.¸ƒ²zƒ².pƒ¶nƒ®.“².pƒ².s®>¶VĞƒ²ó²ã²jP¸ğ½‘¥Øøœì(€€€ô¤ì)ô)™Õ¹Ñ¥½¸½Á•¹•±…åáÁ±…¹…Ñ¥½¸ ¥ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°œ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞµ½‘…°õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€µ½‘…°¹¥ô‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°œì(€µ½‘…°¹±…ÍÍ9…µ”ô‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°œì(€µ½‘…°¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µ‘¥…±½œˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆ…É¥„µ±…‰•±±•‘‰äô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µÑ¥Ñ±”ˆø(€€€€ñ‘¥Ø±…ÍÌô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µ¡•…ˆø(€€€€€€ñˆ¥ô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µÑ¥Ñ±”ˆû²²^Ã²v ƒ²ZÓ®ZïªÊ0ƒ²
Ã²‚W®Bc®
c²jPüğ½ˆø(€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰±½Í••±…åáÁ±…¹…Ñ¥½¸ ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°µ‰½‘äˆ¥ô‰‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°µ‰½‘äˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰‘•±…å•µ•µÁÑäˆû²²^Àƒ²
Ã²‚Tƒ®Â§².tƒ²V#®
Ó®–ğƒ®Ú#®~³²b“®*Pƒ²’GŠ˜ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€ğ½‘¥Øù€ì(€µ½‘…°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•Ğôôõµ½‘…°¥±½Í••±…åáÁ±…¹…Ñ¥½¸ ¤íô¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡µ½‘…°¤ì(€}±½…‘•±…åáÁ±…¹…Ñ¥½¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°µ‰½‘äœ¤¤ì)ô)™Õ¹Ñ¥½¸±½Í••±…åáÁ±…¹…Ñ¥½¸ ¥ì(€½¹ÍĞµ½‘…°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘•±…äµ•áÁ±…¹…Ñ¥½¸µµ½‘…°œ¤ì(€¥˜ …µ½‘…±ññµ½‘…°¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ±½Í¥¹œœ¤¥É•ÑÕÉ¸ì(€µ½‘…°¹±…ÍÍ1¥ÍĞ¹…‘ ±½Í¥¹œœ¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôùµ½‘…°¹É•µ½Ù” ¤°ÈĞÀ¤ì)ô((¼¼ƒŠRŠR ƒŠN`ƒ²²^·®Îƒ²jÓ¶Z$ƒ®
ƒ²R ƒ®ª£®.°ƒŠRŠR )±•Ğ}İá5½‘…±I•ÑÕÉ¹½ÕÌõ¹Õ±°°}İá5½‘…±-•å!…¹‘±•Èõ¹Õ±°°}İá5½‘…±A…•1½¬õ¹Õ±°ì)™Õ¹Ñ¥½¸½Á•¹I•¥½¹…±]•…Ñ¡•É5½‘…° ¥ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% İ•…Ñ¡•Èµµ½‘…°œ¤ü¹É•µ½Ù” ¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% İ•…Ñ¡•Èµµ½‘…°µ‰…­‘É½Àœ¤ü¹É•µ½Ù” ¤ì(€}İá5½‘…±I•ÑÕÉ¹½ÕÌõ‘½Õµ•¹Ğ¹…Ñ¥Ù•±•µ•¹Ğì(€½¹ÍĞ¸õ¹•Ü…Ñ” ¤°¹½İ5¥¸õ¸¹•Ñ!½ÕÉÌ ¤¨ØÀ­¸¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ‘•Ñ…¥°ô¡ÑåÁ•½˜}İáI•¥½¹…±•Ñ…¥°ôôô™Õ¹Ñ¥½¸œ¤ı}İáI•¥½¹…±•Ñ…¥°¡¹½İ5¥¸¤é¹Õ±°ì(€½¹ÍĞ‰…­‘É½Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€‰…­‘É½À¹±…ÍÍ9…µ”ôİ•…Ñ¡•Èµµ½‘…°µ‰…­‘É½Àœì‰…­‘É½À¹¥ôİ•…Ñ¡•Èµµ½‘…°µ‰…­‘É½Àœì(€‰…­‘É½À¹½¹±¥¬õ±½Í•I•¥½¹…±]•…Ñ¡•É5½‘…°ì(€½¹ÍĞµ½‘…°õ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€µ½‘…°¹±…ÍÍ9…µ”ôİ•…Ñ¡•Èµµ½‘…°œìµ½‘…°¹¥ôİ•…Ñ¡•Èµµ½‘…°œì(€µ½‘…°¹Í•ÑÑÑÉ¥‰ÕÑ” É½±”œ°‘¥…±½œœ¤ìµ½‘…°¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µµ½‘…°œ°ÑÉÕ”œ¤ì(€µ½‘…°¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•±±•‘‰äœ°İ•…Ñ¡•Èµµ½‘…°µÑ¥Ñ±”œ¤ì(€½¹ÍĞ±¬õ€‘íMÑÉ¥¹œ¡¸¹•Ñ!½ÕÉÌ ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡¸¹•Ñ5¥¹ÕÑ•Ì ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€½¹ÍĞ¡°õ‘•Ñ…¥°ı‘•Ñ…¥°¹¡•…‘±¥¹”é¹Õ±°ì(€±•Ğ‰½‘äì(€¥˜ …‘•Ñ…¥°¥ì(€€€‰½‘äõ€ñ‘¥Ø±…ÍÌô‰İá´µÍÕµµ…Éäˆû¶b²z°ƒ².“²‚pƒ²²^·®Îƒ²b#®ÎÓ®–ğƒ®Ú#®~³²b“² ƒ®ªï¶Z#²*×®.#®.¸ƒ®.c®æ®‚#²vğƒ².s®º³®‚#²vÓ²`ƒ²b#®ÎĞƒªâÃ²’²ró®†pƒ²‚ªÖ´ƒ®>g²vğƒªâÃ²²vƒ²‚²j¤ƒ²’G²z®.#®.¸ğ½‘¥Øù€ì(€ô•±Í”ì(€€€½¹ÍĞ…É‘Ìõ‘•Ñ…¥°¹É•¥½¹Ì¹µ…À¡Èôù€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µÑ½ÀˆøñÍÁ…¸±…ÍÌô‰İá´µ¥¼ˆø‘íÈ¹¥½¹ôğ½ÍÁ…¸øñˆø‘í}½ÁÍÍŒ¡È¹¹…µ”¥ôğ½ˆøñÍÁ…¸±…ÍÌô‰İá´µÜˆø‘í}½ÁÍÍŒ¡È¹İ•…Ñ¡•È¥ôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µÉ½ÜˆûÂ~VH€‘í}½ÁÍÍŒ¡È¹Ñ¥µ•1…‰•°¥ôğ½‘¥Øø(€€€€€€‘íÈ¹¡…¹•1…‰•°ı€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µÉ½Üİá´µ¡…¹”ˆûÂ~R€‘í}½ÁÍÍŒ¡È¹¡…¹•1…‰•°¥ôğ½‘¥Øù€èœô(€€€€€€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µÉ½ÜˆûÂ~j˜€‘í}½ÁÍÍŒ¡È¹¥µÁ…Ğ¥ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µÉ½Üİá´µÑÈˆûÂ~jƒ¶b²z°ƒ²b¶Z”ƒ²b#²€‘íÈ¹ÑÉ…¥¹Í÷¶:àğ½‘¥Øø(€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤ì(€€€‰½‘äõ€ñ‘¥Ø±…ÍÌô‰İá´µÍÕµµ…Éäˆøñˆû¶b²z°ƒ®2¶FpƒªâÃ²ğ½ˆøñ‰Èø‘í}½ÁÍÍŒ¡¡°ı¡°¹±…‰•°èŸŠPœ¥ôƒ
Ü€‘í}½ÁÍÍŒ¡¡°ı¡°¹Í½ÕÉ”èœœ¥ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰İá´µÉ•¥½¸µ±¥ÍĞˆø‘í…É‘Íôğ½‘¥Øù€ì(€ô(€µ½‘…°¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰İ•…Ñ¡•Èµµ½‘…°µ¡•…‘•Èˆø(€€€€€€ñ‘¥Øøñ‘¥Ø¥ô‰İ•…Ñ¡•Èµµ½‘…°µÑ¥Ñ±”ˆû²²^·®Îƒ²jÓ¶Z$ƒ®
ƒ²R ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰İá´µÕÁ‘…Ñ•ˆû¶b²z°€‘í±­ôƒªâÃ²’ ğ½‘¥Øøğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬ô‰±½Í•I•¥½¹…±]•…Ñ¡•É5½‘…° ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰İ•…Ñ¡•Èµµ½‘…°µ‰½‘äˆø‘í‰½‘åôğ½‘¥Øù€ì(€€¼¼ƒ®ÂÃªÊôƒ²*“¶³®†“
ß¶Ã²æ`ƒ²Â£®. £¶G²*äƒ²^³²‚Tƒ®ª£®.³ªÎğƒ®>g²vğƒ®Â§².t¤(€½¹ÍĞ‘½	½‘äõ‘½Õµ•¹Ğ¹‰½‘ä°É½½Ğõ‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ°ÍÉ½±±dõİ¥¹‘½Ü¹ÍÉ½±±dì(€}İá5½‘…±A…•1½¬õíÍÉ½±±d°(€€€‰½‘äéíÁ½Í¥Ñ¥½¸é‘½	½‘ä¹ÍÑå±”¹Á½Í¥Ñ¥½¸±Ñ½Àé‘½	½‘ä¹ÍÑå±”¹Ñ½À±±•™Ğé‘½	½‘ä¹ÍÑå±”¹±•™Ğ±É¥¡Ğé‘½	½‘ä¹ÍÑå±”¹É¥¡Ğ±İ¥‘Ñ é‘½	½‘ä¹ÍÑå±”¹İ¥‘Ñ ±½Ù•É™±½Üé‘½	½‘ä¹ÍÑå±”¹½Ù•É™±½İô°(€€€É½½Ñ=Ù•É™±½ÜéÉ½½Ğ¹ÍÑå±”¹½Ù•É™±½İôì(€‘½	½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ ©½ÕÉ¹•äµµ½‘…°µ½Á•¸œ¤ì‘½	½‘ä¹ÍÑå±”¹Ñ½Àõ€´‘íÍÉ½±±eõÁá€ìÉ½½Ğ¹ÍÑå±”¹½Ù•É™±½Üô¡¥‘‘•¸œì(€‰…­‘É½À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡µ½Ù”œ±”ôù”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤±íÁ…ÍÍ¥Ù”é™…±Í•ô¤ì(€µ½‘…°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡µ½Ù”œ±”ôù”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡‰…­‘É½À¤ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡µ½‘…°¤ì(€}İá5½‘…±-•å!…¹‘±•Èõ”ôùì¥˜¡”¹­•äôôôÍ…Á”œ¥±½Í•I•¥½¹…±]•…Ñ¡•É5½‘…° ¤ìôì(€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ­•å‘½İ¸œ±}İá5½‘…±-•å!…¹‘±•È¤ì(€½¹ÍĞ±½Í•	Ñ¸õµ½‘…°¹ÅÕ•ÉåM•±•Ñ½È œ¹İ•…Ñ¡•Èµµ½‘…°µ¡•…‘•È‰ÕÑÑ½¸œ¤ì¥˜¡±½Í•	Ñ¸¥±½Í•	Ñ¸¹™½ÕÌ ¤ì)ô)™Õ¹Ñ¥½¸±½Í•I•¥½¹…±]•…Ñ¡•É5½‘…° ¥ì(€½¹ÍĞµ½‘…°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% İ•…Ñ¡•Èµµ½‘…°œ¤ì(€½¹ÍĞ‰…­‘É½Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% İ•…Ñ¡•Èµµ½‘…°µ‰…­‘É½Àœ¤ì(€¥˜¡}İá5½‘…±-•å!…¹‘±•È¥ì‘½Õµ•¹Ğ¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ­•å‘½İ¸œ±}İá5½‘…±-•å!…¹‘±•È¤ì}İá5½‘…±-•å!…¹‘±•Èõ¹Õ±°ìô(€¥˜¡µ½‘…°¥ìµ½‘…°¹±…ÍÍ1¥ÍĞ¹…‘ ±½Í¥¹œœ¤ìÍ•ÑQ¥µ•½ÕĞ  ¤ôùµ½‘…°¹É•µ½Ù” ¤°ÈÀÀ¤ìô(€¥˜¡‰…­‘É½À¥ì‰…­‘É½À¹±…ÍÍ1¥ÍĞ¹…‘ ±½Í¥¹œœ¤ìÍ•ÑQ¥µ•½ÕĞ  ¤ôù‰…­‘É½À¹É•µ½Ù” ¤°ÈÀÀ¤ìô(€¥˜¡}İá5½‘…±A…•1½¬¥ì½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹‰½‘ä°É½½Ğõ‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ°±½¬õ}İá5½‘…±A…•1½¬ì(€€€‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ©½ÕÉ¹•äµµ½‘…°µ½Á•¸œ¤ì=‰©•Ğ¹…ÍÍ¥¸¡‰½‘ä¹ÍÑå±”±±½¬¹‰½‘ä¤ìÉ½½Ğ¹ÍÑå±”¹½Ù•É™±½Üõ±½¬¹É½½Ñ=Ù•É™±½Üì(€€€İ¥¹‘½Ü¹ÍÉ½±±Q¼ À±±½¬¹ÍÉ½±±d¤ì}İá5½‘…±A…•1½¬õ¹Õ±°ìô(€¥˜¡}İá5½‘…±I•ÑÕÉ¹½ÕÌ˜™ÑåÁ•½˜}İá5½‘…±I•ÑÕÉ¹½ÕÌ¹™½ÕÌôôô™Õ¹Ñ¥½¸œ¥ìÑÉåí}İá5½‘…±I•ÑÕÉ¹½ÕÌ¹™½ÕÌ ¤íõ…Ñ ¡”¥íôô(€}İá5½‘…±I•ÑÕÉ¹½ÕÌõ¹Õ±°ì)ô()™Õ¹Ñ¥½¸É•¹‘•ÉM%•±…ä¡•°¥ì(€½¹ÍĞµ½‘•°õ1e}5=0ì(€•°¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÉÁàˆø(€€€€‘í}½ÕÑ±½½­!Q50 ¥ô(€€€€‘í}‘•±…å•‘QÉ…¥¹Í!Q50 ¥ô(€€€€ñ‘•Ñ…¥±Ì±…ÍÌô‰™Œµ™½±ˆ‘í}Í¥µ•±…å=¸üœœèœ½Á•¸ôø(€€€€ñÍÕµµ…ÉäûÂ~N(ƒ®ã²ƒ®Îƒ²²^Àƒ²b#®ÎĞ€ñÍÁ…¸±…ÍÌô‰™Œµ™½±µÍÕˆˆù5åÍÑ•É¥½ÕÌ¹Ñ•ÉÁÉ¥Í”ƒ²jÓ¶Z$ƒªâÃ®†tƒªâÃ®Â`ƒ
Ü€‘íµ½‘•°¹±•¹Ñ¡÷ªÂpƒ®ã²€ğ½ÍÁ…¸øğ½ÍÕµµ…Éäø(€€€€‘íµ½‘•°¹µ…À¡ôùì(€€€€€½¹ÍĞ±Øõ¹ÁÉ½ˆğÈÔü±½Üœé¹ÁÉ½ˆğĞÀüµ•œè¡¥ œì(€€€€€½¹ÍĞ±Œõ±Øôôô±½ÜœüÙ…È ´µÉ••¸¤œé±Øôôôµ•œüÙ…È ´µ½É…¹”¤œèÙ…È ´µÉ•¤œì(€€€€€½¹ÍĞ±Ğõ±Øôôô±½ÜœüŸ®
»²v0œé±Øôôôµ•œüŸ®ÎÓ¶ÔœèŸ®K²v0œì(€€€€€É•ÑÕÉ¸€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÈ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàíÁ…‘‘¥¹œèÄÑÁà€ÄÙÁàíµ…É¥¸µ‰½ÑÑ½´èáÁàˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí©ÕÍÑ¥™äµ½¹Ñ•¹ĞéÍÁ…”µ‰•Ñİ••¸í…±¥¸µ¥Ñ•µÌé•¹Ñ•Èíµ…É¥¸µ‰½ÑÑ½´èáÁàˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½Èè‘í¹ôˆø‘í¹¹…µ•ôğ½‘¥Øø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí™½¹Ğµİ•¥¡ĞèÜÀÀíÁ…‘‘¥¹œèÍÁà€ÄÁÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàí‰…­É½Õ¹è‘í±ôÈÈí½±½Èè‘í±ôí‰½É‘•ÈèÅÁàÍ½±¥€‘í±ôĞĞˆø‘í±Ñôğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈµÉ…‘¥ÕÌèÙÁàí¡•¥¡ĞèÙÁàí½Ù•É™±½Üé¡¥‘‘•¸íµ…É¥¸µ‰½ÑÑ½´èÙÁàˆø(€€€€€€€€€€ñ‘¥ØÍÑå±”ô‰İ¥‘Ñ è‘í¹ÁÉ½‰ô”í¡•¥¡ĞèÄÀÀ”í‰½É‘•ÈµÉ…‘¥ÕÌèÙÁàí‰…­É½Õ¹è‘í±ôˆøğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí©ÕÍÑ¥™äµ½¹Ñ•¹ĞéÍÁ…”µ‰•Ñİ••¸í™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø(€€€€€€€€€€ñÍÁ…¸û²²^Àƒ¶fW®–€€‘í¹ÁÉ½‰ô”ğ½ÍÁ…¸øñÍÁ…¸û²b#²€‘í¹µ¥¹õø‘í¹µ…á÷®Úğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¥ô(€€€€ğ½‘•Ñ…¥±Ìø(€€ğ½‘¥Øù€ì)ô((¼¼ƒŠRŠR ƒ²vÓ²j¤ƒ®ª£®Np£ªâÃ²Â ¿²‚²Ê€¤ƒ²Ò#ªâÀƒ®Âc²bƒŠRŠR )ÑÉåì(€}…ÁÁ±å5½‘•Q…‰Ì ¤ì(€¥˜¡}…ÁÁ5½‘”ôôôµ•ÑÉ¼œ¤Íİ¥Ñ¡Q…ˆ µ•ÑÉ½±¥¹•Ìœ¤ì)õ…Ñ ¡”¥íô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~nÃ¾â<ƒªÒ²‚pƒ®ª£®NpƒŠPƒ²‚ƒ®ã²€ƒªÊÃ¶V¤ƒ²®>(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}…±±5…Á1¥¹•…¡”õ¹Õ±°ì)™Õ¹Ñ¥½¸}…±±Í5…Á1¥¹” ¥ì(€¥˜¡}…±±5…Á1¥¹•…¡”¥É•ÑÕÉ¸}…±±5…Á1¥¹•…¡”ì(€½¹ÍĞÉ½ÕÑ•Ìõmtì(€€¼¼ƒ®
£¶Vpƒ²‚²ÊÓ®ÎÓªâÃ²f ƒ®Ú¶VpƒªÚ3²^·®>®*Pƒ²²^´ƒ²ƒ¶w²Êc®~ğƒ®Ú®š³¶Vs®.¸(€™½È¡½¹ÍĞµ°½˜=‰©•Ğ¹Ù…±Õ•Ì¡5A}1%9L¤¤¥˜ …µ°¹¹½ÉÑ¡=¹±ä˜˜…µ°¹½µ‰¥¹•‘=¹±ä¤™½È¡½¹ÍĞÈ½˜µ°¹É½ÕÑ•Ì¤É½ÕÑ•Ì¹ÁÕÍ ¡È¤ì(€É•ÑÕÉ¸}…±±5…Á1¥¹•…¡”õí¹…µ”èŸ²‚²ÊĞƒ®“¶*ã²n3¶°œ±½±½ÈèœŒáˆäĞå”œ±É½ÕÑ•Íôì)ô)±•Ğ}…±±I•¥½¹Í5…Á1¥¹•…¡”õ¹Õ±°ì)™Õ¹Ñ¥½¸}…±±I•¥½¹ÍÍ5…Á1¥¹” ¥ì(€¥˜¡}…±±I•¥½¹Í5…Á1¥¹•…¡”¥É•ÑÕÉ¸}…±±I•¥½¹Í5…Á1¥¹•…¡”ì(€½¹ÍĞÍ¡…É•‘9…µ•Ìõ¹•ÜM•Ğ¡lŸªÊ÷²vc²€œ°ŸªÊ÷²nC²€œ°Ÿ®>g¶VÓ²€t¤ì(€½¹ÍĞÍ½ÕÑ õmtì(€™½È¡½¹ÍĞµ°½˜=‰©•Ğ¹Ù…±Õ•Ì¡5A}1%9L¤¤¥˜ …µ°¹¹½ÉÑ¡=¹±ä˜˜…µ°¹½µ‰¥¹•‘=¹±ä˜˜…Í¡…É•‘9…µ•Ì¹¡…Ì¡µ°¹¹…µ”¤¤Í½ÕÑ ¹ÁÕÍ  ¸¸¹µ°¹É½ÕÑ•Ì¤ì(€½¹ÍĞ¹½ÉÑ õ5A}1%9L¹¹½ÉÑ ¹É½ÕÑ•Ì¹™¥±Ñ•È¡É½ÕÑ”ôø…Í¡…É•‘9…µ•Ì¹¡…Ì¡É½ÕÑ”¹¹…µ”¤¤ì(€½¹ÍĞÍ¡…É•õlå•½¹Õ¥}…±°œ°å•½¹İ½¹}…±°œ°‘½¹¡…•}…±°t¹™±…Ñ5…À¡­•äôù5A}1%9Mm­•åt¹É½ÕÑ•Ì¤ì(€É•ÑÕÉ¸}…±±I•¥½¹Í5…Á1¥¹•…¡”õí¹…µ”èŸ®
£®Úƒ²‚²ÊĞƒ®“¶*ã²n3¶°œ±½±½ÈèœŒáˆäĞå”œ±¹½MÁÉ•…éÑÉÕ”±…±±Y¥•ÜéÑÉÕ”±É½ÕÑ•Ìél¸¸¹Í½ÕÑ °¸¸¹¹½ÉÑ °¸¸¹Í¡…É•‘uôì)ô((¼¼ƒŠRŠR ƒªÎ×²j¤èƒ²ó²jS²^´ƒ®ª§®†t£²‚W²Â ƒ¶:ã²"`ƒ²²r¤ƒŠRŠR )±•Ğ}µ…©½ÉMÑ¹Í…¡”õ¹Õ±°ì)™Õ¹Ñ¥½¸}µ…©½ÉMÑ…Ñ¥½¹Ì¡¸¥ì(€¥˜ …}µ…©½ÉMÑ¹Í…¡”¥ì(€€€½¹ÍĞŒõíôì(€€€11}QI%9L¹™½É… ¡ĞôùĞ¹ÍÑ½ÁÌ¹™½É… ¡Ìôùí¥˜¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¥mÌ¹Ítô¡mÌ¹ÍuñğÀ¤¬Äíô¤¤ì(€€€}µ…©½ÉMÑ¹Í…¡”õ=‰©•Ğ¹•¹ÑÉ¥•Ì¡Œ¤¹Í½ÉĞ ¡„±ˆ¤ôù‰lÅtµ…lÅt¤¹µ…À¡àôùálÁt¤ì(€ô(€É•ÑÕÉ¸}µ…©½ÉMÑ¹Í…¡”¹Í±¥” À±¹ñğÈĞ¤ì)ô(¼¼ƒ²^·²v`ƒ®.“²v0ƒ²Ús®Âpƒ®ª§®†t€£ªÂªæ3²jĞƒ²"p°½Õ¹ÓªÂp¤)™Õ¹Ñ¥½¸}¹•áÑ•ÁÌ¡ÍÑ¸±½Õ¹Ğ¥ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì½¹ÍĞ¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞÉ½İÌõmtì(€11}QI%9L¹™½É… ¡Ğôùì(€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÌ¹™¥¹¡àôùà¹ÌôôõÍÑ¸¤ì(€€€¥˜ …Íñğ…¡…ÍQ¥µ”¡Ì¹‘•À¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±ÍÑ¸¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞ´õÑ½5¥¸¡Ì¹‘•À¤ì¥˜¡´ôôõ¹Õ±°¥É•ÑÕÉ¸ì(€€€±•Ğô¡´µ¹½İ4¬ÄĞĞÀ¤”ÄĞĞÀì¥˜¡øĞÈÀ¥É•ÑÕÉ¸ì€¼¼€ß².sªÂƒ²vÓ®
Ó®0(€€€É½İÌ¹ÁÕÍ ¡í±´±Ğ±‘•ÀéÌ¹‘•Áô¤ì(€ô¤ì(€É½İÌ¹Í½ÉĞ ¡„±ˆ¤ôù„¹µˆ¹¤ì(€É•ÑÕÉ¸É½İÌ¹Í±¥” À±½Õ¹ÑñğØ¤ì)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~Z—¾â<ƒ¶Ã®¾ã®@ƒ®ŞÀƒŠPƒ²ó²jS²^´€ÓªÎÌƒ®Âs²Â ƒ®ÎÓ®Npƒ®>g².pƒªÒ²‚(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒŠRŠR ƒªÎ×²j¤ƒ²^´ƒªÊ²'®ÂP€£ªâÃ²†ĞƒªÊ²'®ÂPƒ®RS²zC²vã
ß²Ò#²ÄƒªÊ²$ƒ¶×²vğƒŠPƒ²V{²ró®†pƒ®ª£®N€ƒ²^´ƒªÊ²'²v ƒ²vĞƒ²îÓ¶>³®3¶*àƒ²
³²j¤¤ƒŠRŠR )™Õ¹Ñ¥½¸ÍÑ¹M•…É¡	½á!Q50¡¥±Ù…±Õ”±Á¥­¸±Á ¥ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰…ÕÑ½½µÁ±•Ñ”µİÉ…ÀˆÍÑå±”ô‰µ¥¸µİ¥‘Ñ èÀˆø(€€€€ñ¥¹ÁÕĞÑåÁ”ô‰Ñ•áĞˆ¥ôˆ‘í¥‘ôˆ±…ÍÌô‰Ñ•É´µÍ•°ˆÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èÀˆÙ…±Õ”ôˆ‘íÙ…±Õ•ñğœôˆÁ±…•¡½±‘•Èôˆ‘íÁ¡ñğŸ²^´ƒ²vÓ®š€£²Ò#²ÄƒªÂ®*”¤ôˆ…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆ(€€€€€½¹¥¹ÁÕĞô‰}ÍÑ¹M¡½Ü œ‘í¥‘ôœ°œ‘íÁ¥­¹ôœ¤ˆ½¹™½ÕÌô‰Ñ¡¥Ì¹Í•±•Ğ ¤í}ÍÑ¹M¡½Ü œ‘í¥‘ôœ°œ‘íÁ¥­¹ôœ¤ˆ(€€€€€½¹‰±ÕÈô‰Í•ÑQ¥µ•½ÕĞ  ¤ôùí½¹ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% œ‘í¥‘ôµ…Œœ¤í¥˜¡¥¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíô°ÄÔÀ¤ˆø(€€€€ñ‘¥Ø±…ÍÌô‰…Œµ‘É½Á‘½İ¸ˆ¥ôˆ‘í¥‘ôµ…Œˆøğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}ÍÑ¹M¡½Ü¡¥±Á¥­¸¥ì(€}µ…©½ÉMÑ…Ñ¥½¹Ì Ä¤ì€¼¼ƒ²^´ƒ²êC².pƒ²’®æ(€½¹ÍĞ¥¹Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡¥¤ì¥˜ …¥¹À¥É•ÑÕÉ¸ì(€½¹ÍĞÄõ¥¹À¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡¥¬œµ…Œœ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€½¹ÍĞ±¥ÍĞô¡Äı}µ…©½ÉMÑ¹Í…¡”¹™¥±Ñ•È¡¸ôùµ…Ñ¡•ÍEÕ•Éä¡¸±Ä¤¤é}µ…©½ÉMÑ¹Í…¡”¹Í±¥” À°ÄÀ¤¤¹Í±¥” À°ÄÀ¤ì(€½¹ÍĞ¥‘ÍŒõ¥¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€•°¹¥¹¹•É!Q50õ±¥ÍĞ¹µ…À¡¸ôùì(€€€½¹ÍĞ¹ÍŒõ¸¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰…Œµ¥Ñ•´ˆ½¹µ½ÕÍ•‘½İ¸ô‰•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% œ‘í¥‘Íôœ¤¹Ù…±Õ”ôœ‘í¹Íôœí‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% œ‘í¥‘Íôµ…Œœ¤¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíİ¥¹‘½İlœ‘íÁ¥­¹ôt œ‘í¹Íôœ°œ‘í¥‘Íôœ¤ˆø‘í¹ôğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€•°¹±…ÍÍ9…µ”ô…Œµ‘É½Á‘½İ¸½Á•¸œì(€•°¹ÍÑå±”¹‘¥ÍÁ±…äõ±¥ÍĞ¹±•¹Ñ ü‰±½¬œè¹½¹”œì)ô)±•Ğ}Ñ•ÉµMÑ¹Ìõ¹Õ±°ì)™Õ¹Ñ¥½¸}Ñ•ÉµA¥­MÑ¸¡¹…µ”±¥¥ì(€½¹ÍĞ¤ô­¥¹ÍÁ±¥Ğ œ´œ¤¹Á½À ¤ì(€¥˜¡9Õµ‰•È¹¥Í¥¹¥Ñ”¡¤¤¥ì}Ñ•ÉµMÑ¹Ím¥tõ¹…µ”ì}Ñ•Éµ¥±°¡¤¤ìô)ô)™Õ¹Ñ¥½¸É•¹‘•ÉQ•Éµ¥¹…±Y¥•Ü ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÑ•Éµ¥¹…°œ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€}µ…©½ÉMÑ…Ñ¥½¹Ì Ä¤ì(€¥˜ …}Ñ•ÉµMÑ¹Ì¥ì½¹ÍĞ´õ}µ…©½ÉMÑ…Ñ¥½¹Ì ÌÀ¤ì}Ñ•ÉµMÑ¹ÌõlŸ²s²jàœ°Ÿ®2²‚œ°Ÿ®
£®2ªÖ°œ°Ÿ®Ú²
Àt¹™¥±Ñ•È¡Ìôù´¹¥¹±Õ‘•Ì¡Ì¤¤ìİ¡¥±”¡}Ñ•ÉµMÑ¹Ì¹±•¹Ñ ğĞ¥}Ñ•ÉµMÑ¹Ì¹ÁÕÍ ¡µm}Ñ•ÉµMÑ¹Ì¹±•¹Ñ¡t¤ìô(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÑÁà€ÄÙÁà€ÈÑÁàˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µ‰½ÑÑ½´èÄÁÁàˆû²ó²jS²^´ƒ®Âs²Â ƒ®ÎÓ®Npƒ
Ü€ÌÃ²Ò#®#®.ƒ²zC®>dƒªÂÇ².€ƒ
Üƒ²^´ƒ²vÓ®š²vƒ²²‚DƒªÊ²'¶VĞƒ²ZÓ®*@ƒ²^·²vÓ®N€ƒ®Îğƒ²"`ƒ²z#²*×®.#®.ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Ñ•É´µÉ¥ˆø(€€€€€€€€‘ílÀ°Ä°È°Ít¹µ…À¡¤ôù€(€€€€€€€€ñ‘¥Ø±…ÍÌô‰Ñ•É´µ‰½…Éˆ¥ô‰Ñ•É´µˆ‘í¥ôˆø(€€€€€€€€€€‘íÍÑ¹M•…É¡	½á!Q50 Ñ•É´µ¥¹À´œ­¤±}Ñ•ÉµMÑ¹Ím¥t°}Ñ•ÉµA¥­MÑ¸œ¥ô(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰Ñ•É´µÉ½İÌˆ¥ô‰Ñ•É´µÉ½İÌ´‘í¥ôˆøğ½‘¥Øø(€€€€€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¥ô(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€lÀ°Ä°È°Ít¹™½É… ¡}Ñ•Éµ¥±°¤ì(€±•…É%¹Ñ•ÉÙ…°¡İ¥¹‘½Ü¹}Ñ•ÉµP¤ì(€İ¥¹‘½Ü¹}Ñ•ÉµPõÍ•Ñ%¹Ñ•ÉÙ…°  ¤ôùì(€€€¥˜ …‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÑ•Éµ¥¹…°œ¤¥í±•…É%¹Ñ•ÉÙ…°¡İ¥¹‘½Ü¹}Ñ•ÉµP¤íÉ•ÑÕÉ¸íô(€€€lÀ°Ä°È°Ít¹™½É… ¡}Ñ•Éµ¥±°¤ì(€ô°ÌÀÀÀÀ¤ì)ô)™Õ¹Ñ¥½¸}Ñ•Éµ¥±°¡¤¥ì(€½¹ÍĞ‰½àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ•É´µÉ½İÌ´œ­¤¤ì¥˜ …‰½à¥É•ÑÕÉ¸ì(€½¹ÍĞÉ½İÌõ}¹•áÑ•ÁÌ¡}Ñ•ÉµMÑ¹Ím¥t°Ø¤ì(€‰½à¹¥¹¹•É!Q50õÉ½İÌ¹±•¹Ñ ıÉ½İÌ¹µ…À¡Èôù€(€€€€ñ‘¥Ø±…ÍÌô‰Ñ•É´µÉ½Üˆ½¹±¥¬ô‰©ÕµÁQ½QÉ…¥¸ œ‘íÈ¹Ğ¹¹½ôœ¤ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰Ñ•É´µÑ¥µ”ˆø‘íÈ¹‘•Áôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Ñ•É´µÉ…‘”ˆÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡È¹Ğ¹É…‘”¥ô¤ˆø‘íÈ¹Ğ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Ñ•É´µ¹¼ˆø‘íÈ¹Ğ¹¹½ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Ñ•É´µ‘•ÍĞˆø‘íÈ¹Ğ¹‘•ÍÑ÷¶Z$ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰Ñ•É´µ•Ñ„ˆø‘íÈ¹ôôôÀüŸ²Ús®ÂpœéÈ¹¬Ÿ®Úôğ½ÍÁ…¸ø(€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤(€€€€èœñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÙÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èí½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàˆøß².sªÂƒ®
Ğƒ²Ús®Âpƒ²^²v0ğ½‘¥Øøœì)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~2ƒ®.ç²vó²æcªâÀƒ²ÚS²ÊpƒŠPƒ²ªâ ƒ²Ús®Âs¶VÓ²pƒ®.“®²b°ƒ²öS²*(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}‘ÑÁ=É¥¥¸ôŸ²s²jàœì)™Õ¹Ñ¥½¸}‘ÑÁA¥­MÑ¸¡¹…µ”¥ì(€}‘ÑÁ=É¥¥¸õ¹…µ”ìÉ•¹‘•É…åÑÉ¥À ¤ì)ô)™Õ¹Ñ¥½¸É•¹‘•É…åÑÉ¥À ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµ‘…åÑÉ¥Àœ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€}µ…©½ÉMÑ…Ñ¥½¹Ì Ä¤ì(€¥˜ …}µ…©½ÉMÑ¹Í…¡”¹¥¹±Õ‘•Ì¡}‘ÑÁ=É¥¥¸¤¥}‘ÑÁ=É¥¥¸õ}µ…©½ÉMÑ¹Í…¡•lÁtì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÑÁà€ÄÙÁà€ÈÑÁàˆø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèÄÁÁàíµ…É¥¸µ‰½ÑÑ½´èÙÁàí™±•àµİÉ…ÀéİÉ…Àˆø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèÜÀÀˆû²Ús®Âs²^´ğ½ÍÁ…¸ø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰İ¥‘Ñ èÄÔÁÁàˆø‘íÍÑ¹M•…É¡	½á!Q50 ‘ÑÀµ¥¹Àœ±}‘ÑÁ=É¥¥¸°}‘ÑÁA¥­MÑ¸œ¥ôğ½‘¥Øø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÄ¸ÕÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû²ªâ ƒ²vÓ¶nƒ²Ús®Âpƒ
Üƒ²¶Ôƒ²fW®ÎÔƒªâÃ²’ ğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø¥ô‰‘ÑÀµ±¥ÍĞˆø‘í}‘…åÑÉ¥Á!Q50¡}‘ÑÁ=É¥¥¸¥ôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}‘…åÑÉ¥Á!Q50¡½É¥¥¸¥ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì½¹ÍĞ¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞ½ÕĞõíôì(€11}QI%9L¹™½É… ¡Ğôùì(€€€½¹ÍĞ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ½É¥¥¸¤ì(€€€¥˜¡¤ğÀ¥É•ÑÕÉ¸ì½¹ÍĞÍ¼õĞ¹ÍÑ½ÁÍm¥tì(€€€¥˜ …¡…ÍQ¥µ”¡Í¼¹‘•À¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±½É¥¥¸¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞ‘´õÑ½5¥¸¡Í¼¹‘•À¤ì±•Ğô¡‘´µ¹½İ4¬ÄĞĞÀ¤”ÄĞĞÀì(€€€¥˜¡ğÈÁññøÈĞÀ¥É•ÑÕÉ¸ì(€€€™½È¡±•Ğ¨õ¤¬Äí¨ñĞ¹ÍÑ½ÁÌ¹±•¹Ñ í¨¬¬¥ì(€€€€€½¹ÍĞÌõĞ¹ÍÑ½ÁÍm©tì(€€€€€¥˜ „¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ…´õÑ½5¥¸¡Ì¹…ÉÉññÌ¹‘•À¤ì¥˜¡…´ôôõ¹Õ±°¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ…ÉÉ‰Ìõ¹½İ4­¬  ¡…´µ‘´¤¬ÄĞĞÀ¤”ÄĞĞÀ¤ì(€€€€€½¹ÍĞÕÈõ½ÕÑmÌ¹Ítì(€€€€€¥˜ …ÕÉññ…ÉÉ‰ÌñÕÈ¹…ÉÉ‰Ì¥½ÕÑmÌ¹ÍtõíĞ±‘•ÀéÍ¼¹‘•À±…ÉÈéÌ¹…ÉÉññÌ¹‘•À±…ÉÉ‰Ì±ÍÑ¸éÌ¹Íôì(€€€ô(€ô¤ì(€½¹ÍĞ…É‘Ìõmtì(€™½È¡½¹ÍĞm‘•ÍĞ±½t½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡½ÕĞ¤¥ì(€€€¥˜¡‘•ÍĞôôõ½É¥¥¸¥½¹Ñ¥¹Õ”ì(€€€±•Ğ‰•ÍĞõ¹Õ±°ì(€€€11}QI%9L¹™½É… ¡Ğôùì(€€€€€½¹ÍĞ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ‘•ÍĞ¤ì(€€€€€¥˜¡¤ğÀ¥É•ÑÕÉ¸ì½¹ÍĞÍõĞ¹ÍÑ½ÁÍm¥tì(€€€€€¥˜ …¡…ÍQ¥µ”¡Í¹‘•À¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±‘•ÍĞ¤¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ¨õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à ¡Ì±¬¤ôù¬ù¤˜™Ì¹Ìôôõ½É¥¥¸¤ì(€€€€€¥˜¡¨ğÀ¥É•ÑÕÉ¸ì½¹ÍĞÍ„õĞ¹ÍÑ½ÁÍm©tì(€€€€€¥˜ „¡¡…ÍQ¥µ”¡Í„¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Í„¹‘•À¤¤¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ‘´õÑ½5¥¸¡Í¹‘•À¤ì±•Ğ‘‰Ìõ¹½İ4¬  ¡‘´µ¹½İ4¤¬ÄĞĞÀ¤”ÄĞĞÀ¤ì(€€€€€¥˜¡‘‰Ìµ¼¹…ÉÉ‰ÌğØÀ¥É•ÑÕÉ¸ì(€€€€€¥˜¡‘‰Ìµ¹½İ4øÄÈÀÀ¥É•ÑÕÉ¸ì(€€€€€¥˜ …‰•ÍÑññ‘‰Ìù‰•ÍĞ¹‘‰Ì¥‰•ÍĞõíĞ±‘•ÀéÍ¹‘•À±…ÉÈéÍ„¹…ÉÉññÍ„¹‘•À±‘‰Íôì(€€€ô¤ì(€€€¥˜ …‰•ÍĞ¥½¹Ñ¥¹Õ”ì(€€€½¹ÍĞÍÑ…äõ‰•ÍĞ¹‘‰Ìµ¼¹…ÉÉ‰Ìì(€€€…É‘Ì¹ÁÕÍ ¡í‘•ÍĞ±¼±É•Ğé‰•ÍĞ±ÍÑ…åô¤ì(€ô(€…É‘Ì¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹ÍÑ…äµ„¹ÍÑ…ä¤ì(€½¹ÍĞÑ½Àõ…É‘Ì¹Í±¥” À°à¤ì(€¥˜ …Ñ½À¹±•¹Ñ ¥É•ÑÕÉ¸€œñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~2dğ½‘¥ØøñÀû²ªâ ƒ²Ús®Âs¶VĞƒ®.“®²b°ƒ²"`ƒ²z#®*Pƒ²¶Ôƒ²fW®ÎÔƒ²öS²*“ªÂ ƒ²^²*×®.#®.¸ñ‰Èû®
Ó²vğƒ²V²æ ƒ®.“².pƒ¶fW²vã¶VÓ®ÎÓ²ã²jP¸ğ½Àøğ½‘¥Øøœì(€½¹ÍĞ™µÑMÑ…äõ´ôù€‘í5…Ñ ¹™±½½È¡´¼ØÀ¥÷².sªÂ€‘íMÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥÷®Ú€ì(€É•ÑÕÉ¸Ñ½À¹µ…À¡Œôù€(€€€€ñ‘¥Ø±…ÍÌô‰‘ÑÀµ…Éˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰‘ÑÀµ¡•…ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‘ÑÀµ‘•ÍĞˆø‘íŒ¹‘•ÍÑôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‘ÑÀµÍÑ…äˆû²ÊÓ®–`€‘í™µÑMÑ…ä¡Œ¹ÍÑ…ä¥ôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‘ÑÀµ±•œˆ½¹±¥¬ô‰©ÕµÁQ½QÉ…¥¸ œ‘íŒ¹¼¹Ğ¹¹½ôœ¤ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‘ÑÀµÑ…œ¼ˆûªÂ®*S¶:àğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡Œ¹¼¹Ğ¹É…‘”¥ô¤í™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘íŒ¹¼¹Ğ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ½¹¼µÍ´ˆø‘íŒ¹¼¹Ğ¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ½¹¼µÍ´ˆø‘íŒ¹¼¹‘•ÁôƒŠH€‘íŒ¹¼¹…ÉÉôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‘ÑÀµ±•œˆ½¹±¥¬ô‰©ÕµÁQ½QÉ…¥¸ œ‘íŒ¹É•Ğ¹Ğ¹¹½ôœ¤ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰‘ÑÀµÑ…œ‰…¬ˆû²b“®*S¶:àğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡Œ¹É•Ğ¹Ğ¹É…‘”¥ô¤í™½¹Ğµİ•¥¡ĞèÜÀÀˆø‘íŒ¹É•Ğ¹Ğ¹É…‘•ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ½¹¼µÍ´ˆø‘íŒ¹É•Ğ¹Ğ¹¹½ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰µ½¹¼µÍ´ˆø‘íŒ¹É•Ğ¹‘•ÁôƒŠH€‘íŒ¹É•Ğ¹…ÉÉôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤ì)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~¤ƒ®£¶*àƒ¶6ó²š@ƒŠPƒªÊ÷®†pƒ²"s²pƒ®{²ÚSªâÀ€£®²Ó²‚s¶Vpƒ²Ús²‚p¤(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}ÁÕéMÑ…Ñ”õ¹Õ±°ì)™Õ¹Ñ¥½¸}ÁÕéM½±Ù•‘½Õ¹Ğ ¥ì(€½¹ÍĞÑ½‘…äõÑ½‘…å1½…±MÑÈ¡¹•Ü…Ñ” ¤¤ì(€±•ĞÍ…Ù•õ¹Õ±°ìÑÉåíÍ…Ù•õ)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ ¹¥µ‰¥}ÁÕéé±”œ¤¤íõ…Ñ ¡”¥íô(€É•ÑÕÉ¸€¡Í…Ù•˜™Í…Ù•¹‘…Ñ”ôôõÑ½‘…ä˜™Í…Ù•¹Í½±Ù•¥ñğÀì)ô)™Õ¹Ñ¥½¸}ÁÕé9•Ü ¥ì(€½¹ÍĞ…¹‘Ìõ11}QI%9L¹™¥±Ñ•È¡ĞôùĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¤¹±•¹Ñ øôà¤ì(€½¹ÍĞĞõ…¹‘Ím5…Ñ ¹™±½½È¡5…Ñ ¹É…¹‘½´ ¤©…¹‘Ì¹±•¹Ñ ¥tì(€½¹ÍĞÍÑ½ÁÌõĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤¤¹µ…À¡ÌôùÌ¹Ì¤ì(€½¹ÍĞ8ôØ°Á¥¬õlÁtì(€™½È¡±•Ğ¬ôÄí¬ñ8´Äí¬¬¬¥Á¥¬¹ÁÕÍ ¡5…Ñ ¹É½Õ¹¡¬¨¡ÍÑ½ÁÌ¹±•¹Ñ ´Ä¤¼¡8´Ä¤¤¤ì(€Á¥¬¹ÁÕÍ ¡ÍÑ½ÁÌ¹±•¹Ñ ´Ä¤ì(€½¹ÍĞ…¹Íİ•Èõl¸¸¹¹•ÜM•Ğ¡Á¥¬¥t¹µ…À¡¤ôùÍÑ½ÁÍm¥t¤ì(€½¹ÍĞÍ¡Õ™™±•õl¸¸¹…¹Íİ•Étì(€™½È¡±•Ğ¤õÍ¡Õ™™±•¹±•¹Ñ ´Äí¤øÀí¤´´¥í½¹ÍĞ¨õ5…Ñ ¹™±½½È¡5…Ñ ¹É…¹‘½´ ¤¨¡¤¬Ä¤¤ímÍ¡Õ™™±•‘m¥t±Í¡Õ™™±•‘m©utõmÍ¡Õ™™±•‘m©t±Í¡Õ™™±•‘m¥utíô(€}ÁÕéMÑ…Ñ”õíÑÉ…¥¸éĞ¹¹¼±É…‘”éĞ¹É…‘”±‘•ÍĞéĞ¹‘•ÍĞ±…¹Íİ•È±Í¡Õ™™±•±Í•°émt±Í½±Ù•é™…±Í”±ÑÉ¥•ÌèÁôì(€}ÁÕéÉ…Ü ¤ì)ô)™Õ¹Ñ¥½¸É•¹‘•ÉI½ÕÑ•AÕéé±” ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÁÕéé±”œ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€}ÁÕé9•Ü ¤ì)ô)™Õ¹Ñ¥½¸}ÁÕéÉ…Ü ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÁÕéé±”œ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€½¹ÍĞÀõ}ÁÕéMÑ…Ñ”ì(€½¹ÍĞÍ±½ÑÌõÀ¹…¹Íİ•È¹µ…À ¡|±¤¤ôù€ñÍÁ…¸±…ÍÌô‰ÁÕèµÍ±½Ğ‘íÀ¹Í•±m¥tüœ™¥±°œèœôˆø‘íÀ¹Í•±m¥uñğ¡¤¬Ä¥ôğ½ÍÁ…¸ù€¤¹©½¥¸ œñÍÁ…¸±…ÍÌô‰ÁÕèµ…ÉÉ½ÜˆûŠHğ½ÍÁ…¸øœ¤ì(€½¹ÍĞ¡¥ÁÌõÀ¹Í¡Õ™™±•¹µ…À¡Ìôùì(€€€½¹ÍĞÕÍ•õÀ¹Í•°¹¥¹±Õ‘•Ì¡Ì¤ì(€€€É•ÑÕÉ¸€ñ‰ÕÑÑ½¸±…ÍÌô‰ÁÕèµ¡¥À‘íÕÍ•üœÕÍ•œèœôˆ€‘íÕÍ•ü‘¥Í…‰±•œèœô½¹±¥¬ô‰}ÁÕéA¥¬ œ‘íÌ¹É•Á±…” ¼œ½œ°‰qpœˆ¥ôœ¤ˆø‘íÍôğ½‰ÕÑÑ½¸ù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞÍ½±Ù•‘8õ}ÁÕéM½±Ù•‘½Õ¹Ğ ¤ì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ‘¥ØÍÑå±”ô‰Á…‘‘¥¹œèÄÑÁà€ÄÙÁà€ÈÑÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÁÕèµ…Éˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µ‰½ÑÑ½´èÑÁàˆû²b“®*`€‘íÍ½±Ù•‘9÷®²ã²‚pƒ¶VÓªÊÀƒ
Üƒ²vÓ®Ê ƒ®²ã²‚pƒ².s®>€‘íÀ¹ÑÉ¥•Í÷¶j0ğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÕÁàí™½¹Ğµİ•¥¡ĞèàÀÀíµ…É¥¸µ‰½ÑÑ½´èÄÁÁàˆûÂ~j€‘íÀ¹É…‘•ô€ñÍÁ…¸±…ÍÌô‰µ½¹¼µÍ´ˆø‘íÀ¹ÑÉ…¥¹ôğ½ÍÁ…¸ø€ ‘íÀ¹‘•ÍÑ÷¶Z$¤ƒ²^Ó²Â£ªÂ ƒ²®
c®*Pƒ²^·²v€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ…•¹Ğ¤ˆû²jÓ¶Z$ƒ²"s²s®2®†pğ½ÍÁ…¸øƒ®"3®~³®ÎÓ²ã²jPğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÁÕèµÍ±½ÑÌˆø‘íÍ±½ÑÍôğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÁÕèµ¡¥ÁÌˆø‘í¡¥ÁÍôğ½‘¥Øø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèáÁàíµ…É¥¸µÑ½ÀèÄÉÁàˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆÍÑå±”ô‰™±•àèÄˆ½¹±¥¬ô‰}ÁÕé9•Ü ¤ˆûÂ~:Èƒ®.“²v0ƒ®²ã²‚pğ½‰ÕÑÑ½¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆÍÑå±”ô‰™±•àèÄˆ½¹±¥¬ô‰}ÁÕéMÑ…Ñ”¹Í•°õmtí}ÁÕéÉ…Ü ¤ˆûŠèƒ®.“².pƒ®ÂÃ²^Ğğ½‰ÕÑÑ½¸ø(€€€€€€€€€€‘íÀ¹Í•°¹±•¹Ñ ôôõÀ¹…¹Íİ•È¹±•¹Ñ ı€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆÍÑå±”ô‰™±•àèÈí‰…­É½Õ¹éÙ…È ´µ…•¹Ğ¤í½±½Èè™™˜í‰½É‘•Èµ½±½ÈéÙ…È ´µ…•¹Ğ¤ˆ½¹±¥¬ô‰}ÁÕé¡•¬ ¤ˆû²‚W®.Ôƒ¶fW²vàğ½‰ÕÑÑ½¸ù€èœô(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø¥ô‰ÁÕèµÉ•ÍÕ±ĞˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÁÁàˆø‘íÀ¹Í½±Ù•ı€ñ‘¥Ø±…ÍÌô‰ÁÕèµ½¬ˆûŠrƒ²‚W®.Ô„€ñÍÁ…¸ÍÑå±”ô‰ÕÉÍ½ÈéÁ½¥¹Ñ•ÈíÑ•áĞµ‘•½É…Ñ¥½¸éÕ¹‘•É±¥¹”ˆ½¹±¥¬ô‰±½Í•5åA…” ¤í©ÕµÁQ½QÉ…¥¸ œ‘íÀ¹ÑÉ…¥¹ôœ¤ˆû²^Ó²Â ƒ®ÎÓªâÀƒŠHğ½ÍÁ…¸øƒ
Ü€ñÍÁ…¸ÍÑå±”ô‰ÕÉÍ½ÈéÁ½¥¹Ñ•ÈíÑ•áĞµ‘•½É…Ñ¥½¸éÕ¹‘•É±¥¹”ˆ½¹±¥¬ô‰}ÁÕé9•Ü ¤ˆûÂ~:Èƒ®.“²v0ƒ®²ã²‚pğ½ÍÁ…¸øğ½‘¥Øù€èœôğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}ÁÕéA¥¬¡Ì¥ì¥˜¡}ÁÕéMÑ…Ñ”¹Í•°¹±•¹Ñ ñ}ÁÕéMÑ…Ñ”¹…¹Íİ•È¹±•¹Ñ ¥í}ÁÕéMÑ…Ñ”¹Í•°¹ÁÕÍ ¡Ì¤í}ÁÕéÉ…Ü ¤íôô)™Õ¹Ñ¥½¸}ÁÕé¡•¬ ¥ì(€½¹ÍĞÀõ}ÁÕéMÑ…Ñ”ìÀ¹ÑÉ¥•Ì¬¬ì(€½¹ÍĞ½¬õÀ¹Í•°¹©½¥¸ ğœ¤ôôõÀ¹…¹Íİ•È¹©½¥¸ ğœ¤ì(€¥˜¡½¬¥ì(€€€À¹Í½±Ù•õÑÉÕ”ì(€€€½¹ÍĞÑ½‘…äõÑ½‘…å1½…±MÑÈ¡¹•Ü…Ñ” ¤¤ì(€€€ÑÉåí±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ¹¥µ‰¥}ÁÕéé±”œ±)M=8¹ÍÑÉ¥¹¥™ä¡í‘…Ñ”éÑ½‘…ä±Í½±Ù•é}ÁÕéM½±Ù•‘½Õ¹Ğ ¤¬Åô¤¤íõ…Ñ ¡”¥íô(€ô(€¥˜¡½¬¥í}ÁÕéÉ…Ü ¤íô(€•±Í•ì(€€€½¹ÍĞ½ÉÉ•ĞõÀ¹Í•°¹™¥±Ñ•È ¡Ì±¤¤ôùÌôôõÀ¹…¹Íİ•Ém¥t¤¹±•¹Ñ ì(€€€À¹Í•°õmtí}ÁÕéÉ…Ü ¤ì(€€€½¹ÍĞÈõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÁÕèµÉ•ÍÕ±Ğœ¤ì(€€€¥˜¡È¥È¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰ÁÕèµ¹¼ˆûŠv0ƒ²V²&³²n3²jPƒŠPƒ²zC®š°ƒ®{²v ƒ²^´€‘í½ÉÉ•Ñô¼‘íÀ¹…¹Íİ•È¹±•¹Ñ¡ô¸ƒ®.“².pƒ®>²‚„ğ½‘¥Øù€ì(€ô)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒŠj[¾â<ƒ²^Ó²Â ƒ®æªÖ@ƒŠPƒ®2¶Ró
ß²ÚS²nPƒ²²‚@ƒ¶fW²và(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)™Õ¹Ñ¥½¸½Á•¹QÉ…¥¹½µÁ…É”¡¹¼¥ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÀµİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞ„õ•ÑQÉ…¥¹	å9¼¡¹¼¤ì¥˜ …„¥É•ÑÕÉ¸ì(€½¹ÍĞ…MÑ½ÁÌõ„¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôù¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤ì(€½¹ÍĞ…M•Ğõ¹•Ü5…À¡…MÑ½ÁÌ¹µ…À¡ÌôùmÌ¹Ì±Ñ½5¥¸¡Ì¹‘•ÁññÌ¹…ÉÈ¥t¤¤ì(€½¹ÍĞÍÕœõmtì(€11}QI%9L¹™½É… ¡Ğôùì(€€€¥˜¡Ğ¹¹¼ôôõ¹½ññĞ¹‘¥È„ôõ„¹‘¥È¥É•ÑÕÉ¸ì(€€€½¹ÍĞÍ¡…É•õĞ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜™…M•Ğ¹¡…Ì¡Ì¹Ì¤¤ì(€€€¥˜¡Í¡…É•¹±•¹Ñ ğĞ¥É•ÑÕÉ¸ì(€€€½¹ÍĞ˜õÍ¡…É•‘lÁtì½¹ÍĞõ5…Ñ ¹…‰Ì ¡Ñ½5¥¸¡˜¹‘•Áññ˜¹…ÉÈ¤µ…M•Ğ¹•Ğ¡˜¹Ì¤¬ÜÈÀ¬ÄĞĞÀ¤”ÄĞĞÀ´ÜÈÀ¤ì(€€€¥˜¡øÄÈÀ¥É•ÑÕÉ¸ì(€€€ÍÕœ¹ÁÕÍ ¡í¹¼éĞ¹¹¼±É…‘”éĞ¹É…‘”±‘•ÍĞéĞ¹‘•ÍĞ±±¸éÍ¡…É•¹±•¹Ñ¡ô¤ì(€ô¤ì(€ÍÕœ¹Í½ÉĞ ¡à±ä¤ôùà¹µä¹¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€İÉ…À¹¥ôµÀµİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäÔÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èœì(€İÉ…À¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµ‰…­‘É½Àˆ½¹±¥¬ô‰‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÀµİÉ…Àœ¤¹É•µ½Ù” ¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰µ…àµİ¥‘Ñ èĞàÁÁàíµ…àµ¡•¥¡ĞèàÙÙ í‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆûŠj[¾â<€‘í„¹É…‘•ô€‘í„¹¹½ôƒ²^Ó²Â ƒ®æªÖ@ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆûªÂg²v ƒ®Â§¶Z”ƒ²^Ó²Â£²f ƒ²^·®Îƒ².sªÂ²vƒ®æªÖC¶VĞƒ®2¶Ró
ß²ÚS²nPƒ²²‚C²vƒ¶fW²vã¶V§®.#®.ğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàíµ…É¥¸èáÁà€Àˆø(€€€€€€€€ñ¥¹ÁÕĞ¥ô‰µÀµ¥¹ÀˆÁ±…•¡½±‘•Èô‹®æªÖC¶V€ƒ²^Ó²Â£®Ê#¶bàˆÍÑå±”ô‰™±•àèÄí‰…­É½Õ¹éÙ…È ´µ‰œÌ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèáÁàí½±½ÈéÙ…È ´µÑ•áĞÄ¤íÁ…‘‘¥¹œèáÁà€ÄÁÁàí™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤ˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ½¹±¥¬ô‰É•¹‘•ÉQÉ…¥¹½µÁ…É” œ‘í¹½ôœ±‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÀµ¥¹Àœ¤¹Ù…±Õ”¹ÑÉ¥´ ¤¤ˆû®æªÖ@ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€‘íÍÕœ¹±•¹Ñ ı€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸µ‰½ÑÑ½´èÑÁàˆûªÂªæ3²jĞƒ².sªÂ®2 ƒ²ÚS²Êpğ½‘¥Øø(€€€€€€ñ‘¥ØÍÑå±”ô‰‘¥ÍÁ±…äé™±•àí…ÀèÙÁàí™±•àµİÉ…ÀéİÉ…Àíµ…É¥¸µ‰½ÑÑ½´èÙÁàˆø(€€€€€€€€‘íÍÕœ¹Í±¥” À°Ø¤¹µ…À¡Ìôù€ñ‰ÕÑÑ½¸±…ÍÌô‰Í•…Ğµ…ÕÑ¼µ¡¥Àˆ½¹±¥¬ô‰É•¹‘•ÉQÉ…¥¹½µÁ…É” œ‘í¹½ôœ°œ‘íÌ¹¹½ôœ¤ˆø‘íÌ¹É…‘•ô€‘íÌ¹¹½ôñÍÁ…¸ÍÑå±”ô‰½Á…¥Ñäè¸Øˆøƒ
Ä‘íÌ¹‘÷®Úğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ô(€€€€€€ğ½‘¥Øù€èœñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆûªÂªæ3²jĞƒ².sªÂ®2²v`ƒªÂg²v ƒ®Â§¶Z”ƒ²^Ó²Â£ªÂ ƒ²^²*×®.#®.¸ğ½‘¥Øøô(€€€€€€ñ‘¥Ø¥ô‰µÀµ‰½‘äˆÍÑå±”ô‰½Ù•É™±½Üµäé…ÕÑ¼íµ¥¸µ¡•¥¡ĞèÀí™±•àèÄˆøğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ½¹±¥¬ô‰‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÀµİÉ…Àœ¤¹É•µ½Ù” ¤ˆû®.¯ªâÀğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€¥˜¡ÍÕœ¹±•¹Ñ ¥É•¹‘•ÉQÉ…¥¹½µÁ…É”¡¹¼±ÍÕlÁt¹¹¼¤ì)ô)™Õ¹Ñ¥½¸É•¹‘•ÉQÉ…¥¹½µÁ…É”¡¹½±¹½¥ì(€½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÀµ‰½‘äœ¤ì¥˜ …‰½‘ä¥É•ÑÕÉ¸ì(€½¹ÍĞõ•ÑQÉ…¥¹	å9¼¡¹½¤°õ•ÑQÉ…¥¹	å9¼¡¹½¤ì(€¥˜ …¥í‰½‘ä¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÉ•¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèáÁàˆû²^Ó²Â£®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞ‰5…Àõ¹•Ü5…À¡¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôù¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤¹µ…À¡ÌôùmÌ¹Ì±Ít¤¤ì(€½¹ÍĞÍ¡…É•õ¹ÍÑ½ÁÌ¹™¥±Ñ•È¡Ìôø¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¤˜™‰5…À¹¡…Ì¡Ì¹Ì¤¤ì(€¥˜¡Í¡…É•¹±•¹Ñ ğÈ¥í‰½‘ä¹¥¹¹•É!Q50ôœñ‘¥ØÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèáÁàˆû®F@ƒ²^Ó²Â£²v`ƒªÎ×²r€ƒ²‚W²Â£²^·²vĞƒ®Ú²†Ç¶V§®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞİô¡à±ä¤ôø ¡äµà¬ÜÈÀ¬ÄĞĞÀ¤”ÄĞĞÀ¤´ÜÈÀì(€±•ĞÉ½İÌôœœ°ÁÉ•ÙM¥¸ôÀ°•Ù•¹ÑÌõmtì(€Í¡…É•¹™½É… ¡Í„ôùì(€€€½¹ÍĞÍˆõ‰5…À¹•Ğ¡Í„¹Ì¤ì(€€€½¹ÍĞÑ„õÑ½5¥¸¡Í„¹‘•ÁññÍ„¹…ÉÈ¤°ÑˆõÑ½5¥¸¡Íˆ¹‘•ÁññÍˆ¹…ÉÈ¤ì(€€€½¹ÍĞõİ¡Ñ„±Ñˆ¤ì½¹ÍĞÍ¥¸õøÀüÄéğÀü´ÄèÀì(€€€±•Ğµ…É¬ôœœì(€€€¥˜¡ÁÉ•ÙM¥¸„ôôÀ˜™Í¥¸„ôôÀ˜™Í¥¸„ôõÁÉ•ÙM¥¸¥ì(€€€€€½¹ÍĞ…ÉÉõÑ½5¥¸¡Í„¹…ÉÈ¤°…ÉÉõÑ½5¥¸¡Íˆ¹…ÉÈ¤ì(€€€€€±•ĞÑáĞì(€€€€€¥˜¡…ÉÉ„ôõ¹Õ±°˜™…ÉÉ„ôõ¹Õ±°¥ì(€€€€€€€½¹ÍĞ™¥ÉÍÑ%¸€ôİ¡…ÉÉ±…ÉÉ¤øÀ€ü€èì(€€€€€€€½¹ÍĞÁ…ÍÍ•È€€ô™¥ÉÍÑ%¸ôôõ€ü€èì(€€€€€€€ÑáĞõ€‘íÍ„¹Í÷²^C²p€‘í™¥ÉÍÑ%¸¹É…‘•ô€‘í™¥ÉÍÑ%¸¹¹½ôƒ®2¶RğƒŠH€‘íÁ…ÍÍ•È¹É…‘•ô€‘íÁ…ÍÍ•È¹¹½ôƒ²ÚS²nQ€ì(€€€€€ô•±Í”ÑáĞõ€‘íÍ„¹Íôƒ®ÚªŞó²^C²pƒ²"s²pƒªÖC²ÊÑ€ì(€€€€€•Ù•¹ÑÌ¹ÁÕÍ ¡ÑáĞ¤ì(€€€€€µ…É¬õ€ñ‘¥Ø±…ÍÌô‰µÀµ•Ù•¹ĞˆûÂ~R €‘íÑáÑôğ½‘¥Øù€ì(€€€ô(€€€¥˜¡Í¥¸„ôôÀ¥ÁÉ•ÙM¥¸õÍ¥¸ì(€€€É½İÌ¬õ€‘íµ…É­ôñ‘¥Ø±…ÍÌô‰µÀµÉ½Üˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµÍÑ¸ˆø‘íÍ„¹Íôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµĞˆø‘íÍ„¹…ÉÉñğŸŠLôñ‰Èø‘íÍ„¹‘•ÁñğŸŠLôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµĞˆø‘íÍˆ¹…ÉÉñğŸŠLôñ‰Èø‘íÍˆ¹‘•ÁñğŸŠLôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµ‘¥™˜ˆø‘íøÀüœ¬œèœô‘í‘÷®Úğ½ÍÁ…¸ø(€€€€ğ½‘¥Øù€ì(€ô¤ì(€‰½‘ä¹¥¹¹•É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰µÀµÍÕµµ…Éäˆø‘í•Ù•¹ÑÌ¹±•¹Ñ ı•Ù•¹ÑÌ¹µ…À¡”ôù€ñ‘¥ØûÂ~R €‘í•ôğ½‘¥Øù€¤¹©½¥¸ œœ¤èŸ®F@ƒ²^Ó²Â£²v`ƒ²ƒ¶nƒªÒªÎªÂ ƒ²rƒ²®B§®.#®.€£²ÚS²nPƒ²^²v0¤ôğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰µÀµÉ½ÜµÀµ¡•…ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµÍÑ¸ˆû²^´ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµĞˆÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡¹É…‘”¥ô¤ˆø‘í¹¹½ôñ‰ÈøñÍµ…±°û²Â¤¿®Âpğ½Íµ…±°øğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµĞˆÍÑå±”ô‰½±½ÈéÙ…È ´µŒ´‘íÍÍY…È¡¹É…‘”¥ô¤ˆø‘í¹¹½ôñ‰ÈøñÍµ…±°û²Â¤¿®Âpğ½Íµ…±°øğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰µÀµ‘¥™˜ˆû²Â£²vĞğ½ÍÁ…¸ø(€€€€ğ½‘¥Øø(€€€€‘íÉ½İÍõ€ì)ô((¼¼ƒªÎ²‚T£®†s²î°ƒ¶R®†s¶V¤ƒ²Ò#ªâÃ¶fPƒŠPƒ²Ös²Ò ƒ².“¶Z$ƒ².pƒªâÃ²†Ğƒ®6Ã²vÓ¶Ã®†pƒªâÃ®ÎàƒªÎ²‚Tƒ²w²Ä)ÑÉåí…Ñ%¹¥Ğ ¤íõ…Ñ ¡”¥íô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~Rƒ²^Ó²Â ƒ²jÓ²j¤ƒ¶´ƒŠPƒ².sªÂ·ªÆÃ®š°ƒ®.“²vÓ²ZÓªŞã®z €¬ƒ¶:ã²Äƒ²jÓ²j¤ƒ¶vC®š®>(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}½ÁÍY¥•Üô‘¥…É…´œì€€€¼¼€‘¥…É…´œğ€É…­”œ)±•Ğ}½ÁÍ½ÉÉ¥‘½Èõ¹Õ±°ì€€€€¼¼ƒ®.“²vÓ²ZÓªŞã®z ƒ®2²5A}1%9Lƒ¶
)±•Ğ}½ÁÍÉ…‘•Ìõ¹Õ±°ì€€€€€€¼¼ƒ®NÇªâ$ƒ¶V¶À¡M•Ğ¤ƒŠP¹Õ±³²vÓ®¦Ğƒ²‚²ÊĞƒ¶Fs².p)±•Ğ}½ÁÍÉ½ÕÀõ¹Õ±°ì€€€€€€€¼¼ƒ¶vC®š®>ƒ¶:ã²ÄƒªŞã®äƒ¶R®š³¶R÷²*)±•Ğ}½ÁÍM•°õ¹Õ±°ì€€€€€€€€€¼¼ƒ®.“²vÓ²ZÓªŞã®z£²^C²pƒ²ƒ¶t£ªÂW²†À§¶Vpƒ²^Ó²Â ƒ®Ê#¶bà(¼¼ƒ®.“²vÓ²ZÓªŞã®z ƒ²z³®‚3®6Pƒ².pƒªÂ®†pƒ²*“¶³®†ƒ²r²æ`ƒ®ÎÓ²†Ğ)™Õ¹Ñ¥½¸}½ÁÍI•É•¹‘•É-••ÁMÉ½±° ¥ì(€½¹ÍĞÍŒõ‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹½ÁÌµ‘¥…É…´µÍÉ½±°œ¤ì½¹ÍĞ±•™ĞõÍŒıÍŒ¹ÍÉ½±±1•™ĞèÀì(€É•¹‘•É=ÁÍQ…ˆ ¤ì(€½¹ÍĞÍŒÈõ‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹½ÁÌµ‘¥…É…´µÍÉ½±°œ¤ì¥˜¡ÍŒÈ¥ÍŒÈ¹ÍÉ½±±1•™Ğõ±•™Ğì)ô)™Õ¹Ñ¥½¸}½ÁÍM•±•ÑQÉ…¥¸¡¹¼¥ì}½ÁÍM•°ô¡}½ÁÍM•°ôôõ¹¼¤ı¹Õ±°é¹¼ì}½ÁÍI•É•¹‘•É-••ÁMÉ½±° ¤ìô)™Õ¹Ñ¥½¸}½ÁÍ±•…ÉM•° ¥ì¥˜¡}½ÁÍM•°¥í}½ÁÍM•°õ¹Õ±°í}½ÁÍI•É•¹‘•É-••ÁMÉ½±° ¤íôô(¼¼ƒ²ƒ¶tƒ²^Ó²Â£²f ƒ®.“®–àƒ²^Ó²Â£®N“²v`ƒªÖC¶Z$£®Âc®2®Â§¶Z”ƒ®3®
 §
ß²ÚS²nP£ªÂg²v®Â§¶Z”ƒ²ÚS²nP¤ƒ²²‚@ƒ²
Ã²Úp)™Õ¹Ñ¥½¸}½ÁÍ5••ÑÌ¡Í•°°½Ñ¡•ÉÌ°½È¥ì(€½¹ÍĞ¥¹Ñ•ÉÀô¡ÁÑÌ±à¤ôùì¥˜¡àñÁÑÍlÁt¹ÑññàùÁÑÍmÁÑÌ¹±•¹Ñ ´Åt¹Ğ¥É•ÑÕÉ¸¹Õ±°ì(€€€™½È¡±•Ğ¤ôÄí¤ñÁÑÌ¹±•¹Ñ í¤¬¬¥ì¥˜¡àğõÁÑÍm¥t¹Ğ¥í½¹ÍĞ„õÁÑÍm¤´Åt±ˆõÁÑÍm¥tí½¹ÍĞ˜ô¡àµ„¹Ğ¤¼ ¡ˆ¹Ğµ„¹Ğ¥ñğÄ¤íÉ•ÑÕÉ¸„¹¬¡ˆ¹µ„¹¤©˜íôô(€€€É•ÑÕÉ¸ÁÑÍmÁÑÌ¹±•¹Ñ ´Åt¹ìôì(€½¹ÍĞ¹…µ•Ğõôùì±•Ğ‰•ÍĞõ¹Õ±°±‰ôÅ”äì™½È¡½¹ÍĞ¸½˜½È¹¹…µ•Ì¥í½¹ÍĞ‘õ5…Ñ ¹…‰Ì¡½È¹‘µm¹tµ¤í¥˜¡‘ñ‰¥í‰õ‘í‰•ÍĞõ¸íõôÉ•ÑÕÉ¸‰•ÍĞìôì(€½¹ÍĞÍ5¥¸õÍ•°¹ÁÑÍlÁt¹Ğ°Í5…àõÍ•°¹ÁÑÍmÍ•°¹ÁÑÌ¹±•¹Ñ ´Åt¹Ğì(€½¹ÍĞµ••ÑÌõmtì(€½Ñ¡•ÉÌ¹™½É… ¡¼ôùì(€€€¥˜¡¼¹Ğ¹¹¼ôôõÍ•°¹Ğ¹¹¼¥É•ÑÕÉ¸ì(€€€½¹ÍĞ±¼õ5…Ñ ¹µ…à¡Í5¥¸±¼¹ÁÑÍlÁt¹Ğ¤°¡¤õ5…Ñ ¹µ¥¸¡Í5…à±¼¹ÁÑÍm¼¹ÁÑÌ¹±•¹Ñ ´Åt¹Ğ¤ì(€€€¥˜¡¡¤µ±¼ğÄ¥É•ÑÕÉ¸ì(€€€±•ĞÁÉ•Øõ¹Õ±°±ÁÉ•Ù`õ¹Õ±°ì(€€€™½È¡±•Ğàõ±¼íàğõ¡¤íà¬ôÄ¥ì(€€€€€½¹ÍĞ‘Ìõ¥¹Ñ•ÉÀ¡Í•°¹ÁÑÌ±à¤°‘<õ¥¹Ñ•ÉÀ¡¼¹ÁÑÌ±à¤ì(€€€€€¥˜¡‘Ìôõ¹Õ±±ññ‘<ôõ¹Õ±°¥íÁÉ•Øõ¹Õ±°íÁÉ•Ù`õ¹Õ±°í½¹Ñ¥¹Õ”íô(€€€€€½¹ÍĞ‘¥™˜õ‘Ìµ‘<ì(€€€€€¥˜¡ÁÉ•Ø„õ¹Õ±°˜™ÁÉ•Ù`„õ¹Õ±°˜˜ ¡ÁÉ•ØğÀ˜™‘¥™˜øôÀ¥ñğ¡ÁÉ•ØøÀ˜™‘¥™˜ğôÀ¤¤¥ì(€€€€€€€½¹ÍĞµàõÁÉ•Ù`¬¡àµÁÉ•Ù`¤¨¡5…Ñ ¹…‰Ì¡ÁÉ•Ø¤¼ ¡5…Ñ ¹…‰Ì¡ÁÉ•Ø¤­5…Ñ ¹…‰Ì¡‘¥™˜¤¥ñğÄ¤¤ì(€€€€€€€½¹ÍĞ‘Á½Ìõ¥¹Ñ•ÉÀ¡Í•°¹ÁÑÌ±µà¤ì(€€€€€€€µ••ÑÌ¹ÁÕÍ ¡í¹¼é¼¹Ğ¹¹¼±É…‘”é¼¹Ğ¹É…‘”±àéµà±é‘Á½Ì±Í…µ”é¼¹Ğ¹‘¥ÈôôõÍ•°¹Ğ¹‘¥È±ÍÑ¸é¹…µ•Ğ¡‘Á½Ì¥ô¤ì(€€€€€ô(€€€€€ÁÉ•Øõ‘¥™˜íÁÉ•Ù`õàì(€€€ô(€ô¤ì(€µ••ÑÌ¹Í½ÉĞ ¡„±ˆ¤ôù„¹àµˆ¹à¤ì(€É•ÑÕÉ¸µ••ÑÌì)ô)™Õ¹Ñ¥½¸=AM}à¡´¥í¥˜¡´ôõ¹Õ±°¥É•ÑÕÉ¸¹Õ±°íÉ•ÑÕÉ¸´ğÈĞÀı´¬ÄĞĞÀé´íô€¼¼€ÀĞèÀÁøÈàèÀÀƒŠH€ÈĞÁøÄØàÀ€£²zC²‚Tƒ®cªæ ƒ²^Ã²4¤)™Õ¹Ñ¥½¸}½ÁÍÍŒ¡Ì¥íÉ•ÑÕÉ¸MÑÉ¥¹œ¡Ìôõ¹Õ±°üœœéÌ¤¹É•Á±…” ¼˜½œ°œ™…µÀìœ¤¹É•Á±…” ¼ğ½œ°œ™±Ğìœ¤¹É•Á±…” ¼ø½œ°œ™Ğìœ¤íô)™Õ¹Ñ¥½¸}™µÑ4¡´¥í¥˜¡´ôõ¹Õ±°¥É•ÑÕÉ¸€œ´œí´ô ¡´”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀíÉ•ÑÕÉ¸5…Ñ ¹™±½½È¡´¼ØÀ¤¬œèœ­MÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¤íô((¼¼ƒ²öS®š³®>£®ã²€¤ƒ²^´ƒ²"s²p€¬ƒ®"²‚ƒªÆÃ®š°£²*“¶
“®“¶.ÄƒªÊ÷®†pƒªâã²vĞ¤)½¹ÍĞ}½ÁÍ½É…¡”õíôì)™Õ¹Ñ¥½¸}½ÁÍ½ÉÉ¥‘½É…Ñ„¡­•ä¥ì(€¥˜¡}½ÁÍ½É…¡•m­•åt„ôõÕ¹‘•™¥¹•¥É•ÑÕÉ¸}½ÁÍ½É…¡•m­•åtì(€½¹ÍĞµ°ô¡ÑåÁ•½˜5A}1%9L„ôôÕ¹‘•™¥¹•œ¤ı5A}1%9Mm­•åté¹Õ±°ì(€¥˜ …µ±ñğ…µ°¹É½ÕÑ•Ì¥íÉ•ÑÕÉ¸}½ÁÍ½É…¡•m­•åtõ¹Õ±°íô(€½¹ÍĞµ…¥¸õµ°¹É½ÕÑ•Ì¹™¥±Ñ•È¡Èôø…È¹‘…Í ¤¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ µ„¹ÍÑ…Ñ¥½¹Ì¹±•¹Ñ ¥lÁuññµ°¹É½ÕÑ•ÍlÁtì(€½¹ÍĞÍÑÌõµ…¥¸¹ÍÑ…Ñ¥½¹Ìì(€¥˜ …ÍÑÍññÍÑÌ¹±•¹Ñ ğÌ¥íÉ•ÑÕÉ¸}½ÁÍ½É…¡•m­•åtõ¹Õ±°íô(€½¹ÍĞ‘¥ÍĞõlÁtì(€™½È¡±•Ğ¤ôÄí¤ñÍÑÌ¹±•¹Ñ í¤¬¬¥‘¥ÍÑm¥tõ‘¥ÍÑm¤´Åt­5…Ñ ¹¡åÁ½Ğ¡ÍÑÍm¥t¹àµÍÑÍm¤´Åt¹à±ÍÑÍm¥t¹äµÍÑÍm¤´Åt¹ä¤ì(€½¹ÍĞÑ½Ñ…°õ‘¥ÍÑm‘¥ÍĞ¹±•¹Ñ ´ÅuñğÄì(€½¹ÍĞ‘´õíô±¹…µ•Ìõmtì(€ÍÑÌ¹™½É…  ¡Ì±¤¤ôùí¥˜ „¡Ì¹¸¥¸‘´¤¥í‘µmÌ¹¹tõ‘¥ÍÑm¥tí¹…µ•Ì¹ÁÕÍ ¡Ì¹¸¤íõô¤ì(€É•ÑÕÉ¸}½ÁÍ½É…¡•m­•åtõí­•ä±¹…µ”éµ°¹¹…µ”±½±½Èéµ°¹½±½È±¹…µ•Ì±‘´±Ñ½Ñ…±ôì)ô(¼¼ƒ²^Ó²Â£ªÂ ƒ².“²‚s®†pƒ²vĞƒ²öS®š³®>£®ã²€§®–ğƒ²jÓ¶Z'¶Vc®*S² ƒŠP±¥¹”ƒ¶V®Ns²^@ƒ®ã²ƒ®ª²vĞƒ²z#²ZÓ²Vğƒ¶V ¸(¼¼€£²‚W²Â£²^´ƒ²vÓ®š®0ƒªÊç²æc®*Pƒ¶ ƒ®ã²€ƒ²^Ó²Â ƒ²b“¶Fs².pƒ®Â§² èƒªÊ÷®ÚªÎƒ²7²€-QcªÂ ƒªÊ÷®Ú²ƒ²^@ƒ®r£®6`ƒ®²ã²‚p¤)™Õ¹Ñ¥½¸}½ÁÍQÉ…¥¹=¹½ÉÉ¥‘½È¡Ğ±½È¥ì(€É•ÑÕÉ¸€„„¡Ğ¹±¥¹”˜™½È˜™Ğ¹±¥¹”¹ÍÁ±¥Ğ Ÿ
Üœ¤¹Í½µ”¡°ôù°¹ÑÉ¥´ ¤ôôõ½È¹¹…µ”¤¤ì)ô(¼¼ƒ²^Ó²Â£²v`ƒ²öS®š³®>ƒ²ƒ²‚W²Â£²‚@€£².sªÂ
ßªÆÃ®š°¤)™Õ¹Ñ¥½¸}½ÁÍQÉ…¥¹AÑÌ¡Ğ±½È¥ì(€½¹ÍĞÁÑÌõmtì(€Ğ¹ÍÑ½ÁÌ¹™½É… ¡Ìôùì(€€€¥˜ „¡Ì¹Ì¥¸½È¹‘´¤¥É•ÑÕÉ¸ì(€€€½¹ÍĞÑ´õ¡…ÍQ¥µ”¡Ì¹‘•À¤ıÑ½5¥¸¡Ì¹‘•À¤è¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¤ıÑ½5¥¸¡Ì¹…ÉÈ¤é¹Õ±°¤ì(€€€¥˜¡Ñ´ôõ¹Õ±°¥É•ÑÕÉ¸ì(€€€ÁÑÌ¹ÁÕÍ ¡íÍÑ¸éÌ¹Ì±é½È¹‘µmÌ¹Ít±Ğé=AM}à¡Ñ´¤±Á…ÍÌé¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¥ô¤ì(€ô¤ì(€É•ÑÕÉ¸ÁÑÌì)ô(¼¼ƒ²öS®š³®>ƒ¶n®ÎĞƒ®ª§®†tƒŠPƒ²‚W²Â ƒ²^Ó²Â €ÏªÂpƒ²vÓ²°ƒ¶:ã²"`ƒ®
Ó®šó²Â£²"p)±•Ğ}½ÁÍ½ÉÉ¥‘½É1¥ÍĞõ¹Õ±°ì)™Õ¹Ñ¥½¸}½ÁÍ½ÉÉ¥‘½ÉÌ ¥ì(€¥˜¡}½ÁÍ½ÉÉ¥‘½É1¥ÍĞ¥É•ÑÕÉ¸}½ÁÍ½ÉÉ¥‘½É1¥ÍĞì(€½¹ÍĞ±¥ÍĞõmtì(€™½È¡½¹ÍĞ­•ä½˜=‰©•Ğ¹­•åÌ¡5A}1%9L¤¥ì(€€€½¹ÍĞ½Èõ}½ÁÍ½ÉÉ¥‘½É…Ñ„¡­•ä¤ì¥˜ …½È¥½¹Ñ¥¹Õ”ì(€€€±•Ğ¹PôÀì™½È¡½¹ÍĞĞ½˜11}QI%9L¥í¥˜¡}½ÁÍQÉ…¥¹=¹½ÉÉ¥‘½È¡Ğ±½È¤˜™}½ÁÍQÉ…¥¹AÑÌ¡Ğ±½È¤¹±•¹Ñ øôÌ¥¹P¬¬íô(€€€¥˜¡¹PøÀ¥±¥ÍĞ¹ÁÕÍ ¡í­•ä±¹…µ”é½È¹¹…µ”±¸é¹Qô¤ì(€ô(€±¥ÍĞ¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹¸µ„¹¸¤ì(€É•ÑÕÉ¸}½ÁÍ½ÉÉ¥‘½É1¥ÍĞõ±¥ÍĞì)ô)™Õ¹Ñ¥½¸}ÕÉ½ÉÉ¥‘½ÉÉ…‘•Ì ¥ì(€½¹ÍĞ½Èõ}½ÁÍ½ÉÉ¥‘½É…Ñ„¡}½ÁÍ½ÉÉ¥‘½È¤ì¥˜ …½È¥É•ÑÕÉ¸mtì(€É•ÑÕÉ¸l¸¸¹¹•ÜM•Ğ¡11}QI%9L¹™¥±Ñ•È¡Ğôù}½ÁÍQÉ…¥¹=¹½ÉÉ¥‘½È¡Ğ±½È¤˜™}½ÁÍQÉ…¥¹AÑÌ¡Ğ±½È¤¹±•¹Ñ øôÌ¤¹µ…À¡ĞôùĞ¹É…‘”¤¥tì)ô)™Õ¹Ñ¥½¸}½ÁÍQ½±•É…‘”¡œ¥ì(€¥˜¡}½ÁÍÉ…‘•Ìôôõ¹Õ±°¥}½ÁÍÉ…‘•Ìõ¹•ÜM•Ğ¡}ÕÉ½ÉÉ¥‘½ÉÉ…‘•Ì ¤¤ì(€¥˜¡}½ÁÍÉ…‘•Ì¹¡…Ì¡œ¤¥}½ÁÍÉ…‘•Ì¹‘•±•Ñ”¡œ¤ì•±Í”}½ÁÍÉ…‘•Ì¹…‘¡œ¤ì(€¥˜¡}½ÁÍÉ…‘•Ì¹Í¥é”ôôôÁññ}½ÁÍÉ…‘•Ì¹Í¥é”øõ}ÕÉ½ÉÉ¥‘½ÉÉ…‘•Ì ¤¹±•¹Ñ ¥}½ÁÍÉ…‘•Ìõ¹Õ±°ì(€É•¹‘•É=ÁÍQ…ˆ ¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•É=ÁÍQ…ˆ ¥ì(€½¹ÍĞ¡½ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ½ÁÌµ½¹Ñ…¥¹•Èœ¤ì¥˜ …¡½ÍĞ¥É•ÑÕÉ¸ì(€¡½ÍĞ¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÙ¥•İÑ½±”ˆø(€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰½ÁÌµÙĞ‘í}½ÁÍY¥•Üôôô‘¥…É…´œüœ½¸œèœôˆ½¹±¥¬ô‰}½ÁÍY¥•Üô‘¥…É…´œíÉ•¹‘•É=ÁÍQ…ˆ ¤ˆûÂ~N ƒ²jÓ¶Z$ƒ®.“²vÓ²ZÓªŞã®z ğ½‰ÕÑÑ½¸ø(€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰½ÁÌµÙĞ‘í}½ÁÍY¥•ÜôôôÉ…­”œüœ½¸œèœôˆ½¹±¥¬ô‰}½ÁÍY¥•ÜôÉ…­”œíÉ•¹‘•É=ÁÍQ…ˆ ¤ˆûÂ~Rƒ¶:ã²Äƒ²jÓ²j¤ƒ¶vC®š®>ğ½‰ÕÑÑ½¸ø(€€ğ½‘¥Øøñ‘¥Ø¥ô‰½ÁÌµ‰½‘äˆøğ½‘¥Øù€ì(€½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ½ÁÌµ‰½‘äœ¤ì(€¥˜¡}½ÁÍY¥•Üôôô‘¥…É…´œ¥É•¹‘•É=ÁÍ¥…É…´¡‰½‘ä¤ì•±Í”É•¹‘•É=ÁÍI…­”¡‰½‘ä¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•É=ÁÍ¥…É…´¡¡½ÍĞ¥ì(€¥˜¡ÑåÁ•½˜5A}1%9LôôôÕ¹‘•™¥¹•œ¥í¡½ÍĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~N ğ½‘¥ØøñÀû®ã²€ƒ®6Ã²vÓ¶ÃªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞ½ÉÌõ}½ÁÍ½ÉÉ¥‘½ÉÌ ¤ì(€¥˜ …½ÉÌ¹±•¹Ñ ¥í¡½ÍĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~N ğ½‘¥ØøñÀû¶Fs².s¶V€ƒ²jÓ¶Z$ƒ®ã²ƒ²vĞƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜ …}½ÁÍ½ÉÉ¥‘½Éñğ…½ÉÌ¹Í½µ”¡ŒôùŒ¹­•äôôõ}½ÁÍ½ÉÉ¥‘½È¤¥}½ÁÍ½ÉÉ¥‘½Èõ½ÉÍlÁt¹­•äì(€½¹ÍĞ½Èõ}½ÁÍ½ÉÉ¥‘½É…Ñ„¡}½ÁÍ½ÉÉ¥‘½È¤ì(€½¹ÍĞÑÉ…¥¹Ìõmtì™½È¡½¹ÍĞĞ½˜11}QI%9L¥í¥˜ …}½ÁÍQÉ…¥¹=¹½ÉÉ¥‘½È¡Ğ±½È¤¥½¹Ñ¥¹Õ”í½¹ÍĞÁÑÌõ}½ÁÍQÉ…¥¹AÑÌ¡Ğ±½È¤í¥˜¡ÁÑÌ¹±•¹Ñ øôÌ¥ÑÉ…¥¹Ì¹ÁÕÍ ¡íĞ±ÁÑÍô¤íô(€½¹ÍĞÍ•Ğõl¸¸¹¹•ÜM•Ğ¡ÑÉ…¥¹Ì¹µ…À¡¼ôù¼¹Ğ¹É…‘”¤¥tì(€½¹ÍĞÍ¡½İPõÑÉ…¥¹Ì¹™¥±Ñ•È¡¼ôø…}½ÁÍÉ…‘•Íññ}½ÁÍÉ…‘•Ì¹¡…Ì¡¼¹Ğ¹É…‘”¤¤ì((€±•Ğ õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÑ½½±‰…Èˆø(€€€€ñÍ•±•Ğ±…ÍÌô‰½ÁÌµÍ•°ˆ½¹¡…¹”ô‰}½ÁÍ½ÉÉ¥‘½ÈõÑ¡¥Ì¹Ù…±Õ”í}½ÁÍÉ…‘•Ìõ¹Õ±°íÉ•¹‘•É=ÁÍQ…ˆ ¤ˆø(€€€€€€‘í½ÉÌ¹µ…À¡Œôù€ñ½ÁÑ¥½¸Ù…±Õ”ôˆ‘íŒ¹­•åôˆ‘íŒ¹­•äôôõ}½ÁÍ½ÉÉ¥‘½ÈüœÍ•±•Ñ•œèœôø‘í}½ÁÍÍŒ¡Œ¹¹…µ”¥ôƒ
Ü€‘íŒ¹¹÷¶:àğ½½ÁÑ¥½¸ù€¤¹©½¥¸ œœ¥ô(€€€€ğ½Í•±•Ğø(€€€€ñÍÁ…¸±…ÍÌô‰½ÁÌµ½Õ¹Ğˆø‘íÍ¡½İP¹±•¹Ñ¡÷¶:àƒ¶Fs².pğ½ÍÁ…¸ø(€€ğ½‘¥Øù€ì(€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµ±••¹ˆø‘íÍ•Ğ¹µ…À¡œôù€ñ‰ÕÑÑ½¸±…ÍÌô‰½ÁÌµ¡¥À‘ì …}½ÁÍÉ…‘•Íññ}½ÁÍÉ…‘•Ì¹¡…Ì¡œ¤¤üœ½¸œèœôˆÍÑå±”ôˆ´µŒè‘íI}=1=IMmuñğœŒáˆäĞå”ôˆ½¹±¥¬ô‰}½ÁÍQ½±•É…‘” œ‘í}½ÁÍÍŒ¡œ¥ôœ¤ˆø‘í}½ÁÍÍŒ¡œ¥ôğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¥ôğ½‘¥Øù€ì((€€¼¼ƒ²ƒ¶tƒ²^Ó²Â £ªÂW²†Àƒ®2²¤(€½¹ÍĞÍ•°õ}½ÁÍM•°ıÍ¡½İP¹™¥¹¡¼ôù¼¹Ğ¹¹¼ôôõ}½ÁÍM•°¤é¹Õ±°ì(€¥˜¡}½ÁÍM•°˜˜…Í•°¥}½ÁÍM•°õ¹Õ±°ì(€±•Ğµ••ÑÌõmtì(€¥˜¡Í•°¥ì(€€€µ••ÑÌõ}½ÁÍ5••ÑÌ¡Í•°±Í¡½İP±½È¤ì(€€€½¹ÍĞÉ½ÍÌõµ••ÑÌ¹™¥±Ñ•È¡´ôø…´¹Í…µ”¤°½Ù•Èõµ••ÑÌ¹™¥±Ñ•È¡´ôù´¹Í…µ”¤ì(€€€½¹ÍĞÍ•±õI}=1=IMmÍ•°¹Ğ¹É…‘•uñğœŒáˆäĞå”œì(€€€½¹ÍĞ•àõµ••ÑÌ¹Í±¥” À°Ø¤¹µ…À¡´ôù€ñÍÁ…¸±…ÍÌô‰½ÁÌµµ••ĞµÉ½Üˆøñˆø‘í}™µÑ4¡5…Ñ ¹É½Õ¹¡´¹à¤¥ôğ½ˆø€‘í}½ÁÍÍŒ¡´¹ÍÑ¸¥ôƒ
Ü€ñÍÁ…¸ÍÑå±”ô‰½±½Èè‘í´¹Í…µ”üœ˜ÀààÍ”œèœ•˜ĞĞĞĞôˆø‘í´¹Í…µ”üŸ²ÚS²nPœèŸªÖC¶Z$ôğ½ÍÁ…¸ø€‘í}½ÁÍÍŒ¡´¹É…‘”¥ô€‘í}½ÁÍÍŒ¡´¹¹¼¥ôğ½ÍÁ…¸ù€¤¹©½¥¸ œœ¤ì(€€€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÍ•±‰…ÈˆÍÑå±”ôˆ´µŒè‘íÍ•±ôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰½ÁÌµÍ•±‰…Èµ¡•…ˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰½ÁÌµÍ•±‰…ÈµÑ¥Ñ±”ˆøñÍÁ…¸±…ÍÌô‰½ÁÌµÍ•°µ¡¥ÀˆÍÑå±”ô‰‰…­É½Õ¹è‘íÍ•±ôˆø‘í}½ÁÍÍŒ ¡ÑåÁ•½˜0„ôôÕ¹‘•™¥¹•œ˜™1mÍ•°¹Ğ¹É…‘•t¥ññÍ•°¹Ğ¹É…‘”¥ô€‘í}½ÁÍÍŒ¡Í•°¹Ğ¹¹¼¥ôğ½ÍÁ…¸ø€‘í}½ÁÍÍŒ¡Í•°¹Ğ¹ÍÑ½ÁÍlÁt¹Ì¥÷ŠH‘í}½ÁÍÍŒ¡Í•°¹Ğ¹‘•ÍĞ¥ôğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰½ÁÌµÍ•±‰…Èµàˆ½¹±¥¬ô‰}½ÁÍ±•…ÉM•° ¤ˆûŠrTƒ¶VÓ²‚pğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰½ÁÌµÍ•±‰…Èµµ•Ñ„ˆøñÍÁ…¸ÍÑå±”ô‰½±½Èè•˜ĞĞĞĞˆûªÖC¶Z$€‘íÉ½ÍÌ¹±•¹Ñ¡ôğ½ÍÁ…¸øƒ
Ü€ñÍÁ…¸ÍÑå±”ô‰½±½Èè˜ÀààÍ”ˆû²ÚS²nP€‘í½Ù•È¹±•¹Ñ¡ôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€‘í•àı€ñ‘¥Ø±…ÍÌô‰½ÁÌµµ••Ğµ±¥ÍĞˆø‘í•áô‘íµ••ÑÌ¹±•¹Ñ øØı€ñÍÁ…¸±…ÍÌô‰½ÁÌµµ••ĞµÉ½ÜˆÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆû²fà€‘íµ••ÑÌ¹±•¹Ñ ´Ù÷ªÆÓŠ˜ğ½ÍÁ…¸ù€èœôğ½‘¥Øù€èœô(€€€€€€ñ‘¥Ø±…ÍÌô‰½ÁÌµÍ•±‰…Èµ‰Ñ¹Ìˆøñ‰ÕÑÑ½¸½¹±¥¬ô‰½Á•¹)½ÕÉ¹•ä œ‘íÍ•°¹Ğ¹¹½ôœ¤ˆûÂ~jƒ¶G²*äƒ²^³²‚Tğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸½¹±¥¬ô‰©ÕµÁQ½QÉ…¥¸ œ‘íÍ•°¹Ğ¹¹½ôœ¤ˆûÂ~N,ƒ²^Ó²Â ƒ²²àğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô((€½¹ÍĞ0ôØØ±PôÈØ±HôÄØ±ôÄÀì(€½¹ÍĞÁáA•É5¥¸ôÄ¸ÀØ°Á±½Ñ\õ5…Ñ ¹É½Õ¹ ÄĞĞÀ©ÁáA•É5¥¸¤ì(€½¹ÍĞÁ±½Ñ õ5…Ñ ¹µ…à ĞĞÀ°½È¹¹…µ•Ì¹±•¹Ñ ¨ÈÈ¤ì(€½¹ÍĞ õP­Á±½Ñ ­ì(€½¹ÍĞaÀõ´ôø¡´´ÈĞÀ¤©ÁáA•É5¥¸ì€€€¼¼ƒ¶R3®†¼ƒ®
Ó®Ú `€£²Š3²â„ƒ²ÚTƒ²‚s²fàƒŠHƒªŞã®zc¶R®0ƒ²*“¶³®†¤(€½¹ÍĞdõôùP­½½È¹Ñ½Ñ…°©Á±½Ñ ì(€€¼¼ƒŠRŠR ƒ²Š3²â„ƒªÎƒ²‚Tƒ²ÚT£²^·®ª¤ƒŠPƒªÂ®†pƒ²*“¶³®†ƒ².pƒ¶V£ªî`ƒ²n²²vÓ² ƒ²V+²v0ƒŠRŠR (€½¹ÍĞ…àõmtì(€…à¹ÁÕÍ ¡€ñÍÙœÙ¥•İ	½àôˆÀ€À€‘í1ô€‘í!ôˆİ¥‘Ñ ôˆ‘í1ôˆ¡•¥¡Ğôˆ‘í!ôˆáµ±¹Ìô‰¡ÑÑÀè¼½İİÜ¹ÜÌ¹½Éœ¼ÈÀÀÀ½ÍÙœˆ±…ÍÌô‰½ÁÌµ…á¥ÌµÍÙœˆù€¤ì(€…à¹ÁÕÍ ¡€ñÉ•ĞàôˆÀˆäôˆÀˆİ¥‘Ñ ôˆ‘í1ôˆ¡•¥¡Ğôˆ‘í!ôˆ™¥±°ô‰Ù…È ´µ‰œ¤ˆ¼ù€¤ì(€±•Ğ±…ÍÑe„ô´ääì(€½È¹¹…µ•Ì¹™½É… ¡¸ôùí½¹ÍĞäõd¡½È¹‘µm¹t¤ì(€€€¥˜¡äµ±…ÍÑe„øôÄÀ¥í…à¹ÁÕÍ ¡€ñÑ•áĞàôˆ‘í0´Ùôˆäôˆ‘íä¬Íôˆ™¥±°ô‰Ù…È ´µÑ•áĞÈ¤ˆ™½¹ĞµÍ¥é”ôˆä¸ÔˆÑ•áĞµ…¹¡½Èô‰•¹ˆø‘í}½ÁÍÍŒ¡¸¥ôğ½Ñ•áĞù€¤í±…ÍÑe„õäíõô¤ì(€…à¹ÁÕÍ ¡€ñ±¥¹”àÄôˆ‘í0´À¸ÕôˆäÄôˆ‘íQôˆàÈôˆ‘í0´À¸ÕôˆäÈôˆ‘íP­Á±½Ñ!ôˆÍÑÉ½­”ô‰Ù…È ´µ‰½É‘•È¤ˆÍÑÉ½­”µİ¥‘Ñ ôˆÄˆ½Á…¥ÑäôˆÀ¸Üˆ¼ù€¤ì(€…à¹ÁÕÍ  œğ½ÍÙœøœ¤ì(€€¼¼ƒŠRŠR ƒ²jÃ²â„ƒ²*“¶³®†ƒ¶R3®†¼£®.“²vÓ²ZÓªŞã®z ƒªŞã®zc¶R¤ƒŠRŠR (€½¹ÍĞ]ÀõÁ±½Ñ\­Hì(€½¹ÍĞÌõmtì(€Ì¹ÁÕÍ ¡€ñÍÙœÙ¥•İ	½àôˆÀ€À€‘í]Áô€‘í!ôˆİ¥‘Ñ ôˆ‘í]Áôˆ¡•¥¡Ğôˆ‘í!ôˆáµ±¹Ìô‰¡ÑÑÀè¼½İİÜ¹ÜÌ¹½Éœ¼ÈÀÀÀ½ÍÙœˆ±…ÍÌô‰½ÁÌµ‘¥…É…´µÍÙœˆù€¤ì(€Ì¹ÁÕÍ ¡€ñÉ•ĞàôˆÀˆäôˆÀˆİ¥‘Ñ ôˆ‘í]Áôˆ¡•¥¡Ğôˆ‘í!ôˆ™¥±°ô‰Ù…È ´µ‰œ¤ˆ‘íÍ•°üœÍÑå±”ô‰ÕÉÍ½ÈéÁ½¥¹Ñ•Èˆ½¹±¥¬ô‰}½ÁÍ±•…ÉM•° ¤ˆœèœô¼ù€¤ì(€™½È¡±•Ğ¡ ôĞí¡ ğôÈàí¡ ¬¬¥í½¹ÍĞàõaÀ¡¡ ¨ØÀ¤ì(€€€Ì¹ÁÕÍ ¡€ñ±¥¹”àÄôˆ‘íáôˆäÄôˆ‘íQôˆàÈôˆ‘íáôˆäÈôˆ‘íP­Á±½Ñ!ôˆÍÑÉ½­”ô‰Ù…È ´µ‰½É‘•È¤ˆÍÑÉ½­”µİ¥‘Ñ ôˆ‘í¡ ”ÈüÀ¸ÔèÅôˆ½Á…¥ÑäôˆÀ¸ÔÔˆ¼ù€¤ì(€€€Ì¹ÁÕÍ ¡€ñÑ•áĞàôˆ‘íáôˆäôˆ‘íP´İôˆ™¥±°ô‰Ù…È ´µÑ•áĞÈ¤ˆ™½¹ĞµÍ¥é”ôˆÄÀˆÑ•áĞµ…¹¡½Èô‰µ¥‘‘±”ˆø‘íMÑÉ¥¹œ¡¡ ”ÈĞ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôğ½Ñ•áĞù€¤íô(€½È¹¹…µ•Ì¹™½É… ¡¸ôùí½¹ÍĞäõd¡½È¹‘µm¹t¤ì(€€€Ì¹ÁÕÍ ¡€ñ±¥¹”àÄôˆÀˆäÄôˆ‘íåôˆàÈôˆ‘íÁ±½Ñ]ôˆäÈôˆ‘íåôˆÍÑÉ½­”ô‰Ù…È ´µ‰½É‘•È¤ˆÍÑÉ½­”µİ¥‘Ñ ôˆÀ¸Ôˆ½Á…¥ÑäôˆÀ¸Ğˆ¼ù€¤íô¤ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤í±•Ğ¹´õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤í±•Ğ¹àõ¹´ğÈĞÀı¹´¬ÄĞĞÀé¹´ì(€¥˜¡¹àøôÈĞÀ˜™¹àğôÄØàÀ¥í½¹ÍĞàõaÀ¡¹à¤íÌ¹ÁÕÍ ¡€ñ±¥¹”àÄôˆ‘íáôˆäÄôˆ‘íQôˆàÈôˆ‘íáôˆäÈôˆ‘íP­Á±½Ñ!ôˆÍÑÉ½­”ô‰Ù…È ´µÉ•¤ˆÍÑÉ½­”µİ¥‘Ñ ôˆÄ¸Ìˆ½Á…¥ÑäôˆÀ¸äˆ¼ù€¤íÌ¹ÁÕÍ ¡€ñÑ•áĞàôˆ‘íáôˆäôˆ‘íP­Á±½Ñ ¬áôˆ™¥±°ô‰Ù…È ´µÉ•¤ˆ™½¹ĞµÍ¥é”ôˆäˆÑ•áĞµ…¹¡½Èô‰µ¥‘‘±”ˆû²ªâ ğ½Ñ•áĞù€¤íô(€€¼¼ƒ²ƒ¶tƒ².pƒ®
c®¢ã²®*Pƒ¶vC®š³ªÊ0°ƒ²ƒ¶tƒ²^Ó²Â£®*PƒªÖ×ªÊ0(€Í¡½İP¹™½É… ¡¼ôùì(€€€½¹ÍĞŒõI}=1=IMm¼¹Ğ¹É…‘•uñğœŒáˆäĞå”œì(€€€½¹ÍĞ¥ÍM•°õÍ•°˜™¼¹Ğ¹¹¼ôôõÍ•°¹Ğ¹¹¼ì(€€€½¹ÍĞ½Àô…Í•°üÀ¸àÔè¡¥ÍM•°üÄèÀ¸Ä¤ì(€€€½¹ÍĞÜõ¥ÍM•°üÈ¸àèÄ¸Ğì(€€€½¹ÍĞÁ°õ¼¹ÁÑÌ¹µ…À¡Àôù€‘íaÀ¡À¹Ğ¤¹Ñ½¥á• Ä¥ô°‘íd¡À¹¤¹Ñ½¥á• Ä¥õ€¤¹©½¥¸ œ€œ¤ì(€€€Ì¹ÁÕÍ ¡€ñÁ½±å±¥¹”Á½¥¹ÑÌôˆ‘íÁ±ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ô‰ÑÉ…¹ÍÁ…É•¹ĞˆÍÑÉ½­”µİ¥‘Ñ ôˆàˆÍÑå±”ô‰ÕÉÍ½ÈéÁ½¥¹Ñ•Èˆ½¹±¥¬ô‰}½ÁÍM•±•ÑQÉ…¥¸ œ‘í¼¹Ğ¹¹½ôœ¤ˆøñÑ¥Ñ±”ø‘í}½ÁÍÍŒ¡¼¹Ğ¹É…‘”¥ô€‘í¼¹Ğ¹¹½ôƒ
Ü€‘í}½ÁÍÍŒ¡¼¹Ğ¹ÍÑ½ÁÍlÁt¹Ì¥÷ŠH‘í}½ÁÍÍŒ¡¼¹Ğ¹‘•ÍĞ¥ôğ½Ñ¥Ñ±”øğ½Á½±å±¥¹”ù€¤ì(€€€Ì¹ÁÕÍ ¡€ñÁ½±å±¥¹”Á½¥¹ÑÌôˆ‘íÁ±ôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘íôˆÍÑÉ½­”µİ¥‘Ñ ôˆ‘íİôˆ½Á…¥Ñäôˆ‘í½ÁôˆÁ½¥¹Ñ•Èµ•Ù•¹ÑÌô‰¹½¹”ˆ¼ù€¤ì(€€€¥˜ …Í•±ññ¥ÍM•°¥¼¹ÁÑÌ¹™½É… ¡Àôùí¥˜ …À¹Á…ÍÌ¥Ì¹ÁÕÍ ¡€ñ¥É±”àôˆ‘íaÀ¡À¹Ğ¤¹Ñ½¥á• Ä¥ôˆäôˆ‘íd¡À¹¤¹Ñ½¥á• Ä¥ôˆÈôˆ‘í¥ÍM•°üÈ¸ÈèÄ¸Õôˆ™¥±°ôˆ‘íôˆÁ½¥¹Ñ•Èµ•Ù•¹ÑÌô‰¹½¹”ˆ¼ù€¤íô¤ì(€ô¤ì(€€¼¼ƒªÖC¶Z$¿²ÚS²nPƒ²²‚@ƒ®#²î€£²ƒ¶tƒ².p¤(€¥˜¡Í•°¥µ••ÑÌ¹™½É… ¡´ôùí½¹ÍĞàõaÀ¡´¹à¤±äõd¡´¹¤±½°õ´¹Í…µ”üœ˜ÀààÍ”œèœ•˜ĞĞĞĞœì(€€€Ì¹ÁÕÍ ¡€ñ¥É±”àôˆ‘íà¹Ñ½¥á• Ä¥ôˆäôˆ‘íä¹Ñ½¥á• Ä¥ôˆÈôˆÌ¸Ğˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘í½±ôˆÍÑÉ½­”µİ¥‘Ñ ôˆÄ¸ØˆøñÑ¥Ñ±”ø‘í´¹Í…µ”üŸ²ÚS²nPœèŸªÖC¶Z$ôƒ
Ü€‘í}½ÁÍÍŒ¡´¹É…‘”¥ô€‘í}½ÁÍÍŒ¡´¹¹¼¥ôƒ
Ü€‘í}½ÁÍÍŒ¡´¹ÍÑ¸¥ô€‘í}™µÑ4¡5…Ñ ¹É½Õ¹¡´¹à¤¥ôğ½Ñ¥Ñ±”øğ½¥É±”ù€¤íô¤ì(€Ì¹ÁÕÍ  œğ½ÍÙœøœ¤ì(€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµ‘¥…É…´µİÉ…Àˆøñ‘¥Ø±…ÍÌô‰½ÁÌµ‘¥…É…´µ…á¥Ìˆø‘í…à¹©½¥¸ œœ¥ôğ½‘¥Øøñ‘¥Ø±…ÍÌô‰½ÁÌµ‘¥…É…´µÍÉ½±°ˆø‘íÌ¹©½¥¸ œœ¥ôğ½‘¥Øøğ½‘¥Øù€ì(€ ¬õ€ñÀ±…ÍÌô‰½ÁÌµ¡¥¹ĞˆûªÂ®†s²ÚT€ôƒ².sªÂ ÀÓŠHÈã².p¤ƒ
Üƒ²ã®†s²ÚT€ô€ñˆø‘í}½ÁÍÍŒ¡½È¹¹…µ”¥ôğ½ˆøƒ²^´£ªÆÃ®š³²"p¤ƒ
Üƒ²€ƒ¶Vc®
`€ôƒ²^Ó²Â €Ç¶:àƒ
ÜƒªâÃ²jãªâÃªÂ ƒªâ'¶Vƒ²"c®†tƒªÎƒ²4ƒ
Ü€ñˆû²ƒ²vƒ®"®–Ó®¦ĞƒªÂW²†Àğ½ˆû®BcªÎ€ƒªÖC¶Z$£®æ£ªÂT§
ß²ÚS²nP£²ó¶f¤¤ƒ²²‚C²vĞƒ¶Fs².s®B§®.#®.ğ½Àù€ì(€¡½ÍĞ¹¥¹¹•É!Q50õ ì)ô((¼¼ƒŠRŠR ƒ¶:ã²Äƒ²jÓ²j¤ƒ¶vC®š®>ƒŠRŠR )±•Ğ}É…­•É½ÕÁÍ…¡”õ¹Õ±°ì(¼¼ƒ¶:ã²Äƒ²3²4£ªâÃ²‚@§²^´€ôƒ¶Vc¶Z$£¶f#ŠK²nC®. ¤ƒ²^Ó²Â£²v`ƒ²Ús®Âs²^´¡‰½Õ¹‘…ÉålÁt¤¸ƒ®2²‚ŠK®
£®2ªÖ°ƒ²^Ó²Â£®*P(¼¼ƒ¶Vc¶Z$½É¥¥¸÷®2²‚ƒŠH€Ÿ®2²‚ƒ²3²4Ÿ²vÓ®¦Àƒ®
£®2ªÖ³²^C²pƒ²ó®ÂW²ró®†pƒ¶Fs².s®Bs®.¸)™Õ¹Ñ¥½¸}É…­•!½µ”¡Í•Ä¥ì(€™½È¡½¹ÍĞ¹¼½˜Í•Ä¥í½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡¹¼¤í¥˜¡Ğ˜™Ğ¹‘¥Èôôô‘½İ¸œ˜™Ğ¹‰½Õ¹‘…Éä˜™Ğ¹‰½Õ¹‘…ÉålÁt¥É•ÑÕÉ¸Ğ¹‰½Õ¹‘…ÉålÁtíô(€½¹ÍĞ˜õ•ÑQÉ…¥¹	å9¼¡Í•ÅlÁt¤ì(€É•ÑÕÉ¸€¡˜˜™˜¹‰½Õ¹‘…Éä˜™˜¹‰½Õ¹‘…ÉålÁt¥ñğ¡˜ı}É½ÑMÑ…ÉĞ¡˜¤¹ÍÑ¸èŸªâÃ¶ œ¤ì)ô)™Õ¹Ñ¥½¸}É…­•É½ÕÁÌ ¥ì(€¥˜¡}É…­•É½ÕÁÍ…¡”¥É•ÑÕÉ¸}É…­•É½ÕÁÍ…¡”ì(€½¹ÍĞ‰å%õíôì=‰©•Ğ¹Ù…±Õ•Ì¡=9%I5}I=QQ%=8¤¹™½É… ¡Èôùí‰å%‘mÈ¹¥‘tõÈ¹Í•Äíô¤ì(€½¹ÍĞÉ½ÕÁÌõíôì(€=‰©•Ğ¹•¹ÑÉ¥•Ì¡‰å%¤¹™½É…  ¡m¥±Í•Åt¤ôùì(€€€½¹ÍĞ¡½µ”õ}É…­•!½µ”¡Í•Ä¤ì(€€€€¡É½ÕÁÍm¡½µ•tõÉ½ÕÁÍm¡½µ•uññmt¤¹ÁÕÍ ¡í¥±Í•Ä±¡½µ•ô¤ì(€ô¤ì(€½¹ÍĞ…ÉÈõ=‰©•Ğ¹•¹ÑÉ¥•Ì¡É½ÕÁÌ¤¹µ…À ¡mœ±É…­•Ít¤ôùì(€€€É…­•Ì¹Í½ÉĞ ¡„±ˆ¤ôù5…Ñ ¹µ¥¸ ¸¸¹„¹Í•Ä¹µ…À¡9Õµ‰•È¤¤µ5…Ñ ¹µ¥¸ ¸¸¹ˆ¹Í•Ä¹µ…À¡9Õµ‰•È¤¤¤ì(€€€½¹ÍĞµ¥¹9¼õ5…Ñ ¹µ¥¸ ¸¸¹É…­•Ì¹™±…Ñ5…À¡ÈôùÈ¹Í•Ä¹µ…À¡¸ôø­¸¤¤¤ì(€€€É•ÑÕÉ¸íœ±É…­•Ì±µ¥¹9½ôì(€ô¤ì(€…ÉÈ¹Í½ÉĞ ¡„±ˆ¤ôù„¹µ¥¹9¼µˆ¹µ¥¹9¼¤ì(€É•ÑÕÉ¸}É…­•É½ÕÁÍ…¡”õ…ÉÈì)ô)™Õ¹Ñ¥½¸É•¹‘•É=ÁÍI…­”¡¡½ÍĞ¥ì(€¥˜¡ÑåÁ•½˜=9%I5}I=QQ%=8ôôôÕ¹‘•™¥¹•œ¥í¡½ÍĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~Rğ½‘¥ØøñÀû²jÓ²j¤ƒ®6Ã²vÓ¶ÃªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞÉ½ÕÁÌõ}É…­•É½ÕÁÌ ¤ì(€¥˜ …É½ÕÁÌ¹±•¹Ñ ¥í¡½ÍĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~Rğ½‘¥ØøñÀû¶fW²‚Tƒ²jÓ²j§¶FsªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜ …}½ÁÍÉ½ÕÁñğ…É½ÕÁÌ¹Í½µ”¡àôùà¹œôôõ}½ÁÍÉ½ÕÀ¤¥}½ÁÍÉ½ÕÀõÉ½ÕÁÍlÁt¹œì(€½¹ÍĞÉÀõÉ½ÕÁÌ¹™¥¹¡àôùà¹œôôõ}½ÁÍÉ½ÕÀ¤ì(€±•Ğ õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÑ½½±‰…Èˆø(€€€€ñÍ•±•Ğ±…ÍÌô‰½ÁÌµÍ•°ˆ½¹¡…¹”ô‰}½ÁÍÉ½ÕÀõÑ¡¥Ì¹Ù…±Õ”íÉ•¹‘•É=ÁÍQ…ˆ ¤ˆø(€€€€€€‘íÉ½ÕÁÌ¹µ…À¡àôù€ñ½ÁÑ¥½¸Ù…±Õ”ôˆ‘í}½ÁÍÍŒ¡à¹œ¥ôˆ‘íà¹œôôõ}½ÁÍÉ½ÕÀüœÍ•±•Ñ•œèœôø‘í}½ÁÍÍŒ¡à¹œ¥ôƒ²3²4ƒ
Ü€‘íà¹É…­•Ì¹±•¹Ñ¡÷¶:ã²Äğ½½ÁÑ¥½¸ù€¤¹©½¥¸ œœ¥ô(€€€€ğ½Í•±•Ğø(€€€€ñÍÁ…¸±…ÍÌô‰½ÁÌµ½Õ¹Ğˆø‘íÉÀ¹É…­•Ì¹É•‘Õ” ¡„±È¤ôù„­È¹Í•Ä¹±•¹Ñ °À¥÷¶:àƒ²jÓ¶Z$ğ½ÍÁ…¸ø(€€ğ½‘¥Øù€ì(€½¹ÍĞÉÕ±•Èõmtì(€™½È¡±•Ğ¡ ôĞí¡ ğôÈàí¡ ¬ôÈ¥í½¹ÍĞÁĞô¡¡ ¨ØÀ´ÈĞÀ¤¼ÄĞĞÀ¨ÄÀÀíÉÕ±•È¹ÁÕÍ ¡€ñÍÁ…¸±…ÍÌô‰½ÁÌµÑ¥¬ˆÍÑå±”ô‰±•™Ğè‘íÁÑô”ˆø‘íMÑÉ¥¹œ¡¡ ”ÈĞ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôğ½ÍÁ…¸ù€¤íô(€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÉÕ±•ÈµİÉ…Àˆøñ‘¥Ø±…ÍÌô‰½ÁÌµÉÕ±•Èˆø‘íÉÕ±•È¹©½¥¸ œœ¥ôğ½‘¥Øøğ½‘¥Øù€ì(€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÉ…­•Ìˆù€ì(€ÉÀ¹É…­•Ì¹™½É… ¡É¬ôùì(€€€½¹ÍĞ±•ÌõÉ¬¹Í•Ä¹µ…À¡¹¼ôù•ÑQÉ…¥¹	å9¼¡¹¼¤¤¹™¥±Ñ•È¡	½½±•…¸¤ì(€€€¥˜ …±•Ì¹±•¹Ñ ¥É•ÑÕÉ¸ì(€€€½¹ÍĞ‰±½­Ìõ±•Ì¹µ…À¡Ğôùì(€€€€€½¹ÍĞÍĞõ}É½ÑMÑ…ÉĞ¡Ğ¤±”õ}É½Ñ¹¡Ğ¤ì(€€€€€±•Ğ„õ=AM}à¡ÍĞ¹µ¥¸¤±ˆõ=AM}à¡”¹µ¥¸¤ì(€€€€€¥˜¡ˆôõ¹Õ±±ññ„ôõ¹Õ±°¥É•ÑÕÉ¸€œœì(€€€€€¥˜¡ˆñ„¥ˆôÄØàÀì€¼¼ƒ²zC²‚Tƒ®cªæ ƒ®Â§²ZĞ(€€€€€½¹ÍĞ±•™Ğô¡„´ÈĞÀ¤¼ÄĞĞÀ¨ÄÀÀ°Üõ5…Ñ ¹µ…à À¸Ü°¡ˆµ„¤¼ÄĞĞÀ¨ÄÀÀ¤ì(€€€€€½¹ÍĞŒõI}=1=IMmĞ¹É…‘•uñğœŒáˆäĞå”œì(€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰½ÁÌµ‰±¬ˆÍÑå±”ô‰±•™Ğè‘í±•™Ñô”íİ¥‘Ñ è‘íİô”ì´µŒè‘íôˆ½¹±¥¬ô‰©ÕµÁQ½QÉ…¥¸ œ‘íĞ¹¹½ôœ¤ˆÑ¥Ñ±”ôˆ‘í}½ÁÍÍŒ¡Ğ¹É…‘”¥ô€‘íĞ¹¹½ôƒ
Ü€‘í}½ÁÍÍŒ¡ÍĞ¹ÍÑ¸¥ô€‘í}™µÑ4¡ÍĞ¹µ¥¸¥ôƒŠH€‘í}½ÁÍÍŒ¡”¹ÍÑ¸¥ô€‘í}™µÑ4¡”¹µ¥¸¥ôˆø‘íÜøÔı€ñÍÁ…¸ø‘íĞ¹¹½ôğ½ÍÁ…¸ù€èœôğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤ì(€€€½¹ÍĞ©´õÉ¬¹¥¹µ…Ñ  ½p ¡mx¥t¨ü§²ó®ÂUp¤¼¤ì(€€€½¹ÍĞ©Õ‰…­MÑ¸õ©´ı©µlÅté¹Õ±°ì(€€€ ¬õ€ñ‘¥Ø±…ÍÌô‰½ÁÌµÉ…­”ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰½ÁÌµÉ…­”µ±…‰•°ˆøñˆø‘í}½ÁÍÍŒ¡É¬¹¥¹É•Á±…” ½p ¸©p¤¼°œœ¤¹ÑÉ¥´ ¤¥ôğ½ˆø‘í©Õ‰…­MÑ¸ı€€ñÍÁ…¸±…ÍÌô‰½ÁÌµ©Õ‰…¬ˆø‘í}½ÁÍÍŒ¡©Õ‰…­MÑ¸¥ôƒ²ó®ÂTğ½ÍÁ…¸ù€èœôñÍÁ…¸±…ÍÌô‰½ÁÌµÉ…­”µ¸ˆø‘í±•Ì¹±•¹Ñ¡÷¶j0ƒ²jÓ²j¤ğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰½ÁÌµÉ…­”µÑÉ…¬ˆø‘í‰±½­Íôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤ì(€ ¬õ€ğ½‘¥Øù€ì(€ ¬õ€ñÀ±…ÍÌô‰½ÁÌµ¡¥¹Ğˆû¶Vpƒ²’€ôƒ¶:ã²Ä€ÇªÂs²v`ƒ¶Vc® ƒ²jÓ²j¤ƒ
Üƒ®âS®†t€ôƒ²^Ó²Â €Ç¶:à£ªÂ®†pƒ²r²æc
ßªâã²vĞ€ôƒ²jÓ¶Z$ƒ².sªÂ®2 ¤ƒ
Üƒ®âS®†tƒ²
³²vĞƒ®æ ƒªÖ³ªÂ€ôƒ¶j3²Â£
ß²ó®ÂTƒ
Üƒ®âS®†w²vƒ®"®–Ó®¦Ğƒ²^Ó²Â ƒ²²ã®†pƒ²vÓ®>dğ½Àù€ì(€¡½ÍĞ¹¥¹¹•É!Q50õ ì)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~R4ƒ²‚²Ê€ƒªÊ÷®†pƒªÊ²$ƒŠPƒ²Ús®Âs
ß®>²Â§²^´ƒ²Ös²3¶fc²*äƒªÊ÷®†pƒ²V#®
Ğ(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}µÉÉ½´ôœœ°}µÉY¥„ôœœ°}µÉQ¼ôœœ°}µÉ5½‘”ôÑÉ…¹Í™•Èœ°}µÉQ¥µ•5½‘”ô‘•Á…ÉĞœ°}µÉQ¥µ”ôœœ°}µÉQ¥µ•áÁ±¥¥Ğõ™…±Í”°}µÉ‘•5½‘”ô¹½Éµ…°œ°}µÉ1…ÍÑ)½ÕÉ¹•äõ¹Õ±°ì)±•Ğ}µÉQÉ…¹ÍÁ½ÉÑ5½‘”ôµ•ÑÉ¼œ±}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌõí­ÑàéÑÉÕ”±•¹•É…°éÑÉÕ”±ÑàéÑÉÕ•ôì)±•Ğ}µÉA¥­•ÉÉ…™Ñ5½‘”ô‘•Á…ÉĞœ°}µÉA¥­•ÉÉ…™Ñ‘”ô¹½Éµ…°œì)™Õ¹Ñ¥½¸Í•Ñ5É5½‘”¡´¥í}µÉ5½‘”õ´í‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÈµµ½‘”µ¡¥Àœ¤¹™½É… ¡ŒôùŒ¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½¸œ±Œ¹‘…Ñ…Í•Ğ¹µ½‘”ôôõ´¤¤í¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤íô)±•Ğ}µ•ÑÉ½É…Á¡…¡”õ¹Õ±°ì)™Õ¹Ñ¥½¸}µ•ÑÉ½É…Á  ¥ì(€¥˜¡}µ•ÑÉ½É…Á¡…¡”¥É•ÑÕÉ¸}µ•ÑÉ½É…Á¡…¡”ì(€½¹ÍĞ…‘¨õíô°ÍÑ¹1¥¹•Ìõíô°ÍÑ¹A…ÑÑ•É¹Ìõíô°±¥¹•	å%õíô°Á…ÑÑ•É¹Ìõíôì(€½¹ÍĞ±¥¹•	å9…µ”õíôì(€€¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œı5QI=}1%9Lémt¤¹™½É… ¡°ôùì(€€€±¥¹•	å%‘m°¹¥‘tõ°ì±¥¹•	å9…µ•m°¹¹…µ•tõ°ì(€€€€¡°¹É½ÕÑ•ÍññmíÍÑ…Ñ¥½¹Ìé°¹ÍÑ…Ñ¥½¹Íõt¤¹™½É… ¡Èôùì(€€€€€½¹ÍĞÍĞõÈ¹ÍÑ…Ñ¥½¹Íññmtì(€€€€€ÍĞ¹™½É… ¡Ìôùì¡ÍÑ¹1¥¹•ÍmÍtõÍÑ¹1¥¹•ÍmÍuññ¹•ÜM•Ğ ¤¤¹…‘¡°¹¥¤íô¤ì(€€€ô¤ì(€ô¤ì(€€¼¼ƒ².“²‚pƒ¶:ã²Ç²v`ƒ²fW®ÎÔƒ®ÂÃ²^Ó²vƒ¶j3²Â£²‚C®Îƒ®.£®Â§¶Z”ƒ²jÓ¶Z$ƒªÖ³ªÂ²ró®†pƒ®
c®"#®.¸(€€¼¼ƒªÂg²v ƒ®ã²ƒ²vÓ®vó®>ƒ²s®†pƒ®.“®–àƒªÖ³ªÂƒ¶:ã²Ç²ró®†pƒªÂ#²V¶®¦Ğƒ®Î®>Á…ÑÑ•É»²vÓ®¾®†pƒ¶fc²*ç²ró®†pƒªÎ²
Ã®Bs®.¸(€½¹ÍĞÁ…ÑÑ•É¹-•åQ½%õ¹•Ü5…À ¤ì(€=‰©•Ğ¹•¹ÑÉ¥•Ì¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œı5QI=}M!éíô¤¹™½É…  ¡m±¥¹•9…µ”±•¹Ñt¤ôùì(€€€½¹ÍĞ±¥¹”õ±¥¹•	å9…µ•m±¥¹•9…µ•tì¥˜ …±¥¹•ñğ…•¹Ññğ…ÉÉ…ä¹¥ÍÉÉ…ä¡•¹Ğ¹Ğ¤¥É•ÑÕÉ¸ì(€€€•¹Ğ¹Ğ¹™½É… ¡˜ôùì(€€€€€½¹ÍĞ¸õ5…Ñ ¹™±½½È¡˜¹±•¹Ñ ¼Ì¤°¥‘áM•Äõmtì(€€€€€™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥¥‘áM•Ä¹ÁÕÍ ¡™lÌ©¤¬Ét¤ì(€€€€€}µ•ÑÉ½1•I…¹•Ì¡¥‘áM•Ä¤¹™½É…  ¡mÍÑ…ÉĞ±•¹‘t¤ôùì(€€€€€€€½¹ÍĞÍ•Äõmtì(€€€€€€€™½È¡±•Ğ¤õÍÑ…ÉĞí¤ğõ•¹í¤¬¬¥ì(€€€€€€€€€½¹ÍĞÍÑ…Ñ¥½¸õ•¹Ğ¹Ím¥‘áM•Åm¥utì(€€€€€€€€€¥˜¡ÍÑ…Ñ¥½¸„õ¹Õ±°˜™Í•ÅmÍ•Ä¹±•¹Ñ ´Åt„ôõÍÑ…Ñ¥½¸¥Í•Ä¹ÁÕÍ ¡ÍÑ…Ñ¥½¸¤ì(€€€€€€€ô(€€€€€€€¥˜¡Í•Ä¹±•¹Ñ ğÈ¥É•ÑÕÉ¸ì(€€€€€€€½¹ÍĞ­•äõ€‘í±¥¹”¹¥‘õqÔÀÀÀÈ‘íÍ•Ä¹©½¥¸ qÔÀÀÀÈœ¥õ€ì(€€€€€€€±•ĞÁ¥õÁ…ÑÑ•É¹-•åQ½%¹•Ğ¡­•ä¤ì(€€€€€€€¥˜ …Á¥¥ì(€€€€€€€€€Á¥õÀ‘íÁ…ÑÑ•É¹-•åQ½%¹Í¥é•õ€ì(€€€€€€€€€Á…ÑÑ•É¹-•åQ½%¹Í•Ğ¡­•ä±Á¥¤ì(€€€€€€€€€Á…ÑÑ•É¹ÍmÁ¥‘tõí¥éÁ¥±±¥é±¥¹”¹¥±±¥¹•9…µ”±ÍÑ…Ñ¥½¹ÌéÍ•Åôì(€€€€€€€€€™½È¡±•Ğ¤ôÀí¤ñÍ•Ä¹±•¹Ñ í¤¬¬¥ì(€€€€€€€€€€€½¹ÍĞÍÑ…Ñ¥½¸õÍ•Åm¥tì(€€€€€€€€€€€€¡ÍÑ¹A…ÑÑ•É¹ÍmÍÑ…Ñ¥½¹tõÍÑ¹A…ÑÑ•É¹ÍmÍÑ…Ñ¥½¹uññ¹•ÜM•Ğ ¤¤¹…‘¡Á¥¤ì(€€€€€€€€€€€€¡ÍÑ¹1¥¹•ÍmÍÑ…Ñ¥½¹tõÍÑ¹1¥¹•ÍmÍÑ…Ñ¥½¹uññ¹•ÜM•Ğ ¤¤¹…‘¡±¥¹”¹¥¤ì(€€€€€€€€€€€¥˜¡¤ñÍ•Ä¹±•¹Ñ ´Ä¥ì(€€€€€€€€€€€€€€¡…‘©mÍÑ…Ñ¥½¹tõ…‘©mÍÑ…Ñ¥½¹uññ¹•Ü5…À ¤¤ì(€€€€€€€€€€€€€¥˜ ……‘©mÍÑ…Ñ¥½¹t¹¡…Ì¡Á¥¤¥…‘©mÍÑ…Ñ¥½¹t¹Í•Ğ¡Á¥±¹•ÜM•Ğ ¤¤ì(€€€€€€€€€€€€€…‘©mÍÑ…Ñ¥½¹t¹•Ğ¡Á¥¤¹…‘¡Í•Åm¤¬Åt¤ì(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€ô(€€€€€ô¤ì(€€€ô¤ì(€ô¤ì(€É•ÑÕÉ¸}µ•ÑÉ½É…Á¡…¡”õí…‘¨±ÍÑ¹1¥¹•Ì±ÍÑ¹A…ÑÑ•É¹Ì±±¥¹•	å%±Á…ÑÑ•É¹Íôì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½MÑ¹1¥ÍĞ ¥í½¹ÍĞõ}µ•ÑÉ½É…Á  ¤íÉ•ÑÕÉ¸=‰©•Ğ¹­•åÌ¡¹ÍÑ¹1¥¹•Ì¤¹Í½ÉĞ ¤íô)™Õ¹Ñ¥½¸}µÉMÑ¹1¥ÍĞ ¥ì(€½¹ÍĞ¹…µ•Ìõ¹•ÜM•Ğ¡}µ•ÑÉ½MÑ¹1¥ÍĞ ¤¤ì(€¥˜¡}µÉQÉ…¹ÍÁ½ÉÑ5½‘”ôôô¥¹Ñ•É…Ñ•œ˜™ÑåÁ•½˜11}QI%9L„ôôÕ¹‘•™¥¹•œ¥11}QI%9L¹™½É… ¡ÑÉ…¥¸ôø¡ÑÉ…¥¸¹ÍÑ½ÁÍññmt¤¹™½É… ¡ÍÑ½Àôù¹…µ•Ì¹…‘¡ÍÑ½À¹Ì¤¤¤ì(€É•ÑÕÉ¸l¸¸¹¹…µ•Ít¹Í½ÉĞ ¤ì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½M¡½Ü¡¥±Á¥­¸¥ì(€½¹ÍĞ¥¹Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡¥¤ì¥˜ …¥¹À¥É•ÑÕÉ¸ì(€½¹ÍĞÄõ¥¹À¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡¥¬œµ…Œœ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€½¹ÍĞ…±°õ}µÉMÑ¹1¥ÍĞ ¤ì(€½¹ÍĞ±¥ÍĞô¡Äı…±°¹™¥±Ñ•È¡¸ôùµ…Ñ¡•ÍEÕ•Éä¡¸±Ä¤¤é…±°¹Í±¥” À°ÄÈ¤¤¹Í±¥” À°ÄÈ¤ì(€½¹ÍĞ¥õ¥¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€•°¹¥¹¹•É!Q50õ±¥ÍĞ¹µ…À¡¸ôùí½¹ÍĞ¹õ¸¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰…Œµ¥Ñ•´ˆ½¹µ½ÕÍ•‘½İ¸ô‰•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% œ‘í¥ôœ¤¹Ù…±Õ”ôœ‘í¹ôœí‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% œ‘í¥ôµ…Œœ¤¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíİ¥¹‘½İlœ‘íÁ¥­¹ôt œ‘í¹ôœ¤ˆø‘í¹ôğ½‘¥Øù€íô¤¹©½¥¸ œœ¤ì(€•°¹±…ÍÍ9…µ”ô…Œµ‘É½Á‘½İ¸½Á•¸œì•°¹ÍÑå±”¹‘¥ÍÁ±…äõ±¥ÍĞ¹±•¹Ñ ü‰±½¬œè¹½¹”œì)ô)™Õ¹Ñ¥½¸}µÉA¥­É½´¡¸¥í}µÉÉ½´õ¸í¥˜¡}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤íô)™Õ¹Ñ¥½¸}µÉA¥­Y¥„¡¸¥í}µÉY¥„õ¸í¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤íô)™Õ¹Ñ¥½¸}µÉA¥­Q¼¡¸¥í}µÉQ¼õ¸í¥˜¡}µÉÉ½´¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤íô)™Õ¹Ñ¥½¸}µÉMİ…À ¥ì(€½¹ÍĞ„õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµ™É½´œ¤°ˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¼œ¤ì(€¥˜¡„˜™ˆ¥í½¹ÍĞĞõ„¹Ù…±Õ”í„¹Ù…±Õ”õˆ¹Ù…±Õ”íˆ¹Ù…±Õ”õĞí}µÉÉ½´õ„¹Ù…±Õ”¹ÑÉ¥´ ¤í}µÉQ¼õˆ¹Ù…±Õ”¹ÑÉ¥´ ¤íô(€¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤ì)ô)™Õ¹Ñ¥½¸}µÉ½ÕÍM•…É  ¥ì(€½¹ÍĞ¥¹ÁÕĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµ™É½´œ¤ì(€¥˜¡¥¹ÁÕĞ¥í¥¹ÁÕĞ¹™½ÕÌ ¤í¥¹ÁÕĞ¹Í•±•Ğ ¤í¥¹ÁÕĞ¹ÍÉ½±±%¹Ñ½Y¥•Ü¡í‰±½¬è•¹Ñ•Èœ±‰•¡…Ù¥½ÈèÍµ½½Ñ ô¤íô)ô)™Õ¹Ñ¥½¸}µÉ•™…Õ±ÑQ¥µ” ¥ì(€½¹ÍĞõ¹•Ü…Ñ” ¤ì(€½¹ÍĞÀõ¸ôùMÑÉ¥¹œ¡¸¤¹Á…‘MÑ…ÉĞ È°œÀœ¤ì(€É•ÑÕÉ¸€‘íÀ¡¹•Ñ!½ÕÉÌ ¤¥ôè‘íÀ¡¹•Ñ5¥¹ÕÑ•Ì ¤¥õ€ì)ô)™Õ¹Ñ¥½¸Í•Ñ5ÉQ¥µ•5½‘”¡µ½‘”¥ì(€}µÉQ¥µ•5½‘”õµ½‘”ôôô…ÉÉ¥Ù”œü…ÉÉ¥Ù”œè‘•Á…ÉĞœì(€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÈµÑ¥µ”µµ½‘”‰ÕÑÑ½¸œ¤¹™½É… ¡‰ÕÑÑ½¸ôù‰ÕÑÑ½¸¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½¸œ±‰ÕÑÑ½¸¹‘…Ñ…Í•Ğ¹Ñ¥µ•5½‘”ôôõ}µÉQ¥µ•5½‘”¤¤ì(€¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5É‘•5½‘”¡µ½‘”±¡•­•¥ì(€½¹ÍĞÑ¥µ•%¹ÁÕĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¥µ”œ¤í¥˜¡Ñ¥µ•%¹ÁÕĞ¥}µÉQ¥µ”õÑ¥µ•%¹ÁÕĞ¹Ù…±Õ”ì(€}µÉ‘•5½‘”õ¡•­•ü¡µ½‘”ôôô±…ÍĞœü±…ÍĞœè™¥ÉÍĞœ¤è¹½Éµ…°œì(€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÈµ•‘”µ¡•¬¥¹ÁÕĞœ¤¹™½É… ¡¥¹ÁÕĞôùí¥¹ÁÕĞ¹¡•­•õ¥¹ÁÕĞ¹Ù…±Õ”ôôõ}µÉ‘•5½‘”íô¤ì(€¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤ì)ô)™Õ¹Ñ¥½¸}µÉ±½­1…‰•°¡Ù…±Õ”¥ì(€½¹ÍĞm ±µtõMÑÉ¥¹œ¡Ù…±Õ•ññ}µÉ•™…Õ±ÑQ¥µ” ¤¤¹ÍÁ±¥Ğ œèœ¤¹µ…À¡9Õµ‰•È¤±…µÀõ ğÄÈüŸ²b“²‚œèŸ²b“¶nœ±¡½ÕÈõ ”ÄÉñğÄÈì(€É•ÑÕÉ¸€‘í…µÁô€‘íMÑÉ¥¹œ¡¡½ÕÈ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡µñğÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì)ô)™Õ¹Ñ¥½¸½Á•¹5ÉQ¥µ•A¥­•È ¥ì(€±½Í•5ÉQ¥µ•A¥­•È ¤ì(€}µÉA¥­•ÉÉ…™Ñ5½‘”õ}µÉQ¥µ•5½‘”í}µÉA¥­•ÉÉ…™Ñ‘”õ}µÉ‘•5½‘”ì(€½¹ÍĞm ±µtõMÑÉ¥¹œ¡}µÉQ¥µ•ññ}µÉ•™…Õ±ÑQ¥µ” ¤¤¹ÍÁ±¥Ğ œèœ¤¹µ…À¡9Õµ‰•È¤±¡½ÕÈõ ”ÄÉñğÄÈì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤íİÉ…À¹¥ôµÈµÑ¥µ”µÁ¥­•ÈµİÉ…ÀœíİÉ…À¹±…ÍÍ9…µ”ôµÈµÑ¥µ”µÁ¥­•ÈµİÉ…Àœì(€½¹ÍĞ½ÁÑÌô¡™É½´±Ñ¼±ÕÉÉ•¹Ğ¤ôùÉÉ…ä¹™É½´¡í±•¹Ñ éÑ¼µ™É½´¬Åô°¡|±¥¹‘•à¤ôùí½¹ÍĞÙ…±Õ”õ™É½´­¥¹‘•àíÉ•ÑÕÉ¸€ñ½ÁÑ¥½¸Ù…±Õ”ôˆ‘íÙ…±Õ•ôˆ‘íÙ…±Õ”ôôõÕÉÉ•¹ĞüœÍ•±•Ñ•œèœôø‘íMÑÉ¥¹œ¡Ù…±Õ”¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôğ½½ÁÑ¥½¸ù€íô¤¹©½¥¸ œœ¤ì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰µÈµÑ¥µ”µÁ¥­•Èµ‰…­‘É½Àˆ½¹±¥¬ô‰±½Í•5ÉQ¥µ•A¥­•È ¤ˆøğ½‘¥ØøñÍ•Ñ¥½¸±…ÍÌô‰µÈµÑ¥µ”µÁ¥­•ÈˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆ…É¥„µ±…‰•°ô‹ªÊ÷®†pƒªÊ²$ƒ².sªÂƒ²ƒ¶tˆøñ‘¥Ø±…ÍÌô‰µÈµÁ¥­•ÈµÑ…‰Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁ¥­•Èµµ½‘”ô‰‘•Á…ÉĞˆ±…ÍÌôˆ‘í}µÉQ¥µ•5½‘”ôôô‘•Á…ÉĞœü½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5ÉA¥­•É5½‘” ‘•Á…ÉĞœ¤ˆû²Ús®Âpğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁ¥­•Èµµ½‘”ô‰…ÉÉ¥Ù”ˆ±…ÍÌôˆ‘í}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œü½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5ÉA¥­•É5½‘” …ÉÉ¥Ù”œ¤ˆû®>²Â¤ğ½‰ÕÑÑ½¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰µÈµÁ¥­•Èµ±½¬ˆøñÍ•±•Ğ¥ô‰µÈµÁ¥­•Èµ…µÀˆ…É¥„µ±…‰•°ô‹²b“²‚ƒ²b“¶nˆøñ½ÁÑ¥½¸Ù…±Õ”ô‰…´ˆ‘í ğÄÈüœÍ•±•Ñ•œèœôû²b“²‚ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸Ù…±Õ”ô‰Á´ˆ‘í øôÄÈüœÍ•±•Ñ•œèœôû²b“¶nğ½½ÁÑ¥½¸øğ½Í•±•ĞøñÍ•±•Ğ¥ô‰µÈµÁ¥­•Èµ¡½ÕÈˆ…É¥„µ±…‰•°ô‹².pˆø‘í½ÁÑÌ Ä°ÄÈ±¡½ÕÈ¥ôğ½Í•±•ĞøñÍÁ…¸øèğ½ÍÁ…¸øñÍ•±•Ğ¥ô‰µÈµÁ¥­•Èµµ¥¹ÕÑ”ˆ…É¥„µ±…‰•°ô‹®Úˆø‘í½ÁÑÌ À°Ôä±µñğÀ¥ôğ½Í•±•Ğøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰µÈµÁ¥­•Èµ•‘•Ìˆøñ±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆÙ…±Õ”ô‰™¥ÉÍĞˆ‘í}µÉ‘•5½‘”ôôô™¥ÉÍĞœüœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5ÉA¥­•É‘” ™¥ÉÍĞœ±Ñ¡¥Ì¹¡•­•¤ˆøñÍÁ…¸û²Ê¯²Â£¶ªâÀğ½ÍÁ…¸øğ½±…‰•°øñ±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆÙ…±Õ”ô‰±…ÍĞˆ‘í}µÉ‘•5½‘”ôôô±…ÍĞœüœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5ÉA¥­•É‘” ±…ÍĞœ±Ñ¡¥Ì¹¡•­•¤ˆøñÍÁ…¸û®'²Â£¶ªâÀğ½ÍÁ…¸øğ½±…‰•°øğ½‘¥Øøñ™½½Ñ•Èøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬ô‰±½Í•5ÉQ¥µ•A¥­•È ¤ˆû²Ş£²0ğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰½¹™¥É´ˆ½¹±¥¬ô‰…ÁÁ±å5ÉQ¥µ•A¥­•È ¤ˆû¶fW²vàğ½‰ÕÑÑ½¸øğ½™½½Ñ•Èøğ½Í•Ñ¥½¸ù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤í‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ µÈµÑ¥µ”µÁ¥­•Èµ½Á•¸œ¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5ÉA¥­•É5½‘”¡µ½‘”¥ì(€}µÉA¥­•ÉÉ…™Ñ5½‘”õµ½‘”ôôô…ÉÉ¥Ù”œü…ÉÉ¥Ù”œè‘•Á…ÉĞœí‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° m‘…Ñ„µÁ¥­•Èµµ½‘•tœ¤¹™½É… ¡‰ÕÑÑ½¸ôù‰ÕÑÑ½¸¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½¸œ±‰ÕÑÑ½¸¹‘…Ñ…Í•Ğ¹Á¥­•É5½‘”ôôõ}µÉA¥­•ÉÉ…™Ñ5½‘”¤¤ì)ô)™Õ¹Ñ¥½¸Í•Ñ5ÉA¥­•É‘”¡µ½‘”±¡•­•¥ì(€}µÉA¥­•ÉÉ…™Ñ‘”õ¡•­•ü¡µ½‘”ôôô±…ÍĞœü±…ÍĞœè™¥ÉÍĞœ¤è¹½Éµ…°œí‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œ¹µÈµÁ¥­•Èµ•‘•Ì¥¹ÁÕĞœ¤¹™½É… ¡¥¹ÁÕĞôùí¥¹ÁÕĞ¹¡•­•õ¥¹ÁÕĞ¹Ù…±Õ”ôôõ}µÉA¥­•ÉÉ…™Ñ‘”íô¤ì)ô)™Õ¹Ñ¥½¸…ÁÁ±å5ÉQ¥µ•A¥­•È ¥ì(€½¹ÍĞ…µÀõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÁ¥­•Èµ…µÀœ¤ü¹Ù…±Õ”±¡½ÕÈõ9Õµ‰•È¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÁ¥­•Èµ¡½ÕÈœ¤ü¹Ù…±Õ•ñğÄÈ¤±µ¥¹ÕÑ”õ9Õµ‰•È¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÁ¥­•Èµµ¥¹ÕÑ”œ¤ü¹Ù…±Õ•ñğÀ¤ì(€±•Ğ õ¡½ÕÈ”ÄÈí¥˜¡…µÀôôôÁ´œ¥ ¬ôÄÈí}µÉQ¥µ”õ€‘íMÑÉ¥¹œ¡ ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ôè‘íMÑÉ¥¹œ¡µ¥¹ÕÑ”¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€í}µÉQ¥µ•áÁ±¥¥ĞõÑÉÕ”í}µÉQ¥µ•5½‘”õ}µÉA¥­•ÉÉ…™Ñ5½‘”í}µÉ‘•5½‘”õ}µÉA¥­•ÉÉ…™Ñ‘”ì(€±½Í•5ÉQ¥µ•A¥­•È ¤íÉ•¹‘•É5•ÑÉ½I½ÕÑ•Q…ˆ ¤í¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤ì)ô)™Õ¹Ñ¥½¸±½Í•5ÉQ¥µ•A¥­•È ¥í½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¥µ”µÁ¥­•ÈµİÉ…Àœ¤í¥˜¡İÉ…À¥İÉ…À¹É•µ½Ù” ¤í‘½Õµ•¹Ğ¹‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” µÈµÑ¥µ”µÁ¥­•Èµ½Á•¸œ¤íô)™Õ¹Ñ¥½¸Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ5½‘”¡µ½‘”¥í}µÉQÉ…¹ÍÁ½ÉÑ5½‘”õµ½‘”ôôô¥¹Ñ•É…Ñ•œü¥¹Ñ•É…Ñ•œèµ•ÑÉ¼œíÉ•¹‘•É5•ÑÉ½I½ÕÑ•Q…ˆ ¤íô)™Õ¹Ñ¥½¸Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•È¡­¥¹±¡•­•¥í¥˜¡­¥¹¥¸}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¥}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÍm­¥¹‘tô„…¡•­•í¥˜¡}µÉÉ½´˜™}µÉQ¼¥Í•…É¡5•ÑÉ½I½ÕÑ” ¤íô)™Õ¹Ñ¥½¸}µÉM¡…É•I½ÕÑ” ¥ì(€½¹ÍĞÑ•áĞõ9%5	dI…¥°ƒ²‚²Ê€ƒªÊ÷®†pè€‘ím}µÉÉ½´±}µÉY¥„±}µÉQ½t¹™¥±Ñ•È¡	½½±•…¸¤¹©½¥¸ œƒŠH€œ¥õ€ì(€¥˜¡¹…Ù¥…Ñ½È¹Í¡…É”¥í¹…Ù¥…Ñ½È¹Í¡…É”¡íÑ¥Ñ±”è9%5	dI…¥°ƒ²‚²Ê€ƒªÊ÷®†pœ±Ñ•áÑô¤¹…Ñ   ¤ôùíô¤íÉ•ÑÕÉ¸íô(€¥˜¡¹…Ù¥…Ñ½È¹±¥Á‰½…É˜™¹…Ù¥…Ñ½È¹±¥Á‰½…É¹İÉ¥Ñ•Q•áĞ¥í¹…Ù¥…Ñ½È¹±¥Á‰½…É¹İÉ¥Ñ•Q•áĞ¡Ñ•áĞ¤¹Ñ¡•¸  ¤ôù…±•ÉĞ ŸªÊ÷®†pƒ²‚W®ÎÓªÂ ƒ®Î×²
³®BC²*×®.#®.¸œ¤¤¹…Ñ   ¤ôùíô¤íô)ô)™Õ¹Ñ¥½¸}µÉA±…¹¹•‘I½ÕÑ”¡™É½´±Ù¥„±Ñ¼±µ½‘”±•á±Õ‘•‘A¥‘Ì¥ì(€½¹ÍĞÁ½¥¹ÑÌõm™É½´±Ù¥„±Ñ½t¹™¥±Ñ•È¡	½½±•…¸¤±Í•µ•¹ÑÌõmtì(€™½È¡±•Ğ¤ôÀí¤ñÁ½¥¹ÑÌ¹±•¹Ñ ´Äí¤¬¬¥ì(€€€½¹ÍĞÁ…ÉĞõ}µ•ÑÉ½¥¹‘I½ÕÑ”¡Á½¥¹ÑÍm¥t±Á½¥¹ÑÍm¤¬Åt±µ½‘”±•á±Õ‘•‘A¥‘Ì¤ì(€€€¥˜¡Á…ÉĞ¹•ÉÈ¥É•ÑÕÉ¸Á…ÉĞì(€€€Á…ÉĞ¹Í•µ•¹ÑÌ¹™½É… ¡Í•µ•¹Ğôùì(€€€€€½¹ÍĞ±…ÍĞõÍ•µ•¹ÑÍmÍ•µ•¹ÑÌ¹±•¹Ñ ´Åtì(€€€€€¥˜¡±…ÍĞ˜™±…ÍĞ¹Á¥ôôõÍ•µ•¹Ğ¹Á¥˜™±…ÍĞ¹ÍÑ¹Ì¹…Ğ ´Ä¤ôôõÍ•µ•¹Ğ¹ÍÑ¹ÍlÁt¥±…ÍĞ¹ÍÑ¹Ì¹ÁÕÍ  ¸¸¹Í•µ•¹Ğ¹ÍÑ¹Ì¹Í±¥” Ä¤¤ì(€€€€€•±Í”Í•µ•¹ÑÌ¹ÁÕÍ ¡ì¸¸¹Í•µ•¹Ğ±ÍÑ¹Ìél¸¸¹Í•µ•¹Ğ¹ÍÑ¹Íuô¤ì(€€€ô¤ì(€ô(€É•ÑÕÉ¸íÍ•µ•¹ÑÌ±ÍÑ½ÁÌéÍ•µ•¹ÑÌ¹É•‘Õ” ¡ÍÕ´±Í•µ•¹Ğ¤ôùÍÕ´­Í•µ•¹Ğ¹ÍÑ¹Ì¹±•¹Ñ ´Ä°À¤±ÑÉ…¹Í™•ÉÌé5…Ñ ¹µ…à À±Í•µ•¹ÑÌ¹±•¹Ñ ´Ä¤±™É½´±Ñ¼±Ù¥…ôì)ô)™Õ¹Ñ¥½¸}µÉ=Á•¹5…À¡­¥¹¥ì(€¥˜ …}µÉ1…ÍÑ)½ÕÉ¹•ä¥É•ÑÕÉ¸ì(€}µ•ÑÉ½)½ÕÉ¹•å5…Àõ}µÉ1…ÍÑ)½ÕÉ¹•äì(€½¹ÍĞÉ…Á õ}µ•ÑÉ½É…Á  ¤±™¥ÉÍĞõ}µÉ1…ÍÑ)½ÕÉ¹•ä¹Í•µ•¹ÑÍlÁt±±¥¹”õÉ…Á ¹±¥¹•	å%‘m™¥ÉÍĞü¹±¥‘tì(€½¹ÍĞÉ•¥½¹Ìõl¸¸¹¹•ÜM•Ğ¡}µÉ1…ÍÑ)½ÕÉ¹•ä¹Í•µ•¹ÑÌ¹µ…À¡Í•µ•¹ĞôùÉ…Á ¹±¥¹•	å%‘mÍ•µ•¹Ğ¹±¥‘tü¹É•¥½¸¤¹™¥±Ñ•È¡	½½±•…¸¤¥tì(€¥˜¡±¥¹”¥}µ•ÑÉ½5…ÁI•¥½¸õ±¥¹”¹É•¥½¸ì(€}µ•ÑÉ½5…Á%ô}}…±±}|œíÍİ¥Ñ¡Q…ˆ µ…Àœ¤íÍ¡½İ5…Á1¥¹”¡É•¥½¹Ì¹±•¹Ñ øÄıµ•ÑÉ½©½ÕÉ¹•äè‘í•¹½‘•UI%½µÁ½¹•¹Ğ¡É•¥½¹Ì¹©½¥¸ ğœ¤¥õ€éµ•ÑÉ½…±°è‘í}µ•ÑÉ½5…ÁI•¥½¹õ€±¹Õ±°¤ì)ô)±•Ğ}µ•ÑÉ½)½ÕÉ¹•å5…Àõ¹Õ±°ì)™Õ¹Ñ¥½¸Í•Ñ5…ÁMÑ…Ñ¥½¹ÍI½ÕÑ•A½¥¹Ğ¡­¥¹±ÍÑ…Ñ¥½¸¥ì(€¥˜¡­¥¹ôôô™É½´œ¥}µÉÉ½´õÍÑ…Ñ¥½¸í•±Í”¥˜¡­¥¹ôôôÙ¥„œ¥}µÉY¥„õÍÑ…Ñ¥½¸í•±Í”}µÉQ¼õÍÑ…Ñ¥½¸ì(€±½Í•5…ÁA½ÁÕÀ ¤íÍİ¥Ñ¡Q…ˆ µ•ÑÉ½É½ÕÑ”œ¤íÉ•¹‘•É5•ÑÉ½I½ÕÑ•Q…ˆ ¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôù‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å%¡­¥¹ôôô™É½´œüµÈµ™É½´œé­¥¹ôôôÙ¥„œüµÈµÙ¥„œèµÈµÑ¼œ¤ü¹™½ÕÌ ¤°À¤ì)ô(¼¼ƒ²¶pô£²^´³².“²‚pƒ®.£®Â§¶Z”ƒ²jÓ¶Z$ƒ¶2£¶Ğ¤ƒ®.“²v×²*“¶*ã®vğ¸(¼¼ƒ®ã²ƒ®ª²vĞƒªÂg²V®>ƒ¶:ã²Ç²vĞƒ²vÓ²ZÓ²² ƒ²V+²ró®¦Ğƒ¶2£¶Ó²vƒªÂ#²V¶®¾®†pƒ¶fc²*ç²ró®†pƒ²Êc®š³¶Vs®.¸)™Õ¹Ñ¥½¸}µ•ÑÉ½¥¹‘I½ÕÑ”¡™É½´±Ñ¼±µ½‘”±•á±Õ‘•‘A¥‘Ì¥ì(€½¹ÍĞõ}µ•ÑÉ½É…Á  ¤ì(€¥˜ …¹ÍÑ¹1¥¹•Ím™É½µuñğ…¹ÍÑ¹1¥¹•ÍmÑ½t¥É•ÑÕÉ¸í•ÉÈè¹½MÑ¸ôì(€¥˜¡™É½´ôôõÑ¼¥É•ÑÕÉ¸í•ÉÈèÍ…µ”ôì(€¥˜ …¹ÍÑ¹A…ÑÑ•É¹Ím™É½µuñğ…¹ÍÑ¹A…ÑÑ•É¹ÍmÑ½t¥É•ÑÕÉ¸í•ÉÈè¹½Á…Ñ ôì(€€¼¼ƒ²Ös²3¶fc²*äèƒ¶fc²*ç²vƒ¶³ªÊ0ƒ¶:c®C¶.À£²^·²"c®*Pƒ®Ú²Â ¤€¼ƒ²Ös²3².sªÂèƒ¶fc²*çŠ& Ë²‚WªÆÃ²z”ƒ².sªÂ£²Òtƒ²3²jPƒ²Ös²0¤(€½¹ÍĞPô¡µ½‘”ôôôÑ¥µ”œ¤üÌèÄÀÀì(€½¹ÍĞ‘¥ÍĞõíô°ÁÉ•Øõíô°Í••¸õ¹•ÜM•Ğ ¤ì½¹ÍĞÁÄõmtì(€½¹ÍĞÍÑ…Ñ•-•äô¡ÍÑ…Ñ¥½¸±Á¥¤ôù€‘íÍÑ…Ñ¥½¹õqÔÀÀÀÄ‘íÁ¥‘õ€ì(€¹ÍÑ¹A…ÑÑ•É¹Ím™É½µt¹™½É… ¡Á¥ôùí¥˜¡•á±Õ‘•‘A¥‘Ì˜™•á±Õ‘•‘A¥‘Ì¹¡…Ì¡Á¥¤¥É•ÑÕÉ¸í½¹ÍĞ¬õÍÑ…Ñ•-•ä¡™É½´±Á¥¤í‘¥ÍÑm­tôÀíÁÉ•Ùm­tõ¹Õ±°íÁÄ¹ÁÕÍ ¡í¬±ÍÑ¸é™É½´±Á¥±èÁô¤íô¤ì(€±•Ğ‰•ÍĞõ¹Õ±°±‰•ÍÑõ%¹™¥¹¥Ñäì(€İ¡¥±”¡ÁÄ¹±•¹Ñ ¥ì(€€€±•Ğµ¤ôÀí™½È¡±•Ğ¤ôÄí¤ñÁÄ¹±•¹Ñ í¤¬¬¥¥˜¡ÁÅm¥t¹ñÁÅmµ¥t¹¥µ¤õ¤ì(€€€½¹ÍĞÕÈõÁÄ¹ÍÁ±¥”¡µ¤°Ä¥lÁtì(€€€¥˜¡Í••¸¹¡…Ì¡ÕÈ¹¬¤¥½¹Ñ¥¹Õ”ìÍ••¸¹…‘¡ÕÈ¹¬¤ì(€€€¥˜¡ÕÈ¹øõ‰•ÍÑ¥‰É•…¬ì(€€€¥˜¡ÕÈ¹ÍÑ¸ôôõÑ¼¥í‰•ÍĞõÕÈ¹¬í‰•ÍÑõÕÈ¹í‰É•…¬íô(€€€½¹ÍĞ¹‰ÉÌõ¹…‘©mÕÈ¹ÍÑ¹tì(€€€½¹ÍĞ¹•áÑMÑ…Ñ¥½¹Ìõ•á±Õ‘•‘A¥‘Ì˜™•á±Õ‘•‘A¥‘Ì¹¡…Ì¡ÕÈ¹Á¥¤ı¹Õ±°é¹‰ÉÌ˜™¹‰ÉÌ¹•Ğ¡ÕÈ¹Á¥¤ì(€€€¥˜¡¹•áÑMÑ…Ñ¥½¹Ì¥¹•áÑMÑ…Ñ¥½¹Ì¹™½É… ¡¹ˆôùì(€€€€€½¹ÍĞ¹¬õÍÑ…Ñ•-•ä¡¹ˆ±ÕÈ¹Á¥¤°¹õÕÈ¹¬Äì(€€€€€¥˜¡¹ğ¡‘¥ÍÑm¹­tüı%¹™¥¹¥Ñä¤¥í‘¥ÍÑm¹­tõ¹íÁÉ•Ùm¹­tõÕÈ¹¬íÁÄ¹ÁÕÍ ¡í¬é¹¬±ÍÑ¸é¹ˆ±Á¥éÕÈ¹Á¥±é¹‘ô¤íô(€€€ô¤ì(€€€€¡¹ÍÑ¹A…ÑÑ•É¹ÍmÕÈ¹ÍÑ¹uññmt¤¹™½É… ¡Á¥ôùì(€€€€€¥˜¡Á¥ôôõÕÈ¹Á¥‘ñğ¡•á±Õ‘•‘A¥‘Ì˜™•á±Õ‘•‘A¥‘Ì¹¡…Ì¡Á¥¤¤¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ¹¬õÍÑ…Ñ•-•ä¡ÕÈ¹ÍÑ¸±Á¥¤°¹õÕÈ¹­Pì(€€€€€¥˜¡¹ğ¡‘¥ÍÑm¹­tüı%¹™¥¹¥Ñä¤¥í‘¥ÍÑm¹­tõ¹íÁÉ•Ùm¹­tõÕÈ¹¬íÁÄ¹ÁÕÍ ¡í¬é¹¬±ÍÑ¸éÕÈ¹ÍÑ¸±Á¥±é¹‘ô¤íô(€€€ô¤ì(€ô(€¥˜ …‰•ÍĞ¥É•ÑÕÉ¸í•ÉÈè¹½Á…Ñ ôì(€½¹ÍĞÁ…Ñ õmtì±•Ğ¬õ‰•ÍĞìİ¡¥±”¡¬¥íÁ…Ñ ¹Õ¹Í¡¥™Ğ¡¬¤í¬ô¡¬¥¸ÁÉ•Ø¤ıÁÉ•Ùm­té¹Õ±°íô(€½¹ÍĞ¹½‘•ÌõÁ…Ñ ¹µ…À¡àôùí½¹ÍĞÀõà¹±…ÍÑ%¹‘•á=˜ qÔÀÀÀÄœ¤íÉ•ÑÕÉ¸íÌéà¹Í±¥” À±À¤±Á¥éà¹Í±¥”¡À¬Ä¥ôíô¤ì(€½¹ÍĞÍ•Ìõmtì(€¹½‘•Ì¹™½É… ¡¹ôùì(€€€½¹ÍĞ±…ÍĞõÍ•ÍmÍ•Ì¹±•¹Ñ ´Åtì(€€€¥˜¡±…ÍĞ˜™±…ÍĞ¹Á¥ôôõ¹¹Á¥¥í¥˜¡±…ÍĞ¹ÍÑ¹Ím±…ÍĞ¹ÍÑ¹Ì¹±•¹Ñ ´Åt„ôõ¹¹Ì¥±…ÍĞ¹ÍÑ¹Ì¹ÁÕÍ ¡¹¹Ì¤íô(€€€•±Í•ì(€€€€€½¹ÍĞÁ…ÑÑ•É¸õ¹Á…ÑÑ•É¹Ím¹¹Á¥‘tì(€€€€€Í•Ì¹ÁÕÍ ¡íÁ¥é¹¹Á¥±±¥éÁ…ÑÑ•É¸˜™Á…ÑÑ•É¸¹±¥±ÍÑ¹Ìém¹¹Íuô¤ì(€€€ô(€ô¤ì(€½¹ÍĞÉ•…°õÍ•Ì¹™¥±Ñ•È¡ÌôùÌ¹ÍÑ¹Ì¹±•¹Ñ øôÈ¤ì(€½¹ÍĞÍÑ½ÁÌõÉ•…°¹É•‘Õ” ¡„±Ì¤ôù„­Ì¹ÍÑ¹Ì¹±•¹Ñ ´Ä°À¤ì(€É•ÑÕÉ¸íÍ•µ•¹ÑÌéÉ•…°±ÍÑ½ÁÌ±ÑÉ…¹Í™•ÉÌé5…Ñ ¹µ…à À±É•…°¹±•¹Ñ ´Ä¤±™É½´±Ñ½ôì)ô)™Õ¹Ñ¥½¸É•¹‘•É5•ÑÉ½I½ÕÑ•Q…ˆ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±Ğµµ•ÑÉ½É½ÕÑ”œ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€¥˜¡ÑåÁ•½˜5QI=}1%9LôôôÕ¹‘•™¥¹•œ¥í•°¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆøñ‘¥Ø±…ÍÌô‰•µÁÑäµ¥½¸ˆûÂ~jğ½‘¥ØøñÀû²‚²Ê€ƒ®ã²€ƒ®6Ã²vÓ¶ÃªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞÍ¡½İ¹Q¥µ”õ}µÉQ¥µ•áÁ±¥¥Ğ˜™}µÉQ¥µ”ı}µÉQ¥µ”é}µÉ•™…Õ±ÑQ¥µ” ¤ì(€•°¹¥¹¹•É!Q50õ€(€€€€ñ¡•…‘•È±…ÍÌô‰µÈµÁ…”µ¡•…‘•Èˆø(€€€€€€ñ‘¥ØøñÍÁ…¸ù5QI<)=UI9dA199Hğ½ÍÁ…¸øñ Äû²‚²Ê€ƒªÊ÷®†pğ½ Äøğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰µÈµÕ¥‘”ˆ½¹±¥¬ô‰…±•ÉĞ Ÿ²Ús®Âs
ß®>²Â¤ƒ².sªÂƒ²’Dƒ¶Vc®
c®–ğƒ²ƒ¶w¶VcªÎ€ƒ¶V²jS¶Vc®¦ĞƒªÊ÷²rƒ²®–ğƒ²ÚSªÂ¶Vc²ã²jP¸ƒ²^Ó²Â ƒ²jÓ¶Z'²v ƒ²v×²vğƒ²b“²‚€Ó².s²^@ƒ²Š®3®B§®.#®.¸œ¤ˆ…É¥„µ±…‰•°ô‹ªÊ÷®†pƒªÊ²$ƒ²vÓ²j¤ƒ²V#®
ĞˆûŠN`ƒ²vÓ²j¤ƒ²V#®
Ğğ½‰ÕÑÑ½¸ø(€€€€ğ½¡•…‘•Èø(€€€€ñ‘¥Ø±…ÍÌô‰Í•…É µ…ÉµÈµÍ•…É µÁ…¹•°ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÑÉ…¹ÍÁ½ÉĞµÑ…‰ÌˆÉ½±”ô‰Ñ…‰±¥ÍĞˆ…É¥„µ±…‰•°ô‹ªâã²ÂûªâÀƒ®ÊS²rˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌôˆ‘í}µÉQÉ…¹ÍÁ½ÉÑ5½‘”ôôôµ•ÑÉ¼œü½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ5½‘” µ•ÑÉ¼œ¤ˆû²‚²Ê€ƒªÊ÷®†pğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌôˆ‘í}µÉQÉ…¹ÍÁ½ÉÑ5½‘”ôôô¥¹Ñ•É…Ñ•œü½¸œèœôˆ½¹±¥¬ô‰Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ5½‘” ¥¹Ñ•É…Ñ•œ¤ˆû¶×¶V¤ƒªâã²ÂûªâÀğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÁ±…”µÍÑ…¬ˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÁ±…”µÉ…¥°ˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñ¤±…ÍÌô‰™É½´ˆøğ½¤øñÍÁ…¸øğ½ÍÁ…¸øñ¤±…ÍÌô‰Ù¥„ˆøğ½¤øñÍÁ…¸øğ½ÍÁ…¸øñ¤±…ÍÌô‰Ñ¼ˆøğ½¤øğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµ™¥•±µÈµÁ±…”µ™¥•±ˆøñ±…‰•°û²Ús®Âpğ½±…‰•°ø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰…ÕÑ½½µÁ±•Ñ”µİÉ…ÀˆÍÑå±”ô‰µ¥¸µİ¥‘Ñ èÀˆø(€€€€€€€€€€€€ñ¥¹ÁÕĞÑåÁ”ô‰Ñ•áĞˆ¥ô‰µÈµ™É½´ˆ±…ÍÌô‰Ñ•É´µÍ•°ˆÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èÀˆÙ…±Õ”ôˆ‘í}µÉÉ½µñğœôˆÁ±…•¡½±‘•Èô‹²Ús®Âs²^´ˆ…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆ(€€€€€€€€€€€€€½¹¥¹ÁÕĞô‰}µ•ÑÉ½M¡½Ü µÈµ™É½´œ°}µÉA¥­É½´œ¤ˆ½¹™½ÕÌô‰Ñ¡¥Ì¹Í•±•Ğ ¤í}µ•ÑÉ½M¡½Ü µÈµ™É½´œ°}µÉA¥­É½´œ¤ˆ(€€€€€€€€€€€€€½¹‰±ÕÈô‰Í•ÑQ¥µ•½ÕĞ  ¤ôùí½¹ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµ™É½´µ…Œœ¤í¥˜¡¥¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíô°ÄÔÀ¤ˆ(€€€€€€€€€€€€€½¹­•å‘½İ¸ô‰¥˜¡•Ù•¹Ğ¹­•äôôô¹Ñ•Èœ¥í}µÉÉ½´õÑ¡¥Ì¹Ù…±Õ”¹ÑÉ¥´ ¤íÍ•…É¡5•ÑÉ½I½ÕÑ” ¤íôˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰…Œµ‘É½Á‘½İ¸ˆ¥ô‰µÈµ™É½´µ…Œˆøğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµ™¥•±µÈµÁ±…”µ™¥•±ˆøñ±…‰•°ûªÊ÷²r€€ñÍµ…±°û²ƒ¶tğ½Íµ…±°øğ½±…‰•°øñ‘¥Ø±…ÍÌô‰…ÕÑ½½µÁ±•Ñ”µİÉ…Àˆøñ¥¹ÁÕĞÑåÁ”ô‰Ñ•áĞˆ¥ô‰µÈµÙ¥„ˆ±…ÍÌô‰Ñ•É´µÍ•°ˆÙ…±Õ”ôˆ‘í}µÉY¥…ñğœôˆÁ±…•¡½±‘•Èô‹ªÊ÷²rƒ² ƒ²ÚSªÂ ˆ…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆ½¹¥¹ÁÕĞô‰}µ•ÑÉ½M¡½Ü µÈµÙ¥„œ°}µÉA¥­Y¥„œ¤ˆ½¹™½ÕÌô‰Ñ¡¥Ì¹Í•±•Ğ ¤í}µ•ÑÉ½M¡½Ü µÈµÙ¥„œ°}µÉA¥­Y¥„œ¤ˆ½¹‰±ÕÈô‰Í•ÑQ¥µ•½ÕĞ  ¤ôùí½¹ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÙ¥„µ…Œœ¤í¥˜¡¥¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíô°ÄÔÀ¤ˆøñ‘¥Ø±…ÍÌô‰…Œµ‘É½Á‘½İ¸ˆ¥ô‰µÈµÙ¥„µ…Œˆøğ½‘¥Øøğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµ™¥•±µÈµÁ±…”µ™¥•±ˆøñ±…‰•°û®>²Â¤ğ½±…‰•°ø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰…ÕÑ½½µÁ±•Ñ”µİÉ…ÀˆÍÑå±”ô‰µ¥¸µİ¥‘Ñ èÀˆø(€€€€€€€€€€€€ñ¥¹ÁÕĞÑåÁ”ô‰Ñ•áĞˆ¥ô‰µÈµÑ¼ˆ±…ÍÌô‰Ñ•É´µÍ•°ˆÍÑå±”ô‰µ…É¥¸µ‰½ÑÑ½´èÀˆÙ…±Õ”ôˆ‘í}µÉQ½ñğœôˆÁ±…•¡½±‘•Èô‹®>²Â§²^´ˆ…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆ(€€€€€€€€€€€€€½¹¥¹ÁÕĞô‰}µ•ÑÉ½M¡½Ü µÈµÑ¼œ°}µÉA¥­Q¼œ¤ˆ½¹™½ÕÌô‰Ñ¡¥Ì¹Í•±•Ğ ¤í}µ•ÑÉ½M¡½Ü µÈµÑ¼œ°}µÉA¥­Q¼œ¤ˆ(€€€€€€€€€€€€€½¹‰±ÕÈô‰Í•ÑQ¥µ•½ÕĞ  ¤ôùí½¹ÍĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¼µ…Œœ¤í¥˜¡¥¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œíô°ÄÔÀ¤ˆ(€€€€€€€€€€€€€½¹­•å‘½İ¸ô‰¥˜¡•Ù•¹Ğ¹­•äôôô¹Ñ•Èœ¥í}µÉQ¼õÑ¡¥Ì¹Ù…±Õ”¹ÑÉ¥´ ¤íÍ•…É¡5•ÑÉ½I½ÕÑ” ¤íôˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰…Œµ‘É½Á‘½İ¸ˆ¥ô‰µÈµÑ¼µ…Œˆøğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰µÈµÍİ…Àˆ½¹±¥¬ô‰}µÉMİ…À ¤ˆÑ¥Ñ±”ô‹²Ús®Âs
ß®>²Â¤ƒ®ÂSªúãªâÀˆ…É¥„µ±…‰•°ô‹²Ús®Âs²^·ªÎğƒ®>²Â§²^´ƒ®ÂSªúãªâÀˆûŠğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÑ¥µ”µÉ½Üˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰µÈµÑ¥µ”µÑÉ¥•Èˆ½¹±¥¬ô‰½Á•¹5ÉQ¥µ•A¥­•È ¤ˆøñÍÁ…¸ø‘í}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œüŸ®>²Â¤œèŸ²Ús®Âpôğ½ÍÁ…¸øñˆø‘í}µÉ±½­1…‰•°¡Í¡½İ¹Q¥µ”¥ôğ½ˆø‘í}µÉ‘•5½‘”„ôô¹½Éµ…°œı€ñ•´ø‘í}µÉ‘•5½‘”ôôô™¥ÉÍĞœüŸ²Ê¯²Â œèŸ®'²Â ôğ½•´ù€èœôñ¤…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆûŠ2ğ½¤øğ½‰ÕÑÑ½¸øñ¥¹ÁÕĞÑåÁ”ô‰Ñ¥µ”ˆ¥ô‰µÈµÑ¥µ”ˆÙ…±Õ”ôˆ‘íÍ¡½İ¹Q¥µ•ôˆ¡¥‘‘•¸…É¥„µ±…‰•°ô‹ªÊ÷®†pƒªÊ²$ƒªâÃ²’ ƒ².sªÂˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÑÉ…¹ÍÁ½ÉĞµ™¥±Ñ•ÉÌˆ…É¥„µ±…‰•°ô‹ªÖC¶×²"c®. ƒ¶V¶Àˆøñ±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆ‘í}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹­Ñàüœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•È ­Ñàœ±Ñ¡¥Ì¹¡•­•¤ˆù-Qc
İMIPğ½±…‰•°øñ±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆ‘í}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹•¹•É…°üœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•È •¹•É…°œ±Ñ¡¥Ì¹¡•­•¤ˆû²vó®Âc²^Ó²Â ğ½±…‰•°øñ±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰¡•­‰½àˆ‘í}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹Ñàüœ¡•­•œèœô½¹¡…¹”ô‰Í•Ñ5ÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•È Ñàœ±Ñ¡¥Ì¹¡•­•¤ˆùQ`ğ½±…‰•°øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰µÈµÍ•…É µ™½½Ğˆøñ‘¥Ø±…ÍÌô‰µÈµµ½‘•Ìˆ…É¥„µ±…‰•°ô‹ªÊ÷®†pƒ²‚W®‚°ˆøñ‰ÕÑÑ½¸±…ÍÌô‰µÈµµ½‘”µ¡¥À‘í}µÉ5½‘”ôôôÑÉ…¹Í™•Èœüœ½¸œèœôˆ‘…Ñ„µµ½‘”ô‰ÑÉ…¹Í™•Èˆ½¹±¥¬ô‰Í•Ñ5É5½‘” ÑÉ…¹Í™•Èœ¤ˆû²Ös²0ƒ¶fc²*äğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰µÈµµ½‘”µ¡¥À‘í}µÉ5½‘”ôôôÑ¥µ”œüœ½¸œèœôˆ‘…Ñ„µµ½‘”ô‰Ñ¥µ”ˆ½¹±¥¬ô‰Í•Ñ5É5½‘” Ñ¥µ”œ¤ˆû²Ös²0ƒ².sªÂğ½‰ÕÑÑ½¸øğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…ÉäµÈµÍ•…É µ‰ÕÑÑ½¸ˆ½¹±¥¬ô‰}µÉÉ½´õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµ™É½´œ¤¹Ù…±Õ”¹ÑÉ¥´ ¤í}µÉY¥„õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÙ¥„œ¤¹Ù…±Õ”¹ÑÉ¥´ ¤í}µÉQ¼õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¼œ¤¹Ù…±Õ”¹ÑÉ¥´ ¤í}µÉQ¥µ”õ}µÉQ¥µ•áÁ±¥¥Ğı‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¥µ”œ¤¹Ù…±Õ”é}µÉ•™…Õ±ÑQ¥µ” ¤íÍ•…É¡5•ÑÉ½I½ÕÑ” ¤ˆûªâã²ÂûªâÀğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰µÈµÉ•ÍÕ±Ğˆøğ½‘¥Øù€ì)ô(¼¼ƒªÖ³ªÂƒ².“²‚pƒ®.“²v0ƒ²^Ó²Â èƒªÂg²v ƒ®.£®Â§¶Z”±•œƒ²V#²^C²p‰½…É“ŠI…±¥¡Ó®–ğƒ²z®*Pƒ¶:àƒ²’DƒªÂ²z”ƒ®æƒ®–àƒ²Ús®Âp)™Õ¹Ñ¥½¸}µ•ÑÉ½M•M•ÉÙ¥”¡±¥¹•9…µ”°‰½…É°…±¥¡Ğ°…™Ñ•ÉMÉØ°Á…ÑÑ•É¹%¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•9…µ•tì¥˜ …•¹Ğ¤É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ¹…µ•Ìõ•¹Ğ¹Ì°ÍÙÌõ•¹Ğ¹Ğ°ÉÈõ•¹Ğ¹Œì(€¥˜ …¹…µ•Ì¹¥¹±Õ‘•Ì¡‰½…É¥ñğ…¹…µ•Ì¹¥¹±Õ‘•Ì¡…±¥¡Ğ¤¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÍÉÙ5¥¸õ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€±•Ğ‰•ÍĞõ¹Õ±°í½¹ÍĞ…±°õmtì(€™½È¡±•ĞÍ¤ôÀíÍ¤ñÍÙÌ¹±•¹Ñ íÍ¤¬¬¥ì½¹ÍĞ˜õÍÙÍmÍ¥t°¸õ˜¹±•¹Ñ ¼Ì°±ÌõÉÈıÉÉmÍ¥tèÀì(€€€½¹ÍĞ¥‘áM•Äõmtí™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥¥‘áM•Ä¹ÁÕÍ ¡™lÌ©¤¬Ét¤ì(€€€™½È¡½¹ÍĞmÍÑ…ÉĞ±•¹‘t½˜}µ•ÑÉ½1•I…¹•Ì¡¥‘áM•Ä¤¥ì(€€€€€±•Ğ¬ô´Ä±µ%‘àô´Äì(€€€€€™½È¡±•Ğ¤õÍÑ…ÉĞí¤ñ•¹í¤¬¬¥í¥˜¡¹…µ•Ím¥‘áM•Åm¥utôôõ‰½…É¥í¬õ¤í‰É•…¬íõô(€€€€€¥˜¡¬ğÀ¥½¹Ñ¥¹Õ”ì(€€€€€™½È¡±•Ğ¤õ¬¬Äí¤ğõ•¹í¤¬¬¥í¥˜¡¹…µ•Ím¥‘áM•Åm¥utôôõ…±¥¡Ğ¥íµ%‘àõ¤í‰É•…¬íõô(€€€€€¥˜¡µ%‘àğÀ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞÉ…İÌõÍÉÙ5¥¸¡™lÌ©¬¬Åt¤í±•Ğ‘ÌõÉ…İÌì(€€€€€İ¡¥±”¡‘Ìñ…™Ñ•ÉMÉØ¥‘Ì¬ôÄĞĞÀì(€€€€€½¹ÍĞ…ÉÉ	…Í”õÍÉÙ5¥¸¡™lÌ©µ%‘át¤ì(€€€€€±•Ğ…Ìõ…ÉÉ	…Í”íİ¡¥±”¡…Ìñ‘Ì¥…Ì¬ôÄĞĞÀì(€€€€€½¹ÍĞÙ¥„õmtí™½È¡±•Ğàõ¬¬Äíàñµ%‘àíà¬¬¥Ù¥„¹ÁÕÍ ¡¹…µ•Ím¥‘áM•Åmáut¤ì(€€€€€±•ĞÉ…İÌõ…ÉÉ	…Í”íİ¡¥±”¡É…İÌñÉ…İÌ¥É…İÌ¬ôÄĞĞÀì(€€€€€½¹ÍĞÍ•ÉÙ¥•-•äõ€‘íÍ¥ôè‘íÍÑ…ÉÑôè‘í•¹‘õ€ì(€€€€€¥˜¡É…İÌğôÄĞĞÀ¥…±°¹ÁÕÍ ¡í‘ÌéÉ…İÌ±…ÌéÉ…İÌ±Í¤±¬ÀéÍÑ…ÉĞ±¬Äé•¹±­•äéÍ•ÉÙ¥•-•åô¤ì(€€€€€¥˜¡‘ÌøôÄĞĞÁññ…ÌøÄĞĞÀ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ…¹õí‘Ì±…Ì±‘•Àé™lÌ©¬¬Åt”ÄĞĞÀ±…ÉÈé™lÌ©µ%‘át”ÄĞĞÀ±…±¥¡Ñ•Àé™lÌ©µ%‘à¬Åt”ÄĞĞÀ±¹MÑ½ÁÌéµ%‘àµ¬±Ù¥„±±Ì±ÍÙŒéÍ¤±¬ÀéÍÑ…ÉĞ±¬Äé•¹±­•äéÍ•ÉÙ¥•-•ä±‘•ÍĞé¹…µ•Ím¥‘áM•Åm•¹‘uuôì(€€€€€¥˜ …‰•ÍÑññ…¹¹‘Ìñ‰•ÍĞ¹‘Ì¥‰•ÍĞõ…¹ì(€€€ô(€ô(€¥˜¡‰•ÍĞ˜™…±°¹±•¹Ñ ¥í‰•ÍĞ¹¥Í¥ÉÍĞõ‰•ÍĞ¹­•äôôõ…±°¹É•‘Õ” ¡„±ˆ¤ôù„¹‘Ìğõˆ¹‘Ìı„éˆ¤¹­•äí‰•ÍĞ¹¥Í1…ÍĞõ‰•ÍĞ¹­•äôôõ…±°¹É•‘Õ” ¡„±ˆ¤ôù„¹‘Ìøõˆ¹‘Ìı„éˆ¤¹­•äíô(€É•ÑÕÉ¸‰•ÍĞì)ô)™Õ¹Ñ¥½¸}µ•ÑÉ½M•M•ÉÙ¥•	•™½É”¡±¥¹•9…µ”±‰½…É±…±¥¡Ğ±‰•™½É•MÉØ±Í½ÉÑ	äô…ÉÉ¥Ù…°œ¥ì(€½¹ÍĞ•¹Ğô¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œ¤˜™5QI=}M!m±¥¹•9…µ•tí¥˜ …•¹Ğ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ¹…µ•Ìõ•¹Ğ¹Ì±ÍÙÌõ•¹Ğ¹Ğ±ÉÈõ•¹Ğ¹Œ±ÍÉÙ5¥¸õ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀí±•Ğ‰•ÍĞõ¹Õ±°í½¹ÍĞ…±°õmtì(€™½È¡±•ĞÍ¤ôÀíÍ¤ñÍÙÌ¹±•¹Ñ íÍ¤¬¬¥í½¹ÍĞ˜õÍÙÍmÍ¥t±¸õ˜¹±•¹Ñ ¼Ì±±ÌõÉÈıÉÉmÍ¥tèÀ±¥‘áM•Äõmtí™½È¡±•Ğ¤ôÀí¤ñ¸í¤¬¬¥¥‘áM•Ä¹ÁÕÍ ¡™lÌ©¤¬Ét¤ì(€€€™½È¡½¹ÍĞmÍÑ…ÉĞ±•¹‘t½˜}µ•ÑÉ½1•I…¹•Ì¡¥‘áM•Ä¤¥í±•Ğ¬ô´Ä±µ%‘àô´Äí™½È¡±•Ğ¤õÍÑ…ÉĞí¤ñ•¹í¤¬¬¥¥˜¡¹…µ•Ím¥‘áM•Åm¥utôôõ‰½…É¥í¬õ¤í‰É•…¬íõ¥˜¡¬ğÀ¥½¹Ñ¥¹Õ”í™½È¡±•Ğ¤õ¬¬Äí¤ğõ•¹í¤¬¬¥¥˜¡¹…µ•Ím¥‘áM•Åm¥utôôõ…±¥¡Ğ¥íµ%‘àõ¤í‰É•…¬íõ¥˜¡µ%‘àğÀ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ‘ÌõÍÉÙ5¥¸¡™lÌ©¬¬Åt¤í±•Ğ…ÌõÍÉÙ5¥¸¡™lÌ©µ%‘át¤íİ¡¥±”¡…Ìñ‘Ì¥…Ì¬ôÄĞĞÀí½¹ÍĞÍ•ÉÙ¥•-•äõ€‘íÍ¥ôè‘íÍÑ…ÉÑôè‘í•¹‘õ€í¥˜¡…ÌğôÄĞĞÀ¥…±°¹ÁÕÍ ¡í‘Ì±…Ì±Í¤±¬ÀéÍÑ…ÉĞ±¬Äé•¹±­•äéÍ•ÉÙ¥•-•åô¤í½¹ÍĞ‰½Õ¹‘…ÉäõÍ½ÉÑ	äôôô‘•Á…ÉÑÕÉ”œı‘Ìé…Ìí¥˜¡‰½Õ¹‘…Éäù‰•™½É•MÉÙññ…ÌøÄĞĞÀ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞÙ¥„õmtí™½È¡±•Ğàõ¬¬Äíàñµ%‘àíà¬¬¥Ù¥„¹ÁÕÍ ¡¹…µ•Ím¥‘áM•Åmáut¤í½¹ÍĞ…¹õí‘Ì±…Ì±‘•Àé™lÌ©¬¬Åt”ÄĞĞÀ±…ÉÈé™lÌ©µ%‘át”ÄĞĞÀ±…±¥¡Ñ•Àé™lÌ©µ%‘à¬Åt”ÄĞĞÀ±¹MÑ½ÁÌéµ%‘àµ¬±Ù¥„±±Ì±ÍÙŒéÍ¤±¬ÀéÍÑ…ÉĞ±¬Äé•¹±­•äéÍ•ÉÙ¥•-•ä±‘•ÍĞé¹…µ•Ím¥‘áM•Åm•¹‘uuôí½¹ÍĞµ•ÑÉ¥ŒõÍ½ÉÑ	äôôô‘•Á…ÉÑÕÉ”œı…¹¹‘Ìé…¹¹…Ìí¥˜ …‰•ÍÑññµ•ÑÉ¥Œø¡Í½ÉÑ	äôôô‘•Á…ÉÑÕÉ”œı‰•ÍĞ¹‘Ìé‰•ÍĞ¹…Ì¤¥‰•ÍĞõ…¹ì(€€€ô(€õ¥˜¡‰•ÍĞ˜™…±°¹±•¹Ñ ¥í‰•ÍĞ¹¥Í¥ÉÍĞõ‰•ÍĞ¹­•äôôõ…±°¹É•‘Õ” ¡„±ˆ¤ôù„¹‘Ìğõˆ¹‘Ìı„éˆ¤¹­•äí‰•ÍĞ¹¥Í1…ÍĞõ‰•ÍĞ¹­•äôôõ…±°¹É•‘Õ” ¡„±ˆ¤ôù„¹‘Ìøõˆ¹‘Ìı„éˆ¤¹­•äíõÉ•ÑÕÉ¸‰•ÍĞì)ô(¼¼ƒ®'²Â ƒ²ÂûªâÃ®*Pƒ®ª£®N€ƒ¶fc²*äƒªÖ³ªÂ²v`ƒ®'²Â£®–ğƒ²^·²"s²ró®†pƒ®Úg²vÓ®*PƒªÊ²vĞƒ²V®.#®vğ°(¼¼ƒ²Ús®Âs²^·²^C²pƒªÂ²z”ƒ®*›ªÊ0ƒ²Ús®Âs¶Vc®¦Ó²pƒ®ª§²‚²ªæ3² ƒ².“²‚s®†pƒ²^ÃªÊÃ®Bc®*Pƒ²^³²‚W²vƒ²Âû®*S®.¸(¼¼ƒ²Ê¬ƒªÖ³ªÂƒ¶n®ÎÓ®–ğƒ®*›²v ƒ²"s²s®†pƒ®
»²ÚÀƒªÂ®¦À°ƒ¶n²4ƒªÖ³ªÂ²v ƒ®>²Â¤ƒ¶nƒ¶ ƒ²"`ƒ²z#®*PƒªÂ²z”ƒ®æƒ®–àƒ¶:ã²vƒ²
³²j§¶Vs®.¸)™Õ¹Ñ¥½¸}µÉ1…Ñ•ÍÑ•Á…ÉÑ)½ÕÉ¹•ä¡Í•µ•¹ÑÌ±É…Á ±á‰Õ˜¥ì(€¥˜ …Í•µ•¹ÑÌ¹±•¹Ñ ¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ™¥ÉÍÑM•µ•¹ĞõÍ•µ•¹ÑÍlÁt±™¥ÉÍÑ1¥¹”õÉ…Á ¹±¥¹•	å%‘m™¥ÉÍÑM•µ•¹Ğ¹±¥‘uññí¹…µ”èœüœ±½±½ÈèœŒáˆäĞå”ôì(€±•Ğ‰•™½É•MÉØôÄĞĞÀ±…ÑÑ•µÁÑÌôÀì(€İ¡¥±”¡‰•™½É•MÉØøôÀ˜™…ÑÑ•µÁÑÌ¬¬ğÈÀĞà¥ì(€€€½¹ÍĞ™¥ÉÍÑMÙŒõ}µ•ÑÉ½M•M•ÉÙ¥•	•™½É”¡™¥ÉÍÑ1¥¹”¹¹…µ”±™¥ÉÍÑM•µ•¹Ğ¹ÍÑ¹ÍlÁt±™¥ÉÍÑM•µ•¹Ğ¹ÍÑ¹Ì¹…Ğ ´Ä¤±‰•™½É•MÉØ°‘•Á…ÉÑÕÉ”œ¤ì(€€€¥˜ …™¥ÉÍÑMÙŒ¥É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍĞ±•Ìõmí°é™¥ÉÍÑ1¥¹”±Í•µ•¹Ğé™¥ÉÍÑM•µ•¹Ğ±‰½…Éé™¥ÉÍÑM•µ•¹Ğ¹ÍÑ¹ÍlÁt±…±¥¡Ğé™¥ÉÍÑM•µ•¹Ğ¹ÍÑ¹Ì¹…Ğ ´Ä¤°¸¸¹™¥ÉÍÑMÙõtì(€€€±•Ğ…™Ñ•ÉMÉØõ™¥ÉÍÑMÙŒ¹…Ì­á‰Õ˜±½µÁ±•Ñ”õÑÉÕ”ì(€€€™½È¡±•Ğ¤ôÄí¤ñÍ•µ•¹ÑÌ¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞÍ•µ•¹ĞõÍ•µ•¹ÑÍm¥t±±¥¹”õÉ…Á ¹±¥¹•	å%‘mÍ•µ•¹Ğ¹±¥‘uññí¹…µ”èœüœ±½±½ÈèœŒáˆäĞå”ôì(€€€€€½¹ÍĞÍÙŒõ}µ•ÑÉ½M•M•ÉÙ¥”¡±¥¹”¹¹…µ”±Í•µ•¹Ğ¹ÍÑ¹ÍlÁt±Í•µ•¹Ğ¹ÍÑ¹Ì¹…Ğ ´Ä¤±…™Ñ•ÉMÉØ±Í•µ•¹Ğ¹Á¥¤ì(€€€€€¥˜ …ÍÙŒ¥í½µÁ±•Ñ”õ™…±Í”í‰É•…¬íô(€€€€€±•Ì¹ÁÕÍ ¡í°é±¥¹”±Í•µ•¹Ğ±‰½…ÉéÍ•µ•¹Ğ¹ÍÑ¹ÍlÁt±…±¥¡ĞéÍ•µ•¹Ğ¹ÍÑ¹Ì¹…Ğ ´Ä¤°¸¸¹ÍÙô¤í…™Ñ•ÉMÉØõÍÙŒ¹…Ì­á‰Õ˜ì(€€€ô(€€€¥˜¡½µÁ±•Ñ”¥É•ÑÕÉ¸±•Ìì(€€€‰•™½É•MÉØõ™¥ÉÍÑMÙŒ¹‘Ì´Äì(€ô(€É•ÑÕÉ¸¹Õ±°ì)ô)™Õ¹Ñ¥½¸}µÉM¡½İI•Í½±Ù•‘Q¥µ”¡±½­5¥¹ÕÑ”¥ì(€½¹ÍĞ±½¬ô ¡5…Ñ ¹É½Õ¹¡±½­5¥¹ÕÑ”¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ±Ù…±Õ”õ€‘í5…Ñ ¹™±½½È¡±½¬¼ØÀ¥ôè‘íMÑÉ¥¹œ¡±½¬”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€ì(€½¹ÍĞ±…‰•°õ‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹µÈµÑ¥µ”µÑÉ¥•Èˆœ¤±¥¹ÁÕĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÑ¥µ”œ¤ì(€¥˜¡±…‰•°¥±…‰•°¹Ñ•áÑ½¹Ñ•¹Ğõ}µÉ±½­1…‰•°¡Ù…±Õ”¤í¥˜¡¥¹ÁÕĞ¥¥¹ÁÕĞ¹Ù…±Õ”õÙ…±Õ”ì)ô)™Õ¹Ñ¥½¸}µÉ5•ÑÉ½¥ÍÑ…¹”¡Í•µ•¹ÑÌ¥ì(€±•Ğ­´ôÀ±±…ÍĞõ¹Õ±°ì(€€¡Í•µ•¹ÑÍññmt¤¹™½É… ¡Í•µ•¹Ğôø¡Í•µ•¹Ğ¹ÍÑ¹Íññmt¤¹™½É… ¡¹…µ”ôùí½¹ÍĞÁ½¥¹Ğõ}ÍÑ¹½½É¡¹…µ”¤í¥˜¡±…ÍĞ˜™Á½¥¹Ğ¥­´¬õ¡…ÙAĞ¡±…ÍĞ±Á½¥¹Ğ¤í¥˜¡Á½¥¹Ğ¥±…ÍĞõÁ½¥¹Ğíô¤¤ì(€É•ÑÕÉ¸­´ì)ô(¼¼ƒ²"c®>ªÚ0ƒ²‚²Ê€ƒªÖC¶×²æÓ®Npƒ²Ç²vàƒ²jÓ²zèƒªâÃ®Îà€ÄÁ­´€Ä°ÔÔÃ²n@°€ÄÁøÔÁ­´€Õ­·®#®.€ÄÀÃ²n@°(¼¼€ÔÁ­´ƒ²Ò#ªÎğ€á­·®#®.€ÄÀÃ²n@¸ƒ¶R®†s²‚w¶*ã²v`ƒªÂ²ƒ®ã²ƒ²v ƒ²^·ªÂƒ²²ƒªÆÃ®š°ƒ¶V§ªÎ®–ğƒ²‚²j§¶Vs®.¸)™Õ¹Ñ¥½¸}µÉ5•ÑÉ½…É”¡‘¥ÍÑ…¹•-´¥ì(€½¹ÍĞ­´õ5…Ñ ¹µ…à À±9Õµ‰•È¡‘¥ÍÑ…¹•-´¥ñğÀ¤í±•Ğ™…É”ôÄÔÔÀì(€¥˜¡­´øÄÀ¥™…É”¬õ5…Ñ ¹•¥° ¡5…Ñ ¹µ¥¸¡­´°ÔÀ¤´ÄÀ¤¼Ô¤¨ÄÀÀì(€¥˜¡­´øÔÀ¥™…É”¬õ5…Ñ ¹•¥° ¡­´´ÔÀ¤¼à¤¨ÄÀÀì(€É•ÑÕÉ¸™…É”ì)ô)±•Ğ}µÉ%¹Ñ•É…Ñ•‘‘•…¡”õ¹Õ±°ì)™Õ¹Ñ¥½¸}µÉI…¥±…Ñ•½Éä¡É…‘”¥ì(€É•ÑÕÉ¸l-Q`œ°-Q`·²
Ã²Êpœ°-Q`·²vÓ²v0œ°MIPt¹¥¹±Õ‘•Ì¡É…‘”¤ü­Ñàœè•¹•É…°œì)ô)™Õ¹Ñ¥½¸}µÉ%¹Ñ•É…Ñ•‘‘•Ì ¥ì(€¥˜¡}µÉ%¹Ñ•É…Ñ•‘‘•…¡”¥É•ÑÕÉ¸}µÉ%¹Ñ•É…Ñ•‘‘•…¡”ì(€½¹ÍĞ‰åÉ½´õíô±ÍÉÙ5¥¸õ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ±ÁÕÍ õ•‘”ôùì¡‰åÉ½µm•‘”¹™É½µtõ‰åÉ½µm•‘”¹™É½µuññmt¤¹ÁÕÍ ¡•‘”¤íôì(€½¹ÍĞµ•ÑÉ½1¥¹•Ìõ¹•Ü5…À ¡ÑåÁ•½˜5QI=}1%9L„ôôÕ¹‘•™¥¹•œı5QI=}1%9Lémt¤¹µ…À¡±¥¹”ôùm±¥¹”¹¹…µ”±±¥¹•t¤¤ì(€=‰©•Ğ¹•¹ÑÉ¥•Ì¡ÑåÁ•½˜5QI=}M!„ôôÕ¹‘•™¥¹•œı5QI=}M!éíô¤¹™½É…  ¡m±¥¹•9…µ”±•¹ÑÉåt¤ôùì(€€€½¹ÍĞ±¥¹”õµ•ÑÉ½1¥¹•Ì¹•Ğ¡±¥¹•9…µ”¥ññí¹…µ”é±¥¹•9…µ”±½±½ÈèœŒÈÔØÍ•ˆôì(€€€€¡•¹ÑÉä¹Ñññmt¤¹™½É…  ¡Í•ÉÙ¥”±ÍÙŒ¤ôùí½¹ÍĞ½Õ¹Ğõ5…Ñ ¹™±½½È¡Í•ÉÙ¥”¹±•¹Ñ ¼Ì¤±¥¹‘•á•Ìõmtí™½È¡±•Ğ¤ôÀí¤ñ½Õ¹Ğí¤¬¬¥¥¹‘•á•Ì¹ÁÕÍ ¡Í•ÉÙ¥•m¤¨Ì¬Ét¤ì(€€€€€}µ•ÑÉ½1•I…¹•Ì¡¥¹‘•á•Ì¤¹™½É…  ¡mÍÑ…ÉĞ±•¹‘t¤ôùí™½È¡±•Ğ¤õÍÑ…ÉĞí¤ñ•¹í¤¬¬¥í½¹ÍĞ¨õ¤¬Äì(€€€€€€€½¹ÍĞ™É½´õ•¹ÑÉä¹Ím¥¹‘•á•Ím¥ut±Ñ¼õ•¹ÑÉä¹Ím¥¹‘•á•Ím©utí¥˜ …™É½µñğ…Ñ½ññ™É½´ôôõÑ¼¥½¹Ñ¥¹Õ”ì(€€€€€€€½¹ÍĞ‘ÌõÍÉÙ5¥¸¡Í•ÉÙ¥•m¤¨Ì¬Åt¤í±•Ğ…ÌõÍÉÙ5¥¸¡Í•ÉÙ¥•m¨¨Ít¤íİ¡¥±”¡…Ìñ‘Ì¥…Ì¬ôÄĞĞÀí¥˜¡…ÌøÄĞĞÀ¥½¹Ñ¥¹Õ”ì(€€€€€€€ÁÕÍ ¡íÑåÁ”èµ•ÑÉ¼œ±…Ñ•½Éäè½yQ` üèµğ¤½¤¹Ñ•ÍĞ¡±¥¹•9…µ”¤üÑàœèµ•ÑÉ¼œ±™É½´±Ñ¼±‘Ì±…Ì±±¥¹”é±¥¹•9…µ”±½±½Èé±¥¹”¹½±½ÉñğœŒÈÔØÍ•ˆœ±ÍÙŒ±¬ÀéÍÑ…ÉĞ±¬Äé•¹±‘•ÍĞé•¹ÑÉä¹Ím¥¹‘•á•Ím•¹‘ut±Ù¥„é¥¹‘•á•Ì¹Í±¥”¡¤¬Ä±¨¤¹µ…À¡¥¹‘•àôù•¹ÑÉä¹Ím¥¹‘•át¤±­•äé´è‘í±¥¹•9…µ•ôè‘íÍÙôè‘íÍÑ…ÉÑôè‘í•¹‘õô¤ì(€€€€€õô¤ì(€€€ô¤ì(€ô¤ì(€€¡ÑåÁ•½˜11}QI%9L„ôôÕ¹‘•™¥¹•œı11}QI%9Lémt¤¹™½É… ¡ÑÉ…¥¸ôùí½¹ÍĞ…±±Ìô¡ÑÉ…¥¸¹ÍÑ½ÁÍññmt¤¹µ…À ¡ÍÑ½À±¥¹‘•à¤ôø¡íÍÑ½À±¥¹‘•áô¤¤¹™¥±Ñ•È ¡íÍÑ½Áô¤ôù¡…ÍQ¥µ”¡ÍÑ½À¹…ÉÈ¥ññ¡…ÍQ¥µ”¡ÍÑ½À¹‘•À¤¤ì(€€€™½È¡±•Ğ¤ôÀí¤ñ…±±Ì¹±•¹Ñ ´Äí¤¬¬¥í½¹ÍĞ™É½µMÑ½Àõ…±±Ím¥t¹ÍÑ½À±¨õ¤¬Ä±Ñ½MÑ½Àõ…±±Ím©t¹ÍÑ½Àí¥˜ …¡…ÍQ¥µ”¡™É½µMÑ½À¹‘•À¥ñğ…¡…ÍQ¥µ”¡Ñ½MÑ½À¹…ÉÈ¤¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ‘ÌõÍÉÙ5¥¸¡Ñ½5¥¸¡™É½µMÑ½À¹‘•À¤¤í±•Ğ…ÌõÍÉÙ5¥¸¡Ñ½5¥¸¡Ñ½MÑ½À¹…ÉÈ¤¤íİ¡¥±”¡…Ìñ‘Ì¥…Ì¬ôÄĞĞÀí¥˜¡…ÌøÄĞĞÀ¥½¹Ñ¥¹Õ”ì(€€€€€ÁÕÍ ¡íÑåÁ”èÉ…¥°œ±…Ñ•½Éäé}µÉI…¥±…Ñ•½Éä¡ÑÉ…¥¸¹É…‘”¤±™É½´é™É½µMÑ½À¹Ì±Ñ¼éÑ½MÑ½À¹Ì±‘Ì±…Ì±±¥¹”éÑÉ…¥¸¹±¥¹”±É…‘”éÑÉ…¥¸¹É…‘”±½±½Èè¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmÑÉ…¥¸¹É…‘•t¥ñğœŒĞÜÔÔØäœ±ÑÉ…¥¸±ÍÙŒéÑÉ…¥¸¹¹¼±‘•ÍĞéÑÉ…¥¸¹‘•ÍĞ±Ù¥„émt±­•äéÈè‘íÑÉ…¥¸¹É…‘•ôè‘íÑÉ…¥¸¹¹½õô¤ì(€€€ô(€ô¤ì(€=‰©•Ğ¹Ù…±Õ•Ì¡‰åÉ½´¤¹™½É… ¡•‘•Ìôù•‘•Ì¹Í½ÉĞ ¡„±ˆ¤ôù„¹‘Ìµˆ¹‘Íññ„¹…Ìµˆ¹…Ì¤¤ì(€É•ÑÕÉ¸}µÉ%¹Ñ•É…Ñ•‘‘•…¡”õ‰åÉ½´ì)ô)™Õ¹Ñ¥½¸}µÉ‘•±±½İ•¡•‘”¥ì(€¥˜¡•‘”¹…Ñ•½ÉäôôôÑàœ¥É•ÑÕÉ¸}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹Ñàì(€¥˜¡•‘”¹…Ñ•½Éäôôô­Ñàœ¥É•ÑÕÉ¸}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹­Ñàì(€¥˜¡•‘”¹…Ñ•½Éäôôô•¹•É…°œ¥É•ÑÕÉ¸}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹•¹•É…°ì(€É•ÑÕÉ¸ÑÉÕ”ì)ô)™Õ¹Ñ¥½¸}µÉ%¹Ñ•É…Ñ•‘…É±¥•ÍĞ¡™É½´±Ñ¼±…™Ñ•ÉMÉØ±™¥ÉÍÑ‘”¥ì(€½¹ÍĞ•‘•Ìõ}µÉ%¹Ñ•É…Ñ•‘‘•Ì ¤±‰•ÍĞõím™É½µté…™Ñ•ÉMÉÙô±ÁÉ•Øõíô±ÅÕ•Õ”õmtí±•Ğ™¥¹¥Í õ¹Õ±°ì(€½¹ÍĞÁÕÍ õ¥Ñ•´ôùíÅÕ•Õ”¹ÁÕÍ ¡¥Ñ•´¤í±•Ğ¤õÅÕ•Õ”¹±•¹Ñ ´Äíİ¡¥±”¡¤øÀ¥í½¹ÍĞÀô¡¤´Ä¤øøÄí¥˜¡ÅÕ•Õ•mÁt¹Ñ¥µ”ğõ¥Ñ•´¹Ñ¥µ”¥‰É•…¬íÅÕ•Õ•m¥tõÅÕ•Õ•mÁtí¤õÀíõÅÕ•Õ•m¥tõ¥Ñ•´íôì(€½¹ÍĞÁ½Àô ¤ôùí½¹ÍĞÉ½½ĞõÅÕ•Õ•lÁt±±…ÍĞõÅÕ•Õ”¹Á½À ¤í¥˜¡ÅÕ•Õ”¹±•¹Ñ ˜™±…ÍĞ¥í±•Ğ¤ôÀíİ¡¥±”¡ÑÉÕ”¥í±•Ğ¡¥±õ¤¨È¬Äí¥˜¡¡¥±øõÅÕ•Õ”¹±•¹Ñ ¥‰É•…¬í¥˜¡¡¥±¬ÄñÅÕ•Õ”¹±•¹Ñ ˜™ÅÕ•Õ•m¡¥±¬Åt¹Ñ¥µ”ñÅÕ•Õ•m¡¥±‘t¹Ñ¥µ”¥¡¥±¬¬í¥˜¡ÅÕ•Õ•m¡¥±‘t¹Ñ¥µ”øõ±…ÍĞ¹Ñ¥µ”¥‰É•…¬íÅÕ•Õ•m¥tõÅÕ•Õ•m¡¥±‘tí¤õ¡¥±íõÅÕ•Õ•m¥tõ±…ÍĞíõÉ•ÑÕÉ¸É½½Ğíôì(€ÁÕÍ ¡íÍÑ…Ñ¥½¸é™É½´±Ñ¥µ”é…™Ñ•ÉMÉÙô¤ì(€İ¡¥±”¡ÅÕ•Õ”¹±•¹Ñ ¥í½¹ÍĞÕÈõÁ½À ¤í¥˜¡ÕÈ¹Ñ¥µ”„ôõ‰•ÍÑmÕÈ¹ÍÑ…Ñ¥½¹t¥½¹Ñ¥¹Õ”í¥˜¡ÕÈ¹ÍÑ…Ñ¥½¸ôôõÑ¼¥í™¥¹¥Í õÕÈ¹ÍÑ…Ñ¥½¸í‰É•…¬íô(€€€½¹ÍĞ½ÁÑ¥½¹Ìõ™¥ÉÍÑ‘”˜™ÕÈ¹ÍÑ…Ñ¥½¸ôôõ™É½´ım™¥ÉÍÑ‘•tè¡•‘•ÍmÕÈ¹ÍÑ…Ñ¥½¹uññmt¤ì(€€€™½È¡½¹ÍĞ•‘”½˜½ÁÑ¥½¹Ì¥í¥˜ …}µÉ‘•±±½İ•¡•‘”¥ññ•‘”¹‘ÌñÕÈ¹Ñ¥µ”¥½¹Ñ¥¹Õ”í¥˜¡•‘”¹…ÌøÄĞĞÀ¥½¹Ñ¥¹Õ”í¥˜¡•‘”¹…Ìğ¡‰•ÍÑm•‘”¹Ñ½tüı%¹™¥¹¥Ñä¤¥í‰•ÍÑm•‘”¹Ñ½tõ•‘”¹…ÌíÁÉ•Ùm•‘”¹Ñ½tõí™É½´éÕÈ¹ÍÑ…Ñ¥½¸±•‘•ôíÁÕÍ ¡íÍÑ…Ñ¥½¸é•‘”¹Ñ¼±Ñ¥µ”é•‘”¹…Íô¤íõô(€ô(€¥˜ …™¥¹¥Í ¥É•ÑÕÉ¸¹Õ±°í½¹ÍĞ±•Ìõmtí±•ĞÍÑ…Ñ¥½¸õ™¥¹¥Í íİ¡¥±”¡ÍÑ…Ñ¥½¸„ôõ™É½´¥í½¹ÍĞÍÑ•ÀõÁÉ•ÙmÍÑ…Ñ¥½¹tí¥˜ …ÍÑ•À¥É•ÑÕÉ¸¹Õ±°í±•Ì¹Õ¹Í¡¥™Ğ¡ÍÑ•À¹•‘”¤íÍÑ…Ñ¥½¸õÍÑ•À¹™É½´íõÉ•ÑÕÉ¸±•Ìì)ô)™Õ¹Ñ¥½¸}µÉ%¹Ñ•É…Ñ•‘A…ÉĞ¡™É½´±Ñ¼±…™Ñ•ÉMÉØ±•‘•5½‘”±‰•™½É•MÉØ¥ì(€½¹ÍĞ½ÕÑ½¥¹œô¡}µÉ%¹Ñ•É…Ñ•‘‘•Ì ¥m™É½µuññmt¤¹™¥±Ñ•È¡}µÉ‘•±±½İ•¤ì(€¥˜¡•‘•5½‘”ôôô±…ÍĞññ‰•™½É•MÉØ„õ¹Õ±°¥ì(€€€½¹ÍĞ±¥µ¥Ğõ‰•™½É•MÉØôõ¹Õ±°üÄĞĞÀé‰•™½É•MÉØì(€€€™½È¡½¹ÍĞ•‘”½˜l¸¸¹½ÕÑ½¥¹t¹™¥±Ñ•È¡•‘”ôù•‘”¹‘Ìğõ±¥µ¥Ğ¤¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹‘Ìµ„¹‘Ì¤¥í½¹ÍĞ±•Ìõ}µÉ%¹Ñ•É…Ñ•‘…É±¥•ÍĞ¡™É½´±Ñ¼±•‘”¹‘Ì±•‘”¤í¥˜¡±•Ì˜™±•Ì¹…Ğ ´Ä¤¹…Ìğô¡‰•™½É•MÉØüüÄĞĞÀ¤¥É•ÑÕÉ¸±•Ìíô(€€€É•ÑÕÉ¸¹Õ±°ì(€ô(€É•ÑÕÉ¸}µÉ%¹Ñ•É…Ñ•‘…É±¥•ÍĞ¡™É½´±Ñ¼±•‘•5½‘”ôôô™¥ÉÍĞœüÀé…™Ñ•ÉMÉØ¤ì)ô)™Õ¹Ñ¥½¸}µÉ%¹Ñ•É…Ñ•‘)½ÕÉ¹•ä¡Á½¥¹ÑÌ±Í•±•Ñ•‘MÉØ¥ì(€½¹ÍĞ½¹¹•ÑI•ÍĞô¡™¥ÉÍÑA…ÉĞ±ÍÑ…ÉÑ%¹‘•à¤ôùí½¹ÍĞ…±°õl¸¸¹™¥ÉÍÑA…ÉÑtí±•ĞÕÉÍ½Èõ™¥ÉÍÑA…ÉĞ¹…Ğ ´Ä¤¹…Ì¬Èí™½È¡±•Ğ¤õÍÑ…ÉÑ%¹‘•àí¤ñÁ½¥¹ÑÌ¹±•¹Ñ ´Äí¤¬¬¥í½¹ÍĞÁ…ÉĞõ}µÉ%¹Ñ•É…Ñ•‘A…ÉĞ¡Á½¥¹ÑÍm¥t±Á½¥¹ÑÍm¤¬Åt±ÕÉÍ½È°¹½Éµ…°œ±¤ôôõÁ½¥¹ÑÌ¹±•¹Ñ ´È˜™}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œ˜™}µÉ‘•5½‘”ôôô¹½Éµ…°œıÍ•±•Ñ•‘MÉØé¹Õ±°¤í¥˜ …Á…ÉĞ¥É•ÑÕÉ¸¹Õ±°í…±°¹ÁÕÍ  ¸¸¹Á…ÉĞ¤íÕÉÍ½ÈõÁ…ÉĞ¹…Ğ ´Ä¤¹…Ì¬ÈíõÉ•ÑÕÉ¸…±°íôì(€¥˜¡}µÉ‘•5½‘”ôôô±…ÍĞœ¥ì(€€€½¹ÍĞ½ÕÑ½¥¹œô¡}µÉ%¹Ñ•É…Ñ•‘‘•Ì ¥mÁ½¥¹ÑÍlÁuuññmt¤¹™¥±Ñ•È¡}µÉ‘•±±½İ•¤¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹‘Ìµ„¹‘Ì¤ì(€€€™½È¡½¹ÍĞ•‘”½˜½ÕÑ½¥¹œ¥í½¹ÍĞ™¥ÉÍĞõ}µÉ%¹Ñ•É…Ñ•‘…É±¥•ÍĞ¡Á½¥¹ÑÍlÁt±Á½¥¹ÑÍlÅt±•‘”¹‘Ì±•‘”¤í¥˜¡™¥ÉÍĞ¥í½¹ÍĞ©½ÕÉ¹•äõ½¹¹•ÑI•ÍĞ¡™¥ÉÍĞ°Ä¤í¥˜¡©½ÕÉ¹•ä¥É•ÑÕÉ¸©½ÕÉ¹•äíõô(€€€É•ÑÕÉ¸¹Õ±°ì(€ô(€½¹ÍĞ™¥ÉÍĞõ}µÉ%¹Ñ•É…Ñ•‘A…ÉĞ¡Á½¥¹ÑÍlÁt±Á½¥¹ÑÍlÅt±}µÉ‘•5½‘”ôôô™¥ÉÍĞœüÀéÍ•±•Ñ•‘MÉØ±}µÉ‘•5½‘”ôôô™¥ÉÍĞœü™¥ÉÍĞœè¹½Éµ…°œ±Á½¥¹ÑÌ¹±•¹Ñ ôôôÈ˜™}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œ˜™}µÉ‘•5½‘”ôôô¹½Éµ…°œıÍ•±•Ñ•‘MÉØé¹Õ±°¤ì(€É•ÑÕÉ¸™¥ÉÍĞı½¹¹•ÑI•ÍĞ¡™¥ÉÍĞ°Ä¤é¹Õ±°ì)ô)™Õ¹Ñ¥½¸}µÉ%¹Ñ•É…Ñ•‘…É”¡±•Ì¥ì(€±•Ğµ•ÑÉ½-´ôÀ±É…¥±…É”ôÀ±¡…Í5•ÑÉ¼õ™…±Í”ì(€±•Ì¹™½É… ¡±•œôùí¥˜¡±•œ¹ÑåÁ”ôôôµ•ÑÉ¼œ¥í¡…Í5•ÑÉ¼õÑÉÕ”í½¹ÍĞÍ•Äõm±•œ¹™É½´°¸¸¹±•œ¹Ù¥„±±•œ¹Ñ½tí™½È¡±•Ğ¤ôÄí¤ñÍ•Ä¹±•¹Ñ í¤¬¬¥µ•ÑÉ½-´¬õ¡…ÙAĞ¡}ÍÑ¹½½É¡Í•Åm¤´Åt¤±}ÍÑ¹½½É¡Í•Åm¥t¤¤íõ•±Í”¥˜¡±•œ¹ÑÉ…¥¸¥É…¥±…É”¬õ…±…É”¡±•œ¹ÑÉ…¥¸±±•œ¹™É½´±±•œ¹Ñ¼°•¹•É…°œ¤íô¤ì(€É•ÑÕÉ¸í‘¥ÍÑ…¹”éµ•ÑÉ½-´±™…É”éÉ…¥±…É”¬¡¡…Í5•ÑÉ¼ı}µÉ5•ÑÉ½…É”¡µ•ÑÉ½-´¤èÀ¥ôì)ô)™Õ¹Ñ¥½¸Í•…É¡%¹Ñ•É…Ñ•‘I½ÕÑ”¡™É½´±Ù¥„±Ñ¼¥ì(€½¹ÍĞ½ÕĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÉ•ÍÕ±Ğœ¤±ÍÉÙ5¥¸õ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀ±™µĞõ´ôùí´ô ¡5…Ñ ¹É½Õ¹¡´¤¬ÈĞÀ¤”ÄĞĞÀ¬ÄĞĞÀ¤”ÄĞĞÀíÉ•ÑÕÉ¸€‘í5…Ñ ¹™±½½È¡´¼ØÀ¥ôè‘íMÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€íôì(€½¹ÍĞ±½¬ô¡}µÉQ¥µ•áÁ±¥¥Ğı}µÉQ¥µ”é}µÉ•™…Õ±ÑQ¥µ” ¤¤¹ÍÁ±¥Ğ œèœ¤¹µ…À¡9Õµ‰•È¤±Í•±•Ñ•õÍÉÙ5¥¸¡±½­lÁt¨ØÀ­±½­lÅt¤ì(€½¹ÍĞ±•Ìõ}µÉ%¹Ñ•É…Ñ•‘)½ÕÉ¹•ä¡m™É½´±Ù¥„±Ñ½t¹™¥±Ñ•È¡	½½±•…¸¤±Í•±•Ñ•¤í¥˜ …±•Ìü¹±•¹Ñ ¥í½ÕĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹Ğˆû²ƒ¶w¶VpƒªÖC¶×²"c®.£ªÎğƒ².sªÂ²ró®†pƒ²^ÃªÊÃ®Bc®*Pƒ¶×¶V¤ƒªÊ÷®†s®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞµ•É•õmtí±•Ì¹™½É… ¡•‘”ôùí½¹ÍĞ±…ÍĞõµ•É•¹…Ğ ´Ä¤í¥˜¡±…ÍĞ˜™±…ÍĞ¹­•äôôõ•‘”¹­•ä˜™±…ÍĞ¹Ñ¼ôôõ•‘”¹™É½´¥í±…ÍĞ¹Ñ¼õ•‘”¹Ñ¼í±…ÍĞ¹…Ìõ•‘”¹…Ìí±…ÍĞ¹Ù¥„¹ÁÕÍ ¡•‘”¹™É½´°¸¸¹•‘”¹Ù¥„¤íõ•±Í”µ•É•¹ÁÕÍ ¡ì¸¸¹•‘”±Ù¥„él¸¸¹•‘”¹Ù¥…uô¤íô¤ì(€½¹ÍĞµ½¹•äõ}µÉ%¹Ñ•É…Ñ•‘…É”¡µ•É•¤±Ñ½Ñ…°õµ•É•¹…Ğ ´Ä¤¹…Ìµµ•É•‘lÁt¹‘Ìì(€½¹ÍĞÉ…¥°õµ•É•¹µ…À ¡±•œ±¥¹‘•à¤ôùí½¹ÍĞ±¥¹•ÉœõMÑÉ¥¹œ¡±•œ¹±¥¹”¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤í½¹ÍĞ™É½µÉœõMÑÉ¥¹œ¡±•œ¹™É½´¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤í½¹ÍĞ±¥¬õ±•œ¹ÑåÁ”ôôôµ•ÑÉ¼œı½¹±¥¬ô‰½Á•¹5•ÑÉ½I½ÕÑ•Q¥µ•Ñ…‰±” œ‘í™É½µÉôœ°œ‘í±¥¹•Éôœ°‘í±•œ¹ÍÙô°‘ì¡±•œ¹‘Ì¬ÈĞÀ¤”ÄĞĞÁô°‘í±•œ¹¬Áô°‘í±•œ¹¬Åô¤‰€èœœíÉ•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”ˆÍÑå±”ôˆ´µ±Œè‘í±•œ¹½±½Éôˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñˆø‘í™µĞ¡±•œ¹‘Ì¥ôğ½ˆøñÍµ…±°û²Ús®Âpğ½Íµ…±°øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµ‘½ĞÉĞµ‰½…Éˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œˆøğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆøñ‰ÕÑÑ½¸±…ÍÌô‰ÉĞµÍÑ¸ÉĞµÍÑ¸µ±¥¹¬ˆ€‘í±¥­ôø‘í}½ÁÍÍŒ¡±•œ¹™É½´¥ô‘í±¥¬üœñÍÁ…¸±…ÍÌô‰ÉĞµ¡•ØˆûŠèğ½ÍÁ…¸øœèœôğ½‰ÕÑÑ½¸øñ‘¥Ø±…ÍÌô‰ÉĞµÍÕˆˆøñÍÁ…¸±…ÍÌô‰ÉĞµ±¡¥ÀˆÍÑå±”ô‰‰…­É½Õ¹è‘í±•œ¹½±½Éôˆø‘í}½ÁÍÍŒ¡±•œ¹ÑåÁ”ôôôÉ…¥°œı±•œ¹É…‘”é±•œ¹±¥¹”¥ôğ½ÍÁ…¸ø€‘í}½ÁÍÍŒ¡±•œ¹‘•ÍĞ¥÷¶Z$ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¹Ğˆø‘í±•œ¹Ù¥„¹±•¹Ñ ¬Å÷ªÂpƒ²^´ƒ
Ü€‘í±•œ¹…Ìµ±•œ¹‘Í÷®Úğ½‘¥Øøğ½‘¥Øøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”‘í¥¹‘•àôôõµ•É•¹±•¹Ñ ´ÄüœÉĞµ™¥¹…°µ…ÉÉ¥Ù”œèœôˆÍÑå±”ôˆ´µ±Œè‘í±•œ¹½±½Éôˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñˆø‘í™µĞ¡±•œ¹…Ì¥ôğ½ˆøñÍµ…±°û®>²Â¤ğ½Íµ…±°øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµ‘½ĞÉĞµ…±¥¡Ğˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œˆøğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆøñÍÁ…¸±…ÍÌô‰ÉĞµÍÑ¸ÉĞµÍÑ¸µ±¥¹¬ˆø‘í}½ÁÍÍŒ¡±•œ¹Ñ¼¥ôğ½ÍÁ…¸øğ½‘¥Øøğ½‘¥Øø‘í¥¹‘•àñµ•É•¹±•¹Ñ ´Äı€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”ÉĞµİ…±¬ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñÍµ…±°û¶fc²*äğ½Íµ…±°øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œÉĞµ‘…Í ˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµİ…±¬µ¥ŒˆûŠPğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÍÕˆÉĞµá™•Èˆø‘í}½ÁÍÍŒ¡±•œ¹Ñ¼¥÷²^´ƒ¶fc²*äƒ
Üƒ®2ªâÀ€‘íµ•É•‘m¥¹‘•à¬Åt¹‘Ìµ±•œ¹…Í÷®Úğ½‘¥Øøğ½‘¥Øøğ½‘¥Øù€èœõ€íô¤¹©½¥¸ œœ¤ì(€¥˜¡}µÉ‘•5½‘”„ôô¹½Éµ…°œ¥}µÉM¡½İI•Í½±Ù•‘Q¥µ”¡µ•É•‘lÁt¹‘Ì¬ÈĞÀ¤ì(€½ÕĞ¹¥¹¹•É!Q50õ€ñÍ•Ñ¥½¸±…ÍÌô‰µÈµÉ½ÕÑ”µÉ•ÍÕ±Ğˆøñ¡•…‘•È±…ÍÌô‰µÈµÉ•ÍÕ±Ğµ¡•…‘•Èˆøñ‘¥ØøñÍÑÉ½¹œø‘ím™É½´±Ù¥„±Ñ½t¹™¥±Ñ•È¡	½½±•…¸¤¹µ…À¡}½ÁÍÍŒ¤¹©½¥¸ œƒŠH€œ¥ôğ½ÍÑÉ½¹œøñÍÁ…¸±…ÍÌô‰‰…‘”‰±Õ”ˆû¶×¶V¤ƒªâã²ÂûªâÀğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Øøñˆû²Òt€‘í™µÑÕÉ-½È¡Ñ½Ñ…°¥ôğ½ˆøñÍµ…±°ø‘íµ•É•¹±•¹Ñ ´Äıƒ¶fc²*ä€‘íµ•É•¹±•¹Ñ ´Å÷¶j1€èŸ²¶Ôôƒ
Üƒ²b#²€‘íµ½¹•ä¹™…É”¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@‘íµ½¹•ä¹‘¥ÍÑ…¹”ı€ƒ
Üƒ²‚²Ê€€‘íµ½¹•ä¹‘¥ÍÑ…¹”¹Ñ½¥á• Ä¥õ­µ€èœôğ½Íµ…±°øğ½‘¥Øøğ½¡•…‘•Èøñ‘¥Ø±…ÍÌô‰ÉĞµ±¥ÍĞˆøñ‘¥Ø±…ÍÌô‰ÉĞµ…Éˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ°ˆø‘íÉ…¥±ôğ½‘¥Øøğ½‘¥Øøğ½‘¥ØøñÀ±…ÍÌô‰½ÁÌµ¡¥¹Ğˆû²‚²ÊƒªÎğƒªâÃ²Â£²v`ƒ².“²‚pƒ².sªÂ¶Fs®–ğƒ²^ÃªÊÃ¶VpƒªÊÃªÎó²z®.#®.¸ƒ²vó®Âc²^Ó²Â ƒ²jÓ²zªÎğƒªÆÃ®š³®æ®† ƒ²‚²Ê€ƒ²jÓ²z²vƒ¶V§²
Ã¶Z#²*×®.#®.¸ğ½Àøñ™½½Ñ•È±…ÍÌô‰µÈµÉ•ÍÕ±Ğµ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸½¹±¥¬ô‰}µÉM¡…É•I½ÕÑ” ¤ˆûªÎ×²rƒ¶VcªâÀğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰ÁÉ¥µ…Éäˆ½¹±¥¬ô‰}µÉ½ÕÍM•…É  ¤ˆû®.“®–àƒªÊ÷®†pƒ®ÎÓªâÀ€ñÍÁ…¸ûŠHğ½ÍÁ…¸øğ½‰ÕÑÑ½¸øğ½™½½Ñ•Èøğ½Í•Ñ¥½¸ù€ì)ô)™Õ¹Ñ¥½¸Í•…É¡5•ÑÉ½I½ÕÑ”¡•á±Õ‘•‘A¥‘Ì±É½ÕÑ•ÑÑ•µÁĞôÀ¥ì(€½¹ÍĞ½ÕĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µÈµÉ•ÍÕ±Ğœ¤ì¥˜ …½ÕĞ¥É•ÑÕÉ¸ì(€½¹ÍĞ™É½´ô¡}µÉÉ½µñğœœ¤¹ÑÉ¥´ ¤°Ù¥„ô¡}µÉY¥…ñğœœ¤¹ÑÉ¥´ ¤°Ñ¼ô¡}µÉQ½ñğœœ¤¹ÑÉ¥´ ¤ì(€¥˜ …™É½µñğ…Ñ¼¥í½ÕĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹Ğˆû²Ús®Âs²^·ªÎğƒ®>²Â§²^·²vƒ®ª£®F@ƒ²z®‚—¶Vc²ã²jP¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜¡}µÉQÉ…¹ÍÁ½ÉÑ5½‘”ôôô¥¹Ñ•É…Ñ•œ¥É•ÑÕÉ¸Í•…É¡%¹Ñ•É…Ñ•‘I½ÕÑ”¡™É½´±Ù¥„±Ñ¼¤ì(€¥˜ …}µÉQÉ…¹ÍÁ½ÉÑ¥±Ñ•ÉÌ¹Ñà¥í½¹ÍĞÉ…Á õ}µ•ÑÉ½É…Á  ¤±™¥±Ñ•É•õ¹•ÜM•Ğ¡•á±Õ‘•‘A¥‘Íññmt¤í=‰©•Ğ¹Ù…±Õ•Ì¡É…Á ¹Á…ÑÑ•É¹Ì¤¹™½É… ¡Á…ÑÑ•É¸ôùí¥˜ ½yQ` üèµğ¤½¤¹Ñ•ÍĞ¡É…Á ¹±¥¹•	å%‘mÁ…ÑÑ•É¸¹±¥‘tü¹¹…µ•ñğœœ¤¥™¥±Ñ•É•¹…‘¡Á…ÑÑ•É¸¹¥¤íô¤í•á±Õ‘•‘A¥‘Ìõ™¥±Ñ•É•íô(€½¹ÍĞÈõ}µÉA±…¹¹•‘I½ÕÑ”¡™É½´±Ù¥„±Ñ¼±}µÉ5½‘”±•á±Õ‘•‘A¥‘Ì¤ì(€¥˜¡È¹•ÉÈôôôÍ…µ”œ¥í½ÕĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹Ğˆû²Ús®Âs²^·ªÎğƒ®>²Â§²^·²vĞƒªÂg²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€¥˜¡È¹•ÉÈôôô¹½MÑ¸œ¥í½¹ÍĞ‰…õ}µ•ÑÉ½É…Á  ¤¹ÍÑ¹1¥¹•Ím™É½µtıÑ¼é™É½´í½ÕĞ¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹Ğˆû²‚²Ê€ƒ®ã²ƒ²^@€ñˆø‘í}½ÁÍÍŒ¡‰…¥ôğ½ˆøƒ²^·²vĞƒ²^²*×®.#®.¸ƒ²^·®ª²vƒ¶fW²vã¶Vc²ã²jP¸ğ½‘¥Øù€íÉ•ÑÕÉ¸íô(€¥˜¡È¹•ÉÉñğ…È¹Í•µ•¹ÑÍñğ…È¹Í•µ•¹ÑÌ¹±•¹Ñ ¥í½ÕĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹ĞˆûªÊ÷®†s®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞõ}µ•ÑÉ½É…Á  ¤ì(€½¹ÍĞÍÉÙ5¥¸õ´ôø  ¡´´ÈĞÀ¤”ÄĞĞÀ¤¬ÄĞĞÀ¤”ÄĞĞÀì(€½¹ÍĞ™µĞõ´ôùí´ô ¡5…Ñ ¹É½Õ¹¡´¤¤”ÄĞĞÀ¬ÄĞĞÀ¤”ÄĞĞÀíÉ•ÑÕÉ¸€‘í5…Ñ ¹™±½½È¡´¼ØÀ¥ôè‘íMÑÉ¥¹œ¡´”ØÀ¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€íôì(€½¹ÍĞ‘ÕÉµĞõ´ôùí½¹ÍĞ õ5…Ñ ¹™±½½È¡´¼ØÀ¤íÉ•ÑÕÉ¸ ı€‘í¡÷².sªÂ€‘í´”ØÁ÷®Ú€é€‘íµ÷®Ú€íôì(€½¹ÍĞÍ•±•Ñ•‘±½¬ô¡}µÉQ¥µ•ññ}µÉ•™…Õ±ÑQ¥µ” ¤¤¹ÍÁ±¥Ğ œèœ¤¹µ…À¡9Õµ‰•È¤ì(€½¹ÍĞÍ•±•Ñ•‘MÉØõÍÉÙ5¥¸ ¡Í•±•Ñ•‘±½­lÁuñğÀ¤¨ØÀ¬¡Í•±•Ñ•‘±½­lÅuñğÀ¤¤ì(€½¹ÍĞa	UôÈì€¼¼ƒ¶fc²*äƒ®>®ÎĞƒ®Ê¶6ğ£®Ú¤(€€¼¼ƒŠRŠR ƒ².“²‚pƒ²jÓ¶Z$ƒ®6Ã²vÓ¶Ã®†pƒªÖ³ªÂ®Îƒ®.“²v0ƒ²^Ó²Â ƒ¶C²$ƒŠRŠR (€½¹ÍĞ±•Ìõmtí±•ĞÉ•…±=¬õÈ¹Í•µ•¹ÑÌ¹±•¹Ñ øÀ±•¹‘•‘Ğõ¹Õ±°±™…¥±•‘A¥õ¹Õ±°ì(€¥˜¡}µÉ‘•5½‘”ôôô±…ÍĞœ¥ì(€€€½¹ÍĞ±…Ñ•ÍÑ1•Ìõ}µÉ1…Ñ•ÍÑ•Á…ÉÑ)½ÕÉ¹•ä¡È¹Í•µ•¹ÑÌ±±a	U¤ì(€€€¥˜¡±…Ñ•ÍÑ1•Ì¥±•Ì¹ÁÕÍ  ¸¸¹±…Ñ•ÍÑ1•Ì¤í•±Í”íÉ•…±=¬õ™…±Í”í™…¥±•‘A¥õÈ¹Í•µ•¹ÑÍlÁtü¹Á¥íô(€õ•±Í”¥˜¡}µÉ‘•5½‘”ôôô¹½Éµ…°œ˜™}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œ¥ì(€€€±•Ğ‰•™½É•MÉØõÍ•±•Ñ•‘MÉØì(€€€™½È¡±•Ğ¤õÈ¹Í•µ•¹ÑÌ¹±•¹Ñ ´Äí¤øôÀí¤´´¥í½¹ÍĞÌõÈ¹Í•µ•¹ÑÍm¥t±°õ¹±¥¹•	å%‘mÌ¹±¥‘uññí¹…µ”èœüœ±½±½ÈèœŒáˆäĞå”ô±ÍÙŒõ}µ•ÑÉ½M•M•ÉÙ¥•	•™½É”¡°¹¹…µ”±Ì¹ÍÑ¹ÍlÁt±Ì¹ÍÑ¹Ì¹…Ğ ´Ä¤±‰•™½É•MÉØ¤í¥˜ …ÍÙŒ¥íÉ•…±=¬õ™…±Í”í™…¥±•‘A¥õÌ¹Á¥í‰É•…¬íõ±•Ì¹Õ¹Í¡¥™Ğ¡í°±Í•µ•¹ĞéÌ±‰½…ÉéÌ¹ÍÑ¹ÍlÁt±…±¥¡ĞéÌ¹ÍÑ¹Ì¹…Ğ ´Ä¤°¸¸¹ÍÙô¤í‰•™½É•MÉØõÍÙŒ¹‘Ìµa	Uíô(€õ•±Í•ì(€€€±•Ğ…™Ñ•ÉMÉØõ}µÉ‘•5½‘”ôôô™¥ÉÍĞœüÀéÍ•±•Ñ•‘MÉØì(€€€™½È¡½¹ÍĞÌ½˜È¹Í•µ•¹ÑÌ¥í½¹ÍĞ°õ¹±¥¹•	å%‘mÌ¹±¥‘uññí¹…µ”èœüœ±½±½ÈèœŒáˆäĞå”ô±ÍÙŒõ}µ•ÑÉ½M•M•ÉÙ¥”¡°¹¹…µ”±Ì¹ÍÑ¹ÍlÁt±Ì¹ÍÑ¹Ì¹…Ğ ´Ä¤±…™Ñ•ÉMÉØ±Ì¹Á¥¤í¥˜ …ÍÙŒ¥íÉ•…±=¬õ™…±Í”í™…¥±•‘A¥õÌ¹Á¥í•¹‘•‘Ğõ±•Ì¹…Ğ ´Ä¤ü¹…±¥¡Ñññ™É½´í‰É•…¬íõ±•Ì¹ÁÕÍ ¡í°±Í•µ•¹ĞéÌ±‰½…ÉéÌ¹ÍÑ¹ÍlÁt±…±¥¡ĞéÌ¹ÍÑ¹Ì¹…Ğ ´Ä¤°¸¸¹ÍÙô¤í…™Ñ•ÉMÉØõÍÙŒ¹…Ì­a	Uíô(€ô(€¥˜ …É•…±=¬˜™™…¥±•‘A¥˜™É½ÕÑ•ÑÑ•µÁĞğà¥ì(€€€½¹ÍĞ‰±½­•õ¹•ÜM•Ğ¡•á±Õ‘•‘A¥‘Íññmt¤í‰±½­•¹…‘¡™…¥±•‘A¥¤ì(€€€½¹ÍĞ…±Ñ•É¹…Ñ¥Ù”õ}µÉA±…¹¹•‘I½ÕÑ”¡™É½´±Ù¥„±Ñ¼±}µÉ5½‘”±‰±½­•¤ì(€€€¥˜ ……±Ñ•É¹…Ñ¥Ù”¹•ÉÈ˜™…±Ñ•É¹…Ñ¥Ù”¹Í•µ•¹ÑÌü¹±•¹Ñ ¥É•ÑÕÉ¸Í•…É¡5•ÑÉ½I½ÕÑ”¡‰±½­•±É½ÕÑ•ÑÑ•µÁĞ¬Ä¤ì(€ô(€±•ĞÉ…¥°ôœœ°¡•…‘ÕÈ°¡•…‘5•Ñ„°™½½Ğì(€€¼¼ƒ®ª§²‚²ªæ3² ƒ²^ÃªÊÃ®Bc² ƒ²V+®6S®vó®>ƒ².“²‚s®†pƒ¶ ƒ²"`ƒ²z#®*Pƒ®#²®$ƒªÖ³ªÂªæ3²®*PƒªŞã®2®†pƒªŞã®šÃ®.¸(€±•Ì¹™½É…  ¡±œ±¤¤ôùì(€€€€€½¹ÍĞÍ•5¥¸õ±œ¹…Ìµ±œ¹‘Ìì(€€€€€½¹ÍĞ•áÀõ±œ¹±ÌôôôÈüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀµÑˆµ•áÀ´µĞˆû¶*çªâ$ğ½ÍÁ…¸øœé±œ¹±ÌôôôÄüœñÍÁ…¸±…ÍÌô‰µÑˆµ•áÀˆûªâ'¶Z$ğ½ÍÁ…¸øœèœœì(€€€€€½¹ÍĞ•‘”õ±œ¹¥Í¥ÉÍĞüœñÍÁ…¸±…ÍÌô‰ÉĞµ•‘”µÑ…œ™¥ÉÍĞˆû²Ê¯²Â ğ½ÍÁ…¸øœé±œ¹¥Í1…ÍĞüœñÍÁ…¸±…ÍÌô‰ÉĞµ•‘”µÑ…œ±…ÍĞˆû®'²Â ğ½ÍÁ…¸øœèœœì(€€€€€½¹ÍĞ±¥¹•ÉœõMÑÉ¥¹œ¡±œ¹°¹¹…µ”¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€€€½¹ÍĞ‰½…É‘ÉœõMÑÉ¥¹œ¡±œ¹‰½…É¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€€€½¹ÍĞ…±¥¡ÑÉœõMÑÉ¥¹œ¡±œ¹…±¥¡Ğ¤¹É•Á±…” ½qp½œ°qqqpœ¤¹É•Á±…” ¼œ½œ°‰qpœˆ¤ì(€€€€€½¹ÍĞ™¥¹…±1•œõ¤ôôõ±•Ì¹±•¹Ñ ´Äì(€€€€€½¹ÍĞÕÑ=™˜õ™¥¹…±1•œ˜˜…É•…±=¬ì(€€€€€É…¥°¬õ€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”ˆÍÑå±”ôˆ´µ±Œè‘í±œ¹°¹½±½Éôˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñˆø‘í™µĞ¡±œ¹‘•À¥ôğ½ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”µ±…‰•°ˆøñÍµ…±°û²Ús®Âpğ½Íµ…±°ø‘í•‘•ôğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµ‘½ĞÉĞµ‰½…ÉÉĞµµ‘½Ğˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œˆøğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰ÉĞµÍÑ¸ÉĞµÍÑ¸µ±¥¹¬ˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½I½ÕÑ•Q¥µ•Ñ…‰±” œ‘í‰½…É‘Éôœ°œ‘í±¥¹•Éôœ°‘í±œ¹ÍÙô°‘í±œ¹‘•Áô°‘í±œ¹¬Áô°‘í±œ¹¬Åô¤ˆø‘í}½ÁÍÍŒ¡±œ¹‰½…É¥ôñÍÁ…¸±…ÍÌô‰ÉĞµ¡•ØˆûŠèğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµÍÕˆˆø‘í•áÁôñÍÁ…¸±…ÍÌô‰ÉĞµ±¡¥ÀˆÍÑå±”ô‰‰…­É½Õ¹è‘í±œ¹°¹½±½Éôˆø‘í}½ÁÍÍŒ¡±œ¹°¹¹…µ”¥ôğ½ÍÁ…¸ø€‘í}½ÁÍÍŒ¡±œ¹‘•ÍĞ¥÷¶Z$ğ½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹Ğˆø‘í±œ¹¹MÑ½ÁÍ÷ªÂpƒ²^´ƒ
Ü€‘íÍ•5¥¹÷®Ú‘í±œ¹Ù¥„¹±•¹Ñ ı€€ñÍÁ…¸±…ÍÌô‰ÉĞµÙ¥„µÑœˆ½¹±¥¬ô‰Ñ¡¥Ì¹Á…É•¹Ñ±•µ•¹Ğ¹¹•áÑ±•µ•¹ÑM¥‰±¥¹œ¹±…ÍÍ1¥ÍĞ¹Ñ½±” ½Á•¸œ¤ˆûªÊ÷²rƒ²^´ƒŠZøğ½ÍÁ…¸ù€èœôğ½‘¥Øø(€€€€€€€€€€‘í±œ¹Ù¥„¹±•¹Ñ ı€ñ‘¥Ø±…ÍÌô‰ÉĞµÙ¥„ˆø‘í±œ¹Ù¥„¹µ…À¡}½ÁÍÍŒ¤¹©½¥¸ œƒ
Ü€œ¥ôğ½‘¥Øù€èœô(€€€€€€€€ğ½‘¥Øøğ½‘¥Øù€ì(€€€€€É…¥°¬õ€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”ÉĞµ±•œµ…ÉÉ¥Ù”‘í™¥¹…±1•œüœÉĞµ™¥¹…°µ…ÉÉ¥Ù”œèœô‘íÕÑ=™˜üœÉĞµÍ•ÉÙ¥”µ•¹‘•œèœôˆÍÑå±”ôˆ´µ±Œè‘í±œ¹°¹½±½Éôˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñˆø‘í™µĞ¡±œ¹…ÉÈ¥ôğ½ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”µ±…‰•°ˆøñÍµ…±°ø‘íÕÑ=™˜üŸ²jÓ¶Z$ƒ²Š®0œèŸ®>²Â¤ôğ½Íµ…±°øğ½‘¥Øøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµ‘½ĞÉĞµ…±¥¡Ğˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œˆøğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰ÉĞµÍÑ¸ÉĞµÍÑ¸µ±¥¹¬ˆ½¹±¥¬ô‰½Á•¹5•ÑÉ½I½ÕÑ•Q¥µ•Ñ…‰±” œ‘í…±¥¡ÑÉôœ°œ‘í±¥¹•Éôœ°‘í±œ¹ÍÙô°‘í±œ¹…±¥¡Ñ•Áô°‘í±œ¹¬Áô°‘í±œ¹¬Åô¤ˆø‘í}½ÁÍÍŒ¡±œ¹…±¥¡Ğ¥ôñÍÁ…¸±…ÍÌô‰ÉĞµ¡•ØˆûŠèğ½ÍÁ…¸ø‘íÕÑ=™˜üœñÍÁ…¸±…ÍÌô‰ÉĞµ•¹‘•µÑ…œˆû²^³ªâÃªæ3² ƒ²jÓ¶Z$ğ½ÍÁ…¸øœèœôğ½‰ÕÑÑ½¸ø‘íÕÑ=™˜üœñ‘¥Ø±…ÍÌô‰ÉĞµÍÕˆˆû²v×²vğƒ²b“²‚€Ó².pƒ²‚ƒ²^ÃªÊÀƒ²^Ó²Â£ªÂ ƒ²^²ZĞƒ²vÓ¶nƒªÖ³ªÂ²v ƒ²vÓ®>g¶V€ƒ²"`ƒ²^²*×®.#®.¸ğ½‘¥Øøœèœôğ½‘¥Øøğ½‘¥Øù€ì(€€€€€¥˜¡¤ñ±•Ì¹±•¹Ñ ´Ä¥ì½¹ÍĞİ…¥Ğõ±•Ím¤¬Åt¹‘Ìµ±œ¹…Ìì(€€€€€€€É…¥°¬õ€ñ‘¥Ø±…ÍÌô‰ÉĞµ¹½‘”ÉĞµİ…±¬ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÑ¥µ”ˆøñÍµ…±°û¶fc²*äğ½Íµ…±°øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµÉ…¥°ˆøñÍÁ…¸±…ÍÌô‰ÉĞµÍ•œÉĞµ‘…Í ˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÉĞµİ…±¬µ¥ŒˆûŠPğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÉĞµ¥¹™¼ˆøñ‘¥Ø±…ÍÌô‰ÉĞµÍÕˆÉĞµá™•Èˆø‘í}½ÁÍÍŒ¡±œ¹…±¥¡Ğ¥÷²^´ƒ¶fc²*äƒ
Üƒ®2ªâÀ€‘íİ…¥Ñ÷®Úğ½‘¥Øøğ½‘¥Øøğ½‘¥Øù€ì(€€€€€ô(€ô¤ì(€¥˜¡É•…±=¬¥ì(€€€½¹ÍĞ±…ÍĞõ±•Ím±•Ì¹±•¹Ñ ´Åtì(€€€½¹ÍĞÑ½Ñ…°õ±…ÍĞ¹…Ìµ±•ÍlÁt¹‘Ìì(€€€¡•…‘ÕÈõ‘ÕÉµĞ¡Ñ½Ñ…°¤ì(€€€½¹ÍĞµ•ÑÉ½-´õ}µÉ5•ÑÉ½¥ÍÑ…¹”¡È¹Í•µ•¹ÑÌ¤±™…É”õ}µÉ5•ÑÉ½…É”¡µ•ÑÉ½-´¤ì(€€€¡•…‘5•Ñ„õ€‘íÈ¹ÑÉ…¹Í™•ÉÌøÀıƒ¶fc²*ä€‘íÈ¹ÑÉ…¹Í™•ÉÍ÷¶j1€èŸ²¶Ôôƒ
Ü€ñÍÁ…¸±…ÍÌô‰ÉĞµµ½¹¼ˆø‘í™µĞ¡±•ÍlÁt¹‘•À¥÷ŠH‘í™µĞ¡±…ÍĞ¹…ÉÈ¥ôğ½ÍÁ…¸øƒ
Üƒ²b#²€‘í™…É”¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ƒ
Ü€‘íµ•ÑÉ½-´¹Ñ½¥á• Ä¥õ­µ€ì(€€€™½½Ğõƒ².“²‚pƒ²jÓ¶Z$ƒ².sªÂ¶FpƒªâÃ²’ ƒ
Ü€‘í}µÉ‘•5½‘”ôôô™¥ÉÍĞœüŸ²Ê¯²Â ƒ²^ÃªÊÀœé}µÉ‘•5½‘”ôôô±…ÍĞœüŸ®'²Â ƒ²^ÃªÊÀœé}µÉQ¥µ•5½‘”ôôô…ÉÉ¥Ù”œüŸ²ƒ¶tƒ².sªÂªæ3² ƒ®>²Â¤œèŸ²ƒ¶tƒ².sªÂƒ²vÓ¶nƒ²Ús®Âpôƒ
Üƒ²v×²vğƒ²b“²‚€Ó².pƒ²b²^ƒ²Š®0¹€ì(€€€¥˜¡}µÉ‘•5½‘”„ôô¹½Éµ…°œ¥}µÉM¡½İI•Í½±Ù•‘Q¥µ”¡±•ÍlÁt¹‘•À¤ì(€ô•±Í”ì(€€€¥˜ …±•Ì¹±•¹Ñ ¥í½ÕĞ¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰µÈµ¡¥¹Ğˆû²ƒ¶w¶Vpƒ²b²^²vó²v`ƒ²jÓ¶Z$ƒ².sªÂ¶Fs®†pƒ²^ÃªÊÃ®Bc®*PƒªÊ÷®†s®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸ƒ².sªÂ²vÓ®
`ƒ²^·®ª²vƒ¶fW²vã¶Vc²ã²jP¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€€€¡•…‘ÕÈôŸ²vÓ®>dƒªÂ®*”ƒªÖ³ªÂœí¡•…‘5•Ñ„õ€‘í™µĞ¡±•ÍlÁt¹‘•À¥ôƒŠH€´´è´µ€í™½½ĞôŸ®'²Â ƒ²jÓ¶Z'²vĞƒ®w®
³²*×®.#®.¸ƒ¶Fs².s®Bpƒ®#²®$ƒ²^·ªæ3²®0ƒ²vÓ®>g¶V€ƒ²"`ƒ²z#²*×®.#®.¸œì(€ô(€}µÉ1…ÍÑ)½ÕÉ¹•äõí™É½´±Ù¥„±Ñ¼±µ…ÁQ¼éÉ•…±=¬ıÑ¼é±•Ì¹…Ğ ´Ä¤ü¹…±¥¡Ñññ™É½´±Í•µ•¹ÑÌéÉ•…±=¬ıÈ¹Í•µ•¹ÑÌé±•Ì¹µ…À¡°ôù°¹Í•µ•¹Ğ¤±±•Íôì(€½ÕĞ¹¥¹¹•É!Q50õ€(€€€€ñÍ•Ñ¥½¸±…ÍÌô‰µÈµÉ½ÕÑ”µÉ•ÍÕ±Ğ‘íÉ•…±=¬üœœèœÁ…ÉÑ¥…°ôˆø(€€€€€€ñ¡•…‘•È±…ÍÌô‰µÈµÉ•ÍÕ±Ğµ¡•…‘•Èˆøñ‘¥ØøñÍÑÉ½¹œø‘ím™É½´±Ù¥„±Ñ½t¹™¥±Ñ•È¡	½½±•…¸¤¹µ…À¡}½ÁÍÍŒ¤¹©½¥¸ œƒŠH€œ¥ôğ½ÍÑÉ½¹œøñÍÁ…¸±…ÍÌô‰‰…‘”‰±Õ”ˆø‘í}µÉ5½‘”ôôôÑ¥µ”œüŸ²Ös²0ƒ².sªÂœèŸ²Ös²0ƒ¶fc²*äôğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Øøñˆø‘íÉ•…±=¬üŸ²Òt€œèœô‘í¡•…‘ÕÉôğ½ˆøñÍµ…±°ø‘í¡•…‘5•Ñ…ôğ½Íµ…±°øğ½‘¥Øøğ½¡•…‘•Èø(€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµ±¥ÍĞˆøñ‘¥Ø±…ÍÌô‰ÉĞµ…Éˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÉĞµÑ°ˆø‘íÉ…¥±ôğ½‘¥Øø(€€€€ğ½‘¥Øøğ½‘¥Øø(€€€€ñÀ±…ÍÌô‰½ÁÌµ¡¥¹Ğˆø‘í™½½Ñôğ½Àø(€€€€ñ™½½Ñ•È±…ÍÌô‰µÈµÉ•ÍÕ±Ğµ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬ô‰}µÉM¡…É•I½ÕÑ” ¤ˆûªÎ×²rƒ¶VcªâÀğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬ô‰}µÉ=Á•¹5…À µ…Àœ¤ˆû²®>²^C²pƒ®ÎÓªâÀğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰ÁÉ¥µ…Éäˆ½¹±¥¬ô‰}µÉ½ÕÍM•…É  ¤ˆû®.“®–àƒªÊ÷®†pƒ®ÎÓªâÀ€ñÍÁ…¸ûŠHğ½ÍÁ…¸øğ½‰ÕÑÑ½¸øğ½™½½Ñ•Èø(€€€€ğ½Í•Ñ¥½¸ù€ì)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~jƒ¶G²*äƒ²^³²‚TƒŠPƒ².“².sªÂƒ²*ç²Â ƒ¶fS®¦Ğ€£ªâÃ²†Ğƒ²r²æ`ƒªÎ²
Àƒ²z³¶fs²j¤°ƒ®ªÃ²z¶bT¤(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)±•Ğ}©½ÕÉ¹•å9¼õ¹Õ±°°}©½ÕÉ¹•åQ¥µ•Èõ¹Õ±°°}©½ÕÉ¹•åA…•1½¬õ¹Õ±°ì(¼¼ƒ².sªÂƒ²z#®*Pƒ²‚W²Â ¿¶×ªÎó²^·²vƒ²zC²‚Tƒ®ÎÓ²‚W®Bpƒ®Ú²ró®†pƒ®Âc¶f`)™Õ¹Ñ¥½¸}©½ÕÉ¹•åMÑ½ÁÌ¡Ğ¥ì(€½¹ÍĞÉ…Üõmtì(€Ğ¹ÍÑ½ÁÌ¹™½É… ¡Ìôùì¥˜¡¡…ÍQ¥µ”¡Ì¹…ÉÈ¥ññ¡…ÍQ¥µ”¡Ì¹‘•À¤¥É…Ü¹ÁÕÍ ¡Ì¤ìô¤ì(€¥˜ …É…Ü¹±•¹Ñ ¥É•ÑÕÉ¸mtì(€½¹ÍĞ½É¥¥¹MÑ¸õÉ…İlÁt¹Ì°Ñ•ÉµMÑ¸õÉ…İmÉ…Ü¹±•¹Ñ ´Åt¹Ìì(€±•Ğ½™™Í•ĞôÀ°ÁÉ•Ù4ô´Äì(€É•ÑÕÉ¸É…Ü¹µ…À¡Ìôùì(€€€½¹ÍĞÉ„õÑ½5¥¸¡Ì¹…ÉÈ¤°ÉõÑ½5¥¸¡Ì¹‘•À¤ì(€€€½¹ÍĞÉ´õÉ„üıÉì(€€€¥˜¡É´„ôõ¹Õ±°˜™ÁÉ•Ù4øôÀ˜™É´ñÁÉ•Ù4´ØÀ¥½™™Í•Ğ¬ôÄĞĞÀì(€€€¥˜¡É´„ôõ¹Õ±°¥ÁÉ•Ù4õÉ´ì(€€€½¹ÍĞ¥Í=É¥¥¸õÌ¹Ìôôõ½É¥¥¹MÑ¸°¥ÍQ•É´õÌ¹ÌôôõÑ•ÉµMÑ¸ì(€€€É•ÑÕÉ¸íÌéÌ¹Ì°…ÉÈéÌ¹…ÉÈ°‘•ÀéÌ¹‘•À°(€€€€€¹½ÉµÉÈéÉ„„ôõ¹Õ±°ıÉ„­½™™Í•Ğé¹Õ±°°¹½Éµ•ÀéÉ„ôõ¹Õ±°ıÉ­½™™Í•Ğé¹Õ±°°(€€€€€¥ÍA…ÍÌè…¥Í=É¥¥¸˜˜…¥ÍQ•É´˜™¥ÍA…ÍÍMÑ½À¡Ğ±Ì¹Ì¤°¥Í=É¥¥¸°¥ÍQ•Éµôì(€ô¤ì)ô)™Õ¹Ñ¥½¸½Á•¹)½ÕÉ¹•ä¡¹¼¥ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡¹¼¤ì¥˜ …Ğ¥É•ÑÕÉ¸ì(€}©½ÕÉ¹•å9¼õ¹¼ì(€±•Ğ½Øõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ©½ÕÉ¹•äµ½Ù•É±…äœ¤ì(€¥˜ …½Ø¥ì(€€€½Øõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì½Ø¹¥ô©½ÕÉ¹•äµ½Ù•É±…äœì½Ø¹±…ÍÍ9…µ”ô©½ÕÉ¹•äµ½Ù•É±…äœì(€€€½Ø¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰©½ÕÉ¹•äµÍ¡••Ğˆøñ‰ÕÑÑ½¸±…ÍÌô‰©½ÕÉ¹•äµ±½Í”ˆ½¹±¥¬ô‰±½Í•)½ÕÉ¹•ä ¤ˆ…É¥„µ±…‰•°ô‹®.¯ªâÀˆûŠrTğ½‰ÕÑÑ½¸øñ‘¥Ø¥ô‰©½ÕÉ¹•äµ‰½‘äˆøğ½‘¥Øøğ½‘¥Øù€ì(€€€½Ø¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•É‘½İ¸œ±”ôù”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤¤ì(€€€½Ø¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡ÍÑ…ÉĞœ±”ôù”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì(€€€½Ø¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡µ½Ù”œ±”ôù”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì(€€€½Ø¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùì”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤ì¥˜¡”¹Ñ…É•Ğôôõ½Ø¥±½Í•)½ÕÉ¹•ä ¤ìô¤ì(€€€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡½Ø¤ì(€ô(€¥˜ …½Ø¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ½Á•¸œ¤¥ì(€€€½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹‰½‘ä°É½½Ğõ‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ°ÍÉ½±±dõİ¥¹‘½Ü¹ÍÉ½±±dì(€€€}©½ÕÉ¹•åA…•1½¬õì(€€€€€ÍÉ½±±d°(€€€€€‰½‘äéíÁ½Í¥Ñ¥½¸é‰½‘ä¹ÍÑå±”¹Á½Í¥Ñ¥½¸±Ñ½Àé‰½‘ä¹ÍÑå±”¹Ñ½À±±•™Ğé‰½‘ä¹ÍÑå±”¹±•™Ğ°(€€€€€€€É¥¡Ğé‰½‘ä¹ÍÑå±”¹É¥¡Ğ±İ¥‘Ñ é‰½‘ä¹ÍÑå±”¹İ¥‘Ñ ±½Ù•É™±½Üé‰½‘ä¹ÍÑå±”¹½Ù•É™±½İô°(€€€€€É½½Ñ=Ù•É™±½ÜéÉ½½Ğ¹ÍÑå±”¹½Ù•É™±½Ü(€€€ôì(€€€‰½‘ä¹±…ÍÍ1¥ÍĞ¹…‘ ©½ÕÉ¹•äµµ½‘…°µ½Á•¸œ¤ì(€€€‰½‘ä¹ÍÑå±”¹Ñ½Àõ€´‘íÍÉ½±±eõÁá€ì(€€€É½½Ğ¹ÍÑå±”¹½Ù•É™±½Üô¡¥‘‘•¸œì(€ô(€½Ø¹±…ÍÍ1¥ÍĞ¹…‘ ½Á•¸œ¤ì(€½¹ÍĞ©ˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ©½ÕÉ¹•äµ‰½‘äœ¤ì¥˜¡©ˆ¥©ˆ¹}ÍÉ½±±•‘=¹”õ™…±Í”ì(€}É•¹‘•É)½ÕÉ¹•ä ¤ì(€}Í¡•‘Õ±•)½ÕÉ¹•åQ¥¬ ¤ì)ô(¼¼ƒ®“®Ú€Ã²Ò#²^@ƒ®{²ÚÀƒªÂÇ².€ƒ²*“²ò²’®)™Õ¹Ñ¥½¸}Í¡•‘Õ±•)½ÕÉ¹•åQ¥¬ ¥ì(€¥˜¡}©½ÕÉ¹•åQ¥µ•È¥±•…ÉQ¥µ•½ÕĞ¡}©½ÕÉ¹•åQ¥µ•È¤ì(€¥˜ …}©½ÕÉ¹•å9¼¥É•ÑÕÉ¸ì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì(€½¹ÍĞµÌô ØÀµ¹½Ü¹•ÑM•½¹‘Ì ¤¤¨ÄÀÀÀµ¹½Ü¹•Ñ5¥±±¥Í•½¹‘Ì ¤ì(€}©½ÕÉ¹•åQ¥µ•ÈõÍ•ÑQ¥µ•½ÕĞ  ¤ôùì}É•¹‘•É)½ÕÉ¹•ä ¤ì}Í¡•‘Õ±•)½ÕÉ¹•åQ¥¬ ¤ìô°µÌ¤ì)ô)™Õ¹Ñ¥½¸±½Í•)½ÕÉ¹•ä ¥ì(€½¹ÍĞ½Øõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ©½ÕÉ¹•äµ½Ù•É±…äœ¤ì(€¥˜¡½Ø¥½Ø¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ½Á•¸œ¤ì(€¥˜¡}©½ÕÉ¹•åA…•1½¬¥ì(€€€½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹‰½‘ä°É½½Ğõ‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ°±½¬õ}©½ÕÉ¹•åA…•1½¬ì(€€€‰½‘ä¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ©½ÕÉ¹•äµµ½‘…°µ½Á•¸œ¤ì(€€€=‰©•Ğ¹…ÍÍ¥¸¡‰½‘ä¹ÍÑå±”±±½¬¹‰½‘ä¤ì(€€€É½½Ğ¹ÍÑå±”¹½Ù•É™±½Üõ±½¬¹É½½Ñ=Ù•É™±½Üì(€€€İ¥¹‘½Ü¹ÍÉ½±±Q¼ À±±½¬¹ÍÉ½±±d¤ì(€€€}©½ÕÉ¹•åA…•1½¬õ¹Õ±°ì(€ô(€¥˜¡}©½ÕÉ¹•åQ¥µ•È¥í±•…ÉQ¥µ•½ÕĞ¡}©½ÕÉ¹•åQ¥µ•È¤í}©½ÕÉ¹•åQ¥µ•Èõ¹Õ±°íô(€}©½ÕÉ¹•å9¼õ¹Õ±°ì)ô)™Õ¹Ñ¥½¸}É•¹‘•É)½ÕÉ¹•å½É•…ÍĞ¡Ğ±¥Í=Á•¸õÑÉÕ”¥ì(€±•ĞÉ…Ñ”ô¸Ôì(€ÑÉåì(€€€½¹ÍĞ™¥ÉÍĞõĞ¹ÍÑ½ÁÌ¹™¥¹¡Ìôù¡…ÍQ¥µ”¡Ì¹‘•À¥ññ¡…ÍQ¥µ”¡Ì¹…ÉÈ¤¤ì(€€€½¹ÍĞ‘•Àõ™¥ÉÍĞü¡¡…ÍQ¥µ”¡™¥ÉÍĞ¹‘•À¤ı™¥ÉÍĞ¹‘•Àé™¥ÉÍĞ¹…ÉÈ¤èœœì(€€€¥˜¡ÑåÁ•½˜…±I•…±¥ÍÑ¥¥±±I…Ñ”ôôô™Õ¹Ñ¥½¸œ¥É…Ñ”õ…±I•…±¥ÍÑ¥¥±±I…Ñ”¡Ğ¹¹¼±Ñ½‘…å1½…±MÑÈ ¤±‘•À±Ğ¹É…‘”¤ì(€õ…Ñ ¡”¥íô(€É…Ñ”õ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸ Ä±É…Ñ”¤¤ì(€½¹ÍĞÁĞõ5…Ñ ¹É½Õ¹¡É…Ñ”¨ÄÀÀ¤ì(€½¹ÍĞ±•Ù•°õÉ…Ñ”øô¸äüŸ®“²jÀƒ¶bó²z„œéÉ…Ñ”øô¸ÜØüŸ¶bó²z„œéÉ…Ñ”øô¸ÔàüŸ®ÎÓ¶ÔœèŸ²^³²r€œì(€½¹ÍĞ±ÌõÉ…Ñ”øô¸äüÉ¥Ñ¥…°œéÉ…Ñ”øô¸ÜØü‰ÕÍäœéÉ…Ñ”øô¸Ôàü¹½Éµ…°œè…±´œì(€½¹ÍĞ¥¹Í¥¡ĞõÑåÁ•½˜}‘•±…åA…ÍÍ•¹•É%¹Í¥¡Ğôôô™Õ¹Ñ¥½¸œı}‘•±…åA…ÍÍ•¹•É%¹Í¥¡Ğ¡Ğ¤é¹Õ±°ì(€½¹ÍĞ™½É•…ÍÑ1½ÌõÑåÁ•½˜}Í¥µÙ•¹Ñ1½œôôô™Õ¹Ñ¥½¸œı}Í¥µÙ•¹Ñ1½œ¡Ğ±ÑÉÕ”¤émtì(€½¹ÍĞ™½É•…ÍÑ1½I½İÌõ™½É•…ÍÑ1½Ì¹Í±¥” À°ÈÀ¤(€€€€¹µ…À¡±¥¹”ôù€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ±½œµÉ½Üˆø‘í}½ÁÍÍŒ¡±¥¹”¥ôğ½‘¥Øù€¤¹©½¥¸ œœ¤ì(€½¹ÍĞ‘•±…åY…±Õ”õ¥¹Í¥¡Ğü¹•ÍÑ¥µ…Ñ•‘•±…äı¥¹Í¥¡Ğ¹‘•±…åI…¹”é€‘í¥¹Í¥¡Ğü¹™½É•…ÍĞü¹ÁÉ½‰ñğÁô•€ì(€½¹ÍĞ‘•±…å1…‰•°õ¥¹Í¥¡Ğü¹•ÍÑ¥µ…Ñ•‘•±…äüŸ²b#²ƒ²²^Àƒ®ÊS²rœèŸ²²^ÀƒªÂ®*—²Äœì(€É•ÑÕÉ¸€ñ‘•Ñ…¥±Ì±…ÍÌô‰©Èµ™½É•…ÍĞµ…É€‘í±Íôˆ‘í¥Í=Á•¸üœ½Á•¸œèœôø(€€€€ñÍÕµµ…Éä±…ÍÌô‰©Èµ™½É•…ÍĞµ¡•…ˆø(€€€€€€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©Èµ™½É•…ÍĞµ¥½¸ˆûŠb¾â<ğ½ÍÁ…¸øñ‘¥Øøñˆû²b“®*c²v`ƒ²jÓ¶Z$ƒ²b#²ğ½ˆøñÍµ…±°û²Ús®Âpƒ²‚ƒ²b#²â„ƒ
Üƒ²jÓ¶Z$ƒ².s²zDƒ¶nƒ²zC®>dƒ²"£ªæ ğ½Íµ…±°øğ½‘¥Øøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ¡•…µµ•Ñ„ˆøñÍÁ…¸±…ÍÌô‰©Èµ™½É•…ÍĞµ½¹™¥‘•¹”ˆû².ƒ®ŠÃ®>€‘í¥¹Í¥¡Ğü¹½¹™¥‘•¹•ñğœ´ô”ğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰©Èµ™½É•…ÍĞµ¡•ÙÉ½¸ˆûŠ2ğ½ÍÁ…¸øğ½‘¥Øø(€€€€ğ½ÍÕµµ…Éäø(€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµÉ¥ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµµ•ÑÉ¥Œˆø(€€€€€€€€ñÍÁ…¸û²b#²ƒ¶bó²z‡®>ğ½ÍÁ…¸øñˆø‘í±•Ù•±ôğ½ˆøñ•´ø‘íÁÑô”ğ½•´ø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ‰…Èˆøñ¤ÍÑå±”ô‰İ¥‘Ñ è‘íÁÑô”ˆøğ½¤øğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµµ•ÑÉ¥Œ‘•±…äˆø(€€€€€€€€ñÍÁ…¸ø‘í‘•±…å1…‰•±ôğ½ÍÁ…¸øñˆø‘í¥¹Í¥¡Ğü¹™½É•…ÍĞü¹±…‰•±ñğŸ®
»²v0ôğ½ˆøñ•´ø‘í‘•±…åY…±Õ•ôğ½•´ø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ‰…Èˆøñ¤ÍÑå±”ô‰İ¥‘Ñ è‘í¥¹Í¥¡Ğü¹™½É•…ÍĞü¹ÁÉ½‰ñğÁô”ˆøğ½¤øğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµÍÕµµ…ÉäˆûÂ~F€‘í}½ÁÍÍŒ¡¥¹Í¥¡Ğü¹Á…ÍÍ•¹•ÉMÕµµ…ÉåñğŸ¶b²z°ƒ²b#²â‡²ƒ²*çªÂtƒ²^³²‚W²^@ƒ®¾ã²æc®*Pƒ²b¶Z—²v ƒªÆÃ²v`ƒ²^²*×®.#®.¸œ¥ôğ½‘¥Øø(€€€€ñ‘•Ñ…¥±Ì±…ÍÌô‰©Èµ™½É•…ÍĞµ‘•Ñ…¥°ˆø(€€€€€€ñÍÕµµ…Éäû²b#²ƒ²²^Àƒ®†sªŞàƒ®ÎÓªâÀ€ñÍÁ…¸ûŠèğ½ÍÁ…¸øğ½ÍÕµµ…Éäø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ‘•Ñ…¥°µ‰½‘äˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ‘•Ñ…¥°µÑ¥Ñ±”ˆû²jÓ¶Z$ƒ²‚ƒ²b#²ƒªÖ³ªÂ®ÎƒªâÃ®†tğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ±½œˆø‘í™½É•…ÍÑ1½I½İÍñğœñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ•µÁÑäˆû¶b²z°ƒ²b#²‚W®Bpƒ²²^Àƒ²vÓ®Ê“¶*ãªÂ ƒ²^²*×®.#®.¸ğ½‘¥Øøôğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ™½É•…ÍĞµ™½½Ğˆû²jÓ¶Z$ƒ²‚ƒ².s®º³®‚#²vÓ²`ƒªâÃ²’ ƒ
Üƒ².“²‚pƒ²jÓ¶Z$ƒ²’G²^C®*PƒªÒ²â„ƒ²¶f§²^@ƒ®RÃ®vğƒ®†sªŞã²f ƒ²²^Àƒ².sªÂ²vĞƒ®.“².pƒªÎ²
Ã®B§®.#®.¸ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘•Ñ…¥±Ìø(€€ğ½‘•Ñ…¥±Ìù€ì)ô)™Õ¹Ñ¥½¸}É•¹‘•É)½ÕÉ¹•ä ¥ì(€½¹ÍĞ‰½‘äõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ©½ÕÉ¹•äµ‰½‘äœ¤ì¥˜ …‰½‘åñğ…}©½ÕÉ¹•å9¼¥É•ÑÕÉ¸ì(€€¼¼ƒ²zC®>dƒªÂÇ².€ƒ².pƒ¶b²z°ƒ²*“¶³®†ƒ²r²æ`ƒ®ÎÓ²†Ğ£¶bó²z@ƒ® ƒ²r®†pƒ¶*®*Pƒ®²ã²‚pƒ®Â§² ¤(€½¹ÍĞ}ÁÉ•ÙMŒõ‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÉ½±°œ¤ì(€½¹ÍĞ}ÁÉ•ÙQ½Àõ}ÁÉ•ÙMŒı}ÁÉ•ÙMŒ¹ÍÉ½±±Q½ÀèÀì(€½¹ÍĞ}™½É•…ÍÑ°õ‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ¹©Èµ™½É•…ÍĞµ…Éœ¤ì(€½¹ÍĞ}™½É•…ÍÑ=Á•¸õ}™½É•…ÍÑ°ı}™½É•…ÍÑ°¹½Á•¸éÑÉÕ”ì(€½¹ÍĞ}™¥ÉÍÑI•¹‘•Èô…‰½‘ä¹}ÍÉ½±±•‘=¹”ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡}©½ÕÉ¹•å9¼¤ì¥˜ …Ğ¥É•ÑÕÉ¸ì(€½¹ÍĞÍÑ½ÁÌõ}©½ÕÉ¹•åMÑ½ÁÌ¡Ğ¤ì¥˜ …ÍÑ½ÁÌ¹±•¹Ñ ¥í‰½‘ä¹¥¹¹•É!Q50ôœñ‘¥Ø±…ÍÌô‰•µÁÑäˆû².sªÂƒ²‚W®ÎÓªÂ ƒ²^²*×®.#®.¸ğ½‘¥ØøœíÉ•ÑÕÉ¸íô(€½¹ÍĞ™¥ÉÍÑ4õÍÑ½ÁÍlÁt¹¹½Éµ•ÀüıÍÑ½ÁÍlÁt¹¹½ÉµÉÈì(€½¹ÍĞ±…ÍÑ%Ñ•´õÍÑ½ÁÍmÍÑ½ÁÌ¹±•¹Ñ ´Åtì(€½¹ÍĞ±…ÍÑ4õ±…ÍÑ%Ñ•´¹¹½ÉµÉÈüı±…ÍÑ%Ñ•´¹¹½Éµ•Àì(€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì(€½¹ÍĞÉ•…±9½İ5¥¸õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤­¹½Ü¹•ÑM•½¹‘Ì ¤¼ØÀì(€½¹ÍĞÍ¥µMÑ…Ñ”õÑåÁ•½˜}Í¥µMÑ…Ñ”ôôô™Õ¹Ñ¥½¸œı}Í¥µMÑ…Ñ”¡Ğ¤é¹Õ±°ì(€€¼¼ƒ²²^Àƒ².s®º°ƒ®Âc²bèƒ²^Ó²Â£®*P‘±ç®Úƒ®J“²Êc²ƒ²r²æc²^@ƒ²z#²v0ƒŠHƒ²rƒ¶j£².sªÂ€ôƒ².“²‚s².sªÂ€´‘±ä(€½¹ÍĞ‘±äõÍ¥µMÑ…Ñ”ıÍ¥µMÑ…Ñ”¹ÕÉÉ•¹Ğé}Í¥µ•±…ä¡Ğ°É•…±9½İ5¥¸¤ì(€½¹ÍĞ™¥¹…±õÍ¥µMÑ…Ñ”ıÍ¥µMÑ…Ñ”¹™¥¹…°é}Í¥µ¥¹…±•±…ä¡Ğ¤ì(€±•Ğ¹½İ5¥¸õÉ•…±9½İ5¥¸µ‘±äì(€½¹ÍĞÍÑ…ÑÕÌõ•ÑÕÉÉ•¹ÑMÑ…ÑÕÌ¡Ğ°¹½İ5¥¸¤ì(€±•Ğ¹½İ4õ¹½İ5¥¸ì(€¥˜¡±…ÍÑ4øôÄĞĞÀ˜™¹½İ5¥¸ñ™¥ÉÍÑ4¥ì½¹ÍĞÍ õ¹½İ5¥¸¬ÄĞĞÀì¥˜¡¹½İ5¥¸ğÈĞÁññÍ ğõ±…ÍÑ4¥¹½İ4õÍ ìô(€½¹ÍĞŒô¡ÑåÁ•½˜I}=1=IL„ôôÕ¹‘•™¥¹•œ˜™I}=1=IMmĞ¹É…‘•t¥ñğœŒáˆäĞå”œì(€½¹ÍĞ°ô¡ÑåÁ•½˜0„ôôÕ¹‘•™¥¹•œ˜™1mĞ¹É…‘•t¥ññĞ¹É…‘”ì(€€¼¼ƒ²¶Z'®–€(€±•ĞÁÉ½œôÀ°Á¡…Í”ô‰•™½É”œì(€¥˜¡Í¥µMÑ…Ñ”ü¹Á¡…Í”ôôô‘½¹”ññÍÑ…ÑÕÌ˜™ÍÑ…ÑÕÌ¹ÍÑ…ÑÕÌôôô‘½¹”œ¥íÁÉ½œôÄÀÀíÁ¡…Í”ô‘½¹”œíô(€•±Í”¥˜¡Í¥µMÑ…Ñ”ü¹Á¡…Í”ôôôÉÕ¹¹¥¹œññÍÑ…ÑÕÌ˜™ÍÑ…ÑÕÌ¹ÍÑ…ÑÕÌôôôÉÕ¹¹¥¹œœ¥íÁÉ½œõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ää°¡¹½İ4µ™¥ÉÍÑ4¤¼¡±…ÍÑ4µ™¥ÉÍÑ4¤¨ÄÀÀ¤¤íÁ¡…Í”ôÉÕ¹¹¥¹œœíô(€•±Í”íÁÉ½œôÀíÁ¡…Í”ô‰•™½É”œíô(€€¼¼ƒ¶×ªÎó²^´ƒ²vã² ƒ²r²æ`ƒªÎ²
Àèƒ²‚W²Â ƒ²’D¡‘İ•±°§
ß®.“²v0ƒ².“²‚pƒ²‚W²Â£²^´¡¹•áÑI•…°§²vƒ²²‚Dƒ²
Ã²Úp(€±•Ğ‘İ•±±%‘àô´Ä°¹•áÑI•…±%‘àô´Äì(€¥˜¡Á¡…Í”ôôôÉÕ¹¹¥¹œœ¥ì(€€€™½È¡±•Ğ¤ôÀí¤ñÍÑ½ÁÌ¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞÍĞõÍÑ½ÁÍm¥tì¥˜¡ÍĞ¹¥ÍA…ÍÌ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ„õÍĞ¹¹½ÉµÉÈ°õÍĞ¹¹½Éµ•Àì(€€€€€¥˜¡„„õ¹Õ±°˜™„õ¹Õ±°˜™„„ôõ˜™¹½İ4øõ„˜™¹½İ4ğõ¥í‘İ•±±%‘àõ¤í‰É•…¬íô(€€€ô(€€€™½È¡±•Ğ¤ôÀí¤ñÍÑ½ÁÌ¹±•¹Ñ í¤¬¬¥ì(€€€€€½¹ÍĞÍĞõÍÑ½ÁÍm¥tì¥˜¡ÍĞ¹¥ÍA…ÍÌ¥½¹Ñ¥¹Õ”ì(€€€€€½¹ÍĞ„õÍĞ¹¹½ÉµÉÈüıÍĞ¹¹½Éµ•Àì(€€€€€¥˜¡„„õ¹Õ±°˜™„ù¹½İ4¥í¹•áÑI•…±%‘àõ¤í‰É•…¬íô(€€€ô(€ô(€€¼¼ƒ²¶pƒ®²ãªÖ°(€±•Ğ¡•…ôœœ°ÍÕˆôœœì(€¥˜¡Á¡…Í”ôôôÉÕ¹¹¥¹œœ¥ì(€€€¥˜¡ÍÑ…ÑÕÌ˜™ÍÑ…ÑÕÌ¹Á…ÍÍMÑ¸¥í¡•…õ€‘í}½ÁÍÍŒ¡ÍÑ…ÑÕÌ¹Á…ÍÍMÑ¸¥ôƒ¶×ªÎğƒ²’E€íô(€€€•±Í”¥˜¡‘İ•±±%‘àøôÀ¥í¡•…õ€‘í}½ÁÍÍŒ¡ÍÑ½ÁÍm‘İ•±±%‘át¹Ì¥ôƒ²‚W²Â ƒ²’E€íô(€€€•±Í”¥˜¡¹•áÑI•…±%‘àøôÀ¥í¡•…õ€‘í}½ÁÍÍŒ¡ÍÑ½ÁÍm¹•áÑI•…±%‘át¹Ì¥ôƒ®Â§®¦Ğƒ²vÓ®>dƒ²’E€íô(€€€•±Í”¡•…ôŸ²jÓ¶Z$ƒ²’Dœì(€€€¥˜¡¹•áÑI•…±%‘àøôÀ¥ì(€€€€€½¹ÍĞ‘´õ5…Ñ ¹É½Õ¹ ¡ÍÑ½ÁÍm¹•áÑI•…±%‘át¹¹½ÉµÉÈüıÍÑ½ÁÍm¹•áÑI•…±%‘át¹¹½Éµ•À¤µ¹½İ4¤ì(€€€€€ÍÕˆõ‘´ğôÀıƒªÎœ€‘í}½ÁÍÍŒ¡ÍÑ½ÁÍm¹•áÑI•…±%‘át¹Ì¥ôƒ®>²Â¥€éƒ®.“²v0ƒ²‚W²Â €‘í}½ÁÍÍŒ¡ÍÑ½ÁÍm¹•áÑI•…±%‘át¹Ì¥ôƒ
Üƒ²Vô€‘í‘µ÷®Úƒ¶nƒ®>²Â¥€ì(€€€ô(€ô•±Í”¥˜¡Á¡…Í”ôôô‰•™½É”œ¥ì(€€€¡•…ôŸ²jÓ¶Z$ƒ²’®æƒ²’Dœì(€€€ÍÕˆô¡ÍÑ…ÑÕÌ˜™ÍÑ…ÑÕÌ¹•Ñ…5¥¸„õ¹Õ±°¤ı™µÑÑ…-½È¡ÍÑ…ÑÕÌ¹•Ñ…5¥¸¤èœœì(€ô•±Í”ì¡•…ôŸ²jÓ¶Z$ƒ²Š®0œìÍÕˆõ€‘í}½ÁÍÍŒ¡ÍÑ½ÁÍlÁt¹Ì¥ôƒŠH€‘í}½ÁÍÍŒ¡±…ÍÑ%Ñ•´¹Ì¥ôƒ²jÓ¶Z$ƒ²f®1€ìô(€€¼¼ƒ¶²z®vó²và(€½¹ÍĞ±¤õÍÑ½ÁÌ¹µ…À ¡ÍĞ±¥‘à¤ôùì(€€€½¹ÍĞ±•…Ù•4õÍĞ¹¹½Éµ•ÀüıÍĞ¹¹½ÉµÉÈì(€€€½¹ÍĞÁ…ÍÍ•ô¡Á¡…Í”ôôô‘½¹”œ¥ñğ¡±•…Ù•4„õ¹Õ±°˜™¹½İ4ù±•…Ù•4¬À¸ÀÄ¤ì(€€€½¹ÍĞ¥ÍÕÈõÁ¡…Í”ôôôÉÕ¹¹¥¹œœ˜™¥‘àôôõ‘İ•±±%‘àì(€€€½¹ÍĞ¥Í9•áĞõÁ¡…Í”ôôôÉÕ¹¹¥¹œœ˜™¥‘àôôõ¹•áÑI•…±%‘à˜™‘İ•±±%‘àğÀì(€€€½¹ÍĞÁ±…Ğô¡ÑåÁ•½˜}É•…±A±…Ñ™½É´ôôô™Õ¹Ñ¥½¸œ¤ı}É•…±A±…Ñ™½É´¡Ğ¹¹¼±ÍĞ¹Ì¤é¹Õ±°ì(€€€½¹ÍĞÑÉÈõ¡…ÍQ¥µ”¡ÍĞ¹…ÉÈ¤ıÍĞ¹…ÉÈèœœ°Ñ•Àõ¡…ÍQ¥µ”¡ÍĞ¹‘•À¤ıÍĞ¹‘•Àèœœì(€€€€¼¼ƒ²vĞƒ²^´ƒ².s²‚C²v`ƒ²²^Ã®Ú£²jÓ¶Z$¿²Š®0ƒ².p¤èƒ²®
c²b ƒ²^´÷².“²‚pƒ²²^À°ƒ®
£²v ƒ²^´÷²²^Àƒ²b#²‚T¸ƒ²‚W².s®¦Ğ€À¸(€€€½¹ÍĞ‘•±…åA…¥Èô¡}Í¥µ•±…å=¸˜™Á¡…Í”„ôô‰•™½É”œ˜™ÑåÁ•½˜}Í¥µ•±…åA…¥ÉÑMÑ½Àôôô™Õ¹Ñ¥½¸œ¤(€€€€€€ı}Í¥µ•±…åA…¥ÉÑMÑ½À¡Ğ±¥‘à¤éí…ÉÈé}Í¥µ•±…åÑMÑ½À¡Ğ±¥‘à¤±‘•Àé}Í¥µ•±…åÑMÑ½À¡Ğ±¥‘à¤±Í¡½ÉÑ•¹•é™…±Í•ôì(€€€½¹ÍĞ‘ÉÈõ‘•±…åA…¥È¹…ÉÉñğÀ°‘•Àõ‘•±…åA…¥È¹‘•ÁñğÀ°‘MÑ½Àõ5…Ñ ¹µ…à¡‘ÉÈ±‘•À¤ì(€€€½¹ÍĞÍõÑÉÈı…‘‘5¥¹Q½±½¬¡ÑÉÈ±‘ÉÈ¤èœœ°ÍõÑ•Àı…‘‘5¥¹Q½±½¬¡Ñ•À±‘•À¤èœœì(€€€½¹ÍĞ‘•±…åQáĞõ‘MÑ½ÀøÀ(€€€€€€ı‘ÉÈ„ôõ‘•À(€€€€€€€€ı€€ñÍÁ…¸±…ÍÌô‰©ÈµÑ¥µ”µ‘¥™˜ˆø ‘í‘ÉÈøÀüœ¬œ­‘ÉÈèœÀôƒŠH€¬‘í‘•Áô¤ğ½ÍÁ…¸ù€(€€€€€€€€é€€ñÍÁ…¸±…ÍÌô‰©ÈµÑ¥µ”µ‘¥™˜ˆø ¬‘í‘MÑ½Áô¤ğ½ÍÁ…¸ù€(€€€€€€èœœì(€€€½¹ÍĞÑ¥µ•	…Í”õÍĞ¹¥Í=É¥¥¸ı€‘íÍññÍôƒ²Ús®Âq€éÍĞ¹¥ÍQ•É´ı€‘íÍññÍôƒ®>²Â¥€è¡Í˜™Í˜™ÑÉÈ„ôõÑ•Àı€‘íÍ÷ŠL‘íÍõ€è¡ÍññÍ¤¤ì(€€€½¹ÍĞÑ¥µ•QáĞõÑ¥µ•	…Í”­‘•±…åQáĞì(€€€½¹ÍĞ±Ìõl©ÈµÍÑ½Àtì(€€€¥˜¡ÍĞ¹¥ÍA…ÍÌ¥±Ì¹ÁÕÍ  Á…ÍÌœ¤ì¥˜¡Á…ÍÍ•˜˜…¥ÍÕÈ¥±Ì¹ÁÕÍ  ‘½¹”œ¤ì¥˜¡¥ÍÕÈ¥±Ì¹ÁÕÍ  ÕÈœ¤ì¥˜¡¥Í9•áĞ¥±Ì¹ÁÕÍ  ¹•áĞœ¤ì(€€€½¹ÍĞ¹…µ•±ÌõÍĞ¹¥Í=É¥¥¸ü©Èµ½É¥¥¸œéÍĞ¹¥ÍQ•É´ü©ÈµÑ•É´œèœœì(€€€½¹ÍĞ‰…‘”õ¥ÍÕÈüœñÍÁ…¸±…ÍÌô‰©Èµ‰…‘”ÕÈˆû¶b²z°ğ½ÍÁ…¸øœé¥Í9•áĞüœñÍÁ…¸±…ÍÌô‰©Èµ‰…‘”¹•áĞˆû®.“²v0ğ½ÍÁ…¸øœèœœì(€€€½¹ÍĞÁ±…ÑQáĞô …ÍĞ¹¥ÍA…ÍÌ˜™Á±…Ğ„õ¹Õ±°¤ı€ñÍÁ…¸±…ÍÌô‰©ÈµÁ±…Ğˆø‘íÁ±…Ñ÷®Ê ğ½ÍÁ…¸ù€èœœì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌôˆ‘í±Ì¹©½¥¸ œ€œ¥ôˆÍÑå±”ôˆ´µŒè‘íôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ‘½Ğˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ¥¹™¼ˆøñÍÁ…¸±…ÍÌô‰©Èµ¹…µ”€‘í¹…µ•±Íôˆø‘í}½ÁÍÍŒ¡ÍĞ¹Ì¥ô‘íÍĞ¹¥ÍA…ÍÌüœ€ñÍÁ…¸±…ÍÌô‰©ÈµÁ…ÍÍÑ…œˆû¶×ªÎğğ½ÍÁ…¸øœèœô‘í‰…‘•ôğ½ÍÁ…¸ø‘íÁ±…ÑQáÑôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÑ¥µ”‘í‘MÑ½ÀøÀü¡‘MÑ½ÀğôÈüœ©Èµ±…Ñ”µäœé‘MÑ½ÀğôÄÀüœ©Èµ±…Ñ”µ¼œèœ©Èµ±…Ñ”µÈœ¤èœôˆø‘íÑ¥µ•QáÑôğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤ì(€½¹ÍĞ‘•ÁPõÍÑ½ÁÍlÁt¹‘•ÁññÍÑ½ÁÍlÁt¹…ÉÈ°…ÉÉPõ±…ÍÑ%Ñ•´¹…ÉÉññ±…ÍÑ%Ñ•´¹‘•Àì(€€¼¼ƒ²Š²Â¤ƒ®>²Â¤ƒ²²^Àƒ²b#²‚T£²Š²Â§²^´ƒ².s²‚@ƒ²²^À¤¸ƒ®
£²v ƒ²^´ƒ².sªÂ²v ƒ¶²z®vó²vã²^C²pƒ®æ£ªÂƒ¶7²*“¶*ã®†pƒ¶Fs².p¸(€½¹ÍĞÑ•Éµô¡}Í¥µ•±…å=¸˜™Á¡…Í”„ôô‰•™½É”œ¤ı}Í¥µ•±…åÑMÑ½À¡Ğ°ÍÑ½ÁÌ¹±•¹Ñ ´Ä¤èÀì(€±•Ğ…ÉÉ‘¨ôœœì(€¥˜¡}Í¥µ•±…å=¸¥ì(€€€¥˜¡Ñ•ÉµøÀ¤…ÉÉ‘¨õ€€ñÍÁ…¸±…ÍÌô‰©Èµ•Ñ„µ…‘¨ˆø‘í…‘‘5¥¹Q½±½¬¡…ÉÉP±Ñ•Éµ¥ôƒ®>²Â¤ƒ²b#²‚T€ ¬‘íÑ•Éµô¤ğ½ÍÁ…¸ù€ì(€€€•±Í”¥˜¡Á¡…Í”ôôô‰•™½É”œ˜™™¥¹…±øÀ¤…ÉÉ‘¨õ€€ñÍÁ…¸±…ÍÌô‰©Èµ•Ñ„µ…‘¨ˆø‘í™¥¹…±÷®Úƒ²²^Àƒ²b#²ğ½ÍÁ…¸ù€ì(€ô(€½¹ÍĞ}‘±å1½œô¡}Í¥µ•±…å=¸˜™‘±äøÀ˜™Á¡…Í”„ôô‰•™½É”œ˜™ÑåÁ•½˜}Í¥µÙ•¹Ñ1½œôôô™Õ¹Ñ¥½¸œ¤ı}Í¥µÙ•¹Ñ1½œ¡Ğ¤émtì(€½¹ÍĞ}İàô¡}Í¥µ•±…å=¸˜™ÑåÁ•½˜}Í¥µ…å½¹Ñ•áĞôôô™Õ¹Ñ¥½¸œ¤ı}Í¥µ…å½¹Ñ•áĞ ¤¹İ•…Ñ¡•ÈèŸ®G²v0œì(€½¹ÍĞ}É•Àô¡}Í¥µ•±…å=¸˜™‘±äøÀ˜™Á¡…Í”„ôô‰•™½É”œ˜™ÑåÁ•½˜}Í¥µ•±…åI•Á½ÉĞôôô™Õ¹Ñ¥½¸œ¤ı}Í¥µ•±…åI•Á½ÉĞ¡Ğ¤é¹Õ±°ì(€½¹ÍĞ}É•Á!Q50õ}É•Àı€ñ‘¥Ø±…ÍÌô‰©Èµ±½œµÉ•Á½ÉĞˆø(€€€€€€€€‘í}É•À¹™¥ÉÍĞı€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©ÈµÉ¬ˆû²Ös²Ò ƒ²nC²vàğ½ÍÁ…¸ø‘í}½ÁÍÍŒ¡}É•À¹™¥ÉÍĞ¥ô‘í}İà„ôôŸ®G²v0œı€ƒ
Ü€ñÍÁ…¸±…ÍÌô‰©Èµİàˆø‘í}½ÁÍÍŒ¡}İà¥ôğ½ÍÁ…¸ù€èœôğ½‘¥Øù€èœô(€€€€€€€€‘í}É•À¹ÍÁÉ•…¹±•¹Ñ ı€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©ÈµÉ¬ˆû²‚¶20ƒ²nC²vàğ½ÍÁ…¸ø‘í}½ÁÍÍŒ¡}É•À¹ÍÁÉ•…¹©½¥¸ œƒ
Ü€œ¤¥ôğ½‘¥Øù€èœô(€€€€€€€€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©ÈµÉ¬ˆû¶j3®ÎÔƒ²jÓ²‚ğ½ÍÁ…¸ø‘í}É•À¹É•½Ù•É•øÀıƒ¶b²z³ªæ3² ƒ²Òt€‘í}É•À¹É•½Ù•É•‘÷®Úƒ¶j3®ÎÕ€è‹¶j3®ÎÔƒ²^²v0‰ôğ½‘¥Øø(€€€€€€€€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©ÈµÉ¬ˆû²Š²Â¤ƒ²²^Àğ½ÍÁ…¸ø‘í}É•À¹™¥¹…°øÀıƒ²Vô€‘í}É•À¹™¥¹…±÷®Úƒ²b#²€èŸ²‚W².pƒ®>²Â¤ƒ²b#²ôğ½‘¥Øø(€€€€€€€€‘í}É•À¹…™™•ÑÌı€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰©ÈµÉ¬ˆû²b¶Z”ƒ²^Ó²Â ğ½ÍÁ…¸û®.“²v0ƒ¶j3²Â €‘í}½ÁÍÍŒ¡}É•À¹…™™•ÑÌ¥ôƒ²^Ó²Â ƒ²²^Àƒ²jÃ®‚ğ½‘¥Øù€èœô(€€€€€€ğ½‘¥Øù€èœœì(€½¹ÍĞ‘•±…å	…‘”ô¡}Í¥µ•±…å=¸˜™‘±äøÀ˜™Á¡…Í”ôôôÉÕ¹¹¥¹œœ¤(€€€€ı€ñ‘¥Ø±…ÍÌô‰©Èµ‘•±…äµ±¥Ù”ˆûÂ~RĞƒ¶b²z°ƒ²Vô€ñˆø‘í‘±å÷®Úğ½ˆøƒ²²^Àƒ²jÓ¶Z$ƒ²’Dğ½‘¥Øù€(€€€€€€¬ ¡}‘±å1½œ¹±•¹Ñ¡ññ}É•Á!Q50¤ı€ñ‘•Ñ…¥±Ì±…ÍÌô‰©Èµ±½œˆøñÍÕµµ…Éäû²²^ÀƒªâÃ®†tƒ®ÎÓªâÀğ½ÍÕµµ…Éäøñ‘¥Ø±…ÍÌô‰©Èµ±½œµ‰½‘äˆù€(€€€€€€€€­}É•Á!Q50(€€€€€€€€¬¡}‘±å1½œ¹±•¹Ñ ı€ñ‘¥Ø±…ÍÌô‰©Èµ±½œµÍ•ŒˆûªÖ³ªÂ®ÎƒªâÃ®†tğ½‘¥Øù€­}‘±å1½œ¹Í±¥” À°ÄØ¤¹µ…À¡°ôù€ñ‘¥Øø‘í}½ÁÍÍŒ¡°¥ôğ½‘¥Øù€¤¹©½¥¸ œœ¤èœœ¤(€€€€€€€€­€ğ½‘¥Øøğ½‘•Ñ…¥±Ìù€èœœ¤(€€€€€€­€ñ‘¥Ø±…ÍÌô‰©Èµ‘•±…äµ…Ù•…Ğˆû²²^Àƒ²‚W®ÎÓ®*Pƒ².“²‚pƒ²jÓ¶Z$ƒ²¶f§ªÎğƒ²Â£²vÓªÂ ƒ²z#²vƒ²"`ƒ²z#²*×®.#®.ğ½‘¥Øù€èœœì(€½¹ÍĞ}©É!Q50õ€(€€€€ñ‘¥Ø±…ÍÌô‰©Èµ¡•…‘•ÈˆÍÑå±”ôˆ´µŒè‘íôˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰©Èµ µÑ½Àˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰©ÈµÉ…‘”ˆÍÑå±”ô‰‰…­É½Õ¹è‘íôˆø‘í}½ÁÍÍŒ¡°¥ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰©Èµ¹¼ˆø‘í}½ÁÍÍŒ¡Ğ¹¹¼¥ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰©Èµ‘•ÍĞˆø‘í}½ÁÍÍŒ¡Ğ¹‘•ÍĞ¥÷¶Z$ğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÉ½ÕÑ”ˆø‘í}½ÁÍÍŒ¡ÍÑ½ÁÍlÁt¹Ì¥ô€‘í‘•ÁQôƒŠH€‘í}½ÁÍÍŒ¡±…ÍÑ%Ñ•´¹Ì¥ô€‘í…ÉÉQô‘í…ÉÉ‘©ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÍÑ…ÑÕÌ©È´‘íÁ¡…Í•ô‘ì¡}Í¥µ•±…å=¸˜™‘±äøÀ˜™Á¡…Í”ôôôÉÕ¹¹¥¹œœ¤üœ©Èµ‘•±…å•œèœôˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÍÑ…ÑÕÌµ¡•…ˆø‘í¡•…‘ôğ½‘¥Øø(€€€€€€€€‘íÍÕˆı€ñ‘¥Ø±…ÍÌô‰©ÈµÍÑ…ÑÕÌµÍÕˆˆø‘íÍÕ‰ôğ½‘¥Øù€èœô(€€€€€€€€‘í‘•±…å	…‘•ô(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÁÉ½É•ÍÌˆøñ‘¥Ø±…ÍÌô‰©ÈµÁÉ½É•ÍÌµ™¥±°ˆÍÑå±”ô‰İ¥‘Ñ è‘íÁÉ½ô”í‰…­É½Õ¹è‘íôˆøğ½‘¥Øøğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€‘íÁ¡…Í”ôôô‰•™½É”œı€ñ‘¥Ø±…ÍÌô‰©ÈµÁ…ÍÍ•¹•Èµ¥¹Í¥¡ÑÌˆø‘í}É•¹‘•É)½ÕÉ¹•å½É•…ÍĞ¡Ğ±}™½É•…ÍÑ=Á•¸¥ôğ½‘¥Øù€èœô(€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÍÉ½±°ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰©ÈµÑ¥µ•±¥¹”ˆø‘í±¥ôğ½‘¥Øø(€€€€€€ñÀ±…ÍÌô‰©Èµ™½½Ğˆû®“®Úƒ²zC®>dƒªÂÇ².€ƒ
Üƒ².“²‚pƒªÊ3²zƒ®
Ğƒ².sªÂƒªâÃ²’ ğ½Àø(€€€€ğ½‘¥Øù€ì(€¥˜¡‰½‘ä¹}±…ÍÑ)É!Q50ôôõ}©É!Q50¤É•ÑÕÉ¸ì€€€¼¼ƒ®
Ó²j¤ƒ®>g²vó¶Vc®¦Ğƒ²z³®‚3®6Pƒ²w®zÔ£ªæs®æ‡²zƒ®Â§² ¤(€‰½‘ä¹}±…ÍÑ)É!Q50õ}©É!Q50ì(€‰½‘ä¹¥¹¹•É!Q50õ}©É!Q50ì(€½¹ÍĞÍŒõ‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÉ½±°œ¤ì(€¥˜¡ÍŒ¥ì(€€€¥˜¡}™¥ÉÍÑI•¹‘•È¥ì(€€€€€€¼¼ƒ²Ös²Ò €Ç¶j3®0ƒ¶b²z°ƒ²r²æc®†pƒ²zC®>dƒ²*“¶³®†(€€€€€½¹ÍĞÕÈõ‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÑ½À¹ÕÈœ¥ññ‰½‘ä¹ÅÕ•ÉåM•±•Ñ½È œ¹©ÈµÍÑ½À¹¹•áĞœ¤ì(€€€€€¥˜¡ÕÈ¥ÍŒ¹ÍÉ½±±Q½Àõ5…Ñ ¹µ…à À±ÕÈ¹½™™Í•ÑQ½ÀµÍŒ¹±¥•¹Ñ!•¥¡Ğ¼È­ÕÈ¹½™™Í•Ñ!•¥¡Ğ¼È¤ì(€€€€€‰½‘ä¹}ÍÉ½±±•‘=¹”õÑÉÕ”ì(€€€ô•±Í”ì(€€€€€€¼¼ƒ²zC®>dƒªÂÇ².€ƒ².s²^C®*Pƒ²
³²j§²zCªÂ ƒ®ÎÓ®6`ƒ²*“¶³®†ƒ²r²æc®–ğƒªŞã®2®†pƒ²rƒ² (€€€€€ÍŒ¹ÍÉ½±±Q½Àõ}ÁÉ•ÙQ½Àì(€€€ô(€ô)ô((¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(¼¼ƒÂ~Ìƒ®
Ğƒ²^³¶Z$ƒŠP;²vó²Â ƒ²vó²‚W²vƒ®²Û²ZĞƒ²vóªÒƒ²b#®(¼¼ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@)½¹ÍĞQI%A}-dô¹¥µ‰¥}ÑÉ¥ÁÌœì)™Õ¹Ñ¥½¸}Ñ•ÍŒ¡Ì¥íÉ•ÑÕÉ¸MÑÉ¥¹œ¡Ìôõ¹Õ±°üœœéÌ¤¹É•Á±…” ½l˜ğø‰t½œ±Œôø¡ìœ˜œèœ™…µÀìœ°œğœèœ™±Ğìœ°œøœèœ™Ğìœ°œˆœèœ™ÅÕ½Ğìõmt¤¤íô)™Õ¹Ñ¥½¸}ÑÉ¥ÁQ½…ÍĞ¡µÍœ¥ì(€½¹ÍĞ½±õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÑ½…ÍĞœ¤ì¥˜¡½±¥½±¹É•µ½Ù” ¤ì(€½¹ÍĞõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì¹¥ôÑÉ¥ÀµÑ½…ÍĞœì(€¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í±•™ĞèÔÀ”í‰½ÑÑ½´èÌáÁàíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ•` ´ÔÀ”¤íèµ¥¹‘•àèÄÀÀÔÀí‰…­É½Õ¹éÙ…È ´µ…•¹ĞÈ°ŒÉ˜àÅ˜Ü¤í½±½Èè™™˜íÁ…‘‘¥¹œèÄÅÁà€ÄáÁàí‰½É‘•ÈµÉ…‘¥ÕÌèääåÁàí™½¹ĞµÍ¥é”èÄÍÁàí™½¹Ğµİ•¥¡ĞèØÀÀí‰½àµÍ¡…‘½ÜèÀ€ÙÁà€ÈÁÁàÉ‰„ À°À°À°¸ÌÔ¤íµ…àµİ¥‘Ñ èàáÙÜíÑ•áĞµ…±¥¸é•¹Ñ•Èœì(€¹Ñ•áÑ½¹Ñ•¹ĞõµÍœì‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡¤ì(€Í•ÑQ¥µ•½ÕĞ  ¤ôùí¹ÍÑå±”¹ÑÉ…¹Í¥Ñ¥½¸ô½Á…¥Ñä€¸ÑÌœí¹ÍÑå±”¹½Á…¥ÑäôœÀœíÍ•ÑQ¥µ•½ÕĞ  ¤ôù¹É•µ½Ù” ¤°ĞÀÀ¤íô°ÄäÀÀ¤ì)ô(¼¼ƒŠRŠR ƒ®
ƒ²p¿²vó²Â ƒ¶^³¶6ğƒŠRŠR )™Õ¹Ñ¥½¸}…‘‘…åÌ¡‘…Ñ•MÑÈ±¸¥í½¹ÍĞõ¹•Ü…Ñ” ¡‘…Ñ•MÑÉññÑ½‘…å1½…±MÑÈ ¤¤¬PÀÀèÀÀœ¤í¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤­¸¤íÉ•ÑÕÉ¸€‘í¹•ÑÕ±±e•…È ¥ô´‘íMÑÉ¥¹œ¡¹•Ñ5½¹Ñ  ¤¬Ä¤¹Á…‘MÑ…ÉĞ È°œÀœ¥ô´‘íMÑÉ¥¹œ¡¹•Ñ…Ñ” ¤¤¹Á…‘MÑ…ÉĞ È°œÀœ¥õ€íô)™Õ¹Ñ¥½¸}‘…åÍ	•Ñİ••¸¡„±ˆ¥íÉ•ÑÕÉ¸5…Ñ ¹É½Õ¹ ¡¹•Ü…Ñ”¡ˆ¬PÀÀèÀÀœ¤µ¹•Ü…Ñ”¡„¬PÀÀèÀÀœ¤¤¼àØĞÀÀÀÀÀ¤íô)™Õ¹Ñ¥½¸}‘…å…Ñ”¡ÑÉ¥À±‘…ä¥íÉ•ÑÕÉ¸}…‘‘…åÌ¡ÑÉ¥À¹ÍÑ…ÉÑ…Ñ”±‘…ä´Ä¤íô)™Õ¹Ñ¥½¸}µ¥É…Ñ•QÉ¥À¡ÑÀ¥ì(€¥˜ …ÑÁññÑåÁ•½˜ÑÀ„ôô½‰©•Ğœ¥É•ÑÕÉ¸ÑÀì(€¥˜ …ÉÉ…ä¹¥ÍÉÉ…ä¡ÑÀ¹±•Ì¤¥ÑÀ¹±•Ìõmtì(€¥˜¡ÑÀ¹ÍÑ…ÉÑ…Ñ”˜™ÑÀ¹‘…åÌ¥ì(€€€ÑÀ¹‘…åÌõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±ÑÀ¹‘…åÍğÀ¤¤ì(€€€ÑÀ¹±•Ì¹™½É… ¡°ôùì¥˜ …°¹‘…ä¥°¹‘…äõ°¹‘…Ñ”ı5…Ñ ¹µ…à Ä±}‘…åÍ	•Ñİ••¸¡ÑÀ¹ÍÑ…ÉÑ…Ñ”±°¹‘…Ñ”¤¬Ä¤èÄì¥˜¡°¹‘…äùÑÀ¹‘…åÌ¥°¹‘…äõÑÀ¹‘…åÌì¥˜¡°¹‘…äğÄ¥°¹‘…äôÄìô¤ì(€€€É•ÑÕÉ¸ÑÀì(€ô(€½¹ÍĞ‘ÌõÑÀ¹±•Ì¹µ…À¡°ôù°¹‘…Ñ”¤¹™¥±Ñ•È¡	½½±•…¸¤¹Í½ÉĞ ¤ì(€½¹ÍĞÍÑ…ÉĞõ‘ÍlÁuññÑ½‘…å1½…±MÑÈ ¤°•¹õ‘Ím‘Ì¹±•¹Ñ ´ÅuññÍÑ…ÉĞì(€ÑÀ¹ÍÑ…ÉÑ…Ñ”õÍÑ…ÉĞìÑÀ¹‘…åÌõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±}‘…åÍ	•Ñİ••¸¡ÍÑ…ÉĞ±•¹¤¬Ä¤¤ì(€ÑÀ¹±•Ì¹™½É… ¡°ôùì°¹‘…äõ°¹‘…Ñ”ı5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸¡ÑÀ¹‘…åÌ±}‘…åÍ	•Ñİ••¸¡ÍÑ…ÉĞ±°¹‘…Ñ”¤¬Ä¤¤èÄìô¤ì(€É•ÑÕÉ¸ÑÀì)ô)™Õ¹Ñ¥½¸±½…‘QÉ¥ÁÌ ¥íÑÉåíÉ•ÑÕÉ¸€¡)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´¡QI%A}-d¤¥ññmt¤¹µ…À¡}µ¥É…Ñ•QÉ¥À¤íõ…Ñ ¡”¥íÉ•ÑÕÉ¹mtíõô)™Õ¹Ñ¥½¸Í…Ù•QÉ¥ÁÌ¡Ğ¥íÑÉåí±½…±MÑ½É…”¹Í•Ñ%Ñ•´¡QI%A}-d±)M=8¹ÍÑÉ¥¹¥™ä¡Ğ¤¤íõ…Ñ ¡”¥íõô)™Õ¹Ñ¥½¸•¹QÉ¥Á% ¥íÉ•ÑÕÉ¸€QHœ­…Ñ”¹¹½Ü ¤¹Ñ½MÑÉ¥¹œ ÌØ¤­5…Ñ ¹É…¹‘½´ ¤¹Ñ½MÑÉ¥¹œ ÌØ¤¹Í±¥” È°Ô¤íô((¼¼ƒŠRŠR ƒ®6Ã²vÓ¶Àƒ²†Ã²zDƒŠRŠR )™Õ¹Ñ¥½¸É•…Ñ•QÉ¥À¡¹…µ”±ÍÑ…ÉÑ…Ñ”±‘…åÌ¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì(€½¹ÍĞÑÉ¥Àõí¥é•¹QÉ¥Á% ¤±¹…µ”è¡¹…µ•ñğŸ®
Ğƒ²^³¶Z$œ¤¹ÑÉ¥´ ¥ñğŸ®
Ğƒ²^³¶Z$œ±É•…Ñ•‘Ğé…Ñ”¹¹½Ü ¤±ÍÑ…ÉÑ…Ñ”éÍÑ…ÉÑ…Ñ•ññÑ½‘…å1½…±MÑÈ ¤±‘…åÌé5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±‘…åÍñğÄ¤¤±±•Ìémuôì(€ÑÉ¥ÁÌ¹ÁÕÍ ¡ÑÉ¥À¤ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ìÉ•ÑÕÉ¸ÑÉ¥À¹¥ì)ô)™Õ¹Ñ¥½¸‘•±•Ñ•QÉ¥À¡¥¥ì(€¥˜ …½¹™¥É´ Ÿ²vĞƒ²^³¶Z'²vƒ²
·²‚s¶Vc².sªÊƒ²*×®.#ªæ0ıq¸£®.ÓªâĞƒ²vó²‚W®0ƒ²
·²‚s®Bc®¦À°ƒ²vÓ®¾àƒ²b#®“¶Vpƒ²*ç²Â£ªÚ3²v ƒ²rƒ²®B§®.#®.¸¤œ¤¥É•ÑÕÉ¸ì(€Í…Ù•QÉ¥ÁÌ¡±½…‘QÉ¥ÁÌ ¤¹™¥±Ñ•È¡ĞôùĞ¹¥„ôõ¥¤¤ì(€¥˜¡İ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%ôôõ¥¥İ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%õ¹Õ±°ì(€É•¹‘•É5åQÉ¥ÁÌ ¤ì)ô)™Õ¹Ñ¥½¸}Íå¹1•…Ñ•Ì¡ÑÉ¥À¥íÑÉ¥À¹±•Ì¹™½É… ¡°ôùí¥˜¡°¹‘…äùÑÉ¥À¹‘…åÌ¥°¹‘…äõÑÉ¥À¹‘…åÌí¥˜¡°¹‘…äğÄ¥°¹‘…äôÄí°¹‘…Ñ”õ}‘…å…Ñ”¡ÑÉ¥À±°¹‘…ä¤íô¤íô)™Õ¹Ñ¥½¸ÕÁ‘…Ñ•QÉ¥À¡¥±¹…µ”±ÍÑ…ÉÑ…Ñ”±‘…åÌ¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõ¥¤ì¥˜ …ÑÀ¥É•ÑÕÉ¸ì(€ÑÀ¹¹…µ”ô¡¹…µ•ññÑÀ¹¹…µ”¤¹ÑÉ¥´ ¥ññÑÀ¹¹…µ”ì(€ÑÀ¹ÍÑ…ÉÑ…Ñ”õÍÑ…ÉÑ…Ñ•ññÑÀ¹ÍÑ…ÉÑ…Ñ”ì(€ÑÀ¹‘…åÌõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±‘…åÍññÑÀ¹‘…åÌ¤¤ì(€}Íå¹1•…Ñ•Ì¡ÑÀ¤ì(€Í…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì)ô)™Õ¹Ñ¥½¸…‘‘1•Q½QÉ¥À¡ÑÉ¥Á%±±•œ¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÀ¥É•ÑÕÉ¸™…±Í”ì(€ÑÀ¹±•Ì¹ÁÕÍ ¡±•œ¤ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ìÉ•ÑÕÉ¸ÑÉÕ”ì)ô)™Õ¹Ñ¥½¸É•µ½Ù•QÉ¥Á1•œ¡ÑÉ¥Á%±±•%¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÀ¥É•ÑÕÉ¸ì(€ÑÀ¹±•ÌõÑÀ¹±•Ì¹™¥±Ñ•È¡°ôù°¹¥„ôõ±•%¤ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì)ô)™Õ¹Ñ¥½¸}‘…å1•Ì¡ÑÉ¥À±‘…ä¥íÉ•ÑÕÉ¸ÑÉ¥À¹±•Ì¹™¥±Ñ•È¡°ôù°¹‘…äôôõ‘…ä¤¹Í½ÉĞ ¡„±ˆ¤ôø¡Ñ½5¥¸¡„¹‘•ÁQ¥µ”¥ñğÀ¤´¡Ñ½5¥¸¡ˆ¹‘•ÁQ¥µ”¥ñğÀ¤¤íô)™Õ¹Ñ¥½¸}ÑÉ¥Á9¥¡ÑÍ1…‰•°¡ÑÉ¥À¥í½¹ÍĞõÑÉ¥À¹‘…åÍñğÄíÉ•ÑÕÉ¸ğôÄüŸ®.ç²vğœé€‘í´Å÷®ÂT€‘í‘÷²vñ€íô)™Õ¹Ñ¥½¸}ÑÉ¥Á±Í1…‰•°¡Œ¥íÉ•ÑÕÉ¸Œôôôµ¥á•œüŸ²z²w¾ò/²Š3²tœè¡MQ}1MMMmtü¹±…‰•±ññŒ¤íô)™Õ¹Ñ¥½¸}±•…É”¡±•œ¥ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡±•œ¹ÑÉ…¥¹9¼¤ì¥˜ …Ğ¥É•ÑÕÉ¸€Àì(€€¼¼ƒªÊÃ¶V§ªÚ0£²z²t¯²Š3²t§²ró®†pƒ²b#®“®Bpƒ²vó²‚W²v ƒ².“²‚pƒ²*ç²Â£ªÚ0ƒ²jÓ²z²vƒ²
³²j¤(€¥˜¡±•œ¹Í•…Ñ±…ÍÌôôôµ¥á•œ¥ì(€€€¥˜¡±•œ¹Ñ¥­•Ñ%¥í½¹ÍĞÑ¬õ±½…‘Q¥­•ÑÌ ¤¹™¥¹¡àôùà¹¥ôôõ±•œ¹Ñ¥­•Ñ%˜™à¹ÍÑ…ÑÕÌôôô…Ñ¥Ù”œ¤í¥˜¡Ñ¬¥É•ÑÕÉ¸Ñ¬¹Ñ½Ñ…±…É”íô(€€€É•ÑÕÉ¸…±…É”¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸°•¹•É…°œ¤¨¡±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÄ¤ì(€ô(€½¹ÍĞ‰…Í”õ…±…É”¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±±•œ¹Í•…Ñ±…ÍÌ¤ì(€É•ÑÕÉ¸…ÁÁ±å¥Í½Õ¹Ğ¡‰…Í”±±•œ¹‘¥Í½Õ¹Ññğ¹½¹”œ¤¨¡±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÄ¤ì)ô)™Õ¹Ñ¥½¸}ÑÉ¥ÁÍÑ…É”¡ÑÉ¥À¥íÉ•ÑÕÉ¸ÑÉ¥À¹±•Ì¹É•‘Õ” ¡„±°¤ôù„­}±•…É”¡°¤°À¤íô)™Õ¹Ñ¥½¸}±•	½½­•¡±•œ¥ì(€¥˜ …±•œ¹Ñ¥­•Ñ%¥É•ÑÕÉ¸™…±Í”ì(€½¹ÍĞÑ¬õ±½…‘Q¥­•ÑÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõ±•œ¹Ñ¥­•Ñ%¤ì(€É•ÑÕÉ¸€„„¡Ñ¬˜™Ñ¬¹ÍÑ…ÑÕÌôôô…Ñ¥Ù”œ¤ì)ô((¼¼ƒŠRŠR ƒ²vóªÒƒ²b#®€£¶.Ã²òLƒ®†s®Np¿²‚²z”€Ç¶j0ƒ®ÂÃ²æ`°ƒ®Ú²"c¶j£ªÎó®*Pƒ®‚3®6Pƒ¶n®†pƒ²vÓ²^À¤ƒŠRŠR )™Õ¹Ñ¥½¸}‰½½­=¹•1•%¹Ñ¼¡±•œ°ÑÉ¥Á9…µ”°Ñ¥­•ÑÌ¥ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡±•œ¹ÑÉ…¥¹9¼¤ì(€¥˜ …Ğ¥É•ÑÕÉ¸í½¬é™…±Í”±•ÉÈèŸ²^Ó²Â ƒ²‚W®ÎĞƒ²^²v0ôì(€½¹ÍĞ‘…Ñ”õ±•œ¹‘…Ñ”°½Õ¹Ğõ±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÄì(€½¹ÍĞ‘¥ÍŒõ±•œ¹‘¥Í½Õ¹Ññğ¹½¹”œì(€±•Ğ±Ìõ±•œ¹Í•…Ñ±…ÍÌ°Í•…Ñ¡…¹•õ¹Õ±°°µ¥áM•µ•¹ÑÌõ¹Õ±°ì(€¥˜¡ÑåÁ•½˜…¹	½½­=ôôô™Õ¹Ñ¥½¸œ˜˜……¹	½½­=¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±½Õ¹Ğ±‘…Ñ”±±Ì¤¥ì(€€€€¼¼ƒ²“²‚Tèƒ®“²ƒ².pƒ²b#®ƒªÂ®*—¶Vpƒ®.“®–àƒ²Š3²tƒ®NÇªâ'²ró®†pƒ²zC®>dƒ®2²ÊĞ(€€€€¼¼ƒ²jÃ²ƒ²"s²rèƒ²‚ƒªÖ³ªÂƒ®.“®–àƒ²Š3²tƒ®NÇªâ$€øƒ²z²t¯²Š3²tƒªÊÃ¶V§ªÚ0£®Ú®Úƒ²Š3²t¤€øƒ²‚ƒªÖ³ªÂƒ²z²t(€€€½¹ÍĞ…ÕÑ½=¸õÑåÁ•½˜ÑÉ¥ÁÕÑ½M•…Ñ¹…‰±•ôôô™Õ¹Ñ¥½¸œ˜™ÑÉ¥ÁÕÑ½M•…Ñ¹…‰±• ¤ì(€€€½¹ÍĞÍ½±‘=ÕĞô ¤ôùí½¹ÍĞ±•™ĞõÑåÁ•½˜•ÑÙ…¥±…‰±•M•…ÑÌôôô™Õ¹Ñ¥½¸œı•ÑÙ…¥±…‰±•M•…ÑÌ¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±‘…Ñ”±±Ì¤èÀíÉ•ÑÕÉ¸í½¬é™…±Í”±•ÉÈé±•™ĞøÀı€‘í±•™Ñ÷²w®0ƒ®
£²v1€èŸ®“²ôíôì(€€€¥˜ ……ÕÑ½=¸¥É•ÑÕÉ¸Í½±‘=ÕĞ ¤ì(€€€€¼¼€Ä¤ƒ²‚ƒªÖ³ªÂƒ²Â§²tƒªÂ®*—¶Vpƒ®.“®–àƒ²Š3²tƒ®NÇªâ$€£²z²tƒ²‚s²fà¤(€€€±•Ğ…±Ğõ¹Õ±°ì(€€€™½È¡½¹ÍĞŒ½˜…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡Ğ¹É…‘”¤¥ì¥˜¡Œôôõ±ÍññŒôôôÍÑ…¹‘¥¹œœ¥½¹Ñ¥¹Õ”ì¥˜¡…¹	½½­=¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±½Õ¹Ğ±‘…Ñ”±Œ¤¥ì…±ĞõŒì‰É•…¬ìôô(€€€¥˜¡…±Ğ¥ìÍ•…Ñ¡…¹•õí™É½´é±Ì±Ñ¼é…±Ñôì±Ìõ…±Ğìô(€€€•±Í”¥˜¡±Ì„ôôÍÑ…¹‘¥¹œœ˜™ÑåÁ•½˜½µÁÕÑ•5¥á•‘M•µ•¹ÑÌôôô™Õ¹Ñ¥½¸œ˜™½µÁÕÑ•5¥á•‘M•µ•¹ÑÌ¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±‘…Ñ”±½Õ¹Ğ±±Ì¤¥ì(€€€€€€¼¼€È¤ƒ²z²t¯²Š3²tƒªÊÃ¶V§ªÚ0€£²Š3²tƒªÖ³ªÂ²v ƒ²V'ªÎ€°ƒ®“²ƒªÖ³ªÂ®0ƒ²z²t¤(€€€€€µ¥áM•µ•¹ÑÌõ½µÁÕÑ•5¥á•‘M•µ•¹ÑÌ¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±‘…Ñ”±½Õ¹Ğ±±Ì¤ì(€€€€€Í•…Ñ¡…¹•õí™É½´é±Ì±Ñ¼èµ¥á•œ±µ¥á•éÑÉÕ•ôì(€€€ô(€€€•±Í”¥˜¡±Ì„ôôÍÑ…¹‘¥¹œœ˜™…¹	½½­=¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±½Õ¹Ğ±‘…Ñ”°ÍÑ…¹‘¥¹œœ¤¥ì(€€€€€€¼¼€Ì¤ƒ²‚ƒªÖ³ªÂƒ²z²t(€€€€€Í•…Ñ¡…¹•õí™É½´é±Ì±Ñ¼èÍÑ…¹‘¥¹œôì±ÌôÍÑ…¹‘¥¹œœì(€€€ô(€€€•±Í”É•ÑÕÉ¸Í½±‘=ÕĞ ¤ì(€ô(€¥˜¡‘…Ñ”ôôõÑ½‘…å1½…±MÑÈ ¤¥ì(€€€½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤°¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤°‘•Á4õÑ½5¥¸¡±•œ¹‘•ÁQ¥µ”¤ì(€€€¥˜¡‘•Á4„ôõ¹Õ±°˜™‘•Á4ñ¹½İ4¥É•ÑÕÉ¸í½¬é™…±Í”±•ÉÈèŸ²vÓ®¾àƒ²Ús®Âpôì(€ô(€½¹ÍĞ¹õÑ½5¥¸¡±•œ¹‘•ÁQ¥µ”¤°¹„õÑ½5¥¸¡±•œ¹…ÉÉQ¥µ”¤ì(€¥˜¡¹„ôõ¹Õ±°˜™¹„„ôõ¹Õ±°¥ì(€€€½¹ÍĞ…Lõ¹±…õ¹„øõ¹ı¹„é¹„¬ÄĞĞÀì(€€€½¹ÍĞ½¹™±¥ĞõÑ¥­•ÑÌ¹™¥¹¡Ñ¬ôùì¥˜¡Ñ¬¹ÍÑ…ÑÕÌ„ôô…Ñ¥Ù”ññÑ¬¹ÑÉ…Ù•±…Ñ”„ôõ‘…Ñ”¥É•ÑÕÉ¸™…±Í”ì½¹ÍĞ•õÑ½5¥¸¡Ñ¬¹‘•ÁQ¥µ”¤±•„õÑ½5¥¸¡Ñ¬¹…ÉÉQ¥µ”¤í¥˜¡•ôôõ¹Õ±±ññ•„ôôõ¹Õ±°¥É•ÑÕÉ¸™…±Í”ì½¹ÍĞ‰Lõ•±‰õ•„øõ•ı•„é•¬ÄĞĞÀìÉ•ÑÕÉ¸…Lñ‰˜™‰Lñ…ìô¤ì(€€€¥˜¡½¹™±¥Ğ¥É•ÑÕÉ¸í½¬é™…±Í”±•ÉÈéƒ².sªÂƒªÊç²æ  ‘í½¹™±¥Ğ¹ÑÉ…¥¹9½ô¥ôì(€ô(€€¼¼ƒªÊÃ¶V§ªÚ0£²z²t¯²Š3²t¤ƒ²*ç²Â£ªÚ0(€¥˜¡µ¥áM•µ•¹ÑÌ¥ì(€€€½¹ÍĞÍ•µ•¹ÑÌõµ¥áM•µ•¹ÑÌ¹µ…À¡Èôùì(€€€€€½¹ÍĞÍ•…ÑÌõÉÉ…ä¹™É½´¡í±•¹Ñ é½Õ¹Ñô° ¤ôùÈ¹­¥¹ôôôÍÑ…¹‘¥¹œœüŸ²z²tœéÉ…¹‘½µM•…Ğ¡È¹Í•…Ñ±…ÍÌ±±•œ¹ÑÉ…¥¹9¼¤¤ì(€€€€€½¹ÍĞˆõÈ¹‰…Í•…É•A•ÉA•ÉÍ½¸±˜õ…ÁÁ±å¥Í½Õ¹Ğ¡ˆ±‘¥ÍŒ¤ì(€€€€€É•ÑÕÉ¸ì¸¸¹È±Í•…ÑÌ±‰…Í•…É•A•ÉA•ÉÍ½¸éˆ±™…É•A•ÉA•ÉÍ½¸é™ôì(€€€ô¤ì(€€€½¹ÍĞ™…É•A•ÉA•ÉÍ½¸õÍ•µ•¹ÑÌ¹É•‘Õ” ¡„±Ì¤ôù„­Ì¹™…É•A•ÉA•ÉÍ½¸°À¤ì(€€€½¹ÍĞ‰…Í•…É•A•ÉA•ÉÍ½¸õÍ•µ•¹ÑÌ¹É•‘Õ” ¡„±Ì¤ôù„­Ì¹‰…Í•…É•A•ÉA•ÉÍ½¸°À¤ì(€€€½¹ÍĞÑ½ÁM•…ÑÌõÉÉ…ä¹™É½´¡í±•¹Ñ é½Õ¹Ñô°¡|±¤¤ôùÍ•µ•¹ÑÌ¹µ…À¡ÌôùÌ¹Í•…ÑÍm¥t¤¹©½¥¸ œ€¼€œ¤¤ì(€€€½¹ÍĞÑ¬õì(€€€€€¥é•¹Q¥­•Ñ% ¤±ÑÉ…¥¹9¼é±•œ¹ÑÉ…¥¹9¼±É…‘”éĞ¹É…‘”±±¥¹”éĞ¹±¥¹”°(€€€€€™É½µMÑ¸é±•œ¹™É½µMÑ¸±Ñ½MÑ¸é±•œ¹Ñ½MÑ¸±‘•ÁQ¥µ”é±•œ¹‘•ÁQ¥µ”±…ÉÉQ¥µ”é±•œ¹…ÉÉQ¥µ”°(€€€€€Í•…Ñ±…ÍÌèµ¥á•œ±Í•…Ñ±…ÍÍ1…‰•°èŸ²z²w¾ò/²Š3²tœ±µ¥á•éÍ•µ•¹ÑÌ°(€€€€€Í•…ÑÌéÑ½ÁM•…ÑÌ±Á…ÍÍ•¹•É½Õ¹Ğé½Õ¹Ğ°(€€€€€™…É•A•ÉA•ÉÍ½¸±Ñ½Ñ…±…É”é™…É•A•ÉA•ÉÍ½¸©½Õ¹Ğ±‘¥Í½Õ¹Ğé‘¥ÍŒ°(€€€€€‘¥Í½Õ¹Ñ1…‰•°é%M=U9QMm‘¥Ít¹±…‰•°±‰…Í•…É•A•ÉA•ÉÍ½¸°(€€€€€‘¥ÍÑ…¹•-´é5…Ñ ¹É½Õ¹¡É½ÕÑ•¥ÍÑ…¹•-´¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸¤¤°(€€€€€‰½½­•‘Ğé…Ñ”¹¹½Ü ¤±ÑÉ…Ù•±…Ñ”é‘…Ñ”±ÍÑ…ÑÕÌè…Ñ¥Ù”œ±ÑÉ¥Á9…µ”éÑÉ¥Á9…µ•ñğœœ(€€€ôì(€€€Ñ¥­•ÑÌ¹ÁÕÍ ¡Ñ¬¤ì(€€€É•ÑÕÉ¸í½¬éÑÉÕ”±Ñ¥­•Ñ%éÑ¬¹¥±ÑÉ…¥¹9¼é±•œ¹ÑÉ…¥¹9¼±‘…Ñ”±Ğ±±•œ±‰½½­•‘±…ÍÌèµ¥á•œ±Í•…Ñ¡…¹•‘ôì(€ô(€½¹ÍĞ‰…Í”õ…±…É”¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±±Ì¤ì(€½¹ÍĞ™…É”õ…ÁÁ±å¥Í½Õ¹Ğ¡‰…Í”±‘¥ÍŒ¤ì(€½¹ÍĞÍ•…ÑÌõÉÉ…ä¹™É½´¡í±•¹Ñ é½Õ¹Ñô° ¤ôùÉ…¹‘½µM•…Ğ¡±Ì±±•œ¹ÑÉ…¥¹9¼¤¤ì(€½¹ÍĞÑ¬õì(€€€¥é•¹Q¥­•Ñ% ¤±ÑÉ…¥¹9¼é±•œ¹ÑÉ…¥¹9¼±É…‘”éĞ¹É…‘”±±¥¹”éĞ¹±¥¹”°(€€€™É½µMÑ¸é±•œ¹™É½µMÑ¸±Ñ½MÑ¸é±•œ¹Ñ½MÑ¸±‘•ÁQ¥µ”é±•œ¹‘•ÁQ¥µ”±…ÉÉQ¥µ”é±•œ¹…ÉÉQ¥µ”°(€€€Í•…Ñ±…ÍÌé±Ì±Í•…Ñ±…ÍÍ1…‰•°éMQ}1MMMm±Ít¹±…‰•°±Í•…ÑÌ±Á…ÍÍ•¹•É½Õ¹Ğé½Õ¹Ğ°(€€€™…É•A•ÉA•ÉÍ½¸é™…É”±Ñ½Ñ…±…É”é™…É”©½Õ¹Ğ±‘¥Í½Õ¹Ğé‘¥ÍŒ°(€€€‘¥Í½Õ¹Ñ1…‰•°é%M=U9QMm‘¥Ít¹±…‰•°±‰…Í•…É•A•ÉA•ÉÍ½¸é‰…Í”°(€€€‘¥ÍÑ…¹•-´é5…Ñ ¹É½Õ¹¡É½ÕÑ•¥ÍÑ…¹•-´¡Ğ±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸¤¤°(€€€‰½½­•‘Ğé…Ñ”¹¹½Ü ¤±ÑÉ…Ù•±…Ñ”é‘…Ñ”±ÍÑ…ÑÕÌè…Ñ¥Ù”œ±ÑÉ¥Á9…µ”éÑÉ¥Á9…µ•ñğœœ(€ôì(€Ñ¥­•ÑÌ¹ÁÕÍ ¡Ñ¬¤ì(€É•ÑÕÉ¸í½¬éÑÉÕ”±Ñ¥­•Ñ%éÑ¬¹¥±ÑÉ…¥¹9¼é±•œ¹ÑÉ…¥¹9¼±‘…Ñ”±Ğ±±•œ±‰½½­•‘±…ÍÌé±Ì±Í•…Ñ¡…¹•‘ôì)ô)™Õ¹Ñ¥½¸‰Õ±­	½½­QÉ¥À¡ÑÉ¥Á%¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÉ¥ÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸ì(€½¹ÍĞÑ¥­•ÑÌõ±½…‘Q¥­•ÑÌ ¤ì(€½¹ÍĞ…Ñ¥Ù•%‘Ìõ¹•ÜM•Ğ¡Ñ¥­•ÑÌ¹™¥±Ñ•È¡ĞôùĞ¹ÍÑ…ÑÕÌôôô…Ñ¥Ù”œ¤¹µ…À¡ĞôùĞ¹¥¤¤ì(€½¹ÍĞÑ½‘¼õÑÉ¥À¹±•Ì¹™¥±Ñ•È¡°ôø„¡°¹Ñ¥­•Ñ%˜™…Ñ¥Ù•%‘Ì¹¡…Ì¡°¹Ñ¥­•Ñ%¤¤¤ì(€¥˜ …Ñ½‘¼¹±•¹Ñ ¥í…±•ÉĞ Ÿ²vÓ®¾àƒ®ª£®N€ƒ²vó²‚W²vĞƒ²b#®“®Bc²ZĞƒ²z#²*×®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞÑ½Ñ…°õÑ½‘¼¹É•‘Õ” ¡„±°¤ôù„­}±•…É”¡°¤°À¤ì(€¥˜ …½¹™¥É´¡€œ‘íÑÉ¥À¹¹…µ•ôœƒ²^³¶Z'²v`ƒ®¾ã²b#®ƒ²vó²‚T€‘íÑ½‘¼¹±•¹Ñ¡÷ªÆÓ²vƒ²vóªÒƒ²b#®“¶V§®.#®.¹q»²b#²ƒªÊÃ²‚pƒªâ#²V„è€‘íÑ½Ñ…°¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²nAq¹q»ªÎ²7¶Vc².sªÊƒ²*×®.#ªæ0ı€¤¥É•ÑÕÉ¸ì(€€¼¼ƒ²¶Z'®–€ƒ²b“®Ê®‚#²vÓ®–ğƒ®¢ó²‚ ƒªŞã®š³ªÎ€°ƒ²Š3²tƒªÎ²
Ã²vĞƒ®²ÓªÆÃ²jÃ®¾®†p€ÇªÆÓ²R¤ƒ²Ê·¶°ƒ²Êc®š³¶VĞU$ƒ¶R®š³²W²vƒ®Â§² (€½¹ÍĞ½Øõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì½Ø¹¥ôÑÉ¥Àµ‰½½­¥¹œµ½Ù•É±…äœì(€½Ø¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèÄÀÀĞÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ô¤œì(€½Ø¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰‰…­É½Õ¹éÙ…È ´µ‰œÄ¤í‰½É‘•ÈèÅÁàÍ½±¥Ù…È ´µ‰½É‘•È¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàíÁ…‘‘¥¹œèÈÉÁà€ÈáÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èíµ¥¸µİ¥‘Ñ èÈÄÁÁàˆø(€€€€ñ‘¥ØÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÕÁàí™½¹Ğµİ•¥¡ĞèÜÀÀí½±½ÈéÙ…È ´µÑ•áĞÄ¤íµ…É¥¸µ‰½ÑÑ½´èÄÁÁàˆûÂ~:¬ƒ²b#®ƒ²Êc®š°ƒ²’GŠ˜ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‰½½¬µÑÉ…¬ˆøñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‰½½¬µ™¥±°ˆ¥ô‰Ñ‰¼µ™¥±°ˆÍÑå±”ô‰İ¥‘Ñ èÀ”ˆøğ½‘¥Øøğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰Ñ‰¼µÁÉ½œˆÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÈ¸ÕÁàí½±½ÈéÙ…È ´µÑ•áĞÈ¤íµ…É¥¸µÑ½ÀèáÁàˆøÀ€¼€‘íÑ½‘¼¹±•¹Ñ¡ôğ½‘¥Øøğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡½Ø¤ì(€±•Ğ¤ôÀ°½¬ôÀì½¹ÍĞ™…¥±Ìõmt°‘½¹”õmtì(€½¹ÍĞÍÑ•Àô ¤ôùì(€€€½¹ÍĞ±•œõÑ½‘½m¥tì(€€€½¹ÍĞÈõ}‰½½­=¹•1•%¹Ñ¼¡±•œ°ÑÉ¥À¹¹…µ”°Ñ¥­•ÑÌ¤ì(€€€¥˜¡È¹½¬¥ì±•œ¹Ñ¥­•Ñ%õÈ¹Ñ¥­•Ñ%ì(€€€€€¥˜¡È¹Í•…Ñ¡…¹•¥ì±•œ¹Í•…Ñ±…ÍÌõÈ¹‰½½­•‘±…ÍÌì±•œ¹Í•…Ñ±…ÍÍ1…‰•°õ}ÑÉ¥Á±Í1…‰•°¡È¹‰½½­•‘±…ÍÌ¤ìô(€€€€€½¬¬¬ì‘½¹”¹ÁÕÍ ¡È¤ìô(€€€•±Í”™…¥±Ì¹ÁÕÍ ¡ƒ
Ü€‘í±•œ¹ÑÉ…¥¹9½ô€‘í±•œ¹™É½µMÑ¹÷ŠH‘í±•œ¹Ñ½MÑ¹ô€ ‘í±•œ¹‘…å÷²vó²Â ¤è€‘íÈ¹•ÉÉõ€¤ì(€€€¤¬¬ì(€€€½¹ÍĞÁ”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ‰¼µÁÉ½œœ¤°™”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ‰¼µ™¥±°œ¤ì(€€€¥˜¡Á”¥Á”¹Ñ•áÑ½¹Ñ•¹Ğõ€‘í¥ô€¼€‘íÑ½‘¼¹±•¹Ñ¡õ€ì¥˜¡™”¥™”¹ÍÑå±”¹İ¥‘Ñ õ5…Ñ ¹É½Õ¹¡¤½Ñ½‘¼¹±•¹Ñ ¨ÄÀÀ¤¬œ”œì(€€€¥˜¡¤ñÑ½‘¼¹±•¹Ñ ¥ìÍ•ÑQ¥µ•½ÕĞ¡ÍÑ•À°À¤ìÉ•ÑÕÉ¸ìô(€€€Í…Ù•Q¥­•ÑÌ¡Ñ¥­•ÑÌ¤ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ì}±•…É5¥á5•µ¼ ¤ì€€€¼¼ƒ²‚²ÊĞ€Ç¶j0ƒ²‚²z”(€€€½Ø¹É•µ½Ù” ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì(€€€Í•ÑQ¥µ•½ÕĞ  ¤ôùì(€€€€€‘½¹”¹™½É… ¡Èôùì¥˜¡ÑåÁ•½˜¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸ôôô™Õ¹Ñ¥½¸œ¥¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸¡È¹ÑÉ…¥¹9¼±È¹‘…Ñ”¤ìô¤ì(€€€€€‘½¹”¹™½É… ¡Èôùì¥˜¡ÑåÁ•½˜}…ÕÑ½	½½­±…ÉµÌôôô™Õ¹Ñ¥½¸œ¥}…ÕÑ½	½½­±…ÉµÌ¡È¹Ğ±È¹±•œ¹™É½µMÑ¸±È¹±•œ¹Ñ½MÑ¸±È¹±•œ¹‘•ÁQ¥µ”±È¹±•œ¹…ÉÉQ¥µ”¤ìô¤ì(€€€€€½¹ÍĞ¡…¹•õ‘½¹”¹™¥±Ñ•È¡ÈôùÈ¹Í•…Ñ¡…¹•¤ì(€€€€€±•ĞµÍœõƒÂ~Ìƒ²vóªÒƒ²b#®ƒªÊÃªÎñq¹q»Šrƒ²ÇªÎÔ€‘í½­÷ªÆÑ€ì(€€€€€¥˜¡¡…¹•¹±•¹Ñ ¥µÍœ¬õq»Â~:¾â<ƒ®“²²ró®†pƒ²Š3²tƒ®NÇªâ$ƒ®ÎªÊô€‘í¡…¹•¹±•¹Ñ¡÷ªÆÑq¹€­¡…¹•¹µ…À¡Èôù€ƒ
Ü€‘íÈ¹ÑÉ…¥¹9½ô€‘í}ÑÉ¥Á±Í1…‰•°¡È¹Í•…Ñ¡…¹•¹™É½´¥÷ŠH‘í}ÑÉ¥Á±Í1…‰•°¡È¹Í•…Ñ¡…¹•¹Ñ¼¥õ€¤¹©½¥¸ q¸œ¤ì(€€€€€¥˜¡™…¥±Ì¹±•¹Ñ ¥µÍœ¬õq»Šv0ƒ².“¶2 €‘í™…¥±Ì¹±•¹Ñ¡÷ªÆÑq¹q¹€­™…¥±Ì¹©½¥¸ q¸œ¤ì(€€€€€¥˜ …™…¥±Ì¹±•¹Ñ ˜˜…¡…¹•¹±•¹Ñ ¥µÍœ¬ôq»®ª£®N€ƒ²vó²‚W²vĞƒ²b#®“®Bc²^#²*×®.#®.„œì(€€€€€…±•ÉĞ¡µÍœ¤ì(€€€ô°À¤ì(€ôì(€Í•ÑQ¥µ•½ÕĞ¡ÍÑ•À°ÌÀ¤ì€¼¼ƒ²b“®Ê®‚#²vÓªÂ ƒ®¢ó²‚ ƒ¶:c²vã¶*ã®Bc®>®†tƒ²²^À)ô((¼¼ƒŠRŠR ƒ®‚3®6PƒŠRŠR )™Õ¹Ñ¥½¸½Á•¹QÉ¥À¡¥¥íİ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%õ¥íÉ•¹‘•É5åQÉ¥ÁÌ ¤íô)™Õ¹Ñ¥½¸‰…­Q½QÉ¥Á1¥ÍĞ ¥íİ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%õ¹Õ±°íÉ•¹‘•É5åQÉ¥ÁÌ ¤íô)™Õ¹Ñ¥½¸É•¹‘•É5åQÉ¥ÁÌ ¥ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµµåÑÉ¥Àœ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì(€½¹ÍĞ…Ñ¥Ù”õİ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%˜™ÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõİ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%¤ì(€•°¹¥¹¹•É!Q50€ô…Ñ¥Ù”€ü}ÑÉ¥Á•Ñ…¥±!Q50¡…Ñ¥Ù”¤€è}ÑÉ¥Á1¥ÍÑ!Q50¡ÑÉ¥ÁÌ¤ì(€¥˜¡…Ñ¥Ù”€˜˜ÑåÁ•½˜}…ÑÑ…¡QÉ¥ÁMİ¥Á”ôôô™Õ¹Ñ¥½¸œ¤}…ÑÑ…¡QÉ¥ÁMİ¥Á” ¤ì)ô)™Õ¹Ñ¥½¸}ÑÉ¥Á1¥ÍÑ!Q50¡ÑÉ¥ÁÌ¥ì(€½¹ÍĞ…É‘Ì€ôÑÉ¥ÁÌ¹±•¹Ñ €üÑÉ¥ÁÌ¹Í±¥” ¤¹Í½ÉĞ ¡„±ˆ¤ôùˆ¹É•…Ñ•‘Ğµ„¹É•…Ñ•‘Ğ¤¹µ…À¡ÑÀôùì(€€€½¹ÍĞ‰½½­•õÑÀ¹±•Ì¹™¥±Ñ•È¡}±•	½½­•¤¹±•¹Ñ ì(€€€½¹ÍĞÉ…¹”õÑÀ¹‘…åÌøÄı€‘íÑÀ¹ÍÑ…ÉÑ…Ñ•ôø€‘í}‘…å…Ñ”¡ÑÀ±ÑÀ¹‘…åÌ¥õ€éÑÀ¹ÍÑ…ÉÑ…Ñ”ì(€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…Éˆ½¹±¥¬ô‰½Á•¹QÉ¥À œ‘íÑÀ¹¥‘ôœ¤ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…ÉµÑ½Àˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ…Éµ¹…µ”ˆûÂ~Ì€‘í}Ñ•ÍŒ¡ÑÀ¹¹…µ”¥ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ…Éµ¹¥¡ÑÌˆø‘í}ÑÉ¥Á9¥¡ÑÍ1…‰•°¡ÑÀ¥ôğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…Éµµ•Ñ„ˆø‘íÉ…¹•ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…Éµ™½½Ğˆø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‰…‘”ˆû²vó²‚T€‘íÑÀ¹±•Ì¹±•¹Ñ¡ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‰…‘”€‘í‰½½­•ôôõÑÀ¹±•Ì¹±•¹Ñ ˜™ÑÀ¹±•Ì¹±•¹Ñ üÑÉ¥Àµ‰…‘”µ‘½¹”œèœôˆû²b#®€‘í‰½½­•‘ô¼‘íÑÀ¹±•Ì¹±•¹Ñ¡ôğ½ÍÁ…¸ø(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ…Éµ™…É”ˆø‘í}ÑÉ¥ÁÍÑ…É”¡ÑÀ¤¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€ì(€ô¤¹©½¥¸ œœ¤€è€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ•µÁÑäˆøñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ•µÁÑäµ¥ŒˆûÂ~Ìğ½‘¥ØøñÀû²V²ƒ®3®N€ƒ²^³¶Z'²vĞƒ²^²*×®.#®.¸ñ‰Èû²^³¶Z'²vƒ®3®N“ªÎ€ƒ®
ƒ²s®Î®†pƒ²^Ó²Â ƒ²vó²‚W²vƒ®.Ó²Vñ‰Èû¶Vpƒ®Ê#²^@ƒ²b#®“¶VĞƒ®ÎÓ²ã²jP¸ğ½Àøğ½‘¥Øù€ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµİÉ…Àˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ¥¹ÑÉ¼ˆøÇ®ÂT€Ë²vğ°€Ï®ÂT€Ó²vğƒ®NÄ€ñˆû®¦Ã²æ€ƒ²vó²‚Tğ½ˆû²vã² ƒ²‚W¶VcªÎ€°ƒ®
ƒ²p£²vó²Â §®Î®†pƒ²^Ó²Â£®–ğƒ®.Ó²V€ñˆû²vóªÒƒ²b#®ğ½ˆû¶V€ƒ²"`ƒ²z#²*×®.#®.¸ğ½‘¥Øø(€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…ÉäÑÉ¥Àµ¹•Üˆ½¹±¥¬ô‰½Á•¹QÉ¥ÁÉ•…Ñ•5½‘…° ¤ˆû¾ò,ƒ² ƒ²^³¶Z$ƒ®3®N“ªâÀğ½‰ÕÑÑ½¸ø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±¥ÍĞˆø‘í…É‘Íôğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô((¼¼ƒŠRŠR ƒ²w²Ä¿²“²‚Tƒ®ª£®.°€£²vÓ®š
ß².s²zG²vó
ß²vó²"`¤ƒŠRŠR )™Õ¹Ñ¥½¸}½Á•¹QÉ¥Á½Éµ5½‘…°¡½ÁĞ¥ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥Àµ™½É´µİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞÑ½‘…äõÑ½‘…å1½…±MÑÈ ¤°µ…áõ}…‘‘…åÌ¡Ñ½‘…ä°ÌØÔ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥Àµ™½É´µİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ø¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰Á½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”íÑÉ…¹Í™½É´é¹½¹”íÑ½Àé…ÕÑ¼í±•™Ğé…ÕÑ¼íİ¥‘Ñ èÄÀÀ”íµ…àµİ¥‘Ñ èĞÈÁÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆø‘í½ÁĞ¹Ñ¥Ñ±•ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ™½É´µ™¥•±ˆøñ±…‰•°û²^³¶Z$ƒ²vÓ®šğ½±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰Ñ•áĞˆ¥ô‰Ñ˜µ¹…µ”ˆ±…ÍÌô‰ÑÉ¥Àµ™½É´µ¥¹ÁÕĞˆÙ…±Õ”ôˆ‘í}Ñ•ÍŒ¡½ÁĞ¹¹…µ•ñğœœ¥ôˆÁ±…•¡½±‘•Èô‹²b èƒ²^³®šƒ®Ú²
Àƒ²^³¶Z$ˆµ…á±•¹Ñ ôˆÌÀˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ™½É´µ™¥•±ˆøñ±…‰•°û².s²zG²vğ€ Ç²vó²Â ¤ğ½±…‰•°øñ¥¹ÁÕĞÑåÁ”ô‰‘…Ñ”ˆ¥ô‰Ñ˜µÍÑ…ÉĞˆ±…ÍÌô‰ÑÉ¥Àµ™½É´µ¥¹ÁÕĞˆÙ…±Õ”ôˆ‘í½ÁĞ¹ÍÑ…ÉÑ…Ñ•ññÑ½‘…åôˆµ¥¸ôˆ‘íÑ½‘…åôˆµ…àôˆ‘íµ…áôˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ™½É´µ™¥•±ˆøñ±…‰•°û²^³¶Z$ƒ²vó²"`ğ½±…‰•°ø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÁ…ÍÍ•¹•Èµ½¹ÑÉ½°ˆÍÑå±”ô‰©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èí…ÀèÈÁÁàˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰Ñ˜µµ¥¹ÕÌˆÑåÁ”ô‰‰ÕÑÑ½¸ˆûŠ"Hğ½‰ÕÑÑ½¸ø(€€€€€€€€€€ñÍÁ…¸¥ô‰Ñ˜µ‘…åÌˆÍÑå±”ô‰µ¥¸µİ¥‘Ñ èäÙÁàíÑ•áĞµ…±¥¸é•¹Ñ•Èˆøğ½ÍÁ…¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰Ñ˜µÁ±ÕÌˆÑåÁ”ô‰‰ÕÑÑ½¸ˆø¬ğ½‰ÕÑÑ½¸ø(€€€€€€€€ğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰Ñ˜µÍ…Ù”ˆÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èíµ…É¥¸µÑ½ÀèÄÙÁàˆø‘í½ÁĞ¹Í…Ù•1…‰•±ñğŸ²‚²z”ôğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰Ñ˜µ…¹•°ˆû²Ş£²0ğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€±•Ğ‘…åÌõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±½ÁĞ¹‘…åÍñğÄ¤¤ì(€½¹ÍĞÕÁô ¤ôùí½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µ‘…åÌœ¤í¥˜¡•°¥•°¹¥¹¹•É!Q50õ€ñˆÍÑå±”ô‰™½¹ĞµÍ¥é”èÄİÁàˆø‘í‘…åÍôğ½ˆû²vğ€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤í™½¹ĞµÍ¥é”èÄÉÁàˆø‘í‘…åÌğôÄüŸ
Üƒ®.ç²vğœèŸ
Ü€œ¬¡‘…åÌ´Ä¤¬Ÿ®ÂTôğ½ÍÁ…¸ù€íôì(€ÕÁ ¤ì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥İÉ…À¹É•µ½Ù” ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µµ¥¹ÕÌœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí‘…åÌõ5…Ñ ¹µ…à Ä±‘…åÌ´Ä¤íÕÁ ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µÁ±ÕÌœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùí‘…åÌõ5…Ñ ¹µ¥¸ ÌÀ±‘…åÌ¬Ä¤íÕÁ ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µ…¹•°œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùİÉ…À¹É•µ½Ù” ¤¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µÍ…Ù”œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€½¹ÍĞ¹…µ”õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µ¹…µ”œ¤¹Ù…±Õ”¹ÑÉ¥´ ¥ñğŸ®
Ğƒ²^³¶Z$œì(€€€½¹ÍĞÍÑ…ÉĞõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ˜µÍÑ…ÉĞœ¤¹Ù…±Õ•ññÑ½‘…äì(€€€½¹ÍĞ½¬õ½ÁĞ¹½¹M…Ù”¡¹…µ”±ÍÑ…ÉĞ±‘…åÌ¤ì(€€€¥˜¡½¬„ôõ™…±Í”¥İÉ…À¹É•µ½Ù” ¤ì(€ô¤ì)ô)™Õ¹Ñ¥½¸½Á•¹QÉ¥ÁÉ•…Ñ•5½‘…° ¥ì}½Á•¹QÉ¥Á½Éµ5½‘…°¡íÑ¥Ñ±”èŸÂ~Ìƒ² ƒ²^³¶Z$ƒ®3®N“ªâÀœ±Í…Ù•1…‰•°èŸ®3®N“ªâÀœ±‘…åÌèÈ±½¹M…Ù”è¡¸±Ì±¤ôùí½¹ÍĞ¥õÉ•…Ñ•QÉ¥À¡¸±Ì±¤í½Á•¹QÉ¥À¡¥¤íõô¤ìô)™Õ¹Ñ¥½¸½Á•¹QÉ¥Á‘¥Ñ5½‘…°¡¥¥ì(€½¹ÍĞÑÀõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõ¥¤ì¥˜ …ÑÀ¥É•ÑÕÉ¸ì(€}½Á•¹QÉ¥Á½Éµ5½‘…°¡íÑ¥Ñ±”èŸÂ~Ìƒ²^³¶Z$ƒ²“²‚Tœ±Í…Ù•1…‰•°èŸ²‚²z”œ±¹…µ”éÑÀ¹¹…µ”±ÍÑ…ÉÑ…Ñ”éÑÀ¹ÍÑ…ÉÑ…Ñ”±‘…åÌéÑÀ¹‘…åÌ±½¹M…Ù”è¡¸±Ì±¤ôùì(€€€½¹ÍĞÍÑÉ…¹‘•õÑÀ¹±•Ì¹™¥±Ñ•È¡°ôù°¹‘…äù¤¹±•¹Ñ ì(€€€¥˜¡ÍÑÉ…¹‘•€˜˜€…½¹™¥É´¡€‘í‘÷²vó²Â ƒ²vÓ¶n²v`ƒ²vó²‚T€‘íÍÑÉ…¹‘•‘÷ªÆÓ²vĞƒ®#²®$ƒ®
€ ‘í‘÷²vó²Â §®†pƒ²vÓ®>g®B§®.#®.¹q»ªÎ²7¶Vc².sªÊƒ²*×®.#ªæ0ı€¤¥É•ÑÕÉ¸™…±Í”ì(€€€ÕÁ‘…Ñ•QÉ¥À¡¥±¸±Ì±¤ì(€õô¤ì)ô()™Õ¹Ñ¥½¸}ÑÉ¥Á•Ñ…¥±!Q50¡ÑÉ¥À¥ì(€½¹ÍĞ‰½½­•õÑÉ¥À¹±•Ì¹™¥±Ñ•È¡}±•	½½­•¤¹±•¹Ñ ì(€½¹ÍĞÕ¹‰½½­•õÑÉ¥À¹±•Ì¹±•¹Ñ µ‰½½­•ì(€½¹ÍĞÉ…¹”õÑÉ¥À¹‘…åÌøÄı€‘íÑÉ¥À¹ÍÑ…ÉÑ…Ñ•ôø€‘í}‘…å…Ñ”¡ÑÉ¥À±ÑÉ¥À¹‘…åÌ¥õ€éÑÉ¥À¹ÍÑ…ÉÑ…Ñ”ì(€±•Ğ‰½‘äôœœì(€™½È¡±•Ğ‘…äôÄì‘…äğõÑÉ¥À¹‘…åÌì‘…ä¬¬¥ì(€€€½¹ÍĞ±•Ìõ}‘…å1•Ì¡ÑÉ¥À±‘…ä¤ì(€€€‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘…äµ¡•…ˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‘…äµ¹¼ˆø‘í‘…å÷²vó²Â ğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‘…äµ‘…Ñ”ˆø‘í}‘…å…Ñ”¡ÑÉ¥À±‘…ä¥ôğ½ÍÁ…¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥Àµ‘…äµ…‘ˆ½¹±¥¬ô‰½Á•¹QÉ¥Á‘‘M•…É  œ‘íÑÉ¥À¹¥‘ôœ°‘í‘…åô¤ˆû¾ò,ƒ²vó²‚Tğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€€€¥˜¡±•Ì¹±•¹Ñ ¤‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘…äµ±•Ìˆø‘í±•Ì¹µ…À¡°ôù}ÑÉ¥Á1•!Q50¡ÑÉ¥À¹¥±°¤¤¹©½¥¸ œœ¥ôğ½‘¥Øù€ì(€€€•±Í”‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘…äµ•µÁÑäˆ½¹±¥¬ô‰½Á•¹QÉ¥Á‘‘M•…É  œ‘íÑÉ¥À¹¥‘ôœ°‘í‘…åô¤ˆøñÍÁ…¸û¾ò,ƒ²Ê¬ƒ²vó²‚W²vƒ²ÚSªÂ¶VÓ®ÎÓ²ã²jPğ½ÍÁ…¸øğ½‘¥Øù€ì(€ô(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµİÉ…ÀÑÉ¥Àµ‘•Ñ…¥°ˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘•Ñ…¥°µ¡•…ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘•Ñ…¥°µ¹…µ”ˆûÂ~Ì€‘í}Ñ•ÍŒ¡ÑÉ¥À¹¹…µ”¥ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘•Ñ…¥°µ…Ñ¥½¹Ìˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥Àµµ¥¹¤µ‰Ñ¸ˆ½¹±¥¬ô‰½Á•¹QÉ¥Á‘¥Ñ5½‘…° œ‘íÑÉ¥À¹¥‘ôœ¤ˆûŠjdƒ²“²‚Tğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥Àµµ¥¹¤µ‰Ñ¸ÑÉ¥Àµµ¥¹¤µ‘…¹•Èˆ½¹±¥¬ô‰‘•±•Ñ•QÉ¥À œ‘íÑÉ¥À¹¥‘ôœ¤ˆû²
·²‚pğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ‘•Ñ…¥°µµ•Ñ„ˆø‘í}ÑÉ¥Á9¥¡ÑÍ1…‰•°¡ÑÉ¥À¥ôƒ
Ü€‘íÉ…¹•ôƒ
Üƒ²vó²‚T€‘íÑÉ¥À¹±•Ì¹±•¹Ñ¡÷ªÂpƒ
Üƒ²b#®€‘í‰½½­•‘ô¼‘íÑÉ¥À¹±•Ì¹±•¹Ñ¡ôğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…Ñ¥½¹ÌµÉ½Üˆø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥Àµ…Ñ¥½¸µ‰Ñ¸ˆ½¹±¥¬ô‰½Á•¹QÉ¥ÁI½ÕÑ” œ‘íÑÉ¥À¹¥‘ôœ¤ˆûÂ~^ë¾â<ƒ²^³¶Z$ƒªÊ÷®†pğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥Àµ…Ñ¥½¸µ‰Ñ¸ˆ½¹±¥¬ô‰Í¡…É•QÉ¥À œ‘íÑÉ¥À¹¥‘ôœ¤ˆûÂ~R\ƒ®¶°ƒªÎ×²r€ğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øø(€€€€‘í‰½‘åô(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÑ½Ñ…°µ‰…Èˆø(€€€€€€ñ‘¥ØøñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÑ½Ñ…°µ±…‰•°ˆû²b#²ƒ¶V§ªÎğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÑ½Ñ…°µ™…É”ˆø‘í}ÑÉ¥ÁÍÑ…É”¡ÑÉ¥À¤¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÑ½Ñ…°µ‰Ñ¹Ìˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…ÉäÑÉ¥Àµ‰½½¬µ‰Ñ¸ˆ½¹±¥¬ô‰‰Õ±­	½½­QÉ¥À œ‘íÑÉ¥À¹¥‘ôœ¤ˆ‘íÕ¹‰½½­•üœœèœ‘¥Í…‰±•ôûÂ~:¬ƒ²vóªÒƒ²b#®‘íÕ¹‰½½­•ı€€ ‘íÕ¹‰½½­•‘ô¥€èœƒ²f®0ôğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô)™Õ¹Ñ¥½¸}ÑÉ¥Á1•!Q50¡ÑÉ¥Á%±±•œ¥ì(€½¹ÍĞ‰½½­•õ}±•	½½­•¡±•œ¤ì(€½¹ÍĞØô¡ÑåÁ•½˜ÍÍY…Èôôô™Õ¹Ñ¥½¸œ¤ıÍÍY…È¡±•œ¹É…‘”¤èµ œì(€½¹ÍĞÉ…‘•¡¥Àô¡ÑåÁ•½˜É…‘•!Ñµ°ôôô™Õ¹Ñ¥½¸œ¤ıÉ…‘•!Ñµ°¡±•œ¹É…‘”¤é€ñˆø‘í}Ñ•ÍŒ¡±•œ¹É…‘•ñğœœ¥ôğ½ˆù€ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµÍİ¥Á”ˆ‘…Ñ„µ±•œôˆ‘í±•œ¹¥‘ôˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµ…Ñ¥½¹Ìˆø(€€€€€€‘í‰½½­•(€€€€€€€€ü€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥ÀµÍİ¥Á”µ…Ğ…ĞµÑĞˆ½¹±¥¬ô‰½Á•¹1•Q¥µ•Ñ…‰±” œ‘íÑÉ¥Á%‘ôœ°œ‘í±•œ¹¥‘ôœ¤ˆû².sªÂ¶Fpğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥ÀµÍİ¥Á”µ…Ğ…Ğµ…¹•°ˆ½¹±¥¬ô‰…¹•±1•	½½­¥¹œ œ‘íÑÉ¥Á%‘ôœ°œ‘í±•œ¹¥‘ôœ¤ˆû²b#®ñ‰Èû²Ş£²0ğ½‰ÕÑÑ½¸ù€(€€€€€€€€è€ñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥ÀµÍİ¥Á”µ…Ğ…ĞµÍ•œˆ½¹±¥¬ô‰½Á•¹1•M•µ•¹Ñ‘¥Ğ œ‘íÑÉ¥Á%‘ôœ°œ‘í±•œ¹¥‘ôœ¤ˆûªÖ³ªÂñ‰Èû®ÎªÊôğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥ÀµÍİ¥Á”µ…Ğ…Ğµ½ÁĞˆ½¹±¥¬ô‰½Á•¹1•QÉ…¥¹Mİ…À œ‘íÑÉ¥Á%‘ôœ°œ‘í±•œ¹¥‘ôœ¤ˆû²b#®ñ‰Èû®ÎªÊôğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰ÑÉ¥ÀµÍİ¥Á”µ…Ğ…Ğµ‘•°ˆ½¹±¥¬ô‰É•µ½Ù•QÉ¥Á1•œ œ‘íÑÉ¥Á%‘ôœ°œ‘í±•œ¹¥‘ôœ¤ˆû²
·²‚pğ½‰ÕÑÑ½¸ùô(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œ‘í‰½½­•üœÑÉ¥Àµ±•œµ‰½½­•œèœôˆÍÑå±”ô‰‰½É‘•Èµ±•™Ğµ½±½ÈéÙ…È ´µŒ´‘íÙô¤ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµµ…¥¸ˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµÉ½ÕÑ”ˆøñˆø‘í}Ñ•ÍŒ¡±•œ¹™É½µMÑ¸¥ôğ½ˆø€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ±•œµÑ¥µ”ˆø‘í±•œ¹‘•ÁQ¥µ•ñğœôğ½ÍÁ…¸øƒŠH€ñˆø‘í}Ñ•ÍŒ¡±•œ¹Ñ½MÑ¸¥ôğ½ˆø€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ±•œµÑ¥µ”ˆø‘í±•œ¹…ÉÉQ¥µ•ñğœôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµÍÕˆˆø‘íÉ…‘•¡¥Áô€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í½±½ÈéÙ…È ´µÑ•áĞÈ¤ˆø‘í}Ñ•ÍŒ¡±•œ¹ÑÉ…¥¹9¼¥ôğ½ÍÁ…¸øƒ
Ü€‘í}Ñ•ÍŒ¡±•œ¹Í•…Ñ±…ÍÍ1…‰•±ñğœœ¥ôƒ
Ü€‘í±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÅ÷®ª‘í±•œ¹‘¥Í½Õ¹Ğ˜™±•œ¹‘¥Í½Õ¹Ğ„ôô¹½¹”œüœƒ
Ü€œ­}Ñ•ÍŒ¡%M=U9QMm±•œ¹‘¥Í½Õ¹Ñtü¹±…‰•±ñğœœ¤èœôğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµÍ¥‘”ˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ±•œµ™…É”ˆø‘í}±•…É”¡±•œ¤¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½‘¥Øø(€€€€€€€€‘í‰½½­•üœñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ±•œµÑ…œˆû²b#®“²f®0ğ½ÍÁ…¸øœèœô(€€€€€€€€ñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ±•œµÍİ¥Á”µ¡¥¹ĞˆûŠäƒ®ÂªâÀğ½ÍÁ…¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€ğ½‘¥Øù€ì)ô(¼¼ƒ²Š3²â„ƒ²*“²f²vÓ¶R®†pƒ²V‡²`ƒ®ã²Úp)™Õ¹Ñ¥½¸}…ÑÑ…¡QÉ¥ÁMİ¥Á” ¥ì(€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÉ•ÍÕ±ĞµµåÑÉ¥À€¹ÑÉ¥Àµ±•œµÍİ¥Á”œ¤¹™½É… ¡ÍÜôùì(€€€¥˜¡ÍÜ¹}Íİ¥Á•%¹¥Ğ¥É•ÑÕÉ¸ìÍÜ¹}Íİ¥Á•%¹¥ĞõÑÉÕ”ì(€€€½¹ÍĞ…ÉõÍÜ¹ÅÕ•ÉåM•±•Ñ½È œ¹ÑÉ¥Àµ±•œœ¤°…Ñ¥½¹ÌõÍÜ¹ÅÕ•ÉåM•±•Ñ½È œ¹ÑÉ¥Àµ±•œµ…Ñ¥½¹Ìœ¤ì(€€€¥˜ ……É‘ñğ……Ñ¥½¹Ì¥É•ÑÕÉ¸ì(€€€±•ĞÍÑ…ÉÑ`ôÀ±ÍÑ…ÉÑdôÀ±ÕÈôÀ±½Á•¸õ™…±Í”±‘É…¥¹œõ™…±Í”±‘•¥‘•õ™…±Í”±¡½É¥èõ™…±Í”ì(€€€½¹ÍĞ\ô ¤ôù…Ñ¥½¹Ì¹½™™Í•Ñ]¥‘Ñ¡ñğÄÈÀì(€€€½¹ÍĞÍ•Ñ`õàôùí…É¹ÍÑå±”¹ÑÉ…¹Í™½É´õÑÉ…¹Í±…Ñ•` ‘íáõÁà¥€íôì(€€€½¹ÍĞÍ¹…Àõ¼ôùí½Á•¸õ¼íÕÈõ¼üµ\ ¤èÀí…É¹ÍÑå±”¹ÑÉ…¹Í¥Ñ¥½¸ôÑÉ…¹Í™½É´€¸ÉÌœíÍ•Ñ`¡ÕÈ¤íôì(€€€½¹ÍĞ‘½İ¸õ”ôùí½¹ÍĞÀõ”¹Ñ½Õ¡•Ìı”¹Ñ½Õ¡•ÍlÁté”íÍÑ…ÉÑ`õÀ¹±¥•¹Ñ`íÍÑ…ÉÑdõÀ¹±¥•¹Ñdí‘É…¥¹œõÑÉÕ”í‘•¥‘•õ™…±Í”í¡½É¥èõ™…±Í”í…É¹ÍÑå±”¹ÑÉ…¹Í¥Ñ¥½¸ô¹½¹”œíôì(€€€½¹ÍĞµ½Ù”õ”ôùí¥˜ …‘É…¥¹œ¥É•ÑÕÉ¸í½¹ÍĞÀõ”¹Ñ½Õ¡•Ìı”¹Ñ½Õ¡•ÍlÁté”í½¹ÍĞ‘àõÀ¹±¥•¹Ñ`µÍÑ…ÉÑ`±‘äõÀ¹±¥•¹ÑdµÍÑ…ÉÑdì(€€€€€¥˜ …‘•¥‘•¥í¥˜¡5…Ñ ¹…‰Ì¡‘à¤øİññ5…Ñ ¹…‰Ì¡‘ä¤øÜ¥í‘•¥‘•õÑÉÕ”í¡½É¥èõ5…Ñ ¹…‰Ì¡‘à¤ù5…Ñ ¹…‰Ì¡‘ä¤íõ•±Í”É•ÑÕÉ¸íô(€€€€€¥˜ …¡½É¥è¥É•ÑÕÉ¸ì¥˜¡”¹…¹•±…‰±”¥”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€€€±•Ğàô¡½Á•¸üµ\ ¤èÀ¤­‘àìàõ5…Ñ ¹µ…à µ\ ¤±5…Ñ ¹µ¥¸ À±à¤¤ìÕÈõàìÍ•Ñ`¡à¤íôì(€€€½¹ÍĞÕÀô ¤ôùí¥˜ …‘É…¥¹œ¥É•ÑÕÉ¸í‘É…¥¹œõ™…±Í”í…É¹ÍÑå±”¹ÑÉ…¹Í¥Ñ¥½¸ôÑÉ…¹Í™½É´€¸ÉÌœíÍ¹…À¡ÕÈğµ\ ¤¼È¤íôì(€€€…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡ÍÑ…ÉĞœ±‘½İ¸±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì(€€€…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡µ½Ù”œ±µ½Ù”±íÁ…ÍÍ¥Ù”é™…±Í•ô¤ì(€€€…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡•¹œ±ÕÀ¤ì…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ñ½Õ¡…¹•°œ±ÕÀ¤ì(€€€…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È µ½ÕÍ•‘½İ¸œ±”ôùí‘½İ¸¡”¤í½¹ÍĞµ´õ•Øôùµ½Ù”¡•Ø¤±µÔô ¤ôùíÕÀ ¤í‘½Õµ•¹Ğ¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È µ½ÕÍ•µ½Ù”œ±µ´¤í‘½Õµ•¹Ğ¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È µ½ÕÍ•ÕÀœ±µÔ¤íôí‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È µ½ÕÍ•µ½Ù”œ±µ´¤í‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È µ½ÕÍ•ÕÀœ±µÔ¤íô¤ì(€€€…É¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡½Á•¸¥í”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤íÍ¹…À¡™…±Í”¤íõô¤ì(€ô¤ì)ô(¼¼ƒªÖ³ªÂƒ®ÎªÊôèƒªÂg²v ƒ²^Ó²Â£²v`ƒ².sªÂ¶Fs²^C²pƒ²*ç
ß¶Vc²Â£²^·²vƒ®.“².pƒ²ƒ¶t)™Õ¹Ñ¥½¸½Á•¹1•M•µ•¹Ñ‘¥Ğ¡ÑÉ¥Á%°±•%¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÀ¥É•ÑÕÉ¸ì(€½¹ÍĞ±•œõÑÀ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±•œ¥É•ÑÕÉ¸ì(€¥˜¡}±•	½½­•¡±•œ¤¥í…±•ÉĞ Ÿ²vÓ®¾àƒ²b#®ƒ²f®3®Bpƒ²vó²‚W²z®.#®.¹q»®ÎªÊ÷¶Vc®‚“®¦Ğƒ®¢ó²‚ ƒ¶VÓ®.äƒ²*ç²Â£ªÚ3²vƒ²Ş£²3¶VÓ²ó²ã²jP¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡±•œ¹ÑÉ…¥¹9¼¤ì¥˜ …Ğ¥í…±•ÉĞ Ÿ²^Ó²Â ƒ²‚W®ÎÓ®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞÍÑ½ÁÌõĞ¹ÍÑ½ÁÌ¹µ…À ¡Ì±¤¤ôø¡í¤±ÌéÌ¹Ì±…ÉÈéÌ¹…ÉÈ±‘•ÀéÌ¹‘•Áô¤¤¹™¥±Ñ•È¡àôø…¥ÍA…ÍÍMÑ½À¡Ğ±à¹Ì¤˜˜¡¡…ÍQ¥µ”¡à¹…ÉÈ¥ññ¡…ÍQ¥µ”¡à¹‘•À¤¤¤ì(€½¹ÍĞ‘•Á=˜õàôù¡…ÍQ¥µ”¡à¹‘•À¤ıà¹‘•Àéà¹…ÉÈ°…ÉÉ=˜õàôù¡…ÍQ¥µ”¡à¹…ÉÈ¤ıà¹…ÉÈéà¹‘•Àì(€±•Ğ™É½µM•°õ5…Ñ ¹µ…à À±ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡àôùà¹Ìôôõ±•œ¹™É½µMÑ¸¤¤ì(€±•ĞÑ½M•°õÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡àôùà¹Ìôôõ±•œ¹Ñ½MÑ¸¤ì¥˜¡Ñ½M•°ğÀ¥Ñ½M•°õÍÑ½ÁÌ¹±•¹Ñ ´Äì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ•œµİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥ÀµÍ•œµİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àœì(€½¹ÍĞÉ½İÌô ¤ôùÍÑ½ÁÌ¹µ…À ¡à±¥‘à¤ôù€ñ‘¥Ø±…ÍÌô‰±Í”µÉ½Ü‘í¥‘àôôõ™É½µM•°üœ¥Ìµ™É½´œèœô‘í¥‘àôôõÑ½M•°üœ¥ÌµÑ¼œèœôˆø(€€€€€€ñÍÁ…¸±…ÍÌô‰±Í”µÍÑ¸ˆø‘í}Ñ•ÍŒ¡à¹Ì¥ôğ½ÍÁ…¸ø(€€€€€€ñÍÁ…¸±…ÍÌô‰±Í”µÑ¥µ”ˆø‘í‘•Á=˜¡à¥ñğœôğ½ÍÁ…¸ø(€€€€€€ñ‘¥Ø±…ÍÌô‰±Í”µ‰Ñ¹Ìˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰±Í”µˆ±Í”µ‰½…É‘í¥‘àôôõ™É½µM•°üœ½¸œèœôˆ‘…Ñ„µÉ½±”ô‰™É½´ˆ‘…Ñ„µ¥‘àôˆ‘í¥‘áôˆû²*ç²Â ğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰±Í”µˆ±Í”µ…±¥¡Ğ‘í¥‘àôôõÑ½M•°üœ½¸œèœôˆ‘…Ñ„µÉ½±”ô‰Ñ¼ˆ‘…Ñ„µ¥‘àôˆ‘í¥‘áôˆû¶Vc²Â ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øù€¤¹©½¥¸ œœ¤ì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ø¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰Á½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”íÑÉ…¹Í™½É´é¹½¹”íÑ½Àé…ÕÑ¼í±•™Ğé…ÕÑ¼íµ…àµ¡•¥¡ĞèàÙÙ í½Ù•É™±½Üµäé…ÕÑ¼íİ¥‘Ñ èÄÀÀ”íµ…àµİ¥‘Ñ èĞĞÁÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆûÂ~j$ƒªÖ³ªÂƒ®ÎªÊôƒ
Ü€‘í}Ñ•ÍŒ¡Ğ¹É…‘”¥ô€‘í}Ñ•ÍŒ¡±•œ¹ÑÉ…¥¹9¼¥ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆû²^´ƒ²b€ñˆû²*ç²Â ğ½ˆû
Üñˆû¶Vc²Â ğ½ˆû®–ğƒ®"3®~°ƒªÂg²v ƒ²^Ó²Â£²^C²pƒªÖ³ªÂ®0ƒ®ÎªÊ÷¶V§®.#®.¸ğ½‘¥Øø(€€€€€€ñ‘¥Ø¥ô‰±Í”µ±¥ÍĞˆ±…ÍÌô‰±Í”µ±¥ÍĞˆø‘íÉ½İÌ ¥ôğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰±Í”µ…ÁÁ±äˆÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èíµ…É¥¸µÑ½ÀèÄÉÁàˆû®ÎªÊôƒ²‚²j¤ğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰±Í”µ…¹•°ˆû²Ş£²0ğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€½¹ÍĞÉ•É•¹‘•Èô ¤ôùí‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ±Í”µ±¥ÍĞœ¤¹¥¹¹•É!Q50õÉ½İÌ ¤ì‰¥¹ ¤íôì(€½¹ÍĞ‰¥¹ô ¤ôùì(€€€İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹±Í”µˆœ¤¹™½É… ¡ˆôùˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€€€½¹ÍĞ¥‘àô­ˆ¹‘…Ñ…Í•Ğ¹¥‘àì(€€€€€¥˜¡ˆ¹‘…Ñ…Í•Ğ¹É½±”ôôô™É½´œ¥ì™É½µM•°õ¥‘àì¥˜¡Ñ½M•°ğõ™É½µM•°¥Ñ½M•°õ5…Ñ ¹µ¥¸¡ÍÑ½ÁÌ¹±•¹Ñ ´Ä±™É½µM•°¬Ä¤ìô(€€€€€•±Í”ìÑ½M•°õ¥‘àì¥˜¡™É½µM•°øõÑ½M•°¥™É½µM•°õ5…Ñ ¹µ…à À±Ñ½M•°´Ä¤ìô(€€€€€É•É•¹‘•È ¤ì(€€€ô¤¤ì(€ôì(€‰¥¹ ¤ì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥İÉ…À¹É•µ½Ù” ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ±Í”µ…¹•°œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùİÉ…À¹É•µ½Ù” ¤¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ±Í”µ…ÁÁ±äœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€¥˜¡™É½µM•°øõÑ½M•°¥í…±•ÉĞ Ÿ¶Vc²Â£²^·²v ƒ²*ç²Â£²^·®ÎÓ®.ƒ®J“²^³²Vğƒ¶V§®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€€€½¹ÍĞÑÉ¥ÁÌÈõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀÈõÑÉ¥ÁÌÈ¹™¥¹¡àôùà¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±œõÑÀÈ˜™ÑÀÈ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±œ¥íİÉ…À¹É•µ½Ù” ¤íÉ•ÑÕÉ¸íô(€€€½¹ÍĞ¹˜õÍÑ½ÁÍm™É½µM•±t°¹ĞõÍÑ½ÁÍmÑ½M•±tì(€€€±œ¹™É½µMÑ¸õ¹˜¹Ìì±œ¹Ñ½MÑ¸õ¹Ğ¹Ìì±œ¹‘•ÁQ¥µ”õ‘•Á=˜¡¹˜¤ì±œ¹…ÉÉQ¥µ”õ…ÉÉ=˜¡¹Ğ¤ì(€€€Í…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌÈ¤ìİÉ…À¹É•µ½Ù” ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì}ÑÉ¥ÁQ½…ÍĞ ŸªÖ³ªÂ²vƒ®ÎªÊ÷¶Z#²*×®.#®.œ¤ì(€ô¤ì)ô(¼¼ƒªÂg²v ƒªÖ³ªÂƒ®.“®–àƒ²^Ó²Â ƒ®ª§®†t)™Õ¹Ñ¥½¸}ÑÉ¥ÁQÉ…¥¹Í½É=¡™É½´±Ñ¼±‘…Ñ”±•á±Õ‘•9¼±¥¹±Õ‘•‘¨¥ì(€½¹ÍĞ¥ÍQ½‘…äõ‘…Ñ”ôôõÑ½‘…å1½…±MÑÈ ¤ì½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤ì½¹ÍĞ¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤ì(€½¹ÍĞÍ…¸ô¡±¤ôùì½¹ÍĞÈõmtì11}QI%9L¹™½É… ¡Ğôùì¥˜¡•á±Õ‘•9¼˜™Ğ¹¹¼ôôõ•á±Õ‘•9¼¥É•ÑÕÉ¸ì(€€€½¹ÍĞ™¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ¤±Ñ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹Ìôôõ¤ì¥˜¡™¤ğÁññÑ¤ğÁññ™¤øõÑ¤¥É•ÑÕÉ¸ì(€€€¥˜¡¥ÍA…ÍÍMÑ½À¡Ğ±¥ññ¥ÍA…ÍÍMÑ½À¡Ğ±¤¥É•ÑÕÉ¸ì½¹ÍĞ‘ÌõĞ¹ÍÑ½ÁÍm™¥t±…ÌõĞ¹ÍÑ½ÁÍmÑ¥tì(€€€½¹ÍĞ‘•Àõ¡…ÍQ¥µ”¡‘Ì¹‘•À¤ı‘Ì¹‘•Àé¡…ÍQ¥µ”¡‘Ì¹…ÉÈ¤ı‘Ì¹…ÉÈé¹Õ±°ì½¹ÍĞ…ÉÉPõ¡…ÍQ¥µ”¡…Ì¹…ÉÈ¤ı…Ì¹…ÉÈé¡…ÍQ¥µ”¡…Ì¹‘•À¤ı…Ì¹‘•Àé¹Õ±°ì(€€€¥˜ …‘•À¥É•ÑÕÉ¸ì¥˜¡¥ÍQ½‘…ä˜™Ñ½5¥¸¡‘•À¤„ôõ¹Õ±°˜™Ñ½5¥¸¡‘•À¤ñ¹½İ4¥É•ÑÕÉ¸ìÈ¹ÁÕÍ ¡íĞ±‘•À±…ÉÈé…ÉÉQô¤ìô¤ìÉ•ÑÕÉ¸Èìôì(€½¹ÍĞ½ÕĞõÍ…¸¡™É½´±Ñ¼¤¹µ…À¡”ôø¡ì¸¸¹”±…É½´é™É½´±…Q¼éÑ¼±…‘¨é™…±Í•ô¤¤ì(€¥˜¡¥¹±Õ‘•‘¨€˜˜ÑåÁ•½˜}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ìôôô™Õ¹Ñ¥½¸œ¥ì(€€€½¹ÍĞÍ••¸õ¹•ÜM•Ğ¡½ÕĞ¹µ…À¡”ôù”¹Ğ¹¹¼¤¤ì(€€€½¹ÍĞÍÑ½ÁÍĞô¡Ğ±ÍÑ¸¤ôùí½¹ÍĞ¤õĞ¹ÍÑ½ÁÌ¹™¥¹‘%¹‘•à¡ÌôùÌ¹ÌôôõÍÑ¸¤íÉ•ÑÕÉ¸¤øôÀ˜˜…¥ÍA…ÍÍMÑ½À¡Ğ±ÍÑ¸¤íôì(€€€™½È¡½¹ÍĞ¹ˆ½˜}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ì¡™É½´¤¤Í…¸¡¹ˆ¹¸±Ñ¼¤¹™½É… ¡”ôùì¥˜¡Í••¸¹¡…Ì¡”¹Ğ¹¹¼¥ññÍÑ½ÁÍĞ¡”¹Ğ±™É½´¤¥É•ÑÕÉ¸ìÍ••¸¹…‘¡”¹Ğ¹¹¼¤ì½ÕĞ¹ÁÕÍ ¡ì¸¸¹”±…É½´é¹ˆ¹¸±…Q¼éÑ¼±…‘¨éÑÉÕ”±µ¥ÍÌé™É½µô¤ìô¤ì(€€€™½È¡½¹ÍĞ¹ˆ½˜}¹•…É‰åQÉ…¥¹MÑ…Ñ¥½¹Ì¡Ñ¼¤¤Í…¸¡™É½´±¹ˆ¹¸¤¹™½É… ¡”ôùì¥˜¡Í••¸¹¡…Ì¡”¹Ğ¹¹¼¥ññÍÑ½ÁÍĞ¡”¹Ğ±Ñ¼¤¥É•ÑÕÉ¸ìÍ••¸¹…‘¡”¹Ğ¹¹¼¤ì½ÕĞ¹ÁÕÍ ¡ì¸¸¹”±…É½´é™É½´±…Q¼é¹ˆ¹¸±…‘¨éÑÉÕ”±µ¥ÍÌéÑ½ô¤ìô¤ì(€ô(€½ÕĞ¹Í½ÉĞ ¡„±ˆ¤ôø¡Ñ½5¥¸¡„¹‘•À¥ñğÀ¤´¡Ñ½5¥¸¡ˆ¹‘•À¥ñğÀ¤¤ì(€É•ÑÕÉ¸½ÕĞì)ô(¼¼ƒ²b#®ƒ®ÎªÊôèƒªÂg²v ƒªÖ³ªÂ²v`ƒ®.“®–àƒ²^Ó²Â£®†pƒªÖC²ÊĞ€¬ƒ²Š3²tƒ®NÇªâ$ƒ®ÎªÊô€£¶Vc®. ƒ².s¶*à¤)™Õ¹Ñ¥½¸½Á•¹1•QÉ…¥¹Mİ…À¡ÑÉ¥Á%°±•%¥ì(€½¹ÍĞ¡¬õ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±•œÀõ¡¬˜™¡¬¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì(€¥˜ …±•œÀ¥É•ÑÕÉ¸ì(€¥˜¡}±•	½½­•¡±•œÀ¤¥í…±•ÉĞ Ÿ²vÓ®¾àƒ²b#®ƒ²f®3®Bpƒ²vó²‚W²z®.#®.¹q»®ÎªÊ÷¶Vc®‚“®¦Ğƒ®¢ó²‚ ƒ¶VÓ®.äƒ²*ç²Â£ªÚ3²vƒ²Ş£²3¶VÓ²ó²ã²jP¸œ¤íÉ•ÑÕÉ¸íô(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍİ…ÀµİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥ÀµÍİ…ÀµİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸ÔÔ¤ˆøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍ¡••Ğˆ¥ô‰ÑÉ¥ÀµÍİ…ÀµÍ¡••Ğˆøñ‘¥Ø¥ô‰ÑÉ¥ÀµÍİ…Àµ‰½‘äˆøğ½‘¥Øøğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”  ¤ôùí½¹ÍĞÍ õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍİ…ÀµÍ¡••Ğœ¤ì¥˜¡Í ¥Í ¹±…ÍÍ1¥ÍĞ¹…‘ ½Á•¸œ¤íô¤ì(€½¹ÍĞ±½Í”ô ¤ôùí½¹ÍĞÍ õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍİ…ÀµÍ¡••Ğœ¤ì¥˜¡Í ¥Í ¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ½Á•¸œ¤ìÍ•ÑQ¥µ•½ÕĞ  ¤ôùİÉ…À¹É•µ½Ù” ¤°ÈÈÀ¤íôì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥±½Í” ¤íô¤ì(€½¹ÍĞØõœôø¡ÑåÁ•½˜ÍÍY…Èôôô™Õ¹Ñ¥½¸œ¤ıÍÍY…È¡œ¤èµ œì(€™Õ¹Ñ¥½¸É•¹‘•È ¥ì(€€€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±•œõÑÀ˜™ÑÀ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±•œ¥í±½Í” ¤íÉ•ÑÕÉ¸íô(€€€½¹ÍĞÕÉPõ•ÑQÉ…¥¹	å9¼¡±•œ¹ÑÉ…¥¹9¼¤ì(€€€½¹ÍĞ…‘©=¸ô¡ÑåÁ•½˜ÑÉ¥ÁMİ…Á‘©¹…‰±•ôôô™Õ¹Ñ¥½¸œ¤˜™ÑÉ¥ÁMİ…Á‘©¹…‰±• ¤ì(€€€½¹ÍĞ±¥ÍĞõ}ÑÉ¥ÁQÉ…¥¹Í½É=¡±•œ¹™É½µMÑ¸°±•œ¹Ñ½MÑ¸°±•œ¹‘…Ñ”°±•œ¹ÑÉ…¥¹9¼°…‘©=¸¤ì(€€€½¹ÍĞ±…ÍÍ•ÌõÕÉPı…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡ÕÉP¹É…‘”¤émtì(€€€½¹ÍĞÍ•…Ñ	Ñ¹Ìõ±…ÍÍ•Ì¹µ…À¡Œôù€ñ‰ÕÑÑ½¸±…ÍÌô‰Íİ…ÀµÍ•…Ğµ‰Ñ¸‘íŒôôõ±•œ¹Í•…Ñ±…ÍÌüœ½¸œèœôˆ‘…Ñ„µ±Ìôˆ‘íôˆø‘íMQ}1MMMmt¹±…‰•±ôñÍÁ…¸±…ÍÌô‰Íİ…ÀµÍ•…Ğµ™…É”ˆø‘íÕÉPı…ÁÁ±å¥Í½Õ¹Ğ¡…±…É”¡ÕÉP±±•œ¹™É½µMÑ¸±±•œ¹Ñ½MÑ¸±Œ¤±±•œ¹‘¥Í½Õ¹Ññğ¹½¹”œ¤¹Ñ½1½…±•MÑÉ¥¹œ ¤èœ´÷²n@ğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¤ì(€€€½¹ÍĞ…É‘Ìõ±¥ÍĞ¹±•¹Ñ ı±¥ÍĞ¹µ…À ¡íĞ±‘•À±…ÉÈ±…‘¨±…É½´±…Q¼±µ¥ÍÍô¤ôùì(€€€€€½¹ÍĞ±Ìõ…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡Ğ¹É…‘”¤ì½¹ÍĞÕÍ•±Ìõ±Ì¹¥¹±Õ‘•Ì¡±•œ¹Í•…Ñ±…ÍÌ¤ı±•œ¹Í•…Ñ±…ÍÌé±ÍlÁtì(€€€€€½¹ÍĞ™…É”õ…ÁÁ±å¥Í½Õ¹Ğ¡…±…É”¡Ğ±…É½´±…Q¼±ÕÍ•±Ì¤±±•œ¹‘¥Í½Õ¹Ññğ¹½¹”œ¤¨¡±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÄ¤ì(€€€€€½¹ÍĞ‘ÕÈô¡ÑåÁ•½˜‘ÕÉMÑÈôôô™Õ¹Ñ¥½¸œ¤ı‘ÕÉMÑÈ¡‘•À±…ÉÈ¤èœœì(€€€€€½¹ÍĞ½¹˜ô¡ÑåÁ•½˜}ÑÉ¥Á…å=Ù•É±…Àôôô™Õ¹Ñ¥½¸œ¤ı}ÑÉ¥Á…å=Ù•É±…À¡ÑÉ¥Á%°±•œ¹‘…ä°‘•À°…ÉÈ°±•%¤é¹Õ±°ì(€€€€€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍİ…Àµ…É‘í½¹˜üœÑÉ¥ÀµÉ½Üµ½Ù•É±…Àœèœôˆ‘…Ñ„µ¹¼ôˆ‘íĞ¹¹½ôˆ‘…Ñ„µ‘•Àôˆ‘í‘•Áôˆ‘…Ñ„µ…ÉÈôˆ‘í…ÉÉñğœôˆ‘…Ñ„µ™É½´ôˆ‘í…É½µôˆ‘…Ñ„µÑ¼ôˆ‘í…Q½ôˆ€‘í…‘¨ı‘…Ñ„µ…‘¨ôˆÄˆ‘…Ñ„µµ¥ÍÌôˆ‘íµ¥ÍÍô‰€èœôÍÑå±”ô‰‰½É‘•Èµ±•™Ğµ½±½ÈéÙ…È ´µŒ´‘íØ¡Ğ¹É…‘”¥ô¤ˆø(€€€€€€€€ñ‘¥ØÍÑå±”ô‰™±•àèÄíµ¥¸µİ¥‘Ñ èÀˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍİ…ÀµÑ½Àˆø‘ì¡ÑåÁ•½˜É…‘•!Ñµ°ôôô™Õ¹Ñ¥½¸œ¤ıÉ…‘•!Ñµ°¡Ğ¹É…‘”¤é}Ñ•ÍŒ¡Ğ¹É…‘”¥ô€ñÍÁ…¸ÍÑå±”ô‰™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í½±½ÈéÙ…È ´µÑ•áĞÈ¤í™½¹ĞµÍ¥é”èÄÉÁàˆø‘íĞ¹¹½ôğ½ÍÁ…¸ø€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÄ¤í™½¹Ğµİ•¥¡ĞèØÀÀˆø‘í}Ñ•ÍŒ¡Ğ¹‘•ÍĞ¥÷¶Z$ğ½ÍÁ…¸ø‘í…‘¨üœ€ñÍÁ…¸±…ÍÌô‰Íİ…Àµ…‘¨µÑ…œˆû²vã²‚G²^´ğ½ÍÁ…¸øœèœôğ½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍİ…ÀµÑ¥µ”ˆøñˆø‘í‘•Áôğ½ˆø‘í…‘¨˜™…É½´„ôõ±•œ¹™É½µMÑ¸ı€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ½É…¹”¤í™½¹ĞµÍ¥é”èÄÁÁàˆø‘í}Ñ•ÍŒ¡…É½´¥ôğ½ÍÁ…¸ù€èœôƒŠH€ñˆÍÑå±”ô‰½±½ÈéÙ…È ´µÉ••¸¤ˆø‘í…ÉÉñğœ´ôğ½ˆø‘í…‘¨˜™…Q¼„ôõ±•œ¹Ñ½MÑ¸ı€€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µ½É…¹”¤í™½¹ĞµÍ¥é”èÄÁÁàˆø‘í}Ñ•ÍŒ¡…Q¼¥ôğ½ÍÁ…¸ù€èœô€ñÍÁ…¸ÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÅÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø‘í‘ÕÉôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍİ…Àµ™…É”ˆø‘í™…É”¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ñÍÁ…¸±…ÍÌô‰µäµµ•¹Ôµ…ÉÉ½ÜˆÍÑå±”ô‰µ…É¥¸µ±•™ĞèÙÁàˆûŠèğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ğ½‘¥Øù€ì(€€€ô¤¹©½¥¸ œœ¤é€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ•µÁÑäˆÍÑå±”ô‰Á…‘‘¥¹œèÈÉÁà€ÄÉÁàˆøñÀûªÂg²v ƒªÖ³ªÂ²v`ƒ®.“®–àƒ²^Ó²Â£ªÂ ƒ²^²*×®.#®.¸ğ½Àøğ½‘¥Øù€ì(€€€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍİ…Àµ‰½‘äœ¤¹¥¹¹•É!Q50õ€(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍ¡••ĞµÉ¥Àˆøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍ¡••ĞµÑ¥Ñ±”ˆûÂ~:¬ƒ²b#®ƒ®ÎªÊôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍ¡••ĞµÍÕˆˆø‘í}Ñ•ÍŒ¡±•œ¹™É½µMÑ¸¥ôƒŠH€‘í}Ñ•ÍŒ¡±•œ¹Ñ½MÑ¸¥ôƒ
Ü€‘í±•œ¹‘…Ñ•ôƒ
Ü€‘í±•œ¹Á…ÍÍ•¹•É½Õ¹ÑñğÅ÷®ªğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Íİ…ÀµÍ•…Ğµ±…‰•°ˆû²Š3²tƒ®NÇªâ$ƒ®ÎªÊôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Íİ…ÀµÍ•…ĞµÉ½Üˆø‘íÍ•…Ñ	Ñ¹Íôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Íİ…Àµ±¥ÍĞµ±…‰•°ˆû®.“®–àƒ²^Ó²Â£®†pƒ®ÎªÊô‘í…‘©=¸üœ€ñÍÁ…¸±…ÍÌô‰Íİ…Àµ…‘¨µ¹½Ñ”ˆû
Üƒ²vã²‚G²^´ƒ¶>³¶V ğ½ÍÁ…¸øœèœôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÍ¡••Ğµ±¥ÍĞˆø‘í…É‘Íôğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰ÑÉ¥ÀµÍİ…Àµ±½Í”ˆÍÑå±”ô‰µ…É¥¸èÄÁÁà€ÄÑÁà€ÑÁàˆû®.¯ªâÀğ½‰ÕÑÑ½¸ù€ì(€€€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍİ…Àµ±½Í”œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±±½Í”¤ì(€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÑÉ¥ÀµÍİ…Àµ‰½‘ä€¹Íİ…ÀµÍ•…Ğµ‰Ñ¸œ¤¹™½É… ¡ˆôùˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€€€½¹ÍĞŒõˆ¹‘…Ñ…Í•Ğ¹±Ìì½¹ÍĞÑÉ¥ÁÌÈõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀÈõÑÉ¥ÁÌÈ¹™¥¹¡àôùà¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±œõÑÀÈ˜™ÑÀÈ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±œ¥É•ÑÕÉ¸ì(€€€€€±œ¹Í•…Ñ±…ÍÌõŒì±œ¹Í•…Ñ±…ÍÍ1…‰•°õMQ}1MMMmt¹±…‰•°ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌÈ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ìÉ•¹‘•È ¤ì}ÑÉ¥ÁQ½…ÍĞ¡€‘íMQ}1MMMmt¹±…‰•±ô£²rğ§®†pƒ®ÎªÊõ€¤ì(€€€ô¤¤ì(€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÑÉ¥ÀµÍİ…Àµ‰½‘ä€¹ÑÉ¥ÀµÍİ…Àµ…É‘m‘…Ñ„µ¹½tœ¤¹™½É… ¡ŒôùŒ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€€€½¹ÍĞ¹¼õŒ¹‘…Ñ…Í•Ğ¹¹¼°¹Ğõ•ÑQÉ…¥¹	å9¼¡¹¼¤ì¥˜ …¹Ğ¥É•ÑÕÉ¸ì(€€€€€½¹ÍĞ‘½Mİ…Àô ¤ôùì½¹ÍĞÑÉ¥ÁÌÈõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀÈõÑÉ¥ÁÌÈ¹™¥¹¡àôùà¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±œõÑÀÈ˜™ÑÀÈ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±œ¥É•ÑÕÉ¸ì(€€€€€€€½¹ÍĞ±Ìõ…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡¹Ğ¹É…‘”¤ì(€€€€€€€±œ¹ÑÉ…¥¹9¼õ¹¼ì±œ¹É…‘”õ¹Ğ¹É…‘”ì±œ¹±¥¹”õ¹Ğ¹±¥¹”ì±œ¹™É½µMÑ¸õŒ¹‘…Ñ…Í•Ğ¹™É½´ì±œ¹Ñ½MÑ¸õŒ¹‘…Ñ…Í•Ğ¹Ñ¼ì±œ¹‘•ÁQ¥µ”õŒ¹‘…Ñ…Í•Ğ¹‘•Àì±œ¹…ÉÉQ¥µ”õŒ¹‘…Ñ…Í•Ğ¹…ÉÈì(€€€€€€€¥˜ …±Ì¹¥¹±Õ‘•Ì¡±œ¹Í•…Ñ±…ÍÌ¤¥ì±œ¹Í•…Ñ±…ÍÌõ±ÍlÁtì±œ¹Í•…Ñ±…ÍÍ1…‰•°õMQ}1MMMm±ÍlÁut¹±…‰•°ìô(€€€€€€€Í…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌÈ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì}ÑÉ¥ÁQ½…ÍĞ¡€‘í¹Ğ¹É…‘•ô€‘í¹½ô£²rğ§®†pƒ®ÎªÊ÷¶Z#²*×®.#®.‘€¤ì±½Í” ¤ìôì(€€€€€½¹ÍĞ½¹˜ô¡ÑåÁ•½˜}ÑÉ¥Á…å=Ù•É±…Àôôô™Õ¹Ñ¥½¸œ¤ı}ÑÉ¥Á…å=Ù•É±…À¡ÑÉ¥Á%°±•œ¹‘…ä°Œ¹‘…Ñ…Í•Ğ¹‘•À°Œ¹‘…Ñ…Í•Ğ¹…ÉÈ°±•%¤é¹Õ±°ì(€€€€€½¹ÍĞ…‘©]…É¸õŒ¹‘…Ñ…Í•Ğ¹…‘¨ıq»Šìƒ²vã²‚G²^´ ‘íŒ¹‘…Ñ…Í•Ğ¹µ¥ÍÍôƒ®¾ã²‚W²Â ¤èƒ²*ç²Â €‘íŒ¹‘…Ñ…Í•Ğ¹™É½µôƒ
Üƒ¶Vc²Â €‘íŒ¹‘…Ñ…Í•Ğ¹Ñ½õ€èœœì(€€€€€¥˜¡½¹˜¥ì¥˜¡½¹™¥É´¡ƒŠjƒ¾â<ƒ²vÓ®¾àƒ®.ÓªâĞƒ²vó²‚WªÎğƒ².sªÂ²vĞƒªÊç²æ§®.#®.¹q¸‘í½¹˜¹ÑÉ…¥¹9½÷®Ê €‘í½¹˜¹™É½µMÑ¹÷ŠH‘í½¹˜¹Ñ½MÑ¹ô€ ‘í½¹˜¹‘•ÁQ¥µ•õø‘í½¹˜¹…ÉÉQ¥µ•ô¤‘í…‘©]…É¹õq¹q»ªŞã®zc®>ƒ²vĞƒ²^Ó²Â£®†pƒ®ÎªÊ÷¶Vc².sªÊƒ²*×®.#ªæ0ı€¤¤‘½Mİ…À ¤ìô(€€€€€•±Í”¥˜¡Œ¹‘…Ñ…Í•Ğ¹…‘¨¥ì¥˜¡½¹™¥É´¡ƒ²vã²‚G²^´ƒ²^Ó²Â£²z®.#®.¸‘í…‘©]…É¹õq¹q»²vĞƒ²^Ó²Â£®†pƒ®ÎªÊ÷¶Vc².sªÊƒ²*×®.#ªæ0ı€¤¤‘½Mİ…À ¤ìô(€€€€€•±Í”‘½Mİ…À ¤ì(€€€ô¤¤ì(€ô(€É•¹‘•È ¤ì)ô(¼¼ƒ².sªÂ¶FpƒŠHƒ²VÇ²v`ƒ².“²‚p€Ÿ¶G²*äƒ²^³²‚Tœ£².“².sªÂƒ²jÓ¶Z$¤ƒ¶fS®¦Ó²vƒªŞã®2®†pƒ²
³²j¤)™Õ¹Ñ¥½¸½Á•¹1•Q¥µ•Ñ…‰±”¡ÑÉ¥Á%°±•%¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±•œõÑÀ˜™ÑÀ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±•œ¥É•ÑÕÉ¸ì(€¥˜¡ÑåÁ•½˜½Á•¹)½ÕÉ¹•äôôô™Õ¹Ñ¥½¸œ¤½Á•¹)½ÕÉ¹•ä¡±•œ¹ÑÉ…¥¹9¼¤ì(€•±Í”…±•ÉĞ Ÿ¶G²*äƒ²^³²‚Tƒ¶fS®¦Ó²vƒ²^Ğƒ²"`ƒ²^²*×®.#®.¸œ¤ì)ô(¼¼ƒ²b#®ƒ²Ş£²0ƒŠPƒ²*ç²Â£ªÚ3²v ƒ²Ş£²0ƒ²¶s®†pƒªâÃ®†tƒ®ÎÓªÒ °ƒ²vó²‚W²v ƒ®¾ã²b#®“®†pƒ®Î×ªŞ )™Õ¹Ñ¥½¸…¹•±1•	½½­¥¹œ¡ÑÉ¥Á%°±•%¥ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ì½¹ÍĞÑÀõÑÉ¥ÁÌ¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì½¹ÍĞ±•œõÑÀ˜™ÑÀ¹±•Ì¹™¥¹¡°ôù°¹¥ôôõ±•%¤ì¥˜ …±•œ¥É•ÑÕÉ¸ì(€¥˜ …±•œ¹Ñ¥­•Ñ%¥ì}ÑÉ¥ÁQ½…ÍĞ Ÿ²b#®“®Bpƒ²vó²‚W²vĞƒ²V®.g®.#®.œ¤ìÉ•ÑÕÉ¸ìô(€½¹ÍĞÑ¥­•ÑÌõ±½…‘Q¥­•ÑÌ ¤ì½¹ÍĞÑ¬õÑ¥­•ÑÌ¹™¥¹¡àôùà¹¥ôôõ±•œ¹Ñ¥­•Ñ%¤ì(€¥˜¡Ñ¬¥ì½¹ÍĞ¹½Üõ¹•Ü…Ñ” ¤°¹½İ4õ¹½Ü¹•Ñ!½ÕÉÌ ¤¨ØÀ­¹½Ü¹•Ñ5¥¹ÕÑ•Ì ¤°‘•Á4õÑ½5¥¸¡Ñ¬¹‘•ÁQ¥µ”¤ì(€€€¥˜¡Ñ¬¹ÑÉ…Ù•±…Ñ”ôôõÑ½‘…å1½…±MÑÈ ¤˜™‘•Á4„ôõ¹Õ±°˜™‘•Á4ğõ¹½İ4¥ì…±•ÉĞ Ÿ²vÓ®¾àƒ²Ús®Âs¶Vpƒ²^Ó²Â£®*Pƒ²b#®“®–ğƒ²Ş£²3¶V€ƒ²"`ƒ²^²*×®.#®.¸œ¤ìÉ•ÑÕÉ¸ìôô(€¥˜ …½¹™¥É´ Ÿ²vĞƒ²vó²‚W²v`ƒ²b#®“®–ğƒ²Ş£²3¶Vc².sªÊƒ²*×®.#ªæ0ıq¹q»²*ç²Â£ªÚ3²v ƒ²Ş£²0ƒ²¶s®†pƒªâÃ®†w²^@ƒ®ÎÓªÒ®BcªÎ€±q»²vó²‚W²v ƒ®¾ã²b#®ƒ²¶s®†pƒ®>3²VªÂG®.#®.¸œ¤¥É•ÑÕÉ¸ì(€¥˜¡Ñ¬¥ìÑ¬¹ÍÑ…ÑÕÌô…¹•±±•œìÑ¬¹…¹•±±•‘Ğõ…Ñ”¹¹½Ü ¤ìÍ…Ù•Q¥­•ÑÌ¡Ñ¥­•ÑÌ¤ì(€€€¥˜¡ÑåÁ•½˜¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸ôôô™Õ¹Ñ¥½¸œ¥¥¹Ù…±¥‘…Ñ•½¹•ÍÑ¥½¸¡Ñ¬¹ÑÉ…¥¹9¼±Ñ¬¹ÑÉ…Ù•±…Ñ”¤ì(€€€ÑÉåì½¹ÍĞ…°õ±½…‘±…ÉµÌ ¤ìÍ…Ù•±…ÉµÌ¡…°¹™¥±Ñ•È¡„ôø„¡„¹ÑÉ…¥¹9¼ôôõÑ¬¹ÑÉ…¥¹9¼˜˜¡„¹ÍÑ¸ôôõÑ¬¹™É½µMÑ¹ññ„¹ÍÑ¸ôôõÑ¬¹Ñ½MÑ¸¤¤¤¤ìõ…Ñ ¡”¥íô(€ô(€±•œ¹Ñ¥­•Ñ%õ¹Õ±°ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ìÉ•¹‘•É5åQÉ¥ÁÌ ¤ì(€¥˜¡ÑåÁ•½˜É•¹‘•ÉQ¥­•ÑÌôôô™Õ¹Ñ¥½¸œ€˜˜‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµÑ¥­•Ğœ¤¤É•¹‘•ÉQ¥­•ÑÌ ¤ì(€}ÑÉ¥ÁQ½…ÍĞ Ÿ²b#®“®–ğƒ²Ş£²3¶Z#²*×®.#®.€£ªâÃ®†tƒ®ÎÓªÒ ¤œ¤ì)ô(¼¼ƒ²“²‚Tèƒ®“²ƒ².pƒ®.“®–àƒ²Š3²tƒ²zC®>dƒ²b#®€¼ƒ²b#®ƒ®ÎªÊôƒ²vã²‚G²^´ƒ¶>³¶V )™Õ¹Ñ¥½¸ÑÉ¥ÁÕÑ½M•…Ñ¹…‰±• ¥íÑÉåíÉ•ÑÕÉ¸±½…±MÑ½É…”¹•Ñ%Ñ•´ ¹¥µ‰¥}ÑÉ¥Á}…ÕÑ½Í•…Ğœ¤ôôôœÄœíõ…Ñ ¡”¥íÉ•ÑÕÉ¸™…±Í”íõô)™Õ¹Ñ¥½¸Ñ½±•QÉ¥ÁÕÑ½M•…Ğ ¥íÑÉåí±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ¹¥µ‰¥}ÑÉ¥Á}…ÕÑ½Í•…Ğœ±ÑÉ¥ÁÕÑ½M•…Ñ¹…‰±• ¤üœÀœèœÄœ¤íõ…Ñ ¡”¥íõ}É•I•¹‘•ÉQÉ¥ÁM•ÑÑ¥¹Ì ¤íô)™Õ¹Ñ¥½¸ÑÉ¥ÁMİ…Á‘©¹…‰±• ¥íÑÉåíÉ•ÑÕÉ¸±½…±MÑ½É…”¹•Ñ%Ñ•´ ¹¥µ‰¥}ÑÉ¥Á}Íİ…Á…‘¨œ¤ôôôœÄœíõ…Ñ ¡”¥íÉ•ÑÕÉ¸™…±Í”íõô)™Õ¹Ñ¥½¸Ñ½±•QÉ¥ÁMİ…Á‘¨ ¥íÑÉåí±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ¹¥µ‰¥}ÑÉ¥Á}Íİ…Á…‘¨œ±ÑÉ¥ÁMİ…Á‘©¹…‰±• ¤üœÀœèœÄœ¤íõ…Ñ ¡”¥íõ}É•I•¹‘•ÉQÉ¥ÁM•ÑÑ¥¹Ì ¤íô)™Õ¹Ñ¥½¸}É•I•¹‘•ÉQÉ¥ÁM•ÑÑ¥¹Ì ¥í½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% µäµÍÕˆµ½¹Ñ•¹Ğœ¤í¥˜¡•°˜™•°¹‘…Ñ…Í•Ğ¹Í•Ñ¥½¸ôôôÍ•ÑÑ¥¹Ìœ˜™ÑåÁ•½˜É•¹‘•ÉM•ÑÑ¥¹ÍM•Ñ¥½¸ôôô™Õ¹Ñ¥½¸œ¥É•¹‘•ÉM•ÑÑ¥¹ÍM•Ñ¥½¸¡•°¤íô((¼¼ƒŠRŠR ƒ²vó²‚Tƒ²ÚSªÂ €£¶*ç²‚Tƒ²vó²Â£²^@ƒªÖ³ªÂƒ²†Ã¶j0ƒŠHƒ²^Ó²Â ƒ®.ÓªâÀ¤ƒŠRŠR )™Õ¹Ñ¥½¸½Á•¹QÉ¥Á‘‘M•…É ¡ÑÉ¥Á%±‘…ä¥ì(€½¹ÍĞÑÉ¥Àõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸ì(€‘…äõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸¡ÑÉ¥À¹‘…åÌ±‘…åñğÄ¤¤ì(€İ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”õíÑÉ¥Á%±‘…åôì(€İ¥¹‘½Ü¹}…Ñ¥Ù•QÉ¥Á%õÑÉ¥Á%ì(€½¹ÍĞ•°õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% É•ÍÕ±ĞµµåÑÉ¥Àœ¤ì¥˜ …•°¥É•ÑÕÉ¸ì(€•°¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµİÉ…Àˆø(€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥Àµ…‘µ¡ˆûÂ~Ì€ñˆø‘í‘…å÷²vó²Â ğ½ˆø€ ‘í}‘…å…Ñ”¡ÑÉ¥À±‘…ä¥ô¤ƒ²vó²‚Tƒ²ÚSªÂ ƒŠPƒ²^Ó²Â£®–ğƒ®"3®~°ƒ®.Ó²ró²ã²jP€ñÍÁ…¸ÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø£²b#®ƒ²V®.`¤ğ½ÍÁ…¸øğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰ÑÉ¥Àµ…‘µ‰½½¬ˆøğ½‘¥Øø(€€ğ½‘¥Øù€ì(€½¹ÍĞ‰½àõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥Àµ…‘µ‰½½¬œ¤ì(€¥˜¡‰½à€˜˜ÑåÁ•½˜}É•¹‘•É	½½­Q…‰%¹Ñ¼ôôô™Õ¹Ñ¥½¸œ¤}É•¹‘•É	½½­Q…‰%¹Ñ¼¡‰½à°€µäµ‰½½¬µÉ•ÍÕ±ÑÌœ¤ì(€½¹ÍĞ‘œõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‰½½¬µ‘…Ñ”µ¼œ¤ì¥˜¡‘œ¥í‘œ¹Ù…±Õ”õ}‘…å…Ñ”¡ÑÉ¥À±‘…ä¤íô)ô)™Õ¹Ñ¥½¸‰…­É½µQÉ¥Á‘¡ÑÉ¥Á%¥ìİ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”õ¹Õ±°ì½Á•¹QÉ¥À¡ÑÉ¥Á%¤ìô)™Õ¹Ñ¥½¸½Á•¹QÉ¥Á1•A¥­•È¡ÑÉ…¥¹9¼°™É½´°Ñ¼°‘•À°…ÉÈ°‘…Ñ”¥ì(€½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡ÑÉ…¥¹9¼¤ì¥˜ …Ğ¥í…±•ÉĞ Ÿ²^Ó²Â ƒ²‚W®ÎÓ®–ğƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞµ½‘”õİ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”ì¥˜ …µ½‘•ñğ…µ½‘”¹ÑÉ¥Á%¥í…±•ÉĞ Ÿ²^³¶Z'²vƒ®¢ó²‚ ƒ²ƒ¶w¶VÓ²ó²ã²jP¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞÑÉ¥Àõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡àôùà¹¥ôôõµ½‘”¹ÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸ì(€½¹ÍĞ‘…å…Ñ”õ}‘…å…Ñ”¡ÑÉ¥À±µ½‘”¹‘…ä¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥Àµ±•œµÁ¥­•ÈµİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞ±…ÍÍ•Ìõ…Ù…¥±…‰±•M•…Ñ±…ÍÍ•Ì¡Ğ¹É…‘”¤ì(€½¹ÍĞÁ…àÀõ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ Ø°¡ÑåÁ•½˜}‰½½­A…ÍÍ•¹•É½Õ¹Ğ„ôôÕ¹‘•™¥¹•œ˜™}‰½½­A…ÍÍ•¹•É½Õ¹Ğ¥ñğÄ¤¤ì(€İ¥¹‘½Ü¹}Ñ±ÀõíÑÉ…¥¹9¼±™É½´±Ñ¼±‘•À±…ÉÈ±±Ìé¹Õ±°±Á…àéÁ…àÁôì(€½¹ÍĞ½ÁÑÌõ±…ÍÍ•Ì¹µ…À¡Œôù€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¸ˆ‘…Ñ„µ±…ÍÌôˆ‘íôˆøñÍÁ…¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ±…‰•°ˆø‘íMQ}1MMMmt¹±…‰•±ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ™…É”ˆø‘í…±…É”¡Ğ±™É½´±Ñ¼±Œ¤¹Ñ½1½…±•MÑÉ¥¹œ ¥÷²n@ğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ù€¤¹©½¥¸ œœ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥Àµ±•œµÁ¥­•ÈµİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ø¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰Á½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”íÑÉ…¹Í™½É´é¹½¹”íÑ½Àé…ÕÑ¼í±•™Ğé…ÕÑ¼íµ…àµ¡•¥¡ĞèàáÙ í½Ù•É™±½Üµäé…ÕÑ¼íİ¥‘Ñ èÄÀÀ”íµ…àµİ¥‘Ñ èĞÈÁÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆûÂ~Ì€‘íµ½‘”¹‘…å÷²vó²Â£²^@ƒ®.ÓªâÀğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆø‘í}Ñ•ÍŒ¡Ğ¹É…‘”¥ô€‘í}Ñ•ÍŒ¡ÑÉ…¥¹9¼¥ôƒ
Ü€‘í}Ñ•ÍŒ¡™É½´¥ô€‘í‘•ÁôƒŠH€‘í}Ñ•ÍŒ¡Ñ¼¥ô€‘í…ÉÉñğœôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆÍÑå±”ô‰½±½ÈéÙ…È ´µÑ•áĞÌ¤ˆø‘í‘…å…Ñ•ôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÉÁàˆû²Š3²tƒ®NÇªâ$ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¹Ìˆø‘í½ÁÑÍôğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÍ•Ñ¥½¸µ±…‰•°ˆû²vã²n@ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰‰½½­¥¹œµÁ…ÍÍ•¹•Èµ½¹ÑÉ½°ˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰Ñ±Àµµ¥¹ÕÌˆÑåÁ”ô‰‰ÕÑÑ½¸ˆûŠ"Hğ½‰ÕÑÑ½¸ø(€€€€€€€€ñÍÁ…¸¥ô‰Ñ±ÀµÁ…àˆø‘íİ¥¹‘½Ü¹}Ñ±À¹Á…áôğ½ÍÁ…¸ø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰½½­¥¹œµÍÑ•ÁÁ•Èµ‰Ñ¸ˆ¥ô‰Ñ±ÀµÁ±ÕÌˆÑåÁ”ô‰‰ÕÑÑ½¸ˆø¬ğ½‰ÕÑÑ½¸ø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰Ñ±Àµ…‘ˆ‘¥Í…‰±•ÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èíµ…É¥¸µÑ½ÀèÄÑÁàí½Á…¥Ñäè¸ĞíÕÉÍ½Èé¹½Ğµ…±±½İ•ˆûÂ~Ìƒ²vĞƒ²^³¶Z'²^@ƒ®.ÓªâÀğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰Ñ±Àµ…¹•°ˆû²Ş£²0ğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥İÉ…À¹É•µ½Ù” ¤íô¤ì(€İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¸œ¤¹™½É… ¡ˆôùˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€İÉ…À¹ÅÕ•ÉåM•±•Ñ½É±° œ¹‰½½­¥¹œµÍ•…Ğµ½ÁÑ¥½¸œ¤¹™½É… ¡àôùà¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” …Ñ¥Ù”œ¤¤ì(€€€ˆ¹±…ÍÍ1¥ÍĞ¹…‘ …Ñ¥Ù”œ¤ìİ¥¹‘½Ü¹}Ñ±À¹±Ìõˆ¹‘…Ñ…Í•Ğ¹±…ÍÌì(€€€½¹ÍĞ…‘õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±Àµ…‘œ¤ì¥˜¡…‘¥í…‘¹‘¥Í…‰±•õ™…±Í”í…‘¹ÍÑå±”¹½Á…¥ÑäôœÄœí…‘¹ÍÑå±”¹ÕÉÍ½ÈôÁ½¥¹Ñ•Èœíô(€ô¤¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±Àµµ¥¹ÕÌœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùíİ¥¹‘½Ü¹}Ñ±À¹Á…àõ5…Ñ ¹µ…à Ä±İ¥¹‘½Ü¹}Ñ±À¹Á…à´Ä¤í‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±ÀµÁ…àœ¤¹Ñ•áÑ½¹Ñ•¹Ğõİ¥¹‘½Ü¹}Ñ±À¹Á…àíô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±ÀµÁ±ÕÌœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùíİ¥¹‘½Ü¹}Ñ±À¹Á…àõ5…Ñ ¹µ¥¸ Ø±İ¥¹‘½Ü¹}Ñ±À¹Á…à¬Ä¤í‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±ÀµÁ…àœ¤¹Ñ•áÑ½¹Ñ•¹Ğõİ¥¹‘½Ü¹}Ñ±À¹Á…àíô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±Àµ…¹•°œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùİÉ…À¹É•µ½Ù” ¤¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Ñ±Àµ…‘œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€½¹ÍĞàõİ¥¹‘½Ü¹}Ñ±À°´õİ¥¹‘½Ü¹}ÑÉ¥Á‘‘5½‘”ì¥˜ …áñğ…à¹±Íñğ…´¥É•ÑÕÉ¸ì(€€€½¹ÍĞÑÀõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡èôùè¹¥ôôõ´¹ÑÉ¥Á%¤ì¥˜ …ÑÀ¥í…±•ÉĞ Ÿ²^³¶Z'²vƒ²Âû²vƒ²"`ƒ²^²*×®.#®.¸œ¤íÉ•ÑÕÉ¸íô(€€€½¹ÍĞ±•œõí¥é•¹QÉ¥Á% ¤±ÑÉ…¥¹9¼éà¹ÑÉ…¥¹9¼±É…‘”éĞ¹É…‘”±±¥¹”éĞ¹±¥¹”±™É½µMÑ¸éà¹™É½´±Ñ½MÑ¸éà¹Ñ¼°(€€€€€‘•ÁQ¥µ”éà¹‘•À±…ÉÉQ¥µ”éà¹…ÉÈ±‘…äé´¹‘…ä±‘…Ñ”é}‘…å…Ñ”¡ÑÀ±´¹‘…ä¤±Í•…Ñ±…ÍÌéà¹±Ì±Í•…Ñ±…ÍÍ1…‰•°éMQ}1MMMmà¹±Ít¹±…‰•°°(€€€€€Á…ÍÍ•¹•É½Õ¹Ğéà¹Á…à±‘¥Í½Õ¹Ğè¹½¹”œ±Ñ¥­•Ñ%é¹Õ±±ôì(€€€…‘‘1•Q½QÉ¥À¡´¹ÑÉ¥Á%±±•œ¤ì(€€€İÉ…À¹É•µ½Ù” ¤ì(€€€½¹ÍĞÑÀÈõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡èôùè¹¥ôôõ´¹ÑÉ¥Á%¤ì(€€€}ÑÉ¥ÁQ½…ÍĞ¡ƒÂ~Ì€‘í´¹‘…å÷²vó²Â£²^@ƒ®.Ó²Vc²*×®.#®.ƒ
Üƒ²vó²‚T€‘íÑÀÈıÑÀÈ¹±•Ì¹±•¹Ñ èœ÷ªÂq€¤ì(€ô¤ì)ô((¼¼ƒŠRŠR ƒ².sªÂƒªÊç²æ ƒªÊ²
°€£ªÂg²v ƒ²vó²Â ƒ®
Ğ¤ƒŠRŠR )™Õ¹Ñ¥½¸}ÑÉ¥Á…å=Ù•É±…À¡ÑÉ¥Á%°‘…ä°‘•ÁP°…ÉÉP°•á•ÁÑ1•%¥ì(€½¹ÍĞ¹õÑ½5¥¸¡‘•ÁP¤°¹„õÑ½5¥¸¡…ÉÉP¤ì¥˜¡¹ôôõ¹Õ±±ññ¹„ôôõ¹Õ±°¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞÑÉ¥Àõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸¹Õ±°ì(€½¹ÍĞ…Lõ¹°…õ¹„øõ¹ı¹„é¹„¬ÄĞĞÀì(€É•ÑÕÉ¸}‘…å1•Ì¡ÑÉ¥À±‘…ä¤¹™¥¹¡°ôùì(€€€¥˜¡•á•ÁÑ1•%˜™°¹¥ôôõ•á•ÁÑ1•%¥É•ÑÕÉ¸™…±Í”ì(€€€½¹ÍĞ•õÑ½5¥¸¡°¹‘•ÁQ¥µ”¤±•„õÑ½5¥¸¡°¹…ÉÉQ¥µ”¤ì¥˜¡•ôôõ¹Õ±±ññ•„ôôõ¹Õ±°¥É•ÑÕÉ¸™…±Í”ì(€€€½¹ÍĞ‰Lõ•±‰õ•„øõ•ı•„é•¬ÄĞĞÀìÉ•ÑÕÉ¸…Lñ‰˜™‰Lñ…ì(€ô¥ññ¹Õ±°ì)ô((¼¼ƒŠRŠR ƒ²^³¶Z$ƒªÊ÷®†pƒ®ÎÓªâÀ€£²vó²Â£®Îƒ²vÓ®>dƒªÊ÷®†pƒ²jS²Vô¤ƒŠRŠR )™Õ¹Ñ¥½¸½Á•¹QÉ¥ÁI½ÕÑ”¡ÑÉ¥Á%¥ì(€½¹ÍĞÑÉ¥Àõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÉ½ÕÑ”µİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€±•Ğ‰½‘äôœœì(€™½È¡±•Ğ‘…äôÄì‘…äğõÑÉ¥À¹‘…åÌì‘…ä¬¬¥ì(€€€½¹ÍĞ±•Ìõ}‘…å1•Ì¡ÑÉ¥À±‘…ä¤ì(€€€‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ‘…äˆøñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‘…äµ¹¼ˆø‘í‘…å÷²vó²Â ğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥Àµ‘…äµ‘…Ñ”ˆø‘í}‘…å…Ñ”¡ÑÉ¥À±‘…ä¥ôğ½ÍÁ…¸øğ½‘¥Øù€ì(€€€¥˜ …±•Ì¹±•¹Ñ ¥ì‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ•µÁÑäˆû²vÓ®>dƒ²vó²‚Tƒ²^²v0ğ½‘¥Øù€ì½¹Ñ¥¹Õ”ìô(€€€‰½‘ä¬ôœñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ±•Ìˆøœì(€€€±•Ì¹™½É… ¡°ôùì(€€€€€‰½‘ä¬õ€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ±•œˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ±¥¹”ˆøñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ‘½Ğˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µÍÑ¸ˆø‘í}Ñ•ÍŒ¡°¹™É½µMÑ¸¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µĞˆø‘í°¹‘•ÁQ¥µ•ñğœôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µµ¥ˆøñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µÑÉ…¥¸ˆø‘í}Ñ•ÍŒ¡°¹É…‘•ñğœœ¥ô€‘í}Ñ•ÍŒ¡°¹ÑÉ…¥¹9¼¥ôğ½ÍÁ…¸ø€ñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ±¥¹•¡¥Àˆø‘í}Ñ•ÍŒ ¡°¹±¥¹•ñğœœ¤¹ÍÁ±¥Ğ Ÿ
Üœ¥lÁuñğœœ¥ôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ±¥¹”ˆøñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ‘½Ğ•¹ˆøğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µÍÑ¸ˆø‘í}Ñ•ÍŒ¡°¹Ñ½MÑ¸¥ôğ½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µĞˆø‘í°¹…ÉÉQ¥µ•ñğœôğ½ÍÁ…¸øğ½‘¥Øø(€€€€€€ğ½‘¥Øù€ì(€€€ô¤ì(€€€‰½‘ä¬ôœğ½‘¥Øøœì(€ô(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥ÀµÉ½ÕÑ”µİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ø¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰Á½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”íÑÉ…¹Í™½É´é¹½¹”íÑ½Àé…ÕÑ¼í±•™Ğé…ÕÑ¼íµ…àµ¡•¥¡ĞèàÙÙ í½Ù•É™±½Üµäé…ÕÑ¼íİ¥‘Ñ èÄÀÀ”íµ…àµİ¥‘Ñ èĞĞÁÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆûÂ~^ë¾â<€‘í}Ñ•ÍŒ¡ÑÉ¥À¹¹…µ”¥ôƒ
Üƒ²^³¶Z$ƒªÊ÷®†pğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆø‘í}ÑÉ¥Á9¥¡ÑÍ1…‰•°¡ÑÉ¥À¥ôƒ
Üƒ²vó²‚T€‘íÑÉ¥À¹±•Ì¹±•¹Ñ¡÷ªÂpğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰ÑÉ¥ÀµÉ½ÕÑ”µ‰½‘äˆø‘í‰½‘åôğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰ÑÉ¥ÀµÉ½ÕÑ”µ±½Í”ˆû®.¯ªâÀğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥İÉ…À¹É•µ½Ù” ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÉ½ÕÑ”µ±½Í”œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùİÉ…À¹É•µ½Ù” ¤¤ì)ô((¼¼ƒŠRŠR ƒ®¶°ƒªÎ×²r€ƒŠRŠR )™Õ¹Ñ¥½¸}ÑÉ¥Á¹½‘”¡ÑÉ¥À¥ì(€½¹ÍĞ¼õí¸éÑÉ¥À¹¹…µ”±ÌéÑÉ¥À¹ÍÑ…ÉÑ…Ñ”±éÑÉ¥À¹‘…åÌ±°éÑÉ¥À¹±•Ì¹µ…À¡°ôø¡í¹¼é°¹ÑÉ…¥¹9¼±˜é°¹™É½µMÑ¸±Ğé°¹Ñ½MÑ¸±‘Àé°¹‘•ÁQ¥µ”±…Èé°¹…ÉÉQ¥µ”±‘äé°¹‘…ä±ÍŒé°¹Í•…Ñ±…ÍÌ±Áàé°¹Á…ÍÍ•¹•É½Õ¹Ğ±‘Œé°¹‘¥Í½Õ¹Ññğ¹½¹”ô¤¥ôì(€ÑÉåíÉ•ÑÕÉ¸‰Ñ½„¡Õ¹•Í…Á”¡•¹½‘•UI%½µÁ½¹•¹Ğ¡)M=8¹ÍÑÉ¥¹¥™ä¡¼¤¤¤¤íõ…Ñ ¡”¥íÉ•ÑÕÉ¸€œœíô)ô)™Õ¹Ñ¥½¸}ÑÉ¥Á•½‘”¡ÍÑÈ¥ì(€ÑÉåí½¹ÍĞ¼õ)M=8¹Á…ÉÍ”¡‘•½‘•UI%½µÁ½¹•¹Ğ¡•Í…Á”¡…Ñ½ˆ¡ÍÑÈ¤¤¤¤íÉ•ÑÕÉ¸€¡¼˜™ÉÉ…ä¹¥ÍÉÉ…ä¡¼¹°¤¤ı¼é¹Õ±°íõ…Ñ ¡”¥íÉ•ÑÕÉ¸¹Õ±°íô)ô)™Õ¹Ñ¥½¸Í¡…É•QÉ¥À¡ÑÉ¥Á%¥ì(€½¹ÍĞÑÉ¥Àõ±½…‘QÉ¥ÁÌ ¤¹™¥¹¡ĞôùĞ¹¥ôôõÑÉ¥Á%¤ì¥˜ …ÑÉ¥À¥É•ÑÕÉ¸ì(€¥˜ …ÑÉ¥À¹±•Ì¹±•¹Ñ ¥í…±•ÉĞ ŸªÎ×²rƒ¶V€ƒ²vó²‚W²vĞƒ²^²*×®.#®.¸ƒ®¢ó²‚ ƒ²^Ó²Â£®–ğƒ®.Ó²V²ó²ã²jP¸œ¤íÉ•ÑÕÉ¸íô(€½¹ÍĞÕÉ°õ±½…Ñ¥½¸¹½É¥¥¸­±½…Ñ¥½¸¹Á…Ñ¡¹…µ”¬œÑÉ¥Àôœ­}ÑÉ¥Á¹½‘”¡ÑÉ¥À¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ¡…É”µİÉ…Àœ¤ü¹É•µ½Ù” ¤ì(€½¹ÍĞİÉ…Àõ‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ìİÉ…À¹¥ôÑÉ¥ÀµÍ¡…É”µİÉ…Àœì(€İÉ…À¹ÍÑå±”¹ÍÍQ•áĞôÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ĞèÀíèµ¥¹‘•àèäØÀÀí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰½àµÍ¥é¥¹œé‰½É‘•Èµ‰½àœì(€İÉ…À¹¥¹¹•É!Q50õ€ñ‘¥ØÍÑå±”ô‰Á½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ĞèÀí‰…­É½Õ¹éÉ‰„ À°À°À°¸Ø¤ˆøğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀˆÍÑå±”ô‰Á½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”íÑÉ…¹Í™½É´é¹½¹”íÑ½Àé…ÕÑ¼í±•™Ğé…ÕÑ¼íİ¥‘Ñ èÄÀÀ”íµ…àµİ¥‘Ñ èĞĞÁÁàˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÑ¥Ñ±”ˆûÂ~R\ƒ²^³¶Z$ƒ®¶°ƒªÎ×²r€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰…±…É´µÁ½ÁÕÀµÍÕˆˆø‘í}Ñ•ÍŒ¡ÑÉ¥À¹¹…µ”¥ôƒ
Üƒ²vó²‚T€‘íÑÉ¥À¹±•Ì¹±•¹Ñ¡÷ªÂpğ½‘¥Øø(€€€€€€ñÀÍÑå±”ô‰™½¹ĞµÍ¥é”èÄÉÁàí½±½ÈéÙ…È ´µÑ•áĞÌ¤íµ…É¥¸èÄÁÁà€À€ÙÁàˆû²vĞƒ®¶³®–ğƒ²^Ó®¦Ğƒ²®2®Â§²v`€Ÿ®
Ğƒ²^³¶Z$Ÿ²^@ƒ²vĞƒ²vó²‚W²vĞƒªŞã®2®†pƒ²ÚSªÂ®B§®.#®.¸ğ½Àø(€€€€€€ñÑ•áÑ…É•„¥ô‰ÑÉ¥ÀµÍ¡…É”µÕÉ°ˆÉ•…‘½¹±ä±…ÍÌô‰ÑÉ¥Àµ™½É´µ¥¹ÁÕĞˆÍÑå±”ô‰¡•¥¡ĞèÜÙÁàíÉ•Í¥é”é¹½¹”í™½¹Ğµ™…µ¥±äéÙ…È ´µµ½¹¼¤í™½¹ĞµÍ¥é”èÄÄ¸ÕÁàˆ½¹±¥¬ô‰Ñ¡¥Ì¹Í•±•Ğ ¤ˆø‘í}Ñ•ÍŒ¡ÕÉ°¥ôğ½Ñ•áÑ…É•„ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸‰Ñ¸µÁÉ¥µ…Éäˆ¥ô‰ÑÉ¥ÀµÍ¡…É”µ½ÁäˆÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èíµ…É¥¸µÑ½ÀèÄÉÁàˆûÂ~N,ƒ®¶°ƒ®Î×²
°ğ½‰ÕÑÑ½¸ø(€€€€€€‘í¹…Ù¥…Ñ½È¹Í¡…É”üœñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ¥ô‰ÑÉ¥ÀµÍ¡…É”µ¹…Ñ¥Ù”ˆÍÑå±”ô‰İ¥‘Ñ èÄÀÀ”í©ÕÍÑ¥™äµ½¹Ñ•¹Ğé•¹Ñ•Èíµ…É¥¸µÑ½ÀèáÁàˆûÂ~NƒªÎ×²rƒ¶VcªâÀğ½‰ÕÑÑ½¸øœèœô(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰…±…É´µÁ½ÁÕÀµ±½Í”ˆ¥ô‰ÑÉ¥ÀµÍ¡…É”µ±½Í”ˆû®.¯ªâÀğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€ì(€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡İÉ…À¤ì(€İÉ…À¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùí¥˜¡”¹Ñ…É•ĞôôõİÉ…Áññ”¹Ñ…É•ĞôôõİÉ…À¹™¥ÉÍÑ±•µ•¹Ñ¡¥±¥İÉ…À¹É•µ½Ù” ¤íô¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ¡…É”µ±½Í”œ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùİÉ…À¹É•µ½Ù” ¤¤ì(€‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ¡…É”µ½Áäœ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì(€€€½¹ÍĞÑ„õ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ¡…É”µÕÉ°œ¤ìÑ„¹Í•±•Ğ ¤ì(€€€½¹ÍĞ‘½¹”ô ¤ôù}ÑÉ¥ÁQ½…ÍĞ ŸÂ~R\ƒ®¶³®–ğƒ®Î×²
³¶Z#²*×®.#®.œ¤ì(€€€¥˜¡¹…Ù¥…Ñ½È¹±¥Á‰½…É˜™¹…Ù¥…Ñ½È¹±¥Á‰½…É¹İÉ¥Ñ•Q•áĞ¤¹…Ù¥…Ñ½È¹±¥Á‰½…É¹İÉ¥Ñ•Q•áĞ¡ÕÉ°¤¹Ñ¡•¸¡‘½¹”¤¹…Ñ   ¤ôùíÑÉåí‘½Õµ•¹Ğ¹•á•½µµ…¹ ½Áäœ¤í‘½¹” ¤íõ…Ñ ¡”¥íõô¤ì(€€€•±Í”ìÑÉåí‘½Õµ•¹Ğ¹•á•½µµ…¹ ½Áäœ¤í‘½¹” ¤íõ…Ñ ¡”¥íôô(€ô¤ì(€½¹ÍĞ¹ˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ÑÉ¥ÀµÍ¡…É”µ¹…Ñ¥Ù”œ¤ì(€¥˜¡¹ˆ¤¹ˆ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì¹…Ù¥…Ñ½È¹Í¡…É”¡íÑ¥Ñ±”éo®
Ğƒ²^³¶Z%t€‘íÑÉ¥À¹¹…µ•õ€±Ñ•áĞé€‘íÑÉ¥À¹¹…µ•ôƒ²^³¶Z$ƒ²vó²‚W²vƒªÎ×²rƒ¶V§®.#®.‘€±ÕÉ±ô¤¹…Ñ   ¤ôùíô¤ìô¤ì)ô)™Õ¹Ñ¥½¸}µ…å‰•%µÁ½ÉÑM¡…É•‘QÉ¥À ¥ì(€½¹ÍĞ õ±½…Ñ¥½¸¹¡…Í¡ñğœœì½¹ÍĞ´õ ¹µ…Ñ  ½lŒ™uÑÉ¥Àô¡mx™t¬¤¼¤ì¥˜ …´¥É•ÑÕÉ¸ì(€½¹ÍĞ¼õ}ÑÉ¥Á•½‘”¡µlÅt¤ì(€ÑÉåí¡¥ÍÑ½Éä¹É•Á±…•MÑ…Ñ”¡¹Õ±°°œœ±±½…Ñ¥½¸¹Á…Ñ¡¹…µ”­±½…Ñ¥½¸¹Í•…É ¤íõ…Ñ ¡”¥íô(€¥˜ …¼¥ì…±•ÉĞ ŸªÎ×²r€ƒ®¶³®–ğƒ²v÷²vƒ²"`ƒ²^²*×®.#®.¸œ¤ìÉ•ÑÕÉ¸ìô(€¥˜ …½¹™¥É´¡ƒªÎ×²rƒ®Bpƒ²^³¶Z$€œ‘í¼¹¹ñğŸ²^³¶Z$ôŸ²v£®–ğ¤ƒ®
Ğƒ²^³¶Z'²^@ƒ²ÚSªÂ¶Vc².sªÊƒ²*×®.#ªæ0ıq¹q»²vó²‚T€‘í¼¹°¹±•¹Ñ¡÷ªÂpƒ
Ü€‘í¼¹‘ñğÅ÷²vñ€¤¥É•ÑÕÉ¸ì(€½¹ÍĞÑÉ¥Àõí¥é•¹QÉ¥Á% ¤±¹…µ”é¼¹¹ñğŸªÎ×²rƒ®Bpƒ²^³¶Z$œ±É•…Ñ•‘Ğé…Ñ”¹¹½Ü ¤±ÍÑ…ÉÑ…Ñ”é¼¹ÍññÑ½‘…å1½…±MÑÈ ¤±‘…åÌé5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌÀ±¼¹‘ñğÄ¤¤°(€€€±•Ìé¼¹°¹µ…À¡°ôùí½¹ÍĞĞõ•ÑQÉ…¥¹	å9¼¡°¹¹¼¥ññíôíÉ•ÑÕÉ¸í¥é•¹QÉ¥Á% ¤±ÑÉ…¥¹9¼é°¹¹¼±É…‘”éĞ¹É…‘•ñğœœ±±¥¹”éĞ¹±¥¹•ñğœœ±™É½µMÑ¸é°¹˜±Ñ½MÑ¸é°¹Ğ±‘•ÁQ¥µ”é°¹‘À±…ÉÉQ¥µ”é°¹…È±‘…äé°¹‘åñğÄ±‘…Ñ”èœœ±Í•…Ñ±…ÍÌé°¹Íñğ•¹•É…°œ±Í•…Ñ±…ÍÍ1…‰•°è¡MQ}1MMMm°¹Íuññíô¤¹±…‰•±ñğœœ±Á…ÍÍ•¹•É½Õ¹Ğé°¹ÁáñğÄ±‘¥Í½Õ¹Ğé°¹‘ñğ¹½¹”œ±Ñ¥­•Ñ%é¹Õ±±ôíô¥ôì(€}Íå¹1•…Ñ•Ì¡ÑÉ¥À¤ì(€½¹ÍĞÑÉ¥ÁÌõ±½…‘QÉ¥ÁÌ ¤ìÑÉ¥ÁÌ¹ÁÕÍ ¡ÑÉ¥À¤ìÍ…Ù•QÉ¥ÁÌ¡ÑÉ¥ÁÌ¤ì(€ÑÉåì½Á•¹5åA…” ¤ì½Á•¹5åM•Ñ¥½¸ µåÑÉ¥Àœ¤ì½Á•¹QÉ¥À¡ÑÉ¥À¹¥¤ìõ…Ñ ¡”¥íô(€}ÑÉ¥ÁQ½…ÍĞ¡ƒÂ~Ì€œ‘íÑÉ¥À¹¹…µ•ôœƒ²^³¶Z'²vƒ²ÚSªÂ¶Z#²*×®.#®.‘€¤ì)ô)¥˜¡‘½Õµ•¹Ğ¹É•…‘åMÑ…Ñ”ôôô±½…‘¥¹œœ¤‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È =5½¹Ñ•¹Ñ1½…‘•œ° ¤ôùíÑÉåí}µ…å‰•%µÁ½ÉÑM¡…É•‘QÉ¥À ¤íõ…Ñ ¡”¥íõô¤ì)•±Í”ìÑÉåí}µ…å‰•%µÁ½ÉÑM¡…É•‘QÉ¥À ¤íõ…Ñ ¡”¥íôô(