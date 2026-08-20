// 2026-07-31 신설 지역열차 승강장 매핑.
// 사진에서 판독해 시간표 stop.p에 기록한 승강장을 역 정보 화면에서도
// 동일하게 사용하도록 REAL_PLAT에 확정 반영한다. 통과역은 매핑하지 않는다.
(()=>{
  if(typeof REAL_PLAT==='undefined'||typeof ALL_TRAINS==='undefined')return;
  const isRegionalTrain=no=>{
    const n=Number(no);
    return (n>=621&&n<=630)||
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
})();
