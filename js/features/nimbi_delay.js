// ═══════════════════════════════════════════════════════════════
// 🚦 님비레일 지연 예보·시뮬레이션 엔진 v2 (Dispatch Layer + Recovery Weight)
// ───────────────────────────────────────────────────────────────
// 기반  : 인게임 발췌 지연 예측(DELAY_MODEL) — 노선·등급별 확률/범위(주기반)
// 보정  : 구간 특성(전철 병행·혼잡) · 거리(소요) · 시간대(러시) · 요일/날씨(일 단위)
// 전파  : 편성 회차 연쇄(선행 편성 지연 상속) · 원인 추적/로그(발생→전파→회복→종착→회차)
// 성질  : 결정적(열차+운행일 시드) · 하루 단위 캐시 · 등급별 회복 운전(KTX>ITX>새마을>무궁화)
// 기상  : 맑음·안개·강풍·폭염·비·폭설·태풍 — 일 단위 결정, 서행·회복 저해 반영
// 분포  : 대부분 정시~2분, 3~10분 비교적 흔함, 10~20분 가끔, 30분+ 는 태풍·차량 고장 등 특수 상황만
// v2   : Dispatch Layer 2단계(승강장 + 선로), 회복 우선도 배수, 고속선 강화, 차량 고장 극단화
// ═══════════════════════════════════════════════════════════════

