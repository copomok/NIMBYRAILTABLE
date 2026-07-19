// 실시간 가상 승차: 기존 시간표·지연·지도 추적 데이터를 하나의 승객 화면으로 결합한다.
(function(){
  let rideNo=null,rideTimer=null,windowMode=false;
  const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timedStops=t=>typeof _journeyStops==='function'?_journeyStops(t):t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));

  function progressOf(t,nowRaw){
    const stops=timedStops(t);if(stops.length<2)return 0;
    const first=stops[0].normDep??stops[0].normArr??toMin(stops[0].dep||stops[0].arr);
    const last=stops.at(-1).normArr??stops.at(-1).normDep??toMin(stops.at(-1).arr||stops.at(-1).dep);
    let now=nowRaw;if(last>=1440&&now<first)now+=1440;
    return Math.max(0,Math.min(1,(now-first)/Math.max(1,last-first)));
  }
  function stopContext(t,now){
    const stops=timedStops(t),status=getCurrentStatus(t,now);
    let nextIdx=0;
    if(status?.status==='done')nextIdx=stops.length-1;
    else if(status?.nextStn)nextIdx=Math.max(0,stops.findIndex(s=>s.s===status.nextStn));
    else if(status?.atStn){
      const i=stops.findIndex(s=>s.s===status.atStn);nextIdx=Math.min(stops.length-1,i+1);
    }else{
      const p=progressOf(t,now);nextIdx=Math.min(stops.length-1,Math.ceil(p*(stops.length-1)));
    }
    const next=stops[nextIdx],prev=stops[Math.max(0,nextIdx-1)];
    const arr=next?(next.normArr??next.normDep??toMin(next.arr||next.dep)):null;
    let eta=arr==null?null:Math.max(0,Math.round(arr-(arr>=1440&&now<240?now+1440:now)));
    return {stops,status,nextIdx,next,prev,eta};
  }
  function nearbyTrains(t,now,progress){
    const route=new Set(timedStops(t).map(s=>s.s));
    const rows=ALL_TRAINS.filter(u=>u.no!==t.no&&u.dir===t.dir&&timedStops(u).filter(s=>route.has(s.s)).length>=3)
      .map(u=>({t:u,p:progressOf(u,now)}))
      .filter(x=>getCurrentStatus(x.t,now)?.status==='running');
    const front=rows.filter(x=>x.p>progress).sort((a,b)=>a.p-b.p)[0]||null;
    const back=rows.filter(x=>x.p<progress).sort((a,b)=>b.p-a.p)[0]||null;
    return {front,back};
  }
  function oncomingTrains(t,now,ctx){
    if(!ctx.prev||!ctx.next)return [];
    return ALL_TRAINS.filter(u=>{
      if(u.dir===t.dir||getCurrentStatus(u,now)?.status!=='running')return false;
      const names=new Set(timedStops(u).map(s=>s.s));
      return names.has(ctx.prev.s)&&names.has(ctx.next.s);
    }).slice(0,4);
  }
  function landmarkOf(ctx){
    const name=ctx.next?.s||ctx.prev?.s||'다음 구간';
    const history=(typeof STATION_HISTORY!=='undefined')&&(STATION_HISTORY[name]||STATION_HISTORY[name+'역']);
    if(history)return {title:`${name} · 철도 이야기`,text:`${history.year}년 개업 · ${history.note}`};
    const station=(typeof STATION_DB!=='undefined')&&(STATION_DB[name]||STATION_DB[name+'역']);
    if(station?.addr)return {title:`곧 ${name}`,text:`차창 밖으로 ${station.addr} 일대를 지나고 있습니다.`};
    return {title:`곧 ${name}`,text:'다음 역 주변 풍경을 감상해 보세요. 도착 정보는 차내 전광판에서 실시간으로 갱신됩니다.'};
  }
  function neighborRow(label,item,base){
    if(!item)return `<div class="vr-neighbor"><span>${label}</span><span style="color:var(--text3)">운행 열차 없음</span></div>`;
    const gap=Math.max(1,Math.round(Math.abs(item.p-progressOf(base,new Date().getHours()*60+new Date().getMinutes()))*timedStops(base).length*6));
    return `<div class="vr-neighbor"><span>${label} · 약 ${gap}분 간격</span><button onclick="jumpToTrain('${esc(item.t.no)}')">${esc(item.t.grade)} ${esc(item.t.no)}</button></div>`;
  }
  function draw(){
    const body=document.getElementById('vr-body');if(!body||!rideNo)return;
    const t=getTrainByNo(rideNo);if(!t)return;
    const d=new Date(),now=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
    const delayed=(typeof _simDelay==='function')?_simDelay(t,now):0;
    const effective=now-delayed,progress=progressOf(t,effective),ctx=stopContext(t,effective);
    const color=(typeof GRADE_COLORS!=='undefined'&&GRADE_COLORS[t.grade])||'#58a6ff';
    const neighbors=nearbyTrains(t,effective,progress),oncoming=oncomingTrains(t,effective,ctx);
    const landmark=landmarkOf(ctx);
    const pos=ctx.status?.atStn?`${ctx.status.atStn}역 정차 중`
      :ctx.status?.status==='before'?'출발 준비 중'
      :ctx.status?.status==='done'?'운행 종료'
      :`${ctx.prev?.s||''} → ${ctx.next?.s||''} 운행 중`;
    const nextText=ctx.next?`${ctx.next.s}${ctx.eta!=null?` · 약 ${ctx.eta}분 후`:''}`:'종착역';
    const route=ctx.stops.map((s,i)=>{
      const cls=i<ctx.nextIdx?' done':i===ctx.nextIdx?' next':'';
      return `<i class="vr-stop${cls}"><span>${esc(s.s)}</span></i>`;
    }).join('');
    const oncomingRows=oncoming.length?oncoming.map(u=>`<div class="vr-neighbor"><span>⇄ ${esc(u.grade)} ${esc(u.no)}</span><button onclick="openJourney('${esc(u.no)}')">여정 보기</button></div>`).join('')
      :'<div class="vr-empty">현재 구간에 표시할 교행 열차가 없습니다.</div>';
    body.innerHTML=`
      <div class="vr-board">
        <div class="vr-board-top"><span>이번 열차는 ${esc(t.dest)}행 ${esc(t.grade)}입니다</span><span>${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}</span></div>
        <div class="vr-board-main">다음 역 · ${esc(nextText)}</div>
        <div class="vr-board-sub">현재 위치 ${esc(pos)}${delayed>0?` · 약 ${Math.round(delayed)}분 지연`:''}</div>
      </div>
      <div class="vr-window${windowMode?' on':''}">
        <div class="vr-landmark"><b>🪟 ${esc(landmark.title)}</b>${esc(landmark.text)}</div>
      </div>
      <div class="vr-route-card" style="--vr-color:${color}">
        <div class="vr-route-head"><b>움직이는 선형 노선도</b><span>${Math.round(progress*100)}% · ${esc(pos)}</span></div>
        <div style="overflow-x:auto"><div class="vr-linear">
          <div class="vr-linear-progress" style="width:calc((100% - 36px) * ${progress})"></div>
          <div class="vr-marker" style="left:calc(18px + (100% - 36px) * ${progress})">🚆</div>${route}
        </div></div>
      </div>
      <div class="vr-grid">
        <div class="vr-info-card"><div class="vr-info-title">앞·뒤 열차 비교</div>
          ${neighborRow('앞 열차',neighbors.front,t)}${neighborRow('뒤 열차',neighbors.back,t)}
          <button class="vr-icon-btn" style="width:100%;margin-top:7px" onclick="openTrainCompare('${esc(t.no)}')">⚖️ 상세 운행 비교</button>
        </div>
        <div class="vr-info-card"><div class="vr-info-title">현재 구간 교행 열차</div>${oncomingRows}</div>
      </div>`;
  }
  window.openVirtualRide=function(no){
    closeVirtualRide();rideNo=no;
    const t=getTrainByNo(no);if(!t)return;
    const overlay=document.createElement('div');overlay.id='vr-overlay';overlay.className='vr-overlay';
    overlay.innerHTML=`<div class="vr-shell">
      <div class="vr-head">
        <div class="vr-head-main"><b>${esc(t.grade)} ${esc(t.no)} · 실시간 가상 승차</b><span>${esc(t.stops[0]?.s)} → ${esc(t.dest)}</span></div>
        <span class="vr-live">LIVE</span>
        <button class="vr-icon-btn" onclick="toggleVirtualWindow()">🪟 차창</button>
        <button class="vr-icon-btn" onclick="closeVirtualRide();trackTrainOnMap('${esc(t.no)}')">🗺️ 실제 위치</button>
        <button class="vr-icon-btn" aria-label="가상 승차 닫기" onclick="closeVirtualRide()">✕</button>
      </div><div class="vr-body" id="vr-body"></div>
    </div>`;
    document.body.appendChild(overlay);document.body.style.overflow='hidden';draw();
    rideTimer=setInterval(draw,1000);
  };
  window.toggleVirtualWindow=function(){windowMode=!windowMode;draw();};
  window.closeVirtualRide=function(){
    if(rideTimer){clearInterval(rideTimer);rideTimer=null;}
    document.getElementById('vr-overlay')?.remove();rideNo=null;document.body.style.overflow='';
  };
})();
