// 2026-07-31 신설 지역열차 승강장 매핑.
// 사진에서 판독해 시간표 stop.p에 기록한 승강장을 역 정보 화면에서도
// 동일하게 사용하도록 REAL_PLAT에 확정 반영한다. 통과역은 매핑하지 않는다.
(()=>{
  if(typeof REAL_PLAT==='undefined'||typeof ALL_TRAINS==='undefined')return;
  const isRegionalTrain=no=>{
    const n=Number(no);
    return (n>=621&&n<=632)||
      (n>=1201&&n<=1236)||
      (n>=1241&&n<=1270)||
      (n>=4401&&n<=4428)||
      (n>=681&&n<=700)||
      (n>=801&&n<=828)||
      (n>=1885&&n<=1888)||   // 충주-남대구 ITX-마음
      (n>=4451&&n<=4458)||   // 경북순환 ITX-마음
      (n>=1331&&n<=1350)||
      (n>=1451&&n<=1454)||
      (n>=1501&&n<=1504)||
      (n>=1901&&n<=1918)||   // 강릉-대전 ITX-새마을
      (n>=2501&&n<=2534);    // 남도해양열차 번호 개정
  };

  // 사진의 한 방향 승강장을 반대 방향에 그대로 복사한 경우를 교정한다.
  // 같은 계통 상·하행이 같은 번호를 쓰는 역만 대상으로 삼고, 기존 열차 중
  // 해당 역의 진입·진출 방향과 운행 노선이 일치하는 사례의 가중 최빈값을 쓴다.
  // 시종착역과 단일 승강장역은 사진에 적힌 값을 그대로 보존한다.
  const family=grade=>/KTX/.test(grade||'')?'KTX':grade==='SRT'?'SRT':
    /^ITX/.test(grade||'')?'ITX':/새마을/.test(grade||'')?'새마을':'무궁화';
  const lineSet=train=>new Set(String(train.line||'').split('·'));
  const overlap=(a,b)=>{let n=0;for(const line of a)if(b.has(line))n++;return n;};
  const references=[];
  for(const train of ALL_TRAINS){
    if(isRegionalTrain(train.no))continue;
    const map=REAL_PLAT[train.no]||{};
    const lines=lineSet(train);
    train.stops.forEach((stop,index)=>{
      const platform=map[stop.s]??(stop.p==null?null:Number(stop.p));
      if(!Number.isFinite(platform))return;
      references.push({station:stop.s,platform,prev:train.stops[index-1]?.s,
        next:train.stops[index+1]?.s,lines,grade:family(train.grade)});
    });
  }
  const serviceKey=train=>`${family(train.grade)}|${[...(train.boundary||[])].sort().join('|')}`;
  const groups=new Map();
  for(const train of ALL_TRAINS){
    if(!isRegionalTrain(train.no))continue;
    const key=serviceKey(train);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(train);
  }
  const recommend=(train,index)=>{
    const stop=train.stops[index],prev=train.stops[index-1]?.s,next=train.stops[index+1]?.s;
    if(!prev||!next)return null;
    const lines=lineSet(train),scores=new Map(),counts=new Map();
    for(const ref of references){
      if(ref.station!==stop.s)continue;
      let score=overlap(lines,ref.lines)*4;
      if(ref.prev===prev)score+=18;
      if(ref.next===next)score+=18;
      if(ref.prev===prev&&ref.next===next)score+=20;
      if(ref.grade===family(train.grade))score+=5;
      if(score<12)continue;
      scores.set(ref.platform,(scores.get(ref.platform)||0)+score);
      counts.set(ref.platform,(counts.get(ref.platform)||0)+1);
    }
    const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
    if(!ranked.length)return null;
    const [platform,score]=ranked[0],second=ranked[1]?.[1]||0;
    if((counts.get(platform)||0)<2||score<30||score<second*1.2)return null;
    return platform;
  };
  for(const trains of groups.values()){
    const down=trains.filter(train=>train.dir==='down');
    const up=trains.filter(train=>train.dir==='up');
    if(!down.length||!up.length)continue;
    const stations=new Set(down.flatMap(train=>train.stops.filter(stop=>stop.p!=null).map(stop=>stop.s)));
    for(const station of stations){
      const downStops=down.map(train=>({train,index:train.stops.findIndex(stop=>stop.s===station)}))
        .filter(item=>item.index>0&&item.index<item.train.stops.length-1&&item.train.stops[item.index].p!=null);
      const upStops=up.map(train=>({train,index:train.stops.findIndex(stop=>stop.s===station)}))
        .filter(item=>item.index>0&&item.index<item.train.stops.length-1&&item.train.stops[item.index].p!=null);
      if(!downStops.length||!upStops.length)continue;
      const downValues=new Set(downStops.map(item=>Number(item.train.stops[item.index].p)));
      const upValues=new Set(upStops.map(item=>Number(item.train.stops[item.index].p)));
      if(downValues.size!==1||upValues.size!==1||[...downValues][0]!==[...upValues][0])continue;
      // 신설 템플릿은 첨부 사진의 하행을 원본으로 작성했으므로 하행 값은
      // 보존하고, 역산 과정에서 같은 번호가 복제된 상행만 교정한다.
      const downPlatform=[...downValues][0];
      const upPlatform=recommend(upStops[0].train,upStops[0].index);
      if(downPlatform==null||upPlatform==null||downPlatform===upPlatform)continue;
      for(const item of downStops)item.train.stops[item.index].p=String(downPlatform);
      for(const item of upStops)item.train.stops[item.index].p=String(upPlatform);
    }
  }
  for(const train of ALL_TRAINS){
    if(!isRegionalTrain(train.no))continue;
    const mapped=REAL_PLAT[train.no]||(REAL_PLAT[train.no]={});
    for(const stop of train.stops){
      if(stop.p!=null){
        mapped[stop.s]=Number(stop.p);
      }
    }
  }

  // 전 편 승강장 감사(2026-08-31): 인게임 추출값과 동일 계통의 물리
  // 진행 방향을 함께 대조해 확인한 오매핑만 명시적으로 바로잡는다.
  // 시종착 승강장은 회차·주박에 따라 달라질 수 있으므로 건드리지 않는다.
  const verifiedCorrections={
    // 청량리 → 태백황지: 같은 방향의 정상 편성(#1691/#1697/#1699) 기준.
    1693:{중랑:3,도농:2,양수:1,원주:3,신림:1,제천:3},
    1695:{중랑:3,도농:2,양수:1,원주:3,신림:1,제천:3,사북:1,고한:1},
    // 태백황지 → 청량리: 정상 편성 #1700 기준.
    1694:{제천:4,신림:2,원주:4,양평:4,양수:2,덕소:4,도농:1,중랑:4},
    1696:{양평:4},
    // 광주 → 강릉 KTX-이음: 같은 방향 #622~#630 기준.
    632:{태백황지:2,삼척:5,동해:6}
  };
  for(const [no,stations] of Object.entries(verifiedCorrections)){
    const train=ALL_TRAINS.find(item=>String(item.no)===no);
    if(!train)continue;
    const mapped=REAL_PLAT[no]||(REAL_PLAT[no]={});
    for(const [station,platform] of Object.entries(stations)){
      mapped[station]=platform;
      const stop=train.stops.find(item=>item.s===station);
      if(stop&&stop.p!=null)stop.p=String(platform);
    }
  }

  // 복선 구간인데 한 방향 사진값이 반대편 전 편에 복제된 계통을 인게임
  // PLATFORM_DB의 노선·등급별 승강장 쌍으로 분리한다. 교외선·보은선의
  // 단선 구간과 진행 방향이 바뀌는 중간 종착역은 이 목록에 넣지 않는다.
  const directionalRules=[
    {from:231,to:248,station:'남대구',down:3,up:4},       // 한강로-포항 KTX
    {from:251,to:260,station:'남대구',down:1,up:2},       // 한강로-창녕 KTX
    {from:551,to:582,station:'북순천',down:1,up:2},       // 서울-여수 KTX
    {from:1001,to:1020,station:'천안',down:11,up:12},     // 한강로-부산 ITX
    {from:1021,to:1030,station:'천안',down:11,up:12},     // 서울-진주 ITX
    {from:1201,to:1216,station:'청하',down:2,up:3},       // 강릉-부산 ITX
    {from:1201,to:1216,station:'포항',down:3,up:4},
    {from:1301,to:1306,station:'천안',down:11,up:12},     // 서울-부산 무궁화
    {from:1331,to:1350,station:'황간',down:1,up:2},       // 영동-부산 무궁화
    {from:1331,to:1350,station:'가창',down:1,up:2},
    {from:1331,to:1350,station:'청도',down:4,up:8},
    {from:1331,to:1350,station:'밀양',down:5,up:6},
    {from:1331,to:1350,station:'삼랑진',down:3,up:4},
    {from:1331,to:1350,station:'물금',down:3,up:4},
    {from:1891,to:1898,station:'상당',down:1,up:2}        // 서울-보은 ITX
  ];
  for(const rule of directionalRules){
    for(const train of ALL_TRAINS){
      const no=Number(train.no);
      if(no<rule.from||no>rule.to)continue;
      const stop=train.stops.find(item=>item.s===rule.station);
      if(!stop)continue;
      const platform=train.dir==='up'?rule.up:rule.down;
      const mapped=REAL_PLAT[train.no]||(REAL_PLAT[train.no]={});
      mapped[rule.station]=platform;
      if(stop.p!=null)stop.p=String(platform);
    }
  }

  // 열차번호 재사용·노선 개정 뒤 REAL_PLAT에 남은 과거 계통의 역은 제거한다.
  // 현재 정차역 집합만 남겨 예매/역 상세의 폴백 조회도 오염되지 않게 한다.
  for(const train of ALL_TRAINS){
    const mapped=REAL_PLAT[train.no];
    if(!mapped)continue;
    const currentStations=new Set(train.stops.map(stop=>stop.s));
    for(const station of Object.keys(mapped)){
      if(!currentStations.has(station))delete mapped[station];
    }
  }

  // 인게임 시간표에는 존재하지만 기존 PLATFORM_DB에 빠져 있던 승강장.
  // 지정 3·4번은 태백선 계통, 옥계 5번은 대전→강릉 ITX-새마을이 사용한다.
  if(typeof PLATFORM_DB!=='undefined'){
    const addPlatform=(station,platform,grades,lines)=>{
      const key=PLATFORM_DB[station]?station:(PLATFORM_DB[`${station}역`]?`${station}역`:null);
      if(!key)return;
      const entry=PLATFORM_DB[key][platform]||(PLATFORM_DB[key][platform]={g:[],l:[]});
      for(const grade of grades)if(!entry.g.includes(grade))entry.g.push(grade);
      for(const line of lines)if(!entry.l.includes(line))entry.l.push(line);
    };
    addPlatform('지정',3,['무궁화호'],['청량리-태백황지 무궁화호']);
    addPlatform('지정',4,['무궁화호'],['청량리-태백황지 무궁화호']);
    addPlatform('옥계',2,['ITX-새마을'],['대전-강릉 ITX새마을']);
    addPlatform('옥계',5,['ITX-새마을'],['대전-강릉 ITX새마을']);
  }

  // 2026-08-31 노선·역명 개정.
  // 청량리-태백황지 계통에 잘못 들어간 지평은 인게임 역명인 지정으로 통일한다.
  for(const train of ALL_TRAINS){
    for(const stop of train.stops){
      if(stop.s==='지평')stop.s='지정';
      const no=Number(train.no);
      if(no>=1691&&no<=1700&&stop.s==='신동')stop.s='신동(태백)';
    }
    const mapped=REAL_PLAT[train.no];
    if(mapped&&Object.prototype.hasOwnProperty.call(mapped,'지평')){
      if(!Object.prototype.hasOwnProperty.call(mapped,'지정'))mapped['지정']=mapped['지평'];
      delete mapped['지평'];
    }
    const no=Number(train.no);
    if(no>=1691&&no<=1700&&mapped&&Object.prototype.hasOwnProperty.call(mapped,'신동')){
      if(!Object.prototype.hasOwnProperty.call(mapped,'신동(태백)'))mapped['신동(태백)']=mapped['신동'];
      delete mapped['신동'];
    }
  }

  // 경산-건천을 연속 운행하는 전 열차는 대구선을 이용한다.
  // 한강로-포항 KTX-산천은 기존 시각을 유지하고 무시각 통과역만 보강한다.
  const appendLine=(train,line)=>{
    const lines=String(train.line||'').split('·').filter(Boolean);
    if(!lines.includes(line))lines.push(line);
    train.line=lines.join('·');
  };
  for(const train of ALL_TRAINS){
    const names=train.stops.map(stop=>stop.s);
    const usesDaeguLine=names.some((name,index)=>
      (name==='경산'&&names[index+1]==='건천')||(name==='건천'&&names[index+1]==='경산'));
    if(usesDaeguLine)appendLine(train,'대구선');

    const no=Number(train.no);
    if(no<231||no>248)continue;
    const southbound=train.dir==='down';
    const start=names.indexOf(southbound?'남대구':'포항');
    const end=names.indexOf(southbound?'포항':'남대구');
    if(start<0||end<0||start>=end)continue;
    const passNames=southbound?['경산','건천','안강']:['안강','건천','경산'];
    train.stops.splice(start+1,end-start-1,...passNames.map(s=>({s,arr:'통과',dep:null})));
    appendLine(train,'대구선');
    const mapped=REAL_PLAT[train.no];
    if(mapped){
      delete mapped['경산'];
      delete mapped['건천'];
      delete mapped['안강'];
    }
  }

  if(typeof STATION_DB!=='undefined'){
    for(const station of ['경산','건천','안강']){
      const entry=STATION_DB[`${station}역`]||STATION_DB[station];
      if(entry&&!entry.lines.includes('대구선'))entry.lines.push('대구선');
    }
    const sindong=STATION_DB['신동(태백)역'];
    if(sindong&&!sindong.lines.includes('청량리-태백황지 무궁화호')){
      sindong.lines.push('청량리-태백황지 무궁화호');
    }
  }

  // 전수 승강장 재매핑은 철회한다. 아래 세 역만 인게임 계통에서 확인한
  // 주 승강장 예외를 유지하며, 나머지는 기존 REAL_PLAT 값을 그대로 쓴다.
  const setPlatform=(no,station,platform)=>{
    const mapped=REAL_PLAT[String(no)]||(REAL_PLAT[String(no)]={});
    mapped[station]=platform;
    const train=ALL_TRAINS.find(item=>String(item.no)===String(no));
    const stop=train&&train.stops.find(item=>item.s===station);
    if(stop&&stop.p!=null)stop.p=String(platform);
  };
  for(let no=681;no<=700;no++)setPlatform(no,'여주',no%2===1?1:2);
  for(let no=1761;no<=1776;no++)setPlatform(no,'여주',no%2===1?3:4);

  // 잠실-봉화 SRT는 춘양·봉화 모두 1번 승강장을 사용한다.
  for(let no=691;no<=700;no++){
    setPlatform(no,'춘양',1);
    setPlatform(no,'봉화',1);
  }
  // 영동선 일반열차는 홀수편(영주 방면)이 3번, 짝수편이 2번을 사용한다.
  for(const [first,last] of [[1221,1236],[1621,1636],[1641,1644]]){
    for(let no=first;no<=last;no++){
      setPlatform(no,'춘양',no%2===1?3:2);
      setPlatform(no,'봉화',no%2===1?3:2);
    }
  }
})();