// ── 인게임 발췌 지연 예측 ──
const DELAY_MODEL=[
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
const _DELAY_DEFAULT={'KTX':{prob:22,min:2,max:6},'SRT':{prob:18,min:2,max:5},
  'ITX-새마을':{prob:35,min:4,max:13},'ITX-청춘':{prob:30,min:4,max:12},
  'ITX-마음':{prob:30,min:4,max:12},'남도해양':{prob:34,min:4,max:13},'국악와인':{prob:34,min:4,max:13},'무궁화호':{prob:38,min:5,max:15}};
function _delayGradeFamily(g){ if(/KTX/.test(g))return 'KTX'; if(g==='SRT')return 'SRT';
  if(g==='ITX-새마을')return 'ITX-새마을'; if(g==='ITX-청춘')return 'ITX-청춘';
  if(g==='ITX-마음')return 'ITX-마음'; if(g==='남도해양')return '남도해양'; if(g==='국악와인')return '국악와인'; return '무궁화호'; }
function _delayLevel(prob){ return prob<25?'low':prob<40?'med':'high'; }
function _delayForecast(line,grade){
  const fam=_delayGradeFamily(grade);
  const parts=(line||'').split('·').map(s=>s.trim());
  let best=null;
  DELAY_MODEL.forEach(d=>{ const sp=d.name.lastIndexOf(' '); const dl=d.name.slice(0,sp), dg=d.name.slice(sp+1);
    if(dg===fam&&parts.includes(dl)){ if(!best||d.prob>best.prob)best=d; } });
  const base=best?{prob:best.prob,min:best.min,max:best.max}:(_DELAY_DEFAULT[fam]||_DELAY_DEFAULT['무궁화호']);
  const lv=_delayLevel(base.prob);
  return {prob:base.prob,min:base.min,max:base.max,level:lv,
    color:lv==='low'?'#3fb950':lv==='med'?'#f97316':'#f85149',
    label:lv==='low'?'낮음':lv==='med'?'보통':'높음'};
}

// ── 시드/공용 ──
let _simDelayOn=(()=>{try{return localStorage.getItem('nimbi_simdelay')==='1';}catch(e){return false;}})();
function _simCalendarDayKey(d){
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
}
function _simTrainCrossesMidnight(t){
  if(!t||!t.stops)return false;
  let prev=null;
  for(const s of t.stops){
    const raw=toMin(hasTime(s.dep)?s.dep:s.arr);
    if(raw==null)continue;
    if(prev!=null&&raw<prev-60)return true;
    prev=raw;
  }
  return false;
}
// 일반 예측은 자정에 갱신하고, 전날 출발해 자정을 넘긴 열차만 04시까지 이전 운행일을 유지한다.
function _simDayKey(t){
  const d=new Date();
  if(t&&d.getHours()<4&&_simTrainCrossesMidnight(t))d.setDate(d.getDate()-1);
  return _simCalendarDayKey(d);
}
function _simServiceDate(t){
  const key=_simDayKey(t);
  return `${Math.floor(key/10000)}-${String(Math.floor(key/100)%100).padStart(2,'0')}-${String(key%100).padStart(2,'0')}`;
}
// 승차권의 이용일이 현재 지연 프로필의 운행일과 같을 때만 동적 지연을 연결한다.
// 전날 출발해 자정을 넘긴 열차는 04시까지 전날 이용일과 일치한다.
function _simTicketMatchesServiceDay(t,travelDate){
  return !!(t&&travelDate&&String(travelDate).slice(0,10)===_simServiceDate(t));
}
function _seededRand(seed){ const x=Math.sin(seed)*10000; return x-Math.floor(x); }
function _simSeed(no,dayKey){ const s=String(no)+':'+(dayKey||_simDayKey()); let h=2166136261;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/1000; }
function _simDaySeed(salt,dayKey){ return _seededRand((dayKey||_simDayKey())*0.000131+salt); }

// ── 오늘의 운행 컨텍스트(요일·날씨) — 네트워크 전체 상관 ──
let _simCtxCache={};
function _simLunarParts(d){
  try{
    const parts=new Intl.DateTimeFormat('en-u-ca-chinese',{month:'numeric',day:'numeric'}).formatToParts(d);
    return {
      month:Number(parts.find(p=>p.type==='month')?.value),
      day:Number(parts.find(p=>p.type==='day')?.value)
    };
  }catch(e){ return null; }
}
function _simIsKoreanHoliday(d){
  const md=(d.getMonth()+1)*100+d.getDate();
  if([101,301,505,606,815,1003,1009,1225].includes(md))return true;
  const lunar=_simLunarParts(d);
  if(lunar&&((lunar.month===1&&lunar.day<=2)||(lunar.month===4&&lunar.day===8)||(lunar.month===8&&lunar.day>=14&&lunar.day<=16)))return true;
  const tomorrow=new Date(d); tomorrow.setDate(d.getDate()+1);
  const nextLunar=_simLunarParts(tomorrow);
  return !!(nextLunar&&nextLunar.month===1&&nextLunar.day===1);
}

// ── 실제 시간대별 기상 예보 (Open-Meteo, 키 불필요) ──
// 주요 권역 예보를 한 번에 받아 열차가 해당 지역을 지나는 시각에만 기상 영향을 준다.
const _REAL_WX_REGIONS=[
  {name:'수도권',lat:37.5665,lon:126.9780},{name:'강원',lat:37.7519,lon:128.8761},
  {name:'충청',lat:36.3504,lon:127.3845},{name:'전북',lat:35.8242,lon:127.1480},
  {name:'광주·전남',lat:35.1595,lon:126.8526},{name:'대구·경북',lat:35.8714,lon:128.6014},
  {name:'부산·경남',lat:35.1796,lon:129.0756},{name:'제주',lat:33.4996,lon:126.5312}
];
const _REAL_WX_CACHE_KEY='nimbi_real_weather_v1';
let _realWx=null,_realWxPromise=null,_realWxVersion=0,_realWxTimer=null;
const _SIM_RECORD_KEY='nimbi_delay_records_v1';
let _simRecordSaveTimer=null,_simBoundaryTimer=null;
let _simRecords=(()=>{
  try{
    const value=JSON.parse(localStorage.getItem(_SIM_RECORD_KEY)||'{}');
    return value&&typeof value==='object'?value:{};
  }catch(e){return {};}
})();
function _simValidRecordDays(){
  const now=new Date(),days=new Set([_simCalendarDayKey(now)]);
  if(now.getHours()<4){
    const prev=new Date(now);prev.setDate(prev.getDate()-1);
    days.add(_simCalendarDayKey(prev));
  }
  return days;
}
function _simPruneRecords(){
  const valid=_simValidRecordDays();
  const current=String(_simCalendarDayKey(new Date()));
  let changed=false;
  Object.keys(_simRecords).forEach(day=>{
    if(!valid.has(Number(day))){delete _simRecords[day];changed=true;return;}
    if(day!==current){
      // 자정~04시에는 전날 기록 중 실제로 자정을 넘겨 운행하는 편성만 유지한다.
      if(typeof getTrainByNo!=='function')return;
      Object.keys(_simRecords[day]||{}).forEach(no=>{
        const train=getTrainByNo(no);
        if(!train||!_simTrainCrossesMidnight(train)){delete _simRecords[day][no];changed=true;}
      });
      if(!Object.keys(_simRecords[day]||{}).length){delete _simRecords[day];changed=true;}
    }
  });
  if(changed)_simSaveRecords();
}
function _simSaveRecords(){
  if(_simRecordSaveTimer)return;
  _simRecordSaveTimer=setTimeout(()=>{
    _simRecordSaveTimer=null;
    try{localStorage.setItem(_SIM_RECORD_KEY,JSON.stringify(_simRecords));}catch(e){}
  },400);
}
function _simRecordFor(t,create){
  const day=String(_simDayKey(t));
  if(!_simRecords[day]&&create)_simRecords[day]={};
  if(!_simRecords[day])return null;
  if(!_simRecords[day][t.no]&&create)_simRecords[day][t.no]={values:[],confirmed:-1,done:false};
  return _simRecords[day][t.no]||null;
}
function _simConfirmActual(t,pr,actual,nm){
  let last=-1;
  // 각 역의 실제 통과·도착 예정시각까지 지난 뒤에만 해당 값을 확정한다.
  for(let i=0;i<pr.m.length;i++)if(pr.m[i]+(actual[i]||0)<=nm)last=i;
  if(nm>=pr.lastM+(actual[actual.length-1]||0))last=pr.m.length-1;
  let record=_simRecordFor(t,false);
  // 운행 전 열차를 단순 조회한 것만으로 빈 기록을 대량 저장하지 않는다.
  if(last<0)return record||{values:[],confirmed:-1,done:false};
  if(!record)record=_simRecordFor(t,true);
  let changed=false;
  for(let i=record.confirmed+1;i<=last;i++){
    record.values[i]=Math.max(0,Math.round(actual[i]||0));
    changed=true;
  }
  if(last>record.confirmed){record.confirmed=last;changed=true;}
  if(last===pr.m.length-1&&!record.done){record.done=true;changed=true;}
  if(changed){record.updatedAt=Date.now();_simSaveRecords();}
  return record;
}
_simPruneRecords();
function _scheduleSimBoundary(){
  if(_simBoundaryTimer)clearTimeout(_simBoundaryTimer);
  const now=new Date();
  const midnight=new Date(now);midnight.setHours(24,0,0,0);
  const four=new Date(now);
  if(now.getHours()<4)four.setHours(4,0,0,0);
  else{four.setDate(four.getDate()+1);four.setHours(4,0,0,0);}
  const next=midnight<four?midnight:four;
  _simBoundaryTimer=setTimeout(()=>{
    _simPruneRecords();
    _simCtxCache={};_simProfileCache={};_simViewCache={};_dispCache={};_simVehCache={};
    if(typeof renderDailyDiscovery==='function')renderDailyDiscovery();
    if(typeof _journeyNo!=='undefined'&&_journeyNo&&typeof _renderJourney==='function')_renderJourney();
    _scheduleSimBoundary();
  },Math.max(1000,next.getTime()-now.getTime()));
}
_scheduleSimBoundary();
function _wxConfig(weather){
  return ({
    '맑음':{weather:'맑음',probMult:1,magMult:1,bigCap:15,recW:1,sagGate:0,sagLabel:null,wxBig:false},
    '안개':{weather:'안개',probMult:1.1,magMult:1.05,bigCap:13,recW:.9,sagGate:.26,sagLabel:'안개 서행',wxBig:false},
    '강풍':{weather:'강풍',probMult:1.22,magMult:1.25,bigCap:22,recW:.76,sagGate:.38,sagLabel:'강풍 서행',wxBig:true},
    '폭염':{weather:'폭염',probMult:1.1,magMult:1.1,bigCap:15,recW:.88,sagGate:.24,sagLabel:'폭염 레일온도 서행',wxBig:false},
    '비':{weather:'비',probMult:1.16,magMult:1.18,bigCap:20,recW:.78,sagGate:.34,sagLabel:'우천 서행',wxBig:true},
    '폭우':{weather:'폭우',probMult:1.55,magMult:1.65,bigCap:34,recW:.5,sagGate:.68,sagLabel:'폭우 서행',wxBig:true},
    '폭설':{weather:'폭설',probMult:1.35,magMult:1.4,bigCap:30,recW:.55,sagGate:.55,sagLabel:'폭설 제설 지연',wxBig:true},
    '태풍':{weather:'태풍',probMult:1.7,magMult:1.9,bigCap:42,recW:.4,sagGate:.78,sagLabel:'태풍 서행',wxBig:true}
  })[weather]||null;
}
function _wxClassify(v){
  const p=+(v.precipitation||0), rain=+(v.rain||0)+ +(v.showers||0), snow=+(v.snowfall||0);
  const gust=+(v.wind_gusts_10m||0), temp=+(v.temperature_2m||0), feel=+(v.apparent_temperature||0);
  const vis=v.visibility==null?99999:+v.visibility, code=+(v.weather_code||0), pop=+(v.precipitation_probability||0);
  let weather='맑음',score=0;
  if(snow>=1||[75,77,85,86].includes(code)){weather='폭설';score=75+Math.min(20,snow*4);}
  else if(p>=15||rain>=15||(code>=95&&p>=8)){weather='폭우';score=80+Math.min(19,p);}
  else if(gust>=70){weather='강풍';score=68+Math.min(20,(gust-70)/3);}
  else if(Math.max(temp,feel)>=35){weather='폭염';score=55+Math.min(15,Math.max(temp,feel)-35);}
  else if(p>=.5||rain>=.5||pop>=60||code>=51&&code<=82){weather='비';score=35+Math.min(25,p*3)+pop*.08;}
  else if(vis<1000||code===45||code===48){weather='안개';score=30+Math.min(20,(1000-vis)/50);}
  return Object.assign(_wxConfig(weather),{score,precipitation:p,rain,snowfall:snow,gust,temp,pop,visibility:vis,code});
}
function _wxCoord(name){
  if(typeof STATION_DB==='undefined'||!name)return null;
  const d=STATION_DB[name]||STATION_DB[name+'역']||(name.endsWith('역')?STATION_DB[name.slice(0,-1)]:null);
  return d&&d.lat!=null&&d.lon!=null?{lat:+d.lat,lon:+d.lon}:null;
}
function _wxNearestRegion(coord){
  if(!coord||!_realWx?.regions?.length)return null;
  let best=null,bd=Infinity;
  for(const r of _realWx.regions){
    const d=(coord.lat-r.lat)**2+((coord.lon-r.lon)*Math.cos(coord.lat*Math.PI/180))**2;
    if(d<bd){bd=d;best=r;}
  }
  return best;
}
function _realWxAt(name,minOfDay,dayKey){
  if(!_realWx||_realWx.day!==(dayKey||_simDayKey()))return null;
  const reg=_wxNearestRegion(_wxCoord(name)); if(!reg)return null;
  const hour=Math.max(0,Math.min(23,Math.floor((((minOfDay||0)%1440)+1440)%1440/60)));
  const wx=reg.hours?.[hour]; return wx?Object.assign({region:reg.name,hour},wx):null;
}
function _realWxContext(t){
  const dayKey=_simDayKey(t);
  if(!_realWx||_realWx.day!==dayKey)return null;
  if(!t)return Object.assign({weatherSource:'실제 예보'},_realWx.peak);
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  let peak=null,sumP=0,sumM=0,n=0;
  for(const s of timed){
    const tm=toMin(hasTime(s.arr)?s.arr:s.dep), wx=_realWxAt(s.s,tm,dayKey);
    if(!wx)continue;
    sumP+=wx.probMult;sumM+=wx.magMult;n++;
    if(!peak||wx.score>peak.score)peak=wx;
  }
  if(!peak)return null;
  // 한 시간의 국지성 폭우가 노선 전체를 과장하지 않도록 최고 위험과 노선 평균을 함께 반영한다.
  return Object.assign({},peak,{
    probMult:Math.max(1,(sumP/n)*.55+peak.probMult*.45),
    magMult:Math.max(1,(sumM/n)*.55+peak.magMult*.45),
    weatherSource:'실제 예보'
  });
}
function _parseRealWxResponse(raw,day){
  const list=Array.isArray(raw)?raw:[raw],regions=[];
  list.forEach((x,ri)=>{
    const h=x?.hourly||{},hours=Array.from({length:24},()=>_wxClassify({}));
    (h.time||[]).forEach((ts,i)=>{
      if(!String(ts).startsWith(String(day).slice(0,4)+'-'))return;
      const datePart=String(ts).slice(0,10).replace(/-/g,'');
      if(+datePart!==day)return;
      const hr=+String(ts).slice(11,13); if(hr<0||hr>23)return;
      const v={}; ['precipitation_probability','precipitation','rain','showers','snowfall','weather_code','temperature_2m','apparent_temperature','wind_gusts_10m','visibility'].forEach(k=>v[k]=h[k]?.[i]);
      hours[hr]=_wxClassify(v);
    });
    const meta=_REAL_WX_REGIONS[ri]||{name:`권역 ${ri+1}`,lat:+x.latitude,lon:+x.longitude};
    regions.push({name:meta.name,lat:meta.lat,lon:meta.lon,hours});
  });
  let peak=null;
  regions.forEach(r=>r.hours.forEach((wx,h)=>{if(!peak||wx.score>peak.score)peak=Object.assign({region:r.name,hour:h},wx);}));
  return {day,regions,peak:Object.assign({region:'전국',hour:12},_wxConfig('맑음'),peak||{}),fetchedAt:Date.now()};
}
function _applyRealWx(data){
  _realWx=data;_realWxVersion++;
  _simCtxCache={};
  // 새 예보의 날짜에 해당하는 프로필만 다시 계산한다. 자정 이후에도 04시까지
  // 유지되어야 하는 전날 출발 심야 열차의 기록은 캐시에서 보존한다.
  const keptProfiles={};
  Object.keys(_simProfileCache||{}).forEach(key=>{
    const profileDay=Number(key.slice(key.lastIndexOf(':')+1));
    if(profileDay!==data.day)keptProfiles[key]=_simProfileCache[key];
  });
  _simProfileCache=keptProfiles;
  _dispCache={};
  if(typeof _simViewCache!=='undefined')_simViewCache={};
  try{localStorage.setItem(_REAL_WX_CACHE_KEY,JSON.stringify(data));}catch(e){}
  if(typeof renderDailyDiscovery==='function')renderDailyDiscovery();
  const de=document.getElementById('result-delay'); if(de&&de.offsetParent!==null&&typeof renderSIDelay==='function')renderSIDelay(de);
  if(typeof _journeyNo!=='undefined'&&_journeyNo&&typeof _renderJourney==='function')_renderJourney();
  if(typeof _siBoardName!=='undefined'&&_siBoardName&&typeof _drawStationBoard==='function')_drawStationBoard();
  if(typeof updateMapTrains==='function')updateMapTrains();
}
function _loadRealWeather(){
  if(_realWxPromise)return _realWxPromise;
  const day=_simDayKey();
  try{
    const saved=JSON.parse(localStorage.getItem(_REAL_WX_CACHE_KEY)||'null');
    if(saved?.day===day&&Date.now()-saved.fetchedAt<3*60*60*1000)_realWx=saved;
  }catch(e){}
  const lat=_REAL_WX_REGIONS.map(r=>r.lat).join(','),lon=_REAL_WX_REGIONS.map(r=>r.lon).join(',');
  const hourly='precipitation_probability,precipitation,rain,showers,snowfall,weather_code,temperature_2m,apparent_temperature,wind_gusts_10m,visibility';
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourly}&forecast_days=1&timezone=Asia%2FSeoul`;
  _realWxPromise=fetch(url).then(r=>{if(!r.ok)throw new Error(`weather ${r.status}`);return r.json();})
    .then(raw=>{const data=_parseRealWxResponse(raw,day);_applyRealWx(data);return data;})
    .catch(()=>_realWx)
    .finally(()=>{_realWxPromise=null;});
  return _realWxPromise;
}
function _realWxNeedsRefresh(){
  if(!_realWx?.fetchedAt)return true;
  const fetched=new Date(_realWx.fetchedAt),now=new Date();
  return fetched.getFullYear()!==now.getFullYear()||fetched.getMonth()!==now.getMonth()||
    fetched.getDate()!==now.getDate()||fetched.getHours()!==now.getHours();
}
function _scheduleRealWeatherRefresh(){
  if(_realWxTimer)clearTimeout(_realWxTimer);
  const now=new Date(),next=new Date(now);
  next.setHours(now.getHours()+1,0,0,0);
  _realWxTimer=setTimeout(()=>{
    _loadRealWeather().finally(_scheduleRealWeatherRefresh);
  },Math.max(1000,next.getTime()-now.getTime()));
}
function _simDayContext(t){
  const day=_simDayKey(t);
  const cacheKey=day+':'+(t?.no||'network')+':'+_realWxVersion;
  if(_simCtxCache[cacheKey])return _simCtxCache[cacheKey];
  const d=new Date(Math.floor(day/10000),Math.floor(day/100)%100-1,day%100);
  const dow=d.getDay(), holiday=_simIsKoreanHoliday(d), weekend=(dow===0||dow===6||holiday);
  const realWx=_realWxContext(t);
  if(realWx){
    const rushMult=weekend?1.12:1.5;
    return (_simCtxCache[cacheKey]=Object.assign({day,dow,weekend,holiday,rushMult},realWx));
  }
  const w=_simDaySeed(3.71,day);
  const mo=d.getMonth()+1;
  const CUT= (mo>=6&&mo<=8)?[0.45,0.50,0.58,0.74,0.955,0.955]
           : (mo>=3&&mo<=5)?[0.58,0.68,0.78,0.80,0.93,0.995]
           : (mo>=9&&mo<=10)?[0.60,0.72,0.80,0.82,0.96,0.96]
           : (mo===11)?[0.58,0.70,0.79,0.81,0.92,0.99]
           : [0.50,0.60,0.72,0.72,0.80,1.0];
  let wx;
  if(w<CUT[0])      wx={weather:'맑음', probMult:1.0, magMult:1.0, bigCap:15, recW:1.0, sagGate:0,    sagLabel:null,               wxBig:false};
  else if(w<CUT[1]) wx={weather:'안개', probMult:1.1, magMult:1.05,bigCap:13, recW:0.9, sagGate:0.26, sagLabel:'안개 서행',        wxBig:false};
  else if(w<CUT[2]) wx={weather:'강풍', probMult:1.18,magMult:1.2, bigCap:20, recW:0.8, sagGate:0.34, sagLabel:'강풍 서행',        wxBig:true};
  else if(w<CUT[3]) wx={weather:'폭염', probMult:1.1, magMult:1.1, bigCap:15, recW:0.88,sagGate:0.24, sagLabel:'폭염 레일온도 서행', wxBig:false};
  else if(w<CUT[4]) wx={weather:'비',   probMult:1.15,magMult:1.15,bigCap:20, recW:0.8, sagGate:0.32, sagLabel:'우천 서행',        wxBig:true};
  else if(w<CUT[5]) wx={weather:'폭설', probMult:1.35,magMult:1.4, bigCap:30, recW:0.55,sagGate:0.55, sagLabel:'폭설 제설 지연',    wxBig:true};
  else              wx={weather:'태풍', probMult:1.7, magMult:1.9, bigCap:42, recW:0.4, sagGate:0.78, sagLabel:'태풍 서행',        wxBig:true};
  const rushMult=weekend?1.12:1.5;
  return (_simCtxCache[cacheKey]=Object.assign({day,dow,weekend,holiday,rushMult,weatherSource:'시뮬레이션'},wx));
}
if(typeof fetch==='function'){
  _loadRealWeather();
  _scheduleRealWeatherRefresh();
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&_realWxNeedsRefresh())_loadRealWeather();
    if(document.visibilityState==='visible'){
      _simPruneRecords();
      _scheduleSimBoundary();
      _scheduleRealWeatherRefresh();
    }
  });
}
function _isRush(minOfDay){ const h=Math.floor((((minOfDay%1440)+1440)%1440)/60); return (h>=7&&h<9)||(h>=18&&h<20); }

// ── 등급별 운행 특성: 회복률(역간 여유 시분 활용률)·선로 우선권 ──
function _gradeOps(grade){
  if(/KTX|SRT/.test(grade))   return {rec:[0.50,0.70], prio:3};
  if(/^ITX/.test(grade))      return {rec:[0.30,0.50], prio:2};
  if(/새마을/.test(grade))     return {rec:[0.20,0.40], prio:1};
  return {rec:[0.10,0.30], prio:0};
}

// 경부선 남안양~평택은 ITX와 무궁화호·전철이 서로 다른 선로를 사용한다.
// 두 끝점이 모두 이 구간 안에 있을 때만 분리 선로 예외를 적용한다.
const _SIM_KB_SEPARATE_TRACK=new Set(['남안양','수원','오산','평택']);
function _isKbSeparateTrackSection(a,b){
  return _SIM_KB_SEPARATE_TRACK.has(a)&&_SIM_KB_SEPARATE_TRACK.has(b);
}
function _segmentTrackGroup(t,a,b){
  if(!_isKbSeparateTrackSection(a,b))return 'shared';
  return /^ITX-(?:새마을|마음|청춘)$/.test(t.grade||'')?'kb-itx':'kb-local';
}
function _sameSegmentTrack(aTrain,bTrain,from,to){
  const a=_segmentTrackGroup(aTrain,from,to),b=_segmentTrackGroup(bTrain,from,to);
  return a==='shared'||b==='shared'||a===b;
}
function _segmentOrderHold(leaderStart,leaderDelay,followerStart,followerDelay){
  return Math.min(15,Math.max(0,
    Math.ceil(leaderStart+leaderDelay+1-(followerStart+followerDelay))
  ));
}
function _metroParallelApplies(t,a,b){
  // 이 구간의 ITX는 전철과 선로를 공유하지 않으므로 전철 혼잡 지연을 받지 않는다.
  return !(_isKbSeparateTrackSection(a,b)&&/^ITX-(?:새마을|마음|청춘)$/.test(t.grade||''));
}

// ── 혼잡/전철 병행 모델 ──
let _simModelCache=null;
function _simModel(){
  if(_simModelCache)return _simModelCache;
  const EXC=new Set(['남안양','수원','오산','평택','천안']);
  const lineSets=[];
  if(typeof METRO_LINES!=='undefined')METRO_LINES.forEach(l=>{
    const set=new Set();
    (l.routes||[{stations:l.stations}]).forEach(r=>r.stations.forEach(n=>{ if(!EXC.has(n))set.add(n); }));
    if(set.size)lineSets.push(set);
  });
  return _simModelCache={lineSets};
}
function _paxScore(name){ return (typeof STATION_PAX!=='undefined'&&STATION_PAX[name])?STATION_PAX[name]/100:0; }
function _metroParSections(timed){
  const {lineSets}=_simModel();
  const secN=timed.length-1;
  const par=new Array(Math.max(0,secN)).fill(false);
  const S=timed.map(s=>s.s);
  for(const set of lineSets){
    let j=0;
    while(j<S.length){
      if(set.has(S[j])){ let k=j; while(k+1<S.length&&set.has(S[k+1]))k++;
        if(k-j+1>=3){ for(let s=j;s<k;s++)par[s]=true; } j=k+1; }
      else j++;
    }
  }
  return par;
}
const _SIM_CONG_REF=280, _SIM_REC_RATE=0.12, _SIM_REC_CAP=1.5, _SIM_REC_HARD=1.2;

// ── 편성 회차 선행열차 맵(같은 날 연쇄 지연) ──
let _simRotPredCache=null,_simRotSuccCache=null;
function _simRotPred(){
  if(_simRotPredCache)return _simRotPredCache;
  const pred={};
  if(typeof CONFIRMED_ROTATION!=='undefined')Object.values(CONFIRMED_ROTATION).forEach(r=>{
    const seq=r.seq||[]; for(let i=1;i<seq.length;i++)pred[seq[i]]=seq[i-1]; });
  return _simRotPredCache=pred;
}
function _simRotSucc(){
  if(_simRotSuccCache)return _simRotSuccCache;
  const succ={};
  if(typeof CONFIRMED_ROTATION!=='undefined')Object.values(CONFIRMED_ROTATION).forEach(r=>{
    const seq=r.seq||[]; for(let i=0;i<seq.length-1;i++)succ[seq[i]]=seq[i+1]; });
  return _simRotSuccCache=succ;
}
function _turnaroundBuffer(pt, t){
  const pl=pt.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const tf=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(!pl.length||!tf.length)return null;
  const pLast=pl[pl.length-1], tFirst=tf[0];
  const a=toMin(hasTime(pLast.arr)?pLast.arr:pLast.dep), b=toMin(hasTime(tFirst.dep)?tFirst.dep:tFirst.arr);
  if(a==null||b==null)return null;
  let buf=b-a; if(buf<0)buf+=1440;
  return buf>240?null:buf;
}

// ── 단선 구간(인게임 상 유일): 영동선 영주~소천 ──
const _SIM_SINGLE_TRACK=new Set(['영주','봉화','법전','춘양','소천']);
const _MP_SPARSE=new Set(['옥천','이원','심천','영동','황간','추풍령']);
// 통과선 미보유 역 (무정차 통과도 승강장 점유 가능)
const _NO_PASS_TRACK=new Set(['사천','추풍령','석포','승부','소천','법전','홍성','율촌','춘양','남악','일로','시종','영암','작천','장흥','별량','입실','불국사']);
function _isSingleTrack(a,b){ return _SIM_SINGLE_TRACK.has(a)&&_SIM_SINGLE_TRACK.has(b); }

// ── 지연 원인 태그 ──
// 다른 열차가 전제되는 대피·추월·선행열차·통과대기 원인은 독립 난수로 만들지 않는다.
// 실제 원인 열차의 지연으로 시각·승강장이 겹칠 때 _dispatchInfo()에서만 생성한다.
const _CAUSE_MISC=['신호 대기','운전 정리 지시','승강장 혼선'];
function _sectionCause(rush, metroPar, congHi, ctx, r, singleTrack, prio){
  if(singleTrack && r<0.7) return '단선 교행 대기';
  if(ctx.sagGate && r<ctx.sagGate) return ctx.sagLabel;
  if(rush) return '출퇴근 승객 집중';
  if(metroPar) return '전철 병행 구간 혼잡';
  if(congHi) return '승차 혼잡';
  return _CAUSE_MISC[Math.floor(r*_CAUSE_MISC.length)%_CAUSE_MISC.length];
}
function _isBigCause(cause, ctx){
  if(cause==='단선 교행 대기')return true;
  if(cause===ctx.sagLabel)return !!ctx.wxBig;
  return false;
}
// ── 회복 우선도 배수 시스템 ──
function _recoveryWeight(delayMins){
  if(delayMins<2)    return 0.8;  // 0~2분
  if(delayMins<5)    return 1.0;  // 3~5분
  if(delayMins<10)   return 1.3;  // 6~10분
  if(delayMins<15)   return 1.7;  // 11~15분
  if(delayMins<20)   return 2.2;  // 16~20분
  if(delayMins<30)   return 2.7;  // 21~30분
  return 3.0;                     // 31분 이상
}

// ── 고속선 구간 판정 ──
function _isHighSpeedSection(lineStr){
  if(!lineStr)return false;
  return /고속선|강릉|중앙(?!선 무)/i.test(lineStr);
}

// ── 지연 프로파일(핵심) ── 역별 누적 지연 cd[] + 원인/로그
let _simProfileCache={};
function _simProfile(t){
  const key=t.no+':'+_simDayKey(t);
  if(_simProfileCache[key])return _simProfileCache[key];
  _simProfileCache[key]={cd:[],m:[],firstM:null,lastM:null,predictedFlag:false,cause:null,events:[]};
  return _simProfileCache[key]=_computeProfile(t);
}
function _simOutlookEstimate(t,profile){
  const pr=profile||_simProfile(t);
  // 기본 프로필이 아니라 현재 시점의 관측·변동·돌발상황이 반영된 표시 배열을 사용한다.
  // 지나온 구간은 확정값, 남은 구간은 10분 단위로 갱신되는 전망값이다.
  let values=(_simDelayOn&&pr.cd.length)?_simViewArr(t):pr.cd;
  const positiveEvents=(pr.events||[]).filter(e=>e.delta>0);
  if(positiveEvents.length&&positiveEvents.every(e=>e.cause==='출퇴근 승객 집중')){
    const rushCap=Math.min(6,Math.max(1,Math.ceil(positiveEvents.reduce((sum,e)=>sum+e.delta,0))));
    values=values.map(v=>Math.min(v,rushCap));
  }
  const finalDelay=values.length?Math.max(0,Math.round(values[values.length-1])):0;
  const maxDelay=values.length?Math.max(0,...values.map(v=>Math.round(v))):0;
  const estimatedDelay=Math.max(finalDelay,maxDelay);
  const lo=estimatedDelay>0?Math.max(1,Math.round(estimatedDelay*0.6)):0;
  const hi=estimatedDelay>0?Math.max(lo+2,Math.round(estimatedDelay*1.25)):0;
  const rangeText=estimatedDelay<=0?'0분':estimatedDelay<5?`${estimatedDelay}분 내외`:`${lo}~${hi}분`;
  return {finalDelay,maxDelay,estimatedDelay,lo,hi,rangeText};
}

// 승객 화면용 지연 분석 요약.
// 기존 시뮬레이션 프로필의 원인 이벤트를 재사용해 별도 예측 모델을 만들지 않는다.
function _delayPassengerInsight(t){
  const forecast=_delayForecast(t.line,t.grade);
  const profile=_simProfile(t);
  const positives=(profile.events||[]).filter(e=>e.delta>0);
  // 실제 선행 열차와 충돌해 발생한 연쇄 지연도 같은 기여도 표에 합산한다.
  const relational=(typeof _dispatchInfo==='function'?_dispatchInfo(t).events:[])
    .filter(e=>e.delta>0);
  const totals=new Map();
  positives.concat(relational).forEach(e=>totals.set(e.cause,(totals.get(e.cause)||0)+e.delta));
  const total=[...totals.values()].reduce((sum,v)=>sum+v,0);
  const causes=[...totals.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,4)
    .map(([name,value])=>({
      name,
      minutes:Math.max(1,Math.round(value)),
      share:total>0?Math.max(1,Math.round(value/total*100)):0
    }));
  if(!causes.length){
    causes.push({name:'정상 운행 여건',minutes:0,share:100});
  }

  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const modeled=DELAY_MODEL.some(d=>{
    const cut=d.name.lastIndexOf(' ');
    return (t.line||'').split('·').includes(d.name.slice(0,cut))
      && _delayGradeFamily(t.grade)===d.name.slice(cut+1);
  });
  let confidence=58+(modeled?18:0)+Math.min(14,Math.floor(timed.length/4));
  if(profile.weather&&profile.weather!=='맑음')confidence-=5;
  confidence=Math.max(45,Math.min(92,confidence));
  const confidenceLabel=confidence>=80?'높음':confidence>=65?'보통':'참고';
  const estimate=_simOutlookEstimate(t,profile);
  const finalDelay=estimate.finalDelay;
  const maxDelay=estimate.maxDelay;
  const estimatedDelay=estimate.estimatedDelay;
  let passengerSummary='현재 예측상 승객 여정에 미치는 영향은 거의 없습니다.';
  if(finalDelay>0){
    passengerSummary=finalDelay<=3
      ?`도착이 약 ${finalDelay}분 늦어질 수 있으나 환승·약속에는 큰 영향이 적습니다.`
      :finalDelay<=10
        ?`도착이 약 ${finalDelay}분 늦어질 수 있어 짧은 환승은 여유 시간을 확인하세요.`
        :`도착이 약 ${finalDelay}분 늦어질 수 있어 환승·약속 시간을 재조정하는 편이 안전합니다.`;
  }else if(estimatedDelay>0){
    passengerSummary=`운행 중 최대 ${maxDelay}분가량 늦어질 수 있지만 종착 전 대부분 회복될 전망입니다.`;
  }else if(forecast.prob>=35){
    passengerSummary=`지연 가능성은 ${forecast.prob}% 수준이지만 현재 시뮬레이션에서는 정시 운행이 예상됩니다.`;
  }
  return {forecast,profile,causes,confidence,confidenceLabel,finalDelay,maxDelay,
    estimatedDelay,delayRange:estimate.rangeText,passengerSummary};
}

function _computeProfile(t){
  const empty={cd:[],m:[],firstM:null,lastM:null,predictedFlag:false,cause:null,events:[]};
  const f=_delayForecast(t.line,t.grade);
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  if(timed.length<2||!f.prob)return empty;
  let off=0,prev=-1;const m=[];
  for(const s of timed){ const rm=toMin(hasTime(s.dep)?s.dep:s.arr);
    if(rm==null){m.push(m.length?m[m.length-1]:0);continue;}
    if(prev>=0&&rm<prev-60)off+=1440; m.push(rm+off); prev=rm; }
  const ctx=_simDayContext(t);
  _simModel();
  const secN=timed.length-1;
  const metroParArr=_metroParSections(timed).map((v,i)=>
    v&&_metroParallelApplies(t,timed[i].s,timed[i+1]?.s)
  );
  let ms=0,cs=0; for(let i=0;i<timed.length;i++){cs+=_paxScore(timed[i].s);if(i<secN&&metroParArr[i])ms++;}
  const metroFrac=ms/Math.max(1,secN), congNorm=Math.min(1,cs/Math.max(1,timed.length));
  const causeFactor=0.6+0.9*(0.5*metroFrac+0.5*congNorm);
  const runMin=Math.max(1,m[m.length-1]-m[0]);
  const lenFactor=Math.min(1, runMin/180);
  const effProb=Math.min(96, f.prob*causeFactor*(0.4+0.6*lenFactor)*ctx.probMult*(ctx.weekend?0.9:1));
  const seed=_simSeed(t.no,_simDayKey(t));
  const r1=_seededRand(seed+0.137), r4=_seededRand(seed+11.2), rSev=_seededRand(seed+2.23);
  const flagged=r1*100<effProb, surprise=!flagged&&r4<0.07*lenFactor*ctx.probMult;
  const sevRoll=Math.min(1, rSev*(ctx.probMult>1.2?1.35:1));
  const severity=surprise?0.3:(sevRoll<0.55?0.35:sevRoll<0.85?0.7:1.0);

  // 회차 연쇄
  let inherited=0;
  const predNo=_simRotPred()[t.no];
  if(predNo){ const pt=(typeof ALL_TRAINS!=='undefined')&&getTrainByNo(predNo);
    if(pt){ const pp=_simProfile(pt); const pf=(pp.cd&&pp.cd.length)?pp.cd[pp.cd.length-1]:0;
      if(pf>0){ const buf=_turnaroundBuffer(pt,t); if(buf!=null) inherited=Math.max(0, pf-Math.max(3,buf)); } } }

  const events=[];
  const cd=[Math.round(inherited)];
  let dominant=null;
  if(inherited>0){ events.push({idx:0,delta:Math.round(inherited),cause:'전 편성 회차 지연(원인 열차 '+predNo+')'}); dominant='회차 지연'; }

  const go=_gradeOps(t.grade);
  const recFrac=go.rec[0]+(go.rec[1]-go.rec[0])*_seededRand(seed+4.44);
  const prioMult=[1.25,1.1,1.0,0.85][go.prio];
  const dwell=timed.map(s=>{const a=toMin(s.arr),d=toMin(s.dep);
    return (a!=null&&d!=null)?((d-a+1440)%1440):0;});

  if(flagged||surprise||inherited>0){
    const bigUnit=(flagged?Math.max(0.6,(f.max||6)/11):0.6)*(0.6+0.4*lenFactor)*severity*ctx.magMult;
    const smallUnit=0.45+0.5*severity;
    const evBase=(flagged?Math.min(0.34,effProb/100*0.45+0.06):0.05)*(0.6+0.5*severity)*prioMult;
    let cur=inherited, recTotal=0;
    let mpN=0, mpLast=-999, mpSp=false;
    let rushN=0, rushLast=-999;
    for(let i=0;i<secN;i++){
      const dt=Math.max(1,m[i+1]-m[i]);
      const tod=((m[i]%1440)+1440)%1440;
      const metroSvc=(tod>=310||tod<=30);
      const metroPar=metroParArr[i]&&metroSvc;
      const singleTrack=_isSingleTrack(timed[i].s, timed[i+1].s);
      const cong=_paxScore(timed[i].s);
      const congHi=cong>0.6;
      const rush=ctx.weekend?false:_isRush(m[i]);
      const localWx=_realWxAt(timed[i+1].s,m[i+1],ctx.day);
      const secCtx=localWx?Object.assign({},ctx,localWx):ctx;
      const localProb=localWx?Math.max(.7,Math.min(1.9,localWx.probMult/Math.max(1,ctx.probMult))):1;
      const localMag=localWx?Math.max(.75,Math.min(1.8,localWx.magMult/Math.max(1,ctx.magMult))):1;
      const exposure=Math.min(1, 0.4*(metroPar?1:0)+0.5*cong+(rush?0.2:0)+(singleTrack?0.3:0));
      const ra=_seededRand(seed+i*2.7+0.5), rb=_seededRand(seed+i*2.7+1.9), rc=_seededRand(seed+i*2.7+3.3), rd=_seededRand(seed+i*2.7+5.1);
      const pInc=evBase*(0.35+exposure*1.3)*localProb;
      let inc=0, cause=null;
      if(ra<pInc){
        cause=_sectionCause(rush, metroPar, congHi, secCtx, rd, singleTrack, go.prio);
        inc=_isBigCause(cause,secCtx) ? bigUnit*localMag*(0.6+rb)
          :                            smallUnit*(0.5+0.6*rb);
        if(cause==='출퇴근 승객 집중'){
          // 평일 러시아워에만 선택되며, 한 역 최대 2분·열차당 최대 3회로 과도한 누적을 막는다.
          inc=Math.min(2,inc);
          if(!rush || rushN>=3 || (m[i]-rushLast)<10){inc=0;cause=null;}
          else {rushN++;rushLast=m[i];}
        }
        if(cause==='전철 병행 구간 혼잡'){
          const sparse=_MP_SPARSE.has(timed[i].s)||_MP_SPARSE.has(timed[i+1].s);
          if(mpN>=4 || (m[i]-mpLast)<10 || (sparse&&mpSp)){ inc=0; cause=null; }
          else { mpN++; mpLast=m[i]; if(sparse)mpSp=true; }
        } }

      // ═══ v2: 회복 운전 강화 (회복 우선도 배수) ═══
      let rec=0, dcut=0;
      const arrivalDelay=Math.max(0,cur+inc);
      // 1분이라도 지연된 상태로 2분 이상 정차하는 역은 항상 1분 단축한다.
      // 최소 정차 1분은 보장한다.
      const canCut=arrivalDelay>0&&dwell[i+1]>=2;
      if(canCut)dcut=Math.min(1,dwell[i+1]-1,arrivalDelay);
      if(arrivalDelay>0 && inc===0){
        const recW=_recoveryWeight(Math.round(cur));
        const urg=Math.min(1, Math.pow(cur/40, 0.6));
        const gate=(0.15+0.8*urg)*secCtx.recW*(0.9+0.05*go.prio)*recW;
        let runRec=0, recHard=_SIM_REC_HARD;
        if(rc<gate){
          // ─ 고속선 회복 강화 ─
          const inHS=_isHighSpeedSection(t.line)&&(/KTX|SRT/.test(t.grade));
          if(inHS){
            if(cur>=6&&cur<10)  recHard=2.0;
            else if(cur>=10)    recHard=3.0;
          }
          runRec=Math.min(0.16*dt*recFrac, 0.8)*(0.5+0.5*rc)*secCtx.recW;
        }
        rec=Math.min(arrivalDelay,runRec+dcut,Math.max(recHard,dcut));
      } else {
        rec=dcut;
      }
      cur=Math.max(0, Math.min(ctx.bigCap, cur+inc-rec));
      cd.push(cur); recTotal+=rec;
      if(inc>=0.5&&cause){ events.push({idx:i+1,delta:+inc.toFixed(1),cause}); if(!dominant||inc>2)dominant=dominant&&inc<=2?dominant:cause; }
      if(rec>=0.5) events.push({idx:i+1,delta:-+rec.toFixed(1),cause:dcut>=0.3?'정차시간 단축':'회복 운전'});
    }
    if(!dominant){ const anyInc=events.find(e=>e.delta>0); dominant=anyInc?anyInc.cause:null; }
    var _recTotal=recTotal;
  } else { for(let i=0;i<secN;i++)cd.push(0); var _recTotal=0; }

  return {cd:cd.map(v=>Math.round(v)), m, firstM:m[0], lastM:m[m.length-1],
    predictedFlag:flagged, cause:dominant, events, weather:ctx.weather,
    inheritedFrom:(inherited>0&&predNo)?predNo:null, recovered:Math.round(_recTotal)};
}

// ══ 하이브리드 상태 시스템 ══
function _svMin(m){ return ((m-240)%1440+1440)%1440; }
function _simNowM(){ const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function _simNowFor(pr){ let nm=_simNowM();
  if(pr.lastM>=1440&&nm<pr.firstM){ const sh=nm+1440; if(nm<240||sh<=pr.lastM)nm=sh; }
  return nm; }

// ── Dispatch Layer v2: 승강장 점유 ──
let _platIdxCache=null,_platIdxDay=null;
function _platIndex(){
  const day=_simDayKey();
  if(_platIdxCache&&_platIdxDay===day)return _platIdxCache;
  const idx={};
  if(typeof ALL_TRAINS!=='undefined'&&typeof REAL_PLAT!=='undefined')ALL_TRAINS.forEach(u=>{
    const rp=REAL_PLAT[u.no]; if(!rp)return;
    const timed=u.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
    timed.forEach((s,i)=>{
      const p=rp[s.s]; if(p==null)return;
      const dep=toMin(hasTime(s.dep)?s.dep:s.arr); if(dep==null)return;
      (idx[s.s+':'+p]=idx[s.s+':'+p]||[]).push({no:u.no,idx:i,dep:_svMin(dep)});
    });
  });
  Object.values(idx).forEach(a=>a.sort((x,y)=>x.dep-y.dep));
  return (_platIdxDay=day,_platIdxCache=idx);
}

// 같은 방향의 동일 역간 구간을 운행하는 열차를 예정 진입 시각순으로 모은다.
// 정차·통과 여부와 관계없이 시간표에 시각이 있는 지점을 사용한다.
let _segmentIdxCache=null,_segmentIdxDay=null;
function _segmentIndex(){
  const day=_simDayKey();
  if(_segmentIdxCache&&_segmentIdxDay===day)return _segmentIdxCache;
  const idx={};
  if(typeof ALL_TRAINS!=='undefined')ALL_TRAINS.forEach(u=>{
    const timed=u.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
    for(let i=0;i<timed.length-1;i++){
      const from=timed[i],to=timed[i+1];
      const startRaw=toMin(hasTime(from.dep)?from.dep:from.arr);
      const endRaw=toMin(hasTime(to.arr)?to.arr:to.dep);
      if(startRaw==null||endRaw==null)continue;
      let start=_svMin(startRaw),end=_svMin(endRaw);
      if(end<start)end+=1440;
      const key=from.s+'>'+to.s;
      (idx[key]=idx[key]||[]).push({no:u.no,idx:i,start,end,duration:end-start});
    }
  });
  Object.values(idx).forEach(a=>a.sort((x,y)=>x.start-y.start||x.end-y.end));
  return (_segmentIdxDay=day,_segmentIdxCache=idx);
}

// 무정차 통과 판정
function _isPassStop(t, stnName){
  if(!t.stops)return false;
  const raw=t.stops.find(x=>x.s===stnName);
  if(raw&&(raw.arr==='통과'||raw.dep==='통과'))return true;
  const valid=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const vi=valid.findIndex(x=>x.s===stnName);
  if(vi<=0||vi>=valid.length-1)return false;
  const s=valid[vi];
  if(s.arr==='통과'||s.dep==='통과')return true;
  return (hasTime(s.arr)&&!hasTime(s.dep))||(!hasTime(s.arr)&&hasTime(s.dep));
}

function _priorRealStopIndex(t,timed,idx){
  for(let i=idx;i>=0;i--)if(!_isPassStop(t,timed[i].s))return i;
  return -1;
}

let _dispCache={};
function _dispatchInfo(t){
  const key=t.no+':'+_simDayKey(t);
  if(_dispCache[key])return _dispCache[key];
  const pr=_simProfile(t);
  const out={adj:null,events:[]};
  // 다른 열차의 연쇄 지연을 조회할 때 순환 참조가 생기지 않도록 먼저 등록한다.
  _dispCache[key]=out;
  if(!pr.cd.length)return out;
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  let adj=null,hits=0;

  // 1) 동일 승강장 점유 충돌
  const rp=(typeof REAL_PLAT!=='undefined')&&REAL_PLAT[t.no];
  if(rp){
    const idx=_platIndex();
    for(let i=1;i<timed.length&&hits<2;i++){
      if(_isPassStop(t,timed[i].s))continue;
      const p=rp[timed[i].s]; if(p==null)continue;
      const arrRaw=toMin(hasTime(timed[i].arr)?timed[i].arr:timed[i].dep); if(arrRaw==null)continue;
      // 앞 구간에서 이미 받은 연쇄 지연까지 포함한 실제 도착 예정 시각으로 비교한다.
      const myArr=_svMin(arrRaw)+(pr.cd[i]||0)+(adj?.[i]||0);
      const list=idx[timed[i].s+':'+p]; if(!list)continue;
      for(const u of list){
        if(u.no===t.no)continue;
        const gap=_svMin(arrRaw)-u.dep;
        if(gap<0||gap>=45)continue;
        const ut=getTrainByNo(u.no); if(!ut)continue;
        const isPassStopU=_isPassStop(ut, timed[i].s);
        // 통과 열차와 정차 열차의 추월 관계는 아래 역간 순서 계층에서만 처리한다.
        if(isPassStopU)continue;
        const ucd=_simActualArr(ut); const ud=ucd[u.idx]||0; if(ud<=0)continue;
        const overlap=(u.dep+ud)-myArr;
        if(overlap<0)continue;
        const w=Math.min(10,Math.ceil(overlap)+1);
        if(!adj)adj=new Array(pr.cd.length).fill(0);
        for(let j=i;j<pr.cd.length;j++)adj[j]+=Math.max(0,w-(j-i));
        const cause='선행 열차 연쇄 지연';
        out.events.push({
          m:pr.m[i]||0,idx:i,delta:w,cause,sourceNo:ut.no,
          txt:`${timed[i].s} ${p}번 승강장 점유 대기 · 원인 열차 ${ut.grade} ${ut.no} +${w}분`
        });
        hits++;break;
      }
    }
  }

  // 2) 역간 진입 순서 충돌
  // 빠른 선행 열차가 지연되어 후속 열차보다 늦게 구간에 들어오고,
  // 다음 역 전까지 실제 추월하게 될 때만 후속 열차를 직전 역에서 기다리게 한다.
  // 다음 역에서 나란히 도착해 정상적으로 추월할 수 있으면 연쇄 지연을 만들지 않는다.
  const segIdx=_segmentIndex();
  let segmentHits=0;
  for(let i=0;i<timed.length-1&&segmentHits<3;i++){
    const from=timed[i],to=timed[i+1];
    const startRaw=toMin(hasTime(from.dep)?from.dep:from.arr);
    const endRaw=toMin(hasTime(to.arr)?to.arr:to.dep);
    if(startRaw==null||endRaw==null)continue;
    let myStart=_svMin(startRaw),myEnd=_svMin(endRaw);
    if(myEnd<myStart)myEnd+=1440;
    const list=segIdx[from.s+'>'+to.s]||[];
    for(const u of list){
      if(u.no===t.no)continue;
      const plannedLead=myStart-u.start;
      if(plannedLead<=-45||plannedLead>=45)continue;
      const ut=getTrainByNo(u.no);
      if(!ut||!_sameSegmentTrack(t,ut,from.s,to.s))continue;
      const currentDelay=(pr.cd[i]||0)+(adj?.[i]||0);
      const currentEndDelay=(pr.cd[i+1]||0)+(adj?.[i+1]||0);
      const sourceBase=_simProfile(ut).cd;
      const sourceActual=_simActualArr(ut);

      if(plannedLead<=0&&plannedLead>-45){
        // 예정상 앞선(같은 시각 포함) 빠른 현재 열차가 지연되어 완행 뒤로 밀리면,
        // 다음 대피 가능역까지 선행 완행과 최소 1분 간격을 유지한다.
        const faster=_gradeOps(t.grade).prio>_gradeOps(ut.grade).prio||
          (myEnd-myStart)<u.duration;
        const otherStartDelay=sourceBase[u.idx]||0;
        const myActualStart=myStart+currentDelay;
        const otherActualStart=u.start+otherStartDelay;
        if(faster&&myActualStart>otherActualStart){
          const otherActualEnd=u.end+(sourceBase[u.idx+1]||otherStartDelay);
          const myActualEnd=myEnd+currentEndDelay;
          const followDelay=Math.min(15,Math.max(0,Math.ceil(otherActualEnd+1-myActualEnd)));
          if(followDelay>0){
            if(!adj)adj=new Array(pr.cd.length).fill(0);
            for(let j=i+1;j<pr.cd.length;j++)adj[j]+=followDelay;
            out.events.push({
              m:pr.m[i+1]||0,idx:i+1,delta:followDelay,cause:'선행 열차 연쇄 지연',
              sourceNo:ut.no,followGap:true,
              txt:`${from.s}–${to.s} 간격 유지 · 선행 ${ut.grade} ${ut.no} +${followDelay}분`
            });
            segmentHits++;
            break;
          }
        }
      }

      if(plannedLead>=0&&plannedLead<45){
        // 예정상 먼저 진입하고, 더 빠르거나 우선등급인 열차만 선행 열차로 본다.
        if(u.duration>myEnd-myStart&&_gradeOps(ut.grade).prio<=_gradeOps(t.grade).prio)continue;
        if(plannedLead===0&&u.duration>=myEnd-myStart&&
          _gradeOps(ut.grade).prio<=_gradeOps(t.grade).prio)continue;
        const sourceDelay=sourceActual[u.idx]||0;
        if(sourceDelay<=0)continue;
        const sourceEnd=u.end+(sourceActual[u.idx+1]||sourceDelay);
        const myActualEnd=myEnd+currentEndDelay;
        // 운암→언양 예시처럼 다음 역 도착이 같으면 그 역에서 정상적으로 추월할 수 있다.
        if(sourceEnd>=myActualEnd)continue;
        // 추풍령처럼 대피할 수 없는 역에서는 완행을 세우지 않고 빠른 열차가 다음 역까지 따른다.
        if(_NO_PASS_TRACK.has(from.s))continue;
        const hold=_segmentOrderHold(u.start,sourceDelay,myStart,currentDelay);
        if(hold<=0)continue;
        const holdIdx=_priorRealStopIndex(t,timed,i);
        if(holdIdx<0)continue;
        if(!adj)adj=new Array(pr.cd.length).fill(0);
        for(let j=holdIdx;j<pr.cd.length;j++)adj[j]+=hold;
        out.events.push({
          m:pr.m[holdIdx]||0,idx:holdIdx,delta:hold,cause:'선행 열차 연쇄 지연',
          sourceNo:ut.no,holdAtStop:true,conflictAt:from.s,
          txt:`${timed[holdIdx].s} 정차 대기 · ${from.s}–${to.s} 순서 조정 · 선행 ${ut.grade} ${ut.no} +${hold}분`
        });
        segmentHits++;
        break;
      }
    }
  }
  // 연쇄 지연 상태로 도착한 뒤 2분 이상 정차하면 다음 역부터 1분을 반드시 회복한다.
  if(adj){
    const blockedAt=new Set(out.events.filter(e=>e.holdAtStop||e.followGap).map(e=>e.idx));
    for(let i=1;i<timed.length;i++){
      const a=toMin(timed[i].arr),d=toMin(timed[i].dep);
      const dwell=(a!=null&&d!=null)?((d-a+1440)%1440):0;
      if(dwell<2||adj[i]<=0||adj[i]<(adj[i-1]||0)||blockedAt.has(i))continue;
      for(let j=i;j<adj.length;j++)adj[j]=Math.max(0,adj[j]-1);
      out.events.push({m:pr.m[i]||0,idx:i,delta:-1,cause:"정차시간 단축",dispatchRecovery:true,
        txt:timed[i].s+" 정차시간 1분 단축 · 연쇄 지연 회복"});
    }
  }
  out.adj=adj;
  return out;
}

// ── v2: 차량 고장 극단화 (영업일 단위 Global Event) ──
let _vehDayCache={};
function _getVehicleFaultOfDay(day){
  day=day||_simDayKey();
  if(Object.prototype.hasOwnProperty.call(_vehDayCache,day))return _vehDayCache[day];
  const seed=_simSeed('vehicle_fault',day)*1000;
  const roll=_seededRand(seed);
  let result=null;
  if(roll<0.9945)  result=null;
  else if(roll<0.9985){
    result=[{affected:true}];
  } else {
    result=[{affected:true},{affected:true}];
  }
  if(result){
    if(typeof ALL_TRAINS!=='undefined'&&ALL_TRAINS.length){
      for(const fault of result){
        const idx=Math.floor(_seededRand(seed+Math.random())*ALL_TRAINS.length);
        const candTrain=ALL_TRAINS[idx];
        fault.trainNo=candTrain.no;
        fault.section=1+Math.floor(_seededRand(seed+fault.trainNo)*Math.max(1,candTrain.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep)).length-2));
        const typeRoll=_seededRand(seed+fault.section*0.71);
        if(typeRoll<0.3)     fault.type='출입문 점검', fault.amt=3+Math.floor(typeRoll*2/0.3*2);
        else if(typeRoll<0.5) fault.type='전장품 이상', fault.amt=5+Math.floor((typeRoll-0.3)*3/0.2);
        else if(typeRoll<0.75) fault.type='제동 계통 이상', fault.amt=7+Math.floor((typeRoll-0.5)*5/0.25);
        else if(typeRoll<0.92) fault.type='동력계 이상', fault.amt=10+Math.floor((typeRoll-0.75)*10/0.17);
        else fault.type='중대 차량 장애', fault.amt=20+Math.floor((typeRoll-0.92)*20/0.08);
      }
    }
  }
  return (_vehDayCache[day]=result);
}

let _simVehCache={};
function _simVeh(t){
  const day=_simDayKey(t);
  const key=t.no+':'+day;
  if(key in _simVehCache)return _simVehCache[key];
  let v=null;
  const faults=_getVehicleFaultOfDay(day);
  if(faults){
    const fault=faults.find(f=>f.trainNo===t.no);
    if(fault){
      const pr=_simProfile(t);
      if(pr.cd.length>fault.section&&fault.section>=0){
        v={sec:fault.section, amt:fault.amt, type:fault.type};
      }
    }
  }
  return _simVehCache[key]=v;
}

// Sched(계획 예측)
function _simSchedArr(t){
  const pr=_simProfile(t); const dis=_dispatchInfo(t);
  if(!dis.adj) return pr.cd;
  return pr.cd.map((v,i)=>v+(dis.adj[i]||0));
}

// Actual(실제)
function _simActualArr(t){
  const sched=_simSchedArr(t); const veh=_simVeh(t);
  if(!veh) return sched;
  const cap=_simDayContext(t).bigCap+veh.amt;
  return sched.map((v,i)=> i>=veh.sec ? Math.round(Math.min(cap, v+Math.max(0, veh.amt-(i-veh.sec)))) : v);
}

// 표시 배열 갱신 기준:
// 운행 전 30분 / 운행 중 역 통과 / 15분 초과 장거리 구간만 구간 내 10분 / 종료 후 고정.
let _simViewCache={};
function _simViewRevision(t,pr){
  const nm=_simNowFor(pr);
  // 실제 날씨는 매시 정각에 받고, 열차별 운행 전 전망은 00분·30분에 갱신한다.
  if(nm<pr.firstM)return `before:${Math.floor(nm/30)}`;
  const actual=_simActualArr(t),actualEnd=pr.lastM+(actual[actual.length-1]||0);
  if(nm>=actualEnd)return 'done';
  for(let i=0;i<pr.m.length-1;i++){
    if(nm>=pr.m[i]&&nm<pr.m[i+1]){
      const span=Math.max(1,pr.m[i+1]-pr.m[i]);
      return span>15?`segment:${i}:${Math.floor((nm-pr.m[i])/10)}`:`segment:${i}`;
    }
  }
  return `terminal:${Math.floor(nm/10)}`;
}
function _simViewArr(t){
  const pr=_simProfile(t); if(!pr.cd.length)return pr.cd;
  const revision=_simViewRevision(t,pr);
  const key=t.no+':'+_simDayKey(t)+':'+revision;
  if(_simViewCache[key])return _simViewCache[key];
  if(Object.keys(_simViewCache).length>5000)_simViewCache={};
  const nm=_simNowFor(pr);
  const ctx=_simDayContext(t);
  const dispatch=_dispatchInfo(t);
  const veh=_simVeh(t), vehOn=!!(veh&&pr.m[veh.sec]!=null&&nm>=pr.m[veh.sec]);
  const act=_simActualArr(t), sched=_simSchedArr(t);
  const record=_simConfirmActual(t,pr,act,nm);
  const seed=_simSeed(t.no,_simDayKey(t));
  let revSeed=2166136261;
  for(let i=0;i<revision.length;i++){revSeed^=revision.charCodeAt(i);revSeed=Math.imul(revSeed,16777619);}
  const vol=0.9+(ctx.probMult-1)*2.5;
  const out=new Array(pr.cd.length);
  let prev=null;
  for(let i=0;i<pr.cd.length;i++){
    const base=vehOn?act[i]:sched[i];
    if(i<=record.confirmed&&record.values[i]!=null){ out[i]=record.values[i]; }
    else if(pr.m[i]<=nm){ out[i]=base; }
    else{
      const conv=Math.min(1,(pr.m[i]-nm)/60);
      const r=_seededRand(seed+i*7.77+(revSeed>>>0)*0.00009131)-0.5;
      let v=base + r*2*vol*conv;
      if(prev!=null) v=Math.max(v, prev-_SIM_REC_HARD);
      // 원인 사건이 없는 미래 역에서는 변동 보정 때문에 회복한 지연이 다시 늘지 않는다.
      // 새 지연 사건이나 차량 장애가 실제로 배치된 역에서만 재증가를 허용한다.
      const dispatchInc=i>0&&(dispatch.adj?.[i]||0)>(dispatch.adj?.[i-1]||0);
      const events=pr.events||[], newEvent=events.find(e=>e.idx===i&&e.delta>=0.5);
      const justShortened=events.some(e=>e.idx===i-1&&e.delta<0&&e.cause==='정차시간 단축');
      const eventAllowed=!!newEvent&&(!justShortened||newEvent.delta>=2);
      const hasNewDelay=eventAllowed||(vehOn&&veh&&veh.sec===i)||dispatchInc;
      if(prev!=null&&!hasNewDelay)v=Math.min(v,prev);
      out[i]=Math.max(0, Math.round(v));
    }
    if(i>0&&pr.m[i]<=nm){
      const dispatchInc=(dispatch.adj?.[i]||0)>(dispatch.adj?.[i-1]||0);
      const events=pr.events||[], newEvent=events.find(e=>e.idx===i&&e.delta>=0.5);
      const justShortened=events.some(e=>e.idx===i-1&&e.delta<0&&e.cause==='정차시간 단축');
      const eventAllowed=!!newEvent&&(!justShortened||newEvent.delta>=2);
      const hasNewDelay=eventAllowed||(vehOn&&veh&&veh.sec===i)||dispatchInc;
      if(prev!=null&&!hasNewDelay)out[i]=Math.min(out[i],prev);
    }
    prev=out[i];
  }
  return _simViewCache[key]=out;
}

// ── 조회 API ──
function _simState(t,travelDate){
  if(!t||!_simDelayOn||(travelDate&&!_simTicketMatchesServiceDay(t,travelDate))){
    return {phase:'none',current:0,final:0,recorded:false};
  }
  const pr=_simProfile(t);
  if(!pr.cd.length)return {phase:'none',current:0,final:0,recorded:false};
  const now=new Date(),clock=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const nm=_simNowFor(pr),view=_simViewArr(t),record=_simRecordFor(t,false);
  const actualEnd=pr.lastM+(_simActualArr(t).slice(-1)[0]||0);
  const phase=nm<pr.firstM?'before':nm>=actualEnd?'done':'running';
  const current=phase==='before'?0:_simDelay(t,clock,travelDate);
  return {
    phase,current,
    final:view[view.length-1]||0,
    values:view,
    confirmedThrough:record?.confirmed??-1,
    recorded:!!record,
    serviceDate:_simServiceDate(t)
  };
}
function _simDelayAtStop(t, idx, travelDate){
  if(travelDate&&!_simTicketMatchesServiceDay(t,travelDate))return 0;
  if(!_simDelayOn||_simExpired(t))return 0;
  const cd=_simViewArr(t); return (idx>=0&&idx<cd.length)?cd[idx]:0;
}
// 정차시간 단축 역은 도착 후 1분을 회복해 출발한다.
// 선행 열차 대기 역은 정시(또는 기존 지연) 도착 후 정차를 늘려 출발 지연이 생긴다.
// 역별 누적 지연 배열은 출발 시점 값이므로 UI용 도착/출발 지연을 분리해 제공한다.
function _simDelayPairAtStop(t,idx){
  const dep=_simDelayAtStop(t,idx);
  if(!_simDelayOn||idx<=0||dep<=0)return {arr:dep,dep,shortened:false,held:false};
  const pr=_simProfile(t);
  const shortened=(pr.events||[]).some(e=>e.idx===idx&&e.delta<0&&e.cause==='정차시간 단축')||
    (_dispatchInfo(t).events||[]).some(e=>e.idx===idx&&e.dispatchRecovery);
  const held=(_dispatchInfo(t).events||[])
    .filter(e=>e.idx===idx&&e.holdAtStop)
    .reduce((sum,e)=>sum+(e.delta||0),0);
  if(held>0)return {arr:Math.max(0,dep-held),dep,shortened:false,held:true};
  if(!shortened)return {arr:dep,dep,shortened:false,held:false};
  const arr=dep+1;
  return {arr,dep,shortened:true,held:false};
}
function _simDelay(t, clock, travelDate){
  if(travelDate&&!_simTicketMatchesServiceDay(t,travelDate))return 0;
  if(!_simDelayOn||_simExpired(t)) return 0;
  const pr=_simProfile(t); const cd=_simViewArr(t); const {m,firstM,lastM}=pr;
  if(!cd.length||firstM==null) return 0;
  let nowM=clock;
  if(lastM>=1440&&clock<firstM){ const sh=clock+1440; if(clock<240||sh<=lastM)nowM=sh; }
  if(nowM<=firstM) return 0;
  if(nowM>=lastM) return cd[cd.length-1];
  for(let i=0;i<m.length-1;i++){
    if(nowM>=m[i]&&nowM<=m[i+1]){ const fr=(nowM-m[i])/Math.max(1,m[i+1]-m[i]); return Math.round(cd[i]+(cd[i+1]-cd[i])*fr); }
  }
  return cd[cd.length-1];
}
function _simFinalDelay(t,travelDate){
  if(travelDate&&!_simTicketMatchesServiceDay(t,travelDate))return 0;
  if(!_simDelayOn||_simExpired(t))return 0; const pr=_simProfile(t);
  const relational=_dispatchInfo(t);
  if((!pr.predictedFlag&&!relational.adj)||!pr.cd.length)return 0;
  const v=_simViewArr(t); return v[v.length-1]||0; }
function _liveDelayOf(t){
  if(!_simDelayOn)return 0;
  const n=new Date(); const nm=n.getHours()*60+n.getMinutes();
  const d=_simDelay(t, nm);
  if(d<=0)return 0;
  const st=(typeof getCurrentStatus==='function')?getCurrentStatus(t, nm-d):null;
  return (st&&st.status==='running')?d:0;
}
function _simCauseSummary(t){
  if(!_simDelayOn||_simExpired(t))return '';
  const pr=_simProfile(t);
  const causes=(pr.events||[]).concat(_dispatchInfo(t).events||[]);
  if(!causes.length)return '';
  const seen=[]; causes.filter(e=>e.delta>0).forEach(e=>{ if(!seen.includes(e.cause))seen.push(e.cause); });
  return seen.slice(0,2).join(' · ');
}
function _simEventLog(t){
  if(!_simDelayOn||_simExpired(t))return [];
  const pr=_simProfile(t); if(!pr.cd.length)return [];
  const timed=t.stops.filter(s=>hasTime(s.arr)||hasTime(s.dep));
  const fmt=mm=>{const v=(((mm%1440)+1440)%1440);return String(Math.floor(v/60)).padStart(2,'0')+':'+String(Math.round(v%60)).padStart(2,'0');};
  const lines=(pr.events||[]).map(e=>({m:pr.m[e.idx]||0, s:(()=>{
    const st=timed[e.idx]?timed[e.idx].s:'';
    const clk=pr.m[e.idx]!=null?fmt(pr.m[e.idx]+(e.delta>0?e.delta:0)):'';
    if(e.delta>0)return `[${clk}] ${st} · ${e.cause} +${Math.round(e.delta)}분`;
    return `[${clk}] ${st} · ${e.cause||'운전 정리'} −${Math.max(1,Math.abs(Math.round(e.delta)))}분`;
  })()}));
  const covered=new Set((pr.events||[]).filter(e=>e.delta<0).map(e=>e.idx));
  for(let i=1;i<pr.cd.length;i++){
    const drop=pr.cd[i-1]-pr.cd[i];
    if(drop>0&&!covered.has(i))
      lines.push({m:pr.m[i]||0, s:`[${fmt(pr.m[i]||0)}] ${timed[i]?timed[i].s:''} · 회복 운전 −${drop}분`});
  }
  const nmL=_simNowFor(pr);
  const dis=_dispatchInfo(t);
  dis.events.forEach(e=>{ if(nmL>=e.m) lines.push({m:e.m, s:`[${fmt(e.m)}] ${e.txt}`}); });
  const peak=Math.max.apply(null,pr.cd), peakIdx=pr.cd.indexOf(peak);
  if(peak>=8){ const f=lines.find(x=>x.s.includes('회복 운전')&&x.m>(pr.m[peakIdx]||0));
    if(f) f.s=f.s.replace('회복 운전','관제 우선권 부여 · 회복 운전'); }
  const veh=_simVeh(t);
  if(veh&&pr.m[veh.sec]!=null&&_simNowFor(pr)>=pr.m[veh.sec])
    lines.push({m:pr.m[veh.sec], s:`[${fmt(pr.m[veh.sec])}] ${timed[veh.sec]?timed[veh.sec].s:''} · 차량 ${veh.type} +${veh.amt}분`});
  lines.sort((a,b)=>a.m-b.m);
  return lines.map(x=>x.s);
}
function _simDelayReport(t){
  if(!_simDelayOn||_simExpired(t))return null;
  const pr=_simProfile(t); if(!pr.cd||!pr.cd.length)return null;
  const view=_simViewArr(t),fin=view[view.length-1]||0;
  const incs=(pr.events||[]).concat(_dispatchInfo(t).events||[]).filter(e=>e.delta>0);
  if(!incs.length&&fin<=0&&!(pr.recovered>0))return null;
  const first=pr.inheritedFrom?`전 편성 회차 지연 (${pr.inheritedFrom} 열차)`:(incs[0]?incs[0].cause:null);
  const spread=[]; incs.forEach(e=>{ if(e.cause!==((incs[0]||{}).cause)&&e.cause!=='전 편성 회차 지연'&&!spread.includes(e.cause))spread.push(e.cause); });
  let affects=null;
  const succNo=_simRotSucc()[t.no];
  if(succNo&&fin>0&&typeof ALL_TRAINS!=='undefined'){
    const nt=getTrainByNo(succNo);
    if(nt){ const buf=_turnaroundBuffer(t,nt); if(buf!=null&&fin>Math.max(3,buf))affects=succNo; }
  }
  return {first, spread:spread.slice(0,3), recovered:pr.recovered||0, final:fin, affects};
}
function _simOutlook(limit){
  if(!_simDelayOn)return null;
  const ctx=_simDayContext();
  const rows=[];
  if(typeof ALL_TRAINS!=='undefined')ALL_TRAINS.forEach(t=>{
    const pr=_simProfile(t),relational=_dispatchInfo(t);
    if(!pr.predictedFlag&&!relational.adj)return;
    const estimate=_simOutlookEstimate(t,pr);
    if(estimate.estimatedDelay<3)return;
    rows.push({t,est:estimate.estimatedDelay,rangeText:estimate.rangeText,
      cause:(relational.events[0]?.cause)||pr.cause||null});
  });
  rows.sort((a,b)=>b.est-a.est);
  return {ctx, rows:rows.slice(0,limit||8), total:rows.length};
}
function _simExpired(t){
  // 프로필 캐시 키 자체가 운행일을 포함한다. 일반 열차는 자정, 자정을 넘기는
  // 열차는 04시에 새 키로 교체되므로 운행 종료 2시간 뒤 별도로 폐기하지 않는다.
  return false;
}
function _simRefundInfo(tk){
  if(!_simDelayOn||!tk)return null;
  const t=(typeof ALL_TRAINS!=='undefined')&&getTrainByNo(tk.trainNo); if(!t)return null;
  if(!_simTicketMatchesServiceDay(t,tk.travelDate))return null;
  const act=_simActualArr(t); const fin=act.length?act[act.length-1]:0;
  if(fin<30)return null;
  const f=_delayForecast(t.line,t.grade);
  if(f.level==='high'&&f.max>=15)return {eligible:false,reason:'예매 시 장시간 지연 예보 열차'};
  if(tk.bookedAt){ const d=new Date(tk.bookedAt); const pm=d.getHours()*60+d.getMinutes();
    if(_simDelay(t,pm)>=10)return {eligible:false,reason:'예매 시 이미 10분 이상 지연'}; }
  return {eligible:true, delay:fin};
}
