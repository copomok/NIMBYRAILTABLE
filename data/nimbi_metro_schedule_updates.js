// ── 전철 시간표 개정 레이어 ──
// 원본 인게임 시간표를 보존하면서, 이용 패턴에 맞춰 확정된 시간표 개정만 적용합니다.
(function applyGyeongbuExpressRevision(global){
  'use strict';

  const schedule=typeof METRO_SCHED!=='undefined'?METRO_SCHED:global.METRO_SCHED;
  const line=schedule&&schedule['경부선'];
  if(!line||!Array.isArray(line.s)||!Array.isArray(line.t)||!Array.isArray(line.c))return;

  const stationIndex=new Map(line.s.map((name,index)=>[name,index]));
  const minute=value=>{
    const [hour,min]=value.split(':').map(Number);
    return hour*60+min;
  };
  const wrap=value=>((value%1440)+1440)%1440;
  const stop=(name,arr,dep)=>({name,arr,dep});

  // 기존 의정부↔합덕 급행의 정차역과 역간 소요시간을 그대로 옮긴 기준표입니다.
  const southFromUijeongbu=[
    stop('의정부',-1,0), stop('도봉',4,4), stop('청량리',13,13),
    stop('장신대',15,16), stop('종로5가',18,18), stop('종로1가',20,20),
    stop('서울',23,23), stop('한강로',26,26), stop('구로',32,33),
    stop('북안양',38,39), stop('남안양',43,44), stop('의왕',48,48),
    stop('수원',54,55), stop('병점',59,60), stop('오산',65,65),
    stop('평택',77,77), stop('성환',83,83), stop('천안',91,92),
    stop('아산',100,100), stop('온양',102,103), stop('신창',107,107),
    stop('합덕',118,118)
  ];
  const northFromHapdeok=[
    stop('합덕',-1,0), stop('신창',11,11), stop('온양',15,15),
    stop('아산',18,18), stop('천안',26,27), stop('성환',34,35),
    stop('평택',41,41), stop('오산',53,53), stop('병점',58,58),
    stop('수원',63,64), stop('의왕',69,70), stop('남안양',74,75),
    stop('북안양',79,80), stop('구로',85,86), stop('한강로',92,92),
    stop('서울',95,95), stop('종로1가',97,98), stop('종로5가',100,100),
    stop('장신대',102,102), stop('청량리',104,105), stop('도봉',113,114),
    stop('의정부',118,119)
  ];

  function sliceSpec(base,startName,endName){
    const start=base.findIndex(item=>item.name===startName);
    const end=base.findIndex(item=>item.name===endName);
    if(start<0||end<start)throw new Error(`경부선 급행 구간 오류: ${startName}→${endName}`);
    const shift=base[start].dep;
    const result=base.slice(start,end+1).map(item=>stop(item.name,item.arr-shift,item.dep-shift));
    result[0].arr=-1;
    result[result.length-1].dep=result[result.length-1].arr;
    return result;
  }

  const specs={
    A_S:[
      stop('양주',-1,0),
      ...sliceSpec(southFromUijeongbu,'의정부','수원')
        .map(item=>stop(item.name,item.arr+4,item.dep+4))
    ],
    A_N:[
      ...sliceSpec(northFromHapdeok,'수원','의정부')
        .map((item,index,array)=>index===array.length-1?stop(item.name,item.arr,item.arr+1):item),
      stop('양주',58,58)
    ],
    U_S:sliceSpec(southFromUijeongbu,'의정부','수원'),
    U_N:sliceSpec(northFromHapdeok,'수원','의정부'),
    P_S:sliceSpec(southFromUijeongbu,'의정부','평택'),
    P_N:sliceSpec(northFromHapdeok,'평택','의정부'),
    S_S:sliceSpec(southFromUijeongbu,'청량리','신창'),
    S_N:sliceSpec(northFromHapdeok,'신창','청량리'),
    K_N:sliceSpec(northFromHapdeok,'신창','구로'),
    H_S:sliceSpec(southFromUijeongbu,'청량리','합덕'),
    H_N:sliceSpec(northFromHapdeok,'합덕','청량리')
  };
  specs.A_S[0].arr=-1;
  specs.A_S[specs.A_S.length-1].dep=specs.A_S[specs.A_S.length-1].arr;
  specs.A_N[0].arr=-1;
  function buildLeg(spec,departure){
    const base=minute(departure);
    return spec.flatMap(item=>{
      const idx=stationIndex.get(item.name);
      if(idx===undefined)throw new Error(`경부선 급행 역 누락: ${item.name}`);
      return [wrap(base+item.arr),wrap(base+item.dep),idx];
    });
  }

  const departures={
    A_S:['05:54','09:06','12:43','15:31','18:42','20:19'],
    A_N:['23:04','08:50','12:26','15:16','18:28','20:01'],
    U_S:['08:23','11:11','13:58','16:47','20:47'],
    U_N:['08:01','10:52','13:37','16:25','20:26'],
    P_S:['05:10','06:22','07:35','07:59','09:34','10:46','12:23','13:34','14:22','15:11','15:59','17:34','18:22','19:11','19:59','21:34','23:11'],
    P_N:['23:39','05:41','06:53','07:17','08:50','10:04','11:38','12:51','13:41','14:28','15:17','16:50','17:41','18:29','19:16','20:50','21:40'],
    S_S:['05:47','07:24','09:00','10:35','11:48','13:23','14:59','16:36','18:11','21:23','23:48'],
    S_N:['05:58','07:33','09:10','10:23','11:57','13:34','15:08','16:44','19:57','21:35'],
    K_N:['23:33'],
    H_S:['06:59','10:11','12:12','17:23','19:48','22:11'],
    H_N:['05:24','08:34','10:35','15:46','18:11','20:33']
  };

  const revised=[];
  function addDirectionalLegs(key){
    departures[`${key}_S`].forEach(time=>revised.push(buildLeg(specs[`${key}_S`],time)));
    departures[`${key}_N`].forEach(time=>revised.push(buildLeg(specs[`${key}_N`],time)));
  }

  // 상·하행 시각표는 그대로 유지하되 서로 다른 편성으로 기록합니다.
  // 관련 없는 반대편 출발 시각을 종착역 회차시각으로 합쳐 장시간 정차처럼 보이던 구조를 제거합니다.
  ['A','U','P','S','H'].forEach(addDirectionalLegs);
  departures.K_N.forEach(time=>revised.push(buildLeg(specs.K_N,time)));

  const nextTrips=[];
  const nextClasses=[];
  let inserted=false;
  line.t.forEach((trip,index)=>{
    if(line.c[index]===1){
      if(!inserted){
        revised.forEach(item=>{nextTrips.push(item);nextClasses.push(1);});
        inserted=true;
      }
      return;
    }
    nextTrips.push(trip);
    nextClasses.push(line.c[index]);
  });
  if(!inserted)revised.forEach(item=>{nextTrips.push(item);nextClasses.push(1);});
  line.t=nextTrips;
  line.c=nextClasses;

  global.NIMBI_GYEONGBU_EXPRESS_REVISION={
    version:'2026-07-27',
    serviceObjects:revised.length,
    oneWayTrips:90,
    independentDirectionalLegs:true,
    departures
  };
})(typeof globalThis!=='undefined'?globalThis:window);
